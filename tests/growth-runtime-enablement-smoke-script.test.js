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
} = require("../scripts/smoke-growth-runtime-enablement");

test("runtime enablement smoke script parses bounded scope and activation gates", () => {
  const input = inputFromArgs([
    "--operation", "record",
    "--allow-write",
    "--workspace-id", "fanfan",
    "--learner-id", "fanfan",
    "--domain", "science",
    "--subject", "biology",
    "--collection-run-id", "lgacrn_ready_1",
    "--activation-gates", "writeful_execution,background_scheduler",
    "--activation-record-limit", "10",
    "--note", "Owner reviewed runtime enablement.",
    "--recorded-by", "owner",
    "--recorded-at", "2026-06-16T10:20:00.000Z"
  ]);

  assert.equal(input.operation, "record");
  assert.equal(input.allowWrite, true);
  assert.equal(input.workspaceId, "fanfan");
  assert.equal(input.learnerId, "fanfan");
  assert.equal(input.collectionRunId, "lgacrn_ready_1");
  assert.deepEqual(input.activationGates, ["writeful_execution", "background_scheduler"]);
  assert.equal(input.activationRecordLimit, 10);
  assert.equal(input.note, "Owner reviewed runtime enablement.");
  assert.equal(input.recordedBy, "owner");
  assert.equal(input.recordedAt, "2026-06-16T10:20:00.000Z");
});

test("runtime enablement smoke script requires workspace scope", () => {
  assert.deepEqual(validateInput({}), {
    ok: false,
    error: "runtime_enablement_smoke_workspace_required"
  });
  assert.deepEqual(validateInput({ workspaceId: "fanfan" }), { ok: true });
  assert.deepEqual(validateInput({ workspaceId: "fanfan", operation: "delete" }), {
    ok: false,
    error: "runtime_enablement_smoke_operation_invalid"
  });
});

test("runtime enablement smoke script delegates operations to service only and gates writes", () => {
  const calls = [];
  const service = {
    evaluate(input) {
      calls.push({ type: "evaluate", input });
      return { ok: true, status: "activation_record_required" };
    },
    listEnablements(input) {
      calls.push({ type: "list", input });
      return { ok: true, enablements: [] };
    },
    recordEnablement(input) {
      calls.push({ type: "record", input });
      return { ok: true, enablement: { enablementId: "lgrten_1" } };
    }
  };

  const evaluated = runOperation(service, { workspaceId: "fanfan" });
  assert.equal(evaluated.ok, true);
  assert.equal(evaluated.status, "activation_record_required");

  const list = runOperation(service, { workspaceId: "fanfan", operation: "list" });
  assert.equal(list.ok, true);

  const blocked = runOperation(service, { workspaceId: "fanfan", operation: "record" });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, "runtime_enablement_smoke_write_not_allowed");

  const record = runOperation(service, { workspaceId: "fanfan", operation: "record", allowWrite: true });
  assert.equal(record.ok, true);
  assert.equal(record.enablement.enablementId, "lgrten_1");
  assert.deepEqual(calls.map((call) => call.type), ["evaluate", "list", "record"]);
});

test("runtime enablement smoke script runs no-write evaluation against a temporary SQLite db", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-runtime-enablement-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-runtime-enablement.js"),
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
    assert.equal(output.operation, "evaluate");
    assert.equal(output.ok, true);
    assert.equal(output.schemaVersion, "growth.learningAutomationRuntimeEnablement.v1");
    assert.equal(output.status, "activation_record_required");
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);
    assert.equal(output.configChangeApplied, false);
    assert.equal(output.runtimeConfigMutationPerformed, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("runtime enablement smoke script records summary-only audit rows against a temporary SQLite db when explicitly allowed", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-runtime-enablement-record-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-runtime-enablement.js"),
      "--operation", "record",
      "--allow-write",
      "--workspace-id", "fanfan",
      "--learner-id", "fanfan",
      "--activation-gate", "writeful_execution",
      "--recorded-by", "owner",
      "--recorded-at", "2026-06-16T10:30:00.000Z",
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
    assert.equal(output.enablement.privacyClass, "summary_only");
    assert.equal(output.enablement.status, "activation_record_required");
    assert.equal(output.enablement.currentConfig.configChangeApplied, false);
    assert.equal(output.configChangeApplied, false);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);

    const listStdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-runtime-enablement.js"),
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
    assert.equal(listed.enablements[0].enablementId, output.enablement.enablementId);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
