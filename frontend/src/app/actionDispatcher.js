import { clean } from "../utils/string.js";
import { legacyHandlerArgsForCardGenerationAction } from "./actionAdapters.js";

const ACTION_ROUTES = {
  load_card_generation_context: { handler: "loadCardGenerationContext", failureTarget: "cardGeneration" },
  refresh_card_generation_context: { handler: "refreshCardGenerationContext", failureTarget: "cardGeneration" },
  select_card_generation_recipe: { handler: "selectCardGenerationRecipe", failureTarget: "targetProvisionDraft" },
  select_domain_pack: { handler: "selectCardGenerationDomainPack", failureTarget: "targetProvisionDraft" },
  select_subject: { handler: "selectCardGenerationSubject", failureTarget: "targetProvisionDraft" },
  apply_target_selection: { handler: "applyTargetSelection", failureTarget: "targetProvisionDraft" },
  provision_target: { handler: "provisionTargetDomainPack", failureTarget: "targetProvisionDraft" },
  advance_operating_loop: { handler: "advanceOperatingLoopFromUi", failureTarget: "operatingLoop" },
  draft_daily_loop: { handler: "draftDailyLoopFromUi", failureTarget: "cardGeneration" },
  publish_daily_loop: { handler: "publishDailyLoopFromUi", failureTarget: "cardGeneration" },
  update_owner_correction_note: { handler: "updateOwnerCorrectionNote", failureTarget: "ownerCorrection" },
  update_owner_correction_action: { handler: "updateOwnerCorrectionAction", failureTarget: "ownerCorrection" },
  submit_owner_correction: { handler: "submitOwnerCorrectionFromUi", failureTarget: "ownerCorrection" },
  update_owner_audit_review_note: { handler: "updateOwnerAuditReviewNote", failureTarget: "ownerAuditReviews" },
  refresh_owner_audit_reviews: { handler: "refreshOwnerAuditReviews", failureTarget: "ownerAuditReviews" },
  record_owner_audit_review: { handler: "recordOwnerAuditReviewFromUi", failureTarget: "ownerAuditReviews" },
  refresh_cycle_drilldown: { handler: "refreshOwnerCycleDrilldownFromUi", failureTarget: "cycleDrilldown" },
  refresh_cycle_history: { handler: "refreshCycleHistoryFromUi", failureTarget: "cycleHistory" },
  select_cycle_history: { handler: "selectCycleHistoryItem", failureTarget: "cycleHistory" },
  refresh_profile_feedback: { handler: "refreshProfileFeedback", failureTarget: "profileFeedback" },
  refresh_reference_chain: { handler: "refreshReferenceChain", failureTarget: "referenceChain" },
  refresh_operating_loop_runs: { handler: "refreshOperatingLoopRuns", failureTarget: "operatingLoop" },
  record_release_workbench_action: { handler: "recordReleaseWorkbenchActionFromUi", failureTarget: "releaseWorkbench" },
  build_release_package: { handler: "buildReleasePackageFromUi", failureTarget: "releaseWorkbench" },
  refresh_release_artifact_template: { handler: "refreshReleaseArtifactTemplate", failureTarget: "releaseArtifactTemplate" },
  refresh_release_workbench_action_audits: { handler: "refreshReleaseWorkbenchActionAudits", failureTarget: "releaseWorkbenchActionAudits" },
  refresh_release_status_readbacks: { handler: "refreshReleaseStatusReadbacks", failureTarget: "releaseStatusReadbacks" },
  refresh_release_evidence_ledger: { handler: "refreshReleaseEvidenceLedger", failureTarget: "releaseEvidenceLedger" },
  refresh_release_lifecycle_records: { handler: "refreshReleaseLifecycleRecords", failureTarget: "releaseLifecycleRecords" },
  record_release_lifecycle_record: { handler: "recordReleaseLifecycleRecordFromUi", failureTarget: "releaseLifecycleRecords" },
  refresh_automation_closed_loop_action_plan: { handler: "refreshAutomationClosedLoopActionPlan", failureTarget: "automationClosedLoopActionPlan" },
  run_automation_closed_loop_action_plan: { handler: "runAutomationClosedLoopActionPlanFromUi", failureTarget: "automationClosedLoopActionPlan" },
  prepare_automation_cycle_closure: { handler: "prepareAutomationCycleClosureFromUi", failureTarget: "automationCycleClosure" },
  advance_automation_review: { handler: "advanceAutomationReviewFromUi", failureTarget: "automationReviewAdvancement" },
  refresh_automation_proposals: { handler: "refreshAutomationProposals", failureTarget: "automationProposals" },
  create_automation_proposal: { handler: "createAutomationProposalFromUi", failureTarget: "automationProposals" },
  review_automation_proposal: { handler: "reviewAutomationProposalFromUi", failureTarget: "automationProposals" },
  publish_automation_proposal: { handler: "publishAutomationProposalFromUi", failureTarget: "automationProposals" },
  refresh_automation_digests: { handler: "refreshAutomationDigests", failureTarget: "automationDigests" },
  create_automation_digest: { handler: "createAutomationDigestFromUi", failureTarget: "automationDigests" },
  review_automation_digest: { handler: "reviewAutomationDigestFromUi", failureTarget: "automationDigests" },
  refresh_automation_failure_policies: { handler: "refreshAutomationFailurePolicies", failureTarget: "automationFailurePolicies" },
  create_automation_failure_policy: { handler: "createAutomationFailurePolicyFromUi", failureTarget: "automationFailurePolicies" },
  review_automation_failure_policy: { handler: "reviewAutomationFailurePolicyFromUi", failureTarget: "automationFailurePolicies" },
  refresh_automation_action_handoffs: { handler: "refreshAutomationActionHandoffs", failureTarget: "automationActionHandoffs" },
  create_automation_action_handoff: { handler: "createAutomationActionHandoffFromUi", failureTarget: "automationActionHandoffs" },
  deliver_automation_action_handoff: { handler: "deliverAutomationActionHandoffFromUi", failureTarget: "automationActionHandoffs" },
  refresh_automation_scheduler_executions: { handler: "refreshAutomationSchedulerExecutions", failureTarget: "automationSchedulerExecutions" },
  execute_automation_scheduler_once: { handler: "executeAutomationSchedulerOnceFromUi", failureTarget: "automationSchedulerExecutions" },
  refresh_automation_scheduler_runs: { handler: "refreshAutomationSchedulerRuns", failureTarget: "automationSchedulerRuns" },
  run_automation_scheduler_once: { handler: "runAutomationSchedulerOnceFromUi", failureTarget: "automationSchedulerRuns" },
  refresh_automation_scheduler_worker_targets: { handler: "refreshAutomationSchedulerWorkerTargets", failureTarget: "automationSchedulerWorkerTargets" },
  create_automation_scheduler_worker_target: { handler: "createAutomationSchedulerWorkerTargetFromUi", failureTarget: "automationSchedulerWorkerTargets" },
  review_automation_scheduler_worker_target: { handler: "reviewAutomationSchedulerWorkerTargetFromUi", failureTarget: "automationSchedulerWorkerTargets" },
  review_recommendation_lifecycle: { handler: "reviewRecommendationLifecycleFromUi", failureTarget: "recommendationLifecycle" },
  refresh_stage_checkpoint_controls: { handler: "refreshStageCheckpointControlsFromUi", failureTarget: "stageAssessment" },
  activate_stage_assessment: { handler: "activateStageAssessmentFromUi", failureTarget: "stageAssessment" }
};

export function cardGenerationActionRoute(actionName = "") {
  const key = clean(actionName);
  return ACTION_ROUTES[key] || null;
}

export function cardGenerationActionHandlerName(actionName = "") {
  return cardGenerationActionRoute(actionName)?.handler || "";
}

export function cardGenerationActionFailureTarget(actionName = "") {
  return cardGenerationActionRoute(actionName)?.failureTarget || "cardGeneration";
}

export function cardGenerationActionRoutes() {
  return Object.assign({}, ACTION_ROUTES);
}

export async function dispatchCardGenerationAction(action = {}, handlers = {}, options = {}) {
  const actionName = clean(action.action);
  const route = cardGenerationActionRoute(actionName);
  if (!route) {
    const result = { status: "unhandled", action, reason: "unknown_action", failureTarget: "cardGeneration" };
    if (typeof options.onUnhandled === "function") options.onUnhandled(result);
    return result;
  }
  const routed = Object.assign({ route }, action);
  if (action.ignored) {
    const result = { status: "ignored", action: routed, reason: clean(action.reason) || "ignored", failureTarget: route.failureTarget };
    if (typeof options.onIgnored === "function") options.onIgnored(result);
    return result;
  }
  if (action.blocked) {
    const result = { status: "blocked", action: routed, reason: clean(action.blockedReason), failureTarget: route.failureTarget };
    if (typeof options.onBlocked === "function") options.onBlocked(result);
    return result;
  }
  const handler = handlers[route.handler];
  if (typeof handler !== "function") {
    const result = { status: "unhandled", action: routed, reason: "missing_handler", handler: route.handler, failureTarget: route.failureTarget };
    if (typeof options.onUnhandled === "function") options.onUnhandled(result);
    return result;
  }
  try {
    const handlerArgsForAction = typeof options.handlerArgsForAction === "function"
      ? options.handlerArgsForAction
      : legacyHandlerArgsForCardGenerationAction;
    const handlerArgs = handlerArgsForAction(routed);
    const value = await handler(...handlerArgs);
    return { status: "handled", action: routed, handler: route.handler, failureTarget: route.failureTarget, value };
  } catch (error) {
    const result = {
      status: "failed",
      action: routed,
      handler: route.handler,
      failureTarget: route.failureTarget,
      error: error?.message || String(error)
    };
    if (typeof options.onError === "function") options.onError(result, error);
    if (options.rethrow === true) throw error;
    return result;
  }
}
