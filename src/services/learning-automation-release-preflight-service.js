"use strict";

const RELEASE_PREFLIGHT_SCHEMA = "growth.learningAutomationReleasePreflight.v1";

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization|localstorage|sessionstorage|cookie.*jar)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|X-Hermes-Web-Key|X-Hermes-Access-Key|access-key\.txt|access-key|launch-token)/i;

function cleanString(value, max = 500) {
  const text = String(value || "").trim();
  return text.length > max ? text.slice(0, max) : text;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function uniqueStrings(value, max = 24) {
  return Array.from(new Set(asArray(value).map((item) => cleanString(item, 180)).filter(Boolean))).slice(0, max);
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

function scopeFrom(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id, 160);
  return {
    workspaceId,
    learnerId: cleanString(input.learnerId || input.learner_id || workspaceId, 160),
    programId: cleanString(input.programId || input.program_id, 160),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id, 160),
    domain: cleanString(input.domain, 120),
    subject: cleanString(input.subject, 120),
    horizon: cleanString(input.horizon || "daily_plan", 80) || "daily_plan",
    collectionRunId: cleanString(input.collectionRunId || input.collection_run_id || input.runId || input.run_id, 180),
    displayName: cleanString(input.displayName || input.display_name, 160),
    label: cleanString(input.label || input.displayName || input.display_name, 160)
  };
}

function unavailable(error, scope = {}, extra = {}) {
  return Object.assign({}, scope, {
    ok: false,
    source: "growth-learning-automation-release-preflight-service",
    schemaVersion: RELEASE_PREFLIGHT_SCHEMA,
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "blocked",
    error: cleanString(error) || "learning_automation_release_preflight_unavailable",
    releasePreflight: {
      schemaVersion: "growth.learningAutomationReleasePreflight.summary.v1",
      summaryOnly: true,
      status: "blocked",
      nextAction: {
        key: cleanString(error, 140) || "release_preflight_unavailable",
        action: "review_release_preflight_dependency",
        requiredActor: "owner"
      },
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
    return unavailable(`learning_automation_release_preflight_${key}_unavailable`, scope);
  }
  return null;
}

function actionSummary(value = {}) {
  const action = objectOnly(value);
  const key = cleanString(action.key || action.checkKey || action.check_key || action.evidenceKey || action.evidence_key, 140);
  const actionName = cleanString(action.action || action.type || action.reason, 180);
  if (!key && !actionName) return null;
  return {
    key,
    action: actionName,
    requiredActor: cleanString(action.requiredActor || action.required_actor || action.actor || "owner", 80)
  };
}

function actionList(value, max = 16) {
  return asArray(value).map(actionSummary).filter(Boolean).slice(0, max);
}

function dashboardSummary(result = {}) {
  const summary = objectOnly(result.releaseDashboard);
  return {
    schemaVersion: "growth.learningAutomationReleasePreflight.dashboardSummary.v1",
    summaryOnly: true,
    status: cleanString(summary.status || result.status, 120),
    readinessStatus: cleanString(summary.readinessStatus, 120),
    controlsStatus: cleanString(summary.controlsStatus, 120),
    inventoryStatus: cleanString(summary.inventoryStatus, 120),
    readyForReleaseReview: summary.readyForReleaseReview === true,
    requiredActionCount: Number(summary.requiredActionCount || 0) || 0,
    nextAction: actionSummary(summary.nextAction),
    readinessEvidencePresentCount: Number(summary.readinessEvidencePresentCount || 0) || 0,
    readinessEvidenceMissingCount: Number(summary.readinessEvidenceMissingCount || 0) || 0,
    readinessEvidenceSourceBundleId: cleanString(summary.readinessEvidenceSourceBundleId, 180),
    latestReadinessSnapshotId: cleanString(summary.latestReadinessSnapshotId, 180),
    latestCollectionRunId: cleanString(summary.latestCollectionRunId, 180),
    latestDecisionId: cleanString(summary.latestDecisionId, 180),
    latestPackageId: cleanString(summary.latestPackageId, 180),
    latestActivationId: cleanString(summary.latestActivationId, 180),
    latestRuntimeEnablementId: cleanString(summary.latestRuntimeEnablementId, 180),
    missingCheckKeys: uniqueStrings(summary.missingCheckKeys),
    blockedCheckKeys: uniqueStrings(summary.blockedCheckKeys),
    missingEvidenceKeys: uniqueStrings(summary.missingEvidenceKeys),
    missingApprovalKeys: uniqueStrings(summary.missingApprovalKeys),
    missingRecordKinds: uniqueStrings(summary.missingRecordKinds),
    blockedRecordKinds: uniqueStrings(summary.blockedRecordKinds),
    persistedApprovalKeys: uniqueStrings(summary.persistedApprovalKeys),
    persistedEvidenceKeys: uniqueStrings(summary.persistedEvidenceKeys),
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false
  };
}

function workbenchSummary(result = {}) {
  const summary = objectOnly(result.releaseWorkbench);
  return {
    schemaVersion: "growth.learningAutomationReleasePreflight.workbenchSummary.v1",
    summaryOnly: true,
    status: cleanString(summary.status || result.status, 120),
    ownerActionCount: Number(summary.ownerActionCount || 0) || 0,
    nextAction: actionSummary(summary.nextAction),
    ownerActions: actionList(summary.ownerActions),
    releaseEvidenceCollectionTasks: uniqueStrings(summary.releaseEvidenceCollectionTasks),
    releaseEvidenceCollectionRequiredTaskIds: uniqueStrings(summary.releaseEvidenceCollectionRequiredTaskIds),
    writeGatedReleaseEvidenceCollectionTasks: uniqueStrings(summary.writeGatedReleaseEvidenceCollectionTasks),
    unsupportedReleaseEvidenceCollectionKeys: uniqueStrings(summary.unsupportedReleaseEvidenceCollectionKeys),
    missingCheckKeys: uniqueStrings(summary.missingCheckKeys),
    missingEvidenceKeys: uniqueStrings(summary.missingEvidenceKeys),
    missingApprovalKeys: uniqueStrings(summary.missingApprovalKeys),
    missingRecordKinds: uniqueStrings(summary.missingRecordKinds),
    blockedRecordKinds: uniqueStrings(summary.blockedRecordKinds),
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false
  };
}

function closureSummary(result = {}) {
  const summary = objectOnly(result.releaseClosure);
  const review = objectOnly(result.review);
  const gate = objectOnly(result.executionGate);
  return {
    schemaVersion: "growth.learningAutomationReleasePreflight.closureSummary.v1",
    summaryOnly: true,
    status: cleanString(summary.status || result.status, 120),
    backendEvidenceComplete: result.backendEvidenceComplete === true,
    readyForOwnerReleaseActivation: result.readyForOwnerReleaseActivation === true,
    reviewStatus: cleanString(review.status, 120),
    executionGateStatus: cleanString(gate.status, 120),
    executionAuthorized: gate.authorized === true,
    packageRecordReadbackAvailable: summary.packageRecordReadbackAvailable === true,
    packageRecordPresent: summary.packageRecordPresent === true,
    packageRecordStatus: cleanString(summary.packageRecordStatus || review.packageRecordStatus, 120),
    latestPackageId: cleanString(summary.latestPackageId || review.latestPackageId, 180),
    latestPackageDashboardStatus: cleanString(summary.latestPackageDashboardStatus, 120),
    latestPackageDashboardNextActionKey: cleanString(summary.latestPackageDashboardNextActionKey, 140),
    latestCollectionRunId: cleanString(objectOnly(result.latestCollectionRun).collectionRunId || objectOnly(result.latestCollectionRun).runId, 180),
    latestDecisionId: cleanString(objectOnly(result.latestDecision).decisionId, 180),
    missingApprovalKeys: uniqueStrings(gate.missingApprovalKeys),
    requiredActions: actionList(result.requiredActions || objectOnly(result.releaseClosure).requiredActions),
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false
  };
}

function chooseStatus(dashboard, workbench, closure) {
  if (closure.readyForOwnerReleaseActivation) return "ready_for_owner_release_activation";
  if (closure.status) return closure.status;
  if (dashboard.status) return dashboard.status;
  if (workbench.status) return workbench.status;
  return "blocked";
}

function firstAction(...actions) {
  for (const action of actions) {
    if (action && (action.key || action.action)) return action;
  }
  return null;
}

function buildPreflightSummary(scope, dashboard, workbench, closure) {
  const missingCheckKeys = uniqueStrings(dashboard.missingCheckKeys.concat(workbench.missingCheckKeys));
  const blockedCheckKeys = uniqueStrings(dashboard.blockedCheckKeys);
  const missingEvidenceKeys = uniqueStrings(dashboard.missingEvidenceKeys.concat(workbench.missingEvidenceKeys));
  const missingApprovalKeys = uniqueStrings(dashboard.missingApprovalKeys.concat(workbench.missingApprovalKeys, closure.missingApprovalKeys));
  const missingRecordKinds = uniqueStrings(dashboard.missingRecordKinds.concat(workbench.missingRecordKinds));
  const blockedRecordKinds = uniqueStrings(dashboard.blockedRecordKinds.concat(workbench.blockedRecordKinds));
  const status = chooseStatus(dashboard, workbench, closure);
  const backendEvidenceComplete = closure.backendEvidenceComplete === true;
  const requiredActionCount = Math.max(
    Number(dashboard.requiredActionCount || 0) || 0,
    workbench.ownerActionCount,
    missingCheckKeys.length + missingEvidenceKeys.length + missingApprovalKeys.length + missingRecordKinds.length + blockedRecordKinds.length
  );
  return Object.assign({}, scope, {
    schemaVersion: "growth.learningAutomationReleasePreflight.summary.v1",
    summaryOnly: true,
    status,
    backendEvidenceComplete,
    readyForOwnerReleaseActivation: closure.readyForOwnerReleaseActivation === true,
    readyForProductionDeploy: false,
    readyForProductionDeployReview: backendEvidenceComplete && missingCheckKeys.length === 0 && missingEvidenceKeys.length === 0 && missingApprovalKeys.length === 0 && missingRecordKinds.length === 0 && blockedRecordKinds.length === 0,
    requiredActionCount,
    nextAction: firstAction(closure.requiredActions[0], workbench.nextAction, dashboard.nextAction),
    missingCheckKeys,
    blockedCheckKeys,
    missingEvidenceKeys,
    missingApprovalKeys,
    missingRecordKinds,
    blockedRecordKinds,
    persistedApprovalKeys: dashboard.persistedApprovalKeys,
    persistedEvidenceKeys: dashboard.persistedEvidenceKeys,
    readinessEvidencePresentCount: dashboard.readinessEvidencePresentCount,
    readinessEvidenceMissingCount: dashboard.readinessEvidenceMissingCount,
    readinessEvidenceSourceBundleId: dashboard.readinessEvidenceSourceBundleId,
    ownerActionCount: workbench.ownerActionCount,
    releaseEvidenceCollectionTasks: workbench.releaseEvidenceCollectionTasks,
    releaseEvidenceCollectionRequiredTaskIds: workbench.releaseEvidenceCollectionRequiredTaskIds,
    unsupportedReleaseEvidenceCollectionKeys: workbench.unsupportedReleaseEvidenceCollectionKeys,
    latestReadinessSnapshotId: dashboard.latestReadinessSnapshotId,
    latestCollectionRunId: dashboard.latestCollectionRunId || closure.latestCollectionRunId,
    latestDecisionId: dashboard.latestDecisionId || closure.latestDecisionId,
    latestPackageId: dashboard.latestPackageId || closure.latestPackageId,
    latestActivationId: dashboard.latestActivationId,
    latestRuntimeEnablementId: dashboard.latestRuntimeEnablementId,
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false
  });
}

function publicRecord(record = {}) {
  const report = objectOnly(record);
  return {
    preflightReportId: cleanString(report.preflightReportId || report.preflight_report_id || report.reportId || report.report_id, 180),
    status: cleanString(report.status, 120),
    createdAt: cleanString(report.createdAt || report.created_at, 80),
    updatedAt: cleanString(report.updatedAt || report.updated_at, 80),
    releasePreflight: objectOnly(report.releasePreflight || report.release_preflight),
    privacyClass: cleanString(report.privacyClass || report.privacy_class, 80)
  };
}

function createLearningAutomationReleasePreflightService(options = {}) {
  const releaseDashboardService = options.releaseDashboardService || null;
  const releaseWorkbenchService = options.releaseWorkbenchService || null;
  const releaseClosureService = options.releaseClosureService || null;
  const repository = options.repository || null;

  function evaluate(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_release_preflight_scope_required", scope);
    const inputPrivacyFindings = scanPrivacyKeys(input).concat(scanPrivateValues(input)).slice(0, 16);
    if (inputPrivacyFindings.length) {
      return unavailable("learning_automation_release_preflight_privacy_failed", scope, { privacyFindings: inputPrivacyFindings });
    }
    const missing = requireMethod(scope, "dashboard", releaseDashboardService, "dashboard")
      || requireMethod(scope, "workbench", releaseWorkbenchService, "workbench")
      || requireMethod(scope, "closure", releaseClosureService, "summarize");
    if (missing) return missing;

    const request = Object.assign({}, input, scope);
    const dashboardResult = releaseDashboardService.dashboard(request);
    const workbenchResult = releaseWorkbenchService.workbench(request);
    const closureResult = releaseClosureService.summarize(request);
    const dependencyPrivacyFindings = scanPrivacyKeys({ dashboardResult, workbenchResult, closureResult })
      .concat(scanPrivateValues({ dashboardResult, workbenchResult, closureResult }))
      .slice(0, 16);
    if (dependencyPrivacyFindings.length) {
      return unavailable("learning_automation_release_preflight_dependency_privacy_failed", scope, { privacyFindings: dependencyPrivacyFindings });
    }
    if (dashboardResult.ok === false) return unavailable("learning_automation_release_preflight_dashboard_blocked", scope, { dependencyStatus: cleanString(dashboardResult.status, 120) });
    if (workbenchResult.ok === false) return unavailable("learning_automation_release_preflight_workbench_blocked", scope, { dependencyStatus: cleanString(workbenchResult.status, 120) });
    if (closureResult.ok === false) return unavailable("learning_automation_release_preflight_closure_blocked", scope, { dependencyStatus: cleanString(closureResult.status, 120) });

    const releaseDashboard = dashboardSummary(dashboardResult);
    const releaseWorkbench = workbenchSummary(workbenchResult);
    const releaseClosure = closureSummary(closureResult);
    const releasePreflight = buildPreflightSummary(scope, releaseDashboard, releaseWorkbench, releaseClosure);
    return Object.assign({}, scope, {
      ok: true,
      source: "growth-learning-automation-release-preflight-service",
      schemaVersion: RELEASE_PREFLIGHT_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      status: releasePreflight.status,
      advisoryOnly: true,
      recordOnly: true,
      releasePreflight,
      releaseDashboard,
      releaseWorkbench,
      releaseClosure,
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false
    });
  }

  function recordReport(input = {}) {
    if (!repository || typeof repository.recordReport !== "function") {
      return unavailable("learning_automation_release_preflight_repository_unavailable", scopeFrom(input));
    }
    const result = evaluate(input);
    if (!result.ok) return result;
    const writeAllowed = input.allowWritePreflight === true || input.allow_write_preflight === true || input.ownerAuthorizedWrite === true || input.owner_authorized_write === true;
    if (!writeAllowed) {
      return unavailable("learning_automation_release_preflight_write_not_authorized", scopeFrom(input), { releasePreflight: result.releasePreflight });
    }
    const record = repository.recordReport(Object.assign({}, result, {
      requestedBy: cleanString(input.requestedBy || input.requested_by || input.createdBy || input.created_by)
    }));
    if (!record?.ok) {
      return unavailable(record?.error || "learning_automation_release_preflight_record_failed", scopeFrom(input), {
        releasePreflight: result.releasePreflight,
        record
      });
    }
    return Object.assign({}, result, {
      report: publicRecord(record.report),
      duplicate: record.duplicate === true
    });
  }

  function listReports(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_release_preflight_scope_required", scope);
    if (!repository || typeof repository.listReports !== "function") {
      return unavailable("learning_automation_release_preflight_repository_unavailable", scope);
    }
    const reports = repository.listReports(Object.assign({}, input, scope));
    return Object.assign({}, scope, {
      ok: true,
      source: "growth-learning-automation-release-preflight-service",
      schemaVersion: "growth.learningAutomationReleasePreflightReportList.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      count: reports.length,
      reports: reports.map(publicRecord),
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false
    });
  }

  return {
    evaluate,
    listReports,
    recordReport
  };
}

module.exports = {
  RELEASE_PREFLIGHT_SCHEMA,
  createLearningAutomationReleasePreflightService
};
