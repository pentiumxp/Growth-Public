"use strict";

const RELEASE_CONTROLS_SCHEMA = "growth.learningAutomationReleaseControls.v1";
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

function cleanString(value, max = 500) {
  const text = String(value || "").trim();
  return text.length > max ? text.slice(0, max) : text;
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function valueArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function unique(values = []) {
  return Array.from(new Set(values.map((value) => cleanString(value, 160)).filter(Boolean)));
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
    collectionRunId: cleanString(input.collectionRunId || input.collection_run_id || input.runId || input.run_id, 160),
    displayName: cleanString(input.displayName || input.display_name, 160),
    label: cleanString(input.label, 160)
  };
}

function unavailable(error, extra = {}) {
  return Object.assign({
    ok: false,
    source: "growth-learning-automation-release-controls-service",
    error: cleanString(error) || "learning_automation_release_controls_unavailable",
    schemaVersion: RELEASE_CONTROLS_SCHEMA,
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "blocked",
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

function publicAction(action = null) {
  if (!action || typeof action !== "object") return null;
  return {
    key: cleanString(action.key, 140),
    action: cleanString(action.action, 180),
    requiredActor: cleanString(action.requiredActor || action.required_actor, 80),
    approvalKey: cleanString(action.approvalKey || action.approval_key, 140)
  };
}

function actionCandidates(result = {}) {
  return asArray(objectOnly(result.runtimeEnablement).requiredActions)
    .concat(asArray(objectOnly(result.activationPreflight).requiredActions))
    .concat(asArray(objectOnly(result.releaseClosure).requiredActions))
    .concat(asArray(objectOnly(result.releaseReview).requiredActions))
    .concat(objectOnly(result.runtimeEnablement).nextAction ? [objectOnly(result.runtimeEnablement).nextAction] : [])
    .concat(objectOnly(result.activationPreflight).nextAction ? [objectOnly(result.activationPreflight).nextAction] : [])
    .concat(objectOnly(result.releaseClosure).nextAction ? [objectOnly(result.releaseClosure).nextAction] : [])
    .concat(objectOnly(result.releaseReview).nextAction ? [objectOnly(result.releaseReview).nextAction] : [])
    .map(publicAction)
    .filter(Boolean)
    .filter((action, index, actions) => actions.findIndex((item) => item.key === action.key) === index);
}

function step(key, result, extra = {}) {
  const value = objectOnly(result);
  return Object.assign({
    key,
    ok: value.ok !== false,
    status: cleanString(value.status || value.error || "unknown", 120),
    schemaVersion: cleanString(value.schemaVersion || value.schema_version, 160),
    privacyClass: cleanString(value.privacyClass || value.privacy_class, 80),
    summaryOnly: value.summaryOnly === true || value.summary_only === true,
    requiredActionCount: asArray(extra.requiredActions).length,
    nextAction: extra.nextAction || null,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false
  }, extra);
}

function statusFrom(parts) {
  const runtime = objectOnly(parts.runtime);
  const activation = objectOnly(parts.activation);
  const closure = objectOnly(parts.closure);
  const review = objectOnly(parts.review);
  const readiness = objectOnly(parts.readiness);
  const activationRecords = objectOnly(parts.activationRecords);
  const runtimeEnablementRecords = objectOnly(parts.runtimeEnablementRecords);

  if (!runtime.ok || !activation.ok || !closure.ok || !review.ok || !readiness.ok
    || activationRecords.ok === false || runtimeEnablementRecords.ok === false) return "blocked";
  if (readiness.readyForReleaseReview !== true) return "release_evidence_required";
  if (review.approvedForReleaseReview !== true) return "release_review_required";
  if (closure.backendEvidenceComplete !== true) return "release_closure_required";
  if (activation.status === "approval_required") return "release_approval_required";
  if (activation.status !== "ready_for_owner_config_enablement" && activation.status !== "already_enabled") {
    return "release_activation_required";
  }
  if (runtime.status === "verified_enabled") return "runtime_verified";
  if (runtime.status === "ready_for_manual_runtime_config_enablement") return "manual_runtime_config_required";
  if (runtime.status === "partial_config") return "manual_runtime_config_partial";
  if (runtime.status === "activation_record_required") return "activation_record_required";
  if (runtime.status === "activation_record_invalid") return "activation_record_invalid";
  return "release_controls_required";
}

function actionSourceForStatus(status, parts) {
  if (status === "release_evidence_required") return [parts.readiness, parts.review];
  if (status === "release_review_required") return [parts.review];
  if (status === "release_closure_required") return [parts.closure, parts.review];
  if (status === "release_approval_required" || status === "release_activation_required") return [parts.activation, parts.closure];
  if (status === "runtime_verified" || status === "manual_runtime_config_required" || status === "manual_runtime_config_partial"
    || status === "activation_record_required" || status === "activation_record_invalid") {
    return [parts.runtime];
  }
  return [parts.runtime, parts.activation, parts.closure, parts.review];
}

function collectActions(parts, status) {
  return actionSourceForStatus(status, parts)
    .flatMap(actionCandidates)
    .filter((action, index, actions) => actions.findIndex((item) => item.key === action.key) === index);
}

function collectMissing(parts) {
  const reviewSummary = objectOnly(parts.review.releaseReview);
  const closureSummary = objectOnly(parts.closure.releaseClosure);
  return {
    missingCheckKeys: unique(asArray(reviewSummary.missingCheckKeys).concat(asArray(closureSummary.missingCheckKeys))),
    blockedCheckKeys: unique(asArray(reviewSummary.blockedCheckKeys).concat(asArray(closureSummary.blockedCheckKeys))),
    missingEvidenceKeys: unique(asArray(reviewSummary.missingEvidenceKeys).concat(asArray(closureSummary.missingEvidenceKeys))),
    missingApprovalKeys: unique(asArray(parts.closure.missingApprovalKeys)
      .concat(asArray(closureSummary.missingApprovalKeys))
      .concat(asArray(parts.activation.missingApprovalKeys)))
  };
}

function evidenceReadbackSummary(readback = {}) {
  const value = objectOnly(readback);
  const sourceBundle = objectOnly(value.sourceBundle || value.source_bundle);
  return {
    schemaVersion: "growth.learningAutomationReleaseControls.evidenceReadbackSummary.v1",
    summaryOnly: true,
    evidenceCount: Number(value.evidenceCount || value.evidence_count || 0) || 0,
    presentCount: Number(value.presentCount || value.present_count || 0) || 0,
    missingCount: Number(value.missingCount || value.missing_count || 0) || 0,
    missingCheckKeys: unique(asArray(value.missingCheckKeys || value.missing_check_keys)),
    presentEvidenceKeys: unique(asArray(value.presentEvidenceKeys || value.present_evidence_keys)),
    sourceBundleId: cleanString(sourceBundle.bundleId || sourceBundle.bundle_id || sourceBundle.evidenceBundleId || sourceBundle.evidence_bundle_id, 180),
    sourceBundleStatus: cleanString(sourceBundle.status, 120),
    sourceBundleTaskCount: Number(sourceBundle.taskCount || sourceBundle.task_count || 0) || 0,
    sourceBundlePassCount: Number(sourceBundle.passCount || sourceBundle.pass_count || 0) || 0,
    ownerReviewStageSummary: ownerReviewStageSummary(value) || undefined,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  };
}

function boundedLimit(value, fallback = 20) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.max(1, Math.min(100, Math.trunc(numeric)));
}

function publicRecordSummary(record = {}, kind) {
  const activation = kind === "activation";
  return {
    recordId: cleanString(activation ? record.activationId || record.activation_id : record.enablementId || record.enablement_id, 160),
    status: cleanString(record.status, 120),
    version: cleanString(activation ? record.activationVersion || record.activation_version : record.enablementVersion || record.enablement_version, 160),
    privacyClass: cleanString(record.privacyClass || record.privacy_class, 80),
    collectionRunId: cleanString(record.collectionRunId || record.collection_run_id || record.runId || record.run_id, 160),
    requestedActivationGates: asArray(record.requestedActivationGates || record.requested_activation_gates).map((gate) => cleanString(gate, 120)).filter(Boolean),
    requiredConfigKeys: activation ? [] : asArray(record.requiredConfigKeys || record.required_config_keys).map((key) => cleanString(key, 120)).filter(Boolean),
    recordedAt: cleanString(record.recordedAt || record.recorded_at, 80),
    updatedAt: cleanString(record.updatedAt || record.updated_at, 80),
    summaryOnly: true,
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false
  };
}

function auditRecordReadback(kind, result = {}, recordsKey) {
  const value = objectOnly(result);
  if (value.ok === false) {
    return {
      schemaVersion: "growth.learningAutomationReleaseControls.auditRecords.v1",
      summaryOnly: true,
      kind,
      ok: false,
      status: "blocked",
      error: cleanString(value.error || "release_controls_audit_record_readback_failed", 180),
      count: 0,
      statuses: [],
      latest: null,
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false
    };
  }
  const records = asArray(value[recordsKey]);
  const summaries = records.map((record) => publicRecordSummary(record, kind)).filter((record) => record.recordId || record.status);
  return {
    schemaVersion: "growth.learningAutomationReleaseControls.auditRecords.v1",
    summaryOnly: true,
    kind,
    ok: true,
    status: summaries.length ? "records_available" : "records_missing",
    count: Number(value.count) || summaries.length,
    statuses: unique(summaries.map((record) => record.status)),
    latest: summaries[0] || null,
    latestRecordId: summaries[0]?.recordId || "",
    requestedActivationGates: unique(summaries.flatMap((record) => record.requestedActivationGates)),
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false
  };
}

function createLearningAutomationReleaseControlsService(options = {}) {
  const releaseReadinessService = options.releaseReadinessService || null;
  const releaseReviewService = options.releaseReviewService || null;
  const releaseClosureService = options.releaseClosureService || null;
  const releaseActivationService = options.releaseActivationService || null;
  const runtimeEnablementService = options.runtimeEnablementService || null;

  function summarize(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_release_controls_scope_required");
    const privacyFindings = scanPrivacyKeys(input).concat(scanPrivateValues(input)).slice(0, 16);
    if (privacyFindings.length) return unavailable("learning_automation_release_controls_privacy_failed", { privacyFindings });
    if (!releaseReadinessService || typeof releaseReadinessService.evaluateReadiness !== "function") {
      return unavailable("learning_automation_release_controls_readiness_unavailable");
    }
    if (!releaseReviewService || typeof releaseReviewService.review !== "function") {
      return unavailable("learning_automation_release_controls_review_unavailable");
    }
    if (!releaseClosureService || typeof releaseClosureService.summarize !== "function") {
      return unavailable("learning_automation_release_controls_closure_unavailable");
    }
    if (!releaseActivationService || typeof releaseActivationService.preflight !== "function") {
      return unavailable("learning_automation_release_controls_activation_unavailable");
    }
    if (!runtimeEnablementService || typeof runtimeEnablementService.evaluate !== "function") {
      return unavailable("learning_automation_release_controls_runtime_unavailable");
    }
    if (typeof releaseActivationService.listActivations !== "function") {
      return unavailable("learning_automation_release_controls_activation_readback_unavailable");
    }
    if (typeof runtimeEnablementService.listEnablements !== "function") {
      return unavailable("learning_automation_release_controls_runtime_record_readback_unavailable");
    }

    const request = Object.assign({}, input, scope);
    const readiness = releaseReadinessService.evaluateReadiness(request);
    const review = releaseReviewService.review(request);
    const closure = releaseClosureService.summarize(request);
    const activation = releaseActivationService.preflight(request);
    const runtime = runtimeEnablementService.evaluate(request);
    const activationRecords = releaseActivationService.listActivations(Object.assign({}, request, {
      limit: boundedLimit(input.activationRecordLimit || input.activation_record_limit || input.limit, 20)
    }));
    const runtimeEnablementRecords = runtimeEnablementService.listEnablements(Object.assign({}, request, {
      limit: boundedLimit(input.runtimeEnablementRecordLimit || input.runtime_enablement_record_limit || input.limit, 20)
    }));
    const dependencyPrivacyFindings = scanPrivacyKeys({
      readiness,
      review,
      closure,
      activation,
      runtime,
      activationRecords,
      runtimeEnablementRecords
    }).concat(scanPrivateValues({
      readiness,
      review,
      closure,
      activation,
      runtime,
      activationRecords,
      runtimeEnablementRecords
    })).slice(0, 16);
    if (dependencyPrivacyFindings.length) {
      return unavailable("learning_automation_release_controls_dependency_privacy_failed", { privacyFindings: dependencyPrivacyFindings });
    }

    const parts = {
      readiness: objectOnly(readiness),
      review: objectOnly(review),
      closure: objectOnly(closure),
      activation: objectOnly(activation),
      runtime: objectOnly(runtime),
      activationRecords: objectOnly(activationRecords),
      runtimeEnablementRecords: objectOnly(runtimeEnablementRecords)
    };
    const missing = collectMissing(parts);
    const status = statusFrom(parts);
    const requiredActions = collectActions(parts, status);
    const activationAuditReadback = auditRecordReadback("activation", activationRecords, "activations");
    const runtimeEnablementAuditReadback = auditRecordReadback("runtime_enablement", runtimeEnablementRecords, "enablements");
    const auditReadback = {
      schemaVersion: "growth.learningAutomationReleaseControls.auditReadback.v1",
      summaryOnly: true,
      status: activationAuditReadback.ok === false || runtimeEnablementAuditReadback.ok === false ? "blocked" : "ready",
      activationRecords: activationAuditReadback,
      runtimeEnablementRecords: runtimeEnablementAuditReadback,
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false
    };
    const reviewSummary = objectOnly(parts.review.releaseReview);
    const reviewPackageReadback = objectOnly(parts.review.packageReadback || reviewSummary.packageReadback);
    const steps = [
      step("release_readiness", readiness, {
        ready: parts.readiness.readyForReleaseReview === true,
        evidenceReadback: evidenceReadbackSummary(parts.readiness.evidenceReadback),
        requiredActions: actionCandidates(parts.readiness),
        nextAction: objectOnly(parts.readiness.releaseReview).nextAction || null
      }),
      step("release_review", review, {
        ready: parts.review.approvedForReleaseReview === true,
        latestCollectionRunId: cleanString(objectOnly(parts.review.latestCollectionRun).collectionRunId || objectOnly(parts.review.latestCollectionRun).runId, 160),
        latestDecisionId: cleanString(objectOnly(parts.review.latestDecision).decisionId, 160),
        packageRecordReadbackAvailable: parts.review.packageRecordReadbackAvailable === true,
        packageRecordRequired: parts.review.packageRecordRequired === true,
        packageRecordPresent: parts.review.packageRecordPresent === true,
        latestPackageId: cleanString(objectOnly(parts.review.latestPackage).packageId || reviewSummary.latestPackageId, 180),
        latestPackageStatus: cleanString(objectOnly(parts.review.latestPackage).status || reviewSummary.packageRecordStatus, 120),
        latestPackageStepCount: Number(reviewSummary.latestPackageStepCount || reviewPackageReadback.latestPackageStepCount || 0) || 0,
        latestPackageDashboardStatus: cleanString(reviewSummary.latestPackageDashboardStatus || reviewPackageReadback.latestPackageDashboardStatus, 120),
        latestPackageDashboardNextActionKey: cleanString(reviewSummary.latestPackageDashboardNextActionKey || reviewPackageReadback.latestPackageDashboardNextActionKey, 140),
        latestPackageDashboardRequiredActionCount: Number(reviewSummary.latestPackageDashboardRequiredActionCount || reviewPackageReadback.latestPackageDashboardRequiredActionCount || 0) || 0,
        requiredActions: actionCandidates(parts.review),
        nextAction: reviewSummary.nextAction || null
      }),
      step("release_closure", closure, {
        ready: parts.closure.backendEvidenceComplete === true,
        backendEvidenceComplete: parts.closure.backendEvidenceComplete === true,
        requiredActions: actionCandidates(parts.closure),
        nextAction: objectOnly(parts.closure.releaseClosure).nextAction || null
      }),
      step("release_activation", activation, {
        ready: parts.activation.preflightPassed === true,
        requestedActivationGates: asArray(parts.activation.requestedActivationGates),
        requiredActions: actionCandidates(parts.activation),
        nextAction: objectOnly(parts.activation.activationPreflight).nextAction || null
      }),
      step("runtime_enablement", runtime, {
        ready: parts.runtime.runtimeConfigVerified === true,
        requestedActivationGates: asArray(parts.runtime.requestedActivationGates),
        requiredActions: actionCandidates(parts.runtime),
        nextAction: objectOnly(parts.runtime.runtimeEnablement).nextAction || null
      }),
      step("activation_records", activationRecords, {
        schemaVersion: activationAuditReadback.schemaVersion,
        privacyClass: "summary_only",
        summaryOnly: true,
        status: activationAuditReadback.status,
        ready: activationAuditReadback.count > 0,
        recordCount: activationAuditReadback.count,
        latestRecordId: activationAuditReadback.latestRecordId,
        statuses: activationAuditReadback.statuses,
        requiredActions: [],
        nextAction: null
      }),
      step("runtime_enablement_records", runtimeEnablementRecords, {
        schemaVersion: runtimeEnablementAuditReadback.schemaVersion,
        privacyClass: "summary_only",
        summaryOnly: true,
        status: runtimeEnablementAuditReadback.status,
        ready: runtimeEnablementAuditReadback.count > 0,
        recordCount: runtimeEnablementAuditReadback.count,
        latestRecordId: runtimeEnablementAuditReadback.latestRecordId,
        statuses: runtimeEnablementAuditReadback.statuses,
        requiredActions: [],
        nextAction: null
      })
    ];

    return Object.assign({}, scope, {
      ok: true,
      source: "growth-learning-automation-release-controls-service",
      schemaVersion: RELEASE_CONTROLS_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      status,
      advisoryOnly: true,
      recordOnly: true,
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false,
      releaseControls: {
        schemaVersion: "growth.learningAutomationReleaseControls.summary.v1",
        summaryOnly: true,
        status,
        requiredActionCount: requiredActions.length,
        requiredActions,
        nextAction: requiredActions[0] || null,
        missingCheckKeys: missing.missingCheckKeys,
        blockedCheckKeys: missing.blockedCheckKeys,
        missingEvidenceKeys: missing.missingEvidenceKeys,
        missingApprovalKeys: missing.missingApprovalKeys,
        auditReadback,
        configChangeApplied: false,
        runtimeConfigChange: false,
        runtimeConfigMutationPerformed: false,
        writefulSchedulingAllowed: false,
        backgroundSchedulingAllowed: false,
        backgroundWorkerAllowed: false
      },
      auditReadback,
      steps
    });
  }

  return { summarize };
}

module.exports = {
  RELEASE_CONTROLS_SCHEMA,
  createLearningAutomationReleaseControlsService
};
