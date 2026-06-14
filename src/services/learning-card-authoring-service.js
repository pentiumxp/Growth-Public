"use strict";

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unavailable(error, extra = {}) {
  return Object.assign({ ok: false, error }, extra);
}

function boundedObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function structuredAuthoringInput(input = {}) {
  const plan = boundedObject(input.learningGraphPlan);
  return {
    learningGraphPlan: plan,
    learnerSummary: boundedObject(input.learnerSummary),
    masterySummary: boundedObject(input.masterySummary),
    recentExperienceSignals: asArray(input.recentExperienceSignals).slice(0, 20),
    recentTrajectory: asArray(input.recentTrajectory).slice(0, 8),
    nextCardStrategy: boundedObject(input.nextCardStrategy),
    cardRole: cleanString(input.cardRole || plan.cardSequence?.[0]?.cardRole || "teaching"),
    difficultyBand: cleanString(input.difficultyBand || plan.cardSequence?.[0]?.difficultyBand || ""),
    evidenceRequirements: asArray(input.evidenceRequirements || plan.cardSequence?.[0]?.evidenceRequired).slice(0, 20),
    cardSchemaVersion: cleanString(input.cardSchemaVersion || "growth.card.authoring.v1"),
    sourceSummaries: asArray(input.sourceSummaries).slice(0, 12)
  };
}

function normalizeValidationFailure(result = {}, stage = "validation") {
  return unavailable(result.error || "card_authoring_validation_failed", {
    stage,
    errors: result.errors || [],
    privacyFindings: result.privacyFindings || []
  });
}

async function publishDraft(publisher, input = {}) {
  if (!publisher) return unavailable("card_authoring_publisher_unavailable", { stage: "publish" });
  const publish = publisher.publishAuthoringDraft || publisher.publishCardDraft || publisher.publish;
  if (typeof publish !== "function") return unavailable("card_authoring_publisher_unavailable", { stage: "publish" });
  try {
    const result = await publish.call(publisher, input);
    if (!result || result.ok === false) {
      return unavailable(cleanString(result?.error) || "card_authoring_publish_failed", {
        stage: "publish",
        publisherResult: result || null
      });
    }
    return result;
  } catch (err) {
    return unavailable("card_authoring_publish_failed", {
      stage: "publish",
      detail: cleanString(err.message || err)
    });
  }
}

function createLearningCardAuthoringService(options = {}) {
  const gatewayClient = options.gatewayClient;
  const validationService = options.validationService;
  const publisher = options.publisher || null;
  const allowRepair = options.allowRepair !== false;
  const now = typeof options.now === "function" ? options.now : () => new Date();

  async function authorCard(input = {}) {
    if (!gatewayClient || typeof gatewayClient.generateCardDraft !== "function") {
      return unavailable("growth_gateway_authoring_client_unavailable", { stage: "gateway" });
    }
    if (!validationService || typeof validationService.parseAndValidateDraft !== "function") {
      return unavailable("card_authoring_validation_service_unavailable", { stage: "validation" });
    }
    const request = structuredAuthoringInput(input);
    const context = {
      learningGraphPlan: request.learningGraphPlan,
      cardRole: request.cardRole,
      cardSchemaVersion: request.cardSchemaVersion
    };
    const gatewayResult = await gatewayClient.generateCardDraft(request);
    if (!gatewayResult?.ok) {
      return unavailable(gatewayResult?.error || "gateway_authoring_failed", {
        stage: "gateway",
        gatewayResult
      });
    }
    let validation = validationService.parseAndValidateDraft({
      text: gatewayResult.text,
      context
    });
    let repairResult = null;
    if (!validation.ok && allowRepair && typeof gatewayClient.repairCardDraft === "function") {
      repairResult = await gatewayClient.repairCardDraft({
        request,
        invalidOutput: gatewayResult.text,
        errors: validation.errors || [{ code: validation.error || "invalid_authoring_draft" }]
      });
      if (repairResult?.ok) {
        validation = validationService.parseAndValidateDraft({
          text: repairResult.text,
          context
        });
      }
    }
    if (!validation.ok) {
      return Object.assign(normalizeValidationFailure(validation), {
        gatewayMode: gatewayResult.mode,
        repairAttempted: Boolean(repairResult),
        repairError: repairResult && repairResult.ok === false ? repairResult.error : ""
      });
    }
    const published = await publishDraft(publisher, {
      draft: validation.draft,
      request,
      generationKey: cleanString(input.generationKey || input.generation_key),
      taskCardId: cleanString(input.taskCardId || input.task_card_id),
      learningGraphPlan: request.learningGraphPlan,
      audit: {
        source: "growth-card-authoring-service",
        gatewayMode: repairResult?.ok ? repairResult.mode : gatewayResult.mode,
        repaired: Boolean(repairResult?.ok),
        authoredAt: now().toISOString()
      }
    });
    if (!published.ok) return published;
    return {
      ok: true,
      source: "growth-card-authoring-service",
      draft: validation.draft,
      published,
      gatewayMode: repairResult?.ok ? repairResult.mode : gatewayResult.mode,
      repaired: Boolean(repairResult?.ok)
    };
  }

  return {
    authorCard,
    structuredAuthoringInput
  };
}

module.exports = {
  createLearningCardAuthoringService,
  structuredAuthoringInput
};
