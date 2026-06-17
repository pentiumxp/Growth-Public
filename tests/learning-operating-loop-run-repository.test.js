const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningOperatingLoopRunRepository
} = require("../src/stores/growth-learning-sqlite/operating-loop-runs");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-operating-loop-runs-"));
  const dbPath = path.join(dir, "operating-loop-runs.sqlite3");
  const repository = createLearningOperatingLoopRunRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-17T12:00:00.000Z")
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
    operation: "run_next",
    action: "draft_daily_plan",
    executionMode: "daily_loop_advance",
    status: "executed",
    writePerformed: true,
    actionExecuted: true,
    taskCardId: "ltask_operating_1",
    planDraftId: "lgplan_operating_1",
    selectedItemId: "plan_item_1",
    target: { workspaceId: "weixin_fanfan", learnerId: "fanfan", displayName: "Fanfan" },
    scope: { programId: "program_science", domain: "science", subject: "science", horizon: "daily_plan" },
    nextAction: { action: "draft_daily_plan", enabled: true },
    beforeSummary: { status: "ready_to_draft", readyForDraft: true },
    actionResult: { ok: true, taskCardId: "ltask_operating_1", planDraftId: "lgplan_operating_1" },
    afterSummary: { status: "ready_to_draft" },
    resultSelectors: { taskCardId: "ltask_operating_1", planDraftId: "lgplan_operating_1" },
    requestedBy: "weixin_owner",
    privacyClass: "summary_only"
  }, overrides);
}

test("operating loop run repository records and lists summary-only run audits", () => {
  withRepository(({ repository }) => {
    const saved = repository.recordRun(sampleRun());

    assert.equal(saved.ok, true);
    assert.equal(saved.duplicate, false);
    assert.match(saved.run.runId, /^lgloop_/);
    assert.equal(saved.run.status, "executed");
    assert.equal(saved.run.writePerformed, true);
    assert.equal(saved.run.actionExecuted, true);
    assert.equal(saved.run.taskCardId, "ltask_operating_1");
    assert.equal(saved.run.nextAction.action, "draft_daily_plan");
    assert.equal(saved.run.beforeSummary.status, "ready_to_draft");
    assert.equal(saved.run.privacyClass, "summary_only");
    assert.equal(JSON.stringify(saved.run).includes("rawPrompt"), false);

    const listed = repository.listRuns({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      action: "draft_daily_plan",
      status: "executed",
      taskCardId: "ltask_operating_1",
      limit: 5
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].runId, saved.run.runId);
    assert.equal(listed[0].resultSelectors.planDraftId, "lgplan_operating_1");
  });
});

test("operating loop run repository keeps separate attempts and supports blocked readback", () => {
  withRepository(({ repository }) => {
    const blocked = repository.recordRun(sampleRun({
      status: "blocked",
      writePerformed: false,
      actionExecuted: false,
      error: "stage_assessment_owner_confirmation_required",
      action: "review_stage_assessment",
      executionMode: "stage_assessment_activate",
      createdAt: "2026-06-17T12:00:01.000Z",
      taskCardId: "",
      planDraftId: "",
      selectedItemId: ""
    }));
    const executed = repository.recordRun(sampleRun({
      createdAt: "2026-06-17T12:00:02.000Z"
    }));

    assert.equal(blocked.ok, true);
    assert.equal(executed.ok, true);
    const all = repository.listRuns({ workspaceId: "weixin_fanfan", limit: 10 });
    assert.equal(all.length, 2);
    assert.equal(all[0].status, "executed");
    assert.equal(all[1].status, "blocked");
    assert.equal(repository.listRuns({ workspaceId: "weixin_fanfan", status: "blocked" }).length, 1);
  });
});

test("operating loop run repository rejects private payloads and non-summary writes", () => {
  withRepository(({ repository }) => {
    const privacyKey = repository.recordRun(sampleRun({
      beforeSummary: { rawPrompt: "do not store" }
    }));
    assert.equal(privacyKey.ok, false);
    assert.equal(privacyKey.error, "learning_operating_loop_run_privacy_failed");
    assert.equal(privacyKey.privacyFindings.includes("$.beforeSummary.rawPrompt"), true);

    const privateValue = repository.recordRun(sampleRun({
      actionResult: { artifactPath: "/Users/example/.homeai-qa/raw.json" }
    }));
    assert.equal(privateValue.ok, false);
    assert.equal(privateValue.error, "learning_operating_loop_run_privacy_failed");
    assert.equal(privateValue.privateValueFindings.includes("$.actionResult.artifactPath"), true);

    const privacyClass = repository.recordRun(sampleRun({
      privacyClass: "raw_private"
    }));
    assert.equal(privacyClass.ok, false);
    assert.equal(privacyClass.error, "learning_operating_loop_run_privacy_class_required");
  });
});

test("operating loop run repository migrates bounded columns on existing tables", () => {
  withRepository(({ dbPath, repository }) => {
    const db = new DatabaseSync(dbPath, { open: true });
    try {
      db.exec(`
        CREATE TABLE learning_growth_operating_loop_runs (
          run_id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
    } finally {
      db.close();
    }

    const saved = repository.recordRun(sampleRun());
    assert.equal(saved.ok, true);
    assert.equal(saved.run.action, "draft_daily_plan");
    assert.equal(saved.run.actionResult.taskCardId, "ltask_operating_1");
  });
});
