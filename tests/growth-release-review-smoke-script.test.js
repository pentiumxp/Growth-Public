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
} = require("../scripts/smoke-growth-release-review");
const {
  createLearningAutomationReleaseCollectionRunRepository
} = require("../src/stores/growth-learning-sqlite/automation-release-collection-runs");
const {
  createLearningAutomationReleasePackageRepository
} = require("../src/stores/growth-learning-sqlite/automation-release-packages");

function repositoryOpen(dbPath) {
  return function open(readOnly = true) {
    return new DatabaseSync(dbPath, { open: true, readOnly });
  };
}

function seedReadyCollectionRun(repository) {
  const saved = repository.saveRun({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    schemaVersion: "growth.learningAutomationReleaseCollectionRun.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "ready_for_release_review",
    bundleSummary: {
      schemaVersion: "growth.learningAutomationReleaseEvidenceBundle.v1",
      summaryOnly: true,
      taskCount: 3,
      passedCount: 3,
      blockedCount: 0
    },
    auditSummary: {
      schemaVersion: "growth.learningAutomationReleaseEvidenceBundleAudit.v1",
      summaryOnly: true,
      status: "pass",
      readyForReleaseEvidence: true
    },
    readinessSummary: {
      schemaVersion: "growth.learningAutomationReleaseReadiness.summary.v1",
      summaryOnly: true,
      status: "ready_for_release_review",
      readyForReleaseReview: true,
      writefulSchedulingAllowed: false
    },
    evidenceSummary: {
      schemaVersion: "growth.learningAutomationReleaseCollectionRun.evidenceSummary.v1",
      summaryOnly: true
    },
    releaseReview: {
      schemaVersion: "growth.learningAutomationReleaseReadiness.releaseReview.v1",
      summaryOnly: true,
      advisoryOnly: true,
      missingCheckKeys: [],
      blockedCheckKeys: [],
      missingEvidenceKeys: [],
      requiredActionCount: 0,
      requiredActions: []
    },
    summary: {
      schemaVersion: "growth.learningAutomationReleaseCollectionRun.summary.v1",
      summaryOnly: true,
      status: "ready_for_release_review",
      readyForReleaseReview: true,
      readyForReleaseEvidence: true,
      writefulSchedulingAllowed: false,
      bundleTaskCount: 3,
      bundlePassedCount: 3,
      bundleBlockedCount: 0
    },
    createdBy: "weixin_owner",
    createdAt: "2026-06-16T07:30:00.000Z"
  });

  assert.equal(saved.ok, true);
  assert.equal(saved.run.status, "ready_for_release_review");
  return saved.run;
}

function seedReleasePackage(repository, run) {
  const saved = repository.savePackage({
    workspaceId: run.workspaceId,
    learnerId: run.learnerId,
    programId: run.programId,
    domainPackId: run.domainPackId,
    domain: run.domain,
    subject: run.subject,
    horizon: run.horizon,
    collectionRunId: run.runId,
    schemaVersion: "growth.learningAutomationReleasePackage.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "ready_for_release_review",
    packageSummary: {
      schemaVersion: "growth.learningAutomationReleasePackage.summary.v1",
      summaryOnly: true,
      status: "ready_for_release_review",
      ok: true,
      collectionRunId: run.runId,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false
    },
    stepSummary: {
      schemaVersion: "growth.learningAutomationReleasePackage.stepSummary.v1",
      summaryOnly: true,
      stepCount: 5,
      passedCount: 5,
      blockedCount: 0
    },
    releaseEvidenceBundleSummary: {
      schemaVersion: "growth.learningAutomationReleaseEvidenceBundle.v1",
      summaryOnly: true,
      taskCount: 3,
      passedCount: 3,
      blockedCount: 0
    },
    releaseEvidenceBundleAuditSummary: {
      schemaVersion: "growth.learningAutomationReleaseEvidenceBundleAudit.v1",
      summaryOnly: true,
      status: "pass",
      readyForReleaseEvidence: true
    },
    releaseReadinessSummary: {
      schemaVersion: "growth.learningAutomationReleaseReadiness.summary.v1",
      summaryOnly: true,
      status: "ready_for_release_review",
      readyForReleaseReview: true,
      writefulSchedulingAllowed: false
    },
    releaseCollectionRunSummary: {
      schemaVersion: "growth.learningAutomationReleaseCollectionRun.summary.v1",
      summaryOnly: true,
      status: "ready_for_release_review",
      readyForReleaseReview: true,
      collectionRunId: run.runId,
      writefulSchedulingAllowed: false
    },
    releaseControlsSummary: {
      schemaVersion: "growth.learningAutomationReleaseControls.v1",
      summaryOnly: true,
      status: "manual_runtime_config_required",
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false
    },
    releaseReview: {
      schemaVersion: "growth.learningAutomationReleaseReview.summary.v1",
      summaryOnly: true,
      packageRecordStatus: "ready_for_release_review",
      latestPackageId: "",
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false
    },
    createdBy: "weixin_owner",
    createdAt: "2026-06-16T07:31:00.000Z"
  });

  assert.equal(saved.ok, true);
  assert.equal(saved.package.collectionRunId, run.runId);
  assert.equal(saved.package.status, "ready_for_release_review");
  return saved.package;
}

test("release review smoke script parses bounded scope and UI evidence flags", () => {
  const input = inputFromArgs([
    "--workspace-id", "fanfan",
    "--learner-id", "fanfan",
    "--domain", "science",
    "--subject", "biology",
    "--owner-daily-ui-evidence", "pass",
    "--scheduler-run-ui-evidence", "true"
  ]);

  assert.equal(input.workspaceId, "fanfan");
  assert.equal(input.learnerId, "fanfan");
  assert.equal(input.domain, "science");
  assert.equal(input.subject, "biology");
  assert.equal(input.ownerDailyUiEvidence, true);
  assert.equal(input.schedulerRunUiEvidence, true);
});

test("release review smoke script requires workspace scope", () => {
  assert.deepEqual(validateInput({}), {
    ok: false,
    error: "release_review_smoke_workspace_required"
  });
  assert.deepEqual(validateInput({ workspaceId: "fanfan" }), { ok: true });
});

test("release review smoke script delegates to service only", () => {
  const calls = [];
  const result = runOperation({
    review(input) {
      calls.push(input);
      return { ok: true, status: "incomplete" };
    }
  }, { workspaceId: "fanfan" });

  assert.equal(result.ok, true);
  assert.equal(result.status, "incomplete");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].workspaceId, "fanfan");
});

test("release review smoke script runs no-write review against a temporary SQLite db", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-review-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  const stdout = childProcess.execFileSync(process.execPath, [
    path.join(__dirname, "..", "scripts", "smoke-growth-release-review.js"),
    "--workspace-id", "fanfan",
    "--learner-id", "fanfan",
    "--json"
  ], {
    cwd: path.join(__dirname, ".."),
    env: Object.assign({}, process.env, {
      GROWTH_LEARNING_DB_PATH: dbPath
    }),
    encoding: "utf8"
  });

  const output = JSON.parse(stdout);
  assert.equal(output.operation, "review");
  assert.equal(output.ok, true);
  assert.equal(output.schemaVersion, "growth.learningAutomationReleaseReview.v1");
  assert.equal(output.writefulSchedulingAllowed, false);
  assert.equal(output.runtimeConfigChange, false);
});

test("release review smoke script reads package audit record from the real SQLite service graph", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-review-package-readback-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  try {
    const open = repositoryOpen(dbPath);
    const run = seedReadyCollectionRun(createLearningAutomationReleaseCollectionRunRepository({ open }));
    const releasePackage = seedReleasePackage(createLearningAutomationReleasePackageRepository({ open }), run);

    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-release-review.js"),
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--domain-pack-id", "uk_hk_curriculum_foundation",
      "--domain", "science",
      "--subject", "science",
      "--horizon", "daily_plan",
      "--collection-run-id", run.runId,
      "--json"
    ], {
      cwd: path.join(__dirname, ".."),
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });

    const output = JSON.parse(stdout);
    assert.equal(output.operation, "review");
    assert.equal(output.ok, true);
    assert.equal(output.schemaVersion, "growth.learningAutomationReleaseReview.v1");
    assert.equal(output.collectionRunPresent, true);
    assert.equal(output.packageRecordReadbackAvailable, true);
    assert.equal(output.packageRecordRequired, true);
    assert.equal(output.packageRecordPresent, true);
    assert.equal(output.latestPackage.packageId, releasePackage.packageId);
    assert.equal(output.latestPackage.collectionRunId, run.runId);
    assert.equal(output.releaseReview.latestPackageId, releasePackage.packageId);
    assert.equal(output.releaseReview.packageRecordStatus, "ready_for_release_review");
    assert.equal(output.releaseReview.packageRecordPresent, true);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);
    assert.equal(output.releaseReview.writefulSchedulingAllowed, false);
    assert.equal(output.releaseReview.runtimeConfigChange, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
