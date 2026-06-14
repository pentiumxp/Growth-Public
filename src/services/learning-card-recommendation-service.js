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

function boundedText(value, max = 280) {
  return cleanString(value).slice(0, max);
}

function summaryOnly(summary = {}) {
  return {
    masteryStateCount: Number(summary.masteryStateCount || 0) || 0,
    weaknessCount: Number(summary.weaknessCount || 0) || 0,
    strengthCount: Number(summary.strengthCount || 0) || 0,
    recentExperienceSignalCount: Number(summary.recentExperienceSignalCount || 0) || 0,
    recentTrajectoryCount: Number(summary.recentTrajectoryCount || 0) || 0,
    lastTrajectoryAt: cleanString(summary.lastTrajectoryAt)
  };
}

function normalizeCandidate(candidate = {}, fallback = {}) {
  const targetNodeIds = uniqueStrings(
    candidate.targetNodeIds
      || candidate.target_node_ids
      || fallback.targetNodeIds
      || fallback.target_node_ids
      || []
  );
  const strategy = cleanString(candidate.strategy || fallback.strategy);
  return {
    ok: Boolean(strategy && targetNodeIds.length),
    strategy,
    cardRole: cleanString(candidate.cardRole || candidate.card_role || fallback.cardRole || fallback.card_role || "practice"),
    difficultyBand: cleanString(candidate.difficultyBand || candidate.difficulty_band || fallback.difficultyBand || fallback.difficulty_band || "foundation"),
    supportLevel: cleanString(candidate.supportLevel || candidate.support_level || fallback.supportLevel || fallback.support_level),
    targetNodeIds,
    reason: boundedText(candidate.reason || fallback.reason, 320)
  };
}

function trajectoryRecommendation(profile = {}) {
  for (const trajectory of asArray(profile.recentTrajectory)) {
    const candidate = normalizeCandidate(trajectory.nextRecommendation || {}, trajectory);
    if (!candidate.ok) continue;
    return Object.assign(candidate, {
      recommendationMode: "trajectory",
      evidenceBasis: {
        taskCardId: cleanString(trajectory.taskCardId),
        sourceEvaluationId: cleanString(trajectory.sourceEvaluationId),
        trajectoryUpdatedAt: cleanString(trajectory.updatedAt || trajectory.createdAt)
      }
    });
  }
  return null;
}

function profileStrategyRecommendation(profile = {}) {
  const candidate = normalizeCandidate(profile.nextCardStrategy || {});
  if (!candidate.ok) return null;
  return Object.assign(candidate, {
    recommendationMode: "profile_strategy",
    evidenceBasis: {
      profileSummary: summaryOnly(profile.summary || {})
    }
  });
}

function createLearningCardRecommendationService(options = {}) {
  const profileProjectionService = options.profileProjectionService || null;

  function recommendNextCard(input = {}) {
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
    const programId = cleanString(input.programId || input.program_id);
    const targetNodeIds = uniqueStrings(input.targetNodeIds || input.target_node_ids || input.nodeIds || input.node_ids);
    if (!profileProjectionService || typeof profileProjectionService.profileContext !== "function") {
      return {
        ok: false,
        available: false,
        source: "growth-learning-card-recommendation-service",
        error: "learning_profile_projection_unavailable",
        workspaceId,
        learnerId,
        programId,
        targetNodeIds
      };
    }
    let profile = null;
    try {
      profile = profileProjectionService.profileContext({
        workspaceId,
        learnerId,
        programId,
        targetNodeIds,
        masteryLimit: input.masteryLimit,
        signalLimit: input.signalLimit,
        trajectoryLimit: input.trajectoryLimit
      });
    } catch (err) {
      return {
        ok: false,
        available: false,
        source: "growth-learning-card-recommendation-service",
        error: cleanString(err.message || err) || "learning_profile_projection_failed",
        workspaceId,
        learnerId,
        programId,
        targetNodeIds
      };
    }
    if (!profile?.ok) {
      return {
        ok: false,
        available: profile?.available !== false,
        source: "growth-learning-card-recommendation-service",
        error: cleanString(profile?.error) || "learning_profile_projection_unavailable",
        workspaceId,
        learnerId,
        programId,
        targetNodeIds,
        learningProfileSummary: summaryOnly(profile?.summary || {})
      };
    }
    const recommendation = trajectoryRecommendation(profile) || profileStrategyRecommendation(profile);
    if (!recommendation) {
      return {
        ok: false,
        available: true,
        source: "growth-learning-card-recommendation-service",
        error: "next_card_recommendation_unavailable",
        workspaceId,
        learnerId,
        programId,
        targetNodeIds,
        learningProfileSummary: summaryOnly(profile.summary || {})
      };
    }
    return Object.assign({
      ok: true,
      available: true,
      source: "growth-learning-card-recommendation-service",
      workspaceId,
      learnerId,
      programId,
      learningProfileSummary: summaryOnly(profile.summary || {})
    }, recommendation);
  }

  return {
    recommendNextCard
  };
}

module.exports = {
  createLearningCardRecommendationService
};
