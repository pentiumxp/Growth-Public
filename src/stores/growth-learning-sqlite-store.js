const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const REQUIRED_GROWTH_TABLES = Object.freeze([
  "learning_schema_migrations",
  "learning_programs",
  "learning_plan_drafts",
  "learning_parent_review_items",
  "learning_publications",
  "learning_sources",
  "learning_goals",
  "learner_profiles",
  "learner_skill_states",
  "learning_curriculum_references",
  "learning_task_cards",
  "learning_growth_experience_signals",
  "learning_growth_stage_assessment_cycles",
  "learning_interaction_sessions",
  "learning_evaluations",
  "learning_task_submissions",
  "learning_task_reflections",
  "learning_task_artifacts",
  "learning_task_audio_blobs",
  "learning_parent_review_requests",
  "learning_reward_settlements",
  "learning_task_series_recommendations",
  "learning_growth_evaluation_jobs",
  "learning_growth_mastery_states",
  "learning_growth_card_trajectories"
]);

function sqlite() {
  return require("node:sqlite");
}

function cleanString(value) {
  return String(value || "").trim();
}

function parseJson(text, fallback) {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (_) {
    return fallback;
  }
}

function numberValue(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeRecordType(value) {
  const text = cleanString(value).toLowerCase();
  if (["submission", "submissions", "learning_task_submission"].includes(text)) return "submission";
  if (["reflection", "reflections", "learning_task_reflection"].includes(text)) return "reflection";
  return "";
}

function audioEvidenceFromRaw(raw = {}, fallbackDigest = "") {
  const nested = raw.raw && typeof raw.raw === "object" ? raw.raw.audio : null;
  const audio = raw.audio && typeof raw.audio === "object" ? raw.audio : nested;
  if (!audio || typeof audio !== "object") {
    return fallbackDigest ? { digest: fallbackDigest } : null;
  }
  return Object.assign({}, audio, fallbackDigest && !audio.digest ? { digest: fallbackDigest } : {});
}

function publicAudio(recordType, recordId, raw = {}, fallbackDigest = "") {
  const audio = audioEvidenceFromRaw(raw, fallbackDigest);
  if (!audio) return null;
  const id = cleanString(recordId);
  const type = normalizeRecordType(recordType);
  if (!id || !type) return null;
  const name = path.basename(cleanString(audio.name || audio.fileName || audio.filename));
  const digest = cleanString(audio.digest || audio.audioDigest || fallbackDigest);
  if (!name && !digest) return null;
  return {
    kind: "audio",
    name: name || "learning-audio",
    mime: cleanString(audio.mime || audio.type) || "application/octet-stream",
    size: numberValue(audio.size),
    durationMs: numberValue(audio.durationMs || audio.duration_ms),
    digest,
    url: `/api/v1/growth/audio/${type}s/${encodeURIComponent(id)}`
  };
}

function tableExists(db, tableName) {
  return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName));
}

function countTable(db, tableName, filters = {}) {
  if (!tableExists(db, tableName)) return 0;
  const workspaceId = cleanString(filters.workspaceId);
  if (workspaceId) {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => column.name);
    if (columns.includes("workspace_id")) {
      return Number(db.prepare(`SELECT COUNT(*) AS count FROM ${tableName} WHERE workspace_id = ?`).get(workspaceId)?.count || 0);
    }
    if (columns.includes("learner_workspace_id")) {
      return Number(db.prepare(`SELECT COUNT(*) AS count FROM ${tableName} WHERE learner_workspace_id = ?`).get(workspaceId)?.count || 0);
    }
  }
  return Number(db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get()?.count || 0);
}

function latestByTask(db, tableName, taskCardId, orderColumn) {
  if (!tableExists(db, tableName)) return null;
  return db.prepare(`SELECT * FROM ${tableName} WHERE task_card_id = ? ORDER BY ${orderColumn} DESC LIMIT 1`).get(taskCardId) || null;
}

function publicSubmission(row) {
  if (!row) return null;
  const raw = parseJson(row.raw_json, {}) || {};
  return {
    submissionId: row.id,
    taskCardId: row.task_card_id,
    status: row.status,
    submissionKind: row.submission_kind,
    submittedAt: row.submitted_at || row.created_at,
    audio: publicAudio("submission", row.id, raw),
    submissionCount: 1,
    totalSubmissionCount: 1
  };
}

function publicEvaluation(row) {
  if (!row) return null;
  return {
    evaluationId: row.id,
    taskCardId: row.task_card_id,
    status: row.status,
    score: numberValue(row.score),
    maxScore: 100,
    passed: Boolean(Number(row.passed || 0)),
    summary: cleanString(row.summary).slice(0, 700),
    evaluatedAt: row.created_at,
    evaluationCount: 1,
    totalEvaluationCount: 1
  };
}

function publicReflection(row) {
  if (!row) return null;
  const raw = parseJson(row.raw_json, {}) || {};
  return {
    reflectionId: row.id,
    taskCardId: row.task_card_id,
    status: row.status,
    mode: row.mode,
    score: numberValue(row.score),
    summary: cleanString(row.summary).slice(0, 700),
    submittedAt: row.submitted_at || row.created_at,
    audio: publicAudio("reflection", row.id, raw, row.audio_digest)
  };
}

function nextActionFor({ status, latestEvaluation, latestSubmission, latestReflection }) {
  const cleanStatus = cleanString(status).toLowerCase();
  if (["done", "completed"].includes(cleanStatus)) return "completed";
  if (latestReflection && cleanString(latestReflection.status).toLowerCase() === "rejected") return "retry_reflection";
  if (latestEvaluation && cleanString(latestEvaluation.status).toLowerCase() === "draft_feedback") return "revise";
  if (latestSubmission && !latestEvaluation) return "waiting_evaluation";
  return "submit";
}

function publicCardFromRow(db, row) {
  if (!row) return null;
  const raw = parseJson(row.raw_json, {}) || {};
  const latestSubmission = publicSubmission(latestByTask(db, "learning_task_submissions", row.id, "submitted_at"));
  const latestEvaluation = publicEvaluation(latestByTask(db, "learning_evaluations", row.id, "created_at"));
  const latestReflection = publicReflection(latestByTask(db, "learning_task_reflections", row.id, "submitted_at"));
  const artifactCount = tableExists(db, "learning_task_artifacts")
    ? Number(db.prepare("SELECT COUNT(*) AS count FROM learning_task_artifacts WHERE task_card_id = ?").get(row.id)?.count || 0)
    : 0;
  const card = {
    taskCardId: row.id,
    todoId: row.kanban_card_id || "",
    source: "growth-plugin-sqlite",
    workspaceId: row.workspace_id,
    programId: row.program_id,
    draftId: row.draft_id,
    sequenceGroupId: cleanString(raw.sequenceGroupId || raw.sequence_group_id),
    sequenceMode: cleanString(raw.sequenceMode || raw.sequence_mode),
    sequenceIndex: numberValue(raw.sequenceIndex || raw.sequence_index),
    title: cleanString(row.title).slice(0, 180),
    instructionPreview: cleanString(raw.instructionPreview || raw.instruction || raw.summary).slice(0, 260),
    domain: row.domain,
    activityType: row.task_card_type,
    cardRole: row.card_role || raw.cardRole || "",
    capabilityClusterId: row.capability_cluster_id || raw.capabilityClusterId || "",
    expectedDurationMinutes: {
      min: numberValue(row.expected_duration_minutes_min),
      max: numberValue(row.expected_duration_minutes_max)
    },
    stageAssessmentCycleId: row.stage_assessment_cycle_id || "",
    activationState: row.activation_state || "",
    plannedDate: row.planned_date,
    openedAt: cleanString(raw.openedAt || raw.opened_at),
    generatedAt: row.created_at,
    plannedMinutes: numberValue(row.planned_minutes),
    status: row.status,
    completedAt: cleanString(raw.completedAt || raw.completed_at),
    laneId: cleanString(raw.laneId || raw.lane_id),
    latestSubmission,
    latestEvaluation,
    latestReflection,
    artifactCount,
    rewardState: cleanString(raw.rewardState || raw.reward_state),
    rewardCapCoins: numberValue(row.reward_cap_coins || row.configured_reward_coins || row.default_reward_coins),
    primaryAction: "",
    actions: {
      canSubmit: !["done", "completed"].includes(cleanString(row.status).toLowerCase()),
      canWithdraw: Boolean(latestSubmission && !latestEvaluation),
      canReflect: Boolean(latestEvaluation && !latestReflection),
      canOpenArtifacts: artifactCount > 0,
      primaryAction: ""
    }
  };
  card.nextAction = nextActionFor(card);
  card.primaryAction = card.nextAction;
  card.actions.primaryAction = card.nextAction;
  card.submissionCount = latestSubmission ? 1 : 0;
  card.evaluationCount = latestEvaluation ? 1 : 0;
  return card;
}

function summaryForCards(cards) {
  return {
    total: cards.length,
    active: cards.filter((card) => !["done", "completed"].includes(cleanString(card.status).toLowerCase())).length,
    waiting_review: cards.filter((card) => cleanString(card.nextAction).includes("review")).length,
    completed: cards.filter((card) => ["done", "completed"].includes(cleanString(card.status).toLowerCase())).length
  };
}

function lanesForCards(cards) {
  const laneMap = new Map([
    ["active", { id: "active", title: "Active", cards: [] }],
    ["waiting", { id: "waiting", title: "Waiting", cards: [] }],
    ["completed", { id: "completed", title: "Completed", cards: [] }]
  ]);
  for (const card of cards) {
    const status = cleanString(card.status).toLowerCase();
    const lane = ["done", "completed"].includes(status)
      ? "completed"
      : (cleanString(card.nextAction).startsWith("waiting") ? "waiting" : "active");
    laneMap.get(lane).cards.push(card.taskCardId);
  }
  return Array.from(laneMap.values())
    .filter((lane) => lane.cards.length > 0)
    .map((lane) => Object.assign({}, lane, { count: lane.cards.length }));
}

function defaultLegacyAudioRoots(dbPath) {
  const roots = [
    path.resolve(process.cwd(), "..", "..", "data"),
    path.resolve(path.dirname(path.resolve(dbPath || "")), "..", "..", "..", "data"),
    path.resolve(process.cwd(), "data")
  ];
  return [...new Set(roots)];
}

function normalizeRoots(roots = [], dbPath = "") {
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

function audioMimeForPlayback(audio = {}, filePath = "") {
  const ext = path.extname(filePath || cleanString(audio.name || audio.fileName || audio.filename)).toLowerCase();
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".m4a" || ext === ".aac") return "audio/mp4";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".ogg" || ext === ".opus" || ext === ".webm") return "audio/ogg";
  return cleanString(audio.mime || audio.type) || "application/octet-stream";
}

function sha256Hex(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function stableAudioBlobId(recordType, recordId) {
  const hash = sha256Hex(`${recordType}:${recordId}`).slice(0, 18);
  return `gaudio_${hash}`;
}

function tableColumns(db, tableName) {
  if (!tableExists(db, tableName)) return [];
  return db.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => column.name);
}

function existingAudioBlob(db, recordType, recordId) {
  if (!tableExists(db, "learning_task_audio_blobs")) return null;
  return db.prepare("SELECT id, size FROM learning_task_audio_blobs WHERE record_type = ? AND record_id = ?")
    .get(normalizeRecordType(recordType), cleanString(recordId)) || null;
}

function createGrowthLearningSqliteStore({ dbPath, legacyAudioRoots = [] }) {
  const resolvedPath = path.resolve(dbPath || "");
  const audioRoots = normalizeRoots(legacyAudioRoots, resolvedPath);

  function open(readOnly = true) {
    const { DatabaseSync } = sqlite();
    return new DatabaseSync(resolvedPath, { open: true, readOnly });
  }

  function withDb(callback) {
    const db = open(true);
    try {
      return callback(db);
    } finally {
      db.close();
    }
  }

  function integrity(filters = {}) {
    return withDb((db) => {
      const missingTables = REQUIRED_GROWTH_TABLES.filter((tableName) => !tableExists(db, tableName));
      const quick = db.prepare("PRAGMA quick_check").get();
      const foreignKeyIssues = db.prepare("PRAGMA foreign_key_check").all().length;
      const counts = {};
      for (const tableName of REQUIRED_GROWTH_TABLES) counts[tableName] = countTable(db, tableName, filters);
      return {
        ok: missingTables.length === 0 && foreignKeyIssues === 0 && (quick?.quick_check || "") === "ok",
        db_path: resolvedPath,
        quick_check: quick?.quick_check || "",
        foreign_key_issues: foreignKeyIssues,
        missing_tables: missingTables,
        counts
      };
    });
  }

  function board({ workspaceId, limit = 100 } = {}) {
    return withDb((db) => {
      if (!tableExists(db, "learning_task_cards")) return null;
      const cleanWorkspaceId = cleanString(workspaceId);
      const max = Math.max(1, Math.min(500, Number(limit || 100) || 100));
      const rows = cleanWorkspaceId
        ? db.prepare("SELECT * FROM learning_task_cards WHERE workspace_id = ? ORDER BY planned_date ASC, created_at ASC LIMIT ?").all(cleanWorkspaceId, max)
        : db.prepare("SELECT * FROM learning_task_cards ORDER BY planned_date ASC, created_at ASC LIMIT ?").all(max);
      const cards = rows.map((row) => publicCardFromRow(db, row));
      return {
        ok: true,
        workspace_id: cleanWorkspaceId,
        cards,
        lanes: lanesForCards(cards),
        summary: summaryForCards(cards),
        source: "growth-plugin-sqlite",
        data_ownership: "plugin",
        integrity: integrity({ workspaceId: cleanWorkspaceId })
      };
    });
  }

  function card({ workspaceId, taskCardId } = {}) {
    return withDb((db) => {
      if (!tableExists(db, "learning_task_cards")) return null;
      const id = cleanString(taskCardId);
      if (!id) return null;
      const cleanWorkspaceId = cleanString(workspaceId);
      const row = cleanWorkspaceId
        ? db.prepare("SELECT * FROM learning_task_cards WHERE id = ? AND workspace_id = ?").get(id, cleanWorkspaceId)
        : db.prepare("SELECT * FROM learning_task_cards WHERE id = ?").get(id);
      if (!row) return null;
      return {
        ok: true,
        workspace_id: cleanWorkspaceId,
        card: publicCardFromRow(db, row),
        source: "growth-plugin-sqlite",
        data_ownership: "plugin"
      };
    });
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
    const columns = tableColumns(db, "learning_task_audio_blobs");
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
    const selectedColumns = columns.filter((column) => Object.prototype.hasOwnProperty.call(values, column));
    const placeholders = selectedColumns.map(() => "?").join(", ");
    db.prepare(`INSERT INTO learning_task_audio_blobs(${selectedColumns.join(", ")}) VALUES (${placeholders})`)
      .run(...selectedColumns.map((column) => values[column]));
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
    dbPath: resolvedPath,
    legacyAudioRoots: audioRoots,
    board,
    card,
    audio,
    backfillAudioBlobs,
    integrity
  };
}

module.exports = {
  REQUIRED_GROWTH_TABLES,
  createGrowthLearningSqliteStore
};
