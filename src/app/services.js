const { createGrowthService } = require("../services/growth-service");
const { createGrowthEvaluationService } = require("../services/growth-evaluation-service");
const { createGrowthEventService } = require("../services/growth-event-service");
const { createHermesPluginService } = require("../services/hermes-plugin-service");
const { createLearningCardGraphBindingService } = require("../services/learning-card-graph-binding-service");
const { createLearningGraphPlanService } = require("../services/learning-graph-plan-service");
const { createGrowthMcpExecutor } = require("../mcp/growth-mcp-schemas");
const { createGrowthEventOutboxStore } = require("../stores/growth-event-outbox-store");
const { createGrowthLearningSqliteStore } = require("../stores/growth-learning-sqlite-store");
const { createGrowthSnapshotStore } = require("../stores/growth-snapshot-store");
const { createJsonWorkspaceStore } = require("../stores/json-workspace-store");

function createServices(config) {
  const workspaceStore = createJsonWorkspaceStore({ filePath: config.workspaceStorePath });
  const growthSnapshotStore = createGrowthSnapshotStore({ filePath: config.snapshotStorePath });
  const growthLearningStore = createGrowthLearningSqliteStore({
    dbPath: config.learningDbPath,
    legacyAudioRoots: config.legacyAudioRoots
  });
  const growthEventOutboxStore = createGrowthEventOutboxStore({ filePath: config.eventOutboxStorePath });
  const growthService = createGrowthService({ config, snapshotStore: growthSnapshotStore, learningStore: growthLearningStore });
  const growthEventService = createGrowthEventService({ config, outboxStore: growthEventOutboxStore });
  const learningGraphPlanService = createLearningGraphPlanService({
    graphRepository: growthLearningStore.learningGraphRepository
  });
  const learningCardGraphBindingService = createLearningCardGraphBindingService({
    graphRepository: growthLearningStore.learningGraphRepository
  });
  const growthEvaluationService = createGrowthEvaluationService({
    learningStore: growthLearningStore,
    eventService: growthEventService
  });
  return {
    config,
    growthEvaluationService,
    growthEventService,
    growthMcpExecutor: createGrowthMcpExecutor({ growthService }),
    growthService,
    learningCardGraphBindingService,
    learningGraphPlanService,
    pluginService: createHermesPluginService({ config, workspaceStore })
  };
}

module.exports = { createServices };
