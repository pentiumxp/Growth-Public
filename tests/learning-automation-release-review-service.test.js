"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createLearningAutomationReleaseReviewService
} = require("../src/services/learning-automation-release-review-service");

function readyReadiness(overrides = {}) {
  return Object.assign({
    ok: true,
    status: "ready_for_release_review",
    summary: {
      readyForReleaseReview: true,
      writefulSchedulingAllowed: false
    },
    checks: [],
    releaseReview: {
      schemaVersion: "growth.learningAutomationReleaseReadiness.releaseReview.v1",
      advisoryOnly: true,
      writefulSchedulingAllowed: false,
      missingCheckKeys: [],
      blockedCheckKeys: [],
      missingEvidenceKeys: [],
      requiredActionCount: 0,
      requiredActions: [],
      nextAction: null,
      persistedApprovalKeys: []
    }
  }, overrides);
}

function serviceWith(records = {}) {
  return createLearningAutomationReleaseReviewService({
    readinessService: {
      evaluateReadiness(input) {
        records.readinessInput = input;
        return records.readiness || readyReadiness();
      }
    },
    collectionRunService: {
      listRuns(input) {
        records.collectionRunInput = input;
        return {
          ok: true,
          count: records.collectionRun ? 1 : 0,
          runs: records.collectionRun ? [records.collectionRun] : []
        };
      }
    },
    decisionService: {
      listDecisions(input) {
        records.decisionInput = input;
        return {
          ok: true,
          count: records.decision ? 1 : 0,
          decisions: records.decision ? [records.decision] : []
        };
      }
    },
    approvalService: {
      approvalBag(input) {
        records.approvalInput = input;
        return {
          ok: true,
          releaseApproval: records.releaseApproval || {},
          approvalKeys: records.approvalKeys || []
        };
      }
    },
    packageService: {
      listPackages(input) {
        records.packageInput = input;
        return {
          ok: true,
          count: records.packageRecord ? 1 : 0,
          packages: records.packageRecord ? [records.packageRecord] : []
        };
      }
    }
  });
}

test("release review reports required collection run after readiness is ready", () => {
  const records = {};
  const service = serviceWith(records);
  const result = service.review({
    workspaceId: "fanfan",
    learnerId: "fanfan",
    domain: "science",
    subject: "biology"
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, "growth.learningAutomationReleaseReview.v1");
  assert.equal(result.status, "collection_run_required");
  assert.equal(result.collectionRunRequired, true);
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.runtimeConfigChange, false);
  assert.equal(result.releaseReview.nextAction.key, "record_release_collection_run");
  assert.equal(records.collectionRunInput.limit, 1);
  assert.equal(records.decisionInput.collectionRunId, "");
});

test("release review reports ready for Owner decision when run exists without decision", () => {
  const records = {
    collectionRun: {
      collectionRunId: "lgacrn_ready",
      status: "ready_for_release_review",
      privacyClass: "summary_only"
    }
  };
  const service = serviceWith(records);
  const result = service.review({
    workspaceId: "fanfan",
    learnerId: "fanfan"
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "ready_for_owner_decision");
  assert.equal(result.collectionRunPresent, true);
  assert.equal(result.decisionPresent, false);
  assert.equal(result.packageRecordRequired, true);
  assert.equal(result.packageRecordPresent, false);
  assert.equal(result.releaseReview.packageRecordStatus, "missing");
  assert.equal(result.latestCollectionRun.collectionRunId, "lgacrn_ready");
  assert.equal(result.releaseReview.nextAction.key, "record_release_decision");
  assert.equal(records.decisionInput.collectionRunId, "lgacrn_ready");
  assert.equal(records.packageInput.collectionRunId, "lgacrn_ready");
});

test("release review reports approved state from latest decision and ready package record", () => {
  const records = {
    collectionRun: {
      collectionRunId: "lgacrn_ready",
      status: "ready_for_release_review"
    },
    decision: {
      decisionId: "lgard_approved",
      collectionRunId: "lgacrn_ready",
      status: "approved",
      privacyClass: "summary_only"
    },
    packageRecord: {
      packageId: "lgapkg_ready",
      collectionRunId: "lgacrn_ready",
      status: "ready_for_release_review",
      packageVersion: "growth.learningAutomationReleasePackage.v1",
      privacyClass: "summary_only",
      packageSummary: {
        schemaVersion: "growth.learningAutomationReleasePackage.summary.v1",
        summaryOnly: true,
        ok: true,
        status: "ready_for_release_review",
        collectionRunId: "lgacrn_ready"
      },
      stepSummary: {
        schemaVersion: "growth.learningAutomationReleasePackage.stepSummary.v1",
        summaryOnly: true,
        status: "ready_for_release_review",
        stepCount: 6,
        passingStepCount: 6,
        blockedStepCount: 0
      },
      releaseDashboardSummary: {
        schemaVersion: "growth.learningAutomationReleaseDashboard.summary.v1",
        summaryOnly: true,
        status: "manual_runtime_config_required",
        readinessStatus: "ready_for_release_review",
        controlsStatus: "manual_runtime_config_required",
        inventoryStatus: "manual_runtime_config_required",
        requiredActionCount: 1,
        nextAction: {
          key: "enable_runtime_config_manually",
          action: "perform_platform_runtime_config_enablement",
          requiredActor: "owner"
        },
        latestPackageId: "lgapkg_ready",
        writefulSchedulingAllowed: false,
        runtimeConfigChange: false,
        configChangeApplied: false
      }
    },
    approvalKeys: ["writefulExecutionApproval"]
  };
  const service = serviceWith(records);
  const result = service.review({
    workspaceId: "fanfan",
    learnerId: "fanfan"
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "approved");
  assert.equal(result.approvedForReleaseReview, true);
  assert.equal(result.packageRecordReadbackAvailable, true);
  assert.equal(result.packageRecordRequired, true);
  assert.equal(result.packageRecordPresent, true);
  assert.equal(result.latestPackage.packageId, "lgapkg_ready");
  assert.equal(result.latestPackage.packageSummary.summaryOnly, true);
  assert.equal(result.latestPackage.stepSummary.stepCount, 6);
  assert.equal(result.latestPackage.releaseDashboardSummary.status, "manual_runtime_config_required");
  assert.equal(result.packageReadback.latestPackageStepCount, 6);
  assert.equal(result.packageReadback.latestPackageDashboardStatus, "manual_runtime_config_required");
  assert.equal(result.packageReadback.latestPackageDashboardNextActionKey, "enable_runtime_config_manually");
  assert.equal(result.releaseReview.latestPackageId, "lgapkg_ready");
  assert.equal(result.releaseReview.packageRecordStatus, "ready_for_release_review");
  assert.equal(result.releaseReview.latestPackageStepCount, 6);
  assert.equal(result.releaseReview.latestPackageDashboardStatus, "manual_runtime_config_required");
  assert.equal(result.releaseReview.latestPackageDashboardRequiredActionCount, 1);
  assert.equal(result.releaseReview.nextAction, null);
  assert.equal(result.releaseReview.requiredActionCount, 0);
  assert.deepEqual(result.approvalSummary.approvalKeys, ["writefulExecutionApproval"]);
  assert.equal(records.packageInput.collectionRunId, "lgacrn_ready");
});

test("release review requires a ready release package record after approved decision", () => {
  const records = {
    collectionRun: {
      collectionRunId: "lgacrn_ready",
      status: "ready_for_release_review"
    },
    decision: {
      decisionId: "lgard_approved",
      collectionRunId: "lgacrn_ready",
      status: "approved",
      privacyClass: "summary_only"
    },
    approvalKeys: ["writefulExecutionApproval"]
  };
  const service = serviceWith(records);
  const result = service.review({
    workspaceId: "fanfan",
    learnerId: "fanfan"
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "package_record_required");
  assert.equal(result.approvedForReleaseReview, false);
  assert.equal(result.packageRecordRequired, true);
  assert.equal(result.packageRecordPresent, false);
  assert.equal(result.releaseReview.packageRecordStatus, "missing");
  assert.equal(result.releaseReview.nextAction.key, "record_release_package");
  assert.equal(result.releaseReview.nextAction.action, "run_smoke_release_package_write_record");
  assert.equal(result.releaseReview.requiredActionCount, 1);
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(records.packageInput.collectionRunId, "lgacrn_ready");
});

test("release review blocks when the latest package record is not ready", () => {
  const records = {
    collectionRun: {
      collectionRunId: "lgacrn_ready",
      status: "ready_for_release_review"
    },
    decision: {
      decisionId: "lgard_approved",
      collectionRunId: "lgacrn_ready",
      status: "approved",
      privacyClass: "summary_only"
    },
    packageRecord: {
      packageId: "lgapkg_blocked",
      collectionRunId: "lgacrn_ready",
      status: "blocked",
      privacyClass: "summary_only",
      stepSummary: {
        summaryOnly: true,
        status: "blocked",
        stepCount: 6,
        passingStepCount: 5,
        blockedStepCount: 1
      }
    }
  };
  const service = serviceWith(records);
  const result = service.review({
    workspaceId: "fanfan",
    learnerId: "fanfan"
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "package_record_blocked");
  assert.equal(result.approvedForReleaseReview, false);
  assert.equal(result.releaseReview.packageRecordStatus, "blocked");
  assert.equal(result.releaseReview.nextAction.key, "resolve_release_package_record");
  assert.equal(result.releaseReview.requiredActionCount, 1);
});

test("release review rejects privacy-risk input and missing dependencies", () => {
  const service = serviceWith({});
  const privacy = service.review({
    workspaceId: "fanfan",
    rawPrompt: "do not store"
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_automation_release_review_privacy_failed");

  const missing = createLearningAutomationReleaseReviewService({}).review({ workspaceId: "fanfan" });
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "learning_automation_release_review_readiness_unavailable");
});
