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
    learningGrowthSubmissionBusy: {},
    learningGrowthReflectionBusy: {},
    learningGrowthEvaluationBusy: {},
    learningGrowthInteractionMessages: {},
    learningGrowthReflectionDrafts: {},
    learningGrowthRecordings: {},
    learningGrowthStageAssessmentActivating: {},
    cardGeneration: {
      status: "idle",
      selectedWorkspaceId: "",
      context: null,
      generatedResult: null,
      error: "",
      progressStep: "",
      progressMessage: "",
      stageAssessment: {
        status: "idle",
        eligibility: null,
        result: null,
        error: ""
      }
    },
  };
  const model = { status: null, board: null, overview: null, detailCache: new Map(), viewTargets: [], viewer: null };
  let cardGenerationProgressTimers = [];
  let growthNavigationController = null;
  const fanfanSampleWorkspaceIds = ["weixin_stephen", "weixin_fanfan"];

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

  function taskCardById(taskCardId) {
    const id = clean(taskCardId);
    if (!id) return null;
    const cards = []
      .concat(model.overview?.programs?.taskCards || [])
      .concat(model.overview?.programs?.executableTasks || [])
      .concat(model.overview?.board?.cards || []);
    return cards.find((card) => clean(card?.taskCardId || card?.id) === id) || null;
  }

  function workspaceIdForTaskCard(taskCardId, explicitWorkspaceId = "") {
    return clean(explicitWorkspaceId)
      || clean(taskCardById(taskCardId)?.workspaceId)
      || clean(pageState.cardGeneration.selectedWorkspaceId)
      || clean(pageState.cardGeneration.context?.target?.workspaceId)
      || clean(currentWorkspaceId);
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

  function isCardGenerationTarget(target = {}) {
    const ui = window.HermesGrowthCardGenerationUi;
    if (ui && typeof ui.isFanfanSampleTarget === "function") return ui.isFanfanSampleTarget(target);
    return false;
  }

  function preferredCardGenerationWorkspaceId() {
    const target = (model.viewTargets || []).find(isCardGenerationTarget);
    return clean(target?.workspaceId || fanfanSampleWorkspaceIds[0]);
  }

  function currentWorkspaceSupportsCardGeneration() {
    const target = targetForWorkspace(currentWorkspaceId);
    return Boolean(target && isCardGenerationTarget(target));
  }

  function cardGenerationWorkspaceId() {
    const selectedWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId);
    if (selectedWorkspaceId) return selectedWorkspaceId;
    const contextWorkspaceId = clean(pageState.cardGeneration.context?.target?.workspaceId);
    if (contextWorkspaceId) return contextWorkspaceId;
    if (pageState.auth.isOwner && !currentWorkspaceSupportsCardGeneration()) return preferredCardGenerationWorkspaceId();
    return clean(currentWorkspaceId);
  }

  function cardGenerationTargetForWorkspace(workspaceId = cardGenerationWorkspaceId()) {
    return (model.viewTargets || []).find((target) => clean(target.workspaceId) === clean(workspaceId)) || null;
  }

  function selectedWorkspaceSupportsCardGeneration() {
    const workspaceId = cardGenerationWorkspaceId();
    const contextTarget = pageState.cardGeneration.context?.target || null;
    const target = cardGenerationTargetForWorkspace(workspaceId)
      || (clean(contextTarget?.workspaceId) === workspaceId ? contextTarget : null)
      || { workspaceId };
    return Boolean(target && isCardGenerationTarget(target));
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
      resolveGrowthAudioUrl: (url, workspaceId) => api.resolveGrowthApiPath(url, workspaceId || currentWorkspaceId),
      escapeHtml,
    });
    bindEvents();
    growthNavigationController?.emitNavigation("render");
  }

  async function ensureCardGenerationTargetSelected() {
    if (!pageState.auth.isOwner || currentWorkspaceSupportsCardGeneration() || selectedWorkspaceSupportsCardGeneration()) return false;
    const preferredWorkspaceId = preferredCardGenerationWorkspaceId();
    if (!preferredWorkspaceId || preferredWorkspaceId === currentWorkspaceId) return false;
    pageState.cardGeneration.selectedWorkspaceId = preferredWorkspaceId;
    return true;
  }

  async function openLearningGrowthTab(tabId) {
    pageState.learningGrowthActiveTab = clean(tabId) || "overview";
    if (pageState.learningGrowthActiveTab === "generation" && pageState.auth.isOwner) {
      await ensureCardGenerationTargetSelected();
      await loadCardGenerationContext();
      return;
    }
    renderShell();
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

  async function openCard(taskCardId, workspaceId = "", options = {}) {
    const id = clean(taskCardId);
    if (!id) return;
    const targetWorkspaceId = workspaceIdForTaskCard(id, workspaceId);
    const previousCardId = clean(pageState.selectedLearningTaskCardId);
    pageState.learningGrowthSettingsOpen = false;
    pageState.learningGrowthHistoryTaskCardId = "";
    pageState.selectedLearningTaskCardId = id;
    const cacheKey = `${targetWorkspaceId}:${id}`;
    if (!model.detailCache.has(cacheKey)) {
      const result = await api.fetchGrowthCard(id, targetWorkspaceId);
      if (result.card) model.detailCache.set(cacheKey, viewModel.normalizeCard(result.card));
    }
    const detail = model.detailCache.get(cacheKey);
    if (detail && model.overview?.programs && model.overview?.board) {
      const cards = model.overview?.programs?.taskCards || [];
      const index = cards.findIndex((card) => clean(card.taskCardId) === id);
      if (index >= 0) cards[index] = Object.assign({}, cards[index], detail);
      else cards.unshift(detail);
      model.overview.programs.executableTasks = cards;
      model.overview.board.cards = model.overview.board.cards.map((card) => clean(card.taskCardId) === id ? Object.assign({}, card, detail) : card);
    }
    const historyMode = clean(options.historyMode || (previousCardId === id ? "replace" : "push"));
    if (historyMode === "replace") growthNavigationController?.replaceHistory("card_detail");
    else if (historyMode === "push") growthNavigationController?.pushHistory("card_detail");
    renderShell();
  }

  async function refreshCard(taskCardId, workspaceId = "") {
    const id = clean(taskCardId);
    if (!id) return;
    const targetWorkspaceId = workspaceIdForTaskCard(id, workspaceId);
    model.detailCache.delete(`${targetWorkspaceId}:${id}`);
    await openCard(id, targetWorkspaceId, { historyMode: "replace" });
  }

  growthNavigationController = window.HermesGrowthNavigation.createGrowthNavigationController({
    pageState,
    renderShell,
    historyRef: window.history,
    locationRef: window.location,
    parentRef: window.parent,
    windowRef: window
  });
  growthNavigationController.bind();

  const routeController = window.HermesGrowthRouteController.createGrowthRouteController({
    pluginRoute,
    pluginItemId,
    pageState,
    model,
    openCard
  });

  const cardInteractionController = window.HermesGrowthCardInteractionController.createGrowthCardInteractionController({
    api,
    pageState,
    model,
    viewModel,
    renderShell,
    refreshCard,
    getCurrentWorkspaceId: () => currentWorkspaceId
  });

  function bindEvents() {
    root.querySelectorAll("[data-learning-growth-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        openLearningGrowthTab(button.dataset.learningGrowthTab).catch((error) => {
          pageState.cardGeneration.status = "failed";
          pageState.cardGeneration.error = error.message || String(error);
          renderShell();
        });
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
        openCard(id, node.dataset.workspaceId).catch((error) => {
          root.insertAdjacentHTML("afterbegin", `<div class="learning-error">${escapeHtml(error.message || String(error))}</div>`);
        });
      });
    });
    root.querySelectorAll("[data-learning-growth-teaching-step]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const cardId = clean(button.dataset.learningGrowthTeachingStep);
        if (!cardId) return;
        pageState.learningGrowthTeachingStepByCardId[cardId] = clean(button.dataset.step) || "lesson";
        renderShell();
      });
    });
    root.querySelectorAll("[data-learning-growth-teaching-draft]").forEach((field) => {
      field.addEventListener("input", () => {
        const cardId = clean(field.dataset.learningGrowthTeachingDraft);
        const key = clean(field.dataset.field);
        if (!cardId || !key) return;
        pageState.learningGrowthTeachingDrafts[cardId] = Object.assign({}, pageState.learningGrowthTeachingDrafts[cardId] || {}, {
          [key]: field.value
        });
      });
    });
    root.querySelectorAll("[data-learning-growth-reflection-text]").forEach((field) => {
      field.addEventListener("input", () => {
        const cardId = clean(field.dataset.learningGrowthReflectionText);
        if (!cardId) return;
        pageState.learningGrowthReflectionDrafts[cardId] = Object.assign({}, pageState.learningGrowthReflectionDrafts[cardId] || {}, {
          text: field.value
        });
      });
    });
    root.querySelectorAll("[data-learning-growth-record-toggle]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        cardInteractionController.toggleRecording(button.dataset.learningGrowthRecordToggle, button.dataset.recordKind || "submission");
      });
    });
    root.querySelectorAll("[data-learning-growth-record-clear]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        cardInteractionController.clearRecording(button.dataset.learningGrowthRecordClear, button.dataset.recordKind || "submission");
        renderShell();
      });
    });
    root.querySelectorAll("[data-learning-growth-record-playback]").forEach((audio) => {
      audio.addEventListener("error", () => {
        cardInteractionController.handleRecordingPlaybackError(audio.dataset.learningGrowthRecordPlayback, audio.dataset.recordKind || "submission");
      });
    });
    root.querySelectorAll("[data-learning-growth-saved-audio]").forEach((audio) => {
      audio.addEventListener("error", () => {
        const holder = audio.closest("[data-learning-growth-audio-evidence]");
        const message = holder?.querySelector("[data-learning-growth-audio-error]");
        if (message) message.hidden = false;
      });
    });
    root.querySelectorAll("[data-learning-growth-submission-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        cardInteractionController.submitEvidence(form).catch((error) => {
          cardInteractionController.setMessage(form.dataset.learningGrowthSubmissionForm, "submission", error.message || String(error));
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-learning-growth-evaluation-refresh]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const cardId = clean(button.dataset.learningGrowthEvaluationRefresh);
        cardInteractionController.refreshEvaluation(cardId)
          .catch((error) => {
            cardInteractionController.setMessage(cardId, "evaluation", error.message || String(error));
            renderShell();
          });
      });
    });
    root.querySelectorAll("[data-learning-growth-evaluation-retry]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const cardId = clean(button.dataset.learningGrowthEvaluationRetry);
        cardInteractionController.retryEvaluation(cardId, button.dataset.workspaceId)
          .catch((error) => {
            cardInteractionController.setMessage(cardId, "evaluation", error.message || String(error));
            renderShell();
          });
      });
    });
    root.querySelectorAll("[data-learning-growth-reflection-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        cardInteractionController.submitReflection(form).catch((error) => {
          cardInteractionController.setMessage(form.dataset.learningGrowthReflectionForm, "reflection", error.message || String(error));
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-learning-growth-experience-signal]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        cardInteractionController.submitExperienceSignal({
          taskCardId: button.dataset.learningGrowthExperienceSignal,
          signalType: button.dataset.signalType,
          workspaceId: button.dataset.workspaceId,
          targetNodeIds: clean(button.dataset.targetNodeIds).split(/\s+/).filter(Boolean)
        }).catch((error) => {
          cardInteractionController.setMessage(button.dataset.learningGrowthExperienceSignal, "experience", error.message || String(error));
          renderShell();
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
        growthNavigationController?.pushHistory("owner_settings");
        renderShell();
      });
    });
    root.querySelectorAll("[data-learning-growth-close-settings]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        pageState.learningGrowthSettingsOpen = false;
        pageState.learningGrowthSettingsTaskId = "";
        growthNavigationController?.replaceHistory("owner_settings_close");
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
        if (!nextWorkspaceId || button.disabled) return;
        loadCardGenerationContext(nextWorkspaceId).catch((error) => {
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
        const blockedReason = clean(button.dataset.cardGenerationBlockedReason);
        if (blockedReason) {
          clearCardGenerationProgressTimers();
          pageState.cardGeneration.status = pageState.cardGeneration.context ? "ready" : "idle";
          pageState.cardGeneration.error = blockedReason;
          pageState.cardGeneration.progressStep = "";
          pageState.cardGeneration.progressMessage = "";
          renderShell();
          return;
        }
        if (button.disabled) return;
        generateCardFromUi().catch((error) => {
          pageState.cardGeneration.status = "failed";
          pageState.cardGeneration.error = error.message || String(error);
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-stage-assessment-check]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        checkStageAssessmentEligibility().catch((error) => {
          pageState.cardGeneration.stageAssessment = Object.assign({}, pageState.cardGeneration.stageAssessment, {
            status: "failed",
            error: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-stage-assessment-activate]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        activateStageAssessmentFromUi().catch((error) => {
          clearCardGenerationProgressTimers();
          pageState.cardGeneration.status = "failed";
          pageState.cardGeneration.error = error.message || String(error);
          pageState.cardGeneration.progressStep = "failed";
          pageState.cardGeneration.progressMessage = "阶段测评生成失败。";
          pageState.cardGeneration.stageAssessment = Object.assign({}, pageState.cardGeneration.stageAssessment, {
            status: "failed",
            error: error.message || String(error)
          });
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

  async function loadCardGenerationContext(targetWorkspaceId = cardGenerationWorkspaceId()) {
    if (!pageState.auth.isOwner) return;
    const requestedTargetWorkspaceId = clean(targetWorkspaceId || currentWorkspaceId);
    clearCardGenerationProgressTimers();
    pageState.cardGeneration.selectedWorkspaceId = requestedTargetWorkspaceId;
    pageState.cardGeneration.status = "loading_context";
    pageState.cardGeneration.error = "";
    pageState.cardGeneration.progressStep = "";
    pageState.cardGeneration.progressMessage = "";
    renderShell();
    const context = await api.fetchCardGenerationContext(requestedTargetWorkspaceId);
    pageState.cardGeneration.context = context;
    pageState.cardGeneration.selectedWorkspaceId = clean(context?.target?.workspaceId || requestedTargetWorkspaceId);
    pageState.cardGeneration.status = "ready";
    pageState.cardGeneration.error = "";
    pageState.cardGeneration.progressStep = "";
    pageState.cardGeneration.progressMessage = "";
    pageState.cardGeneration.stageAssessment = {
      status: "idle",
      eligibility: null,
      result: null,
      error: ""
    };
    renderShell();
  }

  async function refreshCardGenerationContextAfterPublish(targetWorkspaceId = cardGenerationWorkspaceId()) {
    if (!pageState.auth.isOwner) return null;
    const requestedTargetWorkspaceId = clean(targetWorkspaceId || currentWorkspaceId);
    try {
      const context = await api.fetchCardGenerationContext(requestedTargetWorkspaceId);
      pageState.cardGeneration.context = context;
      pageState.cardGeneration.selectedWorkspaceId = clean(context?.target?.workspaceId || requestedTargetWorkspaceId);
      return context;
    } catch (refreshError) {
      const message = refreshError.message || String(refreshError);
      const prefix = pageState.cardGeneration.error ? `${pageState.cardGeneration.error}；` : "卡片已发布，但";
      pageState.cardGeneration.error = `${prefix}生成上下文刷新失败：${message}`;
      return null;
    }
  }

  function createStageAssessmentPayload(activationSource = "owner_manual") {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createStageAssessmentPayload !== "function") {
      throw new Error("stage_assessment_ui_unavailable");
    }
    const context = pageState.cardGeneration.context;
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createStageAssessmentPayload({ context, workspaceId: targetWorkspaceId, activationSource }),
      targetWorkspaceId
    };
  }

  async function checkStageAssessmentEligibility() {
    const { payload, targetWorkspaceId } = createStageAssessmentPayload("system");
    pageState.cardGeneration.stageAssessment = {
      status: "checking",
      eligibility: pageState.cardGeneration.stageAssessment?.eligibility || null,
      result: pageState.cardGeneration.stageAssessment?.result || null,
      error: ""
    };
    renderShell();
    const result = await api.evaluateGrowthStageAssessment(payload, targetWorkspaceId);
    pageState.cardGeneration.stageAssessment = {
      status: result.activationState || result.cycle?.status || (result.eligible ? "eligible" : "dormant"),
      eligibility: result,
      result: pageState.cardGeneration.stageAssessment?.result || null,
      error: ""
    };
    renderShell();
  }

  async function generateCardFromUi() {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createDailyEnglishGeneratePayload !== "function") {
      throw new Error("card_generation_ui_unavailable");
    }
    const context = pageState.cardGeneration.context;
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    const payload = ui.createDailyEnglishGeneratePayload({ context, workspaceId: targetWorkspaceId });
    pageState.cardGeneration.status = "generating";
    pageState.cardGeneration.error = "";
    pageState.cardGeneration.generatedResult = null;
    pageState.cardGeneration.progressStep = "prepare";
    pageState.cardGeneration.progressMessage = "正在整理学习图谱、历史摘要和生成策略。";
    renderShell();
    scheduleCardGenerationProgress();
    try {
      const result = await api.generateGrowthCard(payload, targetWorkspaceId);
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
      await refreshCardGenerationContextAfterPublish(targetWorkspaceId);
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

  async function activateStageAssessmentFromUi() {
    const { payload, targetWorkspaceId } = createStageAssessmentPayload("owner_manual");
    pageState.cardGeneration.status = "generating";
    pageState.cardGeneration.error = "";
    pageState.cardGeneration.generatedResult = null;
    pageState.cardGeneration.progressStep = "prepare";
    pageState.cardGeneration.progressMessage = "正在整理阶段测评覆盖点和学习画像。";
    pageState.cardGeneration.stageAssessment = Object.assign({}, pageState.cardGeneration.stageAssessment, {
      status: "activating",
      error: ""
    });
    renderShell();
    scheduleCardGenerationProgress();
    try {
      const result = await api.activateGrowthStageAssessment(payload, targetWorkspaceId);
      clearCardGenerationProgressTimers();
      pageState.cardGeneration.status = "published";
      pageState.cardGeneration.generatedResult = result.generation || result;
      pageState.cardGeneration.error = "";
      pageState.cardGeneration.progressStep = "done";
      pageState.cardGeneration.progressMessage = "阶段测评已发布。";
      pageState.cardGeneration.stageAssessment = {
        status: result.activationState || result.cycle?.status || "active",
        eligibility: pageState.cardGeneration.stageAssessment?.eligibility || null,
        result,
        error: ""
      };
      model.detailCache.clear();
      try {
        await loadCurrentWorkspace();
      } catch (refreshError) {
        pageState.cardGeneration.error = `阶段测评已发布，但刷新列表失败：${refreshError.message || String(refreshError)}`;
      }
      await refreshCardGenerationContextAfterPublish(targetWorkspaceId);
      renderShell();
    } catch (error) {
      clearCardGenerationProgressTimers();
      pageState.cardGeneration.status = "failed";
      pageState.cardGeneration.error = error.message || String(error);
      pageState.cardGeneration.progressStep = "failed";
      pageState.cardGeneration.progressMessage = "阶段测评生成失败。";
      pageState.cardGeneration.stageAssessment = Object.assign({}, pageState.cardGeneration.stageAssessment, {
        status: "failed",
        error: error.message || String(error)
      });
      renderShell();
    }
  }

  async function switchWorkspace(nextWorkspaceId) {
    clearCardGenerationProgressTimers();
    cardInteractionController.clearAllRecordings();
    currentWorkspaceId = clean(nextWorkspaceId);
    api.updateWorkspaceUrl();
    model.detailCache.clear();
    pageState.selectedLearningTaskCardId = "";
    pageState.learningGrowthHistoryTaskCardId = "";
    pageState.learningGrowthSettingsTaskId = "";
    growthNavigationController?.replaceHistory("workspace_switch");
    model.viewTargets = model.viewTargets.map((target) => Object.assign({}, target, {
      current: clean(target.workspaceId) === clean(currentWorkspaceId),
    }));
    pageState.cardGeneration = {
      status: "idle",
      selectedWorkspaceId: "",
      context: null,
      generatedResult: null,
      error: "",
      progressStep: "",
      progressMessage: "",
      stageAssessment: {
        status: "idle",
        eligibility: null,
        result: null,
        error: ""
      }
    };
    root.innerHTML = `<div class="learning-growth-view"><div class="learning-coin-empty">正在加载成长数据...</div></div>`;
    await loadCurrentWorkspace();
    renderShell();
  }

  async function load() {
    root.innerHTML = `<div class="learning-growth-view"><div class="learning-coin-empty">正在加载成长数据...</div></div>`;
    await loadViewTargets();
    await loadCurrentWorkspace();
    growthNavigationController.replaceHistory("workspace_loaded");
    const renderedByRoute = await routeController.applyInitialPluginRoute();
    if (pageState.auth.isOwner && pageState.learningGrowthSettingsOpen && pageState.learningGrowthActiveTab === "generation") {
      await ensureCardGenerationTargetSelected();
      await loadCardGenerationContext();
      return;
    }
    if (!renderedByRoute) renderShell();
  }

  try {
    await load();
  } catch (error) {
    root.innerHTML = `<div class="learning-growth-view"><div class="learning-error">${escapeHtml(error.message || String(error))}</div></div>`;
  }
})();
