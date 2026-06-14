"use strict";

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

function firstPlanCard(plan = {}) {
  return asArray(plan.cardSequence)[0] || {};
}

function planTargetNodeIds(plan = {}) {
  return uniqueStrings(firstPlanCard(plan).targetNodeIds || plan.targetNodeIds || [plan.targetNodeId]);
}

function planNodeIds(plan = {}) {
  return uniqueStrings(
    asArray(plan.pathNodeIds)
      .concat(plan.targetNodeId)
      .concat(planTargetNodeIds(plan))
      .concat(plan.prerequisiteNodeIds || [])
      .concat(plan.assessmentCoverage || [])
  );
}

function graphSourceSummaries(graphRepository, plan = {}) {
  if (!graphRepository || typeof graphRepository.nodesByIds !== "function") return [];
  return graphRepository.nodesByIds({ nodeIds: planNodeIds(plan) }).map((node) => ({
    nodeId: cleanString(node.nodeId),
    title: cleanString(node.title),
    domain: cleanString(node.domain),
    stage: cleanString(node.stage),
    subject: cleanString(node.subject),
    curriculum: cleanString(node.curriculum),
    sourceKind: cleanString(node.sourceKind),
    sourceRef: cleanString(node.sourceRef),
    learningOutcomes: asArray(node.learningOutcomes).map((item) => cleanString(item).slice(0, 240)).filter(Boolean).slice(0, 6),
    evidenceRequired: asArray(node.evidenceRequired).map((item) => cleanString(item).slice(0, 160)).filter(Boolean).slice(0, 6),
    masterySignals: asArray(node.masterySignals).map((item) => cleanString(item).slice(0, 160)).filter(Boolean).slice(0, 6),
    experienceSignals: asArray(node.experienceSignals).map((item) => cleanString(item).slice(0, 160)).filter(Boolean).slice(0, 6)
  }));
}

function normalizePlanInput(input = {}) {
  return {
    learningGraphPlanId: input.learningGraphPlanId || input.learning_graph_plan_id,
    learnerId: input.learnerId || input.learner_id || input.workspaceId || input.workspace_id,
    workspaceId: input.workspaceId || input.workspace_id,
    programId: input.programId || input.program_id,
    recipeId: input.recipeId || input.recipe_id,
    domain: input.domain,
    subject: input.subject,
    targetNodeId: input.targetNodeId || input.target_node_id,
    targetNodeIds: input.targetNodeIds || input.target_node_ids,
    cardRole: input.cardRole || input.card_role,
    assessmentCoverageNodeIds: input.assessmentCoverageNodeIds || input.assessment_coverage_node_ids || input.assessmentCoverage || input.assessment_coverage,
    difficultyBand: input.difficultyBand || input.difficulty_band
  };
}

function hasExplicitPlanTarget(input = {}) {
  return Boolean(
    cleanString(input.targetNodeId || input.target_node_id)
    || uniqueStrings(input.targetNodeIds || input.target_node_ids).length
    || input.learningGraphPlan?.learningGraphPlanId
  );
}

function hasExplicitCardRole(input = {}) {
  return Boolean(cleanString(input.cardRole || input.card_role));
}

function hasExplicitDifficultyBand(input = {}) {
  return Boolean(cleanString(input.difficultyBand || input.difficulty_band));
}

function recipeDefault(policy = {}, field = "") {
  const recipe = policy.recipe || {};
  return cleanString(recipe[field]);
}

function applyRecipePlanFallbacks(planInput = {}, policy = {}, options = {}) {
  if (!policy?.applies) return planInput;
  return Object.assign({}, planInput, {
    cardRole: cleanString(planInput.cardRole)
      || (options.allowCardRole ? recipeDefault(policy, "defaultCardRole") : ""),
    difficultyBand: cleanString(planInput.difficultyBand)
      || (options.allowDifficultyBand ? recipeDefault(policy, "defaultDifficultyBand") : "")
  });
}

function normalizeResultHistory(history = {}) {
  return {
    learnerSummary: history.learnerSummary || {},
    masterySummary: history.masterySummary || {},
    recentExperienceSignals: asArray(history.recentExperienceSignals).slice(0, 20),
    recentTrajectory: asArray(history.recentTrajectory).slice(0, 8)
  };
}

function createLearningCardGenerationService(options = {}) {
  const graphPlanService = options.graphPlanService;
  const graphRepository = options.graphRepository;
  const historySummaryRepository = options.historySummaryRepository;
  const nextTargetService = options.nextTargetService || null;
  const nextCardStrategyService = options.nextCardStrategyService;
  const recipePolicyService = options.recipePolicyService || null;
  const authoringService = options.authoringService;

  function normalizeGenerationInput(input = {}) {
    if (!recipePolicyService || typeof recipePolicyService.normalizeGenerationInput !== "function") {
      return { ok: true, applies: false, input };
    }
    return recipePolicyService.normalizeGenerationInput(input);
  }

  function normalizePlanInputWithDefaultTarget(input = {}, policy = {}) {
    const planInput = normalizePlanInput(input);
    if (hasExplicitPlanTarget(input) || cleanString(planInput.cardRole).toLowerCase() === "stage_assessment") {
      return applyRecipePlanFallbacks(planInput, policy, {
        allowCardRole: !hasExplicitCardRole(input) && cleanString(planInput.cardRole).toLowerCase() !== "stage_assessment",
        allowDifficultyBand: !hasExplicitDifficultyBand(input) && cleanString(planInput.cardRole).toLowerCase() !== "stage_assessment"
      });
    }
    if (!nextTargetService || typeof nextTargetService.selectNextTarget !== "function") return planInput;
    const selection = nextTargetService.selectNextTarget(planInput);
    if (!selection?.ok) return planInput;
    return applyRecipePlanFallbacks(Object.assign({}, planInput, {
      targetNodeId: selection.targetNodeId,
      targetNodeIds: selection.targetNodeIds,
      cardRole: planInput.cardRole || selection.cardRole,
      difficultyBand: planInput.difficultyBand || selection.difficultyBand
    }), policy, {
      allowCardRole: !hasExplicitCardRole(input),
      allowDifficultyBand: !hasExplicitDifficultyBand(input)
    });
  }

  async function resolvePlan(input = {}, policy = {}) {
    if (input.learningGraphPlan?.learningGraphPlanId) return input.learningGraphPlan;
    if (!graphPlanService || typeof graphPlanService.createPlan !== "function") {
      return unavailable("learning_graph_plan_service_unavailable", { stage: "plan" });
    }
    const plan = await graphPlanService.createPlan(normalizePlanInputWithDefaultTarget(input, policy));
    if (!plan?.ok) return unavailable(plan?.error || "learning_graph_plan_failed", { stage: "plan", planResult: plan || null });
    return plan;
  }

  function resolveHistory(input = {}, plan = {}) {
    if (!historySummaryRepository || typeof historySummaryRepository.summaryForAuthoringPlan !== "function") {
      return unavailable("learning_history_summary_unavailable", { stage: "history" });
    }
    const history = historySummaryRepository.summaryForAuthoringPlan({
      workspaceId: input.workspaceId || input.workspace_id || plan.workspaceId,
      learnerId: input.learnerId || input.learner_id || plan.learnerId,
      programId: input.programId || input.program_id || plan.programId,
      learningGraphPlan: plan
    });
    if (!history?.ok) return unavailable(history?.error || "learning_history_summary_failed", { stage: "history", historyResult: history || null });
    return history;
  }

  async function generateCard(input = {}) {
    const policy = normalizeGenerationInput(input);
    if (!policy?.ok) return unavailable(policy?.error || "learning_card_generation_recipe_policy_failed", { stage: "recipe", recipePolicy: policy || null });
    const normalizedInput = policy.input || input;
    const plan = await resolvePlan(normalizedInput, policy);
    if (!plan?.ok) return plan;
    const history = resolveHistory(normalizedInput, plan);
    if (!history?.ok) return history;
    if (!authoringService || typeof authoringService.authorCard !== "function") {
      return unavailable("learning_card_authoring_service_unavailable", { stage: "authoring" });
    }
    const firstCard = firstPlanCard(plan);
    const graphSources = graphSourceSummaries(graphRepository, plan);
    const sourceSummaries = graphSources.concat(asArray(normalizedInput.sourceSummaries || normalizedInput.source_summaries)).slice(0, 12);
    const nextCardStrategy = nextCardStrategyService && typeof nextCardStrategyService.chooseNextCardStrategy === "function"
      ? nextCardStrategyService.chooseNextCardStrategy({
        masterySummary: history.masterySummary,
        recentExperienceSignals: history.recentExperienceSignals,
        recentTrajectory: history.recentTrajectory,
        targetNodeIds: planTargetNodeIds(plan)
      })
      : normalizedInput.nextCardStrategy || normalizedInput.next_card_strategy || null;
    const authoring = await authoringService.authorCard({
      learningGraphPlan: plan,
      learnerSummary: history.learnerSummary,
      masterySummary: history.masterySummary,
      recentExperienceSignals: history.recentExperienceSignals,
      recentTrajectory: history.recentTrajectory,
      nextCardStrategy,
      cardRole: normalizedInput.cardRole || normalizedInput.card_role || firstCard.cardRole || recipeDefault(policy, "defaultCardRole"),
      difficultyBand: normalizedInput.difficultyBand || normalizedInput.difficulty_band || firstCard.difficultyBand || recipeDefault(policy, "defaultDifficultyBand"),
      evidenceRequirements: normalizedInput.evidenceRequirements || normalizedInput.evidence_requirements || firstCard.evidenceRequired || policy.recipe?.evidenceRequirements,
      cardSchemaVersion: normalizedInput.cardSchemaVersion || normalizedInput.card_schema_version || policy.recipe?.cardSchemaVersion || "growth.card.authoring.v1",
      sourceSummaries,
      generationKey: normalizedInput.generationKey || normalizedInput.generation_key,
      taskCardId: normalizedInput.taskCardId || normalizedInput.task_card_id,
      stageAssessmentCycleId: normalizedInput.stageAssessmentCycleId || normalizedInput.stage_assessment_cycle_id,
      activationState: normalizedInput.activationState || normalizedInput.activation_state,
      activationReason: normalizedInput.activationReason || normalizedInput.activation_reason,
      activationSource: normalizedInput.activationSource || normalizedInput.activation_source,
      cooldownUntil: normalizedInput.cooldownUntil || normalizedInput.cooldown_until
    });
    if (!authoring?.ok) {
      return unavailable(authoring?.error || "learning_card_authoring_failed", {
        stage: authoring?.stage || "authoring",
        learningGraphPlan: plan,
        historySummary: normalizeResultHistory(history),
        authoring
      });
    }
    return {
      ok: true,
      source: "growth-learning-card-generation-service",
      recipeId: policy.recipeId || cleanString(normalizedInput.recipeId || normalizedInput.recipe_id),
      learningGraphPlan: plan,
      historySummary: normalizeResultHistory(history),
      nextCardStrategy,
      sourceSummaryCount: sourceSummaries.length,
      draft: authoring.draft,
      published: authoring.published,
      gatewayMode: authoring.gatewayMode,
      repaired: authoring.repaired
    };
  }

  return {
    generateCard
  };
}

module.exports = {
  createLearningCardGenerationService,
  graphSourceSummaries,
  normalizePlanInput
};
