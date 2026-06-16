"use strict";

const SOURCE = "growth-learning-recommendation-lifecycle-service";
const SCHEMA_VERSION = "growth.recommendationLifecycle.v1";
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;

function cleanString(value, max = 240) {
  return String(value ?? "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(value = []) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  return Array.from(new Set(values.map((item) => cleanString(item, 160)).filter(Boolean)));
}

function clampLimit(value, fallback = 12) {
  const numeric = Number(value || fallback);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.min(50, Math.round(numeric)));
}

function scanPrivacy(value, path = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, `${path}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacy(child, childPath, findings);
  }
  return findings;
}

function publicScope(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id, 120);
  const status = uniqueStrings(input.statuses || input.status || input.recommendationStatuses || input.recommendation_statuses)
    .map((item) => item.toLowerCase())
    .slice(0, 8);
  return {
    workspaceId,
    learnerId: cleanString(input.learnerId || input.learner_id || workspaceId, 120),
    programId: cleanString(input.programId || input.program_id, 120),
    trajectoryId: cleanString(input.trajectoryId || input.trajectory_id || input.id, 140),
    taskCardId: cleanString(input.taskCardId || input.task_card_id || input.sourceTaskCardId || input.source_task_card_id, 140),
    sourceEvaluationId: cleanString(input.sourceEvaluationId || input.source_evaluation_id || input.evaluationId || input.evaluation_id, 140),
    generatedTaskCardId: cleanString(input.generatedTaskCardId || input.generated_task_card_id, 140),
    generatedLearningGraphPlanId: cleanString(input.generatedLearningGraphPlanId || input.generated_learning_graph_plan_id || input.learningGraphPlanId || input.learning_graph_plan_id, 140),
    targetNodeIds: uniqueStrings(input.targetNodeIds || input.target_node_ids || input.nodeIds || input.node_ids).slice(0, 12),
    status,
    limit: clampLimit(input.limit || input.trajectoryLimit || input.trajectory_limit, 12)
  };
}

function recommendationStatus(recommendation = {}) {
  const status = cleanString(recommendation.status || recommendation.recommendationStatus, 80).toLowerCase();
  if (status) return status;
  return recommendation && typeof recommendation === "object" && Object.keys(recommendation).length ? "pending" : "missing";
}

function recommendationTargetNodeIds(trajectory = {}, recommendation = {}) {
  const fromRecommendation = uniqueStrings(recommendation.targetNodeIds || recommendation.target_node_ids || recommendation.nodeIds || recommendation.node_ids);
  return (fromRecommendation.length ? fromRecommendation : uniqueStrings(trajectory.targetNodeIds)).slice(0, 12);
}

function matchesSelectors(item = {}, scope = {}) {
  if (scope.trajectoryId && item.trajectoryId !== scope.trajectoryId) return false;
  if (scope.taskCardId && item.sourceTaskCardId !== scope.taskCardId) return false;
  if (scope.sourceEvaluationId && item.sourceEvaluationId !== scope.sourceEvaluationId) return false;
  if (scope.generatedTaskCardId && item.generatedTaskCardId !== scope.generatedTaskCardId) return false;
  if (scope.generatedLearningGraphPlanId && item.generatedLearningGraphPlanId !== scope.generatedLearningGraphPlanId) return false;
  if (scope.status.length && !scope.status.includes(item.status)) return false;
  if (scope.targetNodeIds.length && !item.targetNodeIds.some((nodeId) => scope.targetNodeIds.includes(nodeId))) return false;
  return true;
}

function lifecycleItem(trajectory = {}) {
  const recommendation = trajectory.nextRecommendation && typeof trajectory.nextRecommendation === "object"
    ? trajectory.nextRecommendation
    : {};
  const targetNodeIds = recommendationTargetNodeIds(trajectory, recommendation);
  const status = recommendationStatus(recommendation);
  return {
    trajectoryId: cleanString(trajectory.id, 140),
    workspaceId: cleanString(trajectory.workspaceId, 120),
    learnerId: cleanString(trajectory.learnerId, 120),
    programId: cleanString(trajectory.programId, 120),
    sourceTaskCardId: cleanString(recommendation.sourceTaskCardId || trajectory.taskCardId, 140),
    sourceEvaluationId: cleanString(recommendation.sourceEvaluationId || trajectory.sourceEvaluationId, 140),
    generatedTaskCardId: cleanString(recommendation.generatedTaskCardId || recommendation.generated_task_card_id, 140),
    generatedLearningGraphPlanId: cleanString(recommendation.generatedLearningGraphPlanId || recommendation.generated_learning_graph_plan_id || recommendation.learningGraphPlanId || recommendation.learning_graph_plan_id, 140),
    status,
    strategy: cleanString(recommendation.strategy || trajectory.strategy, 80),
    cardRole: cleanString(recommendation.cardRole || recommendation.card_role, 80),
    difficultyBand: cleanString(recommendation.difficultyBand || recommendation.difficulty_band || trajectory.difficultyBand, 80),
    supportLevel: cleanString(recommendation.supportLevel || recommendation.support_level, 80),
    targetNodeIds,
    targetNodeCount: targetNodeIds.length,
    reason: cleanString(recommendation.reason, 220),
    confirmedStrengthCount: asArray(trajectory.confirmedStrengths).length,
    remainingWeaknessCount: asArray(trajectory.remainingWeaknesses).length,
    masteryChangeCount: asArray(trajectory.masteryChanges).length,
    createdAt: cleanString(trajectory.createdAt, 80),
    updatedAt: cleanString(trajectory.updatedAt, 80),
    statusUpdatedAt: cleanString(recommendation.statusUpdatedAt || recommendation.status_updated_at, 80),
    acceptedAt: cleanString(recommendation.acceptedAt || recommendation.accepted_at, 80),
    supersededAt: cleanString(recommendation.supersededAt || recommendation.superseded_at, 80),
    supersededByTrajectoryId: cleanString(recommendation.supersededByTrajectoryId || recommendation.superseded_by_trajectory_id, 140),
    summaryOnly: true
  };
}

function statusCounts(items = []) {
  return items.reduce((acc, item) => {
    const status = item.status || "missing";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
}

function buildSummary(items = []) {
  const countsByStatus = statusCounts(items);
  const latest = items[0] || {};
  return {
    schemaVersion: "growth.recommendationLifecycle.summary.v1",
    summaryOnly: true,
    lifecycleCount: items.length,
    pendingCount: countsByStatus.pending || 0,
    acceptedCount: countsByStatus.accepted || 0,
    supersededCount: countsByStatus.superseded || 0,
    missingCount: countsByStatus.missing || 0,
    statusCounts: countsByStatus,
    latestTrajectoryId: cleanString(latest.trajectoryId, 140),
    latestStatus: cleanString(latest.status, 80),
    latestTargetNodeIds: uniqueStrings(latest.targetNodeIds).slice(0, 12),
    hasPending: Boolean(countsByStatus.pending),
    hasAccepted: Boolean(countsByStatus.accepted),
    hasSuperseded: Boolean(countsByStatus.superseded)
  };
}

function createLearningRecommendationLifecycleService(options = {}) {
  const repository = options.repository || null;

  function listLifecycle(input = {}) {
    const scope = publicScope(input);
    if (!scope.workspaceId) {
      return { ok: false, source: SOURCE, error: "recommendation_lifecycle_workspace_required" };
    }
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) {
      return {
        ok: false,
        source: SOURCE,
        error: "recommendation_lifecycle_privacy_failed",
        privacyFindings
      };
    }
    if (!repository || typeof repository.listRecentTrajectory !== "function") {
      return { ok: false, source: SOURCE, available: false, error: "recommendation_lifecycle_repository_unavailable" };
    }
    const trajectories = repository.listRecentTrajectory(Object.assign({}, scope, {
      trajectoryLimit: Math.max(scope.limit, 24)
    }));
    const lifecycle = asArray(trajectories)
      .map(lifecycleItem)
      .filter((item) => item.trajectoryId)
      .filter((item) => matchesSelectors(item, scope))
      .slice(0, scope.limit);
    return {
      ok: true,
      source: SOURCE,
      schemaVersion: SCHEMA_VERSION,
      privacyClass: "summary_only",
      summaryOnly: true,
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      programId: scope.programId,
      filters: {
        trajectoryId: scope.trajectoryId,
        taskCardId: scope.taskCardId,
        sourceEvaluationId: scope.sourceEvaluationId,
        generatedTaskCardId: scope.generatedTaskCardId,
        generatedLearningGraphPlanId: scope.generatedLearningGraphPlanId,
        status: scope.status,
        targetNodeIds: scope.targetNodeIds,
        limit: scope.limit
      },
      count: lifecycle.length,
      lifecycle,
      summary: buildSummary(lifecycle),
      writePerformed: false,
      writesPerformed: false
    };
  }

  return {
    listLifecycle
  };
}

module.exports = {
  SCHEMA_VERSION,
  createLearningRecommendationLifecycleService,
  publicScope,
  lifecycleItem
};
