"use strict";

const {
  cleanString,
  insertDynamic,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");
const { stableLearningAutomationReleaseActivationId } = require("./identifiers");

const RELEASE_ACTIVATION_SCHEMA = "growth.learningAutomationReleaseActivation.v1";
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization|localstorage|sessionstorage|cookie.*jar)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|Bearer\s+|X-Hermes-Web-Key|X-Hermes-Access-Key|access-key\.txt|launch-token|Authorization:)/i;
const VALID_ACTIVATION_STATUSES = Object.freeze([
  "ready_for_owner_config_enablement",
  "already_enabled",
  "approval_required",
  "blocked",
  "incomplete",
  "needs_evidence",
  "collection_run_required",
  "collection_run_incomplete",
  "owner_decision_required",
  "ready_for_owner_decision",
  "ready_for_owner_release_activation",
  "authorization_blocked",
  "release_review_incomplete"
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

function ensureLearningAutomationReleaseActivationSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_automation_release_activations (
      activation_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      domain_pack_id TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      horizon TEXT NOT NULL DEFAULT 'daily_plan',
      collection_run_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'blocked',
      activation_version TEXT NOT NULL DEFAULT '${RELEASE_ACTIVATION_SCHEMA}',
      requested_activation_gates_json TEXT NOT NULL DEFAULT '[]',
      required_approval_keys_json TEXT NOT NULL DEFAULT '[]',
      missing_approval_keys_json TEXT NOT NULL DEFAULT '[]',
      release_closure_json TEXT NOT NULL DEFAULT '{}',
      activation_gates_json TEXT NOT NULL DEFAULT '[]',
      activation_preflight_json TEXT NOT NULL DEFAULT '{}',
      activation_decision_json TEXT NOT NULL DEFAULT '{}',
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
  const columns = new Set(tableColumns(db, "learning_growth_automation_release_activations"));
  [
    ["program_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain_pack_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain", "TEXT NOT NULL DEFAULT ''"],
    ["subject", "TEXT NOT NULL DEFAULT ''"],
    ["horizon", "TEXT NOT NULL DEFAULT 'daily_plan'"],
    ["collection_run_id", "TEXT NOT NULL DEFAULT ''"],
    ["activation_version", `TEXT NOT NULL DEFAULT '${RELEASE_ACTIVATION_SCHEMA}'`],
    ["requested_activation_gates_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["required_approval_keys_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["missing_approval_keys_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["release_closure_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["activation_gates_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["activation_preflight_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["activation_decision_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["evidence_summary_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["note", "TEXT NOT NULL DEFAULT ''"],
    ["requested_by", "TEXT NOT NULL DEFAULT ''"],
    ["recorded_by", "TEXT NOT NULL DEFAULT ''"],
    ["recorded_at", "TEXT NOT NULL DEFAULT ''"]
  ].forEach(([name, definition]) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE learning_growth_automation_release_activations ADD COLUMN ${name} ${definition}`);
  });
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_release_activations_target
      ON learning_growth_automation_release_activations(workspace_id, learner_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_release_activations_scope
      ON learning_growth_automation_release_activations(workspace_id, program_id, domain_pack_id, subject, horizon, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_release_activations_run
      ON learning_growth_automation_release_activations(workspace_id, collection_run_id, status, updated_at);
  `);
}

function publicAutomationReleaseActivation(row) {
  if (!row) return null;
  return {
    activationId: cleanString(row.activation_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    domainPackId: cleanString(row.domain_pack_id),
    domain: cleanString(row.domain),
    subject: cleanString(row.subject),
    horizon: cleanString(row.horizon),
    collectionRunId: cleanString(row.collection_run_id),
    status: cleanString(row.status),
    activationVersion: cleanString(row.activation_version),
    requestedActivationGates: parseJson(row.requested_activation_gates_json, []) || [],
    requiredApprovalKeys: parseJson(row.required_approval_keys_json, []) || [],
    missingApprovalKeys: parseJson(row.missing_approval_keys_json, []) || [],
    releaseClosure: parseJson(row.release_closure_json, {}) || {},
    activationGates: parseJson(row.activation_gates_json, []) || [],
    activationPreflight: parseJson(row.activation_preflight_json, {}) || {},
    activationDecision: parseJson(row.activation_decision_json, {}) || {},
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

function createLearningAutomationReleaseActivationRepository({ open, now } = {}) {
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
      ensureLearningAutomationReleaseActivationSchema(db);
      return { ok: true, table: "learning_growth_automation_release_activations" };
    });
  }

  function saveActivation(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationReleaseActivationSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      const privateValueFindings = scanPrivateValues(input);
      if (privacyFindings.length || privateValueFindings.length) {
        return {
          ok: false,
          error: "learning_automation_release_activation_privacy_failed",
          privacyFindings,
          privateValueFindings
        };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
      const horizon = cleanString(input.horizon || "daily_plan") || "daily_plan";
      if (!workspaceId) return { ok: false, error: "learning_automation_release_activation_scope_required" };
      const privacyClass = cleanString(input.privacyClass || input.privacy_class || "summary_only") || "summary_only";
      if (privacyClass !== "summary_only" || input.summaryOnly !== true) {
        return { ok: false, error: "learning_automation_release_activation_privacy_class_required" };
      }
      if (input.configChangeApplied === true || input.runtimeConfigChange === true || input.writefulSchedulingAllowed === true) {
        return { ok: false, error: "learning_automation_release_activation_no_runtime_change_required" };
      }
      const activationPreflight = input.activationPreflight || input.activation_preflight || {};
      if (activationPreflight.configChangeApplied === true || activationPreflight.runtimeConfigChange === true || activationPreflight.writefulSchedulingAllowed === true) {
        return { ok: false, error: "learning_automation_release_activation_no_runtime_change_required" };
      }
      const status = cleanString(input.status || input.activationStatus || input.activation_status || "blocked").toLowerCase();
      if (!VALID_ACTIVATION_STATUSES.includes(status)) {
        return { ok: false, error: "learning_automation_release_activation_status_invalid" };
      }
      const timestamp = cleanString(input.createdAt || input.created_at) || clock().toISOString();
      const recordedAt = cleanString(input.recordedAt || input.recorded_at || input.approvedAt || input.approved_at) || timestamp;
      const collectionRunId = cleanString(input.collectionRunId || input.collection_run_id || input.runId || input.run_id);
      const activationId = stableLearningAutomationReleaseActivationId(Object.assign({}, input, {
        workspaceId,
        learnerId,
        horizon,
        collectionRunId,
        status,
        recordedAt
      }));
      const existing = db.prepare("SELECT * FROM learning_growth_automation_release_activations WHERE activation_id = ?").get(activationId);
      if (existing) return { ok: true, duplicate: true, activation: publicAutomationReleaseActivation(existing) };
      insertDynamic(db, "learning_growth_automation_release_activations", {
        activation_id: activationId,
        workspace_id: workspaceId,
        learner_id: learnerId,
        program_id: cleanString(input.programId || input.program_id),
        domain_pack_id: cleanString(input.domainPackId || input.domain_pack_id),
        domain: cleanString(input.domain),
        subject: cleanString(input.subject),
        horizon,
        collection_run_id: collectionRunId,
        status,
        activation_version: cleanString(input.schemaVersion || input.schema_version || input.activationVersion || input.activation_version || RELEASE_ACTIVATION_SCHEMA) || RELEASE_ACTIVATION_SCHEMA,
        requested_activation_gates_json: jsonText(input.requestedActivationGates || input.requested_activation_gates || input.activationGates || input.activation_gates || []),
        required_approval_keys_json: jsonText(input.requiredApprovalKeys || input.required_approval_keys || []),
        missing_approval_keys_json: jsonText(input.missingApprovalKeys || input.missing_approval_keys || []),
        release_closure_json: jsonText(input.releaseClosure || input.release_closure || {}),
        activation_gates_json: jsonText(input.activationGates || input.activation_gates || []),
        activation_preflight_json: jsonText(activationPreflight),
        activation_decision_json: jsonText(input.activationDecision || input.activation_decision || {}),
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
        activation: publicAutomationReleaseActivation(db.prepare("SELECT * FROM learning_growth_automation_release_activations WHERE activation_id = ?").get(activationId))
      };
    });
  }

  function listActivations(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_release_activations")) return [];
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
        SELECT * FROM learning_growth_automation_release_activations
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, activation_id DESC
        LIMIT ?
      `).all(...values, limit).map(publicAutomationReleaseActivation).filter(Boolean);
    });
  }

  return {
    ensureSchema,
    listActivations,
    saveActivation
  };
}

module.exports = {
  RELEASE_ACTIVATION_SCHEMA,
  VALID_ACTIVATION_STATUSES,
  createLearningAutomationReleaseActivationRepository,
  ensureLearningAutomationReleaseActivationSchema,
  publicAutomationReleaseActivation
};
