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
    domainPackId: input.domainPackId || input.domain_pack_id,
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
  const rubricPolicyService = options.rubricPolicyService || null;
  const targetProvisioningService = options.targetProvisioningService || null;
  const authoringService = options.authoringService;

  function normalizeGenerationInput(input = {}) {
    if (!recipePolicyService || typeof recipePolicyService.normalizeGenerationInput !== "function") {
      return { ok: true, applies: false, input };
    }
    return recipePolicyService.normalizeGenerationInput(input);
  }

  function resolveTargetProvisioning(input = {}, plan = null) {
    if (!targetProvisioningService || typeof targetProvisioningService.resolveSelection !== "function") {
      return { ok: true, targetEnabled: true };
    }
    const selection = targetProvisioningService.resolveSelection(Object.assign({}, input, {
      workspaceId: input.workspaceId || input.workspace_id || plan?.workspaceId,
      learnerId: input.learnerId || input.learner_id || plan?.learnerId,
      programId: input.programId || input.program_id || plan?.programId,
      domainPackId: input.domainPackId || input.domain_pack_id || plan?.domainPackId,
      domain: input.domain || plan?.domain,
      subject: input.subject || plan?.subject,
      targetNodeIds: plan ? planTargetNodeIds(plan) : (input.targetNodeIds || input.target_node_ids)
    }));
    if (!selection?.ok || !selection.targetEnabled) {
      return unavailable(selection?.error || "learning_target_not_provisioned", {
        stage: "provisioning",
        targetProvisioning: selection || null
      });
    }
    return selection;
  }

  function inputWithProvisioning(input = {}, selection = {}) {
    if (!selection?.ok) return input;
    return Object.assign({}, input, {
      domainPackId: cleanString(input.domainPackId || input.domain_pack_id) || cleanString(selection.selectedDomainPackId),
      domain: cleanString(input.domain) || cleanString(selection.selectedDomain),
      subject: cleanString(input.subject) || cleanString(selection.selectedSubject)
    });
  }

  function planInputWithDefaultTarget(input = {}, policy = {}) {
    const planInput = normalizePlanInput(input);
    if (hasExplicitPlanTarget(input) || cleanString(planInput.cardRole).toLowerCase() === "stage_assessment") {
      return {
        planInput: applyRecipePlanFallbacks(planInput, policy, {
          allowCardRole: !hasExplicitCardRole(input) && cleanString(planInput.cardRole).toLowerCase() !== "stage_assessment",
          allowDifficultyBand: !hasExplicitDifficultyBand(input) && cleanString(planInput.cardRole).toLowerCase() !== "stage_assessment"
        }),
        targetSelection: null
      };
    }
    if (!nextTargetService || typeof nextTargetService.selectNextTarget !== "function") {
      return { planInput, targetSelection: null };
    }
    const selection = nextTargetService.selectNextTarget(planInput);
    if (!selection?.ok) return { planInput, targetSelection: selection || null };
    return {
      planInput: applyRecipePlanFallbacks(Object.assign({}, planInput, {
        targetNodeId: selection.targetNodeId,
        targetNodeIds: selection.targetNodeIds,
        cardRole: planInput.cardRole || selection.cardRole,
        difficultyBand: planInput.difficultyBand || selection.difficultyBand
      }), policy, {
        allowCardRole: !hasExplicitCardRole(input),
        allowDifficultyBand: !hasExplicitDifficultyBand(input)
      }),
      targetSelection: selection
    };
  }

  async function resolvePlan(input = {}, policy = {}) {
    if (input.learningGraphPlan?.learningGraphPlanId) {
      return { ok: true, plan: input.learningGraphPlan, targetSelection: null };
    }
    if (!graphPlanService || typeof graphPlanService.createPlan !== "function") {
      return unavailable("learning_graph_plan_service_unavailable", { stage: "plan" });
    }
    const targetResult = planInputWithDefaultTarget(input, policy);
    const plan = await graphPlanService.createPlan(targetResult.planInput);
    if (!plan?.ok) return unavailable(plan?.error || "learning_graph_plan_failed", { stage: "plan", planResult: plan || null });
    return { ok: true, plan, targetSelection: targetResult.targetSelection };
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

  function markRecommendationAccepted(targetSelection = null, output = {}) {
    if (!targetSelection?.ok) return null;
    if (cleanString(targetSelection.selectionMode) !== "recommendation") return null;
    if (!nextTargetService || typeof nextTargetService.markRecommendationAccepted !== "function") {
      return unavailable("learning_card_recommendation_acceptance_unavailable", { stage: "recommendation_acceptance" });
    }
    try {
      return nextTargetService.markRecommendationAccepted(targetSelection, output);
    } catch (err) {
      return unavailable(cleanString(err.message || err) || "learning_card_recommendation_acceptance_failed", {
        stage: "recommendation_acceptance"
      });
    }
  }

  function resolveRubricPolicy(input = {}, plan = {}, policy = {}) {
    if (input.rubricPolicy) return input.rubricPolicy;
    if (policy.recipe?.rubricPolicy) return policy.recipe.rubricPolicy;
    if (!rubricPolicyService || typeof rubricPolicyService.resolveRubricPolicy !== "function") return null;
    const firstCard = firstPlanCard(plan);
    const resolved = rubricPolicyService.resolveRubricPolicy(Object.assign({}, input, {
      recipeId: policy.recipeId || input.recipeId || input.recipe_id,
      domain: input.domain || plan.domain,
      subject: input.subject || plan.subject,
      subjectId: input.subjectId || input.subject_id,
      cardRole: input.cardRole || input.card_role || firstCard.cardRole,
      completionPolicy: input.completionPolicy || input.completion_policy
    }));
    return resolved?.ok ? resolved.policy : null;
  }

  async function generateCard(input = {}) {
    const policy = normalizeGenerationInput(input);
    if (!policy?.ok) return unavailable(policy?.error || "learning_card_generation_recipe_policy_failed", { stage: "recipe", recipePolicy: policy || null });
    const initialInput = policy.input || input;
    const initialProvisioning = resolveTargetProvisioning(initialInput);
    if (!initialProvisioning?.ok) return initialProvisioning;
    const normalizedInput = inputWithProvisioning(initialInput, initialProvisioning);
    const resolvedPlan = await resolvePlan(normalizedInput, policy);
    if (!resolvedPlan?.ok) return resolvedPlan;
    const plan = resolvedPlan.plan;
    const planProvisioning = resolveTargetProvisioning(normalizedInput, plan);
    if (!planProvisioning?.ok) return planProvisioning;
    const targetSelection = resolvedPlan.targetSelection || null;
    const history = resolveHistory(normalizedInput, plan);
    if (!history?.ok) return history;
    if (!authoringService || typeof authoringService.authorCard !== "function") {
      return unavailable("learning_card_authoring_service_unavailable", { stage: "authoring" });
    }
    const firstCard = firstPlanCard(plan);
    const graphSources = graphSourceSummaries(graphRepository, plan);
    const sourceSummaries = graphSources.concat(asArray(normalizedInput.sourceSummaries || normalizedInput.source_summaries)).slice(0, 12);
    const selectedStrategy = targetSelection?.nextCardStrategy?.ok ? targetSelection.nextCardStrategy : null;
    const computedStrategy = nextCardStrategyService && typeof nextCardStrategyService.chooseNextCardStrategy === "function"
      ? nextCardStrategyService.chooseNextCardStrategy({
        masterySummary: history.masterySummary,
        recentExperienceSignals: history.recentExperienceSignals,
        recentTrajectory: history.recentTrajectory,
        targetNodeIds: planTargetNodeIds(plan)
      })
      : null;
    const nextCardStrategy = selectedStrategy || computedStrategy || normalizedInput.nextCardStrategy || normalizedInput.next_card_strategy || null;
    const rubricPolicy = resolveRubricPolicy(normalizedInput, plan, policy);
    const authoring = await authoringService.authorCard({
      learningGraphPlan: plan,
      learnerSummary: history.learnerSummary,
      masterySummary: history.masterySummary,
      recentExperienceSignals: history.recentExperienceSignals,
      recentTrajectory: history.recentTrajectory,
      nextCardStrategy,
      recipeId: policy.recipeId || normalizedInput.recipeId || normalizedInput.recipe_id,
      domain: normalizedInput.domain || plan.domain,
      subject: normalizedInput.subject || plan.subject,
      rubricPolicy,
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
    const recommendationAcceptance = markRecommendationAccepted(targetSelection, {
      generatedTaskCardId: authoring.published?.taskCardId,
      generatedLearningGraphPlanId: plan.learningGraphPlanId,
      acceptedAt: new Date().toISOString()
    });
    return {
      ok: true,
      source: "growth-learning-card-generation-service",
      recipeId: policy.recipeId || cleanString(normalizedInput.recipeId || normalizedInput.recipe_id),
      targetProvisioning: {
        ok: true,
        mode: cleanString(planProvisioning.mode || initialProvisioning.mode),
        selectedDomainPackId: cleanString(planProvisioning.selectedDomainPackId || initialProvisioning.selectedDomainPackId),
        selectedDomain: cleanString(planProvisioning.selectedDomain || initialProvisioning.selectedDomain),
        selectedSubject: cleanString(planProvisioning.selectedSubject || initialProvisioning.selectedSubject)
      },
      learningGraphPlan: plan,
      historySummary: normalizeResultHistory(history),
      nextCardStrategy,
      recommendationAcceptance,
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
