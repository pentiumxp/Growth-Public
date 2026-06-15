const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningAutomationSchedulerWorkerTargetRepository
} = require("../src/stores/growth-learning-sqlite/automation-scheduler-worker-targets");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-scheduler-worker-target-"));
  const dbPath = path.join(dir, "automation-scheduler-worker-targets.sqlite3");
  const repository = createLearningAutomationSchedulerWorkerTargetRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-15T15:00:00.000Z")
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sampleTarget(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    targetVersion: "growth.learningAutomationSchedulerWorkerTarget.v1",
    status: "proposed",
    target: {
      schemaVersion: "growth.learningAutomationSchedulerWorkerTarget.target.v1",
      summaryOnly: true,
      targetNodeIds: ["kg_science_fair_test"]
    },
    policy: {
      schemaVersion: "growth.learningAutomationSchedulerWorkerTarget.policy.v1",
      summaryOnly: true,
      productionSchedulingAllowed: false,
      maxActionsPerTick: 3
    },
    readiness: {
      schemaVersion: "growth.learningAutomationSchedulerWorkerTarget.readiness.v1",
      summaryOnly: true,
      targetProvisioningReady: true
    },
    createdBy: "weixin_owner",
    privacyClass: "summary_only",
    createdAt: "2026-06-15T15:00:00.000Z",
    updatedAt: "2026-06-15T15:00:00.000Z"
  }, overrides);
}

test("automation scheduler worker target repository saves, reviews, gets, and lists summary-only targets", () => {
  withRepository(({ repository }) => {
    const saved = repository.saveTarget(sampleTarget());

    assert.equal(saved.ok, true);
    assert.equal(saved.target.status, "proposed");
    assert.equal(saved.target.privacyClass, "summary_only");
    assert.equal(saved.target.policy.productionSchedulingAllowed, false);

    const enabled = repository.reviewTarget({
      workspaceId: "weixin_fanfan",
      targetId: saved.target.targetId,
      status: "enabled",
      readiness: Object.assign({}, saved.target.readiness, { targetEnabled: true }),
      reason: "owner_reviewed_target_scope",
      reviewedBy: "weixin_owner",
      reviewedAt: "2026-06-15T15:01:00.000Z"
    });

    assert.equal(enabled.ok, true);
    assert.equal(enabled.target.status, "enabled");
    assert.equal(enabled.target.review.status, "enabled");
    assert.equal(enabled.target.review.productionSchedulingAllowed, false);
    assert.equal(enabled.target.reviewedBy, "weixin_owner");

    const listed = repository.listTargets({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      subject: "science",
      horizon: "daily_plan",
      status: "enabled",
      limit: 5
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].targetId, saved.target.targetId);
    assert.equal(JSON.stringify(listed[0]).includes("rawPrompt"), false);

    assert.equal(repository.getTarget({ workspaceId: "weixin_fanfan", targetId: saved.target.targetId }).status, "enabled");
    assert.deepEqual(repository.listTargets({ workspaceId: "other_workspace" }), []);
  });
});

test("automation scheduler worker target repository rejects privacy-risk fields, non-summary class, and invalid status", () => {
  withRepository(({ repository }) => {
    const privacy = repository.saveTarget(sampleTarget({
      target: { rawPrompt: "do not store" }
    }));
    assert.equal(privacy.ok, false);
    assert.equal(privacy.error, "learning_automation_scheduler_worker_target_privacy_failed");
    assert.equal(privacy.privacyFindings.includes("$.target.rawPrompt"), true);

    const privacyClass = repository.saveTarget(sampleTarget({
      privacyClass: "raw_private"
    }));
    assert.equal(privacyClass.ok, false);
    assert.equal(privacyClass.error, "learning_automation_scheduler_worker_target_privacy_class_required");

    const invalid = repository.saveTarget(sampleTarget({
      status: "running"
    }));
    assert.equal(invalid.ok, false);
    assert.equal(invalid.error, "learning_automation_scheduler_worker_target_status_invalid");

    const saved = repository.saveTarget(sampleTarget());
    const invalidReview = repository.reviewTarget({
      workspaceId: "weixin_fanfan",
      targetId: saved.target.targetId,
      status: "approved"
    });
    assert.equal(invalidReview.ok, false);
    assert.equal(invalidReview.error, "learning_automation_scheduler_worker_target_status_invalid");
  });
});

test("automation scheduler worker target repository migrates bounded columns on existing tables", () => {
  withRepository(({ dbPath, repository }) => {
    {
      const db = new DatabaseSync(dbPath, { open: true });
      db.exec(`
        CREATE TABLE learning_growth_automation_scheduler_worker_targets (
          target_id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          learner_id TEXT NOT NULL DEFAULT '',
          program_id TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'proposed',
          privacy_class TEXT NOT NULL DEFAULT 'summary_only',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      db.close();
    }

    const saved = repository.saveTarget(sampleTarget({
      targetId: "lgastgt_migrated_1"
    }));
    assert.equal(saved.ok, true);
    assert.equal(saved.target.domainPackId, "uk_hk_curriculum_foundation");
    assert.equal(saved.target.targetVersion, "growth.learningAutomationSchedulerWorkerTarget.v1");
    assert.equal(saved.target.target.targetNodeIds[0], "kg_science_fair_test");
  });
});
