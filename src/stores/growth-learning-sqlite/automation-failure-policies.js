"use strict";

const {
  asArray,
  cleanString,
  insertDynamic,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");
const { stableLearningAutomationFailurePolicyId } = require("./identifiers");

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body)/i;

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function boundedText(value, max = 360) {
  const text = cleanString(value);
  return text.length > max ? text.slice(0, max) : text;
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
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

function ensureLearningAutomationFailurePolicySchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_automation_failure_policies (
      policy_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      domain_pack_id TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      horizon TEXT NOT NULL DEFAULT 'daily_plan',
      status TEXT NOT NULL DEFAULT 'draft',
      policy_version TEXT NOT NULL DEFAULT 'growth.learningAutomationFailurePolicy.v1',
      policy_json TEXT NOT NULL DEFAULT '{}',
      rollback_json TEXT NOT NULL DEFAULT '{}',
      failure_json TEXT NOT NULL DEFAULT '{}',
      review_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL DEFAULT '',
      reviewed_by TEXT NOT NULL DEFAULT '',
      reviewed_at TEXT NOT NULL DEFAULT '',
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_failure_policies_target
      ON learning_growth_automation_failure_policies(workspace_id, learner_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_failure_policies_scope
      ON learning_growth_automation_failure_policies(workspace_id, program_id, domain_pack_id, subject, horizon, status, updated_at);
  `);
  const columns = new Set(tableColumns(db, "learning_growth_automation_failure_policies"));
  [
    ["review_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["reviewed_by", "TEXT NOT NULL DEFAULT ''"],
    ["reviewed_at", "TEXT NOT NULL DEFAULT ''"],
    ["policy_version", "TEXT NOT NULL DEFAULT 'growth.learningAutomationFailurePolicy.v1'"]
  ].forEach(([name, definition]) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE learning_growth_automation_failure_policies ADD COLUMN ${name} ${definition}`);
  });
}

function publicAutomationFailurePolicy(row) {
  if (!row) return null;
  return {
    policyId: cleanString(row.policy_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    domainPackId: cleanString(row.domain_pack_id),
    domain: cleanString(row.domain),
    subject: cleanString(row.subject),
    horizon: cleanString(row.horizon),
    status: cleanString(row.status),
    policyVersion: cleanString(row.policy_version),
    policy: parseJson(row.policy_json, {}) || {},
    rollbackPolicy: parseJson(row.rollback_json, {}) || {},
    failurePolicy: parseJson(row.failure_json, {}) || {},
    review: parseJson(row.review_json, {}) || {},
    createdBy: cleanString(row.created_by),
    reviewedBy: cleanString(row.reviewed_by),
    reviewedAt: cleanString(row.reviewed_at),
    privacyClass: cleanString(row.privacy_class),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function createLearningAutomationFailurePolicyRepository({ open, now } = {}) {
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
      ensureLearningAutomationFailurePolicySchema(db);
      return { ok: true, table: "learning_growth_automation_failure_policies" };
    });
  }

  function savePolicy(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationFailurePolicySchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      if (privacyFindings.length) {
        return { ok: false, error: "learning_automation_failure_policy_privacy_failed", privacyFindings };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
      const horizon = cleanString(input.horizon || "daily_plan") || "daily_plan";
      if (!workspaceId || !horizon) {
        return { ok: false, error: "learning_automation_failure_policy_scope_required" };
      }
      const privacyClass = cleanString(input.privacyClass || input.privacy_class || "summary_only") || "summary_only";
      if (privacyClass !== "summary_only") {
        return { ok: false, error: "learning_automation_failure_policy_privacy_class_required" };
      }
      const policyVersion = cleanString(input.policyVersion || input.policy_version || "growth.learningAutomationFailurePolicy.v1")
        || "growth.learningAutomationFailurePolicy.v1";
      const policyId = stableLearningAutomationFailurePolicyId(Object.assign({}, input, {
        workspaceId,
        learnerId,
        horizon,
        policyVersion
      }));
      const existing = db.prepare("SELECT * FROM learning_growth_automation_failure_policies WHERE policy_id = ?").get(policyId);
      if (existing) return { ok: true, duplicate: true, policy: publicAutomationFailurePolicy(existing) };
      const timestamp = cleanString(input.createdAt || input.created_at) || clock().toISOString();
      insertDynamic(db, "learning_growth_automation_failure_policies", {
        policy_id: policyId,
        workspace_id: workspaceId,
        learner_id: learnerId,
        program_id: cleanString(input.programId || input.program_id),
        domain_pack_id: cleanString(input.domainPackId || input.domain_pack_id),
        domain: cleanString(input.domain),
        subject: cleanString(input.subject),
        horizon,
        status: cleanString(input.status || "draft") || "draft",
        policy_version: policyVersion,
        policy_json: jsonText(input.policy || {}),
        rollback_json: jsonText(input.rollbackPolicy || input.rollback_policy || input.rollback || {}),
        failure_json: jsonText(input.failurePolicy || input.failure_policy || input.failure || {}),
        review_json: jsonText(input.review || {}),
        created_by: cleanString(input.createdBy || input.created_by),
        reviewed_by: cleanString(input.reviewedBy || input.reviewed_by),
        reviewed_at: cleanString(input.reviewedAt || input.reviewed_at),
        privacy_class: privacyClass,
        created_at: timestamp,
        updated_at: cleanString(input.updatedAt || input.updated_at) || timestamp
      });
      return {
        ok: true,
        duplicate: false,
        policy: publicAutomationFailurePolicy(db.prepare("SELECT * FROM learning_growth_automation_failure_policies WHERE policy_id = ?").get(policyId))
      };
    });
  }

  function getPolicy(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_failure_policies")) return null;
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const policyId = cleanString(input.policyId || input.policy_id);
      if (!workspaceId || !policyId) return null;
      return publicAutomationFailurePolicy(db.prepare(`
        SELECT * FROM learning_growth_automation_failure_policies
        WHERE workspace_id = ? AND policy_id = ?
      `).get(workspaceId, policyId));
    });
  }

  function listPolicies(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_failure_policies")) return [];
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id);
      const programId = cleanString(input.programId || input.program_id);
      const status = cleanString(input.status);
      const domainPackId = cleanString(input.domainPackId || input.domain_pack_id);
      const domain = cleanString(input.domain);
      const subject = cleanString(input.subject);
      const horizon = cleanString(input.horizon);
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
      if (status) {
        where.push("status = ?");
        values.push(status);
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
      const limit = Math.max(1, Math.min(100, Number(input.limit || 20) || 20));
      return db.prepare(`
        SELECT * FROM learning_growth_automation_failure_policies
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, policy_id DESC
        LIMIT ?
      `).all(...values, limit).map(publicAutomationFailurePolicy).filter(Boolean);
    });
  }

  function reviewPolicy(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationFailurePolicySchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      if (privacyFindings.length) {
        return { ok: false, error: "learning_automation_failure_policy_privacy_failed", privacyFindings };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const policyId = cleanString(input.policyId || input.policy_id);
      const status = cleanString(input.status || input.reviewAction || input.review_action || input.action).toLowerCase();
      if (!workspaceId || !policyId) {
        return { ok: false, error: "learning_automation_failure_policy_scope_required" };
      }
      const allowedStatuses = new Set(["active", "archived", "superseded"]);
      if (!allowedStatuses.has(status)) {
        return { ok: false, error: "learning_automation_failure_policy_status_invalid" };
      }
      const existing = db.prepare(`
        SELECT * FROM learning_growth_automation_failure_policies
        WHERE workspace_id = ? AND policy_id = ?
      `).get(workspaceId, policyId);
      if (!existing) return { ok: false, error: "learning_automation_failure_policy_not_found" };
      const existingStatus = cleanString(existing.status);
      if (existingStatus && existingStatus !== "draft") {
        return {
          ok: existingStatus === status,
          duplicate: existingStatus === status,
          error: existingStatus === status ? "" : "learning_automation_failure_policy_already_reviewed",
          policy: publicAutomationFailurePolicy(existing)
        };
      }
      const reviewedAt = cleanString(input.reviewedAt || input.reviewed_at) || clock().toISOString();
      const reviewedBy = cleanString(input.reviewedBy || input.reviewed_by || input.requestedBy || input.requested_by);
      const review = {
        schemaVersion: "growth.learningAutomationFailurePolicy.review.v1",
        summaryOnly: true,
        status,
        reviewedBy,
        reviewedAt,
        note: boundedText(input.note || input.reason || input.summary, 360),
        affectedPolicyIds: uniqueStrings(input.affectedPolicyIds || input.affected_policy_ids)
      };
      db.prepare(`
        UPDATE learning_growth_automation_failure_policies
        SET status = ?,
          review_json = ?,
          reviewed_by = ?,
          reviewed_at = ?,
          updated_at = ?
        WHERE workspace_id = ? AND policy_id = ?
      `).run(status, jsonText(review), reviewedBy, reviewedAt, reviewedAt, workspaceId, policyId);
      return {
        ok: true,
        duplicate: false,
        policy: publicAutomationFailurePolicy(db.prepare("SELECT * FROM learning_growth_automation_failure_policies WHERE policy_id = ?").get(policyId))
      };
    });
  }

  return {
    ensureSchema,
    getPolicy,
    listPolicies,
    reviewPolicy,
    savePolicy
  };
}

module.exports = {
  createLearningAutomationFailurePolicyRepository,
  ensureLearningAutomationFailurePolicySchema,
  publicAutomationFailurePolicy
};
