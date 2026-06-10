(async function bootGrowthPlugin() {
  const root = document.getElementById("growth-root") || document.querySelector(".growth-shell");
  const params = new URLSearchParams(window.location.search);
  const workspaceId = params.get("workspaceId") || params.get("workspace_id") || "";
  const pluginRoute = (params.get("pluginRoute") || params.get("route") || "").trim().toLowerCase();
  const pluginItemId = (params.get("pluginItemId") || params.get("itemId") || params.get("taskCardId") || "").trim();
  const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";
  const pageState = {
    auth: { isOwner: true },
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
  const model = { status: null, board: null, overview: null, detailCache: new Map() };

  function clean(value) {
    return String(value ?? "").trim();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function learnerLabel() {
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
      workspaceId: clean(card.workspaceId || workspaceId),
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
        id: workspaceId || "owner",
        workspaceId: workspaceId || "owner",
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
      workspaceId,
      learnerId: workspaceId,
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
    if (!model.detailCache.has(id)) {
      const result = await fetchJson(`/api/v1/growth/cards/${encodeURIComponent(id)}${query}`);
      if (result.card) model.detailCache.set(id, normalizeCard(result.card));
    }
    const detail = model.detailCache.get(id);
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
  }

  async function load() {
    root.innerHTML = `<div class="learning-growth-view"><div class="learning-coin-empty">正在加载成长数据...</div></div>`;
    const [status, board] = await Promise.all([
      fetchJson(`/api/v1/growth/status${query}`),
      fetchJson(`/api/v1/growth/board${query}`),
    ]);
    model.status = status;
    model.board = board;
    model.overview = makeOverview(status, board);
    pageState.learningGrowthBoardLane = clean(model.overview.board.lanes[0]?.id);
    if (pluginRoute === "settings") pageState.learningGrowthSettingsOpen = true;
    renderShell();
    if (pluginRoute === "card" && pluginItemId) {
      await openCard(pluginItemId);
    }
  }

  try {
    await load();
  } catch (error) {
    root.innerHTML = `<div class="learning-growth-view"><div class="learning-error">${escapeHtml(error.message || String(error))}</div></div>`;
  }
})();
