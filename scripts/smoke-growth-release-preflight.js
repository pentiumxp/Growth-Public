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

function operationFromArgs(args) {
  if (hasFlag(args, "--record")) return "record";
  if (hasFlag(args, "--list")) return "list";
  return firstArgValue(args, ["--operation", "--op"], "evaluate") || "evaluate";
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
    operation: operationFromArgs(args),
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], ""),
    domain: firstArgValue(args, ["--domain"], ""),
    subject: firstArgValue(args, ["--subject"], ""),
    horizon: firstArgValue(args, ["--horizon"], "daily_plan") || "daily_plan",
    collectionRunId: firstArgValue(args, ["--collection-run-id", "--collectionRunId", "--run-id", "--runId"], ""),
    status: firstArgValue(args, ["--status"], ""),
    limit: Number(firstArgValue(args, ["--limit"], "5")) || 5,
    requiredApprovalKeys: requiredApprovalKeys.length ? requiredApprovalKeys : undefined,
    activationGates: activationGates.length ? activationGates : undefined,
    activationRecordLimit: Number(firstArgValue(args, ["--activation-record-limit", "--activationRecordLimit"], "20")) || 20,
    runtimeEnablementRecordLimit: Number(firstArgValue(args, ["--runtime-enablement-record-limit", "--runtimeEnablementRecordLimit"], "20")) || 20,
    ownerDailyUiEvidence: truthy(firstArgValue(args, ["--owner-daily-ui-evidence", "--ownerDailyUiEvidence"], "")),
    ownerAuditUiEvidence: truthy(firstArgValue(args, ["--owner-audit-ui-evidence", "--ownerAuditUiEvidence"], "")),
    stageCheckpointEvidence: truthy(firstArgValue(args, ["--stage-checkpoint-evidence", "--stageCheckpointEvidence"], "")),
    stageCheckpointControlsEvidence: truthy(firstArgValue(args, ["--stage-checkpoint-controls-evidence", "--stageCheckpointControlsEvidence"], "")),
    proposalReviewUiEvidence: truthy(firstArgValue(args, ["--proposal-review-ui-evidence", "--proposalReviewUiEvidence"], "")),
    automationDigestUiEvidence: truthy(firstArgValue(args, ["--automation-digest-ui-evidence", "--automationDigestUiEvidence"], "")),
    automationActionHandoffUiEvidence: truthy(firstArgValue(args, ["--automation-action-handoff-ui-evidence", "--automationActionHandoffUiEvidence"], "")),
    schedulerExecutionUiEvidence: truthy(firstArgValue(args, ["--scheduler-execution-ui-evidence", "--schedulerExecutionUiEvidence"], "")),
    schedulerRunUiEvidence: truthy(firstArgValue(args, ["--scheduler-run-ui-evidence", "--schedulerRunUiEvidence"], "")),
    schedulerWorkerTargetUiEvidence: truthy(firstArgValue(args, ["--scheduler-worker-target-ui-evidence", "--schedulerWorkerTargetUiEvidence"], "")),
    allowWritePreflight: hasFlag(args, "--allow-write") || hasFlag(args, "--allowWrite") || hasFlag(args, "--write-record"),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy", "--created-by", "--createdBy"], "")
  };
}

function validateInput(input = {}) {
  const operation = String(input.operation || "").trim();
  if (!["evaluate", "list", "record"].includes(operation)) {
    return { ok: false, error: "release_preflight_smoke_operation_invalid" };
  }
  if (!input.workspaceId) {
    return { ok: false, error: "release_preflight_smoke_workspace_required" };
  }
  if (operation === "record" && input.allowWritePreflight !== true) {
    return { ok: false, error: "release_preflight_smoke_write_not_authorized" };
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
    action: cleanString(action.action || action.type || action.reason, 160),
    requiredActor: cleanString(action.requiredActor || action.required_actor || action.actor || "owner", 80)
  };
}

function projectReleasePreflightSmokeReadback(result = {}) {
  const preflight = objectOnly(result.releasePreflight);
  const report = objectOnly(result.report);
  const productionClosureGateSummary = objectOnly(preflight.productionClosureGateSummary);
  return Object.assign({}, result, {
    releasePreflightStatus: cleanString(preflight.status || result.status, 120),
    releasePreflightRequiredActionCount: Number(preflight.requiredActionCount || 0) || 0,
    releasePreflightNextAction: compactAction(preflight.nextAction),
    releasePreflightMissingCheckCount: asArray(preflight.missingCheckKeys).length,
    releasePreflightBlockedCheckCount: asArray(preflight.blockedCheckKeys).length,
    releasePreflightMissingEvidenceCount: asArray(preflight.missingEvidenceKeys).length,
    releasePreflightMissingApprovalCount: asArray(preflight.missingApprovalKeys).length,
    releasePreflightMissingRecordKindCount: asArray(preflight.missingRecordKinds).length,
    releasePreflightBlockedRecordKindCount: asArray(preflight.blockedRecordKinds).length,
    releasePreflightReadyForProductionDeploy: preflight.readyForProductionDeploy === true,
    releasePreflightReadyForProductionDeployReview: preflight.readyForProductionDeployReview === true,
    releasePreflightReadyForOwnerReleaseActivation: preflight.readyForOwnerReleaseActivation === true,
    releasePreflightBackendEvidenceComplete: preflight.backendEvidenceComplete === true,
    releasePreflightLatestCollectionRunId: cleanString(preflight.latestCollectionRunId, 140),
    releasePreflightLatestDecisionId: cleanString(preflight.latestDecisionId, 140),
    releasePreflightLatestPackageId: cleanString(preflight.latestPackageId, 140),
    releasePreflightReportId: cleanString(report.preflightReportId || report.reportId, 140),
    releasePreflightReportStatus: cleanString(report.status, 120),
    releasePreflightReadinessEvidencePresentCount: Number(preflight.readinessEvidencePresentCount || 0) || 0,
    releasePreflightReadinessEvidenceMissingCount: Number(preflight.readinessEvidenceMissingCount || 0) || 0,
    releasePreflightOwnerActionCount: Number(preflight.ownerActionCount || 0) || 0,
    releasePreflightProductionClosureGateStatus: cleanString(productionClosureGateSummary.status, 120),
    releasePreflightProductionClosureGateCount: Number(preflight.productionClosureGateCount || productionClosureGateSummary.gateCount || 0) || 0,
    releasePreflightProductionClosurePendingGateCount: Number(preflight.productionClosurePendingGateCount || productionClosureGateSummary.pendingGateCount || 0) || 0,
    releasePreflightProductionClosureNextExternalAction: compactAction(productionClosureGateSummary.nextExternalAction),
    releasePreflightDeploymentEvidenceRequired: preflight.deploymentEvidenceRequired === true || productionClosureGateSummary.deploymentEvidenceRequired === true,
    releasePreflightPlatformEvidenceRequired: preflight.platformEvidenceRequired === true || productionClosureGateSummary.platformEvidenceRequired === true,
    releasePreflightWritefulSchedulingAllowed: preflight.writefulSchedulingAllowed === true || result.writefulSchedulingAllowed === true,
    releasePreflightRuntimeConfigChange: preflight.runtimeConfigChange === true || result.runtimeConfigChange === true,
    releasePreflightRuntimeConfigMutationPerformed: preflight.runtimeConfigMutationPerformed === true || result.runtimeConfigMutationPerformed === true,
    releasePreflightBackgroundSchedulingAllowed: preflight.backgroundSchedulingAllowed === true || result.backgroundSchedulingAllowed === true,
    releasePreflightBackgroundWorkerAllowed: preflight.backgroundWorkerAllowed === true || result.backgroundWorkerAllowed === true
  });
}

function runOperation(service, input) {
  const operation = String(input.operation || "evaluate").trim();
  const serviceInput = Object.assign({}, input);
  delete serviceInput.operation;
  if (operation === "list") return projectReleasePreflightSmokeReadback(service.listReports(serviceInput));
  if (operation === "record") return projectReleasePreflightSmokeReadback(service.recordReport(serviceInput));
  return projectReleasePreflightSmokeReadback(service.evaluate(serviceInput));
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
  const result = runOperation(services.learningAutomationReleasePreflightService, input);
  process.stdout.write(formatResult(Object.assign({ operation: input.operation }, result), pretty));
  process.exitCode = 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "release_preflight_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  projectReleasePreflightSmokeReadback,
  runOperation,
  validateInput
};
