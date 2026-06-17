const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningCardGenerationRecipePolicyService
} = require("../src/services/learning-card-generation-recipe-policy-service");

test("card generation recipe policy exposes daily English context without raw inputs", () => {
  const service = createLearningCardGenerationRecipePolicyService();

  const result = service.context({ workspaceId: "weixin_fanfan" });

  assert.equal(result.ok, true);
  assert.equal(result.selectedRecipeId, "daily_english_v1");
  assert.equal(result.recipes[0].id, "daily_english_v1");
  assert.equal(result.recipes.some((recipe) => recipe.id === "daily_science_v1"), true);
  assert.equal(result.recipes.some((recipe) => recipe.id === "daily_subject_practice_v1"), true);
  assert.equal(result.recipes[0].domain, "english");
  assert.equal(result.recipes[0].cardRole, "practice");
  assert.equal(result.completionPolicy.mode, "daily_score_once");
  assert.equal(result.completionPolicy.passScoreRequired, false);
  assert.equal(result.generationDefaults.cardSchemaVersion, "growth.card.authoring.v1");
  assert.equal(result.generationDefaults.rubricPolicyId, "rubric:daily_english_v1");
  assert.equal(result.rubricCatalog.some((item) => item.policyId === "rubric:daily_mathematics_v1"), true);
  assert.equal(result.recipes[0].rubricPolicy.policyId, "rubric:daily_english_v1");
  assert.equal(JSON.stringify(result).includes("raw learner answer"), false);
});

test("card generation recipe policy normalizes recipe-only daily generation input", () => {
  const service = createLearningCardGenerationRecipePolicyService();

  const result = service.normalizeGenerationInput({
    workspace_id: "weixin_fanfan",
    recipe_id: "daily_english_v1",
    completion_policy: { mode: "retry_until_pass", passScoreRequired: true }
  });

  assert.equal(result.ok, true);
  assert.equal(result.applies, true);
  assert.equal(result.recipeId, "daily_english_v1");
  assert.equal(result.input.workspaceId, "weixin_fanfan");
  assert.equal(result.input.learnerId, "weixin_fanfan");
  assert.equal(result.input.domain, "english");
  assert.equal(result.input.subject, "english");
  assert.equal(result.input.cardSchemaVersion, "growth.card.authoring.v1");
  assert.equal(result.input.cardRole, undefined);
  assert.equal(result.input.difficultyBand, undefined);
  assert.equal(result.input.completionPolicy.mode, "daily_score_once");
  assert.equal(result.input.completionPolicy.passScoreRequired, false);
});

test("card generation recipe policy normalizes daily science generation input", () => {
  const service = createLearningCardGenerationRecipePolicyService();

  const result = service.normalizeGenerationInput({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    recipeId: "daily_science_v1"
  });

  assert.equal(result.ok, true);
  assert.equal(result.applies, true);
  assert.equal(result.recipeId, "daily_science_v1");
  assert.equal(result.recipe.domain, "science");
  assert.equal(result.recipe.subject, "science");
  assert.equal(result.input.domain, "science");
  assert.equal(result.input.subject, "science");
  assert.equal(result.input.cardSchemaVersion, "growth.card.authoring.v1");
  assert.equal(result.input.completionPolicy.mode, "daily_score_once");
  assert.deepEqual(result.recipe.evidenceRequirements, ["short_answer", "science_reasoning", "self_reflection_optional"]);
  assert.equal(result.recipe.rubricPolicy.policyId, "rubric:daily_science_v1");
  assert.deepEqual(result.recipe.rubricPolicy.rubricDimensions.map((item) => item.dimensionId), [
    "science_concept_understanding",
    "science_causal_reasoning",
    "science_evidence_use",
    "science_vocabulary_precision"
  ]);
});

test("card generation recipe policy can use selected subject scope for generic daily practice", () => {
  const service = createLearningCardGenerationRecipePolicyService();

  const context = service.context({
    recipeId: "daily_subject_practice_v1",
    domain: "math",
    subject: "mathematics"
  });
  const result = service.normalizeGenerationInput({
    workspaceId: "weixin_child",
    recipeId: "daily_subject_practice_v1",
    domain: "math",
    subject: "mathematics"
  });

  assert.equal(context.selectedRecipeId, "daily_subject_practice_v1");
  assert.equal(context.generationDefaults.domain, "math");
  assert.equal(context.generationDefaults.subject, "mathematics");
  assert.equal(context.generationDefaults.rubricPolicyId, "rubric:daily_mathematics_v1");
  assert.deepEqual(context.generationDefaults.rubricDimensionIds, [
    "math_concept_model",
    "math_procedure_accuracy",
    "math_reasoning_explanation",
    "math_precision_check"
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.recipeId, "daily_subject_practice_v1");
  assert.equal(result.input.domain, "math");
  assert.equal(result.input.subject, "mathematics");
  assert.equal(result.input.completionPolicy.passScoreRequired, false);
  assert.equal(result.input.rubricPolicy.policyId, "rubric:daily_mathematics_v1");
});

test("card generation recipe policy leaves stage assessment outside daily defaults", () => {
  const service = createLearningCardGenerationRecipePolicyService();

  const result = service.normalizeGenerationInput({
    workspaceId: "weixin_fanfan",
    cardRole: "stage_assessment",
    targetNodeId: "kg_english_main_idea"
  });

  assert.equal(result.ok, true);
  assert.equal(result.applies, false);
  assert.equal(result.input.cardRole, "stage_assessment");
  assert.equal(result.input.domain, undefined);
  assert.equal(result.input.completionPolicy, undefined);
});

test("card generation recipe policy rejects unsupported recipes visibly", () => {
  const service = createLearningCardGenerationRecipePolicyService();

  const result = service.normalizeGenerationInput({
    workspaceId: "weixin_fanfan",
    recipeId: "math_drill_v1"
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "unsupported_card_generation_recipe");
  assert.equal(result.recipeId, "math_drill_v1");
});
