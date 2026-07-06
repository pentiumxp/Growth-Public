const { checkGrowthViteRuntimeBoundary } = require("./check-growth-vite-runtime-boundary");
const { checkGrowthViteCutoverReadiness } = require("./check-growth-vite-cutover-readiness");
const { evaluateOwnerCutoverEvidence } = require("./growth-vite-owner-cutover-evidence");

function externalCutoverBlockersForEvidence(ownerCutoverEvidence = evaluateOwnerCutoverEvidence()) {
  const blockers = [];
  if (ownerCutoverEvidence.missingExternalEvidence.includes("owner_cutover_approval")) {
    blockers.push("owner_approval_required_before_runtime_enablement");
  }
  if (ownerCutoverEvidence.missingExternalEvidence.includes("central_mobile_visual_evidence")) {
    blockers.push("central_mobile_visual_evidence_required_before_runtime_enablement");
  }
  if (ownerCutoverEvidence.missingExternalEvidence.includes("deploy_lane_routing")) {
    blockers.push("deploy_lane_card_required_before_production_update");
  }
  return blockers;
}

const externalCutoverBlockers = externalCutoverBlockersForEvidence();

function fail(code, message, extra = {}) {
  return {
    ok: false,
    code,
    message,
    ...extra
  };
}

function hasEvidence(readiness = {}, key = "") {
  return Array.isArray(readiness.evidence) && readiness.evidence.includes(key);
}

function hasBlocker(readiness = {}, key = "") {
  return Array.isArray(readiness.blockers) && readiness.blockers.includes(key);
}

function phase(status, evidence = [], blockers = []) {
  return {
    status,
    evidence,
    blockers
  };
}

function checkGrowthVitePhaseAudit() {
  const ownerCutoverEvidence = evaluateOwnerCutoverEvidence();
  const currentExternalCutoverBlockers = externalCutoverBlockersForEvidence(ownerCutoverEvidence);
  const runtimeBoundary = checkGrowthViteRuntimeBoundary();
  if (!runtimeBoundary.ok) {
    return fail("growth_vite_phase_audit_runtime_boundary_failed", "Growth Vite phase audit requires the pre-Owner runtime boundary to remain closed", {
      runtimeBoundary,
      internalReadyForOwnerEvidence: false,
      readyForRuntimeEnablement: false
    });
  }

  const cutoverReadiness = checkGrowthViteCutoverReadiness();
  if (!cutoverReadiness.ok) {
    return fail("growth_vite_phase_audit_cutover_readiness_failed", "Growth Vite phase audit requires complete internal cutover evidence", {
      cutoverReadiness,
      internalReadyForOwnerEvidence: false,
      readyForRuntimeEnablement: false
    });
  }

  const expectedPhase7Blockers = cutoverReadiness.blockers;
  const missingExternalBlockers = currentExternalCutoverBlockers.filter((key) => !hasBlocker(cutoverReadiness, key));
  if (missingExternalBlockers.length) {
    return fail("growth_vite_phase_audit_external_blockers_missing", "Growth Vite phase audit requires explicit external cutover blockers before Owner approval", {
      missingExternalBlockers,
      internalReadyForOwnerEvidence: false,
      readyForRuntimeEnablement: false
    });
  }

  const phases = {
    phase0BaselineAndGates: phase("complete", [
      "bootstrap_loader_present",
      "bootstrap_loader_file_present",
      "frontend_cutover_test_coverage_present"
    ]),
    phase1ViteSkeleton: phase("complete", [
      "vite_entry_mount_modes_covered",
      "pre_owner_runtime_boundary_closed"
    ]),
    phase2PlatformApiRoutingEsm: phase("complete", [
      "api_client_esm_surface_present",
      "theme_bridge_esm_surface_present",
      "viewport_bridge_esm_surface_present",
      "view_model_esm_surface_present",
      "navigation_controller_esm_surface_present",
      "route_controller_esm_surface_present"
    ]),
    phase3OwnerGenerationAndReleaseUi: phase("complete", [
      "runtime_adapter_wiring_present",
      "action_handler_utils_esm_surface_present",
      "release_action_handlers_esm_surface_present",
      "release_readback_subviews_esm_surface_present",
      "release_evidence_subviews_esm_surface_present",
      "card_generation_esm_facade_present",
      "program_esm_surface_present"
    ]),
    phase4CardInteraction: phase("complete", [
      "runtime_adapter_wiring_present",
      "frontend_cutover_test_coverage_present"
    ]),
    phase5LegacyBoardUi: phase("complete", [
      "legacy_board_esm_facade_present",
      "legacy_growth_ui_composite_present"
    ]),
    phase6PreOwnerRuntimeBoundary: phase("complete_pre_owner", [
      "no_register_globals_file",
      "migration_plan_program_boundary_current",
      "migration_plan_automation_review_boundary_current",
      "migration_plan_automation_scheduler_boundary_current",
      "migration_plan_legacy_board_boundary_current",
      "pre_owner_runtime_boundary_closed"
    ]),
    phase7VisualAndProductionReadiness: phase(expectedPhase7Blockers.length ? "blocked_external_evidence" : "complete", [
      "external_owner_visual_and_deploy_evidence_required"
    ], expectedPhase7Blockers)
  };

  const missingPhaseEvidence = Object.entries(phases).flatMap(([phaseKey, item]) => {
    return item.evidence
      .filter((key) => key !== "pre_owner_runtime_boundary_closed" && key !== "external_owner_visual_and_deploy_evidence_required")
      .filter((key) => !hasEvidence(cutoverReadiness, key))
      .map((key) => ({ phase: phaseKey, evidence: key }));
  });
  if (missingPhaseEvidence.length) {
    return fail("growth_vite_phase_audit_internal_evidence_missing", "Growth Vite phase audit found missing internal evidence", {
      missingPhaseEvidence,
      internalReadyForOwnerEvidence: false,
      readyForRuntimeEnablement: false
    });
  }

  const runtimeConfigChange = runtimeBoundary.mode === "owner_approved_vite_runtime_enabled";
  return {
    ok: true,
    status: expectedPhase7Blockers.length ? "internal_ready_pending_external_owner_visual_and_deploy_evidence" : "complete",
    internalReadyForOwnerEvidence: true,
    readyForRuntimeEnablement: expectedPhase7Blockers.length === 0 && runtimeConfigChange,
    runtimeConfigChange,
    configChangeApplied: runtimeConfigChange,
    advisoryOnly: true,
    evidence: [
      "phase_0_to_6_internal_evidence_complete",
      runtimeConfigChange ? "owner_approved_runtime_marker_applied" : "pre_owner_runtime_boundary_closed",
      "phase_7_external_evidence_required"
    ],
    phases,
    runtimeBoundary: {
      mode: runtimeBoundary.mode,
      legacyScriptCount: runtimeBoundary.legacyScriptCount,
      viteLoader: runtimeBoundary.viteLoader
    },
    cutoverReadiness: {
      status: cutoverReadiness.status,
      readyForRuntimeEnablement: cutoverReadiness.readyForRuntimeEnablement,
      evidence: cutoverReadiness.evidence,
      blockers: cutoverReadiness.blockers
    },
    ownerCutoverEvidence
  };
}

if (require.main === module) {
  const result = checkGrowthVitePhaseAudit();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exit(1);
}

module.exports = {
  checkGrowthVitePhaseAudit,
  externalCutoverBlockers,
  externalCutoverBlockersForEvidence
};
