"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createLearningAutomationReleaseClosureService
} = require("../src/services/learning-automation-release-closure-service");

function approvedReview(overrides = {}) {
  return Object.assign({
    ok: true,
    schemaVersion: "growth.learningAutomationReleaseReview.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    status: "approved",
    readyForReleaseReview: true,
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
      runId: "lgacrn_ready_1",
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
      requiredActionCount: 0,
      nextAction: null,
      missingCheckKeys: [],
      blockedCheckKeys: [],
      missingEvidenceKeys: []
    }
  }, overrides);
}

function authorizedGate(overrides = {}) {
  return Object.assign({
    ok: true,
    schemaVersion: "growth.learningAutomationReleaseAuthorization.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    status: "authorized",
    authorized: true,
    reason: "learning_automation_release_authorization_granted",
    requiredApprovalKeys: ["writefulExecutionApproval"],
    approvalKeys: ["writefulExecutionApproval"],
    missingApprovalKeys: [],
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    latestCollectionRun: {
      collectionRunId: "lgacrn_ready_1",
      runId: "lgacrn_ready_1",
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
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false
    }
  }, overrides);
}

function serviceWith(records = {}) {
  return createLearningAutomationReleaseClosureService({
    releaseReviewService: {
      review(input) {
        records.reviewInput = input;
        return records.review || approvedReview();
      }
    },
    releaseAuthorizationService: {
      authorize(input) {
        records.gateInput = input;
        return records.gate || authorizedGate();
      }
    }
  });
}

test("release closure summarizes ready backend evidence without enabling writeful scheduling", () => {
  const records = {};
  const service = serviceWith(records);
  const result = service.summarize({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    collectionRunId: "lgacrn_ready_1"
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, "growth.learningAutomationReleaseClosure.v1");
  assert.equal(result.status, "ready_for_owner_release_activation");
  assert.equal(result.backendEvidenceComplete, true);
  assert.equal(result.readyForOwnerReleaseActivation, true);
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.runtimeConfigChange, false);
  assert.equal(result.releaseClosure.requiredActionCount, 0);
  assert.equal(result.latestCollectionRun.collectionRunId, "lgacrn_ready_1");
  assert.equal(result.latestPackage.packageId, "lgapkg_ready_1");
  assert.equal(result.latestPackage.stepSummary.stepCount, 6);
  assert.equal(result.latestPackage.releaseDashboardSummary.status, "manual_runtime_config_required");
  assert.equal(result.latestPackage.releaseDashboardSummary.readinessEvidencePresentCount, 30);
  assert.deepEqual(result.latestPackage.releaseDashboardSummary.persistedEvidenceKeys, ["ownerReviewEvidence"]);
  assert.equal(result.review.packageRecordPresent, true);
  assert.equal(result.review.latestPackageDashboardStatus, "manual_runtime_config_required");
  assert.equal(result.review.latestPackageDashboardReadinessEvidencePresentCount, 30);
  assert.equal(result.executionGate.packageReadback.latestPackageDashboardStatus, "manual_runtime_config_required");
  assert.equal(result.executionGate.packageReadback.latestPackageDashboardReadinessEvidenceSourceBundleId, "lgerb_ready_1");
  assert.equal(result.packageReadback.latestPackageDashboardNextActionKey, "enable_runtime_config_manually");
  assert.equal(result.packageReadback.latestPackageDashboardLatestReadinessEvidenceSourceBundleId, "lgerb_snapshot_1");
  assert.equal(result.releaseClosure.packageRecordStatus, "ready_for_release_review");
  assert.equal(result.releaseClosure.latestPackageId, "lgapkg_ready_1");
  assert.equal(result.releaseClosure.latestPackageStepCount, 6);
  assert.equal(result.releaseClosure.latestPackageDashboardStatus, "manual_runtime_config_required");
  assert.equal(result.releaseClosure.latestPackageDashboardReadinessEvidencePresentCount, 30);
  assert.equal(result.releaseClosure.latestPackageDashboardRequiredActionCount, 1);
  assert.equal(records.reviewInput.collectionRunId, "lgacrn_ready_1");
  assert.equal(records.gateInput.collectionRunId, "lgacrn_ready_1");
});

test("release closure reports collection run and Owner decision gaps from review state", () => {
  const collectionRequired = serviceWith({
    review: approvedReview({
      status: "collection_run_required",
      approvedForReleaseReview: false,
      collectionRunRequired: true,
      collectionRunPresent: false,
      decisionPresent: false,
      releaseReview: {
        nextAction: {
          key: "record_release_collection_run",
          action: "run_smoke_release_collection_run_write_record",
          requiredActor: "owner"
        },
        missingCheckKeys: [],
        blockedCheckKeys: [],
        missingEvidenceKeys: [],
        requiredActionCount: 1
      }
    })
  }).summarize({ workspaceId: "weixin_fanfan" });

  assert.equal(collectionRequired.status, "collection_run_required");
  assert.equal(collectionRequired.backendEvidenceComplete, false);
  assert.equal(collectionRequired.releaseClosure.nextAction.key, "record_release_collection_run");

  const ownerDecision = serviceWith({
    review: approvedReview({
      status: "ready_for_owner_decision",
      approvedForReleaseReview: false,
      collectionRunPresent: true,
      decisionPresent: false,
      releaseReview: {
        nextAction: {
          key: "record_release_decision",
          action: "run_smoke_release_decision_or_owner_route",
          requiredActor: "owner"
        },
        missingCheckKeys: [],
        blockedCheckKeys: [],
        missingEvidenceKeys: [],
        requiredActionCount: 1
      }
    })
  }).summarize({ workspaceId: "weixin_fanfan" });

  assert.equal(ownerDecision.status, "owner_decision_required");
  assert.equal(ownerDecision.releaseClosure.nextAction.key, "record_release_decision");
});

test("release closure reports missing approval keys after approved review", () => {
  const result = serviceWith({
    gate: authorizedGate({
      status: "blocked",
      authorized: false,
      reason: "learning_automation_release_authorization_approval_missing",
      approvalKeys: [],
      missingApprovalKeys: ["writefulExecutionApproval", "backgroundSchedulerApproval"]
    })
  }).summarize({
    workspaceId: "weixin_fanfan",
    requiredApprovalKeys: ["writefulExecutionApproval", "backgroundSchedulerApproval"]
  });

  assert.equal(result.status, "approval_required");
  assert.equal(result.backendEvidenceComplete, false);
  assert.deepEqual(result.releaseClosure.missingApprovalKeys, ["writefulExecutionApproval", "backgroundSchedulerApproval"]);
  assert.deepEqual(result.releaseClosure.requiredActions.map((item) => item.approvalKey), [
    "writefulExecutionApproval",
    "backgroundSchedulerApproval"
  ]);
});

test("release closure surfaces release package record gate before activation", () => {
  const result = serviceWith({
    review: approvedReview({
      status: "package_record_required",
      approvedForReleaseReview: false,
      packageRecordRequired: true,
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
        status: "package_record_required",
        packageRecordReadbackAvailable: true,
        packageRecordRequired: true,
        packageRecordPresent: false,
        packageRecordStatus: "missing",
        nextAction: {
          key: "record_release_package",
          action: "run_smoke_release_package_write_record",
          requiredActor: "owner"
        },
        missingCheckKeys: [],
        blockedCheckKeys: [],
        missingEvidenceKeys: [],
        requiredActionCount: 1
      }
    }),
    gate: authorizedGate({
      status: "blocked",
      authorized: false,
      reason: "learning_automation_release_authorization_package_record_missing",
      latestPackage: null,
      packageReadback: {
        summaryOnly: true,
        packageRecordReadbackAvailable: true,
        packageRecordPresent: false,
        packageRecordStatus: "missing",
        writefulSchedulingAllowed: false,
        runtimeConfigChange: false,
        configChangeApplied: false
      }
    })
  }).summarize({ workspaceId: "weixin_fanfan" });

  assert.equal(result.status, "package_record_required");
  assert.equal(result.backendEvidenceComplete, false);
  assert.equal(result.releaseClosure.packageRecordPresent, false);
  assert.equal(result.releaseClosure.packageRecordStatus, "missing");
  assert.equal(result.releaseClosure.nextAction.key, "record_release_package");
  assert.equal(result.releaseClosure.requiredActionCount, 1);
  assert.equal(result.readyForOwnerReleaseActivation, false);
});

test("release closure rejects privacy-risk input and missing dependencies", () => {
  const privacy = serviceWith().summarize({
    workspaceId: "weixin_fanfan",
    rawPrompt: "do not store"
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_automation_release_closure_privacy_failed");

  const privateInputValue = serviceWith().summarize({
    workspaceId: "weixin_fanfan",
    domain: "Bearer local-token"
  });
  assert.equal(privateInputValue.ok, false);
  assert.equal(privateInputValue.error, "learning_automation_release_closure_privacy_failed");
  assert.deepEqual(privateInputValue.privateValueFindings, ["$.domain"]);

  const privateReviewValue = serviceWith({
    review: approvedReview({
      latestPackage: Object.assign({}, approvedReview().latestPackage, {
        releaseDashboardSummary: Object.assign({}, approvedReview().latestPackage.releaseDashboardSummary, {
          readinessEvidenceSourceBundleId: "/Users/example/.homeai-qa/review-bundle.json"
        })
      })
    })
  }).summarize({ workspaceId: "weixin_fanfan" });
  assert.equal(privateReviewValue.ok, false);
  assert.equal(privateReviewValue.error, "learning_automation_release_closure_review_privacy_failed");
  assert.equal(privateReviewValue.privateValueFindings.includes("$.latestPackage.releaseDashboardSummary.readinessEvidenceSourceBundleId"), true);
  assert.equal(JSON.stringify(privateReviewValue).includes("/Users/example"), false);

  const privateAuthorizationValue = serviceWith({
    gate: authorizedGate({
      packageReadback: Object.assign({}, authorizedGate().packageReadback, {
        latestPackageDashboardReadinessEvidenceSourceBundleId: "/Users/example/.homeai-qa/gate-bundle.json"
      })
    })
  }).summarize({ workspaceId: "weixin_fanfan" });
  assert.equal(privateAuthorizationValue.ok, false);
  assert.equal(privateAuthorizationValue.error, "learning_automation_release_closure_authorization_privacy_failed");
  assert.equal(privateAuthorizationValue.privateValueFindings.includes("$.packageReadback.latestPackageDashboardReadinessEvidenceSourceBundleId"), true);
  assert.equal(JSON.stringify(privateAuthorizationValue).includes("/Users/example"), false);

  const missingReview = createLearningAutomationReleaseClosureService({}).summarize({ workspaceId: "weixin_fanfan" });
  assert.equal(missingReview.ok, false);
  assert.equal(missingReview.error, "learning_automation_release_closure_review_unavailable");

  const missingGate = createLearningAutomationReleaseClosureService({
    releaseReviewService: {
      review() {
        return approvedReview();
      }
    }
  }).summarize({ workspaceId: "weixin_fanfan" });
  assert.equal(missingGate.ok, false);
  assert.equal(missingGate.error, "learning_automation_release_closure_authorization_unavailable");
});
