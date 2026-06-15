"use strict";

const {
  asArray,
  cleanString,
  insertDynamic,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");
const { stableLearningAutomationReleaseReadinessId } = require("./identifiers");

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|access-key\.txt|launch-token)/i;

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function boundedText(value, max = 360) {
  const text = cleanString(value);
  return text.length > max ? text.slice(0, max) : text;
}

function scanPrivacyKeys(value, path = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacyKeys(item, `${path}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (typeof child === "string" && PRIVATE_VALUE_PATTERN.test(child)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacyKeys(child, childPath, findings);
  }
  return findings;
}

function ensureLearningAutomationReleaseReadinessSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_automation_release_readiness (
      readiness_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      domain_pack_id TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      horizon TEXT NOT NULL DEFAULT 'daily_plan',
      status TEXT NOT NULL DEFAULT 'blocked',
      readiness_version TEXT NOT NULL DEFAULT 'growth.learningAutomationReleaseReadiness.v1',
      checks_json TEXT NOT NULL DEFAULT '[]',
      evidence_json TEXT NOT NULL DEFAULT '{}',
      evidence_readback_json TEXT NOT NULL DEFAULT '{}',
      config_json TEXT NOT NULL DEFAULT '{}',
      summary_json TEXT NOT NULL DEFAULT '{}',
      release_review_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL DEFAULT '',
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const columns = new Set(tableColumns(db, "learning_growth_automation_release_readiness"));
  [
    ["program_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain_pack_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain", "TEXT NOT NULL DEFAULT ''"],
    ["subject", "TEXT NOT NULL DEFAULT ''"],
    ["horizon", "TEXT NOT NULL DEFAULT 'daily_plan'"],
    ["readiness_version", "TEXT NOT NULL DEFAULT 'growth.learningAutomationReleaseReadiness.v1'"],
    ["checks_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["evidence_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["evidence_readback_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["config_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["summary_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["release_review_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["created_by", "TEXT NOT NULL DEFAULT ''"]
  ].forEach(([name, definition]) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE learning_growth_automation_release_readiness ADD COLUMN ${name} ${definition}`);
  });
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_release_readiness_target
      ON learning_growth_automation_release_readiness(workspace_id, learner_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_release_readiness_scope
      ON learning_growth_automation_release_readiness(workspace_id, program_id, domain_pack_id, subject, horizon, updated_at);
  `);
}

function publicAutomationReleaseReadiness(row) {
  if (!row) return null;
  return {
    readinessId: cleanString(row.readiness_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    domainPackId: cleanString(row.domain_pack_id),
    domain: cleanString(row.domain),
    subject: cleanString(row.subject),
    horizon: cleanString(row.horizon),
    status: cleanString(row.status),
    readinessVersion: cleanString(row.readiness_version),
    checks: asArray(parseJson(row.checks_json, []) || []),
    evidence: parseJson(row.evidence_json, {}) || {},
    evidenceReadback: parseJson(row.evidence_readback_json, {}) || {},
    config: parseJson(row.config_json, {}) || {},
    summary: parseJson(row.summary_json, {}) || {},
    releaseReview: parseJson(row.release_review_json, {}) || {},
    createdBy: cleanString(row.created_by),
    privacyClass: cleanString(row.privacy_class),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function createLearningAutomationReleaseReadinessRepository({ open, now } = {}) {
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
      ensureLearningAutomationReleaseReadinessSchema(db);
      return { ok: true, table: "learning_growth_automation_release_readiness" };
    });
  }

  function saveSnapshot(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationReleaseReadinessSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      if (privacyFindings.length) {
        return { ok: false, error: "learning_automation_release_readiness_privacy_failed", privacyFindings };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
      const horizon = cleanString(input.horizon || "daily_plan") || "daily_plan";
      if (!workspaceId) return { ok: false, error: "learning_automation_release_readiness_scope_required" };
      const privacyClass = cleanString(input.privacyClass || input.privacy_class || "summary_only") || "summary_only";
      if (privacyClass !== "summary_only") {
        return { ok: false, error: "learning_automation_release_readiness_privacy_class_required" };
      }
      const status = cleanString(input.status || "blocked").toLowerCase();
      if (!["ready_for_release_review", "blocked", "incomplete"].includes(status)) {
        return { ok: false, error: "learning_automation_release_readiness_status_invalid" };
      }
      const checks = asArray(input.checks);
      const timestamp = cleanString(input.createdAt || input.created_at) || clock().toISOString();
      const readinessId = stableLearningAutomationReleaseReadinessId(Object.assign({}, input, {
        workspaceId,
        learnerId,
        horizon,
        status,
        createdAt: timestamp,
        checkKeys: checks.map((check = {}) => `${cleanString(check.key)}:${cleanString(check.status)}`)
      }));
      const existing = db.prepare("SELECT * FROM learning_growth_automation_release_readiness WHERE readiness_id = ?").get(readinessId);
      if (existing) return { ok: true, duplicate: true, snapshot: publicAutomationReleaseReadiness(existing) };
      insertDynamic(db, "learning_growth_automation_release_readiness", {
        readiness_id: readinessId,
        workspace_id: workspaceId,
        learner_id: learnerId,
        program_id: cleanString(input.programId || input.program_id),
        domain_pack_id: cleanString(input.domainPackId || input.domain_pack_id),
        domain: cleanString(input.domain),
        subject: cleanString(input.subject),
        horizon,
        status,
        readiness_version: cleanString(input.readinessVersion || input.readiness_version || "growth.learningAutomationReleaseReadiness.v1")
          || "growth.learningAutomationReleaseReadiness.v1",
        checks_json: jsonText(checks),
        evidence_json: jsonText(input.evidence || {}),
        evidence_readback_json: jsonText(input.evidenceReadback || input.evidence_readback || {}),
        config_json: jsonText(input.config || {}),
        summary_json: jsonText(input.summary || {}),
        release_review_json: jsonText(input.releaseReview || input.release_review || {}),
        created_by: cleanString(input.createdBy || input.created_by || input.requestedBy || input.requested_by),
        privacy_class: privacyClass,
        created_at: timestamp,
        updated_at: cleanString(input.updatedAt || input.updated_at) || timestamp
      });
      return {
        ok: true,
        duplicate: false,
        snapshot: publicAutomationReleaseReadiness(db.prepare("SELECT * FROM learning_growth_automation_release_readiness WHERE readiness_id = ?").get(readinessId))
      };
    });
  }

  function listSnapshots(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_release_readiness")) return [];
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
        SELECT * FROM learning_growth_automation_release_readiness
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, readiness_id DESC
        LIMIT ?
      `).all(...values, limit).map(publicAutomationReleaseReadiness).filter(Boolean);
    });
  }

  return {
    ensureSchema,
    listSnapshots,
    saveSnapshot
  };
}

module.exports = {
  createLearningAutomationReleaseReadinessRepository,
  ensureLearningAutomationReleaseReadinessSchema,
  publicAutomationReleaseReadiness
};
