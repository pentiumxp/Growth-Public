"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  RELEASE_WORKBENCH_SCHEMA,
  createLearningAutomationReleaseWorkbenchService
} = require("../src/services/learning-automation-release-workbench-service");

test("release workbench composes release services into Owner action templates without writes", () => {
  const calls = [];
  const service = createLearningAutomationReleaseWorkbenchService({
    releaseReadinessService: {
      evaluateReadiness(input) {
        calls.push(["readiness", input]);
        return {
          ok: true,
          status: "release_evidence_required",
          releaseReview: {
            status: "release_evidence_required",
            requiredActionCount: 2,
            missingCheckKeys: ["owner_daily_ui_evidence"],
            missingEvidenceKeys: ["owner_daily_ui_evidence"],
            nextAction: {
              key: "owner_daily_ui_evidence",
              action: "record_release_evidence",
              requiredActor: "owner"
            }
          },
          writefulSchedulingAllowed: false
        };
      }
    },
    releaseControlsService: {
      summarize(input) {
        calls.push(["controls", input]);
        return {
          ok: true,
          status: "manual_runtime_config_required",
          releaseControls: {
            status: "manual_runtime_config_required",
            requiredActionCount: 2,
            missingApprovalKeys: ["writefulExecutionApproval"],
            nextAction: {
              key: "manual_config_change",
              action: "enable_runtime_config",
              requiredActor: "owner"
            }
          },
          writefulSchedulingAllowed: false
        };
      }
    },
    releaseInventoryService: {
      inventory(input) {
        calls.push(["inventory", input]);
        return {
          ok: true,
          status: "manual_runtime_config_required",
          releaseInventory: {
            status: "manual_runtime_config_required",
            missingRecordKinds: ["release_collection_run", "release_package", "runtime_enablement"],
            latestCollectionRunId: input.collectionRunId,
            latestReleaseEvidenceRecordId: ""
          },
          writefulSchedulingAllowed: false
        };
      }
    },
    releaseDashboardService: {
      dashboard(input) {
        calls.push(["dashboard", input]);
        return {
          ok: true,
          status: "manual_runtime_config_required",
          releaseDashboard: {
            status: "manual_runtime_config_required",
            requiredActionCount: 3,
            missingEvidenceKeys: ["central_visual_evidence"],
            nextAction: {
              key: "manual_config_change",
              action: "enable_runtime_config",
              requiredActor: "owner"
            }
          },
          writefulSchedulingAllowed: false
        };
      }
    }
  });

  const result = service.workbench({
    workspaceId: "fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    collectionRunId: "lgacrn_1",
    activationGates: ["writeful_execution"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, RELEASE_WORKBENCH_SCHEMA);
  assert.equal(result.privacyClass, "summary_only");
  assert.equal(result.summaryOnly, true);
  assert.equal(result.status, "manual_runtime_config_required");
  assert.deepEqual(calls.map((call) => call[0]), ["readiness", "controls", "inventory", "dashboard"]);
  for (const [, input] of calls) {
    assert.equal(input.workspaceId, "fanfan");
    assert.equal(input.learnerId, "fanfan");
    assert.equal(input.collectionRunId, "lgacrn_1");
  }
  assert.equal(result.releaseWorkbench.summaryOnly, true);
  assert.equal(result.releaseWorkbench.ownerActions.some((action) => action.endpointKey === "release_evidence"), true);
  assert.equal(result.releaseWorkbench.ownerActions.some((action) => action.endpointKey === "release_approval"), true);
  assert.equal(result.releaseWorkbench.ownerActions.some((action) => action.endpointKey === "release_evidence_collection"), true);
  const collectionAction = result.releaseWorkbench.ownerActions.find((action) => action.endpointKey === "release_evidence_collection");
  assert.equal(collectionAction.key, "release_collection_run");
  assert.equal(collectionAction.action, "run_release_evidence_collection");
  assert.equal(collectionAction.requiresPreparation, false);
  assert.equal(collectionAction.route.path, "/api/v1/growth/automation/release-evidence-collections/run");
  assert.deepEqual(collectionAction.route.body.tasks, ["learning_loop_state"]);
  assert.deepEqual(collectionAction.route.body.required_task_ids, ["learning_loop_state"]);
  assert.equal(collectionAction.route.body.write_collection_run, true);
  assert.equal(result.releaseWorkbench.ownerActions.some((action) => action.endpointKey === "release_package"), true);
  const packageAction = result.releaseWorkbench.ownerActions.find((action) => action.endpointKey === "release_package");
  assert.equal(packageAction.requiresPreparation, true);
  assert.equal(packageAction.preparationRoute.method, "POST");
  assert.equal(packageAction.preparationRoute.path, "/api/v1/growth/automation/release-packages/build");
  assert.equal(packageAction.preparationRoute.body.workspace_id, "fanfan");
  assert.deepEqual(packageAction.preparationRoute.body.tasks, ["planner_readiness", "scheduler_dry_run"]);
  assert.deepEqual(packageAction.preparationRoute.body.activation_gates, ["writeful_execution"]);
  assert.equal(result.releaseWorkbench.ownerActions.some((action) => action.endpointKey === "runtime_enablement"), true);
  assert.equal(result.releaseWorkbench.ownerActions.some((action) => action.externalActionRequired === true), true);
  assert.equal(result.releaseWorkbench.readRoutes.some((route) => route.key === "release_authorization"), true);
  assert.equal(result.releaseWorkbench.recordRoutes.some((route) => route.key === "release_evidence_collection"), true);
  assert.equal(result.releaseWorkbench.recordRoutes.some((route) => route.key === "runtime_enablement"), true);
  assert.deepEqual(result.releaseWorkbench.missingEvidenceKeys.sort(), ["central_visual_evidence", "owner_daily_ui_evidence"].sort());
  assert.deepEqual(result.releaseWorkbench.missingApprovalKeys, ["writefulExecutionApproval"]);
  assert.deepEqual(result.releaseWorkbench.missingRecordKinds, ["release_collection_run", "release_package", "runtime_enablement"]);
  assert.equal(result.configChangeApplied, false);
  assert.equal(result.runtimeConfigChange, false);
  assert.equal(result.runtimeConfigMutationPerformed, false);
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.backgroundSchedulingAllowed, false);
  assert.equal(result.backgroundWorkerAllowed, false);
});

test("release workbench fails closed when a dependency is missing", () => {
  const service = createLearningAutomationReleaseWorkbenchService({
    releaseReadinessService: { evaluateReadiness: () => ({ ok: true }) }
  });

  const result = service.workbench({ workspaceId: "fanfan" });

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_automation_release_workbench_controls_unavailable");
  assert.equal(result.releaseWorkbench.summaryOnly, true);
  assert.equal(result.writefulSchedulingAllowed, false);
});

test("release workbench rejects private input and dependency output", () => {
  const validDeps = {
    releaseReadinessService: { evaluateReadiness: () => ({ ok: true, releaseReview: { status: "ready" } }) },
    releaseControlsService: { summarize: () => ({ ok: true, releaseControls: { status: "ready" } }) },
    releaseInventoryService: { inventory: () => ({ ok: true, releaseInventory: { status: "ready" } }) },
    releaseDashboardService: { dashboard: () => ({ ok: true, releaseDashboard: { status: "ready" } }) }
  };
  const inputResult = createLearningAutomationReleaseWorkbenchService(validDeps).workbench({
    workspaceId: "fanfan",
    rawPrompt: "do not accept"
  });
  assert.equal(inputResult.ok, false);
  assert.equal(inputResult.error, "learning_automation_release_workbench_privacy_failed");

  const dependencyResult = createLearningAutomationReleaseWorkbenchService(Object.assign({}, validDeps, {
    releaseDashboardService: {
      dashboard: () => ({
        ok: true,
        releaseDashboard: { status: "ready" },
        privatePath: "/Users/xuxin/private.json"
      })
    }
  })).workbench({ workspaceId: "fanfan" });
  assert.equal(dependencyResult.ok, false);
  assert.equal(dependencyResult.error, "learning_automation_release_workbench_dependency_privacy_failed");
});
