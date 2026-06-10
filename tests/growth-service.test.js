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
