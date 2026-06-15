"use strict";

const {
  asArray,
  cleanString,
  insertDynamic,
  parseJson,
  tableExists
} = require("./core");
const { stableProfileDeltaAuditId } = require("./identifiers");

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body)/i;

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
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

function publicProfileDeltaAudit(row) {
  if (!row) return null;
  return {
    profileDeltaId: cleanString(row.profile_delta_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    taskCardId: cleanString(row.task_card_id),
    submissionId: cleanString(row.submission_id),
    evaluationId: cleanString(row.evaluation_id),
    targetNodeIds: parseJson(row.target_node_ids_json, []),
    evidenceIds: parseJson(row.evidence_ids_json, []),
    changedCapabilityCount: Number(row.changed_capability_count || 0) || 0,
    profileStateChanged: Boolean(Number(row.profile_state_changed || 0)),
    beforeSummary: parseJson(row.before_summary_json, {}) || {},
    afterSummary: parseJson(row.after_summary_json, {}) || {},
    summary: parseJson(row.summary_json, {}) || {},
    changedCapabilities: parseJson(row.changed_capabilities_json, []),
    plannerHintChange: parseJson(row.planner_hint_change_json, {}) || {},
    privacyClass: cleanString(row.privacy_class),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function ensureProfileDeltaAuditSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_profile_delta_audits (
      profile_delta_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      task_card_id TEXT NOT NULL DEFAULT '',
      submission_id TEXT NOT NULL DEFAULT '',
      evaluation_id TEXT NOT NULL DEFAULT '',
      target_node_ids_json TEXT NOT NULL DEFAULT '[]',
      evidence_ids_json TEXT NOT NULL DEFAULT '[]',
      changed_capability_count INTEGER NOT NULL DEFAULT 0,
      profile_state_changed INTEGER NOT NULL DEFAULT 0,
      before_summary_json TEXT NOT NULL DEFAULT '{}',
      after_summary_json TEXT NOT NULL DEFAULT '{}',
      summary_json TEXT NOT NULL DEFAULT '{}',
      changed_capabilities_json TEXT NOT NULL DEFAULT '[]',
      planner_hint_change_json TEXT NOT NULL DEFAULT '{}',
      raw_json TEXT NOT NULL DEFAULT '{}',
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_growth_profile_delta_evaluation
      ON learning_growth_profile_delta_audits(workspace_id, evaluation_id)
      WHERE evaluation_id <> '';
    CREATE INDEX IF NOT EXISTS idx_learning_growth_profile_delta_workspace
      ON learning_growth_profile_delta_audits(workspace_id, learner_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_profile_delta_card
      ON learning_growth_profile_delta_audits(workspace_id, task_card_id, created_at);
  `);
}

function createProfileDeltaAuditRepository({ open, now } = {}) {
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
      ensureProfileDeltaAuditSchema(db);
      return { ok: true, table: "learning_growth_profile_delta_audits" };
    });
  }

  function recordProfileDelta(input = {}) {
    return withDb(false, (db) => {
      ensureProfileDeltaAuditSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      if (privacyFindings.length) {
        return { ok: false, error: "profile_delta_audit_privacy_failed", privacyFindings };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
      const basis = input.basis || {};
      const evaluationId = cleanString(input.evaluationId || input.evaluation_id || basis.evaluationId || basis.evaluation_id);
      const profileDeltaId = stableProfileDeltaAuditId(Object.assign({}, input, {
        workspaceId,
        learnerId,
        programId: input.programId || input.program_id,
        taskCardId: input.taskCardId || input.task_card_id || basis.taskCardId || basis.task_card_id,
        submissionId: input.submissionId || input.submission_id || basis.submissionId || basis.submission_id,
        evaluationId
      }));
      if (!workspaceId || !profileDeltaId) return { ok: false, error: "profile_delta_audit_scope_required" };
      const privacyClass = cleanString(input.privacyClass || input.privacy_class || "summary_only") || "summary_only";
      if (privacyClass !== "summary_only") return { ok: false, error: "profile_delta_audit_privacy_class_required" };
      const existing = db.prepare("SELECT * FROM learning_growth_profile_delta_audits WHERE profile_delta_id = ?").get(profileDeltaId)
        || (evaluationId
          ? db.prepare("SELECT * FROM learning_growth_profile_delta_audits WHERE workspace_id = ? AND evaluation_id = ?").get(workspaceId, evaluationId)
          : null);
      if (existing) return { ok: true, duplicate: true, profileDelta: publicProfileDeltaAudit(existing) };
      const timestamp = cleanString(input.generatedAt || input.createdAt || input.created_at) || clock().toISOString();
      const targetNodeIds = uniqueStrings(input.targetNodeIds || input.target_node_ids);
      const evidenceIds = uniqueStrings(input.evidenceIds || input.evidence_ids || basis.evidenceIds || basis.evidence_ids);
      const summary = input.summary || {};
      const values = {
        profile_delta_id: profileDeltaId,
        workspace_id: workspaceId,
        learner_id: learnerId,
        program_id: cleanString(input.programId || input.program_id),
        task_card_id: cleanString(input.taskCardId || input.task_card_id || basis.taskCardId || basis.task_card_id),
        submission_id: cleanString(input.submissionId || input.submission_id || basis.submissionId || basis.submission_id),
        evaluation_id: evaluationId,
        target_node_ids_json: jsonText(targetNodeIds),
        evidence_ids_json: jsonText(evidenceIds),
        changed_capability_count: Number(summary.changedCapabilityCount || input.changedCapabilityCount || 0) || 0,
        profile_state_changed: input.profileStateChanged ? 1 : 0,
        before_summary_json: jsonText(input.beforeSummary || input.before_summary || {}),
        after_summary_json: jsonText(input.afterSummary || input.after_summary || {}),
        summary_json: jsonText(summary),
        changed_capabilities_json: jsonText(asArray(input.changedCapabilities || input.changed_capabilities)),
        planner_hint_change_json: jsonText(input.plannerHintChange || input.planner_hint_change || {}),
        raw_json: jsonText({
          source: cleanString(input.source),
          generatedAt: cleanString(input.generatedAt),
          basis: {
            taskCardId: cleanString(basis.taskCardId || basis.task_card_id),
            submissionId: cleanString(basis.submissionId || basis.submission_id),
            evaluationId,
            evidenceIds
          },
          summaryOnly: true
        }),
        privacy_class: privacyClass,
        created_at: timestamp,
        updated_at: cleanString(input.updatedAt || input.updated_at) || timestamp
      };
      insertDynamic(db, "learning_growth_profile_delta_audits", values);
      return {
        ok: true,
        duplicate: false,
        profileDelta: publicProfileDeltaAudit(db.prepare("SELECT * FROM learning_growth_profile_delta_audits WHERE profile_delta_id = ?").get(profileDeltaId))
      };
    });
  }

  function listProfileDeltas(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_profile_delta_audits")) return [];
      const where = [];
      const values = [];
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id);
      const programId = cleanString(input.programId || input.program_id);
      const profileDeltaId = cleanString(input.profileDeltaId || input.profile_delta_id);
      const taskCardId = cleanString(input.taskCardId || input.task_card_id);
      const evaluationId = cleanString(input.evaluationId || input.evaluation_id);
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
      if (profileDeltaId) {
        where.push("profile_delta_id = ?");
        values.push(profileDeltaId);
      }
      if (taskCardId) {
        where.push("task_card_id = ?");
        values.push(taskCardId);
      }
      if (evaluationId) {
        where.push("evaluation_id = ?");
        values.push(evaluationId);
      }
      const limit = Math.max(1, Math.min(100, Number(input.limit || 20) || 20));
      return db.prepare(`
        SELECT * FROM learning_growth_profile_delta_audits
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY created_at DESC, profile_delta_id DESC
        LIMIT ?
      `).all(...values, limit).map(publicProfileDeltaAudit).filter(Boolean);
    });
  }

  return {
    ensureSchema,
    listProfileDeltas,
    recordProfileDelta
  };
}

module.exports = {
  createProfileDeltaAuditRepository,
  ensureProfileDeltaAuditSchema,
  publicProfileDeltaAudit
};
