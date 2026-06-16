"use strict";

const {
  RELEASE_EVIDENCE_KEYS,
  canonicalReleaseEvidenceKey
} = require("./learning-automation-release-evidence-service");
const {
  UI_GATE_SPECS
} = require("./learning-automation-ui-evidence-service");
const {
  UI_EVIDENCE_FILE_FIELDS
} = require("./learning-automation-ui-evidence-task-registry");

const RELEASE_EVIDENCE_COLLECTION_SCHEMA = "growth.learningAutomationReleaseEvidenceCollection.v1";
const RELEASE_EVIDENCE_RECORDS_SCHEMA = "growth.learningAutomationReleaseEvidenceCollection.records.v1";
const RELEASE_EVIDENCE_KEY_SET = new Set(RELEASE_EVIDENCE_KEYS);
const UI_EVIDENCE_KEY_SET = new Set(Object.keys(UI_GATE_SPECS));
const TRANSIENT_EVIDENCE_FILE_KEYS = new Set([
  "centralVisualEvidenceFile",
  "central_visual_evidence_file",
  ...UI_EVIDENCE_FILE_FIELDS
]);
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization|localstorage|sessionstorage|cookie.*jar)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|Bearer\s+|X-Hermes-Web-Key|X-Hermes-Access-Key|access-key\.txt|launch-token|Authorization:)/i;

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function booleanFlag(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function nowIso(now) {
  const value = typeof now === "function" ? now() : new Date();
  if (value instanceof Date) return value.toISOString();
  return cleanString(value, 80) || new Date().toISOString();
}

function scopeFrom(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id, 120);
  return {
    workspaceId,
    learnerId: cleanString(input.learnerId || input.learner_id || workspaceId, 120),
    programId: cleanString(input.programId || input.program_id, 120),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id, 120),
    domain: cleanString(input.domain, 80),
    subject: cleanString(input.subject, 80),
    horizon: cleanString(input.horizon || "daily_plan", 80) || "daily_plan"
  };
}

function collectionOptions(input = {}) {
  const allowWriteCollection = booleanFlag(input.allowWriteCollection || input.allow_write_collection || input.allowWrite || input.allow_write || input.ownerAuthorizedWrite || input.owner_authorized_write);
  return {
    writeCollectionRun: booleanFlag(input.writeCollectionRun || input.write_collection_run || input.recordCollectionRun || input.record_collection_run || input.writeRun || input.write_run),
    writeReleaseEvidenceRecords: booleanFlag(input.writeReleaseEvidenceRecords || input.write_release_evidence_records || input.recordReleaseEvidenceRecords || input.record_release_evidence_records || input.writeEvidenceRecords || input.write_evidence_records),
    allowWriteCollection
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

function inputForPrivacyScan(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(inputForPrivacyScan);
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    TRANSIENT_EVIDENCE_FILE_KEYS.has(key) ? "[transient_evidence_file]" : inputForPrivacyScan(child)
  ]));
}

function unavailable(error, scope = {}, extra = {}) {
  return Object.assign({}, scope, {
    ok: false,
    source: "growth-learning-automation-release-evidence-collection-service",
    schemaVersion: RELEASE_EVIDENCE_COLLECTION_SCHEMA,
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "blocked",
    error: cleanString(error, 180) || "release_evidence_collection_unavailable",
    advisoryOnly: true,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false,
    schedulerPermissionGranted: false
  }, extra);
}

function statusOf(value = {}) {
  return cleanString(value.status || value.summary?.status || "", 80).toLowerCase();
}

function stepStatusFor(key, value = {}, resultOk = false) {
  if (!value || typeof value !== "object") return "blocked";
  if (key === "release_evidence_bundle") return resultOk ? "pass" : "blocked";
  if (key === "release_evidence_bundle_audit") return value.readyForReleaseEvidence === true ? "pass" : (statusOf(value) || "blocked");
  if (key === "release_readiness") return value.summary?.readyForReleaseReview === true ? "pass" : (statusOf(value) || "incomplete");
  if (key === "release_collection_run") return value.readyForReleaseReview === true ? "pass" : (statusOf(value) || "incomplete");
  return statusOf(value) || (value.ok === true ? "pass" : "blocked");
}

function publicStep(key, label, value = {}, resultOk = false) {
  const status = stepStatusFor(key, value, resultOk);
  const summary = objectOnly(value.summary);
  const releaseReview = objectOnly(value.releaseReview || value.release_review);
  return {
    key,
    label,
    status,
    ok: status === "pass",
    source: cleanString(value.source, 160),
    schemaVersion: cleanString(value.schemaVersion || value.schema_version, 160),
    privacyClass: cleanString(value.privacyClass || value.privacy_class || "summary_only", 80),
    summaryOnly: value.summaryOnly === undefined ? true : value.summaryOnly === true,
    error: cleanString(value.error, 180),
    requiredActionCount: Number(releaseReview.requiredActionCount || summary.requiredActionCount || 0) || 0,
    readyForReleaseEvidence: value.readyForReleaseEvidence === true,
    readyForReleaseReview: value.readyForReleaseReview === true || summary.readyForReleaseReview === true,
    writefulSchedulingAllowed: value.writefulSchedulingAllowed === true || summary.writefulSchedulingAllowed === true
  };
}

function bundleArtifact(bundleResult = {}) {
  return bundleResult.bundle && typeof bundleResult.bundle === "object" ? bundleResult.bundle : null;
}

function collectionRunArtifact(collectionResult = {}) {
  return objectOnly(collectionResult.run || collectionResult.evaluated || collectionResult);
}

function collectionRunIdFrom(value = {}) {
  return cleanString(value.runId || value.run_id || value.collectionRunId || value.collection_run_id, 160);
}

function evidenceStatus(value = {}) {
  return cleanString(value.status || value.summary?.status || (value.ok === true || value.present === true ? "pass" : ""), 80).toLowerCase();
}

function evidencePasses(value = {}) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value)
    && (value.ok === true || value.present === true || evidenceStatus(value) === "pass" || value.readyForReleaseEvidence === true));
}

function boundedArray(value = [], max = 20) {
  return Array.isArray(value)
    ? value.map((item) => cleanString(item, 160)).filter(Boolean).slice(0, max)
    : [];
}

function compactOwnerReviewNextAction(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const action = cleanString(value.action, 160);
  const key = cleanString(value.key, 160);
  if (!action && !key) return null;
  return Object.fromEntries(Object.entries({
    key,
    action,
    requiredActor: cleanString(value.requiredActor || value.required_actor || "owner", 80)
  }).filter(([, item]) => item !== ""));
}

function compactOwnerReviewStageSummary(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const summary = {
    proposedProposalCount: Number(value.proposedProposalCount || value.proposed_proposal_count || 0) || 0,
    acceptedProposalCount: Number(value.acceptedProposalCount || value.accepted_proposal_count || 0) || 0,
    skippedProposalCount: Number(value.skippedProposalCount || value.skipped_proposal_count || 0) || 0,
    expiredProposalCount: Number(value.expiredProposalCount || value.expired_proposal_count || 0) || 0,
    supersededProposalCount: Number(value.supersededProposalCount || value.superseded_proposal_count || 0) || 0,
    digestCount: Number(value.digestCount || value.digest_count || 0) || 0,
    reviewedDigestCount: Number(value.reviewedDigestCount || value.reviewed_digest_count || 0) || 0,
    digestRequiredActionCount: Number(value.digestRequiredActionCount || value.digest_required_action_count || 0) || 0,
    actionHandoffCount: Number(value.actionHandoffCount || value.action_handoff_count || 0) || 0,
    deliveredHandoffCount: Number(value.deliveredHandoffCount || value.delivered_handoff_count || 0) || 0,
    schedulerExecutionCount: Number(value.schedulerExecutionCount || value.scheduler_execution_count || 0) || 0,
    publishedSchedulerExecutionCount: Number(value.publishedSchedulerExecutionCount || value.published_scheduler_execution_count || 0) || 0,
    schedulerRunCount: Number(value.schedulerRunCount || value.scheduler_run_count || 0) || 0,
    completedSchedulerRunCount: Number(value.completedSchedulerRunCount || value.completed_scheduler_run_count || 0) || 0,
    reviewedWorkerTargetCount: Number(value.reviewedWorkerTargetCount || value.reviewed_worker_target_count || 0) || 0,
    pendingWorkerTargetReviewCount: Number(value.pendingWorkerTargetReviewCount || value.pending_worker_target_review_count || 0) || 0,
    passedGateCount: Number(value.passedGateCount || value.passed_gate_count || 0) || 0,
    missingGateCount: Number(value.missingGateCount || value.missing_gate_count || 0) || 0,
    requiredActionCount: Number(value.requiredActionCount || value.required_action_count || 0) || 0,
    failurePolicyReady: value.failurePolicyReady === true || value.failure_policy_ready === true,
    failurePolicyStatus: cleanString(value.failurePolicyStatus || value.failure_policy_status, 120),
    passedGateKeys: boundedArray(value.passedGateKeys || value.passed_gate_keys),
    missingGateKeys: boundedArray(value.missingGateKeys || value.missing_gate_keys),
    nextAction: compactOwnerReviewNextAction(value.nextAction || value.next_action)
  };
  const hasEvidence = Object.entries(summary).some(([key, item]) => {
    if (key === "failurePolicyReady") return item === true;
    if (key === "failurePolicyStatus" || key === "nextAction") return Boolean(item);
    if (key === "passedGateKeys" || key === "missingGateKeys") return item.length > 0;
    return Number(item) > 0;
  });
  return hasEvidence ? summary : null;
}

function compactUiEvidencePayload(value = {}, evidenceKey = "") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const spec = UI_GATE_SPECS[evidenceKey] || {};
  return Object.fromEntries(Object.entries({
    source: cleanString(value.source || "growth-ui-evidence-harness", 120),
    evidenceKey: cleanString(value.evidenceKey || value.evidence_key || evidenceKey, 160),
    checkKey: cleanString(value.checkKey || value.check_key || spec.checkKey, 160),
    uiGate: cleanString(value.uiGate || value.ui_gate || spec.uiGate, 120),
    status: cleanString(value.status || (value.ok === true ? "pass" : ""), 80),
    checkedAt: cleanString(value.checkedAt || value.checked_at || value.createdAt || value.created_at, 120),
    clientVersion: cleanString(value.clientVersion || value.client_version, 120),
    route: cleanString(value.route || value.path || value.screenRoute || value.screen_route, 180),
    screen: cleanString(value.screen || value.view || value.surface, 120),
    screenshotPresent: value.screenshotPresent === true || value.screenshot_present === true,
    domEvidencePresent: value.domEvidencePresent === true || value.dom_evidence_present === true,
    screenshotArtifactName: cleanString(value.screenshotArtifactName || value.screenshot_artifact_name, 180),
    evidenceFilePresent: value.evidenceFilePresent === true || value.evidence_file_present === true,
    evidenceFileName: cleanString(value.evidenceFileName || value.evidence_file_name, 180),
    coverage: boundedArray(value.coverage || value.coverage_ids || value.coverageIds),
    requiredCoverage: boundedArray(value.requiredCoverage || value.required_coverage || spec.requiredCoverage),
    missingCoverage: boundedArray(value.missingCoverage || value.missing_coverage),
    assertionCount: Number(value.assertionCount || value.assertion_count || 0) || 0,
    failedAssertionCount: Number(value.failedAssertionCount || value.failed_assertion_count || 0) || 0
  }).filter(([, item]) => {
    if (Array.isArray(item)) return item.length > 0;
    return item !== undefined && item !== "";
  }));
}

function compactUiEvidenceBoundary(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return {
    summaryOnly: value.summaryOnly === true || value.summary_only === true,
    growthReadsOnlyEvidenceArtifacts: value.growthReadsOnlyEvidenceArtifacts === true || value.growth_reads_only_evidence_artifacts === true,
    growthRunsNoVisualTooling: value.growthRunsNoVisualTooling === true || value.growth_runs_no_visual_tooling === true,
    homeAiOwnsVisualHarness: value.homeAiOwnsVisualHarness === true || value.home_ai_owns_visual_harness === true,
    noLearnerStateMutation: value.noLearnerStateMutation === true || value.no_learner_state_mutation === true,
    noModelCalls: value.noModelCalls === true || value.no_model_calls === true
  };
}

function compactUiEvidenceFields(source = {}, evidenceKey = "") {
  const spec = UI_GATE_SPECS[evidenceKey] || null;
  if (!spec) return {};
  const nested = objectOnly(source.uiEvidence || source.ui_evidence);
  const projected = Object.keys(nested).length
    ? compactUiEvidencePayload(nested, evidenceKey)
    : compactUiEvidencePayload(source, evidenceKey);
  return Object.fromEntries(Object.entries({
    checkKey: cleanString(source.checkKey || source.check_key || spec.checkKey, 160),
    uiGate: cleanString(source.uiGate || source.ui_gate || spec.uiGate, 120),
    validationSchemaVersion: cleanString(source.validationSchemaVersion || source.validation_schema_version || source.schemaVersion || source.schema_version, 180),
    validatedBy: cleanString(source.validatedBy || source.validated_by, 160),
    uiEvidence: projected,
    uiEvidenceBoundary: compactUiEvidenceBoundary(source.uiEvidenceBoundary || source.ui_evidence_boundary),
    missingRequired: boundedArray(source.missingRequired || source.missing_required),
    privateValueFindingCount: Number(source.privateValueFindingCount || source.private_value_finding_count || 0) || 0
  }).filter(([, item]) => {
    if (Array.isArray(item)) return item.length > 0;
    if (item && typeof item === "object") return Object.keys(item).length > 0;
    return item !== undefined && item !== "";
  }));
}

function compactEvidenceSummary(value = {}, evidenceKey = "", extra = {}) {
  const source = objectOnly(value);
  const ownerReviewSummary = evidenceKey === "ownerReviewEvidence"
    ? compactOwnerReviewStageSummary(source.ownerReviewStageSummary || source.owner_review_stage_summary || source.summary || source.ownerReview || source.owner_review)
    : null;
  const uiEvidenceFields = UI_EVIDENCE_KEY_SET.has(evidenceKey)
    ? compactUiEvidenceFields(source, evidenceKey)
    : {};
  return Object.fromEntries(Object.entries(Object.assign({
    schemaVersion: cleanString(source.schemaVersion || source.schema_version || "growth.learningAutomationReleaseEvidenceRecord.collectionEvidence.v1", 180),
    privacyClass: "summary_only",
    summaryOnly: true,
    evidenceKey,
    status: "pass",
    ok: true,
    present: true,
    source: cleanString(source.source || "growth_release_evidence_collection", 180),
    evidenceId: cleanString(source.evidenceId || source.evidence_id || source.id, 180),
    artifactId: cleanString(source.artifactId || source.artifact_id, 180),
    runId: cleanString(source.runId || source.run_id, 180),
    taskId: cleanString(source.taskId || source.task_id || extra.taskId, 180),
    observedAt: cleanString(source.observedAt || source.observed_at || source.checkedAt || source.checked_at || source.createdAt || source.created_at || extra.observedAt, 120),
    readyForReleaseEvidence: source.readyForReleaseEvidence === true || source.ready_for_release_evidence === true || extra.readyForReleaseEvidence === true,
    ownerReviewStageSummary: ownerReviewSummary || undefined
  }, uiEvidenceFields, extra)).filter(([, item]) => item !== undefined && item !== ""));
}

function releaseEvidenceCandidates(scope, input, bundle, audit, collectionRun, createdAt) {
  const evidence = objectOnly(bundle.evidence);
  const taskByEvidenceKey = new Map();
  for (const task of Array.isArray(bundle.tasks) ? bundle.tasks : []) {
    const taskObject = objectOnly(task);
    const key = canonicalReleaseEvidenceKey(taskObject.evidenceKey || taskObject.evidence_key || taskObject.key);
    if (key) taskByEvidenceKey.set(key, taskObject);
  }
  const candidates = [];
  const seen = new Set();
  function add(rawKey, value, extra = {}) {
    const evidenceKey = canonicalReleaseEvidenceKey(rawKey);
    if (!evidenceKey || !RELEASE_EVIDENCE_KEY_SET.has(evidenceKey) || seen.has(evidenceKey)) return;
    if (!evidencePasses(value)) return;
    seen.add(evidenceKey);
    const task = taskByEvidenceKey.get(evidenceKey) || {};
    const observedAt = cleanString(value.observedAt || value.observed_at || value.checkedAt || value.checked_at || value.createdAt || value.created_at || createdAt, 120);
    candidates.push(Object.assign({}, scope, {
      evidenceKey,
      status: "pass",
      observedAt,
      recordedAt: createdAt,
      recordedBy: cleanString(input.recordedBy || input.recorded_by || input.createdBy || input.created_by || input.requestedBy || input.requested_by, 120),
      requestedBy: cleanString(input.requestedBy || input.requested_by, 120),
      collectionRunId: collectionRunIdFrom(collectionRun),
      evidence: compactEvidenceSummary(value, evidenceKey, Object.assign({
        taskId: task.taskId || task.task_id || extra.taskId,
        observedAt,
        collectionRunId: collectionRunIdFrom(collectionRun),
        releaseEvidenceCollectionSource: true
      }, extra))
    }));
  }
  Object.entries(evidence).forEach(([key, value]) => add(key, objectOnly(value)));
  if (audit && typeof audit === "object") {
    add("releaseEvidenceBundleAudit", audit, {
      taskId: "release_evidence_bundle_audit",
      readyForReleaseEvidence: audit.readyForReleaseEvidence === true
    });
  }
  return candidates.slice(0, 80);
}

function releaseEvidenceRecordSummary(result = {}) {
  return {
    evidenceKey: cleanString(result.evidenceKey || result.evidence_key, 160),
    status: cleanString(result.status, 80),
    evidenceRecordId: cleanString(result.evidenceRecordId || result.evidence_record_id, 180),
    duplicate: result.duplicate === true
  };
}

function recordReleaseEvidenceRecords({
  scope,
  input,
  optionBag,
  bundle,
  audit,
  collectionRun,
  createdAt,
  releaseEvidenceService
}) {
  if (!optionBag.writeReleaseEvidenceRecords) {
    return {
      schemaVersion: RELEASE_EVIDENCE_RECORDS_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      status: "skipped",
      writeReleaseEvidenceRecords: false,
      attemptedCount: 0,
      recordedCount: 0,
      duplicateCount: 0,
      blockedCount: 0,
      evidenceKeys: [],
      evidenceRecords: [],
      errors: []
    };
  }
  if (!releaseEvidenceService || typeof releaseEvidenceService.recordEvidence !== "function") {
    return unavailable("release_evidence_collection_record_service_unavailable", scope, {
      schemaVersion: RELEASE_EVIDENCE_RECORDS_SCHEMA,
      writeReleaseEvidenceRecords: true
    });
  }
  const candidates = releaseEvidenceCandidates(scope, input, bundle, audit, collectionRun, createdAt);
  const evidenceRecords = [];
  const errors = [];
  for (const candidate of candidates) {
    const result = releaseEvidenceService.recordEvidence(candidate);
    if (result?.ok) {
      evidenceRecords.push(Object.assign(
        releaseEvidenceRecordSummary(result.evidence || {}),
        {
          evidenceKey: candidate.evidenceKey,
          duplicate: result.duplicate === true
        }
      ));
    } else {
      errors.push({
        evidenceKey: candidate.evidenceKey,
        error: cleanString(result?.error || "release_evidence_record_failed", 180)
      });
    }
  }
  const duplicateCount = evidenceRecords.filter((record) => record.duplicate).length;
  const blockedCount = errors.length;
  const status = blockedCount ? "blocked" : (candidates.length ? "pass" : "incomplete");
  return {
    schemaVersion: RELEASE_EVIDENCE_RECORDS_SCHEMA,
    privacyClass: "summary_only",
    summaryOnly: true,
    status,
    ok: status === "pass",
    writeReleaseEvidenceRecords: true,
    attemptedCount: candidates.length,
    recordedCount: evidenceRecords.length,
    duplicateCount,
    blockedCount,
    evidenceKeys: evidenceRecords.map((record) => record.evidenceKey).filter(Boolean).sort(),
    evidenceRecords: evidenceRecords.slice(0, 80),
    errors: errors.slice(0, 20),
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false,
    schedulerPermissionGranted: false
  };
}

function readinessInput(scope, input, bundle, audit) {
  const evidence = Object.assign({}, objectOnly(bundle.evidence), objectOnly(input.evidence || input.evidence_summary), {
    releaseEvidenceBundleAudit: audit
  });
  return Object.assign({}, input, scope, {
    evidence,
    releaseApproval: Object.assign({}, objectOnly(bundle.releaseApproval || bundle.release_approval), objectOnly(input.releaseApproval || input.release_approval || input.approvals)),
    createdAt: cleanString(input.createdAt || input.created_at, 80),
    requestedBy: cleanString(input.requestedBy || input.requested_by, 120)
  });
}

function deriveCollectionStatus(steps = [], collectionRun = {}) {
  if (steps.some((step) => step.status === "blocked")) return "blocked";
  if (steps.some((step) => step.status === "incomplete")) return "incomplete";
  if (collectionRun.readyForReleaseReview === true) return "ready_for_release_review";
  return "incomplete";
}

function buildSummary(status, steps, options, collectionRun, releaseEvidenceRecords) {
  const passedCount = steps.filter((step) => step.status === "pass").length;
  const blockedCount = steps.filter((step) => step.status === "blocked").length;
  const recordSummary = objectOnly(releaseEvidenceRecords);
  return {
    schemaVersion: "growth.learningAutomationReleaseEvidenceCollection.summary.v1",
    summaryOnly: true,
    status,
    stepCount: steps.length,
    passedCount,
    blockedCount,
    incompleteCount: steps.length - passedCount - blockedCount,
    readyForReleaseReview: collectionRun.readyForReleaseReview === true,
    collectionRunId: collectionRunIdFrom(collectionRun),
    collectionRunWritten: options.writeCollectionRun && collectionRunIdFrom(collectionRun) ? true : false,
    releaseEvidenceRecordsWritten: options.writeReleaseEvidenceRecords && Number(recordSummary.recordedCount || 0) > 0,
    releaseEvidenceRecordAttemptedCount: Number(recordSummary.attemptedCount || 0) || 0,
    releaseEvidenceRecordRecordedCount: Number(recordSummary.recordedCount || 0) || 0,
    releaseEvidenceRecordDuplicateCount: Number(recordSummary.duplicateCount || 0) || 0,
    releaseEvidenceRecordBlockedCount: Number(recordSummary.blockedCount || 0) || 0,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false,
    schedulerPermissionGranted: false
  };
}

function createLearningAutomationReleaseEvidenceCollectionService(options = {}) {
  const evidenceBundleService = options.evidenceBundleService || null;
  const evidenceBundleAuditService = options.evidenceBundleAuditService || null;
  const releaseReadinessService = options.releaseReadinessService || null;
  const releaseCollectionRunService = options.releaseCollectionRunService || null;
  const releaseEvidenceService = options.releaseEvidenceService || null;
  const now = options.now || (() => new Date());

  function collect(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("release_evidence_collection_workspace_required", scope);
    const optionBag = collectionOptions(input);
    if ((optionBag.writeCollectionRun || optionBag.writeReleaseEvidenceRecords) && !optionBag.allowWriteCollection) {
      return unavailable("release_evidence_collection_write_not_allowed", scope, {
        requiredFlag: "--allow-write",
        writeCollectionRun: optionBag.writeCollectionRun,
        writeReleaseEvidenceRecords: optionBag.writeReleaseEvidenceRecords
      });
    }
    const inputPrivacyScope = inputForPrivacyScan(input);
    const inputPrivacyFindings = scanPrivacyKeys(inputPrivacyScope).slice(0, 16);
    const inputPrivateValueFindings = scanPrivateValues(inputPrivacyScope).slice(0, 16);
    if (inputPrivacyFindings.length || inputPrivateValueFindings.length) {
      return unavailable("release_evidence_collection_privacy_failed", scope, {
        privacyFindings: inputPrivacyFindings,
        privateValueFindings: inputPrivateValueFindings
      });
    }
    if (!evidenceBundleService || typeof evidenceBundleService.buildBundle !== "function") {
      return unavailable("release_evidence_collection_bundle_service_unavailable", scope);
    }
    if (!evidenceBundleAuditService || typeof evidenceBundleAuditService.evaluate !== "function") {
      return unavailable("release_evidence_collection_bundle_audit_service_unavailable", scope);
    }
    if (!releaseReadinessService || typeof releaseReadinessService.evaluateReadiness !== "function") {
      return unavailable("release_evidence_collection_readiness_service_unavailable", scope);
    }
    if (!releaseCollectionRunService || typeof releaseCollectionRunService.evaluateRun !== "function") {
      return unavailable("release_evidence_collection_run_service_unavailable", scope);
    }
    if (optionBag.writeCollectionRun && typeof releaseCollectionRunService.recordRun !== "function") {
      return unavailable("release_evidence_collection_run_record_unavailable", scope);
    }
    if (optionBag.writeReleaseEvidenceRecords && (!releaseEvidenceService || typeof releaseEvidenceService.recordEvidence !== "function")) {
      return unavailable("release_evidence_collection_record_service_unavailable", scope);
    }

    const createdAt = cleanString(input.createdAt || input.created_at, 80) || nowIso(now);
    const bundleResult = evidenceBundleService.buildBundle(Object.assign({}, input, scope, { createdAt }));
    const bundle = bundleArtifact(bundleResult);
    const audit = bundle
      ? evidenceBundleAuditService.evaluate(Object.assign({}, input, scope, {
        bundle,
        requiredTaskIds: input.requiredTaskIds || input.required_task_ids || input.requiredTasks || input.required_tasks
      }))
      : unavailable("release_evidence_collection_bundle_missing", scope);
    const readiness = bundle
      ? releaseReadinessService.evaluateReadiness(readinessInput(scope, input, bundle, audit))
      : unavailable("release_evidence_collection_readiness_skipped", scope);
    const dependencyPrivacyFindings = scanPrivacyKeys({ bundle, audit, readiness }).slice(0, 16);
    const dependencyPrivateValueFindings = scanPrivateValues({ bundle, audit, readiness }).slice(0, 16);
    if (dependencyPrivacyFindings.length || dependencyPrivateValueFindings.length) {
      return unavailable("release_evidence_collection_privacy_failed", scope, {
        privacyFindings: dependencyPrivacyFindings,
        privateValueFindings: dependencyPrivateValueFindings
      });
    }
    const runInput = bundle
      ? Object.assign({}, input, scope, {
        releaseEvidenceBundle: bundle,
        releaseEvidenceBundleAudit: audit,
        releaseReadiness: readiness,
        createdBy: cleanString(input.createdBy || input.created_by || input.requestedBy || input.requested_by, 120),
        createdAt
      })
      : {};
    const runResult = bundle
      ? optionBag.writeCollectionRun
        ? releaseCollectionRunService.recordRun(runInput)
        : releaseCollectionRunService.evaluateRun(runInput)
      : unavailable("release_evidence_collection_run_skipped", scope);
    const collectionRun = collectionRunArtifact(runResult);
    const releaseEvidenceRecords = bundle
      ? recordReleaseEvidenceRecords({
        scope,
        input,
        optionBag,
        bundle,
        audit,
        collectionRun,
        createdAt,
        releaseEvidenceService
      })
      : recordReleaseEvidenceRecords({
        scope,
        input,
        optionBag,
        bundle: {},
        audit: {},
        collectionRun: {},
        createdAt,
        releaseEvidenceService
      });
    const steps = [
      publicStep("release_evidence_bundle", "Release evidence bundle", bundle || bundleResult, bundleResult.ok === true),
      publicStep("release_evidence_bundle_audit", "Release evidence bundle audit", audit, audit.ok === true),
      publicStep("release_readiness", "Release readiness", readiness, readiness.ok === true),
      publicStep("release_collection_run", "Release collection run", collectionRun, collectionRun.ok === true)
    ];
    if (optionBag.writeReleaseEvidenceRecords) {
      steps.push(publicStep("release_evidence_records", "Release evidence records", releaseEvidenceRecords, releaseEvidenceRecords.ok === true));
    }
    const status = deriveCollectionStatus(steps, collectionRun);
    const collection = Object.assign({}, scope, {
      ok: status === "ready_for_release_review",
      source: "growth-learning-automation-release-evidence-collection-service",
      schemaVersion: RELEASE_EVIDENCE_COLLECTION_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      status,
      createdAt,
      requestedBy: cleanString(input.requestedBy || input.requested_by, 120),
      advisoryOnly: true,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false,
      schedulerPermissionGranted: false,
      writeCollectionRun: optionBag.writeCollectionRun,
      writeReleaseEvidenceRecords: optionBag.writeReleaseEvidenceRecords,
      steps,
      summary: buildSummary(status, steps, optionBag, collectionRun, releaseEvidenceRecords),
      artifacts: {
        releaseEvidenceBundle: bundle,
        releaseEvidenceBundleAudit: audit,
        releaseReadiness: readiness,
        releaseCollectionRun: collectionRun,
        releaseEvidenceRecords
      }
    });
    const privacyFindings = scanPrivacyKeys(collection).slice(0, 16);
    const privateValueFindings = scanPrivateValues(collection).slice(0, 16);
    if (privacyFindings.length || privateValueFindings.length) {
      return unavailable("release_evidence_collection_privacy_failed", scope, {
        privacyFindings,
        privateValueFindings
      });
    }
    return {
      ok: collection.ok,
      source: "growth-learning-automation-release-evidence-collection-service",
      collection,
      summary: collection.summary
    };
  }

  return {
    collect
  };
}

module.exports = {
  RELEASE_EVIDENCE_COLLECTION_SCHEMA,
  createLearningAutomationReleaseEvidenceCollectionService,
  scopeFrom
};
