"use strict";

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function boundedText(value, max = 320) {
  return cleanString(value).slice(0, max);
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

function numberValue(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMasteryState(input = {}) {
  return {
    nodeId: cleanString(input.nodeId || input.targetNodeId),
    status: cleanString(input.status),
    masteryLevel: cleanString(input.masteryLevel),
    score: Math.max(0, Math.min(100, Math.round(numberValue(input.score)))),
    confidence: Math.max(0, Math.min(1, numberValue(input.confidence))),
    evidenceCount: Math.max(0, Math.round(numberValue(input.evidenceCount))),
    summary: boundedText(input.summary, 260),
    updatedAt: cleanString(input.updatedAt),
    typicalWeaknesses: asArray(input.typicalWeaknesses).map((item) => boundedText(item, 140)).filter(Boolean).slice(0, 5)
  };
}

function normalizeExperienceSignal(input = {}) {
  return {
    targetNodeId: cleanString(input.targetNodeId || input.nodeId),
    signalType: cleanString(input.signalType),
    strength: cleanString(input.strength),
    summary: boundedText(input.summary, 220),
    sourceType: cleanString(input.sourceType),
    createdAt: cleanString(input.createdAt)
  };
}

function normalizeTrajectory(input = {}) {
  const nextRecommendation = input.nextRecommendation && typeof input.nextRecommendation === "object"
    ? input.nextRecommendation
    : {};
  return {
    id: cleanString(input.id),
    taskCardId: cleanString(input.taskCardId),
    sourceEvaluationId: cleanString(input.sourceEvaluationId),
    strategy: cleanString(input.strategy || nextRecommendation.strategy),
    difficultyBand: cleanString(input.difficultyBand || nextRecommendation.difficultyBand),
    targetNodeIds: uniqueStrings(input.targetNodeIds).slice(0, 8),
    performanceSummary: boundedText(input.performanceSummary, 260),
    confirmedStrengths: asArray(input.confirmedStrengths).map((item) => boundedText(item, 140)).filter(Boolean).slice(0, 5),
    remainingWeaknesses: asArray(input.remainingWeaknesses).map((item) => boundedText(item, 140)).filter(Boolean).slice(0, 5),
    nextRecommendation: {
      status: cleanString(nextRecommendation.status),
      strategy: cleanString(nextRecommendation.strategy),
      cardRole: cleanString(nextRecommendation.cardRole),
      difficultyBand: cleanString(nextRecommendation.difficultyBand),
      supportLevel: cleanString(nextRecommendation.supportLevel),
      reason: boundedText(nextRecommendation.reason, 220),
      targetNodeIds: uniqueStrings(nextRecommendation.targetNodeIds).slice(0, 8),
      sourceTaskCardId: cleanString(nextRecommendation.sourceTaskCardId),
      sourceEvaluationId: cleanString(nextRecommendation.sourceEvaluationId),
      generatedTaskCardId: cleanString(nextRecommendation.generatedTaskCardId),
      generatedLearningGraphPlanId: cleanString(nextRecommendation.generatedLearningGraphPlanId),
      createdAt: cleanString(nextRecommendation.createdAt),
      statusUpdatedAt: cleanString(nextRecommendation.statusUpdatedAt),
      acceptedAt: cleanString(nextRecommendation.acceptedAt),
      supersededAt: cleanString(nextRecommendation.supersededAt),
      supersededByTrajectoryId: cleanString(nextRecommendation.supersededByTrajectoryId)
    },
    createdAt: cleanString(input.createdAt),
    updatedAt: cleanString(input.updatedAt)
  };
}

function normalizeNextCardStrategy(input = {}) {
  return {
    ok: input.ok !== false && Boolean(cleanString(input.strategy)),
    strategy: cleanString(input.strategy),
    cardRole: cleanString(input.cardRole),
    difficultyBand: cleanString(input.difficultyBand),
    supportLevel: cleanString(input.supportLevel),
    targetNodeIds: uniqueStrings(input.targetNodeIds).slice(0, 8),
    reason: boundedText(input.reason, 260),
    error: cleanString(input.error)
  };
}

function emptyProjection(input = {}, error = "") {
  return {
    ok: false,
    available: false,
    error,
    source: "growth-learning-profile-projection-service",
    workspaceId: cleanString(input.workspaceId),
    learnerId: cleanString(input.learnerId || input.workspaceId),
    programId: cleanString(input.programId),
    targetNodeIds: uniqueStrings(input.targetNodeIds || input.nodeIds),
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

function createLearningProfileProjectionService(options = {}) {
  const repository = options.repository;
  const nextCardStrategyService = options.nextCardStrategyService || null;

  function chooseNextCardStrategy(projected = {}, targetNodeIds = []) {
    if (!nextCardStrategyService || typeof nextCardStrategyService.chooseNextCardStrategy !== "function") {
      return { ok: false, error: "next_card_strategy_service_unavailable" };
    }
    try {
      return nextCardStrategyService.chooseNextCardStrategy({
        masterySummary: projected.masterySummary || {},
        recentExperienceSignals: projected.recentExperienceSignals || [],
        recentTrajectory: projected.recentTrajectory || [],
        targetNodeIds
      });
    } catch (err) {
      return { ok: false, error: cleanString(err.message || err) || "next_card_strategy_failed" };
    }
  }

  function profileContext(input = {}) {
    if (!repository || typeof repository.projectForNextCard !== "function") {
      return emptyProjection(input, "learning_profile_repository_unavailable");
    }
    const workspaceId = cleanString(input.workspaceId);
    const learnerId = cleanString(input.learnerId) || workspaceId;
    const targetNodeIds = uniqueStrings(input.targetNodeIds || input.nodeIds);
    try {
      const projected = repository.projectForNextCard({
        workspaceId,
        learnerId,
        programId: input.programId,
        targetNodeIds,
        masteryLimit: input.masteryLimit || 24,
        signalLimit: input.signalLimit || 16,
        trajectoryLimit: input.trajectoryLimit || 8
      });
      if (!projected?.ok) {
        return Object.assign(emptyProjection(input, cleanString(projected?.error) || "learning_profile_projection_unavailable"), {
          available: projected?.available !== false
        });
      }
      const masteryStates = asArray(projected.masterySummary?.masteryStates).map(normalizeMasteryState).filter((item) => item.nodeId).slice(0, 24);
      const strengths = asArray(projected.masterySummary?.strengths).map(normalizeMasteryState).filter((item) => item.nodeId).slice(0, 8);
      const weaknesses = asArray(projected.masterySummary?.weaknesses).map(normalizeMasteryState).filter((item) => item.nodeId).slice(0, 8);
      const recentExperienceSignals = asArray(projected.recentExperienceSignals).map(normalizeExperienceSignal).filter((item) => item.signalType).slice(0, 12);
      const recentTrajectory = asArray(projected.recentTrajectory).map(normalizeTrajectory)
        .filter((item) => item.id || item.taskCardId || item.strategy || item.nextRecommendation.status)
        .slice(0, 8);
      const strategy = normalizeNextCardStrategy(chooseNextCardStrategy(projected, targetNodeIds));
      return {
        ok: true,
        available: true,
        source: "growth-learning-profile-projection-service",
        workspaceId,
        learnerId,
        programId: cleanString(input.programId),
        targetNodeIds,
        summary: {
          masteryStateCount: masteryStates.length,
          weaknessCount: weaknesses.length,
          strengthCount: strengths.length,
          recentExperienceSignalCount: recentExperienceSignals.length,
          recentTrajectoryCount: recentTrajectory.length,
          lastTrajectoryAt: cleanString(recentTrajectory[0]?.updatedAt || recentTrajectory[0]?.createdAt)
        },
        masteryStates,
        strengths,
        weaknesses,
        recentExperienceSignals,
        recentTrajectory,
        nextCardStrategy: strategy
      };
    } catch (err) {
      return emptyProjection(input, cleanString(err.message || err) || "learning_profile_projection_failed");
    }
  }

  return {
    profileContext
  };
}

module.exports = {
  createLearningProfileProjectionService
};
