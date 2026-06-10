function cleanString(value) {
  return String(value || "").trim();
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

function createGrowthService(options = {}) {
  const config = options.config || {};
  const fetchImpl = options.fetch || global.fetch;
  const snapshotStore = options.snapshotStore || null;
  const learningStore = options.learningStore || null;
  const homeAiApiBaseUrl = normalizeBaseUrl(config.homeAiApiBaseUrl);
  const homeAiAccessKey = cleanString(config.homeAiAccessKey);
  const migrationMaxCards = Number.isFinite(Number(config.migrationMaxCards)) ? Math.max(0, Number(config.migrationMaxCards)) : 50;
  const preferPluginData = cleanString(config.dataOwner).toLowerCase() === "plugin";

  async function fetchHomeAi(pathname, query = {}) {
    if (!homeAiApiBaseUrl || !homeAiAccessKey || typeof fetchImpl !== "function") return null;
    const url = new URL(pathname, homeAiApiBaseUrl);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && cleanString(value)) url.searchParams.set(key, cleanString(value));
    }
    const response = await fetchImpl(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Hermes-Web-Key": homeAiAccessKey
      }
    });
    if (!response || !response.ok) {
      return { ok: false, status: response?.status || 0, error: "home_ai_facade_fetch_failed" };
    }
    return response.json();
  }

  return {
    async status({ workspaceId } = {}) {
      if (preferPluginData && typeof learningStore?.integrity === "function") {
        try {
          const readback = learningStore.integrity({ workspaceId });
          if (readback.ok) return sqliteStatus(readback);
        } catch (_) {
          // Fall through to the facade/scaffold status path.
        }
      }
      const upstream = await fetchHomeAi("/api/growth/v1/status", { workspaceId });
      if (!upstream || upstream.ok === false) return fallbackStatus(upstream?.error || "");
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
    },

    async board({ workspaceId }) {
      if (preferPluginData && typeof learningStore?.board === "function") {
        try {
          const nativeBoard = learningStore.board({ workspaceId });
          if (nativeBoard) return nativeBoard;
        } catch (_) {
          // Fall through to the facade/snapshot path.
        }
      }
      const upstream = await fetchHomeAi("/api/growth/v1/board", { workspaceId });
      if (!upstream || upstream.ok === false) {
        if (typeof learningStore?.board === "function") {
          try {
            const nativeBoard = learningStore.board({ workspaceId });
            if (nativeBoard) return nativeBoard;
          } catch (_) {
            // Fall through to the snapshot/scaffold path.
          }
        }
        const snapshot = typeof snapshotStore?.get === "function" ? snapshotStore.get(workspaceId) : null;
        if (snapshot) return snapshotBoard(snapshot);
        return fallbackBoard({ workspaceId, reason: upstream?.error || "" });
      }
      const board = upstream.board || {};
      const projected = {
        ok: true,
        workspace_id: workspaceId,
        cards: Array.isArray(board.cards) ? board.cards : [],
        lanes: Array.isArray(board.lanes) ? board.lanes : [],
        summary: summaryForBoard(board),
        source: "home-ai-growth-facade",
        facade: {
          version: upstream.facadeVersion || 1,
          migration_stage: upstream.migrationStage || "host_facade",
          data_owner: upstream.dataOwner || "home-ai"
        }
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
    },

    async card({ workspaceId, taskCardId }) {
      const cleanTaskCardId = cleanString(taskCardId);
      if (!cleanTaskCardId) {
        return {
          ok: false,
          error: "task_card_id_required",
          workspace_id: workspaceId,
          card: null
        };
      }
      if (preferPluginData && typeof learningStore?.card === "function") {
        try {
          const nativeDetail = learningStore.card({ workspaceId, taskCardId: cleanTaskCardId });
          if (nativeDetail) return nativeDetail;
        } catch (_) {
          // Fall through to the facade/snapshot path.
        }
      }
      const upstream = await fetchHomeAi(`/api/growth/v1/cards/${encodeURIComponent(cleanTaskCardId)}`, { workspaceId });
      if (upstream && upstream.ok !== false) {
        return {
          ok: true,
          workspace_id: workspaceId,
          card: upstream.card || null,
          source: "home-ai-growth-facade",
          facade: {
            version: upstream.facadeVersion || 1,
            migration_stage: upstream.migrationStage || "host_facade",
            data_owner: upstream.dataOwner || "home-ai"
          }
        };
      }

      if (typeof learningStore?.card === "function") {
        try {
          const nativeDetail = learningStore.card({ workspaceId, taskCardId: cleanTaskCardId });
          if (nativeDetail) return nativeDetail;
        } catch (_) {
          // Fall through to the snapshot path.
        }
      }
      const snapshot = typeof snapshotStore?.get === "function" ? snapshotStore.get(workspaceId) : null;
      const snapshotCard = snapshot ? cardFromSnapshot(snapshot, cleanTaskCardId) : null;
      if (snapshotCard) {
        return {
          ok: true,
          workspace_id: workspaceId,
          card: snapshotCard,
          source: "growth-plugin-snapshot",
          snapshot_updated_at: snapshot.updated_at || ""
        };
      }

      return {
        ok: false,
        error: upstream?.error || "card_not_found",
        workspace_id: workspaceId,
        card: null
      };
    },

    async audio({ workspaceId, recordType, recordId } = {}) {
      if (preferPluginData && typeof learningStore?.audio === "function") {
        const nativeAudio = learningStore.audio({ workspaceId, recordType, recordId });
        if (nativeAudio) return nativeAudio;
      }
      return null;
    },

    async submitEvidence({ workspaceId, taskCardId, body } = {}) {
      if (preferPluginData && typeof learningStore?.submitEvidence === "function") {
        return learningStore.submitEvidence(Object.assign({}, body || {}, { workspaceId, taskCardId }));
      }
      return {
        ok: false,
        error: "growth_plugin_write_not_available",
        workspace_id: workspaceId,
        task_card_id: taskCardId
      };
    },

    async submitReflection({ workspaceId, taskCardId, body } = {}) {
      if (preferPluginData && typeof learningStore?.submitReflection === "function") {
        return learningStore.submitReflection(Object.assign({}, body || {}, { workspaceId, taskCardId }));
      }
      return {
        ok: false,
        error: "growth_plugin_reflection_write_not_available",
        workspace_id: workspaceId,
        task_card_id: taskCardId
      };
    },

    async learningCoinBalance({ workspaceId } = {}) {
      if (preferPluginData && typeof learningStore?.learningCoinBalance === "function") {
        return learningStore.learningCoinBalance({ workspaceId });
      }
      return {
        ok: false,
        error: "growth_learning_coin_balance_unavailable",
        workspace_id: workspaceId
      };
    },

    async clearLearningCoinBalanceForMonthlyExchange({ workspaceId, body } = {}) {
      if (preferPluginData && typeof learningStore?.clearLearningCoinBalanceForMonthlyExchange === "function") {
        return learningStore.clearLearningCoinBalanceForMonthlyExchange(Object.assign({}, body || {}, { workspaceId }));
      }
      return {
        ok: false,
        error: "growth_learning_coin_clear_unavailable",
        workspace_id: workspaceId
      };
    },

    async importFromFacade({ workspaceId, includeCardDetails = true } = {}) {
      const cleanWorkspaceId = cleanString(workspaceId) || "growth:local-dev";
      if (!snapshotStore || typeof snapshotStore.upsert !== "function" || typeof snapshotStore.get !== "function") {
        return {
          ok: false,
          error: "snapshot_store_not_configured",
          workspace_id: cleanWorkspaceId
        };
      }
      const upstream = await fetchHomeAi("/api/growth/v1/board", { workspaceId: cleanWorkspaceId });
      if (!upstream || upstream.ok === false) {
        return {
          ok: false,
          error: upstream?.error || "home_ai_facade_unavailable",
          workspace_id: cleanWorkspaceId
        };
      }
      const board = upstream.board || {};
      const cards = Array.isArray(board.cards) ? board.cards : [];
      const selectedCards = includeCardDetails ? cards.slice(0, migrationMaxCards) : [];
      const cardDetails = {};
      const detailErrors = [];
      for (const card of selectedCards) {
        const taskCardId = normalizeCardId(card);
        if (!taskCardId) continue;
        const detail = await fetchHomeAi(`/api/growth/v1/cards/${encodeURIComponent(taskCardId)}`, {
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
          lanes: Array.isArray(board.lanes) ? board.lanes : [],
          summary: summaryForBoard(board)
        },
        card_details: cardDetails,
        detail_errors: detailErrors,
        facade: {
          version: upstream.facadeVersion || 1,
          migration_stage: upstream.migrationStage || "host_facade",
          data_owner: upstream.dataOwner || "home-ai"
        }
      });
      const readback = snapshotStore.get(cleanWorkspaceId);
      return {
        ok: true,
        workspace_id: cleanWorkspaceId,
        imported: migrationSummary(snapshot),
        readback: migrationSummary(readback)
      };
    },

    migrationReadback({ workspaceId } = {}) {
      const cleanWorkspaceId = cleanString(workspaceId) || "growth:local-dev";
      if (typeof learningStore?.integrity === "function") {
        try {
          const nativeReadback = learningStore.integrity({ workspaceId: cleanWorkspaceId });
          if (nativeReadback.ok) {
            return {
              ok: true,
              workspace_id: cleanWorkspaceId,
              source: "growth-plugin-sqlite",
              sqlite: nativeReadback
            };
          }
        } catch (_) {
          // Fall through to snapshot readback for pre-SQLite staging.
        }
      }
      const snapshot = typeof snapshotStore?.get === "function" ? snapshotStore.get(cleanWorkspaceId) : null;
      if (!snapshot) {
        return {
          ok: false,
          error: "snapshot_not_found",
          workspace_id: cleanWorkspaceId
        };
      }
      return {
        ok: true,
        workspace_id: cleanWorkspaceId,
        snapshot: migrationSummary(snapshot)
      };
    }
  };
}

module.exports = { createGrowthService };
