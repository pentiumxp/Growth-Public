"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|hidden.*answer|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;

function argValue(args, name, fallback = "") {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  return String(args[index + 1] || fallback);
}

function hasFlag(args, name) {
  return args.includes(name);
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

function uniqueBoundedStrings(values = [], maxItems = 24) {
  return uniqueStrings(asArray(values).map((value) => cleanString(value, 160))).slice(0, maxItems);
}

function numberValue(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
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
    wrapped.code = "stage_checkpoint_controls_smoke_invalid_json";
    wrapped.option = names[0];
    wrapped.cause = error;
    throw wrapped;
  }
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
  return Array.from(new Set((Array.isArray(values) ? values : [values]).map((value) => String(value || "").trim()).filter(Boolean)));
}

function targetNodeIds(args) {
  return uniqueStrings([
    ...collectRepeatedValues(args, ["--target-node-id", "--targetNodeId"]),
    ...collectRepeatedValues(args, ["--assessment-coverage-node-id", "--assessmentCoverageNodeId"]),
    ...collectCsvValues(args, ["--target-node-ids", "--targetNodeIds"]),
    ...collectCsvValues(args, ["--assessment-coverage-node-ids", "--assessmentCoverageNodeIds"])
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

function inputFromArgs(args) {
  const jsonInput = parseJsonArg(args, ["--input-json", "--inputJson"], {});
  const explicitTargetNodeIds = targetNodeIds(args);
  const jsonTargetNodeIds = uniqueStrings(
    jsonInput.assessmentCoverageNodeIds
      || jsonInput.assessment_coverage_node_ids
      || jsonInput.targetNodeIds
      || jsonInput.target_node_ids
      || []
  );
  const coverage = explicitTargetNodeIds.length ? explicitTargetNodeIds : jsonTargetNodeIds;
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], jsonInput.workspaceId || jsonInput.workspace_id || "");
  return stripUndefined(Object.assign({}, jsonInput, {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], jsonInput.learnerId || jsonInput.learner_id || "") || workspaceId,
    displayName: firstArgValue(args, ["--display-name", "--displayName"], jsonInput.displayName || jsonInput.display_name || ""),
    label: firstArgValue(args, ["--label"], jsonInput.label || ""),
    programId: firstArgValue(args, ["--program-id", "--programId"], jsonInput.programId || jsonInput.program_id || ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], jsonInput.domainPackId || jsonInput.domain_pack_id || ""),
    domain: firstArgValue(args, ["--domain"], jsonInput.domain || ""),
    subject: firstArgValue(args, ["--subject"], jsonInput.subject || ""),
    subjectId: firstArgValue(args, ["--subject-id", "--subjectId"], jsonInput.subjectId || jsonInput.subject_id || jsonInput.subject || ""),
    capabilityClusterId: firstArgValue(args, ["--capability-cluster-id", "--capabilityClusterId"], jsonInput.capabilityClusterId || jsonInput.capability_cluster_id || ""),
    targetNodeId: firstArgValue(args, ["--target-node-id", "--targetNodeId"], jsonInput.targetNodeId || jsonInput.target_node_id || coverage[0] || ""),
    targetNodeIds: coverage,
    assessmentCoverageNodeIds: coverage
  }));
}

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

function operationFromArgs(args) {
  const operation = firstArgValue(args, ["--operation", "--mode"], "controls");
  return String(operation || "controls").trim().toLowerCase();
}

function validateInput(operation, input = {}, args = []) {
  if (!["controls", "read", "readback"].includes(operation)) {
    return {
      ok: false,
      error: "stage_checkpoint_controls_smoke_operation_invalid",
      operation,
      allowedOperations: ["controls", "read", "readback"]
    };
  }
  if (hasFlag(args, "--allow-write") || hasFlag(args, "--allowWrite")) {
    return {
      ok: false,
      error: "stage_checkpoint_controls_smoke_write_not_supported",
      operation,
      writeAllowed: false
    };
  }
  if (!input.workspaceId) return { ok: false, error: "workspace_id_required" };
  const privacyFindings = scanPrivacy(input);
  if (privacyFindings.length) {
    return { ok: false, error: "stage_checkpoint_controls_smoke_privacy_failed", privacyFindings };
  }
  if (!input.targetNodeId && !input.assessmentCoverageNodeIds?.length) {
    return { ok: false, error: "stage_checkpoint_controls_target_required", operation };
  }
  return { ok: true };
}

function runControls(service, input) {
  if (!service || typeof service.controls !== "function") {
    return { ok: false, available: false, error: "stage_checkpoint_controls_service_unavailable" };
  }
  return service.controls(input);
}

function actionByKey(actions = [], key = "") {
  return asArray(actions).find((action) => action && action.key === key) || {};
}

function projectStageCheckpointControlsSmokeReadback(result = {}, operation = "controls") {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const target = objectOnly(readback.target);
  const scope = objectOnly(readback.scope);
  const readiness = objectOnly(readback.readiness);
  const evidence = objectOnly(readiness.evidence);
  const profileSummary = objectOnly(readiness.profileSummary);
  const policy = objectOnly(readback.policy);
  const summary = objectOnly(readback.summary);
  const refreshAction = actionByKey(readback.actions, "refresh_stage_checkpoint_controls");
  const activateAction = actionByKey(readback.actions, "activate_stage_assessment");
  const challengeAction = actionByKey(readback.actions, "learner_challenge_route");
  return Object.assign({}, readback, {
    stageCheckpointControlsStatus: cleanString(
      readback.ok === false ? readback.error || "failed" : summary.status || readiness.activationState || "pass",
      140
    ),
    stageCheckpointControlsOk: readback.ok !== false,
    stageCheckpointControlsOperation: cleanString(operation || readback.operation || "controls", 80),
    stageCheckpointControlsWriteOperation: false,
    stageCheckpointControlsWritesPerformed: false,
    stageCheckpointControlsSchemaVersion: cleanString(readback.schemaVersion, 120),
    stageCheckpointControlsPrivacyClass: cleanString(readback.privacyClass, 80),
    stageCheckpointControlsSummaryOnly: readback.summaryOnly === true,
    stageCheckpointControlsWorkspaceId: cleanString(target.workspaceId, 160),
    stageCheckpointControlsLearnerId: cleanString(target.learnerId, 160),
    stageCheckpointControlsDisplayName: cleanString(target.displayName || target.label, 120),
    stageCheckpointControlsProgramId: cleanString(scope.programId, 160),
    stageCheckpointControlsDomainPackId: cleanString(scope.domainPackId, 180),
    stageCheckpointControlsDomain: cleanString(scope.domain, 120),
    stageCheckpointControlsSubject: cleanString(scope.subject, 120),
    stageCheckpointControlsSubjectId: cleanString(scope.subjectId, 160),
    stageCheckpointControlsCapabilityClusterId: cleanString(scope.capabilityClusterId, 160),
    stageCheckpointControlsTargetNodeId: cleanString(scope.targetNodeId, 180),
    stageCheckpointControlsTargetNodeIds: uniqueBoundedStrings(scope.targetNodeIds),
    stageCheckpointControlsAssessmentCoverageNodeIds: uniqueBoundedStrings(scope.assessmentCoverageNodeIds),
    stageCheckpointControlsAvailable: readiness.available !== false,
    stageCheckpointControlsEligible: readiness.eligible === true || summary.eligible === true,
    stageCheckpointControlsActivationState: cleanString(summary.activationState || readiness.activationState, 80),
    stageCheckpointControlsReason: cleanString(readiness.reason, 180),
    stageCheckpointControlsCooldownUntil: cleanString(readiness.cooldownUntil, 80),
    stageCheckpointControlsReadyForOwnerActivation: summary.readyForOwnerActivation === true,
    stageCheckpointControlsInCooldown: summary.inCooldown === true,
    stageCheckpointControlsActive: summary.active === true,
    stageCheckpointControlsMinimumRecentOrdinaryCards: numberValue(evidence.minimumRecentOrdinaryCards, 0),
    stageCheckpointControlsRecentTrajectoryCount: numberValue(summary.recentTrajectoryCount ?? evidence.recentTrajectoryCount, 0),
    stageCheckpointControlsRecentExperienceSignalCount: numberValue(evidence.recentExperienceSignalCount, 0),
    stageCheckpointControlsHighPressureSignalCount: numberValue(summary.highPressureSignalCount ?? evidence.highPressureSignalCount, 0),
    stageCheckpointControlsChallengeSignalCount: numberValue(summary.challengeSignalCount ?? evidence.challengeSignalCount, 0),
    stageCheckpointControlsSourceCardCount: numberValue(summary.sourceCardCount, uniqueBoundedStrings(evidence.sourceCardIds, 12).length),
    stageCheckpointControlsSourceCardIds: uniqueBoundedStrings(evidence.sourceCardIds, 12),
    stageCheckpointControlsProfileMasteryStateCount: numberValue(profileSummary.masteryStateCount, 0),
    stageCheckpointControlsProfileWeaknessCount: numberValue(profileSummary.weaknessCount, 0),
    stageCheckpointControlsProfileStrengthCount: numberValue(profileSummary.strengthCount, 0),
    stageCheckpointControlsPolicyActivationService: cleanString(policy.formalAssessmentActivationService, 140),
    stageCheckpointControlsDailyPlanDirectPublicationAllowed: policy.dailyPlanDirectPublicationAllowed === true,
    stageCheckpointControlsOwnerManualActivationAllowed: policy.ownerManualActivationAllowed === true,
    stageCheckpointControlsLearnerChallengeAllowed: policy.learnerChallengeAllowed === true,
    stageCheckpointControlsLowPressureDailyPracticeSeparate: policy.lowPressureDailyPracticeSeparate === true,
    stageCheckpointControlsRefreshEnabled: refreshAction.enabled === true,
    stageCheckpointControlsActivateEnabled: activateAction.enabled === true,
    stageCheckpointControlsActivateDisabledReason: cleanString(activateAction.disabledReason, 180),
    stageCheckpointControlsActivateWrite: activateAction.write === true,
    stageCheckpointControlsChallengeEnabled: challengeAction.enabled === true,
    stageCheckpointControlsChallengeDisabledReason: cleanString(challengeAction.disabledReason, 180),
    stageCheckpointControlsChallengeWrite: challengeAction.write === true,
    stageCheckpointControlsActionKeys: uniqueBoundedStrings(asArray(readback.actions).map((action) => action && action.key), 12)
  });
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
      error: error.code || "stage_checkpoint_controls_smoke_parse_failed",
      option: error.option || ""
    }, pretty));
    process.exitCode = 2;
    return;
  }
  const validation = validateInput(operation, input, args);
  if (!validation.ok) {
    process.stdout.write(formatResult(validation, pretty));
    process.exitCode = 2;
    return;
  }
  const config = readEnv(process.env);
  const services = createServices(config);
  const result = projectStageCheckpointControlsSmokeReadback(
    Object.assign({ operation: "controls" }, runControls(services.learningStageCheckpointControlsService, input)),
    operation
  );
  process.stdout.write(formatResult(Object.assign({ operation: "controls" }, result), pretty));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "stage_checkpoint_controls_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  operationFromArgs,
  projectStageCheckpointControlsSmokeReadback,
  runControls,
  targetNodeIds,
  validateInput
};
