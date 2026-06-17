"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const {
  inputFromArgs,
  projectReleaseAuthorizationSmokeReadback,
  runOperation,
  validateInput
} = require("../scripts/smoke-growth-release-authorization");

test("release authorization smoke script parses bounded scope, approvals, and evidence flags", () => {
  const input = inputFromArgs([
    "--workspace-id", "fanfan",
    "--learner-id", "fanfan",
    "--domain", "science",
    "--subject", "biology",
    "--collection-run-id", "lgacrn_ready_1",
    "--required-approval-keys", "writefulExecutionApproval,backgroundSchedulerApproval",
    "--scheduler-run-ui-evidence", "true"
  ]);

  assert.equal(input.workspaceId, "fanfan");
  assert.equal(input.learnerId, "fanfan");
  assert.equal(input.collectionRunId, "lgacrn_ready_1");
  assert.deepEqual(input.requiredApprovalKeys, ["writefulExecutionApproval", "backgroundSchedulerApproval"]);
  assert.equal(input.schedulerRunUiEvidence, true);
});

test("release authorization smoke script requires workspace scope", () => {
  assert.deepEqual(validateInput({}), {
    ok: false,
    error: "release_authorization_smoke_workspace_required"
  });
  assert.deepEqual(validateInput({ workspaceId: "fanfan" }), { ok: true });
});

test("release authorization smoke script delegates to service only", () => {
  const calls = [];
  const result = runOperation({
    authorize(input) {
      calls.push(input);
      return {
        ok: true,
        authorized: false,
        status: "blocked",
        reason: "learning_automation_release_authorization_review_not_approved",
        review: {
          status: "incomplete",
          approvedForReleaseReview: false,
          collectionRunPresent: true,
          packageRecordPresent: false
        },
        packageReadback: {
          summaryOnly: true,
          packageRecordStatus: "missing",
          latestPackageDashboardStatus: "manual_runtime_config_required"
        }
      };
    }
  }, { workspaceId: "fanfan" });

  assert.equal(result.ok, true);
  assert.equal(result.authorized, false);
  assert.equal(result.releaseAuthorizationStatus, "blocked");
  assert.equal(result.releaseAuthorizationAuthorized, false);
  assert.equal(result.releaseAuthorizationReason, "learning_automation_release_authorization_review_not_approved");
  assert.equal(result.releaseAuthorizationReviewStatus, "incomplete");
  assert.equal(result.releaseAuthorizationCollectionRunPresent, true);
  assert.equal(result.releaseAuthorizationPackageRecordStatus, "missing");
  assert.equal(result.packageReadback.latestPackageDashboardStatus, "manual_runtime_config_required");
  assert.equal(result.releaseAuthorizationLatestPackageDashboardStatus, "manual_runtime_config_required");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].workspaceId, "fanfan");
});

test("release authorization smoke script projects top-level operator readback", () => {
  const result = projectReleaseAuthorizationSmokeReadback({
    ok: true,
    status: "authorized",
    authorized: true,
    reason: "",
    requiredApprovalKeys: [ "writefulExecutionApproval" ],
    approvalKeys: [ "writefulExecutionApproval" ],
    missingApprovalKeys: [],
    review: {
      status: "approved",
      approvedForReleaseReview: true,
      collectionRunPresent: true,
      packageRecordReadbackAvailable: true,
      packageRecordPresent: true,
      packageRecordStatus: "ready_for_release_review"
    },
    packageReadback: {
      packageRecordReadbackAvailable: true,
      packageRecordPresent: true,
      packageRecordStatus: "ready_for_release_review",
      latestPackageId: "lgrpkg_1",
      latestPackageDashboardStatus: "ready_for_owner_release_activation",
      latestPackageDashboardNextActionKey: "",
      latestPackageDashboardPreflightStatus: "ready_for_owner_release_activation",
      latestPackageDashboardPreflightReadyForOwnerReleaseActivation: true
    },
    latestCollectionRun: {
      runId: "lgacrn_ready_1",
      status: "ready_for_release_review"
    },
    latestDecision: {
      decisionId: "lgrd_1",
      status: "approved"
    },
    latestPackage: {
      packageId: "lgrpkg_1"
    },
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false
  });

  assert.equal(result.releaseAuthorizationStatus, "authorized");
  assert.equal(result.releaseAuthorizationAuthorized, true);
  assert.equal(result.releaseAuthorizationRequiredApprovalCount, 1);
  assert.equal(result.releaseAuthorizationApprovalCount, 1);
  assert.equal(result.releaseAuthorizationMissingApprovalCount, 0);
  assert.equal(result.releaseAuthorizationReviewStatus, "approved");
  assert.equal(result.releaseAuthorizationReviewApprovedForReleaseReview, true);
  assert.equal(result.releaseAuthorizationCollectionRunPresent, true);
  assert.equal(result.releaseAuthorizationCollectionRunId, "lgacrn_ready_1");
  assert.equal(result.releaseAuthorizationCollectionRunStatus, "ready_for_release_review");
  assert.equal(result.releaseAuthorizationLatestDecisionId, "lgrd_1");
  assert.equal(result.releaseAuthorizationLatestDecisionStatus, "approved");
  assert.equal(result.releaseAuthorizationPackageRecordReadbackAvailable, true);
  assert.equal(result.releaseAuthorizationPackageRecordPresent, true);
  assert.equal(result.releaseAuthorizationPackageRecordStatus, "ready_for_release_review");
  assert.equal(result.releaseAuthorizationLatestPackageId, "lgrpkg_1");
  assert.equal(result.releaseAuthorizationLatestPackageDashboardStatus, "ready_for_owner_release_activation");
  assert.equal(result.releaseAuthorizationLatestPackageDashboardPreflightStatus, "ready_for_owner_release_activation");
  assert.equal(result.releaseAuthorizationLatestPackageDashboardPreflightReadyForOwnerReleaseActivation, true);
  assert.equal(result.releaseAuthorizationWritefulSchedulingAllowed, false);
  assert.equal(result.releaseAuthorizationRuntimeConfigChange, false);
});

test("release authorization smoke script runs no-write authorization against a temporary SQLite db", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-authorization-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-release-authorization.js"),
      "--workspace-id", "fanfan",
      "--learner-id", "fanfan",
      "--json"
    ], {
      cwd: path.join(__dirname, ".."),
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });

    const output = JSON.parse(stdout);
    assert.equal(output.operation, "authorize");
    assert.equal(output.ok, true);
    assert.equal(output.schemaVersion, "growth.learningAutomationReleaseAuthorization.v1");
    assert.equal(output.authorized, false);
    assert.equal(output.releaseAuthorizationStatus, output.status);
    assert.equal(output.releaseAuthorizationAuthorized, false);
    assert.equal(output.releaseAuthorizationReason, output.reason || output.error);
    assert.equal(output.releaseAuthorizationRequiredApprovalCount, output.requiredApprovalKeys.length);
    assert.equal(output.releaseAuthorizationApprovalCount, output.approvalKeys.length);
    assert.equal(output.releaseAuthorizationMissingApprovalCount, output.missingApprovalKeys.length);
    assert.equal(output.releaseAuthorizationReviewStatus, output.review.status);
    assert.equal(output.releaseAuthorizationPackageRecordStatus, output.packageReadback.packageRecordStatus);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("release authorization smoke script rejects private values from parsed public scope", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-authorization-privacy-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  try {
    new DatabaseSync(dbPath).close();
    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-release-authorization.js"),
      "--workspace-id", "fanfan",
      "--learner-id", "fanfan",
      "--domain", "Bearer local-token",
      "--json"
    ], {
      cwd: path.join(__dirname, ".."),
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });

    const output = JSON.parse(stdout);
    assert.equal(output.operation, "authorize");
    assert.equal(output.ok, false);
    assert.equal(output.error, "learning_automation_release_authorization_privacy_failed");
    assert.deepEqual(output.privateValueFindings, ["$.domain"]);
    assert.equal(JSON.stringify(output).includes("local-token"), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
