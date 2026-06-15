const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-scheduler-dry-run.js");

const {
  inputFromArgs,
  sourceTargetNodeIds,
  targetNodeIds
} = require("../scripts/smoke-growth-scheduler-dry-run");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-scheduler-dry-run-smoke-"));
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

test("scheduler dry-run smoke script parses bounded scope and graph selectors", () => {
  const args = [
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--proposal-id", "lgauto_ready_1",
    "--plan-draft-id", "lgplan_next_science",
    "--selected-item-id", "plan_item_next_1",
    "--profile-delta-id", "lgpdelta_previous",
    "--evidence-id", "lgevd_previous",
    "--correction-id", "lgcorr_previous",
    "--source-id", "source_cycle_previous",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--target-node-id", "kg_science_fair_test",
    "--target-node-ids", "kg_science_fair_test,kg_science_observation_language",
    "--source-target-node-id", "kg_science_previous",
    "--source-target-node-ids", "kg_science_previous,kg_science_prereq",
    "--limit", "7",
    "--audit-limit", "9",
    "--requested-by", "weixin_owner"
  ];

  assert.deepEqual(targetNodeIds(args), [
    "kg_science_fair_test",
    "kg_science_observation_language"
  ]);
  assert.deepEqual(sourceTargetNodeIds(args), [
    "kg_science_previous",
    "kg_science_prereq"
  ]);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    proposalId: "lgauto_ready_1",
    planDraftId: "lgplan_next_science",
    selectedItemId: "plan_item_next_1",
    profileDeltaId: "lgpdelta_previous",
    evidenceId: "lgevd_previous",
    correctionId: "lgcorr_previous",
    sourceId: "source_cycle_previous",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    limit: 7,
    auditLimit: 9,
    targetNodeIds: ["kg_science_fair_test", "kg_science_observation_language"],
    sourceTargetNodeIds: ["kg_science_previous", "kg_science_prereq"],
    requestedBy: "weixin_owner"
  });
});

test("scheduler dry-run smoke script delegates to service without writing by default", () => {
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
    assert.equal(output.source, "growth-learning-automation-scheduler-service");
    assert.equal(output.dryRun, true);
    assert.equal(output.writePlanned, false);
    assert.equal(output.writesPerformed, false);
    assert.equal(output.publishPlanned, false);
    assert.equal(output.count, 0);
    assert.deepEqual(output.candidates, []);

    const db = new DatabaseSync(dbPath, { open: true });
    const table = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get("learning_growth_automation_proposals");
    db.close();
    assert.equal(table, undefined);
  });
});

test("scheduler dry-run smoke script fails closed for privacy-risk input", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--input-json", JSON.stringify({ rawPrompt: "do not store" }),
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 1);
    const output = parseStdout(result);
    assert.equal(output.ok, false);
    assert.equal(output.error, "learning_automation_scheduler_privacy_failed");
    assert.equal(output.privacyFindings.includes("$.rawPrompt"), true);
  });
});

test("scheduler dry-run smoke script fails closed for missing workspace and invalid JSON", () => {
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
    error: "scheduler_dry_run_smoke_invalid_json",
    option: "--input-json"
  });
});
