"use strict";

const crypto = require("node:crypto");
const { cleanString } = require("./core");

function sha256Hex(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function stableAudioBlobId(recordType, recordId) {
  const hash = sha256Hex(`${recordType}:${recordId}`).slice(0, 18);
  return `gaudio_${hash}`;
}

function stableSubmissionId(input = {}) {
  const explicit = cleanString(input.submissionId || input.submission_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId),
    cleanString(input.taskCardId),
    cleanString(input.submittedAt),
    cleanString(input.text),
    cleanString(input.audio?.digest)
  ].join(":");
  return `lsub_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableEvaluationJobId(submissionId) {
  return `lgjob_${sha256Hex(cleanString(submissionId)).slice(0, 18)}`;
}

function stableEvaluationId(submissionId) {
  return `lgeval_${sha256Hex(cleanString(submissionId)).slice(0, 18)}`;
}

function stableSessionId(submissionId) {
  return `lsess_${sha256Hex(cleanString(submissionId)).slice(0, 18)}`;
}

function stableReflectionId(input = {}) {
  const explicit = cleanString(input.reflectionId || input.reflection_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId),
    cleanString(input.taskCardId),
    cleanString(input.submittedAt),
    cleanString(input.text),
    cleanString(input.audio?.digest)
  ].join(":");
  return `lrefl_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableRewardSettlementId(evaluationId) {
  return `lrwd_${sha256Hex(cleanString(evaluationId)).slice(0, 18)}`;
}

function stableLearningCoinLedgerEntryId(idempotencyKey) {
  return `lcoin_${sha256Hex(cleanString(idempotencyKey)).slice(0, 18)}`;
}

function stableLearningEvidenceId(input = {}) {
  const explicit = cleanString(input.evidenceId || input.evidence_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.sourceType || input.source_type),
    cleanString(input.sourceId || input.source_id),
    cleanString(input.graphNodeId || input.graph_node_id || input.nodeId || input.node_id)
  ].join(":");
  return `lgevd_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableLearningPlanDraftId(input = {}) {
  const explicit = cleanString(input.planDraftId || input.plan_draft_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.horizon),
    cleanString(input.planSummary || input.plan_summary),
    sha256Hex(JSON.stringify(input.draft || input.planDraft || {})).slice(0, 18)
  ].join(":");
  return `lgplan_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableLearningAutomationProposalId(input = {}) {
  const explicit = cleanString(input.proposalId || input.proposal_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.programId || input.program_id),
    cleanString(input.horizon),
    cleanString(input.sourcePlanDraftId || input.source_plan_draft_id),
    cleanString(input.sourceTaskCardId || input.source_task_card_id),
    cleanString(input.sourceEvaluationId || input.source_evaluation_id),
    cleanString(input.planDraftId || input.plan_draft_id),
    cleanString(input.selectedItemId || input.selected_item_id)
  ].join(":");
  return `lgauto_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableLearningAutomationDigestId(input = {}) {
  const explicit = cleanString(input.digestId || input.digest_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.programId || input.program_id),
    cleanString(input.domainPackId || input.domain_pack_id),
    cleanString(input.domain),
    cleanString(input.subject),
    cleanString(input.horizon),
    sha256Hex(JSON.stringify(input.sourcePolicy || input.source_policy || {})).slice(0, 18),
    sha256Hex(JSON.stringify(input.candidateKeys || input.candidate_keys || [])).slice(0, 18)
  ].join(":");
  return `lgadig_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableLearningAutomationFailurePolicyId(input = {}) {
  const explicit = cleanString(input.policyId || input.policy_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.programId || input.program_id),
    cleanString(input.domainPackId || input.domain_pack_id),
    cleanString(input.domain),
    cleanString(input.subject),
    cleanString(input.horizon),
    cleanString(input.policyVersion || input.policy_version)
  ].join(":");
  return `lgafpol_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableLearningAutomationActionHandoffId(input = {}) {
  const explicit = cleanString(input.handoffId || input.handoff_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.programId || input.program_id),
    cleanString(input.digestId || input.digest_id),
    cleanString(input.policyId || input.policy_id),
    cleanString(input.horizon),
    sha256Hex(JSON.stringify(input.actionKeys || input.action_keys || [])).slice(0, 18)
  ].join(":");
  return `lgahand_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableLearningAutomationSchedulerExecutionId(input = {}) {
  const explicit = cleanString(input.executionId || input.execution_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.programId || input.program_id),
    cleanString(input.handoffId || input.handoff_id),
    cleanString(input.digestId || input.digest_id),
    cleanString(input.proposalId || input.proposal_id),
    cleanString(input.planDraftId || input.plan_draft_id),
    cleanString(input.selectedItemId || input.selected_item_id),
    cleanString(input.executionMode || input.execution_mode),
    cleanString(input.createdAt || input.created_at || input.requestedAt || input.requested_at)
  ].join(":");
  return `lgasexec_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableLearningAutomationSchedulerRunId(input = {}) {
  const explicit = cleanString(input.runId || input.run_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.programId || input.program_id),
    cleanString(input.domainPackId || input.domain_pack_id),
    cleanString(input.domain),
    cleanString(input.subject),
    cleanString(input.horizon),
    cleanString(input.mode || input.runMode || input.run_mode),
    cleanString(input.startedAt || input.started_at || input.createdAt || input.created_at || input.requestedAt || input.requested_at)
  ].join(":");
  return `lgasrun_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableLearningAutomationSchedulerWorkerLeaseId(input = {}) {
  const explicit = cleanString(input.leaseId || input.lease_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.programId || input.program_id),
    cleanString(input.domainPackId || input.domain_pack_id),
    cleanString(input.domain),
    cleanString(input.subject),
    cleanString(input.horizon),
    cleanString(input.mode || input.workerMode || input.worker_mode || "background_worker_tick")
  ].join(":");
  return `lgaslease_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableLearningAutomationSchedulerWorkerTargetId(input = {}) {
  const explicit = cleanString(input.workerTargetId || input.worker_target_id || input.targetId || input.target_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.programId || input.program_id),
    cleanString(input.domainPackId || input.domain_pack_id),
    cleanString(input.domain),
    cleanString(input.subject),
    cleanString(input.horizon),
    cleanString(input.targetVersion || input.target_version || "growth.learningAutomationSchedulerWorkerTarget.v1")
  ].join(":");
  return `lgastgt_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableLearningAutomationReleaseReadinessId(input = {}) {
  const explicit = cleanString(input.readinessId || input.readiness_id || input.snapshotId || input.snapshot_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.programId || input.program_id),
    cleanString(input.domainPackId || input.domain_pack_id),
    cleanString(input.domain),
    cleanString(input.subject),
    cleanString(input.horizon),
    cleanString(input.status),
    cleanString(input.createdAt || input.created_at || input.requestedAt || input.requested_at),
    sha256Hex(JSON.stringify(input.checkKeys || input.check_keys || [])).slice(0, 18)
  ].join(":");
  return `lgarel_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableLearningAutomationReleaseCollectionRunId(input = {}) {
  const explicit = cleanString(input.runId || input.run_id || input.collectionRunId || input.collection_run_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.programId || input.program_id),
    cleanString(input.domainPackId || input.domain_pack_id),
    cleanString(input.domain),
    cleanString(input.subject),
    cleanString(input.horizon),
    cleanString(input.status),
    cleanString(input.createdAt || input.created_at || input.requestedAt || input.requested_at),
    sha256Hex(JSON.stringify(input.summary || input.summary_json || {})).slice(0, 18)
  ].join(":");
  return `lgacrn_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableLearningAutomationReleaseDecisionId(input = {}) {
  const explicit = cleanString(input.decisionId || input.decision_id || input.releaseDecisionId || input.release_decision_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.programId || input.program_id),
    cleanString(input.domainPackId || input.domain_pack_id),
    cleanString(input.domain),
    cleanString(input.subject),
    cleanString(input.horizon),
    cleanString(input.collectionRunId || input.collection_run_id || input.runId || input.run_id),
    cleanString(input.status || input.decision || input.decisionStatus || input.decision_status),
    cleanString(input.decidedAt || input.decided_at || input.createdAt || input.created_at || input.requestedAt || input.requested_at)
  ].join(":");
  return `lgard_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableLearningAutomationReleasePackageId(input = {}) {
  const explicit = cleanString(input.packageId || input.package_id || input.releasePackageId || input.release_package_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.programId || input.program_id),
    cleanString(input.domainPackId || input.domain_pack_id),
    cleanString(input.domain),
    cleanString(input.subject),
    cleanString(input.horizon),
    cleanString(input.collectionRunId || input.collection_run_id || input.runId || input.run_id),
    cleanString(input.status),
    cleanString(input.createdAt || input.created_at || input.requestedAt || input.requested_at),
    sha256Hex(JSON.stringify(input.packageSummary || input.package_summary || input.summary || {})).slice(0, 18)
  ].join(":");
  return `lgapkg_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableLearningAutomationReleaseApprovalId(input = {}) {
  const explicit = cleanString(input.approvalId || input.approval_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.programId || input.program_id),
    cleanString(input.domainPackId || input.domain_pack_id),
    cleanString(input.domain),
    cleanString(input.subject),
    cleanString(input.horizon),
    cleanString(input.approvalKey || input.approval_key || input.configGate || input.config_gate),
    cleanString(input.approvalVersion || input.approval_version || "growth.learningAutomationReleaseApproval.v1")
  ].join(":");
  return `lgarap_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableLearningAutomationReleaseEvidenceRecordId(input = {}) {
  const explicit = cleanString(input.evidenceRecordId || input.evidence_record_id || input.recordId || input.record_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.programId || input.program_id),
    cleanString(input.domainPackId || input.domain_pack_id),
    cleanString(input.domain),
    cleanString(input.subject),
    cleanString(input.horizon),
    cleanString(input.evidenceKey || input.evidence_key || input.key),
    cleanString(input.status),
    cleanString(input.observedAt || input.observed_at || input.createdAt || input.created_at || input.requestedAt || input.requested_at),
    sha256Hex(JSON.stringify(input.evidence || input.evidenceSummary || input.evidence_summary || {})).slice(0, 18)
  ].join(":");
  return `lgarev_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableLearningAutomationReleasePreflightReportId(input = {}) {
  const explicit = cleanString(input.preflightReportId || input.preflight_report_id || input.reportId || input.report_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.programId || input.program_id),
    cleanString(input.domainPackId || input.domain_pack_id),
    cleanString(input.domain),
    cleanString(input.subject),
    cleanString(input.horizon),
    cleanString(input.collectionRunId || input.collection_run_id || input.runId || input.run_id),
    cleanString(input.status),
    cleanString(input.createdAt || input.created_at || input.requestedAt || input.requested_at),
    sha256Hex(JSON.stringify(input.summary || input.releasePreflight || input.release_preflight || {})).slice(0, 18)
  ].join(":");
  return `lgarpf_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableLearningAutomationReleaseActivationId(input = {}) {
  const explicit = cleanString(input.activationId || input.activation_id || input.releaseActivationId || input.release_activation_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.programId || input.program_id),
    cleanString(input.domainPackId || input.domain_pack_id),
    cleanString(input.domain),
    cleanString(input.subject),
    cleanString(input.horizon),
    cleanString(input.collectionRunId || input.collection_run_id || input.runId || input.run_id),
    cleanString(input.status || input.activationStatus || input.activation_status),
    sha256Hex(JSON.stringify(input.requestedActivationGates || input.requested_activation_gates || input.activationGates || input.activation_gates || [])).slice(0, 18),
    cleanString(input.recordedAt || input.recorded_at || input.approvedAt || input.approved_at || input.createdAt || input.created_at || input.requestedAt || input.requested_at)
  ].join(":");
  return `lgaract_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableLearningAutomationRuntimeEnablementId(input = {}) {
  const explicit = cleanString(input.enablementId || input.enablement_id || input.runtimeEnablementId || input.runtime_enablement_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.programId || input.program_id),
    cleanString(input.domainPackId || input.domain_pack_id),
    cleanString(input.domain),
    cleanString(input.subject),
    cleanString(input.horizon),
    cleanString(input.collectionRunId || input.collection_run_id || input.runId || input.run_id),
    cleanString(input.status || input.enablementStatus || input.enablement_status),
    sha256Hex(JSON.stringify(input.requestedActivationGates || input.requested_activation_gates || input.activationGates || input.activation_gates || [])).slice(0, 18),
    cleanString(input.recordedAt || input.recorded_at || input.approvedAt || input.approved_at || input.createdAt || input.created_at || input.requestedAt || input.requested_at)
  ].join(":");
  return `lgrten_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableDomainPackProvisionId(input = {}) {
  const explicit = cleanString(input.provisionId || input.provision_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.programId || input.program_id),
    cleanString(input.domainPackId || input.domain_pack_id),
    cleanString(input.subject)
  ].join(":");
  return `lgprov_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableProfileDeltaAuditId(input = {}) {
  const explicit = cleanString(input.profileDeltaId || input.profile_delta_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.programId || input.program_id),
    cleanString(input.taskCardId || input.task_card_id),
    cleanString(input.submissionId || input.submission_id),
    cleanString(input.evaluationId || input.evaluation_id)
  ].join(":");
  return `lgpdelta_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

module.exports = {
  sha256Hex,
  stableDomainPackProvisionId,
  stableAudioBlobId,
  stableEvaluationId,
  stableEvaluationJobId,
  stableLearningAutomationActionHandoffId,
  stableLearningAutomationDigestId,
  stableLearningAutomationFailurePolicyId,
  stableLearningAutomationProposalId,
  stableLearningAutomationSchedulerExecutionId,
  stableLearningAutomationSchedulerRunId,
  stableLearningAutomationSchedulerWorkerLeaseId,
  stableLearningAutomationSchedulerWorkerTargetId,
  stableLearningAutomationReleaseApprovalId,
  stableLearningAutomationReleaseActivationId,
  stableLearningAutomationReleaseCollectionRunId,
  stableLearningAutomationReleaseDecisionId,
  stableLearningAutomationReleaseEvidenceRecordId,
  stableLearningAutomationReleasePreflightReportId,
  stableLearningAutomationReleasePackageId,
  stableLearningAutomationReleaseReadinessId,
  stableLearningAutomationRuntimeEnablementId,
  stableLearningEvidenceId,
  stableLearningCoinLedgerEntryId,
  stableLearningPlanDraftId,
  stableProfileDeltaAuditId,
  stableReflectionId,
  stableRewardSettlementId,
  stableSessionId,
  stableSubmissionId
};
