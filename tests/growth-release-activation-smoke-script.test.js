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
} = require("../scripts/smoke-growth-release-activation");

test("release activation smoke script parses bounded scope, activation gates, approvals, and evidence flags", () => {
  const input = inputFromArgs([
    "--workspace-id", "fanfan",
    "--learner-id", "fanfan",
    "--domain", "science",
    "--subject", "biology",
    "--collection-run-id", "lgacrn_ready_1",
    "--activation-gates", "writeful_execution,background_scheduler",
    "--required-approval-key", "backgroundWorkerApproval",
    "--automation-digest-ui-evidence", "true",
    "--scheduler-run-ui-evidence", "pass"
  ]);

  assert.equal(input.workspaceId, "fanfan");
  assert.equal(input.learnerId, "fanfan");
  assert.equal(input.collectionRunId, "lgacrn_ready_1");
  assert.deepEqual(input.activationGates, ["writeful_execution", "background_scheduler"]);
  assert.deepEqual(input.requiredApprovalKeys, ["backgroundWorkerApproval"]);
  assert.equal(input.automationDigestUiEvidence, true);
  assert.equal(input.schedulerRunUiEvidence, true);
});

test("release activation smoke script requires workspace scope", () => {
  assert.deepEqual(validateInput({}), {
    ok: false,
    error: "release_activation_smoke_workspace_required"
  });
  assert.deepEqual(validateInput({ workspaceId: "fanfan" }), { ok: true });
});

test("release activation smoke script delegates to service only", () => {
  const calls = [];
  const result = runOperation({
    preflight(input) {
      calls.push(input);
      return { ok: true, status: "ready_for_owner_config_enablement" };
    }
  }, { workspaceId: "fanfan" });

  assert.equal(result.ok, true);
  assert.equal(result.status, "ready_for_owner_config_enablement");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].workspaceId, "fanfan");
});

test("release activation smoke script runs no-write preflight against a temporary SQLite db", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-activation-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-release-activation.js"),
      "--workspace-id", "fanfan",
      "--learner-id", "fanfan",
      "--activation-gates", "writeful_execution,background_scheduler",
      "--json"
    ], {
      cwd: path.join(__dirname, ".."),
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });

    const output = JSON.parse(stdout);
    assert.equal(output.operation, "preflight");
    assert.equal(output.ok, true);
    assert.equal(output.schemaVersion, "growth.learningAutomationReleaseActivation.v1");
    assert.equal(output.preflightPassed, false);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);
    assert.equal(output.configChangeApplied, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
