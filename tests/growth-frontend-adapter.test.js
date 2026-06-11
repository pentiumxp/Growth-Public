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
  await client.generateGrowthCard({ target_node_id: "kg_english_main_idea" }, "weixin_fanfan");

  assert.equal(calls[0].path, "/api/v1/growth/card-generation/context?workspaceId=weixin_fanfan");
  assert.equal(calls[1].path, "/api/v1/growth/cards/generate?workspaceId=weixin_fanfan");
  assert.equal(calls[1].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    workspace_id: "weixin_fanfan",
    target_node_id: "kg_english_main_idea"
  });
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
    completionPolicy: { mode: "daily_score_once" },
    historySummary: { learnerSummary: { recentCardCount: 6, completedRecentCardCount: 4, evaluationCount: 4, reflectionCount: 1 } }
  };

  const html = windowRef.HermesGrowthCardGenerationUi.renderOwnerCardGenerationPanel({
    state: { cardGeneration: { status: "ready", context } },
    viewTargets: [
      { workspaceId: "weixin_fanfan", label: "凡凡" },
      { workspaceId: "weixin_stephen", label: "Stephen" }
    ],
    workspaceId: "weixin_fanfan"
  });
  assert.match(html, /data-card-generation-manager/);
  assert.match(html, /日常英语卡/);
  assert.match(html, /data-card-generation-submit/);
  assert.match(html, /weixin_stephen · 稍后开放/);
  assert.match(html, /daily_score_once/);

  const payload = windowRef.HermesGrowthCardGenerationUi.createDailyEnglishGeneratePayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.equal(payload.workspace_id, "weixin_fanfan");
  assert.equal(payload.target_node_id, "kg_english_main_idea");
  assert.equal(payload.card_role, "practice");
  assert.equal(payload.completion_policy.mode, "daily_score_once");
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

test("Growth index loads frontend adapters before app boot", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
  const order = [
    "/growth-appearance.js",
    "/growth-api-client.js",
    "/growth-view-model.js",
    "/growth-route-controller.js",
    "/growth-card-generation-ui.js",
    "/app.js"
  ].map((asset) => html.indexOf(asset));
  assert.ok(order.every((index) => index >= 0));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});
