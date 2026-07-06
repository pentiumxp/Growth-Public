import { clean } from "../../utils/string.js";
import { selectedPlanItem } from "./ActionPanel.js";
import { cycleSelectionPayload } from "./ProfilePanel.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstCleanValue(...values) {
  for (const value of values) {
    const cleaned = clean(value);
    if (cleaned) return cleaned;
  }
  return "";
}

function firstCleanArray(...values) {
  for (const value of values) {
    const cleaned = asArray(value).map(clean).filter(Boolean);
    if (cleaned.length) return Array.from(new Set(cleaned)).slice(0, 12);
  }
  return [];
}

function compactPayload(payload = {}) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return true;
    if (typeof value === "boolean") return true;
    return clean(value);
  }));
}

function graphOptionsForContext(context = {}) {
  const provisioning = context.targetProvisioning || {};
  return provisioning.graphOptions || context.graphOptions || {};
}

function selectedProvisionDraft(context = {}, draft = {}) {
  const provisioning = context.targetProvisioning || {};
  const graphOptions = graphOptionsForContext(context);
  const selectedPack = clean(draft.domainPackId || draft.domain_pack_id || provisioning.selectedDomainPackId || graphOptions.selectedDomainPackId || context.domainPackId);
  const packs = asArray(graphOptions.domainPacks);
  const pack = packs.find((item) => clean(item.domainPackId || item.domain_pack_id) === selectedPack) || packs[0] || {};
  const subjects = asArray(pack.subjects).length ? asArray(pack.subjects) : asArray(graphOptions.subjects);
  return {
    domainPackId: selectedPack || clean(pack.domainPackId || pack.domain_pack_id),
    domain: clean(draft.domain || provisioning.selectedDomain || graphOptions.selectedDomain || pack.domain || context.domain),
    subject: clean(draft.subject || provisioning.selectedSubject || graphOptions.selectedSubject || subjects[0] || context.subject)
  };
}

export function dailyLoopScopeFromContext(context = {}, workspaceId = "", selection = {}) {
  const plan = context.suggestedPlan || {};
  const recommendation = context.nextCardRecommendation || {};
  const defaults = context.generationDefaults || {};
  const provisioning = context.targetProvisioning || {};
  const graphOptions = graphOptionsForContext(context);
  const draft = selectedProvisionDraft(context, selection);
  const targetNodeIds = asArray(recommendation.targetNodeIds).length
    ? asArray(recommendation.targetNodeIds)
    : asArray(plan.targetNodeIds).length
      ? asArray(plan.targetNodeIds)
      : [recommendation.targetNodeId || plan.targetNodeId].filter(Boolean);
  return {
    workspace_id: clean(workspaceId || context.target?.workspaceId),
    learner_id: clean(context.target?.learnerId || workspaceId),
    program_id: clean(context.programId || plan.programId || defaults.programId),
    recipe_id: clean(selection.recipeId || selection.recipe_id || context.selectedRecipeId || "daily_english_v1"),
    domain_pack_id: clean(draft.domainPackId || provisioning.selectedDomainPackId || graphOptions.selectedDomainPackId || context.domainPackId || plan.domainPackId || defaults.domainPackId),
    domain: clean(draft.domain || provisioning.selectedDomain || graphOptions.selectedDomain || recommendation.domain || plan.domain || context.domain || defaults.domain || "english"),
    subject: clean(draft.subject || provisioning.selectedSubject || graphOptions.selectedSubject || recommendation.subject || plan.subject || context.subject || defaults.subject || plan.domain || context.domain || "english"),
    horizon: clean(context.horizon || defaults.horizon || "daily_plan"),
    available_minutes: Number(defaults.availableMinutes || context.availableMinutes || 15) || 15,
    target_node_ids: targetNodeIds.map(clean).filter(Boolean).slice(0, 12),
    card_schema_version: clean(defaults.cardSchemaVersion || "growth.card.authoring.v1")
  };
}

export function createOperatingLoopAdvancePayload({ context = {}, workspaceId = "", state = {} } = {}) {
  const scope = dailyLoopScopeFromContext(context, workspaceId, state.targetProvisionDraft || {});
  const loopData = state.learningLoopState?.data || context.learningLoopState || {};
  const nextAction = loopData.nextAction || {};
  const action = clean(nextAction.action);
  const plan = context.suggestedPlan || {};
  const draftResult = state.dailyLoopDraftResult || {};
  const planDraft = draftResult.planDraft || {};
  const item = selectedPlanItem(planDraft);
  const coverage = firstCleanArray(
    plan.assessmentCoverageNodeIds,
    plan.assessmentCoverage,
    plan.targetNodeIds,
    scope.target_node_ids,
    [plan.targetNodeId]
  );
  const payload = {
    ...scope,
    action: "run_next",
    requested_by: "owner",
    plan_draft_id: clean(nextAction.planDraftId || planDraft.planDraftId),
    selected_item_id: clean(nextAction.itemId || planDraft.selectedItemId || item.itemId),
    task_card_id: clean(nextAction.taskCardId),
    target_node_ids: firstCleanArray(scope.target_node_ids, plan.targetNodeIds, [plan.targetNodeId]),
    assessment_coverage_node_ids: coverage
  };
  if (action === "review_stage_assessment") {
    payload.confirm_stage_assessment = true;
    payload.allow_stage_activation = true;
    payload.activation_reason = "owner_confirmed_checkpoint";
  }
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "boolean") return value === true;
    return clean(value);
  }));
}

export function automationProposalScopeFromContext(context = {}, workspaceId = "") {
  const plan = context.suggestedPlan || {};
  const defaults = context.generationDefaults || {};
  const provisioning = context.targetProvisioning || {};
  const graphOptions = graphOptionsForContext(context);
  return {
    workspace_id: clean(workspaceId || context.target?.workspaceId),
    learner_id: clean(context.target?.learnerId || workspaceId),
    program_id: clean(context.programId || plan.programId || defaults.programId),
    domain_pack_id: clean(provisioning.selectedDomainPackId || graphOptions.selectedDomainPackId || context.domainPackId || plan.domainPackId || defaults.domainPackId),
    domain: clean(provisioning.selectedDomain || graphOptions.selectedDomain || plan.domain || context.domain || defaults.domain),
    subject: clean(provisioning.selectedSubject || graphOptions.selectedSubject || plan.subject || context.subject || defaults.subject || plan.domain || context.domain),
    horizon: clean(context.horizon || defaults.horizon || "daily_plan")
  };
}

export function createAutomationProposalCreatePayload({ context = {}, workspaceId = "", selectedCycle = {} } = {}) {
  const plan = context.suggestedPlan || {};
  const defaults = context.generationDefaults || {};
  const recommendation = context.nextCardRecommendation || {};
  const selected = cycleSelectionPayload(selectedCycle || {});
  const targetNodeIds = firstCleanArray(
    selected.target_node_ids,
    recommendation.targetNodeIds,
    plan.targetNodeIds,
    [recommendation.targetNodeId || plan.targetNodeId]
  );
  return compactPayload({
    ...automationProposalScopeFromContext(context, workspaceId),
    available_minutes: firstCleanValue(defaults.availableMinutes, context.availableMinutes, 15),
    low_pressure: true,
    requested_by: "owner",
    source_plan_draft_id: selected.plan_draft_id,
    source_task_card_id: selected.task_card_id,
    source_evaluation_id: selected.evaluation_id,
    profile_delta_id: selected.profile_delta_id,
    evidence_id: selected.evidence_id,
    correction_id: selected.correction_id,
    source_id: selected.source_id,
    source_target_node_ids: selected.target_node_ids,
    target_node_ids: targetNodeIds
  });
}

export function createAutomationCycleClosurePayload({ context = {}, workspaceId = "", selectedCycle = {} } = {}) {
  return compactPayload({
    ...createAutomationProposalCreatePayload({ context, workspaceId, selectedCycle }),
    auto_select_latest_completed_cycle: true,
    accept_proposal: true,
    create_digest: true,
    review_digest: false,
    create_handoff: false,
    deliver_handoff: false,
    requested_by: "owner"
  });
}

export function createAutomationReviewAdvancementPayload({ context = {}, workspaceId = "", selectedCycle = {} } = {}) {
  return compactPayload({
    ...createAutomationCycleClosurePayload({ context, workspaceId, selectedCycle }),
    prepare_review_packet: true,
    review_digest: true,
    ensure_failure_policy: true,
    create_handoff: true,
    deliver_handoff: false,
    attempt_execution: false,
    requested_by: "owner"
  });
}

function automationProposalDecisionReason(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "accepted") return "Owner accepted supervised next-card proposal.";
  if (value === "expired") return "Owner expired stale supervised next-card proposal.";
  if (value === "superseded") return "Owner superseded supervised next-card proposal.";
  return "Owner skipped supervised next-card proposal.";
}

export function createAutomationProposalDecisionPayload({ context = {}, workspaceId = "", proposal = {}, status = "", reason = "" } = {}) {
  const targetStatus = clean(status);
  return compactPayload({
    ...automationProposalScopeFromContext(context, workspaceId),
    status: targetStatus,
    reason: clean(reason) || automationProposalDecisionReason(targetStatus),
    reviewed_by: "owner",
    proposal_id: clean(proposal.proposalId || proposal.proposal_id)
  });
}

export function createAutomationProposalPublishPayload({ context = {}, workspaceId = "", proposal = {} } = {}) {
  const defaults = context.generationDefaults || {};
  const proposalId = clean(proposal.proposalId || proposal.proposal_id);
  return compactPayload({
    ...automationProposalScopeFromContext(context, workspaceId),
    proposal_id: proposalId,
    generation_key: ["automation_proposal", proposalId, clean(proposal.planDraftId || proposal.plan_draft_id)].filter(Boolean).join(":"),
    card_schema_version: clean(defaults.cardSchemaVersion || "growth.card.authoring.v1"),
    requested_by: "owner"
  });
}

function automationDigestReviewReason(status = "") {
  const value = clean(status).toLowerCase();
  if (value === "reviewed") return "Owner reviewed automation digest without publishing.";
  if (value === "archived") return "Owner archived automation digest without publishing.";
  if (value === "superseded") return "Owner superseded automation digest without publishing.";
  return "Owner reviewed automation digest.";
}

export function createAutomationDigestReviewPayload({ context = {}, workspaceId = "", digest = {}, status = "" } = {}) {
  const targetStatus = clean(status);
  const selectedCandidateIds = asArray(digest.requiredActions)
    .map((action = {}) => clean(action.candidateId || action.candidate_id))
    .filter(Boolean);
  return compactPayload({
    ...automationProposalScopeFromContext(context, workspaceId),
    digest_id: clean(digest.digestId || digest.digest_id),
    status: targetStatus,
    selected_candidate_ids: selectedCandidateIds,
    reason: automationDigestReviewReason(targetStatus),
    reviewed_by: "owner"
  });
}

export function createAutomationDigestCreatePayload({ context = {}, workspaceId = "" } = {}) {
  return compactPayload({
    ...automationProposalScopeFromContext(context, workspaceId),
    limit: 6,
    requested_by: "owner"
  });
}

export function createAutomationFailurePolicyCreatePayload({ context = {}, workspaceId = "" } = {}) {
  return compactPayload({
    ...automationProposalScopeFromContext(context, workspaceId),
    policy_version: "growth.learningAutomationFailurePolicy.v1",
    policy: {
      schemaVersion: "growth.learningAutomationPolicy.v1",
      summaryOnly: true,
      ownerReviewRequired: true,
      digestReviewRequired: true,
      actionHandoffRequiredBeforeScheduling: true,
      writefulSchedulingAllowed: false
    },
    rollback_policy: {
      schemaVersion: "growth.learningAutomationFailurePolicy.rollback.v1",
      summaryOnly: true,
      transactionalPublishRequired: true,
      partialPublishBehavior: "service_transaction_rollback",
      proposalExecutionFailure: "record_bounded_execution_failure_owner_retry",
      actionHandoffFailure: "no_learning_write_visible_owner_retry",
      retryRequiresOwner: true,
      maxAutomaticRetries: 0
    },
    failure_policy: {
      schemaVersion: "growth.learningAutomationFailurePolicy.failure.v1",
      summaryOnly: true,
      visibleFailureRequired: true,
      ownerReviewRequired: true,
      retryRequiresOwner: true,
      maxAutomaticRetries: 0,
      writefulSchedulingAllowed: false
    },
    requested_by: "owner"
  });
}

export function createAutomationFailurePolicyReviewPayload({ context = {}, workspaceId = "", policy = {}, status = "" } = {}) {
  const targetStatus = clean(status);
  return compactPayload({
    ...automationProposalScopeFromContext(context, workspaceId),
    policy_id: clean(policy.policyId || policy.policy_id),
    status: targetStatus,
    reason: targetStatus === "active"
      ? "Owner activated failure policy for supervised automation readiness; writeful scheduling remains disabled."
      : `Owner marked failure policy ${targetStatus || "reviewed"}; no scheduler permission changed.`,
    note: targetStatus === "active"
      ? "Visible failure and Owner retry policy activated."
      : "Owner reviewed failure policy without enabling scheduling.",
    reviewed_by: "owner"
  });
}

export function createAutomationActionHandoffPayload({ context = {}, workspaceId = "", digest = {} } = {}) {
  const digestId = clean(digest.digestId || digest.digest_id);
  return compactPayload({
    ...automationProposalScopeFromContext(context, workspaceId),
    digest_id: digestId,
    summary: `Owner requested bounded action handoff for reviewed digest ${digestId || "digest"}.`,
    requested_by: "owner"
  });
}

export function createAutomationActionHandoffDeliverPayload({ context = {}, workspaceId = "", handoff = {} } = {}) {
  return compactPayload({
    ...automationProposalScopeFromContext(context, workspaceId),
    handoff_id: clean(handoff.handoffId || handoff.handoff_id),
    requested_by: "owner"
  });
}

function automationSchedulerExecutionActionFromHandoff(handoff = {}) {
  const actions = asArray(handoff.actions);
  return actions.find((action = {}) => clean(action.proposalId || action.proposal_id)) || actions[0] || {};
}

export function createAutomationSchedulerExecutionPayload({ context = {}, workspaceId = "", handoff = {} } = {}) {
  const scope = automationProposalScopeFromContext(context, workspaceId);
  const defaults = context.generationDefaults || {};
  const action = automationSchedulerExecutionActionFromHandoff(handoff);
  const handoffId = clean(handoff.handoffId || handoff.handoff_id);
  const proposalId = clean(action.proposalId || action.proposal_id || handoff.proposalId || handoff.proposal_id);
  const planDraftId = clean(action.planDraftId || action.plan_draft_id || handoff.planDraftId || handoff.plan_draft_id);
  const selectedItemId = clean(action.selectedItemId || action.selected_item_id || action.itemId || action.item_id || handoff.selectedItemId || handoff.selected_item_id);
  return compactPayload({
    ...scope,
    handoff_id: handoffId,
    digest_id: clean(handoff.digestId || handoff.digest_id),
    policy_id: clean(handoff.policyId || handoff.policy_id),
    proposal_id: proposalId,
    plan_draft_id: planDraftId,
    selected_item_id: selectedItemId,
    execution_mode: "owner_explicit_once",
    generation_key: ["scheduler_execution", handoffId, proposalId, planDraftId, selectedItemId].filter(Boolean).join(":"),
    card_schema_version: clean(defaults.cardSchemaVersion || "growth.card.authoring.v1"),
    requested_by: "owner"
  });
}

export function createAutomationSchedulerWorkerTargetReviewPayload({ context = {}, workspaceId = "", target = {}, status = "" } = {}) {
  const targetId = clean(target.targetId || target.target_id || target.workerTargetId || target.worker_target_id);
  const targetStatus = clean(status);
  return compactPayload({
    ...automationProposalScopeFromContext(context, workspaceId),
    target_id: targetId,
    status: targetStatus,
    reason: targetStatus === "enabled"
      ? "Owner reviewed target for future scheduler worker evidence; production scheduling remains disabled."
      : `Owner marked worker target ${targetStatus || "reviewed"}; no worker started.`,
    reviewed_by: "owner"
  });
}

export function createAutomationSchedulerRunPayload({ context = {}, workspaceId = "" } = {}) {
  const scope = automationProposalScopeFromContext(context, workspaceId);
  const defaults = context.generationDefaults || {};
  return compactPayload({
    ...scope,
    run_mode: "background_supervised_tick",
    limit: 5,
    generation_key: ["scheduler_run", clean(scope.workspace_id), clean(scope.domain), clean(scope.subject), clean(scope.horizon)].filter(Boolean).join(":"),
    card_schema_version: clean(defaults.cardSchemaVersion || "growth.card.authoring.v1"),
    requested_by: "owner"
  });
}

export function createAutomationSchedulerWorkerTargetPayload({ context = {}, workspaceId = "" } = {}) {
  const scope = automationProposalScopeFromContext(context, workspaceId);
  const plan = context.suggestedPlan || {};
  const recommendation = context.nextCardRecommendation || {};
  const targetNodeIds = firstCleanArray(recommendation.targetNodeIds, plan.targetNodeIds, [recommendation.targetNodeId || plan.targetNodeId]);
  return compactPayload({
    ...scope,
    target_node_ids: targetNodeIds,
    limit: 5,
    policy: {
      schemaVersion: "growth.learningAutomationSchedulerWorkerTarget.policy.v1",
      summaryOnly: true,
      workerMode: "background_worker_tick",
      schedulerRunMode: "background_supervised_tick",
      ownerReviewRequired: true,
      targetProvisioningRequired: true,
      actionHandoffRequiredBeforeScheduling: true,
      productionSchedulingAllowed: false,
      maxActionsPerTick: 5
    },
    requested_by: "owner"
  });
}

export function createRecommendationLifecycleDecisionPayload({ context = {}, workspaceId = "", recommendation = {}, status = "" } = {}) {
  const plan = context.suggestedPlan || {};
  const defaults = context.generationDefaults || {};
  const targetStatus = clean(status);
  return compactPayload({
    workspace_id: clean(workspaceId || recommendation.workspaceId || recommendation.workspace_id || context.target?.workspaceId),
    learner_id: clean(context.target?.learnerId || recommendation.learnerId || recommendation.learner_id || workspaceId),
    program_id: clean(context.programId || recommendation.programId || recommendation.program_id || plan.programId || defaults.programId),
    trajectory_id: clean(recommendation.trajectoryId || recommendation.trajectory_id || recommendation.id),
    task_card_id: clean(recommendation.sourceTaskCardId || recommendation.source_task_card_id || recommendation.taskCardId || recommendation.task_card_id),
    source_evaluation_id: clean(recommendation.sourceEvaluationId || recommendation.source_evaluation_id || recommendation.evaluationId || recommendation.evaluation_id),
    status: targetStatus,
    reason_code: targetStatus === "expired" ? "owner_expired_stale_recommendation" : "owner_skipped_low_pressure",
    reviewed_by: "owner"
  });
}
