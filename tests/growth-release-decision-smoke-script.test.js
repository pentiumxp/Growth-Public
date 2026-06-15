const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-release-decision.js");

const {
  inputFromArgs,
  operationFromArgs,
  runOperation,
  shouldAllowWrite,
  validateOperationInput
} = require("../scripts/smoke-growth-release-decision");

function sampleCollectionRun() {
  return {
    schemaVersion: "growth.learningAutomationReleaseCollectionRun.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    runId: "lgacrn_ready_1",
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "ready_for_release_review",
    readyForReleaseReview: true,
    summary: {
      summaryOnly: true,
      readyForReleaseEvidence: true,
      readyForReleaseReview: true,
      writefulSchedulingAllowed: false
    },
    releaseReview: {
      summaryOnly: true,
      advisoryOnly: true,
      writefulSchedulingAllowed: false
    }
  };
}

function withRunFile(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-decision-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  const runPath = path.join(dir, "collection-run.json");
  fs.writeFileSync(runPath, JSON.stringify(sampleCollectionRun(), null, 2));
  try {
    return callback({ dbPath, dir, runPath });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("release decision smoke script parses bounded selectors and defaults to evaluate", () => {
  withRunFile(({ runPath }) => {
    const args = [
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--collection-run-file", runPath,
      "--status", "approved",
      "--limit", "5"
    ];

    assert.equal(operationFromArgs(args), "evaluate");
    assert.equal(shouldAllowWrite(args), false);
    const input = inputFromArgs(args);
    assert.equal(input.workspaceId, "weixin_fanfan");
    assert.equal(input.learnerId, "fanfan");
    assert.equal(input.programId, "program_science");
    assert.equal(input.releaseCollectionRunFile, "collection-run.json");
    assert.equal(input.releaseCollectionRun.runId, "lgacrn_ready_1");
    assert.equal(input.status, "approved");
    assert.equal(input.limit, 5);
  });
});

test("release decision smoke script requires explicit write flag for record", () => {
  const input = {
    workspaceId: "weixin_fanfan",
    collectionRunId: "lgacrn_ready_1",
    status: "blocked"
  };

  const blocked = validateOperationInput("record", input, false);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, "release_decision_smoke_write_not_allowed");

  const allowed = validateOperationInput("record", input, true);
  assert.equal(allowed.ok, true);
});

test("release decision smoke script delegates operations to service only", () => {
  const calls = [];
  const service = {
    evaluateDecision(input) {
      calls.push({ type: "evaluateDecision", input });
      return { ok: true, status: "approved" };
    },
    recordDecision(input) {
      calls.push({ type: "recordDecision", input });
      return { ok: true, decision: { decisionId: "lgard_1" } };
    },
    listDecisions(input) {
      calls.push({ type: "listDecisions", input });
      return { ok: true, decisions: [] };
    }
  };

  runOperation(service, "evaluate", { workspaceId: "weixin_fanfan", collectionRunId: "lgacrn_1" });
  runOperation(service, "record", { workspaceId: "weixin_fanfan", collectionRunId: "lgacrn_1" });
  runOperation(service, "list", { workspaceId: "weixin_fanfan" });

  assert.deepEqual(calls.map((call) => call.type), ["evaluateDecision", "recordDecision", "listDecisions"]);
});

test("release decision smoke script records against a temporary SQLite db only when allowed", () => {
  withRunFile(({ dbPath, runPath }) => {
    const evaluate = spawnSync(process.execPath, [
      scriptPath,
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--collection-run-file", runPath,
      "--status", "approved",
      "--json"
    ], {
      cwd: repoRoot,
      env: Object.assign({}, process.env, { GROWTH_LEARNING_DB_PATH: dbPath }),
      encoding: "utf8"
    });
    assert.equal(evaluate.status, 0, evaluate.stderr || evaluate.stdout);
    const evaluateOutput = JSON.parse(evaluate.stdout);
    assert.equal(evaluateOutput.ok, true);
    assert.equal(evaluateOutput.operation, "evaluate");
    assert.equal(evaluateOutput.status, "approved");
    assert.equal(JSON.stringify(evaluateOutput).includes(path.dirname(runPath)), false);

    const record = spawnSync(process.execPath, [
      scriptPath,
      "--operation", "record",
      "--allow-write",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--collection-run-file", runPath,
      "--status", "approved",
      "--decided-by", "weixin_owner",
      "--json"
    ], {
      cwd: repoRoot,
      env: Object.assign({}, process.env, { GROWTH_LEARNING_DB_PATH: dbPath }),
      encoding: "utf8"
    });
    assert.equal(record.status, 0, record.stderr || record.stdout);
    const recordOutput = JSON.parse(record.stdout);
    assert.equal(recordOutput.ok, true);
    assert.equal(recordOutput.operation, "record");
    assert.equal(recordOutput.decision.status, "approved");
    assert.equal(recordOutput.decision.collectionRunId, "lgacrn_ready_1");

    const list = spawnSync(process.execPath, [
      scriptPath,
      "--operation", "list",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--json"
    ], {
      cwd: repoRoot,
      env: Object.assign({}, process.env, { GROWTH_LEARNING_DB_PATH: dbPath }),
      encoding: "utf8"
    });
    assert.equal(list.status, 0, list.stderr || list.stdout);
    const listOutput = JSON.parse(list.stdout);
    assert.equal(listOutput.ok, true);
    assert.equal(listOutput.decisions.length, 1);
  });
});

test("release decision smoke script rejects invalid JSON before service construction", () => {
  const result = spawnSync(process.execPath, [scriptPath, "--workspace-id", "weixin_fanfan", "--collection-run-json", "{"], {
    cwd: repoRoot,
    env: Object.assign({}, process.env),
    encoding: "utf8"
  });

  assert.equal(result.status, 2);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, false);
  assert.equal(output.error, "release_decision_smoke_invalid_json");
});
