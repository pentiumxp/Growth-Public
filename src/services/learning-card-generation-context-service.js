"use strict";

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

function recipeDailyEnglish() {
  return {
    id: "daily_english_v1",
    label: "日常英语卡",
    cardRole: "practice",
    completionPolicy: "daily_score_once",
    durationMinutes: { min: 10, max: 15 },
    evidenceRequirements: ["short_answer", "self_reflection_optional"],
    rewardMode: "score_proportional"
  };
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

function readinessReady(readiness = {}) {
  return bool(readiness.targetEnabled)
    && bool(readiness.workspaceProvisioned)
    && bool(readiness.learningGraphReady)
    && bool(readiness.historySummaryReady)
    && bool(readiness.gatewayConfigured)
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
  const nextCardStrategyService = options.nextCardStrategyService;
  const profileProjectionService = options.profileProjectionService || null;
  const gatewayConfigured = options.gatewayConfigured || (() => false);

  function suggestedNode() {
    if (!graphRepository || typeof graphRepository.suggestNodes !== "function") return null;
    try {
      const english = graphRepository.suggestNodes({ domain: "english", subject: "english", limit: 1 })[0] || null;
      if (english) return english;
      return graphRepository.suggestNodes({ limit: 1 })[0] || null;
    } catch (_error) {
      return null;
    }
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

  function context(input = {}) {
    const workspaceId = cleanString(input.workspaceId);
    const learnerId = cleanString(input.learnerId) || workspaceId;
    const displayName = cleanString(input.displayName || input.label) || learnerId || "凡凡";
    const target = {
      workspaceId,
      learnerId,
      displayName,
      enabled: isFanfanSampleTarget({
        workspaceId,
        learnerId,
        displayName,
        label: input.label,
        growthWorkspaceId: input.growthWorkspaceId
      }),
      sample: "fanfan"
    };
    const graph = graphReadiness();
    const node = suggestedNode();
    const baseSuggestedPlan = nodePlan(node, input);
    const history = historyForPlan({ workspaceId, learnerId, programId: input.programId }, baseSuggestedPlan);
    const learningProfile = learningProfileForPlan({ workspaceId, learnerId, programId: input.programId }, baseSuggestedPlan);
    const nextCardStrategy = learningProfile?.nextCardStrategy?.ok
      ? learningProfile.nextCardStrategy
      : nextCardStrategyService && typeof nextCardStrategyService.chooseNextCardStrategy === "function"
      ? nextCardStrategyService.chooseNextCardStrategy({
        masterySummary: history?.masterySummary || {},
        recentExperienceSignals: history?.recentExperienceSignals || [],
        recentTrajectory: history?.recentTrajectory || [],
        targetNodeIds: baseSuggestedPlan?.targetNodeIds || []
      })
      : { ok: false, available: false, error: "next_card_strategy_service_unavailable" };
    const suggestedPlan = planWithStrategy(baseSuggestedPlan, nextCardStrategy);
    const learnerSummary = history?.learnerSummary || {};
    const readiness = {
      targetEnabled: target.enabled,
      workspaceProvisioned: Boolean(workspaceId),
      learningGraphReady: Boolean(graph.ok && graph.nodeCount > 0 && suggestedPlan?.targetNodeId),
      historySummaryReady: Boolean(history?.ok),
      gatewayConfigured: Boolean(gatewayConfigured()),
      blockingOpenGeneration: false
    };
    return {
      ok: true,
      source: "growth-learning-card-generation-context-service",
      target,
      recipes: [recipeDailyEnglish()],
      selectedRecipeId: "daily_english_v1",
      readiness: Object.assign({ ready: readinessReady(readiness) }, readiness),
      graph: {
        importId: graph.importId,
        version: graph.version,
        nodeCount: graph.nodeCount,
        edgeCount: graph.edgeCount,
        warnings: graph.warnings
      },
      suggestedPlan,
      nextCardStrategy,
      learningProfile,
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
      completionPolicy: {
        mode: "daily_score_once",
        evaluationAttempts: 1,
        reflectionAttempts: 1,
        completionAfter: "first_evaluation",
        rewardMode: "score_proportional",
        passScoreRequired: false
      }
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
