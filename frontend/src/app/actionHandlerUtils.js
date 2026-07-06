import { clean } from "../utils/string.js";

export function cardGenerationState(state = {}) {
  if (!state.cardGeneration || typeof state.cardGeneration !== "object") {
    state.cardGeneration = {};
  }
  return state.cardGeneration;
}

export function contextFor(state = {}) {
  return cardGenerationState(state).context || null;
}

export function selectedWorkspaceId(state = {}, fallback = "") {
  const cardGeneration = cardGenerationState(state);
  const context = cardGeneration.context || {};
  return clean(cardGeneration.selectedWorkspaceId || context.target?.workspaceId || fallback);
}

export function readbackLoadingPatch(previous = {}, preserveActionSlots = false) {
  const patch = {
    status: "loading",
    data: previous.data || null,
    error: ""
  };
  if (preserveActionSlots) {
    patch.actionStatus = previous.actionStatus || "idle";
    patch.actionResult = previous.actionResult || null;
    patch.actionError = previous.actionError || "";
  }
  return patch;
}

export function readbackReadyPatch(result, previous = {}, preserveActionSlots = false, status = "ready", error = "") {
  const patch = {
    status,
    data: result,
    error
  };
  if (preserveActionSlots) {
    patch.actionStatus = previous.actionStatus || "idle";
    patch.actionResult = previous.actionResult || null;
    patch.actionError = previous.actionError || "";
  }
  return patch;
}

export function readbackFailedPatch(error, previous = {}, preserveActionSlots = false) {
  return readbackReadyPatch(
    previous.data || null,
    previous,
    preserveActionSlots,
    "failed",
    error?.message || String(error)
  );
}

export function applyContextReadback(cardGeneration = {}, context = {}, contextKey = "", result) {
  if (!contextKey) return;
  cardGeneration.context = Object.assign({}, cardGeneration.context || context, {
    [contextKey]: result
  });
}

export function currentReleaseWorkbenchSummary(cardGeneration = {}) {
  const holder = cardGeneration.releaseWorkbench || {};
  const data = holder.data || cardGeneration.context?.releaseWorkbench || {};
  return data.releaseWorkbench || data || {};
}

export function findReleaseWorkbenchAction(cardGeneration = {}, endpointKey = "", actionKey = "") {
  const summary = currentReleaseWorkbenchSummary(cardGeneration);
  const actions = Array.isArray(summary.ownerActions) ? summary.ownerActions : [];
  const wantedEndpointKey = clean(endpointKey);
  const wantedActionKey = clean(actionKey);
  return actions.find((action = {}) => (
    clean(action.endpointKey || action.endpoint_key) === wantedEndpointKey
      && clean(action.key || action.actionKey || action.action_key) === wantedActionKey
  )) || actions.find((action = {}) => clean(action.endpointKey || action.endpoint_key) === wantedEndpointKey) || null;
}

export function releasePackageCandidate(holder = {}) {
  const result = holder.packageResult || {};
  const candidate = holder.packageCandidate || result.package || result.releasePackage || result.release_package;
  return candidate && typeof candidate === "object" ? candidate : null;
}

export function findById(items = [], id = "", keys = []) {
  const wanted = clean(id);
  return (Array.isArray(items) ? items : []).find((item = {}) => (
    keys.some((key) => clean(item[key]) === wanted)
  )) || null;
}

export function automationDataItems(cardGeneration = {}, slot = "", key = "") {
  const holder = cardGeneration[slot] || {};
  const data = holder.data || {};
  return Array.isArray(data[key]) ? data[key] : [];
}

export function recommendationLifecycleItems(cardGeneration = {}) {
  const context = cardGeneration.context || {};
  return Array.isArray(context.recommendationLifecycle) ? context.recommendationLifecycle : [];
}

export function findRecommendationLifecycleItem(cardGeneration = {}, button = {}) {
  const dataset = button.dataset || {};
  const trajectoryId = clean(dataset.recommendationLifecycleTrajectoryId);
  const sourceTaskCardId = clean(dataset.recommendationLifecycleSourceTaskCardId);
  const sourceEvaluationId = clean(dataset.recommendationLifecycleSourceEvaluationId);
  return recommendationLifecycleItems(cardGeneration).find((item = {}) => (
    (trajectoryId && clean(item.trajectoryId || item.trajectory_id || item.id) === trajectoryId)
      || (sourceTaskCardId && clean(item.sourceTaskCardId || item.source_task_card_id || item.taskCardId || item.task_card_id) === sourceTaskCardId)
      || (sourceEvaluationId && clean(item.sourceEvaluationId || item.source_evaluation_id || item.evaluationId || item.evaluation_id) === sourceEvaluationId)
  )) || {
    trajectoryId,
    sourceTaskCardId,
    sourceEvaluationId
  };
}
