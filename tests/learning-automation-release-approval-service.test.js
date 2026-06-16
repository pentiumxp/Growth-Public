const assert = require("node:assert/strict");
const test = require("node:test");

const {
  canonicalApprovalKey,
  createLearningAutomationReleaseApprovalService
} = require("../src/services/learning-automation-release-approval-service");

function scope(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan"
  }, overrides);
}

function createService() {
  const rows = [];
  const calls = [];
  const service = createLearningAutomationReleaseApprovalService({
    repository: {
      saveApproval(input) {
        calls.push({ type: "saveApproval", input });
        const approval = Object.assign({
          approvalId: `lgarap_${rows.length + 1}`,
          status: "approved",
          approvedBy: input.approvedBy,
          approvedAt: input.approvedAt || "2026-06-15T12:30:00.000Z"
        }, input);
        rows.push(approval);
        return { ok: true, duplicate: false, approval };
      },
      listApprovals(input) {
        calls.push({ type: "listApprovals", input });
        return rows.filter((row) => !input.status || row.status === input.status);
      }
    }
  });
  return { calls, rows, service };
}

test("automation release approval service canonicalizes gates and records summary-only approvals", () => {
  const { calls, service } = createService();

  const result = service.recordApproval(Object.assign(scope(), {
    approvalKey: "writeful_execution_release_approval",
    evidence: { evidenceId: "release_evidence_1" },
    approvedBy: "weixin_owner"
  }));

  assert.equal(result.ok, true);
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.approval.approvalKey, "writefulExecutionApproval");
  assert.equal(calls[0].type, "saveApproval");
  assert.equal(calls[0].input.privacyClass, "summary_only");
  assert.equal(calls[0].input.approval.approved, true);
  assert.equal(calls[0].input.approval.writefulSchedulingAllowed, false);
});

test("automation release approval service returns approval bag for release-readiness", () => {
  const { service } = createService();
  service.recordApproval(Object.assign(scope(), {
    approvalKey: "writeful_execution",
    approvedBy: "weixin_owner"
  }));
  service.recordApproval(Object.assign(scope(), {
    approvalKey: "background_scheduler",
    approvedBy: "weixin_owner"
  }));

  const bag = service.approvalBag(scope());

  assert.equal(bag.ok, true);
  assert.deepEqual(bag.approvalKeys, ["backgroundSchedulerApproval", "writefulExecutionApproval"]);
  assert.equal(bag.releaseApproval.writefulExecutionApproval.approved, true);
  assert.equal(bag.releaseApproval.backgroundSchedulerApproval.source, "growth_release_approval_record");
  assert.equal(bag.writefulSchedulingAllowed, false);
});

test("automation release approval service rejects invalid gates and privacy-risk payloads", () => {
  const { service } = createService();

  const invalid = service.recordApproval(Object.assign(scope(), {
    approvalKey: "unknown_gate"
  }));
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error, "learning_automation_release_approval_scope_required");

  const privacy = service.recordApproval(Object.assign(scope(), {
    approvalKey: "background_worker",
    rawPrompt: "do not store"
  }));
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_automation_release_approval_privacy_failed");

  const privacyValue = service.recordApproval(Object.assign(scope(), {
    approvalKey: "background_scheduler",
    evidence: { artifactId: "/Users/example/private-approval.json" }
  }));
  assert.equal(privacyValue.ok, false);
  assert.equal(privacyValue.error, "learning_automation_release_approval_privacy_failed");

  assert.equal(canonicalApprovalKey("background_worker_release_approval"), "backgroundWorkerApproval");
});
