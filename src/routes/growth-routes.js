const fs = require("node:fs");
const { bearerFrom, readJson, routeError, sendJson } = require("./http-utils");
const { listGrowthMcpSchemas } = require("../mcp/growth-mcp-schemas");

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
    horizon: url.searchParams.get("horizon") || "daily_plan",
    availableMinutes: url.searchParams.get("availableMinutes") || url.searchParams.get("available_minutes") || "",
    targetNodeIds: csvStrings(url.searchParams.get("targetNodeIds") || url.searchParams.get("target_node_ids") || ""),
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

function normalizeDailyLoopBodyInput(body, workspaceId, target, request, url, extra = {}) {
  return Object.assign({
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

function readinessEvidenceFromBody(body = {}) {
  const evidence = body.evidence || body.evidenceSummary || body.evidence_summary || {};
  return Object.assign({}, evidence, {
    ownerDailyUiEvidence: body.ownerDailyUiEvidence || body.owner_daily_ui_evidence || evidence.ownerDailyUiEvidence || evidence.owner_daily_ui_evidence,
    ownerAuditUiEvidence: body.ownerAuditUiEvidence || body.owner_audit_ui_evidence || evidence.ownerAuditUiEvidence || evidence.owner_audit_ui_evidence,
    stageCheckpointEvidence: body.stageCheckpointEvidence || body.stage_checkpoint_evidence || evidence.stageCheckpointEvidence || evidence.stage_checkpoint_evidence,
    proposalReviewUiEvidence: body.proposalReviewUiEvidence || body.proposal_review_ui_evidence || evidence.proposalReviewUiEvidence || evidence.proposal_review_ui_evidence,
    productionPlannerReadinessEvidence: body.productionPlannerReadinessEvidence || body.production_planner_readiness_evidence || evidence.productionPlannerReadinessEvidence || evidence.production_planner_readiness_evidence,
    platformActionEvidence: body.platformActionEvidence || body.platform_action_evidence || evidence.platformActionEvidence || evidence.platform_action_evidence,
    centralVisualEvidence: body.centralVisualEvidence || body.central_visual_evidence || evidence.centralVisualEvidence || evidence.central_visual_evidence
  });
}

function readinessEvidenceFromQuery(url) {
  return {
    ownerDailyUiEvidence: truthy(url.searchParams.get("ownerDailyUiEvidence") || url.searchParams.get("owner_daily_ui_evidence")),
    ownerAuditUiEvidence: truthy(url.searchParams.get("ownerAuditUiEvidence") || url.searchParams.get("owner_audit_ui_evidence")),
    stageCheckpointEvidence: truthy(url.searchParams.get("stageCheckpointEvidence") || url.searchParams.get("stage_checkpoint_evidence")),
    proposalReviewUiEvidence: truthy(url.searchParams.get("proposalReviewUiEvidence") || url.searchParams.get("proposal_review_ui_evidence")),
    productionPlannerReadinessEvidence: truthy(url.searchParams.get("productionPlannerReadinessEvidence") || url.searchParams.get("production_planner_readiness_evidence")),
    platformActionEvidence: truthy(url.searchParams.get("platformActionEvidence") || url.searchParams.get("platform_action_evidence")),
    centralVisualEvidence: truthy(url.searchParams.get("centralVisualEvidence") || url.searchParams.get("central_visual_evidence"))
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
  return {
    workspaceId,
    learnerId: body.learnerId || body.learner_id || target?.workspaceId || workspaceId,
    displayName: target?.label || body.displayName || body.display_name,
    label: target?.label || body.label,
    programId: body.programId || body.program_id,
    handoffId: body.handoffId || body.handoff_id,
    digestId: body.digestId || body.digest_id,
    policyId: body.policyId || body.policy_id,
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
  return {
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

  if (request.method === "GET" && url.pathname === "/api/v1/growth/learning-loop/state") {
    if (requestedActorRole(request) !== "owner") {
      throw routeError("growth_learning_loop_state_owner_required", "Learning loop state requires Owner role", 403);
    }
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningLoopStateService.state(normalizeDailyLoopQueryInput(url, target, request));
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

  if (request.method === "GET" && url.pathname === "/api/v1/growth/learning-cycles/completeness") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAuditCompletenessService.evaluateCycleCompleteness(normalizeLearningCycleAuditInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
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

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-readiness") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleaseReadinessService.evaluateReadiness(normalizeAutomationReleaseReadinessQueryInput(url, target));
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/automation/release-readiness/snapshots") {
    const target = readableTargetFromRequest(request, url, services);
    const result = services.learningAutomationReleaseReadinessService.listSnapshots(normalizeAutomationReleaseReadinessListInput(url, target));
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
