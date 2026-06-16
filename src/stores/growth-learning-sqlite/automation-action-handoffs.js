"use strict";

const {
  asArray,
  cleanString,
  insertDynamic,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");
const { stableLearningAutomationActionHandoffId } = require("./identifiers");

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

function ensureLearningAutomationActionHandoffSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_automation_action_handoffs (
      handoff_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      digest_id TEXT NOT NULL DEFAULT '',
      policy_id TEXT NOT NULL DEFAULT '',
      domain_pack_id TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      horizon TEXT NOT NULL DEFAULT 'daily_plan',
      status TEXT NOT NULL DEFAULT 'pending_delivery',
      delivery_status TEXT NOT NULL DEFAULT 'not_delivered',
      delivery_attempts INTEGER NOT NULL DEFAULT 0,
      action_summary_json TEXT NOT NULL DEFAULT '{}',
      actions_json TEXT NOT NULL DEFAULT '[]',
      blocked_json TEXT NOT NULL DEFAULT '[]',
      policy_readiness_json TEXT NOT NULL DEFAULT '{}',
      notification_json TEXT NOT NULL DEFAULT '{}',
      delivery_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL DEFAULT '',
      delivered_by TEXT NOT NULL DEFAULT '',
      delivered_at TEXT NOT NULL DEFAULT '',
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const columns = new Set(tableColumns(db, "learning_growth_automation_action_handoffs"));
  [
    ["delivery_status", "TEXT NOT NULL DEFAULT 'not_delivered'"],
    ["delivery_attempts", "INTEGER NOT NULL DEFAULT 0"],
    ["policy_readiness_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["notification_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["delivery_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["delivered_by", "TEXT NOT NULL DEFAULT ''"],
    ["delivered_at", "TEXT NOT NULL DEFAULT ''"]
  ].forEach(([name, definition]) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE learning_growth_automation_action_handoffs ADD COLUMN ${name} ${definition}`);
  });
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_action_handoffs_target
      ON learning_growth_automation_action_handoffs(workspace_id, learner_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_action_handoffs_digest
      ON learning_growth_automation_action_handoffs(workspace_id, digest_id, delivery_status, updated_at);
  `);
}

function publicAutomationActionHandoff(row) {
  if (!row) return null;
  return {
    handoffId: cleanString(row.handoff_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    digestId: cleanString(row.digest_id),
    policyId: cleanString(row.policy_id),
    domainPackId: cleanString(row.domain_pack_id),
    domain: cleanString(row.domain),
    subject: cleanString(row.subject),
    horizon: cleanString(row.horizon),
    status: cleanString(row.status),
    deliveryStatus: cleanString(row.delivery_status),
    deliveryAttempts: Number(row.delivery_attempts || 0) || 0,
    actionSummary: parseJson(row.action_summary_json, {}) || {},
    actions: asArray(parseJson(row.actions_json, []) || []),
    blocked: asArray(parseJson(row.blocked_json, []) || []),
    policyReadiness: parseJson(row.policy_readiness_json, {}) || {},
    notification: parseJson(row.notification_json, {}) || {},
    delivery: parseJson(row.delivery_json, {}) || {},
    createdBy: cleanString(row.created_by),
    deliveredBy: cleanString(row.delivered_by),
    deliveredAt: cleanString(row.delivered_at),
    privacyClass: cleanString(row.privacy_class),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function actionKeys(actions = []) {
  return asArray(actions).map((action = {}) => [
    cleanString(action.candidateId || action.candidate_id),
    cleanString(action.proposalId || action.proposal_id),
    cleanString(action.planDraftId || action.plan_draft_id),
    cleanString(action.selectedItemId || action.selected_item_id),
    cleanString(action.endpoint)
  ].join(":"));
}

function createLearningAutomationActionHandoffRepository({ open, now } = {}) {
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
      ensureLearningAutomationActionHandoffSchema(db);
      return { ok: true, table: "learning_growth_automation_action_handoffs" };
    });
  }

  function saveHandoff(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationActionHandoffSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      if (privacyFindings.length) {
        return { ok: false, error: "learning_automation_action_handoff_privacy_failed", privacyFindings };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
      const digestId = cleanString(input.digestId || input.digest_id);
      const horizon = cleanString(input.horizon || "daily_plan") || "daily_plan";
      if (!workspaceId || !digestId) {
        return { ok: false, error: "learning_automation_action_handoff_scope_required" };
      }
      const privacyClass = cleanString(input.privacyClass || input.privacy_class || "summary_only") || "summary_only";
      if (privacyClass !== "summary_only") {
        return { ok: false, error: "learning_automation_action_handoff_privacy_class_required" };
      }
      const actions = asArray(input.actions);
      const blocked = asArray(input.blocked);
      const handoffId = stableLearningAutomationActionHandoffId(Object.assign({}, input, {
        workspaceId,
        learnerId,
        digestId,
        horizon,
        actionKeys: actionKeys(actions)
      }));
      const existing = db.prepare("SELECT * FROM learning_growth_automation_action_handoffs WHERE handoff_id = ?").get(handoffId);
      if (existing) return { ok: true, duplicate: true, handoff: publicAutomationActionHandoff(existing) };
      const timestamp = cleanString(input.createdAt || input.created_at) || clock().toISOString();
      insertDynamic(db, "learning_growth_automation_action_handoffs", {
        handoff_id: handoffId,
        workspace_id: workspaceId,
        learner_id: learnerId,
        program_id: cleanString(input.programId || input.program_id),
        digest_id: digestId,
        policy_id: cleanString(input.policyId || input.policy_id),
        domain_pack_id: cleanString(input.domainPackId || input.domain_pack_id),
        domain: cleanString(input.domain),
        subject: cleanString(input.subject),
        horizon,
        status: cleanString(input.status || "pending_delivery") || "pending_delivery",
        delivery_status: cleanString(input.deliveryStatus || input.delivery_status || "not_delivered") || "not_delivered",
        delivery_attempts: Number(input.deliveryAttempts || input.delivery_attempts || 0) || 0,
        action_summary_json: jsonText(input.actionSummary || input.action_summary || input.summary || {}),
        actions_json: jsonText(actions),
        blocked_json: jsonText(blocked),
        policy_readiness_json: jsonText(input.policyReadiness || input.policy_readiness || {}),
        notification_json: jsonText(input.notification || {}),
        delivery_json: jsonText(input.delivery || {}),
        created_by: cleanString(input.createdBy || input.created_by),
        delivered_by: cleanString(input.deliveredBy || input.delivered_by),
        delivered_at: cleanString(input.deliveredAt || input.delivered_at),
        privacy_class: privacyClass,
        created_at: timestamp,
        updated_at: cleanString(input.updatedAt || input.updated_at) || timestamp
      });
      return {
        ok: true,
        duplicate: false,
        handoff: publicAutomationActionHandoff(db.prepare("SELECT * FROM learning_growth_automation_action_handoffs WHERE handoff_id = ?").get(handoffId))
      };
    });
  }

  function getHandoff(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_action_handoffs")) return null;
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const handoffId = cleanString(input.handoffId || input.handoff_id);
      if (!workspaceId || !handoffId) return null;
      return publicAutomationActionHandoff(db.prepare(`
        SELECT * FROM learning_growth_automation_action_handoffs
        WHERE workspace_id = ? AND handoff_id = ?
      `).get(workspaceId, handoffId));
    });
  }

  function listHandoffs(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_action_handoffs")) return [];
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id);
      const programId = cleanString(input.programId || input.program_id);
      const digestId = cleanString(input.digestId || input.digest_id);
      const status = cleanString(input.status);
      const deliveryStatus = cleanString(input.deliveryStatus || input.delivery_status);
      const domainPackId = cleanString(input.domainPackId || input.domain_pack_id);
      const subject = cleanString(input.subject);
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
      if (digestId) {
        where.push("digest_id = ?");
        values.push(digestId);
      }
      if (status) {
        where.push("status = ?");
        values.push(status);
      }
      if (deliveryStatus) {
        where.push("delivery_status = ?");
        values.push(deliveryStatus);
      }
      if (domainPackId) {
        where.push("domain_pack_id = ?");
        values.push(domainPackId);
      }
      if (subject) {
        where.push("subject = ?");
        values.push(subject);
      }
      const limit = Math.max(1, Math.min(100, Number(input.limit || 20) || 20));
      return db.prepare(`
        SELECT * FROM learning_growth_automation_action_handoffs
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, handoff_id DESC
        LIMIT ?
      `).all(...values, limit).map(publicAutomationActionHandoff).filter(Boolean);
    });
  }

  function recordDelivery(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationActionHandoffSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      if (privacyFindings.length) {
        return { ok: false, error: "learning_automation_action_handoff_privacy_failed", privacyFindings };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const handoffId = cleanString(input.handoffId || input.handoff_id);
      if (!workspaceId || !handoffId) {
        return { ok: false, error: "learning_automation_action_handoff_scope_required" };
      }
      const deliveryStatus = cleanString(input.deliveryStatus || input.delivery_status || input.status).toLowerCase();
      const allowedStatuses = new Set(["delivered", "delivery_failed", "delivery_pending"]);
      if (!allowedStatuses.has(deliveryStatus)) {
        return { ok: false, error: "learning_automation_action_handoff_delivery_status_invalid" };
      }
      const existing = db.prepare(`
        SELECT * FROM learning_growth_automation_action_handoffs
        WHERE workspace_id = ? AND handoff_id = ?
      `).get(workspaceId, handoffId);
      if (!existing) return { ok: false, error: "learning_automation_action_handoff_not_found" };
      if (cleanString(existing.delivery_status) === "delivered" && deliveryStatus === "delivered") {
        return { ok: true, duplicate: true, handoff: publicAutomationActionHandoff(existing) };
      }
      const deliveredAt = cleanString(input.deliveredAt || input.delivered_at) || clock().toISOString();
      const deliveredBy = cleanString(input.deliveredBy || input.delivered_by || input.requestedBy || input.requested_by);
      const attempts = Number(existing.delivery_attempts || 0) + 1;
      const delivery = {
        schemaVersion: "growth.learningAutomationActionHandoff.delivery.v1",
        summaryOnly: true,
        status: deliveryStatus,
        attempts,
        ok: deliveryStatus === "delivered",
        error: boundedText(input.error || input.delivery?.error, 160),
        deliveredBy,
        deliveredAt,
        result: input.delivery || {}
      };
      db.prepare(`
        UPDATE learning_growth_automation_action_handoffs
        SET status = ?,
          delivery_status = ?,
          delivery_attempts = ?,
          delivery_json = ?,
          delivered_by = ?,
          delivered_at = ?,
          updated_at = ?
        WHERE workspace_id = ? AND handoff_id = ?
      `).run(
        deliveryStatus === "delivered" ? "delivered" : deliveryStatus,
        deliveryStatus,
        attempts,
        jsonText(delivery),
        deliveredBy,
        deliveredAt,
        deliveredAt,
        workspaceId,
        handoffId
      );
      return {
        ok: true,
        duplicate: false,
        handoff: publicAutomationActionHandoff(db.prepare("SELECT * FROM learning_growth_automation_action_handoffs WHERE handoff_id = ?").get(handoffId))
      };
    });
  }

  return {
    ensureSchema,
    getHandoff,
    listHandoffs,
    recordDelivery,
    saveHandoff
  };
}

module.exports = {
  createLearningAutomationActionHandoffRepository,
  ensureLearningAutomationActionHandoffSchema,
  publicAutomationActionHandoff
};
