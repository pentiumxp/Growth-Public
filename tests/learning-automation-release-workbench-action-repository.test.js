const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningAutomationReleaseWorkbenchActionAuditRepository
} = require("../src/stores/growth-learning-sqlite/automation-release-workbench-actions");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-release-workbench-actions-"));
  const dbPath = path.join(dir, "automation-release-workbench-actions.sqlite3");
  const repository = createLearningAutomationReleaseWorkbenchActionAuditRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-17T07:00:00.000Z")
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sampleActionAudit(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    collectionRunId: "lgacrn_ready_1",
    endpointKey: "release_evidence_collection",
    actionKey: "release_collection_run",
    status: "recorded",
    recordId: "lgacrn_ready_1",
    recordStatus: "ready_for_release_review",
    duplicate: false,
    workbenchStatus: "release_evidence_required",
    actionRecord: {
      schemaVersion: "growth.learningAutomationReleaseWorkbenchAction.record.v1",
      summaryOnly: true,
      endpointKey: "release_evidence_collection",
      actionKey: "release_collection_run",
      recordId: "lgacrn_ready_1",
      recordStatus: "ready_for_release_review"
    },
    actionSummary: {
      schemaVersion: "growth.learningAutomationReleaseWorkbenchActionAudit.summary.v1",
      summaryOnly: true,
      endpointKey: "release_evidence_collection",
      actionKey: "release_collection_run",
      status: "recorded",
      recordId: "lgacrn_ready_1",
      recordStatus: "ready_for_release_review",
      configChangeApplied: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false
    },
    requestedBy: "weixin_owner",
    privacyClass: "summary_only",
    summaryOnly: true,
    createdAt: "2026-06-17T07:00:00.000Z"
  }, overrides);
}

test("automation release workbench action audit repository saves and lists summary-only action audits", () => {
  withRepository(({ repository }) => {
    const saved = repository.saveActionAudit(sampleActionAudit());

    assert.equal(saved.ok, true);
    assert.equal(saved.duplicate, false);
    assert.equal(saved.actionAudit.status, "recorded");
    assert.equal(saved.actionAudit.privacyClass, "summary_only");
    assert.equal(saved.actionAudit.endpointKey, "release_evidence_collection");
    assert.equal(saved.actionAudit.actionRecord.recordId, "lgacrn_ready_1");
    assert.equal(saved.actionAudit.actionSummary.writefulSchedulingAllowed, false);
    assert.equal(JSON.stringify(saved.actionAudit).includes("/Users/"), false);

    const duplicate = repository.saveActionAudit(sampleActionAudit());
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.actionAudit.actionAuditId, saved.actionAudit.actionAuditId);

    const listed = repository.listActionAudits({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      collectionRunId: "lgacrn_ready_1",
      endpointKey: "release_evidence_collection",
      actionKey: "release_collection_run",
      status: "recorded",
      limit: 5
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].actionAuditId, saved.actionAudit.actionAuditId);
    assert.equal(listed[0].actionRecord.recordStatus, "ready_for_release_review");
  });
});

test("automation release workbench action audit repository rejects private payloads and non-summary writes", () => {
  withRepository(({ repository }) => {
    const privacyKey = repository.saveActionAudit(sampleActionAudit({
      actionSummary: { rawPrompt: "do not store" }
    }));
    assert.equal(privacyKey.ok, false);
    assert.equal(privacyKey.error, "learning_automation_release_workbench_action_audit_privacy_failed");
    assert.equal(privacyKey.privacyFindings.includes("$.actionSummary.rawPrompt"), true);

    const privateValue = repository.saveActionAudit(sampleActionAudit({
      actionRecord: { artifactPath: "/Users/example/.homeai-qa/raw.json" }
    }));
    assert.equal(privateValue.ok, false);
    assert.equal(privateValue.error, "learning_automation_release_workbench_action_audit_privacy_failed");
    assert.equal(privateValue.privateValueFindings.includes("$.actionRecord.artifactPath"), true);

    const privacyClass = repository.saveActionAudit(sampleActionAudit({
      privacyClass: "raw_private"
    }));
    assert.equal(privacyClass.ok, false);
    assert.equal(privacyClass.error, "learning_automation_release_workbench_action_audit_privacy_class_required");

    const invalidStatus = repository.saveActionAudit(sampleActionAudit({
      status: "enabled"
    }));
    assert.equal(invalidStatus.ok, false);
    assert.equal(invalidStatus.error, "learning_automation_release_workbench_action_audit_status_invalid");
  });
});

test("automation release workbench action audit repository migrates bounded columns on existing tables", () => {
  withRepository(({ dbPath, repository }) => {
    const db = new DatabaseSync(dbPath, { open: true });
    try {
      db.exec(`
        CREATE TABLE learning_growth_automation_release_workbench_actions (
          action_audit_id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          learner_id TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'blocked',
          privacy_class TEXT NOT NULL DEFAULT 'summary_only',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    } finally {
      db.close();
    }

    const saved = repository.saveActionAudit(sampleActionAudit());
    assert.equal(saved.ok, true);
    assert.equal(saved.actionAudit.endpointKey, "release_evidence_collection");
    assert.equal(saved.actionAudit.actionSummary.status, "recorded");
  });
});
