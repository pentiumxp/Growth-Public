const assert = require("node:assert/strict");
const test = require("node:test");
const { createGrowthEventService, normalizeGrowthEvent, notificationPayloadForEvent } = require("../src/services/growth-event-service");

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

test("maps bounded Growth events to Home AI plugin notification payloads", () => {
  const event = normalizeGrowthEvent({
    eventId: "event_1",
    type: "growth.review.required",
    workspaceId: "growth:weixin_child",
    taskCardId: "card_1",
    summary: "A review is ready."
  }).event;
  const payload = notificationPayloadForEvent(event);
  assert.equal(payload.workspaceId, "weixin_child");
  assert.equal(payload.eventId, "event_1");
  assert.equal(payload.itemType, "review");
  assert.equal(payload.status, "open");
  assert.equal(payload.route.pluginItemId, "card_1");
  assert.equal(payload.sourceRef.growthEventType, "growth.review.required");
});

test("queues Growth events when Home AI delivery is not configured", async () => {
  const records = [];
  const service = createGrowthEventService({
    outboxStore: {
      append(record) {
        records.push(record);
        return record;
      },
      list(status) {
        return records.filter((record) => record.status === status);
      },
      update(id, patch) {
        const record = records.find((item) => item.id === id);
        Object.assign(record, patch);
        return record;
      }
    }
  });
  const result = await service.emit({
    eventId: "event_pending",
    type: "growth.card.completed",
    workspaceId: "growth:weixin_child",
    taskCardId: "card_1",
    status: "completed",
    summary: "Done."
  });
  assert.equal(result.ok, true);
  assert.equal(records[0].status, "pending");
  assert.equal(records[0].last_error, "delivery_not_configured");
});

test("delivers queued Growth events to the Home AI plugin notification endpoint", async () => {
  const records = [];
  const calls = [];
  const service = createGrowthEventService({
    config: {
      homeAiApiBaseUrl: "http://127.0.0.1:8797",
      homeAiAccessKey: "home-ai-key"
    },
    outboxStore: {
      append(record) {
        records.push(record);
        return record;
      },
      list(status) {
        return records.filter((record) => record.status === status);
      },
      update(id, patch) {
        const record = records.find((item) => item.id === id);
        Object.assign(record, patch);
        return record;
      }
    },
    fetch(url, options = {}) {
      calls.push({ url, options });
      return Promise.resolve({
        ok: true,
        status: 202,
        json: () => Promise.resolve({ ok: true, inboxItem: { id: "inbox_1" }, clickUrl: "/?view=inbox" })
      });
    }
  });

  const result = await service.emit({
    eventId: "event_delivered",
    type: "growth.card.completed",
    workspaceId: "growth:weixin_child",
    taskCardId: "card_1",
    status: "completed",
    summary: "Done."
  });

  assert.equal(result.ok, true);
  assert.equal(records[0].status, "delivered");
  assert.equal(records[0].delivery.response.inboxItemId, "inbox_1");
  assert.match(calls[0].url, /\/api\/hermes-plugins\/growth\/notifications\?workspaceId=weixin_child$/);
  assert.equal(calls[0].options.headers["X-Hermes-Web-Key"], "home-ai-key");
  assert.equal(JSON.parse(calls[0].options.body).sourceId, "event_delivered");
});
