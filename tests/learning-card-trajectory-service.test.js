const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const { createLearningCardTrajectoryService } = require("../src/services/learning-card-trajectory-service");
const { createMasteryProfileRepository } = require("../src/stores/growth-learning-sqlite/mastery-profile");

function withTrajectoryDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-card-trajectory-"));
  const dbPath = path.join(dir, "trajectory.sqlite3");
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

test("card trajectory service records an idempotent summary-only next recommendation", () => {
  withTrajectoryDb(({ dbPath, repository }) => {
    const service = createLearningCardTrajectoryService({
      repository,
      now: () => new Date("2026-06-14T06:00:00.000Z")
    });
    const input = {
      taskCard: {
        id: "ltask_1",
        learner_id: "weixin_stephen",
        workspace_id: "weixin_stephen",
        program_id: "program_english",
        raw_json: JSON.stringify({ learningGraph: { targetNodeIds: ["kg_english_evidence_answering"] } })
      },
      evaluation: {
        evaluationId: "eval_1",
        status: "completed",
        score: 58,
        summary: "Evidence is present but not specific.",
        remainingWeaknesses: ["Quote exact evidence."],
        rawAnswer: "RAW ANSWER MUST NOT BE STORED"
      },
      profileUpdate: {
        masteryChanges: [{ nodeId: "kg_english_evidence_answering", from: "new", to: "developing" }],
        experienceSignals: [{ signalType: "not_learned", targetNodeId: "kg_english_evidence_answering" }]
      },
      nextRecommendation: {
        strategy: "stabilize",
        targetNodeIds: ["kg_english_evidence_answering"],
        difficultyBand: "foundation",
        reason: "Needs one narrower evidence-answering practice card."
      }
    };

    const result = service.recordEvaluationTrajectory(input);
    const replay = service.recordEvaluationTrajectory(input);
    assert.equal(result.ok, true);
    assert.equal(replay.ok, true);
    assert.equal(replay.duplicate, true);

    const db = new DatabaseSync(dbPath);
    try {
      const rows = db.prepare("SELECT * FROM learning_growth_card_trajectories").all();
      assert.equal(rows.length, 1);
      assert.equal(rows[0].strategy, "stabilize");
      assert.equal(JSON.parse(rows[0].target_node_ids_json)[0], "kg_english_evidence_answering");
      const nextRecommendation = JSON.parse(rows[0].next_recommendation_json);
      assert.equal(nextRecommendation.status, "pending");
      assert.equal(nextRecommendation.sourceTaskCardId, "ltask_1");
      assert.equal(nextRecommendation.sourceEvaluationId, "eval_1");
      assert.equal(nextRecommendation.statusUpdatedAt, "2026-06-14T06:00:00.000Z");
      assert.equal(JSON.stringify(rows[0]).includes("RAW ANSWER"), false);
    } finally {
      db.close();
    }
  });
});

test("card trajectory service supersedes older pending recommendations for the same learner", () => {
  withTrajectoryDb(({ dbPath, repository }) => {
    const service = createLearningCardTrajectoryService({
      repository,
      now: () => new Date("2026-06-14T07:00:00.000Z")
    });
    const base = {
      taskCard: {
        learner_id: "weixin_fanfan",
        workspace_id: "weixin_fanfan",
        program_id: "program_english",
        raw_json: JSON.stringify({ learningGraph: { targetNodeIds: ["kg_english_evidence_answering"] } })
      },
      evaluation: {
        status: "completed",
        summary: "Needs focused evidence practice."
      },
      nextRecommendation: {
        strategy: "stabilize",
        targetNodeIds: ["kg_english_evidence_answering"],
        difficultyBand: "foundation",
        reason: "Use one focused evidence-answering card."
      }
    };

    const first = service.recordEvaluationTrajectory({
      ...base,
      taskCard: { ...base.taskCard, id: "ltask_old" },
      evaluation: { ...base.evaluation, evaluationId: "eval_old" }
    });
    const accepted = repository.markTrajectoryRecommendationAccepted({
      trajectoryId: first.trajectory.id,
      workspaceId: "weixin_fanfan",
      learnerId: "weixin_fanfan",
      generatedTaskCardId: "ltask_generated_old",
      generatedLearningGraphPlanId: "lgp_old",
      acceptedAt: "2026-06-14T07:05:00.000Z"
    });
    assert.equal(accepted.ok, true);

    const pending = service.recordEvaluationTrajectory({
      ...base,
      taskCard: { ...base.taskCard, id: "ltask_pending" },
      evaluation: { ...base.evaluation, evaluationId: "eval_pending" }
    });
    assert.deepEqual(pending.supersededRecommendationIds, []);

    const newest = service.recordEvaluationTrajectory({
      ...base,
      taskCard: { ...base.taskCard, id: "ltask_new" },
      evaluation: { ...base.evaluation, evaluationId: "eval_new" },
      nextRecommendation: {
        strategy: "repair",
        targetNodeIds: ["kg_english_evidence_answering"],
        difficultyBand: "repair",
        reason: "Use the newest repair recommendation."
      }
    });

    assert.equal(newest.ok, true);
    assert.deepEqual(newest.supersededRecommendationIds, [pending.trajectory.id]);

    const db = new DatabaseSync(dbPath);
    try {
      const rows = db.prepare("SELECT id, next_recommendation_json FROM learning_growth_card_trajectories ORDER BY task_card_id ASC").all();
      const recommendations = Object.fromEntries(rows.map((row) => [row.id, JSON.parse(row.next_recommendation_json)]));
      assert.equal(recommendations[first.trajectory.id].status, "accepted");
      assert.equal(recommendations[pending.trajectory.id].status, "superseded");
      assert.equal(recommendations[pending.trajectory.id].supersededByTrajectoryId, newest.trajectory.id);
      assert.equal(recommendations[newest.trajectory.id].status, "pending");
    } finally {
      db.close();
    }
  });
});
