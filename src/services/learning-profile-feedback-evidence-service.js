"use strict";

function cleanString(value, max = 240) {
  return String(value ?? "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(value = []) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  return Array.from(new Set(values.map((item) => cleanString(item, 160)).filter(Boolean)));
}

function booleanFlag(value) {
  return value === true || value === "true" || value === 1 || value === "1";
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

function publicScope(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id, 120);
  return {
    workspaceId,
    learnerId: cleanString(input.learnerId || input.learner_id || workspaceId, 120),
    programId: cleanString(input.programId || input.program_id, 120),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id, 120),
    domain: cleanString(input.domain, 80),
    subject: cleanString(input.subject, 80),
    horizon: cleanString(input.horizon || "daily_plan", 80) || "daily_plan",
    availableMinutes: Math.max(1, Math.min(60, Math.round(Number(input.availableMinutes || input.available_minutes || 15) || 15))),
    planDraftId: cleanString(input.planDraftId || input.plan_draft_id, 120),
    taskCardId: cleanString(input.taskCardId || input.task_card_id, 120),
    evaluationId: cleanString(input.evaluationId || input.evaluation_id, 120),
    profileDeltaId: cleanString(input.profileDeltaId || input.profile_delta_id, 120),
    evidenceId: cleanString(input.evidenceId || input.evidence_id, 120),
    correctionId: cleanString(input.correctionId || input.correction_id, 120),
    sourceId: cleanString(input.sourceId || input.source_id, 120),
    targetNodeIds: uniqueStrings(input.targetNodeIds || input.target_node_ids || input.nodeIds || input.node_ids).slice(0, 12),
    autoSelectCompletedCycle: booleanFlag(input.autoSelectCompletedCycle || input.auto_select_completed_cycle),
    autoSelectLatestCompletedCycle: booleanFlag(input.autoSelectLatestCompletedCycle || input.auto_select_latest_completed_cycle),
    limit: Math.max(1, Math.min(50, Math.round(Number(input.limit || 12) || 12)))
  };
}

function hasCycleSelector(scope = {}) {
  return Boolean(
    scope.planDraftId
    || scope.taskCardId
    || scope.evaluationId
    || scope.profileDeltaId
    || scope.evidenceId
    || scope.sourceId
  );
}

function callService(service, methodName, input, unavailableError) {
  if (!service || typeof service[methodName] !== "function") {
    return { ok: false, available: false, error: unavailableError };
  }
  try {
    return service[methodName](input);
  } catch (error) {
    return {
      ok: false,
      available: false,
      error: unavailableError,
      detail: cleanString(error && error.message ? error.message : error, 180)
    };
  }
}

function countFromResult(result = {}, listKeys = []) {
  for (const key of listKeys) {
    if (Array.isArray(result[key])) return result[key].length;
  }
  return Number(result.count || result.summary?.count || 0) || 0;
}

function profileSummary(profile = {}) {
  const summary = profile.summary || {};
  return {
    available: profile.ok !== false && profile.available !== false,
    capabilityStateCount: Number(summary.capabilityStateCount || asArray(profile.capabilityStates).length || 0) || 0,
    evidenceCount: Number(summary.evidenceCount || 0) || 0,
    weaknessCount: Number(summary.weaknessCount || asArray(profile.weaknesses).length || 0) || 0,
    strengthCount: Number(summary.strengthCount || asArray(profile.strengths).length || 0) || 0,
    staleCount: Number(summary.staleCount || asArray(profile.staleEvidence).length || 0) || 0,
    pressureSignalCount: Number(summary.pressureSignalCount || 0) || 0,
    plannerStrategy: cleanString(profile.recommendedPlannerHints?.strategy || asArray(profile.recommendedPlannerHints)[0]?.strategy, 80),
    weaknesses: asArray(profile.weaknesses).map((item) => ({
      nodeId: cleanString(item.nodeId || item.graphNodeId, 120),
      status: cleanString(item.status, 80),
      summary: cleanString(item.summary || item.reason, 180)
    })).filter((item) => item.nodeId).slice(0, 5)
  };
}

function evidenceSummary(evidenceAudit = {}) {
  const evidence = asArray(evidenceAudit.evidence);
  return {
    available: evidenceAudit.ok !== false && evidenceAudit.available !== false,
    count: countFromResult(evidenceAudit, ["evidence"]),
    sourceTypes: uniqueStrings(evidence.map((item) => item.sourceType)).slice(0, 8),
    graphNodeIds: uniqueStrings(evidence.flatMap((item) => [item.graphNodeId, ...uniqueStrings(item.graphNodeIds)])).slice(0, 12)
  };
}

function profileDeltaSummary(profileDeltaAudit = {}) {
  const deltas = asArray(profileDeltaAudit.profileDeltas || profileDeltaAudit.deltas);
  const latest = deltas[0] || {};
  return {
    available: profileDeltaAudit.ok !== false && profileDeltaAudit.available !== false,
    count: countFromResult(profileDeltaAudit, ["profileDeltas", "deltas"]),
    latestProfileDeltaId: cleanString(latest.profileDeltaId, 120),
    latestEvaluationId: cleanString(latest.evaluationId, 120),
    changedCapabilityCount: Number(latest.changedCapabilityCount || latest.summary?.changedCapabilityCount || 0) || 0,
    targetNodeIds: uniqueStrings(latest.targetNodeIds).slice(0, 12)
  };
}

function recommendationSummary(recommendation = {}) {
  return {
    available: recommendation.ok === true && recommendation.available !== false,
    mode: cleanString(recommendation.recommendationMode, 80),
    status: cleanString(recommendation.recommendationStatus, 80),
    strategy: cleanString(recommendation.strategy, 80),
    cardRole: cleanString(recommendation.cardRole, 80),
    targetNodeIds: uniqueStrings(recommendation.targetNodeIds).slice(0, 12),
    targetNodeId: cleanString(recommendation.targetNodeIds?.[0] || recommendation.targetNodeId, 120),
    reason: cleanString(recommendation.reason, 220)
  };
}

function rewardSummaryFromLoopState(loopState = {}) {
  const recommendationEvidence = loopState.recommendationEvidence && typeof loopState.recommendationEvidence === "object"
    ? loopState.recommendationEvidence
    : {};
  const rewardTrace = loopState.rewardTrace && typeof loopState.rewardTrace === "object"
    ? loopState.rewardTrace
    : recommendationEvidence.rewardTrace && typeof recommendationEvidence.rewardTrace === "object"
      ? recommendationEvidence.rewardTrace
      : {};
  const traceSummary = rewardTrace.summary && typeof rewardTrace.summary === "object" ? rewardTrace.summary : {};
  const stateSummary = loopState.summary && typeof loopState.summary === "object" ? loopState.summary : {};
  const auditTrace = loopState.auditTrace && typeof loopState.auditTrace === "object"
    ? loopState.auditTrace
    : recommendationEvidence.auditTrace && typeof recommendationEvidence.auditTrace === "object"
      ? recommendationEvidence.auditTrace
      : {};
  const evidenceTrace = recommendationEvidence.evidenceTrace && typeof recommendationEvidence.evidenceTrace === "object"
    ? recommendationEvidence.evidenceTrace
    : {};
  const evidenceSummary = recommendationEvidence.summary && typeof recommendationEvidence.summary === "object"
    ? recommendationEvidence.summary
    : {};
  const rewardSettlements = asArray(rewardTrace.rewardSettlements || auditTrace.rewardSettlements);
  const rewardSettlementIds = uniqueStrings([
    ...asArray(rewardTrace.rewardSettlementIds),
    ...asArray(evidenceTrace.rewardSettlementIds),
    ...rewardSettlements.map((item) => item.rewardSettlementId || item.id)
  ]).slice(0, 12);
  const rewardSettlementCount = Number(
    stateSummary.rewardSettlementCount
      || evidenceSummary.rewardSettlementCount
      || traceSummary.rewardSettlementCount
      || rewardSettlements.length
      || rewardSettlementIds.length
      || 0
  ) || 0;
  const totalRewardCoins = Number(
    stateSummary.totalRewardCoins
      || evidenceSummary.totalRewardCoins
      || traceSummary.totalCoinAmount
      || traceSummary.totalRewardCoins
      || 0
  ) || 0;
  return {
    available: rewardTrace.available === true || rewardSettlementCount > 0 || rewardSettlementIds.length > 0 || totalRewardCoins > 0,
    ok: rewardTrace.ok !== false,
    rewardSettlementCount,
    settledCount: Number(traceSummary.settledCount || 0) || 0,
    totalRewardCoins,
    currency: cleanString(traceSummary.currency, 24),
    latestRewardSettlementId: cleanString(traceSummary.latestRewardSettlementId, 120),
    rewardSettlementIds
  };
}

function loopStateSummary(loopState = {}) {
  const reward = rewardSummaryFromLoopState(loopState);
  return {
    available: loopState.ok === true,
    status: cleanString(loopState.status, 80),
    nextAction: {
      action: cleanString(loopState.nextAction?.action, 120),
      enabled: loopState.nextAction?.enabled !== false,
      reason: cleanString(loopState.nextAction?.reason, 180),
      targetNodeId: cleanString(loopState.nextAction?.targetNodeId, 120)
    },
    auditComplete: Boolean(loopState.audit?.complete),
    missingRequired: uniqueStrings(loopState.audit?.missingRequired || loopState.summary?.missingRequired).slice(0, 12),
    reward
  };
}

function selectorFromCycle(cycle = {}) {
  const selectors = cycle.selectors || {};
  return {
    cycleId: cleanString(cycle.cycleId, 160),
    status: cleanString(cycle.status, 80),
    latestActivityAt: cleanString(cycle.latestActivityAt, 80),
    planDraftId: cleanString(selectors.planDraftId, 120),
    taskCardId: cleanString(selectors.taskCardId, 120),
    evaluationId: cleanString(selectors.evaluationId, 120),
    profileDeltaId: cleanString(selectors.profileDeltaId, 120),
    evidenceId: cleanString(selectors.evidenceId, 120),
    sourceId: cleanString(selectors.sourceId, 120),
    targetNodeIds: uniqueStrings(selectors.targetNodeIds).slice(0, 12),
    complete: Boolean(cycle.completeness?.complete),
    readyForAutomation: Boolean(cycle.completeness?.readyForAutomation)
  };
}

function selectorTimeValue(selector = {}) {
  const value = Date.parse(selector.latestActivityAt || "");
  return Number.isFinite(value) ? value : 0;
}

function selectorDiscoverySummary(result = {}) {
  if (!result?.ok) {
    return {
      available: false,
      status: "unavailable",
      error: cleanString(result?.error || "profile_feedback_cycle_history_unavailable", 160),
      cycleCount: 0,
      completeCount: 0,
      readyForAutomationCount: 0,
      candidateCount: 0,
      candidates: []
    };
  }
  const cycles = asArray(result.cycles);
  const candidates = cycles
    .filter((cycle) => cycle.completeness?.complete || cycle.completeness?.readyForAutomation)
    .map(selectorFromCycle)
    .filter((selector) => selector.taskCardId || selector.evaluationId || selector.profileDeltaId || selector.evidenceId || selector.planDraftId || selector.sourceId)
    .sort((a, b) => selectorTimeValue(b) - selectorTimeValue(a))
    .slice(0, 5);
  return {
    available: true,
    status: candidates.length ? "candidate_available" : "no_completed_cycle",
    cycleCount: Number(result.summary?.cycleCount || cycles.length || 0) || 0,
    completeCount: Number(result.summary?.completeCount || cycles.filter((cycle) => cycle.completeness?.complete).length || 0) || 0,
    readyForAutomationCount: Number(result.summary?.readyForAutomationCount || cycles.filter((cycle) => cycle.completeness?.readyForAutomation).length || 0) || 0,
    latestActivityAt: cleanString(result.summary?.latestActivityAt, 80),
    partialFailureCount: Number(result.summary?.partialFailureCount || asArray(result.partialFailures).length || 0) || 0,
    candidateCount: candidates.length,
    candidates
  };
}

function selectorInput(selector = {}) {
  return {
    planDraftId: cleanString(selector.planDraftId, 120),
    taskCardId: cleanString(selector.taskCardId, 120),
    evaluationId: cleanString(selector.evaluationId, 120),
    profileDeltaId: cleanString(selector.profileDeltaId, 120),
    evidenceId: cleanString(selector.evidenceId, 120),
    sourceId: cleanString(selector.sourceId, 120),
    targetNodeIds: uniqueStrings(selector.targetNodeIds).slice(0, 12)
  };
}

function compactSelector(selector = {}) {
  const output = selectorInput(selector);
  output.cycleId = cleanString(selector.cycleId, 160);
  output.status = cleanString(selector.status, 80);
  output.latestActivityAt = cleanString(selector.latestActivityAt, 80);
  output.complete = selector.complete === true;
  output.readyForAutomation = selector.readyForAutomation === true;
  return output;
}

function autoSelectCycle(discovery = {}, scope = {}) {
  const candidates = asArray(discovery.candidates);
  const latestAllowed = scope.autoSelectLatestCompletedCycle === true;
  const uniqueAllowed = scope.autoSelectCompletedCycle === true || latestAllowed;
  if (!uniqueAllowed) {
    return { attempted: false, status: "disabled", candidateCount: candidates.length };
  }
  if (!candidates.length) {
    return { attempted: true, status: "no_candidate", candidateCount: 0 };
  }
  if (candidates.length === 1 || latestAllowed) {
    const selected = candidates[0];
    return {
      attempted: true,
      status: candidates.length === 1 ? "selected_unique_completed_cycle" : "selected_latest_completed_cycle",
      candidateCount: candidates.length,
      selected: compactSelector(selected)
    };
  }
  return {
    attempted: true,
    status: "ambiguous_completed_cycle",
    candidateCount: candidates.length
  };
}

function actionForSelectorDiscovery(discovery = {}) {
  if (discovery.available === false) return "inspect_cycle_history_service";
  if (discovery.candidateCount > 0) return "supply_completed_cycle_selector";
  if (discovery.cycleCount > 0) return "complete_cycle_audit";
  return "produce_completed_daily_cycle";
}

function check(key, status, summary = {}, requiredAction = "") {
  return {
    key,
    status,
    summary,
    requiredAction: requiredAction ? { action: requiredAction, requiredActor: "owner" } : null
  };
}

function blockedDependency(key, result = {}, label) {
  return check(key, "blocked", {
    label,
    error: cleanString(result.error || `${key}_unavailable`, 160),
    available: result.available !== false
  }, "inspect_profile_feedback_dependency");
}

function createLearningProfileFeedbackEvidenceService(options = {}) {
  const auditCompletenessService = options.auditCompletenessService || null;
  const evidenceAuditService = options.evidenceAuditService || null;
  const profileDeltaAuditService = options.profileDeltaAuditService || null;
  const profileV2Service = options.profileV2Service || null;
  const recommendationService = options.recommendationService || null;
  const loopStateService = options.loopStateService || null;
  const cycleHistoryService = options.cycleHistoryService || null;

  function evaluate(input = {}) {
    let scope = publicScope(input);
    if (!scope.workspaceId) {
      return { ok: false, source: "growth-learning-profile-feedback-evidence-service", error: "profile_feedback_workspace_required" };
    }
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) {
      return {
        ok: false,
        source: "growth-learning-profile-feedback-evidence-service",
        error: "profile_feedback_privacy_failed",
        privacyFindings
      };
    }
    let selectorDiscovery = null;
    let autoSelection = null;
    let selectedCompletedCycle = null;
    if (!hasCycleSelector(scope)) {
      const cycleHistory = callService(
        cycleHistoryService,
        "listCycleHistory",
        Object.assign({}, scope, {
          includeCompleteness: true,
          limit: Math.min(scope.limit, 5)
        }),
        "profile_feedback_cycle_history_unavailable"
      );
      selectorDiscovery = selectorDiscoverySummary(cycleHistory);
      autoSelection = autoSelectCycle(selectorDiscovery, scope);
      if (autoSelection.selected) {
        selectedCompletedCycle = autoSelection.selected;
        scope = Object.assign({}, scope, selectorInput(selectedCompletedCycle));
      }
    }

    if (!hasCycleSelector(scope)) {
      const requiredAction = actionForSelectorDiscovery(selectorDiscovery);
      return {
        ok: false,
        source: "growth-learning-profile-feedback-evidence-service",
        schemaVersion: "growth.learningProfileFeedbackEvidence.v1",
        privacyClass: "summary_only",
        summaryOnly: true,
        status: "missing",
        scope,
        error: "profile_feedback_cycle_selector_required",
        checks: [
          check("cycle_selector_present", "missing", {
            label: "Completed-cycle selector",
            acceptedSelectors: ["planDraftId", "taskCardId", "evaluationId", "profileDeltaId", "evidenceId", "sourceId"],
            selectorDiscovery
          }, requiredAction)
        ],
        selectorDiscovery,
        autoSelection,
        summary: {
          missingRequired: ["cycle_selector_present"],
          readyForNextPlan: false,
          selectorDiscoveryStatus: selectorDiscovery.status,
          selectorCandidateCount: selectorDiscovery.candidateCount,
          completeCycleCount: selectorDiscovery.completeCount,
          cycleCount: selectorDiscovery.cycleCount,
          autoSelectionStatus: autoSelection.status,
          nextAction: requiredAction
        }
      };
    }

    const completeness = callService(
      auditCompletenessService,
      "evaluateCycleCompleteness",
      scope,
      "profile_feedback_completeness_unavailable"
    );
    const evidenceAudit = callService(
      evidenceAuditService,
      "listEvidenceAudit",
      scope,
      "profile_feedback_evidence_audit_unavailable"
    );
    const profileDeltaAudit = callService(
      profileDeltaAuditService,
      "listProfileDeltas",
      scope,
      "profile_feedback_profile_delta_audit_unavailable"
    );
    const profileV2 = callService(
      profileV2Service,
      "profileV2",
      scope,
      "profile_feedback_profile_v2_unavailable"
    );
    const recommendation = callService(
      recommendationService,
      "recommendNextCard",
      scope,
      "profile_feedback_recommendation_unavailable"
    );
    const loopState = callService(
      loopStateService,
      "state",
      scope,
      "profile_feedback_loop_state_unavailable"
    );

    const evidence = evidenceSummary(evidenceAudit);
    const profileDelta = profileDeltaSummary(profileDeltaAudit);
    const profile = profileSummary(profileV2);
    const nextRecommendation = recommendationSummary(recommendation);
    const nextLoopState = loopStateSummary(loopState);

    const checks = [
      completeness?.ok
        ? check("cycle_audit_complete", completeness.complete ? "pass" : "missing", {
          label: "Completed cycle audit",
          complete: Boolean(completeness.complete),
          readyForAutomation: Boolean(completeness.readyForAutomation),
          missingRequired: uniqueStrings(completeness.summary?.missingRequired).slice(0, 12)
        }, "complete_cycle_audit")
        : blockedDependency("cycle_audit_complete", completeness, "Completed cycle audit"),
      evidenceAudit?.ok
        ? check("evidence_ledger_present", evidence.count > 0 ? "pass" : "missing", {
          label: "Evaluation evidence ledger",
          count: evidence.count,
          sourceTypes: evidence.sourceTypes
        }, "process_evaluation_evidence")
        : blockedDependency("evidence_ledger_present", evidenceAudit, "Evaluation evidence ledger"),
      profileDeltaAudit?.ok
        ? check("profile_delta_audit_present", profileDelta.count > 0 ? "pass" : "missing", {
          label: "Profile-delta audit",
          count: profileDelta.count,
          latestProfileDeltaId: profileDelta.latestProfileDeltaId,
          changedCapabilityCount: profileDelta.changedCapabilityCount
        }, "persist_profile_delta_audit")
        : blockedDependency("profile_delta_audit_present", profileDeltaAudit, "Profile-delta audit"),
      profileV2?.ok
        ? check("profile_v2_projected", profile.evidenceCount > 0 || profile.capabilityStateCount > 0 ? "pass" : "missing", {
          label: "Profile V2 projection",
          evidenceCount: profile.evidenceCount,
          capabilityStateCount: profile.capabilityStateCount,
          weaknessCount: profile.weaknessCount,
          plannerStrategy: profile.plannerStrategy
        }, "project_profile_v2_from_evidence")
        : blockedDependency("profile_v2_projected", profileV2, "Profile V2 projection"),
      recommendation?.ok
        ? check("next_recommendation_available", nextRecommendation.available ? "pass" : "missing", {
          label: "Next-card recommendation",
          mode: nextRecommendation.mode,
          status: nextRecommendation.status,
          strategy: nextRecommendation.strategy,
          targetNodeIds: nextRecommendation.targetNodeIds
        }, "derive_next_card_recommendation")
        : check("next_recommendation_available", "missing", {
          label: "Next-card recommendation",
          error: cleanString(recommendation.error, 160),
          available: recommendation.available !== false
        }, "derive_next_card_recommendation"),
      loopState?.ok
        ? check("learning_loop_state_ready", nextLoopState.nextAction.action ? "pass" : "missing", {
          label: "Learning-loop next state",
          status: nextLoopState.status,
          nextAction: nextLoopState.nextAction.action,
          auditComplete: nextLoopState.auditComplete,
          missingRequired: nextLoopState.missingRequired
        }, "refresh_learning_loop_state")
        : blockedDependency("learning_loop_state_ready", loopState, "Learning-loop next state")
    ];

    const missingRequired = checks.filter((item) => item.status !== "pass").map((item) => item.key);
    const blocked = checks.some((item) => item.status === "blocked");
    const readyForNextPlan = missingRequired.length === 0
      && ["draft_daily_plan", "publish_selected_plan_item", "review_stage_assessment"].includes(nextLoopState.nextAction.action);
    const result = {
      ok: missingRequired.length === 0,
      source: "growth-learning-profile-feedback-evidence-service",
      schemaVersion: "growth.learningProfileFeedbackEvidence.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      status: missingRequired.length === 0 ? "pass" : (blocked ? "blocked" : "missing"),
      complete: Boolean(completeness.complete),
      readyForAutomation: Boolean(completeness.readyForAutomation),
      readyForNextPlan,
      scope,
      checks,
      profile,
      evidence,
      profileDelta,
      recommendation: nextRecommendation,
      loopState: nextLoopState,
      selectorDiscovery,
      autoSelection,
      selectedCompletedCycle,
      summary: {
        readyForNextPlan,
        missingRequired,
        cycleComplete: Boolean(completeness.complete),
        evidenceCount: evidence.count,
        profileDeltaCount: profileDelta.count,
        profileEvidenceCount: profile.evidenceCount,
        profileWeaknessCount: profile.weaknessCount,
        rewardSettlementCount: nextLoopState.reward.rewardSettlementCount,
        totalRewardCoins: nextLoopState.reward.totalRewardCoins,
        recommendationMode: nextRecommendation.mode,
        recommendationStrategy: nextRecommendation.strategy,
        loopStatus: nextLoopState.status,
        selectorDiscoveryStatus: selectorDiscovery ? selectorDiscovery.status : "",
        autoSelectionStatus: autoSelection ? autoSelection.status : "",
        selectedCycleId: cleanString(selectedCompletedCycle?.cycleId, 160),
        selectedTaskCardId: cleanString(selectedCompletedCycle?.taskCardId, 120),
        nextAction: nextLoopState.nextAction.action
      }
    };
    const outputPrivacyFindings = scanPrivacy(result);
    if (outputPrivacyFindings.length) {
      return {
        ok: false,
        source: "growth-learning-profile-feedback-evidence-service",
        error: "profile_feedback_output_privacy_failed",
        privacyFindings: outputPrivacyFindings
      };
    }
    return result;
  }

  return {
    evaluate
  };
}

module.exports = {
  createLearningProfileFeedbackEvidenceService,
  publicScope,
  scanPrivacy
};
