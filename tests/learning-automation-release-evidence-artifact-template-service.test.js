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
            releaseStatePrerequisiteActions: [
              {
                key: "reviewed_automation_digest",
                action: "review_automation_digest",
                endpointKey: "automation_digest",
                requiredActor: "owner",
                manualReviewRequired: true,
                route: {
                  method: "GET",
                  path: "/api/v1/growth/automation/digests",
                  query: {
                    workspace_id: "fanfan",
                    status: "reviewed"
                  }
                }
              },
              {
                key: "active_failure_policy",
                action: "activate_failure_policy",
                endpointKey: "automation_failure_policy",
                requiredActor: "owner",
                manualReviewRequired: true,
                route: {
                  method: "GET",
                  path: "/api/v1/growth/automation/failure-policies/readiness",
                  query: {
                    workspace_id: "fanfan"
                  }
                }
              }
            ],
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
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.statePrerequisiteItemCount, 2);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.approvalItemCount, 1);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.recordItemCount, 1);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.unsupportedItemCount, 1);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.items.some((item) => item.key === "collection:profile_feedback"), true);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.items.some((item) => item.key === "collection:platform_action"), true);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.items.some((item) => item.key === "artifact:central_visual"), true);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.items.some((item) => item.key === "write_gated:daily_loop_write"), true);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.items.some((item) => item.key === "state:reviewed_automation_digest"), true);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceChecklist.items.some((item) => item.key === "state:active_failure_policy"), true);
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
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceActionPlan.schemaVersion, "growth.learningAutomationReleaseEvidenceActionPlan.v1");
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceActionPlan.status, "release_evidence_actions_required");
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceActionPlan.actionCount, 8);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceActionPlan.submittableActionCount, 0);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceActionPlan.phaseBlockedActionCount, 2);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceActionPlan.externalActionCount, 5);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceActionPlan.readyPhase, "release_evidence_prerequisites");
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceActionPlan.blockingChecklistItemKeys.includes("artifact:central_visual"), true);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceActionPlan.blockingChecklistItemKeys.includes("collection:profile_feedback"), true);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceActionPlan.blockingChecklistItemKeys.includes("state:reviewed_automation_digest"), true);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceActionPlan.blockingChecklistItemKeys.includes("approval:writefulExecutionApproval"), true);
  assert.deepEqual(result.releaseArtifactTemplate.releaseEvidenceActionPlan.blockingChecklistKinds, [
    "home_ai_visual_artifact",
    "release_evidence_collection_task",
    "write_gated_release_evidence",
    "release_state_prerequisite",
    "manual_or_unsupported_release_evidence",
    "release_approval"
  ]);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceActionPlan.nextAction.key, "prepare:release_evidence_artifact_manifest");
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceActionPlan.nextAction.readyToSubmit, false);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceActionPlan.nextSubmittableAction, null);
  const planActions = new Map(result.releaseArtifactTemplate.releaseEvidenceActionPlan.actions.map((item) => [item.key, item]));
  assert.equal(planActions.get("prepare:release_evidence_artifact_manifest").artifactSlotCount, 4);
  assert.deepEqual(planActions.get("prepare:release_evidence_artifact_manifest").artifactTaskIds, [
    "central_visual",
    "owner_daily_ui",
    "release_package_review_ui",
    "scheduler_run_ui"
  ]);
  assert.equal(planActions.get("prepare:release_evidence_artifact_manifest").followupRoute.path, "/api/v1/growth/automation/release-workbench/actions");
  assert.equal(planActions.get("execute:release_evidence_collection").route.path, "/api/v1/growth/automation/release-workbench/actions");
  assert.equal(planActions.get("execute:release_evidence_collection").directCollectionRoutePath, "/api/v1/growth/automation/release-evidence-collections/run");
  assert.equal(planActions.get("execute:release_evidence_collection").readyToSubmit, false);
  assert.equal(planActions.get("execute:release_evidence_collection").blockedUntilArtifactManifestFilled, true);
  assert.deepEqual(planActions.get("execute:release_evidence_collection").collectionTaskIds, [
    "profile_feedback",
    "platform_action"
  ]);
  assert.deepEqual(planActions.get("execute:release_evidence_collection").pendingArtifactTaskIds, [
    "central_visual",
    "owner_daily_ui",
    "release_package_review_ui",
    "scheduler_run_ui"
  ]);
  assert.deepEqual(planActions.get("execute:release_evidence_collection").bodyTemplate.tasks, [
    "profile_feedback",
    "platform_action"
  ]);
  assert.deepEqual(planActions.get("execute:release_evidence_collection").bodyTemplate.required_task_ids, [
    "profile_feedback",
    "platform_action"
  ]);
  assert.equal(planActions.get("execute:release_evidence_collection").bodyTemplate.endpoint_key, "release_evidence_collection");
  assert.equal(planActions.get("execute:release_evidence_collection").bodyTemplate.artifactManifest.centralVisualEvidenceFile, "");
  assert.deepEqual(planActions.get("execute:release_evidence_collection").bodyTemplate.artifactManifest.uiEvidenceFiles, {
    ownerDailyUiEvidence: "",
    releasePackageReviewUiEvidence: "",
    schedulerRunUiEvidence: ""
  });
  assert.equal(planActions.get("record:approval:writefulExecutionApproval").bodyTemplate.approval_key, "writefulExecutionApproval");
  assert.equal(planActions.get("record:approval:writefulExecutionApproval").bodyTemplate.approval.status, "approved");
  assert.equal(planActions.get("record:approval:writefulExecutionApproval").readyToSubmit, false);
  assert.equal(planActions.get("record:approval:writefulExecutionApproval").blockingReason, "release_evidence_prerequisites_incomplete");
  assert.equal(planActions.get("record:approval:writefulExecutionApproval").blockedUntilReleaseEvidenceReady, true);
  assert.equal(planActions.get("record:approval:writefulExecutionApproval").blockedByChecklistItemKeys.includes("artifact:central_visual"), true);
  assert.equal(planActions.get("record:release_package").bodyTemplate.build_and_record_package, true);
  assert.deepEqual(planActions.get("record:release_package").bodyTemplate.tasks, ["planner_readiness", "scheduler_dry_run"]);
  assert.equal(planActions.get("record:release_package").readyToSubmit, false);
  assert.equal(planActions.get("record:release_package").blockingReason, "release_evidence_prerequisites_incomplete");
  assert.equal(planActions.get("record:release_package").blockedUntilReleaseEvidenceReady, true);
  assert.equal(planActions.get("record:release_package").blockedUntilReleaseApprovalReady, true);
  assert.equal(planActions.get("record:release_package").blockedByChecklistItemKeys.includes("approval:writefulExecutionApproval"), true);
  assert.equal(planActions.get("authorize:daily_loop_write").writeGateRequired, true);
  assert.equal(planActions.get("state:reviewed_automation_digest").externalActionRequired, true);
  assert.equal(planActions.get("state:reviewed_automation_digest").route.path, "/api/v1/growth/automation/digests");
  assert.equal(planActions.get("state:active_failure_policy").manualReviewRequired, true);
  assert.equal(planActions.get("state:active_failure_policy").route.path, "/api/v1/growth/automation/failure-policies/readiness");
  assert.equal(planActions.get("manual:manual_owner_signoff_evidence").manualReviewRequired, true);
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
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceActionPlan.status, "release_evidence_ready_for_review");
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceActionPlan.actionCount, 0);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceActionPlan.nextAction, null);
  assert.equal(result.releaseArtifactTemplate.releaseEvidenceActionPlan.nextSubmittableAction, null);
  assert.deepEqual(result.releaseArtifactTemplate.artifactManifestTemplate, {
    schemaVersion: "growth.learningAutomationReleaseEvidenceArtifactManifest.v1",
    privacyClass: "summary_only",
    summaryOnly: true
  });
  assert.equal(result.releaseArtifactTemplate.readyForManifestInput, true);
});

test("release artifact template gates records behind missing approval after evidence prerequisites clear", () => {
  const service = createLearningAutomationReleaseEvidenceArtifactTemplateService({
    releaseWorkbenchService: {
      workbench() {
        return {
          ok: true,
          status: "release_approval_required",
          releaseWorkbench: {
            summaryOnly: true,
            status: "release_approval_required",
            missingEvidenceKeys: [],
            missingCheckKeys: [],
            missingApprovalKeys: ["writefulExecutionApproval"],
            missingRecordKinds: ["release_package"],
            recordRoutes: [
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
            ]
          }
        };
      }
    }
  });

  const result = service.template({ workspaceId: "fanfan" });
  const actionPlan = result.releaseArtifactTemplate.releaseEvidenceActionPlan;
  const planActions = new Map(actionPlan.actions.map((item) => [item.key, item]));

  assert.equal(result.ok, true);
  assert.equal(actionPlan.actionCount, 2);
  assert.equal(actionPlan.submittableActionCount, 1);
  assert.equal(actionPlan.phaseBlockedActionCount, 1);
  assert.equal(actionPlan.readyPhase, "release_approval");
  assert.deepEqual(actionPlan.blockingChecklistItemKeys, ["approval:writefulExecutionApproval"]);
  assert.deepEqual(actionPlan.blockingChecklistKinds, ["release_approval"]);
  assert.equal(actionPlan.nextSubmittableAction.key, "record:approval:writefulExecutionApproval");
  assert.equal(planActions.get("record:approval:writefulExecutionApproval").readyToSubmit, true);
  assert.equal(planActions.get("record:release_package").readyToSubmit, false);
  assert.equal(planActions.get("record:release_package").blockingReason, "release_approval_required");
  assert.equal(planActions.get("record:release_package").blockedUntilReleaseEvidenceReady, false);
  assert.equal(planActions.get("record:release_package").blockedUntilReleaseApprovalReady, true);
  assert.deepEqual(planActions.get("record:release_package").blockedByChecklistItemKeys, ["approval:writefulExecutionApproval"]);
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
