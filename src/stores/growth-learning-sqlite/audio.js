"use strict";

const path = require("node:path");
const fs = require("node:fs");
const {
  asArray,
  cleanString,
  insertDynamic,
  normalizeRecordType,
  parseJson,
  tableExists
} = require("./core");
const {
  sha256Hex,
  stableAudioBlobId
} = require("./identifiers");
const {
  audioEvidenceFromRaw,
  audioMimeForPlayback
} = require("./audio-metadata");

function defaultLegacyAudioRoots(dbPath) {
  const roots = [
    path.resolve(process.cwd(), "..", "..", "data"),
    path.resolve(path.dirname(path.resolve(dbPath || "")), "..", "..", "..", "data"),
    path.resolve(process.cwd(), "data")
  ];
  return [...new Set(roots)];
}

function normalizeAudioRoots(roots = [], dbPath = "") {
  const explicitRoots = asArray(roots).filter(Boolean);
  const selectedRoots = explicitRoots.length ? explicitRoots : defaultLegacyAudioRoots(dbPath);
  return [...new Set(selectedRoots.map((entry) => path.resolve(entry)).filter(Boolean))];
}

function isWithinRoot(filePath, roots = []) {
  const resolved = path.resolve(filePath);
  return roots.some((root) => {
    const relative = path.relative(root, resolved);
    return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
  });
}

function firstReadableFile(paths = []) {
  for (const candidate of paths) {
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile()) return { filePath: candidate, stat };
    } catch (_) {
      // Try the next bounded candidate.
    }
  }
  return null;
}

function pathTail(filePath, segments = 5) {
  return String(filePath || "").split(path.sep).filter(Boolean).slice(-segments).join(path.sep);
}

function findAudioFiles(baseDir, fileName, taskCardId, roots, depth = 0) {
  if (!baseDir || !fileName || depth > 5 || !isWithinRoot(baseDir, roots)) return [];
  let entries = [];
  try {
    entries = fs.readdirSync(baseDir, { withFileTypes: true });
  } catch (_) {
    return [];
  }
  const found = [];
  for (const entry of entries) {
    const fullPath = path.join(baseDir, entry.name);
    if (entry.isFile() && entry.name.endsWith(fileName) && (!taskCardId || fullPath.includes(taskCardId))) {
      found.push(fullPath);
    } else if (entry.isDirectory()) {
      found.push(...findAudioFiles(fullPath, fileName, taskCardId, roots, depth + 1));
    }
  }
  return found;
}

function existingAudioBlob(db, recordType, recordId) {
  if (!tableExists(db, "learning_task_audio_blobs")) return null;
  return db.prepare("SELECT id, size FROM learning_task_audio_blobs WHERE record_type = ? AND record_id = ?")
    .get(normalizeRecordType(recordType), cleanString(recordId)) || null;
}

function createAudioRepository({ open, resolvedPath, legacyAudioRoots = [] }) {
  const audioRoots = normalizeAudioRoots(legacyAudioRoots, resolvedPath);

  function withDb(callback) {
    const db = open(true);
    try {
      return callback(db);
    } finally {
      db.close();
    }
  }

  function taskRowForAudio(db, recordType, recordId, workspaceId) {
    const type = normalizeRecordType(recordType);
    const id = cleanString(recordId);
    const cleanWorkspaceId = cleanString(workspaceId);
    if (!type || !id) return null;
    const tableName = type === "submission" ? "learning_task_submissions" : "learning_task_reflections";
    if (!tableExists(db, tableName)) return null;
    const row = cleanWorkspaceId
      ? db.prepare(`SELECT * FROM ${tableName} WHERE id = ? AND workspace_id = ?`).get(id, cleanWorkspaceId)
      : db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(id);
    if (!row) return null;
    const taskCard = tableExists(db, "learning_task_cards")
      ? db.prepare("SELECT * FROM learning_task_cards WHERE id = ?").get(row.task_card_id)
      : null;
    return { type, row, taskCard };
  }

  function audioBlob(db, recordType, recordId) {
    if (!tableExists(db, "learning_task_audio_blobs")) return null;
    const type = normalizeRecordType(recordType);
    const row = db.prepare(
      "SELECT * FROM learning_task_audio_blobs WHERE record_type = ? AND record_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1"
    ).get(type, cleanString(recordId));
    if (!row || !row.content_blob) return null;
    const content = Buffer.isBuffer(row.content_blob) ? row.content_blob : Buffer.from(row.content_blob);
    if (!content.length) return null;
    return {
      kind: "blob",
      content,
      mime: cleanString(row.mime) || "application/octet-stream",
      name: path.basename(cleanString(row.name) || "learning-audio"),
      size: content.length
    };
  }

  function audioFileCandidates(recordType, row, taskCard, audio = {}) {
    const fileName = path.basename(cleanString(audio.name || audio.fileName || audio.filename));
    const candidates = [];
    const directPath = cleanString(audio.path || audio.filePath || audio.absolutePath);
    if (directPath && isWithinRoot(directPath, audioRoots)) candidates.push(directPath);
    if (!fileName) return candidates;
    const workspaceId = cleanString(row.workspace_id || taskCard?.workspace_id);
    const taskCardId = cleanString(row.task_card_id || taskCard?.id);
    for (const root of audioRoots) {
      candidates.push(...findAudioFiles(path.join(root, "artifacts", "kanban-reading", workspaceId), fileName, taskCardId, audioRoots));
    }
    return [...new Set(candidates.filter((candidate) => isWithinRoot(candidate, audioRoots)))];
  }

  function sourceRowsForAudioBackfill(db, tableName, workspaceId, limit) {
    if (!tableExists(db, tableName)) return [];
    const cleanWorkspaceId = cleanString(workspaceId);
    const max = Math.max(1, Math.min(5000, Number(limit || 1000) || 1000));
    const orderColumn = tableName === "learning_task_submissions" ? "submitted_at" : "submitted_at";
    const where = cleanWorkspaceId ? `WHERE r.workspace_id = ?` : "";
    const args = cleanWorkspaceId ? [cleanWorkspaceId, max] : [max];
    return db.prepare(`
      SELECT r.*, c.program_id AS task_program_id, c.learner_id AS task_learner_id
      FROM ${tableName} r
      LEFT JOIN learning_task_cards c ON c.id = r.task_card_id
      ${where}
      ORDER BY r.${orderColumn} ASC, r.created_at ASC
      LIMIT ?
    `).all(...args);
  }

  function insertAudioBlob(db, located, found, evidence, now) {
    const content = fs.readFileSync(found.filePath);
    const values = {
      id: stableAudioBlobId(located.type, located.row.id),
      record_type: located.type,
      record_id: located.row.id,
      task_card_id: located.row.task_card_id,
      session_id: cleanString(located.row.session_id),
      program_id: cleanString(located.row.program_id || located.row.task_program_id),
      learner_id: cleanString(located.row.learner_id || located.row.task_learner_id),
      workspace_id: cleanString(located.row.workspace_id || located.taskCard?.workspace_id),
      name: path.basename(cleanString(evidence.name || evidence.fileName || evidence.filename) || found.filePath),
      mime: audioMimeForPlayback(evidence, found.filePath),
      size: content.length,
      digest: cleanString(evidence.digest || evidence.audioDigest) || sha256Hex(content),
      content_blob: content,
      created_at: now,
      updated_at: now
    };
    insertDynamic(db, "learning_task_audio_blobs", values);
    return {
      id: values.id,
      record_type: values.record_type,
      record_id: values.record_id,
      task_card_id: values.task_card_id,
      workspace_id: values.workspace_id,
      name: values.name,
      mime: values.mime,
      size: values.size,
      digest: values.digest
    };
  }

  function evaluateBackfillRecord(db, recordType, row) {
    const type = normalizeRecordType(recordType);
    const existing = existingAudioBlob(db, type, row.id);
    if (existing) {
      return { status: "already_blobbed", record_type: type, record_id: row.id, existing_blob_id: existing.id };
    }
    const taskCard = tableExists(db, "learning_task_cards")
      ? db.prepare("SELECT * FROM learning_task_cards WHERE id = ?").get(row.task_card_id)
      : null;
    const raw = parseJson(row.raw_json, {}) || {};
    const evidence = audioEvidenceFromRaw(raw, type === "reflection" ? row.audio_digest : "");
    if (!evidence || (!evidence.name && !evidence.fileName && !evidence.filename && !evidence.path && !evidence.filePath && !evidence.absolutePath)) {
      return { status: "no_audio_evidence", record_type: type, record_id: row.id, task_card_id: row.task_card_id };
    }
    const found = firstReadableFile(audioFileCandidates(type, row, taskCard, evidence));
    if (!found) {
      return {
        status: "file_missing",
        record_type: type,
        record_id: row.id,
        task_card_id: row.task_card_id,
        name: path.basename(cleanString(evidence.name || evidence.fileName || evidence.filename))
      };
    }
    return {
      status: "ready",
      record_type: type,
      record_id: row.id,
      task_card_id: row.task_card_id,
      workspace_id: row.workspace_id,
      evidence,
      found,
      file_path_tail: pathTail(found.filePath),
      size: found.stat.size
    };
  }

  function backfillAudioBlobs({ workspaceId, limit = 1000, write = false, sampleLimit = 20 } = {}) {
    const db = open(!write);
    try {
      if (!tableExists(db, "learning_task_audio_blobs")) {
        return { ok: false, error: "audio_blob_table_missing", write: Boolean(write) };
      }
      const rows = [
        ...sourceRowsForAudioBackfill(db, "learning_task_submissions", workspaceId, limit).map((row) => ({ type: "submission", row })),
        ...sourceRowsForAudioBackfill(db, "learning_task_reflections", workspaceId, limit).map((row) => ({ type: "reflection", row }))
      ];
      const now = new Date().toISOString();
      const counts = {
        scanned: 0,
        already_blobbed: 0,
        no_audio_evidence: 0,
        file_missing: 0,
        ready: 0,
        would_backfill: 0,
        backfilled: 0,
        errors: 0,
        bytes: 0
      };
      const samples = [];
      if (write) db.exec("BEGIN IMMEDIATE");
      try {
        for (const item of rows) {
          counts.scanned += 1;
          const evaluated = evaluateBackfillRecord(db, item.type, item.row);
          if (evaluated.status !== "ready") {
            counts[evaluated.status] = Number(counts[evaluated.status] || 0) + 1;
            if (samples.length < sampleLimit && evaluated.status !== "no_audio_evidence") samples.push(evaluated);
            continue;
          }
          counts.ready += 1;
          counts.bytes += evaluated.size;
          if (!write) {
            counts.would_backfill += 1;
            if (samples.length < sampleLimit) samples.push({
              status: "would_backfill",
              record_type: evaluated.record_type,
              record_id: evaluated.record_id,
              task_card_id: evaluated.task_card_id,
              file_path_tail: evaluated.file_path_tail,
              size: evaluated.size
            });
            continue;
          }
          try {
            const inserted = insertAudioBlob(db, { type: evaluated.record_type, row: item.row }, evaluated.found, evaluated.evidence, now);
            counts.backfilled += 1;
            if (samples.length < sampleLimit) samples.push(Object.assign({ status: "backfilled" }, inserted));
          } catch (err) {
            counts.errors += 1;
            if (samples.length < sampleLimit) samples.push({
              status: "error",
              record_type: evaluated.record_type,
              record_id: evaluated.record_id,
              error: err.message || String(err)
            });
          }
        }
        if (write) db.exec(counts.errors ? "ROLLBACK" : "COMMIT");
      } catch (err) {
        if (write) db.exec("ROLLBACK");
        throw err;
      }
      return {
        ok: counts.errors === 0,
        mode: write ? "write" : "dry_run",
        workspace_id: cleanString(workspaceId),
        db_path: resolvedPath,
        legacy_audio_roots: audioRoots,
        counts,
        samples
      };
    } finally {
      db.close();
    }
  }

  function audio({ workspaceId, recordType, recordId } = {}) {
    return withDb((db) => {
      const located = taskRowForAudio(db, recordType, recordId, workspaceId);
      if (!located) return null;
      const fallbackDigest = located.type === "reflection" ? located.row.audio_digest : "";
      const raw = parseJson(located.row.raw_json, {}) || {};
      const evidence = audioEvidenceFromRaw(raw, fallbackDigest);
      const blob = audioBlob(db, located.type, located.row.id);
      if (blob) {
        return Object.assign({}, blob, {
          record_type: located.type,
          record_id: located.row.id,
          task_card_id: located.row.task_card_id
        });
      }
      if (!evidence) return null;
      const found = firstReadableFile(audioFileCandidates(located.type, located.row, located.taskCard, evidence));
      if (!found) return null;
      const name = path.basename(cleanString(evidence.name || evidence.fileName || evidence.filename) || found.filePath);
      return {
        kind: "file",
        record_type: located.type,
        record_id: located.row.id,
        task_card_id: located.row.task_card_id,
        filePath: found.filePath,
        stat: found.stat,
        name,
        mime: audioMimeForPlayback(evidence, found.filePath),
        size: found.stat.size
      };
    });
  }

  return {
    audio,
    backfillAudioBlobs,
    legacyAudioRoots: audioRoots
  };
}

module.exports = {
  createAudioRepository,
  defaultLegacyAudioRoots,
  normalizeAudioRoots
};
