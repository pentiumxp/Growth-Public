"use strict";

const RELEASE_WORKBENCH_SCHEMA = "growth.learningAutomationReleaseWorkbench.v1";

const PRIVACY_KEY_RE = /(raw|prompt|transcript|answer[_-]?key|secret|token|cookie|authorization|provider[_-]?config|api[_-]?key|access[_-]?key|private[_-]?key)/i;
const PRIVATE_VALUE_RE = /(\/Users\/|C:\\Users\\|access-key|\.hermes-growth|Authorization:|Bearer\s+)/i;
const RELEASE_EVIDENCE_COLLECTION_TASKS = Object.freeze(["learning_loop_state"]);
const RELEASE_EVIDENCE_COLLECTION_TASK_ORDER = Object.freeze([
  "planner_readiness",
  "daily_loop_preview",
  "learning_loop_state",
  "cycle_history",
  "owner_audit",
  "profile_feedback",
  "recommendation_lifecycle",
  "learner_cycle",
  "target_provisioning",
  "stage_assessment",
  "stage_checkpoint_controls",
  "proposal",
  "platform_action",
  "central_visual",
  "release_package_review_ui",
  "scheduler_dry_run",
  "action_handoff",
  "scheduler_execution",
  "scheduler_run",
  "scheduler_worker_target",
  "scheduler_worker",
  "owner_review_evidence",
  "release_workbench"
]);
const RELEASE_EVIDENCE_COLLECTION_TASK_BY_KEY = Object.freeze({
  stage_checkpoint_evidence: "stage_assessment",
  stage_checkpoint_controls_evidence: "stage_checkpoint_controls",
  production_proposal_smoke_evidence: "proposal",
  production_action_handoff_smoke_evidence: "action_handoff",
  production_scheduler_execution_smoke_evidence: "scheduler_execution",
  production_scheduler_run_smoke_evidence: "scheduler_run",
  production_scheduler_worker_target_smoke_evidence: "scheduler_worker_target",
  production_scheduler_worker_smoke_evidence: "scheduler_worker",
  production_planner_readiness_evidence: "planner_readiness",
  production_target_provisioning_smoke_evidence: "target_provisioning",
  production_daily_loop_preview_smoke_evidence: "daily_loop_preview",
  production_learning_loop_state_smoke_evidence: "learning_loop_state",
  production_cycle_history_smoke_evidence: "cycle_history",
  production_owner_audit_smoke_evidence: "owner_audit",
  production_profile_feedback_smoke_evidence: "profile_feedback",
  production_recommendation_lifecycle_smoke_evidence: "recommendation_lifecycle",
  production_learner_cycle_smoke_evidence: "learner_cycle",
  production_scheduler_dry_run_smoke_evidence: "scheduler_dry_run",
  platform_action_evidence: "platform_action",
  central_visual_evidence: "central_visual",
  release_package_review_ui_evidence: "release_package_review_ui",
  release_workbench_smoke_evidence: "release_workbench",
  owner_review_evidence: "owner_review_evidence"
});
const WRITE_GATED_RELEASE_EVIDENCE_COLLECTION_TASK_BY_KEY = Object.freeze({
  production_daily_loop_write_smoke_evidence: "daily_loop_write"
});
const TRANSIENT_EVIDENCE_FILE_KEYS = new Set([
  "centralVisualEvidenceFile",
  "central_visual_evidence_file",
  "releasePackageReviewUiEvidenceFile",
  "release_package_review_ui_evidence_file"
]);

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

function inputForPrivacyScan(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(inputForPrivacyScan);
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    TRANSIENT_EVIDENCE_FILE_KEYS.has(key) ? "[transient_evidence_file]" : inputForPrivacyScan(child)
  ]));
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

function collectionTaskPlan(keys = []) {
  const safeTaskSet = new Set();
  const writeGatedTaskSet = new Set();
  const unsupported = [];
  for (const key of uniqueStrings(keys, 64)) {
    const taskId = RELEASE_EVIDENCE_COLLECTION_TASK_BY_KEY[key];
    if (taskId) {
      safeTaskSet.add(taskId);
      continue;
    }
    const writeGatedTaskId = WRITE_GATED_RELEASE_EVIDENCE_COLLECTION_TASK_BY_KEY[key];
    if (writeGatedTaskId) {
      writeGatedTaskSet.add(writeGatedTaskId);
      continue;
    }
    unsupported.push(key);
  }
  const taskIds = RELEASE_EVIDENCE_COLLECTION_TASK_ORDER.filter((taskId) => safeTaskSet.has(taskId));
  return {
    taskIds: taskIds.length ? taskIds : Array.from(RELEASE_EVIDENCE_COLLECTION_TASKS),
    requiredTaskIds: taskIds.length ? taskIds : Array.from(RELEASE_EVIDENCE_COLLECTION_TASKS),
    writeGatedTaskIds: Array.from(writeGatedTaskSet),
    unsupportedKeys: unsupported
  };
}

function releaseEvidenceCollectionBody(scope = {}, taskIds = [], requiredTaskIds = []) {
  const body = {
    workspace_id: scope.workspaceId,
    learner_id: scope.learnerId,
    program_id: scope.programId,
    domain_pack_id: scope.domainPackId,
    domain: scope.domain,
    subject: scope.subject,
    horizon: scope.horizon,
    tasks: taskIds,
    required_task_ids: requiredTaskIds,
    write_collection_run: true,
    write_release_evidence_records: true
  };
  if (asArray(taskIds).includes("profile_feedback")) {
    body.auto_select_latest_completed_cycle = true;
  }
  if (asArray(taskIds).includes("central_visual")) {
    body.central_visual_evidence_file = "";
  }
  if (asArray(taskIds).includes("release_package_review_ui")) {
    body.release_package_review_ui_evidence_file = "";
  }
  return body;
}

function recordRoutes(scope = {}, collectionTasks = {}) {
  const taskIds = asArray(collectionTasks.taskIds).length ? collectionTasks.taskIds : RELEASE_EVIDENCE_COLLECTION_TASKS;
  const requiredTaskIds = asArray(collectionTasks.requiredTaskIds).length ? collectionTasks.requiredTaskIds : taskIds;
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
      key: "release_evidence_collection",
      route: routeTemplate(
        "/api/v1/growth/automation/release-evidence-collections/run",
        releaseEvidenceCollectionBody(scope, taskIds, requiredTaskIds)
      )
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
        auto_select_latest_ready_collection_run: true,
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
  if (value === "release_evidence_collection") return "release_evidence_collection";
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
  if (/record_release_evidence|release_evidence_record/.test(kind) || /record_release_evidence|release_evidence_record/.test(key)) return "release_evidence";
  if (/package/.test(key) || /package/.test(kind)) return "release_package";
  if (/approval/.test(key) || /approval/.test(kind)) return "release_approval";
  if (/decision/.test(key) || /decision/.test(kind)) return "release_decision";
  if (/evidence.*collection|collection.*evidence/.test(key) || /evidence.*collection|collection.*evidence/.test(kind)) return "release_evidence_collection";
  if (/collection.*run|collection_run/.test(key) || /collection.*run|collection_run/.test(kind)) return "release_collection_run";
  if (/evidence|visual|platform|smoke|ui/.test(key) || /evidence|visual|platform|smoke|ui/.test(kind)) return "release_evidence";
  return "";
}

function ownerAction(action = {}, scope = {}, source = "", collectionTasks = {}) {
  const summary = actionSummary(action);
  if (!summary) return null;
  const endpointKey = endpointForAction(summary);
  const route = recordRoutes(scope, collectionTasks).find((item) => item.key === endpointKey)?.route || null;
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

function actionsFromMissingRecords(kinds = [], scope = {}, collectionTasks = {}) {
  return uniqueStrings(kinds, 12).map((kind) => {
    const endpointKey = kind === "release_collection_run" ? "release_evidence_collection" : actionKeyForRecordKind(kind);
    if (!endpointKey) return null;
    const preparationRoute = endpointKey === "release_package"
      ? routeTemplate("/api/v1/growth/automation/release-packages/build", {
        workspace_id: scope.workspaceId,
        learner_id: scope.learnerId,
        program_id: scope.programId,
        domain_pack_id: scope.domainPackId,
        domain: scope.domain,
        subject: scope.subject,
        horizon: scope.horizon,
        tasks: ["planner_readiness", "scheduler_dry_run"],
        required_task_ids: ["planner_readiness", "scheduler_dry_run"],
        activation_gates: ["writeful_execution"]
      })
      : null;
    return {
      schemaVersion: "growth.learningAutomationReleaseWorkbench.ownerAction.v1",
      summaryOnly: true,
      key: kind,
      action: endpointKey === "release_evidence_collection" ? "run_release_evidence_collection" : `record_${kind}`,
      requiredActor: "owner",
      label: endpointKey === "release_evidence_collection" ? "Run release evidence collection" : `Record ${kind}`,
      source: "missing_record",
      endpointKey,
      route: recordRoutes(scope, collectionTasks).find((item) => item.key === endpointKey)?.route || null,
      requiresPreparation: Boolean(preparationRoute),
      preparationRoute,
      collectionTaskIds: endpointKey === "release_evidence_collection" ? asArray(collectionTasks.taskIds) : [],
      writeGatedCollectionTaskIds: endpointKey === "release_evidence_collection" ? asArray(collectionTasks.writeGatedTaskIds) : [],
      unsupportedCollectionKeys: endpointKey === "release_evidence_collection" ? asArray(collectionTasks.unsupportedKeys) : [],
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
    const inputPrivacyScope = inputForPrivacyScan(input);
    const inputPrivacyFindings = scanPrivacyKeys(inputPrivacyScope).concat(scanPrivateValues(inputPrivacyScope)).slice(0, 16);
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
    const collectionTasks = collectionTaskPlan([...missingEvidenceKeys, ...missingCheckKeys]);
    const ownerActions = dedupeActions([
      ownerAction(dashboardSummary.nextAction, scope, "release_dashboard", collectionTasks),
      ownerAction(controlsSummary.nextAction, scope, "release_controls", collectionTasks),
      ownerAction(readinessSummary.nextAction, scope, "release_readiness", collectionTasks),
      ...actionsFromMissingEvidence(missingEvidenceKeys.length ? missingEvidenceKeys : missingCheckKeys, scope),
      ...actionsFromMissingApprovals(missingApprovalKeys, scope),
      ...actionsFromMissingRecords(inventorySummary.missingRecordKinds, scope, collectionTasks)
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
        recordRoutes: recordRoutes(scope, collectionTasks),
        releaseEvidenceCollectionTasks: collectionTasks.taskIds,
        releaseEvidenceCollectionRequiredTaskIds: collectionTasks.requiredTaskIds,
        writeGatedReleaseEvidenceCollectionTasks: collectionTasks.writeGatedTaskIds,
        unsupportedReleaseEvidenceCollectionKeys: collectionTasks.unsupportedKeys,
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
