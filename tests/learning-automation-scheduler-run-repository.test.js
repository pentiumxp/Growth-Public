const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningAutomationSchedulerRunRepository
} = require("../src/stores/growth-learning-sqlite/automation-scheduler-runs");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-scheduler-run-"));
  const dbPath = path.join(dir, "automation-scheduler-runs.sqlite3");
  const repository = createLearningAutomationSchedulerRunRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-15T13:30:00.000Z")
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sampleRun(overrides = {}) {
  return Object.assign({
    runId: "lgasrun_ready_1",
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    mode: "background_supervised_tick",
    status: "started",
    reason: "background_scheduler_run_started",
    input: {
      schemaVersion: "growth.learningAutomationSchedulerRun.input.v1",
      summaryOnly: true,
      backgroundSchedulerEnabled: true
    },
    candidates: [{
      schemaVersion: "growth.learningAutomationSchedulerRun.candidate.v1",
      summaryOnly: true,
      handoffId: "lgahand_ready_1",
      proposalId: "lgauto_ready_1"
    }],
    executions: [],
    summary: {
      schemaVersion: "growth.learningAutomationSchedulerRun.summary.v1",
      summaryOnly: true,
      attemptedExecutions: 0,
      noDirectGateway: true
    },
    createdBy: "weixin_owner",
    executedBy: "weixin_owner",
    privacyClass: "summary_only",
    createdAt: "2026-06-15T13:30:00.000Z",
    updatedAt: "2026-06-15T13:30:00.000Z"
  }, overrides);
}

test("automation scheduler run repository records, updates, gets, and lists summary-only runs", () => {
  withRepository(({ repository }) => {
    const started = repository.recordRun(sampleRun());

    assert.equal(started.ok, true);
    assert.equal(started.run.runId, "lgasrun_ready_1");
    assert.equal(started.run.status, "started");
    assert.equal(started.run.privacyClass, "summary_only");
    assert.equal(started.run.input.backgroundSchedulerEnabled, true);

    const completed = repository.recordRun(sampleRun({
      status: "completed",
      reason: "background_scheduler_run_completed",
      executions: [{
        schemaVersion: "growth.learningAutomationSchedulerRun.execution.v1",
        summaryOnly: true,
        status: "published",
        proposalId: "lgauto_ready_1",
        generatedTaskCardId: "ltask_generated_1"
      }],
      summary: {
        schemaVersion: "growth.learningAutomationSchedulerRun.summary.v1",
        summaryOnly: true,
        attemptedExecutions: 1,
        published: 1,
        noDirectGateway: true
      },
      updatedAt: "2026-06-15T13:31:00.000Z"
    }));

    assert.equal(completed.ok, true);
    assert.equal(completed.run.runId, "lgasrun_ready_1");
    assert.equal(completed.run.status, "completed");
    assert.equal(completed.run.executions[0].generatedTaskCardId, "ltask_generated_1");
    assert.equal(completed.run.summary.published, 1);

    repository.recordRun(sampleRun({
      runId: "lgasrun_other_domain_1",
      domain: "english",
      subject: "english",
      horizon: "weekly_plan",
      status: "completed",
      reason: "background_scheduler_run_completed",
      updatedAt: "2026-06-15T13:32:00.000Z"
    }));

    const listed = repository.listRuns({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      status: "completed",
      limit: 5
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].runId, "lgasrun_ready_1");
    assert.equal(JSON.stringify(listed[0]).includes("rawAnswer"), false);

    assert.equal(repository.getRun({ workspaceId: "weixin_fanfan", runId: "lgasrun_ready_1" }).status, "completed");
    assert.deepEqual(repository.listRuns({ workspaceId: "other_workspace" }), []);
  });
});

test("automation scheduler run repository rejects privacy-risk fields, non-summary class, and invalid status", () => {
  withRepository(({ repository }) => {
    const privacy = repository.recordRun(sampleRun({
      input: { rawPrompt: "do not store" }
    }));
    assert.equal(privacy.ok, false);
    assert.equal(privacy.error, "learning_automation_scheduler_run_privacy_failed");
    assert.equal(privacy.privacyFindings.includes("$.input.rawPrompt"), true);

    const privacyValue = repository.recordRun(sampleRun({
      summary: { artifactId: "/Users/example/private-scheduler-run.json" }
    }));
    assert.equal(privacyValue.ok, false);
    assert.equal(privacyValue.error, "learning_automation_scheduler_run_privacy_failed");
    assert.equal(privacyValue.privacyFindings.includes("$.summary.artifactId"), true);

    const privacyClass = repository.recordRun(sampleRun({
      privacyClass: "raw_private"
    }));
    assert.equal(privacyClass.ok, false);
    assert.equal(privacyClass.error, "learning_automation_scheduler_run_privacy_class_required");

    const invalid = repository.recordRun(sampleRun({
      status: "queued"
    }));
    assert.equal(invalid.ok, false);
    assert.equal(invalid.error, "learning_automation_scheduler_run_status_invalid");
  });
});

test("automation scheduler run repository migrates bounded columns on existing tables", () => {
  withRepository(({ dbPath, repository }) => {
    {
      const db = new DatabaseSync(dbPath, { open: true });
      db.exec(`
        CREATE TABLE learning_growth_automation_scheduler_runs (
          run_id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          learner_id TEXT NOT NULL DEFAULT '',
          program_id TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'started',
          created_by TEXT NOT NULL DEFAULT '',
          privacy_class TEXT NOT NULL DEFAULT 'summary_only',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      db.close();
    }

    const saved = repository.recordRun(sampleRun({
      runId: "lgasrun_migrated_1",
      status: "blocked",
      reason: "learning_automation_background_scheduler_disabled"
    }));
    assert.equal(saved.ok, true);
    assert.equal(saved.run.reason, "learning_automation_background_scheduler_disabled");
    assert.equal(saved.run.mode, "background_supervised_tick");
    assert.equal(saved.run.executedBy, "weixin_owner");
  });
});
