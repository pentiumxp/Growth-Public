"use strict";

function withWorkspaceAndBody({ workspaceId, taskCardId, body } = {}) {
  return Object.assign({}, body || {}, { workspaceId, taskCardId });
}

function createSqliteGrowthWriteProvider({ learningStore } = {}) {
  function enabled() {
    return Boolean(learningStore);
  }

  return {
    enabled,

    submitEvidence({ workspaceId, taskCardId, body } = {}) {
      if (typeof learningStore?.submitEvidence !== "function") return null;
      return learningStore.submitEvidence(withWorkspaceAndBody({ workspaceId, taskCardId, body }));
    },

    submitReflection({ workspaceId, taskCardId, body } = {}) {
      if (typeof learningStore?.submitReflection !== "function") return null;
      return learningStore.submitReflection(withWorkspaceAndBody({ workspaceId, taskCardId, body }));
    },

    learningCoinBalance({ workspaceId } = {}) {
      if (typeof learningStore?.learningCoinBalance !== "function") return null;
      return learningStore.learningCoinBalance({ workspaceId });
    },

    clearLearningCoinBalanceForMonthlyExchange({ workspaceId, body } = {}) {
      if (typeof learningStore?.clearLearningCoinBalanceForMonthlyExchange !== "function") return null;
      return learningStore.clearLearningCoinBalanceForMonthlyExchange(Object.assign({}, body || {}, { workspaceId }));
    }
  };
}

module.exports = { createSqliteGrowthWriteProvider };
