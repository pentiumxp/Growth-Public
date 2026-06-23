"use strict";

const {
  cleanString,
  fallbackBoard,
  fallbackStatus
} = require("./growth-service-models");

async function firstResult(steps = []) {
  for (const step of steps) {
    const read = typeof step === "function" ? step : step?.read;
    const provider = typeof step === "function" ? "unknown" : step?.provider;
    try {
      const result = typeof read === "function" ? await read() : null;
      if (result) return { result, failure: null };
    } catch (error) {
      return {
        result: null,
        failure: providerFailure(provider, error)
      };
    }
  }
  return { result: null, failure: null };
}

function createGrowthReadOrchestrator({
  preferPluginData = false,
  sqliteProvider,
  facadeProvider,
  snapshotProvider
} = {}) {
  const sqliteFirst = Boolean(preferPluginData);

  async function status({ workspaceId } = {}) {
    const read = sqliteFirst
      ? await firstResult([
        { provider: "growth-plugin-sqlite", read: () => sqliteProvider.status({ workspaceId }) },
        { provider: "home-ai-growth-facade", read: () => facadeProvider.status({ workspaceId }) }
      ])
      : await firstResult([
        { provider: "home-ai-growth-facade", read: () => facadeProvider.status({ workspaceId }) }
      ]);
    if (read.failure) return failedStatus({ workspaceId, failure: read.failure });
    const result = read.result;
    return result || fallbackStatus("");
  }

  async function board({ workspaceId } = {}) {
    const read = sqliteFirst
      ? await firstResult([
        { provider: "growth-plugin-sqlite", read: () => sqliteProvider.board({ workspaceId }) },
        { provider: "home-ai-growth-facade", read: () => facadeProvider.board({ workspaceId }) },
        { provider: "growth-plugin-snapshot", read: () => snapshotProvider.board({ workspaceId }) }
      ])
      : await firstResult([
        { provider: "home-ai-growth-facade", read: () => facadeProvider.board({ workspaceId }) },
        { provider: "growth-plugin-sqlite", read: () => sqliteProvider.board({ workspaceId }) },
        { provider: "growth-plugin-snapshot", read: () => snapshotProvider.board({ workspaceId }) }
      ]);
    if (read.failure) return failedBoard({ workspaceId, failure: read.failure });
    const result = read.result;
    return result || fallbackBoard({ workspaceId });
  }

  async function card({ workspaceId, taskCardId } = {}) {
    const cleanTaskCardId = cleanString(taskCardId);
    if (!cleanTaskCardId) {
      return {
        ok: false,
        error: "task_card_id_required",
        workspace_id: workspaceId,
        card: null
      };
    }
    const read = sqliteFirst
      ? await firstResult([
        { provider: "growth-plugin-sqlite", read: () => sqliteProvider.card({ workspaceId, taskCardId: cleanTaskCardId }) },
        { provider: "home-ai-growth-facade", read: () => facadeProvider.card({ workspaceId, taskCardId: cleanTaskCardId }) },
        { provider: "growth-plugin-snapshot", read: () => snapshotProvider.card({ workspaceId, taskCardId: cleanTaskCardId }) }
      ])
      : await firstResult([
        { provider: "home-ai-growth-facade", read: () => facadeProvider.card({ workspaceId, taskCardId: cleanTaskCardId }) },
        { provider: "growth-plugin-sqlite", read: () => sqliteProvider.card({ workspaceId, taskCardId: cleanTaskCardId }) },
        { provider: "growth-plugin-snapshot", read: () => snapshotProvider.card({ workspaceId, taskCardId: cleanTaskCardId }) }
      ]);
    if (read.failure) return failedCard({ workspaceId, taskCardId: cleanTaskCardId, failure: read.failure });
    const result = read.result;
    return result || {
      ok: false,
      error: "card_not_found",
      workspace_id: workspaceId,
      card: null
    };
  }

  function migrationReadback({ workspaceId } = {}) {
    const cleanWorkspaceId = cleanString(workspaceId) || "growth:local-dev";
    const result = firstSyncResult([
      () => sqliteProvider.migrationReadback({ workspaceId: cleanWorkspaceId }),
      () => snapshotProvider.migrationReadback({ workspaceId: cleanWorkspaceId })
    ]);
    return result || {
      ok: false,
      error: "snapshot_not_found",
      workspace_id: cleanWorkspaceId
    };
  }

  return {
    board,
    card,
    migrationReadback,
    status
  };
}

function providerFailure(provider, error) {
  const code = safeCode(error?.code || error?.error || error?.message) || "growth_read_provider_failed";
  return {
    provider: cleanString(provider) || "unknown",
    code,
    status: Number(error?.status || error?.statusCode || 0) || 0
  };
}

function providerFailureReadStatus(failure) {
  return {
    ok: false,
    degraded: true,
    provider_failure: true,
    error: "growth_read_provider_failed",
    failed_provider: failure.provider,
    provider_error: failure.code,
    provider_status: failure.status || 0
  };
}

function failedStatus({ workspaceId, failure }) {
  return {
    ok: false,
    plugin_id: "growth",
    stage: "provider_failed",
    data_ownership: "unknown",
    plugin_data_ownership: "unknown",
    mcp_toolset: "read_only",
    source: "growth-read-orchestrator",
    workspace_id: workspaceId,
    degraded: true,
    provider_failure: true,
    error: "growth_read_provider_failed",
    read_status: providerFailureReadStatus(failure)
  };
}

function failedBoard({ workspaceId, failure }) {
  return {
    ok: false,
    workspace_id: workspaceId,
    cards: [],
    lanes: [],
    summary: {
      total: 0,
      active: 0,
      waiting_review: 0,
      completed: 0
    },
    source: "growth-read-orchestrator",
    degraded: true,
    provider_failure: true,
    stale: false,
    error: "growth_read_provider_failed",
    read_status: providerFailureReadStatus(failure)
  };
}

function failedCard({ workspaceId, taskCardId, failure }) {
  return {
    ok: false,
    workspace_id: workspaceId,
    task_card_id: taskCardId,
    card: null,
    source: "growth-read-orchestrator",
    degraded: true,
    provider_failure: true,
    stale: false,
    error: "growth_read_provider_failed",
    read_status: providerFailureReadStatus(failure)
  };
}

function safeCode(value) {
  const text = cleanString(value).toLowerCase().replace(/[^a-z0-9_:-]+/g, "_").replace(/^_+|_+$/g, "");
  if (!text) return "";
  if (text.length > 80) return text.slice(0, 80);
  return text;
}

function firstSyncResult(steps = []) {
  for (const step of steps) {
    try {
      const result = step();
      if (result) return result;
    } catch (_) {
      // Try the next provider in the declared fallback order.
    }
  }
  return null;
}

module.exports = {
  createGrowthReadOrchestrator,
  firstResult,
  firstSyncResult,
  providerFailure
};
