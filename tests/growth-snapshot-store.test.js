const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createGrowthSnapshotStore } = require("../src/stores/growth-snapshot-store");

test("upserts and reads one workspace Growth snapshot", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-snapshot-store-"));
  const store = createGrowthSnapshotStore({ filePath: path.join(dir, "snapshots.json") });

  assert.equal(store.get("weixin_child"), null);
  const saved = store.upsert({
    workspace_id: "weixin_child",
    updated_at: "2026-06-10T00:00:00.000Z",
    board: {
      cards: [{ taskCardId: "card_1" }],
      lanes: [{ id: "today", cards: ["card_1"] }],
      summary: { total: 1, active: 1, waiting_review: 0, completed: 0 }
    }
  });

  assert.equal(saved.workspace_id, "weixin_child");
  assert.equal(store.get("weixin_child").board.cards[0].taskCardId, "card_1");
  store.upsert({
    workspace_id: "weixin_child",
    board: {
      cards: [{ taskCardId: "card_2" }],
      lanes: [],
      summary: { total: 1, active: 0, waiting_review: 0, completed: 1 }
    }
  });
  assert.equal(store.get("weixin_child").board.cards[0].taskCardId, "card_2");
});
