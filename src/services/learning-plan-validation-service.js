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

function boundedText(value, max = 320) {
  return cleanString(value).slice(0, max);
}

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw)/i;
const ALLOWED_HORIZONS = Object.freeze(["daily_plan", "weekly_plan", "stage_checkpoint_plan", "repair_plan"]);

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

function normalizeRole(value = "") {
  const role = cleanString(value).toLowerCase();
  if (role === "repair") return "teaching";
  return role;
}

function policyCompletion(pressurePolicy = {}) {
  return cleanString(pressurePolicy.completionPolicy);
}

function stageActivationPolicy(item = {}) {
  const policy = item.activationPolicy || item.stageAssessmentPolicy || {};
  return {
    activateThrough: cleanString(policy.activateThrough || policy.activate_through),
    reason: boundedText(policy.reason, 240)
  };
}

function stageCoverageNodeIds(item = {}) {
  return uniqueStrings(item.assessmentCoverageNodeIds || item.assessmentCoverage || item.coverageNodeIds || item.targetNodeIds || item.nodeIds);
}

function createLearningPlanValidationService() {
  function validatePlanDraft(input = {}) {
    const draft = input.draft || {};
    const context = input.context || {};
    const errors = [];
    const privacyFindings = scanPrivacy(draft);
    if (privacyFindings.length) errors.push({ code: "plan_privacy_failed", paths: privacyFindings });
    if (cleanString(draft.schemaVersion) !== "growth.learningPlanDraft.v1") errors.push({ code: "schema_version_invalid" });
    const items = asArray(draft.items);
    if (!items.length) errors.push({ code: "plan_items_required" });
    const candidateNodeIds = new Set(asArray(context.knowledgeGraph?.candidateNodes).map((node) => cleanString(node.nodeId)).filter(Boolean));
    const allowedRoles = new Set(uniqueStrings(context.constraints?.allowedCardRoles || ["teaching", "practice", "repair", "stretch", "integration_practice", "stage_assessment"]));
    const horizon = cleanString(draft.horizon || context.horizon) || "daily_plan";
    if (!ALLOWED_HORIZONS.includes(horizon)) errors.push({ code: "planner_horizon_not_allowed", horizon });
    if (horizon === "weekly_plan" && items.length > 5) errors.push({ code: "weekly_plan_too_many_items", itemCount: items.length });
    let totalEstimatedMinutes = 0;
    const normalizedItems = [];
    items.forEach((item, index) => {
      const cardRole = normalizeRole(item.cardRole);
      const targetNodeIds = uniqueStrings(item.targetNodeIds || item.nodeIds);
      if (!cardRole || (!allowedRoles.has(cardRole) && !(item.cardRole === "repair" && allowedRoles.has("repair")))) {
        errors.push({ code: "card_role_not_allowed", index, cardRole: cleanString(item.cardRole) });
      }
      if (!targetNodeIds.length) errors.push({ code: "target_node_ids_required", index });
      for (const nodeId of targetNodeIds) {
        if (candidateNodeIds.size && !candidateNodeIds.has(nodeId)) errors.push({ code: "target_node_not_in_context", index, nodeId });
      }
      const estimatedMinutes = Math.max(0, Number(item.estimatedMinutes || 0) || 0);
      totalEstimatedMinutes += estimatedMinutes;
      const pressurePolicy = item.pressurePolicy || {};
      if (horizon === "daily_plan") {
        if (estimatedMinutes > 20) errors.push({ code: "daily_plan_too_long", index, estimatedMinutes });
        if (pressurePolicy.completionPolicy !== "daily_score_once") errors.push({ code: "daily_completion_policy_invalid", index });
        if (pressurePolicy.passScoreRequired !== false) errors.push({ code: "daily_pass_score_required_forbidden", index });
        if (cardRole === "stage_assessment") errors.push({ code: "daily_stage_assessment_forbidden", index });
      }
      if (horizon === "weekly_plan") {
        if (estimatedMinutes > 20) errors.push({ code: "weekly_plan_item_too_long", index, estimatedMinutes });
        if (policyCompletion(pressurePolicy) !== "daily_score_once") errors.push({ code: "weekly_completion_policy_invalid", index });
        if (pressurePolicy.passScoreRequired !== false) errors.push({ code: "weekly_pass_score_required_forbidden", index });
        if (cardRole === "stage_assessment") errors.push({ code: "weekly_stage_assessment_forbidden", index });
      }
      if (horizon === "repair_plan") {
        if (estimatedMinutes > 20) errors.push({ code: "repair_plan_too_long", index, estimatedMinutes });
        if (policyCompletion(pressurePolicy) !== "daily_score_once") errors.push({ code: "repair_completion_policy_invalid", index });
        if (pressurePolicy.passScoreRequired !== false) errors.push({ code: "repair_pass_score_required_forbidden", index });
        if (cardRole === "stage_assessment") errors.push({ code: "repair_stage_assessment_forbidden", index });
      }
      const activationPolicy = stageActivationPolicy(item);
      const assessmentCoverageNodeIds = stageCoverageNodeIds(item);
      if (horizon === "stage_checkpoint_plan") {
        if (cardRole !== "stage_assessment") errors.push({ code: "stage_checkpoint_role_required", index, cardRole });
        if (policyCompletion(pressurePolicy) !== "formal_assessment") errors.push({ code: "stage_checkpoint_completion_policy_invalid", index });
        if (activationPolicy.activateThrough !== "learning-stage-assessment-service") {
          errors.push({ code: "stage_assessment_activation_policy_required", index });
        }
        if (!assessmentCoverageNodeIds.length) errors.push({ code: "stage_assessment_coverage_required", index });
      }
      normalizedItems.push({
        itemId: cleanString(item.itemId) || `plan_item_${index + 1}`,
        cardRole,
        subject: cleanString(item.subject || context.knowledgeGraph?.subject),
        targetNodeIds,
        estimatedMinutes,
        difficultyBand: cleanString(item.difficultyBand),
        supportLevel: cleanString(item.supportLevel),
        evidenceRequirements: uniqueStrings(item.evidenceRequirements).slice(0, 8),
        reason: boundedText(item.reason, 320),
        pressurePolicy: {
          completionPolicy: cleanString(pressurePolicy.completionPolicy),
          passScoreRequired: pressurePolicy.passScoreRequired === true
        },
        activationPolicy,
        assessmentCoverageNodeIds
      });
    });
    if (horizon === "weekly_plan" && totalEstimatedMinutes > 75) {
      errors.push({ code: "weekly_plan_total_too_long", estimatedMinutes: totalEstimatedMinutes });
    }
    if (errors.length) return { ok: false, error: "learning_plan_validation_failed", errors };
    return {
      ok: true,
      draft: {
        schemaVersion: "growth.learningPlanDraft.v1",
        horizon,
        planSummary: boundedText(draft.planSummary),
        items: normalizedItems,
        audit: {
          basisEvidenceIds: uniqueStrings(draft.audit?.basisEvidenceIds).slice(0, 12),
          profileSnapshotId: cleanString(draft.audit?.profileSnapshotId)
        }
      }
    };
  }

  return {
    validatePlanDraft
  };
}

module.exports = {
  createLearningPlanValidationService
};
