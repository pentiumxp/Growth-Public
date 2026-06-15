const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-automation-proposal.js");

const {
  inputFromArgs,
  operationFromArgs,
  shouldAllowWrite,
  validateOperationInput
} = require("../scripts/smoke-growth-automation-proposal");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-proposal-smoke-"));
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

test("automation proposal smoke script parses operation, source cycle, graph selectors, and write gate", () => {
  const args = [
    "--operation", "review",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--proposal-id", "lgauto_ready_1",
    "--source-plan-draft-id", "lgplan_previous",
    "--source-task-card-id", "ltask_previous",
    "--source-evaluation-id", "leval_previous",
    "--profile-delta-id", "lgpdelta_previous",
    "--evidence-id", "lgevd_previous",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--status", "accepted",
    "--limit", "7",
    "--audit-limit", "9",
    "--available-minutes", "15",
    "--target-node-id", "kg_science_fair_test",
    "--target-node-ids", "kg_science_fair_test,kg_science_observation_language",
    "--source-target-node-id", "kg_science_previous",
    "--source-target-node-ids", "kg_science_previous,kg_science_prereq",
    "--allowed-card-role", "repair",
    "--allowed-card-roles", "teaching,repair",
    "--note", "Owner accepts the bounded proposal.",
    "--requested-by", "weixin_owner",
    "--allow-write"
  ];

  assert.equal(operationFromArgs(args), "review");
  assert.equal(shouldAllowWrite(args), true);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    proposalId: "lgauto_ready_1",
    planDraftId: "",
    selectedItemId: "",
    sourcePlanDraftId: "lgplan_previous",
    sourceTaskCardId: "ltask_previous",
    sourceEvaluationId: "leval_previous",
    profileDeltaId: "lgpdelta_previous",
    evidenceId: "lgevd_previous",
    correctionId: "",
    sourceId: "",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "accepted",
    limit: 7,
    auditLimit: 9,
    availableMinutes: 15,
    targetNodeIds: ["kg_science_fair_test", "kg_science_observation_language"],
    sourceTargetNodeIds: ["kg_science_previous", "kg_science_prereq"],
    allowedCardRoles: ["repair", "teaching"],
    generationKey: "",
    cardSchemaVersion: "",
    note: "Owner accepts the bounded proposal.",
    requestedBy: "weixin_owner"
  });
  assert.deepEqual(validateOperationInput("review", inputFromArgs(args), false), {
    ok: false,
    error: "automation_proposal_smoke_write_not_allowed",
    operation: "review",
    exitCode: 2
  });
});

test("automation proposal smoke script lists without writing by default", () => {
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
    assert.equal(output.source, "growth-learning-automation-proposal-service");
    assert.equal(output.count, 0);
    assert.deepEqual(output.proposals, []);
    assert.equal(tableExists(dbPath, "learning_growth_automation_proposals"), undefined);
  });
});

test("automation proposal smoke script gates writes and delegates failed create through service", () => {
  withTempDb(({ dir, dbPath }) => {
    const blocked = runScript([
      "--operation", "create",
      "--workspace-id", "weixin_fanfan",
      "--source-task-card-id", "ltask_previous",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(blocked.status, 2);
    assert.equal(parseStdout(blocked).error, "automation_proposal_smoke_write_not_allowed");

    const createFailed = runScript([
      "--operation", "create",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--source-task-card-id", "ltask_previous",
      "--target-node-id", "kg_science_fair_test",
      "--domain", "science",
      "--subject", "science",
      "--requested-by", "weixin_owner",
      "--allow-write",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(createFailed.status, 1);
    const output = parseStdout(createFailed);
    assert.equal(output.operation, "create");
    assert.equal(output.ok, false);
    assert.equal(output.source || "", "");
    assert.equal(output.error, "learning_automation_cycle_not_ready");
    assert.equal(output.stage, "audit_completeness");
  });
});

test("automation proposal smoke script fails closed for missing input, invalid JSON, invalid operation, and privacy risk", () => {
  const missingWorkspace = runScript(["--json"]);
  assert.equal(missingWorkspace.status, 2);
  assert.equal(parseStdout(missingWorkspace).error, "workspace_id_required");

  const invalidJson = runScript(["--input-json", "{", "--json"]);
  assert.equal(invalidJson.status, 2);
  assert.deepEqual(parseStdout(invalidJson), {
    ok: false,
    error: "automation_proposal_smoke_invalid_json",
    option: "--input-json",
    operation: ""
  });

  const invalidOperation = runScript([
    "--operation", "execute",
    "--workspace-id", "weixin_fanfan",
    "--json"
  ]);
  assert.equal(invalidOperation.status, 2);
  assert.equal(parseStdout(invalidOperation).error, "automation_proposal_smoke_operation_invalid");

  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--operation", "create",
      "--workspace-id", "weixin_fanfan",
      "--input-json", JSON.stringify({ sourceTaskCardId: "ltask_previous", rawPrompt: "do not store" }),
      "--allow-write",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 1);
    const output = parseStdout(result);
    assert.equal(output.ok, false);
    assert.equal(output.error, "learning_automation_proposal_privacy_failed");
    assert.equal(output.privacyFindings.includes("$.rawPrompt"), true);
  });
});
