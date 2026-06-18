"use strict";

function cleanString(value) {
  return String(value || "").trim();
}

function parsePlanText(text = "") {
  try {
    return { ok: true, draft: JSON.parse(String(text || "")) };
  } catch (err) {
    return { ok: false, error: "learning_plan_invalid_json", detail: cleanString(err.message || err) };
  }
}

function boundedContextSummary(context = {}) {
  return {
    schemaVersion: cleanString(context.schemaVersion),
    horizon: cleanString(context.horizon),
    workspaceId: cleanString(context.target?.workspaceId),
    learnerId: cleanString(context.target?.learnerId),
    domainPackId: cleanString(context.knowledgeGraph?.domainPackId),
    domain: cleanString(context.knowledgeGraph?.domain),
    subject: cleanString(context.knowledgeGraph?.subject),
    candidateNodeCount: Array.isArray(context.knowledgeGraph?.candidateNodes)
      ? context.knowledgeGraph.candidateNodes.length
      : 0,
    recentEvidenceCount: Array.isArray(context.recentEvidence) ? context.recentEvidence.length : 0,
    privacyClass: cleanString(context.privacy?.privacyClass || "summary_only")
  };
}

function createLearningPlanOrchestratorService(options = {}) {
  const plannerContextService = options.plannerContextService || null;
  const gatewayClient = options.gatewayClient || null;
  const validationService = options.validationService || null;

  async function draftPlan(input = {}) {
    if (!plannerContextService || typeof plannerContextService.plannerContext !== "function") {
      return { ok: false, error: "learning_planner_context_service_unavailable" };
    }
    if (!gatewayClient || typeof gatewayClient.draftLearningPlan !== "function") {
      return { ok: false, error: "learning_planner_gateway_unavailable" };
    }
    if (!validationService || typeof validationService.validatePlanDraft !== "function") {
      return { ok: false, error: "learning_plan_validation_service_unavailable" };
    }
    const context = plannerContextService.plannerContext(input);
    if (!context?.ok) return context;
    const gateway = await gatewayClient.draftLearningPlan(context);
    if (!gateway?.ok) return Object.assign({ context }, gateway, { ok: false });
    const parsed = parsePlanText(gateway.text);
    if (!parsed.ok) return Object.assign({ context, gatewayMode: gateway.mode || "" }, parsed);
    const validation = validationService.validatePlanDraft({ draft: parsed.draft, context });
    if (!validation.ok) {
      return Object.assign({ context, gatewayMode: gateway.mode || "", rawDraft: parsed.draft }, validation);
    }
    return {
      ok: true,
      source: "growth-learning-plan-orchestrator-service",
      context,
      gatewayMode: gateway.mode || "",
      draft: validation.draft
    };
  }

  async function smokePlannerReadiness(input = {}) {
    const result = await draftPlan(Object.assign({}, input, {
      horizon: input.horizon || "daily_plan",
      availableMinutes: input.availableMinutes || 15,
      lowPressure: input.lowPressure !== false
    }));
    if (!result?.ok) {
      return {
        ok: false,
        source: "growth-learning-plan-orchestrator-service",
        error: cleanString(result?.error || "learning_planner_smoke_failed"),
        status: result?.status,
        gatewayErrorCode: cleanString(result?.gatewayErrorCode),
        gatewayErrorType: cleanString(result?.gatewayErrorType),
        gatewayErrorStatus: cleanString(result?.gatewayErrorStatus),
        retryable: Boolean(result?.retryable),
        gatewayMode: cleanString(result?.gatewayMode || result?.mode),
        context: boundedContextSummary(result?.context || {})
      };
    }
    return {
      ok: true,
      source: "growth-learning-plan-orchestrator-service",
      gatewayMode: cleanString(result.gatewayMode),
      context: boundedContextSummary(result.context || {}),
      draftSummary: {
        schemaVersion: cleanString(result.draft?.schemaVersion),
        horizon: cleanString(result.draft?.horizon),
        itemCount: Array.isArray(result.draft?.items) ? result.draft.items.length : 0,
        targetNodeIds: Array.isArray(result.draft?.items?.[0]?.targetNodeIds)
          ? result.draft.items[0].targetNodeIds.map(cleanString).filter(Boolean).slice(0, 8)
          : []
      }
    };
  }

  return {
    draftPlan,
    smokePlannerReadiness
  };
}

module.exports = {
  createLearningPlanOrchestratorService,
  parsePlanText
};
