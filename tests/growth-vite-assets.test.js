const assert = require("node:assert/strict");
const test = require("node:test");
const { checkGrowthViteAssets } = require("../scripts/check-growth-vite-assets");
const { checkGrowthViteRuntimeBoundary, scriptTags } = require("../scripts/check-growth-vite-runtime-boundary");
const { checkGrowthViteCutoverReadiness } = require("../scripts/check-growth-vite-cutover-readiness");
const { checkGrowthViteOwnerCutoverPreflight, requiredExternalEvidence } = require("../scripts/check-growth-vite-owner-cutover-preflight");
const { checkGrowthVitePhaseAudit } = require("../scripts/check-growth-vite-phase-audit");
const { evaluateOwnerCutoverEvidence } = require("../scripts/growth-vite-owner-cutover-evidence");
const { validateGrowthViteDevServerResponses } = require("../scripts/smoke-growth-vite-dev-server");

test("Growth Vite build emits a bounded manifest and entry asset", () => {
  const result = checkGrowthViteAssets();
  assert.equal(result.ok, true);
  assert.equal(result.manifest, "public/assets/growth/.vite/manifest.json");
  assert.match(result.entryFile, /^growth\.[A-Za-z0-9_-]+\.js$/);
  assert.ok(result.entryBytes > 0);
  assert.equal(result.loader, "public/growth-vite-bootstrap-loader.js");
});

test("Growth Vite runtime boundary accepts Owner-approved runtime marker before deploy routing", () => {
  const result = checkGrowthViteRuntimeBoundary();
  assert.equal(result.ok, true);
  assert.equal(result.mode, "owner_approved_vite_runtime_enabled");
  assert.equal(result.legacyScriptCount, 12);
  assert.equal(result.viteLoader, "/growth-vite-bootstrap-loader.js");
  assert.equal(result.evidence.includes("legacy_runtime_scripts_present_in_order"), true);
  assert.equal(result.evidence.includes("vite_bootstrap_loader_last"), true);
  assert.equal(result.evidence.includes("runtime_opt_in_enabled_after_owner_approval"), true);
  assert.equal(result.evidence.includes("no_direct_hashed_vite_asset"), true);
});

test("Growth Vite runtime boundary script parser extracts script sources and module type", () => {
  const scripts = scriptTags('<script src="/a.js?v=1"></script><script type="module" src="/src/main.js"></script>');
  assert.deepEqual(scripts.map((script) => script.srcPath), ["/a.js", "/src/main.js"]);
  assert.equal(scripts[1].type, "module");
});

test("Growth Vite cutover readiness gate accepts completed deploy routing", () => {
  const result = checkGrowthViteCutoverReadiness();
  assert.equal(result.ok, true);
  assert.equal(result.readyForRuntimeEnablement, true);
  assert.equal(result.status, "ready_for_deploy_lane_runtime_enablement");
  assert.equal(result.evidence.includes("bootstrap_loader_present"), true);
  assert.equal(result.evidence.includes("vite_entry_mount_modes_covered"), true);
  assert.equal(result.evidence.includes("api_client_esm_surface_present"), true);
  assert.equal(result.evidence.includes("theme_bridge_esm_surface_present"), true);
  assert.equal(result.evidence.includes("viewport_bridge_esm_surface_present"), true);
  assert.equal(result.evidence.includes("runtime_adapter_wiring_present"), true);
  assert.equal(result.evidence.includes("view_model_esm_surface_present"), true);
  assert.equal(result.evidence.includes("card_generation_esm_facade_present"), true);
  assert.equal(result.evidence.includes("navigation_controller_esm_surface_present"), true);
  assert.equal(result.evidence.includes("route_controller_esm_surface_present"), true);
  assert.equal(result.evidence.includes("program_esm_surface_present"), true);
  assert.equal(result.evidence.includes("legacy_board_esm_facade_present"), true);
  assert.equal(result.evidence.includes("legacy_growth_ui_composite_present"), true);
  assert.equal(result.evidence.includes("frontend_cutover_test_coverage_present"), true);
  assert.equal(result.evidence.includes("no_register_globals_file"), true);
  assert.equal(result.evidence.includes("migration_plan_program_boundary_current"), true);
  assert.equal(result.evidence.includes("migration_plan_legacy_board_boundary_current"), true);
  assert.equal(result.blockers.includes("owner_approval_required_before_runtime_enablement"), false);
  assert.equal(result.blockers.includes("central_mobile_visual_evidence_required_before_runtime_enablement"), false);
  assert.equal(result.blockers.includes("deploy_lane_card_required_before_production_update"), false);
  assert.equal(result.blockers.includes("runtime_opt_in_required_after_owner_approval"), false);
  assert.deepEqual(result.ownerCutoverEvidence.presentExternalEvidence, [
    "owner_cutover_approval",
    "central_mobile_visual_evidence",
    "deploy_lane_routing"
  ]);
});

test("Growth Vite phase audit reports completed external cutover evidence", () => {
  const result = checkGrowthVitePhaseAudit();
  assert.equal(result.ok, true);
  assert.equal(result.status, "complete");
  assert.equal(result.internalReadyForOwnerEvidence, true);
  assert.equal(result.readyForRuntimeEnablement, true);
  assert.equal(result.runtimeConfigChange, true);
  assert.equal(result.configChangeApplied, true);
  assert.equal(result.advisoryOnly, true);
  assert.equal(result.evidence.includes("phase_0_to_6_internal_evidence_complete"), true);
  assert.equal(result.evidence.includes("owner_approved_runtime_marker_applied"), true);
  assert.equal(result.evidence.includes("phase_7_external_evidence_required"), true);
  assert.equal(result.phases.phase0BaselineAndGates.status, "complete");
  assert.equal(result.phases.phase5LegacyBoardUi.status, "complete");
  assert.equal(result.phases.phase6PreOwnerRuntimeBoundary.status, "complete_pre_owner");
  assert.equal(result.phases.phase7VisualAndProductionReadiness.status, "complete");
  assert.deepEqual(result.phases.phase7VisualAndProductionReadiness.blockers, []);
});

test("Growth Vite Owner cutover preflight reports completed deploy routing", () => {
  const result = checkGrowthViteOwnerCutoverPreflight();
  assert.equal(result.ok, true);
  assert.equal(result.status, "ready_for_deploy_lane_runtime_enablement");
  assert.equal(result.internalReadyForOwnerEvidence, true);
  assert.equal(result.readyForOwnerCutover, true);
  assert.equal(result.readyForRuntimeEnablement, true);
  assert.equal(result.configChangeApplied, true);
  assert.equal(result.runtimeConfigChange, true);
  assert.equal(result.advisoryOnly, true);
  assert.deepEqual(result.missingExternalEvidence, []);
  assert.deepEqual(result.presentExternalEvidence, [
    "owner_cutover_approval",
    "central_mobile_visual_evidence",
    "deploy_lane_routing"
  ]);
  assert.deepEqual(result.requiredExternalEvidence.map((item) => item.status), ["present", "present", "present"]);
  assert.deepEqual(requiredExternalEvidence.map((item) => item.key), [
    "owner_cutover_approval",
    "central_mobile_visual_evidence",
    "deploy_lane_routing"
  ]);
  assert.equal(result.evidence.includes("owner_approved_runtime_marker_applied"), true);
  assert.equal(result.evidence.includes("cutover_readiness_guard_passed"), true);
  assert.equal(result.evidence.includes("phase_0_to_6_internal_evidence_complete"), true);
  assert.equal(result.runtimeBoundary.mode, "owner_approved_vite_runtime_enabled");
  assert.equal(result.phaseAudit.status, "complete");
  assert.equal(result.phaseAudit.phase7Status, "complete");
  assert.equal(result.ownerCutoverPlanning.ownerApprovalRequest.status, "ready_for_owner_review");
  assert.deepEqual(result.ownerCutoverPlanning.ownerApprovalRequest.missingMarkers, []);
  assert.equal(result.ownerCutoverPlanning.ownerApprovalRequest.approvalRecorded, true);
  assert.equal(result.ownerCutoverPlanning.ownerApprovalRequestRouting.status, "completed");
  assert.equal(result.ownerCutoverPlanning.ownerApprovalRequestRouting.taskCardId, "ttc_1b40fc066486468771");
  assert.equal(result.ownerCutoverPlanning.ownerApprovalRequestRouting.targetThreadId, "019f091a-6ce0-7932-97b2-a5ba38556f51");
  assert.equal(result.ownerCutoverPlanning.ownerApprovalRequestRouting.cardKind, "owner_approval_request");
  assert.equal(result.ownerCutoverPlanning.ownerApprovalRequestRouting.approvalRecorded, true);
  assert.equal(result.ownerCutoverPlanning.ownerApprovalRequestRouting.deployRoutingRecorded, true);
  assert.deepEqual(result.ownerCutoverPlanning.ownerApprovalRequestRouting.missingMarkers, []);
  assert.equal(result.ownerCutoverPlanning.deployLaneDraft.status, "draft_only_not_sent");
  assert.equal(result.ownerCutoverPlanning.deployLaneDraft.sendAllowed, false);
  assert.equal(result.ownerCutoverPlanning.deployLaneDraft.requiresOwnerApproval, false);
  assert.equal(result.ownerCutoverPlanning.deployLaneDraft.ownerApprovalRecorded, true);
  assert.equal(result.ownerCutoverPlanning.deployLaneDraft.deployRoutingRecorded, true);
  assert.equal(result.ownerCutoverPlanning.deployLaneDraft.path.endsWith("growth-vite-deploy-lane-request-draft.json"), true);
  assert.deepEqual(result.ownerCutoverPlanning.deployLaneDraft.missingFields, []);
  assert.deepEqual(result.ownerCutoverPlanning.deployLaneDraft.invalidFields, []);
});

test("Growth Vite owner cutover evidence validates approval and deploy routing receipts", () => {
  const valid = evaluateOwnerCutoverEvidence({
    ok: true,
    path: "/tmp/evidence.json",
    data: {
      schemaVersion: "growth.viteOwnerCutoverEvidence.v1",
      updatedAt: "2026-07-06T12:30:00Z",
      summaryOnly: true,
      externalEvidence: {
        owner_cutover_approval: {
          status: "present",
          decision: "approved_for_deploy_lane_request",
          approvedAt: "2026-07-06T12:30:00Z",
          approvalReference: "source-thread-owner-approval",
          scope: "growth-vite-esm-runtime-cutover",
          privacy: "bounded_no_secrets"
        },
        deploy_lane_routing: {
          status: "present",
          taskCardId: "ttc_deploy_growth_vite",
          cardKind: "plugin_deployment",
          pluginId: "growth",
          routeKind: "deployment",
          deployReason: "growth-vite-esm-runtime-cutover",
          target: "Home AI deploy lane pool",
          returnCardRequired: true,
          privacy: "bounded_no_secrets"
        }
      }
    }
  });
  assert.equal(valid.requiredExternalEvidence.find((item) => item.key === "owner_cutover_approval").status, "present");
  assert.equal(valid.requiredExternalEvidence.find((item) => item.key === "deploy_lane_routing").status, "present");
  assert.deepEqual(valid.presentExternalEvidence, ["owner_cutover_approval", "deploy_lane_routing"]);

  const invalid = evaluateOwnerCutoverEvidence({
    ok: true,
    path: "/tmp/evidence.json",
    data: {
      externalEvidence: {
        owner_cutover_approval: {
          status: "present",
          decision: "approved_for_deploy_lane_request",
          approvedAt: "not-an-iso-time",
          approvalReference: "source-thread-owner-approval",
          scope: "growth-vite-esm-runtime-cutover",
          privacy: "raw_private_payload"
        },
        deploy_lane_routing: {
          status: "present",
          taskCardId: "ttc_deploy_growth_vite",
          cardKind: "plugin_deployment",
          pluginId: "movie",
          routeKind: "deployment",
          deployReason: "growth-vite-esm-runtime-cutover",
          target: "Home AI deploy lane pool",
          returnCardRequired: true,
          privacy: "bounded_no_secrets"
        }
      }
    }
  });
  assert.equal(invalid.requiredExternalEvidence.find((item) => item.key === "owner_cutover_approval").status, "missing");
  assert.equal(invalid.requiredExternalEvidence.find((item) => item.key === "deploy_lane_routing").status, "missing");
});

test("Growth Vite dev server response validator requires the development shell and ESM entry", () => {
  const result = validateGrowthViteDevServerResponses({
    indexHtml: '<main id="growth-vite-root"></main><script type="module" src="/src/main.js"></script>',
    entryJs: 'import { createGrowthApp } from "./app/createGrowthApp.js"; import { createGrowthRuntimeAdapter } from "./app/runtimeAdapter.js"; export function createGrowthViteEntry() {}'
  });

  assert.equal(result.ok, true);
  assert.equal(result.evidence.includes("growth_vite_dev_root_present"), true);
  assert.equal(result.evidence.includes("growth_vite_dev_module_entry_present"), true);
  assert.equal(result.evidence.includes("growth_vite_entry_factory_present"), true);
  assert.equal(result.evidence.includes("growth_vite_entry_runtime_wiring_present"), true);

  const invalid = validateGrowthViteDevServerResponses({
    indexHtml: "<main></main>",
    entryJs: ""
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.failures.includes("growth_vite_dev_root_missing"), true);
  assert.equal(invalid.failures.includes("growth_vite_dev_module_entry_missing"), true);
});
