import { clean } from "../../utils/string.js";

function compactPayload(payload = {}) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return true;
    return clean(value) || value === true;
  }));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function releaseWorkbenchScopeFromContext(context = {}, workspaceId = "") {
  const plan = context.suggestedPlan || {};
  const defaults = context.generationDefaults || {};
  const data = context.releaseWorkbench || {};
  const summary = data.releaseWorkbench || data;
  const inventory = summary.inventory || context.releaseInventory || {};
  return {
    workspace_id: clean(workspaceId || context.target?.workspaceId),
    learner_id: clean(context.target?.learnerId || workspaceId),
    program_id: clean(context.programId || plan.programId || defaults.programId),
    domain_pack_id: clean(context.domainPackId || plan.domainPackId || defaults.domainPackId),
    domain: clean(plan.domain || context.domain || defaults.domain),
    subject: clean(plan.subject || context.subject || defaults.subject || plan.domain || context.domain),
    horizon: clean(context.horizon || defaults.horizon || "daily_plan"),
    collection_run_id: clean(context.collectionRunId || inventory.latestCollectionRunId)
  };
}

export function createReleaseArtifactTemplateQueryPayload({ context = {}, workspaceId = "" } = {}) {
  return compactPayload(releaseWorkbenchScopeFromContext(context, workspaceId));
}

export function createReleaseWorkbenchActionAuditQueryPayload({ context = {}, workspaceId = "" } = {}) {
  return compactPayload({
    ...releaseWorkbenchScopeFromContext(context, workspaceId),
    limit: 5
  });
}

export function createReleaseStatusReadbackQueryPayload({ context = {}, workspaceId = "" } = {}) {
  return compactPayload({
    ...releaseWorkbenchScopeFromContext(context, workspaceId),
    limit: 4,
    activation_record_limit: 5,
    runtime_enablement_record_limit: 5
  });
}

export function createReleaseEvidenceLedgerQueryPayload({ context = {}, workspaceId = "" } = {}) {
  return compactPayload({
    ...releaseWorkbenchScopeFromContext(context, workspaceId),
    limit: 8
  });
}

export function createReleaseLifecycleRecordsQueryPayload({ context = {}, workspaceId = "" } = {}) {
  return compactPayload({
    ...releaseWorkbenchScopeFromContext(context, workspaceId),
    limit: 5
  });
}

export function createReleaseLifecycleRecordPayload({ context = {}, workspaceId = "", recordKind = "" } = {}) {
  const kind = clean(recordKind);
  const payload = {
    ...releaseWorkbenchScopeFromContext(context, workspaceId),
    requested_by: "owner",
    recorded_by: "owner",
    activation_gates: ["writeful_execution"],
    note: "Owner recorded summary-only release lifecycle readback from Growth UI.",
    evidence: {
      schemaVersion: "growth.releaseLifecycleRecord.ownerUiEvidence.v1",
      summaryOnly: true,
      recordKind: kind,
      source: "growth_owner_generation_ui"
    }
  };
  if (kind === "preflight") {
    payload.allow_write_preflight = true;
    payload.created_by = "owner";
    delete payload.recorded_by;
    delete payload.activation_gates;
    delete payload.note;
    delete payload.evidence;
  }
  if (kind === "activation") {
    payload.activation_decision = {
      schemaVersion: "growth.learningAutomationReleaseActivation.decision.v1",
      summaryOnly: true,
      decision: "approved_for_config_enablement",
      recordOnly: true,
      advisoryOnly: true
    };
  }
  if (kind === "runtime") {
    payload.enablement_decision = {
      schemaVersion: "growth.learningAutomationRuntimeEnablement.decision.v1",
      summaryOnly: true,
      decision: "ready_for_manual_runtime_config_enablement",
      recordOnly: true,
      advisoryOnly: true
    };
  }
  return compactPayload(payload);
}

export function createReleasePackageBuildPayload({ context = {}, workspaceId = "", action = {} } = {}) {
  const routeBody = action.preparationRoute?.body || action.route?.body || {};
  const actionKey = clean(action.key || action.actionKey || action.action_key || routeBody.record_kind || "release_package");
  return compactPayload({
    ...releaseWorkbenchScopeFromContext(context, workspaceId),
    requested_by: "owner",
    action_key: actionKey,
    action: {
      key: actionKey,
      action: clean(action.action),
      endpointKey: clean(action.endpointKey || action.endpoint_key),
      source: clean(action.source),
      summaryOnly: true
    },
    tasks: asArray(routeBody.tasks || ["planner_readiness", "scheduler_dry_run"]).map(clean).filter(Boolean),
    required_task_ids: asArray(routeBody.required_task_ids || routeBody.requiredTaskIds || ["planner_readiness", "scheduler_dry_run"]).map(clean).filter(Boolean),
    activation_gates: asArray(routeBody.activation_gates || routeBody.activationGates || ["writeful_execution"]).map(clean).filter(Boolean),
    write_collection_run: routeBody.write_collection_run === true || routeBody.writeCollectionRun === true || routeBody.record_collection_run === true || routeBody.recordCollectionRun === true,
    write_package_record: routeBody.write_package_record === true || routeBody.writePackageRecord === true || routeBody.record_package === true || routeBody.recordPackage === true
  });
}

const UI_EVIDENCE_FILE_FIELDS = Object.freeze([
  "central_visual_evidence_json",
  "mobile_visual_evidence_json",
  "release_status_readback_json",
  "release_evidence_ledger_json",
  "release_action_audit_json",
  "release_lifecycle_records_json"
]);

export function createReleaseWorkbenchActionPayload({ context = {}, workspaceId = "", action = {}, releasePackage = null } = {}) {
  const endpointKey = clean(action.endpointKey || action.endpoint_key);
  const routeBody = action.route?.body || {};
  const actionKey = clean(action.key || action.actionKey || routeBody.evidence_key || routeBody.check_key || routeBody.approval_key);
  const payload = {
    ...releaseWorkbenchScopeFromContext(context, workspaceId),
    endpoint_key: endpointKey,
    action_key: actionKey,
    requested_by: "owner",
    action: {
      key: actionKey,
      action: clean(action.action),
      endpointKey,
      source: clean(action.source),
      summaryOnly: true
    }
  };
  if (endpointKey === "release_evidence") {
    payload.evidence_key = clean(routeBody.evidence_key || routeBody.check_key || actionKey);
    payload.check_key = clean(routeBody.check_key || routeBody.evidence_key || actionKey);
  }
  if (endpointKey === "release_approval") {
    payload.approval_key = clean(routeBody.approval_key || routeBody.config_gate || actionKey);
    payload.config_gate = clean(routeBody.config_gate || routeBody.approval_key || actionKey);
    payload.status = "active";
  }
  if (endpointKey === "release_evidence_collection") {
    payload.tasks = asArray(routeBody.tasks || ["learning_loop_state"]).map(clean).filter(Boolean);
    payload.required_task_ids = asArray(routeBody.required_task_ids || routeBody.requiredTaskIds || payload.tasks).map(clean).filter(Boolean);
    payload.write_collection_run = routeBody.write_collection_run === true || routeBody.writeCollectionRun === true || routeBody.record_collection_run === true || routeBody.recordCollectionRun === true;
    payload.write_release_evidence_records = routeBody.write_release_evidence_records === true || routeBody.writeReleaseEvidenceRecords === true || routeBody.record_release_evidence_records === true || routeBody.recordReleaseEvidenceRecords === true;
    if (routeBody.auto_select_completed_cycle === true || routeBody.autoSelectCompletedCycle === true) {
      payload.auto_select_completed_cycle = true;
    }
    if (routeBody.auto_select_latest_completed_cycle === true || routeBody.autoSelectLatestCompletedCycle === true) {
      payload.auto_select_latest_completed_cycle = true;
    }
    payload.central_visual_evidence_file = clean(routeBody.central_visual_evidence_file || routeBody.centralVisualEvidenceFile);
    for (const field of UI_EVIDENCE_FILE_FIELDS) {
      payload[field] = clean(routeBody[field]);
    }
  }
  if (endpointKey === "release_package" && releasePackage && typeof releasePackage === "object") {
    payload.release_package = releasePackage;
  }
  if (endpointKey === "release_decision") {
    payload.status = clean(routeBody.status || "approved");
    payload.decision_summary = routeBody.decision_summary && typeof routeBody.decision_summary === "object"
      ? routeBody.decision_summary
      : { summaryOnly: true };
    payload.collection_run_id = clean(routeBody.collection_run_id || routeBody.collectionRunId || payload.collection_run_id);
    if (routeBody.auto_select_latest_ready_collection_run === true || routeBody.autoSelectLatestReadyCollectionRun === true) {
      payload.auto_select_latest_ready_collection_run = true;
    }
  }
  if (endpointKey === "release_activation" || endpointKey === "runtime_enablement") {
    payload.activation_gates = asArray(routeBody.activation_gates || routeBody.activationGates || ["writeful_execution"]).map(clean).filter(Boolean);
  }
  return compactPayload(payload);
}
