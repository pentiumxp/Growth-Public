const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-automation-failure-policy.js");

const {
  inputFromArgs,
  operationFromArgs,
  shouldAllowWrite,
  validateOperationInput
} = require("../scripts/smoke-growth-automation-failure-policy");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-failure-policy-smoke-"));
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

test("automation failure policy smoke script parses operation, scope, and write gate", () => {
  const args = [
    "--operation", "review",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--policy-id", "lgafpol_ready_1",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--status", "active",
    "--limit", "7",
    "--requested-by", "weixin_owner",
    "--allow-write"
  ];

  assert.equal(operationFromArgs(args), "review");
  assert.equal(shouldAllowWrite(args), true);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    policyId: "lgafpol_ready_1",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "active",
    limit: 7,
    requestedBy: "weixin_owner"
  });
  assert.deepEqual(validateOperationInput("review", inputFromArgs(args), false), {
    ok: false,
    error: "automation_failure_policy_smoke_write_not_allowed",
    operation: "review",
    exitCode: 2
  });
});

test("automation failure policy smoke script checks readiness without writing by default", () => {
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
    assert.equal(output.operation, "readiness");
    assert.equal(output.ok, true);
    assert.equal(output.source, "growth-learning-automation-failure-policy-service");
    assert.equal(output.status, "missing_active_failure_policy");
    assert.equal(output.readyForWritefulAutomationPrerequisite, false);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(tableExists(dbPath, "learning_growth_automation_failure_policies"), undefined);
  });
});

test("automation failure policy smoke script creates and activates policy only with explicit write flag", () => {
  withTempDb(({ dir, dbPath }) => {
    const blocked = runScript([
      "--operation", "create",
      "--workspace-id", "weixin_fanfan",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(blocked.status, 2);
    assert.equal(parseStdout(blocked).error, "automation_failure_policy_smoke_write_not_allowed");

    const created = runScript([
      "--operation", "create",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--domain-pack-id", "uk_hk_curriculum_foundation",
      "--domain", "science",
      "--subject", "science",
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
    assert.equal(createOutput.policy.status, "draft");
    assert.equal(createOutput.policy.privacyClass, "summary_only");
    assert.equal(createOutput.policy.policy.writefulSchedulingAllowed, false);
    assert.equal(createOutput.policy.rollbackPolicy.maxAutomaticRetries, 0);
    assert.equal(createOutput.policy.failurePolicy.writefulSchedulingAllowed, false);
    assert.equal(createOutput.readiness.readyForWritefulAutomationPrerequisite, false);

    const reviewed = runScript([
      "--operation", "review",
      "--workspace-id", "weixin_fanfan",
      "--policy-id", createOutput.policy.policyId,
      "--status", "active",
      "--requested-by", "weixin_owner",
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
    assert.equal(reviewOutput.policy.status, "active");
    assert.equal(reviewOutput.readiness.readyForWritefulAutomationPrerequisite, true);
    assert.equal(reviewOutput.readiness.writefulSchedulingAllowed, false);

    const readiness = runScript([
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(readiness.status, 0);
    const readinessOutput = parseStdout(readiness);
    assert.equal(readinessOutput.status, "failure_policy_ready");
    assert.equal(readinessOutput.readyForWritefulAutomationPrerequisite, true);
    assert.equal(readinessOutput.writefulSchedulingAllowed, false);
  });
});

test("automation failure policy smoke script lists policies through the service", () => {
  withTempDb(({ dir, dbPath }) => {
    const created = runScript([
      "--operation", "create",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--allow-write",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(created.status, 0);

    const listed = runScript([
      "--operation", "list",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(listed.status, 0);
    const output = parseStdout(listed);
    assert.equal(output.operation, "list");
    assert.equal(output.ok, true);
    assert.equal(output.count, 1);
    assert.equal(output.policies[0].status, "draft");
  });
});

test("automation failure policy smoke script fails closed for missing input, invalid JSON, invalid operation, and privacy risk", () => {
  const missingWorkspace = runScript(["--json"]);
  assert.equal(missingWorkspace.status, 2);
  assert.equal(parseStdout(missingWorkspace).error, "workspace_id_required");

  const invalidJson = runScript(["--input-json", "{", "--json"]);
  assert.equal(invalidJson.status, 2);
  assert.deepEqual(parseStdout(invalidJson), {
    ok: false,
    error: "automation_failure_policy_smoke_invalid_json",
    option: "--input-json",
    operation: ""
  });

  const invalidOperation = runScript(["--operation", "publish", "--json"]);
  assert.equal(invalidOperation.status, 2);
  assert.equal(parseStdout(invalidOperation).error, "automation_failure_policy_smoke_operation_invalid");

  const reviewMissingPolicy = runScript([
    "--operation", "review",
    "--workspace-id", "weixin_fanfan",
    "--allow-write",
    "--json"
  ]);
  assert.equal(reviewMissingPolicy.status, 2);
  assert.equal(parseStdout(reviewMissingPolicy).error, "policy_id_required");

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
    assert.equal(output.error, "learning_automation_failure_policy_privacy_failed");
    assert.equal(output.privacyFindings.includes("$.rawPrompt"), true);
  });
});
