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
} = require("../scripts/smoke-growth-release-preflight");

test("release preflight smoke script parses bounded scope, operation, and write gate", () => {
  const input = inputFromArgs([
    "--operation", "record",
    "--workspace-id", "fanfan",
    "--learner-id", "fanfan",
    "--domain", "science",
    "--subject", "biology",
    "--collection-run-id", "lgacrn_ready_1",
    "--required-approval-keys", "writefulExecutionApproval,backgroundSchedulerApproval",
    "--activation-gates", "writeful_execution,background_scheduler",
    "--activation-record-limit", "10",
    "--runtime-enablement-record-limit", "4",
    "--automation-digest-ui-evidence", "true",
    "--allow-write",
    "--requested-by", "owner"
  ]);

  assert.equal(input.operation, "record");
  assert.equal(input.workspaceId, "fanfan");
  assert.equal(input.learnerId, "fanfan");
  assert.equal(input.collectionRunId, "lgacrn_ready_1");
  assert.deepEqual(input.requiredApprovalKeys, ["writefulExecutionApproval", "backgroundSchedulerApproval"]);
  assert.deepEqual(input.activationGates, ["writeful_execution", "background_scheduler"]);
  assert.equal(input.activationRecordLimit, 10);
  assert.equal(input.runtimeEnablementRecordLimit, 4);
  assert.equal(input.automationDigestUiEvidence, true);
  assert.equal(input.allowWritePreflight, true);
  assert.equal(input.requestedBy, "owner");
});

test("release preflight smoke script validates workspace and write authorization", () => {
  assert.deepEqual(validateInput({ operation: "evaluate" }), {
    ok: false,
    error: "release_preflight_smoke_workspace_required"
  });
  assert.deepEqual(validateInput({ operation: "unknown", workspaceId: "fanfan" }), {
    ok: false,
    error: "release_preflight_smoke_operation_invalid"
  });
  assert.deepEqual(validateInput({ operation: "record", workspaceId: "fanfan" }), {
    ok: false,
    error: "release_preflight_smoke_write_not_authorized"
  });
  assert.deepEqual(validateInput({ operation: "record", workspaceId: "fanfan", allowWritePreflight: true }), { ok: true });
});

test("release preflight smoke script delegates only to selected preflight service method", () => {
  const calls = [];
  const service = {
    evaluate(input) {
      calls.push(["evaluate", input]);
      return { ok: true, status: "blocked" };
    },
    listReports(input) {
      calls.push(["list", input]);
      return { ok: true, reports: [] };
    },
    recordReport(input) {
      calls.push(["record", input]);
      return { ok: true, report: { preflightReportId: "lgarpf_1" } };
    }
  };

  assert.equal(runOperation(service, { operation: "evaluate", workspaceId: "fanfan" }).ok, true);
  assert.equal(runOperation(service, { operation: "list", workspaceId: "fanfan" }).ok, true);
  assert.equal(runOperation(service, { operation: "record", workspaceId: "fanfan", allowWritePreflight: true }).ok, true);
  assert.deepEqual(calls.map((call) => call[0]), ["evaluate", "list", "record"]);
  assert.equal(calls[2][1].operation, undefined);
  assert.equal(calls[2][1].allowWritePreflight, true);
});

test("release preflight smoke script runs no-write evaluate against a temporary SQLite db", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-preflight-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-release-preflight.js"),
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
    assert.equal(output.operation, "evaluate");
    assert.equal(output.ok, true);
    assert.equal(output.schemaVersion, "growth.learningAutomationReleasePreflight.v1");
    assert.equal(output.releasePreflight.summaryOnly, true);
    assert.equal(output.releasePreflight.readyForProductionDeploy, false);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);
    assert.equal(output.configChangeApplied, false);
    assert.equal(output.runtimeConfigMutationPerformed, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
