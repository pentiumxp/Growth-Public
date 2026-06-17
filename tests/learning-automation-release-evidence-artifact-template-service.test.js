"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  RELEASE_EVIDENCE_ARTIFACT_TEMPLATE_SCHEMA,
  createLearningAutomationReleaseEvidenceArtifactTemplateService,
  taskIdFromKey
} = require("../src/services/learning-automation-release-evidence-artifact-template-service");

test("release artifact template maps only missing central visual and UI evidence keys", () => {
  const calls = [];
  const service = createLearningAutomationReleaseEvidenceArtifactTemplateService({
    releaseWorkbenchService: {
      workbench(input) {
        calls.push(input);
        return {
          ok: true,
          status: "release_evidence_required",
          releaseWorkbench: {
            summaryOnly: true,
            status: "release_evidence_required",
            missingEvidenceKeys: [
              "central_visual_evidence",
              "platform_action_evidence",
              "owner_daily_ui_evidence",
              "production_profile_feedback_smoke_evidence",
              "release_package_review_ui_evidence"
            ],
            missingCheckKeys: ["scheduler_run_ui_evidence"],
            missingApprovalKeys: ["writefulExecutionApproval"],
            missingRecordKinds: ["release_package"],
            releaseEvidenceCollectionSupportedTaskIds: [
              "profile_feedback",
              "platform_action",
              "central_visual",
              "owner_daily_ui",
              "release_package_review_ui",
              "scheduler_run_ui"
            ],
            releaseEvidenceCollectionRequiredTaskIds: [
              "profile_feedback",
              "platform_action",
              "central_visual",
              "owner_daily_ui",
              "release_package_review_ui",
              "scheduler_run_ui"
            ],
            recordRoutes: [
              {
                key: "release_evidence_collection",
                route: {
                  path: "/api/v1/growth/automation/release-evidence-collections/run"
                }
              },
              {
                key: "release_approval",
                route: {
                  path: "/api/v1/growth/automation/release-approvals"
                }
              },
              {
                key: "release_package",
                route: {
                  path: "/api/v1/growth/automation/release-packages"
                }
              }
            ],
            writeGatedReleaseEvidenceCollectionTasks: ["daily_loop_write"],
            unsupportedReleaseEvidenceCollectionKeys: ["manual_owner_signoff_evidence"]
          }
        };
      }
    }
  });

  const result = service.template({
    workspaceId: "fanfan",
    learnerId: "fanfan",
    programId: "science"
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, RELEASE_EVIDENCE_ARTIFACT_TEMPLATE_SCHEMA);
  assert.equal(result.status, "artifact_manifest_required");
  assert.equal(result.privacyClass, "summary_only");
  assert.equal(result.summaryOnly, true);
  assert.equal(calls[0].workspaceId, "fanfan");
  assert.deepEqual(result.releaseArtifactTemplate.artifactTaskIds, [
    "central_visual",
    "owner_daily_ui",
    "release_package_review_ui",
    "scheduler_run_ui"
  ]);
  assert.deepEqual(result.releaseArtifactTemplate.artifactManifestTemplate, {
    schemaVersion: "growth.learningAutomationReleaseEvidenceArtifactManifest.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    centralVisualEvidenceFile: "",
    uiEvidenceFiles: {
      ownerDailyUiEvidence: "",
      releasePackageReviewUiEvidence: "",
      schedulerRunUiEvidence: ""
    }
  });
  assert.equal(result.releaseArtifactTemplate.artifactSlots.some((slot) => slot.taskId === "platform_action"), false);
  assert.equal(result.releaseArtifactTemplate.artifactSlots.some((slot) => slot.taskId === "profile_feedback"), false);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.schemaVersion, "growth.learningAutomationReleaseEvidenceChecklist.v1");
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.status, "release_evidence_actions_required");
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.artifactItemCount, 4);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.collectionTaskItemCount, 2);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.writeGatedItemCount, 1);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.approvalItemCount, 1);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.recordItemCount, 1);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.unsupportedItemCount, 1);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.items.some((item) => item.key === "collection:profile_feedback"), true);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.items.some((item) => item.key === "collection:platform_action"), true);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.items.some((item) => item.key === "artifact:central_visual"), true);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.items.some((item) => item.key === "write_gated:daily_loop_write"), true);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.items.some((item) => item.key === "approval:writefulExecutionApproval"), true);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.items.some((item) => item.key === "record:release_package"), true);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.items.some((item) => item.key === "unsupported:manual_owner_signoff_evidence"), true);
  assert.equal(
    result.releaseArtifactTemplate.releaseEvidenceChecklist.items
      .find((item) => item.key === "collection:profile_feedback").commandName,
    "npm run smoke:profile-feedback"
  );
  assert.equal(
    result.releaseArtifactTemplate.releaseEvidenceChecklist.items
      .find((item) => item.key === "collection:platform_action").routePath,
    "/api/v1/growth/automation/release-evidence-collections/run"
  );
  assert.equal(
    result.releaseArtifactTemplate.releaseEvidenceChecklist.items
      .find((item) => item.key === "record:release_package").routePath,
    "/api/v1/growth/automation/release-packages"
  );
  assert.equal(result.releaseArtifactTemplate.readyForManifestInput, false);
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.runtimeConfigMutationPerformed, false);
  assert.equal(JSON.stringify(result).includes("/Users/"), false);
});

test("release artifact template does not widen to advertised default collection tasks", () => {
  const service = createLearningAutomationReleaseEvidenceArtifactTemplateService({
    releaseWorkbenchService: {
      workbench() {
        return {
          ok: true,
          status: "ready",
          releaseWorkbench: {
            summaryOnly: true,
            status: "ready",
            missingEvidenceKeys: [],
            missingCheckKeys: [],
            releaseEvidenceCollectionTasks: ["central_visual", "owner_daily_ui"],
            releaseEvidenceCollectionRequiredTaskIds: ["central_visual", "owner_daily_ui"]
          }
        };
      }
    }
  });

  const result = service.template({ workspaceId: "fanfan" });

  assert.equal(result.ok, true);
  assert.equal(result.status, "no_artifact_manifest_required");
  assert.deepEqual(result.releaseArtifactTemplate.artifactTaskIds, []);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.status, "release_evidence_ready_for_review");
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.itemCount, 0);
  assert.deepEqual(result.releaseArtifactTemplate.artifactManifestTemplate, {
    schemaVersion: "growth.learningAutomationReleaseEvidenceArtifactManifest.v1",
    privacyClass: "summary_only",
    summaryOnly: true
  });
  assert.equal(result.releaseArtifactTemplate.readyForManifestInput, true);
});

test("release artifact template fails closed through the workbench boundary", () => {
  const missing = createLearningAutomationReleaseEvidenceArtifactTemplateService().template({ workspaceId: "fanfan" });
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "release_evidence_artifact_template_workbench_unavailable");

  const blocked = createLearningAutomationReleaseEvidenceArtifactTemplateService({
    releaseWorkbenchService: {
      workbench() {
        return {
          ok: false,
          status: "blocked",
          error: "learning_automation_release_workbench_privacy_failed"
        };
      }
    }
  }).template({ workspaceId: "fanfan" });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, "learning_automation_release_workbench_privacy_failed");
});

test("release artifact template task-key mapping is registry-driven", () => {
  assert.equal(taskIdFromKey("centralVisualEvidence"), "central_visual");
  assert.equal(taskIdFromKey("ownerDailyUiEvidence"), "owner_daily_ui");
  assert.equal(taskIdFromKey("owner_daily_ui_evidence"), "owner_daily_ui");
  assert.equal(taskIdFromKey("owner_daily"), "owner_daily_ui");
  assert.equal(taskIdFromKey("unknown_evidence"), "");
});
