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
  projectReleaseDashboardSmokeReadback,
  runOperation,
  validateInput
} = require("../scripts/smoke-growth-release-dashboard");

const repoRoot = path.join(__dirname, "..");

function runSmoke(scriptName, args, env = {}) {
  const stdout = childProcess.execFileSync(process.execPath, [
    path.join(repoRoot, "scripts", scriptName),
    ...args,
    "--json"
  ], {
    cwd: repoRoot,
    env: Object.assign({}, process.env, { NODE_NO_WARNINGS: "1" }, env),
    encoding: "utf8"
  });
  return JSON.parse(stdout);
}

function validOwnerDailyUiEvidence(source = "dashboard_smoke") {
  return {
    ok: true,
    source: "growth-learning-automation-ui-evidence-service",
    schemaVersion: "growth.learningAutomationUiEvidence.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    evidenceKey: "ownerDailyUiEvidence",
    checkKey: "owner_daily_ui_evidence",
    uiGate: "owner_daily",
    status: "pass",
    readyForReleaseEvidence: true,
    uiEvidence: {
      source,
      evidenceKey: "ownerDailyUiEvidence",
      checkKey: "owner_daily_ui_evidence",
      uiGate: "owner_daily",
      status: "pass",
      screenshotPresent: true,
      domEvidencePresent: false,
      screenshotArtifactName: "growth-owner-daily.png",
      coverage: ["owner_daily_generation", "daily_loop_preview", "target_context"],
      requiredCoverage: ["owner_daily_generation", "daily_loop_preview", "target_context"],
      missingCoverage: [],
      assertionCount: 1,
      failedAssertionCount: 0
    },
    missingRequired: []
  };
}

test("release dashboard smoke script parses bounded scope and release selectors", () => {
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

test("release dashboard smoke script requires workspace scope", () => {
  assert.deepEqual(validateInput({}), {
    ok: false,
    error: "release_dashboard_smoke_workspace_required"
  });
  assert.deepEqual(validateInput({ workspaceId: "fanfan" }), { ok: true });
});

test("release dashboard smoke script delegates only to service dashboard", () => {
  const calls = [];
  const service = {
    dashboard(input) {
      calls.push(input);
      return {
        ok: true,
        schemaVersion: "growth.learningAutomationReleaseDashboard.v1",
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
  assert.equal(result.releaseDashboardStatus, "manual_runtime_config_required");
  assert.deepEqual(calls[0].activationGates, ["writeful_execution"]);
});

test("release dashboard smoke script projects top-level operator readback", () => {
  const result = projectReleaseDashboardSmokeReadback({
    ok: true,
    status: "release_evidence_required",
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    releaseDashboard: {
      status: "release_evidence_required",
      readinessStatus: "incomplete",
      controlsStatus: "release_evidence_required",
      inventoryStatus: "records_missing",
      requiredActionCount: 5,
      nextAction: {
        key: "owner_daily_ui_evidence",
        action: "complete_owner_daily_ui_visual_validation",
        requiredActor: "owner"
      },
      missingCheckKeys: ["owner_daily_ui_evidence"],
      blockedCheckKeys: ["release_decision"],
      missingEvidenceKeys: ["ownerDailyUiEvidence"],
      missingApprovalKeys: ["writefulExecutionApproval"],
      missingRecordKinds: ["release_package"],
      blockedRecordKinds: ["runtime_enablement"],
      readinessEvidencePresentCount: 2,
      readinessEvidenceMissingCount: 31,
      latestCollectionRunId: "lgacrn_1",
      latestPackageId: "lgarpkg_1",
      latestPackageDashboardStatus: "manual_runtime_config_required",
      latestPreflightReportId: "lgarpf_1",
      latestPreflightStatus: "blocked",
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false
    }
  });

  assert.equal(result.releaseDashboardStatus, "release_evidence_required");
  assert.equal(result.releaseDashboardReadinessStatus, "incomplete");
  assert.equal(result.releaseDashboardControlsStatus, "release_evidence_required");
  assert.equal(result.releaseDashboardInventoryStatus, "records_missing");
  assert.equal(result.releaseDashboardRequiredActionCount, 5);
  assert.equal(result.releaseDashboardNextAction.key, "owner_daily_ui_evidence");
  assert.equal(result.releaseDashboardMissingCheckCount, 1);
  assert.equal(result.releaseDashboardBlockedCheckCount, 1);
  assert.equal(result.releaseDashboardMissingEvidenceCount, 1);
  assert.equal(result.releaseDashboardMissingApprovalCount, 1);
  assert.equal(result.releaseDashboardMissingRecordKindCount, 1);
  assert.equal(result.releaseDashboardBlockedRecordKindCount, 1);
  assert.equal(result.releaseDashboardReadinessEvidencePresentCount, 2);
  assert.equal(result.releaseDashboardReadinessEvidenceMissingCount, 31);
  assert.equal(result.releaseDashboardLatestCollectionRunId, "lgacrn_1");
  assert.equal(result.releaseDashboardLatestPackageId, "lgarpkg_1");
  assert.equal(result.releaseDashboardLatestPackageDashboardStatus, "manual_runtime_config_required");
  assert.equal(result.releaseDashboardLatestPreflightReportId, "lgarpf_1");
  assert.equal(result.releaseDashboardLatestPreflightStatus, "blocked");
  assert.equal(result.releaseDashboardWritefulSchedulingAllowed, false);
  assert.equal(result.releaseDashboardRuntimeConfigChange, false);
  assert.equal(result.releaseDashboardRuntimeConfigMutationPerformed, false);
});

test("release dashboard smoke script runs no-write read model against a temporary SQLite db", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-dashboard-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-release-dashboard.js"),
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
    assert.equal(output.operation, "dashboard");
    assert.equal(output.ok, true);
    assert.equal(output.schemaVersion, "growth.learningAutomationReleaseDashboard.v1");
    assert.equal(output.status, "release_evidence_required");
    assert.equal(output.releaseDashboard.summaryOnly, true);
    assert.equal(output.releaseDashboard.status, "release_evidence_required");
    assert.equal(output.releaseDashboardStatus, output.releaseDashboard.status);
    assert.equal(output.releaseDashboardReadinessStatus, output.releaseDashboard.readinessStatus);
    assert.equal(output.releaseDashboardControlsStatus, output.releaseDashboard.controlsStatus);
    assert.equal(output.releaseDashboardInventoryStatus, output.releaseDashboard.inventoryStatus);
    assert.equal(output.releaseDashboardRequiredActionCount, output.releaseDashboard.requiredActionCount);
    assert.equal(output.releaseDashboardNextAction.key, output.releaseDashboard.nextAction.key);
    assert.equal(output.releaseDashboardMissingCheckCount, output.releaseDashboard.missingCheckKeys.length);
    assert.equal(output.releaseDashboardBlockedCheckCount, output.releaseDashboard.blockedCheckKeys.length);
    assert.equal(output.releaseDashboardMissingEvidenceCount, output.releaseDashboard.missingEvidenceKeys.length);
    assert.equal(output.releaseDashboardMissingApprovalCount, output.releaseDashboard.missingApprovalKeys.length);
    assert.equal(output.releaseDashboardMissingRecordKindCount, output.releaseDashboard.missingRecordKinds.length);
    assert.equal(output.releaseDashboardBlockedRecordKindCount, output.releaseDashboard.blockedRecordKinds.length);
    assert.equal(output.releaseDashboard.readinessEvidencePresentCount, 0);
    assert.equal(output.releaseDashboard.readinessEvidenceMissingCount, 35);
    assert.equal(
      output.releaseDashboardReadinessEvidencePresentCount,
      output.releaseDashboard.readinessEvidencePresentCount
    );
    assert.equal(
      output.releaseDashboardReadinessEvidenceMissingCount,
      output.releaseDashboard.readinessEvidenceMissingCount
    );
    assert.equal(output.releaseReadiness.evidenceReadback.summaryOnly, true);
    assert.equal(output.releaseReadiness.evidenceReadback.missingCheckKeys.includes("owner_daily_ui_evidence"), true);
    assert.equal(output.releaseReadiness.evidenceReadback.missingCheckKeys.includes("owner_review_evidence"), true);
    assert.equal(output.releaseInventory.summaryOnly, true);
    assert.equal(output.releaseInventory.releaseEvidenceRecordCount, 0);
    assert.equal(output.artifactReadback.summaryOnly, true);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.releaseDashboardWritefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);
    assert.equal(output.releaseDashboardRuntimeConfigChange, false);
    assert.equal(output.configChangeApplied, false);
    assert.equal(output.runtimeConfigMutationPerformed, false);
    assert.equal(output.releaseDashboardRuntimeConfigMutationPerformed, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("release dashboard smoke script reads persisted readiness snapshot evidence from SQLite", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-dashboard-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const env = {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    };
    const readiness = runSmoke("smoke-growth-release-readiness.js", [
      "--workspace-id", "fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--domain-pack-id", "uk_hk_curriculum_foundation",
      "--domain", "science",
      "--subject", "science",
      "--evidence-json", JSON.stringify({
        ownerReviewEvidence: {
          ok: true,
          summaryOnly: true,
          summary: {
            proposalCount: 4,
            acceptedProposalCount: 1,
            digestRequiredActionCount: 2,
            blockedActionHandoffCount: 1,
            publishedSchedulerExecutionCount: 1,
            completedSchedulerRunCount: 1,
            pendingWorkerTargetReviewCount: 1,
            failurePolicyReady: true,
            failurePolicyStatus: "ready"
          }
        }
      }),
      "--write-snapshot",
      "--created-by", "weixin_owner",
      "--created-at", "2026-06-15T18:10:00.000Z"
    ], env);
    const releaseEvidence = runSmoke("smoke-growth-automation-release-evidence.js", [
      "--operation", "record",
      "--allow-write",
      "--workspace-id", "fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--domain-pack-id", "uk_hk_curriculum_foundation",
      "--domain", "science",
      "--subject", "science",
      "--evidence-key", "owner_daily_ui_evidence",
      "--evidence-json", JSON.stringify(validOwnerDailyUiEvidence("dashboard_smoke")),
      "--recorded-by", "weixin_owner",
      "--observed-at", "2026-06-15T18:15:00.000Z"
    ], env);
    const output = runSmoke("smoke-growth-release-dashboard.js", [
      "--workspace-id", "fanfan",
      "--learner-id", "fanfan",
      "--domain", "science",
      "--subject", "science"
    ], env);

    assert.equal(readiness.snapshot.evidenceReadback.summaryOnly, true);
    assert.equal(output.operation, "dashboard");
    assert.equal(output.releaseDashboard.latestReadinessSnapshotId, readiness.snapshot.readinessId);
    assert.equal(output.releaseDashboard.latestReadinessEvidencePresentCount, 1);
    assert.equal(output.releaseDashboard.latestReadinessEvidenceMissingCount, 34);
    assert.equal(output.releaseDashboard.latestReadinessOwnerReviewStageSummary.proposalCount, 4);
    assert.equal(output.releaseDashboard.latestReadinessOwnerReviewStageSummary.digestRequiredActionCount, 2);
    assert.equal(output.releaseDashboard.latestReadinessOwnerReviewStageSummary.failurePolicyStatus, "ready");
    assert.equal(output.releaseDashboard.releaseEvidenceRecordCount, 1);
    assert.equal(output.releaseDashboard.latestReleaseEvidenceRecordId, releaseEvidence.evidence.evidenceRecordId);
    assert.equal(output.releaseDashboard.latestReleaseEvidenceKey, "ownerDailyUiEvidence");
    assert.equal(output.releaseDashboard.latestReleaseEvidenceCheckKey, "owner_daily_ui_evidence");
    assert.equal(output.releaseDashboard.latestReleaseEvidenceStatus, "pass");
    assert.equal(output.releaseInventory.latestReleaseEvidenceRecordId, releaseEvidence.evidence.evidenceRecordId);
    assert.equal(output.artifactReadback.snapshots.latestId, readiness.snapshot.readinessId);
    assert.equal(output.artifactReadback.snapshots.latestEvidenceReadbackMissingCount, 34);
    assert.equal(output.artifactReadback.releaseEvidence.latestId, releaseEvidence.evidence.evidenceRecordId);
    assert.equal(output.artifactReadback.releaseEvidence.latestEvidenceKey, "ownerDailyUiEvidence");
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigMutationPerformed, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
