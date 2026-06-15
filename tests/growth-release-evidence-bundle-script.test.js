const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "build-growth-release-evidence-bundle.js");
const releaseApprovalScriptPath = path.join(repoRoot, "scripts", "smoke-growth-automation-release-approval.js");

const {
  inputFromArgs,
  outputFileFromArgs,
  taskIds,
  targetNodeIds
} = require("../scripts/build-growth-release-evidence-bundle");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-evidence-bundle-"));
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

test("release evidence bundle script parses bounded scope, tasks, targets, and output file", () => {
  const args = [
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--available-minutes", "15",
    "--limit", "7",
    "--target-node-id", "kg_science_fair_test",
    "--target-node-ids", "kg_science_fair_test,kg_science_observation_language",
    "--task", "planner-readiness",
    "--tasks", "daily_loop_preview,learning_loop_state,scheduler_dry_run",
    "--requested-by", "owner",
    "--created-at", "2026-06-15T06:10:00.000Z",
    "--allow-write-evidence",
    "--daily-loop-write-operation", "publish",
    "--plan-draft-id", "lgpd_daily_1",
    "--output-file", "/tmp/release-evidence.json"
  ];

  assert.deepEqual(targetNodeIds(args), [
    "kg_science_fair_test",
    "kg_science_observation_language"
  ]);
  assert.deepEqual(taskIds(args), [
    "planner-readiness",
    "daily_loop_preview",
    "learning_loop_state",
    "scheduler_dry_run"
  ]);
  assert.equal(outputFileFromArgs(args), "/tmp/release-evidence.json");
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    availableMinutes: 15,
    limit: 7,
    requestedBy: "owner",
    createdAt: "2026-06-15T06:10:00.000Z",
    targetNodeIds: ["kg_science_fair_test", "kg_science_observation_language"],
    tasks: ["planner-readiness", "daily_loop_preview", "learning_loop_state", "scheduler_dry_run"],
    allowWriteEvidence: true,
    dailyLoopWriteOperation: "publish",
    planDraftId: "lgpd_daily_1"
  });
});

test("release evidence bundle script fails closed for missing workspace and invalid task", () => {
  const missingWorkspace = runScript(["--task", "action_handoff", "--json"]);
  assert.equal(missingWorkspace.status, 2);
  assert.deepEqual(parseStdout(missingWorkspace), {
    ok: false,
    error: "release_evidence_bundle_workspace_required",
    invalidTaskIds: [],
    allowedTaskIds: []
  });

  const invalidTask = runScript([
    "--workspace-id", "weixin_fanfan",
    "--task", "not_a_task",
    "--json"
  ]);
  assert.equal(invalidTask.status, 2);
  const output = parseStdout(invalidTask);
  assert.equal(output.ok, false);
  assert.equal(output.error, "release_evidence_bundle_task_invalid");
  assert.deepEqual(output.invalidTaskIds, ["not_a_task"]);
  assert.ok(output.allowedTaskIds.includes("planner_readiness"));
  assert.ok(output.allowedTaskIds.includes("learning_loop_state"));
  assert.ok(output.allowedTaskIds.includes("stage_assessment"));
  assert.ok(output.allowedTaskIds.includes("proposal"));
  assert.ok(output.allowedTaskIds.includes("daily_loop_write"));
  assert.ok(output.allowedTaskIds.includes("release_approval"));
});

test("release evidence bundle script exposes controlled daily-loop write evidence only as explicit blocked task by default", () => {
  const result = runScript([
    "--workspace-id", "smoke_workspace",
    "--learner-id", "smoke_learner",
    "--task", "daily_loop_write",
    "--json"
  ]);

  assert.equal(result.status, 0);
  const bundle = parseStdout(result);
  assert.equal(bundle.schemaVersion, "growth.learningAutomationReleaseEvidenceBundle.v1");
  assert.equal(bundle.summary.taskCount, 1);
  assert.equal(bundle.summary.blockedCount, 1);
  assert.deepEqual(bundle.summary.failedTaskIds, ["daily_loop_write"]);
  assert.equal(bundle.evidence.productionDailyLoopWriteSmokeEvidence.status, "blocked");
  assert.equal(bundle.evidence.productionDailyLoopWriteSmokeEvidence.error, "release_evidence_bundle_write_evidence_not_allowed");
  assert.equal(bundle.evidence.productionDailyLoopWriteSmokeEvidence.requiredFlag, "--allow-write-evidence");
  assert.equal(bundle.evidence.productionDailyLoopWriteSmokeEvidence.smoke, "npm run smoke:daily-loop");
  assert.equal(JSON.stringify(bundle).includes("stdout"), false);
});

test("release evidence bundle script fails closed before write smoke when controlled publish lacks a plan draft id", () => {
  const result = runScript([
    "--workspace-id", "smoke_workspace",
    "--learner-id", "smoke_learner",
    "--task", "daily_loop_write",
    "--allow-write-evidence",
    "--daily-loop-write-operation", "publish",
    "--json"
  ]);

  assert.equal(result.status, 0);
  const bundle = parseStdout(result);
  assert.equal(bundle.summary.blockedCount, 1);
  assert.equal(bundle.evidence.productionDailyLoopWriteSmokeEvidence.status, "blocked");
  assert.equal(bundle.evidence.productionDailyLoopWriteSmokeEvidence.error, "release_evidence_bundle_plan_draft_id_required");
  assert.equal(bundle.evidence.productionDailyLoopWriteSmokeEvidence.summary.operation, "publish");
  assert.equal(JSON.stringify(bundle).includes("stdout"), false);
});

test("release evidence bundle script writes a summary-only bundle from a read-only smoke", () => {
  withTempDb(({ dir, dbPath }) => {
    const bundlePath = path.join(dir, "bundle.json");
    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--program-id", "smoke_program",
      "--domain", "science",
      "--subject", "science",
      "--task", "action_handoff",
      "--output-file", bundlePath,
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0);
    const stdoutBundle = parseStdout(result);
    const fileBundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
    assert.deepEqual(stdoutBundle, fileBundle);
    assert.equal(fileBundle.schemaVersion, "growth.learningAutomationReleaseEvidenceBundle.v1");
    assert.equal(fileBundle.privacyClass, "summary_only");
    assert.equal(fileBundle.scope.workspaceId, "smoke_workspace");
    assert.equal(fileBundle.summary.taskCount, 1);
    assert.equal(fileBundle.evidence.productionActionHandoffSmokeEvidence.source, "growth-release-evidence-bundle-builder");
    assert.equal(fileBundle.evidence.productionActionHandoffSmokeEvidence.smoke, "npm run smoke:action-handoff");
    assert.equal(JSON.stringify(fileBundle).includes("access-key"), false);
    assert.equal(JSON.stringify(fileBundle).includes("stdout"), false);
  });
});

test("release evidence bundle script writes stage-checkpoint evidence from read-only stage smoke", () => {
  withTempDb(({ dir, dbPath }) => {
    const bundlePath = path.join(dir, "stage-bundle.json");
    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--program-id", "smoke_program",
      "--domain", "science",
      "--subject", "science",
      "--target-node-id", "kg_science_fair_test",
      "--task", "stage_assessment",
      "--output-file", bundlePath,
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0);
    const fileBundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
    assert.equal(fileBundle.evidence.stageCheckpointEvidence.source, "growth-release-evidence-bundle-builder");
    assert.equal(fileBundle.evidence.stageCheckpointEvidence.smoke, "npm run smoke:stage-assessment");
    assert.equal(fileBundle.evidence.stageCheckpointEvidence.status, "pass");
    assert.equal(fileBundle.evidence.stageCheckpointEvidence.summary.operation, "readiness");
    assert.equal(fileBundle.evidence.stageCheckpointEvidence.summary.activationState, "dormant");
    assert.equal(JSON.stringify(fileBundle).includes("rawPrompt"), false);
    assert.equal(JSON.stringify(fileBundle).includes("stdout"), false);
  });
});

test("release evidence bundle script collects persisted release approval bag", () => {
  withTempDb(({ dir, dbPath }) => {
    const record = spawnSync(process.execPath, [
      releaseApprovalScriptPath,
      "--operation", "record",
      "--allow-write",
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--program-id", "smoke_program",
      "--domain", "science",
      "--subject", "science",
      "--approval-key", "writeful_execution",
      "--approved-by", "owner",
      "--json"
    ], {
      cwd: repoRoot,
      env: Object.assign({}, process.env, {
        GROWTH_DATA_DIR: dir,
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });
    assert.equal(record.status, 0, record.stderr || record.stdout);

    const bundlePath = path.join(dir, "approval-bundle.json");
    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--program-id", "smoke_program",
      "--domain", "science",
      "--subject", "science",
      "--task", "release_approval",
      "--output-file", bundlePath,
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const fileBundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
    assert.deepEqual(fileBundle.evidence, {});
    assert.equal(fileBundle.releaseApproval.writefulExecutionApproval.approved, true);
    assert.equal(fileBundle.releaseApproval.writefulExecutionApproval.source, "growth_release_approval_record");
    assert.equal(fileBundle.tasks[0].outputKey, "releaseApproval");
    assert.equal(fileBundle.tasks[0].source, "npm run smoke:release-approval");
    assert.equal(JSON.stringify(fileBundle).includes("stdout"), false);
    assert.equal(JSON.stringify(fileBundle).includes("rawPrompt"), false);
  });
});
