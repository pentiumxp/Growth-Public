const assert = require("node:assert/strict");
const test = require("node:test");

const { createLearningStageAssessmentService } = require("../src/services/learning-stage-assessment-service");
const { createLearningCardRubricPolicyService } = require("../src/services/learning-card-rubric-policy-service");

function fakeRepository(initialCycle = null) {
  const saved = [];
  let latest = initialCycle;
  return {
    saved,
    cycleById(cycleId) {
      return latest && latest.cycleId === cycleId ? latest : null;
    },
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
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "english",
    subject: "english",
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

test("stage assessment readiness is read-only and returns bounded eligibility state", () => {
  const repository = fakeRepository();
  const service = createLearningStageAssessmentService({
    repository,
    profileProjectionService: { profileContext: () => profile() },
    cardGenerationService: { generateCard: async () => ({ ok: true }) },
    now: () => new Date("2026-06-14T08:00:00.000Z")
  });

  const result = service.stageReadiness(baseInput());

  assert.equal(result.ok, true);
  assert.equal(result.eligible, true);
  assert.equal(result.activationState, "eligible");
  assert.equal(result.reason, "enough_recent_practice");
  assert.equal(result.cycle, null);
  assert.deepEqual(result.evidence.sourceCardIds, ["card_1", "card_2", "card_3", "card_4"]);
  assert.deepEqual(repository.saved, []);
  assert.equal(JSON.stringify(result).includes("rawAnswer"), false);
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
    rubricPolicyService: createLearningCardRubricPolicyService(),
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
  assert.equal(generationCalls[0].domainPackId, "uk_hk_curriculum_foundation");
  assert.equal(generationCalls[0].domain, "english");
  assert.equal(generationCalls[0].subject, "english");
  assert.equal(generationCalls[0].rubricPolicy.policyId, "rubric:stage_assessment_v1:english");
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

test("stage assessment completion closes the active cycle and sets cooldown", () => {
  const repository = fakeRepository({
    cycleId: "cycle_stage_1",
    workspaceId: "weixin_fanfan",
    learnerId: "weixin_fanfan",
    programId: "program_english",
    subjectId: "english",
    capabilityClusterId: "reading_main_idea",
    targetNodeIds: ["kg_main_idea", "kg_inference"],
    status: "active",
    activationReason: "owner_manual",
    activationSource: "owner_manual",
    eligibleAt: "2026-06-14T08:00:00.000Z",
    activatedAt: "2026-06-14T08:05:00.000Z",
    sourceCardIds: ["card_1", "card_2"],
    generatedTaskCardId: "stage_card_1"
  });
  const service = createLearningStageAssessmentService({
    repository,
    profileProjectionService: { profileContext: () => profile() },
    cardGenerationService: { generateCard: async () => ({ ok: true }) },
    now: () => new Date("2026-06-14T09:00:00.000Z")
  });

  const result = service.recordAssessmentCompletion({
    workspaceId: "weixin_fanfan",
    taskCard: {
      id: "stage_card_1",
      workspace_id: "weixin_fanfan",
      learner_id: "weixin_fanfan",
      program_id: "program_english",
      domain: "english",
      capability_cluster_id: "reading_main_idea",
      card_role: "stage_assessment",
      stage_assessment_cycle_id: "cycle_stage_1",
      skill_ids_json: JSON.stringify(["kg_main_idea", "kg_inference"]),
      raw_json: JSON.stringify({
        learningGraph: {
          targetNodeIds: ["kg_main_idea"],
          assessmentCoverageNodeIds: ["kg_main_idea", "kg_inference"]
        },
        completionPolicy: { mode: "formal_assessment" },
        stageAssessment: { cycleId: "cycle_stage_1" }
      })
    },
    evaluation: {
      evaluationId: "eval_stage_1",
      score: 88,
      evaluatedAt: "2026-06-14T09:00:00.000Z"
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.activationState, "cooldown");
  assert.equal(result.cycle.status, "completed");
  assert.equal(result.cycle.completedAt, "2026-06-14T09:00:00.000Z");
  assert.equal(result.cycle.cooldownUntil, "2026-06-19T09:00:00.000Z");
  assert.equal(result.cycle.generatedTaskCardId, "stage_card_1");
  assert.deepEqual(result.cycle.sourceCardIds, ["card_1", "card_2", "stage_card_1"]);
  assert.equal(repository.saved.at(-1).activationReason, "owner_manual");
  assert.equal(repository.saved.at(-1).activationSource, "owner_manual");
});
