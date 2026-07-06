import {
  appendWorkspaceQuery,
  growthApiPath,
  proxyPrefixFromLocation,
  resolveApiPath,
  resolveGrowthApiPath
} from "../platform/proxyUrl.js";
import { baseGrowthQuery, appendQueryArrayParam, appendQueryParam, queryString } from "./queryParams.js";
import {
  fetchJsonWithGrowthErrors,
  fetchReadableJsonWithGrowthErrors,
  jsonPostOptions,
  requestOptionsWithLaunchToken
} from "./request.js";
import { clean } from "../utils/string.js";

function selectionValue(selection, ...keys) {
  for (const key of keys) {
    const value = selection?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

export function cardGenerationContextQuery(targetWorkspaceId = "", selection = {}, { proxyPrefix = "" } = {}) {
  const params = baseGrowthQuery(targetWorkspaceId, { proxyPrefix });
  appendQueryParam(params, "recipeId", selectionValue(selection, "recipeId", "recipe_id", "selectedRecipeId", "selected_recipe_id"));
  appendQueryParam(params, "domainPackId", selectionValue(selection, "domainPackId", "domain_pack_id"));
  appendQueryParam(params, "domain", selection.domain);
  appendQueryParam(params, "subject", selection.subject);
  appendQueryParam(params, "horizon", selection.horizon);
  appendQueryParam(params, "availableMinutes", selectionValue(selection, "availableMinutes", "available_minutes"));
  return queryString(params);
}

export function learningLoopStateQuery(targetWorkspaceId = "", context = {}, { proxyPrefix = "" } = {}) {
  const params = baseGrowthQuery(targetWorkspaceId, { proxyPrefix });
  const target = context.target || {};
  const plan = context.suggestedPlan || {};
  const defaults = context.generationDefaults || {};
  const targetNodeIds = Array.isArray(plan.targetNodeIds) && plan.targetNodeIds.length
    ? plan.targetNodeIds
    : [plan.targetNodeId].filter(Boolean);
  const assessmentCoverageNodeIds = Array.isArray(plan.assessmentCoverageNodeIds) && plan.assessmentCoverageNodeIds.length
    ? plan.assessmentCoverageNodeIds
    : Array.isArray(plan.assessmentCoverage) && plan.assessmentCoverage.length
      ? plan.assessmentCoverage
      : targetNodeIds;

  appendQueryParam(params, "learnerId", target.learnerId || targetWorkspaceId);
  appendQueryParam(params, "programId", context.programId || plan.programId);
  appendQueryParam(params, "domainPackId", context.domainPackId || plan.domainPackId);
  appendQueryParam(params, "domain", plan.domain || context.domain || defaults.domain);
  appendQueryParam(params, "subject", plan.subject || context.subject || defaults.subject || plan.domain || context.domain);
  appendQueryParam(params, "subjectId", plan.subjectId || plan.subject_id || plan.subject || context.subjectId || context.subject_id || context.subject || defaults.subject);
  appendQueryParam(params, "capabilityClusterId", plan.capabilityClusterId || plan.capability_cluster_id || context.capabilityClusterId || context.capability_cluster_id);
  appendQueryParam(params, "horizon", context.horizon || defaults.horizon || "daily_plan");
  appendQueryParam(params, "availableMinutes", defaults.availableMinutes || context.availableMinutes || 15);
  appendQueryParam(params, "targetNodeIds", targetNodeIds.join(","));
  appendQueryParam(params, "assessmentCoverageNodeIds", assessmentCoverageNodeIds.join(","));
  return queryString(params);
}

function scopedReleaseQuery(targetWorkspaceId = "", payload = {}, { proxyPrefix = "" } = {}) {
  const params = baseGrowthQuery(payload.workspaceId || payload.workspace_id || targetWorkspaceId, { proxyPrefix });
  appendQueryParam(params, "learnerId", payload.learnerId || payload.learner_id);
  appendQueryParam(params, "programId", payload.programId || payload.program_id);
  appendQueryParam(params, "domainPackId", payload.domainPackId || payload.domain_pack_id);
  appendQueryParam(params, "domain", payload.domain);
  appendQueryParam(params, "subject", payload.subject);
  appendQueryParam(params, "horizon", payload.horizon);
  appendQueryParam(params, "collectionRunId", payload.collectionRunId || payload.collection_run_id);
  return params;
}

function scopedAutomationQuery(targetWorkspaceId = "", payload = {}, { proxyPrefix = "" } = {}) {
  const params = baseGrowthQuery(payload.workspaceId || payload.workspace_id || targetWorkspaceId, { proxyPrefix });
  appendQueryParam(params, "learnerId", payload.learnerId || payload.learner_id);
  appendQueryParam(params, "programId", payload.programId || payload.program_id);
  appendQueryParam(params, "domainPackId", payload.domainPackId || payload.domain_pack_id);
  appendQueryParam(params, "domain", payload.domain);
  appendQueryParam(params, "subject", payload.subject);
  appendQueryParam(params, "horizon", payload.horizon);
  appendQueryParam(params, "status", payload.status);
  return params;
}

export function learningOperatingLoopRunsQuery(targetWorkspaceId = "", payload = {}, { proxyPrefix = "" } = {}) {
  const params = baseGrowthQuery(payload.workspaceId || payload.workspace_id || targetWorkspaceId, { proxyPrefix });
  const target = payload.target || {};
  const plan = payload.suggestedPlan || {};
  const defaults = payload.generationDefaults || {};
  appendQueryParam(params, "learnerId", payload.learnerId || payload.learner_id || target.learnerId || payload.workspaceId || payload.workspace_id || targetWorkspaceId);
  appendQueryParam(params, "programId", payload.programId || payload.program_id || plan.programId || defaults.programId);
  appendQueryParam(params, "domainPackId", payload.domainPackId || payload.domain_pack_id || plan.domainPackId || defaults.domainPackId);
  appendQueryParam(params, "domain", payload.domain || plan.domain || defaults.domain);
  appendQueryParam(params, "subject", payload.subject || plan.subject || defaults.subject || plan.domain || payload.domain);
  appendQueryParam(params, "horizon", payload.horizon || defaults.horizon || "daily_plan");
  appendQueryParam(params, "action", payload.action);
  appendQueryParam(params, "status", payload.status);
  appendQueryParam(params, "runId", payload.runId || payload.run_id);
  appendQueryParam(params, "taskCardId", payload.taskCardId || payload.task_card_id);
  appendQueryParam(params, "planDraftId", payload.planDraftId || payload.plan_draft_id);
  appendQueryParam(params, "stageAssessmentCycleId", payload.stageAssessmentCycleId || payload.stage_assessment_cycle_id);
  appendQueryParam(params, "limit", payload.limit || 5);
  return queryString(params);
}

export function releaseWorkbenchQuery(targetWorkspaceId = "", context = {}, { proxyPrefix = "" } = {}) {
  const params = baseGrowthQuery(targetWorkspaceId, { proxyPrefix });
  const target = context.target || {};
  const plan = context.suggestedPlan || {};
  const defaults = context.generationDefaults || {};
  const releaseWorkbench = context.releaseWorkbench?.releaseWorkbench || context.releaseWorkbench || {};
  const inventory = releaseWorkbench.inventory || context.releaseInventory || {};
  appendQueryParam(params, "learnerId", target.learnerId || targetWorkspaceId);
  appendQueryParam(params, "programId", context.programId || plan.programId || defaults.programId);
  appendQueryParam(params, "domainPackId", context.domainPackId || plan.domainPackId || defaults.domainPackId);
  appendQueryParam(params, "domain", plan.domain || context.domain || defaults.domain);
  appendQueryParam(params, "subject", plan.subject || context.subject || defaults.subject || plan.domain || context.domain);
  appendQueryParam(params, "horizon", context.horizon || defaults.horizon || "daily_plan");
  appendQueryParam(params, "collectionRunId", context.collectionRunId || inventory.latestCollectionRunId);
  return queryString(params);
}

export function releaseWorkbenchActionAuditQuery(targetWorkspaceId = "", payload = {}, { proxyPrefix = "" } = {}) {
  const params = scopedReleaseQuery(targetWorkspaceId, payload, { proxyPrefix });
  appendQueryParam(params, "endpointKey", payload.endpointKey || payload.endpoint_key);
  appendQueryParam(params, "actionKey", payload.actionKey || payload.action_key);
  appendQueryParam(params, "status", payload.status);
  appendQueryParam(params, "limit", payload.limit || 5);
  return queryString(params);
}

export function releaseStatusReadbackQuery(targetWorkspaceId = "", payload = {}, { proxyPrefix = "" } = {}) {
  const params = scopedReleaseQuery(targetWorkspaceId, payload, { proxyPrefix });
  appendQueryParam(params, "limit", payload.limit || 4);
  appendQueryParam(params, "activationRecordLimit", payload.activationRecordLimit || payload.activation_record_limit);
  appendQueryParam(params, "runtimeEnablementRecordLimit", payload.runtimeEnablementRecordLimit || payload.runtime_enablement_record_limit);
  return queryString(params);
}

export function releaseLifecycleRecordQuery(targetWorkspaceId = "", payload = {}, { proxyPrefix = "" } = {}) {
  const params = scopedReleaseQuery(targetWorkspaceId, payload, { proxyPrefix });
  appendQueryParam(params, "status", payload.status);
  appendQueryParam(params, "enablementStatus", payload.enablementStatus || payload.enablement_status);
  appendQueryArrayParam(params, "activationGates", payload.activationGates || payload.activation_gates);
  appendQueryParam(params, "limit", payload.limit || 5);
  return queryString(params);
}

export function automationClosedLoopActionPlanQuery(targetWorkspaceId = "", payload = {}, { proxyPrefix = "" } = {}) {
  const params = baseGrowthQuery(payload.workspaceId || payload.workspace_id || targetWorkspaceId, { proxyPrefix });
  appendQueryParam(params, "learnerId", payload.learnerId || payload.learner_id);
  appendQueryParam(params, "programId", payload.programId || payload.program_id);
  appendQueryParam(params, "domainPackId", payload.domainPackId || payload.domain_pack_id);
  appendQueryParam(params, "domain", payload.domain);
  appendQueryParam(params, "subject", payload.subject);
  appendQueryParam(params, "horizon", payload.horizon);
  appendQueryParam(params, "availableMinutes", payload.availableMinutes || payload.available_minutes);
  appendQueryArrayParam(params, "targetNodeIds", payload.targetNodeIds || payload.target_node_ids || payload.nodeIds || payload.node_ids);
  appendQueryArrayParam(params, "sourceTargetNodeIds", payload.sourceTargetNodeIds || payload.source_target_node_ids);
  appendQueryParam(params, "cycleId", payload.cycleId || payload.cycle_id);
  appendQueryParam(params, "sourcePlanDraftId", payload.sourcePlanDraftId || payload.source_plan_draft_id || payload.planDraftId || payload.plan_draft_id);
  appendQueryParam(params, "sourceTaskCardId", payload.sourceTaskCardId || payload.source_task_card_id || payload.taskCardId || payload.task_card_id);
  appendQueryParam(params, "sourceEvaluationId", payload.sourceEvaluationId || payload.source_evaluation_id || payload.evaluationId || payload.evaluation_id);
  appendQueryParam(params, "profileDeltaId", payload.profileDeltaId || payload.profile_delta_id);
  appendQueryParam(params, "evidenceId", payload.evidenceId || payload.evidence_id);
  appendQueryParam(params, "correctionId", payload.correctionId || payload.correction_id);
  appendQueryParam(params, "sourceId", payload.sourceId || payload.source_id);
  appendQueryParam(params, "digestId", payload.digestId || payload.digest_id);
  appendQueryParam(params, "handoffId", payload.handoffId || payload.handoff_id);
  appendQueryParam(params, "proposalId", payload.proposalId || payload.proposal_id);
  appendQueryParam(params, "selectedItemId", payload.selectedItemId || payload.selected_item_id);
  appendQueryParam(params, "autoSelectCompletedCycle", payload.autoSelectCompletedCycle || payload.auto_select_completed_cycle);
  appendQueryParam(params, "autoSelectLatestCompletedCycle", payload.autoSelectLatestCompletedCycle ?? payload.auto_select_latest_completed_cycle);
  appendQueryParam(params, "auditLimit", payload.auditLimit || payload.audit_limit);
  appendQueryParam(params, "limit", payload.limit || 8);
  return queryString(params);
}

export function automationProposalQuery(targetWorkspaceId = "", payload = {}, { proxyPrefix = "" } = {}) {
  const params = baseGrowthQuery(payload.workspaceId || payload.workspace_id || targetWorkspaceId, { proxyPrefix });
  appendQueryParam(params, "learnerId", payload.learnerId || payload.learner_id);
  appendQueryParam(params, "programId", payload.programId || payload.program_id);
  appendQueryParam(params, "status", payload.status);
  appendQueryParam(params, "planDraftId", payload.planDraftId || payload.plan_draft_id);
  appendQueryParam(params, "limit", payload.limit || 6);
  return queryString(params);
}

export function automationDigestQuery(targetWorkspaceId = "", payload = {}, { proxyPrefix = "" } = {}) {
  const params = scopedAutomationQuery(targetWorkspaceId, payload, { proxyPrefix });
  appendQueryParam(params, "limit", payload.limit || 6);
  return queryString(params);
}

export function automationFailurePolicyQuery(targetWorkspaceId = "", payload = {}, { proxyPrefix = "" } = {}) {
  const params = scopedAutomationQuery(targetWorkspaceId, payload, { proxyPrefix });
  appendQueryParam(params, "limit", payload.limit || 6);
  return queryString(params);
}

export function automationActionHandoffQuery(targetWorkspaceId = "", payload = {}, { proxyPrefix = "" } = {}) {
  const params = scopedAutomationQuery(targetWorkspaceId, payload, { proxyPrefix });
  appendQueryParam(params, "digestId", payload.digestId || payload.digest_id);
  appendQueryParam(params, "deliveryStatus", payload.deliveryStatus || payload.delivery_status);
  appendQueryParam(params, "limit", payload.limit || 6);
  return queryString(params);
}

export function automationSchedulerExecutionQuery(targetWorkspaceId = "", payload = {}, { proxyPrefix = "" } = {}) {
  const params = baseGrowthQuery(payload.workspaceId || payload.workspace_id || targetWorkspaceId, { proxyPrefix });
  appendQueryParam(params, "learnerId", payload.learnerId || payload.learner_id);
  appendQueryParam(params, "programId", payload.programId || payload.program_id);
  appendQueryParam(params, "handoffId", payload.handoffId || payload.handoff_id);
  appendQueryParam(params, "digestId", payload.digestId || payload.digest_id);
  appendQueryParam(params, "proposalId", payload.proposalId || payload.proposal_id);
  appendQueryParam(params, "status", payload.status);
  appendQueryParam(params, "limit", payload.limit || 6);
  return queryString(params);
}

export function automationSchedulerRunQuery(targetWorkspaceId = "", payload = {}, { proxyPrefix = "" } = {}) {
  const params = scopedAutomationQuery(targetWorkspaceId, payload, { proxyPrefix });
  appendQueryParam(params, "limit", payload.limit || 6);
  return queryString(params);
}

export function automationSchedulerWorkerTargetQuery(targetWorkspaceId = "", payload = {}, { proxyPrefix = "" } = {}) {
  const params = scopedAutomationQuery(targetWorkspaceId, payload, { proxyPrefix });
  appendQueryParam(params, "limit", payload.limit || 6);
  return queryString(params);
}

export function releaseEvidenceLedgerQuery(targetWorkspaceId = "", payload = {}, kind = "evidence", { proxyPrefix = "" } = {}) {
  const params = baseGrowthQuery(payload.workspaceId || payload.workspace_id || targetWorkspaceId, { proxyPrefix });
  const ledgerKind = String(kind || "").trim().toLowerCase();
  appendQueryParam(params, "learnerId", payload.learnerId || payload.learner_id);
  appendQueryParam(params, "programId", payload.programId || payload.program_id);
  appendQueryParam(params, "domainPackId", payload.domainPackId || payload.domain_pack_id);
  appendQueryParam(params, "domain", payload.domain);
  appendQueryParam(params, "subject", payload.subject);
  appendQueryParam(params, "horizon", payload.horizon);
  if (ledgerKind === "approval") {
    appendQueryParam(params, "approvalKey", payload.approvalKey || payload.approval_key || payload.configGate || payload.config_gate);
    appendQueryParam(params, "status", payload.approvalStatus || payload.approval_status);
  } else {
    appendQueryParam(params, "evidenceKey", payload.evidenceKey || payload.evidence_key);
    appendQueryParam(params, "checkKey", payload.checkKey || payload.check_key);
    appendQueryParam(params, "status", payload.evidenceStatus || payload.evidence_status);
  }
  appendQueryParam(params, "limit", payload.limit || 8);
  return queryString(params);
}

export function cycleAuditQuery(targetWorkspaceId = "", payload = {}, { proxyPrefix = "" } = {}) {
  const params = baseGrowthQuery(payload.workspaceId || payload.workspace_id || targetWorkspaceId, { proxyPrefix });
  appendQueryParam(params, "learnerId", payload.learnerId || payload.learner_id);
  appendQueryParam(params, "programId", payload.programId || payload.program_id);
  appendQueryParam(params, "planDraftId", payload.planDraftId || payload.plan_draft_id);
  appendQueryParam(params, "taskCardId", payload.taskCardId || payload.task_card_id);
  appendQueryParam(params, "evaluationId", payload.evaluationId || payload.evaluation_id);
  appendQueryParam(params, "profileDeltaId", payload.profileDeltaId || payload.profile_delta_id);
  appendQueryParam(params, "evidenceId", payload.evidenceId || payload.evidence_id);
  appendQueryParam(params, "correctionId", payload.correctionId || payload.correction_id);
  appendQueryParam(params, "sourceId", payload.sourceId || payload.source_id);
  appendQueryArrayParam(params, "targetNodeIds", payload.targetNodeIds || payload.target_node_ids || payload.nodeIds || payload.node_ids);
  appendQueryParam(params, "limit", payload.limit || 20);
  return queryString(params);
}

export function cycleHistoryQuery(targetWorkspaceId = "", payload = {}, { proxyPrefix = "" } = {}) {
  const params = baseGrowthQuery(payload.workspaceId || payload.workspace_id || targetWorkspaceId, { proxyPrefix });
  appendQueryParam(params, "learnerId", payload.learnerId || payload.learner_id);
  appendQueryParam(params, "programId", payload.programId || payload.program_id);
  appendQueryParam(params, "domainPackId", payload.domainPackId || payload.domain_pack_id);
  appendQueryParam(params, "domain", payload.domain);
  appendQueryParam(params, "subject", payload.subject);
  appendQueryParam(params, "planDraftId", payload.planDraftId || payload.plan_draft_id);
  appendQueryParam(params, "taskCardId", payload.taskCardId || payload.task_card_id);
  appendQueryParam(params, "evaluationId", payload.evaluationId || payload.evaluation_id);
  appendQueryParam(params, "profileDeltaId", payload.profileDeltaId || payload.profile_delta_id);
  appendQueryParam(params, "evidenceId", payload.evidenceId || payload.evidence_id);
  appendQueryParam(params, "correctionId", payload.correctionId || payload.correction_id);
  appendQueryParam(params, "sourceId", payload.sourceId || payload.source_id);
  appendQueryArrayParam(params, "targetNodeIds", payload.targetNodeIds || payload.target_node_ids || payload.nodeIds || payload.node_ids);
  appendQueryParam(params, "includeCompleteness", payload.includeCompleteness || payload.include_completeness);
  appendQueryParam(params, "limit", payload.limit || 8);
  return queryString(params);
}

export function profileFeedbackQuery(targetWorkspaceId = "", payload = {}, { proxyPrefix = "" } = {}) {
  const params = baseGrowthQuery(payload.workspaceId || payload.workspace_id || targetWorkspaceId, { proxyPrefix });
  appendQueryParam(params, "learnerId", payload.learnerId || payload.learner_id);
  appendQueryParam(params, "programId", payload.programId || payload.program_id);
  appendQueryParam(params, "domainPackId", payload.domainPackId || payload.domain_pack_id);
  appendQueryParam(params, "domain", payload.domain);
  appendQueryParam(params, "subject", payload.subject);
  appendQueryParam(params, "horizon", payload.horizon);
  appendQueryParam(params, "availableMinutes", payload.availableMinutes || payload.available_minutes);
  appendQueryParam(params, "planDraftId", payload.planDraftId || payload.plan_draft_id);
  appendQueryParam(params, "taskCardId", payload.taskCardId || payload.task_card_id);
  appendQueryParam(params, "evaluationId", payload.evaluationId || payload.evaluation_id);
  appendQueryParam(params, "profileDeltaId", payload.profileDeltaId || payload.profile_delta_id);
  appendQueryParam(params, "evidenceId", payload.evidenceId || payload.evidence_id);
  appendQueryParam(params, "correctionId", payload.correctionId || payload.correction_id);
  appendQueryParam(params, "sourceId", payload.sourceId || payload.source_id);
  appendQueryArrayParam(params, "targetNodeIds", payload.targetNodeIds || payload.target_node_ids || payload.nodeIds || payload.node_ids);
  appendQueryParam(params, "autoSelectCompletedCycle", payload.autoSelectCompletedCycle || payload.auto_select_completed_cycle);
  appendQueryParam(params, "autoSelectLatestCompletedCycle", payload.autoSelectLatestCompletedCycle || payload.auto_select_latest_completed_cycle);
  appendQueryParam(params, "limit", payload.limit || 12);
  return queryString(params);
}

export function ownerAuditReviewQuery(targetWorkspaceId = "", payload = {}, { proxyPrefix = "" } = {}) {
  const params = baseGrowthQuery(payload.workspaceId || payload.workspace_id || targetWorkspaceId, { proxyPrefix });
  appendQueryParam(params, "learnerId", payload.learnerId || payload.learner_id);
  appendQueryParam(params, "programId", payload.programId || payload.program_id);
  appendQueryParam(params, "domainPackId", payload.domainPackId || payload.domain_pack_id);
  appendQueryParam(params, "domain", payload.domain);
  appendQueryParam(params, "subject", payload.subject);
  appendQueryParam(params, "horizon", payload.horizon);
  appendQueryParam(params, "decision", payload.decision || payload.reviewDecision || payload.review_decision);
  appendQueryParam(params, "status", payload.status || payload.reviewStatus || payload.review_status);
  appendQueryParam(params, "reviewId", payload.reviewId || payload.review_id || payload.ownerAuditReviewId || payload.owner_audit_review_id);
  appendQueryParam(params, "planDraftId", payload.planDraftId || payload.plan_draft_id);
  appendQueryParam(params, "taskCardId", payload.taskCardId || payload.task_card_id);
  appendQueryParam(params, "evaluationId", payload.evaluationId || payload.evaluation_id);
  appendQueryParam(params, "profileDeltaId", payload.profileDeltaId || payload.profile_delta_id);
  appendQueryParam(params, "evidenceId", payload.evidenceId || payload.evidence_id);
  appendQueryParam(params, "correctionId", payload.correctionId || payload.correction_id);
  appendQueryParam(params, "sourceId", payload.sourceId || payload.source_id);
  appendQueryArrayParam(params, "targetNodeIds", payload.targetNodeIds || payload.target_node_ids || payload.nodeIds || payload.node_ids);
  appendQueryParam(params, "limit", payload.limit || 5);
  return queryString(params);
}

export function stageAssessmentControlsQuery(targetWorkspaceId = "", payload = {}, { proxyPrefix = "" } = {}) {
  const params = baseGrowthQuery(payload.workspaceId || payload.workspace_id || targetWorkspaceId, { proxyPrefix });
  appendQueryParam(params, "learnerId", payload.learnerId || payload.learner_id);
  appendQueryParam(params, "programId", payload.programId || payload.program_id);
  appendQueryParam(params, "domainPackId", payload.domainPackId || payload.domain_pack_id);
  appendQueryParam(params, "domain", payload.domain);
  appendQueryParam(params, "subject", payload.subject);
  appendQueryParam(params, "subjectId", payload.subjectId || payload.subject_id);
  appendQueryParam(params, "capabilityClusterId", payload.capabilityClusterId || payload.capability_cluster_id);
  appendQueryParam(params, "targetNodeId", payload.targetNodeId || payload.target_node_id);
  appendQueryArrayParam(params, "targetNodeIds", payload.targetNodeIds || payload.target_node_ids);
  appendQueryArrayParam(params, "assessmentCoverageNodeIds", payload.assessmentCoverageNodeIds || payload.assessment_coverage_node_ids);
  return queryString(params);
}

export function referenceQuery(targetWorkspaceId = "", payload = {}, { proxyPrefix = "" } = {}) {
  const params = baseGrowthQuery(payload.workspaceId || payload.workspace_id || targetWorkspaceId, { proxyPrefix });
  appendQueryParam(params, "purpose", payload.purpose);
  return queryString(params);
}

function encodeRequiredId(value, errorCode) {
  const id = clean(value);
  if (!id) throw new Error(errorCode);
  return encodeURIComponent(id);
}

function withWorkspace(payload = {}, targetWorkspaceId = "") {
  return {
    workspace_id: targetWorkspaceId,
    ...payload
  };
}

export function createGrowthApiClient({
  fetchImpl,
  getWorkspaceId = () => "",
  getLaunchToken = () => "",
  historyRef,
  locationRef
} = {}) {
  function proxyPrefix() {
    return proxyPrefixFromLocation(locationRef?.href || "");
  }

  function currentWorkspaceId() {
    return clean(getWorkspaceId());
  }

  function workspaceQuery(targetWorkspaceId = currentWorkspaceId()) {
    return targetWorkspaceId ? `?workspaceId=${encodeURIComponent(targetWorkspaceId)}` : "";
  }

  function updateWorkspaceUrl() {
    const workspaceId = currentWorkspaceId();
    if (!workspaceId || typeof historyRef?.replaceState !== "function" || !locationRef?.href) return;
    const url = new URL(locationRef.href);
    url.searchParams.set("workspaceId", workspaceId);
    historyRef.replaceState(null, "", url.toString());
  }

  async function fetchJson(path, options = {}) {
    return fetchJsonWithGrowthErrors(
      fetchImpl,
      resolveApiPath(path, { proxyPrefix: proxyPrefix() }),
      requestOptionsWithLaunchToken(options, getLaunchToken())
    );
  }

  async function fetchReadableJson(path, options = {}) {
    return fetchReadableJsonWithGrowthErrors(
      fetchImpl,
      resolveApiPath(path, { proxyPrefix: proxyPrefix() }),
      requestOptionsWithLaunchToken(options, getLaunchToken())
    );
  }

  async function postJson(path, body = {}) {
    return fetchJson(path, jsonPostOptions(body));
  }

  function fetchCardGenerationContext(targetWorkspaceId = currentWorkspaceId(), selection = {}) {
    return fetchJson(`${growthApiPath("card-generation", "context")}${cardGenerationContextQuery(targetWorkspaceId, selection, { proxyPrefix: proxyPrefix() })}`);
  }

  function fetchLearningLoopState(targetWorkspaceId = currentWorkspaceId(), context = {}) {
    return fetchJson(`${growthApiPath("learning-loop", "state")}${learningLoopStateQuery(targetWorkspaceId, context, { proxyPrefix: proxyPrefix() })}`);
  }

  function fetchLearningOperatingLoopRuns(payload = {}, targetWorkspaceId = currentWorkspaceId()) {
    return fetchJson(`${growthApiPath("learning-loop", "runs")}${learningOperatingLoopRunsQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() })}`);
  }

  function advanceLearningOperatingLoop(payload = {}, targetWorkspaceId = currentWorkspaceId()) {
    return postJson(growthApiPath("learning-loop", "advance"), withWorkspace(payload, targetWorkspaceId));
  }

  function fetchGrowthReleaseWorkbench(targetWorkspaceId = currentWorkspaceId(), context = {}) {
    return fetchJson(`${growthApiPath("automation", "release-workbench")}${releaseWorkbenchQuery(targetWorkspaceId, context, { proxyPrefix: proxyPrefix() })}`);
  }

  function fetchGrowthReleaseArtifactTemplate(targetWorkspaceId = currentWorkspaceId(), context = {}) {
    return fetchJson(`${growthApiPath("automation", "release-artifact-template")}${releaseWorkbenchQuery(targetWorkspaceId, context, { proxyPrefix: proxyPrefix() })}`);
  }

  function fetchGrowthReleaseWorkbenchActionAudits(payload = {}, targetWorkspaceId = currentWorkspaceId()) {
    return fetchJson(`${growthApiPath("automation", "release-workbench", "action-audits")}${releaseWorkbenchActionAuditQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() })}`);
  }

  async function fetchGrowthReleaseStatusReadbacks(payload = {}, targetWorkspaceId = currentWorkspaceId()) {
    const query = releaseStatusReadbackQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() });
    const [controls, dashboard, inventory, review, authorization, closure, preflight, activation, runtimeEnablement] = await Promise.all([
      fetchJson(`${growthApiPath("automation", "release-controls")}${query}`),
      fetchJson(`${growthApiPath("automation", "release-dashboard")}${query}`),
      fetchJson(`${growthApiPath("automation", "release-inventory")}${query}`),
      fetchJson(`${growthApiPath("automation", "release-review")}${query}`),
      fetchJson(`${growthApiPath("automation", "release-authorization")}${query}`),
      fetchJson(`${growthApiPath("automation", "release-closure")}${query}`),
      fetchJson(`${growthApiPath("automation", "release-preflight")}${query}`),
      fetchJson(`${growthApiPath("automation", "release-activation")}${query}`),
      fetchJson(`${growthApiPath("automation", "runtime-enablement")}${query}`)
    ]);
    return {
      ok: true,
      schemaVersion: "growth.releaseStatusReadbacks.ui.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      controls,
      dashboard,
      inventory,
      review,
      authorization,
      closure,
      preflight,
      activation,
      runtimeEnablement
    };
  }

  async function fetchGrowthReleaseLifecycleRecords(payload = {}, targetWorkspaceId = currentWorkspaceId()) {
    const query = releaseLifecycleRecordQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() });
    const [preflightReports, activations, runtimeEnablements] = await Promise.all([
      fetchJson(`${growthApiPath("automation", "release-preflight-reports")}${query}`),
      fetchJson(`${growthApiPath("automation", "release-activations")}${query}`),
      fetchJson(`${growthApiPath("automation", "runtime-enablements")}${query}`)
    ]);
    return {
      ok: true,
      schemaVersion: "growth.releaseLifecycleRecords.ui.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      preflightReports,
      activations,
      runtimeEnablements
    };
  }

  async function fetchGrowthReleaseEvidenceLedger(payload = {}, targetWorkspaceId = currentWorkspaceId()) {
    const evidenceQuery = releaseEvidenceLedgerQuery(targetWorkspaceId, payload, "evidence", { proxyPrefix: proxyPrefix() });
    const approvalQuery = releaseEvidenceLedgerQuery(targetWorkspaceId, payload, "approval", { proxyPrefix: proxyPrefix() });
    const [releaseEvidence, releaseApprovals] = await Promise.all([
      fetchJson(`${growthApiPath("automation", "release-evidence")}${evidenceQuery}`),
      fetchJson(`${growthApiPath("automation", "release-approvals")}${approvalQuery}`)
    ]);
    const evidenceRows = Array.isArray(releaseEvidence.evidence) ? releaseEvidence.evidence : [];
    const approvalRows = Array.isArray(releaseApprovals.approvals) ? releaseApprovals.approvals : [];
    return {
      ok: true,
      schemaVersion: "growth.releaseEvidenceLedger.ui.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      evidenceCount: Number(releaseEvidence.count ?? evidenceRows.length ?? 0) || 0,
      approvalCount: Number(releaseApprovals.count ?? approvalRows.length ?? 0) || 0,
      releaseEvidence,
      releaseApprovals,
      evidence: releaseEvidence,
      approvals: releaseApprovals
    };
  }

  const fetchFromQuery = (segments, queryBuilder) => (payload = {}, targetWorkspaceId = currentWorkspaceId()) => (
    fetchJson(`${growthApiPath(...segments)}${queryBuilder(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() })}`)
  );

  const postWithWorkspace = (segments) => (payload = {}, targetWorkspaceId = currentWorkspaceId()) => (
    postJson(growthApiPath(...segments), withWorkspace(payload, targetWorkspaceId))
  );

  function fetchGrowthCard(taskCardId, targetWorkspaceId = currentWorkspaceId()) {
    return fetchJson(`${growthApiPath("cards", encodeRequiredId(taskCardId, "missing_task_card_id"))}${workspaceQuery(targetWorkspaceId)}`);
  }

  function fetchGrowthReferenceSummary(objectType, objectId, targetWorkspaceId = currentWorkspaceId(), payload = {}) {
    return fetchJson(`${growthApiPath(
      "references",
      encodeRequiredId(objectType, "missing_reference_object_type"),
      encodeRequiredId(objectId, "missing_reference_object_id"),
      "summary"
    )}${referenceQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() })}`);
  }

  function submitGrowthCardEvidence(taskCardId, payload = {}, targetWorkspaceId = currentWorkspaceId()) {
    return postJson(growthApiPath("cards", encodeRequiredId(taskCardId, "missing_task_card_id"), "submissions"), withWorkspace(payload, targetWorkspaceId));
  }

  function submitGrowthCardReflection(taskCardId, payload = {}, targetWorkspaceId = currentWorkspaceId()) {
    return postJson(growthApiPath("cards", encodeRequiredId(taskCardId, "missing_task_card_id"), "reflections"), withWorkspace(payload, targetWorkspaceId));
  }

  function submitGrowthExperienceSignal(taskCardId, payload = {}, targetWorkspaceId = currentWorkspaceId()) {
    return postJson(growthApiPath("cards", encodeRequiredId(taskCardId, "missing_task_card_id"), "experience-signals"), withWorkspace(payload, targetWorkspaceId));
  }

  function processGrowthEvaluations(targetWorkspaceId = currentWorkspaceId(), limit = 5) {
    return postJson(growthApiPath("evaluations", "process"), {
      workspace_id: targetWorkspaceId,
      limit
    });
  }

  function reviewGrowthAutomationProposal(proposalId, payload = {}, targetWorkspaceId = currentWorkspaceId()) {
    return postJson(growthApiPath("automation", "proposals", encodeRequiredId(proposalId, "missing_proposal_id"), "decision"), withWorkspace(payload, targetWorkspaceId));
  }

  function reviewGrowthAutomationDigest(digestId, payload = {}, targetWorkspaceId = currentWorkspaceId()) {
    return postJson(growthApiPath("automation", "digests", encodeRequiredId(digestId, "missing_digest_id"), "review"), withWorkspace(payload, targetWorkspaceId));
  }

  function reviewGrowthAutomationFailurePolicy(policyId, payload = {}, targetWorkspaceId = currentWorkspaceId()) {
    return postJson(growthApiPath("automation", "failure-policies", encodeRequiredId(policyId, "missing_failure_policy_id"), "review"), withWorkspace(payload, targetWorkspaceId));
  }

  function deliverGrowthAutomationActionHandoff(handoffId, payload = {}, targetWorkspaceId = currentWorkspaceId()) {
    return postJson(growthApiPath("automation", "action-handoffs", encodeRequiredId(handoffId, "missing_action_handoff_id"), "deliver"), withWorkspace(payload, targetWorkspaceId));
  }

  function reviewGrowthAutomationSchedulerWorkerTarget(targetId, payload = {}, targetWorkspaceId = currentWorkspaceId()) {
    return postJson(growthApiPath("automation", "scheduler", "worker-targets", encodeRequiredId(targetId, "missing_scheduler_worker_target_id"), "review"), withWorkspace(payload, targetWorkspaceId));
  }

  function publishGrowthAutomationProposal(proposalId, payload = {}, targetWorkspaceId = currentWorkspaceId()) {
    return postJson(growthApiPath("automation", "proposals", encodeRequiredId(proposalId, "missing_proposal_id"), "publish"), withWorkspace(payload, targetWorkspaceId));
  }

  return {
    advanceGrowthAutomationReview: postWithWorkspace(["automation", "review-advancements", "advance"]),
    advanceGrowthDailyLoop: postWithWorkspace(["daily-loop", "advance"]),
    advanceLearningOperatingLoop,
    appendWorkspaceQuery,
    activateGrowthStageAssessment: postWithWorkspace(["stage-assessments", "activate"]),
    cardGenerationContextQuery: (targetWorkspaceId = getWorkspaceId(), selection = {}) => cardGenerationContextQuery(targetWorkspaceId, selection, { proxyPrefix: proxyPrefix() }),
    automationActionHandoffQuery: (targetWorkspaceId = getWorkspaceId(), payload = {}) => automationActionHandoffQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() }),
    automationClosedLoopActionPlanQuery: (targetWorkspaceId = getWorkspaceId(), payload = {}) => automationClosedLoopActionPlanQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() }),
    automationDigestQuery: (targetWorkspaceId = getWorkspaceId(), payload = {}) => automationDigestQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() }),
    automationFailurePolicyQuery: (targetWorkspaceId = getWorkspaceId(), payload = {}) => automationFailurePolicyQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() }),
    automationProposalQuery: (targetWorkspaceId = getWorkspaceId(), payload = {}) => automationProposalQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() }),
    automationSchedulerExecutionQuery: (targetWorkspaceId = getWorkspaceId(), payload = {}) => automationSchedulerExecutionQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() }),
    automationSchedulerRunQuery: (targetWorkspaceId = getWorkspaceId(), payload = {}) => automationSchedulerRunQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() }),
    automationSchedulerWorkerTargetQuery: (targetWorkspaceId = getWorkspaceId(), payload = {}) => automationSchedulerWorkerTargetQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() }),
    buildGrowthReleasePackage: postWithWorkspace(["automation", "release-packages", "build"]),
    createGrowthAutomationActionHandoff: postWithWorkspace(["automation", "action-handoffs"]),
    createGrowthAutomationDigest: postWithWorkspace(["automation", "digests"]),
    createGrowthAutomationFailurePolicy: postWithWorkspace(["automation", "failure-policies"]),
    createGrowthAutomationProposal: postWithWorkspace(["automation", "proposals"]),
    createGrowthAutomationSchedulerWorkerTarget: postWithWorkspace(["automation", "scheduler", "worker-targets"]),
    cycleAuditQuery: (targetWorkspaceId = getWorkspaceId(), payload = {}) => cycleAuditQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() }),
    cycleHistoryQuery: (targetWorkspaceId = getWorkspaceId(), payload = {}) => cycleHistoryQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() }),
    deliverGrowthAutomationActionHandoff,
    draftGrowthDailyLoop: postWithWorkspace(["daily-loop", "draft"]),
    evaluateGrowthStageAssessment: postWithWorkspace(["stage-assessments", "eligibility"]),
    executeGrowthAutomationSchedulerOnce: postWithWorkspace(["automation", "scheduler", "execute-once"]),
    fetchCardGenerationContext,
    fetchGrowthAutomationActionHandoffs: fetchFromQuery(["automation", "action-handoffs"], automationActionHandoffQuery),
    fetchGrowthAutomationClosedLoopActionPlan: fetchFromQuery(["automation", "closed-loop", "action-plan"], automationClosedLoopActionPlanQuery),
    fetchGrowthAutomationDigests: fetchFromQuery(["automation", "digests"], automationDigestQuery),
    fetchGrowthAutomationFailurePolicies: fetchFromQuery(["automation", "failure-policies"], automationFailurePolicyQuery),
    fetchGrowthAutomationFailurePolicyReadiness: fetchFromQuery(["automation", "failure-policies", "readiness"], automationFailurePolicyQuery),
    fetchGrowthAutomationProposals: fetchFromQuery(["automation", "proposals"], automationProposalQuery),
    fetchGrowthAutomationSchedulerExecutions: fetchFromQuery(["automation", "scheduler", "executions"], automationSchedulerExecutionQuery),
    fetchGrowthAutomationSchedulerRuns: fetchFromQuery(["automation", "scheduler", "runs"], automationSchedulerRunQuery),
    fetchGrowthAutomationSchedulerWorkerTargets: fetchFromQuery(["automation", "scheduler", "worker-targets"], automationSchedulerWorkerTargetQuery),
    fetchGrowthCard,
    fetchGrowthCycleAudit: fetchFromQuery(["learning-cycles", "audit"], cycleAuditQuery),
    fetchGrowthCycleCompleteness: fetchFromQuery(["learning-cycles", "completeness"], cycleAuditQuery),
    fetchGrowthCycleHistory: fetchFromQuery(["learning-cycles", "history"], cycleHistoryQuery),
    fetchGrowthOwnerAuditReviews: fetchFromQuery(["owner-audit", "reviews"], ownerAuditReviewQuery),
    fetchGrowthProfileFeedback: (payload = {}, targetWorkspaceId = currentWorkspaceId()) => (
      fetchReadableJson(`${growthApiPath("profile-feedback")}${profileFeedbackQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() })}`)
    ),
    fetchGrowthReferenceObjectTypes: (targetWorkspaceId = currentWorkspaceId()) => (
      fetchJson(`${growthApiPath("references", "object-types")}${referenceQuery(targetWorkspaceId, {}, { proxyPrefix: proxyPrefix() })}`)
    ),
    fetchGrowthReferenceSummary,
    fetchGrowthReleaseArtifactTemplate,
    fetchGrowthReleaseEvidenceLedger,
    fetchGrowthReleaseLifecycleRecords,
    fetchGrowthReleaseStatusReadbacks,
    fetchGrowthReleaseWorkbench,
    fetchGrowthReleaseWorkbenchActionAudits,
    fetchGrowthStageCheckpointControls: fetchFromQuery(["stage-assessments", "controls"], stageAssessmentControlsQuery),
    fetchJson,
    fetchReadableJson,
    generateGrowthCard: postWithWorkspace(["cards", "generate"]),
    growthApiPath,
    learningOperatingLoopRunsQuery: (targetWorkspaceId = getWorkspaceId(), payload = {}) => learningOperatingLoopRunsQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() }),
    learningLoopStateQuery: (targetWorkspaceId = getWorkspaceId(), context = {}) => learningLoopStateQuery(targetWorkspaceId, context, { proxyPrefix: proxyPrefix() }),
    ownerAuditReviewQuery: (targetWorkspaceId = getWorkspaceId(), payload = {}) => ownerAuditReviewQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() }),
    postJson,
    prepareGrowthAutomationCycleClosure: postWithWorkspace(["automation", "cycle-closures", "prepare"]),
    processGrowthEvaluations,
    profileFeedbackQuery: (targetWorkspaceId = getWorkspaceId(), payload = {}) => profileFeedbackQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() }),
    provisionGrowthDomainPack: postWithWorkspace(["domain-pack-provisions"]),
    publishGrowthAutomationProposal,
    publishGrowthDailyLoop: postWithWorkspace(["daily-loop", "publish"]),
    recordGrowthOwnerAuditReview: postWithWorkspace(["owner-audit", "reviews"]),
    recordGrowthReleaseActivation: postWithWorkspace(["automation", "release-activations"]),
    recordGrowthReleasePreflightReport: postWithWorkspace(["automation", "release-preflight-reports"]),
    recordGrowthReleaseWorkbenchAction: postWithWorkspace(["automation", "release-workbench", "actions"]),
    recordGrowthRuntimeEnablement: postWithWorkspace(["automation", "runtime-enablements"]),
    referenceQuery: (targetWorkspaceId = getWorkspaceId(), payload = {}) => referenceQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() }),
    releaseEvidenceLedgerQuery: (targetWorkspaceId = getWorkspaceId(), payload = {}, kind = "evidence") => releaseEvidenceLedgerQuery(targetWorkspaceId, payload, kind, { proxyPrefix: proxyPrefix() }),
    releaseLifecycleRecordQuery: (targetWorkspaceId = getWorkspaceId(), payload = {}) => releaseLifecycleRecordQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() }),
    releaseStatusReadbackQuery: (targetWorkspaceId = getWorkspaceId(), payload = {}) => releaseStatusReadbackQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() }),
    releaseWorkbenchActionAuditQuery: (targetWorkspaceId = getWorkspaceId(), payload = {}) => releaseWorkbenchActionAuditQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() }),
    releaseWorkbenchQuery: (targetWorkspaceId = getWorkspaceId(), context = {}) => releaseWorkbenchQuery(targetWorkspaceId, context, { proxyPrefix: proxyPrefix() }),
    retryGrowthEvaluation: (payload = {}, targetWorkspaceId = currentWorkspaceId()) => (
      postJson(growthApiPath("evaluations", "owner-review"), withWorkspace({ action: "retry", ...payload }, targetWorkspaceId))
    ),
    reviewGrowthAutomationDigest,
    reviewGrowthAutomationFailurePolicy,
    reviewGrowthAutomationProposal,
    reviewGrowthAutomationSchedulerWorkerTarget,
    reviewGrowthRecommendationLifecycle: postWithWorkspace(["recommendations", "lifecycle", "review"]),
    resolveApiPath: (path) => resolveApiPath(path, { proxyPrefix: proxyPrefix() }),
    resolveGrowthApiPath: (path, targetWorkspaceId = getWorkspaceId()) => resolveGrowthApiPath(path, { targetWorkspaceId, proxyPrefix: proxyPrefix() }),
    runGrowthAutomationSchedulerOnce: postWithWorkspace(["automation", "scheduler", "run-once"]),
    stageAssessmentControlsQuery: (targetWorkspaceId = getWorkspaceId(), payload = {}) => stageAssessmentControlsQuery(targetWorkspaceId, payload, { proxyPrefix: proxyPrefix() }),
    submitGrowthCardEvidence,
    submitGrowthCardReflection,
    submitGrowthExperienceSignal,
    submitGrowthProfileCorrection: postWithWorkspace(["profile-corrections"]),
    updateWorkspaceUrl,
    workspaceQuery
  };
}

export { requestOptionsWithLaunchToken } from "./request.js";
