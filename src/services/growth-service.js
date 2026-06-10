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

function cardFromBoard(board = {}, taskCardId = "") {
  const id = cleanString(taskCardId);
  if (!id) return null;
  const cards = Array.isArray(board.cards) ? board.cards : [];
  return cards.find((card) => cleanString(card.taskCardId) === id) || null;
}

function createGrowthService(options = {}) {
  const config = options.config || {};
  const fetchImpl = options.fetch || global.fetch;
  const snapshotStore = options.snapshotStore || null;
  const homeAiApiBaseUrl = normalizeBaseUrl(config.homeAiApiBaseUrl);
  const homeAiAccessKey = cleanString(config.homeAiAccessKey);

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
      const upstream = await fetchHomeAi("/api/growth/v1/board", { workspaceId });
      if (!upstream || upstream.ok === false) {
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

      const snapshot = typeof snapshotStore?.get === "function" ? snapshotStore.get(workspaceId) : null;
      const snapshotCard = snapshot ? cardFromBoard(snapshot.board || {}, cleanTaskCardId) : null;
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
    }
  };
}

module.exports = { createGrowthService };
