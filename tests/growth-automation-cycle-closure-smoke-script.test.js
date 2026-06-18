const assert = require("node:assert/strict");
const test = require("node:test");

const {
  inputFromArgs,
  operationFromArgs,
  projectAutomationCycleClosureSmokeReadback,
  shouldAllowWrite,
  validateOperationInput
} = require("../scripts/smoke-growth-automation-cycle-closure");

test("automation cycle closure smoke script parses prepare input and write gate", () => {
  const args = [
    "--operation", "prepare",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--cycle-id", "cycle_ready_1",
    "--source-plan-draft-id", "lgplan_previous",
    "--source-task-card-id", "ltask_previous",
    "--source-evaluation-id", "leval_previous",
    "--profile-delta-id", "lgpdelta_previous",
    "--evidence-id", "lgevd_previous",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--limit", "7",
    "--audit-limit", "9",
    "--available-minutes", "15",
    "--target-node-id", "kg_science_fair_test",
    "--target-node-ids", "kg_science_fair_test,kg_science_observation_language",
    "--source-target-node-id", "kg_science_previous",
    "--source-target-node-ids", "kg_science_previous,kg_science_prereq",
    "--allowed-card-role", "repair",
    "--allowed-card-roles", "teaching,repair",
    "--review-digest",
    "--create-handoff",
    "--requested-by", "weixin_owner",
    "--allow-write"
  ];

  assert.equal(operationFromArgs(args), "prepare");
  assert.equal(shouldAllowWrite(args), true);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    cycleId: "cycle_ready_1",
    sourcePlanDraftId: "lgplan_previous",
    sourceTaskCardId: "ltask_previous",
    sourceEvaluationId: "leval_previous",
    profileDeltaId: "lgpdelta_previous",
    evidenceId: "lgevd_previous",
    correctionId: "",
    sourceId: "",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    limit: 7,
    auditLimit: 9,
    availableMinutes: 15,
    targetNodeIds: ["kg_science_fair_test", "kg_science_observation_language"],
    sourceTargetNodeIds: ["kg_science_previous", "kg_science_prereq"],
    allowedCardRoles: ["repair", "teaching"],
    autoSelectCompletedCycle: false,
    autoSelectLatestCompletedCycle: true,
    acceptProposal: true,
    createDigest: true,
    reviewDigest: true,
    createHandoff: true,
    deliverHandoff: false,
    requestedBy: "weixin_owner"
  });
  assert.deepEqual(validateOperationInput("prepare", inputFromArgs(args), false), {
    ok: false,
    error: "automation_cycle_closure_smoke_write_not_allowed",
    operation: "prepare",
    exitCode: 2
  });
});

test("automation cycle closure smoke script projects operator readback", () => {
  const projected = projectAutomationCycleClosureSmokeReadback({
    ok: true,
    status: "pending",
    privacyClass: "summary_only",
    summaryOnly: true,
    writesPerformed: true,
    publishPerformed: false,
    schedulerStarted: false,
    stages: [
      { name: "profile_feedback", ok: true, status: "pass" },
      { name: "proposal_create", ok: true, status: "pass" },
      { name: "proposal_review", ok: true, status: "accepted" },
      { name: "digest_create", ok: true, status: "pending" }
    ],
    summary: {
      selectedCycleId: "cycle_ready_1",
      selectedTaskCardId: "ltask_previous",
      proposalId: "lgauto_ready_1",
      proposalStatus: "accepted",
      digestId: "lgadig_ready_1",
      digestStatus: "pending",
      publishPerformed: false,
      schedulerStarted: false,
      gatewayBoundary: "proposal_creation_may_call_planner_gateway_only"
    },
    selectedCycle: {
      cycleId: "cycle_ready_1",
      taskCardId: "ltask_previous"
    },
    proposal: {
      proposalId: "lgauto_ready_1",
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      status: "accepted"
    },
    digest: {
      digestId: "lgadig_ready_1",
      status: "pending"
    }
  }, "prepare", {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan"
  }, true);

  assert.equal(projected.automationCycleClosureStatus, "pending");
  assert.equal(projected.automationCycleClosureOk, true);
  assert.equal(projected.automationCycleClosureOperation, "prepare");
  assert.equal(projected.automationCycleClosureWriteOperation, true);
  assert.equal(projected.automationCycleClosureWriteAllowed, true);
  assert.equal(projected.automationCycleClosureWritesPerformed, true);
  assert.equal(projected.automationCycleClosurePublishPerformed, false);
  assert.equal(projected.automationCycleClosureSchedulerStarted, false);
  assert.equal(projected.automationCycleClosureWorkspaceId, "weixin_fanfan");
  assert.equal(projected.automationCycleClosureLearnerId, "fanfan");
  assert.equal(projected.automationCycleClosureProgramId, "program_science");
  assert.equal(projected.automationCycleClosureDomain, "science");
  assert.equal(projected.automationCycleClosureSubject, "science");
  assert.equal(projected.automationCycleClosureSelectedCycleId, "cycle_ready_1");
  assert.equal(projected.automationCycleClosureSelectedTaskCardId, "ltask_previous");
  assert.equal(projected.automationCycleClosureProposalId, "lgauto_ready_1");
  assert.equal(projected.automationCycleClosureProposalStatus, "accepted");
  assert.equal(projected.automationCycleClosureDigestId, "lgadig_ready_1");
  assert.equal(projected.automationCycleClosureDigestStatus, "pending");
  assert.deepEqual(projected.automationCycleClosureStageNames, [
    "profile_feedback",
    "proposal_create",
    "proposal_review",
    "digest_create"
  ]);
  assert.deepEqual(projected.automationCycleClosureFailedStageNames, []);
  assert.equal(projected.automationCycleClosureGatewayBoundary, "proposal_creation_may_call_planner_gateway_only");
});
