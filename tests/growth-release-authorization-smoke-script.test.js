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
        packageReadback: {
          summaryOnly: true,
          latestPackageDashboardStatus: "manual_runtime_config_required"
        }
      };
    }
  }, { workspaceId: "fanfan" });

  assert.equal(result.ok, true);
  assert.equal(result.authorized, false);
  assert.equal(result.packageReadback.latestPackageDashboardStatus, "manual_runtime_config_required");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].workspaceId, "fanfan");
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
