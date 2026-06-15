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

function publicPackage(record = null) {
  if (!record) return null;
  return {
    packageId: cleanString(record.packageId || record.package_id, 180),
    status: cleanString(record.status, 80),
    packageVersion: cleanString(record.packageVersion || record.package_version || record.schemaVersion || record.schema_version, 180),
    collectionRunId: cleanString(record.collectionRunId || record.collection_run_id, 180),
    privacyClass: cleanString(record.privacyClass || record.privacy_class, 80),
    summaryOnly: true,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  };
}

function reviewSummary(review = {}) {
  const releaseReview = objectOnly(review.releaseReview || review.release_review);
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
