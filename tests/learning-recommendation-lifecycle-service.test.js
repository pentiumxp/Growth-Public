const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningRecommendationLifecycleService,
  lifecycleItem,
  publicScope,
  reviewScope
} = require("../src/services/learning-recommendation-lifecycle-service");
const { createMasteryProfileRepository } = require("../src/stores/growth-learning-sqlite/mastery-profile");

function withTrajectoryDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-recommendation-lifecycle-"));
  const dbPath = path.join(dir, "recommendation-lifecycle.sqlite3");
  const setup = new DatabaseSync(dbPath);
  try {
    setup.exec(`
      CREATE TABLE learning_growth_card_trajectories (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        learner_id TEXT NOT NULL,
        program_id TEXT NOT NULL,
        task_card_id TEXT NOT NULL,
        source_evaluation_id TEXT NOT NULL DEFAULT '',
        strategy TEXT NOT NULL DEFAULT '',
        difficulty_band TEXT NOT NULL DEFAULT '',
        target_node_ids_json TEXT NOT NULL DEFAULT '[]',
        performance_summary TEXT NOT NULL DEFAULT '',
        confirmed_strengths_json TEXT NOT NULL DEFAULT '[]',
        remaining_weaknesses_json TEXT NOT NULL DEFAULT '[]',
        mastery_changes_json TEXT NOT NULL DEFAULT '[]',
        next_recommendation_json TEXT NOT NULL DEFAULT '{}',
        raw_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  } finally {
    setup.close();
  }
  const repository = createMasteryProfileRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    }
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function seedTrajectories(repository) {
  const base = {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    strategy: "stabilize",
    difficultyBand: "foundation",
    targetNodeIds: ["kg_science_variables"],
    performanceSummary: "Bounded summary only.",
    remainingWeaknesses: ["Needs variable-control practice."],
    masteryChanges: [{ nodeId: "kg_science_variables", from: "new", to: "developing" }],
    nextRecommendation: {
      status: "pending",
      strategy: "stabilize",
      cardRole: "practice",
      difficultyBand: "foundation",
      supportLevel: "guided",
      targetNodeIds: ["kg_science_variables"],
      reason: "Use one low-pressure variable-control practice card."
    }
  };
  const accepted = repository.recordCardTrajectory(Object.assign({}, base, {
    id: "lgtraj_accepted",
    taskCardId: "ltask_source_accepted",
    sourceEvaluationId: "eval_accepted",
    createdAt: "2026-06-16T01:00:00.000Z"
  }));
  repository.markTrajectoryRecommendationAccepted({
    trajectoryId: accepted.trajectory.id,
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    generatedTaskCardId: "ltask_generated_accepted",
    generatedLearningGraphPlanId: "lgp_generated_accepted",
    acceptedAt: "2026-06-16T01:10:00.000Z"
  });
  const pending = repository.recordCardTrajectory(Object.assign({}, base, {
    id: "lgtraj_superseded",
    taskCardId: "ltask_source_superseded",
    sourceEvaluationId: "eval_superseded",
    createdAt: "2026-06-16T02:00:00.000Z"
  }));
  assert.equal(pending.ok, true);
  const newest = repository.recordCardTrajectory(Object.assign({}, base, {
    id: "lgtraj_pending",
    taskCardId: "ltask_source_pending",
    sourceEvaluationId: "eval_pending",
    createdAt: "2026-06-16T03:00:00.000Z",
    nextRecommendation: Object.assign({}, base.nextRecommendation, {
      strategy: "repair",
      difficultyBand: "repair",
      reason: "Repair the newest variable-control gap."
    })
  }));
  assert.equal(newest.ok, true);
}

test("recommendation lifecycle service lists summary-only statuses and counts", () => {
  withTrajectoryDb(({ repository }) => {
    seedTrajectories(repository);
    const service = createLearningRecommendationLifecycleService({ repository });

    const result = service.listLifecycle({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      limit: 10
    });

    assert.equal(result.ok, true);
    assert.equal(result.schemaVersion, "growth.recommendationLifecycle.v1");
    assert.equal(result.privacyClass, "summary_only");
    assert.equal(result.summaryOnly, true);
    assert.equal(result.count, 3);
    assert.equal(result.summary.pendingCount, 1);
    assert.equal(result.summary.acceptedCount, 1);
    assert.equal(result.summary.supersededCount, 1);
    assert.equal(result.summary.hasPending, true);
    assert.equal(result.summary.hasAccepted, true);
    assert.equal(result.summary.hasSuperseded, true);
    assert.equal(result.writePerformed, false);
    assert.equal(result.writesPerformed, false);
    const accepted = result.lifecycle.find((item) => item.status === "accepted");
    assert.equal(accepted.generatedTaskCardId, "ltask_generated_accepted");
    assert.equal(accepted.generatedLearningGraphPlanId, "lgp_generated_accepted");
    const superseded = result.lifecycle.find((item) => item.status === "superseded");
    assert.equal(superseded.supersededByTrajectoryId, "lgtraj_pending");
    assert.equal(JSON.stringify(result).includes("Bounded summary only."), false);
    assert.equal(JSON.stringify(result).includes("rawAnswer"), false);
  });
});

test("recommendation lifecycle service filters by status, node, and source selector", () => {
  withTrajectoryDb(({ repository }) => {
    seedTrajectories(repository);
    const service = createLearningRecommendationLifecycleService({ repository });

    const pending = service.listLifecycle({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      status: "pending",
      targetNodeIds: ["kg_science_variables"],
      limit: 5
    });
    assert.equal(pending.ok, true);
    assert.equal(pending.count, 1);
    assert.equal(pending.lifecycle[0].trajectoryId, "lgtraj_pending");
    assert.deepEqual(pending.lifecycle[0].targetNodeIds, ["kg_science_variables"]);

    const accepted = service.listLifecycle({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      taskCardId: "ltask_source_accepted"
    });
    assert.equal(accepted.count, 1);
    assert.equal(accepted.lifecycle[0].status, "accepted");
  });
});

test("recommendation lifecycle service records Owner skipped and expired decisions", () => {
  withTrajectoryDb(({ repository }) => {
    seedTrajectories(repository);
    const service = createLearningRecommendationLifecycleService({ repository });

    const skipped = service.reviewRecommendation({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      trajectoryId: "lgtraj_pending",
      status: "skipped",
      reviewedBy: "weixin_stephen",
      decisionReasonCode: "too_much_pressure_today",
      statusUpdatedAt: "2026-06-16T04:00:00.000Z"
    });
    assert.equal(skipped.ok, true);
    assert.equal(skipped.schemaVersion, "growth.recommendationLifecycle.v1");
    assert.equal(skipped.privacyClass, "summary_only");
    assert.equal(skipped.writePerformed, true);
    assert.equal(skipped.previousStatus, "pending");
    assert.equal(skipped.recommendation.status, "skipped");
    assert.equal(skipped.recommendation.skippedAt, "2026-06-16T04:00:00.000Z");
    assert.equal(skipped.recommendation.decisionReasonCode, "too_much_pressure_today");
    assert.equal(JSON.stringify(skipped).includes("Bounded summary only."), false);

    const duplicate = service.reviewRecommendation({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      trajectoryId: "lgtraj_pending",
      status: "skipped"
    });
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);

    const expiring = repository.recordCardTrajectory({
      id: "lgtraj_expiring",
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      taskCardId: "ltask_source_expiring",
      sourceEvaluationId: "eval_expiring",
      strategy: "repair",
      difficultyBand: "foundation",
      targetNodeIds: ["kg_science_variables"],
      nextRecommendation: {
        status: "pending",
        strategy: "repair",
        cardRole: "practice",
        targetNodeIds: ["kg_science_variables"],
        reason: "Retire this stale candidate if Owner does not want it."
      },
      createdAt: "2026-06-16T04:05:00.000Z"
    });
    assert.equal(expiring.ok, true);
    const expired = service.reviewRecommendation({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      sourceEvaluationId: "eval_expiring",
      status: "expired",
      reviewedBy: "weixin_stephen",
      decisionReasonCode: "stale_after_owner_review",
      statusUpdatedAt: "2026-06-16T04:10:00.000Z"
    });
    assert.equal(expired.ok, true);
    assert.equal(expired.recommendation.status, "expired");
    assert.equal(expired.recommendation.expiredAt, "2026-06-16T04:10:00.000Z");

    const accepted = service.reviewRecommendation({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      trajectoryId: "lgtraj_accepted",
      status: "expired"
    });
    assert.equal(accepted.ok, false);
    assert.equal(accepted.error, "trajectory_recommendation_already_accepted");

    const lifecycle = service.listLifecycle({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      limit: 10
    });
    assert.equal(lifecycle.summary.pendingCount, 0);
    assert.equal(lifecycle.summary.skippedCount, 1);
    assert.equal(lifecycle.summary.expiredCount, 1);
    assert.equal(lifecycle.summary.acceptedCount, 1);
    assert.equal(lifecycle.summary.supersededCount, 1);
    assert.equal(lifecycle.summary.hasSkipped, true);
    assert.equal(lifecycle.summary.hasExpired, true);
  });
});

test("recommendation lifecycle review fails closed for invalid status, missing selector, and private values", () => {
  withTrajectoryDb(({ repository }) => {
    seedTrajectories(repository);
    const service = createLearningRecommendationLifecycleService({ repository });

    const invalidStatus = service.reviewRecommendation({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      trajectoryId: "lgtraj_pending",
      status: "accepted"
    });
    assert.equal(invalidStatus.ok, false);
    assert.equal(invalidStatus.error, "recommendation_lifecycle_review_status_invalid");

    const missingSelector = service.reviewRecommendation({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      status: "skipped"
    });
    assert.equal(missingSelector.ok, false);
    assert.equal(missingSelector.error, "recommendation_lifecycle_selector_required");

    const privacy = service.reviewRecommendation({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      trajectoryId: "lgtraj_pending",
      status: "skipped",
      decisionReasonCode: "Bearer local-token"
    });
    assert.equal(privacy.ok, false);
    assert.equal(privacy.error, "recommendation_lifecycle_privacy_failed");
    assert.deepEqual(privacy.privacyFindings, ["$.decisionReasonCode"]);
    assert.equal(JSON.stringify(privacy).includes("local-token"), false);

    const repositoryPrivacy = repository.markTrajectoryRecommendationReviewed({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      trajectoryId: "lgtraj_pending",
      status: "skipped",
      decisionReasonCode: "Bearer repository-token"
    });
    assert.equal(repositoryPrivacy.ok, false);
    assert.equal(repositoryPrivacy.error, "trajectory_recommendation_review_privacy_failed");
    assert.deepEqual(repositoryPrivacy.privacyFindings, ["$.decisionReasonCode"]);
  });
});

test("recommendation lifecycle service fails closed for missing scope, repository, and privacy-risk input", () => {
  const missingScope = createLearningRecommendationLifecycleService({
    repository: { listRecentTrajectory: () => [] }
  }).listLifecycle({});
  assert.equal(missingScope.ok, false);
  assert.equal(missingScope.error, "recommendation_lifecycle_workspace_required");

  const missingRepository = createLearningRecommendationLifecycleService().listLifecycle({ workspaceId: "weixin_fanfan" });
  assert.equal(missingRepository.ok, false);
  assert.equal(missingRepository.error, "recommendation_lifecycle_repository_unavailable");

  const privacy = createLearningRecommendationLifecycleService({
    repository: { listRecentTrajectory: () => [] }
  }).listLifecycle({ workspaceId: "weixin_fanfan", rawPrompt: "do not pass" });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "recommendation_lifecycle_privacy_failed");
  assert.equal(privacy.privacyFindings.includes("$.rawPrompt"), true);
});

test("recommendation lifecycle pure helpers normalize scope and lifecycle item", () => {
  assert.deepEqual(publicScope({
    workspace_id: "weixin_fanfan",
    target_node_ids: "kg_a,kg_a,kg_b",
    status: "pending,accepted",
    limit: 99
  }), {
    workspaceId: "weixin_fanfan",
    learnerId: "weixin_fanfan",
    programId: "",
    trajectoryId: "",
    taskCardId: "",
    sourceEvaluationId: "",
    generatedTaskCardId: "",
    generatedLearningGraphPlanId: "",
    targetNodeIds: ["kg_a", "kg_b"],
    status: ["pending", "accepted"],
    limit: 50
  });
  assert.equal(reviewScope({
    workspace_id: "weixin_fanfan",
    trajectory_id: "lgtraj_1",
    decision: "skipped",
    reason_code: "too_much_pressure_today",
    reviewed_by: "weixin_stephen"
  }).status, "skipped");
  assert.equal(lifecycleItem({
    id: "lgtraj_1",
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    taskCardId: "ltask_1",
    targetNodeIds: ["kg_a"],
    nextRecommendation: {}
  }).status, "missing");
});
