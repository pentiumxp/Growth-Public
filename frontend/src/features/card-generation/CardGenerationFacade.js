import { clean } from "../../utils/string.js";
import { selectedPlanItem } from "./ActionPanel.js";
import {
  createAutomationActionHandoffDeliverPayload,
  createAutomationActionHandoffPayload,
  createAutomationCycleClosurePayload,
  createAutomationDigestCreatePayload,
  createAutomationDigestReviewPayload,
  createAutomationFailurePolicyCreatePayload,
  createAutomationFailurePolicyReviewPayload,
  createAutomationProposalCreatePayload,
  createAutomationProposalDecisionPayload,
  createAutomationProposalPublishPayload,
  createAutomationReviewAdvancementPayload,
  createAutomationSchedulerExecutionPayload,
  createAutomationSchedulerRunPayload,
  createAutomationSchedulerWorkerTargetPayload,
  createAutomationSchedulerWorkerTargetReviewPayload,
  createOperatingLoopAdvancePayload,
  createRecommendationLifecycleDecisionPayload,
  dailyLoopScopeFromContext,
  automationProposalScopeFromContext
} from "./automationPayloads.js";
import {
  createCycleAuditQueryPayload,
  createCycleHistoryQueryPayload,
  cycleAuditHasAnchor,
  cycleHistoryItemKey
} from "./CycleDrilldownPanel.js";
import {
  createOwnerAuditReviewPayload,
  createOwnerAuditReviewQueryPayload,
  createOwnerCorrectionPayload,
  ownerAuditReviewHasAnchor
} from "./OwnerAuditPanel.js";
import { cycleSelectionPayload } from "./ProfilePanel.js";
import { createReferenceChainRequests } from "./ReferenceChainPanel.js";
import {
  createReleaseArtifactTemplateQueryPayload,
  createReleaseEvidenceLedgerQueryPayload,
  createReleaseLifecycleRecordPayload,
  createReleaseLifecycleRecordsQueryPayload,
  createReleasePackageBuildPayload,
  createReleaseStatusReadbackQueryPayload,
  createReleaseWorkbenchActionAuditQueryPayload,
  createReleaseWorkbenchActionPayload
} from "./releasePayloads.js";
import { selectedProvisionDraft, isFanfanSampleTarget } from "./generationModel.js";
import { renderOwnerCardGenerationPanel } from "./CardGenerationPanel.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function compactPayload(payload = {}) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "boolean") return value === true;
    if (value && typeof value === "object") return true;
    return clean(value);
  }));
}

function firstCleanArray(...values) {
  for (const value of values) {
    const cleaned = asArray(value).map(clean).filter(Boolean);
    if (cleaned.length) return Array.from(new Set(cleaned)).slice(0, 12);
  }
  return [];
}

function latestClosedLoopDigest(state = {}) {
  const digests = asArray(state.automationDigests?.data?.digests);
  return digests.find((digest = {}) => ["pending", "reviewed"].includes(clean(digest.status))) || digests[0] || {};
}

function latestClosedLoopHandoff(state = {}, digestId = "") {
  const wantedDigestId = clean(digestId);
  const handoffs = asArray(state.automationActionHandoffs?.data?.handoffs);
  if (wantedDigestId) {
    const matched = handoffs.find((handoff = {}) => clean(handoff.digestId || handoff.digest_id) === wantedDigestId);
    if (matched) return matched;
  }
  return handoffs.find((handoff = {}) => clean(handoff.deliveryStatus || handoff.delivery_status) !== "delivered")
    || handoffs[0]
    || {};
}

function queryPayload(scope = {}, extra = {}) {
  return compactPayload({ ...scope, ...extra });
}

export function createDailyEnglishGeneratePayload({ context = {}, workspaceId = "" } = {}) {
  const defaults = context.generationDefaults || {};
  return compactPayload({
    workspace_id: clean(workspaceId || context.target?.workspaceId),
    learner_id: clean(context.target?.learnerId || workspaceId),
    recipe_id: clean(context.selectedRecipeId || "daily_english_v1"),
    card_schema_version: clean(defaults.cardSchemaVersion || "growth.card.authoring.v1")
  });
}

export function createDailyLoopDraftPayload({ context = {}, workspaceId = "", selection = {} } = {}) {
  return compactPayload(dailyLoopScopeFromContext(context, workspaceId, selection));
}

export function createDailyLoopAdvancePayload({ context = {}, workspaceId = "", selection = {} } = {}) {
  return createDailyLoopDraftPayload({ context, workspaceId, selection });
}

export function createDailyLoopPublishPayload({ context = {}, workspaceId = "", draftResult = {}, selection = {} } = {}) {
  const scope = dailyLoopScopeFromContext(context, workspaceId, selection);
  const planDraft = draftResult.planDraft || {};
  const item = selectedPlanItem(planDraft);
  const targetNodeIds = asArray(item.targetNodeIds).length ? asArray(item.targetNodeIds) : asArray(planDraft.targetNodeIds);
  return compactPayload({
    ...scope,
    plan_draft_id: clean(planDraft.planDraftId),
    selected_item_id: clean(planDraft.selectedItemId || item.itemId),
    target_node_ids: targetNodeIds.map(clean).filter(Boolean).slice(0, 12)
  });
}

export function createOperatingLoopRunQueryPayload({ context = {}, workspaceId = "" } = {}) {
  return compactPayload({
    ...dailyLoopScopeFromContext(context, workspaceId, {}),
    limit: 5
  });
}

export function createProfileFeedbackQueryPayload({ context = {}, workspaceId = "", selectedCycle = {} } = {}) {
  const scope = dailyLoopScopeFromContext(context, workspaceId, {});
  const selected = cycleSelectionPayload(selectedCycle || {});
  const plan = context.suggestedPlan || {};
  const recommendation = context.nextCardRecommendation || {};
  const targetNodeIds = firstCleanArray(
    selected.target_node_ids,
    recommendation.targetNodeIds,
    plan.targetNodeIds,
    [recommendation.targetNodeId || plan.targetNodeId]
  );
  const payload = {
    ...scope,
    plan_draft_id: selected.plan_draft_id,
    task_card_id: selected.task_card_id,
    evaluation_id: selected.evaluation_id,
    profile_delta_id: selected.profile_delta_id,
    evidence_id: selected.evidence_id,
    correction_id: selected.correction_id,
    source_id: selected.source_id,
    target_node_ids: targetNodeIds
  };
  const hasAnchor = ownerAuditReviewHasAnchor(payload);
  return queryPayload(payload, {
    auto_select_completed_cycle: hasAnchor ? "" : "true",
    auto_select_latest_completed_cycle: hasAnchor ? "" : "true",
    limit: 12
  });
}

export function createTargetProvisionPayload({ context = {}, workspaceId = "", draft = {} } = {}) {
  const selected = selectedProvisionDraft(context, draft);
  const plan = context.suggestedPlan || {};
  const defaults = context.generationDefaults || {};
  return compactPayload({
    workspace_id: clean(workspaceId || context.target?.workspaceId),
    learner_id: clean(context.target?.learnerId || workspaceId),
    program_id: clean(context.programId || plan.programId || defaults.programId),
    domain_pack_id: clean(selected.domainPackId),
    domain: clean(selected.domain || plan.domain || defaults.domain),
    subject: clean(selected.subject || plan.subject || defaults.subject),
    status: "active",
    source: "owner"
  });
}

export function createStageAssessmentPayload({ context = {}, workspaceId = "", activationSource = "owner_manual" } = {}) {
  const plan = context.suggestedPlan || {};
  const defaults = context.generationDefaults || {};
  const coverage = asArray(plan.targetNodeIds).length ? asArray(plan.targetNodeIds) : [plan.targetNodeId].filter(Boolean);
  return compactPayload({
    workspace_id: clean(workspaceId || context.target?.workspaceId),
    learner_id: clean(context.target?.learnerId || workspaceId),
    program_id: clean(context.programId || plan.programId || defaults.programId),
    domain_pack_id: clean(context.domainPackId || plan.domainPackId || defaults.domainPackId),
    domain: clean(plan.domain || context.domain || defaults.domain),
    subject: clean(plan.subject || context.subject || defaults.subject || plan.domain),
    subject_id: clean(plan.subject || plan.domain || "english"),
    capability_cluster_id: clean(plan.capabilityClusterId || plan.targetNodeId),
    target_node_id: clean(plan.targetNodeId || coverage[0]),
    assessment_coverage_node_ids: coverage,
    difficulty_band: "assessment",
    evidence_requirements: asArray(plan.evidenceRequirements),
    activation_source: clean(activationSource || "owner_manual"),
    activation_reason: clean(activationSource) === "owner_manual" ? "owner_manual" : "",
    generation_key: [
      "stage_assessment",
      clean(workspaceId || context.target?.workspaceId),
      coverage.join(",")
    ].filter(Boolean).join(":")
  });
}

export function createAutomationProposalQueryPayload({ context = {}, workspaceId = "" } = {}) {
  return queryPayload(automationProposalScopeFromContext(context, workspaceId), { limit: 6 });
}

export function createAutomationDigestQueryPayload({ context = {}, workspaceId = "" } = {}) {
  return queryPayload(automationProposalScopeFromContext(context, workspaceId), { limit: 6 });
}

export function createAutomationFailurePolicyQueryPayload({ context = {}, workspaceId = "", status = "" } = {}) {
  return queryPayload(automationProposalScopeFromContext(context, workspaceId), {
    status: clean(status),
    limit: 6
  });
}

export function createAutomationActionHandoffQueryPayload({ context = {}, workspaceId = "" } = {}) {
  return queryPayload(automationProposalScopeFromContext(context, workspaceId), { limit: 6 });
}

export function createAutomationSchedulerExecutionQueryPayload({ context = {}, workspaceId = "" } = {}) {
  return queryPayload(automationProposalScopeFromContext(context, workspaceId), { limit: 6 });
}

export function createAutomationSchedulerRunQueryPayload({ context = {}, workspaceId = "" } = {}) {
  return queryPayload(automationProposalScopeFromContext(context, workspaceId), { limit: 6 });
}

export function createAutomationSchedulerWorkerTargetQueryPayload({ context = {}, workspaceId = "" } = {}) {
  return queryPayload(automationProposalScopeFromContext(context, workspaceId), { limit: 6 });
}

export function createAutomationClosedLoopActionPlanQueryPayload({ context = {}, workspaceId = "", selectedCycle = {}, state = {} } = {}) {
  const scope = automationProposalScopeFromContext(context, workspaceId);
  const defaults = context.generationDefaults || {};
  const plan = context.suggestedPlan || {};
  const recommendation = context.nextCardRecommendation || {};
  const selected = cycleSelectionPayload(selectedCycle || {});
  const targetNodeIds = firstCleanArray(
    selected.target_node_ids,
    recommendation.targetNodeIds,
    plan.targetNodeIds,
    [recommendation.targetNodeId || plan.targetNodeId]
  );
  const digest = latestClosedLoopDigest(state);
  const digestId = clean(digest.digestId || digest.digest_id);
  const handoff = latestClosedLoopHandoff(state, digestId);
  return queryPayload(scope, {
    available_minutes: clean(defaults.availableMinutes || context.availableMinutes || 15),
    target_node_ids: targetNodeIds,
    source_target_node_ids: selected.target_node_ids,
    cycle_id: selected.cycle_id,
    source_plan_draft_id: selected.plan_draft_id,
    source_task_card_id: selected.task_card_id,
    source_evaluation_id: selected.evaluation_id,
    profile_delta_id: selected.profile_delta_id,
    evidence_id: selected.evidence_id,
    correction_id: selected.correction_id,
    source_id: selected.source_id,
    digest_id: digestId,
    handoff_id: clean(handoff.handoffId || handoff.handoff_id),
    proposal_id: clean(digest.proposalId || digest.proposal_id || handoff.proposalId || handoff.proposal_id),
    auto_select_latest_completed_cycle: true,
    audit_limit: 20,
    limit: 8,
    requested_by: "owner"
  });
}

export {
  createAutomationActionHandoffDeliverPayload,
  createAutomationActionHandoffPayload,
  createAutomationCycleClosurePayload,
  createAutomationDigestCreatePayload,
  createAutomationDigestReviewPayload,
  createAutomationFailurePolicyCreatePayload,
  createAutomationFailurePolicyReviewPayload,
  createAutomationProposalCreatePayload,
  createAutomationProposalDecisionPayload,
  createAutomationProposalPublishPayload,
  createAutomationReviewAdvancementPayload,
  createAutomationSchedulerExecutionPayload,
  createAutomationSchedulerRunPayload,
  createAutomationSchedulerWorkerTargetPayload,
  createAutomationSchedulerWorkerTargetReviewPayload,
  createOperatingLoopAdvancePayload,
  createRecommendationLifecycleDecisionPayload,
  createCycleAuditQueryPayload,
  createCycleHistoryQueryPayload,
  cycleAuditHasAnchor,
  cycleHistoryItemKey,
  createOwnerAuditReviewPayload,
  createOwnerAuditReviewQueryPayload,
  createOwnerCorrectionPayload,
  ownerAuditReviewHasAnchor,
  createReferenceChainRequests,
  createReleaseArtifactTemplateQueryPayload,
  createReleaseEvidenceLedgerQueryPayload,
  createReleaseLifecycleRecordPayload,
  createReleaseLifecycleRecordsQueryPayload,
  createReleasePackageBuildPayload,
  createReleaseStatusReadbackQueryPayload,
  createReleaseWorkbenchActionAuditQueryPayload,
  createReleaseWorkbenchActionPayload,
  isFanfanSampleTarget,
  renderOwnerCardGenerationPanel
};

export const HermesGrowthCardGenerationUiFacade = Object.freeze({
  createDailyEnglishGeneratePayload,
  createAutomationCycleClosurePayload,
  createAutomationClosedLoopActionPlanQueryPayload,
  createAutomationReviewAdvancementPayload,
  createAutomationProposalCreatePayload,
  createAutomationProposalDecisionPayload,
  createAutomationProposalPublishPayload,
  createAutomationProposalQueryPayload,
  createAutomationDigestCreatePayload,
  createAutomationDigestQueryPayload,
  createAutomationDigestReviewPayload,
  createAutomationFailurePolicyCreatePayload,
  createAutomationFailurePolicyQueryPayload,
  createAutomationFailurePolicyReviewPayload,
  createAutomationActionHandoffQueryPayload,
  createAutomationActionHandoffPayload,
  createAutomationActionHandoffDeliverPayload,
  createAutomationSchedulerExecutionQueryPayload,
  createAutomationSchedulerExecutionPayload,
  createAutomationSchedulerRunQueryPayload,
  createAutomationSchedulerRunPayload,
  createAutomationSchedulerWorkerTargetQueryPayload,
  createAutomationSchedulerWorkerTargetPayload,
  createAutomationSchedulerWorkerTargetReviewPayload,
  createRecommendationLifecycleDecisionPayload,
  createDailyLoopAdvancePayload,
  createDailyLoopDraftPayload,
  createDailyLoopPublishPayload,
  createOperatingLoopAdvancePayload,
  createOperatingLoopRunQueryPayload,
  createProfileFeedbackQueryPayload,
  createCycleAuditQueryPayload,
  createCycleHistoryQueryPayload,
  createOwnerAuditReviewPayload,
  createOwnerAuditReviewQueryPayload,
  createOwnerCorrectionPayload,
  createReleaseArtifactTemplateQueryPayload,
  createReleaseWorkbenchActionAuditQueryPayload,
  createReleaseStatusReadbackQueryPayload,
  createReleaseEvidenceLedgerQueryPayload,
  createReleaseLifecycleRecordsQueryPayload,
  createReleaseLifecycleRecordPayload,
  createReleasePackageBuildPayload,
  createReleaseWorkbenchActionPayload,
  createReferenceChainRequests,
  createTargetProvisionPayload,
  createStageAssessmentPayload,
  cycleHistoryItemKey,
  cycleAuditHasAnchor,
  ownerAuditReviewHasAnchor,
  isFanfanSampleTarget,
  renderOwnerCardGenerationPanel
});
