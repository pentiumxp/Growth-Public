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
    proposalReviewUiEvidence: truthy(firstArgValue(args, ["--proposal-review-ui-evidence", "--proposalReviewUiEvidence"], "")),
    automationDigestUiEvidence: truthy(firstArgValue(args, ["--automation-digest-ui-evidence", "--automationDigestUiEvidence"], "")),
    automationActionHandoffUiEvidence: truthy(firstArgValue(args, ["--automation-action-handoff-ui-evidence", "--automationActionHandoffUiEvidence"], "")),
    schedulerExecutionUiEvidence: truthy(firstArgValue(args, ["--scheduler-execution-ui-evidence", "--schedulerExecutionUiEvidence"], "")),
    schedulerRunUiEvidence: truthy(firstArgValue(args, ["--scheduler-run-ui-evidence", "--schedulerRunUiEvidence"], "")),
    schedulerWorkerTargetUiEvidence: truthy(firstArgValue(args, ["--scheduler-worker-target-ui-evidence", "--schedulerWorkerTargetUiEvidence"], ""))
  };
}

function validateInput(input = {}) {
  if (!input.workspaceId) return { ok: false, error: "release_controls_smoke_workspace_required" };
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
    requiredActor: cleanString(action.requiredActor || action.required_actor || action.actor || "owner", 80),
    approvalKey: cleanString(action.approvalKey || action.approval_key, 120)
  };
}

function projectReleaseControlsSmokeReadback(result = {}) {
  const controls = objectOnly(result.releaseControls);
  const audit = objectOnly(result.auditReadback || controls.auditReadback);
  const activation = objectOnly(audit.activationRecords);
  const runtime = objectOnly(audit.runtimeEnablementRecords);
  return Object.assign({}, result, {
    releaseControlsStatus: cleanString(controls.status || result.status, 120),
    releaseControlsRequiredActionCount: Number(controls.requiredActionCount || asArray(controls.requiredActions).length || 0) || 0,
    releaseControlsNextAction: compactAction(controls.nextAction),
    releaseControlsMissingCheckCount: asArray(controls.missingCheckKeys).length,
    releaseControlsBlockedCheckCount: asArray(controls.blockedCheckKeys).length,
    releaseControlsMissingEvidenceCount: asArray(controls.missingEvidenceKeys).length,
    releaseControlsMissingApprovalCount: asArray(controls.missingApprovalKeys).length,
    releaseControlsActivationRecordsStatus: cleanString(activation.status, 120),
    releaseControlsRuntimeEnablementRecordsStatus: cleanString(runtime.status, 120),
    releaseControlsWritefulSchedulingAllowed: controls.writefulSchedulingAllowed === true || result.writefulSchedulingAllowed === true,
    releaseControlsRuntimeConfigMutationPerformed: controls.runtimeConfigMutationPerformed === true || result.runtimeConfigMutationPerformed === true
  });
}

function runOperation(service, input) {
  return projectReleaseControlsSmokeReadback(service.summarize(input));
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
  const result = runOperation(services.learningAutomationReleaseControlsService, input);
  process.stdout.write(formatResult(Object.assign({ operation: "summarize" }, result), pretty));
  process.exitCode = 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "release_controls_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  projectReleaseControlsSmokeReadback,
  runOperation,
  validateInput
};
