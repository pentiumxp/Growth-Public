"use strict";

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(value = []) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  return Array.from(new Set(values.map(cleanString).filter(Boolean)));
}

function boundedText(value, max = 320) {
  return cleanString(value).slice(0, max);
}

function unavailable(error, extra = {}) {
  return Object.assign({ ok: false, error }, extra);
}

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw)/i;

function scanPrivacyKeys(value, path = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacyKeys(item, `${path}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacyKeys(child, childPath, findings);
  }
  return findings;
}

function publicTarget(input = {}, context = {}) {
  const target = context.target || {};
  const workspaceId = cleanString(target.workspaceId || input.workspaceId || input.workspace_id);
  return {
    workspaceId,
    learnerId: cleanString(target.learnerId || input.learnerId || input.learner_id || workspaceId),
    displayName: boundedText(target.displayName || input.displayName || input.label, 120),
    label: boundedText(input.label || target.displayName || input.displayName, 120)
  };
}

function publicScope(input = {}, context = {}) {
  const provisioning = context.targetProvisioning || {};
  const graphOptions = context.graphOptions || {};
  return {
    programId: cleanString(input.programId || input.program_id),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id || provisioning.selectedDomainPackId || graphOptions.selectedDomainPackId),
    domain: cleanString(input.domain || provisioning.selectedDomain || graphOptions.selectedDomain),
    subject: cleanString(input.subject || provisioning.selectedSubject || graphOptions.selectedSubject),
    horizon: cleanString(input.horizon || context.plannerReadiness?.horizon || "daily_plan"),
    availableMinutes: Number(input.availableMinutes || input.available_minutes || context.generationDefaults?.availableMinutes || 15) || 15,
    targetNodeIds: uniqueStrings(input.targetNodeIds || input.target_node_ids || context.suggestedPlan?.targetNodeIds).slice(0, 12)
  };
}

function publicReadiness(context = {}) {
  const readiness = context.readiness || {};
  const plannerReadiness = context.plannerReadiness || {};
  const targetProvisioning = context.targetProvisioning || {};
  return {
    ready: Boolean(readiness.ready),
    targetEnabled: Boolean(readiness.targetEnabled),
    targetProvisioned: Boolean(targetProvisioning.targetEnabled),
    learningGraphReady: Boolean(readiness.learningGraphReady),
    plannerReady: Boolean(readiness.plannerReady || plannerReadiness.ready),
    plannerContextReady: Boolean(readiness.plannerContextReady || plannerReadiness.contextReady),
    authoringGatewayConfigured: Boolean(readiness.authoringGatewayConfigured || readiness.gatewayConfigured),
    evaluationGatewayConfigured: Boolean(readiness.evaluationGatewayConfigured),
    plannerGatewayConfigured: Boolean(readiness.plannerGatewayConfigured),
    operatingLoopGatewayReady: Boolean(readiness.operatingLoopGatewayReady),
    blockingOpenGeneration: Boolean(readiness.blockingOpenGeneration),
    targetProvisioning: {
      ok: Boolean(targetProvisioning.ok),
      targetEnabled: Boolean(targetProvisioning.targetEnabled),
      mode: cleanString(targetProvisioning.mode),
      error: cleanString(targetProvisioning.error)
    }
  };
}

function publicPlanItem(item = {}) {
  if (!item || typeof item !== "object") return null;
  return {
    itemId: cleanString(item.itemId),
    cardRole: cleanString(item.cardRole),
    subject: cleanString(item.subject),
    targetNodeIds: uniqueStrings(item.targetNodeIds).slice(0, 12),
    estimatedMinutes: Number(item.estimatedMinutes || 0) || 0,
    difficultyBand: cleanString(item.difficultyBand),
    supportLevel: cleanString(item.supportLevel),
    evidenceRequirements: uniqueStrings(item.evidenceRequirements).slice(0, 8),
    reason: boundedText(item.reason, 260)
  };
}

function publicPlanDraft(planDraft = {}) {
  if (!planDraft || typeof planDraft !== "object") return null;
  const publishAttempt = planDraft.publishAttempt || {};
  const items = asArray(planDraft.draft?.items).map(publicPlanItem).filter((item) => item && item.itemId).slice(0, 6);
  return {
    planDraftId: cleanString(planDraft.planDraftId),
    workspaceId: cleanString(planDraft.workspaceId),
    learnerId: cleanString(planDraft.learnerId),
    programId: cleanString(planDraft.programId),
    horizon: cleanString(planDraft.horizon),
    status: cleanString(planDraft.status),
    planSummary: boundedText(planDraft.planSummary, 320),
    selectedItemId: cleanString(planDraft.selectedItemId),
    generatedTaskCardId: cleanString(planDraft.generatedTaskCardId),
    generatedLearningGraphPlanId: cleanString(planDraft.generatedLearningGraphPlanId),
    targetNodeIds: uniqueStrings(planDraft.targetNodeIds).slice(0, 12),
    basisEvidenceIds: uniqueStrings(planDraft.basisEvidenceIds).slice(0, 12),
    itemCount: items.length,
    items,
    selectedItem: planDraft.selectedItem ? publicPlanItem(planDraft.selectedItem) : null,
    publishAttempt: {
      status: cleanString(publishAttempt.status),
      error: boundedText(publishAttempt.error, 120),
      stage: cleanString(publishAttempt.stage),
      selectedItemId: cleanString(publishAttempt.selectedItemId),
      attemptedAt: cleanString(publishAttempt.attemptedAt),
      attemptCount: Number(publishAttempt.attemptCount || 0) || 0
    },
    privacyClass: cleanString(planDraft.privacyClass),
    createdAt: cleanString(planDraft.createdAt),
    updatedAt: cleanString(planDraft.updatedAt),
    publishedAt: cleanString(planDraft.publishedAt)
  };
}

function publicGeneration(generation = {}) {
  if (!generation || typeof generation !== "object") return null;
  const plan = generation.learningGraphPlan || {};
  const published = generation.published || {};
  return {
    ok: generation.ok !== false,
    recipeId: cleanString(generation.recipeId),
    gatewayMode: cleanString(generation.gatewayMode),
    repaired: Boolean(generation.repaired),
    sourceSummaryCount: Number(generation.sourceSummaryCount || 0) || 0,
    targetProvisioning: generation.targetProvisioning ? {
      ok: Boolean(generation.targetProvisioning.ok),
      mode: cleanString(generation.targetProvisioning.mode),
      selectedDomainPackId: cleanString(generation.targetProvisioning.selectedDomainPackId),
      selectedDomain: cleanString(generation.targetProvisioning.selectedDomain),
      selectedSubject: cleanString(generation.targetProvisioning.selectedSubject)
    } : null,
    learningGraphPlan: {
      learningGraphPlanId: cleanString(plan.learningGraphPlanId),
      targetNodeId: cleanString(plan.targetNodeId),
      targetNodeIds: uniqueStrings(plan.targetNodeIds || plan.pathNodeIds).slice(0, 12),
      domainPackId: cleanString(plan.domainPackId),
      domain: cleanString(plan.domain),
      subject: cleanString(plan.subject),
      cardRole: cleanString(asArray(plan.cardSequence)[0]?.cardRole)
    },
    published: {
      taskCardId: cleanString(published.taskCardId),
      transaction: cleanString(published.transaction),
      status: cleanString(published.status)
    },
    recommendationAcceptance: generation.recommendationAcceptance ? {
      ok: Boolean(generation.recommendationAcceptance.ok),
      recommendationId: cleanString(generation.recommendationAcceptance.recommendationId),
      trajectoryId: cleanString(generation.recommendationAcceptance.trajectoryId),
      status: cleanString(generation.recommendationAcceptance.status)
    } : null
  };
}

function publicLoopStep(result = {}) {
  const planDraft = result.planDraft || {};
  const generation = result.generation || {};
  return {
    ok: result.ok !== false,
    operation: cleanString(result.operation),
    stage: cleanString(result.stage),
    error: boundedText(result.error, 160),
    duplicate: Boolean(result.duplicate),
    gatewayMode: cleanString(result.gatewayMode || generation.gatewayMode),
    planDraftId: cleanString(planDraft.planDraftId),
    selectedItemId: cleanString(planDraft.selectedItemId || result.selectedItem?.itemId),
    generatedTaskCardId: cleanString(planDraft.generatedTaskCardId || generation.published?.taskCardId),
    taskCardId: cleanString(generation.published?.taskCardId || planDraft.generatedTaskCardId)
  };
}

function shouldReadCycle(input = {}, publishResult = null) {
  return Boolean(
    cleanString(input.planDraftId || input.plan_draft_id)
    || cleanString(input.taskCardId || input.task_card_id)
    || cleanString(input.evaluationId || input.evaluation_id)
    || cleanString(publishResult?.planDraft?.planDraftId)
    || cleanString(publishResult?.planDraft?.generatedTaskCardId)
    || cleanString(publishResult?.generation?.published?.taskCardId)
  );
}

function cycleInput(input = {}, context = {}, publishResult = null) {
  const target = publicTarget(input, context);
  const planDraft = publishResult?.planDraft || {};
  const generation = publishResult?.generation || {};
  return {
    workspaceId: target.workspaceId,
    learnerId: target.learnerId,
    displayName: target.displayName,
    label: target.label,
    programId: cleanString(input.programId || input.program_id || planDraft.programId),
    planDraftId: cleanString(input.planDraftId || input.plan_draft_id || planDraft.planDraftId),
    taskCardId: cleanString(input.taskCardId || input.task_card_id || planDraft.generatedTaskCardId || generation.published?.taskCardId),
    evaluationId: cleanString(input.evaluationId || input.evaluation_id),
    profileDeltaId: cleanString(input.profileDeltaId || input.profile_delta_id),
    evidenceId: cleanString(input.evidenceId || input.evidence_id),
    correctionId: cleanString(input.correctionId || input.correction_id),
    sourceId: cleanString(input.sourceId || input.source_id),
    targetNodeIds: uniqueStrings(input.targetNodeIds || input.target_node_ids || planDraft.targetNodeIds),
    limit: input.limit || 12
  };
}

function actionModel(context = {}, input = {}) {
  const readiness = publicReadiness(context);
  const planDraftId = cleanString(input.planDraftId || input.plan_draft_id);
  const selectedItemId = cleanString(input.itemId || input.item_id || input.selectedItemId || input.selected_item_id);
  return {
    canDraft: Boolean(readiness.targetEnabled && readiness.plannerContextReady),
    canPublish: Boolean(planDraftId),
    canAdvance: Boolean(readiness.targetEnabled && readiness.plannerContextReady && readiness.authoringGatewayConfigured),
    advanceAction: {
      method: "POST",
      path: "/api/v1/growth/daily-loop/advance",
      enabled: Boolean(readiness.targetEnabled && readiness.plannerContextReady && readiness.authoringGatewayConfigured)
    },
    draftAction: {
      method: "POST",
      path: "/api/v1/growth/daily-loop/draft",
      enabled: Boolean(readiness.targetEnabled && readiness.plannerContextReady)
    },
    publishAction: {
      method: "POST",
      path: "/api/v1/growth/daily-loop/publish",
      enabled: Boolean(planDraftId),
      planDraftId,
      itemId: selectedItemId
    },
    auditRefreshAction: {
      method: "GET",
      path: "/api/v1/growth/daily-loop/preview",
      enabled: Boolean(shouldReadCycle(input))
    }
  };
}

function createLearningDailyLoopService(options = {}) {
  const contextService = options.contextService || null;
  const planPublisherService = options.planPublisherService || null;
  const cycleAuditService = options.cycleAuditService || null;
  const auditCompletenessService = options.auditCompletenessService || null;

  function contextFor(input = {}) {
    if (!contextService || typeof contextService.context !== "function") {
      return unavailable("learning_daily_loop_context_service_unavailable");
    }
    return contextService.context(input);
  }

  function auditFor(input = {}, context = {}, publishResult = null) {
    if (!shouldReadCycle(input, publishResult)) return null;
    if (!cycleAuditService || typeof cycleAuditService.listCycleAudit !== "function") {
      return unavailable("learning_daily_loop_cycle_audit_service_unavailable");
    }
    return cycleAuditService.listCycleAudit(cycleInput(input, context, publishResult));
  }

  function completenessFor(input = {}, context = {}, publishResult = null) {
    if (!shouldReadCycle(input, publishResult)) return null;
    if (!auditCompletenessService || typeof auditCompletenessService.evaluateCycleCompleteness !== "function") {
      return unavailable("learning_daily_loop_completeness_service_unavailable");
    }
    return auditCompletenessService.evaluateCycleCompleteness(cycleInput(input, context, publishResult));
  }

  function privacyCheck(input = {}) {
    const findings = scanPrivacyKeys(input);
    return findings.length ? unavailable("learning_daily_loop_privacy_failed", { privacyFindings: findings }) : null;
  }

  function preview(input = {}) {
    const privacy = privacyCheck(input);
    if (privacy) return privacy;
    const context = contextFor(input);
    if (!context?.ok) return context || unavailable("learning_daily_loop_context_failed");
    const cycleAudit = auditFor(input, context);
    const completeness = completenessFor(input, context);
    return {
      ok: true,
      source: "growth-learning-daily-loop-service",
      operation: "preview",
      target: publicTarget(input, context),
      scope: publicScope(input, context),
      readiness: publicReadiness(context),
      actions: actionModel(context, input),
      context,
      cycleAudit,
      completeness
    };
  }

  async function advance(input = {}) {
    const privacy = privacyCheck(input);
    if (privacy) return privacy;
    const draftResult = await draft(input);
    if (!draftResult?.ok) {
      return Object.assign({}, draftResult || unavailable("learning_daily_loop_draft_failed"), {
        ok: false,
        operation: "advance",
        stage: "draft",
        draftStep: publicLoopStep(draftResult || {}),
        publishStep: null
      });
    }
    const planDraft = draftResult.planDraft || {};
    const item = planDraft.selectedItem || asArray(planDraft.items)[0] || {};
    const publishInput = Object.assign({}, input, {
      planDraftId: planDraft.planDraftId,
      itemId: planDraft.selectedItemId || item.itemId,
      targetNodeIds: asArray(item.targetNodeIds).length ? item.targetNodeIds : planDraft.targetNodeIds
    });
    const publishResult = await publish(publishInput);
    return Object.assign({}, publishResult || unavailable("learning_daily_loop_publish_failed"), {
      ok: Boolean(publishResult?.ok),
      operation: "advance",
      stage: publishResult?.ok ? "published" : cleanString(publishResult?.stage || "publish"),
      draftStep: publicLoopStep(draftResult),
      publishStep: publicLoopStep(publishResult || {}),
      gatewayMode: cleanString(publishResult?.generation?.gatewayMode || draftResult.gatewayMode),
      error: cleanString(publishResult?.error)
    });
  }

  async function draft(input = {}) {
    const privacy = privacyCheck(input);
    if (privacy) return privacy;
    if (!planPublisherService || typeof planPublisherService.draftPlan !== "function") {
      return unavailable("learning_daily_loop_plan_publisher_unavailable");
    }
    const before = contextFor(input);
    if (!before?.ok) return before || unavailable("learning_daily_loop_context_failed");
    const draftResult = await planPublisherService.draftPlan(input);
    const after = contextFor(input);
    return {
      ok: Boolean(draftResult?.ok),
      source: "growth-learning-daily-loop-service",
      operation: "draft",
      target: publicTarget(input, after?.ok ? after : before),
      scope: publicScope(input, after?.ok ? after : before),
      readiness: publicReadiness(after?.ok ? after : before),
      actions: actionModel(after?.ok ? after : before, Object.assign({}, input, {
        planDraftId: draftResult?.planDraft?.planDraftId
      })),
      planDraft: publicPlanDraft(draftResult?.planDraft),
      duplicate: Boolean(draftResult?.duplicate),
      gatewayMode: cleanString(draftResult?.gatewayMode),
      error: cleanString(draftResult?.error),
      context: after?.ok ? after : before
    };
  }

  async function publish(input = {}) {
    const privacy = privacyCheck(input);
    if (privacy) return privacy;
    if (!planPublisherService || typeof planPublisherService.publishPlanItem !== "function") {
      return unavailable("learning_daily_loop_plan_publisher_unavailable");
    }
    const before = contextFor(input);
    if (!before?.ok) return before || unavailable("learning_daily_loop_context_failed");
    const publishResult = await planPublisherService.publishPlanItem(input);
    const after = contextFor(input);
    const context = after?.ok ? after : before;
    const cycleAudit = auditFor(input, context, publishResult);
    const completeness = completenessFor(input, context, publishResult);
    return {
      ok: Boolean(publishResult?.ok),
      source: "growth-learning-daily-loop-service",
      operation: "publish",
      target: publicTarget(input, context),
      scope: publicScope(input, context),
      readiness: publicReadiness(context),
      actions: actionModel(context, Object.assign({}, input, {
        planDraftId: publishResult?.planDraft?.planDraftId || input.planDraftId || input.plan_draft_id,
        taskCardId: publishResult?.planDraft?.generatedTaskCardId || publishResult?.generation?.published?.taskCardId || input.taskCardId || input.task_card_id
      })),
      planDraft: publicPlanDraft(publishResult?.planDraft),
      selectedItem: publicPlanItem(publishResult?.selectedItem),
      generation: publicGeneration(publishResult?.generation),
      duplicate: Boolean(publishResult?.duplicate),
      error: cleanString(publishResult?.error),
      stage: cleanString(publishResult?.stage),
      publishAttempt: publishResult?.publishAttempt || publishResult?.planDraft?.publishAttempt || null,
      context,
      cycleAudit,
      completeness
    };
  }

  return {
    advance,
    preview,
    draft,
    publish
  };
}

module.exports = {
  createLearningDailyLoopService,
  scanPrivacyKeys
};
