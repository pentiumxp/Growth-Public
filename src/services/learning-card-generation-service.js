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
    targetNodeId: input.targetNodeId || input.target_node_id,
    targetNodeIds: input.targetNodeIds || input.target_node_ids,
    cardRole: input.cardRole || input.card_role,
    assessmentCoverageNodeIds: input.assessmentCoverageNodeIds || input.assessment_coverage_node_ids || input.assessmentCoverage || input.assessment_coverage,
    difficultyBand: input.difficultyBand || input.difficulty_band
  };
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
  const nextCardStrategyService = options.nextCardStrategyService;
  const authoringService = options.authoringService;

  async function resolvePlan(input = {}) {
    if (input.learningGraphPlan?.learningGraphPlanId) return input.learningGraphPlan;
    if (!graphPlanService || typeof graphPlanService.createPlan !== "function") {
      return unavailable("learning_graph_plan_service_unavailable", { stage: "plan" });
    }
    const plan = await graphPlanService.createPlan(normalizePlanInput(input));
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
    const plan = await resolvePlan(input);
    if (!plan?.ok) return plan;
    const history = resolveHistory(input, plan);
    if (!history?.ok) return history;
    if (!authoringService || typeof authoringService.authorCard !== "function") {
      return unavailable("learning_card_authoring_service_unavailable", { stage: "authoring" });
    }
    const firstCard = firstPlanCard(plan);
    const graphSources = graphSourceSummaries(graphRepository, plan);
    const sourceSummaries = graphSources.concat(asArray(input.sourceSummaries || input.source_summaries)).slice(0, 12);
    const nextCardStrategy = nextCardStrategyService && typeof nextCardStrategyService.chooseNextCardStrategy === "function"
      ? nextCardStrategyService.chooseNextCardStrategy({
        masterySummary: history.masterySummary,
        recentExperienceSignals: history.recentExperienceSignals,
        recentTrajectory: history.recentTrajectory,
        targetNodeIds: planTargetNodeIds(plan)
      })
      : input.nextCardStrategy || input.next_card_strategy || null;
    const authoring = await authoringService.authorCard({
      learningGraphPlan: plan,
      learnerSummary: history.learnerSummary,
      masterySummary: history.masterySummary,
      recentExperienceSignals: history.recentExperienceSignals,
      recentTrajectory: history.recentTrajectory,
      nextCardStrategy,
      cardRole: input.cardRole || input.card_role || firstCard.cardRole,
      difficultyBand: input.difficultyBand || input.difficulty_band || firstCard.difficultyBand,
      evidenceRequirements: input.evidenceRequirements || input.evidence_requirements || firstCard.evidenceRequired,
      cardSchemaVersion: input.cardSchemaVersion || input.card_schema_version || "growth.card.authoring.v1",
      sourceSummaries,
      generationKey: input.generationKey || input.generation_key,
      taskCardId: input.taskCardId || input.task_card_id,
      stageAssessmentCycleId: input.stageAssessmentCycleId || input.stage_assessment_cycle_id,
      activationState: input.activationState || input.activation_state,
      activationReason: input.activationReason || input.activation_reason,
      activationSource: input.activationSource || input.activation_source,
      cooldownUntil: input.cooldownUntil || input.cooldown_until
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
