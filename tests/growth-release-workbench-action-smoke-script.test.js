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
} = require("../scripts/smoke-growth-release-workbench-action");

function validOwnerDailyUiEvidence(source = "workbench_action_smoke") {
  return {
    ok: true,
    source: "growth-learning-automation-ui-evidence-service",
    schemaVersion: "growth.learningAutomationUiEvidence.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    evidenceKey: "ownerDailyUiEvidence",
    checkKey: "owner_daily_ui_evidence",
    uiGate: "owner_daily",
    status: "pass",
    readyForReleaseEvidence: true,
    uiEvidence: {
      source,
      evidenceKey: "ownerDailyUiEvidence",
      checkKey: "owner_daily_ui_evidence",
      uiGate: "owner_daily",
      status: "pass",
      screenshotPresent: true,
      domEvidencePresent: false,
      screenshotArtifactName: "growth-owner-daily.png",
      coverage: ["owner_daily_generation", "daily_loop_preview", "target_context"],
      requiredCoverage: ["owner_daily_generation", "daily_loop_preview", "target_context"],
      missingCoverage: [],
      assertionCount: 1,
      failedAssertionCount: 0
    },
    missingRequired: []
  };
}

test("release workbench action smoke script parses bounded action input", () => {
  const input = inputFromArgs([
    "--workspace-id", "fanfan",
    "--learner-id", "fanfan",
    "--endpoint-key", "release_evidence_collection",
    "--evidence-key", "owner_daily_ui_evidence",
    "--target-node-id", "kg_science_fair_test",
    "--tasks", "planner_readiness,learning_loop_state",
    "--required-task", "planner_readiness",
    "--required-tasks", "learning_loop_state",
    "--required-approval-key", "writefulExecutionApproval",
    "--activation-gates", "writeful_execution,background_scheduler",
    "--write-collection-run",
    "--write-release-evidence-records",
    "--release-evidence-bundle-json", JSON.stringify({ schemaVersion: "growth.learningAutomationReleaseEvidenceBundle.v1", summaryOnly: true }),
    "--release-evidence-bundle-audit-json", JSON.stringify({ schemaVersion: "growth.learningAutomationReleaseEvidenceBundleAudit.v1", summaryOnly: true }),
    "--release-readiness-json", JSON.stringify({ schemaVersion: "growth.learningAutomationReleaseReadiness.v1", summaryOnly: true }),
    "--release-collection-run-json", JSON.stringify({ schemaVersion: "growth.learningAutomationReleaseCollectionRun.v1", summaryOnly: true }),
    "--release-decision-json", JSON.stringify({ schemaVersion: "growth.learningAutomationReleaseDecision.v1", summaryOnly: true }),
    "--evidence-json", JSON.stringify({ evidenceId: "ui_1" }),
    "--requested-by", "owner"
  ]);

  assert.equal(input.workspaceId, "fanfan");
  assert.equal(input.endpointKey, "release_evidence_collection");
  assert.equal(input.evidenceKey, "owner_daily_ui_evidence");
  assert.deepEqual(input.targetNodeIds, ["kg_science_fair_test"]);
  assert.deepEqual(input.tasks, ["planner_readiness", "learning_loop_state"]);
  assert.deepEqual(input.requiredTaskIds, ["planner_readiness", "learning_loop_state"]);
  assert.deepEqual(input.requiredApprovalKeys, ["writefulExecutionApproval"]);
  assert.deepEqual(input.activationGates, ["writeful_execution", "background_scheduler"]);
  assert.equal(input.writeCollectionRun, true);
  assert.equal(input.writeReleaseEvidenceRecords, true);
  assert.equal(input.releaseEvidenceBundle.schemaVersion, "growth.learningAutomationReleaseEvidenceBundle.v1");
  assert.equal(input.releaseEvidenceBundleAudit.schemaVersion, "growth.learningAutomationReleaseEvidenceBundleAudit.v1");
  assert.equal(input.releaseReadiness.schemaVersion, "growth.learningAutomationReleaseReadiness.v1");
  assert.equal(input.releaseCollectionRun.schemaVersion, "growth.learningAutomationReleaseCollectionRun.v1");
  assert.equal(input.releaseDecision.schemaVersion, "growth.learningAutomationReleaseDecision.v1");
  assert.deepEqual(input.evidence, { evidenceId: "ui_1" });
  assert.equal(input.requestedBy, "owner");
});

test("release workbench action smoke script requires explicit write flag", () => {
  assert.deepEqual(validateInput({ workspaceId: "fanfan", endpointKey: "release_evidence" }, false), {
    ok: false,
    error: "release_workbench_action_write_not_allowed",
    requiredFlag: "--allow-write"
  });
  assert.deepEqual(validateInput({ workspaceId: "fanfan", endpointKey: "release_evidence" }, true), { ok: true });
});

test("release workbench action smoke script delegates only to action service", () => {
  const calls = [];
  const service = {
    recordAction(input) {
      calls.push(input);
      return {
        ok: true,
        schemaVersion: "growth.learningAutomationReleaseWorkbenchAction.v1",
        endpointKey: input.endpointKey,
        writefulSchedulingAllowed: false
      };
    }
  };

  const result = runOperation(service, {
    workspaceId: "fanfan",
    endpointKey: "release_evidence"
  });

  assert.equal(result.ok, true);
  assert.equal(result.endpointKey, "release_evidence");
  assert.equal(calls[0].workspaceId, "fanfan");
});

test("release workbench action smoke script can run evidence collection through the workbench facade", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-workbench-action-collection-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-release-workbench-action.js"),
      "--workspace-id", "fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--domain", "science",
      "--subject", "science",
      "--endpoint-key", "release_evidence_collection",
      "--action-key", "release_collection_run",
      "--task", "planner_readiness",
      "--required-task", "planner_readiness",
      "--write-collection-run",
      "--write-release-evidence-records",
      "--requested-by", "owner",
      "--allow-write",
      "--json"
    ], {
      cwd: path.join(__dirname, ".."),
      env: Object.assign({}, process.env, {
        GROWTH_DATA_DIR: dir,
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });

    const output = JSON.parse(stdout);
    assert.equal(output.operation, "record");
    assert.equal(output.ok, true);
    assert.equal(output.schemaVersion, "growth.learningAutomationReleaseWorkbenchAction.v1");
    assert.equal(output.endpointKey, "release_evidence_collection");
    assert.equal(output.actionRecord.endpointKey, "release_evidence_collection");
    assert.match(output.actionRecord.recordId, /^lgacrn_/);
    assert.equal(output.writeResult.collection.schemaVersion, "growth.learningAutomationReleaseEvidenceCollection.v1");
    assert.equal(output.writeResult.collection.summary.collectionRunWritten, true);
    assert.equal(typeof output.writeResult.collection.summary.releaseEvidenceRecordAttemptedCount, "number");
    assert.equal(output.writeResult.collection.writeReleaseEvidenceRecords, true);
    assert.equal(output.writeResult.collection.writefulSchedulingAllowed, false);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);
    assert.equal(output.configChangeApplied, false);

    const db = new DatabaseSync(dbPath, { open: true, readOnly: true });
    try {
      const row = db.prepare("SELECT * FROM learning_growth_automation_release_collection_runs WHERE workspace_id = ?").get("fanfan");
      assert.equal(row.privacy_class, "summary_only");
      assert.equal(JSON.parse(row.summary_json).writefulSchedulingAllowed, false);
    } finally {
      db.close();
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("release workbench action smoke script writes evidence only with explicit allow-write", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-workbench-action-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-release-workbench-action.js"),
      "--workspace-id", "fanfan",
      "--learner-id", "fanfan",
      "--endpoint-key", "release_evidence",
      "--evidence-key", "owner_daily_ui_evidence",
      "--evidence-json", JSON.stringify(validOwnerDailyUiEvidence("workbench_action_smoke")),
      "--requested-by", "owner",
      "--allow-write",
      "--json"
    ], {
      cwd: path.join(__dirname, ".."),
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });

    const output = JSON.parse(stdout);
    assert.equal(output.operation, "record");
    assert.equal(output.ok, true);
    assert.equal(output.schemaVersion, "growth.learningAutomationReleaseWorkbenchAction.v1");
    assert.equal(output.endpointKey, "release_evidence");
    assert.equal(output.actionRecord.recordStatus, "pass");
    assert.match(output.actionRecord.recordId, /^lgarev_/);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);
    assert.equal(output.configChangeApplied, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
