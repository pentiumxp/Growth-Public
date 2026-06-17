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
  projectAutomationSchedulerWorkerTargetSmokeReadback,
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

test("automation scheduler worker target smoke script projects bounded operator readback", () => {
  const projected = projectAutomationSchedulerWorkerTargetSmokeReadback({
    ok: true,
    count: 2,
    targets: [{
      targetId: "lgastgt_proposed",
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      status: "proposed",
      targetVersion: "growth.learningAutomationSchedulerWorkerTarget.v1",
      privacyClass: "summary_only",
      target: {
        targetNodeIds: ["kg_science_fair_test"],
        provisionMode: "explicit_provision"
      },
      policy: {
        workerMode: "background_worker_tick",
        schedulerRunMode: "background_supervised_tick",
        ownerReviewRequired: true,
        targetProvisioningRequired: true,
        actionHandoffRequiredBeforeScheduling: true,
        productionSchedulingAllowed: false,
        maxActionsPerTick: 4
      },
      readiness: {
        targetProvisioningReady: true,
        targetEnabled: false,
        selectedDomainPackId: "uk_hk_curriculum_foundation",
        selectedDomain: "science",
        selectedSubject: "science",
        productionSchedulingAllowed: false
      }
    }, {
      targetId: "lgastgt_enabled",
      status: "enabled"
    }]
  }, "list", { workspaceId: "weixin_fanfan", learnerId: "fanfan" }, false);

  assert.equal(projected.automationSchedulerWorkerTargetStatus, "proposed");
  assert.equal(projected.automationSchedulerWorkerTargetOk, true);
  assert.equal(projected.automationSchedulerWorkerTargetOperation, "list");
  assert.equal(projected.automationSchedulerWorkerTargetWriteOperation, false);
  assert.equal(projected.automationSchedulerWorkerTargetWriteAllowed, false);
  assert.equal(projected.automationSchedulerWorkerTargetWritesPerformed, false);
  assert.equal(projected.automationSchedulerWorkerTargetWorkspaceId, "weixin_fanfan");
  assert.equal(projected.automationSchedulerWorkerTargetLearnerId, "fanfan");
  assert.equal(projected.automationSchedulerWorkerTargetProgramId, "program_science");
  assert.equal(projected.automationSchedulerWorkerTargetDomainPackId, "uk_hk_curriculum_foundation");
  assert.equal(projected.automationSchedulerWorkerTargetDomain, "science");
  assert.equal(projected.automationSchedulerWorkerTargetSubject, "science");
  assert.equal(projected.automationSchedulerWorkerTargetCount, 2);
  assert.equal(projected.automationSchedulerWorkerTargetTargetId, "lgastgt_proposed");
  assert.deepEqual(projected.automationSchedulerWorkerTargetTargetIds, ["lgastgt_proposed", "lgastgt_enabled"]);
  assert.deepEqual(projected.automationSchedulerWorkerTargetStatuses, ["proposed", "enabled"]);
  assert.equal(projected.automationSchedulerWorkerTargetProposedCount, 1);
  assert.equal(projected.automationSchedulerWorkerTargetEnabledCount, 1);
  assert.equal(projected.automationSchedulerWorkerTargetTargetVersion, "growth.learningAutomationSchedulerWorkerTarget.v1");
  assert.equal(projected.automationSchedulerWorkerTargetPrivacyClass, "summary_only");
  assert.equal(projected.automationSchedulerWorkerTargetRequiresOwnerReview, true);
  assert.equal(projected.automationSchedulerWorkerTargetProductionSchedulingAllowed, false);
  assert.equal(projected.automationSchedulerWorkerTargetProvisioningReady, true);
  assert.equal(projected.automationSchedulerWorkerTargetEnabled, false);
  assert.equal(projected.automationSchedulerWorkerTargetReadinessMode, "explicit_provision");
  assert.equal(projected.automationSchedulerWorkerTargetNodeCount, 1);
  assert.deepEqual(projected.automationSchedulerWorkerTargetNodeIds, ["kg_science_fair_test"]);
  assert.equal(projected.automationSchedulerWorkerTargetWorkerMode, "background_worker_tick");
  assert.equal(projected.automationSchedulerWorkerTargetSchedulerRunMode, "background_supervised_tick");
  assert.equal(projected.automationSchedulerWorkerTargetOwnerReviewRequired, true);
  assert.equal(projected.automationSchedulerWorkerTargetTargetProvisioningRequired, true);
  assert.equal(projected.automationSchedulerWorkerTargetActionHandoffRequiredBeforeScheduling, true);
  assert.equal(projected.automationSchedulerWorkerTargetMaxActionsPerTick, 4);
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
    assert.equal(output.automationSchedulerWorkerTargetStatus, "listed");
    assert.equal(output.automationSchedulerWorkerTargetOk, true);
    assert.equal(output.automationSchedulerWorkerTargetOperation, "list");
    assert.equal(output.automationSchedulerWorkerTargetWriteOperation, false);
    assert.equal(output.automationSchedulerWorkerTargetWriteAllowed, false);
    assert.equal(output.automationSchedulerWorkerTargetWritesPerformed, false);
    assert.equal(output.automationSchedulerWorkerTargetWorkspaceId, "weixin_fanfan");
    assert.equal(output.automationSchedulerWorkerTargetLearnerId, "fanfan");
    assert.equal(output.automationSchedulerWorkerTargetCount, 0);
    assert.deepEqual(output.automationSchedulerWorkerTargetTargetIds, []);
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
    assert.equal(createOutput.automationSchedulerWorkerTargetStatus, "proposed");
    assert.equal(createOutput.automationSchedulerWorkerTargetOperation, "create");
    assert.equal(createOutput.automationSchedulerWorkerTargetWriteOperation, true);
    assert.equal(createOutput.automationSchedulerWorkerTargetWriteAllowed, true);
    assert.equal(createOutput.automationSchedulerWorkerTargetWritesPerformed, true);
    assert.equal(createOutput.automationSchedulerWorkerTargetTargetId, createOutput.target.targetId);
    assert.equal(createOutput.automationSchedulerWorkerTargetProvisioningReady, true);
    assert.equal(createOutput.automationSchedulerWorkerTargetProductionSchedulingAllowed, false);
    assert.equal(createOutput.automationSchedulerWorkerTargetMaxActionsPerTick, 4);

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
    assert.equal(reviewOutput.automationSchedulerWorkerTargetStatus, "enabled");
    assert.equal(reviewOutput.automationSchedulerWorkerTargetOperation, "review");
    assert.equal(reviewOutput.automationSchedulerWorkerTargetWriteOperation, true);
    assert.equal(reviewOutput.automationSchedulerWorkerTargetWriteAllowed, true);
    assert.equal(reviewOutput.automationSchedulerWorkerTargetWritesPerformed, true);
    assert.equal(reviewOutput.automationSchedulerWorkerTargetEnabled, true);
    assert.equal(reviewOutput.automationSchedulerWorkerTargetProductionSchedulingAllowed, false);

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
    assert.equal(runnableOutput.automationSchedulerWorkerTargetStatus, "enabled");
    assert.equal(runnableOutput.automationSchedulerWorkerTargetOperation, "runnable");
    assert.equal(runnableOutput.automationSchedulerWorkerTargetRunnableCount, 1);
    assert.equal(runnableOutput.automationSchedulerWorkerTargetTargetId, createOutput.target.targetId);
    assert.deepEqual(runnableOutput.automationSchedulerWorkerTargetTargetIds, [createOutput.target.targetId]);
    assert.equal(runnableOutput.automationSchedulerWorkerTargetEnabledCount, 1);
    assert.equal(runnableOutput.automationSchedulerWorkerTargetMaxActionsPerTick, 4);
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
