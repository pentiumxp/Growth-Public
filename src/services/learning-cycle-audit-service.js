"use strict";

function cleanString(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(value = []) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  return Array.from(new Set(values.map(cleanString).filter(Boolean)));
}

function boundedText(value, max = 320) {
  return cleanString(value).slice(0, max);
}

function clampLimit(value, fallback = 20) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(50, Math.round(parsed)));
}

function publicTarget(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id);
  const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
  return {
    workspaceId,
    learnerId,
    displayName: cleanString(input.displayName || input.label)
  };
}

function publicPlanDraft(item = {}) {
  const publishAttempt = item.publishAttempt || {};
  return {
    planDraftId: cleanString(item.planDraftId),
    workspaceId: cleanString(item.workspaceId),
    learnerId: cleanString(item.learnerId),
    programId: cleanString(item.programId),
    horizon: cleanString(item.horizon),
    status: cleanString(item.status),
    selectedItemId: cleanString(item.selectedItemId),
    generatedTaskCardId: cleanString(item.generatedTaskCardId),
    generatedLearningGraphPlanId: cleanString(item.generatedLearningGraphPlanId),
    targetNodeIds: uniqueStrings(item.targetNodeIds).slice(0, 12),
    basisEvidenceIds: uniqueStrings(item.basisEvidenceIds).slice(0, 12),
    publishAttempt: {
      status: cleanString(publishAttempt.status),
      error: boundedText(publishAttempt.error, 120),
      stage: cleanString(publishAttempt.stage),
      selectedItemId: cleanString(publishAttempt.selectedItemId),
      attemptedAt: cleanString(publishAttempt.attemptedAt),
      attemptCount: Number(publishAttempt.attemptCount || 0) || 0
    },
    planSummary: boundedText(item.planSummary, 320),
    selectedItem: item.selectedItem ? publicPlanItem(item.selectedItem) : null,
    createdAt: cleanString(item.createdAt),
    updatedAt: cleanString(item.updatedAt),
    publishedAt: cleanString(item.publishedAt),
    privacyClass: cleanString(item.privacyClass)
  };
}

function publicPlanItem(item = {}) {
  return {
    itemId: cleanString(item.itemId),
    cardRole: cleanString(item.cardRole),
    subject: cleanString(item.subject),
    targetNodeIds: uniqueStrings(item.targetNodeIds).slice(0, 12),
    estimatedMinutes: Number(item.estimatedMinutes || 0) || 0,
    difficultyBand: cleanString(item.difficultyBand),
    supportLevel: cleanString(item.supportLevel),
    evidenceRequirements: uniqueStrings(item.evidenceRequirements).slice(0, 8),
    reason: boundedText(item.reason, 260)
  };
}

function publicEvidence(item = {}) {
  const summary = item.summary || {};
  return {
    evidenceId: cleanString(item.evidenceId),
    workspaceId: cleanString(item.workspaceId),
    learnerId: cleanString(item.learnerId),
    programId: cleanString(item.programId),
    graphNodeId: cleanString(item.graphNodeId),
    graphNodeIds: uniqueStrings(item.graphNodeIds).slice(0, 12),
    sourceType: cleanString(item.sourceType),
    sourceId: cleanString(item.sourceId),
    sourceTaskCardId: cleanString(item.sourceTaskCardId),
    cardRole: cleanString(item.cardRole),
    scoreBand: cleanString(item.scoreBand),
    status: cleanString(item.status),
    evidenceWeight: Number(item.evidenceWeight || 0) || 0,
    confidence: Number(item.confidence || 0) || 0,
    summary: {
      summaryOnly: summary.summaryOnly !== false,
      taskCardId: cleanString(summary.taskCardId),
      title: boundedText(summary.title, 120),
      feedbackSummary: boundedText(summary.feedbackSummary || summary.summary || summary.reflectionSummary, 260),
      correctionId: cleanString(summary.correctionId),
      profileDeltaId: cleanString(summary.profileDeltaId),
      evaluationId: cleanString(summary.evaluationId),
      sourceEvidenceIds: uniqueStrings(summary.sourceEvidenceIds).slice(0, 12)
    },
    createdAt: cleanString(item.createdAt),
    updatedAt: cleanString(item.updatedAt),
    privacyClass: cleanString(item.privacyClass)
  };
}

function publicProfileDelta(item = {}) {
  return {
    profileDeltaId: cleanString(item.profileDeltaId),
    workspaceId: cleanString(item.workspaceId),
    learnerId: cleanString(item.learnerId),
    programId: cleanString(item.programId),
    taskCardId: cleanString(item.taskCardId),
    submissionId: cleanString(item.submissionId),
    evaluationId: cleanString(item.evaluationId),
    targetNodeIds: uniqueStrings(item.targetNodeIds).slice(0, 12),
    evidenceIds: uniqueStrings(item.evidenceIds).slice(0, 12),
    changedCapabilityCount: Number(item.changedCapabilityCount || 0) || 0,
    profileStateChanged: Boolean(item.profileStateChanged),
    summary: publicProfileDeltaSummary(item.summary || {}),
    changedCapabilities: asArray(item.changedCapabilities).map(publicChangedCapability).filter((entry) => entry.nodeId).slice(0, 8),
    createdAt: cleanString(item.createdAt),
    updatedAt: cleanString(item.updatedAt),
    privacyClass: cleanString(item.privacyClass)
  };
}

function publicProfileDeltaSummary(summary = {}) {
  return {
    changedCapabilityCount: Number(summary.changedCapabilityCount || 0) || 0,
    profileStateChanged: Boolean(summary.profileStateChanged),
    plannerHintChanged: Boolean(summary.plannerHintChanged),
    latestEvidenceAt: cleanString(summary.latestEvidenceAt),
    note: boundedText(summary.note || summary.summary, 260)
  };
}

function publicChangedCapability(item = {}) {
  return {
    nodeId: cleanString(item.nodeId || item.graphNodeId),
    beforeState: cleanString(item.beforeState || item.before_state),
    afterState: cleanString(item.afterState || item.after_state),
    evidenceFreshnessChanged: Boolean(item.evidenceFreshnessChanged),
    newlyStaleReasons: uniqueStrings(item.newlyStaleReasons || item.newly_stale_reasons).slice(0, 6),
    resolvedStaleReasons: uniqueStrings(item.resolvedStaleReasons || item.resolved_stale_reasons).slice(0, 6)
  };
}

function publicCorrection(item = {}) {
  return {
    correctionId: cleanString(item.correctionId),
    workspaceId: cleanString(item.workspaceId),
    learnerId: cleanString(item.learnerId),
    programId: cleanString(item.programId),
    reviewAction: cleanString(item.reviewAction),
    status: cleanString(item.status),
    targetNodeIds: uniqueStrings(item.targetNodeIds).slice(0, 12),
    evidenceIds: uniqueStrings(item.evidenceIds).slice(0, 12),
    profileDeltaId: cleanString(item.profileDeltaId),
    taskCardId: cleanString(item.taskCardId),
    evaluationId: cleanString(item.evaluationId),
    sourceEvidenceIds: uniqueStrings(item.sourceEvidenceIds).slice(0, 12),
    reviewedBy: cleanString(item.reviewedBy),
    reason: boundedText(item.reason, 260),
    note: boundedText(item.note, 260),
    createdAt: cleanString(item.createdAt),
    updatedAt: cleanString(item.updatedAt),
    privacyClass: cleanString(item.privacyClass)
  };
}

function targetNodeIdsFor(item = {}) {
  return uniqueStrings([
    item.graphNodeId,
    ...uniqueStrings(item.graphNodeIds),
    ...uniqueStrings(item.targetNodeIds),
    ...asArray(item.changedCapabilities).flatMap((entry) => [entry.nodeId, entry.graphNodeId])
  ]);
}

function intersectsFilter(itemNodeIds = [], filterNodeIds = []) {
  const filters = uniqueStrings(filterNodeIds);
  if (!filters.length) return true;
  const nodes = new Set(uniqueStrings(itemNodeIds));
  return filters.some((nodeId) => nodes.has(nodeId));
}

function matchesCycle(item = {}, filters = {}, kind = "") {
  if (filters.planDraftId && kind === "plan" && item.planDraftId !== filters.planDraftId) return false;
  if (filters.taskCardId) {
    const taskCardId = kind === "plan"
      ? item.generatedTaskCardId
      : (item.taskCardId || item.sourceTaskCardId || item.summary?.taskCardId);
    if (taskCardId && taskCardId !== filters.taskCardId) return false;
    if (!taskCardId && kind !== "plan") return false;
  }
  if (filters.evaluationId && ["evidence", "profileDelta", "correction"].includes(kind)) {
    const evaluationId = item.evaluationId || item.summary?.evaluationId || (
      item.sourceType && item.sourceType.includes("evaluation") ? item.sourceId : ""
    );
    if (evaluationId && evaluationId !== filters.evaluationId) return false;
    if (!evaluationId) return false;
  }
  if (filters.profileDeltaId && ["profileDelta", "correction"].includes(kind)) {
    if (item.profileDeltaId !== filters.profileDeltaId) return false;
  }
  if (filters.evidenceId && kind === "evidence" && item.evidenceId !== filters.evidenceId) return false;
  if (filters.correctionId && kind === "correction" && item.correctionId !== filters.correctionId) return false;
  return intersectsFilter(targetNodeIdsFor(item), filters.targetNodeIds);
}

function latestTimestamp(values = []) {
  return uniqueStrings(values).sort().pop() || "";
}

function timelineEntry(kind, item = {}) {
  if (kind === "plan") {
    return {
      type: "plan",
      id: item.planDraftId,
      at: item.publishedAt || item.updatedAt || item.createdAt,
      status: item.status,
      planDraftId: item.planDraftId,
      taskCardId: item.generatedTaskCardId,
      learningGraphPlanId: item.generatedLearningGraphPlanId,
      targetNodeIds: item.targetNodeIds,
      summary: boundedText(item.planSummary || item.selectedItem?.reason, 220)
    };
  }
  if (kind === "publishAttempt") {
    const attempt = item.publishAttempt || {};
    return {
      type: "plan_publish_attempt",
      id: `${item.planDraftId}:publish_attempt`,
      at: attempt.attemptedAt,
      status: attempt.status,
      planDraftId: item.planDraftId,
      selectedItemId: attempt.selectedItemId,
      taskCardId: item.generatedTaskCardId,
      error: attempt.error,
      stage: attempt.stage,
      targetNodeIds: item.targetNodeIds,
      summary: boundedText(attempt.error || attempt.status, 220)
    };
  }
  if (kind === "evidence") {
    return {
      type: "evidence",
      id: item.evidenceId,
      at: item.createdAt || item.updatedAt,
      status: item.status,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      taskCardId: item.sourceTaskCardId || item.summary?.taskCardId,
      evaluationId: item.summary?.evaluationId || (item.sourceType.includes("evaluation") ? item.sourceId : ""),
      targetNodeIds: targetNodeIdsFor(item),
      summary: boundedText(item.summary?.feedbackSummary || item.summary?.title, 220)
    };
  }
  if (kind === "profileDelta") {
    return {
      type: "profile_delta",
      id: item.profileDeltaId,
      at: item.createdAt || item.updatedAt,
      status: item.profileStateChanged ? "changed" : "unchanged",
      profileDeltaId: item.profileDeltaId,
      taskCardId: item.taskCardId,
      evaluationId: item.evaluationId,
      targetNodeIds: targetNodeIdsFor(item),
      summary: `${item.changedCapabilityCount} changed capabilities`
    };
  }
  return {
    type: "correction",
    id: item.correctionId,
    at: item.createdAt || item.updatedAt,
    status: item.status,
    correctionId: item.correctionId,
    taskCardId: item.taskCardId,
    evaluationId: item.evaluationId,
    profileDeltaId: item.profileDeltaId,
    targetNodeIds: item.targetNodeIds,
    summary: boundedText(item.reason || item.note, 220)
  };
}

function publicFailure(result = {}, fallbackError) {
  return {
    ok: false,
    available: result.available !== false,
    error: cleanString(result.error || fallbackError)
  };
}

function createLearningCycleAuditService(options = {}) {
  const planAuditService = options.planAuditService || null;
  const evidenceAuditService = options.evidenceAuditService || null;
  const profileDeltaAuditService = options.profileDeltaAuditService || null;
  const ownerCorrectionService = options.ownerCorrectionService || null;

  function callRead(service, methodName, input, unavailableError) {
    if (!service || typeof service[methodName] !== "function") {
      return { ok: false, available: false, error: unavailableError };
    }
    try {
      return service[methodName](input);
    } catch (error) {
      return {
        ok: false,
        available: false,
        error: unavailableError,
        detail: boundedText(error && error.message ? error.message : error, 180)
      };
    }
  }

  function listCycleAudit(input = {}) {
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    if (!workspaceId) return { ok: false, error: "learning_cycle_audit_workspace_required" };
    const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
    const programId = cleanString(input.programId || input.program_id);
    const targetNodeIds = uniqueStrings(input.targetNodeIds || input.target_node_ids || input.nodeIds || input.node_ids).slice(0, 12);
    const limit = clampLimit(input.limit);
    const filters = {
      programId,
      planDraftId: cleanString(input.planDraftId || input.plan_draft_id),
      taskCardId: cleanString(input.taskCardId || input.task_card_id || input.sourceTaskCardId || input.source_task_card_id),
      evaluationId: cleanString(input.evaluationId || input.evaluation_id),
      profileDeltaId: cleanString(input.profileDeltaId || input.profile_delta_id),
      evidenceId: cleanString(input.evidenceId || input.evidence_id),
      correctionId: cleanString(input.correctionId || input.correction_id),
      sourceId: cleanString(input.sourceId || input.source_id),
      targetNodeIds,
      limit
    };
    const baseInput = {
      workspaceId,
      learnerId,
      displayName: cleanString(input.displayName || input.label),
      label: cleanString(input.label || input.displayName),
      programId,
      targetNodeIds,
      limit
    };
    const planResult = callRead(planAuditService, "listPlanDrafts", baseInput, "learning_cycle_audit_plan_service_unavailable");
    const evidenceResult = callRead(evidenceAuditService, "listEvidenceAudit", Object.assign({}, baseInput, {
      evidenceId: filters.evidenceId,
      sourceId: filters.sourceId || (filters.taskCardId ? "" : filters.evaluationId),
      taskCardId: filters.taskCardId
    }), "learning_cycle_audit_evidence_service_unavailable");
    const profileDeltaResult = callRead(profileDeltaAuditService, "listProfileDeltas", Object.assign({}, baseInput, {
      taskCardId: filters.taskCardId,
      evaluationId: filters.evaluationId,
      profileDeltaId: filters.profileDeltaId
    }), "learning_cycle_audit_profile_delta_service_unavailable");
    const correctionResult = callRead(ownerCorrectionService, "listCorrections", Object.assign({}, baseInput, {
      correctionId: filters.correctionId,
      sourceId: filters.correctionId
    }), "learning_cycle_audit_correction_service_unavailable");

    const planDrafts = asArray(planResult.planDrafts).map(publicPlanDraft).filter((item) => item.planDraftId).filter((item) => matchesCycle(item, filters, "plan")).slice(0, limit);
    const evidence = asArray(evidenceResult.evidence).map(publicEvidence).filter((item) => item.evidenceId).filter((item) => matchesCycle(item, filters, "evidence")).slice(0, limit);
    const profileDeltas = asArray(profileDeltaResult.profileDeltas).map(publicProfileDelta).filter((item) => item.profileDeltaId).filter((item) => matchesCycle(item, filters, "profileDelta")).slice(0, limit);
    const corrections = asArray(correctionResult.corrections).map(publicCorrection).filter((item) => item.correctionId).filter((item) => matchesCycle(item, filters, "correction")).slice(0, limit);
    const timeline = [
      ...planDrafts.map((item) => timelineEntry("plan", item)),
      ...planDrafts
        .filter((item) => cleanString(item.publishAttempt?.attemptedAt))
        .map((item) => timelineEntry("publishAttempt", item)),
      ...evidence.map((item) => timelineEntry("evidence", item)),
      ...profileDeltas.map((item) => timelineEntry("profileDelta", item)),
      ...corrections.map((item) => timelineEntry("correction", item))
    ]
      .filter((item) => item.id)
      .sort((left, right) => cleanString(right.at).localeCompare(cleanString(left.at)))
      .slice(0, limit);
    const subResults = [planResult, evidenceResult, profileDeltaResult, correctionResult];
    const partialFailures = subResults.filter((result) => !result?.ok).map((result) => cleanString(result.error)).filter(Boolean);
    const anyOk = subResults.some((result) => result?.ok);
    if (!anyOk) {
      return {
        ok: false,
        available: false,
        error: "learning_cycle_audit_unavailable",
        partialFailures
      };
    }
    return {
      ok: true,
      available: true,
      source: "growth-learning-cycle-audit-service",
      target: publicTarget(Object.assign({}, baseInput, { learnerId })),
      filters,
      summary: {
        planDraftCount: planDrafts.length,
        evidenceCount: evidence.length,
        profileDeltaCount: profileDeltas.length,
        correctionCount: corrections.length,
        failedPublishAttemptCount: planDrafts.filter((item) => cleanString(item.publishAttempt?.status) === "failed").length,
        blockedPublishAttemptCount: planDrafts.filter((item) => cleanString(item.publishAttempt?.status) === "blocked").length,
        hasPublishedPlan: planDrafts.some((item) => item.status === "published"),
        hasEvaluationEvidence: evidence.some((item) => item.sourceType.includes("evaluation") || (filters.evaluationId && item.sourceId === filters.evaluationId)),
        hasProfileDelta: profileDeltas.length > 0,
        hasCorrections: corrections.length > 0,
        latestActivityAt: latestTimestamp(timeline.map((item) => item.at))
      },
      partialFailures,
      planAudit: planResult.ok ? {
        ok: true,
        available: true,
        source: cleanString(planResult.source),
        count: planDrafts.length,
        planDrafts
      } : publicFailure(planResult, "learning_cycle_audit_plan_failed"),
      evidenceAudit: evidenceResult.ok ? {
        ok: true,
        available: true,
        source: cleanString(evidenceResult.source),
        count: evidence.length,
        evidence
      } : publicFailure(evidenceResult, "learning_cycle_audit_evidence_failed"),
      profileDeltaAudit: profileDeltaResult.ok ? {
        ok: true,
        available: true,
        source: cleanString(profileDeltaResult.source),
        count: profileDeltas.length,
        profileDeltas
      } : publicFailure(profileDeltaResult, "learning_cycle_audit_profile_delta_failed"),
      profileCorrections: correctionResult.ok ? {
        ok: true,
        available: true,
        source: cleanString(correctionResult.source),
        count: corrections.length,
        corrections
      } : publicFailure(correctionResult, "learning_cycle_audit_correction_failed"),
      timeline
    };
  }

  return {
    listCycleAudit
  };
}

module.exports = {
  createLearningCycleAuditService
};
