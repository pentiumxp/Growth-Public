const path = require("node:path");

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
  return {
    submissionId: row.id,
    taskCardId: row.task_card_id,
    status: row.status,
    submissionKind: row.submission_kind,
    submittedAt: row.submitted_at || row.created_at,
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
  return {
    reflectionId: row.id,
    taskCardId: row.task_card_id,
    status: row.status,
    mode: row.mode,
    score: numberValue(row.score),
    summary: cleanString(row.summary).slice(0, 700),
    submittedAt: row.submitted_at || row.created_at
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

function createGrowthLearningSqliteStore({ dbPath }) {
  const resolvedPath = path.resolve(dbPath || "");

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

  return {
    dbPath: resolvedPath,
    board,
    card,
    integrity
  };
}

module.exports = {
  REQUIRED_GROWTH_TABLES,
  createGrowthLearningSqliteStore
};
