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
      if (route === "submit_work") {
        return cards.find((card) => /submit|published|active|ready/.test(routeText(card))) || cards[0] || null;
      }
      if (route === "review") {
        return cards.find((card) => /review|reflect|feedback|revision/.test(routeText(card))) || null;
      }
      if (route === "stage_assessment") {
        return cards.find((card) => /stage_assessment|challenge|assessment|测评|能力测验/.test(routeText(card))) || null;
      }
      return null;
    }

    async function applyInitialPluginRoute() {
      if (!pluginRoute) return false;
      if (pluginRoute === "settings") {
        pageState.learningGrowthSettingsOpen = Boolean(pageState.auth.isOwner);
        return false;
      }
      if (pluginRoute === "rewards") {
        pageState.learningGrowthSettingsOpen = Boolean(pageState.auth.isOwner);
        pageState.learningGrowthActiveTab = pageState.auth.isOwner ? "rewards" : "overview";
        return false;
      }
      if (pluginRoute === "review") {
        if (pageState.auth.isOwner) {
          pageState.learningGrowthSettingsOpen = true;
          pageState.learningGrowthActiveTab = "ai-analysis";
          return false;
        }
        const card = firstTaskCardForRoute(pluginRoute);
        if (card) {
          await openCard(routeCardId(card));
          return true;
        }
        return false;
      }
      if (pluginRoute === "submit_work" || pluginRoute === "stage_assessment") {
        const card = firstTaskCardForRoute(pluginRoute);
        if (card) {
          await openCard(routeCardId(card));
          return true;
        }
        return false;
      }
      if (pluginRoute === "card" && pluginItemId) {
        await openCard(pluginItemId);
        return true;
      }
      if (pluginRoute === "today_tasks" || pluginRoute === "cards") {
        pageState.learningGrowthSettingsOpen = false;
        pageState.learningGrowthActiveTab = "overview";
        return false;
      }
      return false;
    }

    return {
      allTaskCards,
      applyInitialPluginRoute,
      firstTaskCardForRoute
    };
  }

  root.HermesGrowthRouteController = {
    createGrowthRouteController,
    routeCardId,
    routeText
  };
})(typeof window !== "undefined" ? window : globalThis);
