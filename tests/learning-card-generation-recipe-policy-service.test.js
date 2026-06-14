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
  assert.equal(result.recipes[0].domain, "english");
  assert.equal(result.recipes[0].cardRole, "practice");
  assert.equal(result.completionPolicy.mode, "daily_score_once");
  assert.equal(result.completionPolicy.passScoreRequired, false);
  assert.equal(result.generationDefaults.cardSchemaVersion, "growth.card.authoring.v1");
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
