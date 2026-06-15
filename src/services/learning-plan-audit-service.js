"use strict";

function cleanString(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

function boundedText(value, max = 320) {
  return cleanString(value).slice(0, max);
}

function clampLimit(value, fallback = 12) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(50, Math.round(parsed)));
}

function publicPressurePolicy(policy = {}) {
  return {
    completionPolicy: cleanString(policy.completionPolicy || policy.completion_policy),
    passScoreRequired: Boolean(policy.passScoreRequired ?? policy.pass_score_required)
  };
}

function publicActivationPolicy(policy = {}) {
  return {
    activateThrough: cleanString(policy.activateThrough || policy.activate_through),
    reason: boundedText(policy.reason, 220)
  };
}

function publicPlanItem(item = {}) {
  const targetNodeIds = uniqueStrings(item.targetNodeIds || item.target_node_ids || item.nodeIds || item.node_ids).slice(0, 12);
  return {
    itemId: cleanString(item.itemId || item.item_id),
    cardRole: cleanString(item.cardRole || item.card_role),
    subject: cleanString(item.subject),
    targetNodeIds,
    assessmentCoverageNodeIds: uniqueStrings(item.assessmentCoverageNodeIds || item.assessment_coverage_node_ids).slice(0, 12),
    estimatedMinutes: Number(item.estimatedMinutes || item.estimated_minutes || 0) || 0,
    difficultyBand: cleanString(item.difficultyBand || item.difficulty_band),
    supportLevel: cleanString(item.supportLevel || item.support_level),
    evidenceRequirements: uniqueStrings(item.evidenceRequirements || item.evidence_requirements).slice(0, 8),
    reason: boundedText(item.reason, 260),
    pressurePolicy: publicPressurePolicy(item.pressurePolicy || item.pressure_policy || {}),
    activationPolicy: publicActivationPolicy(item.activationPolicy || item.activation_policy || {})
  };
}

function selectedItemFromDraft(planDraft = {}) {
  const selectedItemId = cleanString(planDraft.selectedItemId || planDraft.selected_item_id);
  if (!selectedItemId) return null;
  return asArray(planDraft.draft?.items).find((item) => cleanString(item.itemId || item.item_id) === selectedItemId) || null;
}

function targetNodeIdsForDraft(planDraft = {}) {
  return uniqueStrings(asArray(planDraft.draft?.items).flatMap((item) => item.targetNodeIds || item.target_node_ids || []));
}

function publicPlanDraft(planDraft = {}) {
  const selectedItem = selectedItemFromDraft(planDraft);
  const audit = planDraft.draft?.audit || {};
  const publishAttempt = planDraft.publishAttempt || {};
  return {
    planDraftId: cleanString(planDraft.planDraftId),
    workspaceId: cleanString(planDraft.workspaceId),
    learnerId: cleanString(planDraft.learnerId),
    programId: cleanString(planDraft.programId),
    horizon: cleanString(planDraft.horizon),
    status: cleanString(planDraft.status),
    planSummary: boundedText(planDraft.planSummary, 320),
    schemaVersion: cleanString(planDraft.draft?.schemaVersion),
    selectedItemId: cleanString(planDraft.selectedItemId),
    generatedTaskCardId: cleanString(planDraft.generatedTaskCardId),
    generatedLearningGraphPlanId: cleanString(planDraft.generatedLearningGraphPlanId),
    targetNodeIds: targetNodeIdsForDraft(planDraft).slice(0, 12),
    basisEvidenceIds: uniqueStrings(audit.basisEvidenceIds || audit.basis_evidence_ids).slice(0, 12),
    profileSnapshotId: cleanString(audit.profileSnapshotId || audit.profile_snapshot_id),
    publishAttempt: {
      status: cleanString(publishAttempt.status),
      error: boundedText(publishAttempt.error, 120),
      stage: cleanString(publishAttempt.stage),
      selectedItemId: cleanString(publishAttempt.selectedItemId),
      attemptedAt: cleanString(publishAttempt.attemptedAt),
      attemptCount: Number(publishAttempt.attemptCount || 0) || 0
    },
    itemCount: asArray(planDraft.draft?.items).length,
    items: asArray(planDraft.draft?.items).map(publicPlanItem).filter((item) => item.itemId).slice(0, 4),
    selectedItem: selectedItem ? publicPlanItem(selectedItem) : null,
    source: cleanString(planDraft.source),
    privacyClass: cleanString(planDraft.privacyClass),
    createdAt: cleanString(planDraft.createdAt),
    updatedAt: cleanString(planDraft.updatedAt),
    publishedAt: cleanString(planDraft.publishedAt)
  };
}

function intersects(left = [], right = []) {
  const rightSet = new Set(uniqueStrings(right));
  if (!rightSet.size) return true;
  return uniqueStrings(left).some((value) => rightSet.has(value));
}

function latestTimestamp(items = [], key) {
  return asArray(items)
    .map((item) => cleanString(item[key]))
    .filter(Boolean)
    .sort()
    .pop() || "";
}

function createLearningPlanAuditService(options = {}) {
  const repository = options.repository || null;

  function listPlanDrafts(input = {}) {
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    if (!workspaceId) return { ok: false, error: "learning_plan_audit_workspace_required" };
    if (!repository || typeof repository.listDrafts !== "function") {
      return { ok: false, available: false, error: "learning_plan_audit_repository_unavailable" };
    }
    const learnerId = cleanString(input.learnerId || input.learner_id);
    const programId = cleanString(input.programId || input.program_id);
    const targetNodeIds = uniqueStrings(input.targetNodeIds || input.target_node_ids || input.nodeIds || input.node_ids).slice(0, 12);
    const status = cleanString(input.status);
    const limit = clampLimit(input.limit);
    const rows = repository.listDrafts({
      workspaceId,
      learnerId,
      programId,
      status,
      limit
    });
    const planDrafts = asArray(rows)
      .map(publicPlanDraft)
      .filter((item) => item.planDraftId)
      .filter((item) => intersects(item.targetNodeIds, targetNodeIds))
      .slice(0, limit);
    const publishedDrafts = planDrafts.filter((item) => cleanString(item.status) === "published");
    const failedPublishAttempts = planDrafts.filter((item) => cleanString(item.publishAttempt?.status) === "failed");
    const blockedPublishAttempts = planDrafts.filter((item) => cleanString(item.publishAttempt?.status) === "blocked");
    return {
      ok: true,
      available: true,
      source: "growth-learning-plan-audit-service",
      target: {
        workspaceId,
        learnerId: learnerId || workspaceId,
        displayName: cleanString(input.displayName || input.label)
      },
      filters: {
        programId,
        status,
        targetNodeIds,
        limit
      },
      summary: {
        planDraftCount: planDrafts.length,
        publishedPlanCount: publishedDrafts.length,
        failedPublishAttemptCount: failedPublishAttempts.length,
        blockedPublishAttemptCount: blockedPublishAttempts.length,
        lastPlanAt: latestTimestamp(planDrafts, "updatedAt"),
        lastPublishedAt: latestTimestamp(publishedDrafts, "publishedAt"),
        lastPublishAttemptAt: latestTimestamp(planDrafts.map((item) => item.publishAttempt || {}), "attemptedAt")
      },
      count: planDrafts.length,
      planDrafts
    };
  }

  return {
    listPlanDrafts
  };
}

module.exports = {
  createLearningPlanAuditService
};
