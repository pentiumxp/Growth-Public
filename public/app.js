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

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const appearance = window.HermesGrowthAppearance.createGrowthAppearance({ params, documentRef: document });
  appearance.applyAppearance();
  appearance.bindAppearanceMessages(window);

  const api = window.HermesGrowthApiClient.createGrowthApiClient({
    fetchImpl: window.fetch.bind(window),
    getWorkspaceId: () => currentWorkspaceId,
    historyRef: window.history,
    locationRef: window.location
  });

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

  const viewModel = window.HermesGrowthViewModel.createGrowthViewModel({
    getWorkspaceId: () => currentWorkspaceId,
    learnerLabel
  });

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

  async function openCard(taskCardId) {
    const id = clean(taskCardId);
    if (!id) return;
    pageState.learningGrowthSettingsOpen = false;
    pageState.learningGrowthHistoryTaskCardId = "";
    pageState.selectedLearningTaskCardId = id;
    const cacheKey = `${currentWorkspaceId}:${id}`;
    if (!model.detailCache.has(cacheKey)) {
      const result = await api.fetchJson(`/api/v1/growth/cards/${encodeURIComponent(id)}${api.workspaceQuery()}`);
      if (result.card) model.detailCache.set(cacheKey, viewModel.normalizeCard(result.card));
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

  const routeController = window.HermesGrowthRouteController.createGrowthRouteController({
    pluginRoute,
    pluginItemId,
    pageState,
    model,
    openCard
  });

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
    const result = await api.fetchJson(`/api/v1/growth/view-targets${api.workspaceQuery()}`);
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
    api.updateWorkspaceUrl();
  }

  async function loadCurrentWorkspace() {
    const [status, board] = await Promise.all([
      api.fetchJson(`/api/v1/growth/status${api.workspaceQuery()}`),
      api.fetchJson(`/api/v1/growth/board${api.workspaceQuery()}`),
    ]);
    model.status = status;
    model.board = board;
    model.overview = viewModel.makeOverview(status, board);
    pageState.learningGrowthBoardLane = clean(model.overview.board.lanes[0]?.id);
  }

  async function switchWorkspace(nextWorkspaceId) {
    currentWorkspaceId = clean(nextWorkspaceId);
    api.updateWorkspaceUrl();
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
    const renderedByRoute = await routeController.applyInitialPluginRoute();
    if (!renderedByRoute) renderShell();
  }

  try {
    await load();
  } catch (error) {
    root.innerHTML = `<div class="learning-growth-view"><div class="learning-error">${escapeHtml(error.message || String(error))}</div></div>`;
  }
})();
