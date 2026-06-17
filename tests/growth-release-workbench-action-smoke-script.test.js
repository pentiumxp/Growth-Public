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
    "--auto-select-latest-ready-collection-run",
    "--write-collection-run",
    "--write-release-evidence-records",
    "--release-evidence-bundle-json", JSON.stringify({ schemaVersion: "growth.learningAutomationReleaseEvidenceBundle.v1", summaryOnly: true }),
    "--release-evidence-bundle-audit-json", JSON.stringify({ schemaVersion: "growth.learningAutomationReleaseEvidenceBundleAudit.v1", summaryOnly: true }),
    "--release-readiness-json", JSON.stringify({ schemaVersion: "growth.learningAutomationReleaseReadiness.v1", summaryOnly: true }),
    "--release-collection-run-json", JSON.stringify({ schemaVersion: "growth.learningAutomationReleaseCollectionRun.v1", summaryOnly: true }),
    "--release-decision-json", JSON.stringify({ schemaVersion: "growth.learningAutomationReleaseDecision.v1", summaryOnly: true }),
    "--central-visual-evidence-file", "/tmp/central-visual.json",
    "--release-package-review-ui-evidence-file", "/tmp/release-package-review-ui.json",
    "--scheduler-run-ui-evidence-file", "/tmp/scheduler-run-ui.json",
    "--build-and-record-package",
    "--evidence-json", JSON.stringify({ evidenceId: "ui_1" }),
    "--requested-by", "owner"
  ]);

  assert.equal(input.workspaceId, "fanfan");
  assert.equal(input.operation, "record");
  assert.equal(input.endpointKey, "release_evidence_collection");
  assert.equal(input.evidenceKey, "owner_daily_ui_evidence");
  assert.deepEqual(input.targetNodeIds, ["kg_science_fair_test"]);
  assert.deepEqual(input.tasks, ["planner_readiness", "learning_loop_state"]);
  assert.deepEqual(input.requiredTaskIds, ["planner_readiness", "learning_loop_state"]);
  assert.deepEqual(input.requiredApprovalKeys, ["writefulExecutionApproval"]);
  assert.deepEqual(input.activationGates, ["writeful_execution", "background_scheduler"]);
  assert.equal(input.autoSelectLatestReadyCollectionRun, true);
  assert.equal(input.writeCollectionRun, true);
  assert.equal(input.writeReleaseEvidenceRecords, true);
  assert.equal(input.releaseEvidenceBundle.schemaVersion, "growth.learningAutomationReleaseEvidenceBundle.v1");
  assert.equal(input.releaseEvidenceBundleAudit.schemaVersion, "growth.learningAutomationReleaseEvidenceBundleAudit.v1");
  assert.equal(input.releaseReadiness.schemaVersion, "growth.learningAutomationReleaseReadiness.v1");
  assert.equal(input.releaseCollectionRun.schemaVersion, "growth.learningAutomationReleaseCollectionRun.v1");
  assert.equal(input.releaseDecision.schemaVersion, "growth.learningAutomationReleaseDecision.v1");
  assert.equal(input.centralVisualEvidenceFile, "/tmp/central-visual.json");
  assert.equal(input.releasePackageReviewUiEvidenceFile, "/tmp/release-package-review-ui.json");
  assert.equal(input.schedulerRunUiEvidenceFile, "/tmp/scheduler-run-ui.json");
  assert.equal(input.buildReleasePackage, true);
  assert.deepEqual(input.evidence, { evidenceId: "ui_1" });
  assert.equal(input.requestedBy, "owner");
});

test("release workbench action smoke script parses action-audit list input", () => {
  const input = inputFromArgs([
    "--operation", "list-audits",
    "--workspace-id", "fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--endpoint-key", "release_evidence",
    "--action-key", "owner_daily_ui_evidence",
    "--status", "recorded",
    "--collection-run-id", "lgacrn_cli_1",
    "--limit", "7"
  ]);

  assert.equal(input.operation, "list-audits");
  assert.equal(input.workspaceId, "fanfan");
  assert.equal(input.learnerId, "fanfan");
  assert.equal(input.programId, "program_science");
  assert.equal(input.domainPackId, "uk_hk_curriculum_foundation");
  assert.equal(input.domain, "science");
  assert.equal(input.subject, "science");
  assert.equal(input.horizon, "daily_plan");
  assert.equal(input.endpointKey, "release_evidence");
  assert.equal(input.actionKey, "owner_daily_ui_evidence");
  assert.equal(input.status, "recorded");
  assert.equal(input.collectionRunId, "lgacrn_cli_1");
  assert.equal(input.limit, 7);
});

test("release workbench action smoke script maps artifact manifest into evidence collection input", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-workbench-action-manifest-"));
  try {
    const manifestPath = path.join(dir, "release-artifacts-manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify({
      schemaVersion: "growth.learningAutomationReleaseEvidenceArtifactManifest.v1",
      privacyClass: "summary_only",
      artifacts: [{
        taskId: "owner_daily_ui",
        file: "/tmp/owner-daily-ui.json"
      }, {
        checkKey: "scheduler_run_ui_evidence",
        file: "/tmp/scheduler-run-ui.json"
      }]
    }), "utf8");

    const input = inputFromArgs([
      "--workspace-id", "fanfan",
      "--endpoint-key", "release_evidence_collection",
      "--task", "planner_readiness",
      "--required-task", "planner_readiness",
      "--release-evidence-artifact-manifest-file", manifestPath
    ]);

    assert.equal(input.ownerDailyUiEvidenceFile, "/tmp/owner-daily-ui.json");
    assert.equal(input.schedulerRunUiEvidenceFile, "/tmp/scheduler-run-ui.json");
    assert.deepEqual(input.artifactTaskIds, ["owner_daily_ui", "scheduler_run_ui"]);
    assert.deepEqual(input.tasks, ["planner_readiness", "owner_daily_ui", "scheduler_run_ui"]);
    assert.deepEqual(input.requiredTaskIds, ["planner_readiness", "owner_daily_ui", "scheduler_run_ui"]);
    assert.equal(JSON.stringify(input).includes(manifestPath), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("release workbench action smoke script requires explicit write flag", () => {
  assert.deepEqual(validateInput({ workspaceId: "fanfan", endpointKey: "release_evidence" }, false), {
    ok: false,
    error: "release_workbench_action_write_not_allowed",
    requiredFlag: "--allow-write"
  });
  assert.deepEqual(validateInput({ workspaceId: "fanfan", endpointKey: "release_evidence" }, true), { ok: true });
  assert.deepEqual(validateInput({ operation: "list-audits", workspaceId: "fanfan" }, false), { ok: true });
  assert.deepEqual(validateInput({ operation: "list-audits" }, false), {
    ok: false,
    error: "release_workbench_action_workspace_required"
  });
  assert.deepEqual(validateInput({ operation: "delete", workspaceId: "fanfan" }, false), {
    ok: false,
    error: "release_workbench_action_operation_invalid"
  });
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
    endpointKey: "release_package",
    buildReleasePackage: true
  });

  assert.equal(result.ok, true);
  assert.equal(result.endpointKey, "release_package");
  assert.equal(calls[0].workspaceId, "fanfan");
  assert.equal(calls[0].buildReleasePackage, true);
});

test("release workbench action smoke script delegates audit listing only to action service", () => {
  const calls = [];
  const service = {
    listActionAudits(input) {
      calls.push(input);
      return {
        ok: true,
        schemaVersion: "growth.learningAutomationReleaseWorkbenchActionAuditList.v1",
        actionAuditCount: 1,
        actionAudits: [{
          actionAuditId: "lgawba_cli_1",
          endpointKey: input.endpointKey,
          status: input.status
        }],
        writefulSchedulingAllowed: false
      };
    },
    recordAction() {
      throw new Error("recordAction must not be called for list-audits");
    }
  };

  const result = runOperation(service, {
    operation: "list-audits",
    workspaceId: "fanfan",
    learnerId: "fanfan",
    endpointKey: "release_evidence",
    status: "recorded",
    limit: 3
  });

  assert.equal(result.ok, true);
  assert.equal(result.actionAuditCount, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].operation, undefined);
  assert.equal(calls[0].workspaceId, "fanfan");
  assert.equal(calls[0].endpointKey, "release_evidence");
  assert.equal(calls[0].status, "recorded");
  assert.equal(calls[0].limit, 3);
});

test("release workbench action smoke script accepts release preflight endpoint", () => {
  const calls = [];
  const service = {
    recordAction(input) {
      calls.push(input);
      return {
        ok: true,
        schemaVersion: "growth.learningAutomationReleaseWorkbenchAction.v1",
        endpointKey: input.endpointKey,
        actionRecord: {
          endpointKey: input.endpointKey,
          recordId: "lgarpf_cli_1"
        },
        writefulSchedulingAllowed: false
      };
    }
  };
  const input = inputFromArgs([
    "--workspace-id", "fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--endpoint-key", "release_preflight",
    "--action-key", "release_preflight",
    "--collection-run-id", "lgacrn_cli_1",
    "--requested-by", "owner"
  ]);

  assert.equal(validateInput(input, true).ok, true);
  const result = runOperation(service, input);
  assert.equal(result.ok, true);
  assert.equal(result.endpointKey, "release_preflight");
  assert.equal(result.actionRecord.recordId, "lgarpf_cli_1");
  assert.equal(calls[0].endpointKey, "release_preflight");
  assert.equal(calls[0].actionKey, "release_preflight");
  assert.equal(calls[0].collectionRunId, "lgacrn_cli_1");
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

    const auditStdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-release-workbench-action.js"),
      "--operation", "list-audits",
      "--workspace-id", "fanfan",
      "--learner-id", "fanfan",
      "--endpoint-key", "release_evidence_collection",
      "--action-key", "release_collection_run",
      "--status", "recorded",
      "--limit", "5",
      "--json"
    ], {
      cwd: path.join(__dirname, ".."),
      env: Object.assign({}, process.env, {
        GROWTH_DATA_DIR: dir,
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });
    const auditOutput = JSON.parse(auditStdout);
    assert.equal(auditOutput.operation, "list-audits");
    assert.equal(auditOutput.ok, true);
    assert.equal(auditOutput.schemaVersion, "growth.learningAutomationReleaseWorkbenchActionAuditList.v1");
    assert.equal(auditOutput.actionAuditCount, 1);
    assert.equal(auditOutput.actionAudits[0].privacyClass, "summary_only");
    assert.equal(auditOutput.actionAudits[0].endpointKey, "release_evidence_collection");
    assert.equal(auditOutput.actionAudits[0].actionKey, "release_collection_run");
    assert.equal(auditOutput.actionAudits[0].status, "recorded");
    assert.match(auditOutput.actionAudits[0].recordId, /^lgacrn_/);
    assert.equal(JSON.stringify(auditOutput).includes("writeResult"), false);
    assert.equal(JSON.stringify(auditOutput).includes(dir), false);

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
