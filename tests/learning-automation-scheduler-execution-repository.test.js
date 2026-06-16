const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningAutomationSchedulerExecutionRepository
} = require("../src/stores/growth-learning-sqlite/automation-scheduler-executions");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-scheduler-execution-"));
  const dbPath = path.join(dir, "automation-scheduler-executions.sqlite3");
  const repository = createLearningAutomationSchedulerExecutionRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-15T12:30:00.000Z")
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sampleExecution(overrides = {}) {
  return Object.assign({
    executionId: "lgasexec_ready_1",
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    handoffId: "lgahand_ready_1",
    digestId: "lgadig_ready_1",
    policyId: "lgafpol_active_1",
    proposalId: "lgauto_ready_1",
    planDraftId: "lgplan_next_1",
    selectedItemId: "plan_item_next_1",
    mode: "owner_explicit_once",
    status: "started",
    reason: "owner_explicit_execution_started",
    gate: {
      schemaVersion: "growth.learningAutomationSchedulerExecution.gate.v1",
      summaryOnly: true,
      writefulExecutionEnabled: true
    },
    action: {
      schemaVersion: "growth.learningAutomationSchedulerExecution.action.v1",
      summaryOnly: true,
      proposalId: "lgauto_ready_1",
      publishDelegation: "learning-automation-proposal-service.publishAcceptedProposal"
    },
    execution: {
      schemaVersion: "growth.learningAutomationSchedulerExecution.execution.v1",
      summaryOnly: true,
      status: "started"
    },
    createdBy: "weixin_owner",
    executedBy: "weixin_owner",
    privacyClass: "summary_only"
  }, overrides);
}

test("automation scheduler execution repository records, updates, and lists summary-only executions", () => {
  withRepository(({ repository }) => {
    const started = repository.recordExecution(sampleExecution());

    assert.equal(started.ok, true);
    assert.equal(started.execution.executionId, "lgasexec_ready_1");
    assert.equal(started.execution.status, "started");
    assert.equal(started.execution.privacyClass, "summary_only");
    assert.equal(started.execution.gate.writefulExecutionEnabled, true);

    const published = repository.recordExecution(sampleExecution({
      status: "published",
      reason: "accepted_proposal_published",
      execution: {
        status: "published",
        generatedTaskCardId: "ltask_generated_1",
        summaryOnly: true
      },
      publishResult: {
        ok: true,
        proposal: { execution: { status: "published" } }
      }
    }));
    assert.equal(published.ok, true);
    assert.equal(published.execution.status, "published");
    assert.equal(published.execution.execution.generatedTaskCardId, "ltask_generated_1");
    assert.equal(published.execution.publishResult.ok, true);

    const listed = repository.listExecutions({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      handoffId: "lgahand_ready_1",
      digestId: "lgadig_ready_1",
      proposalId: "lgauto_ready_1",
      status: "published",
      limit: 5
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].executionId, "lgasexec_ready_1");
    assert.equal(JSON.stringify(listed[0]).includes("rawAnswer"), false);

    assert.equal(repository.getExecution({
      workspaceId: "weixin_fanfan",
      executionId: "lgasexec_ready_1"
    }).status, "published");
    assert.deepEqual(repository.listExecutions({ workspaceId: "other_workspace" }), []);
  });
});

test("automation scheduler execution repository rejects privacy-risk fields and invalid status", () => {
  withRepository(({ repository }) => {
    const privacy = repository.recordExecution(sampleExecution({
      rawPrompt: "do not store"
    }));
    assert.equal(privacy.ok, false);
    assert.equal(privacy.error, "learning_automation_scheduler_execution_privacy_failed");

    const privacyValue = repository.recordExecution(sampleExecution({
      execution: { artifactId: "/Users/example/private-scheduler-execution.json" }
    }));
    assert.equal(privacyValue.ok, false);
    assert.equal(privacyValue.error, "learning_automation_scheduler_execution_privacy_failed");
    assert.equal(privacyValue.privacyFindings.includes("$.execution.artifactId"), true);

    const privacyClass = repository.recordExecution(sampleExecution({
      privacyClass: "raw_private"
    }));
    assert.equal(privacyClass.ok, false);
    assert.equal(privacyClass.error, "learning_automation_scheduler_execution_privacy_class_required");

    const invalid = repository.recordExecution(sampleExecution({
      status: "queued"
    }));
    assert.equal(invalid.ok, false);
    assert.equal(invalid.error, "learning_automation_scheduler_execution_status_invalid");
  });
});

test("automation scheduler execution repository migrates bounded columns on existing tables", () => {
  withRepository(({ dbPath, repository }) => {
    {
      const db = new DatabaseSync(dbPath, { open: true });
      db.exec(`
        CREATE TABLE learning_growth_automation_scheduler_executions (
          execution_id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          learner_id TEXT NOT NULL DEFAULT '',
          program_id TEXT NOT NULL DEFAULT '',
          handoff_id TEXT NOT NULL DEFAULT '',
          digest_id TEXT NOT NULL DEFAULT '',
          policy_id TEXT NOT NULL DEFAULT '',
          proposal_id TEXT NOT NULL DEFAULT '',
          plan_draft_id TEXT NOT NULL DEFAULT '',
          selected_item_id TEXT NOT NULL DEFAULT '',
          mode TEXT NOT NULL DEFAULT 'owner_explicit_once',
          status TEXT NOT NULL DEFAULT 'started',
          created_by TEXT NOT NULL DEFAULT '',
          privacy_class TEXT NOT NULL DEFAULT 'summary_only',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      db.close();
    }

    const saved = repository.recordExecution(sampleExecution({
      executionId: "lgasexec_migrated_1",
      status: "blocked",
      reason: "learning_automation_scheduler_execution_disabled"
    }));
    assert.equal(saved.ok, true);
    assert.equal(saved.execution.reason, "learning_automation_scheduler_execution_disabled");
    assert.equal(saved.execution.executedBy, "weixin_owner");
  });
});
