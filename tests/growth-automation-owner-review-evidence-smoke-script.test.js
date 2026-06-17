"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const {
  inputFromArgs,
  projectAutomationOwnerReviewEvidenceSmokeReadback,
  runOperation,
  validateInput
} = require("../scripts/smoke-growth-automation-owner-review-evidence");

test("owner review evidence smoke script parses bounded automation scope", () => {
  const input = inputFromArgs([
    "--workspace-id", "fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--limit", "7",
    "--required-approval-key", "writefulExecutionApproval",
    "--activation-gates", "writeful_execution,background_scheduler"
  ]);

  assert.equal(input.workspaceId, "fanfan");
  assert.equal(input.learnerId, "fanfan");
  assert.equal(input.programId, "program_science");
  assert.equal(input.domainPackId, "uk_hk_curriculum_foundation");
  assert.equal(input.limit, 7);
  assert.deepEqual(input.requiredApprovalKeys, ["writefulExecutionApproval"]);
  assert.deepEqual(input.activationGates, ["writeful_execution", "background_scheduler"]);
});

test("owner review evidence smoke script requires workspace scope", () => {
  assert.deepEqual(validateInput({}), {
    ok: false,
    error: "automation_owner_review_evidence_smoke_workspace_required"
  });
  assert.deepEqual(validateInput({ workspaceId: "fanfan" }), { ok: true });
});

test("owner review evidence smoke script delegates only to service evaluate", () => {
  const calls = [];
  const service = {
    evaluate(input) {
      calls.push(input);
      return {
        ok: true,
        schemaVersion: "growth.learningAutomationOwnerReviewEvidence.v1",
        status: "proposal_required",
        writefulSchedulingAllowed: false
      };
    }
  };

  const result = runOperation(service, {
    workspaceId: "fanfan",
    limit: 3
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "proposal_required");
  assert.deepEqual(calls[0], { workspaceId: "fanfan", limit: 3 });
});

test("owner review evidence smoke script projects bounded operator readback", () => {
  const projected = projectAutomationOwnerReviewEvidenceSmokeReadback({
    ok: true,
    source: "growth-learning-automation-owner-review-evidence-service",
    schemaVersion: "growth.learningAutomationOwnerReviewEvidence.v1",
    privacyClass: "summary_only",
    workspaceId: "fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "owner_review_pipeline_ready",
    readyForReleaseReview: false,
    automationOwnerReviewEvidence: {
      summaryOnly: true,
      status: "owner_review_pipeline_ready",
      passedGateCount: 5,
      missingGateCount: 4,
      requiredActionCount: 4,
      nextAction: {
        key: "action_handoff_delivered",
        action: "deliver_action_handoff",
        requiredActor: "owner"
      },
      passedGateKeys: ["proposal_record_present", "digest_record_present"],
      missingGateKeys: ["action_handoff_delivered", "scheduler_run_record_present"],
      releaseReadinessStatus: "missing_release_evidence",
      releaseMissingCheckKeys: ["automation_action_handoff_ui_evidence"],
      proposalCount: 2,
      proposedProposalCount: 1,
      acceptedProposalCount: 1,
      skippedProposalCount: 0,
      expiredProposalCount: 0,
      supersededProposalCount: 0,
      ownerDecisionProposalCount: 1,
      proposalExecutionCount: 1,
      publishedProposalExecutionCount: 0,
      blockedProposalExecutionCount: 1,
      failedProposalExecutionCount: 0,
      digestCount: 1,
      reviewedDigestCount: 1,
      pendingDigestCount: 0,
      digestRequiredActionCount: 1,
      digestBlockedCandidateCount: 0,
      actionHandoffCount: 1,
      deliveredHandoffCount: 0,
      pendingHandoffDeliveryCount: 1,
      actionHandoffActionCount: 1,
      blockedActionHandoffCount: 0,
      schedulerExecutionCount: 1,
      publishedSchedulerExecutionCount: 0,
      blockedSchedulerExecutionCount: 1,
      failedSchedulerExecutionCount: 0,
      schedulerRunCount: 1,
      completedSchedulerRunCount: 0,
      blockedSchedulerRunCount: 1,
      skippedSchedulerRunCount: 0,
      reviewedWorkerTargetCount: 1,
      pendingWorkerTargetReviewCount: 0,
      disabledWorkerTargetCount: 0,
      failurePolicyReady: true,
      failurePolicyStatus: "failure_policy_ready",
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false
    },
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  }, {});

  assert.equal(projected.automationOwnerReviewEvidenceStatus, "owner_review_pipeline_ready");
  assert.equal(projected.automationOwnerReviewEvidenceOk, true);
  assert.equal(projected.automationOwnerReviewEvidenceOperation, "owner-review-evidence");
  assert.equal(projected.automationOwnerReviewEvidenceWorkspaceId, "fanfan");
  assert.equal(projected.automationOwnerReviewEvidenceLearnerId, "fanfan");
  assert.equal(projected.automationOwnerReviewEvidenceProgramId, "program_science");
  assert.equal(projected.automationOwnerReviewEvidenceDomainPackId, "domain_pack_fanfan_cambridge_pathway_v1");
  assert.equal(projected.automationOwnerReviewEvidenceDomain, "science");
  assert.equal(projected.automationOwnerReviewEvidenceSubject, "science");
  assert.equal(projected.automationOwnerReviewEvidenceHorizon, "daily_plan");
  assert.equal(projected.automationOwnerReviewEvidenceSchemaVersion, "growth.learningAutomationOwnerReviewEvidence.v1");
  assert.equal(projected.automationOwnerReviewEvidencePrivacyClass, "summary_only");
  assert.equal(projected.automationOwnerReviewEvidenceReadyForReleaseReview, false);
  assert.equal(projected.automationOwnerReviewEvidencePassedGateCount, 5);
  assert.equal(projected.automationOwnerReviewEvidenceMissingGateCount, 4);
  assert.equal(projected.automationOwnerReviewEvidenceRequiredActionCount, 4);
  assert.deepEqual(projected.automationOwnerReviewEvidencePassedGateKeys, ["proposal_record_present", "digest_record_present"]);
  assert.deepEqual(projected.automationOwnerReviewEvidenceMissingGateKeys, ["action_handoff_delivered", "scheduler_run_record_present"]);
  assert.equal(projected.automationOwnerReviewEvidenceNextActionKey, "action_handoff_delivered");
  assert.equal(projected.automationOwnerReviewEvidenceNextAction, "deliver_action_handoff");
  assert.equal(projected.automationOwnerReviewEvidenceReleaseReadinessStatus, "missing_release_evidence");
  assert.deepEqual(projected.automationOwnerReviewEvidenceReleaseMissingCheckKeys, ["automation_action_handoff_ui_evidence"]);
  assert.equal(projected.automationOwnerReviewEvidenceProposalCount, 2);
  assert.equal(projected.automationOwnerReviewEvidenceAcceptedProposalCount, 1);
  assert.equal(projected.automationOwnerReviewEvidenceBlockedProposalExecutionCount, 1);
  assert.equal(projected.automationOwnerReviewEvidenceDigestCount, 1);
  assert.equal(projected.automationOwnerReviewEvidenceReviewedDigestCount, 1);
  assert.equal(projected.automationOwnerReviewEvidenceActionHandoffCount, 1);
  assert.equal(projected.automationOwnerReviewEvidencePendingHandoffDeliveryCount, 1);
  assert.equal(projected.automationOwnerReviewEvidenceSchedulerExecutionCount, 1);
  assert.equal(projected.automationOwnerReviewEvidenceBlockedSchedulerExecutionCount, 1);
  assert.equal(projected.automationOwnerReviewEvidenceSchedulerRunCount, 1);
  assert.equal(projected.automationOwnerReviewEvidenceBlockedSchedulerRunCount, 1);
  assert.equal(projected.automationOwnerReviewEvidenceReviewedWorkerTargetCount, 1);
  assert.equal(projected.automationOwnerReviewEvidenceFailurePolicyReady, true);
  assert.equal(projected.automationOwnerReviewEvidenceFailurePolicyStatus, "failure_policy_ready");
  assert.equal(projected.automationOwnerReviewEvidenceWritefulSchedulingAllowed, false);
  assert.equal(projected.automationOwnerReviewEvidenceBackgroundSchedulingAllowed, false);
  assert.equal(projected.automationOwnerReviewEvidenceBackgroundWorkerAllowed, false);
  assert.equal(projected.automationOwnerReviewEvidenceRuntimeConfigChange, false);
  assert.equal(projected.automationOwnerReviewEvidenceConfigChangeApplied, false);
});

test("owner review evidence smoke script runs no-write read model against a temporary SQLite db", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-owner-review-evidence-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-automation-owner-review-evidence.js"),
      "--workspace-id", "fanfan",
      "--learner-id", "fanfan",
      "--domain", "science",
      "--subject", "science",
      "--json"
    ], {
      cwd: path.join(__dirname, ".."),
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });

    const output = JSON.parse(stdout);
    assert.equal(output.operation, "owner-review-evidence");
    assert.equal(output.ok, true);
    assert.equal(output.schemaVersion, "growth.learningAutomationOwnerReviewEvidence.v1");
    assert.equal(output.status, "proposal_required");
    assert.equal(output.automationOwnerReviewEvidence.summaryOnly, true);
    assert.equal(output.automationOwnerReviewEvidence.proposalCount, 0);
    assert.equal(output.automationOwnerReviewEvidence.requiredActionCount > 0, true);
    assert.equal(output.automationOwnerReviewEvidence.missingGateKeys.includes("proposal_record_present"), true);
    assert.equal(output.releaseReadiness.summaryOnly, true);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.backgroundSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);
    assert.equal(output.configChangeApplied, false);
    assert.equal(output.automationOwnerReviewEvidenceStatus, "proposal_required");
    assert.equal(output.automationOwnerReviewEvidenceOk, true);
    assert.equal(output.automationOwnerReviewEvidenceOperation, "owner-review-evidence");
    assert.equal(output.automationOwnerReviewEvidenceWorkspaceId, "fanfan");
    assert.equal(output.automationOwnerReviewEvidenceLearnerId, "fanfan");
    assert.equal(output.automationOwnerReviewEvidenceDomain, "science");
    assert.equal(output.automationOwnerReviewEvidenceSubject, "science");
    assert.equal(output.automationOwnerReviewEvidenceProposalCount, 0);
    assert.equal(output.automationOwnerReviewEvidenceRequiredActionCount > 0, true);
    assert.equal(output.automationOwnerReviewEvidenceMissingGateKeys.includes("proposal_record_present"), true);
    assert.equal(output.automationOwnerReviewEvidenceNextActionKey, "proposal_record_present");
    assert.equal(output.automationOwnerReviewEvidenceWritefulSchedulingAllowed, false);
    assert.equal(output.automationOwnerReviewEvidenceBackgroundSchedulingAllowed, false);
    assert.equal(output.automationOwnerReviewEvidenceRuntimeConfigChange, false);
    assert.equal(output.automationOwnerReviewEvidenceConfigChangeApplied, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
