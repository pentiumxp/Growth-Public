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
  projectReleasePreflightSmokeReadback,
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
      return {
        ok: true,
        status: "blocked",
        releasePreflight: {
          status: "blocked",
          requiredActionCount: 2,
          nextAction: {
            key: "resolve_release_blocker",
            action: "resolve_or_record_blocked_release_decision",
            requiredActor: "owner"
          },
          missingCheckKeys: ["owner_daily_ui_evidence"],
          writefulSchedulingAllowed: false,
          runtimeConfigChange: false,
          runtimeConfigMutationPerformed: false
        }
      };
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

  const evaluated = runOperation(service, { operation: "evaluate", workspaceId: "fanfan" });
  assert.equal(evaluated.ok, true);
  assert.equal(evaluated.releasePreflightStatus, "blocked");
  assert.equal(evaluated.releasePreflightRequiredActionCount, 2);
  assert.equal(evaluated.releasePreflightMissingCheckCount, 1);
  assert.deepEqual(evaluated.releasePreflightNextAction, {
    key: "resolve_release_blocker",
    action: "resolve_or_record_blocked_release_decision",
    requiredActor: "owner"
  });
  assert.equal(runOperation(service, { operation: "list", workspaceId: "fanfan" }).ok, true);
  assert.equal(runOperation(service, { operation: "record", workspaceId: "fanfan", allowWritePreflight: true }).ok, true);
  assert.deepEqual(calls.map((call) => call[0]), ["evaluate", "list", "record"]);
  assert.equal(calls[2][1].operation, undefined);
  assert.equal(calls[2][1].allowWritePreflight, true);
});

test("release preflight smoke script projects nested service summary into top-level operator fields", () => {
  const output = projectReleasePreflightSmokeReadback({
    ok: true,
    status: "ready_for_owner_release_activation",
    releasePreflight: {
      status: "ready_for_owner_release_activation",
      requiredActionCount: 3,
      nextAction: {
        key: "record_release_activation",
        action: "record_owner_release_activation",
        requiredActor: "owner"
      },
      missingCheckKeys: ["central_visual_evidence"],
      blockedCheckKeys: ["scheduler_worker_target"],
      missingEvidenceKeys: ["release_package_review_ui_evidence"],
      missingApprovalKeys: ["writefulExecutionApproval"],
      missingRecordKinds: ["release_activation"],
      blockedRecordKinds: ["runtime_enablement"],
      readyForProductionDeploy: false,
      readyForProductionDeployReview: true,
      readyForOwnerReleaseActivation: true,
      backendEvidenceComplete: true,
      latestCollectionRunId: "lgacrn_ready_1",
      latestDecisionId: "lgardec_ready_1",
      latestPackageId: "lgarpkg_ready_1",
      readinessEvidencePresentCount: 9,
      readinessEvidenceMissingCount: 1,
      ownerActionCount: 4,
      productionClosureGateSummary: {
        status: "external_or_runtime_gates_pending",
        gateCount: 6,
        pendingGateCount: 2,
        nextExternalAction: {
          key: "runtime_enablement_readback",
          action: "record_runtime_enablement_after_manual_config",
          requiredActor: "owner"
        },
        deploymentEvidenceRequired: true,
        platformEvidenceRequired: true
      },
      productionClosureGateCount: 6,
      productionClosurePendingGateCount: 2,
      deploymentEvidenceRequired: true,
      platformEvidenceRequired: true,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false
    },
    report: {
      preflightReportId: "lgarpf_ready_1",
      status: "ready_for_owner_release_activation"
    }
  });

  assert.equal(output.releasePreflightStatus, "ready_for_owner_release_activation");
  assert.equal(output.releasePreflightRequiredActionCount, 3);
  assert.equal(output.releasePreflightMissingCheckCount, 1);
  assert.equal(output.releasePreflightBlockedCheckCount, 1);
  assert.equal(output.releasePreflightMissingEvidenceCount, 1);
  assert.equal(output.releasePreflightMissingApprovalCount, 1);
  assert.equal(output.releasePreflightMissingRecordKindCount, 1);
  assert.equal(output.releasePreflightBlockedRecordKindCount, 1);
  assert.equal(output.releasePreflightReadyForProductionDeploy, false);
  assert.equal(output.releasePreflightReadyForProductionDeployReview, true);
  assert.equal(output.releasePreflightReadyForOwnerReleaseActivation, true);
  assert.equal(output.releasePreflightBackendEvidenceComplete, true);
  assert.equal(output.releasePreflightLatestCollectionRunId, "lgacrn_ready_1");
  assert.equal(output.releasePreflightLatestDecisionId, "lgardec_ready_1");
  assert.equal(output.releasePreflightLatestPackageId, "lgarpkg_ready_1");
  assert.equal(output.releasePreflightReportId, "lgarpf_ready_1");
  assert.equal(output.releasePreflightReportStatus, "ready_for_owner_release_activation");
  assert.equal(output.releasePreflightReadinessEvidencePresentCount, 9);
  assert.equal(output.releasePreflightReadinessEvidenceMissingCount, 1);
  assert.equal(output.releasePreflightOwnerActionCount, 4);
  assert.equal(output.releasePreflightProductionClosureGateStatus, "external_or_runtime_gates_pending");
  assert.equal(output.releasePreflightProductionClosureGateCount, 6);
  assert.equal(output.releasePreflightProductionClosurePendingGateCount, 2);
  assert.deepEqual(output.releasePreflightProductionClosureNextExternalAction, {
    key: "runtime_enablement_readback",
    action: "record_runtime_enablement_after_manual_config",
    requiredActor: "owner"
  });
  assert.equal(output.releasePreflightDeploymentEvidenceRequired, true);
  assert.equal(output.releasePreflightPlatformEvidenceRequired, true);
  assert.equal(output.releasePreflightWritefulSchedulingAllowed, false);
  assert.equal(output.releasePreflightRuntimeConfigChange, false);
  assert.equal(output.releasePreflightRuntimeConfigMutationPerformed, false);
  assert.equal(output.releasePreflightBackgroundSchedulingAllowed, false);
  assert.equal(output.releasePreflightBackgroundWorkerAllowed, false);
  assert.deepEqual(output.releasePreflightNextAction, {
    key: "record_release_activation",
    action: "record_owner_release_activation",
    requiredActor: "owner"
  });
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
    assert.equal(output.releasePreflightStatus, output.releasePreflight.status);
    assert.equal(output.releasePreflightRequiredActionCount, output.releasePreflight.requiredActionCount);
    assert.equal(output.releasePreflightMissingCheckCount, output.releasePreflight.missingCheckKeys.length);
    assert.equal(output.releasePreflightMissingEvidenceCount, output.releasePreflight.missingEvidenceKeys.length);
    assert.equal(output.releasePreflightMissingApprovalCount, output.releasePreflight.missingApprovalKeys.length);
    assert.equal(output.releasePreflightReadyForProductionDeploy, false);
    assert.equal(output.releasePreflightReadyForProductionDeployReview, output.releasePreflight.readyForProductionDeployReview);
    assert.equal(output.releasePreflightReadyForOwnerReleaseActivation, output.releasePreflight.readyForOwnerReleaseActivation);
    assert.equal(output.releasePreflightBackendEvidenceComplete, output.releasePreflight.backendEvidenceComplete);
    assert.equal(output.releasePreflightProductionClosureGateCount, output.releasePreflight.productionClosureGateCount);
    assert.equal(output.releasePreflightProductionClosurePendingGateCount, output.releasePreflight.productionClosurePendingGateCount);
    assert.equal(output.releasePreflightDeploymentEvidenceRequired, true);
    assert.equal(output.releasePreflight.productionClosureGates.some((gate) => gate.key === "production_deployment_health"), true);
    assert.equal(output.releasePreflightWritefulSchedulingAllowed, false);
    assert.equal(output.releasePreflightRuntimeConfigChange, false);
    assert.equal(output.releasePreflightRuntimeConfigMutationPerformed, false);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);
    assert.equal(output.configChangeApplied, false);
    assert.equal(output.runtimeConfigMutationPerformed, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
