const fs = require("node:fs");
const { bearerFrom, readJson, routeError, sendJson } = require("./http-utils");
const { listGrowthMcpSchemas } = require("../mcp/growth-mcp-schemas");
const {
  UI_EVIDENCE_COLLECTION_TASKS
} = require("../services/learning-automation-ui-evidence-task-registry");

const DEFAULT_JSON_LIMIT_BYTES = 1024 * 1024;
const SUBMISSION_JSON_LIMIT_BYTES = 16 * 1024 * 1024;

function safeHeaderValue(value) {
  return String(value || "").replace(/[\r\n"]/g, "_");
}

function streamAudio(response, audio) {
  const fileName = safeHeaderValue(audio.name || "learning-audio");
  const headers = {
    "Content-Type": audio.mime || "application/octet-stream",
    "Content-Disposition": `inline; filename="${fileName}"`,
    "Cache-Control": "private, max-age=60"
  };
  if (audio.kind === "blob") {
    headers["Content-Length"] = audio.content.length;
    response.writeHead(200, headers);
    response.end(audio.content);
    return true;
  }
  if (audio.kind === "file" && audio.filePath && audio.stat) {
    headers["Content-Length"] = audio.stat.size;
    response.writeHead(200, headers);
    fs.createReadStream(audio.filePath).on("error", () => response.end()).pipe(response);
    return true;
  }
  return false;
}

function requestedWorkspaceId(request, url, fallback = "growth:local-dev") {
  return String(
    url.searchParams.get("workspace_id")
    || url.searchParams.get("workspaceId")
    || request.headers["x-hermes-plugin-workspace-id"]
    || fallback
  );
}

function requestedActorRole(request) {
  return String(request.headers["x-hermes-plugin-actor-role"] || "").trim().toLowerCase();
}

function truthy(value) {
  return ["1", "true", "yes", "on", "pass", "ready"].includes(String(value || "").trim().toLowerCase());
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function requestedWritableWorkspaceId(body, url) {
  return String(body.workspace_id || body.workspaceId || url.searchParams.get("workspace_id") || url.searchParams.get("workspaceId") || "");
}

function serviceWorkspaceIdFromAuthorization(authorized) {
  return authorized.hermes_workspace_id || String(authorized.workspace_id || "").replace(/^growth:/, "");
}

function readableTargetFromRequest(request, url, services) {
  const currentWorkspaceId = String(
    request.headers["x-hermes-plugin-workspace-id"]
    || url.searchParams.get("currentWorkspaceId")
    || url.searchParams.get("current_workspace_id")
    || url.searchParams.get("workspaceId")
    || url.searchParams.get("workspace_id")
    || ""
  );
  const targetWorkspaceId = String(
    url.searchParams.get("targetWorkspaceId")
    || url.searchParams.get("target_workspace_id")
    || url.searchParams.get("workspaceId")
    || url.searchParams.get("workspace_id")
    || currentWorkspaceId
  ).replace(/^growth:/, "");
  const targetsResult = services.pluginService.viewTargets({
    actorRole: requestedActorRole(request),
    currentWorkspaceId
  });
  const target = (targetsResult.targets || []).find((item) => String(item.workspaceId || "") === targetWorkspaceId);
  if (!target) {
    throw routeError("growth_target_not_visible", "Growth target is not visible to this actor", 403);
  }
  return target;
}

function visibleTargetByWorkspace(request, url, services, workspaceId) {
  const currentWorkspaceId = String(
    request.headers["x-hermes-plugin-workspace-id"]
    || url.searchParams.get("currentWorkspaceId")
    || url.searchParams.get("current_workspace_id")
    || ""
  );
  const targetWorkspaceId = String(workspaceId || "").replace(/^growth:/, "");
  const targetsResult = services.pluginService.viewTargets({
    actorRole: requestedActorRole(request),
    currentWorkspaceId
  });
  const target = (targetsResult.targets || []).find((item) => String(item.workspaceId || "") === targetWorkspaceId);
  if (!target) {
    throw routeError("growth_target_not_visible", "Growth target is not visible to this actor", 403);
  }
  return target;
}

function authorizeWritableWorkspace(request, url, body, services) {
  const workspaceId = requestedWritableWorkspaceId(body, url);
  if (requestedActorRole(request) === "owner") {
    const currentWorkspaceId = requestedWorkspaceId(request, url, "");
    const targetWorkspaceId = String(workspaceId || "").replace(/^growth:/, "");
    const targetsResult = services.pluginService.viewTargets({
      actorRole: "owner",
      currentWorkspaceId
    });
    const target = (targetsResult.targets || []).find((item) => String(item.workspaceId || "") === targetWorkspaceId);
    if (!target) {
      throw routeError("growth_target_not_visible", "Growth target is not visible to this actor", 403);
    }
    services.pluginService.authorizeWorkspace({
      authorizationToken: bearerFrom(request.headers),
      workspaceId: currentWorkspaceId
    });
    return String(target.workspaceId || "").replace(/^growth:/, "");
  }
  const authorized = services.pluginService.authorizeWorkspace({
    authorizationToken: bearerFrom(request.headers),
    workspaceId
  });
  return serviceWorkspaceIdFromAuthorization(authorized);
}

function normalizeGraphPlanInput(body, workspaceId) {
  return {
    learningGraphPlanId: body.learningGraphPlanId || body.learning_graph_plan_id,
    learnerId: body.learnerId || body.learner_id,
    workspaceId,
    programId: body.programId || body.program_id,
    targetNodeId: body.targetNodeId || body.target_node_id,
    targetNodeIds: body.targetNodeIds || body.target_node_ids,
    cardRole: body.cardRole || body.card_role,
    assessmentCoverageNodeIds: body.assessmentCoverageNodeIds || body.assessment_coverage_node_ids || body.assessmentCoverage || body.assessment_coverage,
    difficultyBand: body.difficultyBand || body.difficulty_band
  };
}

function normalizeCardGraphBindingInput(body, workspaceId, taskCardId) {
  return {
    bindingId: body.bindingId || body.binding_id,
    taskCardId,
    workspaceId,
    learningGraphPlanId: body.learningGraphPlanId || body.learning_graph_plan_id,
    nodeIds: body.nodeIds || body.node_ids,
    cardRole: body.cardRole || body.card_role,
    assessmentCoverage: body.assessmentCoverage || body.assessment_coverage,
    repairMetadata: body.repairMetadata || body.repair_metadata
  };
}

function normalizeCardGenerationInput(body, workspaceId) {
  return {
    learningGraphPlanId: body.learningGraphPlanId || body.learning_graph_plan_id,
    learningGraphPlan: body.learningGraphPlan || body.learning_graph_plan,
    learnerId: body.learnerId || body.learner_id,
    workspaceId,
    programId: body.programId || body.program_id,
    recipeId: body.recipeId || body.recipe_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    targetNodeId: body.targetNodeId || body.target_node_id,
    targetNodeIds: body.targetNodeIds || body.target_node_ids,
    cardRole: body.cardRole || body.card_role,
    difficultyBand: body.difficultyBand || body.difficulty_band,
    assessmentCoverageNodeIds: body.assessmentCoverageNodeIds || body.assessment_coverage_node_ids || body.assessmentCoverage || body.assessment_coverage,
    evidenceRequirements: body.evidenceRequirements || body.evidence_requirements,
    sourceSummaries: body.sourceSummaries || body.source_summaries,
    cardSchemaVersion: body.cardSchemaVersion || body.card_schema_version,
    generationKey: body.generationKey || body.generation_key,
    taskCardId: body.taskCardId || body.task_card_id,
    stageAssessmentCycleId: body.stageAssessmentCycleId || body.stage_assessment_cycle_id,
    activationState: body.activationState || body.activation_state,
    activationReason: body.activationReason || body.activation_reason,
    activationSource: body.activationSource || body.activation_source,
    cooldownUntil: body.cooldownUntil || body.cooldown_until
  };
}

function normalizeLearningPlanDraftInput(body, workspaceId, request, url) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || workspaceId,
    programId: body.programId || body.program_id,
    horizon: body.horizon || "daily_plan",
    domain: body.domain,
    subject: body.subject,
    availableMinutes: body.availableMinutes || body.available_minutes,
    allowedCardRoles: body.allowedCardRoles || body.allowed_card_roles,
    lowPressure: body.lowPressure !== undefined ? body.lowPressure : body.low_pressure,
    targetNodeId: body.targetNodeId || body.target_node_id,
    targetNodeIds: body.targetNodeIds || body.target_node_ids,
    domainPackId: body.domainPackId || body.domain_pack_id,
    requestedBy: String(request.headers["x-hermes-plugin-workspace-id"] || requestedWorkspaceId(request, url, ""))
  };
}

function normalizeCardGenerationContextInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    growthWorkspaceId: target.growthWorkspaceId,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    domain: url.searchParams.get("domain") || "",
    subject: url.searchParams.get("subject") || "",
    domainPackId: url.searchParams.get("domainPackId") || url.searchParams.get("domain_pack_id") || "",
    horizon: url.searchParams.get("horizon") || "",
    availableMinutes: url.searchParams.get("availableMinutes") || url.searchParams.get("available_minutes") || "",
    cardRole: url.searchParams.get("cardRole") || url.searchParams.get("card_role") || "",
    difficultyBand: url.searchParams.get("difficultyBand") || url.searchParams.get("difficulty_band") || ""
  };
}

function normalizeDailyLoopQueryInput(url, target, request) {
  const subject = url.searchParams.get("subject") || "";
  const targetNodeIds = csvStrings(url.searchParams.get("targetNodeIds") || url.searchParams.get("target_node_ids") || "");
  const assessmentCoverageNodeIds = csvStrings(url.searchParams.get("assessmentCoverageNodeIds") || url.searchParams.get("assessment_coverage_node_ids") || url.searchParams.get("assessmentCoverage") || url.searchParams.get("assessment_coverage") || "");
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    growthWorkspaceId: target.growthWorkspaceId,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    domainPackId: url.searchParams.get("domainPackId") || url.searchParams.get("domain_pack_id") || "",
    domain: url.searchParams.get("domain") || "",
    subject,
    subjectId: url.searchParams.get("subjectId") || url.searchParams.get("subject_id") || subject,
    capabilityClusterId: url.searchParams.get("capabilityClusterId") || url.searchParams.get("capability_cluster_id") || "",
    horizon: url.searchParams.get("horizon") || "daily_plan",
    availableMinutes: url.searchParams.get("availableMinutes") || url.searchParams.get("available_minutes") || "",
    targetNodeIds,
    assessmentCoverageNodeIds: assessmentCoverageNodeIds.length ? assessmentCoverageNodeIds : targetNodeIds,
    planDraftId: url.searchParams.get("planDraftId") || url.searchParams.get("plan_draft_id") || "",
    itemId: url.searchParams.get("itemId") || url.searchParams.get("item_id") || url.searchParams.get("selectedItemId") || url.searchParams.get("selected_item_id") || "",
    taskCardId: url.searchParams.get("taskCardId") || url.searchParams.get("task_card_id") || "",
    evaluationId: url.searchParams.get("evaluationId") || url.searchParams.get("evaluation_id") || "",
    profileDeltaId: url.searchParams.get("profileDeltaId") || url.searchParams.get("profile_delta_id") || "",
    evidenceId: url.searchParams.get("evidenceId") || url.searchParams.get("evidence_id") || "",
    correctionId: url.searchParams.get("correctionId") || url.searchParams.get("correction_id") || "",
    sourceId: url.searchParams.get("sourceId") || url.searchParams.get("source_id") || "",
    limit: url.searchParams.get("limit") || "",
    requestedBy: String(request.headers["x-hermes-plugin-workspace-id"] || requestedWorkspaceId(request, url, ""))
  };
}

function normalizePlannerReadinessQueryInput(url, target, request) {
  return normalizeDailyLoopQueryInput(url, target, request);
}

function normalizeStageCheckpointControlsInput(url, target, request) {
  const targetNodeIds = csvStrings(url.searchParams.get("targetNodeIds") || url.searchParams.get("target_node_ids") || "");
  const assessmentCoverageNodeIds = csvStrings(
    url.searchParams.get("assessmentCoverageNodeIds")
    || url.searchParams.get("assessment_coverage_node_ids")
    || url.searchParams.get("assessmentCoverage")
    || url.searchParams.get("assessment_coverage")
    || ""
  );
  const targetNodeId = url.searchParams.get("targetNodeId")
    || url.searchParams.get("target_node_id")
    || assessmentCoverageNodeIds[0]
    || targetNodeIds[0]
    || "";
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    growthWorkspaceId: target.growthWorkspaceId,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    domainPackId: url.searchParams.get("domainPackId") || url.searchParams.get("domain_pack_id") || "",
    domain: url.searchParams.get("domain") || "",
    subject: url.searchParams.get("subject") || "",
    subjectId: url.searchParams.get("subjectId") || url.searchParams.get("subject_id") || url.searchParams.get("subject") || "",
    capabilityClusterId: url.searchParams.get("capabilityClusterId") || url.searchParams.get("capability_cluster_id") || "",
    targetNodeId,
    targetNodeIds: targetNodeIds.length ? targetNodeIds : undefined,
    assessmentCoverageNodeIds: assessmentCoverageNodeIds.length ? assessmentCoverageNodeIds : targetNodeIds,
    requestedBy: String(request.headers["x-hermes-plugin-workspace-id"] || requestedWorkspaceId(request, url, ""))
  };
}

function normalizeDailyLoopBodyInput(body, workspaceId, target, request, url, extra = {}) {
  const learnerSummary = body.learnerSummary || body.learner_summary;
  const normalized = Object.assign({
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    growthWorkspaceId: target?.growthWorkspaceId,
    programId: body.programId || body.program_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    horizon: body.horizon || "daily_plan",
    availableMinutes: body.availableMinutes || body.available_minutes,
    allowedCardRoles: body.allowedCardRoles || body.allowed_card_roles,
    lowPressure: body.lowPressure !== undefined ? body.lowPressure : body.low_pressure,
    targetNodeId: body.targetNodeId || body.target_node_id,
    targetNodeIds: body.targetNodeIds || body.target_node_ids || body.nodeIds || body.node_ids,
    planDraftId: body.planDraftId || body.plan_draft_id,
    itemId: body.itemId || body.item_id || body.selectedItemId || body.selected_item_id,
    generationKey: body.generationKey || body.generation_key,
    cardSchemaVersion: body.cardSchemaVersion || body.card_schema_version,
    taskCardId: body.taskCardId || body.task_card_id,
    evaluationId: body.evaluationId || body.evaluation_id,
    profileDeltaId: body.profileDeltaId || body.profile_delta_id,
    evidenceId: body.evidenceId || body.evidence_id,
    correctionId: body.correctionId || body.correction_id,
    sourceId: body.sourceId || body.source_id,
    limit: body.limit,
    requestedBy: requestedWorkspaceId(request, url, "")
  }, extra);
  if (learnerSummary && typeof learnerSummary === "object" && !Array.isArray(learnerSummary)) {
    normalized.learnerSummary = learnerSummary;
  }
  return normalized;
}

function normalizeOperatingLoopBodyInput(body, workspaceId, target, request, url) {
  return normalizeDailyLoopBodyInput(body, workspaceId, target, request, url, {
    operation: body.operation || body.action || body.nextAction || body.next_action,
    action: body.action || body.nextAction || body.next_action || body.operation,
    subjectId: body.subjectId || body.subject_id || body.subject,
    capabilityClusterId: body.capabilityClusterId || body.capability_cluster_id,
    assessmentCoverageNodeIds: body.assessmentCoverageNodeIds
      || body.assessment_coverage_node_ids
      || body.assessmentCoverage
      || body.assessment_coverage
      || body.targetNodeIds
      || body.target_node_ids
      || body.nodeIds
      || body.node_ids,
    allowStageActivation: body.allowStageActivation === true || body.allow_stage_activation === true,
    confirmStageAssessment: body.confirmStageAssessment === true || body.confirm_stage_assessment === true,
    activationReason: body.activationReason || body.activation_reason,
    activationSource: body.activationSource || body.activation_source
  });
}

function normalizeOperatingLoopRunsQueryInput(url, target, request) {
  return Object.assign(normalizeDailyLoopQueryInput(url, target, request), {
    operation: url.searchParams.get("operation") || "",
    action: url.searchParams.get("action") || url.searchParams.get("nextAction") || url.searchParams.get("next_action") || "",
    status: url.searchParams.get("status") || "",
    runId: url.searchParams.get("runId") || url.searchParams.get("run_id") || url.searchParams.get("operatingLoopRunId") || url.searchParams.get("operating_loop_run_id") || "",
    selectedItemId: url.searchParams.get("selectedItemId") || url.searchParams.get("selected_item_id") || "",
    stageAssessmentCycleId: url.searchParams.get("stageAssessmentCycleId") || url.searchParams.get("stage_assessment_cycle_id") || ""
  });
}

function normalizeProfileDeltaAuditInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    profileDeltaId: url.searchParams.get("profileDeltaId") || url.searchParams.get("profile_delta_id") || "",
    taskCardId: url.searchParams.get("taskCardId") || url.searchParams.get("task_card_id") || "",
    evaluationId: url.searchParams.get("evaluationId") || url.searchParams.get("evaluation_id") || "",
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeEvidenceAuditInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    evidenceId: url.searchParams.get("evidenceId") || url.searchParams.get("evidence_id") || "",
    sourceType: url.searchParams.get("sourceType") || url.searchParams.get("source_type") || "",
    sourceId: url.searchParams.get("sourceId") || url.searchParams.get("source_id") || "",
    taskCardId: url.searchParams.get("taskCardId") || url.searchParams.get("task_card_id") || url.searchParams.get("sourceTaskCardId") || "",
    cardRole: url.searchParams.get("cardRole") || url.searchParams.get("card_role") || "",
    status: url.searchParams.get("status") || "",
    targetNodeIds: csvStrings(url.searchParams.get("targetNodeIds") || url.searchParams.get("target_node_ids") || url.searchParams.get("graphNodeIds") || url.searchParams.get("nodeIds") || ""),
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeLearningPlanAuditInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    status: url.searchParams.get("status") || "",
    targetNodeIds: csvStrings(url.searchParams.get("targetNodeIds") || url.searchParams.get("target_node_ids") || url.searchParams.get("nodeIds") || ""),
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeLearningCycleAuditInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    planDraftId: url.searchParams.get("planDraftId") || url.searchParams.get("plan_draft_id") || "",
    taskCardId: url.searchParams.get("taskCardId") || url.searchParams.get("task_card_id") || url.searchParams.get("sourceTaskCardId") || "",
    evaluationId: url.searchParams.get("evaluationId") || url.searchParams.get("evaluation_id") || "",
    profileDeltaId: url.searchParams.get("profileDeltaId") || url.searchParams.get("profile_delta_id") || "",
    evidenceId: url.searchParams.get("evidenceId") || url.searchParams.get("evidence_id") || "",
    correctionId: url.searchParams.get("correctionId") || url.searchParams.get("correction_id") || "",
    sourceId: url.searchParams.get("sourceId") || url.searchParams.get("source_id") || "",
    targetNodeIds: csvStrings(url.searchParams.get("targetNodeIds") || url.searchParams.get("target_node_ids") || url.searchParams.get("nodeIds") || ""),
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeLearningCycleHistoryInput(url, target) {
  return Object.assign(normalizeLearningCycleAuditInput(url, target), {
    domainPackId: url.searchParams.get("domainPackId") || url.searchParams.get("domain_pack_id") || "",
    domain: url.searchParams.get("domain") || "",
    subject: url.searchParams.get("subject") || "",
    includeCompleteness: url.searchParams.get("includeCompleteness") || url.searchParams.get("include_completeness") || ""
  });
}

function normalizeProfileFeedbackInput(url, target, request) {
  return Object.assign(normalizeLearningCycleHistoryInput(url, target), {
    horizon: url.searchParams.get("horizon") || "daily_plan",
    availableMinutes: url.searchParams.get("availableMinutes") || url.searchParams.get("available_minutes") || "",
    autoSelectCompletedCycle: truthy(url.searchParams.get("autoSelectCompletedCycle") || url.searchParams.get("auto_select_completed_cycle")),
    autoSelectLatestCompletedCycle: truthy(url.searchParams.get("autoSelectLatestCompletedCycle") || url.searchParams.get("auto_select_latest_completed_cycle")),
    requestedBy: String(request.headers["x-hermes-plugin-workspace-id"] || requestedWorkspaceId(request, url, ""))
  });
}

function normalizeRecommendationLifecycleInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    trajectoryId: url.searchParams.get("trajectoryId") || url.searchParams.get("trajectory_id") || url.searchParams.get("id") || "",
    taskCardId: url.searchParams.get("taskCardId") || url.searchParams.get("task_card_id") || url.searchParams.get("sourceTaskCardId") || url.searchParams.get("source_task_card_id") || "",
    sourceEvaluationId: url.searchParams.get("sourceEvaluationId") || url.searchParams.get("source_evaluation_id") || url.searchParams.get("evaluationId") || url.searchParams.get("evaluation_id") || "",
    generatedTaskCardId: url.searchParams.get("generatedTaskCardId") || url.searchParams.get("generated_task_card_id") || "",
    generatedLearningGraphPlanId: url.searchParams.get("generatedLearningGraphPlanId") || url.searchParams.get("generated_learning_graph_plan_id") || url.searchParams.get("learningGraphPlanId") || url.searchParams.get("learning_graph_plan_id") || "",
    status: url.searchParams.get("status") || "",
    targetNodeIds: csvStrings(url.searchParams.get("targetNodeIds") || url.searchParams.get("target_node_ids") || url.searchParams.get("nodeIds") || ""),
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeRecommendationLifecycleReviewInput(body, workspaceId, request, url) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || workspaceId,
    programId: body.programId || body.program_id || "",
    trajectoryId: body.trajectoryId || body.trajectory_id || body.id || "",
    taskCardId: body.taskCardId || body.task_card_id || body.sourceTaskCardId || body.source_task_card_id || "",
    sourceEvaluationId: body.sourceEvaluationId || body.source_evaluation_id || body.evaluationId || body.evaluation_id || "",
    status: body.status || body.decision || body.recommendationStatus || body.recommendation_status || "",
    decisionReasonCode: body.decisionReasonCode || body.decision_reason_code || body.reasonCode || body.reason_code || "",
    statusUpdatedAt: body.statusUpdatedAt || body.status_updated_at || body.reviewedAt || body.reviewed_at || "",
    reviewedBy: requestedWorkspaceId(request, url, "")
  };
}

function normalizeAutomationProposalListInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    status: url.searchParams.get("status") || "",
    planDraftId: url.searchParams.get("planDraftId") || url.searchParams.get("plan_draft_id") || "",
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeAutomationDigestListInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    domainPackId: url.searchParams.get("domainPackId") || url.searchParams.get("domain_pack_id") || "",
    domain: url.searchParams.get("domain") || "",
    subject: url.searchParams.get("subject") || "",
    horizon: url.searchParams.get("horizon") || "",
    status: url.searchParams.get("status") || "",
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeAutomationFailurePolicyListInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    domainPackId: url.searchParams.get("domainPackId") || url.searchParams.get("domain_pack_id") || "",
    domain: url.searchParams.get("domain") || "",
    subject: url.searchParams.get("subject") || "",
    horizon: url.searchParams.get("horizon") || "",
    status: url.searchParams.get("status") || "",
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeAutomationActionHandoffListInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    digestId: url.searchParams.get("digestId") || url.searchParams.get("digest_id") || "",
    domainPackId: url.searchParams.get("domainPackId") || url.searchParams.get("domain_pack_id") || "",
    domain: url.searchParams.get("domain") || "",
    subject: url.searchParams.get("subject") || "",
    horizon: url.searchParams.get("horizon") || "",
    status: url.searchParams.get("status") || "",
    deliveryStatus: url.searchParams.get("deliveryStatus") || url.searchParams.get("delivery_status") || "",
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeAutomationClosedLoopActionPlanInput(url, target, request) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    domainPackId: url.searchParams.get("domainPackId") || url.searchParams.get("domain_pack_id") || "",
    domain: url.searchParams.get("domain") || "",
    subject: url.searchParams.get("subject") || "",
    horizon: url.searchParams.get("horizon") || "daily_plan",
    availableMinutes: url.searchParams.get("availableMinutes") || url.searchParams.get("available_minutes") || "",
    targetNodeIds: csvStrings(url.searchParams.get("targetNodeIds") || url.searchParams.get("target_node_ids") || url.searchParams.get("nodeIds") || ""),
    sourceTargetNodeIds: csvStrings(url.searchParams.get("sourceTargetNodeIds") || url.searchParams.get("source_target_node_ids") || ""),
    cycleId: url.searchParams.get("cycleId") || url.searchParams.get("cycle_id") || "",
    sourcePlanDraftId: url.searchParams.get("sourcePlanDraftId") || url.searchParams.get("source_plan_draft_id") || url.searchParams.get("planDraftId") || url.searchParams.get("plan_draft_id") || "",
    sourceTaskCardId: url.searchParams.get("sourceTaskCardId") || url.searchParams.get("source_task_card_id") || url.searchParams.get("taskCardId") || url.searchParams.get("task_card_id") || "",
    sourceEvaluationId: url.searchParams.get("sourceEvaluationId") || url.searchParams.get("source_evaluation_id") || url.searchParams.get("evaluationId") || url.searchParams.get("evaluation_id") || "",
    profileDeltaId: url.searchParams.get("profileDeltaId") || url.searchParams.get("profile_delta_id") || "",
    evidenceId: url.searchParams.get("evidenceId") || url.searchParams.get("evidence_id") || "",
    correctionId: url.searchParams.get("correctionId") || url.searchParams.get("correction_id") || "",
    sourceId: url.searchParams.get("sourceId") || url.searchParams.get("source_id") || "",
    digestId: url.searchParams.get("digestId") || url.searchParams.get("digest_id") || "",
    handoffId: url.searchParams.get("handoffId") || url.searchParams.get("handoff_id") || "",
    proposalId: url.searchParams.get("proposalId") || url.searchParams.get("proposal_id") || "",
    selectedItemId: url.searchParams.get("selectedItemId") || url.searchParams.get("selected_item_id") || "",
    autoSelectCompletedCycle: truthy(url.searchParams.get("autoSelectCompletedCycle") || url.searchParams.get("auto_select_completed_cycle")),
    autoSelectLatestCompletedCycle: !["0", "false", "no", "off"].includes(
      String(url.searchParams.get("autoSelectLatestCompletedCycle") || url.searchParams.get("auto_select_latest_completed_cycle") || "").trim().toLowerCase()
    ),
    auditLimit: url.searchParams.get("auditLimit") || url.searchParams.get("audit_limit") || "",
    limit: url.searchParams.get("limit") || "",
    requestedBy: String(request.headers["x-hermes-plugin-workspace-id"] || requestedWorkspaceId(request, url, ""))
  };
}

function normalizeAutomationPlatformActionEvidenceInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    domainPackId: url.searchParams.get("domainPackId") || url.searchParams.get("domain_pack_id") || "",
    domain: url.searchParams.get("domain") || "",
    subject: url.searchParams.get("subject") || "",
    horizon: url.searchParams.get("horizon") || "daily_plan",
    actionHandoffId: url.searchParams.get("actionHandoffId") || url.searchParams.get("action_handoff_id") || url.searchParams.get("handoffId") || url.searchParams.get("handoff_id") || "",
    digestId: url.searchParams.get("digestId") || url.searchParams.get("digest_id") || "",
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeAutomationCentralVisualEvidenceInput(body = {}, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: body.learnerId || body.learner_id || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: body.programId || body.program_id || "",
    domainPackId: body.domainPackId || body.domain_pack_id || "",
    domain: body.domain || "",
    subject: body.subject || "",
    horizon: body.horizon || "daily_plan",
    pluginId: body.pluginId || body.plugin_id || "growth",
    scenario: body.scenario || "embedded-plugin-shell",
    centralVisualEvidence: body.centralVisualEvidence
      || body.central_visual_evidence
      || body.visualEvidence
      || body.visual_evidence
      || body.evidence
      || body.evidenceSummary
      || body.evidence_summary
  };
}

function normalizeAutomationProductionDeploymentEvidenceInput(body = {}, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: body.learnerId || body.learner_id || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: body.programId || body.program_id || "",
    domainPackId: body.domainPackId || body.domain_pack_id || "",
    domain: body.domain || "",
    subject: body.subject || "",
    horizon: body.horizon || "daily_plan",
    pluginId: body.pluginId || body.plugin_id || "growth",
    environment: body.environment || body.env || "macos_production",
    launchdLabel: body.launchdLabel || body.launchd_label || "com.hermesmobile.plugin.growth",
    productionDeploymentEvidence: body.productionDeploymentEvidence
      || body.production_deployment_evidence
      || body.deploymentEvidence
      || body.deployment_evidence
      || body.evidence
      || body.evidenceSummary
      || body.evidence_summary
  };
}

function normalizeAutomationUiEvidenceInput(body = {}, target) {
  const uiEvidence = body.uiEvidence
    || body.ui_evidence
    || body.evidence
    || body.evidenceSummary
    || body.evidence_summary
    || null;
  const nestedEvidence = uiEvidence && typeof uiEvidence === "object" && !Array.isArray(uiEvidence)
    ? uiEvidence
    : {};
  return {
    workspaceId: target.workspaceId,
    learnerId: body.learnerId || body.learner_id || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: body.programId || body.program_id || "",
    domainPackId: body.domainPackId || body.domain_pack_id || "",
    domain: body.domain || "",
    subject: body.subject || "",
    horizon: body.horizon || "daily_plan",
    evidenceKey: body.evidenceKey
      || body.evidence_key
      || body.checkKey
      || body.check_key
      || body.uiGate
      || body.ui_gate
      || nestedEvidence.evidenceKey
      || nestedEvidence.evidence_key
      || nestedEvidence.checkKey
      || nestedEvidence.check_key
      || nestedEvidence.uiGate
      || nestedEvidence.ui_gate
      || "",
    uiEvidence
  };
}

function normalizeAutomationSchedulerExecutionListInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    handoffId: url.searchParams.get("handoffId") || url.searchParams.get("handoff_id") || "",
    digestId: url.searchParams.get("digestId") || url.searchParams.get("digest_id") || "",
    proposalId: url.searchParams.get("proposalId") || url.searchParams.get("proposal_id") || "",
    status: url.searchParams.get("status") || "",
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeAutomationSchedulerRunListInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    domainPackId: url.searchParams.get("domainPackId") || url.searchParams.get("domain_pack_id") || "",
    domain: url.searchParams.get("domain") || "",
    subject: url.searchParams.get("subject") || "",
    horizon: url.searchParams.get("horizon") || "",
    status: url.searchParams.get("status") || "",
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeAutomationSchedulerWorkerTargetListInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    domainPackId: url.searchParams.get("domainPackId") || url.searchParams.get("domain_pack_id") || "",
    domain: url.searchParams.get("domain") || "",
    subject: url.searchParams.get("subject") || "",
    horizon: url.searchParams.get("horizon") || "",
    status: url.searchParams.get("status") || "",
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeAutomationReleaseReadinessListInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    domainPackId: url.searchParams.get("domainPackId") || url.searchParams.get("domain_pack_id") || "",
    domain: url.searchParams.get("domain") || "",
    subject: url.searchParams.get("subject") || "",
    horizon: url.searchParams.get("horizon") || "",
    status: url.searchParams.get("status") || "",
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeAutomationReleaseCollectionRunListInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    domainPackId: url.searchParams.get("domainPackId") || url.searchParams.get("domain_pack_id") || "",
    domain: url.searchParams.get("domain") || "",
    subject: url.searchParams.get("subject") || "",
    horizon: url.searchParams.get("horizon") || "",
    status: url.searchParams.get("status") || "",
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeAutomationReleaseDecisionListInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    domainPackId: url.searchParams.get("domainPackId") || url.searchParams.get("domain_pack_id") || "",
    domain: url.searchParams.get("domain") || "",
    subject: url.searchParams.get("subject") || "",
    horizon: url.searchParams.get("horizon") || "",
    collectionRunId: url.searchParams.get("collectionRunId") || url.searchParams.get("collection_run_id") || url.searchParams.get("runId") || url.searchParams.get("run_id") || "",
    status: url.searchParams.get("status") || url.searchParams.get("decision") || url.searchParams.get("decisionStatus") || url.searchParams.get("decision_status") || "",
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeAutomationReleasePackageListInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    domainPackId: url.searchParams.get("domainPackId") || url.searchParams.get("domain_pack_id") || "",
    domain: url.searchParams.get("domain") || "",
    subject: url.searchParams.get("subject") || "",
    horizon: url.searchParams.get("horizon") || "",
    collectionRunId: url.searchParams.get("collectionRunId") || url.searchParams.get("collection_run_id") || url.searchParams.get("runId") || url.searchParams.get("run_id") || "",
    status: url.searchParams.get("status") || "",
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeAutomationReleaseReviewInput(url, target) {
  return Object.assign(normalizeAutomationReleaseDecisionListInput(url, target), {
    ownerDailyUiEvidence: truthy(url.searchParams.get("ownerDailyUiEvidence") || url.searchParams.get("owner_daily_ui_evidence")),
    ownerAuditUiEvidence: truthy(url.searchParams.get("ownerAuditUiEvidence") || url.searchParams.get("owner_audit_ui_evidence")),
    stageCheckpointEvidence: truthy(url.searchParams.get("stageCheckpointEvidence") || url.searchParams.get("stage_checkpoint_evidence")),
    stageCheckpointControlsEvidence: truthy(url.searchParams.get("stageCheckpointControlsEvidence") || url.searchParams.get("stage_checkpoint_controls_evidence")),
    proposalReviewUiEvidence: truthy(url.searchParams.get("proposalReviewUiEvidence") || url.searchParams.get("proposal_review_ui_evidence")),
    automationDigestUiEvidence: truthy(url.searchParams.get("automationDigestUiEvidence") || url.searchParams.get("automation_digest_ui_evidence")),
    automationActionHandoffUiEvidence: truthy(url.searchParams.get("automationActionHandoffUiEvidence") || url.searchParams.get("automation_action_handoff_ui_evidence")),
    schedulerExecutionUiEvidence: truthy(url.searchParams.get("schedulerExecutionUiEvidence") || url.searchParams.get("scheduler_execution_ui_evidence")),
    schedulerRunUiEvidence: truthy(url.searchParams.get("schedulerRunUiEvidence") || url.searchParams.get("scheduler_run_ui_evidence")),
    schedulerWorkerTargetUiEvidence: truthy(url.searchParams.get("schedulerWorkerTargetUiEvidence") || url.searchParams.get("scheduler_worker_target_ui_evidence")),
    releaseWorkbenchSmokeEvidence: truthy(url.searchParams.get("releaseWorkbenchSmokeEvidence") || url.searchParams.get("release_workbench_smoke_evidence") || url.searchParams.get("releaseWorkbenchEvidence") || url.searchParams.get("release_workbench_evidence")),
    ownerReviewEvidence: truthy(url.searchParams.get("ownerReviewEvidence") || url.searchParams.get("owner_review_evidence") || url.searchParams.get("automationOwnerReviewEvidence") || url.searchParams.get("automation_owner_review_evidence"))
  });
}

function normalizeAutomationReleaseAuthorizationInput(url, target) {
  const input = normalizeAutomationReleaseReviewInput(url, target);
  const approvalKey = url.searchParams.get("requiredApprovalKey") || url.searchParams.get("required_approval_key") || "";
  const approvalKeys = splitCsv(url.searchParams.get("requiredApprovalKeys") || url.searchParams.get("required_approval_keys") || "")
    .concat(approvalKey ? [approvalKey] : []);
  return Object.assign(input, {
    requiredApprovalKeys: approvalKeys.length ? approvalKeys : undefined
  });
}

function normalizeAutomationReleaseClosureInput(url, target) {
  return normalizeAutomationReleaseAuthorizationInput(url, target);
}

function normalizeAutomationReleaseActivationInput(url, target) {
  const input = normalizeAutomationReleaseAuthorizationInput(url, target);
  const activationGate = url.searchParams.get("activationGate") || url.searchParams.get("activation_gate") || "";
  const activationGates = splitCsv(url.searchParams.get("activationGates") || url.searchParams.get("activation_gates") || "")
    .concat(activationGate ? [activationGate] : []);
  return Object.assign(input, {
    activationGates: activationGates.length ? activationGates : undefined
  });
}

function normalizeAutomationReleaseActivationRecordInput(body, workspaceId, target, request, url) {
  const activationGate = body.activationGate || body.activation_gate;
  const activationGates = body.activationGates || body.activation_gates || body.requestedActivationGates || body.requested_activation_gates;
  const requiredApprovalKey = body.requiredApprovalKey || body.required_approval_key;
  const requiredApprovalKeys = body.requiredApprovalKeys || body.required_approval_keys;
  const mergedRequiredApprovalKeys = Array.isArray(requiredApprovalKeys)
    ? requiredApprovalKeys.concat(requiredApprovalKey ? [requiredApprovalKey] : [])
    : (requiredApprovalKeys || requiredApprovalKey || undefined);
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    horizon: body.horizon || "daily_plan",
    collectionRunId: body.collectionRunId || body.collection_run_id || body.runId || body.run_id,
    status: body.status || body.activationStatus || body.activation_status,
    activationGate,
    activationGates,
    requiredApprovalKeys: mergedRequiredApprovalKeys,
    ownerDailyUiEvidence: body.ownerDailyUiEvidence || body.owner_daily_ui_evidence,
    ownerAuditUiEvidence: body.ownerAuditUiEvidence || body.owner_audit_ui_evidence,
    stageCheckpointEvidence: body.stageCheckpointEvidence || body.stage_checkpoint_evidence,
    stageCheckpointControlsEvidence: body.stageCheckpointControlsEvidence || body.stage_checkpoint_controls_evidence,
    proposalReviewUiEvidence: body.proposalReviewUiEvidence || body.proposal_review_ui_evidence,
    automationDigestUiEvidence: body.automationDigestUiEvidence || body.automation_digest_ui_evidence,
    automationActionHandoffUiEvidence: body.automationActionHandoffUiEvidence || body.automation_action_handoff_ui_evidence,
    schedulerExecutionUiEvidence: body.schedulerExecutionUiEvidence || body.scheduler_execution_ui_evidence,
    schedulerRunUiEvidence: body.schedulerRunUiEvidence || body.scheduler_run_ui_evidence,
    schedulerWorkerTargetUiEvidence: body.schedulerWorkerTargetUiEvidence || body.scheduler_worker_target_ui_evidence,
    releaseWorkbenchSmokeEvidence: body.releaseWorkbenchSmokeEvidence || body.release_workbench_smoke_evidence || body.releaseWorkbenchEvidence || body.release_workbench_evidence,
    ownerReviewEvidence: body.ownerReviewEvidence || body.owner_review_evidence || body.automationOwnerReviewEvidence || body.automation_owner_review_evidence,
    activationDecision: body.activationDecision || body.activation_decision || body.ownerActivationDecision || body.owner_activation_decision,
    evidence: body.evidence || body.evidenceSummary || body.evidence_summary,
    note: body.note || body.reason || body.summary,
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, ""),
    recordedBy: body.recordedBy || body.recorded_by || body.approvedBy || body.approved_by || body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, ""),
    recordedAt: body.recordedAt || body.recorded_at || body.approvedAt || body.approved_at,
    createdAt: body.createdAt || body.created_at
  };
}

function normalizeAutomationRuntimeEnablementInput(url, target) {
  const input = normalizeAutomationReleaseActivationInput(url, target);
  return Object.assign(input, {
    enablementStatus: url.searchParams.get("enablementStatus") || url.searchParams.get("enablement_status") || "",
    activationRecordLimit: url.searchParams.get("activationRecordLimit") || url.searchParams.get("activation_record_limit") || "",
    runtimeEnablementRecordLimit: url.searchParams.get("runtimeEnablementRecordLimit") || url.searchParams.get("runtime_enablement_record_limit") || ""
  });
}

function normalizeAutomationReleaseControlsInput(url, target) {
  return normalizeAutomationRuntimeEnablementInput(url, target);
}

function normalizeAutomationReleaseInventoryInput(url, target) {
  return normalizeAutomationReleaseControlsInput(url, target);
}

function normalizeAutomationReleaseDashboardInput(url, target) {
  return normalizeAutomationReleaseInventoryInput(url, target);
}

function normalizeAutomationReleaseWorkbenchInput(url, target) {
  return normalizeAutomationReleaseDashboardInput(url, target);
}

function normalizeAutomationReleaseWorkbenchActionAuditListInput(url, target) {
  return Object.assign(normalizeAutomationReleaseWorkbenchInput(url, target), {
    collectionRunId: url.searchParams.get("collectionRunId") || url.searchParams.get("collection_run_id") || url.searchParams.get("runId") || url.searchParams.get("run_id") || "",
    endpointKey: url.searchParams.get("endpointKey") || url.searchParams.get("endpoint_key") || "",
    actionKey: url.searchParams.get("actionKey") || url.searchParams.get("action_key") || "",
    status: url.searchParams.get("status") || "",
    limit: url.searchParams.get("limit") || ""
  });
}

function normalizeAutomationReleasePreflightInput(url, target) {
  return normalizeAutomationReleaseWorkbenchInput(url, target);
}

function normalizeAutomationReleaseArtifactTemplateInput(url, target) {
  return normalizeAutomationReleaseWorkbenchInput(url, target);
}

function normalizeAutomationReleasePreflightRecordInput(body, workspaceId, target, request, url) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    horizon: body.horizon || "daily_plan",
    collectionRunId: body.collectionRunId || body.collection_run_id || body.runId || body.run_id,
    status: body.status,
    limit: body.limit,
    requiredApprovalKeys: body.requiredApprovalKeys || body.required_approval_keys,
    activationGates: body.activationGates || body.activation_gates,
    activationRecordLimit: body.activationRecordLimit || body.activation_record_limit,
    runtimeEnablementRecordLimit: body.runtimeEnablementRecordLimit || body.runtime_enablement_record_limit,
    ownerDailyUiEvidence: body.ownerDailyUiEvidence || body.owner_daily_ui_evidence,
    ownerAuditUiEvidence: body.ownerAuditUiEvidence || body.owner_audit_ui_evidence,
    stageCheckpointEvidence: body.stageCheckpointEvidence || body.stage_checkpoint_evidence,
    stageCheckpointControlsEvidence: body.stageCheckpointControlsEvidence || body.stage_checkpoint_controls_evidence,
    proposalReviewUiEvidence: body.proposalReviewUiEvidence || body.proposal_review_ui_evidence,
    automationDigestUiEvidence: body.automationDigestUiEvidence || body.automation_digest_ui_evidence,
    automationActionHandoffUiEvidence: body.automationActionHandoffUiEvidence || body.automation_action_handoff_ui_evidence,
    schedulerExecutionUiEvidence: body.schedulerExecutionUiEvidence || body.scheduler_execution_ui_evidence,
    schedulerRunUiEvidence: body.schedulerRunUiEvidence || body.scheduler_run_ui_evidence,
    schedulerWorkerTargetUiEvidence: body.schedulerWorkerTargetUiEvidence || body.scheduler_worker_target_ui_evidence,
    releaseWorkbenchSmokeEvidence: body.releaseWorkbenchSmokeEvidence || body.release_workbench_smoke_evidence || body.releaseWorkbenchEvidence || body.release_workbench_evidence,
    ownerReviewEvidence: body.ownerReviewEvidence || body.owner_review_evidence || body.automationOwnerReviewEvidence || body.automation_owner_review_evidence,
    allowWritePreflight: body.allowWritePreflight === true || body.allow_write_preflight === true,
    ownerAuthorizedWrite: true,
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, ""),
    createdBy: body.createdBy || body.created_by || body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, ""),
    createdAt: body.createdAt || body.created_at
  };
}

function normalizeAutomationOwnerReviewEvidenceInput(url, target) {
  return Object.assign(normalizeAutomationReleaseDashboardInput(url, target), {
    recordLimit: url.searchParams.get("recordLimit") || url.searchParams.get("record_limit") || url.searchParams.get("limit") || ""
  });
}

function normalizeAutomationReleaseWorkbenchActionInput(body, workspaceId, target, request, url) {
  const payload = body.payload && typeof body.payload === "object" && !Array.isArray(body.payload) ? body.payload : {};
  const merged = Object.assign({}, payload, body);
  const releaseApproval = merged.releaseApproval || merged.release_approval || merged.approvals
    ? releaseApprovalFromBody(merged)
    : undefined;
  return Object.assign({
    workspaceId,
    learnerId: merged.learnerId || merged.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || merged.displayName || merged.display_name,
    label: target?.label || merged.label,
    programId: merged.programId || merged.program_id,
    domainPackId: merged.domainPackId || merged.domain_pack_id,
    domain: merged.domain,
    subject: merged.subject,
    horizon: merged.horizon || "daily_plan",
    availableMinutes: merged.availableMinutes || merged.available_minutes,
    targetNodeIds: listFromBodyValue(merged.targetNodeIds || merged.target_node_ids || merged.nodeIds || merged.node_ids),
    tasks: listFromBodyValue(merged.tasks || merged.taskIds || merged.task_ids),
    requiredTaskIds: listFromBodyValue(merged.requiredTaskIds || merged.required_task_ids || merged.requiredTasks || merged.required_tasks),
    artifactTaskIds: listFromBodyValue(merged.artifactTaskIds || merged.artifact_task_ids),
    requiredApprovalKeys: listFromBodyValue(merged.requiredApprovalKeys || merged.required_approval_keys),
    collectionRunId: merged.collectionRunId || merged.collection_run_id || merged.runId || merged.run_id,
    autoSelectLatestReadyCollectionRun: merged.autoSelectLatestReadyCollectionRun === true || merged.auto_select_latest_ready_collection_run === true,
    endpointKey: merged.endpointKey || merged.endpoint_key,
    actionKey: merged.actionKey || merged.action_key || merged.key,
    action: merged.action || merged.ownerAction || merged.owner_action,
    status: merged.status || merged.decision || merged.decisionStatus || merged.decision_status,
    digestId: merged.digestId || merged.digest_id,
    policyId: merged.policyId || merged.policy_id,
    handoffId: merged.handoffId || merged.handoff_id,
    targetId: merged.targetId || merged.target_id || merged.workerTargetId || merged.worker_target_id,
    workerTargetId: merged.workerTargetId || merged.worker_target_id || merged.targetId || merged.target_id,
    evidenceKey: merged.evidenceKey || merged.evidence_key || merged.checkKey || merged.check_key,
    approvalKey: merged.approvalKey || merged.approval_key || merged.configGate || merged.config_gate,
    activationGate: merged.activationGate || merged.activation_gate,
    activationGates: listFromBodyValue(merged.activationGates || merged.activation_gates || merged.requestedActivationGates || merged.requested_activation_gates || merged.activationGate || merged.activation_gate),
    releaseEvidenceBundle: merged.releaseEvidenceBundle || merged.release_evidence_bundle || merged.evidenceBundle || merged.evidence_bundle || merged.bundle,
    releaseEvidenceBundleAudit: merged.releaseEvidenceBundleAudit || merged.release_evidence_bundle_audit || merged.evidenceBundleAudit || merged.evidence_bundle_audit || merged.audit,
    releaseReadiness: merged.releaseReadiness || merged.release_readiness || merged.readiness,
    releaseCollectionRun: merged.releaseCollectionRun || merged.release_collection_run || merged.collectionRun || merged.collection_run || merged.run,
    releaseDecision: merged.releaseDecision || merged.release_decision || merged.decisionSummary || merged.decision_summary,
    releaseEvidenceBundleFile: merged.releaseEvidenceBundleFile || merged.release_evidence_bundle_file || merged.evidenceBundleFile || merged.evidence_bundle_file || merged.bundleFile || merged.bundle_file,
    releaseEvidenceBundleAuditFile: merged.releaseEvidenceBundleAuditFile || merged.release_evidence_bundle_audit_file || merged.evidenceBundleAuditFile || merged.evidence_bundle_audit_file || merged.auditFile || merged.audit_file,
    releaseReadinessFile: merged.releaseReadinessFile || merged.release_readiness_file || merged.readinessFile || merged.readiness_file,
    releaseCollectionRunFile: merged.releaseCollectionRunFile || merged.release_collection_run_file || merged.collectionRunFile || merged.collection_run_file || merged.runFile || merged.run_file,
    releaseEvidenceArtifactManifestFile: merged.releaseEvidenceArtifactManifestFile || merged.release_evidence_artifact_manifest_file || merged.evidenceArtifactManifestFile || merged.evidence_artifact_manifest_file || merged.uiEvidenceManifestFile || merged.ui_evidence_manifest_file || merged.artifactManifestFile || merged.artifact_manifest_file,
    releaseEvidenceArtifactManifest: merged.releaseEvidenceArtifactManifest || merged.release_evidence_artifact_manifest || merged.evidenceArtifactManifest || merged.evidence_artifact_manifest || merged.uiEvidenceManifest || merged.ui_evidence_manifest || merged.artifactManifest || merged.artifact_manifest,
    centralVisualEvidenceFile: merged.centralVisualEvidenceFile || merged.central_visual_evidence_file,
    releasePackage: merged.releasePackage || merged.release_package || merged.package,
    buildReleasePackage: merged.buildReleasePackage === true || merged.build_release_package === true || merged.buildAndRecordPackage === true || merged.build_and_record_package === true || merged.recordPackageFromBuild === true || merged.record_package_from_build === true,
    activationDecision: merged.activationDecision || merged.activation_decision || merged.ownerActivationDecision || merged.owner_activation_decision,
    enablementDecision: merged.enablementDecision || merged.enablement_decision || merged.ownerEnablementDecision || merged.owner_enablement_decision,
    approval: merged.approval || merged.approvalSummary || merged.approval_summary,
    releaseApproval,
    evidence: merged.evidence || merged.evidenceSummary || merged.evidence_summary || readinessEvidenceFromBody(merged),
    limit: merged.limit,
    note: merged.note || merged.reason || merged.summary,
    requestedBy: merged.requestedBy || merged.requested_by || requestedWorkspaceId(request, url, ""),
    recordedBy: merged.recordedBy || merged.recorded_by || merged.approvedBy || merged.approved_by || merged.requestedBy || merged.requested_by || requestedWorkspaceId(request, url, ""),
    approvedBy: merged.approvedBy || merged.approved_by || merged.recordedBy || merged.recorded_by || merged.requestedBy || merged.requested_by || requestedWorkspaceId(request, url, ""),
    reviewedBy: merged.reviewedBy || merged.reviewed_by || merged.recordedBy || merged.recorded_by || merged.requestedBy || merged.requested_by || requestedWorkspaceId(request, url, ""),
    deliveredBy: merged.deliveredBy || merged.delivered_by || merged.recordedBy || merged.recorded_by || merged.requestedBy || merged.requested_by || requestedWorkspaceId(request, url, ""),
    decidedBy: merged.decidedBy || merged.decided_by || merged.requestedBy || merged.requested_by || requestedWorkspaceId(request, url, ""),
    createdBy: merged.createdBy || merged.created_by || merged.requestedBy || merged.requested_by || requestedWorkspaceId(request, url, ""),
    recordedAt: merged.recordedAt || merged.recorded_at || merged.approvedAt || merged.approved_at,
    approvedAt: merged.approvedAt || merged.approved_at || merged.recordedAt || merged.recorded_at,
    reviewedAt: merged.reviewedAt || merged.reviewed_at || merged.recordedAt || merged.recorded_at,
    deliveredAt: merged.deliveredAt || merged.delivered_at || merged.recordedAt || merged.recorded_at,
    decidedAt: merged.decidedAt || merged.decided_at,
    createdAt: merged.createdAt || merged.created_at,
    writeCollectionRun: merged.writeCollectionRun === true || merged.write_collection_run === true || merged.recordCollectionRun === true || merged.record_collection_run === true,
    writeReleaseEvidenceRecords: merged.writeReleaseEvidenceRecords === true || merged.write_release_evidence_records === true || merged.recordReleaseEvidenceRecords === true || merged.record_release_evidence_records === true,
    allowWriteCollection: true,
    ownerAuthorizedWrite: true
  }, uiEvidenceFileInputFromBody(merged));
}

function normalizeAutomationRuntimeEnablementRecordInput(body, workspaceId, target, request, url) {
  const activationGate = body.activationGate || body.activation_gate;
  const activationGates = body.activationGates || body.activation_gates || body.requestedActivationGates || body.requested_activation_gates;
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    horizon: body.horizon || "daily_plan",
    collectionRunId: body.collectionRunId || body.collection_run_id || body.runId || body.run_id,
    status: body.status || body.enablementStatus || body.enablement_status,
    activationGate,
    activationGates,
    activationRecordLimit: body.activationRecordLimit || body.activation_record_limit || body.limit,
    enablementDecision: body.enablementDecision || body.enablement_decision || body.ownerEnablementDecision || body.owner_enablement_decision,
    evidence: body.evidence || body.evidenceSummary || body.evidence_summary,
    note: body.note || body.reason || body.summary,
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, ""),
    recordedBy: body.recordedBy || body.recorded_by || body.approvedBy || body.approved_by || body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, ""),
    recordedAt: body.recordedAt || body.recorded_at || body.approvedAt || body.approved_at,
    createdAt: body.createdAt || body.created_at
  };
}

function readinessEvidenceFromBody(body = {}) {
  const evidence = body.evidence || body.evidenceSummary || body.evidence_summary || {};
  return Object.assign({}, evidence, {
    ownerDailyUiEvidence: body.ownerDailyUiEvidence || body.owner_daily_ui_evidence || evidence.ownerDailyUiEvidence || evidence.owner_daily_ui_evidence,
    ownerAuditUiEvidence: body.ownerAuditUiEvidence || body.owner_audit_ui_evidence || evidence.ownerAuditUiEvidence || evidence.owner_audit_ui_evidence,
    stageCheckpointEvidence: body.stageCheckpointEvidence || body.stage_checkpoint_evidence || evidence.stageCheckpointEvidence || evidence.stage_checkpoint_evidence,
    stageCheckpointControlsEvidence: body.stageCheckpointControlsEvidence || body.stage_checkpoint_controls_evidence || evidence.stageCheckpointControlsEvidence || evidence.stage_checkpoint_controls_evidence,
    proposalReviewUiEvidence: body.proposalReviewUiEvidence || body.proposal_review_ui_evidence || evidence.proposalReviewUiEvidence || evidence.proposal_review_ui_evidence,
    productionPlannerReadinessEvidence: body.productionPlannerReadinessEvidence || body.production_planner_readiness_evidence || evidence.productionPlannerReadinessEvidence || evidence.production_planner_readiness_evidence,
    platformActionEvidence: body.platformActionEvidence || body.platform_action_evidence || evidence.platformActionEvidence || evidence.platform_action_evidence,
    centralVisualEvidence: body.centralVisualEvidence || body.central_visual_evidence || evidence.centralVisualEvidence || evidence.central_visual_evidence,
    releasePackageReviewUiEvidence: body.releasePackageReviewUiEvidence || body.release_package_review_ui_evidence || evidence.releasePackageReviewUiEvidence || evidence.release_package_review_ui_evidence,
    automationDigestUiEvidence: body.automationDigestUiEvidence || body.automation_digest_ui_evidence || evidence.automationDigestUiEvidence || evidence.automation_digest_ui_evidence,
    automationActionHandoffUiEvidence: body.automationActionHandoffUiEvidence || body.automation_action_handoff_ui_evidence || evidence.automationActionHandoffUiEvidence || evidence.automation_action_handoff_ui_evidence,
    schedulerExecutionUiEvidence: body.schedulerExecutionUiEvidence || body.scheduler_execution_ui_evidence || evidence.schedulerExecutionUiEvidence || evidence.scheduler_execution_ui_evidence,
    schedulerRunUiEvidence: body.schedulerRunUiEvidence || body.scheduler_run_ui_evidence || evidence.schedulerRunUiEvidence || evidence.scheduler_run_ui_evidence,
    schedulerWorkerTargetUiEvidence: body.schedulerWorkerTargetUiEvidence || body.scheduler_worker_target_ui_evidence || evidence.schedulerWorkerTargetUiEvidence || evidence.scheduler_worker_target_ui_evidence,
    releaseWorkbenchSmokeEvidence: body.releaseWorkbenchSmokeEvidence || body.release_workbench_smoke_evidence || body.releaseWorkbenchEvidence || body.release_workbench_evidence || evidence.releaseWorkbenchSmokeEvidence || evidence.release_workbench_smoke_evidence,
    ownerReviewEvidence: body.ownerReviewEvidence || body.owner_review_evidence || body.automationOwnerReviewEvidence || body.automation_owner_review_evidence || evidence.ownerReviewEvidence || evidence.owner_review_evidence || evidence.automationOwnerReviewEvidence || evidence.automation_owner_review_evidence
  });
}

function readinessEvidenceFromQuery(url) {
  return {
    ownerDailyUiEvidence: truthy(url.searchParams.get("ownerDailyUiEvidence") || url.searchParams.get("owner_daily_ui_evidence")),
    ownerAuditUiEvidence: truthy(url.searchParams.get("ownerAuditUiEvidence") || url.searchParams.get("owner_audit_ui_evidence")),
    stageCheckpointEvidence: truthy(url.searchParams.get("stageCheckpointEvidence") || url.searchParams.get("stage_checkpoint_evidence")),
    stageCheckpointControlsEvidence: truthy(url.searchParams.get("stageCheckpointControlsEvidence") || url.searchParams.get("stage_checkpoint_controls_evidence")),
    proposalReviewUiEvidence: truthy(url.searchParams.get("proposalReviewUiEvidence") || url.searchParams.get("proposal_review_ui_evidence")),
    productionPlannerReadinessEvidence: truthy(url.searchParams.get("productionPlannerReadinessEvidence") || url.searchParams.get("production_planner_readiness_evidence")),
    platformActionEvidence: truthy(url.searchParams.get("platformActionEvidence") || url.searchParams.get("platform_action_evidence")),
    centralVisualEvidence: truthy(url.searchParams.get("centralVisualEvidence") || url.searchParams.get("central_visual_evidence")),
    releasePackageReviewUiEvidence: truthy(url.searchParams.get("releasePackageReviewUiEvidence") || url.searchParams.get("release_package_review_ui_evidence")),
    automationDigestUiEvidence: truthy(url.searchParams.get("automationDigestUiEvidence") || url.searchParams.get("automation_digest_ui_evidence")),
    automationActionHandoffUiEvidence: truthy(url.searchParams.get("automationActionHandoffUiEvidence") || url.searchParams.get("automation_action_handoff_ui_evidence")),
    schedulerExecutionUiEvidence: truthy(url.searchParams.get("schedulerExecutionUiEvidence") || url.searchParams.get("scheduler_execution_ui_evidence")),
    schedulerRunUiEvidence: truthy(url.searchParams.get("schedulerRunUiEvidence") || url.searchParams.get("scheduler_run_ui_evidence")),
    schedulerWorkerTargetUiEvidence: truthy(url.searchParams.get("schedulerWorkerTargetUiEvidence") || url.searchParams.get("scheduler_worker_target_ui_evidence")),
    releaseWorkbenchSmokeEvidence: truthy(url.searchParams.get("releaseWorkbenchSmokeEvidence") || url.searchParams.get("release_workbench_smoke_evidence") || url.searchParams.get("releaseWorkbenchEvidence") || url.searchParams.get("release_workbench_evidence")),
    ownerReviewEvidence: truthy(url.searchParams.get("ownerReviewEvidence") || url.searchParams.get("owner_review_evidence") || url.searchParams.get("automationOwnerReviewEvidence") || url.searchParams.get("automation_owner_review_evidence"))
  };
}

function releaseApprovalFromBody(body = {}) {
  const approval = body.releaseApproval || body.release_approval || body.approvals || {};
  return Object.assign({}, approval, {
    writefulExecutionApproval: body.writefulExecutionApproval || body.writeful_execution_approval || approval.writefulExecutionApproval || approval.writeful_execution_approval,
    backgroundSchedulerApproval: body.backgroundSchedulerApproval || body.background_scheduler_approval || approval.backgroundSchedulerApproval || approval.background_scheduler_approval,
    backgroundWorkerApproval: body.backgroundWorkerApproval || body.background_worker_approval || approval.backgroundWorkerApproval || approval.background_worker_approval
  });
}

function queryBoolean(url, camelName, snakeName) {
  const value = url.searchParams.has(camelName) ? url.searchParams.get(camelName)
    : url.searchParams.has(snakeName) ? url.searchParams.get(snakeName)
      : undefined;
  return value === undefined ? undefined : truthy(value);
}

function releaseApprovalFromQuery(url) {
  return {
    writefulExecutionApproval: queryBoolean(url, "writefulExecutionApproval", "writeful_execution_approval"),
    backgroundSchedulerApproval: queryBoolean(url, "backgroundSchedulerApproval", "background_scheduler_approval"),
    backgroundWorkerApproval: queryBoolean(url, "backgroundWorkerApproval", "background_worker_approval")
  };
}

function normalizeAutomationReleaseReadinessQueryInput(url, target) {
  return Object.assign(normalizeAutomationReleaseReadinessListInput(url, target), {
    evidence: readinessEvidenceFromQuery(url),
    releaseApproval: releaseApprovalFromQuery(url)
  });
}

function normalizeAutomationReleaseReadinessSnapshotInput(body, workspaceId, target, request, url) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    horizon: body.horizon || "daily_plan",
    evidence: readinessEvidenceFromBody(body),
    releaseApproval: releaseApprovalFromBody(body),
    limit: body.limit,
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, ""),
    createdAt: body.createdAt || body.created_at
  };
}

function normalizeAutomationReleaseCollectionRunInput(body, workspaceId, target, request, url) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    horizon: body.horizon || "daily_plan",
    releaseEvidenceBundle: body.releaseEvidenceBundle || body.release_evidence_bundle || body.evidenceBundle || body.evidence_bundle || body.bundle,
    releaseEvidenceBundleAudit: body.releaseEvidenceBundleAudit || body.release_evidence_bundle_audit || body.evidenceBundleAudit || body.evidence_bundle_audit || body.audit,
    releaseReadiness: body.releaseReadiness || body.release_readiness || body.readiness,
    releaseEvidenceBundleFile: body.releaseEvidenceBundleFile || body.release_evidence_bundle_file || body.evidenceBundleFile || body.evidence_bundle_file || body.bundleFile || body.bundle_file,
    releaseEvidenceBundleAuditFile: body.releaseEvidenceBundleAuditFile || body.release_evidence_bundle_audit_file || body.evidenceBundleAuditFile || body.evidence_bundle_audit_file || body.auditFile || body.audit_file,
    releaseReadinessFile: body.releaseReadinessFile || body.release_readiness_file || body.readinessFile || body.readiness_file,
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, ""),
    createdBy: body.createdBy || body.created_by || requestedWorkspaceId(request, url, ""),
    createdAt: body.createdAt || body.created_at
  };
}

function normalizeAutomationReleaseDecisionInput(body, workspaceId, target, request, url) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    horizon: body.horizon || "daily_plan",
    collectionRunId: body.collectionRunId || body.collection_run_id || body.runId || body.run_id,
    autoSelectLatestReadyCollectionRun: body.autoSelectLatestReadyCollectionRun === true || body.auto_select_latest_ready_collection_run === true,
    status: body.status || body.decision || body.decisionStatus || body.decision_status,
    releaseCollectionRun: body.releaseCollectionRun || body.release_collection_run || body.collectionRun || body.collection_run || body.run,
    releaseCollectionRunFile: body.releaseCollectionRunFile || body.release_collection_run_file || body.collectionRunFile || body.collection_run_file || body.runFile || body.run_file,
    releaseDecision: body.releaseDecision || body.release_decision || body.decisionSummary || body.decision_summary,
    note: body.note || body.reason || body.summary,
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, ""),
    decidedBy: body.decidedBy || body.decided_by || body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, ""),
    decidedAt: body.decidedAt || body.decided_at,
    createdAt: body.createdAt || body.created_at
  };
}

function normalizeAutomationReleasePackageInput(body, workspaceId, target, request, url) {
  const releasePackage = body.releasePackage || body.release_package || body.package
    || (body.schemaVersion === "growth.learningAutomationReleasePackage.v1" || body.schema_version === "growth.learningAutomationReleasePackage.v1" ? body : undefined);
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || releasePackage?.learnerId || releasePackage?.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id || releasePackage?.programId || releasePackage?.program_id,
    domainPackId: body.domainPackId || body.domain_pack_id || releasePackage?.domainPackId || releasePackage?.domain_pack_id,
    domain: body.domain || releasePackage?.domain,
    subject: body.subject || releasePackage?.subject,
    horizon: body.horizon || releasePackage?.horizon || "daily_plan",
    packageId: body.packageId || body.package_id || body.releasePackageId || body.release_package_id,
    collectionRunId: body.collectionRunId || body.collection_run_id || body.runId || body.run_id,
    status: body.status,
    releasePackage,
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, ""),
    createdBy: body.createdBy || body.created_by || requestedWorkspaceId(request, url, ""),
    createdAt: body.createdAt || body.created_at,
    ownerAuthorizedWrite: true
  };
}

function normalizeAutomationReleasePackageBuildInput(body, workspaceId, target, request, url) {
  return Object.assign({
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    horizon: body.horizon || "daily_plan",
    availableMinutes: body.availableMinutes || body.available_minutes,
    targetNodeIds: listFromBodyValue(body.targetNodeIds || body.target_node_ids || body.nodeIds || body.node_ids),
    tasks: listFromBodyValue(body.tasks || body.taskIds || body.task_ids),
    requiredTaskIds: listFromBodyValue(body.requiredTaskIds || body.required_task_ids || body.requiredTasks || body.required_tasks),
    requiredApprovalKeys: listFromBodyValue(body.requiredApprovalKeys || body.required_approval_keys),
    activationGates: listFromBodyValue(body.activationGates || body.activation_gates || body.activationGate || body.activation_gate),
    activationRecordLimit: body.activationRecordLimit || body.activation_record_limit,
    runtimeEnablementRecordLimit: body.runtimeEnablementRecordLimit || body.runtime_enablement_record_limit,
    collectionRunId: body.collectionRunId || body.collection_run_id || body.runId || body.run_id,
    taskCardId: body.taskCardId || body.task_card_id,
    planDraftId: body.planDraftId || body.plan_draft_id,
    evaluationId: body.evaluationId || body.evaluation_id,
    profileDeltaId: body.profileDeltaId || body.profile_delta_id,
    evidenceId: body.evidenceId || body.evidence_id,
    correctionId: body.correctionId || body.correction_id,
    sourceId: body.sourceId || body.source_id,
    learnerCycleOperation: body.learnerCycleOperation || body.learner_cycle_operation,
    dailyLoopWriteOperation: body.dailyLoopWriteOperation || body.daily_loop_write_operation,
    ownerDailyUiEvidence: body.ownerDailyUiEvidence || body.owner_daily_ui_evidence,
    ownerAuditUiEvidence: body.ownerAuditUiEvidence || body.owner_audit_ui_evidence,
    stageCheckpointEvidence: body.stageCheckpointEvidence || body.stage_checkpoint_evidence,
    stageCheckpointControlsEvidence: body.stageCheckpointControlsEvidence || body.stage_checkpoint_controls_evidence,
    proposalReviewUiEvidence: body.proposalReviewUiEvidence || body.proposal_review_ui_evidence,
    releasePackageReviewUiEvidence: body.releasePackageReviewUiEvidence || body.release_package_review_ui_evidence,
    automationDigestUiEvidence: body.automationDigestUiEvidence || body.automation_digest_ui_evidence,
    automationActionHandoffUiEvidence: body.automationActionHandoffUiEvidence || body.automation_action_handoff_ui_evidence,
    schedulerExecutionUiEvidence: body.schedulerExecutionUiEvidence || body.scheduler_execution_ui_evidence,
    schedulerRunUiEvidence: body.schedulerRunUiEvidence || body.scheduler_run_ui_evidence,
    schedulerWorkerTargetUiEvidence: body.schedulerWorkerTargetUiEvidence || body.scheduler_worker_target_ui_evidence,
    releaseWorkbenchSmokeEvidence: body.releaseWorkbenchSmokeEvidence || body.release_workbench_smoke_evidence || body.releaseWorkbenchEvidence || body.release_workbench_evidence,
    ownerReviewEvidence: body.ownerReviewEvidence || body.owner_review_evidence || body.automationOwnerReviewEvidence || body.automation_owner_review_evidence,
    centralVisualEvidenceFile: body.centralVisualEvidenceFile || body.central_visual_evidence_file,
    evidence: body.evidence || body.evidenceSummary || body.evidence_summary,
    releaseApproval: releaseApprovalFromBody(body),
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, ""),
    createdBy: body.createdBy || body.created_by || requestedWorkspaceId(request, url, ""),
    createdAt: body.createdAt || body.created_at,
    writeCollectionRun: body.writeCollectionRun === true || body.write_collection_run === true || body.recordCollectionRun === true || body.record_collection_run === true,
    writePackageRecord: body.writePackageRecord === true || body.write_package_record === true || body.recordPackage === true || body.record_package === true,
    allowWritePackage: true,
    ownerAuthorizedWrite: true
  }, uiEvidenceFileInputFromBody(body));
}

function normalizeAutomationReleaseEvidenceCollectionInput(body, workspaceId, target, request, url) {
  const input = normalizeAutomationReleasePackageBuildInput(body, workspaceId, target, request, url);
  return Object.assign({}, input, {
    writeCollectionRun: body.writeCollectionRun === true || body.write_collection_run === true || body.recordCollectionRun === true || body.record_collection_run === true,
    writeReleaseEvidenceRecords: body.writeReleaseEvidenceRecords === true || body.write_release_evidence_records === true || body.recordReleaseEvidenceRecords === true || body.record_release_evidence_records === true,
    allowWriteCollection: true,
    writePackageRecord: false,
    allowWritePackage: false,
    ownerAuthorizedWrite: true
  });
}

function normalizeAutomationReleaseApprovalListInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    domainPackId: url.searchParams.get("domainPackId") || url.searchParams.get("domain_pack_id") || "",
    domain: url.searchParams.get("domain") || "",
    subject: url.searchParams.get("subject") || "",
    horizon: url.searchParams.get("horizon") || "",
    approvalKey: url.searchParams.get("approvalKey") || url.searchParams.get("approval_key") || url.searchParams.get("configGate") || url.searchParams.get("config_gate") || "",
    status: url.searchParams.get("status") || "",
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeAutomationReleaseApprovalInput(body, workspaceId, target, request, url) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    horizon: body.horizon || "daily_plan",
    approvalKey: body.approvalKey || body.approval_key || body.configGate || body.config_gate || body.gate || body.key,
    approvalVersion: body.approvalVersion || body.approval_version,
    approval: body.approval || body.approvalSummary || body.approval_summary,
    evidence: body.evidence || body.evidenceSummary || body.evidence_summary,
    note: body.note || body.reason || body.summary,
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, ""),
    approvedBy: body.approvedBy || body.approved_by || body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, ""),
    approvedAt: body.approvedAt || body.approved_at,
    createdAt: body.createdAt || body.created_at
  };
}

function normalizeAutomationReleaseEvidenceListInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    domainPackId: url.searchParams.get("domainPackId") || url.searchParams.get("domain_pack_id") || "",
    domain: url.searchParams.get("domain") || "",
    subject: url.searchParams.get("subject") || "",
    horizon: url.searchParams.get("horizon") || "",
    evidenceKey: url.searchParams.get("evidenceKey") || url.searchParams.get("evidence_key") || url.searchParams.get("checkKey") || url.searchParams.get("check_key") || "",
    checkKey: url.searchParams.get("checkKey") || url.searchParams.get("check_key") || "",
    status: url.searchParams.get("status") || "",
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeAutomationReleaseEvidenceInput(body, workspaceId, target, request, url) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    horizon: body.horizon || "daily_plan",
    evidenceKey: body.evidenceKey || body.evidence_key || body.checkKey || body.check_key || body.key,
    checkKey: body.checkKey || body.check_key,
    status: body.status,
    evidenceVersion: body.evidenceVersion || body.evidence_version,
    evidence: body.evidence || body.evidenceSummary || body.evidence_summary,
    note: body.note || body.reason || body.summary,
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, ""),
    recordedBy: body.recordedBy || body.recorded_by || body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, ""),
    observedAt: body.observedAt || body.observed_at || body.recordedAt || body.recorded_at,
    createdAt: body.createdAt || body.created_at
  };
}

function normalizeAutomationSchedulerDryRunInput(body, workspaceId, target, request, url) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    proposalId: body.proposalId || body.proposal_id,
    planDraftId: body.planDraftId || body.plan_draft_id,
    selectedItemId: body.selectedItemId || body.selected_item_id || body.itemId || body.item_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    targetNodeIds: body.targetNodeIds || body.target_node_ids || body.nodeIds || body.node_ids,
    sourceTargetNodeIds: body.sourceTargetNodeIds || body.source_target_node_ids,
    profileDeltaId: body.profileDeltaId || body.profile_delta_id,
    evidenceId: body.evidenceId || body.evidence_id,
    correctionId: body.correctionId || body.correction_id,
    sourceId: body.sourceId || body.source_id,
    auditLimit: body.auditLimit || body.audit_limit,
    limit: body.limit,
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, "")
  };
}

function normalizeAutomationSchedulerWorkerTargetInput(body, workspaceId, target, request, url) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    horizon: body.horizon || "daily_plan",
    targetNodeIds: body.targetNodeIds || body.target_node_ids || body.nodeIds || body.node_ids,
    policy: body.policy || body.targetPolicy || body.target_policy,
    limit: body.limit,
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, "")
  };
}

function normalizeAutomationSchedulerRunInput(body, workspaceId, target, request, url) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    horizon: body.horizon || "daily_plan",
    runId: body.runId || body.run_id,
    runMode: body.runMode || body.run_mode || body.mode,
    generationKey: body.generationKey || body.generation_key,
    cardSchemaVersion: body.cardSchemaVersion || body.card_schema_version,
    limit: body.limit,
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, ""),
    createdAt: body.createdAt || body.created_at,
    startedAt: body.startedAt || body.started_at,
    executedAt: body.executedAt || body.executed_at,
    updatedAt: body.updatedAt || body.updated_at
  };
}

function normalizeAutomationSchedulerWorkerTargetReviewInput(body, workspaceId, target, request, url, targetId) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    targetId,
    status: body.status || body.reviewAction || body.review_action || body.action,
    reason: body.reason || body.note || body.summary,
    reviewedBy: body.reviewedBy || body.reviewed_by || requestedWorkspaceId(request, url, ""),
    reviewedAt: body.reviewedAt || body.reviewed_at
  };
}

function normalizeAutomationSchedulerExecutionInput(body, workspaceId, target, request, url) {
  const activationGates = body.activationGates || body.activation_gates || body.requestedActivationGates || body.requested_activation_gates;
  const requiredApprovalKeys = body.requiredApprovalKeys || body.required_approval_keys;
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    handoffId: body.handoffId || body.handoff_id,
    digestId: body.digestId || body.digest_id,
    policyId: body.policyId || body.policy_id,
    collectionRunId: body.collectionRunId || body.collection_run_id || body.releaseCollectionRunId || body.release_collection_run_id,
    proposalId: body.proposalId || body.proposal_id,
    planDraftId: body.planDraftId || body.plan_draft_id,
    selectedItemId: body.selectedItemId || body.selected_item_id || body.itemId || body.item_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    horizon: body.horizon || "daily_plan",
    executionId: body.executionId || body.execution_id,
    executionMode: body.executionMode || body.execution_mode || body.mode,
    generationKey: body.generationKey || body.generation_key,
    cardSchemaVersion: body.cardSchemaVersion || body.card_schema_version,
    activationGates,
    requiredApprovalKeys,
    activationRecordLimit: body.activationRecordLimit || body.activation_record_limit,
    limit: body.limit,
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, ""),
    createdAt: body.createdAt || body.created_at,
    startedAt: body.startedAt || body.started_at,
    executedAt: body.executedAt || body.executed_at
  };
}

function normalizeAutomationDigestInput(body, workspaceId, target, request, url) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    planDraftId: body.planDraftId || body.plan_draft_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    horizon: body.horizon || "daily_plan",
    targetNodeIds: body.targetNodeIds || body.target_node_ids || body.nodeIds || body.node_ids,
    sourceTargetNodeIds: body.sourceTargetNodeIds || body.source_target_node_ids,
    profileDeltaId: body.profileDeltaId || body.profile_delta_id,
    evidenceId: body.evidenceId || body.evidence_id,
    correctionId: body.correctionId || body.correction_id,
    sourceId: body.sourceId || body.source_id,
    auditLimit: body.auditLimit || body.audit_limit,
    limit: body.limit,
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, "")
  };
}

function normalizeAutomationCycleClosureInput(body, workspaceId, target, request, url) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    horizon: body.horizon || "daily_plan",
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    availableMinutes: body.availableMinutes || body.available_minutes,
    allowedCardRoles: body.allowedCardRoles || body.allowed_card_roles,
    lowPressure: body.lowPressure !== undefined ? body.lowPressure : body.low_pressure,
    targetNodeIds: body.targetNodeIds || body.target_node_ids || body.nodeIds || body.node_ids,
    sourceTargetNodeIds: body.sourceTargetNodeIds || body.source_target_node_ids,
    cycleId: body.cycleId || body.cycle_id,
    sourcePlanDraftId: body.sourcePlanDraftId || body.source_plan_draft_id || body.planDraftId || body.plan_draft_id,
    sourceTaskCardId: body.sourceTaskCardId || body.source_task_card_id || body.taskCardId || body.task_card_id,
    sourceEvaluationId: body.sourceEvaluationId || body.source_evaluation_id || body.evaluationId || body.evaluation_id,
    profileDeltaId: body.profileDeltaId || body.profile_delta_id,
    evidenceId: body.evidenceId || body.evidence_id,
    correctionId: body.correctionId || body.correction_id,
    sourceId: body.sourceId || body.source_id,
    proposalDecision: body.proposalDecision || body.proposal_decision,
    proposalReason: body.proposalReason || body.proposal_reason,
    acceptProposal: body.acceptProposal !== undefined ? body.acceptProposal : body.accept_proposal,
    createDigest: body.createDigest !== undefined ? body.createDigest : body.create_digest,
    reviewDigest: body.reviewDigest !== undefined ? body.reviewDigest : body.review_digest,
    digestReviewStatus: body.digestReviewStatus || body.digest_review_status,
    digestReviewNote: body.digestReviewNote || body.digest_review_note || body.note,
    selectedCandidateIds: body.selectedCandidateIds || body.selected_candidate_ids,
    createHandoff: body.createHandoff !== undefined ? body.createHandoff : body.create_handoff,
    deliverHandoff: body.deliverHandoff !== undefined ? body.deliverHandoff : body.deliver_handoff,
    handoffSummary: body.handoffSummary || body.handoff_summary || body.summary,
    handoffId: body.handoffId || body.handoff_id,
    autoSelectCompletedCycle: body.autoSelectCompletedCycle === true || body.auto_select_completed_cycle === true,
    autoSelectLatestCompletedCycle: body.autoSelectLatestCompletedCycle !== false && body.auto_select_latest_completed_cycle !== false,
    auditLimit: body.auditLimit || body.audit_limit,
    limit: body.limit,
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, "")
  };
}

function normalizeAutomationReviewAdvancementInput(body, workspaceId, target, request, url) {
  return Object.assign(normalizeAutomationCycleClosureInput(body, workspaceId, target, request, url), {
    digestId: body.digestId || body.digest_id,
    handoffId: body.handoffId || body.handoff_id,
    proposalId: body.proposalId || body.proposal_id,
    planDraftId: body.nextPlanDraftId || body.next_plan_draft_id || body.planDraftId || body.plan_draft_id,
    selectedItemId: body.selectedItemId || body.selected_item_id,
    prepareReviewPacket: body.prepareReviewPacket !== undefined ? body.prepareReviewPacket : body.prepare_review_packet,
    reviewDigest: body.reviewDigest !== undefined ? body.reviewDigest : body.review_digest,
    ensureFailurePolicy: body.ensureFailurePolicy !== undefined ? body.ensureFailurePolicy : body.ensure_failure_policy,
    failurePolicyReviewReason: body.failurePolicyReviewReason || body.failure_policy_review_reason,
    failurePolicyReviewNote: body.failurePolicyReviewNote || body.failure_policy_review_note,
    digestReviewReason: body.digestReviewReason || body.digest_review_reason,
    digestReviewNote: body.digestReviewNote || body.digest_review_note || body.note,
    createHandoff: body.createHandoff !== undefined ? body.createHandoff : body.create_handoff,
    deliverHandoff: body.deliverHandoff !== undefined ? body.deliverHandoff : body.deliver_handoff,
    attemptExecution: body.attemptExecution !== undefined ? body.attemptExecution : body.attempt_execution
  });
}

function normalizeAutomationFailurePolicyInput(body, workspaceId, target, request, url) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    horizon: body.horizon || "daily_plan",
    policyVersion: body.policyVersion || body.policy_version,
    policy: body.policy || body.policySummary || body.policy_summary,
    rollbackPolicy: body.rollbackPolicy || body.rollback_policy || body.rollback,
    failurePolicy: body.failurePolicy || body.failure_policy || body.failure,
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, "")
  };
}

function normalizeAutomationActionHandoffInput(body, workspaceId, target, request, url) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    digestId: body.digestId || body.digest_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    horizon: body.horizon || "daily_plan",
    summary: body.summary,
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, "")
  };
}

function csvStrings(value = "") {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function listFromBodyValue(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  return csvStrings(value);
}

function uiEvidenceFileInputFromBody(body = {}) {
  const output = {};
  for (const task of UI_EVIDENCE_COLLECTION_TASKS) {
    output[task.fileField] = body[task.fileField] || body[task.fileBodyField];
  }
  return output;
}

function applyReleaseEvidenceArtifactManifestInput(input, services) {
  const service = services.learningAutomationReleaseEvidenceArtifactManifestService;
  if (!service || typeof service.applyToCollectionInput !== "function") return input;
  const result = service.applyToCollectionInput(input);
  if (result.ok) return result.input || input;
  throw routeError(
    result.error || "release_evidence_artifact_manifest_invalid",
    "Release evidence artifact manifest is invalid",
    400
  );
}

function normalizeProfileCorrectionListInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    correctionId: url.searchParams.get("correctionId") || url.searchParams.get("correction_id") || url.searchParams.get("sourceId") || "",
    targetNodeIds: csvStrings(url.searchParams.get("targetNodeIds") || url.searchParams.get("target_node_ids") || url.searchParams.get("nodeIds") || ""),
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeProfileCorrectionInput(body, workspaceId, target, request, url) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    targetNodeIds: body.targetNodeIds || body.target_node_ids || body.nodeIds || body.node_ids,
    correctionId: body.correctionId || body.correction_id || body.sourceId || body.source_id,
    reviewAction: body.reviewAction || body.review_action,
    status: body.status || body.correctionStatus || body.correction_status,
    confidence: body.confidence,
    evidenceWeight: body.evidenceWeight || body.evidence_weight,
    reason: body.reason || body.summary,
    note: body.note,
    profileDeltaId: body.profileDeltaId || body.profile_delta_id,
    taskCardId: body.taskCardId || body.task_card_id,
    evaluationId: body.evaluationId || body.evaluation_id,
    sourceEvidenceIds: body.sourceEvidenceIds || body.source_evidence_ids || body.evidenceIds || body.evidence_ids,
    reviewedBy: body.reviewedBy || body.reviewed_by || requestedWorkspaceId(request, url, ""),
    reviewedAt: body.reviewedAt || body.reviewed_at
  };
}

function normalizeOwnerAuditReviewListInput(url, target) {
  return {
    workspaceId: target.workspaceId,
    learnerId: url.searchParams.get("learnerId") || url.searchParams.get("learner_id") || target.workspaceId,
    displayName: target.label,
    label: target.label,
    programId: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
    domainPackId: url.searchParams.get("domainPackId") || url.searchParams.get("domain_pack_id") || "",
    domain: url.searchParams.get("domain") || "",
    subject: url.searchParams.get("subject") || "",
    horizon: url.searchParams.get("horizon") || "daily_plan",
    decision: url.searchParams.get("decision") || url.searchParams.get("reviewDecision") || url.searchParams.get("review_decision") || "",
    status: url.searchParams.get("status") || url.searchParams.get("reviewStatus") || url.searchParams.get("review_status") || "",
    reviewId: url.searchParams.get("reviewId") || url.searchParams.get("review_id") || url.searchParams.get("ownerAuditReviewId") || "",
    planDraftId: url.searchParams.get("planDraftId") || url.searchParams.get("plan_draft_id") || "",
    taskCardId: url.searchParams.get("taskCardId") || url.searchParams.get("task_card_id") || "",
    evaluationId: url.searchParams.get("evaluationId") || url.searchParams.get("evaluation_id") || "",
    profileDeltaId: url.searchParams.get("profileDeltaId") || url.searchParams.get("profile_delta_id") || "",
    evidenceId: url.searchParams.get("evidenceId") || url.searchParams.get("evidence_id") || "",
    correctionId: url.searchParams.get("correctionId") || url.searchParams.get("correction_id") || "",
    sourceId: url.searchParams.get("sourceId") || url.searchParams.get("source_id") || "",
    targetNodeIds: csvStrings(url.searchParams.get("targetNodeIds") || url.searchParams.get("target_node_ids") || url.searchParams.get("nodeIds") || ""),
    limit: url.searchParams.get("limit") || ""
  };
}

function normalizeOwnerAuditReviewInput(body, workspaceId, target, request, url) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    horizon: body.horizon,
    availableMinutes: body.availableMinutes || body.available_minutes,
    reviewId: body.reviewId || body.review_id || body.ownerAuditReviewId || body.owner_audit_review_id,
    decision: body.decision || body.reviewDecision || body.review_decision,
    status: body.status || body.reviewStatus || body.review_status,
    ownerNote: body.ownerNote || body.owner_note || body.note,
    planDraftId: body.planDraftId || body.plan_draft_id,
    taskCardId: body.taskCardId || body.task_card_id,
    evaluationId: body.evaluationId || body.evaluation_id,
    profileDeltaId: body.profileDeltaId || body.profile_delta_id,
    evidenceId: body.evidenceId || body.evidence_id,
    correctionId: body.correctionId || body.correction_id,
    sourceId: body.sourceId || body.source_id,
    targetNodeIds: body.targetNodeIds || body.target_node_ids || body.nodeIds || body.node_ids,
    autoSelectCompletedCycle: body.autoSelectCompletedCycle === true || body.auto_select_completed_cycle === true,
    autoSelectLatestCompletedCycle: body.autoSelectLatestCompletedCycle === true || body.auto_select_latest_completed_cycle === true,
    limit: body.limit,
    reviewedBy: body.reviewedBy || body.reviewed_by || requestedWorkspaceId(request, url, ""),
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, ""),
    reviewedAt: body.reviewedAt || body.reviewed_at
  };
}

function normalizeLearningPlanPublishInput(body, workspaceId, request, url, planDraftId) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || workspaceId,
    planDraftId,
    itemId: body.itemId || body.item_id || body.selectedItemId || body.selected_item_id,
    generationKey: body.generationKey || body.generation_key,
    cardSchemaVersion: body.cardSchemaVersion || body.card_schema_version,
    requestedBy: requestedWorkspaceId(request, url, "")
  };
}

function normalizeAutomationProposalInput(body, workspaceId, target, request, url) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    horizon: body.horizon || "daily_plan",
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    availableMinutes: body.availableMinutes || body.available_minutes,
    allowedCardRoles: body.allowedCardRoles || body.allowed_card_roles,
    lowPressure: body.lowPressure !== undefined ? body.lowPressure : body.low_pressure,
    targetNodeIds: body.targetNodeIds || body.target_node_ids || body.nodeIds || body.node_ids,
    sourcePlanDraftId: body.sourcePlanDraftId || body.source_plan_draft_id || body.planDraftId || body.plan_draft_id,
    sourceTaskCardId: body.sourceTaskCardId || body.source_task_card_id || body.taskCardId || body.task_card_id,
    sourceEvaluationId: body.sourceEvaluationId || body.source_evaluation_id || body.evaluationId || body.evaluation_id,
    profileDeltaId: body.profileDeltaId || body.profile_delta_id,
    evidenceId: body.evidenceId || body.evidence_id,
    correctionId: body.correctionId || body.correction_id,
    sourceId: body.sourceId || body.source_id,
    sourceTargetNodeIds: body.sourceTargetNodeIds || body.source_target_node_ids,
    itemId: body.itemId || body.item_id || body.selectedItemId || body.selected_item_id,
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, "")
  };
}

function normalizeDomainPackProvisionInput(body, workspaceId, request, url) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || workspaceId,
    programId: body.programId || body.program_id,
    domainPackId: body.domainPackId || body.domain_pack_id,
    domain: body.domain,
    subject: body.subject,
    status: body.status || "active",
    source: body.source || "owner",
    requestedBy: requestedWorkspaceId(request, url, "")
  };
}

function normalizeAutomationProposalDecisionInput(body, workspaceId, target, request, url, proposalId) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    proposalId,
    status: body.status || body.reviewAction || body.review_action || body.action,
    reason: body.reason || body.note || body.summary,
    reviewedBy: body.reviewedBy || body.reviewed_by || requestedWorkspaceId(request, url, ""),
    decidedAt: body.decidedAt || body.decided_at || body.reviewedAt || body.reviewed_at
  };
}

function normalizeAutomationDigestReviewInput(body, workspaceId, target, request, url, digestId) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    digestId,
    status: body.status || body.reviewAction || body.review_action || body.action,
    selectedCandidateIds: body.selectedCandidateIds || body.selected_candidate_ids || body.candidateIds || body.candidate_ids,
    reason: body.reason || body.note || body.summary,
    note: body.note || body.reason || body.summary,
    reviewedBy: body.reviewedBy || body.reviewed_by || requestedWorkspaceId(request, url, ""),
    reviewedAt: body.reviewedAt || body.reviewed_at
  };
}

function normalizeAutomationFailurePolicyReviewInput(body, workspaceId, target, request, url, policyId) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    policyId,
    status: body.status || body.reviewAction || body.review_action || body.action,
    reason: body.reason || body.note || body.summary,
    note: body.note || body.reason || body.summary,
    reviewedBy: body.reviewedBy || body.reviewed_by || requestedWorkspaceId(request, url, ""),
    reviewedAt: body.reviewedAt || body.reviewed_at,
    affectedPolicyIds: body.affectedPolicyIds || body.affected_policy_ids
  };
}

function normalizeAutomationActionHandoffDeliverInput(body, workspaceId, target, request, url, handoffId) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    handoffId,
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, "")
  };
}

function normalizeAutomationProposalPublishInput(body, workspaceId, target, request, url, proposalId) {
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    proposalId,
    generationKey: body.generationKey || body.generation_key,
    cardSchemaVersion: body.cardSchemaVersion || body.card_schema_version,
    requestedBy: body.requestedBy || body.requested_by || requestedWorkspaceId(request, url, ""),
    executedAt: body.executedAt || body.executed_at
  };
}

function normalizeStageAssessmentInput(body, workspaceId) {
  const input = {
    cycleId: body.cycleId || body.cycle_id || body.id,
    workspaceId,
    learnerId: body.learnerId || body.learner_id || workspaceId,
    programId: body.programId || body.program_id,
    subjectId: body.subjectId || body.subject_id,
    capabilityClusterId: body.capabilityClusterId || body.capability_cluster_id,
    targetNodeId: body.targetNodeId || body.target_node_id,
    targetNodeIds: body.targetNodeIds || body.target_node_ids,
    assessmentCoverageNodeIds: body.assessmentCoverageNodeIds || body.assessment_coverage_node_ids || body.assessmentCoverage || body.assessment_coverage,
    difficultyBand: body.difficultyBand || body.difficulty_band,
    evidenceRequirements: body.evidenceRequirements || body.evidence_requirements,
    sourceSummaries: body.sourceSummaries || body.source_summaries,
    generationKey: body.generationKey || body.generation_key,
    taskCardId: body.taskCardId || body.task_card_id,
    activationSource: body.activationSource || body.activation_source || body.source,
    activationReason: body.activationReason || body.activation_reason,
    cooldownUntil: body.cooldownUntil || body.cooldown_until,
    sourceCardIds: body.sourceCardIds || body.source_card_ids,
    note: body.note
  };
  const domainPackId = body.domainPackId || body.domain_pack_id;
  if (domainPackId) input.domainPackId = domainPackId;
  if (body.domain) input.domain = body.domain;
  if (body.subject) input.subject = body.subject;
  return input;
}

function normalizeEvaluationOwnerReviewInput(body, workspaceId, request, url) {
  return {
    workspaceId,
    taskCardId: body.taskCardId || body.task_card_id,
    jobId: body.jobId || body.job_id || body.evaluationJobId || body.evaluation_job_id,
    action: body.action || "retry",
    reason: body.reason || body.note,
    reviewedBy: requestedWorkspaceId(request, url, "")
  };
}

async function handleGrowthRoute(request, response, url, services) {
  if (request.method === "GET" && url.pathname === "/api/v1/growth/status") {
    const workspaceId = requestedWorkspaceId(request, url);
    return sendJson(response, 200, await services.growthService.status({ workspaceId }));
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/board") {
    const workspaceId = requestedWorkspaceId(request, url);
    return sendJson(response, 200, await services.growthService.board({ workspaceId }));
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/view-targets") {
    return sendJson(response, 200, services.pluginService.viewTargets({
      actorRole: requestedActorRole(request),
      currentWorkspaceId: requestedWorkspaceId(request, url, "")
    }));
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/references/object-types") {
    const workspaceId = requestedWorkspaceId(request, url, "");
    const result = services.learningReferenceContractService.referenceObjectTypes({ workspaceId });
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  const referenceSummaryMatch = url.pathname.match(/^\/api\/v1\/growth\/references\/([^/]+)\/([^/]+)\/summary$/);
  if (request.method === "GET" && referenceSummaryMatch) {
    const target = readableTargetFromRequest(request, url, services);
    const result = await services.learningReferenceContractService.referenceSummarize({
      workspaceId: target.workspaceId,
      objectType: decodeURIComponent(referenceSummaryMatch[1] || ""),
      objectId: decodeURIComponent(referenceSummaryMatch[2] || ""),
      purpose: url.searchParams.get("purpose") || ""
    });
    return sendJson(response, result.ok ? 200 : 404, result);
  }

  const referenceGetMatch = url.pathname.match(/^\/api\/v1\/growth\/references\/([^/]+)\/([^/]+)$/);
  if (request.method === "GET" && referenceGetMatch) {
    const target = readableTargetFromRequest(request, url, services);
    const result = await services.learningReferenceContractService.referenceGet({
      workspaceId: target.workspaceId,
      objectType: decodeURIComponent(referenceGetMatch[1] || ""),
      objectId: decodeURIComponent(referenceGetMatch[2] || ""),
      purpose: url.searchParams.get("purpose") || ""
    });
    return sendJson(response, result.ok ? 200 : 404, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/card-generation/context") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningCardGenerationContextService.context(normalizeCardGenerationContextInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/daily-loop/preview") {
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_daily_loop_owner_required", "Daily loop preview requires Owner role", 403);
    }
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningDailyLoopService.preview(normalizeDailyLoopQueryInput(url, target, request));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/planner-readiness") {
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_planner_readiness_owner_required", "Planner readiness requires Owner role", 403);
    }
    const target = readableTargetFromRequest(request, url, services);
    const result = await services.learningPlanOrchestratorService.smokePlannerReadiness(
      normalizePlannerReadinessQueryInput(url, target, request)
    );
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/learning-loop/state") {
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_learning_loop_state_owner_required", "Learning loop state requires Owner role", 403);
    }
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningLoopStateService.state(normalizeDailyLoopQueryInput(url, target, request));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/learning-loop/runs") {
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_operating_loop_runs_owner_required", "Learning operating loop runs require Owner role", 403);
    }
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningOperatingLoopService.listRuns(
      normalizeOperatingLoopRunsQueryInput(url, target, request)
    );
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/stage-assessments/controls") {
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_stage_checkpoint_controls_owner_required", "Stage checkpoint controls require Owner role", 403);
    }
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningStageCheckpointControlsService.controls(
      normalizeStageCheckpointControlsInput(url, target, request)
    );
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/profile-delta-audits") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningProfileDeltaAuditService.listProfileDeltas(normalizeProfileDeltaAuditInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/evidence/audit") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningEvidenceAuditService.listEvidenceAudit(normalizeEvidenceAuditInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/learning-plans/audit") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningPlanAuditService.listPlanDrafts(normalizeLearningPlanAuditInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/learning-cycles/audit") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningCycleAuditService.listCycleAudit(normalizeLearningCycleAuditInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/learning-cycles/history") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningCycleHistoryService.listCycleHistory(normalizeLearningCycleHistoryInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/recommendations/lifecycle") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningRecommendationLifecycleService.listLifecycle(normalizeRecommendationLifecycleInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/recommendations/lifecycle/review") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_recommendation_lifecycle_owner_required", "Recommendation lifecycle review requires Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const result = services.learningRecommendationLifecycleService.reviewRecommendation(
      normalizeRecommendationLifecycleReviewInput(body, serviceWorkspaceId, request, url)
    );
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/learning-cycles/completeness") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAuditCompletenessService.evaluateCycleCompleteness(normalizeLearningCycleAuditInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/profile-feedback") {
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_profile_feedback_owner_required", "Profile feedback requires Owner role", 403);
    }
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningProfileFeedbackEvidenceService.evaluate(
      normalizeProfileFeedbackInput(url, target, request)
    );
    const readableSummary = result?.privacyClass === "summary_only" || result?.summaryOnly === true || result?.summary_only === true;
    return sendJson(response, result.ok || readableSummary ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/proposals") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationProposalService.listProposals(normalizeAutomationProposalListInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/digests") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationDigestService.listDigests(normalizeAutomationDigestListInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/action-handoffs") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationActionHandoffService.listHandoffs(normalizeAutomationActionHandoffListInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/closed-loop/action-plan") {
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_closed_loop_action_plan_owner_required", "Closed-loop action plan requires Owner role", 403);
    }
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationClosedLoopActionPlanService.actionPlan(
      normalizeAutomationClosedLoopActionPlanInput(url, target, request)
    );
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/platform-action-evidence") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationPlatformActionEvidenceService.evaluate(
      normalizeAutomationPlatformActionEvidenceInput(url, target)
    );
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/central-visual-evidence") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    const workspaceId = body.workspaceId
      || body.workspace_id
      || url.searchParams.get("workspaceId")
      || url.searchParams.get("workspace_id")
      || requestedWorkspaceId(request, url, "");
    const target = visibleTargetByWorkspace(request, url, services, workspaceId);
    const result = services.learningAutomationCentralVisualEvidenceService.evaluate(
      normalizeAutomationCentralVisualEvidenceInput(body, target)
    );
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/production-deployment-evidence") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    const workspaceId = body.workspaceId
      || body.workspace_id
      || url.searchParams.get("workspaceId")
      || url.searchParams.get("workspace_id")
      || requestedWorkspaceId(request, url, "");
    const target = visibleTargetByWorkspace(request, url, services, workspaceId);
    const result = services.learningAutomationProductionDeploymentEvidenceService.evaluate(
      normalizeAutomationProductionDeploymentEvidenceInput(body, target)
    );
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/ui-evidence") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    const workspaceId = body.workspaceId
      || body.workspace_id
      || url.searchParams.get("workspaceId")
      || url.searchParams.get("workspace_id")
      || requestedWorkspaceId(request, url, "");
    const target = visibleTargetByWorkspace(request, url, services, workspaceId);
    const result = services.learningAutomationUiEvidenceService.evaluate(
      normalizeAutomationUiEvidenceInput(body, target)
    );
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/scheduler/executions") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationSchedulerExecutionService.listExecutions(normalizeAutomationSchedulerExecutionListInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/scheduler/runs") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationSchedulerRunService.listRuns(normalizeAutomationSchedulerRunListInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/scheduler/worker-targets") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationSchedulerWorkerTargetService.listTargets(normalizeAutomationSchedulerWorkerTargetListInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-approvals") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleaseApprovalService.listApprovals(normalizeAutomationReleaseApprovalListInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-evidence") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleaseEvidenceService.listEvidence(normalizeAutomationReleaseEvidenceListInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-readiness") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleaseReadinessService.evaluateReadiness(normalizeAutomationReleaseReadinessQueryInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-controls") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleaseControlsService.summarize(normalizeAutomationReleaseControlsInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-dashboard") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleaseDashboardService.dashboard(normalizeAutomationReleaseDashboardInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-workbench") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleaseWorkbenchService.workbench(normalizeAutomationReleaseWorkbenchInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-workbench/action-audits") {
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_release_workbench_action_audit_owner_required", "Automation release workbench action audits require Owner role", 403);
    }
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleaseWorkbenchActionService.listActionAudits(
      normalizeAutomationReleaseWorkbenchActionAuditListInput(url, target)
    );
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-preflight") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleasePreflightService.evaluate(normalizeAutomationReleasePreflightInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-preflight-reports") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleasePreflightService.listReports(normalizeAutomationReleasePreflightInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-artifact-template") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleaseEvidenceArtifactTemplateService.template(
      normalizeAutomationReleaseArtifactTemplateInput(url, target)
    );
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/owner-review-evidence") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationOwnerReviewEvidenceService.evaluate(normalizeAutomationOwnerReviewEvidenceInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-inventory") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleaseInventoryService.inventory(normalizeAutomationReleaseInventoryInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-readiness/snapshots") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleaseReadinessService.listSnapshots(normalizeAutomationReleaseReadinessListInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-collection-runs") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleaseCollectionRunService.listRuns(normalizeAutomationReleaseCollectionRunListInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-decisions") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleaseDecisionService.listDecisions(normalizeAutomationReleaseDecisionListInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-packages") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleasePackageService.listPackages(normalizeAutomationReleasePackageListInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-review") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleaseReviewService.review(normalizeAutomationReleaseReviewInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-authorization") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleaseAuthorizationService.authorize(normalizeAutomationReleaseAuthorizationInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-closure") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleaseClosureService.summarize(normalizeAutomationReleaseClosureInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-activation") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleaseActivationService.preflight(normalizeAutomationReleaseActivationInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-activations") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleaseActivationService.listActivations(normalizeAutomationReleaseActivationInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/runtime-enablement") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationRuntimeEnablementService.evaluate(normalizeAutomationRuntimeEnablementInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/runtime-enablements") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationRuntimeEnablementService.listEnablements(normalizeAutomationRuntimeEnablementInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/failure-policies") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationFailurePolicyService.listPolicies(normalizeAutomationFailurePolicyListInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/failure-policies/readiness") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationFailurePolicyService.evaluateReadiness(normalizeAutomationFailurePolicyListInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/profile-corrections") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningOwnerCorrectionService.listCorrections(normalizeProfileCorrectionListInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/owner-audit/reviews") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningOwnerAuditReviewService.listReviews(normalizeOwnerAuditReviewListInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  const cardMatch = url.pathname.match(/^\/api\/v1\/growth\/cards\/([^/]+)$/);
  if (request.method === "GET" && cardMatch) {
    const workspaceId = requestedWorkspaceId(request, url);
    const taskCardId = decodeURIComponent(cardMatch[1] || "");
    const result = await services.growthService.card({ workspaceId, taskCardId });
    return sendJson(response, result.ok ? 200 : 404, result);
  }

  const submissionMatch = url.pathname.match(/^\/api\/v1\/growth\/cards\/([^/]+)\/submissions$/);
  if (request.method === "POST" && submissionMatch) {
    const body = await readJson(request, { maxBytes: SUBMISSION_JSON_LIMIT_BYTES });
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const taskCardId = decodeURIComponent(submissionMatch[1] || "");
    const result = await services.growthService.submitEvidence({
      workspaceId: serviceWorkspaceId,
      taskCardId,
      body
    });
    return sendJson(response, result.ok ? 202 : 400, result);
  }

  const reflectionMatch = url.pathname.match(/^\/api\/v1\/growth\/cards\/([^/]+)\/reflections$/);
  if (request.method === "POST" && reflectionMatch) {
    const body = await readJson(request, { maxBytes: SUBMISSION_JSON_LIMIT_BYTES });
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const taskCardId = decodeURIComponent(reflectionMatch[1] || "");
    const result = await services.growthService.submitReflection({
      workspaceId: serviceWorkspaceId,
      taskCardId,
      body
    });
    return sendJson(response, result.ok ? 202 : 400, result);
  }

  const experienceSignalMatch = url.pathname.match(/^\/api\/v1\/growth\/cards\/([^/]+)\/experience-signals$/);
  if (request.method === "POST" && experienceSignalMatch) {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const taskCardId = decodeURIComponent(experienceSignalMatch[1] || "");
    const result = services.learningExperienceSignalService.recordSignal(Object.assign({}, body, {
      workspaceId: serviceWorkspaceId,
      learnerId: body.learnerId || body.learner_id || serviceWorkspaceId,
      taskCardId
    }));
    return sendJson(response, result.ok ? 202 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/evaluations/process") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const result = await services.growthEvaluationService.processEvaluationQueue({
      workspaceId: serviceWorkspaceId,
      limit: body.limit
    });
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/evaluations/owner-review") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_evaluation_owner_required", "Evaluation owner review requires Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const result = services.learningEvaluationOwnerReviewService.retryFailedEvaluation(
      normalizeEvaluationOwnerReviewInput(body, serviceWorkspaceId, request, url)
    );
    return sendJson(response, result.ok ? 202 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/profile-corrections") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_profile_correction_owner_required", "Profile correction requires Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = services.learningOwnerCorrectionService.recordCorrection(
      normalizeProfileCorrectionInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? (result.evidenceLedger?.duplicateCount ? 200 : 201) : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/owner-audit/reviews") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_owner_audit_review_owner_required", "Owner audit review requires Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = services.learningOwnerAuditReviewService.review(
      normalizeOwnerAuditReviewInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/learning-coins/balance") {
    const workspaceId = String(url.searchParams.get("workspace_id") || url.searchParams.get("workspaceId") || "");
    const authorized = services.pluginService.authorizeWorkspace({
      authorizationToken: bearerFrom(request.headers),
      workspaceId
    });
    const serviceWorkspaceId = serviceWorkspaceIdFromAuthorization(authorized);
    const result = await services.growthService.learningCoinBalance({ workspaceId: serviceWorkspaceId });
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/learning-coins/monthly-exchange-clear") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const result = await services.growthService.clearLearningCoinBalanceForMonthlyExchange({
      workspaceId: serviceWorkspaceId,
      body
    });
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/graph/plans") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const result = await services.learningGraphPlanService.createPlan(normalizeGraphPlanInput(body, serviceWorkspaceId));
    return sendJson(response, result.ok ? 201 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/cards/generate") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const result = await services.learningCardGenerationService.generateCard(
      normalizeCardGenerationInput(body, serviceWorkspaceId)
    );
    return sendJson(response, result.ok ? 201 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/learning-plans/draft") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const result = await services.learningPlanPublisherService.draftPlan(
      normalizeLearningPlanDraftInput(body, serviceWorkspaceId, request, url)
    );
    return sendJson(response, result.ok ? 201 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/daily-loop/draft") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_daily_loop_owner_required", "Daily loop draft requires Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = await services.learningDailyLoopService.draft(
      normalizeDailyLoopBodyInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/daily-loop/advance") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_daily_loop_owner_required", "Daily loop advance requires Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = await services.learningDailyLoopService.advance(
      normalizeDailyLoopBodyInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/learning-loop/advance") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_operating_loop_owner_required", "Learning operating loop advance requires Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = await services.learningOperatingLoopService.runNext(
      normalizeOperatingLoopBodyInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? 201 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/cycle-closures/prepare") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_cycle_closure_owner_required", "Automation cycle closure requires Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = await services.learningAutomationCycleClosureService.prepareReviewPacket(
      normalizeAutomationCycleClosureInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? 201 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/review-advancements/advance") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_review_advancement_owner_required", "Automation review advancement requires Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = await services.learningAutomationReviewAdvancementService.advance(
      normalizeAutomationReviewAdvancementInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? 201 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/proposals") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_proposal_owner_required", "Automation proposals require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = await services.learningAutomationProposalService.createProposal(
      normalizeAutomationProposalInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/scheduler/dry-run") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_scheduler_owner_required", "Automation scheduler dry-run requires Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = services.learningAutomationSchedulerService.dryRun(
      normalizeAutomationSchedulerDryRunInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/scheduler/run-once") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_scheduler_run_owner_required", "Automation scheduler run requires Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = await services.learningAutomationSchedulerRunService.runOnce(
      normalizeAutomationSchedulerRunInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? 202 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/scheduler/worker-targets") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_scheduler_worker_target_owner_required", "Automation scheduler worker targets require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = services.learningAutomationSchedulerWorkerTargetService.createTarget(
      normalizeAutomationSchedulerWorkerTargetInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/release-readiness/snapshots") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_release_readiness_owner_required", "Automation release-readiness snapshots require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = services.learningAutomationReleaseReadinessService.createSnapshot(
      normalizeAutomationReleaseReadinessSnapshotInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/release-collection-runs") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_release_collection_run_owner_required", "Automation release collection runs require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = services.learningAutomationReleaseCollectionRunService.recordRun(
      normalizeAutomationReleaseCollectionRunInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/release-decisions") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_release_decision_owner_required", "Automation release decisions require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = services.learningAutomationReleaseDecisionService.recordDecision(
      normalizeAutomationReleaseDecisionInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/release-evidence-collections/run") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_release_evidence_collection_owner_required", "Automation release evidence collection requires Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = services.learningAutomationReleaseEvidenceCollectionService.collect(
      normalizeAutomationReleaseEvidenceCollectionInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.collection ? 200 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/release-packages/build") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_release_package_build_owner_required", "Automation release package build requires Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const packageBuildService = services.learningAutomationReleasePackageBuildService || services.learningAutomationReleasePackageService;
    const result = packageBuildService.buildPackage(
      normalizeAutomationReleasePackageBuildInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.package ? 200 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/release-packages") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_release_package_owner_required", "Automation release packages require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = services.learningAutomationReleasePackageService.recordPackage(
      normalizeAutomationReleasePackageInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/release-approvals") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_release_approval_owner_required", "Automation release approvals require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = services.learningAutomationReleaseApprovalService.recordApproval(
      normalizeAutomationReleaseApprovalInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/release-evidence") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_release_evidence_owner_required", "Automation release evidence records require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = services.learningAutomationReleaseEvidenceService.recordEvidence(
      normalizeAutomationReleaseEvidenceInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/release-workbench/actions") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_release_workbench_action_owner_required", "Automation release workbench actions require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const input = applyReleaseEvidenceArtifactManifestInput(
      normalizeAutomationReleaseWorkbenchActionInput(body, serviceWorkspaceId, target, request, url),
      services
    );
    const result = await services.learningAutomationReleaseWorkbenchActionService.recordAction(
      input
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/release-preflight-reports") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_release_preflight_owner_required", "Automation release preflight reports require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = services.learningAutomationReleasePreflightService.recordReport(
      normalizeAutomationReleasePreflightRecordInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/release-activations") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_release_activation_owner_required", "Automation release activation records require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = services.learningAutomationReleaseActivationService.recordActivation(
      normalizeAutomationReleaseActivationRecordInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/runtime-enablements") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_runtime_enablement_owner_required", "Automation runtime enablement records require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = services.learningAutomationRuntimeEnablementService.recordEnablement(
      normalizeAutomationRuntimeEnablementRecordInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/scheduler/execute-once") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_scheduler_execution_owner_required", "Automation scheduler execution requires Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = await services.learningAutomationSchedulerExecutionService.executeOnce(
      normalizeAutomationSchedulerExecutionInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? (result.execution?.status === "published" ? 201 : 200) : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/digests") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_digest_owner_required", "Automation digests require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = services.learningAutomationDigestService.createDigest(
      normalizeAutomationDigestInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/failure-policies") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_failure_policy_owner_required", "Automation failure policies require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = services.learningAutomationFailurePolicyService.createPolicy(
      normalizeAutomationFailurePolicyInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/automation/action-handoffs") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_action_handoff_owner_required", "Automation action handoffs require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = services.learningAutomationActionHandoffService.createHandoff(
      normalizeAutomationActionHandoffInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  const automationProposalDecisionMatch = url.pathname.match(/^\/api\/v1\/growth\/automation\/proposals\/([^/]+)\/decision$/);
  if (request.method === "POST" && automationProposalDecisionMatch) {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_proposal_owner_required", "Automation proposals require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const proposalId = decodeURIComponent(automationProposalDecisionMatch[1] || "");
    const result = services.learningAutomationProposalService.reviewProposal(
      normalizeAutomationProposalDecisionInput(body, serviceWorkspaceId, target, request, url, proposalId)
    );
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  const automationProposalPublishMatch = url.pathname.match(/^\/api\/v1\/growth\/automation\/proposals\/([^/]+)\/publish$/);
  if (request.method === "POST" && automationProposalPublishMatch) {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_proposal_owner_required", "Automation proposals require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const proposalId = decodeURIComponent(automationProposalPublishMatch[1] || "");
    const result = await services.learningAutomationProposalService.publishAcceptedProposal(
      normalizeAutomationProposalPublishInput(body, serviceWorkspaceId, target, request, url, proposalId)
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  const automationDigestReviewMatch = url.pathname.match(/^\/api\/v1\/growth\/automation\/digests\/([^/]+)\/review$/);
  if (request.method === "POST" && automationDigestReviewMatch) {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_digest_owner_required", "Automation digests require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const digestId = decodeURIComponent(automationDigestReviewMatch[1] || "");
    const result = services.learningAutomationDigestService.reviewDigest(
      normalizeAutomationDigestReviewInput(body, serviceWorkspaceId, target, request, url, digestId)
    );
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  const automationFailurePolicyReviewMatch = url.pathname.match(/^\/api\/v1\/growth\/automation\/failure-policies\/([^/]+)\/review$/);
  if (request.method === "POST" && automationFailurePolicyReviewMatch) {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_failure_policy_owner_required", "Automation failure policies require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const policyId = decodeURIComponent(automationFailurePolicyReviewMatch[1] || "");
    const result = services.learningAutomationFailurePolicyService.reviewPolicy(
      normalizeAutomationFailurePolicyReviewInput(body, serviceWorkspaceId, target, request, url, policyId)
    );
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  const automationActionHandoffDeliverMatch = url.pathname.match(/^\/api\/v1\/growth\/automation\/action-handoffs\/([^/]+)\/deliver$/);
  if (request.method === "POST" && automationActionHandoffDeliverMatch) {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_action_handoff_owner_required", "Automation action handoffs require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const handoffId = decodeURIComponent(automationActionHandoffDeliverMatch[1] || "");
    const result = await services.learningAutomationActionHandoffService.deliverHandoff(
      normalizeAutomationActionHandoffDeliverInput(body, serviceWorkspaceId, target, request, url, handoffId)
    );
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  const automationSchedulerWorkerTargetReviewMatch = url.pathname.match(/^\/api\/v1\/growth\/automation\/scheduler\/worker-targets\/([^/]+)\/review$/);
  if (request.method === "POST" && automationSchedulerWorkerTargetReviewMatch) {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_automation_scheduler_worker_target_owner_required", "Automation scheduler worker targets require Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const targetId = decodeURIComponent(automationSchedulerWorkerTargetReviewMatch[1] || "");
    const result = services.learningAutomationSchedulerWorkerTargetService.reviewTarget(
      normalizeAutomationSchedulerWorkerTargetReviewInput(body, serviceWorkspaceId, target, request, url, targetId)
    );
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/domain-pack-provisions") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_domain_pack_provision_owner_required", "Domain-pack provisioning requires Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const result = services.learningTargetProvisioningService.provisionDomainPack(
      normalizeDomainPackProvisionInput(body, serviceWorkspaceId, request, url)
    );
    return sendJson(response, result.ok ? 201 : 400, result);
  }

  const learningPlanPublishMatch = url.pathname.match(/^\/api\/v1\/growth\/learning-plans\/([^/]+)\/publish$/);
  if (request.method === "POST" && learningPlanPublishMatch) {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const planDraftId = decodeURIComponent(learningPlanPublishMatch[1] || "");
    const result = await services.learningPlanPublisherService.publishPlanItem(
      normalizeLearningPlanPublishInput(body, serviceWorkspaceId, request, url, planDraftId)
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/daily-loop/publish") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_daily_loop_owner_required", "Daily loop publish requires Owner role", 403);
    }
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const target = visibleTargetByWorkspace(request, url, services, serviceWorkspaceId);
    const result = await services.learningDailyLoopService.publish(
      normalizeDailyLoopBodyInput(body, serviceWorkspaceId, target, request, url)
    );
    return sendJson(response, result.ok ? (result.duplicate ? 200 : 201) : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/stage-assessments/eligibility") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const result = services.learningStageAssessmentService.evaluateEligibility(
      normalizeStageAssessmentInput(body, serviceWorkspaceId)
    );
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/stage-assessments/activate") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const requestedSource = String(body.activationSource || body.activation_source || "").trim().toLowerCase();
    if (requestedSource === "owner_manual" && requestedActorRole(request) !== "owner") {
      throw routeError("growth_stage_assessment_owner_required", "Owner manual activation requires Owner role", 403);
    }
    if (requestedSource === "executor_challenge" && requestedActorRole(request) !== "owner") {
      throw routeError("growth_stage_assessment_challenge_route_required", "Learner challenge activation must use the challenge route", 403);
    }
    const result = await services.learningStageAssessmentService.activateStageAssessment(Object.assign(
      normalizeStageAssessmentInput(body, serviceWorkspaceId),
      {
        activationSource: requestedActorRole(request) === "owner"
          ? (body.activationSource || body.activation_source || "owner_manual")
          : (body.activationSource || body.activation_source || "system")
      }
    ));
    return sendJson(response, result.ok ? 201 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/stage-assessments/challenge") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const requestedLearnerId = String(body.learnerId || body.learner_id || serviceWorkspaceId).replace(/^growth:/, "");
    if (requestedLearnerId && requestedLearnerId !== serviceWorkspaceId) {
      throw routeError("growth_stage_assessment_challenge_not_visible", "Learner challenge can only target its own workspace", 403);
    }
    const result = await services.learningStageAssessmentService.activateStageAssessment(Object.assign(
      normalizeStageAssessmentInput(body, serviceWorkspaceId),
      { learnerId: serviceWorkspaceId, activationSource: "executor_challenge" }
    ));
    return sendJson(response, result.ok ? 201 : 400, result);
  }

  const graphBindingMatch = url.pathname.match(/^\/api\/v1\/growth\/cards\/([^/]+)\/graph-binding$/);
  if (request.method === "POST" && graphBindingMatch) {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const taskCardId = decodeURIComponent(graphBindingMatch[1] || "");
    const result = await services.learningCardGraphBindingService.bindCard(
      normalizeCardGraphBindingInput(body, serviceWorkspaceId, taskCardId)
    );
    return sendJson(response, result.ok ? 201 : 400, result);
  }

  const audioMatch = url.pathname.match(/^\/api\/v1\/growth\/audio\/(submissions|reflections)\/([^/]+)$/);
  if (request.method === "GET" && audioMatch) {
    const workspaceId = requestedWorkspaceId(request, url);
    const recordType = audioMatch[1] === "submissions" ? "submission" : "reflection";
    const recordId = decodeURIComponent(audioMatch[2] || "");
    const audio = await services.growthService.audio({ workspaceId, recordType, recordId });
    if (audio && streamAudio(response, audio)) return true;
    return sendJson(response, 404, { ok: false, error: "growth_audio_not_found" });
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/mcp/schemas") {
    return sendJson(response, 200, {
      ok: true,
      toolset: "growth",
      schemas: listGrowthMcpSchemas()
    });
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/mcp/execute") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    const input = body.input || body.arguments || {};
    const workspaceId = body.workspace_id || body.workspaceId || input.workspace_id || input.workspaceId;
    const authorized = services.pluginService.authorizeWorkspace({
      authorizationToken: bearerFrom(request.headers),
      workspaceId
    });
    const serviceWorkspaceId = authorized.hermes_workspace_id || String(authorized.workspace_id || "").replace(/^growth:/, "");
    const result = await services.growthMcpExecutor.execute({
      name: body.name || body.tool_name || body.toolName,
      input: Object.assign({}, input, { workspace_id: serviceWorkspaceId })
    });
    return sendJson(response, result.ok ? 200 : 404, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/events") {
    services.pluginService.authorizeRegistration({ authorizationToken: bearerFrom(request.headers) });
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    return sendJson(response, 202, await services.growthEventService.emit(body));
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/migrations/facade-snapshot") {
    services.pluginService.authorizeRegistration({ authorizationToken: bearerFrom(request.headers) });
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    return sendJson(response, 200, await services.growthService.importFromFacade({
      workspaceId: body.workspace_id || body.workspaceId,
      includeCardDetails: body.include_card_details !== false && body.includeCardDetails !== false
    }));
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/migrations/readback") {
    services.pluginService.authorizeRegistration({ authorizationToken: bearerFrom(request.headers) });
    const workspaceId = String(url.searchParams.get("workspace_id") || url.searchParams.get("workspaceId") || "growth:local-dev");
    const result = services.growthService.migrationReadback({ workspaceId });
    return sendJson(response, result.ok ? 200 : 404, result);
  }

  return false;
}

module.exports = { handleGrowthRoute };
