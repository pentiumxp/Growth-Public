"use strict";

const {
  cleanString,
  fallbackBoard,
  fallbackStatus
} = require("./growth-service-models");

async function firstResult(steps = []) {
  for (const step of steps) {
    try {
      const result = await step();
      if (result) return result;
    } catch (_) {
      // Try the next provider in the declared fallback order.
    }
  }
  return null;
}

function createGrowthReadOrchestrator({
  preferPluginData = false,
  sqliteProvider,
  facadeProvider,
  snapshotProvider
} = {}) {
  const sqliteFirst = Boolean(preferPluginData);

  async function status({ workspaceId } = {}) {
    const result = sqliteFirst
      ? await firstResult([
        () => sqliteProvider.status({ workspaceId }),
        () => facadeProvider.status({ workspaceId })
      ])
      : await firstResult([
        () => facadeProvider.status({ workspaceId })
      ]);
    return result || fallbackStatus("");
  }

  async function board({ workspaceId } = {}) {
    const result = sqliteFirst
      ? await firstResult([
        () => sqliteProvider.board({ workspaceId }),
        () => facadeProvider.board({ workspaceId }),
        () => snapshotProvider.board({ workspaceId })
      ])
      : await firstResult([
        () => facadeProvider.board({ workspaceId }),
        () => sqliteProvider.board({ workspaceId }),
        () => snapshotProvider.board({ workspaceId })
      ]);
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
    const result = sqliteFirst
      ? await firstResult([
        () => sqliteProvider.card({ workspaceId, taskCardId: cleanTaskCardId }),
        () => facadeProvider.card({ workspaceId, taskCardId: cleanTaskCardId }),
        () => snapshotProvider.card({ workspaceId, taskCardId: cleanTaskCardId })
      ])
      : await firstResult([
        () => facadeProvider.card({ workspaceId, taskCardId: cleanTaskCardId }),
        () => sqliteProvider.card({ workspaceId, taskCardId: cleanTaskCardId }),
        () => snapshotProvider.card({ workspaceId, taskCardId: cleanTaskCardId })
      ]);
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
  firstSyncResult
};
