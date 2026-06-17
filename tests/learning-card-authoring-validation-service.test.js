const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningCardAuthoringValidationService
} = require("../src/services/learning-card-authoring-validation-service");

function graphPlan(overrides = {}) {
  return Object.assign({
    learningGraphPlanId: "lgp_ratio_intro",
    targetNodeIds: ["kg_ratio_intro"],
    prerequisiteNodeIds: ["kg_fraction_meaning"],
    cardSequence: [{
      cardRole: "teaching",
      targetNodeIds: ["kg_ratio_intro"],
      difficultyBand: "foundation",
      evidenceRequired: ["explain_ratio_comparison"]
    }],
    assessmentCoverage: ["kg_fraction_meaning", "kg_ratio_intro"],
    privacyClass: "summary_only"
  }, overrides);
}

function context(overrides = {}) {
  return Object.assign({
    learningGraphPlan: graphPlan(),
    cardRole: "teaching",
    cardSchemaVersion: "growth.card.authoring.v1"
  }, overrides);
}

function dailyDraft(overrides = {}) {
  return Object.assign({
    cardRole: "teaching",
    title: "Ratio intro: compare two quantities",
    targetNodeIds: ["kg_ratio_intro"],
    expectedTimeMinutes: 12,
    difficultyBasis: "Foundation bridge from fraction meaning to ratios.",
    supportLevel: "guided",
    teachingFlow: {
      learningTarget: "Compare two quantities using a ratio.",
      prerequisites: [{ id: "kg_fraction_meaning", label: "Fraction meaning" }],
      microLesson: {
        instruction: "A ratio compares one quantity with another."
      },
      workedExample: {
        instruction: "2 red counters and 3 blue counters can be written as 2:3.",
        steps: [{ label: "Compare", text: "red to blue" }]
      },
      guidedPractice: {
        mode: "short_answer",
        instruction: "Write the ratio of 4 apples to 6 pears."
      },
      quickCheck: {
        mode: "short_answer",
        instruction: "What does 4:6 compare?",
        expectedEvidence: ["mentions apples and pears"]
      }
    },
    evidenceToRecord: ["explain_ratio_comparison"]
  }, overrides);
}

function errorCodes(result) {
  return new Set((result.errors || []).map((item) => item.code));
}

test("authoring validation accepts a bounded ordinary daily draft from JSON", () => {
  const service = createLearningCardAuthoringValidationService();
  const result = service.parseAndValidateDraft({
    text: JSON.stringify(dailyDraft()),
    context: context()
  });

  assert.equal(result.ok, true);
  assert.equal(result.draft.schemaVersion, "growth.card.authoring.v1");
  assert.equal(result.draft.cardRole, "teaching");
  assert.equal(result.draft.learningGraphPlanId, "lgp_ratio_intro");
  assert.deepEqual(result.draft.targetNodeIds, ["kg_ratio_intro"]);
  assert.deepEqual(result.draft.prerequisiteNodeIds, ["kg_fraction_meaning"]);
  assert.deepEqual(result.privacyFindings, []);
});

test("authoring validation accepts formal stage assessment timing and coverage", () => {
  const service = createLearningCardAuthoringValidationService();
  const result = service.validateDraft({
    cardRole: "stage_assessment",
    title: "Ratio checkpoint",
    targetNodeIds: ["kg_fraction_meaning", "kg_ratio_intro"],
    expectedTimeMinutes: 28,
    assessmentCoverageNodeIds: ["kg_fraction_meaning", "kg_ratio_intro"]
  }, context({
    cardRole: "stage_assessment",
    learningGraphPlan: graphPlan({
      cardSequence: [{
        cardRole: "stage_assessment",
        targetNodeIds: ["kg_fraction_meaning", "kg_ratio_intro"]
      }]
    })
  }));

  assert.equal(result.ok, true);
  assert.equal(result.draft.cardRole, "stage_assessment");
  assert.deepEqual(result.draft.assessmentCoverageNodeIds, ["kg_fraction_meaning", "kg_ratio_intro"]);
  assert.deepEqual(result.privacyFindings, []);
});

test("authoring validation rejects daily drafts outside the low-pressure time range", () => {
  const service = createLearningCardAuthoringValidationService();
  const result = service.validateDraft(dailyDraft({ expectedTimeMinutes: 20 }), context());

  assert.equal(result.ok, false);
  assert.equal(result.error, "card_authoring_validation_failed");
  assert.equal(errorCodes(result).has("daily_expected_time_out_of_range"), true);
});

test("authoring validation blocks graph mismatches and private model fields", () => {
  const service = createLearningCardAuthoringValidationService();
  const result = service.validateDraft(dailyDraft({
    targetNodeIds: ["kg_unplanned_node"],
    rawPrompt: "do not expose this",
    metadata: {
      token: "Bearer abcdefghijklmnopqrstuvwxyz1234567890"
    }
  }), context());

  assert.equal(result.ok, false);
  assert.equal(result.error, "card_authoring_validation_failed");
  const codes = errorCodes(result);
  assert.equal(codes.has("target_node_outside_graph_plan"), true);
  assert.equal(codes.has("privacy_scan_failed"), true);
  assert.deepEqual(result.privacyFindings, [
    { path: "draft.rawPrompt", reason: "forbidden_key" },
    { path: "draft.metadata.token", reason: "forbidden_key" },
    { path: "draft.metadata.token", reason: "forbidden_secret_like_value" }
  ]);
});
