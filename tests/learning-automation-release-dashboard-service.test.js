const assert = require("node:assert/strict");
const test = require("node:test");
const {
  RELEASE_DASHBOARD_SCHEMA,
  createLearningAutomationReleaseDashboardService
} = require("../src/services/learning-automation-release-dashboard-service");

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
            artifactCount: 7,
            readbackKinds: ["release_collection_run", "release_package", "runtime_enablement"],
            missingRecordKinds: ["runtime_enablement"],
            blockedRecordKinds: [],
            latestReadinessSnapshotId: "lgarsnap_1",
            latestReadinessEvidencePresentCount: 26,
            latestReadinessEvidenceMissingCount: 1,
            latestReadinessEvidenceSourceBundleId: "bundle_dashboard_snapshot",
            latestCollectionRunId: input.collectionRunId,
            latestPackageId: "lgapkg_1",
            latestPackageStepCount: 6,
            latestPackageDashboardStatus: "manual_runtime_config_required",
            latestPackageDashboardNextActionKey: "enable_runtime_config_manually",
            latestPackageDashboardRequiredActionCount: 1,
            latestDecisionId: "lgard_1",
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
                  sourceBundleId: "bundle_dashboard_snapshot"
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
  assert.equal(result.releaseDashboard.latestReadinessSnapshotId, "lgarsnap_1");
  assert.equal(result.releaseDashboard.latestReadinessEvidencePresentCount, 26);
  assert.equal(result.releaseDashboard.latestReadinessEvidenceMissingCount, 1);
  assert.equal(result.releaseDashboard.latestReadinessEvidenceSourceBundleId, "bundle_dashboard_snapshot");
  assert.equal(result.releaseDashboard.latestCollectionRunId, "lgacrn_1");
  assert.equal(result.releaseDashboard.latestPackageId, "lgapkg_1");
  assert.equal(result.releaseDashboard.latestPackageStepCount, 6);
  assert.equal(result.releaseDashboard.latestPackageDashboardStatus, "manual_runtime_config_required");
  assert.equal(result.releaseDashboard.latestPackageDashboardNextActionKey, "enable_runtime_config_manually");
  assert.equal(result.releaseDashboard.latestPackageDashboardRequiredActionCount, 1);
  assert.deepEqual(result.releaseDashboard.missingRecordKinds, ["runtime_enablement"]);
  assert.deepEqual(result.releaseDashboard.persistedApprovalKeys, ["writefulExecutionApproval"]);
  assert.equal(result.releaseReadiness.readyForReleaseReview, false);
  assert.equal(result.releaseReadiness.evidenceReadback.sourceBundleId, "bundle_dashboard_current");
  assert.equal(result.releaseReadiness.evidenceReadback.sourceBundleTaskCount, 8);
  assert.equal(result.releaseControls.auditReadbackStatus, "ready");
  assert.equal(result.releaseInventory.artifactCount, 7);
  assert.equal(result.artifactReadback.snapshots.latestEvidenceReadbackPresentCount, 26);
  assert.equal(result.artifactReadback.snapshots.latestEvidenceReadbackMissingCount, 1);
  assert.equal(result.artifactReadback.snapshots.latestEvidenceReadbackSourceBundleId, "bundle_dashboard_snapshot");
  assert.equal(result.artifactReadback.packages.latestId, "lgapkg_1");
  assert.equal(result.artifactReadback.packages.latestPackageStepCount, 6);
  assert.equal(result.artifactReadback.packages.latestPackageDashboardStatus, "manual_runtime_config_required");
  assert.equal(result.artifactReadback.packages.latestPackageDashboardNextActionKey, "enable_runtime_config_manually");
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
