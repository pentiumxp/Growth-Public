const ALLOWED_EVENT_TYPES = new Set([
  "growth.board_snapshot_imported",
  "growth.card.completed",
  "growth.review.required",
  "growth.reward.requested",
  "growth.mastery.updated",
  "growth.automation.action_required"
]);

function cleanString(value, limit = 240) {
  const text = String(value || "").trim();
  return text.length > limit ? text.slice(0, limit) : text;
}

function normalizeGrowthEvent(input = {}) {
  const type = cleanString(input.type || input.event_type);
  if (!ALLOWED_EVENT_TYPES.has(type)) {
    return { ok: false, error: "growth_event_type_not_supported" };
  }
  const workspaceId = cleanString(input.workspace_id || input.workspaceId || "growth:local-dev");
  const taskCardId = cleanString(input.task_card_id || input.taskCardId);
  return {
    ok: true,
    event: {
      event_id: cleanString(input.event_id || input.eventId),
      type,
      workspace_id: workspaceId,
      task_card_id: taskCardId,
      action_handoff_id: cleanString(input.action_handoff_id || input.actionHandoffId),
      digest_id: cleanString(input.digest_id || input.digestId),
      status: cleanString(input.status, 80),
      source: cleanString(input.source || "home-ai", 80),
      occurred_at: cleanString(input.occurred_at || input.occurredAt || new Date().toISOString(), 80),
      summary: cleanString(input.summary || "", 700)
    }
  };
}

function normalizeBaseUrl(value) {
  const text = cleanString(value);
  if (!text) return "";
  try {
    return new URL(text).origin;
  } catch (_) {
    return "";
  }
}

function hermesWorkspaceId(value) {
  const text = cleanString(value);
  return text.startsWith("growth:") ? text.slice("growth:".length) : text;
}

function eventSourceId(event = {}) {
  return cleanString(event.event_id)
    || [event.type, event.workspace_id, event.task_card_id, event.occurred_at].map((item) => cleanString(item, 120)).filter(Boolean).join(":");
}

function notificationTitle(event = {}) {
  if (event.type === "growth.card.completed") return "Growth card completed";
  if (event.type === "growth.review.required") return "Growth review required";
  if (event.type === "growth.reward.requested") return "Growth reward requested";
  if (event.type === "growth.mastery.updated") return "Growth mastery updated";
  if (event.type === "growth.automation.action_required") return "Growth automation action review";
  if (event.type === "growth.board_snapshot_imported") return "Growth snapshot imported";
  return "Growth update";
}

function notificationItemType(event = {}) {
  if (event.type === "growth.automation.action_required") return "approval";
  if (event.type === "growth.review.required") return "review";
  if (event.type === "growth.reward.requested") return "approval";
  if (event.type === "growth.card.completed") return "delivery";
  return "info";
}

function notificationStatus(event = {}) {
  if (event.type === "growth.card.completed" || event.type === "growth.board_snapshot_imported") return "done";
  return "open";
}

function boundedPushSummary(push = null) {
  if (!push || typeof push !== "object" || Array.isArray(push)) return null;
  return {
    enabled: push.enabled === true,
    attempted: Number(push.attempted || 0) || 0,
    sent: Number(push.sent || 0) || 0,
    failed: Number(push.failed || 0) || 0,
    skipped: push.skipped === true,
    reason: cleanString(push.reason || push.error || "", 160)
  };
}

function notificationPayloadForEvent(event = {}) {
  const workspaceId = hermesWorkspaceId(event.workspace_id) || "owner";
  const sourceId = eventSourceId(event);
  return {
    workspaceId,
    eventId: sourceId,
    sourceId,
    type: event.type,
    title: notificationTitle(event),
    summary: cleanString(event.summary || notificationTitle(event), 600),
    itemType: notificationItemType(event),
    status: notificationStatus(event),
    route: {
      name: "growth-event",
      itemId: event.task_card_id || sourceId,
      pluginRoute: event.type === "growth.automation.action_required" ? "automation" : (event.task_card_id ? "card" : "board"),
      pluginItemId: event.task_card_id || event.action_handoff_id || ""
    },
    sourceRef: {
      growthEventType: event.type,
      taskCardId: event.task_card_id || "",
      actionHandoffId: event.action_handoff_id || "",
      digestId: event.digest_id || "",
      source: event.source || "",
      occurredAt: event.occurred_at || ""
    }
  };
}

function createGrowthEventService(options = {}) {
  const config = options.config || {};
  const outboxStore = options.outboxStore || null;
  const fetchImpl = options.fetch || global.fetch;
  const homeAiApiBaseUrl = normalizeBaseUrl(config.homeAiApiBaseUrl);
  const homeAiAccessKey = cleanString(config.homeAiAccessKey);

  async function postNotification(record = {}) {
    if (!homeAiApiBaseUrl || !homeAiAccessKey || typeof fetchImpl !== "function") {
      return { ok: false, error: "delivery_not_configured" };
    }
    const event = record.event || {};
    const payload = notificationPayloadForEvent(event);
    const url = new URL("/api/hermes-plugins/growth/notifications", homeAiApiBaseUrl);
    url.searchParams.set("workspaceId", payload.workspaceId);
    const response = await fetchImpl(url.toString(), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Hermes-Web-Key": homeAiAccessKey
      },
      body: JSON.stringify(payload)
    });
    if (!response || !response.ok) {
      return { ok: false, error: "home_ai_notification_post_failed", status: response?.status || 0 };
    }
    const body = await response.json();
    return {
      ok: body?.ok !== false,
      status: response.status,
      response: {
        inboxItemId: body?.inboxItem?.id || "",
        clickUrl: body?.clickUrl || "",
        webPush: boundedPushSummary(body?.push)
      }
    };
  }

  return {
    normalize: normalizeGrowthEvent,
    notificationPayloadForEvent,

    enqueue(input = {}) {
      const normalized = normalizeGrowthEvent(input);
      if (!normalized.ok) return normalized;
      if (!outboxStore || typeof outboxStore.append !== "function") {
        return { ok: false, error: "event_outbox_not_configured" };
      }
      const event = normalized.event;
      const record = outboxStore.append({
        id: eventSourceId(event),
        event,
        status: "pending"
      });
      return { ok: true, record };
    },

    async deliverPending({ limit = 20 } = {}) {
      if (!outboxStore || typeof outboxStore.list !== "function" || typeof outboxStore.update !== "function") {
        return { ok: false, error: "event_outbox_not_configured" };
      }
      const pending = outboxStore.list("pending").slice(0, Math.max(0, Number(limit) || 0));
      const results = [];
      for (const record of pending) {
        const delivery = await postNotification(record);
        if (delivery.ok) {
          outboxStore.update(record.id, {
            status: "delivered",
            delivered_at: new Date().toISOString(),
            delivery
          });
        } else {
          outboxStore.update(record.id, {
            status: "pending",
            last_error: delivery.error || "delivery_failed",
            last_status: delivery.status || 0
          });
        }
        results.push({ id: record.id, ok: delivery.ok, error: delivery.error || "", status: delivery.status || 0 });
      }
      return { ok: true, attempted: results.length, results };
    },

    async emit(input = {}) {
      const enqueued = this.enqueue(input);
      if (!enqueued.ok) return enqueued;
      const delivery = await this.deliverPending({ limit: 1 });
      return {
        ok: true,
        record: enqueued.record,
        delivery
      };
    }
  };
}

module.exports = {
  ALLOWED_EVENT_TYPES,
  boundedPushSummary,
  createGrowthEventService,
  notificationPayloadForEvent,
  normalizeGrowthEvent
};
