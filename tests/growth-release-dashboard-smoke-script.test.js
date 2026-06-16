"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const {
  inputFromArgs,
  runOperation,
  validateInput
} = require("../scripts/smoke-growth-release-dashboard");

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

test("release dashboard smoke script parses bounded scope and release selectors", () => {
  const input = inputFromArgs([
    "--workspace-id", "fanfan",
    "--learner-id", "fanfan",
    "--domain", "science",
    "--subject", "biology",
    "--collection-run-id", "lgacrn_ready_1",
    "--required-approval-keys", "writefulExecutionApproval,backgroundSchedulerApproval",
    "--activation-gates", "writeful_execution,background_scheduler",
    "--activation-record-limit", "10",
    "--runtime-enablement-record-limit", "4",
    "--automation-digest-ui-evidence", "true"
  ]);

  assert.equal(input.workspaceId, "fanfan");
  assert.equal(input.learnerId, "fanfan");
  assert.equal(input.collectionRunId, "lgacrn_ready_1");
  assert.deepEqual(input.requiredApprovalKeys, ["writefulExecutionApproval", "backgroundSchedulerApproval"]);
  assert.deepEqual(input.activationGates, ["writeful_execution", "background_scheduler"]);
  assert.equal(input.activationRecordLimit, 10);
  assert.equal(input.runtimeEnablementRecordLimit, 4);
  assert.equal(input.automationDigestUiEvidence, true);
});

test("release dashboard smoke script requires workspace scope", () => {
  assert.deepEqual(validateInput({}), {
    ok: false,
    error: "release_dashboard_smoke_workspace_required"
  });
  assert.deepEqual(validateInput({ workspaceId: "fanfan" }), { ok: true });
});

test("release dashboard smoke script delegates only to service dashboard", () => {
  const calls = [];
  const service = {
    dashboard(input) {
      calls.push(input);
      return {
        ok: true,
        schemaVersion: "growth.learningAutomationReleaseDashboard.v1",
        status: "manual_runtime_config_required",
        writefulSchedulingAllowed: false
      };
    }
  };

  const result = runOperation(service, {
    workspaceId: "fanfan",
    activationGates: ["writeful_execution"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "manual_runtime_config_required");
  assert.deepEqual(calls[0].activationGates, ["writeful_execution"]);
});

test("release dashboard smoke script runs no-write read model against a temporary SQLite db", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-dashboard-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-release-dashboard.js"),
      "--workspace-id", "fanfan",
      "--learner-id", "fanfan",
      "--activation-gate", "writeful_execution",
      "--json"
    ], {
      cwd: path.join(__dirname, ".."),
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });

    const output = JSON.parse(stdout);
    assert.equal(output.operation, "dashboard");
    assert.equal(output.ok, true);
    assert.equal(output.schemaVersion, "growth.learningAutomationReleaseDashboard.v1");
    assert.equal(output.status, "release_evidence_required");
    assert.equal(output.releaseDashboard.summaryOnly, true);
    assert.equal(output.releaseDashboard.status, "release_evidence_required");
    assert.equal(output.releaseDashboard.readinessEvidencePresentCount, 0);
    assert.equal(output.releaseDashboard.readinessEvidenceMissingCount, 29);
    assert.equal(output.releaseReadiness.evidenceReadback.summaryOnly, true);
    assert.equal(output.releaseReadiness.evidenceReadback.missingCheckKeys.includes("owner_daily_ui_evidence"), true);
    assert.equal(output.releaseInventory.summaryOnly, true);
    assert.equal(output.releaseInventory.releaseEvidenceRecordCount, 0);
    assert.equal(output.artifactReadback.summaryOnly, true);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);
    assert.equal(output.configChangeApplied, false);
    assert.equal(output.runtimeConfigMutationPerformed, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("release dashboard smoke script reads persisted readiness snapshot evidence from SQLite", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-dashboard-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const env = {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    };
    const readiness = runSmoke("smoke-growth-release-readiness.js", [
      "--workspace-id", "fanfan",
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
      "--workspace-id", "fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--domain-pack-id", "uk_hk_curriculum_foundation",
      "--domain", "science",
      "--subject", "science",
      "--evidence-key", "owner_daily_ui_evidence",
      "--evidence-json", JSON.stringify({ evidenceId: "owner_daily_ui_dashboard_1", source: "dashboard_smoke" }),
      "--recorded-by", "weixin_owner",
      "--observed-at", "2026-06-15T18:15:00.000Z"
    ], env);
    const output = runSmoke("smoke-growth-release-dashboard.js", [
      "--workspace-id", "fanfan",
      "--learner-id", "fanfan",
      "--domain", "science",
      "--subject", "science"
    ], env);

    assert.equal(readiness.snapshot.evidenceReadback.summaryOnly, true);
    assert.equal(output.operation, "dashboard");
    assert.equal(output.releaseDashboard.latestReadinessSnapshotId, readiness.snapshot.readinessId);
    assert.equal(output.releaseDashboard.latestReadinessEvidencePresentCount, 0);
    assert.equal(output.releaseDashboard.latestReadinessEvidenceMissingCount, 29);
    assert.equal(output.releaseDashboard.releaseEvidenceRecordCount, 1);
    assert.equal(output.releaseDashboard.latestReleaseEvidenceRecordId, releaseEvidence.evidence.evidenceRecordId);
    assert.equal(output.releaseDashboard.latestReleaseEvidenceKey, "ownerDailyUiEvidence");
    assert.equal(output.releaseDashboard.latestReleaseEvidenceCheckKey, "owner_daily_ui_evidence");
    assert.equal(output.releaseDashboard.latestReleaseEvidenceStatus, "pass");
    assert.equal(output.releaseInventory.latestReleaseEvidenceRecordId, releaseEvidence.evidence.evidenceRecordId);
    assert.equal(output.artifactReadback.snapshots.latestId, readiness.snapshot.readinessId);
    assert.equal(output.artifactReadback.snapshots.latestEvidenceReadbackMissingCount, 29);
    assert.equal(output.artifactReadback.releaseEvidence.latestId, releaseEvidence.evidence.evidenceRecordId);
    assert.equal(output.artifactReadback.releaseEvidence.latestEvidenceKey, "ownerDailyUiEvidence");
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigMutationPerformed, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
