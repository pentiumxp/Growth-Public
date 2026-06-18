const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningAutomationClosedLoopActionPlanService
} = require("../src/services/learning-automation-closed-loop-action-plan-service");

function baseInput(extra = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    displayName: "凡凡",
    label: "凡凡",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    availableMinutes: 15,
    targetNodeIds: ["kg_science_next"],
    requestedBy: "weixin_owner"
  }, extra);
}

function readyCycleFeedback() {
  return {
    ok: true,
    status: "pass",
    complete: true,
    readyForAutomation: true,
    readyForNextPlan: true,
    selectedCompletedCycle: {
      cycleId: "cycle_ready_1",
      planDraftId: "lgplan_previous",
      taskCardId: "ltask_previous",
      evaluationId: "leval_previous",
      profileDeltaId: "lgpdelta_previous",
      evidenceId: "lgevd_previous",
      targetNodeIds: ["kg_science_previous"],
      complete: true,
      readyForAutomation: true
    },
    summary: {
      selectedCycleId: "cycle_ready_1",
      selectedTaskCardId: "ltask_previous",
      missingRequired: [],
      nextAction: "draft_daily_plan"
    },
    checks: [{ key: "cycle_audit_complete", status: "pass" }]
  };
}

function createService(overrides = {}) {
  return createLearningAutomationClosedLoopActionPlanService(Object.assign({
    operatingLoopService: {
      recommend() {
        return {
          ok: true,
          status: "ready_to_draft",
          nextAction: { action: "draft_daily_plan", enabled: true },
          summary: { nextAction: "draft_daily_plan", nextActionEnabled: true }
        };
      }
    },
    profileFeedbackService: {
      evaluate() {
        return readyCycleFeedback();
      }
    },
    digestService: {
      listDigests() {
        return { ok: true, count: 0, digests: [] };
      }
    },
    failurePolicyService: {
      evaluateReadiness() {
        return {
          ok: true,
          status: "missing_active_failure_policy",
          readyForWritefulAutomationPrerequisite: false,
          summary: { policyId: "", writefulSchedulingAllowed: false }
        };
      }
    },
    actionHandoffService: {
      listHandoffs() {
        return { ok: true, count: 0, handoffs: [] };
      }
    }
  }, overrides));
}

test("closed-loop action plan returns learning-loop action when no completed cycle exists", () => {
  const service = createService({
    profileFeedbackService: {
      evaluate() {
        return {
          ok: false,
          status: "missing",
          error: "profile_feedback_cycle_selector_required",
          summary: {
            missingRequired: ["cycle_selector_present"],
            nextAction: "produce_completed_daily_cycle",
            selectorCandidateCount: 0
          },
          selectorDiscovery: { candidateCount: 0 }
        };
      }
    }
  });

  const result = service.actionPlan(baseInput());

  assert.equal(result.ok, true);
  assert.equal(result.writePerformed, false);
  assert.equal(result.publishPerformed, false);
  assert.equal(result.schedulerStarted, false);
  assert.equal(result.status, "ready_for_next_learning_action");
  assert.equal(result.nextAction.key, "run_learning_loop_next");
  assert.equal(result.nextAction.routePath, "/api/v1/growth/learning-loop/advance");
  assert.equal(result.nextAction.body.action, "draft_daily_plan");
  assert.equal(result.automationReadiness.completedCycleReady, false);
});

test("closed-loop action plan prepares cycle closure when completed cycle has no digest", () => {
  const result = createService().actionPlan(baseInput());

  assert.equal(result.status, "ready_for_cycle_closure");
  assert.equal(result.nextAction.key, "prepare_cycle_closure");
  assert.equal(result.nextAction.routePath, "/api/v1/growth/automation/cycle-closures/prepare");
  assert.equal(result.nextAction.body.source_task_card_id, "ltask_previous");
  assert.equal(result.nextAction.body.accept_proposal, true);
  assert.equal(result.nextAction.body.create_digest, true);
  assert.equal(result.nextAction.body.review_digest, false);
  assert.equal(result.summary.selectedCycleId, "cycle_ready_1");
  assert.equal(result.automationReadiness.digestPresent, false);
  assert.equal(result.phases.find((phase) => phase.key === "automation_digest").status, "missing");
  assert.equal(result.phases.find((phase) => phase.key === "action_handoff").status, "missing");
});

test("closed-loop action plan advances review when digest exists but handoff is missing", () => {
  const result = createService({
    digestService: {
      listDigests() {
        return {
          ok: true,
          count: 1,
          digests: [{
            digestId: "lgadig_ready_1",
            status: "pending",
            proposalId: "lgauto_ready_1",
            summary: { requiredActions: 1, wouldPublish: 1, blocked: 0 }
          }]
        };
      }
    }
  }).actionPlan(baseInput());

  assert.equal(result.status, "ready_for_review_advancement");
  assert.equal(result.nextAction.key, "advance_review");
  assert.equal(result.nextAction.routePath, "/api/v1/growth/automation/review-advancements/advance");
  assert.equal(result.nextAction.body.digest_id, "lgadig_ready_1");
  assert.equal(result.nextAction.body.review_digest, true);
  assert.equal(result.nextAction.body.ensure_failure_policy, true);
  assert.equal(result.nextAction.body.create_handoff, true);
  assert.equal(result.nextAction.body.attempt_execution, false);
  assert.equal(result.automationReadiness.digestPresent, true);
});

test("closed-loop action plan delivers handoff before platform evidence", () => {
  const result = createService({
    digestService: {
      listDigests() {
        return {
          ok: true,
          count: 1,
          digests: [{
            digestId: "lgadig_ready_1",
            status: "reviewed",
            proposalId: "lgauto_ready_1"
          }]
        };
      }
    },
    failurePolicyService: {
      evaluateReadiness() {
        return {
          ok: true,
          status: "active",
          readyForWritefulAutomationPrerequisite: true,
          summary: { policyId: "lgafpol_ready_1", writefulSchedulingAllowed: false }
        };
      }
    },
    actionHandoffService: {
      listHandoffs() {
        return {
          ok: true,
          count: 1,
          handoffs: [{
            handoffId: "lgahand_ready_1",
            digestId: "lgadig_ready_1",
            status: "pending_delivery",
            deliveryStatus: "not_delivered",
            actionSummary: { requiredActions: 1, blocked: 0 }
          }]
        };
      }
    }
  }).actionPlan(baseInput());

  assert.equal(result.status, "ready_for_action_handoff_delivery");
  assert.equal(result.nextAction.key, "deliver_action_handoff");
  assert.equal(result.nextAction.routePath, "/api/v1/growth/automation/action-handoffs/lgahand_ready_1/deliver");
  assert.equal(result.nextAction.body.handoff_id, "lgahand_ready_1");
  assert.equal(result.automationReadiness.handoffPresent, true);
  assert.equal(result.automationReadiness.handoffDelivered, false);
});

test("closed-loop action plan rejects privacy-risk input", () => {
  const result = createService().actionPlan(baseInput({ accessToken: "do-not-store" }));

  assert.equal(result.ok, false);
  assert.equal(result.error, "closed_loop_action_plan_privacy_failed");
  assert.deepEqual(result.privacyFindings, ["$.accessToken"]);
  assert.equal(result.writePerformed, false);
});
