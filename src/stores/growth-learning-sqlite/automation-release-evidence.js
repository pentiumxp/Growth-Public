"use strict";

const {
  cleanString,
  insertDynamic,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");
const { stableLearningAutomationReleaseEvidenceRecordId } = require("./identifiers");

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|access-key\.txt|launch-token)/i;

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function boundedText(value, max = 500) {
  const text = cleanString(value);
  return text.length > max ? text.slice(0, max) : text;
}

function scanPrivacy(value, path = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, `${path}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (typeof child === "string" && PRIVATE_VALUE_PATTERN.test(child)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacy(child, childPath, findings);
  }
  return findings;
}

function ensureLearningAutomationReleaseEvidenceSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_automation_release_evidence (
      evidence_record_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      domain_pack_id TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      horizon TEXT NOT NULL DEFAULT 'daily_plan',
      evidence_key TEXT NOT NULL,
      check_key TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pass',
      evidence_version TEXT NOT NULL DEFAULT 'growth.learningAutomationReleaseEvidenceRecord.v1',
      evidence_json TEXT NOT NULL DEFAULT '{}',
      note TEXT NOT NULL DEFAULT '',
      recorded_by TEXT NOT NULL DEFAULT '',
      observed_at TEXT NOT NULL,
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const columns = new Set(tableColumns(db, "learning_growth_automation_release_evidence"));
  [
    ["program_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain_pack_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain", "TEXT NOT NULL DEFAULT ''"],
    ["subject", "TEXT NOT NULL DEFAULT ''"],
    ["horizon", "TEXT NOT NULL DEFAULT 'daily_plan'"],
    ["check_key", "TEXT NOT NULL DEFAULT ''"],
    ["evidence_version", "TEXT NOT NULL DEFAULT 'growth.learningAutomationReleaseEvidenceRecord.v1'"],
    ["evidence_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["note", "TEXT NOT NULL DEFAULT ''"],
    ["recorded_by", "TEXT NOT NULL DEFAULT ''"],
    ["observed_at", "TEXT NOT NULL DEFAULT ''"]
  ].forEach(([name, definition]) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE learning_growth_automation_release_evidence ADD COLUMN ${name} ${definition}`);
  });
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_release_evidence_target
      ON learning_growth_automation_release_evidence(workspace_id, learner_id, evidence_key, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_release_evidence_scope
      ON learning_growth_automation_release_evidence(workspace_id, program_id, domain_pack_id, subject, horizon, updated_at);
  `);
}

function publicAutomationReleaseEvidence(row) {
  if (!row) return null;
  return {
    evidenceRecordId: cleanString(row.evidence_record_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    domainPackId: cleanString(row.domain_pack_id),
    domain: cleanString(row.domain),
    subject: cleanString(row.subject),
    horizon: cleanString(row.horizon),
    evidenceKey: cleanString(row.evidence_key),
    checkKey: cleanString(row.check_key),
    status: cleanString(row.status),
    evidenceVersion: cleanString(row.evidence_version),
    evidence: parseJson(row.evidence_json, {}) || {},
    note: cleanString(row.note),
    recordedBy: cleanString(row.recorded_by),
    observedAt: cleanString(row.observed_at),
    privacyClass: cleanString(row.privacy_class),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function createLearningAutomationReleaseEvidenceRepository({ open, now } = {}) {
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
      ensureLearningAutomationReleaseEvidenceSchema(db);
      return { ok: true, table: "learning_growth_automation_release_evidence" };
    });
  }

  function saveEvidence(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationReleaseEvidenceSchema(db);
      const privacyFindings = scanPrivacy(input);
      if (privacyFindings.length) {
        return { ok: false, error: "learning_automation_release_evidence_privacy_failed", privacyFindings };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
      const horizon = cleanString(input.horizon || "daily_plan") || "daily_plan";
      const evidenceKey = cleanString(input.evidenceKey || input.evidence_key || input.key);
      if (!workspaceId || !evidenceKey) return { ok: false, error: "learning_automation_release_evidence_scope_required" };
      const privacyClass = cleanString(input.privacyClass || input.privacy_class || "summary_only") || "summary_only";
      if (privacyClass !== "summary_only") {
        return { ok: false, error: "learning_automation_release_evidence_privacy_class_required" };
      }
      const status = cleanString(input.status || "pass").toLowerCase();
      if (!["pass", "missing", "blocked", "stale", "revoked", "superseded"].includes(status)) {
        return { ok: false, error: "learning_automation_release_evidence_status_invalid" };
      }
      const timestamp = cleanString(input.createdAt || input.created_at) || clock().toISOString();
      const observedAt = cleanString(input.observedAt || input.observed_at || input.recordedAt || input.recorded_at) || timestamp;
      const evidence = input.evidence || input.evidenceSummary || input.evidence_summary || {};
      const evidenceVersion = cleanString(input.evidenceVersion || input.evidence_version || "growth.learningAutomationReleaseEvidenceRecord.v1")
        || "growth.learningAutomationReleaseEvidenceRecord.v1";
      const evidenceRecordId = stableLearningAutomationReleaseEvidenceRecordId(Object.assign({}, input, {
        workspaceId,
        learnerId,
        horizon,
        evidenceKey,
        status,
        observedAt,
        evidence
      }));
      const existing = db.prepare("SELECT * FROM learning_growth_automation_release_evidence WHERE evidence_record_id = ?").get(evidenceRecordId);
      if (existing) return { ok: true, duplicate: true, evidence: publicAutomationReleaseEvidence(existing) };
      insertDynamic(db, "learning_growth_automation_release_evidence", {
        evidence_record_id: evidenceRecordId,
        workspace_id: workspaceId,
        learner_id: learnerId,
        program_id: cleanString(input.programId || input.program_id),
        domain_pack_id: cleanString(input.domainPackId || input.domain_pack_id),
        domain: cleanString(input.domain),
        subject: cleanString(input.subject),
        horizon,
        evidence_key: evidenceKey,
        check_key: cleanString(input.checkKey || input.check_key),
        status,
        evidence_version: evidenceVersion,
        evidence_json: jsonText(evidence),
        note: boundedText(input.note || input.reason || input.summary, 500),
        recorded_by: cleanString(input.recordedBy || input.recorded_by || input.requestedBy || input.requested_by),
        observed_at: observedAt,
        privacy_class: privacyClass,
        created_at: timestamp,
        updated_at: cleanString(input.updatedAt || input.updated_at) || observedAt
      });
      return {
        ok: true,
        duplicate: false,
        evidence: publicAutomationReleaseEvidence(db.prepare("SELECT * FROM learning_growth_automation_release_evidence WHERE evidence_record_id = ?").get(evidenceRecordId))
      };
    });
  }

  function listEvidence(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_release_evidence")) return [];
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id);
      const programId = cleanString(input.programId || input.program_id);
      const domainPackId = cleanString(input.domainPackId || input.domain_pack_id);
      const domain = cleanString(input.domain);
      const subject = cleanString(input.subject);
      const horizon = cleanString(input.horizon);
      const evidenceKey = cleanString(input.evidenceKey || input.evidence_key || input.key);
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
      if (evidenceKey) {
        where.push("evidence_key = ?");
        values.push(evidenceKey);
      }
      if (status) {
        where.push("status = ?");
        values.push(status);
      }
      const limit = Math.max(1, Math.min(100, Number(input.limit || 20) || 20));
      return db.prepare(`
        SELECT * FROM learning_growth_automation_release_evidence
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, evidence_record_id DESC
        LIMIT ?
      `).all(...values, limit).map(publicAutomationReleaseEvidence).filter(Boolean);
    });
  }

  return {
    ensureSchema,
    listEvidence,
    saveEvidence
  };
}

module.exports = {
  createLearningAutomationReleaseEvidenceRepository,
  ensureLearningAutomationReleaseEvidenceSchema,
  publicAutomationReleaseEvidence
};
