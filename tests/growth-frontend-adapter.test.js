const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadPublicScript(fileName) {
  const windowRef = {};
  const context = vm.createContext({
    window: windowRef,
    globalThis: windowRef,
    URL,
    URLSearchParams,
    console
  });
  const source = fs.readFileSync(path.join(__dirname, "..", "public", fileName), "utf8");
  vm.runInContext(source, context, { filename: fileName });
  return windowRef;
}

function countMatches(value, pattern) {
  return (String(value || "").match(pattern) || []).length;
}

test("Growth appearance adapter normalizes host theme and font-size payloads", () => {
  const windowRef = loadPublicScript("growth-appearance.js");
  const params = new URLSearchParams("pluginTheme=dark&pluginFontSize=default");
  const documentRef = { documentElement: { dataset: {} } };
  const appearance = windowRef.HermesGrowthAppearance.createGrowthAppearance({ params, documentRef });

  appearance.applyAppearance();
  assert.equal(documentRef.documentElement.dataset.theme, "dark");
  assert.equal(documentRef.documentElement.dataset.fontSize, "standard");

  appearance.applyAppearance({ pluginTheme: "light", pluginFontSize: "xxlarge" });
  assert.equal(documentRef.documentElement.dataset.theme, "light");
  assert.equal(documentRef.documentElement.dataset.fontSize, "xxlarge");
});

test("Growth appearance adapter applies Home AI plugin viewport metrics", () => {
  const windowRef = loadPublicScript("growth-appearance.js");
  const styles = new Map();
  const classes = new Map();
  const documentRef = {
    documentElement: {
      dataset: {},
      style: { setProperty: (name, value) => styles.set(name, value) },
      classList: { toggle: (name, value) => classes.set(name, Boolean(value)) }
    }
  };
  const appearance = windowRef.HermesGrowthAppearance.createGrowthAppearance({
    params: new URLSearchParams(),
    documentRef
  });

  assert.equal(appearance.applyViewport({
    type: "hermes.plugin.viewport",
    version: 1,
    pluginId: "growth",
    reason: "test",
    viewport: { width: 390, height: 612, offsetTop: 4, layoutHeight: 640 },
    iframe: { width: 390, height: 512 },
    keyboard: { visible: false, bottomInset: 0 },
    footer: { hostBottomSafeArea: 18 }
  }), true);

  assert.equal(styles.get("--app-height"), "512px");
  assert.equal(styles.get("--app-viewport-height"), "512px");
  assert.equal(styles.get("--host-bottom-safe-area"), "18px");
  assert.equal(styles.get("--growth-host-bottom-safe-area"), "18px");
  assert.equal(styles.get("--growth-keyboard-bottom"), "0px");
  assert.equal(classes.get("keyboard-open"), false);
  assert.equal(classes.get("growth-keyboard-open"), false);

  appearance.applyViewport({
    type: "hermes.plugin.viewport",
    version: 1,
    pluginId: "growth",
    viewport: { width: 390, height: 318, layoutHeight: 640 },
    iframe: { width: 390, height: 512 },
    keyboard: { visible: true, bottomInset: 322 },
    footer: { safeAreaBottom: 0 }
  });

  assert.equal(styles.get("--app-height"), "318px");
  assert.equal(styles.get("--growth-keyboard-bottom"), "322px");
  assert.equal(classes.get("keyboard-open"), true);
});

test("Growth appearance adapter exposes the host viewport handler expected by visual harnesses", () => {
  const windowRef = loadPublicScript("growth-appearance.js");
  const listeners = [];
  windowRef.addEventListener = (eventName, handler) => listeners.push({ eventName, handler });
  const styles = new Map();
  const documentRef = {
    documentElement: {
      dataset: {},
      style: { setProperty: (name, value) => styles.set(name, value) },
      classList: { toggle: () => null }
    }
  };
  const appearance = windowRef.HermesGrowthAppearance.createGrowthAppearance({
    params: new URLSearchParams(),
    documentRef
  });

  appearance.bindAppearanceMessages(windowRef);
  assert.equal(typeof windowRef.handleHermesPluginViewportMessage, "function");
  assert.equal(typeof windowRef.__hermesGrowthVisualHarness.hostViewport, "function");
  assert.equal(listeners[0].eventName, "message");

  assert.equal(windowRef.handleHermesPluginViewportMessage({
    type: "hermes.plugin.viewport",
    version: 1,
    pluginId: "growth",
    iframe: { height: 444 },
    viewport: { height: 500 },
    keyboard: { visible: false }
  }), true);
  assert.equal(styles.get("--app-height"), "444px");
  assert.equal(windowRef.__hermesGrowthVisualHarness.hostViewport().iframe.height, 444);
});

test("Growth API client keeps workspace query and fetch errors bounded", async () => {
  const windowRef = loadPublicScript("growth-api-client.js");
  const historyCalls = [];
  const client = windowRef.HermesGrowthApiClient.createGrowthApiClient({
    getWorkspaceId: () => "weixin_child",
    historyRef: { replaceState: (...args) => historyCalls.push(args) },
    locationRef: { href: "http://127.0.0.1:4881/?embed=hermes" },
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      json: async () => ({ ok: false, error: "facade_down" })
    })
  });

  assert.equal(client.workspaceQuery(), "?workspaceId=weixin_child");
  client.updateWorkspaceUrl();
  assert.match(historyCalls[0][2], /workspaceId=weixin_child/);
  await assert.rejects(() => client.fetchJson("/api/v1/growth/status"), /facade_down/);
});

test("Growth API client exposes card generation context and write helpers", async () => {
  const windowRef = loadPublicScript("growth-api-client.js");
  const calls = [];
  const client = windowRef.HermesGrowthApiClient.createGrowthApiClient({
    getWorkspaceId: () => "weixin_fanfan",
    historyRef: { replaceState: () => null },
    locationRef: { href: "http://127.0.0.1:4881/?embed=hermes" },
    fetchImpl: async (path, options = {}) => {
      calls.push({ path, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, path })
      };
    }
  });

  await client.fetchCardGenerationContext("weixin_fanfan");
  await client.fetchLearningLoopState("weixin_fanfan", {
    target: { learnerId: "fanfan" },
    suggestedPlan: {
      domain: "english",
      subject: "english",
      targetNodeIds: ["kg_main_idea", "kg_evidence"]
    },
    generationDefaults: { availableMinutes: 15 }
  });
  await client.generateGrowthCard({ target_node_id: "kg_english_main_idea" }, "weixin_fanfan");
  await client.fetchGrowthCard("ltask_daily_1", "weixin_fanfan");
  await client.submitGrowthCardEvidence("ltask_daily_1", {
    text: "I found the main idea.",
    audio: { dataBase64: "YXVkaW8=", name: "answer.webm", mime: "audio/webm" }
  }, "weixin_fanfan");
  await client.submitGrowthCardReflection("ltask_daily_1", { text: "Next time I will add evidence." }, "weixin_fanfan");
  await client.submitGrowthExperienceSignal("ltask_daily_1", { signalType: "too_hard", targetNodeIds: ["kg_main_idea"] }, "weixin_fanfan");
  await client.evaluateGrowthStageAssessment({ target_node_id: "kg_main_idea", assessment_coverage_node_ids: ["kg_main_idea"] }, "weixin_fanfan");
  await client.activateGrowthStageAssessment({ target_node_id: "kg_main_idea", assessment_coverage_node_ids: ["kg_main_idea"], activation_source: "owner_manual" }, "weixin_fanfan");
  await client.processGrowthEvaluations("weixin_fanfan", 3);
  await client.retryGrowthEvaluation({ task_card_id: "ltask_daily_1", reason: "owner retry" }, "weixin_fanfan");
  await client.draftGrowthDailyLoop({ target_node_ids: ["kg_main_idea"] }, "weixin_fanfan");
  await client.publishGrowthDailyLoop({ plan_draft_id: "lgplan_1", selected_item_id: "plan_item_1" }, "weixin_fanfan");

  assert.equal(calls[0].path, "/api/v1/growth/card-generation/context?workspaceId=weixin_fanfan");
  assert.equal(calls[1].path, "/api/v1/growth/learning-loop/state?workspaceId=weixin_fanfan&learnerId=fanfan&domain=english&subject=english&horizon=daily_plan&availableMinutes=15&targetNodeIds=kg_main_idea%2Ckg_evidence");
  assert.equal(calls[2].path, "/api/v1/growth/cards/generate");
  assert.equal(calls[2].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[2].options.body), {
    workspace_id: "weixin_fanfan",
    target_node_id: "kg_english_main_idea"
  });
  assert.equal(calls[3].path, "/api/v1/growth/cards/ltask_daily_1?workspaceId=weixin_fanfan");
  assert.equal(calls[4].path, "/api/v1/growth/cards/ltask_daily_1/submissions");
  assert.deepEqual(JSON.parse(calls[4].options.body), {
    workspace_id: "weixin_fanfan",
    text: "I found the main idea.",
    audio: { dataBase64: "YXVkaW8=", name: "answer.webm", mime: "audio/webm" }
  });
  assert.equal(calls[5].path, "/api/v1/growth/cards/ltask_daily_1/reflections");
  assert.equal(calls[6].path, "/api/v1/growth/cards/ltask_daily_1/experience-signals");
  assert.deepEqual(JSON.parse(calls[6].options.body), {
    workspace_id: "weixin_fanfan",
    signalType: "too_hard",
    targetNodeIds: ["kg_main_idea"]
  });
  assert.equal(calls[7].path, "/api/v1/growth/stage-assessments/eligibility");
  assert.deepEqual(JSON.parse(calls[7].options.body), {
    workspace_id: "weixin_fanfan",
    target_node_id: "kg_main_idea",
    assessment_coverage_node_ids: ["kg_main_idea"]
  });
  assert.equal(calls[8].path, "/api/v1/growth/stage-assessments/activate");
  assert.deepEqual(JSON.parse(calls[8].options.body), {
    workspace_id: "weixin_fanfan",
    target_node_id: "kg_main_idea",
    assessment_coverage_node_ids: ["kg_main_idea"],
    activation_source: "owner_manual"
  });
  assert.equal(calls[9].path, "/api/v1/growth/evaluations/process");
  assert.deepEqual(JSON.parse(calls[9].options.body), { workspace_id: "weixin_fanfan", limit: 3 });
  assert.equal(calls[10].path, "/api/v1/growth/evaluations/owner-review");
  assert.deepEqual(JSON.parse(calls[10].options.body), {
    workspace_id: "weixin_fanfan",
    action: "retry",
    task_card_id: "ltask_daily_1",
    reason: "owner retry"
  });
  assert.equal(calls[11].path, "/api/v1/growth/daily-loop/draft");
  assert.deepEqual(JSON.parse(calls[11].options.body), {
    workspace_id: "weixin_fanfan",
    target_node_ids: ["kg_main_idea"]
  });
  assert.equal(calls[12].path, "/api/v1/growth/daily-loop/publish");
  assert.deepEqual(JSON.parse(calls[12].options.body), {
    workspace_id: "weixin_fanfan",
    plan_draft_id: "lgplan_1",
    selected_item_id: "plan_item_1"
  });
});

test("Growth API client routes API calls through the Home AI plugin proxy when embedded", async () => {
  const windowRef = loadPublicScript("growth-api-client.js");
  const calls = [];
  const client = windowRef.HermesGrowthApiClient.createGrowthApiClient({
    getWorkspaceId: () => "owner",
    historyRef: { replaceState: () => null },
    locationRef: { href: "http://homeai.local/api/hermes-plugins/growth/proxy/?embed=hermes&workspaceId=owner" },
    fetchImpl: async (path, options = {}) => {
      calls.push({ path, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true })
      };
    }
  });

  await client.fetchCardGenerationContext("weixin_stephen");
  await client.fetchLearningLoopState("weixin_stephen", { target: { learnerId: "fanfan" } });
  await client.generateGrowthCard({ target_node_id: "kg_english_main_idea" }, "weixin_stephen");
  await client.draftGrowthDailyLoop({ target_node_ids: ["kg_english_main_idea"] }, "weixin_stephen");
  await client.publishGrowthDailyLoop({ plan_draft_id: "lgplan_1", selected_item_id: "plan_item_1" }, "weixin_stephen");
  const audioUrl = client.resolveGrowthApiPath("/api/v1/growth/audio/submissions/submission_1", "weixin_stephen");

  assert.equal(calls[0].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/card-generation/context?targetWorkspaceId=weixin_stephen");
  assert.equal(calls[1].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/learning-loop/state?targetWorkspaceId=weixin_stephen&learnerId=fanfan&horizon=daily_plan&availableMinutes=15");
  assert.equal(calls[2].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/cards/generate");
  assert.equal(calls[3].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/daily-loop/draft");
  assert.equal(calls[4].path, "/api/hermes-plugins/growth/proxy/api/v1/growth/daily-loop/publish");
  assert.equal(audioUrl, "/api/hermes-plugins/growth/proxy/api/v1/growth/audio/submissions/submission_1?workspaceId=weixin_stephen");
});

test("Growth API client avoids proxy-rewritten API string literals", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "public", "growth-api-client.js"), "utf8");
  assert.doesNotMatch(source, /["'`]\/api\/v1\/growth/);
  assert.doesNotMatch(source, /["'`]\/api\/hermes-plugins\/growth\/proxy/);
});

test("Growth card interaction controller chooses a recordable MIME that the browser can play", () => {
  const windowRef = loadPublicScript("growth-card-interaction-controller.js");
  const helper = windowRef.HermesGrowthCardInteractionController.__test;
  const safariLikeRoot = {
    MediaRecorder: { isTypeSupported: (type) => ["audio/mp4", "audio/webm"].includes(type) },
    Audio: function Audio() {
      this.canPlayType = (type) => type === "audio/mp4" ? "probably" : "";
    }
  };
  const chromiumLikeRoot = {
    MediaRecorder: { isTypeSupported: (type) => type.startsWith("audio/webm") },
    Audio: function Audio() {
      this.canPlayType = (type) => type.startsWith("audio/webm") ? "maybe" : "";
    }
  };

  assert.equal(helper.preferredAudioMimeType(safariLikeRoot), "audio/mp4");
  assert.equal(helper.preferredAudioMimeType(chromiumLikeRoot), "audio/webm;codecs=opus");
});

test("Growth card interaction controller records visible preview playback failures", () => {
  const windowRef = loadPublicScript("growth-card-interaction-controller.js");
  const pageState = {
    cardGeneration: {},
    learningGrowthInteractionMessages: {},
    learningGrowthRecordings: {
      "card_1:submission": { status: "ready", url: "blob:bad", message: "录音已准备" }
    }
  };
  let renders = 0;
  const controller = windowRef.HermesGrowthCardInteractionController.createGrowthCardInteractionController({
    api: {},
    pageState,
    model: { overview: {}, board: {}, detailCache: new Map() },
    viewModel: { normalizeCard: (card) => card },
    renderShell: () => {
      renders += 1;
    },
    refreshCard: async () => null,
    getCurrentWorkspaceId: () => "weixin_fanfan"
  });

  controller.handleRecordingPlaybackError("card_1", "submission");
  assert.equal(pageState.learningGrowthRecordings["card_1:submission"].playbackError, true);
  assert.match(pageState.learningGrowthRecordings["card_1:submission"].message, /无法回放/);
  assert.equal(renders, 1);

  controller.handleRecordingPlaybackError("card_1", "submission");
  assert.equal(renders, 1);
});

test("Growth card interaction controller submits experience signal and refreshes card", async () => {
  const windowRef = loadPublicScript("growth-card-interaction-controller.js");
  const calls = [];
  const refreshed = [];
  const pageState = {
    cardGeneration: {},
    learningGrowthExperienceSignalBusy: {},
    learningGrowthExperienceSignalSubmitted: {},
    learningGrowthInteractionMessages: {},
    learningGrowthRecordings: {}
  };
  const controller = windowRef.HermesGrowthCardInteractionController.createGrowthCardInteractionController({
    api: {
      async submitGrowthExperienceSignal(taskCardId, payload, workspaceId) {
        calls.push({ taskCardId, payload, workspaceId });
        return { ok: true };
      }
    },
    pageState,
    model: {
      overview: {
        programs: { taskCards: [{ taskCardId: "card_1", workspaceId: "weixin_fanfan" }] },
        board: { cards: [] }
      },
      detailCache: new Map()
    },
    viewModel: { normalizeCard: (card) => card },
    renderShell: () => null,
    refreshCard: async (cardId, workspaceId) => refreshed.push({ cardId, workspaceId }),
    getCurrentWorkspaceId: () => "owner"
  });

  await controller.submitExperienceSignal({
    taskCardId: "card_1",
    signalType: "too_hard",
    targetNodeIds: ["kg_main_idea"]
  });

  assert.equal(calls[0].taskCardId, "card_1");
  assert.equal(calls[0].workspaceId, "weixin_fanfan");
  assert.equal(JSON.stringify(calls[0].payload), JSON.stringify({
    signalType: "too_hard",
    targetNodeIds: ["kg_main_idea"],
    source: "growth-plugin-card-ui"
  }));
  assert.equal(pageState.learningGrowthExperienceSignalSubmitted.card_1, "too_hard");
  assert.equal(pageState.learningGrowthExperienceSignalBusy.card_1, "");
  assert.equal(pageState.learningGrowthInteractionMessages["card_1:experience"], "难度感受已记录。");
  assert.deepEqual(refreshed[0], { cardId: "card_1", workspaceId: "weixin_fanfan" });
});

test("Growth card interaction controller lets Owner retry a failed evaluation and refresh", async () => {
  const windowRef = loadPublicScript("growth-card-interaction-controller.js");
  const calls = [];
  const refreshed = [];
  let renders = 0;
  const pageState = {
    cardGeneration: {},
    learningGrowthEvaluationBusy: {},
    learningGrowthInteractionMessages: {},
    learningGrowthRecordings: {}
  };
  const controller = windowRef.HermesGrowthCardInteractionController.createGrowthCardInteractionController({
    api: {
      async retryGrowthEvaluation(payload, workspaceId) {
        calls.push({ type: "retry", payload, workspaceId });
        return { ok: true };
      },
      async processGrowthEvaluations(workspaceId, limit) {
        calls.push({ type: "process", workspaceId, limit });
        return { ok: true, processed: 1 };
      }
    },
    pageState,
    model: {
      overview: {
        programs: { taskCards: [{ taskCardId: "card_1", workspaceId: "weixin_fanfan" }] },
        board: { cards: [] }
      },
      detailCache: new Map()
    },
    viewModel: { normalizeCard: (card) => card },
    renderShell: () => {
      renders += 1;
    },
    refreshCard: async (cardId, workspaceId) => refreshed.push({ cardId, workspaceId }),
    getCurrentWorkspaceId: () => "owner"
  });

  await controller.retryEvaluation("card_1");

  assert.equal(calls[0].type, "retry");
  assert.equal(calls[0].workspaceId, "weixin_fanfan");
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].payload)), {
    task_card_id: "card_1",
    reason: "owner_retry_from_growth_ui"
  });
  assert.deepEqual(calls[1], { type: "process", workspaceId: "weixin_fanfan", limit: 3 });
  assert.equal(pageState.learningGrowthEvaluationBusy.card_1, false);
  assert.equal(pageState.learningGrowthInteractionMessages["card_1:evaluation"], "批改状态已刷新。");
  assert.deepEqual(refreshed[0], { cardId: "card_1", workspaceId: "weixin_fanfan" });
  assert.ok(renders >= 3);
});

test("Growth card generation UI renders Owner panel and structured payload", () => {
  const windowRef = loadPublicScript("growth-card-generation-ui.js");
  const context = {
    target: { workspaceId: "weixin_fanfan", learnerId: "fanfan", displayName: "凡凡", enabled: true },
    selectedRecipeId: "daily_english_v1",
    recipes: [{ id: "daily_english_v1", label: "日常英语卡", durationMinutes: { min: 10, max: 15 } }],
    readiness: {
      ready: true,
      targetEnabled: true,
      workspaceProvisioned: true,
      learningGraphReady: true,
      historySummaryReady: true,
      gatewayConfigured: true,
      authoringGatewayConfigured: true,
      evaluationGatewayConfigured: true,
      plannerGatewayConfigured: true,
      plannerContextReady: true,
      plannerReady: true,
      aiLoopGatewayReady: true,
      operatingLoopGatewayReady: true,
      blockingOpenGeneration: false
    },
    graph: { nodeCount: 294, edgeCount: 329 },
    suggestedPlan: {
      targetNodeId: "kg_english_main_idea",
      targetNodeIds: ["kg_english_main_idea"],
      title: "Find the main idea",
      domain: "english",
      cardRole: "practice",
      difficultyBand: "foundation",
      evidenceRequirements: ["short_answer"]
    },
    nextCardRecommendation: {
      ok: true,
      selectionMode: "recommendation",
      recommendationMode: "trajectory",
      strategy: "repair",
      cardRole: "teaching",
      difficultyBand: "repair",
      supportLevel: "guided",
      targetNodeId: "kg_english_evidence_answering",
      targetNodeIds: ["kg_english_evidence_answering"],
      reason: "Latest trajectory asks for one evidence repair card."
    },
    recommendationLifecycle: [{
      trajectoryId: "traj_accepted",
      status: "accepted",
      strategy: "repair",
      targetNodeIds: ["kg_english_evidence_answering"],
      reason: "Generated an evidence repair card.",
      generatedTaskCardId: "ltask_generated_1"
    }, {
      trajectoryId: "traj_superseded",
      status: "superseded",
      strategy: "stretch",
      targetNodeIds: ["kg_english_main_idea"],
      reason: "Older stretch suggestion was replaced.",
      supersededByTrajectoryId: "traj_accepted"
    }, {
      trajectoryId: "traj_pending",
      status: "pending",
      strategy: "stabilize",
      targetNodeIds: ["kg_english_vocab_context"],
      reason: "Pending daily practice suggestion."
    }],
    learningProfile: {
      ok: true,
      summary: {
        masteryStateCount: 2,
        weaknessCount: 1,
        strengthCount: 1,
        recentExperienceSignalCount: 1,
        recentTrajectoryCount: 1
      },
      weaknesses: [{
        nodeId: "kg_english_evidence_answering",
        status: "developing",
        score: 64,
        summary: "Needs exact text evidence."
      }],
      recentTrajectory: [{
        taskCardId: "ltask_1",
        strategy: "stabilize",
        performanceSummary: "Score 64; evidence was vague."
      }],
      nextCardStrategy: {
        strategy: "stabilize",
        reason: "Use one more short evidence-answering card."
      }
    },
    completionPolicy: { mode: "daily_score_once" },
    historySummary: { learnerSummary: { recentCardCount: 6, completedRecentCardCount: 4, evaluationCount: 4, reflectionCount: 1 } }
  };

  const html = windowRef.HermesGrowthCardGenerationUi.renderOwnerCardGenerationPanel({
    state: {
      cardGeneration: {
        status: "ready",
        context,
        dailyLoopDraftResult: {
          ok: true,
          planDraft: {
            planDraftId: "lgplan_1",
            workspaceId: "weixin_fanfan",
            learnerId: "fanfan",
            status: "drafted",
            planSummary: "One short evidence repair card.",
            selectedItemId: "plan_item_1",
            itemCount: 1,
            targetNodeIds: ["kg_english_evidence_answering"],
            items: [{
              itemId: "plan_item_1",
              cardRole: "teaching",
              difficultyBand: "repair",
              supportLevel: "guided",
              targetNodeIds: ["kg_english_evidence_answering"],
              evidenceRequirements: ["short_answer"],
              reason: "Repair exact evidence."
            }]
          }
        },
        learningLoopState: {
          status: "ready",
          data: {
            schemaVersion: "growth.learningLoopState.v1",
            status: "ready_to_draft",
            summary: { weaknessCount: 1, missingRequired: [] },
            profile: { weaknessCount: 1 },
            audit: { missingRequired: [] },
            stageAssessment: { eligible: false, status: "dormant" },
            nextAction: {
              action: "draft_daily_plan",
              reason: "next_strategy:repair"
            }
          }
        }
      }
    },
    viewTargets: [
      { workspaceId: "weixin_fanfan", label: "凡凡" },
      { workspaceId: "weixin_stephen", label: "Stephen" }
    ],
    workspaceId: "weixin_fanfan"
  });
  assert.match(html, /data-card-generation-manager/);
  assert.match(html, /日常英语卡/);
  assert.match(html, /data-card-generation-draft/);
  assert.match(html, /data-card-generation-publish/);
  assert.match(html, /规划下一张/);
  assert.match(html, /发布为卡片/);
  assert.match(html, /data-card-generation-plan-preview/);
  assert.match(html, /lgplan_1/);
  assert.match(html, /plan_item_1/);
  assert.match(html, /Gateway evaluation/);
  assert.match(html, /Planner Gateway/);
  assert.match(html, /data-learning-loop-state-panel/);
  assert.match(html, /data-learning-loop-state-status="ready_to_draft"/);
  assert.match(html, /学习闭环/);
  assert.match(html, /起草日常计划/);
  assert.match(html, /下一张策略：repair/);
  assert.match(html, /data-card-generation-profile/);
  assert.match(html, /data-card-generation-recommendation/);
  assert.match(html, /data-card-generation-lifecycle/);
  assert.match(html, /推荐闭环/);
  assert.match(html, /已生成/);
  assert.match(html, /已替换/);
  assert.match(html, /待生成/);
  assert.match(html, /ltask_generated_1/);
  assert.match(html, /traj_accepted/);
  assert.match(html, /data-recommendation-mode="trajectory"/);
  assert.match(html, /学习画像/);
  assert.match(html, /评价轨迹/);
  assert.match(html, /kg_english_evidence_answering/);
  assert.match(html, /Latest trajectory asks for one evidence repair card/);
  assert.match(html, /data-stage-assessment-panel/);
  assert.match(html, /阶段测评/);
  assert.match(html, /data-stage-assessment-check/);
  assert.match(html, /data-stage-assessment-activate/);
  assert.match(html, /Needs exact text evidence/);
  assert.match(html, /weixin_stephen · 稍后开放/);
  assert.match(html, /daily_score_once/);
  assert.match(html, /mastery_trajectory_projection/);

  const payload = windowRef.HermesGrowthCardGenerationUi.createDailyEnglishGeneratePayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.equal(payload.workspace_id, "weixin_fanfan");
  assert.equal(payload.recipe_id, "daily_english_v1");
  assert.equal(payload.card_schema_version, "growth.card.authoring.v1");
  assert.equal(Object.hasOwn(payload, "target_node_id"), false);
  assert.equal(Object.hasOwn(payload, "card_role"), false);
  assert.equal(Object.hasOwn(payload, "difficulty_band"), false);
  assert.equal(Object.hasOwn(payload, "completion_policy"), false);
  assert.equal(Object.hasOwn(payload, "generation_key"), false);

  const draftPayload = windowRef.HermesGrowthCardGenerationUi.createDailyLoopDraftPayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.equal(draftPayload.workspace_id, "weixin_fanfan");
  assert.equal(draftPayload.learner_id, "fanfan");
  assert.equal(draftPayload.domain, "english");
  assert.equal(draftPayload.horizon, "daily_plan");
  assert.deepEqual(draftPayload.target_node_ids, ["kg_english_evidence_answering"]);

  const publishPayload = windowRef.HermesGrowthCardGenerationUi.createDailyLoopPublishPayload({
    context,
    workspaceId: "weixin_fanfan",
    draftResult: {
      planDraft: {
        planDraftId: "lgplan_1",
        selectedItemId: "plan_item_1",
        items: [{ itemId: "plan_item_1", targetNodeIds: ["kg_english_evidence_answering"] }]
      }
    }
  });
  assert.equal(publishPayload.workspace_id, "weixin_fanfan");
  assert.equal(publishPayload.plan_draft_id, "lgplan_1");
  assert.equal(publishPayload.selected_item_id, "plan_item_1");
  assert.deepEqual(publishPayload.target_node_ids, ["kg_english_evidence_answering"]);

  const stagePayload = windowRef.HermesGrowthCardGenerationUi.createStageAssessmentPayload({
    context,
    workspaceId: "weixin_fanfan",
    activationSource: "owner_manual"
  });
  assert.equal(stagePayload.workspace_id, "weixin_fanfan");
  assert.equal(stagePayload.target_node_id, "kg_english_main_idea");
  assert.deepEqual(stagePayload.assessment_coverage_node_ids, ["kg_english_main_idea"]);
  assert.equal(stagePayload.activation_source, "owner_manual");
  assert.equal(stagePayload.activation_reason, "owner_manual");
  assert.equal(stagePayload.difficulty_band, "assessment");
});

test("Growth card generation UI renders stage assessment eligibility and activation result", () => {
  const windowRef = loadPublicScript("growth-card-generation-ui.js");
  const context = {
    target: { workspaceId: "weixin_fanfan", learnerId: "weixin_fanfan", displayName: "凡凡", enabled: true },
    selectedRecipeId: "daily_english_v1",
    recipes: [{ id: "daily_english_v1", label: "日常英语卡" }],
    readiness: {
      ready: true,
      targetEnabled: true,
      workspaceProvisioned: true,
      learningGraphReady: true,
      historySummaryReady: true,
      gatewayConfigured: true,
      plannerGatewayConfigured: true,
      plannerContextReady: true,
      blockingOpenGeneration: false
    },
    graph: { nodeCount: 294, edgeCount: 329 },
    suggestedPlan: {
      targetNodeId: "kg_english_main_idea",
      targetNodeIds: ["kg_english_main_idea", "kg_english_inference"],
      title: "Reading checkpoint",
      domain: "english",
      evidenceRequirements: ["short_answer"]
    },
    learningProfile: { ok: true, summary: { recentTrajectoryCount: 4 } },
    historySummary: { learnerSummary: { recentCardCount: 6, completedRecentCardCount: 4 } }
  };

  const html = windowRef.HermesGrowthCardGenerationUi.renderOwnerCardGenerationPanel({
    state: {
      cardGeneration: {
        status: "ready",
        context,
        stageAssessment: {
          status: "active",
          eligibility: { ok: true, eligible: true, reason: "enough_recent_practice", cycle: { status: "eligible" } },
          result: { ok: true, activationState: "active", published: { taskCardId: "stage_card_1" } },
          error: ""
        }
      }
    },
    viewTargets: [{ workspaceId: "weixin_fanfan", label: "凡凡" }],
    workspaceId: "weixin_fanfan"
  });

  assert.match(html, /data-stage-assessment-status="active"/);
  assert.match(html, /近期练习证据足够/);
  assert.match(html, /<strong>2<\/strong>/);
  assert.match(html, /打开阶段测评/);
  assert.match(html, /data-learning-open-growth-task="stage_card_1"/);
});

test("Growth teaching card UI renders submit and recording controls for a generated daily card", () => {
  const windowRef = loadPublicScript("growth-legacy-task-ui.js");
  const html = windowRef.HermesLearningGrowthTaskUi.renderTeachingCardDetail({
    taskCardId: "ltask_daily_1",
    workspaceId: "weixin_fanfan",
    title: "Find the main idea",
    status: "published",
    cardRole: "practice",
    expectedDurationMinutes: { min: 10, max: 15 },
    rewardPolicy: { maxCoins: 100 },
    teachingFlow: {
      learningTarget: "Find the main idea in one paragraph.",
      prerequisites: ["paragraph", "topic"],
      lesson: { title: "Main idea", explanation: "A main idea tells what the paragraph is mostly about." },
      guidedPractice: { instruction: "Underline the sentence that explains the whole paragraph.", hints: ["Look at repeated ideas"] },
      quickCheck: { instruction: "Write the main idea in one sentence.", completionCriteria: ["Use your own words"] },
      difficultyBasis: "recent reading summary",
      supportLevel: "guided"
    }
  }, {
    workspaceId: "weixin_fanfan",
    state: {
      learningGrowthTeachingStepByCardId: { ltask_daily_1: "quick_check" },
      learningGrowthTeachingDrafts: {
        ltask_daily_1: { submissionText: "The paragraph is about saving water." }
      },
      learningGrowthRecordings: {
        "ltask_daily_1:submission": { status: "ready", url: "blob:submission", durationMs: 4200 }
      }
    },
    resolveGrowthAudioUrl: (url, workspaceId) => `proxy:${workspaceId}:${url}`
  });

  assert.match(html, /data-learning-growth-daily-flow/);
  assert.doesNotMatch(html, /data-learning-growth-flow-step="learn"/);
  assert.match(html, /data-learning-growth-flow-step="submit"><b>提交<\/b><small>待提交<\/small>/);
  assert.match(html, /data-learning-growth-flow-step="evaluate"><b>批改<\/b><small>待提交后<\/small>/);
  assert.match(html, /data-learning-growth-flow-step="reflect"><b>反思<\/b><small>待批改后<\/small>/);
  assert.match(html, /学习流程/);
  assert.match(html, /提交、批改、反思三步/);
  assert.match(html, /Find the main idea in one paragraph/);
  assert.match(html, /paragraph/);
  assert.match(html, /A main idea tells what the paragraph is mostly about/);
  assert.match(html, /Underline the sentence/);
  assert.match(html, /data-field="submissionText"/);
  assert.doesNotMatch(html, /data-field="guidedPracticeText"/);
  assert.doesNotMatch(html, /data-field="quickCheckText"/);
  assert.equal(countMatches(html, /<textarea\b/g), 1);
  assert.match(html, /data-learning-growth-submission-form="ltask_daily_1"/);
  assert.match(html, /data-learning-growth-record-toggle="ltask_daily_1"/);
  assert.match(html, /data-record-kind="submission"/);
  assert.match(html, /blob:submission/);
  assert.match(html, /data-learning-growth-record-playback="ltask_daily_1"/);
  assert.match(html, />提交作答<\/button>/);
  assert.doesNotMatch(html, /role="tablist"/);
  assert.doesNotMatch(html, /data-learning-growth-reflection-form/);
});

test("Growth teaching card UI keeps a failed recording preview visible as a recoverable state", () => {
  const windowRef = loadPublicScript("growth-legacy-task-ui.js");
  const html = windowRef.HermesLearningGrowthTaskUi.renderTeachingCardDetail({
    taskCardId: "ltask_daily_1",
    workspaceId: "weixin_fanfan",
    title: "Find the main idea",
    status: "published",
    cardRole: "practice",
    teachingFlow: {
      lesson: { title: "Main idea", explanation: "A main idea tells what the paragraph is mostly about." },
      guidedPractice: { instruction: "Try one sentence." },
      quickCheck: { instruction: "Write the main idea." }
    }
  }, {
    workspaceId: "weixin_fanfan",
    state: {
      learningGrowthRecordings: {
        "ltask_daily_1:submission": {
          status: "ready",
          url: "blob:bad-format",
          playbackError: true,
          message: "录音已保存，但当前浏览器无法回放。"
        }
      }
    }
  });

  assert.match(html, /重新录音/);
  assert.match(html, /当前浏览器无法回放/);
  assert.match(html, /data-learning-growth-record-clear="ltask_daily_1"/);
  assert.doesNotMatch(html, /data-learning-growth-record-playback="ltask_daily_1"/);
});

test("Growth teaching card UI renders submitted waiting-evaluation state", () => {
  const windowRef = loadPublicScript("growth-legacy-task-ui.js");
  const html = windowRef.HermesLearningGrowthTaskUi.renderTeachingCardDetail({
    taskCardId: "ltask_daily_1",
    workspaceId: "weixin_fanfan",
    title: "Find the main idea",
    status: "submitted",
    cardRole: "practice",
    teachingFlow: {
      lesson: { title: "Main idea", explanation: "A main idea tells what the paragraph is mostly about." },
      guidedPractice: { instruction: "Try one sentence." },
      quickCheck: { instruction: "Write the main idea." }
    },
    latestSubmission: {
      submissionId: "submission_1",
      submittedAt: "2026-06-12T10:00:00.000Z",
      textCharCount: 42
    }
  }, {
    workspaceId: "weixin_fanfan",
    state: {
      learningGrowthEvaluationBusy: { ltask_daily_1: false }
    }
  });

  assert.match(html, /作答已提交/);
  assert.match(html, /等待批改/);
  assert.match(html, /刷新批改/);
  assert.match(html, /data-learning-growth-flow-step="evaluate"/);
  assert.equal(countMatches(html, /<textarea\b/g), 0);
  assert.doesNotMatch(html, />提交作答<\/button>/);
  assert.doesNotMatch(html, /data-learning-growth-reflection-form/);
});

test("Growth teaching card UI renders visible failed evaluation state", () => {
  const windowRef = loadPublicScript("growth-legacy-task-ui.js");
  const html = windowRef.HermesLearningGrowthTaskUi.renderTeachingCardDetail({
    taskCardId: "ltask_daily_1",
    workspaceId: "weixin_fanfan",
    title: "Find the main idea",
    status: "submitted",
    cardRole: "practice",
    teachingFlow: {
      lesson: { title: "Main idea", explanation: "A main idea tells what the paragraph is mostly about." },
      guidedPractice: { instruction: "Try one sentence." },
      quickCheck: { instruction: "Write the main idea." }
    },
    latestSubmission: {
      submissionId: "submission_1",
      submittedAt: "2026-06-12T10:00:00.000Z",
      textCharCount: 42
    },
    latestEvaluationJob: {
      jobId: "job_1",
      status: "failed",
      attemptCount: 3,
      failedVisible: true,
      lastError: "gateway_timeout"
    }
  }, {
    workspaceId: "weixin_fanfan",
    state: {
      learningGrowthEvaluationBusy: { ltask_daily_1: false }
    }
  });

  assert.match(html, /批改未完成/);
  assert.match(html, /需要处理/);
  assert.match(html, /Owner 检查/);
  assert.match(html, /刷新状态/);
  assert.match(html, /已尝试 3 次/);
  assert.match(html, /todo-learning-growth-evaluation is-failed/);
  assert.doesNotMatch(html, /data-learning-growth-evaluation-retry/);
  assert.doesNotMatch(html, /重新批改/);
  assert.doesNotMatch(html, /错误摘要/);
  assert.doesNotMatch(html, /gateway_timeout/);
  assert.doesNotMatch(html, /作答已保存，系统会处理一次批改/);
  assert.equal(countMatches(html, /<textarea\b/g), 0);
  assert.doesNotMatch(html, /data-learning-growth-reflection-form/);
});

test("Growth teaching card UI renders Owner retry action for failed evaluation", () => {
  const windowRef = loadPublicScript("growth-legacy-task-ui.js");
  const html = windowRef.HermesLearningGrowthTaskUi.renderTeachingCardDetail({
    taskCardId: "ltask_daily_1",
    workspaceId: "weixin_fanfan",
    title: "Find the main idea",
    status: "submitted",
    cardRole: "practice",
    teachingFlow: {
      lesson: { title: "Main idea", explanation: "A main idea tells what the paragraph is mostly about." },
      guidedPractice: { instruction: "Try one sentence." },
      quickCheck: { instruction: "Write the main idea." }
    },
    latestSubmission: {
      submissionId: "submission_1",
      submittedAt: "2026-06-12T10:00:00.000Z",
      textCharCount: 42
    },
    latestEvaluationJob: {
      jobId: "job_1",
      status: "failed",
      attemptCount: 3,
      failedVisible: true,
      lastError: "gateway_timeout",
      lastOwnerReview: {
        action: "retry",
        reason: "owner retry",
        reviewedBy: "owner",
        reviewedAt: "2026-06-14T06:15:00.000Z"
      }
    }
  }, {
    workspaceId: "weixin_fanfan",
    state: {
      auth: { isOwner: true },
      learningGrowthEvaluationBusy: { ltask_daily_1: false }
    }
  });

  assert.match(html, /data-learning-growth-evaluation-retry="ltask_daily_1"/);
  assert.match(html, /data-workspace-id="weixin_fanfan"/);
  assert.match(html, /重新批改/);
  assert.match(html, /刷新状态/);
  assert.match(html, /已尝试 3 次/);
  assert.match(html, /Owner 已在 2026-06-14T06:15:00.000Z 重新加入队列/);
  assert.match(html, /错误摘要：gateway_timeout/);
});

test("Growth teaching card UI renders one-shot evaluation and optional reflection after submission", () => {
  const windowRef = loadPublicScript("growth-legacy-task-ui.js");
  const html = windowRef.HermesLearningGrowthTaskUi.renderTeachingCardDetail({
    taskCardId: "ltask_daily_1",
    workspaceId: "weixin_fanfan",
    title: "Find the main idea",
    status: "completed",
    cardRole: "practice",
    teachingFlow: {
      lesson: { title: "Main idea", explanation: "A main idea tells what the paragraph is mostly about." },
      guidedPractice: { instruction: "Try one sentence." },
      quickCheck: { instruction: "Write the main idea." }
    },
    latestSubmission: {
      submissionId: "submission_1",
      submittedAt: "2026-06-12T10:00:00.000Z",
      textCharCount: 42,
      wordCount: 8,
      audio: { url: "/api/v1/growth/audio/submissions/submission_1", name: "answer.webm", mime: "audio/webm" }
    },
    latestEvaluation: {
      evaluationId: "eval_1",
      status: "completed",
      score: 72,
      maxScore: 100,
      summary: "The main idea is clear enough for today.",
      feedbackSections: {
        strengths: ["Clear topic sentence"],
        remainingWeaknesses: ["Add one detail next time"],
        nextPractice: ["Use because to explain evidence"]
      }
    },
    targetNodeIds: ["kg_english_main_idea"]
  }, {
    workspaceId: "weixin_fanfan",
    state: {
      learningGrowthTeachingStepByCardId: { ltask_daily_1: "quick_check" }
    },
    resolveGrowthAudioUrl: (url, workspaceId) => `proxy:${workspaceId}:${url}`
  });

  assert.match(html, /作答已提交/);
  assert.match(html, /这张日常卡只批改一次/);
  assert.match(html, /反思只保存学习证据/);
  assert.match(html, /批改已完成/);
  assert.match(html, /确定分数 72\/100/);
  assert.match(html, /反思一次/);
  assert.match(html, /data-learning-growth-reflection-form="ltask_daily_1"/);
  assert.match(html, /data-learning-growth-reflection-text="ltask_daily_1"/);
  assert.equal(countMatches(html, /<textarea\b/g), 1);
  assert.match(html, /data-record-kind="reflection"/);
  assert.match(html, /proxy:weixin_fanfan:\/api\/v1\/growth\/audio\/submissions\/submission_1/);
  assert.match(html, /data-learning-growth-saved-audio/);
  assert.match(html, /data-learning-growth-audio-error hidden/);
  assert.match(html, /data-learning-growth-experience-mode="active"/);
  assert.match(html, /data-learning-growth-experience-signal="ltask_daily_1"/);
  assert.match(html, /data-target-node-ids="kg_english_main_idea"/);
  assert.match(html, /选择一项，下一张卡会参考这个信号/);
  assert.doesNotMatch(html, />提交作答<\/button>/);
});

test("Growth teaching card UI renders submitted reflection audio without reopening reflection", () => {
  const windowRef = loadPublicScript("growth-legacy-task-ui.js");
  const html = windowRef.HermesLearningGrowthTaskUi.renderTeachingCardDetail({
    taskCardId: "ltask_daily_1",
    workspaceId: "weixin_fanfan",
    title: "Find the main idea",
    status: "completed",
    cardRole: "practice",
    teachingFlow: {
      lesson: { title: "Main idea", explanation: "A main idea tells what the paragraph is mostly about." },
      guidedPractice: { instruction: "Try one sentence." },
      quickCheck: { instruction: "Write the main idea." }
    },
    latestSubmission: { submissionId: "submission_1", submittedAt: "2026-06-12T10:00:00.000Z" },
    latestEvaluation: { evaluationId: "eval_1", status: "completed", score: 88, maxScore: 100, summary: "Good." },
    latestReflection: {
      reflectionId: "reflection_1",
      submittedAt: "2026-06-12T10:05:00.000Z",
      summary: "I should explain my evidence.",
      audio: { url: "/api/v1/growth/audio/reflections/reflection_1", name: "reflection.webm", mime: "audio/webm" }
    }
  }, {
    workspaceId: "weixin_fanfan",
    state: {
      learningGrowthTeachingStepByCardId: { ltask_daily_1: "quick_check" }
    },
    resolveGrowthAudioUrl: (url, workspaceId) => `proxy:${workspaceId}:${url}`
  });

  assert.match(html, /反思已提交/);
  assert.match(html, /proxy:weixin_fanfan:\/api\/v1\/growth\/audio\/reflections\/reflection_1/);
  assert.match(html, /录音暂时无法播放/);
  assert.equal(countMatches(html, /<textarea\b/g), 0);
  assert.doesNotMatch(html, /data-learning-growth-reflection-form/);
});

test("Growth card generation UI renders visible progress while generating", () => {
  const windowRef = loadPublicScript("growth-card-generation-ui.js");
  const context = {
    target: { workspaceId: "weixin_fanfan", learnerId: "fanfan", enabled: true },
    selectedRecipeId: "daily_english_v1",
    recipes: [{ id: "daily_english_v1", label: "日常英语卡" }],
    readiness: {
      ready: true,
      workspaceProvisioned: true,
      learningGraphReady: true,
      historySummaryReady: true,
      gatewayConfigured: true,
      plannerGatewayConfigured: true,
      plannerContextReady: true,
      authoringGatewayConfigured: true
    },
    graph: { nodeCount: 294, edgeCount: 329 },
    suggestedPlan: {
      targetNodeId: "kg_english_main_idea",
      targetNodeIds: ["kg_english_main_idea"],
      title: "Find the main idea",
      domain: "english",
      evidenceRequirements: ["short_answer"]
    }
  };

  const html = windowRef.HermesGrowthCardGenerationUi.renderOwnerCardGenerationPanel({
    state: {
      cardGeneration: {
        status: "publishing",
        context,
        dailyLoopDraftResult: {
          planDraft: {
            planDraftId: "lgplan_1",
            selectedItemId: "plan_item_1",
            items: [{ itemId: "plan_item_1", targetNodeIds: ["kg_english_main_idea"] }]
          }
        },
        progressStep: "authoring",
        progressMessage: "正在根据已验证计划项生成卡片。"
      }
    },
    viewTargets: [{ workspaceId: "weixin_fanfan", label: "凡凡" }],
    workspaceId: "weixin_fanfan"
  });

  assert.match(html, /aria-busy="true"/);
  assert.match(html, /data-card-generation-progress/);
  assert.match(html, /role="status"/);
  assert.match(html, /正在发布卡片/);
  assert.match(html, /data-progress-step="authoring" data-progress-state="active"/);
  assert.match(html, /正在根据已验证计划项生成卡片。/);
  assert.match(html, />正在发布<\/button>/);
});

test("Growth card generation UI renders the context target even when host targets omit it", () => {
  const windowRef = loadPublicScript("growth-card-generation-ui.js");
  const context = {
    target: { workspaceId: "weixin_stephen", learnerId: "weixin_stephen", displayName: "凡凡", enabled: true },
    readiness: {
      ready: false,
      targetEnabled: true,
      workspaceProvisioned: true,
      learningGraphReady: true,
      historySummaryReady: true,
      gatewayConfigured: false
    },
    graph: { nodeCount: 294, edgeCount: 329 },
    suggestedPlan: {
      targetNodeId: "kg_english_main_idea",
      title: "Find the main idea",
      domain: "english"
    }
  };

  const html = windowRef.HermesGrowthCardGenerationUi.renderOwnerCardGenerationPanel({
    state: { cardGeneration: { status: "ready", context } },
    viewTargets: [{ workspaceId: "owner", label: "徐欣" }],
    workspaceId: "weixin_stephen"
  });

  assert.match(html, /凡凡/);
  assert.match(html, /weixin_stephen · sample/);
  assert.match(html, /learning-card-generation-target active/);
});

test("Growth card generation UI keeps Owner workspace separate from selected generation target", () => {
  const windowRef = loadPublicScript("growth-card-generation-ui.js");
  const context = {
    target: { workspaceId: "weixin_stephen", learnerId: "weixin_stephen", displayName: "凡凡", enabled: true },
    selectedRecipeId: "daily_english_v1",
    recipes: [{ id: "daily_english_v1", label: "日常英语卡" }],
    readiness: {
      ready: true,
      targetEnabled: true,
      workspaceProvisioned: true,
      learningGraphReady: true,
      historySummaryReady: true,
      gatewayConfigured: true,
      blockingOpenGeneration: false
    },
    graph: { nodeCount: 294, edgeCount: 329 },
    suggestedPlan: {
      targetNodeId: "kg_english_main_idea",
      title: "Find the main idea",
      domain: "english",
      evidenceRequirements: ["short_answer"]
    }
  };

  const html = windowRef.HermesGrowthCardGenerationUi.renderOwnerCardGenerationPanel({
    state: { cardGeneration: { status: "ready", context, selectedWorkspaceId: "weixin_stephen" } },
    viewTargets: [
      { workspaceId: "owner", label: "徐欣", current: true },
      { workspaceId: "weixin_stephen", label: "凡凡" }
    ],
    workspaceId: "weixin_stephen"
  });

  const activeTargets = Array.from(html.matchAll(/<button[^>]+class="learning-card-generation-target active[^"]*"[^>]*>[\s\S]*?<\/button>/g))
    .map((match) => match[0]);
  assert.equal(activeTargets.length, 1);
  assert.match(activeTargets[0], /weixin_stephen · sample/);
  assert.doesNotMatch(activeTargets[0], /owner · 稍后开放/);

  const draftTag = html.match(/<button[^>]+data-card-generation-draft[^>]*>/)?.[0] || "";
  assert.doesNotMatch(draftTag, /data-card-generation-blocked-reason=/);
  assert.doesNotMatch(draftTag, /aria-disabled="true"/);
});

test("Growth card generation UI gives feedback for blocked readiness instead of silent disabled", () => {
  const windowRef = loadPublicScript("growth-card-generation-ui.js");
  const html = windowRef.HermesGrowthCardGenerationUi.renderOwnerCardGenerationPanel({
    state: {
      cardGeneration: {
        status: "ready",
        context: {
          target: { workspaceId: "owner", learnerId: "owner", displayName: "徐欣", enabled: false },
          selectedRecipeId: "daily_english_v1",
          recipes: [{ id: "daily_english_v1", label: "日常英语卡" }],
          readiness: {
            ready: false,
            targetEnabled: false,
            workspaceProvisioned: true,
            learningGraphReady: true,
            historySummaryReady: true,
            gatewayConfigured: true
          },
          graph: { nodeCount: 294, edgeCount: 329 },
          suggestedPlan: {
            targetNodeId: "kg_english_main_idea",
            title: "Find the main idea",
            domain: "english",
            evidenceRequirements: ["short_answer"]
          }
        }
      }
    },
    viewTargets: [
      { workspaceId: "owner", label: "徐欣" },
      { workspaceId: "weixin_stephen", label: "凡凡" }
    ],
    workspaceId: "owner"
  });

  const draftTag = html.match(/<button[^>]+data-card-generation-draft[^>]*>/)?.[0] || "";
  assert.match(draftTag, /data-card-generation-blocked-reason="请先在左侧选择凡凡，再生成卡片。"/);
  assert.match(draftTag, /aria-disabled="true"/);
  assert.doesNotMatch(draftTag, /\sdisabled(=|\s|>)/);
});

test("Growth view-model adapter normalizes cards, lanes, and overview metrics", () => {
  const windowRef = loadPublicScript("growth-view-model.js");
  const viewModel = windowRef.HermesGrowthViewModel.createGrowthViewModel({
    getWorkspaceId: () => "weixin_child",
    learnerLabel: () => "Stephen"
  });

  const overview = viewModel.makeOverview(
    { source: "growth-plugin-sqlite", stage: "plugin_sqlite" },
    {
      source: "growth-plugin-sqlite",
      cards: [
        { taskCardId: "card_1", title: "Read", status: "active", latestRewardSettlement: { coinAmount: 12 } },
        { id: "card_2", status: "completed" }
      ],
      lanes: [{ id: "ready", cards: ["card_1", "missing"] }]
    }
  );

  assert.equal(overview.learner.displayName, "Stephen");
  assert.equal(overview.metrics.totalCards, 2);
  assert.equal(overview.metrics.completedTasks, 1);
  assert.equal(overview.coins.growth.totalEarnedCoins, 12);
  assert.deepEqual(overview.board.lanes[0].cards, ["card_1"]);
  assert.equal(overview.programs.taskCards[1].title, "card_2");
});

test("Growth route controller opens card and action routes without DOM coupling", async () => {
  const windowRef = loadPublicScript("growth-route-controller.js");
  const opened = [];
  const pageState = {
    auth: { isOwner: false },
    learningGrowthSettingsOpen: false,
    learningGrowthActiveTab: "overview"
  };
  const model = {
    overview: {
      board: { cards: [{ taskCardId: "card_1", nextAction: "submit" }] },
      programs: { taskCards: [], executableTasks: [] }
    }
  };
  const controller = windowRef.HermesGrowthRouteController.createGrowthRouteController({
    pluginRoute: "submit_work",
    pluginItemId: "",
    pageState,
    model,
    openCard: async (id) => opened.push(id)
  });

  assert.equal(controller.firstTaskCardForRoute("submit_work").taskCardId, "card_1");
  assert.equal(await controller.applyInitialPluginRoute(), true);
  assert.deepEqual(opened, ["card_1"]);

  const ownerState = {
    auth: { isOwner: true },
    learningGrowthSettingsOpen: false,
    learningGrowthActiveTab: "overview"
  };
  const ownerController = windowRef.HermesGrowthRouteController.createGrowthRouteController({
    pluginRoute: "generate_cards",
    pluginItemId: "",
    pageState: ownerState,
    model,
    openCard: async () => null
  });
  assert.equal(await ownerController.applyInitialPluginRoute(), false);
  assert.equal(ownerState.learningGrowthSettingsOpen, true);
  assert.equal(ownerState.learningGrowthActiveTab, "generation");
});

test("Growth navigation controller consumes host back on card detail before host exit", () => {
  const windowRef = loadPublicScript("growth-navigation-controller.js");
  const listeners = {};
  const posted = [];
  const historyCalls = [];
  const pageState = {
    selectedLearningTaskCardId: "card_1",
    learningGrowthHistoryTaskCardId: "",
    learningGrowthSettingsTaskId: "",
    learningGrowthSettingsOpen: false,
    learningGrowthActiveTab: "overview",
    learningGrowthBoardLane: "ready"
  };
  let renders = 0;
  const controller = windowRef.HermesGrowthNavigation.createGrowthNavigationController({
    pageState,
    renderShell: () => {
      renders += 1;
    },
    historyRef: {
      replaceState: (...args) => historyCalls.push(["replace", ...args]),
      pushState: (...args) => historyCalls.push(["push", ...args])
    },
    locationRef: { href: "http://127.0.0.1:4881/?embed=hermes" },
    parentRef: { postMessage: (payload) => posted.push(payload) },
    windowRef: { addEventListener: (eventName, handler) => { listeners[eventName] = handler; } }
  });

  controller.bind();
  assert.equal(posted.at(-1).type, "growth.plugin.navigation");
  assert.equal(posted.at(-1).canGoBack, true);

  listeners.message({ data: { type: "hermes.plugin.back", version: 1 } });

  assert.equal(pageState.selectedLearningTaskCardId, "");
  assert.equal(renders, 1);
  assert.equal(historyCalls.at(-1)[0], "replace");
  assert.equal(posted.at(-1).type, "growth.plugin.back_result");
  assert.equal(posted.at(-1).handled, true);
  assert.equal(posted.at(-1).canGoBack, false);
  assert.equal(posted.at(-1).route.name, "root");
});

test("Growth navigation controller reports unhandled back at plugin root", () => {
  const windowRef = loadPublicScript("growth-navigation-controller.js");
  const posted = [];
  const pageState = {
    selectedLearningTaskCardId: "",
    learningGrowthHistoryTaskCardId: "",
    learningGrowthSettingsTaskId: "",
    learningGrowthSettingsOpen: false,
    learningGrowthActiveTab: "overview",
    learningGrowthBoardLane: "ready"
  };
  let renders = 0;
  const controller = windowRef.HermesGrowthNavigation.createGrowthNavigationController({
    pageState,
    renderShell: () => {
      renders += 1;
    },
    historyRef: { replaceState: () => null },
    locationRef: { href: "http://127.0.0.1:4881/?embed=hermes" },
    parentRef: { postMessage: (payload) => posted.push(payload) },
    windowRef: { addEventListener: () => null }
  });

  assert.equal(controller.handleBack("test_root_back"), false);
  assert.equal(renders, 0);
  assert.equal(posted[0].type, "growth.plugin.back_result");
  assert.equal(posted[0].handled, false);
  assert.equal(posted[0].canGoBack, false);
  assert.equal(posted[0].route.name, "root");
});

test("Growth index loads frontend adapters before app boot", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
  const staticVersion = "20260615-daily-loop-draft-publish-ui-v1";
  const order = [
    "/growth-appearance.js",
    "/growth-api-client.js",
    "/growth-view-model.js",
    "/growth-route-controller.js",
    "/growth-card-generation-ui.js",
    "/growth-card-interaction-controller.js",
    "/growth-navigation-controller.js",
    "/app.js"
  ].map((asset) => html.indexOf(asset));
  assert.ok(order.every((index) => index >= 0));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.equal((html.match(new RegExp(staticVersion, "g")) || []).length, 13);
  assert.doesNotMatch(html, /20260614-post-publish-context-v1/);
  assert.doesNotMatch(html, /20260614-growth-navigation-v1/);
  assert.doesNotMatch(html, /20260614-stage-assessment-ui-v1/);
  assert.doesNotMatch(html, /20260614-evaluation-failure-ui-v1/);
  assert.doesNotMatch(html, /20260614-owner-evaluation-retry-v1/);
  assert.doesNotMatch(html, /20260614-owner-evaluation-retry-ui-v1/);
  assert.doesNotMatch(html, /20260614-owner-evaluation-status-ui-v1/);
  assert.doesNotMatch(html, /20260614-recommendation-rationale-ui-v1/);
  assert.doesNotMatch(html, /20260614-recipe-policy-v1/);
  assert.doesNotMatch(html, /20260614-recommendation-lifecycle-v1/);
});

test("Growth app refreshes card generation context after publish without clearing preview", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");

  assert.match(source, /function refreshLearningLoopState/);
  assert.match(source, /function refreshCardGenerationContextAfterPublish/);
  assert.match(source, /api\.fetchCardGenerationContext\(requestedTargetWorkspaceId\)/);
  assert.match(source, /api\.fetchLearningLoopState\(requestedTargetWorkspaceId, context\)/);
  assert.match(source, /pageState\.cardGeneration\.context = context/);
  assert.match(source, /await refreshLearningLoopState\(requestedTargetWorkspaceId, context\)/);
  assert.match(source, /function draftDailyLoopFromUi/);
  assert.match(source, /api\.draftGrowthDailyLoop\(payload, targetWorkspaceId\)/);
  assert.match(source, /pageState\.cardGeneration\.status = "drafted";[\s\S]*pageState\.cardGeneration\.dailyLoopDraftResult = result;[\s\S]*await refreshLearningLoopState\(targetWorkspaceId, pageState\.cardGeneration\.context\)/);
  assert.match(source, /function publishDailyLoopFromUi/);
  assert.match(source, /api\.publishGrowthDailyLoop\(payload, targetWorkspaceId\)/);
  assert.match(source, /pageState\.cardGeneration\.status = "published";[\s\S]*pageState\.cardGeneration\.dailyLoopPublishResult = result;[\s\S]*pageState\.cardGeneration\.generatedResult = result\.generation \|\| result;[\s\S]*await refreshCardGenerationContextAfterPublish\(targetWorkspaceId\);[\s\S]*renderShell\(\);/);
  assert.match(source, /pageState\.cardGeneration\.generatedResult = result\.generation \|\| result;[\s\S]*await refreshCardGenerationContextAfterPublish\(targetWorkspaceId\);[\s\S]*renderShell\(\);/);
  assert.doesNotMatch(source, /api\.generateGrowthCard/);
  assert.doesNotMatch(source, /await loadCardGenerationContext\(targetWorkspaceId\)/);
});
