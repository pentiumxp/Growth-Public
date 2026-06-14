"use strict";

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseJson(text, fallback) {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (_error) {
    return fallback;
  }
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

function boundedText(value, max = 320) {
  return cleanString(value).slice(0, max);
}

function scoreTo100(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed > 0 && parsed <= 1) return Math.round(parsed * 100);
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function nodeIdsFromTaskCard(taskCard = {}) {
  const raw = typeof taskCard.raw_json === "object" ? taskCard.raw_json : parseJson(taskCard.raw_json, {});
  return uniqueStrings(
    asArray(raw.learningGraph?.targetNodeIds)
      .concat(raw.learning_graph?.target_node_ids || [])
      .concat(raw.targetNodeIds || [])
      .concat(parseJson(taskCard.skill_ids_json, []))
      .concat(taskCard.capability_cluster_id)
  );
}

function nodeIdsFromEvaluation(evaluation = {}) {
  return uniqueStrings(
    asArray(evaluation.skillResults).flatMap((item) => [
      item.nodeId,
      item.targetNodeId,
      item.skillId
    ])
  );
}

function profileStatusForEvaluation(evaluation = {}) {
  const score = scoreTo100(evaluation.score);
  if (score < 60) return "needs_repair";
  if (score >= 85) return "strengthening";
  return "developing";
}

function signalForEvaluation(evaluation = {}) {
  const score = scoreTo100(evaluation.score);
  if (score < 60 || asArray(evaluation.remainingWeaknesses).length) return "not_learned";
  if (score >= 90 && evaluation.passed) return "challenge_ready";
  if (evaluation.passed || score >= 60) return "right_level";
  return "not_learned";
}

function masteryLevelForEvaluation(evaluation = {}) {
  const score = scoreTo100(evaluation.score);
  if (score < 60) return "repair";
  if (score >= 85) return "stable";
  return "foundation";
}

function createLearningMasteryProfileService(options = {}) {
  const repository = options.repository;
  const now = typeof options.now === "function" ? options.now : () => new Date();

  function recordEvaluationEvidence(input = {}) {
    if (!repository || typeof repository.recordMasteryEvidence !== "function") {
      return { ok: false, available: false, error: "mastery_profile_repository_unavailable" };
    }
    const taskCard = input.taskCard || {};
    const evaluation = input.evaluation || {};
    const workspaceId = cleanString(taskCard.workspace_id || taskCard.workspaceId || evaluation.workspaceId || input.workspaceId);
    const learnerId = cleanString(taskCard.learner_id || taskCard.learnerId || evaluation.learnerId || input.learnerId) || workspaceId;
    const programId = cleanString(taskCard.program_id || taskCard.programId || evaluation.programId || input.programId);
    const evaluationId = cleanString(evaluation.evaluationId || evaluation.id || input.evaluationId);
    const evidenceRef = evaluationId ? `evaluation:${evaluationId}` : `evaluation:${workspaceId}:${taskCard.id || input.taskCardId}:${now().toISOString()}`;
    const targetNodeIds = uniqueStrings(nodeIdsFromEvaluation(evaluation).concat(nodeIdsFromTaskCard(taskCard)));
    if (!workspaceId || !targetNodeIds.length) {
      return { ok: false, error: "mastery_profile_target_required", targetNodeIds };
    }
    const recordedAt = now().toISOString();
    const status = profileStatusForEvaluation(evaluation);
    const signalType = signalForEvaluation(evaluation);
    const typicalWeaknesses = asArray(evaluation.remainingWeaknesses).map((item) => boundedText(item, 160)).filter(Boolean).slice(0, 5);
    const summary = boundedText(evaluation.summary || typicalWeaknesses.join("; "), 320);
    const masteryChanges = [];
    const experienceSignals = [];
    let duplicateEvidenceCount = 0;
    for (const nodeId of targetNodeIds) {
      const mastery = repository.recordMasteryEvidence({
        workspaceId,
        learnerId,
        programId,
        nodeId,
        status,
        masteryLevel: masteryLevelForEvaluation(evaluation),
        score: scoreTo100(evaluation.score),
        confidence: Number(evaluation.confidence || 0),
        summary,
        evidenceRef,
        signalType,
        typicalWeaknesses,
        sourceType: "evaluation",
        recordedAt
      });
      if (!mastery?.ok) return mastery;
      if (mastery.duplicate) duplicateEvidenceCount += 1;
      masteryChanges.push({
        nodeId,
        from: mastery.previousState?.status || "new",
        to: mastery.state?.status || status,
        evidenceRef,
        duplicate: Boolean(mastery.duplicate)
      });
      const signal = repository.recordExperienceSignal({
        workspaceId,
        learnerId,
        programId,
        nodeId,
        signalType,
        strength: status === "needs_repair" ? "high" : "medium",
        summary,
        sourceType: "evaluation",
        sourceRef: evidenceRef,
        recordedAt
      });
      if (signal?.ok && signal.signal) experienceSignals.push(signal.signal);
    }
    const profile = typeof repository.projectForNextCard === "function"
      ? repository.projectForNextCard({ workspaceId, learnerId, programId, targetNodeIds })
      : { ok: true, masterySummary: { targetNodeIds, masteryStates: [] }, recentExperienceSignals: [] };
    return {
      ok: true,
      source: "growth-learning-mastery-profile-service",
      workspaceId,
      learnerId,
      programId,
      targetNodeIds,
      evidenceRef,
      duplicateEvidenceCount,
      masteryChanges,
      experienceSignals,
      masterySummary: profile.masterySummary || { targetNodeIds, masteryStates: [] },
      recentExperienceSignals: profile.recentExperienceSignals || experienceSignals,
      recentTrajectory: profile.recentTrajectory || []
    };
  }

  return {
    recordEvaluationEvidence
  };
}

module.exports = {
  createLearningMasteryProfileService,
  nodeIdsFromTaskCard,
  profileStatusForEvaluation,
  signalForEvaluation
};
