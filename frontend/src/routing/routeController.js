import {
  cardCapabilities,
  firstTaskCardForRoute as firstTaskCardForRouteModel,
  hasRouteCapability,
  routeCardId,
  routeText,
  ROUTE_CONTRACT,
  uniqueTaskCards
} from "./growthRoutes.js";
import { initialPluginRouteIntent } from "./initialRoute.js";
import { clean } from "../utils/string.js";

function setRouteState(pageState = {}, route = "", status = "", extra = {}) {
  const contract = ROUTE_CONTRACT[route] || {};
  pageState.learningGrowthRouteState = {
    route,
    label: contract.label || route,
    target: contract.target || "",
    status,
    emptyTitle: contract.emptyTitle || "",
    emptyBody: contract.emptyBody || "",
    laneId: contract.laneId || "",
    ...extra
  };
}

function showBoardRoute(pageState = {}, intent = {}) {
  pageState.selectedLearningTaskCardId = "";
  pageState.learningGrowthHistoryTaskCardId = "";
  pageState.learningGrowthSettingsTaskId = "";
  pageState.learningGrowthSettingsOpen = false;
  pageState.learningGrowthActiveTab = "overview";
  pageState.learningGrowthBoardLane = clean(intent.laneId);
  pageState.learningGrowthRouteState = intent.routeState || null;
}

function showOwnerRoute(pageState = {}, intent = {}) {
  pageState.selectedLearningTaskCardId = "";
  pageState.learningGrowthHistoryTaskCardId = "";
  pageState.learningGrowthSettingsTaskId = "";
  pageState.learningGrowthSettingsOpen = true;
  pageState.learningGrowthActiveTab = clean(intent.tabId) || "overview";
  pageState.learningGrowthRouteState = intent.routeState || null;
}

function applyOwnerSettingsRoute(pageState = {}, intent = {}) {
  pageState.learningGrowthSettingsOpen = Boolean(intent.settingsOpen);
  pageState.learningGrowthRouteState = intent.routeState || null;
}

export function applyInitialRouteIntent(pageState = {}, intent = {}) {
  if (intent.kind === "owner_settings") {
    applyOwnerSettingsRoute(pageState, intent);
    return true;
  }
  if (intent.kind === "owner_tab") {
    showOwnerRoute(pageState, intent);
    return true;
  }
  if (intent.kind === "board") {
    showBoardRoute(pageState, intent);
    return true;
  }
  if (intent.kind === "open_card") {
    pageState.learningGrowthRouteState = intent.routeState || null;
    return true;
  }
  if (intent.kind === "unknown") {
    setRouteState(pageState, intent.route || "", "unknown");
    return true;
  }
  return false;
}

export function createGrowthRouteController({
  pluginRoute = "",
  pluginItemId = "",
  pageState = {},
  model = {},
  openCard
} = {}) {
  function allTaskCards() {
    return uniqueTaskCards(model);
  }

  function firstTaskCardForRoute(route = "") {
    return firstTaskCardForRouteModel(route, model);
  }

  async function applyInitialPluginRoute() {
    const intent = initialPluginRouteIntent({ pluginRoute, pluginItemId, pageState, model });
    if (!intent || intent.kind === "none") return false;
    applyInitialRouteIntent(pageState, intent);
    if (intent.kind === "open_card") {
      if (typeof openCard === "function") {
        await openCard(intent.taskCardId);
      }
      return true;
    }
    return false;
  }

  return {
    allTaskCards,
    applyInitialPluginRoute,
    cardCapabilities,
    firstTaskCardForRoute,
    hasRouteCapability
  };
}

export {
  cardCapabilities,
  hasRouteCapability,
  routeCardId,
  routeText,
  ROUTE_CONTRACT
};
