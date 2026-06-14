"use strict";

const { nodeIdsFromTaskCard } = require("./learning-mastery-profile-service");

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

function boundedText(value, max = 360) {
  return cleanString(value).slice(0, max);
}

function createLearningCardTrajectoryService(options = {}) {
  const repository = options.repository;
  const now = typeof options.now === "function" ? options.now : () => new Date();

  function recordEvaluationTrajectory(input = {}) {
    if (!repository || typeof repository.recordCardTrajectory !== "function") {
      return { ok: false, available: false, error: "card_trajectory_repository_unavailable" };
    }
    const taskCard = input.taskCard || {};
    const evaluation = input.evaluation || {};
    const nextRecommendation = input.nextRecommendation || {};
    const profileUpdate = input.profileUpdate || {};
    const workspaceId = cleanString(taskCard.workspace_id || taskCard.workspaceId || evaluation.workspaceId || input.workspaceId);
    const learnerId = cleanString(taskCard.learner_id || taskCard.learnerId || evaluation.learnerId || input.learnerId) || workspaceId;
    const programId = cleanString(taskCard.program_id || taskCard.programId || evaluation.programId || input.programId);
    const taskCardId = cleanString(taskCard.id || taskCard.taskCardId || evaluation.taskCardId || input.taskCardId);
    const sourceEvaluationId = cleanString(evaluation.evaluationId || evaluation.id || input.sourceEvaluationId);
    const recordedAt = now().toISOString();
    const targetNodeIds = uniqueStrings(
      nextRecommendation.targetNodeIds
        || profileUpdate.targetNodeIds
        || nodeIdsFromTaskCard(taskCard)
    );
    const strengths = asArray(evaluation.feedbackSections?.strengths).map((item) => boundedText(item, 160)).filter(Boolean).slice(0, 8);
    const remainingWeaknesses = asArray(evaluation.remainingWeaknesses).map((item) => boundedText(item, 160)).filter(Boolean).slice(0, 8);
    return repository.recordCardTrajectory({
      workspaceId,
      learnerId,
      programId,
      taskCardId,
      sourceEvaluationId,
      strategy: cleanString(nextRecommendation.strategy || "stabilize"),
      difficultyBand: cleanString(nextRecommendation.difficultyBand || "foundation"),
      targetNodeIds,
      performanceSummary: boundedText(evaluation.summary, 360),
      confirmedStrengths: strengths,
      remainingWeaknesses,
      masteryChanges: asArray(profileUpdate.masteryChanges).slice(0, 12),
      nextRecommendation: {
        status: "pending",
        strategy: cleanString(nextRecommendation.strategy || "stabilize"),
        targetNodeIds,
        difficultyBand: cleanString(nextRecommendation.difficultyBand || "foundation"),
        cardRole: cleanString(nextRecommendation.cardRole || "practice"),
        supportLevel: cleanString(nextRecommendation.supportLevel || nextRecommendation.support_level),
        reason: boundedText(nextRecommendation.reason, 260),
        sourceTaskCardId: taskCardId,
        sourceEvaluationId,
        createdAt: recordedAt,
        statusUpdatedAt: recordedAt
      },
      recordedAt
    });
  }

  return {
    recordEvaluationTrajectory
  };
}

module.exports = {
  createLearningCardTrajectoryService
};
