"use strict";

const {
  cleanString,
  insertDynamic,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");
const { stableLearningOperatingLoopRunId } = require("./identifiers");

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|access-key\.txt|launch-token)/i;

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function boundedText(value, max = 360) {
  const text = cleanString(value);
  return text.length > max ? text.slice(0, max) : text;
}

function scanPrivacyKeys(value, path = "$", findings = [], privateValueFindings = []) {
  if (!value || typeof value !== "object") return { privacyFindings: findings, privateValueFindings };
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacyKeys(item, `${path}[${index}]`, findings, privateValueFindings));
    return { privacyFindings: findings, privateValueFindings };
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (typeof child === "string" && PRIVATE_VALUE_PATTERN.test(child)) privateValueFindings.push(childPath);
    if (child && typeof child === "object") scanPrivacyKeys(child, childPath, findings, privateValueFindings);
  }
  return { privacyFindings: findings, privateValueFindings };
}

function normalizeStatus(value) {
  const status = cleanString(value || "blocked").toLowerCase();
  return ["executed", "failed", "blocked"].includes(status) ? status : "blocked";
}

function normalizeOperation(value) {
  const operation = cleanString(value || "run_next").toLowerCase().replace(/-/g, "_");
  return operation || "run_next";
}

function normalizeLimit(value, fallback = 20) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(100, Math.trunc(parsed)));
}

function ensureLearningOperatingLoopRunSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_operating_loop_runs (
      run_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      domain_pack_id TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      horizon TEXT NOT NULL DEFAULT 'daily_plan',
      operation TEXT NOT NULL DEFAULT 'run_next',
      action TEXT NOT NULL DEFAULT '',
      execution_mode TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'blocked',
      error TEXT NOT NULL DEFAULT '',
      write_performed INTEGER NOT NULL DEFAULT 0,
      action_executed INTEGER NOT NULL DEFAULT 0,
      task_card_id TEXT NOT NULL DEFAULT '',
      plan_draft_id TEXT NOT NULL DEFAULT '',
      selected_item_id TEXT NOT NULL DEFAULT '',
      stage_assessment_cycle_id TEXT NOT NULL DEFAULT '',
      target_json TEXT NOT NULL DEFAULT '{}',
      scope_json TEXT NOT NULL DEFAULT '{}',
      next_action_json TEXT NOT NULL DEFAULT '{}',
      before_summary_json TEXT NOT NULL DEFAULT '{}',
      action_result_json TEXT NOT NULL DEFAULT '{}',
      after_summary_json TEXT NOT NULL DEFAULT '{}',
      result_selectors_json TEXT NOT NULL DEFAULT '{}',
      requested_by TEXT NOT NULL DEFAULT '',
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const columns = new Set(tableColumns(db, "learning_growth_operating_loop_runs"));
  [
    ["learner_id", "TEXT NOT NULL DEFAULT ''"],
    ["program_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain_pack_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain", "TEXT NOT NULL DEFAULT ''"],
    ["subject", "TEXT NOT NULL DEFAULT ''"],
    ["horizon", "TEXT NOT NULL DEFAULT 'daily_plan'"],
    ["operation", "TEXT NOT NULL DEFAULT 'run_next'"],
    ["action", "TEXT NOT NULL DEFAULT ''"],
    ["execution_mode", "TEXT NOT NULL DEFAULT ''"],
    ["status", "TEXT NOT NULL DEFAULT 'blocked'"],
    ["error", "TEXT NOT NULL DEFAULT ''"],
    ["write_performed", "INTEGER NOT NULL DEFAULT 0"],
    ["action_executed", "INTEGER NOT NULL DEFAULT 0"],
    ["task_card_id", "TEXT NOT NULL DEFAULT ''"],
    ["plan_draft_id", "TEXT NOT NULL DEFAULT ''"],
    ["selected_item_id", "TEXT NOT NULL DEFAULT ''"],
    ["stage_assessment_cycle_id", "TEXT NOT NULL DEFAULT ''"],
    ["target_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["scope_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["next_action_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["before_summary_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["action_result_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["after_summary_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["result_selectors_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["requested_by", "TEXT NOT NULL DEFAULT ''"],
    ["privacy_class", "TEXT NOT NULL DEFAULT 'summary_only'"],
    ["updated_at", "TEXT NOT NULL DEFAULT ''"]
  ].forEach(([name, definition]) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE learning_growth_operating_loop_runs ADD COLUMN ${name} ${definition}`);
  });
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_learning_growth_operating_loop_runs_target
      ON learning_growth_operating_loop_runs(workspace_id, learner_id, status, created_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_operating_loop_runs_scope
      ON learning_growth_operating_loop_runs(workspace_id, program_id, domain_pack_id, subject, horizon, action, status, created_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_operating_loop_runs_artifacts
      ON learning_growth_operating_loop_runs(workspace_id, task_card_id, plan_draft_id, stage_assessment_cycle_id, created_at);
  `);
}

function publicLearningOperatingLoopRun(row) {
  if (!row) return null;
  return {
    runId: cleanString(row.run_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    domainPackId: cleanString(row.domain_pack_id),
    domain: cleanString(row.domain),
    subject: cleanString(row.subject),
    horizon: cleanString(row.horizon),
    operation: cleanString(row.operation),
    action: cleanString(row.action),
    executionMode: cleanString(row.execution_mode),
    status: cleanString(row.status),
    error: cleanString(row.error),
    writePerformed: Number(row.write_performed || 0) === 1,
    actionExecuted: Number(row.action_executed || 0) === 1,
    taskCardId: cleanString(row.task_card_id),
    planDraftId: cleanString(row.plan_draft_id),
    selectedItemId: cleanString(row.selected_item_id),
    stageAssessmentCycleId: cleanString(row.stage_assessment_cycle_id),
    target: parseJson(row.target_json, {}) || {},
    scope: parseJson(row.scope_json, {}) || {},
    nextAction: parseJson(row.next_action_json, {}) || {},
    beforeSummary: parseJson(row.before_summary_json, {}) || {},
    actionResult: parseJson(row.action_result_json, {}) || {},
    afterSummary: parseJson(row.after_summary_json, {}) || {},
    resultSelectors: parseJson(row.result_selectors_json, {}) || {},
    requestedBy: cleanString(row.requested_by),
    privacyClass: cleanString(row.privacy_class),
    summaryOnly: true,
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function createLearningOperatingLoopRunRepository({ open, now } = {}) {
  const clock = typeof now === "function" ? now : () => new Date();

  function withDb(readOnly, callback) {
    const db = open(readOnly);
    try {
      return callback(db);
    } finally {
      db.close();
    }
  }

  function ensureSchema() {
    return withDb(false, (db) => {
      ensureLearningOperatingLoopRunSchema(db);
      return { ok: true, table: "learning_growth_operating_loop_runs" };
    });
  }

  function recordRun(input = {}) {
    return withDb(false, (db) => {
      ensureLearningOperatingLoopRunSchema(db);
      const { privacyFindings, privateValueFindings } = scanPrivacyKeys(input);
      if (privacyFindings.length || privateValueFindings.length) {
        return {
          ok: false,
          error: "learning_operating_loop_run_privacy_failed",
          privacyFindings,
          privateValueFindings
        };
      }
      const target = input.target && typeof input.target === "object" ? input.target : {};
      const scope = input.scope && typeof input.scope === "object" ? input.scope : {};
      const workspaceId = cleanString(input.workspaceId || input.workspace_id || target.workspaceId);
      if (!workspaceId) return { ok: false, error: "learning_operating_loop_run_scope_required" };
      const privacyClass = cleanString(input.privacyClass || input.privacy_class || "summary_only") || "summary_only";
      if (privacyClass !== "summary_only") {
        return { ok: false, error: "learning_operating_loop_run_privacy_class_required" };
      }
      const timestamp = cleanString(input.createdAt || input.created_at) || clock().toISOString();
      const operation = normalizeOperation(input.operation);
      const status = normalizeStatus(input.status);
      const runId = stableLearningOperatingLoopRunId(Object.assign({}, input, {
        workspaceId,
        operation,
        status,
        createdAt: timestamp
      }));
      const existing = db.prepare("SELECT * FROM learning_growth_operating_loop_runs WHERE run_id = ?").get(runId);
      if (existing) return { ok: true, duplicate: true, run: publicLearningOperatingLoopRun(existing) };
      insertDynamic(db, "learning_growth_operating_loop_runs", {
        run_id: runId,
        workspace_id: workspaceId,
        learner_id: cleanString(input.learnerId || input.learner_id || target.learnerId || workspaceId),
        program_id: cleanString(input.programId || input.program_id || scope.programId),
        domain_pack_id: cleanString(input.domainPackId || input.domain_pack_id || scope.domainPackId),
        domain: cleanString(input.domain || scope.domain),
        subject: cleanString(input.subject || scope.subject),
        horizon: cleanString(input.horizon || scope.horizon || "daily_plan") || "daily_plan",
        operation,
        action: cleanString(input.action || input.executedAction || input.executed_action),
        execution_mode: cleanString(input.executionMode || input.execution_mode),
        status,
        error: boundedText(input.error, 360),
        write_performed: input.writePerformed === true || input.write_performed === true ? 1 : 0,
        action_executed: input.actionExecuted === true || input.action_executed === true ? 1 : 0,
        task_card_id: cleanString(input.taskCardId || input.task_card_id),
        plan_draft_id: cleanString(input.planDraftId || input.plan_draft_id),
        selected_item_id: cleanString(input.selectedItemId || input.selected_item_id || input.itemId || input.item_id),
        stage_assessment_cycle_id: cleanString(input.stageAssessmentCycleId || input.stage_assessment_cycle_id),
        target_json: jsonText(target),
        scope_json: jsonText(scope),
        next_action_json: jsonText(input.nextAction || input.next_action || {}),
        before_summary_json: jsonText(input.beforeSummary || input.before_summary || {}),
        action_result_json: jsonText(input.actionResult || input.action_result || {}),
        after_summary_json: jsonText(input.afterSummary || input.after_summary || {}),
        result_selectors_json: jsonText(input.resultSelectors || input.result_selectors || {}),
        requested_by: cleanString(input.requestedBy || input.requested_by),
        privacy_class: privacyClass,
        created_at: timestamp,
        updated_at: cleanString(input.updatedAt || input.updated_at) || timestamp
      });
      return {
        ok: true,
        duplicate: false,
        run: publicLearningOperatingLoopRun(db.prepare("SELECT * FROM learning_growth_operating_loop_runs WHERE run_id = ?").get(runId))
      };
    });
  }

  function listRuns(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_operating_loop_runs")) return [];
      const where = [];
      const values = [];
      [
        ["workspace_id", input.workspaceId || input.workspace_id],
        ["learner_id", input.learnerId || input.learner_id],
        ["program_id", input.programId || input.program_id],
        ["domain_pack_id", input.domainPackId || input.domain_pack_id],
        ["domain", input.domain],
        ["subject", input.subject],
        ["horizon", input.horizon],
        ["operation", input.operation ? normalizeOperation(input.operation) : ""],
        ["action", input.action || input.executedAction || input.executed_action],
        ["status", input.status ? normalizeStatus(input.status) : ""],
        ["task_card_id", input.taskCardId || input.task_card_id],
        ["plan_draft_id", input.planDraftId || input.plan_draft_id],
        ["stage_assessment_cycle_id", input.stageAssessmentCycleId || input.stage_assessment_cycle_id],
        ["run_id", input.runId || input.run_id || input.operatingLoopRunId || input.operating_loop_run_id]
      ].forEach(([column, raw]) => {
        const value = cleanString(raw);
        if (value) {
          where.push(`${column} = ?`);
          values.push(value);
        }
      });
      const limit = normalizeLimit(input.limit, 20);
      const sql = `SELECT * FROM learning_growth_operating_loop_runs${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC, updated_at DESC LIMIT ?`;
      return db.prepare(sql).all(...values, limit).map(publicLearningOperatingLoopRun);
    });
  }

  return {
    ensureSchema,
    recordRun,
    listRuns
  };
}

module.exports = {
  createLearningOperatingLoopRunRepository,
  ensureLearningOperatingLoopRunSchema,
  publicLearningOperatingLoopRun,
  scanPrivacyKeys
};
