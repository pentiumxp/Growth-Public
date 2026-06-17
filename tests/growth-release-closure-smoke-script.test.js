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
  projectReleaseClosureSmokeReadback,
  runOperation,
  validateInput
} = require("../scripts/smoke-growth-release-closure");

test("release closure smoke script parses bounded scope, approvals, and evidence flags", () => {
  const input = inputFromArgs([
    "--workspace-id", "fanfan",
    "--learner-id", "fanfan",
    "--domain", "science",
    "--subject", "biology",
    "--collection-run-id", "lgacrn_ready_1",
    "--required-approval-keys", "writefulExecutionApproval,backgroundSchedulerApproval",
    "--automation-digest-ui-evidence", "true",
    "--scheduler-run-ui-evidence", "pass"
  ]);

  assert.equal(input.workspaceId, "fanfan");
  assert.equal(input.learnerId, "fanfan");
  assert.equal(input.collectionRunId, "lgacrn_ready_1");
  assert.deepEqual(input.requiredApprovalKeys, ["writefulExecutionApproval", "backgroundSchedulerApproval"]);
  assert.equal(input.automationDigestUiEvidence, true);
  assert.equal(input.schedulerRunUiEvidence, true);
});

test("release closure smoke script requires workspace scope", () => {
  assert.deepEqual(validateInput({}), {
    ok: false,
    error: "release_closure_smoke_workspace_required"
  });
  assert.deepEqual(validateInput({ workspaceId: "fanfan" }), { ok: true });
});

test("release closure smoke script delegates to service only", () => {
  const calls = [];
  const result = runOperation({
    summarize(input) {
      calls.push(input);
      return {
        ok: true,
        status: "approval_required",
        packageReadback: {
          summaryOnly: true,
          latestPackageDashboardStatus: "manual_runtime_config_required"
        }
      };
    }
  }, { workspaceId: "fanfan" });

  assert.equal(result.ok, true);
  assert.equal(result.status, "approval_required");
  assert.equal(result.releaseClosureStatus, "approval_required");
  assert.equal(result.packageReadback.latestPackageDashboardStatus, "manual_runtime_config_required");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].workspaceId, "fanfan");
});

test("release closure smoke script projects top-level operator readback", () => {
  const result = projectReleaseClosureSmokeReadback({
    ok: true,
    status: "owner_decision_required",
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    releaseClosure: {
      status: "owner_decision_required",
      requiredActionCount: 3,
      nextAction: {
        key: "resolve_release_blocker",
        action: "resolve_or_record_blocked_release_decision",
        requiredActor: "owner"
      },
      missingCheckKeys: ["owner_daily_ui_evidence"],
      blockedCheckKeys: ["release_decision"],
      missingEvidenceKeys: ["ownerDailyUiEvidence"],
      missingApprovalKeys: ["writefulExecutionApproval"],
      packageRecordPresent: false,
      packageRecordRequired: true,
      packageRecordStatus: "missing",
      latestPackageDashboardStatus: "manual_runtime_config_required",
      latestPackageDashboardNextActionKey: "record_release_preflight",
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false
    }
  });

  assert.equal(result.releaseClosureStatus, "owner_decision_required");
  assert.equal(result.releaseClosureRequiredActionCount, 3);
  assert.equal(result.releaseClosureNextAction.key, "resolve_release_blocker");
  assert.equal(result.releaseClosureNextAction.action, "resolve_or_record_blocked_release_decision");
  assert.equal(result.releaseClosureMissingCheckCount, 1);
  assert.equal(result.releaseClosureBlockedCheckCount, 1);
  assert.equal(result.releaseClosureMissingEvidenceCount, 1);
  assert.equal(result.releaseClosureMissingApprovalCount, 1);
  assert.equal(result.releaseClosurePackageRecordPresent, false);
  assert.equal(result.releaseClosurePackageRecordRequired, true);
  assert.equal(result.releaseClosurePackageRecordStatus, "missing");
  assert.equal(result.releaseClosureLatestPackageDashboardStatus, "manual_runtime_config_required");
  assert.equal(result.releaseClosureLatestPackageDashboardNextActionKey, "record_release_preflight");
  assert.equal(result.releaseClosureWritefulSchedulingAllowed, false);
  assert.equal(result.releaseClosureRuntimeConfigChange, false);
});

test("release closure smoke script runs no-write closure against a temporary SQLite db", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-closure-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-release-closure.js"),
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
    assert.equal(output.operation, "summarize");
    assert.equal(output.ok, true);
    assert.equal(output.schemaVersion, "growth.learningAutomationReleaseClosure.v1");
    assert.equal(output.releaseClosureStatus, output.releaseClosure.status);
    assert.equal(output.releaseClosureRequiredActionCount, output.releaseClosure.requiredActionCount);
    assert.equal(output.releaseClosureNextAction.key, output.releaseClosure.nextAction.key);
    assert.equal(output.releaseClosureMissingCheckCount, output.releaseClosure.missingCheckKeys.length);
    assert.equal(output.releaseClosureBlockedCheckCount, output.releaseClosure.blockedCheckKeys.length);
    assert.equal(output.releaseClosureMissingEvidenceCount, output.releaseClosure.missingEvidenceKeys.length);
    assert.equal(output.releaseClosureMissingApprovalCount, output.releaseClosure.missingApprovalKeys.length);
    assert.equal(output.releaseClosurePackageRecordPresent, output.releaseClosure.packageRecordPresent);
    assert.equal(output.releaseClosurePackageRecordRequired, output.releaseClosure.packageRecordRequired);
    assert.equal(output.releaseClosurePackageRecordStatus, output.releaseClosure.packageRecordStatus);
    assert.equal(output.backendEvidenceComplete, false);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.releaseClosureWritefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);
    assert.equal(output.releaseClosureRuntimeConfigChange, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("release closure smoke script rejects private values from parsed public scope", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-closure-private-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-release-closure.js"),
      "--workspace-id", "fanfan",
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
    assert.equal(output.operation, "summarize");
    assert.equal(output.ok, false);
    assert.equal(output.error, "learning_automation_release_closure_privacy_failed");
    assert.deepEqual(output.privateValueFindings, ["$.domain"]);
    assert.equal(JSON.stringify(output).includes("local-token"), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
