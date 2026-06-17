#!/usr/bin/env node
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

function truthy(value) {
  return ["1", "true", "yes", "on", "pass", "ready"].includes(String(value || "").trim().toLowerCase());
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function inputFromArgs(args) {
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], "");
  const requiredApprovalKey = firstArgValue(args, ["--required-approval-key", "--requiredApprovalKey"], "");
  const requiredApprovalKeys = splitCsv(firstArgValue(args, ["--required-approval-keys", "--requiredApprovalKeys"], ""))
    .concat(requiredApprovalKey ? [requiredApprovalKey] : []);
  const activationGate = firstArgValue(args, ["--activation-gate", "--activationGate"], "");
  const activationGates = splitCsv(firstArgValue(args, ["--activation-gates", "--activationGates"], ""))
    .concat(activationGate ? [activationGate] : []);
  return {
    operation: firstArgValue(args, ["--operation", "--op"], "preflight") || "preflight",
    allowWrite: hasFlag(args, "--allow-write"),
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], ""),
    domain: firstArgValue(args, ["--domain"], ""),
    subject: firstArgValue(args, ["--subject"], ""),
    horizon: firstArgValue(args, ["--horizon"], "daily_plan") || "daily_plan",
    collectionRunId: firstArgValue(args, ["--collection-run-id", "--collectionRunId", "--run-id", "--runId"], ""),
    activationGates: activationGates.length ? activationGates : undefined,
    requiredApprovalKeys: requiredApprovalKeys.length ? requiredApprovalKeys : undefined,
    ownerDailyUiEvidence: truthy(firstArgValue(args, ["--owner-daily-ui-evidence", "--ownerDailyUiEvidence"], "")),
    ownerAuditUiEvidence: truthy(firstArgValue(args, ["--owner-audit-ui-evidence", "--ownerAuditUiEvidence"], "")),
    stageCheckpointEvidence: truthy(firstArgValue(args, ["--stage-checkpoint-evidence", "--stageCheckpointEvidence"], "")),
    proposalReviewUiEvidence: truthy(firstArgValue(args, ["--proposal-review-ui-evidence", "--proposalReviewUiEvidence"], "")),
    automationDigestUiEvidence: truthy(firstArgValue(args, ["--automation-digest-ui-evidence", "--automationDigestUiEvidence"], "")),
    automationActionHandoffUiEvidence: truthy(firstArgValue(args, ["--automation-action-handoff-ui-evidence", "--automationActionHandoffUiEvidence"], "")),
    schedulerExecutionUiEvidence: truthy(firstArgValue(args, ["--scheduler-execution-ui-evidence", "--schedulerExecutionUiEvidence"], "")),
    schedulerRunUiEvidence: truthy(firstArgValue(args, ["--scheduler-run-ui-evidence", "--schedulerRunUiEvidence"], "")),
    schedulerWorkerTargetUiEvidence: truthy(firstArgValue(args, ["--scheduler-worker-target-ui-evidence", "--schedulerWorkerTargetUiEvidence"], "")),
    note: firstArgValue(args, ["--note", "--reason", "--summary"], ""),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy"], ""),
    recordedBy: firstArgValue(args, ["--recorded-by", "--recordedBy", "--approved-by", "--approvedBy"], ""),
    recordedAt: firstArgValue(args, ["--recorded-at", "--recordedAt", "--approved-at", "--approvedAt"], ""),
    createdAt: firstArgValue(args, ["--created-at", "--createdAt"], ""),
    limit: Number(firstArgValue(args, ["--limit"], "5")) || 5
  };
}

function validateInput(input = {}) {
  if (!input.workspaceId) return { ok: false, error: "release_activation_smoke_workspace_required" };
  if (!["preflight", "list", "record"].includes(String(input.operation || "preflight"))) {
    return { ok: false, error: "release_activation_smoke_operation_invalid" };
  }
  return { ok: true };
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

function compactAction(value = {}) {
  const action = objectOnly(value);
  if (!Object.keys(action).length) return null;
  return {
    key: cleanString(action.key || action.checkKey || action.check_key, 140),
    action: cleanString(action.action || action.type || action.reason || action.label, 160),
    requiredActor: cleanString(action.requiredActor || action.required_actor || action.actor || "owner", 80)
  };
}

function latestActivationFrom(result = {}) {
  if (result.activation && typeof result.activation === "object" && !Array.isArray(result.activation)) return result.activation;
  return asArray(result.activations)[0] || {};
}

function evaluatedFrom(result = {}) {
  return objectOnly(result.evaluated);
}

function activationPreflightFrom(result = {}, latestActivation = {}, evaluated = {}) {
  return objectOnly(
    result.activationPreflight
    || evaluated.activationPreflight
    || latestActivation.activationPreflight
    || latestActivation.activation_preflight
  );
}

function projectReleaseActivationSmokeReadback(result = {}) {
  const latestActivation = latestActivationFrom(result);
  const evaluated = evaluatedFrom(result);
  const activationPreflight = activationPreflightFrom(result, latestActivation, evaluated);
  const requestedGates = asArray(result.requestedActivationGates).length
    ? asArray(result.requestedActivationGates)
    : asArray(evaluated.requestedActivationGates).length
      ? asArray(evaluated.requestedActivationGates)
      : asArray(latestActivation.requestedActivationGates || latestActivation.requested_activation_gates);
  const requiredApprovals = asArray(result.requiredApprovalKeys).length
    ? asArray(result.requiredApprovalKeys)
    : asArray(evaluated.requiredApprovalKeys);
  const missingApprovals = asArray(result.missingApprovalKeys).length
    ? asArray(result.missingApprovalKeys)
    : asArray(evaluated.missingApprovalKeys);
  const status = cleanString(result.releaseActivationStatus || result.status || evaluated.status || latestActivation.status || activationPreflight.status, 120);
  return Object.assign({}, result, {
    releaseActivationStatus: status,
    releaseActivationCount: Number(result.count || asArray(result.activations).length || ((latestActivation.activationId || latestActivation.activation_id) ? 1 : 0)) || 0,
    releaseActivationLatestActivationId: cleanString(latestActivation.activationId || latestActivation.activation_id, 140),
    releaseActivationLatestActivationStatus: cleanString(latestActivation.status || status, 120),
    releaseActivationPreflightPassed: result.preflightPassed === true || evaluated.preflightPassed === true || activationPreflight.preflightPassed === true,
    releaseActivationReadyForOwnerReleaseActivation: result.readyForOwnerReleaseActivation === true || evaluated.readyForOwnerReleaseActivation === true,
    releaseActivationReadyForOwnerRuntimeConfigDecision: result.readyForOwnerRuntimeConfigDecision === true || evaluated.readyForOwnerRuntimeConfigDecision === true || activationPreflight.readyForOwnerRuntimeConfigDecision === true,
    releaseActivationAllowed: result.activationAllowed === true || evaluated.activationAllowed === true || activationPreflight.activationAllowed === true,
    releaseActivationRequestedGateCount: requestedGates.length,
    releaseActivationRequiredApprovalCount: requiredApprovals.length,
    releaseActivationMissingApprovalCount: missingApprovals.length,
    releaseActivationLatestPreflightReportId: cleanString(
      result.latestPreflightReportId
      || evaluated.latestPreflightReportId
      || activationPreflight.latestPreflightReportId
      || latestActivation.latestPreflightReportId
      || latestActivation.latest_preflight_report_id,
      140
    ),
    releaseActivationLatestPreflightStatus: cleanString(
      result.latestPreflightStatus
      || evaluated.latestPreflightStatus
      || activationPreflight.latestPreflightStatus
      || latestActivation.latestPreflightStatus
      || latestActivation.latest_preflight_status,
      120
    ),
    releaseActivationLatestPreflightReadyForProductionDeployReview: result.latestPreflightReadyForProductionDeployReview === true || evaluated.latestPreflightReadyForProductionDeployReview === true || activationPreflight.latestPreflightReadyForProductionDeployReview === true || latestActivation.latestPreflightReadyForProductionDeployReview === true,
    releaseActivationLatestPreflightReadyForOwnerReleaseActivation: result.latestPreflightReadyForOwnerReleaseActivation === true || evaluated.latestPreflightReadyForOwnerReleaseActivation === true || activationPreflight.latestPreflightReadyForOwnerReleaseActivation === true || latestActivation.latestPreflightReadyForOwnerReleaseActivation === true,
    releaseActivationRequiredActionCount: Number(activationPreflight.requiredActionCount || asArray(activationPreflight.requiredActions).length || 0) || 0,
    releaseActivationNextAction: compactAction(activationPreflight.nextAction || asArray(activationPreflight.requiredActions)[0]),
    releaseActivationConfigChangeApplied: result.configChangeApplied === true || evaluated.configChangeApplied === true || activationPreflight.configChangeApplied === true,
    releaseActivationWritefulSchedulingAllowed: result.writefulSchedulingAllowed === true || evaluated.writefulSchedulingAllowed === true || activationPreflight.writefulSchedulingAllowed === true,
    releaseActivationRuntimeConfigChange: result.runtimeConfigChange === true || evaluated.runtimeConfigChange === true || activationPreflight.runtimeConfigChange === true
  });
}

function runOperation(service, input) {
  const operation = String(input.operation || "preflight");
  if (operation === "list") return projectReleaseActivationSmokeReadback(service.listActivations(input));
  if (operation === "record") {
    if (!input.allowWrite) {
      return {
        ok: false,
        error: "release_activation_smoke_write_not_allowed",
        operation,
        requires: "--allow-write"
      };
    }
    return projectReleaseActivationSmokeReadback(service.recordActivation(input));
  }
  return projectReleaseActivationSmokeReadback(service.preflight(input));
}

function formatResult(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json") || hasFlag(args, "--pretty");
  const input = inputFromArgs(args);
  const validation = validateInput(input);
  if (!validation.ok) {
    process.stdout.write(formatResult(validation, pretty));
    process.exitCode = 2;
    return;
  }
  const services = createServices(readEnv(process.env));
  const result = runOperation(services.learningAutomationReleaseActivationService, input);
  process.stdout.write(formatResult(Object.assign({ operation: input.operation || "preflight" }, result), pretty));
  process.exitCode = 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "release_activation_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  projectReleaseActivationSmokeReadback,
  runOperation,
  validateInput
};
