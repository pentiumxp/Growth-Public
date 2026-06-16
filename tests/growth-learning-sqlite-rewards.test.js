const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createRewardRepository } = require("../src/stores/growth-learning-sqlite/rewards");

function withRewardDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-reward-repo-"));
  const dbPath = path.join(dir, "rewards.sqlite3");
  const { DatabaseSync } = require("node:sqlite");
  const setup = new DatabaseSync(dbPath);
  try {
    setup.exec(`
      CREATE TABLE learning_task_cards (
        id TEXT PRIMARY KEY,
        learner_id TEXT,
        workspace_id TEXT,
        program_id TEXT,
        status TEXT,
        reward_cap_coins INTEGER,
        configured_reward_coins INTEGER,
        default_reward_coins INTEGER,
        raw_json TEXT,
        updated_at TEXT
      );
      CREATE TABLE learning_reward_settlements (
        id TEXT PRIMARY KEY,
        learner_id TEXT,
        workspace_id TEXT,
        program_id TEXT,
        task_card_id TEXT,
        session_id TEXT,
        evaluation_id TEXT,
        status TEXT,
        coin_amount INTEGER,
        reason TEXT,
        source_type TEXT,
        source_id TEXT,
        idempotency_key TEXT,
        review_request_id TEXT,
        ledger_entry_json TEXT,
        raw_json TEXT,
        created_at TEXT,
        updated_at TEXT,
        settled_at TEXT
      );
      INSERT INTO learning_task_cards(
        id, learner_id, workspace_id, program_id, status, reward_cap_coins,
        configured_reward_coins, default_reward_coins, raw_json, updated_at
      ) VALUES (
        'card_1', 'learner_1', 'weixin_child', 'program_1', 'active', 125,
        100, 100, '{}', '2026-06-11T00:00:00.000Z'
      );
    `);
  } finally {
    setup.close();
  }

  const repository = createRewardRepository({
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

test("reward repository settles evaluations by score and completes task cards", () => {
  withRewardDb(({ dbPath, repository, DatabaseSync }) => {
    const result = repository.settleEvaluationReward({
      evaluation: {
        evaluationId: "eval_1",
        status: "passed",
        score: 96,
        passed: true
      },
      taskCard: {
        id: "card_1",
        learner_id: "learner_1",
        workspace_id: "weixin_child",
        program_id: "program_1",
        reward_cap_coins: 125,
        raw_json: "{}"
      },
      submission: {
        id: "sub_1",
        session_id: "session_1"
      },
      settledAt: "2026-06-11T01:00:00.000Z"
    });

    assert.equal(result.ok, true);
    assert.equal(result.settlement.status, "settled");
    assert.equal(result.settlement.coinAmount, 120);

    const duplicate = repository.settleEvaluationReward({
      evaluation: { evaluationId: "eval_1", passed: true }
    });
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);

    const db = new DatabaseSync(dbPath);
    try {
      const card = db.prepare("SELECT status, raw_json FROM learning_task_cards WHERE id = 'card_1'").get();
      assert.equal(card.status, "completed");
      assert.equal(JSON.parse(card.raw_json).rewardState, "settled");
      assert.equal(db.prepare("SELECT COUNT(*) AS count FROM learning_reward_settlements").get().count, 1);
    } finally {
      db.close();
    }
  });
});

test("reward repository settles low scores without requiring a pass line", () => {
  withRewardDb(({ dbPath, repository, DatabaseSync }) => {
    const result = repository.settleEvaluationReward({
      evaluation: {
        evaluationId: "eval_low_score",
        status: "completed",
        score: 42,
        passed: false
      },
      taskCard: {
        id: "card_1",
        learner_id: "learner_1",
        workspace_id: "weixin_child",
        program_id: "program_1",
        reward_cap_coins: 125,
        raw_json: "{}"
      },
      submission: { id: "sub_low", session_id: "session_low" },
      settledAt: "2026-06-11T01:00:00.000Z"
    });

    assert.equal(result.ok, true);
    assert.equal(result.settlement.status, "settled");
    assert.equal(result.settlement.coinAmount, 53);
    assert.equal(result.settlement.reason, "growth_coin_settled_by_daily_score");

    const db = new DatabaseSync(dbPath);
    try {
      const card = db.prepare("SELECT status FROM learning_task_cards WHERE id = 'card_1'").get();
      assert.equal(card.status, "completed");
    } finally {
      db.close();
    }
  });
});

test("reward repository lists bounded reward settlements by task and evaluation", () => {
  withRewardDb(({ repository }) => {
    repository.settleEvaluationReward({
      evaluation: {
        evaluationId: "eval_reward_trace",
        status: "completed",
        score: 64,
        passed: false
      },
      taskCard: {
        id: "card_1",
        learner_id: "learner_1",
        workspace_id: "weixin_child",
        program_id: "program_1",
        reward_cap_coins: 125,
        raw_json: "{}"
      },
      submission: { id: "sub_trace", session_id: "session_trace" },
      settledAt: "2026-06-11T02:00:00.000Z"
    });

    const byTask = repository.listRewardSettlements({
      workspaceId: "weixin_child",
      taskCardIds: ["card_1"],
      limit: 2
    });
    assert.equal(byTask.length, 1);
    assert.equal(byTask[0].rewardSettlementId.startsWith("lrwd_"), true);
    assert.equal(byTask[0].evaluationId, "eval_reward_trace");
    assert.equal(byTask[0].coinAmount, 80);

    const byEvaluation = repository.listRewardSettlements({
      workspaceId: "weixin_child",
      evaluationIds: ["eval_reward_trace"],
      status: "settled"
    });
    assert.equal(byEvaluation.length, 1);
    assert.equal(byEvaluation[0].taskCardId, "card_1");
  });
});

test("reward repository preserves camelCase service-context fields in reward settlements", () => {
  withRewardDb(({ repository }) => {
    const result = repository.settleEvaluationReward({
      evaluation: {
        evaluationId: "eval_camel_context",
        status: "completed",
        score: 48,
        passed: false
      },
      taskCard: {
        taskCardId: "card_1",
        learnerId: "learner_1",
        workspaceId: "weixin_child",
        programId: "program_1",
        rewardCapCoins: 125,
        raw_json: "{}"
      },
      submission: {
        submissionId: "sub_camel",
        sessionId: "session_camel",
        learnerId: "learner_1",
        workspaceId: "weixin_child",
        programId: "program_1"
      },
      settledAt: "2026-06-11T03:00:00.000Z"
    });

    assert.equal(result.ok, true);
    assert.equal(result.settlement.workspaceId, "weixin_child");
    assert.equal(result.settlement.learnerId, "learner_1");
    assert.equal(result.settlement.programId, "program_1");
    assert.equal(result.settlement.taskCardId, "card_1");
    assert.equal(result.settlement.coinAmount, 60);

    const listed = repository.listRewardSettlements({
      workspaceId: "weixin_child",
      learnerId: "learner_1",
      programId: "program_1",
      evaluationIds: ["eval_camel_context"]
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].evaluationId, "eval_camel_context");
  });
});

test("reward repository reports and clears learning coin balance idempotently", () => {
  withRewardDb(({ repository }) => {
    repository.settleEvaluationReward({
      evaluation: {
        evaluationId: "eval_1",
        status: "passed",
        score: 96,
        passed: true
      },
      taskCard: {
        id: "card_1",
        learner_id: "learner_1",
        workspace_id: "weixin_child",
        program_id: "program_1",
        reward_cap_coins: 125,
        raw_json: "{}"
      },
      submission: { id: "sub_1", session_id: "session_1" }
    });

    const before = repository.learningCoinBalance({ workspaceId: "weixin_child" });
    assert.equal(before.ok, true);
    assert.equal(before.available_coins, 120);

    const dryRun = repository.clearLearningCoinBalanceForMonthlyExchange({
      workspaceId: "weixin_child",
      amount: 50,
      write: false
    });
    assert.equal(dryRun.mode, "dry_run");
    assert.equal(dryRun.clearable_coins, 50);

    const write = repository.clearLearningCoinBalanceForMonthlyExchange({
      workspaceId: "weixin_child",
      amount: 50,
      idempotencyKey: "monthly-2026-06",
      period: "2026-06",
      write: true
    });
    assert.equal(write.ok, true);
    assert.equal(write.cleared_coins, 50);
    assert.equal(write.balance_after.available_coins, 70);

    const duplicate = repository.clearLearningCoinBalanceForMonthlyExchange({
      workspaceId: "weixin_child",
      idempotencyKey: "monthly-2026-06",
      write: true
    });
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.balance_after.available_coins, 70);
  });
});
