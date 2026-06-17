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
  projectReleaseControlsSmokeReadback,
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
  assert.equal(result.releaseControlsStatus, "activation_record_required");
  assert.deepEqual(calls[0].activationGates, ["writeful_execution"]);
});

test("release controls smoke script projects top-level operator readback", () => {
  const result = projectReleaseControlsSmokeReadback({
    ok: true,
    status: "release_evidence_required",
    writefulSchedulingAllowed: false,
    runtimeConfigMutationPerformed: false,
    auditReadback: {
      activationRecords: { status: "records_missing" },
      runtimeEnablementRecords: { status: "records_missing" }
    },
    releaseControls: {
      status: "release_evidence_required",
      requiredActionCount: 4,
      nextAction: {
        key: "owner_daily_ui_evidence",
        action: "complete_owner_daily_ui_visual_validation",
        requiredActor: "owner",
        approvalKey: ""
      },
      missingCheckKeys: ["owner_daily_ui_evidence", "central_visual_evidence"],
      blockedCheckKeys: ["release_workbench_smoke_evidence"],
      missingEvidenceKeys: ["ownerDailyUiEvidence"],
      missingApprovalKeys: ["writefulExecutionApproval"],
      writefulSchedulingAllowed: false,
      runtimeConfigMutationPerformed: false
    }
  });

  assert.equal(result.releaseControlsStatus, "release_evidence_required");
  assert.equal(result.releaseControlsRequiredActionCount, 4);
  assert.equal(result.releaseControlsNextAction.key, "owner_daily_ui_evidence");
  assert.equal(result.releaseControlsNextAction.action, "complete_owner_daily_ui_visual_validation");
  assert.equal(result.releaseControlsMissingCheckCount, 2);
  assert.equal(result.releaseControlsBlockedCheckCount, 1);
  assert.equal(result.releaseControlsMissingEvidenceCount, 1);
  assert.equal(result.releaseControlsMissingApprovalCount, 1);
  assert.equal(result.releaseControlsActivationRecordsStatus, "records_missing");
  assert.equal(result.releaseControlsRuntimeEnablementRecordsStatus, "records_missing");
  assert.equal(result.releaseControlsWritefulSchedulingAllowed, false);
  assert.equal(result.releaseControlsRuntimeConfigMutationPerformed, false);
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
    assert.equal(output.releaseControlsStatus, output.releaseControls.status);
    assert.equal(output.releaseControlsRequiredActionCount, output.releaseControls.requiredActionCount);
    assert.equal(output.releaseControlsNextAction.key, output.releaseControls.nextAction.key);
    assert.equal(output.releaseControlsMissingCheckCount, output.releaseControls.missingCheckKeys.length);
    assert.equal(output.releaseControlsBlockedCheckCount, output.releaseControls.blockedCheckKeys.length);
    assert.equal(output.releaseControlsMissingEvidenceCount, output.releaseControls.missingEvidenceKeys.length);
    assert.equal(output.releaseControlsMissingApprovalCount, output.releaseControls.missingApprovalKeys.length);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.releaseControlsWritefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);
    assert.equal(output.configChangeApplied, false);
    assert.equal(output.runtimeConfigMutationPerformed, false);
    assert.equal(output.releaseControlsRuntimeConfigMutationPerformed, false);
    assert.equal(output.releaseControls.summaryOnly, true);
    assert.equal(output.steps[0].evidenceReadback.summaryOnly, true);
    assert.equal(output.steps[0].evidenceReadback.presentCount, 0);
    assert.equal(output.steps[0].evidenceReadback.missingCount, 36);
    assert.equal(output.steps[0].evidenceReadback.missingCheckKeys.includes("owner_daily_ui_evidence"), true);
    assert.equal(output.steps[0].evidenceReadback.missingCheckKeys.includes("production_deployment_health"), true);
    assert.equal(output.steps[0].evidenceReadback.missingCheckKeys.includes("owner_review_evidence"), true);
    assert.equal(output.auditReadback.summaryOnly, true);
    assert.equal(output.auditReadback.activationRecords.status, "records_missing");
    assert.equal(output.auditReadback.runtimeEnablementRecords.status, "records_missing");
    assert.equal(output.releaseControlsActivationRecordsStatus, "records_missing");
    assert.equal(output.releaseControlsRuntimeEnablementRecordsStatus, "records_missing");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
