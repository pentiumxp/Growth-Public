"use strict";

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization|owner.*note|note)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|access-key\.txt|launch-token)/i;

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
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

function unavailable(error, extra = {}) {
  return Object.assign({
    ok: false,
    available: false,
    source: "growth-learning-owner-review-signal-service",
    error: cleanString(error) || "learning_owner_review_signal_unavailable"
  }, extra);
}

function normalizeLimit(value, fallback = 12) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(50, Math.trunc(parsed)));
}

function publicScope(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id || input.targetWorkspaceId || input.target_workspace_id, 120);
  return {
    workspaceId,
    learnerId: cleanString(input.learnerId || input.learner_id || workspaceId, 120),
    programId: cleanString(input.programId || input.program_id, 120),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id, 120),
    domain: cleanString(input.domain, 80),
    subject: cleanString(input.subject, 80),
    horizon: cleanString(input.horizon || "daily_plan", 80) || "daily_plan",
    planDraftId: cleanString(input.planDraftId || input.plan_draft_id, 120),
    taskCardId: cleanString(input.taskCardId || input.task_card_id, 120),
    evaluationId: cleanString(input.evaluationId || input.evaluation_id, 120),
    profileDeltaId: cleanString(input.profileDeltaId || input.profile_delta_id, 120),
    evidenceId: cleanString(input.evidenceId || input.evidence_id, 120),
    correctionId: cleanString(input.correctionId || input.correction_id, 120),
    sourceId: cleanString(input.sourceId || input.source_id, 120),
    targetNodeIds: uniqueStrings(input.targetNodeIds || input.target_node_ids || input.nodeIds || input.node_ids, 12),
    limit: normalizeLimit(input.limit, 12)
  };
}

function repositoryQuery(scope = {}) {
  return {
    workspaceId: scope.workspaceId,
    learnerId: scope.learnerId,
    programId: scope.programId,
    domainPackId: scope.domainPackId,
    domain: scope.domain,
    subject: scope.subject,
    horizon: scope.horizon,
    planDraftId: scope.planDraftId,
    taskCardId: scope.taskCardId,
    evaluationId: scope.evaluationId,
    profileDeltaId: scope.profileDeltaId,
    evidenceId: scope.evidenceId,
    correctionId: scope.correctionId,
    sourceId: scope.sourceId,
    limit: scope.limit
  };
}

function reviewsFromResult(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.reviews)) return result.reviews;
  if (Array.isArray(result?.items)) return result.items;
  return [];
}

function timeValue(review = {}) {
  const parsed = Date.parse(review.updatedAt || review.updated_at || review.reviewedAt || review.reviewed_at || review.createdAt || review.created_at || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function intersectsTargetNodes(review = {}, targetNodeIds = []) {
  if (!targetNodeIds.length) return true;
  const reviewNodes = uniqueStrings(review.targetNodeIds || review.target_node_ids || review.selector?.targetNodeIds, 32);
  if (!reviewNodes.length) return true;
  return reviewNodes.some((nodeId) => targetNodeIds.includes(nodeId));
}

function publicReview(review = {}) {
  return {
    reviewId: cleanString(review.reviewId || review.review_id, 140),
    decision: cleanString(review.decision || review.reviewDecision || review.review_decision, 80),
    status: cleanString(review.status || review.reviewStatus || review.review_status, 80),
    taskCardId: cleanString(review.taskCardId || review.task_card_id, 140),
    evaluationId: cleanString(review.evaluationId || review.evaluation_id, 140),
    profileDeltaId: cleanString(review.profileDeltaId || review.profile_delta_id, 140),
    evidenceId: cleanString(review.evidenceId || review.evidence_id, 140),
    correctionId: cleanString(review.correctionId || review.correction_id, 140),
    sourceId: cleanString(review.sourceId || review.source_id, 140),
    targetNodeIds: uniqueStrings(review.targetNodeIds || review.target_node_ids || review.selector?.targetNodeIds, 12),
    reviewedAt: cleanString(review.reviewedAt || review.reviewed_at || review.createdAt || review.created_at, 80),
    updatedAt: cleanString(review.updatedAt || review.updated_at, 80)
  };
}

function plannerSignalFrom(latest = null, counts = {}) {
  const decision = cleanString(latest?.decision, 80);
  const status = cleanString(latest?.status, 80);
  const followUpRequired = decision === "needs_follow_up" || status === "needs_follow_up" || decision === "blocked" || status === "blocked";
  if (!latest) {
    return {
      status: "unreviewed",
      trustLevel: "unreviewed",
      followUpRequired: false,
      useForNextPlan: true,
      strategyBias: "use_profile_without_owner_review"
    };
  }
  if (decision === "blocked" || status === "blocked") {
    return {
      status: "blocked",
      trustLevel: "blocked",
      followUpRequired: true,
      useForNextPlan: false,
      strategyBias: "resolve_owner_review_blocker"
    };
  }
  if (decision === "needs_follow_up" || status === "needs_follow_up") {
    return {
      status: "needs_follow_up",
      trustLevel: "reviewed_follow_up",
      followUpRequired: true,
      useForNextPlan: true,
      strategyBias: "prefer_low_pressure_repair_or_owner_follow_up"
    };
  }
  if (decision === "correction_recorded" || status === "corrected" || counts.correctionRecordedCount > 0) {
    return {
      status: "correction_recorded",
      trustLevel: "owner_corrected",
      followUpRequired: false,
      useForNextPlan: true,
      strategyBias: "use_owner_corrected_profile_signal"
    };
  }
  return {
    status: "accepted",
    trustLevel: "owner_accepted",
    followUpRequired: false,
    useForNextPlan: true,
    strategyBias: "use_owner_accepted_profile_feedback"
  };
}

function createLearningOwnerReviewSignalService(options = {}) {
  const repository = options.repository || null;

  function ownerReviewSignal(input = {}) {
    if (!repository || typeof repository.listReviews !== "function") {
      return unavailable("learning_owner_review_signal_repository_unavailable");
    }
    const inputScan = scanPrivacy(input);
    if (inputScan.privacyFindings.length || inputScan.privateValueFindings.length) {
      return Object.assign(unavailable("learning_owner_review_signal_privacy_failed"), inputScan);
    }
    const scope = publicScope(input);
    if (!scope.workspaceId) return unavailable("learning_owner_review_signal_workspace_required");
    let listed;
    try {
      listed = repository.listReviews(repositoryQuery(scope));
    } catch (error) {
      return unavailable("learning_owner_review_signal_list_failed", {
        detail: cleanString(error && error.message ? error.message : error, 180)
      });
    }
    const reviews = reviewsFromResult(listed)
      .map(publicReview)
      .filter((review) => review.reviewId)
      .filter((review) => intersectsTargetNodes(review, scope.targetNodeIds))
      .sort((a, b) => timeValue(b) - timeValue(a))
      .slice(0, scope.limit);
    const counts = {
      acceptedCount: reviews.filter((review) => review.decision === "accepted").length,
      needsFollowUpCount: reviews.filter((review) => review.decision === "needs_follow_up" || review.status === "needs_follow_up").length,
      correctionRecordedCount: reviews.filter((review) => review.decision === "correction_recorded" || review.status === "corrected").length,
      blockedCount: reviews.filter((review) => review.decision === "blocked" || review.status === "blocked").length
    };
    const latestReview = reviews[0] || null;
    const plannerSignal = plannerSignalFrom(latestReview, counts);
    const result = {
      ok: true,
      available: true,
      source: "growth-learning-owner-review-signal-service",
      schemaVersion: "growth.learningOwnerReviewSignal.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      scope,
      status: latestReview ? plannerSignal.status : "missing",
      reviewCount: reviews.length,
      latestReview,
      reviews: reviews.slice(0, 5),
      plannerSignal,
      nextAction: plannerSignal.followUpRequired
        ? {
          action: plannerSignal.status === "blocked" ? "resolve_owner_review_blocker" : "inspect_owner_follow_up",
          requiredActor: "owner",
          enabled: false,
          reason: plannerSignal.status
        }
        : {
          action: latestReview ? "use_reviewed_feedback_for_next_plan" : "optional_owner_review",
          requiredActor: "owner",
          enabled: true,
          reason: plannerSignal.status
        },
      summary: Object.assign({
        ownerReviewed: Boolean(latestReview),
        latestDecision: cleanString(latestReview?.decision, 80),
        latestStatus: cleanString(latestReview?.status, 80),
        latestReviewId: cleanString(latestReview?.reviewId, 140),
        followUpRequired: plannerSignal.followUpRequired,
        useForNextPlan: plannerSignal.useForNextPlan,
        strategyBias: plannerSignal.strategyBias,
        reviewCount: reviews.length
      }, counts)
    };
    const outputScan = scanPrivacy(result);
    if (outputScan.privacyFindings.length || outputScan.privateValueFindings.length) {
      return Object.assign(unavailable("learning_owner_review_signal_output_privacy_failed"), outputScan);
    }
    return result;
  }

  return {
    ownerReviewSignal
  };
}

module.exports = {
  createLearningOwnerReviewSignalService,
  publicScope,
  scanPrivacy
};
