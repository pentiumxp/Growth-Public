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
    wrapped.code = "profile_feedback_smoke_invalid_json";
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

function checkStatusCount(checks = [], status) {
  return asArray(checks).filter((check) => objectOnly(check).status === status).length;
}

function projectProfileFeedbackSmokeReadback(result = {}) {
  const feedback = objectOnly(result);
  if (!Object.keys(feedback).length) return result;
  const scope = objectOnly(feedback.scope);
  const summary = objectOnly(feedback.summary);
  const profile = objectOnly(feedback.profile);
  const evidence = objectOnly(feedback.evidence);
  const profileDelta = objectOnly(feedback.profileDelta);
  const recommendation = objectOnly(feedback.recommendation);
  const loopState = objectOnly(feedback.loopState);
  const nextAction = objectOnly(loopState.nextAction);
  const reward = objectOnly(loopState.reward);
  const selectorDiscovery = objectOnly(feedback.selectorDiscovery);
  const autoSelection = objectOnly(feedback.autoSelection);
  const selectedCycle = objectOnly(feedback.selectedCompletedCycle || autoSelection.selected);
  const checks = asArray(feedback.checks);
  const missingRequired = uniqueBoundedStrings(summary.missingRequired);
  const loopMissingRequired = uniqueBoundedStrings(loopState.missingRequired);
  const targetNodeIds = uniqueBoundedStrings(scope.targetNodeIds);
  const recommendationTargetNodeIds = uniqueBoundedStrings(recommendation.targetNodeIds);
  return Object.assign({}, feedback, {
    profileFeedbackStatus: cleanString(feedback.status || feedback.error, 140),
    profileFeedbackReadyForNextPlan: feedback.readyForNextPlan === true || summary.readyForNextPlan === true,
    profileFeedbackCycleComplete: feedback.complete === true || summary.cycleComplete === true,
    profileFeedbackReadyForAutomation: feedback.readyForAutomation === true,
    profileFeedbackTargetWorkspaceId: cleanString(scope.workspaceId, 160),
    profileFeedbackTargetLearnerId: cleanString(scope.learnerId, 160),
    profileFeedbackProgramId: cleanString(scope.programId, 160),
    profileFeedbackDomainPackId: cleanString(scope.domainPackId, 160),
    profileFeedbackDomain: cleanString(scope.domain, 120),
    profileFeedbackSubject: cleanString(scope.subject, 120),
    profileFeedbackHorizon: cleanString(scope.horizon, 80),
    profileFeedbackAvailableMinutes: Number(scope.availableMinutes || 0) || 0,
    profileFeedbackPlanDraftId: cleanString(scope.planDraftId, 180),
    profileFeedbackTaskCardId: cleanString(scope.taskCardId, 180),
    profileFeedbackEvaluationId: cleanString(scope.evaluationId, 180),
    profileFeedbackProfileDeltaId: cleanString(scope.profileDeltaId, 180),
    profileFeedbackEvidenceId: cleanString(scope.evidenceId, 180),
    profileFeedbackCorrectionId: cleanString(scope.correctionId, 180),
    profileFeedbackSourceId: cleanString(scope.sourceId, 180),
    profileFeedbackTargetNodeIds: targetNodeIds,
    profileFeedbackTargetNodeCount: targetNodeIds.length,
    profileFeedbackAutoSelectCompletedCycle: scope.autoSelectCompletedCycle === true,
    profileFeedbackAutoSelectLatestCompletedCycle: scope.autoSelectLatestCompletedCycle === true,
    profileFeedbackLimit: Number(scope.limit || 0) || 0,
    profileFeedbackCheckCount: checks.length,
    profileFeedbackPassCheckCount: checkStatusCount(checks, "pass"),
    profileFeedbackMissingCheckCount: checkStatusCount(checks, "missing"),
    profileFeedbackBlockedCheckCount: checkStatusCount(checks, "blocked"),
    profileFeedbackMissingRequired: missingRequired,
    profileFeedbackMissingRequiredCount: missingRequired.length,
    profileFeedbackEvidenceCount: Number(summary.evidenceCount || evidence.count || 0) || 0,
    profileFeedbackEvidenceSourceTypes: uniqueBoundedStrings(evidence.sourceTypes, 8),
    profileFeedbackEvidenceGraphNodeCount: countArray(evidence.graphNodeIds),
    profileFeedbackProfileDeltaCount: Number(summary.profileDeltaCount || profileDelta.count || 0) || 0,
    profileFeedbackLatestProfileDeltaId: cleanString(profileDelta.latestProfileDeltaId, 180),
    profileFeedbackChangedCapabilityCount: Number(profileDelta.changedCapabilityCount || 0) || 0,
    profileFeedbackProfileAvailable: profile.available === true,
    profileFeedbackProfileEvidenceCount: Number(summary.profileEvidenceCount || profile.evidenceCount || 0) || 0,
    profileFeedbackProfileCapabilityStateCount: Number(profile.capabilityStateCount || 0) || 0,
    profileFeedbackProfileWeaknessCount: Number(summary.profileWeaknessCount || profile.weaknessCount || 0) || 0,
    profileFeedbackProfileStrengthCount: Number(profile.strengthCount || 0) || 0,
    profileFeedbackProfileStaleCount: Number(profile.staleCount || 0) || 0,
    profileFeedbackPlannerStrategy: cleanString(profile.plannerStrategy, 120),
    profileFeedbackRecommendationAvailable: recommendation.available === true,
    profileFeedbackRecommendationMode: cleanString(summary.recommendationMode || recommendation.mode, 120),
    profileFeedbackRecommendationStatus: cleanString(recommendation.status, 120),
    profileFeedbackRecommendationStrategy: cleanString(summary.recommendationStrategy || recommendation.strategy, 120),
    profileFeedbackRecommendationCardRole: cleanString(recommendation.cardRole, 120),
    profileFeedbackRecommendationTargetNodeId: cleanString(recommendation.targetNodeId, 180),
    profileFeedbackRecommendationTargetNodeIds: recommendationTargetNodeIds,
    profileFeedbackRecommendationTargetNodeCount: recommendationTargetNodeIds.length,
    profileFeedbackLoopStateAvailable: loopState.available === true,
    profileFeedbackLoopStatus: cleanString(summary.loopStatus || loopState.status, 120),
    profileFeedbackLoopNextAction: cleanString(summary.nextAction || nextAction.action, 140),
    profileFeedbackLoopNextActionEnabled: nextAction.enabled !== false,
    profileFeedbackLoopNextActionTargetNodeId: cleanString(nextAction.targetNodeId, 180),
    profileFeedbackLoopAuditComplete: loopState.auditComplete === true,
    profileFeedbackLoopMissingRequired: loopMissingRequired,
    profileFeedbackLoopMissingRequiredCount: loopMissingRequired.length,
    profileFeedbackRewardAvailable: reward.available === true,
    profileFeedbackRewardSettlementCount: Number(summary.rewardSettlementCount || reward.rewardSettlementCount || 0) || 0,
    profileFeedbackTotalRewardCoins: Number(summary.totalRewardCoins || reward.totalRewardCoins || 0) || 0,
    profileFeedbackLatestRewardSettlementId: cleanString(reward.latestRewardSettlementId, 180),
    profileFeedbackSelectorDiscoveryAvailable: selectorDiscovery.available === true,
    profileFeedbackSelectorDiscoveryStatus: cleanString(summary.selectorDiscoveryStatus || selectorDiscovery.status, 120),
    profileFeedbackSelectorCycleCount: Number(summary.cycleCount || selectorDiscovery.cycleCount || 0) || 0,
    profileFeedbackSelectorCompleteCycleCount: Number(summary.completeCycleCount || selectorDiscovery.completeCount || 0) || 0,
    profileFeedbackSelectorReadyForAutomationCount: Number(selectorDiscovery.readyForAutomationCount || 0) || 0,
    profileFeedbackSelectorCandidateCount: Number(summary.selectorCandidateCount || selectorDiscovery.candidateCount || 0) || 0,
    profileFeedbackAutoSelectionAttempted: autoSelection.attempted === true,
    profileFeedbackAutoSelectionStatus: cleanString(summary.autoSelectionStatus || autoSelection.status, 120),
    profileFeedbackAutoSelectionCandidateCount: Number(autoSelection.candidateCount || 0) || 0,
    profileFeedbackSelectedCycleId: cleanString(summary.selectedCycleId || selectedCycle.cycleId, 180),
    profileFeedbackSelectedTaskCardId: cleanString(summary.selectedTaskCardId || selectedCycle.taskCardId, 180),
    profileFeedbackNextAction: cleanString(summary.nextAction, 140)
  });
}

function inputFromArgs(args) {
  const jsonInput = parseJsonArg(args, ["--input-json", "--inputJson"], {});
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], jsonInput.workspaceId || jsonInput.workspace_id || "");
  const explicitTargetNodeIds = targetNodeIds(args);
  const autoSelectCompletedCycle = hasFlag(args, "--auto-select-completed-cycle")
    || hasFlag(args, "--autoSelectCompletedCycle")
    || jsonInput.autoSelectCompletedCycle === true
    || jsonInput.auto_select_completed_cycle === true;
  const autoSelectLatestCompletedCycle = hasFlag(args, "--auto-select-latest-completed-cycle")
    || hasFlag(args, "--autoSelectLatestCompletedCycle")
    || jsonInput.autoSelectLatestCompletedCycle === true
    || jsonInput.auto_select_latest_completed_cycle === true;
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
    availableMinutes: boundedNumberArg(args, ["--available-minutes", "--availableMinutes"], jsonInput.availableMinutes || jsonInput.available_minutes || 15, 1, 60),
    limit: boundedNumberArg(args, ["--limit"], jsonInput.limit || 12, 1, 50),
    targetNodeIds: explicitTargetNodeIds.length ? explicitTargetNodeIds : jsonInput.targetNodeIds || jsonInput.target_node_ids,
    autoSelectCompletedCycle: autoSelectCompletedCycle || undefined,
    autoSelectLatestCompletedCycle: autoSelectLatestCompletedCycle || undefined,
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
      error: error.code || "profile_feedback_smoke_parse_failed",
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
  const service = services.learningProfileFeedbackEvidenceService;
  const result = projectProfileFeedbackSmokeReadback(service && typeof service.evaluate === "function"
    ? service.evaluate(input)
    : { ok: false, error: "profile_feedback_service_unavailable" });
  process.stdout.write(formatResult(result, pretty));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "profile_feedback_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  projectProfileFeedbackSmokeReadback,
  targetNodeIds
};
