(async function bootGrowthPlugin() {
  const root = document.getElementById("growth-root") || document.querySelector(".growth-shell");
  const params = new URLSearchParams(window.location.search);
  let currentWorkspaceId = params.get("workspaceId") || params.get("workspace_id") || "";
  const pluginRoute = (params.get("pluginRoute") || params.get("route") || params.get("pluginActionId") || "").trim().toLowerCase();
  const pluginItemId = (params.get("pluginItemId") || params.get("itemId") || params.get("taskCardId") || "").trim();

  function initialCardGenerationState() {
    return {
      status: "idle",
      selectedWorkspaceId: "",
      context: null,
      learningLoopState: {
        status: "idle",
        data: null,
        error: ""
      },
      operatingLoop: {
        status: "idle",
        data: null,
        error: "",
        actionStatus: "idle",
        actionResult: null,
        actionError: ""
      },
      releaseWorkbench: {
        status: "idle",
        data: null,
        error: "",
        actionStatus: "idle",
        actionResult: null,
        actionError: "",
        packageStatus: "idle",
        packageResult: null,
        packageCandidate: null,
        packageError: ""
      },
      releaseArtifactTemplate: {
        status: "idle",
        data: null,
        error: ""
      },
      releaseWorkbenchActionAudits: {
        status: "idle",
        data: null,
        error: ""
      },
      automationProposals: {
        status: "idle",
        data: null,
        error: "",
        actionStatus: "idle",
        actionResult: null,
        actionError: ""
      },
      automationDigests: {
        status: "idle",
        data: null,
        error: "",
        actionStatus: "idle",
        actionResult: null,
        actionError: ""
      },
      automationFailurePolicies: {
        status: "idle",
        data: null,
        error: "",
        actionStatus: "idle",
        actionResult: null,
        actionError: ""
      },
      automationActionHandoffs: {
        status: "idle",
        data: null,
        error: "",
        actionStatus: "idle",
        actionResult: null,
        actionError: ""
      },
      automationSchedulerExecutions: {
        status: "idle",
        data: null,
        error: "",
        actionStatus: "idle",
        actionResult: null,
        actionError: ""
      },
      automationSchedulerRuns: {
        status: "idle",
        data: null,
        error: "",
        actionStatus: "idle",
        actionResult: null,
        actionError: ""
      },
      automationSchedulerWorkerTargets: {
        status: "idle",
        data: null,
        error: "",
        actionStatus: "idle",
        actionResult: null,
        actionError: ""
      },
      recommendationLifecycle: {
        actionStatus: "idle",
        actionResult: null,
        actionError: ""
      },
      targetProvisionDraft: {
        domainPackId: "",
        domain: "",
        subject: "",
        recipeId: "",
        status: "idle",
        result: null,
        error: ""
      },
      dailyLoopDraftResult: null,
      dailyLoopPublishResult: null,
      generatedResult: null,
      ownerCorrectionDraft: "",
      ownerCorrectionAction: "confirm_profile_delta",
      ownerCorrection: {
        status: "idle",
        result: null,
        error: ""
      },
      ownerAuditReviewDraft: "",
      ownerAuditReviews: {
        status: "idle",
        data: null,
        error: "",
        actionStatus: "idle",
        actionResult: null,
        actionError: ""
      },
      cycleDrilldown: {
        status: "idle",
        audit: null,
        completeness: null,
        error: ""
      },
      cycleHistory: {
        status: "idle",
        data: null,
        selectedCycleKey: "",
        selectedCycle: null,
        error: ""
      },
      referenceChain: {
        status: "idle",
        objectTypes: null,
        requests: [],
        summaries: [],
        error: ""
      },
      error: "",
      progressStep: "",
      progressMessage: "",
      stageAssessment: {
        status: "idle",
        eligibility: null,
        result: null,
        controls: null,
        controlsStatus: "idle",
        controlsError: "",
        error: ""
      }
    };
  }

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
    cardGeneration: initialCardGenerationState(),
  };
  const model = { status: null, board: null, overview: null, detailCache: new Map(), viewTargets: [], viewer: null };
  let cardGenerationProgressTimers = [];
  let growthNavigationController = null;
  const fanfanSampleWorkspaceIds = ["weixin_stephen", "weixin_fanfan"];

  function clean(value) {
    return String(value ?? "").trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
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
    if (target?.enabled === true || target?.targetEnabled === true) return true;
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
    if (clean(contextTarget?.workspaceId) === workspaceId && contextTarget?.enabled === true) return true;
    const target = cardGenerationTargetForWorkspace(workspaceId)
      || (clean(contextTarget?.workspaceId) === workspaceId ? contextTarget : null)
      || { workspaceId };
    return Boolean(target && isCardGenerationTarget(target));
  }

  function selectionFromContext(context = {}, draft = {}) {
    const provisioning = context.targetProvisioning || {};
    const graphOptions = provisioning.graphOptions || context.graphOptions || {};
    const selectedPackId = clean(draft.domainPackId || draft.domain_pack_id || provisioning.selectedDomainPackId || graphOptions.selectedDomainPackId || context.domainPackId);
    const packs = Array.isArray(graphOptions.domainPacks) ? graphOptions.domainPacks : [];
    const pack = packs.find((item) => clean(item.domainPackId || item.domain_pack_id) === selectedPackId) || packs[0] || {};
    const subjects = Array.isArray(pack.subjects) && pack.subjects.length
      ? pack.subjects
      : Array.isArray(graphOptions.subjects) ? graphOptions.subjects : [];
    return {
      domainPackId: selectedPackId || clean(pack.domainPackId || pack.domain_pack_id),
      domain: clean(draft.domain || provisioning.selectedDomain || graphOptions.selectedDomain || pack.domain || context.domain),
      subject: clean(draft.subject || provisioning.selectedSubject || graphOptions.selectedSubject || subjects[0] || context.subject),
      recipeId: clean(draft.recipeId || draft.recipe_id || context.selectedRecipeId),
      status: clean(draft.status || "idle"),
      result: draft.result || null,
      error: clean(draft.error)
    };
  }

  function targetProvisionSelection() {
    return selectionFromContext(
      pageState.cardGeneration.context || {},
      pageState.cardGeneration.targetProvisionDraft || {}
    );
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
    if (!["generating", "drafting", "publishing", "advancing"].includes(pageState.cardGeneration.status)) return;
    pageState.cardGeneration.progressStep = progressStep;
    pageState.cardGeneration.progressMessage = progressMessage;
    renderShell();
  }

  function scheduleCardGenerationProgress(mode = "publish") {
    clearCardGenerationProgressTimers();
    const steps = mode === "advance"
      ? [
        [700, "planner", "正在通过 Gateway 起草下一张 plan draft。"],
        [2600, "validation", "正在校验计划项、图谱绑定和证据要求。"],
        [4800, "authoring", "正在通过 Gateway 生成 authoring draft。"],
        [8200, "publish", "正在等待发布结果，成功后会写入 Growth SQLite。"]
      ]
      : mode === "draft"
      ? [
        [700, "planner", "正在通过 Gateway 起草下一张 plan draft。"],
        [2600, "validation", "正在校验计划项、图谱绑定和证据要求。"]
      ]
      : [
        [700, "authoring", "正在通过 Gateway 生成 authoring draft。"],
        [3200, "validation", "正在校验 teachingFlow、图谱绑定和隐私边界。"],
        [7600, "publish", "正在等待发布结果，成功后会写入 Growth SQLite。"]
      ];
    steps.forEach(([delayMs, progressStep, progressMessage]) => {
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
        if (!nextWorkspaceId) return;
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
    root.querySelectorAll("[data-card-generation-recipe]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const recipeId = clean(button.dataset.cardGenerationRecipe);
        if (!recipeId) return;
        const context = pageState.cardGeneration.context || {};
        const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context.target?.workspaceId || currentWorkspaceId);
        pageState.cardGeneration.targetProvisionDraft = Object.assign({}, pageState.cardGeneration.targetProvisionDraft, {
          domainPackId: "",
          domain: "",
          subject: "",
          recipeId,
          status: "loading",
          error: ""
        });
        loadCardGenerationContext(targetWorkspaceId, {
          resetGraphSelection: true,
          selection: { recipeId }
        }).catch((error) => {
          pageState.cardGeneration.targetProvisionDraft = Object.assign({}, pageState.cardGeneration.targetProvisionDraft, {
            status: "failed",
            error: error.message || String(error)
          });
          pageState.cardGeneration.error = error.message || String(error);
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-card-generation-domain-pack]").forEach((select) => {
      select.addEventListener("change", () => {
        const selectedDomainPackId = clean(select.value);
        const context = pageState.cardGeneration.context || {};
        const graphOptions = context.targetProvisioning?.graphOptions || context.graphOptions || {};
        const packs = Array.isArray(graphOptions.domainPacks) ? graphOptions.domainPacks : [];
        const pack = packs.find((item) => clean(item.domainPackId || item.domain_pack_id) === selectedDomainPackId) || {};
        const subjects = Array.isArray(pack.subjects) ? pack.subjects.map(clean).filter(Boolean) : [];
        pageState.cardGeneration.targetProvisionDraft = Object.assign({}, pageState.cardGeneration.targetProvisionDraft, {
          domainPackId: selectedDomainPackId,
          domain: clean(pack.domain || pageState.cardGeneration.targetProvisionDraft?.domain),
          subject: subjects[0] || clean(pageState.cardGeneration.targetProvisionDraft?.subject),
          status: "idle",
          error: ""
        });
        renderShell();
      });
    });
    root.querySelectorAll("[data-card-generation-subject]").forEach((select) => {
      select.addEventListener("change", () => {
        pageState.cardGeneration.targetProvisionDraft = Object.assign({}, pageState.cardGeneration.targetProvisionDraft, {
          subject: clean(select.value),
          status: "idle",
          error: ""
        });
        renderShell();
      });
    });
    root.querySelectorAll("[data-card-generation-apply-target]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        const context = pageState.cardGeneration.context || {};
        const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context.target?.workspaceId || currentWorkspaceId);
        loadCardGenerationContext(targetWorkspaceId, {
          selection: targetProvisionSelection()
        }).catch((error) => {
          pageState.cardGeneration.targetProvisionDraft = Object.assign({}, pageState.cardGeneration.targetProvisionDraft, {
            status: "failed",
            error: error.message || String(error)
          });
          pageState.cardGeneration.error = error.message || String(error);
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-card-generation-provision-target]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        provisionTargetDomainPackFromUi().catch((error) => {
          pageState.cardGeneration.targetProvisionDraft = Object.assign({}, pageState.cardGeneration.targetProvisionDraft, {
            status: "failed",
            error: error.message || String(error)
          });
          pageState.cardGeneration.error = error.message || String(error);
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-card-generation-advance], [data-card-generation-draft], [data-card-generation-publish]").forEach((button) => {
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
        const action = button.hasAttribute("data-card-generation-advance")
          ? advanceDailyLoopFromUi
          : button.hasAttribute("data-card-generation-publish")
            ? publishDailyLoopFromUi
            : draftDailyLoopFromUi;
        action().catch((error) => {
          pageState.cardGeneration.status = "failed";
          pageState.cardGeneration.error = error.message || String(error);
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-card-generation-correction-note]").forEach((textarea) => {
      textarea.addEventListener("input", () => {
        pageState.cardGeneration.ownerCorrectionDraft = textarea.value || "";
      });
    });
    root.querySelectorAll("[data-owner-audit-review-note]").forEach((textarea) => {
      textarea.addEventListener("input", () => {
        pageState.cardGeneration.ownerAuditReviewDraft = textarea.value || "";
      });
    });
    root.querySelectorAll("[data-owner-audit-review-refresh]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        refreshOwnerAuditReviews().catch((error) => {
          pageState.cardGeneration.ownerAuditReviews = Object.assign({}, pageState.cardGeneration.ownerAuditReviews || {}, {
            status: "failed",
            error: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-owner-audit-review-decision]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const blockedReason = clean(button.dataset.ownerAuditReviewBlockedReason);
        if (blockedReason) {
          pageState.cardGeneration.ownerAuditReviews = Object.assign({}, pageState.cardGeneration.ownerAuditReviews || {}, {
            actionStatus: "blocked",
            actionError: blockedReason
          });
          renderShell();
          return;
        }
        if (button.disabled) return;
        recordOwnerAuditReviewFromUi(button.dataset.ownerAuditReviewDecision).catch((error) => {
          pageState.cardGeneration.ownerAuditReviews = Object.assign({}, pageState.cardGeneration.ownerAuditReviews || {}, {
            actionStatus: "failed",
            actionError: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-card-generation-cycle-audit-refresh]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const blockedReason = clean(button.dataset.cardGenerationBlockedReason);
        if (blockedReason) {
          pageState.cardGeneration.cycleDrilldown = {
            status: "failed",
            audit: pageState.cardGeneration.cycleDrilldown?.audit || null,
            completeness: pageState.cardGeneration.cycleDrilldown?.completeness || null,
            error: blockedReason
          };
          renderShell();
          return;
        }
        if (button.disabled) return;
        refreshOwnerCycleDrilldownFromUi().catch((error) => {
          pageState.cardGeneration.cycleDrilldown = {
            status: "failed",
            audit: pageState.cardGeneration.cycleDrilldown?.audit || null,
            completeness: pageState.cardGeneration.cycleDrilldown?.completeness || null,
            error: error.message || String(error)
          };
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-card-generation-cycle-history-refresh]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        refreshCycleHistoryFromUi().catch((error) => {
          pageState.cardGeneration.cycleHistory = Object.assign({}, pageState.cardGeneration.cycleHistory || {}, {
            status: "failed",
            error: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-card-generation-cycle-history-select]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const selected = selectCycleHistoryItem(button.dataset.cycleHistoryKey);
        if (!selected) {
          pageState.cardGeneration.cycleDrilldown = Object.assign({}, pageState.cardGeneration.cycleDrilldown || {}, {
            status: "failed",
            error: pageState.cardGeneration.cycleHistory?.error || "未找到可选择的历史周期。"
          });
          renderShell();
          return;
        }
        refreshOwnerCycleDrilldownFromUi().catch((error) => {
          pageState.cardGeneration.cycleDrilldown = {
            status: "failed",
            audit: pageState.cardGeneration.cycleDrilldown?.audit || null,
            completeness: pageState.cardGeneration.cycleDrilldown?.completeness || null,
            error: error.message || String(error)
          };
          renderShell();
        });
        refreshReferenceChain(cardGenerationWorkspaceId(), pageState.cardGeneration.context).then(() => {
          renderShell();
        }).catch(() => null);
        refreshOwnerAuditReviews(cardGenerationWorkspaceId(), pageState.cardGeneration.context, { silent: true }).then(() => {
          renderShell();
        }).catch(() => null);
      });
    });
    root.querySelectorAll("[data-reference-chain-refresh]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        refreshReferenceChain(cardGenerationWorkspaceId(), pageState.cardGeneration.context).then(() => {
          renderShell();
        }).catch((error) => {
          pageState.cardGeneration.referenceChain = Object.assign({}, pageState.cardGeneration.referenceChain || {}, {
            status: "failed",
            error: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-operating-loop-refresh]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        refreshOperatingLoopRuns().catch((error) => {
          pageState.cardGeneration.operatingLoop = Object.assign({}, pageState.cardGeneration.operatingLoop || {}, {
            status: "failed",
            error: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-operating-loop-run-next]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const blockedReason = clean(button.dataset.operatingLoopBlockedReason);
        if (blockedReason) {
          pageState.cardGeneration.operatingLoop = Object.assign({}, pageState.cardGeneration.operatingLoop || {}, {
            actionStatus: "blocked",
            actionError: blockedReason
          });
          renderShell();
          return;
        }
        if (button.disabled) return;
        advanceOperatingLoopFromUi().catch((error) => {
          clearCardGenerationProgressTimers();
          pageState.cardGeneration.status = "failed";
          pageState.cardGeneration.error = error.message || String(error);
          pageState.cardGeneration.progressStep = "failed";
          pageState.cardGeneration.progressMessage = "闭环执行失败。";
          pageState.cardGeneration.operatingLoop = Object.assign({}, pageState.cardGeneration.operatingLoop || {}, {
            actionStatus: "failed",
            actionError: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-card-generation-correction-action]").forEach((select) => {
      select.addEventListener("change", () => {
        pageState.cardGeneration.ownerCorrectionAction = clean(select.value) || "confirm_profile_delta";
      });
    });
    root.querySelectorAll("[data-card-generation-correction-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        submitOwnerCorrectionFromUi().catch((error) => {
          pageState.cardGeneration.ownerCorrection = {
            status: "failed",
            result: pageState.cardGeneration.ownerCorrection?.result || null,
            error: error.message || String(error)
          };
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-release-workbench-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled && !button.dataset.releaseWorkbenchBlockedReason) return;
        recordReleaseWorkbenchActionFromUi(button).catch((error) => {
          pageState.cardGeneration.releaseWorkbench = Object.assign({}, pageState.cardGeneration.releaseWorkbench, {
            actionStatus: "failed",
            actionError: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-release-package-build]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        buildReleasePackageFromUi(button).catch((error) => {
          pageState.cardGeneration.releaseWorkbench = Object.assign({}, pageState.cardGeneration.releaseWorkbench, {
            packageStatus: "failed",
            packageError: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-release-artifact-template-refresh]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        refreshReleaseArtifactTemplate().catch((error) => {
          pageState.cardGeneration.releaseArtifactTemplate = Object.assign({}, pageState.cardGeneration.releaseArtifactTemplate, {
            status: "failed",
            error: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-release-workbench-action-audits-refresh]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        refreshReleaseWorkbenchActionAudits().catch((error) => {
          pageState.cardGeneration.releaseWorkbenchActionAudits = Object.assign({}, pageState.cardGeneration.releaseWorkbenchActionAudits, {
            status: "failed",
            error: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-automation-proposal-refresh]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        refreshAutomationProposals().catch((error) => {
          pageState.cardGeneration.automationProposals = Object.assign({}, pageState.cardGeneration.automationProposals, {
            status: "failed",
            error: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-automation-proposal-create]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const blockedReason = clean(button.dataset.automationProposalBlockedReason);
        if (blockedReason) {
          pageState.cardGeneration.automationProposals = Object.assign({}, pageState.cardGeneration.automationProposals, {
            actionStatus: "blocked",
            actionError: blockedReason
          });
          renderShell();
          return;
        }
        if (button.disabled) return;
        createAutomationProposalFromUi().catch((error) => {
          pageState.cardGeneration.automationProposals = Object.assign({}, pageState.cardGeneration.automationProposals, {
            actionStatus: "failed",
            actionError: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-automation-proposal-review]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const blockedReason = clean(button.dataset.automationProposalBlockedReason);
        if (blockedReason) {
          pageState.cardGeneration.automationProposals = Object.assign({}, pageState.cardGeneration.automationProposals, {
            actionStatus: "blocked",
            actionError: blockedReason
          });
          renderShell();
          return;
        }
        if (button.disabled) return;
        reviewAutomationProposalFromUi(button).catch((error) => {
          pageState.cardGeneration.automationProposals = Object.assign({}, pageState.cardGeneration.automationProposals, {
            actionStatus: "failed",
            actionError: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-automation-proposal-publish]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const blockedReason = clean(button.dataset.automationProposalBlockedReason);
        if (blockedReason) {
          pageState.cardGeneration.automationProposals = Object.assign({}, pageState.cardGeneration.automationProposals, {
            actionStatus: "blocked",
            actionError: blockedReason
          });
          renderShell();
          return;
        }
        if (button.disabled) return;
        publishAutomationProposalFromUi(button).catch((error) => {
          pageState.cardGeneration.automationProposals = Object.assign({}, pageState.cardGeneration.automationProposals, {
            actionStatus: "failed",
            actionError: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-automation-digest-refresh]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        refreshAutomationDigests().catch((error) => {
          pageState.cardGeneration.automationDigests = Object.assign({}, pageState.cardGeneration.automationDigests, {
            status: "failed",
            error: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-automation-digest-create]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        createAutomationDigestFromUi().catch((error) => {
          pageState.cardGeneration.automationDigests = Object.assign({}, pageState.cardGeneration.automationDigests, {
            actionStatus: "failed",
            actionError: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-automation-digest-review]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        reviewAutomationDigestFromUi(button).catch((error) => {
          pageState.cardGeneration.automationDigests = Object.assign({}, pageState.cardGeneration.automationDigests, {
            actionStatus: "failed",
            actionError: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-automation-failure-policy-refresh]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        refreshAutomationFailurePolicies().catch((error) => {
          pageState.cardGeneration.automationFailurePolicies = Object.assign({}, pageState.cardGeneration.automationFailurePolicies, {
            status: "failed",
            error: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-automation-failure-policy-create]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        createAutomationFailurePolicyFromUi().catch((error) => {
          pageState.cardGeneration.automationFailurePolicies = Object.assign({}, pageState.cardGeneration.automationFailurePolicies, {
            actionStatus: "failed",
            actionError: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-automation-failure-policy-review]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        reviewAutomationFailurePolicyFromUi(button).catch((error) => {
          pageState.cardGeneration.automationFailurePolicies = Object.assign({}, pageState.cardGeneration.automationFailurePolicies, {
            actionStatus: "failed",
            actionError: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-automation-action-handoff-refresh]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        refreshAutomationActionHandoffs().catch((error) => {
          pageState.cardGeneration.automationActionHandoffs = Object.assign({}, pageState.cardGeneration.automationActionHandoffs, {
            status: "failed",
            error: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-automation-action-handoff-create]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        createAutomationActionHandoffFromUi(button).catch((error) => {
          pageState.cardGeneration.automationActionHandoffs = Object.assign({}, pageState.cardGeneration.automationActionHandoffs, {
            actionStatus: "failed",
            actionError: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-automation-action-handoff-deliver]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        deliverAutomationActionHandoffFromUi(button).catch((error) => {
          pageState.cardGeneration.automationActionHandoffs = Object.assign({}, pageState.cardGeneration.automationActionHandoffs, {
            actionStatus: "failed",
            actionError: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-automation-scheduler-execution-refresh]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        refreshAutomationSchedulerExecutions().catch((error) => {
          pageState.cardGeneration.automationSchedulerExecutions = Object.assign({}, pageState.cardGeneration.automationSchedulerExecutions, {
            status: "failed",
            error: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-automation-scheduler-execution-execute]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        executeAutomationSchedulerOnceFromUi(button).catch((error) => {
          pageState.cardGeneration.automationSchedulerExecutions = Object.assign({}, pageState.cardGeneration.automationSchedulerExecutions, {
            actionStatus: "failed",
            actionError: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-automation-scheduler-run-refresh]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        refreshAutomationSchedulerRuns().catch((error) => {
          pageState.cardGeneration.automationSchedulerRuns = Object.assign({}, pageState.cardGeneration.automationSchedulerRuns, {
            status: "failed",
            error: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-automation-scheduler-run-once]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        runAutomationSchedulerOnceFromUi().catch((error) => {
          pageState.cardGeneration.automationSchedulerRuns = Object.assign({}, pageState.cardGeneration.automationSchedulerRuns, {
            actionStatus: "failed",
            actionError: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-automation-scheduler-worker-target-refresh]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        refreshAutomationSchedulerWorkerTargets().catch((error) => {
          pageState.cardGeneration.automationSchedulerWorkerTargets = Object.assign({}, pageState.cardGeneration.automationSchedulerWorkerTargets, {
            status: "failed",
            error: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-automation-scheduler-worker-target-create]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        createAutomationSchedulerWorkerTargetFromUi().catch((error) => {
          pageState.cardGeneration.automationSchedulerWorkerTargets = Object.assign({}, pageState.cardGeneration.automationSchedulerWorkerTargets, {
            actionStatus: "failed",
            actionError: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-automation-scheduler-worker-target-review]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        reviewAutomationSchedulerWorkerTargetFromUi(button).catch((error) => {
          pageState.cardGeneration.automationSchedulerWorkerTargets = Object.assign({}, pageState.cardGeneration.automationSchedulerWorkerTargets, {
            actionStatus: "failed",
            actionError: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-recommendation-lifecycle-review]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        reviewRecommendationLifecycleFromUi(button).catch((error) => {
          pageState.cardGeneration.recommendationLifecycle = Object.assign({}, pageState.cardGeneration.recommendationLifecycle, {
            actionStatus: "failed",
            actionError: error.message || String(error)
          });
          renderShell();
        });
      });
    });
    root.querySelectorAll("[data-stage-assessment-check]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.disabled) return;
        refreshStageCheckpointControlsFromUi().catch((error) => {
          pageState.cardGeneration.stageAssessment = Object.assign({}, pageState.cardGeneration.stageAssessment, {
            status: "failed",
            controlsStatus: "failed",
            controlsError: error.message || String(error),
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

  async function loadCardGenerationContext(targetWorkspaceId = cardGenerationWorkspaceId(), options = {}) {
    if (!pageState.auth.isOwner) return;
    const requestedTargetWorkspaceId = clean(targetWorkspaceId || currentWorkspaceId);
    const requestedSelection = options.resetGraphSelection
      ? {
        recipeId: clean(options.selection?.recipeId || options.selection?.recipe_id)
      }
      : selectionFromContext(
        pageState.cardGeneration.context || {},
        options.selection || pageState.cardGeneration.targetProvisionDraft || {}
      );
    clearCardGenerationProgressTimers();
    pageState.cardGeneration.selectedWorkspaceId = requestedTargetWorkspaceId;
    pageState.cardGeneration.status = "loading_context";
    pageState.cardGeneration.error = "";
    pageState.cardGeneration.progressStep = "";
    pageState.cardGeneration.progressMessage = "";
    pageState.cardGeneration.dailyLoopDraftResult = null;
    pageState.cardGeneration.dailyLoopPublishResult = null;
    pageState.cardGeneration.generatedResult = null;
    pageState.cardGeneration.targetProvisionDraft = Object.assign({}, requestedSelection, {
      status: "loading",
      result: pageState.cardGeneration.targetProvisionDraft?.result || null,
      error: ""
    });
    pageState.cardGeneration.ownerCorrectionDraft = "";
    pageState.cardGeneration.ownerCorrectionAction = "confirm_profile_delta";
    pageState.cardGeneration.ownerCorrection = {
      status: "idle",
      result: null,
      error: ""
    };
    pageState.cardGeneration.ownerAuditReviewDraft = "";
    pageState.cardGeneration.ownerAuditReviews = {
      status: "loading",
      data: pageState.cardGeneration.ownerAuditReviews?.data || null,
      error: "",
      actionStatus: "idle",
      actionResult: null,
      actionError: ""
    };
    pageState.cardGeneration.cycleDrilldown = {
      status: "idle",
      audit: null,
      completeness: null,
      error: ""
    };
    pageState.cardGeneration.cycleHistory = {
      status: "loading",
      data: pageState.cardGeneration.cycleHistory?.data || null,
      selectedCycleKey: "",
      selectedCycle: null,
      error: ""
    };
    pageState.cardGeneration.learningLoopState = {
      status: "loading",
      data: null,
      error: ""
    };
    pageState.cardGeneration.operatingLoop = {
      status: "loading",
      data: pageState.cardGeneration.operatingLoop?.data || null,
      error: "",
      actionStatus: "idle",
      actionResult: null,
      actionError: ""
    };
    pageState.cardGeneration.referenceChain = {
      status: "loading",
      objectTypes: pageState.cardGeneration.referenceChain?.objectTypes || null,
      requests: [],
      summaries: [],
      error: ""
    };
    pageState.cardGeneration.releaseWorkbench = {
      status: "loading",
      data: pageState.cardGeneration.releaseWorkbench?.data || null,
      error: "",
      actionStatus: "idle",
      actionResult: null,
      actionError: "",
      packageStatus: "idle",
      packageResult: null,
      packageCandidate: null,
      packageError: ""
    };
    pageState.cardGeneration.releaseArtifactTemplate = {
      status: "loading",
      data: pageState.cardGeneration.releaseArtifactTemplate?.data || null,
      error: ""
    };
    pageState.cardGeneration.releaseWorkbenchActionAudits = {
      status: "loading",
      data: pageState.cardGeneration.releaseWorkbenchActionAudits?.data || null,
      error: ""
    };
    pageState.cardGeneration.automationProposals = {
      status: "loading",
      data: pageState.cardGeneration.automationProposals?.data || null,
      error: "",
      actionStatus: "idle",
      actionResult: null,
      actionError: ""
    };
    pageState.cardGeneration.automationDigests = {
      status: "loading",
      data: pageState.cardGeneration.automationDigests?.data || null,
      error: "",
      actionStatus: "idle",
      actionResult: null,
      actionError: ""
    };
    pageState.cardGeneration.automationFailurePolicies = {
      status: "loading",
      data: pageState.cardGeneration.automationFailurePolicies?.data || null,
      error: "",
      actionStatus: "idle",
      actionResult: null,
      actionError: ""
    };
    pageState.cardGeneration.automationActionHandoffs = {
      status: "loading",
      data: pageState.cardGeneration.automationActionHandoffs?.data || null,
      error: "",
      actionStatus: "idle",
      actionResult: null,
      actionError: ""
    };
    pageState.cardGeneration.automationSchedulerExecutions = {
      status: "loading",
      data: pageState.cardGeneration.automationSchedulerExecutions?.data || null,
      error: "",
      actionStatus: "idle",
      actionResult: null,
      actionError: ""
    };
    pageState.cardGeneration.automationSchedulerRuns = {
      status: "loading",
      data: pageState.cardGeneration.automationSchedulerRuns?.data || null,
      error: "",
      actionStatus: "idle",
      actionResult: null,
      actionError: ""
    };
    pageState.cardGeneration.automationSchedulerWorkerTargets = {
      status: "loading",
      data: pageState.cardGeneration.automationSchedulerWorkerTargets?.data || null,
      error: "",
      actionStatus: "idle",
      actionResult: null,
      actionError: ""
    };
    pageState.cardGeneration.recommendationLifecycle = {
      actionStatus: "idle",
      actionResult: null,
      actionError: ""
    };
    renderShell();
    const context = await api.fetchCardGenerationContext(requestedTargetWorkspaceId, requestedSelection);
    pageState.cardGeneration.context = context;
    pageState.cardGeneration.selectedWorkspaceId = clean(context?.target?.workspaceId || requestedTargetWorkspaceId);
    pageState.cardGeneration.targetProvisionDraft = selectionFromContext(context, Object.assign({}, requestedSelection, {
      status: "idle",
      result: pageState.cardGeneration.targetProvisionDraft?.result || null,
      error: ""
    }));
    pageState.cardGeneration.status = "ready";
    pageState.cardGeneration.error = "";
    pageState.cardGeneration.progressStep = "";
    pageState.cardGeneration.progressMessage = "";
    pageState.cardGeneration.stageAssessment = {
      status: "idle",
      eligibility: null,
      result: null,
      controls: null,
      controlsStatus: "loading",
      controlsError: "",
      error: ""
    };
    renderShell();
    await refreshStageCheckpointControls(requestedTargetWorkspaceId, context);
    await refreshLearningLoopState(requestedTargetWorkspaceId, context);
    await refreshOperatingLoopRuns(requestedTargetWorkspaceId, context);
    await refreshCycleHistoryFromUi({ silent: true });
    await refreshOwnerAuditReviews(requestedTargetWorkspaceId, context, { silent: true });
    await refreshReferenceChain(requestedTargetWorkspaceId, context);
    await refreshAutomationProposals(requestedTargetWorkspaceId, context);
    await refreshAutomationDigests(requestedTargetWorkspaceId, context);
    await refreshAutomationFailurePolicies(requestedTargetWorkspaceId, context);
    await refreshAutomationActionHandoffs(requestedTargetWorkspaceId, context);
    await refreshAutomationSchedulerExecutions(requestedTargetWorkspaceId, context);
    await refreshAutomationSchedulerRuns(requestedTargetWorkspaceId, context);
    await refreshAutomationSchedulerWorkerTargets(requestedTargetWorkspaceId, context);
    await refreshReleaseWorkbench(requestedTargetWorkspaceId, context);
    renderShell();
  }

  async function refreshLearningLoopState(targetWorkspaceId = cardGenerationWorkspaceId(), context = pageState.cardGeneration.context) {
    if (!pageState.auth.isOwner || !context) return null;
    const requestedTargetWorkspaceId = clean(targetWorkspaceId || currentWorkspaceId);
    pageState.cardGeneration.learningLoopState = {
      status: "loading",
      data: pageState.cardGeneration.learningLoopState?.data || null,
      error: ""
    };
    try {
      const result = await api.fetchLearningLoopState(requestedTargetWorkspaceId, context);
      pageState.cardGeneration.learningLoopState = {
        status: "ready",
        data: result,
        error: ""
      };
      return result;
    } catch (error) {
      pageState.cardGeneration.learningLoopState = {
        status: "failed",
        data: null,
        error: error.message || String(error)
      };
      return null;
    }
  }

  function createOperatingLoopRunQueryPayload() {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createOperatingLoopRunQueryPayload !== "function") {
      throw new Error("operating_loop_ui_unavailable");
    }
    const context = pageState.cardGeneration.context || {};
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createOperatingLoopRunQueryPayload({ context, workspaceId: targetWorkspaceId }),
      targetWorkspaceId
    };
  }

  function createOperatingLoopAdvancePayload() {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createOperatingLoopAdvancePayload !== "function") {
      throw new Error("operating_loop_ui_unavailable");
    }
    const context = pageState.cardGeneration.context || {};
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createOperatingLoopAdvancePayload({
        context,
        workspaceId: targetWorkspaceId,
        state: pageState.cardGeneration
      }),
      targetWorkspaceId
    };
  }

  async function refreshOperatingLoopRuns(targetWorkspaceId = cardGenerationWorkspaceId(), context = pageState.cardGeneration.context, options = {}) {
    if (!pageState.auth.isOwner || !context) return null;
    const requestedTargetWorkspaceId = clean(targetWorkspaceId || currentWorkspaceId);
    const previous = pageState.cardGeneration.operatingLoop || {};
    pageState.cardGeneration.operatingLoop = {
      status: "loading",
      data: previous.data || null,
      error: "",
      actionStatus: previous.actionStatus || "idle",
      actionResult: previous.actionResult || null,
      actionError: previous.actionError || ""
    };
    if (!options.silent) renderShell();
    try {
      const ui = window.HermesGrowthCardGenerationUi;
      const payload = ui.createOperatingLoopRunQueryPayload({ context, workspaceId: requestedTargetWorkspaceId });
      const result = await api.fetchLearningOperatingLoopRuns(payload, requestedTargetWorkspaceId);
      pageState.cardGeneration.operatingLoop = {
        status: "ready",
        data: result,
        error: "",
        actionStatus: previous.actionStatus || "idle",
        actionResult: previous.actionResult || null,
        actionError: previous.actionError || ""
      };
      if (!options.silent) renderShell();
      return result;
    } catch (error) {
      pageState.cardGeneration.operatingLoop = {
        status: "failed",
        data: previous.data || null,
        error: error.message || String(error),
        actionStatus: previous.actionStatus || "idle",
        actionResult: previous.actionResult || null,
        actionError: previous.actionError || ""
      };
      if (!options.silent) renderShell();
      return null;
    }
  }

  function createReferenceChainRequests(targetWorkspaceId = cardGenerationWorkspaceId(), context = pageState.cardGeneration.context) {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createReferenceChainRequests !== "function") return [];
    return ui.createReferenceChainRequests({
      context,
      workspaceId: clean(targetWorkspaceId || context?.target?.workspaceId || currentWorkspaceId),
      state: pageState.cardGeneration
    });
  }

  async function refreshReferenceChain(targetWorkspaceId = cardGenerationWorkspaceId(), context = pageState.cardGeneration.context) {
    if (!pageState.auth.isOwner || !context) return null;
    const requestedTargetWorkspaceId = clean(targetWorkspaceId || currentWorkspaceId);
    const previous = pageState.cardGeneration.referenceChain || {};
    const requests = createReferenceChainRequests(requestedTargetWorkspaceId, context);
    pageState.cardGeneration.referenceChain = {
      status: "loading",
      objectTypes: previous.objectTypes || null,
      requests,
      summaries: previous.summaries || [],
      error: ""
    };
    try {
      const objectTypes = await api.fetchGrowthReferenceObjectTypes(requestedTargetWorkspaceId);
      const settled = await Promise.allSettled(requests.map((item) => (
        api.fetchGrowthReferenceSummary(item.objectType, item.objectId, requestedTargetWorkspaceId, { purpose: item.reason || "owner_loop" })
          .then((summary) => Object.assign({}, item, summary))
      )));
      const summaries = settled.map((result, index) => {
        if (result.status === "fulfilled") return result.value;
        const item = requests[index] || {};
        return Object.assign({}, item, {
          ok: false,
          error: result.reason?.message || String(result.reason || "reference_summary_failed")
        });
      });
      const failedCount = summaries.filter((item) => item.ok === false).length;
      pageState.cardGeneration.referenceChain = {
        status: failedCount && failedCount < summaries.length ? "partial" : failedCount ? "failed" : "ready",
        objectTypes,
        requests,
        summaries,
        error: failedCount ? "部分引用暂不可读。" : ""
      };
      return pageState.cardGeneration.referenceChain;
    } catch (error) {
      pageState.cardGeneration.referenceChain = {
        status: "failed",
        objectTypes: previous.objectTypes || null,
        requests,
        summaries: [],
        error: error.message || String(error)
      };
      return null;
    }
  }

  async function refreshOwnerAuditReviews(targetWorkspaceId = cardGenerationWorkspaceId(), context = pageState.cardGeneration.context, options = {}) {
    if (!pageState.auth.isOwner || !context) return null;
    const requestedTargetWorkspaceId = clean(targetWorkspaceId || currentWorkspaceId);
    const previous = pageState.cardGeneration.ownerAuditReviews || {};
    pageState.cardGeneration.ownerAuditReviews = {
      status: "loading",
      data: previous.data || null,
      error: "",
      actionStatus: previous.actionStatus || "idle",
      actionResult: previous.actionResult || null,
      actionError: previous.actionError || ""
    };
    if (!options.silent) renderShell();
    try {
      const ui = window.HermesGrowthCardGenerationUi;
      const payload = ui.createOwnerAuditReviewQueryPayload({
        context,
        workspaceId: requestedTargetWorkspaceId,
        selectedCycle: pageState.cardGeneration.cycleHistory?.selectedCycle || {}
      });
      const result = await api.fetchGrowthOwnerAuditReviews(payload, requestedTargetWorkspaceId);
      pageState.cardGeneration.ownerAuditReviews = {
        status: "ready",
        data: result,
        error: "",
        actionStatus: previous.actionStatus || "idle",
        actionResult: previous.actionResult || null,
        actionError: previous.actionError || ""
      };
      if (!options.silent) renderShell();
      return result;
    } catch (error) {
      pageState.cardGeneration.ownerAuditReviews = {
        status: "failed",
        data: previous.data || null,
        error: error.message || String(error),
        actionStatus: previous.actionStatus || "idle",
        actionResult: previous.actionResult || null,
        actionError: previous.actionError || ""
      };
      if (!options.silent) renderShell();
      return null;
    }
  }

  async function refreshReleaseWorkbench(targetWorkspaceId = cardGenerationWorkspaceId(), context = pageState.cardGeneration.context, options = {}) {
    if (!pageState.auth.isOwner || !context) return null;
    const requestedTargetWorkspaceId = clean(targetWorkspaceId || currentWorkspaceId);
    const previous = pageState.cardGeneration.releaseWorkbench || {};
    pageState.cardGeneration.releaseWorkbench = {
      status: "loading",
      data: previous.data || null,
      error: "",
      actionStatus: previous.actionStatus || "idle",
      actionResult: previous.actionResult || null,
      actionError: previous.actionError || "",
      packageStatus: previous.packageStatus || "idle",
      packageResult: previous.packageResult || null,
      packageCandidate: previous.packageCandidate || null,
      packageError: previous.packageError || ""
    };
    try {
      const result = await api.fetchGrowthReleaseWorkbench(requestedTargetWorkspaceId, context);
      pageState.cardGeneration.releaseWorkbench = {
        status: "ready",
        data: result,
        error: "",
        actionStatus: previous.actionStatus || "idle",
        actionResult: previous.actionResult || null,
        actionError: previous.actionError || "",
        packageStatus: previous.packageStatus || "idle",
        packageResult: previous.packageResult || null,
        packageCandidate: previous.packageCandidate || null,
        packageError: previous.packageError || ""
      };
      pageState.cardGeneration.context = Object.assign({}, context, {
        releaseWorkbench: result
      });
      if (!options.skipArtifactTemplate) {
        await refreshReleaseArtifactTemplate(requestedTargetWorkspaceId, pageState.cardGeneration.context || context, { silent: true });
      }
      if (!options.skipActionAudits) {
        await refreshReleaseWorkbenchActionAudits(requestedTargetWorkspaceId, pageState.cardGeneration.context || context, { silent: true });
      }
      return result;
    } catch (error) {
      pageState.cardGeneration.releaseWorkbench = {
        status: "failed",
        data: null,
        error: error.message || String(error),
        actionStatus: previous.actionStatus || "idle",
        actionResult: previous.actionResult || null,
        actionError: previous.actionError || "",
        packageStatus: previous.packageStatus || "idle",
        packageResult: previous.packageResult || null,
        packageCandidate: previous.packageCandidate || null,
        packageError: previous.packageError || ""
      };
      return null;
    }
  }

  async function refreshReleaseArtifactTemplate(targetWorkspaceId = cardGenerationWorkspaceId(), context = pageState.cardGeneration.context, options = {}) {
    if (!pageState.auth.isOwner || !context) return null;
    const requestedTargetWorkspaceId = clean(targetWorkspaceId || currentWorkspaceId);
    const previous = pageState.cardGeneration.releaseArtifactTemplate || {};
    pageState.cardGeneration.releaseArtifactTemplate = {
      status: "loading",
      data: previous.data || null,
      error: ""
    };
    if (!options.silent) renderShell();
    try {
      const result = await api.fetchGrowthReleaseArtifactTemplate(requestedTargetWorkspaceId, context);
      pageState.cardGeneration.releaseArtifactTemplate = {
        status: "ready",
        data: result,
        error: ""
      };
      pageState.cardGeneration.context = Object.assign({}, pageState.cardGeneration.context || context, {
        releaseArtifactTemplate: result
      });
      if (!options.silent) renderShell();
      return result;
    } catch (error) {
      pageState.cardGeneration.releaseArtifactTemplate = {
        status: "failed",
        data: previous.data || null,
        error: error.message || String(error)
      };
      if (!options.silent) renderShell();
      return null;
    }
  }

  async function refreshReleaseWorkbenchActionAudits(targetWorkspaceId = cardGenerationWorkspaceId(), context = pageState.cardGeneration.context, options = {}) {
    if (!pageState.auth.isOwner || !context) return null;
    const requestedTargetWorkspaceId = clean(targetWorkspaceId || currentWorkspaceId);
    const previous = pageState.cardGeneration.releaseWorkbenchActionAudits || {};
    pageState.cardGeneration.releaseWorkbenchActionAudits = {
      status: "loading",
      data: previous.data || null,
      error: ""
    };
    if (!options.silent) renderShell();
    try {
      const ui = window.HermesGrowthCardGenerationUi;
      const payload = ui.createReleaseWorkbenchActionAuditQueryPayload({ context, workspaceId: requestedTargetWorkspaceId });
      const result = await api.fetchGrowthReleaseWorkbenchActionAudits(payload, requestedTargetWorkspaceId);
      pageState.cardGeneration.releaseWorkbenchActionAudits = {
        status: "ready",
        data: result,
        error: ""
      };
      pageState.cardGeneration.context = Object.assign({}, pageState.cardGeneration.context || context, {
        releaseWorkbenchActionAudits: result
      });
      if (!options.silent) renderShell();
      return result;
    } catch (error) {
      pageState.cardGeneration.releaseWorkbenchActionAudits = {
        status: "failed",
        data: previous.data || null,
        error: error.message || String(error)
      };
      if (!options.silent) renderShell();
      return null;
    }
  }

  function createAutomationProposalQueryPayload() {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createAutomationProposalQueryPayload !== "function") {
      throw new Error("automation_proposal_ui_unavailable");
    }
    const context = pageState.cardGeneration.context;
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createAutomationProposalQueryPayload({ context, workspaceId: targetWorkspaceId }),
      targetWorkspaceId
    };
  }

  async function refreshAutomationProposals(targetWorkspaceId = cardGenerationWorkspaceId(), context = pageState.cardGeneration.context, options = {}) {
    if (!pageState.auth.isOwner || !context) return null;
    const requestedTargetWorkspaceId = clean(targetWorkspaceId || currentWorkspaceId);
    const previous = pageState.cardGeneration.automationProposals || {};
    pageState.cardGeneration.automationProposals = {
      status: "loading",
      data: previous.data || null,
      error: "",
      actionStatus: previous.actionStatus || "idle",
      actionResult: previous.actionResult || null,
      actionError: previous.actionError || ""
    };
    if (!options.silent) renderShell();
    try {
      const ui = window.HermesGrowthCardGenerationUi;
      const payload = ui.createAutomationProposalQueryPayload({ context, workspaceId: requestedTargetWorkspaceId });
      const result = await api.fetchGrowthAutomationProposals(payload, requestedTargetWorkspaceId);
      pageState.cardGeneration.automationProposals = {
        status: "ready",
        data: result,
        error: "",
        actionStatus: previous.actionStatus || "idle",
        actionResult: previous.actionResult || null,
        actionError: previous.actionError || ""
      };
      if (!options.silent) renderShell();
      return result;
    } catch (error) {
      pageState.cardGeneration.automationProposals = {
        status: "failed",
        data: previous.data || null,
        error: error.message || String(error),
        actionStatus: previous.actionStatus || "idle",
        actionResult: previous.actionResult || null,
        actionError: previous.actionError || ""
      };
      if (!options.silent) renderShell();
      return null;
    }
  }

  async function refreshAutomationDigests(targetWorkspaceId = cardGenerationWorkspaceId(), context = pageState.cardGeneration.context, options = {}) {
    if (!pageState.auth.isOwner || !context) return null;
    const requestedTargetWorkspaceId = clean(targetWorkspaceId || currentWorkspaceId);
    const previous = pageState.cardGeneration.automationDigests || {};
    pageState.cardGeneration.automationDigests = {
      status: "loading",
      data: previous.data || null,
      error: "",
      actionStatus: previous.actionStatus || "idle",
      actionResult: previous.actionResult || null,
      actionError: previous.actionError || ""
    };
    if (!options.silent) renderShell();
    try {
      const ui = window.HermesGrowthCardGenerationUi;
      const payload = ui.createAutomationDigestQueryPayload({ context, workspaceId: requestedTargetWorkspaceId });
      const result = await api.fetchGrowthAutomationDigests(payload, requestedTargetWorkspaceId);
      pageState.cardGeneration.automationDigests = {
        status: "ready",
        data: result,
        error: "",
        actionStatus: previous.actionStatus || "idle",
        actionResult: previous.actionResult || null,
        actionError: previous.actionError || ""
      };
      if (!options.silent) renderShell();
      return result;
    } catch (error) {
      pageState.cardGeneration.automationDigests = {
        status: "failed",
        data: previous.data || null,
        error: error.message || String(error),
        actionStatus: previous.actionStatus || "idle",
        actionResult: previous.actionResult || null,
        actionError: previous.actionError || ""
      };
      if (!options.silent) renderShell();
      return null;
    }
  }

  async function refreshAutomationFailurePolicies(targetWorkspaceId = cardGenerationWorkspaceId(), context = pageState.cardGeneration.context, options = {}) {
    if (!pageState.auth.isOwner || !context) return null;
    const requestedTargetWorkspaceId = clean(targetWorkspaceId || currentWorkspaceId);
    const previous = pageState.cardGeneration.automationFailurePolicies || {};
    pageState.cardGeneration.automationFailurePolicies = {
      status: "loading",
      data: previous.data || null,
      error: "",
      actionStatus: previous.actionStatus || "idle",
      actionResult: previous.actionResult || null,
      actionError: previous.actionError || ""
    };
    if (!options.silent) renderShell();
    try {
      const ui = window.HermesGrowthCardGenerationUi;
      const payload = ui.createAutomationFailurePolicyQueryPayload({ context, workspaceId: requestedTargetWorkspaceId });
      const readinessPayload = ui.createAutomationFailurePolicyQueryPayload({ context, workspaceId: requestedTargetWorkspaceId, status: "" });
      const result = await api.fetchGrowthAutomationFailurePolicies(payload, requestedTargetWorkspaceId);
      const readiness = await api.fetchGrowthAutomationFailurePolicyReadiness(readinessPayload, requestedTargetWorkspaceId);
      pageState.cardGeneration.automationFailurePolicies = {
        status: "ready",
        data: Object.assign({}, result, { readiness }),
        error: "",
        actionStatus: previous.actionStatus || "idle",
        actionResult: previous.actionResult || null,
        actionError: previous.actionError || ""
      };
      if (!options.silent) renderShell();
      return pageState.cardGeneration.automationFailurePolicies.data;
    } catch (error) {
      pageState.cardGeneration.automationFailurePolicies = {
        status: "failed",
        data: previous.data || null,
        error: error.message || String(error),
        actionStatus: previous.actionStatus || "idle",
        actionResult: previous.actionResult || null,
        actionError: previous.actionError || ""
      };
      if (!options.silent) renderShell();
      return null;
    }
  }

  async function refreshAutomationActionHandoffs(targetWorkspaceId = cardGenerationWorkspaceId(), context = pageState.cardGeneration.context, options = {}) {
    if (!pageState.auth.isOwner || !context) return null;
    const requestedTargetWorkspaceId = clean(targetWorkspaceId || currentWorkspaceId);
    const previous = pageState.cardGeneration.automationActionHandoffs || {};
    pageState.cardGeneration.automationActionHandoffs = {
      status: "loading",
      data: previous.data || null,
      error: "",
      actionStatus: previous.actionStatus || "idle",
      actionResult: previous.actionResult || null,
      actionError: previous.actionError || ""
    };
    if (!options.silent) renderShell();
    try {
      const ui = window.HermesGrowthCardGenerationUi;
      const payload = ui.createAutomationActionHandoffQueryPayload({ context, workspaceId: requestedTargetWorkspaceId });
      const result = await api.fetchGrowthAutomationActionHandoffs(payload, requestedTargetWorkspaceId);
      pageState.cardGeneration.automationActionHandoffs = {
        status: "ready",
        data: result,
        error: "",
        actionStatus: previous.actionStatus || "idle",
        actionResult: previous.actionResult || null,
        actionError: previous.actionError || ""
      };
      if (!options.silent) renderShell();
      return result;
    } catch (error) {
      pageState.cardGeneration.automationActionHandoffs = {
        status: "failed",
        data: previous.data || null,
        error: error.message || String(error),
        actionStatus: previous.actionStatus || "idle",
        actionResult: previous.actionResult || null,
        actionError: previous.actionError || ""
      };
      if (!options.silent) renderShell();
      return null;
    }
  }

  async function refreshAutomationSchedulerExecutions(targetWorkspaceId = cardGenerationWorkspaceId(), context = pageState.cardGeneration.context, options = {}) {
    if (!pageState.auth.isOwner || !context) return null;
    const requestedTargetWorkspaceId = clean(targetWorkspaceId || currentWorkspaceId);
    const previous = pageState.cardGeneration.automationSchedulerExecutions || {};
    pageState.cardGeneration.automationSchedulerExecutions = {
      status: "loading",
      data: previous.data || null,
      error: "",
      actionStatus: previous.actionStatus || "idle",
      actionResult: previous.actionResult || null,
      actionError: previous.actionError || ""
    };
    if (!options.silent) renderShell();
    try {
      const ui = window.HermesGrowthCardGenerationUi;
      const payload = ui.createAutomationSchedulerExecutionQueryPayload({ context, workspaceId: requestedTargetWorkspaceId });
      const result = await api.fetchGrowthAutomationSchedulerExecutions(payload, requestedTargetWorkspaceId);
      pageState.cardGeneration.automationSchedulerExecutions = {
        status: "ready",
        data: result,
        error: "",
        actionStatus: previous.actionStatus || "idle",
        actionResult: previous.actionResult || null,
        actionError: previous.actionError || ""
      };
      if (!options.silent) renderShell();
      return result;
    } catch (error) {
      pageState.cardGeneration.automationSchedulerExecutions = {
        status: "failed",
        data: previous.data || null,
        error: error.message || String(error),
        actionStatus: previous.actionStatus || "idle",
        actionResult: previous.actionResult || null,
        actionError: previous.actionError || ""
      };
      if (!options.silent) renderShell();
      return null;
    }
  }

  async function refreshAutomationSchedulerRuns(targetWorkspaceId = cardGenerationWorkspaceId(), context = pageState.cardGeneration.context, options = {}) {
    if (!pageState.auth.isOwner || !context) return null;
    const requestedTargetWorkspaceId = clean(targetWorkspaceId || currentWorkspaceId);
    const previous = pageState.cardGeneration.automationSchedulerRuns || {};
    pageState.cardGeneration.automationSchedulerRuns = {
      status: "loading",
      data: previous.data || null,
      error: "",
      actionStatus: previous.actionStatus || "idle",
      actionResult: previous.actionResult || null,
      actionError: previous.actionError || ""
    };
    if (!options.silent) renderShell();
    try {
      const ui = window.HermesGrowthCardGenerationUi;
      const payload = ui.createAutomationSchedulerRunQueryPayload({ context, workspaceId: requestedTargetWorkspaceId });
      const result = await api.fetchGrowthAutomationSchedulerRuns(payload, requestedTargetWorkspaceId);
      pageState.cardGeneration.automationSchedulerRuns = {
        status: "ready",
        data: result,
        error: "",
        actionStatus: previous.actionStatus || "idle",
        actionResult: previous.actionResult || null,
        actionError: previous.actionError || ""
      };
      if (!options.silent) renderShell();
      return result;
    } catch (error) {
      pageState.cardGeneration.automationSchedulerRuns = {
        status: "failed",
        data: previous.data || null,
        error: error.message || String(error),
        actionStatus: previous.actionStatus || "idle",
        actionResult: previous.actionResult || null,
        actionError: previous.actionError || ""
      };
      if (!options.silent) renderShell();
      return null;
    }
  }

  async function refreshAutomationSchedulerWorkerTargets(targetWorkspaceId = cardGenerationWorkspaceId(), context = pageState.cardGeneration.context, options = {}) {
    if (!pageState.auth.isOwner || !context) return null;
    const requestedTargetWorkspaceId = clean(targetWorkspaceId || currentWorkspaceId);
    const previous = pageState.cardGeneration.automationSchedulerWorkerTargets || {};
    pageState.cardGeneration.automationSchedulerWorkerTargets = {
      status: "loading",
      data: previous.data || null,
      error: "",
      actionStatus: previous.actionStatus || "idle",
      actionResult: previous.actionResult || null,
      actionError: previous.actionError || ""
    };
    if (!options.silent) renderShell();
    try {
      const ui = window.HermesGrowthCardGenerationUi;
      const payload = ui.createAutomationSchedulerWorkerTargetQueryPayload({ context, workspaceId: requestedTargetWorkspaceId });
      const result = await api.fetchGrowthAutomationSchedulerWorkerTargets(payload, requestedTargetWorkspaceId);
      pageState.cardGeneration.automationSchedulerWorkerTargets = {
        status: "ready",
        data: result,
        error: "",
        actionStatus: previous.actionStatus || "idle",
        actionResult: previous.actionResult || null,
        actionError: previous.actionError || ""
      };
      if (!options.silent) renderShell();
      return result;
    } catch (error) {
      pageState.cardGeneration.automationSchedulerWorkerTargets = {
        status: "failed",
        data: previous.data || null,
        error: error.message || String(error),
        actionStatus: previous.actionStatus || "idle",
        actionResult: previous.actionResult || null,
        actionError: previous.actionError || ""
      };
      if (!options.silent) renderShell();
      return null;
    }
  }

  async function refreshAutomationProposalReviewStack(targetWorkspaceId = cardGenerationWorkspaceId(), context = pageState.cardGeneration.context, options = {}) {
    if (!pageState.auth.isOwner || !context) return null;
    const requestedTargetWorkspaceId = clean(targetWorkspaceId || currentWorkspaceId);
    await refreshAutomationProposals(requestedTargetWorkspaceId, context, { silent: true });
    const refreshedContext = pageState.cardGeneration.context || context;
    await refreshAutomationDigests(requestedTargetWorkspaceId, refreshedContext, { silent: true });
    await refreshAutomationFailurePolicies(requestedTargetWorkspaceId, refreshedContext, { silent: true });
    await refreshAutomationActionHandoffs(requestedTargetWorkspaceId, refreshedContext, { silent: true });
    await refreshAutomationSchedulerExecutions(requestedTargetWorkspaceId, refreshedContext, { silent: true });
    await refreshAutomationSchedulerRuns(requestedTargetWorkspaceId, refreshedContext, { silent: true });
    await refreshAutomationSchedulerWorkerTargets(requestedTargetWorkspaceId, refreshedContext, { silent: true });
    await refreshReleaseWorkbench(requestedTargetWorkspaceId, refreshedContext);
    if (!options.silent) renderShell();
    return pageState.cardGeneration.automationProposals;
  }

  function automationProposalItems() {
    const holder = pageState.cardGeneration.automationProposals || {};
    const data = holder.data || {};
    return Array.isArray(data.proposals) ? data.proposals : [];
  }

  function findAutomationProposal(proposalId = "") {
    const id = clean(proposalId);
    return automationProposalItems().find((proposal = {}) => clean(proposal.proposalId || proposal.proposal_id) === id) || null;
  }

  function automationDigestItems() {
    const holder = pageState.cardGeneration.automationDigests || {};
    const data = holder.data || {};
    return Array.isArray(data.digests) ? data.digests : [];
  }

  function findAutomationDigest(digestId = "") {
    const id = clean(digestId);
    return automationDigestItems().find((digest = {}) => clean(digest.digestId || digest.digest_id) === id) || null;
  }

  function automationFailurePolicyItems() {
    const holder = pageState.cardGeneration.automationFailurePolicies || {};
    const data = holder.data || {};
    return Array.isArray(data.policies) ? data.policies : [];
  }

  function findAutomationFailurePolicy(policyId = "") {
    const id = clean(policyId);
    return automationFailurePolicyItems().find((policy = {}) => clean(policy.policyId || policy.policy_id) === id) || null;
  }

  function automationActionHandoffItems() {
    const holder = pageState.cardGeneration.automationActionHandoffs || {};
    const data = holder.data || {};
    return Array.isArray(data.handoffs) ? data.handoffs : [];
  }

  function findAutomationActionHandoff(handoffId = "") {
    const id = clean(handoffId);
    return automationActionHandoffItems().find((handoff = {}) => clean(handoff.handoffId || handoff.handoff_id) === id) || null;
  }

  function automationSchedulerWorkerTargetItems() {
    const holder = pageState.cardGeneration.automationSchedulerWorkerTargets || {};
    const data = holder.data || {};
    return Array.isArray(data.targets) ? data.targets : [];
  }

  function findAutomationSchedulerWorkerTarget(targetId = "") {
    const id = clean(targetId);
    return automationSchedulerWorkerTargetItems().find((target = {}) => clean(target.targetId || target.target_id || target.workerTargetId || target.worker_target_id) === id) || null;
  }

  function recommendationLifecycleItems() {
    const context = pageState.cardGeneration.context || {};
    return Array.isArray(context.recommendationLifecycle) ? context.recommendationLifecycle : [];
  }

  function findRecommendationLifecycleItem(button) {
    const trajectoryId = clean(button.dataset.recommendationLifecycleTrajectoryId);
    const sourceTaskCardId = clean(button.dataset.recommendationLifecycleSourceTaskCardId);
    const sourceEvaluationId = clean(button.dataset.recommendationLifecycleSourceEvaluationId);
    return recommendationLifecycleItems().find((item = {}) => {
      return (trajectoryId && clean(item.trajectoryId || item.trajectory_id || item.id) === trajectoryId)
        || (sourceTaskCardId && clean(item.sourceTaskCardId || item.source_task_card_id || item.taskCardId || item.task_card_id) === sourceTaskCardId)
        || (sourceEvaluationId && clean(item.sourceEvaluationId || item.source_evaluation_id || item.evaluationId || item.evaluation_id) === sourceEvaluationId);
    }) || {
      trajectoryId,
      sourceTaskCardId,
      sourceEvaluationId
    };
  }

  function createRecommendationLifecycleDecisionPayload(button) {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createRecommendationLifecycleDecisionPayload !== "function") {
      throw new Error("recommendation_lifecycle_ui_unavailable");
    }
    const context = pageState.cardGeneration.context || {};
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createRecommendationLifecycleDecisionPayload({
        context,
        workspaceId: targetWorkspaceId,
        recommendation: findRecommendationLifecycleItem(button),
        status: button.dataset.recommendationLifecycleStatus
      }),
      targetWorkspaceId
    };
  }

  function createAutomationProposalDecisionPayload(proposal = {}, status = "") {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createAutomationProposalDecisionPayload !== "function") {
      throw new Error("automation_proposal_ui_unavailable");
    }
    const context = pageState.cardGeneration.context || {};
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createAutomationProposalDecisionPayload({ context, workspaceId: targetWorkspaceId, proposal, status }),
      targetWorkspaceId
    };
  }

  function createAutomationDigestReviewPayload(digest = {}, status = "") {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createAutomationDigestReviewPayload !== "function") {
      throw new Error("automation_digest_ui_unavailable");
    }
    const context = pageState.cardGeneration.context || {};
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createAutomationDigestReviewPayload({ context, workspaceId: targetWorkspaceId, digest, status }),
      targetWorkspaceId
    };
  }

  function createAutomationFailurePolicyCreatePayload() {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createAutomationFailurePolicyCreatePayload !== "function") {
      throw new Error("automation_failure_policy_ui_unavailable");
    }
    const context = pageState.cardGeneration.context;
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createAutomationFailurePolicyCreatePayload({ context, workspaceId: targetWorkspaceId }),
      targetWorkspaceId
    };
  }

  function createAutomationFailurePolicyReviewPayload(policy = {}, status = "") {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createAutomationFailurePolicyReviewPayload !== "function") {
      throw new Error("automation_failure_policy_ui_unavailable");
    }
    const context = pageState.cardGeneration.context;
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createAutomationFailurePolicyReviewPayload({ context, workspaceId: targetWorkspaceId, policy, status }),
      targetWorkspaceId
    };
  }

  function createAutomationDigestCreatePayload() {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createAutomationDigestCreatePayload !== "function") {
      throw new Error("automation_digest_ui_unavailable");
    }
    const context = pageState.cardGeneration.context || {};
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createAutomationDigestCreatePayload({ context, workspaceId: targetWorkspaceId }),
      targetWorkspaceId
    };
  }

  function createAutomationActionHandoffPayload(digest = {}) {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createAutomationActionHandoffPayload !== "function") {
      throw new Error("automation_action_handoff_ui_unavailable");
    }
    const context = pageState.cardGeneration.context || {};
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createAutomationActionHandoffPayload({ context, workspaceId: targetWorkspaceId, digest }),
      targetWorkspaceId
    };
  }

  function createAutomationActionHandoffDeliverPayload(handoff = {}) {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createAutomationActionHandoffDeliverPayload !== "function") {
      throw new Error("automation_action_handoff_ui_unavailable");
    }
    const context = pageState.cardGeneration.context || {};
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createAutomationActionHandoffDeliverPayload({ context, workspaceId: targetWorkspaceId, handoff }),
      targetWorkspaceId
    };
  }

  function createAutomationSchedulerExecutionPayload(handoff = {}) {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createAutomationSchedulerExecutionPayload !== "function") {
      throw new Error("automation_scheduler_execution_ui_unavailable");
    }
    const context = pageState.cardGeneration.context || {};
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createAutomationSchedulerExecutionPayload({ context, workspaceId: targetWorkspaceId, handoff }),
      targetWorkspaceId
    };
  }

  function createAutomationSchedulerRunPayload() {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createAutomationSchedulerRunPayload !== "function") {
      throw new Error("automation_scheduler_run_ui_unavailable");
    }
    const context = pageState.cardGeneration.context || {};
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createAutomationSchedulerRunPayload({ context, workspaceId: targetWorkspaceId }),
      targetWorkspaceId
    };
  }

  function createAutomationSchedulerWorkerTargetPayload() {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createAutomationSchedulerWorkerTargetPayload !== "function") {
      throw new Error("automation_scheduler_worker_target_ui_unavailable");
    }
    const context = pageState.cardGeneration.context || {};
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createAutomationSchedulerWorkerTargetPayload({ context, workspaceId: targetWorkspaceId }),
      targetWorkspaceId
    };
  }

  function createAutomationSchedulerWorkerTargetReviewPayload(target = {}, status = "") {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createAutomationSchedulerWorkerTargetReviewPayload !== "function") {
      throw new Error("automation_scheduler_worker_target_ui_unavailable");
    }
    const context = pageState.cardGeneration.context || {};
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createAutomationSchedulerWorkerTargetReviewPayload({ context, workspaceId: targetWorkspaceId, target, status }),
      targetWorkspaceId
    };
  }

  function createAutomationProposalCreatePayload() {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createAutomationProposalCreatePayload !== "function") {
      throw new Error("automation_proposal_ui_unavailable");
    }
    const context = pageState.cardGeneration.context || {};
    const selectedCycle = pageState.cardGeneration.cycleHistory?.selectedCycle || {};
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createAutomationProposalCreatePayload({ context, workspaceId: targetWorkspaceId, selectedCycle }),
      targetWorkspaceId
    };
  }

  function createAutomationProposalPublishPayload(proposal = {}) {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createAutomationProposalPublishPayload !== "function") {
      throw new Error("automation_proposal_ui_unavailable");
    }
    const context = pageState.cardGeneration.context || {};
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createAutomationProposalPublishPayload({ context, workspaceId: targetWorkspaceId, proposal }),
      targetWorkspaceId
    };
  }

  async function createAutomationProposalFromUi() {
    const { payload, targetWorkspaceId } = createAutomationProposalCreatePayload();
    pageState.cardGeneration.automationProposals = Object.assign({}, pageState.cardGeneration.automationProposals, {
      actionStatus: "submitting",
      actionResult: pageState.cardGeneration.automationProposals?.actionResult || null,
      actionError: ""
    });
    renderShell();
    try {
      const result = await api.createGrowthAutomationProposal(payload, targetWorkspaceId);
      pageState.cardGeneration.automationProposals = Object.assign({}, pageState.cardGeneration.automationProposals, {
        actionStatus: result.ok ? "created" : "failed",
        actionResult: result,
        actionError: result.ok ? "" : clean(result.error || "automation_proposal_create_failed")
      });
      await refreshAutomationProposalReviewStack(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      renderShell();
    } catch (error) {
      pageState.cardGeneration.automationProposals = Object.assign({}, pageState.cardGeneration.automationProposals, {
        actionStatus: "failed",
        actionError: error.message || String(error)
      });
      renderShell();
    }
  }

  async function reviewAutomationProposalFromUi(button) {
    const proposalId = clean(button.dataset.automationProposalId);
    const status = clean(button.dataset.automationProposalStatus);
    const proposal = findAutomationProposal(proposalId);
    if (!proposal) throw new Error("automation_proposal_not_found");
    const { payload, targetWorkspaceId } = createAutomationProposalDecisionPayload(proposal, status);
    pageState.cardGeneration.automationProposals = Object.assign({}, pageState.cardGeneration.automationProposals, {
      actionStatus: "submitting",
      actionResult: pageState.cardGeneration.automationProposals?.actionResult || null,
      actionError: ""
    });
    renderShell();
    try {
      const result = await api.reviewGrowthAutomationProposal(proposalId, payload, targetWorkspaceId);
      pageState.cardGeneration.automationProposals = Object.assign({}, pageState.cardGeneration.automationProposals, {
        actionStatus: "reviewed",
        actionResult: result,
        actionError: ""
      });
      await refreshAutomationProposalReviewStack(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      renderShell();
    } catch (error) {
      pageState.cardGeneration.automationProposals = Object.assign({}, pageState.cardGeneration.automationProposals, {
        actionStatus: "failed",
        actionError: error.message || String(error)
      });
      renderShell();
    }
  }

  async function createAutomationDigestFromUi() {
    const { payload, targetWorkspaceId } = createAutomationDigestCreatePayload();
    pageState.cardGeneration.automationDigests = Object.assign({}, pageState.cardGeneration.automationDigests, {
      actionStatus: "submitting",
      actionResult: pageState.cardGeneration.automationDigests?.actionResult || null,
      actionError: ""
    });
    renderShell();
    try {
      const result = await api.createGrowthAutomationDigest(payload, targetWorkspaceId);
      pageState.cardGeneration.automationDigests = Object.assign({}, pageState.cardGeneration.automationDigests, {
        actionStatus: result.ok ? "created" : "failed",
        actionResult: result,
        actionError: result.ok ? "" : clean(result.error || "automation_digest_create_failed")
      });
      await refreshAutomationDigests(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshAutomationFailurePolicies(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshAutomationActionHandoffs(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshReleaseWorkbench(targetWorkspaceId, pageState.cardGeneration.context);
      renderShell();
    } catch (error) {
      pageState.cardGeneration.automationDigests = Object.assign({}, pageState.cardGeneration.automationDigests, {
        actionStatus: "failed",
        actionError: error.message || String(error)
      });
      renderShell();
    }
  }

  async function reviewAutomationDigestFromUi(button) {
    const digestId = clean(button.dataset.automationDigestId);
    const status = clean(button.dataset.automationDigestStatus);
    const digest = findAutomationDigest(digestId);
    if (!digest) throw new Error("automation_digest_not_found");
    const { payload, targetWorkspaceId } = createAutomationDigestReviewPayload(digest, status);
    pageState.cardGeneration.automationDigests = Object.assign({}, pageState.cardGeneration.automationDigests, {
      actionStatus: "submitting",
      actionResult: pageState.cardGeneration.automationDigests?.actionResult || null,
      actionError: ""
    });
    renderShell();
    try {
      const result = await api.reviewGrowthAutomationDigest(digestId, payload, targetWorkspaceId);
      pageState.cardGeneration.automationDigests = Object.assign({}, pageState.cardGeneration.automationDigests, {
        actionStatus: "reviewed",
        actionResult: result,
        actionError: ""
      });
      await refreshAutomationDigests(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshAutomationFailurePolicies(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshAutomationActionHandoffs(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshReleaseWorkbench(targetWorkspaceId, pageState.cardGeneration.context);
      renderShell();
    } catch (error) {
      pageState.cardGeneration.automationDigests = Object.assign({}, pageState.cardGeneration.automationDigests, {
        actionStatus: "failed",
        actionError: error.message || String(error)
      });
      renderShell();
    }
  }

  async function createAutomationFailurePolicyFromUi() {
    const { payload, targetWorkspaceId } = createAutomationFailurePolicyCreatePayload();
    pageState.cardGeneration.automationFailurePolicies = Object.assign({}, pageState.cardGeneration.automationFailurePolicies, {
      actionStatus: "submitting",
      actionResult: pageState.cardGeneration.automationFailurePolicies?.actionResult || null,
      actionError: ""
    });
    renderShell();
    try {
      const result = await api.createGrowthAutomationFailurePolicy(payload, targetWorkspaceId);
      pageState.cardGeneration.automationFailurePolicies = Object.assign({}, pageState.cardGeneration.automationFailurePolicies, {
        actionStatus: result.ok ? "created" : "failed",
        actionResult: result,
        actionError: result.ok ? "" : clean(result.error || "automation_failure_policy_create_failed")
      });
      await refreshAutomationFailurePolicies(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshAutomationActionHandoffs(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshAutomationSchedulerExecutions(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshAutomationSchedulerRuns(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshReleaseWorkbench(targetWorkspaceId, pageState.cardGeneration.context);
      renderShell();
    } catch (error) {
      pageState.cardGeneration.automationFailurePolicies = Object.assign({}, pageState.cardGeneration.automationFailurePolicies, {
        actionStatus: "failed",
        actionError: error.message || String(error)
      });
      renderShell();
    }
  }

  async function reviewAutomationFailurePolicyFromUi(button) {
    const policyId = clean(button.dataset.automationFailurePolicyId);
    const status = clean(button.dataset.automationFailurePolicyStatus);
    const policy = findAutomationFailurePolicy(policyId);
    if (!policy) throw new Error("automation_failure_policy_not_found");
    const { payload, targetWorkspaceId } = createAutomationFailurePolicyReviewPayload(policy, status);
    pageState.cardGeneration.automationFailurePolicies = Object.assign({}, pageState.cardGeneration.automationFailurePolicies, {
      actionStatus: "submitting",
      actionResult: pageState.cardGeneration.automationFailurePolicies?.actionResult || null,
      actionError: ""
    });
    renderShell();
    try {
      const result = await api.reviewGrowthAutomationFailurePolicy(policyId, payload, targetWorkspaceId);
      pageState.cardGeneration.automationFailurePolicies = Object.assign({}, pageState.cardGeneration.automationFailurePolicies, {
        actionStatus: "reviewed",
        actionResult: result,
        actionError: ""
      });
      await refreshAutomationFailurePolicies(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshAutomationActionHandoffs(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshAutomationSchedulerExecutions(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshAutomationSchedulerRuns(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshReleaseWorkbench(targetWorkspaceId, pageState.cardGeneration.context);
      renderShell();
    } catch (error) {
      pageState.cardGeneration.automationFailurePolicies = Object.assign({}, pageState.cardGeneration.automationFailurePolicies, {
        actionStatus: "failed",
        actionError: error.message || String(error)
      });
      renderShell();
    }
  }

  async function createAutomationActionHandoffFromUi(button) {
    const digestId = clean(button.dataset.automationDigestId);
    const digest = findAutomationDigest(digestId);
    if (!digest) throw new Error("automation_digest_not_found");
    const { payload, targetWorkspaceId } = createAutomationActionHandoffPayload(digest);
    pageState.cardGeneration.automationActionHandoffs = Object.assign({}, pageState.cardGeneration.automationActionHandoffs, {
      actionStatus: "submitting",
      actionResult: pageState.cardGeneration.automationActionHandoffs?.actionResult || null,
      actionError: ""
    });
    renderShell();
    try {
      const result = await api.createGrowthAutomationActionHandoff(payload, targetWorkspaceId);
      pageState.cardGeneration.automationActionHandoffs = Object.assign({}, pageState.cardGeneration.automationActionHandoffs, {
        actionStatus: "created",
        actionResult: result,
        actionError: ""
      });
      await refreshAutomationActionHandoffs(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshAutomationSchedulerExecutions(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshAutomationSchedulerRuns(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshReleaseWorkbench(targetWorkspaceId, pageState.cardGeneration.context);
      renderShell();
    } catch (error) {
      pageState.cardGeneration.automationActionHandoffs = Object.assign({}, pageState.cardGeneration.automationActionHandoffs, {
        actionStatus: "failed",
        actionError: error.message || String(error)
      });
      renderShell();
    }
  }

  async function deliverAutomationActionHandoffFromUi(button) {
    const handoffId = clean(button.dataset.automationActionHandoffId);
    const handoff = findAutomationActionHandoff(handoffId);
    if (!handoff) throw new Error("automation_action_handoff_not_found");
    const { payload, targetWorkspaceId } = createAutomationActionHandoffDeliverPayload(handoff);
    pageState.cardGeneration.automationActionHandoffs = Object.assign({}, pageState.cardGeneration.automationActionHandoffs, {
      actionStatus: "submitting",
      actionResult: pageState.cardGeneration.automationActionHandoffs?.actionResult || null,
      actionError: ""
    });
    renderShell();
    try {
      const result = await api.deliverGrowthAutomationActionHandoff(handoffId, payload, targetWorkspaceId);
      pageState.cardGeneration.automationActionHandoffs = Object.assign({}, pageState.cardGeneration.automationActionHandoffs, {
        actionStatus: "delivered",
        actionResult: result,
        actionError: ""
      });
      await refreshAutomationActionHandoffs(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshAutomationSchedulerExecutions(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshAutomationSchedulerRuns(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshReleaseWorkbench(targetWorkspaceId, pageState.cardGeneration.context);
      renderShell();
    } catch (error) {
      pageState.cardGeneration.automationActionHandoffs = Object.assign({}, pageState.cardGeneration.automationActionHandoffs, {
        actionStatus: "failed",
        actionError: error.message || String(error)
      });
      renderShell();
    }
  }

  async function executeAutomationSchedulerOnceFromUi(button) {
    const handoffId = clean(button.dataset.automationActionHandoffId);
    const handoff = findAutomationActionHandoff(handoffId);
    if (!handoff) throw new Error("automation_action_handoff_not_found");
    const { payload, targetWorkspaceId } = createAutomationSchedulerExecutionPayload(handoff);
    pageState.cardGeneration.automationSchedulerExecutions = Object.assign({}, pageState.cardGeneration.automationSchedulerExecutions, {
      actionStatus: "submitting",
      actionResult: pageState.cardGeneration.automationSchedulerExecutions?.actionResult || null,
      actionError: ""
    });
    renderShell();
    try {
      const result = await api.executeGrowthAutomationSchedulerOnce(payload, targetWorkspaceId);
      pageState.cardGeneration.automationSchedulerExecutions = Object.assign({}, pageState.cardGeneration.automationSchedulerExecutions, {
        actionStatus: "executed",
        actionResult: result,
        actionError: ""
      });
      await refreshAutomationSchedulerExecutions(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshReleaseWorkbench(targetWorkspaceId, pageState.cardGeneration.context);
      renderShell();
    } catch (error) {
      pageState.cardGeneration.automationSchedulerExecutions = Object.assign({}, pageState.cardGeneration.automationSchedulerExecutions, {
        actionStatus: "failed",
        actionError: error.message || String(error)
      });
      await refreshAutomationSchedulerExecutions(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshReleaseWorkbench(targetWorkspaceId, pageState.cardGeneration.context);
      renderShell();
    }
  }

  async function runAutomationSchedulerOnceFromUi() {
    const { payload, targetWorkspaceId } = createAutomationSchedulerRunPayload();
    pageState.cardGeneration.automationSchedulerRuns = Object.assign({}, pageState.cardGeneration.automationSchedulerRuns, {
      actionStatus: "submitting",
      actionResult: pageState.cardGeneration.automationSchedulerRuns?.actionResult || null,
      actionError: ""
    });
    renderShell();
    try {
      const result = await api.runGrowthAutomationSchedulerOnce(payload, targetWorkspaceId);
      pageState.cardGeneration.automationSchedulerRuns = Object.assign({}, pageState.cardGeneration.automationSchedulerRuns, {
        actionStatus: "ran",
        actionResult: result,
        actionError: ""
      });
      await refreshAutomationSchedulerRuns(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshAutomationSchedulerExecutions(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshReleaseWorkbench(targetWorkspaceId, pageState.cardGeneration.context);
      renderShell();
    } catch (error) {
      pageState.cardGeneration.automationSchedulerRuns = Object.assign({}, pageState.cardGeneration.automationSchedulerRuns, {
        actionStatus: "failed",
        actionError: error.message || String(error)
      });
      await refreshAutomationSchedulerRuns(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshAutomationSchedulerExecutions(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshReleaseWorkbench(targetWorkspaceId, pageState.cardGeneration.context);
      renderShell();
    }
  }

  async function createAutomationSchedulerWorkerTargetFromUi() {
    const { payload, targetWorkspaceId } = createAutomationSchedulerWorkerTargetPayload();
    pageState.cardGeneration.automationSchedulerWorkerTargets = Object.assign({}, pageState.cardGeneration.automationSchedulerWorkerTargets, {
      actionStatus: "submitting",
      actionResult: pageState.cardGeneration.automationSchedulerWorkerTargets?.actionResult || null,
      actionError: ""
    });
    renderShell();
    try {
      const result = await api.createGrowthAutomationSchedulerWorkerTarget(payload, targetWorkspaceId);
      pageState.cardGeneration.automationSchedulerWorkerTargets = Object.assign({}, pageState.cardGeneration.automationSchedulerWorkerTargets, {
        actionStatus: "created",
        actionResult: result,
        actionError: ""
      });
      await refreshAutomationSchedulerWorkerTargets(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshReleaseWorkbench(targetWorkspaceId, pageState.cardGeneration.context);
      renderShell();
    } catch (error) {
      pageState.cardGeneration.automationSchedulerWorkerTargets = Object.assign({}, pageState.cardGeneration.automationSchedulerWorkerTargets, {
        actionStatus: "failed",
        actionError: error.message || String(error)
      });
      await refreshAutomationSchedulerWorkerTargets(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshReleaseWorkbench(targetWorkspaceId, pageState.cardGeneration.context);
      renderShell();
    }
  }

  async function reviewAutomationSchedulerWorkerTargetFromUi(button) {
    const targetId = clean(button.dataset.automationSchedulerWorkerTargetId);
    const status = clean(button.dataset.automationSchedulerWorkerTargetStatus);
    const target = findAutomationSchedulerWorkerTarget(targetId);
    if (!target) throw new Error("automation_scheduler_worker_target_not_found");
    const { payload, targetWorkspaceId } = createAutomationSchedulerWorkerTargetReviewPayload(target, status);
    pageState.cardGeneration.automationSchedulerWorkerTargets = Object.assign({}, pageState.cardGeneration.automationSchedulerWorkerTargets, {
      actionStatus: "submitting",
      actionResult: pageState.cardGeneration.automationSchedulerWorkerTargets?.actionResult || null,
      actionError: ""
    });
    renderShell();
    try {
      const result = await api.reviewGrowthAutomationSchedulerWorkerTarget(targetId, payload, targetWorkspaceId);
      pageState.cardGeneration.automationSchedulerWorkerTargets = Object.assign({}, pageState.cardGeneration.automationSchedulerWorkerTargets, {
        actionStatus: "reviewed",
        actionResult: result,
        actionError: ""
      });
      await refreshAutomationSchedulerWorkerTargets(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshReleaseWorkbench(targetWorkspaceId, pageState.cardGeneration.context);
      renderShell();
    } catch (error) {
      pageState.cardGeneration.automationSchedulerWorkerTargets = Object.assign({}, pageState.cardGeneration.automationSchedulerWorkerTargets, {
        actionStatus: "failed",
        actionError: error.message || String(error)
      });
      await refreshAutomationSchedulerWorkerTargets(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshReleaseWorkbench(targetWorkspaceId, pageState.cardGeneration.context);
      renderShell();
    }
  }

  async function publishAutomationProposalFromUi(button) {
    const proposalId = clean(button.dataset.automationProposalId);
    const proposal = findAutomationProposal(proposalId);
    if (!proposal) throw new Error("automation_proposal_not_found");
    const { payload, targetWorkspaceId } = createAutomationProposalPublishPayload(proposal);
    pageState.cardGeneration.automationProposals = Object.assign({}, pageState.cardGeneration.automationProposals, {
      actionStatus: "submitting",
      actionResult: pageState.cardGeneration.automationProposals?.actionResult || null,
      actionError: ""
    });
    renderShell();
    try {
      const result = await api.publishGrowthAutomationProposal(proposalId, payload, targetWorkspaceId);
      pageState.cardGeneration.automationProposals = Object.assign({}, pageState.cardGeneration.automationProposals, {
        actionStatus: result.ok ? "published" : "failed",
        actionResult: result,
        actionError: result.ok ? "" : clean(result.error || "automation_proposal_publish_failed")
      });
      model.detailCache.clear();
      try {
        await loadCurrentWorkspace();
      } catch (refreshError) {
        pageState.cardGeneration.automationProposals.actionError = `建议已处理，但刷新列表失败：${refreshError.message || String(refreshError)}`;
      }
      await refreshCardGenerationContextAfterPublish(targetWorkspaceId, { errorPrefix: "建议已处理，但" });
      await refreshAutomationProposalReviewStack(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshOwnerCycleDrilldownFromUi({ silent: true });
      renderShell();
    } catch (error) {
      pageState.cardGeneration.automationProposals = Object.assign({}, pageState.cardGeneration.automationProposals, {
        actionStatus: "failed",
        actionError: error.message || String(error)
      });
      renderShell();
    }
  }

  async function reviewRecommendationLifecycleFromUi(button) {
    const { payload, targetWorkspaceId } = createRecommendationLifecycleDecisionPayload(button);
    pageState.cardGeneration.recommendationLifecycle = Object.assign({}, pageState.cardGeneration.recommendationLifecycle, {
      actionStatus: "submitting",
      actionResult: pageState.cardGeneration.recommendationLifecycle?.actionResult || null,
      actionError: ""
    });
    renderShell();
    try {
      const result = await api.reviewGrowthRecommendationLifecycle(payload, targetWorkspaceId);
      pageState.cardGeneration.recommendationLifecycle = Object.assign({}, pageState.cardGeneration.recommendationLifecycle, {
        actionStatus: "reviewed",
        actionResult: result,
        actionError: ""
      });
      await refreshCardGenerationContextAfterPublish(targetWorkspaceId, { errorPrefix: "推荐状态已记录，但" });
      renderShell();
    } catch (error) {
      pageState.cardGeneration.recommendationLifecycle = Object.assign({}, pageState.cardGeneration.recommendationLifecycle, {
        actionStatus: "failed",
        actionError: error.message || String(error)
      });
      renderShell();
    }
  }

  async function refreshCardGenerationContextAfterPublish(targetWorkspaceId = cardGenerationWorkspaceId(), options = {}) {
    if (!pageState.auth.isOwner) return null;
    const requestedTargetWorkspaceId = clean(targetWorkspaceId || currentWorkspaceId);
    try {
      const selection = targetProvisionSelection();
      const context = await api.fetchCardGenerationContext(requestedTargetWorkspaceId, selection);
      pageState.cardGeneration.context = context;
      pageState.cardGeneration.selectedWorkspaceId = clean(context?.target?.workspaceId || requestedTargetWorkspaceId);
      pageState.cardGeneration.targetProvisionDraft = selectionFromContext(context, Object.assign({}, selection, {
        status: pageState.cardGeneration.targetProvisionDraft?.status || "idle",
        result: pageState.cardGeneration.targetProvisionDraft?.result || null,
        error: pageState.cardGeneration.targetProvisionDraft?.error || ""
      }));
      await refreshStageCheckpointControls(requestedTargetWorkspaceId, context);
      await refreshLearningLoopState(requestedTargetWorkspaceId, context);
      await refreshOperatingLoopRuns(requestedTargetWorkspaceId, context, { silent: true });
      await refreshCycleHistoryFromUi({ silent: true });
      await refreshOwnerAuditReviews(requestedTargetWorkspaceId, context, { silent: true });
      await refreshReferenceChain(requestedTargetWorkspaceId, context);
      await refreshAutomationProposals(requestedTargetWorkspaceId, context, { silent: true });
      await refreshAutomationDigests(requestedTargetWorkspaceId, context, { silent: true });
      await refreshAutomationFailurePolicies(requestedTargetWorkspaceId, context, { silent: true });
      await refreshAutomationActionHandoffs(requestedTargetWorkspaceId, context, { silent: true });
      await refreshAutomationSchedulerExecutions(requestedTargetWorkspaceId, context, { silent: true });
      await refreshAutomationSchedulerRuns(requestedTargetWorkspaceId, context, { silent: true });
      await refreshAutomationSchedulerWorkerTargets(requestedTargetWorkspaceId, context, { silent: true });
      await refreshReleaseWorkbench(requestedTargetWorkspaceId, context);
      return context;
    } catch (refreshError) {
      const message = refreshError.message || String(refreshError);
      const fallbackPrefix = clean(options.errorPrefix) || "卡片已发布，但";
      const prefix = pageState.cardGeneration.error ? `${pageState.cardGeneration.error}；` : fallbackPrefix;
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

  function stageAssessmentAction(controls = {}, key = "") {
    return asArray(controls.actions).find((action) => clean(action.key) === key) || null;
  }

  async function refreshStageCheckpointControls(targetWorkspaceId = cardGenerationWorkspaceId(), context = pageState.cardGeneration.context) {
    if (!pageState.auth.isOwner || !context) return null;
    const previous = pageState.cardGeneration.stageAssessment || {};
    const payload = window.HermesGrowthCardGenerationUi.createStageAssessmentPayload({
      context,
      workspaceId: clean(targetWorkspaceId || context?.target?.workspaceId || currentWorkspaceId),
      activationSource: "owner_manual"
    });
    pageState.cardGeneration.stageAssessment = {
      status: previous.status || "idle",
      eligibility: previous.eligibility || null,
      result: previous.result || null,
      controls: previous.controls || null,
      controlsStatus: "loading",
      controlsError: "",
      error: previous.error || ""
    };
    try {
      const result = await api.fetchGrowthStageCheckpointControls(payload, targetWorkspaceId);
      pageState.cardGeneration.stageAssessment = {
        status: result.summary?.status || result.readiness?.activationState || previous.status || "idle",
        eligibility: previous.eligibility || null,
        result: previous.result || null,
        controls: result,
        controlsStatus: "ready",
        controlsError: "",
        error: previous.error || ""
      };
      return result;
    } catch (error) {
      pageState.cardGeneration.stageAssessment = {
        status: previous.status || "failed",
        eligibility: previous.eligibility || null,
        result: previous.result || null,
        controls: previous.controls || null,
        controlsStatus: "failed",
        controlsError: error.message || String(error),
        error: previous.error || ""
      };
      return null;
    }
  }

  async function refreshStageCheckpointControlsFromUi() {
    const context = pageState.cardGeneration.context;
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    pageState.cardGeneration.stageAssessment = Object.assign({}, pageState.cardGeneration.stageAssessment, {
      status: "checking",
      controlsStatus: "loading",
      controlsError: "",
      error: ""
    });
    renderShell();
    await refreshStageCheckpointControls(targetWorkspaceId, context);
    renderShell();
  }

  function createDailyLoopDraftPayload() {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createDailyLoopDraftPayload !== "function") {
      throw new Error("card_generation_ui_unavailable");
    }
    const context = pageState.cardGeneration.context;
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createDailyLoopDraftPayload({
        context,
        workspaceId: targetWorkspaceId,
        selection: pageState.cardGeneration.targetProvisionDraft || {}
      }),
      targetWorkspaceId
    };
  }

  function createDailyLoopAdvancePayload() {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createDailyLoopAdvancePayload !== "function") {
      throw new Error("card_generation_ui_unavailable");
    }
    const context = pageState.cardGeneration.context;
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createDailyLoopAdvancePayload({
        context,
        workspaceId: targetWorkspaceId,
        selection: pageState.cardGeneration.targetProvisionDraft || {}
      }),
      targetWorkspaceId
    };
  }

  function createDailyLoopPublishPayload() {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createDailyLoopPublishPayload !== "function") {
      throw new Error("card_generation_ui_unavailable");
    }
    const context = pageState.cardGeneration.context;
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createDailyLoopPublishPayload({
        context,
        workspaceId: targetWorkspaceId,
        draftResult: pageState.cardGeneration.dailyLoopDraftResult || {},
        selection: pageState.cardGeneration.targetProvisionDraft || {}
      }),
      targetWorkspaceId
    };
  }

  function createTargetProvisionPayload() {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createTargetProvisionPayload !== "function") {
      throw new Error("target_provision_ui_unavailable");
    }
    const context = pageState.cardGeneration.context;
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createTargetProvisionPayload({
        context,
        workspaceId: targetWorkspaceId,
        draft: pageState.cardGeneration.targetProvisionDraft || {}
      }),
      targetWorkspaceId
    };
  }

  function createOwnerCorrectionPayload() {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createOwnerCorrectionPayload !== "function") {
      throw new Error("owner_correction_ui_unavailable");
    }
    const context = pageState.cardGeneration.context;
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    return {
      payload: ui.createOwnerCorrectionPayload({
        context,
        workspaceId: targetWorkspaceId,
        draft: {
          note: pageState.cardGeneration.ownerCorrectionDraft,
          reviewAction: pageState.cardGeneration.ownerCorrectionAction
        }
      }),
      targetWorkspaceId
    };
  }

  function createOwnerAuditReviewQueryPayload() {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createOwnerAuditReviewQueryPayload !== "function") {
      throw new Error("owner_audit_review_ui_unavailable");
    }
    const context = pageState.cardGeneration.context;
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    const payload = ui.createOwnerAuditReviewQueryPayload({
      context,
      workspaceId: targetWorkspaceId,
      selectedCycle: pageState.cardGeneration.cycleHistory?.selectedCycle || {}
    });
    return { payload, targetWorkspaceId };
  }

  function createOwnerAuditReviewPayload(decision = "accepted") {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createOwnerAuditReviewPayload !== "function") {
      throw new Error("owner_audit_review_ui_unavailable");
    }
    const context = pageState.cardGeneration.context;
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    const payload = ui.createOwnerAuditReviewPayload({
      context,
      workspaceId: targetWorkspaceId,
      selectedCycle: pageState.cardGeneration.cycleHistory?.selectedCycle || {},
      decision,
      note: pageState.cardGeneration.ownerAuditReviewDraft || ""
    });
    return { payload, targetWorkspaceId };
  }

  function cycleHistoryItems() {
    const history = pageState.cardGeneration.cycleHistory || {};
    const data = history.data || {};
    return Array.isArray(data.cycles) ? data.cycles : [];
  }

  function cycleHistoryKey(cycle = {}, index = 0) {
    const ui = window.HermesGrowthCardGenerationUi;
    if (ui && typeof ui.cycleHistoryItemKey === "function") {
      return ui.cycleHistoryItemKey(cycle, index);
    }
    const selectors = cycle.selectors || {};
    return [
      selectors.taskCardId || cycle.taskCardId,
      selectors.evaluationId || cycle.evaluationId,
      selectors.profileDeltaId || cycle.profileDeltaId,
      selectors.planDraftId || cycle.planDraftId,
      selectors.correctionId || cycle.correctionId,
      index
    ].map(clean).filter(Boolean).join(":") || `cycle:${index}`;
  }

  function selectCycleHistoryItem(key = "") {
    const selectedKey = clean(key);
    const cycles = cycleHistoryItems();
    const index = cycles.findIndex((cycle, cycleIndex) => cycleHistoryKey(cycle, cycleIndex) === selectedKey);
    const selectedCycle = index >= 0 ? cycles[index] : null;
    pageState.cardGeneration.cycleHistory = Object.assign({}, pageState.cardGeneration.cycleHistory || {}, {
      selectedCycleKey: selectedCycle ? selectedKey : "",
      selectedCycle,
      error: selectedCycle ? "" : "未找到可选择的历史周期。"
    });
    return selectedCycle;
  }

  function createCycleHistoryQueryPayload() {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createCycleHistoryQueryPayload !== "function") {
      throw new Error("cycle_history_ui_unavailable");
    }
    const context = pageState.cardGeneration.context;
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    const payload = ui.createCycleHistoryQueryPayload({
      context,
      workspaceId: targetWorkspaceId,
      selectedCycle: pageState.cardGeneration.cycleHistory?.selectedCycle || {}
    });
    return { payload, targetWorkspaceId };
  }

  function createCycleAuditQueryPayload() {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createCycleAuditQueryPayload !== "function") {
      throw new Error("cycle_audit_ui_unavailable");
    }
    const context = pageState.cardGeneration.context;
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    const payload = ui.createCycleAuditQueryPayload({
      context,
      workspaceId: targetWorkspaceId,
      draftResult: pageState.cardGeneration.dailyLoopDraftResult || {},
      publishResult: pageState.cardGeneration.dailyLoopPublishResult || {},
      generatedResult: pageState.cardGeneration.generatedResult || {},
      selectedCycle: pageState.cardGeneration.cycleHistory?.selectedCycle || {}
    });
    return { payload, targetWorkspaceId };
  }

  async function refreshCycleHistoryFromUi(options = {}) {
    if (!pageState.auth.isOwner || !pageState.cardGeneration.context) return null;
    const { payload, targetWorkspaceId } = createCycleHistoryQueryPayload();
    const previous = pageState.cardGeneration.cycleHistory || {};
    pageState.cardGeneration.cycleHistory = Object.assign({}, previous, {
      status: "loading",
      error: ""
    });
    if (!options.silent) renderShell();
    try {
      const result = await api.fetchGrowthCycleHistory(payload, targetWorkspaceId);
      const cycles = Array.isArray(result.cycles) ? result.cycles : [];
      let selectedCycleKey = previous.selectedCycleKey || "";
      let selectedCycle = null;
      if (selectedCycleKey) {
        const index = cycles.findIndex((cycle, cycleIndex) => cycleHistoryKey(cycle, cycleIndex) === selectedCycleKey);
        if (index >= 0) selectedCycle = cycles[index];
        else selectedCycleKey = "";
      }
      pageState.cardGeneration.cycleHistory = {
        status: "ready",
        data: result,
        selectedCycleKey,
        selectedCycle,
        error: ""
      };
      if (options.refreshDrilldown && selectedCycle) {
        await refreshOwnerCycleDrilldownFromUi({ silent: true });
      }
      if (!options.silent) renderShell();
      return result;
    } catch (error) {
      pageState.cardGeneration.cycleHistory = Object.assign({}, previous, {
        status: "failed",
        error: error.message || String(error)
      });
      if (!options.silent) renderShell();
      return null;
    }
  }

  async function refreshOwnerCycleDrilldownFromUi(options = {}) {
    const { payload, targetWorkspaceId } = createCycleAuditQueryPayload();
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.cycleAuditHasAnchor !== "function" || !ui.cycleAuditHasAnchor(payload)) {
      pageState.cardGeneration.cycleDrilldown = {
        status: "failed",
        audit: pageState.cardGeneration.cycleDrilldown?.audit || null,
        completeness: pageState.cardGeneration.cycleDrilldown?.completeness || null,
        error: "还没有可读取的单卡 cycle anchor。"
      };
      if (!options.silent) renderShell();
      return null;
    }
    pageState.cardGeneration.cycleDrilldown = {
      status: "loading",
      audit: pageState.cardGeneration.cycleDrilldown?.audit || null,
      completeness: pageState.cardGeneration.cycleDrilldown?.completeness || null,
      error: ""
    };
    if (!options.silent) renderShell();
    try {
      const [audit, completeness] = await Promise.all([
        api.fetchGrowthCycleAudit(payload, targetWorkspaceId),
        api.fetchGrowthCycleCompleteness(payload, targetWorkspaceId)
      ]);
      pageState.cardGeneration.cycleDrilldown = {
        status: "ready",
        audit,
        completeness,
        error: ""
      };
      if (!options.silent) renderShell();
      return { audit, completeness };
    } catch (error) {
      pageState.cardGeneration.cycleDrilldown = {
        status: "failed",
        audit: pageState.cardGeneration.cycleDrilldown?.audit || null,
        completeness: pageState.cardGeneration.cycleDrilldown?.completeness || null,
        error: error.message || String(error)
      };
      if (!options.silent) renderShell();
      return null;
    }
  }

  async function provisionTargetDomainPackFromUi() {
    const { payload, targetWorkspaceId } = createTargetProvisionPayload();
    if (!clean(payload.domain_pack_id) || !clean(payload.subject)) {
      pageState.cardGeneration.targetProvisionDraft = Object.assign({}, pageState.cardGeneration.targetProvisionDraft, {
        status: "failed",
        error: "请先选择 domain pack 和 subject。"
      });
      renderShell();
      return;
    }
    pageState.cardGeneration.targetProvisionDraft = Object.assign({}, pageState.cardGeneration.targetProvisionDraft, {
      status: "submitting",
      error: ""
    });
    renderShell();
    try {
      const result = await api.provisionGrowthDomainPack(payload, targetWorkspaceId);
      pageState.cardGeneration.targetProvisionDraft = Object.assign({}, pageState.cardGeneration.targetProvisionDraft, {
        status: "submitted",
        result,
        error: ""
      });
      const context = await api.fetchCardGenerationContext(targetWorkspaceId, targetProvisionSelection());
      pageState.cardGeneration.context = context;
      pageState.cardGeneration.selectedWorkspaceId = clean(context?.target?.workspaceId || targetWorkspaceId);
      pageState.cardGeneration.targetProvisionDraft = selectionFromContext(context, Object.assign({}, pageState.cardGeneration.targetProvisionDraft, {
        status: "submitted",
        result,
        error: ""
      }));
      pageState.cardGeneration.dailyLoopDraftResult = null;
      pageState.cardGeneration.dailyLoopPublishResult = null;
      pageState.cardGeneration.generatedResult = null;
      pageState.cardGeneration.cycleDrilldown = {
        status: "idle",
        audit: null,
        completeness: null,
        error: ""
      };
      pageState.cardGeneration.cycleHistory = {
        status: "idle",
        data: null,
        selectedCycleKey: "",
        selectedCycle: null,
        error: ""
      };
      pageState.cardGeneration.referenceChain = {
        status: "loading",
        objectTypes: pageState.cardGeneration.referenceChain?.objectTypes || null,
        requests: [],
        summaries: [],
        error: ""
      };
      pageState.cardGeneration.ownerAuditReviewDraft = "";
      pageState.cardGeneration.ownerAuditReviews = {
        status: "idle",
        data: null,
        error: "",
        actionStatus: "idle",
        actionResult: null,
        actionError: ""
      };
      pageState.cardGeneration.operatingLoop = {
        status: "idle",
        data: null,
        error: "",
        actionStatus: "idle",
        actionResult: null,
        actionError: ""
      };
      pageState.cardGeneration.automationProposals = {
        status: "idle",
        data: null,
        error: "",
        actionStatus: "idle",
        actionResult: null,
        actionError: ""
      };
      pageState.cardGeneration.automationDigests = {
        status: "idle",
        data: null,
        error: "",
        actionStatus: "idle",
        actionResult: null,
        actionError: ""
      };
      pageState.cardGeneration.automationFailurePolicies = {
        status: "idle",
        data: null,
        error: "",
        actionStatus: "idle",
        actionResult: null,
        actionError: ""
      };
      pageState.cardGeneration.automationActionHandoffs = {
        status: "idle",
        data: null,
        error: "",
        actionStatus: "idle",
        actionResult: null,
        actionError: ""
      };
      pageState.cardGeneration.automationSchedulerExecutions = {
        status: "idle",
        data: null,
        error: "",
        actionStatus: "idle",
        actionResult: null,
        actionError: ""
      };
      pageState.cardGeneration.automationSchedulerRuns = {
        status: "idle",
        data: null,
        error: "",
        actionStatus: "idle",
        actionResult: null,
        actionError: ""
      };
      pageState.cardGeneration.automationSchedulerWorkerTargets = {
        status: "idle",
        data: null,
        error: "",
        actionStatus: "idle",
        actionResult: null,
        actionError: ""
      };
      await refreshLearningLoopState(targetWorkspaceId, context);
      await refreshOperatingLoopRuns(targetWorkspaceId, context, { silent: true });
      await refreshCycleHistoryFromUi({ silent: true });
      await refreshOwnerAuditReviews(targetWorkspaceId, context, { silent: true });
      await refreshReferenceChain(targetWorkspaceId, context);
      await refreshAutomationProposals(targetWorkspaceId, context, { silent: true });
      await refreshAutomationDigests(targetWorkspaceId, context, { silent: true });
      await refreshAutomationFailurePolicies(targetWorkspaceId, context, { silent: true });
      await refreshAutomationActionHandoffs(targetWorkspaceId, context, { silent: true });
      await refreshAutomationSchedulerExecutions(targetWorkspaceId, context, { silent: true });
      await refreshAutomationSchedulerRuns(targetWorkspaceId, context, { silent: true });
      await refreshAutomationSchedulerWorkerTargets(targetWorkspaceId, context, { silent: true });
      await refreshReleaseWorkbench(targetWorkspaceId, context);
      renderShell();
    } catch (error) {
      pageState.cardGeneration.targetProvisionDraft = Object.assign({}, pageState.cardGeneration.targetProvisionDraft, {
        status: "failed",
        error: error.message || String(error)
      });
      renderShell();
    }
  }

  async function advanceDailyLoopFromUi() {
    const { payload, targetWorkspaceId } = createDailyLoopAdvancePayload();
    pageState.cardGeneration.status = "advancing";
    pageState.cardGeneration.error = "";
    pageState.cardGeneration.dailyLoopDraftResult = null;
    pageState.cardGeneration.dailyLoopPublishResult = null;
    pageState.cardGeneration.generatedResult = null;
    pageState.cardGeneration.cycleDrilldown = {
      status: "idle",
      audit: null,
      completeness: null,
      error: ""
    };
    pageState.cardGeneration.cycleHistory = Object.assign({}, pageState.cardGeneration.cycleHistory || {}, {
      selectedCycleKey: "",
      selectedCycle: null,
      error: ""
    });
    pageState.cardGeneration.referenceChain = Object.assign({}, pageState.cardGeneration.referenceChain || {}, {
      status: "loading",
      requests: [],
      summaries: [],
      error: ""
    });
    pageState.cardGeneration.progressStep = "context";
    pageState.cardGeneration.progressMessage = "正在整理学习图谱、画像摘要和近期信号。";
    renderShell();
    scheduleCardGenerationProgress("advance");
    try {
      const result = await api.advanceGrowthDailyLoop(payload, targetWorkspaceId);
      clearCardGenerationProgressTimers();
      pageState.cardGeneration.status = "published";
      pageState.cardGeneration.dailyLoopDraftResult = {
        ok: result.draftStep?.ok !== false,
        operation: "draft",
        planDraft: result.planDraft || null,
        gatewayMode: result.draftStep?.gatewayMode || ""
      };
      pageState.cardGeneration.dailyLoopPublishResult = result;
      pageState.cardGeneration.generatedResult = result.generation || result;
      pageState.cardGeneration.context = result.context || pageState.cardGeneration.context;
      pageState.cardGeneration.selectedWorkspaceId = clean(result.target?.workspaceId || targetWorkspaceId);
      pageState.cardGeneration.targetProvisionDraft = selectionFromContext(pageState.cardGeneration.context, pageState.cardGeneration.targetProvisionDraft || {});
      pageState.cardGeneration.error = "";
      pageState.cardGeneration.progressStep = "done";
      pageState.cardGeneration.progressMessage = "卡片已生成并发布，正在刷新学习闭环状态。";
      model.detailCache.clear();
      try {
        await loadCurrentWorkspace();
      } catch (refreshError) {
        pageState.cardGeneration.error = `卡片已发布，但刷新列表失败：${refreshError.message || String(refreshError)}`;
      }
      await refreshCardGenerationContextAfterPublish(targetWorkspaceId);
      await refreshOwnerCycleDrilldownFromUi({ silent: true });
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

  async function draftDailyLoopFromUi() {
    const { payload, targetWorkspaceId } = createDailyLoopDraftPayload();
    pageState.cardGeneration.status = "drafting";
    pageState.cardGeneration.error = "";
    pageState.cardGeneration.dailyLoopDraftResult = null;
    pageState.cardGeneration.dailyLoopPublishResult = null;
    pageState.cardGeneration.generatedResult = null;
    pageState.cardGeneration.cycleDrilldown = {
      status: "idle",
      audit: null,
      completeness: null,
      error: ""
    };
    pageState.cardGeneration.cycleHistory = Object.assign({}, pageState.cardGeneration.cycleHistory || {}, {
      selectedCycleKey: "",
      selectedCycle: null,
      error: ""
    });
    pageState.cardGeneration.referenceChain = Object.assign({}, pageState.cardGeneration.referenceChain || {}, {
      status: "loading",
      requests: [],
      summaries: [],
      error: ""
    });
    pageState.cardGeneration.progressStep = "context";
    pageState.cardGeneration.progressMessage = "正在整理学习图谱、画像摘要和近期信号。";
    renderShell();
    scheduleCardGenerationProgress("draft");
    try {
      const result = await api.draftGrowthDailyLoop(payload, targetWorkspaceId);
      clearCardGenerationProgressTimers();
      pageState.cardGeneration.status = "drafted";
      pageState.cardGeneration.dailyLoopDraftResult = result;
      pageState.cardGeneration.context = result.context || pageState.cardGeneration.context;
      pageState.cardGeneration.selectedWorkspaceId = clean(result.target?.workspaceId || targetWorkspaceId);
      pageState.cardGeneration.targetProvisionDraft = selectionFromContext(pageState.cardGeneration.context, pageState.cardGeneration.targetProvisionDraft || {});
      pageState.cardGeneration.error = "";
      pageState.cardGeneration.progressStep = "validation";
      pageState.cardGeneration.progressMessage = "计划草稿已生成，请检查后发布。";
      await refreshLearningLoopState(targetWorkspaceId, pageState.cardGeneration.context);
      await refreshOperatingLoopRuns(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshReferenceChain(targetWorkspaceId, pageState.cardGeneration.context);
      await refreshAutomationProposals(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshReleaseWorkbench(targetWorkspaceId, pageState.cardGeneration.context);
      renderShell();
    } catch (error) {
      clearCardGenerationProgressTimers();
      pageState.cardGeneration.status = "failed";
      pageState.cardGeneration.error = error.message || String(error);
      pageState.cardGeneration.progressStep = "failed";
      pageState.cardGeneration.progressMessage = "规划失败。";
      renderShell();
    }
  }

  async function publishDailyLoopFromUi() {
    const { payload, targetWorkspaceId } = createDailyLoopPublishPayload();
    pageState.cardGeneration.status = "publishing";
    pageState.cardGeneration.error = "";
    pageState.cardGeneration.dailyLoopPublishResult = null;
    pageState.cardGeneration.generatedResult = null;
    pageState.cardGeneration.cycleDrilldown = {
      status: "idle",
      audit: null,
      completeness: null,
      error: ""
    };
    pageState.cardGeneration.cycleHistory = Object.assign({}, pageState.cardGeneration.cycleHistory || {}, {
      selectedCycleKey: "",
      selectedCycle: null,
      error: ""
    });
    pageState.cardGeneration.referenceChain = Object.assign({}, pageState.cardGeneration.referenceChain || {}, {
      status: "loading",
      requests: [],
      summaries: [],
      error: ""
    });
    pageState.cardGeneration.progressStep = "authoring";
    pageState.cardGeneration.progressMessage = "正在根据已验证计划项生成卡片。";
    renderShell();
    scheduleCardGenerationProgress("publish");
    try {
      const result = await api.publishGrowthDailyLoop(payload, targetWorkspaceId);
      clearCardGenerationProgressTimers();
      pageState.cardGeneration.status = "published";
      pageState.cardGeneration.dailyLoopPublishResult = result;
      pageState.cardGeneration.dailyLoopDraftResult = result.planDraft
        ? Object.assign({}, pageState.cardGeneration.dailyLoopDraftResult || {}, { planDraft: result.planDraft })
        : pageState.cardGeneration.dailyLoopDraftResult;
      pageState.cardGeneration.generatedResult = result.generation || result;
      pageState.cardGeneration.context = result.context || pageState.cardGeneration.context;
      pageState.cardGeneration.targetProvisionDraft = selectionFromContext(pageState.cardGeneration.context, pageState.cardGeneration.targetProvisionDraft || {});
      pageState.cardGeneration.error = "";
      pageState.cardGeneration.progressStep = "done";
      pageState.cardGeneration.progressMessage = "卡片已发布，正在刷新学习闭环状态。";
      model.detailCache.clear();
      try {
        await loadCurrentWorkspace();
      } catch (refreshError) {
        pageState.cardGeneration.error = `卡片已发布，但刷新列表失败：${refreshError.message || String(refreshError)}`;
      }
      await refreshCardGenerationContextAfterPublish(targetWorkspaceId);
      await refreshOwnerCycleDrilldownFromUi({ silent: true });
      renderShell();
    } catch (error) {
      clearCardGenerationProgressTimers();
      pageState.cardGeneration.status = "failed";
      pageState.cardGeneration.error = error.message || String(error);
      pageState.cardGeneration.progressStep = "failed";
      pageState.cardGeneration.progressMessage = "发布失败。";
      renderShell();
    }
  }

  async function advanceOperatingLoopFromUi() {
    const { payload, targetWorkspaceId } = createOperatingLoopAdvancePayload();
    pageState.cardGeneration.status = "advancing";
    pageState.cardGeneration.error = "";
    pageState.cardGeneration.progressStep = "context";
    pageState.cardGeneration.progressMessage = "正在通过服务端闭环 Facade 执行当前 next action。";
    pageState.cardGeneration.operatingLoop = Object.assign({}, pageState.cardGeneration.operatingLoop || {}, {
      actionStatus: "running",
      actionResult: pageState.cardGeneration.operatingLoop?.actionResult || null,
      actionError: ""
    });
    renderShell();
    scheduleCardGenerationProgress("advance");
    try {
      const result = await api.advanceLearningOperatingLoop(payload, targetWorkspaceId);
      clearCardGenerationProgressTimers();
      const actionResult = result.actionResult || {};
      const summary = result.summary || {};
      const taskCardId = clean(summary.taskCardId || actionResult.taskCardId);
      const planDraftId = clean(summary.planDraftId || actionResult.planDraftId);
      const selectedItemId = clean(actionResult.selectedItemId || actionResult.selected_item_id);
      pageState.cardGeneration.status = result.ok ? "published" : "failed";
      pageState.cardGeneration.operatingLoop = Object.assign({}, pageState.cardGeneration.operatingLoop || {}, {
        actionStatus: result.ok ? "executed" : clean(result.status || "failed"),
        actionResult: result,
        actionError: result.ok ? "" : clean(result.error || "operating_loop_advance_failed")
      });
      if (planDraftId || taskCardId) {
        pageState.cardGeneration.dailyLoopPublishResult = {
          ok: result.ok === true,
          operation: "operating_loop_advance",
          planDraft: {
            planDraftId,
            selectedItemId,
            generatedTaskCardId: taskCardId
          },
          generation: taskCardId ? { published: { taskCardId } } : null,
          publishAttempt: {
            status: result.status || (result.ok ? "executed" : "failed"),
            error: result.error || ""
          }
        };
        pageState.cardGeneration.generatedResult = taskCardId ? { published: { taskCardId } } : pageState.cardGeneration.generatedResult;
      }
      pageState.cardGeneration.progressStep = "done";
      pageState.cardGeneration.progressMessage = result.ok ? "闭环执行完成，正在刷新状态。" : "闭环执行未完成，请查看错误。";
      model.detailCache.clear();
      try {
        await loadCurrentWorkspace();
      } catch (refreshError) {
        pageState.cardGeneration.error = `闭环已执行，但刷新列表失败：${refreshError.message || String(refreshError)}`;
      }
      await refreshCardGenerationContextAfterPublish(targetWorkspaceId, { errorPrefix: "闭环已执行，但" });
      await refreshOperatingLoopRuns(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      await refreshOwnerCycleDrilldownFromUi({ silent: true });
      renderShell();
    } catch (error) {
      clearCardGenerationProgressTimers();
      pageState.cardGeneration.status = "failed";
      pageState.cardGeneration.error = error.message || String(error);
      pageState.cardGeneration.progressStep = "failed";
      pageState.cardGeneration.progressMessage = "闭环执行失败。";
      pageState.cardGeneration.operatingLoop = Object.assign({}, pageState.cardGeneration.operatingLoop || {}, {
        actionStatus: "failed",
        actionError: error.message || String(error)
      });
      renderShell();
    }
  }

  async function submitOwnerCorrectionFromUi() {
    const { payload, targetWorkspaceId } = createOwnerCorrectionPayload();
    if (!clean(payload.reason || payload.note)) {
      pageState.cardGeneration.ownerCorrection = {
        status: "failed",
        result: pageState.cardGeneration.ownerCorrection?.result || null,
        error: "请先填写一条简短纠偏说明。"
      };
      renderShell();
      return;
    }
    pageState.cardGeneration.ownerCorrection = {
      status: "submitting",
      result: pageState.cardGeneration.ownerCorrection?.result || null,
      error: ""
    };
    renderShell();
    try {
      const result = await api.submitGrowthProfileCorrection(payload, targetWorkspaceId);
      pageState.cardGeneration.ownerCorrectionDraft = "";
      pageState.cardGeneration.ownerCorrection = {
        status: "submitted",
        result,
        error: ""
      };
      await refreshCardGenerationContextAfterPublish(targetWorkspaceId, { errorPrefix: "纠偏已保存，但" });
      renderShell();
    } catch (error) {
      pageState.cardGeneration.ownerCorrection = {
        status: "failed",
        result: pageState.cardGeneration.ownerCorrection?.result || null,
        error: error.message || String(error)
      };
      renderShell();
    }
  }

  async function recordOwnerAuditReviewFromUi(decision = "accepted") {
    const { payload, targetWorkspaceId } = createOwnerAuditReviewPayload(clean(decision) || "accepted");
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.ownerAuditReviewHasAnchor !== "function" || !ui.ownerAuditReviewHasAnchor(payload)) {
      pageState.cardGeneration.ownerAuditReviews = Object.assign({}, pageState.cardGeneration.ownerAuditReviews || {}, {
        actionStatus: "blocked",
        actionError: "请先选择一条完成周期。"
      });
      renderShell();
      return;
    }
    if (payload.decision === "correction_recorded" && !clean(payload.correction_id)) {
      pageState.cardGeneration.ownerAuditReviews = Object.assign({}, pageState.cardGeneration.ownerAuditReviews || {}, {
        actionStatus: "blocked",
        actionError: "记录已纠偏前，需要先保存 Owner 纠偏。"
      });
      renderShell();
      return;
    }
    pageState.cardGeneration.ownerAuditReviews = Object.assign({}, pageState.cardGeneration.ownerAuditReviews || {}, {
      actionStatus: "submitting",
      actionResult: pageState.cardGeneration.ownerAuditReviews?.actionResult || null,
      actionError: ""
    });
    renderShell();
    try {
      const result = await api.recordGrowthOwnerAuditReview(payload, targetWorkspaceId);
      pageState.cardGeneration.ownerAuditReviewDraft = "";
      pageState.cardGeneration.ownerAuditReviews = Object.assign({}, pageState.cardGeneration.ownerAuditReviews || {}, {
        actionStatus: "reviewed",
        actionResult: result,
        actionError: ""
      });
      await refreshCardGenerationContextAfterPublish(targetWorkspaceId, { errorPrefix: "完成周期审核已记录，但" });
      await refreshOwnerAuditReviews(targetWorkspaceId, pageState.cardGeneration.context, { silent: true });
      renderShell();
    } catch (error) {
      pageState.cardGeneration.ownerAuditReviews = Object.assign({}, pageState.cardGeneration.ownerAuditReviews || {}, {
        actionStatus: "failed",
        actionError: error.message || String(error)
      });
      renderShell();
    }
  }

  function currentReleaseWorkbenchSummary() {
    const holder = pageState.cardGeneration.releaseWorkbench || {};
    const data = holder.data || pageState.cardGeneration.context?.releaseWorkbench || {};
    return data.releaseWorkbench || data || {};
  }

  function findReleaseWorkbenchAction(endpointKey = "", actionKey = "") {
    const summary = currentReleaseWorkbenchSummary();
    const actions = Array.isArray(summary.ownerActions) ? summary.ownerActions : [];
    const wantedEndpointKey = clean(endpointKey);
    const wantedActionKey = clean(actionKey);
    return actions.find((action = {}) => {
      return clean(action.endpointKey || action.endpoint_key) === wantedEndpointKey
        && clean(action.key || action.actionKey || action.action_key) === wantedActionKey;
    }) || actions.find((action = {}) => clean(action.endpointKey || action.endpoint_key) === wantedEndpointKey) || null;
  }

  function createReleaseWorkbenchActionPayloadFromButton(button) {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createReleaseWorkbenchActionPayload !== "function") {
      throw new Error("release_workbench_ui_unavailable");
    }
    const context = pageState.cardGeneration.context || {};
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    const action = findReleaseWorkbenchAction(button.dataset.releaseWorkbenchEndpointKey, button.dataset.releaseWorkbenchActionKey);
    if (!action) throw new Error("release_workbench_action_not_found");
    const endpointKey = clean(button.dataset.releaseWorkbenchEndpointKey);
    const releasePackage = endpointKey === "release_package"
      ? pageState.cardGeneration.releaseWorkbench?.packageCandidate || pageState.cardGeneration.releaseWorkbench?.packageResult?.package || null
      : null;
    return {
      payload: ui.createReleaseWorkbenchActionPayload({ context, workspaceId: targetWorkspaceId, action, releasePackage }),
      targetWorkspaceId
    };
  }

  function createReleasePackageBuildPayloadFromButton(button) {
    const ui = window.HermesGrowthCardGenerationUi;
    if (!ui || typeof ui.createReleasePackageBuildPayload !== "function") {
      throw new Error("release_package_build_ui_unavailable");
    }
    const context = pageState.cardGeneration.context || {};
    const targetWorkspaceId = clean(pageState.cardGeneration.selectedWorkspaceId || context?.target?.workspaceId || currentWorkspaceId);
    const action = findReleaseWorkbenchAction(button.dataset.releaseWorkbenchEndpointKey, button.dataset.releaseWorkbenchActionKey);
    if (!action) throw new Error("release_workbench_action_not_found");
    return {
      payload: ui.createReleasePackageBuildPayload({ context, workspaceId: targetWorkspaceId, action }),
      targetWorkspaceId
    };
  }

  async function buildReleasePackageFromUi(button) {
    const { payload, targetWorkspaceId } = createReleasePackageBuildPayloadFromButton(button);
    pageState.cardGeneration.releaseWorkbench = Object.assign({}, pageState.cardGeneration.releaseWorkbench, {
      packageStatus: "building",
      packageResult: pageState.cardGeneration.releaseWorkbench?.packageResult || null,
      packageCandidate: pageState.cardGeneration.releaseWorkbench?.packageCandidate || null,
      packageError: ""
    });
    renderShell();
    try {
      const result = await api.buildGrowthReleasePackage(payload, targetWorkspaceId);
      const candidate = result?.package || result?.releasePackage || result?.release_package || null;
      const packageStatus = candidate
        ? result?.ok === false ? "blocked" : "ready"
        : "blocked";
      pageState.cardGeneration.releaseWorkbench = Object.assign({}, pageState.cardGeneration.releaseWorkbench, {
        packageStatus,
        packageResult: result,
        packageCandidate: candidate,
        packageError: result?.ok === false ? clean(result.error) || "release_package_candidate_blocked" : ""
      });
      renderShell();
    } catch (error) {
      pageState.cardGeneration.releaseWorkbench = Object.assign({}, pageState.cardGeneration.releaseWorkbench, {
        packageStatus: "failed",
        packageError: error.message || String(error)
      });
      renderShell();
    }
  }

  async function recordReleaseWorkbenchActionFromUi(button) {
    const blockedReason = clean(button.dataset.releaseWorkbenchBlockedReason);
    if (blockedReason) {
      pageState.cardGeneration.releaseWorkbench = Object.assign({}, pageState.cardGeneration.releaseWorkbench, {
        actionStatus: "failed",
        actionError: blockedReason
      });
      renderShell();
      return;
    }
    const { payload, targetWorkspaceId } = createReleaseWorkbenchActionPayloadFromButton(button);
    pageState.cardGeneration.releaseWorkbench = Object.assign({}, pageState.cardGeneration.releaseWorkbench, {
      actionStatus: "recording",
      actionResult: pageState.cardGeneration.releaseWorkbench?.actionResult || null,
      actionError: ""
    });
    renderShell();
    try {
      const result = await api.recordGrowthReleaseWorkbenchAction(payload, targetWorkspaceId);
      pageState.cardGeneration.releaseWorkbench = Object.assign({}, pageState.cardGeneration.releaseWorkbench, {
        actionStatus: "recorded",
        actionResult: result,
        actionError: ""
      });
      await refreshReleaseWorkbench(targetWorkspaceId, pageState.cardGeneration.context);
      renderShell();
    } catch (error) {
      pageState.cardGeneration.releaseWorkbench = Object.assign({}, pageState.cardGeneration.releaseWorkbench, {
        actionStatus: "failed",
        actionError: error.message || String(error)
      });
      renderShell();
    }
  }

  async function activateStageAssessmentFromUi() {
    const { payload, targetWorkspaceId } = createStageAssessmentPayload("owner_manual");
    const controls = pageState.cardGeneration.stageAssessment?.controls || null;
    const activateAction = stageAssessmentAction(controls || {}, "activate_stage_assessment");
    if (!controls || controls.ok !== true) {
      throw new Error("stage_checkpoint_controls_required");
    }
    if (!activateAction || activateAction.enabled !== true) {
      throw new Error(clean(activateAction?.disabledReason) || "stage_checkpoint_controls_activation_disabled");
    }
    pageState.cardGeneration.status = "generating";
    pageState.cardGeneration.error = "";
    pageState.cardGeneration.generatedResult = null;
    pageState.cardGeneration.cycleDrilldown = {
      status: "idle",
      audit: null,
      completeness: null,
      error: ""
    };
    pageState.cardGeneration.progressStep = "context";
    pageState.cardGeneration.progressMessage = "正在整理阶段测评覆盖点和学习画像。";
    pageState.cardGeneration.stageAssessment = Object.assign({}, pageState.cardGeneration.stageAssessment, {
      status: "activating",
      error: ""
    });
    renderShell();
    scheduleCardGenerationProgress("publish");
    try {
      const result = await api.activateGrowthStageAssessment(payload, targetWorkspaceId);
      clearCardGenerationProgressTimers();
      pageState.cardGeneration.status = "published";
      pageState.cardGeneration.generatedResult = result.generation || result;
      pageState.cardGeneration.targetProvisionDraft = selectionFromContext(pageState.cardGeneration.context, pageState.cardGeneration.targetProvisionDraft || {});
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
      await refreshOwnerCycleDrilldownFromUi({ silent: true });
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
    pageState.cardGeneration = initialCardGenerationState();
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
