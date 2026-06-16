"use strict";

const RELEASE_EVIDENCE_KEYS = Object.freeze([
  "ownerDailyUiEvidence",
  "ownerAuditUiEvidence",
  "stageCheckpointEvidence",
  "proposalReviewUiEvidence",
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
  "productionDailyLoopWriteSmokeEvidence",
  "productionLearnerCycleSmokeEvidence",
  "productionSchedulerDryRunSmokeEvidence",
  "releaseEvidenceBundleAudit",
  "platformActionEvidence",
  "centralVisualEvidence",
  "ownerReviewEvidence"
]);

const CHECK_KEY_BY_EVIDENCE_KEY = Object.freeze({
  ownerDailyUiEvidence: "owner_daily_ui_evidence",
  ownerAuditUiEvidence: "owner_audit_ui_evidence",
  stageCheckpointEvidence: "stage_checkpoint_evidence",
  proposalReviewUiEvidence: "proposal_review_ui_evidence",
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
  productionDailyLoopWriteSmokeEvidence: "production_daily_loop_write_smoke_evidence",
  productionLearnerCycleSmokeEvidence: "production_learner_cycle_smoke_evidence",
  productionSchedulerDryRunSmokeEvidence: "production_scheduler_dry_run_smoke_evidence",
  releaseEvidenceBundleAudit: "release_evidence_bundle_audit",
  platformActionEvidence: "platform_action_evidence",
  centralVisualEvidence: "central_visual_evidence",
  ownerReviewEvidence: "owner_review_evidence"
});

const RELEASE_EVIDENCE_KEY_ALIASES = new Map();
for (const key of RELEASE_EVIDENCE_KEYS) {
  RELEASE_EVIDENCE_KEY_ALIASES.set(key, key);
  RELEASE_EVIDENCE_KEY_ALIASES.set(key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`), key);
  RELEASE_EVIDENCE_KEY_ALIASES.set(CHECK_KEY_BY_EVIDENCE_KEY[key], key);
}

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|access-key\.txt|launch-token)/i;

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
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

function compactBagEntry(record = {}) {
  const evidence = record.evidence || {};
  return {
    ok: record.status === "pass",
    status: record.status,
    present: record.status === "pass",
    evidenceId: cleanString(evidence.evidenceId || evidence.evidence_id || record.evidenceRecordId, 180),
    evidenceRecordId: cleanString(record.evidenceRecordId, 180),
    observedAt: cleanString(record.observedAt, 120),
    source: cleanString(evidence.source || "growth_release_evidence_record", 180),
    artifactId: cleanString(evidence.artifactId || evidence.artifact_id, 180),
    runId: cleanString(evidence.runId || evidence.run_id, 180),
    taskId: cleanString(evidence.taskId || evidence.task_id, 180)
  };
}

function createLearningAutomationReleaseEvidenceService(options = {}) {
  const repository = options.repository || null;

  function recordEvidence(input = {}) {
    if (!repository || typeof repository.saveEvidence !== "function") {
      return unavailable("learning_automation_release_evidence_repository_unavailable");
    }
    const scope = scopeFrom(input);
    const evidenceKey = releaseEvidenceKeyFrom(input);
    if (!scope.workspaceId || !evidenceKey) return unavailable("learning_automation_release_evidence_scope_required");
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) return unavailable("learning_automation_release_evidence_privacy_failed", { privacyFindings });
    const saveResult = repository.saveEvidence(Object.assign({}, input, scope, {
      evidenceKey,
      checkKey: CHECK_KEY_BY_EVIDENCE_KEY[evidenceKey] || "",
      evidenceVersion: input.evidenceVersion || input.evidence_version || "growth.learningAutomationReleaseEvidenceRecord.v1",
      evidence: evidenceSummary(input, evidenceKey),
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
  RELEASE_EVIDENCE_KEYS,
  canonicalReleaseEvidenceKey,
  createLearningAutomationReleaseEvidenceService
};
