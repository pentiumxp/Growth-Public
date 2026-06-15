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
  assert.equal(result.latestCollectionRun.collectionRunId, "lgacrn_ready");
  assert.equal(result.releaseReview.nextAction.key, "record_release_decision");
  assert.equal(records.decisionInput.collectionRunId, "lgacrn_ready");
});

test("release review reports approved advisory state from latest decision", () => {
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
  assert.equal(result.status, "approved");
  assert.equal(result.approvedForReleaseReview, true);
  assert.equal(result.releaseReview.nextAction, null);
  assert.equal(result.releaseReview.requiredActionCount, 0);
  assert.deepEqual(result.approvalSummary.approvalKeys, ["writefulExecutionApproval"]);
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
