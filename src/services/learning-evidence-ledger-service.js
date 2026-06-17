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
  if (typeof text === "object") return text;
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

function scoreToBand(value) {
  const parsed = Number(value || 0);
  const score = Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : 0;
  if (score >= 85) return "high";
  if (score >= 60) return "medium";
  if (score > 0) return "low";
  return "";
}

function clampUnit(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(1, parsed));
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

function isFormalAssessment(taskCard = {}) {
  return cardRole(taskCard) === "stage_assessment" || completionPolicyMode(taskCard) === "formal_assessment";
}

function evidenceWeightForTaskCard(taskCard = {}, fallback = 0) {
  const raw = taskRaw(taskCard);
  const explicit = Number(
    fallback
      || taskCard.mastery_evidence_weight
      || taskCard.masteryEvidenceWeight
      || raw.masteryEvidenceWeight
      || raw.mastery_evidence_weight
  );
  if (Number.isFinite(explicit) && explicit > 0) return Math.max(0.05, Math.min(1, explicit));
  return isFormalAssessment(taskCard) ? 1 : 0.2;
}

function nodeIdsFromTaskCard(taskCard = {}) {
  return graphNodeIdsFromTaskCard(taskCard);
}

function rubricPolicyFromTaskCard(taskCard = {}) {
  const raw = taskRaw(taskCard);
  const policy = raw.rubricPolicy || raw.rubric_policy || {};
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) return null;
  return {
    schemaVersion: cleanString(policy.schemaVersion),
    policyId: cleanString(policy.policyId),
    recipeId: cleanString(policy.recipeId),
    domain: cleanString(policy.domain),
    subject: cleanString(policy.subject),
    dimensionIds: uniqueStrings(asArray(policy.rubricDimensions).map((item) => item?.dimensionId)).slice(0, 12),
    evidenceKeys: uniqueStrings(asArray(policy.evidenceMapping).map((item) => item?.evidenceKey)).slice(0, 12)
  };
}

function rubricResultsFromEvaluation(evaluation = {}, nodeId = "") {
  const explicitResults = asArray(evaluation.rubricResults);
  const skillDerived = asArray(evaluation.skillResults)
    .filter((item) => cleanString(item?.rubricDimensionId || item?.dimensionId))
    .map((item) => Object.assign({}, item, {
      dimensionId: item.rubricDimensionId || item.dimensionId,
      evidenceType: item.evidenceType || "skill_result_summary"
    }));
  const sourceResults = explicitResults.length ? explicitResults : skillDerived;
  return sourceResults.map((item) => {
    const result = item && typeof item === "object" && !Array.isArray(item) ? item : {};
    return {
      dimensionId: cleanString(result.dimensionId || result.rubricDimensionId),
      nodeId: cleanString(result.nodeId || result.graphNodeId || result.targetNodeId),
      scoreBand: scoreToBand(result.score),
      status: cleanString(result.status),
      evidenceType: cleanString(result.evidenceType || result.type),
      evidenceTags: uniqueStrings(result.evidenceTags || result.tags).slice(0, 8),
      evidenceSummary: boundedText(result.evidenceSummary || result.summary || result.evidence, 180)
    };
  }).filter((item) => item.dimensionId && (!item.nodeId || item.nodeId === nodeId)).slice(0, 8);
}

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw)/i;

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

function statusFromEvaluation(evaluation = {}, taskCard = {}) {
  const score = Number(evaluation.score || 0);
  if (Number.isFinite(score) && score < 60) return "needs_repair";
  if (isFormalAssessment(taskCard) && score >= 85 && evaluation.passed !== false) return "mastered";
  if (asArray(evaluation.remainingWeaknesses).length) return "weak";
  if (score >= 85) return "stable";
  return "observed";
}

function publicRecordResult(results = []) {
  const entries = results.filter((item) => item?.ok && item.evidence).map((item) => item.evidence);
  return {
    ok: results.every((item) => item?.ok !== false),
    source: "growth-learning-evidence-ledger-service",
    evidenceCount: entries.length,
    duplicateCount: results.filter((item) => item?.duplicate).length,
    entries,
    errors: results.filter((item) => item?.ok === false).map((item) => item.error).filter(Boolean)
  };
}

function createLearningEvidenceLedgerService(options = {}) {
  const repository = options.repository;
  const now = typeof options.now === "function" ? options.now : () => new Date();

  function writeEvidence(input = {}) {
    if (!repository || typeof repository.recordEvidence !== "function") {
      return { ok: false, available: false, error: "learning_evidence_ledger_repository_unavailable" };
    }
    const privacyFindings = scanPrivacy(input.summary || {});
    if (privacyFindings.length) return { ok: false, error: "learning_evidence_privacy_failed", privacyFindings };
    return repository.recordEvidence(Object.assign({}, input, {
      createdAt: input.createdAt || input.recordedAt || now().toISOString(),
      privacyClass: "summary_only"
    }));
  }

  function recordEvaluationEvidence(input = {}) {
    const taskCard = input.taskCard || {};
    const evaluation = input.evaluation || {};
    const profileUpdate = input.profileUpdate || {};
    const privacyFindings = scanPrivacy(evaluation);
    if (privacyFindings.length) return { ok: false, error: "learning_evidence_privacy_failed", privacyFindings };
    const workspaceId = cleanString(taskCard.workspace_id || taskCard.workspaceId || evaluation.workspaceId || input.workspaceId);
    const learnerId = cleanString(taskCard.learner_id || taskCard.learnerId || evaluation.learnerId || input.learnerId) || workspaceId;
    const programId = cleanString(taskCard.program_id || taskCard.programId || evaluation.programId || input.programId);
    const evaluationId = cleanString(evaluation.evaluationId || evaluation.id || input.evaluationId);
    const targetNodeIds = uniqueStrings(input.targetNodeIds || profileUpdate.targetNodeIds || nodeIdsFromTaskCard(taskCard));
    if (!workspaceId || !evaluationId || !targetNodeIds.length) {
      return { ok: false, error: "learning_evidence_evaluation_target_required", targetNodeIds };
    }
    const formal = isFormalAssessment(taskCard);
    const sourceType = formal ? "stage_assessment" : "daily_evaluation";
    const role = cardRole(taskCard) || (formal ? "stage_assessment" : "practice");
    const evidenceWeight = evidenceWeightForTaskCard(taskCard, profileUpdate.evidenceWeight);
    const recordedAt = cleanString(evaluation.evaluatedAt || evaluation.createdAt || input.recordedAt) || now().toISOString();
    const rubricPolicy = rubricPolicyFromTaskCard(taskCard);
    const baseSummary = {
      summaryOnly: true,
      taskCardId: cleanString(taskCard.id || input.taskCardId),
      title: boundedText(taskCard.title, 120),
      scoreBand: scoreToBand(evaluation.score),
      status: cleanString(evaluation.status),
      feedbackSummary: boundedText(evaluation.summary, 360),
      strengths: asArray(evaluation.feedbackSections?.strengths).map((item) => boundedText(item, 160)).filter(Boolean).slice(0, 6),
      remainingWeaknesses: asArray(evaluation.remainingWeaknesses).map((item) => boundedText(item, 160)).filter(Boolean).slice(0, 6),
      evidenceRole: formal ? "formal_assessment" : "daily_practice",
      rubricPolicy,
      rubricPolicyId: cleanString(evaluation.rubricPolicyId || rubricPolicy?.policyId)
    };
    return publicRecordResult(targetNodeIds.map((nodeId) => writeEvidence({
      workspaceId,
      learnerId,
      programId,
      graphNodeId: nodeId,
      graphNodeIds: targetNodeIds,
      sourceType,
      sourceId: evaluationId,
      sourceTaskCardId: cleanString(taskCard.id || input.taskCardId),
      cardRole: role,
      evidenceWeight,
      confidence: clampUnit(evaluation.confidence),
      scoreBand: scoreToBand(evaluation.score),
      status: statusFromEvaluation(evaluation, taskCard),
      summary: Object.assign({}, baseSummary, {
        rubricResults: rubricResultsFromEvaluation(evaluation, nodeId),
        evidenceTypes: uniqueStrings(rubricResultsFromEvaluation(evaluation, nodeId).map((item) => item.evidenceType)).slice(0, 8)
      }),
      recordedAt
    })));
  }

  function recordReflectionEvidence(input = {}) {
    const taskCard = input.taskCard || {};
    const reflection = input.reflection || input;
    const privacyFindings = scanPrivacy(reflection);
    if (privacyFindings.length) return { ok: false, error: "learning_evidence_privacy_failed", privacyFindings };
    const workspaceId = cleanString(reflection.workspaceId || reflection.workspace_id || taskCard.workspace_id || input.workspaceId);
    const learnerId = cleanString(reflection.learnerId || reflection.learner_id || taskCard.learner_id || input.learnerId) || workspaceId;
    const reflectionId = cleanString(reflection.reflectionId || reflection.id || input.reflectionId);
    const targetNodeIds = uniqueStrings(input.targetNodeIds || nodeIdsFromTaskCard(taskCard));
    if (!workspaceId || !reflectionId || !targetNodeIds.length) {
      return { ok: false, error: "learning_evidence_reflection_target_required", targetNodeIds };
    }
    const summary = {
      summaryOnly: true,
      taskCardId: cleanString(taskCard.id || reflection.taskCardId || reflection.task_card_id),
      reflectionMode: cleanString(reflection.mode),
      reflectionSummary: boundedText(reflection.summary || reflection.note, 260)
    };
    return publicRecordResult(targetNodeIds.map((nodeId) => writeEvidence({
      workspaceId,
      learnerId,
      programId: cleanString(taskCard.program_id || input.programId),
      graphNodeId: nodeId,
      graphNodeIds: targetNodeIds,
      sourceType: "reflection",
      sourceId: reflectionId,
      sourceTaskCardId: summary.taskCardId,
      cardRole: cardRole(taskCard),
      evidenceWeight: 0.05,
      confidence: 0.4,
      scoreBand: "",
      status: "observed",
      summary,
      recordedAt: cleanString(reflection.submittedAt || reflection.createdAt)
    })));
  }

  function recordExperienceSignalEvidence(input = {}) {
    const signal = input.signal || input;
    const privacyFindings = scanPrivacy(signal);
    if (privacyFindings.length) return { ok: false, error: "learning_evidence_privacy_failed", privacyFindings };
    const workspaceId = cleanString(signal.workspaceId || input.workspaceId);
    const learnerId = cleanString(signal.learnerId || input.learnerId) || workspaceId;
    const nodeId = cleanString(signal.targetNodeId || signal.nodeId || input.nodeId);
    const sourceId = cleanString(signal.signalId || signal.id || signal.sourceRef || input.sourceId);
    if (!workspaceId || !nodeId || !sourceId) return { ok: false, error: "learning_evidence_signal_target_required" };
    return writeEvidence({
      workspaceId,
      learnerId,
      programId: cleanString(signal.programId || input.programId),
      graphNodeId: nodeId,
      graphNodeIds: [nodeId],
      sourceType: "experience_signal",
      sourceId,
      sourceTaskCardId: cleanString(input.taskCardId),
      cardRole: "",
      evidenceWeight: 0.05,
      confidence: 0.35,
      scoreBand: "",
      status: ["too_hard", "not_learned", "confusing"].includes(cleanString(signal.signalType).toLowerCase()) ? "needs_repair" : "observed",
      summary: {
        summaryOnly: true,
        signalType: cleanString(signal.signalType),
        strength: cleanString(signal.strength),
        summary: boundedText(signal.summary, 220)
      },
      recordedAt: cleanString(signal.createdAt || signal.recordedAt)
    });
  }

  function listEvidence(input = {}) {
    if (!repository || typeof repository.listEvidence !== "function") return [];
    return repository.listEvidence(input);
  }

  return {
    listEvidence,
    recordEvaluationEvidence,
    recordExperienceSignalEvidence,
    recordReflectionEvidence,
    writeEvidence
  };
}

module.exports = {
  createLearningEvidenceLedgerService
};
