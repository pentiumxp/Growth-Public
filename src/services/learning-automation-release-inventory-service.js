"use strict";

const RELEASE_INVENTORY_SCHEMA = "growth.learningAutomationReleaseInventory.v1";
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization|localstorage|sessionstorage|cookie.*jar)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|Bearer\s+|X-Hermes-Web-Key|X-Hermes-Access-Key|access-key\.txt|launch-token|Authorization:)/i;
const OWNER_REVIEW_STAGE_SUMMARY_FIELDS = [
  "proposalCount",
  "acceptedProposalCount",
  "proposedProposalCount",
  "skippedProposalCount",
  "expiredProposalCount",
  "supersededProposalCount",
  "ownerDecisionProposalCount",
  "proposalExecutionCount",
  "publishedProposalExecutionCount",
  "blockedProposalExecutionCount",
  "failedProposalExecutionCount",
  "digestCount",
  "reviewedDigestCount",
  "pendingDigestCount",
  "digestRequiredActionCount",
  "digestBlockedCandidateCount",
  "actionHandoffCount",
  "deliveredHandoffCount",
  "pendingHandoffDeliveryCount",
  "actionHandoffActionCount",
  "blockedActionHandoffCount",
  "schedulerExecutionCount",
  "publishedSchedulerExecutionCount",
  "blockedSchedulerExecutionCount",
  "failedSchedulerExecutionCount",
  "schedulerRunCount",
  "completedSchedulerRunCount",
  "blockedSchedulerRunCount",
  "skippedSchedulerRunCount",
  "reviewedWorkerTargetCount",
  "pendingWorkerTargetReviewCount",
  "disabledWorkerTargetCount",
  "passedGateCount",
  "missingGateCount",
  "requiredActionCount"
];

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function valueArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function unique(values = []) {
  return Array.from(new Set(asArray(values).map((value) => cleanString(value, 160)).filter(Boolean)));
}

function snakeCaseKey(key) {
  return String(key || "").replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function fieldValue(source = {}, key) {
  if (Object.prototype.hasOwnProperty.call(source, key)) return source[key];
  return source[snakeCaseKey(key)];
}

function compactStringList(value, limit = 18, max = 140) {
  return Array.from(new Set(valueArray(value).map((item) => cleanString(item, max)).filter(Boolean))).slice(0, limit);
}

function compactNextAction(value = {}) {
  const source = objectOnly(value);
  const key = cleanString(fieldValue(source, "key"), 140);
  const action = cleanString(fieldValue(source, "action"), 180);
  const requiredActor = cleanString(fieldValue(source, "requiredActor") || source.actor || "owner", 80);
  if (!key && !action) return null;
  return Object.assign({},
    key ? { key } : {},
    action ? { action } : {},
    requiredActor ? { requiredActor } : {}
  );
}

function ownerReviewStageSummary(value = {}) {
  const readback = objectOnly(value);
  const direct = objectOnly(readback.ownerReviewStageSummary || readback.owner_review_stage_summary);
  const ownerItem = asArray(readback.items || readback.evidenceItems || readback.evidence_items)
    .map(objectOnly)
    .find((item) => {
      const key = cleanString(item.key || item.evidenceKey || item.evidence_key, 160);
      const checkKey = cleanString(item.checkKey || item.check_key, 160);
      return key === "ownerReviewEvidence" || key === "owner_review_evidence" || checkKey === "owner_review_evidence";
    });
  const summary = Object.keys(direct).length
    ? direct
    : objectOnly(ownerItem?.ownerReviewStageSummary || ownerItem?.owner_review_stage_summary);
  if (!Object.keys(summary).length) return null;
  const counters = {};
  let hasSignal = false;
  for (const key of OWNER_REVIEW_STAGE_SUMMARY_FIELDS) {
    const number = Number(fieldValue(summary, key) || 0) || 0;
    counters[key] = number;
    if (number > 0) hasSignal = true;
  }
  const failurePolicyReady = fieldValue(summary, "failurePolicyReady") === true;
  const failurePolicyStatus = cleanString(fieldValue(summary, "failurePolicyStatus"), 120);
  if (failurePolicyReady || failurePolicyStatus) hasSignal = true;
  const passedGateKeys = compactStringList(fieldValue(summary, "passedGateKeys"));
  const missingGateKeys = compactStringList(fieldValue(summary, "missingGateKeys"));
  const nextAction = compactNextAction(fieldValue(summary, "nextAction"));
  if (passedGateKeys.length || missingGateKeys.length || nextAction) hasSignal = true;
  if (!hasSignal) return null;
  return Object.assign({
    schemaVersion: "growth.learningAutomationReleaseReadback.ownerReviewStageSummary.v1",
    summaryOnly: true
  }, counters, {
    failurePolicyReady,
    failurePolicyStatus,
    passedGateKeys,
    missingGateKeys,
    nextAction
  });
}

function boundedLimit(value, fallback = 5) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.max(1, Math.min(50, Math.trunc(numeric)));
}

function scopeFrom(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id, 120);
  return {
    workspaceId,
    learnerId: cleanString(input.learnerId || input.learner_id || workspaceId, 120),
    programId: cleanString(input.programId || input.program_id, 160),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id, 160),
    domain: cleanString(input.domain, 120),
    subject: cleanString(input.subject, 120),
    horizon: cleanString(input.horizon || "daily_plan", 80) || "daily_plan",
    collectionRunId: cleanString(input.collectionRunId || input.collection_run_id || input.runId || input.run_id, 160),
    displayName: cleanString(input.displayName || input.display_name, 160),
    label: cleanString(input.label, 160)
  };
}

function scanPrivacyKeys(value, pathName = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacyKeys(item, `${pathName}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${pathName}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacyKeys(child, childPath, findings);
  }
  return findings;
}

function scanPrivateValues(value, pathName = "$", findings = []) {
  if (typeof value === "string") {
    if (PRIVATE_VALUE_PATTERN.test(value)) findings.push(pathName);
    return findings;
  }
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivateValues(item, `${pathName}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    scanPrivateValues(child, `${pathName}.${key}`, findings);
  }
  return findings;
}

function unavailable(error, scope = {}, extra = {}) {
  return Object.assign({}, scope, {
    ok: false,
    source: "growth-learning-automation-release-inventory-service",
    schemaVersion: RELEASE_INVENTORY_SCHEMA,
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "blocked",
    error: cleanString(error, 180) || "learning_automation_release_inventory_unavailable",
    advisoryOnly: true,
    recordOnly: true,
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false
  }, extra);
}

function firstAvailableId(record = {}, keys = []) {
  for (const key of keys) {
    const value = cleanString(record[key], 180);
    if (value) return value;
  }
  return "";
}

function primaryIdKeys(kind) {
  const byKind = {
    release_readiness_snapshot: ["readinessId", "readiness_id", "snapshotId", "snapshot_id"],
    release_collection_run: ["collectionRunId", "collection_run_id", "runId", "run_id"],
    release_decision: ["decisionId", "decision_id"],
    release_package: ["packageId", "package_id"],
    release_preflight: ["preflightReportId", "preflight_report_id", "reportId", "report_id"],
    release_approval: ["approvalId", "approval_id"],
    release_evidence: ["evidenceRecordId", "evidence_record_id"],
    release_activation: ["activationId", "activation_id"],
    runtime_enablement: ["enablementId", "enablement_id"]
  };
  return byKind[kind] || [];
}

function packageDashboardFields(record = {}) {
  const stepSummary = objectOnly(record.stepSummary || record.step_summary);
  const dashboard = objectOnly(record.releaseDashboardSummary || record.release_dashboard_summary || record.dashboardSummary || record.dashboard_summary);
  const nextAction = objectOnly(dashboard.nextAction || dashboard.next_action);
  return {
    latestPackageStepCount: Number(stepSummary.stepCount || stepSummary.step_count || 0) || 0,
    latestPackageDashboardStatus: cleanString(dashboard.status, 120),
    latestPackageDashboardReadinessStatus: cleanString(dashboard.readinessStatus || dashboard.readiness_status, 120),
    latestPackageDashboardControlsStatus: cleanString(dashboard.controlsStatus || dashboard.controls_status, 120),
    latestPackageDashboardInventoryStatus: cleanString(dashboard.inventoryStatus || dashboard.inventory_status, 120),
    latestPackageDashboardRequiredActionCount: Number(dashboard.requiredActionCount || dashboard.required_action_count || 0) || 0,
    latestPackageDashboardNextActionKey: cleanString(nextAction.key || dashboard.nextActionKey || dashboard.next_action_key, 140),
    releaseDashboardSummary: {
      schemaVersion: cleanString(dashboard.schemaVersion || dashboard.schema_version, 180),
      summaryOnly: dashboard.summaryOnly === true || dashboard.summary_only === true,
      status: cleanString(dashboard.status, 120),
      readinessStatus: cleanString(dashboard.readinessStatus || dashboard.readiness_status, 120),
      controlsStatus: cleanString(dashboard.controlsStatus || dashboard.controls_status, 120),
      inventoryStatus: cleanString(dashboard.inventoryStatus || dashboard.inventory_status, 120),
      requiredActionCount: Number(dashboard.requiredActionCount || dashboard.required_action_count || 0) || 0,
      ownerReviewStageSummary: objectOnly(dashboard.ownerReviewStageSummary || dashboard.owner_review_stage_summary),
      latestReadinessOwnerReviewStageSummary: objectOnly(dashboard.latestReadinessOwnerReviewStageSummary || dashboard.latest_readiness_owner_review_stage_summary),
      nextAction: nextAction.key ? {
        key: cleanString(nextAction.key, 140),
        action: cleanString(nextAction.action || nextAction.type || nextAction.reason, 180),
        requiredActor: cleanString(nextAction.requiredActor || nextAction.required_actor || nextAction.actor, 80)
      } : null,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false
    }
  };
}

function evidenceReadbackSummary(record = {}) {
  const readback = objectOnly(record.evidenceReadback || record.evidence_readback);
  const sourceBundle = objectOnly(readback.sourceBundle || readback.source_bundle);
  return {
    schemaVersion: "growth.learningAutomationReleaseInventory.evidenceReadbackSummary.v1",
    summaryOnly: true,
    evidenceCount: Number(readback.evidenceCount || readback.evidence_count || 0) || 0,
    presentCount: Number(readback.presentCount || readback.present_count || 0) || 0,
    missingCount: Number(readback.missingCount || readback.missing_count || 0) || 0,
    missingCheckKeys: unique(readback.missingCheckKeys || readback.missing_check_keys),
    presentEvidenceKeys: unique(readback.presentEvidenceKeys || readback.present_evidence_keys),
    sourceBundleId: cleanString(sourceBundle.bundleId || sourceBundle.bundle_id || sourceBundle.evidenceBundleId || sourceBundle.evidence_bundle_id, 180),
    sourceBundleStatus: cleanString(sourceBundle.status, 120),
    sourceBundleTaskCount: Number(sourceBundle.taskCount || sourceBundle.task_count || 0) || 0,
    sourceBundlePassCount: Number(sourceBundle.passCount || sourceBundle.pass_count || 0) || 0,
    ownerReviewStageSummary: ownerReviewStageSummary(readback) || undefined,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  };
}

function recordSummary(kind, record = {}) {
  const packageSummary = objectOnly(record.packageSummary || record.package_summary);
  const activationGates = record.requestedActivationGates || record.requested_activation_gates || record.activationGates || record.activation_gates;
  const approvalKey = cleanString(record.approvalKey || record.approval_key || record.gate || record.configKey || record.config_key, 160);
  const evidenceKey = cleanString(record.evidenceKey || record.evidence_key, 160);
  const checkKey = cleanString(record.checkKey || record.check_key, 160);
  const id = firstAvailableId(record, primaryIdKeys(kind).concat([
    "readinessId", "readiness_id",
    "snapshotId", "snapshot_id",
    "decisionId", "decision_id",
    "packageId", "package_id",
    "preflightReportId", "preflight_report_id", "reportId", "report_id",
    "approvalId", "approval_id",
    "evidenceRecordId", "evidence_record_id",
    "activationId", "activation_id",
    "enablementId", "enablement_id",
    "collectionRunId", "collection_run_id", "runId", "run_id"
  ]));
  const summary = {
    kind,
    id,
    status: cleanString(record.status || packageSummary.status, 120),
    schemaVersion: cleanString(record.schemaVersion || record.schema_version || record.packageVersion || record.package_version, 180),
    privacyClass: cleanString(record.privacyClass || record.privacy_class || packageSummary.privacyClass || packageSummary.privacy_class, 80),
    collectionRunId: cleanString(record.collectionRunId || record.collection_run_id || record.runId || record.run_id || packageSummary.collectionRunId || packageSummary.collection_run_id, 180),
    approvalKey,
    requestedActivationGates: unique(activationGates),
    createdAt: cleanString(record.createdAt || record.created_at || record.recordedAt || record.recorded_at || record.decidedAt || record.decided_at || record.approvedAt || record.approved_at, 80),
    updatedAt: cleanString(record.updatedAt || record.updated_at, 80),
    summaryOnly: true,
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false
  };
  if (kind === "release_readiness_snapshot") {
    return Object.assign(summary, {
      evidenceReadback: evidenceReadbackSummary(record)
    });
  }
  if (kind === "release_evidence") {
    return Object.assign(summary, {
      evidenceKey,
      checkKey,
      observedAt: cleanString(record.observedAt || record.observed_at, 80)
    });
  }
  if (kind === "release_package") return Object.assign(summary, packageDashboardFields(record));
  if (kind === "release_preflight") {
    const releasePreflight = objectOnly(record.releasePreflight || record.release_preflight || record.summary);
    return Object.assign(summary, {
      preflightReportId: summary.id,
      readyForProductionDeploy: false,
      readyForProductionDeployReview: releasePreflight.readyForProductionDeployReview === true || releasePreflight.ready_for_production_deploy_review === true,
      readyForOwnerReleaseActivation: releasePreflight.readyForOwnerReleaseActivation === true || releasePreflight.ready_for_owner_release_activation === true,
      backendEvidenceComplete: releasePreflight.backendEvidenceComplete === true || releasePreflight.backend_evidence_complete === true
    });
  }
  return summary;
}

function listSummary(kind, result = {}, recordsKey) {
  const value = objectOnly(result);
  if (value.ok === false) {
    return {
      schemaVersion: "growth.learningAutomationReleaseInventory.records.v1",
      summaryOnly: true,
      kind,
      ok: false,
      status: "blocked",
      error: cleanString(value.error || `${kind}_readback_failed`, 180),
      count: 0,
      statuses: [],
      latest: null,
      ids: [],
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false
    };
  }
  const records = asArray(value[recordsKey]);
  const summaries = records.map((record) => recordSummary(kind, record)).filter((record) => record.id || record.status);
  return {
    schemaVersion: "growth.learningAutomationReleaseInventory.records.v1",
    summaryOnly: true,
    kind,
    ok: true,
    status: summaries.length ? "records_available" : "records_missing",
    count: Number(value.count) || summaries.length,
    statuses: unique(summaries.map((record) => record.status)),
    latest: summaries[0] || null,
    ids: summaries.map((record) => record.id).filter(Boolean),
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  };
}

function requireMethod(scope, name, service, method) {
  if (!service || typeof service[method] !== "function") {
    return unavailable(`learning_automation_release_inventory_${name}_unavailable`, scope);
  }
  return null;
}

function controlsSummary(value = {}) {
  const controls = objectOnly(value.releaseControls || value.release_controls);
  return {
    schemaVersion: "growth.learningAutomationReleaseInventory.controls.v1",
    summaryOnly: true,
    ok: value.ok !== false,
    status: cleanString(value.status || controls.status || value.error || "unknown", 120),
    controlsSchemaVersion: cleanString(value.schemaVersion || value.schema_version, 180),
    requiredActionCount: Number(controls.requiredActionCount || controls.required_action_count || 0) || 0,
    nextActionKey: cleanString(objectOnly(controls.nextAction || controls.next_action).key, 160),
    missingCheckKeys: unique(controls.missingCheckKeys || controls.missing_check_keys),
    blockedCheckKeys: unique(controls.blockedCheckKeys || controls.blocked_check_keys),
    missingEvidenceKeys: unique(controls.missingEvidenceKeys || controls.missing_evidence_keys),
    missingApprovalKeys: unique(controls.missingApprovalKeys || controls.missing_approval_keys),
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  };
}

function inventoryStatus(controls, summaries) {
  if (controls.ok === false || summaries.some((summary) => summary.ok === false)) return "blocked";
  if (controls.status && controls.status !== "unknown") return controls.status;
  return summaries.some((summary) => summary.count > 0) ? "records_available" : "records_missing";
}

function createLearningAutomationReleaseInventoryService(options = {}) {
  const releaseReadinessService = options.releaseReadinessService || null;
  const collectionRunService = options.collectionRunService || null;
  const decisionService = options.decisionService || null;
  const packageService = options.packageService || null;
  const approvalService = options.approvalService || null;
  const releaseEvidenceService = options.releaseEvidenceService || null;
  const preflightReportRepository = options.preflightReportRepository || null;
  const releaseActivationService = options.releaseActivationService || null;
  const runtimeEnablementService = options.runtimeEnablementService || null;
  const releaseControlsService = options.releaseControlsService || null;

  function inventory(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_release_inventory_scope_required");
    const inputPrivacyFindings = scanPrivacyKeys(input).concat(scanPrivateValues(input)).slice(0, 16);
    if (inputPrivacyFindings.length) {
      return unavailable("learning_automation_release_inventory_privacy_failed", scope, { privacyFindings: inputPrivacyFindings });
    }

    const missing = requireMethod(scope, "readiness_snapshots", releaseReadinessService, "listSnapshots")
      || requireMethod(scope, "collection_runs", collectionRunService, "listRuns")
      || requireMethod(scope, "decisions", decisionService, "listDecisions")
      || requireMethod(scope, "packages", packageService, "listPackages")
      || requireMethod(scope, "approvals", approvalService, "listApprovals")
      || requireMethod(scope, "release_evidence", releaseEvidenceService, "listEvidence")
      || requireMethod(scope, "preflight_reports", preflightReportRepository, "listReports")
      || requireMethod(scope, "activations", releaseActivationService, "listActivations")
      || requireMethod(scope, "runtime_enablements", runtimeEnablementService, "listEnablements")
      || requireMethod(scope, "controls", releaseControlsService, "summarize");
    if (missing) return missing;

    const limit = boundedLimit(input.limit || input.recordLimit || input.record_limit, 5);
    const request = Object.assign({}, input, scope, { limit });
    const result = {
      controls: releaseControlsService.summarize(request),
      snapshots: releaseReadinessService.listSnapshots(request),
      collectionRuns: collectionRunService.listRuns(request),
      decisions: decisionService.listDecisions(request),
      packages: packageService.listPackages(request),
      approvals: approvalService.listApprovals(request),
      releaseEvidence: releaseEvidenceService.listEvidence(request),
      preflightReports: asArray(preflightReportRepository.listReports(request)),
      activations: releaseActivationService.listActivations(request),
      runtimeEnablements: runtimeEnablementService.listEnablements(request)
    };
    const dependencyPrivacyFindings = scanPrivacyKeys(result).concat(scanPrivateValues(result)).slice(0, 16);
    if (dependencyPrivacyFindings.length) {
      return unavailable("learning_automation_release_inventory_dependency_privacy_failed", scope, { privacyFindings: dependencyPrivacyFindings });
    }

    const summaries = [
      listSummary("release_readiness_snapshot", result.snapshots, "snapshots"),
      listSummary("release_collection_run", result.collectionRuns, "runs"),
      listSummary("release_decision", result.decisions, "decisions"),
      listSummary("release_package", result.packages, "packages"),
      listSummary("release_approval", result.approvals, "approvals"),
      listSummary("release_evidence", result.releaseEvidence, "evidence"),
      listSummary("release_preflight", { ok: true, count: result.preflightReports.length, reports: result.preflightReports }, "reports"),
      listSummary("release_activation", result.activations, "activations"),
      listSummary("runtime_enablement", result.runtimeEnablements, "enablements")
    ];
    const controls = controlsSummary(objectOnly(result.controls));
    const status = inventoryStatus(controls, summaries);
    const artifactCount = summaries.reduce((total, summary) => total + (Number(summary.count) || 0), 0);
    const latestSnapshot = objectOnly(summaries.find((summary) => summary.kind === "release_readiness_snapshot")?.latest);
    const latestSnapshotEvidenceReadback = objectOnly(latestSnapshot.evidenceReadback);
    const latestPackage = objectOnly(summaries.find((summary) => summary.kind === "release_package")?.latest);
    const latestPreflight = objectOnly(summaries.find((summary) => summary.kind === "release_preflight")?.latest);
    const releaseEvidenceSummary = objectOnly(summaries.find((summary) => summary.kind === "release_evidence"));
    const latestReleaseEvidence = objectOnly(releaseEvidenceSummary.latest);

    return Object.assign({}, scope, {
      ok: true,
      source: "growth-learning-automation-release-inventory-service",
      schemaVersion: RELEASE_INVENTORY_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      status,
      advisoryOnly: true,
      recordOnly: true,
      limit,
      releaseInventory: {
        schemaVersion: "growth.learningAutomationReleaseInventory.summary.v1",
        summaryOnly: true,
        status,
        artifactCount,
        controls,
        readbackKinds: summaries.map((summary) => summary.kind),
        missingRecordKinds: summaries.filter((summary) => summary.status === "records_missing").map((summary) => summary.kind),
        blockedRecordKinds: summaries.filter((summary) => summary.ok === false).map((summary) => summary.kind),
        latestReadinessSnapshotId: cleanString(latestSnapshot.id, 180),
    latestReadinessEvidencePresentCount: Number(latestSnapshotEvidenceReadback.presentCount || 0) || 0,
    latestReadinessEvidenceMissingCount: Number(latestSnapshotEvidenceReadback.missingCount || 0) || 0,
    latestReadinessEvidenceSourceBundleId: cleanString(latestSnapshotEvidenceReadback.sourceBundleId, 180),
    latestReadinessOwnerReviewStageSummary: latestSnapshotEvidenceReadback.ownerReviewStageSummary || null,
        latestCollectionRunId: cleanString(summaries.find((summary) => summary.kind === "release_collection_run")?.latest?.id, 180),
        latestPackageId: cleanString(summaries.find((summary) => summary.kind === "release_package")?.latest?.id, 180),
        latestPackageStepCount: Number(latestPackage.latestPackageStepCount || 0) || 0,
        latestPackageDashboardStatus: cleanString(latestPackage.latestPackageDashboardStatus, 120),
        latestPackageDashboardNextActionKey: cleanString(latestPackage.latestPackageDashboardNextActionKey, 140),
        latestPackageDashboardRequiredActionCount: Number(latestPackage.latestPackageDashboardRequiredActionCount || 0) || 0,
        latestPreflightReportId: cleanString(latestPreflight.id || latestPreflight.preflightReportId, 180),
        latestPreflightStatus: cleanString(latestPreflight.status, 120),
        latestPreflightReadyForProductionDeployReview: latestPreflight.readyForProductionDeployReview === true,
        latestPreflightReadyForOwnerReleaseActivation: latestPreflight.readyForOwnerReleaseActivation === true,
        latestDecisionId: cleanString(summaries.find((summary) => summary.kind === "release_decision")?.latest?.id, 180),
        releaseEvidenceRecordCount: Number(releaseEvidenceSummary.count || 0) || 0,
        latestReleaseEvidenceRecordId: cleanString(latestReleaseEvidence.id, 180),
        latestReleaseEvidenceKey: cleanString(latestReleaseEvidence.evidenceKey, 160),
        latestReleaseEvidenceCheckKey: cleanString(latestReleaseEvidence.checkKey, 160),
        latestReleaseEvidenceStatus: cleanString(latestReleaseEvidence.status, 120),
        latestActivationId: cleanString(summaries.find((summary) => summary.kind === "release_activation")?.latest?.id, 180),
        latestRuntimeEnablementId: cleanString(summaries.find((summary) => summary.kind === "runtime_enablement")?.latest?.id, 180),
        writefulSchedulingAllowed: false,
        runtimeConfigChange: false,
        configChangeApplied: false
      },
      artifactReadback: {
        schemaVersion: "growth.learningAutomationReleaseInventory.artifactReadback.v1",
        summaryOnly: true,
        snapshots: summaries[0],
        collectionRuns: summaries[1],
        decisions: summaries[2],
        packages: summaries[3],
        approvals: summaries[4],
        releaseEvidence: summaries[5],
        preflightReports: summaries[6],
        activations: summaries[7],
        runtimeEnablements: summaries[8],
        controls
      },
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false,
      runtimeConfigMutationPerformed: false
    });
  }

  return { inventory };
}

module.exports = {
  RELEASE_INVENTORY_SCHEMA,
  createLearningAutomationReleaseInventoryService
};
