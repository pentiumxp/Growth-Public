const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningOwnerAuditReviewService
} = require("../src/services/learning-owner-audit-review-service");

function completeFeedback(overrides = {}) {
  return Object.assign({
    ok: true,
    source: "growth-learning-profile-feedback-evidence-service",
    schemaVersion: "growth.learningProfileFeedbackEvidence.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "pass",
    complete: true,
    readyForAutomation: true,
    readyForNextPlan: true,
    scope: {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      taskCardId: "ltask_science_daily_1",
      evaluationId: "leval_daily_1",
      profileDeltaId: "lgpdelta_daily_1",
      evidenceId: "lgevd_daily_1",
      targetNodeIds: ["kg_science_fair_test"]
    },
    checks: [
      { key: "cycle_audit_complete", status: "pass" },
      { key: "evidence_ledger_present", status: "pass" },
      { key: "profile_delta_audit_present", status: "pass" },
      { key: "profile_v2_projected", status: "pass" },
      { key: "next_recommendation_available", status: "pass" },
      { key: "learning_loop_state_ready", status: "pass" }
    ],
    profile: { available: true, evidenceCount: 3, weaknessCount: 1 },
    evidence: { available: true, count: 1, sourceTypes: ["daily_evaluation"] },
    profileDelta: { available: true, count: 1, latestProfileDeltaId: "lgpdelta_daily_1" },
    recommendation: {
      available: true,
      mode: "trajectory",
      status: "pending",
      strategy: "repair",
      cardRole: "practice",
      targetNodeId: "kg_science_fair_test",
      targetNodeIds: ["kg_science_fair_test"]
    },
    loopState: {
      available: true,
      status: "ready_to_draft",
      nextAction: { action: "draft_daily_plan", enabled: true, targetNodeId: "kg_science_fair_test" },
      reward: { available: true, rewardSettlementCount: 1, totalRewardCoins: 8 }
    },
    selectedCompletedCycle: {
      cycleId: "cycle_science_daily_1",
      taskCardId: "ltask_science_daily_1",
      evaluationId: "leval_daily_1",
      profileDeltaId: "lgpdelta_daily_1",
      evidenceId: "lgevd_daily_1",
      completedAt: "2026-06-17T08:00:00.000Z"
    },
    summary: {
      readyForNextPlan: true,
      missingRequired: [],
      cycleComplete: true,
      evidenceCount: 1,
      profileDeltaCount: 1,
      profileEvidenceCount: 3,
      profileWeaknessCount: 1,
      rewardSettlementCount: 1,
      totalRewardCoins: 8,
      recommendationStrategy: "repair",
      loopStatus: "ready_to_draft",
      selectedCycleId: "cycle_science_daily_1",
      selectedTaskCardId: "ltask_science_daily_1",
      nextAction: "draft_daily_plan"
    }
  }, overrides);
}

function createHarness(overrides = {}) {
  const calls = [];
  const reviews = [];
  const repository = overrides.repository || {
    recordReview(input) {
      calls.push({ type: "recordReview", input });
      const review = Object.assign({
        schemaVersion: "growth.learningOwnerAuditReview.v1",
        privacyClass: "summary_only",
        summaryOnly: true,
        reviewId: "lgaudit_service_1",
        createdAt: input.reviewedAt,
        updatedAt: input.reviewedAt
      }, input);
      reviews.unshift(review);
      return { ok: true, duplicate: false, review };
    },
    listReviews(input) {
      calls.push({ type: "listReviews", input });
      return reviews;
    }
  };
  const profileFeedbackService = overrides.profileFeedbackService || {
    evaluate(input) {
      calls.push({ type: "profileFeedback", input });
      return completeFeedback();
    }
  };
  const service = createLearningOwnerAuditReviewService({
    repository,
    profileFeedbackService,
    now: () => new Date("2026-06-17T12:00:00.000Z")
  });
  return { calls, reviews, service };
}

test("owner audit review service records completed-cycle review through profile feedback and repository", () => {
  const { calls, service } = createHarness();
  const result = service.review({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domain: "science",
    subject: "science",
    taskCardId: "ltask_science_daily_1",
    evaluationId: "leval_daily_1",
    targetNodeIds: ["kg_science_fair_test"],
    decision: "accepted",
    ownerNote: "Review is summary only.",
    reviewedBy: "weixin_owner"
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, "growth.learningOwnerAuditReview.v1");
  assert.equal(result.privacyClass, "summary_only");
  assert.equal(result.summaryOnly, true);
  assert.equal(result.decision, "accepted");
  assert.equal(result.status, "reviewed");
  assert.equal(result.scope.taskCardId, "ltask_science_daily_1");
  assert.equal(result.profileFeedback.summary.readyForNextPlan, true);
  assert.equal(result.auditSummary.passCheckCount, 6);
  assert.equal(result.recommendation.strategy, "repair");
  assert.equal(result.nextAction.action, "draft_daily_plan");
  assert.equal(JSON.stringify(result).includes("rawPrompt"), false);
  assert.deepEqual(calls.map((call) => call.type), ["profileFeedback", "recordReview"]);
  assert.equal(calls[1].input.feedbackSummary.evidenceCount, 1);
});

test("owner audit review service lists persisted reviews without profile recomputation", () => {
  const { calls, service } = createHarness();
  const recorded = service.review({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    taskCardId: "ltask_science_daily_1",
    decision: "accepted"
  });
  assert.equal(recorded.ok, true);
  const listed = service.listReviews({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    taskCardId: "ltask_science_daily_1"
  });

  assert.equal(listed.ok, true);
  assert.equal(listed.schemaVersion, "growth.learningOwnerAuditReviewList.v1");
  assert.equal(listed.privacyClass, "summary_only");
  assert.equal(listed.count, 1);
  assert.equal(listed.reviews[0].reviewId, "lgaudit_service_1");
  assert.deepEqual(calls.map((call) => call.type), ["profileFeedback", "recordReview", "listReviews"]);
});

test("owner audit review service requires explicit cycle selector unless auto-select is requested", () => {
  const { service } = createHarness();

  const missing = service.review({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    decision: "accepted"
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "learning_owner_audit_review_cycle_selector_required");

  const auto = service.review({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    decision: "accepted",
    autoSelectLatestCompletedCycle: true
  });
  assert.equal(auto.ok, true);
});

test("owner audit review service fails closed for privacy risk, invalid decision, and feedback failures", () => {
  const privacyHarness = createHarness();
  const privacy = privacyHarness.service.review({
    workspaceId: "weixin_fanfan",
    taskCardId: "ltask_science_daily_1",
    decision: "accepted",
    rawPrompt: "do not store"
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_owner_audit_review_privacy_failed");

  const invalid = createHarness().service.review({
    workspaceId: "weixin_fanfan",
    taskCardId: "ltask_science_daily_1",
    decision: "ship_it"
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error, "learning_owner_audit_review_decision_invalid");

  const failedFeedback = createHarness({
    profileFeedbackService: {
      evaluate() {
        return { ok: false, error: "profile_feedback_cycle_selector_required" };
      }
    }
  }).service.review({
    workspaceId: "weixin_fanfan",
    taskCardId: "ltask_science_daily_1",
    decision: "accepted"
  });
  assert.equal(failedFeedback.ok, false);
  assert.equal(failedFeedback.error, "profile_feedback_cycle_selector_required");
});

test("owner audit review service records blocked review for dependency failure only when decision is blocked", () => {
  const { service } = createHarness({
    profileFeedbackService: {
      evaluate() {
        return { ok: false, status: "blocked", error: "profile_feedback_profile_v2_unavailable" };
      }
    }
  });
  const result = service.review({
    workspaceId: "weixin_fanfan",
    taskCardId: "ltask_science_daily_1",
    decision: "blocked",
    ownerNote: "Profile feedback dependency was unavailable."
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "blocked");
  assert.equal(result.profileFeedback.ok, false);
  assert.equal(result.profileFeedback.status, "blocked");
});
