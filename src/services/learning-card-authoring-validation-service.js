"use strict";

const CARD_ROLES = Object.freeze(["teaching", "practice", "integration_practice", "stage_assessment"]);
const ORDINARY_CARD_ROLES = Object.freeze(["teaching", "practice", "integration_practice"]);
const REQUIRED_TEACHING_FLOW_FIELDS = Object.freeze([
  "learningTarget",
  "prerequisites",
  "microLesson",
  "workedExample",
  "guidedPractice",
  "quickCheck"
]);
const FORBIDDEN_KEY_PATTERNS = Object.freeze([
  /(^|_)raw.*prompt/i,
  /(^|_)system.*prompt/i,
  /(^|_)developer.*prompt/i,
  /answer.*key/i,
  /hidden.*answer/i,
  /raw.*model.*response/i,
  /full.*transcript/i,
  /full.*source/i,
  /access.*key/i,
  /password/i,
  /secret/i,
  /cookie/i,
  /token/i
]);
const FORBIDDEN_VALUE_PATTERNS = Object.freeze([
  /BEGIN [A-Z ]*PRIVATE KEY/,
  /\bsk-[A-Za-z0-9_-]{20,}/,
  /\bBearer\s+[A-Za-z0-9._-]{20,}/i
]);

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unavailable(error, extra = {}) {
  return Object.assign({ ok: false, error }, extra);
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

function firstPlanCard(plan = {}) {
  return asArray(plan.cardSequence)[0] || {};
}

function planRole(plan = {}) {
  return cleanString(firstPlanCard(plan).cardRole || plan.cardRole).toLowerCase();
}

function planTargetNodeIds(plan = {}) {
  return uniqueStrings(firstPlanCard(plan).targetNodeIds || plan.targetNodeIds || [plan.targetNodeId]);
}

function planAssessmentCoverage(plan = {}) {
  return uniqueStrings(plan.assessmentCoverage || firstPlanCard(plan).assessmentCoverage || firstPlanCard(plan).assessmentCoverageNodeIds);
}

function parseJsonObject(text = "") {
  try {
    const parsed = JSON.parse(String(text || ""));
    if (!isObject(parsed)) return unavailable("authoring_draft_object_required");
    return { ok: true, value: parsed };
  } catch (err) {
    return unavailable("authoring_draft_invalid_json", { detail: cleanString(err.message) });
  }
}

function hasForbiddenKey(key = "") {
  return FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(cleanString(key)));
}

function hasForbiddenValue(value = "") {
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(String(value || "")));
}

function scanPrivacy(value, path = "draft", findings = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, `${path}[${index}]`, findings));
    return findings;
  }
  if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.${key}`;
      if (hasForbiddenKey(key)) findings.push({ path: childPath, reason: "forbidden_key" });
      scanPrivacy(child, childPath, findings);
    }
    return findings;
  }
  if (typeof value === "string") {
    if (value.length > 5000) findings.push({ path, reason: "unbounded_string" });
    if (hasForbiddenValue(value)) findings.push({ path, reason: "forbidden_secret_like_value" });
  }
  return findings;
}

function teachingFlowErrors(draft = {}) {
  const errors = [];
  const role = cleanString(draft.cardRole).toLowerCase();
  if (!ORDINARY_CARD_ROLES.includes(role)) return errors;
  if (!isObject(draft.teachingFlow)) {
    errors.push({ code: "teaching_flow_required", path: "teachingFlow" });
    return errors;
  }
  for (const field of REQUIRED_TEACHING_FLOW_FIELDS) {
    const value = draft.teachingFlow[field];
    if (value === undefined || value === null || (typeof value === "string" && !cleanString(value))) {
      errors.push({ code: "teaching_flow_field_required", path: `teachingFlow.${field}` });
    }
  }
  if (isObject(draft.teachingFlow.quickCheck) && !cleanString(draft.teachingFlow.quickCheck.instruction)) {
    errors.push({ code: "quick_check_instruction_required", path: "teachingFlow.quickCheck.instruction" });
  }
  return errors;
}

function rolePolicyErrors(draft = {}, context = {}) {
  const errors = [];
  const role = cleanString(draft.cardRole).toLowerCase();
  if (!CARD_ROLES.includes(role)) errors.push({ code: "invalid_card_role", path: "cardRole" });
  const requestedRole = cleanString(context.cardRole || context.requestedCardRole).toLowerCase();
  if (requestedRole && role && requestedRole !== role) {
    errors.push({ code: "card_role_mismatch", path: "cardRole", expected: requestedRole, actual: role });
  }
  if (ORDINARY_CARD_ROLES.includes(role)) {
    const minutes = Number(draft.expectedTimeMinutes || draft.expectedDurationMinutes || 0);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      errors.push({ code: "expected_time_required", path: "expectedTimeMinutes" });
    } else if (minutes < 10 || minutes > 15) {
      errors.push({ code: "daily_expected_time_out_of_range", path: "expectedTimeMinutes", min: 10, max: 15, actual: minutes });
    }
    if (!cleanString(draft.difficultyBasis)) {
      errors.push({ code: "difficulty_basis_required", path: "difficultyBasis" });
    }
    if (!cleanString(draft.supportLevel)) {
      errors.push({ code: "support_level_required", path: "supportLevel" });
    }
  }
  if (role === "stage_assessment") {
    const minutes = Number(draft.expectedTimeMinutes || draft.expectedDurationMinutes || 0);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      errors.push({ code: "expected_time_required", path: "expectedTimeMinutes" });
    } else if (minutes < 25 || minutes > 30) {
      errors.push({ code: "stage_assessment_expected_time_out_of_range", path: "expectedTimeMinutes", min: 25, max: 30, actual: minutes });
    }
  }
  return errors;
}

function graphPolicyErrors(draft = {}, context = {}) {
  const errors = [];
  const plan = context.learningGraphPlan || {};
  const planId = cleanString(plan.learningGraphPlanId);
  if (!planId) {
    errors.push({ code: "learning_graph_plan_required", path: "learningGraphPlan" });
    return errors;
  }
  const role = cleanString(draft.cardRole).toLowerCase();
  const expectedRole = planRole(plan);
  if (expectedRole && role && expectedRole !== role) {
    errors.push({ code: "graph_plan_role_mismatch", path: "cardRole", expected: expectedRole, actual: role });
  }
  const draftNodeIds = uniqueStrings(draft.targetNodeIds || draft.nodeIds || planTargetNodeIds(plan));
  if (!draftNodeIds.length) errors.push({ code: "target_node_required", path: "targetNodeIds" });
  if ((role === "teaching" || role === "practice") && draftNodeIds.length !== 1) {
    errors.push({ code: "focused_card_requires_one_target_node", path: "targetNodeIds" });
  }
  const planNodes = planTargetNodeIds(plan);
  const outsidePlan = draftNodeIds.filter((nodeId) => !planNodes.includes(nodeId));
  if (outsidePlan.length) errors.push({ code: "target_node_outside_graph_plan", path: "targetNodeIds", nodeIds: outsidePlan });
  if (role === "stage_assessment") {
    const coverage = uniqueStrings(draft.assessmentCoverageNodeIds || draft.assessmentCoverage || planAssessmentCoverage(plan));
    if (!coverage.length) errors.push({ code: "assessment_coverage_missing", path: "assessmentCoverageNodeIds" });
  }
  return errors;
}

function publicDraft(draft = {}, context = {}) {
  const plan = context.learningGraphPlan || {};
  const role = cleanString(draft.cardRole).toLowerCase();
  return Object.assign({}, draft, {
    cardRole: role,
    learningGraphPlanId: cleanString(draft.learningGraphPlanId || plan.learningGraphPlanId),
    targetNodeIds: uniqueStrings(draft.targetNodeIds || draft.nodeIds || planTargetNodeIds(plan)),
    prerequisiteNodeIds: uniqueStrings(draft.prerequisiteNodeIds || plan.prerequisiteNodeIds),
    assessmentCoverageNodeIds: uniqueStrings(draft.assessmentCoverageNodeIds || draft.assessmentCoverage || planAssessmentCoverage(plan)),
    schemaVersion: cleanString(draft.schemaVersion || context.cardSchemaVersion || "growth.card.authoring.v1")
  });
}

function createLearningCardAuthoringValidationService() {
  function validateDraft(draft = {}, context = {}) {
    const errors = [];
    errors.push(...rolePolicyErrors(draft, context));
    errors.push(...teachingFlowErrors(draft));
    errors.push(...graphPolicyErrors(draft, context));
    const privacyFindings = scanPrivacy(draft);
    for (const finding of privacyFindings) {
      errors.push({ code: "privacy_scan_failed", path: finding.path, reason: finding.reason });
    }
    if (errors.length) return unavailable("card_authoring_validation_failed", { errors, privacyFindings });
    return { ok: true, draft: publicDraft(draft, context), privacyFindings: [] };
  }

  function parseAndValidateDraft(input = {}) {
    const parsed = isObject(input.draft)
      ? { ok: true, value: input.draft }
      : parseJsonObject(input.text);
    if (!parsed.ok) return parsed;
    return validateDraft(parsed.value, input.context || {});
  }

  return {
    parseAndValidateDraft,
    validateDraft
  };
}

module.exports = {
  CARD_ROLES,
  REQUIRED_TEACHING_FLOW_FIELDS,
  createLearningCardAuthoringValidationService
};
