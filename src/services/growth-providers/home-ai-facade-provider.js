"use strict";

const {
  cleanString,
  migrationSummary,
  normalizeCardId,
  summaryForBoard
} = require("../growth-service-models");

function facadeMetadata(upstream = {}) {
  return {
    version: upstream.facadeVersion || 1,
    migration_stage: upstream.migrationStage || "host_facade",
    data_owner: upstream.dataOwner || "home-ai"
  };
}

function facadeUnavailable(upstream = {}, fallbackCode = "home_ai_facade_unavailable") {
  const error = new Error(String(upstream?.error || fallbackCode || "home_ai_facade_unavailable"));
  error.code = String(upstream?.error || fallbackCode || "home_ai_facade_unavailable");
  error.status = Number(upstream?.status || 0) || 0;
  return error;
}

function createHomeAiFacadeGrowthProvider({ facadeClient, snapshotStore, migrationMaxCards = 50 } = {}) {
  function isConfigured() {
    return facadeClient?.configured !== false && typeof facadeClient?.fetchJson === "function";
  }

  async function status({ workspaceId } = {}) {
    if (!isConfigured()) return null;
    const upstream = await facadeClient.fetchJson("/api/growth/v1/status", { workspaceId });
    if (!upstream || upstream.ok === false) throw facadeUnavailable(upstream);
    return {
      ok: true,
      plugin_id: "growth",
      stage: upstream.migrationStage || "host_facade",
      data_ownership: upstream.dataOwner || "home-ai",
      plugin_data_ownership: upstream.pluginDataOwner || "not_migrated",
      mcp_toolset: "planned",
      source: "home-ai-growth-facade",
      learner: upstream.learner || null,
      module: upstream.module || null,
      message: "Growth plugin is reading bounded Home AI Growth data through the migration facade."
    };
  }

  async function board({ workspaceId } = {}) {
    if (!isConfigured()) return null;
    const upstream = await facadeClient.fetchJson("/api/growth/v1/board", { workspaceId });
    if (!upstream || upstream.ok === false) throw facadeUnavailable(upstream);
    const boardData = upstream.board || {};
    const projected = {
      ok: true,
      workspace_id: workspaceId,
      cards: Array.isArray(boardData.cards) ? boardData.cards : [],
      lanes: Array.isArray(boardData.lanes) ? boardData.lanes : [],
      summary: summaryForBoard(boardData),
      source: "home-ai-growth-facade",
      facade: facadeMetadata(upstream)
    };
    if (typeof snapshotStore?.upsert === "function") {
      snapshotStore.upsert({
        workspace_id: workspaceId,
        board: {
          cards: projected.cards,
          lanes: projected.lanes,
          summary: projected.summary
        },
        facade: projected.facade
      });
    }
    return projected;
  }

  async function card({ workspaceId, taskCardId } = {}) {
    if (!isConfigured()) return null;
    const upstream = await facadeClient.fetchJson(`/api/growth/v1/cards/${encodeURIComponent(taskCardId)}`, { workspaceId });
    if (!upstream || upstream.ok === false) throw facadeUnavailable(upstream);
    return {
      ok: true,
      workspace_id: workspaceId,
      card: upstream.card || null,
      source: "home-ai-growth-facade",
      facade: facadeMetadata(upstream)
    };
  }

  async function importFromFacade({ workspaceId, includeCardDetails = true } = {}) {
    const cleanWorkspaceId = cleanString(workspaceId) || "growth:local-dev";
    if (!snapshotStore || typeof snapshotStore.upsert !== "function" || typeof snapshotStore.get !== "function") {
      return {
        ok: false,
        error: "snapshot_store_not_configured",
        workspace_id: cleanWorkspaceId
      };
    }
    const upstream = await facadeClient.fetchJson("/api/growth/v1/board", { workspaceId: cleanWorkspaceId });
    if (!upstream || upstream.ok === false) {
      return {
        ok: false,
        error: upstream?.error || "home_ai_facade_unavailable",
        workspace_id: cleanWorkspaceId
      };
    }
    const boardData = upstream.board || {};
    const cards = Array.isArray(boardData.cards) ? boardData.cards : [];
    const selectedCards = includeCardDetails ? cards.slice(0, migrationMaxCards) : [];
    const cardDetails = {};
    const detailErrors = [];
    for (const cardItem of selectedCards) {
      const taskCardId = normalizeCardId(cardItem);
      if (!taskCardId) continue;
      const detail = await facadeClient.fetchJson(`/api/growth/v1/cards/${encodeURIComponent(taskCardId)}`, {
        workspaceId: cleanWorkspaceId
      });
      if (detail && detail.ok !== false && detail.card) {
        cardDetails[taskCardId] = detail.card;
      } else {
        detailErrors.push({
          taskCardId,
          error: detail?.error || "card_detail_fetch_failed"
        });
      }
    }
    const importedAt = new Date().toISOString();
    const snapshot = snapshotStore.upsert({
      workspace_id: cleanWorkspaceId,
      imported_at: importedAt,
      source: "home-ai-growth-facade",
      board: {
        cards,
        lanes: Array.isArray(boardData.lanes) ? boardData.lanes : [],
        summary: summaryForBoard(boardData)
      },
      card_details: cardDetails,
      detail_errors: detailErrors,
      facade: facadeMetadata(upstream)
    });
    const readback = snapshotStore.get(cleanWorkspaceId);
    return {
      ok: true,
      workspace_id: cleanWorkspaceId,
      imported: migrationSummary(snapshot),
      readback: migrationSummary(readback)
    };
  }

  return {
    board,
    card,
    importFromFacade,
    status
  };
}

module.exports = {
  createHomeAiFacadeGrowthProvider,
  facadeUnavailable,
  facadeMetadata
};
