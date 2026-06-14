const assert = require("node:assert/strict");
const test = require("node:test");

const { createLearningStageAssessmentService } = require("../src/services/learning-stage-assessment-service");

function fakeRepository(initialCycle = null) {
  const saved = [];
  let latest = initialCycle;
  return {
    saved,
    cycleIdFor: () => "cycle_stage_1",
    latestCycle() {
      return latest;
    },
    saveCycle(input) {
      const cycle = {
        cycleId: input.cycleId || "cycle_stage_1",
        workspaceId: input.workspaceId,
        learnerId: input.learnerId,
        programId: input.programId,
        subjectId: input.subjectId,
        capabilityClusterId: input.capabilityClusterId,
        targetNodeIds: input.assessmentCoverageNodeIds || input.targetNodeIds || [],
        status: input.status,
        activationReason: input.activationReason,
        activationSource: input.activationSource,
        eligibleAt: input.eligibleAt || "",
        activatedAt: input.activatedAt || "",
        completedAt: input.completedAt || "",
        cooldownUntil: input.cooldownUntil || "",
        sourceCardIds: input.sourceCardIds || [],
        generatedTaskCardId: input.generatedTaskCardId || "",
        updatedAt: input.updatedAt
      };
      saved.push(input);
      latest = cycle;
      return { ok: true, cycle };
    }
  };
}

function profile(overrides = {}) {
  return Object.assign({
    ok: true,
    summary: { recentTrajectoryCount: 4, recentExperienceSignalCount: 1 },
    recentTrajectory: [
      { taskCardId: "card_1" },
      { taskCardId: "card_2" },
      { taskCardId: "card_3" },
      { taskCardId: "card_4" }
    ],
    recentExperienceSignals: [{ signalType: "right_level" }]
  }, overrides);
}

function baseInput(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "weixin_fanfan",
    programId: "program_english",
    subjectId: "english",
    capabilityClusterId: "reading_main_idea",
    targetNodeId: "kg_main_idea",
    assessmentCoverageNodeIds: ["kg_main_idea", "kg_inference"]
  }, overrides);
}

test("stage assessment eligibility marks a cycle eligible after enough recent ordinary practice", () => {
  const repository = fakeRepository();
  const service = createLearningStageAssessmentService({
    repository,
    profileProjectionService: { profileContext: () => profile() },
    cardGenerationService: { generateCard: async () => ({ ok: true }) },
    now: () => new Date("2026-06-14T08:00:00.000Z")
  });

  const result = service.evaluateEligibility(baseInput());

  assert.equal(result.ok, true);
  assert.equal(result.eligible, true);
  assert.equal(result.reason, "enough_recent_practice");
  assert.equal(result.cycle.status, "eligible");
  assert.equal(result.cycle.eligibleAt, "2026-06-14T08:00:00.000Z");
  assert.deepEqual(result.evidence.sourceCardIds, ["card_1", "card_2", "card_3", "card_4"]);
  assert.equal(repository.saved[0].activationSource, "system");
});

test("stage assessment eligibility stays dormant when recent pressure signals are present", () => {
  const repository = fakeRepository();
  const service = createLearningStageAssessmentService({
    repository,
    profileProjectionService: {
      profileContext: () => profile({
        recentExperienceSignals: [{ signalType: "too_hard" }]
      })
    },
    cardGenerationService: { generateCard: async () => ({ ok: true }) },
    now: () => new Date("2026-06-14T08:00:00.000Z")
  });

  const result = service.evaluateEligibility(baseInput());

  assert.equal(result.ok, true);
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "recent_high_pressure_signal");
  assert.equal(result.cycle.status, "dormant");
  assert.equal(repository.saved[0].activationReason, "recent_high_pressure_signal");
});

test("owner manual activation bypasses cooldown and generates a stage assessment card with cycle metadata", async () => {
  const repository = fakeRepository({
    cycleId: "cycle_stage_1",
    status: "cooldown",
    cooldownUntil: "2026-06-20T00:00:00.000Z",
    sourceCardIds: ["card_old"]
  });
  const generationCalls = [];
  const service = createLearningStageAssessmentService({
    repository,
    profileProjectionService: { profileContext: () => profile() },
    cardGenerationService: {
      async generateCard(input) {
        generationCalls.push(input);
        return { ok: true, published: { taskCardId: "stage_card_1" } };
      }
    },
    now: () => new Date("2026-06-14T08:00:00.000Z")
  });

  const result = await service.activateStageAssessment(baseInput({
    activationSource: "owner_manual",
    difficultyBand: "assessment"
  }));

  assert.equal(result.ok, true);
  assert.equal(result.cooldownOverridden, true);
  assert.equal(result.cycle.status, "active");
  assert.equal(result.cycle.generatedTaskCardId, "stage_card_1");
  assert.equal(generationCalls[0].cardRole, "stage_assessment");
  assert.equal(generationCalls[0].stageAssessmentCycleId, "cycle_stage_1");
  assert.equal(generationCalls[0].activationState, "active");
  assert.equal(generationCalls[0].activationReason, "owner_manual");
  assert.equal(generationCalls[0].activationSource, "owner_manual");
  assert.deepEqual(generationCalls[0].assessmentCoverageNodeIds, ["kg_main_idea", "kg_inference"]);
});

test("executor challenge activation respects hard cooldown and does not generate a card", async () => {
  const repository = fakeRepository({
    cycleId: "cycle_stage_1",
    status: "cooldown",
    cooldownUntil: "2026-06-20T00:00:00.000Z"
  });
  const generationCalls = [];
  const service = createLearningStageAssessmentService({
    repository,
    profileProjectionService: { profileContext: () => profile() },
    cardGenerationService: {
      async generateCard(input) {
        generationCalls.push(input);
        return { ok: true, published: { taskCardId: "stage_card_1" } };
      }
    },
    now: () => new Date("2026-06-14T08:00:00.000Z")
  });

  const result = await service.activateStageAssessment(baseInput({
    activationSource: "executor_challenge"
  }));

  assert.equal(result.ok, false);
  assert.equal(result.error, "stage_assessment_cooldown_active");
  assert.equal(result.activationState, "cooldown");
  assert.equal(generationCalls.length, 0);
});
