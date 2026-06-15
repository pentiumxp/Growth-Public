"use strict";

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = []) {
  const raw = Array.isArray(values) ? values : String(values || "").split(",");
  return Array.from(new Set(raw.map(cleanString).filter(Boolean)));
}

function boundedText(value, max = 360) {
  const text = cleanString(value);
  return text.length > max ? text.slice(0, max) : text;
}

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body)/i;

function scanPrivacy(value, path = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, `${path}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacy(child, childPath, findings);
  }
  return findings;
}

function unavailable(error, extra = {}) {
  return Object.assign({
    ok: false,
    error: cleanString(error) || "learning_automation_failure_policy_unavailable"
  }, extra);
}

function policyScope(input = {}) {
  return {
    workspaceId: cleanString(input.workspaceId || input.workspace_id),
    learnerId: cleanString(input.learnerId || input.learner_id || input.workspaceId || input.workspace_id),
    programId: cleanString(input.programId || input.program_id),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id),
    domain: cleanString(input.domain),
    subject: cleanString(input.subject),
    horizon: cleanString(input.horizon || "daily_plan") || "daily_plan"
  };
}

function defaultPolicy(input = {}) {
  const scope = policyScope(input);
  const requestedPolicy = input.policy || input.policySummary || input.policy_summary || {};
  return Object.assign({
    schemaVersion: "growth.learningAutomationFailurePolicy.v1",
    summaryOnly: true,
    policyMode: "owner_supervised_manual_retry",
    ownerReviewRequired: true,
    digestReviewRequired: true,
    proposalReviewRequired: true,
    auditCompletenessRequired: true,
    targetProvisioningRequired: true,
    rollbackPolicyRequired: true,
    actionHandoffRequiredBeforeScheduling: true,
    writefulSchedulingAllowed: false,
    scope
  }, requestedPolicy, {
    schemaVersion: cleanString(requestedPolicy.schemaVersion) || "growth.learningAutomationFailurePolicy.v1",
    summaryOnly: true,
    ownerReviewRequired: requestedPolicy.ownerReviewRequired !== false,
    digestReviewRequired: requestedPolicy.digestReviewRequired !== false,
    proposalReviewRequired: requestedPolicy.proposalReviewRequired !== false,
    auditCompletenessRequired: requestedPolicy.auditCompletenessRequired !== false,
    targetProvisioningRequired: requestedPolicy.targetProvisioningRequired !== false,
    rollbackPolicyRequired: requestedPolicy.rollbackPolicyRequired !== false,
    actionHandoffRequiredBeforeScheduling: requestedPolicy.actionHandoffRequiredBeforeScheduling !== false,
    writefulSchedulingAllowed: false,
    scope
  });
}

function defaultRollbackPolicy(input = {}) {
  const requested = input.rollbackPolicy || input.rollback_policy || input.rollback || {};
  return Object.assign({
    schemaVersion: "growth.learningAutomationFailurePolicy.rollback.v1",
    summaryOnly: true,
    transactionalPublishRequired: true,
    partialPublishBehavior: "service_transaction_rollback",
    planPublishAttemptFailure: "record_bounded_publish_attempt_keep_draft_unpublished",
    proposalExecutionFailure: "record_bounded_execution_failure_owner_retry",
    digestReviewFailure: "keep_digest_review_state_without_execution",
    actionHandoffFailure: "no_learning_write_visible_owner_retry",
    retryRequiresOwner: true,
    maxAutomaticRetries: 0
  }, requested, {
    schemaVersion: cleanString(requested.schemaVersion) || "growth.learningAutomationFailurePolicy.rollback.v1",
    summaryOnly: true,
    transactionalPublishRequired: requested.transactionalPublishRequired !== false,
    retryRequiresOwner: requested.retryRequiresOwner !== false,
    maxAutomaticRetries: 0
  });
}

function defaultFailurePolicy(input = {}) {
  const requested = input.failurePolicy || input.failure_policy || input.failure || {};
  return Object.assign({
    schemaVersion: "growth.learningAutomationFailurePolicy.failure.v1",
    summaryOnly: true,
    visibleFailureRequired: true,
    ownerReviewRequired: true,
    retryRequiresOwner: true,
    maxAutomaticRetries: 0,
    writefulSchedulingAllowed: false,
    failureStates: [
      "publish_failed",
      "policy_blocked",
      "proposal_execution_failed",
      "action_handoff_failed",
      "db_transaction_rolled_back"
    ],
    retryActions: [
      "owner_retry_publish",
      "owner_archive_policy",
      "owner_supersede_policy"
    ]
  }, requested, {
    schemaVersion: cleanString(requested.schemaVersion) || "growth.learningAutomationFailurePolicy.failure.v1",
    summaryOnly: true,
    visibleFailureRequired: requested.visibleFailureRequired !== false,
    ownerReviewRequired: requested.ownerReviewRequired !== false,
    retryRequiresOwner: requested.retryRequiresOwner !== false,
    maxAutomaticRetries: 0,
    writefulSchedulingAllowed: false,
    failureStates: uniqueStrings(requested.failureStates || requested.failure_states || [
      "publish_failed",
      "policy_blocked",
      "proposal_execution_failed",
      "action_handoff_failed",
      "db_transaction_rolled_back"
    ]),
    retryActions: uniqueStrings(requested.retryActions || requested.retry_actions || [
      "owner_retry_publish",
      "owner_archive_policy",
      "owner_supersede_policy"
    ])
  });
}

function readinessFromPolicy(policy) {
  if (!policy) {
    return {
      status: "missing_active_failure_policy",
      readyForWritefulAutomationPrerequisite: false,
      writefulSchedulingAllowed: false,
      missingRequired: ["active_failure_policy"],
      requiredActions: [{
        action: "create_or_activate_failure_policy",
        requiredActor: "owner",
        endpoint: "/api/v1/growth/automation/failure-policies"
      }]
    };
  }
  return {
    status: "failure_policy_ready",
    readyForWritefulAutomationPrerequisite: true,
    writefulSchedulingAllowed: false,
    missingRequired: [],
    requiredActions: [],
    summary: {
      policyId: policy.policyId,
      status: policy.status,
      visibleFailureRequired: policy.failurePolicy?.visibleFailureRequired !== false,
      retryRequiresOwner: policy.failurePolicy?.retryRequiresOwner !== false,
      maxAutomaticRetries: Number(policy.failurePolicy?.maxAutomaticRetries || 0) || 0,
      transactionalPublishRequired: policy.rollbackPolicy?.transactionalPublishRequired !== false,
      partialPublishBehavior: cleanString(policy.rollbackPolicy?.partialPublishBehavior),
      actionHandoffFailure: cleanString(policy.rollbackPolicy?.actionHandoffFailure)
    }
  };
}

function createLearningAutomationFailurePolicyService(options = {}) {
  const repository = options.repository || null;

  function createPolicy(input = {}) {
    if (!repository || typeof repository.savePolicy !== "function") {
      return unavailable("learning_automation_failure_policy_repository_unavailable");
    }
    const scope = policyScope(input);
    if (!scope.workspaceId) return unavailable("learning_automation_failure_policy_scope_required");
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) return unavailable("learning_automation_failure_policy_privacy_failed", { privacyFindings });
    const saveResult = repository.savePolicy(Object.assign({}, scope, {
      policyVersion: input.policyVersion || input.policy_version || "growth.learningAutomationFailurePolicy.v1",
      status: "draft",
      policy: defaultPolicy(input),
      rollbackPolicy: defaultRollbackPolicy(input),
      failurePolicy: defaultFailurePolicy(input),
      createdBy: input.createdBy || input.created_by || input.requestedBy || input.requested_by,
      privacyClass: "summary_only"
    }));
    if (!saveResult?.ok) return saveResult || unavailable("learning_automation_failure_policy_save_failed");
    return {
      ok: true,
      source: "growth-learning-automation-failure-policy-service",
      duplicate: Boolean(saveResult.duplicate),
      policy: saveResult.policy,
      readiness: readinessFromPolicy(saveResult.policy?.status === "active" ? saveResult.policy : null)
    };
  }

  function listPolicies(input = {}) {
    if (!repository || typeof repository.listPolicies !== "function") {
      return unavailable("learning_automation_failure_policy_repository_unavailable");
    }
    const scope = policyScope(input);
    if (!scope.workspaceId) return unavailable("learning_automation_failure_policy_scope_required");
    const policies = repository.listPolicies(Object.assign({}, input, scope));
    return {
      ok: true,
      source: "growth-learning-automation-failure-policy-service",
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      count: policies.length,
      policies
    };
  }

  function reviewPolicy(input = {}) {
    if (!repository || typeof repository.reviewPolicy !== "function") {
      return unavailable("learning_automation_failure_policy_repository_unavailable");
    }
    const scope = policyScope(input);
    const policyId = cleanString(input.policyId || input.policy_id);
    if (!scope.workspaceId || !policyId) return unavailable("learning_automation_failure_policy_scope_required");
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) return unavailable("learning_automation_failure_policy_privacy_failed", { privacyFindings });
    const result = repository.reviewPolicy(Object.assign({}, input, scope, { policyId }));
    if (!result?.ok) return result || unavailable("learning_automation_failure_policy_review_failed");
    return {
      ok: true,
      source: "growth-learning-automation-failure-policy-service",
      duplicate: Boolean(result.duplicate),
      policy: result.policy,
      readiness: readinessFromPolicy(result.policy?.status === "active" ? result.policy : null)
    };
  }

  function evaluateReadiness(input = {}) {
    if (!repository || typeof repository.listPolicies !== "function") {
      return unavailable("learning_automation_failure_policy_repository_unavailable");
    }
    const scope = policyScope(input);
    if (!scope.workspaceId) return unavailable("learning_automation_failure_policy_scope_required");
    const policies = repository.listPolicies(Object.assign({}, scope, {
      status: "active",
      limit: 1
    }));
    const activePolicy = policies[0] || null;
    return Object.assign({
      ok: true,
      source: "growth-learning-automation-failure-policy-service",
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      programId: scope.programId,
      domainPackId: scope.domainPackId,
      domain: scope.domain,
      subject: scope.subject,
      horizon: scope.horizon,
      policy: activePolicy
    }, readinessFromPolicy(activePolicy));
  }

  return {
    createPolicy,
    evaluateReadiness,
    listPolicies,
    reviewPolicy
  };
}

module.exports = {
  createLearningAutomationFailurePolicyService
};
