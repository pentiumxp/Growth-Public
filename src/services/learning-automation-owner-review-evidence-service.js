"use strict";

const OWNER_REVIEW_EVIDENCE_SCHEMA = "growth.learningAutomationOwnerReviewEvidence.v1";

const PRIVACY_KEY_RE = /(raw|prompt|transcript|answer[_-]?key|secret|token|cookie|authorization|provider[_-]?config|api[_-]?key|access[_-]?key|private[_-]?key)/i;
const PRIVATE_VALUE_RE = /(\/Users\/|C:\\Users\\|access-key|\.hermes-growth|Authorization:|Bearer\s+)/i;

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function uniqueStrings(values, max = 32) {
  const seen = new Set();
  const out = [];
  for (const value of asArray(values)) {
    const clean = cleanString(value, 160);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= max) break;
  }
  return out;
}

function scanPrivacyKeys(value, path = "", findings = [], seen = new Set()) {
  if (!value || typeof value !== "object" || findings.length >= 16 || seen.has(value)) return findings;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (PRIVACY_KEY_RE.test(key)) findings.push(`privacy_key:${nextPath}`);
    if (findings.length >= 16) return findings;
    scanPrivacyKeys(child, nextPath, findings, seen);
    if (findings.length >= 16) return findings;
  }
  return findings;
}

function scanPrivateValues(value, path = "", findings = [], seen = new Set()) {
  if (findings.length >= 16) return findings;
  if (typeof value === "string") {
    if (PRIVATE_VALUE_RE.test(value)) findings.push(`private_value:${path || "value"}`);
    return findings;
  }
  if (!value || typeof value !== "object" || seen.has(value)) return findings;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;
    scanPrivateValues(child, nextPath, findings, seen);
    if (findings.length >= 16) return findings;
  }
  return findings;
}

function unavailable(error, scope = {}, extra = {}) {
  return Object.assign({}, scope, {
    ok: false,
    source: "growth-learning-automation-owner-review-evidence-service",
    schemaVersion: OWNER_REVIEW_EVIDENCE_SCHEMA,
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "blocked",
    error: cleanString(error) || "learning_automation_owner_review_evidence_unavailable",
    automationOwnerReviewEvidence: {
      schemaVersion: "growth.learningAutomationOwnerReviewEvidence.summary.v1",
      summaryOnly: true,
      status: "blocked",
      requiredActionCount: 1,
      nextAction: {
        key: cleanString(error) || "learning_automation_owner_review_evidence_unavailable",
        action: "review_owner_automation_dependency",
        requiredActor: "owner"
      },
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false
    },
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  }, extra);
}

function scopeFrom(input = {}) {
  return {
    workspaceId: cleanString(input.workspaceId || input.workspace_id, 180),
    learnerId: cleanString(input.learnerId || input.learner_id || input.workspaceId || input.workspace_id, 180),
    displayName: cleanString(input.displayName || input.display_name || input.label, 180),
    label: cleanString(input.label || input.displayName || input.display_name, 180),
    programId: cleanString(input.programId || input.program_id, 180),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id, 180),
    domain: cleanString(input.domain, 120),
    subject: cleanString(input.subject, 120),
    horizon: cleanString(input.horizon || "daily_plan", 80) || "daily_plan"
  };
}

function limitFrom(input = {}) {
  const value = Number(input.limit || input.recordLimit || input.record_limit || 5) || 5;
  return Math.max(1, Math.min(25, value));
}

function requestFor(scope, input = {}, extra = {}) {
  return Object.assign({}, scope, {
    limit: limitFrom(input)
  }, extra);
}

function requireMethod(scope, key, service, method) {
  if (!service || typeof service[method] !== "function") {
    return unavailable(`learning_automation_owner_review_${key}_unavailable`, scope);
  }
  return null;
}

function statusOf(record = {}) {
  return cleanString(record.status || record.reviewStatus || record.review_status || record.deliveryStatus || record.delivery_status, 120);
}

function countStatuses(records = []) {
  const counts = {};
  for (const record of records) {
    const status = statusOf(record) || "unknown";
    counts[status] = (counts[status] || 0) + 1;
  }
  return counts;
}

function executionStatusOf(record = {}) {
  const execution = objectOnly(record.execution);
  return cleanString(execution.status || record.executionStatus || record.execution_status, 120);
}

function latestId(record = {}) {
  return cleanString(record.proposalId || record.proposal_id
    || record.digestId || record.digest_id
    || record.handoffId || record.handoff_id
    || record.executionId || record.execution_id
    || record.runId || record.run_id
    || record.targetId || record.target_id
    || record.policyId || record.policy_id
    || record.readinessId || record.readiness_id
    || record.id, 180);
}

function listSummary(result = {}, listKey, idLabel) {
  const records = asArray(result[listKey]);
  const latest = objectOnly(records[0]);
  return {
    schemaVersion: `growth.learningAutomationOwnerReviewEvidence.${listKey}.v1`,
    summaryOnly: true,
    ok: result.ok === true,
    count: Number(result.count || records.length) || 0,
    latestId: latestId(latest),
    latestStatus: statusOf(latest),
    statuses: countStatuses(records),
    idLabel: cleanString(idLabel, 80)
  };
}

function proposalSummary(result = {}) {
  const records = asArray(result.proposals);
  const base = listSummary(result, "proposals", "proposalId");
  const decidedStatuses = new Set(["accepted", "skipped", "expired", "superseded"]);
  const executionStatusCounts = {};
  for (const record of records) {
    const status = executionStatusOf(record);
    if (!status) continue;
    executionStatusCounts[status] = (executionStatusCounts[status] || 0) + 1;
  }
  return Object.assign(base, {
    proposedCount: records.filter((item) => statusOf(item) === "proposed").length,
    acceptedCount: records.filter((item) => statusOf(item) === "accepted").length,
    skippedCount: records.filter((item) => statusOf(item) === "skipped").length,
    expiredCount: records.filter((item) => statusOf(item) === "expired").length,
    supersededCount: records.filter((item) => statusOf(item) === "superseded").length,
    ownerDecisionCount: records.filter((item) => decidedStatuses.has(statusOf(item))).length,
    pendingCount: records.filter((item) => ["proposed", "pending", "draft", ""].includes(statusOf(item))).length,
    rejectedCount: records.filter((item) => ["rejected", "declined"].includes(statusOf(item))).length,
    executionCount: records.filter((item) => executionStatusOf(item)).length,
    publishedExecutionCount: records.filter((item) => executionStatusOf(item) === "published").length,
    blockedExecutionCount: records.filter((item) => executionStatusOf(item) === "blocked").length,
    failedExecutionCount: records.filter((item) => executionStatusOf(item) === "failed").length,
    executionStatuses: executionStatusCounts
  });
}

function digestSummary(result = {}) {
  const records = asArray(result.digests);
  const base = listSummary(result, "digests", "digestId");
  return Object.assign(base, {
    reviewedCount: records.filter((item) => statusOf(item) === "reviewed").length,
    pendingCount: records.filter((item) => ["pending", "draft", ""].includes(statusOf(item))).length,
    requiredActionCount: records.reduce((sum, item) => sum + asArray(item.requiredActions || item.required_actions).length, 0),
    blockedCandidateCount: records.reduce((sum, item) => sum + asArray(item.blocked).length, 0)
  });
}

function actionHandoffSummary(result = {}) {
  const records = asArray(result.handoffs);
  const latest = objectOnly(records[0]);
  return Object.assign(listSummary(result, "handoffs", "handoffId"), {
    latestDeliveryStatus: cleanString(latest.deliveryStatus || latest.delivery_status, 120),
    deliveredCount: records.filter((item) => cleanString(item.deliveryStatus || item.delivery_status) === "delivered").length,
    pendingDeliveryCount: records.filter((item) => cleanString(item.deliveryStatus || item.delivery_status) === "not_delivered").length,
    actionCount: records.reduce((sum, item) => sum + asArray(item.actions).length, 0),
    blockedCount: records.reduce((sum, item) => sum + asArray(item.blocked).length, 0)
  });
}

function executionSummary(result = {}) {
  const records = asArray(result.executions);
  return Object.assign(listSummary(result, "executions", "executionId"), {
    publishedCount: records.filter((item) => statusOf(item) === "published").length,
    blockedCount: records.filter((item) => statusOf(item) === "blocked").length,
    failedCount: records.filter((item) => statusOf(item) === "failed").length
  });
}

function runSummary(result = {}) {
  const records = asArray(result.runs);
  return Object.assign(listSummary(result, "runs", "runId"), {
    completedCount: records.filter((item) => statusOf(item) === "completed").length,
    blockedCount: records.filter((item) => statusOf(item) === "blocked").length,
    skippedCount: records.filter((item) => statusOf(item) === "skipped").length
  });
}

function workerTargetSummary(result = {}) {
  const records = asArray(result.targets);
  return Object.assign(listSummary(result, "targets", "targetId"), {
    enabledCount: records.filter((item) => statusOf(item) === "enabled").length,
    pendingReviewCount: records.filter((item) => ["pending", "needs_review", ""].includes(statusOf(item))).length,
    disabledCount: records.filter((item) => ["disabled", "archived"].includes(statusOf(item))).length,
    productionSchedulingAllowed: false
  });
}

function failurePolicySummary(readiness = {}) {
  const policy = objectOnly(readiness.policy);
  return {
    schemaVersion: "growth.learningAutomationOwnerReviewEvidence.failurePolicy.v1",
    summaryOnly: true,
    ok: readiness.ok === true,
    status: cleanString(readiness.status || policy.status, 120),
    policyId: cleanString(readiness.summary?.policyId || policy.policyId || policy.policy_id, 180),
    readyForWritefulAutomationPrerequisite: readiness.readyForWritefulAutomationPrerequisite === true,
    writefulSchedulingAllowed: false
  };
}

function releaseReadinessSummary(readiness = {}) {
  const review = objectOnly(readiness.releaseReview);
  return {
    schemaVersion: "growth.learningAutomationOwnerReviewEvidence.releaseReadiness.v1",
    summaryOnly: true,
    ok: readiness.ok === true,
    status: cleanString(readiness.status || review.status, 120),
    readyForReleaseReview: readiness.readyForReleaseReview === true,
    requiredActionCount: Number(review.requiredActionCount || 0) || 0,
    missingCheckKeys: uniqueStrings(review.missingCheckKeys || readiness.missingCheckKeys || []),
    blockedCheckKeys: uniqueStrings(review.blockedCheckKeys || readiness.blockedCheckKeys || []),
    missingEvidenceKeys: uniqueStrings(review.missingEvidenceKeys || readiness.missingEvidenceKeys || []),
    persistedEvidenceKeys: uniqueStrings(review.persistedEvidenceKeys || readiness.persistedEvidenceKeys || []),
    writefulSchedulingAllowed: false
  };
}

function gate(key, passed, action) {
  return {
    key,
    passed: passed === true,
    action,
    requiredActor: "owner"
  };
}

function gateList(summaries = {}) {
  return [
    gate("proposal_record_present", summaries.proposals.count > 0, "create_or_review_automation_proposal"),
    gate("proposal_owner_review_present", summaries.proposals.acceptedCount > 0, "review_automation_proposal"),
    gate("digest_record_present", summaries.digests.count > 0, "create_automation_digest"),
    gate("digest_owner_review_present", summaries.digests.reviewedCount > 0, "review_automation_digest"),
    gate("failure_policy_active", summaries.failurePolicy.readyForWritefulAutomationPrerequisite === true, "activate_failure_policy"),
    gate("action_handoff_delivered", summaries.actionHandoffs.deliveredCount > 0, "deliver_action_handoff"),
    gate("scheduler_execution_record_present", summaries.schedulerExecutions.count > 0, "run_owner_explicit_scheduler_execution"),
    gate("scheduler_run_record_present", summaries.schedulerRuns.count > 0, "run_supervised_scheduler_tick"),
    gate("worker_target_review_present", summaries.workerTargets.enabledCount > 0, "review_scheduler_worker_target")
  ];
}

function statusFromGates(gates = [], releaseReadiness = {}) {
  if (releaseReadiness.readyForReleaseReview === true) return "ready_for_release_review";
  const firstMissing = gates.find((item) => !item.passed);
  if (!firstMissing) return "owner_review_pipeline_ready";
  if (firstMissing.key === "proposal_record_present") return "proposal_required";
  if (firstMissing.key === "proposal_owner_review_present") return "proposal_review_required";
  if (firstMissing.key === "digest_record_present") return "digest_required";
  if (firstMissing.key === "digest_owner_review_present") return "digest_review_required";
  if (firstMissing.key === "failure_policy_active") return "failure_policy_required";
  if (firstMissing.key === "action_handoff_delivered") return "action_handoff_delivery_required";
  if (firstMissing.key === "scheduler_execution_record_present") return "owner_execution_evidence_required";
  if (firstMissing.key === "scheduler_run_record_present") return "scheduler_run_evidence_required";
  if (firstMissing.key === "worker_target_review_present") return "worker_target_review_required";
  return "owner_review_required";
}

function nextActionFrom(gates = [], releaseReadiness = {}) {
  const firstMissing = gates.find((item) => !item.passed);
  if (firstMissing) {
    return {
      key: firstMissing.key,
      action: firstMissing.action,
      requiredActor: firstMissing.requiredActor
    };
  }
  const missingReleaseKey = asArray(releaseReadiness.missingCheckKeys)[0] || asArray(releaseReadiness.blockedCheckKeys)[0];
  if (missingReleaseKey) {
    return {
      key: cleanString(missingReleaseKey, 140),
      action: "complete_release_readiness_evidence",
      requiredActor: "owner"
    };
  }
  return null;
}

function createLearningAutomationOwnerReviewEvidenceService(options = {}) {
  const proposalService = options.proposalService || null;
  const digestService = options.digestService || null;
  const failurePolicyService = options.failurePolicyService || null;
  const actionHandoffService = options.actionHandoffService || null;
  const schedulerExecutionService = options.schedulerExecutionService || null;
  const schedulerRunService = options.schedulerRunService || null;
  const schedulerWorkerTargetService = options.schedulerWorkerTargetService || null;
  const releaseReadinessService = options.releaseReadinessService || null;

  function evaluate(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_owner_review_scope_required", scope);
    const inputPrivacyFindings = scanPrivacyKeys(input).concat(scanPrivateValues(input)).slice(0, 16);
    if (inputPrivacyFindings.length) {
      return unavailable("learning_automation_owner_review_privacy_failed", scope, { privacyFindings: inputPrivacyFindings });
    }
    const missing = requireMethod(scope, "proposal_service", proposalService, "listProposals")
      || requireMethod(scope, "digest_service", digestService, "listDigests")
      || requireMethod(scope, "failure_policy_service", failurePolicyService, "evaluateReadiness")
      || requireMethod(scope, "action_handoff_service", actionHandoffService, "listHandoffs")
      || requireMethod(scope, "scheduler_execution_service", schedulerExecutionService, "listExecutions")
      || requireMethod(scope, "scheduler_run_service", schedulerRunService, "listRuns")
      || requireMethod(scope, "scheduler_worker_target_service", schedulerWorkerTargetService, "listTargets")
      || requireMethod(scope, "release_readiness_service", releaseReadinessService, "evaluateReadiness");
    if (missing) return missing;

    const proposals = proposalService.listProposals(requestFor(scope, input));
    const digests = digestService.listDigests(requestFor(scope, input));
    const failurePolicy = failurePolicyService.evaluateReadiness(requestFor(scope, input));
    const actionHandoffs = actionHandoffService.listHandoffs(requestFor(scope, input));
    const schedulerExecutions = schedulerExecutionService.listExecutions(requestFor(scope, input));
    const schedulerRuns = schedulerRunService.listRuns(requestFor(scope, input));
    const workerTargets = schedulerWorkerTargetService.listTargets(requestFor(scope, input));
    const releaseReadiness = releaseReadinessService.evaluateReadiness(requestFor(scope, input));
    const dependencyResults = {
      proposals,
      digests,
      failurePolicy,
      actionHandoffs,
      schedulerExecutions,
      schedulerRuns,
      workerTargets,
      releaseReadiness
    };
    const dependencyPrivacyFindings = scanPrivacyKeys(dependencyResults).concat(scanPrivateValues(dependencyResults)).slice(0, 16);
    if (dependencyPrivacyFindings.length) {
      return unavailable("learning_automation_owner_review_dependency_privacy_failed", scope, {
        privacyFindings: dependencyPrivacyFindings
      });
    }

    const failedDependency = Object.entries(dependencyResults).find(([, value]) => value?.ok === false);
    if (failedDependency) {
      return unavailable(`learning_automation_owner_review_${failedDependency[0]}_blocked`, scope, {
        dependencyError: cleanString(failedDependency[1]?.error, 180)
      });
    }

    const summaries = {
      proposals: proposalSummary(proposals),
      digests: digestSummary(digests),
      failurePolicy: failurePolicySummary(failurePolicy),
      actionHandoffs: actionHandoffSummary(actionHandoffs),
      schedulerExecutions: executionSummary(schedulerExecutions),
      schedulerRuns: runSummary(schedulerRuns),
      workerTargets: workerTargetSummary(workerTargets),
      releaseReadiness: releaseReadinessSummary(releaseReadiness)
    };
    const gates = gateList(summaries);
    const missingGates = gates.filter((item) => !item.passed);
    const passedGates = gates.filter((item) => item.passed);
    const status = statusFromGates(gates, summaries.releaseReadiness);
    const nextAction = nextActionFrom(gates, summaries.releaseReadiness);

    return Object.assign({}, scope, {
      ok: true,
      source: "growth-learning-automation-owner-review-evidence-service",
      schemaVersion: OWNER_REVIEW_EVIDENCE_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      status,
      readyForReleaseReview: summaries.releaseReadiness.readyForReleaseReview === true,
      automationOwnerReviewEvidence: {
        schemaVersion: "growth.learningAutomationOwnerReviewEvidence.summary.v1",
        summaryOnly: true,
        status,
        passedGateCount: passedGates.length,
        missingGateCount: missingGates.length,
        requiredActionCount: Math.max(missingGates.length, Number(summaries.releaseReadiness.requiredActionCount) || 0),
        nextAction,
        passedGateKeys: passedGates.map((item) => item.key),
        missingGateKeys: missingGates.map((item) => item.key),
        releaseReadinessStatus: summaries.releaseReadiness.status,
        releaseMissingCheckKeys: summaries.releaseReadiness.missingCheckKeys,
        proposalCount: summaries.proposals.count,
        proposedProposalCount: summaries.proposals.proposedCount,
        acceptedProposalCount: summaries.proposals.acceptedCount,
        skippedProposalCount: summaries.proposals.skippedCount,
        expiredProposalCount: summaries.proposals.expiredCount,
        supersededProposalCount: summaries.proposals.supersededCount,
        ownerDecisionProposalCount: summaries.proposals.ownerDecisionCount,
        proposalExecutionCount: summaries.proposals.executionCount,
        publishedProposalExecutionCount: summaries.proposals.publishedExecutionCount,
        blockedProposalExecutionCount: summaries.proposals.blockedExecutionCount,
        failedProposalExecutionCount: summaries.proposals.failedExecutionCount,
        digestCount: summaries.digests.count,
        reviewedDigestCount: summaries.digests.reviewedCount,
        pendingDigestCount: summaries.digests.pendingCount,
        digestRequiredActionCount: summaries.digests.requiredActionCount,
        digestBlockedCandidateCount: summaries.digests.blockedCandidateCount,
        actionHandoffCount: summaries.actionHandoffs.count,
        deliveredHandoffCount: summaries.actionHandoffs.deliveredCount,
        pendingHandoffDeliveryCount: summaries.actionHandoffs.pendingDeliveryCount,
        actionHandoffActionCount: summaries.actionHandoffs.actionCount,
        blockedActionHandoffCount: summaries.actionHandoffs.blockedCount,
        schedulerExecutionCount: summaries.schedulerExecutions.count,
        publishedSchedulerExecutionCount: summaries.schedulerExecutions.publishedCount,
        blockedSchedulerExecutionCount: summaries.schedulerExecutions.blockedCount,
        failedSchedulerExecutionCount: summaries.schedulerExecutions.failedCount,
        schedulerRunCount: summaries.schedulerRuns.count,
        completedSchedulerRunCount: summaries.schedulerRuns.completedCount,
        blockedSchedulerRunCount: summaries.schedulerRuns.blockedCount,
        skippedSchedulerRunCount: summaries.schedulerRuns.skippedCount,
        reviewedWorkerTargetCount: summaries.workerTargets.enabledCount,
        pendingWorkerTargetReviewCount: summaries.workerTargets.pendingReviewCount,
        disabledWorkerTargetCount: summaries.workerTargets.disabledCount,
        failurePolicyReady: summaries.failurePolicy.readyForWritefulAutomationPrerequisite === true,
        failurePolicyStatus: summaries.failurePolicy.status,
        writefulSchedulingAllowed: false,
        backgroundSchedulingAllowed: false,
        backgroundWorkerAllowed: false,
        runtimeConfigChange: false,
        configChangeApplied: false
      },
      gates,
      proposals: summaries.proposals,
      digests: summaries.digests,
      failurePolicy: summaries.failurePolicy,
      actionHandoffs: summaries.actionHandoffs,
      schedulerExecutions: summaries.schedulerExecutions,
      schedulerRuns: summaries.schedulerRuns,
      workerTargets: summaries.workerTargets,
      releaseReadiness: summaries.releaseReadiness,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false
    });
  }

  return { evaluate };
}

module.exports = {
  OWNER_REVIEW_EVIDENCE_SCHEMA,
  createLearningAutomationOwnerReviewEvidenceService
};
