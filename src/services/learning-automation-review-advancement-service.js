"use strict";

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function bool(value) {
  return value === true || ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function uniqueStrings(values = []) {
  const source = Array.isArray(values) ? values : String(values || "").split(",");
  return Array.from(new Set(source.map((value) => cleanString(value, 180)).filter(Boolean)));
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
    source: "growth-learning-automation-review-advancement-service",
    schemaVersion: "growth.learningAutomationReviewAdvancement.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "blocked",
    error: cleanString(error) || "learning_automation_review_advancement_unavailable",
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

function commonInput(input = {}, scope = {}) {
  return Object.assign({}, input, {
    workspaceId: scope.workspaceId,
    learnerId: scope.learnerId,
    programId: scope.programId,
    domainPackId: scope.domainPackId,
    domain: scope.domain,
    subject: scope.subject,
    horizon: scope.horizon,
    availableMinutes: scope.availableMinutes,
    requestedBy: scope.requestedBy,
    targetNodeIds: input.targetNodeIds || input.target_node_ids,
    sourceTargetNodeIds: input.sourceTargetNodeIds || input.source_target_node_ids,
    auditLimit: input.auditLimit || input.audit_limit || 20,
    limit: input.limit || 6
  });
}

function publicStage(name, result = {}, options = {}) {
  return {
    name,
    ok: options.ok !== undefined ? options.ok === true : result?.ok !== false,
    status: cleanString(options.status || result?.status || result?.deliveryStatus || result?.error || (result?.ok === false ? "failed" : "pass")),
    error: cleanString(result?.error),
    duplicate: result?.duplicate === true,
    expectedBlocked: options.expectedBlocked === true
  };
}

function firstActionFromHandoff(handoff = {}) {
  const action = asArray(handoff.actions).find((item = {}) => cleanString(item.proposalId || item.proposal_id)) || {};
  return {
    proposalId: cleanString(action.proposalId || action.proposal_id || handoff.proposalId || handoff.proposal_id),
    planDraftId: cleanString(action.planDraftId || action.plan_draft_id || handoff.planDraftId || handoff.plan_draft_id),
    selectedItemId: cleanString(action.selectedItemId || action.selected_item_id || action.itemId || action.item_id)
  };
}

function terminal(result = {}, stages = [], summary = {}) {
  const writeStageNames = new Set([
    "cycle_closure",
    "digest_review",
    "failure_policy_create",
    "failure_policy_review",
    "handoff_create",
    "handoff_deliver",
    "scheduler_execute"
  ]);
  const writesPerformed = stages.some((stage) => writeStageNames.has(stage.name));
  const execution = result.execution || null;
  const publishPerformed = result.publishPerformed === true
    || result.published === true
    || execution?.execution?.status === "published"
    || execution?.status === "published";
  const output = Object.assign({
    source: "growth-learning-automation-review-advancement-service",
    schemaVersion: "growth.learningAutomationReviewAdvancement.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    stages,
    summary: Object.assign({
      writesPerformed,
      publishPerformed,
      schedulerStarted: false,
      gatewayBoundary: "cycle_closure_proposal_creation_may_call_planner_gateway_only"
    }, summary, {
      writesPerformed,
      publishPerformed,
      schedulerStarted: false
    }),
    writesPerformed,
    publishPerformed,
    schedulerStarted: false
  }, result, {
    writesPerformed,
    publishPerformed,
    schedulerStarted: false
  });
  const privacyFindings = scanPrivacy(output);
  if (privacyFindings.length) {
    return unavailable("learning_automation_review_advancement_output_privacy_failed", { privacyFindings });
  }
  return output;
}

function digestIdFrom(input = {}, closure = {}) {
  return cleanString(
    input.digestId ||
    input.digest_id ||
    closure.summary?.digestId ||
    closure.digest?.digestId ||
    closure.digest?.digest_id
  );
}

function proposalIdFrom(input = {}, closure = {}, handoff = {}) {
  const action = firstActionFromHandoff(handoff);
  return cleanString(
    input.proposalId ||
    input.proposal_id ||
    closure.summary?.proposalId ||
    closure.proposal?.proposalId ||
    closure.proposal?.proposal_id ||
    action.proposalId
  );
}

function createLearningAutomationReviewAdvancementService(options = {}) {
  const cycleClosureService = options.cycleClosureService || null;
  const digestService = options.digestService || null;
  const failurePolicyService = options.failurePolicyService || null;
  const actionHandoffService = options.actionHandoffService || null;
  const schedulerExecutionService = options.schedulerExecutionService || null;

  async function advance(input = {}) {
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) {
      return unavailable("learning_automation_review_advancement_privacy_failed", { privacyFindings });
    }
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_review_advancement_scope_required");
    if (!digestService || typeof digestService.reviewDigest !== "function") {
      return unavailable("learning_automation_review_advancement_digest_service_unavailable");
    }
    if (!failurePolicyService || typeof failurePolicyService.evaluateReadiness !== "function") {
      return unavailable("learning_automation_review_advancement_failure_policy_unavailable");
    }
    if (!actionHandoffService || typeof actionHandoffService.createHandoff !== "function") {
      return unavailable("learning_automation_review_advancement_handoff_service_unavailable");
    }

    const stages = [];
    const prepareReviewPacket = input.prepareReviewPacket !== false && input.prepare_review_packet !== false;
    let closure = null;
    if (prepareReviewPacket) {
      if (!cycleClosureService || typeof cycleClosureService.prepareReviewPacket !== "function") {
        return terminal(unavailable("learning_automation_review_advancement_cycle_closure_unavailable"), stages);
      }
      closure = await cycleClosureService.prepareReviewPacket(Object.assign(commonInput(input, scope), {
        acceptProposal: input.acceptProposal !== undefined ? input.acceptProposal : input.accept_proposal !== undefined ? input.accept_proposal : true,
        createDigest: true,
        reviewDigest: false,
        createHandoff: false,
        deliverHandoff: false,
        autoSelectCompletedCycle: input.autoSelectCompletedCycle || input.auto_select_completed_cycle,
        autoSelectLatestCompletedCycle: input.autoSelectLatestCompletedCycle !== false && input.auto_select_latest_completed_cycle !== false
      }));
      stages.push(publicStage("cycle_closure", closure));
      if (!closure?.ok) {
        return terminal(unavailable(closure?.error || "learning_automation_review_advancement_cycle_closure_failed", { cycleClosure: closure }), stages);
      }
    }

    const digestId = digestIdFrom(input, closure || {});
    if (!digestId) {
      return terminal(unavailable("learning_automation_review_advancement_digest_id_required"), stages, {
        proposalId: proposalIdFrom(input, closure || {})
      });
    }

    let digestReview = null;
    const reviewDigest = input.reviewDigest !== false && input.review_digest !== false;
    if (reviewDigest) {
      digestReview = digestService.reviewDigest(Object.assign(commonInput(input, scope), {
        digestId,
        status: cleanString(input.digestReviewStatus || input.digest_review_status || "reviewed"),
        selectedCandidateIds: input.selectedCandidateIds || input.selected_candidate_ids,
        note: input.digestReviewNote || input.digest_review_note || "Owner advanced supervised automation digest review.",
        reason: input.digestReviewReason || input.digest_review_reason || "Owner advanced supervised automation digest review.",
        reviewedBy: scope.requestedBy
      }));
      stages.push(publicStage("digest_review", digestReview));
      if (!digestReview?.ok) {
        return terminal(unavailable(digestReview?.error || "learning_automation_review_advancement_digest_review_failed", { digestReview }), stages, {
          digestId
        });
      }
    }

    let policyReadiness = failurePolicyService.evaluateReadiness(commonInput(input, scope));
    stages.push(publicStage("failure_policy_readiness", policyReadiness));
    if (!policyReadiness?.ok) {
      return terminal(unavailable(policyReadiness?.error || "learning_automation_review_advancement_failure_policy_readiness_failed", { policyReadiness }), stages, {
        digestId,
        digestStatus: cleanString(digestReview?.digest?.status)
      });
    }

    let policy = policyReadiness.policy || null;
    const ensureFailurePolicy = input.ensureFailurePolicy !== false && input.ensure_failure_policy !== false;
    if (policyReadiness.readyForWritefulAutomationPrerequisite !== true && ensureFailurePolicy) {
      if (typeof failurePolicyService.createPolicy !== "function" || typeof failurePolicyService.reviewPolicy !== "function") {
        return terminal(unavailable("learning_automation_review_advancement_failure_policy_write_unavailable", { policyReadiness }), stages);
      }
      const createdPolicy = failurePolicyService.createPolicy(Object.assign(commonInput(input, scope), {
        policyVersion: "growth.learningAutomationFailurePolicy.v1",
        policy: {
          schemaVersion: "growth.learningAutomationPolicy.v1",
          summaryOnly: true,
          ownerReviewRequired: true,
          digestReviewRequired: true,
          actionHandoffRequiredBeforeScheduling: true,
          writefulSchedulingAllowed: false
        },
        failurePolicy: {
          schemaVersion: "growth.learningAutomationFailurePolicy.failure.v1",
          summaryOnly: true,
          visibleFailureRequired: true,
          ownerReviewRequired: true,
          retryRequiresOwner: true,
          maxAutomaticRetries: 0,
          writefulSchedulingAllowed: false
        },
        createdBy: scope.requestedBy
      }));
      stages.push(publicStage("failure_policy_create", createdPolicy));
      if (!createdPolicy?.ok) {
        return terminal(unavailable(createdPolicy?.error || "learning_automation_review_advancement_failure_policy_create_failed", { createdPolicy }), stages, { digestId });
      }
      const policyId = cleanString(createdPolicy.policy?.policyId || createdPolicy.policy?.policy_id);
      const reviewedPolicy = failurePolicyService.reviewPolicy(Object.assign(commonInput(input, scope), {
        policyId,
        status: "active",
        reason: input.failurePolicyReviewReason || input.failure_policy_review_reason || "Owner activated supervised automation failure policy during review advancement.",
        note: input.failurePolicyReviewNote || input.failure_policy_review_note || "Visible failure and Owner retry policy activated.",
        reviewedBy: scope.requestedBy
      }));
      stages.push(publicStage("failure_policy_review", reviewedPolicy));
      if (!reviewedPolicy?.ok) {
        return terminal(unavailable(reviewedPolicy?.error || "learning_automation_review_advancement_failure_policy_review_failed", { reviewedPolicy }), stages, { digestId, policyId });
      }
      policyReadiness = reviewedPolicy.readiness || failurePolicyService.evaluateReadiness(commonInput(input, scope));
      policy = reviewedPolicy.policy || policyReadiness.policy || null;
      if (policyReadiness.readyForWritefulAutomationPrerequisite !== true) {
        return terminal(unavailable("learning_automation_review_advancement_failure_policy_not_ready", { policyReadiness }), stages, {
          digestId,
          policyId: cleanString(policy?.policyId || policy?.policy_id)
        });
      }
    } else if (policyReadiness.readyForWritefulAutomationPrerequisite !== true) {
      return terminal(unavailable("learning_automation_review_advancement_failure_policy_not_ready", { policyReadiness }), stages, {
        digestId
      });
    }

    let handoff = null;
    const createHandoff = input.createHandoff !== false && input.create_handoff !== false;
    if (createHandoff) {
      handoff = actionHandoffService.createHandoff(Object.assign(commonInput(input, scope), {
        digestId,
        summary: input.handoffSummary || input.handoff_summary || `Owner advanced supervised automation handoff for digest ${digestId}.`,
        requestedBy: scope.requestedBy
      }));
      stages.push(publicStage("handoff_create", handoff));
      if (!handoff?.ok) {
        return terminal(unavailable(handoff?.error || "learning_automation_review_advancement_handoff_create_failed", { handoff }), stages, {
          digestId,
          policyId: cleanString(policy?.policyId || policy?.policy_id)
        });
      }
    }

    let delivery = null;
    const deliverHandoff = bool(input.deliverHandoff || input.deliver_handoff);
    if (deliverHandoff) {
      if (typeof actionHandoffService.deliverHandoff !== "function") {
        return terminal(unavailable("learning_automation_review_advancement_handoff_delivery_unavailable"), stages);
      }
      const handoffId = cleanString(handoff?.handoff?.handoffId || input.handoffId || input.handoff_id);
      if (!handoffId) return terminal(unavailable("learning_automation_review_advancement_handoff_id_required"), stages);
      delivery = await actionHandoffService.deliverHandoff(Object.assign(commonInput(input, scope), {
        handoffId,
        requestedBy: scope.requestedBy
      }));
      stages.push(publicStage("handoff_deliver", delivery));
      if (!delivery?.ok) {
        return terminal(unavailable(delivery?.error || "learning_automation_review_advancement_handoff_delivery_failed", { delivery }), stages);
      }
    }

    let execution = null;
    const attemptExecution = bool(input.attemptExecution || input.attempt_execution);
    if (attemptExecution) {
      if (!schedulerExecutionService || typeof schedulerExecutionService.executeOnce !== "function") {
        return terminal(unavailable("learning_automation_review_advancement_scheduler_execution_unavailable"), stages);
      }
      const finalHandoff = delivery?.handoff || handoff?.handoff || {};
      const action = firstActionFromHandoff(finalHandoff);
      const proposalId = proposalIdFrom(input, closure || {}, finalHandoff);
      const handoffId = cleanString(finalHandoff.handoffId || input.handoffId || input.handoff_id);
      execution = await schedulerExecutionService.executeOnce(Object.assign(commonInput(input, scope), {
        handoffId,
        digestId,
        proposalId,
        planDraftId: cleanString(input.planDraftId || input.plan_draft_id || action.planDraftId),
        selectedItemId: cleanString(input.selectedItemId || input.selected_item_id || action.selectedItemId),
        executionMode: "owner_explicit_once",
        requestedBy: scope.requestedBy
      }));
      const expectedBlocked = execution?.error === "learning_automation_scheduler_execution_disabled";
      stages.push(publicStage("scheduler_execute", execution, {
        ok: execution?.ok !== false || expectedBlocked,
        status: expectedBlocked ? "blocked_default_disabled" : undefined,
        expectedBlocked
      }));
      if (execution?.ok === false && !expectedBlocked) {
        return terminal(unavailable(execution?.error || "learning_automation_review_advancement_scheduler_execution_failed", { execution }), stages);
      }
    }

    const finalDigest = digestReview?.digest || closure?.digest || null;
    const finalHandoff = delivery?.handoff || handoff?.handoff || null;
    const finalPolicy = policy || policyReadiness.policy || null;
    const executionStatus = cleanString(execution?.execution?.status || execution?.status);
    const status = executionStatus === "published"
      ? "published"
      : executionStatus === "blocked"
        ? "execution_blocked"
        : cleanString(delivery?.deliveryStatus || finalHandoff?.deliveryStatus || finalHandoff?.status || finalDigest?.status || "handoff_ready");
    return terminal({
      ok: true,
      status,
      cycleClosure: closure,
      digest: finalDigest,
      failurePolicy: finalPolicy,
      failurePolicyReadiness: policyReadiness,
      handoff: finalHandoff,
      delivery,
      execution
    }, stages, {
      selectedCycleId: cleanString(closure?.summary?.selectedCycleId || closure?.selectedCycle?.cycleId || input.cycleId || input.cycle_id),
      selectedTaskCardId: cleanString(closure?.summary?.selectedTaskCardId || closure?.selectedCycle?.taskCardId || input.sourceTaskCardId || input.source_task_card_id),
      proposalId: proposalIdFrom(input, closure || {}, finalHandoff || {}),
      proposalStatus: cleanString(closure?.summary?.proposalStatus || closure?.proposal?.status),
      digestId,
      digestStatus: cleanString(finalDigest?.status),
      policyId: cleanString(finalPolicy?.policyId || finalPolicy?.policy_id || policyReadiness?.summary?.policyId),
      policyStatus: cleanString(finalPolicy?.status || policyReadiness?.status),
      handoffId: cleanString(finalHandoff?.handoffId || finalHandoff?.handoff_id),
      handoffDeliveryStatus: cleanString(delivery?.deliveryStatus || finalHandoff?.deliveryStatus || finalHandoff?.delivery_status),
      executionId: cleanString(execution?.execution?.executionId || execution?.execution?.execution_id),
      executionStatus
    });
  }

  return {
    advance
  };
}

module.exports = {
  createLearningAutomationReviewAdvancementService,
  scanPrivacy
};
