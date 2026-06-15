const assert = require("node:assert/strict");
const test = require("node:test");

const { createGrowthGatewayPlannerClient } = require("../src/services/growth-gateway-planner-client");
const { createLearningPlanOrchestratorService } = require("../src/services/learning-plan-orchestrator-service");
const { createLearningPlanValidationService } = require("../src/services/learning-plan-validation-service");

function context() {
  return {
    ok: true,
    schemaVersion: "growth.learningPlanner.input.v1",
    target: {
      workspaceId: "weixin_stephen",
      learnerId: "weixin_stephen",
      displayName: "Fanfan"
    },
    horizon: "daily_plan",
    constraints: {
      availableMinutes: 15,
      lowPressure: true,
      allowedCardRoles: ["teaching", "practice", "repair", "stretch"],
      completionPolicy: "daily_score_once"
    },
    knowledgeGraph: {
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      candidateNodes: [{
        nodeId: "kg_science_fair_test",
        title: "Fair test reasoning",
        evidenceRequired: ["explain_controlled_variable"]
      }]
    },
    profileSummary: {
      weaknesses: [{ nodeId: "kg_science_fair_test", summary: "Needs clearer measured result." }]
    },
    recentEvidence: [{
      evidenceId: "lgevd_science_1",
      sourceType: "daily_evaluation",
      graphNodeIds: ["kg_science_fair_test"],
      scoreBand: "low",
      status: "needs_repair",
      summary: "Needs clearer measured result."
    }]
  };
}

function validPlan() {
  return {
    schemaVersion: "growth.learningPlanDraft.v1",
    horizon: "daily_plan",
    planSummary: "Repair fair-test reasoning with one guided science card.",
    items: [{
      itemId: "plan_item_science_1",
      cardRole: "teaching",
      subject: "science",
      targetNodeIds: ["kg_science_fair_test"],
      estimatedMinutes: 12,
      difficultyBand: "foundation",
      supportLevel: "guided",
      evidenceRequirements: ["explain_controlled_variable"],
      reason: "Recent evidence shows the learner needs a clearer measured-result explanation.",
      pressurePolicy: {
        completionPolicy: "daily_score_once",
        passScoreRequired: false
      }
    }],
    audit: {
      basisEvidenceIds: ["lgevd_science_1"],
      profileSnapshotId: "profile_snapshot_test"
    }
  };
}

function contextForHorizon(horizon, overrides = {}) {
  const base = context();
  return Object.assign({}, base, {
    horizon,
    constraints: Object.assign({}, base.constraints, overrides.constraints || {}),
    knowledgeGraph: Object.assign({}, base.knowledgeGraph, overrides.knowledgeGraph || {})
  });
}

function weeklyPlan(overrides = {}) {
  return Object.assign({
    schemaVersion: "growth.learningPlanDraft.v1",
    horizon: "weekly_plan",
    planSummary: "Use two short science cards this week without backlog debt.",
    items: [{
      itemId: "plan_item_week_1",
      cardRole: "teaching",
      subject: "science",
      targetNodeIds: ["kg_science_fair_test"],
      estimatedMinutes: 12,
      difficultyBand: "foundation",
      supportLevel: "guided",
      evidenceRequirements: ["explain_controlled_variable"],
      reason: "Start with one guided repair card.",
      pressurePolicy: {
        completionPolicy: "daily_score_once",
        passScoreRequired: false
      }
    }, {
      itemId: "plan_item_week_2",
      cardRole: "stretch",
      subject: "science",
      targetNodeIds: ["kg_science_fair_test"],
      estimatedMinutes: 15,
      difficultyBand: "foundation",
      supportLevel: "guided",
      evidenceRequirements: ["compare_variables"],
      reason: "Add one transfer card after the repair.",
      pressurePolicy: {
        completionPolicy: "daily_score_once",
        passScoreRequired: false
      }
    }],
    audit: {
      basisEvidenceIds: ["lgevd_science_1"],
      profileSnapshotId: "profile_snapshot_week"
    }
  }, overrides);
}

function stageCheckpointPlan(overrides = {}) {
  return Object.assign({
    schemaVersion: "growth.learningPlanDraft.v1",
    horizon: "stage_checkpoint_plan",
    planSummary: "Suggest a formal science checkpoint after enough evidence.",
    items: [{
      itemId: "plan_item_stage_1",
      cardRole: "stage_assessment",
      subject: "science",
      targetNodeIds: ["kg_science_fair_test"],
      assessmentCoverageNodeIds: ["kg_science_fair_test"],
      estimatedMinutes: 28,
      difficultyBand: "foundation",
      supportLevel: "independent",
      evidenceRequirements: ["explain_controlled_variable"],
      reason: "Evidence is ready for a checkpoint suggestion.",
      pressurePolicy: {
        completionPolicy: "formal_assessment",
        passScoreRequired: false
      },
      activationPolicy: {
        activateThrough: "learning-stage-assessment-service",
        reason: "Formal cards must be activated by stage assessment policy."
      }
    }],
    audit: {
      basisEvidenceIds: ["lgevd_science_1"],
      profileSnapshotId: "profile_snapshot_stage"
    }
  }, overrides);
}

test("learning plan orchestrator accepts valid fake Gateway JSON plan", async () => {
  const gatewayCalls = [];
  const service = createLearningPlanOrchestratorService({
    plannerContextService: { plannerContext: () => context() },
    validationService: createLearningPlanValidationService(),
    gatewayClient: createGrowthGatewayPlannerClient({
      transport(payload) {
        gatewayCalls.push(payload);
        return { json: { output_text: JSON.stringify(validPlan()) } };
      }
    })
  });

  const result = await service.draftPlan({ workspaceId: "weixin_stephen" });

  assert.equal(result.ok, true);
  assert.equal(result.draft.schemaVersion, "growth.learningPlanDraft.v1");
  assert.equal(result.draft.items[0].targetNodeIds[0], "kg_science_fair_test");
  assert.equal(result.draft.items[0].pressurePolicy.passScoreRequired, false);
  assert.equal(gatewayCalls[0].kind, "growth.learning_planner.draft");
  assert.equal(JSON.stringify(gatewayCalls[0]).includes("rawAnswer"), false);
});

test("learning plan orchestrator readiness smoke returns bounded no-write status", async () => {
  const service = createLearningPlanOrchestratorService({
    plannerContextService: { plannerContext: () => context() },
    validationService: createLearningPlanValidationService(),
    gatewayClient: createGrowthGatewayPlannerClient({
      transport() {
        return { json: { output_text: JSON.stringify(validPlan()) } };
      }
    })
  });

  const result = await service.smokePlannerReadiness({ workspaceId: "weixin_stephen" });

  assert.equal(result.ok, true);
  assert.equal(result.gatewayMode, "json");
  assert.equal(result.context.schemaVersion, "growth.learningPlanner.input.v1");
  assert.equal(result.context.domainPackId, "uk_hk_curriculum_foundation");
  assert.equal(result.context.candidateNodeCount, 1);
  assert.equal(result.context.recentEvidenceCount, 1);
  assert.equal(result.context.privacyClass, "summary_only");
  assert.equal(result.draftSummary.schemaVersion, "growth.learningPlanDraft.v1");
  assert.equal(result.draftSummary.itemCount, 1);
  assert.deepEqual(result.draftSummary.targetNodeIds, ["kg_science_fair_test"]);
  assert.equal(JSON.stringify(result).includes("Repair fair-test reasoning"), false);
  assert.equal(JSON.stringify(result).includes("Recent evidence shows"), false);
});

test("learning plan orchestrator accepts valid fake Gateway streaming plan", async () => {
  const service = createLearningPlanOrchestratorService({
    plannerContextService: { plannerContext: () => context() },
    validationService: createLearningPlanValidationService(),
    gatewayClient: createGrowthGatewayPlannerClient({
      transport() {
        return [
          `data: ${JSON.stringify({ output_text: JSON.stringify(validPlan()) })}`,
          "data: [DONE]"
        ].join("\n\n");
      }
    })
  });

  const result = await service.draftPlan({ workspaceId: "weixin_stephen" });

  assert.equal(result.ok, true);
  assert.equal(result.gatewayMode, "stream");
  assert.equal(result.draft.items[0].targetNodeIds[0], "kg_science_fair_test");
});

test("learning plan orchestrator fails closed on invalid JSON", async () => {
  const service = createLearningPlanOrchestratorService({
    plannerContextService: { plannerContext: () => context() },
    validationService: createLearningPlanValidationService(),
    gatewayClient: createGrowthGatewayPlannerClient({
      transport() {
        return { body: "not-json" };
      }
    })
  });

  const result = await service.draftPlan({ workspaceId: "weixin_stephen" });

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_plan_invalid_json");
});

test("learning plan validation rejects high-pressure daily plan", async () => {
  const plan = validPlan();
  plan.items[0].estimatedMinutes = 35;
  plan.items[0].pressurePolicy.passScoreRequired = true;
  const service = createLearningPlanOrchestratorService({
    plannerContextService: { plannerContext: () => context() },
    validationService: createLearningPlanValidationService(),
    gatewayClient: createGrowthGatewayPlannerClient({
      transport() {
        return { json: { output_text: JSON.stringify(plan) } };
      }
    })
  });

  const result = await service.draftPlan({ workspaceId: "weixin_stephen" });

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_plan_validation_failed");
  assert.equal(result.errors.some((item) => item.code === "daily_plan_too_long"), true);
  assert.equal(result.errors.some((item) => item.code === "daily_pass_score_required_forbidden"), true);
});

test("learning plan validation accepts bounded weekly low-pressure plans", async () => {
  const service = createLearningPlanOrchestratorService({
    plannerContextService: {
      plannerContext: () => contextForHorizon("weekly_plan", {
        constraints: {
          availableMinutes: 45,
          allowedCardRoles: ["teaching", "practice", "repair", "stretch"],
          completionPolicy: "daily_score_once"
        }
      })
    },
    validationService: createLearningPlanValidationService(),
    gatewayClient: createGrowthGatewayPlannerClient({
      transport() {
        return { json: { output_text: JSON.stringify(weeklyPlan()) } };
      }
    })
  });

  const result = await service.draftPlan({ workspaceId: "weixin_stephen", horizon: "weekly_plan" });

  assert.equal(result.ok, true);
  assert.equal(result.draft.horizon, "weekly_plan");
  assert.equal(result.draft.items.length, 2);
  assert.equal(result.draft.items[1].pressurePolicy.completionPolicy, "daily_score_once");
  assert.equal(result.draft.items[1].pressurePolicy.passScoreRequired, false);
});

test("learning plan validation rejects weekly backlog pressure and formal assessment", async () => {
  const plan = weeklyPlan({
    items: Array.from({ length: 6 }, (_, index) => ({
      itemId: `plan_item_week_${index + 1}`,
      cardRole: index === 0 ? "stage_assessment" : "practice",
      subject: "science",
      targetNodeIds: ["kg_science_fair_test"],
      estimatedMinutes: index === 1 ? 30 : 15,
      evidenceRequirements: ["explain_controlled_variable"],
      pressurePolicy: {
        completionPolicy: index === 2 ? "formal_assessment" : "daily_score_once",
        passScoreRequired: index === 3
      }
    }))
  });
  const service = createLearningPlanOrchestratorService({
    plannerContextService: {
      plannerContext: () => contextForHorizon("weekly_plan", {
        constraints: {
          availableMinutes: 75,
          allowedCardRoles: ["teaching", "practice", "repair", "stretch", "stage_assessment"],
          completionPolicy: "daily_score_once"
        }
      })
    },
    validationService: createLearningPlanValidationService(),
    gatewayClient: createGrowthGatewayPlannerClient({
      transport() {
        return { json: { output_text: JSON.stringify(plan) } };
      }
    })
  });

  const result = await service.draftPlan({ workspaceId: "weixin_stephen", horizon: "weekly_plan" });

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_plan_validation_failed");
  assert.equal(result.errors.some((item) => item.code === "weekly_plan_too_many_items"), true);
  assert.equal(result.errors.some((item) => item.code === "weekly_plan_item_too_long"), true);
  assert.equal(result.errors.some((item) => item.code === "weekly_completion_policy_invalid"), true);
  assert.equal(result.errors.some((item) => item.code === "weekly_pass_score_required_forbidden"), true);
  assert.equal(result.errors.some((item) => item.code === "weekly_stage_assessment_forbidden"), true);
  assert.equal(result.errors.some((item) => item.code === "weekly_plan_total_too_long"), true);
});

test("learning plan validation accepts stage checkpoint suggestions only with activation policy", async () => {
  const service = createLearningPlanOrchestratorService({
    plannerContextService: {
      plannerContext: () => contextForHorizon("stage_checkpoint_plan", {
        constraints: {
          availableMinutes: 30,
          allowedCardRoles: ["stage_assessment"],
          completionPolicy: "formal_assessment"
        }
      })
    },
    validationService: createLearningPlanValidationService(),
    gatewayClient: createGrowthGatewayPlannerClient({
      transport() {
        return { json: { output_text: JSON.stringify(stageCheckpointPlan()) } };
      }
    })
  });

  const result = await service.draftPlan({ workspaceId: "weixin_stephen", horizon: "stage_checkpoint_plan" });

  assert.equal(result.ok, true);
  assert.equal(result.draft.horizon, "stage_checkpoint_plan");
  assert.equal(result.draft.items[0].cardRole, "stage_assessment");
  assert.equal(result.draft.items[0].activationPolicy.activateThrough, "learning-stage-assessment-service");
  assert.deepEqual(result.draft.items[0].assessmentCoverageNodeIds, ["kg_science_fair_test"]);
});

test("learning plan validation rejects stage checkpoint plans without service activation policy", async () => {
  const plan = stageCheckpointPlan({
    items: [{
      itemId: "plan_item_stage_1",
      cardRole: "stage_assessment",
      subject: "science",
      targetNodeIds: ["kg_science_fair_test"],
      estimatedMinutes: 28,
      evidenceRequirements: ["explain_controlled_variable"],
      pressurePolicy: {
        completionPolicy: "formal_assessment",
        passScoreRequired: false
      }
    }]
  });
  const service = createLearningPlanOrchestratorService({
    plannerContextService: {
      plannerContext: () => contextForHorizon("stage_checkpoint_plan", {
        constraints: {
          availableMinutes: 30,
          allowedCardRoles: ["stage_assessment"],
          completionPolicy: "formal_assessment"
        }
      })
    },
    validationService: createLearningPlanValidationService(),
    gatewayClient: createGrowthGatewayPlannerClient({
      transport() {
        return { json: { output_text: JSON.stringify(plan) } };
      }
    })
  });

  const result = await service.draftPlan({ workspaceId: "weixin_stephen", horizon: "stage_checkpoint_plan" });

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_plan_validation_failed");
  assert.equal(result.errors.some((item) => item.code === "stage_assessment_activation_policy_required"), true);
});

test("learning plan validation rejects privacy-risk output", async () => {
  const plan = validPlan();
  plan.rawPrivateAnswer = "RAW LEARNER ANSWER";
  const service = createLearningPlanOrchestratorService({
    plannerContextService: { plannerContext: () => context() },
    validationService: createLearningPlanValidationService(),
    gatewayClient: createGrowthGatewayPlannerClient({
      transport() {
        return { json: { output_text: JSON.stringify(plan) } };
      }
    })
  });

  const result = await service.draftPlan({ workspaceId: "weixin_stephen" });

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_plan_validation_failed");
  assert.equal(result.errors[0].code, "plan_privacy_failed");
  assert.deepEqual(result.errors[0].paths, ["$.rawPrivateAnswer"]);
});
