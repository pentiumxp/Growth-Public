const assert = require("node:assert/strict");
const test = require("node:test");

const {
  cardFromSnapshot,
  fallbackBoard,
  migrationSummary,
  snapshotBoard,
  summaryForBoard
} = require("../src/services/growth-service-models");
const {
  createHomeAiGrowthFacadeClient,
  normalizeBaseUrl
} = require("../src/services/home-ai-growth-facade-client");

test("Growth service model helpers keep bounded board and snapshot projections", () => {
  const board = {
    cards: [
      { taskCardId: "card_1", status: "active", nextAction: "answer" },
      { taskCardId: "card_2", status: "completed", nextAction: "review done" },
      { taskCardId: "card_3", status: "active", nextAction: "needs review" }
    ]
  };

  assert.deepEqual(summaryForBoard(board), {
    total: 3,
    active: 2,
    waiting_review: 2,
    completed: 1
  });

  const snapshot = {
    workspace_id: "weixin_child",
    updated_at: "2026-06-11T00:00:00.000Z",
    board,
    card_details: {
      card_1: { taskCardId: "card_1", title: "Detailed" }
    },
    detail_errors: [{ taskCardId: "card_2", error: "missing" }]
  };

  assert.equal(snapshotBoard(snapshot).source, "growth-plugin-snapshot");
  assert.equal(cardFromSnapshot(snapshot, "card_1").title, "Detailed");
  assert.equal(cardFromSnapshot(snapshot, "card_3").taskCardId, "card_3");
  assert.equal(migrationSummary(snapshot).card_count, 3);
  assert.equal(migrationSummary(snapshot).card_detail_count, 1);
  assert.equal(fallbackBoard({ workspaceId: "weixin_child" }).summary.total, 0);
});

test("Home AI Growth facade client normalizes base URL and sends bounded headers/query", async () => {
  const calls = [];
  const client = createHomeAiGrowthFacadeClient({
    baseUrl: "http://127.0.0.1:8797/path?ignored=1",
    accessKey: "test-key",
    fetchImpl(url, options) {
      calls.push({ url, options });
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true, value: 1 })
      });
    }
  });

  assert.equal(normalizeBaseUrl("http://127.0.0.1:8797/path?ignored=1"), "http://127.0.0.1:8797");
  assert.equal(client.configured, true);

  const result = await client.fetchJson("/api/growth/v1/status", {
    workspaceId: "weixin_child",
    empty: ""
  });

  assert.equal(result.ok, true);
  assert.match(calls[0].url, /^http:\/\/127\.0\.0\.1:8797\/api\/growth\/v1\/status/);
  assert.match(calls[0].url, /workspaceId=weixin_child/);
  assert.doesNotMatch(calls[0].url, /empty=/);
  assert.equal(calls[0].options.headers["X-Hermes-Web-Key"], "test-key");
});
