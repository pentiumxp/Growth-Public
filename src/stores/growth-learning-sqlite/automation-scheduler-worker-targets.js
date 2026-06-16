"use strict";

const {
  cleanString,
  insertDynamic,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");
const { stableLearningAutomationSchedulerWorkerTargetId } = require("./identifiers");

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

function ensureLearningAutomationSchedulerWorkerTargetSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_automation_scheduler_worker_targets (
      target_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      domain_pack_id TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      horizon TEXT NOT NULL DEFAULT 'daily_plan',
      status TEXT NOT NULL DEFAULT 'proposed',
      target_version TEXT NOT NULL DEFAULT 'growth.learningAutomationSchedulerWorkerTarget.v1',
      target_json TEXT NOT NULL DEFAULT '{}',
      policy_json TEXT NOT NULL DEFAULT '{}',
      readiness_json TEXT NOT NULL DEFAULT '{}',
      review_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL DEFAULT '',
      reviewed_by TEXT NOT NULL DEFAULT '',
      reviewed_at TEXT NOT NULL DEFAULT '',
      disabled_reason TEXT NOT NULL DEFAULT '',
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const columns = new Set(tableColumns(db, "learning_growth_automation_scheduler_worker_targets"));
  [
    ["domain_pack_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain", "TEXT NOT NULL DEFAULT ''"],
    ["subject", "TEXT NOT NULL DEFAULT ''"],
    ["horizon", "TEXT NOT NULL DEFAULT 'daily_plan'"],
    ["target_version", "TEXT NOT NULL DEFAULT 'growth.learningAutomationSchedulerWorkerTarget.v1'"],
    ["target_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["policy_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["readiness_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["review_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["reviewed_by", "TEXT NOT NULL DEFAULT ''"],
    ["reviewed_at", "TEXT NOT NULL DEFAULT ''"],
    ["disabled_reason", "TEXT NOT NULL DEFAULT ''"]
  ].forEach(([name, definition]) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE learning_growth_automation_scheduler_worker_targets ADD COLUMN ${name} ${definition}`);
  });
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_scheduler_worker_targets_target
      ON learning_growth_automation_scheduler_worker_targets(workspace_id, learner_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_scheduler_worker_targets_scope
      ON learning_growth_automation_scheduler_worker_targets(workspace_id, program_id, domain_pack_id, subject, horizon, status, updated_at);
  `);
}

function publicAutomationSchedulerWorkerTarget(row) {
  if (!row) return null;
  return {
    targetId: cleanString(row.target_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    domainPackId: cleanString(row.domain_pack_id),
    domain: cleanString(row.domain),
    subject: cleanString(row.subject),
    horizon: cleanString(row.horizon),
    status: cleanString(row.status),
    targetVersion: cleanString(row.target_version),
    target: parseJson(row.target_json, {}) || {},
    policy: parseJson(row.policy_json, {}) || {},
    readiness: parseJson(row.readiness_json, {}) || {},
    review: parseJson(row.review_json, {}) || {},
    createdBy: cleanString(row.created_by),
    reviewedBy: cleanString(row.reviewed_by),
    reviewedAt: cleanString(row.reviewed_at),
    disabledReason: cleanString(row.disabled_reason),
    privacyClass: cleanString(row.privacy_class),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function createLearningAutomationSchedulerWorkerTargetRepository({ open, now } = {}) {
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
      ensureLearningAutomationSchedulerWorkerTargetSchema(db);
      return { ok: true, table: "learning_growth_automation_scheduler_worker_targets" };
    });
  }

  function targetRow(db, targetId) {
    return db.prepare(`
      SELECT * FROM learning_growth_automation_scheduler_worker_targets
      WHERE target_id = ?
    `).get(cleanString(targetId));
  }

  function saveTarget(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationSchedulerWorkerTargetSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      if (privacyFindings.length) {
        return { ok: false, error: "learning_automation_scheduler_worker_target_privacy_failed", privacyFindings };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
      const horizon = cleanString(input.horizon || "daily_plan") || "daily_plan";
      if (!workspaceId) return { ok: false, error: "learning_automation_scheduler_worker_target_scope_required" };
      const privacyClass = cleanString(input.privacyClass || input.privacy_class || "summary_only") || "summary_only";
      if (privacyClass !== "summary_only") {
        return { ok: false, error: "learning_automation_scheduler_worker_target_privacy_class_required" };
      }
      const status = cleanString(input.status || "proposed").toLowerCase();
      if (!["proposed", "enabled", "disabled", "archived"].includes(status)) {
        return { ok: false, error: "learning_automation_scheduler_worker_target_status_invalid" };
      }
      const targetVersion = cleanString(input.targetVersion || input.target_version || "growth.learningAutomationSchedulerWorkerTarget.v1")
        || "growth.learningAutomationSchedulerWorkerTarget.v1";
      const targetId = stableLearningAutomationSchedulerWorkerTargetId(Object.assign({}, input, {
        workspaceId,
        learnerId,
        horizon,
        targetVersion
      }));
      const existing = targetRow(db, targetId);
      if (existing) return { ok: true, duplicate: true, target: publicAutomationSchedulerWorkerTarget(existing) };
      const timestamp = cleanString(input.createdAt || input.created_at) || clock().toISOString();
      insertDynamic(db, "learning_growth_automation_scheduler_worker_targets", {
        target_id: targetId,
        workspace_id: workspaceId,
        learner_id: learnerId,
        program_id: cleanString(input.programId || input.program_id),
        domain_pack_id: cleanString(input.domainPackId || input.domain_pack_id),
        domain: cleanString(input.domain),
        subject: cleanString(input.subject),
        horizon,
        status,
        target_version: targetVersion,
        target_json: jsonText(input.target || {}),
        policy_json: jsonText(input.policy || {}),
        readiness_json: jsonText(input.readiness || {}),
        review_json: jsonText(input.review || {}),
        created_by: cleanString(input.createdBy || input.created_by || input.requestedBy || input.requested_by),
        reviewed_by: cleanString(input.reviewedBy || input.reviewed_by),
        reviewed_at: cleanString(input.reviewedAt || input.reviewed_at),
        disabled_reason: boundedText(input.disabledReason || input.disabled_reason, 240),
        privacy_class: privacyClass,
        created_at: timestamp,
        updated_at: cleanString(input.updatedAt || input.updated_at) || timestamp
      });
      return {
        ok: true,
        duplicate: false,
        target: publicAutomationSchedulerWorkerTarget(targetRow(db, targetId))
      };
    });
  }

  function getTarget(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_scheduler_worker_targets")) return null;
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const targetId = cleanString(input.targetId || input.target_id || input.workerTargetId || input.worker_target_id);
      if (!workspaceId || !targetId) return null;
      return publicAutomationSchedulerWorkerTarget(db.prepare(`
        SELECT * FROM learning_growth_automation_scheduler_worker_targets
        WHERE workspace_id = ? AND target_id = ?
      `).get(workspaceId, targetId));
    });
  }

  function listTargets(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_scheduler_worker_targets")) return [];
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
        SELECT * FROM learning_growth_automation_scheduler_worker_targets
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, target_id DESC
        LIMIT ?
      `).all(...values, limit).map(publicAutomationSchedulerWorkerTarget).filter(Boolean);
    });
  }

  function reviewTarget(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationSchedulerWorkerTargetSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      if (privacyFindings.length) {
        return { ok: false, error: "learning_automation_scheduler_worker_target_privacy_failed", privacyFindings };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const targetId = cleanString(input.targetId || input.target_id || input.workerTargetId || input.worker_target_id);
      const status = cleanString(input.status || input.reviewAction || input.review_action || input.action).toLowerCase();
      if (!workspaceId || !targetId) return { ok: false, error: "learning_automation_scheduler_worker_target_scope_required" };
      if (!["enabled", "disabled", "archived"].includes(status)) {
        return { ok: false, error: "learning_automation_scheduler_worker_target_status_invalid" };
      }
      const existing = db.prepare(`
        SELECT * FROM learning_growth_automation_scheduler_worker_targets
        WHERE workspace_id = ? AND target_id = ?
      `).get(workspaceId, targetId);
      if (!existing) return { ok: false, error: "learning_automation_scheduler_worker_target_not_found" };
      const existingStatus = cleanString(existing.status);
      if (["archived"].includes(existingStatus)) {
        return {
          ok: existingStatus === status,
          duplicate: existingStatus === status,
          error: existingStatus === status ? "" : "learning_automation_scheduler_worker_target_archived",
          target: publicAutomationSchedulerWorkerTarget(existing)
        };
      }
      const reviewedAt = cleanString(input.reviewedAt || input.reviewed_at) || clock().toISOString();
      const reviewedBy = cleanString(input.reviewedBy || input.reviewed_by || input.requestedBy || input.requested_by);
      const review = {
        schemaVersion: "growth.learningAutomationSchedulerWorkerTarget.review.v1",
        summaryOnly: true,
        status,
        reviewedBy,
        reviewedAt,
        reason: boundedText(input.reason || input.note || input.summary, 360),
        productionSchedulingAllowed: false
      };
      db.prepare(`
        UPDATE learning_growth_automation_scheduler_worker_targets
        SET status = ?,
          readiness_json = ?,
          review_json = ?,
          reviewed_by = ?,
          reviewed_at = ?,
          disabled_reason = ?,
          updated_at = ?
        WHERE workspace_id = ? AND target_id = ?
      `).run(
        status,
        jsonText(input.readiness || {}),
        jsonText(review),
        reviewedBy,
        reviewedAt,
        status === "enabled" ? "" : boundedText(input.reason || input.note || input.summary, 240),
        reviewedAt,
        workspaceId,
        targetId
      );
      return {
        ok: true,
        duplicate: existingStatus === status,
        target: publicAutomationSchedulerWorkerTarget(targetRow(db, targetId))
      };
    });
  }

  return {
    ensureSchema,
    getTarget,
    listTargets,
    reviewTarget,
    saveTarget
  };
}

module.exports = {
  createLearningAutomationSchedulerWorkerTargetRepository,
  ensureLearningAutomationSchedulerWorkerTargetSchema,
  publicAutomationSchedulerWorkerTarget
};
