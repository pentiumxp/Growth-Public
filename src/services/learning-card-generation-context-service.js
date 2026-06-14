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
  const nextTargetService = options.nextTargetService || null;
  const nextCardStrategyService = options.nextCardStrategyService;
  const profileProjectionService = options.profileProjectionService || null;
  const recipePolicyService = options.recipePolicyService || createLearningCardGenerationRecipePolicyService();
  const gatewayConfigured = options.gatewayConfigured || (() => false);

  function graphSuggestedNode(input = {}) {
    if (!graphRepository || typeof graphRepository.suggestNodes !== "function") return null;
    try {
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
    const targetSelection = suggestedTarget({
      workspaceId,
      learnerId,
      programId: input.programId,
      cardRole: input.cardRole,
      domain: generationDefaults.domain || "english",
      subject: generationDefaults.subject || "english"
    });
    const node = targetSelection.targetNode;
    const baseSuggestedPlan = nodePlan(node, input);
    const history = historyForPlan({ workspaceId, learnerId, programId: input.programId }, baseSuggestedPlan);
    const learningProfile = learningProfileForPlan({ workspaceId, learnerId, programId: input.programId }, baseSuggestedPlan);
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
      suggestedPlan,
      nextCardRecommendation,
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
