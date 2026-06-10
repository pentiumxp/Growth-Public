const ALLOWED_EVENT_TYPES = new Set([
  "growth.board_snapshot_imported",
  "growth.card.completed",
  "growth.review.required",
  "growth.reward.requested",
  "growth.mastery.updated"
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
      type,
      workspace_id: workspaceId,
      task_card_id: taskCardId,
      status: cleanString(input.status, 80),
      source: cleanString(input.source || "home-ai", 80),
      occurred_at: cleanString(input.occurred_at || input.occurredAt || new Date().toISOString(), 80),
      summary: cleanString(input.summary || "", 700)
    }
  };
}

function createGrowthEventService() {
  return {
    normalize: normalizeGrowthEvent
  };
}

module.exports = {
  ALLOWED_EVENT_TYPES,
  createGrowthEventService,
  normalizeGrowthEvent
};
