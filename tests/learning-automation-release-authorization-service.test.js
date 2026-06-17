"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createLearningAutomationReleaseAuthorizationService
} = require("../src/services/learning-automation-release-authorization-service");

function approvedReview(overrides = {}) {
  return Object.assign({
    ok: true,
    schemaVersion: "growth.learningAutomationReleaseReview.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    status: "approved",
    approvedForReleaseReview: true,
    collectionRunPresent: true,
    decisionPresent: true,
    packageRecordReadbackAvailable: true,
    packageRecordRequired: true,
    packageRecordPresent: true,
    advisoryOnly: true,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    latestCollectionRun: {
      collectionRunId: "lgacrn_ready_1",
      status: "ready_for_release_review",
      privacyClass: "summary_only"
    },
    latestDecision: {
      decisionId: "lgard_approved_1",
      collectionRunId: "lgacrn_ready_1",
      status: "approved",
      privacyClass: "summary_only"
    },
    latestPackage: {
      packageId: "lgapkg_ready_1",
      collectionRunId: "lgacrn_ready_1",
      status: "ready_for_release_review",
      packageVersion: "growth.learningAutomationReleasePackage.v1",
      privacyClass: "summary_only",
      packageSummary: {
        summaryOnly: true,
        latestPreflightReportId: "lgarpf_package_1",
        latestPreflightStatus: "ready_for_owner_release_activation",
        latestPreflightReadyForProductionDeployReview: true,
        latestPreflightReadyForOwnerReleaseActivation: true
      },
      stepSummary: {
        summaryOnly: true,
        stepCount: 6
      },
      releaseDashboardSummary: {
        schemaVersion: "growth.learningAutomationReleaseDashboard.summary.v1",
        summaryOnly: true,
        status: "manual_runtime_config_required",
        requiredActionCount: 1,
        readinessEvidencePresentCount: 30,
        readinessEvidenceMissingCount: 0,
        readinessEvidenceSourceBundleId: "lgerb_ready_1",
        latestReadinessSnapshotId: "lgrrs_ready_1",
        latestReadinessEvidencePresentCount: 30,
        latestReadinessEvidenceMissingCount: 0,
        latestReadinessEvidenceSourceBundleId: "lgerb_snapshot_1",
        latestPreflightReportId: "lgarpf_package_1",
        latestPreflightStatus: "ready_for_owner_release_activation",
        latestPreflightReadyForProductionDeployReview: true,
        latestPreflightReadyForOwnerReleaseActivation: true,
        persistedEvidenceKeys: ["ownerReviewEvidence"],
        nextAction: {
          key: "enable_runtime_config_manually",
          action: "perform_platform_runtime_config_enablement",
          requiredActor: "owner"
        },
        writefulSchedulingAllowed: false,
        runtimeConfigChange: false,
        configChangeApplied: false
      }
    },
    packageReadback: {
      schemaVersion: "growth.learningAutomationReleaseReview.packageReadback.v1",
      summaryOnly: true,
      packageRecordReadbackAvailable: true,
      packageRecordPresent: true,
      packageRecordStatus: "ready_for_release_review",
      latestPackageId: "lgapkg_ready_1",
      latestPackageStepCount: 6,
      latestPackageDashboardStatus: "manual_runtime_config_required",
      latestPackageDashboardNextActionKey: "enable_runtime_config_manually",
      latestPackageDashboardReadinessEvidencePresentCount: 30,
      latestPackageDashboardReadinessEvidenceMissingCount: 0,
      latestPackageDashboardReadinessEvidenceSourceBundleId: "lgerb_ready_1",
      latestPackageDashboardLatestReadinessEvidencePresentCount: 30,
      latestPackageDashboardLatestReadinessEvidenceMissingCount: 0,
      latestPackageDashboardLatestReadinessEvidenceSourceBundleId: "lgerb_snapshot_1",
      latestPackageDashboardRequiredActionCount: 1,
      latestPackageDashboardPreflightReportId: "lgarpf_package_1",
      latestPackageDashboardPreflightStatus: "ready_for_owner_release_activation",
      latestPackageDashboardPreflightReadyForProductionDeployReview: true,
      latestPackageDashboardPreflightReadyForOwnerReleaseActivation: true,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false
    },
    releaseReview: {
      schemaVersion: "growth.learningAutomationReleaseReview.summary.v1",
      summaryOnly: true,
      status: "approved",
      packageRecordReadbackAvailable: true,
      packageRecordRequired: true,
      packageRecordPresent: true,
      packageRecordStatus: "ready_for_release_review",
      latestPackageId: "lgapkg_ready_1",
      latestPackageStepCount: 6,
      latestPackageDashboardStatus: "manual_runtime_config_required",
      latestPackageDashboardNextActionKey: "enable_runtime_config_manually",
      latestPackageDashboardReadinessEvidencePresentCount: 30,
      latestPackageDashboardReadinessEvidenceMissingCount: 0,
      latestPackageDashboardReadinessEvidenceSourceBundleId: "lgerb_ready_1",
      latestPackageDashboardLatestReadinessEvidencePresentCount: 30,
      latestPackageDashboardLatestReadinessEvidenceMissingCount: 0,
      latestPackageDashboardLatestReadinessEvidenceSourceBundleId: "lgerb_snapshot_1",
      latestPackageDashboardRequiredActionCount: 1,
      latestPackageDashboardPreflightReportId: "lgarpf_package_1",
      latestPackageDashboardPreflightStatus: "ready_for_owner_release_activation",
      latestPackageDashboardPreflightReadyForProductionDeployReview: true,
      latestPackageDashboardPreflightReadyForOwnerReleaseActivation: true
    },
    approvalSummary: {
      schemaVersion: "growth.learningAutomationReleaseReview.approvalSummary.v1",
      summaryOnly: true,
      approvalKeys: ["writefulExecutionApproval"],
      releaseApproval: {
        writefulExecutionApproval: {
          approved: true,
          status: "approved"
        }
      },
      writefulSchedulingAllowed: false
    }
  }, overrides);
}

function serviceWith(records = {}) {
  return createLearningAutomationReleaseAuthorizationService({
    releaseReviewService: {
      review(input) {
        records.reviewInput = input;
        return records.review || approvedReview();
      }
    }
  });
}

test("release authorization grants summary-only execution authorization after approved review and approval key", () => {
  const records = {};
  const service = serviceWith(records);
  const result = service.authorize({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    collectionRunId: "lgacrn_ready_1"
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, "growth.learningAutomationReleaseAuthorization.v1");
  assert.equal(result.authorized, true);
  assert.equal(result.status, "authorized");
  assert.equal(result.reason, "learning_automation_release_authorization_granted");
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.runtimeConfigChange, false);
  assert.deepEqual(result.requiredApprovalKeys, ["writefulExecutionApproval"]);
  assert.deepEqual(result.missingApprovalKeys, []);
  assert.equal(result.latestCollectionRun.collectionRunId, "lgacrn_ready_1");
  assert.equal(result.review.packageRecordPresent, true);
  assert.equal(result.review.packageRecordStatus, "ready_for_release_review");
  assert.equal(result.review.latestPackageStepCount, 6);
  assert.equal(result.review.latestPackageDashboardStatus, "manual_runtime_config_required");
  assert.equal(result.review.latestPackageDashboardNextActionKey, "enable_runtime_config_manually");
  assert.equal(result.review.latestPackageDashboardReadinessEvidencePresentCount, 30);
  assert.equal(result.review.latestPackageDashboardLatestReadinessEvidenceSourceBundleId, "lgerb_snapshot_1");
  assert.equal(result.review.latestPackageDashboardPreflightReportId, "lgarpf_package_1");
  assert.equal(result.review.latestPackageDashboardPreflightReadyForOwnerReleaseActivation, true);
  assert.equal(result.packageReadback.latestPackageDashboardStatus, "manual_runtime_config_required");
  assert.equal(result.packageReadback.latestPackageDashboardReadinessEvidenceMissingCount, 0);
  assert.equal(result.packageReadback.latestPackageDashboardReadinessEvidenceSourceBundleId, "lgerb_ready_1");
  assert.equal(result.packageReadback.latestPackageDashboardRequiredActionCount, 1);
  assert.equal(result.packageReadback.latestPackageDashboardPreflightStatus, "ready_for_owner_release_activation");
  assert.equal(result.packageReadback.latestPackageDashboardPreflightReadyForProductionDeployReview, true);
  assert.equal(result.latestPackage.packageId, "lgapkg_ready_1");
  assert.equal(result.latestPackage.packageSummary.latestPreflightReportId, "lgarpf_package_1");
  assert.equal(result.latestPackage.stepSummary.stepCount, 6);
  assert.equal(result.latestPackage.releaseDashboardSummary.status, "manual_runtime_config_required");
  assert.equal(result.latestPackage.releaseDashboardSummary.latestPreflightReportId, "lgarpf_package_1");
  assert.equal(result.latestPackage.releaseDashboardSummary.readinessEvidencePresentCount, 30);
  assert.deepEqual(result.latestPackage.releaseDashboardSummary.persistedEvidenceKeys, ["ownerReviewEvidence"]);
  assert.equal(result.latestPackage.writefulSchedulingAllowed, false);
  assert.equal(records.reviewInput.collectionRunId, "lgacrn_ready_1");
});

test("release authorization blocks when release review is not approved or collection run is missing", () => {
  const notApproved = serviceWith({
    review: approvedReview({
      status: "ready_for_owner_decision",
      approvedForReleaseReview: false
    })
  }).authorize({ workspaceId: "weixin_fanfan" });

  assert.equal(notApproved.ok, true);
  assert.equal(notApproved.authorized, false);
  assert.equal(notApproved.reason, "learning_automation_release_authorization_review_not_approved");

  const missingRun = serviceWith({
    review: approvedReview({ latestCollectionRun: null })
  }).authorize({ workspaceId: "weixin_fanfan" });

  assert.equal(missingRun.authorized, false);
  assert.equal(missingRun.reason, "learning_automation_release_authorization_collection_run_missing");
});

test("release authorization requires the configured approval key", () => {
  const result = serviceWith({
    review: approvedReview({
      approvalSummary: {
        summaryOnly: true,
        approvalKeys: [],
        releaseApproval: {},
        writefulSchedulingAllowed: false
      }
    })
  }).authorize({
    workspaceId: "weixin_fanfan",
    requiredApprovalKeys: ["writefulExecutionApproval", "backgroundSchedulerApproval"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.authorized, false);
  assert.equal(result.reason, "learning_automation_release_authorization_approval_missing");
  assert.deepEqual(result.missingApprovalKeys, ["writefulExecutionApproval", "backgroundSchedulerApproval"]);
});

test("release authorization requires a readable ready release package record", () => {
  const missingPackage = serviceWith({
    review: approvedReview({
      status: "approved",
      approvedForReleaseReview: true,
      packageRecordRequired: true,
      packageRecordReadbackAvailable: true,
      packageRecordPresent: false,
      latestPackage: null,
      packageReadback: {
        summaryOnly: true,
        packageRecordReadbackAvailable: true,
        packageRecordPresent: false,
        packageRecordStatus: "missing",
        writefulSchedulingAllowed: false,
        runtimeConfigChange: false,
        configChangeApplied: false
      },
      releaseReview: {
        summaryOnly: true,
        status: "approved",
        packageRecordReadbackAvailable: true,
        packageRecordRequired: true,
        packageRecordPresent: false,
        packageRecordStatus: "missing"
      }
    })
  }).authorize({ workspaceId: "weixin_fanfan" });

  assert.equal(missingPackage.ok, true);
  assert.equal(missingPackage.authorized, false);
  assert.equal(missingPackage.reason, "learning_automation_release_authorization_package_record_missing");
  assert.equal(missingPackage.packageReadback.packageRecordPresent, false);

  const blockedPackage = serviceWith({
    review: approvedReview({
      packageRecordRequired: true,
      packageRecordPresent: true,
      packageReadback: {
        summaryOnly: true,
        packageRecordReadbackAvailable: true,
        packageRecordPresent: true,
        packageRecordStatus: "blocked",
        latestPackageId: "lgapkg_blocked",
        writefulSchedulingAllowed: false,
        runtimeConfigChange: false,
        configChangeApplied: false
      },
      releaseReview: {
        summaryOnly: true,
        status: "approved",
        packageRecordReadbackAvailable: true,
        packageRecordRequired: true,
        packageRecordPresent: true,
        packageRecordStatus: "blocked",
        latestPackageId: "lgapkg_blocked"
      }
    })
  }).authorize({ workspaceId: "weixin_fanfan" });

  assert.equal(blockedPackage.ok, true);
  assert.equal(blockedPackage.authorized, false);
  assert.equal(blockedPackage.reason, "learning_automation_release_authorization_package_record_not_ready");
});

test("release authorization rejects invalid review boundary and privacy-risk input", () => {
  const boundary = serviceWith({
    review: approvedReview({ writefulSchedulingAllowed: true })
  }).authorize({ workspaceId: "weixin_fanfan" });
  assert.equal(boundary.authorized, false);
  assert.equal(boundary.reason, "learning_automation_release_authorization_review_boundary_invalid");

  const privacy = serviceWith().authorize({
    workspaceId: "weixin_fanfan",
    rawPrompt: "do not store"
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_automation_release_authorization_privacy_failed");

  const privateInputValue = serviceWith().authorize({
    workspaceId: "weixin_fanfan",
    domain: "Bearer local-token"
  });
  assert.equal(privateInputValue.ok, false);
  assert.equal(privateInputValue.error, "learning_automation_release_authorization_privacy_failed");
  assert.deepEqual(privateInputValue.privateValueFindings, ["$.domain"]);

  const privateReviewValue = serviceWith({
    review: approvedReview({
      latestPackage: Object.assign({}, approvedReview().latestPackage, {
        releaseDashboardSummary: Object.assign({}, approvedReview().latestPackage.releaseDashboardSummary, {
          latestReadinessEvidenceSourceBundleId: "/Users/example/.homeai-qa/readiness.json"
        })
      })
    })
  }).authorize({ workspaceId: "weixin_fanfan" });
  assert.equal(privateReviewValue.ok, false);
  assert.equal(privateReviewValue.error, "learning_automation_release_authorization_review_privacy_failed");
  assert.equal(privateReviewValue.privateValueFindings.includes("$.latestPackage.releaseDashboardSummary.latestReadinessEvidenceSourceBundleId"), true);
  assert.equal(JSON.stringify(privateReviewValue).includes("/Users/example"), false);
});

test("release authorization fails closed when review service is missing or returns an error", () => {
  const missing = createLearningAutomationReleaseAuthorizationService({}).authorize({ workspaceId: "weixin_fanfan" });
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "learning_automation_release_authorization_review_unavailable");

  const failed = serviceWith({
    review: { ok: false, error: "release_review_failed" }
  }).authorize({ workspaceId: "weixin_fanfan" });
  assert.equal(failed.ok, false);
  assert.equal(failed.error, "release_review_failed");
  assert.equal(failed.authorized, false);
});
