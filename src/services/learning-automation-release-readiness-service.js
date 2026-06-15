"use strict";

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;

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
  const bag = evidenceBag(input);
  const value = input[key] ?? bag[key];
  if (value === true) return true;
  if (value && typeof value === "object") return value.ok === true || value.status === "pass" || value.present === true;
  return false;
}

function evidenceRef(input = {}, key) {
  const bag = evidenceBag(input);
  const value = input[key] ?? bag[key];
  if (!value || typeof value !== "object") return {};
  return {
    evidenceId: cleanString(value.evidenceId || value.evidence_id || value.id),
    status: cleanString(value.status || (value.ok === true ? "pass" : "")),
    observedAt: cleanString(value.observedAt || value.observed_at || value.createdAt || value.created_at),
    source: cleanString(value.source)
  };
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
      evidencePresent: true
    }, evidenceRef(input, evidenceKey)));
  }
  return check(checkKey, "missing", {
    label,
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

function createLearningAutomationReleaseReadinessService(options = {}) {
  const repository = options.repository || null;
  const releaseApprovalService = options.releaseApprovalService || null;
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
    const inputWithReleaseApproval = Object.assign({}, input, {
      releaseApproval: mergeReleaseApprovals(input, persistedApprovals.releaseApproval)
    });

    const checks = [
      presentCheck(input, "ownerDailyUiEvidence", "owner_daily_ui_evidence", "Owner daily UI product/visual evidence", "complete_owner_daily_ui_visual_validation"),
      presentCheck(input, "ownerAuditUiEvidence", "owner_audit_ui_evidence", "Owner audit/correction UI evidence", "complete_owner_audit_ui_privacy_validation"),
      presentCheck(input, "stageCheckpointEvidence", "stage_checkpoint_evidence", "Stage-checkpoint separation evidence", "validate_stage_checkpoint_separation"),
      presentCheck(input, "proposalReviewUiEvidence", "proposal_review_ui_evidence", "Proposal review UI evidence", "complete_proposal_review_ui"),
      presentCheck(input, "productionProposalSmokeEvidence", "production_proposal_smoke_evidence", "Production automation proposal smoke", "run_production_proposal_smoke"),
      presentCheck(input, "automationDigestUiEvidence", "automation_digest_ui_evidence", "Automation digest UI evidence", "complete_automation_digest_ui"),
      reviewedDigestCheck(scope),
      activeFailurePolicyCheck(scope),
      deliveredHandoffCheck(scope),
      presentCheck(input, "automationActionHandoffUiEvidence", "automation_action_handoff_ui_evidence", "Automation action handoff UI evidence", "complete_automation_action_handoff_ui"),
      presentCheck(input, "productionActionHandoffSmokeEvidence", "production_action_handoff_smoke_evidence", "Production action handoff smoke", "run_production_action_handoff_smoke"),
      check("owner_explicit_execution_gate", "pass", {
        label: "Owner-explicit execution boundary",
        servicePresent: true,
        currentEnabled: Boolean(config.automationWritefulExecutionEnabled),
        writefulSchedulingAllowed: false
      }),
      presentCheck(input, "schedulerExecutionUiEvidence", "scheduler_execution_ui_evidence", "Scheduler execution UI evidence", "complete_scheduler_execution_ui"),
      presentCheck(input, "productionSchedulerExecutionSmokeEvidence", "production_scheduler_execution_smoke_evidence", "Production scheduler execution smoke", "run_production_scheduler_execution_smoke"),
      check("scheduler_run_default_disabled", config.automationBackgroundSchedulerEnabled ? "blocked" : "pass", {
        label: "Scheduler run default-disabled status",
        currentEnabled: Boolean(config.automationBackgroundSchedulerEnabled),
        writefulSchedulingAllowed: false
      }, config.automationBackgroundSchedulerEnabled ? {
        action: "disable_scheduler_or_record_release_approval",
        requiredActor: "owner"
      } : {}),
      presentCheck(input, "schedulerRunUiEvidence", "scheduler_run_ui_evidence", "Scheduler run UI evidence", "complete_scheduler_run_ui"),
      presentCheck(input, "productionSchedulerRunSmokeEvidence", "production_scheduler_run_smoke_evidence", "Production scheduler run smoke", "run_production_scheduler_run_smoke"),
      presentCheck(input, "schedulerWorkerTargetUiEvidence", "scheduler_worker_target_ui_evidence", "Scheduler worker target UI evidence", "complete_scheduler_worker_target_ui"),
      presentCheck(input, "productionSchedulerWorkerTargetSmokeEvidence", "production_scheduler_worker_target_smoke_evidence", "Production scheduler worker target smoke", "run_production_scheduler_worker_target_smoke"),
      reviewedWorkerTargetCheck(scope),
      check("worker_timer_default_disabled", config.automationBackgroundWorkerEnabled ? "blocked" : "pass", {
        label: "Worker lease/timer default-disabled status",
        currentEnabled: Boolean(config.automationBackgroundWorkerEnabled),
        writefulSchedulingAllowed: false
      }, config.automationBackgroundWorkerEnabled ? {
        action: "disable_worker_or_record_release_approval",
        requiredActor: "owner"
      } : {}),
      presentCheck(input, "productionSchedulerWorkerSmokeEvidence", "production_scheduler_worker_smoke_evidence", "Production scheduler worker smoke", "run_production_scheduler_worker_smoke"),
      presentCheck(input, "productionPlannerReadinessEvidence", "production_planner_readiness_evidence", "Production planner readiness smoke", "run_production_planner_readiness_smoke"),
      presentCheck(input, "productionDailyLoopPreviewSmokeEvidence", "production_daily_loop_preview_smoke_evidence", "Production daily-loop preview smoke", "run_production_daily_loop_preview_smoke"),
      presentCheck(input, "productionLearningLoopStateSmokeEvidence", "production_learning_loop_state_smoke_evidence", "Production learning-loop state smoke", "run_production_learning_loop_state_smoke"),
      presentCheck(input, "productionDailyLoopWriteSmokeEvidence", "production_daily_loop_write_smoke_evidence", "Production daily-loop draft/publish smoke", "run_controlled_daily_loop_write_smoke"),
      presentCheck(input, "productionLearnerCycleSmokeEvidence", "production_learner_cycle_smoke_evidence", "Production learner daily-cycle smoke", "run_production_learner_cycle_smoke"),
      presentCheck(input, "productionSchedulerDryRunSmokeEvidence", "production_scheduler_dry_run_smoke_evidence", "Production scheduler dry-run smoke", "run_production_scheduler_dry_run_smoke"),
      schedulerDryRunCheck(scope, input),
      presentCheck(input, "platformActionEvidence", "platform_action_evidence", "Home AI platform Action Inbox/Web Push evidence", "attach_platform_action_evidence"),
      presentCheck(input, "centralVisualEvidence", "central_visual_evidence", "Central embedded-plugin visual evidence", "run_central_embedded_visual_harness"),
      configGateCheck(inputWithReleaseApproval, config, "writeful_execution_release_approval", "automationWritefulExecutionEnabled", "writefulExecutionApproval", "Writeful execution release approval"),
      configGateCheck(inputWithReleaseApproval, config, "background_scheduler_release_approval", "automationBackgroundSchedulerEnabled", "backgroundSchedulerApproval", "Background scheduler release approval"),
      configGateCheck(inputWithReleaseApproval, config, "background_worker_release_approval", "automationBackgroundWorkerEnabled", "backgroundWorkerApproval", "Background worker release approval")
    ];
    const summary = buildSummary(scope, checks);
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
        externalEvidenceKeys: Object.keys(evidenceBag(input)).filter((key) => !PRIVATE_KEY_PATTERN.test(key)).sort()
      },
      config: {
        schemaVersion: "growth.learningAutomationReleaseReadiness.config.v1",
        summaryOnly: true,
        automationWritefulExecutionEnabled: Boolean(config.automationWritefulExecutionEnabled),
        automationBackgroundSchedulerEnabled: Boolean(config.automationBackgroundSchedulerEnabled),
        automationBackgroundWorkerEnabled: Boolean(config.automationBackgroundWorkerEnabled),
        writefulSchedulingAllowed: false
      },
      summary,
      releaseReview: {
        schemaVersion: "growth.learningAutomationReleaseReadiness.releaseReview.v1",
        summaryOnly: true,
        readyForReleaseReview: summary.readyForReleaseReview,
        persistedApprovalKeys: persistedApprovals.approvalKeys,
        writefulSchedulingAllowed: false,
        advisoryOnly: true
      }
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
