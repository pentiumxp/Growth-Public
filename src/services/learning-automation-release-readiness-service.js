"use strict";

function cleanString(value) {
  return String(value || "").trim();
}

function boundedString(value, max = 160) {
  return cleanString(value).slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|access-key\.txt|launch-token)/i;

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

function unavailable(error, extra = {}) {
  return Object.assign({
    ok: false,
    source: "growth-learning-automation-release-readiness-service",
    error: cleanString(error) || "learning_automation_release_readiness_unavailable"
  }, extra);
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

function evidenceBag(input = {}) {
  return input.evidence || input.evidenceSummary || input.evidence_summary || {};
}

function mergeEvidenceBags(input = {}, persisted = {}) {
  const merged = Object.assign({}, persisted);
  Object.entries(evidenceBag(input) || {}).forEach(([key, value]) => {
    if (value !== undefined) merged[key] = value;
  });
  Object.entries(input || {}).forEach(([key, value]) => {
    if (key.endsWith("Evidence") || key === "releaseEvidenceBundleAudit") {
      if (value !== undefined) merged[key] = value;
    }
  });
  return merged;
}

function releaseApprovalBag(input = {}) {
  return input.releaseApproval || input.release_approval || input.approvals || {};
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function mergeReleaseApprovals(input = {}, persisted = {}) {
  const approvalBag = releaseApprovalBag(input);
  const merged = Object.assign({}, persisted);
  Object.entries(approvalBag || {}).forEach(([key, value]) => {
    if (value !== undefined) merged[key] = value;
  });
  ["writefulExecutionApproval", "backgroundSchedulerApproval", "backgroundWorkerApproval"].forEach((key) => {
    if (hasOwn(input, key)) merged[key] = input[key];
  });
  return merged;
}

function evidenceOk(input = {}, key) {
  const value = evidenceValue(input, key);
  if (value === true) return true;
  if (value && typeof value === "object") return value.ok === true || value.status === "pass" || value.present === true;
  return false;
}

function evidenceValue(input = {}, key) {
  const bag = evidenceBag(input);
  return input[key] ?? bag[key];
}

function evidenceRef(input = {}, key) {
  const value = evidenceValue(input, key);
  if (!value || typeof value !== "object") return {};
  return {
    schemaVersion: boundedString(value.schemaVersion || value.schema_version, 160),
    evidenceId: boundedString(value.evidenceId || value.evidence_id || value.id, 180),
    status: boundedString(value.status || (value.ok === true ? "pass" : ""), 80),
    observedAt: boundedString(value.observedAt || value.observed_at || value.createdAt || value.created_at, 120),
    source: boundedString(value.source, 180),
    artifactId: boundedString(value.artifactId || value.artifact_id, 180),
    runId: boundedString(value.runId || value.run_id, 180),
    taskId: boundedString(value.taskId || value.task_id, 180)
  };
}

function numberField(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function ownerReviewStageSummary(value = {}) {
  const source = objectOnly(value.summary || value.automationOwnerReviewEvidence || value.automation_owner_review_evidence || value);
  const summary = {
    proposalCount: numberField(source.proposalCount || source.proposal_count),
    acceptedProposalCount: numberField(source.acceptedProposalCount || source.accepted_proposal_count),
    proposedProposalCount: numberField(source.proposedProposalCount || source.proposed_proposal_count),
    skippedProposalCount: numberField(source.skippedProposalCount || source.skipped_proposal_count),
    expiredProposalCount: numberField(source.expiredProposalCount || source.expired_proposal_count),
    supersededProposalCount: numberField(source.supersededProposalCount || source.superseded_proposal_count),
    ownerDecisionProposalCount: numberField(source.ownerDecisionProposalCount || source.owner_decision_proposal_count),
    proposalExecutionCount: numberField(source.proposalExecutionCount || source.proposal_execution_count),
    publishedProposalExecutionCount: numberField(source.publishedProposalExecutionCount || source.published_proposal_execution_count),
    blockedProposalExecutionCount: numberField(source.blockedProposalExecutionCount || source.blocked_proposal_execution_count),
    failedProposalExecutionCount: numberField(source.failedProposalExecutionCount || source.failed_proposal_execution_count),
    digestCount: numberField(source.digestCount || source.digest_count),
    reviewedDigestCount: numberField(source.reviewedDigestCount || source.reviewed_digest_count),
    pendingDigestCount: numberField(source.pendingDigestCount || source.pending_digest_count),
    digestRequiredActionCount: numberField(source.digestRequiredActionCount || source.digest_required_action_count),
    digestBlockedCandidateCount: numberField(source.digestBlockedCandidateCount || source.digest_blocked_candidate_count),
    actionHandoffCount: numberField(source.actionHandoffCount || source.action_handoff_count),
    deliveredHandoffCount: numberField(source.deliveredHandoffCount || source.delivered_handoff_count),
    pendingHandoffDeliveryCount: numberField(source.pendingHandoffDeliveryCount || source.pending_handoff_delivery_count),
    actionHandoffActionCount: numberField(source.actionHandoffActionCount || source.action_handoff_action_count),
    blockedActionHandoffCount: numberField(source.blockedActionHandoffCount || source.blocked_action_handoff_count),
    schedulerExecutionCount: numberField(source.schedulerExecutionCount || source.scheduler_execution_count),
    publishedSchedulerExecutionCount: numberField(source.publishedSchedulerExecutionCount || source.published_scheduler_execution_count),
    blockedSchedulerExecutionCount: numberField(source.blockedSchedulerExecutionCount || source.blocked_scheduler_execution_count),
    failedSchedulerExecutionCount: numberField(source.failedSchedulerExecutionCount || source.failed_scheduler_execution_count),
    schedulerRunCount: numberField(source.schedulerRunCount || source.scheduler_run_count),
    completedSchedulerRunCount: numberField(source.completedSchedulerRunCount || source.completed_scheduler_run_count),
    blockedSchedulerRunCount: numberField(source.blockedSchedulerRunCount || source.blocked_scheduler_run_count),
    skippedSchedulerRunCount: numberField(source.skippedSchedulerRunCount || source.skipped_scheduler_run_count),
    reviewedWorkerTargetCount: numberField(source.reviewedWorkerTargetCount || source.reviewed_worker_target_count),
    pendingWorkerTargetReviewCount: numberField(source.pendingWorkerTargetReviewCount || source.pending_worker_target_review_count),
    disabledWorkerTargetCount: numberField(source.disabledWorkerTargetCount || source.disabled_worker_target_count),
    failurePolicyReady: source.failurePolicyReady === true || source.failure_policy_ready === true,
    failurePolicyStatus: compactEvidenceField(source.failurePolicyStatus || source.failure_policy_status, 120)
  };
  const hasEvidence = Object.entries(summary).some(([key, value]) => {
    if (key === "failurePolicyReady") return value === true;
    if (key === "failurePolicyStatus") return Boolean(value);
    return Number(value) > 0;
  });
  return hasEvidence ? summary : null;
}

function ownerReviewEvidenceCheck(input) {
  const evidenceKey = "ownerReviewEvidence";
  const checkKey = "owner_review_evidence";
  const label = "Owner automation review evidence readback";
  if (!evidenceOk(input, evidenceKey)) {
    return check(checkKey, "missing", {
      label,
      evidenceKey,
      evidencePresent: false
    }, {
      action: "run_owner_review_evidence_smoke",
      requiredActor: "owner"
    });
  }
  const summary = ownerReviewStageSummary(evidenceValue(input, evidenceKey));
  return check(checkKey, "pass", Object.assign({
    label,
    evidenceKey,
    evidencePresent: true,
    ownerReviewStageSummaryPresent: Boolean(summary)
  }, evidenceRef(input, evidenceKey), summary ? { ownerReviewStageSummary: summary } : {}));
}

function releaseApproved(input = {}, key) {
  const approvals = releaseApprovalBag(input);
  const value = hasOwn(input, key) ? input[key] : approvals[key];
  if (value === true) return true;
  if (value && typeof value === "object") return value.approved === true || value.ok === true || value.status === "approved";
  return false;
}

function check(key, status, summary = {}, requiredAction = {}) {
  return {
    key,
    status,
    summary,
    requiredAction: requiredAction.action ? requiredAction : null
  };
}

function presentCheck(input, evidenceKey, checkKey, label, requiredAction) {
  if (evidenceOk(input, evidenceKey)) {
    return check(checkKey, "pass", Object.assign({
      label,
      evidenceKey,
      evidencePresent: true
    }, evidenceRef(input, evidenceKey)));
  }
  return check(checkKey, "missing", {
    label,
    evidenceKey,
    evidencePresent: false
  }, {
    action: requiredAction,
    requiredActor: "owner"
  });
}

function nonWritefulDryRun(result = {}) {
  return Boolean(
    result.dryRun === true
    && result.writePlanned === false
    && result.writesPerformed === false
    && result.publishPlanned === false
  );
}

function configGateCheck(input = {}, config = {}, key, configField, approvalKey, label) {
  const enabled = Boolean(config[configField]);
  const approved = releaseApproved(input, approvalKey);
  if (enabled && !approved) {
    return check(key, "blocked", {
      label,
      currentEnabled: true,
      releaseApprovalPresent: false,
      writefulSchedulingAllowed: false
    }, {
      action: "disable_or_record_release_approval",
      requiredActor: "owner"
    });
  }
  if (!approved) {
    return check(key, "missing", {
      label,
      currentEnabled: enabled,
      releaseApprovalPresent: false,
      writefulSchedulingAllowed: false
    }, {
      action: "record_explicit_release_approval",
      requiredActor: "owner"
    });
  }
  return check(key, "pass", {
    label,
    currentEnabled: enabled,
    releaseApprovalPresent: true,
    writefulSchedulingAllowed: false
  });
}

function dependencyErrorCheck(key, error, label) {
  return check(key, "blocked", {
    label,
    error: cleanString(error) || `${key}_unavailable`
  });
}

function buildSummary(scope, checks) {
  const counts = checks.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  const missingRequired = checks
    .filter((item) => !["pass", "not_applicable"].includes(item.status))
    .map((item) => item.key);
  const blocked = checks.some((item) => item.status === "blocked");
  const readyForReleaseReview = missingRequired.length === 0;
  return {
    schemaVersion: "growth.learningAutomationReleaseReadiness.summary.v1",
    summaryOnly: true,
    workspaceId: scope.workspaceId,
    learnerId: scope.learnerId,
    programId: scope.programId,
    domainPackId: scope.domainPackId,
    domain: scope.domain,
    subject: scope.subject,
    horizon: scope.horizon,
    counts,
    missingRequired,
    readyForOwnerLoop: ["owner_daily_ui_evidence", "owner_audit_ui_evidence", "central_visual_evidence"]
      .every((key) => checks.find((item) => item.key === key)?.status === "pass"),
    readyForReleaseReview,
    writefulSchedulingAllowed: false,
    status: readyForReleaseReview ? "ready_for_release_review" : (blocked ? "blocked" : "incomplete")
  };
}

function compactRequiredAction(checkItem = {}) {
  const requiredAction = checkItem.requiredAction || {};
  const summary = checkItem.summary || {};
  const status = boundedString(checkItem.status, 40);
  const fallbackAction = status === "blocked"
    ? "resolve_blocked_release_readiness_check"
    : "provide_release_readiness_evidence";
  return Object.fromEntries(Object.entries({
    key: boundedString(checkItem.key, 120),
    status,
    label: boundedString(summary.label || checkItem.key, 180),
    action: boundedString(requiredAction.action || fallbackAction, 120),
    requiredActor: boundedString(requiredAction.requiredActor || "owner", 80),
    endpoint: boundedString(requiredAction.endpoint, 220),
    evidencePresent: summary.evidencePresent === true ? true : (summary.evidencePresent === false ? false : undefined)
  }).filter(([, value]) => value !== undefined && value !== ""));
}

function buildReleaseReview(summary = {}, checks = [], persistedApprovals = {}, persistedEvidence = {}) {
  const openChecks = checks.filter((item) => !["pass", "not_applicable"].includes(item.status));
  const requiredActions = openChecks.map(compactRequiredAction);
  return {
    schemaVersion: "growth.learningAutomationReleaseReadiness.releaseReview.v1",
    summaryOnly: true,
    readyForReleaseReview: summary.readyForReleaseReview === true,
    persistedApprovalKeys: asArray(persistedApprovals.approvalKeys).map((key) => boundedString(key, 120)).filter(Boolean).sort(),
    persistedEvidenceKeys: asArray(persistedEvidence.evidenceKeys).map((key) => boundedString(key, 120)).filter(Boolean).sort(),
    missingCheckKeys: checks.filter((item) => item.status === "missing").map((item) => boundedString(item.key, 120)).filter(Boolean),
    blockedCheckKeys: checks.filter((item) => item.status === "blocked").map((item) => boundedString(item.key, 120)).filter(Boolean),
    missingEvidenceKeys: checks
      .filter((item) => item.status === "missing" && item.summary?.evidencePresent === false)
      .map((item) => boundedString(item.key, 120))
      .filter(Boolean),
    requiredActionCount: requiredActions.length,
    requiredActions: requiredActions.slice(0, 50),
    nextAction: requiredActions[0] || null,
    writefulSchedulingAllowed: false,
    advisoryOnly: true
  };
}

function compactEvidenceField(value, max = 180) {
  const text = boundedString(value, max);
  if (!text || PRIVATE_VALUE_PATTERN.test(text)) return "";
  return text;
}

function compactEvidenceItem(checkItem = {}) {
  const summary = checkItem.summary || {};
  const evidenceKey = boundedString(summary.evidenceKey, 140);
  if (!evidenceKey) return null;
  return Object.fromEntries(Object.entries({
    key: evidenceKey,
    checkKey: boundedString(checkItem.key, 140),
    label: boundedString(summary.label || checkItem.key, 180),
    checkStatus: boundedString(checkItem.status, 80),
    evidencePresent: summary.evidencePresent === true,
    evidenceStatus: compactEvidenceField(summary.status || (summary.evidencePresent === true ? "pass" : ""), 80),
    evidenceId: compactEvidenceField(summary.evidenceId, 180),
    schemaVersion: compactEvidenceField(summary.schemaVersion, 180),
    source: compactEvidenceField(summary.source, 180),
    observedAt: compactEvidenceField(summary.observedAt, 120),
    artifactId: compactEvidenceField(summary.artifactId, 180),
    runId: compactEvidenceField(summary.runId, 180),
    taskId: compactEvidenceField(summary.taskId, 180),
    ownerReviewStageSummary: summary.ownerReviewStageSummary || undefined
  }).filter(([, value]) => value !== undefined && value !== ""));
}

function evidenceBundleReadback(input = {}) {
  const bundle = input.evidenceBundleReadback || input.evidenceBundle || input.evidence_bundle || {};
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle) || !Object.keys(bundle).length) return null;
  return Object.fromEntries(Object.entries({
    schemaVersion: compactEvidenceField(bundle.schemaVersion || bundle.schema_version, 180),
    bundleId: compactEvidenceField(bundle.bundleId || bundle.bundle_id || bundle.evidenceBundleId || bundle.evidence_bundle_id || bundle.id, 180),
    status: compactEvidenceField(bundle.status, 80),
    source: compactEvidenceField(bundle.source || "release_readiness_evidence_bundle", 120),
    taskCount: Number(bundle.taskCount || bundle.task_count || 0) || 0,
    passCount: Number(bundle.passCount || bundle.pass_count || 0) || 0,
    createdAt: compactEvidenceField(bundle.createdAt || bundle.created_at, 120),
    requestedBy: compactEvidenceField(bundle.requestedBy || bundle.requested_by || bundle.createdBy || bundle.created_by, 120)
  }).filter(([, value]) => value !== undefined && value !== ""));
}

function buildEvidenceReadback(input = {}, checks = []) {
  const items = checks.map(compactEvidenceItem).filter(Boolean);
  const presentKeys = items.filter((item) => item.evidencePresent === true).map((item) => item.key);
  const missingKeys = items.filter((item) => item.evidencePresent !== true).map((item) => item.checkKey);
  const bundle = evidenceBundleReadback(input);
  return {
    schemaVersion: "growth.learningAutomationReleaseReadiness.evidenceReadback.v1",
    summaryOnly: true,
    sourceBundle: bundle,
    evidenceCount: items.length,
    presentCount: presentKeys.length,
    missingCount: missingKeys.length,
    presentEvidenceKeys: presentKeys.sort(),
    missingCheckKeys: missingKeys.sort(),
    items: items.slice(0, 80),
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  };
}

function createLearningAutomationReleaseReadinessService(options = {}) {
  const repository = options.repository || null;
  const releaseApprovalService = options.releaseApprovalService || null;
  const releaseEvidenceService = options.releaseEvidenceService || null;
  const schedulerService = options.schedulerService || null;
  const digestService = options.digestService || null;
  const failurePolicyService = options.failurePolicyService || null;
  const actionHandoffService = options.actionHandoffService || null;
  const schedulerWorkerTargetService = options.schedulerWorkerTargetService || null;
  const config = options.config || {};

  function persistedReleaseApprovals(scope = {}) {
    if (!releaseApprovalService || typeof releaseApprovalService.approvalBag !== "function") {
      return { ok: true, releaseApproval: {}, approvalKeys: [] };
    }
    const result = releaseApprovalService.approvalBag(Object.assign({}, scope, {
      status: "approved",
      limit: 50
    }));
    if (!result?.ok) {
      return unavailable(result?.error || "learning_automation_release_readiness_release_approval_unavailable");
    }
    return {
      ok: true,
      releaseApproval: result.releaseApproval || {},
      approvalKeys: Array.isArray(result.approvalKeys) ? result.approvalKeys : Object.keys(result.releaseApproval || {}).sort()
    };
  }

  function persistedReleaseEvidence(scope = {}) {
    if (!releaseEvidenceService || typeof releaseEvidenceService.evidenceBag !== "function") {
      return { ok: true, evidence: {}, evidenceKeys: [] };
    }
    const result = releaseEvidenceService.evidenceBag(Object.assign({}, scope, {
      status: "pass",
      limit: 100
    }));
    if (!result?.ok) {
      return unavailable(result?.error || "learning_automation_release_readiness_release_evidence_unavailable");
    }
    return {
      ok: true,
      evidence: result.evidence || {},
      evidenceKeys: Array.isArray(result.evidenceKeys) ? result.evidenceKeys : Object.keys(result.evidence || {}).sort()
    };
  }

  function schedulerDryRunCheck(scope, input) {
    if (!schedulerService || typeof schedulerService.dryRun !== "function") {
      return dependencyErrorCheck("production_scheduler_dry_run", "learning_automation_release_readiness_scheduler_unavailable", "Production scheduler dry-run evidence");
    }
    const result = schedulerService.dryRun(Object.assign({}, input, scope, {
      limit: input.limit || 5
    }));
    if (!result?.ok) {
      return dependencyErrorCheck("production_scheduler_dry_run", result?.error || "scheduler_dry_run_failed", "Production scheduler dry-run evidence");
    }
    if (!nonWritefulDryRun(result)) {
      return check("production_scheduler_dry_run", "blocked", {
        label: "Production scheduler dry-run evidence",
        dryRun: result.dryRun,
        writePlanned: result.writePlanned,
        writesPerformed: result.writesPerformed,
        publishPlanned: result.publishPlanned
      });
    }
    return check("production_scheduler_dry_run", "pass", {
      label: "Production scheduler dry-run evidence",
      dryRun: true,
      writePlanned: false,
      writesPerformed: false,
      publishPlanned: false,
      candidateCount: Number(result.count || asArray(result.candidates).length || 0) || 0
    });
  }

  function reviewedDigestCheck(scope) {
    if (!digestService || typeof digestService.listDigests !== "function") {
      return dependencyErrorCheck("reviewed_automation_digest", "learning_automation_release_readiness_digest_unavailable", "Reviewed automation digest");
    }
    const result = digestService.listDigests(Object.assign({}, scope, { status: "reviewed", limit: 1 }));
    if (!result?.ok) return dependencyErrorCheck("reviewed_automation_digest", result?.error, "Reviewed automation digest");
    const digest = asArray(result.digests)[0] || null;
    if (!digest) {
      return check("reviewed_automation_digest", "missing", {
        label: "Reviewed automation digest",
        count: 0
      }, {
        action: "review_automation_digest",
        requiredActor: "owner",
        endpoint: "/api/v1/growth/automation/digests"
      });
    }
    return check("reviewed_automation_digest", "pass", {
      label: "Reviewed automation digest",
      count: result.count || 1,
      digestId: cleanString(digest.digestId),
      status: cleanString(digest.status)
    });
  }

  function activeFailurePolicyCheck(scope) {
    if (!failurePolicyService || typeof failurePolicyService.evaluateReadiness !== "function") {
      return dependencyErrorCheck("active_failure_policy", "learning_automation_release_readiness_failure_policy_unavailable", "Active failure policy");
    }
    const result = failurePolicyService.evaluateReadiness(scope);
    if (!result?.ok) return dependencyErrorCheck("active_failure_policy", result?.error, "Active failure policy");
    if (result.readyForWritefulAutomationPrerequisite !== true) {
      return check("active_failure_policy", "missing", {
        label: "Active failure policy",
        status: cleanString(result.status),
        missingRequired: asArray(result.missingRequired)
      }, {
        action: "activate_failure_policy",
        requiredActor: "owner",
        endpoint: "/api/v1/growth/automation/failure-policies"
      });
    }
    return check("active_failure_policy", "pass", {
      label: "Active failure policy",
      status: cleanString(result.status),
      policyId: cleanString(result.summary?.policyId || result.policy?.policyId),
      writefulSchedulingAllowed: false
    });
  }

  function deliveredHandoffCheck(scope) {
    if (!actionHandoffService || typeof actionHandoffService.listHandoffs !== "function") {
      return dependencyErrorCheck("delivered_action_handoff", "learning_automation_release_readiness_action_handoff_unavailable", "Delivered action handoff");
    }
    const result = actionHandoffService.listHandoffs(Object.assign({}, scope, {
      deliveryStatus: "delivered",
      limit: 1
    }));
    if (!result?.ok) return dependencyErrorCheck("delivered_action_handoff", result?.error, "Delivered action handoff");
    const handoff = asArray(result.handoffs).find((item) => item.deliveryStatus === "delivered" || item.status === "delivered") || null;
    if (!handoff) {
      return check("delivered_action_handoff", "missing", {
        label: "Delivered action handoff",
        count: 0
      }, {
        action: "deliver_action_handoff",
        requiredActor: "owner",
        endpoint: "/api/v1/growth/automation/action-handoffs"
      });
    }
    return check("delivered_action_handoff", "pass", {
      label: "Delivered action handoff",
      count: result.count || 1,
      handoffId: cleanString(handoff.handoffId),
      deliveryStatus: cleanString(handoff.deliveryStatus)
    });
  }

  function reviewedWorkerTargetCheck(scope) {
    if (!schedulerWorkerTargetService || typeof schedulerWorkerTargetService.listRunnableTargets !== "function") {
      return dependencyErrorCheck("reviewed_enabled_worker_target", "learning_automation_release_readiness_worker_target_unavailable", "Reviewed enabled worker target");
    }
    const result = schedulerWorkerTargetService.listRunnableTargets(Object.assign({}, scope, { limit: 1 }));
    if (!result?.ok) return dependencyErrorCheck("reviewed_enabled_worker_target", result?.error, "Reviewed enabled worker target");
    const target = asArray(result.targets)[0] || asArray(result.records)[0] || null;
    if (!target) {
      return check("reviewed_enabled_worker_target", "missing", {
        label: "Reviewed enabled worker target",
        count: 0
      }, {
        action: "enable_reviewed_worker_target",
        requiredActor: "owner",
        endpoint: "/api/v1/growth/automation/scheduler/worker-targets"
      });
    }
    return check("reviewed_enabled_worker_target", "pass", {
      label: "Reviewed enabled worker target",
      count: result.count || 1,
      workerTargetId: cleanString(target.workerTargetId || target.targetId),
      horizon: cleanString(target.horizon || scope.horizon)
    });
  }

  function evaluateReadiness(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_release_readiness_scope_required");
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) return unavailable("learning_automation_release_readiness_privacy_failed", { privacyFindings });
    const persistedApprovals = persistedReleaseApprovals(scope);
    if (!persistedApprovals.ok) return persistedApprovals;
    const persistedEvidence = persistedReleaseEvidence(scope);
    if (!persistedEvidence.ok) return persistedEvidence;
    const inputWithReleaseEvidence = Object.assign({}, input, {
      evidence: mergeEvidenceBags(input, persistedEvidence.evidence)
    });
    const inputWithReleaseApproval = Object.assign({}, input, {
      releaseApproval: mergeReleaseApprovals(input, persistedApprovals.releaseApproval)
    });

    const checks = [
      presentCheck(inputWithReleaseEvidence, "ownerDailyUiEvidence", "owner_daily_ui_evidence", "Owner daily UI product/visual evidence", "complete_owner_daily_ui_visual_validation"),
      presentCheck(inputWithReleaseEvidence, "ownerAuditUiEvidence", "owner_audit_ui_evidence", "Owner audit/correction UI evidence", "complete_owner_audit_ui_privacy_validation"),
      presentCheck(inputWithReleaseEvidence, "stageCheckpointEvidence", "stage_checkpoint_evidence", "Stage-checkpoint separation evidence", "validate_stage_checkpoint_separation"),
      presentCheck(inputWithReleaseEvidence, "stageCheckpointControlsEvidence", "stage_checkpoint_controls_evidence", "Stage-checkpoint controls readback evidence", "validate_stage_checkpoint_controls"),
      presentCheck(inputWithReleaseEvidence, "proposalReviewUiEvidence", "proposal_review_ui_evidence", "Proposal review UI evidence", "complete_proposal_review_ui"),
      presentCheck(inputWithReleaseEvidence, "productionProposalSmokeEvidence", "production_proposal_smoke_evidence", "Production automation proposal smoke", "run_production_proposal_smoke"),
      presentCheck(inputWithReleaseEvidence, "automationDigestUiEvidence", "automation_digest_ui_evidence", "Automation digest UI evidence", "complete_automation_digest_ui"),
      reviewedDigestCheck(scope),
      activeFailurePolicyCheck(scope),
      deliveredHandoffCheck(scope),
      presentCheck(inputWithReleaseEvidence, "automationActionHandoffUiEvidence", "automation_action_handoff_ui_evidence", "Automation action handoff UI evidence", "complete_automation_action_handoff_ui"),
      presentCheck(inputWithReleaseEvidence, "productionActionHandoffSmokeEvidence", "production_action_handoff_smoke_evidence", "Production action handoff smoke", "run_production_action_handoff_smoke"),
      check("owner_explicit_execution_gate", "pass", {
        label: "Owner-explicit execution boundary",
        servicePresent: true,
        currentEnabled: Boolean(config.automationWritefulExecutionEnabled),
        writefulSchedulingAllowed: false
      }),
      presentCheck(inputWithReleaseEvidence, "schedulerExecutionUiEvidence", "scheduler_execution_ui_evidence", "Scheduler execution UI evidence", "complete_scheduler_execution_ui"),
      presentCheck(inputWithReleaseEvidence, "productionSchedulerExecutionSmokeEvidence", "production_scheduler_execution_smoke_evidence", "Production scheduler execution smoke", "run_production_scheduler_execution_smoke"),
      check("scheduler_run_default_disabled", config.automationBackgroundSchedulerEnabled ? "blocked" : "pass", {
        label: "Scheduler run default-disabled status",
        currentEnabled: Boolean(config.automationBackgroundSchedulerEnabled),
        writefulSchedulingAllowed: false
      }, config.automationBackgroundSchedulerEnabled ? {
        action: "disable_scheduler_or_record_release_approval",
        requiredActor: "owner"
      } : {}),
      presentCheck(inputWithReleaseEvidence, "schedulerRunUiEvidence", "scheduler_run_ui_evidence", "Scheduler run UI evidence", "complete_scheduler_run_ui"),
      presentCheck(inputWithReleaseEvidence, "productionSchedulerRunSmokeEvidence", "production_scheduler_run_smoke_evidence", "Production scheduler run smoke", "run_production_scheduler_run_smoke"),
      presentCheck(inputWithReleaseEvidence, "schedulerWorkerTargetUiEvidence", "scheduler_worker_target_ui_evidence", "Scheduler worker target UI evidence", "complete_scheduler_worker_target_ui"),
      presentCheck(inputWithReleaseEvidence, "productionSchedulerWorkerTargetSmokeEvidence", "production_scheduler_worker_target_smoke_evidence", "Production scheduler worker target smoke", "run_production_scheduler_worker_target_smoke"),
      reviewedWorkerTargetCheck(scope),
      check("worker_timer_default_disabled", config.automationBackgroundWorkerEnabled ? "blocked" : "pass", {
        label: "Worker lease/timer default-disabled status",
        currentEnabled: Boolean(config.automationBackgroundWorkerEnabled),
        writefulSchedulingAllowed: false
      }, config.automationBackgroundWorkerEnabled ? {
        action: "disable_worker_or_record_release_approval",
        requiredActor: "owner"
      } : {}),
      presentCheck(inputWithReleaseEvidence, "productionSchedulerWorkerSmokeEvidence", "production_scheduler_worker_smoke_evidence", "Production scheduler worker smoke", "run_production_scheduler_worker_smoke"),
      presentCheck(inputWithReleaseEvidence, "productionPlannerReadinessEvidence", "production_planner_readiness_evidence", "Production planner readiness smoke", "run_production_planner_readiness_smoke"),
      presentCheck(inputWithReleaseEvidence, "productionTargetProvisioningSmokeEvidence", "production_target_provisioning_smoke_evidence", "Production target-provisioning smoke", "run_production_target_provisioning_smoke"),
      presentCheck(inputWithReleaseEvidence, "productionDailyLoopPreviewSmokeEvidence", "production_daily_loop_preview_smoke_evidence", "Production daily-loop preview smoke", "run_production_daily_loop_preview_smoke"),
      presentCheck(inputWithReleaseEvidence, "productionLearningLoopStateSmokeEvidence", "production_learning_loop_state_smoke_evidence", "Production learning-loop state smoke", "run_production_learning_loop_state_smoke"),
      presentCheck(inputWithReleaseEvidence, "productionCycleHistorySmokeEvidence", "production_cycle_history_smoke_evidence", "Production cycle-history smoke", "run_production_cycle_history_smoke"),
      presentCheck(inputWithReleaseEvidence, "productionOwnerAuditSmokeEvidence", "production_owner_audit_smoke_evidence", "Production Owner audit smoke", "run_production_owner_audit_smoke"),
      presentCheck(inputWithReleaseEvidence, "productionProfileFeedbackSmokeEvidence", "production_profile_feedback_smoke_evidence", "Production profile-feedback smoke", "run_production_profile_feedback_smoke"),
      presentCheck(inputWithReleaseEvidence, "productionRecommendationLifecycleSmokeEvidence", "production_recommendation_lifecycle_smoke_evidence", "Production recommendation lifecycle smoke", "run_production_recommendation_lifecycle_smoke"),
      presentCheck(inputWithReleaseEvidence, "productionDailyLoopWriteSmokeEvidence", "production_daily_loop_write_smoke_evidence", "Production daily-loop draft/publish smoke", "run_controlled_daily_loop_write_smoke"),
      presentCheck(inputWithReleaseEvidence, "productionLearnerCycleSmokeEvidence", "production_learner_cycle_smoke_evidence", "Production learner daily-cycle smoke", "run_production_learner_cycle_smoke"),
      presentCheck(inputWithReleaseEvidence, "productionSchedulerDryRunSmokeEvidence", "production_scheduler_dry_run_smoke_evidence", "Production scheduler dry-run smoke", "run_production_scheduler_dry_run_smoke"),
      presentCheck(inputWithReleaseEvidence, "releaseEvidenceBundleAudit", "release_evidence_bundle_audit", "Release evidence bundle self-audit", "run_release_evidence_bundle_audit"),
      schedulerDryRunCheck(scope, input),
      presentCheck(inputWithReleaseEvidence, "platformActionEvidence", "platform_action_evidence", "Home AI platform Action Inbox/Web Push evidence", "attach_platform_action_evidence"),
      presentCheck(inputWithReleaseEvidence, "centralVisualEvidence", "central_visual_evidence", "Central embedded-plugin visual evidence", "run_central_embedded_visual_harness"),
      presentCheck(inputWithReleaseEvidence, "releaseWorkbenchSmokeEvidence", "release_workbench_smoke_evidence", "Release workbench action-template readback", "run_release_workbench_readback_smoke"),
      ownerReviewEvidenceCheck(inputWithReleaseEvidence),
      configGateCheck(inputWithReleaseApproval, config, "writeful_execution_release_approval", "automationWritefulExecutionEnabled", "writefulExecutionApproval", "Writeful execution release approval"),
      configGateCheck(inputWithReleaseApproval, config, "background_scheduler_release_approval", "automationBackgroundSchedulerEnabled", "backgroundSchedulerApproval", "Background scheduler release approval"),
      configGateCheck(inputWithReleaseApproval, config, "background_worker_release_approval", "automationBackgroundWorkerEnabled", "backgroundWorkerApproval", "Background worker release approval")
    ];
    const summary = buildSummary(scope, checks);
    const releaseReview = buildReleaseReview(summary, checks, persistedApprovals, persistedEvidence);
    const evidenceReadback = buildEvidenceReadback(inputWithReleaseEvidence, checks);
    return {
      ok: true,
      source: "growth-learning-automation-release-readiness-service",
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      programId: scope.programId,
      domainPackId: scope.domainPackId,
      domain: scope.domain,
      subject: scope.subject,
      horizon: scope.horizon,
      status: summary.status,
      checks,
      evidence: {
        schemaVersion: "growth.learningAutomationReleaseReadiness.evidence.v1",
        summaryOnly: true,
        externalEvidenceKeys: Object.keys(evidenceBag(inputWithReleaseEvidence)).filter((key) => !PRIVATE_KEY_PATTERN.test(key)).sort(),
        persistedEvidenceKeys: persistedEvidence.evidenceKeys || []
      },
      evidenceReadback,
      config: {
        schemaVersion: "growth.learningAutomationReleaseReadiness.config.v1",
        summaryOnly: true,
        automationWritefulExecutionEnabled: Boolean(config.automationWritefulExecutionEnabled),
        automationBackgroundSchedulerEnabled: Boolean(config.automationBackgroundSchedulerEnabled),
        automationBackgroundWorkerEnabled: Boolean(config.automationBackgroundWorkerEnabled),
        writefulSchedulingAllowed: false
      },
      summary,
      releaseReview
    };
  }

  function createSnapshot(input = {}) {
    if (!repository || typeof repository.saveSnapshot !== "function") {
      return unavailable("learning_automation_release_readiness_repository_unavailable");
    }
    const readiness = evaluateReadiness(input);
    if (!readiness.ok) return readiness;
    const saveResult = repository.saveSnapshot(Object.assign({}, readiness, {
      createdBy: input.createdBy || input.created_by || input.requestedBy || input.requested_by,
      createdAt: input.createdAt || input.created_at,
      privacyClass: "summary_only"
    }));
    if (!saveResult?.ok) return saveResult || unavailable("learning_automation_release_readiness_save_failed");
    return {
      ok: true,
      source: "growth-learning-automation-release-readiness-service",
      duplicate: Boolean(saveResult.duplicate),
      readiness,
      snapshot: saveResult.snapshot
    };
  }

  function listSnapshots(input = {}) {
    if (!repository || typeof repository.listSnapshots !== "function") {
      return unavailable("learning_automation_release_readiness_repository_unavailable");
    }
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_release_readiness_scope_required");
    const snapshots = repository.listSnapshots(Object.assign({}, input, scope));
    return {
      ok: true,
      source: "growth-learning-automation-release-readiness-service",
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      count: snapshots.length,
      snapshots
    };
  }

  return {
    createSnapshot,
    evaluateReadiness,
    listSnapshots
  };
}

module.exports = {
  createLearningAutomationReleaseReadinessService
};
