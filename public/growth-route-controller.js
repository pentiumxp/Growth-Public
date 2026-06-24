(function registerGrowthRouteController(root) {
  function clean(value) {
    return String(value ?? "").trim();
  }

  function routeCardId(card = {}) {
    return clean(card.taskCardId || card.id);
  }

  function routeText(card = {}) {
    return [
      card.status,
      card.laneId,
      card.nextAction,
      card.primaryAction,
      card.cardRole,
      card.taskCardType,
      card.activityType,
      card.taskModel?.taskCardType,
      card.taskModel?.activityType,
      card.title,
    ].map(clean).join(" ").toLowerCase();
  }

  function normalized(value) {
    return clean(value).toLowerCase().replace(/[-\s]+/g, "_");
  }

  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      return Object.entries(value)
        .filter(([, enabled]) => enabled === true || enabled === "true" || enabled === 1)
        .map(([key]) => key);
    }
    if (clean(value)) return clean(value).split(/[\s,|]+/);
    return [];
  }

  function addExplicitCapabilities(target, value) {
    asArray(value).forEach((item) => {
      const token = normalized(item);
      if (!token) return;
      if (token === "submit_work" || token === "submit" || token === "can_submit" || token === "can_revise") target.add("submit_work");
      if (token === "review" || token === "reflect" || token === "reflection" || token === "can_reflect") target.add("review");
      if (token === "stage_assessment" || token === "formal_assessment" || token === "assessment") target.add("stage_assessment");
      if (token === "rewards" || token === "coins" || token === "learning_coins") target.add("rewards");
    });
  }

  function cardCapabilities(card = {}) {
    const capabilities = new Set();
    addExplicitCapabilities(capabilities, card.routeCapabilities);
    addExplicitCapabilities(capabilities, card.actionCapabilities);
    addExplicitCapabilities(capabilities, card.availableActions);
    addExplicitCapabilities(capabilities, card.capabilities);

    const actions = card.actions && typeof card.actions === "object" ? card.actions : {};
    const laneId = normalized(card.laneId);
    const nextAction = normalized(card.nextAction);
    const primaryAction = normalized(card.primaryAction || actions.primaryAction);
    const cardRole = normalized(card.cardRole || card.card_role || card.learningGrowthCardRole);
    const taskCardType = normalized(card.taskCardType || card.task_card_type || card.taskModel?.taskCardType);
    const completionMode = normalized(card.completionPolicy?.mode || card.completion_policy?.mode || card.taskModel?.completionPolicy?.mode);

    if (actions.canSubmit === true || nextAction === "submit" || nextAction === "revise" || primaryAction === "submit" || primaryAction === "revise") {
      capabilities.add("submit_work");
    }
    if (actions.canReflect === true || nextAction === "spoken_reflection" || primaryAction === "reflect" || laneId === "reflection_required") {
      capabilities.add("review");
    }
    if (
      cardRole === "stage_assessment"
      || completionMode === "formal_assessment"
      || laneId === "stage_assessment"
      || taskCardType === "assessment"
      || clean(card.stageAssessmentCycleId || card.stage_assessment_cycle_id)
      || (card.stageAssessment && typeof card.stageAssessment === "object")
    ) {
      capabilities.add("stage_assessment");
    }
    return capabilities;
  }

  function hasRouteCapability(card, route) {
    return cardCapabilities(card).has(route);
  }

  const ROUTE_CONTRACT = Object.freeze({
    today_tasks: {
      label: "\u4eca\u65e5\u4efb\u52a1",
      target: "board_lane",
      laneId: "today",
      emptyTitle: "\u4eca\u65e5\u6ca1\u6709\u5f85\u5904\u7406\u4efb\u52a1",
      emptyBody: "\u770b\u677f\u5df2\u5207\u5230\u300c\u4eca\u65e5\u300d\uff1b\u5982\u679c\u6ca1\u6709\u5361\u7247\uff0c\u8868\u793a\u5f53\u524d\u6ca1\u6709\u4eca\u65e5\u8ba1\u5212\u4efb\u52a1\u3002"
    },
    cards: {
      label: "\u6210\u957f\u5361\u7247",
      target: "board_all",
      laneId: "all",
      emptyTitle: "\u6682\u65e0\u6210\u957f\u5361\u7247",
      emptyBody: "\u5df2\u8fdb\u5165\u5168\u90e8\u5361\u7247\u5217\u8868\uff1b\u6709\u5361\u7247\u540e\u4f1a\u5728\u8fd9\u91cc\u6309\u72b6\u6001\u5c55\u793a\u3002"
    },
    submit_work: {
      label: "\u63d0\u4ea4\u4f5c\u4e1a",
      target: "card_with_capability",
      emptyTitle: "\u6682\u65e0\u53ef\u63d0\u4ea4\u4f5c\u4e1a",
      emptyBody: "\u5f53\u524d\u6ca1\u6709\u5904\u4e8e\u63d0\u4ea4\u6216\u4fee\u8ba2\u72b6\u6001\u7684\u6210\u957f\u5361\u7247\u3002"
    },
    review: {
      label: "\u590d\u76d8",
      target: "reflection_card_or_owner_analysis",
      emptyTitle: "\u6682\u65e0\u9700\u590d\u76d8\u5361\u7247",
      emptyBody: "\u5f53\u524d\u6ca1\u6709\u5904\u4e8e\u590d\u76d8\u72b6\u6001\u7684\u5361\u7247\uff1b\u5b8c\u6210\u6279\u6539\u540e\u4f1a\u51fa\u73b0\u4e00\u6b21\u53cd\u601d\u5165\u53e3\u3002"
    },
    stage_assessment: {
      label: "\u9636\u6bb5\u6d4b\u8bc4",
      target: "formal_assessment_card_or_owner_generation",
      emptyTitle: "\u6682\u65e0\u5df2\u6fc0\u6d3b\u7684\u9636\u6bb5\u6d4b\u8bc4",
      emptyBody: "\u9636\u6bb5\u6d4b\u8bc4\u9700\u8981\u5148\u7531 Owner \u5728\u751f\u6210\u9875\u68c0\u67e5\u5e76\u6fc0\u6d3b\uff1b\u6fc0\u6d3b\u540e\u4f1a\u6253\u5f00\u6b63\u5f0f\u6d4b\u8bc4\u5361\u3002"
    },
    rewards: {
      label: "\u5956\u52b1/\u901a\u5b9d",
      target: "owner_rewards",
      emptyTitle: "\u5956\u52b1\u7531 Owner \u7ba1\u7406",
      emptyBody: "\u5f53\u524d\u6267\u884c\u8005\u770b\u677f\u4e0d\u63d0\u4f9b\u5956\u52b1\u7ba1\u7406\u9875\uff1b\u53ef\u901a\u8fc7\u5361\u7247\u548c\u91d1\u5e01\u6d41\u6c34\u67e5\u770b\u5b66\u4e60\u5956\u52b1\u7ed3\u679c\u3002"
    }
  });

  function createGrowthRouteController({ pluginRoute, pluginItemId, pageState, model, openCard } = {}) {
    function allTaskCards() {
      return [
        ...((Array.isArray(model.overview?.board?.cards) ? model.overview.board.cards : [])),
        ...((Array.isArray(model.overview?.programs?.taskCards) ? model.overview.programs.taskCards : [])),
        ...((Array.isArray(model.overview?.programs?.executableTasks) ? model.overview.programs.executableTasks : [])),
      ].filter((card, index, list) => {
        const id = routeCardId(card);
        return id && list.findIndex((item) => routeCardId(item) === id) === index;
      });
    }

    function firstTaskCardForRoute(route) {
      const cards = allTaskCards();
      if (route === "submit_work" || route === "review" || route === "stage_assessment") return cards.find((card) => hasRouteCapability(card, route)) || null;
      return null;
    }

    function setRouteState(route, status, extra = {}) {
      const contract = ROUTE_CONTRACT[route] || {};
      pageState.learningGrowthRouteState = Object.assign({
        route,
        label: contract.label || route,
        target: contract.target || "",
        status,
        emptyTitle: contract.emptyTitle || "",
        emptyBody: contract.emptyBody || "",
        laneId: contract.laneId || ""
      }, extra);
    }

    function showBoardRoute(route, laneId, status = "selected", extra = {}) {
      pageState.selectedLearningTaskCardId = "";
      pageState.learningGrowthHistoryTaskCardId = "";
      pageState.learningGrowthSettingsTaskId = "";
      pageState.learningGrowthSettingsOpen = false;
      pageState.learningGrowthActiveTab = "overview";
      pageState.learningGrowthBoardLane = laneId || ROUTE_CONTRACT[route]?.laneId || "";
      setRouteState(route, status, extra);
    }

    function showOwnerRoute(route, tabId, status = "selected", extra = {}) {
      pageState.selectedLearningTaskCardId = "";
      pageState.learningGrowthHistoryTaskCardId = "";
      pageState.learningGrowthSettingsTaskId = "";
      pageState.learningGrowthSettingsOpen = true;
      pageState.learningGrowthActiveTab = tabId || "overview";
      setRouteState(route, status, extra);
    }

    function showEmptyRoute(route, extra = {}) {
      showBoardRoute(route, extra.laneId || "all", "empty", Object.assign({
        code: `growth_route_${route}_empty`
      }, extra));
    }

    async function applyInitialPluginRoute() {
      if (!pluginRoute) return false;
      if (pluginRoute === "settings") {
        pageState.learningGrowthSettingsOpen = Boolean(pageState.auth.isOwner);
        setRouteState(pluginRoute, pageState.auth.isOwner ? "selected" : "unavailable", {
          label: "\u8bbe\u7f6e",
          target: "owner_settings",
          emptyTitle: "\u8bbe\u7f6e\u9700\u8981 Owner \u6743\u9650",
          emptyBody: "\u8bf7\u5207\u6362\u5230 Owner \u89c6\u89d2\u540e\u518d\u6253\u5f00\u6210\u957f\u8bbe\u7f6e\u3002"
        });
        return false;
      }
      if (pluginRoute === "rewards") {
        if (pageState.auth.isOwner) showOwnerRoute(pluginRoute, "rewards");
        else showBoardRoute(pluginRoute, "all", "unavailable", { code: "growth_route_rewards_owner_only" });
        return false;
      }
      if (pluginRoute === "generation" || pluginRoute === "generate" || pluginRoute === "card-generation" || pluginRoute === "generate_cards") {
        if (pageState.auth.isOwner) showOwnerRoute("generate_cards", "generation");
        else showBoardRoute("generate_cards", "all", "unavailable", {
          label: "\u751f\u6210\u5361\u7247",
          target: "owner_generation",
          emptyTitle: "\u751f\u6210\u5361\u7247\u9700\u8981 Owner \u6743\u9650",
          emptyBody: "\u5b66\u4e60\u8005\u89c6\u89d2\u53ea\u80fd\u6267\u884c\u5df2\u53d1\u5e03\u7684\u5361\u7247\u3002"
        });
        return false;
      }
      if (pluginRoute === "review") {
        if (pageState.auth.isOwner) {
          showOwnerRoute(pluginRoute, "ai-analysis");
          return false;
        }
        const card = firstTaskCardForRoute(pluginRoute);
        if (card) {
          setRouteState(pluginRoute, "matched", { taskCardId: routeCardId(card) });
          await openCard(routeCardId(card));
          return true;
        }
        showEmptyRoute(pluginRoute, { laneId: "reflection_required" });
        return false;
      }
      if (pluginRoute === "submit_work" || pluginRoute === "stage_assessment") {
        const card = firstTaskCardForRoute(pluginRoute);
        if (card) {
          setRouteState(pluginRoute, "matched", { taskCardId: routeCardId(card) });
          await openCard(routeCardId(card));
          return true;
        }
        if (pluginRoute === "stage_assessment" && pageState.auth.isOwner) {
          showOwnerRoute(pluginRoute, "generation", "unavailable", { code: "growth_route_stage_assessment_not_active" });
          return false;
        }
        showEmptyRoute(pluginRoute, { laneId: pluginRoute === "submit_work" ? "today" : "all" });
        return false;
      }
      if (pluginRoute === "card" && pluginItemId) {
        setRouteState(pluginRoute, "matched", {
          label: "\u6210\u957f\u5361\u7247",
          target: "card_detail",
          taskCardId: pluginItemId
        });
        await openCard(pluginItemId);
        return true;
      }
      if (pluginRoute === "today_tasks") {
        showBoardRoute(pluginRoute, "today");
        return false;
      }
      if (pluginRoute === "cards") {
        showBoardRoute(pluginRoute, "all");
        return false;
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

  root.HermesGrowthRouteController = {
    ROUTE_CONTRACT,
    cardCapabilities,
    createGrowthRouteController,
    hasRouteCapability,
    routeCardId,
    routeText
  };
})(typeof window !== "undefined" ? window : globalThis);
