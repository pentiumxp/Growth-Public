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
    "--endpoint-key", "release_collection_run",
    "--evidence-key", "owner_daily_ui_evidence",
    "--activation-gates", "writeful_execution,background_scheduler",
    "--release-evidence-bundle-json", JSON.stringify({ schemaVersion: "growth.learningAutomationReleaseEvidenceBundle.v1", summaryOnly: true }),
    "--release-evidence-bundle-audit-json", JSON.stringify({ schemaVersion: "growth.learningAutomationReleaseEvidenceBundleAudit.v1", summaryOnly: true }),
    "--release-readiness-json", JSON.stringify({ schemaVersion: "growth.learningAutomationReleaseReadiness.v1", summaryOnly: true }),
    "--release-collection-run-json", JSON.stringify({ schemaVersion: "growth.learningAutomationReleaseCollectionRun.v1", summaryOnly: true }),
    "--release-decision-json", JSON.stringify({ schemaVersion: "growth.learningAutomationReleaseDecision.v1", summaryOnly: true }),
    "--evidence-json", JSON.stringify({ evidenceId: "ui_1" }),
    "--requested-by", "owner"
  ]);

  assert.equal(input.workspaceId, "fanfan");
  assert.equal(input.endpointKey, "release_collection_run");
  assert.equal(input.evidenceKey, "owner_daily_ui_evidence");
  assert.deepEqual(input.activationGates, ["writeful_execution", "background_scheduler"]);
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
