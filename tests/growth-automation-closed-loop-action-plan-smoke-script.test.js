const assert = require("node:assert/strict");
const test = require("node:test");

const {
  inputFromArgs,
  operationFromArgs,
  projectAutomationClosedLoopActionPlanSmokeReadback,
  shouldAllowWrite,
  validateOperationInput
} = require("../scripts/smoke-growth-automation-closed-loop-action-plan");

test("closed-loop action plan smoke script parses no-write plan input", () => {
  const args = [
    "--operation", "action-plan",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--cycle-id", "cycle_ready_1",
    "--source-task-card-id", "ltask_previous",
    "--source-evaluation-id", "leval_previous",
    "--digest-id", "lgadig_ready_1",
    "--handoff-id", "lgahand_ready_1",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--target-node-id", "kg_science_next",
    "--source-target-node-ids", "kg_science_previous,kg_science_prereq",
    "--no-auto-select-latest-completed-cycle",
    "--requested-by", "weixin_owner"
  ];

  assert.equal(operationFromArgs(args), "plan");
  assert.equal(shouldAllowWrite(args), false);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    displayName: "",
    label: "",
    programId: "program_science",
    cycleId: "cycle_ready_1",
    sourcePlanDraftId: "",
    sourceTaskCardId: "ltask_previous",
    sourceEvaluationId: "leval_previous",
    profileDeltaId: "",
    evidenceId: "",
    correctionId: "",
    sourceId: "",
    digestId: "lgadig_ready_1",
    handoffId: "lgahand_ready_1",
    proposalId: "",
    selectedItemId: "",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    availableMinutes: 15,
    auditLimit: 20,
    limit: 8,
    targetNodeIds: ["kg_science_next"],
    sourceTargetNodeIds: ["kg_science_previous", "kg_science_prereq"],
    autoSelectCompletedCycle: false,
    autoSelectLatestCompletedCycle: false,
    requestedBy: "weixin_owner"
  });
  assert.deepEqual(validateOperationInput("plan", inputFromArgs(args), false), { ok: true });
});

test("closed-loop action plan smoke script rejects write flags", () => {
  const input = inputFromArgs(["--workspace-id", "weixin_fanfan"]);

  assert.deepEqual(validateOperationInput("plan", input, true), {
    ok: false,
    error: "automation_closed_loop_action_plan_smoke_write_not_supported",
    operation: "plan",
    exitCode: 2
  });
});

test("closed-loop action plan smoke script projects bounded operator readback", () => {
  const projected = projectAutomationClosedLoopActionPlanSmokeReadback({
    ok: true,
    status: "ready_for_review_advancement",
    schemaVersion: "growth.learningAutomationClosedLoopActionPlan.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    target: { workspaceId: "weixin_fanfan", learnerId: "fanfan" },
    scope: {
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan"
    },
    selectedCycle: { cycleId: "cycle_ready_1", taskCardId: "ltask_previous", readyForAutomation: true },
    nextAction: {
      key: "advance_review",
      status: "ready_for_review_advancement",
      routePath: "/api/v1/growth/automation/review-advancements/advance",
      method: "POST",
      writeRequired: true
    },
    phases: [
      { key: "operating_loop", ok: true, status: "ready_to_draft" },
      { key: "profile_feedback", ok: true, status: "pass" },
      { key: "automation_digest", ok: true, status: "pending" },
      { key: "failure_policy", ok: true, status: "missing_active_failure_policy" },
      { key: "action_handoff", ok: true, status: "missing" }
    ],
    automationReadiness: {
      completedCycleReady: true,
      digestPresent: true,
      failurePolicyReady: false,
      handoffPresent: false,
      handoffDelivered: false,
      dependencyBlockedCount: 0
    },
    summary: {
      nextAction: "advance_review",
      nextActionStatus: "ready_for_review_advancement",
      selectedCycleId: "cycle_ready_1",
      selectedTaskCardId: "ltask_previous",
      digestId: "lgadig_ready_1",
      digestStatus: "pending",
      policyStatus: "missing_active_failure_policy",
      dependencyBlockedCount: 0
    },
    writePerformed: false,
    writesPerformed: false,
    publishPerformed: false,
    schedulerStarted: false
  }, "plan", { workspaceId: "weixin_fanfan", learnerId: "fanfan" });

  assert.equal(projected.automationClosedLoopActionPlanStatus, "ready_for_review_advancement");
  assert.equal(projected.automationClosedLoopActionPlanOk, true);
  assert.equal(projected.automationClosedLoopActionPlanWriteOperation, false);
  assert.equal(projected.automationClosedLoopActionPlanWritesPerformed, false);
  assert.equal(projected.automationClosedLoopActionPlanPublishPerformed, false);
  assert.equal(projected.automationClosedLoopActionPlanSchedulerStarted, false);
  assert.equal(projected.automationClosedLoopActionPlanNextAction, "advance_review");
  assert.equal(projected.automationClosedLoopActionPlanNextRoutePath, "/api/v1/growth/automation/review-advancements/advance");
  assert.equal(projected.automationClosedLoopActionPlanNextWriteRequired, true);
  assert.equal(projected.automationClosedLoopActionPlanSelectedCycleId, "cycle_ready_1");
  assert.equal(projected.automationClosedLoopActionPlanDigestId, "lgadig_ready_1");
  assert.equal(projected.automationClosedLoopActionPlanCompletedCycleReady, true);
  assert.deepEqual(projected.automationClosedLoopActionPlanPhaseKeys, [
    "operating_loop",
    "profile_feedback",
    "automation_digest",
    "failure_policy",
    "action_handoff"
  ]);
  assert.deepEqual(projected.automationClosedLoopActionPlanBlockedPhaseKeys, []);
});
