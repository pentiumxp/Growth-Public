const assert = require("node:assert/strict");
const test = require("node:test");
const {
  RELEASE_DASHBOARD_SCHEMA,
  createLearningAutomationReleaseDashboardService
} = require("../src/services/learning-automation-release-dashboard-service");

const ownerReviewStageSummary = {
  proposalCount: 4,
  acceptedProposalCount: 1,
  proposedProposalCount: 1,
  digestRequiredActionCount: 2,
  blockedActionHandoffCount: 1,
  publishedSchedulerExecutionCount: 1,
  completedSchedulerRunCount: 1,
  pendingWorkerTargetReviewCount: 1,
  passedGateCount: 6,
  missingGateCount: 3,
  requiredActionCount: 3,
  passedGateKeys: ["proposal_record_present", "digest_record_present"],
  missingGateKeys: ["digest_owner_review_present", "action_handoff_delivered"],
  nextAction: {
    key: "action_handoff_delivered",
    action: "deliver_action_handoff",
    requiredActor: "owner"
  },
  failurePolicyReady: true,
  failurePolicyStatus: "ready"
};

function createService(overrides = {}, calls = []) {
  return createLearningAutomationReleaseDashboardService(Object.assign({
    releaseReadinessService: {
      evaluateReadiness(input) {
        calls.push({ type: "readiness", input });
        return {
          ok: true,
          schemaVersion: "growth.learningAutomationReleaseReadiness.v1",
          status: "incomplete",
          readyForReleaseReview: false,
          releaseReview: {
            summaryOnly: true,
            status: "incomplete",
            requiredActionCount: 2,
            missingCheckKeys: ["central_visual_evidence"],
            missingEvidenceKeys: ["central_visual_evidence"],
            persistedApprovalKeys: ["writefulExecutionApproval"],
            persistedEvidenceKeys: ["ownerDailyUiEvidence"],
            nextAction: {
              key: "central_visual_evidence",
              action: "run_central_visual_harness",
              requiredActor: "owner"
            }
          },
          evidenceReadback: {
            schemaVersion: "growth.learningAutomationReleaseReadiness.evidenceReadback.v1",
            summaryOnly: true,
            evidenceCount: 27,
            presentCount: 21,
            missingCount: 6,
            presentEvidenceKeys: ["ownerDailyUiEvidence"],
            missingCheckKeys: ["central_visual_evidence"],
            sourceBundle: {
              bundleId: "bundle_dashboard_current",
              status: "collected",
              taskCount: 8,
              passCount: 6
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
          writefulSchedulingAllowed: false,
          runtimeConfigChange: false,
          configChangeApplied: false
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
            missingCheckKeys: ["runtime_enablement"],
            missingEvidenceKeys: [],
            missingApprovalKeys: [],
            nextAction: {
              key: "enable_runtime_config",
              action: "manual_config_change",
              requiredActor: "owner"
            },
            auditReadback: { summaryOnly: true, status: "ready" }
          },
          configChangeApplied: false,
          runtimeConfigChange: false,
          runtimeConfigMutationPerformed: false,
          writefulSchedulingAllowed: false
        };
      }
    },
    releaseInventoryService: {
      inventory(input) {
        calls.push({ type: "inventory", input });
        return {
          ok: true,
          schemaVersion: "growth.learningAutomationReleaseInventory.v1",
          status: "manual_runtime_config_required",
          releaseInventory: {
            summaryOnly: true,
            status: "manual_runtime_config_required",
            artifactCount: 8,
            readbackKinds: ["release_collection_run", "release_package", "release_evidence", "runtime_enablement"],
            missingRecordKinds: ["runtime_enablement"],
            blockedRecordKinds: [],
            latestReadinessSnapshotId: "lgarsnap_1",
            latestReadinessEvidencePresentCount: 26,
            latestReadinessEvidenceMissingCount: 1,
            latestReadinessEvidenceSourceBundleId: "bundle_dashboard_snapshot",
            latestReadinessOwnerReviewStageSummary: Object.assign({}, ownerReviewStageSummary, {
              proposalCount: 5,
              acceptedProposalCount: 2
            }),
            latestCollectionRunId: input.collectionRunId,
            latestPackageId: "lgapkg_1",
            latestPackageStepCount: 6,
            latestPackageDashboardStatus: "manual_runtime_config_required",
            latestPackageDashboardNextActionKey: "enable_runtime_config_manually",
            latestPackageDashboardRequiredActionCount: 1,
            latestDecisionId: "lgard_1",
            releaseEvidenceRecordCount: 1,
            latestReleaseEvidenceRecordId: "lgarev_1",
            latestReleaseEvidenceKey: "ownerDailyUiEvidence",
            latestReleaseEvidenceCheckKey: "owner_daily_ui_evidence",
            latestReleaseEvidenceStatus: "pass",
            latestActivationId: "lgaract_1",
            latestRuntimeEnablementId: ""
          },
          artifactReadback: {
            summaryOnly: true,
            snapshots: {
              ok: true,
              status: "records_available",
              count: 1,
              latest: {
                id: "lgarsnap_1",
                status: "ready_for_release_review",
                evidenceReadback: {
                  summaryOnly: true,
                  presentCount: 26,
                  missingCount: 1,
                  sourceBundleId: "bundle_dashboard_snapshot",
                  ownerReviewStageSummary: Object.assign({}, ownerReviewStageSummary, {
                    proposalCount: 5,
                    acceptedProposalCount: 2
                  })
                }
              },
              statuses: ["ready_for_release_review"]
            },
            collectionRuns: {
              ok: true,
              status: "records_available",
              count: 1,
              latest: { id: input.collectionRunId, status: "ready_for_release_review" },
              statuses: ["ready_for_release_review"]
            },
            packages: {
              ok: true,
              status: "records_available",
              count: 1,
              latest: {
                id: "lgapkg_1",
                status: "ready_for_release_review",
                latestPackageStepCount: 6,
                latestPackageDashboardStatus: "manual_runtime_config_required",
                latestPackageDashboardRequiredActionCount: 1,
                latestPackageDashboardNextActionKey: "enable_runtime_config_manually",
                releaseDashboardSummary: {
                  summaryOnly: true,
                  status: "manual_runtime_config_required",
                  requiredActionCount: 1,
                  nextAction: {
                    key: "enable_runtime_config_manually",
                    action: "perform_platform_runtime_config_enablement",
                    requiredActor: "owner"
                  }
                }
              },
              statuses: ["ready_for_release_review"]
            },
            releaseEvidence: {
              ok: true,
              status: "records_available",
              count: 1,
              latest: {
                id: "lgarev_1",
                evidenceKey: "ownerDailyUiEvidence",
                checkKey: "owner_daily_ui_evidence",
                status: "pass",
                observedAt: "2026-06-16T11:13:00.000Z"
              },
              statuses: ["pass"]
            },
            runtimeEnablements: {
              ok: true,
              status: "records_missing",
              count: 0,
              statuses: []
            }
          },
          configChangeApplied: false,
          runtimeConfigChange: false,
          runtimeConfigMutationPerformed: false,
          writefulSchedulingAllowed: false,
          backgroundSchedulingAllowed: false,
          backgroundWorkerAllowed: false
        };
      }
    }
  }, overrides));
}

test("release dashboard composes bounded Owner read model from release services", () => {
  const calls = [];
  const service = createService({}, calls);
  const result = service.dashboard({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    collectionRunId: "lgacrn_1",
    activationGates: ["writeful_execution"],
    limit: 4
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, RELEASE_DASHBOARD_SCHEMA);
  assert.equal(result.status, "manual_runtime_config_required");
  assert.equal(result.releaseDashboard.status, "manual_runtime_config_required");
  assert.equal(result.releaseDashboard.readinessStatus, "incomplete");
  assert.equal(result.releaseDashboard.controlsStatus, "manual_runtime_config_required");
  assert.equal(result.releaseDashboard.inventoryStatus, "manual_runtime_config_required");
  assert.equal(result.releaseDashboard.requiredActionCount, 2);
  assert.equal(result.releaseDashboard.nextAction.key, "enable_runtime_config");
  assert.equal(result.releaseDashboard.readinessEvidencePresentCount, 21);
  assert.equal(result.releaseDashboard.readinessEvidenceMissingCount, 6);
  assert.equal(result.releaseDashboard.readinessEvidenceSourceBundleId, "bundle_dashboard_current");
  assert.equal(result.releaseDashboard.ownerReviewStageSummary.proposalCount, 4);
  assert.equal(result.releaseDashboard.ownerReviewStageSummary.digestRequiredActionCount, 2);
  assert.equal(result.releaseDashboard.ownerReviewStageSummary.blockedActionHandoffCount, 1);
  assert.equal(result.releaseDashboard.ownerReviewStageSummary.publishedSchedulerExecutionCount, 1);
  assert.equal(result.releaseDashboard.ownerReviewStageSummary.completedSchedulerRunCount, 1);
  assert.equal(result.releaseDashboard.ownerReviewStageSummary.pendingWorkerTargetReviewCount, 1);
  assert.equal(result.releaseDashboard.ownerReviewStageSummary.missingGateCount, 3);
  assert.deepEqual(result.releaseDashboard.ownerReviewStageSummary.missingGateKeys, ["digest_owner_review_present", "action_handoff_delivered"]);
  assert.equal(result.releaseDashboard.ownerReviewStageSummary.nextAction.key, "action_handoff_delivered");
  assert.equal(result.releaseDashboard.ownerReviewStageSummary.failurePolicyStatus, "ready");
  assert.equal(result.releaseDashboard.latestReadinessSnapshotId, "lgarsnap_1");
  assert.equal(result.releaseDashboard.latestReadinessEvidencePresentCount, 26);
  assert.equal(result.releaseDashboard.latestReadinessEvidenceMissingCount, 1);
  assert.equal(result.releaseDashboard.latestReadinessEvidenceSourceBundleId, "bundle_dashboard_snapshot");
  assert.equal(result.releaseDashboard.latestReadinessOwnerReviewStageSummary.proposalCount, 5);
  assert.equal(result.releaseDashboard.latestReadinessOwnerReviewStageSummary.acceptedProposalCount, 2);
  assert.equal(result.releaseDashboard.latestCollectionRunId, "lgacrn_1");
  assert.equal(result.releaseDashboard.latestPackageId, "lgapkg_1");
  assert.equal(result.releaseDashboard.latestPackageStepCount, 6);
  assert.equal(result.releaseDashboard.latestPackageDashboardStatus, "manual_runtime_config_required");
  assert.equal(result.releaseDashboard.latestPackageDashboardNextActionKey, "enable_runtime_config_manually");
  assert.equal(result.releaseDashboard.latestPackageDashboardRequiredActionCount, 1);
  assert.equal(result.releaseDashboard.releaseEvidenceRecordCount, 1);
  assert.equal(result.releaseDashboard.latestReleaseEvidenceRecordId, "lgarev_1");
  assert.equal(result.releaseDashboard.latestReleaseEvidenceKey, "ownerDailyUiEvidence");
  assert.equal(result.releaseDashboard.latestReleaseEvidenceCheckKey, "owner_daily_ui_evidence");
  assert.equal(result.releaseDashboard.latestReleaseEvidenceStatus, "pass");
  assert.deepEqual(result.releaseDashboard.missingRecordKinds, ["runtime_enablement"]);
  assert.deepEqual(result.releaseDashboard.persistedApprovalKeys, ["writefulExecutionApproval"]);
  assert.deepEqual(result.releaseDashboard.persistedEvidenceKeys, ["ownerDailyUiEvidence"]);
  assert.equal(result.releaseReadiness.readyForReleaseReview, false);
  assert.deepEqual(result.releaseReadiness.persistedEvidenceKeys, ["ownerDailyUiEvidence"]);
  assert.equal(result.releaseReadiness.evidenceReadback.sourceBundleId, "bundle_dashboard_current");
  assert.equal(result.releaseReadiness.evidenceReadback.sourceBundleTaskCount, 8);
  assert.equal(result.releaseReadiness.evidenceReadback.ownerReviewStageSummary.proposalCount, 4);
  assert.equal(result.releaseReadiness.evidenceReadback.ownerReviewStageSummary.failurePolicyReady, true);
  assert.equal(result.releaseReadiness.evidenceReadback.ownerReviewStageSummary.nextAction.action, "deliver_action_handoff");
  assert.equal(result.releaseControls.auditReadbackStatus, "ready");
  assert.equal(result.releaseInventory.artifactCount, 8);
  assert.equal(result.releaseInventory.releaseEvidenceRecordCount, 1);
  assert.equal(result.releaseInventory.latestReleaseEvidenceRecordId, "lgarev_1");
  assert.equal(result.artifactReadback.snapshots.latestEvidenceReadbackPresentCount, 26);
  assert.equal(result.artifactReadback.snapshots.latestEvidenceReadbackMissingCount, 1);
  assert.equal(result.artifactReadback.snapshots.latestEvidenceReadbackSourceBundleId, "bundle_dashboard_snapshot");
  assert.equal(result.artifactReadback.packages.latestId, "lgapkg_1");
  assert.equal(result.artifactReadback.packages.latestPackageStepCount, 6);
  assert.equal(result.artifactReadback.packages.latestPackageDashboardStatus, "manual_runtime_config_required");
  assert.equal(result.artifactReadback.packages.latestPackageDashboardNextActionKey, "enable_runtime_config_manually");
  assert.equal(result.artifactReadback.releaseEvidence.latestId, "lgarev_1");
  assert.equal(result.artifactReadback.releaseEvidence.latestEvidenceKey, "ownerDailyUiEvidence");
  assert.equal(result.artifactReadback.releaseEvidence.latestCheckKey, "owner_daily_ui_evidence");
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.runtimeConfigChange, false);
  assert.deepEqual(calls.map((call) => call.type), ["readiness", "controls", "inventory"]);
  assert.equal(calls[0].input.collectionRunId, "lgacrn_1");
});

test("release dashboard fails closed when a required readback service is unavailable", () => {
  const service = createService({ releaseControlsService: null });
  const result = service.dashboard({ workspaceId: "weixin_fanfan" });
  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.error, "learning_automation_release_dashboard_controls_unavailable");
});

test("release dashboard rejects privacy-risk input before dependency reads", () => {
  const calls = [];
  const service = createService({}, calls);
  const result = service.dashboard({
    workspaceId: "weixin_fanfan",
    rawTranscript: "private learner transcript"
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_automation_release_dashboard_privacy_failed");
  assert.equal(calls.length, 0);
});

test("release dashboard rejects private paths from dependency readback", () => {
  const service = createService({
    releaseInventoryService: {
      inventory() {
        return {
          ok: true,
          schemaVersion: "growth.learningAutomationReleaseInventory.v1",
          status: "blocked",
          releaseInventory: { summaryOnly: true, status: "blocked" },
          artifactReadback: {
            packages: {
              ok: true,
              status: "records_available",
              count: 1,
              latest: { id: "lgapkg_leaky", status: "blocked", file: "/Users/private/release-package.json" }
            }
          }
        };
      }
    }
  });
  const result = service.dashboard({ workspaceId: "weixin_fanfan" });
  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_automation_release_dashboard_dependency_privacy_failed");
  assert.ok(result.privacyFindings.some((finding) => finding.includes("private_value")));
});
