"use strict";

const path = require("node:path");
const {
  cleanString,
  insertDynamic,
  nowIsoValue,
  numberValue,
  parseJson,
  tableExists,
  todayKey
} = require("./core");
const {
  audioMimeForPlayback
} = require("./audio-metadata");
const {
  sha256Hex,
  stableAudioBlobId,
  stableEvaluationJobId,
  stableReflectionId,
  stableSessionId,
  stableSubmissionId
} = require("./identifiers");
const {
  publicCardFromRow,
  publicReflection,
  publicSubmission
} = require("./projection");

function taskCardByIdOrKanbanId(db, taskCardId, workspaceId = "") {
  if (!tableExists(db, "learning_task_cards")) return null;
  const id = cleanString(taskCardId);
  if (!id) return null;
  const cleanWorkspaceId = cleanString(workspaceId);
  return cleanWorkspaceId
    ? db.prepare("SELECT * FROM learning_task_cards WHERE workspace_id = ? AND (id = ? OR kanban_card_id = ?) ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END LIMIT 1")
      .get(cleanWorkspaceId, id, id, id)
    : db.prepare("SELECT * FROM learning_task_cards WHERE id = ? OR kanban_card_id = ? ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END LIMIT 1")
      .get(id, id, id);
}

function insertAudioBlobContent(db, located, audio, now) {
  const content = Buffer.isBuffer(audio.content) ? audio.content : Buffer.from(audio.content || []);
  if (!content.length) return null;
  const values = {
    id: stableAudioBlobId(located.type, located.row.id),
    record_type: located.type,
    record_id: located.row.id,
    task_card_id: located.row.task_card_id,
    session_id: cleanString(located.row.session_id),
    program_id: cleanString(located.row.program_id || located.row.task_program_id),
    learner_id: cleanString(located.row.learner_id || located.row.task_learner_id),
    workspace_id: cleanString(located.row.workspace_id || located.taskCard?.workspace_id),
    name: path.basename(cleanString(audio.name) || "learning-audio"),
    mime: cleanString(audio.mime) || "application/octet-stream",
    size: content.length,
    digest: cleanString(audio.digest) || sha256Hex(content),
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

function decodeAudioInput(input = {}) {
  const audio = input.audio && typeof input.audio === "object" ? input.audio : {};
  const dataBase64 = cleanString(input.dataBase64 || input.audioDataBase64 || input.data_base64 || audio.dataBase64 || audio.data_base64);
  if (!dataBase64) return null;
  const content = Buffer.from(dataBase64, "base64");
  if (!content.length) return null;
  const name = path.basename(cleanString(input.filename || input.name || audio.name || audio.fileName || audio.filename) || "growth-submission-audio.webm");
  const mime = cleanString(input.mime || input.type || audio.mime || audio.type) || audioMimeForPlayback({ name }, name);
  const digest = cleanString(audio.digest || input.digest) || sha256Hex(content).slice(0, 24);
  return {
    kind: "audio",
    name,
    mime,
    size: content.length,
    durationMs: numberValue(input.durationMs || input.duration_ms || audio.durationMs || audio.duration_ms),
    digest,
    content
  };
}

function countSubmissionsForTask(db, taskCardId) {
  if (!tableExists(db, "learning_task_submissions")) return 0;
  return Number(db.prepare("SELECT COUNT(*) AS count FROM learning_task_submissions WHERE task_card_id = ?").get(cleanString(taskCardId))?.count || 0);
}

function countReflectionsForTask(db, taskCardId) {
  if (!tableExists(db, "learning_task_reflections")) return 0;
  return Number(db.prepare("SELECT COUNT(*) AS count FROM learning_task_reflections WHERE task_card_id = ?").get(cleanString(taskCardId))?.count || 0);
}

function countEvaluationsForTask(db, taskCardId) {
  if (!tableExists(db, "learning_evaluations")) return 0;
  return Number(db.prepare("SELECT COUNT(*) AS count FROM learning_evaluations WHERE task_card_id = ?").get(cleanString(taskCardId))?.count || 0);
}

function countOpenEvaluationJobsForTask(db, taskCardId) {
  if (!tableExists(db, "learning_growth_evaluation_jobs")) return 0;
  return Number(db.prepare(`
    SELECT COUNT(*) AS count FROM learning_growth_evaluation_jobs
    WHERE task_card_id = ? AND status IN ('pending', 'retry', 'processing', 'done')
  `).get(cleanString(taskCardId))?.count || 0);
}

function completionPolicy(taskCard = {}) {
  const raw = parseJson(taskCard.raw_json, {}) || {};
  const policy = raw.completionPolicy || raw.taskModel?.completionPolicy || {};
  return policy && typeof policy === "object" ? policy : {};
}

function isDailyScoreOnceCard(taskCard = {}) {
  const policy = completionPolicy(taskCard);
  if (cleanString(policy.mode) === "daily_score_once") return true;
  const raw = parseJson(taskCard.raw_json, {}) || {};
  return raw.source === "growth-card-authoring" && cleanString(taskCard.card_role || raw.cardRole) !== "stage_assessment";
}

function ensureInteractionSession(db, values = {}) {
  if (!tableExists(db, "learning_interaction_sessions")) return cleanString(values.id);
  const sessionId = cleanString(values.id);
  if (!sessionId) return "";
  const existing = db.prepare("SELECT id FROM learning_interaction_sessions WHERE id = ?").get(sessionId);
  if (existing) return sessionId;
  insertDynamic(db, "learning_interaction_sessions", {
    id: sessionId,
    task_card_id: cleanString(values.taskCardId),
    program_id: cleanString(values.programId),
    learner_id: cleanString(values.learnerId),
    workspace_id: cleanString(values.workspaceId),
    status: "submitted",
    current_step: "submitted",
    step_history_json: JSON.stringify([{ step: "submitted", at: cleanString(values.now) }]),
    summary: cleanString(values.summary).slice(0, 500),
    raw_json: JSON.stringify({ source: "growth-plugin", submissionId: cleanString(values.submissionId) }),
    created_at: cleanString(values.now),
    updated_at: cleanString(values.now)
  });
  return sessionId;
}

function createEvidenceWriter({ open }) {
  function submitEvidence(input = {}) {
    const db = open(false);
    try {
      if (!tableExists(db, "learning_task_cards") || !tableExists(db, "learning_task_submissions")) {
        return { ok: false, error: "growth_write_tables_missing" };
      }
      const workspaceId = cleanString(input.workspaceId);
      const taskCardId = cleanString(input.taskCardId || input.cardId);
      if (!workspaceId || !taskCardId) return { ok: false, error: "workspace_and_task_required" };
      const taskCard = taskCardByIdOrKanbanId(db, taskCardId, workspaceId);
      if (!taskCard) return { ok: false, error: "task_card_not_found" };
      const canonicalTaskCardId = cleanString(taskCard.id);
      if (isDailyScoreOnceCard(taskCard)) {
        const existingSubmissions = countSubmissionsForTask(db, canonicalTaskCardId);
        const existingEvaluations = countEvaluationsForTask(db, canonicalTaskCardId);
        const existingJobs = countOpenEvaluationJobsForTask(db, canonicalTaskCardId);
        if (existingSubmissions || existingEvaluations || existingJobs) {
          return {
            ok: false,
            error: "daily_card_submission_already_recorded",
            task_card_id: canonicalTaskCardId,
            submission_count: existingSubmissions,
            evaluation_count: existingEvaluations,
            evaluation_job_count: existingJobs
          };
        }
      }

      const text = cleanString(input.text || input.submission || input.comment);
      const audio = decodeAudioInput(input);
      if (!text && !audio) return { ok: false, error: "submission_evidence_required" };

      const now = cleanString(input.submittedAt || input.submitted_at || input.createdAt || input.created_at) || new Date().toISOString();
      const submissionId = stableSubmissionId(Object.assign({}, input, { workspaceId, taskCardId: canonicalTaskCardId, submittedAt: now, audio }));
      const sessionId = cleanString(input.sessionId || input.session_id) || stableSessionId(submissionId);
      const textWords = text ? text.split(/\s+/).filter(Boolean).length : 0;
      const rawAudio = audio ? {
        kind: "audio",
        name: audio.name,
        mime: audio.mime,
        size: audio.size,
        durationMs: audio.durationMs,
        digest: audio.digest,
        url: `/api/v1/growth/audio/submissions/${encodeURIComponent(submissionId)}`
      } : null;
      const raw = {
        source: "growth-plugin",
        text: text || "",
        audio: rawAudio,
        author: cleanString(input.author),
        submittedAt: now
      };
      const attemptNo = countSubmissionsForTask(db, canonicalTaskCardId) + 1;
      const submissionValues = {
        id: submissionId,
        task_card_id: canonicalTaskCardId,
        session_id: sessionId,
        program_id: cleanString(taskCard.program_id || input.programId),
        learner_id: cleanString(taskCard.learner_id || input.learnerId || workspaceId),
        workspace_id: workspaceId,
        stage: cleanString(input.stage || "final"),
        submission_kind: audio ? (text ? "text_audio" : "audio") : "text",
        attempt_no: attemptNo,
        status: "submitted",
        summary: text.slice(0, 500) || (audio ? `Audio submission: ${audio.name}` : ""),
        text_digest: text ? sha256Hex(text) : "",
        text_chars: text.length,
        text_words: textWords,
        kanban_card_id: cleanString(taskCard.kanban_card_id || input.kanbanCardId || input.kanban_card_id),
        kanban_comment_ref: cleanString(input.kanbanCommentRef),
        raw_json: JSON.stringify(raw),
        submitted_at: now,
        withdrawn_at: "",
        created_at: now,
        updated_at: now
      };

      db.exec("BEGIN IMMEDIATE");
      try {
        ensureInteractionSession(db, {
          id: sessionId,
          taskCardId: canonicalTaskCardId,
          programId: taskCard.program_id,
          learnerId: taskCard.learner_id || workspaceId,
          workspaceId,
          submissionId,
          summary: submissionValues.summary,
          now
        });
        insertDynamic(db, "learning_task_submissions", submissionValues);
        let audioRecord = null;
        if (audio && tableExists(db, "learning_task_audio_blobs")) {
          audioRecord = insertAudioBlobContent(db, {
            type: "submission",
            row: Object.assign({}, submissionValues, {
              task_card_id: canonicalTaskCardId,
              task_program_id: taskCard.program_id,
              task_learner_id: taskCard.learner_id
            })
          }, audio, now);
        }
        if (tableExists(db, "learning_growth_evaluation_jobs")) {
          insertDynamic(db, "learning_growth_evaluation_jobs", {
            id: stableEvaluationJobId(submissionId),
            submission_id: submissionId,
            task_card_id: canonicalTaskCardId,
            learner_id: cleanString(taskCard.learner_id || workspaceId),
            workspace_id: workspaceId,
            status: "pending",
            attempt_count: 0,
            lease_owner: "",
            lease_until: "",
            last_error: "",
            raw_json: JSON.stringify({
              source: "growth-plugin",
              submissionId,
              taskCardId: canonicalTaskCardId,
              workspaceId,
              evidenceKind: submissionValues.submission_kind
            }),
            available_at: now,
            created_at: now,
            updated_at: now,
            completed_at: ""
          });
        }
        db.exec("COMMIT");
        return {
          ok: true,
          workspace_id: workspaceId,
          task_card_id: canonicalTaskCardId,
          requested_task_card_id: taskCardId,
          submission: publicSubmission(Object.assign({}, submissionValues, {
            task_card_id: canonicalTaskCardId,
            raw_json: JSON.stringify(raw)
          })),
          audio: audioRecord,
          evaluation_job: tableExists(db, "learning_growth_evaluation_jobs")
            ? { status: "pending", submissionId }
            : null,
          card: publicCardFromRow(db, taskCard, { today: todayKey(), nowIso: nowIsoValue() }),
          source: "growth-plugin-sqlite"
        };
      } catch (err) {
        db.exec("ROLLBACK");
        return { ok: false, error: err.message || String(err) };
      }
    } finally {
      db.close();
    }
  }

  function submitReflection(input = {}) {
    const db = open(false);
    try {
      if (!tableExists(db, "learning_task_cards") || !tableExists(db, "learning_task_reflections")) {
        return { ok: false, error: "growth_reflection_tables_missing" };
      }
      const workspaceId = cleanString(input.workspaceId);
      const taskCardId = cleanString(input.taskCardId || input.cardId);
      if (!workspaceId || !taskCardId) return { ok: false, error: "workspace_and_task_required" };
      const taskCard = taskCardByIdOrKanbanId(db, taskCardId, workspaceId);
      if (!taskCard) return { ok: false, error: "task_card_not_found" };
      const canonicalTaskCardId = cleanString(taskCard.id);
      if (isDailyScoreOnceCard(taskCard)) {
        const existingReflections = countReflectionsForTask(db, canonicalTaskCardId);
        if (existingReflections) {
          return {
            ok: false,
            error: "daily_card_reflection_already_recorded",
            task_card_id: canonicalTaskCardId,
            reflection_count: existingReflections
          };
        }
      }
      const text = cleanString(input.text || input.transcript || input.reflection || input.comment);
      const audio = decodeAudioInput(input);
      if (!text && !audio) return { ok: false, error: "reflection_evidence_required" };
      const now = cleanString(input.submittedAt || input.submitted_at || input.createdAt || input.created_at) || new Date().toISOString();
      const reflectionId = stableReflectionId(Object.assign({}, input, { workspaceId, taskCardId: canonicalTaskCardId, submittedAt: now, text, audio }));
      const sessionId = cleanString(input.sessionId || input.session_id) || stableSessionId(reflectionId);
      const rawAudio = audio ? {
        kind: "audio",
        name: audio.name,
        mime: audio.mime,
        size: audio.size,
        durationMs: audio.durationMs,
        digest: audio.digest,
        url: `/api/v1/growth/audio/reflections/${encodeURIComponent(reflectionId)}`
      } : null;
      const raw = {
        source: "growth-plugin",
        text,
        transcript: text,
        audio: rawAudio,
        author: cleanString(input.author),
        submittedAt: now
      };
      const reflectionValues = {
        id: reflectionId,
        task_card_id: canonicalTaskCardId,
        session_id: sessionId,
        program_id: cleanString(taskCard.program_id || input.programId),
        learner_id: cleanString(taskCard.learner_id || input.learnerId || workspaceId),
        workspace_id: workspaceId,
        mode: audio ? (text ? "audio_text" : "audio") : "text",
        status: "submitted",
        score: 0,
        summary: text.slice(0, 500) || (audio ? `Audio reflection: ${audio.name}` : ""),
        audio_digest: audio?.digest || "",
        raw_json: JSON.stringify(raw),
        submitted_at: now,
        created_at: now,
        updated_at: now
      };
      db.exec("BEGIN IMMEDIATE");
      try {
        ensureInteractionSession(db, {
          id: sessionId,
          taskCardId: canonicalTaskCardId,
          programId: taskCard.program_id,
          learnerId: taskCard.learner_id || workspaceId,
          workspaceId,
          submissionId: reflectionId,
          summary: reflectionValues.summary,
          now
        });
        insertDynamic(db, "learning_task_reflections", reflectionValues);
        let audioRecord = null;
        if (audio && tableExists(db, "learning_task_audio_blobs")) {
          audioRecord = insertAudioBlobContent(db, {
            type: "reflection",
            row: Object.assign({}, reflectionValues, {
              task_program_id: taskCard.program_id,
              task_learner_id: taskCard.learner_id
            })
          }, audio, now);
        }
        db.exec("COMMIT");
        return {
          ok: true,
          workspace_id: workspaceId,
          task_card_id: canonicalTaskCardId,
          requested_task_card_id: taskCardId,
          reflection: publicReflection(Object.assign({}, reflectionValues, { raw_json: JSON.stringify(raw) })),
          audio: audioRecord,
          card: publicCardFromRow(db, taskCard, { today: todayKey(), nowIso: nowIsoValue() }),
          source: "growth-plugin-sqlite"
        };
      } catch (err) {
        db.exec("ROLLBACK");
        return { ok: false, error: err.message || String(err) };
      }
    } finally {
      db.close();
    }
  }

  return {
    submitEvidence,
    submitReflection
  };
}

module.exports = {
  createEvidenceWriter,
  decodeAudioInput,
  insertAudioBlobContent,
  taskCardByIdOrKanbanId
};
