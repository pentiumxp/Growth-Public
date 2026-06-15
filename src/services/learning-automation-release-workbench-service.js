"use strict";

const RELEASE_WORKBENCH_SCHEMA = "growth.learningAutomationReleaseWorkbench.v1";

const PRIVACY_KEY_RE = /(raw|prompt|transcript|answer[_-]?key|secret|token|cookie|authorization|provider[_-]?config|api[_-]?key|access[_-]?key|private[_-]?key)/i;
const PRIVATE_VALUE_RE = /(\/Users\/|C:\\Users\\|access-key|\.hermes-growth|Authorization:|Bearer\s+)/i;

function cleanString(value, max = 160) {
  return String(value || "").trim().slice(0, max);
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function uniqueStrings(values = [], max = 24) {
  const seen = new Set();
  const out = [];
  for (const value of asArray(values).flat()) {
    const clean = cleanString(value, 140);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= max) break;
  }
  return out;
}

function scanPrivacyKeys(value, path = "", findings = [], seen = new Set()) {
  if (!value || typeof value !== "object" || findings.length >= 16 || seen.has(value)) return findings;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (PRIVACY_KEY_RE.test(key)) findings.push(`privacy_key:${nextPath}`);
    if (findings.length >= 16) return findings;
    scanPrivacyKeys(child, nextPath, findings, seen);
    if (findings.length >= 16) return findings;
  }
  return findings;
}

function scanPrivateValues(value, path = "", findings = [], seen = new Set()) {
  if (findings.length >= 16) return findings;
  if (typeof value === "string") {
    if (PRIVATE_VALUE_RE.test(value)) findings.push(`private_value:${path || "value"}`);
    return findings;
  }
  if (!value || typeof value !== "object" || seen.has(value)) return findings;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;
    scanPrivateValues(child, nextPath, findings, seen);
    if (findings.length >= 16) return findings;
  }
  return findings;
}

function scopeFrom(input = {}) {
  return {
    workspaceId: cleanString(input.workspaceId || input.workspace_id, 160),
    learnerId: cleanString(input.learnerId || input.learner_id || input.workspaceId || input.workspace_id, 160),
    displayName: cleanString(input.displayName || input.display_name || input.label, 160),
    label: cleanString(input.label || input.displayName || input.display_name, 160),
    programId: cleanString(input.programId || input.program_id, 160),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id, 160),
    domain: cleanString(input.domain, 120),
    subject: cleanString(input.subject, 120),
    horizon: cleanString(input.horizon || "daily_plan", 80),
    collectionRunId: cleanString(input.collectionRunId || input.collection_run_id || input.runId || input.run_id, 180)
  };
}

function unavailable(error, scope = {}, extra = {}) {
  return Object.assign({}, scope, {
    ok: false,
    source: "growth-learning-automation-release-workbench-service",
    schemaVersion: RELEASE_WORKBENCH_SCHEMA,
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "blocked",
    error,
    releaseWorkbench: {
      schemaVersion: "growth.learningAutomationReleaseWorkbench.summary.v1",
      summaryOnly: true,
      status: "blocked",
      nextAction: {
        key: error,
        action: "review_release_workbench_dependency",
        requiredActor: "owner"
      },
      ownerActions: [],
      readRoutes: readRoutes(),
      recordRoutes: recordRoutes(scope),
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false
    },
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false
  }, extra);
}

function requireMethod(scope, key, service, method) {
  if (!service || typeof service[method] !== "function") {
    return unavailable(`learning_automation_release_workbench_${key}_unavailable`, scope);
  }
  return null;
}

function actionSummary(value) {
  const action = objectOnly(value);
  if (!Object.keys(action).length) return null;
  return {
    key: cleanString(action.key || action.checkKey || action.check_key || action.evidenceKey || action.evidence_key, 140),
    action: cleanString(action.action || action.type || action.reason, 140),
    requiredActor: cleanString(action.requiredActor || action.required_actor || action.actor || "owner", 80),
    label: cleanString(action.label || action.title || action.summary, 180)
  };
}

function routeTemplate(path, body = {}) {
  return {
    method: "POST",
    path,
    ownerOnly: true,
    workspaceBearerRequired: true,
    body
  };
}

function readRoutes() {
  return [
    { key: "release_readiness", method: "GET", path: "/api/v1/growth/automation/release-readiness" },
    { key: "release_controls", method: "GET", path: "/api/v1/growth/automation/release-controls" },
    { key: "release_dashboard", method: "GET", path: "/api/v1/growth/automation/release-dashboard" },
    { key: "release_inventory", method: "GET", path: "/api/v1/growth/automation/release-inventory" },
    { key: "release_review", method: "GET", path: "/api/v1/growth/automation/release-review" },
    { key: "release_authorization", method: "GET", path: "/api/v1/growth/automation/release-authorization" },
    { key: "release_closure", method: "GET", path: "/api/v1/growth/automation/release-closure" },
    { key: "release_activation_preflight", method: "GET", path: "/api/v1/growth/automation/release-activation/preflight" },
    { key: "release_activations", method: "GET", path: "/api/v1/growth/automation/release-activations" },
    { key: "runtime_enablements", method: "GET", path: "/api/v1/growth/automation/runtime-enablements" },
    { key: "release_workbench", method: "GET", path: "/api/v1/growth/automation/release-workbench" }
  ];
}

function recordRoutes(scope = {}) {
  return [
    {
      key: "release_readiness_snapshot",
      route: routeTemplate("/api/v1/growth/automation/release-readiness/snapshots", {
        workspace_id: scope.workspaceId,
        learner_id: scope.learnerId,
        program_id: scope.programId,
        collection_run_id: scope.collectionRunId,
        release_readiness: { summaryOnly: true }
      })
    },
    {
      key: "release_evidence",
      route: routeTemplate("/api/v1/growth/automation/release-evidence", {
        workspace_id: scope.workspaceId,
        learner_id: scope.learnerId,
        program_id: scope.programId,
        collection_run_id: scope.collectionRunId,
        status: "pass",
        evidence_key: "",
        check_key: "",
        evidence_summary: { summaryOnly: true }
      })
    },
    {
      key: "release_approval",
      route: routeTemplate("/api/v1/growth/automation/release-approvals", {
        workspace_id: scope.workspaceId,
        learner_id: scope.learnerId,
        program_id: scope.programId,
        collection_run_id: scope.collectionRunId,
        approval_key: "writefulExecutionApproval",
        status: "active",
        evidence_summary: { summaryOnly: true }
      })
    },
    {
      key: "release_collection_run",
      route: routeTemplate("/api/v1/growth/automation/release-collection-runs", {
        workspace_id: scope.workspaceId,
        learner_id: scope.learnerId,
        program_id: scope.programId,
        release_evidence_bundle: { summaryOnly: true },
        release_evidence_bundle_audit: { summaryOnly: true },
        release_readiness: { summaryOnly: true }
      })
    },
    {
      key: "release_decision",
      route: routeTemplate("/api/v1/growth/automation/release-decisions", {
        workspace_id: scope.workspaceId,
        learner_id: scope.learnerId,
        program_id: scope.programId,
        collection_run_id: scope.collectionRunId,
        status: "approved",
        decision_summary: { summaryOnly: true }
      })
    },
    {
      key: "release_package",
      route: routeTemplate("/api/v1/growth/automation/release-packages", {
        workspace_id: scope.workspaceId,
        learner_id: scope.learnerId,
        program_id: scope.programId,
        collection_run_id: scope.collectionRunId,
        release_package: { summaryOnly: true }
      })
    },
    {
      key: "release_activation",
      route: routeTemplate("/api/v1/growth/automation/release-activations", {
        workspace_id: scope.workspaceId,
        learner_id: scope.learnerId,
        program_id: scope.programId,
        collection_run_id: scope.collectionRunId,
        activation_gates: ["writeful_execution"],
        activation_decision: { summaryOnly: true, decision: "approved_for_config_enablement" }
      })
    },
    {
      key: "runtime_enablement",
      route: routeTemplate("/api/v1/growth/automation/runtime-enablements", {
        workspace_id: scope.workspaceId,
        learner_id: scope.learnerId,
        program_id: scope.programId,
        collection_run_id: scope.collectionRunId,
        activation_gates: ["writeful_execution"],
        enablement_decision: { summaryOnly: true, decision: "runtime_config_verified" }
      })
    }
  ];
}

function actionKeyForRecordKind(kind = "") {
  const value = cleanString(kind, 140);
  if (value === "release_readiness_snapshot") return "release_readiness_snapshot";
  if (value === "release_package") return "release_package";
  if (value === "release_evidence") return "release_evidence";
  if (value === "release_approval") return "release_approval";
  if (value === "release_activation") return "release_activation";
  if (value === "runtime_enablement") return "runtime_enablement";
  if (value === "release_collection_run") return "release_collection_run";
  if (value === "release_decision") return "release_decision";
  return "";
}

function endpointForAction(action = {}) {
  const key = cleanString(action.key || "", 180).toLowerCase();
  const kind = cleanString(action.action || "", 180).toLowerCase();
  if (/readiness.*snapshot/.test(key) || /readiness.*snapshot/.test(kind)) return "release_readiness_snapshot";
  if (/runtime|manual_config/.test(key) || /runtime|manual_config/.test(kind)) return "runtime_enablement";
  if (/activation/.test(key) || /activation/.test(kind)) return "release_activation";
  if (/package/.test(key) || /package/.test(kind)) return "release_package";
  if (/approval/.test(key) || /approval/.test(kind)) return "release_approval";
  if (/decision/.test(key) || /decision/.test(kind)) return "release_decision";
  if (/collection.*run|collection_run/.test(key) || /collection.*run|collection_run/.test(kind)) return "release_collection_run";
  if (/evidence|visual|platform|smoke|ui/.test(key) || /evidence|visual|platform|smoke|ui/.test(kind)) return "release_evidence";
  return "";
}

function ownerAction(action = {}, scope = {}, source = "") {
  const summary = actionSummary(action);
  if (!summary) return null;
  const endpointKey = endpointForAction(summary);
  const route = recordRoutes(scope).find((item) => item.key === endpointKey)?.route || null;
  const externalActionRequired = endpointKey === "runtime_enablement"
    && /manual_config|enable_runtime_config/.test(summary.action || summary.key);
  return {
    schemaVersion: "growth.learningAutomationReleaseWorkbench.ownerAction.v1",
    summaryOnly: true,
    key: summary.key,
    action: summary.action,
    requiredActor: summary.requiredActor || "owner",
    label: summary.label,
    source: cleanString(source, 80),
    endpointKey,
    route,
    externalActionRequired,
    externalAction: externalActionRequired ? {
      kind: "external",
      action: "enable_runtime_config_outside_growth",
      followupRoute: route
    } : null,
    configChangeApplied: false,
    runtimeConfigChange: false,
    writefulSchedulingAllowed: false
  };
}

function actionsFromMissingEvidence(keys = [], scope = {}) {
  return uniqueStrings(keys, 12).map((key) => ownerAction({
    key,
    action: "record_release_evidence",
    requiredActor: "owner",
    label: `Record release evidence for ${key}`
  }, scope, "missing_evidence")).filter(Boolean);
}

function actionsFromMissingApprovals(keys = [], scope = {}) {
  return uniqueStrings(keys, 12).map((key) => ownerAction({
    key,
    action: "record_release_approval",
    requiredActor: "owner",
    label: `Record release approval for ${key}`
  }, scope, "missing_approval")).filter(Boolean);
}

function actionsFromMissingRecords(kinds = [], scope = {}) {
  return uniqueStrings(kinds, 12).map((kind) => {
    const endpointKey = actionKeyForRecordKind(kind);
    if (!endpointKey) return null;
    return {
      schemaVersion: "growth.learningAutomationReleaseWorkbench.ownerAction.v1",
      summaryOnly: true,
      key: kind,
      action: `record_${kind}`,
      requiredActor: "owner",
      label: `Record ${kind}`,
      source: "missing_record",
      endpointKey,
      route: recordRoutes(scope).find((item) => item.key === endpointKey)?.route || null,
      externalActionRequired: endpointKey === "runtime_enablement",
      externalAction: endpointKey === "runtime_enablement" ? {
        kind: "external",
        action: "verify_runtime_config_outside_growth",
        followupRoute: recordRoutes(scope).find((item) => item.key === endpointKey)?.route || null
      } : null,
      configChangeApplied: false,
      runtimeConfigChange: false,
      writefulSchedulingAllowed: false
    };
  }).filter(Boolean);
}

function dedupeActions(actions = [], max = 16) {
  const seen = new Set();
  const out = [];
  for (const action of actions.filter(Boolean)) {
    const key = `${action.endpointKey || "external"}:${action.key}:${action.action}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(action);
    if (out.length >= max) break;
  }
  return out;
}

function dependencySummary(result = {}, summaryKey = "") {
  const summary = objectOnly(summaryKey ? result[summaryKey] : {});
  return {
    ok: result.ok !== false,
    status: cleanString(summary.status || result.status, 120),
    nextAction: actionSummary(summary.nextAction || result.nextAction),
    requiredActionCount: Number(summary.requiredActionCount || 0) || 0,
    missingCheckKeys: uniqueStrings(summary.missingCheckKeys || result.missingCheckKeys || []),
    blockedCheckKeys: uniqueStrings(summary.blockedCheckKeys || result.blockedCheckKeys || []),
    missingEvidenceKeys: uniqueStrings(summary.missingEvidenceKeys || result.missingEvidenceKeys || []),
    missingApprovalKeys: uniqueStrings(summary.missingApprovalKeys || result.missingApprovalKeys || [])
  };
}

function inventoryRecordSummary(inventory = {}) {
  const summary = objectOnly(inventory.releaseInventory);
  return {
    status: cleanString(summary.status || inventory.status, 120),
    missingRecordKinds: uniqueStrings(summary.missingRecordKinds || inventory.missingRecordKinds || []),
    blockedRecordKinds: uniqueStrings(summary.blockedRecordKinds || inventory.blockedRecordKinds || []),
    latestReadinessSnapshotId: cleanString(summary.latestReadinessSnapshotId, 180),
    latestCollectionRunId: cleanString(summary.latestCollectionRunId, 180),
    latestDecisionId: cleanString(summary.latestDecisionId, 180),
    latestPackageId: cleanString(summary.latestPackageId, 180),
    latestActivationId: cleanString(summary.latestActivationId, 180),
    latestRuntimeEnablementId: cleanString(summary.latestRuntimeEnablementId, 180),
    latestReleaseEvidenceRecordId: cleanString(summary.latestReleaseEvidenceRecordId, 180),
    releaseEvidenceRecordCount: Number(summary.releaseEvidenceRecordCount || 0) || 0
  };
}

function deriveStatus(dashboard = {}, controls = {}, readiness = {}) {
  const dashboardSummary = objectOnly(dashboard.releaseDashboard);
  const controlsSummary = objectOnly(controls.releaseControls);
  const readinessReview = objectOnly(readiness.releaseReview);
  return cleanString(dashboardSummary.status || dashboard.status || controlsSummary.status || controls.status || readinessReview.status || readiness.status || "blocked", 120);
}

function createLearningAutomationReleaseWorkbenchService(options = {}) {
  const releaseReadinessService = options.releaseReadinessService || null;
  const releaseControlsService = options.releaseControlsService || null;
  const releaseInventoryService = options.releaseInventoryService || null;
  const releaseDashboardService = options.releaseDashboardService || null;

  function workbench(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_release_workbench_scope_required", scope);
    const inputPrivacyFindings = scanPrivacyKeys(input).concat(scanPrivateValues(input)).slice(0, 16);
    if (inputPrivacyFindings.length) {
      return unavailable("learning_automation_release_workbench_privacy_failed", scope, { privacyFindings: inputPrivacyFindings });
    }
    const missing = requireMethod(scope, "readiness", releaseReadinessService, "evaluateReadiness")
      || requireMethod(scope, "controls", releaseControlsService, "summarize")
      || requireMethod(scope, "inventory", releaseInventoryService, "inventory")
      || requireMethod(scope, "dashboard", releaseDashboardService, "dashboard");
    if (missing) return missing;

    const request = Object.assign({}, input, scope);
    const readiness = releaseReadinessService.evaluateReadiness(request);
    const controls = releaseControlsService.summarize(request);
    const inventory = releaseInventoryService.inventory(request);
    const dashboard = releaseDashboardService.dashboard(request);
    const dependencyPrivacyFindings = scanPrivacyKeys({ readiness, controls, inventory, dashboard })
      .concat(scanPrivateValues({ readiness, controls, inventory, dashboard }))
      .slice(0, 16);
    if (dependencyPrivacyFindings.length) {
      return unavailable("learning_automation_release_workbench_dependency_privacy_failed", scope, { privacyFindings: dependencyPrivacyFindings });
    }

    const readinessSummary = dependencySummary(readiness, "releaseReview");
    const controlsSummary = dependencySummary(controls, "releaseControls");
    const dashboardSummary = dependencySummary(dashboard, "releaseDashboard");
    const inventorySummary = inventoryRecordSummary(inventory);
    const missingEvidenceKeys = uniqueStrings([
      ...readinessSummary.missingEvidenceKeys,
      ...controlsSummary.missingEvidenceKeys,
      ...dashboardSummary.missingEvidenceKeys
    ]);
    const missingCheckKeys = uniqueStrings([
      ...readinessSummary.missingCheckKeys,
      ...controlsSummary.missingCheckKeys,
      ...dashboardSummary.missingCheckKeys
    ]);
    const missingApprovalKeys = uniqueStrings([
      ...readinessSummary.missingApprovalKeys,
      ...controlsSummary.missingApprovalKeys,
      ...dashboardSummary.missingApprovalKeys
    ]);
    const ownerActions = dedupeActions([
      ownerAction(dashboardSummary.nextAction, scope, "release_dashboard"),
      ownerAction(controlsSummary.nextAction, scope, "release_controls"),
      ownerAction(readinessSummary.nextAction, scope, "release_readiness"),
      ...actionsFromMissingEvidence(missingEvidenceKeys.length ? missingEvidenceKeys : missingCheckKeys, scope),
      ...actionsFromMissingApprovals(missingApprovalKeys, scope),
      ...actionsFromMissingRecords(inventorySummary.missingRecordKinds, scope)
    ]);
    const status = deriveStatus(dashboard, controls, readiness);
    return Object.assign({}, scope, {
      ok: readiness.ok !== false && controls.ok !== false && inventory.ok !== false && dashboard.ok !== false,
      source: "growth-learning-automation-release-workbench-service",
      schemaVersion: RELEASE_WORKBENCH_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      status,
      releaseWorkbench: {
        schemaVersion: "growth.learningAutomationReleaseWorkbench.summary.v1",
        summaryOnly: true,
        status,
        nextAction: ownerActions[0] || null,
        ownerActionCount: ownerActions.length,
        ownerActions,
        readRoutes: readRoutes(),
        recordRoutes: recordRoutes(scope),
        readiness: readinessSummary,
        controls: controlsSummary,
        dashboard: dashboardSummary,
        inventory: inventorySummary,
        missingCheckKeys,
        missingEvidenceKeys,
        missingApprovalKeys,
        missingRecordKinds: inventorySummary.missingRecordKinds,
        blockedRecordKinds: inventorySummary.blockedRecordKinds,
        configChangeApplied: false,
        runtimeConfigChange: false,
        runtimeConfigMutationPerformed: false,
        writefulSchedulingAllowed: false,
        backgroundSchedulingAllowed: false,
        backgroundWorkerAllowed: false
      },
      releaseReadiness: readinessSummary,
      releaseControls: controlsSummary,
      releaseDashboard: dashboardSummary,
      releaseInventory: inventorySummary,
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false
    });
  }

  return {
    workbench
  };
}

module.exports = {
  RELEASE_WORKBENCH_SCHEMA,
  createLearningAutomationReleaseWorkbenchService
};
