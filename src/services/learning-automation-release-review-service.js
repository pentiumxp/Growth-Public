"use strict";

const RELEASE_REVIEW_SCHEMA = "growth.learningAutomationReleaseReview.v1";
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
    createdAt: cleanString(record.createdAt || record.created_at, 80),
    updatedAt: cleanString(record.updatedAt || record.updated_at, 80),
    summaryOnly: true,
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

function deriveReviewStatus(readiness, collectionRun, decision) {
  const decisionStatus = cleanString(decision?.status, 80);
  if (decisionStatus === "approved") return "approved";
  if (decisionStatus === "blocked") return "blocked";
  if (decisionStatus === "needs_evidence") return "needs_evidence";
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
    if (privacyFindings.length) return unavailable("learning_automation_release_review_privacy_failed", { privacyFindings });

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

    const status = deriveReviewStatus(readiness, collection.run, decisionResult.decision);
    const nextAction = nextActionFor(status, readiness, collection.run, decisionResult.decision);
    const packageRecordRequired = Boolean(collection.run);
    const packageRecordPresent = Boolean(packageResult.package);
    const packageRecordStatus = packageRecordPresent
      ? packageResult.package.status || "recorded"
      : packageRecordRequired
        ? packageResult.readbackAvailable ? "missing" : "readback_unavailable"
        : "not_required";
    return Object.assign({}, scope, {
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
        nextAction,
        requiredActionCount: nextAction ? Math.max(1, readiness.requiredActionCount || 0) : 0,
        missingCheckKeys: readiness.missingCheckKeys,
        blockedCheckKeys: readiness.blockedCheckKeys,
        missingEvidenceKeys: readiness.missingEvidenceKeys,
        writefulSchedulingAllowed: false,
        runtimeConfigChange: false
      }
    });
  }

  return { review };
}

module.exports = {
  RELEASE_REVIEW_SCHEMA,
  createLearningAutomationReleaseReviewService
};
