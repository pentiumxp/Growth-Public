(async function bootGrowthPlugin() {
  const root = document.getElementById("growth-root") || document.querySelector(".growth-shell");
  const params = new URLSearchParams(window.location.search);
  let currentWorkspaceId = params.get("workspaceId") || params.get("workspace_id") || "";
  const pluginRoute = (params.get("pluginRoute") || params.get("route") || params.get("pluginActionId") || "").trim().toLowerCase();
  const pluginItemId = (params.get("pluginItemId") || params.get("itemId") || params.get("taskCardId") || "").trim();
  const pageState = {
    auth: { isOwner: false },
    learningGrowthActiveTab: "overview",
    learningGrowthBoardLane: "",
    learningGrowthSettingsOpen: false,
    learningGrowthSettingsTaskId: "",
    learningGrowthHistoryTaskCardId: "",
    selectedLearningTaskCardId: "",
    learningGrowthTeachingStepByCardId: {},
    learningGrowthTeachingDrafts: {},
    learningGrowthExperienceSignalBusy: {},
    learningGrowthExperienceSignalSubmitted: {},
    learningGrowthTeachingCheckBusy: {},
    learningGrowthStageAssessmentActivating: {},
  };
  const model = { status: null, board: null, overview: null, detailCache: new Map(), viewTargets: [], viewer: null };

  function clean(value) {
    return String(value ?? "").trim();
  }

  function normalizeTheme(value) {
    const text = clean(value).toLowerCase();
    return ["light", "dark", "system"].includes(text) ? text : "system";
  }

  function normalizeFontSize(value) {
    const text = clean(value).toLowerCase();
    if (text === "default") return "standard";
    return ["small", "standard", "large", "xlarge", "xxlarge"].includes(text) ? text : "standard";
  }

  function applyAppearance(input = {}) {
    const source = input && typeof input === "object" ? input : {};
    const theme = normalizeTheme(source.theme || source.pluginTheme || source.appearanceTheme || params.get("pluginTheme") || params.get("appearanceTheme") || params.get("theme"));
    const fontSize = normalizeFontSize(source.fontSize || source.pluginFontSize || source.appearanceFontSize || params.get("pluginFontSize") || params.get("appearanceFontSize") || params.get("fontSize"));
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.fontSize = fontSize;
  }

  applyAppearance();

  window.addEventListener("message", (event) => {
    const data = event?.data && typeof event.data === "object" ? event.data : null;
    if (!data || data.version !== 1) return;
    if (data.type === "hermes.plugin.appearance" || data.type === "hermes.plugin.viewport") {
      applyAppearance(data.appearance || data);
    }
  });

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function workspaceQuery(targetWorkspaceId = currentWorkspaceId) {
    return targetWorkspaceId ? `?workspaceId=${encodeURIComponent(targetWorkspaceId)}` : "";
  }

  function updateWorkspaceUrl() {
    if (!currentWorkspaceId || typeof window.history?.replaceState !== "function") return;
    const url = new URL(window.location.href);
    url.searchParams.set("workspaceId", currentWorkspaceId);
    window.history.replaceState(null, "", url.toString());
  }

  function targetForWorkspace(workspaceId = currentWorkspaceId) {
    return (model.viewTargets || []).find((target) => clean(target.workspaceId) === clean(workspaceId)) || null;
  }

  function learnerLabel(workspaceId = currentWorkspaceId) {
    const target = targetForWorkspace(workspaceId);
    if (target?.label) return target.label;
    if (workspaceId === "weixin_stephen") return "Stephen";
    if (workspaceId === "weixin_wuping") return "吴萍";
    return workspaceId || "执行者";
  }

  function boardMetrics(board = {}) {
    const cards = Array.isArray(board.cards) ? board.cards : [];
    const summary = board.summary || {};
    const completed = Number(summary.completed ?? cards.filter((card) => /complete|completed|done/i.test(clean(card.status || card.nextAction))).length);
    const active = Number(summary.active ?? cards.length - completed);
    const totalEarnedCoins = cards.reduce((sum, card) => sum + (Number(card.latestRewardSettlement?.coinAmount || 0) || 0), 0);
    return {
      totalCards: Number(summary.total ?? cards.length) || cards.length,
      activeTasks: Number.isFinite(active) ? active : 0,
      completedTasks: Number.isFinite(completed) ? completed : 0,
      totalEarnedCoins,
      sevenDayCoins: 0,
      thirtyDayCoins: 0,
    };
  }

  function normalizeCard(card = {}) {
    const id = clean(card.taskCardId || card.id);
    return Object.assign({}, card, {
      id,
      taskCardId: id,
      workspaceId: clean(card.workspaceId || currentWorkspaceId),
      title: clean(card.title) || id || "学习任务",
      status: clean(card.status || card.nextAction || card.primaryAction || "published"),
      nextAction: clean(card.nextAction || card.primaryAction || "submit"),
      nativeState: Object.assign({}, card.nativeState || {}, {
        nextAction: clean(card.nextAction || card.primaryAction || "submit"),
      }),
      rewardPolicy: Object.assign({ maxCoins: Number(card.rewardCapCoins || 100) || 100 }, card.rewardPolicy || {}),
      taskModel: Object.assign({}, card.taskModel || {}, {
        learnerInstruction: clean(card.learnerInstruction || card.instruction || card.instructionPreview),
        goalSummary: clean(card.goalSummary || card.instructionPreview),
      }),
    });
  }

  function normalizeBoard(board = {}) {
    const cards = (Array.isArray(board.cards) ? board.cards : []).map(normalizeCard);
    const cardIds = new Set(cards.map((card) => card.taskCardId));
    const lanes = (Array.isArray(board.lanes) ? board.lanes : [])
      .map((lane) => {
        const ids = (Array.isArray(lane.cards) ? lane.cards : []).map(clean).filter((id) => cardIds.has(id));
        return Object.assign({}, lane, {
          id: clean(lane.id || lane.title || "active"),
          title: clean(lane.title || lane.id || "Active"),
          cards: ids,
          count: Number(lane.count ?? ids.length) || ids.length,
        });
      })
      .filter((lane) => lane.cards.length || lane.count);
    return Object.assign({}, board, {
      cards,
      lanes,
      summary: Object.assign({}, board.summary || {}, boardMetrics({ cards, summary: board.summary || {} })),
    });
  }

  function makeOverview(status, board) {
    const normalizedBoard = normalizeBoard(board);
    const metrics = boardMetrics(normalizedBoard);
    const taskCards = normalizedBoard.cards;
    return {
      ok: true,
      source: board.source || status.source || "growth-plugin",
      learner: {
        id: currentWorkspaceId || "owner",
        workspaceId: currentWorkspaceId || "owner",
        displayName: learnerLabel(),
      },
      module: {
        title: "成长",
        status: status.stage || "plugin_sqlite",
      },
      metrics,
      coins: {
        balances: {
          availableCoins: metrics.totalEarnedCoins,
          earnedCoins: metrics.totalEarnedCoins,
        },
        growth: {
          totalEarnedCoins: metrics.totalEarnedCoins,
          sevenDayCoins: metrics.sevenDayCoins,
          thirtyDayCoins: metrics.thirtyDayCoins,
        },
        rewards: [],
        ledger: [],
        redemptions: [],
      },
      board: normalizedBoard,
      programs: {
        taskCards,
        executableTasks: taskCards,
        rewardSettlements: taskCards
          .map((card) => card.latestRewardSettlement)
          .filter(Boolean),
        interactionSessions: [],
        launchOperations: {
          counts: {
            completedTasks: metrics.completedTasks,
            pendingRewardSettlements: 0,
            pendingParentReviews: 0,
            pendingPlanReviews: 0,
          },
        },
      },
      launchOperations: {
        counts: {
          completedTasks: metrics.completedTasks,
          pendingRewardSettlements: 0,
          pendingParentReviews: 0,
          pendingPlanReviews: 0,
        },
      },
      platformCapabilities: [],
      capabilities: [],
      nextModules: [],
    };
  }

  function renderShell() {
    const growthUi = window.HermesLearningGrowthUi;
    if (!growthUi || typeof growthUi.renderLearningGrowthView !== "function") {
      root.innerHTML = `<div class="learning-coin-empty">Growth UI renderer is not available.</div>`;
      return;
    }
    root.innerHTML = growthUi.renderLearningGrowthView({
      overview: model.overview,
      state: pageState,
      workspaceId: currentWorkspaceId,
      learnerId: currentWorkspaceId,
      viewTargets: model.viewTargets,
      viewer: model.viewer,
      coins: model.overview?.coins || {},
      programUi: window.HermesLearningProgramUi,
      coinsUi: window.HermesLearningCoinsUi,
      growthTaskUi: window.HermesLearningGrowthTaskUi,
      activeGrowthBoardLane: pageState.learningGrowthBoardLane,
      selectedGrowthTaskCardId: pageState.selectedLearningTaskCardId,
      escapeHtml,
    });
    bindEvents();
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok || result.ok === false) throw new Error(result.error || `request_failed:${response.status}`);
    return result;
  }

  async function openCard(taskCardId) {
    const id = clean(taskCardId);
    if (!id) return;
    pageState.learningGrowthSettingsOpen = false;
    pageState.learningGrowthHistoryTaskCardId = "";
    pageState.selectedLearningTaskCardId = id;
    const cacheKey = `${currentWorkspaceId}:${id}`;
    if (!model.detailCache.has(cacheKey)) {
      const result = await fetchJson(`/api/v1/growth/cards/${encodeURIComponent(id)}${workspaceQuery()}`);
      if (result.card) model.detailCache.set(cacheKey, normalizeCard(result.card));
    }
    const detail = model.detailCache.get(cacheKey);
    if (detail) {
      const cards = model.overview?.programs?.taskCards || [];
      const index = cards.findIndex((card) => clean(card.taskCardId) === id);
      if (index >= 0) cards[index] = Object.assign({}, cards[index], detail);
      else cards.unshift(detail);
      model.overview.programs.executableTasks = cards;
      model.overview.board.cards = model.overview.board.cards.map((card) => clean(card.taskCardId) === id ? Object.assign({}, card, detail) : card);
    }
    renderShell();
  }

  function routeCardId(card = {}) {
    return clean(card.taskCardId || card.id);
  }

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

  function bindEvents() {
    root.querySelectorAll("[data-learning-growth-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        pageState.learningGrowthActiveTab = clean(button.dataset.learningGrowthTab) || "overview";
        renderShell();
      });
    });
    root.querySelectorAll("[data-learning-growth-board-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        pageState.learningGrowthBoardLane = clean(button.dataset.learningGrowthBoardFilter);
        renderShell();
      });
    });
    root.querySelectorAll("[data-learning-open-growth-task], [data-learning-open-settings-task]").forEach((node) => {
      node.addEventListener("click", (event) => {
        event.preventDefault();
        const id = clean(node.dataset.learningOpenGrowthTask || node.dataset.learningOpenSettingsTask);
        openCard(id).catch((error) => {
          root.insertAdjacentHTML("afterbegin", `<div class="learning-error">${escapeHtml(error.message || String(error))}</div>`);
        });
      });
    });
    root.querySelectorAll("[data-learning-settings-task-back]").forEach((button) => {
      button.addEventListener("click", () => {
        pageState.learningGrowthSettingsTaskId = "";
        renderShell();
      });
    });
    root.querySelectorAll("[data-growth-view-target]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const nextWorkspaceId = clean(button.dataset.growthViewTarget);
        if (!nextWorkspaceId || nextWorkspaceId === currentWorkspaceId) return;
        switchWorkspace(nextWorkspaceId).catch((error) => {
          root.insertAdjacentHTML("afterbegin", `<div class="learning-error">${escapeHtml(error.message || String(error))}</div>`);
        });
      });
    });
  }

  async function loadViewTargets() {
    const result = await fetchJson(`/api/v1/growth/view-targets${workspaceQuery()}`);
    model.viewer = result.viewer || null;
    model.viewTargets = Array.isArray(result.targets) ? result.targets : [];
    pageState.auth.isOwner = result.viewer?.role === "owner";
    const current = clean(result.current_workspace_id || currentWorkspaceId);
    const targetExists = model.viewTargets.some((target) => clean(target.workspaceId) === clean(currentWorkspaceId));
    if (!currentWorkspaceId && current) currentWorkspaceId = current;
    if (!targetExists && model.viewTargets[0]?.workspaceId) currentWorkspaceId = clean(model.viewTargets[0].workspaceId);
    model.viewTargets = model.viewTargets.map((target) => Object.assign({}, target, {
      current: clean(target.workspaceId) === clean(currentWorkspaceId),
    }));
    updateWorkspaceUrl();
  }

  async function loadCurrentWorkspace() {
    const [status, board] = await Promise.all([
      fetchJson(`/api/v1/growth/status${workspaceQuery()}`),
      fetchJson(`/api/v1/growth/board${workspaceQuery()}`),
    ]);
    model.status = status;
    model.board = board;
    model.overview = makeOverview(status, board);
    pageState.learningGrowthBoardLane = clean(model.overview.board.lanes[0]?.id);
  }

  async function switchWorkspace(nextWorkspaceId) {
    currentWorkspaceId = clean(nextWorkspaceId);
    updateWorkspaceUrl();
    model.detailCache.clear();
    pageState.selectedLearningTaskCardId = "";
    pageState.learningGrowthHistoryTaskCardId = "";
    pageState.learningGrowthSettingsTaskId = "";
    model.viewTargets = model.viewTargets.map((target) => Object.assign({}, target, {
      current: clean(target.workspaceId) === clean(currentWorkspaceId),
    }));
    root.innerHTML = `<div class="learning-growth-view"><div class="learning-coin-empty">正在加载成长数据...</div></div>`;
    await loadCurrentWorkspace();
    renderShell();
  }

  async function load() {
    root.innerHTML = `<div class="learning-growth-view"><div class="learning-coin-empty">正在加载成长数据...</div></div>`;
    await loadViewTargets();
    await loadCurrentWorkspace();
    const renderedByRoute = await applyInitialPluginRoute();
    if (!renderedByRoute) renderShell();
  }

  try {
    await load();
  } catch (error) {
    root.innerHTML = `<div class="learning-growth-view"><div class="learning-error">${escapeHtml(error.message || String(error))}</div></div>`;
  }
})();
