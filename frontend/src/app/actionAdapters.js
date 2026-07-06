import { clean } from "../utils/string.js";

const LEGACY_BUTTON_ACTIONS = new Set([
  "build_release_package",
  "create_automation_action_handoff",
  "deliver_automation_action_handoff",
  "execute_automation_scheduler_once",
  "publish_automation_proposal",
  "record_release_lifecycle_record",
  "record_release_workbench_action",
  "review_automation_digest",
  "review_automation_failure_policy",
  "review_automation_proposal",
  "review_automation_scheduler_worker_target",
  "review_recommendation_lifecycle"
]);

function compactDataset(dataset = {}) {
  return Object.fromEntries(Object.entries(dataset).filter(([, value]) => clean(value)));
}

export function legacyButtonDatasetForCardGenerationAction(action = {}) {
  const actionName = clean(action.action);
  if (actionName === "record_release_workbench_action") {
    return compactDataset({
      releaseWorkbenchAction: action.actionKey || action.endpointKey || "record",
      releaseWorkbenchActionKey: action.actionKey,
      releaseWorkbenchEndpointKey: action.endpointKey,
      releaseWorkbenchBlockedReason: action.blockedReason || action.reason
    });
  }
  if (actionName === "build_release_package") {
    return compactDataset({
      releasePackageBuild: action.actionKey || action.endpointKey || "build",
      releaseWorkbenchActionKey: action.actionKey,
      releaseWorkbenchEndpointKey: action.endpointKey
    });
  }
  if (actionName === "record_release_lifecycle_record") {
    return compactDataset({
      releaseLifecycleRecord: action.recordKind
    });
  }
  if (actionName === "review_automation_proposal" || actionName === "publish_automation_proposal") {
    return compactDataset({
      automationProposalId: action.proposalId,
      automationProposalStatus: action.status,
      automationProposalReview: actionName === "review_automation_proposal" ? action.status : "",
      automationProposalPublish: actionName === "publish_automation_proposal" ? action.proposalId || "publish" : ""
    });
  }
  if (actionName === "review_automation_digest") {
    return compactDataset({
      automationDigestId: action.digestId,
      automationDigestStatus: action.status,
      automationDigestReview: action.status
    });
  }
  if (actionName === "review_automation_failure_policy") {
    return compactDataset({
      automationFailurePolicyId: action.policyId,
      automationFailurePolicyStatus: action.status,
      automationFailurePolicyReview: action.status
    });
  }
  if (actionName === "create_automation_action_handoff") {
    return compactDataset({
      automationDigestId: action.digestId,
      automationActionHandoffCreate: action.digestId || "create"
    });
  }
  if (actionName === "deliver_automation_action_handoff") {
    return compactDataset({
      automationActionHandoffId: action.handoffId,
      automationActionHandoffDeliver: action.handoffId || "deliver"
    });
  }
  if (actionName === "execute_automation_scheduler_once") {
    return compactDataset({
      automationActionHandoffId: action.handoffId,
      automationSchedulerExecutionId: action.executionId,
      automationSchedulerExecutionExecute: action.executionId || action.handoffId || "execute"
    });
  }
  if (actionName === "review_automation_scheduler_worker_target") {
    return compactDataset({
      automationSchedulerWorkerTargetId: action.targetId,
      automationSchedulerWorkerTargetStatus: action.status,
      automationSchedulerWorkerTargetReview: action.status
    });
  }
  if (actionName === "review_recommendation_lifecycle") {
    return compactDataset({
      recommendationLifecycleReview: action.recommendationId || action.trajectoryId || action.sourceTaskCardId || action.sourceEvaluationId,
      recommendationLifecycleStatus: action.status,
      recommendationLifecycleTrajectoryId: action.trajectoryId || action.recommendationId,
      recommendationLifecycleSourceTaskCardId: action.sourceTaskCardId,
      recommendationLifecycleSourceEvaluationId: action.sourceEvaluationId
    });
  }
  return {};
}

export function cardGenerationActionNeedsLegacyButton(action = {}) {
  return LEGACY_BUTTON_ACTIONS.has(clean(action.action));
}

export function legacyButtonForCardGenerationAction(action = {}) {
  return {
    disabled: action.disabled === true,
    dataset: legacyButtonDatasetForCardGenerationAction(action)
  };
}

export function legacyHandlerArgsForCardGenerationAction(action = {}) {
  if (cardGenerationActionNeedsLegacyButton(action)) {
    return [legacyButtonForCardGenerationAction(action)];
  }
  return [action];
}
