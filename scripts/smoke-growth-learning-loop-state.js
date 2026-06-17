"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

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
    wrapped.code = "learning_loop_state_smoke_invalid_json";
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

function projectLearningLoopStateSmokeReadback(result = {}) {
  const state = objectOnly(result);
  if (!Object.keys(state).length) return result;
  const target = objectOnly(state.target);
  const scope = objectOnly(state.scope);
  const summary = objectOnly(state.summary);
  const nextAction = objectOnly(state.nextAction);
  const readiness = objectOnly(state.readiness);
  const audit = objectOnly(state.audit);
  const profile = objectOnly(state.profile);
  const recommendation = objectOnly(state.recommendation);
  const recommendationEvidence = objectOnly(state.recommendationEvidence);
  const recommendationEvidenceSummary = objectOnly(recommendationEvidence.summary);
  const recommendationEvidenceTrace = objectOnly(recommendationEvidence.evidenceTrace);
  const rewardTrace = objectOnly(recommendationEvidence.rewardTrace);
  const rewardSummary = objectOnly(rewardTrace.summary);
  const stageAssessment = objectOnly(state.stageAssessment);
  const targetNodeIds = uniqueBoundedStrings(scope.targetNodeIds);
  const missingRequired = uniqueBoundedStrings(summary.missingRequired || audit.missingRequired);
  const fields = {
    learningLoopStateStatus: cleanString(state.status || summary.status, 120),
    learningLoopStateReadyForDraft: summary.readyForDraft === true,
    learningLoopStateReadyForPublish: summary.readyForPublish === true,
    learningLoopStateStageCheckpointReady: summary.stageCheckpointReady === true,
    learningLoopStateStageCheckpointActive: summary.stageCheckpointActive === true,
    learningLoopStateAuditComplete: summary.auditComplete === true,
    learningLoopStateRecommendationEvidenceReady: summary.recommendationEvidenceReady === true,
    learningLoopStateWeaknessCount: Number(summary.weaknessCount || profile.weaknessCount || 0) || 0,
    learningLoopStateMissingRequired: missingRequired,
    learningLoopStateMissingRequiredCount: missingRequired.length,
    learningLoopStateNextAction: cleanString(nextAction.action, 140),
    learningLoopStateNextActionEnabled: nextAction.enabled !== false,
    learningLoopStateNextActionReason: cleanString(nextAction.reason, 180),
    learningLoopStateNextActionEndpoint: cleanString(nextAction.endpoint, 180),
    learningLoopStateTargetWorkspaceId: cleanString(target.workspaceId, 160),
    learningLoopStateTargetLearnerId: cleanString(target.learnerId, 160),
    learningLoopStateProgramId: cleanString(scope.programId, 160),
    learningLoopStateDomainPackId: cleanString(scope.domainPackId, 160),
    learningLoopStateDomain: cleanString(scope.domain, 120),
    learningLoopStateSubject: cleanString(scope.subject, 120),
    learningLoopStateHorizon: cleanString(scope.horizon, 80),
    learningLoopStateAvailableMinutes: Number(scope.availableMinutes || 0) || 0,
    learningLoopStateTargetNodeIds: targetNodeIds,
    learningLoopStateTargetNodeCount: targetNodeIds.length,
    learningLoopStateReadinessReady: readiness.ready === true,
    learningLoopStateTargetProvisioned: readiness.targetProvisioned === true,
    learningLoopStateLearningGraphReady: readiness.learningGraphReady === true,
    learningLoopStatePlannerReady: readiness.plannerReady === true,
    learningLoopStateAuthoringGatewayConfigured: readiness.authoringGatewayConfigured === true,
    learningLoopStateEvaluationGatewayConfigured: readiness.evaluationGatewayConfigured === true,
    learningLoopStatePlannerGatewayConfigured: readiness.plannerGatewayConfigured === true,
    learningLoopStateOperatingLoopGatewayReady: readiness.operatingLoopGatewayReady === true,
    learningLoopStateBlockingOpenGeneration: readiness.blockingOpenGeneration === true,
    learningLoopStatePlanDraftCount: Number(audit.planDraftCount || 0) || 0,
    learningLoopStatePublishedPlanCount: Number(audit.publishedPlanCount || 0) || 0,
    learningLoopStateEvidenceCount: Number(audit.evidenceCount || profile.evidenceCount || 0) || 0,
    learningLoopStateProfileDeltaCount: Number(audit.profileDeltaCount || 0) || 0,
    learningLoopStateCorrectionCount: Number(audit.correctionCount || 0) || 0,
    learningLoopStateRecommendationAvailable: recommendation.available === true,
    learningLoopStateRecommendationId: cleanString(recommendation.recommendationId, 160),
    learningLoopStateRecommendationStatus: cleanString(recommendation.recommendationStatus, 120),
    learningLoopStateRecommendationStrategy: cleanString(recommendation.strategy, 120),
    learningLoopStateRecommendationTargetNodeId: cleanString(recommendation.targetNodeId, 160),
    learningLoopStateRecommendationTargetNodeCount: countArray(recommendation.targetNodeIds),
    learningLoopStateRecommendationEvidenceItemCount: Number(recommendationEvidenceSummary.evidenceItemCount || 0) || 0,
    learningLoopStateRecommendationEvidenceIdCount: Number(recommendationEvidenceSummary.evidenceIdCount || countArray(recommendationEvidenceTrace.evidenceIds) || 0) || 0,
    learningLoopStateRecommendationProfileDeltaCount: Number(recommendationEvidenceSummary.profileDeltaCount || 0) || 0,
    learningLoopStateRecommendationCorrectionCount: Number(recommendationEvidenceSummary.correctionCount || 0) || 0,
    learningLoopStateRecommendationLifecycleCount: Number(recommendationEvidenceSummary.recommendationLifecycleCount || 0) || 0,
    learningLoopStateRewardSettlementCount: Number(recommendationEvidenceSummary.rewardSettlementCount || rewardSummary.rewardSettlementCount || 0) || 0,
    learningLoopStateTotalRewardCoins: Number(recommendationEvidenceSummary.totalRewardCoins || rewardSummary.totalCoinAmount || 0) || 0,
    learningLoopStateStageAssessmentStatus: cleanString(stageAssessment.status, 120),
    learningLoopStateStageAssessmentEligible: stageAssessment.eligible === true,
    learningLoopStateStageAssessmentCycleId: cleanString(stageAssessment.cycleId, 160),
    learningLoopStateStageAssessmentGeneratedTaskCardId: cleanString(stageAssessment.generatedTaskCardId, 160)
  };
  return Object.assign({}, state, fields);
}

function inputFromArgs(args) {
  const jsonInput = parseJsonArg(args, ["--input-json", "--inputJson"], {});
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], jsonInput.workspaceId || jsonInput.workspace_id || "");
  const explicitTargetNodeIds = targetNodeIds(args);
  return stripUndefined(Object.assign({}, jsonInput, {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], jsonInput.learnerId || jsonInput.learner_id || "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], jsonInput.programId || jsonInput.program_id || ""),
    planDraftId: firstArgValue(args, ["--plan-draft-id", "--planDraftId"], jsonInput.planDraftId || jsonInput.plan_draft_id || ""),
    itemId: firstArgValue(args, ["--item-id", "--itemId", "--selected-item-id", "--selectedItemId"], jsonInput.itemId || jsonInput.item_id || jsonInput.selectedItemId || jsonInput.selected_item_id || ""),
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
    availableMinutes: boundedNumberArg(args, ["--available-minutes", "--availableMinutes"], jsonInput.availableMinutes || jsonInput.available_minutes || 15, 1, 60),
    limit: boundedNumberArg(args, ["--limit"], jsonInput.limit || 12, 1, 50),
    targetNodeIds: explicitTargetNodeIds.length ? explicitTargetNodeIds : jsonInput.targetNodeIds || jsonInput.target_node_ids,
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy"], jsonInput.requestedBy || jsonInput.requested_by || "")
  }));
}

function formatResult(result, pretty) {
  return `${JSON.stringify(result, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json");
  let input;
  try {
    input = inputFromArgs(args);
  } catch (error) {
    process.stdout.write(formatResult({
      ok: false,
      error: error.code || "learning_loop_state_smoke_parse_failed",
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
  const config = readEnv(process.env);
  const services = createServices(config);
  const result = projectLearningLoopStateSmokeReadback(services.learningLoopStateService.state(input));
  process.stdout.write(formatResult(result, pretty));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "learning_loop_state_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  projectLearningLoopStateSmokeReadback,
  targetNodeIds
};
