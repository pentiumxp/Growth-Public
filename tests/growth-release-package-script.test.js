const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "build-growth-release-package.js");

const {
  inputFromArgs,
  outputFileFromArgs,
  requiredTaskIdsFromArgs,
  taskIds
} = require("../scripts/build-growth-release-package");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-package-"));
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

test("release package script parses package, bundle, and audit options", () => {
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
    "--write-collection-run",
    "--allow-write",
    "--requested-by", "owner",
    "--created-at", "2026-06-16T05:00:00.000Z",
    "--output-file", "/tmp/release-package.json"
  ];

  assert.deepEqual(taskIds(args), ["planner_readiness", "scheduler_dry_run"]);
  assert.deepEqual(requiredTaskIdsFromArgs(args), ["planner_readiness", "scheduler_dry_run"]);
  assert.equal(outputFileFromArgs(args), "/tmp/release-package.json");
  const input = inputFromArgs(args);
  assert.equal(input.workspaceId, "weixin_fanfan");
  assert.equal(input.learnerId, "fanfan");
  assert.equal(input.writeCollectionRun, true);
  assert.equal(input.allowWritePackage, true);
  assert.deepEqual(input.tasks, ["planner_readiness", "scheduler_dry_run"]);
  assert.deepEqual(input.requiredTaskIds, ["planner_readiness", "scheduler_dry_run"]);
});

test("release package script fails closed for collection-run write without allow-write", () => {
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
  assert.equal(output.error, "release_package_write_not_allowed");
  assert.equal(output.requiredFlag, "--allow-write");
});

test("release package script writes summary-only package output from selected no-write smoke tasks", () => {
  withTempDb(({ dir, dbPath }) => {
    const packagePath = path.join(dir, "release-package.json");
    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--program-id", "smoke_program",
      "--domain", "science",
      "--subject", "science",
      "--task", "planner_readiness",
      "--required-task", "planner_readiness",
      "--output-file", packagePath,
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = parseStdout(result);
    assert.equal(output.schemaVersion, "growth.learningAutomationReleasePackage.v1");
    assert.equal(output.privacyClass, "summary_only");
    assert.equal(output.summaryOnly, true);
    assert.equal(output.workspaceId, "smoke_workspace");
    assert.equal(output.steps[0].key, "release_evidence_bundle");
    assert.equal(output.artifacts.releaseEvidenceBundle.schemaVersion, "growth.learningAutomationReleaseEvidenceBundle.v1");
    assert.equal(output.artifacts.releaseEvidenceBundleAudit.schemaVersion, "growth.learningAutomationReleaseEvidenceBundleAudit.v1");
    assert.equal(output.artifacts.releaseReadiness.summary.schemaVersion, "growth.learningAutomationReleaseReadiness.summary.v1");
    assert.equal(output.artifacts.releaseCollectionRun.schemaVersion, "growth.learningAutomationReleaseCollectionRun.v1");
    assert.equal(output.artifacts.releaseControls.schemaVersion, "growth.learningAutomationReleaseControls.v1");
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);
    assert.equal(JSON.stringify(output).includes("stdout"), false);
    assert.equal(JSON.stringify(output).includes("/Users/"), false);
    const fileOutput = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    assert.equal(fileOutput.schemaVersion, "growth.learningAutomationReleasePackage.v1");
  });
});
