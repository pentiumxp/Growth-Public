const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-release-evidence-collection.js");

const {
  inputFromArgs,
  outputFileFromArgs,
  requiredTaskIdsFromArgs,
  taskIds
} = require("../scripts/smoke-growth-release-evidence-collection");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-evidence-collection-"));
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

test("release evidence collection script parses scope, tasks, and write gate", () => {
  const args = [
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--task", "planner_readiness",
    "--tasks", "scheduler_dry_run",
    "--required-task", "planner_readiness",
    "--required-tasks", "scheduler_dry_run",
    "--auto-select-latest-completed-cycle",
    "--write-collection-run",
    "--write-release-evidence-records",
    "--allow-write",
    "--requested-by", "owner",
    "--created-at", "2026-06-16T07:00:00.000Z",
    "--output-file", "/tmp/release-evidence-collection.json"
  ];

  assert.deepEqual(taskIds(args), ["planner_readiness", "scheduler_dry_run"]);
  assert.deepEqual(requiredTaskIdsFromArgs(args), ["planner_readiness", "scheduler_dry_run"]);
  assert.equal(outputFileFromArgs(args), "/tmp/release-evidence-collection.json");
  const input = inputFromArgs(args);
  assert.equal(input.workspaceId, "weixin_fanfan");
  assert.equal(input.learnerId, "fanfan");
  assert.equal(input.writeCollectionRun, true);
  assert.equal(input.writeReleaseEvidenceRecords, true);
  assert.equal(input.allowWriteCollection, true);
  assert.equal(input.autoSelectLatestCompletedCycle, true);
});

test("release evidence collection script fails closed for write without allow-write", () => {
  const result = runScript([
    "--workspace-id", "smoke_workspace",
    "--task", "planner_readiness",
    "--required-task", "planner_readiness",
    "--write-collection-run",
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = parseStdout(result);
  assert.equal(output.ok, false);
  assert.equal(output.error, "release_evidence_collection_write_not_allowed");
  assert.equal(output.requiredFlag, "--allow-write");
});

test("release evidence collection script fails closed for release evidence record write without allow-write", () => {
  const result = runScript([
    "--workspace-id", "smoke_workspace",
    "--task", "planner_readiness",
    "--required-task", "planner_readiness",
    "--write-release-evidence-records",
    "--json"
  ]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = parseStdout(result);
  assert.equal(output.ok, false);
  assert.equal(output.error, "release_evidence_collection_write_not_allowed");
  assert.equal(output.writeReleaseEvidenceRecords, true);
});

test("release evidence collection script writes summary-only collection output", () => {
  withTempDb(({ dir, dbPath }) => {
    const collectionPath = path.join(dir, "release-evidence-collection.json");
    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--program-id", "smoke_program",
      "--domain", "science",
      "--subject", "science",
      "--task", "planner_readiness",
      "--required-task", "planner_readiness",
      "--output-file", collectionPath,
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = parseStdout(result);
    assert.equal(output.schemaVersion, "growth.learningAutomationReleaseEvidenceCollection.v1");
    assert.equal(output.privacyClass, "summary_only");
    assert.equal(output.summaryOnly, true);
    assert.equal(output.workspaceId, "smoke_workspace");
    assert.deepEqual(output.steps.map((step) => step.key), [
      "release_evidence_bundle",
      "release_evidence_bundle_audit",
      "release_readiness",
      "release_collection_run"
    ]);
    assert.equal(output.artifacts.releaseEvidenceBundle.schemaVersion, "growth.learningAutomationReleaseEvidenceBundle.v1");
    assert.equal(output.artifacts.releaseEvidenceBundleAudit.schemaVersion, "growth.learningAutomationReleaseEvidenceBundleAudit.v1");
    assert.equal(output.artifacts.releaseReadiness.summary.schemaVersion, "growth.learningAutomationReleaseReadiness.summary.v1");
    assert.equal(output.artifacts.releaseCollectionRun.schemaVersion, "growth.learningAutomationReleaseCollectionRun.v1");
    assert.equal(output.summary.stepCount, 4);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);
    assert.equal(JSON.stringify(output).includes("stdout"), false);
    assert.equal(JSON.stringify(output).includes("/Users/"), false);
    const fileOutput = JSON.parse(fs.readFileSync(collectionPath, "utf8"));
    assert.equal(fileOutput.schemaVersion, "growth.learningAutomationReleaseEvidenceCollection.v1");
  });
});

test("release evidence collection script can record a summary-only collection run", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--program-id", "smoke_program",
      "--domain", "science",
      "--subject", "science",
      "--task", "planner_readiness",
      "--required-task", "planner_readiness",
      "--write-collection-run",
      "--allow-write",
      "--result-json",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = parseStdout(result);
    assert.equal(output.collection.summary.collectionRunWritten, true);
    assert.equal(output.collection.artifacts.releaseCollectionRun.privacyClass, "summary_only");
    assert.equal(output.collection.artifacts.releaseCollectionRun.summary.writefulSchedulingAllowed, false);

    const db = new DatabaseSync(dbPath, { open: true, readOnly: true });
    try {
      const row = db.prepare("SELECT * FROM learning_growth_automation_release_collection_runs WHERE workspace_id = ?").get("smoke_workspace");
      assert.equal(row.privacy_class, "summary_only");
      assert.equal(JSON.parse(row.summary_json).writefulSchedulingAllowed, false);
      assert.equal(JSON.parse(row.bundle_summary_json).summaryOnly, true);
      assert.equal(JSON.parse(row.readiness_summary_json).summaryOnly, true);
    } finally {
      db.close();
    }
  });
});
