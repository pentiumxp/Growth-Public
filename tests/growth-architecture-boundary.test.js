const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { checkGrowthSyntaxCoverage } = require("../scripts/check-growth-syntax-coverage");

const repoRoot = path.join(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("Growth check gate covers every runtime JavaScript file", () => {
  const result = checkGrowthSyntaxCoverage();
  assert.equal(result.error, undefined);
  assert.equal(result.missing.length, 0, `missing runtime JS check coverage: ${result.missing.join(", ")}`);
  assert.equal(result.stale.length, 0, `stale runtime JS check entries: ${result.stale.join(", ")}`);
  assert.equal(result.duplicate.length, 0, `duplicate runtime JS check entries: ${result.duplicate.join(", ")}`);
  assert.ok(result.runtimeCount > 0);
  assert.equal(result.ok, true);
});

test("Growth routes stay HTTP glue and do not import stores directly", () => {
  for (const fileName of ["growth-routes.js", "plugin-routes.js", "static-routes.js"]) {
    const source = read(path.join("src", "routes", fileName));
    assert.doesNotMatch(source, /require\(["']\.\.\/stores\//, `${fileName} must dispatch through services`);
    assert.doesNotMatch(source, /require\(["']\.\.\/stores\/growth-learning-sqlite-store/, `${fileName} must not import SQLite store`);
  }
});

test("Growth service orchestration delegates providers and does not own facade URL construction", () => {
  const service = read(path.join("src", "services", "growth-service.js"));
  assert.match(service, /createGrowthReadOrchestrator/);
  assert.match(service, /createGrowthWriteOrchestrator/);
  assert.match(service, /createHomeAiFacadeGrowthProvider/);
  assert.doesNotMatch(service, /new URL\(/);
  assert.doesNotMatch(service, /X-Hermes-Web-Key/);
  assert.doesNotMatch(service, /\/api\/growth\/v1\/board/);
  assert.doesNotMatch(service, /growth_plugin_write_not_available/);
  assert.match(read(path.join("src", "services", "home-ai-growth-facade-client.js")), /new URL\(/);
});

test("Growth Gateway evaluation boundary stays service-owned", () => {
  const services = read(path.join("src", "app", "services.js"));
  assert.match(services, /createGrowthGatewayEvaluationClient/);
  assert.match(services, /createLearningCardEvaluationService/);
  assert.match(services, /gatewayEvaluationEndpoint/);
  assert.match(services, /learningCardEvaluationService\.evaluateSubmission/);

  const routes = read(path.join("src", "routes", "growth-routes.js"));
  assert.doesNotMatch(routes, /createGrowthGatewayEvaluationClient/);
  assert.doesNotMatch(routes, /GROWTH_GATEWAY_EVALUATION/);
  assert.doesNotMatch(routes, /evaluateCardSubmission/);
});

test("Growth evaluation owner review retry stays service-owned", () => {
  const services = read(path.join("src", "app", "services.js"));
  assert.match(services, /createLearningEvaluationOwnerReviewService/);
  assert.match(services, /learningEvaluationOwnerReviewService/);

  const ownerReviewService = read(path.join("src", "services", "learning-evaluation-owner-review-service.js"));
  assert.match(ownerReviewService, /ownerReviewEvaluationJob/);
  assert.doesNotMatch(ownerReviewService, /learning_growth_evaluation_jobs/);

  const routes = read(path.join("src", "routes", "growth-routes.js"));
  assert.match(routes, /evaluations\/owner-review/);
  assert.match(routes, /retryFailedEvaluation/);
  assert.doesNotMatch(routes, /ownerReviewEvaluationJob/);
  assert.doesNotMatch(routes, /learning_growth_evaluation_jobs/);
});

test("Growth read and write provider boundaries stay separated", () => {
  const readProvider = read(path.join("src", "services", "growth-providers", "sqlite-provider.js"));
  const writeProvider = read(path.join("src", "services", "growth-providers", "sqlite-write-provider.js"));
  assert.doesNotMatch(readProvider, /submitEvidence/);
  assert.doesNotMatch(readProvider, /submitReflection/);
  assert.doesNotMatch(readProvider, /clearLearningCoinBalanceForMonthlyExchange/);
  assert.match(writeProvider, /submitEvidence/);
  assert.match(writeProvider, /submitReflection/);
  assert.match(writeProvider, /clearLearningCoinBalanceForMonthlyExchange/);
});

test("Growth SQLite store facade stays a composition boundary", () => {
  const store = read(path.join("src", "stores", "growth-learning-sqlite-store.js"));
  assert.doesNotMatch(store, /require\(["']node:fs["']\)/);
  assert.match(store, /createAudioRepository/);
  assert.match(store, /createEvaluationJobRepository/);
  assert.match(store, /createEvidenceWriter/);
  assert.match(store, /createLearningAutomationActionHandoffRepository/);
  assert.match(store, /createLearningAutomationDigestRepository/);
  assert.match(store, /createLearningAutomationFailurePolicyRepository/);
  assert.match(store, /createLearningAutomationProposalRepository/);
  assert.match(store, /createLearningAutomationSchedulerRunRepository/);
  assert.match(store, /createLearningAutomationSchedulerWorkerLeaseRepository/);
  assert.match(store, /createLearningAutomationSchedulerWorkerTargetRepository/);
  assert.match(store, /createLearningAutomationReleaseCollectionRunRepository/);
  assert.match(store, /createLearningAutomationReleaseDecisionRepository/);
  assert.match(store, /createLearningAutomationReleaseReadinessRepository/);
  assert.match(store, /createLearningAutomationReleaseWorkbenchActionAuditRepository/);
  assert.match(store, /createLearningEvidenceLedgerRepository/);
  assert.match(store, /createProfileDeltaAuditRepository/);
  assert.match(store, /createMasteryProfileRepository/);
  assert.match(store, /createStageAssessmentCycleRepository/);
  assert.match(store, /createRewardRepository/);
});

test("Growth learning profile projection stays service-owned", () => {
  const services = read(path.join("src", "app", "services.js"));
  assert.match(services, /createLearningProfileProjectionService/);
  assert.match(services, /learningProfileProjectionService/);
  assert.match(services, /profileProjectionService: learningProfileProjectionService/);
  assert.match(services, /createLearningCardRecommendationService/);
  assert.match(services, /learningCardRecommendationService/);
  assert.match(services, /repository: growthLearningStore\.masteryProfileRepository/);
  assert.match(services, /recommendationService: learningCardRecommendationService/);
  assert.match(services, /createLearningCardGenerationRecipePolicyService/);
  assert.match(services, /learningCardGenerationRecipePolicyService/);
  assert.match(services, /recipePolicyService: learningCardGenerationRecipePolicyService/);
  assert.match(services, /createLearningCardNextTargetService/);
  assert.match(services, /learningCardNextTargetService/);
  assert.match(services, /nextTargetService: learningCardNextTargetService/);

  const routes = read(path.join("src", "routes", "growth-routes.js"));
  assert.match(routes, /recommendations\/lifecycle\/review/);
  assert.match(routes, /reviewRecommendation/);
  assert.doesNotMatch(routes, /projectForNextCard/);
  assert.doesNotMatch(routes, /markRecommendationAccepted/);
  assert.doesNotMatch(routes, /markTrajectoryRecommendationAccepted/);
  assert.doesNotMatch(routes, /learning_growth_mastery_states/);
  assert.doesNotMatch(routes, /learning_growth_card_trajectories/);
  assert.doesNotMatch(routes, /recommendNextCard/);
  assert.doesNotMatch(routes, /selectNextTarget/);
  assert.doesNotMatch(routes, /daily_english_v1/);

  const ui = read(path.join("public", "growth-card-generation-ui.js"));
  assert.match(ui, /data-card-generation-profile/);
  assert.match(ui, /data-card-generation-lifecycle/);
  assert.match(ui, /data-recommendation-lifecycle-review/);
  assert.match(ui, /createRecommendationLifecycleDecisionPayload/);
  assert.match(ui, /data-release-workbench-panel/);
  assert.match(ui, /createReleaseWorkbenchActionPayload/);
  assert.match(ui, /release_evidence_collection/);
  assert.match(ui, /data-automation-proposal-panel/);
  assert.match(ui, /createAutomationProposalDecisionPayload/);
  assert.match(ui, /createAutomationProposalPublishPayload/);
  assert.match(ui, /recommendationLifecycle/);
  assert.match(ui, /recipe_id/);
  assert.doesNotMatch(ui, /target_node_id: clean\(plan\.targetNodeId\)/);
  assert.doesNotMatch(ui, /completion_policy: \{/);
  assert.doesNotMatch(ui, /rawAnswer/);
  assert.doesNotMatch(ui, /rawPrompt/);
  assert.doesNotMatch(ui, /sourceRef/);

  const apiClient = read(path.join("public", "growth-api-client.js"));
  assert.match(apiClient, /reviewGrowthRecommendationLifecycle/);
  assert.match(apiClient, /growthApiPath\("recommendations", "lifecycle", "review"\)/);
});

test("Growth learning operating loop foundation stays service-owned", () => {
  const services = read(path.join("src", "app", "services.js"));
  assert.match(services, /createLearningEvidenceLedgerService/);
  assert.match(services, /learningEvidenceLedgerService/);
  assert.match(services, /createLearningEvidenceAuditService/);
  assert.match(services, /learningEvidenceAuditService/);
  assert.match(services, /createLearningProfileV2Service/);
  assert.match(services, /learningProfileV2Service/);
  assert.match(services, /createLearningProfileDeltaService/);
  assert.match(services, /learningProfileDeltaService/);
  assert.match(services, /repository: growthLearningStore\.profileDeltaAuditRepository/);
  assert.match(services, /createLearningProfileDeltaAuditService/);
  assert.match(services, /learningProfileDeltaAuditService/);
  assert.match(services, /createLearningProfileFeedbackEvidenceService/);
  assert.match(services, /learningProfileFeedbackEvidenceService/);
  assert.match(services, /createLearningRewardAuditService/);
  assert.match(services, /learningRewardAuditService/);
  assert.match(services, /createLearningPlannerContextService/);
  assert.match(services, /learningPlannerContextService/);
  assert.match(services, /createGrowthGatewayPlannerClient/);
  assert.match(services, /growthGatewayPlannerClient/);
  assert.match(services, /createLearningPlanValidationService/);
  assert.match(services, /learningPlanValidationService/);
  assert.match(services, /createLearningPlanOrchestratorService/);
  assert.match(services, /learningPlanOrchestratorService/);
  assert.match(services, /createLearningPlanPublisherService/);
  assert.match(services, /learningPlanPublisherService/);
  assert.match(services, /createLearningPlanAuditService/);
  assert.match(services, /learningPlanAuditService/);
  assert.match(services, /createLearningCycleAuditService/);
  assert.match(services, /learningCycleAuditService/);
  assert.match(services, /createLearningCycleHistoryService/);
  assert.match(services, /learningCycleHistoryService/);
  assert.match(services, /createLearningAuditCompletenessService/);
  assert.match(services, /learningAuditCompletenessService/);
  assert.match(services, /createLearningDailyLoopService/);
  assert.match(services, /learningDailyLoopService/);
  assert.match(services, /createLearningLoopStateService/);
  assert.match(services, /learningLoopStateService/);
  assert.match(services, /createLearningLearnerCycleService/);
  assert.match(services, /learningLearnerCycleService/);
  assert.match(services, /createLearningAutomationActionHandoffService/);
  assert.match(services, /learningAutomationActionHandoffService/);
  assert.match(services, /createLearningAutomationDigestService/);
  assert.match(services, /learningAutomationDigestService/);
  assert.match(services, /createLearningAutomationFailurePolicyService/);
  assert.match(services, /learningAutomationFailurePolicyService/);
  assert.match(services, /createLearningAutomationOwnerReviewEvidenceService/);
  assert.match(services, /learningAutomationOwnerReviewEvidenceService/);
  assert.match(services, /createLearningAutomationProposalService/);
  assert.match(services, /learningAutomationProposalService/);
  assert.match(services, /createLearningAutomationSchedulerExecutionService/);
  assert.match(services, /learningAutomationSchedulerExecutionService/);
  assert.match(services, /createLearningAutomationSchedulerRunService/);
  assert.match(services, /learningAutomationSchedulerRunService/);
  assert.match(services, /createLearningAutomationSchedulerWorkerService/);
  assert.match(services, /learningAutomationSchedulerWorkerService/);
  assert.match(services, /createLearningAutomationSchedulerWorkerTargetService/);
  assert.match(services, /learningAutomationSchedulerWorkerTargetService/);
  assert.match(services, /createLearningAutomationReleaseReadinessService/);
  assert.match(services, /learningAutomationReleaseReadinessService/);
  assert.match(services, /createLearningAutomationReleaseEvidenceService/);
  assert.match(services, /learningAutomationReleaseEvidenceService/);
  assert.match(services, /uiEvidenceService: learningAutomationUiEvidenceService/);
  assert.match(services, /createLearningAutomationReleaseEvidenceCollectionService/);
  assert.match(services, /learningAutomationReleaseEvidenceCollectionService/);
  assert.match(services, /releaseEvidenceCollectionService: learningAutomationReleaseEvidenceCollectionService/);
  assert.match(services, /createLearningAutomationReleaseEvidenceArtifactManifestService/);
  assert.match(services, /learningAutomationReleaseEvidenceArtifactManifestService/);
  assert.match(services, /createLearningAutomationReleaseEvidenceArtifactTemplateService/);
  assert.match(services, /learningAutomationReleaseEvidenceArtifactTemplateService/);
  assert.match(services, /releaseWorkbenchService: learningAutomationReleaseWorkbenchService/);
  assert.match(services, /releasePreflightService: learningAutomationReleasePreflightService/);
  assert.match(services, /preflightReportRepository: growthLearningStore\.learningAutomationReleasePreflightReportRepository/);
  assert.match(services, /createLearningAutomationReleaseCollectionRunService/);
  assert.match(services, /learningAutomationReleaseCollectionRunService/);
  assert.match(services, /createLearningAutomationReleaseDecisionService/);
  assert.match(services, /learningAutomationReleaseDecisionService/);
  assert.match(services, /createLearningAutomationReleasePackageService/);
  assert.match(services, /learningAutomationReleasePackageService/);
  assert.match(services, /createLearningAutomationReleaseEvidenceBundleAuditService/);
  assert.match(services, /learningAutomationReleaseEvidenceBundleAuditService/);
  assert.match(services, /createLearningAutomationReleaseReviewService/);
  assert.match(services, /learningAutomationReleaseReviewService/);
  assert.match(services, /createLearningAutomationReleaseAuthorizationService/);
  assert.match(services, /learningAutomationReleaseAuthorizationService/);
  assert.match(services, /createLearningAutomationReleaseClosureService/);
  assert.match(services, /learningAutomationReleaseClosureService/);
  assert.match(services, /createLearningAutomationReleaseActivationService/);
  assert.match(services, /learningAutomationReleaseActivationService/);
  assert.match(services, /createLearningAutomationSchedulerService/);
  assert.match(services, /learningAutomationSchedulerService/);
  assert.match(services, /createLearningTargetProvisioningService/);
  assert.match(services, /learningTargetProvisioningService/);
  assert.match(services, /createLearningOwnerCorrectionService/);
  assert.match(services, /learningOwnerCorrectionService/);
  assert.match(services, /profileV2Service: learningProfileV2Service/);
  assert.match(services, /evidenceLedgerService: learningEvidenceLedgerService/);
  assert.match(services, /profileDeltaAuditService: learningProfileDeltaAuditService/);
  assert.match(services, /recommendationService: learningCardRecommendationService/);
  assert.match(services, /loopStateService: learningLoopStateService/);
  assert.match(services, /planAuditService: learningPlanAuditService/);
  assert.match(services, /evidenceAuditService: learningEvidenceAuditService/);
  assert.match(services, /ownerCorrectionService: learningOwnerCorrectionService/);
  assert.match(services, /cycleAuditService: learningCycleAuditService/);
  assert.match(services, /auditCompletenessService: learningAuditCompletenessService/);
  assert.match(services, /const learningCycleHistoryService = createLearningCycleHistoryService/);
  assert.match(services, /learningCycleHistoryService,\n    learningDailyLoopService/);
  assert.match(services, /contextService: learningCardGenerationContextService/);
  assert.match(services, /planPublisherService: learningPlanPublisherService/);
  assert.match(services, /planPublisherService: learningPlanPublisherService/);
  assert.match(services, /dailyLoopService: learningDailyLoopService/);
  assert.match(services, /rewardAuditService: learningRewardAuditService/);
  assert.match(services, /stageAssessmentService: learningStageAssessmentService/);
  assert.match(services, /evaluationService: growthEvaluationService/);
  assert.match(services, /cycleAuditService: learningCycleAuditService/);
  assert.match(services, /repository: growthLearningStore\.learningAutomationProposalRepository/);
  assert.match(services, /repository: growthLearningStore\.learningAutomationActionHandoffRepository/);
  assert.match(services, /repository: growthLearningStore\.learningAutomationDigestRepository/);
  assert.match(services, /repository: growthLearningStore\.learningAutomationFailurePolicyRepository/);
  assert.match(services, /repository: growthLearningStore\.learningAutomationSchedulerExecutionRepository/);
  assert.match(services, /repository: growthLearningStore\.learningAutomationSchedulerRunRepository/);
  assert.match(services, /repository: growthLearningStore\.learningAutomationSchedulerWorkerLeaseRepository/);
  assert.match(services, /repository: growthLearningStore\.learningAutomationSchedulerWorkerTargetRepository/);
  assert.match(services, /repository: growthLearningStore\.learningAutomationReleaseReadinessRepository/);
  assert.match(services, /repository: growthLearningStore\.learningAutomationReleaseCollectionRunRepository/);
  assert.match(services, /repository: growthLearningStore\.learningAutomationReleaseDecisionRepository/);
  assert.match(services, /repository: growthLearningStore\.learningAutomationReleasePackageRepository/);
  assert.match(services, /actionAuditRepository: growthLearningStore\.learningAutomationReleaseWorkbenchActionAuditRepository/);
  assert.match(services, /readinessService: learningAutomationReleaseReadinessService/);
  assert.match(services, /collectionRunService: learningAutomationReleaseCollectionRunService/);
  assert.match(services, /decisionService: learningAutomationReleaseDecisionService/);
  assert.match(services, /approvalService: learningAutomationReleaseApprovalService/);
  assert.match(services, /packageService: learningAutomationReleasePackageService/);
  assert.match(services, /releaseReviewService: learningAutomationReleaseReviewService/);
  assert.match(services, /releaseClosureService: learningAutomationReleaseClosureService/);
  assert.match(services, /actionHandoffService: learningAutomationActionHandoffService/);
  assert.match(services, /schedulerExecutionService: learningAutomationSchedulerExecutionService/);
  assert.match(services, /schedulerRunService: learningAutomationSchedulerRunService/);
  assert.match(services, /workerTargetService: learningAutomationSchedulerWorkerTargetService/);
  assert.match(services, /schedulerService: learningAutomationSchedulerService/);
  assert.match(services, /digestService: learningAutomationDigestService/);
  assert.match(services, /failurePolicyService: learningAutomationFailurePolicyService/);
  assert.match(services, /schedulerWorkerTargetService: learningAutomationSchedulerWorkerTargetService/);
  assert.match(services, /releaseReadinessService: learningAutomationReleaseReadinessService/);
  assert.match(services, /eventService: growthEventService/);
  assert.match(services, /automationProposalService: learningAutomationProposalService/);
  assert.match(services, /releaseAuthorizationService: learningAutomationReleaseAuthorizationService/);
  assert.match(services, /releaseActivationService: learningAutomationReleaseActivationService/);
  assert.match(services, /allowWritefulExecution: config\.automationWritefulExecutionEnabled/);
  assert.match(services, /allowBackgroundScheduler: config\.automationBackgroundSchedulerEnabled/);
  assert.match(services, /allowBackgroundWorker: config\.automationBackgroundWorkerEnabled/);
  assert.match(services, /defaultTargets: config\.automationBackgroundWorkerTargets/);
  assert.match(services, /ownerCorrectionService: learningOwnerCorrectionService/);
  assert.match(services, /targetProvisioningService: learningTargetProvisioningService/);
  assert.match(services, /plannerContextService: learningPlannerContextService/);
  assert.match(services, /stageAssessmentService: learningStageAssessmentService/);
  assert.match(services, /targetProvisioningService: learningTargetProvisioningService/);
  assert.match(services, /profileDeltaService: learningProfileDeltaService/);
  assert.match(services, /plannerGatewayConfigured: \(\) => Boolean\(config\.gatewayPlannerEndpoint\)/);

  const routes = read(path.join("src", "routes", "growth-routes.js"));
  assert.match(routes, /learning-plans\/draft/);
  assert.match(routes, /learning-plans\/audit/);
  assert.match(routes, /learning-cycles\/audit/);
  assert.match(routes, /learning-cycles\/completeness/);
  assert.match(routes, /daily-loop\/preview/);
  assert.match(routes, /learning-loop\/state/);
  assert.match(routes, /daily-loop\/draft/);
  assert.match(routes, /daily-loop\/publish/);
  assert.match(routes, /learningDailyLoopService\.preview/);
  assert.match(routes, /learningLoopStateService\.state/);
  assert.match(routes, /learningDailyLoopService\.draft/);
  assert.match(routes, /learningDailyLoopService\.publish/);
  assert.match(routes, /normalizeDailyLoopQueryInput/);
  assert.match(routes, /normalizeDailyLoopBodyInput/);
  assert.match(routes, /automation\/proposals/);
  assert.match(routes, /automationProposalDecisionMatch/);
  assert.match(routes, /automationProposalPublishMatch/);
  assert.match(routes, /normalizeAutomationProposalDecisionInput/);
  assert.match(routes, /normalizeAutomationProposalPublishInput/);
  assert.match(routes, /automation\/scheduler\/dry-run/);
  assert.match(routes, /normalizeAutomationSchedulerDryRunInput/);
  assert.match(routes, /automation\/scheduler\/executions/);
  assert.match(routes, /automation\/scheduler\/execute-once/);
  assert.match(routes, /normalizeAutomationSchedulerExecutionListInput/);
  assert.match(routes, /normalizeAutomationSchedulerExecutionInput/);
  assert.match(routes, /automation\/scheduler\/runs/);
  assert.match(routes, /automation\/scheduler\/run-once/);
  assert.match(routes, /normalizeAutomationSchedulerRunListInput/);
  assert.match(routes, /normalizeAutomationSchedulerRunInput/);
  assert.match(routes, /automation\/scheduler\/worker-targets/);
  assert.match(routes, /automationSchedulerWorkerTargetReviewMatch/);
  assert.match(routes, /normalizeAutomationSchedulerWorkerTargetListInput/);
  assert.match(routes, /normalizeAutomationSchedulerWorkerTargetInput/);
  assert.match(routes, /normalizeAutomationSchedulerWorkerTargetReviewInput/);
  assert.match(routes, /automation\/release-readiness/);
  assert.match(routes, /release-readiness\/snapshots/);
  assert.match(routes, /normalizeAutomationReleaseReadinessQueryInput/);
  assert.match(routes, /normalizeAutomationReleaseReadinessListInput/);
  assert.match(routes, /normalizeAutomationReleaseReadinessSnapshotInput/);
  assert.match(routes, /automation\/release-controls/);
  assert.match(routes, /normalizeAutomationReleaseControlsInput/);
  assert.match(routes, /learningAutomationReleaseControlsService\.summarize/);
  assert.match(routes, /automation\/release-dashboard/);
  assert.match(routes, /normalizeAutomationReleaseDashboardInput/);
  assert.match(routes, /learningAutomationReleaseDashboardService\.dashboard/);
  assert.match(routes, /automation\/release-workbench/);
  assert.match(routes, /normalizeAutomationReleaseWorkbenchInput/);
  assert.match(routes, /learningAutomationReleaseWorkbenchService\.workbench/);
  assert.match(routes, /automation\/release-preflight/);
  assert.match(routes, /automation\/release-preflight-reports/);
  assert.match(routes, /normalizeAutomationReleasePreflightInput/);
  assert.match(routes, /normalizeAutomationReleasePreflightRecordInput/);
  assert.match(routes, /learningAutomationReleasePreflightService\.evaluate/);
  assert.match(routes, /learningAutomationReleasePreflightService\.listReports/);
  assert.match(routes, /learningAutomationReleasePreflightService\.recordReport/);
  assert.match(routes, /automation\/release-artifact-template/);
  assert.match(routes, /normalizeAutomationReleaseArtifactTemplateInput/);
  assert.match(routes, /learningAutomationReleaseEvidenceArtifactTemplateService\.template/);
  assert.match(routes, /automation\/owner-review-evidence/);
  assert.match(routes, /normalizeAutomationOwnerReviewEvidenceInput/);
  assert.match(routes, /learningAutomationOwnerReviewEvidenceService\.evaluate/);
  assert.match(routes, /automation\/platform-action-evidence/);
  assert.match(routes, /normalizeAutomationPlatformActionEvidenceInput/);
  assert.match(routes, /learningAutomationPlatformActionEvidenceService\.evaluate/);
  assert.match(routes, /automation\/central-visual-evidence/);
  assert.match(routes, /normalizeAutomationCentralVisualEvidenceInput/);
  assert.match(routes, /learningAutomationCentralVisualEvidenceService\.evaluate/);
  assert.match(routes, /automation\/production-deployment-evidence/);
  assert.match(routes, /normalizeAutomationProductionDeploymentEvidenceInput/);
  assert.match(routes, /learningAutomationProductionDeploymentEvidenceService\.evaluate/);
  assert.match(routes, /automation\/ui-evidence/);
  assert.match(routes, /normalizeAutomationUiEvidenceInput/);
  assert.match(routes, /learningAutomationUiEvidenceService\.evaluate/);
  assert.match(routes, /automation\/release-workbench\/actions/);
  assert.match(routes, /normalizeAutomationReleaseWorkbenchActionInput/);
  assert.match(routes, /applyReleaseEvidenceArtifactManifestInput/);
  assert.match(routes, /learningAutomationReleaseWorkbenchActionService\.recordAction/);
  assert.match(routes, /automation\/release-inventory/);
  assert.match(routes, /normalizeAutomationReleaseInventoryInput/);
  assert.match(routes, /learningAutomationReleaseInventoryService\.inventory/);
  assert.match(routes, /automation\/release-collection-runs/);
  assert.match(routes, /normalizeAutomationReleaseCollectionRunListInput/);
  assert.match(routes, /normalizeAutomationReleaseCollectionRunInput/);
  assert.match(routes, /learningAutomationReleaseCollectionRunService\.listRuns/);
  assert.match(routes, /learningAutomationReleaseCollectionRunService\.recordRun/);
  assert.match(routes, /automation\/release-decisions/);
  assert.match(routes, /normalizeAutomationReleaseDecisionListInput/);
  assert.match(routes, /normalizeAutomationReleaseDecisionInput/);
  assert.match(routes, /learningAutomationReleaseDecisionService\.listDecisions/);
  assert.match(routes, /learningAutomationReleaseDecisionService\.recordDecision/);
  assert.match(routes, /automation\/release-packages/);
  assert.match(routes, /automation\/release-packages\/build/);
  assert.match(routes, /normalizeAutomationReleasePackageListInput/);
  assert.match(routes, /normalizeAutomationReleasePackageInput/);
  assert.match(routes, /normalizeAutomationReleasePackageBuildInput/);
  assert.match(routes, /learningAutomationReleasePackageService\.listPackages/);
  assert.match(routes, /learningAutomationReleasePackageService\.recordPackage/);
  assert.match(routes, /learningAutomationReleasePackageBuildService/);
  assert.match(routes, /packageBuildService\.buildPackage/);
  assert.match(routes, /automation\/release-review/);
  assert.match(routes, /normalizeAutomationReleaseReviewInput/);
  assert.match(routes, /learningAutomationReleaseReviewService\.review/);
  assert.match(routes, /automation\/release-authorization/);
  assert.match(routes, /normalizeAutomationReleaseAuthorizationInput/);
  assert.match(routes, /learningAutomationReleaseAuthorizationService\.authorize/);
  assert.match(routes, /automation\/release-closure/);
  assert.match(routes, /normalizeAutomationReleaseClosureInput/);
  assert.match(routes, /learningAutomationReleaseClosureService\.summarize/);
  assert.match(routes, /automation\/release-activation/);
  assert.match(routes, /normalizeAutomationReleaseActivationInput/);
  assert.match(routes, /learningAutomationReleaseActivationService\.preflight/);
  assert.match(routes, /automation\/runtime-enablement/);
  assert.match(routes, /automation\/runtime-enablements/);
  assert.match(routes, /normalizeAutomationRuntimeEnablementInput/);
  assert.match(routes, /normalizeAutomationRuntimeEnablementRecordInput/);
  assert.match(routes, /learningAutomationRuntimeEnablementService\.evaluate/);
  assert.match(routes, /learningAutomationRuntimeEnablementService\.listEnablements/);
  assert.match(routes, /learningAutomationRuntimeEnablementService\.recordEnablement/);
  assert.match(routes, /automation\/release-approvals/);
  assert.match(routes, /normalizeAutomationReleaseApprovalListInput/);
  assert.match(routes, /normalizeAutomationReleaseApprovalInput/);
  assert.match(routes, /learningAutomationReleaseApprovalService\.listApprovals/);
  assert.match(routes, /learningAutomationReleaseApprovalService\.recordApproval/);
  assert.match(routes, /automation\/release-evidence/);
  assert.match(routes, /normalizeAutomationReleaseEvidenceListInput/);
  assert.match(routes, /normalizeAutomationReleaseEvidenceInput/);
  assert.match(routes, /learningAutomationReleaseEvidenceService\.listEvidence/);
  assert.match(routes, /learningAutomationReleaseEvidenceService\.recordEvidence/);
  assert.match(routes, /automation\/digests/);
  assert.match(routes, /automationDigestReviewMatch/);
  assert.match(routes, /normalizeAutomationDigestInput/);
  assert.match(routes, /normalizeAutomationDigestReviewInput/);
  assert.match(routes, /automation\/action-handoffs/);
  assert.match(routes, /automationActionHandoffDeliverMatch/);
  assert.match(routes, /normalizeAutomationActionHandoffInput/);
  assert.match(routes, /normalizeAutomationActionHandoffDeliverInput/);
  assert.match(routes, /learningAutomationActionHandoffService\.listHandoffs/);
  assert.match(routes, /learningAutomationActionHandoffService\.createHandoff/);
  assert.match(routes, /learningAutomationActionHandoffService\.deliverHandoff/);
  assert.match(routes, /learningAutomationOwnerReviewEvidenceService\.evaluate/);
  assert.match(routes, /automation\/failure-policies/);
  assert.match(routes, /automationFailurePolicyReviewMatch/);
  assert.match(routes, /normalizeAutomationFailurePolicyInput/);
  assert.match(routes, /normalizeAutomationFailurePolicyReviewInput/);
  assert.match(routes, /learningAutomationFailurePolicyService\.createPolicy/);
  assert.match(routes, /learningAutomationFailurePolicyService\.listPolicies/);
  assert.match(routes, /learningAutomationFailurePolicyService\.reviewPolicy/);
  assert.match(routes, /learningAutomationFailurePolicyService\.evaluateReadiness/);
  assert.match(routes, /evidence\/audit/);
  assert.match(routes, /publishPlanItem/);
  assert.match(routes, /learningEvidenceAuditService\.listEvidenceAudit/);
  assert.match(routes, /learningPlanAuditService\.listPlanDrafts/);
  assert.match(routes, /learningCycleAuditService\.listCycleAudit/);
  assert.match(routes, /learningCycleHistoryService\.listCycleHistory/);
  assert.match(routes, /learningAuditCompletenessService\.evaluateCycleCompleteness/);
  assert.match(routes, /learningAutomationProposalService\.createProposal/);
  assert.match(routes, /learningAutomationProposalService\.listProposals/);
  assert.match(routes, /learningAutomationProposalService\.reviewProposal/);
  assert.match(routes, /learningAutomationProposalService\.publishAcceptedProposal/);
  assert.match(routes, /learningAutomationSchedulerService\.dryRun/);
  assert.match(routes, /learningAutomationSchedulerExecutionService\.listExecutions/);
  assert.match(routes, /learningAutomationSchedulerExecutionService\.executeOnce/);
  assert.match(routes, /learningAutomationSchedulerRunService\.listRuns/);
  assert.match(routes, /learningAutomationSchedulerRunService\.runOnce/);
  assert.match(routes, /learningAutomationReleaseReadinessService\.evaluateReadiness/);
  assert.match(routes, /learningAutomationReleaseReadinessService\.listSnapshots/);
  assert.match(routes, /learningAutomationReleaseReadinessService\.createSnapshot/);
  assert.match(routes, /learningAutomationDigestService\.listDigests/);
  assert.match(routes, /learningAutomationDigestService\.createDigest/);
  assert.match(routes, /learningAutomationDigestService\.reviewDigest/);
  assert.match(routes, /domain-pack-provisions/);
  assert.match(routes, /profile-delta-audits/);
  assert.match(routes, /profile-corrections/);
  assert.match(routes, /learningOwnerCorrectionService\.recordCorrection/);
  assert.match(routes, /learningOwnerCorrectionService\.listCorrections/);
  assert.doesNotMatch(routes, /learning_growth_evidence_ledger/);
  assert.doesNotMatch(routes, /learning_growth_profile_delta_audits/);
  assert.doesNotMatch(routes, /learning_growth_plan_drafts/);
  assert.doesNotMatch(routes, /learning_growth_automation_proposals/);
  assert.doesNotMatch(routes, /learning_growth_automation_digests/);
  assert.doesNotMatch(routes, /learning_growth_automation_action_handoffs/);
  assert.doesNotMatch(routes, /learning_growth_automation_failure_policies/);
  assert.doesNotMatch(routes, /learning_growth_automation_scheduler_executions/);
  assert.doesNotMatch(routes, /learning_growth_automation_scheduler_runs/);
  assert.doesNotMatch(routes, /learning_growth_automation_release_readiness/);
  assert.doesNotMatch(routes, /learning_growth_automation_release_decisions/);
  assert.doesNotMatch(routes, /learning_growth_automation_release_packages/);
  assert.doesNotMatch(routes, /learning_reward_settlements/);
  assert.doesNotMatch(routes, /learning_growth_domain_pack_provisions/);
  assert.doesNotMatch(routes, /profileV2\(/);
  assert.doesNotMatch(routes, /recordEvaluationProfileDelta/);
  assert.doesNotMatch(routes, /plannerContext\(/);
  assert.doesNotMatch(routes, /draftLearningPlan/);

  const ledgerService = read(path.join("src", "services", "learning-evidence-ledger-service.js"));
  assert.match(ledgerService, /recordEvaluationEvidence/);
  assert.match(ledgerService, /recordReflectionEvidence/);
  assert.match(ledgerService, /recordExperienceSignalEvidence/);
  assert.match(ledgerService, /learning_evidence_privacy_failed/);

  const evidenceAuditService = read(path.join("src", "services", "learning-evidence-audit-service.js"));
  assert.match(evidenceAuditService, /listEvidenceAudit/);
  assert.match(evidenceAuditService, /publicEvidenceAuditItem/);
  assert.doesNotMatch(evidenceAuditService, /learning_growth_evidence_ledger/);

  const rewardAuditService = read(path.join("src", "services", "learning-reward-audit-service.js"));
  assert.match(rewardAuditService, /createLearningRewardAuditService/);
  assert.match(rewardAuditService, /listRewardAudit/);
  assert.match(rewardAuditService, /growth\.learningRewardAudit\.v1/);
  assert.match(rewardAuditService, /summary_only/);
  assert.doesNotMatch(rewardAuditService, /learning_reward_settlements/);
  assert.doesNotMatch(rewardAuditService, /rawAnswer/);
  assert.doesNotMatch(rewardAuditService, /rawPrompt:/);

  const profileV2Service = read(path.join("src", "services", "learning-profile-v2-service.js"));
  assert.match(profileV2Service, /profileV2/);
  assert.match(profileV2Service, /recommendedPlannerHints/);
  assert.match(profileV2Service, /evidenceFreshnessForState/);
  assert.match(profileV2Service, /owner_correction_without_learning_evidence/);
  assert.match(profileV2Service, /strong_claim_requires_refresh/);
  assert.match(profileV2Service, /strategy: "review"/);

  const profileDeltaService = read(path.join("src", "services", "learning-profile-delta-service.js"));
  assert.match(profileDeltaService, /recordEvaluationProfileDelta/);
  assert.match(profileDeltaService, /recordProfileDelta/);
  assert.match(profileDeltaService, /summary_only/);
  assert.match(profileDeltaService, /evidenceFreshnessChanged/);
  assert.match(profileDeltaService, /resolvedStaleReasons/);
  assert.doesNotMatch(profileDeltaService, /rawAnswer/);
  assert.doesNotMatch(profileDeltaService, /transcript:/);
  assert.doesNotMatch(profileDeltaService, /openai\.com/);

  const profileDeltaRepository = read(path.join("src", "stores", "growth-learning-sqlite", "profile-delta-audits.js"));
  assert.match(profileDeltaRepository, /learning_growth_profile_delta_audits/);
  assert.match(profileDeltaRepository, /createProfileDeltaAuditRepository/);
  assert.match(profileDeltaRepository, /summary_only/);
  assert.doesNotMatch(profileDeltaRepository, /openai\.com/);

  const profileDeltaAuditService = read(path.join("src", "services", "learning-profile-delta-audit-service.js"));
  assert.match(profileDeltaAuditService, /listProfileDeltas/);
  assert.match(profileDeltaAuditService, /profile_delta_audit_repository_unavailable/);
  assert.doesNotMatch(profileDeltaAuditService, /learning_growth_profile_delta_audits/);
  assert.doesNotMatch(profileDeltaAuditService, /rawAnswer/);

  const profileFeedbackEvidenceService = read(path.join("src", "services", "learning-profile-feedback-evidence-service.js"));
  assert.match(profileFeedbackEvidenceService, /createLearningProfileFeedbackEvidenceService/);
  assert.match(profileFeedbackEvidenceService, /evaluateCycleCompleteness/);
  assert.match(profileFeedbackEvidenceService, /listEvidenceAudit/);
  assert.match(profileFeedbackEvidenceService, /listProfileDeltas/);
  assert.match(profileFeedbackEvidenceService, /profileV2/);
  assert.match(profileFeedbackEvidenceService, /recommendNextCard/);
  assert.match(profileFeedbackEvidenceService, /loopStateService/);
  assert.match(profileFeedbackEvidenceService, /summary_only/);
  assert.doesNotMatch(profileFeedbackEvidenceService, /learning_growth_/);
  assert.doesNotMatch(profileFeedbackEvidenceService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(profileFeedbackEvidenceService, /publishPlanItem/);
  assert.doesNotMatch(profileFeedbackEvidenceService, /generateCard/);
  assert.doesNotMatch(profileFeedbackEvidenceService, /processEvaluationJob/);
  assert.doesNotMatch(profileFeedbackEvidenceService, /activateStageAssessment/);
  assert.doesNotMatch(profileFeedbackEvidenceService, /rawAnswer:/);
  assert.doesNotMatch(profileFeedbackEvidenceService, /rawPrompt:/);

  const planAuditService = read(path.join("src", "services", "learning-plan-audit-service.js"));
  assert.match(planAuditService, /listPlanDrafts/);
  assert.match(planAuditService, /publishAttempt/);
  assert.match(planAuditService, /failedPublishAttemptCount/);
  assert.match(planAuditService, /learning_plan_audit_repository_unavailable/);
  assert.doesNotMatch(planAuditService, /learning_growth_plan_drafts/);
  assert.doesNotMatch(planAuditService, /rawAnswer/);

  const cycleAuditService = read(path.join("src", "services", "learning-cycle-audit-service.js"));
  assert.match(cycleAuditService, /listCycleAudit/);
  assert.match(cycleAuditService, /plan_publish_attempt/);
  assert.match(cycleAuditService, /failedPublishAttemptCount/);
  assert.match(cycleAuditService, /callRead\(planAuditService, "listPlanDrafts"/);
  assert.match(cycleAuditService, /callRead\(evidenceAuditService, "listEvidenceAudit"/);
  assert.match(cycleAuditService, /callRead\(profileDeltaAuditService, "listProfileDeltas"/);
  assert.match(cycleAuditService, /callRead\(ownerCorrectionService, "listCorrections"/);
  assert.doesNotMatch(cycleAuditService, /learning_growth_/);
  assert.doesNotMatch(cycleAuditService, /rawAnswer:/);
  assert.doesNotMatch(cycleAuditService, /rawPrompt:/);

  const cycleHistoryService = read(path.join("src", "services", "learning-cycle-history-service.js"));
  assert.match(cycleHistoryService, /createLearningCycleHistoryService/);
  assert.match(cycleHistoryService, /listCycleHistory/);
  assert.match(cycleHistoryService, /listPlanDrafts/);
  assert.match(cycleHistoryService, /listEvidenceAudit/);
  assert.match(cycleHistoryService, /listProfileDeltas/);
  assert.match(cycleHistoryService, /listCorrections/);
  assert.match(cycleHistoryService, /evaluateCycleCompleteness/);
  assert.match(cycleHistoryService, /growth\.learningCycleHistory\.v1/);
  assert.match(cycleHistoryService, /summary_only/);
  assert.doesNotMatch(cycleHistoryService, /learning_growth_/);
  assert.doesNotMatch(cycleHistoryService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(cycleHistoryService, /publishPlanItem/);
  assert.doesNotMatch(cycleHistoryService, /generateCard/);
  assert.doesNotMatch(cycleHistoryService, /processEvaluationJob/);
  assert.doesNotMatch(cycleHistoryService, /activateStageAssessment/);
  assert.doesNotMatch(cycleHistoryService, /rawAnswer:/);
  assert.doesNotMatch(cycleHistoryService, /rawPrompt:/);

  const auditCompletenessService = read(path.join("src", "services", "learning-audit-completeness-service.js"));
  assert.match(auditCompletenessService, /evaluateCycleCompleteness/);
  assert.match(auditCompletenessService, /cycleAuditService\.listCycleAudit/);
  assert.match(auditCompletenessService, /readyForAutomation/);
  assert.doesNotMatch(auditCompletenessService, /learning_growth_/);
  assert.doesNotMatch(auditCompletenessService, /rawAnswer:/);
  assert.doesNotMatch(auditCompletenessService, /rawPrompt:/);

  const dailyLoopService = read(path.join("src", "services", "learning-daily-loop-service.js"));
  assert.match(dailyLoopService, /preview/);
  assert.match(dailyLoopService, /draft/);
  assert.match(dailyLoopService, /publish/);
  assert.match(dailyLoopService, /contextService\.context/);
  assert.match(dailyLoopService, /planPublisherService\.draftPlan/);
  assert.match(dailyLoopService, /planPublisherService\.publishPlanItem/);
  assert.match(dailyLoopService, /cycleAuditService\.listCycleAudit/);
  assert.match(dailyLoopService, /auditCompletenessService\.evaluateCycleCompleteness/);
  assert.match(dailyLoopService, /learning_daily_loop_privacy_failed/);
  assert.doesNotMatch(dailyLoopService, /cardGenerationService/);
  assert.doesNotMatch(dailyLoopService, /createGrowthGateway/);
  assert.doesNotMatch(dailyLoopService, /gatewayClient/);
  assert.doesNotMatch(dailyLoopService, /openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(dailyLoopService, /learning_growth_/);
  assert.doesNotMatch(dailyLoopService, /rawAnswer:/);
  assert.doesNotMatch(dailyLoopService, /rawPrompt:/);

  const operatingLoopService = read(path.join("src", "services", "learning-operating-loop-service.js"));
  assert.match(operatingLoopService, /createLearningOperatingLoopService/);
  assert.match(operatingLoopService, /loopStateService\.state/);
  assert.match(operatingLoopService, /dailyLoopService\.advance/);
  assert.match(operatingLoopService, /dailyLoopService\.publish/);
  assert.match(operatingLoopService, /stageAssessmentService\.activateStageAssessment/);
  assert.match(operatingLoopService, /stage_assessment_owner_confirmation_required/);
  assert.match(operatingLoopService, /learning_operating_loop_privacy_failed/);
  assert.doesNotMatch(operatingLoopService, /createGrowthGateway/);
  assert.doesNotMatch(operatingLoopService, /gatewayClient/);
  assert.doesNotMatch(operatingLoopService, /openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(operatingLoopService, /learning_growth_/);
  assert.doesNotMatch(operatingLoopService, /rawAnswer:/);
  assert.doesNotMatch(operatingLoopService, /rawPrompt:/);

  const automationProposalService = read(path.join("src", "services", "learning-automation-proposal-service.js"));
  assert.match(automationProposalService, /createProposal/);
  assert.match(automationProposalService, /listProposals/);
  assert.match(automationProposalService, /reviewProposal/);
  assert.match(automationProposalService, /publishAcceptedProposal/);
  assert.match(automationProposalService, /evaluateCycleCompleteness/);
  assert.match(automationProposalService, /planPublisherService\.draftPlan/);
  assert.match(automationProposalService, /planPublisherService\.publishPlanItem/);
  assert.match(automationProposalService, /ownerReviewRequired/);
  assert.match(automationProposalService, /autoPublish: false/);
  assert.doesNotMatch(automationProposalService, /cardGenerationService/);
  assert.doesNotMatch(automationProposalService, /Gateway/);
  assert.doesNotMatch(automationProposalService, /scheduler/i);
  assert.doesNotMatch(automationProposalService, /learning_growth_/);
  assert.doesNotMatch(automationProposalService, /rawAnswer:/);
  assert.doesNotMatch(automationProposalService, /rawPrompt:/);

  const automationSchedulerService = read(path.join("src", "services", "learning-automation-scheduler-service.js"));
  assert.match(automationSchedulerService, /dryRun/);
  assert.match(automationSchedulerService, /automationProposalService\.listProposals/);
  assert.match(automationSchedulerService, /auditCompletenessService\.evaluateCycleCompleteness/);
  assert.match(automationSchedulerService, /targetProvisioningService\.resolveSelection/);
  assert.match(automationSchedulerService, /dryRun: true/);
  assert.match(automationSchedulerService, /writePlanned: false/);
  assert.match(automationSchedulerService, /writesPerformed: false/);
  assert.doesNotMatch(automationSchedulerService, /publishPlanItem/);
  assert.doesNotMatch(automationSchedulerService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationSchedulerService, /recordExecution/);
  assert.doesNotMatch(automationSchedulerService, /generateCard/);
  assert.doesNotMatch(automationSchedulerService, /Gateway/);
  assert.doesNotMatch(automationSchedulerService, /learning_growth_/);
  assert.doesNotMatch(automationSchedulerService, /rawAnswer:/);
  assert.doesNotMatch(automationSchedulerService, /rawPrompt:/);

  const automationSchedulerExecutionService = read(path.join("src", "services", "learning-automation-scheduler-execution-service.js"));
  assert.match(automationSchedulerExecutionService, /executeOnce/);
  assert.match(automationSchedulerExecutionService, /listExecutions/);
  assert.match(automationSchedulerExecutionService, /actionHandoffService\.getHandoff/);
  assert.match(automationSchedulerExecutionService, /digestService\.getDigest/);
  assert.match(automationSchedulerExecutionService, /failurePolicyService\.evaluateReadiness/);
  assert.match(automationSchedulerExecutionService, /schedulerService\.dryRun/);
  assert.match(automationSchedulerExecutionService, /automationProposalService\.publishAcceptedProposal/);
  assert.match(automationSchedulerExecutionService, /releaseAuthorizationService\.authorize/);
  assert.match(automationSchedulerExecutionService, /releaseAuthorization/);
  assert.match(automationSchedulerExecutionService, /releaseActivationService\.listActivations/);
  assert.match(automationSchedulerExecutionService, /releaseActivationGate/);
  assert.match(automationSchedulerExecutionService, /runtimeEnablementService\.listEnablements/);
  assert.match(automationSchedulerExecutionService, /runtimeEnablementGate/);
  assert.match(automationSchedulerExecutionService, /learning_automation_scheduler_execution_runtime_enablement_required/);
  assert.match(automationSchedulerExecutionService, /learning_automation_scheduler_execution_runtime_enablement_invalid/);
  assert.match(automationSchedulerExecutionService, /repository\.recordExecution/);
  assert.match(automationSchedulerExecutionService, /owner_explicit_once/);
  assert.match(automationSchedulerExecutionService, /allowWritefulExecution/);
  assert.doesNotMatch(automationSchedulerExecutionService, /publishPlanItem/);
  assert.doesNotMatch(automationSchedulerExecutionService, /generateCard/);
  assert.doesNotMatch(automationSchedulerExecutionService, /Gateway/);
  assert.doesNotMatch(automationSchedulerExecutionService, /activateStageAssessment/);
  assert.doesNotMatch(automationSchedulerExecutionService, /learning_growth_/);
  assert.doesNotMatch(automationSchedulerExecutionService, /rawAnswer:/);
  assert.doesNotMatch(automationSchedulerExecutionService, /rawPrompt:/);

  const automationSchedulerRunService = read(path.join("src", "services", "learning-automation-scheduler-run-service.js"));
  assert.match(automationSchedulerRunService, /runOnce/);
  assert.match(automationSchedulerRunService, /listRuns/);
  assert.match(automationSchedulerRunService, /actionHandoffService\.listHandoffs/);
  assert.match(automationSchedulerRunService, /schedulerExecutionService\.executeOnce/);
  assert.match(automationSchedulerRunService, /repository\.recordRun/);
  assert.match(automationSchedulerRunService, /background_supervised_tick/);
  assert.match(automationSchedulerRunService, /allowBackgroundScheduler/);
  assert.match(automationSchedulerRunService, /learning_automation_background_scheduler_disabled/);
  assert.doesNotMatch(automationSchedulerRunService, /publishPlanItem/);
  assert.doesNotMatch(automationSchedulerRunService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationSchedulerRunService, /generateCard/);
  assert.doesNotMatch(automationSchedulerRunService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(automationSchedulerRunService, /activateStageAssessment/);
  assert.doesNotMatch(automationSchedulerRunService, /learning_growth_/);
  assert.doesNotMatch(automationSchedulerRunService, /rawAnswer:/);
  assert.doesNotMatch(automationSchedulerRunService, /rawPrompt:/);

  const automationSchedulerWorkerService = read(path.join("src", "services", "learning-automation-scheduler-worker-service.js"));
  assert.match(automationSchedulerWorkerService, /tickTargets/);
  assert.match(automationSchedulerWorkerService, /tick/);
  assert.match(automationSchedulerWorkerService, /repository\.claimLease/);
  assert.match(automationSchedulerWorkerService, /repository\.releaseLease/);
  assert.match(automationSchedulerWorkerService, /workerTargetService\.listRunnableTargets/);
  assert.match(automationSchedulerWorkerService, /schedulerRunService\.runOnce/);
  assert.match(automationSchedulerWorkerService, /background_worker_tick/);
  assert.match(automationSchedulerWorkerService, /background_supervised_tick/);
  assert.match(automationSchedulerWorkerService, /allowBackgroundWorker/);
  assert.match(automationSchedulerWorkerService, /learning_automation_scheduler_worker_disabled/);
  assert.doesNotMatch(automationSchedulerWorkerService, /actionHandoffService/);
  assert.doesNotMatch(automationSchedulerWorkerService, /schedulerExecutionService/);
  assert.doesNotMatch(automationSchedulerWorkerService, /publishPlanItem/);
  assert.doesNotMatch(automationSchedulerWorkerService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationSchedulerWorkerService, /generateCard/);
  assert.doesNotMatch(automationSchedulerWorkerService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(automationSchedulerWorkerService, /activateStageAssessment/);
  assert.doesNotMatch(automationSchedulerWorkerService, /learning_growth_/);
  assert.doesNotMatch(automationSchedulerWorkerService, /rawAnswer:/);
  assert.doesNotMatch(automationSchedulerWorkerService, /rawPrompt:/);

  const automationSchedulerWorkerTargetService = read(path.join("src", "services", "learning-automation-scheduler-worker-target-service.js"));
  assert.match(automationSchedulerWorkerTargetService, /createTarget/);
  assert.match(automationSchedulerWorkerTargetService, /reviewTarget/);
  assert.match(automationSchedulerWorkerTargetService, /listTargets/);
  assert.match(automationSchedulerWorkerTargetService, /listRunnableTargets/);
  assert.match(automationSchedulerWorkerTargetService, /targetProvisioningService\.resolveSelection/);
  assert.match(automationSchedulerWorkerTargetService, /repository\.saveTarget/);
  assert.match(automationSchedulerWorkerTargetService, /repository\.reviewTarget/);
  assert.match(automationSchedulerWorkerTargetService, /status: "proposed"/);
  assert.match(automationSchedulerWorkerTargetService, /productionSchedulingAllowed: false/);
  assert.doesNotMatch(automationSchedulerWorkerTargetService, /schedulerRunService/);
  assert.doesNotMatch(automationSchedulerWorkerTargetService, /actionHandoffService/);
  assert.doesNotMatch(automationSchedulerWorkerTargetService, /schedulerExecutionService/);
  assert.doesNotMatch(automationSchedulerWorkerTargetService, /publishPlanItem/);
  assert.doesNotMatch(automationSchedulerWorkerTargetService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationSchedulerWorkerTargetService, /generateCard/);
  assert.doesNotMatch(automationSchedulerWorkerTargetService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(automationSchedulerWorkerTargetService, /activateStageAssessment/);
  assert.doesNotMatch(automationSchedulerWorkerTargetService, /learning_growth_/);
  assert.doesNotMatch(automationSchedulerWorkerTargetService, /rawAnswer:/);
  assert.doesNotMatch(automationSchedulerWorkerTargetService, /rawPrompt:/);

  const automationReleaseReadinessService = read(path.join("src", "services", "learning-automation-release-readiness-service.js"));
  assert.match(automationReleaseReadinessService, /evaluateReadiness/);
  assert.match(automationReleaseReadinessService, /createSnapshot/);
  assert.match(automationReleaseReadinessService, /listSnapshots/);
  assert.match(automationReleaseReadinessService, /schedulerService\.dryRun/);
  assert.match(automationReleaseReadinessService, /digestService\.listDigests/);
  assert.match(automationReleaseReadinessService, /failurePolicyService\.evaluateReadiness/);
  assert.match(automationReleaseReadinessService, /actionHandoffService\.listHandoffs/);
  assert.match(automationReleaseReadinessService, /schedulerWorkerTargetService\.listRunnableTargets/);
  assert.match(automationReleaseReadinessService, /releaseApprovalService\.approvalBag/);
  assert.match(automationReleaseReadinessService, /persistedApprovalKeys/);
  assert.match(automationReleaseReadinessService, /repository\.saveSnapshot/);
  assert.match(automationReleaseReadinessService, /writefulSchedulingAllowed: false/);
  assert.match(automationReleaseReadinessService, /advisoryOnly: true/);
  assert.doesNotMatch(automationReleaseReadinessService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(automationReleaseReadinessService, /publishPlanItem/);
  assert.doesNotMatch(automationReleaseReadinessService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationReleaseReadinessService, /generateCard/);
  assert.doesNotMatch(automationReleaseReadinessService, /evaluateSubmission/);
  assert.doesNotMatch(automationReleaseReadinessService, /executeOnce/);
  assert.doesNotMatch(automationReleaseReadinessService, /runOnce/);
  assert.doesNotMatch(automationReleaseReadinessService, /deliverHandoff/);
  assert.doesNotMatch(automationReleaseReadinessService, /recordExecution/);
  assert.doesNotMatch(automationReleaseReadinessService, /recordRun/);
  assert.doesNotMatch(automationReleaseReadinessService, /eventService/);
  assert.doesNotMatch(automationReleaseReadinessService, /emit\(/);
  assert.doesNotMatch(automationReleaseReadinessService, /activateStageAssessment/);
  assert.doesNotMatch(automationReleaseReadinessService, /learning_growth_/);
  assert.doesNotMatch(automationReleaseReadinessService, /rawAnswer:/);
  assert.doesNotMatch(automationReleaseReadinessService, /rawPrompt:/);

  const automationReleaseCollectionRunService = read(path.join("src", "services", "learning-automation-release-collection-run-service.js"));
  assert.match(automationReleaseCollectionRunService, /createLearningAutomationReleaseCollectionRunService/);
  assert.match(automationReleaseCollectionRunService, /evaluateRun/);
  assert.match(automationReleaseCollectionRunService, /recordRun/);
  assert.match(automationReleaseCollectionRunService, /listRuns/);
  assert.match(automationReleaseCollectionRunService, /repository\.saveRun/);
  assert.match(automationReleaseCollectionRunService, /RELEASE_EVIDENCE_BUNDLE_SCHEMA/);
  assert.match(automationReleaseCollectionRunService, /RELEASE_EVIDENCE_BUNDLE_AUDIT_SCHEMA/);
  assert.match(automationReleaseCollectionRunService, /writefulSchedulingAllowed: false/);
  assert.match(automationReleaseCollectionRunService, /summaryOnly: true/);
  assert.match(automationReleaseCollectionRunService, /path\.basename/);
  assert.doesNotMatch(automationReleaseCollectionRunService, /spawnSync/);
  assert.doesNotMatch(automationReleaseCollectionRunService, /execFile|exec\(/);
  assert.doesNotMatch(automationReleaseCollectionRunService, /readEnv/);
  assert.doesNotMatch(automationReleaseCollectionRunService, /createServices/);
  assert.doesNotMatch(automationReleaseCollectionRunService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(automationReleaseCollectionRunService, /publishPlanItem/);
  assert.doesNotMatch(automationReleaseCollectionRunService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationReleaseCollectionRunService, /generateCard/);
  assert.doesNotMatch(automationReleaseCollectionRunService, /evaluateSubmission/);
  assert.doesNotMatch(automationReleaseCollectionRunService, /executeOnce/);
  assert.doesNotMatch(automationReleaseCollectionRunService, /runOnce/);
  assert.doesNotMatch(automationReleaseCollectionRunService, /deliverHandoff/);
  assert.doesNotMatch(automationReleaseCollectionRunService, /emit\(/);
  assert.doesNotMatch(automationReleaseCollectionRunService, /activateStageAssessment/);
  assert.doesNotMatch(automationReleaseCollectionRunService, /learning_growth_/);
  assert.doesNotMatch(automationReleaseCollectionRunService, /rawAnswer:/);
  assert.doesNotMatch(automationReleaseCollectionRunService, /rawPrompt:/);

  const automationReleaseDecisionService = read(path.join("src", "services", "learning-automation-release-decision-service.js"));
  assert.match(automationReleaseDecisionService, /createLearningAutomationReleaseDecisionService/);
  assert.match(automationReleaseDecisionService, /evaluateDecision/);
  assert.match(automationReleaseDecisionService, /recordDecision/);
  assert.match(automationReleaseDecisionService, /listDecisions/);
  assert.match(automationReleaseDecisionService, /repository\.saveDecision/);
  assert.match(automationReleaseDecisionService, /RELEASE_COLLECTION_RUN_SCHEMA/);
  assert.match(automationReleaseDecisionService, /approved_decision_requires_ready_collection_run/);
  assert.match(automationReleaseDecisionService, /writefulSchedulingAllowed: false/);
  assert.match(automationReleaseDecisionService, /runtimeConfigChange: false/);
  assert.match(automationReleaseDecisionService, /advisoryOnly: true/);
  assert.match(automationReleaseDecisionService, /summaryOnly: true/);
  assert.match(automationReleaseDecisionService, /path\.basename/);
  assert.doesNotMatch(automationReleaseDecisionService, /spawnSync/);
  assert.doesNotMatch(automationReleaseDecisionService, /execFile|exec\(/);
  assert.doesNotMatch(automationReleaseDecisionService, /readEnv/);
  assert.doesNotMatch(automationReleaseDecisionService, /createServices/);
  assert.doesNotMatch(automationReleaseDecisionService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(automationReleaseDecisionService, /publishPlanItem/);
  assert.doesNotMatch(automationReleaseDecisionService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationReleaseDecisionService, /generateCard/);
  assert.doesNotMatch(automationReleaseDecisionService, /evaluateSubmission/);
  assert.doesNotMatch(automationReleaseDecisionService, /executeOnce/);
  assert.doesNotMatch(automationReleaseDecisionService, /runOnce/);
  assert.doesNotMatch(automationReleaseDecisionService, /deliverHandoff/);
  assert.doesNotMatch(automationReleaseDecisionService, /emit\(/);
  assert.doesNotMatch(automationReleaseDecisionService, /activateStageAssessment/);
  assert.doesNotMatch(automationReleaseDecisionService, /learning_growth_/);
  assert.doesNotMatch(automationReleaseDecisionService, /rawAnswer:/);
  assert.doesNotMatch(automationReleaseDecisionService, /rawPrompt:/);

  const automationReleasePackageService = read(path.join("src", "services", "learning-automation-release-package-service.js"));
  assert.match(automationReleasePackageService, /createLearningAutomationReleasePackageService/);
  assert.match(automationReleasePackageService, /buildPackage/);
  assert.match(automationReleasePackageService, /recordPackage/);
  assert.match(automationReleasePackageService, /listPackages/);
  assert.match(automationReleasePackageService, /repository\.savePackage/);
  assert.match(automationReleasePackageService, /repository\.listPackages/);
  assert.match(automationReleasePackageService, /release_package_write_not_allowed/);
  assert.match(automationReleasePackageService, /writefulSchedulingAllowed: false/);
  assert.match(automationReleasePackageService, /runtimeConfigChange: false/);
  assert.match(automationReleasePackageService, /summaryOnly: true/);
  assert.doesNotMatch(automationReleasePackageService, /spawnSync/);
  assert.doesNotMatch(automationReleasePackageService, /execFile|exec\(/);
  assert.doesNotMatch(automationReleasePackageService, /readEnv/);
  assert.doesNotMatch(automationReleasePackageService, /createServices/);
  assert.doesNotMatch(automationReleasePackageService, /require\(["']\.\.\/stores/);
  assert.doesNotMatch(automationReleasePackageService, /learning_growth_/);
  assert.doesNotMatch(automationReleasePackageService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(automationReleasePackageService, /publishPlanItem/);
  assert.doesNotMatch(automationReleasePackageService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationReleasePackageService, /generateCard/);
  assert.doesNotMatch(automationReleasePackageService, /evaluateSubmission/);
  assert.doesNotMatch(automationReleasePackageService, /executeOnce/);
  assert.doesNotMatch(automationReleasePackageService, /runOnce/);
  assert.doesNotMatch(automationReleasePackageService, /deliverHandoff/);
  assert.doesNotMatch(automationReleasePackageService, /activateStageAssessment/);
  assert.doesNotMatch(automationReleasePackageService, /rawAnswer:/);
  assert.doesNotMatch(automationReleasePackageService, /rawPrompt:/);

  const automationReleaseReviewService = read(path.join("src", "services", "learning-automation-release-review-service.js"));
  assert.match(automationReleaseReviewService, /createLearningAutomationReleaseReviewService/);
  assert.match(automationReleaseReviewService, /RELEASE_REVIEW_SCHEMA/);
  assert.match(automationReleaseReviewService, /readinessService\.evaluateReadiness/);
  assert.match(automationReleaseReviewService, /collectionRunService\.listRuns/);
  assert.match(automationReleaseReviewService, /decisionService\.listDecisions/);
  assert.match(automationReleaseReviewService, /approvalService\.approvalBag/);
  assert.match(automationReleaseReviewService, /packageService\.listPackages/);
  assert.match(automationReleaseReviewService, /latestPackage/);
  assert.match(automationReleaseReviewService, /packageRecordPresent/);
  assert.match(automationReleaseReviewService, /packageRecordStatus/);
  assert.match(automationReleaseReviewService, /packageReadbackSummary/);
  assert.match(automationReleaseReviewService, /releaseDashboardSummary/);
  assert.match(automationReleaseReviewService, /latestPackageDashboardStatus/);
  assert.match(automationReleaseReviewService, /package_record_required/);
  assert.match(automationReleaseReviewService, /package_readback_unavailable/);
  assert.match(automationReleaseReviewService, /package_record_blocked/);
  assert.match(automationReleaseReviewService, /record_release_package/);
  assert.match(automationReleaseReviewService, /resolve_release_package_record/);
  assert.match(automationReleaseReviewService, /writefulSchedulingAllowed: false/);
  assert.match(automationReleaseReviewService, /runtimeConfigChange: false/);
  assert.match(automationReleaseReviewService, /advisoryOnly: true/);
  assert.match(automationReleaseReviewService, /summaryOnly: true/);
  assert.doesNotMatch(automationReleaseReviewService, /save[A-Z]/);
  assert.doesNotMatch(automationReleaseReviewService, /spawnSync/);
  assert.doesNotMatch(automationReleaseReviewService, /execFile|exec\(/);
  assert.doesNotMatch(automationReleaseReviewService, /readEnv/);
  assert.doesNotMatch(automationReleaseReviewService, /createServices/);
  assert.doesNotMatch(automationReleaseReviewService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(automationReleaseReviewService, /publishPlanItem/);
  assert.doesNotMatch(automationReleaseReviewService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationReleaseReviewService, /generateCard/);
  assert.doesNotMatch(automationReleaseReviewService, /evaluateSubmission/);
  assert.doesNotMatch(automationReleaseReviewService, /executeOnce/);
  assert.doesNotMatch(automationReleaseReviewService, /runOnce/);
  assert.doesNotMatch(automationReleaseReviewService, /deliverHandoff/);
  assert.doesNotMatch(automationReleaseReviewService, /emit\(/);
  assert.doesNotMatch(automationReleaseReviewService, /activateStageAssessment/);
  assert.doesNotMatch(automationReleaseReviewService, /learning_growth_/);
  assert.doesNotMatch(automationReleaseReviewService, /rawAnswer:/);
  assert.doesNotMatch(automationReleaseReviewService, /rawPrompt:/);

  const automationReleaseAuthorizationService = read(path.join("src", "services", "learning-automation-release-authorization-service.js"));
  assert.match(automationReleaseAuthorizationService, /createLearningAutomationReleaseAuthorizationService/);
  assert.match(automationReleaseAuthorizationService, /RELEASE_AUTHORIZATION_SCHEMA/);
  assert.match(automationReleaseAuthorizationService, /releaseReviewService\.review/);
  assert.match(automationReleaseAuthorizationService, /writefulExecutionApproval/);
  assert.match(automationReleaseAuthorizationService, /latestPackage/);
  assert.match(automationReleaseAuthorizationService, /packageRecordPresent/);
  assert.match(automationReleaseAuthorizationService, /packageReadbackSummary/);
  assert.match(automationReleaseAuthorizationService, /latestPackageDashboardStatus/);
  assert.match(automationReleaseAuthorizationService, /releaseDashboardSummary/);
  assert.match(
    automationReleaseAuthorizationService,
    /learning_automation_release_authorization_package_readback_unavailable/
  );
  assert.match(
    automationReleaseAuthorizationService,
    /learning_automation_release_authorization_package_record_missing/
  );
  assert.match(
    automationReleaseAuthorizationService,
    /learning_automation_release_authorization_package_record_not_ready/
  );
  assert.match(automationReleaseAuthorizationService, /writefulSchedulingAllowed: false/);
  assert.match(automationReleaseAuthorizationService, /runtimeConfigChange: false/);
  assert.match(automationReleaseAuthorizationService, /summaryOnly: true/);
  assert.doesNotMatch(automationReleaseAuthorizationService, /save[A-Z]/);
  assert.doesNotMatch(automationReleaseAuthorizationService, /repository\./);
  assert.doesNotMatch(automationReleaseAuthorizationService, /spawnSync/);
  assert.doesNotMatch(automationReleaseAuthorizationService, /execFile|exec\(/);
  assert.doesNotMatch(automationReleaseAuthorizationService, /readEnv/);
  assert.doesNotMatch(automationReleaseAuthorizationService, /createServices/);
  assert.doesNotMatch(automationReleaseAuthorizationService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(automationReleaseAuthorizationService, /publishPlanItem/);
  assert.doesNotMatch(automationReleaseAuthorizationService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationReleaseAuthorizationService, /generateCard/);
  assert.doesNotMatch(automationReleaseAuthorizationService, /evaluateSubmission/);
  assert.doesNotMatch(automationReleaseAuthorizationService, /executeOnce/);
  assert.doesNotMatch(automationReleaseAuthorizationService, /runOnce/);
  assert.doesNotMatch(automationReleaseAuthorizationService, /deliverHandoff/);
  assert.doesNotMatch(automationReleaseAuthorizationService, /emit\(/);
  assert.doesNotMatch(automationReleaseAuthorizationService, /activateStageAssessment/);
  assert.doesNotMatch(automationReleaseAuthorizationService, /learning_growth_/);
  assert.doesNotMatch(automationReleaseAuthorizationService, /rawAnswer:/);
  assert.doesNotMatch(automationReleaseAuthorizationService, /rawPrompt:/);

  const automationReleaseClosureService = read(path.join("src", "services", "learning-automation-release-closure-service.js"));
  assert.match(automationReleaseClosureService, /createLearningAutomationReleaseClosureService/);
  assert.match(automationReleaseClosureService, /RELEASE_CLOSURE_SCHEMA/);
  assert.match(automationReleaseClosureService, /releaseReviewService\.review/);
  assert.match(automationReleaseClosureService, /releaseAuthorizationService\.authorize/);
  assert.match(automationReleaseClosureService, /backendEvidenceComplete/);
  assert.match(automationReleaseClosureService, /readyForOwnerReleaseActivation/);
  assert.match(automationReleaseClosureService, /latestPackage/);
  assert.match(automationReleaseClosureService, /packageRecordStatus/);
  assert.match(automationReleaseClosureService, /packageReadbackSummary/);
  assert.match(automationReleaseClosureService, /latestPackageDashboardStatus/);
  assert.match(automationReleaseClosureService, /releaseDashboardSummary/);
  assert.match(automationReleaseClosureService, /PRIVATE_VALUE_PATTERN/);
  assert.match(automationReleaseClosureService, /scanPrivateValues/);
  assert.match(automationReleaseClosureService, /writefulSchedulingAllowed: false/);
  assert.match(automationReleaseClosureService, /runtimeConfigChange: false/);
  assert.match(automationReleaseClosureService, /summaryOnly: true/);
  assert.doesNotMatch(automationReleaseClosureService, /save[A-Z]/);
  assert.doesNotMatch(automationReleaseClosureService, /repository\./);
  assert.doesNotMatch(automationReleaseClosureService, /spawnSync/);
  assert.doesNotMatch(automationReleaseClosureService, /execFile|exec\(/);
  assert.doesNotMatch(automationReleaseClosureService, /readEnv/);
  assert.doesNotMatch(automationReleaseClosureService, /createServices/);
  assert.doesNotMatch(automationReleaseClosureService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(automationReleaseClosureService, /publishPlanItem/);
  assert.doesNotMatch(automationReleaseClosureService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationReleaseClosureService, /generateCard/);
  assert.doesNotMatch(automationReleaseClosureService, /evaluateSubmission/);
  assert.doesNotMatch(automationReleaseClosureService, /executeOnce/);
  assert.doesNotMatch(automationReleaseClosureService, /runOnce/);
  assert.doesNotMatch(automationReleaseClosureService, /deliverHandoff/);
  assert.doesNotMatch(automationReleaseClosureService, /emit\(/);
  assert.doesNotMatch(automationReleaseClosureService, /activateStageAssessment/);
  assert.doesNotMatch(automationReleaseClosureService, /learning_growth_/);
  assert.doesNotMatch(automationReleaseClosureService, /rawAnswer:/);
  assert.doesNotMatch(automationReleaseClosureService, /rawPrompt:/);

  const automationReleaseActivationService = read(path.join("src", "services", "learning-automation-release-activation-service.js"));
  assert.match(automationReleaseActivationService, /createLearningAutomationReleaseActivationService/);
  assert.match(automationReleaseActivationService, /RELEASE_ACTIVATION_SCHEMA/);
  assert.match(automationReleaseActivationService, /releaseClosureService\.summarize/);
  assert.match(automationReleaseActivationService, /preflightReportRepository\.listReports/);
  assert.match(automationReleaseActivationService, /latestPreflightReportId/);
  assert.match(automationReleaseActivationService, /readyForOwnerRuntimeConfigDecision/);
  assert.match(automationReleaseActivationService, /recordActivation/);
  assert.match(automationReleaseActivationService, /listActivations/);
  assert.match(automationReleaseActivationService, /repository\.saveActivation/);
  assert.match(automationReleaseActivationService, /repository\.listActivations/);
  assert.match(automationReleaseActivationService, /PRIVATE_VALUE_PATTERN/);
  assert.match(automationReleaseActivationService, /scanPrivateValues/);
  assert.match(automationReleaseActivationService, /configChangeApplied: false/);
  assert.match(automationReleaseActivationService, /writefulSchedulingAllowed: false/);
  assert.match(automationReleaseActivationService, /runtimeConfigChange: false/);
  assert.match(automationReleaseActivationService, /summaryOnly: true/);
  assert.doesNotMatch(automationReleaseActivationService, /spawnSync/);
  assert.doesNotMatch(automationReleaseActivationService, /execFile|exec\(/);
  assert.doesNotMatch(automationReleaseActivationService, /readEnv/);
  assert.doesNotMatch(automationReleaseActivationService, /createServices/);
  assert.doesNotMatch(automationReleaseActivationService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(automationReleaseActivationService, /publishPlanItem/);
  assert.doesNotMatch(automationReleaseActivationService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationReleaseActivationService, /generateCard/);
  assert.doesNotMatch(automationReleaseActivationService, /evaluateSubmission/);
  assert.doesNotMatch(automationReleaseActivationService, /executeOnce/);
  assert.doesNotMatch(automationReleaseActivationService, /runOnce/);
  assert.doesNotMatch(automationReleaseActivationService, /deliverHandoff/);
  assert.doesNotMatch(automationReleaseActivationService, /emit\(/);
  assert.doesNotMatch(automationReleaseActivationService, /activateStageAssessment/);
  assert.doesNotMatch(automationReleaseActivationService, /learning_growth_/);
  assert.doesNotMatch(automationReleaseActivationService, /rawAnswer:/);
  assert.doesNotMatch(automationReleaseActivationService, /rawPrompt:/);

  const automationRuntimeEnablementService = read(path.join("src", "services", "learning-automation-runtime-enablement-service.js"));
  assert.match(automationRuntimeEnablementService, /createLearningAutomationRuntimeEnablementService/);
  assert.match(automationRuntimeEnablementService, /RUNTIME_ENABLEMENT_SCHEMA/);
  assert.match(automationRuntimeEnablementService, /releaseActivationService\.listActivations/);
  assert.match(automationRuntimeEnablementService, /latestPreflightReportId/);
  assert.match(automationRuntimeEnablementService, /runtimeConfigVerified/);
  assert.match(automationRuntimeEnablementService, /readyForManualRuntimeConfigEnablement/);
  assert.match(automationRuntimeEnablementService, /recordEnablement/);
  assert.match(automationRuntimeEnablementService, /listEnablements/);
  assert.match(automationRuntimeEnablementService, /repository\.saveEnablement/);
  assert.match(automationRuntimeEnablementService, /repository\.listEnablements/);
  assert.match(automationRuntimeEnablementService, /configChangeApplied: false/);
  assert.match(automationRuntimeEnablementService, /writefulSchedulingAllowed: false/);
  assert.match(automationRuntimeEnablementService, /runtimeConfigChange: false/);
  assert.match(automationRuntimeEnablementService, /runtimeConfigMutationPerformed: false/);
  assert.match(automationRuntimeEnablementService, /summaryOnly: true/);
  assert.doesNotMatch(automationRuntimeEnablementService, /spawnSync/);
  assert.doesNotMatch(automationRuntimeEnablementService, /execFile|exec\(/);
  assert.doesNotMatch(automationRuntimeEnablementService, /readEnv/);
  assert.doesNotMatch(automationRuntimeEnablementService, /createServices/);
  assert.doesNotMatch(automationRuntimeEnablementService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(automationRuntimeEnablementService, /publishPlanItem/);
  assert.doesNotMatch(automationRuntimeEnablementService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationRuntimeEnablementService, /generateCard/);
  assert.doesNotMatch(automationRuntimeEnablementService, /evaluateSubmission/);
  assert.doesNotMatch(automationRuntimeEnablementService, /executeOnce/);
  assert.doesNotMatch(automationRuntimeEnablementService, /runOnce/);
  assert.doesNotMatch(automationRuntimeEnablementService, /deliverHandoff/);
  assert.doesNotMatch(automationRuntimeEnablementService, /emit\(/);
  assert.doesNotMatch(automationRuntimeEnablementService, /activateStageAssessment/);
  assert.doesNotMatch(automationRuntimeEnablementService, /learning_growth_/);
  assert.doesNotMatch(automationRuntimeEnablementService, /rawAnswer:/);
  assert.doesNotMatch(automationRuntimeEnablementService, /rawPrompt:/);

  const automationReleaseControlsService = read(path.join("src", "services", "learning-automation-release-controls-service.js"));
  assert.match(automationReleaseControlsService, /createLearningAutomationReleaseControlsService/);
  assert.match(automationReleaseControlsService, /RELEASE_CONTROLS_SCHEMA/);
  assert.match(automationReleaseControlsService, /releaseReadinessService\.evaluateReadiness/);
  assert.match(automationReleaseControlsService, /releaseReviewService\.review/);
  assert.match(automationReleaseControlsService, /releaseClosureService\.summarize/);
  assert.match(automationReleaseControlsService, /releaseActivationService\.preflight/);
  assert.match(automationReleaseControlsService, /releaseActivationService\.listActivations/);
  assert.match(automationReleaseControlsService, /runtimeEnablementService\.evaluate/);
  assert.match(automationReleaseControlsService, /runtimeEnablementService\.listEnablements/);
  assert.match(automationReleaseControlsService, /auditReadback/);
  assert.match(automationReleaseControlsService, /activation_records/);
  assert.match(automationReleaseControlsService, /runtime_enablement_records/);
  assert.match(automationReleaseControlsService, /manual_runtime_config_required/);
  assert.match(automationReleaseControlsService, /activation_record_required/);
  assert.match(automationReleaseControlsService, /release_closure_required/);
  assert.match(automationReleaseControlsService, /latestPackageId/);
  assert.match(automationReleaseControlsService, /latestPackageStatus/);
  assert.match(automationReleaseControlsService, /latestPackageDashboardStatus/);
  assert.match(automationReleaseControlsService, /latestPackageDashboardNextActionKey/);
  assert.match(automationReleaseControlsService, /packageRecordPresent/);
  assert.match(automationReleaseControlsService, /evidenceReadbackSummary/);
  assert.match(automationReleaseControlsService, /sourceBundleTaskCount/);
  assert.match(automationReleaseControlsService, /ownerReviewStageSummary/);
  assert.match(automationReleaseControlsService, /blockedActionHandoffCount/);
  assert.match(automationReleaseControlsService, /publishedSchedulerExecutionCount/);
  assert.match(automationReleaseControlsService, /pendingWorkerTargetReviewCount/);
  assert.match(automationReleaseControlsService, /firstPreflightFields/);
  assert.match(automationReleaseControlsService, /latestPreflightReportId/);
  assert.match(automationReleaseControlsService, /configChangeApplied: false/);
  assert.match(automationReleaseControlsService, /writefulSchedulingAllowed: false/);
  assert.match(automationReleaseControlsService, /runtimeConfigChange: false/);
  assert.match(automationReleaseControlsService, /runtimeConfigMutationPerformed: false/);
  assert.match(automationReleaseControlsService, /summaryOnly: true/);
  assert.doesNotMatch(automationReleaseControlsService, /save[A-Z]/);
  assert.doesNotMatch(automationReleaseControlsService, /repository\./);
  assert.doesNotMatch(automationReleaseControlsService, /spawnSync/);
  assert.doesNotMatch(automationReleaseControlsService, /execFile|exec\(/);
  assert.doesNotMatch(automationReleaseControlsService, /readEnv/);
  assert.doesNotMatch(automationReleaseControlsService, /createServices/);
  assert.doesNotMatch(automationReleaseControlsService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(automationReleaseControlsService, /publishPlanItem/);
  assert.doesNotMatch(automationReleaseControlsService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationReleaseControlsService, /generateCard/);
  assert.doesNotMatch(automationReleaseControlsService, /evaluateSubmission/);
  assert.doesNotMatch(automationReleaseControlsService, /executeOnce/);
  assert.doesNotMatch(automationReleaseControlsService, /runOnce/);
  assert.doesNotMatch(automationReleaseControlsService, /deliverHandoff/);
  assert.doesNotMatch(automationReleaseControlsService, /emit\(/);
  assert.doesNotMatch(automationReleaseControlsService, /activateStageAssessment/);
  assert.doesNotMatch(automationReleaseControlsService, /learning_growth_/);
  assert.doesNotMatch(automationReleaseControlsService, /rawAnswer:/);
  assert.doesNotMatch(automationReleaseControlsService, /rawPrompt:/);

  const automationReleaseApprovalService = read(path.join("src", "services", "learning-automation-release-approval-service.js"));
  assert.match(automationReleaseApprovalService, /recordApproval/);
  assert.match(automationReleaseApprovalService, /listApprovals/);
  assert.match(automationReleaseApprovalService, /approvalBag/);
  assert.match(automationReleaseApprovalService, /repository\.saveApproval/);
  assert.match(automationReleaseApprovalService, /repository\.listApprovals/);
  assert.match(automationReleaseApprovalService, /summaryOnly: true/);
  assert.match(automationReleaseApprovalService, /writefulSchedulingAllowed: false/);
  assert.match(automationReleaseApprovalService, /PRIVATE_VALUE_PATTERN/);
  assert.doesNotMatch(automationReleaseApprovalService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(automationReleaseApprovalService, /publishPlanItem/);
  assert.doesNotMatch(automationReleaseApprovalService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationReleaseApprovalService, /generateCard/);
  assert.doesNotMatch(automationReleaseApprovalService, /evaluateSubmission/);
  assert.doesNotMatch(automationReleaseApprovalService, /executeOnce/);
  assert.doesNotMatch(automationReleaseApprovalService, /runOnce/);
  assert.doesNotMatch(automationReleaseApprovalService, /deliverHandoff/);
  assert.doesNotMatch(automationReleaseApprovalService, /activateStageAssessment/);
  assert.doesNotMatch(automationReleaseApprovalService, /learning_growth_/);
  assert.doesNotMatch(automationReleaseApprovalService, /rawAnswer:/);
  assert.doesNotMatch(automationReleaseApprovalService, /rawPrompt:/);

  const automationReleaseEvidenceService = read(path.join("src", "services", "learning-automation-release-evidence-service.js"));
  assert.match(automationReleaseEvidenceService, /recordEvidence/);
  assert.match(automationReleaseEvidenceService, /listEvidence/);
  assert.match(automationReleaseEvidenceService, /evidenceBag/);
  assert.match(automationReleaseEvidenceService, /UI_RELEASE_EVIDENCE_KEYS/);
  assert.match(automationReleaseEvidenceService, /releasePackageReviewUiEvidence/);
  assert.match(automationReleaseEvidenceService, /release_package_review_ui_evidence/);
  assert.match(automationReleaseEvidenceService, /validateUiReleaseEvidencePass/);
  assert.match(automationReleaseEvidenceService, /uiEvidenceService\.evaluate/);
  assert.match(automationReleaseEvidenceService, /compactUiBagFields/);
  assert.match(automationReleaseEvidenceService, /compactUiEvidenceProjection/);
  assert.match(automationReleaseEvidenceService, /learning_automation_release_evidence_ui_validation_failed/);
  assert.match(automationReleaseEvidenceService, /repository\.saveEvidence/);
  assert.match(automationReleaseEvidenceService, /repository\.listEvidence/);
  assert.match(automationReleaseEvidenceService, /summaryOnly: true/);
  assert.match(automationReleaseEvidenceService, /writefulSchedulingAllowed: false/);
  assert.doesNotMatch(automationReleaseEvidenceService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(automationReleaseEvidenceService, /publishPlanItem/);
  assert.doesNotMatch(automationReleaseEvidenceService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationReleaseEvidenceService, /generateCard/);
  assert.doesNotMatch(automationReleaseEvidenceService, /evaluateSubmission/);
  assert.doesNotMatch(automationReleaseEvidenceService, /executeOnce/);
  assert.doesNotMatch(automationReleaseEvidenceService, /runOnce/);
  assert.doesNotMatch(automationReleaseEvidenceService, /deliverHandoff/);
  assert.doesNotMatch(automationReleaseEvidenceService, /activateStageAssessment/);
  assert.doesNotMatch(automationReleaseEvidenceService, /learning_growth_/);
  assert.doesNotMatch(automationReleaseEvidenceService, /rawAnswer:/);
  assert.doesNotMatch(automationReleaseEvidenceService, /rawPrompt:/);

  const automationDigestService = read(path.join("src", "services", "learning-automation-digest-service.js"));
  assert.match(automationDigestService, /createDigest/);
  assert.match(automationDigestService, /listDigests/);
  assert.match(automationDigestService, /reviewDigest/);
  assert.match(automationDigestService, /schedulerService\.dryRun/);
  assert.match(automationDigestService, /repository\.saveDigest/);
  assert.match(automationDigestService, /dryRun: true/);
  assert.match(automationDigestService, /writePlanned: false/);
  assert.match(automationDigestService, /writesPerformed: false/);
  assert.match(automationDigestService, /publishPlanned: false/);
  assert.match(automationDigestService, /publishRequiresOwnerAction/);
  assert.doesNotMatch(automationDigestService, /publishPlanItem/);
  assert.doesNotMatch(automationDigestService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationDigestService, /recordExecution/);
  assert.doesNotMatch(automationDigestService, /generateCard/);
  assert.doesNotMatch(automationDigestService, /Gateway/);
  assert.doesNotMatch(automationDigestService, /notification/i);
  assert.doesNotMatch(automationDigestService, /Action Inbox|actionInbox/i);
  assert.doesNotMatch(automationDigestService, /activateStageAssessment/);
  assert.doesNotMatch(automationDigestService, /learning_growth_/);
  assert.doesNotMatch(automationDigestService, /rawAnswer:/);
  assert.doesNotMatch(automationDigestService, /rawPrompt:/);

  const automationFailurePolicyService = read(path.join("src", "services", "learning-automation-failure-policy-service.js"));
  assert.match(automationFailurePolicyService, /createPolicy/);
  assert.match(automationFailurePolicyService, /listPolicies/);
  assert.match(automationFailurePolicyService, /reviewPolicy/);
  assert.match(automationFailurePolicyService, /evaluateReadiness/);
  assert.match(automationFailurePolicyService, /readyForWritefulAutomationPrerequisite/);
  assert.match(automationFailurePolicyService, /writefulSchedulingAllowed: false/);
  assert.match(automationFailurePolicyService, /maxAutomaticRetries: 0/);
  assert.match(automationFailurePolicyService, /retryRequiresOwner/);
  assert.match(automationFailurePolicyService, /visibleFailureRequired/);
  assert.doesNotMatch(automationFailurePolicyService, /publishPlanItem/);
  assert.doesNotMatch(automationFailurePolicyService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationFailurePolicyService, /recordExecution/);
  assert.doesNotMatch(automationFailurePolicyService, /schedulerService/);
  assert.doesNotMatch(automationFailurePolicyService, /dryRun/);
  assert.doesNotMatch(automationFailurePolicyService, /generateCard/);
  assert.doesNotMatch(automationFailurePolicyService, /Gateway/);
  assert.doesNotMatch(automationFailurePolicyService, /Action Inbox|actionInbox/i);
  assert.doesNotMatch(automationFailurePolicyService, /activateStageAssessment/);
  assert.doesNotMatch(automationFailurePolicyService, /learning_growth_/);
  assert.doesNotMatch(automationFailurePolicyService, /rawAnswer:/);
  assert.doesNotMatch(automationFailurePolicyService, /rawPrompt:/);

  const automationActionHandoffService = read(path.join("src", "services", "learning-automation-action-handoff-service.js"));
  assert.match(automationActionHandoffService, /createHandoff/);
  assert.match(automationActionHandoffService, /deliverHandoff/);
  assert.match(automationActionHandoffService, /listHandoffs/);
  assert.match(automationActionHandoffService, /digestService\.getDigest/);
  assert.match(automationActionHandoffService, /failurePolicyService\.evaluateReadiness/);
  assert.match(automationActionHandoffService, /eventService\.emit/);
  assert.match(automationActionHandoffService, /writefulSchedulingAllowed: false/);
  assert.match(automationActionHandoffService, /pending_delivery/);
  assert.match(automationActionHandoffService, /delivery_failed/);
  assert.doesNotMatch(automationActionHandoffService, /schedulerService/);
  assert.doesNotMatch(automationActionHandoffService, /publishPlanItem/);
  assert.doesNotMatch(automationActionHandoffService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationActionHandoffService, /recordExecution/);
  assert.doesNotMatch(automationActionHandoffService, /generateCard/);
  assert.doesNotMatch(automationActionHandoffService, /Gateway/);
  assert.doesNotMatch(automationActionHandoffService, /activateStageAssessment/);
  assert.doesNotMatch(automationActionHandoffService, /learning_growth_/);
  assert.doesNotMatch(automationActionHandoffService, /rawAnswer:/);
  assert.doesNotMatch(automationActionHandoffService, /rawPrompt:/);

  const automationOwnerReviewEvidenceService = read(path.join("src", "services", "learning-automation-owner-review-evidence-service.js"));
  assert.match(automationOwnerReviewEvidenceService, /createLearningAutomationOwnerReviewEvidenceService/);
  assert.match(automationOwnerReviewEvidenceService, /growth\.learningAutomationOwnerReviewEvidence\.v1/);
  assert.match(automationOwnerReviewEvidenceService, /proposalService\.listProposals/);
  assert.match(automationOwnerReviewEvidenceService, /digestService\.listDigests/);
  assert.match(automationOwnerReviewEvidenceService, /failurePolicyService\.evaluateReadiness/);
  assert.match(automationOwnerReviewEvidenceService, /actionHandoffService\.listHandoffs/);
  assert.match(automationOwnerReviewEvidenceService, /schedulerExecutionService\.listExecutions/);
  assert.match(automationOwnerReviewEvidenceService, /schedulerRunService\.listRuns/);
  assert.match(automationOwnerReviewEvidenceService, /schedulerWorkerTargetService\.listTargets/);
  assert.match(automationOwnerReviewEvidenceService, /releaseReadinessService\.evaluateReadiness/);
  assert.match(automationOwnerReviewEvidenceService, /proposedProposalCount/);
  assert.match(automationOwnerReviewEvidenceService, /skippedProposalCount/);
  assert.match(automationOwnerReviewEvidenceService, /expiredProposalCount/);
  assert.match(automationOwnerReviewEvidenceService, /supersededProposalCount/);
  assert.match(automationOwnerReviewEvidenceService, /publishedProposalExecutionCount/);
  assert.match(automationOwnerReviewEvidenceService, /summaryOnly: true/);
  assert.match(automationOwnerReviewEvidenceService, /writefulSchedulingAllowed: false/);
  assert.doesNotMatch(automationOwnerReviewEvidenceService, /require\(["']\.\.\/stores/);
  assert.doesNotMatch(automationOwnerReviewEvidenceService, /learning_growth_/);
  assert.doesNotMatch(automationOwnerReviewEvidenceService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(automationOwnerReviewEvidenceService, /publishPlanItem/);
  assert.doesNotMatch(automationOwnerReviewEvidenceService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationOwnerReviewEvidenceService, /generateCard/);
  assert.doesNotMatch(automationOwnerReviewEvidenceService, /evaluateSubmission/);
  assert.doesNotMatch(automationOwnerReviewEvidenceService, /executeOnce/);
  assert.doesNotMatch(automationOwnerReviewEvidenceService, /runOnce/);
  assert.doesNotMatch(automationOwnerReviewEvidenceService, /deliverHandoff/);
  assert.doesNotMatch(automationOwnerReviewEvidenceService, /recordExecution/);
  assert.doesNotMatch(automationOwnerReviewEvidenceService, /recordRun/);
  assert.doesNotMatch(automationOwnerReviewEvidenceService, /eventService/);
  assert.doesNotMatch(automationOwnerReviewEvidenceService, /emit\(/);
  assert.doesNotMatch(automationOwnerReviewEvidenceService, /activateStageAssessment/);
  assert.doesNotMatch(automationOwnerReviewEvidenceService, /rawAnswer:/);
  assert.doesNotMatch(automationOwnerReviewEvidenceService, /rawPrompt:/);

  const automationPlatformActionEvidenceService = read(path.join("src", "services", "learning-automation-platform-action-evidence-service.js"));
  assert.match(automationPlatformActionEvidenceService, /createLearningAutomationPlatformActionEvidenceService/);
  assert.match(automationPlatformActionEvidenceService, /evaluate/);
  assert.match(automationPlatformActionEvidenceService, /outboxStore\.list/);
  assert.match(automationPlatformActionEvidenceService, /growth\.automation\.action_required/);
  assert.match(automationPlatformActionEvidenceService, /delivered_platform_action_inbox_receipt/);
  assert.match(automationPlatformActionEvidenceService, /delivered_platform_web_push_receipt/);
  assert.match(automationPlatformActionEvidenceService, /growthDoesNotReadPushSubscriptions/);
  assert.match(automationPlatformActionEvidenceService, /homeAiOwnsActionInbox/);
  assert.match(automationPlatformActionEvidenceService, /homeAiOwnsWebPush/);
  assert.match(automationPlatformActionEvidenceService, /summaryOnly: true/);
  assert.doesNotMatch(automationPlatformActionEvidenceService, /eventService/);
  assert.doesNotMatch(automationPlatformActionEvidenceService, /emit\(/);
  assert.doesNotMatch(automationPlatformActionEvidenceService, /fetch\(/);
  assert.doesNotMatch(automationPlatformActionEvidenceService, /publishPlanItem/);
  assert.doesNotMatch(automationPlatformActionEvidenceService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationPlatformActionEvidenceService, /recordExecution/);
  assert.doesNotMatch(automationPlatformActionEvidenceService, /generateCard/);
  assert.doesNotMatch(automationPlatformActionEvidenceService, /Gateway/);
  assert.doesNotMatch(automationPlatformActionEvidenceService, /activateStageAssessment/);
  assert.doesNotMatch(automationPlatformActionEvidenceService, /learning_growth_/);
  assert.doesNotMatch(automationPlatformActionEvidenceService, /rawAnswer:/);
  assert.doesNotMatch(automationPlatformActionEvidenceService, /rawPrompt:/);

  const automationCentralVisualEvidenceService = read(path.join("src", "services", "learning-automation-central-visual-evidence-service.js"));
  assert.match(automationCentralVisualEvidenceService, /createLearningAutomationCentralVisualEvidenceService/);
  assert.match(automationCentralVisualEvidenceService, /evaluate/);
  assert.match(automationCentralVisualEvidenceService, /readFile/);
  assert.match(automationCentralVisualEvidenceService, /homeAiOwnsVisualHarness/);
  assert.match(automationCentralVisualEvidenceService, /growthRunsNoAppium/);
  assert.match(automationCentralVisualEvidenceService, /growthReadsOnlyCentralHarnessArtifacts/);
  assert.match(automationCentralVisualEvidenceService, /screenshotArtifactName/);
  assert.match(automationCentralVisualEvidenceService, /summaryOnly: true/);
  assert.doesNotMatch(automationCentralVisualEvidenceService, /spawnSync/);
  assert.doesNotMatch(automationCentralVisualEvidenceService, /execFile|exec\(/);
  assert.doesNotMatch(automationCentralVisualEvidenceService, /ios:pwa:visual/);
  assert.doesNotMatch(automationCentralVisualEvidenceService, /fetch\(/);
  assert.doesNotMatch(automationCentralVisualEvidenceService, /publishPlanItem/);
  assert.doesNotMatch(automationCentralVisualEvidenceService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationCentralVisualEvidenceService, /recordExecution/);
  assert.doesNotMatch(automationCentralVisualEvidenceService, /generateCard/);
  assert.doesNotMatch(automationCentralVisualEvidenceService, /Gateway/);
  assert.doesNotMatch(automationCentralVisualEvidenceService, /activateStageAssessment/);

  const automationProductionDeploymentEvidenceService = read(
    path.join("src", "services", "learning-automation-production-deployment-evidence-service.js")
  );
  assert.match(automationProductionDeploymentEvidenceService, /createLearningAutomationProductionDeploymentEvidenceService/);
  assert.match(automationProductionDeploymentEvidenceService, /evaluate/);
  assert.match(automationProductionDeploymentEvidenceService, /readFile/);
  assert.match(automationProductionDeploymentEvidenceService, /homeAiOwnsDeployment/);
  assert.match(automationProductionDeploymentEvidenceService, /growthRunsNoDeployment/);
  assert.match(automationProductionDeploymentEvidenceService, /growthReadsOnlyDeploymentHealthSummary/);
  assert.match(automationProductionDeploymentEvidenceService, /noRuntimeConfigMutation/);
  assert.match(automationProductionDeploymentEvidenceService, /serviceRunning/);
  assert.match(automationProductionDeploymentEvidenceService, /manifestOk/);
  assert.match(automationProductionDeploymentEvidenceService, /healthOk/);
  assert.match(automationProductionDeploymentEvidenceService, /summaryOnly: true/);
  assert.doesNotMatch(automationProductionDeploymentEvidenceService, /spawnSync/);
  assert.doesNotMatch(automationProductionDeploymentEvidenceService, /execFile|exec\(/);
  assert.doesNotMatch(automationProductionDeploymentEvidenceService, /launchctl/);
  assert.doesNotMatch(automationProductionDeploymentEvidenceService, /restart/);
  assert.doesNotMatch(automationProductionDeploymentEvidenceService, /fetch\(/);
  assert.doesNotMatch(automationProductionDeploymentEvidenceService, /publishPlanItem/);
  assert.doesNotMatch(automationProductionDeploymentEvidenceService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationProductionDeploymentEvidenceService, /recordExecution/);
  assert.doesNotMatch(automationProductionDeploymentEvidenceService, /generateCard/);
  assert.doesNotMatch(automationProductionDeploymentEvidenceService, /Gateway/);
  assert.doesNotMatch(automationProductionDeploymentEvidenceService, /activateStageAssessment/);
  assert.doesNotMatch(automationProductionDeploymentEvidenceService, /learning_growth_/);
  assert.doesNotMatch(automationProductionDeploymentEvidenceService, /rawAnswer:/);
  assert.doesNotMatch(automationProductionDeploymentEvidenceService, /rawPrompt:/);

  const automationUiEvidenceService = read(path.join("src", "services", "learning-automation-ui-evidence-service.js"));
  assert.match(automationUiEvidenceService, /createLearningAutomationUiEvidenceService/);
  assert.match(automationUiEvidenceService, /evaluate/);
  assert.match(automationUiEvidenceService, /UI_GATE_SPECS/);
  assert.match(automationUiEvidenceService, /ownerDailyUiEvidence/);
  assert.match(automationUiEvidenceService, /releasePackageReviewUiEvidence/);
  assert.match(automationUiEvidenceService, /release_package_review/);
  assert.match(automationUiEvidenceService, /requiredCoverage/);
  assert.match(automationUiEvidenceService, /growthRunsNoVisualTooling/);
  assert.match(automationUiEvidenceService, /homeAiOwnsVisualHarness/);
  assert.match(automationUiEvidenceService, /summaryOnly: true/);
  assert.doesNotMatch(automationUiEvidenceService, /spawnSync/);
  assert.doesNotMatch(automationUiEvidenceService, /execFile|exec\(/);
  assert.doesNotMatch(automationUiEvidenceService, /ios:pwa:visual/);
  assert.doesNotMatch(automationUiEvidenceService, /fetch\(/);
  assert.doesNotMatch(automationUiEvidenceService, /publishPlanItem/);
  assert.doesNotMatch(automationUiEvidenceService, /publishAcceptedProposal/);
  assert.doesNotMatch(automationUiEvidenceService, /recordExecution/);
  assert.doesNotMatch(automationUiEvidenceService, /generateCard/);
  assert.doesNotMatch(automationUiEvidenceService, /Gateway/);
  assert.doesNotMatch(automationUiEvidenceService, /activateStageAssessment/);
  assert.doesNotMatch(automationUiEvidenceService, /learning_growth_/);
  assert.doesNotMatch(automationCentralVisualEvidenceService, /learning_growth_/);
  assert.doesNotMatch(automationCentralVisualEvidenceService, /rawAnswer:/);
  assert.doesNotMatch(automationCentralVisualEvidenceService, /rawPrompt:/);

  const automationProposalRepository = read(path.join("src", "stores", "growth-learning-sqlite", "automation-proposals.js"));
  assert.match(automationProposalRepository, /learning_growth_automation_proposals/);
  assert.match(automationProposalRepository, /createLearningAutomationProposalRepository/);
  assert.match(automationProposalRepository, /summary_only/);
  assert.match(automationProposalRepository, /scanPrivacyKeys/);
  assert.match(automationProposalRepository, /PRIVATE_VALUE_PATTERN/);
  assert.match(automationProposalRepository, /learning_automation_proposal_privacy_class_required/);
  assert.match(automationProposalRepository, /reviewProposal/);
  assert.match(automationProposalRepository, /getProposal/);
  assert.match(automationProposalRepository, /recordExecution/);
  assert.match(automationProposalRepository, /learning_automation_proposal_status_invalid/);
  assert.match(automationProposalRepository, /learning_automation_proposal_execution_status_invalid/);
  assert.doesNotMatch(automationProposalRepository, /openai\.com/);

  const automationDigestRepository = read(path.join("src", "stores", "growth-learning-sqlite", "automation-digests.js"));
  assert.match(automationDigestRepository, /learning_growth_automation_digests/);
  assert.match(automationDigestRepository, /createLearningAutomationDigestRepository/);
  assert.match(automationDigestRepository, /summary_only/);
  assert.match(automationDigestRepository, /scanPrivacyKeys/);
  assert.match(automationDigestRepository, /PRIVATE_VALUE_PATTERN/);
  assert.match(automationDigestRepository, /learning_automation_digest_privacy_class_required/);
  assert.match(automationDigestRepository, /reviewDigest/);
  assert.match(automationDigestRepository, /getDigest/);
  assert.match(automationDigestRepository, /learning_automation_digest_status_invalid/);
  assert.doesNotMatch(automationDigestRepository, /openai\.com/);

  const automationActionHandoffRepository = read(path.join("src", "stores", "growth-learning-sqlite", "automation-action-handoffs.js"));
  assert.match(automationActionHandoffRepository, /learning_growth_automation_action_handoffs/);
  assert.match(automationActionHandoffRepository, /createLearningAutomationActionHandoffRepository/);
  assert.match(automationActionHandoffRepository, /summary_only/);
  assert.match(automationActionHandoffRepository, /scanPrivacyKeys/);
  assert.match(automationActionHandoffRepository, /PRIVATE_VALUE_PATTERN/);
  assert.match(automationActionHandoffRepository, /learning_automation_action_handoff_privacy_class_required/);
  assert.match(automationActionHandoffRepository, /saveHandoff/);
  assert.match(automationActionHandoffRepository, /getHandoff/);
  assert.match(automationActionHandoffRepository, /recordDelivery/);
  assert.match(automationActionHandoffRepository, /learning_automation_action_handoff_delivery_status_invalid/);
  assert.doesNotMatch(automationActionHandoffRepository, /openai\.com/);

  const automationSchedulerExecutionRepository = read(path.join("src", "stores", "growth-learning-sqlite", "automation-scheduler-executions.js"));
  assert.match(automationSchedulerExecutionRepository, /learning_growth_automation_scheduler_executions/);
  assert.match(automationSchedulerExecutionRepository, /createLearningAutomationSchedulerExecutionRepository/);
  assert.match(automationSchedulerExecutionRepository, /summary_only/);
  assert.match(automationSchedulerExecutionRepository, /scanPrivacyKeys/);
  assert.match(automationSchedulerExecutionRepository, /PRIVATE_VALUE_PATTERN/);
  assert.match(automationSchedulerExecutionRepository, /learning_automation_scheduler_execution_privacy_class_required/);
  assert.match(automationSchedulerExecutionRepository, /recordExecution/);
  assert.match(automationSchedulerExecutionRepository, /listExecutions/);
  assert.match(automationSchedulerExecutionRepository, /getExecution/);
  assert.match(automationSchedulerExecutionRepository, /learning_automation_scheduler_execution_status_invalid/);
  assert.doesNotMatch(automationSchedulerExecutionRepository, /openai\.com/);

  const automationSchedulerRunRepository = read(path.join("src", "stores", "growth-learning-sqlite", "automation-scheduler-runs.js"));
  assert.match(automationSchedulerRunRepository, /learning_growth_automation_scheduler_runs/);
  assert.match(automationSchedulerRunRepository, /createLearningAutomationSchedulerRunRepository/);
  assert.match(automationSchedulerRunRepository, /summary_only/);
  assert.match(automationSchedulerRunRepository, /scanPrivacyKeys/);
  assert.match(automationSchedulerRunRepository, /PRIVATE_VALUE_PATTERN/);
  assert.match(automationSchedulerRunRepository, /learning_automation_scheduler_run_privacy_class_required/);
  assert.match(automationSchedulerRunRepository, /recordRun/);
  assert.match(automationSchedulerRunRepository, /listRuns/);
  assert.match(automationSchedulerRunRepository, /getRun/);
  assert.match(automationSchedulerRunRepository, /learning_automation_scheduler_run_status_invalid/);
  assert.doesNotMatch(automationSchedulerRunRepository, /openai\.com/);

  const automationSchedulerWorkerLeaseRepository = read(path.join("src", "stores", "growth-learning-sqlite", "automation-scheduler-worker-leases.js"));
  assert.match(automationSchedulerWorkerLeaseRepository, /learning_growth_automation_scheduler_worker_leases/);
  assert.match(automationSchedulerWorkerLeaseRepository, /createLearningAutomationSchedulerWorkerLeaseRepository/);
  assert.match(automationSchedulerWorkerLeaseRepository, /summary_only/);
  assert.match(automationSchedulerWorkerLeaseRepository, /scanPrivacyKeys/);
  assert.match(automationSchedulerWorkerLeaseRepository, /PRIVATE_VALUE_PATTERN/);
  assert.match(automationSchedulerWorkerLeaseRepository, /claimLease/);
  assert.match(automationSchedulerWorkerLeaseRepository, /releaseLease/);
  assert.match(automationSchedulerWorkerLeaseRepository, /listLeases/);
  assert.match(automationSchedulerWorkerLeaseRepository, /learning_automation_scheduler_worker_lease_privacy_class_required/);
  assert.match(automationSchedulerWorkerLeaseRepository, /learning_automation_scheduler_worker_lease_status_invalid/);
  assert.doesNotMatch(automationSchedulerWorkerLeaseRepository, /openai\.com/);

  const automationSchedulerWorkerTargetRepository = read(path.join("src", "stores", "growth-learning-sqlite", "automation-scheduler-worker-targets.js"));
  assert.match(automationSchedulerWorkerTargetRepository, /learning_growth_automation_scheduler_worker_targets/);
  assert.match(automationSchedulerWorkerTargetRepository, /createLearningAutomationSchedulerWorkerTargetRepository/);
  assert.match(automationSchedulerWorkerTargetRepository, /summary_only/);
  assert.match(automationSchedulerWorkerTargetRepository, /scanPrivacyKeys/);
  assert.match(automationSchedulerWorkerTargetRepository, /PRIVATE_VALUE_PATTERN/);
  assert.match(automationSchedulerWorkerTargetRepository, /saveTarget/);
  assert.match(automationSchedulerWorkerTargetRepository, /reviewTarget/);
  assert.match(automationSchedulerWorkerTargetRepository, /listTargets/);
  assert.match(automationSchedulerWorkerTargetRepository, /getTarget/);
  assert.match(automationSchedulerWorkerTargetRepository, /learning_automation_scheduler_worker_target_privacy_class_required/);
  assert.match(automationSchedulerWorkerTargetRepository, /learning_automation_scheduler_worker_target_status_invalid/);
  assert.doesNotMatch(automationSchedulerWorkerTargetRepository, /openai\.com/);

  const automationReleaseReadinessRepository = read(path.join("src", "stores", "growth-learning-sqlite", "automation-release-readiness.js"));
  assert.match(automationReleaseReadinessRepository, /learning_growth_automation_release_readiness/);
  assert.match(automationReleaseReadinessRepository, /evidence_readback_json/);
  assert.match(automationReleaseReadinessRepository, /createLearningAutomationReleaseReadinessRepository/);
  assert.match(automationReleaseReadinessRepository, /summary_only/);
  assert.match(automationReleaseReadinessRepository, /scanPrivacyKeys/);
  assert.match(automationReleaseReadinessRepository, /PRIVATE_VALUE_PATTERN/);
  assert.match(automationReleaseReadinessRepository, /saveSnapshot/);
  assert.match(automationReleaseReadinessRepository, /listSnapshots/);
  assert.match(automationReleaseReadinessRepository, /learning_automation_release_readiness_privacy_class_required/);
  assert.match(automationReleaseReadinessRepository, /learning_automation_release_readiness_status_invalid/);
  assert.doesNotMatch(automationReleaseReadinessRepository, /openai\.com/);

  const automationReleaseCollectionRunRepository = read(path.join("src", "stores", "growth-learning-sqlite", "automation-release-collection-runs.js"));
  assert.match(automationReleaseCollectionRunRepository, /learning_growth_automation_release_collection_runs/);
  assert.match(automationReleaseCollectionRunRepository, /createLearningAutomationReleaseCollectionRunRepository/);
  assert.match(automationReleaseCollectionRunRepository, /summary_only/);
  assert.match(automationReleaseCollectionRunRepository, /scanPrivacyKeys/);
  assert.match(automationReleaseCollectionRunRepository, /scanPrivateValues/);
  assert.match(automationReleaseCollectionRunRepository, /PRIVATE_VALUE_PATTERN/);
  assert.match(automationReleaseCollectionRunRepository, /saveRun/);
  assert.match(automationReleaseCollectionRunRepository, /listRuns/);
  assert.match(automationReleaseCollectionRunRepository, /learning_automation_release_collection_run_privacy_class_required/);
  assert.match(automationReleaseCollectionRunRepository, /learning_automation_release_collection_run_status_invalid/);
  assert.doesNotMatch(automationReleaseCollectionRunRepository, /openai\.com/);

  const automationReleaseDecisionRepository = read(path.join("src", "stores", "growth-learning-sqlite", "automation-release-decisions.js"));
  assert.match(automationReleaseDecisionRepository, /learning_growth_automation_release_decisions/);
  assert.match(automationReleaseDecisionRepository, /createLearningAutomationReleaseDecisionRepository/);
  assert.match(automationReleaseDecisionRepository, /summary_only/);
  assert.match(automationReleaseDecisionRepository, /scanPrivacyKeys/);
  assert.match(automationReleaseDecisionRepository, /scanPrivateValues/);
  assert.match(automationReleaseDecisionRepository, /PRIVATE_VALUE_PATTERN/);
  assert.match(automationReleaseDecisionRepository, /saveDecision/);
  assert.match(automationReleaseDecisionRepository, /listDecisions/);
  assert.match(automationReleaseDecisionRepository, /learning_automation_release_decision_privacy_class_required/);
  assert.match(automationReleaseDecisionRepository, /learning_automation_release_decision_status_invalid/);
  assert.doesNotMatch(automationReleaseDecisionRepository, /openai\.com/);

  const automationReleasePackageRepository = read(path.join("src", "stores", "growth-learning-sqlite", "automation-release-packages.js"));
  assert.match(automationReleasePackageRepository, /learning_growth_automation_release_packages/);
  assert.match(automationReleasePackageRepository, /createLearningAutomationReleasePackageRepository/);
  assert.match(automationReleasePackageRepository, /summary_only/);
  assert.match(automationReleasePackageRepository, /scanPrivacyKeys/);
  assert.match(automationReleasePackageRepository, /scanPrivateValues/);
  assert.match(automationReleasePackageRepository, /PRIVATE_VALUE_PATTERN/);
  assert.match(automationReleasePackageRepository, /savePackage/);
  assert.match(automationReleasePackageRepository, /listPackages/);
  assert.match(automationReleasePackageRepository, /release_dashboard_summary_json/);
  assert.match(automationReleasePackageRepository, /releaseDashboardSummary/);
  assert.match(automationReleasePackageRepository, /learning_automation_release_package_privacy_class_required/);
  assert.match(automationReleasePackageRepository, /learning_automation_release_package_status_invalid/);
  assert.doesNotMatch(automationReleasePackageRepository, /openai\.com/);

  const automationReleaseWorkbenchActionAuditRepository = read(path.join("src", "stores", "growth-learning-sqlite", "automation-release-workbench-actions.js"));
  assert.match(automationReleaseWorkbenchActionAuditRepository, /learning_growth_automation_release_workbench_actions/);
  assert.match(automationReleaseWorkbenchActionAuditRepository, /createLearningAutomationReleaseWorkbenchActionAuditRepository/);
  assert.match(automationReleaseWorkbenchActionAuditRepository, /summary_only/);
  assert.match(automationReleaseWorkbenchActionAuditRepository, /scanPrivacyKeys/);
  assert.match(automationReleaseWorkbenchActionAuditRepository, /scanPrivateValues/);
  assert.match(automationReleaseWorkbenchActionAuditRepository, /PRIVATE_VALUE_PATTERN/);
  assert.match(automationReleaseWorkbenchActionAuditRepository, /saveActionAudit/);
  assert.match(automationReleaseWorkbenchActionAuditRepository, /listActionAudits/);
  assert.match(automationReleaseWorkbenchActionAuditRepository, /action_record_json/);
  assert.match(automationReleaseWorkbenchActionAuditRepository, /action_summary_json/);
  assert.match(automationReleaseWorkbenchActionAuditRepository, /learning_automation_release_workbench_action_audit_privacy_class_required/);
  assert.match(automationReleaseWorkbenchActionAuditRepository, /learning_automation_release_workbench_action_audit_status_invalid/);
  assert.doesNotMatch(automationReleaseWorkbenchActionAuditRepository, /openai\.com/);

  const automationReleasePreflightReportRepository = read(path.join("src", "stores", "growth-learning-sqlite", "automation-release-preflight-reports.js"));
  assert.match(automationReleasePreflightReportRepository, /learning_growth_automation_release_preflight_reports/);
  assert.match(automationReleasePreflightReportRepository, /createLearningAutomationReleasePreflightReportRepository/);
  assert.match(automationReleasePreflightReportRepository, /summary_only/);
  assert.match(automationReleasePreflightReportRepository, /scanPrivacyKeys/);
  assert.match(automationReleasePreflightReportRepository, /PRIVATE_VALUE_PATTERN/);
  assert.match(automationReleasePreflightReportRepository, /recordReport/);
  assert.match(automationReleasePreflightReportRepository, /listReports/);
  assert.match(automationReleasePreflightReportRepository, /release_preflight_json/);
  assert.match(automationReleasePreflightReportRepository, /release_dashboard_json/);
  assert.match(automationReleasePreflightReportRepository, /release_workbench_json/);
  assert.match(automationReleasePreflightReportRepository, /release_closure_json/);
  assert.match(automationReleasePreflightReportRepository, /learning_automation_release_preflight_report_privacy_class_required/);
  assert.match(automationReleasePreflightReportRepository, /learning_automation_release_preflight_report_status_invalid/);
  assert.doesNotMatch(automationReleasePreflightReportRepository, /openai\.com/);

  const automationReleaseApprovalRepository = read(path.join("src", "stores", "growth-learning-sqlite", "automation-release-approvals.js"));
  assert.match(automationReleaseApprovalRepository, /learning_growth_automation_release_approvals/);
  assert.match(automationReleaseApprovalRepository, /createLearningAutomationReleaseApprovalRepository/);
  assert.match(automationReleaseApprovalRepository, /summary_only/);
  assert.match(automationReleaseApprovalRepository, /scanPrivacyKeys/);
  assert.match(automationReleaseApprovalRepository, /PRIVATE_VALUE_PATTERN/);
  assert.match(automationReleaseApprovalRepository, /saveApproval/);
  assert.match(automationReleaseApprovalRepository, /listApprovals/);
  assert.match(automationReleaseApprovalRepository, /learning_automation_release_approval_privacy_class_required/);
  assert.match(automationReleaseApprovalRepository, /learning_automation_release_approval_status_invalid/);
  assert.doesNotMatch(automationReleaseApprovalRepository, /openai\.com/);

  const automationReleaseEvidenceRepository = read(path.join("src", "stores", "growth-learning-sqlite", "automation-release-evidence.js"));
  assert.match(automationReleaseEvidenceRepository, /learning_growth_automation_release_evidence/);
  assert.match(automationReleaseEvidenceRepository, /createLearningAutomationReleaseEvidenceRepository/);
  assert.match(automationReleaseEvidenceRepository, /summary_only/);
  assert.match(automationReleaseEvidenceRepository, /scanPrivacy/);
  assert.match(automationReleaseEvidenceRepository, /PRIVATE_VALUE_PATTERN/);
  assert.match(automationReleaseEvidenceRepository, /saveEvidence/);
  assert.match(automationReleaseEvidenceRepository, /listEvidence/);
  assert.match(automationReleaseEvidenceRepository, /learning_automation_release_evidence_privacy_class_required/);
  assert.match(automationReleaseEvidenceRepository, /learning_automation_release_evidence_status_invalid/);
  assert.doesNotMatch(automationReleaseEvidenceRepository, /openai\.com/);

  const automationReleaseActivationRepository = read(path.join("src", "stores", "growth-learning-sqlite", "automation-release-activations.js"));
  assert.match(automationReleaseActivationRepository, /learning_growth_automation_release_activations/);
  assert.match(automationReleaseActivationRepository, /createLearningAutomationReleaseActivationRepository/);
  assert.match(automationReleaseActivationRepository, /summary_only/);
  assert.match(automationReleaseActivationRepository, /scanPrivacyKeys/);
  assert.match(automationReleaseActivationRepository, /scanPrivateValues/);
  assert.match(automationReleaseActivationRepository, /PRIVATE_VALUE_PATTERN/);
  assert.match(automationReleaseActivationRepository, /saveActivation/);
  assert.match(automationReleaseActivationRepository, /listActivations/);
  assert.match(automationReleaseActivationRepository, /learning_automation_release_activation_privacy_class_required/);
  assert.match(automationReleaseActivationRepository, /learning_automation_release_activation_no_runtime_change_required/);
  assert.match(automationReleaseActivationRepository, /learning_automation_release_activation_status_invalid/);
  assert.doesNotMatch(automationReleaseActivationRepository, /openai\.com/);

  const automationRuntimeEnablementRepository = read(path.join("src", "stores", "growth-learning-sqlite", "automation-runtime-enablements.js"));
  assert.match(automationRuntimeEnablementRepository, /learning_growth_automation_runtime_enablements/);
  assert.match(automationRuntimeEnablementRepository, /createLearningAutomationRuntimeEnablementRepository/);
  assert.match(automationRuntimeEnablementRepository, /summary_only/);
  assert.match(automationRuntimeEnablementRepository, /scanPrivacyKeys/);
  assert.match(automationRuntimeEnablementRepository, /scanPrivateValues/);
  assert.match(automationRuntimeEnablementRepository, /PRIVATE_VALUE_PATTERN/);
  assert.match(automationRuntimeEnablementRepository, /saveEnablement/);
  assert.match(automationRuntimeEnablementRepository, /listEnablements/);
  assert.match(automationRuntimeEnablementRepository, /learning_automation_runtime_enablement_privacy_class_required/);
  assert.match(automationRuntimeEnablementRepository, /learning_automation_runtime_enablement_no_runtime_change_required/);
  assert.match(automationRuntimeEnablementRepository, /learning_automation_runtime_enablement_status_invalid/);
  assert.doesNotMatch(automationRuntimeEnablementRepository, /openai\.com/);

  const automationFailurePolicyRepository = read(path.join("src", "stores", "growth-learning-sqlite", "automation-failure-policies.js"));
  assert.match(automationFailurePolicyRepository, /learning_growth_automation_failure_policies/);
  assert.match(automationFailurePolicyRepository, /createLearningAutomationFailurePolicyRepository/);
  assert.match(automationFailurePolicyRepository, /summary_only/);
  assert.match(automationFailurePolicyRepository, /scanPrivacyKeys/);
  assert.match(automationFailurePolicyRepository, /PRIVATE_VALUE_PATTERN/);
  assert.match(automationFailurePolicyRepository, /learning_automation_failure_policy_privacy_class_required/);
  assert.match(automationFailurePolicyRepository, /reviewPolicy/);
  assert.match(automationFailurePolicyRepository, /getPolicy/);
  assert.match(automationFailurePolicyRepository, /learning_automation_failure_policy_status_invalid/);
  assert.doesNotMatch(automationFailurePolicyRepository, /openai\.com/);

  const cardGenerationContext = read(path.join("src", "services", "learning-card-generation-context-service.js"));
  assert.match(cardGenerationContext, /planAuditService\.listPlanDrafts/);
  assert.match(cardGenerationContext, /publicPlanAuditItem/);
  assert.match(cardGenerationContext, /planAudit: ownerAudit\.planAudit/);
  assert.doesNotMatch(cardGenerationContext, /learning_growth_plan_drafts/);

  const plannerContextService = read(path.join("src", "services", "learning-planner-context-service.js"));
  assert.match(plannerContextService, /growth\.learningPlanner\.input\.v1/);
  assert.match(plannerContextService, /stageAssessmentService/);
  assert.match(plannerContextService, /stageReadiness/);
  assert.match(plannerContextService, /ownerReviewSignalService/);
  assert.match(plannerContextService, /growth\.learningOwnerReviewSignal\.v1/);
  assert.match(plannerContextService, /staleEvidence: profile\.staleEvidence/);
  assert.match(plannerContextService, /noFullChildAnswers/);
  assert.doesNotMatch(plannerContextService, /rawAnswer/);
  assert.doesNotMatch(plannerContextService, /ownerNote/);
  assert.doesNotMatch(plannerContextService, /evaluateEligibility/);

  const ownerReviewSignalService = read(path.join("src", "services", "learning-owner-review-signal-service.js"));
  assert.match(ownerReviewSignalService, /growth\.learningOwnerReviewSignal\.v1/);
  assert.match(ownerReviewSignalService, /repository\.listReviews/);
  assert.match(ownerReviewSignalService, /summary_only/);
  assert.match(ownerReviewSignalService, /plannerSignal/);
  assert.doesNotMatch(ownerReviewSignalService, /recordReview/);
  assert.doesNotMatch(ownerReviewSignalService, /review\(/);
  assert.doesNotMatch(ownerReviewSignalService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(ownerReviewSignalService, /generateCard|evaluateSubmission|publishPlanItem|activateStageAssessment|executeOnce|runOnce|deliverHandoff/);

  const plannerGateway = read(path.join("src", "services", "growth-gateway-planner-client.js"));
  assert.match(plannerGateway, /growth\.learning_planner\.draft/);
  assert.doesNotMatch(plannerGateway, /openai\.com/);
  assert.doesNotMatch(plannerGateway, /anthropic/);
  assert.doesNotMatch(plannerGateway, /deepseek/);

  assert.match(cardGenerationContext, /ownerAuditForPlan/);
  assert.match(cardGenerationContext, /profileDeltaAuditService\.listProfileDeltas/);
  assert.match(cardGenerationContext, /ownerCorrectionService\.listCorrections/);
  assert.match(cardGenerationContext, /publicProfileDeltaAuditItem/);
  assert.match(cardGenerationContext, /publicProfileCorrectionItem/);
  assert.doesNotMatch(cardGenerationContext, /learning_growth_profile_delta_audits/);
  assert.doesNotMatch(cardGenerationContext, /rawTranscript:/);

  const planValidation = read(path.join("src", "services", "learning-plan-validation-service.js"));
  assert.match(planValidation, /daily_score_once/);
  assert.match(planValidation, /daily_pass_score_required_forbidden/);
  assert.match(planValidation, /weekly_stage_assessment_forbidden/);
  assert.match(planValidation, /stage_assessment_activation_policy_required/);

  const planPublisher = read(path.join("src", "services", "learning-plan-publisher-service.js"));
  assert.match(planPublisher, /publishPlanItem/);
  assert.match(planPublisher, /markPublishAttempt/);
  assert.match(planPublisher, /publishUnavailable/);
  assert.match(planPublisher, /cardGenerationService\.generateCard/);
  assert.match(planPublisher, /stage_assessment_activation_required/);
  assert.match(planPublisher, /learning_plan_draft_not_found/);

  const graphRepository = read(path.join("src", "stores", "growth-learning-sqlite", "graph-repository.js"));
  assert.match(graphRepository, /domainPackIdForNode/);
  assert.match(graphRepository, /lower\(domainPack\.domain\) === nodeDomain/);

  const graphPlanService = read(path.join("src", "services", "learning-graph-plan-service.js"));
  assert.match(graphPlanService, /domainPackId: cleanString\(targetNode\.domainPackId\)/);
  assert.match(graphPlanService, /subject: cleanString\(targetNode\.subject\)/);

  const cardAuthoringPublisher = read(path.join("src", "stores", "growth-learning-sqlite", "card-authoring-publisher.js"));
  assert.match(cardAuthoringPublisher, /domainPackId: cleanString\(learningGraphPlan\.domainPackId/);

  const aiLoopHarness = read(path.join("tests", "learning-card-ai-loop-harness.test.js"));
  assert.match(aiLoopHarness, /createLearningTargetProvisioningService/);
  assert.match(aiLoopHarness, /provisioned non-sample science operating loop/);
  assert.match(aiLoopHarness, /learning_target_not_provisioned/);

  const targetProvisioning = read(path.join("src", "services", "learning-target-provisioning-service.js"));
  assert.match(targetProvisioning, /resolveSelection/);
  assert.match(targetProvisioning, /provisionDomainPack/);
  assert.match(targetProvisioning, /learning_target_not_provisioned/);
  assert.doesNotMatch(targetProvisioning, /rawAnswer/);

  const recommendationLifecycle = read(path.join("src", "services", "learning-recommendation-lifecycle-service.js"));
  assert.match(recommendationLifecycle, /listLifecycle/);
  assert.match(recommendationLifecycle, /reviewRecommendation/);
  assert.match(recommendationLifecycle, /listRecentTrajectory/);
  assert.match(recommendationLifecycle, /markTrajectoryRecommendationReviewed/);
  assert.match(recommendationLifecycle, /growth\.recommendationLifecycle\.v1/);
  assert.match(recommendationLifecycle, /privacyClass: "summary_only"/);
  assert.match(recommendationLifecycle, /writesPerformed: false/);
  assert.match(recommendationLifecycle, /writesPerformed: true/);
  assert.match(recommendationLifecycle, /recommendation_lifecycle_review_status_invalid/);
  assert.doesNotMatch(recommendationLifecycle, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(recommendationLifecycle, /recordCardTrajectory|markTrajectoryRecommendationAccepted/);
  assert.doesNotMatch(recommendationLifecycle, /learning_growth_card_trajectories/);
  assert.doesNotMatch(recommendationLifecycle, /rawAnswer:/);
  assert.doesNotMatch(recommendationLifecycle, /rawPrompt:/);

  const masteryProfileRepository = read(path.join("src", "stores", "growth-learning-sqlite", "mastery-profile.js"));
  assert.match(masteryProfileRepository, /listRecentTrajectory/);
  assert.match(masteryProfileRepository, /map\(publicTrajectory\)/);

  const ownerCorrection = read(path.join("src", "services", "learning-owner-correction-service.js"));
  assert.match(ownerCorrection, /recordCorrection/);
  assert.match(ownerCorrection, /listCorrections/);
  assert.match(ownerCorrection, /owner_reviewed_correction/);
  assert.match(ownerCorrection, /targetProvisioningService\.resolveSelection/);
  assert.match(ownerCorrection, /evidenceLedgerService\.writeEvidence/);
  assert.match(ownerCorrection, /learning_owner_correction_privacy_failed/);
  assert.doesNotMatch(ownerCorrection, /learning_growth_evidence_ledger/);
  assert.doesNotMatch(ownerCorrection, /rawAnswer:/);
  assert.doesNotMatch(planPublisher, /draftLearningPlan/);
});

test("Growth reference contract stays service-owned and summary-only", () => {
  const services = read(path.join("src", "app", "services.js"));
  assert.match(services, /createLearningReferenceContractService/);
  assert.match(services, /learningReferenceContractService/);
  assert.match(services, /learningReferenceProjectionRepository/);
  assert.match(services, /profileFeedbackService: learningProfileFeedbackEvidenceService/);
  assert.match(services, /referenceContractService: learningReferenceContractService/);

  const store = read(path.join("src", "stores", "growth-learning-sqlite-store.js"));
  assert.match(store, /createLearningReferenceProjectionRepository/);
  assert.match(store, /learningReferenceProjectionRepository/);

  const referenceService = read(path.join("src", "services", "learning-reference-contract-service.js"));
  assert.match(referenceService, /growth\.referenceObject\.v1/);
  assert.match(referenceService, /growth\.referenceSummary\.v1/);
  assert.match(referenceService, /profile_feedback/);
  assert.match(referenceService, /profileFeedbackService\.evaluate/);
  assert.match(referenceService, /summary_only/);
  assert.doesNotMatch(referenceService, /raw_json/);
  assert.doesNotMatch(referenceService, /answerText/);
  assert.doesNotMatch(referenceService, /transcript/);

  const routes = read(path.join("src", "routes", "growth-routes.js"));
  assert.match(routes, /references\/object-types/);
  assert.match(routes, /referenceGet/);
  assert.match(routes, /referenceSummarize/);
  assert.doesNotMatch(routes, /learningReferenceProjectionRepository/);
  assert.doesNotMatch(routes, /learning_task_submissions/);
  assert.doesNotMatch(routes, /learning_evaluations/);

  const mcp = read(path.join("src", "mcp", "growth-mcp-schemas.js"));
  assert.match(mcp, /growth\.reference_object_types/);
  assert.match(mcp, /growth\.reference_get/);
  assert.match(mcp, /growth\.reference_summarize/);
  assert.doesNotMatch(mcp, /learningReferenceProjectionRepository/);
});

test("Growth release-readiness smoke CLI stays service-owned and non-writeful by default", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:release-readiness/);
  assert.match(packageJson, /smoke-growth-release-readiness\.js/);

  const script = read(path.join("scripts", "smoke-growth-release-readiness.js"));
  assert.match(script, /readEnv/);
  assert.match(script, /createServices/);
  assert.match(script, /learningAutomationReleaseReadinessService/);
  assert.match(script, /evaluateReadiness/);
  assert.match(script, /createSnapshot/);
  assert.match(script, /shouldWriteSnapshot/);
  assert.match(script, /--write-snapshot/);
  assert.match(script, /growth\.learningAutomationReleaseEvidenceBundle\.v1/);
  assert.match(script, /--evidence-bundle-file/);
  assert.match(script, /--evidence-bundle-json/);
  assert.match(script, /evidenceBundleReadbackFromArgs/);
  assert.match(script, /release_readiness_smoke_bundle_privacy_failed/);
  assert.match(script, /--stage-checkpoint-controls-evidence/);
  assert.match(script, /--automation-digest-ui-evidence/);
  assert.match(script, /--release-package-review-ui-evidence/);
  assert.match(script, /--production-proposal-smoke-evidence/);
  assert.match(script, /--automation-action-handoff-ui-evidence/);
  assert.match(script, /--scheduler-execution-ui-evidence/);
  assert.match(script, /--scheduler-run-ui-evidence/);
  assert.match(script, /--scheduler-worker-target-ui-evidence/);
  assert.match(script, /--production-action-handoff-smoke-evidence/);
  assert.match(script, /--production-scheduler-execution-smoke-evidence/);
  assert.match(script, /--production-scheduler-run-smoke-evidence/);
  assert.match(script, /--production-scheduler-worker-target-smoke-evidence/);
  assert.match(script, /--production-scheduler-worker-smoke-evidence/);
  assert.match(script, /--production-planner-readiness-evidence/);
  assert.match(script, /--production-target-provisioning-smoke-evidence/);
  assert.match(script, /--production-recommendation-lifecycle-smoke-evidence/);
  assert.match(script, /--production-daily-loop-preview-smoke-evidence/);
  assert.match(script, /--production-cycle-history-smoke-evidence/);
  assert.match(script, /--production-daily-loop-write-smoke-evidence/);
  assert.match(script, /--production-learner-cycle-smoke-evidence/);
  assert.match(script, /--production-scheduler-dry-run-smoke-evidence/);
  assert.match(script, /--release-evidence-bundle-audit/);
  assert.match(script, /--platform-action-evidence/);
  assert.match(script, /--production-deployment-health-evidence/);
  assert.match(script, /workspace_id_required/);
  assert.match(script, /release_readiness_smoke_invalid_json/);
  assert.match(script, /deprecatedUiEvidenceFlag/);
  assert.match(script, /deprecatedReleaseEvidenceFlag/);
  assert.match(script, /DEPRECATED_RELEASE_EVIDENCE_FLAGS/);
  assert.match(script, /validated_\$\{checkKey\}_required/);
  assert.match(script, /validated_ui_evidence_summary_required/);
  assert.match(script, /release_workbench_smoke_evidence/);
  assert.match(script, /release_readiness_smoke_flag_deprecated/);
  [
    "ownerDailyUiEvidence",
    "ownerAuditUiEvidence",
    "stageCheckpointEvidence",
    "stageCheckpointControlsEvidence",
    "productionProposalSmokeEvidence",
    "releasePackageReviewUiEvidence",
    "automationDigestUiEvidence",
    "productionActionHandoffSmokeEvidence",
    "productionSchedulerExecutionSmokeEvidence",
    "productionSchedulerRunSmokeEvidence",
    "productionSchedulerWorkerTargetSmokeEvidence",
    "productionSchedulerWorkerSmokeEvidence",
    "productionPlannerReadinessEvidence",
    "productionTargetProvisioningSmokeEvidence",
    "productionDailyLoopPreviewSmokeEvidence",
    "productionLearningLoopStateSmokeEvidence",
    "productionOperatingLoopHistorySmokeEvidence",
    "productionCycleHistorySmokeEvidence",
    "productionOwnerAuditSmokeEvidence",
    "productionOwnerAuditReviewSmokeEvidence",
    "productionProfileFeedbackSmokeEvidence",
    "productionRecommendationLifecycleSmokeEvidence",
    "productionDailyLoopWriteSmokeEvidence",
    "productionLearnerCycleSmokeEvidence",
    "productionSchedulerDryRunSmokeEvidence",
    "releaseEvidenceBundleAudit",
    "platformActionEvidence",
    "productionDeploymentHealthEvidence",
    "centralVisualEvidence",
    "releaseWorkbenchSmokeEvidence",
    "ownerReviewEvidence"
  ].forEach((evidenceKey) => {
    assert.doesNotMatch(script, new RegExp(`${evidenceKey}\\s*=\\s*\\{\\s*ok:\\s*true,\\s*source:\\s*"release_readiness_smoke_flag"`));
  });
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_automation_release_readiness/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /learningDailyLoopService/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /publishAcceptedProposal/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /executeOnce/);
  assert.doesNotMatch(script, /runOnce/);
  assert.doesNotMatch(script, /learningAutomationSchedulerService|schedulerService\.dryRun/);
  assert.doesNotMatch(script, /deliverHandoff/);
  assert.doesNotMatch(script, /activateStageAssessment/);

  const recommendationLifecycleSmoke = read(path.join("scripts", "smoke-growth-recommendation-lifecycle.js"));
  assert.match(recommendationLifecycleSmoke, /learningRecommendationLifecycleService/);
  assert.match(recommendationLifecycleSmoke, /listLifecycle/);
  assert.match(recommendationLifecycleSmoke, /recommendation_lifecycle_smoke_write_not_supported/);
  assert.match(recommendationLifecycleSmoke, /workspace_id_required/);
  assert.doesNotMatch(recommendationLifecycleSmoke, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(recommendationLifecycleSmoke, /learning_growth_/);
  assert.doesNotMatch(recommendationLifecycleSmoke, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(recommendationLifecycleSmoke, /recordCardTrajectory|markTrajectoryRecommendationAccepted|generateCard|evaluateSubmission/);

  const scriptHarness = read(path.join("tests", "growth-release-readiness-smoke-script.test.js"));
  assert.match(scriptHarness, /without writing a snapshot by default/);
  assert.match(scriptHarness, /writes summary-only snapshots only when requested/);
  assert.match(scriptHarness, /releaseReview\.requiredActions/);
  assert.match(scriptHarness, /releaseReview\.nextAction/);
  assert.match(scriptHarness, /accepts versioned evidence bundle files/);
  assert.match(scriptHarness, /evidenceBundleReadback/);
  assert.match(scriptHarness, /blocks deprecated UI evidence flags/);
  assert.match(scriptHarness, /accepts validator UI evidence summaries through evidence JSON/);
  assert.match(scriptHarness, /fails closed for privacy-risk evidence bundle input/);
  assert.match(scriptHarness, /stageCheckpointControlsEvidence/);
  assert.match(scriptHarness, /automationDigestUiEvidence/);
  assert.match(scriptHarness, /releasePackageReviewUiEvidence/);
  assert.match(scriptHarness, /productionProposalSmokeEvidence/);
  assert.match(scriptHarness, /automationActionHandoffUiEvidence/);
  assert.match(scriptHarness, /schedulerExecutionUiEvidence/);
  assert.match(scriptHarness, /schedulerRunUiEvidence/);
  assert.match(scriptHarness, /schedulerWorkerTargetUiEvidence/);
  assert.match(scriptHarness, /productionActionHandoffSmokeEvidence/);
  assert.match(scriptHarness, /productionSchedulerExecutionSmokeEvidence/);
  assert.match(scriptHarness, /productionSchedulerRunSmokeEvidence/);
  assert.match(scriptHarness, /productionSchedulerWorkerTargetSmokeEvidence/);
  assert.match(scriptHarness, /productionSchedulerWorkerSmokeEvidence/);
  assert.match(scriptHarness, /productionPlannerReadinessEvidence/);
  assert.match(scriptHarness, /productionTargetProvisioningSmokeEvidence/);
  assert.match(scriptHarness, /productionDailyLoopPreviewSmokeEvidence/);
  assert.match(scriptHarness, /productionLearningLoopStateSmokeEvidence/);
  assert.match(scriptHarness, /productionOperatingLoopHistorySmokeEvidence/);
  assert.match(scriptHarness, /productionCycleHistorySmokeEvidence/);
  assert.match(scriptHarness, /productionOwnerAuditSmokeEvidence/);
  assert.match(scriptHarness, /productionOwnerAuditReviewSmokeEvidence/);
  assert.match(scriptHarness, /productionRecommendationLifecycleSmokeEvidence/);
  assert.match(scriptHarness, /productionDailyLoopWriteSmokeEvidence/);
  assert.match(scriptHarness, /productionLearnerCycleSmokeEvidence/);
  assert.match(scriptHarness, /productionSchedulerDryRunSmokeEvidence/);
  assert.match(scriptHarness, /releaseEvidenceBundleAudit/);
  assert.match(scriptHarness, /platformActionEvidence/);
  assert.match(scriptHarness, /productionDeploymentHealthEvidence/);
  assert.match(scriptHarness, /ownerReviewEvidence/);
  assert.match(scriptHarness, /fails closed for privacy-risk evidence input/);

  const releaseReadinessService = read(path.join("src", "services", "learning-automation-release-readiness-service.js"));
  const evidenceOkBody = releaseReadinessService.match(/function evidenceOk[\s\S]*?\n}\n\nfunction releaseEvidenceObjectPasses/)[0];
  const releaseEvidenceObjectPassesBody = releaseReadinessService.match(/function releaseEvidenceObjectPasses[\s\S]*?\n}\n\nfunction evidenceValue/)[0];
  assert.doesNotMatch(evidenceOkBody, /value === true/);
  assert.match(releaseEvidenceObjectPassesBody, /isSummaryOnlyEvidence\(value\)/);
  assert.match(releaseReadinessService, /validated_release_evidence_object_required/);
  assert.match(releaseReadinessService, /release_evidence_summary_only_required/);
  assert.match(releaseReadinessService, /function releaseApproved[\s\S]*?value === true/);
  assert.match(releaseReadinessService, /buildReleaseReview/);
  assert.match(releaseReadinessService, /buildEvidenceReadback/);
  assert.match(releaseReadinessService, /UI_EVIDENCE_SCHEMA/);
  assert.match(releaseReadinessService, /uiEvidenceSummaryValidation/);
  assert.match(releaseReadinessService, /uiEvidenceCheck/);
  assert.match(releaseReadinessService, /provide_validated_ui_evidence_summary/);
  assert.match(releaseReadinessService, /uiEvidenceValidated/);
  assert.match(releaseReadinessService, /evidenceReadback/);
  assert.match(releaseReadinessService, /requiredActions/);
  assert.match(releaseReadinessService, /missingEvidenceKeys/);
  assert.match(releaseReadinessService, /blockedCheckKeys/);
  assert.match(releaseReadinessService, /resolve_blocked_release_readiness_check/);
  assert.match(releaseReadinessService, /automationDigestUiEvidence/);
  assert.match(releaseReadinessService, /automation_digest_ui_evidence/);
  assert.match(releaseReadinessService, /complete_automation_digest_ui/);
  assert.match(releaseReadinessService, /releasePackageReviewUiEvidence/);
  assert.match(releaseReadinessService, /release_package_review_ui_evidence/);
  assert.match(releaseReadinessService, /complete_release_package_review_ui/);
  assert.match(releaseReadinessService, /productionProposalSmokeEvidence/);
  assert.match(releaseReadinessService, /production_proposal_smoke_evidence/);
  assert.match(releaseReadinessService, /run_production_proposal_smoke/);
  assert.match(releaseReadinessService, /automationActionHandoffUiEvidence/);
  assert.match(releaseReadinessService, /automation_action_handoff_ui_evidence/);
  assert.match(releaseReadinessService, /complete_automation_action_handoff_ui/);
  assert.match(releaseReadinessService, /schedulerExecutionUiEvidence/);
  assert.match(releaseReadinessService, /scheduler_execution_ui_evidence/);
  assert.match(releaseReadinessService, /complete_scheduler_execution_ui/);
  assert.match(releaseReadinessService, /schedulerRunUiEvidence/);
  assert.match(releaseReadinessService, /scheduler_run_ui_evidence/);
  assert.match(releaseReadinessService, /complete_scheduler_run_ui/);
  assert.match(releaseReadinessService, /schedulerWorkerTargetUiEvidence/);
  assert.match(releaseReadinessService, /scheduler_worker_target_ui_evidence/);
  assert.match(releaseReadinessService, /complete_scheduler_worker_target_ui/);
  assert.match(releaseReadinessService, /productionActionHandoffSmokeEvidence/);
  assert.match(releaseReadinessService, /production_action_handoff_smoke_evidence/);
  assert.match(releaseReadinessService, /run_production_action_handoff_smoke/);
  assert.match(releaseReadinessService, /productionSchedulerExecutionSmokeEvidence/);
  assert.match(releaseReadinessService, /production_scheduler_execution_smoke_evidence/);
  assert.match(releaseReadinessService, /run_production_scheduler_execution_smoke/);
  assert.match(releaseReadinessService, /productionSchedulerRunSmokeEvidence/);
  assert.match(releaseReadinessService, /production_scheduler_run_smoke_evidence/);
  assert.match(releaseReadinessService, /run_production_scheduler_run_smoke/);
  assert.match(releaseReadinessService, /productionSchedulerWorkerTargetSmokeEvidence/);
  assert.match(releaseReadinessService, /production_scheduler_worker_target_smoke_evidence/);
  assert.match(releaseReadinessService, /run_production_scheduler_worker_target_smoke/);
  assert.match(releaseReadinessService, /productionSchedulerWorkerSmokeEvidence/);
  assert.match(releaseReadinessService, /production_scheduler_worker_smoke_evidence/);
  assert.match(releaseReadinessService, /run_production_scheduler_worker_smoke/);
  assert.match(releaseReadinessService, /productionPlannerReadinessEvidence/);
  assert.match(releaseReadinessService, /production_planner_readiness_evidence/);
  assert.match(releaseReadinessService, /run_production_planner_readiness_smoke/);
  assert.match(releaseReadinessService, /productionTargetProvisioningSmokeEvidence/);
  assert.match(releaseReadinessService, /production_target_provisioning_smoke_evidence/);
  assert.match(releaseReadinessService, /run_production_target_provisioning_smoke/);
  assert.match(releaseReadinessService, /productionRecommendationLifecycleSmokeEvidence/);
  assert.match(releaseReadinessService, /production_recommendation_lifecycle_smoke_evidence/);
  assert.match(releaseReadinessService, /run_production_recommendation_lifecycle_smoke/);
  assert.match(releaseReadinessService, /productionDailyLoopPreviewSmokeEvidence/);
  assert.match(releaseReadinessService, /production_daily_loop_preview_smoke_evidence/);
  assert.match(releaseReadinessService, /run_production_daily_loop_preview_smoke/);
  assert.match(releaseReadinessService, /productionLearningLoopStateSmokeEvidence/);
  assert.match(releaseReadinessService, /production_learning_loop_state_smoke_evidence/);
  assert.match(releaseReadinessService, /run_production_learning_loop_state_smoke/);
  assert.match(releaseReadinessService, /productionOperatingLoopHistorySmokeEvidence/);
  assert.match(releaseReadinessService, /production_operating_loop_history_smoke_evidence/);
  assert.match(releaseReadinessService, /run_production_operating_loop_history_smoke/);
  assert.match(releaseReadinessService, /productionCycleHistorySmokeEvidence/);
  assert.match(releaseReadinessService, /production_cycle_history_smoke_evidence/);
  assert.match(releaseReadinessService, /run_production_cycle_history_smoke/);
  assert.match(releaseReadinessService, /productionOwnerAuditSmokeEvidence/);
  assert.match(releaseReadinessService, /production_owner_audit_smoke_evidence/);
  assert.match(releaseReadinessService, /run_production_owner_audit_smoke/);
  assert.match(releaseReadinessService, /ownerAuditReviewEvidenceCheck/);
  assert.match(releaseReadinessService, /ownerAuditReviewSummary/);
  assert.match(releaseReadinessService, /ownerAuditReviewSummaryPresent/);
  assert.match(releaseReadinessService, /productionOwnerAuditReviewSmokeEvidence/);
  assert.match(releaseReadinessService, /production_owner_audit_review_smoke_evidence/);
  assert.match(releaseReadinessService, /run_production_owner_audit_review_smoke/);
  assert.match(releaseReadinessService, /owner_audit_review_summary_required/);
  assert.match(releaseReadinessService, /record_owner_audit_review_and_rerun_smoke/);
  assert.match(releaseReadinessService, /productionDailyLoopWriteSmokeEvidence/);
  assert.match(releaseReadinessService, /production_daily_loop_write_smoke_evidence/);
  assert.match(releaseReadinessService, /run_controlled_daily_loop_write_smoke/);
  assert.match(releaseReadinessService, /productionLearnerCycleSmokeEvidence/);
  assert.match(releaseReadinessService, /production_learner_cycle_smoke_evidence/);
  assert.match(releaseReadinessService, /run_production_learner_cycle_smoke/);
  assert.match(releaseReadinessService, /productionSchedulerDryRunSmokeEvidence/);
  assert.match(releaseReadinessService, /production_scheduler_dry_run_smoke_evidence/);
  assert.match(releaseReadinessService, /run_production_scheduler_dry_run_smoke/);
  assert.match(releaseReadinessService, /releaseEvidenceBundleAudit/);
  assert.match(releaseReadinessService, /release_evidence_bundle_audit/);
  assert.match(releaseReadinessService, /run_release_evidence_bundle_audit/);
  assert.match(releaseReadinessService, /platformActionEvidence/);
  assert.match(releaseReadinessService, /platform_action_evidence/);
  assert.match(releaseReadinessService, /attach_platform_action_evidence/);
  assert.match(releaseReadinessService, /productionDeploymentHealthEvidence/);
  assert.match(releaseReadinessService, /production_deployment_health/);
  assert.match(releaseReadinessService, /productionDeploymentEvidenceCheck/);
  assert.match(releaseReadinessService, /provide_validated_production_deployment_health_evidence/);
  assert.match(releaseReadinessService, /releaseWorkbenchSmokeEvidence/);
  assert.match(releaseReadinessService, /release_workbench_smoke_evidence/);
  assert.match(releaseReadinessService, /run_release_workbench_readback_smoke/);
  assert.match(releaseReadinessService, /evidenceProvided/);
  assert.match(releaseReadinessService, /evidenceFailureReason/);
  assert.match(releaseReadinessService, /invalidReason/);
  assert.match(releaseReadinessService, /ownerReviewEvidenceCheck/);
  assert.match(releaseReadinessService, /ownerReviewStageSummary/);
  assert.match(releaseReadinessService, /ownerReviewStageSummaryPresent/);
  assert.match(releaseReadinessService, /digestRequiredActionCount/);
  assert.match(releaseReadinessService, /blockedActionHandoffCount/);
  assert.match(releaseReadinessService, /publishedSchedulerExecutionCount/);
  assert.match(releaseReadinessService, /completedSchedulerRunCount/);
  assert.match(releaseReadinessService, /pendingWorkerTargetReviewCount/);
  assert.match(releaseReadinessService, /ownerReviewEvidence/);
  assert.match(releaseReadinessService, /owner_review_evidence/);
  assert.match(releaseReadinessService, /run_owner_review_evidence_smoke/);
  assert.doesNotMatch(releaseReadinessService, /learningDailyLoopService/);
  assert.doesNotMatch(releaseReadinessService, /publishPlanItem/);
  assert.doesNotMatch(releaseReadinessService, /generateCard/);
});

test("Growth release evidence bundle builder stays service-owned and write-gated", () => {
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(
    packageJson.scripts["smoke:release-evidence-bundle"],
    "node scripts/build-growth-release-evidence-bundle.js"
  );
  assert.equal(
    packageJson.scripts["smoke:platform-action-evidence"],
    "node scripts/smoke-growth-platform-action-evidence.js"
  );
  assert.equal(
    packageJson.scripts["smoke:central-visual-evidence"],
    "node scripts/smoke-growth-central-visual-evidence.js"
  );
  assert.equal(
    packageJson.scripts["smoke:production-deployment-evidence"],
    "node scripts/smoke-growth-production-deployment-evidence.js"
  );
  assert.equal(
    packageJson.scripts["smoke:ui-evidence"],
    "node scripts/smoke-growth-ui-evidence.js"
  );
  assert.equal(
    packageJson.scripts["smoke:release-evidence-bundle-audit"],
    "node scripts/smoke-growth-release-evidence-bundle-audit.js"
  );
  assert.equal(
    packageJson.scripts["smoke:release-evidence"],
    "node scripts/smoke-growth-automation-release-evidence.js"
  );
  assert.equal(
    packageJson.scripts["smoke:release-collection-run"],
    "node scripts/smoke-growth-release-collection-run.js"
  );
  assert.equal(
    packageJson.scripts["smoke:release-decision"],
    "node scripts/smoke-growth-release-decision.js"
  );
  assert.equal(
    packageJson.scripts["smoke:release-review"],
    "node scripts/smoke-growth-release-review.js"
  );
  assert.equal(
    packageJson.scripts["smoke:release-authorization"],
    "node scripts/smoke-growth-release-authorization.js"
  );
  assert.equal(
    packageJson.scripts["smoke:release-closure"],
    "node scripts/smoke-growth-release-closure.js"
  );
  assert.equal(
    packageJson.scripts["smoke:release-activation"],
    "node scripts/smoke-growth-release-activation.js"
  );
  assert.equal(
    packageJson.scripts["smoke:runtime-enablement"],
    "node scripts/smoke-growth-runtime-enablement.js"
  );
  assert.equal(
    packageJson.scripts["smoke:release-controls"],
    "node scripts/smoke-growth-release-controls.js"
  );
  assert.equal(
    packageJson.scripts["smoke:release-dashboard"],
    "node scripts/smoke-growth-release-dashboard.js"
  );
  assert.equal(
    packageJson.scripts["smoke:release-workbench"],
    "node scripts/smoke-growth-release-workbench.js"
  );
  assert.equal(
    packageJson.scripts["smoke:release-preflight"],
    "node scripts/smoke-growth-release-preflight.js"
  );
  assert.equal(
    packageJson.scripts["smoke:release-artifact-template"],
    "node scripts/smoke-growth-release-artifact-template.js"
  );
  assert.equal(
    packageJson.scripts["smoke:release-workbench-action"],
    "node scripts/smoke-growth-release-workbench-action.js"
  );
  assert.equal(
    packageJson.scripts["smoke:release-inventory"],
    "node scripts/smoke-growth-release-inventory.js"
  );
  const architectureDoc = read(path.join("docs", "GROWTH_PLUGIN_ARCHITECTURE.md"));
  const operationalRowMatch = architectureDoc.match(/\| Operational smoke scripts \|.+?\| CLI-only evidence collectors/s);
  assert.ok(operationalRowMatch, "architecture doc must keep the operational smoke scripts row");
  const operationalRow = operationalRowMatch[0];
  for (const scriptName of [
    "scripts/smoke-growth-release-evidence-bundle-audit.js",
    "scripts/build-growth-release-evidence-bundle.js",
    "scripts/build-growth-release-package.js",
    "scripts/smoke-growth-release-readiness.js",
    "scripts/smoke-growth-automation-release-evidence.js",
    "scripts/smoke-growth-release-collection-run.js",
    "scripts/smoke-growth-release-decision.js",
    "scripts/smoke-growth-release-review.js",
    "scripts/smoke-growth-release-authorization.js",
    "scripts/smoke-growth-release-closure.js",
    "scripts/smoke-growth-release-activation.js",
    "scripts/smoke-growth-runtime-enablement.js",
    "scripts/smoke-growth-release-controls.js",
    "scripts/smoke-growth-release-dashboard.js",
    "scripts/smoke-growth-release-workbench.js",
    "scripts/smoke-growth-release-preflight.js",
    "scripts/smoke-growth-release-artifact-template.js",
    "scripts/smoke-growth-release-workbench-action.js",
    "scripts/smoke-growth-release-inventory.js",
    "scripts/smoke-growth-production-deployment-evidence.js"
  ]) {
    assert.match(operationalRow, new RegExp(escapeRegExp(scriptName)));
  }
  assert.match(packageJson.scripts.check, /node --check scripts\/build-growth-release-evidence-bundle\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-platform-action-evidence\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-central-visual-evidence\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-production-deployment-evidence\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-ui-evidence\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-release-evidence-bundle-audit\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-automation-release-evidence\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-release-collection-run\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-release-decision\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-release-review\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-release-authorization\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-release-closure\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-release-activation\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-runtime-enablement\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-release-controls\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-release-dashboard\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-release-workbench\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-release-preflight\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-release-artifact-template\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-release-workbench-action\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-release-inventory\.js/);
  assert.match(packageJson.scripts.check, /node --check scripts\/smoke-growth-automation-owner-review-evidence\.js/);
  assert.match(packageJson.scripts.check, /node --check src\/stores\/growth-learning-sqlite\/automation-release-activations\.js/);
  assert.match(packageJson.scripts.check, /node --check src\/stores\/growth-learning-sqlite\/automation-runtime-enablements\.js/);
  assert.match(packageJson.scripts.check, /node --check src\/stores\/growth-learning-sqlite\/automation-release-preflight-reports\.js/);
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-release-evidence-bundle-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-release-evidence-schemas\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-release-evidence-task-registry\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-release-evidence-artifact-template-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-release-preflight-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-platform-action-evidence-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-central-visual-evidence-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-production-deployment-evidence-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-ui-evidence-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-release-evidence-bundle-audit-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-release-evidence-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-release-collection-run-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-release-decision-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-release-review-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-release-authorization-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-release-closure-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-release-activation-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-runtime-enablement-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-release-controls-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-release-dashboard-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-release-workbench-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-release-workbench-action-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-release-inventory-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/services\/learning-automation-owner-review-evidence-service\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/stores\/growth-learning-sqlite\/automation-release-collection-runs\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/stores\/growth-learning-sqlite\/automation-release-decisions\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/stores\/growth-learning-sqlite\/automation-release-packages\.js/
  );
  assert.match(
    packageJson.scripts.check,
    /node --check src\/stores\/growth-learning-sqlite\/automation-release-evidence\.js/
  );

  const platformActionScript = read(path.join("scripts", "smoke-growth-platform-action-evidence.js"));
  assert.match(platformActionScript, /readEnv/);
  assert.match(platformActionScript, /createServices/);
  assert.match(platformActionScript, /learningAutomationPlatformActionEvidenceService/);
  assert.match(platformActionScript, /\.evaluate/);
  assert.doesNotMatch(platformActionScript, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(platformActionScript, /emit\(/);
  assert.doesNotMatch(platformActionScript, /deliverHandoff/);
  assert.doesNotMatch(platformActionScript, /publishPlanItem/);
  assert.doesNotMatch(platformActionScript, /generateCard/);
  assert.doesNotMatch(platformActionScript, /executeOnce/);
  assert.doesNotMatch(platformActionScript, /runOnce/);

  const centralVisualScript = read(path.join("scripts", "smoke-growth-central-visual-evidence.js"));
  assert.match(centralVisualScript, /readEnv/);
  assert.match(centralVisualScript, /createServices/);
  assert.match(centralVisualScript, /learningAutomationCentralVisualEvidenceService/);
  assert.match(centralVisualScript, /\.evaluate/);
  assert.match(centralVisualScript, /--central-visual-evidence-file/);
  assert.doesNotMatch(centralVisualScript, /spawnSync/);
  assert.doesNotMatch(centralVisualScript, /ios:pwa:visual/);
  assert.doesNotMatch(centralVisualScript, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(centralVisualScript, /publishPlanItem/);
  assert.doesNotMatch(centralVisualScript, /generateCard/);
  assert.doesNotMatch(centralVisualScript, /executeOnce/);
  assert.doesNotMatch(centralVisualScript, /runOnce/);

  const productionDeploymentScript = read(path.join("scripts", "smoke-growth-production-deployment-evidence.js"));
  assert.match(productionDeploymentScript, /readEnv/);
  assert.match(productionDeploymentScript, /createServices/);
  assert.match(productionDeploymentScript, /learningAutomationProductionDeploymentEvidenceService/);
  assert.match(productionDeploymentScript, /\.evaluate/);
  assert.match(productionDeploymentScript, /--production-deployment-evidence-file/);
  assert.doesNotMatch(productionDeploymentScript, /spawnSync/);
  assert.doesNotMatch(productionDeploymentScript, /launchctl/);
  assert.doesNotMatch(productionDeploymentScript, /restart/);
  assert.doesNotMatch(productionDeploymentScript, /fetch\(/);
  assert.doesNotMatch(productionDeploymentScript, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(productionDeploymentScript, /publishPlanItem/);
  assert.doesNotMatch(productionDeploymentScript, /generateCard/);
  assert.doesNotMatch(productionDeploymentScript, /executeOnce/);
  assert.doesNotMatch(productionDeploymentScript, /runOnce/);

  const uiEvidenceScript = read(path.join("scripts", "smoke-growth-ui-evidence.js"));
  assert.match(uiEvidenceScript, /readEnv/);
  assert.match(uiEvidenceScript, /createServices/);
  assert.match(uiEvidenceScript, /learningAutomationUiEvidenceService/);
  assert.match(uiEvidenceScript, /\.evaluate/);
  assert.match(uiEvidenceScript, /--ui-evidence-file/);
  assert.doesNotMatch(uiEvidenceScript, /spawnSync/);
  assert.doesNotMatch(uiEvidenceScript, /ios:pwa:visual/);
  assert.doesNotMatch(uiEvidenceScript, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(uiEvidenceScript, /publishPlanItem/);
  assert.doesNotMatch(uiEvidenceScript, /generateCard/);
  assert.doesNotMatch(uiEvidenceScript, /executeOnce/);
  assert.doesNotMatch(uiEvidenceScript, /runOnce/);

  const centralVisualService = read(path.join("src", "services", "learning-automation-central-visual-evidence-service.js"));
  assert.match(centralVisualService, /PRIVATE_VALUE_PATTERN/);
  assert.match(centralVisualService, /scanPrivateValues/);
  assert.match(centralVisualService, /no_private_value_leaks/);

  const productionDeploymentService = read(
    path.join("src", "services", "learning-automation-production-deployment-evidence-service.js")
  );
  assert.match(productionDeploymentService, /PRIVATE_VALUE_PATTERN/);
  assert.match(productionDeploymentService, /scanPrivateValues/);
  assert.match(productionDeploymentService, /no_private_value_leaks/);

  const uiEvidenceService = read(path.join("src", "services", "learning-automation-ui-evidence-service.js"));
  assert.match(uiEvidenceService, /PRIVATE_VALUE_PATTERN/);
  assert.match(uiEvidenceService, /scanPrivateValues/);
  assert.match(uiEvidenceService, /no_private_value_leaks/);

  const bundleAuditScript = read(path.join("scripts", "smoke-growth-release-evidence-bundle-audit.js"));
  assert.match(bundleAuditScript, /readEnv/);
  assert.match(bundleAuditScript, /createServices/);
  assert.match(bundleAuditScript, /learningAutomationReleaseEvidenceBundleAuditService/);
  assert.match(bundleAuditScript, /\.evaluate/);
  assert.match(bundleAuditScript, /--release-evidence-bundle-file/);
  assert.match(bundleAuditScript, /--release-evidence-bundle-json/);
  assert.doesNotMatch(bundleAuditScript, /spawnSync/);
  assert.doesNotMatch(bundleAuditScript, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(bundleAuditScript, /publishPlanItem/);
  assert.doesNotMatch(bundleAuditScript, /generateCard/);
  assert.doesNotMatch(bundleAuditScript, /evaluateSubmission/);
  assert.doesNotMatch(bundleAuditScript, /executeOnce/);
  assert.doesNotMatch(bundleAuditScript, /runOnce/);
  assert.doesNotMatch(bundleAuditScript, /deliverHandoff/);
  assert.doesNotMatch(bundleAuditScript, /activateStageAssessment/);

  const collectionRunScript = read(path.join("scripts", "smoke-growth-release-collection-run.js"));
  assert.match(collectionRunScript, /readEnv/);
  assert.match(collectionRunScript, /createServices/);
  assert.match(collectionRunScript, /learningAutomationReleaseCollectionRunService/);
  assert.match(collectionRunScript, /evaluateRun/);
  assert.match(collectionRunScript, /recordRun/);
  assert.match(collectionRunScript, /--write-record/);
  assert.match(collectionRunScript, /--release-evidence-bundle-file/);
  assert.match(collectionRunScript, /--release-evidence-bundle-audit-file/);
  assert.match(collectionRunScript, /--release-readiness-file/);
  assert.doesNotMatch(collectionRunScript, /spawnSync/);
  assert.doesNotMatch(collectionRunScript, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(collectionRunScript, /publishPlanItem/);
  assert.doesNotMatch(collectionRunScript, /generateCard/);
  assert.doesNotMatch(collectionRunScript, /evaluateSubmission/);
  assert.doesNotMatch(collectionRunScript, /executeOnce/);
  assert.doesNotMatch(collectionRunScript, /runOnce/);
  assert.doesNotMatch(collectionRunScript, /deliverHandoff/);
  assert.doesNotMatch(collectionRunScript, /activateStageAssessment/);

  const releaseDecisionScript = read(path.join("scripts", "smoke-growth-release-decision.js"));
  assert.match(releaseDecisionScript, /readEnv/);
  assert.match(releaseDecisionScript, /createServices/);
  assert.match(releaseDecisionScript, /learningAutomationReleaseDecisionService/);
  assert.match(releaseDecisionScript, /evaluateDecision/);
  assert.match(releaseDecisionScript, /recordDecision/);
  assert.match(releaseDecisionScript, /listDecisions/);
  assert.match(releaseDecisionScript, /--allow-write/);
  assert.match(releaseDecisionScript, /--release-collection-run-file/);
  assert.doesNotMatch(releaseDecisionScript, /spawnSync/);
  assert.doesNotMatch(releaseDecisionScript, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(releaseDecisionScript, /publishPlanItem/);
  assert.doesNotMatch(releaseDecisionScript, /generateCard/);
  assert.doesNotMatch(releaseDecisionScript, /evaluateSubmission/);
  assert.doesNotMatch(releaseDecisionScript, /executeOnce/);
  assert.doesNotMatch(releaseDecisionScript, /runOnce/);
  assert.doesNotMatch(releaseDecisionScript, /deliverHandoff/);
  assert.doesNotMatch(releaseDecisionScript, /activateStageAssessment/);

  const releaseReviewScript = read(path.join("scripts", "smoke-growth-release-review.js"));
  assert.match(releaseReviewScript, /readEnv/);
  assert.match(releaseReviewScript, /createServices/);
  assert.match(releaseReviewScript, /learningAutomationReleaseReviewService/);
  assert.match(releaseReviewScript, /review/);
  assert.doesNotMatch(releaseReviewScript, /--allow-write/);
  assert.doesNotMatch(releaseReviewScript, /spawnSync/);
  assert.doesNotMatch(releaseReviewScript, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(releaseReviewScript, /publishPlanItem/);
  assert.doesNotMatch(releaseReviewScript, /generateCard/);
  assert.doesNotMatch(releaseReviewScript, /evaluateSubmission/);
  assert.doesNotMatch(releaseReviewScript, /executeOnce/);
  assert.doesNotMatch(releaseReviewScript, /runOnce/);
  assert.doesNotMatch(releaseReviewScript, /deliverHandoff/);
  assert.doesNotMatch(releaseReviewScript, /activateStageAssessment/);

  const releaseAuthorizationScript = read(path.join("scripts", "smoke-growth-release-authorization.js"));
  assert.match(releaseAuthorizationScript, /readEnv/);
  assert.match(releaseAuthorizationScript, /createServices/);
  assert.match(releaseAuthorizationScript, /learningAutomationReleaseAuthorizationService/);
  assert.match(releaseAuthorizationScript, /authorize/);
  assert.doesNotMatch(releaseAuthorizationScript, /--allow-write/);
  assert.doesNotMatch(releaseAuthorizationScript, /spawnSync/);
  assert.doesNotMatch(releaseAuthorizationScript, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(releaseAuthorizationScript, /publishPlanItem/);
  assert.doesNotMatch(releaseAuthorizationScript, /generateCard/);
  assert.doesNotMatch(releaseAuthorizationScript, /evaluateSubmission/);
  assert.doesNotMatch(releaseAuthorizationScript, /executeOnce/);
  assert.doesNotMatch(releaseAuthorizationScript, /runOnce/);
  assert.doesNotMatch(releaseAuthorizationScript, /deliverHandoff/);
  assert.doesNotMatch(releaseAuthorizationScript, /activateStageAssessment/);

  const releaseClosureScript = read(path.join("scripts", "smoke-growth-release-closure.js"));
  assert.match(releaseClosureScript, /readEnv/);
  assert.match(releaseClosureScript, /createServices/);
  assert.match(releaseClosureScript, /learningAutomationReleaseClosureService/);
  assert.match(releaseClosureScript, /summarize/);
  assert.doesNotMatch(releaseClosureScript, /--allow-write/);
  assert.doesNotMatch(releaseClosureScript, /spawnSync/);
  assert.doesNotMatch(releaseClosureScript, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(releaseClosureScript, /publishPlanItem/);
  assert.doesNotMatch(releaseClosureScript, /generateCard/);
  assert.doesNotMatch(releaseClosureScript, /evaluateSubmission/);
  assert.doesNotMatch(releaseClosureScript, /executeOnce/);
  assert.doesNotMatch(releaseClosureScript, /runOnce/);
  assert.doesNotMatch(releaseClosureScript, /deliverHandoff/);
  assert.doesNotMatch(releaseClosureScript, /activateStageAssessment/);

  const releaseActivationScript = read(path.join("scripts", "smoke-growth-release-activation.js"));
  assert.match(releaseActivationScript, /readEnv/);
  assert.match(releaseActivationScript, /createServices/);
  assert.match(releaseActivationScript, /learningAutomationReleaseActivationService/);
  assert.match(releaseActivationScript, /preflight/);
  assert.match(releaseActivationScript, /listActivations/);
  assert.match(releaseActivationScript, /recordActivation/);
  assert.match(releaseActivationScript, /--allow-write/);
  assert.match(releaseActivationScript, /release_activation_smoke_write_not_allowed/);
  assert.doesNotMatch(releaseActivationScript, /spawnSync/);
  assert.doesNotMatch(releaseActivationScript, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(releaseActivationScript, /publishPlanItem/);
  assert.doesNotMatch(releaseActivationScript, /generateCard/);
  assert.doesNotMatch(releaseActivationScript, /evaluateSubmission/);
  assert.doesNotMatch(releaseActivationScript, /executeOnce/);
  assert.doesNotMatch(releaseActivationScript, /runOnce/);
  assert.doesNotMatch(releaseActivationScript, /deliverHandoff/);
  assert.doesNotMatch(releaseActivationScript, /activateStageAssessment/);

  const runtimeEnablementScript = read(path.join("scripts", "smoke-growth-runtime-enablement.js"));
  assert.match(runtimeEnablementScript, /readEnv/);
  assert.match(runtimeEnablementScript, /createServices/);
  assert.match(runtimeEnablementScript, /learningAutomationRuntimeEnablementService/);
  assert.match(runtimeEnablementScript, /evaluate/);
  assert.match(runtimeEnablementScript, /listEnablements/);
  assert.match(runtimeEnablementScript, /recordEnablement/);
  assert.match(runtimeEnablementScript, /--allow-write/);
  assert.match(runtimeEnablementScript, /runtime_enablement_smoke_write_not_allowed/);
  assert.doesNotMatch(runtimeEnablementScript, /spawnSync/);
  assert.doesNotMatch(runtimeEnablementScript, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(runtimeEnablementScript, /publishPlanItem/);
  assert.doesNotMatch(runtimeEnablementScript, /generateCard/);
  assert.doesNotMatch(runtimeEnablementScript, /evaluateSubmission/);
  assert.doesNotMatch(runtimeEnablementScript, /executeOnce/);
  assert.doesNotMatch(runtimeEnablementScript, /runOnce/);
  assert.doesNotMatch(runtimeEnablementScript, /deliverHandoff/);
  assert.doesNotMatch(runtimeEnablementScript, /activateStageAssessment/);

  const releaseControlsScript = read(path.join("scripts", "smoke-growth-release-controls.js"));
  assert.match(releaseControlsScript, /readEnv/);
  assert.match(releaseControlsScript, /createServices/);
  assert.match(releaseControlsScript, /learningAutomationReleaseControlsService/);
  assert.match(releaseControlsScript, /summarize/);
  assert.doesNotMatch(releaseControlsScript, /--allow-write/);
  assert.doesNotMatch(releaseControlsScript, /spawnSync/);
  assert.doesNotMatch(releaseControlsScript, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(releaseControlsScript, /publishPlanItem/);
  assert.doesNotMatch(releaseControlsScript, /generateCard/);
  assert.doesNotMatch(releaseControlsScript, /evaluateSubmission/);
  assert.doesNotMatch(releaseControlsScript, /executeOnce/);
  assert.doesNotMatch(releaseControlsScript, /runOnce/);
  assert.doesNotMatch(releaseControlsScript, /deliverHandoff/);
  assert.doesNotMatch(releaseControlsScript, /activateStageAssessment/);

  const releaseInventoryScript = read(path.join("scripts", "smoke-growth-release-inventory.js"));
  assert.match(releaseInventoryScript, /readEnv/);
  assert.match(releaseInventoryScript, /createServices/);
  assert.match(releaseInventoryScript, /learningAutomationReleaseInventoryService/);
  assert.match(releaseInventoryScript, /inventory/);
  assert.doesNotMatch(releaseInventoryScript, /--allow-write/);
  assert.doesNotMatch(releaseInventoryScript, /spawnSync/);
  assert.doesNotMatch(releaseInventoryScript, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(releaseInventoryScript, /publishPlanItem/);
  assert.doesNotMatch(releaseInventoryScript, /generateCard/);
  assert.doesNotMatch(releaseInventoryScript, /evaluateSubmission/);
  assert.doesNotMatch(releaseInventoryScript, /executeOnce/);
  assert.doesNotMatch(releaseInventoryScript, /runOnce/);
  assert.doesNotMatch(releaseInventoryScript, /deliverHandoff/);
  assert.doesNotMatch(releaseInventoryScript, /activateStageAssessment/);

  const releaseDashboardScript = read(path.join("scripts", "smoke-growth-release-dashboard.js"));
  assert.match(releaseDashboardScript, /readEnv/);
  assert.match(releaseDashboardScript, /createServices/);
  assert.match(releaseDashboardScript, /learningAutomationReleaseDashboardService/);
  assert.match(releaseDashboardScript, /dashboard/);
  assert.doesNotMatch(releaseDashboardScript, /--allow-write/);
  assert.doesNotMatch(releaseDashboardScript, /spawnSync/);
  assert.doesNotMatch(releaseDashboardScript, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(releaseDashboardScript, /publishPlanItem/);
  assert.doesNotMatch(releaseDashboardScript, /generateCard/);
  assert.doesNotMatch(releaseDashboardScript, /evaluateSubmission/);
  assert.doesNotMatch(releaseDashboardScript, /executeOnce/);
  assert.doesNotMatch(releaseDashboardScript, /runOnce/);
  assert.doesNotMatch(releaseDashboardScript, /deliverHandoff/);
  assert.doesNotMatch(releaseDashboardScript, /activateStageAssessment/);

  const releaseWorkbenchScript = read(path.join("scripts", "smoke-growth-release-workbench.js"));
  assert.match(releaseWorkbenchScript, /readEnv/);
  assert.match(releaseWorkbenchScript, /createServices/);
  assert.match(releaseWorkbenchScript, /learningAutomationReleaseWorkbenchService/);
  assert.match(releaseWorkbenchScript, /workbench/);
  assert.doesNotMatch(releaseWorkbenchScript, /--allow-write/);
  assert.doesNotMatch(releaseWorkbenchScript, /spawnSync/);
  assert.doesNotMatch(releaseWorkbenchScript, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(releaseWorkbenchScript, /publishPlanItem/);
  assert.doesNotMatch(releaseWorkbenchScript, /generateCard/);
  assert.doesNotMatch(releaseWorkbenchScript, /evaluateSubmission/);
  assert.doesNotMatch(releaseWorkbenchScript, /executeOnce/);
  assert.doesNotMatch(releaseWorkbenchScript, /runOnce/);
  assert.doesNotMatch(releaseWorkbenchScript, /deliverHandoff/);
  assert.doesNotMatch(releaseWorkbenchScript, /activateStageAssessment/);

  const releasePreflightScript = read(path.join("scripts", "smoke-growth-release-preflight.js"));
  assert.match(releasePreflightScript, /readEnv/);
  assert.match(releasePreflightScript, /createServices/);
  assert.match(releasePreflightScript, /learningAutomationReleasePreflightService/);
  assert.match(releasePreflightScript, /evaluate/);
  assert.match(releasePreflightScript, /listReports/);
  assert.match(releasePreflightScript, /recordReport/);
  assert.match(releasePreflightScript, /--allow-write/);
  assert.doesNotMatch(releasePreflightScript, /spawnSync/);
  assert.doesNotMatch(releasePreflightScript, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(releasePreflightScript, /publishPlanItem/);
  assert.doesNotMatch(releasePreflightScript, /generateCard/);
  assert.doesNotMatch(releasePreflightScript, /evaluateSubmission/);
  assert.doesNotMatch(releasePreflightScript, /executeOnce/);
  assert.doesNotMatch(releasePreflightScript, /runOnce/);
  assert.doesNotMatch(releasePreflightScript, /deliverHandoff/);
  assert.doesNotMatch(releasePreflightScript, /activateStageAssessment/);

  const releaseArtifactTemplateScript = read(path.join("scripts", "smoke-growth-release-artifact-template.js"));
  assert.match(releaseArtifactTemplateScript, /readEnv/);
  assert.match(releaseArtifactTemplateScript, /createServices/);
  assert.match(releaseArtifactTemplateScript, /learningAutomationReleaseEvidenceArtifactTemplateService/);
  assert.match(releaseArtifactTemplateScript, /template/);
  assert.doesNotMatch(releaseArtifactTemplateScript, /--allow-write/);
  assert.doesNotMatch(releaseArtifactTemplateScript, /spawnSync/);
  assert.doesNotMatch(releaseArtifactTemplateScript, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(releaseArtifactTemplateScript, /publishPlanItem/);
  assert.doesNotMatch(releaseArtifactTemplateScript, /generateCard/);
  assert.doesNotMatch(releaseArtifactTemplateScript, /evaluateSubmission/);
  assert.doesNotMatch(releaseArtifactTemplateScript, /executeOnce/);
  assert.doesNotMatch(releaseArtifactTemplateScript, /runOnce/);
  assert.doesNotMatch(releaseArtifactTemplateScript, /deliverHandoff/);
  assert.doesNotMatch(releaseArtifactTemplateScript, /activateStageAssessment/);

  const releaseWorkbenchActionScript = read(path.join("scripts", "smoke-growth-release-workbench-action.js"));
  assert.match(releaseWorkbenchActionScript, /readEnv/);
  assert.match(releaseWorkbenchActionScript, /createServices/);
  assert.match(releaseWorkbenchActionScript, /learningAutomationReleaseWorkbenchActionService/);
  assert.match(releaseWorkbenchActionScript, /recordAction/);
  assert.match(releaseWorkbenchActionScript, /listActionAudits/);
  assert.match(releaseWorkbenchActionScript, /list-audits/);
  assert.match(releaseWorkbenchActionScript, /--allow-write/);
  assert.doesNotMatch(releaseWorkbenchActionScript, /spawnSync/);
  assert.doesNotMatch(releaseWorkbenchActionScript, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(releaseWorkbenchActionScript, /publishPlanItem/);
  assert.doesNotMatch(releaseWorkbenchActionScript, /generateCard/);
  assert.doesNotMatch(releaseWorkbenchActionScript, /evaluateSubmission/);
  assert.doesNotMatch(releaseWorkbenchActionScript, /executeOnce/);
  assert.doesNotMatch(releaseWorkbenchActionScript, /runOnce/);
  assert.doesNotMatch(releaseWorkbenchActionScript, /deliverHandoff/);
  assert.doesNotMatch(releaseWorkbenchActionScript, /activateStageAssessment/);

  const releaseInventoryService = read(path.join("src", "services", "learning-automation-release-inventory-service.js"));
  assert.match(releaseInventoryService, /RELEASE_INVENTORY_SCHEMA/);
  assert.match(releaseInventoryService, /growth\.learningAutomationReleaseInventory\.v1/);
  assert.match(releaseInventoryService, /releaseControlsService\.summarize/);
  assert.match(releaseInventoryService, /releaseReadinessService\.listSnapshots/);
  assert.match(releaseInventoryService, /collectionRunService\.listRuns/);
  assert.match(releaseInventoryService, /decisionService\.listDecisions/);
  assert.match(releaseInventoryService, /packageService\.listPackages/);
  assert.match(releaseInventoryService, /approvalService\.listApprovals/);
  assert.match(releaseInventoryService, /releaseEvidenceService\.listEvidence/);
  assert.match(releaseInventoryService, /preflightReportRepository\.listReports/);
  assert.match(releaseInventoryService, /release_preflight/);
  assert.match(releaseInventoryService, /latestPreflightReportId/);
  assert.match(releaseInventoryService, /releaseActivationService\.listActivations/);
  assert.match(releaseInventoryService, /runtimeEnablementService\.listEnablements/);
  assert.match(releaseInventoryService, /packageDashboardFields/);
  assert.match(releaseInventoryService, /releaseDashboardSummary/);
  assert.match(releaseInventoryService, /latestPackageDashboardStatus/);
  assert.match(releaseInventoryService, /evidenceReadbackSummary/);
  assert.match(releaseInventoryService, /latestReadinessEvidencePresentCount/);
  assert.match(releaseInventoryService, /latestReadinessOwnerReviewStageSummary/);
  assert.match(releaseInventoryService, /ownerReviewStageSummary/);
  assert.match(releaseInventoryService, /latestReleaseEvidenceRecordId/);
  assert.match(releaseInventoryService, /releaseEvidenceRecordCount/);
  assert.doesNotMatch(releaseInventoryService, /require\(["']\.\.\/stores/);
  assert.doesNotMatch(releaseInventoryService, /learning_growth_/);
  assert.doesNotMatch(releaseInventoryService, /spawnSync/);
  assert.doesNotMatch(releaseInventoryService, /publishPlanItem/);
  assert.doesNotMatch(releaseInventoryService, /generateCard/);
  assert.doesNotMatch(releaseInventoryService, /evaluateSubmission/);
  assert.doesNotMatch(releaseInventoryService, /executeOnce/);
  assert.doesNotMatch(releaseInventoryService, /runOnce/);
  assert.doesNotMatch(releaseInventoryService, /deliverHandoff/);
  assert.doesNotMatch(releaseInventoryService, /activateStageAssessment/);
  assert.doesNotMatch(releaseInventoryService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);

  const releaseDashboardService = read(path.join("src", "services", "learning-automation-release-dashboard-service.js"));
  assert.match(releaseDashboardService, /RELEASE_DASHBOARD_SCHEMA/);
  assert.match(releaseDashboardService, /growth\.learningAutomationReleaseDashboard\.v1/);
  assert.match(releaseDashboardService, /releaseReadinessService\.evaluateReadiness/);
  assert.match(releaseDashboardService, /releaseControlsService\.summarize/);
  assert.match(releaseDashboardService, /releaseInventoryService\.inventory/);
  assert.match(releaseDashboardService, /packageDashboardFields/);
  assert.match(releaseDashboardService, /latestPackageDashboardStatus/);
  assert.match(releaseDashboardService, /evidenceReadbackSummary/);
  assert.match(releaseDashboardService, /readinessEvidencePresentCount/);
  assert.match(releaseDashboardService, /ownerReviewStageSummary/);
  assert.match(releaseDashboardService, /latestReadinessOwnerReviewStageSummary/);
  assert.match(releaseDashboardService, /persistedEvidenceKeys/);
  assert.match(releaseDashboardService, /latestReleaseEvidenceRecordId/);
  assert.match(releaseDashboardService, /releaseEvidenceRecordCount/);
  assert.match(releaseDashboardService, /preflightReports/);
  assert.match(releaseDashboardService, /latestPreflightReportId/);
  assert.doesNotMatch(releaseDashboardService, /require\(["']\.\.\/stores/);
  assert.doesNotMatch(releaseDashboardService, /learning_growth_/);
  assert.doesNotMatch(releaseDashboardService, /spawnSync/);
  assert.doesNotMatch(releaseDashboardService, /publishPlanItem/);
  assert.doesNotMatch(releaseDashboardService, /generateCard/);
  assert.doesNotMatch(releaseDashboardService, /evaluateSubmission/);
  assert.doesNotMatch(releaseDashboardService, /executeOnce/);
  assert.doesNotMatch(releaseDashboardService, /runOnce/);
  assert.doesNotMatch(releaseDashboardService, /deliverHandoff/);
  assert.doesNotMatch(releaseDashboardService, /activateStageAssessment/);
  assert.doesNotMatch(releaseDashboardService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);

  const releaseWorkbenchService = read(path.join("src", "services", "learning-automation-release-workbench-service.js"));
  assert.match(releaseWorkbenchService, /RELEASE_WORKBENCH_SCHEMA/);
  assert.match(releaseWorkbenchService, /growth\.learningAutomationReleaseWorkbench\.v1/);
  assert.match(releaseWorkbenchService, /releaseReadinessService\.evaluateReadiness/);
  assert.match(releaseWorkbenchService, /releaseControlsService\.summarize/);
  assert.match(releaseWorkbenchService, /releaseInventoryService\.inventory/);
  assert.match(releaseWorkbenchService, /releaseDashboardService\.dashboard/);
  assert.match(releaseWorkbenchService, /ownerActions/);
  assert.match(releaseWorkbenchService, /readRoutes/);
  assert.match(releaseWorkbenchService, /recordRoutes/);
  assert.match(releaseWorkbenchService, /release_preflight/);
  assert.match(releaseWorkbenchService, /record_release_preflight/);
  assert.match(releaseWorkbenchService, /firstPreflightSummary/);
  assert.match(releaseWorkbenchService, /latestPreflightReportId/);
  assert.match(releaseWorkbenchService, /externalActionRequired/);
  assert.doesNotMatch(releaseWorkbenchService, /require\(["']\.\.\/stores/);
  assert.doesNotMatch(releaseWorkbenchService, /learning_growth_/);
  assert.doesNotMatch(releaseWorkbenchService, /spawnSync/);
  assert.doesNotMatch(releaseWorkbenchService, /recordPackage/);
  assert.doesNotMatch(releaseWorkbenchService, /recordEvidence/);
  assert.doesNotMatch(releaseWorkbenchService, /recordApproval/);
  assert.doesNotMatch(releaseWorkbenchService, /recordReport/);
  assert.doesNotMatch(releaseWorkbenchService, /publishPlanItem/);
  assert.doesNotMatch(releaseWorkbenchService, /generateCard/);
  assert.doesNotMatch(releaseWorkbenchService, /evaluateSubmission/);
  assert.doesNotMatch(releaseWorkbenchService, /executeOnce/);
  assert.doesNotMatch(releaseWorkbenchService, /runOnce/);
  assert.doesNotMatch(releaseWorkbenchService, /deliverHandoff/);
  assert.doesNotMatch(releaseWorkbenchService, /activateStageAssessment/);
  assert.doesNotMatch(releaseWorkbenchService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);

  const releasePreflightService = read(path.join("src", "services", "learning-automation-release-preflight-service.js"));
  assert.match(releasePreflightService, /RELEASE_PREFLIGHT_SCHEMA/);
  assert.match(releasePreflightService, /growth\.learningAutomationReleasePreflight\.v1/);
  assert.match(releasePreflightService, /releaseDashboardService\.dashboard/);
  assert.match(releasePreflightService, /releaseWorkbenchService\.workbench/);
  assert.match(releasePreflightService, /releaseClosureService\.summarize/);
  assert.match(releasePreflightService, /repository\.recordReport/);
  assert.match(releasePreflightService, /repository\.listReports/);
  assert.match(releasePreflightService, /readyForProductionDeploy: false/);
  assert.match(releasePreflightService, /readyForProductionDeployReview/);
  assert.match(releasePreflightService, /allowWritePreflight/);
  assert.match(releasePreflightService, /ownerAuthorizedWrite/);
  assert.doesNotMatch(releasePreflightService, /require\(["']\.\.\/stores/);
  assert.doesNotMatch(releasePreflightService, /learning_growth_/);
  assert.doesNotMatch(releasePreflightService, /spawnSync/);
  assert.doesNotMatch(releasePreflightService, /publishPlanItem/);
  assert.doesNotMatch(releasePreflightService, /generateCard/);
  assert.doesNotMatch(releasePreflightService, /evaluateSubmission/);
  assert.doesNotMatch(releasePreflightService, /executeOnce/);
  assert.doesNotMatch(releasePreflightService, /runOnce/);
  assert.doesNotMatch(releasePreflightService, /deliverHandoff/);
  assert.doesNotMatch(releasePreflightService, /activateStageAssessment/);
  assert.doesNotMatch(releasePreflightService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);

  const releaseArtifactTemplateService = read(path.join("src", "services", "learning-automation-release-evidence-artifact-template-service.js"));
  assert.match(releaseArtifactTemplateService, /RELEASE_EVIDENCE_ARTIFACT_TEMPLATE_SCHEMA/);
  assert.match(releaseArtifactTemplateService, /growth\.learningAutomationReleaseEvidenceArtifactTemplate\.v1/);
  assert.match(releaseArtifactTemplateService, /releaseWorkbenchService\.workbench/);
  assert.match(releaseArtifactTemplateService, /RELEASE_EVIDENCE_ARTIFACT_MANIFEST_SCHEMA/);
  assert.match(releaseArtifactTemplateService, /UI_EVIDENCE_COLLECTION_TASKS/);
  assert.match(releaseArtifactTemplateService, /artifactManifestTemplate/);
  assert.doesNotMatch(releaseArtifactTemplateService, /require\(["']\.\.\/stores/);
  assert.doesNotMatch(releaseArtifactTemplateService, /learning_growth_/);
  assert.doesNotMatch(releaseArtifactTemplateService, /spawnSync/);
  assert.doesNotMatch(releaseArtifactTemplateService, /recordPackage/);
  assert.doesNotMatch(releaseArtifactTemplateService, /recordEvidence/);
  assert.doesNotMatch(releaseArtifactTemplateService, /recordApproval/);
  assert.doesNotMatch(releaseArtifactTemplateService, /publishPlanItem/);
  assert.doesNotMatch(releaseArtifactTemplateService, /generateCard/);
  assert.doesNotMatch(releaseArtifactTemplateService, /evaluateSubmission/);
  assert.doesNotMatch(releaseArtifactTemplateService, /executeOnce/);
  assert.doesNotMatch(releaseArtifactTemplateService, /runOnce/);
  assert.doesNotMatch(releaseArtifactTemplateService, /deliverHandoff/);
  assert.doesNotMatch(releaseArtifactTemplateService, /activateStageAssessment/);
  assert.doesNotMatch(releaseArtifactTemplateService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);

  const releaseArtifactManifestService = read(path.join("src", "services", "learning-automation-release-evidence-artifact-manifest-service.js"));
  assert.match(releaseArtifactManifestService, /applyToCollectionInput/);
  assert.match(releaseArtifactManifestService, /mergeArtifactTaskIdsIntoCollectionTasks/);
  assert.doesNotMatch(releaseArtifactManifestService, /spawnSync/);
  assert.doesNotMatch(releaseArtifactManifestService, /recordEvidence/);
  assert.doesNotMatch(releaseArtifactManifestService, /publishPlanItem/);
  assert.doesNotMatch(releaseArtifactManifestService, /generateCard/);
  assert.doesNotMatch(releaseArtifactManifestService, /evaluateSubmission/);
  assert.doesNotMatch(releaseArtifactManifestService, /executeOnce/);
  assert.doesNotMatch(releaseArtifactManifestService, /runOnce/);
  assert.doesNotMatch(releaseArtifactManifestService, /deliverHandoff/);
  assert.doesNotMatch(releaseArtifactManifestService, /activateStageAssessment/);
  assert.doesNotMatch(releaseArtifactManifestService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);

  const releaseWorkbenchActionService = read(path.join("src", "services", "learning-automation-release-workbench-action-service.js"));
  assert.match(releaseWorkbenchActionService, /RELEASE_WORKBENCH_ACTION_SCHEMA/);
  assert.match(releaseWorkbenchActionService, /growth\.learningAutomationReleaseWorkbenchAction\.v1/);
  assert.match(releaseWorkbenchActionService, /releaseWorkbenchService\.workbench/);
  assert.match(releaseWorkbenchActionService, /requireEndpointService/);
  assert.match(releaseWorkbenchActionService, /releaseReadinessService\.createSnapshot/);
  assert.match(releaseWorkbenchActionService, /releaseEvidenceService\.recordEvidence/);
  assert.match(releaseWorkbenchActionService, /releaseApprovalService\.recordApproval/);
  assert.match(releaseWorkbenchActionService, /releaseEvidenceCollectionService\.collect/);
  assert.match(releaseWorkbenchActionService, /releaseCollectionRunService\.recordRun/);
  assert.match(releaseWorkbenchActionService, /releaseDecisionService\.recordDecision/);
  assert.match(releaseWorkbenchActionService, /releasePackageService\.recordPackage/);
  assert.match(releaseWorkbenchActionService, /releasePackageService\.buildPackage/);
  assert.match(releaseWorkbenchActionService, /releasePreflightService\.recordReport/);
  assert.match(releaseWorkbenchActionService, /releaseActivationService\.recordActivation/);
  assert.match(releaseWorkbenchActionService, /runtimeEnablementService\.recordEnablement/);
  assert.match(releaseWorkbenchActionService, /automationDigestService\.createDigest/);
  assert.match(releaseWorkbenchActionService, /automationDigestService\.reviewDigest/);
  assert.match(releaseWorkbenchActionService, /automationFailurePolicyService\.createPolicy/);
  assert.match(releaseWorkbenchActionService, /automationFailurePolicyService\.reviewPolicy/);
  assert.match(releaseWorkbenchActionService, /automationActionHandoffService\.createHandoff/);
  assert.match(releaseWorkbenchActionService, /automationActionHandoffService\.deliverHandoff/);
  assert.match(releaseWorkbenchActionService, /automationSchedulerWorkerTargetService\.createTarget/);
  assert.match(releaseWorkbenchActionService, /automationSchedulerWorkerTargetService\.reviewTarget/);
  assert.doesNotMatch(releaseWorkbenchActionService, /require\(["']\.\.\/stores/);
  assert.doesNotMatch(releaseWorkbenchActionService, /learning_growth_/);
  assert.doesNotMatch(releaseWorkbenchActionService, /spawnSync/);
  assert.doesNotMatch(releaseWorkbenchActionService, /publishPlanItem/);
  assert.doesNotMatch(releaseWorkbenchActionService, /generateCard/);
  assert.doesNotMatch(releaseWorkbenchActionService, /evaluateSubmission/);
  assert.doesNotMatch(releaseWorkbenchActionService, /executeOnce/);
  assert.doesNotMatch(releaseWorkbenchActionService, /runOnce/);
  assert.doesNotMatch(releaseWorkbenchActionService, /activateStageAssessment/);
  assert.doesNotMatch(releaseWorkbenchActionService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);

  const script = read(path.join("scripts", "build-growth-release-evidence-bundle.js"));
  assert.match(script, /createLearningAutomationReleaseEvidenceBundleService/);
  assert.match(script, /spawnSync/);
  assert.match(script, /--fail-on-blocked/);
  assert.match(script, /--result-json/);
  assert.match(script, /--output-file/);
  assert.match(script, /--allow-write-evidence/);
  assert.match(script, /--daily-loop-write-operation/);
  assert.match(script, /--plan-draft-id/);
  assert.match(script, /--learner-cycle-operation/);
  assert.match(script, /--task-card-id/);
  assert.doesNotMatch(script, /readEnv/);
  assert.doesNotMatch(script, /createServices/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learningAutomationReleaseReadinessService/);
  assert.doesNotMatch(script, /learningDailyLoopService/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /publishAcceptedProposal/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /executeOnce/);
  assert.doesNotMatch(script, /runOnce/);
  assert.doesNotMatch(script, /deliverHandoff/);
  assert.doesNotMatch(script, /activateStageAssessment/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);

  const service = read(path.join("src", "services", "learning-automation-release-evidence-bundle-service.js"));
  const schemas = read(path.join("src", "services", "learning-automation-release-evidence-schemas.js"));
  const taskRegistry = read(path.join("src", "services", "learning-automation-release-evidence-task-registry.js"));
  assert.match(schemas, /RELEASE_EVIDENCE_BUNDLE_SCHEMA/);
  assert.match(schemas, /RELEASE_EVIDENCE_BUNDLE_AUDIT_SCHEMA/);
  assert.match(service, /RELEASE_EVIDENCE_BUNDLE_SCHEMA/);
  assert.match(service, /learning-automation-release-evidence-schemas/);
  assert.match(service, /learning-automation-release-evidence-task-registry/);
  assert.match(service, /TASK_DEFINITIONS/);
  assert.match(service, /runCommand/);
  assert.match(service, /releaseApproval/);
  assert.match(taskRegistry, /const DEFAULT_TASK_IDS/);
  assert.match(taskRegistry, /const TASK_DEFINITIONS/);
  assert.match(taskRegistry, /release_approval/);
  assert.match(taskRegistry, /learner_cycle/);
  assert.match(taskRegistry, /daily_loop_write/);
  assert.match(taskRegistry, /operating_loop_history/);
  assert.match(taskRegistry, /productionOperatingLoopHistorySmokeEvidence/);
  assert.match(taskRegistry, /productionLearnerCycleSmokeEvidence/);
  assert.match(taskRegistry, /productionCycleHistorySmokeEvidence/);
  assert.match(taskRegistry, /productionOwnerAuditSmokeEvidence/);
  assert.match(taskRegistry, /owner_audit_review/);
  assert.match(taskRegistry, /productionOwnerAuditReviewSmokeEvidence/);
  assert.match(taskRegistry, /productionDailyLoopWriteSmokeEvidence/);
  assert.match(taskRegistry, /platform_action/);
  assert.match(taskRegistry, /platformActionEvidence/);
  assert.match(taskRegistry, /central_visual/);
  assert.match(taskRegistry, /centralVisualEvidence/);
  assert.match(service, /centralVisualEvidence/);
  assert.match(service, /centralVisualEvidenceFilePresent/);
  assert.match(taskRegistry, /release_controls/);
  assert.match(taskRegistry, /releaseControlsSmokeEvidence/);
  assert.match(taskRegistry, /release_inventory/);
  assert.match(taskRegistry, /releaseInventorySmokeEvidence/);
  assert.match(taskRegistry, /release_dashboard/);
  assert.match(taskRegistry, /releaseDashboardSmokeEvidence/);
  assert.match(taskRegistry, /release_workbench/);
  assert.match(taskRegistry, /releaseWorkbenchSmokeEvidence/);
  assert.match(service, /releaseWorkbenchSummaryFromSmoke/);
  assert.match(taskRegistry, /owner_review_evidence/);
  assert.match(taskRegistry, /ownerReviewEvidence/);
  assert.match(service, /ownerReviewSummaryFromSmoke/);
  assert.match(service, /ownerAuditReviewSummaryFromSmoke/);
  assert.match(taskRegistry, /smoke-growth-owner-audit-review\.js/);
  assert.match(taskRegistry, /smoke-growth-automation-owner-review-evidence\.js/);
  assert.match(service, /release_evidence_bundle_learner_cycle_operation_invalid/);
  assert.match(service, /LEARNER_CYCLE_BUNDLE_OPERATIONS/);
  assert.match(service, /release_evidence_bundle_write_evidence_not_allowed/);
  assert.match(service, /release_evidence_bundle_daily_loop_write_operation_invalid/);
  assert.match(service, /release_evidence_bundle_plan_draft_id_required/);
  assert.match(service, /allowWriteEvidence/);
  assert.match(service, /writeEvidence/);
  assert.match(service, /privacyClass: "summary_only"/);
  assert.match(service, /summaryOnly: true/);
  assert.match(service, /scanPrivacy/);
  assert.match(taskRegistry, /productionPlannerReadinessEvidence/);
  assert.match(taskRegistry, /target_provisioning/);
  assert.match(taskRegistry, /productionTargetProvisioningSmokeEvidence/);
  assert.match(service, /targetProvisioningSummaryFromSmoke/);
  assert.match(taskRegistry, /recommendation_lifecycle/);
  assert.match(taskRegistry, /productionRecommendationLifecycleSmokeEvidence/);
  assert.match(service, /recommendationLifecycleSummaryFromSmoke/);
  assert.match(taskRegistry, /productionDailyLoopPreviewSmokeEvidence/);
  assert.match(taskRegistry, /productionLearningLoopStateSmokeEvidence/);
  assert.match(taskRegistry, /stageCheckpointEvidence/);
  assert.match(taskRegistry, /stage_checkpoint_controls/);
  assert.match(taskRegistry, /stageCheckpointControlsEvidence/);
  assert.match(taskRegistry, /productionProposalSmokeEvidence/);
  assert.match(taskRegistry, /productionSchedulerDryRunSmokeEvidence/);
  assert.match(taskRegistry, /productionActionHandoffSmokeEvidence/);
  assert.match(taskRegistry, /productionSchedulerExecutionSmokeEvidence/);
  assert.match(taskRegistry, /productionSchedulerRunSmokeEvidence/);
  assert.match(taskRegistry, /productionSchedulerWorkerTargetSmokeEvidence/);
  assert.match(taskRegistry, /productionSchedulerWorkerSmokeEvidence/);
  assert.match(taskRegistry, /writefulExecutionApproval/);
  assert.match(taskRegistry, /backgroundSchedulerApproval/);
  assert.match(taskRegistry, /backgroundWorkerApproval/);
  assert.match(taskRegistry, /smoke-growth-planner-readiness\.js/);
  assert.match(taskRegistry, /smoke-growth-target-provisioning\.js/);
  assert.match(taskRegistry, /smoke-growth-recommendation-lifecycle\.js/);
  assert.match(taskRegistry, /smoke-growth-daily-loop-preview\.js/);
  assert.match(taskRegistry, /smoke-growth-daily-loop\.js/);
  assert.match(taskRegistry, /smoke-growth-learner-cycle\.js/);
  assert.match(taskRegistry, /smoke-growth-learning-loop-state\.js/);
  assert.match(taskRegistry, /smoke-growth-cycle-history\.js/);
  assert.match(taskRegistry, /smoke-growth-owner-audit-review\.js/);
  assert.match(taskRegistry, /smoke-growth-platform-action-evidence\.js/);
  assert.match(taskRegistry, /smoke-growth-central-visual-evidence\.js/);
  assert.match(taskRegistry, /production_deployment_health/);
  assert.match(taskRegistry, /productionDeploymentHealthEvidence/);
  assert.match(taskRegistry, /smoke-growth-production-deployment-evidence\.js/);
  assert.match(taskRegistry, /smoke-growth-stage-assessment\.js/);
  assert.match(taskRegistry, /smoke-growth-release-controls\.js/);
  assert.match(taskRegistry, /smoke-growth-automation-proposal\.js/);
  assert.match(taskRegistry, /smoke-growth-scheduler-dry-run\.js/);
  assert.match(taskRegistry, /smoke-growth-automation-action-handoff\.js/);
  assert.match(taskRegistry, /smoke-growth-automation-scheduler-execution\.js/);
  assert.match(taskRegistry, /smoke-growth-automation-scheduler-run\.js/);
  assert.match(taskRegistry, /smoke-growth-automation-scheduler-worker-target\.js/);
  assert.match(taskRegistry, /smoke-growth-automation-scheduler-worker\.js/);
  assert.match(taskRegistry, /smoke-growth-automation-release-approval\.js/);
  assert.doesNotMatch(taskRegistry, /runCommand|spawnSync|exec\(/);
  assert.doesNotMatch(taskRegistry, /require\(["']\.\.\/stores/);
  assert.doesNotMatch(taskRegistry, /repository\./);
  assert.doesNotMatch(taskRegistry, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(service, /readEnv/);
  assert.doesNotMatch(service, /createServices/);
  assert.doesNotMatch(service, /require\(["']\.\.\/stores/);
  assert.doesNotMatch(service, /learning_growth_/);
  assert.doesNotMatch(service, /repository\./);
  assert.doesNotMatch(service, /publishPlanItem/);
  assert.doesNotMatch(service, /publishAcceptedProposal/);
  assert.doesNotMatch(service, /generateCard/);
  assert.doesNotMatch(service, /evaluateSubmission/);
  assert.doesNotMatch(service, /executeOnce/);
  assert.doesNotMatch(service, /runOnce/);
  assert.doesNotMatch(service, /deliverHandoff/);
  assert.doesNotMatch(service, /activateStageAssessment/);
  assert.doesNotMatch(service, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);

  const bundleAuditService = read(path.join("src", "services", "learning-automation-release-evidence-bundle-audit-service.js"));
  assert.match(bundleAuditService, /RELEASE_EVIDENCE_BUNDLE_AUDIT_SCHEMA/);
  assert.match(bundleAuditService, /DEFAULT_TASK_IDS/);
  assert.match(bundleAuditService, /TASK_DEFINITIONS/);
  assert.match(bundleAuditService, /summaryOnly: true/);
  assert.match(bundleAuditService, /privacyClass: "summary_only"/);
  assert.match(bundleAuditService, /scanPrivacyKeys/);
  assert.match(bundleAuditService, /scanPrivateValues/);
  assert.match(bundleAuditService, /missingRequiredTasks/);
  assert.match(bundleAuditService, /missingRequiredEvidenceKeys/);
  assert.match(bundleAuditService, /defaultTaskCoverage/);
  assert.match(bundleAuditService, /readyForReleaseEvidence/);
  assert.doesNotMatch(bundleAuditService, /spawnSync/);
  assert.doesNotMatch(bundleAuditService, /exec\(/);
  assert.doesNotMatch(bundleAuditService, /readEnv/);
  assert.doesNotMatch(bundleAuditService, /createServices/);
  assert.doesNotMatch(bundleAuditService, /require\(["']\.\.\/stores/);
  assert.doesNotMatch(bundleAuditService, /learning_growth_/);
  assert.doesNotMatch(bundleAuditService, /repository\./);
  assert.doesNotMatch(bundleAuditService, /publishPlanItem/);
  assert.doesNotMatch(bundleAuditService, /publishAcceptedProposal/);
  assert.doesNotMatch(bundleAuditService, /generateCard/);
  assert.doesNotMatch(bundleAuditService, /evaluateSubmission/);
  assert.doesNotMatch(bundleAuditService, /executeOnce/);
  assert.doesNotMatch(bundleAuditService, /runOnce/);
  assert.doesNotMatch(bundleAuditService, /deliverHandoff/);
  assert.doesNotMatch(bundleAuditService, /activateStageAssessment/);
  assert.doesNotMatch(bundleAuditService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);

  const serviceHarness = read(path.join("tests", "learning-automation-release-evidence-bundle-service.test.js"));
  assert.match(serviceHarness, /builds summary-only bundle from no-write smoke tasks/);
  assert.match(serviceHarness, /cycle_history/);
  assert.match(serviceHarness, /owner_audit/);
  assert.match(serviceHarness, /owner_audit_review/);
  assert.match(serviceHarness, /productionOwnerAuditReviewSmokeEvidence/);
  assert.match(serviceHarness, /collects platform action evidence from read-only smoke/);
  assert.match(serviceHarness, /collects central visual evidence from read-only smoke/);
  assert.match(serviceHarness, /blocks learner-cycle write operations from bundle scope/);
  assert.match(serviceHarness, /blocks controlled daily-loop write evidence unless explicitly allowed/);
  assert.match(serviceHarness, /runs controlled daily-loop write smoke only after bundle write approval/);
  assert.match(serviceHarness, /blocks unsafe daily-loop write task scope before runner execution/);
  assert.match(serviceHarness, /privacy-risk smoke output/);

  const scriptHarness = read(path.join("tests", "growth-release-evidence-bundle-script.test.js"));
  assert.match(scriptHarness, /writes a summary-only bundle from a read-only smoke/);
  assert.match(scriptHarness, /writes bounded cycle-history evidence from read-only history smoke/);
  assert.match(scriptHarness, /writes bounded Owner audit evidence from read-only audit smoke/);
  assert.match(scriptHarness, /writes bounded Owner audit-review evidence from read-only review smoke/);
  assert.match(scriptHarness, /writes bounded learner-cycle audit evidence from read-only learner smoke/);
  assert.match(scriptHarness, /writes platform action evidence from delivered outbox receipt/);
  assert.match(scriptHarness, /writes central visual evidence from central harness artifact/);
  assert.match(scriptHarness, /blocks learner-cycle write operations before smoke runner/);
  assert.match(scriptHarness, /exposes controlled daily-loop write evidence only as explicit blocked task by default/);
  assert.match(scriptHarness, /fails closed before write smoke when controlled publish lacks a plan draft id/);
  assert.match(scriptHarness, /fails closed for missing workspace and invalid task/);

  const auditServiceHarness = read(path.join("tests", "learning-automation-release-evidence-bundle-audit-service.test.js"));
  assert.match(auditServiceHarness, /validates complete summary-only default bundle/);
  assert.match(auditServiceHarness, /fails closed for incomplete bundle/);
  assert.match(auditServiceHarness, /rejects privacy-risk keys and private value leaks/);

  const auditScriptHarness = read(path.join("tests", "growth-release-evidence-bundle-audit-smoke-script.test.js"));
  assert.match(auditScriptHarness, /validates a summary-only bundle file/);
  assert.match(auditScriptHarness, /fails closed for missing bundle and privacy risk/);
});

test("Growth release package builder stays summary-only orchestration over release evidence services", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:release-package/);
  assert.match(packageJson, /build-growth-release-package\.js/);
  assert.match(packageJson, /learning-automation-release-package-service\.js/);

  const appServices = read(path.join("src", "app", "services.js"));
  assert.match(appServices, /createLearningAutomationReleaseEvidenceBundleService/);
  assert.match(appServices, /learningAutomationReleaseEvidenceBundleService/);
  assert.match(appServices, /learningAutomationReleasePackageBuildService/);
  assert.match(appServices, /evidenceBundleService: learningAutomationReleaseEvidenceBundleService/);
  assert.match(appServices, /releaseDashboardService: learningAutomationReleaseDashboardService/);
  assert.match(appServices, /spawnSync/);

  const script = read(path.join("scripts", "build-growth-release-package.js"));
  assert.match(script, /createServices/);
  assert.match(script, /learningAutomationReleasePackageBuildService/);
  assert.match(script, /service\.buildPackage/);
  assert.doesNotMatch(script, /createLearningAutomationReleasePackageService/);
  assert.doesNotMatch(script, /createLearningAutomationReleaseEvidenceBundleService/);
  assert.doesNotMatch(script, /spawnSync/);
  assert.doesNotMatch(script, /learningAutomationReleasePackageService\.recordPackage/);
  assert.match(script, /--write-collection-run/);
  assert.match(script, /--write-package-record/);
  assert.match(script, /--allow-write/);
  assert.match(script, /--output-file/);
  assert.match(script, /--fail-on-blocked/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /publishAcceptedProposal/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /executeOnce/);
  assert.doesNotMatch(script, /runOnce/);
  assert.doesNotMatch(script, /deliverHandoff/);
  assert.doesNotMatch(script, /activateStageAssessment/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);

  const service = read(path.join("src", "services", "learning-automation-release-package-service.js"));
  assert.match(service, /RELEASE_PACKAGE_SCHEMA/);
  assert.match(service, /growth\.learningAutomationReleasePackage\.v1/);
  assert.match(service, /buildPackage/);
  assert.match(service, /recordPackage/);
  assert.match(service, /listPackages/);
  assert.match(service, /evidenceBundleService\.buildBundle/);
  assert.match(service, /evidenceBundleAuditService\.evaluate/);
  assert.match(service, /releaseReadinessService\.evaluateReadiness/);
  assert.match(service, /releaseCollectionRunService\.evaluateRun/);
  assert.match(service, /releaseCollectionRunService\.recordRun/);
  assert.match(service, /releaseControlsService\.summarize/);
  assert.match(service, /releaseDashboardService\.dashboard/);
  assert.match(service, /release_dashboard/);
  assert.match(service, /releaseDashboardSummary/);
  assert.match(service, /readinessEvidencePresentCount/);
  assert.match(service, /latestReadinessEvidenceMissingCount/);
  assert.match(service, /ownerReviewStageSummary/);
  assert.match(service, /latestReadinessOwnerReviewStageSummary/);
  assert.match(service, /firstPreflightSummary/);
  assert.match(service, /latestPreflightReportId/);
  assert.match(service, /latestPreflightReadyForOwnerReleaseActivation/);
  assert.match(service, /packageRecordRequested/);
  assert.match(service, /packageRecordWritten/);
  assert.match(service, /persistedEvidenceKeys/);
  assert.match(service, /repository\.savePackage/);
  assert.match(service, /repository\.listPackages/);
  assert.match(service, /release_package_write_not_allowed/);
  assert.match(service, /release_package_dashboard_service_unavailable/);
  assert.match(service, /release_package_privacy_failed/);
  assert.match(service, /writefulSchedulingAllowed: false/);
  assert.match(service, /runtimeConfigChange: false/);
  assert.match(service, /configChangeApplied: false/);
  assert.doesNotMatch(service, /spawnSync/);
  assert.doesNotMatch(service, /require\(["']node:child_process/);
  assert.doesNotMatch(service, /require\(["']\.\.\/stores/);
  assert.doesNotMatch(service, /learning_growth_/);
  assert.doesNotMatch(service, /publishPlanItem/);
  assert.doesNotMatch(service, /publishAcceptedProposal/);
  assert.doesNotMatch(service, /generateCard/);
  assert.doesNotMatch(service, /evaluateSubmission/);
  assert.doesNotMatch(service, /executeOnce/);
  assert.doesNotMatch(service, /runOnce/);
  assert.doesNotMatch(service, /deliverHandoff/);
  assert.doesNotMatch(service, /activateStageAssessment/);
  assert.doesNotMatch(service, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);

  const reviewService = read(path.join("src", "services", "learning-automation-release-review-service.js"));
  assert.match(reviewService, /latestPackageDashboardReadinessEvidencePresentCount/);
  assert.match(reviewService, /latestPackageDashboardLatestReadinessEvidenceSourceBundleId/);
  assert.match(reviewService, /latestPackageDashboardPreflightReportId/);
  assert.match(reviewService, /latestPackageDashboardPreflightReadyForOwnerReleaseActivation/);
  assert.match(reviewService, /PRIVATE_VALUE_PATTERN/);
  assert.match(reviewService, /scanPrivateValues/);
  assert.match(reviewService, /learning_automation_release_review_dependency_privacy_failed/);

  const authorizationService = read(path.join("src", "services", "learning-automation-release-authorization-service.js"));
  assert.match(authorizationService, /latestPackageDashboardReadinessEvidencePresentCount/);
  assert.match(authorizationService, /latestPackageDashboardLatestReadinessEvidenceSourceBundleId/);
  assert.match(authorizationService, /latestPackageDashboardPreflightReportId/);
  assert.match(authorizationService, /latestPackageDashboardPreflightReadyForOwnerReleaseActivation/);
  assert.match(authorizationService, /PRIVATE_VALUE_PATTERN/);
  assert.match(authorizationService, /scanPrivateValues/);

  const closureService = read(path.join("src", "services", "learning-automation-release-closure-service.js"));
  assert.match(closureService, /latestPackageDashboardReadinessEvidencePresentCount/);
  assert.match(closureService, /latestPackageDashboardLatestReadinessEvidenceSourceBundleId/);
  assert.match(closureService, /latestPackageDashboardPreflightReportId/);
  assert.match(closureService, /latestPackageDashboardPreflightReadyForOwnerReleaseActivation/);
  assert.match(closureService, /PRIVATE_VALUE_PATTERN/);
  assert.match(closureService, /scanPrivateValues/);

  const serviceHarness = read(path.join("tests", "learning-automation-release-package-service.test.js"));
  assert.match(serviceHarness, /composes bundle, audit, readiness, collection run, controls, and dashboard/);
  assert.match(serviceHarness, /keeps blocked release evidence explicit/);
  assert.match(serviceHarness, /rejects private paths/);
  assert.match(serviceHarness, /requires explicit allow-write/);
  assert.match(serviceHarness, /records summary-only package records/);
  assert.match(serviceHarness, /readinessEvidencePresentCount/);
  assert.match(serviceHarness, /lgarpf_dashboard_1/);
  assert.match(serviceHarness, /lgarpf_activation_1/);
  assert.match(serviceHarness, /latestPreflightReadyForOwnerReleaseActivation/);

  const scriptHarness = read(path.join("tests", "growth-release-package-script.test.js"));
  assert.match(scriptHarness, /parses package, bundle, and audit options/);
  assert.match(scriptHarness, /fails closed for collection-run write without allow-write/);
  assert.match(scriptHarness, /fails closed for package-record write without allow-write/);
  assert.match(scriptHarness, /writes summary-only package output/);
  assert.match(scriptHarness, /write a summary-only package record/);
  assert.match(scriptHarness, /readinessEvidenceMissingCount/);

  const routeHarness = read(path.join("tests", "growth-routes.test.js"));
  assert.match(routeHarness, /release-packages\/build/);
  assert.match(routeHarness, /buildReleasePackage/);
  assert.match(routeHarness, /growth_automation_release_package_build_owner_required/);
  assert.match(packageJson, /smoke:release-evidence-collection/);

  const collectionService = read(path.join("src", "services", "learning-automation-release-evidence-collection-service.js"));
  assert.match(collectionService, /createLearningAutomationReleaseEvidenceCollectionService/);
  assert.match(collectionService, /evidenceBundleService\.buildBundle/);
  assert.match(collectionService, /evidenceBundleAuditService\.evaluate/);
  assert.match(collectionService, /releaseReadinessService\.evaluateReadiness/);
  assert.match(collectionService, /releaseCollectionRunService\.evaluateRun/);
  assert.match(collectionService, /releaseCollectionRunService\.recordRun/);
  assert.match(collectionService, /releaseEvidenceService\.recordEvidence/);
  assert.match(collectionService, /writeReleaseEvidenceRecords/);
  assert.match(collectionService, /release_evidence_collection_record_service_unavailable/);
  assert.match(collectionService, /releaseEvidenceBundleAudit/);
  assert.match(collectionService, /release_evidence_collection_write_not_allowed/);
  assert.match(collectionService, /writefulSchedulingAllowed: false/);
  assert.match(collectionService, /runtimeConfigChange: false/);
  assert.match(collectionService, /schedulerPermissionGranted: false/);
  assert.doesNotMatch(collectionService, /spawnSync/);
  assert.doesNotMatch(collectionService, /require\(["']node:child_process/);
  assert.doesNotMatch(collectionService, /repository\./);
  assert.doesNotMatch(collectionService, /recordPackage/);
  assert.doesNotMatch(collectionService, /recordDecision/);
  assert.doesNotMatch(collectionService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(collectionService, /publishPlanItem/);
  assert.doesNotMatch(collectionService, /publishAcceptedProposal/);
  assert.doesNotMatch(collectionService, /generateCard/);
  assert.doesNotMatch(collectionService, /evaluateSubmission/);
  assert.doesNotMatch(collectionService, /executeOnce/);
  assert.doesNotMatch(collectionService, /runOnce/);
  assert.doesNotMatch(collectionService, /deliverHandoff/);
  assert.doesNotMatch(collectionService, /activateStageAssessment/);

  const collectionScript = read(path.join("scripts", "smoke-growth-release-evidence-collection.js"));
  assert.match(collectionScript, /learningAutomationReleaseEvidenceCollectionService\.collect/);
  assert.match(collectionScript, /--write-collection-run/);
  assert.match(collectionScript, /--write-release-evidence-records/);
  assert.match(collectionScript, /--allow-write/);
  assert.doesNotMatch(collectionScript, /learningAutomationReleasePackageService\.recordPackage/);
  assert.doesNotMatch(collectionScript, /publishAcceptedProposal|generateCard|evaluateSubmission|executeOnce|runOnce|deliverHandoff|activateStageAssessment/);

  const collectionHarness = read(path.join("tests", "learning-automation-release-evidence-collection-service.test.js"));
  assert.match(collectionHarness, /composes bundle, audit, readiness, and collection run/);
  assert.match(collectionHarness, /gates collection-run writes/);
  assert.match(collectionHarness, /gates release evidence record writes/);
  assert.match(collectionHarness, /surfaces release evidence record failures/);
  assert.match(collectionHarness, /rejects privacy-risk input and artifacts/);

  const collectionScriptHarness = read(path.join("tests", "growth-release-evidence-collection-smoke-script.test.js"));
  assert.match(collectionScriptHarness, /fails closed for write without allow-write/);
  assert.match(collectionScriptHarness, /release evidence record write without allow-write/);
  assert.match(collectionScriptHarness, /record a summary-only collection run/);

  const releaseWorkbenchService = read(path.join("src", "services", "learning-automation-release-workbench-service.js"));
  const releaseEvidenceTaskRegistry = read(path.join("src", "services", "learning-automation-release-evidence-task-registry.js"));
  assert.match(releaseWorkbenchService, /write_release_evidence_records: true/);
  assert.match(releaseWorkbenchService, /COLLECTION_OWNED_RELEASE_EVIDENCE_KEYS/);
  assert.match(releaseWorkbenchService, /releaseEvidenceCollectionTaskIdForKey/);
  assert.match(releaseWorkbenchService, /writeGatedReleaseEvidenceCollectionTaskIdForKey/);
  assert.match(releaseEvidenceTaskRegistry, /release_evidence_bundle_audit/);
  assert.match(releaseEvidenceTaskRegistry, /productionOperatingLoopHistorySmokeEvidence/);
  assert.match(releaseEvidenceTaskRegistry, /operating_loop_history/);
  assert.match(releaseEvidenceTaskRegistry, /production_deployment_health/);
  assert.match(releaseEvidenceTaskRegistry, /productionDeploymentHealthEvidence/);
  const releaseArtifactTemplateService = read(path.join("src", "services", "learning-automation-release-evidence-artifact-template-service.js"));
  assert.match(releaseArtifactTemplateService, /taskIdFromReleaseEvidenceKey/);
  assert.match(releaseArtifactTemplateService, /releaseEvidenceCollectionNeeded/);
  assert.match(releaseArtifactTemplateService, /releaseEvidenceCollectionTasks/);
  assert.doesNotMatch(releaseArtifactTemplateService, /learning-automation-release-evidence-bundle-service/);
  const artifactTemplateHarness = read(path.join("tests", "learning-automation-release-evidence-artifact-template-service.test.js"));
  assert.match(artifactTemplateHarness, /productionOperatingLoopHistorySmokeEvidence/);
  assert.match(artifactTemplateHarness, /release_evidence_bundle_audit/);
  assert.match(artifactTemplateHarness, /collection:operating_loop_history/);
  const releaseWorkbenchUi = read(path.join("public", "growth-card-generation-ui.js"));
  assert.match(releaseWorkbenchUi, /write_release_evidence_records/);

  assert.match(routeHarness, /release-evidence-collections\/run/);
  assert.match(routeHarness, /collectReleaseEvidence/);
  assert.match(routeHarness, /growth_automation_release_evidence_collection_owner_required/);

  const repositoryHarness = read(path.join("tests", "learning-automation-release-package-repository.test.js"));
  assert.match(repositoryHarness, /saves and lists summary-only package records/);
  assert.match(repositoryHarness, /rejects privacy risks/);
  assert.match(repositoryHarness, /readinessEvidenceSourceBundleId/);
});

test("Growth release-readiness evidence keys stay routable through workbench collection planning", () => {
  const readinessService = read(path.join("src", "services", "learning-automation-release-readiness-service.js"));
  const {
    isCollectionOwnedReleaseEvidenceKey,
    releaseEvidenceCollectionTaskIdForKey,
    writeGatedReleaseEvidenceCollectionTaskIdForKey
  } = require("../src/services/learning-automation-release-evidence-task-registry");

  const readinessKeys = [
    ...[...readinessService.matchAll(/presentCheck\(inputWithReleaseEvidence,\s*"([^"]+)",\s*"([^"]+)"/g)]
      .map((match) => match[2]),
    ...[...readinessService.matchAll(/uiEvidenceCheck\(inputWithReleaseEvidence,\s*"([^"]+)",\s*"([^"]+)"/g)]
      .map((match) => match[2]),
    "owner_review_evidence"
  ];
  assert.ok(readinessKeys.length >= 34, "release-readiness evidence coverage unexpectedly shrank");

  assert.equal(
    releaseEvidenceCollectionTaskIdForKey("production_operating_loop_history_smoke_evidence"),
    "operating_loop_history"
  );
  assert.equal(
    writeGatedReleaseEvidenceCollectionTaskIdForKey("production_daily_loop_write_smoke_evidence"),
    "daily_loop_write"
  );
  assert.equal(isCollectionOwnedReleaseEvidenceKey("release_evidence_bundle_audit"), true);
  assert.deepEqual(
    readinessKeys
      .filter((key) => !releaseEvidenceCollectionTaskIdForKey(key))
      .filter((key) => !writeGatedReleaseEvidenceCollectionTaskIdForKey(key))
      .filter((key) => !isCollectionOwnedReleaseEvidenceKey(key)),
    []
  );
});

test("Growth Owner audit smoke CLI stays service-owned and write-gated", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:owner-audit/);
  assert.match(packageJson, /smoke-growth-owner-audit\.js/);

  const script = read(path.join("scripts", "smoke-growth-owner-audit.js"));
  assert.match(script, /readEnv/);
  assert.match(script, /createServices/);
  assert.match(script, /learningCycleAuditService/);
  assert.match(script, /learningAuditCompletenessService/);
  assert.match(script, /learningEvidenceAuditService/);
  assert.match(script, /learningProfileDeltaAuditService/);
  assert.match(script, /learningOwnerCorrectionService/);
  assert.match(script, /listCycleAudit/);
  assert.match(script, /evaluateCycleCompleteness/);
  assert.match(script, /listEvidenceAudit/);
  assert.match(script, /listProfileDeltas/);
  assert.match(script, /listCorrections/);
  assert.match(script, /recordCorrection/);
  assert.match(script, /--allow-write/);
  assert.match(script, /owner_audit_smoke_write_not_allowed/);
  assert.match(script, /owner_audit_smoke_invalid_json/);
  assert.match(script, /owner_audit_smoke_privacy_failed/);
  assert.match(script, /workspace_id_required/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /learningDailyLoopService/);
  assert.doesNotMatch(script, /draftPlan/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /publishAcceptedProposal/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /executeOnce/);
  assert.doesNotMatch(script, /runOnce/);
  assert.doesNotMatch(script, /dryRun/);
  assert.doesNotMatch(script, /deliverHandoff/);
  assert.doesNotMatch(script, /activateStageAssessment/);

  const scriptHarness = read(path.join("tests", "growth-owner-audit-smoke-script.test.js"));
  assert.match(scriptHarness, /delegates read-only audit to all audit readback services/);
  assert.match(scriptHarness, /learningEvidenceAuditService/);
  assert.match(scriptHarness, /learningProfileDeltaAuditService/);
  assert.match(scriptHarness, /refreshes full audit/);
  assert.match(scriptHarness, /runs read-only audit on an empty DB without writing correction rows/);
  assert.match(scriptHarness, /fails closed for missing workspace, invalid JSON, privacy-risk input, and blocked writes/);
});

test("Growth Owner audit review closure stays service-owned, persisted, and summary-only", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:owner-audit-review/);
  assert.match(packageJson, /smoke-growth-owner-audit-review\.js/);

  const services = read(path.join("src", "app", "services.js"));
  assert.match(services, /createLearningOwnerAuditReviewService/);
  assert.match(services, /learningOwnerAuditReviewService/);
  assert.match(services, /learningOwnerAuditReviewRepository/);
  assert.match(services, /profileFeedbackService: learningProfileFeedbackEvidenceService/);

  const store = read(path.join("src", "stores", "growth-learning-sqlite-store.js"));
  assert.match(store, /createLearningOwnerAuditReviewRepository/);
  assert.match(store, /learningOwnerAuditReviewRepository/);

  const repository = read(path.join("src", "stores", "growth-learning-sqlite", "owner-audit-reviews.js"));
  assert.match(repository, /learning_growth_owner_audit_reviews/);
  assert.match(repository, /growth\.learningOwnerAuditReview\.v1/);
  assert.match(repository, /summaryOnly: true/);
  assert.match(repository, /learning_owner_audit_review_privacy_failed/);
  assert.match(repository, /privacy_class TEXT NOT NULL DEFAULT 'summary_only'/);
  assert.doesNotMatch(repository, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(repository, /generateCard|processEvaluationJob|activateStageAssessment|executeOnce|runOnce/);
  assert.doesNotMatch(repository, /rawAnswer:/);
  assert.doesNotMatch(repository, /rawPrompt:/);

  const service = read(path.join("src", "services", "learning-owner-audit-review-service.js"));
  assert.match(service, /createLearningOwnerAuditReviewService/);
  assert.match(service, /profileFeedbackService\.evaluate/);
  assert.match(service, /repository\.recordReview/);
  assert.match(service, /repository\.listReviews/);
  assert.match(service, /growth\.learningOwnerAuditReview\.v1/);
  assert.match(service, /summary_only/);
  assert.match(service, /learning_owner_audit_review_cycle_selector_required/);
  assert.match(service, /learning_owner_audit_review_correction_required/);
  assert.doesNotMatch(service, /learning_growth_/);
  assert.doesNotMatch(service, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(service, /learningDailyLoopService|draftPlan|publishPlanItem|generateCard|evaluateSubmission|processEvaluationJob/);
  assert.doesNotMatch(service, /executeOnce|runOnce|dryRun|deliverHandoff|activateStageAssessment/);
  assert.doesNotMatch(service, /rawAnswer:/);
  assert.doesNotMatch(service, /rawPrompt:/);

  const routes = read(path.join("src", "routes", "growth-routes.js"));
  assert.match(routes, /\/api\/v1\/growth\/owner-audit\/reviews/);
  assert.match(routes, /learningOwnerAuditReviewService\.listReviews/);
  assert.match(routes, /learningOwnerAuditReviewService\.review/);
  assert.match(routes, /growth_owner_audit_review_owner_required/);

  const script = read(path.join("scripts", "smoke-growth-owner-audit-review.js"));
  assert.match(script, /createServices/);
  assert.match(script, /learningOwnerAuditReviewService/);
  assert.match(script, /listReviews/);
  assert.match(script, /review/);
  assert.match(script, /--allow-write/);
  assert.match(script, /owner_audit_review_smoke_write_requires_allow_write/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /learningDailyLoopService|draftPlan|publishPlanItem|generateCard|evaluateSubmission|processEvaluationJob/);
  assert.doesNotMatch(script, /executeOnce|runOnce|dryRun|deliverHandoff|activateStageAssessment/);

  const serviceHarness = read(path.join("tests", "learning-owner-audit-review-service.test.js"));
  assert.match(serviceHarness, /records completed-cycle review through profile feedback and repository/);
  assert.match(serviceHarness, /requires explicit cycle selector unless auto-select is requested/);
  assert.match(serviceHarness, /fails closed for privacy risk/);

  const scriptHarness = read(path.join("tests", "growth-owner-audit-review-smoke-script.test.js"));
  assert.match(scriptHarness, /read-only by default and write-gated/);
  assert.match(scriptHarness, /lists empty local DB through normal service graph/);
});

test("Growth automation action handoff smoke CLI stays service-owned and write-gated", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:action-handoff/);
  assert.match(packageJson, /smoke-growth-automation-action-handoff\.js/);
  assert.match(packageJson, /learning-automation-action-handoff-service\.js/);

  const script = read(path.join("scripts", "smoke-growth-automation-action-handoff.js"));
  assert.match(script, /readEnv/);
  assert.match(script, /createServices/);
  assert.match(script, /learningAutomationActionHandoffService/);
  assert.match(script, /listHandoffs/);
  assert.match(script, /createHandoff/);
  assert.match(script, /deliverHandoff/);
  assert.match(script, /--allow-write/);
  assert.match(script, /automation_action_handoff_smoke_write_not_allowed/);
  assert.match(script, /automation_action_handoff_smoke_invalid_json/);
  assert.match(script, /automation_action_handoff_smoke_operation_invalid/);
  assert.match(script, /workspace_id_required/);
  assert.match(script, /digest_id_required/);
  assert.match(script, /handoff_id_required/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /learningDailyLoopService/);
  assert.doesNotMatch(script, /draftPlan/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /publishAcceptedProposal/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /executeOnce/);
  assert.doesNotMatch(script, /runOnce/);
  assert.doesNotMatch(script, /dryRun/);
  assert.doesNotMatch(script, /activateStageAssessment/);

  const scriptHarness = read(path.join("tests", "growth-automation-action-handoff-smoke-script.test.js"));
  assert.match(scriptHarness, /lists without writing by default/);
  assert.match(scriptHarness, /creates and delivers only with explicit write flag/);
  assert.match(scriptHarness, /fails closed for missing input, invalid JSON, invalid operation, and privacy risk/);
});

test("Growth automation digest smoke CLI stays service-owned and write-gated", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:digest/);
  assert.match(packageJson, /smoke-growth-automation-digest\.js/);
  assert.match(packageJson, /learning-automation-digest-service\.js/);

  const script = read(path.join("scripts", "smoke-growth-automation-digest.js"));
  assert.match(script, /readEnv/);
  assert.match(script, /createServices/);
  assert.match(script, /learningAutomationDigestService/);
  assert.match(script, /listDigests/);
  assert.match(script, /getDigest/);
  assert.match(script, /createDigest/);
  assert.match(script, /reviewDigest/);
  assert.match(script, /--allow-write/);
  assert.match(script, /automation_digest_smoke_write_not_allowed/);
  assert.match(script, /automation_digest_smoke_invalid_json/);
  assert.match(script, /automation_digest_smoke_operation_invalid/);
  assert.match(script, /workspace_id_required/);
  assert.match(script, /digest_id_required/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /learningDailyLoopService/);
  assert.doesNotMatch(script, /draftPlan/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /publishAcceptedProposal/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /executeOnce/);
  assert.doesNotMatch(script, /runOnce/);
  assert.doesNotMatch(script, /learningAutomationSchedulerService|schedulerService\.dryRun/);
  assert.doesNotMatch(script, /deliverHandoff/);
  assert.doesNotMatch(script, /activateStageAssessment/);

  const scriptHarness = read(path.join("tests", "growth-automation-digest-smoke-script.test.js"));
  assert.match(scriptHarness, /lists without writing by default/);
  assert.match(scriptHarness, /creates, reviews, gets, and lists only with explicit write flag/);
  assert.match(scriptHarness, /fails closed for missing input, invalid JSON, invalid operation, and privacy risk/);
});

test("Growth automation proposal smoke CLI stays service-owned and write-gated", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:proposal/);
  assert.match(packageJson, /smoke-growth-automation-proposal\.js/);
  assert.match(packageJson, /learning-automation-proposal-service\.js/);

  const script = read(path.join("scripts", "smoke-growth-automation-proposal.js"));
  assert.match(script, /readEnv/);
  assert.match(script, /createServices/);
  assert.match(script, /learningAutomationProposalService/);
  assert.match(script, /listProposals/);
  assert.match(script, /createProposal/);
  assert.match(script, /reviewProposal/);
  assert.match(script, /publishAcceptedProposal/);
  assert.match(script, /--allow-write/);
  assert.match(script, /automation_proposal_smoke_write_not_allowed/);
  assert.match(script, /automation_proposal_smoke_invalid_json/);
  assert.match(script, /automation_proposal_smoke_operation_invalid/);
  assert.match(script, /workspace_id_required/);
  assert.match(script, /proposal_id_required/);
  assert.match(script, /source_cycle_required/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /learningDailyLoopService/);
  assert.doesNotMatch(script, /draftPlan/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /executeOnce/);
  assert.doesNotMatch(script, /runOnce/);
  assert.doesNotMatch(script, /dryRun/);
  assert.doesNotMatch(script, /deliverHandoff/);
  assert.doesNotMatch(script, /activateStageAssessment/);

  const scriptHarness = read(path.join("tests", "growth-automation-proposal-smoke-script.test.js"));
  assert.match(scriptHarness, /lists without writing by default/);
  assert.match(scriptHarness, /gates writes and delegates failed create through service/);
  assert.match(scriptHarness, /fails closed for missing input, invalid JSON, invalid operation, and privacy risk/);
});

test("Growth automation failure policy smoke CLI stays service-owned and write-gated", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:failure-policy/);
  assert.match(packageJson, /smoke-growth-automation-failure-policy\.js/);
  assert.match(packageJson, /learning-automation-failure-policy-service\.js/);

  const script = read(path.join("scripts", "smoke-growth-automation-failure-policy.js"));
  assert.match(script, /readEnv/);
  assert.match(script, /createServices/);
  assert.match(script, /learningAutomationFailurePolicyService/);
  assert.match(script, /evaluateReadiness/);
  assert.match(script, /listPolicies/);
  assert.match(script, /createPolicy/);
  assert.match(script, /reviewPolicy/);
  assert.match(script, /--allow-write/);
  assert.match(script, /automation_failure_policy_smoke_write_not_allowed/);
  assert.match(script, /automation_failure_policy_smoke_invalid_json/);
  assert.match(script, /automation_failure_policy_smoke_operation_invalid/);
  assert.match(script, /workspace_id_required/);
  assert.match(script, /policy_id_required/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /learningDailyLoopService/);
  assert.doesNotMatch(script, /draftPlan/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /publishAcceptedProposal/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /executeOnce/);
  assert.doesNotMatch(script, /runOnce/);
  assert.doesNotMatch(script, /dryRun/);
  assert.doesNotMatch(script, /deliverHandoff/);
  assert.doesNotMatch(script, /activateStageAssessment/);

  const scriptHarness = read(path.join("tests", "growth-automation-failure-policy-smoke-script.test.js"));
  assert.match(scriptHarness, /checks readiness without writing by default/);
  assert.match(scriptHarness, /creates and activates policy only with explicit write flag/);
  assert.match(scriptHarness, /fails closed for missing input, invalid JSON, invalid operation, and privacy risk/);
});

test("Growth automation owner review evidence smoke CLI stays service-owned and no-write", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:owner-review-evidence/);
  assert.match(packageJson, /smoke-growth-automation-owner-review-evidence\.js/);
  assert.match(packageJson, /learning-automation-owner-review-evidence-service\.js/);

  const script = read(path.join("scripts", "smoke-growth-automation-owner-review-evidence.js"));
  assert.match(script, /readEnv/);
  assert.match(script, /createServices/);
  assert.match(script, /learningAutomationOwnerReviewEvidenceService/);
  assert.match(script, /evaluate/);
  assert.match(script, /automation_owner_review_evidence_smoke_workspace_required/);
  assert.doesNotMatch(script, /--allow-write/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /learningDailyLoopService/);
  assert.doesNotMatch(script, /draftPlan/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /publishAcceptedProposal/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /executeOnce/);
  assert.doesNotMatch(script, /runOnce/);
  assert.doesNotMatch(script, /dryRun/);
  assert.doesNotMatch(script, /deliverHandoff/);
  assert.doesNotMatch(script, /activateStageAssessment/);

  const scriptHarness = read(path.join("tests", "growth-automation-owner-review-evidence-smoke-script.test.js"));
  assert.match(scriptHarness, /delegates only to service evaluate/);
  assert.match(scriptHarness, /runs no-write read model against a temporary SQLite db/);

  const bundleService = read(path.join("src", "services", "learning-automation-release-evidence-bundle-service.js"));
  assert.match(bundleService, /ownerReviewSummaryFromSmoke/);
  assert.match(bundleService, /proposedProposalCount/);
  assert.match(bundleService, /supersededProposalCount/);
  assert.match(bundleService, /failedProposalExecutionCount/);
  assert.match(bundleService, /reviewedDigestCount/);
  assert.match(bundleService, /deliveredHandoffCount/);
  assert.match(bundleService, /publishedSchedulerExecutionCount/);
  assert.match(bundleService, /completedSchedulerRunCount/);
  assert.match(bundleService, /pendingWorkerTargetReviewCount/);
  assert.match(bundleService, /failurePolicyStatus/);

  const bundleHarness = read(path.join("tests", "learning-automation-release-evidence-bundle-service.test.js"));
  assert.match(bundleHarness, /preserves owner-review proposal lifecycle and stage counts/);
  assert.match(bundleHarness, /digestRequiredActionCount/);
  assert.match(bundleHarness, /blockedActionHandoffCount/);
  assert.match(bundleHarness, /skippedSchedulerRunCount/);
});

test("Growth automation release approval smoke CLI stays service-owned and write-gated", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:release-approval/);
  assert.match(packageJson, /smoke-growth-automation-release-approval\.js/);
  assert.match(packageJson, /learning-automation-release-approval-service\.js/);
  assert.match(packageJson, /smoke:release-evidence/);
  assert.match(packageJson, /smoke-growth-automation-release-evidence\.js/);
  assert.match(packageJson, /learning-automation-release-evidence-service\.js/);

  const script = read(path.join("scripts", "smoke-growth-automation-release-approval.js"));
  assert.match(script, /readEnv/);
  assert.match(script, /createServices/);
  assert.match(script, /learningAutomationReleaseApprovalService/);
  assert.match(script, /listApprovals/);
  assert.match(script, /approvalBag/);
  assert.match(script, /recordApproval/);
  assert.match(script, /--allow-write/);
  assert.match(script, /automation_release_approval_smoke_write_not_allowed/);
  assert.match(script, /automation_release_approval_smoke_invalid_json/);
  assert.match(script, /automation_release_approval_smoke_operation_invalid/);
  assert.match(script, /workspace_id_required/);
  assert.match(script, /approval_key_required/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /learningDailyLoopService/);
  assert.doesNotMatch(script, /draftPlan/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /publishAcceptedProposal/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /executeOnce/);
  assert.doesNotMatch(script, /runOnce/);
  assert.doesNotMatch(script, /dryRun/);
  assert.doesNotMatch(script, /deliverHandoff/);
  assert.doesNotMatch(script, /activateStageAssessment/);

  const scriptHarness = read(path.join("tests", "growth-automation-release-approval-smoke-script.test.js"));
  assert.match(scriptHarness, /parses default read-only list input/);
  assert.match(scriptHarness, /requires explicit allow-write for record/);
  assert.match(scriptHarness, /delegates operations to service only/);
  assert.match(scriptHarness, /rejects privacy-risk values before persisting/);
  assert.match(scriptHarness, /temporary SQLite db when explicitly allowed/);

  const releaseEvidenceScript = read(path.join("scripts", "smoke-growth-automation-release-evidence.js"));
  assert.match(releaseEvidenceScript, /readEnv/);
  assert.match(releaseEvidenceScript, /createServices/);
  assert.match(releaseEvidenceScript, /learningAutomationReleaseEvidenceService/);
  assert.match(releaseEvidenceScript, /listEvidence/);
  assert.match(releaseEvidenceScript, /evidenceBag/);
  assert.match(releaseEvidenceScript, /recordEvidence/);
  assert.match(releaseEvidenceScript, /--allow-write/);
  assert.match(releaseEvidenceScript, /automation_release_evidence_smoke_write_not_allowed/);
  assert.match(releaseEvidenceScript, /automation_release_evidence_smoke_invalid_json/);
  assert.match(releaseEvidenceScript, /automation_release_evidence_smoke_operation_invalid/);
  assert.match(releaseEvidenceScript, /workspace_id_required/);
  assert.doesNotMatch(releaseEvidenceScript, /learningAutomationUiEvidenceService/);
  assert.doesNotMatch(releaseEvidenceScript, /require\(["']\.\.\/src\/stores/);
  assert.match(releaseEvidenceScript, /evidence_key_required/);
  assert.doesNotMatch(releaseEvidenceScript, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(releaseEvidenceScript, /learning_growth_/);
  assert.doesNotMatch(releaseEvidenceScript, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(releaseEvidenceScript, /learningDailyLoopService/);
  assert.doesNotMatch(releaseEvidenceScript, /draftPlan/);
  assert.doesNotMatch(releaseEvidenceScript, /publishPlanItem/);
  assert.doesNotMatch(releaseEvidenceScript, /publishAcceptedProposal/);
  assert.doesNotMatch(releaseEvidenceScript, /generateCard/);
  assert.doesNotMatch(releaseEvidenceScript, /evaluateSubmission/);
  assert.doesNotMatch(releaseEvidenceScript, /executeOnce/);
  assert.doesNotMatch(releaseEvidenceScript, /runOnce/);
  assert.doesNotMatch(releaseEvidenceScript, /dryRun/);
  assert.doesNotMatch(releaseEvidenceScript, /deliverHandoff/);
  assert.doesNotMatch(releaseEvidenceScript, /activateStageAssessment/);

  const releaseEvidenceScriptHarness = read(path.join("tests", "growth-automation-release-evidence-smoke-script.test.js"));
  assert.match(releaseEvidenceScriptHarness, /parses default read-only list input/);
  assert.match(releaseEvidenceScriptHarness, /requires explicit allow-write for record/);
  assert.match(releaseEvidenceScriptHarness, /delegates operations to service only/);
  assert.match(releaseEvidenceScriptHarness, /temporary SQLite db when explicitly allowed/);

  const authorizationScriptHarness = read(path.join("tests", "growth-release-authorization-smoke-script.test.js"));
  assert.match(authorizationScriptHarness, /parses bounded scope/);
  assert.match(authorizationScriptHarness, /delegates to service only/);
  assert.match(authorizationScriptHarness, /temporary SQLite db/);

  const closureScriptHarness = read(path.join("tests", "growth-release-closure-smoke-script.test.js"));
  assert.match(closureScriptHarness, /parses bounded scope/);
  assert.match(closureScriptHarness, /delegates to service only/);
  assert.match(closureScriptHarness, /temporary SQLite db/);

  const activationScriptHarness = read(path.join("tests", "growth-release-activation-smoke-script.test.js"));
  assert.match(activationScriptHarness, /parses bounded scope/);
  assert.match(activationScriptHarness, /delegates operations to service only and gates writes/);
  assert.match(activationScriptHarness, /temporary SQLite db/);
  assert.match(activationScriptHarness, /when explicitly allowed/);

  const runtimeEnablementScriptHarness = read(path.join("tests", "growth-runtime-enablement-smoke-script.test.js"));
  assert.match(runtimeEnablementScriptHarness, /parses bounded scope/);
  assert.match(runtimeEnablementScriptHarness, /delegates operations to service only and gates writes/);
  assert.match(runtimeEnablementScriptHarness, /temporary SQLite db/);
  assert.match(runtimeEnablementScriptHarness, /when explicitly allowed/);

  const releaseControlsScriptHarness = read(path.join("tests", "growth-release-controls-smoke-script.test.js"));
  assert.match(releaseControlsScriptHarness, /parses bounded scope/);
  assert.match(releaseControlsScriptHarness, /delegates only to service summary/);
  assert.match(releaseControlsScriptHarness, /temporary SQLite db/);

  const releaseDashboardScriptHarness = read(path.join("tests", "growth-release-dashboard-smoke-script.test.js"));
  assert.match(releaseDashboardScriptHarness, /parses bounded scope/);
  assert.match(releaseDashboardScriptHarness, /delegates only to service dashboard/);
  assert.match(releaseDashboardScriptHarness, /temporary SQLite db/);
});

test("Growth automation scheduler execution smoke CLI stays service-owned and write-gated", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:scheduler-execution/);
  assert.match(packageJson, /smoke-growth-automation-scheduler-execution\.js/);
  assert.match(packageJson, /learning-automation-scheduler-execution-service\.js/);

  const script = read(path.join("scripts", "smoke-growth-automation-scheduler-execution.js"));
  assert.match(script, /readEnv/);
  assert.match(script, /createServices/);
  assert.match(script, /learningAutomationSchedulerExecutionService/);
  assert.match(script, /listExecutions/);
  assert.match(script, /executeOnce/);
  assert.match(script, /--allow-write/);
  assert.match(script, /automation_scheduler_execution_smoke_write_not_allowed/);
  assert.match(script, /automation_scheduler_execution_smoke_invalid_json/);
  assert.match(script, /automation_scheduler_execution_smoke_operation_invalid/);
  assert.match(script, /workspace_id_required/);
  assert.match(script, /handoff_id_required/);
  assert.match(script, /proposal_id_required/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /learningDailyLoopService/);
  assert.doesNotMatch(script, /learningAutomationProposalService/);
  assert.doesNotMatch(script, /learningAutomationSchedulerService|schedulerService\.dryRun/);
  assert.doesNotMatch(script, /draftPlan/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /publishAcceptedProposal/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /runOnce/);
  assert.doesNotMatch(script, /deliverHandoff/);
  assert.doesNotMatch(script, /activateStageAssessment/);

  const scriptHarness = read(path.join("tests", "growth-automation-scheduler-execution-smoke-script.test.js"));
  assert.match(scriptHarness, /lists without writing by default/);
  assert.match(scriptHarness, /records disabled execution only with explicit write flag/);
  assert.match(scriptHarness, /fails closed for missing input, invalid JSON, invalid operation, and privacy risk/);
});

test("Growth automation scheduler run smoke CLI stays service-owned and write-gated", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:scheduler-run/);
  assert.match(packageJson, /smoke-growth-automation-scheduler-run\.js/);
  assert.match(packageJson, /learning-automation-scheduler-run-service\.js/);

  const script = read(path.join("scripts", "smoke-growth-automation-scheduler-run.js"));
  assert.match(script, /readEnv/);
  assert.match(script, /createServices/);
  assert.match(script, /learningAutomationSchedulerRunService/);
  assert.match(script, /listRuns/);
  assert.match(script, /runOnce/);
  assert.match(script, /--allow-write/);
  assert.match(script, /automation_scheduler_run_smoke_write_not_allowed/);
  assert.match(script, /automation_scheduler_run_smoke_invalid_json/);
  assert.match(script, /automation_scheduler_run_smoke_operation_invalid/);
  assert.match(script, /workspace_id_required/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /learningDailyLoopService/);
  assert.doesNotMatch(script, /learningAutomationActionHandoffService/);
  assert.doesNotMatch(script, /learningAutomationProposalService/);
  assert.doesNotMatch(script, /learningAutomationSchedulerExecutionService/);
  assert.doesNotMatch(script, /learningAutomationSchedulerService|\.dryRun/);
  assert.doesNotMatch(script, /draftPlan/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /publishAcceptedProposal/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /executeOnce/);
  assert.doesNotMatch(script, /deliverHandoff/);
  assert.doesNotMatch(script, /activateStageAssessment/);

  const scriptHarness = read(path.join("tests", "growth-automation-scheduler-run-smoke-script.test.js"));
  assert.match(scriptHarness, /lists without writing by default/);
  assert.match(scriptHarness, /records disabled run only with explicit write flag/);
  assert.match(scriptHarness, /fails closed for missing input, invalid JSON, invalid operation, and privacy risk/);
});

test("Growth automation scheduler worker target smoke CLI stays service-owned and write-gated", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:scheduler-worker-target/);
  assert.match(packageJson, /smoke-growth-automation-scheduler-worker-target\.js/);
  assert.match(packageJson, /learning-automation-scheduler-worker-target-service\.js/);

  const script = read(path.join("scripts", "smoke-growth-automation-scheduler-worker-target.js"));
  assert.match(script, /readEnv/);
  assert.match(script, /createServices/);
  assert.match(script, /learningAutomationSchedulerWorkerTargetService/);
  assert.match(script, /listTargets/);
  assert.match(script, /listRunnableTargets/);
  assert.match(script, /createTarget/);
  assert.match(script, /reviewTarget/);
  assert.match(script, /--allow-write/);
  assert.match(script, /automation_scheduler_worker_target_smoke_write_not_allowed/);
  assert.match(script, /automation_scheduler_worker_target_smoke_invalid_json/);
  assert.match(script, /automation_scheduler_worker_target_smoke_operation_invalid/);
  assert.match(script, /workspace_id_required/);
  assert.match(script, /target_id_required/);
  assert.match(script, /review_status_required/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /learningDailyLoopService/);
  assert.doesNotMatch(script, /learningAutomationActionHandoffService/);
  assert.doesNotMatch(script, /learningAutomationProposalService/);
  assert.doesNotMatch(script, /learningAutomationSchedulerExecutionService/);
  assert.doesNotMatch(script, /learningAutomationSchedulerRunService/);
  assert.doesNotMatch(script, /learningAutomationSchedulerService|\.dryRun/);
  assert.doesNotMatch(script, /draftPlan/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /publishAcceptedProposal/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /executeOnce/);
  assert.doesNotMatch(script, /runOnce/);
  assert.doesNotMatch(script, /deliverHandoff/);
  assert.doesNotMatch(script, /activateStageAssessment/);

  const scriptHarness = read(path.join("tests", "growth-automation-scheduler-worker-target-smoke-script.test.js"));
  assert.match(scriptHarness, /lists without writing by default/);
  assert.match(scriptHarness, /creates, reviews, and lists runnable targets only with explicit write flag/);
  assert.match(scriptHarness, /fails closed for missing input, invalid JSON, invalid operation, missing review fields, and privacy risk/);
});

test("Growth automation scheduler worker smoke CLI stays service-owned and write-gated", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:scheduler-worker/);
  assert.match(packageJson, /smoke-growth-automation-scheduler-worker\.js/);
  assert.match(packageJson, /learning-automation-scheduler-worker-service\.js/);

  const script = read(path.join("scripts", "smoke-growth-automation-scheduler-worker.js"));
  assert.match(script, /readEnv/);
  assert.match(script, /createServices/);
  assert.match(script, /learningAutomationSchedulerWorkerService/);
  assert.match(script, /tickTargets/);
  assert.match(script, /tick/);
  assert.match(script, /--allow-write/);
  assert.match(script, /automation_scheduler_worker_smoke_write_not_allowed/);
  assert.match(script, /automation_scheduler_worker_smoke_invalid_json/);
  assert.match(script, /automation_scheduler_worker_smoke_operation_invalid/);
  assert.match(script, /automation_scheduler_worker_smoke_privacy_failed/);
  assert.match(script, /workspace_id_required/);
  assert.match(script, /expectedDisabled/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /learningDailyLoopService/);
  assert.doesNotMatch(script, /learningAutomationActionHandoffService/);
  assert.doesNotMatch(script, /learningAutomationProposalService/);
  assert.doesNotMatch(script, /learningAutomationSchedulerExecutionService/);
  assert.doesNotMatch(script, /learningAutomationSchedulerRunService/);
  assert.doesNotMatch(script, /learningAutomationSchedulerService|\.dryRun/);
  assert.doesNotMatch(script, /learningAutomationSchedulerWorkerTargetService/);
  assert.doesNotMatch(script, /draftPlan/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /publishAcceptedProposal/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /executeOnce/);
  assert.doesNotMatch(script, /runOnce/);
  assert.doesNotMatch(script, /deliverHandoff/);
  assert.doesNotMatch(script, /activateStageAssessment/);

  const scriptHarness = read(path.join("tests", "growth-automation-scheduler-worker-smoke-script.test.js"));
  assert.match(scriptHarness, /reports disabled status without writing by default/);
  assert.match(scriptHarness, /ticks configured targets only with explicit write flag/);
  assert.match(scriptHarness, /fails closed for missing input, invalid JSON, invalid operation, invalid mode, and privacy risk/);
});

test("Growth daily-loop preview smoke CLI stays service-owned and no-write", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:daily-loop-preview/);
  assert.match(packageJson, /smoke-growth-daily-loop-preview\.js/);
  assert.match(packageJson, /learning-daily-loop-service\.js/);

  const script = read(path.join("scripts", "smoke-growth-daily-loop-preview.js"));
  assert.match(script, /readEnv/);
  assert.match(script, /createServices/);
  assert.match(script, /learningDailyLoopService\.preview/);
  assert.match(script, /workspace_id_required/);
  assert.match(script, /daily_loop_preview_smoke_invalid_json/);
  assert.match(script, /--input-json/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /learningDailyLoopService\.draft/);
  assert.doesNotMatch(script, /learningDailyLoopService\.publish/);
  assert.doesNotMatch(script, /draftPlan/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /publishAcceptedProposal/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /executeOnce/);
  assert.doesNotMatch(script, /runOnce/);
  assert.doesNotMatch(script, /dryRun/);
  assert.doesNotMatch(script, /deliverHandoff/);
  assert.doesNotMatch(script, /activateStageAssessment/);

  const scriptHarness = read(path.join("tests", "growth-daily-loop-preview-smoke-script.test.js"));
  assert.match(scriptHarness, /delegates to service without writing by default/);
  assert.match(scriptHarness, /fails closed for privacy-risk input/);
  assert.match(scriptHarness, /fails closed for missing workspace and invalid JSON/);
});

test("Growth learning-loop state smoke CLI stays service-owned, summary-only, and no-write", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:learning-loop-state/);
  assert.match(packageJson, /smoke-growth-learning-loop-state\.js/);
  assert.match(packageJson, /learning-loop-state-service\.js/);

  const script = read(path.join("scripts", "smoke-growth-learning-loop-state.js"));
  assert.match(script, /readEnv/);
  assert.match(script, /createServices/);
  assert.match(script, /learningLoopStateService\.state/);
  assert.match(script, /workspace_id_required/);
  assert.match(script, /learning_loop_state_smoke_invalid_json/);
  assert.match(script, /--input-json/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /learningDailyLoopService\.preview/);
  assert.doesNotMatch(script, /learningDailyLoopService\.draft/);
  assert.doesNotMatch(script, /learningDailyLoopService\.publish/);
  assert.doesNotMatch(script, /draftPlan/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /publishAcceptedProposal/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /executeOnce/);
  assert.doesNotMatch(script, /runOnce/);
  assert.doesNotMatch(script, /dryRun/);
  assert.doesNotMatch(script, /deliverHandoff/);
  assert.doesNotMatch(script, /activateStageAssessment/);

  const service = read(path.join("src", "services", "learning-loop-state-service.js"));
  assert.match(service, /growth\.learningLoopState\.v1/);
  assert.match(service, /growth\.learningLoopState\.recommendationEvidence\.v1/);
  assert.match(service, /privacyClass: "summary_only"/);
  assert.match(service, /summaryOnly: true/);
  assert.match(service, /dailyLoopService\.preview/);
  assert.match(service, /stageAssessmentService\.stageReadiness/);
  assert.match(service, /recommendationEvidenceFrom/);
  assert.match(service, /ownerReviewSignalService/);
  assert.match(service, /ownerAuditReviewIds/);
  assert.match(service, /evidenceTrace/);
  assert.match(service, /auditTrace/);
  assert.match(service, /profileTrace/);
  assert.match(service, /draft_daily_plan/);
  assert.match(service, /publish_selected_plan_item/);
  assert.match(service, /complete_cycle_audit/);
  assert.match(service, /review_stage_assessment/);
  assert.doesNotMatch(service, /require\(["']\.\.\/stores/);
  assert.doesNotMatch(service, /learning_growth_/);
  assert.doesNotMatch(service, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(service, /publishPlanItem/);
  assert.doesNotMatch(service, /generateCard/);
  assert.doesNotMatch(service, /evaluateSubmission/);
  assert.doesNotMatch(service, /executeOnce/);
  assert.doesNotMatch(service, /runOnce/);
  assert.doesNotMatch(service, /deliverHandoff/);
  assert.doesNotMatch(service, /activateStageAssessment/);

  const serviceHarness = read(path.join("tests", "learning-loop-state-service.test.js"));
  assert.match(serviceHarness, /projects a summary-only ready-to-draft state/);
  assert.match(serviceHarness, /recommendationEvidence/);
  assert.match(serviceHarness, /links Owner review signal into recommendation evidence/);
  assert.match(serviceHarness, /traj_science_1/);
  assert.match(serviceHarness, /prefers publish when a selected plan is ready/);
  assert.match(serviceHarness, /surfaces incomplete audit before drafting more work/);
  assert.match(serviceHarness, /surfaces stage checkpoint readiness/);
  assert.match(serviceHarness, /fails closed for privacy-risk input and missing dependencies/);

  const scriptHarness = read(path.join("tests", "growth-learning-loop-state-smoke-script.test.js"));
  assert.match(scriptHarness, /delegates to service without writing/);
  assert.match(scriptHarness, /learningLoopStateOwnerReviewStatus/);
  assert.match(scriptHarness, /fails closed for privacy-risk input/);
  assert.match(scriptHarness, /fails closed for missing workspace and invalid JSON/);
});

test("Growth operating-loop smoke CLI stays service-owned and gates writes", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:operating-loop/);
  assert.match(packageJson, /smoke-growth-operating-loop\.js/);
  assert.match(packageJson, /learning-operating-loop-service\.js/);

  const script = read(path.join("scripts", "smoke-growth-operating-loop.js"));
  assert.match(script, /learningOperatingLoopService\.recommend/);
  assert.match(script, /learningOperatingLoopService\.runNext/);
  assert.match(script, /learningOperatingLoopService\.listRuns/);
  assert.match(script, /operating_loop_write_requires_allow_write/);
  assert.match(script, /--allow-write/);
  assert.match(script, /--allow-stage-activation/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /activateStageAssessment/);

  const service = read(path.join("src", "services", "learning-operating-loop-service.js"));
  assert.match(service, /growth\.learningOperatingLoop\.v1/);
  assert.match(service, /growth\.learningOperatingLoopRuns\.v1/);
  assert.match(service, /loopStateService\.state/);
  assert.match(service, /dailyLoopService\.advance/);
  assert.match(service, /dailyLoopService\.publish/);
  assert.match(service, /stageAssessmentService\.activateStageAssessment/);
  assert.match(service, /runRepository\.recordRun/);
  assert.match(service, /runRepository\.listRuns/);
  assert.match(service, /stage_assessment_owner_confirmation_required/);
  assert.doesNotMatch(service, /require\(["']\.\.\/stores/);
  assert.doesNotMatch(service, /learning_growth_/);
  assert.doesNotMatch(service, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);

  const route = read(path.join("src", "routes", "growth-routes.js"));
  assert.match(route, /learning-loop\/advance/);
  assert.match(route, /learning-loop\/runs/);
  assert.match(route, /learningOperatingLoopService\.runNext/);
  assert.match(route, /learningOperatingLoopService\.listRuns/);

  const repository = read(path.join("src", "stores", "growth-learning-sqlite", "operating-loop-runs.js"));
  assert.match(repository, /learning_growth_operating_loop_runs/);
  assert.match(repository, /createLearningOperatingLoopRunRepository/);
  assert.match(repository, /learning_operating_loop_run_privacy_failed/);
  assert.doesNotMatch(repository, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);

  const serviceHarness = read(path.join("tests", "learning-operating-loop-service.test.js"));
  assert.match(serviceHarness, /requires explicit owner confirmation before stage activation/);
  assert.match(serviceHarness, /executes ready-to-draft through daily-loop advance/);
  assert.match(serviceHarness, /publishes a selected plan item/);
  assert.match(serviceHarness, /lists persisted run audits/);

  const scriptHarness = read(path.join("tests", "growth-operating-loop-smoke-script.test.js"));
  assert.match(scriptHarness, /defaults to no-write recommend readback/);
  assert.match(scriptHarness, /lists persisted run audits without allow-write/);
  assert.match(scriptHarness, /blocks run-next writes without allow-write/);

  const repositoryHarness = read(path.join("tests", "learning-operating-loop-run-repository.test.js"));
  assert.match(repositoryHarness, /records and lists summary-only run audits/);
  assert.match(repositoryHarness, /rejects private payloads and non-summary writes/);
});

test("Growth learner-cycle smoke CLI stays service-owned and gates learner writes", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:learner-cycle/);
  assert.match(packageJson, /smoke-growth-learner-cycle\.js/);
  assert.match(packageJson, /learning-learner-cycle-service\.js/);

  const script = read(path.join("scripts", "smoke-growth-learner-cycle.js"));
  assert.match(script, /readEnv/);
  assert.match(script, /createServices/);
  assert.match(script, /learningLearnerCycleService/);
  assert.match(script, /service\.audit/);
  assert.match(script, /service\.submit/);
  assert.match(script, /service\.evaluate/);
  assert.match(script, /service\.reflect/);
  assert.match(script, /service\.full/);
  assert.match(script, /--allow-write/);
  assert.match(script, /learner_cycle_smoke_write_not_allowed/);
  assert.match(script, /learner_cycle_smoke_invalid_json/);
  assert.match(script, /workspace_id_required/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /draftPlan/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /publishAcceptedProposal/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /executeOnce/);
  assert.doesNotMatch(script, /runOnce/);
  assert.doesNotMatch(script, /dryRun/);
  assert.doesNotMatch(script, /deliverHandoff/);
  assert.doesNotMatch(script, /activateStageAssessment/);

  const service = read(path.join("src", "services", "learning-learner-cycle-service.js"));
  assert.match(service, /growth\.learningLearnerCycleSmoke\.v1/);
  assert.match(service, /privacyClass: "summary_only"/);
  assert.match(service, /summaryOnly: true/);
  assert.match(service, /growthService\.submitEvidence/);
  assert.match(service, /growthService\.submitReflection/);
  assert.match(service, /evaluationService\.processEvaluationQueue/);
  assert.match(service, /cycleAuditService\.listCycleAudit/);
  assert.match(service, /auditCompletenessService\.evaluateCycleCompleteness/);
  assert.match(service, /learning_learner_cycle_privacy_failed/);
  assert.doesNotMatch(service, /require\(["']\.\.\/stores/);
  assert.doesNotMatch(service, /learning_growth_/);
  assert.doesNotMatch(service, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(service, /draftPlan/);
  assert.doesNotMatch(service, /publishPlanItem/);
  assert.doesNotMatch(service, /publishAcceptedProposal/);
  assert.doesNotMatch(service, /generateCard/);
  assert.doesNotMatch(service, /executeOnce/);
  assert.doesNotMatch(service, /runOnce/);
  assert.doesNotMatch(service, /dryRun/);
  assert.doesNotMatch(service, /deliverHandoff/);
  assert.doesNotMatch(service, /activateStageAssessment/);

  const scriptHarness = read(path.join("tests", "growth-learner-cycle-smoke-script.test.js"));
  assert.match(scriptHarness, /defaults to no-write audit/);
  assert.match(scriptHarness, /rejects write operations without explicit write flag/);
  assert.match(scriptHarness, /runs submit, single evaluation, reflection, profile, and audit through services/);
  assert.match(scriptHarness, /fails closed for privacy-risk input/);
});

test("Growth daily-loop smoke CLI requires explicit writes and stays service-owned", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:daily-loop/);
  assert.match(packageJson, /smoke-growth-daily-loop\.js/);
  assert.match(packageJson, /learning-daily-loop-service\.js/);

  const script = read(path.join("scripts", "smoke-growth-daily-loop.js"));
  assert.match(script, /readEnv/);
  assert.match(script, /createServices/);
  assert.match(script, /learningDailyLoopService/);
  assert.match(script, /services\.learningDailyLoopService/);
  assert.match(script, /service\.preview/);
  assert.match(script, /service\.draft/);
  assert.match(script, /service\.publish/);
  assert.match(script, /--allow-write/);
  assert.match(script, /daily_loop_smoke_write_not_allowed/);
  assert.match(script, /daily_loop_smoke_plan_draft_id_required/);
  assert.match(script, /daily_loop_smoke_invalid_json/);
  assert.match(script, /workspace_id_required/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /draftPlan/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /publishAcceptedProposal/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /executeOnce/);
  assert.doesNotMatch(script, /runOnce/);
  assert.doesNotMatch(script, /dryRun/);
  assert.doesNotMatch(script, /deliverHandoff/);
  assert.doesNotMatch(script, /activateStageAssessment/);

  const scriptHarness = read(path.join("tests", "growth-daily-loop-smoke-script.test.js"));
  assert.match(scriptHarness, /defaults to no-write preview/);
  assert.match(scriptHarness, /rejects draft, publish, and advance without explicit write flag/);
  assert.match(scriptHarness, /drafts a summary-only plan only with explicit write flag/);
  assert.match(scriptHarness, /publishes a selected daily plan item only with explicit write flag/);
  assert.match(scriptHarness, /fails closed for invalid JSON and missing publish draft id/);
});

test("Growth scheduler dry-run smoke CLI stays service-owned and non-writeful", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:scheduler-dry-run/);
  assert.match(packageJson, /smoke-growth-scheduler-dry-run\.js/);
  assert.match(packageJson, /learning-automation-scheduler-service\.js/);

  const script = read(path.join("scripts", "smoke-growth-scheduler-dry-run.js"));
  assert.match(script, /readEnv/);
  assert.match(script, /createServices/);
  assert.match(script, /learningAutomationSchedulerService\.dryRun/);
  assert.match(script, /workspace_id_required/);
  assert.match(script, /scheduler_dry_run_smoke_invalid_json/);
  assert.match(script, /--input-json/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_automation_proposals/);
  assert.doesNotMatch(script, /learning_growth_automation_scheduler/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /draftPlan/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /publishAcceptedProposal/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /executeOnce/);
  assert.doesNotMatch(script, /runOnce/);
  assert.doesNotMatch(script, /deliverHandoff/);
  assert.doesNotMatch(script, /activateStageAssessment/);

  const scriptHarness = read(path.join("tests", "growth-scheduler-dry-run-smoke-script.test.js"));
  assert.match(scriptHarness, /delegates to service without writing by default/);
  assert.match(scriptHarness, /fails closed for privacy-risk input/);
  assert.match(scriptHarness, /fails closed for missing workspace and invalid JSON/);
});

test("Growth learner experience signal writes stay service-owned", () => {
  const services = read(path.join("src", "app", "services.js"));
  assert.match(services, /createLearningExperienceSignalService/);
  assert.match(services, /learningExperienceSignalService/);

  const signalService = read(path.join("src", "services", "learning-experience-signal-service.js"));
  assert.match(signalService, /recordExperienceSignal/);
  assert.match(signalService, /learner_feedback/);
  assert.match(signalService, /experience_signal_privacy_failed/);

  const routes = read(path.join("src", "routes", "growth-routes.js"));
  assert.match(routes, /experience-signals/);
  assert.doesNotMatch(routes, /recordExperienceSignal/);
  assert.doesNotMatch(routes, /learning_growth_experience_signals/);
});

test("Growth stage assessment activation stays service-owned", () => {
  const services = read(path.join("src", "app", "services.js"));
  assert.match(services, /createLearningStageAssessmentService/);
  assert.match(services, /learningStageAssessmentService/);
  assert.match(services, /createLearningStageCheckpointControlsService/);
  assert.match(services, /learningStageCheckpointControlsService/);
  assert.match(services, /stageAssessmentService: learningStageAssessmentService/);
  assert.match(services, /stageAssessmentCycleRepository/);

  const stageService = read(path.join("src", "services", "learning-stage-assessment-service.js"));
  assert.match(stageService, /evaluateEligibility/);
  assert.match(stageService, /stageReadiness/);
  assert.match(stageService, /activateStageAssessment/);
  assert.match(stageService, /stage_assessment/);

  const controlsService = read(path.join("src", "services", "learning-stage-checkpoint-controls-service.js"));
  assert.match(controlsService, /growth\.stageCheckpointControls\.v1/);
  assert.match(controlsService, /privacyClass: "summary_only"/);
  assert.match(controlsService, /summaryOnly: true/);
  assert.match(controlsService, /stageAssessmentService\.stageReadiness/);
  assert.match(controlsService, /dailyPlanDirectPublicationAllowed: false/);
  assert.match(controlsService, /activate_stage_assessment/);
  assert.match(controlsService, /learner_challenge_route/);
  assert.match(controlsService, /stage_checkpoint_controls_privacy_failed/);
  assert.doesNotMatch(controlsService, /require\(["']\.\.\/stores/);
  assert.doesNotMatch(controlsService, /learning_growth_/);
  assert.doesNotMatch(controlsService, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(controlsService, /publishPlanItem/);
  assert.doesNotMatch(controlsService, /generateCard/);
  assert.doesNotMatch(controlsService, /evaluateSubmission/);
  assert.doesNotMatch(controlsService, /executeOnce/);
  assert.doesNotMatch(controlsService, /runOnce/);
  assert.doesNotMatch(controlsService, /deliverHandoff/);
  assert.doesNotMatch(controlsService, /activateStageAssessment/);

  const controlsHarness = read(path.join("tests", "learning-stage-checkpoint-controls-service.test.js"));
  assert.match(controlsHarness, /summary-only Owner activation controls/);
  assert.match(controlsHarness, /blocks activation action during cooldown/);
  assert.match(controlsHarness, /fails closed for privacy risk and missing dependencies/);

  const routes = read(path.join("src", "routes", "growth-routes.js"));
  assert.match(routes, /stage-assessments\/controls/);
  assert.match(routes, /stage-assessments\/eligibility/);
  assert.match(routes, /stage-assessments\/activate/);
  assert.match(routes, /stage-assessments\/challenge/);
  assert.match(routes, /learningStageCheckpointControlsService\.controls/);
  assert.match(routes, /growth_stage_checkpoint_controls_owner_required/);
  assert.doesNotMatch(routes, /stageReadiness/);
  assert.doesNotMatch(routes, /learning_growth_stage_assessment_cycles/);
  assert.doesNotMatch(routes, /generateCard\(Object\.assign/);

  const apiClient = read(path.join("public", "growth-api-client.js"));
  assert.match(apiClient, /fetchGrowthStageCheckpointControls/);
  assert.match(apiClient, /stage-assessments", "controls"/);

  const ui = read(path.join("public", "growth-card-generation-ui.js"));
  assert.match(ui, /data-stage-checkpoint-controls-status/);
  assert.match(ui, /data-stage-checkpoint-activate-enabled/);
  assert.match(ui, /activate_stage_assessment/);

  const app = read(path.join("public", "app.js"));
  assert.match(app, /refreshStageCheckpointControls/);
  assert.match(app, /fetchGrowthStageCheckpointControls/);
  assert.match(app, /stage_checkpoint_controls_required/);
  assert.match(app, /activateAction\.enabled !== true/);
  assert.doesNotMatch(app, /stageReadiness/);
  assert.doesNotMatch(app, /learning_growth_stage_assessment_cycles/);
});

test("Growth stage-assessment smoke CLI stays service-owned and write-gated", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:stage-assessment/);
  assert.match(packageJson, /smoke-growth-stage-assessment\.js/);
  assert.match(packageJson, /learning-stage-assessment-service\.js/);

  const script = read(path.join("scripts", "smoke-growth-stage-assessment.js"));
  assert.match(script, /readEnv/);
  assert.match(script, /createServices/);
  assert.match(script, /learningStageAssessmentService/);
  assert.match(script, /stageReadiness/);
  assert.match(script, /evaluateEligibility/);
  assert.match(script, /activateStageAssessment/);
  assert.match(script, /recordAssessmentCompletion/);
  assert.match(script, /--allow-write/);
  assert.match(script, /stage_assessment_smoke_write_not_allowed/);
  assert.match(script, /stage_assessment_smoke_invalid_json/);
  assert.match(script, /stage_assessment_smoke_operation_invalid/);
  assert.match(script, /stage_assessment_smoke_privacy_failed/);
  assert.match(script, /workspace_id_required/);
  assert.match(script, /stage_assessment_target_required/);
  assert.match(script, /stage_assessment_activation_source_required/);
  assert.match(script, /stage_assessment_task_card_id_required/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /learningDailyLoopService/);
  assert.doesNotMatch(script, /learningAutomation/);
  assert.doesNotMatch(script, /draftPlan/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /publishAcceptedProposal/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /executeOnce/);
  assert.doesNotMatch(script, /runOnce/);
  assert.doesNotMatch(script, /dryRun/);
  assert.doesNotMatch(script, /deliverHandoff/);

  const scriptHarness = read(path.join("tests", "growth-stage-assessment-smoke-script.test.js"));
  assert.match(scriptHarness, /parses bounded stage checkpoint selectors/);
  assert.match(scriptHarness, /write-gates mutating operations/);
  assert.match(scriptHarness, /delegates operations to stage assessment service only/);
  assert.match(scriptHarness, /temporary SQLite db without creating stage cycles/);
  assert.match(scriptHarness, /fails closed for missing input, invalid JSON, privacy risk, and missing write prerequisites/);
});

test("Growth stage checkpoint controls smoke CLI stays read-only and service-owned", () => {
  const packageJson = read("package.json");
  assert.match(packageJson, /smoke:stage-checkpoint-controls/);
  assert.match(packageJson, /smoke-growth-stage-checkpoint-controls\.js/);

  const script = read(path.join("scripts", "smoke-growth-stage-checkpoint-controls.js"));
  assert.match(script, /readEnv/);
  assert.match(script, /createServices/);
  assert.match(script, /learningStageCheckpointControlsService/);
  assert.match(script, /runControls/);
  assert.match(script, /stage_checkpoint_controls_smoke_write_not_supported/);
  assert.match(script, /stage_checkpoint_controls_smoke_invalid_json/);
  assert.match(script, /stage_checkpoint_controls_smoke_operation_invalid/);
  assert.match(script, /stage_checkpoint_controls_smoke_privacy_failed/);
  assert.match(script, /workspace_id_required/);
  assert.match(script, /stage_checkpoint_controls_target_required/);
  assert.doesNotMatch(script, /require\(["']\.\.\/src\/stores/);
  assert.doesNotMatch(script, /learning_growth_/);
  assert.doesNotMatch(script, /createGrowthGateway|gatewayClient|openai\.com|anthropic|deepseek/);
  assert.doesNotMatch(script, /learningDailyLoopService/);
  assert.doesNotMatch(script, /learningAutomation/);
  assert.doesNotMatch(script, /stageReadiness/);
  assert.doesNotMatch(script, /evaluateEligibility/);
  assert.doesNotMatch(script, /activateStageAssessment/);
  assert.doesNotMatch(script, /recordAssessmentCompletion/);
  assert.doesNotMatch(script, /draftPlan/);
  assert.doesNotMatch(script, /publishPlanItem/);
  assert.doesNotMatch(script, /generateCard/);
  assert.doesNotMatch(script, /evaluateSubmission/);
  assert.doesNotMatch(script, /executeOnce/);
  assert.doesNotMatch(script, /runOnce/);
  assert.doesNotMatch(script, /dryRun/);
  assert.doesNotMatch(script, /deliverHandoff/);

  const scriptHarness = read(path.join("tests", "growth-stage-checkpoint-controls-smoke-script.test.js"));
  assert.match(scriptHarness, /parses bounded readback selectors/);
  assert.match(scriptHarness, /read-only and delegates to controls service only/);
  assert.match(scriptHarness, /temporary SQLite db without creating stage cycles/);
  assert.match(scriptHarness, /fails closed for missing input, invalid JSON, privacy risk, unsupported operation, and write flag/);
});

test("Growth frontend app remains boot wiring over adapter modules", () => {
  const app = read(path.join("public", "app.js"));
  assert.match(app, /HermesGrowthAppearance/);
  assert.match(app, /HermesGrowthApiClient/);
  assert.match(app, /HermesGrowthViewModel/);
  assert.match(app, /HermesGrowthRouteController/);
  assert.match(app, /HermesGrowthCardInteractionController/);
  assert.match(app, /ensureCardGenerationTargetSelected/);
  assert.match(app, /preferredCardGenerationWorkspaceId/);
  assert.match(app, /refreshLearningLoopState/);
  assert.match(app, /fetchLearningLoopState/);
  assert.match(app, /refreshCycleHistoryFromUi/);
  assert.match(app, /fetchGrowthCycleHistory/);
  assert.match(app, /data-card-generation-cycle-history-select/);
  assert.match(app, /refreshAutomationProposals/);
  assert.match(app, /fetchGrowthAutomationProposals/);
  assert.match(app, /createGrowthAutomationProposal/);
  assert.match(app, /reviewGrowthAutomationProposal/);
  assert.match(app, /publishGrowthAutomationProposal/);
  assert.match(app, /data-automation-proposal-create/);
  assert.match(app, /data-automation-proposal-review/);
  assert.match(app, /data-automation-proposal-publish/);
  assert.match(app, /refreshCardGenerationContextAfterPublish/);
  assert.match(app, /data-learning-growth-evaluation-retry/);
  assert.match(app, /retryEvaluation/);
  assert.doesNotMatch(app, /if \(pageState\.auth\.isOwner\) await loadCardGenerationContext\(\);/);
  assert.doesNotMatch(app, /function normalizeBoard/);
  assert.doesNotMatch(app, /function applyInitialPluginRoute/);
  assert.doesNotMatch(app, /function normalizeTheme/);

  const index = read(path.join("public", "index.html"));
  for (const asset of [
    "growth-appearance.js",
    "growth-api-client.js",
    "growth-view-model.js",
    "growth-route-controller.js",
    "growth-card-generation-ui.js",
    "growth-card-interaction-controller.js",
    "app.js"
  ]) {
    assert.match(index, new RegExp(`/${asset}`));
  }

  const generationUi = read(path.join("public", "growth-card-generation-ui.js"));
  assert.match(generationUi, /data-learning-loop-state-panel/);
  assert.match(generationUi, /learningLoopStatePanel/);
  assert.match(generationUi, /data-card-generation-cycle-history/);
  assert.match(generationUi, /createCycleHistoryQueryPayload/);
  assert.match(generationUi, /cycleHistoryItemKey/);
  assert.match(generationUi, /selectedCycle/);
  assert.match(generationUi, /data-release-workbench-panel/);
  assert.match(generationUi, /releaseWorkbenchPanel/);
  assert.match(generationUi, /data-automation-proposal-panel/);
  assert.match(generationUi, /automationProposalPanel/);
  assert.match(generationUi, /createAutomationProposalCreatePayload/);
  assert.match(generationUi, /data-automation-proposal-create/);
  assert.match(generationUi, /data-automation-proposal-review/);
  assert.match(generationUi, /\["accepted", "skipped", "expired", "superseded"\]/);
  assert.match(generationUi, /data-automation-proposal-blocked-reason/);
  assert.match(generationUi, /automationProposalDecisionReason/);
  assert.match(generationUi, /data-automation-proposal-publish/);
  assert.match(generationUi, /data-automation-digest-panel/);
  assert.match(generationUi, /createAutomationDigestCreatePayload/);
  assert.match(generationUi, /createAutomationDigestQueryPayload/);
  assert.match(generationUi, /createAutomationDigestReviewPayload/);
  assert.match(generationUi, /data-automation-digest-create/);
  assert.match(generationUi, /data-automation-digest-review/);
  assert.match(generationUi, /data-automation-action-handoff-panel/);
  assert.match(generationUi, /createAutomationActionHandoffQueryPayload/);
  assert.match(generationUi, /createAutomationActionHandoffPayload/);
  assert.match(generationUi, /createAutomationActionHandoffDeliverPayload/);
  assert.match(generationUi, /data-automation-action-handoff-create/);
  assert.match(generationUi, /data-automation-action-handoff-deliver/);
  assert.match(generationUi, /data-automation-scheduler-execution-panel/);
  assert.match(generationUi, /createAutomationSchedulerExecutionQueryPayload/);
  assert.match(generationUi, /createAutomationSchedulerExecutionPayload/);
  assert.match(generationUi, /data-automation-scheduler-execution-execute/);
  assert.match(generationUi, /data-automation-scheduler-run-panel/);
  assert.match(generationUi, /createAutomationSchedulerRunQueryPayload/);
  assert.match(generationUi, /createAutomationSchedulerRunPayload/);
  assert.match(generationUi, /data-automation-scheduler-run-once/);
  assert.match(generationUi, /data-automation-scheduler-worker-target-panel/);
  assert.match(generationUi, /createAutomationSchedulerWorkerTargetQueryPayload/);
  assert.match(generationUi, /createAutomationSchedulerWorkerTargetPayload/);
  assert.match(generationUi, /createAutomationSchedulerWorkerTargetReviewPayload/);
  assert.match(generationUi, /data-automation-scheduler-worker-target-create/);
  assert.match(generationUi, /data-automation-scheduler-worker-target-review/);

  const apiClient = read(path.join("public", "growth-api-client.js"));
  assert.match(apiClient, /fetchGrowthCycleHistory/);
  assert.match(apiClient, /learning-cycles", "history"/);
  assert.match(apiClient, /fetchGrowthAutomationProposals/);
  assert.match(apiClient, /createGrowthAutomationProposal/);
  assert.match(apiClient, /reviewGrowthAutomationProposal/);
  assert.match(apiClient, /publishGrowthAutomationProposal/);
  assert.match(apiClient, /fetchGrowthAutomationDigests/);
  assert.match(apiClient, /createGrowthAutomationDigest/);
  assert.match(apiClient, /reviewGrowthAutomationDigest/);
  assert.match(apiClient, /fetchGrowthAutomationActionHandoffs/);
  assert.match(apiClient, /createGrowthAutomationActionHandoff/);
  assert.match(apiClient, /deliverGrowthAutomationActionHandoff/);
  assert.match(apiClient, /fetchGrowthAutomationSchedulerExecutions/);
  assert.match(apiClient, /executeGrowthAutomationSchedulerOnce/);
  assert.match(apiClient, /fetchGrowthAutomationSchedulerRuns/);
  assert.match(apiClient, /runGrowthAutomationSchedulerOnce/);
  assert.match(apiClient, /fetchGrowthAutomationSchedulerWorkerTargets/);
  assert.match(apiClient, /createGrowthAutomationSchedulerWorkerTarget/);
  assert.match(apiClient, /reviewGrowthAutomationSchedulerWorkerTarget/);
  assert.match(apiClient, /automation", "proposals"/);
  assert.match(apiClient, /automation", "digests"/);
  assert.match(apiClient, /automation", "action-handoffs"/);
  assert.match(apiClient, /automation", "scheduler", "executions"/);
  assert.match(apiClient, /automation", "scheduler", "execute-once"/);
  assert.match(apiClient, /automation", "scheduler", "runs"/);
  assert.match(apiClient, /automation", "scheduler", "run-once"/);
  assert.match(apiClient, /automation", "scheduler", "worker-targets"/);
  assert.doesNotMatch(generationUi, /learning_growth_/);
  assert.doesNotMatch(generationUi, /raw_answer|raw_prompt|raw_model|source_document_body/);
});
