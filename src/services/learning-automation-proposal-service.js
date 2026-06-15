"use strict";

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

function boundedText(value, max = 360) {
  const text = cleanString(value);
  return text.length > max ? text.slice(0, max) : text;
}

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw)/i;

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
    error: cleanString(error) || "learning_automation_proposal_unavailable"
  }, extra);
}

function sourceCycleFromInput(input = {}) {
  return {
    planDraftId: cleanString(input.sourcePlanDraftId || input.source_plan_draft_id || input.planDraftId || input.plan_draft_id),
    taskCardId: cleanString(input.sourceTaskCardId || input.source_task_card_id || input.taskCardId || input.task_card_id),
    evaluationId: cleanString(input.sourceEvaluationId || input.source_evaluation_id || input.evaluationId || input.evaluation_id),
    profileDeltaId: cleanString(input.profileDeltaId || input.profile_delta_id),
    evidenceId: cleanString(input.evidenceId || input.evidence_id),
    correctionId: cleanString(input.correctionId || input.correction_id),
    sourceId: cleanString(input.sourceId || input.source_id),
    targetNodeIds: uniqueStrings(input.sourceTargetNodeIds || input.source_target_node_ids || input.targetNodeIds || input.target_node_ids)
  };
}

function hasSourceCycle(cycle = {}) {
  return Boolean(
    cycle.planDraftId
    || cycle.taskCardId
    || cycle.evaluationId
    || cycle.profileDeltaId
    || cycle.evidenceId
    || cycle.sourceId
  );
}

function selectedItemFromDraft(planDraft = {}, requestedItemId = "") {
  const items = asArray(planDraft.draft?.items);
  const requested = cleanString(requestedItemId);
  if (requested) return items.find((item) => cleanString(item.itemId || item.item_id) === requested) || null;
  return items[0] || null;
}

function itemTargetNodeIds(item = {}) {
  return uniqueStrings(
    item.targetNodeIds
    || item.target_node_ids
    || item.assessmentCoverageNodeIds
    || item.assessment_coverage_node_ids
  );
}

function sourceCycleForCompleteness(input = {}, cycle = {}) {
  return {
    workspaceId: cleanString(input.workspaceId || input.workspace_id),
    learnerId: cleanString(input.learnerId || input.learner_id || input.workspaceId || input.workspace_id),
    programId: cleanString(input.programId || input.program_id),
    planDraftId: cycle.planDraftId,
    taskCardId: cycle.taskCardId,
    evaluationId: cycle.evaluationId,
    profileDeltaId: cycle.profileDeltaId,
    evidenceId: cycle.evidenceId,
    correctionId: cycle.correctionId,
    sourceId: cycle.sourceId,
    targetNodeIds: cycle.targetNodeIds,
    limit: input.auditLimit || input.audit_limit || 20
  };
}

function proposalPolicy(input = {}, completeness = {}) {
  return {
    schemaVersion: "growth.learningAutomationProposal.policy.v1",
    ownerReviewRequired: true,
    dryRunOnly: true,
    autoPublish: false,
    publishRequiresOwnerAction: true,
    requiresAuditCompleteness: true,
    readyForAutomation: Boolean(completeness.readyForAutomation),
    requestedBy: cleanString(input.requestedBy || input.requested_by)
  };
}

function proposalRationale(input = {}, completeness = {}, targetProvisioning = {}, planDraft = {}, selectedItem = {}) {
  return {
    summaryOnly: true,
    source: "growth-learning-automation-proposal-service",
    completeness: {
      complete: Boolean(completeness.complete),
      readyForAutomation: Boolean(completeness.readyForAutomation),
      missingRequired: asArray(completeness.summary?.missingRequired).map(cleanString).filter(Boolean).slice(0, 12)
    },
    targetProvisioning: {
      mode: cleanString(targetProvisioning.mode),
      selectedDomainPackId: cleanString(targetProvisioning.selectedDomainPackId),
      selectedDomain: cleanString(targetProvisioning.selectedDomain),
      selectedSubject: cleanString(targetProvisioning.selectedSubject)
    },
    plan: {
      planDraftId: cleanString(planDraft.planDraftId),
      horizon: cleanString(planDraft.horizon),
      selectedItemId: cleanString(selectedItem.itemId || selectedItem.item_id),
      reason: boundedText(selectedItem.reason, 260),
      estimatedMinutes: Number(selectedItem.estimatedMinutes || selectedItem.estimated_minutes || 0) || 0,
      cardRole: cleanString(selectedItem.cardRole || selectedItem.card_role),
      supportLevel: cleanString(selectedItem.supportLevel || selectedItem.support_level)
    },
    requested: {
      horizon: cleanString(input.horizon || "daily_plan"),
      availableMinutes: Number(input.availableMinutes || input.available_minutes || 0) || 0
    }
  };
}

function publishActionForProposal(proposal = {}) {
  const planDraftId = cleanString(proposal.planDraftId || proposal.plan_draft_id);
  if (!planDraftId) return null;
  return {
    requiredActor: "owner",
    endpoint: `/api/v1/growth/learning-plans/${encodeURIComponent(planDraftId)}/publish`,
    itemId: cleanString(proposal.selectedItemId || proposal.selected_item_id)
  };
}

function publishExecutionFromResult(proposal = {}, result = {}, input = {}) {
  const planDraft = result.planDraft || {};
  const generation = result.generation || {};
  const published = generation.published || {};
  const publishAttempt = result.publishAttempt || planDraft.publishAttempt || null;
  const status = result.ok
    ? "published"
    : (publishAttempt?.status === "blocked" || result.error === "stage_assessment_activation_required" ? "blocked" : "failed");
  return {
    workspaceId: proposal.workspaceId,
    proposalId: proposal.proposalId,
    status,
    stage: result.stage || publishAttempt?.stage || (result.ok ? "published" : "publish"),
    error: result.ok ? "" : result.error,
    planDraftId: proposal.planDraftId,
    selectedItemId: proposal.selectedItemId,
    generatedTaskCardId: published.taskCardId || planDraft.generatedTaskCardId,
    generatedLearningGraphPlanId: generation.learningGraphPlan?.learningGraphPlanId || planDraft.generatedLearningGraphPlanId,
    publishAttempt,
    executedBy: input.requestedBy || input.requested_by,
    executedAt: input.executedAt || input.executed_at
  };
}

function createLearningAutomationProposalService(options = {}) {
  const repository = options.repository || null;
  const auditCompletenessService = options.auditCompletenessService || null;
  const planPublisherService = options.planPublisherService || null;
  const targetProvisioningService = options.targetProvisioningService || null;

  function resolveTargetProvisioning(input = {}) {
    if (!targetProvisioningService || typeof targetProvisioningService.resolveSelection !== "function") {
      return { ok: true, targetEnabled: true };
    }
    const result = targetProvisioningService.resolveSelection(input);
    if (!result?.ok || !result.targetEnabled) {
      return unavailable(result?.error || "learning_target_not_provisioned", {
        stage: "provisioning",
        targetProvisioning: result || null
      });
    }
    return result;
  }

  async function createProposal(input = {}) {
    if (!repository || typeof repository.saveProposal !== "function") {
      return unavailable("learning_automation_proposal_repository_unavailable");
    }
    if (!planPublisherService || typeof planPublisherService.draftPlan !== "function") {
      return unavailable("learning_plan_publisher_unavailable");
    }
    if (!auditCompletenessService || typeof auditCompletenessService.evaluateCycleCompleteness !== "function") {
      return unavailable("learning_audit_completeness_service_unavailable");
    }
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
    if (!workspaceId) return unavailable("learning_automation_proposal_scope_required");
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) return unavailable("learning_automation_proposal_privacy_failed", { privacyFindings });

    const sourceCycle = sourceCycleFromInput(input);
    if (!hasSourceCycle(sourceCycle)) {
      return unavailable("learning_automation_source_cycle_required", { sourceCycle });
    }
    const completeness = auditCompletenessService.evaluateCycleCompleteness(sourceCycleForCompleteness(input, sourceCycle));
    if (!completeness?.ok || !completeness.readyForAutomation) {
      return unavailable("learning_automation_cycle_not_ready", {
        stage: "audit_completeness",
        completeness: completeness || null,
        sourceCycle
      });
    }

    const targetProvisioning = resolveTargetProvisioning({
      workspaceId,
      learnerId,
      programId: input.programId || input.program_id,
      domainPackId: input.domainPackId || input.domain_pack_id,
      domain: input.domain,
      subject: input.subject,
      targetNodeIds: input.targetNodeIds || input.target_node_ids
    });
    if (!targetProvisioning?.ok) return targetProvisioning;

    const draftResult = await planPublisherService.draftPlan({
      workspaceId,
      learnerId,
      programId: input.programId || input.program_id,
      horizon: input.horizon || "daily_plan",
      domainPackId: input.domainPackId || input.domain_pack_id || targetProvisioning.selectedDomainPackId,
      domain: input.domain || targetProvisioning.selectedDomain,
      subject: input.subject || targetProvisioning.selectedSubject,
      availableMinutes: input.availableMinutes || input.available_minutes,
      allowedCardRoles: input.allowedCardRoles || input.allowed_card_roles,
      lowPressure: input.lowPressure !== undefined ? input.lowPressure : input.low_pressure,
      targetNodeIds: input.targetNodeIds || input.target_node_ids,
      requestedBy: input.requestedBy || input.requested_by
    });
    if (!draftResult?.ok) {
      return unavailable(draftResult?.error || "learning_automation_plan_draft_failed", {
        stage: "plan_draft",
        draftResult: draftResult || null
      });
    }
    const planDraft = draftResult.planDraft || {};
    const selectedItem = selectedItemFromDraft(planDraft, input.itemId || input.item_id || input.selectedItemId || input.selected_item_id);
    if (!selectedItem) {
      return unavailable("learning_automation_plan_item_missing", {
        stage: "plan_selection",
        planDraft
      });
    }
    const targetNodeIds = itemTargetNodeIds(selectedItem);
    const policy = proposalPolicy(input, completeness);
    const rationale = proposalRationale(input, completeness, targetProvisioning, planDraft, selectedItem);
    const saveResult = repository.saveProposal({
      workspaceId,
      learnerId,
      programId: input.programId || input.program_id,
      horizon: planDraft.horizon || input.horizon || "daily_plan",
      status: "proposed",
      sourceCycle: Object.assign({}, sourceCycle, {
        complete: Boolean(completeness.complete),
        readyForAutomation: Boolean(completeness.readyForAutomation)
      }),
      sourcePlanDraftId: sourceCycle.planDraftId,
      sourceTaskCardId: sourceCycle.taskCardId,
      sourceEvaluationId: sourceCycle.evaluationId,
      planDraftId: planDraft.planDraftId,
      selectedItemId: cleanString(selectedItem.itemId || selectedItem.item_id),
      proposalSummary: planDraft.planSummary || selectedItem.reason || "Supervised next learning proposal.",
      targetNodeIds,
      rationale,
      policy,
      createdBy: input.requestedBy || input.requested_by,
      privacyClass: "summary_only"
    });
    if (!saveResult?.ok) return saveResult || unavailable("learning_automation_proposal_save_failed");
    return {
      ok: true,
      source: "growth-learning-automation-proposal-service",
      duplicate: Boolean(saveResult.duplicate),
      proposal: saveResult.proposal,
      planDraft,
      selectedItem,
      completeness,
      targetProvisioning,
      publishAction: publishActionForProposal({
        planDraftId: planDraft.planDraftId,
        selectedItemId: selectedItem.itemId || selectedItem.item_id
      })
    };
  }

  function listProposals(input = {}) {
    if (!repository || typeof repository.listProposals !== "function") {
      return unavailable("learning_automation_proposal_repository_unavailable");
    }
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    if (!workspaceId) return unavailable("learning_automation_proposal_scope_required");
    const proposals = repository.listProposals(input);
    return {
      ok: true,
      source: "growth-learning-automation-proposal-service",
      workspaceId,
      learnerId: cleanString(input.learnerId || input.learner_id || workspaceId),
      count: proposals.length,
      proposals
    };
  }

  function reviewProposal(input = {}) {
    if (!repository || typeof repository.reviewProposal !== "function") {
      return unavailable("learning_automation_proposal_repository_unavailable");
    }
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    const proposalId = cleanString(input.proposalId || input.proposal_id);
    if (!workspaceId || !proposalId) return unavailable("learning_automation_proposal_scope_required");
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) return unavailable("learning_automation_proposal_privacy_failed", { privacyFindings });
    const result = repository.reviewProposal(Object.assign({}, input, {
      workspaceId,
      proposalId,
      status: input.status || input.reviewAction || input.review_action || input.action
    }));
    if (!result?.ok) return result || unavailable("learning_automation_proposal_review_failed");
    const proposal = result.proposal || {};
    const publishAction = proposal.status === "accepted" ? publishActionForProposal(proposal) : null;
    return {
      ok: true,
      source: "growth-learning-automation-proposal-service",
      duplicate: Boolean(result.duplicate),
      proposal,
      publishAction
    };
  }

  async function publishAcceptedProposal(input = {}) {
    if (!repository || typeof repository.getProposal !== "function" || typeof repository.recordExecution !== "function") {
      return unavailable("learning_automation_proposal_repository_unavailable");
    }
    if (!planPublisherService || typeof planPublisherService.publishPlanItem !== "function") {
      return unavailable("learning_plan_publisher_unavailable");
    }
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    const proposalId = cleanString(input.proposalId || input.proposal_id);
    if (!workspaceId || !proposalId) return unavailable("learning_automation_proposal_scope_required");
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) return unavailable("learning_automation_proposal_privacy_failed", { privacyFindings });

    const proposal = repository.getProposal({ workspaceId, proposalId });
    if (!proposal) return unavailable("learning_automation_proposal_not_found");
    if (proposal.status !== "accepted") {
      return unavailable("learning_automation_proposal_not_accepted", { proposal });
    }
    if (cleanString(proposal.execution?.status) === "published") {
      return {
        ok: true,
        source: "growth-learning-automation-proposal-service",
        duplicate: true,
        proposal,
        publishAction: null,
        publishResult: null
      };
    }

    let publishResult = null;
    try {
      publishResult = await planPublisherService.publishPlanItem({
        workspaceId,
        learnerId: proposal.learnerId || workspaceId,
        programId: proposal.programId,
        planDraftId: proposal.planDraftId,
        itemId: proposal.selectedItemId,
        generationKey: input.generationKey || input.generation_key,
        cardSchemaVersion: input.cardSchemaVersion || input.card_schema_version,
        requestedBy: input.requestedBy || input.requested_by
      });
    } catch (error) {
      publishResult = {
        ok: false,
        error: "learning_automation_proposal_publish_exception",
        stage: "publish_exception",
        message: boundedText(error?.message, 180)
      };
    }
    const executionResult = repository.recordExecution(publishExecutionFromResult(proposal, publishResult || {}, input));
    if (!executionResult?.ok) {
      return executionResult || unavailable("learning_automation_proposal_execution_record_failed", {
        publishResult: publishResult || null
      });
    }
    return {
      ok: Boolean(publishResult?.ok),
      source: "growth-learning-automation-proposal-service",
      duplicate: Boolean(publishResult?.duplicate),
      error: publishResult?.ok ? "" : (publishResult?.error || "learning_automation_proposal_publish_failed"),
      proposal: executionResult.proposal,
      publishResult: publishResult || null,
      publishAction: publishResult?.ok ? null : publishActionForProposal(proposal)
    };
  }

  return {
    createProposal,
    listProposals,
    publishAcceptedProposal,
    reviewProposal
  };
}

module.exports = {
  createLearningAutomationProposalService
};
