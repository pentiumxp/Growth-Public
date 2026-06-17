"use strict";

const {
  createLearningCardGenerationRecipePolicyService
} = require("./learning-card-generation-recipe-policy-service");

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function bool(value) {
  return Boolean(value);
}

function isFanfanSampleTarget(target = {}) {
  const text = [
    target.workspaceId,
    target.growthWorkspaceId,
    target.learnerId,
    target.displayName,
    target.label
  ].map(cleanString).join(" ").toLowerCase();
  return /\bfan[\s_-]*fan\b/.test(text) || text.includes("fanfan") || text.includes("凡凡");
}

function nodePlan(node = {}, input = {}) {
  if (!node) return null;
  const targetNodeId = cleanString(node.nodeId);
  if (!targetNodeId) return null;
  const evidenceRequirements = asArray(node.evidenceRequired).map(cleanString).filter(Boolean);
  return {
    targetNodeId,
    targetNodeIds: [targetNodeId],
    domain: cleanString(node.domain) || "english",
    subject: cleanString(node.subject) || "english",
    title: cleanString(node.title),
    cardRole: cleanString(input.cardRole) || "practice",
    difficultyBand: cleanString(input.difficultyBand) || cleanString(node.stage) || "foundation",
    evidenceRequirements: evidenceRequirements.length ? evidenceRequirements : ["short_answer", "self_reflection_optional"]
  };
}

function planWithStrategy(plan = null, strategy = null) {
  if (!plan || !strategy?.ok) return plan;
  const targetNodeIds = asArray(strategy.targetNodeIds).map(cleanString).filter(Boolean);
  const targetNodeId = targetNodeIds[0] || plan.targetNodeId;
  return Object.assign({}, plan, {
    targetNodeId,
    targetNodeIds: targetNodeId ? [targetNodeId] : plan.targetNodeIds,
    cardRole: cleanString(strategy.cardRole) || plan.cardRole,
    difficultyBand: cleanString(strategy.difficultyBand) || plan.difficultyBand,
    supportLevel: cleanString(strategy.supportLevel),
    strategy: cleanString(strategy.strategy),
    strategyReason: cleanString(strategy.reason)
  });
}

function publicEvidenceBasis(basis = {}) {
  return {
    trajectoryId: cleanString(basis.trajectoryId),
    taskCardId: cleanString(basis.taskCardId),
    sourceEvaluationId: cleanString(basis.sourceEvaluationId),
    trajectoryUpdatedAt: cleanString(basis.trajectoryUpdatedAt),
    weakSignalCount: Number(basis.weakSignalCount || 0) || 0,
    weakStateCount: Number(basis.weakStateCount || 0) || 0,
    stableHighStateCount: Number(basis.stableHighStateCount || 0) || 0,
    highSignalCount: Number(basis.highSignalCount || 0) || 0
  };
}

function publicProfileSummary(summary = {}) {
  return {
    masteryStateCount: Number(summary.masteryStateCount || 0) || 0,
    weaknessCount: Number(summary.weaknessCount || 0) || 0,
    strengthCount: Number(summary.strengthCount || 0) || 0,
    recentExperienceSignalCount: Number(summary.recentExperienceSignalCount || 0) || 0,
    recentTrajectoryCount: Number(summary.recentTrajectoryCount || 0) || 0,
    lastTrajectoryAt: cleanString(summary.lastTrajectoryAt)
  };
}

function publicNextCardRecommendation(selection = {}, strategy = {}) {
  const targetNodeIds = asArray(selection.targetNodeIds).map(cleanString).filter(Boolean).length
    ? asArray(selection.targetNodeIds).map(cleanString).filter(Boolean)
    : asArray(strategy.targetNodeIds).map(cleanString).filter(Boolean);
  const targetNodeId = cleanString(selection.targetNodeId) || targetNodeIds[0] || "";
  const strategyName = cleanString(strategy.strategy);
  return {
    ok: Boolean(targetNodeId || strategyName),
    source: "growth-learning-card-generation-context-service",
    selectionMode: cleanString(selection.selectionMode || (selection.targetNode ? "graph_suggestion" : "")),
    recommendationMode: cleanString(selection.recommendationMode),
    recommendationId: cleanString(selection.recommendationId || strategy.recommendationId),
    recommendationStatus: cleanString(selection.recommendationStatus || strategy.recommendationStatus),
    strategy: strategyName,
    cardRole: cleanString(selection.cardRole || strategy.cardRole),
    difficultyBand: cleanString(selection.difficultyBand || strategy.difficultyBand),
    supportLevel: cleanString(selection.supportLevel || strategy.supportLevel),
    targetNodeId,
    targetNodeIds,
    reason: cleanString(strategy.reason).slice(0, 320),
    evidenceBasis: publicEvidenceBasis(strategy.evidenceBasis || {}),
    learningProfileSummary: selection.learningProfileSummary
      ? publicProfileSummary(selection.learningProfileSummary)
      : null
  };
}

function publicRecommendationLifecycleItem(trajectory = {}) {
  const recommendation = trajectory.nextRecommendation && typeof trajectory.nextRecommendation === "object"
    ? trajectory.nextRecommendation
    : {};
  const recommendationHasPayload = Object.keys(recommendation).length > 0;
  const targetNodeIds = asArray(recommendation.targetNodeIds).map(cleanString).filter(Boolean).length
    ? asArray(recommendation.targetNodeIds).map(cleanString).filter(Boolean)
    : asArray(trajectory.targetNodeIds).map(cleanString).filter(Boolean);
  const status = cleanString(recommendation.status || trajectory.recommendationStatus || trajectory.status)
    || (recommendationHasPayload ? "pending" : "");
  const item = {
    trajectoryId: cleanString(trajectory.id || recommendation.trajectoryId),
    status,
    strategy: cleanString(recommendation.strategy || trajectory.strategy),
    cardRole: cleanString(recommendation.cardRole),
    difficultyBand: cleanString(recommendation.difficultyBand || trajectory.difficultyBand),
    supportLevel: cleanString(recommendation.supportLevel),
    targetNodeIds: targetNodeIds.slice(0, 8),
    reason: cleanString(recommendation.reason || trajectory.performanceSummary).slice(0, 240),
    taskCardId: cleanString(trajectory.taskCardId || recommendation.sourceTaskCardId),
    sourceEvaluationId: cleanString(trajectory.sourceEvaluationId || recommendation.sourceEvaluationId),
    generatedTaskCardId: cleanString(recommendation.generatedTaskCardId),
    generatedLearningGraphPlanId: cleanString(recommendation.generatedLearningGraphPlanId),
    createdAt: cleanString(recommendation.createdAt || trajectory.createdAt),
    statusUpdatedAt: cleanString(recommendation.statusUpdatedAt || trajectory.updatedAt),
    acceptedAt: cleanString(recommendation.acceptedAt),
    supersededAt: cleanString(recommendation.supersededAt),
    supersededByTrajectoryId: cleanString(recommendation.supersededByTrajectoryId)
  };
  return item.trajectoryId || item.status || item.strategy || item.taskCardId ? item : null;
}

function publicRecommendationLifecycle(profile = {}) {
  if (!profile || profile.ok === false || profile.available === false) return [];
  return asArray(profile.recentTrajectory)
    .map(publicRecommendationLifecycleItem)
    .filter(Boolean)
    .slice(0, 6);
}

function publicProfileV2Item(item = {}) {
  return {
    nodeId: cleanString(item.nodeId),
    status: cleanString(item.status),
    summary: cleanString(item.summary || item.misconception || item.reason).slice(0, 240),
    scoreBand: cleanString(item.scoreBand),
    confidence: Number(item.confidence || 0) || 0,
    evidenceCount: Number(item.evidenceCount || 0) || 0,
    evidenceWeightTotal: Number(item.evidenceWeightTotal || 0) || 0,
    stale: Boolean(item.stale),
    evidenceIds: asArray(item.evidenceIds).map(cleanString).filter(Boolean).slice(0, 6)
  };
}

function publicCapabilityState(state = {}) {
  return {
    nodeId: cleanString(state.nodeId),
    status: cleanString(state.status),
    scoreBand: cleanString(state.scoreBand),
    confidence: Number(state.confidence || 0) || 0,
    evidenceCount: Number(state.evidenceCount || 0) || 0,
    evidenceWeightTotal: Number(state.evidenceWeightTotal || 0) || 0,
    lastObservedAt: cleanString(state.lastObservedAt),
    stale: Boolean(state.stale),
    pressureSignals: asArray(state.pressureSignals).map(cleanString).filter(Boolean).slice(0, 6),
    summaries: asArray(state.summaries).map((item) => cleanString(item).slice(0, 220)).filter(Boolean).slice(0, 4),
    misconceptionSummaries: asArray(state.misconceptionSummaries)
      .map((item) => cleanString(item).slice(0, 220))
      .filter(Boolean)
      .slice(0, 4),
    evidenceIds: asArray(state.evidenceIds).map(cleanString).filter(Boolean).slice(0, 8)
  };
}

function publicProfileV2(profile = {}, targetNodeIds = []) {
  if (!profile || profile.ok === false || profile.available === false) {
    return {
      ok: false,
      available: false,
      error: cleanString(profile?.error || "profile_v2_unavailable"),
      targetNodeIds: asArray(targetNodeIds).map(cleanString).filter(Boolean),
      summary: {
        capabilityStateCount: 0,
        evidenceCount: 0,
        weaknessCount: 0,
        strengthCount: 0,
        pressureSignalCount: 0,
        staleCount: 0
      },
      capabilityStates: [],
      strengths: [],
      weaknesses: [],
      misconceptions: [],
      pressureSignals: [],
      stageReadiness: { status: "unknown", reason: "" },
      recommendedPlannerHints: { strategy: "observe", targetNodeIds: [] }
    };
  }
  return {
    ok: true,
    source: cleanString(profile.source),
    workspaceId: cleanString(profile.workspaceId),
    learnerId: cleanString(profile.learnerId),
    programId: cleanString(profile.programId),
    targetNodeIds: asArray(profile.targetNodeIds || targetNodeIds).map(cleanString).filter(Boolean).slice(0, 12),
    summary: {
      capabilityStateCount: Number(profile.summary?.capabilityStateCount || 0) || 0,
      evidenceCount: Number(profile.summary?.evidenceCount || 0) || 0,
      weaknessCount: Number(profile.summary?.weaknessCount || 0) || 0,
      strengthCount: Number(profile.summary?.strengthCount || 0) || 0,
      pressureSignalCount: Number(profile.summary?.pressureSignalCount || 0) || 0,
      staleCount: Number(profile.summary?.staleCount || 0) || 0
    },
    capabilityStates: asArray(profile.capabilityStates).map(publicCapabilityState).slice(0, 12),
    strengths: asArray(profile.strengths).map(publicProfileV2Item).slice(0, 8),
    weaknesses: asArray(profile.weaknesses).map(publicProfileV2Item).slice(0, 8),
    misconceptions: asArray(profile.misconceptions).map(publicProfileV2Item).slice(0, 8),
    pressureSignals: asArray(profile.pressureSignals).map((item) => ({
      nodeId: cleanString(item.nodeId),
      signals: asArray(item.signals).map(cleanString).filter(Boolean).slice(0, 8),
      evidenceIds: asArray(item.evidenceIds).map(cleanString).filter(Boolean).slice(0, 6)
    })).slice(0, 8),
    stageReadiness: {
      status: cleanString(profile.stageReadiness?.status),
      reason: cleanString(profile.stageReadiness?.reason).slice(0, 260)
    },
    recommendedPlannerHints: {
      strategy: cleanString(profile.recommendedPlannerHints?.strategy),
      targetNodeIds: asArray(profile.recommendedPlannerHints?.targetNodeIds).map(cleanString).filter(Boolean).slice(0, 8),
      reason: cleanString(profile.recommendedPlannerHints?.reason).slice(0, 260)
    }
  };
}

function publicEvidenceSummary(summary = {}) {
  return {
    summaryOnly: summary.summaryOnly !== false,
    taskCardId: cleanString(summary.taskCardId),
    title: cleanString(summary.title).slice(0, 120),
    scoreBand: cleanString(summary.scoreBand),
    status: cleanString(summary.status),
    feedbackSummary: cleanString(summary.feedbackSummary || summary.summary || summary.reflectionSummary).slice(0, 260),
    strengths: asArray(summary.strengths).map((item) => cleanString(item).slice(0, 140)).filter(Boolean).slice(0, 4),
    remainingWeaknesses: asArray(summary.remainingWeaknesses)
      .map((item) => cleanString(item).slice(0, 140))
      .filter(Boolean)
      .slice(0, 4),
    signalType: cleanString(summary.signalType),
    evidenceRole: cleanString(summary.evidenceRole)
  };
}

function publicEvidenceAuditItem(item = {}) {
  return {
    evidenceId: cleanString(item.evidenceId),
    sourceType: cleanString(item.sourceType),
    sourceId: cleanString(item.sourceId),
    sourceTaskCardId: cleanString(item.sourceTaskCardId),
    graphNodeId: cleanString(item.graphNodeId),
    graphNodeIds: asArray(item.graphNodeIds).map(cleanString).filter(Boolean).slice(0, 8),
    cardRole: cleanString(item.cardRole),
    evidenceWeight: Number(item.evidenceWeight || 0) || 0,
    confidence: Number(item.confidence || 0) || 0,
    scoreBand: cleanString(item.scoreBand),
    status: cleanString(item.status),
    summary: publicEvidenceSummary(item.summary || {}),
    createdAt: cleanString(item.createdAt)
  };
}

function publicChangedCapability(item = {}) {
  return {
    nodeId: cleanString(item.nodeId),
    beforeStatus: cleanString(item.beforeStatus || item.before?.status),
    afterStatus: cleanString(item.afterStatus || item.after?.status || item.status),
    status: cleanString(item.status || item.after?.status),
    summary: cleanString(item.summary || item.reason).slice(0, 220),
    evidenceIds: asArray(item.evidenceIds).map(cleanString).filter(Boolean).slice(0, 6)
  };
}

function publicPlanAuditItem(item = {}) {
  return {
    planDraftId: cleanString(item.planDraftId),
    workspaceId: cleanString(item.workspaceId),
    learnerId: cleanString(item.learnerId),
    programId: cleanString(item.programId),
    horizon: cleanString(item.horizon),
    status: cleanString(item.status),
    planSummary: cleanString(item.planSummary).slice(0, 320),
    schemaVersion: cleanString(item.schemaVersion),
    selectedItemId: cleanString(item.selectedItemId),
    generatedTaskCardId: cleanString(item.generatedTaskCardId),
    generatedLearningGraphPlanId: cleanString(item.generatedLearningGraphPlanId),
    targetNodeIds: asArray(item.targetNodeIds).map(cleanString).filter(Boolean).slice(0, 12),
    basisEvidenceIds: asArray(item.basisEvidenceIds).map(cleanString).filter(Boolean).slice(0, 12),
    itemCount: Number(item.itemCount || 0) || 0,
    items: asArray(item.items).map((planItem) => ({
      itemId: cleanString(planItem.itemId),
      cardRole: cleanString(planItem.cardRole),
      subject: cleanString(planItem.subject),
      targetNodeIds: asArray(planItem.targetNodeIds).map(cleanString).filter(Boolean).slice(0, 12),
      estimatedMinutes: Number(planItem.estimatedMinutes || 0) || 0,
      difficultyBand: cleanString(planItem.difficultyBand),
      supportLevel: cleanString(planItem.supportLevel),
      evidenceRequirements: asArray(planItem.evidenceRequirements).map(cleanString).filter(Boolean).slice(0, 8),
      reason: cleanString(planItem.reason).slice(0, 260)
    })).filter((planItem) => planItem.itemId).slice(0, 4),
    selectedItem: item.selectedItem ? {
      itemId: cleanString(item.selectedItem.itemId),
      cardRole: cleanString(item.selectedItem.cardRole),
      subject: cleanString(item.selectedItem.subject),
      targetNodeIds: asArray(item.selectedItem.targetNodeIds).map(cleanString).filter(Boolean).slice(0, 12),
      estimatedMinutes: Number(item.selectedItem.estimatedMinutes || 0) || 0,
      difficultyBand: cleanString(item.selectedItem.difficultyBand),
      supportLevel: cleanString(item.selectedItem.supportLevel),
      evidenceRequirements: asArray(item.selectedItem.evidenceRequirements).map(cleanString).filter(Boolean).slice(0, 8),
      reason: cleanString(item.selectedItem.reason).slice(0, 260)
    } : null,
    privacyClass: cleanString(item.privacyClass),
    createdAt: cleanString(item.createdAt),
    updatedAt: cleanString(item.updatedAt),
    publishedAt: cleanString(item.publishedAt)
  };
}

function publicProfileDeltaAuditItem(item = {}) {
  return {
    profileDeltaId: cleanString(item.profileDeltaId),
    workspaceId: cleanString(item.workspaceId),
    learnerId: cleanString(item.learnerId),
    programId: cleanString(item.programId),
    taskCardId: cleanString(item.taskCardId),
    submissionId: cleanString(item.submissionId),
    evaluationId: cleanString(item.evaluationId),
    targetNodeIds: asArray(item.targetNodeIds).map(cleanString).filter(Boolean).slice(0, 12),
    evidenceIds: asArray(item.evidenceIds).map(cleanString).filter(Boolean).slice(0, 12),
    changedCapabilityCount: Number(item.changedCapabilityCount || 0) || 0,
    profileStateChanged: Boolean(item.profileStateChanged),
    summary: {
      changedCapabilityCount: Number(item.summary?.changedCapabilityCount || item.changedCapabilityCount || 0) || 0,
      profileStateChanged: Boolean(item.summary?.profileStateChanged ?? item.profileStateChanged),
      reason: cleanString(item.summary?.reason || item.summary?.summary || item.summary?.plannerHintReason).slice(0, 260)
    },
    changedCapabilities: asArray(item.changedCapabilities).map(publicChangedCapability).slice(0, 8),
    plannerHintChange: {
      beforeStrategy: cleanString(item.plannerHintChange?.beforeStrategy || item.plannerHintChange?.before?.strategy),
      afterStrategy: cleanString(item.plannerHintChange?.afterStrategy || item.plannerHintChange?.after?.strategy),
      reason: cleanString(item.plannerHintChange?.reason).slice(0, 220)
    },
    privacyClass: cleanString(item.privacyClass),
    createdAt: cleanString(item.createdAt),
    updatedAt: cleanString(item.updatedAt)
  };
}

function publicProfileCorrectionItem(item = {}) {
  return {
    correctionId: cleanString(item.correctionId),
    workspaceId: cleanString(item.workspaceId),
    learnerId: cleanString(item.learnerId),
    programId: cleanString(item.programId),
    reviewAction: cleanString(item.reviewAction),
    status: cleanString(item.status),
    targetNodeIds: asArray(item.targetNodeIds).map(cleanString).filter(Boolean).slice(0, 12),
    evidenceIds: asArray(item.evidenceIds).map(cleanString).filter(Boolean).slice(0, 12),
    profileDeltaId: cleanString(item.profileDeltaId),
    taskCardId: cleanString(item.taskCardId),
    evaluationId: cleanString(item.evaluationId),
    sourceEvidenceIds: asArray(item.sourceEvidenceIds).map(cleanString).filter(Boolean).slice(0, 12),
    reviewedBy: cleanString(item.reviewedBy),
    reason: cleanString(item.reason).slice(0, 260),
    note: cleanString(item.note).slice(0, 260),
    privacyClass: cleanString(item.privacyClass),
    createdAt: cleanString(item.createdAt),
    updatedAt: cleanString(item.updatedAt)
  };
}

function latestTimestamp(items = []) {
  return asArray(items).map((item) => cleanString(item.createdAt || item.updatedAt)).filter(Boolean).sort().at(-1) || "";
}

function publicPlannerNode(node = {}) {
  return {
    nodeId: cleanString(node.nodeId),
    label: cleanString(node.label || node.title).slice(0, 140),
    domain: cleanString(node.domain),
    subject: cleanString(node.subject),
    stage: cleanString(node.stage),
    prerequisiteNodeIds: asArray(node.prerequisiteNodeIds).map(cleanString).filter(Boolean).slice(0, 8),
    evidenceRequired: asArray(node.evidenceRequired).map(cleanString).filter(Boolean).slice(0, 8)
  };
}

function publicDomainPackOption(option = {}) {
  return {
    domainPackId: cleanString(option.domainPackId || option.domain_pack_id),
    importId: cleanString(option.importId || option.import_id),
    domain: cleanString(option.domain),
    title: cleanString(option.title).slice(0, 160),
    sourceKind: cleanString(option.sourceKind || option.source_kind),
    version: cleanString(option.version),
    visibility: cleanString(option.visibility),
    importStatus: cleanString(option.importStatus || option.import_status),
    nodeCount: Number(option.nodeCount || option.node_count || 0) || 0,
    subjectCount: Number(option.subjectCount || option.subject_count || 0) || 0,
    subjects: asArray(option.subjects).map(cleanString).filter(Boolean).slice(0, 24),
    updatedAt: cleanString(option.updatedAt || option.updated_at)
  };
}

function publicGraphOptions(options = {}) {
  return {
    ok: Boolean(options.ok),
    available: Boolean(options.available),
    error: cleanString(options.error),
    selectedDomainPackId: cleanString(options.selectedDomainPackId),
    selectedDomain: cleanString(options.selectedDomain),
    selectedSubject: cleanString(options.selectedSubject),
    domainPacks: asArray(options.domainPacks).map(publicDomainPackOption).filter((option) => option.domainPackId).slice(0, 50),
    subjects: asArray(options.subjects).map(cleanString).filter(Boolean).slice(0, 40)
  };
}

function publicPlannerContextPreview(context = {}) {
  if (!context || context.ok === false) {
    return {
      ok: false,
      available: false,
      error: cleanString(context?.error || "planner_context_unavailable"),
      schemaVersion: "",
      horizon: "",
      constraints: {},
      knowledgeGraph: { candidateNodeCount: 0, candidateNodes: [] },
      profileSummary: { unavailable: true },
      recentEvidence: [],
      recentEvidenceCount: 0,
      ownerReviewSignal: {
        ok: false,
        available: false,
        status: "unavailable",
        reviewCount: 0,
        summary: { ownerReviewed: false, followUpRequired: false, useForNextPlan: true, reviewCount: 0 }
      },
      privacy: { privacyClass: "summary_only" }
    };
  }
  const candidateNodes = asArray(context.knowledgeGraph?.candidateNodes).map(publicPlannerNode).filter((node) => node.nodeId);
  const recentEvidence = asArray(context.recentEvidence).map((item) => ({
    evidenceId: cleanString(item.evidenceId),
    sourceType: cleanString(item.sourceType),
    graphNodeIds: asArray(item.graphNodeIds).map(cleanString).filter(Boolean).slice(0, 8),
    scoreBand: cleanString(item.scoreBand),
    status: cleanString(item.status),
    summary: cleanString(item.summary).slice(0, 220),
    createdAt: cleanString(item.createdAt)
  })).slice(0, 8);
  const profileSummary = context.profileSummary?.unavailable
    ? { unavailable: true, error: cleanString(context.profileSummary.error) }
    : {
      summary: {
        capabilityStateCount: Number(context.profileSummary?.summary?.capabilityStateCount || 0) || 0,
        evidenceCount: Number(context.profileSummary?.summary?.evidenceCount || 0) || 0,
        weaknessCount: Number(context.profileSummary?.summary?.weaknessCount || 0) || 0,
        strengthCount: Number(context.profileSummary?.summary?.strengthCount || 0) || 0,
        pressureSignalCount: Number(context.profileSummary?.summary?.pressureSignalCount || 0) || 0,
        staleCount: Number(context.profileSummary?.summary?.staleCount || 0) || 0
      },
      strengths: asArray(context.profileSummary?.strengths).map(publicProfileV2Item).slice(0, 6),
      weaknesses: asArray(context.profileSummary?.weaknesses).map(publicProfileV2Item).slice(0, 6),
      pressureSignals: asArray(context.profileSummary?.pressureSignals).map((item) => ({
        nodeId: cleanString(item.nodeId),
        signals: asArray(item.signals).map(cleanString).filter(Boolean).slice(0, 6),
        evidenceIds: asArray(item.evidenceIds).map(cleanString).filter(Boolean).slice(0, 4)
      })).slice(0, 6),
      recommendedPlannerHints: {
        strategy: cleanString(context.profileSummary?.recommendedPlannerHints?.strategy),
        targetNodeIds: asArray(context.profileSummary?.recommendedPlannerHints?.targetNodeIds)
          .map(cleanString)
          .filter(Boolean)
          .slice(0, 8),
        reason: cleanString(context.profileSummary?.recommendedPlannerHints?.reason).slice(0, 260)
      }
    };
  const stageAssessment = context.stageAssessment?.available === false || context.stageAssessment?.ok === false
    ? {
      ok: false,
      available: false,
      error: cleanString(context.stageAssessment?.error),
      activationState: "",
      eligible: false,
      reason: "",
      cooldownUntil: "",
      coverageNodeIds: [],
      evidence: {}
    }
    : {
      ok: Boolean(context.stageAssessment?.ok),
      available: context.stageAssessment?.available !== false,
      eligible: Boolean(context.stageAssessment?.eligible),
      activationState: cleanString(context.stageAssessment?.activationState),
      reason: cleanString(context.stageAssessment?.reason).slice(0, 220),
      cooldownUntil: cleanString(context.stageAssessment?.cooldownUntil),
      cycle: {
        cycleId: cleanString(context.stageAssessment?.cycle?.cycleId),
        status: cleanString(context.stageAssessment?.cycle?.status),
        generatedTaskCardId: cleanString(context.stageAssessment?.cycle?.generatedTaskCardId)
      },
      coverageNodeIds: asArray(context.stageAssessment?.coverageNodeIds).map(cleanString).filter(Boolean).slice(0, 12),
      evidence: {
        minimumRecentOrdinaryCards: Number(context.stageAssessment?.evidence?.minimumRecentOrdinaryCards || 0) || 0,
        recentTrajectoryCount: Number(context.stageAssessment?.evidence?.recentTrajectoryCount || 0) || 0,
        recentExperienceSignalCount: Number(context.stageAssessment?.evidence?.recentExperienceSignalCount || 0) || 0,
        highPressureSignalCount: Number(context.stageAssessment?.evidence?.highPressureSignalCount || 0) || 0,
        challengeSignalCount: Number(context.stageAssessment?.evidence?.challengeSignalCount || 0) || 0,
        sourceCardIds: asArray(context.stageAssessment?.evidence?.sourceCardIds).map(cleanString).filter(Boolean).slice(0, 8)
      }
    };
  const rawOwnerReviewSignal = context.ownerReviewSignal && typeof context.ownerReviewSignal === "object"
    ? context.ownerReviewSignal
    : { ok: false, available: false, status: "unavailable", summary: {} };
  const ownerReviewSummary = rawOwnerReviewSignal.summary && typeof rawOwnerReviewSignal.summary === "object"
    ? rawOwnerReviewSignal.summary
    : {};
  const ownerReviewPlannerSignal = rawOwnerReviewSignal.plannerSignal && typeof rawOwnerReviewSignal.plannerSignal === "object"
    ? rawOwnerReviewSignal.plannerSignal
    : {};
  const ownerReviewLatest = rawOwnerReviewSignal.latestReview && typeof rawOwnerReviewSignal.latestReview === "object"
    ? rawOwnerReviewSignal.latestReview
    : {};
  const ownerReviewSignal = {
    ok: rawOwnerReviewSignal.ok !== false,
    available: rawOwnerReviewSignal.available !== false,
    schemaVersion: "growth.learningOwnerReviewSignal.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    status: cleanString(rawOwnerReviewSignal.status || ownerReviewSummary.latestStatus || "missing"),
    reviewCount: Number(rawOwnerReviewSignal.reviewCount || ownerReviewSummary.reviewCount || 0) || 0,
    latestReview: ownerReviewLatest.reviewId ? {
      reviewId: cleanString(ownerReviewLatest.reviewId),
      decision: cleanString(ownerReviewLatest.decision),
      status: cleanString(ownerReviewLatest.status),
      taskCardId: cleanString(ownerReviewLatest.taskCardId),
      evaluationId: cleanString(ownerReviewLatest.evaluationId),
      profileDeltaId: cleanString(ownerReviewLatest.profileDeltaId),
      correctionId: cleanString(ownerReviewLatest.correctionId),
      targetNodeIds: asArray(ownerReviewLatest.targetNodeIds).map(cleanString).filter(Boolean).slice(0, 12),
      reviewedAt: cleanString(ownerReviewLatest.reviewedAt),
      updatedAt: cleanString(ownerReviewLatest.updatedAt)
    } : null,
    plannerSignal: {
      status: cleanString(ownerReviewPlannerSignal.status || ownerReviewSummary.latestStatus || "missing"),
      trustLevel: cleanString(ownerReviewPlannerSignal.trustLevel || "unreviewed"),
      followUpRequired: Boolean(ownerReviewPlannerSignal.followUpRequired || ownerReviewSummary.followUpRequired),
      useForNextPlan: ownerReviewPlannerSignal.useForNextPlan !== false && ownerReviewSummary.useForNextPlan !== false,
      strategyBias: cleanString(ownerReviewPlannerSignal.strategyBias || ownerReviewSummary.strategyBias).slice(0, 160)
    },
    summary: {
      ownerReviewed: Boolean(ownerReviewSummary.ownerReviewed || ownerReviewLatest.reviewId),
      latestDecision: cleanString(ownerReviewSummary.latestDecision || ownerReviewLatest.decision),
      latestStatus: cleanString(ownerReviewSummary.latestStatus || ownerReviewLatest.status),
      latestReviewId: cleanString(ownerReviewSummary.latestReviewId || ownerReviewLatest.reviewId),
      followUpRequired: Boolean(ownerReviewSummary.followUpRequired || ownerReviewPlannerSignal.followUpRequired),
      useForNextPlan: ownerReviewSummary.useForNextPlan !== false && ownerReviewPlannerSignal.useForNextPlan !== false,
      strategyBias: cleanString(ownerReviewSummary.strategyBias || ownerReviewPlannerSignal.strategyBias).slice(0, 160),
      acceptedCount: Number(ownerReviewSummary.acceptedCount || 0) || 0,
      needsFollowUpCount: Number(ownerReviewSummary.needsFollowUpCount || 0) || 0,
      correctionRecordedCount: Number(ownerReviewSummary.correctionRecordedCount || 0) || 0,
      blockedCount: Number(ownerReviewSummary.blockedCount || 0) || 0,
      reviewCount: Number(ownerReviewSummary.reviewCount || rawOwnerReviewSignal.reviewCount || 0) || 0
    }
  };
  return {
    ok: true,
    available: true,
    schemaVersion: cleanString(context.schemaVersion),
    horizon: cleanString(context.horizon),
    constraints: {
      availableMinutes: Number(context.constraints?.availableMinutes || 0) || 0,
      lowPressure: Boolean(context.constraints?.lowPressure),
      allowedCardRoles: asArray(context.constraints?.allowedCardRoles).map(cleanString).filter(Boolean).slice(0, 8)
    },
    knowledgeGraph: {
      domainPackId: cleanString(context.knowledgeGraph?.domainPackId),
      domain: cleanString(context.knowledgeGraph?.domain),
      subject: cleanString(context.knowledgeGraph?.subject),
      candidateNodeCount: candidateNodes.length,
      candidateNodes: candidateNodes.slice(0, 8)
    },
    profileSummary,
    recentEvidence,
    recentEvidenceCount: recentEvidence.length,
    stageAssessment,
    ownerReviewSignal,
    privacy: {
      noFullChildAnswers: Boolean(context.privacy?.noFullChildAnswers),
      noFullTranscripts: Boolean(context.privacy?.noFullTranscripts),
      noRawPrompts: Boolean(context.privacy?.noRawPrompts),
      useRefsInsteadOfRawFiles: Boolean(context.privacy?.useRefsInsteadOfRawFiles),
      privacyClass: cleanString(context.privacy?.privacyClass || "summary_only")
    }
  };
}

function readinessReady(readiness = {}) {
  return bool(readiness.targetEnabled)
    && bool(readiness.workspaceProvisioned)
    && bool(readiness.learningGraphReady)
    && bool(readiness.historySummaryReady)
    && bool(readiness.authoringGatewayConfigured || readiness.gatewayConfigured)
    && !bool(readiness.blockingOpenGeneration);
}

function unavailableLearningProfile(input = {}, error = "learning_profile_projection_unavailable") {
  return {
    ok: false,
    available: false,
    error,
    targetNodeIds: asArray(input.targetNodeIds).map(cleanString).filter(Boolean),
    summary: {
      masteryStateCount: 0,
      weaknessCount: 0,
      strengthCount: 0,
      recentExperienceSignalCount: 0,
      recentTrajectoryCount: 0,
      lastTrajectoryAt: ""
    },
    masteryStates: [],
    strengths: [],
    weaknesses: [],
    recentExperienceSignals: [],
    recentTrajectory: [],
    nextCardStrategy: { ok: false, error: "next_card_strategy_unavailable" }
  };
}

function createLearningCardGenerationContextService(options = {}) {
  const graphRepository = options.graphRepository;
  const historySummaryRepository = options.historySummaryRepository;
  const nextTargetService = options.nextTargetService || null;
  const nextCardStrategyService = options.nextCardStrategyService;
  const profileProjectionService = options.profileProjectionService || null;
  const profileV2Service = options.profileV2Service || null;
  const evidenceLedgerService = options.evidenceLedgerService || null;
  const planAuditService = options.planAuditService || null;
  const profileDeltaAuditService = options.profileDeltaAuditService || null;
  const ownerCorrectionService = options.ownerCorrectionService || null;
  const plannerContextService = options.plannerContextService || null;
  const targetProvisioningService = options.targetProvisioningService || null;
  const recipePolicyService = options.recipePolicyService || createLearningCardGenerationRecipePolicyService();
  const gatewayConfigured = options.gatewayConfigured || (() => false);
  const authoringGatewayConfigured = options.authoringGatewayConfigured || gatewayConfigured;
  const evaluationGatewayConfigured = options.evaluationGatewayConfigured || (() => false);
  const plannerGatewayConfigured = options.plannerGatewayConfigured || (() => false);

  function graphSuggestedNode(input = {}) {
    if (!graphRepository || typeof graphRepository.suggestNodes !== "function") return null;
    try {
      const requestedDomain = cleanString(input.domain);
      const requestedSubject = cleanString(input.subject);
      if (requestedDomain || requestedSubject) {
        const requested = graphRepository.suggestNodes({
          domain: requestedDomain,
          subject: requestedSubject || requestedDomain,
          limit: 1
        })[0] || null;
        if (requested) return requested;
      }
      const english = graphRepository.suggestNodes({ domain: "english", subject: "english", limit: 1 })[0] || null;
      if (english) return english;
      return graphRepository.suggestNodes({ limit: 1 })[0] || null;
    } catch (_error) {
      return null;
    }
  }

  function suggestedTarget(input = {}) {
    if (nextTargetService && typeof nextTargetService.selectNextTarget === "function") {
      const selection = nextTargetService.selectNextTarget(input);
      if (selection?.ok && selection.targetNode) return selection;
    }
    const targetNode = graphSuggestedNode(input);
    const targetNodeId = cleanString(targetNode?.nodeId || targetNode?.node_id);
    return targetNodeId ? {
      ok: true,
      source: "growth-learning-card-generation-context-service",
      selectionMode: "graph_suggestion",
      targetNodeId,
      targetNodeIds: [targetNodeId],
      targetNode
    } : { ok: false, selectionMode: "unavailable", targetNode: null };
  }

  function graphReadiness() {
    if (!graphRepository || typeof graphRepository.readback !== "function") {
      return { ok: false, nodeCount: 0, edgeCount: 0, importId: "" };
    }
    try {
      const readback = graphRepository.readback();
      return {
        ok: Boolean(readback?.ok),
        nodeCount: Number(readback?.import_counts?.nodes || readback?.counts?.learning_graph_nodes || 0) || 0,
        edgeCount: Number(readback?.import_counts?.edges || readback?.counts?.learning_graph_edges || 0) || 0,
        importId: cleanString(readback?.import_id),
        version: cleanString(readback?.version),
        warnings: asArray(readback?.warnings).slice(0, 12)
      };
    } catch (_error) {
      return { ok: false, nodeCount: 0, edgeCount: 0, importId: "", warnings: [] };
    }
  }

  function graphOptionProjection(input = {}) {
    if (!graphRepository || typeof graphRepository.domainPackOptions !== "function") {
      return {
        ok: false,
        available: false,
        error: "graph_domain_pack_options_unavailable",
        selectedDomainPackId: cleanString(input.domainPackId),
        selectedDomain: cleanString(input.domain),
        selectedSubject: cleanString(input.subject),
        domainPacks: [],
        subjects: []
      };
    }
    try {
      const domainPacks = graphRepository.domainPackOptions({ limit: 50 })
        .map(publicDomainPackOption)
        .filter((option) => option.domainPackId)
        .slice(0, 50);
      const requestedPackId = cleanString(input.domainPackId);
      const requestedDomain = cleanString(input.domain);
      const requestedSubject = cleanString(input.subject);
      const selectedPack = domainPacks.find((option) => option.domainPackId === requestedPackId)
        || domainPacks.find((option) => option.domain === requestedDomain)
        || domainPacks[0]
        || null;
      const subjects = (selectedPack ? selectedPack.subjects : domainPacks.flatMap((option) => option.subjects))
        .map(cleanString)
        .filter(Boolean)
        .filter((value, index, values) => values.indexOf(value) === index)
        .slice(0, 40);
      const selectedSubject = requestedSubject || subjects[0] || "";
      return {
        ok: true,
        available: true,
        selectedDomainPackId: requestedPackId || selectedPack?.domainPackId || "",
        selectedDomain: requestedDomain || selectedPack?.domain || "",
        selectedSubject,
        domainPacks,
        subjects
      };
    } catch (_error) {
      return {
        ok: false,
        available: false,
        error: "graph_domain_pack_options_unavailable",
        selectedDomainPackId: cleanString(input.domainPackId),
        selectedDomain: cleanString(input.domain),
        selectedSubject: cleanString(input.subject),
        domainPacks: [],
        subjects: []
      };
    }
  }

  function targetProvisioningForContext(input = {}, graphOptions = {}) {
    if (targetProvisioningService && typeof targetProvisioningService.resolveSelection === "function") {
      const result = targetProvisioningService.resolveSelection(input);
      return Object.assign({}, result || { ok: false, error: "learning_target_provisioning_unavailable" }, {
        graphOptions: publicGraphOptions(result?.graphOptions || graphOptions)
      });
    }
    const targetEnabled = isFanfanSampleTarget(input);
    return {
      ok: targetEnabled,
      targetEnabled,
      mode: targetEnabled ? "sample_default" : "not_provisioned",
      selectedDomainPackId: cleanString(input.domainPackId) || cleanString(graphOptions.selectedDomainPackId),
      selectedDomain: cleanString(input.domain) || cleanString(graphOptions.selectedDomain),
      selectedSubject: cleanString(input.subject) || cleanString(graphOptions.selectedSubject),
      graphOptions: publicGraphOptions(graphOptions)
    };
  }

  function historyForPlan(input = {}, plan = null) {
    if (!historySummaryRepository || typeof historySummaryRepository.summaryForAuthoringPlan !== "function") {
      return { ok: false, error: "learning_history_summary_unavailable" };
    }
    try {
      return historySummaryRepository.summaryForAuthoringPlan({
        workspaceId: input.workspaceId,
        learnerId: input.learnerId,
        programId: input.programId,
        learningGraphPlan: plan ? {
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          programId: input.programId,
          targetNodeId: plan.targetNodeId,
          pathNodeIds: plan.targetNodeIds,
          prerequisiteNodeIds: [],
          assessmentCoverage: [],
          cardSequence: [{
            cardRole: plan.cardRole,
            targetNodeIds: plan.targetNodeIds,
            difficultyBand: plan.difficultyBand,
            evidenceRequired: plan.evidenceRequirements
          }]
        } : {
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          programId: input.programId
        }
      });
    } catch (_error) {
      return { ok: false, error: "learning_history_summary_unavailable" };
    }
  }

  function learningProfileForPlan(input = {}, plan = null) {
    if (!profileProjectionService || typeof profileProjectionService.profileContext !== "function") {
      return unavailableLearningProfile({
        targetNodeIds: plan?.targetNodeIds || []
      }, "learning_profile_projection_service_unavailable");
    }
    try {
      return profileProjectionService.profileContext({
        workspaceId: input.workspaceId,
        learnerId: input.learnerId,
        programId: input.programId,
        targetNodeIds: plan?.targetNodeIds || []
      });
    } catch (_error) {
      return unavailableLearningProfile({
        targetNodeIds: plan?.targetNodeIds || []
      });
    }
  }

  function profileV2ForPlan(input = {}, plan = null) {
    const targetNodeIds = plan?.targetNodeIds || [];
    if (!profileV2Service || typeof profileV2Service.profileV2 !== "function") {
      return publicProfileV2({ ok: false, available: false, error: "profile_v2_service_unavailable" }, targetNodeIds);
    }
    try {
      return publicProfileV2(profileV2Service.profileV2({
        workspaceId: input.workspaceId,
        learnerId: input.learnerId,
        programId: input.programId,
        targetNodeIds,
        evidenceLimit: input.profileV2EvidenceLimit || 40
      }), targetNodeIds);
    } catch (_error) {
      return publicProfileV2({ ok: false, available: false, error: "profile_v2_unavailable" }, targetNodeIds);
    }
  }

  function evidenceAuditForPlan(input = {}, plan = null) {
    const targetNodeIds = plan?.targetNodeIds || [];
    if (!evidenceLedgerService || typeof evidenceLedgerService.listEvidence !== "function") {
      return { ok: false, available: false, error: "evidence_ledger_service_unavailable", items: [], count: 0 };
    }
    try {
      const items = evidenceLedgerService.listEvidence({
        workspaceId: input.workspaceId,
        learnerId: input.learnerId,
        programId: input.programId,
        graphNodeIds: targetNodeIds,
        limit: input.evidenceAuditLimit || 12
      }).map(publicEvidenceAuditItem).filter((item) => item.evidenceId);
      return { ok: true, available: true, count: items.length, items };
    } catch (_error) {
      return { ok: false, available: false, error: "evidence_audit_unavailable", items: [], count: 0 };
    }
  }

  function plannerContextForPlan(input = {}, plan = null) {
    if (!plannerContextService || typeof plannerContextService.plannerContext !== "function") {
      return publicPlannerContextPreview({ ok: false, available: false, error: "planner_context_service_unavailable" });
    }
    try {
      return publicPlannerContextPreview(plannerContextService.plannerContext({
        workspaceId: input.workspaceId,
        learnerId: input.learnerId,
        displayName: input.displayName,
        programId: input.programId,
        domainPackId: input.domainPackId,
        domain: input.domain || plan?.domain,
        subject: input.subject || plan?.subject,
        horizon: input.horizon || "daily_plan",
        targetNodeIds: plan?.targetNodeIds || [],
        availableMinutes: input.availableMinutes || 15,
        lowPressure: input.lowPressure !== false,
        allowedCardRoles: input.allowedCardRoles,
        evidenceLimit: input.plannerEvidenceLimit || 40,
        recentEvidenceLimit: input.plannerRecentEvidenceLimit || 12
      }));
    } catch (_error) {
      return publicPlannerContextPreview({ ok: false, available: false, error: "planner_context_unavailable" });
    }
  }

  function planAuditForPlan(input = {}, plan = null) {
    const targetNodeIds = plan?.targetNodeIds || [];
    if (!planAuditService || typeof planAuditService.listPlanDrafts !== "function") {
      return { ok: false, available: false, error: "learning_plan_audit_service_unavailable", count: 0, planDrafts: [] };
    }
    try {
      const result = planAuditService.listPlanDrafts({
        workspaceId: input.workspaceId,
        learnerId: input.learnerId,
        programId: input.programId,
        targetNodeIds,
        limit: input.planAuditLimit || 8
      });
      const planDrafts = asArray(result.planDrafts).map(publicPlanAuditItem).filter((item) => item.planDraftId).slice(0, 8);
      return {
        ok: Boolean(result.ok),
        available: result.available !== false,
        source: cleanString(result.source || "growth-learning-plan-audit-service"),
        summary: {
          planDraftCount: Number(result.summary?.planDraftCount || planDrafts.length) || 0,
          publishedPlanCount: Number(result.summary?.publishedPlanCount || planDrafts.filter((item) => item.status === "published").length) || 0,
          lastPlanAt: cleanString(result.summary?.lastPlanAt),
          lastPublishedAt: cleanString(result.summary?.lastPublishedAt)
        },
        count: planDrafts.length,
        planDrafts
      };
    } catch (_error) {
      return { ok: false, available: false, error: "learning_plan_audit_unavailable", count: 0, planDrafts: [] };
    }
  }

  function ownerAuditForPlan(input = {}, plan = null) {
    const targetNodeIds = plan?.targetNodeIds || [];
    const planAudit = planAuditForPlan(input, plan);
    let profileDeltaAudit = { ok: false, available: false, error: "profile_delta_audit_service_unavailable", count: 0, items: [] };
    let profileCorrections = { ok: false, available: false, error: "profile_correction_service_unavailable", count: 0, items: [] };
    if (profileDeltaAuditService && typeof profileDeltaAuditService.listProfileDeltas === "function") {
      try {
        const result = profileDeltaAuditService.listProfileDeltas({
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          programId: input.programId,
          limit: input.profileDeltaAuditLimit || 8
        });
        const items = asArray(result.profileDeltas).map(publicProfileDeltaAuditItem).filter((item) => item.profileDeltaId).slice(0, 8);
        profileDeltaAudit = {
          ok: Boolean(result.ok),
          available: result.available !== false,
          error: cleanString(result.error),
          count: items.length,
          items
        };
      } catch (_error) {
        profileDeltaAudit = { ok: false, available: false, error: "profile_delta_audit_unavailable", count: 0, items: [] };
      }
    }
    if (ownerCorrectionService && typeof ownerCorrectionService.listCorrections === "function") {
      try {
        const result = ownerCorrectionService.listCorrections({
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          programId: input.programId,
          targetNodeIds,
          limit: input.profileCorrectionLimit || 8
        });
        const items = asArray(result.corrections).map(publicProfileCorrectionItem).filter((item) => item.correctionId).slice(0, 8);
        profileCorrections = {
          ok: Boolean(result.ok),
          available: result.available !== false,
          error: cleanString(result.error),
          count: items.length,
          items
        };
      } catch (_error) {
        profileCorrections = { ok: false, available: false, error: "profile_correction_unavailable", count: 0, items: [] };
      }
    }
    return {
      ok: Boolean(planAudit.ok || profileDeltaAudit.ok || profileCorrections.ok),
      available: planAudit.available !== false || profileDeltaAudit.available !== false || profileCorrections.available !== false,
      source: "growth-learning-card-generation-context-service",
      summary: {
        planDraftCount: Number(planAudit.summary?.planDraftCount || planAudit.count || 0) || 0,
        publishedPlanCount: Number(planAudit.summary?.publishedPlanCount || 0) || 0,
        profileDeltaCount: profileDeltaAudit.count,
        correctionCount: profileCorrections.count,
        lastPlanAt: cleanString(planAudit.summary?.lastPlanAt),
        lastPublishedAt: cleanString(planAudit.summary?.lastPublishedAt),
        lastProfileDeltaAt: latestTimestamp(profileDeltaAudit.items),
        lastCorrectionAt: latestTimestamp(profileCorrections.items)
      },
      planAudit,
      profileDeltaAudit,
      profileCorrections
    };
  }

  function context(input = {}) {
    const workspaceId = cleanString(input.workspaceId);
    const learnerId = cleanString(input.learnerId) || workspaceId;
    const displayName = cleanString(input.displayName || input.label) || learnerId || "凡凡";
    const target = {
      workspaceId,
      learnerId,
      displayName,
      enabled: false,
      sample: "fanfan"
    };
    const graph = graphReadiness();
    const recipeContext = recipePolicyService && typeof recipePolicyService.context === "function"
      ? recipePolicyService.context(input)
      : {
        recipes: [],
        selectedRecipeId: "daily_english_v1",
        completionPolicy: {
          mode: "daily_score_once",
          evaluationAttempts: 1,
          reflectionAttempts: 1,
          completionAfter: "first_evaluation",
          rewardMode: "score_proportional",
          passScoreRequired: false
        },
        generationDefaults: { domain: "english", subject: "english" }
      };
    const generationDefaults = recipeContext.generationDefaults || {};
    const selectorDefaults = {
      domainPackId: cleanString(input.domainPackId) || cleanString(generationDefaults.domainPackId),
      domain: cleanString(input.domain) || cleanString(generationDefaults.domain),
      subject: cleanString(input.subject) || cleanString(generationDefaults.subject)
    };
    let graphOptions = graphOptionProjection(selectorDefaults);
    const targetProvisioning = targetProvisioningForContext({
      workspaceId,
      learnerId,
      displayName,
      label: input.label,
      programId: input.programId,
      domainPackId: selectorDefaults.domainPackId || graphOptions.selectedDomainPackId,
      domain: selectorDefaults.domain || graphOptions.selectedDomain,
      subject: selectorDefaults.subject || graphOptions.selectedSubject
    }, graphOptions);
    graphOptions = targetProvisioning.graphOptions || graphOptions;
    target.enabled = Boolean(targetProvisioning.targetEnabled);
    const hasExplicitGraphSelector = Boolean(cleanString(input.domain) || cleanString(input.domainPackId));
    const selectedDomain = cleanString(input.domain)
      || cleanString(targetProvisioning.selectedDomain)
      || (hasExplicitGraphSelector ? cleanString(graphOptions.selectedDomain) : "")
      || cleanString(generationDefaults.domain)
      || cleanString(graphOptions.selectedDomain)
      || "english";
    const selectedSubject = cleanString(input.subject)
      || cleanString(targetProvisioning.selectedSubject)
      || (hasExplicitGraphSelector ? cleanString(graphOptions.selectedSubject) : "")
      || cleanString(generationDefaults.subject)
      || cleanString(graphOptions.selectedSubject)
      || selectedDomain;
    const targetSelection = suggestedTarget({
      workspaceId,
      learnerId,
      programId: input.programId,
      cardRole: input.cardRole,
      domain: selectedDomain,
      subject: selectedSubject
    });
    const node = targetSelection.targetNode;
    const baseSuggestedPlan = nodePlan(node, input);
    const history = historyForPlan({ workspaceId, learnerId, programId: input.programId }, baseSuggestedPlan);
    const learningProfile = learningProfileForPlan({ workspaceId, learnerId, programId: input.programId }, baseSuggestedPlan);
    const profileV2 = profileV2ForPlan({ workspaceId, learnerId, programId: input.programId }, baseSuggestedPlan);
    const evidenceAudit = evidenceAuditForPlan({ workspaceId, learnerId, programId: input.programId }, baseSuggestedPlan);
    const ownerAudit = ownerAuditForPlan({ workspaceId, learnerId, programId: input.programId }, baseSuggestedPlan);
    const plannerContextPreview = plannerContextForPlan({
      workspaceId,
      learnerId,
      displayName,
      programId: input.programId,
      domainPackId: input.domainPackId,
      domain: selectedDomain,
      subject: selectedSubject,
      horizon: input.horizon || "daily_plan",
      availableMinutes: input.availableMinutes || generationDefaults.availableMinutes || 15,
      lowPressure: input.lowPressure !== false,
      allowedCardRoles: input.allowedCardRoles
    }, baseSuggestedPlan);
    const selectedStrategy = targetSelection?.nextCardStrategy?.ok ? targetSelection.nextCardStrategy : null;
    const computedStrategy = learningProfile?.nextCardStrategy?.ok
      ? learningProfile.nextCardStrategy
      : nextCardStrategyService && typeof nextCardStrategyService.chooseNextCardStrategy === "function"
      ? nextCardStrategyService.chooseNextCardStrategy({
        masterySummary: history?.masterySummary || {},
        recentExperienceSignals: history?.recentExperienceSignals || [],
        recentTrajectory: history?.recentTrajectory || [],
        targetNodeIds: baseSuggestedPlan?.targetNodeIds || []
      })
      : { ok: false, available: false, error: "next_card_strategy_service_unavailable" };
    const nextCardStrategy = selectedStrategy || computedStrategy;
    const suggestedPlan = planWithStrategy(baseSuggestedPlan, nextCardStrategy);
    const nextCardRecommendation = publicNextCardRecommendation(targetSelection, nextCardStrategy);
    const recommendationLifecycle = publicRecommendationLifecycle(learningProfile);
    const learnerSummary = history?.learnerSummary || {};
    const readiness = {
      targetEnabled: target.enabled,
      workspaceProvisioned: Boolean(workspaceId),
      learningGraphReady: Boolean(graph.ok && graph.nodeCount > 0 && suggestedPlan?.targetNodeId),
      historySummaryReady: Boolean(history?.ok),
      gatewayConfigured: Boolean(authoringGatewayConfigured()),
      authoringGatewayConfigured: Boolean(authoringGatewayConfigured()),
      evaluationGatewayConfigured: Boolean(evaluationGatewayConfigured()),
      plannerGatewayConfigured: Boolean(plannerGatewayConfigured()),
      plannerContextReady: Boolean(plannerContextPreview.ok && plannerContextPreview.knowledgeGraph?.candidateNodeCount > 0),
      blockingOpenGeneration: false
    };
    readiness.aiLoopGatewayReady = readiness.authoringGatewayConfigured && readiness.evaluationGatewayConfigured;
    readiness.operatingLoopGatewayReady = readiness.authoringGatewayConfigured
      && readiness.evaluationGatewayConfigured
      && readiness.plannerGatewayConfigured;
    readiness.plannerReady = readiness.plannerGatewayConfigured && readiness.plannerContextReady;
    const plannerReadiness = {
      ok: plannerContextPreview.ok,
      available: plannerContextPreview.available !== false,
      ready: readiness.plannerReady,
      gatewayConfigured: readiness.plannerGatewayConfigured,
      contextReady: readiness.plannerContextReady,
      schemaVersion: plannerContextPreview.schemaVersion,
      horizon: plannerContextPreview.horizon,
      candidateNodeCount: Number(plannerContextPreview.knowledgeGraph?.candidateNodeCount || 0) || 0,
      recentEvidenceCount: Number(plannerContextPreview.recentEvidenceCount || 0) || 0,
      privacyClass: cleanString(plannerContextPreview.privacy?.privacyClass || "summary_only"),
      error: cleanString(plannerContextPreview.error)
    };
    return {
      ok: true,
      source: "growth-learning-card-generation-context-service",
      target,
      recipes: recipeContext.recipes || [],
      selectedRecipeId: recipeContext.selectedRecipeId || "daily_english_v1",
      generationDefaults,
      readiness: Object.assign({ ready: readinessReady(readiness) }, readiness),
      graph: {
        importId: graph.importId,
        version: graph.version,
        nodeCount: graph.nodeCount,
        edgeCount: graph.edgeCount,
        warnings: graph.warnings
      },
      graphOptions,
      targetProvisioning: {
        ok: Boolean(targetProvisioning.ok),
        targetEnabled: Boolean(targetProvisioning.targetEnabled),
        mode: cleanString(targetProvisioning.mode),
        selectedDomainPackId: cleanString(targetProvisioning.selectedDomainPackId),
        selectedDomain: cleanString(targetProvisioning.selectedDomain),
        selectedSubject: cleanString(targetProvisioning.selectedSubject),
        error: cleanString(targetProvisioning.error)
      },
      suggestedPlan,
      nextCardRecommendation,
      recommendationLifecycle,
      nextCardStrategy,
      learningProfile,
      profileV2,
      evidenceAudit,
      ownerAudit,
      planAudit: ownerAudit.planAudit,
      plannerReadiness,
      plannerContextPreview,
      historySummary: {
        learnerSummary: {
          recentCardCount: Number(learnerSummary.recentCardCount || 0) || 0,
          completedRecentCardCount: Number(learnerSummary.completedRecentCardCount || 0) || 0,
          activeRecentCardCount: Number(learnerSummary.activeRecentCardCount || 0) || 0,
          submissionCount: Number(learnerSummary.submissionCount || 0) || 0,
          evaluationCount: Number(learnerSummary.evaluationCount || 0) || 0,
          reflectionCount: Number(learnerSummary.reflectionCount || 0) || 0,
          lastActivityAt: cleanString(learnerSummary.lastActivityAt)
        },
        masteryStateCount: asArray(history?.masterySummary?.masteryStates).length,
        recentExperienceSignalCount: asArray(history?.recentExperienceSignals).length,
        recentTrajectoryCount: asArray(history?.recentTrajectory).length
      },
      completionPolicy: recipeContext.completionPolicy || {}
    };
  }

  return {
    context,
    isFanfanSampleTarget
  };
}

module.exports = {
  createLearningCardGenerationContextService,
  isFanfanSampleTarget
};
