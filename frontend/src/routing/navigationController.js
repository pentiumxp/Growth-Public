import { clean } from "../utils/string.js";

export const GROWTH_PLUGIN_ID = "growth";
export const GROWTH_NAVIGATION_STATE_KEY = "__hermesGrowthNavigation";
export const GROWTH_NAVIGATION_EVENT = "growth.plugin.navigation";
export const GROWTH_BACK_EVENT = "hermes.plugin.back";
export const GROWTH_BACK_RESULT_EVENT = "growth.plugin.back_result";

export function growthNavigationSnapshot(pageState = {}) {
  return {
    selectedLearningTaskCardId: clean(pageState.selectedLearningTaskCardId),
    learningGrowthHistoryTaskCardId: clean(pageState.learningGrowthHistoryTaskCardId),
    learningGrowthSettingsTaskId: clean(pageState.learningGrowthSettingsTaskId),
    learningGrowthSettingsOpen: Boolean(pageState.learningGrowthSettingsOpen),
    learningGrowthActiveTab: clean(pageState.learningGrowthActiveTab) || "overview",
    learningGrowthBoardLane: clean(pageState.learningGrowthBoardLane)
  };
}

export function growthRouteFromState(state = {}) {
  if (clean(state.selectedLearningTaskCardId)) {
    return {
      name: "card-detail",
      depth: 1,
      cardId: clean(state.selectedLearningTaskCardId)
    };
  }
  if (clean(state.learningGrowthHistoryTaskCardId)) {
    return {
      name: "card-history",
      depth: 1,
      cardId: clean(state.learningGrowthHistoryTaskCardId)
    };
  }
  if (state.learningGrowthSettingsOpen) {
    return {
      name: "owner-settings",
      depth: 1,
      tab: clean(state.learningGrowthActiveTab) || "overview"
    };
  }
  return {
    name: "root",
    depth: 0,
    tab: clean(state.learningGrowthActiveTab) || "overview"
  };
}

export function createGrowthNavigationController({
  pageState = {},
  renderShell,
  historyRef = globalThis.history,
  locationRef = globalThis.location,
  parentRef = globalThis.parent,
  windowRef = globalThis
} = {}) {
  function snapshot() {
    return growthNavigationSnapshot(pageState);
  }

  function routeFromState(state = snapshot()) {
    return growthRouteFromState(state);
  }

  function canGoBack(state = snapshot()) {
    return routeFromState(state).depth > 0;
  }

  function historyState(reason = "") {
    return {
      [GROWTH_NAVIGATION_STATE_KEY]: true,
      pluginId: GROWTH_PLUGIN_ID,
      reason: clean(reason),
      routeState: snapshot()
    };
  }

  function replaceHistory(reason = "") {
    if (!historyRef || typeof historyRef.replaceState !== "function") return false;
    try {
      historyRef.replaceState(historyState(reason), "", locationRef?.href || "");
      return true;
    } catch (error) {
      return false;
    }
  }

  function pushHistory(reason = "") {
    if (!historyRef || typeof historyRef.pushState !== "function") return false;
    try {
      historyRef.pushState(historyState(reason), "", locationRef?.href || "");
      return true;
    } catch (error) {
      return false;
    }
  }

  function postToParent(payload) {
    const target = parentRef && parentRef !== windowRef ? parentRef : null;
    if (!target || typeof target.postMessage !== "function") return false;
    try {
      target.postMessage(payload, "*");
      return true;
    } catch (error) {
      return false;
    }
  }

  function emitNavigation(reason = "") {
    const current = snapshot();
    const route = routeFromState(current);
    return postToParent({
      type: GROWTH_NAVIGATION_EVENT,
      version: 1,
      pluginId: GROWTH_PLUGIN_ID,
      canGoBack: route.depth > 0,
      route,
      reason: clean(reason)
    });
  }

  function emitBackResult(handled, reason = "") {
    const current = snapshot();
    const route = routeFromState(current);
    return postToParent({
      type: GROWTH_BACK_RESULT_EVENT,
      version: 1,
      pluginId: GROWTH_PLUGIN_ID,
      handled: Boolean(handled),
      canGoBack: route.depth > 0,
      route,
      reason: clean(reason)
    });
  }

  function applySnapshot(state = {}) {
    pageState.selectedLearningTaskCardId = clean(state.selectedLearningTaskCardId);
    pageState.learningGrowthHistoryTaskCardId = clean(state.learningGrowthHistoryTaskCardId);
    pageState.learningGrowthSettingsTaskId = clean(state.learningGrowthSettingsTaskId);
    pageState.learningGrowthSettingsOpen = Boolean(state.learningGrowthSettingsOpen);
    pageState.learningGrowthActiveTab = clean(state.learningGrowthActiveTab) || "overview";
    pageState.learningGrowthBoardLane = clean(state.learningGrowthBoardLane);
  }

  function clearSecondaryView() {
    if (!canGoBack()) return false;
    pageState.selectedLearningTaskCardId = "";
    pageState.learningGrowthHistoryTaskCardId = "";
    pageState.learningGrowthSettingsTaskId = "";
    pageState.learningGrowthSettingsOpen = false;
    return true;
  }

  function handleBack(reason = "host_back") {
    const handled = clearSecondaryView();
    if (handled) {
      replaceHistory(reason);
      if (typeof renderShell === "function") renderShell();
    }
    emitBackResult(handled, reason);
    if (!handled) emitNavigation(reason);
    return handled;
  }

  function handleMessage(event = {}) {
    if (event.data?.type !== GROWTH_BACK_EVENT) return;
    handleBack("host_back");
  }

  function handlePopState(event = {}) {
    if (event.state && event.state[GROWTH_NAVIGATION_STATE_KEY]) {
      applySnapshot(event.state.routeState || {});
      if (typeof renderShell === "function") renderShell();
      return;
    }
    if (clearSecondaryView() && typeof renderShell === "function") {
      renderShell();
    }
  }

  function bind() {
    if (windowRef && typeof windowRef.addEventListener === "function") {
      windowRef.addEventListener("message", handleMessage);
      windowRef.addEventListener("popstate", handlePopState);
    }
    replaceHistory("init");
    emitNavigation("init");
  }

  function unbind() {
    if (windowRef && typeof windowRef.removeEventListener === "function") {
      windowRef.removeEventListener("message", handleMessage);
      windowRef.removeEventListener("popstate", handlePopState);
    }
  }

  return {
    applySnapshot,
    bind,
    canGoBack,
    clearSecondaryView,
    emitBackResult,
    emitNavigation,
    handleBack,
    handleMessage,
    handlePopState,
    historyState,
    pushHistory,
    replaceHistory,
    routeFromState,
    snapshot,
    unbind
  };
}
