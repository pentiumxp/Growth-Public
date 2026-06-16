"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  RELEASE_PREFLIGHT_SCHEMA,
  createLearningAutomationReleasePreflightService
} = require("../src/services/learning-automation-release-preflight-service");

function createReadyService(extra = {}) {
  const calls = [];
  const service = createLearningAutomationReleasePreflightService({
    releaseDashboardService: {
      dashboard(input) {
        calls.push(["dashboard", input]);
        return Object.assign({
          ok: true,
          status: "manual_runtime_config_required",
          releaseDashboard: {
            status: "manual_runtime_config_required",
            requiredActionCount: 1,
            readyForReleaseReview: true,
            missingCheckKeys: [],
            missingEvidenceKeys: [],
            missingApprovalKeys: [],
            missingRecordKinds: [],
            blockedRecordKinds: [],
            readinessEvidencePresentCount: 12,
            readinessEvidenceMissingCount: 0,
            persistedApprovalKeys: ["writefulExecutionApproval"],
            persistedEvidenceKeys: ["owner_daily_ui_evidence"],
            nextAction: { key: "manual_config_change", action: "enable_runtime_config", requiredActor: "owner" }
          }
        }, extra.dashboardResult || {});
      }
    },
    releaseWorkbenchService: {
      workbench(input) {
        calls.push(["workbench", input]);
        return Object.assign({
          ok: true,
          status: "manual_runtime_config_required",
          releaseWorkbench: {
            status: "manual_runtime_config_required",
            ownerActionCount: 1,
            ownerActions: [{ key: "runtime_config", action: "record_runtime_enablement", requiredActor: "owner" }],
            missingCheckKeys: [],
            missingEvidenceKeys: [],
            missingApprovalKeys: [],
            missingRecordKinds: [],
            blockedRecordKinds: [],
            releaseEvidenceCollectionTasks: ["profile_feedback"]
          }
        }, extra.workbenchResult || {});
      }
    },
    releaseClosureService: {
      summarize(input) {
        calls.push(["closure", input]);
        return Object.assign({
          ok: true,
          status: "ready_for_owner_release_activation",
          backendEvidenceComplete: true,
          readyForOwnerReleaseActivation: true,
          releaseClosure: {
            status: "ready_for_owner_release_activation",
            packageRecordStatus: "ready_for_release_review",
            packageRecordPresent: true,
            packageRecordReadbackAvailable: true
          },
          review: {
            status: "approved",
            latestPackageId: "lgarpkg_1",
            packageRecordStatus: "ready_for_release_review"
          },
          executionGate: {
            status: "authorized",
            authorized: true,
            missingApprovalKeys: []
          }
        }, extra.closureResult || {});
      }
    },
    repository: extra.repository
  });
  return { service, calls };
}

test("release preflight evaluates summary-only release readiness without writeful scheduling", () => {
  const { service, calls } = createReadyService();

  const result = service.evaluate({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    collectionRunId: "lgacrn_ready_1"
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, RELEASE_PREFLIGHT_SCHEMA);
  assert.equal(result.privacyClass, "summary_only");
  assert.equal(result.summaryOnly, true);
  assert.deepEqual(calls.map((call) => call[0]), ["dashboard", "workbench", "closure"]);
  for (const [, input] of calls) {
    assert.equal(input.workspaceId, "weixin_fanfan");
    assert.equal(input.learnerId, "fanfan");
    assert.equal(input.collectionRunId, "lgacrn_ready_1");
  }
  assert.equal(result.status, "ready_for_owner_release_activation");
  assert.equal(result.releasePreflight.backendEvidenceComplete, true);
  assert.equal(result.releasePreflight.readyForOwnerReleaseActivation, true);
  assert.equal(result.releasePreflight.readyForProductionDeploy, false);
  assert.equal(result.releasePreflight.readyForProductionDeployReview, true);
  assert.equal(result.releasePreflight.readinessEvidencePresentCount, 12);
  assert.deepEqual(result.releasePreflight.persistedApprovalKeys, ["writefulExecutionApproval"]);
  assert.deepEqual(result.releasePreflight.persistedEvidenceKeys, ["owner_daily_ui_evidence"]);
  assert.equal(result.advisoryOnly, true);
  assert.equal(result.recordOnly, true);
  assert.equal(result.configChangeApplied, false);
  assert.equal(result.runtimeConfigChange, false);
  assert.equal(result.runtimeConfigMutationPerformed, false);
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.backgroundSchedulingAllowed, false);
  assert.equal(result.backgroundWorkerAllowed, false);
});

test("release preflight report write requires explicit authorization and delegates to repository", () => {
  const recorded = [];
  const { service } = createReadyService({
    repository: {
      recordReport(input) {
        recorded.push(input);
        return {
          ok: true,
          duplicate: false,
          report: {
            preflightReportId: "lgarpf_1",
            status: input.releasePreflight.status,
            privacyClass: "summary_only",
            releasePreflight: input.releasePreflight,
            createdAt: "2026-06-17T10:00:00.000Z"
          }
        };
      },
      listReports: () => []
    }
  });

  const denied = service.recordReport({ workspaceId: "weixin_fanfan" });
  assert.equal(denied.ok, false);
  assert.equal(denied.error, "learning_automation_release_preflight_write_not_authorized");
  assert.equal(recorded.length, 0);

  const saved = service.recordReport({
    workspaceId: "weixin_fanfan",
    allowWritePreflight: true,
    requestedBy: "owner"
  });
  assert.equal(saved.ok, true);
  assert.equal(saved.report.preflightReportId, "lgarpf_1");
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].workspaceId, "weixin_fanfan");
  assert.equal(recorded[0].requestedBy, "owner");
  assert.equal(recorded[0].releasePreflight.readyForProductionDeploy, false);
});

test("release preflight fails closed on privacy risks and missing dependencies", () => {
  const missing = createLearningAutomationReleasePreflightService({}).evaluate({ workspaceId: "fanfan" });
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "learning_automation_release_preflight_dashboard_unavailable");

  const privateInput = createReadyService().service.evaluate({
    workspaceId: "fanfan",
    rawPrompt: "do not accept"
  });
  assert.equal(privateInput.ok, false);
  assert.equal(privateInput.error, "learning_automation_release_preflight_privacy_failed");

  const privateDependency = createReadyService({
    dashboardResult: {
      privatePath: "/Users/xuxin/.homeai-qa/private.json"
    }
  }).service.evaluate({ workspaceId: "fanfan" });
  assert.equal(privateDependency.ok, false);
  assert.equal(privateDependency.error, "learning_automation_release_preflight_dependency_privacy_failed");
});
