const assert = require("node:assert/strict");
const test = require("node:test");

const { createGrowthReadOrchestrator } = require("../src/services/growth-read-orchestrator");
const { createHomeAiFacadeGrowthProvider } = require("../src/services/growth-providers/home-ai-facade-provider");
const { createSnapshotGrowthProvider } = require("../src/services/growth-providers/snapshot-provider");
const { createSqliteGrowthProvider } = require("../src/services/growth-providers/sqlite-provider");

test("Growth read orchestrator makes provider fallback order explicit", async () => {
  const calls = [];
  const sqliteProvider = {
    status: () => null,
    board: ({ workspaceId }) => {
      calls.push(`sqlite:${workspaceId}`);
      return null;
    },
    card: () => null,
    migrationReadback: () => null
  };
  const facadeProvider = {
    status: () => null,
    board: ({ workspaceId }) => {
      calls.push(`facade:${workspaceId}`);
      return null;
    },
    card: () => null
  };
  const snapshotProvider = {
    board: ({ workspaceId }) => {
      calls.push(`snapshot:${workspaceId}`);
      return { ok: true, source: "growth-plugin-snapshot", cards: [] };
    },
    card: () => null,
    migrationReadback: () => null
  };

  const defaultOrchestrator = createGrowthReadOrchestrator({
    preferPluginData: false,
    sqliteProvider,
    facadeProvider,
    snapshotProvider
  });
  assert.equal((await defaultOrchestrator.board({ workspaceId: "weixin_child" })).source, "growth-plugin-snapshot");
  assert.deepEqual(calls, ["facade:weixin_child", "sqlite:weixin_child", "snapshot:weixin_child"]);

  calls.length = 0;
  const pluginFirst = createGrowthReadOrchestrator({
    preferPluginData: true,
    sqliteProvider,
    facadeProvider,
    snapshotProvider
  });
  assert.equal((await pluginFirst.board({ workspaceId: "weixin_child" })).source, "growth-plugin-snapshot");
  assert.deepEqual(calls, ["sqlite:weixin_child", "facade:weixin_child", "snapshot:weixin_child"]);
});

test("Growth providers project SQLite, facade, and snapshot sources consistently", async () => {
  const snapshots = new Map();
  const sqliteProvider = createSqliteGrowthProvider({
    learningStore: {
      integrity: () => ({ ok: true, quick_check: "ok" }),
      board: () => ({ ok: true, source: "growth-plugin-sqlite", cards: [] }),
      card: () => ({ ok: true, source: "growth-plugin-sqlite", card: { taskCardId: "card_1" } })
    }
  });
  assert.equal(sqliteProvider.status({ workspaceId: "weixin_child" }).source, "growth-plugin-sqlite");
  assert.equal(sqliteProvider.board({ workspaceId: "weixin_child" }).source, "growth-plugin-sqlite");

  const facadeProvider = createHomeAiFacadeGrowthProvider({
    snapshotStore: {
      get: (workspaceId) => snapshots.get(workspaceId) || null,
      upsert: (snapshot) => {
        snapshots.set(snapshot.workspace_id, snapshot);
        return snapshot;
      }
    },
    facadeClient: {
      async fetchJson(pathname) {
        if (pathname.endsWith("/board")) {
          return {
            ok: true,
            facadeVersion: 1,
            migrationStage: "host_facade",
            dataOwner: "home-ai",
            board: { cards: [{ taskCardId: "card_1", status: "active" }], lanes: [] }
          };
        }
        return {
          ok: true,
          facadeVersion: 1,
          migrationStage: "host_facade",
          dataOwner: "home-ai",
          card: { taskCardId: "card_1", title: "Read" }
        };
      }
    },
    migrationMaxCards: 1
  });
  const board = await facadeProvider.board({ workspaceId: "weixin_child" });
  assert.equal(board.source, "home-ai-growth-facade");
  assert.equal(snapshots.get("weixin_child").board.cards.length, 1);

  const snapshotProvider = createSnapshotGrowthProvider({
    snapshotStore: {
      get: () => ({
        workspace_id: "weixin_child",
        updated_at: "2026-06-11T00:00:00.000Z",
        board: { cards: [{ taskCardId: "card_1", title: "Snapshot" }] }
      })
    }
  });
  assert.equal(snapshotProvider.card({ workspaceId: "weixin_child", taskCardId: "card_1" }).source, "growth-plugin-snapshot");
});

test("SQLite read provider does not expose write commands", () => {
  const provider = createSqliteGrowthProvider({ learningStore: {} });
  for (const method of [
    "submitEvidence",
    "submitReflection",
    "learningCoinBalance",
    "clearLearningCoinBalanceForMonthlyExchange"
  ]) {
    assert.equal(provider[method], undefined, `${method} belongs to the write provider`);
  }
});
