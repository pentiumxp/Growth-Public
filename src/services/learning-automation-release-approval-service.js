"use strict";

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|access-key\.txt|launch-token)/i;

const APPROVAL_KEYS = [
  "writefulExecutionApproval",
  "backgroundSchedulerApproval",
  "backgroundWorkerApproval"
];

const APPROVAL_KEY_ALIASES = new Map([
  ["writefulExecutionApproval", "writefulExecutionApproval"],
  ["writeful_execution_approval", "writefulExecutionApproval"],
  ["writeful_execution_release_approval", "writefulExecutionApproval"],
  ["writeful_execution", "writefulExecutionApproval"],
  ["automation_writeful_execution", "writefulExecutionApproval"],
  ["automationWritefulExecutionEnabled", "writefulExecutionApproval"],
  ["backgroundSchedulerApproval", "backgroundSchedulerApproval"],
  ["background_scheduler_approval", "backgroundSchedulerApproval"],
  ["background_scheduler_release_approval", "backgroundSchedulerApproval"],
  ["background_scheduler", "backgroundSchedulerApproval"],
  ["automation_background_scheduler", "backgroundSchedulerApproval"],
  ["automationBackgroundSchedulerEnabled", "backgroundSchedulerApproval"],
  ["backgroundWorkerApproval", "backgroundWorkerApproval"],
  ["background_worker_approval", "backgroundWorkerApproval"],
  ["background_worker_release_approval", "backgroundWorkerApproval"],
  ["background_worker", "backgroundWorkerApproval"],
  ["automation_background_worker", "backgroundWorkerApproval"],
  ["automationBackgroundWorkerEnabled", "backgroundWorkerApproval"]
]);

function cleanString(value) {
  return String(value || "").trim();
}

function unavailable(error, extra = {}) {
  return Object.assign({
    ok: false,
    source: "growth-learning-automation-release-approval-service",
    error: cleanString(error) || "learning_automation_release_approval_unavailable"
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
  const workspaceId = cleanString(input.workspaceId || input.workspace_id);
  return {
    workspaceId,
    learnerId: cleanString(input.learnerId || input.learner_id || workspaceId),
    programId: cleanString(input.programId || input.program_id),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id),
    domain: cleanString(input.domain),
    subject: cleanString(input.subject),
    horizon: cleanString(input.horizon || "daily_plan") || "daily_plan",
    displayName: cleanString(input.displayName || input.display_name),
    label: cleanString(input.label)
  };
}

function canonicalApprovalKey(value) {
  const key = cleanString(value);
  return APPROVAL_KEY_ALIASES.get(key) || "";
}

function approvalKeyFrom(input = {}) {
  return canonicalApprovalKey(
    input.approvalKey
    || input.approval_key
    || input.configGate
    || input.config_gate
    || input.gate
    || input.key
  );
}

function approvalSummary(input = {}, approvalKey) {
  const requested = input.approval || input.approvalSummary || input.approval_summary || {};
  return Object.assign({}, requested, {
    schemaVersion: cleanString(requested.schemaVersion || requested.schema_version) || "growth.learningAutomationReleaseApproval.v1",
    summaryOnly: true,
    approvalKey,
    approved: true,
    status: "approved",
    writefulSchedulingAllowed: false
  });
}

function approvalEvidence(input = {}) {
  const evidence = input.evidence || input.evidenceSummary || input.evidence_summary || {};
  return Object.assign({}, evidence, {
    schemaVersion: cleanString(evidence.schemaVersion || evidence.schema_version) || "growth.learningAutomationReleaseApproval.evidence.v1",
    summaryOnly: true
  });
}

function approvalBagEntry(approval = {}) {
  return {
    approved: approval.status === "approved",
    status: approval.status,
    approvalId: approval.approvalId,
    approvedBy: approval.approvedBy,
    approvedAt: approval.approvedAt,
    source: "growth_release_approval_record"
  };
}

function createLearningAutomationReleaseApprovalService(options = {}) {
  const repository = options.repository || null;

  function recordApproval(input = {}) {
    if (!repository || typeof repository.saveApproval !== "function") {
      return unavailable("learning_automation_release_approval_repository_unavailable");
    }
    const scope = scopeFrom(input);
    const approvalKey = approvalKeyFrom(input);
    if (!scope.workspaceId || !approvalKey) return unavailable("learning_automation_release_approval_scope_required");
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) return unavailable("learning_automation_release_approval_privacy_failed", { privacyFindings });
    const saveResult = repository.saveApproval(Object.assign({}, input, scope, {
      approvalKey,
      status: "approved",
      approvalVersion: input.approvalVersion || input.approval_version || "growth.learningAutomationReleaseApproval.v1",
      approval: approvalSummary(input, approvalKey),
      evidence: approvalEvidence(input),
      approvedBy: input.approvedBy || input.approved_by || input.requestedBy || input.requested_by,
      approvedAt: input.approvedAt || input.approved_at,
      privacyClass: "summary_only"
    }));
    if (!saveResult?.ok) return saveResult || unavailable("learning_automation_release_approval_save_failed");
    return {
      ok: true,
      source: "growth-learning-automation-release-approval-service",
      duplicate: Boolean(saveResult.duplicate),
      writefulSchedulingAllowed: false,
      approval: saveResult.approval
    };
  }

  function listApprovals(input = {}) {
    if (!repository || typeof repository.listApprovals !== "function") {
      return unavailable("learning_automation_release_approval_repository_unavailable");
    }
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_release_approval_scope_required");
    const approvalKey = approvalKeyFrom(input);
    const approvals = repository.listApprovals(Object.assign({}, input, scope, {
      approvalKey: approvalKey || cleanString(input.approvalKey || input.approval_key || input.configGate || input.config_gate)
    }));
    return {
      ok: true,
      source: "growth-learning-automation-release-approval-service",
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      count: approvals.length,
      writefulSchedulingAllowed: false,
      approvals
    };
  }

  function approvalBag(input = {}) {
    const result = listApprovals(Object.assign({}, input, {
      status: input.status || "approved",
      limit: input.limit || 50
    }));
    if (!result.ok) return result;
    const bag = {};
    for (const approval of result.approvals) {
      const key = canonicalApprovalKey(approval.approvalKey);
      if (key && APPROVAL_KEYS.includes(key) && !bag[key] && approval.status === "approved") {
        bag[key] = approvalBagEntry(approval);
      }
    }
    return Object.assign({}, result, {
      releaseApproval: bag,
      approvalKeys: Object.keys(bag).sort()
    });
  }

  return {
    approvalBag,
    listApprovals,
    recordApproval
  };
}

module.exports = {
  APPROVAL_KEYS,
  canonicalApprovalKey,
  createLearningAutomationReleaseApprovalService
};
