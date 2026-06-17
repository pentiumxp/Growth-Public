"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const WRITE_OPERATIONS = new Set(["draft", "publish", "advance"]);
const OPERATIONS = new Set(["preview", "draft", "publish", "advance"]);

function argValue(args, name, fallback = "") {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  return String(args[index + 1] || fallback);
}

function hasFlag(args, name) {
  return args.includes(name);
}

function firstArgValue(args, names, fallback = "") {
  for (const name of names) {
    const value = argValue(args, name, "");
    if (value) return value;
  }
  return fallback;
}

function parseJsonArg(args, names, fallback = {}) {
  const text = firstArgValue(args, names, "");
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    const wrapped = new Error(`invalid_json:${names[0]}`);
    wrapped.code = "daily_loop_smoke_invalid_json";
    wrapped.option = names[0];
    wrapped.cause = error;
    throw wrapped;
  }
}

function boundedNumberArg(args, names, fallback, min = 1, max = 60) {
  const raw = firstArgValue(args, names, "");
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function collectRepeatedValues(args, names) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (names.includes(args[index])) {
      const value = String(args[index + 1] || "").trim();
      if (value) values.push(value);
    }
  }
  return values;
}

function collectCsvValues(args, names) {
  return firstArgValue(args, names, "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function uniqueStrings(values = []) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function targetNodeIds(args) {
  return uniqueStrings([
    ...collectRepeatedValues(args, ["--target-node-id", "--targetNodeId"]),
    ...collectCsvValues(args, ["--target-node-ids", "--targetNodeIds"])
  ]);
}

function stripUndefined(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stripUndefined);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, stripUndefined(item)])
  );
}

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function countArray(value) {
  return asArray(value).filter(Boolean).length;
}

function uniqueBoundedStrings(values = [], maxItems = 12) {
  return Array.from(new Set(asArray(values)
    .map((value) => cleanString(value, 160))
    .filter(Boolean)))
    .slice(0, maxItems);
}

function dailyLoopOutcome(result = {}) {
  if (result.ok === false) return cleanString(result.error || "failed", 140);
  const actions = objectOnly(result.actions);
  if (result.operation === "publish") return "published";
  if (result.operation === "advance" && result.stage === "published") return "published";
  if (result.operation === "draft") return "drafted";
  if (actions.canPublish || actions.publishAction?.enabled) return "ready_to_publish";
  if (actions.canDraft || actions.draftAction?.enabled) return "ready_to_draft";
  return "owner_review_required";
}

function projectDailyLoopSmokeReadback(result = {}) {
  const dailyLoop = objectOnly(result);
  if (!Object.keys(dailyLoop).length) return result;
  const target = objectOnly(dailyLoop.target);
  const scope = objectOnly(dailyLoop.scope);
  const readiness = objectOnly(dailyLoop.readiness);
  const targetProvisioning = objectOnly(readiness.targetProvisioning);
  const actions = objectOnly(dailyLoop.actions);
  const draftAction = objectOnly(actions.draftAction);
  const advanceAction = objectOnly(actions.advanceAction);
  const publishAction = objectOnly(actions.publishAction);
  const auditRefreshAction = objectOnly(actions.auditRefreshAction);
  const planDraft = objectOnly(dailyLoop.planDraft);
  const selectedItem = objectOnly(dailyLoop.selectedItem || planDraft.selectedItem);
  const generation = objectOnly(dailyLoop.generation);
  const graphPlan = objectOnly(generation.learningGraphPlan);
  const published = objectOnly(generation.published);
  const recommendationAcceptance = objectOnly(generation.recommendationAcceptance);
  const cycleAudit = objectOnly(dailyLoop.cycleAudit);
  const cycleAuditSummary = objectOnly(cycleAudit.summary);
  const completeness = objectOnly(dailyLoop.completeness);
  const completenessSummary = objectOnly(completeness.summary);
  const publishAttempt = objectOnly(dailyLoop.publishAttempt || planDraft.publishAttempt);
  const targetNodeIds = uniqueBoundedStrings(scope.targetNodeIds || planDraft.targetNodeIds || graphPlan.targetNodeIds);
  const missingRequired = uniqueBoundedStrings(completenessSummary.missingRequired || completeness.missingRequired);
  return Object.assign({}, dailyLoop, {
    dailyLoopOperation: cleanString(dailyLoop.operation, 80),
    dailyLoopOutcome: dailyLoopOutcome(dailyLoop),
    dailyLoopWriteOperation: WRITE_OPERATIONS.has(cleanString(dailyLoop.operation, 80)),
    dailyLoopTargetWorkspaceId: cleanString(target.workspaceId, 160),
    dailyLoopTargetLearnerId: cleanString(target.learnerId, 160),
    dailyLoopProgramId: cleanString(scope.programId || planDraft.programId, 160),
    dailyLoopDomainPackId: cleanString(scope.domainPackId || graphPlan.domainPackId, 160),
    dailyLoopDomain: cleanString(scope.domain || graphPlan.domain, 120),
    dailyLoopSubject: cleanString(scope.subject || graphPlan.subject, 120),
    dailyLoopHorizon: cleanString(scope.horizon || planDraft.horizon, 80),
    dailyLoopAvailableMinutes: Number(scope.availableMinutes || selectedItem.estimatedMinutes || 0) || 0,
    dailyLoopTargetNodeIds: targetNodeIds,
    dailyLoopTargetNodeCount: targetNodeIds.length,
    dailyLoopReadinessReady: readiness.ready === true,
    dailyLoopTargetEnabled: readiness.targetEnabled === true,
    dailyLoopTargetProvisioned: readiness.targetProvisioned === true,
    dailyLoopTargetProvisioningMode: cleanString(targetProvisioning.mode, 120),
    dailyLoopLearningGraphReady: readiness.learningGraphReady === true,
    dailyLoopPlannerReady: readiness.plannerReady === true,
    dailyLoopPlannerContextReady: readiness.plannerContextReady === true,
    dailyLoopAuthoringGatewayConfigured: readiness.authoringGatewayConfigured === true,
    dailyLoopEvaluationGatewayConfigured: readiness.evaluationGatewayConfigured === true,
    dailyLoopPlannerGatewayConfigured: readiness.plannerGatewayConfigured === true,
    dailyLoopOperatingLoopGatewayReady: readiness.operatingLoopGatewayReady === true,
    dailyLoopBlockingOpenGeneration: readiness.blockingOpenGeneration === true,
    dailyLoopCanDraft: actions.canDraft === true || draftAction.enabled === true,
    dailyLoopCanAdvance: actions.canAdvance === true || advanceAction.enabled === true,
    dailyLoopCanPublish: actions.canPublish === true || publishAction.enabled === true,
    dailyLoopDraftActionEnabled: draftAction.enabled === true,
    dailyLoopAdvanceActionEnabled: advanceAction.enabled === true,
    dailyLoopPublishActionEnabled: publishAction.enabled === true,
    dailyLoopAuditRefreshEnabled: auditRefreshAction.enabled === true,
    dailyLoopPlanDraftId: cleanString(planDraft.planDraftId || publishAction.planDraftId, 180),
    dailyLoopPlanDraftStatus: cleanString(planDraft.status, 120),
    dailyLoopPlanItemCount: Number(planDraft.itemCount || countArray(planDraft.items) || 0) || 0,
    dailyLoopSelectedItemId: cleanString(selectedItem.itemId || planDraft.selectedItemId || publishAction.itemId, 180),
    dailyLoopSelectedCardRole: cleanString(selectedItem.cardRole || graphPlan.cardRole, 120),
    dailyLoopSelectedEstimatedMinutes: Number(selectedItem.estimatedMinutes || 0) || 0,
    dailyLoopSelectedEvidenceRequirementCount: countArray(selectedItem.evidenceRequirements),
    dailyLoopGeneratedTaskCardId: cleanString(planDraft.generatedTaskCardId || published.taskCardId, 180),
    dailyLoopGeneratedLearningGraphPlanId: cleanString(planDraft.generatedLearningGraphPlanId || graphPlan.learningGraphPlanId, 180),
    dailyLoopPublishedTaskCardId: cleanString(published.taskCardId, 180),
    dailyLoopPublishedStatus: cleanString(published.status, 120),
    dailyLoopPublishTransaction: cleanString(published.transaction, 120),
    dailyLoopGenerationOk: generation.ok === true,
    dailyLoopGenerationRecipeId: cleanString(generation.recipeId, 160),
    dailyLoopGenerationGatewayMode: cleanString(generation.gatewayMode || dailyLoop.gatewayMode, 120),
    dailyLoopGenerationSourceSummaryCount: Number(generation.sourceSummaryCount || 0) || 0,
    dailyLoopRecommendationAccepted: recommendationAcceptance.ok === true,
    dailyLoopRecommendationId: cleanString(recommendationAcceptance.recommendationId, 180),
    dailyLoopRecommendationStatus: cleanString(recommendationAcceptance.status, 120),
    dailyLoopDuplicate: dailyLoop.duplicate === true,
    dailyLoopError: cleanString(dailyLoop.error, 180),
    dailyLoopStage: cleanString(dailyLoop.stage || publishAttempt.stage, 120),
    dailyLoopPublishAttemptStatus: cleanString(publishAttempt.status, 120),
    dailyLoopPublishAttemptCount: Number(publishAttempt.attemptCount || 0) || 0,
    dailyLoopCycleAuditAvailable: Boolean(dailyLoop.cycleAudit),
    dailyLoopCycleAuditOk: cycleAudit.ok === true,
    dailyLoopCycleEvidenceCount: Number(cycleAuditSummary.evidenceCount || 0) || 0,
    dailyLoopCycleProfileDeltaCount: Number(cycleAuditSummary.profileDeltaCount || 0) || 0,
    dailyLoopCompletenessAvailable: Boolean(dailyLoop.completeness),
    dailyLoopCycleComplete: completeness.complete === true,
    dailyLoopReadyForAutomation: completeness.readyForAutomation === true,
    dailyLoopMissingRequired: missingRequired,
    dailyLoopMissingRequiredCount: missingRequired.length
  });
}

function operationFromArgs(args) {
  const operation = firstArgValue(args, ["--operation", "--mode"], "preview").trim().toLowerCase();
  return operation || "preview";
}

function allowWrite(args) {
  return hasFlag(args, "--allow-write") || hasFlag(args, "--allowWrite");
}

function inputFromArgs(args) {
  const jsonInput = parseJsonArg(args, ["--input-json", "--inputJson"], {});
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], jsonInput.workspaceId || jsonInput.workspace_id || "");
  const explicitTargetNodeIds = targetNodeIds(args);
  const itemId = firstArgValue(
    args,
    ["--item-id", "--itemId", "--selected-item-id", "--selectedItemId"],
    jsonInput.itemId || jsonInput.item_id || jsonInput.selectedItemId || jsonInput.selected_item_id || ""
  );
  return stripUndefined(Object.assign({}, jsonInput, {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], jsonInput.learnerId || jsonInput.learner_id || "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], jsonInput.programId || jsonInput.program_id || ""),
    planDraftId: firstArgValue(args, ["--plan-draft-id", "--planDraftId"], jsonInput.planDraftId || jsonInput.plan_draft_id || ""),
    taskCardId: firstArgValue(args, ["--task-card-id", "--taskCardId"], jsonInput.taskCardId || jsonInput.task_card_id || ""),
    evaluationId: firstArgValue(args, ["--evaluation-id", "--evaluationId"], jsonInput.evaluationId || jsonInput.evaluation_id || ""),
    profileDeltaId: firstArgValue(args, ["--profile-delta-id", "--profileDeltaId"], jsonInput.profileDeltaId || jsonInput.profile_delta_id || ""),
    evidenceId: firstArgValue(args, ["--evidence-id", "--evidenceId"], jsonInput.evidenceId || jsonInput.evidence_id || ""),
    correctionId: firstArgValue(args, ["--correction-id", "--correctionId"], jsonInput.correctionId || jsonInput.correction_id || ""),
    sourceId: firstArgValue(args, ["--source-id", "--sourceId"], jsonInput.sourceId || jsonInput.source_id || ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], jsonInput.domainPackId || jsonInput.domain_pack_id || ""),
    domain: firstArgValue(args, ["--domain"], jsonInput.domain || ""),
    subject: firstArgValue(args, ["--subject"], jsonInput.subject || ""),
    horizon: firstArgValue(args, ["--horizon"], jsonInput.horizon || "daily_plan") || "daily_plan",
    recipeId: firstArgValue(args, ["--recipe-id", "--recipeId"], jsonInput.recipeId || jsonInput.recipe_id || ""),
    selectedRecipeId: firstArgValue(args, ["--selected-recipe-id", "--selectedRecipeId"], jsonInput.selectedRecipeId || jsonInput.selected_recipe_id || ""),
    availableMinutes: boundedNumberArg(args, ["--available-minutes", "--availableMinutes"], jsonInput.availableMinutes || jsonInput.available_minutes || 15, 1, 60),
    limit: boundedNumberArg(args, ["--limit"], jsonInput.limit || 12, 1, 50),
    itemId,
    selectedItemId: itemId,
    targetNodeIds: explicitTargetNodeIds.length ? explicitTargetNodeIds : jsonInput.targetNodeIds || jsonInput.target_node_ids,
    generationKey: firstArgValue(args, ["--generation-key", "--generationKey"], jsonInput.generationKey || jsonInput.generation_key || ""),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy"], jsonInput.requestedBy || jsonInput.requested_by || "")
  }));
}

function validateOperation(operation, input = {}, args = []) {
  if (!OPERATIONS.has(operation)) {
    return {
      ok: false,
      error: "daily_loop_smoke_operation_invalid",
      operation,
      allowedOperations: Array.from(OPERATIONS)
    };
  }
  if (WRITE_OPERATIONS.has(operation) && !allowWrite(args)) {
    return {
      ok: false,
      error: "daily_loop_smoke_write_not_allowed",
      operation,
      requiredFlag: "--allow-write"
    };
  }
  if (operation === "publish" && !input.planDraftId) {
    return {
      ok: false,
      error: "daily_loop_smoke_plan_draft_id_required",
      operation
    };
  }
  return { ok: true };
}

async function runOperation(services, operation, input) {
  const service = services.learningDailyLoopService;
  if (operation === "draft") return service.draft(input);
  if (operation === "publish") return service.publish(input);
  if (operation === "advance") return service.advance(input);
  return service.preview(input);
}

function formatResult(result, pretty) {
  return `${JSON.stringify(result, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json");
  const operation = operationFromArgs(args);
  let input;
  try {
    input = inputFromArgs(args);
  } catch (error) {
    process.stdout.write(formatResult({
      ok: false,
      error: error.code || "daily_loop_smoke_parse_failed",
      option: error.option || ""
    }, pretty));
    process.exitCode = 2;
    return;
  }
  if (!input.workspaceId) {
    process.stdout.write(formatResult({
      ok: false,
      error: "workspace_id_required"
    }, pretty));
    process.exitCode = 2;
    return;
  }
  const validation = validateOperation(operation, input, args);
  if (!validation.ok) {
    process.stdout.write(formatResult(validation, pretty));
    process.exitCode = 2;
    return;
  }
  const config = readEnv(process.env);
  const services = createServices(config);
  const result = projectDailyLoopSmokeReadback(await runOperation(services, operation, input));
  process.stdout.write(formatResult(result, pretty));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "daily_loop_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  allowWrite,
  inputFromArgs,
  operationFromArgs,
  projectDailyLoopSmokeReadback,
  runOperation,
  targetNodeIds,
  validateOperation
};
