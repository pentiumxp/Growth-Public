import {
  cardGenerationWorkspaceId,
  selectedWorkspaceSupportsCardGeneration,
  targetProvisionSelection
} from "../features/card-generation/generationModel.js";
import { clean } from "../utils/string.js";

export function selectCardGenerationState(state = {}) {
  return state.cardGeneration && typeof state.cardGeneration === "object"
    ? state.cardGeneration
    : {};
}

export function selectAuthState(state = {}) {
  return state.auth && typeof state.auth === "object"
    ? state.auth
    : {};
}

export function selectRouteState(state = {}) {
  return {
    activeTab: clean(state.learningGrowthActiveTab || "overview") || "overview",
    boardLane: clean(state.learningGrowthBoardLane),
    selectedTaskCardId: clean(state.selectedLearningTaskCardId),
    settingsTaskId: clean(state.learningGrowthSettingsTaskId),
    historyTaskCardId: clean(state.learningGrowthHistoryTaskCardId),
    settingsOpen: state.learningGrowthSettingsOpen === true,
    routeState: state.learningGrowthRouteState || null
  };
}

export function selectCardGenerationWorkspaceId(state = {}, {
  viewTargets = [],
  currentWorkspaceId = "",
  sampleWorkspaceIds
} = {}) {
  return cardGenerationWorkspaceId({
    pageState: state,
    viewTargets,
    currentWorkspaceId,
    sampleWorkspaceIds
  });
}

export function selectSelectedWorkspaceSupportsCardGeneration(state = {}, {
  viewTargets = [],
  currentWorkspaceId = "",
  sampleWorkspaceIds
} = {}) {
  return selectedWorkspaceSupportsCardGeneration({
    pageState: state,
    viewTargets,
    currentWorkspaceId,
    sampleWorkspaceIds
  });
}

export function selectTargetProvisionSelection(state = {}) {
  return targetProvisionSelection(state);
}

export function selectOwnerGenerationRuntimeState(state = {}, options = {}) {
  const cardGeneration = selectCardGenerationState(state);
  const route = selectRouteState(state);
  const workspaceId = selectCardGenerationWorkspaceId(state, options);
  return {
    isOwner: selectAuthState(state).isOwner === true,
    route,
    cardGeneration,
    workspaceId,
    targetEnabled: selectSelectedWorkspaceSupportsCardGeneration(state, options),
    targetProvisionSelection: selectTargetProvisionSelection(state),
    context: cardGeneration.context || null,
    status: clean(cardGeneration.status || "idle") || "idle",
    error: clean(cardGeneration.error)
  };
}
