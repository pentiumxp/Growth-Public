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
});

test("Growth index loads frontend adapters before app boot", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
  const order = [
    "/growth-appearance.js",
    "/growth-api-client.js",
    "/growth-view-model.js",
    "/growth-route-controller.js",
    "/app.js"
  ].map((asset) => html.indexOf(asset));
  assert.ok(order.every((index) => index >= 0));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});
