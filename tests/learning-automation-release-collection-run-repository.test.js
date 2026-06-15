const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningAutomationReleaseCollectionRunRepository
} = require("../src/stores/growth-learning-sqlite/automation-release-collection-runs");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-release-collection-runs-"));
  const dbPath = path.join(dir, "automation-release-collection-runs.sqlite3");
  const repository = createLearningAutomationReleaseCollectionRunRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-15T19:00:00.000Z")
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sampleRun(overrides = {}) {
  return Object.assign({
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
      artifactFileName: "release-bundle.json",
      taskCount: 18,
      passedCount: 18,
      blockedCount: 0
    },
    auditSummary: {
      schemaVersion: "growth.learningAutomationReleaseEvidenceBundleAudit.v1",
      summaryOnly: true,
      status: "pass",
      readyForReleaseEvidence: true,
      defaultTaskCoverage: true
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
      summaryOnly: true,
      bundleEvidenceKeys: ["productionPlannerReadinessEvidence"]
    },
    releaseReview: {
      schemaVersion: "growth.learningAutomationReleaseReadiness.releaseReview.v1",
      summaryOnly: true,
      advisoryOnly: true,
      writefulSchedulingAllowed: false
    },
    summary: {
      schemaVersion: "growth.learningAutomationReleaseCollectionRun.summary.v1",
      summaryOnly: true,
      status: "ready_for_release_review",
      readyForReleaseReview: true,
      writefulSchedulingAllowed: false,
      bundleTaskCount: 18
    },
    createdBy: "weixin_owner",
    createdAt: "2026-06-15T19:00:00.000Z"
  }, overrides);
}

test("automation release collection run repository saves and lists summary-only runs", () => {
  withRepository(({ repository }) => {
    const saved = repository.saveRun(sampleRun());

    assert.equal(saved.ok, true);
    assert.equal(saved.run.status, "ready_for_release_review");
    assert.equal(saved.run.privacyClass, "summary_only");
    assert.equal(saved.run.bundleSummary.artifactFileName, "release-bundle.json");
    assert.equal(saved.run.readinessSummary.writefulSchedulingAllowed, false);
    assert.equal(JSON.stringify(saved.run).includes("/Users/"), false);

    const duplicate = repository.saveRun(sampleRun());
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.run.runId, saved.run.runId);

    const listed = repository.listRuns({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      status: "ready_for_release_review",
      limit: 5
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].runId, saved.run.runId);
    assert.equal(listed[0].summary.writefulSchedulingAllowed, false);
  });
});

test("automation release collection run repository rejects privacy risks, invalid status, and non-summary writes", () => {
  withRepository(({ repository }) => {
    const privacyKey = repository.saveRun(sampleRun({
      evidenceSummary: { rawPrompt: "do not store" }
    }));
    assert.equal(privacyKey.ok, false);
    assert.equal(privacyKey.error, "learning_automation_release_collection_run_privacy_failed");
    assert.equal(privacyKey.privacyFindings.includes("$.evidenceSummary.rawPrompt"), true);

    const privateValue = repository.saveRun(sampleRun({
      bundleSummary: { artifactFileName: "/Users/xuxin/.homeai-qa/release-bundle.json" }
    }));
    assert.equal(privateValue.ok, false);
    assert.equal(privateValue.error, "learning_automation_release_collection_run_privacy_failed");

    const privacyClass = repository.saveRun(sampleRun({
      privacyClass: "raw_private"
    }));
    assert.equal(privacyClass.ok, false);
    assert.equal(privacyClass.error, "learning_automation_release_collection_run_privacy_class_required");

    const invalidStatus = repository.saveRun(sampleRun({
      status: "enabled"
    }));
    assert.equal(invalidStatus.ok, false);
    assert.equal(invalidStatus.error, "learning_automation_release_collection_run_status_invalid");
  });
});

test("automation release collection run repository migrates bounded columns on existing tables", () => {
  withRepository(({ dbPath, repository }) => {
    {
      const db = new DatabaseSync(dbPath, { open: true });
      db.exec(`
        CREATE TABLE learning_growth_automation_release_collection_runs (
          run_id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          learner_id TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'blocked',
          privacy_class TEXT NOT NULL DEFAULT 'summary_only',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      db.close();
    }

    const saved = repository.saveRun(sampleRun({
      runId: "lgacrn_migrated_1"
    }));
    assert.equal(saved.ok, true);
    assert.equal(saved.run.runId, "lgacrn_migrated_1");
    assert.equal(saved.run.runVersion, "growth.learningAutomationReleaseCollectionRun.v1");
    assert.equal(saved.run.releaseReview.advisoryOnly, true);
  });
});
