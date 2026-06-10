const assert = require("node:assert/strict");
const test = require("node:test");
const { normalizeGrowthEvent } = require("../src/services/growth-event-service");

test("normalizes bounded Growth events", () => {
  const result = normalizeGrowthEvent({
    type: "growth.card.completed",
    workspaceId: "weixin_child",
    taskCardId: "card_1",
    status: "completed",
    source: "home-ai",
    summary: "Learner completed the task."
  });

  assert.equal(result.ok, true);
  assert.equal(result.event.type, "growth.card.completed");
  assert.equal(result.event.workspace_id, "weixin_child");
  assert.equal(result.event.task_card_id, "card_1");
  assert.equal(result.event.status, "completed");
  assert.equal(result.event.summary, "Learner completed the task.");
});

test("rejects unsupported Growth event types", () => {
  const result = normalizeGrowthEvent({ type: "growth.raw_submission.created" });
  assert.equal(result.ok, false);
  assert.equal(result.error, "growth_event_type_not_supported");
});
