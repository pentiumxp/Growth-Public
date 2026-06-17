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
  projectReleaseActivationSmokeReadback,
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
      return {
        ok: true,
        status: "ready_for_owner_config_enablement",
        preflightPassed: true,
        readyForOwnerRuntimeConfigDecision: true,
        requestedActivationGates: ["writeful_execution"],
        missingApprovalKeys: [],
        latestPreflightReportId: "lgarpf_ready_1",
        latestPreflightStatus: "ready_for_owner_release_activation",
        activationPreflight: {
          status: "ready_for_owner_config_enablement",
          preflightPassed: true,
          readyForOwnerRuntimeConfigDecision: true,
          requiredActionCount: 1,
          nextAction: {
            key: "enable_automation_runtime_config",
            action: "enable_runtime_config_gates_after_owner_decision",
            requiredActor: "owner"
          }
        },
        configChangeApplied: false,
        writefulSchedulingAllowed: false,
        runtimeConfigChange: false
      };
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
  assert.equal(preflight.releaseActivationStatus, "ready_for_owner_config_enablement");
  assert.equal(preflight.releaseActivationPreflightPassed, true);
  assert.equal(preflight.releaseActivationReadyForOwnerRuntimeConfigDecision, true);
  assert.equal(preflight.releaseActivationRequestedGateCount, 1);
  assert.equal(preflight.releaseActivationMissingApprovalCount, 0);
  assert.equal(preflight.releaseActivationLatestPreflightReportId, "lgarpf_ready_1");
  assert.equal(preflight.releaseActivationLatestPreflightStatus, "ready_for_owner_release_activation");
  assert.equal(preflight.releaseActivationRequiredActionCount, 1);
  assert.deepEqual(preflight.releaseActivationNextAction, {
    key: "enable_automation_runtime_config",
    action: "enable_runtime_config_gates_after_owner_decision",
    requiredActor: "owner"
  });
  assert.equal(preflight.releaseActivationConfigChangeApplied, false);

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

test("release activation smoke script projects top-level operator readback", () => {
  const result = projectReleaseActivationSmokeReadback({
    ok: true,
    status: "ready_for_owner_config_enablement",
    preflightPassed: true,
    readyForOwnerReleaseActivation: true,
    readyForOwnerRuntimeConfigDecision: true,
    activationAllowed: true,
    requestedActivationGates: ["writeful_execution", "background_scheduler"],
    requiredApprovalKeys: ["writefulExecutionApproval"],
    missingApprovalKeys: [],
    latestPreflightReportId: "lgarpf_ready_1",
    latestPreflightStatus: "ready_for_owner_release_activation",
    latestPreflightReadyForProductionDeployReview: true,
    latestPreflightReadyForOwnerReleaseActivation: true,
    activationPreflight: {
      status: "ready_for_owner_config_enablement",
      preflightPassed: true,
      readyForOwnerRuntimeConfigDecision: true,
      activationAllowed: true,
      requiredActionCount: 1,
      nextAction: {
        key: "enable_automation_runtime_config",
        action: "enable_runtime_config_gates_after_owner_decision",
        requiredActor: "owner"
      },
      configChangeApplied: false,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false
    },
    configChangeApplied: false,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false
  });

  assert.equal(result.releaseActivationStatus, "ready_for_owner_config_enablement");
  assert.equal(result.releaseActivationPreflightPassed, true);
  assert.equal(result.releaseActivationReadyForOwnerReleaseActivation, true);
  assert.equal(result.releaseActivationReadyForOwnerRuntimeConfigDecision, true);
  assert.equal(result.releaseActivationAllowed, true);
  assert.equal(result.releaseActivationRequestedGateCount, 2);
  assert.equal(result.releaseActivationRequiredApprovalCount, 1);
  assert.equal(result.releaseActivationMissingApprovalCount, 0);
  assert.equal(result.releaseActivationLatestPreflightReportId, "lgarpf_ready_1");
  assert.equal(result.releaseActivationLatestPreflightStatus, "ready_for_owner_release_activation");
  assert.equal(result.releaseActivationLatestPreflightReadyForProductionDeployReview, true);
  assert.equal(result.releaseActivationLatestPreflightReadyForOwnerReleaseActivation, true);
  assert.equal(result.releaseActivationRequiredActionCount, 1);
  assert.equal(result.releaseActivationConfigChangeApplied, false);
  assert.equal(result.releaseActivationWritefulSchedulingAllowed, false);
  assert.equal(result.releaseActivationRuntimeConfigChange, false);
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
    assert.equal(output.releaseActivationStatus, output.status);
    assert.equal(output.releaseActivationPreflightPassed, output.preflightPassed);
    assert.equal(output.releaseActivationReadyForOwnerReleaseActivation, output.readyForOwnerReleaseActivation === true);
    assert.equal(output.releaseActivationReadyForOwnerRuntimeConfigDecision, output.readyForOwnerRuntimeConfigDecision === true);
    assert.equal(output.releaseActivationRequestedGateCount, output.requestedActivationGates.length);
    assert.equal(output.releaseActivationMissingApprovalCount, output.missingApprovalKeys.length);
    assert.equal(output.releaseActivationRequiredActionCount, output.activationPreflight.requiredActionCount);
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
    assert.equal(output.releaseActivationStatus, output.evaluated.status);
    assert.equal(output.releaseActivationLatestActivationId, output.activation.activationId);
    assert.equal(output.releaseActivationLatestActivationStatus, output.activation.status);
    assert.equal(output.releaseActivationConfigChangeApplied, false);
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
    assert.equal(listed.releaseActivationCount, 1);
    assert.equal(listed.releaseActivationLatestActivationId, output.activation.activationId);
    assert.equal(listed.releaseActivationLatestActivationStatus, output.activation.status);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
