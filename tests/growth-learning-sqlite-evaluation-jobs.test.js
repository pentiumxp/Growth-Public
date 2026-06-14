const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  createEvaluationJobRepository,
  publicGrowthEvaluationJob
} = require("../src/stores/growth-learning-sqlite/evaluation-jobs");

function withEvaluationDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-evaluation-jobs-"));
  const dbPath = path.join(dir, "evaluation.sqlite3");
  const { DatabaseSync } = require("node:sqlite");
  const setup = new DatabaseSync(dbPath);
  try {
    setup.exec(`
      CREATE TABLE learning_task_cards (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        program_id TEXT,
        learner_id TEXT,
        title TEXT,
        raw_json TEXT
      );
      CREATE TABLE learning_task_submissions (
        id TEXT PRIMARY KEY,
        task_card_id TEXT,
        session_id TEXT,
        program_id TEXT,
        learner_id TEXT,
        workspace_id TEXT,
        raw_json TEXT
      );
      CREATE TABLE learning_growth_evaluation_jobs (
        id TEXT PRIMARY KEY,
        submission_id TEXT,
        task_card_id TEXT,
        learner_id TEXT,
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
      CREATE TABLE learning_evaluations (
        id TEXT PRIMARY KEY,
        task_card_id TEXT,
        session_id TEXT,
        program_id TEXT,
        learner_id TEXT,
        workspace_id TEXT,
        status TEXT,
        score INTEGER,
        passed INTEGER,
        confidence REAL,
        summary TEXT,
        skill_results_json TEXT,
        reward_policy_json TEXT,
        source_basis_refs_json TEXT,
        raw_json TEXT,
        created_at TEXT
      );
      INSERT INTO learning_task_cards VALUES (
        'ltask_1', 'weixin_child', 'program_1', 'learner_1', 'Careful writing', '{"instruction":"Write carefully."}'
      );
      INSERT INTO learning_task_submissions VALUES (
        'submission_1', 'ltask_1', 'session_1', 'program_1', 'learner_1', 'weixin_child', '{"text":"I checked the order."}'
      );
      INSERT INTO learning_growth_evaluation_jobs VALUES (
        'job_1', 'submission_1', 'ltask_1', 'learner_1', 'weixin_child', 'pending', 0, '', '', '', '{}',
        '2026-06-11T00:00:00.000Z', '2026-06-11T00:00:00.000Z', '2026-06-11T00:00:00.000Z', ''
      );
    `);
  } finally {
    setup.close();
  }

  const repository = createEvaluationJobRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    }
  });

  try {
    return callback({ dbPath, repository, DatabaseSync });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("evaluation job projection is bounded", () => {
  assert.deepEqual(publicGrowthEvaluationJob({
    id: "job_1",
    submission_id: "submission_1",
    task_card_id: "ltask_1",
    workspace_id: "weixin_child",
    status: "pending",
    attempt_count: 2,
    raw_json: "{\"source\":\"test\"}"
  }), {
    jobId: "job_1",
    submissionId: "submission_1",
    taskCardId: "ltask_1",
    learnerId: "",
    workspaceId: "weixin_child",
    status: "pending",
    attemptCount: 2,
    leaseOwner: "",
    leaseUntil: "",
    lastError: "",
    availableAt: "",
    createdAt: "",
    updatedAt: "",
    completedAt: "",
    raw: { source: "test" }
  });
});

test("evaluation repository claims, records, and completes jobs", () => {
  withEvaluationDb(({ repository }) => {
    assert.equal(repository.listEvaluationJobs({ status: "pending" }).length, 1);

    const claimed = repository.claimEvaluationJob("job_1", {
      now: "2026-06-11T00:10:00.000Z",
      leaseUntil: "2026-06-11T00:20:00.000Z",
      leaseOwner: "worker_1"
    });
    assert.equal(claimed.status, "processing");
    assert.equal(claimed.attemptCount, 1);

    const context = repository.evaluationJobContext({ jobId: "job_1" });
    assert.equal(context.submission.id, "submission_1");
    assert.equal(context.taskCard.id, "ltask_1");
    assert.equal(context.submissionRaw.text, "I checked the order.");
    assert.equal(context.taskRaw.instruction, "Write carefully.");

    const recorded = repository.recordEvaluation({
      submission: context.submission,
      taskCard: context.taskCard,
      evaluation: {
        status: "completed",
        score: 95,
        passed: true,
        confidence: 0.8,
        summary: "Passed.",
        evidenceRefs: ["evidence_1"]
      },
      evaluatedAt: "2026-06-11T00:30:00.000Z"
    });
    assert.equal(recorded.ok, true);
    assert.equal(recorded.evaluation.status, "completed");
    assert.equal(recorded.evaluation.passed, true);

    const completed = repository.completeEvaluationJob("job_1", {
      completedAt: "2026-06-11T00:40:00.000Z"
    });
    assert.equal(completed.status, "done");
    assert.equal(repository.listEvaluationJobs({ status: "done" })[0].jobId, "job_1");
  });
});

test("evaluation repository protects active leases and recovers stale processing jobs", () => {
  withEvaluationDb(({ repository }) => {
    const firstClaim = repository.claimEvaluationJob("job_1", {
      now: "2026-06-11T00:10:00.000Z",
      leaseUntil: "2026-06-11T00:20:00.000Z",
      leaseOwner: "worker_before_restart"
    });
    assert.equal(firstClaim.status, "processing");
    assert.equal(firstClaim.attemptCount, 1);
    assert.equal(firstClaim.leaseOwner, "worker_before_restart");

    const activeLeaseClaim = repository.claimEvaluationJob("job_1", {
      now: "2026-06-11T00:15:00.000Z",
      leaseUntil: "2026-06-11T00:25:00.000Z",
      leaseOwner: "worker_after_restart"
    });
    assert.equal(activeLeaseClaim, null);

    const recovered = repository.claimEvaluationJob("job_1", {
      now: "2026-06-11T00:21:00.000Z",
      leaseUntil: "2026-06-11T00:31:00.000Z",
      leaseOwner: "worker_after_restart"
    });
    assert.equal(recovered.status, "processing");
    assert.equal(recovered.attemptCount, 2);
    assert.equal(recovered.leaseOwner, "worker_after_restart");
    assert.equal(recovered.leaseUntil, "2026-06-11T00:31:00.000Z");
  });
});

test("evaluation repository fails jobs with bounded retry metadata", () => {
  withEvaluationDb(({ repository }) => {
    const failed = repository.failEvaluationJob("job_1", {
      status: "retry",
      error: "x".repeat(700),
      availableAt: "2026-06-11T01:00:00.000Z",
      now: "2026-06-11T00:45:00.000Z"
    });

    assert.equal(failed.status, "retry");
    assert.equal(failed.lastError.length, 500);
    assert.equal(failed.availableAt, "2026-06-11T01:00:00.000Z");
  });
});

test("evaluation repository lets Owner retry a terminal failed job with audit metadata", () => {
  withEvaluationDb(({ repository }) => {
    repository.failEvaluationJob("job_1", {
      status: "failed",
      error: "gateway_unavailable",
      availableAt: "2026-06-11T00:45:00.000Z",
      now: "2026-06-11T00:45:00.000Z"
    });

    const result = repository.ownerReviewEvaluationJob({
      workspaceId: "weixin_child",
      taskCardId: "ltask_1",
      action: "retry",
      reason: "Owner confirmed the saved answer should be retried.",
      reviewedBy: "owner_workspace",
      now: "2026-06-11T01:00:00.000Z"
    });

    assert.equal(result.ok, true);
    assert.equal(result.previous_job.status, "failed");
    assert.equal(result.job.status, "retry");
    assert.equal(result.job.lastError, "");
    assert.equal(result.job.availableAt, "2026-06-11T01:00:00.000Z");

    const context = repository.evaluationJobContext({ jobId: "job_1" });
    assert.equal(context.job.raw.lastOwnerReview.action, "retry");
    assert.equal(context.job.raw.lastOwnerReview.reviewedBy, "owner_workspace");
    assert.equal(context.job.raw.ownerReviews.length, 1);
  });
});
