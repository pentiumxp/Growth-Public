const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningAutomationReleaseDecisionRepository
} = require("../src/stores/growth-learning-sqlite/automation-release-decisions");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-release-decision-"));
  const dbPath = path.join(dir, "automation-release-decisions.sqlite3");
  const repository = createLearningAutomationReleaseDecisionRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-15T15:30:00.000Z")
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sampleDecision(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    collectionRunId: "lgacrn_ready_1",
    status: "approved",
    decisionVersion: "growth.learningAutomationReleaseDecision.v1",
    summaryOnly: true,
    privacyClass: "summary_only",
    collectionRunSummary: {
      schemaVersion: "growth.learningAutomationReleaseCollectionRun.v1",
      summaryOnly: true,
      status: "ready_for_release_review",
      collectionRunId: "lgacrn_ready_1"
    },
    releaseReview: {
      schemaVersion: "growth.learningAutomationReleaseDecision.releaseReviewSummary.v1",
      summaryOnly: true,
      advisoryOnly: true,
      writefulSchedulingAllowed: false
    },
    decision: {
      schemaVersion: "growth.learningAutomationReleaseDecision.v1",
      summaryOnly: true,
      status: "approved",
      advisoryOnly: true,
      writefulSchedulingAllowed: false
    },
    evidenceSummary: {
      schemaVersion: "growth.learningAutomationReleaseDecision.evidenceSummary.v1",
      summaryOnly: true,
      collectionRunId: "lgacrn_ready_1"
    },
    decidedBy: "weixin_owner"
  }, overrides);
}

test("automation release decision repository saves, lists, and de-duplicates summary-only decisions", () => {
  withRepository(({ repository }) => {
    const saved = repository.saveDecision(sampleDecision());

    assert.equal(saved.ok, true);
    assert.equal(saved.duplicate, false);
    assert.equal(saved.decision.workspaceId, "weixin_fanfan");
    assert.equal(saved.decision.collectionRunId, "lgacrn_ready_1");
    assert.equal(saved.decision.status, "approved");
    assert.equal(saved.decision.decision.summaryOnly, true);
    assert.equal(saved.decision.decidedBy, "weixin_owner");
    assert.equal(saved.decision.decidedAt, "2026-06-15T15:30:00.000Z");
    assert.equal(saved.decision.privacyClass, "summary_only");

    const duplicate = repository.saveDecision(sampleDecision({
      evidenceSummary: { evidenceId: "different" }
    }));
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.decision.decisionId, saved.decision.decisionId);
    assert.equal(duplicate.decision.evidenceSummary.collectionRunId, "lgacrn_ready_1");

    const listed = repository.listDecisions({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      collectionRunId: "lgacrn_ready_1",
      status: "approved",
      limit: 5
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].decisionId, saved.decision.decisionId);
    assert.equal(JSON.stringify(listed[0]).includes("rawAnswer"), false);

    assert.deepEqual(repository.listDecisions({ workspaceId: "other_workspace" }), []);
  });
});

test("automation release decision repository rejects privacy risks, invalid status, and non-summary writes", () => {
  withRepository(({ repository }) => {
    const privacyKey = repository.saveDecision(sampleDecision({
      decision: { rawPrompt: "do not store" }
    }));
    assert.equal(privacyKey.ok, false);
    assert.equal(privacyKey.error, "learning_automation_release_decision_privacy_failed");

    const privateValue = repository.saveDecision(sampleDecision({
      collectionRunSummary: { artifactFileName: "/Users/example/.homeai-qa/release.json" }
    }));
    assert.equal(privateValue.ok, false);
    assert.equal(privateValue.error, "learning_automation_release_decision_privacy_failed");
    assert.equal(privateValue.privateValueFindings.includes("$.collectionRunSummary.artifactFileName"), true);

    const invalidStatus = repository.saveDecision(sampleDecision({
      status: "released"
    }));
    assert.equal(invalidStatus.ok, false);
    assert.equal(invalidStatus.error, "learning_automation_release_decision_status_invalid");

    const privateClass = repository.saveDecision(sampleDecision({
      status: "blocked",
      privacyClass: "private"
    }));
    assert.equal(privateClass.ok, false);
    assert.equal(privateClass.error, "learning_automation_release_decision_privacy_class_required");
  });
});

test("automation release decision repository migrates bounded columns on existing tables", () => {
  withRepository(({ dbPath, repository }) => {
    const db = new DatabaseSync(dbPath, { open: true });
    db.exec(`
      CREATE TABLE learning_growth_automation_release_decisions (
        decision_id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        learner_id TEXT NOT NULL DEFAULT '',
        collection_run_id TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'needs_evidence',
        privacy_class TEXT NOT NULL DEFAULT 'summary_only',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    db.close();

    const result = repository.saveDecision(sampleDecision({ status: "blocked" }));
    assert.equal(result.ok, true);
    assert.equal(result.decision.programId, "program_science");
    assert.equal(result.decision.decision.summaryOnly, true);
  });
});
