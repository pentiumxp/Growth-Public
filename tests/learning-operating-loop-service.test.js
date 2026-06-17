const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningOperatingLoopService,
  scanPrivacy
} = require("../src/services/learning-operating-loop-service");

function loopState(overrides = {}) {
  return Object.assign({
    ok: true,
    source: "growth-learning-loop-state-service",
    schemaVersion: "growth.learningLoopState.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "ready_to_draft",
    target: {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "Fanfan"
    },
    scope: {
      programId: "program_science",
      domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      availableMinutes: 15,
      targetNodeIds: ["kg_science_fair_test"]
    },
    nextAction: {
      action: "draft_daily_plan",
      enabled: true,
      endpoint: "/api/v1/growth/daily-loop/draft",
      reason: "next_strategy:repair"
    },
    summary: {
      readyForDraft: true,
      readyForPublish: false,
      stageCheckpointReady: false,
      stageCheckpointActive: false,
      auditComplete: true,
      recommendationEvidenceReady: true
    }
  }, overrides);
}

function createService(options = {}) {
  const calls = [];
  const states = options.states || [loopState()];
  const service = createLearningOperatingLoopService({
    loopStateService: {
      state(input) {
        calls.push({ type: "state", input });
        return states[Math.min(calls.filter((call) => call.type === "state").length - 1, states.length - 1)];
      }
    },
    dailyLoopService: {
      async advance(input) {
        calls.push({ type: "advance", input });
        return {
          ok: true,
          source: "growth-learning-daily-loop-service",
          operation: "advance",
          stage: "published",
          gatewayMode: "fake",
          draftStep: {
            ok: true,
            operation: "draft",
            planDraftId: "lgplan_operating_1",
            selectedItemId: "plan_item_1"
          },
          publishStep: {
            ok: true,
            operation: "publish",
            planDraftId: "lgplan_operating_1",
            selectedItemId: "plan_item_1",
            taskCardId: "ltask_operating_1"
          },
          planDraft: {
            planDraftId: "lgplan_operating_1",
            selectedItemId: "plan_item_1",
            generatedTaskCardId: "ltask_operating_1"
          },
          generation: {
            authoringDraft: { rawPrompt: "must not leak" },
            published: { taskCardId: "ltask_operating_1", status: "published" }
          }
        };
      },
      async publish(input) {
        calls.push({ type: "publish", input });
        return {
          ok: true,
          source: "growth-learning-daily-loop-service",
          operation: "publish",
          stage: "published",
          planDraft: {
            planDraftId: input.planDraftId,
            selectedItemId: input.itemId,
            generatedTaskCardId: "ltask_publish_1"
          },
          generation: { published: { taskCardId: "ltask_publish_1" } }
        };
      }
    },
    stageAssessmentService: {
      async activateStageAssessment(input) {
        calls.push({ type: "activateStageAssessment", input });
        return {
          ok: true,
          source: "growth-learning-stage-assessment-service",
          activationState: "active",
          activationSource: "owner_manual",
          activationReason: input.activationReason,
          cycle: {
            cycleId: "stage_cycle_1",
            generatedTaskCardId: "ltask_stage_1"
          },
          generation: { authoringDraft: { rawPrompt: "must not leak" } },
          published: { taskCardId: "ltask_stage_1" }
        };
      }
    }
  });
  return { calls, service };
}

test("learning operating loop recommends the service-owned next action without writing", () => {
  const { calls, service } = createService();

  const result = service.recommend({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    rawAllowed: "ordinary public field"
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, "growth.learningOperatingLoop.v1");
  assert.equal(result.operation, "recommend");
  assert.equal(result.writePerformed, false);
  assert.equal(result.status, "ready_to_draft");
  assert.equal(result.nextAction.action, "draft_daily_plan");
  assert.equal(result.summary.readyForDraft, true);
  assert.deepEqual(calls.map((call) => call.type), ["state"]);
});

test("learning operating loop executes ready-to-draft through daily-loop advance and refreshes state", async () => {
  const afterState = loopState({
    status: "ready_to_draft",
    nextAction: { action: "draft_daily_plan", enabled: true },
    summary: { readyForDraft: true }
  });
  const { calls, service } = createService({ states: [loopState(), afterState] });

  const result = await service.runNext({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    action: "draft_daily_plan"
  });

  assert.equal(result.ok, true);
  assert.equal(result.operation, "run_next");
  assert.equal(result.executedAction, "draft_daily_plan");
  assert.equal(result.executionMode, "daily_loop_advance");
  assert.equal(result.writePerformed, true);
  assert.equal(result.actionResult.taskCardId, "ltask_operating_1");
  assert.equal(result.summary.planDraftId, "lgplan_operating_1");
  assert.equal(result.summary.taskCardId, "ltask_operating_1");
  assert.deepEqual(calls.map((call) => call.type), ["state", "advance", "state"]);
  assert.equal(calls[1].input.workspaceId, "weixin_fanfan");
  assert.equal(calls[1].input.programId, "program_science");
  assert.deepEqual(calls[1].input.targetNodeIds, ["kg_science_fair_test"]);
  assert.equal(calls[2].input.taskCardId, "ltask_operating_1");
  assert.equal(JSON.stringify(result).includes("rawPrompt"), false);
});

test("learning operating loop accepts generic run-next operation aliases", async () => {
  const { calls, service } = createService();

  const result = await service.runNext({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    operation: "run-next"
  });

  assert.equal(result.ok, true);
  assert.equal(result.executedAction, "draft_daily_plan");
  assert.equal(result.executionMode, "daily_loop_advance");
  assert.deepEqual(calls.map((call) => call.type), ["state", "advance", "state"]);
});

test("learning operating loop publishes a selected plan item when that is the current next action", async () => {
  const readyToPublish = loopState({
    status: "ready_to_publish",
    nextAction: {
      action: "publish_selected_plan_item",
      enabled: true,
      planDraftId: "lgplan_ready_1",
      itemId: "plan_item_ready_1"
    },
    summary: {
      readyForDraft: false,
      readyForPublish: true
    }
  });
  const { calls, service } = createService({ states: [readyToPublish, loopState()] });

  const result = await service.runNext({
    workspaceId: "weixin_fanfan",
    action: "publish_selected_plan_item"
  });

  assert.equal(result.ok, true);
  assert.equal(result.executedAction, "publish_selected_plan_item");
  assert.equal(result.executionMode, "daily_loop_publish");
  assert.equal(result.actionResult.planDraftId, "lgplan_ready_1");
  assert.equal(result.actionResult.taskCardId, "ltask_publish_1");
  assert.equal(calls[1].type, "publish");
  assert.equal(calls[1].input.planDraftId, "lgplan_ready_1");
  assert.equal(calls[1].input.itemId, "plan_item_ready_1");
});

test("learning operating loop requires explicit owner confirmation before stage activation", async () => {
  const readyStage = loopState({
    status: "stage_checkpoint_ready",
    nextAction: {
      action: "review_stage_assessment",
      enabled: true,
      endpoint: "/api/v1/growth/stage-assessments/activate"
    },
    summary: {
      readyForDraft: false,
      stageCheckpointReady: true
    }
  });
  const { calls: blockedCalls, service: blockedService } = createService({ states: [readyStage] });

  const blocked = await blockedService.runNext({
    workspaceId: "weixin_fanfan",
    action: "review_stage_assessment"
  });

  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, "stage_assessment_owner_confirmation_required");
  assert.equal(blocked.confirmationRequired, true);
  assert.equal(blocked.writePerformed, false);
  assert.deepEqual(blockedCalls.map((call) => call.type), ["state"]);

  const activeState = loopState({
    status: "stage_checkpoint_active",
    nextAction: {
      action: "complete_active_stage_assessment",
      enabled: true,
      requiredActor: "learner"
    },
    summary: {
      stageCheckpointActive: true
    }
  });
  const { calls, service } = createService({ states: [readyStage, activeState] });
  const activated = await service.runNext({
    workspaceId: "weixin_fanfan",
    action: "review_stage_assessment",
    allowStageActivation: true,
    assessmentCoverageNodeIds: ["kg_science_fair_test", "kg_science_variables"]
  });

  assert.equal(activated.ok, true);
  assert.equal(activated.executedAction, "review_stage_assessment");
  assert.equal(activated.executionMode, "stage_assessment_activate");
  assert.equal(activated.actionResult.cycleId, "stage_cycle_1");
  assert.equal(activated.actionResult.taskCardId, "ltask_stage_1");
  assert.equal(calls[1].type, "activateStageAssessment");
  assert.equal(calls[1].input.activationSource, "owner_manual");
  assert.equal(calls[1].input.activationReason, "owner_confirmed_checkpoint");
  assert.deepEqual(calls[1].input.assessmentCoverageNodeIds, ["kg_science_fair_test", "kg_science_variables"]);
  assert.equal(calls[2].type, "state");
  assert.equal(JSON.stringify(activated).includes("rawPrompt"), false);
});

test("learning operating loop fails closed for privacy input, disabled actions, and mismatched requests", async () => {
  assert.deepEqual(scanPrivacy({ nested: { rawPrompt: "bad" } }), ["$.nested.rawPrompt"]);

  const privacy = await createService().service.runNext({
    workspaceId: "weixin_fanfan",
    rawAnswer: "do not store"
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_operating_loop_privacy_failed");

  const disabled = await createService({
    states: [loopState({
      nextAction: { action: "draft_daily_plan", enabled: false }
    })]
  }).service.runNext({ workspaceId: "weixin_fanfan" });
  assert.equal(disabled.ok, false);
  assert.equal(disabled.error, "learning_operating_loop_next_action_disabled");

  const mismatch = await createService().service.runNext({
    workspaceId: "weixin_fanfan",
    action: "publish_selected_plan_item"
  });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.error, "learning_operating_loop_action_mismatch");
  assert.equal(mismatch.expectedAction, "draft_daily_plan");
});
