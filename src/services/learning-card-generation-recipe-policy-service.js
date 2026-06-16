"use strict";

const DAILY_ENGLISH_RECIPE_ID = "daily_english_v1";
const DAILY_SCIENCE_RECIPE_ID = "daily_science_v1";
const DAILY_SUBJECT_PRACTICE_RECIPE_ID = "daily_subject_practice_v1";
const DAILY_CARD_SCHEMA_VERSION = "growth.card.authoring.v1";

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unavailable(error, extra = {}) {
  return Object.assign({ ok: false, error }, extra);
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

function dailyScoreOnceCompletionPolicy() {
  return {
    mode: "daily_score_once",
    evaluationAttempts: 1,
    reflectionAttempts: 1,
    completionAfter: "first_evaluation",
    rewardMode: "score_proportional",
    passScoreRequired: false
  };
}

function dailyEnglishRecipe() {
  return {
    id: DAILY_ENGLISH_RECIPE_ID,
    label: "日常英语卡",
    domain: "english",
    subject: "english",
    defaultCardRole: "practice",
    defaultDifficultyBand: "foundation",
    cardSchemaVersion: DAILY_CARD_SCHEMA_VERSION,
    completionPolicy: "daily_score_once",
    completionPolicyDetail: dailyScoreOnceCompletionPolicy(),
    durationMinutes: { min: 10, max: 15 },
    evidenceRequirements: ["short_answer", "self_reflection_optional"],
    rewardMode: "score_proportional"
  };
}

function dailyScienceRecipe() {
  return {
    id: DAILY_SCIENCE_RECIPE_ID,
    label: "日常科学卡",
    domain: "science",
    subject: "science",
    defaultCardRole: "practice",
    defaultDifficultyBand: "foundation",
    cardSchemaVersion: DAILY_CARD_SCHEMA_VERSION,
    completionPolicy: "daily_score_once",
    completionPolicyDetail: dailyScoreOnceCompletionPolicy(),
    durationMinutes: { min: 10, max: 15 },
    evidenceRequirements: ["short_answer", "science_reasoning", "self_reflection_optional"],
    rewardMode: "score_proportional"
  };
}

function dailySubjectPracticeRecipe(input = {}) {
  const domain = cleanString(input.domain);
  const subject = cleanString(input.subject) || domain;
  return {
    id: DAILY_SUBJECT_PRACTICE_RECIPE_ID,
    label: "日常练习卡",
    domain,
    subject,
    defaultCardRole: "practice",
    defaultDifficultyBand: "foundation",
    cardSchemaVersion: DAILY_CARD_SCHEMA_VERSION,
    completionPolicy: "daily_score_once",
    completionPolicyDetail: dailyScoreOnceCompletionPolicy(),
    durationMinutes: { min: 10, max: 15 },
    evidenceRequirements: ["short_answer", "self_reflection_optional"],
    rewardMode: "score_proportional"
  };
}

function recipeById(recipeId, input = {}) {
  if (recipeId === DAILY_ENGLISH_RECIPE_ID) return dailyEnglishRecipe();
  if (recipeId === DAILY_SCIENCE_RECIPE_ID) return dailyScienceRecipe();
  if (recipeId === DAILY_SUBJECT_PRACTICE_RECIPE_ID) return dailySubjectPracticeRecipe(input);
  return null;
}

function recipeIdFromInput(input = {}) {
  return cleanString(input.recipeId || input.recipe_id || input.selectedRecipeId || input.selected_recipe_id);
}

function isStageAssessmentInput(input = {}) {
  const role = cleanString(input.cardRole || input.card_role).toLowerCase();
  return role === "stage_assessment";
}

function publicRecipe(recipe = {}) {
  return {
    id: cleanString(recipe.id),
    label: cleanString(recipe.label),
    domain: cleanString(recipe.domain),
    subject: cleanString(recipe.subject),
    cardRole: cleanString(recipe.defaultCardRole),
    defaultCardRole: cleanString(recipe.defaultCardRole),
    defaultDifficultyBand: cleanString(recipe.defaultDifficultyBand),
    cardSchemaVersion: cleanString(recipe.cardSchemaVersion),
    completionPolicy: cleanString(recipe.completionPolicy),
    durationMinutes: recipe.durationMinutes || { min: 10, max: 15 },
    evidenceRequirements: uniqueStrings(recipe.evidenceRequirements),
    rewardMode: cleanString(recipe.rewardMode)
  };
}

function normalizeDailyGenerationInput(input = {}, recipe = dailyEnglishRecipe()) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id);
  const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
  const domain = cleanString(input.domain) || cleanString(recipe.domain);
  const subject = cleanString(input.subject) || cleanString(recipe.subject) || domain;
  return Object.assign({}, input, {
    recipeId: recipe.id,
    workspaceId,
    learnerId,
    programId: cleanString(input.programId || input.program_id),
    domain,
    subject,
    cardSchemaVersion: cleanString(input.cardSchemaVersion || input.card_schema_version) || recipe.cardSchemaVersion,
    completionPolicy: dailyScoreOnceCompletionPolicy()
  });
}

function createLearningCardGenerationRecipePolicyService() {
  function recipes() {
    return [
      publicRecipe(dailyEnglishRecipe()),
      publicRecipe(dailyScienceRecipe()),
      publicRecipe(dailySubjectPracticeRecipe())
    ];
  }

  function resolveRecipe(input = {}) {
    if (isStageAssessmentInput(input)) {
      return {
        ok: true,
        applies: false,
        recipeId: recipeIdFromInput(input),
        recipe: null
      };
    }
    const recipeId = recipeIdFromInput(input) || DAILY_ENGLISH_RECIPE_ID;
    const recipe = recipeById(recipeId, input);
    if (!recipe) {
      return unavailable("unsupported_card_generation_recipe", { recipeId });
    }
    return {
      ok: true,
      applies: true,
      recipeId: recipe.id,
      recipe
    };
  }

  function context(input = {}) {
    const resolved = resolveRecipe(input);
    const recipe = resolved.ok && resolved.recipe ? resolved.recipe : dailyEnglishRecipe();
    return {
      ok: true,
      source: "growth-learning-card-generation-recipe-policy-service",
      recipes: recipes(),
      selectedRecipeId: recipe.id,
      completionPolicy: dailyScoreOnceCompletionPolicy(),
      generationDefaults: {
        domain: recipe.domain,
        subject: recipe.subject,
        defaultCardRole: recipe.defaultCardRole,
        defaultDifficultyBand: recipe.defaultDifficultyBand,
        cardSchemaVersion: recipe.cardSchemaVersion,
        evidenceRequirements: uniqueStrings(recipe.evidenceRequirements)
      }
    };
  }

  function normalizeGenerationInput(input = {}) {
    const resolved = resolveRecipe(input);
    if (!resolved.ok) return resolved;
    if (!resolved.applies) {
      return {
        ok: true,
        source: "growth-learning-card-generation-recipe-policy-service",
        applies: false,
        recipeId: resolved.recipeId,
        recipe: null,
        input
      };
    }
    return {
      ok: true,
      source: "growth-learning-card-generation-recipe-policy-service",
      applies: true,
      recipeId: resolved.recipe.id,
      recipe: publicRecipe(resolved.recipe),
      input: normalizeDailyGenerationInput(input, resolved.recipe)
    };
  }

  return {
    context,
    dailyEnglishRecipe,
    dailyScienceRecipe,
    dailySubjectPracticeRecipe,
    dailyScoreOnceCompletionPolicy,
    normalizeGenerationInput,
    recipes,
    resolveRecipe
  };
}

module.exports = {
  DAILY_ENGLISH_RECIPE_ID,
  DAILY_SCIENCE_RECIPE_ID,
  DAILY_SUBJECT_PRACTICE_RECIPE_ID,
  createLearningCardGenerationRecipePolicyService,
  dailyEnglishRecipe,
  dailyScienceRecipe,
  dailySubjectPracticeRecipe,
  dailyScoreOnceCompletionPolicy,
  isStageAssessmentInput
};
