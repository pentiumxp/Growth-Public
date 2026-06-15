"use strict";

const {
  cleanString,
  insertDynamic,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");
const { stableLearningAutomationReleaseApprovalId } = require("./identifiers");

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;

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
    if (child && typeof child === "object") scanPrivacyKeys(child, childPath, findings);
  }
  return findings;
}

function ensureLearningAutomationReleaseApprovalSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_automation_release_approvals (
      approval_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      domain_pack_id TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      horizon TEXT NOT NULL DEFAULT 'daily_plan',
      approval_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      approval_version TEXT NOT NULL DEFAULT 'growth.learningAutomationReleaseApproval.v1',
      approval_json TEXT NOT NULL DEFAULT '{}',
      evidence_json TEXT NOT NULL DEFAULT '{}',
      note TEXT NOT NULL DEFAULT '',
      approved_by TEXT NOT NULL DEFAULT '',
      approved_at TEXT NOT NULL DEFAULT '',
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const columns = new Set(tableColumns(db, "learning_growth_automation_release_approvals"));
  [
    ["domain_pack_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain", "TEXT NOT NULL DEFAULT ''"],
    ["subject", "TEXT NOT NULL DEFAULT ''"],
    ["horizon", "TEXT NOT NULL DEFAULT 'daily_plan'"],
    ["approval_key", "TEXT NOT NULL DEFAULT ''"],
    ["approval_version", "TEXT NOT NULL DEFAULT 'growth.learningAutomationReleaseApproval.v1'"],
    ["approval_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["evidence_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["note", "TEXT NOT NULL DEFAULT ''"],
    ["approved_by", "TEXT NOT NULL DEFAULT ''"],
    ["approved_at", "TEXT NOT NULL DEFAULT ''"]
  ].forEach(([name, definition]) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE learning_growth_automation_release_approvals ADD COLUMN ${name} ${definition}`);
  });
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_release_approvals_target
      ON learning_growth_automation_release_approvals(workspace_id, learner_id, approval_key, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_release_approvals_scope
      ON learning_growth_automation_release_approvals(workspace_id, program_id, domain_pack_id, subject, horizon, approval_key, status, updated_at);
  `);
}

function publicAutomationReleaseApproval(row) {
  if (!row) return null;
  return {
    approvalId: cleanString(row.approval_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    domainPackId: cleanString(row.domain_pack_id),
    domain: cleanString(row.domain),
    subject: cleanString(row.subject),
    horizon: cleanString(row.horizon),
    approvalKey: cleanString(row.approval_key),
    status: cleanString(row.status),
    approvalVersion: cleanString(row.approval_version),
    approval: parseJson(row.approval_json, {}) || {},
    evidence: parseJson(row.evidence_json, {}) || {},
    note: cleanString(row.note),
    approvedBy: cleanString(row.approved_by),
    approvedAt: cleanString(row.approved_at),
    privacyClass: cleanString(row.privacy_class),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function createLearningAutomationReleaseApprovalRepository({ open, now } = {}) {
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
      ensureLearningAutomationReleaseApprovalSchema(db);
      return { ok: true, table: "learning_growth_automation_release_approvals" };
    });
  }

  function saveApproval(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationReleaseApprovalSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      if (privacyFindings.length) {
        return { ok: false, error: "learning_automation_release_approval_privacy_failed", privacyFindings };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
      const horizon = cleanString(input.horizon || "daily_plan") || "daily_plan";
      const approvalKey = cleanString(input.approvalKey || input.approval_key || input.configGate || input.config_gate);
      if (!workspaceId || !approvalKey) return { ok: false, error: "learning_automation_release_approval_scope_required" };
      const privacyClass = cleanString(input.privacyClass || input.privacy_class || "summary_only") || "summary_only";
      if (privacyClass !== "summary_only") {
        return { ok: false, error: "learning_automation_release_approval_privacy_class_required" };
      }
      const status = cleanString(input.status || "approved").toLowerCase();
      if (!["approved", "revoked", "expired", "superseded"].includes(status)) {
        return { ok: false, error: "learning_automation_release_approval_status_invalid" };
      }
      const approvalVersion = cleanString(input.approvalVersion || input.approval_version || "growth.learningAutomationReleaseApproval.v1")
        || "growth.learningAutomationReleaseApproval.v1";
      const approvalId = stableLearningAutomationReleaseApprovalId(Object.assign({}, input, {
        workspaceId,
        learnerId,
        horizon,
        approvalKey,
        approvalVersion
      }));
      const existing = db.prepare("SELECT * FROM learning_growth_automation_release_approvals WHERE approval_id = ?").get(approvalId);
      if (existing) return { ok: true, duplicate: true, approval: publicAutomationReleaseApproval(existing) };
      const timestamp = cleanString(input.createdAt || input.created_at) || clock().toISOString();
      const approvedAt = cleanString(input.approvedAt || input.approved_at) || timestamp;
      insertDynamic(db, "learning_growth_automation_release_approvals", {
        approval_id: approvalId,
        workspace_id: workspaceId,
        learner_id: learnerId,
        program_id: cleanString(input.programId || input.program_id),
        domain_pack_id: cleanString(input.domainPackId || input.domain_pack_id),
        domain: cleanString(input.domain),
        subject: cleanString(input.subject),
        horizon,
        approval_key: approvalKey,
        status,
        approval_version: approvalVersion,
        approval_json: jsonText(input.approval || {}),
        evidence_json: jsonText(input.evidence || {}),
        note: boundedText(input.note || input.reason || input.summary, 360),
        approved_by: cleanString(input.approvedBy || input.approved_by || input.requestedBy || input.requested_by),
        approved_at: approvedAt,
        privacy_class: privacyClass,
        created_at: timestamp,
        updated_at: cleanString(input.updatedAt || input.updated_at) || approvedAt
      });
      return {
        ok: true,
        duplicate: false,
        approval: publicAutomationReleaseApproval(db.prepare("SELECT * FROM learning_growth_automation_release_approvals WHERE approval_id = ?").get(approvalId))
      };
    });
  }

  function listApprovals(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_release_approvals")) return [];
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id);
      const programId = cleanString(input.programId || input.program_id);
      const domainPackId = cleanString(input.domainPackId || input.domain_pack_id);
      const domain = cleanString(input.domain);
      const subject = cleanString(input.subject);
      const horizon = cleanString(input.horizon);
      const approvalKey = cleanString(input.approvalKey || input.approval_key || input.configGate || input.config_gate);
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
      if (approvalKey) {
        where.push("approval_key = ?");
        values.push(approvalKey);
      }
      if (status) {
        where.push("status = ?");
        values.push(status);
      }
      const limit = Math.max(1, Math.min(100, Number(input.limit || 20) || 20));
      return db.prepare(`
        SELECT * FROM learning_growth_automation_release_approvals
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, approval_id DESC
        LIMIT ?
      `).all(...values, limit).map(publicAutomationReleaseApproval).filter(Boolean);
    });
  }

  return {
    ensureSchema,
    listApprovals,
    saveApproval
  };
}

module.exports = {
  createLearningAutomationReleaseApprovalRepository,
  ensureLearningAutomationReleaseApprovalSchema,
  publicAutomationReleaseApproval
};
