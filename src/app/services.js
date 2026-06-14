const { createGrowthService } = require("../services/growth-service");
const { createGrowthEvaluationService } = require("../services/growth-evaluation-service");
const { createGrowthEventService } = require("../services/growth-event-service");
const { createGrowthGatewayAuthoringClient } = require("../services/growth-gateway-authoring-client");
const { createGrowthGatewayEvaluationClient } = require("../services/growth-gateway-evaluation-client");
const { createHermesPluginService } = require("../services/hermes-plugin-service");
const { createLearningCardAuthoringService } = require("../services/learning-card-authoring-service");
const { createLearningCardAuthoringValidationService } = require("../services/learning-card-authoring-validation-service");
const { createLearningCardEvaluationService } = require("../services/learning-card-evaluation-service");
const { createLearningCardGraphBindingService } = require("../services/learning-card-graph-binding-service");
const { createLearningCardGenerationContextService } = require("../services/learning-card-generation-context-service");
const { createLearningCardGenerationService } = require("../services/learning-card-generation-service");
const { createLearningCardTrajectoryService } = require("../services/learning-card-trajectory-service");
const { createLearningExperienceSignalService } = require("../services/learning-experience-signal-service");
const { createLearningGraphPlanService } = require("../services/learning-graph-plan-service");
const { createLearningMasteryProfileService } = require("../services/learning-mastery-profile-service");
const { createLearningNextCardStrategyService } = require("../services/learning-next-card-strategy-service");
const { createLearningProfileProjectionService } = require("../services/learning-profile-projection-service");
const { createLearningStageAssessmentService } = require("../services/learning-stage-assessment-service");
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
    protocol: config.gatewayAuthoringProtocol,
    model: config.gatewayAuthoringModel,
    stream: config.gatewayAuthoringStream,
    timeoutMs: config.gatewayAuthoringTimeoutMs
  });
  const growthGatewayEvaluationClient = createGrowthGatewayEvaluationClient({
    endpoint: config.gatewayEvaluationEndpoint,
    accessToken: config.gatewayEvaluationAccessToken,
    protocol: config.gatewayEvaluationProtocol,
    model: config.gatewayEvaluationModel,
    stream: config.gatewayEvaluationStream,
    timeoutMs: config.gatewayEvaluationTimeoutMs
  });
  const learningCardAuthoringService = createLearningCardAuthoringService({
    gatewayClient: growthGatewayAuthoringClient,
    validationService: createLearningCardAuthoringValidationService(),
    publisher: growthLearningStore.learningCardAuthoringPublisherRepository
  });
  const learningCardEvaluationService = createLearningCardEvaluationService({
    gatewayClient: growthGatewayEvaluationClient
  });
  const learningNextCardStrategyService = createLearningNextCardStrategyService();
  const learningMasteryProfileService = createLearningMasteryProfileService({
    repository: growthLearningStore.masteryProfileRepository
  });
  const learningCardTrajectoryService = createLearningCardTrajectoryService({
    repository: growthLearningStore.masteryProfileRepository
  });
  const learningExperienceSignalService = createLearningExperienceSignalService({
    repository: growthLearningStore.masteryProfileRepository
  });
  const learningProfileProjectionService = createLearningProfileProjectionService({
    repository: growthLearningStore.masteryProfileRepository,
    nextCardStrategyService: learningNextCardStrategyService
  });
  const learningCardGenerationService = createLearningCardGenerationService({
    graphPlanService: learningGraphPlanService,
    graphRepository: growthLearningStore.learningGraphRepository,
    historySummaryRepository: growthLearningStore.learningHistorySummaryRepository,
    nextCardStrategyService: learningNextCardStrategyService,
    authoringService: learningCardAuthoringService
  });
  const learningStageAssessmentService = createLearningStageAssessmentService({
    repository: growthLearningStore.stageAssessmentCycleRepository,
    profileProjectionService: learningProfileProjectionService,
    cardGenerationService: learningCardGenerationService
  });
  const learningCardGenerationContextService = createLearningCardGenerationContextService({
    graphRepository: growthLearningStore.learningGraphRepository,
    historySummaryRepository: growthLearningStore.learningHistorySummaryRepository,
    profileProjectionService: learningProfileProjectionService,
    nextCardStrategyService: learningNextCardStrategyService,
    gatewayConfigured: () => Boolean(config.gatewayAuthoringEndpoint)
  });
  const growthEvaluationService = createGrowthEvaluationService({
    learningStore: growthLearningStore,
    profileService: learningMasteryProfileService,
    nextCardStrategyService: learningNextCardStrategyService,
    trajectoryService: learningCardTrajectoryService,
    eventService: growthEventService,
    evaluator: config.gatewayEvaluationEndpoint
      ? learningCardEvaluationService.evaluateSubmission
      : undefined
  });
  return {
    config,
    growthEvaluationService,
    growthEventService,
    growthGatewayEvaluationClient,
    growthMcpExecutor: createGrowthMcpExecutor({ growthService }),
    growthService,
    learningCardAuthoringService,
    learningCardEvaluationService,
    learningCardGenerationContextService,
    learningCardGenerationService,
    learningCardGraphBindingService,
    learningCardTrajectoryService,
    learningExperienceSignalService,
    learningGraphPlanService,
    learningMasteryProfileService,
    learningNextCardStrategyService,
    learningProfileProjectionService,
    learningStageAssessmentService,
    pluginService: createHermesPluginService({ config, workspaceStore })
  };
}

module.exports = { createServices };
