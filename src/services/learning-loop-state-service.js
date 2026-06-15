"use strict";

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map((value) => cleanString(value, 120)).filter(Boolean)));
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
    source: "growth-learning-loop-state-service",
    error: cleanString(error) || "learning_loop_state_unavailable"
  }, extra);
}

function bool(value) {
  return value === true;
}

function number(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function targetFrom(preview = {}, input = {}) {
  const target = preview.target || {};
  const workspaceId = cleanString(target.workspaceId || input.workspaceId || input.workspace_id);
  return {
    workspaceId,
    learnerId: cleanString(target.learnerId || input.learnerId || input.learner_id || workspaceId),
    displayName: cleanString(target.displayName || input.displayName || input.display_name || input.label, 120),
    label: cleanString(target.label || input.label || target.displayName || input.displayName || input.display_name, 120)
  };
}

function scopeFrom(preview = {}, input = {}) {
  const scope = preview.scope || {};
  const context = preview.context || {};
  const suggestedPlan = context.suggestedPlan || {};
  return {
    programId: cleanString(scope.programId || input.programId || input.program_id),
    domainPackId: cleanString(scope.domainPackId || input.domainPackId || input.domain_pack_id),
    domain: cleanString(scope.domain || input.domain),
    subject: cleanString(scope.subject || input.subject),
    horizon: cleanString(scope.horizon || input.horizon || "daily_plan"),
    availableMinutes: number(scope.availableMinutes || input.availableMinutes || input.available_minutes || 15) || 15,
    targetNodeIds: uniqueStrings(scope.targetNodeIds || input.targetNodeIds || input.target_node_ids || suggestedPlan.targetNodeIds).slice(0, 12)
  };
}

function readinessFrom(preview = {}) {
  const readiness = preview.readiness || {};
  return {
    ready: bool(readiness.ready),
    targetEnabled: bool(readiness.targetEnabled),
    targetProvisioned: bool(readiness.targetProvisioned),
    learningGraphReady: bool(readiness.learningGraphReady),
    plannerReady: bool(readiness.plannerReady),
    plannerContextReady: bool(readiness.plannerContextReady),
    authoringGatewayConfigured: bool(readiness.authoringGatewayConfigured),
    evaluationGatewayConfigured: bool(readiness.evaluationGatewayConfigured),
    plannerGatewayConfigured: bool(readiness.plannerGatewayConfigured),
    operatingLoopGatewayReady: bool(readiness.operatingLoopGatewayReady),
    blockingOpenGeneration: bool(readiness.blockingOpenGeneration)
  };
}

function profileFrom(context = {}) {
  const profile = context.profileV2 || {};
  const summary = profile.summary || {};
  return {
    ok: profile.ok !== false,
    available: profile.available !== false,
    capabilityStateCount: number(summary.capabilityStateCount),
    evidenceCount: number(summary.evidenceCount),
    weaknessCount: number(summary.weaknessCount),
    strengthCount: number(summary.strengthCount),
    staleEvidenceCount: asArray(profile.staleEvidence).length,
    plannerHintCount: asArray(profile.recommendedPlannerHints).length,
    stageReadinessStatus: cleanString(profile.stageReadiness?.status),
    weaknesses: asArray(profile.weaknesses).map((item) => ({
      nodeId: cleanString(item.nodeId),
      status: cleanString(item.status),
      summary: cleanString(item.summary, 180)
    })).filter((item) => item.nodeId).slice(0, 6)
  };
}

function auditFrom(preview = {}) {
  const context = preview.context || {};
  const ownerAudit = context.ownerAudit || {};
  const summary = ownerAudit.summary || {};
  const completeness = preview.completeness || null;
  const cycleAudit = preview.cycleAudit || null;
  return {
    planDraftCount: number(summary.planDraftCount),
    publishedPlanCount: number(summary.publishedPlanCount),
    evidenceCount: number(context.evidenceAudit?.count || cycleAudit?.summary?.evidenceCount),
    profileDeltaCount: number(summary.profileDeltaCount || cycleAudit?.summary?.profileDeltaCount),
    correctionCount: number(summary.correctionCount),
    lastPlanAt: cleanString(summary.lastPlanAt, 64),
    lastPublishedAt: cleanString(summary.lastPublishedAt, 64),
    lastProfileDeltaAt: cleanString(summary.lastProfileDeltaAt, 64),
    lastCorrectionAt: cleanString(summary.lastCorrectionAt, 64),
    cycleAuditAvailable: Boolean(cycleAudit),
    cycleAuditOk: cycleAudit ? cycleAudit.ok !== false : false,
    completenessAvailable: Boolean(completeness),
    complete: completeness ? bool(completeness.complete) : false,
    readyForAutomation: completeness ? bool(completeness.readyForAutomation) : false,
    missingRequired: uniqueStrings(completeness?.summary?.missingRequired || [])
  };
}

function recommendationFrom(context = {}) {
  const recommendation = context.nextCardRecommendation || {};
  return {
    available: Boolean(recommendation && Object.keys(recommendation).length),
    selectionMode: cleanString(recommendation.selectionMode),
    recommendationMode: cleanString(recommendation.recommendationMode),
    recommendationId: cleanString(recommendation.recommendationId),
    recommendationStatus: cleanString(recommendation.recommendationStatus),
    strategy: cleanString(recommendation.strategy),
    targetNodeId: cleanString(recommendation.targetNodeId),
    targetNodeIds: uniqueStrings(recommendation.targetNodeIds || [recommendation.targetNodeId]).slice(0, 12),
    reason: cleanString(recommendation.reason, 260)
  };
}

function publicStageAssessment(readiness = null) {
  if (!readiness) {
    return {
      ok: false,
      available: false,
      status: "not_applicable",
      eligible: false,
      reason: "target_node_required"
    };
  }
  return {
    ok: readiness.ok !== false,
    available: readiness.ok !== false,
    status: cleanString(readiness.activationState || (readiness.eligible ? "eligible" : "dormant")),
    eligible: bool(readiness.eligible),
    reason: cleanString(readiness.reason, 180),
    cooldownUntil: cleanString(readiness.cooldownUntil, 64),
    cycleId: cleanString(readiness.cycle?.cycleId || readiness.cycle?.cycle_id),
    evidence: {
      minimumRecentOrdinaryCards: number(readiness.evidence?.minimumRecentOrdinaryCards),
      recentTrajectoryCount: number(readiness.evidence?.recentTrajectoryCount),
      recentExperienceSignalCount: number(readiness.evidence?.recentExperienceSignalCount),
      highPressureSignalCount: number(readiness.evidence?.highPressureSignalCount),
      challengeSignalCount: number(readiness.evidence?.challengeSignalCount)
    }
  };
}

function action(action, reason, extra = {}) {
  return Object.assign({
    action,
    reason,
    requiredActor: "owner",
    enabled: true
  }, extra);
}

function deriveNextAction({ readiness = {}, audit = {}, stageAssessment = {}, preview = {}, recommendation = {} } = {}) {
  const actions = preview.actions || {};
  if (!readiness.targetEnabled) {
    return action("provision_learning_target", "target_not_enabled", {
      endpoint: "/api/v1/growth/domain-pack-provisions",
      enabled: false
    });
  }
  if (!readiness.learningGraphReady) {
    return action("import_or_select_learning_graph", "learning_graph_not_ready", { enabled: false });
  }
  if (!readiness.plannerContextReady) {
    return action("refresh_learning_context", "planner_context_not_ready", { enabled: false });
  }
  if (!readiness.plannerReady) {
    return action("configure_planner_gateway", "planner_gateway_not_ready", { enabled: false });
  }
  if (stageAssessment.eligible && stageAssessment.status !== "active") {
    return action("review_stage_assessment", "stage_checkpoint_ready", {
      endpoint: "/api/v1/growth/stage-assessments/activate",
      targetNodeIds: stageAssessment.targetNodeIds || []
    });
  }
  if (audit.completenessAvailable && !audit.complete) {
    return action("complete_cycle_audit", "cycle_audit_incomplete", {
      endpoint: "/api/v1/growth/learning-cycles/completeness",
      missingRequired: audit.missingRequired
    });
  }
  if (actions.canPublish || actions.publishAction?.enabled) {
    return action("publish_selected_plan_item", "validated_plan_ready", {
      method: "POST",
      endpoint: "/api/v1/growth/daily-loop/publish",
      planDraftId: cleanString(actions.publishAction?.planDraftId),
      itemId: cleanString(actions.publishAction?.itemId)
    });
  }
  if (actions.canDraft || actions.draftAction?.enabled) {
    return action("draft_daily_plan", recommendation.strategy ? `next_strategy:${recommendation.strategy}` : "daily_plan_ready", {
      method: "POST",
      endpoint: "/api/v1/growth/daily-loop/draft",
      targetNodeId: recommendation.targetNodeId
    });
  }
  return action("owner_review", "no_safe_automatic_action", { enabled: false });
}

function statusFrom(nextAction = {}, audit = {}, stageAssessment = {}) {
  if (stageAssessment.eligible && stageAssessment.status !== "active") return "stage_checkpoint_ready";
  if (audit.completenessAvailable && !audit.complete) return "audit_incomplete";
  if (nextAction.action === "publish_selected_plan_item") return "ready_to_publish";
  if (nextAction.action === "draft_daily_plan") return "ready_to_draft";
  if (nextAction.enabled === false) return "blocked";
  return "needs_owner_review";
}

function createLearningLoopStateService(options = {}) {
  const dailyLoopService = options.dailyLoopService || null;
  const stageAssessmentService = options.stageAssessmentService || null;

  function stageAssessmentFor(input = {}, preview = {}) {
    const target = targetFrom(preview, input);
    const scope = scopeFrom(preview, input);
    const targetNodeIds = uniqueStrings(input.assessmentCoverageNodeIds || input.assessment_coverage_node_ids || scope.targetNodeIds);
    if (!targetNodeIds.length) return null;
    if (!stageAssessmentService || typeof stageAssessmentService.stageReadiness !== "function") {
      return unavailable("stage_assessment_service_unavailable");
    }
    return stageAssessmentService.stageReadiness({
      workspaceId: target.workspaceId,
      learnerId: target.learnerId,
      programId: scope.programId,
      domainPackId: scope.domainPackId,
      domain: scope.domain,
      subject: scope.subject,
      targetNodeId: targetNodeIds[0],
      targetNodeIds,
      assessmentCoverageNodeIds: targetNodeIds
    });
  }

  function state(input = {}) {
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) {
      return unavailable("learning_loop_state_privacy_failed", { privacyFindings });
    }
    if (!dailyLoopService || typeof dailyLoopService.preview !== "function") {
      return unavailable("learning_loop_state_daily_loop_service_unavailable");
    }
    const preview = dailyLoopService.preview(input);
    if (!preview?.ok) {
      return unavailable(preview?.error || "learning_loop_state_preview_failed", {
        preview: preview ? {
          ok: Boolean(preview.ok),
          error: cleanString(preview.error)
        } : null
      });
    }
    const target = targetFrom(preview, input);
    const scope = scopeFrom(preview, input);
    const readiness = readinessFrom(preview);
    const profile = profileFrom(preview.context || {});
    const audit = auditFrom(preview);
    const recommendation = recommendationFrom(preview.context || {});
    const stageAssessmentReadiness = stageAssessmentFor(input, preview);
    const stageAssessment = publicStageAssessment(stageAssessmentReadiness);
    stageAssessment.targetNodeIds = scope.targetNodeIds;
    const nextAction = deriveNextAction({ readiness, audit, stageAssessment, preview, recommendation });
    const status = statusFrom(nextAction, audit, stageAssessment);
    return {
      ok: true,
      source: "growth-learning-loop-state-service",
      schemaVersion: "growth.learningLoopState.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      target,
      scope,
      status,
      readiness,
      profile,
      audit,
      stageAssessment,
      recommendation,
      nextAction,
      summary: {
        status,
        readyForDraft: nextAction.action === "draft_daily_plan" && nextAction.enabled !== false,
        readyForPublish: nextAction.action === "publish_selected_plan_item" && nextAction.enabled !== false,
        stageCheckpointReady: stageAssessment.eligible && stageAssessment.status !== "active",
        auditComplete: audit.completenessAvailable ? audit.complete : false,
        weaknessCount: profile.weaknessCount,
        missingRequired: audit.missingRequired
      }
    };
  }

  return {
    state
  };
}

module.exports = {
  createLearningLoopStateService,
  scanPrivacy
};
