const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const {
  inputFromArgs,
  runOperation,
  validateInput
} = require("../scripts/smoke-growth-release-inventory");

const repoRoot = path.join(__dirname, "..");

function runSmoke(scriptName, args, env = {}) {
  const stdout = childProcess.execFileSync(process.execPath, [
    path.join(repoRoot, "scripts", scriptName),
    ...args,
    "--json"
  ], {
    cwd: repoRoot,
    env: Object.assign({}, process.env, { NODE_NO_WARNINGS: "1" }, env),
    encoding: "utf8"
  });
  return JSON.parse(stdout);
}

test("release inventory smoke script parses scope, gates, and evidence flags", () => {
  const input = inputFromArgs([
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--collection-run-id", "lgacrn_1",
    "--activation-gates", "writeful_execution,background_scheduler",
    "--required-approval-key", "writefulExecutionApproval",
    "--runtime-enablement-record-limit", "7",
    "--automation-digest-ui-evidence", "true",
    "--json"
  ]);
  assert.equal(input.workspaceId, "weixin_fanfan");
  assert.equal(input.learnerId, "fanfan");
  assert.equal(input.collectionRunId, "lgacrn_1");
  assert.deepEqual(input.activationGates, ["writeful_execution", "background_scheduler"]);
  assert.deepEqual(input.requiredApprovalKeys, ["writefulExecutionApproval"]);
  assert.equal(input.runtimeEnablementRecordLimit, 7);
  assert.equal(input.automationDigestUiEvidence, true);
});

test("release inventory smoke script requires workspace", () => {
  const result = validateInput(inputFromArgs([]));
  assert.equal(result.ok, false);
  assert.equal(result.error, "release_inventory_smoke_workspace_required");
});

test("release inventory smoke script delegates to inventory service only", () => {
  const calls = [];
  const result = runOperation({
    inventory(input) {
      calls.push(input);
      return {
        ok: true,
        schemaVersion: "growth.learningAutomationReleaseInventory.v1",
        status: "records_available",
        releaseInventory: { summaryOnly: true }
      };
    }
  }, {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    limit: 5
  });
  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, "growth.learningAutomationReleaseInventory.v1");
  assert.deepEqual(calls, [{ workspaceId: "weixin_fanfan", learnerId: "fanfan", limit: 5 }]);
});

test("release inventory smoke script reads persisted readiness snapshot evidence from SQLite", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-inventory-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const env = {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    };
    const readiness = runSmoke("smoke-growth-release-readiness.js", [
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--domain-pack-id", "uk_hk_curriculum_foundation",
      "--domain", "science",
      "--subject", "science",
      "--write-snapshot",
      "--created-by", "weixin_owner",
      "--created-at", "2026-06-15T18:10:00.000Z"
    ], env);
    const releaseEvidence = runSmoke("smoke-growth-automation-release-evidence.js", [
      "--operation", "record",
      "--allow-write",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--domain-pack-id", "uk_hk_curriculum_foundation",
      "--domain", "science",
      "--subject", "science",
      "--evidence-key", "owner_daily_ui_evidence",
      "--evidence-json", JSON.stringify({ evidenceId: "owner_daily_ui_smoke_1", source: "inventory_smoke" }),
      "--recorded-by", "weixin_owner",
      "--observed-at", "2026-06-15T18:15:00.000Z"
    ], env);
    const output = runSmoke("smoke-growth-release-inventory.js", [
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--domain", "science",
      "--subject", "science"
    ], env);

    assert.equal(readiness.snapshot.evidenceReadback.summaryOnly, true);
    assert.equal(releaseEvidence.evidence.evidenceKey, "ownerDailyUiEvidence");
    assert.equal(output.operation, "inventory");
    assert.equal(output.ok, true);
    assert.equal(output.releaseInventory.latestReadinessSnapshotId, readiness.snapshot.readinessId);
    assert.equal(output.releaseInventory.latestReadinessEvidencePresentCount, 0);
    assert.equal(output.releaseInventory.latestReadinessEvidenceMissingCount, 29);
    assert.equal(output.releaseInventory.releaseEvidenceRecordCount, 1);
    assert.equal(output.releaseInventory.latestReleaseEvidenceRecordId, releaseEvidence.evidence.evidenceRecordId);
    assert.equal(output.releaseInventory.latestReleaseEvidenceKey, "ownerDailyUiEvidence");
    assert.equal(output.releaseInventory.latestReleaseEvidenceCheckKey, "owner_daily_ui_evidence");
    assert.equal(output.releaseInventory.latestReleaseEvidenceStatus, "pass");
    assert.equal(output.artifactReadback.snapshots.latest.id, readiness.snapshot.readinessId);
    assert.equal(output.artifactReadback.snapshots.latest.evidenceReadback.summaryOnly, true);
    assert.equal(output.artifactReadback.snapshots.latest.evidenceReadback.missingCount, 29);
    assert.equal(output.artifactReadback.releaseEvidence.latest.id, releaseEvidence.evidence.evidenceRecordId);
    assert.equal(output.artifactReadback.releaseEvidence.latest.evidenceKey, "ownerDailyUiEvidence");
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigMutationPerformed, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
