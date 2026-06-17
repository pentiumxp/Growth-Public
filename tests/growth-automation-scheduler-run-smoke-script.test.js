const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-automation-scheduler-run.js");

const {
  inputFromArgs,
  operationFromArgs,
  projectAutomationSchedulerRunSmokeReadback,
  shouldAllowWrite,
  validateOperationInput
} = require("../scripts/smoke-growth-automation-scheduler-run");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-scheduler-run-smoke-"));
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

test("automation scheduler run smoke script parses operation, target scope, and write gate", () => {
  const args = [
    "--operation", "run-once",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--run-id", "lgasrun_owner_1",
    "--run-mode", "background_supervised_tick",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--status", "blocked",
    "--limit", "7",
    "--generation-key", "background-supervised-tick",
    "--card-schema-version", "growth.learningCard.v1",
    "--requested-by", "weixin_owner",
    "--allow-write"
  ];

  assert.equal(operationFromArgs(args), "run");
  assert.equal(shouldAllowWrite(args), true);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    runId: "lgasrun_owner_1",
    runMode: "background_supervised_tick",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "blocked",
    limit: 7,
    generationKey: "background-supervised-tick",
    cardSchemaVersion: "growth.learningCard.v1",
    requestedBy: "weixin_owner"
  });
  assert.deepEqual(validateOperationInput("run", inputFromArgs(args), false), {
    ok: false,
    error: "automation_scheduler_run_smoke_write_not_allowed",
    operation: "run",
    exitCode: 2
  });
});

test("automation scheduler run smoke script projects bounded operator readback", () => {
  const projected = projectAutomationSchedulerRunSmokeReadback({
    ok: true,
    count: 2,
    runs: [{
      runId: "lgasrun_blocked",
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      mode: "background_supervised_tick",
      status: "blocked",
      reason: "learning_automation_background_scheduler_disabled",
      error: "learning_automation_background_scheduler_disabled",
      privacyClass: "summary_only",
      input: {
        runMode: "background_supervised_tick",
        limit: 7,
        backgroundSchedulerEnabled: false
      },
      candidates: [{
        handoffId: "lgahand_ready",
        proposalId: "lgauto_ready"
      }],
      executions: [{
        executionId: "lgasexec_blocked",
        status: "blocked"
      }],
      summary: {
        backgroundSchedulerEnabled: false,
        executionDelegation: "learning-automation-scheduler-execution-service.executeOnce",
        inspectedHandoffs: 1,
        inspectedActions: 1,
        attemptedExecutions: 1,
        published: 0,
        failed: 0,
        blocked: 1,
        skipped: 0,
        writefulExecutionConfigRequired: true,
        noDirectGateway: true,
        noDirectPlanPublish: true,
        noDirectCardGeneration: true,
        noStageAssessmentActivation: true
      }
    }, {
      runId: "lgasrun_completed",
      status: "completed"
    }]
  }, "list", {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    generationKey: "background-supervised-tick",
    cardSchemaVersion: "growth.learningCard.v1"
  }, false);

  assert.equal(projected.automationSchedulerRunStatus, "blocked");
  assert.equal(projected.automationSchedulerRunOk, true);
  assert.equal(projected.automationSchedulerRunOperation, "list");
  assert.equal(projected.automationSchedulerRunWriteOperation, false);
  assert.equal(projected.automationSchedulerRunWriteAllowed, false);
  assert.equal(projected.automationSchedulerRunRecordWritten, false);
  assert.equal(projected.automationSchedulerRunWritesPerformed, false);
  assert.equal(projected.automationSchedulerRunCompleted, false);
  assert.equal(projected.automationSchedulerRunWorkspaceId, "weixin_fanfan");
  assert.equal(projected.automationSchedulerRunLearnerId, "fanfan");
  assert.equal(projected.automationSchedulerRunProgramId, "program_science");
  assert.equal(projected.automationSchedulerRunDomainPackId, "uk_hk_curriculum_foundation");
  assert.equal(projected.automationSchedulerRunDomain, "science");
  assert.equal(projected.automationSchedulerRunSubject, "science");
  assert.equal(projected.automationSchedulerRunCount, 2);
  assert.equal(projected.automationSchedulerRunRunId, "lgasrun_blocked");
  assert.deepEqual(projected.automationSchedulerRunRunIds, ["lgasrun_blocked", "lgasrun_completed"]);
  assert.deepEqual(projected.automationSchedulerRunStatuses, ["blocked", "completed"]);
  assert.equal(projected.automationSchedulerRunBlockedCount, 1);
  assert.equal(projected.automationSchedulerRunCompletedCount, 1);
  assert.equal(projected.automationSchedulerRunMode, "background_supervised_tick");
  assert.equal(projected.automationSchedulerRunReason, "learning_automation_background_scheduler_disabled");
  assert.equal(projected.automationSchedulerRunError, "learning_automation_background_scheduler_disabled");
  assert.equal(projected.automationSchedulerRunBackgroundSchedulerEnabled, false);
  assert.equal(projected.automationSchedulerRunExecutionDelegation, "learning-automation-scheduler-execution-service.executeOnce");
  assert.equal(projected.automationSchedulerRunInspectedHandoffCount, 1);
  assert.equal(projected.automationSchedulerRunInspectedActionCount, 1);
  assert.equal(projected.automationSchedulerRunCandidateCount, 1);
  assert.equal(projected.automationSchedulerRunAttemptedExecutionCount, 1);
  assert.equal(projected.automationSchedulerRunBlockedExecutionCount, 1);
  assert.deepEqual(projected.automationSchedulerRunExecutionIds, ["lgasexec_blocked"]);
  assert.deepEqual(projected.automationSchedulerRunExecutionStatuses, ["blocked"]);
  assert.deepEqual(projected.automationSchedulerRunCandidateHandoffIds, ["lgahand_ready"]);
  assert.deepEqual(projected.automationSchedulerRunCandidateProposalIds, ["lgauto_ready"]);
  assert.equal(projected.automationSchedulerRunLimit, 7);
  assert.equal(projected.automationSchedulerRunGenerationKey, "background-supervised-tick");
  assert.equal(projected.automationSchedulerRunCardSchemaVersion, "growth.learningCard.v1");
  assert.equal(projected.automationSchedulerRunWritefulExecutionConfigRequired, true);
  assert.equal(projected.automationSchedulerRunNoDirectGateway, true);
  assert.equal(projected.automationSchedulerRunNoDirectPlanPublish, true);
  assert.equal(projected.automationSchedulerRunNoDirectCardGeneration, true);
  assert.equal(projected.automationSchedulerRunNoStageAssessmentActivation, true);
});

test("automation scheduler run smoke script lists without writing by default", () => {
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
    assert.equal(output.source, "growth-learning-automation-scheduler-run-service");
    assert.equal(output.count, 0);
    assert.deepEqual(output.runs, []);
    assert.equal(output.automationSchedulerRunStatus, "listed");
    assert.equal(output.automationSchedulerRunOk, true);
    assert.equal(output.automationSchedulerRunOperation, "list");
    assert.equal(output.automationSchedulerRunWriteOperation, false);
    assert.equal(output.automationSchedulerRunWriteAllowed, false);
    assert.equal(output.automationSchedulerRunRecordWritten, false);
    assert.equal(output.automationSchedulerRunWritesPerformed, false);
    assert.equal(output.automationSchedulerRunWorkspaceId, "weixin_fanfan");
    assert.equal(output.automationSchedulerRunLearnerId, "fanfan");
    assert.equal(output.automationSchedulerRunCount, 0);
    assert.deepEqual(output.automationSchedulerRunRunIds, []);
    assert.equal(tableExists(dbPath, "learning_growth_automation_scheduler_runs"), undefined);
  });
});

test("automation scheduler run smoke script records disabled run only with explicit write flag", () => {
  withTempDb(({ dir, dbPath }) => {
    const blockedByCli = runScript([
      "--operation", "run",
      "--workspace-id", "weixin_fanfan",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(blockedByCli.status, 2);
    assert.equal(parseStdout(blockedByCli).error, "automation_scheduler_run_smoke_write_not_allowed");

    const executed = runScript([
      "--operation", "run",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--run-id", "lgasrun_disabled_1",
      "--domain-pack-id", "uk_hk_curriculum_foundation",
      "--domain", "science",
      "--subject", "science",
      "--horizon", "daily_plan",
      "--requested-by", "weixin_owner",
      "--allow-write",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(executed.status, 1);
    const runOutput = parseStdout(executed);
    assert.equal(runOutput.operation, "run");
    assert.equal(runOutput.ok, false);
    assert.equal(runOutput.error, "learning_automation_background_scheduler_disabled");
    assert.equal(runOutput.run.status, "blocked");
    assert.equal(runOutput.run.reason, "learning_automation_background_scheduler_disabled");
    assert.equal(runOutput.run.summary.backgroundSchedulerEnabled, false);
    assert.equal(runOutput.run.summary.executionDelegation, "learning-automation-scheduler-execution-service.executeOnce");
    assert.equal(runOutput.run.summary.noDirectGateway, true);
    assert.equal(runOutput.run.summary.noDirectPlanPublish, true);
    assert.equal(runOutput.run.summary.noDirectCardGeneration, true);
    assert.equal(runOutput.run.summary.noStageAssessmentActivation, true);
    assert.equal(runOutput.automationSchedulerRunStatus, "blocked");
    assert.equal(runOutput.automationSchedulerRunOk, false);
    assert.equal(runOutput.automationSchedulerRunOperation, "run");
    assert.equal(runOutput.automationSchedulerRunWriteOperation, true);
    assert.equal(runOutput.automationSchedulerRunWriteAllowed, true);
    assert.equal(runOutput.automationSchedulerRunRecordWritten, true);
    assert.equal(runOutput.automationSchedulerRunWritesPerformed, true);
    assert.equal(runOutput.automationSchedulerRunCompleted, false);
    assert.equal(runOutput.automationSchedulerRunRunId, "lgasrun_disabled_1");
    assert.equal(runOutput.automationSchedulerRunReason, "learning_automation_background_scheduler_disabled");
    assert.equal(runOutput.automationSchedulerRunError, "learning_automation_background_scheduler_disabled");
    assert.equal(runOutput.automationSchedulerRunBackgroundSchedulerEnabled, false);
    assert.equal(runOutput.automationSchedulerRunExecutionDelegation, "learning-automation-scheduler-execution-service.executeOnce");
    assert.equal(runOutput.automationSchedulerRunNoDirectGateway, true);
    assert.equal(runOutput.automationSchedulerRunNoDirectPlanPublish, true);
    assert.equal(runOutput.automationSchedulerRunNoDirectCardGeneration, true);
    assert.equal(runOutput.automationSchedulerRunNoStageAssessmentActivation, true);

    const listed = runScript([
      "--operation", "list",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--status", "blocked",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(listed.status, 0);
    const listOutput = parseStdout(listed);
    assert.equal(listOutput.operation, "list");
    assert.equal(listOutput.count, 1);
    assert.equal(listOutput.runs[0].runId, "lgasrun_disabled_1");
    assert.equal(listOutput.runs[0].status, "blocked");
    assert.equal(listOutput.automationSchedulerRunStatus, "blocked");
    assert.equal(listOutput.automationSchedulerRunBlockedCount, 1);
    assert.deepEqual(listOutput.automationSchedulerRunRunIds, ["lgasrun_disabled_1"]);
  });
});

test("automation scheduler run smoke script fails closed for missing input, invalid JSON, invalid operation, and privacy risk", () => {
  const missingWorkspace = runScript(["--json"]);
  assert.equal(missingWorkspace.status, 2);
  assert.equal(parseStdout(missingWorkspace).error, "workspace_id_required");

  const invalidJson = runScript(["--input-json", "{", "--json"]);
  assert.equal(invalidJson.status, 2);
  assert.deepEqual(parseStdout(invalidJson), {
    ok: false,
    error: "automation_scheduler_run_smoke_invalid_json",
    option: "--input-json",
    operation: ""
  });

  const invalidOperation = runScript(["--operation", "publish", "--json"]);
  assert.equal(invalidOperation.status, 2);
  assert.equal(parseStdout(invalidOperation).error, "automation_scheduler_run_smoke_operation_invalid");

  withTempDb(({ dir, dbPath }) => {
    const privacy = runScript([
      "--operation", "run",
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
    assert.equal(output.error, "learning_automation_scheduler_run_privacy_failed");
    assert.equal(output.privacyFindings.includes("$.rawPrompt"), true);
  });
});
