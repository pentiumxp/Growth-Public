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
