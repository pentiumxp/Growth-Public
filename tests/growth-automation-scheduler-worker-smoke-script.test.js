const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-automation-scheduler-worker.js");

const {
  inputFromArgs,
  operationFromArgs,
  shouldAllowWrite,
  validateOperationInput,
  wrapStatusResult
} = require("../scripts/smoke-growth-automation-scheduler-worker");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-scheduler-worker-smoke-"));
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

function tableExists(dbPath, tableName) {
  const db = new DatabaseSync(dbPath, { open: true });
  try {
    return db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);
  } finally {
    db.close();
  }
}

test("automation scheduler worker smoke script parses operation, target scope, and write gate", () => {
  const args = [
    "--operation", "tickTargets",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--worker-mode", "background_worker_tick",
    "--worker-id", "growth-worker-smoke",
    "--lease-ms", "9000",
    "--limit", "7",
    "--max-targets", "2",
    "--generation-key", "background-worker-smoke",
    "--card-schema-version", "growth.learningCard.v1",
    "--target-node-ids", "kg_science_fair_test,kg_science_variables",
    "--requested-by", "owner",
    "--allow-write"
  ];

  assert.equal(operationFromArgs(args), "tick-targets");
  assert.equal(shouldAllowWrite(args), true);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    workerMode: "background_worker_tick",
    workerId: "growth-worker-smoke",
    leaseMs: 9000,
    limit: 7,
    maxTargets: 2,
    generationKey: "background-worker-smoke",
    cardSchemaVersion: "growth.learningCard.v1",
    requestedBy: "owner",
    targetNodeIds: ["kg_science_fair_test", "kg_science_variables"],
    targets: []
  });
  assert.deepEqual(validateOperationInput("tick-targets", inputFromArgs(args), false, {
    automationBackgroundWorkerEnabled: true
  }), {
    ok: false,
    error: "automation_scheduler_worker_smoke_write_not_allowed",
    operation: "tick-targets",
    exitCode: 2
  });
});

test("automation scheduler worker smoke script reports disabled status without writing by default", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0);
    const output = parseStdout(result);
    assert.equal(output.operation, "status");
    assert.equal(output.ok, true);
    assert.equal(output.disabled, true);
    assert.equal(output.expectedDisabled, true);
    assert.equal(output.error, "learning_automation_scheduler_worker_disabled");
    assert.equal(output.workerEnabled, false);
    assert.deepEqual(output.results, []);
    assert.equal(tableExists(dbPath, "learning_growth_automation_scheduler_worker_leases"), undefined);
    assert.equal(tableExists(dbPath, "learning_growth_automation_scheduler_runs"), undefined);
  });
});

test("automation scheduler worker smoke script ticks configured targets only with explicit write flag", () => {
  withTempDb(({ dir, dbPath }) => {
    const targets = [{
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      targetNodeIds: ["kg_science_fair_test"],
      workerTargetId: "lgastgt_smoke_1",
      limit: 2
    }];
    const enabledEnv = {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath,
      GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED: "true",
      GROWTH_AUTOMATION_BACKGROUND_WORKER_ID: "growth-worker-smoke",
      GROWTH_AUTOMATION_BACKGROUND_WORKER_TARGETS_JSON: JSON.stringify(targets)
    };

    const blockedByCli = runScript([
      "--operation", "tick-targets",
      "--workspace-id", "weixin_fanfan",
      "--json"
    ], enabledEnv);
    assert.equal(blockedByCli.status, 2);
    assert.equal(parseStdout(blockedByCli).error, "automation_scheduler_worker_smoke_write_not_allowed");

    const ticked = runScript([
      "--operation", "tick-targets",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--domain-pack-id", "uk_hk_curriculum_foundation",
      "--domain", "science",
      "--subject", "science",
      "--horizon", "daily_plan",
      "--max-targets", "1",
      "--allow-write",
      "--json"
    ], enabledEnv);
    assert.equal(ticked.status, 1);
    const output = parseStdout(ticked);
    assert.equal(output.operation, "tick-targets");
    assert.equal(output.ok, false);
    assert.equal(output.source, "growth-learning-automation-scheduler-worker-service");
    assert.equal(output.workerEnabled, true);
    assert.equal(output.targetSource, "default_config");
    assert.equal(output.attemptedTargets, 1);
    assert.equal(output.results[0].error, "learning_automation_background_scheduler_disabled");
    assert.equal(output.results[0].lease.status, "blocked");
    assert.equal(output.results[0].lease.summary.schedulerRunServiceOnly, true);
    assert.equal(output.results[0].lease.summary.noDirectGateway, true);
    assert.equal(output.results[0].lease.summary.noDirectPublish, true);
    assert.equal(output.results[0].lease.summary.noDirectCardGeneration, true);
    assert.equal(output.results[0].run.status, "blocked");
    assert.equal(output.results[0].run.reason, "learning_automation_background_scheduler_disabled");
    assert.ok(tableExists(dbPath, "learning_growth_automation_scheduler_worker_leases"));
    assert.ok(tableExists(dbPath, "learning_growth_automation_scheduler_runs"));
  });
});

test("automation scheduler worker smoke script fails closed for missing input, invalid JSON, invalid operation, invalid mode, and privacy risk", () => {
  const missingWorkspace = runScript(["--json"]);
  assert.equal(missingWorkspace.status, 2);
  assert.equal(parseStdout(missingWorkspace).error, "workspace_id_required");

  const invalidJson = runScript(["--input-json", "{", "--json"]);
  assert.equal(invalidJson.status, 2);
  assert.deepEqual(parseStdout(invalidJson), {
    ok: false,
    error: "automation_scheduler_worker_smoke_invalid_json",
    option: "--input-json",
    operation: ""
  });

  const invalidTargetsJson = runScript(["--targets-json", "{", "--workspace-id", "weixin_fanfan", "--json"]);
  assert.equal(invalidTargetsJson.status, 2);
  assert.equal(parseStdout(invalidTargetsJson).error, "automation_scheduler_worker_smoke_invalid_json");
  assert.equal(parseStdout(invalidTargetsJson).option, "--targets-json");

  const invalidOperation = runScript(["--operation", "publish", "--json"]);
  assert.equal(invalidOperation.status, 2);
  assert.equal(parseStdout(invalidOperation).error, "automation_scheduler_worker_smoke_operation_invalid");

  const privacy = runScript([
    "--workspace-id", "weixin_fanfan",
    "--input-json", JSON.stringify({ rawPrompt: "do not store" }),
    "--json"
  ]);
  assert.equal(privacy.status, 2);
  const privacyOutput = parseStdout(privacy);
  assert.equal(privacyOutput.error, "automation_scheduler_worker_smoke_privacy_failed");
  assert.equal(privacyOutput.privacyFindings.includes("$.rawPrompt"), true);

  withTempDb(({ dir, dbPath }) => {
    const invalidMode = runScript([
      "--operation", "tick",
      "--workspace-id", "weixin_fanfan",
      "--mode", "publish_now",
      "--allow-write",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath,
      GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED: "true"
    });
    assert.equal(invalidMode.status, 1);
    assert.equal(parseStdout(invalidMode).error, "learning_automation_scheduler_worker_mode_invalid");
  });
});

test("automation scheduler worker smoke script wraps default disabled service status as expected no-write evidence", () => {
  const wrapped = wrapStatusResult({
    ok: false,
    source: "growth-learning-automation-scheduler-worker-service",
    error: "learning_automation_scheduler_worker_disabled",
    workerEnabled: false,
    results: []
  });
  assert.equal(wrapped.ok, true);
  assert.equal(wrapped.disabled, true);
  assert.equal(wrapped.expectedDisabled, true);
});
