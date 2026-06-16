"use strict";

const RELEASE_REVIEW_SCHEMA = "growth.learningAutomationReleaseReview.v1";
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
  const workspaceId = cleanString(input.workspaceId || input.workspace_id, 120);
  return {
    workspaceId,
    learnerId: cleanString(input.learnerId || input.learner_id || workspaceId, 120),
    programId: cleanString(input.programId || input.program_id, 160),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id, 160),
    domain: cleanString(input.domain, 120),
    subject: cleanString(input.subject, 120),
    horizon: cleanString(input.horizon || "daily_plan", 80) || "daily_plan",
    displayName: cleanString(input.displayName || input.display_name, 160),
    label: cleanString(input.label, 160)
  };
}

function unavailable(error, extra = {}) {
  return Object.assign({
    ok: false,
    source: "growth-learning-automation-release-review-service",
    error: cleanString(error) || "learning_automation_release_review_unavailable"
  }, extra);
}

function firstItem(result, key) {
  return asArray(result && result[key])[0] || null;
}

function publicDashboardAction(action = {}) {
  const value = objectOnly(action);
  const key = cleanString(value.key || value.checkKey || value.check_key || value.evidenceKey || value.evidence_key, 140);
  if (!key) return null;
  return {
    key,
    action: cleanString(value.action || value.type || value.reason, 180),
    requiredActor: cleanString(value.requiredActor || value.required_actor || value.actor, 80)
  };
}

function publicDashboardSummary(record = {}) {
  const dashboardSummary = objectOnly(
    record.releaseDashboardSummary
    || record.release_dashboard_summary
    || record.dashboardSummary
    || record.dashboard_summary
  );
  const nextAction = publicDashboardAction(dashboardSummary.nextAction || dashboardSummary.next_action);
  return {
    schemaVersion: cleanString(dashboardSummary.schemaVersion || dashboardSummary.schema_version, 180),
    summaryOnly: dashboardSummary.summaryOnly === true || dashboardSummary.summary_only === true,
    status: cleanString(dashboardSummary.status, 120),
    readinessStatus: cleanString(dashboardSummary.readinessStatus || dashboardSummary.readiness_status, 120),
    controlsStatus: cleanString(dashboardSummary.controlsStatus || dashboardSummary.controls_status, 120),
    inventoryStatus: cleanString(dashboardSummary.inventoryStatus || dashboardSummary.inventory_status, 120),
    requiredActionCount: Number(dashboardSummary.requiredActionCount || dashboardSummary.required_action_count || 0) || 0,
    nextAction,
    latestCollectionRunId: cleanString(dashboardSummary.latestCollectionRunId || dashboardSummary.latest_collection_run_id, 180),
    readinessEvidencePresentCount: Number(dashboardSummary.readinessEvidencePresentCount || dashboardSummary.readiness_evidence_present_count || 0) || 0,
    readinessEvidenceMissingCount: Number(dashboardSummary.readinessEvidenceMissingCount || dashboardSummary.readiness_evidence_missing_count || 0) || 0,
    readinessEvidenceSourceBundleId: cleanString(dashboardSummary.readinessEvidenceSourceBundleId || dashboardSummary.readiness_evidence_source_bundle_id, 180),
    latestReadinessSnapshotId: cleanString(dashboardSummary.latestReadinessSnapshotId || dashboardSummary.latest_readiness_snapshot_id, 180),
    latestReadinessEvidencePresentCount: Number(dashboardSummary.latestReadinessEvidencePresentCount || dashboardSummary.latest_readiness_evidence_present_count || 0) || 0,
    latestReadinessEvidenceMissingCount: Number(dashboardSummary.latestReadinessEvidenceMissingCount || dashboardSummary.latest_readiness_evidence_missing_count || 0) || 0,
    latestReadinessEvidenceSourceBundleId: cleanString(dashboardSummary.latestReadinessEvidenceSourceBundleId || dashboardSummary.latest_readiness_evidence_source_bundle_id, 180),
    latestPackageId: cleanString(dashboardSummary.latestPackageId || dashboardSummary.latest_package_id || record.packageId || record.package_id, 180),
    latestDecisionId: cleanString(dashboardSummary.latestDecisionId || dashboardSummary.latest_decision_id, 180),
    latestActivationId: cleanString(dashboardSummary.latestActivationId || dashboardSummary.latest_activation_id, 180),
    latestRuntimeEnablementId: cleanString(dashboardSummary.latestRuntimeEnablementId || dashboardSummary.latest_runtime_enablement_id, 180),
    persistedEvidenceKeys: asArray(dashboardSummary.persistedEvidenceKeys || dashboardSummary.persisted_evidence_keys).map((key) => cleanString(key, 160)).filter(Boolean),
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  };
}

function latestCollectionRun(collectionRunService, scope, input) {
  if (!collectionRunService || typeof collectionRunService.listRuns !== "function") {
    return unavailable("learning_automation_release_review_collection_run_unavailable");
  }
  const result = collectionRunService.listRuns(Object.assign({}, scope, {
    collectionRunId: input.collectionRunId || input.collection_run_id || input.runId || input.run_id || "",
    limit: 1
  }));
  if (!result?.ok) return unavailable(result?.error || "learning_automation_release_review_collection_run_failed");
  return {
    ok: true,
    count: Number(result.count || asArray(result.runs).length || 0) || 0,
    run: firstItem(result, "runs")
  };
}

function latestDecision(decisionService, scope, input, collectionRun) {
  if (!decisionService || typeof decisionService.listDecisions !== "function") {
    return unavailable("learning_automation_release_review_decision_unavailable");
  }
  const runId = cleanString(
    input.collectionRunId
    || input.collection_run_id
    || input.runId
    || input.run_id
    || collectionRun?.collectionRunId
    || collectionRun?.collection_run_id
    || collectionRun?.runId
    || collectionRun?.run_id,
    160
  );
  const result = decisionService.listDecisions(Object.assign({}, scope, {
    collectionRunId: runId,
    limit: 1
  }));
  if (!result?.ok) return unavailable(result?.error || "learning_automation_release_review_decision_failed");
  return {
    ok: true,
    count: Number(result.count || asArray(result.decisions).length || 0) || 0,
    decision: firstItem(result, "decisions")
  };
}

function publicPackage(record = null) {
  if (!record) return null;
  const packageSummary = objectOnly(record.packageSummary || record.package_summary);
  const stepSummary = objectOnly(record.stepSummary || record.step_summary);
  const releaseDashboardSummary = publicDashboardSummary(record);
  return {
    packageId: cleanString(record.packageId || record.package_id, 180),
    status: cleanString(record.status || packageSummary.status, 80),
    packageVersion: cleanString(record.packageVersion || record.package_version || record.schemaVersion || record.schema_version, 180),
    collectionRunId: cleanString(record.collectionRunId || record.collection_run_id || packageSummary.collectionRunId || packageSummary.collection_run_id, 180),
    privacyClass: cleanString(record.privacyClass || record.privacy_class, 80),
    packageSummary: {
      schemaVersion: cleanString(packageSummary.schemaVersion || packageSummary.schema_version, 180),
      summaryOnly: packageSummary.summaryOnly === true || packageSummary.summary_only === true,
      status: cleanString(packageSummary.status || record.status, 80),
      ok: packageSummary.ok === true,
      collectionRunId: cleanString(packageSummary.collectionRunId || packageSummary.collection_run_id || record.collectionRunId || record.collection_run_id, 180),
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false
    },
    stepSummary: {
      schemaVersion: cleanString(stepSummary.schemaVersion || stepSummary.schema_version, 180),
      summaryOnly: stepSummary.summaryOnly === true || stepSummary.summary_only === true,
      status: cleanString(stepSummary.status || record.status, 80),
      stepCount: Number(stepSummary.stepCount || stepSummary.step_count || 0) || 0,
      passingStepCount: Number(stepSummary.passingStepCount || stepSummary.passing_step_count || 0) || 0,
      blockedStepCount: Number(stepSummary.blockedStepCount || stepSummary.blocked_step_count || 0) || 0,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false
    },
    releaseDashboardSummary,
    createdAt: cleanString(record.createdAt || record.created_at, 80),
    updatedAt: cleanString(record.updatedAt || record.updated_at, 80),
    summaryOnly: true,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  };
}

function packageReadbackSummary(packageResult = {}, packageRecordStatus = "") {
  const record = objectOnly(packageResult.package);
  const stepSummary = objectOnly(record.stepSummary);
  const dashboard = objectOnly(record.releaseDashboardSummary);
  const nextAction = publicDashboardAction(dashboard.nextAction);
  return {
    schemaVersion: "growth.learningAutomationReleaseReview.packageReadback.v1",
    summaryOnly: true,
    packageRecordReadbackAvailable: packageResult.readbackAvailable === true,
    packageRecordPresent: Boolean(packageResult.package),
    packageRecordStatus: cleanString(packageRecordStatus || record.status, 120),
    latestPackageId: cleanString(record.packageId || dashboard.latestPackageId, 180),
    latestPackageStepCount: Number(stepSummary.stepCount || 0) || 0,
    latestPackageDashboardStatus: cleanString(dashboard.status, 120),
    latestPackageDashboardReadinessStatus: cleanString(dashboard.readinessStatus, 120),
    latestPackageDashboardControlsStatus: cleanString(dashboard.controlsStatus, 120),
    latestPackageDashboardInventoryStatus: cleanString(dashboard.inventoryStatus, 120),
    latestPackageDashboardReadinessEvidencePresentCount: Number(dashboard.readinessEvidencePresentCount || 0) || 0,
    latestPackageDashboardReadinessEvidenceMissingCount: Number(dashboard.readinessEvidenceMissingCount || 0) || 0,
    latestPackageDashboardReadinessEvidenceSourceBundleId: cleanString(dashboard.readinessEvidenceSourceBundleId, 180),
    latestPackageDashboardLatestReadinessEvidencePresentCount: Number(dashboard.latestReadinessEvidencePresentCount || 0) || 0,
    latestPackageDashboardLatestReadinessEvidenceMissingCount: Number(dashboard.latestReadinessEvidenceMissingCount || 0) || 0,
    latestPackageDashboardLatestReadinessEvidenceSourceBundleId: cleanString(dashboard.latestReadinessEvidenceSourceBundleId, 180),
    latestPackageDashboardRequiredActionCount: Number(dashboard.requiredActionCount || 0) || 0,
    latestPackageDashboardNextActionKey: cleanString(nextAction && nextAction.key, 140),
    latestPackageDashboardNextAction: nextAction,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  };
}

function latestPackage(packageService, scope, input, collectionRun) {
  if (!collectionRun) {
    return {
      ok: true,
      readbackAvailable: Boolean(packageService && typeof packageService.listPackages === "function"),
      count: 0,
      package: null
    };
  }
  if (!packageService || typeof packageService.listPackages !== "function") {
    return {
      ok: true,
      readbackAvailable: false,
      count: 0,
      package: null
    };
  }
  const runId = cleanString(
    input.collectionRunId
    || input.collection_run_id
    || input.runId
    || input.run_id
    || collectionRun?.collectionRunId
    || collectionRun?.collection_run_id
    || collectionRun?.runId
    || collectionRun?.run_id,
    180
  );
  const result = packageService.listPackages(Object.assign({}, scope, {
    collectionRunId: runId,
    limit: 1
  }));
  if (!result?.ok) return unavailable(result?.error || "learning_automation_release_review_package_failed");
  return {
    ok: true,
    readbackAvailable: true,
    count: Number(result.count || asArray(result.packages).length || 0) || 0,
    package: publicPackage(firstItem(result, "packages"))
  };
}

function approvalBag(approvalService, scope) {
  if (!approvalService || typeof approvalService.approvalBag !== "function") {
    return {
      ok: true,
      releaseApproval: {},
      approvalKeys: []
    };
  }
  const result = approvalService.approvalBag(Object.assign({}, scope, {
    status: "approved",
    limit: 50
  }));
  if (!result?.ok) return unavailable(result?.error || "learning_automation_release_review_approval_failed");
  return {
    ok: true,
    releaseApproval: objectOnly(result.releaseApproval),
    approvalKeys: asArray(result.approvalKeys).map((key) => cleanString(key, 120)).filter(Boolean).sort()
  };
}

function currentReadiness(readinessService, input, scope) {
  if (!readinessService || typeof readinessService.evaluateReadiness !== "function") {
    return unavailable("learning_automation_release_review_readiness_unavailable");
  }
  const result = readinessService.evaluateReadiness(Object.assign({}, input, scope));
  if (!result?.ok) return unavailable(result?.error || "learning_automation_release_review_readiness_failed");
  return {
    ok: true,
    status: cleanString(result.status, 80),
    readyForReleaseReview: result.summary?.readyForReleaseReview === true || result.status === "ready_for_release_review",
    summary: objectOnly(result.summary),
    releaseReview: objectOnly(result.releaseReview),
    checkCount: asArray(result.checks).length,
    missingCheckKeys: asArray(result.releaseReview?.missingCheckKeys),
    blockedCheckKeys: asArray(result.releaseReview?.blockedCheckKeys),
    missingEvidenceKeys: asArray(result.releaseReview?.missingEvidenceKeys),
    requiredActionCount: Number(result.releaseReview?.requiredActionCount || 0) || 0,
    nextAction: result.releaseReview?.nextAction || null
  };
}

function deriveReviewStatus(readiness, collectionRun, decision, packageRecordStatus) {
  const decisionStatus = cleanString(decision?.status, 80);
  if (decisionStatus === "blocked") return "blocked";
  if (decisionStatus === "needs_evidence") return "needs_evidence";
  if (decisionStatus === "approved") {
    if (packageRecordStatus === "ready_for_release_review") return "approved";
    if (packageRecordStatus === "readback_unavailable") return "package_readback_unavailable";
    if (packageRecordStatus === "missing") return "package_record_required";
    if (packageRecordStatus === "blocked") return "package_record_blocked";
    return "package_record_incomplete";
  }
  const runStatus = cleanString(collectionRun?.status, 80);
  if (runStatus === "ready_for_release_review") return "ready_for_owner_decision";
  if (runStatus === "blocked") return "blocked";
  if (collectionRun) return "collection_run_incomplete";
  if (readiness.readyForReleaseReview) return "collection_run_required";
  return readiness.status || "incomplete";
}

function nextActionFor(status, readiness, collectionRun, decision) {
  if (status === "approved") return null;
  if (status === "blocked") {
    return {
      key: "resolve_release_blocker",
      action: "resolve_or_record_blocked_release_decision",
      requiredActor: "owner"
    };
  }
  if (!collectionRun && readiness.readyForReleaseReview) {
    return {
      key: "record_release_collection_run",
      action: "run_smoke_release_collection_run_write_record",
      requiredActor: "owner"
    };
  }
  if (collectionRun && !decision) {
    return {
      key: "record_release_decision",
      action: "run_smoke_release_decision_or_owner_route",
      requiredActor: "owner"
    };
  }
  if (status === "package_record_required") {
    return {
      key: "record_release_package",
      action: "run_smoke_release_package_write_record",
      requiredActor: "owner"
    };
  }
  if (status === "package_readback_unavailable") {
    return {
      key: "restore_release_package_readback",
      action: "restore_release_package_service_readback",
      requiredActor: "owner"
    };
  }
  if (status === "package_record_blocked" || status === "package_record_incomplete") {
    return {
      key: "resolve_release_package_record",
      action: "rebuild_or_review_release_package_record",
      requiredActor: "owner"
    };
  }
  return readiness.nextAction || {
    key: "complete_release_readiness_evidence",
    action: "complete_missing_release_evidence",
    requiredActor: "owner"
  };
}

function createLearningAutomationReleaseReviewService(options = {}) {
  const readinessService = options.readinessService || null;
  const collectionRunService = options.collectionRunService || null;
  const decisionService = options.decisionService || null;
  const approvalService = options.approvalService || null;
  const packageService = options.packageService || null;

  function review(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_release_review_scope_required");
    const privacyFindings = scanPrivacyKeys(input).slice(0, 16);
    const privateValueFindings = scanPrivateValues(input).slice(0, 16);
    if (privacyFindings.length || privateValueFindings.length) {
      return unavailable("learning_automation_release_review_privacy_failed", {
        privacyFindings,
        privateValueFindings
      });
    }

    const readiness = currentReadiness(readinessService, input, scope);
    if (!readiness.ok) return readiness;
    const collection = latestCollectionRun(collectionRunService, scope, input);
    if (!collection.ok) return collection;
    const decisionResult = latestDecision(decisionService, scope, input, collection.run);
    if (!decisionResult.ok) return decisionResult;
    const packageResult = latestPackage(packageService, scope, input, collection.run);
    if (!packageResult.ok) return packageResult;
    const approvals = approvalBag(approvalService, scope);
    if (!approvals.ok) return approvals;

    const packageRecordRequired = Boolean(collection.run);
    const packageRecordPresent = Boolean(packageResult.package);
    const packageRecordStatus = packageRecordPresent
      ? packageResult.package.status || "recorded"
      : packageRecordRequired
        ? packageResult.readbackAvailable ? "missing" : "readback_unavailable"
        : "not_required";
    const status = deriveReviewStatus(readiness, collection.run, decisionResult.decision, packageRecordStatus);
    const nextAction = nextActionFor(status, readiness, collection.run, decisionResult.decision);
    const packageReadback = packageReadbackSummary(packageResult, packageRecordStatus);
    const dependencyPrivacyFindings = scanPrivacyKeys({ readiness, collection, decisionResult, packageResult, approvals }).slice(0, 16);
    const dependencyPrivateValueFindings = scanPrivateValues({ readiness, collection, decisionResult, packageResult, approvals }).slice(0, 16);
    if (dependencyPrivacyFindings.length || dependencyPrivateValueFindings.length) {
      return unavailable("learning_automation_release_review_dependency_privacy_failed", {
        privacyFindings: dependencyPrivacyFindings,
        privateValueFindings: dependencyPrivateValueFindings
      });
    }
    const result = Object.assign({}, scope, {
      ok: true,
      source: "growth-learning-automation-release-review-service",
      schemaVersion: RELEASE_REVIEW_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      status,
      readyForReleaseReview: readiness.readyForReleaseReview,
      collectionRunRequired: readiness.readyForReleaseReview && !collection.run,
      collectionRunPresent: Boolean(collection.run),
      decisionPresent: Boolean(decisionResult.decision),
      packageRecordReadbackAvailable: packageResult.readbackAvailable === true,
      packageRecordRequired,
      packageRecordPresent,
      approvedForReleaseReview: status === "approved",
      advisoryOnly: true,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      readiness,
      latestCollectionRun: collection.run,
      latestDecision: decisionResult.decision,
      latestPackage: packageResult.package,
      packageReadback,
      approvalSummary: {
        schemaVersion: "growth.learningAutomationReleaseReview.approvalSummary.v1",
        summaryOnly: true,
        approvalKeys: approvals.approvalKeys,
        releaseApproval: approvals.releaseApproval,
        writefulSchedulingAllowed: false
      },
      releaseReview: {
        schemaVersion: "growth.learningAutomationReleaseReview.summary.v1",
        summaryOnly: true,
        status,
        packageRecordReadbackAvailable: packageResult.readbackAvailable === true,
        packageRecordRequired,
        packageRecordPresent,
        packageRecordStatus,
        latestPackageId: packageResult.package?.packageId || "",
        latestPackageStepCount: packageReadback.latestPackageStepCount,
        latestPackageDashboardStatus: packageReadback.latestPackageDashboardStatus,
        latestPackageDashboardReadinessStatus: packageReadback.latestPackageDashboardReadinessStatus,
        latestPackageDashboardControlsStatus: packageReadback.latestPackageDashboardControlsStatus,
        latestPackageDashboardInventoryStatus: packageReadback.latestPackageDashboardInventoryStatus,
        latestPackageDashboardReadinessEvidencePresentCount: packageReadback.latestPackageDashboardReadinessEvidencePresentCount,
        latestPackageDashboardReadinessEvidenceMissingCount: packageReadback.latestPackageDashboardReadinessEvidenceMissingCount,
        latestPackageDashboardReadinessEvidenceSourceBundleId: packageReadback.latestPackageDashboardReadinessEvidenceSourceBundleId,
        latestPackageDashboardLatestReadinessEvidencePresentCount: packageReadback.latestPackageDashboardLatestReadinessEvidencePresentCount,
        latestPackageDashboardLatestReadinessEvidenceMissingCount: packageReadback.latestPackageDashboardLatestReadinessEvidenceMissingCount,
        latestPackageDashboardLatestReadinessEvidenceSourceBundleId: packageReadback.latestPackageDashboardLatestReadinessEvidenceSourceBundleId,
        latestPackageDashboardRequiredActionCount: packageReadback.latestPackageDashboardRequiredActionCount,
        latestPackageDashboardNextActionKey: packageReadback.latestPackageDashboardNextActionKey,
        packageReadback,
        nextAction,
        requiredActionCount: nextAction ? Math.max(1, readiness.requiredActionCount || 0) : 0,
        missingCheckKeys: readiness.missingCheckKeys,
        blockedCheckKeys: readiness.blockedCheckKeys,
        missingEvidenceKeys: readiness.missingEvidenceKeys,
        writefulSchedulingAllowed: false,
        runtimeConfigChange: false
      }
    });
    const outputPrivacyFindings = scanPrivacyKeys(result).slice(0, 16);
    const outputPrivateValueFindings = scanPrivateValues(result).slice(0, 16);
    if (outputPrivacyFindings.length || outputPrivateValueFindings.length) {
      return unavailable("learning_automation_release_review_privacy_failed", {
        privacyFindings: outputPrivacyFindings,
        privateValueFindings: outputPrivateValueFindings
      });
    }
    return result;
  }

  return { review };
}

module.exports = {
  RELEASE_REVIEW_SCHEMA,
  createLearningAutomationReleaseReviewService
};
