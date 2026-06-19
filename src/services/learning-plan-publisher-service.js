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

function boundedText(value, max = 320) {
  return cleanString(value).slice(0, max);
}

function unavailable(error, extra = {}) {
  return Object.assign({ ok: false, error }, extra);
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

function candidateNodeSummary(node = {}) {
  return {
    nodeId: cleanString(node.nodeId),
    title: boundedText(node.title || node.label, 180),
    subject: cleanString(node.subject),
    stage: cleanString(node.stage),
    evidenceRequired: uniqueStrings(node.evidenceRequired).slice(0, 8)
  };
}

function contextSummary(context = {}) {
  return {
    schemaVersion: cleanString(context.schemaVersion),
    target: {
      workspaceId: cleanString(context.target?.workspaceId),
      learnerId: cleanString(context.target?.learnerId),
      displayName: cleanString(context.target?.displayName)
    },
    horizon: cleanString(context.horizon),
    constraints: {
      availableMinutes: Number(context.constraints?.availableMinutes || 0) || 0,
      lowPressure: context.constraints?.lowPressure !== false,
      allowedCardRoles: uniqueStrings(context.constraints?.allowedCardRoles),
      completionPolicy: cleanString(context.constraints?.completionPolicy)
    },
    knowledgeGraph: {
      domainPackId: cleanString(context.knowledgeGraph?.domainPackId),
      domain: cleanString(context.knowledgeGraph?.domain),
      subject: cleanString(context.knowledgeGraph?.subject),
      candidateNodes: asArray(context.knowledgeGraph?.candidateNodes).map(candidateNodeSummary).slice(0, 30)
    },
    profileSummary: {
      strengths: asArray(context.profileSummary?.strengths).slice(0, 8),
      weaknesses: asArray(context.profileSummary?.weaknesses).slice(0, 8),
      pressureSignals: asArray(context.profileSummary?.pressureSignals).slice(0, 8),
      recommendedPlannerHints: asArray(context.profileSummary?.recommendedPlannerHints).slice(0, 8)
    },
    recentEvidence: asArray(context.recentEvidence).map((item) => ({
      evidenceId: cleanString(item.evidenceId),
      sourceType: cleanString(item.sourceType),
      graphNodeIds: uniqueStrings(item.graphNodeIds),
      scoreBand: cleanString(item.scoreBand),
      status: cleanString(item.status),
      summary: boundedText(item.summary || item.summaryText, 240)
    })).slice(0, 20),
    privacy: {
      privacyClass: cleanString(context.privacy?.privacyClass || "summary_only"),
      summaryOnly: context.privacy?.summaryOnly !== false
    }
  };
}

function cardRoleForGeneration(role = "") {
  const cleanRole = cleanString(role).toLowerCase();
  if (cleanRole === "repair") return "teaching";
  if (cleanRole === "stretch") return "practice";
  return cleanRole || "teaching";
}

function selectedItem(draft = {}, itemId = "") {
  const items = asArray(draft.items);
  const id = cleanString(itemId);
  if (!items.length) return null;
  if (!id) return items[0];
  return items.find((item) => cleanString(item.itemId) === id) || null;
}

function isStageAssessmentItem(record = {}, item = {}) {
  return cleanString(record.horizon) === "stage_checkpoint_plan"
    || cleanString(item.cardRole) === "stage_assessment"
    || cleanString(item.pressurePolicy?.completionPolicy) === "formal_assessment";
}

function stageAssessmentActivationSummary(item = {}) {
  const activationPolicy = item.activationPolicy || {};
  return {
    activateThrough: cleanString(activationPolicy.activateThrough || activationPolicy.activate_through),
    assessmentCoverageNodeIds: uniqueStrings(item.assessmentCoverageNodeIds || item.assessmentCoverage || item.targetNodeIds),
    targetNodeIds: uniqueStrings(item.targetNodeIds),
    reason: boundedText(item.reason, 240)
  };
}

function generationInputFromPlanItem(record = {}, item = {}, input = {}, targetProvisioning = {}) {
  const targetNodeIds = uniqueStrings(item.targetNodeIds);
  const originalRole = cleanString(item.cardRole);
  const cardRole = cardRoleForGeneration(originalRole);
  const graphSummary = record.contextSummary?.knowledgeGraph || {};
  const targetSummary = record.contextSummary?.target || {};
  const generationKey = cleanString(input.generationKey || input.generation_key)
    || `${cleanString(record.planDraftId)}:${cleanString(item.itemId)}:${cardRole}`;
  return {
    workspaceId: cleanString(record.workspaceId),
    learnerId: cleanString(record.learnerId || record.workspaceId),
    displayName: cleanString(input.displayName || input.display_name || targetSummary.displayName),
    label: cleanString(input.label || targetSummary.displayName),
    programId: cleanString(record.programId),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id || graphSummary.domainPackId || targetProvisioning.selectedDomainPackId),
    domain: cleanString(input.domain || graphSummary.domain || targetProvisioning.selectedDomain),
    subject: cleanString(input.subject || item.subject || graphSummary.subject || targetProvisioning.selectedSubject),
    targetNodeId: targetNodeIds[0] || "",
    targetNodeIds,
    cardRole,
    difficultyBand: cleanString(item.difficultyBand),
    evidenceRequirements: uniqueStrings(item.evidenceRequirements),
    cardSchemaVersion: cleanString(input.cardSchemaVersion || input.card_schema_version || "growth.card.authoring.v1"),
    recipeId: cleanString(input.recipeId || input.recipe_id),
    learnerSummary: objectOnly(input.learnerSummary || input.learner_summary),
    generationKey,
    sourceSummaries: [{
      sourceKind: "learning_plan_draft",
      sourceRef: `learning_plan_draft:${cleanString(record.planDraftId)}`,
      nodeId: targetNodeIds[0] || "",
      title: boundedText(record.planSummary || item.reason, 180),
      subject: cleanString(item.subject),
      evidenceRequired: uniqueStrings(item.evidenceRequirements),
      plannerCardRole: originalRole,
      publishedCardRole: cardRole,
      privacyClass: "summary_only"
    }]
  };
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function createLearningPlanPublisherService(options = {}) {
  const repository = options.repository || null;
  const orchestratorService = options.orchestratorService || null;
  const cardGenerationService = options.cardGenerationService || null;
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

  function inputWithProvisioning(input = {}, selection = {}) {
    if (!selection?.ok) return input;
    return Object.assign({}, input, {
      domainPackId: cleanString(input.domainPackId || input.domain_pack_id) || cleanString(selection.selectedDomainPackId),
      domain: cleanString(input.domain) || cleanString(selection.selectedDomain),
      subject: cleanString(input.subject) || cleanString(selection.selectedSubject)
    });
  }

  async function draftPlan(input = {}) {
    if (!orchestratorService || typeof orchestratorService.draftPlan !== "function") {
      return unavailable("learning_plan_orchestrator_unavailable");
    }
    if (!repository || typeof repository.saveDraft !== "function") {
      return unavailable("learning_plan_draft_repository_unavailable");
    }
    const targetProvisioning = resolveTargetProvisioning(input);
    if (!targetProvisioning?.ok) return targetProvisioning;
    const result = await orchestratorService.draftPlan(inputWithProvisioning(input, targetProvisioning));
    if (!result?.ok) return result || unavailable("learning_plan_orchestration_failed");
    const summary = contextSummary(result.context || {});
    const privacyFindings = scanPrivacy({ draft: result.draft, contextSummary: summary });
    if (privacyFindings.length) {
      return unavailable("learning_plan_privacy_failed", { privacyFindings });
    }
    const saved = repository.saveDraft({
      workspaceId: summary.target.workspaceId || input.workspaceId || input.workspace_id,
      learnerId: summary.target.learnerId || input.learnerId || input.learner_id,
      programId: input.programId || input.program_id,
      horizon: result.draft.horizon,
      planSummary: result.draft.planSummary,
      draft: result.draft,
      contextSummary: summary,
      validation: {
        ok: true,
        schemaVersion: result.draft.schemaVersion,
        gatewayMode: result.gatewayMode,
        targetProvisioning: {
          mode: cleanString(targetProvisioning.mode),
          selectedDomainPackId: cleanString(targetProvisioning.selectedDomainPackId),
          selectedDomain: cleanString(targetProvisioning.selectedDomain),
          selectedSubject: cleanString(targetProvisioning.selectedSubject)
        }
      },
      source: "growth-learning-plan-publisher-service"
    });
    if (!saved?.ok) return saved || unavailable("learning_plan_draft_save_failed");
    return {
      ok: true,
      source: "growth-learning-plan-publisher-service",
      gatewayMode: result.gatewayMode || "",
      planDraft: saved.planDraft,
      duplicate: Boolean(saved.duplicate)
    };
  }

  function getPlanDraft(input = {}) {
    if (!repository || typeof repository.getDraft !== "function") {
      return unavailable("learning_plan_draft_repository_unavailable");
    }
    const planDraft = repository.getDraft(input);
    if (!planDraft) return unavailable("learning_plan_draft_not_found");
    return { ok: true, planDraft };
  }

  function recordPublishAttempt(planDraft = {}, item = {}, status = "", error = "", stage = "") {
    if (!repository || typeof repository.markPublishAttempt !== "function") return null;
    const result = repository.markPublishAttempt({
      workspaceId: planDraft.workspaceId,
      planDraftId: planDraft.planDraftId,
      selectedItemId: item.itemId,
      status,
      error,
      stage
    });
    return result?.ok ? result : null;
  }

  function publishUnavailable(planDraft = {}, item = {}, error = "", extra = {}) {
    const status = cleanString(extra.publishAttemptStatus || "failed");
    const stage = cleanString(extra.stage || status || "publish");
    const attempt = recordPublishAttempt(planDraft, item, status, error, stage);
    return unavailable(error, Object.assign({}, extra, {
      planDraft: attempt?.planDraft || extra.planDraft || planDraft,
      publishAttempt: attempt?.planDraft?.publishAttempt || null
    }));
  }

  async function publishPlanItem(input = {}) {
    if (!repository || typeof repository.getDraft !== "function" || typeof repository.markPublished !== "function") {
      return unavailable("learning_plan_draft_repository_unavailable");
    }
    const planDraft = repository.getDraft(input);
    if (!planDraft) return unavailable("learning_plan_draft_not_found");
    if (cleanString(planDraft.status) === "published" && cleanString(planDraft.generatedTaskCardId)) {
      return { ok: true, duplicate: true, planDraft };
    }
    const item = selectedItem(planDraft.draft, input.itemId || input.item_id);
    if (!item) {
      return publishUnavailable(planDraft, {
        itemId: cleanString(input.itemId || input.item_id)
      }, "learning_plan_item_not_found", {
        stage: "selection"
      });
    }
    if (!cardGenerationService || typeof cardGenerationService.generateCard !== "function") {
      return publishUnavailable(planDraft, item, "learning_card_generation_service_unavailable", {
        stage: "card_generation"
      });
    }
    if (isStageAssessmentItem(planDraft, item)) {
      return publishUnavailable(planDraft, item, "stage_assessment_activation_required", {
        stage: "stage_assessment_activation",
        publishAttemptStatus: "blocked",
        selectedItem: item,
        stageAssessment: stageAssessmentActivationSummary(item)
      });
    }
    const graphSummary = planDraft.contextSummary?.knowledgeGraph || {};
    const targetSummary = planDraft.contextSummary?.target || {};
    const targetProvisioning = resolveTargetProvisioning({
      workspaceId: planDraft.workspaceId,
      learnerId: planDraft.learnerId,
      displayName: input.displayName || input.display_name || targetSummary.displayName,
      label: input.label || targetSummary.displayName,
      programId: planDraft.programId,
      domainPackId: input.domainPackId || input.domain_pack_id || graphSummary.domainPackId,
      domain: input.domain || graphSummary.domain,
      subject: input.subject || item.subject || graphSummary.subject,
      targetNodeIds: item.targetNodeIds
    });
    if (!targetProvisioning?.ok) {
      return publishUnavailable(planDraft, item, targetProvisioning.error || "learning_target_not_provisioned", {
        stage: "provisioning",
        targetProvisioning: targetProvisioning.targetProvisioning || targetProvisioning
      });
    }
    const generationInput = generationInputFromPlanItem(planDraft, item, input, targetProvisioning);
    const privacyFindings = scanPrivacy(generationInput);
    if (privacyFindings.length) {
      return publishUnavailable(planDraft, item, "learning_plan_publish_privacy_failed", {
        stage: "privacy_validation",
        privacyFindings
      });
    }
    const generation = await cardGenerationService.generateCard(generationInput);
    if (!generation?.ok) {
      return publishUnavailable(planDraft, item, generation?.error || "learning_plan_publish_generation_failed", {
        stage: generation?.stage || "card_generation",
        selectedItem: item,
        generation
      });
    }
    const marked = repository.markPublished({
      workspaceId: planDraft.workspaceId,
      planDraftId: planDraft.planDraftId,
      selectedItemId: item.itemId,
      generatedTaskCardId: generation.published?.taskCardId,
      generatedLearningGraphPlanId: generation.learningGraphPlan?.learningGraphPlanId
    });
    if (!marked?.ok) return marked || unavailable("learning_plan_publish_mark_failed", { generation });
    return {
      ok: true,
      source: "growth-learning-plan-publisher-service",
      planDraft: marked.planDraft,
      selectedItem: item,
      generation
    };
  }

  return {
    draftPlan,
    getPlanDraft,
    publishPlanItem
  };
}

module.exports = {
  cardRoleForGeneration,
  contextSummary,
  createLearningPlanPublisherService,
  generationInputFromPlanItem
};
