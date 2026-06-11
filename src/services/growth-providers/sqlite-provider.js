"use strict";

const { sqliteStatus } = require("../growth-service-models");

function createSqliteGrowthProvider({ learningStore } = {}) {
  function enabled() {
    return Boolean(learningStore);
  }

  return {
    enabled,

    status({ workspaceId } = {}) {
      if (typeof learningStore?.integrity !== "function") return null;
      const readback = learningStore.integrity({ workspaceId });
      return readback?.ok ? sqliteStatus(readback) : null;
    },

    board({ workspaceId } = {}) {
      if (typeof learningStore?.board !== "function") return null;
      return learningStore.board({ workspaceId }) || null;
    },

    card({ workspaceId, taskCardId } = {}) {
      if (typeof learningStore?.card !== "function") return null;
      return learningStore.card({ workspaceId, taskCardId }) || null;
    },

    audio({ workspaceId, recordType, recordId } = {}) {
      if (typeof learningStore?.audio !== "function") return null;
      return learningStore.audio({ workspaceId, recordType, recordId }) || null;
    },

    migrationReadback({ workspaceId } = {}) {
      if (typeof learningStore?.integrity !== "function") return null;
      const nativeReadback = learningStore.integrity({ workspaceId });
      if (!nativeReadback?.ok) return null;
      return {
        ok: true,
        workspace_id: workspaceId,
        source: "growth-plugin-sqlite",
        sqlite: nativeReadback
      };
    }
  };
}

module.exports = { createSqliteGrowthProvider };
