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
} = require("../scripts/smoke-growth-release-controls");

test("release controls smoke script parses bounded scope and release selectors", () => {
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

test("release controls smoke script requires workspace scope", () => {
  assert.deepEqual(validateInput({}), {
    ok: false,
    error: "release_controls_smoke_workspace_required"
  });
  assert.deepEqual(validateInput({ workspaceId: "fanfan" }), { ok: true });
});

test("release controls smoke script delegates only to service summary", () => {
  const calls = [];
  const service = {
    summarize(input) {
      calls.push(input);
      return {
        ok: true,
        schemaVersion: "growth.learningAutomationReleaseControls.v1",
        status: "activation_record_required",
        writefulSchedulingAllowed: false
      };
    }
  };

  const result = runOperation(service, {
    workspaceId: "fanfan",
    activationGates: ["writeful_execution"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "activation_record_required");
  assert.deepEqual(calls[0].activationGates, ["writeful_execution"]);
});

test("release controls smoke script runs no-write summary against a temporary SQLite db", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-controls-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-release-controls.js"),
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
    assert.equal(output.operation, "summarize");
    assert.equal(output.ok, true);
    assert.equal(output.schemaVersion, "growth.learningAutomationReleaseControls.v1");
    assert.equal(output.status, "release_evidence_required");
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);
    assert.equal(output.configChangeApplied, false);
    assert.equal(output.runtimeConfigMutationPerformed, false);
    assert.equal(output.releaseControls.summaryOnly, true);
    assert.equal(output.steps[0].evidenceReadback.summaryOnly, true);
    assert.equal(output.steps[0].evidenceReadback.presentCount, 0);
    assert.equal(output.steps[0].evidenceReadback.missingCount, 32);
    assert.equal(output.steps[0].evidenceReadback.missingCheckKeys.includes("owner_daily_ui_evidence"), true);
    assert.equal(output.steps[0].evidenceReadback.missingCheckKeys.includes("owner_review_evidence"), true);
    assert.equal(output.auditReadback.summaryOnly, true);
    assert.equal(output.auditReadback.activationRecords.status, "records_missing");
    assert.equal(output.auditReadback.runtimeEnablementRecords.status, "records_missing");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
