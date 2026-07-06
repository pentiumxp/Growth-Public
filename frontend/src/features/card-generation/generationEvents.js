import { clean } from "../../utils/string.js";

export const cardGenerationClickSelectors = [
  "[data-card-generation-target]",
  "[data-card-generation-refresh]",
  "[data-card-generation-recipe]",
  "[data-card-generation-apply-target]",
  "[data-card-generation-provision-target]",
  "[data-card-generation-advance]",
  "[data-card-generation-draft]",
  "[data-card-generation-publish]",
  "[data-owner-audit-review-refresh]",
  "[data-owner-audit-review-decision]",
  "[data-card-generation-cycle-audit-refresh]",
  "[data-card-generation-cycle-history-refresh]",
  "[data-card-generation-cycle-history-select]",
  "[data-profile-feedback-refresh]",
  "[data-reference-chain-refresh]",
  "[data-automation-closed-loop-action-plan-refresh]",
  "[data-automation-closed-loop-action-run]",
  "[data-operating-loop-refresh]",
  "[data-operating-loop-run-next]",
  "[data-release-workbench-action]",
  "[data-release-package-build]",
  "[data-release-artifact-template-refresh]",
  "[data-release-workbench-action-audits-refresh]",
  "[data-release-status-readbacks-refresh]",
  "[data-release-evidence-ledger-refresh]",
  "[data-release-lifecycle-records-refresh]",
  "[data-release-lifecycle-record]",
  "[data-automation-cycle-closure-prepare]",
  "[data-automation-review-advancement-advance]",
  "[data-automation-proposal-refresh]",
  "[data-automation-proposal-create]",
  "[data-automation-proposal-review]",
  "[data-automation-proposal-publish]",
  "[data-automation-digest-refresh]",
  "[data-automation-digest-create]",
  "[data-automation-digest-review]",
  "[data-automation-failure-policy-refresh]",
  "[data-automation-failure-policy-create]",
  "[data-automation-failure-policy-review]",
  "[data-automation-action-handoff-refresh]",
  "[data-automation-action-handoff-create]",
  "[data-automation-action-handoff-deliver]",
  "[data-automation-scheduler-execution-refresh]",
  "[data-automation-scheduler-execution-execute]",
  "[data-automation-scheduler-run-refresh]",
  "[data-automation-scheduler-run-once]",
  "[data-automation-scheduler-worker-target-refresh]",
  "[data-automation-scheduler-worker-target-create]",
  "[data-automation-scheduler-worker-target-review]",
  "[data-recommendation-lifecycle-review]",
  "[data-stage-assessment-check]",
  "[data-stage-assessment-activate]"
];

export const cardGenerationInputSelectors = [
  "[data-card-generation-domain-pack]",
  "[data-card-generation-subject]",
  "[data-card-generation-correction-note]",
  "[data-owner-audit-review-note]",
  "[data-card-generation-correction-action]"
];

export const cardGenerationSubmitSelectors = [
  "[data-card-generation-correction-form]"
];

function has(dataset = {}, key = "") {
  return Object.prototype.hasOwnProperty.call(dataset, key);
}

function firstDatasetValue(dataset = {}, keys = []) {
  for (const key of keys) {
    const value = clean(dataset[key]);
    if (value) return value;
  }
  return "";
}

function descriptor(action, extra = {}) {
  return Object.assign({
    feature: "card_generation",
    action,
    preventDefault: true
  }, extra);
}

function ignored(action, reason = "disabled", extra = {}) {
  return descriptor(action, Object.assign({ ignored: true, reason }, extra));
}

function blocked(action, reason = "", extra = {}) {
  return descriptor(action, Object.assign({
    blocked: true,
    blockedReason: clean(reason)
  }, extra));
}

function disabledGuard(action, disabled, extra = {}) {
  if (disabled) return ignored(action, "disabled", extra);
  return descriptor(action, extra);
}

function lifecycleRecordKind(dataset = {}) {
  return firstDatasetValue(dataset, [
    "releaseLifecycleRecord",
    "releaseLifecycleRecordKind",
    "releaseLifecycleKind"
  ]);
}

export function cardGenerationActionFromDataset(dataset = {}, options = {}) {
  const disabled = options.disabled === true;
  const value = clean(options.value);

  if (has(dataset, "cardGenerationTarget")) {
    return descriptor("load_card_generation_context", {
      workspaceId: clean(dataset.cardGenerationTarget)
    });
  }
  if (has(dataset, "cardGenerationRefresh")) return descriptor("refresh_card_generation_context");
  if (has(dataset, "cardGenerationRecipe")) {
    return descriptor("select_card_generation_recipe", {
      recipeId: clean(dataset.cardGenerationRecipe)
    });
  }
  if (has(dataset, "cardGenerationDomainPack")) {
    return descriptor("select_domain_pack", {
      domainPackId: value || clean(dataset.cardGenerationDomainPack)
    });
  }
  if (has(dataset, "cardGenerationSubject")) {
    return descriptor("select_subject", {
      subject: value || clean(dataset.cardGenerationSubject)
    });
  }
  if (has(dataset, "cardGenerationApplyTarget")) return disabledGuard("apply_target_selection", disabled);
  if (has(dataset, "cardGenerationProvisionTarget")) return disabledGuard("provision_target", disabled);

  if (has(dataset, "cardGenerationAdvance") || has(dataset, "cardGenerationDraft") || has(dataset, "cardGenerationPublish")) {
    const action = has(dataset, "cardGenerationAdvance")
      ? "advance_operating_loop"
      : has(dataset, "cardGenerationPublish")
        ? "publish_daily_loop"
        : "draft_daily_loop";
    const reason = clean(dataset.cardGenerationBlockedReason);
    if (reason) return blocked(action, reason);
    return disabledGuard(action, disabled);
  }

  if (has(dataset, "cardGenerationCorrectionNote")) {
    return descriptor("update_owner_correction_note", { note: value });
  }
  if (has(dataset, "cardGenerationCorrectionAction")) {
    return descriptor("update_owner_correction_action", { reviewAction: value || clean(dataset.cardGenerationCorrectionAction) });
  }
  if (has(dataset, "cardGenerationCorrectionForm")) {
    return descriptor("submit_owner_correction");
  }
  if (has(dataset, "ownerAuditReviewNote")) {
    return descriptor("update_owner_audit_review_note", { note: value });
  }
  if (has(dataset, "ownerAuditReviewRefresh")) return disabledGuard("refresh_owner_audit_reviews", disabled);
  if (has(dataset, "ownerAuditReviewDecision")) {
    const action = "record_owner_audit_review";
    const reason = clean(dataset.ownerAuditReviewBlockedReason);
    if (reason) return blocked(action, reason, { decision: clean(dataset.ownerAuditReviewDecision) });
    return disabledGuard(action, disabled, { decision: clean(dataset.ownerAuditReviewDecision) });
  }

  if (has(dataset, "cardGenerationCycleAuditRefresh")) {
    const action = "refresh_cycle_drilldown";
    const reason = clean(dataset.cardGenerationBlockedReason);
    if (reason) return blocked(action, reason);
    return disabledGuard(action, disabled);
  }
  if (has(dataset, "cardGenerationCycleHistoryRefresh")) return disabledGuard("refresh_cycle_history", disabled);
  if (has(dataset, "cardGenerationCycleHistorySelect")) {
    return descriptor("select_cycle_history", { cycleHistoryKey: clean(dataset.cycleHistoryKey || dataset.cardGenerationCycleHistorySelect) });
  }
  if (has(dataset, "profileFeedbackRefresh")) return disabledGuard("refresh_profile_feedback", disabled);
  if (has(dataset, "referenceChainRefresh")) return disabledGuard("refresh_reference_chain", disabled);
  if (has(dataset, "operatingLoopRefresh")) return disabledGuard("refresh_operating_loop_runs", disabled);
  if (has(dataset, "operatingLoopRunNext")) {
    const action = "advance_operating_loop";
    const reason = clean(dataset.operatingLoopBlockedReason);
    if (reason) return blocked(action, reason);
    return disabledGuard(action, disabled);
  }

  if (has(dataset, "releaseWorkbenchAction")) {
    const reason = clean(dataset.releaseWorkbenchBlockedReason);
    const extra = {
      actionKey: clean(dataset.releaseWorkbenchActionKey),
      endpointKey: clean(dataset.releaseWorkbenchEndpointKey)
    };
    if (disabled && !reason) {
      return ignored("record_release_workbench_action");
    }
    if (reason) return blocked("record_release_workbench_action", reason, extra);
    return descriptor("record_release_workbench_action", extra);
  }
  if (has(dataset, "releasePackageBuild")) return disabledGuard("build_release_package", disabled, {
    actionKey: clean(dataset.releaseWorkbenchActionKey),
    endpointKey: clean(dataset.releaseWorkbenchEndpointKey)
  });
  if (has(dataset, "releaseArtifactTemplateRefresh")) return disabledGuard("refresh_release_artifact_template", disabled);
  if (has(dataset, "releaseWorkbenchActionAuditsRefresh")) return disabledGuard("refresh_release_workbench_action_audits", disabled);
  if (has(dataset, "releaseStatusReadbacksRefresh")) return disabledGuard("refresh_release_status_readbacks", disabled);
  if (has(dataset, "releaseEvidenceLedgerRefresh")) return disabledGuard("refresh_release_evidence_ledger", disabled);
  if (has(dataset, "releaseLifecycleRecordsRefresh")) return disabledGuard("refresh_release_lifecycle_records", disabled);
  if (has(dataset, "releaseLifecycleRecord")) {
    return disabledGuard("record_release_lifecycle_record", disabled, {
      recordKind: lifecycleRecordKind(dataset)
    });
  }

  if (has(dataset, "automationClosedLoopActionPlanRefresh")) return disabledGuard("refresh_automation_closed_loop_action_plan", disabled);
  if (has(dataset, "automationClosedLoopActionRun")) return disabledGuard("run_automation_closed_loop_action_plan", disabled, {
    phaseIndex: clean(dataset.automationClosedLoopPhaseIndex)
  });
  if (has(dataset, "automationCycleClosurePrepare")) return disabledGuard("prepare_automation_cycle_closure", disabled);
  if (has(dataset, "automationReviewAdvancementAdvance")) return disabledGuard("advance_automation_review", disabled);

  if (has(dataset, "automationProposalRefresh")) return disabledGuard("refresh_automation_proposals", disabled);
  if (has(dataset, "automationProposalCreate") || has(dataset, "automationProposalReview") || has(dataset, "automationProposalPublish")) {
    const action = has(dataset, "automationProposalCreate")
      ? "create_automation_proposal"
      : has(dataset, "automationProposalPublish")
        ? "publish_automation_proposal"
        : "review_automation_proposal";
    const reason = clean(dataset.automationProposalBlockedReason);
    const extra = {
      proposalId: clean(dataset.automationProposalId),
      status: clean(dataset.automationProposalReview)
    };
    if (reason) return blocked(action, reason, extra);
    return disabledGuard(action, disabled, extra);
  }

  if (has(dataset, "automationDigestRefresh")) return disabledGuard("refresh_automation_digests", disabled);
  if (has(dataset, "automationDigestCreate")) return disabledGuard("create_automation_digest", disabled);
  if (has(dataset, "automationDigestReview")) return disabledGuard("review_automation_digest", disabled, {
    digestId: clean(dataset.automationDigestId),
    status: clean(dataset.automationDigestReview)
  });

  if (has(dataset, "automationFailurePolicyRefresh")) return disabledGuard("refresh_automation_failure_policies", disabled);
  if (has(dataset, "automationFailurePolicyCreate")) return disabledGuard("create_automation_failure_policy", disabled);
  if (has(dataset, "automationFailurePolicyReview")) return disabledGuard("review_automation_failure_policy", disabled, {
    policyId: clean(dataset.automationFailurePolicyId),
    status: clean(dataset.automationFailurePolicyReview)
  });

  if (has(dataset, "automationActionHandoffRefresh")) return disabledGuard("refresh_automation_action_handoffs", disabled);
  if (has(dataset, "automationActionHandoffCreate")) return disabledGuard("create_automation_action_handoff", disabled, {
    digestId: clean(dataset.automationDigestId)
  });
  if (has(dataset, "automationActionHandoffDeliver")) return disabledGuard("deliver_automation_action_handoff", disabled, {
    handoffId: clean(dataset.automationActionHandoffId)
  });

  if (has(dataset, "automationSchedulerExecutionRefresh")) return disabledGuard("refresh_automation_scheduler_executions", disabled);
  if (has(dataset, "automationSchedulerExecutionExecute")) return disabledGuard("execute_automation_scheduler_once", disabled, {
    handoffId: clean(dataset.automationActionHandoffId),
    executionId: clean(dataset.automationSchedulerExecutionId)
  });
  if (has(dataset, "automationSchedulerRunRefresh")) return disabledGuard("refresh_automation_scheduler_runs", disabled);
  if (has(dataset, "automationSchedulerRunOnce")) return disabledGuard("run_automation_scheduler_once", disabled);
  if (has(dataset, "automationSchedulerWorkerTargetRefresh")) return disabledGuard("refresh_automation_scheduler_worker_targets", disabled);
  if (has(dataset, "automationSchedulerWorkerTargetCreate")) return disabledGuard("create_automation_scheduler_worker_target", disabled);
  if (has(dataset, "automationSchedulerWorkerTargetReview")) return disabledGuard("review_automation_scheduler_worker_target", disabled, {
    targetId: clean(dataset.automationSchedulerWorkerTargetId),
    status: clean(dataset.automationSchedulerWorkerTargetReview)
  });

  if (has(dataset, "recommendationLifecycleReview")) return disabledGuard("review_recommendation_lifecycle", disabled, {
    recommendationId: clean(dataset.recommendationLifecycleReview),
    status: clean(dataset.recommendationLifecycleStatus)
  });
  if (has(dataset, "stageAssessmentCheck")) return disabledGuard("refresh_stage_checkpoint_controls", disabled);
  if (has(dataset, "stageAssessmentActivate")) return disabledGuard("activate_stage_assessment", disabled);

  return null;
}

export function cardGenerationEventActionFromElement(element = null, options = {}) {
  if (!element || !element.dataset) return null;
  return cardGenerationActionFromDataset(element.dataset, {
    disabled: element.disabled === true,
    value: "value" in element ? element.value : options.value
  });
}
