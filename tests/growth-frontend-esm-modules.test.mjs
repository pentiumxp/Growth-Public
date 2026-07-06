import assert from "node:assert/strict";
import test from "node:test";

import {
  automationActionHandoffQuery,
  automationClosedLoopActionPlanQuery,
  automationProposalQuery,
  cardGenerationContextQuery,
  createGrowthApiClient,
  cycleAuditQuery,
  cycleHistoryQuery,
  learningLoopStateQuery,
  learningOperatingLoopRunsQuery,
  ownerAuditReviewQuery,
  profileFeedbackQuery,
  referenceQuery,
  releaseEvidenceLedgerQuery,
  releaseLifecycleRecordQuery,
  releaseStatusReadbackQuery,
  releaseWorkbenchActionAuditQuery,
  releaseWorkbenchQuery,
  requestOptionsWithLaunchToken,
  stageAssessmentControlsQuery
} from "../frontend/src/api/growthApiClient.js";
import {
  fetchJsonWithGrowthErrors,
  fetchReadableJsonWithGrowthErrors,
  jsonPostOptions
} from "../frontend/src/api/request.js";
import {
  appendWorkspaceQuery,
  growthApiPath,
  proxyPrefixFromLocation,
  resolveApiPath,
  resolveGrowthApiPath
} from "../frontend/src/platform/proxyUrl.js";
import {
  appearanceFromInput,
  boundedViewportNumber,
  normalizeFontSize,
  normalizeTheme,
  normalizeViewportMessage
} from "../frontend/src/platform/appearance.js";
import {
  appearanceFromInput as themeBridgeAppearanceFromInput,
  normalizeTheme as normalizeThemeBridgeTheme
} from "../frontend/src/platform/themeBridge.js";
import {
  boundedViewportNumber as boundedViewportBridgeNumber,
  normalizeViewportMessage as normalizeViewportBridgeMessage
} from "../frontend/src/platform/viewportBridge.js";
import {
  cardCapabilities,
  firstTaskCardForRoute,
  routeCardId,
  uniqueTaskCards
} from "../frontend/src/routing/growthRoutes.js";
import { initialPluginRouteIntent } from "../frontend/src/routing/initialRoute.js";
import {
  createGrowthNavigationController,
  GROWTH_BACK_EVENT,
  GROWTH_BACK_RESULT_EVENT,
  GROWTH_NAVIGATION_EVENT,
  GROWTH_NAVIGATION_STATE_KEY,
  growthRouteFromState
} from "../frontend/src/routing/navigationController.js";
import {
  applyInitialRouteIntent,
  createGrowthRouteController
} from "../frontend/src/routing/routeController.js";
import {
  cardGenerationActionFailureTarget,
  cardGenerationActionHandlerName,
  cardGenerationActionRoute,
  cardGenerationActionRoutes,
  dispatchCardGenerationAction
} from "../frontend/src/app/actionDispatcher.js";
import {
  cardGenerationActionNeedsLegacyButton,
  legacyButtonDatasetForCardGenerationAction,
  legacyButtonForCardGenerationAction,
  legacyHandlerArgsForCardGenerationAction
} from "../frontend/src/app/actionAdapters.js";
import {
  applyCardGenerationActionDraft,
  applyCardGenerationFailure,
  applyCardGenerationHandled,
  applyCardGenerationPreDispatchState,
  cardGenerationFailurePatch,
  createCardGenerationController,
  cycleHistoryCascadeActions,
  selectCycleHistoryState
} from "../frontend/src/app/appController.js";
import { createReadbackActionHandlers } from "../frontend/src/app/actionHandlers.js";
import {
  actionElementFromEvent,
  bindCardGenerationDomEvents,
  cardGenerationActionFromDomEvent,
  selectorForCardGenerationEventType
} from "../frontend/src/app/domEvents.js";
import { createGrowthRuntimeAdapter } from "../frontend/src/app/runtimeAdapter.js";
import {
  cardGenerationState,
  reduceCardGenerationActionDraft,
  reduceCardGenerationPreDispatchState,
  reduceCycleHistorySelection
} from "../frontend/src/state/reducers/generationReducer.js";
import { reduceRouteState } from "../frontend/src/state/reducers/routeReducer.js";
import {
  selectCardGenerationWorkspaceId,
  selectOwnerGenerationRuntimeState,
  selectRouteState,
  selectSelectedWorkspaceSupportsCardGeneration,
  selectTargetProvisionSelection
} from "../frontend/src/state/selectors.js";
import { createGrowthStore } from "../frontend/src/state/store.js";
import {
  boardMetrics,
  createGrowthViewModel
} from "../frontend/src/state/viewModel.js";
import {
  createGrowthViteEntry,
  resolveGrowthViteMount
} from "../frontend/src/main.js";
import { renderRoot } from "../frontend/src/app/renderRoot.js";
import {
  activeBoardLaneId,
  boardLaneEmptyText,
  boardLaneModels,
  boardLaneTitle,
  boardStatusText,
  cardRewardText,
  renderBoardCard,
  renderBoardView,
  renderLearningGrowthBoard
} from "../frontend/src/views/BoardView.js";
import {
  renderBoardCard as renderLegacyBoardCard,
  renderLearningGrowthBoard as renderLegacyLearningGrowthBoard
} from "../frontend/src/features/legacy-board/LegacyBoardView.js";
import {
  renderNativeGrowthSubmission as renderLegacyNativeGrowthSubmission,
  renderTeachingCardDetailView as renderLegacyTeachingCardDetailView
} from "../frontend/src/features/legacy-board/LegacyTaskUi.js";
import {
  renderProgramCards as renderLegacyProgramCards,
  renderProgramSubsystem as renderLegacyProgramSubsystem
} from "../frontend/src/features/legacy-board/LegacyProgramUi.js";
import {
  renderRewardCards as renderLegacyRewardCards,
  renderRewardsView as renderLegacyRewardsView
} from "../frontend/src/features/legacy-board/LegacyCoinsUi.js";
import {
  HermesLearningGrowthUiFacade,
  renderCapabilityCards as renderLegacyGrowthCapabilityCards,
  renderGrowthRouteNotice as renderLegacyGrowthRouteNotice,
  renderLearningGrowthTabs as renderLegacyGrowthTabs,
  renderLearningGrowthView as renderLegacyLearningGrowthView,
  renderOwnerSystemPanel as renderLegacyOwnerSystemPanel
} from "../frontend/src/features/legacy-board/LegacyGrowthUiFacade.js";
import {
  cardDetailGoalText,
  cardDetailMetaItems,
  findCardDetailTask,
  renderCardDetailFallback,
  renderCardDetailSummary,
  renderCardDetailView,
  selectedCardDetailId
} from "../frontend/src/views/CardDetailView.js";
import {
  generatedCardStatusLabel,
  growthCardRole,
  growthCardRoleLabel,
  isTeachingCardDetail,
  renderDailyFlowRail,
  renderDailyScorePolicyPanel,
  renderGrowthCardRoleBadge,
  renderLearningGrowthCardShareButton as renderProgramGrowthCardShareButton,
  renderTeachingCardDetailView,
  renderTeachingGuidedPracticeSection,
  renderTeachingLessonSection,
  teachingFlow
} from "../frontend/src/views/TeachingCardDetailView.js";
import { growthShellView } from "../frontend/src/views/GrowthShellView.js";
import {
  ownerWorkspaceCurrentWorkspaceId,
  ownerWorkspaceLearnerLabel,
  renderGrowthViewTargetMenu,
  renderOwnerWorkspaceRouteNotice,
  renderOwnerWorkspaceSummary,
  renderOwnerWorkspaceView,
  visibleOwnerWorkspaceTargets
} from "../frontend/src/views/OwnerWorkspaceView.js";
import {
  compactFocus,
  compactRiskFlags,
  checkedAttr,
  evaluationStatusText,
  firstItem,
  focusLabel,
  formatCoinAmount,
  formatPercent,
  isNativeGrowthTaskDetail,
  launchStatusText,
  latestDraftForProgram,
  latestRecordForTask,
  latestRewardSettlementForTask,
  learningGrowthPlayableAudioUrl,
  learnerFacts,
  nativeGrowthArtifactDirectoryPath,
  nativeGrowthDeterministicScoreText,
  nativeGrowthEvaluationNeedsReflection,
  nativeGrowthRequiresAudio,
  nativeGrowthRequirementLabel,
  nativeGrowthSubmissionAudio,
  nativeGrowthSubmissionEvidence,
  nativeGrowthSubmissionGuard,
  nativeGrowthSubmissionPrompt,
  nativeGrowthSubmissionRecordingStatus,
  nativeGrowthTimeLabel,
  operationReasonText,
  parentReviewTypeText,
  programStatusText,
  recordsForTask,
  renderDailyPlanPanel,
  renderDraftSummary,
  renderEvaluationRows,
  renderExecutionOverview,
  renderFoundationImportForm,
  renderFoundationPanel,
  renderLaunchOperationsPanel,
  renderLaunchQueue,
  renderLearningGrowthCardShareButton,
  renderLearningGrowthSectionHead,
  renderNativeGrowthAudioRecorder,
  renderNativeGrowthAudioEvidence,
  renderNativeGrowthEvaluationDetails,
  renderNativeGrowthFeedbackHead,
  renderNativeGrowthInstruction,
  renderNativeGrowthOwnerMenu,
  renderNativeGrowthPreviousSubmission,
  renderNativeGrowthReadingMaterial,
  renderNativeGrowthReflectionRecorder,
  renderNativeGrowthSubmission,
  renderNativeGrowthTaskDetail,
  renderNativeGrowthSequenceDecision,
  renderParentAdminPanel,
  renderParentReportPanel,
  renderParentReviewRequests,
  renderProgramForm,
  renderProgramSubsystem,
  renderReviewQueue,
  renderRewardSettlements,
  renderSourceDirectoryPanel,
  renderSourceGoalForms,
  renderTaskRewardPolicy,
  renderProgramCards,
  renderSkillChips,
  renderStructuredQuestionSubmission,
  renderTaskAction,
  renderTaskRows,
  rewardSettlementDisplayText,
  reviewStatusText,
  settlementStatusText,
  selectedAttr,
  sourceRefsForProgram,
  structuredQuestionItems,
  structuredResponseMap,
  taskRewardPolicy,
  taskCardsForDraft,
  taskActionFromRecords,
  taskStatusText
} from "../frontend/src/views/ProgramExecutionView.js";
import {
  formatCoins,
  formatRmbCents,
  renderDailyBars,
  renderGrowthPanel,
  renderLedgerRows,
  renderOwnerRewardForm,
  renderRedemptionRows,
  renderRewardCards,
  renderRewardProgress,
  renderRewardsView
} from "../frontend/src/views/RewardsView.js";
import {
  ownerSettingsLearnerLabel,
  ownerSettingsTaskById,
  ownerSettingsTaskSeries,
  ownerSettingsTasks,
  renderOwnerSettingsOverview,
  renderOwnerSettingsPage,
  renderOwnerSettingsRewards,
  renderOwnerSettingsTabs,
  renderOwnerSettingsTaskDetail,
  renderOwnerTaskList,
  settingsActiveTab
} from "../frontend/src/views/SettingsView.js";
import {
  cardGenerationProgressSteps,
  cardGenerationWorkspaceId,
  isFanfanSampleTarget,
  selectedProvisionDraft,
  selectedWorkspaceSupportsCardGeneration,
  targetProvisionSelection
} from "../frontend/src/features/card-generation/generationModel.js";
import {
  cardGenerationActionFromDataset,
  cardGenerationClickSelectors,
  cardGenerationEventActionFromElement,
  cardGenerationInputSelectors,
  cardGenerationSubmitSelectors
} from "../frontend/src/features/card-generation/generationEvents.js";
import {
  targetProvisioningPanel,
  targetRowsWithContext
} from "../frontend/src/features/card-generation/TargetSelector.js";
import { progressPanel } from "../frontend/src/features/card-generation/ProgressPanel.js";
import {
  historyFacts,
  readinessRows,
  recipeOptions
} from "../frontend/src/features/card-generation/ReadinessPanel.js";
import {
  blockedAttributes,
  cardGenerationActionPanel,
  dailyLoopAdvanceBlockedReason,
  dailyLoopDraftBlockedReason,
  dailyLoopPublishBlockedReason,
  operatingLoopRunBlockedReason,
  primaryGenerationBlockedReason,
  selectedPlanItem
} from "../frontend/src/features/card-generation/ActionPanel.js";
import {
  dailyLoopPlanPreview,
  errorPanel,
  generatedCardPreview,
  ownerCardGenerationActionState,
  renderOwnerCardGenerationPanel,
  structuredPreview
} from "../frontend/src/features/card-generation/CardGenerationPanel.js";
import {
  createAutomationClosedLoopActionPlanQueryPayload as facadeClosedLoopActionPlanQueryPayload,
  createAutomationFailurePolicyQueryPayload as facadeFailurePolicyQueryPayload,
  createAutomationProposalQueryPayload as facadeProposalQueryPayload,
  createDailyEnglishGeneratePayload as facadeDailyEnglishGeneratePayload,
  createDailyLoopDraftPayload as facadeDailyLoopDraftPayload,
  createDailyLoopPublishPayload as facadeDailyLoopPublishPayload,
  createReleaseStatusReadbackQueryPayload as facadeReleaseStatusReadbackQueryPayload,
  createStageAssessmentPayload as facadeStageAssessmentPayload,
  createTargetProvisionPayload as facadeTargetProvisionPayload,
  HermesGrowthCardGenerationUiFacade
} from "../frontend/src/features/card-generation/CardGenerationFacade.js";
import {
  cardGenerationDisclosure,
  cardGenerationSecondaryReadbacks
} from "../frontend/src/features/card-generation/SecondaryReadbacksPanel.js";
import {
  addReferenceRequest,
  createReferenceChainRequests,
  referenceChainPanel,
  referenceChainRow,
  referenceChainStatusText,
  referenceObjectTypeText
} from "../frontend/src/features/card-generation/ReferenceChainPanel.js";
import {
  createCycleAuditQueryPayload,
  createCycleHistoryQueryPayload,
  cycleAuditHasAnchor,
  cycleDrilldownFindingRows,
  cycleDrilldownPanel,
  cycleDrilldownStatusText,
  cycleDrilldownTimelineRows,
  cycleFindingText,
  cycleHistoryItemKey,
  cycleHistoryRows,
  cycleTimelineTypeText
} from "../frontend/src/features/card-generation/CycleDrilldownPanel.js";
import {
  automationActionHandoffActionStatusPanel,
  automationActionHandoffDigestRows,
  automationActionHandoffPanel,
  automationActionHandoffRows,
  automationActionHandoffStatusText,
  automationClosedLoopActionPlanPanel,
  automationClosedLoopActionStatusPanel,
  automationClosedLoopActionText,
  automationClosedLoopPhaseRows,
  automationClosedLoopStatusText,
  automationCycleClosurePanel,
  automationCycleClosureStatusPanel,
  automationCycleClosureStatusText,
  automationDigestActionStatusPanel,
  automationDigestPanel,
  automationDigestRows,
  automationDigestStatusText,
  automationFailurePolicyActionStatusPanel,
  automationFailurePolicyPanel,
  automationFailurePolicyRows,
  automationFailurePolicyStatusText,
  automationProposalPanel,
  automationProposalRows,
  automationProposalScopeFromContext,
  automationProposalStatusPanel,
  automationProposalStatusText,
  createAutomationProposalCreatePayload,
  automationReviewAdvancementPanel,
  automationReviewAdvancementStatusPanel,
  automationReviewAdvancementStatusText,
  automationSchedulerExecutionActionFromHandoff,
  automationSchedulerExecutionActionStatusPanel,
  automationSchedulerExecutionHandoffRows,
  automationSchedulerExecutionPanel,
  automationSchedulerExecutionRows,
  automationSchedulerExecutionStatusText,
  automationSchedulerRunActionStatusPanel,
  automationSchedulerRunPanel,
  automationSchedulerRunRows,
  automationSchedulerRunStatusText,
  automationSchedulerWorkerTargetActionStatusPanel,
  automationSchedulerWorkerTargetPanel,
  automationSchedulerWorkerTargetRows,
  automationSchedulerWorkerTargetStatusText
} from "../frontend/src/features/card-generation/AutomationPanels.js";
import {
  createOwnerAuditReviewPayload,
  createOwnerAuditReviewQueryPayload,
  createOwnerCorrectionPayload,
  ownerAuditMetricRows,
  ownerAuditPanel,
  ownerAuditReviewDecisionText,
  ownerAuditReviewHasAnchor,
  ownerAuditReviewPanel,
  ownerAuditReviewRows,
  ownerAuditReviewStatusPanel,
  ownerAuditReviewStatusText,
  ownerCorrectionRows,
  ownerCorrectionStatusPanel,
  ownerCorrectionStatusText,
  ownerCorrectionTargetNodeIds,
  ownerPlanAuditRows,
  ownerProfileDeltaRows,
  ownerReviewActionText
} from "../frontend/src/features/card-generation/OwnerAuditPanel.js";
import {
  learningLoopReasonText,
  learningLoopStatePanel,
  learningLoopStatusText
} from "../frontend/src/features/card-generation/LearningLoopStatePanel.js";
import {
  cycleSelectionPayload,
  learningProfilePanel,
  nextCardRecommendationPanel,
  profileFeedbackNextActionText,
  profileFeedbackPanel,
  profileFeedbackStatusText,
  profileFeedbackSummaryRows,
  profileItemRows,
  recommendationLifecyclePanel
} from "../frontend/src/features/card-generation/ProfilePanel.js";
import {
  stageAssessmentAction,
  stageAssessmentControlsReasonText,
  stageAssessmentPanel,
  stageAssessmentReasonText,
  stageAssessmentRubricPanel,
  stageAssessmentRubricPolicy,
  stageAssessmentStatusText
} from "../frontend/src/features/card-generation/StageAssessmentPanel.js";
import {
  releasePackageCandidateFromHolder,
  releasePackageStatusPanel,
  releaseWorkbenchActionAuditRows,
  releaseWorkbenchActionAuditsPanel,
  releaseWorkbenchActionRows,
  releaseWorkbenchActionStatusPanel,
  releaseWorkbenchActionText,
  releaseWorkbenchPanel,
  releaseWorkbenchStatusText,
  releaseWorkbenchSupportedEndpoint
} from "../frontend/src/features/release/ReleaseWorkbenchView.js";
import {
  releaseActionPlanRows,
  releaseArtifactSlotRows,
  releaseArtifactTemplateData,
  releaseArtifactTemplatePanel,
  releaseArtifactTemplateStatusText,
  releaseChecklistRows
} from "../frontend/src/features/release/ReleaseArtifactTemplateView.js";
import {
  releaseControlsReadbackData,
  releaseControlsReadbackRow
} from "../frontend/src/features/release/ReleaseControlsView.js";
import {
  releaseDashboardReadbackData,
  releaseDashboardReadbackRow
} from "../frontend/src/features/release/ReleaseDashboardView.js";
import {
  releaseInventoryReadbackData,
  releaseInventoryReadbackRow
} from "../frontend/src/features/release/ReleaseInventoryView.js";
import {
  releaseReadinessReadbackData,
  releaseReadinessReadbackRows
} from "../frontend/src/features/release/ReleaseReadinessView.js";
import {
  releaseStatusReadbackDataForKey,
  releaseStatusReadbackDetail,
  releaseStatusReadbackRows,
  releaseStatusReadbackStatus,
  releaseStatusReadbacksPanel
} from "../frontend/src/features/release/ReleaseStatusReadbacksView.js";
import {
  releaseEvidenceCollectionData,
  releaseEvidenceCollectionRows
} from "../frontend/src/features/release/EvidenceCollectionView.js";
import {
  releaseApprovalLedgerData,
  releaseApprovalLedgerRows
} from "../frontend/src/features/release/ReleaseEvidencePanel.js";
import {
  releaseEvidenceLedgerData,
  releaseEvidenceLedgerPanel,
  releaseEvidenceLedgerRows,
  releaseEvidenceLedgerStatusText
} from "../frontend/src/features/release/ReleaseEvidenceLedgerView.js";
import {
  releaseLifecycleActionStatusPanel,
  releaseLifecycleRecordDetail,
  releaseLifecycleRecordId,
  releaseLifecycleRecordRows,
  releaseLifecycleRecordsData,
  releaseLifecycleRecordsPanel,
  releaseLifecycleRecordsStatusText
} from "../frontend/src/features/release/ReleaseLifecycleRecordsView.js";
import {
  quickCheckFlow,
  renderCardInteractionPanel,
  renderQuickCheckSubmissionForm,
  submissionDraftText,
  submissionRequirementHtml
} from "../frontend/src/features/card-interaction/CardInteractionController.js";
import {
  deterministicScoreText,
  interactionKey,
  recorderStatusText,
  renderAudioEvidence,
  renderEvaluationJobStatus,
  renderEvaluationPanel,
  renderFeedbackList,
  renderRecorderControls,
  renderSubmissionStatus
} from "../frontend/src/features/card-interaction/SubmissionPanel.js";
import {
  renderReflectionForm,
  renderReflectionPanel,
  renderReflectionStatus
} from "../frontend/src/features/card-interaction/ReflectionPanel.js";
import {
  dailyRewardCap,
  dailyRewardEarned,
  renderExperienceSignalActions,
  renderTeachingFeedbackSection
} from "../frontend/src/features/card-interaction/ExperienceSignalPanel.js";
import {
  applyInteractionCardWriteResult,
  createExperienceSignalPayload,
  createReflectionPayload,
  createSubmissionPayload,
  normalizeExperienceSignalInput,
  setEvaluationBusy,
  setInteractionMessage,
  setReflectionBusy,
  setSubmissionBusy,
  taskCardById,
  workspaceIdForTaskCard
} from "../frontend/src/features/card-interaction/interactionActions.js";
import {
  audioFileSuffix,
  audioPlaybackWarning,
  createAudioRecorderController,
  preferredAudioMimeType
} from "../frontend/src/features/card-interaction/AudioRecorderController.js";
import {
  applyCardInteractionDomAction,
  bindCardInteractionDomEvents,
  cardInteractionActionFromDomEvent,
  cardInteractionElementFromEvent,
  selectorForCardInteractionEventType
} from "../frontend/src/features/card-interaction/CardInteractionDomEvents.js";
import {
  createCardInteractionController,
  reflectionTextForCard,
  submissionTextForCard
} from "../frontend/src/features/card-interaction/CardInteractionActions.js";
import {
  createReleaseArtifactTemplateQueryPayload,
  createReleaseEvidenceLedgerQueryPayload,
  createReleaseLifecycleRecordPayload,
  createReleasePackageBuildPayload,
  createReleaseStatusReadbackQueryPayload,
  createReleaseWorkbenchActionPayload,
  createReleaseWorkbenchActionAuditQueryPayload
} from "../frontend/src/features/card-generation/releasePayloads.js";
import {
  createAutomationActionHandoffPayload,
  createAutomationCycleClosurePayload,
  createAutomationDigestCreatePayload,
  createAutomationDigestReviewPayload,
  createAutomationFailurePolicyCreatePayload,
  createAutomationFailurePolicyReviewPayload,
  createAutomationReviewAdvancementPayload,
  createAutomationProposalCreatePayload as createAutomationProposalCreateActionPayload,
  createAutomationProposalDecisionPayload,
  createAutomationProposalPublishPayload,
  createAutomationSchedulerExecutionPayload,
  createAutomationSchedulerRunPayload,
  createAutomationSchedulerWorkerTargetPayload,
  createAutomationSchedulerWorkerTargetReviewPayload,
  createOperatingLoopAdvancePayload,
  createRecommendationLifecycleDecisionPayload
} from "../frontend/src/features/card-generation/automationPayloads.js";

test("frontend ESM proxy helpers preserve Growth embedded proxy paths", () => {
  const href = "https://home.ai/plugins/growth/api/hermes-plugins/growth/proxy/index.html?workspaceId=weixin";
  const proxyPrefix = proxyPrefixFromLocation(href);

  assert.equal(proxyPrefix, "/plugins/growth/api/hermes-plugins/growth/proxy");
  assert.equal(growthApiPath("cards", "card_1"), "/api/v1/growth/cards/card_1");
  assert.equal(resolveApiPath("/api/v1/growth/cards/card_1", { proxyPrefix }), "/plugins/growth/api/hermes-plugins/growth/proxy/api/v1/growth/cards/card_1");
  assert.equal(resolveGrowthApiPath("/api/v1/growth/audio/submissions/sub_1", { targetWorkspaceId: "weixin_fanfan", proxyPrefix }), "/plugins/growth/api/hermes-plugins/growth/proxy/api/v1/growth/audio/submissions/sub_1?workspaceId=weixin_fanfan");
  assert.equal(appendWorkspaceQuery("/api/v1/growth/cards?workspace_id=existing", "ignored"), "/api/v1/growth/cards?workspace_id=existing");
});

test("frontend ESM query builders match legacy workspace and default query rules", () => {
  assert.equal(
    cardGenerationContextQuery("weixin_fanfan", {
      recipe_id: "recipe_1",
      domain_pack_id: "pack_1",
      domain: "science",
      subject: "biology",
      available_minutes: 20
    }, { proxyPrefix: "/api/hermes-plugins/growth/proxy" }),
    "?targetWorkspaceId=weixin_fanfan&recipeId=recipe_1&domainPackId=pack_1&domain=science&subject=biology&availableMinutes=20"
  );

  assert.equal(
    learningLoopStateQuery("weixin_fanfan", {
      target: { learnerId: "fanfan" },
      suggestedPlan: {
        programId: "program_science",
        domain: "science",
        targetNodeIds: ["kg_1", "kg_2"]
      }
    }),
    "?workspaceId=weixin_fanfan&learnerId=fanfan&programId=program_science&domain=science&subject=science&horizon=daily_plan&availableMinutes=15&targetNodeIds=kg_1%2Ckg_2&assessmentCoverageNodeIds=kg_1%2Ckg_2"
  );

  assert.deepEqual(requestOptionsWithLaunchToken({ headers: { accept: "application/json" } }, "launch_1"), {
    headers: {
      accept: "application/json",
      "x-hermes-plugin-launch-token": "launch_1"
    }
  });
});

test("frontend ESM query builders preserve release/profile/stage query rules", () => {
  assert.equal(
    releaseEvidenceLedgerQuery("weixin_fanfan", {
      config_gate: "owner_approval",
      approval_status: "approved",
      limit: 2
    }, "approval"),
    "?workspaceId=weixin_fanfan&approvalKey=owner_approval&status=approved&limit=2"
  );
  assert.equal(
    profileFeedbackQuery("weixin_fanfan", {
      target_node_ids: ["kg_1", "kg_2", "kg_1"],
      auto_select_latest_completed_cycle: true
    }, { proxyPrefix: "/api/hermes-plugins/growth/proxy" }),
    "?targetWorkspaceId=weixin_fanfan&targetNodeIds=kg_1%2Ckg_2&autoSelectLatestCompletedCycle=true&limit=12"
  );
  assert.equal(
    stageAssessmentControlsQuery("weixin_fanfan", {
      subject_id: "biology",
      capability_cluster_id: "cluster_1",
      assessment_coverage_node_ids: "kg_1,kg_2"
    }),
    "?workspaceId=weixin_fanfan&subjectId=biology&capabilityClusterId=cluster_1&assessmentCoverageNodeIds=kg_1%2Ckg_2"
  );
});

test("frontend ESM API query builders cover release, automation, cycle, audit, and reference parity", () => {
  assert.equal(
    learningOperatingLoopRunsQuery("weixin_fanfan", {
      action: "publish",
      status: "blocked",
      task_card_id: "task_1"
    }),
    "?workspaceId=weixin_fanfan&learnerId=weixin_fanfan&horizon=daily_plan&action=publish&status=blocked&taskCardId=task_1&limit=5"
  );
  assert.equal(
    releaseWorkbenchQuery("weixin_fanfan", {
      target: { learnerId: "fanfan" },
      suggestedPlan: { programId: "program_1", domain: "science", subject: "biology" },
      releaseWorkbench: { inventory: { latestCollectionRunId: "collection_1" } }
    }),
    "?workspaceId=weixin_fanfan&learnerId=fanfan&programId=program_1&domain=science&subject=biology&horizon=daily_plan&collectionRunId=collection_1"
  );
  assert.equal(
    releaseWorkbenchActionAuditQuery("weixin_fanfan", {
      endpoint_key: "release_package",
      action_key: "build",
      status: "ok"
    }),
    "?workspaceId=weixin_fanfan&endpointKey=release_package&actionKey=build&status=ok&limit=5"
  );
  assert.equal(
    releaseStatusReadbackQuery("weixin_fanfan", {
      collection_run_id: "collection_1",
      activation_record_limit: 3
    }),
    "?workspaceId=weixin_fanfan&collectionRunId=collection_1&limit=4&activationRecordLimit=3"
  );
  assert.equal(
    releaseLifecycleRecordQuery("weixin_fanfan", {
      activation_gates: ["owner", "owner", "visual"],
      enablement_status: "ready"
    }),
    "?workspaceId=weixin_fanfan&enablementStatus=ready&activationGates=owner%2Cvisual&limit=5"
  );
  assert.equal(
    automationProposalQuery("weixin_fanfan", { status: "pending", plan_draft_id: "draft_1" }),
    "?workspaceId=weixin_fanfan&status=pending&planDraftId=draft_1&limit=6"
  );
  assert.equal(
    automationActionHandoffQuery("weixin_fanfan", { digest_id: "digest_1", delivery_status: "draft" }),
    "?workspaceId=weixin_fanfan&digestId=digest_1&deliveryStatus=draft&limit=6"
  );
  assert.equal(
    automationClosedLoopActionPlanQuery("weixin_fanfan", {
      target_node_ids: ["node_1", "node_1", "node_2"],
      source_task_card_id: "task_1",
      auto_select_latest_completed_cycle: true
    }),
    "?workspaceId=weixin_fanfan&targetNodeIds=node_1%2Cnode_2&sourceTaskCardId=task_1&autoSelectLatestCompletedCycle=true&limit=8"
  );
  assert.equal(
    cycleAuditQuery("weixin_fanfan", { task_card_id: "task_1", target_node_ids: ["node_1"] }),
    "?workspaceId=weixin_fanfan&taskCardId=task_1&targetNodeIds=node_1&limit=20"
  );
  assert.equal(
    cycleHistoryQuery("weixin_fanfan", { include_completeness: true, limit: 2 }),
    "?workspaceId=weixin_fanfan&includeCompleteness=true&limit=2"
  );
  assert.equal(
    ownerAuditReviewQuery("weixin_fanfan", { review_decision: "accepted", owner_audit_review_id: "review_1" }),
    "?workspaceId=weixin_fanfan&decision=accepted&reviewId=review_1&limit=5"
  );
  assert.equal(referenceQuery("weixin_fanfan", { purpose: "owner_review" }), "?workspaceId=weixin_fanfan&purpose=owner_review");
});

test("frontend ESM request helpers preserve launch token and error handling", async () => {
  const ok = await fetchJsonWithGrowthErrors(async (path, options) => ({
    ok: true,
    status: 200,
    async json() {
      return { ok: true, path, cache: options.cache };
    }
  }), "/api/v1/growth/cards");
  assert.deepEqual(ok, { ok: true, path: "/api/v1/growth/cards", cache: "no-store" });

  await assert.rejects(
    () => fetchJsonWithGrowthErrors(async () => ({
      ok: true,
      status: 200,
      async json() {
        return { ok: false, error: { code: "growth_failed" } };
      }
    }), "/api/v1/growth/cards"),
    /growth_failed/
  );

  await assert.rejects(
    () => fetchReadableJsonWithGrowthErrors(async () => ({
      ok: false,
      status: 503,
      async json() {
        return {};
      }
    }), "/api/v1/growth/cards"),
    /request_failed:503/
  );

  assert.deepEqual(jsonPostOptions({ ok: true }), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{\"ok\":true}"
  });
});

test("frontend ESM API client exposes legacy-compatible wrapper surface without globals", async () => {
  const calls = [];
  const historyCalls = [];
  const client = createGrowthApiClient({
    fetchImpl: async (path, options = {}) => {
      calls.push({ path, options });
      if (path.includes("/release-evidence")) {
        return {
          ok: true,
          status: 200,
          async json() {
            return { ok: true, count: 1, evidence: [{ evidenceId: "evidence_1" }] };
          }
        };
      }
      if (path.includes("/release-approvals")) {
        return {
          ok: true,
          status: 200,
          async json() {
            return { ok: true, count: 1, approvals: [{ approvalId: "approval_1" }] };
          }
        };
      }
      return {
        ok: true,
        status: 200,
        async json() {
          return { ok: true, path, method: options.method || "GET" };
        }
      };
    },
    getWorkspaceId: () => "weixin_fanfan",
    getLaunchToken: () => "launch_token",
    historyRef: {
      replaceState(state, title, href) {
        historyCalls.push({ state, title, href });
      }
    },
    locationRef: {
      href: "https://home.ai/plugins/growth/api/hermes-plugins/growth/proxy/index.html?workspaceId=old"
    }
  });

  const expectedMethods = [
    "advanceGrowthAutomationReview",
    "advanceGrowthDailyLoop",
    "advanceLearningOperatingLoop",
    "buildGrowthReleasePackage",
    "createGrowthAutomationActionHandoff",
    "deliverGrowthAutomationActionHandoff",
    "fetchCardGenerationContext",
    "fetchGrowthAutomationClosedLoopActionPlan",
    "fetchGrowthCard",
    "fetchGrowthCycleAudit",
    "fetchGrowthProfileFeedback",
    "fetchGrowthReferenceSummary",
    "fetchGrowthReleaseEvidenceLedger",
    "fetchGrowthReleaseStatusReadbacks",
    "generateGrowthCard",
    "processGrowthEvaluations",
    "recordGrowthRuntimeEnablement",
    "reviewGrowthAutomationProposal",
    "submitGrowthCardEvidence",
    "updateWorkspaceUrl",
    "workspaceQuery"
  ];
  for (const method of expectedMethods) {
    assert.equal(typeof client[method], "function", method);
  }

  assert.equal(client.workspaceQuery(), "?workspaceId=weixin_fanfan");
  assert.equal(client.resolveApiPath("/api/v1/growth/cards/card_1"), "/plugins/growth/api/hermes-plugins/growth/proxy/api/v1/growth/cards/card_1");
  assert.equal(
    client.cardGenerationContextQuery("weixin_fanfan", { recipe_id: "daily" }),
    "?targetWorkspaceId=weixin_fanfan&recipeId=daily"
  );

  await client.fetchGrowthCard("card 1");
  assert.equal(calls.at(-1).path, "/plugins/growth/api/hermes-plugins/growth/proxy/api/v1/growth/cards/card%201?workspaceId=weixin_fanfan");
  assert.equal(calls.at(-1).options.headers["x-hermes-plugin-launch-token"], "launch_token");

  await client.submitGrowthCardEvidence("card_1", { answer: "summary-only" }, "weixin_child");
  assert.equal(calls.at(-1).path, "/plugins/growth/api/hermes-plugins/growth/proxy/api/v1/growth/cards/card_1/submissions");
  assert.equal(calls.at(-1).options.method, "POST");
  assert.equal(JSON.parse(calls.at(-1).options.body).workspace_id, "weixin_child");

  const ledger = await client.fetchGrowthReleaseEvidenceLedger({ evidence_key: "central_visual" }, "weixin_fanfan");
  assert.equal(ledger.schemaVersion, "growth.releaseEvidenceLedger.ui.v1");
  assert.equal(ledger.evidenceCount, 1);
  assert.equal(ledger.approvalCount, 1);
  assert.equal(calls.at(-2).path.includes("/automation/release-evidence?targetWorkspaceId=weixin_fanfan&evidenceKey=central_visual"), true);
  assert.equal(calls.at(-1).path.includes("/automation/release-approvals?targetWorkspaceId=weixin_fanfan"), true);

  client.updateWorkspaceUrl();
  assert.equal(historyCalls[0].href, "https://home.ai/plugins/growth/api/hermes-plugins/growth/proxy/index.html?workspaceId=weixin_fanfan");

  assert.throws(() => client.fetchGrowthCard(""), /missing_task_card_id/);
  assert.throws(() => client.fetchGrowthReferenceSummary("", "id_1"), /missing_reference_object_type/);
  assert.throws(() => client.reviewGrowthAutomationProposal("", {}), /missing_proposal_id/);
});

test("frontend ESM appearance helpers preserve bounded host viewport behavior", () => {
  assert.equal(normalizeTheme("dark"), "dark");
  assert.equal(normalizeTheme("sepia"), "system");
  assert.equal(normalizeFontSize("default"), "standard");
  assert.equal(boundedViewportNumber(9000), 4096);
  assert.deepEqual(appearanceFromInput({ pluginTheme: "light", appearanceFontSize: "large" }), {
    theme: "light",
    fontSize: "large"
  });

  const viewport = normalizeViewportMessage({
    type: "hermes.plugin.viewport",
    version: 1,
    pluginId: "growth",
    reason: "keyboard",
    viewport: { width: 390, height: 700, offsetTop: 12, safeAreaTop: 44 },
    keyboard: { visible: true, bottomInset: 280 },
    footer: { safeAreaBottom: 34 }
  }, { now: () => 1234 });

  assert.equal(viewport.receivedAtMs, 1234);
  assert.equal(viewport.rootHeight, 700);
  assert.equal(viewport.keyboard.visible, true);
  assert.equal(viewport.footer.safeAreaTop, 44);
  assert.equal(viewport.footer.safeAreaBottom, 34);
  assert.equal(normalizeViewportMessage({ type: "hermes.plugin.viewport", version: 1, pluginId: "music" }), null);
  assert.deepEqual(themeBridgeAppearanceFromInput({ appearanceTheme: "dark", fontSize: "xxlarge" }), {
    theme: "dark",
    fontSize: "xxlarge"
  });
  assert.equal(normalizeThemeBridgeTheme("unknown"), "system");
  assert.equal(boundedViewportBridgeNumber(-12), 0);
  assert.equal(normalizeViewportBridgeMessage({ type: "hermes.plugin.viewport", version: 1, viewport: { layoutHeight: 500 } }).rootHeight, 500);
});

test("frontend ESM route helpers preserve card capability detection and dedupe", () => {
  const model = {
    overview: {
      board: { cards: [{ taskCardId: "card_1", actions: { canSubmit: true } }] },
      programs: {
        taskCards: [
          { taskCardId: "card_1", laneId: "today" },
          { taskCardId: "card_2", laneId: "reflection_required" }
        ],
        executableTasks: [{ id: "card_3", completionPolicy: { mode: "formal_assessment" } }]
      }
    }
  };

  assert.equal(routeCardId({ id: "fallback_id" }), "fallback_id");
  assert.deepEqual(uniqueTaskCards(model).map(routeCardId), ["card_1", "card_2", "card_3"]);
  assert.equal(cardCapabilities({ availableActions: { can_revise: true, coins: true } }).has("submit_work"), true);
  assert.equal(cardCapabilities({ availableActions: { can_revise: true, coins: true } }).has("rewards"), true);
  assert.equal(firstTaskCardForRoute("review", model).taskCardId, "card_2");
  assert.equal(firstTaskCardForRoute("stage_assessment", model).id, "card_3");
});

test("frontend ESM initial route intent preserves Owner and learner route decisions", () => {
  const model = {
    overview: {
      board: { cards: [{ taskCardId: "card_review", laneId: "reflection_required" }] },
      programs: {
        taskCards: [{ taskCardId: "card_submit", actions: { canSubmit: true } }],
        executableTasks: []
      }
    }
  };

  assert.deepEqual(initialPluginRouteIntent({
    pluginRoute: "today_tasks",
    pageState: { auth: { isOwner: false } },
    model
  }).routeState, {
    route: "today_tasks",
    label: "今日任务",
    target: "board_lane",
    status: "selected",
    emptyTitle: "今日没有待处理任务",
    emptyBody: "看板已切到「今日」；如果没有卡片，表示当前没有今日计划任务。",
    laneId: "today"
  });
  assert.equal(initialPluginRouteIntent({ pluginRoute: "review", pageState: { auth: { isOwner: true } }, model }).tabId, "ai-analysis");
  assert.equal(initialPluginRouteIntent({ pluginRoute: "review", pageState: { auth: { isOwner: false } }, model }).taskCardId, "card_review");
  assert.equal(initialPluginRouteIntent({ pluginRoute: "submit_work", pageState: { auth: { isOwner: false } }, model }).taskCardId, "card_submit");
  assert.equal(initialPluginRouteIntent({ pluginRoute: "stage_assessment", pageState: { auth: { isOwner: true } }, model: {} }).routeState.code, "growth_route_stage_assessment_not_active");
  assert.equal(initialPluginRouteIntent({ pluginRoute: "rewards", pageState: { auth: { isOwner: false } }, model }).routeState.status, "unavailable");
  assert.equal(initialPluginRouteIntent({ pluginRoute: "card", pluginItemId: "card_9", pageState: { auth: { isOwner: false } }, model }).taskCardId, "card_9");
});

test("frontend ESM route controller applies host manifest routes without legacy globals", async () => {
  const model = {
    overview: {
      board: {
        cards: [
          { taskCardId: "card_review", laneId: "reflection_required" },
          { taskCardId: "card_submit", actions: { canSubmit: true } }
        ]
      },
      programs: {
        taskCards: [{ taskCardId: "card_review", laneId: "reflection_required" }],
        executableTasks: [{ taskCardId: "card_stage", taskCardType: "assessment" }]
      }
    }
  };
  const openedCards = [];
  const pageState = {
    auth: { isOwner: false },
    selectedLearningTaskCardId: "",
    learningGrowthHistoryTaskCardId: "history_old",
    learningGrowthSettingsTaskId: "settings_old",
    learningGrowthSettingsOpen: true,
    learningGrowthActiveTab: "generation",
    learningGrowthBoardLane: ""
  };
  const controller = createGrowthRouteController({
    pluginRoute: "review",
    pageState,
    model,
    openCard(taskCardId) {
      openedCards.push(taskCardId);
      pageState.selectedLearningTaskCardId = taskCardId;
    }
  });

  assert.deepEqual(controller.allTaskCards().map(routeCardId), ["card_review", "card_submit", "card_stage"]);
  assert.equal(controller.firstTaskCardForRoute("submit_work").taskCardId, "card_submit");
  assert.equal(controller.hasRouteCapability({ taskCardType: "assessment" }, "stage_assessment"), true);
  assert.equal(await controller.applyInitialPluginRoute(), true);
  assert.deepEqual(openedCards, ["card_review"]);
  assert.equal(pageState.learningGrowthRouteState.status, "matched");
  assert.equal(pageState.learningGrowthRouteState.taskCardId, "card_review");

  const ownerState = { auth: { isOwner: true }, learningGrowthSettingsOpen: false };
  const ownerController = createGrowthRouteController({
    pluginRoute: "generate",
    pageState: ownerState,
    model
  });
  assert.equal(await ownerController.applyInitialPluginRoute(), false);
  assert.equal(ownerState.learningGrowthSettingsOpen, true);
  assert.equal(ownerState.learningGrowthActiveTab, "generation");
  assert.equal(ownerState.learningGrowthRouteState.route, "generate_cards");

  const learnerRewardsState = { auth: { isOwner: false } };
  applyInitialRouteIntent(learnerRewardsState, initialPluginRouteIntent({
    pluginRoute: "rewards",
    pageState: learnerRewardsState,
    model
  }));
  assert.equal(learnerRewardsState.learningGrowthSettingsOpen, false);
  assert.equal(learnerRewardsState.learningGrowthBoardLane, "all");
  assert.equal(learnerRewardsState.learningGrowthRouteState.status, "unavailable");
  assert.equal(learnerRewardsState.learningGrowthRouteState.code, "growth_route_rewards_owner_only");
});

test("frontend ESM card generation model preserves Owner target and provision selection rules", () => {
  const viewTargets = [
    { workspaceId: "weixin_owner", label: "Owner" },
    { workspaceId: "weixin_fanfan", label: "凡凡" }
  ];
  const pageState = {
    auth: { isOwner: true },
    cardGeneration: {
      selectedWorkspaceId: "",
      context: {
        target: { workspaceId: "weixin_fanfan", enabled: true },
        targetProvisioning: {
          selectedDomain: "science",
          selectedSubject: "biology",
          graphOptions: {
            selectedDomainPackId: "pack_science",
            domainPacks: [{ domainPackId: "pack_science", domain: "science", subjects: ["biology", "physics"] }]
          }
        }
      },
      targetProvisionDraft: { subject: "physics", recipe_id: "daily_science" }
    }
  };

  assert.equal(isFanfanSampleTarget({ label: "Fan Fan" }), true);
  assert.equal(cardGenerationWorkspaceId({ pageState, viewTargets, currentWorkspaceId: "weixin_owner" }), "weixin_fanfan");
  assert.equal(selectedWorkspaceSupportsCardGeneration({ pageState, viewTargets, currentWorkspaceId: "weixin_owner" }), true);
  assert.deepEqual(targetProvisionSelection(pageState), {
    domainPackId: "pack_science",
    domain: "science",
    subject: "physics",
    recipeId: "daily_science",
    status: "idle",
    result: null,
    error: "",
    packs: [{ domainPackId: "pack_science", domain: "science", subjects: ["biology", "physics"] }],
    subjects: ["biology", "physics"],
    pack: { domainPackId: "pack_science", domain: "science", subjects: ["biology", "physics"] }
  });
  assert.equal(selectedProvisionDraft({ graphOptions: { domainPacks: [{ domainPackId: "pack_1", domain: "math", subjects: ["algebra"] }] } }).subject, "algebra");
  assert.deepEqual(cardGenerationProgressSteps("draft").map((step) => step.progressStep), ["planner", "validation"]);
  assert.equal(cardGenerationProgressSteps("advance").at(-1).progressStep, "publish");
});

test("frontend ESM state selectors preserve route and Owner generation derived state", () => {
  const state = {
    auth: { isOwner: true },
    learningGrowthActiveTab: "generation",
    learningGrowthBoardLane: "review",
    selectedLearningTaskCardId: "task_1",
    learningGrowthSettingsOpen: true,
    learningGrowthRouteState: { status: "selected" },
    cardGeneration: {
      selectedWorkspaceId: "",
      status: "ready",
      context: {
        target: { workspaceId: "weixin_fanfan", enabled: true },
        targetProvisioning: {
          graphOptions: {
            selectedDomainPackId: "pack_ai",
            domainPacks: [{ domainPackId: "pack_ai", domain: "computing", subjects: ["ai"] }]
          }
        }
      },
      targetProvisionDraft: { subject: "ai", recipeId: "daily_ai" }
    }
  };
  const options = {
    currentWorkspaceId: "weixin_owner",
    viewTargets: [
      { workspaceId: "weixin_owner", label: "Owner" },
      { workspaceId: "weixin_fanfan", label: "凡凡" }
    ]
  };

  assert.deepEqual(selectRouteState(state), {
    activeTab: "generation",
    boardLane: "review",
    selectedTaskCardId: "task_1",
    settingsTaskId: "",
    historyTaskCardId: "",
    settingsOpen: true,
    routeState: { status: "selected" }
  });
  assert.equal(selectCardGenerationWorkspaceId(state, options), "weixin_fanfan");
  assert.equal(selectSelectedWorkspaceSupportsCardGeneration(state, options), true);
  assert.equal(selectTargetProvisionSelection(state).recipeId, "daily_ai");
  assert.deepEqual(selectOwnerGenerationRuntimeState(state, options), {
    isOwner: true,
    route: {
      activeTab: "generation",
      boardLane: "review",
      selectedTaskCardId: "task_1",
      settingsTaskId: "",
      historyTaskCardId: "",
      settingsOpen: true,
      routeState: { status: "selected" }
    },
    cardGeneration: state.cardGeneration,
    workspaceId: "weixin_fanfan",
    targetEnabled: true,
    targetProvisionSelection: selectTargetProvisionSelection(state),
    context: state.cardGeneration.context,
    status: "ready",
    error: ""
  });
});

test("frontend ESM view model preserves board, card, and overview normalization", () => {
  const viewModel = createGrowthViewModel({
    getWorkspaceId: () => "weixin_fanfan",
    learnerLabel: () => "凡凡"
  });
  const normalizedCard = viewModel.normalizeCard({
    id: "task_1",
    instructionPreview: "Read the story.",
    rewardCapCoins: 18,
    latestRewardSettlement: { coinAmount: 7 }
  });

  assert.equal(normalizedCard.taskCardId, "task_1");
  assert.equal(normalizedCard.workspaceId, "weixin_fanfan");
  assert.equal(normalizedCard.title, "task_1");
  assert.equal(normalizedCard.status, "published");
  assert.equal(normalizedCard.nextAction, "submit");
  assert.equal(normalizedCard.nativeState.nextAction, "submit");
  assert.equal(normalizedCard.rewardPolicy.maxCoins, 18);
  assert.equal(normalizedCard.taskModel.learnerInstruction, "Read the story.");
  assert.equal(normalizedCard.taskModel.goalSummary, "Read the story.");

  const board = viewModel.normalizeBoard({
    source: "sqlite",
    cards: [
      normalizedCard,
      { taskCardId: "task_2", status: "completed", latestRewardSettlement: { coinAmount: 11 } }
    ],
    lanes: [
      { id: "today", title: "Today", cards: ["task_1", "missing"] },
      { id: "done", cards: ["task_2"] }
    ]
  });

  assert.deepEqual(board.lanes.map((lane) => [lane.id, lane.cards, lane.count]), [
    ["today", ["task_1"], 1],
    ["done", ["task_2"], 1]
  ]);
  assert.deepEqual(board.summary, {
    totalCards: 2,
    activeTasks: 1,
    completedTasks: 1,
    totalEarnedCoins: 18,
    sevenDayCoins: 0,
    thirtyDayCoins: 0
  });
  assert.deepEqual(boardMetrics(board), board.summary);

  const overview = viewModel.makeOverview({ stage: "plugin_sqlite" }, board);
  assert.equal(overview.source, "sqlite");
  assert.equal(overview.learner.workspaceId, "weixin_fanfan");
  assert.equal(overview.learner.displayName, "凡凡");
  assert.equal(overview.module.title, "成长");
  assert.equal(overview.coins.balances.availableCoins, 18);
  assert.equal(overview.programs.taskCards.length, 2);
  assert.deepEqual(overview.programs.launchOperations.counts, overview.launchOperations.counts);
});

test("frontend ESM route reducer preserves local navigation state transitions", () => {
  const state = {
    learningGrowthActiveTab: "overview",
    learningGrowthBoardLane: "",
    learningGrowthSettingsOpen: false,
    learningGrowthSettingsTaskId: "",
    learningGrowthHistoryTaskCardId: "history_1",
    selectedLearningTaskCardId: ""
  };

  assert.equal(reduceRouteState(state, { action: "open_learning_growth_tab", tabId: "generation" }), true);
  assert.equal(state.learningGrowthActiveTab, "generation");
  assert.equal(reduceRouteState(state, { action: "set_learning_growth_board_lane", laneId: "review" }), true);
  assert.equal(state.learningGrowthBoardLane, "review");
  assert.equal(reduceRouteState(state, { action: "open_growth_card", taskCardId: "task_1" }), true);
  assert.equal(state.selectedLearningTaskCardId, "task_1");
  assert.equal(state.learningGrowthSettingsOpen, false);
  assert.equal(state.learningGrowthHistoryTaskCardId, "");

  assert.equal(reduceRouteState(state, { action: "open_growth_settings", taskCardId: "settings_task", tabId: "ai-analysis" }), true);
  assert.equal(state.learningGrowthSettingsOpen, true);
  assert.equal(state.learningGrowthSettingsTaskId, "settings_task");
  assert.equal(state.selectedLearningTaskCardId, "");
  assert.equal(state.learningGrowthActiveTab, "ai-analysis");

  assert.equal(reduceRouteState(state, { action: "close_growth_settings" }), true);
  assert.equal(state.learningGrowthSettingsOpen, false);
  assert.equal(state.learningGrowthSettingsTaskId, "");
  assert.equal(reduceRouteState(state, { action: "close_growth_card" }), true);
  assert.equal(state.selectedLearningTaskCardId, "");
  assert.equal(reduceRouteState(state, { action: "unknown" }), false);
});

test("frontend ESM navigation controller preserves host back and history behavior", () => {
  const pageState = {
    selectedLearningTaskCardId: "task_1",
    learningGrowthHistoryTaskCardId: "",
    learningGrowthSettingsTaskId: "",
    learningGrowthSettingsOpen: false,
    learningGrowthActiveTab: "overview",
    learningGrowthBoardLane: "today"
  };
  const historyCalls = [];
  const postedMessages = [];
  const listeners = {};
  let renderCount = 0;
  const windowRef = {
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    removeEventListener(type, handler) {
      if (listeners[type] === handler) delete listeners[type];
    }
  };
  const parentRef = {
    postMessage(payload) {
      postedMessages.push(payload);
    }
  };
  const controller = createGrowthNavigationController({
    pageState,
    renderShell() {
      renderCount += 1;
    },
    historyRef: {
      replaceState(state, title, href) {
        historyCalls.push({ method: "replaceState", state, title, href });
      },
      pushState(state, title, href) {
        historyCalls.push({ method: "pushState", state, title, href });
      }
    },
    locationRef: { href: "https://home.ai/plugins/growth" },
    parentRef,
    windowRef
  });

  assert.deepEqual(growthRouteFromState(pageState), {
    name: "card-detail",
    depth: 1,
    cardId: "task_1"
  });
  controller.bind();
  assert.equal(typeof listeners.message, "function");
  assert.equal(typeof listeners.popstate, "function");
  assert.equal(historyCalls[0].method, "replaceState");
  assert.equal(historyCalls[0].state[GROWTH_NAVIGATION_STATE_KEY], true);
  assert.equal(postedMessages[0].type, GROWTH_NAVIGATION_EVENT);
  assert.equal(postedMessages[0].canGoBack, true);

  listeners.message({ data: { type: GROWTH_BACK_EVENT } });
  assert.equal(pageState.selectedLearningTaskCardId, "");
  assert.equal(renderCount, 1);
  assert.equal(postedMessages.at(-1).type, GROWTH_BACK_RESULT_EVENT);
  assert.equal(postedMessages.at(-1).handled, true);
  assert.equal(postedMessages.at(-1).route.name, "root");

  controller.applySnapshot({
    learningGrowthSettingsOpen: true,
    learningGrowthActiveTab: "generation",
    learningGrowthSettingsTaskId: "settings_task"
  });
  assert.deepEqual(controller.routeFromState(), {
    name: "owner-settings",
    depth: 1,
    tab: "generation"
  });
  listeners.popstate({
    state: {
      [GROWTH_NAVIGATION_STATE_KEY]: true,
      routeState: {
        selectedLearningTaskCardId: "",
        learningGrowthSettingsOpen: false,
        learningGrowthActiveTab: "rewards",
        learningGrowthBoardLane: "all"
      }
    }
  });
  assert.equal(pageState.learningGrowthSettingsOpen, false);
  assert.equal(pageState.learningGrowthActiveTab, "rewards");
  assert.equal(renderCount, 2);

  controller.unbind();
  assert.equal(listeners.message, undefined);
  assert.equal(listeners.popstate, undefined);
});

test("frontend ESM Growth shell view preserves bootstrap and Owner generation rendering", () => {
  const bootstrapHtml = growthShellView({ context: { mode: "embedded" } });
  assert.match(bootstrapHtml, /data-growth-vite-bootstrap="true"/);
  assert.match(bootstrapHtml, /data-growth-vite-mode>embedded</);

  const state = {
    auth: { isOwner: true },
    learningGrowthActiveTab: "generation",
    currentWorkspaceId: "weixin_owner",
    viewTargets: [
      { workspaceId: "weixin_owner", label: "Owner" },
      { workspaceId: "weixin_fanfan", label: "凡凡", enabled: true }
    ],
    cardGeneration: {
      status: "ready",
      context: {
        target: { workspaceId: "weixin_fanfan", enabled: true },
        readiness: { plannerGatewayConfigured: true },
        suggestedPlan: { targetNodeId: "kg_fraction_intro" },
        targetProvisioning: {
          graphOptions: {
            selectedDomainPackId: "pack_math",
            domainPacks: [{ domainPackId: "pack_math", domain: "math", subjects: ["fractions"] }]
          }
        }
      }
    }
  };
  const html = growthShellView(state);
  assert.match(html, /data-growth-vite-shell="true"/);
  assert.match(html, /data-growth-vite-active-tab="generation"/);
  assert.match(html, /data-card-generation-manager/);
  assert.match(html, /data-card-generation-status="ready"/);
  assert.match(html, /data-card-generation-target="weixin_fanfan"/);

  const root = { innerHTML: "" };
  renderRoot(root, state);
  assert.match(root.innerHTML, /data-growth-vite-shell="true"/);

  const injectedOwnerHtml = growthShellView({
    learningGrowthActiveTab: "generation",
    cardGeneration: state.cardGeneration
  }, {
    isOwner: true,
    currentWorkspaceId: "weixin_owner",
    viewTargets: state.viewTargets
  });
  assert.match(injectedOwnerHtml, /data-growth-vite-shell="true"/);
});

test("frontend ESM Board view preserves lane filtering and card action markup", () => {
  const board = {
    workspace_id: "weixin_fanfan",
    cards: [
      {
        taskCardId: "task_ready",
        workspaceId: "weixin_fanfan",
        title: "Fraction practice",
        nextAction: "submit",
        activityType: "daily_practice",
        plannedDate: "2026-07-06T08:00:00.000Z",
        rewardCapCoins: 80,
        instructionPreview: "Compare two fractions.",
        artifactCount: 2,
        artifactDirectoryPath: "/tmp/growth-artifacts"
      },
      {
        taskCardId: "task_waiting",
        workspaceId: "weixin_fanfan",
        title: "Submitted card",
        nextAction: "waiting_feedback",
        latestRewardSettlement: { status: "ready", coinAmount: 12 }
      }
    ],
    lanes: [
      { id: "ready", title: "Ready", cards: ["task_ready"], count: 1 },
      { id: "waiting_ai", title: "Waiting", cards: ["task_waiting"], count: 1 },
      { id: "completed_recent", title: "Completed", cards: [], count: 0 }
    ]
  };

  assert.equal(boardLaneTitle("waiting_ai"), "等待 AI");
  assert.equal(boardLaneEmptyText("evaluation_failed"), "没有需处理的批改失败");
  assert.equal(boardStatusText({ nextAction: "submit" }), "未提交");
  assert.equal(cardRewardText({ latestRewardSettlement: { status: "settled", coinAmount: 21 } }), "已得 21 金币");
  assert.equal(activeBoardLaneId(boardLaneModels(board), "waiting_ai"), "waiting_ai");

  const cardHtml = renderBoardCard(board.cards[0]);
  assert.match(cardHtml, /data-learning-open-growth-task="task_ready"/);
  assert.match(cardHtml, /data-directory-path="\/tmp\/growth-artifacts"/);
  assert.match(cardHtml, /Compare two fractions\./);

  const html = renderLearningGrowthBoard(board, { activeGrowthBoardLane: "waiting_ai" });
  assert.match(html, /data-learning-growth-board/);
  assert.match(html, /data-growth-board-active-lane="waiting_ai"/);
  assert.match(html, /data-learning-growth-board-filter="ready"/);
  assert.match(html, /data-learning-open-growth-history="task_waiting"/);

  const allHtml = renderLearningGrowthBoard(board, { activeGrowthBoardLane: "all" });
  assert.match(allHtml, /data-growth-board-active-lane="all"/);
  assert.match(allHtml, /<strong>全部<\/strong>/);

  const emptyLaneHtml = renderLearningGrowthBoard(board, { activeGrowthBoardLane: "completed_recent" });
  assert.match(emptyLaneHtml, /data-growth-board-active-lane="completed_recent"/);
  assert.match(emptyLaneHtml, /暂无最近完成卡片/);

  const shellHtml = growthShellView({
    learningGrowthActiveTab: "overview",
    learningGrowthBoardLane: "ready",
    overview: { board }
  });
  assert.match(shellHtml, /data-growth-vite-shell="true"/);
  assert.match(shellHtml, /data-growth-board-active-lane="ready"/);

  assert.match(renderBoardView({ overview: { board }, learningGrowthBoardLane: "ready" }), /Fraction practice/);
});

test("frontend ESM legacy-board facades expose board, task, program, and coin migration targets", () => {
  const board = {
    workspace_id: "weixin_fanfan",
    cards: [{
      taskCardId: "legacy_board_task",
      workspaceId: "weixin_fanfan",
      title: "Legacy board card",
      nextAction: "submit",
      rewardCapCoins: 60
    }],
    lanes: [{ id: "ready", title: "Ready", cards: ["legacy_board_task"], count: 1 }]
  };
  assert.match(renderLegacyBoardCard(board.cards[0]), /data-learning-open-growth-task="legacy_board_task"/);
  assert.match(renderLegacyLearningGrowthBoard(board, { activeGrowthBoardLane: "ready" }), /data-learning-growth-board/);

  const teachingTask = {
    taskCardId: "legacy_teaching_task",
    title: "Legacy teaching card",
    cardRole: "teaching",
    teachingFlow: {
      lesson: { title: "Mini lesson", explanation: "Read first." },
      guidedPractice: { instruction: "Try one." }
    },
    expectedDurationMinutes: { min: 5, max: 8 },
    status: "active"
  };
  assert.match(renderLegacyTeachingCardDetailView(teachingTask), /data-learning-growth-teaching-card="legacy_teaching_task"/);
  assert.match(renderLegacyNativeGrowthSubmission({
    taskCardId: "legacy_native_task",
    source: "learning-growth",
    status: "published",
    learnerInstruction: "Answer briefly."
  }), /data-learning-native-growth-submission-form="legacy_native_task"/);

  const program = {
    programId: "legacy_program",
    title: "Legacy program",
    status: "active",
    focusAreas: ["english_reading"],
    currentStep: "practice"
  };
  assert.match(renderLegacyProgramCards([program], [], { isOwner: true }), /data-learning-program-id="legacy_program"/);
  assert.match(renderLegacyProgramSubsystem({
    programs: {
      programs: [program],
      taskCards: [],
      dailyPlan: {},
      skillStates: [],
      evaluations: []
    },
    isOwner: true,
    state: { auth: { isOwner: true } }
  }), /data-learning-growth-module="programs"/);

  const coins = {
    balances: { availableCoins: 30, heldCoins: 0, earnedCoins: 30, spentCoins: 0 },
    rewards: [{ id: "legacy_reward", title: "Legacy reward", coinCost: 20 }],
    growth: { totalEarnedCoins: 30, level: { current: { level: 1, title: "Starter" }, progressPct: 10 } },
    ledger: [],
    redemptions: []
  };
  assert.match(renderLegacyRewardCards(coins), /data-learning-redeem="legacy_reward"/);
  assert.match(renderLegacyRewardsView({ overview: { coins } }), /data-learning-growth-module="coins"/);
});

test("frontend ESM legacy Growth UI composite facade preserves renderLearningGrowthView parity", () => {
  const legacySurface = [
    "renderCapabilityCards",
    "renderLearningGrowthTabs",
    "renderLearningGrowthBoard",
    "renderLearningGrowthView",
    "renderGrowthRouteNotice",
    "renderNextModules",
    "renderOwnerSystemPanel",
    "renderPlatformStrip",
    "renderReadinessPanel"
  ];
  assert.equal(Object.isFrozen(HermesLearningGrowthUiFacade), true);
  for (const key of legacySurface) {
    assert.equal(typeof HermesLearningGrowthUiFacade[key], "function", key);
  }

  const overview = {
    module: { title: "成长计划" },
    learner: { id: "fanfan", displayName: "凡凡", workspaceId: "weixin_fanfan" },
    metrics: { totalEarnedCoins: 96, averageCoins7d: 8, averageCoins30d: 6 },
    coins: { balances: { availableCoins: 12, earnedCoins: 88 }, growth: { totalEarnedCoins: 96 } },
    board: {
      workspaceId: "weixin_fanfan",
      cards: [{
        taskCardId: "legacy_composite_task",
        workspaceId: "weixin_fanfan",
        title: "Composite task",
        templateId: "series_a",
        status: "published",
        nextAction: "submit"
      }, {
        taskCardId: "legacy_composite_history",
        workspaceId: "weixin_fanfan",
        title: "Composite task older",
        templateId: "series_a",
        status: "completed",
        latestEvaluation: { score: 91 },
        completedAt: "2026-07-01T00:00:00Z"
      }],
      lanes: [{ id: "ready", title: "Ready", cards: ["legacy_composite_task"], count: 1 }]
    },
    operationalReadiness: {
      status: "operational_ready",
      systemReadinessPercent: 90,
      learnerDataReadinessPercent: 80,
      operationalTestReady: true,
      checks: { system: [{ id: "api", label: "API", ready: true }], learnerData: [] }
    },
    capabilities: [{ id: "loop", title: "闭环", status: "active", description: "Ready." }],
    platformCapabilities: [{ id: "gateway", title: "Gateway" }],
    nextModules: [{ id: "release", title: "Release", status: "next" }]
  };
  const state = {
    auth: { isOwner: true },
    learningGrowthBoardLane: "ready",
    learningGrowthRouteState: {
      route: "today_tasks",
      label: "今日任务",
      status: "empty",
      emptyTitle: "今日没有待处理任务",
      emptyBody: "看板已切到今日任务。"
    }
  };
  const viewTargets = [
    { workspaceId: "weixin_fanfan", label: "凡凡", current: true },
    { workspaceId: "weixin_mumu", label: "木木" }
  ];

  const html = renderLegacyLearningGrowthView({ overview, state, viewTargets, activeGrowthBoardLane: "ready" });
  assert.match(html, /data-learning-product="fanfan-growth"/);
  assert.match(html, /data-learning-role="owner"/);
  assert.match(html, /data-learning-growth-board-summary/);
  assert.match(html, /data-learning-growth-board/);
  assert.match(html, /data-growth-view-target-menu/);
  assert.match(html, /data-growth-route-state="today_tasks"/);
  assert.match(html, /data-growth-keyboard-composer/);

  const selectedHtml = renderLegacyLearningGrowthView({
    overview,
    state,
    selectedGrowthTaskCardId: "legacy_composite_task"
  });
  assert.match(selectedHtml, /data-learning-growth-task-focus="legacy_composite_task"/);

  const historyHtml = renderLegacyLearningGrowthView({
    overview,
    state: Object.assign({}, state, { learningGrowthHistoryTaskCardId: "legacy_composite_task" })
  });
  assert.match(historyHtml, /data-learning-growth-history-page="legacy_composite_task"/);
  assert.match(historyHtml, /data-learning-open-growth-task="legacy_composite_history"/);

  const settingsHtml = renderLegacyLearningGrowthView({
    overview,
    state: Object.assign({}, state, { learningGrowthSettingsOpen: true }),
    viewTargets
  });
  assert.match(settingsHtml, /data-learning-growth-settings-page/);

  assert.match(renderLegacyGrowthRouteNotice(state.learningGrowthRouteState), /data-growth-route-status="empty"/);
  assert.match(renderLegacyGrowthCapabilityCards(overview.capabilities), /data-learning-growth-capability="loop"/);
  assert.match(renderLegacyGrowthTabs([{ id: "overview", label: "总览", html: "<p>Ready</p>" }]), /data-learning-growth-tabs/);
  assert.match(renderLegacyOwnerSystemPanel(overview, { state }), /data-learning-growth-category="owner-system"/);
});

test("frontend ESM Owner workspace view preserves target menu, summary, and board composition", () => {
  const state = {
    auth: { isOwner: true },
    learningGrowthActiveTab: "overview",
    learningGrowthBoardLane: "ready",
    learningGrowthRouteState: {
      route: "today_tasks",
      label: "今日任务",
      status: "empty",
      emptyTitle: "今日没有待处理任务",
      emptyBody: "看板已切到今日任务。"
    },
    overview: {
      module: { title: "成长计划" },
      learner: { id: "fanfan", displayName: "凡凡", workspaceId: "weixin_fanfan" },
      metrics: { averageCoins7d: 9, averageCoins30d: 6 },
      coins: {
        balances: { availableCoins: 18, earnedCoins: 120 },
        growth: { totalEarnedCoins: 128 }
      },
      board: {
        workspaceId: "weixin_fanfan",
        cards: [
          {
            taskCardId: "task_workspace",
            workspaceId: "weixin_fanfan",
            title: "Workspace task",
            nextAction: "submit",
            laneId: "ready",
            rewardCapCoins: 50
          }
        ],
        lanes: [{ id: "ready", title: "Ready", cards: ["task_workspace"], count: 1 }]
      }
    },
    viewTargets: [
      { workspaceId: "weixin_owner", label: "Owner" },
      { workspaceId: "weixin_fanfan", label: "凡凡", current: true },
      { workspaceId: "", label: "Missing" }
    ]
  };

  assert.equal(ownerWorkspaceLearnerLabel(state.overview), "凡凡");
  assert.equal(ownerWorkspaceCurrentWorkspaceId(state.overview), "weixin_fanfan");
  assert.equal(visibleOwnerWorkspaceTargets(state.viewTargets).length, 2);

  const menuHtml = renderGrowthViewTargetMenu(state, { viewTargets: state.viewTargets });
  assert.match(menuHtml, /data-growth-view-target-menu/);
  assert.match(menuHtml, /data-growth-view-target="weixin_owner"/);
  assert.match(menuHtml, /data-growth-view-target="weixin_fanfan" disabled/);

  const summaryHtml = renderOwnerWorkspaceSummary(state, { viewTargets: state.viewTargets });
  assert.match(summaryHtml, /data-learning-growth-board-summary/);
  assert.match(summaryHtml, /<strong>成长计划<\/strong>/);
  assert.match(summaryHtml, /<small>累计金币<\/small><b>128<\/b>/);
  assert.match(summaryHtml, /data-learning-growth-open-settings/);

  const noticeHtml = renderOwnerWorkspaceRouteNotice(state.learningGrowthRouteState);
  assert.match(noticeHtml, /data-growth-route-status="empty"/);
  assert.match(noticeHtml, /今日没有待处理任务/);

  const pageHtml = renderOwnerWorkspaceView(state, {
    activeGrowthBoardLane: "ready",
    viewTargets: state.viewTargets
  });
  assert.match(pageHtml, /data-learning-growth-owner-workspace-page/);
  assert.match(pageHtml, /data-growth-board-active-lane="ready"/);
  assert.match(pageHtml, /Workspace task/);

  const shellHtml = growthShellView(state);
  assert.match(shellHtml, /data-learning-growth-owner-workspace-page/);
  assert.match(shellHtml, /data-growth-view-target-menu/);
  assert.match(shellHtml, /data-learning-open-growth-task="task_workspace"/);
});

test("frontend ESM Card detail view preserves selected task focus and injectable detail rendering", () => {
  const state = {
    selectedLearningTaskCardId: "task_detail",
    overview: {
      board: {
        cards: [{
          taskCardId: "task_detail",
          workspaceId: "weixin_fanfan",
          title: "Detail fractions",
          nextAction: "revise",
          activityType: "daily_practice",
          skillId: "fraction_compare",
          plannedMinutes: 12,
          plannedDate: "2026-07-06T08:00:00.000Z",
          rewardCapCoins: 90,
          taskModel: {
            goalSummary: "Compare fractions with common denominators."
          },
          latestEvaluation: { score: 72 }
        }]
      }
    }
  };

  assert.equal(selectedCardDetailId(state), "task_detail");
  assert.equal(findCardDetailTask(state, "task_detail").title, "Detail fractions");
  assert.equal(cardDetailGoalText(findCardDetailTask(state, "task_detail")), "Compare fractions with common denominators.");
  assert.deepEqual(cardDetailMetaItems(findCardDetailTask(state, "task_detail")).slice(0, 3), [
    "daily_practice",
    "fraction_compare",
    "12 min"
  ]);

  const summaryHtml = renderCardDetailSummary(findCardDetailTask(state, "task_detail"));
  assert.match(summaryHtml, /data-learning-executable-task-id="task_detail"/);
  assert.match(summaryHtml, /Compare fractions with common denominators\./);
  assert.match(summaryHtml, /需要修订/);
  assert.match(summaryHtml, /72 分/);
  assert.match(summaryHtml, /data-learning-close-growth-task/);

  const html = renderCardDetailView(state);
  assert.match(html, /data-learning-growth-task-focus="task_detail"/);
  assert.match(html, /Detail fractions/);

  const customHtml = renderCardDetailView(state, {
    renderers: {
      cardDetailView(task) {
        return `<section data-custom-detail="${task.taskCardId}"></section>`;
      }
    }
  });
  assert.match(customHtml, /data-custom-detail="task_detail"/);

  assert.match(renderCardDetailFallback("missing"), /data-learning-growth-task-focus="missing"/);
  assert.match(growthShellView(state), /data-learning-growth-task-focus="task_detail"/);
});

test("frontend ESM teaching card detail view preserves legacy teaching layout markers", () => {
  const task = {
    taskCardId: "task_teaching",
    workspaceId: "weixin_fanfan",
    title: "Fraction compare micro lesson",
    cardRole: "practice",
    plannedMinutes: 14,
    rewardCapCoins: 88,
    teachingFlow: {
      learningTarget: "Compare same-denominator fractions.",
      prerequisites: ["Know numerator", "Know denominator"],
      whyItMatters: "This supports daily math word problems.",
      microLesson: {
        explanation: "The fraction with the larger numerator is larger when denominators match.",
        keyPoints: ["Check denominators first", "Then compare numerators"]
      },
      workedExample: {
        instruction: "Read the pair slowly.",
        steps: [{ label: "Step 1", text: "Compare 3/8 and 5/8." }]
      },
      guidedPractice: {
        instruction: "Try one comparison with support.",
        hints: ["Circle the denominators"]
      },
      quickCheck: {
        instruction: "Explain why 5/8 is larger than 3/8.",
        completionCriteria: ["Mentions same denominator", "Mentions larger numerator"]
      },
      supportLevel: "low_pressure",
      difficultyBasis: "recent_fraction_errors"
    },
    latestEvaluation: { score: 76 },
    latestSubmission: { submittedAt: "2026-07-06T08:00:00.000Z", wordCount: 12 }
  };
  const state = {
    selectedLearningTaskCardId: "task_teaching",
    learningGrowthTeachingDrafts: {
      task_teaching: { submissionText: "draft answer" }
    },
    overview: { board: { cards: [task] } }
  };

  assert.equal(growthCardRole(task), "practice");
  assert.equal(growthCardRoleLabel("integration_practice"), "综合练习");
  assert.equal(generatedCardStatusLabel(task), "批改已完成");
  assert.equal(isTeachingCardDetail(task), true);

  const flow = teachingFlow(task);
  assert.equal(flow.learningTarget, "Compare same-denominator fractions.");
  assert.deepEqual(flow.quickCheck.completionCriteria, [
    "Mentions same denominator",
    "Mentions larger numerator"
  ]);

  assert.match(renderGrowthCardRoleBadge("practice"), /练习卡/);
  assert.match(renderLearningGrowthCardShareButton("task_teaching"), /data-learning-growth-card-share="task_teaching"/);
  assert.match(renderDailyFlowRail(task), /data-learning-growth-flow-step="reflect"/);
  assert.match(renderDailyScorePolicyPanel(task, flow), /确定分数 76\/100/);
  assert.match(renderTeachingLessonSection(flow), /data-learning-growth-teaching-section="lesson"/);
  assert.match(renderTeachingGuidedPracticeSection(task, flow), /Try one comparison with support\./);

  const detailHtml = renderTeachingCardDetailView(task, { state, workspaceId: "weixin_fanfan" });
  assert.match(detailHtml, /data-learning-growth-teaching-card="task_teaching"/);
  assert.match(detailHtml, /data-learning-growth-card-role="practice"/);
  assert.match(detailHtml, /data-learning-growth-daily-score-policy/);
  assert.match(detailHtml, /data-learning-growth-card-interaction="task_teaching"/);
  assert.match(detailHtml, /data-learning-growth-submission-form="task_teaching"/);
  assert.match(detailHtml, /data-learning-close-growth-task/);

  const routedHtml = renderCardDetailView(state, { workspaceId: "weixin_fanfan" });
  assert.match(routedHtml, /data-learning-growth-task-focus="task_teaching"/);
  assert.match(routedHtml, /Fraction compare micro lesson/);
  assert.match(routedHtml, /data-learning-growth-teaching-section="submit"/);
  assert.match(growthShellView(state), /data-learning-growth-teaching-card="task_teaching"/);
});

test("frontend ESM program execution view preserves legacy summary list markers", () => {
  const ownerOptions = { isOwner: true, state: { auth: { isOwner: true } } };
  const program = {
    programId: "program_english",
    title: "English sprint",
    status: "published",
    domain: "english",
    minutesPerDay: 30,
    daysPerWeek: 5,
    goalSummary: "Improve output fluency.",
    focusAreas: ["english_reading_comprehension", "english_speaking_retell"]
  };
  const draft = {
    programId: "program_english",
    draftId: "draft_week",
    status: "review_required",
    weekStart: "2026-07-06",
    weekEnd: "2026-07-12",
    dailyPlans: [{ date: "2026-07-06", tasks: [{ id: "t1" }] }],
    reliability: { publishBlocked: false }
  };
  const task = {
    taskCardId: "task_program",
    workspaceId: "weixin_fanfan",
    title: "Retell a short passage",
    status: "published",
    plannedDate: "2026-07-06",
    plannedMinutes: 15,
    skillIds: ["english_speaking_retell"]
  };
  const data = {
    dailyPlan: {
      summary: { pendingTasks: 1, totalTasks: 2, totalMinutes: 30, activeDays: 1 },
      nextTask: { title: "Retell a short passage" },
      days: [{ date: "2026-07-06", pendingCount: 1, totalMinutes: 15, tasks: [task] }]
    },
    programs: [program],
    latestDrafts: [draft],
    taskCards: [task],
    interactionSessions: [{ taskCardId: "task_program", sessionId: "session_1", status: "active", currentStep: "ai_hint" }]
  };

  assert.equal(programStatusText("published", ownerOptions), "已下发");
  assert.equal(programStatusText("published"), "待执行");
  assert.equal(taskStatusText("review_required", ownerOptions), "待家长审核");
  assert.equal(evaluationStatusText("needs_repair"), "需修复");
  assert.equal(settlementStatusText("pending_review"), "待家长复核");
  assert.equal(focusLabel("english_speaking_retell"), "口语复述");
  assert.equal(compactFocus(program.focusAreas), "阅读 / 口语复述");
  assert.equal(formatPercent(0.734), "73%");

  assert.match(renderDraftSummary(draft, ownerOptions), /data-learning-program-draft="draft_week"/);
  const programHtml = renderProgramCards([program], [draft], ownerOptions);
  assert.match(programHtml, /data-learning-program-id="program_english"/);
  assert.match(programHtml, /data-learning-program-draft-action="program_english"/);
  assert.match(programHtml, /data-learning-program-publish="program_english"/);

  assert.match(renderTaskAction(task, null, ownerOptions), /data-learning-task-start="task_program"/);
  assert.match(renderTaskAction({ source: "learning-growth", taskCardId: "growth_task", workspaceId: "weixin_fanfan", status: "published" }), /data-learning-native-growth-submission-form="growth_task"/);
  assert.match(renderTaskRows([task], ownerOptions), /data-learning-task-card-id="task_program"/);
  assert.match(renderSkillChips([{ skillId: "english_reading_comprehension", level: "B1", confidence: 0.8 }]), /阅读/);
  assert.match(renderEvaluationRows([{ evaluationId: "eval_1", status: "passed", score: 91, summary: "Solid work.", passed: true }], ownerOptions), /data-learning-evaluation-settle="eval_1"/);
  assert.match(renderDailyPlanPanel(data.dailyPlan), /data-learning-daily-plan/);

  const overviewHtml = renderExecutionOverview(data, ownerOptions);
  assert.match(overviewHtml, /data-learning-growth-category="execution"/);
  assert.match(overviewHtml, /执行概览/);
  assert.match(overviewHtml, /data-learning-program-id="program_english"/);
  assert.match(overviewHtml, /data-learning-session-id="session_1"/);
});

test("frontend ESM program execution native Growth submission forms preserve legacy data markers", () => {
  const writtenTask = {
    source: "learning-growth",
    taskCardId: "native_written",
    workspaceId: "weixin_fanfan",
    status: "published",
    taskModel: { activityType: "reading" },
    questionItems: [
      {
        id: "q_choice",
        type: "single_choice",
        title: "Question 1",
        stem: "Which option fits?",
        choices: [{ id: "A", text: "Alpha" }, { id: "B", text: "Beta" }]
      },
      { id: "q_written", type: "written", prompt: "Explain your reasoning." }
    ],
    latestSubmission: {
      status: "submitted",
      structuredResponses: [
        { questionId: "q_choice", choice: "B", reason: "Because it fits." },
        { questionId: "q_written", response: "A short explanation." }
      ]
    }
  };
  const audioTask = {
    source: "learning-growth",
    taskCardId: "native_audio",
    workspaceId: "weixin_fanfan",
    status: "published",
    taskModel: { activityType: "speaking" }
  };
  const reflectionTask = {
    source: "learning-growth",
    taskCardId: "native_reflect",
    workspaceId: "weixin_fanfan",
    status: "active",
    nativeState: { nextAction: "spoken_reflection" },
    latestEvaluation: { status: "reflection_required", nextStep: "spoken_reflection_required" },
    latestReflection: { status: "rejected", summary: "Please be more specific." }
  };
  const revisionTask = {
    source: "learning-growth",
    taskCardId: "native_revision",
    workspaceId: "weixin_fanfan",
    status: "active",
    nativeState: { nextAction: "revise" },
    latestEvaluation: { status: "needs_repair" }
  };

  assert.equal(latestRecordForTask([{ taskCardId: "native_written", submittedAt: "2026-07-05" }], "native_written", "submittedAt").taskCardId, "native_written");
  assert.equal(nativeGrowthRequiresAudio(audioTask), true);
  assert.equal(nativeGrowthRequiresAudio(writtenTask), false);
  assert.equal(nativeGrowthSubmissionPrompt(writtenTask), "写下本次学习任务作答，提交后由 AI 批改并生成反馈。");
  assert.deepEqual(nativeGrowthSubmissionGuard(writtenTask).minWords, 50);
  assert.equal(nativeGrowthRequirementLabel({ minWords: 12, minChars: 80 }), "至少 12 个英文词 / 80 个有效字符");
  assert.equal(nativeGrowthSubmissionRecordingStatus("native_audio", { state: { learningNativeGrowthSubmissionRecorders: { native_audio: { status: "ready" } } } }), "已录好复述");
  assert.equal(nativeGrowthEvaluationNeedsReflection({ status: "draft_feedback", nextStep: "rewrite_and_reflect", score: 88, passingScore: 80 }), true);
  assert.equal(taskActionFromRecords({ taskCardId: "native_written" }, { taskSubmissions: [{ taskCardId: "native_written", status: "submitted" }] }), "waiting_feedback");

  const structured = structuredQuestionItems(writtenTask);
  assert.equal(structured[0].type, "multiple_choice");
  assert.equal(structuredResponseMap(writtenTask.latestSubmission).get("q_choice").choice, "B");

  const questionHtml = renderStructuredQuestionSubmission(writtenTask);
  assert.match(questionHtml, /data-learning-native-growth-question="q_choice"/);
  assert.match(questionHtml, /data-learning-native-growth-question-choice="q_choice" checked/);
  assert.match(questionHtml, /data-learning-native-growth-question-response="q_written"/);

  const writtenHtml = renderNativeGrowthSubmission(writtenTask);
  assert.match(writtenHtml, /data-learning-native-growth-submission-form="native_written"/);
  assert.match(writtenHtml, /data-min-words="50"/);
  assert.match(writtenHtml, /data-requires-audio="0"/);
  assert.match(writtenHtml, /data-learning-submit-native-growth="native_written"/);

  const audioHtml = renderNativeGrowthSubmission(audioTask, {
    state: { learningNativeGrowthSubmissionRecorders: { native_audio: { status: "ready", url: "blob:audio" } } }
  });
  assert.match(audioHtml, /data-requires-audio="1"/);
  assert.match(audioHtml, /data-learning-native-growth-recorder="native_audio"/);
  assert.match(audioHtml, /data-learning-native-growth-record-start="native_audio"/);
  assert.match(renderNativeGrowthAudioRecorder(audioTask), /开始录音/);

  const reflectionHtml = renderNativeGrowthSubmission(reflectionTask);
  assert.match(reflectionHtml, /data-learning-native-growth-reflection-form="native_reflect"/);
  assert.match(reflectionHtml, /data-learning-submit-native-growth-reflection="native_reflect"/);
  assert.match(reflectionHtml, /Please be more specific\./);
  assert.match(renderNativeGrowthReflectionRecorder(reflectionTask), /data-learning-native-growth-reflection-recorder="native_reflect"/);

  const revisionHtml = renderNativeGrowthSubmission(revisionTask);
  assert.match(revisionHtml, /data-learning-native-growth-revision-collapsed="native_revision"/);
  assert.match(revisionHtml, /data-learning-native-growth-edit-answer="native_revision"/);
});

test("frontend ESM program source and goal setup forms preserve Owner foundation markers", () => {
  const ownerOptions = { isOwner: true, state: { auth: { isOwner: true } } };
  const data = {
    learnerProfile: { displayName: "Fanfan", profileSummary: "B1 bridge learner." },
    sources: [
      { sourceId: "source_1", sourceRef: "source:school", title: "School summary", sourceType: "school" },
      { sourceId: "source_2", sourceRef: "source:tutor", title: "Tutor notes", sourceType: "tutor" }
    ],
    goals: [{ goalId: "goal_1", title: "Reading fluency", domain: "english", targetSummary: "Read and explain short texts." }],
    curriculumReferences: [{ referenceId: "ref_1", title: "grade7 CEFR 5.5-6 guide" }],
    sourceDirectories: [{
      bindingId: "binding_1",
      directoryLabel: "学习资料",
      displayName: "Fanfan",
      policy: "summary_only_cleaned_data",
      summaryFiles: [
        { role: "profile", exists: true },
        { role: "goals", exists: false }
      ]
    }],
    programs: [{
      programId: "program_1",
      title: "Custom sprint",
      domain: "math",
      goalSummary: "Custom target.",
      startDate: "2026-07-06",
      durationDays: 45,
      daysPerWeek: 4,
      minutesPerDay: 25,
      timeOfDay: "20:00",
      focusAreas: ["english_reading_comprehension", "english_presentation"],
      sourceBasisRefs: ["source:school"]
    }],
    latestDrafts: [{ draftId: "draft_1", programId: "program_1" }],
    taskCards: [{ taskCardId: "task_1", draftId: "draft_1" }]
  };

  assert.equal(firstItem([null, data.programs[0]]).programId, "program_1");
  assert.equal(selectedAttr("math", "math"), " selected");
  assert.equal(checkedAttr(["english_presentation"], "english_presentation"), " checked");
  assert.equal(latestDraftForProgram(data.programs[0], data.latestDrafts).draftId, "draft_1");
  assert.equal(taskCardsForDraft(data.taskCards, data.latestDrafts[0]).length, 1);
  assert.equal(sourceRefsForProgram(data, data.programs[0]), "source:school");
  assert.equal(sourceRefsForProgram(data, {}).split("\n").length, 2);

  const facts = learnerFacts(data);
  assert.equal(facts.displayName, "Fanfan");
  assert.equal(facts.grade, "七年级");
  assert.equal(facts.level, "5.5-6 / B1 过渡");
  assert.equal(facts.sourceCount, 2);

  const sourceGoalHtml = renderSourceGoalForms(ownerOptions);
  assert.match(sourceGoalHtml, /data-learning-source-create/);
  assert.match(sourceGoalHtml, /id="learningSourceType"/);
  assert.match(sourceGoalHtml, /value="assessment_summary"/);
  assert.match(sourceGoalHtml, /data-learning-goal-create/);
  assert.match(sourceGoalHtml, /id="learningGoalPriority"/);
  assert.equal(renderSourceGoalForms({ isOwner: false }), "");

  const importHtml = renderFoundationImportForm(ownerOptions);
  assert.match(importHtml, /data-learning-foundation-import/);
  assert.match(importHtml, /id="learningFoundationImportSources"/);
  assert.match(importHtml, /Summary only/);

  const directoryHtml = renderSourceDirectoryPanel(data.sourceDirectories, ownerOptions);
  assert.match(directoryHtml, /data-learning-source-directories/);
  assert.match(directoryHtml, /data-learning-source-directory="binding_1"/);
  assert.match(directoryHtml, /Summary only \/ 1 summaries \/ summary_only_cleaned_data/);
  assert.match(directoryHtml, /已识别:profile \/ 未找到:goals/);
  assert.match(directoryHtml, /data-learning-source-directory-import="binding_1"/);
  assert.match(directoryHtml, /data-learning-source-directory-bootstrap="binding_1"/);

  const foundationHtml = renderFoundationPanel(data, ownerOptions);
  assert.match(foundationHtml, /data-learning-foundation data-learning-owner-step="learner"/);
  assert.match(foundationHtml, /data-learning-profile-rebuild/);
  assert.match(foundationHtml, /Fanfan/);
  assert.match(foundationHtml, /七年级/);
  assert.match(foundationHtml, /5\.5-6 \/ B1 过渡/);
  assert.match(foundationHtml, /B1 bridge learner/);
  assert.match(foundationHtml, /Reading fluency · english/);
  assert.match(foundationHtml, /School summary · school/);
  assert.match(foundationHtml, /grade7 CEFR 5\.5-6 guide/);
  assert.match(foundationHtml, /data-learning-source-create/);
  assert.match(foundationHtml, /data-learning-foundation-import/);

  const programHtml = renderProgramForm(data, ownerOptions);
  assert.match(programHtml, /data-learning-program-owner data-learning-owner-step="scope"/);
  assert.match(programHtml, /data-learning-program-create/);
  assert.match(programHtml, /id="learningProgramTitle"[^>]+value="Custom sprint"/);
  assert.match(programHtml, /<option value="math" selected>Math<\/option>/);
  assert.match(programHtml, /id="learningProgramDurationDays"[^>]+value="45"/);
  assert.match(programHtml, /name="learningProgramFocus" value="english_presentation" checked/);
  assert.match(programHtml, /source:school/);
  assert.equal(renderProgramForm(data, { isOwner: false }), "");

  const defaultProgramHtml = renderProgramForm({ programs: [], goals: [], sources: [] }, ownerOptions);
  assert.match(defaultProgramHtml, /English fast improvement sprint/);
  assert.match(defaultProgramHtml, /value="19:30"/);

  const adminHtml = renderParentAdminPanel(data, ownerOptions);
  assert.match(adminHtml, /data-learning-growth-category="parent-admin"/);
  assert.match(adminHtml, /data-learning-foundation/);
  assert.match(adminHtml, /data-learning-program-owner/);
});

test("frontend ESM program parent admin panels preserve review, launch, report, and reward markers", () => {
  const ownerOptions = { isOwner: true, state: { auth: { isOwner: true } } };
  const launchOperations = {
    status: "attention_required",
    counts: {
      publishedTasks: 3,
      activeSessions: 1,
      pendingPlanReviews: 2,
      pendingParentReviews: 1,
      pendingRewardSettlements: 4,
      rewardCandidates: 1
    },
    nextActions: [
      { id: "next_1", reasonCode: "pending_parent_review" },
      { id: "next_2", reasonCode: "passed_evaluation_needs_reward_settlement" }
    ],
    queues: {
      blockers: [{ resourceType: "program", resourceId: "program_1", title: "Missing source", reasonCode: "missing_learning_source_or_goal", priority: "high" }],
      approvals: [{ resourceType: "review", resourceId: "review_1", title: "Plan review", reasonCode: "pending_parent_review", status: "pending" }],
      execution: [{ resourceType: "task", resourceId: "task_1", title: "Task ready", reasonCode: "task_ready_for_executor" }],
      rewards: [{ resourceType: "reward", resourceId: "settle_1", title: "Reward pending", reasonCode: "reward_settlement_pending" }]
    }
  };
  const data = {
    launchOperations,
    parentReport: {
      counts: { plannedTasks: 6, passedEvaluations: 4, coinsSettled: 180, pendingReviews: 2 },
      nextActions: [{ reason: "Review draft", resourceType: "draft", resourceId: "draft_1" }]
    },
    reviewItems: [
      { reviewId: "review_1", summary: "Plan needs approval", riskFlags: [{ code: "age_fit" }, "time_pressure"] }
    ],
    parentReviewRequests: [
      { reviewRequestId: "parent_review_1", requestType: "reward", status: "pending", summary: "Reward review", riskFlags: ["coin_cap"] },
      { reviewRequestId: "parent_review_2", requestType: "plan", status: "approved", summary: "Plan reviewed" }
    ],
    rewardSettlements: [
      { rewardSettlementId: "settlement_1", status: "pending_review", coinAmount: 88, reason: "Passed", sourceType: "evaluation", evaluationId: "eval_1" }
    ],
    programs: [],
    taskCards: []
  };

  assert.equal(reviewStatusText("returned_for_revision"), "已退回");
  assert.equal(parentReviewTypeText("reward"), "奖励复核");
  assert.equal(operationReasonText("pending_parent_review"), "处理家长审核");
  assert.equal(launchStatusText("attention_required"), "需处理");
  assert.equal(formatCoinAmount(88.4), "88 金币");
  assert.equal(compactRiskFlags([{ code: "age_fit" }, "time_pressure"]), "age_fit / time_pressure");

  const reviewHtml = renderReviewQueue(data.reviewItems, ownerOptions);
  assert.match(reviewHtml, /data-learning-review-queue/);
  assert.match(reviewHtml, /data-learning-review-id="review_1"/);
  assert.match(reviewHtml, /data-learning-review-decision="review_1" data-decision="approved"/);
  assert.match(reviewHtml, /age_fit \/ time_pressure/);
  assert.equal(renderReviewQueue(data.reviewItems, { isOwner: false }), "");

  const parentReviewHtml = renderParentReviewRequests(data.parentReviewRequests, ownerOptions);
  assert.match(parentReviewHtml, /data-learning-parent-review-requests/);
  assert.match(parentReviewHtml, /data-learning-parent-review-request-id="parent_review_1"/);
  assert.match(parentReviewHtml, /data-learning-parent-review-decision="parent_review_1" data-decision="returned_for_revision"/);
  assert.match(parentReviewHtml, /奖励复核 \/ 待处理 \/ coin_cap/);
  assert.match(parentReviewHtml, /data-learning-parent-review-request-id="parent_review_2"/);
  assert.match(parentReviewHtml, /learning-program-status-chip">已通过/);

  const rewardHtml = renderRewardSettlements(data.rewardSettlements, ownerOptions);
  assert.match(rewardHtml, /data-learning-reward-settlements/);
  assert.match(rewardHtml, /data-learning-reward-settlement-id="settlement_1"/);
  assert.match(rewardHtml, /待家长复核 \/ 88 金币/);

  const launchHtml = renderLaunchOperationsPanel(launchOperations, ownerOptions);
  assert.match(launchHtml, /data-learning-launch-operations data-launch-status="attention_required"/);
  assert.match(launchHtml, /<small>已下发任务<\/small>/);
  assert.match(launchHtml, /<strong>5<\/strong><small>待结算<\/small>/);
  assert.match(launchHtml, /data-learning-launch-next-action="next_1"/);
  assert.match(launchHtml, /处理家长审核/);
  assert.match(launchHtml, /data-learning-launch-operation-item="program:program_1"/);
  assert.match(launchHtml, /补充学习来源或目标/);

  const compactQueueHtml = renderLaunchQueue("审核队列", launchOperations.queues.approvals, Object.assign({}, ownerOptions, { compactOwnerSettings: true }));
  assert.match(compactQueueHtml, /learning-launch-queue-compact/);
  assert.match(compactQueueHtml, /<summary><strong>审核队列<\/strong><span>1<\/span><\/summary>/);

  const reportHtml = renderParentReportPanel(data, ownerOptions);
  assert.match(reportHtml, /data-learning-parent-report/);
  assert.match(reportHtml, /data-learning-parent-report-refresh/);
  assert.match(reportHtml, /<small>本周任务<\/small>/);
  assert.match(reportHtml, /Review draft \/ draft \/ draft_1/);
  assert.match(renderParentReportPanel({}, ownerOptions), /点击刷新后生成本周摘要报告/);
  assert.match(renderParentReportPanel({}, Object.assign({}, ownerOptions, { parentReportLoading: true, parentReportError: "report_failed" })), />生成中<\/button>/);
  assert.match(renderParentReportPanel({}, Object.assign({}, ownerOptions, { parentReportError: "report_failed" })), /report_failed/);

  const adminHtml = renderParentAdminPanel(data, Object.assign({}, ownerOptions, {
    renderFoundationPanel: () => `<section data-foundation-slot>Foundation</section>`,
    renderProgramForm: () => `<form data-program-form-slot>Program</form>`
  }));
  assert.match(adminHtml, /data-learning-growth-category="parent-admin"/);
  assert.match(adminHtml, /data-foundation-slot/);
  assert.match(adminHtml, /data-program-form-slot/);
  assert.match(adminHtml, /data-learning-launch-operations/);
  assert.match(adminHtml, /data-learning-parent-report/);
  assert.match(adminHtml, /data-learning-review-queue/);
  assert.match(adminHtml, /data-learning-parent-review-requests/);
  assert.match(adminHtml, /data-learning-reward-settlements/);

  const subsystemHtml = renderProgramSubsystem({ programs: data, isOwner: true, state: { auth: { isOwner: true } } });
  assert.match(subsystemHtml, /data-learning-growth-module="programs"/);
  assert.match(subsystemHtml, /data-learning-growth-category="parent-admin"/);
  assert.match(subsystemHtml, /data-learning-growth-category="execution"/);
});

test("frontend ESM native Growth task detail preserves history, feedback, reward, and routing markers", () => {
  const task = {
    source: "learning-growth",
    taskCardId: "native_detail",
    workspaceId: "weixin_fanfan",
    title: "Read and explain",
    status: "active",
    plannedDate: "2026-07-06",
    plannedMinutes: 20,
    skillIds: ["english_reading_comprehension"],
    learnerInstruction: "Read the passage and answer.\nReading material: Daily News\nA short passage.",
    rewardPolicy: { maxCoins: 120, minCoins: 50, accuracyBonusMax: 25 },
    learningGrowthSequenceDecision: {
      strategy: "repair",
      difficultyBand: "B1",
      targetSkillIds: ["english_reading_comprehension"],
      reason: "Needs another evidence point."
    },
    latestEvaluation: {
      evaluationId: "eval_detail",
      status: "needs_repair",
      score: 73,
      createdAt: "2026-07-06T08:00:00.000Z",
      artifactDirectoryPath: "/tmp/report",
      summary: "Good core answer.",
      feedbackSections: {
        strengths: ["Clear answer"],
        focusAreas: ["Add evidence"],
        rewriteChecklist: ["Quote one detail"],
        reflectionPrompts: ["What changed?"],
        criterionFeedback: [{ dimension: "Evidence", observation: "Thin", action: "Add quote" }],
        sentenceFeedback: [{ issue: "Missing connector", fix: "Add because" }],
        finalConclusion: "Revise once.",
        nextPractice: "Try a similar question.",
        parentNote: "Low pressure."
      },
      revisionRequirements: ["Add one sentence"]
    }
  };
  const data = {
    taskSubmissions: [{
      taskCardId: "native_detail",
      submissionId: "sub_1",
      status: "submitted",
      submittedAt: "2026-07-06T07:00:00.000Z",
      displayText: "Transcript text",
      structuredResponses: [{ questionId: "q1", title: "Q1", response: "Answer one" }],
      audio: { url: "/audio/sub_1.webm", name: "Submission audio" }
    }],
    taskReflections: [{
      taskCardId: "native_detail",
      reflectionId: "ref_1",
      status: "submitted",
      submittedAt: "2026-07-06T09:00:00.000Z",
      audio: { url: "/audio/ref_1.webm", name: "Reflection audio" }
    }],
    rewardSettlements: [{
      taskCardId: "native_detail",
      evaluationId: "eval_detail",
      status: "settled",
      coinAmount: 92,
      settledAt: "2026-07-06T10:00:00.000Z"
    }]
  };
  const ownerOptions = { isOwner: true, state: { auth: { isOwner: true } } };

  assert.equal(isNativeGrowthTaskDetail(task), true);
  assert.equal(taskRewardPolicy(task).maxCoins, 120);
  assert.equal(rewardSettlementDisplayText(data.rewardSettlements[0]), "已得 92 金币");
  assert.equal(latestRewardSettlementForTask(data.rewardSettlements, { taskCardId: "native_detail", latestEvaluation: task.latestEvaluation }).coinAmount, 92);
  assert.equal(nativeGrowthDeterministicScoreText(task.latestEvaluation), "确定分数 73/100");
  assert.equal(nativeGrowthArtifactDirectoryPath(task, task.latestEvaluation), "/tmp/report");
  assert.equal(learningGrowthPlayableAudioUrl("/audio/sub_1.webm"), "/audio/sub_1.webm?format=mp3");
  assert.equal(nativeGrowthSubmissionAudio(data.taskSubmissions[0]).url, "/audio/sub_1.webm?format=mp3");
  assert.equal(nativeGrowthSubmissionEvidence(task, data).displayText, "Transcript text");
  assert.equal(recordsForTask(data.taskSubmissions, "native_detail")[0].submissionId, "sub_1");
  assert.equal(nativeGrowthTimeLabel("not-a-date"), "not-a-date");

  assert.match(renderLearningGrowthSectionHead("标题", "<span>1</span>"), /learning-growth-section-head/);
  assert.match(renderProgramGrowthCardShareButton("native_detail"), /data-learning-growth-card-share="native_detail"/);
  assert.match(renderTaskRewardPolicy(Object.assign({}, task, { latestRewardSettlement: data.rewardSettlements[0] })), /data-learning-task-reward-settlement/);
  assert.match(renderNativeGrowthSequenceDecision(task), /data-learning-growth-sequence-decision/);
  assert.match(renderNativeGrowthReadingMaterial(task), /data-learning-growth-reading-material/);
  assert.match(renderNativeGrowthPreviousSubmission(data.taskSubmissions[0]), /data-learning-growth-previous-submission/);
  assert.match(renderNativeGrowthAudioEvidence(task, data), /data-learning-growth-audio-evidence-item="ref_1"/);
  assert.match(renderNativeGrowthFeedbackHead(task, task.latestEvaluation), /data-learning-growth-feedback-directory-link/);
  assert.match(renderNativeGrowthEvaluationDetails(task.latestEvaluation, task), /data-learning-growth-feedback-detail/);
  assert.match(renderNativeGrowthInstruction({}, task.learnerInstruction, { }), /任务要求/);
  assert.match(renderNativeGrowthOwnerMenu(task, ownerOptions), /data-learning-growth-manual-pass="native_detail"/);

  const detailHtml = renderNativeGrowthTaskDetail(task, data, ownerOptions);
  assert.match(detailHtml, /data-learning-executable-task-id="native_detail"/);
  assert.match(detailHtml, /data-learning-task-reward-policy/);
  assert.match(detailHtml, /data-learning-growth-previous-submission/);
  assert.match(detailHtml, /data-learning-growth-audio-evidence/);
  assert.match(detailHtml, /data-learning-growth-feedback-detail/);
  assert.match(detailHtml, /data-learning-native-growth-revision-collapsed="native_detail"/);
  assert.match(detailHtml, /data-learning-close-growth-task/);

  const routedHtml = renderCardDetailView({
    selectedLearningTaskCardId: "native_detail",
    overview: {
      board: { cards: [task] },
      programs: data
    }
  }, ownerOptions);
  assert.match(routedHtml, /data-learning-growth-task-focus="native_detail"/);
  assert.match(routedHtml, /data-learning-growth-owner-menu/);
  assert.match(growthShellView({
    selectedLearningTaskCardId: "native_detail",
    overview: {
      board: { cards: [task] },
      programs: data
    }
  }, ownerOptions), /data-learning-executable-task-id="native_detail"/);
});

test("frontend ESM Settings view preserves Owner settings tabs and task detail routing", () => {
  const overview = {
    learner: { id: "fanfan", displayName: "凡凡", workspaceId: "weixin_fanfan" },
    metrics: { averageCoins7d: 8, averageCoins30d: 6 },
    coins: { growth: { totalEarnedCoins: 128 } },
    board: {
      cards: [
        {
          taskCardId: "task_settings",
          workspaceId: "weixin_fanfan",
          title: "Settings task",
          templateId: "daily_math",
          status: "published",
          activityType: "daily_practice",
          skillId: "fraction_compare",
          rewardCapCoins: 70,
          openedAt: "2026-07-06T08:00:00.000Z",
          taskModel: { goalSummary: "Use settings to inspect the task." },
          learningGrowthGenerationReport: { goal: "Next: review denominator language." }
        },
        {
          taskCardId: "task_done",
          title: "Done task",
          templateId: "daily_math",
          status: "completed",
          rewardCapCoins: 80
        }
      ]
    },
    programs: {
      launchOperations: { counts: { completedTasks: 1, pendingRewardSettlements: 2 } },
      rewardSettlements: [
        { status: "settled", coinAmount: 20 },
        { status: "ready", coinAmount: 10 }
      ]
    }
  };
  const state = {
    auth: { isOwner: true },
    learningGrowthSettingsOpen: true,
    learningGrowthActiveTab: "tasks",
    learningGrowthSettingsTaskId: "task_settings",
    overview,
    cardGeneration: { status: "ready", context: { target: { workspaceId: "weixin_fanfan", enabled: true } } }
  };

  assert.equal(settingsActiveTab({ learningGrowthActiveTab: "ai-summary" }), "ai-analysis");
  assert.equal(ownerSettingsLearnerLabel(overview), "凡凡");
  assert.equal(ownerSettingsTasks(overview).length, 2);
  assert.equal(ownerSettingsTaskById(overview, "task_settings").title, "Settings task");
  assert.equal(ownerSettingsTaskSeries(overview, ownerSettingsTaskById(overview, "task_settings")).length, 2);

  const overviewHtml = renderOwnerSettingsOverview(overview);
  assert.match(overviewHtml, /data-learning-settings-overview/);
  assert.match(overviewHtml, /<small>当前任务<\/small><strong>1<\/strong>/);
  assert.match(overviewHtml, /<small>累计金币<\/small><strong>128<\/strong>/);

  const taskListHtml = renderOwnerTaskList(overview);
  assert.match(taskListHtml, /data-learning-open-settings-task="task_settings"/);
  assert.match(taskListHtml, /daily_math/);

  const detailHtml = renderOwnerSettingsTaskDetail(overview, state);
  assert.match(detailHtml, /data-learning-settings-task-detail/);
  assert.match(detailHtml, /Use settings to inspect the task\./);
  assert.match(detailHtml, /Next: review denominator language\./);
  assert.match(detailHtml, /data-learning-settings-task-back/);

  const rewardsHtml = renderOwnerSettingsRewards(overview);
  assert.match(rewardsHtml, /data-learning-settings-reward-stats/);
  assert.match(rewardsHtml, /<small>已结算次数<\/small><strong>1<\/strong>/);

  const tabsHtml = renderOwnerSettingsTabs([
    { id: "overview", label: "总览", html: overviewHtml },
    { id: "tasks", label: "任务", html: detailHtml }
  ], "tasks");
  assert.match(tabsHtml, /data-learning-growth-tab="tasks" aria-selected="true"/);

  const pageHtml = renderOwnerSettingsPage(state, {
    renderers: { ownerGenerationPanel: () => `<section data-injected-owner-generation></section>` }
  });
  assert.match(pageHtml, /data-learning-growth-settings-page/);
  assert.match(pageHtml, /data-learning-growth-close-settings/);
  assert.match(pageHtml, /Owner 管理 · 凡凡/);
  assert.match(pageHtml, /data-injected-owner-generation/);

  const emptyHtml = renderOwnerSettingsPage({ auth: { isOwner: true }, overview: {} });
  assert.match(emptyHtml, /data-learning-settings-no-learner/);

  const shellHtml = growthShellView(state, {
    isOwner: true,
    renderers: { ownerGenerationPanel: () => `<section data-shell-generation></section>` }
  });
  assert.match(shellHtml, /data-learning-growth-settings-page/);
  assert.match(shellHtml, /data-shell-generation/);
});

test("frontend ESM Rewards view preserves coins, reward cards, ledger, and shell routing", () => {
  const coins = {
    studentId: "weixin_fanfan",
    displayName: "凡凡",
    balances: {
      availableCoins: 120,
      heldCoins: 10,
      earnedCoins: 260,
      spentCoins: 80
    },
    growth: {
      totalEarnedCoins: 260,
      streakDays: 5,
      level: {
        current: { level: 3, title: "探索者" },
        next: { level: 4, title: "创造者" },
        toNextLevelCoins: 40,
        progressPct: 72
      },
      recentDays: [
        { date: "2026-07-01", coins: 5 },
        { date: "2026-07-02", coins: 10 }
      ],
      bestRewardProgress: {
        id: "reward_book",
        title: "新书",
        coinCost: 150,
        rmbCents: 4500,
        remainingCoins: 30,
        progressPct: 80
      },
      rewardProgress: [
        {
          id: "reward_book",
          title: "新书",
          coinCost: 150,
          rmbCents: 4500,
          remainingCoins: 30,
          progressPct: 80
        },
        {
          id: "reward_movie",
          title: "电影",
          coinCost: 80,
          rmbCents: 3000,
          remainingCoins: 0,
          progressPct: 100,
          affordable: true
        }
      ]
    },
    rewards: [
      { id: "reward_book", title: "新书", description: "选择一本书", coinCost: 150, rmbCents: 4500 },
      { id: "reward_movie", title: "电影", coinCost: 80, rmbCents: 3000 }
    ],
    ledger: [
      { reason: "完成练习", coinDelta: 20, sourceType: "task", sourceId: "task_1", createdAt: "2026-07-06T08:00:00.000Z" },
      { reason: "兑换", coinDelta: -80, createdAt: "2026-07-05T08:00:00.000Z" }
    ],
    redemptions: [
      { rewardTitle: "电影", status: "approved", requestedAt: "2026-07-05T08:00:00.000Z", coinCost: 80 }
    ],
    settlement: { currency: "CNY" }
  };
  const ownerOptions = {
    isOwner: true,
    formatTime(value) {
      return String(value).slice(0, 10);
    }
  };

  assert.equal(formatCoins(12), "12 金币");
  assert.equal(formatRmbCents(4500), "￥45.00");
  assert.match(renderRewardCards(coins, ownerOptions), /data-learning-redeem="reward_book" disabled/);
  assert.match(renderRewardCards(coins, ownerOptions), /￥45\.00/);
  assert.match(renderLedgerRows(coins, ownerOptions), /task · task_1 · 2026-07-06/);
  assert.match(renderRedemptionRows(coins, ownerOptions), /approved · 2026-07-05/);
  assert.match(renderDailyBars(coins.growth), /style="height:100%"/);
  assert.match(renderRewardProgress(coins.growth, ownerOptions), /新书/);
  assert.match(renderGrowthPanel(coins, ownerOptions), /Lv\.3 探索者/);
  assert.match(renderOwnerRewardForm(ownerOptions), /id="learningRewardForm"/);
  assert.equal(renderOwnerRewardForm({ isOwner: false }), "");

  const html = renderRewardsView({
    auth: { isOwner: false },
    overview: {
      learner: { displayName: "凡凡" },
      coins
    }
  });
  assert.match(html, /data-learning-growth-rewards-page/);
  assert.match(html, /<h2>120 金币<\/h2>/);
  assert.match(html, /data-learning-redeem="reward_movie"/);
  assert.doesNotMatch(html, /￥45\.00/);
  assert.doesNotMatch(html, /id="learningRewardForm"/);

  const ownerHtml = renderRewardsView({
    auth: { isOwner: true },
    overview: { coins }
  }, ownerOptions);
  assert.match(ownerHtml, /data-learning-growth-coins="owner"/);
  assert.match(ownerHtml, /<span>CNY<\/span>/);
  assert.match(ownerHtml, /已结算<\/small>/);

  const shellHtml = growthShellView({
    auth: { isOwner: false },
    learningGrowthActiveTab: "rewards",
    overview: { coins }
  });
  assert.match(shellHtml, /data-growth-vite-active-tab="rewards"/);
  assert.match(shellHtml, /data-learning-growth-module="coins"/);
});

test("frontend ESM card interaction submission helpers preserve recorder and evaluation markup", () => {
  const task = {
    taskCardId: "task_interaction",
    workspaceId: "weixin_fanfan",
    latestSubmission: {
      submittedAt: "2026-07-06T08:00:00.000Z",
      wordCount: 42,
      textCharCount: 210,
      audio: { url: "/api/v1/growth/audio/submissions/sub_1", durationMs: 3200 }
    },
    latestEvaluationJob: {
      status: "failed",
      attemptCount: 3,
      lastError: "gateway_timeout",
      lastOwnerReview: { reviewedAt: "2026-07-06T09:00:00.000Z" }
    }
  };
  const state = {
    auth: { isOwner: true },
    learningGrowthEvaluationBusy: {},
    learningGrowthInteractionMessages: {
      [interactionKey("task_interaction", "evaluation")]: "Owner 正在处理批改失败。",
    },
    learningGrowthRecordings: {
      [interactionKey("task_interaction", "submission")]: {
        status: "recording",
        elapsedMs: 2400
      },
      [interactionKey("task_interaction", "reflection")]: {
        status: "ready",
        url: "blob:reflection",
        message: "反思录音已准备"
      }
    }
  };
  const options = {
    state,
    workspaceId: "weixin_fanfan",
    resolveGrowthAudioUrl(url, workspaceId) {
      return `/proxy${url}?workspaceId=${workspaceId}`;
    }
  };

  assert.equal(interactionKey("task_interaction", "submission"), "task_interaction:submission");
  assert.equal(recorderStatusText({ status: "recording", elapsedMs: 2400 }), "录音中 2 秒");
  assert.equal(deterministicScoreText({ score: 88.5, maxScore: 100 }), "确定分数 88.5/100");

  const audioHtml = renderAudioEvidence(task.latestSubmission.audio, "作答录音", options);
  assert.match(audioHtml, /data-learning-growth-audio-evidence/);
  assert.match(audioHtml, /作答录音 · 3 秒/);
  assert.match(audioHtml, /\/proxy\/api\/v1\/growth\/audio\/submissions\/sub_1\?workspaceId=weixin_fanfan/);

  const recorderHtml = renderRecorderControls(task, "submission", options);
  assert.match(recorderHtml, /data-learning-growth-recorder="task_interaction"/);
  assert.match(recorderHtml, /data-learning-growth-record-toggle="task_interaction"/);
  assert.match(recorderHtml, />停止录音</);

  const reflectionRecorderHtml = renderRecorderControls(task, "reflection", options);
  assert.match(reflectionRecorderHtml, /data-learning-growth-record-clear="task_interaction"/);
  assert.match(reflectionRecorderHtml, /data-learning-growth-record-playback="task_interaction"/);

  const submissionHtml = renderSubmissionStatus(task, options);
  assert.match(submissionHtml, /data-learning-growth-submission-status/);
  assert.match(submissionHtml, /42 词 \/ 210 字符/);

  const jobHtml = renderEvaluationJobStatus(task.latestEvaluationJob, true);
  assert.match(jobHtml, /已尝试 3 次/);
  assert.match(jobHtml, /Owner 已在 2026-07-06T09:00:00.000Z 重新加入队列/);
  assert.match(jobHtml, /错误摘要：gateway_timeout/);

  const failedEvaluationHtml = renderEvaluationPanel(task, options);
  assert.match(failedEvaluationHtml, /data-learning-growth-evaluation-panel="task_interaction"/);
  assert.match(failedEvaluationHtml, /批改未完成/);
  assert.match(failedEvaluationHtml, /data-learning-growth-evaluation-retry="task_interaction"/);
  assert.match(failedEvaluationHtml, /Owner 正在处理批改失败。/);

  const completedEvaluationHtml = renderEvaluationPanel({
    taskCardId: "task_done",
    latestSubmission: { submittedAt: "2026-07-06T08:00:00.000Z" },
    latestEvaluation: {
      score: 91,
      summary: "Evidence is clear.",
      feedbackSections: {
        strengths: ["Clear explanation"],
        remainingWeaknesses: ["Check units"],
        nextPractice: ["One more applied example"]
      }
    }
  }, { state: { learningGrowthInteractionMessages: {} } });
  assert.match(completedEvaluationHtml, /批改已完成/);
  assert.match(completedEvaluationHtml, /确定分数 91\/100/);
  assert.match(completedEvaluationHtml, /Clear explanation/);
  assert.match(renderFeedbackList("空列表", []), /^$/);
});

test("frontend ESM card interaction reflection and experience helpers preserve markup", () => {
  const task = {
    taskCardId: "task_reflect",
    workspaceId: "weixin_fanfan",
    status: "completed",
    rewardCapCoins: 60,
    targetNodeIds: ["node_1", "node_2"],
    latestEvaluation: { score: 86 },
    latestRewardSettlement: { status: "settled", coinAmount: 52 },
    experienceSummary: {
      latestSignalType: "",
      targetNodeIds: ["node_1"]
    }
  };
  const state = {
    learningGrowthReflectionDrafts: {
      task_reflect: { text: "I can explain the mistake now." }
    },
    learningGrowthReflectionBusy: {},
    learningGrowthExperienceSignalBusy: {
      task_reflect: "too_hard"
    },
    learningGrowthExperienceSignalSubmitted: {},
    learningGrowthInteractionMessages: {
      [interactionKey("task_reflect", "reflection")]: "反思待提交。",
      [interactionKey("task_reflect", "experience")]: "正在记录难度感受。"
    },
    learningGrowthRecordings: {
      [interactionKey("task_reflect", "reflection")]: {
        status: "ready",
        url: "blob:reflection"
      }
    }
  };
  const options = { state, workspaceId: "weixin_fanfan" };

  const formHtml = renderReflectionForm(task, options);
  assert.match(formHtml, /data-learning-growth-reflection-form="task_reflect"/);
  assert.match(formHtml, /I can explain the mistake now\./);
  assert.match(formHtml, /data-learning-growth-record-playback="task_reflect"/);
  assert.match(formHtml, /反思待提交。/);

  const statusHtml = renderReflectionStatus({
    taskCardId: "task_reflect",
    latestReflection: {
      submittedAt: "2026-07-06T10:00:00.000Z",
      summary: "Good reflection.",
      audio: { url: "/audio/reflection", durationMs: 2100 }
    }
  }, options);
  assert.match(statusHtml, /data-learning-growth-reflection-status/);
  assert.match(statusHtml, /Good reflection\./);
  assert.match(statusHtml, /反思录音 · 2 秒/);

  assert.match(renderReflectionPanel(task, options), /data-learning-growth-reflection-form="task_reflect"/);
  assert.equal(renderReflectionPanel({ taskCardId: "no_eval" }, options), "");

  assert.equal(dailyRewardCap(task), 60);
  assert.equal(dailyRewardEarned(task), 52);

  const signalHtml = renderExperienceSignalActions(task, state);
  assert.match(signalHtml, /data-learning-growth-experience-actions="task_reflect"/);
  assert.match(signalHtml, /data-signal-type="too_hard"/);
  assert.match(signalHtml, /is-pending/);
  assert.match(signalHtml, /data-target-node-ids="node_1 node_2"/);
  assert.match(signalHtml, /正在记录难度感受。/);

  const disabledSignalHtml = renderExperienceSignalActions({
    taskCardId: "task_no_nodes",
    status: "completed",
    workspaceId: "weixin_fanfan"
  }, {});
  assert.match(disabledSignalHtml, /暂时不能写入难度感受/);
  assert.match(disabledSignalHtml, /disabled/);

  const feedbackHtml = renderTeachingFeedbackSection(task, state);
  assert.match(feedbackHtml, /data-learning-growth-teaching-feedback/);
  assert.match(feedbackHtml, /已按本次分数结算 52 \/ 60 金币/);
  assert.match(feedbackHtml, /data-learning-growth-experience-signal="task_reflect"/);

  const incompleteFeedbackHtml = renderTeachingFeedbackSection({
    taskCardId: "task_feedback",
    status: "waiting",
    experienceSummary: { latestAt: "2026-07-06T09:00:00.000Z" }
  }, {});
  assert.match(incompleteFeedbackHtml, /学习反馈已记录/);
  assert.doesNotMatch(incompleteFeedbackHtml, /data-learning-growth-experience-actions/);
});

test("frontend ESM card interaction controller composes submission, evaluation, reflection, and feedback panels", () => {
  const state = {
    learningGrowthSubmissionDrafts: {
      task_compose: { submissionText: "Here is my first answer." }
    },
    learningGrowthSubmissionBusy: {},
    learningGrowthInteractionMessages: {
      [interactionKey("task_compose", "submission")]: "还差一句解释。",
      [interactionKey("task_compose", "reflection")]: "反思待提交。"
    },
    learningGrowthRecordings: {
      [interactionKey("task_compose", "submission")]: {
        status: "ready",
        url: "blob:submission"
      }
    }
  };
  const task = {
    taskCardId: "task_compose",
    workspaceId: "weixin_fanfan",
    flow: {
      quickCheck: {
        instruction: "Explain the idea in your own words.",
        completionCriteria: ["Name the rule", "Show one example"]
      }
    }
  };
  const options = {
    state,
    workspaceId: "weixin_fanfan",
    validation: { ok: false, message: "至少写满 30 个字。" }
  };

  assert.deepEqual(quickCheckFlow(task), task.flow.quickCheck);
  assert.equal(submissionDraftText(task, state), "Here is my first answer.");
  assert.match(submissionRequirementHtml({ ok: true, message: "可以提交。" }), /is-ready/);

  const formHtml = renderQuickCheckSubmissionForm(task, options);
  assert.match(formHtml, /data-learning-growth-teaching-check-form="task_compose"/);
  assert.match(formHtml, /data-learning-growth-submission-form="task_compose"/);
  assert.match(formHtml, /data-learning-growth-teaching-draft="task_compose"/);
  assert.match(formHtml, /data-learning-growth-recorder="task_compose"/);
  assert.match(formHtml, /Here is my first answer\./);
  assert.match(formHtml, /Show one example/);
  assert.match(formHtml, /还差一句解释。/);
  assert.match(formHtml, /todo-learning-growth-submit-requirement is-short/);
  assert.match(formHtml, /<button type="submit" >提交作答<\/button>/);

  const submittedTask = {
    ...task,
    status: "completed",
    latestSubmission: {
      submittedAt: "2026-07-06T12:00:00.000Z",
      wordCount: 36,
      textCharCount: 144
    },
    latestEvaluation: {
      score: 84,
      summary: "Good effort.",
      feedbackSections: { strengths: ["Clear example"] }
    },
    latestRewardSettlement: { coinAmount: 42 },
    experienceSummary: { targetNodeIds: ["node_1"] },
    targetNodeIds: ["node_1"]
  };

  const submittedHtml = renderCardInteractionPanel(submittedTask, options);
  assert.match(submittedHtml, /data-learning-growth-card-interaction="task_compose"/);
  assert.match(submittedHtml, /data-learning-growth-submission-status/);
  assert.match(submittedHtml, /data-learning-growth-evaluation-panel="task_compose"/);
  assert.match(submittedHtml, /data-learning-growth-reflection-form="task_compose"/);
  assert.match(submittedHtml, /data-learning-growth-teaching-feedback/);
  assert.match(submittedHtml, /data-learning-growth-experience-signal="task_compose"/);
  assert.doesNotMatch(submittedHtml, /data-learning-growth-teaching-draft="task_compose"/);
  assert.doesNotMatch(submittedHtml, /<button type="submit" >提交作答<\/button>/);
});

test("frontend ESM card interaction action helpers preserve legacy state and payload rules", () => {
  const model = {
    overview: {
      programs: {
        taskCards: [{ taskCardId: "task_action", workspaceId: "weixin_fanfan" }],
        executableTasks: [{ id: "exec_task", workspaceId: "weixin_exec" }]
      },
      board: {
        cards: [{ taskCardId: "board_task", workspaceId: "weixin_board" }]
      }
    },
    detailCache: new Map()
  };
  const state = {
    cardGeneration: {
      selectedWorkspaceId: "weixin_selected",
      context: { target: { workspaceId: "weixin_target" } }
    }
  };

  assert.equal(taskCardById(model, "task_action").workspaceId, "weixin_fanfan");
  assert.equal(taskCardById(model, "exec_task").workspaceId, "weixin_exec");
  assert.equal(workspaceIdForTaskCard({ taskCardId: "task_action", model, state }), "weixin_fanfan");
  assert.equal(workspaceIdForTaskCard({ taskCardId: "missing", model, state }), "weixin_selected");
  assert.equal(workspaceIdForTaskCard({
    taskCardId: "missing",
    model,
    state: {},
    getCurrentWorkspaceId: () => "weixin_current"
  }), "weixin_current");

  setInteractionMessage(state, "task_action", "submission", " 正在提交作答。 ");
  setSubmissionBusy(state, "task_action", true);
  setReflectionBusy(state, "task_action", true);
  setEvaluationBusy(state, "task_action", true);
  assert.equal(state.learningGrowthInteractionMessages["task_action:submission"], "正在提交作答。");
  assert.equal(state.learningGrowthSubmissionBusy.task_action, true);
  assert.equal(state.learningGrowthTeachingCheckBusy.task_action, true);
  assert.equal(state.learningGrowthReflectionBusy.task_action, true);
  assert.equal(state.learningGrowthEvaluationBusy.task_action, true);

  assert.deepEqual(createSubmissionPayload({}).error, "submission_content_required");
  assert.deepEqual(createSubmissionPayload({
    text: "  my answer  ",
    audio: { name: "answer.webm" }
  }).payload, {
    text: "my answer",
    author: "learner",
    stage: "final",
    source: "growth-plugin-card-ui",
    audio: { name: "answer.webm" }
  });
  assert.equal(createReflectionPayload({}).error, "reflection_content_required");
  assert.deepEqual(createReflectionPayload({ audio: { name: "reflection.webm" } }).payload, {
    text: "",
    author: "learner",
    source: "growth-plugin-card-ui",
    audio: { name: "reflection.webm" }
  });

  assert.deepEqual(normalizeExperienceSignalInput({
    taskCardId: " task_action ",
    signalType: " too_hard ",
    workspaceId: " weixin_fanfan ",
    targetNodeIds: "node_1  node_2"
  }), {
    taskCardId: "task_action",
    signalType: "too_hard",
    workspaceId: "weixin_fanfan",
    targetNodeIds: ["node_1", "node_2"]
  });
  assert.deepEqual(createExperienceSignalPayload({
    taskCardId: "task_action",
    signalType: "right_level",
    targetNodeIds: ["node_1", ""]
  }).payload, {
    signalType: "right_level",
    targetNodeIds: ["node_1"],
    source: "growth-plugin-card-ui"
  });
  assert.equal(createExperienceSignalPayload({ signalType: "right_level" }).error, "experience_signal_target_required");

  const applied = applyInteractionCardWriteResult({
    result: { card: { task_card_id: "ignored", taskCardId: "task_action", workspace_id: "weixin_result" } },
    taskCardId: "task_action",
    workspaceId: "weixin_fanfan",
    model,
    viewModel: {
      normalizeCard(card) {
        return {
          taskCardId: card.taskCardId,
          workspaceId: card.workspaceId
        };
      }
    },
    resolveWorkspaceId: () => "weixin_resolved"
  });
  assert.equal(applied.cacheKey, "weixin_resolved:task_action");
  assert.deepEqual(model.detailCache.get("weixin_resolved:task_action"), {
    taskCardId: "task_action",
    workspaceId: "weixin_result"
  });
});

test("frontend ESM audio recorder controller preserves fakeable browser recording lifecycle", async () => {
  const unsupportedState = { learningGrowthRecordings: {} };
  let unsupportedRenderCount = 0;
  const unsupportedController = createAudioRecorderController({
    root: {},
    state: unsupportedState,
    render() {
      unsupportedRenderCount += 1;
    }
  });
  await unsupportedController.startRecording("task_audio", "submission");
  assert.equal(unsupportedState.learningGrowthRecordings["task_audio:submission"].status, "unsupported");
  assert.equal(unsupportedRenderCount, 1);

  let currentTime = 1000;
  const stoppedTracks = [];
  const revokedUrls = [];
  const intervalIds = [];
  const clearedIntervals = [];
  const stream = {
    getTracks() {
      return [{ stop: () => stoppedTracks.push("track_stopped") }];
    }
  };
  class FakeBlob {
    constructor(chunks = [], options = {}) {
      this.chunks = chunks;
      this.type = options.type || "";
      this.size = chunks.reduce((total, chunk) => total + Number(chunk.size || chunk.length || 0), 0);
    }
  }
  class FakeMediaRecorder {
    static isTypeSupported(type) {
      return type === "audio/webm;codecs=opus" || type === "audio/webm";
    }

    constructor(inputStream, options = {}) {
      this.stream = inputStream;
      this.mimeType = options.mimeType || "audio/webm";
      this.listeners = {};
      this.started = false;
      this.stopped = false;
    }

    addEventListener(type, listener) {
      this.listeners[type] = listener;
    }

    start() {
      this.started = true;
      this.listeners.dataavailable?.({ data: { size: 7, length: 7 } });
    }

    stop() {
      this.stopped = true;
      currentTime = 4600;
      this.listeners.stop?.();
    }
  }
  const root = {
    MediaRecorder: FakeMediaRecorder,
    Blob: FakeBlob,
    URL: {
      createObjectURL: () => "blob:fake-audio",
      revokeObjectURL: (url) => revokedUrls.push(url)
    },
    document: {
      createElement(tagName) {
        assert.equal(tagName, "audio");
        return {
          canPlayType(type) {
            return type === "audio/webm;codecs=opus" ? "probably" : "";
          }
        };
      }
    },
    navigator: {
      mediaDevices: {
        async getUserMedia(request) {
          assert.deepEqual(request, { audio: true });
          return stream;
        }
      }
    },
    setInterval(callback, delay) {
      assert.equal(delay, 1000);
      intervalIds.push(callback);
      return 42;
    },
    clearInterval(id) {
      clearedIntervals.push(id);
    }
  };
  const state = { learningGrowthRecordings: {} };
  const renderSnapshots = [];
  const controller = createAudioRecorderController({
    root,
    state,
    now: () => currentTime,
    render(nextState) {
      renderSnapshots.push(nextState.learningGrowthRecordings["task_audio:submission"]?.status || "missing");
    },
    readBlobAsBase64: async () => "ZmFrZQ=="
  });

  assert.equal(preferredAudioMimeType(root), "audio/webm;codecs=opus");
  assert.equal(audioFileSuffix("audio/mp4"), "m4a");
  assert.equal(audioPlaybackWarning({
    document: {
      createElement: () => ({ canPlayType: () => "unsupported" })
    }
  }, "audio/unknown"), "录音已保存，但当前浏览器不能直接回放此音频格式。请重新录音；如果仍失败，可以先提交文字作答。");

  await controller.startRecording("task_audio", "submission");
  let recording = state.learningGrowthRecordings["task_audio:submission"];
  assert.equal(recording.status, "recording");
  assert.equal(recording.mimeType, "audio/webm;codecs=opus");
  assert.equal(recording.timerId, 42);
  assert.equal(recording.recorder.started, true);
  assert.deepEqual(renderSnapshots.slice(0, 2), ["requesting", "recording"]);

  currentTime = 2200;
  intervalIds[0]();
  assert.equal(recording.elapsedMs, 1200);

  controller.stopRecording("task_audio", "submission");
  recording = state.learningGrowthRecordings["task_audio:submission"];
  assert.equal(recording.status, "ready");
  assert.equal(recording.message, "录音已准备");
  assert.equal(recording.url, "blob:fake-audio");
  assert.equal(recording.durationMs, 3600);
  assert.equal(recording.name, "growth-submission-4600.webm");
  assert.deepEqual(clearedIntervals, [42]);
  assert.deepEqual(stoppedTracks, ["track_stopped"]);

  const payload = await controller.audioPayloadFromRecording(recording, "submission");
  assert.deepEqual(payload, {
    dataBase64: "ZmFrZQ==",
    name: "growth-submission-4600.webm",
    mime: "audio/webm;codecs=opus",
    durationMs: 3600
  });

  controller.handleRecordingPlaybackError("task_audio", "submission");
  assert.equal(state.learningGrowthRecordings["task_audio:submission"].playbackError, true);
  assert.match(state.learningGrowthRecordings["task_audio:submission"].message, /无法回放/);

  controller.clearRecording("task_audio", "submission");
  assert.equal(state.learningGrowthRecordings["task_audio:submission"], undefined);
  assert.deepEqual(revokedUrls, ["blob:fake-audio"]);
});

test("frontend ESM card interaction DOM events preserve legacy data attribute dispatch", async () => {
  function element(dataset = {}, options = {}) {
    return {
      dataset,
      value: options.value || "",
      disabled: Boolean(options.disabled),
      closest(selector) {
        if (options.closest && selector in options.closest) return options.closest[selector];
        return this.matches(selector) ? this : null;
      },
      matches(selector) {
        return Object.keys(dataset).some((key) => {
          const attr = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
          return selector.includes(`data-${attr}`);
        });
      },
      querySelector: options.querySelector || (() => null)
    };
  }

  assert.match(selectorForCardInteractionEventType("click"), /\[data-learning-growth-record-toggle\]/);
  assert.match(selectorForCardInteractionEventType("input"), /\[data-learning-growth-reflection-text\]/);
  assert.match(selectorForCardInteractionEventType("submit"), /\[data-learning-growth-submission-form\]/);
  assert.match(selectorForCardInteractionEventType("error"), /\[data-learning-growth-saved-audio\]/);
  assert.equal(selectorForCardInteractionEventType("change"), "");

  const draftInput = element({
    learningGrowthTeachingDraft: "task_dom",
    field: "submissionText"
  }, { value: "Draft answer" });
  assert.equal(cardInteractionElementFromEvent({
    type: "input",
    target: draftInput
  }, selectorForCardInteractionEventType("input")), draftInput);
  assert.deepEqual(cardInteractionActionFromDomEvent({
    type: "input",
    target: draftInput
  }), {
    type: "teachingDraftInput",
    taskCardId: "task_dom",
    field: "submissionText",
    value: "Draft answer",
    preventDefault: false
  });

  const state = {};
  await applyCardInteractionDomAction(cardInteractionActionFromDomEvent({
    type: "input",
    target: draftInput
  }), { state });
  await applyCardInteractionDomAction(cardInteractionActionFromDomEvent({
    type: "input",
    target: element({ learningGrowthReflectionText: "task_dom" }, { value: "Reflection note" })
  }), { state });
  assert.deepEqual(state.learningGrowthTeachingDrafts.task_dom, { submissionText: "Draft answer" });
  assert.deepEqual(state.learningGrowthReflectionDrafts.task_dom, { text: "Reflection note" });

  const calls = [];
  const renders = [];
  const controller = {
    toggleRecording(taskCardId, kind) {
      calls.push(["toggle", taskCardId, kind]);
    },
    clearRecording(taskCardId, kind) {
      calls.push(["clear", taskCardId, kind]);
    },
    handleRecordingPlaybackError(taskCardId, kind) {
      calls.push(["playback-error", taskCardId, kind]);
    },
    async submitEvidence(form) {
      calls.push(["submit", form.dataset.learningGrowthSubmissionForm]);
    },
    async refreshEvaluation(taskCardId) {
      calls.push(["refresh", taskCardId]);
    },
    async retryEvaluation(taskCardId, workspaceId) {
      calls.push(["retry", taskCardId, workspaceId]);
    },
    async submitReflection(form) {
      calls.push(["reflect", form.dataset.learningGrowthReflectionForm]);
    },
    async submitExperienceSignal(input) {
      calls.push(["experience", input.taskCardId, input.signalType, input.workspaceId, input.targetNodeIds.join(" ")]);
    },
    setMessage(taskCardId, kind, message) {
      calls.push(["message", taskCardId, kind, message]);
    }
  };

  const rootListeners = {};
  const removedListeners = [];
  const root = {
    addEventListener(type, listener, capture) {
      rootListeners[type] = { listener, capture };
    },
    removeEventListener(type, listener, capture) {
      removedListeners.push([type, listener === rootListeners[type]?.listener, capture]);
    }
  };
  const unbind = bindCardInteractionDomEvents({
    root,
    state,
    controller,
    render(nextState) {
      renders.push(nextState);
    }
  });
  assert.deepEqual(Object.keys(rootListeners), ["input", "click", "submit", "error"]);
  assert.equal(rootListeners.error.capture, true);

  let prevented = 0;
  rootListeners.click.listener({
    type: "click",
    target: element({ learningGrowthRecordToggle: "task_dom", recordKind: "reflection" }),
    preventDefault() {
      prevented += 1;
    }
  });
  rootListeners.click.listener({
    type: "click",
    target: element({ learningGrowthRecordClear: "task_dom" }),
    preventDefault() {
      prevented += 1;
    }
  });
  await rootListeners.submit.listener({
    type: "submit",
    target: element({ learningGrowthSubmissionForm: "task_dom" }),
    preventDefault() {
      prevented += 1;
    }
  });
  await rootListeners.click.listener({
    type: "click",
    target: element({ learningGrowthEvaluationRefresh: "task_dom" }),
    preventDefault() {
      prevented += 1;
    }
  });
  await rootListeners.click.listener({
    type: "click",
    target: element({ learningGrowthEvaluationRetry: "task_dom", workspaceId: "weixin_fanfan" }),
    preventDefault() {
      prevented += 1;
    }
  });
  await rootListeners.submit.listener({
    type: "submit",
    target: element({ learningGrowthReflectionForm: "task_dom" }),
    preventDefault() {
      prevented += 1;
    }
  });
  await rootListeners.click.listener({
    type: "click",
    target: element({
      learningGrowthExperienceSignal: "task_dom",
      signalType: "too_hard",
      workspaceId: "weixin_fanfan",
      targetNodeIds: "node_1 node_2"
    }),
    preventDefault() {
      prevented += 1;
    }
  });
  rootListeners.error.listener({
    type: "error",
    target: element({ learningGrowthRecordPlayback: "task_dom", recordKind: "submission" })
  });
  assert.equal(prevented, 7);
  assert.deepEqual(calls.slice(0, 8), [
    ["toggle", "task_dom", "reflection"],
    ["clear", "task_dom", "submission"],
    ["submit", "task_dom"],
    ["refresh", "task_dom"],
    ["retry", "task_dom", "weixin_fanfan"],
    ["reflect", "task_dom"],
    ["experience", "task_dom", "too_hard", "weixin_fanfan", "node_1 node_2"],
    ["playback-error", "task_dom", "submission"]
  ]);
  assert.ok(renders.length >= 1);

  const savedAudioError = { hidden: true };
  const savedAudioHolder = {
    querySelector(selector) {
      return selector === "[data-learning-growth-audio-error]" ? savedAudioError : null;
    }
  };
  rootListeners.error.listener({
    type: "error",
    target: element({ learningGrowthSavedAudio: "audio_1" }, {
      closest: {
        "[data-learning-growth-audio-evidence]": savedAudioHolder
      }
    })
  });
  assert.equal(savedAudioError.hidden, false);

  const failingController = {
    async submitEvidence() {
      throw new Error("submit_failed");
    },
    setMessage(taskCardId, kind, message) {
      calls.push(["failed-message", taskCardId, kind, message]);
    }
  };
  await applyCardInteractionDomAction({
    type: "submitEvidence",
    taskCardId: "task_failed",
    element: element({ learningGrowthSubmissionForm: "task_failed" })
  }, {
    state,
    controller: failingController,
    render(nextState) {
      renders.push(nextState);
    }
  });
  assert.deepEqual(calls.at(-1), ["failed-message", "task_failed", "submission", "submit_failed"]);

  unbind();
  assert.equal(removedListeners.length, 4);
  assert.deepEqual(removedListeners.map(([type, matched, capture]) => [type, matched, capture]), [
    ["input", true, undefined],
    ["click", true, undefined],
    ["submit", true, undefined],
    ["error", true, true]
  ]);
  assert.equal(bindCardInteractionDomEvents({ root: null })(), undefined);
});

test("frontend ESM card interaction controller wires API actions through injected state and refreshers", async () => {
  const state = {
    overview: {
      programs: {
        taskCards: [{ taskCardId: "task_controller", workspaceId: "weixin_fanfan" }]
      }
    },
    learningGrowthTeachingDrafts: {
      task_controller: { submissionText: "Draft answer from state" }
    },
    learningGrowthReflectionDrafts: {
      task_controller: { text: "Reflection from state" }
    },
    learningGrowthRecordings: {
      [interactionKey("task_controller", "submission")]: {
        blob: { type: "audio/webm" },
        name: "submission.webm",
        mimeType: "audio/webm",
        durationMs: 2400
      }
    }
  };
  const apiCalls = [];
  const refreshCalls = [];
  const renders = [];
  const controller = createCardInteractionController({
    state,
    model: state,
    viewModel: {
      normalizeCard(card) {
        return {
          taskCardId: card.taskCardId || card.task_card_id,
          workspaceId: card.workspaceId || card.workspace_id
        };
      }
    },
    api: {
      submitGrowthCardEvidence(taskCardId, payload, workspaceId) {
        apiCalls.push(["submit", taskCardId, payload.text, payload.audio?.name, workspaceId]);
        return { card: { taskCardId, workspace_id: workspaceId } };
      },
      processGrowthEvaluations(workspaceId, limit) {
        apiCalls.push(["evaluate", workspaceId, limit]);
        return { ok: true };
      },
      retryGrowthEvaluation(payload, workspaceId) {
        apiCalls.push(["retry", payload.task_card_id, payload.reason, workspaceId]);
        return { ok: true };
      },
      submitGrowthCardReflection(taskCardId, payload, workspaceId) {
        apiCalls.push(["reflect", taskCardId, payload.text, workspaceId]);
        return { card: { taskCardId, workspace_id: workspaceId } };
      },
      submitGrowthExperienceSignal(taskCardId, payload, workspaceId) {
        apiCalls.push(["experience", taskCardId, payload.signalType, payload.targetNodeIds.join(" "), workspaceId]);
        return { ok: true };
      }
    },
    refreshCard(taskCardId, workspaceId) {
      refreshCalls.push([taskCardId, workspaceId]);
    },
    render(nextState) {
      renders.push({
        submissionBusy: Boolean(nextState.learningGrowthSubmissionBusy?.task_controller),
        evaluationBusy: Boolean(nextState.learningGrowthEvaluationBusy?.task_controller),
        reflectionBusy: Boolean(nextState.learningGrowthReflectionBusy?.task_controller),
        experienceBusy: nextState.learningGrowthExperienceSignalBusy?.task_controller || ""
      });
    },
    readBlobAsBase64: async () => "ZmFrZQ=="
  });

  const form = {
    dataset: {
      learningGrowthSubmissionForm: "task_controller"
    },
    querySelector(selector) {
      assert.match(selector, /data-learning-growth-teaching-draft/);
      return { value: "Typed answer" };
    }
  };
  assert.equal(submissionTextForCard("task_controller", form, state), "Typed answer");
  assert.equal(reflectionTextForCard("task_controller", {
    querySelector: () => ({ value: "Typed reflection" })
  }, state), "Typed reflection");

  await controller.submitEvidence(form);
  assert.deepEqual(apiCalls.slice(0, 2), [
    ["submit", "task_controller", "Typed answer", "submission.webm", "weixin_fanfan"],
    ["evaluate", "weixin_fanfan", 3]
  ]);
  assert.equal(state.learningGrowthSubmissionBusy.task_controller, false);
  assert.equal(state.learningGrowthEvaluationBusy.task_controller, false);
  assert.equal(state.learningGrowthInteractionMessages["task_controller:submission"], "作答已提交，正在刷新批改。");
  assert.equal(state.learningGrowthInteractionMessages["task_controller:evaluation"], "批改状态已刷新。");
  assert.deepEqual(refreshCalls.at(-1), ["task_controller", "weixin_fanfan"]);
  assert.equal(state.learningGrowthRecordings["task_controller:submission"], undefined);

  await controller.retryEvaluation("task_controller", "weixin_fanfan");
  assert.ok(apiCalls.some((call) => call[0] === "retry" && call[2] === "owner_retry_from_growth_ui"));

  await controller.submitReflection({
    dataset: { learningGrowthReflectionForm: "task_controller" },
    querySelector: () => ({ value: "Reflection typed" })
  });
  assert.ok(apiCalls.some((call) => call[0] === "reflect" && call[2] === "Reflection typed"));
  assert.equal(state.learningGrowthReflectionBusy.task_controller, false);
  assert.equal(state.learningGrowthReflectionDrafts.task_controller, undefined);

  await controller.submitExperienceSignal({
    taskCardId: "task_controller",
    signalType: "right_level",
    targetNodeIds: "node_1 node_2"
  });
  assert.deepEqual(apiCalls.at(-1), ["experience", "task_controller", "right_level", "node_1 node_2", "weixin_fanfan"]);
  assert.equal(state.learningGrowthExperienceSignalSubmitted.task_controller, "right_level");
  assert.equal(state.learningGrowthExperienceSignalBusy.task_controller, "");
  assert.ok(renders.some((snapshot) => snapshot.submissionBusy));
  assert.ok(renders.some((snapshot) => snapshot.evaluationBusy));
  assert.ok(renders.some((snapshot) => snapshot.reflectionBusy));
  assert.ok(renders.some((snapshot) => snapshot.experienceBusy === "right_level"));
});

test("frontend ESM generation reducer preserves local card-generation mutations", () => {
  const state = {
    cardGeneration: {
      context: {
        graphOptions: {
          domainPacks: [
            { domainPackId: "pack_math", domain: "math", subjects: ["algebra", "geometry"] }
          ]
        }
      },
      targetProvisionDraft: { recipeId: "daily_math" },
      cycleHistory: {
        data: {
          cycles: [
            { taskCardId: "task_1", evaluationId: "eval_1" }
          ]
        }
      }
    }
  };

  assert.equal(cardGenerationState({}).constructor, Object);
  assert.equal(reduceCardGenerationActionDraft(state, { action: "update_owner_correction_note", note: " fix profile " }), true);
  assert.equal(state.cardGeneration.ownerCorrectionDraft, "fix profile");
  assert.equal(reduceCardGenerationActionDraft(state, { action: "select_domain_pack", domainPackId: "pack_math" }), true);
  assert.deepEqual(state.cardGeneration.targetProvisionDraft, {
    recipeId: "daily_math",
    domainPackId: "pack_math",
    domain: "math",
    subject: "algebra",
    status: "idle",
    error: ""
  });
  assert.equal(reduceCardGenerationActionDraft(state, { action: "select_subject", subject: "geometry" }), true);
  assert.equal(state.cardGeneration.targetProvisionDraft.subject, "geometry");
  assert.equal(reduceCardGenerationPreDispatchState(state, { action: "select_card_generation_recipe", recipeId: "weekly_review" }), true);
  assert.deepEqual(state.cardGeneration.targetProvisionDraft, {
    recipeId: "weekly_review",
    domainPackId: "",
    domain: "",
    subject: "",
    status: "loading",
    error: ""
  });

  const selectedCycle = reduceCycleHistorySelection(state, "task_1:eval_1:0");
  assert.equal(selectedCycle.taskCardId, "task_1");
  assert.equal(state.cardGeneration.cycleHistory.selectedCycleKey, "task_1:eval_1:0");

  const missingCycle = reduceCycleHistorySelection(state, "missing");
  assert.equal(missingCycle, null);
  assert.equal(state.cardGeneration.cycleDrilldown.status, "failed");
  assert.match(state.cardGeneration.cycleHistory.error, /未找到/);
});

test("frontend ESM release payload helpers preserve summary-only Owner readback payloads", () => {
  const context = {
    target: { workspaceId: "weixin_fanfan", learnerId: "fanfan" },
    domain: "english",
    subject: "english",
    horizon: "daily_plan",
    releaseWorkbench: {
      releaseWorkbench: {
        inventory: { latestCollectionRunId: "lgacr_ready_1" }
      }
    }
  };

  assert.deepEqual(createReleaseArtifactTemplateQueryPayload({ context, workspaceId: "weixin_fanfan" }), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    domain: "english",
    subject: "english",
    horizon: "daily_plan",
    collection_run_id: "lgacr_ready_1"
  });
  assert.deepEqual(createReleaseWorkbenchActionAuditQueryPayload({ context, workspaceId: "weixin_fanfan" }).limit, 5);
  assert.deepEqual(createReleaseStatusReadbackQueryPayload({ context, workspaceId: "weixin_fanfan" }).activation_record_limit, 5);
  assert.deepEqual(createReleaseEvidenceLedgerQueryPayload({ context, workspaceId: "weixin_fanfan" }).limit, 8);

  const activation = createReleaseLifecycleRecordPayload({ context, workspaceId: "weixin_fanfan", recordKind: "activation" });
  assert.equal(activation.evidence.summaryOnly, true);
  assert.equal(activation.activation_decision.advisoryOnly, true);
  assert.equal(Object.hasOwn(activation, "raw_prompt"), false);
  assert.equal(Object.hasOwn(activation, "transcript"), false);

  const preflight = createReleaseLifecycleRecordPayload({ context, workspaceId: "weixin_fanfan", recordKind: "preflight" });
  assert.equal(preflight.allow_write_preflight, true);
  assert.equal(Object.hasOwn(preflight, "evidence"), false);

  const packageBuild = createReleasePackageBuildPayload({
    context,
    workspaceId: "weixin_fanfan",
    action: {
      key: "release_package",
      action: "build",
      endpointKey: "release_package",
      source: "owner_ui",
      route: { body: { tasks: ["planner_readiness"], write_package_record: true } }
    }
  });
  assert.equal(packageBuild.action.summaryOnly, true);
  assert.deepEqual(packageBuild.tasks, ["planner_readiness"]);
  assert.equal(packageBuild.write_package_record, true);

  const workbenchAction = createReleaseWorkbenchActionPayload({
    context,
    workspaceId: "weixin_fanfan",
    action: {
      key: "visual_evidence",
      action: "record",
      endpointKey: "release_evidence_collection",
      route: {
        body: {
          tasks: ["central_visual"],
          auto_select_completed_cycle: true,
          central_visual_evidence_file: "docs/evidence/central.json"
        }
      }
    }
  });
  assert.equal(workbenchAction.action.summaryOnly, true);
  assert.deepEqual(workbenchAction.tasks, ["central_visual"]);
  assert.equal(workbenchAction.auto_select_completed_cycle, true);
  assert.equal(workbenchAction.central_visual_evidence_file, "docs/evidence/central.json");
});

test("frontend ESM automation payload helpers preserve Owner action payloads", () => {
  const context = {
    target: { workspaceId: "weixin_fanfan", learnerId: "fanfan" },
    programId: "science_daily",
    generationDefaults: { domainPackId: "pack_science", domain: "science", subject: "biology", cardSchemaVersion: "growth.card.authoring.v2" },
    suggestedPlan: { targetNodeIds: ["node_cell"] },
    targetProvisioning: {
      selectedDomainPackId: "pack_selected",
      selectedDomain: "science",
      selectedSubject: "chemistry"
    }
  };

  const createProposal = createAutomationProposalCreateActionPayload({
    context,
    workspaceId: "weixin_fanfan",
    selectedCycle: {
      selectors: {
        planDraftId: "draft_cycle",
        taskCardId: "task_cycle",
        targetNodeIds: ["node_cycle"]
      }
    }
  });
  assert.equal(createProposal.source_plan_draft_id, "draft_cycle");
  assert.equal(createProposal.source_task_card_id, "task_cycle");
  assert.deepEqual(createProposal.source_target_node_ids, ["node_cycle"]);
  assert.deepEqual(createProposal.target_node_ids, ["node_cycle"]);
  assert.equal(createProposal.domain_pack_id, "pack_selected");
  assert.equal(createProposal.subject, "chemistry");

  const operatingLoop = createOperatingLoopAdvancePayload({
    context: {
      ...context,
      learningLoopState: {
        nextAction: {
          action: "review_stage_assessment",
          planDraftId: "draft_next",
          itemId: "item_next",
          taskCardId: "task_next"
        }
      },
      suggestedPlan: {
        ...context.suggestedPlan,
        assessmentCoverageNodeIds: ["node_stage"]
      }
    },
    workspaceId: "weixin_fanfan",
    state: {
      targetProvisionDraft: { recipeId: "daily_science_v2" }
    }
  });
  assert.equal(operatingLoop.action, "run_next");
  assert.equal(operatingLoop.plan_draft_id, "draft_next");
  assert.equal(operatingLoop.selected_item_id, "item_next");
  assert.equal(operatingLoop.confirm_stage_assessment, true);
  assert.equal(operatingLoop.allow_stage_activation, true);
  assert.deepEqual(operatingLoop.assessment_coverage_node_ids, ["node_stage"]);

  const cycleClosure = createAutomationCycleClosurePayload({
    context,
    workspaceId: "weixin_fanfan",
    selectedCycle: { selectors: { taskCardId: "task_cycle" } }
  });
  assert.equal(cycleClosure.auto_select_latest_completed_cycle, true);
  assert.equal(cycleClosure.accept_proposal, true);
  assert.equal(cycleClosure.create_digest, true);
  assert.equal(cycleClosure.review_digest, false);
  assert.equal(cycleClosure.task_card_id, undefined);
  assert.equal(cycleClosure.source_task_card_id, "task_cycle");

  const reviewAdvancement = createAutomationReviewAdvancementPayload({
    context,
    workspaceId: "weixin_fanfan",
    selectedCycle: { selectors: { taskCardId: "task_cycle" } }
  });
  assert.equal(reviewAdvancement.prepare_review_packet, true);
  assert.equal(reviewAdvancement.ensure_failure_policy, true);
  assert.equal(reviewAdvancement.create_handoff, true);
  assert.equal(reviewAdvancement.attempt_execution, false);

  const proposal = createAutomationProposalDecisionPayload({
    context,
    workspaceId: "weixin_fanfan",
    proposal: { proposalId: "proposal_1" },
    status: "accepted"
  });
  assert.equal(proposal.proposal_id, "proposal_1");
  assert.equal(proposal.reason, "Owner accepted supervised next-card proposal.");
  assert.equal(proposal.reviewed_by, "owner");

  const publish = createAutomationProposalPublishPayload({
    context,
    workspaceId: "weixin_fanfan",
    proposal: { proposalId: "proposal_1", planDraftId: "draft_1" }
  });
  assert.equal(publish.proposal_id, "proposal_1");
  assert.equal(publish.generation_key, "automation_proposal:proposal_1:draft_1");
  assert.equal(publish.card_schema_version, "growth.card.authoring.v2");

  const createDigest = createAutomationDigestCreatePayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.equal(createDigest.limit, 6);
  assert.equal(createDigest.requested_by, "owner");

  const digest = createAutomationDigestReviewPayload({
    context,
    workspaceId: "weixin_fanfan",
    digest: { digestId: "digest_1", requiredActions: [{ candidateId: "candidate_1" }] },
    status: "reviewed"
  });
  assert.deepEqual(digest.selected_candidate_ids, ["candidate_1"]);
  assert.equal(digest.reason, "Owner reviewed automation digest without publishing.");

  const policy = createAutomationFailurePolicyReviewPayload({
    context,
    workspaceId: "weixin_fanfan",
    policy: { policyId: "policy_1" },
    status: "active"
  });
  assert.equal(policy.policy_id, "policy_1");
  assert.equal(policy.note, "Visible failure and Owner retry policy activated.");

  const createPolicy = createAutomationFailurePolicyCreatePayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.equal(createPolicy.policy_version, "growth.learningAutomationFailurePolicy.v1");
  assert.equal(createPolicy.policy.summaryOnly, true);
  assert.equal(createPolicy.rollback_policy.transactionalPublishRequired, true);
  assert.equal(createPolicy.failure_policy.visibleFailureRequired, true);

  const handoff = createAutomationActionHandoffPayload({
    context,
    workspaceId: "weixin_fanfan",
    digest: { digestId: "digest_1" }
  });
  assert.equal(handoff.digest_id, "digest_1");
  assert.match(handoff.summary, /reviewed digest digest_1/);

  const execution = createAutomationSchedulerExecutionPayload({
    context,
    workspaceId: "weixin_fanfan",
    handoff: {
      handoffId: "handoff_1",
      digestId: "digest_1",
      policyId: "policy_1",
      actions: [{ proposalId: "proposal_1", planDraftId: "draft_1", selectedItemId: "item_1" }]
    }
  });
  assert.equal(execution.execution_mode, "owner_explicit_once");
  assert.equal(execution.generation_key, "scheduler_execution:handoff_1:proposal_1:draft_1:item_1");
  assert.equal(execution.card_schema_version, "growth.card.authoring.v2");

  const schedulerRun = createAutomationSchedulerRunPayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.equal(schedulerRun.run_mode, "background_supervised_tick");
  assert.equal(schedulerRun.limit, 5);
  assert.equal(schedulerRun.generation_key, "scheduler_run:weixin_fanfan:science:chemistry:daily_plan");

  const createWorkerTarget = createAutomationSchedulerWorkerTargetPayload({
    context,
    workspaceId: "weixin_fanfan"
  });
  assert.deepEqual(createWorkerTarget.target_node_ids, ["node_cell"]);
  assert.equal(createWorkerTarget.policy.productionSchedulingAllowed, false);
  assert.equal(createWorkerTarget.policy.workerMode, "background_worker_tick");

  const workerTarget = createAutomationSchedulerWorkerTargetReviewPayload({
    context,
    workspaceId: "weixin_fanfan",
    target: { workerTargetId: "target_1" },
    status: "enabled"
  });
  assert.equal(workerTarget.target_id, "target_1");
  assert.match(workerTarget.reason, /production scheduling remains disabled/);

  const recommendation = createRecommendationLifecycleDecisionPayload({
    context,
    workspaceId: "weixin_fanfan",
    recommendation: { trajectoryId: "trajectory_1", sourceTaskCardId: "task_1", sourceEvaluationId: "eval_1" },
    status: "expired"
  });
  assert.equal(recommendation.trajectory_id, "trajectory_1");
  assert.equal(recommendation.reason_code, "owner_expired_stale_recommendation");
});

test("frontend ESM card generation render helpers preserve target and progress markup", () => {
  const context = {
    target: { workspaceId: "weixin_fanfan", learnerId: "fanfan", displayName: "凡凡", enabled: true },
    targetProvisioning: {
      targetEnabled: true,
      mode: "sample_default",
      selectedDomain: "science",
      selectedSubject: "biology",
      graphOptions: {
        selectedDomainPackId: "pack_science",
        domainPacks: [{ domainPackId: "pack_science", domain: "science", subjects: ["biology", "physics"] }]
      }
    }
  };
  const targetsHtml = targetRowsWithContext({
    targets: [{ workspaceId: "weixin_owner", label: "Owner" }],
    context,
    currentWorkspaceId: "weixin_fanfan"
  });
  assert.match(targetsHtml, /data-card-generation-target="weixin_fanfan"/);
  assert.match(targetsHtml, /class="learning-card-generation-target active"/);
  assert.match(targetsHtml, /凡凡/);

  const provisionHtml = targetProvisioningPanel(context, {
    targetProvisionDraft: { subject: "physics" }
  });
  assert.match(provisionHtml, /data-card-generation-target-provisioning/);
  assert.match(provisionHtml, /data-target-provisioning-enabled="true"/);
  assert.match(provisionHtml, /value="pack_science" selected/);
  assert.match(provisionHtml, /<option value="physics" selected>physics<\/option>/);
  assert.match(provisionHtml, />更新开通<\/button>/);

  const progressHtml = progressPanel({
    status: "publishing",
    progressStep: "authoring",
    progressMessage: "正在根据已验证计划项生成卡片。"
  });
  assert.match(progressHtml, /data-card-generation-progress/);
  assert.match(progressHtml, /role="status"/);
  assert.match(progressHtml, /正在发布卡片/);
  assert.match(progressHtml, /data-progress-step="authoring" data-progress-state="active"/);
  assert.match(progressHtml, /正在根据已验证计划项生成卡片。/);
  assert.equal(progressPanel({ status: "idle" }), "");
});

test("frontend ESM card generation readiness helpers preserve recipe and summary markup", () => {
  const context = {
    selectedRecipeId: "daily_science_v1",
    recipes: [
      { id: "daily_english_v1", label: "日常英语卡" },
      { id: "daily_science_v1", label: "日常科学卡", durationMinutes: { min: 12, max: 18 } }
    ],
    readiness: {
      targetEnabled: true,
      learningGraphReady: true,
      historySummaryReady: false,
      gatewayConfigured: true,
      plannerContextReady: true,
      evaluationGatewayConfigured: false
    },
    graph: { nodeCount: 294, edgeCount: 329 },
    targetProvisioning: {
      targetEnabled: true,
      mode: "explicit_provision",
      selectedSubject: "science"
    },
    historySummary: {
      learnerSummary: { recentCardCount: 4, completedRecentCardCount: 3 },
      recentTrajectoryCount: 2
    },
    learningProfile: {
      summary: { masteryStateCount: 7 }
    }
  };

  const readinessHtml = readinessRows(context);
  assert.match(readinessHtml, /Planner Gateway/);
  assert.match(readinessHtml, /294 节点 \/ 329 关系/);
  assert.match(readinessHtml, /data-ready="false"/);
  assert.match(readinessHtml, /已开通 · science/);

  const recipeHtml = recipeOptions(context);
  assert.match(recipeHtml, /data-card-generation-recipe="daily_science_v1"/);
  assert.match(recipeHtml, /learning-card-generation-recipe active/);
  assert.match(recipeHtml, /12-18 分钟 · 低压力/);

  const historyHtml = historyFacts(context);
  assert.match(historyHtml, /近期卡片/);
  assert.match(historyHtml, /<strong>4<\/strong>/);
  assert.match(historyHtml, /画像点/);
  assert.match(historyHtml, /<strong>7<\/strong>/);
});

test("frontend ESM learning loop state helpers preserve readback status and next action markup", () => {
  assert.equal(learningLoopStatusText("ready_to_draft"), "可起草");
  assert.equal(learningLoopStatusText("stage_checkpoint_active"), "测评进行中");
  assert.equal(learningLoopStatusText("needs_owner_review"), "需检查");
  assert.equal(learningLoopStatusText(""), "未读取");
  assert.equal(learningLoopReasonText("daily_plan_ready"), "可以根据当前画像起草一张低压力日常卡。");
  assert.equal(learningLoopReasonText("next_strategy:repair"), "下一张策略：repair");
  assert.equal(learningLoopReasonText(""), "状态来自 Growth learning-loop state，只包含 summary-only 证据。");

  const readyHtml = learningLoopStatePanel({}, {
    learningLoopState: {
      status: "ready_to_draft",
      nextAction: {
        action: "draft_daily_plan",
        reason: "daily_plan_ready"
      },
      summary: {
        weaknessCount: 3,
        missingRequired: ["profile_delta", "reward_settlement"]
      },
      stageAssessment: {
        eligible: true,
        status: "stage_checkpoint_ready"
      }
    }
  });
  assert.match(readyHtml, /data-learning-loop-state-panel/);
  assert.match(readyHtml, /data-learning-loop-state-status="ready_to_draft"/);
  assert.match(readyHtml, /可以根据当前画像起草一张低压力日常卡。/);
  assert.match(readyHtml, /<em>可起草<\/em>/);
  assert.match(readyHtml, /<small>下一步<\/small><strong>起草日常计划<\/strong>/);
  assert.match(readyHtml, /<small>弱点<\/small><strong>3<\/strong>/);
  assert.match(readyHtml, /<small>审计缺口<\/small><strong>2<\/strong>/);
  assert.match(readyHtml, /<small>阶段测评<\/small><strong>可检查<\/strong>/);

  const activeHtml = learningLoopStatePanel({}, {
    learningLoopState: {
      status: "stage_checkpoint_active",
      nextAction: {
        action: "complete_active_stage_assessment",
        reason: "stage_checkpoint_active",
        taskCardId: "task_stage_next"
      },
      profile: { weaknessCount: 1 },
      audit: { missingRequired: ["owner_review"] },
      stageAssessment: {
        status: "active",
        generatedTaskCardId: "task_stage_1"
      }
    }
  });
  assert.match(activeHtml, /data-learning-loop-state-status="stage_checkpoint_active"/);
  assert.match(activeHtml, /已有正式阶段测评卡进行中/);
  assert.match(activeHtml, /<small>下一步<\/small><strong>完成阶段测评<\/strong>/);
  assert.match(activeHtml, /阶段测评进行中/);
  assert.match(activeHtml, /data-learning-open-growth-task="task_stage_1"/);

  const loadingHtml = learningLoopStatePanel({ learningLoopState: { status: "loading" } });
  assert.match(loadingHtml, /data-learning-loop-state-status="loading"/);
  assert.match(loadingHtml, /正在读取 daily-loop preview、画像、审计和阶段测评摘要。/);
  assert.match(loadingHtml, /<em>读取中<\/em>/);

  const failedHtml = learningLoopStatePanel({ learningLoopState: { status: "failed", error: "learning_loop_state_failed" } });
  assert.match(failedHtml, /data-learning-loop-state-status="failed"/);
  assert.match(failedHtml, /learning_loop_state_failed/);
  assert.match(failedHtml, /<em>读取失败<\/em>/);
});

test("frontend ESM card generation action helpers preserve daily-loop blocking rules and action markup", () => {
  const context = {
    target: { enabled: true },
    learningLoopState: {
      nextAction: {
        action: "draft_daily_plan",
        enabled: true,
        reason: "daily_plan_ready"
      }
    }
  };
  const readiness = {
    targetEnabled: true,
    workspaceProvisioned: true,
    learningGraphReady: true,
    historySummaryReady: true,
    plannerContextReady: true,
    plannerGatewayConfigured: true,
    authoringGatewayConfigured: true
  };
  const plan = {
    title: "Evidence answer",
    targetNodeId: "kg_english_evidence_answering",
    domain: "english",
    evidenceRequirements: ["short_answer", "reflection"]
  };

  assert.equal(selectedPlanItem({
    selectedItemId: "item_2",
    items: [{ itemId: "item_1" }, { itemId: "item_2", title: "Selected" }]
  }).title, "Selected");
  assert.equal(selectedPlanItem({
    selectedItem: { itemId: "selected_direct", title: "Direct" },
    items: [{ itemId: "item_1" }]
  }).title, "Direct");
  assert.equal(operatingLoopRunBlockedReason({ state: {}, context }), "");
  assert.equal(operatingLoopRunBlockedReason({
    state: {},
    context: { learningLoopState: { nextAction: { action: "owner_review", enabled: true } } }
  }), "当前 next action 需要在对应面板单独处理。");
  assert.equal(operatingLoopRunBlockedReason({
    state: {},
    context: { learningLoopState: { nextAction: { action: "draft_daily_plan", enabled: false, reason: "planner_gateway_not_ready" } } }
  }), "Planner Gateway 尚未配置。");

  assert.equal(dailyLoopDraftBlockedReason({ state: {}, context, readiness, plan }), "");
  assert.equal(dailyLoopDraftBlockedReason({
    state: {},
    context,
    readiness: Object.assign({}, readiness, { targetEnabled: false }),
    plan
  }), "请先在左侧选择凡凡，再生成卡片。");
  assert.equal(dailyLoopDraftBlockedReason({
    state: {},
    context,
    readiness: Object.assign({}, readiness, { plannerGatewayConfigured: false, gatewayConfigured: false }),
    plan
  }), "Planner Gateway 尚未配置，暂不能规划卡片。");
  assert.equal(dailyLoopAdvanceBlockedReason({
    state: {},
    context,
    readiness: Object.assign({}, readiness, { authoringGatewayConfigured: false }),
    plan
  }), "Gateway authoring 尚未配置，暂不能生成卡片。");
  assert.equal(dailyLoopPublishBlockedReason({
    state: {},
    context,
    readiness,
    draftResult: { planDraft: { planDraftId: "draft_1", selectedItemId: "item_2", items: [{ itemId: "item_2" }] } }
  }), "");
  assert.equal(dailyLoopPublishBlockedReason({
    state: {},
    context,
    readiness,
    draftResult: { planDraft: { planDraftId: "draft_1", items: [] } }
  }), "计划草稿没有可发布的计划项。");
  assert.equal(primaryGenerationBlockedReason({ state: {}, context, readiness, plan }), "");
  assert.equal(primaryGenerationBlockedReason({
    state: {},
    context: { learningLoopState: { nextAction: { action: "review_stage_assessment", enabled: true } } },
    readiness,
    plan
  }), "当前下一步是阶段测评，请使用闭环执行或阶段测评面板。");

  const blocked = blockedAttributes("Gateway <missing>");
  assert.match(blocked, /disabled/);
  assert.match(blocked, /aria-disabled="true"/);
  assert.match(blocked, /Gateway &lt;missing&gt;/);

  const html = cardGenerationActionPanel({
    state: { status: "publishing" },
    plan,
    canAdvance: true,
    canDraft: false,
    canPublish: false,
    advanceClass: "primary",
    draftClass: "secondary",
    publishClass: "secondary",
    draftBlockedAttrs: blockedAttributes("请先规划下一张，再发布卡片。"),
    publishBlockedAttrs: blockedAttributes("Gateway authoring 尚未配置，暂不能发布卡片。")
  });
  assert.match(html, /data-card-generation-action-panel/);
  assert.match(html, /<em>可操作<\/em>/);
  assert.match(html, /Evidence answer/);
  assert.match(html, /short_answer · reflection/);
  assert.match(html, /data-card-generation-refresh/);
  assert.match(html, /class="primary" data-card-generation-advance/);
  assert.match(html, /data-card-generation-draft disabled data-card-generation-blocked-reason="请先规划下一张，再发布卡片。"/);
  assert.match(html, /data-card-generation-publish disabled data-card-generation-blocked-reason="Gateway authoring 尚未配置，暂不能发布卡片。" aria-disabled="true" disabled>正在发布<\/button>/);
});

test("frontend ESM generation event descriptors preserve legacy data-action routing", () => {
  assert.ok(cardGenerationClickSelectors.includes("[data-card-generation-advance]"));
  assert.ok(cardGenerationClickSelectors.includes("[data-release-workbench-action]"));
  assert.ok(cardGenerationClickSelectors.includes("[data-automation-scheduler-worker-target-review]"));
  assert.ok(cardGenerationInputSelectors.includes("[data-card-generation-domain-pack]"));
  assert.ok(cardGenerationInputSelectors.includes("[data-owner-audit-review-note]"));
  assert.ok(cardGenerationSubmitSelectors.includes("[data-card-generation-correction-form]"));

  assert.deepEqual(cardGenerationActionFromDataset({ cardGenerationTarget: "weixin_fanfan" }), {
    feature: "card_generation",
    action: "load_card_generation_context",
    preventDefault: true,
    workspaceId: "weixin_fanfan"
  });
  assert.deepEqual(cardGenerationActionFromDataset({ cardGenerationRecipe: "daily_science_v1" }), {
    feature: "card_generation",
    action: "select_card_generation_recipe",
    preventDefault: true,
    recipeId: "daily_science_v1"
  });
  assert.deepEqual(cardGenerationActionFromDataset({ cardGenerationDomainPack: "" }, { value: "pack_science" }), {
    feature: "card_generation",
    action: "select_domain_pack",
    preventDefault: true,
    domainPackId: "pack_science"
  });
  assert.deepEqual(cardGenerationActionFromDataset({ cardGenerationAdvance: "" }), {
    feature: "card_generation",
    action: "advance_operating_loop",
    preventDefault: true
  });
  assert.deepEqual(cardGenerationActionFromDataset({
    cardGenerationDraft: "",
    cardGenerationBlockedReason: "Planner Gateway 尚未配置。"
  }), {
    feature: "card_generation",
    action: "draft_daily_loop",
    preventDefault: true,
    blocked: true,
    blockedReason: "Planner Gateway 尚未配置。"
  });
  assert.deepEqual(cardGenerationActionFromDataset({ cardGenerationPublish: "" }, { disabled: true }), {
    feature: "card_generation",
    action: "publish_daily_loop",
    preventDefault: true,
    ignored: true,
    reason: "disabled"
  });

  assert.deepEqual(cardGenerationActionFromDataset({
    ownerAuditReviewDecision: "accepted",
    ownerAuditReviewBlockedReason: "请先选择一条完成周期。"
  }), {
    feature: "card_generation",
    action: "record_owner_audit_review",
    preventDefault: true,
    blocked: true,
    blockedReason: "请先选择一条完成周期。",
    decision: "accepted"
  });
  assert.deepEqual(cardGenerationActionFromDataset({
    releaseWorkbenchAction: "",
    releaseWorkbenchActionKey: "record_evidence",
    releaseWorkbenchEndpointKey: "release_evidence"
  }), {
    feature: "card_generation",
    action: "record_release_workbench_action",
    preventDefault: true,
    actionKey: "record_evidence",
    endpointKey: "release_evidence"
  });
  assert.deepEqual(cardGenerationActionFromDataset({
    releaseWorkbenchAction: "",
    releaseWorkbenchActionKey: "record_evidence",
    releaseWorkbenchEndpointKey: "release_evidence",
    releaseWorkbenchBlockedReason: "release evidence incomplete"
  }), {
    feature: "card_generation",
    action: "record_release_workbench_action",
    preventDefault: true,
    blocked: true,
    blockedReason: "release evidence incomplete",
    actionKey: "record_evidence",
    endpointKey: "release_evidence"
  });
  assert.deepEqual(cardGenerationActionFromDataset({
    releaseWorkbenchAction: "",
    releaseWorkbenchActionKey: "record_evidence"
  }, { disabled: true }), {
    feature: "card_generation",
    action: "record_release_workbench_action",
    preventDefault: true,
    ignored: true,
    reason: "disabled"
  });
  assert.deepEqual(cardGenerationActionFromDataset({
    releaseLifecycleRecord: "activation"
  }), {
    feature: "card_generation",
    action: "record_release_lifecycle_record",
    preventDefault: true,
    recordKind: "activation"
  });

  assert.deepEqual(cardGenerationActionFromDataset({
    automationProposalReview: "approved",
    automationProposalId: "proposal_1"
  }), {
    feature: "card_generation",
    action: "review_automation_proposal",
    preventDefault: true,
    proposalId: "proposal_1",
    status: "approved"
  });
  assert.deepEqual(cardGenerationActionFromDataset({
    automationSchedulerExecutionExecute: "",
    automationActionHandoffId: "handoff_1"
  }), {
    feature: "card_generation",
    action: "execute_automation_scheduler_once",
    preventDefault: true,
    handoffId: "handoff_1",
    executionId: ""
  });
  assert.deepEqual(cardGenerationActionFromDataset({
    automationSchedulerWorkerTargetReview: "approved",
    automationSchedulerWorkerTargetId: "target_1"
  }), {
    feature: "card_generation",
    action: "review_automation_scheduler_worker_target",
    preventDefault: true,
    targetId: "target_1",
    status: "approved"
  });
  assert.deepEqual(cardGenerationActionFromDataset({ stageAssessmentActivate: "" }), {
    feature: "card_generation",
    action: "activate_stage_assessment",
    preventDefault: true
  });
  assert.equal(cardGenerationActionFromDataset({ unrelated: "value" }), null);

  const elementAction = cardGenerationEventActionFromElement({
    disabled: false,
    value: "biology",
    dataset: { cardGenerationSubject: "" }
  });
  assert.deepEqual(elementAction, {
    feature: "card_generation",
    action: "select_subject",
    preventDefault: true,
    subject: "biology"
  });
  assert.deepEqual(cardGenerationActionFromDataset({ cardGenerationCorrectionForm: "" }), {
    feature: "card_generation",
    action: "submit_owner_correction",
    preventDefault: true
  });
});

test("frontend ESM app DOM adapter delegates card generation events to descriptors", () => {
  assert.match(selectorForCardGenerationEventType("click"), /\[data-card-generation-advance\]/);
  assert.match(selectorForCardGenerationEventType("change"), /\[data-card-generation-domain-pack\]/);
  assert.match(selectorForCardGenerationEventType("input"), /\[data-owner-audit-review-note\]/);
  assert.match(selectorForCardGenerationEventType("submit"), /\[data-card-generation-correction-form\]/);
  assert.equal(selectorForCardGenerationEventType("keydown"), "");

  const button = {
    disabled: false,
    value: "",
    dataset: { cardGenerationAdvance: "" },
    closest(selector) {
      assert.match(selector, /\[data-card-generation-advance\]/);
      return this;
    }
  };
  assert.equal(actionElementFromEvent({ target: button }, selectorForCardGenerationEventType("click")), button);
  assert.deepEqual(cardGenerationActionFromDomEvent({ type: "click", target: button }), {
    feature: "card_generation",
    action: "advance_operating_loop",
    preventDefault: true
  });

  const select = {
    disabled: false,
    value: "pack_science",
    dataset: { cardGenerationDomainPack: "" },
    closest() {
      return this;
    }
  };
  assert.deepEqual(cardGenerationActionFromDomEvent({ type: "change", target: select }), {
    feature: "card_generation",
    action: "select_domain_pack",
    preventDefault: true,
    domainPackId: "pack_science"
  });

  const listeners = {};
  const root = {
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    removeEventListener(type, listener) {
      if (listeners[type] === listener) delete listeners[type];
    }
  };
  const dispatched = [];
  const unbind = bindCardGenerationDomEvents({
    root,
    dispatch(action, event) {
      dispatched.push({ action, type: event.type });
    }
  });
  assert.deepEqual(Object.keys(listeners).sort(), ["change", "click", "input", "submit"]);

  let prevented = false;
  listeners.click({
    type: "click",
    target: button,
    preventDefault() {
      prevented = true;
    }
  });
  assert.equal(prevented, true);
  assert.deepEqual(dispatched[0], {
    type: "click",
    action: {
      feature: "card_generation",
      action: "advance_operating_loop",
      preventDefault: true
    }
  });

  listeners.input({
    type: "input",
    target: {
      disabled: false,
      value: "summary-only note",
      dataset: { ownerAuditReviewNote: "" },
      closest() {
        return this;
      }
    },
    preventDefault() {}
  });
  assert.equal(dispatched[1].action.action, "update_owner_audit_review_note");
  assert.equal(dispatched[1].action.note, "summary-only note");

  listeners.submit({
    type: "submit",
    target: {
      disabled: false,
      dataset: { cardGenerationCorrectionForm: "" },
      closest() {
        return this;
      }
    },
    preventDefault() {}
  });
  assert.equal(dispatched[2].action.action, "submit_owner_correction");

  unbind();
  assert.deepEqual(listeners, {});
  assert.equal(bindCardGenerationDomEvents({ root: null, dispatch() {} })(), undefined);
});

test("frontend ESM action dispatcher maps descriptors to injected handlers", async () => {
  assert.equal(cardGenerationActionHandlerName("advance_operating_loop"), "advanceOperatingLoopFromUi");
  assert.equal(cardGenerationActionFailureTarget("advance_operating_loop"), "operatingLoop");
  assert.equal(cardGenerationActionHandlerName("refresh_release_evidence_ledger"), "refreshReleaseEvidenceLedger");
  assert.equal(cardGenerationActionFailureTarget("refresh_release_evidence_ledger"), "releaseEvidenceLedger");
  assert.equal(cardGenerationActionHandlerName("activate_stage_assessment"), "activateStageAssessmentFromUi");
  assert.equal(cardGenerationActionFailureTarget("activate_stage_assessment"), "stageAssessment");
  assert.equal(cardGenerationActionHandlerName("unknown_action"), "");
  assert.equal(cardGenerationActionFailureTarget("unknown_action"), "cardGeneration");
  assert.equal(cardGenerationActionRoute("publish_daily_loop").handler, "publishDailyLoopFromUi");
  assert.ok(Object.keys(cardGenerationActionRoutes()).length >= 50);

  const calls = [];
  const handled = await dispatchCardGenerationAction({
    feature: "card_generation",
    action: "record_release_workbench_action",
    actionKey: "record_evidence"
  }, {
    recordReleaseWorkbenchActionFromUi(button) {
      calls.push(button);
      return { ok: true, recordId: button.dataset.releaseWorkbenchActionKey };
    }
  });
  assert.equal(handled.status, "handled");
  assert.equal(handled.handler, "recordReleaseWorkbenchActionFromUi");
  assert.equal(handled.failureTarget, "releaseWorkbench");
  assert.deepEqual(handled.value, { ok: true, recordId: "record_evidence" });
  assert.deepEqual(calls[0], {
    disabled: false,
    dataset: {
      releaseWorkbenchAction: "record_evidence",
      releaseWorkbenchActionKey: "record_evidence"
    }
  });
  assert.equal(handled.action.route.handler, "recordReleaseWorkbenchActionFromUi");

  const refreshCalls = [];
  const refresh = await dispatchCardGenerationAction({
    feature: "card_generation",
    action: "refresh_release_evidence_ledger",
    options: { silent: true }
  }, {
    refreshReleaseEvidenceLedger(action) {
      refreshCalls.push(action);
      return { ok: true, silent: action.options?.silent === true };
    }
  });
  assert.equal(refresh.status, "handled");
  assert.deepEqual(refresh.value, { ok: true, silent: true });
  assert.equal(refreshCalls[0].action, "refresh_release_evidence_ledger");
  assert.equal(refreshCalls[0].route.handler, "refreshReleaseEvidenceLedger");

  const blockedEvents = [];
  const blocked = await dispatchCardGenerationAction({
    feature: "card_generation",
    action: "draft_daily_loop",
    blocked: true,
    blockedReason: "Planner Gateway 尚未配置。"
  }, {}, {
    onBlocked(event) {
      blockedEvents.push(event);
    }
  });
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.failureTarget, "cardGeneration");
  assert.equal(blocked.reason, "Planner Gateway 尚未配置。");
  assert.equal(blockedEvents.length, 1);

  const ignored = await dispatchCardGenerationAction({
    feature: "card_generation",
    action: "publish_daily_loop",
    ignored: true,
    reason: "disabled"
  });
  assert.equal(ignored.status, "ignored");
  assert.equal(ignored.failureTarget, "cardGeneration");
  assert.equal(ignored.reason, "disabled");

  const missingEvents = [];
  const missing = await dispatchCardGenerationAction({
    feature: "card_generation",
    action: "refresh_automation_proposals"
  }, {}, {
    onUnhandled(event) {
      missingEvents.push(event);
    }
  });
  assert.equal(missing.status, "unhandled");
  assert.equal(missing.reason, "missing_handler");
  assert.equal(missing.handler, "refreshAutomationProposals");
  assert.equal(missing.failureTarget, "automationProposals");
  assert.equal(missingEvents.length, 1);

  const unknown = await dispatchCardGenerationAction({ action: "not_real" });
  assert.equal(unknown.status, "unhandled");
  assert.equal(unknown.reason, "unknown_action");

  const errors = [];
  const failed = await dispatchCardGenerationAction({
    feature: "card_generation",
    action: "activate_stage_assessment"
  }, {
    activateStageAssessmentFromUi() {
      throw new Error("stage gateway down");
    }
  }, {
    onError(event) {
      errors.push(event);
    }
  });
  assert.equal(failed.status, "failed");
  assert.equal(failed.handler, "activateStageAssessmentFromUi");
  assert.equal(failed.failureTarget, "stageAssessment");
  assert.equal(failed.error, "stage gateway down");
  assert.equal(errors.length, 1);
});

test("frontend ESM action adapters preserve legacy button dataset arguments", () => {
  assert.equal(cardGenerationActionNeedsLegacyButton({ action: "record_release_workbench_action" }), true);
  assert.equal(cardGenerationActionNeedsLegacyButton({ action: "refresh_release_evidence_ledger" }), false);

  assert.deepEqual(legacyButtonDatasetForCardGenerationAction({
    action: "record_release_workbench_action",
    actionKey: "record_evidence",
    endpointKey: "release_evidence",
    blockedReason: "missing approval"
  }), {
    releaseWorkbenchAction: "record_evidence",
    releaseWorkbenchActionKey: "record_evidence",
    releaseWorkbenchEndpointKey: "release_evidence",
    releaseWorkbenchBlockedReason: "missing approval"
  });
  assert.deepEqual(legacyButtonDatasetForCardGenerationAction({
    action: "build_release_package",
    actionKey: "build_package",
    endpointKey: "release_package"
  }), {
    releasePackageBuild: "build_package",
    releaseWorkbenchActionKey: "build_package",
    releaseWorkbenchEndpointKey: "release_package"
  });
  assert.deepEqual(legacyButtonDatasetForCardGenerationAction({
    action: "record_release_lifecycle_record",
    recordKind: "activation"
  }), {
    releaseLifecycleRecord: "activation"
  });

  assert.deepEqual(legacyButtonDatasetForCardGenerationAction({
    action: "review_automation_proposal",
    proposalId: "proposal_1",
    status: "approved"
  }), {
    automationProposalId: "proposal_1",
    automationProposalStatus: "approved",
    automationProposalReview: "approved"
  });
  assert.deepEqual(legacyButtonDatasetForCardGenerationAction({
    action: "publish_automation_proposal",
    proposalId: "proposal_1"
  }), {
    automationProposalId: "proposal_1",
    automationProposalPublish: "proposal_1"
  });
  assert.deepEqual(legacyButtonDatasetForCardGenerationAction({
    action: "review_automation_digest",
    digestId: "digest_1",
    status: "accepted"
  }), {
    automationDigestId: "digest_1",
    automationDigestStatus: "accepted",
    automationDigestReview: "accepted"
  });
  assert.deepEqual(legacyButtonDatasetForCardGenerationAction({
    action: "review_automation_failure_policy",
    policyId: "policy_1",
    status: "active"
  }), {
    automationFailurePolicyId: "policy_1",
    automationFailurePolicyStatus: "active",
    automationFailurePolicyReview: "active"
  });
  assert.deepEqual(legacyButtonDatasetForCardGenerationAction({
    action: "create_automation_action_handoff",
    digestId: "digest_1"
  }), {
    automationDigestId: "digest_1",
    automationActionHandoffCreate: "digest_1"
  });
  assert.deepEqual(legacyButtonDatasetForCardGenerationAction({
    action: "deliver_automation_action_handoff",
    handoffId: "handoff_1"
  }), {
    automationActionHandoffId: "handoff_1",
    automationActionHandoffDeliver: "handoff_1"
  });
  assert.deepEqual(legacyButtonDatasetForCardGenerationAction({
    action: "execute_automation_scheduler_once",
    handoffId: "handoff_1",
    executionId: "execution_1"
  }), {
    automationActionHandoffId: "handoff_1",
    automationSchedulerExecutionId: "execution_1",
    automationSchedulerExecutionExecute: "execution_1"
  });
  assert.deepEqual(legacyButtonDatasetForCardGenerationAction({
    action: "review_automation_scheduler_worker_target",
    targetId: "target_1",
    status: "approved"
  }), {
    automationSchedulerWorkerTargetId: "target_1",
    automationSchedulerWorkerTargetStatus: "approved",
    automationSchedulerWorkerTargetReview: "approved"
  });
  assert.deepEqual(legacyButtonDatasetForCardGenerationAction({
    action: "review_recommendation_lifecycle",
    recommendationId: "trajectory_1",
    status: "accepted",
    sourceTaskCardId: "task_1",
    sourceEvaluationId: "eval_1"
  }), {
    recommendationLifecycleReview: "trajectory_1",
    recommendationLifecycleStatus: "accepted",
    recommendationLifecycleTrajectoryId: "trajectory_1",
    recommendationLifecycleSourceTaskCardId: "task_1",
    recommendationLifecycleSourceEvaluationId: "eval_1"
  });

  const button = legacyButtonForCardGenerationAction({
    action: "review_automation_proposal",
    proposalId: "proposal_1",
    status: "approved"
  });
  assert.equal(button.disabled, false);
  assert.equal(button.dataset.automationProposalId, "proposal_1");
  assert.equal(legacyHandlerArgsForCardGenerationAction({
    action: "review_automation_proposal",
    proposalId: "proposal_1"
  })[0].dataset.automationProposalId, "proposal_1");
  const refreshAction = { action: "refresh_release_evidence_ledger" };
  assert.deepEqual(legacyHandlerArgsForCardGenerationAction(refreshAction), [refreshAction]);
});

test("frontend ESM app controller applies dispatched action state without runtime binding", async () => {
  assert.deepEqual(cardGenerationFailurePatch("operatingLoop", {
    status: "blocked",
    reason: "stage checkpoint active"
  }), {
    actionStatus: "blocked",
    actionError: "stage checkpoint active"
  });
  assert.deepEqual(cardGenerationFailurePatch("releaseEvidenceLedger", {
    status: "failed",
    error: "ledger readback failed"
  }), {
    status: "failed",
    error: "ledger readback failed"
  });
  assert.deepEqual(cardGenerationFailurePatch("cardGeneration", {
    status: "failed",
    error: "draft failed"
  }), {
    status: "failed",
    error: "draft failed",
    progressStep: "failed",
    progressMessage: "操作失败。"
  });
  assert.deepEqual(cardGenerationFailurePatch("releaseWorkbench", {
    status: "failed",
    error: "package failed",
    action: { action: "build_release_package" }
  }), {
    packageStatus: "failed",
    packageError: "package failed"
  });
  assert.deepEqual(cardGenerationFailurePatch("stageAssessment", {
    status: "failed",
    error: "controls unavailable",
    action: { action: "refresh_stage_checkpoint_controls" }
  }), {
    controlsStatus: "failed",
    controlsError: "controls unavailable",
    status: "failed",
    error: "controls unavailable"
  });

  const state = {
    cardGeneration: {
      ownerCorrectionAction: "",
      context: {
        targetProvisioning: {
          graphOptions: {
            domainPacks: [
              { domainPackId: "pack_science", domain: "science", subjects: ["biology", "physics"] },
              { domainPackId: "pack_math", domain: "math", subjects: ["algebra", "geometry"] }
            ]
          }
        }
      },
      targetProvisionDraft: {
        domainPackId: "pack_science",
        domain: "science",
        subject: "physics",
        recipeId: "daily_science",
        status: "idle",
        result: null,
        error: ""
      }
    }
  };
  assert.equal(applyCardGenerationActionDraft(state, {
    action: "update_owner_correction_note",
    note: "  summary-only correction  "
  }), true);
  assert.equal(state.cardGeneration.ownerCorrectionDraft, "summary-only correction");
  assert.equal(applyCardGenerationActionDraft(state, {
    action: "update_owner_correction_action",
    reviewAction: ""
  }), true);
  assert.equal(state.cardGeneration.ownerCorrectionAction, "confirm_profile_delta");
  assert.equal(applyCardGenerationActionDraft(state, {
    action: "update_owner_audit_review_note",
    note: " owner readback "
  }), true);
  assert.equal(state.cardGeneration.ownerAuditReviewDraft, "owner readback");
  assert.equal(applyCardGenerationActionDraft(state, {
    action: "select_domain_pack",
    domainPackId: "pack_math"
  }), true);
  assert.equal(state.cardGeneration.targetProvisionDraft.domainPackId, "pack_math");
  assert.equal(state.cardGeneration.targetProvisionDraft.domain, "math");
  assert.equal(state.cardGeneration.targetProvisionDraft.subject, "algebra");
  assert.equal(state.cardGeneration.targetProvisionDraft.status, "idle");
  assert.equal(applyCardGenerationActionDraft(state, {
    action: "select_subject",
    subject: "geometry"
  }), true);
  assert.equal(state.cardGeneration.targetProvisionDraft.subject, "geometry");
  assert.equal(applyCardGenerationActionDraft(state, { action: "refresh_profile_feedback" }), false);
  assert.equal(applyCardGenerationPreDispatchState(state, {
    action: "select_card_generation_recipe",
    recipeId: "weekly_math"
  }), true);
  assert.deepEqual(state.cardGeneration.targetProvisionDraft, {
    domainPackId: "",
    domain: "",
    subject: "",
    recipeId: "weekly_math",
    status: "loading",
    result: null,
    error: ""
  });

  applyCardGenerationFailure(state, {
    status: "failed",
    failureTarget: "automationProposals",
    action: { action: "create_automation_proposal" },
    handler: "createAutomationProposalFromUi",
    error: "proposal write failed"
  });
  assert.equal(state.cardGeneration.automationProposals.actionStatus, "failed");
  assert.equal(state.cardGeneration.automationProposals.actionError, "proposal write failed");
  assert.equal(state.cardGeneration.lastAction.handler, "createAutomationProposalFromUi");

  state.cardGeneration.context = { target: { workspaceId: "weixin_fanfan" } };
  applyCardGenerationFailure(state, {
    status: "blocked",
    failureTarget: "cardGeneration",
    action: { action: "draft_daily_loop" },
    reason: "planner_not_ready"
  });
  assert.equal(state.cardGeneration.status, "ready");
  assert.equal(state.cardGeneration.error, "planner_not_ready");
  assert.equal(state.cardGeneration.progressStep, "");
  assert.equal(state.cardGeneration.progressMessage, "");

  applyCardGenerationFailure(state, {
    status: "failed",
    failureTarget: "releaseWorkbench",
    action: { action: "build_release_package" },
    error: "package write failed"
  });
  assert.equal(state.cardGeneration.releaseWorkbench.packageStatus, "failed");
  assert.equal(state.cardGeneration.releaseWorkbench.packageError, "package write failed");

  applyCardGenerationHandled(state, {
    status: "handled",
    failureTarget: "releaseEvidenceLedger",
    action: { action: "refresh_release_evidence_ledger" },
    handler: "refreshReleaseEvidenceLedger"
  });
  assert.deepEqual(state.cardGeneration.lastAction, {
    status: "handled",
    action: "refresh_release_evidence_ledger",
    target: "releaseEvidenceLedger",
    handler: "refreshReleaseEvidenceLedger"
  });

  const rendered = [];
  const controllerState = { cardGeneration: {} };
  const controller = createCardGenerationController({
    state: controllerState,
    render(nextState) {
      rendered.push(nextState.cardGeneration.lastAction?.status || "draft");
    },
    handlers: {
      selectCardGenerationRecipe(action) {
        return { ok: true, recipeId: action.recipeId };
      },
      refreshReleaseEvidenceLedger(action) {
        return { ok: true, action: action.action };
      },
      refreshProfileFeedback() {
        throw new Error("profile feedback readback failed");
      }
    }
  });

  const localDraft = await controller.handleCardGenerationAction({
    action: "update_owner_correction_note",
    note: " keep it summary-only "
  });
  assert.equal(localDraft.status, "handled");
  assert.equal(localDraft.handler, "localDraftState");
  assert.equal(controllerState.cardGeneration.ownerCorrectionDraft, "keep it summary-only");

  const recipe = await controller.handleCardGenerationAction({
    action: "select_card_generation_recipe",
    recipeId: "daily_science_v2"
  });
  assert.equal(recipe.status, "handled");
  assert.equal(recipe.handler, "selectCardGenerationRecipe");
  assert.equal(controllerState.cardGeneration.targetProvisionDraft.recipeId, "daily_science_v2");
  assert.equal(controllerState.cardGeneration.targetProvisionDraft.status, "loading");

  const handled = await controller.handleCardGenerationAction({
    action: "refresh_release_evidence_ledger"
  });
  assert.equal(handled.status, "handled");
  assert.equal(controllerState.cardGeneration.lastAction.status, "handled");
  assert.equal(controllerState.cardGeneration.lastAction.target, "releaseEvidenceLedger");

  const missing = await controller.handleCardGenerationAction({
    action: "refresh_automation_digests"
  });
  assert.equal(missing.status, "unhandled");
  assert.equal(controllerState.cardGeneration.automationDigests.actionStatus, "failed");
  assert.equal(controllerState.cardGeneration.automationDigests.actionError, "missing_handler");

  const blocked = await controller.handleCardGenerationAction({
    action: "advance_operating_loop",
    blocked: true,
    blockedReason: "cycle audit incomplete"
  });
  assert.equal(blocked.status, "blocked");
  assert.equal(controllerState.cardGeneration.operatingLoop.actionStatus, "blocked");
  assert.equal(controllerState.cardGeneration.operatingLoop.actionError, "cycle audit incomplete");

  const failed = await controller.handleCardGenerationAction({
    action: "refresh_profile_feedback"
  });
  assert.equal(failed.status, "failed");
  assert.equal(controllerState.cardGeneration.profileFeedback.status, "failed");
  assert.equal(controllerState.cardGeneration.profileFeedback.error, "profile feedback readback failed");
  assert.ok(rendered.length >= 5);
});

test("frontend ESM app controller preserves cycle history selection cascade", async () => {
  const state = {
    cardGeneration: {
      cycleHistory: {
        status: "ready",
        data: {
          cycles: [
            { taskCardId: "task_old", selectors: { taskCardId: "task_old" } },
            { taskCardId: "task_1", selectors: { taskCardId: "task_1", evaluationId: "eval_1" } }
          ]
        },
        selectedCycleKey: "",
        selectedCycle: null,
        error: ""
      },
      cycleDrilldown: {
        status: "idle",
        audit: null,
        completeness: null,
        error: ""
      }
    }
  };

  const selected = selectCycleHistoryState(state, "task_1:eval_1:1");
  assert.equal(selected.taskCardId, "task_1");
  assert.equal(state.cardGeneration.cycleHistory.selectedCycleKey, "task_1:eval_1:1");
  assert.equal(state.cardGeneration.cycleHistory.error, "");
  assert.deepEqual(cycleHistoryCascadeActions({
    action: "select_cycle_history",
    cycleHistoryKey: "task_1:eval_1:1"
  }).map((action) => action.action), [
    "refresh_cycle_drilldown",
    "refresh_reference_chain",
    "refresh_owner_audit_reviews",
    "refresh_profile_feedback",
    "refresh_automation_closed_loop_action_plan"
  ]);

  const missingState = {
    cardGeneration: {
      cycleHistory: { data: { cycles: [] }, error: "" },
      cycleDrilldown: { status: "ready", audit: { ok: true }, completeness: { ok: true }, error: "" }
    }
  };
  assert.equal(selectCycleHistoryState(missingState, "missing"), null);
  assert.equal(missingState.cardGeneration.cycleHistory.selectedCycleKey, "");
  assert.equal(missingState.cardGeneration.cycleHistory.error, "未找到可选择的历史周期。");
  assert.equal(missingState.cardGeneration.cycleDrilldown.status, "failed");

  const calls = [];
  const renders = [];
  const controllerState = {
    cardGeneration: {
      cycleHistory: {
        data: {
          cycles: [
            { selectors: { taskCardId: "task_1", evaluationId: "eval_1" } }
          ]
        }
      },
      cycleDrilldown: {}
    }
  };
  const controller = createCardGenerationController({
    state: controllerState,
    render(nextState) {
      renders.push(nextState.cardGeneration.cycleHistory?.selectedCycleKey || "render");
    },
    handlers: {
      refreshOwnerCycleDrilldownFromUi(action) {
        calls.push(action);
        return { ok: true, slot: "cycle" };
      },
      refreshReferenceChain(action) {
        calls.push(action);
        return { ok: true, slot: "reference" };
      },
      refreshOwnerAuditReviews(action) {
        calls.push(action);
        return { ok: true, slot: "ownerAudit" };
      },
      refreshProfileFeedback(action) {
        calls.push(action);
        return { ok: true, slot: "profile" };
      },
      refreshAutomationClosedLoopActionPlan(action) {
        calls.push(action);
        return { ok: true, slot: "automation" };
      }
    }
  });
  const result = await controller.handleCardGenerationAction({
    action: "select_cycle_history",
    cycleHistoryKey: "task_1:eval_1:0"
  });
  assert.equal(result.status, "handled");
  assert.equal(result.handler, "localCycleHistorySelection");
  assert.equal(result.value.selectedCycle.selectors.taskCardId, "task_1");
  assert.deepEqual(calls.map((action) => action.action), [
    "refresh_cycle_drilldown",
    "refresh_reference_chain",
    "refresh_owner_audit_reviews",
    "refresh_profile_feedback",
    "refresh_automation_closed_loop_action_plan"
  ]);
  assert.equal(calls[0].options.silent, true);
  assert.equal(controllerState.cardGeneration.lastAction.action, "select_cycle_history");
  assert.ok(renders.length >= 2);

  calls.length = 0;
  const missing = await controller.handleCardGenerationAction({
    action: "select_cycle_history",
    cycleHistoryKey: "not_found"
  });
  assert.equal(missing.status, "handled");
  assert.equal(missing.value.ok, false);
  assert.equal(controllerState.cardGeneration.cycleDrilldown.status, "failed");
  assert.equal(calls.length, 0);
});

test("frontend ESM Vite entry keeps runtime disabled without explicit opt-in", () => {
  const document = {
    getElementById(id) {
      if (id === "growth-root") {
        return {
          dataset: {},
          innerHTML: ""
        };
      }
      return null;
    }
  };
  const mount = resolveGrowthViteMount({ document });
  assert.equal(mount.mode, "disabled");
  assert.equal(mount.root, null);

  const calls = [];
  const entry = createGrowthViteEntry({
    document,
    location: { href: "http://127.0.0.1/growth?embedded=1&workspace_id=weixin_owner" },
    appFactory(options) {
      calls.push({ name: "appFactory", root: options.root, href: options.location.href });
      return {
        bootstrap() {
          calls.push({ name: "bootstrap" });
          return { booted: true };
        }
      };
    },
    runtimeAdapterFactory() {
      calls.push({ name: "runtimeFactory" });
      return {
        mount() {
          calls.push({ name: "runtimeMount" });
        }
      };
    }
  });

  assert.equal(entry.mode, "disabled");
  assert.equal(entry.root, null);
  assert.deepEqual(calls.map((call) => call.name), ["appFactory", "bootstrap"]);
  assert.equal(calls[0].root, null);
});

test("frontend ESM Vite entry supports bootstrap and explicit runtime mounts", () => {
  const bootstrapRoot = { dataset: {}, innerHTML: "" };
  const bootstrapDocument = {
    getElementById(id) {
      return id === "growth-vite-root" ? bootstrapRoot : null;
    }
  };
  const bootstrapCalls = [];
  const bootstrapEntry = createGrowthViteEntry({
    document: bootstrapDocument,
    appFactory(options) {
      bootstrapCalls.push({ name: "appFactory", root: options.root });
      return {
        bootstrap() {
          bootstrapCalls.push({ name: "bootstrap" });
          return { booted: true, rootMatched: options.root === bootstrapRoot };
        }
      };
    }
  });
  assert.equal(resolveGrowthViteMount({ document: bootstrapDocument }).mode, "bootstrap");
  assert.equal(bootstrapEntry.mode, "bootstrap");
  assert.equal(bootstrapEntry.state.rootMatched, true);
  assert.deepEqual(bootstrapCalls.map((call) => call.name), ["appFactory", "bootstrap"]);

  const runtimeRoot = { dataset: { growthViteRuntime: "enabled" }, innerHTML: "" };
  const runtimeDocument = {
    getElementById(id) {
      return id === "growth-root" ? runtimeRoot : null;
    }
  };
  const runtimeCalls = [];
  const runtimeEntry = createGrowthViteEntry({
    document: runtimeDocument,
    state: { cardGeneration: {} },
    api: { marker: true },
    renderView() {},
    runtimeAdapterFactory(options) {
      runtimeCalls.push({
        name: "runtimeFactory",
        root: options.root,
        hasApi: options.api.marker === true
      });
      return {
        mount() {
          runtimeCalls.push({ name: "runtimeMount" });
          return this;
        }
      };
    },
    appFactory() {
      runtimeCalls.push({ name: "appFactory" });
      return {
        bootstrap() {
          runtimeCalls.push({ name: "bootstrap" });
        }
      };
    }
  });
  assert.equal(resolveGrowthViteMount({ document: runtimeDocument }).mode, "runtime");
  assert.equal(runtimeEntry.mode, "runtime");
  assert.equal(runtimeEntry.root, runtimeRoot);
  assert.deepEqual(runtimeCalls.map((call) => call.name), ["runtimeFactory", "runtimeMount"]);
  assert.equal(runtimeCalls[0].root, runtimeRoot);
  assert.equal(runtimeCalls[0].hasApi, true);
});

test("frontend ESM store notifies subscribers around shared mutable state", () => {
  const initialState = { cardGeneration: { status: "idle" } };
  const store = createGrowthStore(initialState);
  const events = [];
  const unsubscribe = store.subscribe((nextState, reason) => {
    events.push({ status: nextState.cardGeneration.status, reason });
  });

  const result = store.mutate((state) => {
    state.cardGeneration.status = "ready";
  }, "card_generation_ready");
  assert.equal(result, initialState);
  assert.equal(store.getState(), initialState);
  assert.equal(store.select((state) => state.cardGeneration.status), "ready");
  assert.deepEqual(events, [{ status: "ready", reason: "card_generation_ready" }]);
  const reduced = store.reduce((state, action) => {
    state.cardGeneration.status = action.status;
    return true;
  }, { status: "reduced" }, "card_generation_reduced");
  assert.equal(reduced.changed, true);
  assert.equal(reduced.state.cardGeneration.status, "reduced");
  assert.equal(events.at(-1).reason, "card_generation_reduced");
  const unchanged = store.reduce(() => false, {}, "not_notified");
  assert.equal(unchanged.changed, false);
  assert.equal(events.some((event) => event.reason === "not_notified"), false);

  const eventCountBeforeUnsubscribe = events.length;
  unsubscribe();
  store.mutate((state) => {
    state.cardGeneration.status = "ignored";
  }, "after_unsubscribe");
  assert.equal(events.length, eventCountBeforeUnsubscribe);
});

test("frontend ESM runtime adapter can use an injected store boundary", async () => {
  const state = {
    cardGeneration: {
      ownerCorrectionDraft: "",
      ownerCorrection: { status: "idle" }
    }
  };
  const store = createGrowthStore(state);
  const notifications = [];
  store.subscribe((nextState, reason) => {
    notifications.push({ draft: nextState.cardGeneration.ownerCorrectionDraft, reason });
  });
  const renders = [];
  const renderOptions = [];
  const adapter = createGrowthRuntimeAdapter({
    store,
    getCurrentWorkspaceId: () => "weixin_fanfan",
    isOwner: () => true,
    viewTargets: [{ workspaceId: "weixin_fanfan", label: "凡凡", enabled: true }],
    routing: {
      pluginRoute: "submit_work",
      model: {
        overview: {
          board: { cards: [{ taskCardId: "submit_runtime", actions: { canSubmit: true } }] }
        }
      }
    },
    renderView(root, nextState, options) {
      renders.push(nextState.cardGeneration.ownerCorrectionDraft || "");
      renderOptions.push(options);
    }
  });

  assert.equal(adapter.state, state);
  assert.equal(adapter.getState(), state);
  assert.equal(adapter.select((nextState) => nextState.cardGeneration.ownerCorrection.status), "idle");
  assert.equal(adapter.routeController.firstTaskCardForRoute("submit_work").taskCardId, "submit_runtime");
  assert.equal(adapter.viewModel.normalizeCard({ id: "runtime_card" }).workspaceId, "weixin_fanfan");
  const result = await adapter.dispatch({
    feature: "card_generation",
    action: "update_owner_correction_note",
    note: "summary-only correction"
  });

  assert.equal(result.status, "handled");
  assert.equal(store.getState().cardGeneration.ownerCorrectionDraft, "summary-only correction");
  assert.ok(renders.includes("summary-only correction"));
  assert.ok(notifications.some((item) => item.draft === "summary-only correction" && item.reason === "render"));
  assert.equal(renderOptions.at(-1).currentWorkspaceId, "weixin_fanfan");
  assert.equal(renderOptions.at(-1).isOwner, true);
  assert.equal(renderOptions.at(-1).viewTargets[0].workspaceId, "weixin_fanfan");
});

test("frontend ESM runtime adapter wires DOM events through controller and handler factory", async () => {
  const listeners = new Map();
  const windowListeners = new Map();
  const postedMessages = [];
  const historyCalls = [];
  const root = {
    innerHTML: "",
    addEventListener(type, listener) {
      const existing = listeners.get(type) || [];
      existing.push(listener);
      listeners.set(type, existing);
    },
    removeEventListener(type, listener) {
      const existing = listeners.get(type) || [];
      const next = existing.filter((item) => item !== listener);
      if (next.length) listeners.set(type, next);
      else listeners.delete(type);
    }
  };
  const state = {
    cardGeneration: {
      selectedWorkspaceId: "weixin_fanfan",
      context: {
        target: { workspaceId: "weixin_fanfan", learnerId: "fanfan" },
        learningLoopState: {
          nextAction: {
            action: "publish_selected_plan_item",
            planDraftId: "draft_runtime",
            itemId: "item_runtime"
          }
        },
        suggestedPlan: { targetNodeIds: ["node_runtime"] },
        generationDefaults: { domainPackId: "pack_science", domain: "science", subject: "biology" }
      },
      learningLoopState: {
        data: {
          nextAction: {
            action: "publish_selected_plan_item",
            planDraftId: "draft_runtime",
            itemId: "item_runtime"
          }
        }
      }
    }
  };
  const calls = [];
  const renders = [];
  const adapter = createGrowthRuntimeAdapter({
    root,
    state,
    api: {
      advanceLearningOperatingLoop(payload, targetWorkspaceId) {
        calls.push({ name: "advance", payload, targetWorkspaceId });
        return {
          ok: true,
          status: "executed",
          summary: { taskCardId: "task_runtime", planDraftId: "draft_runtime" },
          actionResult: { selectedItemId: "item_runtime" }
        };
      }
    },
    renderView(targetRoot, nextState) {
      renders.push({
        root: targetRoot === root,
        status: nextState.cardGeneration.status || "",
        actionStatus: nextState.cardGeneration.operatingLoop?.actionStatus || ""
      });
    },
    navigation: {
      historyRef: {
        replaceState(stateValue, title, href) {
          historyCalls.push({ method: "replaceState", state: stateValue, title, href });
        }
      },
      locationRef: { href: "https://home.ai/plugins/growth" },
      parentRef: {
        postMessage(payload) {
          postedMessages.push(payload);
        }
      },
      windowRef: {
        addEventListener(type, listener) {
          const existing = windowListeners.get(type) || [];
          existing.push(listener);
          windowListeners.set(type, existing);
        },
        removeEventListener(type, listener) {
          const existing = windowListeners.get(type) || [];
          const next = existing.filter((item) => item !== listener);
          if (next.length) windowListeners.set(type, next);
          else windowListeners.delete(type);
        }
      }
    },
    refreshers: {
      clearDetailCache() {
        calls.push({ name: "clearDetailCache" });
      },
      refreshCardGenerationContextAfterPublish(targetWorkspaceId, options) {
        calls.push({ name: "refreshContext", targetWorkspaceId, prefix: options.errorPrefix });
      },
      refreshOperatingLoopRuns(targetWorkspaceId, context, options) {
        calls.push({ name: "refreshRuns", targetWorkspaceId, silent: options.silent });
      },
      refreshOwnerCycleDrilldown(options) {
        calls.push({ name: "cycleDrilldown", silent: options.silent });
      },
      refreshProfileFeedback(targetWorkspaceId, context, options) {
        calls.push({ name: "profileFeedback", targetWorkspaceId, silent: options.silent });
      }
    }
  });

  adapter.mount();
  assert.equal(listeners.size, 5);
  assert.equal(listeners.get("click").length, 2);
  assert.equal(listeners.get("submit").length, 2);
  assert.equal(listeners.get("change").length, 1);
  assert.equal(listeners.get("error").length, 1);
  assert.equal(windowListeners.get("message").length, 1);
  assert.equal(windowListeners.get("popstate").length, 1);
  assert.equal(historyCalls[0].state[GROWTH_NAVIGATION_STATE_KEY], true);
  assert.equal(postedMessages[0].type, GROWTH_NAVIGATION_EVENT);
  assert.equal(adapter.navigationController().routeFromState().name, "root");
  assert.ok(renders.some((item) => item.root));

  const event = {
    type: "click",
    target: {
      closest(selector) {
        assert.match(selector, /data-card-generation-advance/);
        return {
          dataset: { cardGenerationAdvance: "true" },
          disabled: false
        };
      }
    },
    preventDefault() {
      calls.push({ name: "preventDefault" });
    }
  };
  listeners.get("click")[0](event);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(state.cardGeneration.status, "published");
  assert.equal(state.cardGeneration.operatingLoop.actionStatus, "executed");
  assert.equal(state.cardGeneration.dailyLoopPublishResult.planDraft.generatedTaskCardId, "task_runtime");
  assert.equal(calls.find((item) => item.name === "advance").payload.plan_draft_id, "draft_runtime");
  assert.ok(calls.some((item) => item.name === "preventDefault"));
  assert.ok(renders.some((item) => item.status === "published"));

  const submitEvent = {
    type: "submit",
    target: {
      dataset: { learningGrowthSubmissionForm: "task_runtime" },
      closest(selector) {
        assert.match(selector, /data-learning-growth-submission-form/);
        return this;
      },
      querySelector() {
        return { value: "runtime answer" };
      }
    },
    preventDefault() {
      calls.push({ name: "cardInteractionPreventDefault" });
    }
  };
  adapter.cardInteractionController.submitEvidence = async (form) => {
    calls.push({ name: "cardInteractionSubmit", cardId: form.dataset.learningGrowthSubmissionForm });
  };
  await listeners.get("submit")[1](submitEvent);
  assert.ok(calls.some((item) => item.name === "cardInteractionPreventDefault"));
  assert.ok(calls.some((item) => item.name === "cardInteractionSubmit" && item.cardId === "task_runtime"));

  adapter.unmount();
  assert.equal(listeners.size, 0);
  assert.equal(windowListeners.size, 0);
});

test("frontend ESM runtime adapter lets dispatcher call closed-loop runner without method this", async () => {
  const state = {
    cardGeneration: {
      selectedWorkspaceId: "weixin_fanfan",
      context: {
        target: { workspaceId: "weixin_fanfan", learnerId: "fanfan" },
        learningLoopState: {
          nextAction: { action: "publish_selected_plan_item", planDraftId: "draft_1", itemId: "item_1" }
        },
        suggestedPlan: { targetNodeIds: ["node_1"] },
        generationDefaults: { domainPackId: "pack_science", domain: "science", subject: "biology" }
      },
      automationClosedLoopActionPlan: {
        data: {
          nextAction: { key: "run_learning_loop_next" }
        }
      }
    }
  };
  const calls = [];
  const adapter = createGrowthRuntimeAdapter({
    state,
    api: {
      advanceLearningOperatingLoop(payload, targetWorkspaceId) {
        calls.push({ name: "advance", payload, targetWorkspaceId });
        return { ok: true, status: "executed" };
      }
    },
    refreshers: {
      refreshAutomationClosedLoopActionPlan(targetWorkspaceId, context, options) {
        calls.push({ name: "closedLoop", targetWorkspaceId, silent: options.silent });
      }
    },
    renderView() {}
  });

  const result = await adapter.dispatch({
    feature: "card_generation",
    action: "run_automation_closed_loop_action_plan",
    preventDefault: true
  });
  assert.equal(result.status, "handled");
  assert.equal(state.cardGeneration.automationClosedLoopActionPlan.actionStatus, "executed");
  assert.equal(calls[0].name, "advance");
  assert.equal(calls[0].payload.action, "run_next");
  assert.equal(calls.at(-1).name, "closedLoop");
});

test("frontend ESM readback action handlers preserve legacy state slots and payload injection", async () => {
  const state = {
    cardGeneration: {
      selectedWorkspaceId: "weixin_fanfan",
      context: {
        target: { workspaceId: "weixin_fanfan", learnerId: "fanfan" },
        programId: "science_daily",
        generationDefaults: { domainPackId: "pack_science", domain: "science", subject: "biology" },
        suggestedPlan: { targetNodeIds: ["node_cell"] }
      },
      releaseLifecycleRecords: {
        status: "ready",
        data: { previous: true },
        actionStatus: "recording",
        actionResult: { recordId: "old" },
        actionError: "old_error"
      },
      cycleHistory: {
        selectedCycle: { selectors: { taskCardId: "task_1" } }
      }
    }
  };
  const calls = [];
  const rendered = [];
  const handlers = createReadbackActionHandlers({
    state,
    render(nextState) {
      rendered.push(nextState.cardGeneration.releaseEvidenceLedger?.status || nextState.cardGeneration.profileFeedback?.status || "rendered");
    },
    api: {
      fetchGrowthReleaseEvidenceLedger(payload, targetWorkspaceId) {
        calls.push({ name: "ledger", payload, targetWorkspaceId });
        return { ok: true, evidenceCount: 2, approvalCount: 1 };
      },
      fetchGrowthReleaseLifecycleRecords(payload, targetWorkspaceId) {
        calls.push({ name: "lifecycle", payload, targetWorkspaceId });
        return { ok: true, preflightReports: { count: 1 } };
      },
      fetchGrowthProfileFeedback(payload, targetWorkspaceId) {
        calls.push({ name: "profile", payload, targetWorkspaceId });
        return { ok: false, status: "blocked", error: "completed_cycle_required" };
      }
    },
    payloadBuilders: {
      createProfileFeedbackQueryPayload({ context, workspaceId, selectedCycle }) {
        return {
          workspace_id: workspaceId,
          learner_id: context.target.learnerId,
          task_card_id: selectedCycle.selectors.taskCardId,
          limit: 12
        };
      }
    }
  });

  const ledger = await handlers.refreshReleaseEvidenceLedger();
  assert.equal(ledger.evidenceCount, 2);
  assert.equal(state.cardGeneration.releaseEvidenceLedger.status, "ready");
  assert.equal(state.cardGeneration.releaseEvidenceLedger.data.approvalCount, 1);
  assert.equal(state.cardGeneration.context.releaseEvidenceLedger.evidenceCount, 2);
  assert.equal(calls[0].name, "ledger");
  assert.equal(calls[0].targetWorkspaceId, "weixin_fanfan");
  assert.equal(calls[0].payload.workspace_id, "weixin_fanfan");
  assert.equal(calls[0].payload.learner_id, "fanfan");
  assert.equal(calls[0].payload.domain_pack_id, "pack_science");

  const lifecycle = await handlers.refreshReleaseLifecycleRecords({ options: { silent: true } });
  assert.equal(lifecycle.ok, true);
  assert.equal(state.cardGeneration.releaseLifecycleRecords.status, "ready");
  assert.equal(state.cardGeneration.releaseLifecycleRecords.actionStatus, "recording");
  assert.deepEqual(state.cardGeneration.releaseLifecycleRecords.actionResult, { recordId: "old" });
  assert.equal(state.cardGeneration.releaseLifecycleRecords.actionError, "old_error");

  const profile = await handlers.refreshProfileFeedback();
  assert.equal(profile.ok, false);
  assert.equal(state.cardGeneration.profileFeedback.status, "blocked");
  assert.equal(state.cardGeneration.profileFeedback.error, "completed_cycle_required");
  assert.equal(calls[2].payload.task_card_id, "task_1");
  assert.ok(rendered.length >= 4);

  const missingBuilderState = { cardGeneration: { selectedWorkspaceId: "w1", context: { target: { workspaceId: "w1" } } } };
  const missingBuilderHandlers = createReadbackActionHandlers({
    state: missingBuilderState,
    api: {
      fetchGrowthProfileFeedback() {
        throw new Error("should_not_call_api");
      }
    }
  });
  const missingBuilder = await missingBuilderHandlers.refreshProfileFeedback();
  assert.equal(missingBuilder, null);
  assert.equal(missingBuilderState.cardGeneration.profileFeedback.status, "failed");
  assert.equal(missingBuilderState.cardGeneration.profileFeedback.error, "profile_feedback_payload_builder_unavailable");
});

test("frontend ESM release write action handlers preserve legacy state slots", async () => {
  const state = {
    cardGeneration: {
      selectedWorkspaceId: "weixin_fanfan",
      context: {
        target: { workspaceId: "weixin_fanfan", learnerId: "fanfan" },
        releaseWorkbench: {
          releaseWorkbench: {
            ownerActions: [
              {
                key: "release_package",
                action: "build",
                endpointKey: "release_package",
                route: { body: { tasks: ["planner_readiness"], write_package_record: true } }
              },
              {
                key: "release_decision",
                action: "record",
                endpointKey: "release_decision",
                route: { body: { status: "approved" } }
              }
            ]
          }
        }
      },
      releaseWorkbench: {
        data: {
          releaseWorkbench: {
            ownerActions: [
              {
                key: "release_package",
                action: "build",
                endpointKey: "release_package",
                route: { body: { tasks: ["planner_readiness"], write_package_record: true } }
              },
              {
                key: "release_decision",
                action: "record",
                endpointKey: "release_decision",
                route: { body: { status: "approved" } }
              }
            ]
          }
        },
        packageResult: { package: { packageId: "old_package" } }
      },
      releaseLifecycleRecords: {}
    }
  };
  const calls = [];
  const refreshes = [];
  const rendered = [];
  const handlers = createReadbackActionHandlers({
    state,
    render(nextState) {
      rendered.push({
        packageStatus: nextState.cardGeneration.releaseWorkbench?.packageStatus,
        lifecycleStatus: nextState.cardGeneration.releaseLifecycleRecords?.actionStatus
      });
    },
    api: {
      buildGrowthReleasePackage(payload, targetWorkspaceId) {
        calls.push({ name: "build", payload, targetWorkspaceId });
        return { ok: true, package: { packageId: "package_1" } };
      },
      recordGrowthReleaseWorkbenchAction(payload, targetWorkspaceId) {
        calls.push({ name: "workbench", payload, targetWorkspaceId });
        return { ok: true, actionRecord: { recordId: "action_1" } };
      },
      recordGrowthReleaseActivation(payload, targetWorkspaceId) {
        calls.push({ name: "activation", payload, targetWorkspaceId });
        return { ok: true, activationId: "activation_1" };
      }
    },
    refreshers: {
      refreshReleaseWorkbench(targetWorkspaceId, context) {
        refreshes.push({ targetWorkspaceId, workspaceId: context.target.workspaceId });
      }
    }
  });

  const build = await handlers.buildReleasePackageFromUi({
    dataset: {
      releaseWorkbenchEndpointKey: "release_package",
      releaseWorkbenchActionKey: "release_package"
    }
  });
  assert.equal(build.package.packageId, "package_1");
  assert.equal(state.cardGeneration.releaseWorkbench.packageStatus, "ready");
  assert.equal(state.cardGeneration.releaseWorkbench.packageCandidate.packageId, "package_1");
  assert.equal(calls[0].payload.action.summaryOnly, true);
  assert.equal(calls[0].payload.write_package_record, true);

  const workbench = await handlers.recordReleaseWorkbenchActionFromUi({
    dataset: {
      releaseWorkbenchEndpointKey: "release_decision",
      releaseWorkbenchActionKey: "release_decision"
    }
  });
  assert.equal(workbench.actionRecord.recordId, "action_1");
  assert.equal(state.cardGeneration.releaseWorkbench.actionStatus, "recorded");
  assert.equal(calls[1].payload.status, "approved");
  assert.equal(refreshes.length, 1);

  const activation = await handlers.recordReleaseLifecycleRecordFromUi({
    dataset: { releaseLifecycleRecord: "activation" }
  });
  assert.equal(activation.activationId, "activation_1");
  assert.equal(state.cardGeneration.releaseLifecycleRecords.actionStatus, "recorded");
  assert.equal(calls[2].payload.activation_decision.summaryOnly, true);
  assert.equal(refreshes.length, 2);

  const blocked = await handlers.recordReleaseWorkbenchActionFromUi({
    dataset: { releaseWorkbenchBlockedReason: "missing visual evidence" }
  });
  assert.equal(blocked, null);
  assert.equal(state.cardGeneration.releaseWorkbench.actionStatus, "failed");
  assert.equal(state.cardGeneration.releaseWorkbench.actionError, "missing visual evidence");
  assert.ok(rendered.length >= 6);

  const failed = await handlers.recordReleaseLifecycleRecordFromUi({
    dataset: { releaseLifecycleRecord: "unsupported" }
  });
  assert.equal(failed, null);
  assert.equal(state.cardGeneration.releaseLifecycleRecords.actionStatus, "failed");
  assert.equal(state.cardGeneration.releaseLifecycleRecords.actionError, "release_lifecycle_record_kind_unsupported");
});

test("frontend ESM automation and recommendation write handlers preserve legacy state slots", async () => {
  const state = {
    cardGeneration: {
      selectedWorkspaceId: "weixin_fanfan",
      context: {
        target: { workspaceId: "weixin_fanfan", learnerId: "fanfan" },
        programId: "science_daily",
        generationDefaults: { domainPackId: "pack_science", domain: "science", subject: "biology" },
        learningLoopState: {
          nextAction: {
            action: "publish_selected_plan_item",
            planDraftId: "draft_next",
            itemId: "item_next"
          }
        },
        recommendationLifecycle: [
          { trajectoryId: "trajectory_1", sourceTaskCardId: "task_1", sourceEvaluationId: "eval_1" }
        ]
      },
      dailyLoopDraftResult: {
        planDraft: {
          planDraftId: "draft_fallback",
          selectedItemId: "item_fallback",
          items: [{ itemId: "item_fallback" }]
        }
      },
      cycleHistory: {
        selectedCycle: {
          selectors: {
            planDraftId: "draft_cycle",
            taskCardId: "task_cycle",
            targetNodeIds: ["node_cycle"]
          }
        }
      },
      automationProposals: { data: { proposals: [{ proposalId: "proposal_1", planDraftId: "draft_1" }] } },
      automationDigests: { data: { digests: [{ digestId: "digest_1", requiredActions: [{ candidateId: "candidate_1" }] }] } },
      automationFailurePolicies: { data: { policies: [{ policyId: "policy_1" }] } },
      automationActionHandoffs: {
        data: {
          handoffs: [{
            handoffId: "handoff_1",
            digestId: "digest_1",
            actions: [{ proposalId: "proposal_1", planDraftId: "draft_1", selectedItemId: "item_1" }]
          }]
        }
      },
      automationSchedulerWorkerTargets: { data: { targets: [{ workerTargetId: "target_1" }] } },
      recommendationLifecycle: {}
    }
  };
  const calls = [];
  const automationRefreshes = [];
  const recommendationRefreshes = [];
  const releaseRefreshes = [];
  const postPublishRefreshes = [];
  const handlers = createReadbackActionHandlers({
    state,
    api: {
      advanceLearningOperatingLoop(payload, targetWorkspaceId) {
        calls.push({ name: "operating_loop_advance", payload, targetWorkspaceId });
        return {
          ok: true,
          status: "executed",
          summary: { taskCardId: "task_2", planDraftId: "draft_next" },
          actionResult: { selectedItemId: "item_next" }
        };
      },
      prepareGrowthAutomationCycleClosure(payload, targetWorkspaceId) {
        calls.push({ name: "cycle_closure", payload, targetWorkspaceId });
        return { ok: true, closureId: "closure_1" };
      },
      advanceGrowthAutomationReview(payload, targetWorkspaceId) {
        calls.push({ name: "review_advancement", payload, targetWorkspaceId });
        return { ok: true, reviewId: "review_1" };
      },
      createGrowthAutomationProposal(payload, targetWorkspaceId) {
        calls.push({ name: "proposal_create", payload, targetWorkspaceId });
        return { ok: true, proposalId: "proposal_2" };
      },
      reviewGrowthAutomationProposal(id, payload, targetWorkspaceId) {
        calls.push({ name: "proposal", id, payload, targetWorkspaceId });
        return { ok: true, proposalId: id };
      },
      publishGrowthAutomationProposal(id, payload, targetWorkspaceId) {
        calls.push({ name: "proposal_publish", id, payload, targetWorkspaceId });
        return { ok: true, proposalId: id, taskCardId: "card_1" };
      },
      createGrowthAutomationDigest(payload, targetWorkspaceId) {
        calls.push({ name: "digest_create", payload, targetWorkspaceId });
        return { ok: true, digestId: "digest_2" };
      },
      reviewGrowthAutomationDigest(id, payload, targetWorkspaceId) {
        calls.push({ name: "digest", id, payload, targetWorkspaceId });
        return { ok: true, digestId: id };
      },
      createGrowthAutomationFailurePolicy(payload, targetWorkspaceId) {
        calls.push({ name: "policy_create", payload, targetWorkspaceId });
        return { ok: true, policyId: "policy_2" };
      },
      reviewGrowthAutomationFailurePolicy(id, payload, targetWorkspaceId) {
        calls.push({ name: "policy", id, payload, targetWorkspaceId });
        return { ok: true, policyId: id };
      },
      createGrowthAutomationActionHandoff(payload, targetWorkspaceId) {
        calls.push({ name: "handoff_create", payload, targetWorkspaceId });
        return { ok: true, handoffId: "handoff_2" };
      },
      deliverGrowthAutomationActionHandoff(id, payload, targetWorkspaceId) {
        calls.push({ name: "handoff_deliver", id, payload, targetWorkspaceId });
        return { ok: true, handoffId: id };
      },
      executeGrowthAutomationSchedulerOnce(payload, targetWorkspaceId) {
        calls.push({ name: "scheduler_execute", payload, targetWorkspaceId });
        return { ok: true, executionId: "execution_1" };
      },
      runGrowthAutomationSchedulerOnce(payload, targetWorkspaceId) {
        calls.push({ name: "scheduler_run", payload, targetWorkspaceId });
        return { ok: true, runId: "run_1" };
      },
      createGrowthAutomationSchedulerWorkerTarget(payload, targetWorkspaceId) {
        calls.push({ name: "worker_target_create", payload, targetWorkspaceId });
        return { ok: true, targetId: "target_2" };
      },
      reviewGrowthAutomationSchedulerWorkerTarget(id, payload, targetWorkspaceId) {
        calls.push({ name: "worker_target", id, payload, targetWorkspaceId });
        return { ok: true, targetId: id };
      },
      reviewGrowthRecommendationLifecycle(payload, targetWorkspaceId) {
        calls.push({ name: "recommendation", payload, targetWorkspaceId });
        return { ok: true, trajectoryId: payload.trajectory_id };
      }
    },
    refreshers: {
      clearDetailCache() {
        postPublishRefreshes.push({ name: "clearDetailCache" });
      },
      loadCurrentWorkspace() {
        postPublishRefreshes.push({ name: "loadCurrentWorkspace" });
        throw new Error("workspace refresh down");
      },
      refreshCardGenerationContextAfterPublish(targetWorkspaceId, options) {
        postPublishRefreshes.push({ name: "refreshContext", targetWorkspaceId, prefix: options.errorPrefix });
      },
      refreshOwnerCycleDrilldown(options) {
        postPublishRefreshes.push({ name: "cycleDrilldown", silent: options.silent });
      },
      refreshAutomationStack(targetWorkspaceId, context) {
        automationRefreshes.push({ targetWorkspaceId, workspaceId: context.target.workspaceId });
      },
      refreshReleaseWorkbench(targetWorkspaceId, context) {
        releaseRefreshes.push({ targetWorkspaceId, workspaceId: context.target.workspaceId });
      },
      refreshRecommendationLifecycle(targetWorkspaceId, context) {
        recommendationRefreshes.push({ targetWorkspaceId, workspaceId: context.target.workspaceId });
      },
      refreshOperatingLoopRuns(targetWorkspaceId, context, options) {
        postPublishRefreshes.push({ name: "operatingLoopRuns", targetWorkspaceId, silent: options.silent });
      },
      refreshProfileFeedback(targetWorkspaceId, context, options) {
        postPublishRefreshes.push({ name: "profileFeedback", targetWorkspaceId, silent: options.silent });
      }
    }
  });

  await handlers.createAutomationProposalFromUi();
  assert.equal(state.cardGeneration.automationProposals.actionStatus, "created");
  assert.equal(calls[0].payload.source_plan_draft_id, "draft_cycle");
  assert.deepEqual(calls[0].payload.target_node_ids, ["node_cycle"]);

  await handlers.reviewAutomationProposalFromUi({ dataset: { automationProposalId: "proposal_1", automationProposalStatus: "accepted" } });
  assert.equal(state.cardGeneration.automationProposals.actionStatus, "reviewed");
  assert.equal(calls[1].payload.reason, "Owner accepted supervised next-card proposal.");

  await handlers.publishAutomationProposalFromUi({ dataset: { automationProposalId: "proposal_1" } });
  assert.equal(state.cardGeneration.automationProposals.actionStatus, "published");
  assert.match(state.cardGeneration.automationProposals.actionError, /建议已处理，但刷新列表失败/);
  assert.equal(calls[2].payload.generation_key, "automation_proposal:proposal_1:draft_1");
  assert.deepEqual(postPublishRefreshes.map((item) => item.name), [
    "clearDetailCache",
    "loadCurrentWorkspace",
    "refreshContext",
    "cycleDrilldown"
  ]);

  await handlers.createAutomationDigestFromUi();
  assert.equal(state.cardGeneration.automationDigests.actionStatus, "created");
  assert.equal(calls[3].payload.limit, 6);

  await handlers.reviewAutomationDigestFromUi({ dataset: { automationDigestId: "digest_1", automationDigestStatus: "reviewed" } });
  assert.equal(state.cardGeneration.automationDigests.actionStatus, "reviewed");
  assert.deepEqual(calls[4].payload.selected_candidate_ids, ["candidate_1"]);

  await handlers.createAutomationFailurePolicyFromUi();
  assert.equal(state.cardGeneration.automationFailurePolicies.actionStatus, "created");
  assert.equal(calls[5].payload.policy_version, "growth.learningAutomationFailurePolicy.v1");

  await handlers.reviewAutomationFailurePolicyFromUi({ dataset: { automationFailurePolicyId: "policy_1", automationFailurePolicyStatus: "active" } });
  assert.equal(state.cardGeneration.automationFailurePolicies.actionStatus, "reviewed");
  assert.equal(calls[6].payload.note, "Visible failure and Owner retry policy activated.");

  await handlers.createAutomationActionHandoffFromUi({ dataset: { automationDigestId: "digest_1" } });
  assert.equal(state.cardGeneration.automationActionHandoffs.actionStatus, "created");
  assert.equal(calls[7].payload.digest_id, "digest_1");

  await handlers.deliverAutomationActionHandoffFromUi({ dataset: { automationActionHandoffId: "handoff_1" } });
  assert.equal(state.cardGeneration.automationActionHandoffs.actionStatus, "delivered");
  assert.equal(calls[8].payload.handoff_id, "handoff_1");

  await handlers.executeAutomationSchedulerOnceFromUi({ dataset: { automationActionHandoffId: "handoff_1" } });
  assert.equal(state.cardGeneration.automationSchedulerExecutions.actionStatus, "executed");
  assert.equal(calls[9].payload.generation_key, "scheduler_execution:handoff_1:proposal_1:draft_1:item_1");

  await handlers.runAutomationSchedulerOnceFromUi();
  assert.equal(state.cardGeneration.automationSchedulerRuns.actionStatus, "ran");
  assert.equal(calls[10].payload.run_mode, "background_supervised_tick");

  await handlers.createAutomationSchedulerWorkerTargetFromUi();
  assert.equal(state.cardGeneration.automationSchedulerWorkerTargets.actionStatus, "created");
  assert.equal(calls[11].payload.policy.productionSchedulingAllowed, false);

  await handlers.reviewAutomationSchedulerWorkerTargetFromUi({
    dataset: { automationSchedulerWorkerTargetId: "target_1", automationSchedulerWorkerTargetStatus: "enabled" }
  });
  assert.equal(state.cardGeneration.automationSchedulerWorkerTargets.actionStatus, "reviewed");
  assert.equal(calls[12].payload.target_id, "target_1");

  await handlers.reviewRecommendationLifecycleFromUi({
    dataset: {
      recommendationLifecycleTrajectoryId: "trajectory_1",
      recommendationLifecycleStatus: "expired"
    }
  });
  assert.equal(state.cardGeneration.recommendationLifecycle.actionStatus, "reviewed");
  assert.equal(calls[13].payload.reason_code, "owner_expired_stale_recommendation");
  assert.equal(automationRefreshes.length, 13);
  assert.equal(recommendationRefreshes.length, 1);

  await handlers.prepareAutomationCycleClosureFromUi();
  assert.equal(state.cardGeneration.automationCycleClosure.actionStatus, "prepared");
  assert.equal(calls[14].payload.accept_proposal, true);
  assert.equal(calls[14].payload.source_task_card_id, "task_cycle");

  await handlers.advanceAutomationReviewFromUi();
  assert.equal(state.cardGeneration.automationReviewAdvancement.actionStatus, "advanced");
  assert.equal(calls[15].payload.prepare_review_packet, true);
  assert.equal(releaseRefreshes.length, 1);

  await handlers.advanceOperatingLoopFromUi();
  assert.equal(state.cardGeneration.status, "published");
  assert.equal(state.cardGeneration.operatingLoop.actionStatus, "executed");
  assert.equal(state.cardGeneration.dailyLoopPublishResult.operation, "operating_loop_advance");
  assert.equal(state.cardGeneration.dailyLoopPublishResult.planDraft.generatedTaskCardId, "task_2");
  assert.equal(calls[16].payload.action, "run_next");
  assert.equal(calls[16].payload.plan_draft_id, "draft_next");
  assert.equal(calls[16].payload.selected_item_id, "item_next");
  assert.equal(automationRefreshes.length, 15);

  const missing = await handlers.reviewAutomationProposalFromUi({
    dataset: { automationProposalId: "missing", automationProposalStatus: "accepted" }
  });
  assert.equal(missing, null);
  assert.equal(state.cardGeneration.automationProposals.actionStatus, "failed");
  assert.equal(state.cardGeneration.automationProposals.actionError, "automation_proposal_not_found");
});

test("frontend ESM closed-loop action runner preserves legacy delegated action flow", async () => {
  const state = {
    cardGeneration: {
      selectedWorkspaceId: "weixin_fanfan",
      context: {
        target: { workspaceId: "weixin_fanfan", learnerId: "fanfan" },
        generationDefaults: { domainPackId: "pack_science", domain: "science", subject: "biology" }
      },
      automationClosedLoopActionPlan: {
        data: {
          nextAction: { key: "run_learning_loop_next" },
          summary: { nextAction: "run_learning_loop_next" }
        },
        actionResult: { ok: true, previous: true }
      },
      automationActionHandoffs: { data: { handoffs: [] } }
    }
  };
  const calls = [];
  const refreshes = [];
  const renders = [];
  const handlers = createReadbackActionHandlers({
    state,
    render(nextState) {
      renders.push(nextState.cardGeneration.automationClosedLoopActionPlan?.actionStatus || "idle");
    },
    api: {
      advanceLearningOperatingLoop(payload, targetWorkspaceId) {
        calls.push({ name: "advanceOperatingLoop", payload, targetWorkspaceId });
        return { ok: true, status: "executed" };
      },
      deliverGrowthAutomationActionHandoff(id, payload, targetWorkspaceId) {
        calls.push({ name: "deliver", id, payload, targetWorkspaceId });
        return { ok: true, handoffId: id };
      }
    },
    refreshers: {
      refreshAutomationClosedLoopActionPlan(targetWorkspaceId, context, options) {
        refreshes.push({ name: "closedLoop", targetWorkspaceId, silent: options.silent });
        state.cardGeneration.automationClosedLoopActionPlan = Object.assign({}, state.cardGeneration.automationClosedLoopActionPlan, {
          status: "ready",
          data: { nextAction: { key: "" } }
        });
      },
      refreshAutomationActionHandoffs(targetWorkspaceId, context, options) {
        refreshes.push({ name: "handoffs", targetWorkspaceId, silent: options.silent });
        state.cardGeneration.automationActionHandoffs = {
          data: { handoffs: [{ handoffId: "handoff_2", digestId: "digest_2" }] }
        };
      }
    }
  });

  const blocked = await handlers.runAutomationClosedLoopActionPlanFromUi({
    dataset: { automationClosedLoopBlockedReason: "Owner review required" }
  });
  assert.equal(blocked, null);
  assert.equal(state.cardGeneration.automationClosedLoopActionPlan.actionStatus, "blocked");
  assert.equal(state.cardGeneration.automationClosedLoopActionPlan.actionError, "Owner review required");

  state.cardGeneration.automationClosedLoopActionPlan = {
    data: { nextAction: { key: "run_learning_loop_next" } }
  };
  const advanced = await handlers.runAutomationClosedLoopActionPlanFromUi({ dataset: {} });
  assert.deepEqual(advanced, { ok: true, actionKey: "run_learning_loop_next" });
  assert.equal(state.cardGeneration.automationClosedLoopActionPlan.actionStatus, "executed");
  assert.equal(calls[0].name, "advanceOperatingLoop");
  assert.equal(calls[0].payload.action, "run_next");
  assert.deepEqual(refreshes[0], { name: "closedLoop", targetWorkspaceId: "weixin_fanfan", silent: true });

  state.cardGeneration.automationClosedLoopActionPlan = {
    data: {
      nextAction: {
        key: "deliver_action_handoff",
        body: { handoff_id: "handoff_2" }
      }
    }
  };
  const delivered = await handlers.runAutomationClosedLoopActionPlanFromUi({ dataset: {} });
  assert.deepEqual(delivered, { ok: true, actionKey: "deliver_action_handoff" });
  assert.equal(calls[1].name, "deliver");
  assert.equal(calls[1].id, "handoff_2");
  assert.equal(calls[1].payload.handoff_id, "handoff_2");
  assert.deepEqual(refreshes.slice(1).map((item) => item.name), ["handoffs", "closedLoop"]);

  state.cardGeneration.automationClosedLoopActionPlan = {
    data: { nextAction: { key: "collect_platform_action_evidence" } }
  };
  const unsupported = await handlers.runAutomationClosedLoopActionPlanFromUi({ dataset: {} });
  assert.equal(unsupported, null);
  assert.equal(state.cardGeneration.automationClosedLoopActionPlan.actionStatus, "failed");
  assert.equal(state.cardGeneration.automationClosedLoopActionPlan.actionError, "automation_closed_loop_action_not_supported_in_owner_panel");
  assert.ok(renders.includes("running"));
  assert.ok(renders.includes("executed"));
});

test("frontend ESM owner card generation panel composes main shell and previews", () => {
  const context = {
    target: { workspaceId: "weixin_fanfan", learnerId: "fanfan", displayName: "凡凡", enabled: true },
    selectedRecipeId: "daily_science_v1",
    recipes: [{ id: "daily_science_v1", label: "日常科学卡", durationMinutes: { min: 12, max: 18 } }],
    readiness: {
      targetEnabled: true,
      workspaceProvisioned: true,
      learningGraphReady: true,
      historySummaryReady: true,
      plannerContextReady: true,
      plannerGatewayConfigured: true,
      authoringGatewayConfigured: true,
      gatewayConfigured: true,
      evaluationGatewayConfigured: true
    },
    graph: { nodeCount: 12, edgeCount: 15 },
    targetProvisioning: {
      targetEnabled: true,
      mode: "explicit_provision",
      selectedDomainPackId: "pack_science",
      selectedSubject: "biology",
      graphOptions: {
        selectedDomainPackId: "pack_science",
        domainPacks: [{ domainPackId: "pack_science", domain: "science", subjects: ["biology"] }]
      }
    },
    historySummary: {
      learnerSummary: { recentCardCount: 3, completedRecentCardCount: 2 },
      masteryStateCount: 4
    },
    learningProfile: { summary: { masteryStateCount: 4 } },
    learningLoopState: {
      status: "ready_to_draft",
      nextAction: { action: "draft_daily_plan", enabled: true, reason: "daily_plan_ready" }
    },
    suggestedPlan: {
      title: "Cell evidence",
      targetNodeId: "kg_cell_evidence",
      targetNodeIds: ["kg_cell_evidence"],
      domain: "science",
      evidenceRequirements: ["short_answer"]
    },
    completionPolicy: { mode: "daily_score_once" }
  };
  const state = {
    cardGeneration: {
      status: "drafted",
      context,
      dailyLoopDraftResult: {
        planDraft: {
          planDraftId: "draft_1",
          selectedItemId: "item_1",
          itemCount: 1,
          planSummary: "Practice cell evidence.",
          items: [{
            itemId: "item_1",
            reason: "Needs a low-pressure card.",
            targetNodeIds: ["kg_cell_evidence"],
            evidenceRequirements: ["short_answer"],
            difficultyBand: "foundation",
            cardRole: "practice"
          }]
        }
      },
      dailyLoopPublishResult: {
        generation: { published: { taskCardId: "task_published_1" } }
      },
      generatedResult: {
        draft: {
          title: "Cell evidence card",
          teachingFlow: {
            learningTarget: "Explain cell evidence.",
            microLesson: { instruction: "Look at the evidence." },
            workedExample: { instruction: "Compare two examples." },
            guidedPractice: { instruction: "Answer one question." }
          }
        },
        published: { taskCardId: "task_published_1" }
      }
    }
  };

  const actionState = ownerCardGenerationActionState({ state: state.cardGeneration, context });
  assert.equal(actionState.canDraft, true);
  assert.equal(actionState.canAdvance, true);
  assert.equal(actionState.canPublish, true);

  const blockedState = ownerCardGenerationActionState({
    state: { status: "idle" },
    context: Object.assign({}, context, { readiness: Object.assign({}, context.readiness, { plannerGatewayConfigured: false }) })
  });
  assert.equal(blockedState.canDraft, false);
  assert.equal(blockedState.draftBlockedReason, "Planner Gateway 尚未配置，暂不能规划卡片。");

  assert.equal(errorPanel({}), "");
  assert.match(errorPanel({ error: "Gateway <missing>" }), /Gateway &lt;missing&gt;/);
  assert.match(structuredPreview(context), /&quot;learningGraphPlan&quot;: &quot;kg_cell_evidence&quot;/);

  const draftPreviewHtml = dailyLoopPlanPreview({ draftResult: state.cardGeneration.dailyLoopDraftResult });
  assert.match(draftPreviewHtml, /data-plan-draft-id="draft_1"/);
  assert.match(draftPreviewHtml, /Practice cell evidence./);
  assert.match(draftPreviewHtml, /kg_cell_evidence/);

  const cardPreviewHtml = generatedCardPreview(state.cardGeneration.generatedResult);
  assert.match(cardPreviewHtml, /Cell evidence card/);
  assert.match(cardPreviewHtml, /data-learning-open-growth-task="task_published_1"/);

  const html = renderOwnerCardGenerationPanel({
    state,
    workspaceId: "weixin_fanfan",
    viewTargets: [{ workspaceId: "weixin_fanfan", label: "凡凡", enabled: true }],
    renderers: {
      learningProfilePanel: () => `<div data-injected-profile-panel></div>`,
      profileFeedbackPanel: () => "",
      referenceChainPanel: () => "",
      ownerAuditPanel: () => "",
      cycleDrilldownPanel: () => "",
      ownerAuditReviewPanel: () => "",
      automationClosedLoopActionPlanPanel: () => "",
      operatingLoopPanel: () => "",
      stageAssessmentPanel: () => "",
      automationCycleClosurePanel: () => "",
      automationReviewAdvancementPanel: () => "",
      automationProposalPanel: () => "",
      automationDigestPanel: () => "",
      automationFailurePolicyPanel: () => "",
      automationActionHandoffPanel: () => "",
      automationSchedulerExecutionPanel: () => "",
      automationSchedulerRunPanel: () => "",
      automationSchedulerWorkerTargetPanel: () => "",
      releaseWorkbenchPanel: () => `<div data-injected-release-panel></div>`
    }
  });
  assert.match(html, /data-card-generation-manager/);
  assert.match(html, /data-card-generation-status="drafted"/);
  assert.match(html, /aria-busy="false"/);
  assert.match(html, /卡片生成/);
  assert.match(html, /data-card-generation-target="weixin_fanfan"/);
  assert.match(html, /data-card-generation-recipe="daily_science_v1"/);
  assert.match(html, /data-card-generation-target-provisioning/);
  assert.match(html, /data-card-generation-action-panel/);
  assert.match(html, /data-learning-loop-state-panel/);
  assert.match(html, /data-card-generation-secondary-readbacks/);
  assert.match(html, /data-injected-profile-panel/);
  assert.match(html, /data-injected-release-panel/);
  assert.match(html, /data-card-generation-plan-preview/);
  assert.match(html, /Cell evidence card/);
  assert.match(html, /data-card-generation-disclosure="structured-preview"/);
});

test("frontend ESM card generation facade matches legacy global payload and renderer surface", () => {
  const expectedSurface = [
    "createDailyEnglishGeneratePayload",
    "createAutomationCycleClosurePayload",
    "createAutomationClosedLoopActionPlanQueryPayload",
    "createAutomationReviewAdvancementPayload",
    "createAutomationProposalCreatePayload",
    "createAutomationProposalDecisionPayload",
    "createAutomationProposalPublishPayload",
    "createAutomationProposalQueryPayload",
    "createAutomationDigestCreatePayload",
    "createAutomationDigestQueryPayload",
    "createAutomationDigestReviewPayload",
    "createAutomationFailurePolicyCreatePayload",
    "createAutomationFailurePolicyQueryPayload",
    "createAutomationFailurePolicyReviewPayload",
    "createAutomationActionHandoffQueryPayload",
    "createAutomationActionHandoffPayload",
    "createAutomationActionHandoffDeliverPayload",
    "createAutomationSchedulerExecutionQueryPayload",
    "createAutomationSchedulerExecutionPayload",
    "createAutomationSchedulerRunQueryPayload",
    "createAutomationSchedulerRunPayload",
    "createAutomationSchedulerWorkerTargetQueryPayload",
    "createAutomationSchedulerWorkerTargetPayload",
    "createAutomationSchedulerWorkerTargetReviewPayload",
    "createRecommendationLifecycleDecisionPayload",
    "createDailyLoopAdvancePayload",
    "createDailyLoopDraftPayload",
    "createDailyLoopPublishPayload",
    "createOperatingLoopAdvancePayload",
    "createOperatingLoopRunQueryPayload",
    "createProfileFeedbackQueryPayload",
    "createCycleAuditQueryPayload",
    "createCycleHistoryQueryPayload",
    "createOwnerAuditReviewPayload",
    "createOwnerAuditReviewQueryPayload",
    "createOwnerCorrectionPayload",
    "createReleaseArtifactTemplateQueryPayload",
    "createReleaseWorkbenchActionAuditQueryPayload",
    "createReleaseStatusReadbackQueryPayload",
    "createReleaseEvidenceLedgerQueryPayload",
    "createReleaseLifecycleRecordsQueryPayload",
    "createReleaseLifecycleRecordPayload",
    "createReleasePackageBuildPayload",
    "createReleaseWorkbenchActionPayload",
    "createReferenceChainRequests",
    "createTargetProvisionPayload",
    "createStageAssessmentPayload",
    "cycleHistoryItemKey",
    "cycleAuditHasAnchor",
    "ownerAuditReviewHasAnchor",
    "isFanfanSampleTarget",
    "renderOwnerCardGenerationPanel"
  ];
  for (const key of expectedSurface) {
    assert.equal(typeof HermesGrowthCardGenerationUiFacade[key], "function", key);
  }

  const context = {
    target: { workspaceId: "weixin_fanfan", learnerId: "fanfan", enabled: true },
    selectedRecipeId: "daily_science_v1",
    programId: "program_science",
    suggestedPlan: {
      programId: "program_science",
      domain: "science",
      subject: "biology",
      targetNodeId: "kg_cell_evidence",
      targetNodeIds: ["kg_cell_evidence", "kg_cell_evidence_2"],
      evidenceRequirements: ["explain_evidence"]
    },
    nextCardRecommendation: {
      targetNodeIds: ["kg_recommendation"],
      strategy: "stabilize"
    },
    targetProvisioning: {
      selectedDomainPackId: "pack_science",
      selectedDomain: "science",
      selectedSubject: "biology",
      graphOptions: {
        selectedDomainPackId: "pack_science",
        domainPacks: [{ domainPackId: "pack_science", domain: "science", subjects: ["biology", "chemistry"] }]
      }
    },
    generationDefaults: {
      cardSchemaVersion: "growth.card.authoring.v2",
      availableMinutes: 20
    },
    releaseWorkbench: {
      inventory: { latestCollectionRunId: "collection_1" }
    }
  };
  const state = {
    automationDigests: {
      data: {
        digests: [{ digestId: "digest_1", status: "reviewed", proposalId: "proposal_1" }]
      }
    },
    automationActionHandoffs: {
      data: {
        handoffs: [{ handoffId: "handoff_1", digestId: "digest_1", deliveryStatus: "pending_delivery" }]
      }
    }
  };
  const draftResult = {
    planDraft: {
      planDraftId: "draft_1",
      selectedItemId: "item_1",
      targetNodeIds: ["kg_draft"],
      items: [{ itemId: "item_1", targetNodeIds: ["kg_item"] }]
    }
  };

  assert.deepEqual(facadeDailyEnglishGeneratePayload({ context, workspaceId: "weixin_fanfan" }), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    recipe_id: "daily_science_v1",
    card_schema_version: "growth.card.authoring.v2"
  });
  assert.equal(facadeDailyLoopDraftPayload({ context, workspaceId: "weixin_fanfan" }).target_node_ids[0], "kg_recommendation");
  assert.deepEqual(facadeDailyLoopPublishPayload({ context, workspaceId: "weixin_fanfan", draftResult }).target_node_ids, ["kg_item"]);
  assert.deepEqual(facadeProposalQueryPayload({ context, workspaceId: "weixin_fanfan" }), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    program_id: "program_science",
    domain_pack_id: "pack_science",
    domain: "science",
    subject: "biology",
    horizon: "daily_plan",
    limit: 6
  });
  assert.equal(facadeFailurePolicyQueryPayload({ context, workspaceId: "weixin_fanfan", status: "active" }).status, "active");
  assert.equal(facadeClosedLoopActionPlanQueryPayload({ context, workspaceId: "weixin_fanfan", state }).digest_id, "digest_1");
  assert.equal(facadeReleaseStatusReadbackQueryPayload({ context, workspaceId: "weixin_fanfan" }).collection_run_id, "collection_1");
  assert.deepEqual(facadeTargetProvisionPayload({ context, workspaceId: "weixin_fanfan", draft: { subject: "chemistry" } }), {
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    program_id: "program_science",
    domain_pack_id: "pack_science",
    domain: "science",
    subject: "chemistry",
    status: "active",
    source: "owner"
  });
  assert.equal(facadeStageAssessmentPayload({ context, workspaceId: "weixin_fanfan" }).generation_key, "stage_assessment:weixin_fanfan:kg_cell_evidence,kg_cell_evidence_2");

  const html = HermesGrowthCardGenerationUiFacade.renderOwnerCardGenerationPanel({
    state: { cardGeneration: { context, status: "idle" } },
    workspaceId: "weixin_fanfan",
    viewTargets: [{ workspaceId: "weixin_fanfan", label: "凡凡", enabled: true }]
  });
  assert.match(html, /data-card-generation-manager/);
  assert.match(html, /data-card-generation-target="weixin_fanfan"/);
});

test("frontend ESM reference chain helpers preserve request selection and readback panel markup", () => {
  assert.equal(referenceObjectTypeText("task_card"), "卡片");
  assert.equal(referenceObjectTypeText("profile_feedback"), "画像闭环");
  assert.equal(referenceObjectTypeText("custom_type"), "custom_type");
  assert.equal(referenceObjectTypeText(""), "引用");
  assert.equal(referenceChainStatusText("loading"), "读取中");
  assert.equal(referenceChainStatusText("partial"), "部分可读");
  assert.equal(referenceChainStatusText("unknown"), "待读取");

  const manualRequests = [];
  addReferenceRequest(manualRequests, "task_card", "task_1", "学习卡片", "published_card");
  addReferenceRequest(manualRequests, "task_card", "task_1", "Duplicate", "duplicate");
  addReferenceRequest(manualRequests, "", "missing");
  assert.deepEqual(manualRequests, [{
    key: "task_card:task_1",
    objectType: "task_card",
    objectId: "task_1",
    label: "学习卡片",
    reason: "published_card"
  }]);

  const context = {
    workspaceId: "ctx_workspace",
    programId: "program_ctx",
    target: { learnerId: "learner_1" },
    suggestedPlan: {
      programId: "program_plan",
      learningGraphPlanId: "graph_plan_1"
    }
  };
  const state = {
    dailyLoopDraftResult: {
      planDraft: {
        planDraftId: "draft_1"
      }
    },
    dailyLoopPublishResult: {
      generation: {
        published: { taskCardId: "task_published" },
        learningGraphPlan: { learningGraphPlanId: "graph_from_publish" }
      }
    },
    cycleHistory: {
      selectedCycle: {
        selectors: {
          taskCardId: "task_cycle",
          evaluationId: "eval_cycle"
        }
      }
    },
    cycleDrilldown: {
      audit: {
        timeline: [
          { taskCardId: "task_audit_1", evaluationId: "eval_audit_1" },
          { taskCardId: "task_audit_2", evaluationId: "eval_audit_2" }
        ]
      }
    }
  };

  const requests = createReferenceChainRequests({ context, state, workspaceId: "workspace_1" });
  assert.equal(requests.length, 8);
  assert.deepEqual(requests.map((item) => item.key), [
    "mastery_profile:learner_1",
    "program:program_ctx",
    "learning_graph_plan:graph_from_publish",
    "plan_draft:draft_1",
    "task_card:task_published",
    "evaluation:eval_cycle",
    "profile_feedback:task_card:task_cycle",
    "task_card:task_audit_1"
  ]);

  const rowHtml = referenceChainRow({
    objectType: "evaluation",
    objectId: "eval_1",
    ok: false,
    error: "not_visible"
  });
  assert.match(rowHtml, /data-reference-object-type="evaluation"/);
  assert.match(rowHtml, /data-reference-ok="false"/);
  assert.match(rowHtml, /not_visible/);
  assert.match(rowHtml, />不可读<\/em>/);

  const readyHtml = referenceChainPanel({
    referenceObjectTypes: { referenceContractObjectTypeCount: 9 }
  }, {
    referenceChain: {
      status: "ready",
      summaries: [
        {
          objectType: "task_card",
          objectId: "task_1",
          display: { title: "Daily card", subtitle: "Published card" }
        }
      ]
    }
  }, "workspace_1");
  assert.match(readyHtml, /data-reference-chain-panel/);
  assert.match(readyHtml, /data-reference-chain-status="ready"/);
  assert.match(readyHtml, /9 类 summary-only 引用，当前链路 1 项。/);
  assert.match(readyHtml, /Daily card/);
  assert.match(readyHtml, /<small>对象类型<\/small><strong>9<\/strong>/);
  assert.match(readyHtml, /<small>当前引用<\/small><strong>1<\/strong>/);

  const fallbackHtml = referenceChainPanel(context, { referenceChain: { status: "idle" } }, "workspace_1");
  assert.match(fallbackHtml, /data-reference-chain-status="idle"/);
  assert.match(fallbackHtml, /data-reference-object-type="mastery_profile"/);
  assert.match(fallbackHtml, /data-reference-object-id="learner_1"/);

  const loadingHtml = referenceChainPanel({}, { referenceChain: { status: "loading" } }, "workspace_1");
  assert.match(loadingHtml, /data-reference-chain-status="loading"/);
  assert.match(loadingHtml, /data-reference-chain-refresh disabled/);
  assert.match(loadingHtml, />读取中<\/button>/);

  const failedHtml = referenceChainPanel({}, { referenceChain: { status: "failed", error: "reference_chain_failed" } }, "workspace_1");
  assert.match(failedHtml, /data-reference-chain-status="failed"/);
  assert.match(failedHtml, /reference_chain_failed/);
  assert.match(failedHtml, /data-reference-ok="false"/);
});

test("frontend ESM cycle drilldown helpers preserve audit payloads, history, and panel markup", () => {
  assert.equal(cycleDrilldownStatusText("ready"), "已读取");
  assert.equal(cycleDrilldownStatusText("failed"), "失败");
  assert.equal(cycleTimelineTypeText("plan_publish_attempt"), "发布尝试");
  assert.equal(cycleTimelineTypeText("profile_delta"), "画像变化");
  assert.equal(cycleFindingText("privacy_projection"), "隐私投影");
  assert.equal(cycleFindingText(""), "检查项");

  const context = {
    target: { workspaceId: "weixin_fanfan", learnerId: "learner_1" },
    programId: "program_ctx",
    domain: "science",
    subject: "physics",
    targetProvisioning: {
      selectedDomainPackId: "pack_1",
      selectedDomain: "science",
      selectedSubject: "physics"
    },
    suggestedPlan: {
      programId: "program_plan",
      targetNodeId: "node_plan",
      targetNodeIds: ["node_plan", "node_extra"]
    },
    nextCardRecommendation: {
      targetNodeIds: ["node_recommendation"]
    },
    ownerAudit: {
      planAudit: { items: [{ planDraftId: "draft_audit", generatedTaskCardId: "task_audit", programId: "program_audit" }] },
      profileDeltaAudit: { profileDeltas: [{ profileDeltaId: "delta_1", evaluationId: "eval_1", evidenceIds: ["evidence_1"], targetNodeIds: ["node_delta"] }] },
      profileCorrections: { corrections: [{ correctionId: "correction_1", taskCardId: "task_correction", targetNodeIds: ["node_correction"] }] }
    }
  };
  const selectedCycle = {
    selectors: {
      planDraftId: "draft_cycle",
      taskCardId: "task_cycle",
      evaluationId: "eval_cycle",
      sourceId: "eval_cycle",
      targetNodeIds: ["node_cycle"]
    }
  };
  const auditPayload = createCycleAuditQueryPayload({
    context,
    workspaceId: "workspace_1",
    publishResult: {
      planDraft: {
        planDraftId: "draft_publish",
        selectedItemId: "item_1",
        items: [{ itemId: "item_1", targetNodeIds: ["node_item"] }]
      },
      generation: {
        published: { taskCardId: "task_published" }
      }
    },
    selectedCycle
  });
  assert.equal(auditPayload.workspace_id, "workspace_1");
  assert.equal(auditPayload.learner_id, "learner_1");
  assert.equal(auditPayload.program_id, "program_ctx");
  assert.equal(auditPayload.plan_draft_id, "draft_cycle");
  assert.equal(auditPayload.task_card_id, "task_cycle");
  assert.equal(auditPayload.evaluation_id, "eval_cycle");
  assert.deepEqual(auditPayload.target_node_ids, ["node_cycle"]);
  assert.equal(auditPayload.limit, 20);
  assert.equal(cycleAuditHasAnchor(auditPayload), true);
  assert.equal(cycleAuditHasAnchor({ workspace_id: "workspace_1" }), false);

  const historyPayload = createCycleHistoryQueryPayload({
    context,
    workspaceId: "workspace_1",
    selectedCycle
  });
  assert.equal(historyPayload.domain_pack_id, "pack_1");
  assert.equal(historyPayload.include_completeness, "false");
  assert.equal(historyPayload.limit, 8);
  assert.deepEqual(historyPayload.target_node_ids, ["node_cycle"]);

  const cycle = {
    selectors: {
      taskCardId: "task_cycle",
      evaluationId: "eval_cycle",
      profileDeltaId: "delta_1"
    },
    counts: {
      evidence: 2,
      profileDeltas: 1,
      corrections: 1
    },
    summary: "Completed cycle"
  };
  assert.equal(cycleHistoryItemKey(cycle, 0), "task_cycle:eval_cycle:delta_1:0");
  const historyRowsHtml = cycleHistoryRows({
    status: "ready",
    cycles: [cycle]
  }, "task_cycle:eval_cycle:delta_1:0");
  assert.match(historyRowsHtml, /data-card-generation-cycle-history-select/);
  assert.match(historyRowsHtml, /data-cycle-history-selected="true"/);
  assert.match(historyRowsHtml, /2 evidence · 1 delta · 1 correction/);
  assert.match(cycleHistoryRows({ status: "loading" }), /正在读取历史周期/);
  assert.match(cycleHistoryRows({ status: "failed", error: "cycle_history_failed" }), /cycle_history_failed/);

  const timelineHtml = cycleDrilldownTimelineRows([
    { type: "plan", planDraftId: "draft_1", summary: "Plan created", status: "pass" },
    { type: "evidence", evaluationId: "eval_1", error: "partial", at: "2026-07-06T00:00:00Z" }
  ]);
  assert.match(timelineHtml, /data-cycle-timeline-type="plan"/);
  assert.match(timelineHtml, /计划 · draft_1/);
  assert.match(timelineHtml, /评价证据 · eval_1/);

  const findingsHtml = cycleDrilldownFindingRows([
    { code: "plan_publication", ok: true },
    { code: "evaluation_evidence", ok: false, remediation: "Need evaluation" }
  ]);
  assert.match(findingsHtml, /data-cycle-finding-ok="true"/);
  assert.match(findingsHtml, /计划发布/);
  assert.match(findingsHtml, /data-cycle-finding-ok="false"/);
  assert.match(findingsHtml, /Need evaluation/);

  const panelHtml = cycleDrilldownPanel(context, {
    selectedWorkspaceId: "workspace_1",
    cycleHistory: {
      status: "ready",
      selectedCycleKey: "task_cycle:eval_cycle:delta_1:0",
      selectedCycle,
      cycles: [cycle]
    },
    cycleDrilldown: {
      status: "ready",
      audit: {
        summary: { planDraftCount: 1, evidenceCount: 2 },
        timeline: [{ type: "profile_delta", profileDeltaId: "delta_1", summary: "Profile updated", status: "pass" }]
      },
      completeness: {
        ok: true,
        complete: false,
        readyForAutomation: false,
        summary: { missingRequired: ["owner_review"] },
        findings: [{ code: "owner_correction_optional", ok: true }]
      }
    }
  });
  assert.match(panelHtml, /data-card-generation-cycle-drilldown/);
  assert.match(panelHtml, /data-cycle-drilldown-status="ready"/);
  assert.match(panelHtml, /读取某张卡从计划、评价到画像变化的 summary-only 证据。/);
  assert.match(panelHtml, /<small>卡片<\/small><strong>task_cycle<\/strong>/);
  assert.match(panelHtml, /<small>缺口<\/small><strong>1<\/strong>/);
  assert.match(panelHtml, /完整性：待补齐/);
  assert.match(panelHtml, /data-card-generation-cycle-audit-refresh >读取单卡审计<\/button>/);
  assert.match(panelHtml, /画像变化 · delta_1/);

  const blockedHtml = cycleDrilldownPanel({}, {
    cycleHistory: {},
    cycleDrilldown: { status: "idle" }
  });
  assert.match(blockedHtml, /还没有可读取的单卡 cycle anchor。/);
  assert.match(blockedHtml, /data-card-generation-cycle-audit-refresh disabled aria-disabled="true"/);

  const loadingHtml = cycleDrilldownPanel(context, {
    selectedWorkspaceId: "workspace_1",
    dailyLoopPublishResult: { generation: { published: { taskCardId: "task_published" } } },
    cycleHistory: { status: "loading" },
    cycleDrilldown: { status: "loading" }
  });
  assert.match(loadingHtml, /data-cycle-drilldown-status="loading"/);
  assert.match(loadingHtml, /正在读取 Growth 单卡审计和完整性检查。/);
  assert.match(loadingHtml, />读取中<\/button>/);
  assert.match(loadingHtml, /data-card-generation-cycle-history-refresh disabled/);
});

test("frontend ESM owner audit helpers preserve correction, review payloads, and panel markup", () => {
  assert.equal(ownerCorrectionStatusText("submitting"), "保存中");
  assert.equal(ownerCorrectionStatusText("submitted"), "已保存");
  assert.equal(ownerCorrectionStatusText("failed"), "失败");
  assert.equal(ownerReviewActionText("mark_needs_repair"), "标记需修补");
  assert.equal(ownerReviewActionText(""), "确认观察");
  assert.equal(ownerAuditReviewDecisionText("needs_follow_up"), "需跟进");
  assert.equal(ownerAuditReviewDecisionText("blocked"), "阻塞");
  assert.equal(ownerAuditReviewStatusText("loading"), "读取中");
  assert.equal(ownerAuditReviewStatusText("submitted"), "已记录");
  assert.equal(ownerAuditReviewStatusText("blocked"), "已阻塞");

  const context = {
    target: { workspaceId: "weixin_fanfan", learnerId: "learner_1" },
    programId: "program_ctx",
    domainPackId: "pack_ctx",
    domain: "science",
    subject: "physics",
    targetProvisioning: {
      selectedDomainPackId: "pack_selected",
      selectedDomain: "science",
      selectedSubject: "physics"
    },
    generationDefaults: {
      programId: "program_default",
      availableMinutes: 20,
      cardSchemaVersion: "growth.card.authoring.v1"
    },
    suggestedPlan: {
      programId: "program_plan",
      domainPackId: "pack_plan",
      domain: "science",
      subject: "physics",
      targetNodeId: "node_plan",
      targetNodeIds: ["node_plan"]
    },
    nextCardRecommendation: {
      targetNodeIds: ["node_recommendation"],
      strategy: "repair"
    },
    ownerAudit: {
      ok: true,
      available: true,
      summary: {
        planDraftCount: 2,
        publishedPlanCount: 1,
        profileDeltaCount: 1,
        correctionCount: 1,
        lastPlanAt: "2026-07-06T01:00:00Z",
        lastProfileDeltaAt: "2026-07-06T02:00:00Z"
      },
      planAudit: {
        items: [{
          planDraftId: "draft_1",
          generatedTaskCardId: "task_1",
          programId: "program_audit",
          selectedItem: { itemId: "item_1", reason: "Selected repair item" }
        }]
      },
      profileDeltaAudit: {
        profileDeltas: [{
          profileDeltaId: "delta_1",
          taskCardId: "task_delta",
          evaluationId: "eval_1",
          programId: "program_delta",
          evidenceIds: ["evidence_1"],
          targetNodeIds: ["node_delta"],
          changedCapabilities: [{ nodeId: "node_delta", afterStatus: "repair" }],
          summary: { reason: "Needs repair" }
        }]
      },
      profileCorrections: {
        corrections: [{
          correctionId: "correction_1",
          profileDeltaId: "delta_1",
          status: "submitted",
          targetNodeIds: ["node_delta"],
          reason: "Owner correction"
        }]
      }
    }
  };
  const selectedCycle = {
    selectors: {
      taskCardId: "task_cycle",
      evaluationId: "eval_cycle",
      profileDeltaId: "delta_cycle",
      correctionId: "correction_cycle",
      targetNodeIds: ["node_cycle"]
    }
  };

  assert.deepEqual(ownerCorrectionTargetNodeIds(context), ["node_delta"]);
  assert.match(ownerAuditMetricRows(context.ownerAudit), /<strong>2<\/strong>/);
  assert.match(ownerAuditMetricRows(context.ownerAudit), /2026-07-06T02:00:00Z/);
  assert.match(ownerPlanAuditRows(context.ownerAudit), /Selected repair item/);
  assert.match(ownerProfileDeltaRows(context.ownerAudit), /Needs repair/);
  assert.match(ownerCorrectionRows(context.ownerAudit), /Owner correction/);
  assert.match(ownerCorrectionStatusPanel({ status: "submitted", result: { correctionId: "correction_1" } }), /纠偏已写入证据账本：correction_1/);

  const correctionPayload = createOwnerCorrectionPayload({
    context,
    workspaceId: "workspace_1",
    draft: {
      reviewAction: "mark_needs_repair",
      note: "Keep this summary-only correction note longer than needed for slice coverage.",
      taskCardId: "task_draft"
    }
  });
  assert.equal(correctionPayload.workspace_id, "workspace_1");
  assert.equal(correctionPayload.learner_id, "learner_1");
  assert.equal(correctionPayload.program_id, "program_ctx");
  assert.equal(correctionPayload.review_action, "mark_needs_repair");
  assert.equal(correctionPayload.task_card_id, "task_draft");
  assert.equal(correctionPayload.profile_delta_id, "delta_1");
  assert.deepEqual(correctionPayload.source_evidence_ids, ["evidence_1"]);
  assert.deepEqual(correctionPayload.target_node_ids, ["node_delta"]);

  const reviewQueryPayload = createOwnerAuditReviewQueryPayload({
    context,
    workspaceId: "workspace_1",
    selectedCycle
  });
  assert.equal(reviewQueryPayload.workspace_id, "workspace_1");
  assert.equal(reviewQueryPayload.learner_id, "learner_1");
  assert.equal(reviewQueryPayload.program_id, "program_ctx");
  assert.equal(reviewQueryPayload.task_card_id, "task_cycle");
  assert.equal(reviewQueryPayload.evaluation_id, "eval_cycle");
  assert.equal(reviewQueryPayload.correction_id, "correction_cycle");
  assert.deepEqual(reviewQueryPayload.target_node_ids, ["node_cycle"]);
  assert.equal(reviewQueryPayload.limit, 5);
  assert.equal(ownerAuditReviewHasAnchor(reviewQueryPayload), true);
  assert.equal(ownerAuditReviewHasAnchor({ workspace_id: "workspace_1" }), false);

  const reviewPayload = createOwnerAuditReviewPayload({
    context,
    workspaceId: "workspace_1",
    selectedCycle,
    decision: "needs_follow_up",
    note: "Follow up with a bounded repair recommendation."
  });
  assert.equal(reviewPayload.decision, "needs_follow_up");
  assert.equal(reviewPayload.owner_note, "Follow up with a bounded repair recommendation.");
  assert.equal(reviewPayload.requested_by, "owner");
  assert.equal(reviewPayload.reviewed_by, "owner");

  const rowsHtml = ownerAuditReviewRows({
    status: "ready",
    data: {
      reviews: [{
        reviewId: "review_1",
        decision: "accepted",
        createdAt: "2026-07-06T03:00:00Z",
        feedbackSummary: { readyForNextPlan: true, cycleComplete: true },
        auditSummary: { passCheckCount: 3 },
        recommendation: { strategy: "repair" },
        nextAction: { action: "draft_daily_plan" }
      }]
    }
  });
  assert.match(rowsHtml, /data-owner-audit-review-row/);
  assert.match(rowsHtml, /readyForNextPlan · cycleComplete · strategy:repair · draft_daily_plan/);
  assert.match(rowsHtml, /接受画像 · 3 checks · 2026-07-06T03:00:00Z/);
  assert.match(ownerAuditReviewRows({ status: "loading" }), /正在读取完成周期审核/);
  assert.match(ownerAuditReviewRows({ status: "failed", error: "review_failed" }), /review_failed/);
  assert.match(ownerAuditReviewStatusPanel({
    actionStatus: "reviewed",
    actionResult: { review: { reviewId: "review_1", decision: "blocked" } }
  }), /完成周期审核已记录：review_1/);

  const auditHtml = ownerAuditPanel(context, {
    ownerCorrectionDraft: "summary correction",
    ownerCorrectionAction: "mark_stable",
    ownerCorrection: { status: "submitted", result: { correctionId: "correction_1" } }
  });
  assert.match(auditHtml, /data-card-generation-owner-audit/);
  assert.match(auditHtml, /data-owner-audit-available="true"/);
  assert.match(auditHtml, /<strong>审计与纠偏<\/strong>/);
  assert.match(auditHtml, /<option value="mark_stable" selected>确认稳定<\/option>/);
  assert.match(auditHtml, /节点：node_delta/);
  assert.match(auditHtml, /data-owner-correction-status="submitted"/);

  const reviewHtml = ownerAuditReviewPanel(context, {
    selectedWorkspaceId: "workspace_1",
    ownerAuditReviewDraft: "bounded note",
    cycleHistory: { selectedCycle },
    ownerAuditReviews: {
      status: "ready",
      data: { count: 1, reviews: [{ reviewId: "review_1", nextAction: { action: "draft_daily_plan" } }] },
      actionStatus: "reviewed",
      actionResult: { review: { reviewId: "review_1", decision: "accepted" } }
    }
  });
  assert.match(reviewHtml, /data-owner-audit-review-panel/);
  assert.match(reviewHtml, /data-owner-audit-review-status="ready"/);
  assert.match(reviewHtml, /Owner 对选中的完成周期做一次审核记录/);
  assert.match(reviewHtml, /<small>选中周期<\/small><strong>task_cycle<\/strong><em>可审核<\/em>/);
  assert.match(reviewHtml, /<small>纠偏关联<\/small><strong>可用<\/strong>/);
  assert.match(reviewHtml, /data-owner-audit-review-decision="correction_recorded"/);
  assert.match(reviewHtml, /data-owner-audit-review-action-status="reviewed"/);

  const blockedReviewHtml = ownerAuditReviewPanel({}, {
    ownerAuditReviews: { status: "idle" }
  });
  assert.match(blockedReviewHtml, /请先在历史周期里选择一条已完成周期/);
  assert.match(blockedReviewHtml, /data-owner-audit-review-blocked-reason="请先选择一条完成周期。"/);
});

test("frontend ESM automation closed-loop panels preserve action plan, closure, and review markup", () => {
  assert.equal(automationClosedLoopActionText("run_learning_loop_next"), "执行学习闭环下一步");
  assert.equal(automationClosedLoopActionText("advance_review"), "推进复核链");
  assert.equal(automationClosedLoopActionText(""), "待读取");
  assert.equal(automationClosedLoopStatusText("ready_for_cycle_closure"), "可准备");
  assert.equal(automationClosedLoopStatusText("learner_cycle_required"), "待完成");
  assert.equal(automationCycleClosureStatusText("proposal_ready"), "建议已准备");
  assert.equal(automationCycleClosureStatusText("pending"), "Digest 待复核");
  assert.equal(automationReviewAdvancementStatusText("pending_delivery"), "Handoff 就绪");
  assert.equal(automationReviewAdvancementStatusText("execution_blocked"), "已阻塞");

  const phaseRowsHtml = automationClosedLoopPhaseRows([
    { key: "operating_loop", label: "Operating loop", ok: true, nextAction: "publish_selected_plan_item" },
    { key: "digest", label: "Digest", ok: false, error: "digest_missing" }
  ]);
  assert.match(phaseRowsHtml, /data-automation-closed-loop-phase="operating_loop"/);
  assert.match(phaseRowsHtml, /data-automation-closed-loop-phase-ok="true"/);
  assert.match(phaseRowsHtml, /publish_selected_plan_item/);
  assert.match(phaseRowsHtml, /data-automation-closed-loop-phase-ok="false"/);
  assert.match(phaseRowsHtml, /digest_missing/);
  assert.match(automationClosedLoopPhaseRows([]), /暂无阶段读数/);

  assert.match(automationClosedLoopActionStatusPanel({ actionStatus: "running" }), /正在执行 action-plan/);
  assert.match(automationClosedLoopActionStatusPanel({ actionStatus: "executed" }), /下一步动作已完成/);
  assert.match(automationClosedLoopActionStatusPanel({ actionStatus: "blocked", actionError: "loop blocked" }), /loop blocked/);

  const actionPlanHtml = automationClosedLoopActionPlanPanel({}, {
    automationClosedLoopActionPlan: {
      status: "ready_for_cycle_closure",
      data: {
        nextAction: {
          key: "prepare_cycle_closure",
          reason: "Completed cycle is ready for closure."
        },
        automationReadiness: {
          completedCycleReady: true,
          digestPresent: true,
          digestReviewed: false,
          failurePolicyReady: true,
          handoffPresent: true,
          handoffDelivered: false
        },
        phases: [
          { key: "cycle", label: "Cycle", ok: true, status: "ready" },
          { key: "handoff", label: "Handoff", ok: false, handoff: { handoffId: "handoff_1" } }
        ]
      }
    }
  });
  assert.match(actionPlanHtml, /data-automation-closed-loop-action-plan-panel/);
  assert.match(actionPlanHtml, /data-automation-closed-loop-action-plan-status="ready_for_cycle_closure"/);
  assert.match(actionPlanHtml, /Completed cycle is ready for closure./);
  assert.match(actionPlanHtml, /data-automation-closed-loop-action-key="prepare_cycle_closure"/);
  assert.match(actionPlanHtml, />准备复核包<\/button>/);
  assert.match(actionPlanHtml, /<small>Digest<\/small><strong>待复核<\/strong>/);
  assert.match(actionPlanHtml, /<small>Handoff<\/small><strong>待投递<\/strong>/);
  assert.match(actionPlanHtml, /handoff_1/);

  const blockedActionPlanHtml = automationClosedLoopActionPlanPanel({}, {
    automationClosedLoopActionPlan: {
      status: "ready",
      data: { nextAction: { key: "collect_platform_action_evidence" } }
    }
  });
  assert.match(blockedActionPlanHtml, /data-automation-closed-loop-blocked-reason="当前下一步需要在对应面板或学习卡里完成。"/);
  assert.match(blockedActionPlanHtml, /class="primary disabled"/);

  assert.match(automationCycleClosureStatusPanel({
    actionStatus: "prepared",
    actionResult: { summary: { proposalId: "proposal_1", digestId: "digest_1" } }
  }), /复核包已准备：proposal_1 \/ digest_1。/);
  assert.match(automationCycleClosureStatusPanel({ actionStatus: "failed", actionError: "closure_failed" }), /closure_failed/);

  const closureHtml = automationCycleClosurePanel({}, {
    cycleHistory: { selectedCycle: { cycleId: "cycle_1" } },
    automationCycleClosure: {
      actionStatus: "prepared",
      actionResult: {
        summary: { selectedCycleId: "cycle_summary", proposalId: "proposal_1", digestId: "digest_1" },
        stages: [{ name: "profile_feedback", ok: false }]
      }
    }
  });
  assert.match(closureHtml, /data-automation-cycle-closure-panel/);
  assert.match(closureHtml, /data-automation-cycle-closure-status="prepared"/);
  assert.match(closureHtml, /<small>完成周期<\/small><strong>cycle_summary<\/strong>/);
  assert.match(closureHtml, /<small>Proposal<\/small><strong>proposal_1<\/strong>/);
  assert.match(closureHtml, /阻塞阶段：profile_feedback/);
  assert.match(closureHtml, /data-automation-cycle-closure-action-status="prepared"/);

  assert.match(automationReviewAdvancementStatusPanel({
    actionStatus: "advanced",
    actionResult: { summary: { digestId: "digest_1", handoffId: "handoff_1" } }
  }), /复核链已推进：digest_1 \/ handoff_1。/);
  assert.match(automationReviewAdvancementStatusPanel({ actionStatus: "failed", actionError: "review_failed" }), /review_failed/);

  const reviewHtml = automationReviewAdvancementPanel({}, {
    automationReviewAdvancement: {
      actionStatus: "advanced",
      actionResult: {
        summary: { digestId: "digest_1", policyId: "policy_1", handoffId: "handoff_1" },
        stages: [{ name: "failure_policy", ok: false }]
      }
    }
  });
  assert.match(reviewHtml, /data-automation-review-advancement-panel/);
  assert.match(reviewHtml, /data-automation-review-advancement-status="advanced"/);
  assert.match(reviewHtml, /已完成 Owner 复核链/);
  assert.match(reviewHtml, /<small>Digest<\/small><strong>digest_1<\/strong>/);
  assert.match(reviewHtml, /<small>失败策略<\/small><strong>policy_1<\/strong>/);
  assert.match(reviewHtml, /<small>Handoff<\/small><strong>handoff_1<\/strong>/);
  assert.match(reviewHtml, /阻塞阶段：failure_policy/);
  assert.match(reviewHtml, /data-automation-review-advancement-action-status="advanced"/);

  const busyReviewHtml = automationReviewAdvancementPanel({}, {
    automationReviewAdvancement: { actionStatus: "submitting" }
  });
  assert.match(busyReviewHtml, /data-automation-review-advancement-advance disabled/);
  assert.match(busyReviewHtml, />推进中<\/button>/);
});

test("frontend ESM automation proposal, digest, and handoff panels preserve review markup", () => {
  assert.equal(automationProposalStatusText("proposed"), "待复核");
  assert.equal(automationProposalStatusText("published"), "已发布");
  assert.equal(automationDigestStatusText("archived"), "已归档");
  assert.equal(automationActionHandoffStatusText("delivery_failed"), "投递失败");

  const context = {
    target: { workspaceId: "weixin_fanfan", learnerId: "learner_1" },
    programId: "program_ctx",
    domain: "science",
    subject: "physics",
    targetProvisioning: {
      selectedDomainPackId: "pack_1",
      selectedDomain: "science",
      selectedSubject: "physics"
    },
    generationDefaults: {
      availableMinutes: 18
    },
    suggestedPlan: {
      targetNodeId: "node_plan",
      targetNodeIds: ["node_plan"]
    },
    nextCardRecommendation: {
      targetNodeIds: ["node_recommendation"]
    }
  };
  const selectedCycle = {
    selectors: {
      planDraftId: "draft_cycle",
      taskCardId: "task_cycle",
      evaluationId: "eval_cycle",
      targetNodeIds: ["node_cycle"]
    }
  };
  const scope = automationProposalScopeFromContext(context, "workspace_1");
  assert.equal(scope.workspace_id, "workspace_1");
  assert.equal(scope.learner_id, "learner_1");
  assert.equal(scope.domain_pack_id, "pack_1");
  assert.equal(scope.horizon, "daily_plan");

  const createPayload = createAutomationProposalCreatePayload({
    context,
    workspaceId: "workspace_1",
    selectedCycle
  });
  assert.equal(createPayload.source_plan_draft_id, "draft_cycle");
  assert.equal(createPayload.source_task_card_id, "task_cycle");
  assert.equal(createPayload.source_evaluation_id, "eval_cycle");
  assert.equal(createPayload.available_minutes, "18");
  assert.equal(createPayload.low_pressure, true);
  assert.deepEqual(createPayload.source_target_node_ids, ["node_cycle"]);
  assert.deepEqual(createPayload.target_node_ids, ["node_cycle"]);

  assert.match(automationProposalStatusPanel({
    actionStatus: "created",
    actionResult: { proposal: { proposalId: "proposal_1" } }
  }), /已生成自动化建议：proposal_1/);
  assert.match(automationProposalStatusPanel({
    actionStatus: "published",
    actionResult: { proposal: { execution: { generatedTaskCardId: "task_generated" } } }
  }), /建议已发布：task_generated/);

  const proposalRowsHtml = automationProposalRows({
    status: "ready",
    data: {
      proposals: [
        {
          proposalId: "proposal_1",
          status: "proposed",
          proposalSummary: "Repair next card",
          rationale: { plan: { reason: "Need repair" } },
          targetNodeIds: ["node_1"]
        },
        {
          proposalId: "proposal_2",
          status: "accepted",
          execution: { status: "ready" },
          planDraftId: "draft_2"
        },
        {
          proposalId: "proposal_3",
          status: "accepted",
          execution: { status: "published" }
        }
      ]
    }
  });
  assert.match(proposalRowsHtml, /data-automation-proposal-id="proposal_1"/);
  assert.match(proposalRowsHtml, /Repair next card/);
  assert.match(proposalRowsHtml, /data-automation-proposal-status="accepted"/);
  assert.match(proposalRowsHtml, /data-automation-proposal-publish data-automation-proposal-id="proposal_2"/);
  assert.match(proposalRowsHtml, /建议已经发布。/);
  assert.match(automationProposalRows({ status: "loading" }), /正在读取自动化建议/);
  assert.match(automationProposalRows({ status: "failed", error: "proposal_failed" }), /proposal_failed/);

  const proposalPanelHtml = automationProposalPanel(context, {
    selectedWorkspaceId: "workspace_1",
    cycleHistory: { selectedCycle },
    automationProposals: {
      status: "ready",
      data: {
        proposals: [
          { proposalId: "proposal_1", status: "proposed" },
          { proposalId: "proposal_2", status: "accepted", execution: { status: "published" } }
        ]
      },
      actionStatus: "reviewed",
      actionResult: { proposal: { status: "accepted" } }
    }
  });
  assert.match(proposalPanelHtml, /data-automation-proposal-panel/);
  assert.match(proposalPanelHtml, /Owner 需要复核 AI 建议后再发布/);
  assert.match(proposalPanelHtml, /<small>待复核<\/small><strong>1<\/strong>/);
  assert.match(proposalPanelHtml, /<small>已发布<\/small><strong>1<\/strong>/);
  assert.match(proposalPanelHtml, /data-automation-proposal-action-status="reviewed"/);

  const blockedProposalPanelHtml = automationProposalPanel({}, {
    automationProposals: { status: "idle", data: { proposals: [] } }
  });
  assert.match(blockedProposalPanelHtml, /请先在历史周期里选择一个完整周期。/);

  assert.match(automationDigestActionStatusPanel({
    actionStatus: "reviewed",
    actionResult: { digest: { status: "reviewed" } }
  }), /Digest 已记录为 已复核。/);
  const digestRowsHtml = automationDigestRows({
    status: "ready",
    data: {
      digests: [{
        digestId: "digest_1",
        status: "pending",
        subject: "physics",
        summary: { wouldPublish: 1, blocked: 2, skipped: 0, requiredActions: 3 },
        requiredActions: [{ proposalId: "proposal_1" }],
        candidates: [{ id: "candidate_1" }]
      }]
    }
  });
  assert.match(digestRowsHtml, /data-automation-digest-id="digest_1"/);
  assert.match(digestRowsHtml, /proposal_1/);
  assert.match(digestRowsHtml, /physics · would 1 · blocked 2 · skipped 0 · actions 3/);
  assert.match(digestRowsHtml, /候选 1 · 手动发布，不自动执行/);
  assert.match(digestRowsHtml, /data-automation-digest-status="reviewed"/);
  assert.match(automationDigestRows({ status: "failed", error: "digest_failed" }), /digest_failed/);

  const digestPanelHtml = automationDigestPanel({}, {
    automationDigests: {
      status: "ready",
      data: {
        digests: [
          { digestId: "digest_1", status: "pending", requiredActions: [{ id: "a1" }] },
          { digestId: "digest_2", status: "reviewed", requiredActions: [{ id: "a2" }] }
        ]
      },
      actionStatus: "created"
    }
  });
  assert.match(digestPanelHtml, /data-automation-digest-panel/);
  assert.match(digestPanelHtml, /<small>待复核<\/small><strong>1<\/strong>/);
  assert.match(digestPanelHtml, /<small>已复核<\/small><strong>1<\/strong>/);
  assert.match(digestPanelHtml, /<small>手动动作<\/small><strong>2<\/strong>/);
  assert.match(digestPanelHtml, /data-automation-digest-action-status="created"/);

  assert.match(automationActionHandoffActionStatusPanel({
    actionStatus: "created",
    actionResult: { handoff: { handoffId: "handoff_1" } }
  }), /Handoff 已创建：handoff_1/);
  assert.match(automationActionHandoffActionStatusPanel({
    actionStatus: "delivered",
    actionResult: { deliveryStatus: "delivery_failed" }
  }), /Handoff 投递状态：投递失败。/);

  const handoffDigestRowsHtml = automationActionHandoffDigestRows({
    data: {
      digests: [
        { digestId: "digest_1", status: "reviewed", summary: { requiredActions: 2 } },
        { digestId: "digest_2", status: "pending" }
      ]
    }
  }, {
    data: { handoffs: [{ digestId: "digest_1" }] }
  });
  assert.match(handoffDigestRowsHtml, /data-automation-action-handoff-digest-row/);
  assert.match(handoffDigestRowsHtml, /已建 handoff/);
  assert.match(handoffDigestRowsHtml, /required actions 2/);

  const handoffRowsHtml = automationActionHandoffRows({
    status: "ready",
    data: {
      handoffs: [{
        handoffId: "handoff_1",
        digestId: "digest_1",
        deliveryStatus: "pending_delivery",
        actionSummary: { requiredActions: 2, blocked: 1 }
      }]
    }
  });
  assert.match(handoffRowsHtml, /data-automation-action-handoff-id="handoff_1"/);
  assert.match(handoffRowsHtml, /digest digest_1 · actions 2 · blocked 1/);
  assert.match(handoffRowsHtml, />待投递<\/em>/);
  assert.match(handoffRowsHtml, /data-automation-action-handoff-deliver/);
  assert.match(automationActionHandoffRows({ status: "failed", error: "handoff_failed" }), /handoff_failed/);

  const handoffPanelHtml = automationActionHandoffPanel({}, {
    automationDigests: { data: { digests: [{ digestId: "digest_2", status: "reviewed" }] } },
    automationActionHandoffs: {
      status: "ready",
      data: {
        handoffs: [
          { handoffId: "handoff_1", digestId: "digest_1", deliveryStatus: "pending_delivery" },
          { handoffId: "handoff_2", digestId: "digest_3", deliveryStatus: "delivered" },
          { handoffId: "handoff_3", digestId: "digest_4", deliveryStatus: "delivery_failed" }
        ]
      },
      actionStatus: "delivered",
      actionResult: { deliveryStatus: "delivered" }
    }
  });
  assert.match(handoffPanelHtml, /data-automation-action-handoff-panel/);
  assert.match(handoffPanelHtml, /<small>待投递<\/small><strong>2<\/strong>/);
  assert.match(handoffPanelHtml, /<small>已投递<\/small><strong>1<\/strong>/);
  assert.match(handoffPanelHtml, /<small>失败<\/small><strong>1<\/strong>/);
  assert.match(handoffPanelHtml, /data-automation-action-handoff-action-status="delivered"/);
});

test("frontend ESM automation failure policy panel preserves readiness and review markup", () => {
  assert.equal(automationFailurePolicyStatusText("draft"), "草稿");
  assert.equal(automationFailurePolicyStatusText("active"), "已激活");
  assert.equal(automationFailurePolicyStatusText("failure_policy_ready"), "策略已就绪");
  assert.equal(automationFailurePolicyStatusText("missing_active_failure_policy"), "缺少激活策略");

  assert.match(automationFailurePolicyActionStatusPanel({
    actionStatus: "created",
    actionResult: { policy: { policyId: "policy_1" } }
  }), /失败策略已创建：policy_1。/);
  assert.match(automationFailurePolicyActionStatusPanel({
    actionStatus: "reviewed",
    actionResult: { policy: { status: "active" } }
  }), /失败策略已记录为 已激活。/);
  assert.match(automationFailurePolicyActionStatusPanel({
    actionStatus: "failed",
    actionError: "policy_failed"
  }), /policy_failed/);

  const rowsHtml = automationFailurePolicyRows({
    status: "ready",
    data: {
      policies: [
        {
          policyId: "policy_draft",
          status: "draft",
          failurePolicy: {
            visibleFailureRequired: true,
            retryRequiresOwner: true
          },
          rollbackPolicy: {
            transactionalPublishRequired: true
          }
        },
        {
          policyId: "policy_active",
          status: "active",
          failurePolicy: {
            visibleFailureRequired: false,
            retryRequiresOwner: false
          },
          rollbackPolicy: {
            transactionalPublishRequired: false
          }
        }
      ]
    }
  });
  assert.match(rowsHtml, /data-automation-failure-policy-id="policy_draft"/);
  assert.match(rowsHtml, /visible failure · Owner retry · transactional publish/);
  assert.match(rowsHtml, /data-automation-failure-policy-status="active"/);
  assert.match(rowsHtml, /data-automation-failure-policy-id="policy_active"/);
  assert.match(rowsHtml, /hidden failure blocked · retry policy disabled · transaction not proven/);
  assert.match(rowsHtml, /data-automation-failure-policy-status="active" disabled/);
  assert.match(automationFailurePolicyRows({ status: "loading" }), /正在读取 failure policy/);
  assert.match(automationFailurePolicyRows({ status: "failed", error: "failure_policy_failed" }), /failure_policy_failed/);
  assert.match(automationFailurePolicyRows({ status: "ready", data: { policies: [] } }), /暂无 failure policy/);

  const panelHtml = automationFailurePolicyPanel({}, {
    automationFailurePolicies: {
      status: "ready",
      data: {
        readiness: { readyForWritefulAutomationPrerequisite: true },
        policies: [
          { policyId: "policy_1", status: "draft" },
          { policyId: "policy_2", status: "active" }
        ]
      },
      actionStatus: "reviewed",
      actionResult: { policy: { status: "active" } }
    }
  });
  assert.match(panelHtml, /data-automation-failure-policy-panel/);
  assert.match(panelHtml, /data-automation-failure-policy-status="ready"/);
  assert.match(panelHtml, /失败可见性和 Owner retry 策略已激活；调度仍保持关闭。/);
  assert.match(panelHtml, /<small>就绪<\/small><strong>1<\/strong>/);
  assert.match(panelHtml, /<small>草稿<\/small><strong>1<\/strong>/);
  assert.match(panelHtml, /<small>激活<\/small><strong>1<\/strong>/);
  assert.match(panelHtml, /data-automation-failure-policy-action-status="reviewed"/);

  const loadingPanelHtml = automationFailurePolicyPanel({}, {
    automationFailurePolicies: { status: "loading", actionStatus: "submitting" }
  });
  assert.match(loadingPanelHtml, /data-automation-failure-policy-create disabled/);
  assert.match(loadingPanelHtml, />读取中<\/button>/);
});

test("frontend ESM automation scheduler panels preserve execution, run, and worker target markup", () => {
  assert.equal(automationSchedulerExecutionStatusText("published"), "已发布");
  assert.equal(automationSchedulerExecutionStatusText("blocked"), "已拦截");
  assert.equal(automationSchedulerRunStatusText("partial"), "部分完成");
  assert.equal(automationSchedulerWorkerTargetStatusText("proposed"), "待复核");
  assert.equal(automationSchedulerWorkerTargetStatusText("enabled"), "已复核");

  const handoffAction = automationSchedulerExecutionActionFromHandoff({
    actions: [{ itemId: "item_fallback" }, { proposalId: "proposal_1", selectedItemId: "item_1" }]
  });
  assert.equal(handoffAction.proposalId, "proposal_1");

  assert.match(automationSchedulerExecutionActionStatusPanel({
    actionStatus: "executed",
    actionResult: { execution: { executionId: "execution_1", status: "published" } }
  }), /Scheduler execution 已发布：execution_1。/);
  assert.match(automationSchedulerExecutionActionStatusPanel({
    actionStatus: "executed",
    actionResult: { execution: { executionId: "execution_2", status: "blocked", reason: "runtime disabled" } }
  }), /Scheduler execution 被门禁拦截：runtime disabled。/);

  const executionHandoffRowsHtml = automationSchedulerExecutionHandoffRows({
    data: {
      handoffs: [
        {
          handoffId: "handoff_1",
          digestId: "digest_1",
          deliveryStatus: "delivered",
          actions: [{ proposalId: "proposal_1", selectedItemId: "item_1" }]
        },
        { handoffId: "handoff_2", deliveryStatus: "pending_delivery" }
      ]
    }
  }, {});
  assert.match(executionHandoffRowsHtml, /data-automation-scheduler-execution-handoff-row/);
  assert.match(executionHandoffRowsHtml, /digest digest_1 · proposal proposal_1/);
  assert.match(executionHandoffRowsHtml, /data-automation-selected-item-id="item_1"/);

  const executionRowsHtml = automationSchedulerExecutionRows({
    status: "ready",
    data: {
      executions: [
        {
          executionId: "execution_1",
          status: "published",
          handoffId: "handoff_1",
          proposalId: "proposal_1",
          execution: { generatedTaskCardId: "task_1" }
        },
        {
          executionId: "execution_2",
          status: "blocked",
          reason: "runtime disabled"
        }
      ]
    }
  });
  assert.match(executionRowsHtml, /data-automation-scheduler-execution-id="execution_1"/);
  assert.match(executionRowsHtml, /generated card task_1/);
  assert.match(executionRowsHtml, /runtime disabled/);
  assert.match(automationSchedulerExecutionRows({ status: "failed", error: "execution_failed" }), /execution_failed/);

  const executionPanelHtml = automationSchedulerExecutionPanel({}, {
    automationActionHandoffs: {
      data: { handoffs: [{ handoffId: "handoff_1", deliveryStatus: "delivered", proposalId: "proposal_1" }] }
    },
    automationSchedulerExecutions: {
      status: "ready",
      data: {
        executions: [
          { executionId: "execution_1", status: "published" },
          { executionId: "execution_2", status: "blocked" },
          { executionId: "execution_3", status: "failed" }
        ]
      },
      actionStatus: "executed",
      actionResult: { execution: { executionId: "execution_1", status: "published" } }
    }
  });
  assert.match(executionPanelHtml, /data-automation-scheduler-execution-panel/);
  assert.match(executionPanelHtml, /<small>已发布<\/small><strong>1<\/strong>/);
  assert.match(executionPanelHtml, /<small>已拦截<\/small><strong>1<\/strong>/);
  assert.match(executionPanelHtml, /<small>失败<\/small><strong>1<\/strong>/);
  assert.match(executionPanelHtml, /data-automation-scheduler-execution-action-status="executed"/);

  assert.match(automationSchedulerRunActionStatusPanel({
    actionStatus: "ran",
    actionResult: { run: { runId: "run_1", status: "completed" } }
  }), /Scheduler run 已完成：run_1。/);
  assert.match(automationSchedulerRunActionStatusPanel({
    actionStatus: "ran",
    actionResult: { run: { runId: "run_2", status: "blocked", reason: "scheduler disabled" } }
  }), /Scheduler run 被门禁拦截：scheduler disabled。/);

  const runRowsHtml = automationSchedulerRunRows({
    status: "ready",
    data: {
      runs: [{
        runId: "run_1",
        status: "completed",
        summary: { inspectedHandoffs: 3, attemptedExecutions: 2 }
      }]
    }
  });
  assert.match(runRowsHtml, /data-automation-scheduler-run-id="run_1"/);
  assert.match(runRowsHtml, /handoffs 3 · executions 2/);
  assert.match(automationSchedulerRunRows({ status: "loading" }), /正在读取 scheduler run/);

  const runPanelHtml = automationSchedulerRunPanel({}, {
    automationSchedulerRuns: {
      status: "ready",
      data: {
        runs: [
          { runId: "run_1", status: "completed" },
          { runId: "run_2", status: "blocked" },
          { runId: "run_3", status: "failed" }
        ]
      },
      actionStatus: "submitting"
    }
  });
  assert.match(runPanelHtml, /data-automation-scheduler-run-panel/);
  assert.match(runPanelHtml, /<small>已完成<\/small><strong>1<\/strong>/);
  assert.match(runPanelHtml, /data-automation-scheduler-run-once disabled/);
  assert.match(runPanelHtml, />运行中<\/button>/);

  assert.match(automationSchedulerWorkerTargetActionStatusPanel({
    actionStatus: "created",
    actionResult: { target: { targetId: "target_1" } }
  }), /Worker target 已创建：target_1/);
  assert.match(automationSchedulerWorkerTargetActionStatusPanel({
    actionStatus: "reviewed",
    actionResult: { target: { targetId: "target_1", status: "enabled" } }
  }), /Worker target 已记录为 已复核：target_1/);

  const workerTargetRowsHtml = automationSchedulerWorkerTargetRows({
    status: "ready",
    data: {
      targets: [
        {
          targetId: "target_1",
          status: "proposed",
          target: { subject: "physics", horizon: "daily_plan", targetNodeIds: ["node_1", "node_2"] },
          policy: { productionSchedulingAllowed: false }
        },
        {
          targetId: "target_2",
          status: "archived",
          readiness: { productionSchedulingAllowed: true }
        }
      ]
    }
  });
  assert.match(workerTargetRowsHtml, /data-automation-scheduler-worker-target-id="target_1"/);
  assert.match(workerTargetRowsHtml, /nodes node_1 · node_2/);
  assert.match(workerTargetRowsHtml, /productionSchedulingAllowed=false/);
  assert.match(workerTargetRowsHtml, /data-automation-scheduler-worker-target-status="enabled"/);
  assert.match(workerTargetRowsHtml, /productionSchedulingAllowed=true/);
  assert.match(automationSchedulerWorkerTargetRows({ status: "failed", error: "target_failed" }), /target_failed/);

  const workerTargetPanelHtml = automationSchedulerWorkerTargetPanel({}, {
    automationSchedulerWorkerTargets: {
      status: "ready",
      data: {
        targets: [
          { targetId: "target_1", status: "proposed" },
          { targetId: "target_2", status: "enabled" },
          { targetId: "target_3", status: "disabled" },
          { targetId: "target_4", status: "archived" }
        ]
      },
      actionStatus: "reviewed",
      actionResult: { target: { targetId: "target_2", status: "enabled" } }
    }
  });
  assert.match(workerTargetPanelHtml, /data-automation-scheduler-worker-target-panel/);
  assert.match(workerTargetPanelHtml, /<small>待复核<\/small><strong>1<\/strong>/);
  assert.match(workerTargetPanelHtml, /<small>已复核<\/small><strong>1<\/strong>/);
  assert.match(workerTargetPanelHtml, /<small>停用\/归档<\/small><strong>2<\/strong>/);
  assert.match(workerTargetPanelHtml, /data-automation-scheduler-worker-target-action-status="reviewed"/);
});

test("frontend ESM secondary readbacks preserve disclosure grouping and renderer injection", () => {
  const disclosureHtml = cardGenerationDisclosure({
    key: "structured-preview",
    title: "结构化输入",
    subtitle: "Owner audit summary",
    status: "摘要",
    body: "<pre data-structured-preview>{}</pre>",
    open: true
  });
  assert.match(disclosureHtml, /data-card-generation-disclosure="structured-preview" open/);
  assert.match(disclosureHtml, /<strong>结构化输入<\/strong>/);
  assert.match(disclosureHtml, /Owner audit summary/);
  assert.match(disclosureHtml, /<em>摘要<\/em>/);
  assert.match(disclosureHtml, /data-structured-preview/);

  const calls = [];
  const renderers = {
    learningProfilePanel: () => {
      calls.push("profile");
      return "<div data-injected-profile></div>";
    },
    profileFeedbackPanel: () => {
      calls.push("feedback");
      return "<div data-injected-profile-feedback></div>";
    },
    referenceChainPanel: (_context, _state, workspaceId) => {
      calls.push(`reference:${workspaceId}`);
      return `<div data-injected-reference="${workspaceId}"></div>`;
    },
    ownerAuditPanel: () => "<div data-injected-owner-audit></div>",
    cycleDrilldownPanel: () => "<div data-injected-cycle-drilldown></div>",
    ownerAuditReviewPanel: () => "<div data-injected-owner-review></div>",
    automationClosedLoopActionPlanPanel: () => {
      calls.push("automation-plan");
      return "<div data-injected-automation-plan></div>";
    },
    operatingLoopPanel: () => "<div data-injected-operating-loop></div>",
    stageAssessmentPanel: () => {
      calls.push("stage");
      return "<div data-injected-stage-assessment></div>";
    },
    automationCycleClosurePanel: () => "<div data-injected-cycle-closure></div>",
    automationReviewAdvancementPanel: () => "<div data-injected-review-advancement></div>",
    automationProposalPanel: () => "<div data-injected-proposal></div>",
    automationDigestPanel: () => "<div data-injected-digest></div>",
    automationFailurePolicyPanel: () => "<div data-injected-failure-policy></div>",
    automationActionHandoffPanel: () => "<div data-injected-action-handoff></div>",
    automationSchedulerExecutionPanel: () => "<div data-injected-scheduler-execution></div>",
    automationSchedulerRunPanel: () => "<div data-injected-scheduler-run></div>",
    automationSchedulerWorkerTargetPanel: () => "<div data-injected-worker-target></div>",
    releaseWorkbenchPanel: () => {
      calls.push("release");
      return "<div data-injected-release-workbench></div>";
    }
  };
  const html = cardGenerationSecondaryReadbacks({
    profileFeedback: { status: "ready_for_next_plan" },
    automationClosedLoopActionPlan: { status: "ready" },
    releaseWorkbench: { status: "blocked" }
  }, {}, {
    workspaceId: "weixin_fanfan",
    renderers
  });

  assert.match(html, /data-card-generation-secondary-readbacks/);
  assert.match(html, /data-card-generation-disclosure="profile"/);
  assert.match(html, /data-card-generation-disclosure="automation"/);
  assert.match(html, /data-card-generation-disclosure="release"/);
  assert.match(html, /画像与证据/);
  assert.match(html, /闭环与自动化/);
  assert.match(html, /发布与审计/);
  assert.match(html, /<em>可进入下一轮<\/em>/);
  assert.match(html, /data-injected-reference="weixin_fanfan"/);
  assert.match(html, /data-injected-stage-assessment/);
  assert.match(html, /data-injected-release-workbench/);
  assert.ok(html.indexOf("data-injected-profile") < html.indexOf("data-injected-profile-feedback"));
  assert.ok(html.indexOf("data-injected-automation-plan") < html.indexOf("data-injected-stage-assessment"));
  assert.deepEqual(calls, ["profile", "feedback", "reference:weixin_fanfan", "automation-plan", "stage", "release"]);

  const defaultAutomationHtml = cardGenerationSecondaryReadbacks({}, {
    automationClosedLoopActionPlan: {
      status: "ready_for_cycle_closure",
      data: { nextAction: { key: "prepare_cycle_closure" } }
    },
    automationCycleClosure: {
      actionResult: { summary: { proposalId: "proposal_1" } }
    },
    automationReviewAdvancement: {
      actionResult: { summary: { handoffId: "handoff_1" } }
    },
    automationProposals: {
      data: { proposals: [{ proposalId: "proposal_1", status: "proposed" }] }
    },
    automationDigests: {
      data: { digests: [{ digestId: "digest_1", status: "pending" }] }
    },
    automationFailurePolicies: {
      data: { policies: [{ policyId: "policy_1", status: "draft" }] }
    },
    automationActionHandoffs: {
      data: { handoffs: [{ handoffId: "handoff_1", digestId: "digest_1", deliveryStatus: "pending_delivery" }] }
    },
    automationSchedulerExecutions: {
      data: { executions: [{ executionId: "execution_1", status: "blocked" }] }
    },
    automationSchedulerRuns: {
      data: { runs: [{ runId: "run_1", status: "blocked" }] }
    },
    automationSchedulerWorkerTargets: {
      data: { targets: [{ targetId: "target_1", status: "proposed" }] }
    }
  }, {
    renderers: {
      learningProfilePanel: () => "",
      profileFeedbackPanel: () => "",
      referenceChainPanel: () => "",
      ownerAuditPanel: () => "",
      cycleDrilldownPanel: () => "",
      ownerAuditReviewPanel: () => "",
      stageAssessmentPanel: () => "",
      releaseWorkbenchPanel: () => ""
    }
  });
  assert.match(defaultAutomationHtml, /data-automation-closed-loop-action-plan-panel/);
  assert.match(defaultAutomationHtml, /data-automation-cycle-closure-panel/);
  assert.match(defaultAutomationHtml, /data-automation-review-advancement-panel/);
  assert.match(defaultAutomationHtml, /data-automation-proposal-panel/);
  assert.match(defaultAutomationHtml, /data-automation-digest-panel/);
  assert.match(defaultAutomationHtml, /data-automation-failure-policy-panel/);
  assert.match(defaultAutomationHtml, /data-automation-action-handoff-panel/);
  assert.match(defaultAutomationHtml, /data-automation-scheduler-execution-panel/);
  assert.match(defaultAutomationHtml, /data-automation-scheduler-run-panel/);
  assert.match(defaultAutomationHtml, /data-automation-scheduler-worker-target-panel/);
});

test("frontend ESM profile helpers preserve recommendation and lifecycle markup", () => {
  assert.match(profileItemRows([], "暂无轨迹"), /learning-card-generation-profile-empty/);
  assert.match(profileItemRows([{ nodeId: "kg_main_idea", summary: "Needs evidence", score: 42 }]), /<em>42<\/em>/);

  const context = {
    learningProfile: {
      summary: { weaknessCount: 2, strengthCount: 1, recentExperienceSignalCount: 3 },
      weaknesses: [{ nodeId: "kg_english_evidence_answering", summary: "Needs direct evidence", score: 41 }],
      recentTrajectory: [{ targetNodeId: "kg_english_evidence_answering", strategy: "repair", reason: "Latest trajectory asks for one evidence repair card" }],
      nextCardStrategy: {
        strategy: "repair",
        cardRole: "teaching",
        difficultyBand: "repair",
        targetNodeIds: ["kg_english_evidence_answering"],
        reason: "Latest trajectory asks for one evidence repair card"
      }
    },
    nextCardRecommendation: {
      recommendationMode: "trajectory",
      strategy: "repair",
      cardRole: "teaching",
      difficultyBand: "repair",
      targetNodeIds: ["kg_english_evidence_answering"],
      reason: "Latest trajectory asks for one evidence repair card"
    },
    recommendationLifecycle: [
      { trajectoryId: "traj_accepted", status: "accepted", generatedTaskCardId: "ltask_generated_1", targetNodeIds: ["kg_english_evidence_answering"] },
      { trajectoryId: "traj_superseded", status: "superseded", supersededByTrajectoryId: "traj_new", strategy: "stabilize" },
      { trajectoryId: "traj_pending", status: "pending", sourceTaskCardId: "ltask_source_pending", sourceEvaluationId: "leval_source_pending", reason: "Owner review pending" }
    ]
  };
  const state = {
    recommendationLifecycle: {
      actionStatus: "reviewed",
      actionResult: { recommendation: { status: "skipped" } }
    }
  };

  const lifecycleHtml = recommendationLifecyclePanel(context, state);
  assert.match(lifecycleHtml, /推荐闭环/);
  assert.match(lifecycleHtml, /已生成/);
  assert.match(lifecycleHtml, /已替换/);
  assert.match(lifecycleHtml, /待生成/);
  assert.match(lifecycleHtml, /data-recommendation-lifecycle-review/);
  assert.match(lifecycleHtml, /data-recommendation-lifecycle-status="skipped"/);
  assert.match(lifecycleHtml, /data-recommendation-lifecycle-status="expired"/);
  assert.match(lifecycleHtml, /data-recommendation-lifecycle-trajectory-id="traj_pending"/);
  assert.match(lifecycleHtml, /推荐已记录为 已跳过/);

  const recommendationHtml = nextCardRecommendationPanel(context);
  assert.match(recommendationHtml, /data-recommendation-mode="trajectory"/);
  assert.match(recommendationHtml, /评价轨迹/);
  assert.match(recommendationHtml, /kg_english_evidence_answering/);
  assert.match(recommendationHtml, /Latest trajectory asks for one evidence repair card/);

  const profileHtml = learningProfilePanel(context, state);
  assert.match(profileHtml, /data-card-generation-profile/);
  assert.match(profileHtml, /学习画像/);
  assert.match(profileHtml, /需要加强/);
  assert.match(profileHtml, /近期轨迹/);
  assert.match(profileHtml, /推荐闭环/);
  assert.match(profileHtml, /下一张建议/);
});

test("frontend ESM profile feedback helpers preserve completed-cycle readback markup", () => {
  assert.equal(profileFeedbackStatusText("ready_for_next_plan"), "可进入下一轮");
  assert.equal(profileFeedbackStatusText("missing"), "无完成周期");
  assert.equal(profileFeedbackNextActionText("draft_daily_plan"), "起草下一张");
  assert.equal(profileFeedbackNextActionText("publish_selected_plan_item"), "发布已选计划");
  assert.deepEqual(cycleSelectionPayload({
    selectors: { taskCardId: "task_1", evaluationId: "eval_1", targetNodeIds: ["node_1", "node_1", "node_2"] }
  }), {
    plan_draft_id: "",
    task_card_id: "task_1",
    evaluation_id: "eval_1",
    profile_delta_id: "",
    evidence_id: "",
    correction_id: "",
    source_id: "eval_1",
    target_node_ids: ["node_1", "node_2"]
  });

  const data = {
    ok: true,
    status: "ready_for_next_plan",
    selectedCycle: { cycleId: "cycle_1" },
    summary: {
      readyForNextPlan: true,
      evidenceCount: 4,
      evidenceSourceTypes: ["evaluation", "reflection", "owner_review", "extra"],
      profileDeltaCount: 2,
      latestProfileDeltaId: "delta_1",
      totalRewardCoins: 7,
      rewardSettlementCount: 1,
      nextAction: "draft_daily_plan",
      recommendationStrategy: "repair",
      profileEvidenceCount: 9,
      profileWeaknessCount: 3
    },
    ownerReviewSignal: {
      latestDecision: "accepted",
      reviewCount: 2
    }
  };

  const rowsHtml = profileFeedbackSummaryRows(data);
  assert.match(rowsHtml, /data-profile-feedback-row="evidence"/);
  assert.match(rowsHtml, /4 条 summary-only evidence/);
  assert.match(rowsHtml, /evaluation · reflection · owner_review/);
  assert.match(rowsHtml, /data-profile-feedback-row="profile_delta"/);
  assert.match(rowsHtml, /delta_1/);
  assert.match(rowsHtml, /data-profile-feedback-row="reward"/);
  assert.match(rowsHtml, /7 coins/);
  assert.match(rowsHtml, /data-profile-feedback-row="owner_review"/);
  assert.match(rowsHtml, /accepted/);

  const panelHtml = profileFeedbackPanel({ profileFeedback: data }, {
    cycleHistory: { selectedCycle: { selectors: { taskCardId: "task_1" } } }
  });
  assert.match(panelHtml, /data-profile-feedback-panel/);
  assert.match(panelHtml, /data-profile-feedback-status="ready_for_next_plan"/);
  assert.match(panelHtml, /画像反馈/);
  assert.match(panelHtml, /本轮练习反馈来自 Growth profile-feedback service/);
  assert.match(panelHtml, /<small>完成周期<\/small><strong>task_1<\/strong>/);
  assert.match(panelHtml, /<small>证据<\/small><strong>4<\/strong>/);
  assert.match(panelHtml, /<small>画像变化<\/small><strong>2<\/strong>/);
  assert.match(panelHtml, /<small>下一步<\/small><strong>起草下一张<\/strong>/);
  assert.match(panelHtml, /已具备进入下一轮计划的 summary-only 证据/);

  const loadingHtml = profileFeedbackPanel({}, { profileFeedback: { status: "loading" } });
  assert.match(loadingHtml, /data-profile-feedback-status="loading"/);
  assert.match(loadingHtml, /data-profile-feedback-refresh disabled/);
  assert.match(loadingHtml, />读取中<\/button>/);

  const failedHtml = profileFeedbackPanel({}, {
    profileFeedback: { status: "failed", error: "profile_feedback_unavailable" }
  });
  assert.match(failedHtml, /data-profile-feedback-status="failed"/);
  assert.match(failedHtml, /profile_feedback_unavailable/);
  assert.match(failedHtml, />读取失败<\/em>/);
});

test("frontend ESM stage assessment helpers preserve status, reasons, actions, and rubric markup", () => {
  assert.equal(stageAssessmentStatusText("checking"), "检查中");
  assert.equal(stageAssessmentStatusText("eligible"), "可激活");
  assert.equal(stageAssessmentStatusText("cooldown"), "冷却中");
  assert.equal(stageAssessmentStatusText("unknown"), "未检查");
  assert.equal(stageAssessmentReasonText({ reason: "enough_recent_practice" }), "近期练习证据足够，可以生成一次阶段测评。");
  assert.equal(stageAssessmentReasonText({ cycle: { activationReason: "stage_assessment_recently_completed" } }), "近期已完成正式测评，暂不需要重复。");
  assert.equal(stageAssessmentControlsReasonText("gateway_not_ready"), "Gateway 尚未准备好，暂不能生成正式测评。");
  assert.equal(stageAssessmentControlsReasonText(""), "阶段测评由 controls read model 决定是否开放。");

  const controls = {
    actions: [
      { key: "refresh_stage_assessment", enabled: true },
      { key: "activate_stage_assessment", enabled: false, disabledReason: "stage_assessment_cooldown_active" }
    ],
    rubricPolicy: { policyId: "controls_policy" }
  };
  assert.deepEqual(stageAssessmentAction(controls, "activate_stage_assessment"), controls.actions[1]);
  assert.equal(stageAssessmentAction(controls, "missing"), null);
  assert.equal(stageAssessmentRubricPolicy({ controls })?.policyId, "controls_policy");
  assert.equal(stageAssessmentRubricPolicy({
    context: {
      rubricCatalog: [
        { policyId: "practice_policy", cardRole: "practice" },
        { policyId: "catalog_stage_policy", cardRole: "stage_assessment" }
      ]
    }
  })?.policyId, "catalog_stage_policy");

  const rubricHtml = stageAssessmentRubricPanel({
    policyId: "stage_policy_v1",
    rubricDimensions: [
      { dimensionId: "accuracy", label: "准确性" },
      { dimensionId: "reflection", label: "反思" }
    ],
    evidenceKeys: ["recentTrajectory", "masterySummary"],
    assessmentPolicy: {
      completionPolicy: "formal_assessment",
      evaluationAttempts: 2,
      reflectionAttempts: 1,
      expectedDurationMinutes: { min: 25, max: 30 }
    }
  });
  assert.match(rubricHtml, /data-stage-assessment-rubric-policy-id="stage_policy_v1"/);
  assert.match(rubricHtml, /准确性/);
  assert.match(rubricHtml, /recentTrajectory · masterySummary/);
  assert.match(rubricHtml, /25-30 分钟/);

  const fallbackHtml = stageAssessmentRubricPanel({ policyId: "fallback_policy" });
  assert.match(fallbackHtml, /维度待读取/);
});

test("frontend ESM stage assessment panel preserves activation gating and readback markup", () => {
  const readiness = {
    targetEnabled: true,
    workspaceProvisioned: true,
    learningGraphReady: true,
    historySummaryReady: true,
    gatewayConfigured: true
  };
  const plan = {
    targetNodeId: "kg_science_observation",
    targetNodeIds: ["kg_science_observation", "kg_science_fair_test"]
  };
  const context = {
    stageCheckpointControls: {
      ok: true,
      summary: {
        status: "eligible",
        recentTrajectoryCount: 5,
        highPressureSignalCount: 0
      },
      readiness: {
        activationState: "eligible",
        reason: "enough_recent_practice",
        evidence: {
          recentTrajectoryCount: 5,
          highPressureSignalCount: 0
        }
      },
      actions: [{ key: "activate_stage_assessment", enabled: true }],
      rubricPolicy: {
        policyId: "stage_policy_v1",
        dimensionIds: ["accuracy", "reflection"],
        assessmentPolicy: { expectedDurationMinutes: { min: 20, max: 25 } }
      }
    }
  };

  const html = stageAssessmentPanel({ context, readiness, plan });
  assert.match(html, /data-stage-assessment-panel/);
  assert.match(html, /data-stage-assessment-status="eligible"/);
  assert.match(html, /Owner 可以显式生成一次正式阶段测评。/);
  assert.match(html, /data-stage-checkpoint-activate-enabled="true"/);
  assert.match(html, /data-stage-assessment-rubric-policy-id="stage_policy_v1"/);
  assert.match(html, /<small>覆盖节点<\/small><strong>2<\/strong>/);
  assert.match(html, /<small>近期轨迹<\/small><strong>5<\/strong>/);
  assert.match(html, /data-stage-assessment-check >检查条件<\/button>/);
  assert.match(html, /data-stage-assessment-activate  data-stage-assessment-blocked-reason="">生成阶段测评<\/button>/);

  const cooldownHtml = stageAssessmentPanel({
    context: {
      stageCheckpointControls: {
        ok: true,
        summary: { status: "cooldown" },
        readiness: {
          activationState: "cooldown",
          reason: "stage_assessment_cooldown_active",
          cooldownUntil: "2026-07-12T00:00:00.000Z"
        },
        actions: [{ key: "activate_stage_assessment", enabled: false, disabledReason: "stage_assessment_cooldown_active" }]
      }
    },
    readiness,
    plan
  });
  assert.match(cooldownHtml, /data-stage-assessment-status="cooldown"/);
  assert.match(cooldownHtml, /冷却至 2026-07-12/);
  assert.match(cooldownHtml, /data-stage-checkpoint-activate-enabled="false"/);
  assert.match(cooldownHtml, /data-stage-assessment-blocked-reason="同一能力簇仍在冷却期。"/);
  assert.match(cooldownHtml, /data-stage-assessment-activate disabled/);

  const failedHtml = stageAssessmentPanel({
    context: { stageCheckpointControls: { ok: false, error: "controls_failed" } },
    state: { stageAssessment: { controlsStatus: "failed", controlsError: "controls_failed", error: "stage_failed" } },
    readiness,
    plan
  });
  assert.match(failedHtml, /data-stage-checkpoint-controls-status="failed"/);
  assert.match(failedHtml, /controls_failed/);
  assert.match(failedHtml, /data-stage-assessment-error/);
  assert.match(failedHtml, /stage_failed/);
});

test("frontend ESM release workbench helpers preserve status and action markup", () => {
  assert.equal(releaseWorkbenchStatusText("ready_for_release_review"), "可记录");
  assert.equal(releaseWorkbenchStatusText("blocked"), "有缺口");
  assert.equal(releaseWorkbenchActionText("release_evidence_collection"), "收集证据");
  assert.equal(releaseWorkbenchActionText("runtime_enablement"), "记录启用");
  assert.equal(releaseWorkbenchSupportedEndpoint("release_decision"), true);
  assert.equal(releaseWorkbenchSupportedEndpoint("runtime_config"), false);

  const actionRowsHtml = releaseWorkbenchActionRows([
    { key: "evidence_1", endpointKey: "release_evidence", label: "Owner evidence", source: "release readiness" },
    { key: "unsupported_1", endpointKey: "runtime_config", label: "Runtime config", externalActionRequired: true }
  ]);
  assert.match(actionRowsHtml, /data-release-workbench-endpoint="release_evidence"/);
  assert.match(actionRowsHtml, /data-release-workbench-action-key="evidence_1"/);
  assert.match(actionRowsHtml, />记录证据<\/button>/);
  assert.match(actionRowsHtml, /data-release-workbench-endpoint="runtime_config"/);
  assert.match(actionRowsHtml, /data-release-workbench-blocked-reason=/);
  assert.match(actionRowsHtml, /disabled>查看<\/button>/);

  const busyRowsHtml = releaseWorkbenchActionRows([
    { key: "approval_1", endpointKey: "release_approval", label: "Owner approval" }
  ], { actionStatus: "recording" });
  assert.match(busyRowsHtml, /disabled>记录中<\/button>/);
  assert.match(busyRowsHtml, /正在记录上一条 release action/);
});

test("frontend ESM release workbench helpers preserve package and audit markup", () => {
  assert.equal(releasePackageCandidateFromHolder({ packageResult: { release_package: { package_id: "pkg_1" } } }).package_id, "pkg_1");

  const packageRowWithoutCandidate = releaseWorkbenchActionRows([
    { key: "package_1", endpointKey: "release_package", label: "Build release package" }
  ]);
  assert.match(packageRowWithoutCandidate, /data-release-package-build/);
  assert.match(packageRowWithoutCandidate, /data-release-workbench-blocked-reason=/);
  assert.match(packageRowWithoutCandidate, /disabled>记录包<\/button>/);

  const packageRowWithCandidate = releaseWorkbenchActionRows([
    { key: "package_1", endpointKey: "release_package", label: "Build release package" }
  ], { packageCandidate: { packageId: "pkg_1", status: "ready", stepCount: 3 } });
  assert.doesNotMatch(packageRowWithCandidate, /data-release-workbench-blocked-reason=/);
  assert.match(packageRowWithCandidate, />记录包<\/button>/);

  const packageStatusHtml = releasePackageStatusPanel({
    packageStatus: "ready",
    packageCandidate: { packageId: "pkg_1", status: "ready", stepCount: 3 }
  });
  assert.match(packageStatusHtml, /data-release-package-status="ready"/);
  assert.match(packageStatusHtml, /包候选已构建：pkg_1 · ready · 3 steps/);

  const actionStatusHtml = releaseWorkbenchActionStatusPanel({
    actionStatus: "recorded",
    actionResult: { endpointKey: "release_evidence", actionRecord: { recordId: "rec_1" } }
  });
  assert.match(actionStatusHtml, /data-release-workbench-action-status="recorded"/);
  assert.match(actionStatusHtml, /已写入 release_evidence 记录：rec_1/);

  const auditRowsHtml = releaseWorkbenchActionAuditRows([
    { actionAuditId: "audit_1", endpointKey: "release_evidence", actionKey: "evidence_1", recordId: "rec_1", recordStatus: "recorded", status: "listed" }
  ]);
  assert.match(auditRowsHtml, /data-release-workbench-action-audit-id="audit_1"/);
  assert.match(auditRowsHtml, /release_evidence · evidence_1 · record:rec_1 · recorded/);
  assert.match(auditRowsHtml, />已读取<\/em>/);

  const auditsPanelHtml = releaseWorkbenchActionAuditsPanel({}, {
    releaseWorkbenchActionAudits: {
      data: {
        status: "listed",
        actionAuditCount: 1,
        actionAudits: [{ actionAuditId: "audit_1", status: "recorded" }]
      }
    }
  });
  assert.match(auditsPanelHtml, /data-release-workbench-action-audits-panel/);
  assert.match(auditsPanelHtml, /1 条 summary-only action audit/);
  assert.match(auditsPanelHtml, /data-release-workbench-action-audits-refresh/);
});

test("frontend ESM release workbench panel preserves summary and injected subpanel slots", () => {
  const context = {
    releaseWorkbench: {
      releaseWorkbench: {
        status: "blocked",
        ownerActionCount: 2,
        ownerActions: [
          { key: "evidence_1", endpointKey: "release_evidence", label: "Record evidence", source: "release readiness" },
          { key: "approval_1", endpointKey: "release_approval", label: "Record approval" }
        ],
        missingEvidenceKeys: ["evidence_key_1", "evidence_key_2"],
        missingApprovalKeys: ["approval_key_1"],
        missingRecordKinds: ["activation"]
      }
    },
    releaseWorkbenchActionAudits: {
      status: "listed",
      actionAuditCount: 1,
      actionAudits: [{ actionAuditId: "audit_1", status: "listed" }]
    }
  };
  const html = releaseWorkbenchPanel(context, {
    releaseWorkbench: {
      actionStatus: "recorded",
      actionResult: { endpointKey: "release_evidence", actionRecord: { recordId: "rec_1" } },
      packageStatus: "blocked",
      packageError: "missing package evidence"
    }
  }, {
    renderers: {
      releaseArtifactTemplatePanel: () => "<div data-injected-release-artifact-template></div>",
      releaseEvidenceLedgerPanel: () => "<div data-injected-release-evidence-ledger></div>"
    }
  });

  assert.match(html, /data-release-workbench-panel/);
  assert.match(html, /data-release-workbench-status="blocked"/);
  assert.match(html, /发布工作台/);
  assert.match(html, /<small>待处理<\/small><strong>2<\/strong>/);
  assert.match(html, /<small>证据缺口<\/small><strong>2<\/strong>/);
  assert.match(html, /<small>审批缺口<\/small><strong>1<\/strong>/);
  assert.match(html, /<small>记录缺口<\/small><strong>1<\/strong>/);
  assert.match(html, /data-injected-release-artifact-template/);
  assert.match(html, /data-injected-release-evidence-ledger/);
  assert.match(html, /data-release-workbench-action-audits-panel/);
  assert.match(html, /data-release-workbench-action-key="evidence_1"/);
  assert.match(html, /data-release-package-status="blocked"/);
  assert.match(html, /data-release-workbench-action-status="recorded"/);
});

test("frontend ESM release artifact template helpers preserve evidence checklist markup", () => {
  assert.equal(releaseArtifactTemplateStatusText("artifact_manifest_required"), "需补证据");
  assert.equal(releaseArtifactTemplateStatusText("release_evidence_ready_for_review"), "可复核");
  assert.equal(releaseArtifactTemplateStatusText("blocked"), "有缺口");

  const data = releaseArtifactTemplateData({
    releaseArtifactTemplate: {
      releaseArtifactTemplate: { status: "release_evidence_actions_required" }
    }
  });
  assert.equal(data.template.status, "release_evidence_actions_required");

  const slotsHtml = releaseArtifactSlotRows([
    { taskId: "task_1", uiGate: "owner_daily_ui", source: "visual harness", required: true },
    { taskId: "task_2", evidenceKey: "optional_evidence", manifestField: "field_1", required: false }
  ]);
  assert.match(slotsHtml, /data-release-artifact-task-id="task_1"/);
  assert.match(slotsHtml, /owner_daily_ui/);
  assert.match(slotsHtml, />必需<\/em>/);
  assert.match(slotsHtml, />可选<\/em>/);

  const checklistHtml = releaseChecklistRows({
    items: [{ key: "check_1", label: "Visual proof", commandName: "check-visual", status: "missing" }]
  });
  assert.match(checklistHtml, /data-release-artifact-checklist-key="check_1"/);
  assert.match(checklistHtml, /Visual proof/);
  assert.match(checklistHtml, />missing<\/em>/);

  const actionPlanHtml = releaseActionPlanRows({
    actions: [
      { key: "collect_1", label: "Collect evidence", route: { path: "/api/release/evidence" }, readyToSubmit: true },
      { key: "collect_2", action: "Wait for review", status: "blocked" }
    ]
  });
  assert.match(actionPlanHtml, /data-release-artifact-action-key="collect_1"/);
  assert.match(actionPlanHtml, /data-release-artifact-action-ready="true"/);
  assert.match(actionPlanHtml, />可提交<\/em>/);
  assert.match(actionPlanHtml, /data-release-artifact-action-ready="false"/);
  assert.match(actionPlanHtml, />待前置<\/em>/);
});

test("frontend ESM release artifact template panel preserves summary counters and readback", () => {
  const html = releaseArtifactTemplatePanel({
    releaseArtifactTemplate: {
      releaseArtifactTemplate: {
        status: "artifact_manifest_required",
        artifactSlotCount: 2,
        artifactSlots: [{ taskId: "task_1", uiGate: "owner_daily_ui", source: "visual harness" }],
        releaseEvidenceChecklist: {
          itemCount: 1,
          items: [{ key: "check_1", label: "Visual proof", commandName: "check-visual", status: "missing" }]
        },
        releaseEvidenceActionPlan: {
          readyPhase: "collecting",
          submittableActionCount: 1,
          nextSubmittableAction: { label: "Collect visual proof" },
          actions: [{ key: "collect_1", label: "Collect evidence", route: { path: "/api/release/evidence" }, readyToSubmit: true }]
        },
        readyForManifestInput: false,
        manifestSchemaVersion: "artifact.v1"
      }
    }
  });

  assert.match(html, /data-release-artifact-template-panel/);
  assert.match(html, /data-release-artifact-template-status="artifact_manifest_required"/);
  assert.match(html, /Collect visual proof/);
  assert.match(html, /<small>Artifact slots<\/small><strong>2<\/strong>/);
  assert.match(html, /<small>Checklist<\/small><strong>1<\/strong>/);
  assert.match(html, /<small>可提交<\/small><strong>1<\/strong>/);
  assert.match(html, /<small>阶段<\/small><strong>collecting<\/strong>/);
  assert.match(html, /data-release-artifact-slot/);
  assert.match(html, /data-release-artifact-checklist-item/);
  assert.match(html, /data-release-artifact-action-plan/);
  assert.match(html, /Manifest 待中心视觉\/UI artifact · artifact.v1/);
  assert.match(html, />需补证据<\/em>/);
});

test("frontend ESM release status readback helpers preserve nested status and detail rules", () => {
  const readbacks = {
    controls: {
      releaseControls: {
        status: "blocked",
        nextAction: { label: "Review controls" }
      }
    },
    dashboard: {
      dashboard: {
        releaseStatus: "ready",
        reason: "Dashboard ready"
      }
    },
    preflight: {
      releasePreflight: {
        releasePreflightStatus: "pass",
        latestPreflightReportId: "preflight_1"
      }
    },
    runtimeEnablement: {
      runtime_enablement: {
        runtimeEnablementStatus: "recorded",
        blockingReason: "Runtime enablement recorded"
      }
    }
  };

  assert.deepEqual(releaseStatusReadbackDataForKey(readbacks, "controls"), readbacks.controls.releaseControls);
  assert.equal(releaseStatusReadbackStatus(readbacks, "controls"), "blocked");
  assert.equal(releaseStatusReadbackStatus(readbacks, "dashboard"), "ready");
  assert.equal(releaseStatusReadbackStatus(readbacks, "preflight"), "pass");
  assert.equal(releaseStatusReadbackStatus(readbacks, "runtimeEnablement"), "recorded");
  assert.equal(releaseStatusReadbackStatus(readbacks, "closure"), "idle");
  assert.equal(releaseStatusReadbackDetail(readbacks, "controls"), "Review controls");
  assert.equal(releaseStatusReadbackDetail(readbacks, "preflight"), "preflight_1");
  assert.equal(releaseStatusReadbackDetail(readbacks, "runtimeEnablement"), "Runtime enablement recorded");

  const rowsHtml = releaseStatusReadbackRows(readbacks);
  assert.equal((rowsHtml.match(/data-release-status-readback-row/g) || []).length, 9);
  assert.match(rowsHtml, /data-release-status-readback-key="controls"/);
  assert.match(rowsHtml, /Review controls/);
  assert.match(rowsHtml, />有缺口<\/em>/);
  assert.match(rowsHtml, /data-release-status-readback-key="runtimeEnablement"/);
  assert.match(rowsHtml, />已记录<\/em>/);
});

test("frontend ESM release readback submodules preserve controls, dashboard, inventory, and readiness selectors", () => {
  const readbacks = {
    controls: { releaseControls: { status: "blocked", nextAction: { key: "fix_controls" } } },
    dashboard: { releaseDashboard: { status: "ready", nextAction: { key: "dashboard_ready" } } },
    inventory: { releaseInventory: { status: "ready", latestCollectionRunId: "collection_1" } },
    review: { releaseReview: { status: "blocked", nextAction: { key: "owner_review" } } },
    authorization: { authorization: { releaseAuthorizationStatus: "pending" } },
    closure: { releaseClosure: { status: "idle" } },
    preflight: { preflight: { releasePreflightStatus: "pass", latestPreflightReportId: "preflight_1" } },
    activation: { releaseActivation: { releaseActivationStatus: "blocked" } },
    runtimeEnablement: { runtime_enablement: { runtimeEnablementStatus: "recorded" } }
  };

  assert.deepEqual(releaseControlsReadbackRow, ["controls", "Controls"]);
  assert.deepEqual(releaseDashboardReadbackRow, ["dashboard", "Dashboard"]);
  assert.deepEqual(releaseInventoryReadbackRow, ["inventory", "Inventory"]);
  assert.equal(releaseReadinessReadbackRows.length, 6);
  assert.equal(releaseReadinessReadbackRows.some(([key]) => key === "runtimeEnablement"), true);
  assert.equal(releaseControlsReadbackData(readbacks).nextAction.key, "fix_controls");
  assert.equal(releaseDashboardReadbackData(readbacks).nextAction.key, "dashboard_ready");
  assert.equal(releaseInventoryReadbackData(readbacks).latestCollectionRunId, "collection_1");
  assert.equal(releaseReadinessReadbackData(readbacks, "review").nextAction.key, "owner_review");
  assert.equal(releaseReadinessReadbackData(readbacks, "authorization").releaseAuthorizationStatus, "pending");
  assert.equal(releaseStatusReadbackStatus(readbacks, "preflight"), "pass");
  assert.equal(releaseStatusReadbackDetail(readbacks, "inventory"), "collection_1");
});

test("frontend ESM release status readbacks panel preserves refresh state and readback rows", () => {
  const html = releaseStatusReadbacksPanel({
    releaseStatusReadbacks: {
      status: "ready",
      controls: { releaseControls: { status: "ready", nextAction: { key: "controls_ok" } } },
      activation: { releaseActivation: { releaseActivationStatus: "blocked", blockingReason: "Needs Owner activation" } }
    }
  });

  assert.match(html, /data-release-status-readbacks-panel/);
  assert.match(html, /data-release-status-readbacks-status="ready"/);
  assert.match(html, /发布总览/);
  assert.match(html, /只读汇总 release controls/);
  assert.match(html, /data-release-status-readbacks-refresh/);
  assert.match(html, /controls_ok/);
  assert.match(html, /Needs Owner activation/);

  const loadingHtml = releaseStatusReadbacksPanel({}, { releaseStatusReadbacks: { status: "loading" } });
  assert.match(loadingHtml, /data-release-status-readbacks-status="loading"/);
  assert.match(loadingHtml, /data-release-status-readbacks-refresh disabled/);
  assert.match(loadingHtml, />刷新中<\/button>/);

  const failedHtml = releaseStatusReadbacksPanel({}, {
    releaseStatusReadbacks: {
      status: "failed",
      error: "release_status_readbacks_unavailable"
    }
  });
  assert.match(failedHtml, /data-release-status-readbacks-status="failed"/);
  assert.match(failedHtml, /release_status_readbacks_unavailable/);
});

test("frontend ESM release evidence ledger helpers preserve evidence and approval rows", () => {
  assert.equal(releaseEvidenceLedgerStatusText("ready"), "已读取");
  assert.equal(releaseEvidenceLedgerStatusText("pass"), "通过");
  assert.equal(releaseEvidenceLedgerStatusText("approved"), "已批准");
  assert.equal(releaseEvidenceLedgerStatusText("revoked"), "已撤销");
  assert.equal(releaseEvidenceLedgerStatusText("blocked"), "有缺口");

  const data = {
    releaseEvidence: {
      count: 5,
      evidence: [
        { evidenceRecordId: "evidence_1", evidenceKey: "visual_smoke", checkKey: "ui_ready", note: "Visual pass", observedAt: "2026-07-06T01:00:00Z", status: "pass" },
        { evidenceRecordId: "evidence_2", evidenceKey: "owner_daily", status: "blocked" },
        { evidenceRecordId: "evidence_3", evidenceKey: "extra_1", status: "pass" },
        { evidenceRecordId: "evidence_4", evidenceKey: "extra_2", status: "pass" },
        { evidenceRecordId: "evidence_5", evidenceKey: "extra_3", status: "pass" }
      ]
    },
    releaseApprovals: {
      count: 2,
      approvals: [
        { approvalId: "approval_1", approvalKey: "owner_release", approvedBy: "owner", note: "Approved", approvedAt: "2026-07-06T02:00:00Z", status: "approved" },
        { approvalId: "approval_2", configGate: "runtime_enablement", status: "expired" }
      ]
    }
  };

  const normalized = releaseEvidenceLedgerData(data);
  assert.equal(normalized.evidenceRows.length, 5);
  assert.equal(normalized.approvalRows.length, 2);

  const rowsHtml = releaseEvidenceLedgerRows(data);
  assert.equal((rowsHtml.match(/data-release-evidence-ledger-kind="evidence"/g) || []).length, 4);
  assert.equal((rowsHtml.match(/data-release-evidence-ledger-kind="approval"/g) || []).length, 2);
  assert.match(rowsHtml, /data-release-evidence-ledger-id="evidence_1"/);
  assert.match(rowsHtml, /visual_smoke/);
  assert.match(rowsHtml, /ui_ready · Visual pass · 2026-07-06T01:00:00Z/);
  assert.match(rowsHtml, />通过<\/em>/);
  assert.match(rowsHtml, /data-release-evidence-ledger-id="approval_1"/);
  assert.match(rowsHtml, /owner · Approved · 2026-07-06T02:00:00Z/);
  assert.match(rowsHtml, />已批准<\/em>/);
  assert.doesNotMatch(rowsHtml, /extra_3/);

  assert.match(releaseEvidenceLedgerRows({}), /暂无发布证据或审批记录/);
});

test("frontend ESM release evidence submodules preserve collection and approval ledger rows", () => {
  const data = {
    releaseEvidence: {
      evidence: [
        { evidenceRecordId: "evidence_1", evidenceKey: "visual_smoke", checkKey: "ui_ready", note: "Visual pass", status: "pass" },
        { evidenceRecordId: "evidence_2", evidenceKey: "owner_daily", status: "blocked" }
      ]
    },
    releaseApprovals: {
      approvals: [
        { approvalId: "approval_1", approvalKey: "owner_release", approvedBy: "owner", note: "Approved", status: "approved" }
      ]
    }
  };

  assert.equal(releaseEvidenceCollectionData(data).evidenceRows.length, 2);
  assert.equal(releaseApprovalLedgerData(data).approvalRows.length, 1);
  const evidenceRowsHtml = releaseEvidenceCollectionRows(data, { statusText: releaseEvidenceLedgerStatusText }).join("");
  const approvalRowsHtml = releaseApprovalLedgerRows(data, { statusText: releaseEvidenceLedgerStatusText }).join("");
  assert.match(evidenceRowsHtml, /data-release-evidence-ledger-kind="evidence"/);
  assert.match(evidenceRowsHtml, /visual_smoke/);
  assert.match(evidenceRowsHtml, />通过<\/em>/);
  assert.match(approvalRowsHtml, /data-release-evidence-ledger-kind="approval"/);
  assert.match(approvalRowsHtml, /owner_release/);
  assert.match(approvalRowsHtml, />已批准<\/em>/);
});

test("frontend ESM release evidence ledger panel preserves counters and refresh states", () => {
  const html = releaseEvidenceLedgerPanel({
    releaseEvidenceLedger: {
      status: "ready",
      evidenceCount: 6,
      approvalCount: 3,
      evidence: [
        { evidenceRecordId: "evidence_1", evidenceKey: "visual_smoke", status: "pass" },
        { evidenceRecordId: "evidence_2", evidenceKey: "owner_daily", status: "blocked" }
      ],
      approvals: [
        { approvalId: "approval_1", approvalKey: "owner_release", status: "approved" },
        { approvalId: "approval_2", approvalKey: "runtime_enablement", status: "revoked" }
      ]
    }
  });

  assert.match(html, /data-release-evidence-ledger-panel/);
  assert.match(html, /data-release-evidence-ledger-status="ready"/);
  assert.match(html, /证据账本/);
  assert.match(html, /只读账本/);
  assert.match(html, /<small>证据<\/small><strong>6<\/strong>/);
  assert.match(html, /<small>通过<\/small><strong>1<\/strong>/);
  assert.match(html, /<small>审批<\/small><strong>3<\/strong>/);
  assert.match(html, /<small>已批<\/small><strong>1<\/strong>/);
  assert.match(html, /data-release-evidence-ledger-refresh/);

  const loadingHtml = releaseEvidenceLedgerPanel({}, { releaseEvidenceLedger: { status: "loading" } });
  assert.match(loadingHtml, /data-release-evidence-ledger-status="loading"/);
  assert.match(loadingHtml, /data-release-evidence-ledger-refresh disabled/);
  assert.match(loadingHtml, />刷新中<\/button>/);

  const failedHtml = releaseEvidenceLedgerPanel({}, {
    releaseEvidenceLedger: {
      status: "failed",
      error: "release_evidence_ledger_unavailable"
    }
  });
  assert.match(failedHtml, /data-release-evidence-ledger-status="failed"/);
  assert.match(failedHtml, /release_evidence_ledger_unavailable/);
});

test("frontend ESM release lifecycle helpers preserve record ids, details, and row limits", () => {
  assert.equal(releaseLifecycleRecordsStatusText("ready"), "已读取");
  assert.equal(releaseLifecycleRecordsStatusText("recording"), "记录中");
  assert.equal(releaseLifecycleRecordsStatusText("blocked"), "已阻塞");
  assert.equal(releaseLifecycleRecordsStatusText("pass"), "可记录");

  const preflightRecord = {
    preflightReportId: "preflight_1",
    releasePreflight: { nextAction: { label: "Owner review preflight" } },
    status: "pass"
  };
  const activationRecord = {
    activationId: "activation_1",
    requestedActivationGates: ["writeful_execution", { key: "background_scheduler" }],
    status: "recorded"
  };
  const runtimeRecord = {
    enablementId: "runtime_1",
    requiredConfigKeys: ["automationWritefulExecutionEnabled", "automationBackgroundSchedulerEnabled"],
    status: "blocked"
  };

  assert.equal(releaseLifecycleRecordId("preflight", preflightRecord), "preflight_1");
  assert.equal(releaseLifecycleRecordId("activation", activationRecord), "activation_1");
  assert.equal(releaseLifecycleRecordId("runtime", runtimeRecord), "runtime_1");
  assert.equal(releaseLifecycleRecordDetail("preflight", preflightRecord), "Owner review preflight");
  assert.equal(releaseLifecycleRecordDetail("activation", activationRecord), "writeful_execution, background_scheduler");
  assert.equal(releaseLifecycleRecordDetail("runtime", runtimeRecord), "automationWritefulExecutionEnabled, automationBackgroundSchedulerEnabled");

  const preflightRowsHtml = releaseLifecycleRecordRows("preflight", [
    preflightRecord,
    { preflightReportId: "preflight_2", collectionRunId: "collection_2", status: "pass" },
    { preflightReportId: "preflight_3", createdAt: "2026-07-06T01:00:00Z", status: "failed" },
    { preflightReportId: "preflight_4", status: "pass" }
  ]);
  assert.equal((preflightRowsHtml.match(/data-release-lifecycle-record-kind="preflight"/g) || []).length, 3);
  assert.match(preflightRowsHtml, /data-release-lifecycle-record-id="preflight_1"/);
  assert.match(preflightRowsHtml, /Owner review preflight/);
  assert.doesNotMatch(preflightRowsHtml, /preflight_4/);

  const activationRowsHtml = releaseLifecycleRecordRows("activation", [activationRecord]);
  assert.match(activationRowsHtml, /writeful_execution, background_scheduler/);
  assert.match(activationRowsHtml, />已记录<\/em>/);

  const runtimeRowsHtml = releaseLifecycleRecordRows("runtime", [runtimeRecord]);
  assert.match(runtimeRowsHtml, /automationWritefulExecutionEnabled, automationBackgroundSchedulerEnabled/);
  assert.match(runtimeRowsHtml, />有缺口<\/em>/);

  assert.match(releaseLifecycleRecordRows("runtime", []), /Runtime 暂无记录/);
});

test("frontend ESM release lifecycle panel preserves controls, counters, and action status", () => {
  const data = {
    preflightReports: {
      reports: [{ preflightReportId: "preflight_1", releasePreflight: { nextAction: { label: "Owner review preflight" } }, status: "pass" }]
    },
    releaseActivations: {
      activations: [{ activationId: "activation_1", activationGates: ["writeful_execution"], status: "recorded" }]
    },
    runtimeEnablements: {
      enablements: [{ enablementId: "runtime_1", requiredConfigKeys: ["automationWritefulExecutionEnabled"], status: "recorded" }]
    }
  };
  const normalized = releaseLifecycleRecordsData(data);
  assert.equal(normalized.preflightReports.length, 1);
  assert.equal(normalized.activations.length, 1);
  assert.equal(normalized.runtimeEnablements.length, 1);

  const actionStatusHtml = releaseLifecycleActionStatusPanel({
    actionStatus: "recorded",
    actionResult: { activation: { activationId: "activation_1" } }
  });
  assert.match(actionStatusHtml, /data-release-lifecycle-record-action-status="recorded"/);
  assert.match(actionStatusHtml, /发布记录已写入：activation_1/);

  const html = releaseLifecycleRecordsPanel({ releaseLifecycleRecords: data });
  assert.match(html, /data-release-lifecycle-records-panel/);
  assert.match(html, /data-release-lifecycle-records-status="idle"/);
  assert.match(html, /发布记录/);
  assert.match(html, /显式记录发布前检查/);
  assert.match(html, /<small>Preflight<\/small><strong>1<\/strong>/);
  assert.match(html, /<small>Activation<\/small><strong>1<\/strong>/);
  assert.match(html, /<small>Runtime<\/small><strong>1<\/strong>/);
  assert.match(html, /data-release-lifecycle-record="preflight"/);
  assert.match(html, /data-release-lifecycle-record="activation"/);
  assert.match(html, /data-release-lifecycle-record="runtime"/);
  assert.match(html, /Owner review preflight/);
  assert.match(html, /writeful_execution/);
  assert.match(html, /automationWritefulExecutionEnabled/);

  const busyHtml = releaseLifecycleRecordsPanel({ releaseLifecycleRecords: data }, {
    releaseLifecycleRecords: { actionStatus: "recording" }
  });
  assert.equal((busyHtml.match(/disabled>记录中<\/button>/g) || []).length, 3);
  assert.match(busyHtml, /正在通过 Growth release lifecycle service 写入摘要记录。/);

  const loadingHtml = releaseLifecycleRecordsPanel({}, { releaseLifecycleRecords: { status: "loading" } });
  assert.match(loadingHtml, /data-release-lifecycle-records-status="loading"/);
  assert.match(loadingHtml, /data-release-lifecycle-records-refresh disabled/);

  const failedHtml = releaseLifecycleRecordsPanel({}, {
    releaseLifecycleRecords: { status: "failed", error: "release_lifecycle_records_unavailable" }
  });
  assert.match(failedHtml, /data-release-lifecycle-records-status="failed"/);
  assert.match(failedHtml, /release_lifecycle_records_unavailable/);
});
