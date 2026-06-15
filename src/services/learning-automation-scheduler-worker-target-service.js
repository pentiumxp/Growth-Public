"use strict";

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body)/i;

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unavailable(error, extra = {}) {
  return Object.assign({
    ok: false,
    source: "growth-learning-automation-scheduler-worker-target-service",
    error: cleanString(error) || "learning_automation_scheduler_worker_target_unavailable"
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

function targetPolicy(input = {}) {
  const requested = input.policy || input.targetPolicy || input.target_policy || {};
  return Object.assign({
    schemaVersion: "growth.learningAutomationSchedulerWorkerTarget.policy.v1",
    summaryOnly: true,
    workerMode: "background_worker_tick",
    schedulerRunMode: "background_supervised_tick",
    ownerReviewRequired: true,
    targetProvisioningRequired: true,
    actionHandoffRequiredBeforeScheduling: true,
    productionSchedulingAllowed: false,
    maxActionsPerTick: 5
  }, requested, {
    schemaVersion: cleanString(requested.schemaVersion) || "growth.learningAutomationSchedulerWorkerTarget.policy.v1",
    summaryOnly: true,
    workerMode: "background_worker_tick",
    schedulerRunMode: "background_supervised_tick",
    ownerReviewRequired: true,
    targetProvisioningRequired: true,
    actionHandoffRequiredBeforeScheduling: true,
    productionSchedulingAllowed: false,
    maxActionsPerTick: Math.max(1, Math.min(25, Number(requested.maxActionsPerTick || input.limit || 5) || 5))
  });
}

function targetSummary(scope = {}, selection = {}, input = {}) {
  return {
    schemaVersion: "growth.learningAutomationSchedulerWorkerTarget.target.v1",
    summaryOnly: true,
    workspaceId: scope.workspaceId,
    learnerId: scope.learnerId,
    programId: scope.programId,
    domainPackId: selection.selectedDomainPackId || scope.domainPackId,
    domain: selection.selectedDomain || scope.domain,
    subject: selection.selectedSubject || scope.subject,
    horizon: scope.horizon,
    targetNodeIds: asArray(selection.targetNodeIds || input.targetNodeIds || input.target_node_ids || input.nodeIds || input.node_ids).map(cleanString).filter(Boolean).slice(0, 24),
    provisionMode: cleanString(selection.mode),
    displayName: scope.displayName,
    label: scope.label
  };
}

function readinessSummary(selection = {}) {
  return {
    schemaVersion: "growth.learningAutomationSchedulerWorkerTarget.readiness.v1",
    summaryOnly: true,
    targetProvisioningReady: selection.ok === true,
    targetEnabled: selection.targetEnabled === true,
    selectedDomainPackId: cleanString(selection.selectedDomainPackId),
    selectedDomain: cleanString(selection.selectedDomain),
    selectedSubject: cleanString(selection.selectedSubject),
    mode: cleanString(selection.mode),
    productionSchedulingAllowed: false
  };
}

function workerTargetFromRecord(target = {}) {
  const summary = target.target || {};
  const policy = target.policy || {};
  return {
    workspaceId: target.workspaceId,
    learnerId: target.learnerId,
    programId: target.programId,
    domainPackId: target.domainPackId || summary.domainPackId,
    domain: target.domain || summary.domain,
    subject: target.subject || summary.subject,
    horizon: target.horizon || summary.horizon || "daily_plan",
    targetNodeIds: asArray(summary.targetNodeIds).slice(0, 24),
    workerTargetId: target.targetId,
    limit: policy.maxActionsPerTick || 5
  };
}

function createLearningAutomationSchedulerWorkerTargetService(options = {}) {
  const repository = options.repository || null;
  const targetProvisioningService = options.targetProvisioningService || null;

  function resolveTarget(input = {}) {
    if (!targetProvisioningService || typeof targetProvisioningService.resolveSelection !== "function") {
      return unavailable("learning_automation_scheduler_worker_target_provisioning_unavailable");
    }
    const selection = targetProvisioningService.resolveSelection(input);
    if (!selection?.ok) return unavailable(selection?.error || "learning_automation_scheduler_worker_target_not_provisioned", { selection });
    return { ok: true, selection };
  }

  function createTarget(input = {}) {
    if (!repository || typeof repository.saveTarget !== "function") {
      return unavailable("learning_automation_scheduler_worker_target_repository_unavailable");
    }
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_scheduler_worker_target_scope_required");
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) return unavailable("learning_automation_scheduler_worker_target_privacy_failed", { privacyFindings });
    const resolved = resolveTarget(Object.assign({}, input, scope));
    if (!resolved.ok) return resolved;
    const selection = resolved.selection;
    const policy = targetPolicy(input);
    const saveResult = repository.saveTarget(Object.assign({}, scope, {
      domainPackId: selection.selectedDomainPackId || scope.domainPackId,
      domain: selection.selectedDomain || scope.domain,
      subject: selection.selectedSubject || scope.subject,
      status: "proposed",
      targetVersion: input.targetVersion || input.target_version || "growth.learningAutomationSchedulerWorkerTarget.v1",
      target: targetSummary(scope, selection, input),
      policy,
      readiness: readinessSummary(selection),
      createdBy: input.createdBy || input.created_by || input.requestedBy || input.requested_by,
      privacyClass: "summary_only"
    }));
    if (!saveResult?.ok) return saveResult || unavailable("learning_automation_scheduler_worker_target_save_failed");
    return {
      ok: true,
      source: "growth-learning-automation-scheduler-worker-target-service",
      duplicate: Boolean(saveResult.duplicate),
      workerTargetRequiresOwnerReview: true,
      productionSchedulingAllowed: false,
      target: saveResult.target,
      readiness: saveResult.target?.readiness
    };
  }

  function listTargets(input = {}) {
    if (!repository || typeof repository.listTargets !== "function") {
      return unavailable("learning_automation_scheduler_worker_target_repository_unavailable");
    }
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_scheduler_worker_target_scope_required");
    const targets = repository.listTargets(Object.assign({}, input, scope));
    return {
      ok: true,
      source: "growth-learning-automation-scheduler-worker-target-service",
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      count: targets.length,
      targets
    };
  }

  function reviewTarget(input = {}) {
    if (!repository || typeof repository.getTarget !== "function" || typeof repository.reviewTarget !== "function") {
      return unavailable("learning_automation_scheduler_worker_target_repository_unavailable");
    }
    const scope = scopeFrom(input);
    const targetId = cleanString(input.targetId || input.target_id || input.workerTargetId || input.worker_target_id);
    const status = cleanString(input.status || input.reviewAction || input.review_action || input.action).toLowerCase();
    if (!scope.workspaceId || !targetId) return unavailable("learning_automation_scheduler_worker_target_scope_required");
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) return unavailable("learning_automation_scheduler_worker_target_privacy_failed", { privacyFindings });
    const existing = repository.getTarget({ workspaceId: scope.workspaceId, targetId });
    if (!existing) return unavailable("learning_automation_scheduler_worker_target_not_found");
    let readiness = existing.readiness || {};
    if (status === "enabled") {
      const resolved = resolveTarget(Object.assign({}, existing.target, existing, scope));
      if (!resolved.ok) return resolved;
      readiness = readinessSummary(resolved.selection);
    }
    const reviewResult = repository.reviewTarget(Object.assign({}, scope, {
      targetId,
      status,
      readiness,
      reason: input.reason || input.note || input.summary,
      reviewedBy: input.reviewedBy || input.reviewed_by || input.requestedBy || input.requested_by,
      reviewedAt: input.reviewedAt || input.reviewed_at
    }));
    if (!reviewResult?.ok) return reviewResult || unavailable("learning_automation_scheduler_worker_target_review_failed");
    return {
      ok: true,
      source: "growth-learning-automation-scheduler-worker-target-service",
      duplicate: Boolean(reviewResult.duplicate),
      productionSchedulingAllowed: false,
      target: reviewResult.target
    };
  }

  function listRunnableTargets(input = {}) {
    if (!repository || typeof repository.listTargets !== "function") {
      return unavailable("learning_automation_scheduler_worker_target_repository_unavailable", { targets: [] });
    }
    const targets = repository.listTargets(Object.assign({}, input, {
      status: "enabled",
      limit: input.limit || input.maxTargets || input.max_targets || 25
    }));
    return {
      ok: true,
      source: "growth-learning-automation-scheduler-worker-target-service",
      count: targets.length,
      targets: targets.map(workerTargetFromRecord),
      records: targets
    };
  }

  return {
    createTarget,
    listRunnableTargets,
    listTargets,
    reviewTarget
  };
}

module.exports = { createLearningAutomationSchedulerWorkerTargetService };
