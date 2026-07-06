const { checkGrowthViteRuntimeBoundary } = require("./check-growth-vite-runtime-boundary");
const { checkGrowthViteCutoverReadiness } = require("./check-growth-vite-cutover-readiness");
const { checkGrowthVitePhaseAudit } = require("./check-growth-vite-phase-audit");
const {
  evaluateOwnerCutoverEvidence,
  ownerCutoverPlanningReadiness,
  requiredExternalEvidence
} = require("./growth-vite-owner-cutover-evidence");

function fail(code, message, extra = {}) {
  return {
    ok: false,
    code,
    message,
    ...extra
  };
}

function checkGrowthViteOwnerCutoverPreflight() {
  const ownerCutoverEvidence = evaluateOwnerCutoverEvidence();
  const ownerCutoverPlanning = ownerCutoverPlanningReadiness();
  const runtimeBoundary = checkGrowthViteRuntimeBoundary();
  if (!runtimeBoundary.ok) {
    return fail("growth_vite_owner_cutover_runtime_boundary_failed", "Growth Vite runtime boundary must remain closed before Owner cutover", {
      runtimeBoundary,
      ownerCutoverEvidence,
      ownerCutoverPlanning,
      readyForOwnerCutover: false,
      configChangeApplied: false,
      runtimeConfigChange: false
    });
  }

  const cutoverReadiness = checkGrowthViteCutoverReadiness();
  if (!cutoverReadiness.ok) {
    return fail("growth_vite_owner_cutover_readiness_failed", "Growth Vite cutover readiness evidence is incomplete", {
      cutoverReadiness,
      ownerCutoverEvidence,
      ownerCutoverPlanning,
      readyForOwnerCutover: false,
      configChangeApplied: false,
      runtimeConfigChange: false
    });
  }

  const phaseAudit = checkGrowthVitePhaseAudit();
  if (!phaseAudit.ok) {
    return fail("growth_vite_owner_cutover_phase_audit_failed", "Growth Vite phase audit evidence is incomplete", {
      phaseAudit,
      ownerCutoverEvidence,
      ownerCutoverPlanning,
      readyForOwnerCutover: false,
      configChangeApplied: false,
      runtimeConfigChange: false
    });
  }

  const runtimeConfigChange = runtimeBoundary.mode === "owner_approved_vite_runtime_enabled";
  const deployRoutingMissing = ownerCutoverEvidence.missingExternalEvidence.includes("deploy_lane_routing");
  return {
    ok: true,
    status: deployRoutingMissing ? "blocked_pending_deploy_lane_routing" : "ready_for_deploy_lane_runtime_enablement",
    internalReadyForOwnerEvidence: phaseAudit.internalReadyForOwnerEvidence,
    readyForOwnerCutover: ownerCutoverEvidence.presentExternalEvidence.includes("owner_cutover_approval")
      && ownerCutoverEvidence.presentExternalEvidence.includes("central_mobile_visual_evidence"),
    readyForRuntimeEnablement: !deployRoutingMissing && runtimeConfigChange,
    configChangeApplied: runtimeConfigChange,
    runtimeConfigChange,
    advisoryOnly: true,
    evidence: [
      runtimeConfigChange ? "owner_approved_runtime_marker_applied" : "pre_owner_runtime_boundary_closed",
      "cutover_readiness_guard_passed",
      "phase_0_to_6_internal_evidence_complete",
      "external_owner_visual_and_deploy_evidence_required"
    ],
    missingExternalEvidence: ownerCutoverEvidence.missingExternalEvidence,
    presentExternalEvidence: ownerCutoverEvidence.presentExternalEvidence,
    requiredExternalEvidence: ownerCutoverEvidence.requiredExternalEvidence,
    ownerCutoverEvidence: ownerCutoverEvidence.receipt,
    ownerCutoverPlanning,
    runtimeBoundary: {
      mode: runtimeBoundary.mode,
      legacyScriptCount: runtimeBoundary.legacyScriptCount,
      viteLoader: runtimeBoundary.viteLoader
    },
    cutoverReadiness: {
      status: cutoverReadiness.status,
      readyForRuntimeEnablement: cutoverReadiness.readyForRuntimeEnablement,
      blockers: cutoverReadiness.blockers
    },
    phaseAudit: {
      status: phaseAudit.status,
      internalReadyForOwnerEvidence: phaseAudit.internalReadyForOwnerEvidence,
      phase7Status: phaseAudit.phases.phase7VisualAndProductionReadiness.status,
      phase7Blockers: phaseAudit.phases.phase7VisualAndProductionReadiness.blockers
    }
  };
}

if (require.main === module) {
  const result = checkGrowthViteOwnerCutoverPreflight();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exit(1);
}

module.exports = {
  checkGrowthViteOwnerCutoverPreflight,
  requiredExternalEvidence
};
