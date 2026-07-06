const fs = require("node:fs");
const path = require("node:path");
const { evaluateOwnerCutoverEvidence } = require("./growth-vite-owner-cutover-evidence");

const repoRoot = path.join(__dirname, "..");

function readRelative(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function existsRelative(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function fail(code, message, extra = {}) {
  return {
    ok: false,
    code,
    message,
    ...extra
  };
}

function hasAll(text, patterns) {
  return patterns.every((pattern) => pattern.test(text));
}

function checkGrowthViteCutoverReadiness() {
  const ownerCutoverEvidence = evaluateOwnerCutoverEvidence();
  const indexHtml = readRelative("public/index.html");
  const mainJs = readRelative("frontend/src/main.js");
  const apiClientJs = readRelative("frontend/src/api/growthApiClient.js");
  const themeBridgeJs = readRelative("frontend/src/platform/themeBridge.js");
  const viewportBridgeJs = readRelative("frontend/src/platform/viewportBridge.js");
  const runtimeAdapterJs = readRelative("frontend/src/app/runtimeAdapter.js");
  const actionHandlerUtilsJs = readRelative("frontend/src/app/actionHandlerUtils.js");
  const releaseActionHandlersJs = readRelative("frontend/src/app/releaseActionHandlers.js");
  const cardGenerationFacadeJs = readRelative("frontend/src/features/card-generation/CardGenerationFacade.js");
  const releaseControlsViewJs = readRelative("frontend/src/features/release/ReleaseControlsView.js");
  const releaseDashboardViewJs = readRelative("frontend/src/features/release/ReleaseDashboardView.js");
  const releaseInventoryViewJs = readRelative("frontend/src/features/release/ReleaseInventoryView.js");
  const releaseReadinessViewJs = readRelative("frontend/src/features/release/ReleaseReadinessView.js");
  const evidenceCollectionViewJs = readRelative("frontend/src/features/release/EvidenceCollectionView.js");
  const releaseEvidencePanelJs = readRelative("frontend/src/features/release/ReleaseEvidencePanel.js");
  const automationReviewPanelsJs = readRelative("frontend/src/features/card-generation/AutomationReviewPanels.js");
  const automationSchedulerPanelsJs = readRelative("frontend/src/features/card-generation/AutomationSchedulerPanels.js");
  const viewModelJs = readRelative("frontend/src/state/viewModel.js");
  const navigationControllerJs = readRelative("frontend/src/routing/navigationController.js");
  const routeControllerJs = readRelative("frontend/src/routing/routeController.js");
  const programViewJs = readRelative("frontend/src/views/ProgramExecutionView.js");
  const programFoundationViewJs = readRelative("frontend/src/views/ProgramFoundationView.js");
  const programParentAdminViewJs = readRelative("frontend/src/views/ProgramParentAdminView.js");
  const programNativeGrowthDetailViewJs = readRelative("frontend/src/views/ProgramNativeGrowthDetailView.js");
  const programNativeGrowthSubmissionViewJs = readRelative("frontend/src/views/ProgramNativeGrowthSubmissionView.js");
  const legacyBoardViewJs = readRelative("frontend/src/features/legacy-board/LegacyBoardView.js");
  const legacyTaskUiJs = readRelative("frontend/src/features/legacy-board/LegacyTaskUi.js");
  const legacyProgramUiJs = readRelative("frontend/src/features/legacy-board/LegacyProgramUi.js");
  const legacyCoinsUiJs = readRelative("frontend/src/features/legacy-board/LegacyCoinsUi.js");
  const legacyGrowthUiFacadeJs = readRelative("frontend/src/features/legacy-board/LegacyGrowthUiFacade.js");
  const frontendTests = readRelative("tests/growth-frontend-esm-modules.test.mjs");
  const migrationPlan = readRelative("docs/IMPLEMENTATION_NOTES/growth-vite-esm-migration-plan.md");

  const failures = [];
  const evidence = [];
  const blockers = [];

  const runtimeEnabled = /data-growth-vite-runtime\s*=\s*["']enabled["']/.test(indexHtml);
  const directModuleScript = /<script[^>]+type=["']module["']/i.test(indexHtml);
  const ownerApprovalPresent = ownerCutoverEvidence.presentExternalEvidence.includes("owner_cutover_approval");
  const centralVisualPresent = ownerCutoverEvidence.presentExternalEvidence.includes("central_mobile_visual_evidence");
  if (runtimeEnabled && !ownerApprovalPresent) failures.push("runtime_enabled_without_owner_cutover");
  if (ownerApprovalPresent && centralVisualPresent && !runtimeEnabled) failures.push("owner_approved_runtime_marker_missing");
  if (directModuleScript) failures.push("direct_module_script_loaded_before_cutover");
  if (!indexHtml.includes("/growth-vite-bootstrap-loader.js?v=20260706-vite-esm-phase1")) {
    failures.push("bootstrap_loader_missing");
  } else {
    evidence.push("bootstrap_loader_present");
  }

  if (!existsRelative("public/growth-vite-bootstrap-loader.js")) {
    failures.push("bootstrap_loader_file_missing");
  } else {
    evidence.push("bootstrap_loader_file_present");
  }

  if (!hasAll(mainJs, [
    /mode:\s*"disabled"/,
    /mode:\s*"bootstrap"/,
    /mode:\s*"runtime"/,
    /growthViteRuntime\s*===\s*"enabled"/,
    /createGrowthRuntimeAdapter/
  ])) {
    failures.push("vite_entry_mount_modes_incomplete");
  } else {
    evidence.push("vite_entry_mount_modes_covered");
  }

  if (!hasAll(apiClientJs, [
    /export function createGrowthApiClient/,
    /export function learningOperatingLoopRunsQuery/,
    /export function releaseWorkbenchQuery/,
    /export function releaseStatusReadbackQuery/,
    /export function automationClosedLoopActionPlanQuery/,
    /export function cycleHistoryQuery/,
    /fetchGrowthReleaseEvidenceLedger/,
    /submitGrowthCardEvidence/,
    /reviewGrowthAutomationProposal/,
    /updateWorkspaceUrl/
  ])) {
    failures.push("api_client_esm_surface_incomplete");
  } else {
    evidence.push("api_client_esm_surface_present");
  }

  if (!hasAll(themeBridgeJs, [
    /export function normalizeTheme/,
    /export function normalizeFontSize/,
    /export function appearanceFromInput/
  ])) {
    failures.push("theme_bridge_esm_surface_incomplete");
  } else {
    evidence.push("theme_bridge_esm_surface_present");
  }

  if (!hasAll(viewportBridgeJs, [
    /export function boundedViewportNumber/,
    /export function firstBoundedViewportNumber/,
    /export function normalizeViewportMessage/,
    /hermes\.plugin\.viewport/
  ])) {
    failures.push("viewport_bridge_esm_surface_incomplete");
  } else {
    evidence.push("viewport_bridge_esm_surface_present");
  }

  if (!hasAll(runtimeAdapterJs, [
    /createReadbackActionHandlers/,
    /bindCardGenerationDomEvents/,
    /bindCardInteractionDomEvents/,
    /createCardInteractionController/,
    /createGrowthNavigationController/,
    /createGrowthRouteController/,
    /createGrowthViewModel/,
    /renderRoot/
  ])) {
    failures.push("runtime_adapter_wiring_incomplete");
  } else {
    evidence.push("runtime_adapter_wiring_present");
  }

  if (!hasAll(actionHandlerUtilsJs, [
    /export function cardGenerationState/,
    /export function selectedWorkspaceId/,
    /export function readbackLoadingPatch/,
    /export function readbackReadyPatch/,
    /export function findReleaseWorkbenchAction/,
    /export function automationDataItems/,
    /export function findRecommendationLifecycleItem/
  ])) {
    failures.push("action_handler_utils_esm_surface_incomplete");
  } else {
    evidence.push("action_handler_utils_esm_surface_present");
  }

  if (!hasAll(releaseActionHandlersJs, [
    /export function createReleaseActionHandlers/,
    /refreshReleaseArtifactTemplate/,
    /refreshReleaseLifecycleRecords/,
    /recordReleaseLifecycleRecordFromUi/,
    /buildReleasePackageFromUi/,
    /recordReleaseWorkbenchActionFromUi/
  ])) {
    failures.push("release_action_handlers_esm_surface_incomplete");
  } else {
    evidence.push("release_action_handlers_esm_surface_present");
  }

  if (!hasAll(cardGenerationFacadeJs, [
    /export const HermesGrowthCardGenerationUiFacade/,
    /createDailyEnglishGeneratePayload/,
    /createAutomationClosedLoopActionPlanQueryPayload/,
    /createReleaseStatusReadbackQueryPayload/,
    /createTargetProvisionPayload/,
    /createStageAssessmentPayload/,
    /renderOwnerCardGenerationPanel/
  ])) {
    failures.push("card_generation_esm_facade_incomplete");
  } else {
    evidence.push("card_generation_esm_facade_present");
  }

  if (!hasAll(releaseControlsViewJs, [
    /export const releaseControlsReadbackRow/,
    /export function releaseControlsReadbackData/
  ]) || !hasAll(releaseDashboardViewJs, [
    /export const releaseDashboardReadbackRow/,
    /export function releaseDashboardReadbackData/
  ]) || !hasAll(releaseInventoryViewJs, [
    /export const releaseInventoryReadbackRow/,
    /export function releaseInventoryReadbackData/
  ]) || !hasAll(releaseReadinessViewJs, [
    /export const releaseReadinessReadbackRows/,
    /export function releaseReadinessReadbackData/,
    /runtimeEnablement/
  ])) {
    failures.push("release_readback_subviews_esm_surface_incomplete");
  } else {
    evidence.push("release_readback_subviews_esm_surface_present");
  }

  if (!hasAll(evidenceCollectionViewJs, [
    /export function releaseEvidenceCollectionData/,
    /export function releaseEvidenceCollectionRows/,
    /data-release-evidence-ledger-kind="evidence"/
  ]) || !hasAll(releaseEvidencePanelJs, [
    /export function releaseApprovalLedgerData/,
    /export function releaseApprovalLedgerRows/,
    /data-release-evidence-ledger-kind="approval"/
  ])) {
    failures.push("release_evidence_subviews_esm_surface_incomplete");
  } else {
    evidence.push("release_evidence_subviews_esm_surface_present");
  }

  if (!hasAll(automationSchedulerPanelsJs, [
    /export function automationSchedulerExecutionActionFromHandoff/,
    /export function automationSchedulerExecutionPanel/,
    /export function automationSchedulerRunPanel/,
    /export function automationSchedulerWorkerTargetPanel/
  ])) {
    failures.push("automation_scheduler_esm_surface_incomplete");
  } else {
    evidence.push("automation_scheduler_esm_surface_present");
  }

  if (!hasAll(automationReviewPanelsJs, [
    /export function automationProposalPanel/,
    /export function automationDigestPanel/,
    /export function automationFailurePolicyPanel/,
    /export function automationActionHandoffPanel/,
    /export function createAutomationProposalCreatePayload/
  ])) {
    failures.push("automation_review_esm_surface_incomplete");
  } else {
    evidence.push("automation_review_esm_surface_present");
  }

  if (!hasAll(viewModelJs, [
    /export function boardMetrics/,
    /export function createGrowthViewModel/,
    /function normalizeCard/,
    /function normalizeBoard/,
    /function makeOverview/
  ])) {
    failures.push("view_model_esm_surface_incomplete");
  } else {
    evidence.push("view_model_esm_surface_present");
  }

  if (!hasAll(navigationControllerJs, [
    /export function createGrowthNavigationController/,
    /GROWTH_NAVIGATION_EVENT/,
    /GROWTH_BACK_EVENT/,
    /GROWTH_BACK_RESULT_EVENT/,
    /handlePopState/,
    /unbind/
  ])) {
    failures.push("navigation_controller_esm_surface_incomplete");
  } else {
    evidence.push("navigation_controller_esm_surface_present");
  }

  if (!hasAll(routeControllerJs, [
    /export function createGrowthRouteController/,
    /initialPluginRouteIntent/,
    /applyInitialPluginRoute/,
    /uniqueTaskCards/,
    /firstTaskCardForRoute/,
    /ROUTE_CONTRACT/
  ])) {
    failures.push("route_controller_esm_surface_incomplete");
  } else {
    evidence.push("route_controller_esm_surface_present");
  }

  if (!hasAll(programViewJs, [
    /export function renderProgramSubsystem/,
    /renderParentAdminPanel/,
    /renderNativeGrowthSubmission/
  ]) || !hasAll(programFoundationViewJs, [
    /export function learnerFacts/,
    /export function renderSourceGoalForms/,
    /export function renderFoundationImportForm/,
    /export function renderSourceDirectoryPanel/,
    /export function renderFoundationPanel/
  ]) || !hasAll(programParentAdminViewJs, [
    /export function renderProgramForm/,
    /export function renderReviewQueue/,
    /export function renderParentReviewRequests/,
    /export function renderRewardSettlements/,
    /export function renderLaunchOperationsPanel/,
    /export function renderParentReportPanel/,
    /export function renderParentAdminPanel/
  ]) || !hasAll(programNativeGrowthDetailViewJs, [
    /export function renderNativeGrowthTaskDetail/,
    /export function isNativeGrowthTaskDetail/,
    /export function renderTaskRewardPolicy/,
    /export function renderNativeGrowthAudioEvidence/,
    /export function renderNativeGrowthEvaluationDetails/
  ]) || !hasAll(programNativeGrowthSubmissionViewJs, [
    /export function nativeGrowthRequiresAudio/,
    /export function renderNativeGrowthSubmission/,
    /export function renderNativeGrowthAudioRecorder/,
    /export function renderNativeGrowthReflectionRecorder/,
    /export function taskActionFromRecords/
  ])) {
    failures.push("program_esm_surface_incomplete");
  } else {
    evidence.push("program_esm_surface_present");
  }

  const legacyBoardSurfaceComplete = hasAll(legacyBoardViewJs, [
    /renderLearningGrowthBoard/,
    /renderBoardCard/,
    /renderBoardView/
  ]) && hasAll(legacyTaskUiJs, [
    /renderTeachingCardDetailView/,
    /renderNativeGrowthTaskDetail/,
    /renderNativeGrowthSubmission/,
    /renderTaskRows/
  ]) && hasAll(legacyProgramUiJs, [
    /renderProgramSubsystem/,
    /renderProgramCards/,
    /renderProgramForm/,
    /renderSourceGoalForms/
  ]) && hasAll(legacyCoinsUiJs, [
    /renderRewardsView/,
    /renderRewardCards/,
    /renderGrowthPanel/,
    /renderOwnerRewardForm/
  ]);
  if (!legacyBoardSurfaceComplete) {
    failures.push("legacy_board_esm_facade_incomplete");
  } else {
    evidence.push("legacy_board_esm_facade_present");
  }

  const legacyGrowthUiCompositeComplete = hasAll(legacyGrowthUiFacadeJs, [
    /export function renderLearningGrowthView/,
    /export function renderGrowthRouteNotice/,
    /export function renderLearningGrowthTabs/,
    /export function renderOwnerSystemPanel/,
    /export const HermesLearningGrowthUiFacade/,
    /renderLearningGrowthBoard/,
    /renderOwnerWorkspaceView/,
    /renderCardDetailView/,
    /renderOwnerSettingsPage/,
    /renderGrowthHistoryPage/
  ]);
  if (!legacyGrowthUiCompositeComplete) {
    failures.push("legacy_growth_ui_composite_incomplete");
  } else {
    evidence.push("legacy_growth_ui_composite_present");
  }

  const requiredFrontendTestNames = [
    "frontend ESM Vite entry keeps runtime disabled without explicit opt-in",
    "frontend ESM Vite entry supports bootstrap and explicit runtime mounts",
    "frontend ESM API query builders cover release, automation, cycle, audit, and reference parity",
    "frontend ESM API client exposes legacy-compatible wrapper surface without globals",
    "frontend ESM appearance helpers preserve bounded host viewport behavior",
    "frontend ESM runtime adapter wires DOM events through controller and handler factory",
    "frontend ESM route controller applies host manifest routes without legacy globals",
    "frontend ESM navigation controller preserves host back and history behavior",
    "frontend ESM view model preserves board, card, and overview normalization",
    "frontend ESM card generation facade matches legacy global payload and renderer surface",
    "frontend ESM legacy-board facades expose board, task, program, and coin migration targets",
    "frontend ESM legacy Growth UI composite facade preserves renderLearningGrowthView parity",
    "frontend ESM program source and goal setup forms preserve Owner foundation markers",
    "frontend ESM program parent admin panels preserve review, launch, report, and reward markers",
    "frontend ESM native Growth task detail preserves history, feedback, reward, and routing markers"
  ];
  const missingFrontendTests = requiredFrontendTestNames.filter((name) => !frontendTests.includes(name));
  if (missingFrontendTests.length) {
    failures.push("frontend_cutover_test_coverage_missing");
  } else {
    evidence.push("frontend_cutover_test_coverage_present");
  }

  if (existsRelative("frontend/src/legacy/registerGlobals.js")) {
    failures.push("stale_register_globals_file_present");
  } else {
    evidence.push("no_register_globals_file");
  }

  const programFoundationBoundaryCurrent = /frontend\/src\/views\/ProgramFoundationView\.js/.test(migrationPlan)
    && /ProgramExecutionView\.js`\s+keeps\s+compatibility\s+re-exports/.test(migrationPlan)
    && /frontend\/src\/views\/ProgramParentAdminView\.js/.test(migrationPlan)
    && /frontend\/src\/views\/ProgramNativeGrowthDetailView\.js/.test(migrationPlan)
    && /frontend\/src\/views\/ProgramNativeGrowthSubmissionView\.js/.test(migrationPlan);
  if (!programFoundationBoundaryCurrent) {
    failures.push("migration_plan_remaining_program_boundary_stale");
  } else {
    evidence.push("migration_plan_program_boundary_current");
  }
  if (!/frontend\/src\/features\/card-generation\/AutomationSchedulerPanels\.js/.test(migrationPlan)) {
    failures.push("migration_plan_automation_scheduler_boundary_stale");
  } else {
    evidence.push("migration_plan_automation_scheduler_boundary_current");
  }
  if (!/frontend\/src\/features\/card-generation\/AutomationReviewPanels\.js/.test(migrationPlan)) {
    failures.push("migration_plan_automation_review_boundary_stale");
  } else {
    evidence.push("migration_plan_automation_review_boundary_current");
  }
  if (!/Phase\s+5\s+`frontend\/src\/features\/legacy-board\/\*`\s+namespace\s+exists\s+as\s+an\s+ESM\s+façade/.test(migrationPlan)) {
    failures.push("migration_plan_legacy_board_boundary_stale");
  } else {
    evidence.push("migration_plan_legacy_board_boundary_current");
  }

  if (ownerCutoverEvidence.missingExternalEvidence.includes("owner_cutover_approval")) {
    blockers.push("owner_approval_required_before_runtime_enablement");
  }
  if (ownerCutoverEvidence.missingExternalEvidence.includes("central_mobile_visual_evidence")) {
    blockers.push("central_mobile_visual_evidence_required_before_runtime_enablement");
  }
  if (ownerCutoverEvidence.missingExternalEvidence.includes("deploy_lane_routing")) {
    blockers.push("deploy_lane_card_required_before_production_update");
  }
  if (!runtimeEnabled) blockers.push("runtime_opt_in_required_after_owner_approval");

  if (failures.length) {
    return fail("growth_vite_cutover_readiness_failed", "Growth Vite cutover readiness gate failed", {
      failures,
      evidence,
      blockers,
      ownerCutoverEvidence,
      readyForRuntimeEnablement: false
    });
  }

  return {
    ok: true,
    readyForRuntimeEnablement: false,
    status: blockers.length ? "blocked_pending_deploy_lane_routing" : "ready_for_deploy_lane_runtime_enablement",
    evidence,
    blockers,
    ownerCutoverEvidence
  };
}

if (require.main === module) {
  const result = checkGrowthViteCutoverReadiness();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exit(1);
}

module.exports = {
  checkGrowthViteCutoverReadiness
};
