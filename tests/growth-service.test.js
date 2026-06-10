const assert = require("node:assert/strict");
const test = require("node:test");
const { createGrowthService } = require("../src/services/growth-service");

test("reports scaffold status and empty board without Home AI config", async () => {
  const service = createGrowthService();
  assert.equal((await service.status()).stage, "scaffold");
  assert.deepEqual((await service.board({ workspaceId: "growth:test" })).summary, {
    total: 0,
    active: 0,
    waiting_review: 0,
    completed: 0
  });
});

test("reads bounded Home AI Growth facade when configured", async () => {
  const calls = [];
  const snapshots = new Map();
  const service = createGrowthService({
    config: {
      homeAiApiBaseUrl: "http://127.0.0.1:8797",
      homeAiAccessKey: "test-home-ai-key"
    },
    snapshotStore: {
      get: (workspaceId) => snapshots.get(workspaceId) || null,
      upsert: (snapshot) => {
        snapshots.set(snapshot.workspace_id, snapshot);
        return snapshot;
      }
    },
    fetch(url, options = {}) {
      calls.push({ url, options });
      if (url.includes("/api/growth/v1/status")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            ok: true,
            migrationStage: "host_facade",
            dataOwner: "home-ai",
            pluginDataOwner: "not_migrated",
            learner: { id: "weixin_child" }
          })
        });
      }
      if (url.includes("/api/growth/v1/board")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            ok: true,
            facadeVersion: 1,
            migrationStage: "host_facade",
            dataOwner: "home-ai",
            board: {
              cards: [
                { taskCardId: "card_1", status: "active", title: "Read" },
                { taskCardId: "card_2", status: "completed", title: "Write" }
              ],
              lanes: [{ id: "today", cards: ["card_1", "card_2"] }]
            }
          })
        });
      }
      throw new Error(`unexpected ${url}`);
    }
  });

  const status = await service.status({ workspaceId: "weixin_child" });
  const board = await service.board({ workspaceId: "weixin_child" });
  assert.equal(status.stage, "host_facade");
  assert.equal(status.source, "home-ai-growth-facade");
  assert.equal(board.source, "home-ai-growth-facade");
  assert.equal(board.summary.total, 2);
  assert.equal(board.summary.completed, 1);
  assert.equal(calls[0].options.headers["X-Hermes-Web-Key"], "test-home-ai-key");
  assert.match(calls[0].url, /workspaceId=weixin_child/);
  assert.match(calls[1].url, /workspaceId=weixin_child/);
  assert.equal(snapshots.get("weixin_child").board.cards[0].taskCardId, "card_1");
});

test("falls back to the plugin snapshot when Home AI facade is unavailable", async () => {
  const service = createGrowthService({
    config: {
      homeAiApiBaseUrl: "http://127.0.0.1:8797",
      homeAiAccessKey: "test-home-ai-key"
    },
    snapshotStore: {
      get: () => ({
        workspace_id: "weixin_child",
        updated_at: "2026-06-10T00:00:00.000Z",
        board: {
          cards: [{ taskCardId: "card_snapshot", status: "active" }],
          lanes: [{ id: "snapshot", cards: ["card_snapshot"] }],
          summary: { total: 1, active: 1, waiting_review: 0, completed: 0 }
        }
      })
    },
    fetch() {
      return Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({ ok: false }) });
    }
  });

  const board = await service.board({ workspaceId: "weixin_child" });
  assert.equal(board.source, "growth-plugin-snapshot");
  assert.equal(board.cards[0].taskCardId, "card_snapshot");
  assert.equal(board.snapshot_updated_at, "2026-06-10T00:00:00.000Z");
});

test("prefers plugin-owned SQLite store when data owner is plugin", async () => {
  const service = createGrowthService({
    config: {
      dataOwner: "plugin",
      homeAiApiBaseUrl: "http://127.0.0.1:8797",
      homeAiAccessKey: "test-home-ai-key"
    },
    learningStore: {
      integrity: () => ({
        ok: true,
        quick_check: "ok",
        missing_tables: [],
        counts: { learning_task_cards: 1 }
      }),
      board: () => ({
        ok: true,
        workspace_id: "weixin_child",
        cards: [{ taskCardId: "card_native", title: "Native", status: "active" }],
        lanes: [{ id: "active", cards: ["card_native"], count: 1 }],
        summary: { total: 1, active: 1, waiting_review: 0, completed: 0 },
        source: "growth-plugin-sqlite",
        data_ownership: "plugin"
      }),
      card: () => ({
        ok: true,
        workspace_id: "weixin_child",
        card: { taskCardId: "card_native", title: "Native", status: "active" },
        source: "growth-plugin-sqlite",
        data_ownership: "plugin"
      })
    },
    fetch() {
      throw new Error("facade should not be called in plugin data-owner mode");
    }
  });

  const status = await service.status({ workspaceId: "weixin_child" });
  const board = await service.board({ workspaceId: "weixin_child" });
  const card = await service.card({ workspaceId: "weixin_child", taskCardId: "card_native" });
  assert.equal(status.source, "growth-plugin-sqlite");
  assert.equal(board.source, "growth-plugin-sqlite");
  assert.equal(card.source, "growth-plugin-sqlite");
});

test("reads card detail from the Home AI Growth facade", async () => {
  const service = createGrowthService({
    config: {
      homeAiApiBaseUrl: "http://127.0.0.1:8797",
      homeAiAccessKey: "test-home-ai-key"
    },
    fetch(url) {
      assert.match(url, /\/api\/growth\/v1\/cards\/card_1/);
      assert.match(url, /workspaceId=weixin_child/);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          ok: true,
          facadeVersion: 1,
          migrationStage: "host_facade",
          dataOwner: "home-ai",
          card: { taskCardId: "card_1", title: "Read", status: "active" }
        })
      });
    }
  });

  const detail = await service.card({ workspaceId: "weixin_child", taskCardId: "card_1" });
  assert.equal(detail.ok, true);
  assert.equal(detail.source, "home-ai-growth-facade");
  assert.equal(detail.card.title, "Read");
});

test("falls back to snapshot card detail when the facade is unavailable", async () => {
  const service = createGrowthService({
    config: {
      homeAiApiBaseUrl: "http://127.0.0.1:8797",
      homeAiAccessKey: "test-home-ai-key"
    },
    snapshotStore: {
      get: () => ({
        workspace_id: "weixin_child",
        updated_at: "2026-06-10T00:00:00.000Z",
        board: {
          cards: [{ taskCardId: "card_snapshot", title: "Snapshot", status: "active" }]
        }
      })
    },
    fetch() {
      return Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({ ok: false }) });
    }
  });

  const detail = await service.card({ workspaceId: "weixin_child", taskCardId: "card_snapshot" });
  assert.equal(detail.ok, true);
  assert.equal(detail.source, "growth-plugin-snapshot");
  assert.equal(detail.card.title, "Snapshot");
});

test("reports a bounded error for missing card detail", async () => {
  const service = createGrowthService();
  const detail = await service.card({ workspaceId: "weixin_child", taskCardId: "missing" });
  assert.equal(detail.ok, false);
  assert.equal(detail.error, "card_not_found");
  assert.equal(detail.card, null);
});

test("imports Home AI facade board and card details into plugin snapshot storage", async () => {
  const snapshots = new Map();
  let facadeOffline = false;
  const service = createGrowthService({
    config: {
      homeAiApiBaseUrl: "http://127.0.0.1:8797",
      homeAiAccessKey: "test-home-ai-key",
      migrationMaxCards: 1
    },
    snapshotStore: {
      get: (workspaceId) => snapshots.get(workspaceId) || null,
      upsert: (snapshot) => {
        snapshots.set(snapshot.workspace_id, Object.assign({}, snapshot, {
          updated_at: snapshot.updated_at || "2026-06-10T00:00:00.000Z"
        }));
        return snapshots.get(snapshot.workspace_id);
      }
    },
    fetch(url) {
      if (facadeOffline) {
        return Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({ ok: false }) });
      }
      if (url.includes("/api/growth/v1/board")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            ok: true,
            facadeVersion: 1,
            migrationStage: "host_facade",
            dataOwner: "home-ai",
            board: {
              cards: [
                { taskCardId: "card_1", status: "active", title: "Board only" },
                { taskCardId: "card_2", status: "active", title: "Second" }
              ],
              lanes: [{ id: "today", cards: ["card_1", "card_2"] }]
            }
          })
        });
      }
      if (url.includes("/api/growth/v1/cards/card_1")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            ok: true,
            card: { taskCardId: "card_1", status: "active", title: "Detailed card" }
          })
        });
      }
      throw new Error(`unexpected ${url}`);
    }
  });

  const imported = await service.importFromFacade({ workspaceId: "weixin_child" });
  assert.equal(imported.ok, true);
  assert.equal(imported.imported.card_count, 2);
  assert.equal(imported.imported.card_detail_count, 1);
  assert.equal(imported.readback.card_detail_count, 1);

  const readback = service.migrationReadback({ workspaceId: "weixin_child" });
  assert.equal(readback.ok, true);
  assert.equal(readback.snapshot.card_count, 2);

  facadeOffline = true;
  const detail = await service.card({ workspaceId: "weixin_child", taskCardId: "card_1" });
  assert.equal(detail.ok, true);
  assert.equal(detail.source, "growth-plugin-snapshot");
  assert.equal(detail.card.title, "Detailed card");
});

test("reports bounded import failure when facade is unavailable", async () => {
  const service = createGrowthService({
    config: {
      homeAiApiBaseUrl: "http://127.0.0.1:8797",
      homeAiAccessKey: "test-home-ai-key"
    },
    snapshotStore: {
      get: () => null,
      upsert: () => {
        throw new Error("should not write");
      }
    },
    fetch() {
      return Promise.resolve({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ ok: false, error: "facade_down" })
      });
    }
  });

  const result = await service.importFromFacade({ workspaceId: "weixin_child" });
  assert.equal(result.ok, false);
  assert.equal(result.error, "home_ai_facade_fetch_failed");
});
