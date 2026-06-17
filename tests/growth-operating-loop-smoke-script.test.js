const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-operating-loop.js");

const {
  assessmentCoverageNodeIds,
  inputFromArgs,
  projectLearningOperatingLoopSmokeReadback
} = require("../scripts/smoke-growth-operating-loop");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-operating-loop-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath, { open: true }).close();
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

test("operating-loop smoke script parses operation, write gate, and assessment coverage", () => {
  const args = [
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--operation", "run-next",
    "--action", "review_stage_assessment",
    "--program-id", "program_science",
    "--domain-pack-id", "domain_pack_fanfan_cambridge_pathway_v1",
    "--domain", "science",
    "--subject", "science",
    "--target-node-id", "kg_science_fair_test",
    "--assessment-coverage-node-id", "kg_science_fair_test",
    "--assessment-coverage-node-ids", "kg_science_fair_test,kg_science_variables",
    "--allow-write",
    "--allow-stage-activation",
    "--confirm-stage-assessment",
    "--activation-reason", "owner_confirmed_checkpoint"
  ];

  assert.deepEqual(assessmentCoverageNodeIds(args), ["kg_science_fair_test", "kg_science_variables"]);
  const input = inputFromArgs(args);
  assert.equal(input.operation, "run-next");
  assert.equal(input.action, "review_stage_assessment");
  assert.equal(input.allowWrite, true);
  assert.equal(input.allowStageActivation, true);
  assert.equal(input.confirmStageAssessment, true);
  assert.equal(input.activationReason, "owner_confirmed_checkpoint");
  assert.deepEqual(input.targetNodeIds, ["kg_science_fair_test"]);
  assert.deepEqual(input.assessmentCoverageNodeIds, ["kg_science_fair_test", "kg_science_variables"]);
});

test("operating-loop smoke script projects bounded operator readback", () => {
  const output = projectLearningOperatingLoopSmokeReadback({
    ok: true,
    source: "growth-learning-operating-loop-service",
    schemaVersion: "growth.learningOperatingLoop.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    operation: "run_next",
    status: "executed",
    writePerformed: true,
    actionExecuted: true,
    executedAction: "draft_daily_plan",
    executionMode: "daily_loop_advance",
    target: { workspaceId: "weixin_fanfan", learnerId: "fanfan" },
    scope: {
      programId: "program_science",
      domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
      domain: "science",
      subject: "science",
      horizon: "daily_plan"
    },
    before: {
      status: "ready_to_draft",
      nextAction: { action: "draft_daily_plan", enabled: true }
    },
    after: {
      status: "ready_to_draft",
      nextAction: { action: "draft_daily_plan", enabled: true }
    },
    actionResult: {
      taskCardId: "ltask_operating_1",
      planDraftId: "lgplan_operating_1"
    },
    summary: {
      taskCardId: "ltask_operating_1",
      planDraftId: "lgplan_operating_1"
    }
  });

  assert.equal(output.operatingLoopStatus, "executed");
  assert.equal(output.operatingLoopOperation, "run_next");
  assert.equal(output.operatingLoopWritePerformed, true);
  assert.equal(output.operatingLoopActionExecuted, true);
  assert.equal(output.operatingLoopExecutedAction, "draft_daily_plan");
  assert.equal(output.operatingLoopExecutionMode, "daily_loop_advance");
  assert.equal(output.operatingLoopBeforeStatus, "ready_to_draft");
  assert.equal(output.operatingLoopAfterStatus, "ready_to_draft");
  assert.equal(output.operatingLoopNextAction, "draft_daily_plan");
  assert.equal(output.operatingLoopTargetWorkspaceId, "weixin_fanfan");
  assert.equal(output.operatingLoopDomainPackId, "domain_pack_fanfan_cambridge_pathway_v1");
  assert.equal(output.operatingLoopTaskCardId, "ltask_operating_1");
  assert.equal(output.operatingLoopPlanDraftId, "lgplan_operating_1");
});

test("operating-loop smoke script defaults to no-write recommend readback", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--domain", "science",
      "--subject", "science",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0);
    const output = parseStdout(result);
    assert.equal(output.ok, true);
    assert.equal(output.source, "growth-learning-operating-loop-service");
    assert.equal(output.operation, "recommend");
    assert.equal(output.writePerformed, false);
    assert.equal(output.operatingLoopWritePerformed, false);
    assert.equal(output.operatingLoopTargetWorkspaceId, "weixin_fanfan");

    const db = new DatabaseSync(dbPath, { open: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = ?").all("table");
    db.close();
    assert.deepEqual(tables, []);
  });
});

test("operating-loop smoke script blocks run-next writes without allow-write", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--operation", "run-next",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 2);
    const output = parseStdout(result);
    assert.equal(output.ok, false);
    assert.equal(output.error, "operating_loop_write_requires_allow_write");
    assert.equal(output.operatingLoopWritePerformed, false);

    const db = new DatabaseSync(dbPath, { open: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = ?").all("table");
    db.close();
    assert.deepEqual(tables, []);
  });
});

test("operating-loop smoke script fails closed for missing workspace and invalid JSON", () => {
  const missingWorkspace = runScript(["--json"]);
  assert.equal(missingWorkspace.status, 2);
  assert.deepEqual(parseStdout(missingWorkspace), {
    ok: false,
    error: "workspace_id_required"
  });

  const invalidJson = runScript(["--input-json", "{", "--json"]);
  assert.equal(invalidJson.status, 2);
  assert.deepEqual(parseStdout(invalidJson), {
    ok: false,
    error: "learning_loop_state_smoke_invalid_json",
    option: "--input-json"
  });
});
