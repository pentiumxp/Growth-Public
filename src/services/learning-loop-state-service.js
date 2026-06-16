"use strict";

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map((value) => cleanString(value, 120)).filter(Boolean)));
}

function scanPrivacy(value, path = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, `${path}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacy(child, childPath, findings);
  }
  return findings;
}

function unavailable(error, extra = {}) {
  return Object.assign({
    ok: false,
    source: "growth-learning-loop-state-service",
    error: cleanString(error) || "learning_loop_state_unavailable"
  }, extra);
}

function bool(value) {
  return value === true;
}

function number(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function targetFrom(preview = {}, input = {}) {
  const target = preview.target || {};
  const workspaceId = cleanString(target.workspaceId || input.workspaceId || input.workspace_id);
  return {
    workspaceId,
    learnerId: cleanString(target.learnerId || input.learnerId || input.learner_id || workspaceId),
    displayName: cleanString(target.displayName || input.displayName || input.display_name || input.label, 120),
    label: cleanString(target.label || input.label || target.displayName || input.displayName || input.display_name, 120)
  };
}

function scopeFrom(preview = {}, input = {}) {
  const scope = preview.scope || {};
  const context = preview.context || {};
  const suggestedPlan = context.suggestedPlan || {};
  return {
    programId: cleanString(scope.programId || input.programId || input.program_id),
    domainPackId: cleanString(scope.domainPackId || input.domainPackId || input.domain_pack_id),
    domain: cleanString(scope.domain || input.domain),
    subject: cleanString(scope.subject || input.subject),
    horizon: cleanString(scope.horizon || input.horizon || "daily_plan"),
    availableMinutes: number(scope.availableMinutes || input.availableMinutes || input.available_minutes || 15) || 15,
    targetNodeIds: uniqueStrings(scope.targetNodeIds || input.targetNodeIds || input.target_node_ids || suggestedPlan.targetNodeIds).slice(0, 12)
  };
}

function readinessFrom(preview = {}) {
  const readiness = preview.readiness || {};
  return {
    ready: bool(readiness.ready),
    targetEnabled: bool(readiness.targetEnabled),
    targetProvisioned: bool(readiness.targetProvisioned),
    learningGraphReady: bool(readiness.learningGraphReady),
    plannerReady: bool(readiness.plannerReady),
    plannerContextReady: bool(readiness.plannerContextReady),
    authoringGatewayConfigured: bool(readiness.authoringGatewayConfigured),
    evaluationGatewayConfigured: bool(readiness.evaluationGatewayConfigured),
    plannerGatewayConfigured: bool(readiness.plannerGatewayConfigured),
    operatingLoopGatewayReady: bool(readiness.operatingLoopGatewayReady),
    blockingOpenGeneration: bool(readiness.blockingOpenGeneration)
  };
}

function profileFrom(context = {}) {
  const profile = context.profileV2 || {};
  const summary = profile.summary || {};
  return {
    ok: profile.ok !== false,
    available: profile.available !== false,
    capabilityStateCount: number(summary.capabilityStateCount),
    evidenceCount: number(summary.evidenceCount),
    weaknessCount: number(summary.weaknessCount),
    strengthCount: number(summary.strengthCount),
    staleEvidenceCount: asArray(profile.staleEvidence).length,
    plannerHintCount: asArray(profile.recommendedPlannerHints).length,
    stageReadinessStatus: cleanString(profile.stageReadiness?.status),
    weaknesses: asArray(profile.weaknesses).map((item) => ({
      nodeId: cleanString(item.nodeId),
      status: cleanString(item.status),
      summary: cleanString(item.summary, 180)
    })).filter((item) => item.nodeId).slice(0, 6)
  };
}

function auditFrom(preview = {}) {
  const context = preview.context || {};
  const ownerAudit = context.ownerAudit || {};
  const summary = ownerAudit.summary || {};
  const completeness = preview.completeness || null;
  const cycleAudit = preview.cycleAudit || null;
  return {
    planDraftCount: number(summary.planDraftCount),
    publishedPlanCount: number(summary.publishedPlanCount),
    evidenceCount: number(context.evidenceAudit?.count || cycleAudit?.summary?.evidenceCount),
    profileDeltaCount: number(summary.profileDeltaCount || cycleAudit?.summary?.profileDeltaCount),
    correctionCount: number(summary.correctionCount),
    lastPlanAt: cleanString(summary.lastPlanAt, 64),
    lastPublishedAt: cleanString(summary.lastPublishedAt, 64),
    lastProfileDeltaAt: cleanString(summary.lastProfileDeltaAt, 64),
    lastCorrectionAt: cleanString(summary.lastCorrectionAt, 64),
    cycleAuditAvailable: Boolean(cycleAudit),
    cycleAuditOk: cycleAudit ? cycleAudit.ok !== false : false,
    completenessAvailable: Boolean(completeness),
    complete: completeness ? bool(completeness.complete) : false,
    readyForAutomation: completeness ? bool(completeness.readyForAutomation) : false,
    missingRequired: uniqueStrings(completeness?.summary?.missingRequired || [])
  };
}

function recommendationFrom(context = {}) {
  const recommendation = context.nextCardRecommendation || {};
  return {
    available: Boolean(recommendation && Object.keys(recommendation).length),
    selectionMode: cleanString(recommendation.selectionMode),
    recommendationMode: cleanString(recommendation.recommendationMode),
    recommendationId: cleanString(recommendation.recommendationId),
    recommendationStatus: cleanString(recommendation.recommendationStatus),
    strategy: cleanString(recommendation.strategy),
    targetNodeId: cleanString(recommendation.targetNodeId),
    targetNodeIds: uniqueStrings(recommendation.targetNodeIds || [recommendation.targetNodeId]).slice(0, 12),
    reason: cleanString(recommendation.reason, 260)
  };
}

function publicEvidenceBasis(basis = {}) {
  return {
    trajectoryId: cleanString(basis.trajectoryId),
    taskCardId: cleanString(basis.taskCardId),
    sourceEvaluationId: cleanString(basis.sourceEvaluationId),
    trajectoryUpdatedAt: cleanString(basis.trajectoryUpdatedAt, 64),
    weakSignalCount: number(basis.weakSignalCount),
    weakStateCount: number(basis.weakStateCount),
    stableHighStateCount: number(basis.stableHighStateCount),
    highSignalCount: number(basis.highSignalCount)
  };
}

function publicEvidenceSummary(summary = {}) {
  return {
    summaryOnly: summary.summaryOnly !== false,
    scoreBand: cleanString(summary.scoreBand),
    status: cleanString(summary.status),
    signalType: cleanString(summary.signalType),
    evidenceRole: cleanString(summary.evidenceRole),
    feedbackSummary: cleanString(summary.feedbackSummary || summary.summary || summary.reflectionSummary, 240),
    strengths: asArray(summary.strengths).map((item) => cleanString(item, 140)).filter(Boolean).slice(0, 4),
    remainingWeaknesses: asArray(summary.remainingWeaknesses).map((item) => cleanString(item, 140)).filter(Boolean).slice(0, 4)
  };
}

function publicEvidenceTraceItem(item = {}) {
  return {
    evidenceId: cleanString(item.evidenceId),
    sourceType: cleanString(item.sourceType),
    sourceId: cleanString(item.sourceId),
    sourceTaskCardId: cleanString(item.sourceTaskCardId),
    graphNodeId: cleanString(item.graphNodeId),
    graphNodeIds: uniqueStrings(item.graphNodeIds || [item.graphNodeId]).slice(0, 8),
    cardRole: cleanString(item.cardRole),
    evidenceWeight: number(item.evidenceWeight),
    confidence: number(item.confidence),
    scoreBand: cleanString(item.scoreBand),
    status: cleanString(item.status),
    summary: publicEvidenceSummary(item.summary || {}),
    createdAt: cleanString(item.createdAt, 64)
  };
}

function publicPlanTraceItem(item = {}) {
  return {
    planDraftId: cleanString(item.planDraftId),
    status: cleanString(item.status),
    horizon: cleanString(item.horizon),
    selectedItemId: cleanString(item.selectedItemId),
    generatedTaskCardId: cleanString(item.generatedTaskCardId),
    generatedLearningGraphPlanId: cleanString(item.generatedLearningGraphPlanId),
    targetNodeIds: uniqueStrings(item.targetNodeIds).slice(0, 12),
    basisEvidenceIds: uniqueStrings(item.basisEvidenceIds).slice(0, 12),
    selectedItem: item.selectedItem ? {
      itemId: cleanString(item.selectedItem.itemId),
      cardRole: cleanString(item.selectedItem.cardRole),
      subject: cleanString(item.selectedItem.subject),
      targetNodeIds: uniqueStrings(item.selectedItem.targetNodeIds).slice(0, 12),
      estimatedMinutes: number(item.selectedItem.estimatedMinutes),
      difficultyBand: cleanString(item.selectedItem.difficultyBand),
      supportLevel: cleanString(item.selectedItem.supportLevel),
      evidenceRequirements: uniqueStrings(item.selectedItem.evidenceRequirements).slice(0, 8),
      reason: cleanString(item.selectedItem.reason, 240)
    } : null,
    createdAt: cleanString(item.createdAt, 64),
    publishedAt: cleanString(item.publishedAt, 64)
  };
}

function publicProfileDeltaTraceItem(item = {}) {
  return {
    profileDeltaId: cleanString(item.profileDeltaId),
    taskCardId: cleanString(item.taskCardId),
    evaluationId: cleanString(item.evaluationId),
    targetNodeIds: uniqueStrings(item.targetNodeIds).slice(0, 12),
    evidenceIds: uniqueStrings(item.evidenceIds).slice(0, 12),
    changedCapabilityCount: number(item.changedCapabilityCount || item.summary?.changedCapabilityCount),
    profileStateChanged: Boolean(item.profileStateChanged || item.summary?.profileStateChanged),
    reason: cleanString(item.summary?.reason || item.summary?.summary || item.summary?.plannerHintReason, 240),
    changedCapabilities: asArray(item.changedCapabilities).map((capability) => ({
      nodeId: cleanString(capability.nodeId),
      beforeStatus: cleanString(capability.beforeStatus || capability.before?.status),
      afterStatus: cleanString(capability.afterStatus || capability.after?.status || capability.status),
      summary: cleanString(capability.summary || capability.reason, 220),
      evidenceIds: uniqueStrings(capability.evidenceIds).slice(0, 8)
    })).filter((capability) => capability.nodeId).slice(0, 8),
    plannerHintChange: {
      beforeStrategy: cleanString(item.plannerHintChange?.beforeStrategy || item.plannerHintChange?.before?.strategy),
      afterStrategy: cleanString(item.plannerHintChange?.afterStrategy || item.plannerHintChange?.after?.strategy),
      reason: cleanString(item.plannerHintChange?.reason, 220)
    },
    createdAt: cleanString(item.createdAt, 64)
  };
}

function publicCorrectionTraceItem(item = {}) {
  return {
    correctionId: cleanString(item.correctionId),
    reviewAction: cleanString(item.reviewAction),
    status: cleanString(item.status),
    targetNodeIds: uniqueStrings(item.targetNodeIds).slice(0, 12),
    evidenceIds: uniqueStrings(item.evidenceIds).slice(0, 12),
    sourceEvidenceIds: uniqueStrings(item.sourceEvidenceIds).slice(0, 12),
    profileDeltaId: cleanString(item.profileDeltaId),
    taskCardId: cleanString(item.taskCardId),
    evaluationId: cleanString(item.evaluationId),
    reason: cleanString(item.reason, 240),
    createdAt: cleanString(item.createdAt, 64)
  };
}

function publicProfileTraceItem(item = {}) {
  return {
    nodeId: cleanString(item.nodeId),
    status: cleanString(item.status),
    scoreBand: cleanString(item.scoreBand),
    confidence: number(item.confidence),
    evidenceCount: number(item.evidenceCount),
    evidenceWeightTotal: number(item.evidenceWeightTotal),
    stale: Boolean(item.stale),
    summary: cleanString(item.summary || item.reason || item.misconception, 220),
    evidenceIds: uniqueStrings(item.evidenceIds).slice(0, 8)
  };
}

function publicLifecycleTraceItem(item = {}) {
  return {
    trajectoryId: cleanString(item.trajectoryId),
    status: cleanString(item.status),
    strategy: cleanString(item.strategy),
    cardRole: cleanString(item.cardRole),
    difficultyBand: cleanString(item.difficultyBand),
    supportLevel: cleanString(item.supportLevel),
    targetNodeIds: uniqueStrings(item.targetNodeIds).slice(0, 8),
    reason: cleanString(item.reason, 220),
    taskCardId: cleanString(item.taskCardId),
    sourceEvaluationId: cleanString(item.sourceEvaluationId),
    generatedTaskCardId: cleanString(item.generatedTaskCardId),
    generatedLearningGraphPlanId: cleanString(item.generatedLearningGraphPlanId),
    createdAt: cleanString(item.createdAt, 64),
    statusUpdatedAt: cleanString(item.statusUpdatedAt, 64),
    acceptedAt: cleanString(item.acceptedAt, 64),
    supersededAt: cleanString(item.supersededAt, 64),
    supersededByTrajectoryId: cleanString(item.supersededByTrajectoryId)
  };
}

function publicRewardSettlementTraceItem(item = {}) {
  return {
    rewardSettlementId: cleanString(item.rewardSettlementId),
    taskCardId: cleanString(item.taskCardId),
    evaluationId: cleanString(item.evaluationId),
    status: cleanString(item.status),
    coinAmount: number(item.coinAmount),
    currency: cleanString(item.currency || "learning_coin", 40) || "learning_coin",
    reason: cleanString(item.reason, 180),
    sourceType: cleanString(item.sourceType, 120),
    sourceId: cleanString(item.sourceId, 140),
    settledAt: cleanString(item.settledAt, 64),
    createdAt: cleanString(item.createdAt, 64)
  };
}

function publicRewardAudit(rewardAudit = {}) {
  if (!rewardAudit || rewardAudit.ok !== true) {
    return {
      available: false,
      ok: false,
      error: cleanString(rewardAudit?.error || "learning_reward_audit_unavailable"),
      rewardSettlements: [],
      summary: {
        rewardSettlementCount: 0,
        settledCount: 0,
        totalCoinAmount: 0,
        currency: "learning_coin"
      }
    };
  }
  const rewardSettlements = asArray(rewardAudit.rewardSettlements).map(publicRewardSettlementTraceItem)
    .filter((item) => item.rewardSettlementId || item.taskCardId || item.evaluationId)
    .slice(0, 8);
  const totalCoinAmount = number(rewardAudit.summary?.totalCoinAmount || rewardSettlements.reduce((sum, item) => sum + number(item.coinAmount), 0));
  return {
    available: true,
    ok: true,
    rewardSettlements,
    summary: {
      rewardSettlementCount: rewardSettlements.length,
      settledCount: number(rewardAudit.summary?.settledCount || rewardSettlements.filter((item) => item.status === "settled").length),
      totalCoinAmount,
      currency: cleanString(rewardAudit.summary?.currency || "learning_coin", 40) || "learning_coin",
      latestRewardSettlementId: cleanString(rewardAudit.summary?.latestRewardSettlementId || rewardSettlements[0]?.rewardSettlementId)
    }
  };
}

function recommendationEvidenceFrom(preview = {}, scope = {}, recommendation = {}, profile = {}, audit = {}, rewardAudit = {}) {
  const context = preview.context || {};
  const nextCardRecommendation = context.nextCardRecommendation || {};
  const ownerAudit = context.ownerAudit || {};
  const targetNodeIds = uniqueStrings(
    recommendation.targetNodeIds
    || nextCardRecommendation.targetNodeIds
    || scope.targetNodeIds
    || [recommendation.targetNodeId || nextCardRecommendation.targetNodeId]
  ).slice(0, 12);
  const evidenceItems = asArray(context.evidenceAudit?.items).map(publicEvidenceTraceItem)
    .filter((item) => item.evidenceId)
    .slice(0, 8);
  const planDrafts = asArray(ownerAudit.planAudit?.planDrafts).map(publicPlanTraceItem)
    .filter((item) => item.planDraftId)
    .slice(0, 5);
  const profileDeltas = asArray(ownerAudit.profileDeltaAudit?.items).map(publicProfileDeltaTraceItem)
    .filter((item) => item.profileDeltaId)
    .slice(0, 5);
  const corrections = asArray(ownerAudit.profileCorrections?.items).map(publicCorrectionTraceItem)
    .filter((item) => item.correctionId)
    .slice(0, 5);
  const profileV2 = context.profileV2 || {};
  const capabilityStates = asArray(profileV2.capabilityStates).map(publicProfileTraceItem)
    .filter((item) => item.nodeId)
    .filter((item) => !targetNodeIds.length || targetNodeIds.includes(item.nodeId))
    .slice(0, 8);
  const weaknesses = asArray(profileV2.weaknesses).map(publicProfileTraceItem)
    .filter((item) => item.nodeId)
    .slice(0, 6);
  const strengths = asArray(profileV2.strengths).map(publicProfileTraceItem)
    .filter((item) => item.nodeId)
    .slice(0, 6);
  const staleEvidence = asArray(profileV2.staleEvidence).map(publicProfileTraceItem)
    .filter((item) => item.nodeId)
    .slice(0, 6);
  const lifecycle = asArray(context.recommendationLifecycle).map(publicLifecycleTraceItem)
    .filter((item) => item.trajectoryId || item.status || item.strategy)
    .slice(0, 6);
  const rewardTrace = publicRewardAudit(rewardAudit);
  const rewardSettlements = rewardTrace.rewardSettlements;
  const evidenceIds = uniqueStrings([
    ...evidenceItems.map((item) => item.evidenceId),
    ...planDrafts.flatMap((item) => item.basisEvidenceIds),
    ...profileDeltas.flatMap((item) => item.evidenceIds),
    ...corrections.flatMap((item) => [...item.evidenceIds, ...item.sourceEvidenceIds]),
    ...capabilityStates.flatMap((item) => item.evidenceIds),
    ...weaknesses.flatMap((item) => item.evidenceIds)
  ]).slice(0, 24);
  const sourceTaskCardIds = uniqueStrings([
    nextCardRecommendation.evidenceBasis?.taskCardId,
    ...evidenceItems.map((item) => item.sourceTaskCardId),
    ...profileDeltas.map((item) => item.taskCardId),
    ...corrections.map((item) => item.taskCardId),
    ...lifecycle.map((item) => item.taskCardId)
  ]).slice(0, 12);
  const sourceEvaluationIds = uniqueStrings([
    nextCardRecommendation.evidenceBasis?.sourceEvaluationId,
    ...profileDeltas.map((item) => item.evaluationId),
    ...corrections.map((item) => item.evaluationId),
    ...lifecycle.map((item) => item.sourceEvaluationId)
  ]).slice(0, 12);
  const trajectoryIds = uniqueStrings([
    nextCardRecommendation.evidenceBasis?.trajectoryId,
    ...lifecycle.map((item) => item.trajectoryId)
  ]).slice(0, 12);
  const rewardSettlementIds = uniqueStrings(rewardSettlements.map((item) => item.rewardSettlementId)).slice(0, 12);
  const explanationReady = Boolean(
    recommendation.available
    && (evidenceIds.length || profileDeltas.length || lifecycle.length || planDrafts.length || rewardSettlementIds.length || profile.evidenceCount || audit.profileDeltaCount)
  );
  return {
    schemaVersion: "growth.learningLoopState.recommendationEvidence.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    available: explanationReady,
    targetNodeIds,
    recommendation: {
      selectionMode: recommendation.selectionMode,
      recommendationMode: recommendation.recommendationMode,
      recommendationId: recommendation.recommendationId,
      recommendationStatus: recommendation.recommendationStatus,
      strategy: recommendation.strategy,
      cardRole: cleanString(nextCardRecommendation.cardRole),
      difficultyBand: cleanString(nextCardRecommendation.difficultyBand),
      supportLevel: cleanString(nextCardRecommendation.supportLevel),
      targetNodeId: recommendation.targetNodeId,
      targetNodeIds: recommendation.targetNodeIds,
      reason: recommendation.reason
    },
    evidenceBasis: publicEvidenceBasis(nextCardRecommendation.evidenceBasis || {}),
    evidenceTrace: {
      evidenceIds,
      sourceTaskCardIds,
      sourceEvaluationIds,
      trajectoryIds,
      planDraftIds: planDrafts.map((item) => item.planDraftId),
      profileDeltaIds: profileDeltas.map((item) => item.profileDeltaId),
      correctionIds: corrections.map((item) => item.correctionId),
      rewardSettlementIds
    },
    profileTrace: {
      capabilityStateCount: profile.capabilityStateCount,
      evidenceCount: profile.evidenceCount,
      weaknessCount: profile.weaknessCount,
      strengthCount: profile.strengthCount,
      staleEvidenceCount: profile.staleEvidenceCount,
      plannerHintCount: profile.plannerHintCount,
      plannerHints: asArray(profileV2.recommendedPlannerHints).map((hint) => ({
        strategy: cleanString(hint.strategy || hint.role),
        targetNodeIds: uniqueStrings(hint.targetNodeIds).slice(0, 8),
        reason: cleanString(hint.reason, 220)
      })).slice(0, 4),
      capabilityStates,
      weaknesses,
      strengths,
      staleEvidence
    },
    auditTrace: {
      planDrafts,
      evidenceItems,
      profileDeltas,
      corrections,
      recommendationLifecycle: lifecycle,
      rewardSettlements
    },
    rewardTrace: {
      available: rewardTrace.available,
      ok: rewardTrace.ok,
      error: rewardTrace.available ? "" : rewardTrace.error,
      rewardSettlements,
      summary: rewardTrace.summary
    },
    summary: {
      explanationReady,
      evidenceItemCount: evidenceItems.length,
      evidenceIdCount: evidenceIds.length,
      profileDeltaCount: profileDeltas.length,
      correctionCount: corrections.length,
      rewardSettlementCount: rewardSettlements.length,
      totalRewardCoins: rewardTrace.summary.totalCoinAmount,
      recommendationLifecycleCount: lifecycle.length,
      basisTrajectoryPresent: Boolean(cleanString(nextCardRecommendation.evidenceBasis?.trajectoryId)),
      basisEvaluationPresent: Boolean(cleanString(nextCardRecommendation.evidenceBasis?.sourceEvaluationId))
    }
  };
}

function publicStageAssessment(readiness = null) {
  if (!readiness) {
    return {
      ok: false,
      available: false,
      status: "not_applicable",
      eligible: false,
      reason: "target_node_required"
    };
  }
  return {
    ok: readiness.ok !== false,
    available: readiness.ok !== false,
    status: cleanString(readiness.activationState || (readiness.eligible ? "eligible" : "dormant")),
    eligible: bool(readiness.eligible),
    reason: cleanString(readiness.reason, 180),
    cooldownUntil: cleanString(readiness.cooldownUntil, 64),
    cycleId: cleanString(readiness.cycle?.cycleId || readiness.cycle?.cycle_id),
    evidence: {
      minimumRecentOrdinaryCards: number(readiness.evidence?.minimumRecentOrdinaryCards),
      recentTrajectoryCount: number(readiness.evidence?.recentTrajectoryCount),
      recentExperienceSignalCount: number(readiness.evidence?.recentExperienceSignalCount),
      highPressureSignalCount: number(readiness.evidence?.highPressureSignalCount),
      challengeSignalCount: number(readiness.evidence?.challengeSignalCount)
    }
  };
}

function action(action, reason, extra = {}) {
  return Object.assign({
    action,
    reason,
    requiredActor: "owner",
    enabled: true
  }, extra);
}

function deriveNextAction({ readiness = {}, audit = {}, stageAssessment = {}, preview = {}, recommendation = {} } = {}) {
  const actions = preview.actions || {};
  if (!readiness.targetEnabled) {
    return action("provision_learning_target", "target_not_enabled", {
      endpoint: "/api/v1/growth/domain-pack-provisions",
      enabled: false
    });
  }
  if (!readiness.learningGraphReady) {
    return action("import_or_select_learning_graph", "learning_graph_not_ready", { enabled: false });
  }
  if (!readiness.plannerContextReady) {
    return action("refresh_learning_context", "planner_context_not_ready", { enabled: false });
  }
  if (!readiness.plannerReady) {
    return action("configure_planner_gateway", "planner_gateway_not_ready", { enabled: false });
  }
  if (stageAssessment.eligible && stageAssessment.status !== "active") {
    return action("review_stage_assessment", "stage_checkpoint_ready", {
      endpoint: "/api/v1/growth/stage-assessments/activate",
      targetNodeIds: stageAssessment.targetNodeIds || []
    });
  }
  if (audit.completenessAvailable && !audit.complete) {
    return action("complete_cycle_audit", "cycle_audit_incomplete", {
      endpoint: "/api/v1/growth/learning-cycles/completeness",
      missingRequired: audit.missingRequired
    });
  }
  if (actions.canPublish || actions.publishAction?.enabled) {
    return action("publish_selected_plan_item", "validated_plan_ready", {
      method: "POST",
      endpoint: "/api/v1/growth/daily-loop/publish",
      planDraftId: cleanString(actions.publishAction?.planDraftId),
      itemId: cleanString(actions.publishAction?.itemId)
    });
  }
  if (actions.canDraft || actions.draftAction?.enabled) {
    return action("draft_daily_plan", recommendation.strategy ? `next_strategy:${recommendation.strategy}` : "daily_plan_ready", {
      method: "POST",
      endpoint: "/api/v1/growth/daily-loop/draft",
      targetNodeId: recommendation.targetNodeId
    });
  }
  return action("owner_review", "no_safe_automatic_action", { enabled: false });
}

function statusFrom(nextAction = {}, audit = {}, stageAssessment = {}) {
  if (stageAssessment.eligible && stageAssessment.status !== "active") return "stage_checkpoint_ready";
  if (audit.completenessAvailable && !audit.complete) return "audit_incomplete";
  if (nextAction.action === "publish_selected_plan_item") return "ready_to_publish";
  if (nextAction.action === "draft_daily_plan") return "ready_to_draft";
  if (nextAction.enabled === false) return "blocked";
  return "needs_owner_review";
}

function createLearningLoopStateService(options = {}) {
  const dailyLoopService = options.dailyLoopService || null;
  const rewardAuditService = options.rewardAuditService || null;
  const stageAssessmentService = options.stageAssessmentService || null;

  function stageAssessmentFor(input = {}, preview = {}) {
    const target = targetFrom(preview, input);
    const scope = scopeFrom(preview, input);
    const targetNodeIds = uniqueStrings(input.assessmentCoverageNodeIds || input.assessment_coverage_node_ids || scope.targetNodeIds);
    if (!targetNodeIds.length) return null;
    if (!stageAssessmentService || typeof stageAssessmentService.stageReadiness !== "function") {
      return unavailable("stage_assessment_service_unavailable");
    }
    return stageAssessmentService.stageReadiness({
      workspaceId: target.workspaceId,
      learnerId: target.learnerId,
      programId: scope.programId,
      domainPackId: scope.domainPackId,
      domain: scope.domain,
      subject: scope.subject,
      targetNodeId: targetNodeIds[0],
      targetNodeIds,
      assessmentCoverageNodeIds: targetNodeIds
    });
  }

  function rewardAuditFor(input = {}, target = {}, scope = {}, recommendationEvidence = {}) {
    if (!rewardAuditService || typeof rewardAuditService.listRewardAudit !== "function") {
      return {
        ok: false,
        error: "learning_reward_audit_service_unavailable"
      };
    }
    const trace = recommendationEvidence.evidenceTrace || {};
    return rewardAuditService.listRewardAudit({
      workspaceId: target.workspaceId,
      learnerId: target.learnerId,
      programId: scope.programId,
      taskCardIds: uniqueStrings(input.taskCardIds || input.task_card_ids || input.taskCardId || input.task_card_id || trace.sourceTaskCardIds).slice(0, 20),
      evaluationIds: uniqueStrings(input.evaluationIds || input.evaluation_ids || input.evaluationId || input.evaluation_id || trace.sourceEvaluationIds).slice(0, 20),
      limit: input.rewardLimit || input.reward_limit || 8
    });
  }

  function state(input = {}) {
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) {
      return unavailable("learning_loop_state_privacy_failed", { privacyFindings });
    }
    if (!dailyLoopService || typeof dailyLoopService.preview !== "function") {
      return unavailable("learning_loop_state_daily_loop_service_unavailable");
    }
    const preview = dailyLoopService.preview(input);
    if (!preview?.ok) {
      return unavailable(preview?.error || "learning_loop_state_preview_failed", {
        preview: preview ? {
          ok: Boolean(preview.ok),
          error: cleanString(preview.error)
        } : null
      });
    }
    const target = targetFrom(preview, input);
    const scope = scopeFrom(preview, input);
    const readiness = readinessFrom(preview);
    const profile = profileFrom(preview.context || {});
    const audit = auditFrom(preview);
    const recommendation = recommendationFrom(preview.context || {});
    const initialRecommendationEvidence = recommendationEvidenceFrom(preview, scope, recommendation, profile, audit);
    const rewardAudit = rewardAuditFor(input, target, scope, initialRecommendationEvidence);
    const recommendationEvidence = recommendationEvidenceFrom(preview, scope, recommendation, profile, audit, rewardAudit);
    const stageAssessmentReadiness = stageAssessmentFor(input, preview);
    const stageAssessment = publicStageAssessment(stageAssessmentReadiness);
    stageAssessment.targetNodeIds = scope.targetNodeIds;
    const nextAction = deriveNextAction({ readiness, audit, stageAssessment, preview, recommendation });
    const status = statusFrom(nextAction, audit, stageAssessment);
    return {
      ok: true,
      source: "growth-learning-loop-state-service",
      schemaVersion: "growth.learningLoopState.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      target,
      scope,
      status,
      readiness,
      profile,
      audit,
      stageAssessment,
      recommendation,
      recommendationEvidence,
      nextAction,
      summary: {
        status,
        readyForDraft: nextAction.action === "draft_daily_plan" && nextAction.enabled !== false,
        readyForPublish: nextAction.action === "publish_selected_plan_item" && nextAction.enabled !== false,
        stageCheckpointReady: stageAssessment.eligible && stageAssessment.status !== "active",
        auditComplete: audit.completenessAvailable ? audit.complete : false,
        recommendationEvidenceReady: recommendationEvidence.summary.explanationReady,
        weaknessCount: profile.weaknessCount,
        missingRequired: audit.missingRequired
      }
    };
  }

  return {
    state
  };
}

module.exports = {
  createLearningLoopStateService,
  scanPrivacy
};
