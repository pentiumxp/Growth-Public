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
    cardGeneration: {
      status: "idle",
      context: null,
      generatedResult: null,
      error: "",
      progressStep: "",
      progressMessage: ""
    },
  };
  const model = { status: null, board: null, overview: null, detailCache: new Map(), viewTargets: [], viewer: null };
  let cardGenerationProgressTimers = [];

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
      cardGenerationUi: window.HermesGrowthCardGenerationUi,
      growthTaskUi: window.HermesLearningGrowthTaskUi,
      activeGrowthBoardLane: pageState.learningGrowthBoardLane,
      selectedGrowthTaskCardId: pageState.selectedLearningTaskCardId,
      escapeHtml,
    });
    bindEvents();
  }

  function clearCardGenerationProgressTimers() {
    cardGenerationProgressTimers.forEach((timerId) => window.clearTimeout(timerId));
    cardGenerationProgressTimers = [];
  }

  function setCardGenerationProgress(progressStep, progressMessage) {
    if (pageState.cardGeneration.status !== "generating") return;
    pageState.cardGeneration.progressStep = progressStep;
    pageState.cardGeneration.progressMessage = progressMessage;
    renderShell();
  }

  function scheduleCardGenerationProgress() {
    clearCardGenerationProgressTimers();
    [
      [700, "gateway", "正在调用 Gateway 生成 authoring draft。"],
      [3200, "validation", "正在校验 teachingFlow、图谱绑定和隐私边界。"],
      [7600, "publish", "正在等待发布结果，成功后会写入 Growth SQLite。"]
    ].forEach(([delayMs, progressStep, progressMessage]) => {
      cardGenerationProgressTimers.push(window.setTimeout(() => {
        setCardGenerationProgress(progressStep, progressMessage);
      }, delayMs));
    });
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
    root.querySelectorAll("[data-learning-growth-open-settings]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        pageState.learningGrowthSettingsOpen = true;
        pageState.learningGrowthActiveTab = pageState.learningGrowthActiveTab || "overview";
        renderShell();
      });
    });
    root.querySelectorAll("[data-learning-growth-close-settings]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        pageState.learningGrowthSettingsOpen = false;
        pageState.learningGrowthSettingsTaskId = "";
        renderShell();
      });
    });
    root.querySelectorAll("[data-growth-view-target]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const nextWorkspaceId = clean(button.dataset.growthViewTarget);
        if (!nextWorkspaceId || nextWorkspaceId === currentWorkspaceId) return;
        switchWorkspace(nextWorkspaceId).then(loadCardGenerationContext).catch((error) => {
          root.insertAdjacentHTML("afterbegin", `<div class="learning-error">${escapeHtml(error.message || String(error))}</div>`);
        });
      });
    });
    root.querySelectorAll("[data-card-generation-target]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const nextWorkspaceId = clean(button.dataset.cardGenerationTarget);
        if (!nextWorkspaceId || nextWorkspaceId === currentWorkspaceId || button.disabled) return;
        switchWorkspace(nextWorkspaceId).then(loadCardGenerationContext).catch((error) => {
          root.insertAdjacentHTML("afterbegin", `<div class="learning-error">${escapeHtml(error.message || String(error))}</div>`);
        });
      });
    });
    root.querySelectorAll("[data-card-generation-refresh]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        loadCardGenerationContext().catch((error) => {
          pageState.cardGeneration.status = "failed";
          pageState.cardGeneration.error = error.message || String(error);
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-card-generation-submit]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        generateCardFromUi().catch((error) => {
          pageState.cardGeneration.status = "failed";
          pageState.cardGeneration.error = error.message || String(error);
          renderShell();
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

  async function loadCardGenerationContext() {
    if (!pageState.auth.isOwner) return;
    clearCardGenerationProgressTimers();
    pageState.cardGeneration.status = "loading_context";
    pageState.cardGeneration.error = "";
    pageState.cardGeneration.progressStep = "";
    pageState.cardGeneration.progressMessage = "";
    renderShell();
    const context = await api.fetchCardGenerationContext(currentWorkspaceId);
    pageState.cardGeneration.context = context;
    pageState.cardGeneration.status = "ready";
    pageState.cardGeneration.error = "";
    pageState.cardGeneration.progressStep = "";
    pageState.cardGeneration.progressMessage = "";
    renderShell();
  }

  async function generateCardFromUi() {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createDailyEnglishGeneratePayload !== "function") {
      throw new Error("card_generation_ui_unavailable");
    }
    const context = pageState.cardGeneration.context;
    const payload = ui.createDailyEnglishGeneratePayload({ context, workspaceId: currentWorkspaceId });
    pageState.cardGeneration.status = "generating";
    pageState.cardGeneration.error = "";
    pageState.cardGeneration.generatedResult = null;
    pageState.cardGeneration.progressStep = "prepare";
    pageState.cardGeneration.progressMessage = "正在整理学习图谱、历史摘要和生成策略。";
    renderShell();
    scheduleCardGenerationProgress();
    try {
      const result = await api.generateGrowthCard(payload, currentWorkspaceId);
      clearCardGenerationProgressTimers();
      pageState.cardGeneration.status = "published";
      pageState.cardGeneration.generatedResult = result;
      pageState.cardGeneration.error = "";
      pageState.cardGeneration.progressStep = "done";
      pageState.cardGeneration.progressMessage = "卡片已发布。";
      model.detailCache.clear();
      try {
        await loadCurrentWorkspace();
      } catch (refreshError) {
        pageState.cardGeneration.error = `卡片已发布，但刷新列表失败：${refreshError.message || String(refreshError)}`;
      }
      renderShell();
    } catch (error) {
      clearCardGenerationProgressTimers();
      pageState.cardGeneration.status = "failed";
      pageState.cardGeneration.error = error.message || String(error);
      pageState.cardGeneration.progressStep = "failed";
      pageState.cardGeneration.progressMessage = "生成失败。";
      renderShell();
    }
  }

  async function switchWorkspace(nextWorkspaceId) {
    clearCardGenerationProgressTimers();
    currentWorkspaceId = clean(nextWorkspaceId);
    api.updateWorkspaceUrl();
    model.detailCache.clear();
    pageState.selectedLearningTaskCardId = "";
    pageState.learningGrowthHistoryTaskCardId = "";
    pageState.learningGrowthSettingsTaskId = "";
    model.viewTargets = model.viewTargets.map((target) => Object.assign({}, target, {
      current: clean(target.workspaceId) === clean(currentWorkspaceId),
    }));
    pageState.cardGeneration = {
      status: "idle",
      context: null,
      generatedResult: null,
      error: "",
      progressStep: "",
      progressMessage: ""
    };
    root.innerHTML = `<div class="learning-growth-view"><div class="learning-coin-empty">正在加载成长数据...</div></div>`;
    await loadCurrentWorkspace();
    renderShell();
  }

  async function load() {
    root.innerHTML = `<div class="learning-growth-view"><div class="learning-coin-empty">正在加载成长数据...</div></div>`;
    await loadViewTargets();
    await loadCurrentWorkspace();
    if (pageState.auth.isOwner) await loadCardGenerationContext();
    const renderedByRoute = await routeController.applyInitialPluginRoute();
    if (!renderedByRoute) renderShell();
  }

  try {
    await load();
  } catch (error) {
    root.innerHTML = `<div class="learning-growth-view"><div class="learning-error">${escapeHtml(error.message || String(error))}</div></div>`;
  }
})();
