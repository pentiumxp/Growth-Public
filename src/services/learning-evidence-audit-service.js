"use strict";

function cleanString(value) {
  return String(value ?? "").trim();
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

function publicRubricPolicy(policy = {}) {
  const source = policy && typeof policy === "object" && !Array.isArray(policy) ? policy : {};
  return {
    schemaVersion: cleanString(source.schemaVersion),
    policyId: cleanString(source.policyId),
    recipeId: cleanString(source.recipeId),
    domain: cleanString(source.domain),
    subject: cleanString(source.subject),
    dimensionIds: uniqueStrings(
      source.dimensionIds || asArray(source.rubricDimensions).map((item) => item?.dimensionId)
    ).slice(0, 12),
    evidenceKeys: uniqueStrings(
      source.evidenceKeys || asArray(source.evidenceMapping).map((item) => item?.evidenceKey)
    ).slice(0, 12)
  };
}

function publicRubricResult(item = {}) {
  const source = item && typeof item === "object" && !Array.isArray(item) ? item : {};
  return {
    dimensionId: cleanString(source.dimensionId || source.rubricDimensionId),
    nodeId: cleanString(source.nodeId || source.graphNodeId || source.targetNodeId),
    scoreBand: cleanString(source.scoreBand),
    status: cleanString(source.status),
    evidenceType: cleanString(source.evidenceType || source.type),
    evidenceTags: uniqueStrings(source.evidenceTags || source.tags).slice(0, 8),
    evidenceSummary: boundedText(source.evidenceSummary || source.summary || source.evidence, 180)
  };
}

function weakRubricDimensionIds(results = []) {
  return uniqueStrings(asArray(results).filter((item) => {
    const status = cleanString(item.status).toLowerCase();
    const scoreBand = cleanString(item.scoreBand).toLowerCase();
    return scoreBand === "low" || ["weak", "needs_repair", "misconception", "developing"].includes(status);
  }).map((item) => item.dimensionId)).slice(0, 12);
}

function stableRubricDimensionIds(results = []) {
  return uniqueStrings(asArray(results).filter((item) => {
    const status = cleanString(item.status).toLowerCase();
    const scoreBand = cleanString(item.scoreBand).toLowerCase();
    return scoreBand === "high" || ["stable", "mastered"].includes(status);
  }).map((item) => item.dimensionId)).slice(0, 12);
}

function publicRubricProjection(summary = {}) {
  const rubricPolicy = publicRubricPolicy(summary.rubricPolicy || summary.rubric_policy || {});
  const rubricResults = asArray(summary.rubricResults || summary.rubric_results)
    .map(publicRubricResult)
    .filter((item) => item.dimensionId)
    .slice(0, 8);
  const rubricDimensionIds = uniqueStrings(rubricResults.map((item) => item.dimensionId)).slice(0, 12);
  const rubricEvidenceTypes = uniqueStrings(
    summary.evidenceTypes || summary.evidence_types || rubricResults.map((item) => item.evidenceType)
  ).slice(0, 12);
  return {
    rubricPolicyId: cleanString(summary.rubricPolicyId || summary.rubric_policy_id || rubricPolicy.policyId),
    rubricPolicy,
    rubricResults,
    rubricResultCount: rubricResults.length,
    rubricDimensionIds,
    rubricEvidenceTypes,
    rubricWeakDimensionIds: weakRubricDimensionIds(rubricResults),
    rubricStableDimensionIds: stableRubricDimensionIds(rubricResults)
  };
}

function clampLimit(value, fallback = 20) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(100, Math.round(parsed)));
}

function publicEvidenceSummary(summary = {}) {
  return Object.assign({
    summaryOnly: summary.summaryOnly !== false,
    taskCardId: cleanString(summary.taskCardId),
    title: boundedText(summary.title, 120),
    scoreBand: cleanString(summary.scoreBand),
    status: cleanString(summary.status),
    feedbackSummary: boundedText(summary.feedbackSummary || summary.summary || summary.reflectionSummary, 260),
    strengths: asArray(summary.strengths).map((item) => boundedText(item, 140)).filter(Boolean).slice(0, 4),
    remainingWeaknesses: asArray(summary.remainingWeaknesses).map((item) => boundedText(item, 140)).filter(Boolean).slice(0, 4),
    signalType: cleanString(summary.signalType),
    strength: cleanString(summary.strength),
    reflectionMode: cleanString(summary.reflectionMode),
    reflectionSummary: boundedText(summary.reflectionSummary, 220),
    evidenceRole: cleanString(summary.evidenceRole),
    correctionId: cleanString(summary.correctionId),
    reviewAction: cleanString(summary.reviewAction),
    correctionStatus: cleanString(summary.correctionStatus),
    reason: boundedText(summary.reason, 260),
    note: boundedText(summary.note, 260),
    profileDeltaId: cleanString(summary.profileDeltaId),
    evaluationId: cleanString(summary.evaluationId),
    sourceEvidenceIds: uniqueStrings(summary.sourceEvidenceIds || []).slice(0, 12),
    selectedDomainPackId: cleanString(summary.selectedDomainPackId),
    selectedSubject: cleanString(summary.selectedSubject)
  }, publicRubricProjection(summary));
}

function publicEvidenceAuditItem(item = {}) {
  return {
    evidenceId: cleanString(item.evidenceId),
    workspaceId: cleanString(item.workspaceId),
    learnerId: cleanString(item.learnerId),
    programId: cleanString(item.programId),
    graphNodeId: cleanString(item.graphNodeId),
    graphNodeIds: uniqueStrings(item.graphNodeIds).slice(0, 12),
    sourceType: cleanString(item.sourceType),
    sourceId: cleanString(item.sourceId),
    sourceTaskCardId: cleanString(item.sourceTaskCardId),
    cardRole: cleanString(item.cardRole),
    evidenceWeight: Number(item.evidenceWeight || 0) || 0,
    confidence: Number(item.confidence || 0) || 0,
    scoreBand: cleanString(item.scoreBand),
    status: cleanString(item.status),
    summary: publicEvidenceSummary(item.summary || {}),
    privacyClass: cleanString(item.privacyClass),
    createdAt: cleanString(item.createdAt),
    updatedAt: cleanString(item.updatedAt)
  };
}

function latestTimestamp(items = [], key) {
  return asArray(items)
    .map((item) => cleanString(item[key]))
    .filter(Boolean)
    .sort()
    .pop() || "";
}

function countBySourceType(items = []) {
  return asArray(items).reduce((summary, item) => {
    const sourceType = cleanString(item.sourceType) || "unknown";
    summary[sourceType] = (summary[sourceType] || 0) + 1;
    return summary;
  }, {});
}

function rubricAuditSummary(items = []) {
  const summaries = asArray(items).map((item) => item.summary || {});
  return {
    rubricEvidenceCount: summaries.filter((summary) => Number(summary.rubricResultCount || 0) > 0).length,
    rubricPolicyIds: uniqueStrings(summaries.map((summary) => summary.rubricPolicyId)).slice(0, 12),
    rubricDimensionIds: uniqueStrings(summaries.flatMap((summary) => summary.rubricDimensionIds || [])).slice(0, 12),
    rubricEvidenceTypes: uniqueStrings(summaries.flatMap((summary) => summary.rubricEvidenceTypes || [])).slice(0, 12),
    rubricWeakDimensionIds: uniqueStrings(summaries.flatMap((summary) => summary.rubricWeakDimensionIds || [])).slice(0, 12),
    rubricStableDimensionIds: uniqueStrings(summaries.flatMap((summary) => summary.rubricStableDimensionIds || [])).slice(0, 12)
  };
}

function createLearningEvidenceAuditService(options = {}) {
  const evidenceLedgerService = options.evidenceLedgerService || null;

  function listEvidenceAudit(input = {}) {
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    if (!workspaceId) return { ok: false, error: "learning_evidence_audit_workspace_required" };
    if (!evidenceLedgerService || typeof evidenceLedgerService.listEvidence !== "function") {
      return { ok: false, available: false, error: "learning_evidence_audit_ledger_unavailable" };
    }
    const learnerId = cleanString(input.learnerId || input.learner_id);
    const programId = cleanString(input.programId || input.program_id);
    const targetNodeIds = uniqueStrings(input.targetNodeIds || input.target_node_ids || input.graphNodeIds || input.graph_node_ids || input.nodeIds || input.node_ids).slice(0, 12);
    const filters = {
      evidenceId: cleanString(input.evidenceId || input.evidence_id),
      sourceType: cleanString(input.sourceType || input.source_type),
      sourceId: cleanString(input.sourceId || input.source_id),
      taskCardId: cleanString(input.taskCardId || input.task_card_id || input.sourceTaskCardId || input.source_task_card_id),
      cardRole: cleanString(input.cardRole || input.card_role),
      status: cleanString(input.status),
      targetNodeIds,
      limit: clampLimit(input.limit)
    };
    const evidence = evidenceLedgerService.listEvidence({
      workspaceId,
      learnerId,
      programId,
      evidenceId: filters.evidenceId,
      sourceType: filters.sourceType,
      sourceId: filters.sourceId,
      sourceTaskCardId: filters.taskCardId,
      cardRole: filters.cardRole,
      status: filters.status,
      graphNodeIds: targetNodeIds,
      limit: filters.limit
    });
    const items = asArray(evidence)
      .map(publicEvidenceAuditItem)
      .filter((item) => item.evidenceId)
      .filter((item) => !item.privacyClass || item.privacyClass === "summary_only")
      .slice(0, filters.limit);
    return {
      ok: true,
      available: true,
      source: "growth-learning-evidence-audit-service",
      target: {
        workspaceId,
        learnerId: learnerId || workspaceId,
        displayName: cleanString(input.displayName || input.label)
      },
      filters: {
        programId,
        evidenceId: filters.evidenceId,
        sourceType: filters.sourceType,
        sourceId: filters.sourceId,
        taskCardId: filters.taskCardId,
        cardRole: filters.cardRole,
        status: filters.status,
        targetNodeIds,
        limit: filters.limit
      },
      summary: Object.assign({
        evidenceCount: items.length,
        sourceTypeCounts: countBySourceType(items),
        latestEvidenceAt: latestTimestamp(items, "createdAt")
      }, rubricAuditSummary(items)),
      count: items.length,
      evidence: items
    };
  }

  return {
    listEvidenceAudit
  };
}

module.exports = {
  createLearningEvidenceAuditService
};
