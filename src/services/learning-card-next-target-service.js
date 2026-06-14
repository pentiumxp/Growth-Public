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

function firstStrategyTargetNodeId(strategy = {}) {
  return uniqueStrings(strategy.targetNodeIds || strategy.target_node_ids || [strategy.targetNodeId || strategy.target_node_id])[0] || "";
}

function publicNode(node = null) {
  if (!node) return null;
  return {
    nodeId: cleanString(node.nodeId || node.node_id),
    title: cleanString(node.title),
    domain: cleanString(node.domain),
    subject: cleanString(node.subject),
    stage: cleanString(node.stage),
    evidenceRequired: asArray(node.evidenceRequired || node.evidence_required).map(cleanString).filter(Boolean).slice(0, 8)
  };
}

function createLearningCardNextTargetService(options = {}) {
  const graphRepository = options.graphRepository || null;
  const historySummaryRepository = options.historySummaryRepository || null;
  const recommendationService = options.recommendationService || null;
  const profileProjectionService = options.profileProjectionService || null;
  const nextCardStrategyService = options.nextCardStrategyService || null;

  function nodeById(nodeId) {
    const id = cleanString(nodeId);
    if (!id || !graphRepository || typeof graphRepository.node !== "function") return null;
    try {
      return publicNode(graphRepository.node({ nodeId: id }));
    } catch (_error) {
      return null;
    }
  }

  function suggestedNode(input = {}) {
    if (!graphRepository || typeof graphRepository.suggestNodes !== "function") return null;
    const domain = cleanString(input.domain || input.subject || "english");
    const subject = cleanString(input.subject || domain);
    try {
      const scoped = graphRepository.suggestNodes({ domain, subject, limit: 1 })[0] || null;
      if (scoped) return publicNode(scoped);
      return publicNode(graphRepository.suggestNodes({ limit: 1 })[0] || null);
    } catch (_error) {
      return null;
    }
  }

  function profileStrategy(input = {}) {
    if (!profileProjectionService || typeof profileProjectionService.profileContext !== "function") return null;
    try {
      const profile = profileProjectionService.profileContext({
        workspaceId: input.workspaceId,
        learnerId: input.learnerId || input.workspaceId,
        programId: input.programId,
        targetNodeIds: []
      });
      if (profile?.nextCardStrategy?.ok) {
        return { strategy: profile.nextCardStrategy, learningProfile: profile };
      }
      return profile ? { strategy: null, learningProfile: profile } : null;
    } catch (_error) {
      return null;
    }
  }

  function nextRecommendation(input = {}) {
    if (!recommendationService || typeof recommendationService.recommendNextCard !== "function") return null;
    try {
      const recommendation = recommendationService.recommendNextCard({
        workspaceId: input.workspaceId,
        learnerId: input.learnerId || input.workspaceId,
        programId: input.programId,
        targetNodeIds: []
      });
      return recommendation?.ok ? recommendation : null;
    } catch (_error) {
      return null;
    }
  }

  function historyStrategy(input = {}) {
    if (!historySummaryRepository || typeof historySummaryRepository.summaryForAuthoringPlan !== "function") return null;
    if (!nextCardStrategyService || typeof nextCardStrategyService.chooseNextCardStrategy !== "function") return null;
    try {
      const history = historySummaryRepository.summaryForAuthoringPlan({
        workspaceId: input.workspaceId,
        learnerId: input.learnerId || input.workspaceId,
        programId: input.programId
      });
      if (!history?.ok) return { strategy: null, historySummary: history || null };
      return {
        strategy: nextCardStrategyService.chooseNextCardStrategy({
          masterySummary: history.masterySummary || {},
          recentExperienceSignals: history.recentExperienceSignals || [],
          recentTrajectory: history.recentTrajectory || [],
          targetNodeIds: []
        }),
        historySummary: history
      };
    } catch (_error) {
      return null;
    }
  }

  function selectNextTarget(input = {}) {
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
    const programId = cleanString(input.programId || input.program_id);
    const explicitTargetNodeId = cleanString(input.targetNodeId || input.target_node_id);
    if (explicitTargetNodeId) {
      const node = nodeById(explicitTargetNodeId);
      return {
        ok: Boolean(node),
        source: "growth-learning-card-next-target-service",
        selectionMode: "explicit",
        error: node ? "" : "missing_target_node",
        workspaceId,
        learnerId,
        programId,
        targetNodeId: explicitTargetNodeId,
        targetNodeIds: [explicitTargetNodeId],
        targetNode: node
      };
    }

    const baseInput = Object.assign({}, input, { workspaceId, learnerId, programId });
    const recommendation = nextRecommendation(baseInput);
    const recommendationNodeId = firstStrategyTargetNodeId(recommendation || {});
    const recommendationNode = nodeById(recommendationNodeId);
    if (recommendationNode) {
      return {
        ok: true,
        source: "growth-learning-card-next-target-service",
        selectionMode: "recommendation",
        recommendationMode: cleanString(recommendation.recommendationMode),
        workspaceId,
        learnerId,
        programId,
        targetNodeId: recommendationNode.nodeId,
        targetNodeIds: [recommendationNode.nodeId],
        targetNode: recommendationNode,
        cardRole: cleanString(input.cardRole || input.card_role || recommendation.cardRole) || "practice",
        difficultyBand: cleanString(input.difficultyBand || input.difficulty_band || recommendation.difficultyBand || recommendationNode.stage) || "foundation",
        nextCardStrategy: recommendation,
        learningProfileSummary: recommendation.learningProfileSummary || null
      };
    }
    const profileResult = profileStrategy(baseInput);
    const historyResult = profileResult?.strategy?.ok ? null : historyStrategy(baseInput);
    const strategy = profileResult?.strategy?.ok ? profileResult.strategy : historyResult?.strategy || null;
    const strategyNodeId = strategy?.ok ? firstStrategyTargetNodeId(strategy) : "";
    const strategyNode = nodeById(strategyNodeId);
    const fallbackNode = strategyNode || suggestedNode(baseInput);
    if (!fallbackNode?.nodeId) {
      return {
        ok: false,
        source: "growth-learning-card-next-target-service",
        error: "next_card_target_unavailable",
        selectionMode: "unavailable",
        workspaceId,
        learnerId,
        programId,
        nextCardStrategy: strategy || { ok: false, error: "next_card_strategy_unavailable" },
        learningProfile: profileResult?.learningProfile || null
      };
    }
    const selectionMode = strategyNode ? "strategy" : "graph_suggestion";
    return {
      ok: true,
      source: "growth-learning-card-next-target-service",
      selectionMode,
      workspaceId,
      learnerId,
      programId,
      targetNodeId: fallbackNode.nodeId,
      targetNodeIds: [fallbackNode.nodeId],
      targetNode: fallbackNode,
      cardRole: cleanString(input.cardRole || input.card_role || strategy?.cardRole) || "practice",
      difficultyBand: cleanString(input.difficultyBand || input.difficulty_band || strategy?.difficultyBand || fallbackNode.stage) || "foundation",
      nextCardStrategy: strategy || { ok: false, error: "next_card_strategy_unavailable" },
      learningProfile: profileResult?.learningProfile || null,
      historySummary: historyResult?.historySummary || null
    };
  }

  return {
    selectNextTarget
  };
}

module.exports = {
  createLearningCardNextTargetService
};
