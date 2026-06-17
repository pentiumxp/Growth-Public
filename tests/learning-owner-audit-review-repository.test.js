const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningOwnerAuditReviewRepository
} = require("../src/stores/growth-learning-sqlite/owner-audit-reviews");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-owner-audit-review-"));
  const dbPath = path.join(dir, "owner-audit-review.sqlite3");
  const repository = createLearningOwnerAuditReviewRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-17T12:00:00.000Z")
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sampleReview(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    decision: "accepted",
    status: "reviewed",
    planDraftId: "lgplan_science_1",
    taskCardId: "ltask_science_daily_1",
    evaluationId: "leval_daily_1",
    profileDeltaId: "lgpdelta_daily_1",
    evidenceId: "lgevd_daily_1",
    targetNodeIds: ["kg_science_fair_test"],
    selector: {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      taskCardId: "ltask_science_daily_1",
      evaluationId: "leval_daily_1",
      targetNodeIds: ["kg_science_fair_test"]
    },
    feedbackSummary: {
      status: "pass",
      cycleComplete: true,
      readyForNextPlan: true,
      evidenceCount: 1,
      profileDeltaCount: 1,
      nextAction: "draft_daily_plan"
    },
    auditSummary: {
      checkCount: 6,
      passCheckCount: 6,
      missingCheckCount: 0,
      blockedCheckCount: 0
    },
    recommendation: {
      available: true,
      strategy: "repair",
      targetNodeId: "kg_science_fair_test"
    },
    nextAction: {
      action: "draft_daily_plan",
      enabled: true
    },
    ownerNote: "Reviewed summary only.",
    reviewedBy: "weixin_owner",
    privacyClass: "summary_only"
  }, overrides);
}

test("owner audit review repository records and lists summary-only reviews", () => {
  withRepository(({ repository }) => {
    const saved = repository.recordReview(sampleReview());

    assert.equal(saved.ok, true);
    assert.equal(saved.duplicate, false);
    assert.match(saved.review.reviewId, /^lgaudit_/);
    assert.equal(saved.review.schemaVersion, "growth.learningOwnerAuditReview.v1");
    assert.equal(saved.review.privacyClass, "summary_only");
    assert.equal(saved.review.summaryOnly, true);
    assert.equal(saved.review.decision, "accepted");
    assert.equal(saved.review.status, "reviewed");
    assert.equal(saved.review.taskCardId, "ltask_science_daily_1");
    assert.equal(saved.review.feedbackSummary.readyForNextPlan, true);
    assert.equal(saved.review.auditSummary.passCheckCount, 6);
    assert.equal(saved.review.recommendation.strategy, "repair");
    assert.equal(saved.review.nextAction.action, "draft_daily_plan");
    assert.equal(JSON.stringify(saved.review).includes("rawPrompt"), false);

    const listed = repository.listReviews({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      taskCardId: "ltask_science_daily_1",
      decision: "accepted",
      limit: 5
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].reviewId, saved.review.reviewId);
  });
});

test("owner audit review repository keeps multiple decisions ordered by time", () => {
  withRepository(({ repository }) => {
    const first = repository.recordReview(sampleReview({
      decision: "needs_follow_up",
      status: "needs_follow_up",
      reviewedAt: "2026-06-17T12:00:01.000Z"
    }));
    const second = repository.recordReview(sampleReview({
      decision: "accepted",
      status: "reviewed",
      reviewedAt: "2026-06-17T12:00:02.000Z"
    }));

    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    const listed = repository.listReviews({ workspaceId: "weixin_fanfan", limit: 10 });
    assert.equal(listed.length, 2);
    assert.equal(listed[0].decision, "accepted");
    assert.equal(listed[1].decision, "needs_follow_up");
    assert.equal(repository.listReviews({ workspaceId: "weixin_fanfan", status: "needs_follow_up" }).length, 1);
  });
});

test("owner audit review repository rejects private payloads and non-summary writes", () => {
  withRepository(({ repository }) => {
    const privacyKey = repository.recordReview(sampleReview({
      feedbackSummary: { rawPrompt: "do not store" }
    }));
    assert.equal(privacyKey.ok, false);
    assert.equal(privacyKey.error, "learning_owner_audit_review_privacy_failed");
    assert.equal(privacyKey.privacyFindings.includes("$.feedbackSummary.rawPrompt"), true);

    const privateValue = repository.recordReview(sampleReview({
      auditSummary: { artifactPath: "/Users/example/.homeai-qa/raw.json" }
    }));
    assert.equal(privateValue.ok, false);
    assert.equal(privateValue.error, "learning_owner_audit_review_privacy_failed");
    assert.equal(privateValue.privateValueFindings.includes("$.auditSummary.artifactPath"), true);

    const privacyClass = repository.recordReview(sampleReview({ privacyClass: "raw_private" }));
    assert.equal(privacyClass.ok, false);
    assert.equal(privacyClass.error, "learning_owner_audit_review_privacy_class_required");
  });
});

test("owner audit review repository migrates bounded columns on existing tables", () => {
  withRepository(({ dbPath, repository }) => {
    const db = new DatabaseSync(dbPath, { open: true });
    try {
      db.exec(`
        CREATE TABLE learning_growth_owner_audit_reviews (
          review_id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
    } finally {
      db.close();
    }

    const saved = repository.recordReview(sampleReview());
    assert.equal(saved.ok, true);
    assert.equal(saved.review.feedbackSummary.status, "pass");
    assert.equal(saved.review.nextAction.action, "draft_daily_plan");
  });
});
