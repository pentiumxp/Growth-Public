const assert = require("node:assert/strict");
const test = require("node:test");

const {
  inputFromArgs,
  operationFromArgs,
  projectAutomationReviewAdvancementSmokeReadback,
  shouldAllowWrite,
  validateOperationInput
} = require("../scripts/smoke-growth-automation-review-advancement");

test("automation review advancement smoke script parses advance input and write gate", () => {
  const args = [
    "--operation", "advance",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--cycle-id", "cycle_ready_1",
    "--source-task-card-id", "ltask_previous",
    "--source-evaluation-id", "leval_previous",
    "--digest-id", "lgadig_existing_1",
    "--proposal-id", "lgauto_ready_1",
    "--handoff-id", "lgahand_ready_1",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--target-node-ids", "kg_science_fair_test,kg_science_observation_language",
    "--source-target-node-id", "kg_science_previous",
    "--selected-candidate-id", "lgauto_ready_1:lgplan_next_1:plan_item_next_1",
    "--deliver-handoff",
    "--attempt-execution",
    "--requested-by", "weixin_owner",
    "--allow-write"
  ];

  assert.equal(operationFromArgs(args), "advance");
  assert.equal(shouldAllowWrite(args), true);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    cycleId: "cycle_ready_1",
    sourcePlanDraftId: "",
    sourceTaskCardId: "ltask_previous",
    sourceEvaluationId: "leval_previous",
    digestId: "lgadig_existing_1",
    handoffId: "lgahand_ready_1",
    proposalId: "lgauto_ready_1",
    planDraftId: "",
    selectedItemId: "",
    profileDeltaId: "",
    evidenceId: "",
    correctionId: "",
    sourceId: "",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    limit: 6,
    auditLimit: 20,
    availableMinutes: 15,
    targetNodeIds: ["kg_science_fair_test", "kg_science_observation_language"],
    sourceTargetNodeIds: ["kg_science_previous"],
    selectedCandidateIds: ["lgauto_ready_1:lgplan_next_1:plan_item_next_1"],
    prepareReviewPacket: true,
    reviewDigest: true,
    ensureFailurePolicy: true,
    createHandoff: true,
    deliverHandoff: true,
    attemptExecution: true,
    requestedBy: "weixin_owner"
  });
  assert.deepEqual(validateOperationInput("advance", inputFromArgs(args), false), {
    ok: false,
    error: "automation_review_advancement_smoke_write_not_allowed",
    operation: "advance",
    exitCode: 2
  });
});

test("automation review advancement smoke script projects operator readback", () => {
  const projected = projectAutomationReviewAdvancementSmokeReadback({
    ok: true,
    status: "execution_blocked",
    privacyClass: "summary_only",
    summaryOnly: true,
    writesPerformed: true,
    publishPerformed: false,
    schedulerStarted: false,
    stages: [
      { name: "cycle_closure", ok: true, status: "pending" },
      { name: "digest_review", ok: true, status: "reviewed" },
      { name: "failure_policy_readiness", ok: true, status: "missing_active_failure_policy" },
      { name: "failure_policy_create", ok: true, status: "pass" },
      { name: "failure_policy_review", ok: true, status: "active" },
      { name: "handoff_create", ok: true, status: "not_delivered" },
      { name: "handoff_deliver", ok: true, status: "delivered" },
      { name: "scheduler_execute", ok: true, status: "blocked_default_disabled", expectedBlocked: true }
    ],
    summary: {
      selectedCycleId: "cycle_ready_1",
      selectedTaskCardId: "ltask_previous",
      proposalId: "lgauto_ready_1",
      proposalStatus: "accepted",
      digestId: "lgadig_ready_1",
      digestStatus: "reviewed",
      policyId: "lgafpol_created_1",
      policyStatus: "active",
      handoffId: "lgahand_ready_1",
      handoffDeliveryStatus: "delivered",
      executionId: "lgasexec_blocked_1",
      executionStatus: "blocked",
      publishPerformed: false,
      schedulerStarted: false,
      gatewayBoundary: "cycle_closure_proposal_creation_may_call_planner_gateway_only"
    },
    digest: { digestId: "lgadig_ready_1", status: "reviewed" },
    failurePolicy: { policyId: "lgafpol_created_1", status: "active" },
    handoff: { handoffId: "lgahand_ready_1", deliveryStatus: "delivered" },
    execution: { execution: { executionId: "lgasexec_blocked_1", status: "blocked" } }
  }, "advance", {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan"
  }, true);

  assert.equal(projected.automationReviewAdvancementStatus, "execution_blocked");
  assert.equal(projected.automationReviewAdvancementOk, true);
  assert.equal(projected.automationReviewAdvancementWriteOperation, true);
  assert.equal(projected.automationReviewAdvancementWriteAllowed, true);
  assert.equal(projected.automationReviewAdvancementWritesPerformed, true);
  assert.equal(projected.automationReviewAdvancementPublishPerformed, false);
  assert.equal(projected.automationReviewAdvancementSchedulerStarted, false);
  assert.equal(projected.automationReviewAdvancementProposalId, "lgauto_ready_1");
  assert.equal(projected.automationReviewAdvancementDigestStatus, "reviewed");
  assert.equal(projected.automationReviewAdvancementPolicyStatus, "active");
  assert.equal(projected.automationReviewAdvancementHandoffDeliveryStatus, "delivered");
  assert.equal(projected.automationReviewAdvancementExecutionStatus, "blocked");
  assert.deepEqual(projected.automationReviewAdvancementStageNames, [
    "cycle_closure",
    "digest_review",
    "failure_policy_readiness",
    "failure_policy_create",
    "failure_policy_review",
    "handoff_create",
    "handoff_deliver",
    "scheduler_execute"
  ]);
  assert.deepEqual(projected.automationReviewAdvancementFailedStageNames, []);
});
