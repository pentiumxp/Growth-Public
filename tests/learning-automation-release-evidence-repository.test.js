const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningAutomationReleaseEvidenceRepository
} = require("../src/stores/growth-learning-sqlite/automation-release-evidence");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-release-evidence-"));
  const dbPath = path.join(dir, "automation-release-evidence.sqlite3");
  const repository = createLearningAutomationReleaseEvidenceRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-16T10:00:00.000Z")
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sampleEvidence(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    evidenceKey: "ownerDailyUiEvidence",
    checkKey: "owner_daily_ui_evidence",
    status: "pass",
    evidenceVersion: "growth.learningAutomationReleaseEvidenceRecord.v1",
    evidence: {
      schemaVersion: "growth.learningAutomationReleaseEvidenceRecord.evidence.v1",
      summaryOnly: true,
      evidenceId: "owner_daily_ui_1",
      source: "owner_visual_harness"
    },
    recordedBy: "weixin_owner",
    privacyClass: "summary_only"
  }, overrides);
}

test("automation release evidence repository saves, lists, and de-duplicates summary-only evidence", () => {
  withRepository(({ repository }) => {
    const saved = repository.saveEvidence(sampleEvidence());

    assert.equal(saved.ok, true);
    assert.equal(saved.duplicate, false);
    assert.equal(saved.evidence.workspaceId, "weixin_fanfan");
    assert.equal(saved.evidence.evidenceKey, "ownerDailyUiEvidence");
    assert.equal(saved.evidence.checkKey, "owner_daily_ui_evidence");
    assert.equal(saved.evidence.status, "pass");
    assert.equal(saved.evidence.evidence.summaryOnly, true);
    assert.equal(saved.evidence.evidence.evidenceId, "owner_daily_ui_1");
    assert.equal(saved.evidence.recordedBy, "weixin_owner");
    assert.equal(saved.evidence.observedAt, "2026-06-16T10:00:00.000Z");
    assert.equal(saved.evidence.privacyClass, "summary_only");

    const duplicate = repository.saveEvidence(sampleEvidence());
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.evidence.evidenceRecordId, saved.evidence.evidenceRecordId);

    const listed = repository.listEvidence({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      evidenceKey: "ownerDailyUiEvidence",
      status: "pass",
      limit: 5
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].evidenceRecordId, saved.evidence.evidenceRecordId);
    assert.equal(JSON.stringify(listed[0]).includes("rawAnswer"), false);

    assert.deepEqual(repository.listEvidence({ workspaceId: "other_workspace" }), []);
  });
});

test("automation release evidence repository rejects privacy-risk, invalid status, and non-summary payloads", () => {
  withRepository(({ repository }) => {
    const privacyKey = repository.saveEvidence(sampleEvidence({
      evidence: { rawPrompt: "do not store" }
    }));
    assert.equal(privacyKey.ok, false);
    assert.equal(privacyKey.error, "learning_automation_release_evidence_privacy_failed");

    const privacyValue = repository.saveEvidence(sampleEvidence({
      evidenceKey: "ownerAuditUiEvidence",
      evidence: { artifactId: "/Users/hermes-dev/private-artifact.json" }
    }));
    assert.equal(privacyValue.ok, false);
    assert.equal(privacyValue.error, "learning_automation_release_evidence_privacy_failed");

    const status = repository.saveEvidence(sampleEvidence({
      evidenceKey: "stageCheckpointEvidence",
      status: "ready"
    }));
    assert.equal(status.ok, false);
    assert.equal(status.error, "learning_automation_release_evidence_status_invalid");

    const privateClass = repository.saveEvidence(sampleEvidence({
      evidenceKey: "proposalReviewUiEvidence",
      privacyClass: "private"
    }));
    assert.equal(privateClass.ok, false);
    assert.equal(privateClass.error, "learning_automation_release_evidence_privacy_class_required");
  });
});
