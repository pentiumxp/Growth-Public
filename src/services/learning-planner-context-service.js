"use strict";

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

function publicNode(node = {}) {
  return {
    nodeId: cleanString(node.nodeId || node.node_id),
    domainPackId: cleanString(node.domainPackId || node.domain_pack_id),
    domain: cleanString(node.domain),
    subject: cleanString(node.subject),
    title: cleanString(node.title),
    stage: cleanString(node.stage),
    evidenceRequired: asArray(node.evidenceRequired || node.evidence_required).map(cleanString).filter(Boolean).slice(0, 8),
    learningOutcomes: asArray(node.learningOutcomes || node.learning_outcomes).map(cleanString).filter(Boolean).slice(0, 8),
    assessmentCoverage: asArray(node.assessmentCoverage || node.assessment_coverage).map(cleanString).filter(Boolean).slice(0, 8)
  };
}

function publicStageReadiness(readiness = {}) {
  if (!readiness || readiness.ok === false) {
    return {
      ok: false,
      available: false,
      error: cleanString(readiness?.error || "stage_assessment_readiness_unavailable"),
      activationState: "",
      eligible: false,
      reason: "",
      cooldownUntil: "",
      coverageNodeIds: [],
      evidence: {}
    };
  }
  const cycle = readiness.cycle || {};
  return {
    ok: true,
    available: true,
    eligible: Boolean(readiness.eligible),
    activationState: cleanString(readiness.activationState),
    reason: cleanString(readiness.reason).slice(0, 220),
    cooldownUntil: cleanString(readiness.cooldownUntil || cycle.cooldownUntil),
    cycle: {
      cycleId: cleanString(cycle.cycleId),
      status: cleanString(cycle.status),
      generatedTaskCardId: cleanString(cycle.generatedTaskCardId)
    },
    coverageNodeIds: uniqueStrings(cycle.targetNodeIds || cycle.assessmentCoverageNodeIds || readiness.assessmentCoverageNodeIds).slice(0, 12),
    evidence: {
      minimumRecentOrdinaryCards: Number(readiness.evidence?.minimumRecentOrdinaryCards || 0) || 0,
      recentTrajectoryCount: Number(readiness.evidence?.recentTrajectoryCount || 0) || 0,
      recentExperienceSignalCount: Number(readiness.evidence?.recentExperienceSignalCount || 0) || 0,
      highPressureSignalCount: Number(readiness.evidence?.highPressureSignalCount || 0) || 0,
      challengeSignalCount: Number(readiness.evidence?.challengeSignalCount || 0) || 0,
      sourceCardIds: uniqueStrings(readiness.evidence?.sourceCardIds).slice(0, 8)
    },
    profileSummary: {
      recentTrajectoryCount: Number(readiness.profileSummary?.recentTrajectoryCount || 0) || 0,
      recentExperienceSignalCount: Number(readiness.profileSummary?.recentExperienceSignalCount || 0) || 0
    }
  };
}

function publicOwnerReviewSignal(signal = {}) {
  if (!signal || signal.ok === false || signal.available === false) {
    return {
      ok: false,
      available: false,
      status: cleanString(signal?.status || "unavailable"),
      error: cleanString(signal?.error || "owner_review_signal_unavailable"),
      reviewCount: 0,
      latestReview: null,
      plannerSignal: {
        status: "unavailable",
        trustLevel: "unavailable",
        followUpRequired: false,
        useForNextPlan: true,
        strategyBias: "use_profile_without_owner_review"
      },
      summary: {
        ownerReviewed: false,
        followUpRequired: false,
        useForNextPlan: true,
        reviewCount: 0
      }
    };
  }
  const latest = signal.latestReview && typeof signal.latestReview === "object" ? signal.latestReview : {};
  const summary = signal.summary && typeof signal.summary === "object" ? signal.summary : {};
  const plannerSignal = signal.plannerSignal && typeof signal.plannerSignal === "object" ? signal.plannerSignal : {};
  return {
    ok: true,
    available: true,
    schemaVersion: "growth.learningOwnerReviewSignal.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    status: cleanString(signal.status || summary.latestStatus || "missing"),
    reviewCount: Number(signal.reviewCount || summary.reviewCount || 0) || 0,
    latestReview: latest.reviewId ? {
      reviewId: cleanString(latest.reviewId),
      decision: cleanString(latest.decision),
      status: cleanString(latest.status),
      taskCardId: cleanString(latest.taskCardId),
      evaluationId: cleanString(latest.evaluationId),
      profileDeltaId: cleanString(latest.profileDeltaId),
      correctionId: cleanString(latest.correctionId),
      targetNodeIds: uniqueStrings(latest.targetNodeIds).slice(0, 12),
      reviewedAt: cleanString(latest.reviewedAt),
      updatedAt: cleanString(latest.updatedAt)
    } : null,
    plannerSignal: {
      status: cleanString(plannerSignal.status || summary.latestStatus || "missing"),
      trustLevel: cleanString(plannerSignal.trustLevel || "unreviewed"),
      followUpRequired: Boolean(plannerSignal.followUpRequired || summary.followUpRequired),
      useForNextPlan: plannerSignal.useForNextPlan !== false,
      strategyBias: cleanString(plannerSignal.strategyBias || summary.strategyBias, 160)
    },
    summary: {
      ownerReviewed: Boolean(summary.ownerReviewed || latest.reviewId),
      latestDecision: cleanString(summary.latestDecision || latest.decision),
      latestStatus: cleanString(summary.latestStatus || latest.status),
      latestReviewId: cleanString(summary.latestReviewId || latest.reviewId),
      followUpRequired: Boolean(summary.followUpRequired || plannerSignal.followUpRequired),
      useForNextPlan: summary.useForNextPlan !== false && plannerSignal.useForNextPlan !== false,
      strategyBias: cleanString(summary.strategyBias || plannerSignal.strategyBias, 160),
      acceptedCount: Number(summary.acceptedCount || 0) || 0,
      needsFollowUpCount: Number(summary.needsFollowUpCount || 0) || 0,
      correctionRecordedCount: Number(summary.correctionRecordedCount || 0) || 0,
      blockedCount: Number(summary.blockedCount || 0) || 0,
      reviewCount: Number(summary.reviewCount || signal.reviewCount || 0) || 0
    }
  };
}

function defaultConstraints(input = {}) {
  const horizon = cleanString(input.horizon) || "daily_plan";
  const defaultMinutes = horizon === "daily_plan" || horizon === "repair_plan"
    ? 15
    : horizon === "stage_checkpoint_plan"
      ? 30
      : 60;
  const availableMinutes = Math.max(5, Math.min(90, Number(input.availableMinutes || defaultMinutes) || defaultMinutes));
  const defaultRoles = horizon === "stage_checkpoint_plan"
    ? ["stage_assessment"]
    : ["teaching", "practice", "repair", "stretch"];
  return {
    availableMinutes,
    lowPressure: input.lowPressure !== false,
    allowedCardRoles: uniqueStrings(input.allowedCardRoles || defaultRoles),
    completionPolicy: horizon === "stage_checkpoint_plan"
      ? "formal_assessment"
      : (horizon === "daily_plan" || horizon === "weekly_plan" || horizon === "repair_plan")
        ? "daily_score_once"
        : cleanString(input.completionPolicy)
  };
}

function createLearningPlannerContextService(options = {}) {
  const graphRepository = options.graphRepository || null;
  const profileV2Service = options.profileV2Service || null;
  const evidenceLedgerService = options.evidenceLedgerService || null;
  const stageAssessmentService = options.stageAssessmentService || null;
  const ownerReviewSignalService = options.ownerReviewSignalService || null;

  function candidateNodes(input = {}) {
    if (!graphRepository) return [];
    const nodeIds = uniqueStrings(input.targetNodeIds || input.nodeIds);
    try {
      if (nodeIds.length && typeof graphRepository.nodesByIds === "function") {
        return graphRepository.nodesByIds({ nodeIds }).map(publicNode).filter((node) => node.nodeId).slice(0, 12);
      }
      if (typeof graphRepository.suggestNodes === "function") {
        return graphRepository.suggestNodes({
          domain: input.domain,
          subject: input.subject,
          limit: input.limit || 8
        }).map(publicNode).filter((node) => node.nodeId).slice(0, 12);
      }
    } catch (_error) {
      return [];
    }
    return [];
  }

  function plannerContext(input = {}) {
    const workspaceId = cleanString(input.workspaceId || input.targetWorkspaceId);
    const learnerId = cleanString(input.learnerId) || workspaceId;
    if (!workspaceId) return { ok: false, error: "planner_context_workspace_required" };
    const targetNodeIds = uniqueStrings(input.targetNodeIds || input.nodeIds || [input.targetNodeId || input.target_node_id]);
    const nodes = candidateNodes(input);
    const coverageNodeIds = targetNodeIds.length
      ? targetNodeIds
      : uniqueStrings(nodes.flatMap((node) => asArray(node.assessmentCoverage).length ? node.assessmentCoverage : [node.nodeId]));
    const profile = profileV2Service && typeof profileV2Service.profileV2 === "function"
      ? profileV2Service.profileV2({
        workspaceId,
        learnerId,
        programId: input.programId,
        targetNodeIds: targetNodeIds.length ? targetNodeIds : coverageNodeIds,
        evidenceLimit: input.evidenceLimit || 40
      })
      : { ok: false, available: false, error: "profile_v2_service_unavailable" };
    const recentEvidence = evidenceLedgerService && typeof evidenceLedgerService.listEvidence === "function"
      ? evidenceLedgerService.listEvidence({
        workspaceId,
        learnerId,
        programId: input.programId,
        graphNodeIds: targetNodeIds,
        limit: input.recentEvidenceLimit || 12
      }).map((item) => ({
        evidenceId: item.evidenceId,
        sourceType: item.sourceType,
        graphNodeIds: item.graphNodeIds,
        scoreBand: item.scoreBand,
        status: item.status,
        summary: cleanString(item.summary?.feedbackSummary || item.summary?.summary || item.summary?.reflectionSummary).slice(0, 220),
        createdAt: item.createdAt
      }))
      : [];
    const stageAssessment = stageAssessmentService && typeof stageAssessmentService.stageReadiness === "function"
      ? publicStageReadiness(Object.assign({ assessmentCoverageNodeIds: coverageNodeIds }, stageAssessmentService.stageReadiness({
        workspaceId,
        learnerId,
        programId: input.programId,
        subjectId: input.subject,
        capabilityClusterId: input.capabilityClusterId || input.capability_cluster_id || input.subject || coverageNodeIds[0],
        targetNodeId: coverageNodeIds[0],
        assessmentCoverageNodeIds: coverageNodeIds
      })))
      : publicStageReadiness({ ok: false, available: false, error: "stage_assessment_service_unavailable" });
    const ownerReviewSignal = ownerReviewSignalService && typeof ownerReviewSignalService.ownerReviewSignal === "function"
      ? publicOwnerReviewSignal(ownerReviewSignalService.ownerReviewSignal({
        workspaceId,
        learnerId,
        programId: input.programId,
        domainPackId: input.domainPackId,
        domain: input.domain,
        subject: input.subject,
        horizon: input.horizon || "daily_plan",
        targetNodeIds: targetNodeIds.length ? targetNodeIds : coverageNodeIds,
        limit: input.ownerReviewLimit || 6
      }))
      : publicOwnerReviewSignal({ ok: false, available: false, error: "owner_review_signal_service_unavailable" });
    return {
      ok: true,
      source: "growth-learning-planner-context-service",
      schemaVersion: "growth.learningPlanner.input.v1",
      target: {
        workspaceId,
        learnerId,
        displayName: cleanString(input.displayName)
      },
      horizon: cleanString(input.horizon) || "daily_plan",
      constraints: defaultConstraints(input),
      knowledgeGraph: {
        domainPackId: cleanString(input.domainPackId),
        domain: cleanString(input.domain),
        subject: cleanString(input.subject),
        candidateNodes: nodes
      },
      profileSummary: profile.ok ? {
        summary: profile.summary,
        strengths: profile.strengths,
        weaknesses: profile.weaknesses,
        staleEvidence: profile.staleEvidence,
        pressureSignals: profile.pressureSignals,
        recommendedPlannerHints: profile.recommendedPlannerHints
      } : { unavailable: true, error: profile.error || "profile_v2_unavailable" },
      recentEvidence,
      stageAssessment,
      ownerReviewSignal,
      privacy: {
        noFullChildAnswers: true,
        noFullTranscripts: true,
        noRawPrompts: true,
        useRefsInsteadOfRawFiles: true,
        privacyClass: "summary_only"
      }
    };
  }

  return {
    plannerContext
  };
}

module.exports = {
  createLearningPlannerContextService
};
