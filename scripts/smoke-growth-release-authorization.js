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
  return {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], ""),
    domain: firstArgValue(args, ["--domain"], ""),
    subject: firstArgValue(args, ["--subject"], ""),
    horizon: firstArgValue(args, ["--horizon"], "daily_plan") || "daily_plan",
    collectionRunId: firstArgValue(args, ["--collection-run-id", "--collectionRunId", "--run-id", "--runId"], ""),
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
    limit: Number(firstArgValue(args, ["--limit"], "5")) || 5
  };
}

function validateInput(input = {}) {
  if (!input.workspaceId) return { ok: false, error: "release_authorization_smoke_workspace_required" };
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

function projectReleaseAuthorizationSmokeReadback(result = {}) {
  const review = objectOnly(result.review);
  const packageReadback = objectOnly(result.packageReadback);
  const latestCollectionRun = objectOnly(result.latestCollectionRun);
  const latestDecision = objectOnly(result.latestDecision);
  const latestPackage = objectOnly(result.latestPackage);
  const status = cleanString(result.releaseAuthorizationStatus || result.status, 120);
  return Object.assign({}, result, {
    releaseAuthorizationStatus: status,
    releaseAuthorizationAuthorized: result.authorized === true,
    releaseAuthorizationReason: cleanString(result.reason || result.error, 180),
    releaseAuthorizationRequiredApprovalCount: asArray(result.requiredApprovalKeys).length,
    releaseAuthorizationApprovalCount: asArray(result.approvalKeys).length,
    releaseAuthorizationMissingApprovalCount: asArray(result.missingApprovalKeys).length,
    releaseAuthorizationReviewStatus: cleanString(review.status, 120),
    releaseAuthorizationReviewApprovedForReleaseReview: review.approvedForReleaseReview === true,
    releaseAuthorizationCollectionRunPresent: review.collectionRunPresent === true || Boolean(latestCollectionRun.runId),
    releaseAuthorizationCollectionRunId: cleanString(
      latestCollectionRun.runId
      || latestCollectionRun.collectionRunId
      || latestCollectionRun.collection_run_id,
      140
    ),
    releaseAuthorizationCollectionRunStatus: cleanString(latestCollectionRun.status, 120),
    releaseAuthorizationLatestDecisionId: cleanString(latestDecision.decisionId || latestDecision.decision_id, 140),
    releaseAuthorizationLatestDecisionStatus: cleanString(latestDecision.status, 120),
    releaseAuthorizationPackageRecordReadbackAvailable: packageReadback.packageRecordReadbackAvailable === true || review.packageRecordReadbackAvailable === true,
    releaseAuthorizationPackageRecordPresent: packageReadback.packageRecordPresent === true || review.packageRecordPresent === true,
    releaseAuthorizationPackageRecordStatus: cleanString(packageReadback.packageRecordStatus || review.packageRecordStatus, 120),
    releaseAuthorizationLatestPackageId: cleanString(
      packageReadback.latestPackageId
      || review.latestPackageId
      || latestPackage.packageId
      || latestPackage.package_id,
      140
    ),
    releaseAuthorizationLatestPackageDashboardStatus: cleanString(packageReadback.latestPackageDashboardStatus || review.latestPackageDashboardStatus, 120),
    releaseAuthorizationLatestPackageDashboardNextActionKey: cleanString(packageReadback.latestPackageDashboardNextActionKey || review.latestPackageDashboardNextActionKey, 140),
    releaseAuthorizationLatestPackageDashboardPreflightStatus: cleanString(packageReadback.latestPackageDashboardPreflightStatus || review.latestPackageDashboardPreflightStatus, 120),
    releaseAuthorizationLatestPackageDashboardPreflightReadyForOwnerReleaseActivation: packageReadback.latestPackageDashboardPreflightReadyForOwnerReleaseActivation === true || review.latestPackageDashboardPreflightReadyForOwnerReleaseActivation === true,
    releaseAuthorizationWritefulSchedulingAllowed: result.writefulSchedulingAllowed === true || review.writefulSchedulingAllowed === true || packageReadback.writefulSchedulingAllowed === true,
    releaseAuthorizationRuntimeConfigChange: result.runtimeConfigChange === true || review.runtimeConfigChange === true || packageReadback.runtimeConfigChange === true
  });
}

function runOperation(service, input) {
  return projectReleaseAuthorizationSmokeReadback(service.authorize(input));
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
  const result = runOperation(services.learningAutomationReleaseAuthorizationService, input);
  process.stdout.write(formatResult(Object.assign({ operation: "authorize" }, result), pretty));
  process.exitCode = 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "release_authorization_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  projectReleaseAuthorizationSmokeReadback,
  runOperation,
  validateInput
};
