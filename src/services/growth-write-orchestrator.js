"use strict";

function unavailable(error, workspaceId, extra = {}) {
  return Object.assign({
    ok: false,
    error,
    workspace_id: workspaceId
  }, extra);
}

function callPluginWrite({ preferPluginData, provider, method, args, fallbackError, extra }) {
  const workspaceId = args?.workspaceId;
  if (!preferPluginData || typeof provider?.[method] !== "function" || provider.enabled?.() === false) {
    return unavailable(fallbackError, workspaceId, extra);
  }
  const result = provider[method](args);
  return result || unavailable(fallbackError, workspaceId, extra);
}

function createGrowthWriteOrchestrator({ preferPluginData = false, sqliteWriteProvider } = {}) {
  return {
    submitEvidence(args = {}) {
      return callPluginWrite({
        preferPluginData,
        provider: sqliteWriteProvider,
        method: "submitEvidence",
        args,
        fallbackError: "growth_plugin_write_not_available",
        extra: { task_card_id: args.taskCardId }
      });
    },

    submitReflection(args = {}) {
      return callPluginWrite({
        preferPluginData,
        provider: sqliteWriteProvider,
        method: "submitReflection",
        args,
        fallbackError: "growth_plugin_reflection_write_not_available",
        extra: { task_card_id: args.taskCardId }
      });
    },

    learningCoinBalance(args = {}) {
      return callPluginWrite({
        preferPluginData,
        provider: sqliteWriteProvider,
        method: "learningCoinBalance",
        args,
        fallbackError: "growth_learning_coin_balance_unavailable"
      });
    },

    clearLearningCoinBalanceForMonthlyExchange(args = {}) {
      return callPluginWrite({
        preferPluginData,
        provider: sqliteWriteProvider,
        method: "clearLearningCoinBalanceForMonthlyExchange",
        args,
        fallbackError: "growth_learning_coin_clear_unavailable"
      });
    }
  };
}

module.exports = { createGrowthWriteOrchestrator };
