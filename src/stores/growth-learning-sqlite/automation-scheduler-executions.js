"use strict";

const {
  asArray,
  cleanString,
  insertDynamic,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");
const { stableLearningAutomationSchedulerExecutionId } = require("./identifiers");

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|access-key\.txt|launch-token)/i;

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function boundedText(value, max = 360) {
  const text = cleanString(value);
  return text.length > max ? text.slice(0, max) : text;
}

function scanPrivacyKeys(value, path = "$", findings = []) {
  if (typeof value === "string") {
    if (PRIVATE_VALUE_PATTERN.test(value)) findings.push(path);
    return findings;
  }
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacyKeys(item, `${path}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    scanPrivacyKeys(child, childPath, findings);
  }
  return findings;
}

function ensureLearningAutomationSchedulerExecutionSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_automation_scheduler_executions (
      execution_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      handoff_id TEXT NOT NULL DEFAULT '',
      digest_id TEXT NOT NULL DEFAULT '',
      policy_id TEXT NOT NULL DEFAULT '',
      proposal_id TEXT NOT NULL DEFAULT '',
      plan_draft_id TEXT NOT NULL DEFAULT '',
      selected_item_id TEXT NOT NULL DEFAULT '',
      mode TEXT NOT NULL DEFAULT 'owner_explicit_once',
      status TEXT NOT NULL DEFAULT 'started',
      reason TEXT NOT NULL DEFAULT '',
      error TEXT NOT NULL DEFAULT '',
      gate_json TEXT NOT NULL DEFAULT '{}',
      action_json TEXT NOT NULL DEFAULT '{}',
      execution_json TEXT NOT NULL DEFAULT '{}',
      publish_result_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL DEFAULT '',
      executed_by TEXT NOT NULL DEFAULT '',
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_scheduler_executions_target
      ON learning_growth_automation_scheduler_executions(workspace_id, learner_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_scheduler_executions_proposal
      ON learning_growth_automation_scheduler_executions(workspace_id, proposal_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_scheduler_executions_handoff
      ON learning_growth_automation_scheduler_executions(workspace_id, handoff_id, updated_at);
  `);
  const columns = new Set(tableColumns(db, "learning_growth_automation_scheduler_executions"));
  [
    ["reason", "TEXT NOT NULL DEFAULT ''"],
    ["error", "TEXT NOT NULL DEFAULT ''"],
    ["gate_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["action_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["execution_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["publish_result_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["executed_by", "TEXT NOT NULL DEFAULT ''"]
  ].forEach(([name, definition]) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE learning_growth_automation_scheduler_executions ADD COLUMN ${name} ${definition}`);
  });
}

function publicAutomationSchedulerExecution(row) {
  if (!row) return null;
  return {
    executionId: cleanString(row.execution_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    handoffId: cleanString(row.handoff_id),
    digestId: cleanString(row.digest_id),
    policyId: cleanString(row.policy_id),
    proposalId: cleanString(row.proposal_id),
    planDraftId: cleanString(row.plan_draft_id),
    selectedItemId: cleanString(row.selected_item_id),
    mode: cleanString(row.mode),
    status: cleanString(row.status),
    reason: cleanString(row.reason),
    error: cleanString(row.error),
    gate: parseJson(row.gate_json, {}) || {},
    action: parseJson(row.action_json, {}) || {},
    execution: parseJson(row.execution_json, {}) || {},
    publishResult: parseJson(row.publish_result_json, {}) || {},
    createdBy: cleanString(row.created_by),
    executedBy: cleanString(row.executed_by),
    privacyClass: cleanString(row.privacy_class),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function createLearningAutomationSchedulerExecutionRepository({ open, now } = {}) {
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
      ensureLearningAutomationSchedulerExecutionSchema(db);
      return { ok: true, table: "learning_growth_automation_scheduler_executions" };
    });
  }

  function recordExecution(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationSchedulerExecutionSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      if (privacyFindings.length) {
        return { ok: false, error: "learning_automation_scheduler_execution_privacy_failed", privacyFindings };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const proposalId = cleanString(input.proposalId || input.proposal_id);
      const mode = cleanString(input.mode || input.executionMode || input.execution_mode || "owner_explicit_once") || "owner_explicit_once";
      const status = cleanString(input.status || "started").toLowerCase();
      if (!workspaceId || !proposalId) {
        return { ok: false, error: "learning_automation_scheduler_execution_scope_required" };
      }
      const allowedStatuses = new Set(["started", "published", "failed", "blocked", "skipped"]);
      if (!allowedStatuses.has(status)) {
        return { ok: false, error: "learning_automation_scheduler_execution_status_invalid" };
      }
      const privacyClass = cleanString(input.privacyClass || input.privacy_class || "summary_only") || "summary_only";
      if (privacyClass !== "summary_only") {
        return { ok: false, error: "learning_automation_scheduler_execution_privacy_class_required" };
      }
      const timestamp = cleanString(input.updatedAt || input.updated_at || input.createdAt || input.created_at) || clock().toISOString();
      const executionId = stableLearningAutomationSchedulerExecutionId(Object.assign({}, input, {
        workspaceId,
        proposalId,
        mode,
        createdAt: cleanString(input.createdAt || input.created_at) || timestamp
      }));
      const existing = db.prepare(`
        SELECT * FROM learning_growth_automation_scheduler_executions
        WHERE execution_id = ?
      `).get(executionId);
      const row = {
        execution_id: executionId,
        workspace_id: workspaceId,
        learner_id: cleanString(input.learnerId || input.learner_id || workspaceId),
        program_id: cleanString(input.programId || input.program_id),
        handoff_id: cleanString(input.handoffId || input.handoff_id),
        digest_id: cleanString(input.digestId || input.digest_id),
        policy_id: cleanString(input.policyId || input.policy_id),
        proposal_id: proposalId,
        plan_draft_id: cleanString(input.planDraftId || input.plan_draft_id),
        selected_item_id: cleanString(input.selectedItemId || input.selected_item_id),
        mode,
        status,
        reason: boundedText(input.reason, 240),
        error: boundedText(input.error, 240),
        gate_json: jsonText(input.gate || {}),
        action_json: jsonText(input.action || {}),
        execution_json: jsonText(input.execution || {}),
        publish_result_json: jsonText(input.publishResult || input.publish_result || {}),
        created_by: cleanString(input.createdBy || input.created_by || input.requestedBy || input.requested_by),
        executed_by: cleanString(input.executedBy || input.executed_by || input.requestedBy || input.requested_by),
        privacy_class: privacyClass,
        created_at: cleanString(input.createdAt || input.created_at) || timestamp,
        updated_at: timestamp
      };
      if (existing) {
        db.prepare(`
          UPDATE learning_growth_automation_scheduler_executions
          SET status = ?,
            reason = ?,
            error = ?,
            gate_json = ?,
            action_json = ?,
            execution_json = ?,
            publish_result_json = ?,
            executed_by = ?,
            updated_at = ?
          WHERE execution_id = ?
        `).run(
          row.status,
          row.reason,
          row.error,
          row.gate_json,
          row.action_json,
          row.execution_json,
          row.publish_result_json,
          row.executed_by,
          row.updated_at,
          executionId
        );
      } else {
        insertDynamic(db, "learning_growth_automation_scheduler_executions", row);
      }
      return {
        ok: true,
        duplicate: Boolean(existing && cleanString(existing.status) === status),
        execution: publicAutomationSchedulerExecution(db.prepare(`
          SELECT * FROM learning_growth_automation_scheduler_executions
          WHERE execution_id = ?
        `).get(executionId))
      };
    });
  }

  function getExecution(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_scheduler_executions")) return null;
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const executionId = cleanString(input.executionId || input.execution_id);
      if (!workspaceId || !executionId) return null;
      return publicAutomationSchedulerExecution(db.prepare(`
        SELECT * FROM learning_growth_automation_scheduler_executions
        WHERE workspace_id = ? AND execution_id = ?
      `).get(workspaceId, executionId));
    });
  }

  function listExecutions(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_scheduler_executions")) return [];
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id);
      const programId = cleanString(input.programId || input.program_id);
      const handoffId = cleanString(input.handoffId || input.handoff_id);
      const digestId = cleanString(input.digestId || input.digest_id);
      const proposalId = cleanString(input.proposalId || input.proposal_id);
      const status = cleanString(input.status);
      const where = [];
      const values = [];
      if (workspaceId) {
        where.push("workspace_id = ?");
        values.push(workspaceId);
      }
      if (learnerId) {
        where.push("learner_id = ?");
        values.push(learnerId);
      }
      if (programId) {
        where.push("program_id = ?");
        values.push(programId);
      }
      if (handoffId) {
        where.push("handoff_id = ?");
        values.push(handoffId);
      }
      if (digestId) {
        where.push("digest_id = ?");
        values.push(digestId);
      }
      if (proposalId) {
        where.push("proposal_id = ?");
        values.push(proposalId);
      }
      if (status) {
        where.push("status = ?");
        values.push(status);
      }
      const limit = Math.max(1, Math.min(100, Number(input.limit || 20) || 20));
      return db.prepare(`
        SELECT * FROM learning_growth_automation_scheduler_executions
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, execution_id DESC
        LIMIT ?
      `).all(...values, limit).map(publicAutomationSchedulerExecution).filter(Boolean);
    });
  }

  return {
    ensureSchema,
    getExecution,
    listExecutions,
    recordExecution
  };
}

module.exports = {
  createLearningAutomationSchedulerExecutionRepository,
  ensureLearningAutomationSchedulerExecutionSchema,
  publicAutomationSchedulerExecution
};
