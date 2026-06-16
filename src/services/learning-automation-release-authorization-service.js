"use strict";

const RELEASE_AUTHORIZATION_SCHEMA = "growth.learningAutomationReleaseAuthorization.v1";
const RELEASE_REVIEW_SCHEMA = "growth.learningAutomationReleaseReview.v1";
const DEFAULT_REQUIRED_APPROVAL_KEYS = Object.freeze(["writefulExecutionApproval"]);
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization|localstorage|sessionstorage|cookie.*jar)/i;

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

function unavailable(error, extra = {}) {
  return Object.assign({
    ok: false,
    source: "growth-learning-automation-release-authorization-service",
    error: cleanString(error) || "learning_automation_release_authorization_unavailable"
  }, extra);
}

function requiredApprovalKeys(input = {}) {
  const requested = asArray(input.requiredApprovalKeys || input.required_approval_keys)
    .map((key) => cleanString(key, 120))
    .filter(Boolean);
  return requested.length ? requested : DEFAULT_REQUIRED_APPROVAL_KEYS.slice();
}

function approvalKeysFrom(review = {}) {
  const approvalSummary = objectOnly(review.approvalSummary);
  const keys = new Set(asArray(approvalSummary.approvalKeys).map((key) => cleanString(key, 120)).filter(Boolean));
  const releaseApproval = objectOnly(approvalSummary.releaseApproval);
  for (const [key, value] of Object.entries(releaseApproval)) {
    if (value && typeof value === "object" && value.approved === true) keys.add(cleanString(key, 120));
  }
  return Array.from(keys).sort();
}

function publicCollectionRun(run = null) {
  if (!run) return null;
  return {
    collectionRunId: cleanString(run.collectionRunId || run.collection_run_id || run.runId || run.run_id, 160),
    runId: cleanString(run.runId || run.run_id || run.collectionRunId || run.collection_run_id, 160),
    status: cleanString(run.status, 80),
    privacyClass: cleanString(run.privacyClass || run.privacy_class, 80)
  };
}

function publicDecision(decision = null) {
  if (!decision) return null;
  return {
    decisionId: cleanString(decision.decisionId || decision.decision_id, 160),
    collectionRunId: cleanString(decision.collectionRunId || decision.collection_run_id || decision.runId || decision.run_id, 160),
    status: cleanString(decision.status, 80),
    privacyClass: cleanString(decision.privacyClass || decision.privacy_class, 80)
  };
}

function publicAction(action = null) {
  if (!action || typeof action !== "object") return null;
  const key = cleanString(action.key || action.checkKey || action.check_key || action.evidenceKey || action.evidence_key, 140);
  if (!key) return null;
  return {
    key,
    action: cleanString(action.action || action.type || action.reason, 180),
    requiredActor: cleanString(action.requiredActor || action.required_actor || action.actor, 80)
  };
}

function publicDashboardSummary(record = {}) {
  const dashboard = objectOnly(record.releaseDashboardSummary || record.release_dashboard_summary || record.dashboardSummary || record.dashboard_summary);
  const nextAction = publicAction(dashboard.nextAction || dashboard.next_action);
  return {
    schemaVersion: cleanString(dashboard.schemaVersion || dashboard.schema_version, 180),
    summaryOnly: dashboard.summaryOnly === true || dashboard.summary_only === true,
    status: cleanString(dashboard.status, 120),
    readinessStatus: cleanString(dashboard.readinessStatus || dashboard.readiness_status, 120),
    controlsStatus: cleanString(dashboard.controlsStatus || dashboard.controls_status, 120),
    inventoryStatus: cleanString(dashboard.inventoryStatus || dashboard.inventory_status, 120),
    requiredActionCount: Number(dashboard.requiredActionCount || dashboard.required_action_count || 0) || 0,
    nextAction,
    readinessEvidencePresentCount: Number(dashboard.readinessEvidencePresentCount || dashboard.readiness_evidence_present_count || 0) || 0,
    readinessEvidenceMissingCount: Number(dashboard.readinessEvidenceMissingCount || dashboard.readiness_evidence_missing_count || 0) || 0,
    readinessEvidenceSourceBundleId: cleanString(dashboard.readinessEvidenceSourceBundleId || dashboard.readiness_evidence_source_bundle_id, 180),
    latestReadinessSnapshotId: cleanString(dashboard.latestReadinessSnapshotId || dashboard.latest_readiness_snapshot_id, 180),
    latestReadinessEvidencePresentCount: Number(dashboard.latestReadinessEvidencePresentCount || dashboard.latest_readiness_evidence_present_count || 0) || 0,
    latestReadinessEvidenceMissingCount: Number(dashboard.latestReadinessEvidenceMissingCount || dashboard.latest_readiness_evidence_missing_count || 0) || 0,
    latestReadinessEvidenceSourceBundleId: cleanString(dashboard.latestReadinessEvidenceSourceBundleId || dashboard.latest_readiness_evidence_source_bundle_id, 180),
    persistedEvidenceKeys: asArray(dashboard.persistedEvidenceKeys || dashboard.persisted_evidence_keys).map((key) => cleanString(key, 160)).filter(Boolean),
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  };
}

function publicPackage(record = null) {
  if (!record) return null;
  const stepSummary = objectOnly(record.stepSummary || record.step_summary);
  return {
    packageId: cleanString(record.packageId || record.package_id, 180),
    status: cleanString(record.status, 80),
    packageVersion: cleanString(record.packageVersion || record.package_version || record.schemaVersion || record.schema_version, 180),
    collectionRunId: cleanString(record.collectionRunId || record.collection_run_id, 180),
    privacyClass: cleanString(record.privacyClass || record.privacy_class, 80),
    stepSummary: {
      summaryOnly: stepSummary.summaryOnly === true || stepSummary.summary_only === true,
      stepCount: Number(stepSummary.stepCount || stepSummary.step_count || 0) || 0
    },
    releaseDashboardSummary: publicDashboardSummary(record),
    summaryOnly: true,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  };
}

function packageReadbackSummary(review = {}) {
  const releaseReview = objectOnly(review.releaseReview || review.release_review);
  const readback = objectOnly(review.packageReadback || review.package_readback || releaseReview.packageReadback || releaseReview.package_readback);
  return {
    schemaVersion: cleanString(readback.schemaVersion || readback.schema_version || "growth.learningAutomationReleaseReview.packageReadback.v1", 180),
    summaryOnly: true,
    packageRecordReadbackAvailable: readback.packageRecordReadbackAvailable === true || review.packageRecordReadbackAvailable === true,
    packageRecordPresent: readback.packageRecordPresent === true || review.packageRecordPresent === true,
    packageRecordStatus: cleanString(readback.packageRecordStatus || releaseReview.packageRecordStatus || review.packageRecordStatus || review.package_record_status, 120),
    latestPackageId: cleanString(readback.latestPackageId || releaseReview.latestPackageId || review.latestPackageId || review.latest_package_id, 180),
    latestPackageStepCount: Number(readback.latestPackageStepCount || releaseReview.latestPackageStepCount || 0) || 0,
    latestPackageDashboardStatus: cleanString(readback.latestPackageDashboardStatus || releaseReview.latestPackageDashboardStatus, 120),
    latestPackageDashboardNextActionKey: cleanString(readback.latestPackageDashboardNextActionKey || releaseReview.latestPackageDashboardNextActionKey, 140),
    latestPackageDashboardReadinessEvidencePresentCount: Number(readback.latestPackageDashboardReadinessEvidencePresentCount || releaseReview.latestPackageDashboardReadinessEvidencePresentCount || 0) || 0,
    latestPackageDashboardReadinessEvidenceMissingCount: Number(readback.latestPackageDashboardReadinessEvidenceMissingCount || releaseReview.latestPackageDashboardReadinessEvidenceMissingCount || 0) || 0,
    latestPackageDashboardReadinessEvidenceSourceBundleId: cleanString(readback.latestPackageDashboardReadinessEvidenceSourceBundleId || releaseReview.latestPackageDashboardReadinessEvidenceSourceBundleId, 180),
    latestPackageDashboardLatestReadinessEvidencePresentCount: Number(readback.latestPackageDashboardLatestReadinessEvidencePresentCount || releaseReview.latestPackageDashboardLatestReadinessEvidencePresentCount || 0) || 0,
    latestPackageDashboardLatestReadinessEvidenceMissingCount: Number(readback.latestPackageDashboardLatestReadinessEvidenceMissingCount || releaseReview.latestPackageDashboardLatestReadinessEvidenceMissingCount || 0) || 0,
    latestPackageDashboardLatestReadinessEvidenceSourceBundleId: cleanString(readback.latestPackageDashboardLatestReadinessEvidenceSourceBundleId || releaseReview.latestPackageDashboardLatestReadinessEvidenceSourceBundleId, 180),
    latestPackageDashboardRequiredActionCount: Number(readback.latestPackageDashboardRequiredActionCount || releaseReview.latestPackageDashboardRequiredActionCount || 0) || 0,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  };
}

function reviewSummary(review = {}) {
  const releaseReview = objectOnly(review.releaseReview || review.release_review);
  const packageReadback = packageReadbackSummary(review);
  return {
    schemaVersion: cleanString(review.schemaVersion || review.schema_version, 120),
    status: cleanString(review.status, 80),
    approvedForReleaseReview: review.approvedForReleaseReview === true,
    collectionRunPresent: review.collectionRunPresent === true,
    decisionPresent: review.decisionPresent === true,
    packageRecordReadbackAvailable: review.packageRecordReadbackAvailable === true,
    packageRecordRequired: review.packageRecordRequired === true,
    packageRecordPresent: review.packageRecordPresent === true,
    packageRecordStatus: cleanString(releaseReview.packageRecordStatus || review.packageRecordStatus || review.package_record_status, 120),
    latestPackageId: cleanString(releaseReview.latestPackageId || review.latestPackageId || review.latest_package_id, 180),
    latestPackageStepCount: packageReadback.latestPackageStepCount,
    latestPackageDashboardStatus: packageReadback.latestPackageDashboardStatus,
    latestPackageDashboardNextActionKey: packageReadback.latestPackageDashboardNextActionKey,
    latestPackageDashboardRequiredActionCount: packageReadback.latestPackageDashboardRequiredActionCount,
    latestPackageDashboardReadinessEvidencePresentCount: packageReadback.latestPackageDashboardReadinessEvidencePresentCount,
    latestPackageDashboardReadinessEvidenceMissingCount: packageReadback.latestPackageDashboardReadinessEvidenceMissingCount,
    latestPackageDashboardReadinessEvidenceSourceBundleId: packageReadback.latestPackageDashboardReadinessEvidenceSourceBundleId,
    latestPackageDashboardLatestReadinessEvidencePresentCount: packageReadback.latestPackageDashboardLatestReadinessEvidencePresentCount,
    latestPackageDashboardLatestReadinessEvidenceMissingCount: packageReadback.latestPackageDashboardLatestReadinessEvidenceMissingCount,
    latestPackageDashboardLatestReadinessEvidenceSourceBundleId: packageReadback.latestPackageDashboardLatestReadinessEvidenceSourceBundleId,
    packageReadback,
    advisoryOnly: review.advisoryOnly === true,
    writefulSchedulingAllowed: review.writefulSchedulingAllowed === true,
    runtimeConfigChange: review.runtimeConfigChange === true,
    privacyClass: cleanString(review.privacyClass || review.privacy_class, 80),
    summaryOnly: review.summaryOnly === true || review.summary_only === true
  };
}

function decisionFor(review = {}, requiredKeys = []) {
  const summary = reviewSummary(review);
  const collectionRun = publicCollectionRun(review.latestCollectionRun);
  const latestDecision = publicDecision(review.latestDecision);
  const approvalKeys = approvalKeysFrom(review);
  const missingApprovalKeys = requiredKeys.filter((key) => !approvalKeys.includes(key));
  if (summary.schemaVersion !== RELEASE_REVIEW_SCHEMA) return { authorized: false, reason: "learning_automation_release_authorization_review_schema_invalid" };
  if (!summary.summaryOnly || summary.privacyClass !== "summary_only") return { authorized: false, reason: "learning_automation_release_authorization_review_not_summary_only" };
  if (summary.status !== "approved" || !summary.approvedForReleaseReview) return { authorized: false, reason: "learning_automation_release_authorization_review_not_approved" };
  if (!summary.advisoryOnly || summary.writefulSchedulingAllowed || summary.runtimeConfigChange) {
    return { authorized: false, reason: "learning_automation_release_authorization_review_boundary_invalid" };
  }
  if (!collectionRun || collectionRun.status !== "ready_for_release_review") {
    return { authorized: false, reason: "learning_automation_release_authorization_collection_run_missing" };
  }
  if (!latestDecision || latestDecision.status !== "approved") {
    return { authorized: false, reason: "learning_automation_release_authorization_decision_missing" };
  }
  if (summary.packageRecordRequired && !summary.packageRecordReadbackAvailable) {
    return { authorized: false, reason: "learning_automation_release_authorization_package_readback_unavailable" };
  }
  if (summary.packageRecordRequired && !summary.packageRecordPresent) {
    return { authorized: false, reason: "learning_automation_release_authorization_package_record_missing" };
  }
  if (summary.packageRecordRequired && summary.packageRecordStatus !== "ready_for_release_review") {
    return { authorized: false, reason: "learning_automation_release_authorization_package_record_not_ready" };
  }
  if (missingApprovalKeys.length) {
    return { authorized: false, reason: "learning_automation_release_authorization_approval_missing", missingApprovalKeys };
  }
  return { authorized: true, reason: "learning_automation_release_authorization_granted", missingApprovalKeys: [] };
}

function createLearningAutomationReleaseAuthorizationService(options = {}) {
  const releaseReviewService = options.releaseReviewService || null;

  function authorize(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_release_authorization_scope_required");
    const privacyFindings = scanPrivacyKeys(input).slice(0, 16);
    if (privacyFindings.length) return unavailable("learning_automation_release_authorization_privacy_failed", { privacyFindings });
    if (!releaseReviewService || typeof releaseReviewService.review !== "function") {
      return unavailable("learning_automation_release_authorization_review_unavailable");
    }
    const review = releaseReviewService.review(Object.assign({}, input, scope));
    if (!review?.ok) {
      return unavailable(review?.error || "learning_automation_release_authorization_review_failed", {
        authorized: false,
        status: "blocked"
      });
    }
    const reviewPrivacyFindings = scanPrivacyKeys(review).slice(0, 16);
    if (reviewPrivacyFindings.length) {
      return unavailable("learning_automation_release_authorization_review_privacy_failed", {
        authorized: false,
        status: "blocked",
        privacyFindings: reviewPrivacyFindings
      });
    }
    const keys = requiredApprovalKeys(input);
    const decision = decisionFor(review, keys);
    const authorized = decision.authorized === true;
    return Object.assign({}, scope, {
      ok: true,
      source: "growth-learning-automation-release-authorization-service",
      schemaVersion: RELEASE_AUTHORIZATION_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      status: authorized ? "authorized" : "blocked",
      authorized,
      reason: decision.reason,
      error: authorized ? "" : decision.reason,
      requiredApprovalKeys: keys,
      approvalKeys: approvalKeysFrom(review),
      missingApprovalKeys: decision.missingApprovalKeys || [],
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      enforcementOnly: true,
      review: reviewSummary(review),
      packageReadback: packageReadbackSummary(review),
      latestCollectionRun: publicCollectionRun(review.latestCollectionRun),
      latestDecision: publicDecision(review.latestDecision),
      latestPackage: publicPackage(review.latestPackage)
    });
  }

  return { authorize };
}

module.exports = {
  DEFAULT_REQUIRED_APPROVAL_KEYS,
  RELEASE_AUTHORIZATION_SCHEMA,
  createLearningAutomationReleaseAuthorizationService
};
