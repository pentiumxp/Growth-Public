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
  const raw = parseJson(row.raw_json, {}) || {};
  return {
    evaluationId: row.id,
    taskCardId: row.task_card_id,
    status: row.status,
    score: numberValue(row.score),
    maxScore: 100,
    passed: Boolean(Number(row.passed || 0)),
    summary: cleanString(row.summary).slice(0, 700),
    confidence: numberValue(row.confidence),
    revisionRequirements: asArray(raw.revisionRequirements).slice(0, 6),
    remainingWeaknesses: asArray(raw.remainingWeaknesses).slice(0, 6),
    feedbackSections: raw.feedbackSections && typeof raw.feedbackSections === "object" ? raw.feedbackSections : {},
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

function publicRewardSettlement(row) {
  if (!row) return null;
  const raw = parseJson(row.raw_json, {}) || {};
  return {
    rewardSettlementId: row.id,
    learnerId: row.learner_id || raw.learnerId || "",
    workspaceId: row.workspace_id || raw.workspaceId || "",
    programId: row.program_id || raw.programId || "",
    taskCardId: row.task_card_id || raw.taskCardId || "",
    sessionId: row.session_id || raw.sessionId || "",
    evaluationId: row.evaluation_id || raw.evaluationId || "",
    status: row.status || raw.status || "",
    coinAmount: numberValue(row.coin_amount || raw.coinAmount),
    currency: "learning_coin",
    reason: row.reason || raw.reason || "",
    sourceType: row.source_type || raw.sourceType || "",
    sourceId: row.source_id || raw.sourceId || "",
    idempotencyKey: row.idempotency_key || raw.idempotencyKey || "",
    createdAt: row.created_at || raw.createdAt || "",
    updatedAt: row.updated_at || raw.updatedAt || "",
    settledAt: row.settled_at || raw.settledAt || ""
  };
}

function markTaskCardCompleted(db, taskCard = {}, input = {}) {
  if (!tableExists(db, "learning_task_cards")) return null;
  const taskCardId = cleanString(taskCard.id || input.taskCardId);
  if (!taskCardId) return null;
  const now = cleanString(input.completedAt || input.now) || new Date().toISOString();
  const columns = tableColumns(db, "learning_task_cards");
  const values = [];
  const updates = [];
  if (columns.includes("status")) {
    updates.push("status = ?");
    values.push("completed");
  }
  if (columns.includes("updated_at")) {
    updates.push("updated_at = ?");
    values.push(now);
  }
  if (columns.includes("raw_json")) {
    const raw = parseJson(taskCard.raw_json, {}) || {};
    const nextRaw = Object.assign({}, raw, {
      completedAt: raw.completedAt || raw.completed_at || now,
      rewardState: "settled"
    });
    updates.push("raw_json = ?");
    values.push(JSON.stringify(nextRaw));
  }
  if (!updates.length) return null;
  values.push(taskCardId);
  db.prepare(`UPDATE learning_task_cards SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  return db.prepare("SELECT * FROM learning_task_cards WHERE id = ?").get(taskCardId) || null;
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

function stableSubmissionId(input = {}) {
  const explicit = cleanString(input.submissionId || input.submission_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId),
    cleanString(input.taskCardId),
    cleanString(input.submittedAt),
    cleanString(input.text),
    cleanString(input.audio?.digest)
  ].join(":");
  return `lsub_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableEvaluationJobId(submissionId) {
  return `lgjob_${sha256Hex(cleanString(submissionId)).slice(0, 18)}`;
}

function stableEvaluationId(submissionId) {
  return `lgeval_${sha256Hex(cleanString(submissionId)).slice(0, 18)}`;
}

function stableSessionId(submissionId) {
  return `lsess_${sha256Hex(cleanString(submissionId)).slice(0, 18)}`;
}

function stableReflectionId(input = {}) {
  const explicit = cleanString(input.reflectionId || input.reflection_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId),
    cleanString(input.taskCardId),
    cleanString(input.submittedAt),
    cleanString(input.text),
    cleanString(input.audio?.digest)
  ].join(":");
  return `lrefl_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableRewardSettlementId(evaluationId) {
  return `lrwd_${sha256Hex(cleanString(evaluationId)).slice(0, 18)}`;
}

function tableColumns(db, tableName) {
  if (!tableExists(db, tableName)) return [];
  return db.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => column.name);
}

function insertDynamic(db, tableName, values = {}) {
  const columns = tableColumns(db, tableName).filter((column) => Object.prototype.hasOwnProperty.call(values, column));
  if (!columns.length) return null;
  const placeholders = columns.map(() => "?").join(", ");
  db.prepare(`INSERT INTO ${tableName}(${columns.join(", ")}) VALUES (${placeholders})`).run(...columns.map((column) => values[column]));
  return values;
}

function upsertDynamic(db, tableName, values = {}, conflictColumn = "id") {
  const columns = tableColumns(db, tableName).filter((column) => Object.prototype.hasOwnProperty.call(values, column));
  if (!columns.length) return null;
  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns
    .filter((column) => column !== conflictColumn && column !== "created_at")
    .map((column) => `${column}=excluded.${column}`)
    .join(", ");
  const sql = updates
    ? `INSERT INTO ${tableName}(${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT(${conflictColumn}) DO UPDATE SET ${updates}`
    : `INSERT OR IGNORE INTO ${tableName}(${columns.join(", ")}) VALUES (${placeholders})`;
  db.prepare(sql).run(...columns.map((column) => values[column]));
  return values;
}

function existingAudioBlob(db, recordType, recordId) {
  if (!tableExists(db, "learning_task_audio_blobs")) return null;
  return db.prepare("SELECT id, size FROM learning_task_audio_blobs WHERE record_type = ? AND record_id = ?")
    .get(normalizeRecordType(recordType), cleanString(recordId)) || null;
}

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

function publicGrowthEvaluationJob(row) {
  if (!row) return null;
  return {
    jobId: row.id,
    submissionId: row.submission_id,
    taskCardId: row.task_card_id,
    learnerId: row.learner_id || "",
    workspaceId: row.workspace_id,
    status: row.status,
    attemptCount: Number(row.attempt_count || 0),
    leaseOwner: row.lease_owner || "",
    leaseUntil: row.lease_until || "",
    lastError: row.last_error || "",
    availableAt: row.available_at || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
    completedAt: row.completed_at || "",
    raw: parseJson(row.raw_json, {}) || {}
  };
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
      const row = taskCardByIdOrKanbanId(db, id, cleanWorkspaceId);
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
          card: publicCardFromRow(db, taskCard),
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
          card: publicCardFromRow(db, taskCard),
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

  function getGrowthEvaluationJob(db, jobId) {
    if (!tableExists(db, "learning_growth_evaluation_jobs")) return null;
    return publicGrowthEvaluationJob(db.prepare("SELECT * FROM learning_growth_evaluation_jobs WHERE id = ?").get(cleanString(jobId)));
  }

  function listEvaluationJobs(filters = {}) {
    return withDb((db) => {
      if (!tableExists(db, "learning_growth_evaluation_jobs")) return [];
      const values = [];
      const where = [];
      const statuses = Array.isArray(filters.status)
        ? filters.status.map(cleanString).filter(Boolean)
        : [cleanString(filters.status)].filter(Boolean);
      if (statuses.length === 1) {
        where.push("status = ?");
        values.push(statuses[0]);
      } else if (statuses.length > 1) {
        where.push(`status IN (${statuses.map(() => "?").join(", ")})`);
        values.push(...statuses);
      }
      if (filters.workspaceId) {
        where.push("workspace_id = ?");
        values.push(cleanString(filters.workspaceId));
      }
      if (filters.availableBefore) {
        where.push("available_at <= ?");
        values.push(cleanString(filters.availableBefore));
      }
      const limit = Math.max(1, Math.min(100, Number(filters.limit || 20) || 20));
      return db.prepare(`SELECT * FROM learning_growth_evaluation_jobs ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY available_at ASC, created_at ASC LIMIT ?`)
        .all(...values, limit)
        .map(publicGrowthEvaluationJob);
    });
  }

  function claimEvaluationJob(jobId, input = {}) {
    const db = open(false);
    try {
      if (!tableExists(db, "learning_growth_evaluation_jobs")) return null;
      const now = cleanString(input.now) || new Date().toISOString();
      const leaseUntil = cleanString(input.leaseUntil) || new Date(Date.parse(now) + 10 * 60 * 1000).toISOString();
      const leaseOwner = cleanString(input.leaseOwner) || "growth-plugin-evaluator";
      const result = db.prepare(`
        UPDATE learning_growth_evaluation_jobs
        SET status = 'processing',
            attempt_count = attempt_count + 1,
            lease_owner = ?,
            lease_until = ?,
            updated_at = ?
        WHERE id = ?
          AND status IN ('pending', 'retry', 'processing')
          AND (status <> 'processing' OR lease_until = '' OR lease_until <= ?)
          AND available_at <= ?
      `).run(leaseOwner, leaseUntil, now, cleanString(jobId), now, now);
      if (!result.changes) return null;
      return getGrowthEvaluationJob(db, jobId);
    } finally {
      db.close();
    }
  }

  function completeEvaluationJob(jobId, input = {}) {
    const db = open(false);
    try {
      if (!tableExists(db, "learning_growth_evaluation_jobs")) return null;
      const now = cleanString(input.completedAt || input.now) || new Date().toISOString();
      db.prepare(`
        UPDATE learning_growth_evaluation_jobs
        SET status = 'done',
            lease_owner = '',
            lease_until = '',
            last_error = '',
            completed_at = ?,
            updated_at = ?
        WHERE id = ?
      `).run(now, now, cleanString(jobId));
      return getGrowthEvaluationJob(db, jobId);
    } finally {
      db.close();
    }
  }

  function failEvaluationJob(jobId, input = {}) {
    const db = open(false);
    try {
      if (!tableExists(db, "learning_growth_evaluation_jobs")) return null;
      const now = cleanString(input.now) || new Date().toISOString();
      const status = cleanString(input.status || "retry");
      const availableAt = cleanString(input.availableAt) || now;
      db.prepare(`
        UPDATE learning_growth_evaluation_jobs
        SET status = ?,
            lease_owner = '',
            lease_until = '',
            last_error = ?,
            available_at = ?,
            updated_at = ?
        WHERE id = ?
      `).run(status, cleanString(input.error).slice(0, 500), availableAt, now, cleanString(jobId));
      return getGrowthEvaluationJob(db, jobId);
    } finally {
      db.close();
    }
  }

  function evaluationJobContext(input = {}) {
    return withDb((db) => {
      if (!tableExists(db, "learning_growth_evaluation_jobs") || !tableExists(db, "learning_task_submissions") || !tableExists(db, "learning_task_cards")) {
        return null;
      }
      const job = cleanString(input.jobId)
        ? db.prepare("SELECT * FROM learning_growth_evaluation_jobs WHERE id = ?").get(cleanString(input.jobId))
        : db.prepare("SELECT * FROM learning_growth_evaluation_jobs WHERE submission_id = ?").get(cleanString(input.submissionId));
      if (!job) return null;
      const submission = db.prepare("SELECT * FROM learning_task_submissions WHERE id = ?").get(job.submission_id);
      if (!submission) return null;
      const taskCard = db.prepare("SELECT * FROM learning_task_cards WHERE id = ?").get(submission.task_card_id);
      if (!taskCard) return null;
      return {
        job: publicGrowthEvaluationJob(job),
        submission,
        taskCard,
        submissionRaw: parseJson(submission.raw_json, {}) || {},
        taskRaw: parseJson(taskCard.raw_json, {}) || {}
      };
    });
  }

  function recordEvaluation(input = {}) {
    const db = open(false);
    try {
      if (!tableExists(db, "learning_evaluations")) return { ok: false, error: "evaluation_table_missing" };
      const now = cleanString(input.evaluatedAt || input.createdAt) || new Date().toISOString();
      const taskCard = input.taskCard || {};
      const submission = input.submission || {};
      const evaluation = input.evaluation || {};
      const submissionId = cleanString(submission.id || input.submissionId);
      const evaluationId = cleanString(evaluation.evaluationId || input.evaluationId) || stableEvaluationId(submissionId);
      const raw = {
        source: "growth-plugin",
        submissionId,
        revisionRequirements: asArray(evaluation.revisionRequirements).slice(0, 8),
        remainingWeaknesses: asArray(evaluation.remainingWeaknesses).slice(0, 8),
        feedbackSections: evaluation.feedbackSections && typeof evaluation.feedbackSections === "object" ? evaluation.feedbackSections : {},
        evidenceRefs: asArray(evaluation.evidenceRefs).slice(0, 8)
      };
      const values = {
        id: evaluationId,
        task_card_id: cleanString(submission.task_card_id || input.taskCardId || taskCard.id),
        session_id: cleanString(submission.session_id),
        program_id: cleanString(submission.program_id || taskCard.program_id),
        learner_id: cleanString(submission.learner_id || taskCard.learner_id || input.workspaceId),
        workspace_id: cleanString(submission.workspace_id || taskCard.workspace_id || input.workspaceId),
        status: cleanString(evaluation.status || "needs_revision"),
        score: Number(evaluation.score || 0),
        passed: evaluation.passed ? 1 : 0,
        confidence: Number(evaluation.confidence || 0),
        summary: cleanString(evaluation.summary).slice(0, 700),
        skill_results_json: JSON.stringify(evaluation.skillResults || []),
        reward_policy_json: JSON.stringify(evaluation.reward || {}),
        source_basis_refs_json: JSON.stringify(raw.evidenceRefs),
        raw_json: JSON.stringify(raw),
        created_at: now
      };
      insertDynamic(db, "learning_evaluations", values);
      return {
        ok: true,
        evaluation: publicEvaluation(Object.assign({}, values, { raw_json: values.raw_json }))
      };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    } finally {
      db.close();
    }
  }

  function settleEvaluationReward(input = {}) {
    const db = open(false);
    try {
      if (!tableExists(db, "learning_reward_settlements")) {
        return { ok: false, available: false, error: "reward_settlement_table_missing" };
      }
      const evaluation = input.evaluation || {};
      const taskCard = input.taskCard || {};
      const submission = input.submission || {};
      const evaluationId = cleanString(evaluation.evaluationId || input.evaluationId);
      if (!evaluationId) return { ok: false, error: "growth_evaluation_id_required" };
      const existing = tableColumns(db, "learning_reward_settlements").includes("evaluation_id")
        ? db.prepare("SELECT * FROM learning_reward_settlements WHERE evaluation_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1").get(evaluationId)
        : db.prepare("SELECT * FROM learning_reward_settlements WHERE id = ?").get(stableRewardSettlementId(evaluationId));
      if (existing) return { ok: true, duplicate: true, settlement: publicRewardSettlement(existing) };

      const now = cleanString(input.settledAt || input.now) || new Date().toISOString();
      const passed = Boolean(evaluation.passed);
      const coinAmount = passed
        ? Math.max(0, Math.round(numberValue(taskCard.reward_cap_coins || taskCard.configured_reward_coins || taskCard.default_reward_coins || 100)))
        : 0;
      const settlementId = stableRewardSettlementId(evaluationId);
      const idempotencyKey = `growth-plugin:evaluation:${evaluationId}:learning-coin`;
      const status = passed ? "settled" : "blocked";
      const reason = passed ? "growth_coin_settled_after_passed_evaluation" : "revision_required_before_growth_coin_reward";
      const raw = {
        source: "growth-plugin",
        currency: "learning_coin",
        tongbaoExchange: {
          status: "not_requested",
          policy: "admin_monthly_exchange_only"
        },
        evaluationStatus: cleanString(evaluation.status),
        score: numberValue(evaluation.score),
        passed
      };
      const ledgerEntry = passed
        ? {
          currency: "learning_coin",
          amountDelta: coinAmount,
          sourceType: "growth-plugin-evaluation",
          sourceId: evaluationId,
          idempotencyKey
        }
        : null;
      const values = {
        id: settlementId,
        learner_id: cleanString(taskCard.learner_id || submission.learner_id || input.workspaceId),
        workspace_id: cleanString(taskCard.workspace_id || submission.workspace_id || input.workspaceId),
        program_id: cleanString(taskCard.program_id || submission.program_id),
        task_card_id: cleanString(taskCard.id || submission.task_card_id || input.taskCardId),
        session_id: cleanString(submission.session_id) || stableSessionId(cleanString(submission.id || input.submissionId || evaluationId)),
        evaluation_id: evaluationId,
        status,
        coin_amount: coinAmount,
        reason,
        source_type: "growth-plugin-evaluation",
        source_id: evaluationId,
        idempotency_key: idempotencyKey,
        review_request_id: "",
        ledger_entry_json: JSON.stringify(ledgerEntry),
        raw_json: JSON.stringify(raw),
        created_at: now,
        updated_at: now,
        settled_at: passed ? now : ""
      };
      db.exec("BEGIN IMMEDIATE");
      try {
        upsertDynamic(db, "learning_reward_settlements", values);
        if (passed) {
          markTaskCardCompleted(db, taskCard, { taskCardId: values.task_card_id, completedAt: now });
        }
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
      const row = tableColumns(db, "learning_reward_settlements").includes("evaluation_id")
        ? db.prepare("SELECT * FROM learning_reward_settlements WHERE evaluation_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1").get(evaluationId)
        : db.prepare("SELECT * FROM learning_reward_settlements WHERE id = ?").get(settlementId);
      return { ok: true, settlement: publicRewardSettlement(row || values), source: "growth-plugin-sqlite" };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    } finally {
      db.close();
    }
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
    claimEvaluationJob,
    completeEvaluationJob,
    evaluationJobContext,
    failEvaluationJob,
    listEvaluationJobs,
    recordEvaluation,
    settleEvaluationReward,
    submitEvidence,
    submitReflection,
    integrity
  };
}

module.exports = {
  REQUIRED_GROWTH_TABLES,
  createGrowthLearningSqliteStore
};
