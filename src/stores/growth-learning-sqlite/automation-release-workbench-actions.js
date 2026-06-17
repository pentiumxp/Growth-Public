"use strict";

const {
  cleanString,
  insertDynamic,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");
const { stableLearningAutomationReleaseWorkbenchActionAuditId } = require("./identifiers");

const RELEASE_WORKBENCH_ACTION_AUDIT_SCHEMA = "growth.learningAutomationReleaseWorkbenchActionAudit.v1";
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization|localstorage|sessionstorage|cookie.*jar)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|Bearer\s+|X-Hermes-Web-Key|X-Hermes-Access-Key|access-key\.txt|launch-token|Authorization:)/i;

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function booleanInt(value) {
  return value === true || value === 1 || value === "1" || value === "true" ? 1 : 0;
}

function scanPrivacyKeys(value, pathName = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacyKeys(item, `${pathName}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${pathName}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacyKeys(child, childPath, findings);
  }
  return findings;
}

function scanPrivateValues(value, pathName = "$", findings = []) {
  if (typeof value === "string") {
    if (PRIVATE_VALUE_PATTERN.test(value)) findings.push(pathName);
    return findings;
  }
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivateValues(item, `${pathName}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) scanPrivateValues(child, `${pathName}.${key}`, findings);
  return findings;
}

function ensureLearningAutomationReleaseWorkbenchActionAuditSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_automation_release_workbench_actions (
      action_audit_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      domain_pack_id TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      horizon TEXT NOT NULL DEFAULT 'daily_plan',
      collection_run_id TEXT NOT NULL DEFAULT '',
      endpoint_key TEXT NOT NULL DEFAULT '',
      action_key TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'blocked',
      record_id TEXT NOT NULL DEFAULT '',
      record_status TEXT NOT NULL DEFAULT '',
      duplicate INTEGER NOT NULL DEFAULT 0,
      workbench_status TEXT NOT NULL DEFAULT '',
      error TEXT NOT NULL DEFAULT '',
      action_record_json TEXT NOT NULL DEFAULT '{}',
      action_summary_json TEXT NOT NULL DEFAULT '{}',
      requested_by TEXT NOT NULL DEFAULT '',
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const columns = new Set(tableColumns(db, "learning_growth_automation_release_workbench_actions"));
  [
    ["program_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain_pack_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain", "TEXT NOT NULL DEFAULT ''"],
    ["subject", "TEXT NOT NULL DEFAULT ''"],
    ["horizon", "TEXT NOT NULL DEFAULT 'daily_plan'"],
    ["collection_run_id", "TEXT NOT NULL DEFAULT ''"],
    ["endpoint_key", "TEXT NOT NULL DEFAULT ''"],
    ["action_key", "TEXT NOT NULL DEFAULT ''"],
    ["record_id", "TEXT NOT NULL DEFAULT ''"],
    ["record_status", "TEXT NOT NULL DEFAULT ''"],
    ["duplicate", "INTEGER NOT NULL DEFAULT 0"],
    ["workbench_status", "TEXT NOT NULL DEFAULT ''"],
    ["error", "TEXT NOT NULL DEFAULT ''"],
    ["action_record_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["action_summary_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["requested_by", "TEXT NOT NULL DEFAULT ''"]
  ].forEach(([name, definition]) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE learning_growth_automation_release_workbench_actions ADD COLUMN ${name} ${definition}`);
  });
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_release_workbench_actions_target
      ON learning_growth_automation_release_workbench_actions(workspace_id, learner_id, endpoint_key, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_release_workbench_actions_scope
      ON learning_growth_automation_release_workbench_actions(workspace_id, program_id, domain_pack_id, subject, horizon, updated_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_release_workbench_actions_record
      ON learning_growth_automation_release_workbench_actions(workspace_id, endpoint_key, record_id, updated_at);
  `);
}

function publicAutomationReleaseWorkbenchActionAudit(row) {
  if (!row) return null;
  return {
    actionAuditId: cleanString(row.action_audit_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    domainPackId: cleanString(row.domain_pack_id),
    domain: cleanString(row.domain),
    subject: cleanString(row.subject),
    horizon: cleanString(row.horizon),
    collectionRunId: cleanString(row.collection_run_id),
    endpointKey: cleanString(row.endpoint_key),
    actionKey: cleanString(row.action_key),
    status: cleanString(row.status),
    recordId: cleanString(row.record_id),
    recordStatus: cleanString(row.record_status),
    duplicate: Number(row.duplicate || 0) === 1,
    workbenchStatus: cleanString(row.workbench_status),
    error: cleanString(row.error),
    actionRecord: parseJson(row.action_record_json, {}) || {},
    actionSummary: parseJson(row.action_summary_json, {}) || {},
    requestedBy: cleanString(row.requested_by),
    privacyClass: cleanString(row.privacy_class),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function createLearningAutomationReleaseWorkbenchActionAuditRepository({ open, now } = {}) {
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
      ensureLearningAutomationReleaseWorkbenchActionAuditSchema(db);
      return { ok: true, table: "learning_growth_automation_release_workbench_actions" };
    });
  }

  function saveActionAudit(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationReleaseWorkbenchActionAuditSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      const privateValueFindings = scanPrivateValues(input);
      if (privacyFindings.length || privateValueFindings.length) {
        return {
          ok: false,
          error: "learning_automation_release_workbench_action_audit_privacy_failed",
          privacyFindings,
          privateValueFindings
        };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
      const horizon = cleanString(input.horizon || "daily_plan") || "daily_plan";
      if (!workspaceId) return { ok: false, error: "learning_automation_release_workbench_action_audit_scope_required" };
      const privacyClass = cleanString(input.privacyClass || input.privacy_class || "summary_only") || "summary_only";
      if (privacyClass !== "summary_only" || input.summaryOnly !== true) {
        return { ok: false, error: "learning_automation_release_workbench_action_audit_privacy_class_required" };
      }
      const status = cleanString(input.status || "blocked").toLowerCase();
      if (!["recorded", "blocked", "failed"].includes(status)) {
        return { ok: false, error: "learning_automation_release_workbench_action_audit_status_invalid" };
      }
      const timestamp = cleanString(input.createdAt || input.created_at) || clock().toISOString();
      const recordId = cleanString(input.recordId || input.record_id);
      const actionAuditId = stableLearningAutomationReleaseWorkbenchActionAuditId(Object.assign({}, input, {
        workspaceId,
        learnerId,
        horizon,
        status,
        recordId,
        createdAt: timestamp
      }));
      const existing = db.prepare("SELECT * FROM learning_growth_automation_release_workbench_actions WHERE action_audit_id = ?").get(actionAuditId);
      if (existing) return { ok: true, duplicate: true, actionAudit: publicAutomationReleaseWorkbenchActionAudit(existing) };
      insertDynamic(db, "learning_growth_automation_release_workbench_actions", {
        action_audit_id: actionAuditId,
        workspace_id: workspaceId,
        learner_id: learnerId,
        program_id: cleanString(input.programId || input.program_id),
        domain_pack_id: cleanString(input.domainPackId || input.domain_pack_id),
        domain: cleanString(input.domain),
        subject: cleanString(input.subject),
        horizon,
        collection_run_id: cleanString(input.collectionRunId || input.collection_run_id || input.runId || input.run_id),
        endpoint_key: cleanString(input.endpointKey || input.endpoint_key),
        action_key: cleanString(input.actionKey || input.action_key),
        status,
        record_id: recordId,
        record_status: cleanString(input.recordStatus || input.record_status),
        duplicate: booleanInt(input.duplicate),
        workbench_status: cleanString(input.workbenchStatus || input.workbench_status),
        error: cleanString(input.error).slice(0, 240),
        action_record_json: jsonText(input.actionRecord || input.action_record || {}),
        action_summary_json: jsonText(input.actionSummary || input.action_summary || {}),
        requested_by: cleanString(input.requestedBy || input.requested_by),
        privacy_class: privacyClass,
        created_at: timestamp,
        updated_at: cleanString(input.updatedAt || input.updated_at) || timestamp
      });
      return {
        ok: true,
        duplicate: false,
        actionAudit: publicAutomationReleaseWorkbenchActionAudit(
          db.prepare("SELECT * FROM learning_growth_automation_release_workbench_actions WHERE action_audit_id = ?").get(actionAuditId)
        )
      };
    });
  }

  function listActionAudits(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_release_workbench_actions")) return [];
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id);
      const programId = cleanString(input.programId || input.program_id);
      const domainPackId = cleanString(input.domainPackId || input.domain_pack_id);
      const domain = cleanString(input.domain);
      const subject = cleanString(input.subject);
      const horizon = cleanString(input.horizon);
      const collectionRunId = cleanString(input.collectionRunId || input.collection_run_id || input.runId || input.run_id);
      const endpointKey = cleanString(input.endpointKey || input.endpoint_key);
      const actionKey = cleanString(input.actionKey || input.action_key);
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
      if (domainPackId) {
        where.push("domain_pack_id = ?");
        values.push(domainPackId);
      }
      if (domain) {
        where.push("domain = ?");
        values.push(domain);
      }
      if (subject) {
        where.push("subject = ?");
        values.push(subject);
      }
      if (horizon) {
        where.push("horizon = ?");
        values.push(horizon);
      }
      if (collectionRunId) {
        where.push("collection_run_id = ?");
        values.push(collectionRunId);
      }
      if (endpointKey) {
        where.push("endpoint_key = ?");
        values.push(endpointKey);
      }
      if (actionKey) {
        where.push("action_key = ?");
        values.push(actionKey);
      }
      if (status) {
        where.push("status = ?");
        values.push(status);
      }
      const limit = Math.max(1, Math.min(100, Number(input.limit || 20) || 20));
      return db.prepare(`
        SELECT * FROM learning_growth_automation_release_workbench_actions
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, action_audit_id DESC
        LIMIT ?
      `).all(...values, limit).map(publicAutomationReleaseWorkbenchActionAudit).filter(Boolean);
    });
  }

  return {
    ensureSchema,
    listActionAudits,
    saveActionAudit
  };
}

module.exports = {
  RELEASE_WORKBENCH_ACTION_AUDIT_SCHEMA,
  createLearningAutomationReleaseWorkbenchActionAuditRepository,
  ensureLearningAutomationReleaseWorkbenchActionAuditSchema,
  publicAutomationReleaseWorkbenchActionAudit
};
