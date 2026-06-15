"use strict";

const {
  asArray,
  cleanString,
  insertDynamic,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");
const { stableLearningAutomationReleaseCollectionRunId } = require("./identifiers");

const RELEASE_COLLECTION_RUN_SCHEMA = "growth.learningAutomationReleaseCollectionRun.v1";
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization|localstorage|sessionstorage|cookie.*jar)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|Bearer\s+|X-Hermes-Web-Key|X-Hermes-Access-Key|access-key\.txt|launch-token|Authorization:)/i;

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
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

function ensureLearningAutomationReleaseCollectionRunSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_automation_release_collection_runs (
      run_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      domain_pack_id TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      horizon TEXT NOT NULL DEFAULT 'daily_plan',
      status TEXT NOT NULL DEFAULT 'blocked',
      run_version TEXT NOT NULL DEFAULT '${RELEASE_COLLECTION_RUN_SCHEMA}',
      bundle_summary_json TEXT NOT NULL DEFAULT '{}',
      audit_summary_json TEXT NOT NULL DEFAULT '{}',
      readiness_summary_json TEXT NOT NULL DEFAULT '{}',
      evidence_summary_json TEXT NOT NULL DEFAULT '{}',
      release_review_json TEXT NOT NULL DEFAULT '{}',
      summary_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL DEFAULT '',
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const columns = new Set(tableColumns(db, "learning_growth_automation_release_collection_runs"));
  [
    ["program_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain_pack_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain", "TEXT NOT NULL DEFAULT ''"],
    ["subject", "TEXT NOT NULL DEFAULT ''"],
    ["horizon", "TEXT NOT NULL DEFAULT 'daily_plan'"],
    ["run_version", `TEXT NOT NULL DEFAULT '${RELEASE_COLLECTION_RUN_SCHEMA}'`],
    ["bundle_summary_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["audit_summary_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["readiness_summary_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["evidence_summary_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["release_review_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["summary_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["created_by", "TEXT NOT NULL DEFAULT ''"]
  ].forEach(([name, definition]) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE learning_growth_automation_release_collection_runs ADD COLUMN ${name} ${definition}`);
  });
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_release_collection_runs_target
      ON learning_growth_automation_release_collection_runs(workspace_id, learner_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_release_collection_runs_scope
      ON learning_growth_automation_release_collection_runs(workspace_id, program_id, domain_pack_id, subject, horizon, updated_at);
  `);
}

function publicAutomationReleaseCollectionRun(row) {
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
    status: cleanString(row.status),
    runVersion: cleanString(row.run_version),
    bundleSummary: parseJson(row.bundle_summary_json, {}) || {},
    auditSummary: parseJson(row.audit_summary_json, {}) || {},
    readinessSummary: parseJson(row.readiness_summary_json, {}) || {},
    evidenceSummary: parseJson(row.evidence_summary_json, {}) || {},
    releaseReview: parseJson(row.release_review_json, {}) || {},
    summary: parseJson(row.summary_json, {}) || {},
    createdBy: cleanString(row.created_by),
    privacyClass: cleanString(row.privacy_class),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function createLearningAutomationReleaseCollectionRunRepository({ open, now } = {}) {
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
      ensureLearningAutomationReleaseCollectionRunSchema(db);
      return { ok: true, table: "learning_growth_automation_release_collection_runs" };
    });
  }

  function saveRun(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationReleaseCollectionRunSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      const privateValueFindings = scanPrivateValues(input);
      if (privacyFindings.length || privateValueFindings.length) {
        return {
          ok: false,
          error: "learning_automation_release_collection_run_privacy_failed",
          privacyFindings,
          privateValueFindings
        };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
      const horizon = cleanString(input.horizon || "daily_plan") || "daily_plan";
      if (!workspaceId) return { ok: false, error: "learning_automation_release_collection_run_scope_required" };
      const privacyClass = cleanString(input.privacyClass || input.privacy_class || "summary_only") || "summary_only";
      if (privacyClass !== "summary_only" || input.summaryOnly !== true) {
        return { ok: false, error: "learning_automation_release_collection_run_privacy_class_required" };
      }
      const status = cleanString(input.status || "blocked").toLowerCase();
      if (![ "ready_for_release_review", "blocked", "incomplete" ].includes(status)) {
        return { ok: false, error: "learning_automation_release_collection_run_status_invalid" };
      }
      const timestamp = cleanString(input.createdAt || input.created_at) || clock().toISOString();
      const runId = stableLearningAutomationReleaseCollectionRunId(Object.assign({}, input, {
        workspaceId,
        learnerId,
        horizon,
        status,
        createdAt: timestamp
      }));
      const existing = db.prepare("SELECT * FROM learning_growth_automation_release_collection_runs WHERE run_id = ?").get(runId);
      if (existing) return { ok: true, duplicate: true, run: publicAutomationReleaseCollectionRun(existing) };
      insertDynamic(db, "learning_growth_automation_release_collection_runs", {
        run_id: runId,
        workspace_id: workspaceId,
        learner_id: learnerId,
        program_id: cleanString(input.programId || input.program_id),
        domain_pack_id: cleanString(input.domainPackId || input.domain_pack_id),
        domain: cleanString(input.domain),
        subject: cleanString(input.subject),
        horizon,
        status,
        run_version: cleanString(input.schemaVersion || input.schema_version || input.runVersion || input.run_version || RELEASE_COLLECTION_RUN_SCHEMA) || RELEASE_COLLECTION_RUN_SCHEMA,
        bundle_summary_json: jsonText(input.bundleSummary || input.bundle_summary || {}),
        audit_summary_json: jsonText(input.auditSummary || input.audit_summary || {}),
        readiness_summary_json: jsonText(input.readinessSummary || input.readiness_summary || {}),
        evidence_summary_json: jsonText(input.evidenceSummary || input.evidence_summary || {}),
        release_review_json: jsonText(input.releaseReview || input.release_review || {}),
        summary_json: jsonText(input.summary || {}),
        created_by: cleanString(input.createdBy || input.created_by || input.requestedBy || input.requested_by),
        privacy_class: privacyClass,
        created_at: timestamp,
        updated_at: cleanString(input.updatedAt || input.updated_at) || timestamp
      });
      return {
        ok: true,
        duplicate: false,
        run: publicAutomationReleaseCollectionRun(db.prepare("SELECT * FROM learning_growth_automation_release_collection_runs WHERE run_id = ?").get(runId))
      };
    });
  }

  function listRuns(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_release_collection_runs")) return [];
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id);
      const programId = cleanString(input.programId || input.program_id);
      const domainPackId = cleanString(input.domainPackId || input.domain_pack_id);
      const domain = cleanString(input.domain);
      const subject = cleanString(input.subject);
      const horizon = cleanString(input.horizon);
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
      if (status) {
        where.push("status = ?");
        values.push(status);
      }
      const limit = Math.max(1, Math.min(100, Number(input.limit || 20) || 20));
      return db.prepare(`
        SELECT * FROM learning_growth_automation_release_collection_runs
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, run_id DESC
        LIMIT ?
      `).all(...values, limit).map(publicAutomationReleaseCollectionRun).filter(Boolean);
    });
  }

  return {
    ensureSchema,
    listRuns,
    saveRun
  };
}

module.exports = {
  createLearningAutomationReleaseCollectionRunRepository,
  ensureLearningAutomationReleaseCollectionRunSchema,
  publicAutomationReleaseCollectionRun
};
