const fs = require("node:fs");
const { createGrowthService } = require("../services/growth-service");
const { createGrowthEvaluationService } = require("../services/growth-evaluation-service");
const { createGrowthEventService } = require("../services/growth-event-service");
const { createGrowthGatewayAuthoringClient } = require("../services/growth-gateway-authoring-client");
const { createGrowthGatewayEvaluationClient } = require("../services/growth-gateway-evaluation-client");
const { createGrowthGatewayPlannerClient } = require("../services/growth-gateway-planner-client");
const { createHermesPluginService } = require("../services/hermes-plugin-service");
const { createLearningAutomationActionHandoffService } = require("../services/learning-automation-action-handoff-service");
const { createLearningAutomationCentralVisualEvidenceService } = require("../services/learning-automation-central-visual-evidence-service");
const { createLearningAutomationDigestService } = require("../services/learning-automation-digest-service");
const { createLearningAutomationFailurePolicyService } = require("../services/learning-automation-failure-policy-service");
const { createLearningAutomationPlatformActionEvidenceService } = require("../services/learning-automation-platform-action-evidence-service");
const { createLearningAutomationProposalService } = require("../services/learning-automation-proposal-service");
const { createLearningAutomationReleaseApprovalService } = require("../services/learning-automation-release-approval-service");
const { createLearningAutomationReleaseActivationService } = require("../services/learning-automation-release-activation-service");
const { createLearningAutomationReleaseAuthorizationService } = require("../services/learning-automation-release-authorization-service");
const { createLearningAutomationReleaseClosureService } = require("../services/learning-automation-release-closure-service");
const { createLearningAutomationReleaseCollectionRunService } = require("../services/learning-automation-release-collection-run-service");
const { createLearningAutomationReleaseControlsService } = require("../services/learning-automation-release-controls-service");
const { createLearningAutomationReleaseDecisionService } = require("../services/learning-automation-release-decision-service");
const { createLearningAutomationReleaseEvidenceBundleAuditService } = require("../services/learning-automation-release-evidence-bundle-audit-service");
const { createLearningAutomationReleasePackageService } = require("../services/learning-automation-release-package-service");
const { createLearningAutomationReleaseReadinessService } = require("../services/learning-automation-release-readiness-service");
const { createLearningAutomationReleaseReviewService } = require("../services/learning-automation-release-review-service");
const { createLearningAutomationRuntimeEnablementService } = require("../services/learning-automation-runtime-enablement-service");
const { createLearningAutomationSchedulerExecutionService } = require("../services/learning-automation-scheduler-execution-service");
const { createLearningAutomationSchedulerRunService } = require("../services/learning-automation-scheduler-run-service");
const { createLearningAutomationSchedulerService } = require("../services/learning-automation-scheduler-service");
const { createLearningAutomationSchedulerWorkerService } = require("../services/learning-automation-scheduler-worker-service");
const { createLearningAutomationSchedulerWorkerTargetService } = require("../services/learning-automation-scheduler-worker-target-service");
const { createLearningCardAuthoringService } = require("../services/learning-card-authoring-service");
const { createLearningCardAuthoringValidationService } = require("../services/learning-card-authoring-validation-service");
const { createLearningCardEvaluationService } = require("../services/learning-card-evaluation-service");
const { createLearningCardGraphBindingService } = require("../services/learning-card-graph-binding-service");
const { createLearningCardGenerationContextService } = require("../services/learning-card-generation-context-service");
const { createLearningCardGenerationRecipePolicyService } = require("../services/learning-card-generation-recipe-policy-service");
const { createLearningCardGenerationService } = require("../services/learning-card-generation-service");
const { createLearningCardNextTargetService } = require("../services/learning-card-next-target-service");
const { createLearningCardRecommendationService } = require("../services/learning-card-recommendation-service");
const { createLearningCardTrajectoryService } = require("../services/learning-card-trajectory-service");
const { createLearningAuditCompletenessService } = require("../services/learning-audit-completeness-service");
const { createLearningCycleAuditService } = require("../services/learning-cycle-audit-service");
const { createLearningCycleHistoryService } = require("../services/learning-cycle-history-service");
const { createLearningDailyLoopService } = require("../services/learning-daily-loop-service");
const { createLearningLoopStateService } = require("../services/learning-loop-state-service");
const { createLearningLearnerCycleService } = require("../services/learning-learner-cycle-service");
const { createLearningEvidenceAuditService } = require("../services/learning-evidence-audit-service");
const { createLearningEvidenceLedgerService } = require("../services/learning-evidence-ledger-service");
const { createLearningEvaluationOwnerReviewService } = require("../services/learning-evaluation-owner-review-service");
const { createLearningExperienceSignalService } = require("../services/learning-experience-signal-service");
const { createLearningGraphPlanService } = require("../services/learning-graph-plan-service");
const { createLearningMasteryProfileService } = require("../services/learning-mastery-profile-service");
const { createLearningNextCardStrategyService } = require("../services/learning-next-card-strategy-service");
const { createLearningOwnerCorrectionService } = require("../services/learning-owner-correction-service");
const { createLearningPlanAuditService } = require("../services/learning-plan-audit-service");
const { createLearningPlanOrchestratorService } = require("../services/learning-plan-orchestrator-service");
const { createLearningPlanPublisherService } = require("../services/learning-plan-publisher-service");
const { createLearningPlanValidationService } = require("../services/learning-plan-validation-service");
const { createLearningPlannerContextService } = require("../services/learning-planner-context-service");
const { createLearningProfileDeltaAuditService } = require("../services/learning-profile-delta-audit-service");
const { createLearningProfileDeltaService } = require("../services/learning-profile-delta-service");
const { createLearningProfileFeedbackEvidenceService } = require("../services/learning-profile-feedback-evidence-service");
const { createLearningProfileProjectionService } = require("../services/learning-profile-projection-service");
const { createLearningProfileV2Service } = require("../services/learning-profile-v2-service");
const { createLearningStageAssessmentService } = require("../services/learning-stage-assessment-service");
const { createLearningTargetProvisioningService } = require("../services/learning-target-provisioning-service");
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
  const growthGatewayPlannerClient = createGrowthGatewayPlannerClient({
    endpoint: config.gatewayPlannerEndpoint,
    accessToken: config.gatewayPlannerAccessToken,
    protocol: config.gatewayPlannerProtocol,
    model: config.gatewayPlannerModel,
    stream: config.gatewayPlannerStream,
    timeoutMs: config.gatewayPlannerTimeoutMs
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
  const learningEvidenceLedgerService = createLearningEvidenceLedgerService({
    repository: growthLearningStore.learningEvidenceLedgerRepository
  });
  const learningEvidenceAuditService = createLearningEvidenceAuditService({
    evidenceLedgerService: learningEvidenceLedgerService
  });
  const learningMasteryProfileService = createLearningMasteryProfileService({
    repository: growthLearningStore.masteryProfileRepository
  });
  const learningCardTrajectoryService = createLearningCardTrajectoryService({
    repository: growthLearningStore.masteryProfileRepository
  });
  const learningExperienceSignalService = createLearningExperienceSignalService({
    repository: growthLearningStore.masteryProfileRepository,
    evidenceLedgerService: learningEvidenceLedgerService
  });
  const learningEvaluationOwnerReviewService = createLearningEvaluationOwnerReviewService({
    repository: growthLearningStore
  });
  const learningProfileProjectionService = createLearningProfileProjectionService({
    repository: growthLearningStore.masteryProfileRepository,
    nextCardStrategyService: learningNextCardStrategyService
  });
  const learningProfileV2Service = createLearningProfileV2Service({
    evidenceLedgerService: learningEvidenceLedgerService,
    legacyProfileProjectionService: learningProfileProjectionService
  });
  const learningProfileDeltaService = createLearningProfileDeltaService({
    profileV2Service: learningProfileV2Service,
    repository: growthLearningStore.profileDeltaAuditRepository
  });
  const learningProfileDeltaAuditService = createLearningProfileDeltaAuditService({
    repository: growthLearningStore.profileDeltaAuditRepository
  });
  const learningTargetProvisioningService = createLearningTargetProvisioningService({
    repository: growthLearningStore.domainPackProvisionRepository,
    graphRepository: growthLearningStore.learningGraphRepository
  });
  const learningOwnerCorrectionService = createLearningOwnerCorrectionService({
    evidenceLedgerService: learningEvidenceLedgerService,
    targetProvisioningService: learningTargetProvisioningService
  });
  const learningCardRecommendationService = createLearningCardRecommendationService({
    repository: growthLearningStore.masteryProfileRepository,
    profileProjectionService: learningProfileProjectionService
  });
  const learningCardGenerationRecipePolicyService = createLearningCardGenerationRecipePolicyService();
  const learningCardNextTargetService = createLearningCardNextTargetService({
    graphRepository: growthLearningStore.learningGraphRepository,
    historySummaryRepository: growthLearningStore.learningHistorySummaryRepository,
    recommendationService: learningCardRecommendationService,
    profileProjectionService: learningProfileProjectionService,
    nextCardStrategyService: learningNextCardStrategyService
  });
  const learningCardGenerationService = createLearningCardGenerationService({
    graphPlanService: learningGraphPlanService,
    graphRepository: growthLearningStore.learningGraphRepository,
    historySummaryRepository: growthLearningStore.learningHistorySummaryRepository,
    nextTargetService: learningCardNextTargetService,
    nextCardStrategyService: learningNextCardStrategyService,
    recipePolicyService: learningCardGenerationRecipePolicyService,
    targetProvisioningService: learningTargetProvisioningService,
    authoringService: learningCardAuthoringService
  });
  const learningStageAssessmentService = createLearningStageAssessmentService({
    repository: growthLearningStore.stageAssessmentCycleRepository,
    profileProjectionService: learningProfileProjectionService,
    cardGenerationService: learningCardGenerationService
  });
  const learningPlannerContextService = createLearningPlannerContextService({
    evidenceLedgerService: learningEvidenceLedgerService,
    graphRepository: growthLearningStore.learningGraphRepository,
    profileV2Service: learningProfileV2Service,
    stageAssessmentService: learningStageAssessmentService
  });
  const learningPlanValidationService = createLearningPlanValidationService();
  const learningPlanOrchestratorService = createLearningPlanOrchestratorService({
    gatewayClient: growthGatewayPlannerClient,
    plannerContextService: learningPlannerContextService,
    validationService: learningPlanValidationService
  });
  const learningPlanPublisherService = createLearningPlanPublisherService({
    repository: growthLearningStore.learningPlanDraftRepository,
    orchestratorService: learningPlanOrchestratorService,
    cardGenerationService: learningCardGenerationService,
    targetProvisioningService: learningTargetProvisioningService
  });
  const learningPlanAuditService = createLearningPlanAuditService({
    repository: growthLearningStore.learningPlanDraftRepository
  });
  const learningCycleAuditService = createLearningCycleAuditService({
    planAuditService: learningPlanAuditService,
    evidenceAuditService: learningEvidenceAuditService,
    profileDeltaAuditService: learningProfileDeltaAuditService,
    ownerCorrectionService: learningOwnerCorrectionService
  });
  const learningAuditCompletenessService = createLearningAuditCompletenessService({
    cycleAuditService: learningCycleAuditService
  });
  const learningCycleHistoryService = createLearningCycleHistoryService({
    planAuditService: learningPlanAuditService,
    evidenceAuditService: learningEvidenceAuditService,
    profileDeltaAuditService: learningProfileDeltaAuditService,
    ownerCorrectionService: learningOwnerCorrectionService,
    auditCompletenessService: learningAuditCompletenessService
  });
  const learningAutomationProposalService = createLearningAutomationProposalService({
    repository: growthLearningStore.learningAutomationProposalRepository,
    auditCompletenessService: learningAuditCompletenessService,
    planPublisherService: learningPlanPublisherService,
    targetProvisioningService: learningTargetProvisioningService
  });
  const learningAutomationSchedulerService = createLearningAutomationSchedulerService({
    automationProposalService: learningAutomationProposalService,
    auditCompletenessService: learningAuditCompletenessService,
    targetProvisioningService: learningTargetProvisioningService
  });
  const learningAutomationDigestService = createLearningAutomationDigestService({
    repository: growthLearningStore.learningAutomationDigestRepository,
    schedulerService: learningAutomationSchedulerService
  });
  const learningAutomationFailurePolicyService = createLearningAutomationFailurePolicyService({
    repository: growthLearningStore.learningAutomationFailurePolicyRepository
  });
  const learningAutomationActionHandoffService = createLearningAutomationActionHandoffService({
    repository: growthLearningStore.learningAutomationActionHandoffRepository,
    digestService: learningAutomationDigestService,
    failurePolicyService: learningAutomationFailurePolicyService,
    eventService: growthEventService
  });
  const learningAutomationPlatformActionEvidenceService = createLearningAutomationPlatformActionEvidenceService({
    outboxStore: growthEventOutboxStore
  });
  const learningAutomationCentralVisualEvidenceService = createLearningAutomationCentralVisualEvidenceService({
    readFile: fs.readFileSync
  });
  const learningAutomationReleaseEvidenceBundleAuditService = createLearningAutomationReleaseEvidenceBundleAuditService({
    readFile: fs.readFileSync
  });
  const learningAutomationSchedulerWorkerTargetService = createLearningAutomationSchedulerWorkerTargetService({
    repository: growthLearningStore.learningAutomationSchedulerWorkerTargetRepository,
    targetProvisioningService: learningTargetProvisioningService
  });
  const learningAutomationReleaseApprovalService = createLearningAutomationReleaseApprovalService({
    repository: growthLearningStore.learningAutomationReleaseApprovalRepository
  });
  const learningAutomationReleaseCollectionRunService = createLearningAutomationReleaseCollectionRunService({
    repository: growthLearningStore.learningAutomationReleaseCollectionRunRepository
  });
  const learningAutomationReleaseDecisionService = createLearningAutomationReleaseDecisionService({
    repository: growthLearningStore.learningAutomationReleaseDecisionRepository
  });
  const learningAutomationReleasePackageService = createLearningAutomationReleasePackageService({
    repository: growthLearningStore.learningAutomationReleasePackageRepository
  });
  const learningAutomationReleaseReadinessService = createLearningAutomationReleaseReadinessService({
    repository: growthLearningStore.learningAutomationReleaseReadinessRepository,
    releaseApprovalService: learningAutomationReleaseApprovalService,
    schedulerService: learningAutomationSchedulerService,
    digestService: learningAutomationDigestService,
    failurePolicyService: learningAutomationFailurePolicyService,
    actionHandoffService: learningAutomationActionHandoffService,
    schedulerWorkerTargetService: learningAutomationSchedulerWorkerTargetService,
    config: {
      automationWritefulExecutionEnabled: config.automationWritefulExecutionEnabled,
      automationBackgroundSchedulerEnabled: config.automationBackgroundSchedulerEnabled,
      automationBackgroundWorkerEnabled: config.automationBackgroundWorkerEnabled
    }
  });
  const learningAutomationReleaseReviewService = createLearningAutomationReleaseReviewService({
    readinessService: learningAutomationReleaseReadinessService,
    collectionRunService: learningAutomationReleaseCollectionRunService,
    decisionService: learningAutomationReleaseDecisionService,
    approvalService: learningAutomationReleaseApprovalService,
    packageService: learningAutomationReleasePackageService
  });
  const learningAutomationReleaseAuthorizationService = createLearningAutomationReleaseAuthorizationService({
    releaseReviewService: learningAutomationReleaseReviewService
  });
  const learningAutomationReleaseClosureService = createLearningAutomationReleaseClosureService({
    releaseReviewService: learningAutomationReleaseReviewService,
    releaseAuthorizationService: learningAutomationReleaseAuthorizationService
  });
  const learningAutomationReleaseActivationService = createLearningAutomationReleaseActivationService({
    repository: growthLearningStore.learningAutomationReleaseActivationRepository,
    releaseClosureService: learningAutomationReleaseClosureService,
    config: {
      automationWritefulExecutionEnabled: config.automationWritefulExecutionEnabled,
      automationBackgroundSchedulerEnabled: config.automationBackgroundSchedulerEnabled,
      automationBackgroundWorkerEnabled: config.automationBackgroundWorkerEnabled
    }
  });
  const learningAutomationRuntimeEnablementService = createLearningAutomationRuntimeEnablementService({
    repository: growthLearningStore.learningAutomationRuntimeEnablementRepository,
    releaseActivationService: learningAutomationReleaseActivationService,
    config: {
      automationWritefulExecutionEnabled: config.automationWritefulExecutionEnabled,
      automationBackgroundSchedulerEnabled: config.automationBackgroundSchedulerEnabled,
      automationBackgroundWorkerEnabled: config.automationBackgroundWorkerEnabled
    }
  });
  const learningAutomationReleaseControlsService = createLearningAutomationReleaseControlsService({
    releaseReadinessService: learningAutomationReleaseReadinessService,
    releaseReviewService: learningAutomationReleaseReviewService,
    releaseClosureService: learningAutomationReleaseClosureService,
    releaseActivationService: learningAutomationReleaseActivationService,
    runtimeEnablementService: learningAutomationRuntimeEnablementService
  });
  const learningAutomationSchedulerExecutionService = createLearningAutomationSchedulerExecutionService({
    repository: growthLearningStore.learningAutomationSchedulerExecutionRepository,
    actionHandoffService: learningAutomationActionHandoffService,
    digestService: learningAutomationDigestService,
    failurePolicyService: learningAutomationFailurePolicyService,
    schedulerService: learningAutomationSchedulerService,
    automationProposalService: learningAutomationProposalService,
    releaseAuthorizationService: learningAutomationReleaseAuthorizationService,
    releaseActivationService: learningAutomationReleaseActivationService,
    allowWritefulExecution: config.automationWritefulExecutionEnabled
  });
  const learningAutomationSchedulerRunService = createLearningAutomationSchedulerRunService({
    repository: growthLearningStore.learningAutomationSchedulerRunRepository,
    actionHandoffService: learningAutomationActionHandoffService,
    schedulerExecutionService: learningAutomationSchedulerExecutionService,
    allowBackgroundScheduler: config.automationBackgroundSchedulerEnabled
  });
  const learningAutomationSchedulerWorkerService = createLearningAutomationSchedulerWorkerService({
    repository: growthLearningStore.learningAutomationSchedulerWorkerLeaseRepository,
    schedulerRunService: learningAutomationSchedulerRunService,
    workerTargetService: learningAutomationSchedulerWorkerTargetService,
    allowBackgroundWorker: config.automationBackgroundWorkerEnabled,
    workerId: config.automationBackgroundWorkerId,
    leaseMs: config.automationBackgroundWorkerLeaseMs,
    defaultTargets: config.automationBackgroundWorkerTargets
  });
  const learningCardGenerationContextService = createLearningCardGenerationContextService({
    graphRepository: growthLearningStore.learningGraphRepository,
    historySummaryRepository: growthLearningStore.learningHistorySummaryRepository,
    nextTargetService: learningCardNextTargetService,
    profileProjectionService: learningProfileProjectionService,
    profileV2Service: learningProfileV2Service,
    evidenceLedgerService: learningEvidenceLedgerService,
    planAuditService: learningPlanAuditService,
    profileDeltaAuditService: learningProfileDeltaAuditService,
    ownerCorrectionService: learningOwnerCorrectionService,
    plannerContextService: learningPlannerContextService,
    targetProvisioningService: learningTargetProvisioningService,
    nextCardStrategyService: learningNextCardStrategyService,
    recipePolicyService: learningCardGenerationRecipePolicyService,
    gatewayConfigured: () => Boolean(config.gatewayAuthoringEndpoint),
    authoringGatewayConfigured: () => Boolean(config.gatewayAuthoringEndpoint),
    evaluationGatewayConfigured: () => Boolean(config.gatewayEvaluationEndpoint),
    plannerGatewayConfigured: () => Boolean(config.gatewayPlannerEndpoint)
  });
  const learningDailyLoopService = createLearningDailyLoopService({
    contextService: learningCardGenerationContextService,
    planPublisherService: learningPlanPublisherService,
    cycleAuditService: learningCycleAuditService,
    auditCompletenessService: learningAuditCompletenessService
  });
  const learningLoopStateService = createLearningLoopStateService({
    dailyLoopService: learningDailyLoopService,
    stageAssessmentService: learningStageAssessmentService
  });
  const learningProfileFeedbackEvidenceService = createLearningProfileFeedbackEvidenceService({
    auditCompletenessService: learningAuditCompletenessService,
    evidenceAuditService: learningEvidenceAuditService,
    profileDeltaAuditService: learningProfileDeltaAuditService,
    profileV2Service: learningProfileV2Service,
    recommendationService: learningCardRecommendationService,
    loopStateService: learningLoopStateService
  });
  const growthEvaluationService = createGrowthEvaluationService({
    learningStore: growthLearningStore,
    evidenceLedgerService: learningEvidenceLedgerService,
    profileService: learningMasteryProfileService,
    profileDeltaService: learningProfileDeltaService,
    nextCardStrategyService: learningNextCardStrategyService,
    stageAssessmentService: learningStageAssessmentService,
    trajectoryService: learningCardTrajectoryService,
    eventService: growthEventService,
    evaluator: config.gatewayEvaluationEndpoint
      ? learningCardEvaluationService.evaluateSubmission
      : undefined
  });
  const learningLearnerCycleService = createLearningLearnerCycleService({
    growthService,
    evaluationService: growthEvaluationService,
    cycleAuditService: learningCycleAuditService,
    auditCompletenessService: learningAuditCompletenessService
  });
  return {
    config,
    growthEvaluationService,
    growthEventService,
    growthGatewayEvaluationClient,
    growthGatewayPlannerClient,
    growthMcpExecutor: createGrowthMcpExecutor({ growthService }),
    growthService,
    learningCardAuthoringService,
    learningCardEvaluationService,
    learningCardGenerationContextService,
    learningCardGenerationRecipePolicyService,
    learningCardGenerationService,
    learningCardGraphBindingService,
    learningCardNextTargetService,
    learningCardRecommendationService,
    learningCardTrajectoryService,
    learningAuditCompletenessService,
    learningAutomationActionHandoffService,
    learningAutomationCentralVisualEvidenceService,
    learningAutomationDigestService,
    learningAutomationFailurePolicyService,
    learningAutomationPlatformActionEvidenceService,
    learningAutomationProposalService,
    learningAutomationReleaseApprovalService,
    learningAutomationReleaseActivationService,
    learningAutomationReleaseAuthorizationService,
    learningAutomationReleaseClosureService,
    learningAutomationReleaseCollectionRunService,
    learningAutomationReleaseControlsService,
    learningAutomationReleaseDecisionService,
    learningAutomationReleaseEvidenceBundleAuditService,
    learningAutomationReleasePackageService,
    learningAutomationReleaseReadinessService,
    learningAutomationReleaseReviewService,
    learningAutomationRuntimeEnablementService,
    learningAutomationSchedulerExecutionService,
    learningAutomationSchedulerRunService,
    learningAutomationSchedulerService,
    learningAutomationSchedulerWorkerService,
    learningAutomationSchedulerWorkerTargetService,
    learningCycleAuditService,
    learningCycleHistoryService,
    learningDailyLoopService,
    learningEvidenceAuditService,
    learningEvidenceLedgerService,
    learningEvaluationOwnerReviewService,
    learningExperienceSignalService,
    learningGraphPlanService,
    learningLearnerCycleService,
    learningLoopStateService,
    learningMasteryProfileService,
    learningNextCardStrategyService,
    learningOwnerCorrectionService,
    learningPlanAuditService,
    learningPlanOrchestratorService,
    learningPlanPublisherService,
    learningPlanValidationService,
    learningPlannerContextService,
    learningProfileDeltaAuditService,
    learningProfileDeltaService,
    learningProfileFeedbackEvidenceService,
    learningProfileProjectionService,
    learningProfileV2Service,
    learningStageAssessmentService,
    learningTargetProvisioningService,
    pluginService: createHermesPluginService({ config, workspaceStore })
  };
}

module.exports = { createServices };
