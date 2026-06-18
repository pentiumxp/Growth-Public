const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningAutomationCycleClosureService
} = require("../src/services/learning-automation-cycle-closure-service");

function selectedFeedback() {
  return {
    ok: true,
    source: "growth-learning-profile-feedback-evidence-service",
    selectedCompletedCycle: {
      cycleId: "cycle_ready_1",
      planDraftId: "lgplan_source_1",
      taskCardId: "ltask_source_1",
      evaluationId: "eval_source_1",
      profileDeltaId: "lgpdelta_source_1",
      evidenceId: "lgevd_source_1",
      sourceId: "eval_source_1",
      targetNodeIds: ["kg_science_observation"],
      readyForAutomation: true,
      complete: true
    },
    summary: {
      readyForNextPlan: true,
      missingRequired: []
    }
  };
}

function proposalResult(status = "proposed") {
  return {
    ok: true,
    proposal: {
      proposalId: "lgauto_ready_1",
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      status,
      planDraftId: "lgplan_next_1",
      selectedItemId: "plan_item_next_1",
      targetNodeIds: ["kg_science_observation"]
    },
    planDraft: {
      planDraftId: "lgplan_next_1"
    },
    selectedItem: {
      itemId: "plan_item_next_1"
    }
  };
}

function digestResult(status = "pending") {
  return {
    ok: true,
    digest: {
      digestId: "lgadig_ready_1",
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      status,
      requiredActions: [{
        proposalId: "lgauto_ready_1",
        endpoint: "/api/v1/growth/automation/proposals/lgauto_ready_1/publish"
      }]
    }
  };
}

function createHarness(options = {}) {
  const calls = [];
  const service = createLearningAutomationCycleClosureService({
    profileFeedbackService: {
      evaluate(input) {
        calls.push({ type: "profileFeedback", input });
        return options.noCompletedCycle
          ? { ok: false, error: "profile_feedback_cycle_selector_required", summary: { selectorCandidateCount: 0 } }
          : selectedFeedback();
      }
    },
    proposalService: {
      async createProposal(input) {
        calls.push({ type: "createProposal", input });
        if (options.proposalFails) return { ok: false, error: "learning_automation_cycle_not_ready" };
        return proposalResult();
      },
      reviewProposal(input) {
        calls.push({ type: "reviewProposal", input });
        return {
          ok: true,
          proposal: proposalResult(input.status).proposal
        };
      }
    },
    digestService: {
      createDigest(input) {
        calls.push({ type: "createDigest", input });
        if (options.digestFails) return { ok: false, error: "learning_automation_digest_dry_run_failed" };
        return digestResult();
      },
      reviewDigest(input) {
        calls.push({ type: "reviewDigest", input });
        return digestResult(input.status);
      }
    },
    actionHandoffService: {
      createHandoff(input) {
        calls.push({ type: "createHandoff", input });
        if (options.handoffPolicyBlocked) {
          return {
            ok: false,
            error: "learning_automation_action_handoff_policy_not_ready",
            readiness: { status: "missing_active_failure_policy" }
          };
        }
        return {
          ok: true,
          handoff: {
            handoffId: "lgahand_ready_1",
            digestId: input.digestId,
            deliveryStatus: "not_delivered"
          }
        };
      },
      async deliverHandoff(input) {
        calls.push({ type: "deliverHandoff", input });
        return {
          ok: true,
          deliveryStatus: "delivered",
          handoff: {
            handoffId: input.handoffId,
            deliveryStatus: "delivered"
          }
        };
      }
    }
  });
  return { calls, service };
}

function closureInput(overrides = {}) {
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

test("cycle closure prepares proposal and pending digest from latest completed cycle", async () => {
  const { calls, service } = createHarness();

  const result = await service.prepareReviewPacket(closureInput());

  assert.equal(result.ok, true);
  assert.equal(result.status, "pending");
  assert.equal(result.summary.selectedCycleId, "cycle_ready_1");
  assert.equal(result.summary.proposalStatus, "accepted");
  assert.equal(result.summary.digestStatus, "pending");
  assert.equal(result.summary.publishPerformed, false);
  assert.equal(result.summary.schedulerStarted, false);
  assert.deepEqual(calls.map((call) => call.type), [
    "profileFeedback",
    "createProposal",
    "reviewProposal",
    "createDigest"
  ]);
  assert.equal(calls[0].input.autoSelectLatestCompletedCycle, true);
  assert.equal(calls[1].input.sourceTaskCardId, "ltask_source_1");
  assert.equal(calls[2].input.status, "accepted");
  assert.equal(calls[3].input.proposalId, "lgauto_ready_1");
});

test("cycle closure can explicitly review digest, create handoff, and deliver without publishing", async () => {
  const { calls, service } = createHarness();

  const result = await service.prepareReviewPacket(closureInput({
    reviewDigest: true,
    createHandoff: true,
    deliverHandoff: true
  }));

  assert.equal(result.ok, true);
  assert.equal(result.status, "delivered");
  assert.equal(result.summary.digestStatus, "reviewed");
  assert.equal(result.summary.handoffDeliveryStatus, "delivered");
  assert.equal(result.summary.publishPerformed, false);
  assert.equal(result.summary.schedulerStarted, false);
  assert.deepEqual(calls.map((call) => call.type), [
    "profileFeedback",
    "createProposal",
    "reviewProposal",
    "createDigest",
    "reviewDigest",
    "createHandoff",
    "deliverHandoff"
  ]);
});

test("cycle closure stops visibly when completed cycle or proposal gate is missing", async () => {
  const noCycle = await createHarness({ noCompletedCycle: true }).service.prepareReviewPacket(closureInput());
  assert.equal(noCycle.ok, false);
  assert.equal(noCycle.error, "profile_feedback_cycle_selector_required");

  const proposalBlocked = await createHarness({ proposalFails: true }).service.prepareReviewPacket(closureInput());
  assert.equal(proposalBlocked.ok, false);
  assert.equal(proposalBlocked.error, "learning_automation_cycle_not_ready");
  assert.deepEqual(proposalBlocked.stages.map((stage) => stage.name), ["profile_feedback", "proposal_create"]);
});

test("cycle closure keeps handoff policy failures visible and rejects privacy-risk input", async () => {
  const blocked = await createHarness({ handoffPolicyBlocked: true }).service.prepareReviewPacket(closureInput({
    reviewDigest: true,
    createHandoff: true
  }));
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, "learning_automation_action_handoff_policy_not_ready");
  assert.equal(blocked.summary.digestStatus || "", "");

  const privacy = await createHarness().service.prepareReviewPacket(closureInput({
    rawPrompt: "do not persist"
  }));
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_automation_cycle_closure_privacy_failed");
});
