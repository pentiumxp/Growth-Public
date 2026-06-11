"use strict";

const {
  cardFromSnapshot,
  migrationSummary,
  snapshotBoard
} = require("../growth-service-models");

function createSnapshotGrowthProvider({ snapshotStore } = {}) {
  function getSnapshot(workspaceId) {
    return typeof snapshotStore?.get === "function" ? snapshotStore.get(workspaceId) : null;
  }

  return {
    board({ workspaceId } = {}) {
      const snapshot = getSnapshot(workspaceId);
      return snapshot ? snapshotBoard(snapshot) : null;
    },

    card({ workspaceId, taskCardId } = {}) {
      const snapshot = getSnapshot(workspaceId);
      const snapshotCard = snapshot ? cardFromSnapshot(snapshot, taskCardId) : null;
      if (!snapshotCard) return null;
      return {
        ok: true,
        workspace_id: workspaceId,
        card: snapshotCard,
        source: "growth-plugin-snapshot",
        snapshot_updated_at: snapshot.updated_at || ""
      };
    },

    migrationReadback({ workspaceId } = {}) {
      const snapshot = getSnapshot(workspaceId);
      if (!snapshot) return null;
      return {
        ok: true,
        workspace_id: workspaceId,
        snapshot: migrationSummary(snapshot)
      };
    }
  };
}

module.exports = { createSnapshotGrowthProvider };
