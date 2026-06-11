"use strict";

function cleanString(value) {
  return String(value || "").trim();
}

function totalForBoard(board = {}) {
  if (board.summary && typeof board.summary.total === "number") return board.summary.total;
  if (Array.isArray(board.cards)) return board.cards.length;
  return 0;
}

function summaryForBoard(board = {}) {
  const total = totalForBoard(board);
  const cards = Array.isArray(board.cards) ? board.cards : [];
  return {
    total,
    active: cards.filter((card) => !["done", "completed"].includes(cleanString(card.status).toLowerCase())).length,
    waiting_review: cards.filter((card) => cleanString(card.nextAction).includes("review")).length,
    completed: cards.filter((card) => ["done", "completed"].includes(cleanString(card.status).toLowerCase())).length
  };
}

function fallbackStatus(reason = "") {
  return {
    ok: true,
    plugin_id: "growth",
    stage: "scaffold",
    data_ownership: "not_migrated",
    mcp_toolset: "planned",
    source: "growth-plugin-scaffold",
    message: reason || "Growth plugin scaffold is running; built-in Home AI Growth data has not been migrated."
  };
}

function sqliteStatus(readback = {}) {
  return {
    ok: true,
    plugin_id: "growth",
    stage: "plugin_sqlite",
    data_ownership: "plugin",
    plugin_data_ownership: "migrated_sqlite",
    mcp_toolset: "read_only",
    source: "growth-plugin-sqlite",
    message: "Growth plugin is reading migrated plugin-owned SQLite data.",
    migration: readback
  };
}

function fallbackBoard({ workspaceId, reason = "" } = {}) {
  return {
    ok: true,
    workspace_id: workspaceId,
    cards: [],
    lanes: [],
    summary: {
      total: 0,
      active: 0,
      waiting_review: 0,
      completed: 0
    },
    source: "growth-plugin-scaffold",
    message: reason
  };
}

function snapshotBoard(snapshot = {}) {
  const board = snapshot.board || {};
  const cards = Array.isArray(board.cards) ? board.cards : [];
  return {
    ok: true,
    workspace_id: snapshot.workspace_id,
    cards,
    lanes: Array.isArray(board.lanes) ? board.lanes : [],
    summary: board.summary || summaryForBoard({ cards }),
    source: "growth-plugin-snapshot",
    snapshot_updated_at: snapshot.updated_at || ""
  };
}

function cardFromSnapshot(snapshot = {}, taskCardId = "") {
  const id = cleanString(taskCardId);
  if (!id) return null;
  const details = snapshot.card_details && typeof snapshot.card_details === "object" ? snapshot.card_details : {};
  if (details[id]) return details[id];
  const board = snapshot.board || {};
  const cards = Array.isArray(board.cards) ? board.cards : [];
  return cards.find((card) => cleanString(card.taskCardId) === id) || null;
}

function normalizeCardId(card = {}) {
  return cleanString(card.taskCardId || card.cardId || card.id);
}

function migrationSummary(snapshot = {}) {
  const board = snapshot.board || {};
  const cardDetails = snapshot.card_details && typeof snapshot.card_details === "object" ? snapshot.card_details : {};
  return {
    workspace_id: snapshot.workspace_id,
    imported_at: snapshot.imported_at || "",
    updated_at: snapshot.updated_at || "",
    source: snapshot.source || "growth-plugin-snapshot",
    card_count: Array.isArray(board.cards) ? board.cards.length : 0,
    card_detail_count: Object.keys(cardDetails).length,
    detail_errors: Array.isArray(snapshot.detail_errors) ? snapshot.detail_errors : []
  };
}

module.exports = {
  cardFromSnapshot,
  cleanString,
  fallbackBoard,
  fallbackStatus,
  migrationSummary,
  normalizeCardId,
  snapshotBoard,
  sqliteStatus,
  summaryForBoard,
  totalForBoard
};
