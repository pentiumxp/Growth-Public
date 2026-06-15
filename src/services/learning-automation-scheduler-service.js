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

function clampLimit(value, fallback = 20) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(50, Math.round(parsed)));
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
    error: cleanString(error) || "learning_automation_scheduler_unavailable"
  }, extra);
}

function sourceCycleForCompleteness(proposal = {}, input = {}) {
  const sourceCycle = proposal.sourceCycle || {};
  return {
    workspaceId: cleanString(proposal.workspaceId || input.workspaceId || input.workspace_id),
    learnerId: cleanString(proposal.learnerId || input.learnerId || input.learner_id || proposal.workspaceId),
    programId: cleanString(proposal.programId || input.programId || input.program_id),
    planDraftId: cleanString(sourceCycle.planDraftId || proposal.sourcePlanDraftId),
    taskCardId: cleanString(sourceCycle.taskCardId || proposal.sourceTaskCardId),
    evaluationId: cleanString(sourceCycle.evaluationId || proposal.sourceEvaluationId),
    profileDeltaId: cleanString(sourceCycle.profileDeltaId || input.profileDeltaId || input.profile_delta_id),
    evidenceId: cleanString(sourceCycle.evidenceId || input.evidenceId || input.evidence_id),
    correctionId: cleanString(sourceCycle.correctionId || input.correctionId || input.correction_id),
    sourceId: cleanString(sourceCycle.sourceId || input.sourceId || input.source_id),
    targetNodeIds: uniqueStrings(sourceCycle.targetNodeIds || input.sourceTargetNodeIds || input.source_target_node_ids),
    limit: input.auditLimit || input.audit_limit || input.limit || 20
  };
}

function targetProvisioningInput(proposal = {}, input = {}) {
  const rationaleProvisioning = proposal.rationale?.targetProvisioning || {};
  return {
    workspaceId: cleanString(proposal.workspaceId || input.workspaceId || input.workspace_id),
    learnerId: cleanString(proposal.learnerId || input.learnerId || input.learner_id || proposal.workspaceId),
    programId: cleanString(proposal.programId || input.programId || input.program_id),
    displayName: cleanString(input.displayName || input.display_name || input.label),
    label: cleanString(input.label || input.displayName || input.display_name),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id || rationaleProvisioning.selectedDomainPackId),
    domain: cleanString(input.domain || rationaleProvisioning.selectedDomain),
    subject: cleanString(input.subject || rationaleProvisioning.selectedSubject),
    targetNodeIds: uniqueStrings(proposal.targetNodeIds || input.targetNodeIds || input.target_node_ids || input.nodeIds || input.node_ids)
  };
}

function executionStatus(proposal = {}) {
  return cleanString(proposal.execution?.status).toLowerCase();
}

function proposalStatus(proposal = {}) {
  return cleanString(proposal.status).toLowerCase();
}

function publishAction(proposal = {}) {
  const proposalId = cleanString(proposal.proposalId);
  return {
    requiredActor: "owner",
    endpoint: `/api/v1/growth/automation/proposals/${encodeURIComponent(proposalId)}/publish`,
    proposalId,
    planDraftId: cleanString(proposal.planDraftId),
    selectedItemId: cleanString(proposal.selectedItemId),
    targetNodeIds: uniqueStrings(proposal.targetNodeIds)
  };
}

function candidateMatches(candidate = {}, input = {}) {
  const proposalId = cleanString(input.proposalId || input.proposal_id);
  const planDraftId = cleanString(input.planDraftId || input.plan_draft_id);
  const selectedItemId = cleanString(input.selectedItemId || input.selected_item_id || input.itemId || input.item_id);
  if (proposalId && cleanString(candidate.proposalId) !== proposalId) return false;
  if (planDraftId && cleanString(candidate.planDraftId) !== planDraftId) return false;
  if (selectedItemId && cleanString(candidate.selectedItemId) !== selectedItemId) return false;
  return true;
}

function candidateBase(proposal = {}) {
  return {
    proposalId: cleanString(proposal.proposalId),
    workspaceId: cleanString(proposal.workspaceId),
    learnerId: cleanString(proposal.learnerId),
    programId: cleanString(proposal.programId),
    status: cleanString(proposal.status),
    executionStatus: executionStatus(proposal),
    planDraftId: cleanString(proposal.planDraftId),
    selectedItemId: cleanString(proposal.selectedItemId),
    targetNodeIds: uniqueStrings(proposal.targetNodeIds),
    summary: boundedText(proposal.proposalSummary, 260)
  };
}

function blockedCandidate(proposal = {}, decision, reason, extra = {}) {
  return Object.assign(candidateBase(proposal), {
    decision,
    reason,
    safeToPublish: false,
    wouldPublish: false
  }, extra);
}

function wouldPublishCandidate(proposal = {}, completeness = {}, targetProvisioning = {}) {
  return Object.assign(candidateBase(proposal), {
    decision: "would_publish",
    reason: "accepted_proposal_ready_for_explicit_publish",
    safeToPublish: true,
    wouldPublish: true,
    completeness: {
      complete: Boolean(completeness.complete),
      readyForAutomation: Boolean(completeness.readyForAutomation),
      missingRequired: asArray(completeness.summary?.missingRequired).map(cleanString).filter(Boolean).slice(0, 12)
    },
    targetProvisioning: {
      mode: cleanString(targetProvisioning.mode),
      selectedDomainPackId: cleanString(targetProvisioning.selectedDomainPackId),
      selectedDomain: cleanString(targetProvisioning.selectedDomain),
      selectedSubject: cleanString(targetProvisioning.selectedSubject),
      selectedTargetNodeIds: uniqueStrings(targetProvisioning.selectedTargetNodeIds)
    },
    publishAction: publishAction(proposal),
    rationale: {
      summaryOnly: true,
      reason: boundedText(proposal.rationale?.plan?.reason || proposal.proposalSummary, 260)
    }
  });
}

function summarize(candidates = []) {
  return {
    inspected: candidates.length,
    wouldPublish: candidates.filter((item) => item.wouldPublish).length,
    blocked: candidates.filter((item) => String(item.decision || "").startsWith("blocked")).length,
    skipped: candidates.filter((item) => String(item.decision || "").startsWith("skipped")).length
  };
}

function createLearningAutomationSchedulerService(options = {}) {
  const automationProposalService = options.automationProposalService || null;
  const auditCompletenessService = options.auditCompletenessService || null;
  const targetProvisioningService = options.targetProvisioningService || null;

  function evaluateProposal(proposal = {}, input = {}) {
    if (proposalStatus(proposal) !== "accepted") {
      return blockedCandidate(proposal, "skipped_not_accepted", "proposal_status_not_accepted");
    }
    if (executionStatus(proposal) === "published") {
      return blockedCandidate(proposal, "skipped_already_published", "proposal_already_published");
    }

    const completeness = auditCompletenessService.evaluateCycleCompleteness(sourceCycleForCompleteness(proposal, input));
    if (!completeness?.ok || !completeness.readyForAutomation) {
      return blockedCandidate(proposal, "blocked_audit", completeness?.error || "source_cycle_not_ready", {
        completeness: completeness || null
      });
    }

    const targetProvisioning = targetProvisioningService.resolveSelection(targetProvisioningInput(proposal, input));
    if (!targetProvisioning?.ok || !targetProvisioning.targetEnabled) {
      return blockedCandidate(proposal, "blocked_provisioning", targetProvisioning?.error || "learning_target_not_provisioned", {
        targetProvisioning: targetProvisioning || null
      });
    }

    return wouldPublishCandidate(proposal, completeness, targetProvisioning);
  }

  function dryRun(input = {}) {
    if (!automationProposalService || typeof automationProposalService.listProposals !== "function") {
      return unavailable("learning_automation_scheduler_proposal_service_unavailable");
    }
    if (!auditCompletenessService || typeof auditCompletenessService.evaluateCycleCompleteness !== "function") {
      return unavailable("learning_automation_scheduler_audit_completeness_unavailable");
    }
    if (!targetProvisioningService || typeof targetProvisioningService.resolveSelection !== "function") {
      return unavailable("learning_automation_scheduler_target_provisioning_unavailable");
    }
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
    if (!workspaceId) return unavailable("learning_automation_scheduler_scope_required");
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) return unavailable("learning_automation_scheduler_privacy_failed", { privacyFindings });

    const limit = clampLimit(input.limit);
    const listed = automationProposalService.listProposals({
      workspaceId,
      learnerId,
      programId: input.programId || input.program_id,
      status: "accepted",
      proposalId: input.proposalId || input.proposal_id,
      planDraftId: input.planDraftId || input.plan_draft_id,
      limit
    });
    if (!listed?.ok) return unavailable(listed?.error || "learning_automation_scheduler_proposal_list_failed", { proposalList: listed || null });
    const proposals = asArray(listed.proposals).slice(0, limit);
    const candidates = proposals
      .map((proposal) => evaluateProposal(proposal, input))
      .filter((candidate) => candidateMatches(candidate, input));
    return {
      ok: true,
      source: "growth-learning-automation-scheduler-service",
      dryRun: true,
      writePlanned: false,
      writesPerformed: false,
      publishPlanned: false,
      workspaceId,
      learnerId,
      programId: cleanString(input.programId || input.program_id),
      count: candidates.length,
      summary: summarize(candidates),
      candidates
    };
  }

  return {
    dryRun
  };
}

module.exports = {
  createLearningAutomationSchedulerService
};
