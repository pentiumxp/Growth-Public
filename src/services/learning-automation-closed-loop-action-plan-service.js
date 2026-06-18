"use strict";

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function uniqueStrings(values = []) {
  const source = Array.isArray(values) ? values : String(values || "").split(",");
  return Array.from(new Set(source.map((value) => cleanString(value, 160)).filter(Boolean)));
}

function bool(value, fallback = false) {
  if (value === true || value === false) return value;
  const text = String(value || "").trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(text)) return true;
  if (["0", "false", "no", "off"].includes(text)) return false;
  return fallback;
}

function boundedNumber(value, fallback = 0, min = 0, max = 100) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numeric)));
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

function publicTarget(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id, 140);
  return {
    workspaceId,
    learnerId: cleanString(input.learnerId || input.learner_id || workspaceId, 140),
    displayName: cleanString(input.displayName || input.display_name || input.label, 120),
    label: cleanString(input.label || input.displayName || input.display_name, 120)
  };
}

function publicScope(input = {}) {
  return {
    programId: cleanString(input.programId || input.program_id, 140),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id, 160),
    domain: cleanString(input.domain, 100),
    subject: cleanString(input.subject, 100),
    horizon: cleanString(input.horizon || "daily_plan", 80) || "daily_plan",
    availableMinutes: boundedNumber(input.availableMinutes || input.available_minutes, 15, 1, 60),
    targetNodeIds: uniqueStrings(input.targetNodeIds || input.target_node_ids || input.nodeIds || input.node_ids).slice(0, 12),
    sourceTargetNodeIds: uniqueStrings(input.sourceTargetNodeIds || input.source_target_node_ids).slice(0, 12),
    capabilityClusterId: cleanString(input.capabilityClusterId || input.capability_cluster_id, 140),
    assessmentCoverageNodeIds: uniqueStrings(
      input.assessmentCoverageNodeIds
        || input.assessment_coverage_node_ids
        || input.assessmentCoverage
        || input.assessment_coverage
    ).slice(0, 12)
  };
}

function publicInput(input = {}) {
  const target = publicTarget(input);
  const scope = publicScope(input);
  return Object.assign({}, target, scope, {
    cycleId: cleanString(input.cycleId || input.cycle_id, 160),
    sourcePlanDraftId: cleanString(input.sourcePlanDraftId || input.source_plan_draft_id || input.planDraftId || input.plan_draft_id, 160),
    sourceTaskCardId: cleanString(input.sourceTaskCardId || input.source_task_card_id || input.taskCardId || input.task_card_id, 160),
    sourceEvaluationId: cleanString(input.sourceEvaluationId || input.source_evaluation_id || input.evaluationId || input.evaluation_id, 160),
    profileDeltaId: cleanString(input.profileDeltaId || input.profile_delta_id, 160),
    evidenceId: cleanString(input.evidenceId || input.evidence_id, 160),
    correctionId: cleanString(input.correctionId || input.correction_id, 160),
    sourceId: cleanString(input.sourceId || input.source_id, 160),
    digestId: cleanString(input.digestId || input.digest_id, 160),
    handoffId: cleanString(input.handoffId || input.handoff_id, 160),
    proposalId: cleanString(input.proposalId || input.proposal_id, 160),
    selectedItemId: cleanString(input.selectedItemId || input.selected_item_id || input.itemId || input.item_id, 160),
    autoSelectCompletedCycle: bool(input.autoSelectCompletedCycle || input.auto_select_completed_cycle, false),
    autoSelectLatestCompletedCycle: bool(
      input.autoSelectLatestCompletedCycle !== undefined ? input.autoSelectLatestCompletedCycle : input.auto_select_latest_completed_cycle,
      true
    ),
    limit: boundedNumber(input.limit, 8, 1, 50),
    auditLimit: boundedNumber(input.auditLimit || input.audit_limit, 20, 1, 100),
    requestedBy: cleanString(input.requestedBy || input.requested_by, 140)
  });
}

function unavailablePhase(key, error, label) {
  return {
    key,
    label: label || key,
    ok: false,
    status: "unavailable",
    error: cleanString(error || `${key}_unavailable`, 180)
  };
}

function callService(service, methodName, input, phaseKey, label) {
  if (!service || typeof service[methodName] !== "function") {
    return unavailablePhase(phaseKey, `${phaseKey}_service_unavailable`, label);
  }
  try {
    const result = service[methodName](input);
    return result && typeof result === "object" ? result : unavailablePhase(phaseKey, `${phaseKey}_invalid_result`, label);
  } catch (error) {
    return unavailablePhase(phaseKey, error && error.message ? error.message : error, label);
  }
}

function selectedCompletedCycleFrom(feedback = {}, input = {}) {
  const selected = objectOnly(feedback.selectedCompletedCycle || feedback.autoSelection?.selected);
  const summary = objectOnly(feedback.summary);
  const scope = objectOnly(feedback.scope);
  const cycleId = cleanString(selected.cycleId || summary.selectedCycleId || input.cycleId);
  const taskCardId = cleanString(selected.taskCardId || summary.selectedTaskCardId || scope.taskCardId || input.sourceTaskCardId || input.taskCardId);
  const selector = {
    cycleId,
    status: cleanString(selected.status),
    latestActivityAt: cleanString(selected.latestActivityAt),
    planDraftId: cleanString(selected.planDraftId || scope.planDraftId || input.sourcePlanDraftId || input.planDraftId),
    taskCardId,
    evaluationId: cleanString(selected.evaluationId || scope.evaluationId || input.sourceEvaluationId || input.evaluationId),
    profileDeltaId: cleanString(selected.profileDeltaId || scope.profileDeltaId || input.profileDeltaId),
    evidenceId: cleanString(selected.evidenceId || scope.evidenceId || input.evidenceId),
    correctionId: cleanString(scope.correctionId || input.correctionId),
    sourceId: cleanString(selected.sourceId || scope.sourceId || input.sourceId),
    targetNodeIds: uniqueStrings(selected.targetNodeIds || scope.targetNodeIds || input.sourceTargetNodeIds || input.targetNodeIds).slice(0, 12),
    complete: selected.complete === true || feedback.complete === true || summary.cycleComplete === true,
    readyForAutomation: selected.readyForAutomation === true || feedback.readyForAutomation === true
  };
  return selector.cycleId || selector.taskCardId || selector.evaluationId || selector.profileDeltaId || selector.evidenceId || selector.planDraftId
    ? selector
    : null;
}

function summarizeProfileFeedback(feedback = {}, input = {}) {
  const summary = objectOnly(feedback.summary);
  const selector = selectedCompletedCycleFrom(feedback, input);
  const missingRequired = uniqueStrings(summary.missingRequired).slice(0, 12);
  return {
    key: "profile_feedback",
    label: "Completed-cycle profile feedback",
    ok: feedback.ok === true,
    status: cleanString(feedback.status || feedback.error || "missing"),
    readyForAutomation: feedback.readyForAutomation === true,
    readyForNextPlan: feedback.readyForNextPlan === true || summary.readyForNextPlan === true,
    selectedCycle: selector,
    missingRequired,
    nextAction: cleanString(summary.nextAction, 140),
    selectorDiscoveryStatus: cleanString(summary.selectorDiscoveryStatus || feedback.selectorDiscovery?.status, 120),
    autoSelectionStatus: cleanString(summary.autoSelectionStatus || feedback.autoSelection?.status, 120),
    candidateCount: boundedNumber(summary.selectorCandidateCount || feedback.selectorDiscovery?.candidateCount, 0, 0, 100),
    checkCount: asArray(feedback.checks).length,
    passCheckCount: asArray(feedback.checks).filter((item) => item?.status === "pass").length
  };
}

function summarizeOperatingLoop(result = {}) {
  const summary = objectOnly(result.summary);
  const nextAction = objectOnly(result.nextAction || result.state?.nextAction);
  return {
    key: "operating_loop",
    label: "Learning operating-loop next action",
    ok: result.ok === true,
    status: cleanString(result.status || result.error || "unknown"),
    nextAction: cleanString(nextAction.action || summary.nextAction, 140),
    nextActionEnabled: nextAction.enabled !== false && summary.nextActionEnabled !== false,
    nextActionEndpoint: cleanString(nextAction.endpoint, 220),
    readyForDraft: summary.readyForDraft === true,
    readyForPublish: summary.readyForPublish === true,
    auditComplete: summary.auditComplete === true,
    recommendationEvidenceReady: summary.recommendationEvidenceReady === true,
    error: result.ok === false ? cleanString(result.error, 180) : ""
  };
}

function pickDigest(digestResult = {}, input = {}) {
  const explicitDigestId = cleanString(input.digestId);
  const digests = asArray(digestResult.digests);
  if (explicitDigestId) {
    return digests.find((item) => cleanString(item && item.digestId) === explicitDigestId) || null;
  }
  if (digests[0]) return digests[0];
  const digest = objectOnly(digestResult.digest);
  return Object.keys(digest).length ? digest : null;
}

function summarizeDigest(result = {}, input = {}) {
  const digest = pickDigest(result, input);
  return {
    key: "automation_digest",
    label: "Automation digest",
    ok: result.ok === true,
    status: digest ? cleanString(digest.status || "present", 120) : (result.ok === false ? cleanString(result.error, 160) : "missing"),
    count: boundedNumber(result.count || asArray(result.digests).length, digest ? 1 : 0, 0, 100),
    digest: digest ? {
      digestId: cleanString(digest.digestId, 160),
      status: cleanString(digest.status, 120),
      proposalId: cleanString(digest.proposalId, 160),
      summary: {
        requiredActions: boundedNumber(digest.summary?.requiredActions, asArray(digest.requiredActions).length, 0, 100),
        wouldPublish: boundedNumber(digest.summary?.wouldPublish, 0, 0, 100),
        blocked: boundedNumber(digest.summary?.blocked, asArray(digest.blocked).length, 0, 100)
      }
    } : null,
    error: result.ok === false ? cleanString(result.error, 180) : ""
  };
}

function pickHandoff(handoffResult = {}, input = {}, digestId = "") {
  const explicitHandoffId = cleanString(input.handoffId);
  const handoffs = asArray(handoffResult.handoffs);
  if (explicitHandoffId) {
    return handoffs.find((item) => cleanString(item && item.handoffId) === explicitHandoffId) || objectOnly(handoffResult.handoff);
  }
  if (digestId) {
    const matched = handoffs.find((item) => cleanString(item && item.digestId) === digestId);
    if (matched) return matched;
  }
  if (handoffs[0]) return handoffs[0];
  const handoff = objectOnly(handoffResult.handoff);
  return Object.keys(handoff).length ? handoff : null;
}

function summarizeHandoff(result = {}, input = {}, digestId = "") {
  const handoff = pickHandoff(result, input, digestId);
  return {
    key: "action_handoff",
    label: "Automation action handoff",
    ok: result.ok === true,
    status: handoff ? cleanString(handoff.status || "present", 120) : (result.ok === false ? cleanString(result.error, 160) : "missing"),
    count: boundedNumber(result.count || asArray(result.handoffs).length, handoff ? 1 : 0, 0, 100),
    handoff: handoff ? {
      handoffId: cleanString(handoff.handoffId, 160),
      digestId: cleanString(handoff.digestId, 160),
      status: cleanString(handoff.status, 120),
      deliveryStatus: cleanString(handoff.deliveryStatus || "not_delivered", 120),
      requiredActionCount: boundedNumber(handoff.actionSummary?.requiredActions, asArray(handoff.actions).length, 0, 100),
      blockedCount: boundedNumber(handoff.actionSummary?.blocked, asArray(handoff.blocked).length, 0, 100)
    } : null,
    error: result.ok === false ? cleanString(result.error, 180) : ""
  };
}

function summarizeFailurePolicy(result = {}) {
  const summary = objectOnly(result.summary);
  const policy = objectOnly(result.policy);
  return {
    key: "failure_policy",
    label: "Failure policy readiness",
    ok: result.ok === true,
    status: cleanString(result.status || result.error || "missing"),
    readyForWritefulAutomationPrerequisite: result.readyForWritefulAutomationPrerequisite === true
      || summary.readyForWritefulAutomationPrerequisite === true,
    policyId: cleanString(summary.policyId || policy.policyId, 160),
    writefulSchedulingAllowed: result.writefulSchedulingAllowed === true || summary.writefulSchedulingAllowed === true,
    error: result.ok === false ? cleanString(result.error, 180) : ""
  };
}

function baseActionBody(input = {}) {
  return {
    workspace_id: input.workspaceId,
    learner_id: input.learnerId,
    program_id: input.programId,
    domain_pack_id: input.domainPackId,
    domain: input.domain,
    subject: input.subject,
    horizon: input.horizon,
    available_minutes: input.availableMinutes,
    target_node_ids: input.targetNodeIds,
    requested_by: input.requestedBy
  };
}

function completedCycleBody(input = {}, cycle = {}) {
  return Object.assign(baseActionBody(input), {
    cycle_id: cleanString(cycle.cycleId || input.cycleId),
    source_plan_draft_id: cleanString(cycle.planDraftId || input.sourcePlanDraftId),
    source_task_card_id: cleanString(cycle.taskCardId || input.sourceTaskCardId),
    source_evaluation_id: cleanString(cycle.evaluationId || input.sourceEvaluationId),
    profile_delta_id: cleanString(cycle.profileDeltaId || input.profileDeltaId),
    evidence_id: cleanString(cycle.evidenceId || input.evidenceId),
    correction_id: cleanString(cycle.correctionId || input.correctionId),
    source_id: cleanString(cycle.sourceId || input.sourceId),
    source_target_node_ids: uniqueStrings(cycle.targetNodeIds || input.sourceTargetNodeIds).slice(0, 12),
    auto_select_latest_completed_cycle: input.autoSelectLatestCompletedCycle === true
  });
}

function actionTemplate(key, title, routePath, method, body, extra = {}) {
  return Object.assign({
    key,
    title,
    routePath,
    method,
    ownerOnly: true,
    writeRequired: method !== "GET",
    body
  }, extra);
}

function buildActionTemplates(input = {}, selectedCycle = {}, digest = {}, handoff = {}) {
  const closureBody = Object.assign(completedCycleBody(input, selectedCycle), {
    accept_proposal: true,
    create_digest: true,
    review_digest: false,
    create_handoff: false,
    deliver_handoff: false
  });
  const advancementBody = Object.assign(completedCycleBody(input, selectedCycle), {
    digest_id: cleanString(digest.digestId || input.digestId),
    proposal_id: cleanString(digest.proposalId || input.proposalId),
    prepare_review_packet: !cleanString(digest.digestId || input.digestId),
    review_digest: true,
    ensure_failure_policy: true,
    create_handoff: true,
    deliver_handoff: false,
    attempt_execution: false
  });
  const handoffId = cleanString(handoff.handoffId || input.handoffId);
  return {
    runLearningLoopNext: actionTemplate(
      "run_learning_loop_next",
      "Run the current learning-loop next action",
      "/api/v1/growth/learning-loop/advance",
      "POST",
      Object.assign(baseActionBody(input), { action: "run_next" })
    ),
    prepareCycleClosure: actionTemplate(
      "prepare_cycle_closure",
      "Prepare completed-cycle review packet",
      "/api/v1/growth/automation/cycle-closures/prepare",
      "POST",
      closureBody
    ),
    advanceReview: actionTemplate(
      "advance_review",
      "Review digest and create action handoff",
      "/api/v1/growth/automation/review-advancements/advance",
      "POST",
      advancementBody
    ),
    deliverActionHandoff: actionTemplate(
      "deliver_action_handoff",
      "Deliver action handoff to Home AI",
      handoffId ? `/api/v1/growth/automation/action-handoffs/${encodeURIComponent(handoffId)}/deliver` : "/api/v1/growth/automation/action-handoffs/{handoffId}/deliver",
      "POST",
      Object.assign(baseActionBody(input), {
        handoff_id: handoffId,
        digest_id: cleanString(handoff.digestId || digest.digestId || input.digestId)
      }),
      { requiredSelectors: handoffId ? [] : ["handoff_id"] }
    ),
    collectPlatformActionEvidence: actionTemplate(
      "collect_platform_action_evidence",
      "Read platform action evidence",
      "/api/v1/growth/automation/platform-action-evidence",
      "GET",
      Object.assign(baseActionBody(input), {
        handoff_id: handoffId,
        digest_id: cleanString(handoff.digestId || digest.digestId || input.digestId)
      }),
      { writeRequired: false }
    )
  };
}

function actionFromState({ input, operatingLoop, profileFeedback, digestPhase, handoffPhase, failurePolicyPhase, templates }) {
  const selectedCycle = profileFeedback.selectedCycle;
  const digest = digestPhase.digest;
  const handoff = handoffPhase.handoff;
  const handoffDelivery = cleanString(handoff?.deliveryStatus);
  if (handoff?.handoffId && handoffDelivery !== "delivered") {
    return Object.assign({}, templates.deliverActionHandoff, {
      status: "ready_for_action_handoff_delivery",
      reason: "A reviewed action handoff exists and still needs explicit delivery."
    });
  }
  if (digest?.digestId && (
    cleanString(digest.status) !== "reviewed"
    || failurePolicyPhase.readyForWritefulAutomationPrerequisite !== true
    || !handoff?.handoffId
  )) {
    return Object.assign({}, templates.advanceReview, {
      status: "ready_for_review_advancement",
      reason: "A digest exists, but review advancement still needs digest review, failure policy readiness, or handoff creation."
    });
  }
  if (selectedCycle?.readyForAutomation && !digest?.digestId) {
    return Object.assign({}, templates.prepareCycleClosure, {
      status: "ready_for_cycle_closure",
      reason: "The latest completed learner cycle is ready for automation review-packet preparation."
    });
  }
  if (handoff?.handoffId && handoffDelivery === "delivered") {
    return Object.assign({}, templates.collectPlatformActionEvidence, {
      status: "ready_for_platform_action_evidence",
      reason: "The action handoff is delivered; collect platform action evidence before treating the automation leg as complete."
    });
  }
  if (operatingLoop.nextAction && operatingLoop.nextActionEnabled !== false) {
    return Object.assign({}, templates.runLearningLoopNext, {
      status: "ready_for_next_learning_action",
      reason: `Learning operating loop recommends ${operatingLoop.nextAction}.`,
      body: Object.assign({}, templates.runLearningLoopNext.body, {
        action: operatingLoop.nextAction
      })
    });
  }
  if (!selectedCycle?.readyForAutomation) {
    return {
      key: "complete_learner_cycle",
      title: "Complete one learner cycle",
      status: "learner_cycle_required",
      reason: "No completed, automation-ready learner cycle is available yet.",
      ownerOnly: false,
      writeRequired: false,
      requiredSelectors: ["completed daily card submission", "one evaluation", "one reflection"],
      routePath: "",
      method: "",
      body: {}
    };
  }
  return {
    key: "refresh_closed_loop_context",
    title: "Refresh closed-loop context",
    status: "blocked",
    reason: "The closed-loop action plan could not derive a safe next action from current summary readbacks.",
    ownerOnly: true,
    writeRequired: false,
    requiredSelectors: [],
    routePath: "",
    method: "",
    body: Object.assign(baseActionBody(input), { limit: input.limit })
  };
}

function createLearningAutomationClosedLoopActionPlanService(options = {}) {
  const operatingLoopService = options.operatingLoopService || options.learningOperatingLoopService || null;
  const profileFeedbackService = options.profileFeedbackService || options.learningProfileFeedbackEvidenceService || null;
  const digestService = options.digestService || options.learningAutomationDigestService || null;
  const actionHandoffService = options.actionHandoffService || options.learningAutomationActionHandoffService || null;
  const failurePolicyService = options.failurePolicyService || options.learningAutomationFailurePolicyService || null;

  function actionPlan(rawInput = {}) {
    const input = publicInput(rawInput);
    if (!input.workspaceId) {
      return {
        ok: false,
        source: "growth-learning-automation-closed-loop-action-plan-service",
        schemaVersion: "growth.learningAutomationClosedLoopActionPlan.v1",
        privacyClass: "summary_only",
        summaryOnly: true,
        status: "blocked",
        error: "closed_loop_action_plan_workspace_required",
        writePerformed: false,
        writesPerformed: false,
        publishPerformed: false,
        schedulerStarted: false
      };
    }
    const inputPrivacyFindings = scanPrivacy(rawInput);
    if (inputPrivacyFindings.length) {
      return {
        ok: false,
        source: "growth-learning-automation-closed-loop-action-plan-service",
        schemaVersion: "growth.learningAutomationClosedLoopActionPlan.v1",
        privacyClass: "summary_only",
        summaryOnly: true,
        status: "blocked",
        error: "closed_loop_action_plan_privacy_failed",
        privacyFindings: inputPrivacyFindings,
        writePerformed: false,
        writesPerformed: false,
        publishPerformed: false,
        schedulerStarted: false
      };
    }

    const serviceInput = Object.assign({}, input, {
      autoSelectCompletedCycle: input.autoSelectCompletedCycle,
      autoSelectLatestCompletedCycle: input.autoSelectLatestCompletedCycle
    });
    const operatingResult = callService(operatingLoopService, "recommend", serviceInput, "operating_loop", "Learning operating-loop next action");
    const feedbackResult = callService(profileFeedbackService, "evaluate", serviceInput, "profile_feedback", "Completed-cycle profile feedback");
    const digestResult = input.digestId && digestService && typeof digestService.getDigest === "function"
      ? callService(digestService, "getDigest", serviceInput, "automation_digest", "Automation digest")
      : callService(digestService, "listDigests", serviceInput, "automation_digest", "Automation digest");
    const selectedCycle = selectedCompletedCycleFrom(feedbackResult, input) || {};
    const digestPhase = summarizeDigest(digestResult, input);
    const digestId = cleanString(digestPhase.digest?.digestId || input.digestId);
    const handoffInput = Object.assign({}, serviceInput, { digestId });
    const handoffResult = input.handoffId && actionHandoffService && typeof actionHandoffService.getHandoff === "function"
      ? callService(actionHandoffService, "getHandoff", handoffInput, "action_handoff", "Automation action handoff")
      : callService(actionHandoffService, "listHandoffs", handoffInput, "action_handoff", "Automation action handoff");
    const failurePolicyResult = callService(failurePolicyService, "evaluateReadiness", serviceInput, "failure_policy", "Failure policy readiness");

    const operatingLoop = summarizeOperatingLoop(operatingResult);
    const profileFeedback = summarizeProfileFeedback(feedbackResult, input);
    const handoffPhase = summarizeHandoff(handoffResult, input, digestId);
    const failurePolicyPhase = summarizeFailurePolicy(failurePolicyResult);
    const templates = buildActionTemplates(input, selectedCycle, digestPhase.digest || {}, handoffPhase.handoff || {});
    const nextAction = actionFromState({
      input,
      operatingLoop,
      profileFeedback,
      digestPhase,
      handoffPhase,
      failurePolicyPhase,
      templates
    });
    const phases = [
      operatingLoop,
      profileFeedback,
      digestPhase,
      failurePolicyPhase,
      handoffPhase
    ];
    const dependencyBlocked = phases.filter((phase) => phase.ok === false && phase.status === "unavailable");
    const result = {
      ok: true,
      source: "growth-learning-automation-closed-loop-action-plan-service",
      schemaVersion: "growth.learningAutomationClosedLoopActionPlan.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      status: nextAction.status || "ready",
      target: publicTarget(input),
      scope: publicScope(input),
      selectedCycle: profileFeedback.selectedCycle || null,
      phases,
      nextAction,
      actionTemplates: templates,
      automationReadiness: {
        completedCycleReady: profileFeedback.selectedCycle?.readyForAutomation === true,
        digestPresent: Boolean(digestPhase.digest?.digestId),
        digestReviewed: digestPhase.digest?.status === "reviewed",
        failurePolicyReady: failurePolicyPhase.readyForWritefulAutomationPrerequisite === true,
        handoffPresent: Boolean(handoffPhase.handoff?.handoffId),
        handoffDelivered: handoffPhase.handoff?.deliveryStatus === "delivered",
        dependencyBlockedCount: dependencyBlocked.length
      },
      summary: {
        nextAction: cleanString(nextAction.key, 140),
        nextActionStatus: cleanString(nextAction.status, 140),
        operatingLoopNextAction: operatingLoop.nextAction,
        selectedCycleId: cleanString(profileFeedback.selectedCycle?.cycleId, 160),
        selectedTaskCardId: cleanString(profileFeedback.selectedCycle?.taskCardId, 160),
        digestId: cleanString(digestPhase.digest?.digestId, 160),
        digestStatus: cleanString(digestPhase.digest?.status, 120),
        policyId: cleanString(failurePolicyPhase.policyId, 160),
        policyStatus: cleanString(failurePolicyPhase.status, 120),
        handoffId: cleanString(handoffPhase.handoff?.handoffId, 160),
        handoffDeliveryStatus: cleanString(handoffPhase.handoff?.deliveryStatus, 120),
        dependencyBlockedCount: dependencyBlocked.length,
        writePerformed: false,
        writesPerformed: false,
        publishPerformed: false,
        schedulerStarted: false
      },
      writePerformed: false,
      writesPerformed: false,
      publishPerformed: false,
      schedulerStarted: false
    };
    const outputPrivacyFindings = scanPrivacy(result);
    if (outputPrivacyFindings.length) {
      return {
        ok: false,
        source: "growth-learning-automation-closed-loop-action-plan-service",
        schemaVersion: "growth.learningAutomationClosedLoopActionPlan.v1",
        privacyClass: "summary_only",
        summaryOnly: true,
        status: "blocked",
        error: "closed_loop_action_plan_output_privacy_failed",
        privacyFindings: outputPrivacyFindings,
        writePerformed: false,
        writesPerformed: false,
        publishPerformed: false,
        schedulerStarted: false
      };
    }
    return result;
  }

  return {
    actionPlan
  };
}

module.exports = {
  createLearningAutomationClosedLoopActionPlanService,
  publicInput,
  scanPrivacy
};
