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
  projectRuntimeEnablementSmokeReadback,
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
      return {
        ok: true,
        status: "ready_for_manual_runtime_config_enablement",
        runtimeConfigVerified: false,
        readyForManualRuntimeConfigEnablement: true,
        manualRuntimeConfigRequired: true,
        requestedActivationGates: ["writeful_execution"],
        requiredConfigKeys: ["automationWritefulExecutionEnabled"],
        latestPreflightReportId: "lgarpf_ready_1",
        latestPreflightStatus: "ready_for_owner_release_activation",
        runtimeEnablement: {
          status: "ready_for_manual_runtime_config_enablement",
          runtimeConfigVerified: false,
          readyForManualRuntimeConfigEnablement: true,
          requiredActionCount: 1,
          nextAction: {
            key: "enable_runtime_config_manually",
            action: "perform_platform_runtime_config_enablement",
            requiredActor: "owner"
          },
          configChangeApplied: false,
          runtimeConfigChange: false,
          runtimeConfigMutationPerformed: false,
          writefulSchedulingAllowed: false
        },
        configChangeApplied: false,
        runtimeConfigChange: false,
        runtimeConfigMutationPerformed: false,
        writefulSchedulingAllowed: false
      };
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
  assert.equal(evaluated.status, "ready_for_manual_runtime_config_enablement");
  assert.equal(evaluated.runtimeEnablementStatus, "ready_for_manual_runtime_config_enablement");
  assert.equal(evaluated.runtimeEnablementReadyForManualRuntimeConfigEnablement, true);
  assert.equal(evaluated.runtimeEnablementManualRuntimeConfigRequired, true);
  assert.equal(evaluated.runtimeEnablementRequestedGateCount, 1);
  assert.equal(evaluated.runtimeEnablementRequiredConfigKeyCount, 1);
  assert.equal(evaluated.runtimeEnablementLatestPreflightReportId, "lgarpf_ready_1");
  assert.equal(evaluated.runtimeEnablementLatestPreflightStatus, "ready_for_owner_release_activation");
  assert.equal(evaluated.runtimeEnablementRequiredActionCount, 1);
  assert.deepEqual(evaluated.runtimeEnablementNextAction, {
    key: "enable_runtime_config_manually",
    action: "perform_platform_runtime_config_enablement",
    requiredActor: "owner"
  });
  assert.equal(evaluated.runtimeEnablementConfigChangeApplied, false);

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

test("runtime enablement smoke script projects top-level operator readback", () => {
  const result = projectRuntimeEnablementSmokeReadback({
    ok: true,
    status: "ready_for_manual_runtime_config_enablement",
    runtimeConfigVerified: false,
    readyForManualRuntimeConfigEnablement: true,
    manualRuntimeConfigRequired: true,
    requestedActivationGates: ["writeful_execution", "background_scheduler"],
    requiredConfigKeys: ["automationWritefulExecutionEnabled", "automationBackgroundSchedulerEnabled"],
    latestPreflightReportId: "lgarpf_ready_1",
    latestPreflightStatus: "ready_for_owner_release_activation",
    latestPreflightReadyForProductionDeployReview: true,
    latestPreflightReadyForOwnerReleaseActivation: true,
    runtimeEnablement: {
      status: "ready_for_manual_runtime_config_enablement",
      runtimeConfigVerified: false,
      readyForManualRuntimeConfigEnablement: true,
      requiredActionCount: 1,
      nextAction: {
        key: "enable_runtime_config_manually",
        action: "perform_platform_runtime_config_enablement",
        requiredActor: "owner"
      },
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false
    },
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false
  });

  assert.equal(result.runtimeEnablementStatus, "ready_for_manual_runtime_config_enablement");
  assert.equal(result.runtimeEnablementConfigVerified, false);
  assert.equal(result.runtimeEnablementReadyForManualRuntimeConfigEnablement, true);
  assert.equal(result.runtimeEnablementManualRuntimeConfigRequired, true);
  assert.equal(result.runtimeEnablementRequestedGateCount, 2);
  assert.equal(result.runtimeEnablementRequiredConfigKeyCount, 2);
  assert.equal(result.runtimeEnablementLatestPreflightReportId, "lgarpf_ready_1");
  assert.equal(result.runtimeEnablementLatestPreflightStatus, "ready_for_owner_release_activation");
  assert.equal(result.runtimeEnablementLatestPreflightReadyForProductionDeployReview, true);
  assert.equal(result.runtimeEnablementLatestPreflightReadyForOwnerReleaseActivation, true);
  assert.equal(result.runtimeEnablementRequiredActionCount, 1);
  assert.equal(result.runtimeEnablementConfigChangeApplied, false);
  assert.equal(result.runtimeEnablementRuntimeConfigChange, false);
  assert.equal(result.runtimeEnablementRuntimeConfigMutationPerformed, false);
  assert.equal(result.runtimeEnablementWritefulSchedulingAllowed, false);
  assert.equal(result.runtimeEnablementBackgroundSchedulingAllowed, false);
  assert.equal(result.runtimeEnablementBackgroundWorkerAllowed, false);
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
    assert.equal(output.runtimeEnablementStatus, output.status);
    assert.equal(output.runtimeEnablementConfigVerified, output.runtimeConfigVerified === true);
    assert.equal(output.runtimeEnablementReadyForManualRuntimeConfigEnablement, output.readyForManualRuntimeConfigEnablement === true);
    assert.equal(output.runtimeEnablementRequestedGateCount, output.requestedActivationGates.length);
    assert.equal(output.runtimeEnablementRequiredConfigKeyCount, output.requiredConfigKeys.length);
    assert.equal(output.runtimeEnablementRequiredActionCount, output.runtimeEnablement.requiredActionCount);
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
    assert.equal(output.runtimeEnablementStatus, output.evaluated.status);
    assert.equal(output.runtimeEnablementLatestEnablementId, output.enablement.enablementId);
    assert.equal(output.runtimeEnablementLatestEnablementStatus, output.enablement.status);
    assert.equal(output.runtimeEnablementConfigChangeApplied, false);
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
    assert.equal(listed.runtimeEnablementCount, 1);
    assert.equal(listed.runtimeEnablementLatestEnablementId, output.enablement.enablementId);
    assert.equal(listed.runtimeEnablementLatestEnablementStatus, output.enablement.status);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
