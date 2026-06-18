"use strict";

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = []) {
  const source = Array.isArray(values) ? values : String(values || "").split(",");
  return Array.from(new Set(source.map((value) => cleanString(value, 160)).filter(Boolean)));
}

function bool(value) {
  return value === true || ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
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

function unavailable(error, extra = {}) {
  return Object.assign({
    ok: false,
    source: "growth-learning-automation-cycle-closure-service",
    schemaVersion: "growth.learningAutomationCycleClosure.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "blocked",
    error: cleanString(error) || "learning_automation_cycle_closure_unavailable",
    writesPerformed: false,
    publishPerformed: false,
    schedulerStarted: false
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
    availableMinutes: Number(input.availableMinutes || input.available_minutes || 15) || 15,
    requestedBy: cleanString(input.requestedBy || input.requested_by)
  };
}

function selectorFrom(input = {}) {
  return {
    cycleId: cleanString(input.cycleId || input.cycle_id),
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

function hasSelector(selector = {}) {
  return Boolean(
    selector.planDraftId
    || selector.taskCardId
    || selector.evaluationId
    || selector.profileDeltaId
    || selector.evidenceId
    || selector.sourceId
  );
}

function selectorFromFeedback(feedback = {}) {
  const selected = feedback.selectedCompletedCycle || feedback.selected_completed_cycle || {};
  const scope = feedback.scope || {};
  return selectorFrom(Object.assign({}, scope, selected, {
    sourcePlanDraftId: selected.planDraftId || scope.planDraftId,
    sourceTaskCardId: selected.taskCardId || scope.taskCardId,
    sourceEvaluationId: selected.evaluationId || scope.evaluationId,
    targetNodeIds: selected.targetNodeIds || scope.targetNodeIds
  }));
}

function sourceCyclePayload(selector = {}) {
  return {
    sourcePlanDraftId: selector.planDraftId,
    sourceTaskCardId: selector.taskCardId,
    sourceEvaluationId: selector.evaluationId,
    profileDeltaId: selector.profileDeltaId,
    evidenceId: selector.evidenceId,
    correctionId: selector.correctionId,
    sourceId: selector.sourceId,
    sourceTargetNodeIds: selector.targetNodeIds
  };
}

function publicStage(name, result = {}) {
  return {
    name,
    ok: result?.ok !== false,
    status: cleanString(result?.status || result?.deliveryStatus || (result?.ok === false ? "failed" : "pass")),
    error: cleanString(result?.error),
    duplicate: result?.duplicate === true
  };
}

function terminal(result = {}, stages = [], summary = {}) {
  const output = Object.assign({
    source: "growth-learning-automation-cycle-closure-service",
    schemaVersion: "growth.learningAutomationCycleClosure.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    stages,
    summary: Object.assign({
      writesPerformed: stages.some((stage) => stage.ok && ["proposal_create", "proposal_review", "digest_create", "digest_review", "handoff_create", "handoff_deliver"].includes(stage.name)),
      publishPerformed: false,
      schedulerStarted: false,
      gatewayBoundary: "proposal_creation_may_call_planner_gateway_only"
    }, summary),
    writesPerformed: stages.some((stage) => stage.ok && ["proposal_create", "proposal_review", "digest_create", "digest_review", "handoff_create", "handoff_deliver"].includes(stage.name)),
    publishPerformed: false,
    schedulerStarted: false
  }, result);
  const privacyFindings = scanPrivacy(output);
  if (privacyFindings.length) {
    return unavailable("learning_automation_cycle_closure_output_privacy_failed", { privacyFindings });
  }
  return output;
}

function createLearningAutomationCycleClosureService(options = {}) {
  const profileFeedbackService = options.profileFeedbackService || null;
  const proposalService = options.proposalService || null;
  const digestService = options.digestService || null;
  const actionHandoffService = options.actionHandoffService || null;

  function resolveSource(input = {}, scope = {}, stages = []) {
    let selector = selectorFrom(input);
    if (hasSelector(selector)) {
      return { ok: true, selector, profileFeedback: null };
    }
    if (!profileFeedbackService || typeof profileFeedbackService.evaluate !== "function") {
      return unavailable("learning_automation_cycle_closure_profile_feedback_unavailable");
    }
    const feedback = profileFeedbackService.evaluate(Object.assign({}, scope, {
      autoSelectLatestCompletedCycle: input.autoSelectLatestCompletedCycle !== false && input.auto_select_latest_completed_cycle !== false,
      autoSelectCompletedCycle: bool(input.autoSelectCompletedCycle || input.auto_select_completed_cycle),
      limit: input.limit || 5
    }));
    stages.push(publicStage("profile_feedback", feedback));
    selector = selectorFromFeedback(feedback || {});
    if (!hasSelector(selector)) {
      return unavailable(feedback?.error || "learning_automation_cycle_closure_completed_cycle_required", {
        profileFeedback: feedback || null
      });
    }
    return { ok: true, selector, profileFeedback: feedback };
  }

  async function prepareReviewPacket(input = {}) {
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) {
      return unavailable("learning_automation_cycle_closure_privacy_failed", { privacyFindings });
    }
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_cycle_closure_scope_required");
    if (!proposalService || typeof proposalService.createProposal !== "function") {
      return unavailable("learning_automation_cycle_closure_proposal_service_unavailable");
    }
    if (!digestService || typeof digestService.createDigest !== "function") {
      return unavailable("learning_automation_cycle_closure_digest_service_unavailable");
    }

    const stages = [];
    const resolved = resolveSource(input, scope, stages);
    if (!resolved.ok) return terminal(resolved, stages);
    const selector = resolved.selector;
    const targetNodeIds = uniqueStrings(input.targetNodeIds || input.target_node_ids || selector.targetNodeIds);
    const base = Object.assign({}, scope, sourceCyclePayload(selector), {
      targetNodeIds,
      lowPressure: input.lowPressure !== undefined ? input.lowPressure : input.low_pressure !== undefined ? input.low_pressure : true,
      allowedCardRoles: input.allowedCardRoles || input.allowed_card_roles,
      requestedBy: scope.requestedBy,
      auditLimit: input.auditLimit || input.audit_limit || 20,
      limit: input.limit || 6
    });

    const proposal = await proposalService.createProposal(base);
    stages.push(publicStage("proposal_create", proposal));
    if (!proposal?.ok) {
      return terminal(unavailable(proposal?.error || "learning_automation_cycle_closure_proposal_failed", { proposal }), stages, {
        selectedCycleId: selector.cycleId,
        selectedTaskCardId: selector.taskCardId
      });
    }

    const proposalId = cleanString(proposal.proposal?.proposalId || proposal.proposalId);
    let proposalReview = null;
    const acceptProposal = input.acceptProposal !== false && input.accept_proposal !== false;
    const proposalDecision = cleanString(input.proposalDecision || input.proposal_decision || (acceptProposal ? "accepted" : ""));
    if (proposalDecision) {
      if (typeof proposalService.reviewProposal !== "function") {
        return terminal(unavailable("learning_automation_cycle_closure_proposal_review_unavailable"), stages);
      }
      proposalReview = proposalService.reviewProposal(Object.assign({}, scope, {
        proposalId,
        status: proposalDecision,
        reason: input.proposalReason || input.proposal_reason || "Owner prepared a supervised review packet from a completed cycle.",
        reviewedBy: scope.requestedBy
      }));
      stages.push(publicStage("proposal_review", proposalReview));
      if (!proposalReview?.ok) {
        return terminal(unavailable(proposalReview?.error || "learning_automation_cycle_closure_proposal_review_failed", { proposalReview }), stages, {
          selectedCycleId: selector.cycleId,
          proposalId
        });
      }
    }

    let digest = null;
    const createDigest = input.createDigest !== false && input.create_digest !== false;
    if (createDigest) {
      digest = digestService.createDigest(Object.assign({}, scope, sourceCyclePayload(selector), {
        proposalId,
        planDraftId: proposal.proposal?.planDraftId || proposal.planDraft?.planDraftId,
        selectedItemId: proposal.proposal?.selectedItemId || proposal.selectedItem?.itemId || proposal.selectedItem?.item_id,
        targetNodeIds,
        requestedBy: scope.requestedBy,
        auditLimit: input.auditLimit || input.audit_limit || 20,
        limit: input.limit || 6
      }));
      stages.push(publicStage("digest_create", digest));
      if (!digest?.ok) {
        return terminal(unavailable(digest?.error || "learning_automation_cycle_closure_digest_failed", { digest }), stages, {
          selectedCycleId: selector.cycleId,
          proposalId,
          proposalStatus: cleanString((proposalReview?.proposal || proposal.proposal || {}).status)
        });
      }
    }

    let digestReview = null;
    const reviewDigest = bool(input.reviewDigest || input.review_digest);
    const digestId = cleanString(digest?.digest?.digestId || input.digestId || input.digest_id);
    if (reviewDigest) {
      if (!digestId) return terminal(unavailable("learning_automation_cycle_closure_digest_id_required"), stages);
      if (typeof digestService.reviewDigest !== "function") {
        return terminal(unavailable("learning_automation_cycle_closure_digest_review_unavailable"), stages);
      }
      digestReview = digestService.reviewDigest(Object.assign({}, scope, {
        digestId,
        status: cleanString(input.digestReviewStatus || input.digest_review_status || "reviewed"),
        selectedCandidateIds: input.selectedCandidateIds || input.selected_candidate_ids,
        note: input.digestReviewNote || input.digest_review_note || "Owner reviewed supervised automation digest from cycle closure.",
        reviewedBy: scope.requestedBy
      }));
      stages.push(publicStage("digest_review", digestReview));
      if (!digestReview?.ok) {
        return terminal(unavailable(digestReview?.error || "learning_automation_cycle_closure_digest_review_failed", { digestReview }), stages, {
          selectedCycleId: selector.cycleId,
          proposalId,
          digestId
        });
      }
    }

    let handoff = null;
    const createHandoff = bool(input.createHandoff || input.create_handoff);
    if (createHandoff) {
      if (!actionHandoffService || typeof actionHandoffService.createHandoff !== "function") {
        return terminal(unavailable("learning_automation_cycle_closure_handoff_service_unavailable"), stages);
      }
      handoff = actionHandoffService.createHandoff(Object.assign({}, scope, {
        digestId,
        summary: input.handoffSummary || input.handoff_summary || "Owner requested action handoff from supervised cycle closure.",
        requestedBy: scope.requestedBy
      }));
      stages.push(publicStage("handoff_create", handoff));
      if (!handoff?.ok) {
        return terminal(unavailable(handoff?.error || "learning_automation_cycle_closure_handoff_failed", { handoff }), stages, {
          selectedCycleId: selector.cycleId,
          proposalId,
          digestId
        });
      }
    }

    let delivery = null;
    if (bool(input.deliverHandoff || input.deliver_handoff)) {
      if (!actionHandoffService || typeof actionHandoffService.deliverHandoff !== "function") {
        return terminal(unavailable("learning_automation_cycle_closure_handoff_delivery_unavailable"), stages);
      }
      const handoffId = cleanString(handoff?.handoff?.handoffId || input.handoffId || input.handoff_id);
      if (!handoffId) return terminal(unavailable("learning_automation_cycle_closure_handoff_id_required"), stages);
      delivery = await actionHandoffService.deliverHandoff(Object.assign({}, scope, {
        handoffId,
        requestedBy: scope.requestedBy
      }));
      stages.push(publicStage("handoff_deliver", delivery));
      if (!delivery?.ok) {
        return terminal(unavailable(delivery?.error || "learning_automation_cycle_closure_handoff_delivery_failed", { delivery }), stages);
      }
    }

    const finalDigest = digestReview?.digest || digest?.digest || null;
    const finalHandoff = delivery?.handoff || handoff?.handoff || null;
    return terminal({
      ok: true,
      status: cleanString(delivery?.deliveryStatus || finalHandoff?.deliveryStatus || finalDigest?.status || (digest ? "digest_pending" : "proposal_ready")),
      selectedCycle: selector,
      profileFeedback: resolved.profileFeedback,
      proposal: proposalReview?.proposal || proposal.proposal,
      digest: finalDigest,
      handoff: finalHandoff,
      delivery: delivery || null
    }, stages, {
      selectedCycleId: selector.cycleId,
      selectedTaskCardId: selector.taskCardId,
      proposalId,
      proposalStatus: cleanString((proposalReview?.proposal || proposal.proposal || {}).status),
      digestId: cleanString(finalDigest?.digestId),
      digestStatus: cleanString(finalDigest?.status),
      handoffId: cleanString(finalHandoff?.handoffId),
      handoffDeliveryStatus: cleanString(delivery?.deliveryStatus || finalHandoff?.deliveryStatus)
    });
  }

  return {
    prepareReviewPacket
  };
}

module.exports = {
  createLearningAutomationCycleClosureService,
  scanPrivacy
};
