const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const { createGrowthLearningSqliteStore } = require("../src/stores/growth-learning-sqlite-store");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-automation-scheduler-worker-target.js");

const {
  inputFromArgs,
  operationFromArgs,
  shouldAllowWrite,
  validateOperationInput
} = require("../scripts/smoke-growth-automation-scheduler-worker-target");

function sciencePack() {
  return {
    schemaVersion: "hermes.learningGraphSeed.v0.1",
    importId: "kg_import_worker_target_smoke",
    version: "2026-06-15-test",
    privacyClass: "summary_only",
    sourceDocuments: [{
      sourceRef: "worker-target-smoke:source",
      title: "Worker target smoke source"
    }],
    domainPacks: [{
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      title: "UK/HK Curriculum Foundation",
      sourceKind: "owner_manual",
      version: "2026-06-15-test",
      visibility: "private_seed",
      importStatus: "validated_seed"
    }],
    nodes: [{
      nodeId: "kg_science_fair_test",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      nodeType: "topic",
      title: "Fair test",
      stage: "lower_secondary",
      subject: "science",
      curriculum: "test",
      sourceKind: "owner_manual",
      sourceRef: "worker-target-smoke:source",
      version: "2026-06-15-test",
      privacyClass: "summary_only",
      learningOutcomes: ["Identify fair test variables"],
      evidenceRequired: ["Explain one controlled variable"]
    }],
    edges: []
  };
}

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-scheduler-worker-target-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath, { open: true }).close();
  try {
    return callback({ dir, dbPath });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function seedScienceGraph(dbPath) {
  const store = createGrowthLearningSqliteStore({ dbPath });
  const result = store.learningGraphRepository.importPack({
    pack: sciencePack(),
    validation: {
      validation: { duplicate_node_ids: 0, missing_edge_endpoints: 0, prerequisite_cycles: 0 },
      warnings: []
    },
    sourceFile: "worker-target-smoke.json",
    sourceSha256: "worker_target_smoke_hash"
  });
  assert.equal(result.ok, true);
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

test("automation scheduler worker target smoke script parses operation, target scope, and write gate", () => {
  const args = [
    "--operation", "list-runnable",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--target-id", "lgastgt_ready_1",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--status", "enabled",
    "--target-node-ids", "kg_science_fair_test,kg_science_variables",
    "--target-version", "growth.learningAutomationSchedulerWorkerTarget.v1",
    "--limit", "7",
    "--reason", "owner reviewed",
    "--requested-by", "weixin_owner",
    "--allow-write"
  ];

  assert.equal(operationFromArgs(args), "runnable");
  assert.equal(shouldAllowWrite(args), true);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    targetId: "lgastgt_ready_1",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "enabled",
    targetVersion: "growth.learningAutomationSchedulerWorkerTarget.v1",
    displayName: "",
    label: "",
    targetNodeIds: ["kg_science_fair_test", "kg_science_variables"],
    limit: 7,
    reason: "owner reviewed",
    requestedBy: "weixin_owner"
  });
  assert.deepEqual(validateOperationInput("create", inputFromArgs(args), false), {
    ok: false,
    error: "automation_scheduler_worker_target_smoke_write_not_allowed",
    operation: "create",
    exitCode: 2
  });
});

test("automation scheduler worker target smoke script lists without writing by default", () => {
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
    assert.equal(output.operation, "list");
    assert.equal(output.ok, true);
    assert.equal(output.source, "growth-learning-automation-scheduler-worker-target-service");
    assert.equal(output.count, 0);
    assert.deepEqual(output.targets, []);
    assert.equal(tableExists(dbPath, "learning_growth_automation_scheduler_worker_targets"), undefined);
  });
});

test("automation scheduler worker target smoke script creates, reviews, and lists runnable targets only with explicit write flag", () => {
  withTempDb(({ dir, dbPath }) => {
    seedScienceGraph(dbPath);

    const blockedByCli = runScript([
      "--operation", "create",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(blockedByCli.status, 2);
    assert.equal(parseStdout(blockedByCli).error, "automation_scheduler_worker_target_smoke_write_not_allowed");

    const created = runScript([
      "--operation", "create",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--domain-pack-id", "uk_hk_curriculum_foundation",
      "--domain", "science",
      "--subject", "science",
      "--target-node-ids", "kg_science_fair_test",
      "--limit", "4",
      "--requested-by", "weixin_owner",
      "--allow-write",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(created.status, 0);
    const createOutput = parseStdout(created);
    assert.equal(createOutput.operation, "create");
    assert.equal(createOutput.ok, true);
    assert.equal(createOutput.workerTargetRequiresOwnerReview, true);
    assert.equal(createOutput.productionSchedulingAllowed, false);
    assert.equal(createOutput.target.status, "proposed");
    assert.equal(createOutput.target.policy.maxActionsPerTick, 4);
    assert.equal(createOutput.target.readiness.targetProvisioningReady, true);
    assert.equal(createOutput.target.readiness.productionSchedulingAllowed, false);

    const reviewed = runScript([
      "--operation", "review",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--target-id", createOutput.target.targetId,
      "--status", "enabled",
      "--reason", "owner reviewed target scope",
      "--reviewed-by", "weixin_owner",
      "--allow-write",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(reviewed.status, 0);
    const reviewOutput = parseStdout(reviewed);
    assert.equal(reviewOutput.operation, "review");
    assert.equal(reviewOutput.ok, true);
    assert.equal(reviewOutput.productionSchedulingAllowed, false);
    assert.equal(reviewOutput.target.status, "enabled");
    assert.equal(reviewOutput.target.review.productionSchedulingAllowed, false);

    const runnable = runScript([
      "--operation", "runnable",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(runnable.status, 0);
    const runnableOutput = parseStdout(runnable);
    assert.equal(runnableOutput.operation, "runnable");
    assert.equal(runnableOutput.count, 1);
    assert.equal(runnableOutput.targets[0].workerTargetId, createOutput.target.targetId);
    assert.equal(runnableOutput.targets[0].limit, 4);
  });
});

test("automation scheduler worker target smoke script fails closed for missing input, invalid JSON, invalid operation, missing review fields, and privacy risk", () => {
  const missingWorkspace = runScript(["--json"]);
  assert.equal(missingWorkspace.status, 2);
  assert.equal(parseStdout(missingWorkspace).error, "workspace_id_required");

  const invalidJson = runScript(["--input-json", "{", "--json"]);
  assert.equal(invalidJson.status, 2);
  assert.deepEqual(parseStdout(invalidJson), {
    ok: false,
    error: "automation_scheduler_worker_target_smoke_invalid_json",
    option: "--input-json",
    operation: ""
  });

  const invalidOperation = runScript(["--operation", "publish", "--json"]);
  assert.equal(invalidOperation.status, 2);
  assert.equal(parseStdout(invalidOperation).error, "automation_scheduler_worker_target_smoke_operation_invalid");

  const missingTarget = runScript([
    "--operation", "review",
    "--workspace-id", "weixin_fanfan",
    "--status", "enabled",
    "--allow-write",
    "--json"
  ]);
  assert.equal(missingTarget.status, 2);
  assert.equal(parseStdout(missingTarget).error, "target_id_required");

  const missingStatus = runScript([
    "--operation", "review",
    "--workspace-id", "weixin_fanfan",
    "--target-id", "lgastgt_ready_1",
    "--allow-write",
    "--json"
  ]);
  assert.equal(missingStatus.status, 2);
  assert.equal(parseStdout(missingStatus).error, "review_status_required");

  withTempDb(({ dir, dbPath }) => {
    const privacy = runScript([
      "--operation", "create",
      "--workspace-id", "weixin_fanfan",
      "--input-json", JSON.stringify({ rawPrompt: "do not store" }),
      "--allow-write",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(privacy.status, 1);
    const output = parseStdout(privacy);
    assert.equal(output.ok, false);
    assert.equal(output.error, "learning_automation_scheduler_worker_target_privacy_failed");
    assert.equal(output.privacyFindings.includes("$.rawPrompt"), true);
  });
});
