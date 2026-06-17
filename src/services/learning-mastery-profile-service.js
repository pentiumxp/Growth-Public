"use strict";

const { graphNodeIdsFromTaskCard } = require("./learning-graph-node-utils");

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
  return graphNodeIdsFromTaskCard(taskCard);
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

function taskRaw(taskCard = {}) {
  return typeof taskCard.raw_json === "object" ? taskCard.raw_json : parseJson(taskCard.raw_json, {});
}

function completionPolicyMode(taskCard = {}) {
  const raw = taskRaw(taskCard);
  return cleanString(
    taskCard.completionPolicy?.mode
      || taskCard.completion_policy
      || parseJson(taskCard.completion_policy_json, {})?.mode
      || raw.completionPolicy?.mode
      || raw.completion_policy?.mode
  ).toLowerCase();
}

function cardRole(taskCard = {}) {
  const raw = taskRaw(taskCard);
  return cleanString(taskCard.card_role || taskCard.cardRole || raw.cardRole || raw.card_role).toLowerCase();
}

function evidenceWeightForTaskCard(taskCard = {}) {
  const raw = taskRaw(taskCard);
  const explicit = Number(
    taskCard.mastery_evidence_weight
      || taskCard.masteryEvidenceWeight
      || raw.masteryEvidenceWeight
      || raw.mastery_evidence_weight
  );
  if (Number.isFinite(explicit) && explicit > 0) return Math.max(0.05, Math.min(1, explicit));
  if (cardRole(taskCard) === "stage_assessment" || completionPolicyMode(taskCard) === "formal_assessment") return 1;
  return 0.2;
}

function evidenceRoleForTaskCard(taskCard = {}) {
  if (cardRole(taskCard) === "stage_assessment" || completionPolicyMode(taskCard) === "formal_assessment") return "formal_assessment";
  return "daily_practice";
}

function profileStatusForEvaluation(evaluation = {}, context = {}) {
  const score = scoreTo100(evaluation.score);
  const passed = evaluation.passed !== false;
  if (score < 60) return "needs_repair";
  if (context.evidenceRole === "formal_assessment" && score >= 85 && passed) return "mastered";
  if (score >= 85) return "strengthening";
  return "developing";
}

function signalForEvaluation(evaluation = {}, context = {}) {
  const score = scoreTo100(evaluation.score);
  const passed = evaluation.passed !== false;
  if (score < 60 || asArray(evaluation.remainingWeaknesses).length) return "not_learned";
  if (context.evidenceRole === "formal_assessment" && score >= 85 && passed) return "challenge_ready";
  if (score >= 90 && evaluation.passed) return "challenge_ready";
  if (evaluation.passed || score >= 60) return "right_level";
  return "not_learned";
}

function masteryLevelForEvaluation(evaluation = {}, context = {}) {
  const score = scoreTo100(evaluation.score);
  const passed = evaluation.passed !== false;
  if (score < 60) return "repair";
  if (context.evidenceRole === "formal_assessment" && score >= 85 && passed) return "mastered";
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
    const evidenceWeight = evidenceWeightForTaskCard(taskCard);
    const evidenceRole = evidenceRoleForTaskCard(taskCard);
    const evidenceContext = { evidenceWeight, evidenceRole };
    const status = profileStatusForEvaluation(evaluation, evidenceContext);
    const signalType = signalForEvaluation(evaluation, evidenceContext);
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
        masteryLevel: masteryLevelForEvaluation(evaluation, evidenceContext),
        score: scoreTo100(evaluation.score),
        confidence: Number(evaluation.confidence || 0),
        evidenceWeight,
        evidenceRole,
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
        evidenceWeight,
        evidenceRole,
        duplicate: Boolean(mastery.duplicate)
      });
      const signal = repository.recordExperienceSignal({
        workspaceId,
        learnerId,
        programId,
        nodeId,
        taskCardId: cleanString(taskCard.id),
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
      evidenceWeight,
      evidenceRole,
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
  evidenceRoleForTaskCard,
  evidenceWeightForTaskCard,
  profileStatusForEvaluation,
  signalForEvaluation
};
