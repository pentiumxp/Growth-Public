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
  projectReleaseEvidenceCollectionSmokeReadback,
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
    "--release-package-review-ui-evidence-file", "/tmp/release-package-review-ui.json",
    "--scheduler-run-ui-evidence-file", "/tmp/scheduler-run-ui.json",
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
  assert.equal(input.releasePackageReviewUiEvidenceFile, "/tmp/release-package-review-ui.json");
  assert.equal(input.schedulerRunUiEvidenceFile, "/tmp/scheduler-run-ui.json");
});

test("release evidence collection script maps artifact manifest into collection task inputs", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-evidence-collection-manifest-"));
  try {
    const manifestPath = path.join(dir, "release-artifacts-manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify({
      schemaVersion: "growth.learningAutomationReleaseEvidenceArtifactManifest.v1",
      privacyClass: "summary_only",
      centralVisualEvidenceFile: "/tmp/central-visual.json",
      artifacts: [{
        evidenceKey: "releasePackageReviewUiEvidence",
        file: "/tmp/release-package-review-ui.json"
      }, {
        uiGate: "scheduler_run",
        file: "/tmp/scheduler-run-ui.json"
      }]
    }), "utf8");

    const input = inputFromArgs([
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--task", "planner_readiness",
      "--required-task", "planner_readiness",
      "--release-evidence-artifact-manifest-file", manifestPath
    ]);

    assert.equal(input.centralVisualEvidenceFile, "/tmp/central-visual.json");
    assert.equal(input.releasePackageReviewUiEvidenceFile, "/tmp/release-package-review-ui.json");
    assert.equal(input.schedulerRunUiEvidenceFile, "/tmp/scheduler-run-ui.json");
    assert.deepEqual(input.artifactTaskIds, [
      "central_visual",
      "release_package_review_ui",
      "scheduler_run_ui"
    ]);
    assert.deepEqual(input.requiredTaskIds, [
      "planner_readiness",
      "central_visual",
      "release_package_review_ui",
      "scheduler_run_ui"
    ]);
    assert.equal(JSON.stringify(input).includes(manifestPath), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("release evidence collection script projects top-level operator readback", () => {
  const result = projectReleaseEvidenceCollectionSmokeReadback({
    ok: true,
    source: "growth-learning-automation-release-evidence-collection-service",
    collection: {
      schemaVersion: "growth.learningAutomationReleaseEvidenceCollection.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      status: "ready_for_release_review",
      writeCollectionRun: true,
      writeReleaseEvidenceRecords: true,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false,
      schedulerPermissionGranted: false,
      steps: [{
        key: "release_evidence_bundle",
        status: "pass",
        ok: true
      }, {
        key: "release_readiness",
        status: "incomplete",
        ok: false
      }],
      summary: {
        schemaVersion: "growth.learningAutomationReleaseEvidenceCollection.summary.v1",
        status: "ready_for_release_review",
        stepCount: 2,
        passedCount: 1,
        blockedCount: 0,
        incompleteCount: 1,
        readyForReleaseReview: true,
        collectionRunId: "lgacrn_ready_1",
        collectionRunWritten: true,
        releaseEvidenceRecordsWritten: true,
        releaseEvidenceRecordAttemptedCount: 3,
        releaseEvidenceRecordRecordedCount: 2,
        releaseEvidenceRecordDuplicateCount: 1,
        releaseEvidenceRecordBlockedCount: 0,
        writefulSchedulingAllowed: false,
        runtimeConfigChange: false,
        configChangeApplied: false,
        schedulerPermissionGranted: false
      },
      artifacts: {
        releaseEvidenceRecords: {
          status: "pass",
          evidenceKeys: ["releasePackageReviewUiEvidence", "releaseEvidenceBundleAudit"]
        }
      }
    }
  });

  assert.equal(result.releaseEvidenceCollectionStatus, "ready_for_release_review");
  assert.equal(result.releaseEvidenceCollectionStepCount, 2);
  assert.equal(result.releaseEvidenceCollectionPassedCount, 1);
  assert.equal(result.releaseEvidenceCollectionIncompleteCount, 1);
  assert.deepEqual(result.releaseEvidenceCollectionNextStep, {
    key: "release_readiness",
    status: "incomplete",
    ok: false
  });
  assert.equal(result.releaseEvidenceCollectionReadyForReleaseReview, true);
  assert.equal(result.releaseEvidenceCollectionRunId, "lgacrn_ready_1");
  assert.equal(result.releaseEvidenceCollectionRunWritten, true);
  assert.equal(result.releaseEvidenceCollectionWriteCollectionRun, true);
  assert.equal(result.releaseEvidenceCollectionWriteReleaseEvidenceRecords, true);
  assert.equal(result.releaseEvidenceCollectionReleaseEvidenceRecordsWritten, true);
  assert.equal(result.releaseEvidenceCollectionEvidenceRecordAttemptedCount, 3);
  assert.equal(result.releaseEvidenceCollectionEvidenceRecordRecordedCount, 2);
  assert.equal(result.releaseEvidenceCollectionEvidenceRecordDuplicateCount, 1);
  assert.deepEqual(result.releaseEvidenceCollectionEvidenceKeys, ["releasePackageReviewUiEvidence", "releaseEvidenceBundleAudit"]);
  assert.equal(result.releaseEvidenceCollectionWritefulSchedulingAllowed, false);
  assert.equal(result.releaseEvidenceCollectionRuntimeConfigChange, false);
  assert.equal(result.releaseEvidenceCollectionConfigChangeApplied, false);
  assert.equal(result.releaseEvidenceCollectionSchedulerPermissionGranted, false);
  assert.equal(result.collection.releaseEvidenceCollectionStatus, "ready_for_release_review");
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
    assert.equal(output.releaseEvidenceCollectionStatus, output.status);
    assert.equal(output.releaseEvidenceCollectionStepCount, 4);
    assert.equal(output.releaseEvidenceCollectionBlockedCount, output.summary.blockedCount);
    assert.deepEqual(output.releaseEvidenceCollectionStepStatuses.map((step) => step.key), [
      "release_evidence_bundle",
      "release_evidence_bundle_audit",
      "release_readiness",
      "release_collection_run"
    ]);
    assert.equal(output.releaseEvidenceCollectionWritefulSchedulingAllowed, false);
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
    assert.equal(output.releaseEvidenceCollectionRunWritten, true);
    assert.equal(output.releaseEvidenceCollectionRunId, output.collection.summary.collectionRunId);
    assert.equal(output.collection.releaseEvidenceCollectionRunWritten, true);

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

test("release evidence collection script persists release package review UI evidence records", () => {
  withTempDb(({ dir, dbPath }) => {
    const uiEvidencePath = path.join(dir, "release-package-review-ui.json");
    fs.writeFileSync(uiEvidencePath, JSON.stringify({
      ok: true,
      source: "home-ai-ios-pwa-visual-harness",
      evidenceKey: "releasePackageReviewUiEvidence",
      status: "pass",
      checkedAt: "2026-06-16T08:00:00.000Z",
      route: "/plugins/growth/release",
      screen: "release-package-review",
      screenshotArtifactName: "growth-release-package-review.png",
      domAssertions: [{ name: "record-package-action", status: "pass" }],
      coverage: ["package_candidate_build", "package_candidate_status", "record_package_action"],
      assertions: [{ name: "release-package-review", status: "pass" }]
    }), "utf8");

    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--program-id", "smoke_program",
      "--domain", "science",
      "--subject", "science",
      "--task", "release_package_review_ui",
      "--required-task", "release_package_review_ui",
      "--release-package-review-ui-evidence-file", uiEvidencePath,
      "--write-release-evidence-records",
      "--allow-write",
      "--result-json",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = parseStdout(result);
    assert.equal(output.collection.artifacts.releaseEvidenceRecords.status, "pass");
    assert.equal(output.collection.summary.releaseEvidenceRecordsWritten, true);
    assert.equal(output.releaseEvidenceCollectionReleaseEvidenceRecordsWritten, true);
    assert.equal(output.releaseEvidenceCollectionEvidenceRecordRecordedCount, 2);
    assert.equal(output.collection.releaseEvidenceCollectionEvidenceRecordRecordedCount, 2);
    assert.ok(output.collection.artifacts.releaseEvidenceRecords.evidenceKeys.includes("releasePackageReviewUiEvidence"));
    assert.ok(output.collection.artifacts.releaseEvidenceRecords.evidenceKeys.includes("releaseEvidenceBundleAudit"));
    assert.equal(JSON.stringify(output).includes(uiEvidencePath), false);
    assert.equal(JSON.stringify(output).includes("stdout"), false);
    assert.equal(JSON.stringify(output).includes("/Users/"), false);

    const db = new DatabaseSync(dbPath, { open: true, readOnly: true });
    try {
      const row = db.prepare(`
        SELECT * FROM learning_growth_automation_release_evidence
        WHERE workspace_id = ? AND evidence_key = ?
      `).get("smoke_workspace", "releasePackageReviewUiEvidence");
      assert.equal(row.privacy_class, "summary_only");
      assert.equal(row.check_key, "release_package_review_ui_evidence");
      assert.equal(row.status, "pass");
      const evidence = JSON.parse(row.evidence_json);
      assert.equal(evidence.schemaVersion, "growth.learningAutomationReleaseEvidenceRecord.uiEvidence.v1");
      assert.equal(evidence.validationSchemaVersion, "growth.learningAutomationUiEvidence.v1");
      assert.equal(evidence.evidenceKey, "releasePackageReviewUiEvidence");
      assert.equal(evidence.checkKey, "release_package_review_ui_evidence");
      assert.equal(evidence.uiGate, "release_package_review");
      assert.equal(evidence.readyForReleaseEvidence, true);
      assert.equal(evidence.uiEvidence.screenshotArtifactName, "growth-release-package-review.png");
      assert.deepEqual(evidence.uiEvidence.missingCoverage || [], []);
      assert.equal(evidence.uiEvidenceBoundary.homeAiOwnsVisualHarness, true);
      assert.equal(JSON.stringify(evidence).includes(uiEvidencePath), false);
    } finally {
      db.close();
    }
  });
});
