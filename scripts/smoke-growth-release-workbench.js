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
  if (!input.workspaceId) return { ok: false, error: "release_workbench_smoke_workspace_required" };
  return { ok: true };
}

function runOperation(service, input) {
  return projectWorkbenchSmokeReadback(service.workbench(input));
}

function formatResult(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
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
    key: cleanString(action.key || action.checkKey || action.check_key || action.evidenceKey || action.evidence_key, 140),
    action: cleanString(action.action || action.type || action.reason, 140),
    endpointKey: cleanString(action.endpointKey || action.endpoint_key, 120),
    requiredActor: cleanString(action.requiredActor || action.required_actor || action.actor || "owner", 80),
    readyToSubmit: action.readyToSubmit === true
  };
}

function projectWorkbenchSmokeReadback(result = {}) {
  const workbench = objectOnly(result.releaseWorkbench);
  return Object.assign({}, result, {
    releaseWorkbenchStatus: cleanString(workbench.status || result.status, 120),
    ownerActionCount: Number(workbench.ownerActionCount || asArray(workbench.ownerActions).length || 0) || 0,
    nextOwnerAction: compactAction(workbench.nextAction),
    releaseEvidenceCollectionTaskIds: asArray(workbench.releaseEvidenceCollectionTasks).map((item) => cleanString(item, 140)).filter(Boolean),
    releaseEvidenceCollectionRequiredTaskIds: asArray(workbench.releaseEvidenceCollectionRequiredTaskIds).map((item) => cleanString(item, 140)).filter(Boolean),
    releaseEvidenceCollectionSupportedTaskIds: asArray(workbench.releaseEvidenceCollectionSupportedTaskIds).map((item) => cleanString(item, 140)).filter(Boolean),
    writeGatedReleaseEvidenceCollectionTasks: asArray(workbench.writeGatedReleaseEvidenceCollectionTasks).map((item) => cleanString(item, 140)).filter(Boolean),
    unsupportedReleaseEvidenceCollectionKeys: asArray(workbench.unsupportedReleaseEvidenceCollectionKeys).map((item) => cleanString(item, 140)).filter(Boolean),
    releaseStatePrerequisiteKeys: asArray(workbench.releaseStatePrerequisiteKeys).map((item) => cleanString(item, 140)).filter(Boolean),
    missingCheckCount: asArray(workbench.missingCheckKeys).length,
    missingEvidenceCount: asArray(workbench.missingEvidenceKeys).length,
    missingApprovalCount: asArray(workbench.missingApprovalKeys).length,
    missingRecordKindCount: asArray(workbench.missingRecordKinds).length,
    blockedRecordKindCount: asArray(workbench.blockedRecordKinds).length
  });
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
  const result = runOperation(services.learningAutomationReleaseWorkbenchService, input);
  process.stdout.write(formatResult(Object.assign({ operation: "workbench" }, result), pretty));
  process.exitCode = 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "release_workbench_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  projectWorkbenchSmokeReadback,
  runOperation,
  validateInput
};
