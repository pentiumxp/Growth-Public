import { clean } from "../utils/string.js";
import { firstTaskCardForRoute, routeCardId, ROUTE_CONTRACT } from "./growthRoutes.js";

function routeState(route, status, extra = {}) {
  const contract = ROUTE_CONTRACT[route] || {};
  return {
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

function boardIntent(route, laneId, status = "selected", extra = {}) {
  return {
    kind: "board",
    route,
    laneId: laneId || ROUTE_CONTRACT[route]?.laneId || "",
    status,
    routeState: routeState(route, status, extra)
  };
}

function ownerIntent(route, tabId, status = "selected", extra = {}) {
  return {
    kind: "owner_tab",
    route,
    tabId: tabId || "overview",
    status,
    routeState: routeState(route, status, extra)
  };
}

function emptyIntent(route, extra = {}) {
  return boardIntent(route, extra.laneId || "all", "empty", {
    code: `growth_route_${route}_empty`,
    ...extra
  });
}

export function initialPluginRouteIntent({ pluginRoute = "", pluginItemId = "", pageState = {}, model = {} } = {}) {
  const route = clean(pluginRoute);
  const itemId = clean(pluginItemId);
  if (!route) return { kind: "none", handled: false };

  if (route === "settings") {
    return {
      kind: "owner_settings",
      handled: false,
      settingsOpen: Boolean(pageState.auth?.isOwner),
      routeState: routeState(route, pageState.auth?.isOwner ? "selected" : "unavailable", {
        label: "设置",
        target: "owner_settings",
        emptyTitle: "设置需要 Owner 权限",
        emptyBody: "请切换到 Owner 视角后再打开成长设置。"
      })
    };
  }

  if (route === "rewards") {
    if (pageState.auth?.isOwner) return ownerIntent(route, "rewards");
    return boardIntent(route, "all", "unavailable", { code: "growth_route_rewards_owner_only" });
  }

  if (route === "generation" || route === "generate" || route === "card-generation" || route === "generate_cards") {
    if (pageState.auth?.isOwner) return ownerIntent("generate_cards", "generation");
    return boardIntent("generate_cards", "all", "unavailable", {
      label: "生成卡片",
      target: "owner_generation",
      emptyTitle: "生成卡片需要 Owner 权限",
      emptyBody: "学习者视角只能执行已发布的卡片。"
    });
  }

  if (route === "review") {
    if (pageState.auth?.isOwner) return ownerIntent(route, "ai-analysis");
    const card = firstTaskCardForRoute(route, model);
    if (card) {
      const taskCardId = routeCardId(card);
      return {
        kind: "open_card",
        handled: true,
        taskCardId,
        routeState: routeState(route, "matched", { taskCardId })
      };
    }
    return emptyIntent(route, { laneId: "reflection_required" });
  }

  if (route === "submit_work" || route === "stage_assessment") {
    const card = firstTaskCardForRoute(route, model);
    if (card) {
      const taskCardId = routeCardId(card);
      return {
        kind: "open_card",
        handled: true,
        taskCardId,
        routeState: routeState(route, "matched", { taskCardId })
      };
    }
    if (route === "stage_assessment" && pageState.auth?.isOwner) {
      return ownerIntent(route, "generation", "unavailable", { code: "growth_route_stage_assessment_not_active" });
    }
    return emptyIntent(route, { laneId: route === "submit_work" ? "today" : "all" });
  }

  if (route === "card" && itemId) {
    return {
      kind: "open_card",
      handled: true,
      taskCardId: itemId,
      routeState: routeState(route, "matched", {
        label: "成长卡片",
        target: "card_detail",
        taskCardId: itemId
      })
    };
  }

  if (route === "today_tasks") return boardIntent(route, "today");
  if (route === "cards") return boardIntent(route, "all");
  return { kind: "unknown", handled: false, route };
}
