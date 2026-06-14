const assert = require("node:assert/strict");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  lanesForCards,
  publicCardFromRow,
  publicEvaluation,
  publicEvaluationJob,
  publicReflection,
  publicRewardSettlement,
  publicSubmission,
  summaryForCards
} = require("../src/stores/growth-learning-sqlite/projection");

function withProjectionDb(callback) {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(`
      CREATE TABLE learning_task_cards (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        program_id TEXT,
        draft_id TEXT,
        learner_id TEXT,
        kanban_card_id TEXT,
        title TEXT,
        domain TEXT,
        task_card_type TEXT,
        status TEXT,
        planned_date TEXT,
        planned_minutes INTEGER,
        card_role TEXT,
        capability_cluster_id TEXT,
        reward_cap_coins INTEGER,
        configured_reward_coins INTEGER,
        default_reward_coins INTEGER,
        completion_policy_json TEXT,
        raw_json TEXT,
        created_at TEXT,
        updated_at TEXT
      );
      CREATE TABLE learning_task_submissions (
        id TEXT PRIMARY KEY,
        task_card_id TEXT,
        status TEXT,
        submission_kind TEXT,
        submitted_at TEXT,
        created_at TEXT,
        raw_json TEXT
      );
      CREATE TABLE learning_evaluations (
        id TEXT PRIMARY KEY,
        task_card_id TEXT,
        status TEXT,
        score REAL,
        passed INTEGER,
        confidence REAL,
        summary TEXT,
        raw_json TEXT,
        created_at TEXT
      );
      CREATE TABLE learning_growth_evaluation_jobs (
        id TEXT PRIMARY KEY,
        submission_id TEXT,
        task_card_id TEXT,
        workspace_id TEXT,
        status TEXT,
        attempt_count INTEGER,
        lease_owner TEXT,
        lease_until TEXT,
        last_error TEXT,
        raw_json TEXT,
        available_at TEXT,
        created_at TEXT,
        updated_at TEXT,
        completed_at TEXT
      );
      CREATE TABLE learning_task_reflections (
        id TEXT PRIMARY KEY,
        task_card_id TEXT,
        status TEXT,
        mode TEXT,
        score REAL,
        summary TEXT,
        audio_digest TEXT,
        submitted_at TEXT,
        created_at TEXT,
        raw_json TEXT
      );
    `);
    return callback(db);
  } finally {
    db.close();
  }
}

function insertProjectionCard(db, input = {}) {
  const policy = input.completionPolicy || {};
  db.prepare(`
    INSERT INTO learning_task_cards(
      id, workspace_id, program_id, draft_id, learner_id, kanban_card_id,
      title, domain, task_card_type, status, planned_date, planned_minutes,
      card_role, capability_cluster_id, reward_cap_coins, configured_reward_coins,
      default_reward_coins, completion_policy_json, raw_json, created_at, updated_at
    ) VALUES (?, 'weixin_child', 'program_1', 'draft_1', 'learner_1', '',
      ?, 'english', 'practice', ?, '2026-06-12', 15,
      ?, 'english.reading', 100, 100, 100, ?, ?, '2026-06-12T00:00:00.000Z',
      '2026-06-12T00:00:00.000Z')
  `).run(
    input.id,
    input.title || input.id,
    input.status || "active",
    input.cardRole || "practice",
    JSON.stringify(policy),
    JSON.stringify(Object.assign({
      instructionPreview: "Daily practice",
      completionPolicy: policy
    }, input.raw || {}))
  );
  db.prepare(`
    INSERT INTO learning_task_submissions(
      id, task_card_id, status, submission_kind, submitted_at, created_at, raw_json
    ) VALUES (?, ?, 'submitted', 'text', '2026-06-12T00:01:00.000Z',
      '2026-06-12T00:01:00.000Z', '{}')
  `).run(`submission_${input.id}`, input.id);
  if (input.evaluationStatus) {
    db.prepare(`
      INSERT INTO learning_evaluations(
        id, task_card_id, status, score, passed, confidence, summary, raw_json, created_at
      ) VALUES (?, ?, ?, ?, ?, 0.8, ?, '{}', '2026-06-12T00:02:00.000Z')
    `).run(
      `evaluation_${input.id}`,
      input.id,
      input.evaluationStatus,
      Number(input.score ?? 42),
      input.passed ? 1 : 0,
      input.summary || "Score recorded once."
    );
  }
  if (input.evaluationJobStatus) {
    db.prepare(`
      INSERT INTO learning_growth_evaluation_jobs(
        id, submission_id, task_card_id, workspace_id, status, attempt_count,
        lease_owner, lease_until, last_error, raw_json, available_at, created_at,
        updated_at, completed_at
      ) VALUES (?, ?, ?, 'weixin_child', ?, ?, ?, ?, ?, ?,
        '2026-06-12T00:01:00.000Z', '2026-06-12T00:01:00.000Z',
        '2026-06-12T00:04:00.000Z', ?)
    `).run(
      `job_${input.id}`,
      `submission_${input.id}`,
      input.id,
      input.evaluationJobStatus,
      Number(input.evaluationJobAttemptCount || 0),
      input.evaluationJobLeaseOwner || "",
      input.evaluationJobLeaseUntil || "",
      input.evaluationJobLastError || "",
      JSON.stringify(input.evaluationJobRaw || {}),
      input.evaluationJobCompletedAt || ""
    );
  }
  return db.prepare("SELECT * FROM learning_task_cards WHERE id = ?").get(input.id);
}

test("Growth projection helpers produce bounded public records", () => {
  assert.deepEqual(publicSubmission({
    id: "submission_1",
    task_card_id: "card_1",
    status: "submitted",
    submission_kind: "text",
    submitted_at: "2026-06-11T00:00:00.000Z",
    created_at: "2026-06-11T00:00:00.000Z",
    raw_json: JSON.stringify({ audio: { name: "voice.m4a", digest: "abc", size: 12 } })
  }), {
    submissionId: "submission_1",
    taskCardId: "card_1",
    status: "submitted",
    submissionKind: "text",
    submittedAt: "2026-06-11T00:00:00.000Z",
    createdAt: "2026-06-11T00:00:00.000Z",
    audio: {
      kind: "audio",
      name: "voice.m4a",
      mime: "application/octet-stream",
      size: 12,
      durationMs: 0,
      digest: "abc",
      url: "/api/v1/growth/audio/submissions/submission_1"
    },
    submissionCount: 1,
    totalSubmissionCount: 1
  });

  assert.equal(publicEvaluation({
    id: "evaluation_1",
    task_card_id: "card_1",
    status: "completed",
    score: 95,
    passed: 1,
    summary: "x".repeat(900),
    raw_json: JSON.stringify({ revisionRequirements: ["a"], remainingWeaknesses: ["b"] })
  }).summary.length, 700);

  assert.deepEqual(publicEvaluationJob({
    id: "job_1",
    submission_id: "submission_1",
    task_card_id: "card_1",
    status: "failed",
    attempt_count: 4,
    last_error: "x".repeat(300),
    available_at: "2026-06-12T00:00:00.000Z",
    updated_at: "2026-06-12T00:05:00.000Z"
  }), {
    jobId: "job_1",
    submissionId: "submission_1",
    taskCardId: "card_1",
    status: "failed",
    attemptCount: 4,
    availableAt: "2026-06-12T00:00:00.000Z",
    leaseUntil: "",
    lastError: "x".repeat(160),
    updatedAt: "2026-06-12T00:05:00.000Z",
    completedAt: "",
    retryable: false,
    failedVisible: true,
    lastOwnerReview: null
  });

  assert.equal(publicReflection({
    id: "reflection_1",
    task_card_id: "card_1",
    status: "submitted",
    mode: "text",
    summary: "ok",
    raw_json: "{}"
  }).reflectionId, "reflection_1");

  assert.equal(publicRewardSettlement({
    id: "settlement_1",
    status: "settled",
    coin_amount: 100,
    raw_json: "{}"
  }).currency, "learning_coin");
});

test("Growth projection summary and lanes preserve visible workflow buckets", () => {
  const cards = [
    { taskCardId: "card_ready", laneId: "ready", status: "published" },
    { taskCardId: "card_revision", laneId: "needs_revision", status: "needs_revision" },
    { taskCardId: "card_completed", laneId: "completed_recent", status: "completed" }
  ];
  const hidden = [{ taskCardId: "future_1" }];

  assert.deepEqual(summaryForCards(cards, cards.concat(hidden), hidden), {
    cardCount: 3,
    visibleCardCount: 3,
    totalCardCount: 4,
    hiddenFutureCardCount: 1,
    sequencePolicy: "current_card_only_then_unlock_next",
    total: 3,
    active: 2,
    waiting_review: 0,
    completed: 1
  });

  const lanes = lanesForCards(cards);
  assert.deepEqual(lanes.map((lane) => [lane.id, lane.cards]), [
    ["today", []],
    ["ready", ["card_ready"]],
    ["locked_until", []],
    ["waiting_ai", []],
    ["evaluation_failed", []],
    ["needs_revision", ["card_revision"]],
    ["reflection_required", []],
    ["completed_recent", ["card_completed"]]
  ]);
});

test("failed daily evaluation jobs project a visible failure without reopening submission", () => {
  withProjectionDb((db) => {
    const row = insertProjectionCard(db, {
      id: "card_daily_failed_job",
      title: "Daily English failed job",
      completionPolicy: {
        mode: "daily_score_once",
        evaluationAttempts: 1,
        reflectionAttempts: 1,
        passScoreRequired: false
      },
      evaluationJobStatus: "failed",
      evaluationJobAttemptCount: 3,
      evaluationJobLastError: "gateway_timeout",
      evaluationJobRaw: {
        lastOwnerReview: {
          action: "retry",
          reason: "Owner confirmed retry.",
          reviewedBy: "owner_workspace",
          reviewedAt: "2026-06-12T00:04:00.000Z"
        }
      }
    });

    const card = publicCardFromRow(db, row, {
      today: "2026-06-12",
      nowIso: "2026-06-12T00:05:00.000Z"
    });

    assert.equal(card.latestEvaluation, null);
    assert.equal(card.latestEvaluationJob.status, "failed");
    assert.equal(card.latestEvaluationJob.failedVisible, true);
    assert.deepEqual(card.latestEvaluationJob.lastOwnerReview, {
      action: "retry",
      reason: "Owner confirmed retry.",
      reviewedBy: "owner_workspace",
      reviewedAt: "2026-06-12T00:04:00.000Z"
    });
    assert.equal(card.laneId, "evaluation_failed");
    assert.equal(card.nextAction, "evaluation_failed");
    assert.equal(card.primaryAction, "owner_review");
    assert.equal(card.actions.canSubmit, false);
    assert.equal(card.actions.canRequestOwnerReview, true);
  });
});

test("daily score once cards complete after the first terminal evaluation regardless of pass line", () => {
  withProjectionDb((db) => {
    const row = insertProjectionCard(db, {
      id: "card_daily_low_score",
      title: "Daily English card",
      completionPolicy: {
        mode: "daily_score_once",
        evaluationAttempts: 1,
        reflectionAttempts: 1,
        passScoreRequired: false
      },
      evaluationStatus: "needs_revision",
      score: 42,
      passed: false
    });

    const card = publicCardFromRow(db, row, {
      today: "2026-06-12",
      nowIso: "2026-06-12T00:03:00.000Z"
    });

    assert.equal(card.latestEvaluation.status, "needs_revision");
    assert.equal(card.latestEvaluation.passed, false);
    assert.equal(card.laneId, "completed_recent");
    assert.equal(card.nextAction, "complete");
    assert.equal(card.primaryAction, "review");
    assert.equal(card.actions.canSubmit, false);
    assert.equal(card.actions.canReflect, false);
  });
});

test("non-daily score cards preserve legacy revision lanes", () => {
  withProjectionDb((db) => {
    const row = insertProjectionCard(db, {
      id: "card_formal_revision",
      title: "Formal writing check",
      cardRole: "stage_assessment",
      raw: { completionPolicy: { mode: "formal_assessment" } },
      evaluationStatus: "needs_revision",
      score: 42,
      passed: false
    });

    const card = publicCardFromRow(db, row, {
      today: "2026-06-12",
      nowIso: "2026-06-12T00:03:00.000Z"
    });

    assert.equal(card.laneId, "needs_revision");
    assert.equal(card.nextAction, "revise");
    assert.equal(card.primaryAction, "revise");
    assert.equal(card.actions.canSubmit, true);
  });
});
