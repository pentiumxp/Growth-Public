"use strict";

function cleanString(value) {
  return String(value || "").trim();
}

function boundedText(value, max = 260) {
  return cleanString(value).slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = [], max = 12) {
  return Array.from(new Set(asArray(values).map((value) => boundedText(value, 160)).filter(Boolean))).slice(0, max);
}

const TYPE_ALIASES = Object.freeze({
  program: "program",
  learning_program: "program",
  task_card: "task_card",
  card: "task_card",
  learning_task_card: "task_card",
  submission: "submission",
  learning_task_submission: "submission",
  evaluation: "evaluation",
  learning_evaluation: "evaluation",
  reflection: "reflection",
  learning_task_reflection: "reflection",
  mastery_profile: "mastery_profile",
  learner_profile: "mastery_profile",
  profile: "mastery_profile",
  learning_graph_plan: "learning_graph_plan",
  graph_plan: "learning_graph_plan",
  plan_draft: "plan_draft",
  learning_plan_draft: "plan_draft"
});

const OBJECT_TYPES = Object.freeze([
  Object.freeze({
    objectType: "program",
    aliases: ["learning_program"],
    idField: "program_id",
    summaryOnly: true,
    supportsGet: true,
    supportsSummarize: true
  }),
  Object.freeze({
    objectType: "task_card",
    aliases: ["card", "learning_task_card"],
    idField: "task_card_id",
    summaryOnly: true,
    supportsGet: true,
    supportsSummarize: true
  }),
  Object.freeze({
    objectType: "submission",
    aliases: ["learning_task_submission"],
    idField: "submission_id",
    summaryOnly: true,
    supportsGet: true,
    supportsSummarize: true
  }),
  Object.freeze({
    objectType: "evaluation",
    aliases: ["learning_evaluation"],
    idField: "evaluation_id",
    summaryOnly: true,
    supportsGet: true,
    supportsSummarize: true
  }),
  Object.freeze({
    objectType: "reflection",
    aliases: ["learning_task_reflection"],
    idField: "reflection_id",
    summaryOnly: true,
    supportsGet: true,
    supportsSummarize: true
  }),
  Object.freeze({
    objectType: "mastery_profile",
    aliases: ["learner_profile", "profile"],
    idField: "learner_id",
    summaryOnly: true,
    supportsGet: true,
    supportsSummarize: true
  }),
  Object.freeze({
    objectType: "learning_graph_plan",
    aliases: ["graph_plan"],
    idField: "learning_graph_plan_id",
    summaryOnly: true,
    supportsGet: true,
    supportsSummarize: true
  }),
  Object.freeze({
    objectType: "plan_draft",
    aliases: ["learning_plan_draft"],
    idField: "plan_draft_id",
    summaryOnly: true,
    supportsGet: true,
    supportsSummarize: true
  })
]);

function canonicalObjectType(value = "") {
  return TYPE_ALIASES[cleanString(value).toLowerCase()] || "";
}

function referenceId(workspaceId, objectType, objectId) {
  return ["growth", workspaceId, objectType, objectId].map(cleanString).filter(Boolean).join(":");
}

function objectRef(workspaceId, objectType, objectId, display = {}) {
  return {
    workspace_id: cleanString(workspaceId),
    plugin_id: "growth",
    object_type: cleanString(objectType),
    object_id: cleanString(objectId),
    display: {
      title: boundedText(display.title, 180),
      subtitle: boundedText(display.subtitle, 260),
      time: boundedText(display.time, 80),
      thumbnail_hint: boundedText(display.thumbnailHint || display.thumbnail_hint, 80)
    }
  };
}

function relatedRef(workspaceId, objectType, objectId, display = {}) {
  const cleanObjectId = cleanString(objectId);
  if (!cleanObjectId) return null;
  return objectRef(workspaceId, objectType, cleanObjectId, display);
}

function compactCard(card = {}) {
  const taskCardId = cleanString(card.taskCardId || card.id);
  const workspaceId = cleanString(card.workspaceId || card.workspace_id);
  const latestSubmission = card.latestSubmission || {};
  const latestEvaluation = card.latestEvaluation || {};
  const latestReflection = card.latestReflection || {};
  const display = {
    title: boundedText(card.title || taskCardId, 180),
    subtitle: [card.domain, card.cardRole, card.status].map(cleanString).filter(Boolean).join(" / "),
    time: cleanString(card.plannedDate || card.generatedAt || card.updatedAt || card.createdAt),
    thumbnailHint: cleanString(card.cardRole || card.activityType || "growth_card")
  };
  return {
    workspaceId,
    objectId: taskCardId,
    display,
    summary: {
      taskCardId,
      programId: cleanString(card.programId),
      draftId: cleanString(card.draftId),
      status: cleanString(card.status),
      domain: cleanString(card.domain),
      cardRole: cleanString(card.cardRole),
      activityType: cleanString(card.activityType),
      plannedDate: cleanString(card.plannedDate),
      plannedMinutes: Number(card.plannedMinutes || 0) || 0,
      expectedDurationMinutes: card.expectedDurationMinutes || null,
      targetNodeIds: uniqueStrings(card.targetNodeIds, 12),
      capabilityClusterId: cleanString(card.capabilityClusterId),
      nextAction: cleanString(card.nextAction || card.primaryAction),
      laneId: cleanString(card.laneId),
      submissionCount: Number(card.submissionCount || card.totalSubmissionCount || 0) || 0,
      evaluationCount: Number(card.evaluationCount || card.totalEvaluationCount || 0) || 0,
      artifactCount: Number(card.artifactCount || 0) || 0,
      latestSubmission: latestSubmission.submissionId ? {
        submissionId: cleanString(latestSubmission.submissionId),
        status: cleanString(latestSubmission.status),
        submittedAt: cleanString(latestSubmission.submittedAt || latestSubmission.createdAt)
      } : null,
      latestEvaluation: latestEvaluation.evaluationId ? {
        evaluationId: cleanString(latestEvaluation.evaluationId),
        status: cleanString(latestEvaluation.status),
        score: Number(latestEvaluation.score || 0) || 0,
        maxScore: Number(latestEvaluation.maxScore || 100) || 100,
        evaluatedAt: cleanString(latestEvaluation.evaluatedAt || latestEvaluation.createdAt)
      } : null,
      latestReflection: latestReflection.reflectionId ? {
        reflectionId: cleanString(latestReflection.reflectionId),
        status: cleanString(latestReflection.status),
        submittedAt: cleanString(latestReflection.submittedAt || latestReflection.createdAt)
      } : null
    },
    relatedObjectRefs: [
      relatedRef(workspaceId, "program", card.programId, { title: card.programId, thumbnailHint: "growth_program" }),
      relatedRef(workspaceId, "submission", latestSubmission.submissionId, { title: "Latest submission", time: latestSubmission.submittedAt }),
      relatedRef(workspaceId, "evaluation", latestEvaluation.evaluationId, { title: "Latest evaluation", time: latestEvaluation.evaluatedAt || latestEvaluation.createdAt }),
      relatedRef(workspaceId, "reflection", latestReflection.reflectionId, { title: "Latest reflection", time: latestReflection.submittedAt })
    ].filter(Boolean)
  };
}

function compactProgram(program = {}) {
  const programId = cleanString(program.programId || program.id);
  return {
    workspaceId: cleanString(program.workspaceId),
    objectId: programId,
    display: {
      title: boundedText(program.title || programId, 180),
      subtitle: [program.domain, program.subject, program.status].map(cleanString).filter(Boolean).join(" / "),
      time: cleanString(program.updatedAt || program.createdAt),
      thumbnailHint: "growth_program"
    },
    summary: {
      programId,
      learnerId: cleanString(program.learnerId),
      status: cleanString(program.status),
      domain: cleanString(program.domain),
      subject: cleanString(program.subject),
      createdAt: cleanString(program.createdAt),
      updatedAt: cleanString(program.updatedAt)
    },
    relatedObjectRefs: []
  };
}

function compactSubmission(submission = {}) {
  const submissionId = cleanString(submission.submissionId || submission.id);
  const workspaceId = cleanString(submission.workspaceId);
  return {
    workspaceId,
    objectId: submissionId,
    display: {
      title: `Submission ${submissionId}`,
      subtitle: [submission.submissionKind, submission.status].map(cleanString).filter(Boolean).join(" / "),
      time: cleanString(submission.submittedAt || submission.createdAt),
      thumbnailHint: "growth_submission"
    },
    summary: {
      submissionId,
      taskCardId: cleanString(submission.taskCardId),
      learnerId: cleanString(submission.learnerId),
      status: cleanString(submission.status),
      submissionKind: cleanString(submission.submissionKind),
      hasAudio: Boolean(submission.hasAudio),
      submittedAt: cleanString(submission.submittedAt),
      createdAt: cleanString(submission.createdAt)
    },
    relatedObjectRefs: [
      relatedRef(workspaceId, "task_card", submission.taskCardId, { title: "Task card", thumbnailHint: "growth_card" })
    ].filter(Boolean)
  };
}

function compactEvaluation(evaluation = {}) {
  const evaluationId = cleanString(evaluation.evaluationId || evaluation.id);
  const workspaceId = cleanString(evaluation.workspaceId);
  return {
    workspaceId,
    objectId: evaluationId,
    display: {
      title: `Evaluation ${evaluationId}`,
      subtitle: [evaluation.status, evaluation.score !== undefined ? `${Number(evaluation.score || 0)}/${Number(evaluation.maxScore || 100) || 100}` : ""].map(cleanString).filter(Boolean).join(" / "),
      time: cleanString(evaluation.evaluatedAt || evaluation.createdAt),
      thumbnailHint: "growth_evaluation"
    },
    summary: {
      evaluationId,
      taskCardId: cleanString(evaluation.taskCardId),
      learnerId: cleanString(evaluation.learnerId),
      status: cleanString(evaluation.status),
      score: Number(evaluation.score || 0) || 0,
      maxScore: Number(evaluation.maxScore || 100) || 100,
      passed: Boolean(evaluation.passed),
      confidence: Number(evaluation.confidence || 0) || 0,
      remainingWeaknessCount: uniqueStrings(evaluation.remainingWeaknesses, 8).length,
      evaluatedAt: cleanString(evaluation.evaluatedAt || evaluation.createdAt)
    },
    relatedObjectRefs: [
      relatedRef(workspaceId, "task_card", evaluation.taskCardId, { title: "Task card", thumbnailHint: "growth_card" })
    ].filter(Boolean)
  };
}

function compactReflection(reflection = {}) {
  const reflectionId = cleanString(reflection.reflectionId || reflection.id);
  const workspaceId = cleanString(reflection.workspaceId);
  return {
    workspaceId,
    objectId: reflectionId,
    display: {
      title: `Reflection ${reflectionId}`,
      subtitle: [reflection.mode, reflection.status].map(cleanString).filter(Boolean).join(" / "),
      time: cleanString(reflection.submittedAt || reflection.createdAt),
      thumbnailHint: "growth_reflection"
    },
    summary: {
      reflectionId,
      taskCardId: cleanString(reflection.taskCardId),
      learnerId: cleanString(reflection.learnerId),
      status: cleanString(reflection.status),
      mode: cleanString(reflection.mode),
      hasAudio: Boolean(reflection.hasAudio),
      submittedAt: cleanString(reflection.submittedAt),
      createdAt: cleanString(reflection.createdAt)
    },
    relatedObjectRefs: [
      relatedRef(workspaceId, "task_card", reflection.taskCardId, { title: "Task card", thumbnailHint: "growth_card" })
    ].filter(Boolean)
  };
}

function compactProfile(profile = {}, objectId = "") {
  const workspaceId = cleanString(profile.workspaceId);
  const learnerId = cleanString(profile.learnerId || objectId || workspaceId);
  const summary = profile.summary || {};
  return {
    workspaceId,
    objectId: learnerId,
    display: {
      title: `Mastery profile ${learnerId}`,
      subtitle: `evidence ${Number(summary.evidenceCount || 0) || 0} / weak ${Number(summary.weaknessCount || 0) || 0}`,
      time: "",
      thumbnailHint: "growth_mastery_profile"
    },
    summary: {
      learnerId,
      programId: cleanString(profile.programId),
      capabilityStateCount: Number(summary.capabilityStateCount || 0) || 0,
      evidenceCount: Number(summary.evidenceCount || 0) || 0,
      strengthCount: Number(summary.strengthCount || 0) || 0,
      weaknessCount: Number(summary.weaknessCount || 0) || 0,
      pressureSignalCount: Number(summary.pressureSignalCount || 0) || 0,
      staleEvidenceCount: Number(summary.staleEvidenceCount || 0) || 0,
      recommendedPlannerStrategy: cleanString(profile.recommendedPlannerHints?.strategy),
      recommendedTargetNodeIds: uniqueStrings(profile.recommendedPlannerHints?.targetNodeIds, 8),
      weaknessNodeIds: uniqueStrings(asArray(profile.weaknesses).map((item) => item.nodeId), 8),
      strengthNodeIds: uniqueStrings(asArray(profile.strengths).map((item) => item.nodeId), 8)
    },
    relatedObjectRefs: []
  };
}

function compactGraphPlan(plan = {}) {
  const workspaceId = cleanString(plan.workspaceId);
  const planId = cleanString(plan.learningGraphPlanId || plan.id);
  return {
    workspaceId,
    objectId: planId,
    display: {
      title: `Learning graph plan ${planId}`,
      subtitle: [plan.domain, plan.subject, plan.targetNodeId].map(cleanString).filter(Boolean).join(" / "),
      time: "",
      thumbnailHint: "growth_graph_plan"
    },
    summary: {
      learningGraphPlanId: planId,
      learnerId: cleanString(plan.learnerId),
      programId: cleanString(plan.programId),
      domainPackId: cleanString(plan.domainPackId),
      domain: cleanString(plan.domain),
      subject: cleanString(plan.subject),
      targetNodeId: cleanString(plan.targetNodeId),
      prerequisiteNodeCount: uniqueStrings(plan.prerequisiteNodeIds, 24).length,
      pathNodeCount: uniqueStrings(plan.pathNodeIds, 40).length,
      assessmentCoverageCount: asArray(plan.assessmentCoverage).length,
      cardSequenceCount: asArray(plan.cardSequence).length,
      privacyClass: cleanString(plan.privacyClass)
    },
    relatedObjectRefs: [
      relatedRef(workspaceId, "program", plan.programId, { title: plan.programId, thumbnailHint: "growth_program" })
    ].filter(Boolean)
  };
}

function compactPlanDraft(draft = {}) {
  const workspaceId = cleanString(draft.workspaceId);
  const planDraftId = cleanString(draft.planDraftId);
  return {
    workspaceId,
    objectId: planDraftId,
    display: {
      title: boundedText(draft.planSummary || `Plan draft ${planDraftId}`, 180),
      subtitle: [draft.horizon, draft.status, draft.context?.subject].map(cleanString).filter(Boolean).join(" / "),
      time: cleanString(draft.updatedAt || draft.createdAt),
      thumbnailHint: "growth_plan_draft"
    },
    summary: {
      planDraftId,
      learnerId: cleanString(draft.learnerId),
      programId: cleanString(draft.programId),
      horizon: cleanString(draft.horizon),
      status: cleanString(draft.status),
      selectedItemId: cleanString(draft.selectedItemId),
      generatedTaskCardId: cleanString(draft.generatedTaskCardId),
      generatedLearningGraphPlanId: cleanString(draft.generatedLearningGraphPlanId),
      itemCount: Number(draft.itemCount || 0) || 0,
      targetNodeIds: uniqueStrings(draft.targetNodeIds, 12),
      domainPackId: cleanString(draft.context?.domainPackId),
      domain: cleanString(draft.context?.domain),
      subject: cleanString(draft.context?.subject),
      privacyClass: cleanString(draft.privacyClass),
      createdAt: cleanString(draft.createdAt),
      updatedAt: cleanString(draft.updatedAt),
      publishedAt: cleanString(draft.publishedAt)
    },
    relatedObjectRefs: [
      relatedRef(workspaceId, "program", draft.programId, { title: draft.programId, thumbnailHint: "growth_program" }),
      relatedRef(workspaceId, "task_card", draft.generatedTaskCardId, { title: "Generated task card", thumbnailHint: "growth_card" }),
      relatedRef(workspaceId, "learning_graph_plan", draft.generatedLearningGraphPlanId, { title: "Generated graph plan", thumbnailHint: "growth_graph_plan" })
    ].filter(Boolean)
  };
}

function compactProjection(objectType, value, objectId) {
  if (!value) return null;
  if (objectType === "program") return compactProgram(value);
  if (objectType === "task_card") return compactCard(value);
  if (objectType === "submission") return compactSubmission(value);
  if (objectType === "evaluation") return compactEvaluation(value);
  if (objectType === "reflection") return compactReflection(value);
  if (objectType === "mastery_profile") return compactProfile(value, objectId);
  if (objectType === "learning_graph_plan") return compactGraphPlan(value);
  if (objectType === "plan_draft") return compactPlanDraft(value);
  return null;
}

function buildReferenceObject({ workspaceId, objectType, objectId, projection, source }) {
  const resolvedWorkspaceId = cleanString(projection.workspaceId) || cleanString(workspaceId);
  const resolvedObjectId = cleanString(projection.objectId) || cleanString(objectId);
  const display = projection.display || {};
  const ref = objectRef(resolvedWorkspaceId, objectType, resolvedObjectId, display);
  return {
    ok: true,
    schemaVersion: "growth.referenceObject.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    pluginId: "growth",
    workspaceId: resolvedWorkspaceId,
    objectType,
    objectId: resolvedObjectId,
    referenceId: referenceId(resolvedWorkspaceId, objectType, resolvedObjectId),
    reference: ref,
    display: ref.display,
    summary: projection.summary || {},
    relatedObjectRefs: asArray(projection.relatedObjectRefs).slice(0, 12),
    source: cleanString(source) || "growth-learning-reference-contract-service",
    permissions: {
      resolvedByOwningPlugin: true,
      fullDetailsRequireOwningPlugin: true
    }
  };
}

function summarizeReferenceObject(referenceObject = {}, purpose = "") {
  const summary = referenceObject.summary || {};
  return {
    ok: referenceObject.ok !== false,
    schemaVersion: "growth.referenceSummary.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    pluginId: "growth",
    workspaceId: cleanString(referenceObject.workspaceId),
    objectType: cleanString(referenceObject.objectType),
    objectId: cleanString(referenceObject.objectId),
    referenceId: cleanString(referenceObject.referenceId),
    purpose: boundedText(purpose, 120),
    display: referenceObject.display || {},
    summary: {
      title: boundedText(referenceObject.display?.title, 180),
      subtitle: boundedText(referenceObject.display?.subtitle, 260),
      status: cleanString(summary.status),
      domain: cleanString(summary.domain),
      subject: cleanString(summary.subject),
      time: cleanString(referenceObject.display?.time),
      counts: {
        evidenceCount: Number(summary.evidenceCount || 0) || 0,
        submissionCount: Number(summary.submissionCount || 0) || 0,
        evaluationCount: Number(summary.evaluationCount || 0) || 0,
        itemCount: Number(summary.itemCount || 0) || 0,
        targetNodeCount: uniqueStrings(summary.targetNodeIds || summary.recommendedTargetNodeIds, 24).length
      },
      targetNodeIds: uniqueStrings(summary.targetNodeIds || summary.recommendedTargetNodeIds, 12),
      relatedObjectCount: asArray(referenceObject.relatedObjectRefs).length
    },
    relatedObjectRefs: asArray(referenceObject.relatedObjectRefs).slice(0, 8),
    permissions: referenceObject.permissions || {},
    source: "growth-learning-reference-contract-service"
  };
}

function createLearningReferenceContractService(options = {}) {
  const repository = options.repository || null;
  const growthService = options.growthService || null;
  const graphRepository = options.graphRepository || null;
  const planDraftRepository = options.planDraftRepository || null;
  const profileV2Service = options.profileV2Service || null;

  function referenceObjectTypes(input = {}) {
    return {
      ok: true,
      schemaVersion: "growth.referenceObjectTypes.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      pluginId: "growth",
      workspaceId: cleanString(input.workspaceId || input.workspace_id),
      status: "v1_minimal",
      objectTypes: OBJECT_TYPES.map((item) => Object.assign({}, item, { aliases: item.aliases.slice() })),
      methods: ["reference_object_types", "reference_get", "reference_summarize"],
      unsupportedMethods: ["reference_search", "reference_resolve"],
      boundaries: {
        summaryOnly: true,
        owningPluginPermissionRequired: true,
        noRawLearnerContent: true,
        noRawPrompts: true,
        noProviderConfig: true
      },
      source: "growth-learning-reference-contract-service"
    };
  }

  async function loadProjection({ workspaceId, objectType, objectId, input }) {
    if (objectType === "task_card") {
      const result = growthService && typeof growthService.card === "function"
        ? await growthService.card({ workspaceId, taskCardId: objectId })
        : null;
      return compactProjection(objectType, result?.card, objectId);
    }
    if (objectType === "mastery_profile") {
      const result = profileV2Service && typeof profileV2Service.profileV2 === "function"
        ? profileV2Service.profileV2({
          workspaceId,
          learnerId: objectId,
          programId: input.programId || input.program_id,
          targetNodeIds: input.targetNodeIds || input.target_node_ids
        })
        : null;
      return result?.ok ? compactProjection(objectType, result, objectId) : null;
    }
    if (objectType === "learning_graph_plan") {
      const result = graphRepository && typeof graphRepository.plan === "function"
        ? graphRepository.plan({ learningGraphPlanId: objectId })
        : null;
      if (result && cleanString(workspaceId) && cleanString(result.workspaceId) && cleanString(result.workspaceId) !== cleanString(workspaceId)) return null;
      return compactProjection(objectType, result, objectId);
    }
    if (objectType === "plan_draft") {
      const result = repository && typeof repository.getPlanDraft === "function"
        ? repository.getPlanDraft({ workspaceId, objectId })
        : planDraftRepository && typeof planDraftRepository.getDraft === "function"
          ? planDraftRepository.getDraft({ workspaceId, planDraftId: objectId })
          : null;
      return compactProjection(objectType, result, objectId);
    }
    const method = {
      program: "getProgram",
      submission: "getSubmission",
      evaluation: "getEvaluation",
      reflection: "getReflection"
    }[objectType];
    if (!method || !repository || typeof repository[method] !== "function") return null;
    return compactProjection(objectType, repository[method]({ workspaceId, objectId }), objectId);
  }

  async function referenceGet(input = {}) {
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    const objectType = canonicalObjectType(input.objectType || input.object_type);
    const objectId = cleanString(input.objectId || input.object_id || input.id);
    if (!workspaceId) return { ok: false, error: "growth_reference_workspace_required" };
    if (!objectType) {
      return {
        ok: false,
        error: "growth_reference_object_type_unsupported",
        allowedObjectTypes: OBJECT_TYPES.map((item) => item.objectType)
      };
    }
    if (!objectId) return { ok: false, error: "growth_reference_object_id_required", objectType };
    const projection = await loadProjection({ workspaceId, objectType, objectId, input });
    if (!projection || !cleanString(projection.objectId)) {
      return {
        ok: false,
        error: "growth_reference_object_not_found",
        pluginId: "growth",
        workspaceId,
        objectType,
        objectId,
        privacyClass: "summary_only",
        summaryOnly: true
      };
    }
    return buildReferenceObject({ workspaceId, objectType, objectId, projection });
  }

  async function referenceSummarize(input = {}) {
    const result = await referenceGet(input);
    if (!result.ok) return result;
    return summarizeReferenceObject(result, input.purpose);
  }

  return {
    referenceGet,
    referenceObjectTypes,
    referenceSummarize
  };
}

module.exports = {
  canonicalObjectType,
  createLearningReferenceContractService,
  OBJECT_TYPES,
  summarizeReferenceObject
};
