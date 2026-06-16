const assert = require("node:assert/strict");
const test = require("node:test");
const {
  RELEASE_INVENTORY_SCHEMA,
  createLearningAutomationReleaseInventoryService
} = require("../src/services/learning-automation-release-inventory-service");

const ownerReviewStageSummary = {
  proposalCount: 6,
  acceptedProposalCount: 2,
  digestRequiredActionCount: 3,
  blockedActionHandoffCount: 1,
  publishedSchedulerExecutionCount: 2,
  completedSchedulerRunCount: 1,
  pendingWorkerTargetReviewCount: 1,
  passedGateCount: 7,
  missingGateCount: 2,
  requiredActionCount: 2,
  passedGateKeys: ["proposal_record_present", "digest_record_present"],
  missingGateKeys: ["digest_owner_review_present", "worker_target_review_present"],
  nextAction: {
    key: "worker_target_review_present",
    action: "review_scheduler_worker_target",
    requiredActor: "owner"
  },
  failurePolicyReady: true,
  failurePolicyStatus: "ready"
};

function createService(overrides = {}, calls = []) {
  return createLearningAutomationReleaseInventoryService(Object.assign({
    releaseReadinessService: {
      listSnapshots(input) {
        calls.push({ type: "snapshots", input });
        return {
          ok: true,
          count: 1,
          snapshots: [{
            readinessId: "lgar_ready_1",
            status: "ready_for_release_review",
            privacyClass: "summary_only",
            evidenceReadback: {
              schemaVersion: "growth.learningAutomationReleaseReadiness.evidenceReadback.v1",
              summaryOnly: true,
              evidenceCount: 27,
              presentCount: 26,
              missingCount: 1,
              presentEvidenceKeys: ["ownerDailyUiEvidence"],
              missingCheckKeys: ["central_visual_evidence"],
              sourceBundle: {
                bundleId: "bundle_inventory_1",
                status: "collected",
                taskCount: 8,
                passCount: 7
              },
              items: [{
                key: "ownerReviewEvidence",
                checkKey: "owner_review_evidence",
                evidencePresent: true,
                ownerReviewStageSummary
              }],
              writefulSchedulingAllowed: false,
              runtimeConfigChange: false,
              configChangeApplied: false
            },
            createdAt: "2026-06-16T11:00:00.000Z"
          }]
        };
      }
    },
    collectionRunService: {
      listRuns(input) {
        calls.push({ type: "collectionRuns", input });
        return {
          ok: true,
          count: 1,
          runs: [{
            runId: "lgacrn_1",
            status: "ready_for_release_review",
            privacyClass: "summary_only",
            createdAt: "2026-06-16T11:05:00.000Z"
          }]
        };
      }
    },
    decisionService: {
      listDecisions(input) {
        calls.push({ type: "decisions", input });
        return {
          ok: true,
          count: 1,
          decisions: [{
            decisionId: "lgard_1",
            collectionRunId: input.collectionRunId,
            status: "approved",
            privacyClass: "summary_only",
            decidedAt: "2026-06-16T11:10:00.000Z"
          }]
        };
      }
    },
    packageService: {
      listPackages(input) {
        calls.push({ type: "packages", input });
        return {
          ok: true,
          count: 1,
          packages: [{
            packageId: "lgapkg_1",
            collectionRunId: input.collectionRunId,
            status: "ready_for_release_review",
            privacyClass: "summary_only",
            packageSummary: {
              summaryOnly: true,
              collectionRunId: input.collectionRunId
            },
            stepSummary: {
              summaryOnly: true,
              stepCount: 6
            },
            releaseDashboardSummary: {
              schemaVersion: "growth.learningAutomationReleaseDashboard.summary.v1",
              summaryOnly: true,
              status: "manual_runtime_config_required",
              readinessStatus: "ready_for_release_review",
              controlsStatus: "manual_runtime_config_required",
              inventoryStatus: "manual_runtime_config_required",
              requiredActionCount: 1,
              ownerReviewStageSummary,
              latestReadinessOwnerReviewStageSummary: Object.assign({}, ownerReviewStageSummary, {
                proposalCount: 7
              }),
              nextAction: {
                key: "enable_runtime_config_manually",
                action: "perform_platform_runtime_config_enablement",
                requiredActor: "owner"
              },
              writefulSchedulingAllowed: false,
              runtimeConfigChange: false,
              configChangeApplied: false
            }
          }]
        };
      }
    },
    approvalService: {
      listApprovals(input) {
        calls.push({ type: "approvals", input });
        return {
          ok: true,
          count: 1,
          approvals: [{
            approvalId: "lgara_1",
            approvalKey: "writefulExecutionApproval",
            status: "approved",
            privacyClass: "summary_only",
            approvedAt: "2026-06-16T11:12:00.000Z"
          }]
        };
      }
    },
    releaseEvidenceService: {
      listEvidence(input) {
        calls.push({ type: "releaseEvidence", input });
        return {
          ok: true,
          count: 1,
          evidence: [{
            evidenceRecordId: "lgarev_1",
            evidenceKey: "ownerDailyUiEvidence",
            checkKey: "owner_daily_ui_evidence",
            status: "pass",
            privacyClass: "summary_only",
            observedAt: "2026-06-16T11:13:00.000Z"
          }]
        };
      }
    },
    releaseActivationService: {
      listActivations(input) {
        calls.push({ type: "activations", input });
        return {
          ok: true,
          count: 1,
          activations: [{
            activationId: "lgaract_1",
            collectionRunId: input.collectionRunId,
            status: "ready_for_owner_config_enablement",
            requestedActivationGates: ["writeful_execution"],
            privacyClass: "summary_only",
            recordedAt: "2026-06-16T11:15:00.000Z"
          }]
        };
      }
    },
    runtimeEnablementService: {
      listEnablements(input) {
        calls.push({ type: "runtimeEnablements", input });
        return {
          ok: true,
          count: 1,
          enablements: [{
            enablementId: "lgrten_1",
            collectionRunId: input.collectionRunId,
            status: "ready_for_manual_runtime_config_enablement",
            requestedActivationGates: ["writeful_execution"],
            privacyClass: "summary_only",
            recordedAt: "2026-06-16T11:20:00.000Z"
          }]
        };
      }
    },
    releaseControlsService: {
      summarize(input) {
        calls.push({ type: "controls", input });
        return {
          ok: true,
          schemaVersion: "growth.learningAutomationReleaseControls.v1",
          status: "manual_runtime_config_required",
          releaseControls: {
            summaryOnly: true,
            status: "manual_runtime_config_required",
            requiredActionCount: 1,
            nextAction: { key: "enable_runtime_config", action: "manual_config_change", requiredActor: "owner" },
            missingEvidenceKeys: []
          },
          writefulSchedulingAllowed: false,
          runtimeConfigChange: false,
          configChangeApplied: false
        };
      }
    }
  }, overrides));
}

test("release inventory composes bounded artifact readback through services", () => {
  const calls = [];
  const service = createService({}, calls);
  const result = service.inventory({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    collectionRunId: "lgacrn_1",
    activationGates: ["writeful_execution"],
    limit: 3
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, RELEASE_INVENTORY_SCHEMA);
  assert.equal(result.status, "manual_runtime_config_required");
  assert.equal(result.releaseInventory.artifactCount, 8);
  assert.equal(result.releaseInventory.latestReadinessSnapshotId, "lgar_ready_1");
  assert.equal(result.releaseInventory.latestReadinessEvidencePresentCount, 26);
  assert.equal(result.releaseInventory.latestReadinessEvidenceMissingCount, 1);
  assert.equal(result.releaseInventory.latestReadinessEvidenceSourceBundleId, "bundle_inventory_1");
  assert.equal(result.releaseInventory.latestReadinessOwnerReviewStageSummary.proposalCount, 6);
  assert.equal(result.releaseInventory.latestReadinessOwnerReviewStageSummary.digestRequiredActionCount, 3);
  assert.equal(result.releaseInventory.latestReadinessOwnerReviewStageSummary.failurePolicyReady, true);
  assert.equal(result.releaseInventory.latestCollectionRunId, "lgacrn_1");
  assert.equal(result.releaseInventory.latestPackageId, "lgapkg_1");
  assert.equal(result.releaseInventory.latestPackageStepCount, 6);
  assert.equal(result.releaseInventory.latestPackageDashboardStatus, "manual_runtime_config_required");
  assert.equal(result.releaseInventory.latestPackageDashboardNextActionKey, "enable_runtime_config_manually");
  assert.equal(result.releaseInventory.latestPackageDashboardRequiredActionCount, 1);
  assert.equal(result.releaseInventory.latestDecisionId, "lgard_1");
  assert.equal(result.releaseInventory.releaseEvidenceRecordCount, 1);
  assert.equal(result.releaseInventory.latestReleaseEvidenceRecordId, "lgarev_1");
  assert.equal(result.releaseInventory.latestReleaseEvidenceKey, "ownerDailyUiEvidence");
  assert.equal(result.releaseInventory.latestReleaseEvidenceCheckKey, "owner_daily_ui_evidence");
  assert.equal(result.releaseInventory.latestReleaseEvidenceStatus, "pass");
  assert.equal(result.releaseInventory.latestActivationId, "lgaract_1");
  assert.equal(result.releaseInventory.latestRuntimeEnablementId, "lgrten_1");
  assert.equal(result.releaseInventory.readbackKinds.includes("release_evidence"), true);
  assert.equal(result.artifactReadback.controls.status, "manual_runtime_config_required");
  assert.equal(result.artifactReadback.snapshots.latest.evidenceReadback.presentCount, 26);
  assert.equal(result.artifactReadback.snapshots.latest.evidenceReadback.missingCount, 1);
  assert.equal(result.artifactReadback.snapshots.latest.evidenceReadback.sourceBundleId, "bundle_inventory_1");
  assert.equal(result.artifactReadback.snapshots.latest.evidenceReadback.sourceBundleTaskCount, 8);
  assert.equal(result.artifactReadback.snapshots.latest.evidenceReadback.ownerReviewStageSummary.proposalCount, 6);
  assert.equal(result.artifactReadback.snapshots.latest.evidenceReadback.ownerReviewStageSummary.completedSchedulerRunCount, 1);
  assert.equal(result.artifactReadback.snapshots.latest.evidenceReadback.ownerReviewStageSummary.missingGateCount, 2);
  assert.deepEqual(result.artifactReadback.snapshots.latest.evidenceReadback.ownerReviewStageSummary.missingGateKeys, ["digest_owner_review_present", "worker_target_review_present"]);
  assert.equal(result.artifactReadback.snapshots.latest.evidenceReadback.ownerReviewStageSummary.nextAction.action, "review_scheduler_worker_target");
  assert.equal(result.artifactReadback.packages.latest.collectionRunId, "lgacrn_1");
  assert.equal(result.artifactReadback.packages.latest.latestPackageStepCount, 6);
  assert.equal(result.artifactReadback.packages.latest.latestPackageDashboardStatus, "manual_runtime_config_required");
  assert.equal(result.artifactReadback.packages.latest.latestPackageDashboardNextActionKey, "enable_runtime_config_manually");
  assert.equal(result.artifactReadback.packages.latest.releaseDashboardSummary.summaryOnly, true);
  assert.equal(result.artifactReadback.packages.latest.releaseDashboardSummary.ownerReviewStageSummary.proposalCount, 6);
  assert.equal(result.artifactReadback.packages.latest.releaseDashboardSummary.ownerReviewStageSummary.nextAction.key, "worker_target_review_present");
  assert.equal(result.artifactReadback.packages.latest.releaseDashboardSummary.latestReadinessOwnerReviewStageSummary.proposalCount, 7);
  assert.equal(result.artifactReadback.releaseEvidence.latest.id, "lgarev_1");
  assert.equal(result.artifactReadback.releaseEvidence.latest.evidenceKey, "ownerDailyUiEvidence");
  assert.equal(result.artifactReadback.releaseEvidence.latest.checkKey, "owner_daily_ui_evidence");
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.runtimeConfigChange, false);
  assert.deepEqual(calls.map((call) => call.type), [
    "controls",
    "snapshots",
    "collectionRuns",
    "decisions",
    "packages",
    "approvals",
    "releaseEvidence",
    "activations",
    "runtimeEnablements"
  ]);
  assert.equal(calls[0].input.limit, 3);
  assert.equal(calls[0].input.collectionRunId, "lgacrn_1");
});

test("release inventory fails closed when a required readback service is unavailable", () => {
  const service = createService({ packageService: null });
  const result = service.inventory({ workspaceId: "weixin_fanfan" });
  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.error, "learning_automation_release_inventory_packages_unavailable");
});

test("release inventory rejects privacy-risk input before dependency reads", () => {
  const calls = [];
  const service = createService({}, calls);
  const result = service.inventory({
    workspaceId: "weixin_fanfan",
    rawPrompt: "hidden model prompt"
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_automation_release_inventory_privacy_failed");
  assert.equal(calls.length, 0);
});

test("release inventory rejects private paths from dependency readback", () => {
  const service = createService({
    packageService: {
      listPackages() {
        return {
          ok: true,
          count: 1,
          packages: [{
            packageId: "lgapkg_leaky",
            status: "blocked",
            createdAt: "/Users/private/release-package.json"
          }]
        };
      }
    }
  });
  const result = service.inventory({ workspaceId: "weixin_fanfan" });
  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_automation_release_inventory_dependency_privacy_failed");
});
