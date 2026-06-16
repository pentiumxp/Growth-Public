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
    "--operation", "record",
    "--allow-write",
    "--workspace-id", "fanfan",
    "--learner-id", "fanfan",
    "--domain", "science",
    "--subject", "biology",
    "--collection-run-id", "lgacrn_ready_1",
    "--activation-gates", "writeful_execution,background_scheduler",
    "--required-approval-key", "backgroundWorkerApproval",
    "--automation-digest-ui-evidence", "true",
    "--scheduler-run-ui-evidence", "pass",
    "--note", "Owner reviewed activation.",
    "--recorded-by", "owner",
    "--recorded-at", "2026-06-16T09:00:00.000Z"
  ]);

  assert.equal(input.operation, "record");
  assert.equal(input.allowWrite, true);
  assert.equal(input.workspaceId, "fanfan");
  assert.equal(input.learnerId, "fanfan");
  assert.equal(input.collectionRunId, "lgacrn_ready_1");
  assert.deepEqual(input.activationGates, ["writeful_execution", "background_scheduler"]);
  assert.deepEqual(input.requiredApprovalKeys, ["backgroundWorkerApproval"]);
  assert.equal(input.automationDigestUiEvidence, true);
  assert.equal(input.schedulerRunUiEvidence, true);
  assert.equal(input.note, "Owner reviewed activation.");
  assert.equal(input.recordedBy, "owner");
  assert.equal(input.recordedAt, "2026-06-16T09:00:00.000Z");
});

test("release activation smoke script requires workspace scope", () => {
  assert.deepEqual(validateInput({}), {
    ok: false,
    error: "release_activation_smoke_workspace_required"
  });
  assert.deepEqual(validateInput({ workspaceId: "fanfan" }), { ok: true });
  assert.deepEqual(validateInput({ workspaceId: "fanfan", operation: "delete" }), {
    ok: false,
    error: "release_activation_smoke_operation_invalid"
  });
});

test("release activation smoke script delegates operations to service only and gates writes", () => {
  const calls = [];
  const service = {
    preflight(input) {
      calls.push({ type: "preflight", input });
      return { ok: true, status: "ready_for_owner_config_enablement" };
    },
    listActivations(input) {
      calls.push({ type: "list", input });
      return { ok: true, activations: [] };
    },
    recordActivation(input) {
      calls.push({ type: "record", input });
      return { ok: true, activation: { activationId: "lgaract_1" } };
    }
  };

  const preflight = runOperation(service, { workspaceId: "fanfan" });
  assert.equal(preflight.ok, true);
  assert.equal(preflight.status, "ready_for_owner_config_enablement");

  const list = runOperation(service, { workspaceId: "fanfan", operation: "list" });
  assert.equal(list.ok, true);

  const blocked = runOperation(service, { workspaceId: "fanfan", operation: "record" });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, "release_activation_smoke_write_not_allowed");

  const record = runOperation(service, { workspaceId: "fanfan", operation: "record", allowWrite: true });
  assert.equal(record.ok, true);
  assert.equal(record.activation.activationId, "lgaract_1");
  assert.deepEqual(calls.map((call) => call.type), ["preflight", "list", "record"]);
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

test("release activation smoke script rejects private values from parsed public scope", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-activation-private-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-release-activation.js"),
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
    assert.equal(output.operation, "preflight");
    assert.equal(output.ok, false);
    assert.equal(output.error, "learning_automation_release_activation_privacy_failed");
    assert.deepEqual(output.privateValueFindings, ["$.domain"]);
    assert.equal(JSON.stringify(output).includes("local-token"), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("release activation smoke script records summary-only audit rows against a temporary SQLite db when explicitly allowed", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-activation-record-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-release-activation.js"),
      "--operation", "record",
      "--allow-write",
      "--workspace-id", "fanfan",
      "--learner-id", "fanfan",
      "--activation-gate", "writeful_execution",
      "--recorded-by", "owner",
      "--recorded-at", "2026-06-16T09:10:00.000Z",
      "--json"
    ], {
      cwd: path.join(__dirname, ".."),
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });

    const output = JSON.parse(stdout);
    assert.equal(output.operation, "record");
    assert.equal(output.ok, true);
    assert.equal(output.activation.privacyClass, "summary_only");
    assert.equal(output.activation.activationPreflight.configChangeApplied, false);
    assert.equal(output.configChangeApplied, false);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);

    const listStdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-release-activation.js"),
      "--operation", "list",
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
    const listed = JSON.parse(listStdout);
    assert.equal(listed.operation, "list");
    assert.equal(listed.ok, true);
    assert.equal(listed.count, 1);
    assert.equal(listed.activations[0].activationId, output.activation.activationId);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
