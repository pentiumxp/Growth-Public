"use strict";

const {
  cleanString,
  insertDynamic,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");
const { stableLearningOwnerAuditReviewId } = require("./identifiers");

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|access-key\.txt|launch-token)/i;

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function boundedText(value, max = 360) {
  const text = cleanString(value);
  return text.length > max ? text.slice(0, max) : text;
}

function uniqueStrings(values = [], max = 16) {
  return Array.from(new Set((Array.isArray(values) ? values : [values])
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean))).slice(0, max);
}

function scanPrivacyKeys(value, path = "$", findings = [], privateValueFindings = []) {
  if (!value || typeof value !== "object") return { privacyFindings: findings, privateValueFindings };
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacyKeys(item, `${path}[${index}]`, findings, privateValueFindings));
    return { privacyFindings: findings, privateValueFindings };
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (typeof child === "string" && PRIVATE_VALUE_PATTERN.test(child)) privateValueFindings.push(childPath);
    if (child && typeof child === "object") scanPrivacyKeys(child, childPath, findings, privateValueFindings);
  }
  return { privacyFindings: findings, privateValueFindings };
}

function normalizeDecision(value) {
  const decision = cleanString(value || "accepted").toLowerCase().replace(/-/g, "_");
  if (["accepted", "needs_follow_up", "correction_recorded", "blocked"].includes(decision)) return decision;
  return "";
}

function normalizeStatus(value, decision = "") {
  const status = cleanString(value || "").toLowerCase().replace(/-/g, "_");
  if (["reviewed", "needs_follow_up", "corrected", "blocked"].includes(status)) return status;
  if (decision === "needs_follow_up") return "needs_follow_up";
  if (decision === "correction_recorded") return "corrected";
  if (decision === "blocked") return "blocked";
  return "reviewed";
}

function normalizeLimit(value, fallback = 20) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(100, Math.trunc(parsed)));
}

function ensureLearningOwnerAuditReviewSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_owner_audit_reviews (
      review_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      domain_pack_id TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      horizon TEXT NOT NULL DEFAULT 'daily_plan',
      decision TEXT NOT NULL DEFAULT 'accepted',
      status TEXT NOT NULL DEFAULT 'reviewed',
      plan_draft_id TEXT NOT NULL DEFAULT '',
      task_card_id TEXT NOT NULL DEFAULT '',
      evaluation_id TEXT NOT NULL DEFAULT '',
      profile_delta_id TEXT NOT NULL DEFAULT '',
      evidence_id TEXT NOT NULL DEFAULT '',
      correction_id TEXT NOT NULL DEFAULT '',
      source_id TEXT NOT NULL DEFAULT '',
      target_node_ids_json TEXT NOT NULL DEFAULT '[]',
      selector_json TEXT NOT NULL DEFAULT '{}',
      feedback_summary_json TEXT NOT NULL DEFAULT '{}',
      audit_summary_json TEXT NOT NULL DEFAULT '{}',
      recommendation_json TEXT NOT NULL DEFAULT '{}',
      next_action_json TEXT NOT NULL DEFAULT '{}',
      owner_note TEXT NOT NULL DEFAULT '',
      reviewed_by TEXT NOT NULL DEFAULT '',
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const columns = new Set(tableColumns(db, "learning_growth_owner_audit_reviews"));
  [
    ["learner_id", "TEXT NOT NULL DEFAULT ''"],
    ["program_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain_pack_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain", "TEXT NOT NULL DEFAULT ''"],
    ["subject", "TEXT NOT NULL DEFAULT ''"],
    ["horizon", "TEXT NOT NULL DEFAULT 'daily_plan'"],
    ["decision", "TEXT NOT NULL DEFAULT 'accepted'"],
    ["status", "TEXT NOT NULL DEFAULT 'reviewed'"],
    ["plan_draft_id", "TEXT NOT NULL DEFAULT ''"],
    ["task_card_id", "TEXT NOT NULL DEFAULT ''"],
    ["evaluation_id", "TEXT NOT NULL DEFAULT ''"],
    ["profile_delta_id", "TEXT NOT NULL DEFAULT ''"],
    ["evidence_id", "TEXT NOT NULL DEFAULT ''"],
    ["correction_id", "TEXT NOT NULL DEFAULT ''"],
    ["source_id", "TEXT NOT NULL DEFAULT ''"],
    ["target_node_ids_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["selector_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["feedback_summary_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["audit_summary_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["recommendation_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["next_action_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["owner_note", "TEXT NOT NULL DEFAULT ''"],
    ["reviewed_by", "TEXT NOT NULL DEFAULT ''"],
    ["privacy_class", "TEXT NOT NULL DEFAULT 'summary_only'"],
    ["updated_at", "TEXT NOT NULL DEFAULT ''"]
  ].forEach(([name, definition]) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE learning_growth_owner_audit_reviews ADD COLUMN ${name} ${definition}`);
  });
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_learning_growth_owner_audit_reviews_target
      ON learning_growth_owner_audit_reviews(workspace_id, learner_id, status, created_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_owner_audit_reviews_cycle
      ON learning_growth_owner_audit_reviews(workspace_id, task_card_id, evaluation_id, profile_delta_id, correction_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_owner_audit_reviews_scope
      ON learning_growth_owner_audit_reviews(workspace_id, program_id, domain_pack_id, subject, horizon, decision, status, created_at);
  `);
}

function publicLearningOwnerAuditReview(row) {
  if (!row) return null;
  return {
    schemaVersion: "growth.learningOwnerAuditReview.v1",
    privacyClass: cleanString(row.privacy_class || "summary_only") || "summary_only",
    summaryOnly: true,
    reviewId: cleanString(row.review_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    domainPackId: cleanString(row.domain_pack_id),
    domain: cleanString(row.domain),
    subject: cleanString(row.subject),
    horizon: cleanString(row.horizon),
    decision: cleanString(row.decision),
    status: cleanString(row.status),
    planDraftId: cleanString(row.plan_draft_id),
    taskCardId: cleanString(row.task_card_id),
    evaluationId: cleanString(row.evaluation_id),
    profileDeltaId: cleanString(row.profile_delta_id),
    evidenceId: cleanString(row.evidence_id),
    correctionId: cleanString(row.correction_id),
    sourceId: cleanString(row.source_id),
    targetNodeIds: parseJson(row.target_node_ids_json, []) || [],
    selector: parseJson(row.selector_json, {}) || {},
    feedbackSummary: parseJson(row.feedback_summary_json, {}) || {},
    auditSummary: parseJson(row.audit_summary_json, {}) || {},
    recommendation: parseJson(row.recommendation_json, {}) || {},
    nextAction: parseJson(row.next_action_json, {}) || {},
    ownerNote: cleanString(row.owner_note),
    reviewedBy: cleanString(row.reviewed_by),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function createLearningOwnerAuditReviewRepository({ open, now } = {}) {
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
      ensureLearningOwnerAuditReviewSchema(db);
      return { ok: true, table: "learning_growth_owner_audit_reviews" };
    });
  }

  function recordReview(input = {}) {
    return withDb(false, (db) => {
      ensureLearningOwnerAuditReviewSchema(db);
      const { privacyFindings, privateValueFindings } = scanPrivacyKeys(input);
      if (privacyFindings.length || privateValueFindings.length) {
        return {
          ok: false,
          error: "learning_owner_audit_review_privacy_failed",
          privacyFindings,
          privateValueFindings
        };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      if (!workspaceId) return { ok: false, error: "learning_owner_audit_review_workspace_required" };
      const privacyClass = cleanString(input.privacyClass || input.privacy_class || "summary_only") || "summary_only";
      if (privacyClass !== "summary_only") return { ok: false, error: "learning_owner_audit_review_privacy_class_required" };
      const decision = normalizeDecision(input.decision || input.reviewDecision || input.review_decision);
      if (!decision) return { ok: false, error: "learning_owner_audit_review_decision_invalid" };
      const status = normalizeStatus(input.status || input.reviewStatus || input.review_status, decision);
      const timestamp = cleanString(input.reviewedAt || input.reviewed_at || input.createdAt || input.created_at) || clock().toISOString();
      const reviewId = stableLearningOwnerAuditReviewId(Object.assign({}, input, { workspaceId, decision, status, reviewedAt: timestamp }));
      const existing = db.prepare("SELECT * FROM learning_growth_owner_audit_reviews WHERE review_id = ?").get(reviewId);
      if (existing) return { ok: true, duplicate: true, review: publicLearningOwnerAuditReview(existing) };
      const selector = input.selector && typeof input.selector === "object" ? input.selector : {};
      const feedbackSummary = input.feedbackSummary && typeof input.feedbackSummary === "object" ? input.feedbackSummary : {};
      const auditSummary = input.auditSummary && typeof input.auditSummary === "object" ? input.auditSummary : {};
      const recommendation = input.recommendation && typeof input.recommendation === "object" ? input.recommendation : {};
      const nextAction = input.nextAction && typeof input.nextAction === "object" ? input.nextAction : {};
      insertDynamic(db, "learning_growth_owner_audit_reviews", {
        review_id: reviewId,
        workspace_id: workspaceId,
        learner_id: cleanString(input.learnerId || input.learner_id || selector.learnerId || workspaceId),
        program_id: cleanString(input.programId || input.program_id || selector.programId),
        domain_pack_id: cleanString(input.domainPackId || input.domain_pack_id || selector.domainPackId),
        domain: cleanString(input.domain || selector.domain),
        subject: cleanString(input.subject || selector.subject),
        horizon: cleanString(input.horizon || selector.horizon || "daily_plan") || "daily_plan",
        decision,
        status,
        plan_draft_id: cleanString(input.planDraftId || input.plan_draft_id || selector.planDraftId),
        task_card_id: cleanString(input.taskCardId || input.task_card_id || selector.taskCardId),
        evaluation_id: cleanString(input.evaluationId || input.evaluation_id || selector.evaluationId),
        profile_delta_id: cleanString(input.profileDeltaId || input.profile_delta_id || selector.profileDeltaId),
        evidence_id: cleanString(input.evidenceId || input.evidence_id || selector.evidenceId),
        correction_id: cleanString(input.correctionId || input.correction_id || selector.correctionId),
        source_id: cleanString(input.sourceId || input.source_id || selector.sourceId),
        target_node_ids_json: jsonText(uniqueStrings(input.targetNodeIds || input.target_node_ids || selector.targetNodeIds)),
        selector_json: jsonText(selector),
        feedback_summary_json: jsonText(feedbackSummary),
        audit_summary_json: jsonText(auditSummary),
        recommendation_json: jsonText(recommendation),
        next_action_json: jsonText(nextAction),
        owner_note: boundedText(input.ownerNote || input.owner_note || input.note, 360),
        reviewed_by: cleanString(input.reviewedBy || input.reviewed_by || input.requestedBy || input.requested_by),
        privacy_class: privacyClass,
        created_at: timestamp,
        updated_at: cleanString(input.updatedAt || input.updated_at) || timestamp
      });
      return {
        ok: true,
        duplicate: false,
        review: publicLearningOwnerAuditReview(db.prepare("SELECT * FROM learning_growth_owner_audit_reviews WHERE review_id = ?").get(reviewId))
      };
    });
  }

  function listReviews(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_owner_audit_reviews")) return [];
      const where = [];
      const values = [];
      [
        ["workspace_id", input.workspaceId || input.workspace_id],
        ["learner_id", input.learnerId || input.learner_id],
        ["program_id", input.programId || input.program_id],
        ["domain_pack_id", input.domainPackId || input.domain_pack_id],
        ["domain", input.domain],
        ["subject", input.subject],
        ["horizon", input.horizon],
        ["decision", input.decision || input.reviewDecision || input.review_decision],
        ["status", input.status || input.reviewStatus || input.review_status],
        ["plan_draft_id", input.planDraftId || input.plan_draft_id],
        ["task_card_id", input.taskCardId || input.task_card_id],
        ["evaluation_id", input.evaluationId || input.evaluation_id],
        ["profile_delta_id", input.profileDeltaId || input.profile_delta_id],
        ["evidence_id", input.evidenceId || input.evidence_id],
        ["correction_id", input.correctionId || input.correction_id],
        ["source_id", input.sourceId || input.source_id],
        ["review_id", input.reviewId || input.review_id || input.ownerAuditReviewId || input.owner_audit_review_id]
      ].forEach(([column, raw]) => {
        const value = cleanString(raw);
        if (value) {
          where.push(`${column} = ?`);
          values.push(value);
        }
      });
      const limit = normalizeLimit(input.limit, 20);
      const sql = `SELECT * FROM learning_growth_owner_audit_reviews${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC, updated_at DESC LIMIT ?`;
      return db.prepare(sql).all(...values, limit).map(publicLearningOwnerAuditReview);
    });
  }

  return {
    ensureSchema,
    recordReview,
    listReviews
  };
}

module.exports = {
  createLearningOwnerAuditReviewRepository,
  ensureLearningOwnerAuditReviewSchema,
  publicLearningOwnerAuditReview,
  scanPrivacyKeys
};
