"use strict";

const crypto = require("node:crypto");

const { createLearningCardRubricPolicyService } = require("./learning-card-rubric-policy-service");

function cleanString(value) {
  return String(value || "").trim();
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseJson(text, fallback) {
  if (!text) return fallback;
  if (typeof text === "object") return text;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function unavailable(error, extra = {}) {
  return Object.assign({ ok: false, error }, extra);
}

function boundedText(value, max = 700) {
  return cleanString(value).slice(0, max);
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

function scoreTo100(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed >= 0 && parsed <= 1) return Math.round(parsed * 100);
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function confidenceToUnit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed > 1 && parsed <= 100) return Math.round(parsed) / 100;
  return Math.max(0, Math.min(1, parsed));
}

function taskRawFromInput(input = {}) {
  if (isObject(input.taskRaw)) return input.taskRaw;
  const taskCard = input.taskCard || {};
  return parseJson(taskCard.raw_json, {}) || {};
}

function targetNodeIdsFromTask(input = {}) {
  const taskCard = input.taskCard || {};
  const raw = taskRawFromInput(input);
  return uniqueStrings(
    asArray(raw.learningGraph?.targetNodeIds)
      .concat(raw.learning_graph?.target_node_ids || [])
      .concat(raw.targetNodeIds || [])
      .concat(raw.target_node_ids || [])
      .concat(parseJson(taskCard.skill_ids_json, []))
      .concat(taskCard.capability_cluster_id)
  );
}

function evidenceRequirementsFromTask(raw = {}) {
  return uniqueStrings(
    asArray(raw.evidenceToRecord)
      .concat(raw.evidence_to_record || [])
      .concat(raw.evidenceRequirements || [])
      .concat(raw.evidence_requirements || [])
      .concat(raw.teachingFlow?.quickCheck?.expectedEvidence || [])
  ).slice(0, 12);
}

function learningGraphFromTaskRaw(raw = {}) {
  return raw.learningGraph || raw.learning_graph || {};
}

function rubricPolicyFromTask(input = {}, rubricPolicyService = null) {
  const raw = taskRawFromInput(input);
  const taskCard = input.taskCard || {};
  const explicit = input.rubricPolicy || input.rubric_policy || raw.rubricPolicy || raw.rubric_policy;
  if (isObject(explicit) && cleanString(explicit.schemaVersion) === "growth.card.rubricPolicy.v1") {
    return explicit;
  }
  if (!rubricPolicyService || typeof rubricPolicyService.resolveRubricPolicy !== "function") return null;
  const graph = learningGraphFromTaskRaw(raw);
  const resolved = rubricPolicyService.resolveRubricPolicy({
    recipeId: raw.recipeId || raw.recipe_id || taskCard.recipe_id,
    domain: raw.domain || graph.domain || taskCard.domain,
    subject: raw.subject || graph.subject || taskCard.subject,
    cardRole: raw.cardRole || raw.card_role || taskCard.card_role,
    completionPolicy: raw.completionPolicy
      || raw.completion_policy
      || taskCard.completionPolicy
      || parseJson(taskCard.completion_policy_json, {})
  });
  return resolved?.ok ? resolved.policy : null;
}

function rubricDimensionIds(policy = {}) {
  return uniqueStrings(asArray(policy.rubricDimensions).map((item) => item?.dimensionId));
}

function audioSummaryFromSubmission(raw = {}) {
  const audio = raw.audio && isObject(raw.audio) ? raw.audio : {};
  return {
    present: Boolean(raw.audio || raw.hasAudio),
    mime: boundedText(audio.mime || raw.audioMime || raw.mime, 80),
    durationMs: Math.max(0, Math.min(30 * 60 * 1000, Number(audio.durationMs || raw.audioDurationMs || 0) || 0)),
    sizeBytes: Math.max(0, Math.min(20 * 1024 * 1024, Number(audio.sizeBytes || raw.audioSizeBytes || 0) || 0))
  };
}

function structuredEvaluationInput(input = {}, options = {}) {
  const taskCard = input.taskCard || {};
  const submission = input.submission || {};
  const taskRaw = taskRawFromInput(input);
  const graph = learningGraphFromTaskRaw(taskRaw);
  const submissionRaw = parseJson(submission.raw_json, {}) || {};
  const targetNodeIds = targetNodeIdsFromTask(input);
  const cardRole = boundedText(taskRaw.cardRole || taskRaw.card_role || taskRaw.learningGraphPlan?.cardRole || taskCard.card_role || taskCard.cardRole || "practice", 80);
  const completionPolicy = taskRaw.completionPolicy || taskRaw.completion_policy || {};
  const rubricPolicy = rubricPolicyFromTask(input, options.rubricPolicyService);
  return {
    schemaVersion: "growth.card.evaluation.input.v1",
    workspaceId: boundedText(input.workspaceId || submission.workspace_id || taskCard.workspace_id, 120),
    learnerId: boundedText(submission.learner_id || taskCard.learner_id || input.learnerId || input.workspaceId, 120),
    taskCardId: boundedText(input.taskCardId || taskCard.id || submission.task_card_id, 160),
    submissionId: boundedText(input.submissionId || submission.id, 160),
    policy: {
      completionPolicy: boundedText(completionPolicy.mode || taskRaw.completionMode || "daily_score_once", 80),
      passScoreRequired: false,
      evaluationAttempts: 1,
      reflectionAttempts: 1,
      maxScore: 100
    },
    card: {
      title: boundedText(taskCard.title || taskRaw.title, 160),
      cardRole,
      recipeId: boundedText(taskRaw.recipeId || taskRaw.recipe_id || input.recipeId || input.recipe_id, 120),
      domain: boundedText(taskRaw.domain || graph.domain || taskCard.domain, 120),
      subject: boundedText(taskRaw.subject || graph.subject || taskCard.subject, 120),
      learningTarget: boundedText(taskRaw.teachingFlow?.learningTarget || taskRaw.learningTarget || taskRaw.learning_target, 500),
      instructionSummary: boundedText(taskRaw.instructionPreview || taskRaw.instruction || taskRaw.summary || taskCard.title, 900),
      targetNodeIds,
      evidenceRequirements: evidenceRequirementsFromTask(taskRaw),
      rubricPolicy
    },
    learnerEvidence: {
      text: boundedText(input.text, 4000),
      hasText: Boolean(cleanString(input.text)),
      audio: audioSummaryFromSubmission(submissionRaw)
    }
  };
}

function parseEvaluationDraftText(text = "") {
  const trimmed = cleanString(text);
  if (!trimmed) return { ok: false, error: "evaluation_draft_empty" };
  try {
    return { ok: true, draft: JSON.parse(trimmed) };
  } catch (err) {
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenced) {
      try {
        return { ok: true, draft: JSON.parse(fenced[1]) };
      } catch {
        return { ok: false, error: "evaluation_draft_invalid_json", detail: err.message };
      }
    }
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return { ok: true, draft: JSON.parse(trimmed.slice(first, last + 1)) };
      } catch {
        return { ok: false, error: "evaluation_draft_invalid_json", detail: err.message };
      }
    }
    return { ok: false, error: "evaluation_draft_invalid_json", detail: err.message };
  }
}

const PRIVACY_KEY_PATTERN = /(raw.*answer|answer.*raw|raw.*prompt|prompt.*raw|model.*output|output.*raw|transcript|hidden.*answer|hidden.*solution|secret|token|cookie|password|private.*path|provider.*config)/i;

function scanPrivacy(value, path = "", findings = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, `${path}[${index}]`, findings));
    return findings;
  }
  if (!isObject(value)) return findings;
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    if (PRIVACY_KEY_PATTERN.test(key)) {
      findings.push({ code: "privacy_risk_key", path: childPath });
    }
    scanPrivacy(child, childPath, findings);
  }
  return findings;
}

function normalizeFeedbackSections(draft = {}) {
  const sections = isObject(draft.feedbackSections) ? draft.feedbackSections : {};
  const strengths = asArray(draft.strengths || sections.strengths)
    .map((item) => boundedText(item, 180))
    .filter(Boolean)
    .slice(0, 8);
  const focusAreas = asArray(sections.focusAreas || sections.remainingWeaknesses || draft.remainingWeaknesses)
    .map((item) => boundedText(item, 180))
    .filter(Boolean)
    .slice(0, 8);
  const reflectionPrompts = asArray(sections.reflectionPrompts)
    .map((item) => boundedText(item, 180))
    .filter(Boolean)
    .slice(0, 3);
  const nextPractice = boundedText(sections.nextPractice || draft.nextPractice, 240);
  return {
    strengths,
    focusAreas,
    reflectionPrompts,
    nextPractice
  };
}

function normalizeSkillResults(draft = {}, context = {}, errors = []) {
  const targetNodeIds = uniqueStrings(context.targetNodeIds);
  const allowedDimensionIds = uniqueStrings(context.rubricDimensionIds);
  return asArray(draft.skillResults).map((item, index) => {
    const result = isObject(item) ? item : {};
    const nodeId = cleanString(result.nodeId || result.targetNodeId || result.skillId);
    const rubricDimensionId = cleanString(result.rubricDimensionId || result.dimensionId || result.rubric_dimension_id);
    if (!nodeId) {
      errors.push({ code: "skill_result_node_required", field: `skillResults[${index}].nodeId` });
    } else if (targetNodeIds.length && !targetNodeIds.includes(nodeId)) {
      errors.push({ code: "skill_result_node_outside_graph_plan", field: `skillResults[${index}].nodeId`, nodeId });
    }
    if (rubricDimensionId && allowedDimensionIds.length && !allowedDimensionIds.includes(rubricDimensionId)) {
      errors.push({
        code: "skill_result_rubric_dimension_invalid",
        field: `skillResults[${index}].rubricDimensionId`,
        rubricDimensionId
      });
    }
    return {
      nodeId,
      rubricDimensionId,
      score: scoreTo100(result.score) ?? 0,
      confidence: confidenceToUnit(result.confidence),
      status: boundedText(result.status || "observed", 80),
      evidenceType: boundedText(result.evidenceType || result.type, 80),
      evidenceTags: uniqueStrings(result.evidenceTags || result.tags).slice(0, 8),
      evidenceSummary: boundedText(result.evidenceSummary || result.summary || result.evidence, 220)
    };
  }).filter((item) => item.nodeId).slice(0, 12);
}

function normalizeRubricResults(draft = {}, context = {}, skillResults = [], errors = []) {
  const targetNodeIds = uniqueStrings(context.targetNodeIds);
  const allowedDimensionIds = uniqueStrings(context.rubricDimensionIds);
  const explicitResults = asArray(draft.rubricResults);
  const sourceResults = explicitResults.length
    ? explicitResults
    : asArray(skillResults).filter((item) => item.rubricDimensionId).map((item) => ({
      nodeId: item.nodeId,
      dimensionId: item.rubricDimensionId,
      score: item.score,
      confidence: item.confidence,
      status: item.status,
      evidenceType: item.evidenceType,
      evidenceTags: item.evidenceTags,
      evidenceSummary: item.evidenceSummary
    }));
  return sourceResults.map((item, index) => {
    const result = isObject(item) ? item : {};
    const dimensionId = cleanString(result.dimensionId || result.rubricDimensionId || result.rubric_dimension_id);
    const nodeId = cleanString(result.nodeId || result.targetNodeId || result.graphNodeId)
      || (targetNodeIds.length === 1 ? targetNodeIds[0] : "");
    if (!dimensionId) {
      errors.push({ code: "rubric_result_dimension_required", field: `rubricResults[${index}].dimensionId` });
    } else if (allowedDimensionIds.length && !allowedDimensionIds.includes(dimensionId)) {
      errors.push({ code: "rubric_result_dimension_invalid", field: `rubricResults[${index}].dimensionId`, dimensionId });
    }
    if (!nodeId) {
      errors.push({ code: "rubric_result_node_required", field: `rubricResults[${index}].nodeId` });
    } else if (targetNodeIds.length && !targetNodeIds.includes(nodeId)) {
      errors.push({ code: "rubric_result_node_outside_graph_plan", field: `rubricResults[${index}].nodeId`, nodeId });
    }
    return {
      dimensionId,
      nodeId,
      score: scoreTo100(result.score) ?? 0,
      confidence: confidenceToUnit(result.confidence),
      status: boundedText(result.status || "observed", 80),
      evidenceType: boundedText(result.evidenceType || result.type || "learner_submission_summary", 80),
      evidenceTags: uniqueStrings(result.evidenceTags || result.tags).slice(0, 8),
      evidenceSummary: boundedText(result.evidenceSummary || result.summary || result.evidence, 220)
    };
  }).filter((item) => item.dimensionId && item.nodeId).slice(0, 16);
}

function evaluationIdFor(input = {}, draft = {}) {
  const explicit = cleanString(draft.evaluationId || draft.evaluation_id || input.evaluationId);
  if (explicit) return explicit;
  const seed = cleanString(input.submissionId || input.submission?.id)
    || [input.workspaceId, input.taskCardId, input.taskCard?.id].map(cleanString).filter(Boolean).join(":")
    || `${Date.now()}:${Math.random()}`;
  return `lgeval_${sha256Hex(seed).slice(0, 18)}`;
}

function parseAndValidateEvaluationDraft(input = {}) {
  const context = input.context || {};
  const parsed = parseEvaluationDraftText(input.text);
  if (!parsed.ok) return parsed;
  const draft = parsed.draft;
  if (!isObject(draft)) {
    return { ok: false, error: "evaluation_draft_schema_invalid", errors: [{ code: "evaluation_draft_object_required", field: "$" }] };
  }

  const privacyFindings = scanPrivacy(draft);
  if (privacyFindings.length) {
    return { ok: false, error: "evaluation_draft_privacy_failed", privacyFindings };
  }

  const errors = [];
  if (cleanString(draft.schemaVersion) !== "growth.card.evaluation.v1") {
    errors.push({ code: "evaluation_schema_version_invalid", field: "schemaVersion" });
  }
  const score = scoreTo100(draft.score);
  if (score === null) errors.push({ code: "evaluation_score_required", field: "score" });
  if (!cleanString(draft.summary)) errors.push({ code: "evaluation_summary_required", field: "summary" });
  const normalizedStatus = cleanString(draft.status || "completed").toLowerCase();
  if (!["completed", "complete", "scored"].includes(normalizedStatus)) {
    errors.push({ code: "daily_score_once_requires_terminal_evaluation", field: "status" });
  }
  const feedbackSections = normalizeFeedbackSections(draft);
  const skillResults = normalizeSkillResults(draft, context, errors);
  const rubricResults = normalizeRubricResults(draft, context, skillResults, errors);
  if (errors.length) return { ok: false, error: "evaluation_draft_schema_invalid", errors };

  const maxScore = Math.max(1, scoreTo100(draft.maxScore) || 100);
  const remainingWeaknesses = uniqueStrings(
    asArray(draft.remainingWeaknesses)
      .concat(feedbackSections.focusAreas)
  ).map((item) => boundedText(item, 180)).slice(0, 8);
  const evaluation = {
    evaluationId: evaluationIdFor(context, draft),
    status: "completed",
    score,
    maxScore,
    passed: typeof draft.passed === "boolean" ? draft.passed : score >= 60,
    confidence: confidenceToUnit(draft.confidence),
    summary: boundedText(draft.summary, 700),
    revisionRequirements: [],
    remainingWeaknesses,
    feedbackSections,
    skillResults,
    rubricPolicyId: boundedText(context.rubricPolicy?.policyId || draft.rubricPolicyId || draft.rubric_policy_id, 160),
    rubricResults,
    evidenceRefs: uniqueStrings(["growth-gateway-evaluation:v1"].concat(draft.evidenceRefs || [])).slice(0, 8),
    reward: isObject(draft.reward) ? draft.reward : {
      eligible: true,
      currency: "growth_coin",
      reason: "daily_score_once_reward_eligible"
    }
  };
  return { ok: true, evaluation, draft };
}

function publicGatewayResult(result = {}) {
  return {
    ok: result.ok === false ? false : Boolean(result.ok),
    error: cleanString(result.error),
    mode: cleanString(result.mode),
    status: result.status,
    retryable: Boolean(result.retryable)
  };
}

function normalizeValidationFailure(result = {}, extra = {}) {
  return Object.assign({
    ok: false,
    stage: "validation",
    error: result.error || "evaluation_draft_validation_failed",
    errors: result.errors || [],
    privacyFindings: result.privacyFindings || []
  }, extra);
}

function createLearningCardEvaluationService(options = {}) {
  const gatewayClient = options.gatewayClient;
  const rubricPolicyService = options.rubricPolicyService || createLearningCardRubricPolicyService();
  const allowRepair = options.allowRepair !== false;

  async function evaluateSubmissionDraft(input = {}) {
    if (!gatewayClient || typeof gatewayClient.evaluateCardSubmission !== "function") {
      return unavailable("growth_gateway_evaluation_client_unavailable", { stage: "gateway" });
    }
    const request = structuredEvaluationInput(input, { rubricPolicyService });
    const context = {
      submissionId: request.submissionId,
      workspaceId: request.workspaceId,
      taskCardId: request.taskCardId,
      targetNodeIds: request.card.targetNodeIds,
      rubricPolicy: request.card.rubricPolicy,
      rubricDimensionIds: rubricDimensionIds(request.card.rubricPolicy)
    };
    const gatewayResult = await gatewayClient.evaluateCardSubmission(request);
    if (!gatewayResult?.ok) {
      return unavailable(gatewayResult?.error || "gateway_evaluation_failed", {
        stage: "gateway",
        gatewayResult: publicGatewayResult(gatewayResult || {})
      });
    }

    let validation = parseAndValidateEvaluationDraft({
      text: gatewayResult.text,
      context
    });
    let repairResult = null;
    if (!validation.ok && allowRepair && typeof gatewayClient.repairEvaluationDraft === "function") {
      repairResult = await gatewayClient.repairEvaluationDraft({
        request,
        invalidOutput: gatewayResult.text,
        errors: validation.errors || validation.privacyFindings || [{ code: validation.error || "invalid_evaluation_draft" }]
      });
      if (repairResult?.ok) {
        validation = parseAndValidateEvaluationDraft({
          text: repairResult.text,
          context
        });
      }
    }
    if (!validation.ok) {
      return normalizeValidationFailure(validation, {
        gatewayMode: gatewayResult.mode,
        repairAttempted: Boolean(repairResult),
        repairError: repairResult && repairResult.ok === false ? repairResult.error : ""
      });
    }
    return {
      ok: true,
      source: "growth-learning-card-evaluation-service",
      evaluation: validation.evaluation,
      gatewayMode: repairResult?.ok ? repairResult.mode : gatewayResult.mode,
      repaired: Boolean(repairResult?.ok)
    };
  }

  async function evaluateSubmission(input = {}) {
    const result = await evaluateSubmissionDraft(input);
    if (!result.ok) {
      const err = new Error(result.error || "growth_card_evaluation_failed");
      err.result = result;
      throw err;
    }
    return result.evaluation;
  }

  return {
    evaluateSubmission,
    evaluateSubmissionDraft,
    parseAndValidateEvaluationDraft,
    structuredEvaluationInput
  };
}

module.exports = {
  createLearningCardEvaluationService,
  parseAndValidateEvaluationDraft,
  structuredEvaluationInput
};
