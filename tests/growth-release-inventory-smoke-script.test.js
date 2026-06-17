const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const {
  inputFromArgs,
  projectReleaseInventorySmokeReadback,
  runOperation,
  validateInput
} = require("../scripts/smoke-growth-release-inventory");

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

function validOwnerDailyUiEvidence(source = "inventory_smoke") {
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

test("release inventory smoke script parses scope, gates, and evidence flags", () => {
  const input = inputFromArgs([
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--collection-run-id", "lgacrn_1",
    "--activation-gates", "writeful_execution,background_scheduler",
    "--required-approval-key", "writefulExecutionApproval",
    "--runtime-enablement-record-limit", "7",
    "--automation-digest-ui-evidence", "true",
    "--json"
  ]);
  assert.equal(input.workspaceId, "weixin_fanfan");
  assert.equal(input.learnerId, "fanfan");
  assert.equal(input.collectionRunId, "lgacrn_1");
  assert.deepEqual(input.activationGates, ["writeful_execution", "background_scheduler"]);
  assert.deepEqual(input.requiredApprovalKeys, ["writefulExecutionApproval"]);
  assert.equal(input.runtimeEnablementRecordLimit, 7);
  assert.equal(input.automationDigestUiEvidence, true);
});

test("release inventory smoke script requires workspace", () => {
  const result = validateInput(inputFromArgs([]));
  assert.equal(result.ok, false);
  assert.equal(result.error, "release_inventory_smoke_workspace_required");
});

test("release inventory smoke script delegates to inventory service only", () => {
  const calls = [];
  const result = runOperation({
    inventory(input) {
      calls.push(input);
      return {
        ok: true,
        schemaVersion: "growth.learningAutomationReleaseInventory.v1",
        status: "records_available",
        releaseInventory: { summaryOnly: true }
      };
    }
  }, {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    limit: 5
  });
  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, "growth.learningAutomationReleaseInventory.v1");
  assert.equal(result.releaseInventoryStatus, "records_available");
  assert.deepEqual(calls, [{ workspaceId: "weixin_fanfan", learnerId: "fanfan", limit: 5 }]);
});

test("release inventory smoke script projects top-level operator readback", () => {
  const result = projectReleaseInventorySmokeReadback({
    ok: true,
    status: "release_evidence_required",
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    releaseInventory: {
      status: "release_evidence_required",
      artifactCount: 3,
      readbackKinds: ["release_readiness_snapshot", "release_collection_run"],
      missingRecordKinds: ["release_package"],
      blockedRecordKinds: ["runtime_enablement"],
      latestCollectionRunId: "lgacrn_1",
      latestReadinessSnapshotId: "lgarr_1",
      latestPackageId: "lgarpkg_1",
      latestPackageDashboardStatus: "manual_runtime_config_required",
      latestReleaseEvidenceRecordId: "lgarev_1",
      latestReleaseEvidenceKey: "centralVisualEvidence",
      latestReleaseEvidenceStatus: "pass",
      latestPreflightReportId: "lgarpf_1",
      latestPreflightStatus: "blocked",
      controlsStatus: "release_evidence_required",
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false
    }
  });

  assert.equal(result.releaseInventoryStatus, "release_evidence_required");
  assert.equal(result.releaseInventoryArtifactCount, 3);
  assert.equal(result.releaseInventoryReadbackKindCount, 2);
  assert.equal(result.releaseInventoryMissingRecordKindCount, 1);
  assert.equal(result.releaseInventoryBlockedRecordKindCount, 1);
  assert.equal(result.releaseInventoryLatestCollectionRunId, "lgacrn_1");
  assert.equal(result.releaseInventoryLatestReadinessSnapshotId, "lgarr_1");
  assert.equal(result.releaseInventoryLatestPackageId, "lgarpkg_1");
  assert.equal(result.releaseInventoryLatestPackageDashboardStatus, "manual_runtime_config_required");
  assert.equal(result.releaseInventoryLatestReleaseEvidenceRecordId, "lgarev_1");
  assert.equal(result.releaseInventoryLatestReleaseEvidenceKey, "centralVisualEvidence");
  assert.equal(result.releaseInventoryLatestReleaseEvidenceStatus, "pass");
  assert.equal(result.releaseInventoryLatestPreflightReportId, "lgarpf_1");
  assert.equal(result.releaseInventoryLatestPreflightStatus, "blocked");
  assert.equal(result.releaseInventoryControlsStatus, "release_evidence_required");
  assert.equal(result.releaseInventoryWritefulSchedulingAllowed, false);
  assert.equal(result.releaseInventoryRuntimeConfigChange, false);
  assert.equal(result.releaseInventoryRuntimeConfigMutationPerformed, false);
});

test("release inventory smoke script reads persisted readiness snapshot evidence from SQLite", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-inventory-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const env = {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    };
    const readiness = runSmoke("smoke-growth-release-readiness.js", [
      "--workspace-id", "weixin_fanfan",
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
            proposalCount: 5,
            acceptedProposalCount: 2,
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
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--domain-pack-id", "uk_hk_curriculum_foundation",
      "--domain", "science",
      "--subject", "science",
      "--evidence-key", "owner_daily_ui_evidence",
      "--evidence-json", JSON.stringify(validOwnerDailyUiEvidence("inventory_smoke")),
      "--recorded-by", "weixin_owner",
      "--observed-at", "2026-06-15T18:15:00.000Z"
    ], env);
    const output = runSmoke("smoke-growth-release-inventory.js", [
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--domain", "science",
      "--subject", "science"
    ], env);

    assert.equal(readiness.snapshot.evidenceReadback.summaryOnly, true);
    assert.equal(releaseEvidence.evidence.evidenceKey, "ownerDailyUiEvidence");
    assert.equal(output.operation, "inventory");
    assert.equal(output.ok, true);
    assert.equal(output.releaseInventoryStatus, output.releaseInventory.status);
    assert.equal(output.releaseInventoryArtifactCount, output.releaseInventory.artifactCount);
    assert.equal(output.releaseInventoryReadbackKindCount, output.releaseInventory.readbackKinds.length);
    assert.equal(output.releaseInventoryMissingRecordKindCount, output.releaseInventory.missingRecordKinds.length);
    assert.equal(output.releaseInventoryBlockedRecordKindCount, output.releaseInventory.blockedRecordKinds.length);
    assert.equal(output.releaseInventory.latestReadinessSnapshotId, readiness.snapshot.readinessId);
    assert.equal(output.releaseInventoryLatestReadinessSnapshotId, output.releaseInventory.latestReadinessSnapshotId);
    assert.equal(output.releaseInventory.latestReadinessEvidencePresentCount, 1);
    assert.equal(output.releaseInventory.latestReadinessEvidenceMissingCount, 32);
    assert.equal(output.releaseInventory.latestReadinessOwnerReviewStageSummary.proposalCount, 5);
    assert.equal(output.releaseInventory.latestReadinessOwnerReviewStageSummary.acceptedProposalCount, 2);
    assert.equal(output.releaseInventory.latestReadinessOwnerReviewStageSummary.failurePolicyStatus, "ready");
    assert.equal(output.releaseInventory.releaseEvidenceRecordCount, 1);
    assert.equal(output.releaseInventory.latestReleaseEvidenceRecordId, releaseEvidence.evidence.evidenceRecordId);
    assert.equal(
      output.releaseInventoryLatestReleaseEvidenceRecordId,
      output.releaseInventory.latestReleaseEvidenceRecordId
    );
    assert.equal(output.releaseInventory.latestReleaseEvidenceKey, "ownerDailyUiEvidence");
    assert.equal(output.releaseInventoryLatestReleaseEvidenceKey, output.releaseInventory.latestReleaseEvidenceKey);
    assert.equal(output.releaseInventory.latestReleaseEvidenceCheckKey, "owner_daily_ui_evidence");
    assert.equal(output.releaseInventory.latestReleaseEvidenceStatus, "pass");
    assert.equal(output.releaseInventoryLatestReleaseEvidenceStatus, output.releaseInventory.latestReleaseEvidenceStatus);
    assert.equal(output.artifactReadback.snapshots.latest.id, readiness.snapshot.readinessId);
    assert.equal(output.artifactReadback.snapshots.latest.evidenceReadback.summaryOnly, true);
    assert.equal(output.artifactReadback.snapshots.latest.evidenceReadback.missingCount, 32);
    assert.equal(output.artifactReadback.snapshots.latest.evidenceReadback.missingCheckKeys.includes("owner_review_evidence"), false);
    assert.equal(output.artifactReadback.snapshots.latest.evidenceReadback.ownerReviewStageSummary.digestRequiredActionCount, 2);
    assert.equal(output.artifactReadback.releaseEvidence.latest.id, releaseEvidence.evidence.evidenceRecordId);
    assert.equal(output.artifactReadback.releaseEvidence.latest.evidenceKey, "ownerDailyUiEvidence");
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigMutationPerformed, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
