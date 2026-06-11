const { createGrowthService } = require("../services/growth-service");
const { createGrowthEvaluationService } = require("../services/growth-evaluation-service");
const { createGrowthEventService } = require("../services/growth-event-service");
const { createGrowthGatewayAuthoringClient } = require("../services/growth-gateway-authoring-client");
const { createHermesPluginService } = require("../services/hermes-plugin-service");
const { createLearningCardAuthoringService } = require("../services/learning-card-authoring-service");
const { createLearningCardAuthoringValidationService } = require("../services/learning-card-authoring-validation-service");
const { createLearningCardGraphBindingService } = require("../services/learning-card-graph-binding-service");
const { createLearningCardGenerationContextService } = require("../services/learning-card-generation-context-service");
const { createLearningCardGenerationService } = require("../services/learning-card-generation-service");
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
  const growthGatewayAuthoringClient = createGrowthGatewayAuthoringClient({
    endpoint: config.gatewayAuthoringEndpoint,
    accessToken: config.gatewayAuthoringAccessToken,
    timeoutMs: config.gatewayAuthoringTimeoutMs
  });
  const learningCardAuthoringService = createLearningCardAuthoringService({
    gatewayClient: growthGatewayAuthoringClient,
    validationService: createLearningCardAuthoringValidationService(),
    publisher: growthLearningStore.learningCardAuthoringPublisherRepository
  });
  const learningCardGenerationService = createLearningCardGenerationService({
    graphPlanService: learningGraphPlanService,
    graphRepository: growthLearningStore.learningGraphRepository,
    historySummaryRepository: growthLearningStore.learningHistorySummaryRepository,
    authoringService: learningCardAuthoringService
  });
  const learningCardGenerationContextService = createLearningCardGenerationContextService({
    graphRepository: growthLearningStore.learningGraphRepository,
    historySummaryRepository: growthLearningStore.learningHistorySummaryRepository,
    gatewayConfigured: () => Boolean(config.gatewayAuthoringEndpoint)
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
    learningCardAuthoringService,
    learningCardGenerationContextService,
    learningCardGenerationService,
    learningCardGraphBindingService,
    learningGraphPlanService,
    pluginService: createHermesPluginService({ config, workspaceStore })
  };
}

module.exports = { createServices };
