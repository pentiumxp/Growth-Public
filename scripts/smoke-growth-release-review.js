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
  return [ "1", "true", "yes", "on", "pass", "ready" ].includes(String(value || "").trim().toLowerCase());
}

function inputFromArgs(args) {
  const workspaceId = firstArgValue(args, [ "--workspace-id", "--workspaceId" ], "");
  return {
    workspaceId,
    learnerId: firstArgValue(args, [ "--learner-id", "--learnerId" ], "") || workspaceId,
    programId: firstArgValue(args, [ "--program-id", "--programId" ], ""),
    domainPackId: firstArgValue(args, [ "--domain-pack-id", "--domainPackId" ], ""),
    domain: firstArgValue(args, [ "--domain" ], ""),
    subject: firstArgValue(args, [ "--subject" ], ""),
    horizon: firstArgValue(args, [ "--horizon" ], "daily_plan") || "daily_plan",
    collectionRunId: firstArgValue(args, [ "--collection-run-id", "--collectionRunId", "--run-id", "--runId" ], ""),
    ownerDailyUiEvidence: truthy(firstArgValue(args, [ "--owner-daily-ui-evidence", "--ownerDailyUiEvidence" ], "")),
    ownerAuditUiEvidence: truthy(firstArgValue(args, [ "--owner-audit-ui-evidence", "--ownerAuditUiEvidence" ], "")),
    stageCheckpointEvidence: truthy(firstArgValue(args, [ "--stage-checkpoint-evidence", "--stageCheckpointEvidence" ], "")),
    proposalReviewUiEvidence: truthy(firstArgValue(args, [ "--proposal-review-ui-evidence", "--proposalReviewUiEvidence" ], "")),
    automationDigestUiEvidence: truthy(firstArgValue(args, [ "--automation-digest-ui-evidence", "--automationDigestUiEvidence" ], "")),
    automationActionHandoffUiEvidence: truthy(firstArgValue(args, [ "--automation-action-handoff-ui-evidence", "--automationActionHandoffUiEvidence" ], "")),
    schedulerExecutionUiEvidence: truthy(firstArgValue(args, [ "--scheduler-execution-ui-evidence", "--schedulerExecutionUiEvidence" ], "")),
    schedulerRunUiEvidence: truthy(firstArgValue(args, [ "--scheduler-run-ui-evidence", "--schedulerRunUiEvidence" ], "")),
    schedulerWorkerTargetUiEvidence: truthy(firstArgValue(args, [ "--scheduler-worker-target-ui-evidence", "--schedulerWorkerTargetUiEvidence" ], "")),
    limit: Number(firstArgValue(args, [ "--limit" ], "5")) || 5
  };
}

function validateInput(input = {}) {
  if (!input.workspaceId) return { ok: false, error: "release_review_smoke_workspace_required" };
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

function projectReleaseReviewSmokeReadback(result = {}) {
  const releaseReview = objectOnly(result.releaseReview);
  const latestCollectionRun = objectOnly(result.latestCollectionRun);
  const latestDecision = objectOnly(result.latestDecision);
  const latestPackage = objectOnly(result.latestPackage);
  const packageReadback = objectOnly(result.packageReadback || releaseReview.packageReadback);
  const status = cleanString(result.releaseReviewStatus || result.status || releaseReview.status, 120);
  const latestPackageId = cleanString(
    releaseReview.latestPackageId
    || packageReadback.latestPackageId
    || latestPackage.packageId
    || latestPackage.package_id,
    140
  );
  return Object.assign({}, result, {
    releaseReviewStatus: status,
    releaseReviewReadyForReleaseReview: result.readyForReleaseReview === true,
    releaseReviewApprovedForReleaseReview: result.approvedForReleaseReview === true || status === "approved",
    releaseReviewCollectionRunPresent: result.collectionRunPresent === true || Boolean(latestCollectionRun.runId),
    releaseReviewCollectionRunId: cleanString(
      result.collectionRunId
      || latestCollectionRun.runId
      || latestCollectionRun.collectionRunId
      || latestCollectionRun.collection_run_id,
      140
    ),
    releaseReviewLatestDecisionId: cleanString(latestDecision.decisionId || latestDecision.decision_id, 140),
    releaseReviewLatestDecisionStatus: cleanString(latestDecision.status, 120),
    releaseReviewPackageRecordReadbackAvailable: result.packageRecordReadbackAvailable === true || releaseReview.packageRecordReadbackAvailable === true,
    releaseReviewPackageRecordRequired: result.packageRecordRequired === true || releaseReview.packageRecordRequired === true,
    releaseReviewPackageRecordPresent: result.packageRecordPresent === true || releaseReview.packageRecordPresent === true,
    releaseReviewPackageRecordStatus: cleanString(releaseReview.packageRecordStatus || packageReadback.packageRecordStatus, 120),
    releaseReviewLatestPackageId: latestPackageId,
    releaseReviewLatestPackageStepCount: Number(releaseReview.latestPackageStepCount || packageReadback.latestPackageStepCount || 0) || 0,
    releaseReviewLatestPackageDashboardStatus: cleanString(releaseReview.latestPackageDashboardStatus || packageReadback.latestPackageDashboardStatus, 120),
    releaseReviewLatestPackageDashboardNextActionKey: cleanString(releaseReview.latestPackageDashboardNextActionKey || packageReadback.latestPackageDashboardNextActionKey, 140),
    releaseReviewLatestPackageDashboardPreflightStatus: cleanString(releaseReview.latestPackageDashboardPreflightStatus || packageReadback.latestPackageDashboardPreflightStatus, 120),
    releaseReviewLatestPackageDashboardPreflightReadyForOwnerReleaseActivation: releaseReview.latestPackageDashboardPreflightReadyForOwnerReleaseActivation === true || packageReadback.latestPackageDashboardPreflightReadyForOwnerReleaseActivation === true,
    releaseReviewMissingCheckCount: asArray(releaseReview.missingCheckKeys).length,
    releaseReviewBlockedCheckCount: asArray(releaseReview.blockedCheckKeys).length,
    releaseReviewMissingEvidenceCount: asArray(releaseReview.missingEvidenceKeys).length,
    releaseReviewRequiredActionCount: Number(releaseReview.requiredActionCount || 0) || 0,
    releaseReviewNextAction: compactAction(releaseReview.nextAction),
    releaseReviewWritefulSchedulingAllowed: result.writefulSchedulingAllowed === true || releaseReview.writefulSchedulingAllowed === true,
    releaseReviewRuntimeConfigChange: result.runtimeConfigChange === true || releaseReview.runtimeConfigChange === true
  });
}

function runOperation(service, input) {
  return projectReleaseReviewSmokeReadback(service.review(input));
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
  const result = runOperation(services.learningAutomationReleaseReviewService, input);
  process.stdout.write(formatResult(Object.assign({ operation: "review" }, result), pretty));
  process.exitCode = 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "release_review_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  projectReleaseReviewSmokeReadback,
  runOperation,
  validateInput
};
