const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningAutomationReleaseReadinessRepository
} = require("../src/stores/growth-learning-sqlite/automation-release-readiness");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-release-readiness-"));
  const dbPath = path.join(dir, "automation-release-readiness.sqlite3");
  const repository = createLearningAutomationReleaseReadinessRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-15T16:00:00.000Z")
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sampleSnapshot(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "ready_for_release_review",
    checks: [{
      key: "owner_daily_ui_evidence",
      status: "pass",
      summary: { summaryOnly: true }
    }, {
      key: "production_daily_loop_write_smoke_evidence",
      status: "pass",
      summary: { evidenceId: "daily_loop_write_smoke" }
    }],
    evidence: {
      schemaVersion: "growth.learningAutomationReleaseReadiness.evidence.v1",
      summaryOnly: true
    },
    config: {
      schemaVersion: "growth.learningAutomationReleaseReadiness.config.v1",
      summaryOnly: true,
      writefulSchedulingAllowed: false
    },
    summary: {
      schemaVersion: "growth.learningAutomationReleaseReadiness.summary.v1",
      summaryOnly: true,
      readyForReleaseReview: true,
      writefulSchedulingAllowed: false
    },
    releaseReview: {
      schemaVersion: "growth.learningAutomationReleaseReadiness.releaseReview.v1",
      summaryOnly: true,
      advisoryOnly: true
    },
    createdBy: "weixin_owner",
    privacyClass: "summary_only",
    createdAt: "2026-06-15T16:00:00.000Z"
  }, overrides);
}

test("automation release readiness repository saves and lists summary-only snapshots", () => {
  withRepository(({ repository }) => {
    const saved = repository.saveSnapshot(sampleSnapshot());

    assert.equal(saved.ok, true);
    assert.equal(saved.snapshot.status, "ready_for_release_review");
    assert.equal(saved.snapshot.privacyClass, "summary_only");
    assert.equal(saved.snapshot.summary.writefulSchedulingAllowed, false);
    assert.equal(saved.snapshot.checks[0].key, "owner_daily_ui_evidence");
    assert.equal(saved.snapshot.checks.some((item) => item.key === "production_daily_loop_write_smoke_evidence"), true);

    const duplicate = repository.saveSnapshot(sampleSnapshot());
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.snapshot.readinessId, saved.snapshot.readinessId);

    const listed = repository.listSnapshots({
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
    assert.equal(listed[0].readinessId, saved.snapshot.readinessId);
    assert.equal(JSON.stringify(listed[0]).includes("rawPrompt"), false);
  });
});

test("automation release readiness repository rejects privacy-risk fields, non-summary class, and invalid status", () => {
  withRepository(({ repository }) => {
    const privacy = repository.saveSnapshot(sampleSnapshot({
      evidence: { rawPrompt: "do not store" }
    }));
    assert.equal(privacy.ok, false);
    assert.equal(privacy.error, "learning_automation_release_readiness_privacy_failed");
    assert.equal(privacy.privacyFindings.includes("$.evidence.rawPrompt"), true);

    const privacyClass = repository.saveSnapshot(sampleSnapshot({
      privacyClass: "raw_private"
    }));
    assert.equal(privacyClass.ok, false);
    assert.equal(privacyClass.error, "learning_automation_release_readiness_privacy_class_required");

    const invalid = repository.saveSnapshot(sampleSnapshot({
      status: "enabled"
    }));
    assert.equal(invalid.ok, false);
    assert.equal(invalid.error, "learning_automation_release_readiness_status_invalid");
  });
});

test("automation release readiness repository migrates bounded columns on existing tables", () => {
  withRepository(({ dbPath, repository }) => {
    {
      const db = new DatabaseSync(dbPath, { open: true });
      db.exec(`
        CREATE TABLE learning_growth_automation_release_readiness (
          readiness_id TEXT PRIMARY KEY,
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

    const saved = repository.saveSnapshot(sampleSnapshot({
      readinessId: "lgarel_migrated_1"
    }));
    assert.equal(saved.ok, true);
    assert.equal(saved.snapshot.domainPackId, "uk_hk_curriculum_foundation");
    assert.equal(saved.snapshot.readinessVersion, "growth.learningAutomationReleaseReadiness.v1");
    assert.equal(saved.snapshot.releaseReview.advisoryOnly, true);
  });
});
