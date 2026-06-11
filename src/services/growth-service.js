const { createHomeAiGrowthFacadeClient } = require("./home-ai-growth-facade-client");
const {
  cleanString
} = require("./growth-service-models");
const { createGrowthReadOrchestrator } = require("./growth-read-orchestrator");
const { createGrowthWriteOrchestrator } = require("./growth-write-orchestrator");
const { createHomeAiFacadeGrowthProvider } = require("./growth-providers/home-ai-facade-provider");
const { createSnapshotGrowthProvider } = require("./growth-providers/snapshot-provider");
const { createSqliteGrowthProvider } = require("./growth-providers/sqlite-provider");
const { createSqliteGrowthWriteProvider } = require("./growth-providers/sqlite-write-provider");

function createGrowthService(options = {}) {
  const config = options.config || {};
  const fetchImpl = options.fetch || global.fetch;
  const snapshotStore = options.snapshotStore || null;
  const learningStore = options.learningStore || null;
  const migrationMaxCards = Number.isFinite(Number(config.migrationMaxCards)) ? Math.max(0, Number(config.migrationMaxCards)) : 50;
  const preferPluginData = cleanString(config.dataOwner).toLowerCase() === "plugin";
  const homeAiFacade = createHomeAiGrowthFacadeClient({
    baseUrl: config.homeAiApiBaseUrl,
    accessKey: config.homeAiAccessKey,
    fetchImpl
  });
  const sqliteProvider = createSqliteGrowthProvider({ learningStore });
  const sqliteWriteProvider = createSqliteGrowthWriteProvider({ learningStore });
  const snapshotProvider = createSnapshotGrowthProvider({ snapshotStore });
  const facadeProvider = createHomeAiFacadeGrowthProvider({
    facadeClient: homeAiFacade,
    snapshotStore,
    migrationMaxCards
  });
  const readOrchestrator = createGrowthReadOrchestrator({
    preferPluginData,
    sqliteProvider,
    facadeProvider,
    snapshotProvider
  });
  const writeOrchestrator = createGrowthWriteOrchestrator({
    preferPluginData,
    sqliteWriteProvider
  });

  return {
    status: readOrchestrator.status,
    board: readOrchestrator.board,
    card: readOrchestrator.card,

    async audio({ workspaceId, recordType, recordId } = {}) {
      if (preferPluginData) {
        const nativeAudio = sqliteProvider.audio({ workspaceId, recordType, recordId });
        if (nativeAudio) return nativeAudio;
      }
      return null;
    },

    submitEvidence: writeOrchestrator.submitEvidence,
    submitReflection: writeOrchestrator.submitReflection,
    learningCoinBalance: writeOrchestrator.learningCoinBalance,
    clearLearningCoinBalanceForMonthlyExchange: writeOrchestrator.clearLearningCoinBalanceForMonthlyExchange,

    async importFromFacade({ workspaceId, includeCardDetails = true } = {}) {
      return facadeProvider.importFromFacade({ workspaceId, includeCardDetails });
    },

    migrationReadback({ workspaceId } = {}) {
      return readOrchestrator.migrationReadback({ workspaceId });
    }
  };
}

module.exports = { createGrowthService };
