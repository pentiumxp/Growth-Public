"use strict";

const { UI_GATE_SPECS } = require("./learning-automation-ui-evidence-service");

const RELEASE_EVIDENCE_KEYS = Object.freeze([
  "ownerDailyUiEvidence",
  "ownerAuditUiEvidence",
  "stageCheckpointEvidence",
  "stageCheckpointControlsEvidence",
  "proposalReviewUiEvidence",
  "releasePackageReviewUiEvidence",
  "productionProposalSmokeEvidence",
  "automationDigestUiEvidence",
  "automationActionHandoffUiEvidence",
  "productionActionHandoffSmokeEvidence",
  "schedulerExecutionUiEvidence",
  "productionSchedulerExecutionSmokeEvidence",
  "schedulerRunUiEvidence",
  "productionSchedulerRunSmokeEvidence",
  "schedulerWorkerTargetUiEvidence",
  "productionSchedulerWorkerTargetSmokeEvidence",
  "productionSchedulerWorkerSmokeEvidence",
  "productionPlannerReadinessEvidence",
  "productionTargetProvisioningSmokeEvidence",
  "productionDailyLoopPreviewSmokeEvidence",
  "productionLearningLoopStateSmokeEvidence",
  "productionCycleHistorySmokeEvidence",
  "productionOwnerAuditSmokeEvidence",
  "productionProfileFeedbackSmokeEvidence",
  "productionRecommendationLifecycleSmokeEvidence",
  "productionDailyLoopWriteSmokeEvidence",
  "productionLearnerCycleSmokeEvidence",
  "productionSchedulerDryRunSmokeEvidence",
  "releaseEvidenceBundleAudit",
  "platformActionEvidence",
  "centralVisualEvidence",
  "releaseWorkbenchSmokeEvidence",
  "ownerReviewEvidence"
]);

const CHECK_KEY_BY_EVIDENCE_KEY = Object.freeze({
  ownerDailyUiEvidence: "owner_daily_ui_evidence",
  ownerAuditUiEvidence: "owner_audit_ui_evidence",
  stageCheckpointEvidence: "stage_checkpoint_evidence",
  stageCheckpointControlsEvidence: "stage_checkpoint_controls_evidence",
  proposalReviewUiEvidence: "proposal_review_ui_evidence",
  releasePackageReviewUiEvidence: "release_package_review_ui_evidence",
  productionProposalSmokeEvidence: "production_proposal_smoke_evidence",
  automationDigestUiEvidence: "automation_digest_ui_evidence",
  automationActionHandoffUiEvidence: "automation_action_handoff_ui_evidence",
  productionActionHandoffSmokeEvidence: "production_action_handoff_smoke_evidence",
  schedulerExecutionUiEvidence: "scheduler_execution_ui_evidence",
  productionSchedulerExecutionSmokeEvidence: "production_scheduler_execution_smoke_evidence",
  schedulerRunUiEvidence: "scheduler_run_ui_evidence",
  productionSchedulerRunSmokeEvidence: "production_scheduler_run_smoke_evidence",
  schedulerWorkerTargetUiEvidence: "scheduler_worker_target_ui_evidence",
  productionSchedulerWorkerTargetSmokeEvidence: "production_scheduler_worker_target_smoke_evidence",
  productionSchedulerWorkerSmokeEvidence: "production_scheduler_worker_smoke_evidence",
  productionPlannerReadinessEvidence: "production_planner_readiness_evidence",
  productionTargetProvisioningSmokeEvidence: "production_target_provisioning_smoke_evidence",
  productionDailyLoopPreviewSmokeEvidence: "production_daily_loop_preview_smoke_evidence",
  productionLearningLoopStateSmokeEvidence: "production_learning_loop_state_smoke_evidence",
  productionCycleHistorySmokeEvidence: "production_cycle_history_smoke_evidence",
  productionOwnerAuditSmokeEvidence: "production_owner_audit_smoke_evidence",
  productionProfileFeedbackSmokeEvidence: "production_profile_feedback_smoke_evidence",
  productionRecommendationLifecycleSmokeEvidence: "production_recommendation_lifecycle_smoke_evidence",
  productionDailyLoopWriteSmokeEvidence: "production_daily_loop_write_smoke_evidence",
  productionLearnerCycleSmokeEvidence: "production_learner_cycle_smoke_evidence",
  productionSchedulerDryRunSmokeEvidence: "production_scheduler_dry_run_smoke_evidence",
  releaseEvidenceBundleAudit: "release_evidence_bundle_audit",
  platformActionEvidence: "platform_action_evidence",
  centralVisualEvidence: "central_visual_evidence",
  releaseWorkbenchSmokeEvidence: "release_workbench_smoke_evidence",
  ownerReviewEvidence: "owner_review_evidence"
});

const RELEASE_EVIDENCE_KEY_ALIASES = new Map();
for (const key of RELEASE_EVIDENCE_KEYS) {
  RELEASE_EVIDENCE_KEY_ALIASES.set(key, key);
  RELEASE_EVIDENCE_KEY_ALIASES.set(key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`), key);
  RELEASE_EVIDENCE_KEY_ALIASES.set(CHECK_KEY_BY_EVIDENCE_KEY[key], key);
}

const UI_RELEASE_EVIDENCE_KEYS = new Set(Object.keys(UI_GATE_SPECS));

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|access-key\.txt|launch-token)/i;

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unavailable(error, extra = {}) {
  return Object.assign({
    ok: false,
    source: "growth-learning-automation-release-evidence-service",
    error: cleanString(error) || "learning_automation_release_evidence_unavailable"
  }, extra);
}

function scanPrivacy(value, path = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, `${path}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (typeof child === "string" && PRIVATE_VALUE_PATTERN.test(child)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacy(child, childPath, findings);
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

function canonicalReleaseEvidenceKey(value) {
  const key = cleanString(value, 160);
  return RELEASE_EVIDENCE_KEY_ALIASES.get(key) || "";
}

function releaseEvidenceKeyFrom(input = {}) {
  return canonicalReleaseEvidenceKey(input.evidenceKey || input.evidence_key || input.checkKey || input.check_key || input.key);
}

function evidenceSummary(input = {}, evidenceKey) {
  const requested = input.evidence || input.evidenceSummary || input.evidence_summary || {};
  const status = cleanString(input.status || requested.status || "pass", 80).toLowerCase();
  return Object.assign({}, requested, {
    schemaVersion: cleanString(requested.schemaVersion || requested.schema_version, 180) || "growth.learningAutomationReleaseEvidenceRecord.evidence.v1",
    summaryOnly: true,
    evidenceKey,
    checkKey: CHECK_KEY_BY_EVIDENCE_KEY[evidenceKey] || "",
    status,
    ok: status === "pass",
    present: status === "pass",
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  });
}

function uiValidationInput(input = {}, scope = {}, evidenceKey = "") {
  return Object.assign({}, input, scope, {
    evidenceKey,
    checkKey: CHECK_KEY_BY_EVIDENCE_KEY[evidenceKey] || "",
    evidence: input.evidence || input.uiEvidence || input.ui_evidence || input.evidenceSummary || input.evidence_summary || null
  });
}

function uiValidatedEvidenceSummary(input = {}, evidenceKey, validation = {}) {
  const summary = evidenceSummary(Object.assign({}, input, {
    status: "pass",
    evidence: input.evidence || input.evidenceSummary || input.evidence_summary || {}
  }), evidenceKey);
  return Object.assign({}, summary, {
    schemaVersion: "growth.learningAutomationReleaseEvidenceRecord.uiEvidence.v1",
    source: cleanString(validation.source || summary.source || "growth-learning-automation-ui-evidence-service", 180),
    privacyClass: "summary_only",
    summaryOnly: true,
    validatedBy: "learning-automation-ui-evidence-service",
    validationSchemaVersion: cleanString(validation.schemaVersion, 180),
    evidenceKey,
    checkKey: CHECK_KEY_BY_EVIDENCE_KEY[evidenceKey] || "",
    uiGate: cleanString(validation.uiGate, 120),
    status: "pass",
    ok: true,
    present: true,
    readyForReleaseEvidence: validation.readyForReleaseEvidence === true,
    uiEvidence: validation.uiEvidence || {},
    uiEvidenceBoundary: validation.uiEvidenceBoundary || {},
    missingRequired: Array.isArray(validation.missingRequired) ? validation.missingRequired : [],
    privateValueFindingCount: Array.isArray(validation.privateValueFindings) ? validation.privateValueFindings.length : 0,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  });
}

function compactStringArray(value = [], max = 120) {
  return asArray(value).map((item) => cleanString(item, max)).filter(Boolean).slice(0, 20);
}

function compactUiEvidenceProjection(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return {
    source: cleanString(value.source, 120),
    evidenceKey: cleanString(value.evidenceKey || value.evidence_key, 160),
    checkKey: cleanString(value.checkKey || value.check_key, 160),
    uiGate: cleanString(value.uiGate || value.ui_gate, 120),
    status: cleanString(value.status, 80),
    checkedAt: cleanString(value.checkedAt || value.checked_at, 120),
    clientVersion: cleanString(value.clientVersion || value.client_version, 120),
    route: cleanString(value.route, 180),
    screen: cleanString(value.screen, 120),
    screenshotPresent: value.screenshotPresent === true || value.screenshot_present === true,
    domEvidencePresent: value.domEvidencePresent === true || value.dom_evidence_present === true,
    screenshotArtifactName: cleanString(value.screenshotArtifactName || value.screenshot_artifact_name, 180),
    evidenceFilePresent: value.evidenceFilePresent === true || value.evidence_file_present === true,
    evidenceFileName: cleanString(value.evidenceFileName || value.evidence_file_name, 180),
    coverage: compactStringArray(value.coverage),
    requiredCoverage: compactStringArray(value.requiredCoverage || value.required_coverage),
    missingCoverage: compactStringArray(value.missingCoverage || value.missing_coverage),
    assertionCount: Number(value.assertionCount || value.assertion_count || 0) || 0,
    failedAssertionCount: Number(value.failedAssertionCount || value.failed_assertion_count || 0) || 0
  };
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

function compactUiBagFields(record = {}, evidence = {}) {
  const evidenceKey = canonicalReleaseEvidenceKey(record.evidenceKey || evidence.evidenceKey);
  if (!UI_RELEASE_EVIDENCE_KEYS.has(evidenceKey)) return {};
  return {
    evidenceKey,
    checkKey: CHECK_KEY_BY_EVIDENCE_KEY[evidenceKey] || "",
    schemaVersion: cleanString(evidence.schemaVersion || evidence.schema_version, 180),
    privacyClass: cleanString(evidence.privacyClass || evidence.privacy_class, 80),
    summaryOnly: evidence.summaryOnly === true || evidence.summary_only === true,
    validationSchemaVersion: cleanString(evidence.validationSchemaVersion || evidence.validation_schema_version, 180),
    validatedBy: cleanString(evidence.validatedBy || evidence.validated_by, 160),
    readyForReleaseEvidence: evidence.readyForReleaseEvidence === true || evidence.ready_for_release_evidence === true,
    uiGate: cleanString(evidence.uiGate || evidence.ui_gate, 120),
    uiEvidence: compactUiEvidenceProjection(evidence.uiEvidence || evidence.ui_evidence),
    uiEvidenceBoundary: compactUiEvidenceBoundary(evidence.uiEvidenceBoundary || evidence.ui_evidence_boundary),
    missingRequired: compactStringArray(evidence.missingRequired || evidence.missing_required),
    privateValueFindingCount: Number(evidence.privateValueFindingCount || evidence.private_value_finding_count || 0) || 0
  };
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
    passedGateKeys: compactStringArray(value.passedGateKeys || value.passed_gate_keys),
    missingGateKeys: compactStringArray(value.missingGateKeys || value.missing_gate_keys),
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

function compactOwnerReviewBagFields(record = {}, evidence = {}) {
  const evidenceKey = canonicalReleaseEvidenceKey(record.evidenceKey || evidence.evidenceKey);
  if (evidenceKey !== "ownerReviewEvidence") return {};
  const summary = compactOwnerReviewStageSummary(
    evidence.ownerReviewStageSummary
      || evidence.owner_review_stage_summary
      || evidence.summary
      || evidence.ownerReview
      || evidence.owner_review
  );
  return summary ? { ownerReviewStageSummary: summary } : {};
}

function validateUiReleaseEvidencePass({ input = {}, scope = {}, evidenceKey = "", uiEvidenceService = null }) {
  if (!UI_RELEASE_EVIDENCE_KEYS.has(evidenceKey)) {
    return { ok: true, evidence: evidenceSummary(input, evidenceKey) };
  }
  const candidate = evidenceSummary(input, evidenceKey);
  if (candidate.status !== "pass") {
    return { ok: true, evidence: Object.assign({}, candidate, { uiValidationRequiredForPass: true }) };
  }
  if (!uiEvidenceService || typeof uiEvidenceService.evaluate !== "function") {
    return unavailable("learning_automation_release_evidence_ui_validator_unavailable", {
      evidenceKey,
      checkKey: CHECK_KEY_BY_EVIDENCE_KEY[evidenceKey] || ""
    });
  }
  let validation;
  try {
    validation = uiEvidenceService.evaluate(uiValidationInput(input, scope, evidenceKey));
  } catch (error) {
    return unavailable("learning_automation_release_evidence_ui_validation_failed", {
      evidenceKey,
      checkKey: CHECK_KEY_BY_EVIDENCE_KEY[evidenceKey] || "",
      detail: cleanString(error && error.message ? error.message : error, 160)
    });
  }
  if (!validation?.ok || validation.readyForReleaseEvidence !== true || validation.status !== "pass") {
    return unavailable("learning_automation_release_evidence_ui_validation_failed", {
      evidenceKey,
      checkKey: CHECK_KEY_BY_EVIDENCE_KEY[evidenceKey] || "",
      validationStatus: cleanString(validation?.status, 80),
      validationError: cleanString(validation?.error, 120),
      missingRequired: Array.isArray(validation?.missingRequired) ? validation.missingRequired : []
    });
  }
  return { ok: true, evidence: uiValidatedEvidenceSummary(input, evidenceKey, validation) };
}

function compactBagEntry(record = {}) {
  const evidence = record.evidence || {};
  const evidenceKey = canonicalReleaseEvidenceKey(record.evidenceKey || evidence.evidenceKey);
  return Object.assign({
    schemaVersion: cleanString(evidence.schemaVersion || evidence.schema_version, 180) || "growth.learningAutomationReleaseEvidenceRecord.evidence.v1",
    privacyClass: cleanString(evidence.privacyClass || evidence.privacy_class || record.privacyClass || record.privacy_class || "summary_only", 80) || "summary_only",
    summaryOnly: true,
    evidenceKey,
    checkKey: cleanString(evidence.checkKey || evidence.check_key || record.checkKey || record.check_key, 160)
      || CHECK_KEY_BY_EVIDENCE_KEY[evidenceKey]
      || "",
    ok: record.status === "pass",
    status: record.status,
    present: record.status === "pass",
    evidenceId: cleanString(evidence.evidenceId || evidence.evidence_id || record.evidenceRecordId, 180),
    evidenceRecordId: cleanString(record.evidenceRecordId, 180),
    observedAt: cleanString(record.observedAt, 120),
    source: cleanString(evidence.source || "growth_release_evidence_record", 180),
    artifactId: cleanString(evidence.artifactId || evidence.artifact_id, 180),
    runId: cleanString(evidence.runId || evidence.run_id, 180),
    taskId: cleanString(evidence.taskId || evidence.task_id, 180),
    readyForReleaseEvidence: evidence.readyForReleaseEvidence === true || evidence.ready_for_release_evidence === true
  }, compactUiBagFields(record, evidence), compactOwnerReviewBagFields(record, evidence));
}

function createLearningAutomationReleaseEvidenceService(options = {}) {
  const repository = options.repository || null;
  const uiEvidenceService = options.uiEvidenceService || null;

  function recordEvidence(input = {}) {
    if (!repository || typeof repository.saveEvidence !== "function") {
      return unavailable("learning_automation_release_evidence_repository_unavailable");
    }
    const scope = scopeFrom(input);
    const evidenceKey = releaseEvidenceKeyFrom(input);
    if (!scope.workspaceId || !evidenceKey) return unavailable("learning_automation_release_evidence_scope_required");
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) return unavailable("learning_automation_release_evidence_privacy_failed", { privacyFindings });
    const validation = validateUiReleaseEvidencePass({ input, scope, evidenceKey, uiEvidenceService });
    if (!validation.ok) return validation;
    const saveResult = repository.saveEvidence(Object.assign({}, input, scope, {
      evidenceKey,
      checkKey: CHECK_KEY_BY_EVIDENCE_KEY[evidenceKey] || "",
      evidenceVersion: input.evidenceVersion || input.evidence_version || "growth.learningAutomationReleaseEvidenceRecord.v1",
      evidence: validation.evidence,
      recordedBy: input.recordedBy || input.recorded_by || input.requestedBy || input.requested_by,
      observedAt: input.observedAt || input.observed_at || input.recordedAt || input.recorded_at,
      privacyClass: "summary_only"
    }));
    if (!saveResult?.ok) return saveResult || unavailable("learning_automation_release_evidence_save_failed");
    return {
      ok: true,
      source: "growth-learning-automation-release-evidence-service",
      duplicate: Boolean(saveResult.duplicate),
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false,
      evidence: saveResult.evidence
    };
  }

  function listEvidence(input = {}) {
    if (!repository || typeof repository.listEvidence !== "function") {
      return unavailable("learning_automation_release_evidence_repository_unavailable");
    }
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_release_evidence_scope_required");
    const evidenceKey = releaseEvidenceKeyFrom(input);
    const evidence = repository.listEvidence(Object.assign({}, input, scope, {
      evidenceKey: evidenceKey || cleanString(input.evidenceKey || input.evidence_key || input.checkKey || input.check_key || input.key, 160)
    }));
    return {
      ok: true,
      source: "growth-learning-automation-release-evidence-service",
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      count: evidence.length,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false,
      evidence
    };
  }

  function evidenceBag(input = {}) {
    const result = listEvidence(Object.assign({}, input, {
      status: input.status || "pass",
      limit: input.limit || 100
    }));
    if (!result.ok) return result;
    const evidence = {};
    for (const record of result.evidence) {
      const key = canonicalReleaseEvidenceKey(record.evidenceKey);
      if (key && RELEASE_EVIDENCE_KEYS.includes(key) && !evidence[key] && record.status === "pass") {
        evidence[key] = compactBagEntry(record);
      }
    }
    return Object.assign({}, result, {
      evidence,
      evidenceKeys: Object.keys(evidence).sort()
    });
  }

  return {
    evidenceBag,
    listEvidence,
    recordEvidence
  };
}

module.exports = {
  CHECK_KEY_BY_EVIDENCE_KEY,
  RELEASE_EVIDENCE_KEYS,
  UI_RELEASE_EVIDENCE_KEYS,
  canonicalReleaseEvidenceKey,
  createLearningAutomationReleaseEvidenceService
};
