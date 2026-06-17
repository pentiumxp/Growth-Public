"use strict";

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|access-key\.txt|launch-token)/i;

const ALLOWED_DECISIONS = new Set(["accepted", "needs_follow_up", "correction_recorded", "blocked"]);

function cleanString(value, max = 220) {
  const text = String(value || "").trim();
  return text.length > max ? text.slice(0, max) : text;
}

function boundedText(value, max = 360) {
  return cleanString(value, max);
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = [], max = 16) {
  return Array.from(new Set((Array.isArray(values) ? values : [values])
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean))).slice(0, max);
}

function scanPrivacy(value, path = "$", findings = [], privateValueFindings = []) {
  if (!value || typeof value !== "object") return { privacyFindings: findings, privateValueFindings };
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, `${path}[${index}]`, findings, privateValueFindings));
    return { privacyFindings: findings, privateValueFindings };
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (typeof child === "string" && PRIVATE_VALUE_PATTERN.test(child)) privateValueFindings.push(childPath);
    if (child && typeof child === "object") scanPrivacy(child, childPath, findings, privateValueFindings);
  }
  return { privacyFindings: findings, privateValueFindings };
}

function normalizeDecision(value) {
  const decision = cleanString(value || "accepted", 80).toLowerCase().replace(/-/g, "_");
  return ALLOWED_DECISIONS.has(decision) ? decision : "";
}

function normalizeStatus(value, decision) {
  const status = cleanString(value, 80).toLowerCase().replace(/-/g, "_");
  if (["reviewed", "needs_follow_up", "corrected", "blocked"].includes(status)) return status;
  if (decision === "needs_follow_up") return "needs_follow_up";
  if (decision === "correction_recorded") return "corrected";
  if (decision === "blocked") return "blocked";
  return "reviewed";
}

function selectorFromInput(input = {}) {
  return {
    workspaceId: cleanString(input.workspaceId || input.workspace_id, 180),
    learnerId: cleanString(input.learnerId || input.learner_id || input.workspaceId || input.workspace_id, 180),
    displayName: cleanString(input.displayName || input.display_name || input.label, 180),
    label: cleanString(input.label || input.displayName || input.display_name, 180),
    programId: cleanString(input.programId || input.program_id, 180),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id, 180),
    domain: cleanString(input.domain, 120),
    subject: cleanString(input.subject, 120),
    horizon: cleanString(input.horizon || "daily_plan", 80) || "daily_plan",
    availableMinutes: Number(input.availableMinutes || input.available_minutes || 15) || 15,
    planDraftId: cleanString(input.planDraftId || input.plan_draft_id, 180),
    taskCardId: cleanString(input.taskCardId || input.task_card_id, 180),
    evaluationId: cleanString(input.evaluationId || input.evaluation_id, 180),
    profileDeltaId: cleanString(input.profileDeltaId || input.profile_delta_id, 180),
    evidenceId: cleanString(input.evidenceId || input.evidence_id, 180),
    correctionId: cleanString(input.correctionId || input.correction_id, 180),
    sourceId: cleanString(input.sourceId || input.source_id, 180),
    targetNodeIds: uniqueStrings(input.targetNodeIds || input.target_node_ids || input.nodeIds || input.node_ids, 16),
    autoSelectCompletedCycle: input.autoSelectCompletedCycle === true || input.auto_select_completed_cycle === true,
    autoSelectLatestCompletedCycle: input.autoSelectLatestCompletedCycle === true || input.auto_select_latest_completed_cycle === true,
    limit: Math.max(1, Math.min(50, Number(input.limit || 12) || 12))
  };
}

function selectedCycleSummary(feedback = {}) {
  const summary = asObject(feedback.summary);
  const selected = asObject(feedback.selectedCompletedCycle || asObject(feedback.autoSelection).selected);
  return {
    cycleId: cleanString(summary.selectedCycleId || selected.cycleId, 180),
    taskCardId: cleanString(summary.selectedTaskCardId || selected.taskCardId, 180),
    evaluationId: cleanString(selected.evaluationId, 180),
    planDraftId: cleanString(selected.planDraftId, 180),
    profileDeltaId: cleanString(selected.profileDeltaId, 180),
    evidenceId: cleanString(selected.evidenceId, 180),
    completedAt: cleanString(selected.completedAt || selected.latestActivityAt, 120)
  };
}

function feedbackSummary(feedback = {}) {
  const summary = asObject(feedback.summary);
  const evidence = asObject(feedback.evidence);
  const profileDelta = asObject(feedback.profileDelta);
  const profile = asObject(feedback.profile);
  const loopState = asObject(feedback.loopState);
  const reward = asObject(loopState.reward);
  const selectedCycle = selectedCycleSummary(feedback);
  return {
    status: cleanString(feedback.status || feedback.error, 120),
    readyForNextPlan: feedback.readyForNextPlan === true || summary.readyForNextPlan === true,
    cycleComplete: feedback.complete === true || summary.cycleComplete === true,
    readyForAutomation: feedback.readyForAutomation === true,
    missingRequired: uniqueStrings(summary.missingRequired, 12),
    evidenceCount: Number(summary.evidenceCount || evidence.count || 0) || 0,
    profileDeltaCount: Number(summary.profileDeltaCount || profileDelta.count || 0) || 0,
    profileEvidenceCount: Number(summary.profileEvidenceCount || profile.evidenceCount || 0) || 0,
    profileWeaknessCount: Number(summary.profileWeaknessCount || profile.weaknessCount || 0) || 0,
    rewardSettlementCount: Number(summary.rewardSettlementCount || reward.rewardSettlementCount || 0) || 0,
    totalRewardCoins: Number(summary.totalRewardCoins || reward.totalRewardCoins || 0) || 0,
    recommendationStrategy: cleanString(summary.recommendationStrategy, 120),
    loopStatus: cleanString(summary.loopStatus || loopState.status, 120),
    nextAction: cleanString(summary.nextAction || asObject(loopState.nextAction).action, 140),
    selectedCycle
  };
}

function auditSummary(feedback = {}) {
  const checks = asArray(feedback.checks);
  const statusCount = (status) => checks.filter((check) => asObject(check).status === status).length;
  const summary = feedbackSummary(feedback);
  return {
    checkCount: checks.length,
    passCheckCount: statusCount("pass"),
    missingCheckCount: statusCount("missing"),
    blockedCheckCount: statusCount("blocked"),
    missingRequiredCount: summary.missingRequired.length,
    cycleComplete: summary.cycleComplete,
    readyForNextPlan: summary.readyForNextPlan,
    readyForAutomation: summary.readyForAutomation
  };
}

function recommendationSummary(feedback = {}) {
  const recommendation = asObject(feedback.recommendation);
  return {
    available: recommendation.available === true,
    mode: cleanString(recommendation.mode, 120),
    status: cleanString(recommendation.status, 120),
    strategy: cleanString(recommendation.strategy, 120),
    cardRole: cleanString(recommendation.cardRole, 120),
    targetNodeId: cleanString(recommendation.targetNodeId, 180),
    targetNodeIds: uniqueStrings(recommendation.targetNodeIds, 12)
  };
}

function nextActionSummary(feedback = {}) {
  const loopState = asObject(feedback.loopState);
  const nextAction = asObject(loopState.nextAction);
  return {
    status: cleanString(loopState.status, 120),
    action: cleanString(nextAction.action || asObject(feedback.summary).nextAction, 140),
    enabled: nextAction.enabled !== false,
    targetNodeId: cleanString(nextAction.targetNodeId, 180)
  };
}

function reviewSelector(selector = {}, feedback = {}) {
  const scope = asObject(feedback.scope);
  const selectedCycle = selectedCycleSummary(feedback);
  return {
    workspaceId: cleanString(scope.workspaceId || selector.workspaceId, 180),
    learnerId: cleanString(scope.learnerId || selector.learnerId, 180),
    programId: cleanString(scope.programId || selector.programId, 180),
    domainPackId: cleanString(scope.domainPackId || selector.domainPackId, 180),
    domain: cleanString(scope.domain || selector.domain, 120),
    subject: cleanString(scope.subject || selector.subject, 120),
    horizon: cleanString(scope.horizon || selector.horizon || "daily_plan", 80),
    planDraftId: cleanString(scope.planDraftId || selectedCycle.planDraftId || selector.planDraftId, 180),
    taskCardId: cleanString(scope.taskCardId || selectedCycle.taskCardId || selector.taskCardId, 180),
    evaluationId: cleanString(scope.evaluationId || selectedCycle.evaluationId || selector.evaluationId, 180),
    profileDeltaId: cleanString(scope.profileDeltaId || selectedCycle.profileDeltaId || selector.profileDeltaId, 180),
    evidenceId: cleanString(scope.evidenceId || selectedCycle.evidenceId || selector.evidenceId, 180),
    correctionId: cleanString(scope.correctionId || selector.correctionId, 180),
    sourceId: cleanString(scope.sourceId || selector.sourceId, 180),
    targetNodeIds: uniqueStrings(scope.targetNodeIds && scope.targetNodeIds.length ? scope.targetNodeIds : selector.targetNodeIds, 16),
    selectedCycleId: cleanString(selectedCycle.cycleId, 180)
  };
}

function hasCycleSelector(selector = {}) {
  return Boolean(selector.planDraftId || selector.taskCardId || selector.evaluationId || selector.profileDeltaId || selector.evidenceId || selector.correctionId || selector.sourceId);
}

function publicList(reviews = [], input = {}) {
  return {
    ok: true,
    source: "growth-learning-owner-audit-review-service",
    schemaVersion: "growth.learningOwnerAuditReviewList.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    workspaceId: cleanString(input.workspaceId || input.workspace_id, 180),
    learnerId: cleanString(input.learnerId || input.learner_id || input.workspaceId || input.workspace_id, 180),
    count: reviews.length,
    reviews
  };
}

function createLearningOwnerAuditReviewService(options = {}) {
  const repository = options.repository || null;
  const profileFeedbackService = options.profileFeedbackService || null;
  const now = typeof options.now === "function" ? options.now : () => new Date();

  function listReviews(input = {}) {
    if (!repository || typeof repository.listReviews !== "function") {
      return { ok: false, available: false, error: "learning_owner_audit_review_repository_unavailable" };
    }
    const scan = scanPrivacy(input);
    if (scan.privacyFindings.length || scan.privateValueFindings.length) {
      return Object.assign({ ok: false, error: "learning_owner_audit_review_privacy_failed" }, scan);
    }
    const selector = selectorFromInput(input);
    if (!selector.workspaceId) return { ok: false, error: "learning_owner_audit_review_workspace_required" };
    return publicList(repository.listReviews(Object.assign({}, input, selector)), selector);
  }

  function review(input = {}) {
    if (!repository || typeof repository.recordReview !== "function") {
      return { ok: false, available: false, error: "learning_owner_audit_review_repository_unavailable" };
    }
    if (!profileFeedbackService || typeof profileFeedbackService.evaluate !== "function") {
      return { ok: false, available: false, error: "learning_owner_audit_review_profile_feedback_unavailable" };
    }
    const scan = scanPrivacy(input);
    if (scan.privacyFindings.length || scan.privateValueFindings.length) {
      return Object.assign({ ok: false, error: "learning_owner_audit_review_privacy_failed" }, scan);
    }
    const selector = selectorFromInput(input);
    if (!selector.workspaceId) return { ok: false, error: "learning_owner_audit_review_workspace_required" };
    if (!hasCycleSelector(selector) && !selector.autoSelectCompletedCycle && !selector.autoSelectLatestCompletedCycle) {
      return { ok: false, error: "learning_owner_audit_review_cycle_selector_required" };
    }
    const decision = normalizeDecision(input.decision || input.reviewDecision || input.review_decision);
    if (!decision) return { ok: false, error: "learning_owner_audit_review_decision_invalid" };
    const status = normalizeStatus(input.status || input.reviewStatus || input.review_status, decision);
    const feedback = profileFeedbackService.evaluate(selector);
    if (!feedback || feedback.ok === false) {
      if (decision !== "blocked") {
        return {
          ok: false,
          source: "growth-learning-owner-audit-review-service",
          error: cleanString(feedback?.error || "learning_owner_audit_review_profile_feedback_failed", 180),
          profileFeedback: feedback || null
        };
      }
    }
    const normalizedSelector = reviewSelector(selector, feedback || {});
    if (decision === "correction_recorded" && !normalizedSelector.correctionId) {
      return { ok: false, error: "learning_owner_audit_review_correction_required" };
    }
    const reviewedAt = cleanString(input.reviewedAt || input.reviewed_at || input.createdAt || input.created_at, 120) || now().toISOString();
    const record = {
      workspaceId: normalizedSelector.workspaceId,
      learnerId: normalizedSelector.learnerId,
      programId: normalizedSelector.programId,
      domainPackId: normalizedSelector.domainPackId,
      domain: normalizedSelector.domain,
      subject: normalizedSelector.subject,
      horizon: normalizedSelector.horizon,
      decision,
      status,
      planDraftId: normalizedSelector.planDraftId,
      taskCardId: normalizedSelector.taskCardId,
      evaluationId: normalizedSelector.evaluationId,
      profileDeltaId: normalizedSelector.profileDeltaId,
      evidenceId: normalizedSelector.evidenceId,
      correctionId: normalizedSelector.correctionId,
      sourceId: normalizedSelector.sourceId,
      targetNodeIds: normalizedSelector.targetNodeIds,
      selector: normalizedSelector,
      feedbackSummary: feedbackSummary(feedback || {}),
      auditSummary: auditSummary(feedback || {}),
      recommendation: recommendationSummary(feedback || {}),
      nextAction: nextActionSummary(feedback || {}),
      ownerNote: boundedText(input.ownerNote || input.owner_note || input.note, 360),
      reviewedBy: cleanString(input.reviewedBy || input.reviewed_by || input.requestedBy || input.requested_by, 180),
      privacyClass: "summary_only",
      reviewedAt
    };
    const stored = repository.recordReview(record);
    if (!stored?.ok) return stored || { ok: false, error: "learning_owner_audit_review_record_failed" };
    const result = {
      ok: true,
      duplicate: stored.duplicate === true,
      source: "growth-learning-owner-audit-review-service",
      schemaVersion: "growth.learningOwnerAuditReview.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      decision,
      status,
      scope: normalizedSelector,
      review: stored.review,
      profileFeedback: {
        ok: feedback?.ok === true,
        status: cleanString(feedback?.status || feedback?.error, 120),
        summary: record.feedbackSummary
      },
      auditSummary: record.auditSummary,
      recommendation: record.recommendation,
      nextAction: record.nextAction
    };
    const outputScan = scanPrivacy(result);
    if (outputScan.privacyFindings.length || outputScan.privateValueFindings.length) {
      return Object.assign({ ok: false, error: "learning_owner_audit_review_output_privacy_failed" }, outputScan);
    }
    return result;
  }

  return {
    listReviews,
    review
  };
}

module.exports = {
  createLearningOwnerAuditReviewService
};
