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
} = require("../scripts/smoke-growth-release-workbench");

test("release workbench smoke script parses bounded scope and release selectors", () => {
  const input = inputFromArgs([
    "--workspace-id", "fanfan",
    "--learner-id", "fanfan",
    "--domain", "science",
    "--subject", "biology",
    "--collection-run-id", "lgacrn_ready_1",
    "--required-approval-keys", "writefulExecutionApproval,backgroundSchedulerApproval",
    "--activation-gates", "writeful_execution,background_scheduler",
    "--activation-record-limit", "10",
    "--runtime-enablement-record-limit", "4",
    "--automation-digest-ui-evidence", "true"
  ]);

  assert.equal(input.workspaceId, "fanfan");
  assert.equal(input.learnerId, "fanfan");
  assert.equal(input.collectionRunId, "lgacrn_ready_1");
  assert.deepEqual(input.requiredApprovalKeys, ["writefulExecutionApproval", "backgroundSchedulerApproval"]);
  assert.deepEqual(input.activationGates, ["writeful_execution", "background_scheduler"]);
  assert.equal(input.activationRecordLimit, 10);
  assert.equal(input.runtimeEnablementRecordLimit, 4);
  assert.equal(input.automationDigestUiEvidence, true);
});

test("release workbench smoke script requires workspace scope", () => {
  assert.deepEqual(validateInput({}), {
    ok: false,
    error: "release_workbench_smoke_workspace_required"
  });
  assert.deepEqual(validateInput({ workspaceId: "fanfan" }), { ok: true });
});

test("release workbench smoke script delegates only to service workbench", () => {
  const calls = [];
  const service = {
    workbench(input) {
      calls.push(input);
      return {
        ok: true,
        schemaVersion: "growth.learningAutomationReleaseWorkbench.v1",
        status: "manual_runtime_config_required",
        writefulSchedulingAllowed: false
      };
    }
  };

  const result = runOperation(service, {
    workspaceId: "fanfan",
    activationGates: ["writeful_execution"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "manual_runtime_config_required");
  assert.deepEqual(calls[0].activationGates, ["writeful_execution"]);
});

test("release workbench smoke script runs no-write read model against a temporary SQLite db", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-workbench-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-release-workbench.js"),
      "--workspace-id", "fanfan",
      "--learner-id", "fanfan",
      "--activation-gate", "writeful_execution",
      "--json"
    ], {
      cwd: path.join(__dirname, ".."),
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });

    const output = JSON.parse(stdout);
    assert.equal(output.operation, "workbench");
    assert.equal(output.ok, true);
    assert.equal(output.schemaVersion, "growth.learningAutomationReleaseWorkbench.v1");
    assert.equal(output.status, "release_evidence_required");
    assert.equal(output.releaseWorkbench.summaryOnly, true);
    assert.equal(output.releaseWorkbench.ownerActions.some((action) => action.endpointKey === "release_evidence"), true);
    assert.equal(output.releaseWorkbench.readRoutes.some((route) => route.key === "release_dashboard"), true);
    assert.equal(output.releaseWorkbench.recordRoutes.some((route) => route.key === "release_evidence"), true);
    assert.equal(output.releaseWorkbench.recordRoutes.some((route) => route.key === "runtime_enablement"), true);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);
    assert.equal(output.configChangeApplied, false);
    assert.equal(output.runtimeConfigMutationPerformed, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
