const assert = require("node:assert/strict");
const test = require("node:test");

const { createLearningOwnerReviewSignalService } = require("../src/services/learning-owner-review-signal-service");

function serviceWithReviews(reviews = [], capture = []) {
  return createLearningOwnerReviewSignalService({
    repository: {
      listReviews(input) {
        capture.push(input);
        return reviews;
      }
    }
  });
}

test("owner review signal service summarizes latest summary-only review for planner input", () => {
  const calls = [];
  const service = serviceWithReviews([
    {
      reviewId: "lgaudit_review_old",
      decision: "accepted",
      status: "reviewed",
      taskCardId: "ltask_old",
      targetNodeIds: ["kg_old"],
      createdAt: "2026-06-15T08:00:00.000Z",
      ownerNote: "must not leak"
    },
    {
      reviewId: "lgaudit_review_new",
      decision: "needs_follow_up",
      status: "needs_follow_up",
      taskCardId: "ltask_science_1",
      evaluationId: "leval_science_1",
      profileDeltaId: "lgpdelta_science_1",
      correctionId: "",
      targetNodeIds: ["kg_science_fair_test"],
      createdAt: "2026-06-16T08:00:00.000Z",
      updatedAt: "2026-06-16T08:05:00.000Z",
      rawPrompt: "must not leak"
    }
  ], calls);

  const result = service.ownerReviewSignal({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    targetNodeIds: ["kg_science_fair_test"],
    limit: 10
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, "growth.learningOwnerReviewSignal.v1");
  assert.equal(result.privacyClass, "summary_only");
  assert.equal(result.status, "needs_follow_up");
  assert.equal(result.reviewCount, 1);
  assert.equal(result.latestReview.reviewId, "lgaudit_review_new");
  assert.equal(result.summary.latestDecision, "needs_follow_up");
  assert.equal(result.summary.followUpRequired, true);
  assert.equal(result.summary.useForNextPlan, true);
  assert.equal(result.plannerSignal.strategyBias, "prefer_low_pressure_repair_or_owner_follow_up");
  assert.equal(result.nextAction.action, "inspect_owner_follow_up");
  assert.equal(result.nextAction.enabled, false);
  assert.deepEqual(calls[0].targetNodeIds, undefined);
  assert.equal(calls[0].workspaceId, "weixin_fanfan");
  assert.equal(JSON.stringify(result).includes("must not leak"), false);
  assert.equal(JSON.stringify(result).includes("ownerNote"), false);
  assert.equal(JSON.stringify(result).includes("rawPrompt"), false);
});

test("owner review signal service reports missing review without blocking next plan", () => {
  const service = serviceWithReviews([]);

  const result = service.ownerReviewSignal({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    targetNodeIds: ["kg_science_fair_test"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "missing");
  assert.equal(result.summary.ownerReviewed, false);
  assert.equal(result.summary.followUpRequired, false);
  assert.equal(result.summary.useForNextPlan, true);
  assert.equal(result.plannerSignal.strategyBias, "use_profile_without_owner_review");
  assert.equal(result.nextAction.action, "optional_owner_review");
});

test("owner review signal service treats blocked reviews as not usable for next plan", () => {
  const service = serviceWithReviews([{
    reviewId: "lgaudit_blocked",
    decision: "blocked",
    status: "blocked",
    taskCardId: "ltask_science_1",
    targetNodeIds: ["kg_science_fair_test"],
    createdAt: "2026-06-16T08:00:00.000Z"
  }]);

  const result = service.ownerReviewSignal({
    workspaceId: "weixin_fanfan",
    targetNodeIds: ["kg_science_fair_test"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "blocked");
  assert.equal(result.summary.followUpRequired, true);
  assert.equal(result.summary.useForNextPlan, false);
  assert.equal(result.plannerSignal.strategyBias, "resolve_owner_review_blocker");
  assert.equal(result.nextAction.action, "resolve_owner_review_blocker");
});

test("owner review signal service fails closed for privacy-risk input and missing repository", () => {
  const missing = createLearningOwnerReviewSignalService();
  assert.equal(missing.ownerReviewSignal({ workspaceId: "weixin_fanfan" }).ok, false);
  assert.equal(missing.ownerReviewSignal({ workspaceId: "weixin_fanfan" }).error, "learning_owner_review_signal_repository_unavailable");

  const service = serviceWithReviews([]);
  const result = service.ownerReviewSignal({
    workspaceId: "weixin_fanfan",
    rawPrompt: "do not accept"
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_owner_review_signal_privacy_failed");
  assert.equal(result.privacyFindings.includes("$.rawPrompt"), true);
});
