const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningAutomationReleaseApprovalRepository
} = require("../src/stores/growth-learning-sqlite/automation-release-approvals");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-release-approval-"));
  const dbPath = path.join(dir, "automation-release-approvals.sqlite3");
  const repository = createLearningAutomationReleaseApprovalRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-15T12:00:00.000Z")
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sampleApproval(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    approvalKey: "writefulExecutionApproval",
    approvalVersion: "growth.learningAutomationReleaseApproval.v1",
    approval: {
      schemaVersion: "growth.learningAutomationReleaseApproval.v1",
      summaryOnly: true,
      approvalKey: "writefulExecutionApproval",
      approved: true,
      writefulSchedulingAllowed: false
    },
    evidence: {
      schemaVersion: "growth.learningAutomationReleaseApproval.evidence.v1",
      summaryOnly: true,
      evidenceId: "release_evidence_1"
    },
    approvedBy: "weixin_owner",
    privacyClass: "summary_only"
  }, overrides);
}

test("automation release approval repository saves, lists, and de-duplicates summary-only approvals", () => {
  withRepository(({ repository }) => {
    const saved = repository.saveApproval(sampleApproval());

    assert.equal(saved.ok, true);
    assert.equal(saved.duplicate, false);
    assert.equal(saved.approval.workspaceId, "weixin_fanfan");
    assert.equal(saved.approval.approvalKey, "writefulExecutionApproval");
    assert.equal(saved.approval.status, "approved");
    assert.equal(saved.approval.approval.summaryOnly, true);
    assert.equal(saved.approval.evidence.evidenceId, "release_evidence_1");
    assert.equal(saved.approval.approvedBy, "weixin_owner");
    assert.equal(saved.approval.approvedAt, "2026-06-15T12:00:00.000Z");
    assert.equal(saved.approval.privacyClass, "summary_only");

    const duplicate = repository.saveApproval(sampleApproval({
      evidence: { evidenceId: "different" }
    }));
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.approval.approvalId, saved.approval.approvalId);
    assert.equal(duplicate.approval.evidence.evidenceId, "release_evidence_1");

    const listed = repository.listApprovals({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      approvalKey: "writefulExecutionApproval",
      status: "approved",
      limit: 5
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].approvalId, saved.approval.approvalId);
    assert.equal(JSON.stringify(listed[0]).includes("rawAnswer"), false);

    assert.deepEqual(repository.listApprovals({ workspaceId: "other_workspace" }), []);
  });
});

test("automation release approval repository rejects privacy-risk and non-summary payloads", () => {
  withRepository(({ repository }) => {
    const privacy = repository.saveApproval(sampleApproval({
      approval: { rawPrompt: "do not store" }
    }));
    assert.equal(privacy.ok, false);
    assert.equal(privacy.error, "learning_automation_release_approval_privacy_failed");

    const privacyValue = repository.saveApproval(sampleApproval({
      approvalKey: "backgroundWorkerApproval",
      evidence: { artifactId: "/Users/example/private-approval.json" }
    }));
    assert.equal(privacyValue.ok, false);
    assert.equal(privacyValue.error, "learning_automation_release_approval_privacy_failed");

    const privateClass = repository.saveApproval(sampleApproval({
      approvalKey: "backgroundSchedulerApproval",
      privacyClass: "private"
    }));
    assert.equal(privateClass.ok, false);
    assert.equal(privateClass.error, "learning_automation_release_approval_privacy_class_required");
  });
});
