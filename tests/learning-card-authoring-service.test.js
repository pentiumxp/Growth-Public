const assert = require("node:assert/strict");
const test = require("node:test");

const { createGrowthGatewayAuthoringClient } = require("../src/services/growth-gateway-authoring-client");
const { createLearningCardAuthoringService } = require("../src/services/learning-card-authoring-service");
const { createLearningCardAuthoringValidationService } = require("../src/services/learning-card-authoring-validation-service");

function graphPlan(overrides = {}) {
  return Object.assign({
    learningGraphPlanId: "lgp_test_ratio_intro",
    learnerId: "weixin_stephen",
    workspaceId: "weixin_stephen",
    programId: "program_1",
    targetNodeId: "kg_ratio_intro",
    prerequisiteNodeIds: ["kg_fraction_meaning"],
    pathNodeIds: ["kg_fraction_meaning", "kg_ratio_intro"],
    cardSequence: [{
      cardRole: "teaching",
      targetNodeIds: ["kg_ratio_intro"],
      difficultyBand: "foundation",
      evidenceRequired: ["explain_ratio_comparison"]
    }],
    assessmentCoverage: [],
    privacyClass: "summary_only"
  }, overrides);
}

function validDraft(overrides = {}) {
  return Object.assign({
    cardRole: "teaching",
    title: "Ratio intro: compare two quantities",
    targetNodeIds: ["kg_ratio_intro"],
    expectedTimeMinutes: 12,
    difficultyBasis: "Foundation bridge from fraction meaning to ratios.",
    supportLevel: "guided",
    teachingFlow: {
      learningTarget: "Compare two quantities using a ratio.",
      prerequisites: [{ id: "kg_fraction_meaning", label: "Fraction meaning", evidence: "observed" }],
      microLesson: {
        instruction: "A ratio compares how much of one thing there is to another."
      },
      workedExample: {
        instruction: "If there are 2 red counters and 3 blue counters, the ratio is 2:3.",
        steps: [{ label: "Compare", text: "red to blue = 2 to 3" }]
      },
      guidedPractice: {
        mode: "short_answer",
        instruction: "Write the ratio of 4 apples to 6 pears."
      },
      quickCheck: {
        mode: "short_answer",
        instruction: "What does 4:6 compare?",
        expectedEvidence: ["mentions apples and pears"]
      },
      tooHardFallback: {
        action: "prerequisite_repair",
        reason: "Review part-whole comparison first."
      }
    },
    evidenceToRecord: ["explain_ratio_comparison"]
  }, overrides);
}

function sseForText(text) {
  const mid = Math.ceil(text.length / 2);
  return [
    `data: ${JSON.stringify({ delta: text.slice(0, mid) })}`,
    "",
    `data: ${JSON.stringify({ delta: text.slice(mid) })}`,
    "",
    "data: [DONE]",
    ""
  ].join("\n");
}

function createPublisher(options = {}) {
  const calls = [];
  return {
    calls,
    async publishAuthoringDraft(input) {
      calls.push(input);
      if (options.fail) return { ok: false, error: "sqlite_transaction_failed" };
      if (options.throw) throw new Error("sqlite transaction exploded");
      return {
        ok: true,
        taskCardId: "ltask_generated_1",
        bindingId: "lcgb_generated_1",
        transaction: "committed"
      };
    }
  };
}

function createAuthoringHarness(responses, options = {}) {
  const queue = Array.isArray(responses) ? responses.slice() : [responses];
  const calls = [];
  const gatewayClient = createGrowthGatewayAuthoringClient({
    timeoutMs: options.timeoutMs || 1000,
    transport(payload) {
      calls.push(payload);
      const next = queue.shift();
      return typeof next === "function" ? next(payload) : next;
    }
  });
  const publisher = options.publisher || createPublisher();
  const service = createLearningCardAuthoringService({
    gatewayClient,
    validationService: createLearningCardAuthoringValidationService(),
    publisher,
    now: () => new Date("2026-06-11T12:00:00.000Z")
  });
  return { calls, publisher, service };
}

test("card authoring service publishes a valid streaming Gateway draft", async () => {
  const draftText = JSON.stringify(validDraft());
  const { calls, publisher, service } = createAuthoringHarness({ sse: sseForText(draftText) });

  const result = await service.authorCard({
    learningGraphPlan: graphPlan(),
    learnerSummary: { ageBand: "lower_secondary" },
    masterySummary: { current: "foundation" },
    recentExperienceSignals: [{ signalType: "right_level" }],
    cardRole: "teaching",
    cardSchemaVersion: "growth.card.authoring.v1"
  });

  assert.equal(result.ok, true);
  assert.equal(result.gatewayMode, "stream");
  assert.equal(result.draft.learningGraphPlanId, "lgp_test_ratio_intro");
  assert.deepEqual(result.draft.targetNodeIds, ["kg_ratio_intro"]);
  assert.equal(result.published.taskCardId, "ltask_generated_1");
  assert.equal(calls[0].kind, "growth.card_authoring.generate");
  assert.equal(publisher.calls[0].audit.gatewayMode, "stream");
});

test("card authoring service handles valid ordinary JSON Gateway drafts", async () => {
  const { service } = createAuthoringHarness({
    json: {
      output_text: JSON.stringify(validDraft({ title: "JSON generated ratio card" }))
    }
  });

  const result = await service.authorCard({
    learningGraphPlan: graphPlan(),
    cardRole: "teaching"
  });

  assert.equal(result.ok, true);
  assert.equal(result.gatewayMode, "json");
  assert.equal(result.draft.title, "JSON generated ratio card");
});

test("card authoring service reports empty Gateway output without publishing", async () => {
  const publisher = createPublisher();
  const { service } = createAuthoringHarness({ body: "" }, { publisher });

  const result = await service.authorCard({
    learningGraphPlan: graphPlan(),
    cardRole: "teaching"
  });

  assert.equal(result.ok, false);
  assert.equal(result.stage, "gateway");
  assert.equal(result.error, "gateway_empty_output");
  assert.equal(publisher.calls.length, 0);
});

test("card authoring service repairs invalid JSON before publishing", async () => {
  const { calls, service } = createAuthoringHarness([
    { body: "{ invalid json" },
    { json: { output_text: JSON.stringify(validDraft({ title: "Repaired ratio card" })) } }
  ]);

  const result = await service.authorCard({
    learningGraphPlan: graphPlan(),
    cardRole: "teaching"
  });

  assert.equal(result.ok, true);
  assert.equal(result.repaired, true);
  assert.equal(result.draft.title, "Repaired ratio card");
  assert.equal(calls[1].kind, "growth.card_authoring.repair");
});

test("card authoring service fails visibly when repair also returns invalid JSON", async () => {
  const publisher = createPublisher();
  const { service } = createAuthoringHarness([
    { body: "{ invalid json" },
    { body: "{ still invalid" }
  ], { publisher });

  const result = await service.authorCard({
    learningGraphPlan: graphPlan(),
    cardRole: "teaching"
  });

  assert.equal(result.ok, false);
  assert.equal(result.stage, "validation");
  assert.equal(result.error, "authoring_draft_invalid_json");
  assert.equal(result.repairAttempted, true);
  assert.equal(publisher.calls.length, 0);
});

test("card authoring validation rejects missing teachingFlow schema fields", async () => {
  const publisher = createPublisher();
  const { service } = createAuthoringHarness({
    json: {
      output_text: JSON.stringify(validDraft({ teachingFlow: { learningTarget: "Ratio" } }))
    }
  }, { publisher });

  const result = await service.authorCard({
    learningGraphPlan: graphPlan(),
    cardRole: "teaching"
  });

  assert.equal(result.ok, false);
  assert.equal(result.stage, "validation");
  assert.equal(result.error, "card_authoring_validation_failed");
  assert.ok(result.errors.some((error) => error.code === "teaching_flow_field_required"));
  assert.equal(publisher.calls.length, 0);
});

test("card authoring validation rejects privacy-risk draft fields", async () => {
  const publisher = createPublisher();
  const { service } = createAuthoringHarness({
    json: {
      output_text: JSON.stringify(validDraft({ answerKey: "hidden answer" }))
    }
  }, { publisher });

  const result = await service.authorCard({
    learningGraphPlan: graphPlan(),
    cardRole: "teaching"
  });

  assert.equal(result.ok, false);
  assert.equal(result.stage, "validation");
  assert.ok(result.errors.some((error) => error.code === "privacy_scan_failed"));
  assert.equal(publisher.calls.length, 0);
});

test("card authoring service reports Gateway timeout as retryable", async () => {
  const publisher = createPublisher();
  const { service } = createAuthoringHarness(() => new Promise(() => {}), {
    publisher,
    timeoutMs: 5
  });

  const result = await service.authorCard({
    learningGraphPlan: graphPlan(),
    cardRole: "teaching"
  });

  assert.equal(result.ok, false);
  assert.equal(result.stage, "gateway");
  assert.equal(result.error, "gateway_timeout");
  assert.equal(result.gatewayResult.retryable, true);
  assert.equal(publisher.calls.length, 0);
});

test("card authoring service rolls back visible result on publisher transaction failure", async () => {
  const publisher = createPublisher({ fail: true });
  const { service } = createAuthoringHarness({
    json: {
      output_text: JSON.stringify(validDraft())
    }
  }, { publisher });

  const result = await service.authorCard({
    learningGraphPlan: graphPlan(),
    cardRole: "teaching"
  });

  assert.equal(result.ok, false);
  assert.equal(result.stage, "publish");
  assert.equal(result.error, "sqlite_transaction_failed");
  assert.equal(publisher.calls.length, 1);
});

test("card authoring validation enforces graph plan role and target node policy", async () => {
  const publisher = createPublisher();
  const { service } = createAuthoringHarness({
    json: {
      output_text: JSON.stringify(validDraft({
        cardRole: "practice",
        targetNodeIds: ["kg_ratio_intro", "kg_fraction_meaning"]
      }))
    }
  }, { publisher });

  const result = await service.authorCard({
    learningGraphPlan: graphPlan(),
    cardRole: "practice"
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === "graph_plan_role_mismatch"));
  assert.ok(result.errors.some((error) => error.code === "focused_card_requires_one_target_node"));
  assert.equal(publisher.calls.length, 0);
});
