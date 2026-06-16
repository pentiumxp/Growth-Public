const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const { createMasteryProfileRepository } = require("../src/stores/growth-learning-sqlite/mastery-profile");
const {
  allowWrite,
  inputFromArgs,
  operationFromArgs,
  runOperation,
  targetNodeIds,
  validateInput
} = require("../scripts/smoke-growth-recommendation-lifecycle");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-recommendation-lifecycle.js");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-recommendation-lifecycle-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
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
  repository.recordCardTrajectory({
    id: "lgtraj_smoke_pending",
    workspaceId: "smoke_workspace",
    learnerId: "smoke_learner",
    programId: "smoke_program",
    taskCardId: "ltask_smoke_source",
    sourceEvaluationId: "eval_smoke_source",
    strategy: "repair",
    difficultyBand: "foundation",
    targetNodeIds: ["kg_science_variables"],
    performanceSummary: "RAW DETAIL MUST NOT APPEAR",
    nextRecommendation: {
      status: "pending",
      strategy: "repair",
      cardRole: "practice",
      targetNodeIds: ["kg_science_variables"],
      reason: "Use one focused variable-control card."
    },
    createdAt: "2026-06-16T03:10:00.000Z"
  });
  try {
    return callback({ dir, dbPath });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function runScript(args, env = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    env: Object.assign({}, process.env, env),
    encoding: "utf8"
  });
}

function parseStdout(result) {
  return JSON.parse(result.stdout);
}

test("recommendation lifecycle smoke script parses list input and rejects writes", () => {
  const args = [
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--trajectory-id", "lgtraj_1",
    "--task-card-id", "ltask_1",
    "--source-evaluation-id", "eval_1",
    "--generated-task-card-id", "ltask_next",
    "--generated-learning-graph-plan-id", "lgp_next",
    "--status", "pending,accepted",
    "--target-node-id", "kg_a",
    "--target-node-ids", "kg_a,kg_b",
    "--limit", "7"
  ];
  assert.equal(operationFromArgs(args), "list");
  assert.equal(allowWrite(args), false);
  assert.deepEqual(targetNodeIds(args), ["kg_a", "kg_b"]);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    trajectoryId: "lgtraj_1",
    taskCardId: "ltask_1",
    sourceEvaluationId: "eval_1",
    generatedTaskCardId: "ltask_next",
    generatedLearningGraphPlanId: "lgp_next",
    status: "pending,accepted",
    targetNodeIds: ["kg_a", "kg_b"],
    limit: 7
  });
  assert.deepEqual(validateInput("list", inputFromArgs(args), args), { ok: true });
  assert.equal(validateInput("list", inputFromArgs(args), args.concat("--allow-write")).error, "recommendation_lifecycle_smoke_write_not_supported");
  assert.equal(validateInput("publish", inputFromArgs(args), args).error, "recommendation_lifecycle_smoke_operation_invalid");
  assert.equal(validateInput("list", { workspaceId: "" }, args).error, "workspace_id_required");
});

test("recommendation lifecycle smoke script delegates to service only", () => {
  const calls = [];
  const services = {
    learningRecommendationLifecycleService: {
      listLifecycle(input) {
        calls.push(input);
        return { ok: true, count: 0 };
      }
    }
  };
  const result = runOperation(services, "list", { workspaceId: "weixin_fanfan" });
  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { workspaceId: "weixin_fanfan" });
});

test("recommendation lifecycle smoke script reads temporary SQLite without writing", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--program-id", "smoke_program",
      "--status", "pending",
      "--target-node-id", "kg_science_variables",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = parseStdout(result);
    assert.equal(output.ok, true);
    assert.equal(output.operation, "list");
    assert.equal(output.source, "growth-learning-recommendation-lifecycle-service");
    assert.equal(output.count, 1);
    assert.equal(output.summary.pendingCount, 1);
    assert.equal(output.lifecycle[0].trajectoryId, "lgtraj_smoke_pending");
    assert.equal(output.lifecycle[0].status, "pending");
    assert.equal(output.writesPerformed, false);
    assert.equal(JSON.stringify(output).includes("RAW DETAIL"), false);

    const db = new DatabaseSync(dbPath, { open: true });
    const row = db.prepare("SELECT COUNT(*) AS count FROM learning_growth_card_trajectories").get();
    db.close();
    assert.equal(row.count, 1);
  });
});
