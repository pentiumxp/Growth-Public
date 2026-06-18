const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningAutomationReviewAdvancementService
} = require("../src/services/learning-automation-review-advancement-service");

function closureResult() {
  return {
    ok: true,
    status: "pending",
    summary: {
      selectedCycleId: "cycle_ready_1",
      selectedTaskCardId: "ltask_source_1",
      proposalId: "lgauto_ready_1",
      proposalStatus: "accepted",
      digestId: "lgadig_ready_1",
      digestStatus: "pending",
      publishPerformed: false,
      schedulerStarted: false
    },
    selectedCycle: {
      cycleId: "cycle_ready_1",
      taskCardId: "ltask_source_1"
    },
    proposal: {
      proposalId: "lgauto_ready_1",
      status: "accepted"
    },
    digest: {
      digestId: "lgadig_ready_1",
      status: "pending",
      requiredActions: [{
        candidateId: "lgauto_ready_1:lgplan_next_1:plan_item_next_1",
        proposalId: "lgauto_ready_1",
        planDraftId: "lgplan_next_1",
        selectedItemId: "plan_item_next_1",
        endpoint: "/api/v1/growth/automation/proposals/lgauto_ready_1/publish"
      }]
    },
    writesPerformed: true,
    publishPerformed: false,
    schedulerStarted: false
  };
}

function reviewedDigest() {
  return {
    ok: true,
    digest: {
      digestId: "lgadig_ready_1",
      status: "reviewed",
      requiredActions: [{
        candidateId: "lgauto_ready_1:lgplan_next_1:plan_item_next_1",
        proposalId: "lgauto_ready_1",
        planDraftId: "lgplan_next_1",
        selectedItemId: "plan_item_next_1",
        endpoint: "/api/v1/growth/automation/proposals/lgauto_ready_1/publish"
      }]
    }
  };
}

function activePolicy() {
  return {
    ok: true,
    status: "failure_policy_ready",
    readyForWritefulAutomationPrerequisite: true,
    writefulSchedulingAllowed: false,
    summary: { policyId: "lgafpol_active_1" },
    policy: {
      policyId: "lgafpol_active_1",
      status: "active"
    }
  };
}

function handoffResult(deliveryStatus = "not_delivered") {
  return {
    ok: true,
    handoff: {
      handoffId: "lgahand_ready_1",
      digestId: "lgadig_ready_1",
      status: deliveryStatus === "delivered" ? "delivered" : "pending_delivery",
      deliveryStatus,
      actions: [{
        proposalId: "lgauto_ready_1",
        planDraftId: "lgplan_next_1",
        selectedItemId: "plan_item_next_1"
      }]
    }
  };
}

function createHarness(options = {}) {
  const calls = [];
  const service = createLearningAutomationReviewAdvancementService({
    cycleClosureService: {
      async prepareReviewPacket(input) {
        calls.push({ type: "cycleClosure", input });
        return options.cycleClosureFails ? { ok: false, error: "cycle_missing" } : closureResult();
      }
    },
    digestService: {
      reviewDigest(input) {
        calls.push({ type: "reviewDigest", input });
        if (options.digestReviewFails) return { ok: false, error: "digest_not_found" };
        return reviewedDigest();
      }
    },
    failurePolicyService: {
      evaluateReadiness(input) {
        calls.push({ type: "policyReadiness", input });
        if (options.policyAlreadyActive) return activePolicy();
        return {
          ok: true,
          status: "missing_active_failure_policy",
          readyForWritefulAutomationPrerequisite: false,
          writefulSchedulingAllowed: false,
          missingRequired: ["active_failure_policy"]
        };
      },
      createPolicy(input) {
        calls.push({ type: "createPolicy", input });
        return {
          ok: true,
          policy: {
            policyId: "lgafpol_created_1",
            status: "draft"
          }
        };
      },
      reviewPolicy(input) {
        calls.push({ type: "reviewPolicy", input });
        return {
          ok: true,
          policy: {
            policyId: input.policyId,
            status: input.status
          },
          readiness: {
            ok: true,
            status: "failure_policy_ready",
            readyForWritefulAutomationPrerequisite: true,
            writefulSchedulingAllowed: false,
            summary: { policyId: input.policyId },
            policy: {
              policyId: input.policyId,
              status: input.status
            }
          }
        };
      }
    },
    actionHandoffService: {
      createHandoff(input) {
        calls.push({ type: "createHandoff", input });
        if (options.handoffFails) return { ok: false, error: "learning_automation_action_handoff_no_action" };
        return handoffResult();
      },
      async deliverHandoff(input) {
        calls.push({ type: "deliverHandoff", input });
        return {
          ok: true,
          deliveryStatus: "delivered",
          handoff: handoffResult("delivered").handoff
        };
      }
    },
    schedulerExecutionService: {
      async executeOnce(input) {
        calls.push({ type: "executeOnce", input });
        return {
          ok: false,
          error: "learning_automation_scheduler_execution_disabled",
          execution: {
            executionId: "lgasexec_blocked_1",
            status: "blocked",
            reason: "learning_automation_scheduler_execution_disabled"
          }
        };
      }
    }
  });
  return { calls, service };
}

function advancementInput(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    requestedBy: "owner"
  }, overrides);
}

test("review advancement prepares review packet, reviews digest, activates policy, and creates handoff", async () => {
  const { calls, service } = createHarness();

  const result = await service.advance(advancementInput());

  assert.equal(result.ok, true);
  assert.equal(result.status, "not_delivered");
  assert.equal(result.summary.proposalId, "lgauto_ready_1");
  assert.equal(result.summary.digestStatus, "reviewed");
  assert.equal(result.summary.policyStatus, "active");
  assert.equal(result.summary.handoffId, "lgahand_ready_1");
  assert.equal(result.summary.publishPerformed, false);
  assert.equal(result.summary.schedulerStarted, false);
  assert.deepEqual(calls.map((call) => call.type), [
    "cycleClosure",
    "reviewDigest",
    "policyReadiness",
    "createPolicy",
    "reviewPolicy",
    "createHandoff"
  ]);
  assert.equal(calls[0].input.createDigest, true);
  assert.equal(calls[0].input.reviewDigest, false);
  assert.equal(calls[1].input.digestId, "lgadig_ready_1");
  assert.equal(calls[4].input.status, "active");
  assert.equal(calls[5].input.digestId, "lgadig_ready_1");
});

test("review advancement reuses an active failure policy without creating a duplicate", async () => {
  const { calls, service } = createHarness({ policyAlreadyActive: true });

  const result = await service.advance(advancementInput());

  assert.equal(result.ok, true);
  assert.equal(result.summary.policyId, "lgafpol_active_1");
  assert.deepEqual(calls.map((call) => call.type), [
    "cycleClosure",
    "reviewDigest",
    "policyReadiness",
    "createHandoff"
  ]);
});

test("review advancement can deliver handoff and records default-disabled execution as expected blocked readback", async () => {
  const { calls, service } = createHarness({ policyAlreadyActive: true });

  const result = await service.advance(advancementInput({
    deliverHandoff: true,
    attemptExecution: true
  }));

  assert.equal(result.ok, true);
  assert.equal(result.status, "execution_blocked");
  assert.equal(result.summary.handoffDeliveryStatus, "delivered");
  assert.equal(result.summary.executionStatus, "blocked");
  assert.equal(result.summary.executionId, "lgasexec_blocked_1");
  assert.equal(result.summary.publishPerformed, false);
  assert.deepEqual(calls.map((call) => call.type), [
    "cycleClosure",
    "reviewDigest",
    "policyReadiness",
    "createHandoff",
    "deliverHandoff",
    "executeOnce"
  ]);
  assert.equal(calls[5].input.handoffId, "lgahand_ready_1");
  assert.equal(calls[5].input.proposalId, "lgauto_ready_1");
});

test("review advancement fails visibly for missing digest and privacy-risk input", async () => {
  const noDigest = await createHarness().service.advance(advancementInput({
    prepareReviewPacket: false
  }));
  assert.equal(noDigest.ok, false);
  assert.equal(noDigest.error, "learning_automation_review_advancement_digest_id_required");

  const privacy = await createHarness().service.advance(advancementInput({
    rawPrompt: "do not persist"
  }));
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_automation_review_advancement_privacy_failed");
});
