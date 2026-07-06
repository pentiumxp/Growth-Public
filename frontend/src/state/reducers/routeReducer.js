import { clean } from "../../utils/string.js";

export function reduceRouteState(state = {}, action = {}) {
  const type = clean(action.action || action.type);
  if (type === "open_learning_growth_tab") {
    state.learningGrowthActiveTab = clean(action.tabId) || "overview";
    return true;
  }
  if (type === "set_learning_growth_board_lane") {
    state.learningGrowthBoardLane = clean(action.laneId);
    return true;
  }
  if (type === "open_growth_card") {
    const taskCardId = clean(action.taskCardId || action.cardId);
    if (!taskCardId) return false;
    state.learningGrowthSettingsOpen = false;
    state.learningGrowthHistoryTaskCardId = "";
    state.selectedLearningTaskCardId = taskCardId;
    return true;
  }
  if (type === "close_growth_card") {
    state.selectedLearningTaskCardId = "";
    state.learningGrowthHistoryTaskCardId = "";
    return true;
  }
  if (type === "open_growth_settings") {
    state.learningGrowthSettingsOpen = true;
    state.learningGrowthActiveTab = clean(action.tabId || state.learningGrowthActiveTab) || "overview";
    state.learningGrowthSettingsTaskId = clean(action.taskCardId || action.settingsTaskId);
    state.selectedLearningTaskCardId = "";
    state.learningGrowthHistoryTaskCardId = "";
    return true;
  }
  if (type === "close_growth_settings") {
    state.learningGrowthSettingsOpen = false;
    state.learningGrowthSettingsTaskId = "";
    return true;
  }
  return false;
}
