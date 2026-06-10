const assert = require("node:assert/strict");
const test = require("node:test");
const { createGrowthService } = require("../src/services/growth-service");

test("reports scaffold status and empty board", () => {
  const service = createGrowthService();
  assert.equal(service.status().stage, "scaffold");
  assert.deepEqual(service.board({ workspaceId: "growth:test" }).summary, {
    total: 0,
    active: 0,
    waiting_review: 0,
    completed: 0
  });
});
