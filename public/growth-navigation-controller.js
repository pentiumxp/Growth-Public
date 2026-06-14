(function registerGrowthNavigationController(root) {
  const PLUGIN_ID = "growth";
  const NAVIGATION_STATE_KEY = "__hermesGrowthNavigation";
  const NAVIGATION_EVENT = "growth.plugin.navigation";
  const BACK_EVENT = "hermes.plugin.back";
  const BACK_RESULT_EVENT = "growth.plugin.back_result";

  function clean(value) {
    return String(value ?? "").trim();
  }

  function createGrowthNavigationController({
    pageState,
    renderShell,
    historyRef = root.history,
    locationRef = root.location,
    parentRef = root.parent,
    windowRef = root
  } = {}) {
    function snapshot() {
      return {
        selectedLearningTaskCardId: clean(pageState.selectedLearningTaskCardId),
        learningGrowthHistoryTaskCardId: clean(pageState.learningGrowthHistoryTaskCardId),
        learningGrowthSettingsTaskId: clean(pageState.learningGrowthSettingsTaskId),
        learningGrowthSettingsOpen: Boolean(pageState.learningGrowthSettingsOpen),
        learningGrowthActiveTab: clean(pageState.learningGrowthActiveTab) || "overview",
        learningGrowthBoardLane: clean(pageState.learningGrowthBoardLane)
      };
    }

    function routeFromState(state = snapshot()) {
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

    function canGoBack(state = snapshot()) {
      return routeFromState(state).depth > 0;
    }

    function historyState(reason = "") {
      return {
        [NAVIGATION_STATE_KEY]: true,
        pluginId: PLUGIN_ID,
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
        type: NAVIGATION_EVENT,
        version: 1,
        pluginId: PLUGIN_ID,
        canGoBack: route.depth > 0,
        route,
        reason: clean(reason)
      });
    }

    function emitBackResult(handled, reason = "") {
      const current = snapshot();
      const route = routeFromState(current);
      return postToParent({
        type: BACK_RESULT_EVENT,
        version: 1,
        pluginId: PLUGIN_ID,
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
      if (event.data?.type !== BACK_EVENT) return;
      handleBack("host_back");
    }

    function handlePopState(event = {}) {
      if (event.state && event.state[NAVIGATION_STATE_KEY]) {
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
      snapshot
    };
  }

  root.HermesGrowthNavigation = {
    BACK_EVENT,
    BACK_RESULT_EVENT,
    NAVIGATION_EVENT,
    createGrowthNavigationController
  };
})(typeof window !== "undefined" ? window : globalThis);
