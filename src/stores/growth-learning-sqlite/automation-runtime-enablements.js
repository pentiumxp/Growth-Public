"use strict";

const {
  cleanString,
  insertDynamic,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");
const { stableLearningAutomationRuntimeEnablementId } = require("./identifiers");

const RUNTIME_ENABLEMENT_SCHEMA = "growth.learningAutomationRuntimeEnablement.v1";
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization|localstorage|sessionstorage|cookie.*jar)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|Bearer\s+|X-Hermes-Web-Key|X-Hermes-Access-Key|access-key\.txt|launch-token|Authorization:)/i;
const VALID_RUNTIME_ENABLEMENT_STATUSES = Object.freeze([
  "ready_for_manual_runtime_config_enablement",
  "verified_enabled",
  "partial_config",
  "activation_record_required",
  "activation_record_invalid",
  "blocked"
]);

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function boundedText(value, max = 720) {
  const text = cleanString(value);
  return text.length > max ? text.slice(0, max) : text;
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

function unsafeRuntimeMutation(input = {}) {
  return input.configChangeApplied === true
    || input.configChange_applied === true
    || input.runtimeConfigChange === true
    || input.runtime_config_change === true
    || input.runtimeConfigMutationPerformed === true
    || input.runtime_config_mutation_performed === true
    || input.writefulSchedulingAllowed === true
    || input.writeful_scheduling_allowed === true
    || input.backgroundSchedulingAllowed === true
    || input.background_scheduling_allowed === true
    || input.backgroundWorkerAllowed === true
    || input.background_worker_allowed === true;
}

function ensureLearningAutomationRuntimeEnablementSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_automation_runtime_enablements (
      enablement_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      domain_pack_id TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      horizon TEXT NOT NULL DEFAULT 'daily_plan',
      collection_run_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'blocked',
      enablement_version TEXT NOT NULL DEFAULT '${RUNTIME_ENABLEMENT_SCHEMA}',
      requested_activation_gates_json TEXT NOT NULL DEFAULT '[]',
      required_config_keys_json TEXT NOT NULL DEFAULT '[]',
      current_config_json TEXT NOT NULL DEFAULT '{}',
      activation_summary_json TEXT NOT NULL DEFAULT '{}',
      enablement_decision_json TEXT NOT NULL DEFAULT '{}',
      evidence_summary_json TEXT NOT NULL DEFAULT '{}',
      note TEXT NOT NULL DEFAULT '',
      requested_by TEXT NOT NULL DEFAULT '',
      recorded_by TEXT NOT NULL DEFAULT '',
      recorded_at TEXT NOT NULL DEFAULT '',
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const columns = new Set(tableColumns(db, "learning_growth_automation_runtime_enablements"));
  [
    ["program_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain_pack_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain", "TEXT NOT NULL DEFAULT ''"],
    ["subject", "TEXT NOT NULL DEFAULT ''"],
    ["horizon", "TEXT NOT NULL DEFAULT 'daily_plan'"],
    ["collection_run_id", "TEXT NOT NULL DEFAULT ''"],
    ["enablement_version", `TEXT NOT NULL DEFAULT '${RUNTIME_ENABLEMENT_SCHEMA}'`],
    ["requested_activation_gates_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["required_config_keys_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["current_config_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["activation_summary_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["enablement_decision_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["evidence_summary_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["note", "TEXT NOT NULL DEFAULT ''"],
    ["requested_by", "TEXT NOT NULL DEFAULT ''"],
    ["recorded_by", "TEXT NOT NULL DEFAULT ''"],
    ["recorded_at", "TEXT NOT NULL DEFAULT ''"]
  ].forEach(([name, definition]) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE learning_growth_automation_runtime_enablements ADD COLUMN ${name} ${definition}`);
  });
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_runtime_enablements_target
      ON learning_growth_automation_runtime_enablements(workspace_id, learner_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_runtime_enablements_scope
      ON learning_growth_automation_runtime_enablements(workspace_id, program_id, domain_pack_id, subject, horizon, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_runtime_enablements_run
      ON learning_growth_automation_runtime_enablements(workspace_id, collection_run_id, status, updated_at);
  `);
}

function publicAutomationRuntimeEnablement(row) {
  if (!row) return null;
  return {
    enablementId: cleanString(row.enablement_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    domainPackId: cleanString(row.domain_pack_id),
    domain: cleanString(row.domain),
    subject: cleanString(row.subject),
    horizon: cleanString(row.horizon),
    collectionRunId: cleanString(row.collection_run_id),
    status: cleanString(row.status),
    enablementVersion: cleanString(row.enablement_version),
    requestedActivationGates: parseJson(row.requested_activation_gates_json, []) || [],
    requiredConfigKeys: parseJson(row.required_config_keys_json, []) || [],
    currentConfig: parseJson(row.current_config_json, {}) || {},
    activationSummary: parseJson(row.activation_summary_json, {}) || {},
    enablementDecision: parseJson(row.enablement_decision_json, {}) || {},
    evidenceSummary: parseJson(row.evidence_summary_json, {}) || {},
    note: cleanString(row.note),
    requestedBy: cleanString(row.requested_by),
    recordedBy: cleanString(row.recorded_by),
    recordedAt: cleanString(row.recorded_at),
    privacyClass: cleanString(row.privacy_class),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function createLearningAutomationRuntimeEnablementRepository({ open, now } = {}) {
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
      ensureLearningAutomationRuntimeEnablementSchema(db);
      return { ok: true, table: "learning_growth_automation_runtime_enablements" };
    });
  }

  function saveEnablement(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationRuntimeEnablementSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      const privateValueFindings = scanPrivateValues(input);
      if (privacyFindings.length || privateValueFindings.length) {
        return {
          ok: false,
          error: "learning_automation_runtime_enablement_privacy_failed",
          privacyFindings,
          privateValueFindings
        };
      }
      if (unsafeRuntimeMutation(input)
        || unsafeRuntimeMutation(input.currentConfig || input.current_config || {})
        || unsafeRuntimeMutation(input.activationSummary || input.activation_summary || {})
        || unsafeRuntimeMutation(input.enablementDecision || input.enablement_decision || {})
        || unsafeRuntimeMutation(input.evidenceSummary || input.evidence_summary || {})) {
        return { ok: false, error: "learning_automation_runtime_enablement_no_runtime_change_required" };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
      const horizon = cleanString(input.horizon || "daily_plan") || "daily_plan";
      if (!workspaceId) return { ok: false, error: "learning_automation_runtime_enablement_scope_required" };
      const privacyClass = cleanString(input.privacyClass || input.privacy_class || "summary_only") || "summary_only";
      if (privacyClass !== "summary_only" || input.summaryOnly !== true) {
        return { ok: false, error: "learning_automation_runtime_enablement_privacy_class_required" };
      }
      const status = cleanString(input.status || input.enablementStatus || input.enablement_status || "blocked").toLowerCase();
      if (!VALID_RUNTIME_ENABLEMENT_STATUSES.includes(status)) {
        return { ok: false, error: "learning_automation_runtime_enablement_status_invalid" };
      }
      const timestamp = cleanString(input.createdAt || input.created_at) || clock().toISOString();
      const recordedAt = cleanString(input.recordedAt || input.recorded_at || input.approvedAt || input.approved_at) || timestamp;
      const collectionRunId = cleanString(input.collectionRunId || input.collection_run_id || input.runId || input.run_id);
      const enablementId = stableLearningAutomationRuntimeEnablementId(Object.assign({}, input, {
        workspaceId,
        learnerId,
        horizon,
        collectionRunId,
        status,
        recordedAt
      }));
      const existing = db.prepare("SELECT * FROM learning_growth_automation_runtime_enablements WHERE enablement_id = ?").get(enablementId);
      if (existing) return { ok: true, duplicate: true, enablement: publicAutomationRuntimeEnablement(existing) };
      insertDynamic(db, "learning_growth_automation_runtime_enablements", {
        enablement_id: enablementId,
        workspace_id: workspaceId,
        learner_id: learnerId,
        program_id: cleanString(input.programId || input.program_id),
        domain_pack_id: cleanString(input.domainPackId || input.domain_pack_id),
        domain: cleanString(input.domain),
        subject: cleanString(input.subject),
        horizon,
        collection_run_id: collectionRunId,
        status,
        enablement_version: cleanString(input.schemaVersion || input.schema_version || input.enablementVersion || input.enablement_version || RUNTIME_ENABLEMENT_SCHEMA) || RUNTIME_ENABLEMENT_SCHEMA,
        requested_activation_gates_json: jsonText(input.requestedActivationGates || input.requested_activation_gates || input.activationGates || input.activation_gates || []),
        required_config_keys_json: jsonText(input.requiredConfigKeys || input.required_config_keys || []),
        current_config_json: jsonText(input.currentConfig || input.current_config || {}),
        activation_summary_json: jsonText(input.activationSummary || input.activation_summary || {}),
        enablement_decision_json: jsonText(input.enablementDecision || input.enablement_decision || {}),
        evidence_summary_json: jsonText(input.evidenceSummary || input.evidence_summary || {}),
        note: boundedText(input.note || input.reason || input.summary, 720),
        requested_by: cleanString(input.requestedBy || input.requested_by),
        recorded_by: cleanString(input.recordedBy || input.recorded_by || input.approvedBy || input.approved_by || input.requestedBy || input.requested_by),
        recorded_at: recordedAt,
        privacy_class: privacyClass,
        created_at: timestamp,
        updated_at: cleanString(input.updatedAt || input.updated_at) || recordedAt
      });
      return {
        ok: true,
        duplicate: false,
        enablement: publicAutomationRuntimeEnablement(db.prepare("SELECT * FROM learning_growth_automation_runtime_enablements WHERE enablement_id = ?").get(enablementId))
      };
    });
  }

  function listEnablements(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_runtime_enablements")) return [];
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id);
      const programId = cleanString(input.programId || input.program_id);
      const domainPackId = cleanString(input.domainPackId || input.domain_pack_id);
      const domain = cleanString(input.domain);
      const subject = cleanString(input.subject);
      const horizon = cleanString(input.horizon);
      const collectionRunId = cleanString(input.collectionRunId || input.collection_run_id || input.runId || input.run_id);
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
      if (status) {
        where.push("status = ?");
        values.push(status);
      }
      const limit = Math.max(1, Math.min(100, Number(input.limit || 20) || 20));
      return db.prepare(`
        SELECT * FROM learning_growth_automation_runtime_enablements
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, enablement_id DESC
        LIMIT ?
      `).all(...values, limit).map(publicAutomationRuntimeEnablement).filter(Boolean);
    });
  }

  return {
    ensureSchema,
    listEnablements,
    saveEnablement
  };
}

module.exports = {
  RUNTIME_ENABLEMENT_SCHEMA,
  VALID_RUNTIME_ENABLEMENT_STATUSES,
  createLearningAutomationRuntimeEnablementRepository,
  ensureLearningAutomationRuntimeEnablementSchema,
  publicAutomationRuntimeEnablement
};
