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

function clampLimit(value, fallback = 12) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(25, Math.round(parsed)));
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
    planDraftId: cleanString(input.planDraftId || input.plan_draft_id, 120),
    taskCardId: cleanString(input.taskCardId || input.task_card_id || input.sourceTaskCardId || input.source_task_card_id, 120),
    evaluationId: cleanString(input.evaluationId || input.evaluation_id, 120),
    profileDeltaId: cleanString(input.profileDeltaId || input.profile_delta_id, 120),
    evidenceId: cleanString(input.evidenceId || input.evidence_id, 120),
    correctionId: cleanString(input.correctionId || input.correction_id, 120),
    sourceId: cleanString(input.sourceId || input.source_id, 120),
    targetNodeIds: uniqueStrings(input.targetNodeIds || input.target_node_ids || input.nodeIds || input.node_ids).slice(0, 12),
    limit: clampLimit(input.limit),
    includeCompleteness: input.includeCompleteness === false || input.include_completeness === false || input.includeCompleteness === "false" || input.include_completeness === "false" ? false : true
  };
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

function latestTimestamp(values = []) {
  return uniqueStrings(values).sort().pop() || "";
}

function cycleKeyFrom(fields = {}) {
  return cleanString(
    fields.taskCardId
    || fields.evaluationId
    || fields.profileDeltaId
    || fields.evidenceId
    || fields.planDraftId
    || fields.correctionId
    || fields.sourceId,
    160
  );
}

function targetNodeIdsFrom(item = {}) {
  return uniqueStrings([
    item.graphNodeId,
    ...uniqueStrings(item.graphNodeIds),
    ...uniqueStrings(item.targetNodeIds),
    ...asArray(item.changedCapabilities).flatMap((entry) => [entry.nodeId, entry.graphNodeId])
  ]).slice(0, 12);
}

function mergeUnique(left = [], right = []) {
  return uniqueStrings([...uniqueStrings(left), ...uniqueStrings(right)]).slice(0, 12);
}

function createEmptyCycle(key, scope = {}) {
  return {
    cycleId: key,
    workspaceId: scope.workspaceId,
    learnerId: scope.learnerId || scope.workspaceId,
    programId: scope.programId,
    selectors: {
      planDraftId: "",
      taskCardId: "",
      evaluationId: "",
      profileDeltaId: "",
      evidenceId: "",
      correctionId: "",
      sourceId: "",
      targetNodeIds: []
    },
    counts: {
      planDrafts: 0,
      evidence: 0,
      profileDeltas: 0,
      corrections: 0
    },
    status: "history_item",
    cardRole: "",
    scoreBand: "",
    latestActivityAt: "",
    title: "",
    summary: "",
    completeness: {
      available: false,
      complete: false,
      readyForAutomation: false,
      missingRequired: []
    }
  };
}

function ensureCycle(cycles, key, scope) {
  const normalizedKey = cleanString(key, 160);
  if (!normalizedKey) return null;
  if (!cycles.has(normalizedKey)) cycles.set(normalizedKey, createEmptyCycle(normalizedKey, scope));
  return cycles.get(normalizedKey);
}

function applySelectors(cycle, fields = {}) {
  cycle.selectors.planDraftId = cycle.selectors.planDraftId || cleanString(fields.planDraftId, 120);
  cycle.selectors.taskCardId = cycle.selectors.taskCardId || cleanString(fields.taskCardId, 120);
  cycle.selectors.evaluationId = cycle.selectors.evaluationId || cleanString(fields.evaluationId, 120);
  cycle.selectors.profileDeltaId = cycle.selectors.profileDeltaId || cleanString(fields.profileDeltaId, 120);
  cycle.selectors.evidenceId = cycle.selectors.evidenceId || cleanString(fields.evidenceId, 120);
  cycle.selectors.correctionId = cycle.selectors.correctionId || cleanString(fields.correctionId, 120);
  cycle.selectors.sourceId = cycle.selectors.sourceId || cleanString(fields.sourceId, 120);
  cycle.selectors.targetNodeIds = mergeUnique(cycle.selectors.targetNodeIds, fields.targetNodeIds);
}

function updateLatest(cycle, values = []) {
  cycle.latestActivityAt = latestTimestamp([cycle.latestActivityAt, ...values]);
}

function applyPlan(cycles, scope, item = {}) {
  const planDraftId = cleanString(item.planDraftId, 120);
  const taskCardId = cleanString(item.generatedTaskCardId, 120);
  const key = cycleKeyFrom({ taskCardId, planDraftId });
  const cycle = ensureCycle(cycles, key, scope);
  if (!cycle) return;
  cycle.counts.planDrafts += 1;
  applySelectors(cycle, {
    planDraftId,
    taskCardId,
    targetNodeIds: item.targetNodeIds
  });
  cycle.status = cleanString(item.publishAttempt?.status) === "failed"
    ? "failed_publish"
    : cleanString(item.publishAttempt?.status) === "blocked"
      ? "blocked_publish"
      : cleanString(item.status) || cycle.status;
  cycle.title = cycle.title || cleanString(item.selectedItem?.reason || item.planSummary, 120);
  cycle.summary = cycle.summary || cleanString(item.planSummary || item.selectedItem?.reason, 220);
  updateLatest(cycle, [item.publishedAt, item.updatedAt, item.createdAt, item.publishAttempt?.attemptedAt]);
}

function applyEvidence(cycles, scope, item = {}) {
  const evidenceId = cleanString(item.evidenceId, 120);
  const taskCardId = cleanString(item.sourceTaskCardId || item.summary?.taskCardId, 120);
  const sourceId = cleanString(item.sourceId, 120);
  const evaluationId = cleanString(item.summary?.evaluationId || (cleanString(item.sourceType).includes("evaluation") ? sourceId : ""), 120);
  const key = cycleKeyFrom({ taskCardId, evaluationId, evidenceId, sourceId });
  const cycle = ensureCycle(cycles, key, scope);
  if (!cycle) return;
  cycle.counts.evidence += 1;
  applySelectors(cycle, {
    taskCardId,
    evaluationId,
    evidenceId,
    sourceId,
    targetNodeIds: targetNodeIdsFrom(item)
  });
  cycle.status = cycle.status === "history_item" ? "evidence_recorded" : cycle.status;
  cycle.cardRole = cycle.cardRole || cleanString(item.cardRole, 80);
  cycle.scoreBand = cycle.scoreBand || cleanString(item.scoreBand || item.summary?.scoreBand, 80);
  cycle.title = cycle.title || cleanString(item.summary?.title, 120);
  cycle.summary = cycle.summary || cleanString(item.summary?.feedbackSummary || item.summary?.summary || item.summary?.reflectionSummary, 220);
  updateLatest(cycle, [item.createdAt, item.updatedAt]);
}

function applyProfileDelta(cycles, scope, item = {}) {
  const profileDeltaId = cleanString(item.profileDeltaId, 120);
  const taskCardId = cleanString(item.taskCardId, 120);
  const evaluationId = cleanString(item.evaluationId, 120);
  const key = cycleKeyFrom({ taskCardId, evaluationId, profileDeltaId });
  const cycle = ensureCycle(cycles, key, scope);
  if (!cycle) return;
  cycle.counts.profileDeltas += 1;
  applySelectors(cycle, {
    taskCardId,
    evaluationId,
    profileDeltaId,
    targetNodeIds: targetNodeIdsFrom(item)
  });
  cycle.status = item.profileStateChanged ? "profile_changed" : (cycle.status === "history_item" ? "profile_observed" : cycle.status);
  cycle.summary = cycle.summary || cleanString(item.summary?.note || `${Number(item.changedCapabilityCount || 0) || 0} changed capabilities`, 220);
  updateLatest(cycle, [item.createdAt, item.updatedAt]);
}

function applyCorrection(cycles, scope, item = {}) {
  const correctionId = cleanString(item.correctionId, 120);
  const taskCardId = cleanString(item.taskCardId, 120);
  const evaluationId = cleanString(item.evaluationId, 120);
  const profileDeltaId = cleanString(item.profileDeltaId, 120);
  const key = cycleKeyFrom({ taskCardId, evaluationId, profileDeltaId, correctionId });
  const cycle = ensureCycle(cycles, key, scope);
  if (!cycle) return;
  cycle.counts.corrections += 1;
  applySelectors(cycle, {
    taskCardId,
    evaluationId,
    profileDeltaId,
    correctionId,
    targetNodeIds: item.targetNodeIds
  });
  cycle.status = "owner_reviewed";
  cycle.summary = cycle.summary || cleanString(item.reason || item.note, 220);
  updateLatest(cycle, [item.createdAt, item.updatedAt]);
}

function completenessSummary(result = {}) {
  return {
    available: result.ok === true && result.available !== false,
    complete: Boolean(result.complete),
    readyForAutomation: Boolean(result.readyForAutomation),
    missingRequired: uniqueStrings(result.summary?.missingRequired || result.missingRequired).slice(0, 12)
  };
}

function scalarSelectorMatches(selectors = {}, scope = {}, key) {
  const expected = cleanString(scope[key], 160);
  if (!expected) return true;
  return cleanString(selectors[key], 160) === expected;
}

function targetSelectorsMatch(selectors = {}, scope = {}) {
  if (!scope.targetNodeIds.length) return true;
  const actual = uniqueStrings(selectors.targetNodeIds);
  return scope.targetNodeIds.some((nodeId) => actual.includes(nodeId));
}

function cycleMatchesScope(cycle = {}, scope = {}) {
  const selectors = cycle.selectors || {};
  return [
    "planDraftId",
    "taskCardId",
    "evaluationId",
    "profileDeltaId",
    "evidenceId",
    "correctionId",
    "sourceId"
  ].every((key) => scalarSelectorMatches(selectors, scope, key)) && targetSelectorsMatch(selectors, scope);
}

function publicCycle(cycle = {}) {
  return {
    cycleId: cleanString(cycle.cycleId, 160),
    workspaceId: cleanString(cycle.workspaceId, 120),
    learnerId: cleanString(cycle.learnerId, 120),
    programId: cleanString(cycle.programId, 120),
    selectors: {
      planDraftId: cleanString(cycle.selectors.planDraftId, 120),
      taskCardId: cleanString(cycle.selectors.taskCardId, 120),
      evaluationId: cleanString(cycle.selectors.evaluationId, 120),
      profileDeltaId: cleanString(cycle.selectors.profileDeltaId, 120),
      evidenceId: cleanString(cycle.selectors.evidenceId, 120),
      correctionId: cleanString(cycle.selectors.correctionId, 120),
      sourceId: cleanString(cycle.selectors.sourceId, 120),
      targetNodeIds: uniqueStrings(cycle.selectors.targetNodeIds).slice(0, 12)
    },
    status: cleanString(cycle.status, 80),
    cardRole: cleanString(cycle.cardRole, 80),
    scoreBand: cleanString(cycle.scoreBand, 80),
    counts: {
      planDrafts: Number(cycle.counts.planDrafts || 0) || 0,
      evidence: Number(cycle.counts.evidence || 0) || 0,
      profileDeltas: Number(cycle.counts.profileDeltas || 0) || 0,
      corrections: Number(cycle.counts.corrections || 0) || 0
    },
    completeness: completenessSummary(cycle.completeness || {}),
    latestActivityAt: cleanString(cycle.latestActivityAt, 80),
    title: cleanString(cycle.title, 120),
    summary: cleanString(cycle.summary, 220)
  };
}

function createLearningCycleHistoryService(options = {}) {
  const planAuditService = options.planAuditService || null;
  const evidenceAuditService = options.evidenceAuditService || null;
  const profileDeltaAuditService = options.profileDeltaAuditService || null;
  const ownerCorrectionService = options.ownerCorrectionService || null;
  const auditCompletenessService = options.auditCompletenessService || null;

  function listCycleHistory(input = {}) {
    const scope = publicScope(input);
    if (!scope.workspaceId) {
      return { ok: false, source: "growth-learning-cycle-history-service", error: "learning_cycle_history_workspace_required" };
    }
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) {
      return {
        ok: false,
        source: "growth-learning-cycle-history-service",
        error: "learning_cycle_history_privacy_failed",
        privacyFindings
      };
    }
    const baseInput = {
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      programId: scope.programId,
      targetNodeIds: scope.targetNodeIds,
      limit: Math.max(scope.limit * 3, scope.limit)
    };
    const planResult = callService(planAuditService, "listPlanDrafts", Object.assign({}, baseInput, {
      status: "",
      planDraftId: scope.planDraftId
    }), "learning_cycle_history_plan_service_unavailable");
    const evidenceResult = callService(evidenceAuditService, "listEvidenceAudit", Object.assign({}, baseInput, {
      evidenceId: scope.evidenceId,
      sourceId: scope.sourceId || scope.evaluationId,
      taskCardId: scope.taskCardId
    }), "learning_cycle_history_evidence_service_unavailable");
    const profileDeltaResult = callService(profileDeltaAuditService, "listProfileDeltas", Object.assign({}, baseInput, {
      taskCardId: scope.taskCardId,
      evaluationId: scope.evaluationId,
      profileDeltaId: scope.profileDeltaId
    }), "learning_cycle_history_profile_delta_service_unavailable");
    const correctionResult = callService(ownerCorrectionService, "listCorrections", Object.assign({}, baseInput, {
      correctionId: scope.correctionId
    }), "learning_cycle_history_correction_service_unavailable");
    const subResults = [planResult, evidenceResult, profileDeltaResult, correctionResult];
    const anyOk = subResults.some((result) => result?.ok);
    const partialFailures = subResults.filter((result) => !result?.ok).map((result) => cleanString(result.error)).filter(Boolean);
    if (!anyOk) {
      return {
        ok: false,
        available: false,
        source: "growth-learning-cycle-history-service",
        error: "learning_cycle_history_unavailable",
        partialFailures
      };
    }

    const cycles = new Map();
    asArray(planResult.planDrafts).forEach((item) => applyPlan(cycles, scope, item));
    asArray(evidenceResult.evidence).forEach((item) => applyEvidence(cycles, scope, item));
    asArray(profileDeltaResult.profileDeltas).forEach((item) => applyProfileDelta(cycles, scope, item));
    asArray(correctionResult.corrections).forEach((item) => applyCorrection(cycles, scope, item));
    let cycleItems = Array.from(cycles.values())
      .filter((cycle) => cycleMatchesScope(cycle, scope))
      .sort((left, right) => cleanString(right.latestActivityAt).localeCompare(cleanString(left.latestActivityAt)))
      .slice(0, scope.limit);

    if (scope.includeCompleteness) {
      cycleItems = cycleItems.map((cycle) => {
        const completeness = callService(auditCompletenessService, "evaluateCycleCompleteness", Object.assign({}, scope, cycle.selectors, {
          workspaceId: scope.workspaceId,
          learnerId: scope.learnerId,
          programId: scope.programId,
          limit: 12
        }), "learning_cycle_history_completeness_service_unavailable");
        return Object.assign({}, cycle, { completeness });
      });
    }

    const publicCycles = cycleItems.map(publicCycle);
    return {
      ok: true,
      available: true,
      source: "growth-learning-cycle-history-service",
      schemaVersion: "growth.learningCycleHistory.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      target: {
        workspaceId: scope.workspaceId,
        learnerId: scope.learnerId || scope.workspaceId,
        displayName: cleanString(input.displayName || input.label, 120)
      },
      filters: scope,
      summary: {
        cycleCount: publicCycles.length,
        completeCount: publicCycles.filter((cycle) => cycle.completeness.complete).length,
        readyForAutomationCount: publicCycles.filter((cycle) => cycle.completeness.readyForAutomation).length,
        latestActivityAt: latestTimestamp(publicCycles.map((cycle) => cycle.latestActivityAt)),
        partialFailureCount: partialFailures.length
      },
      partialFailures,
      cycles: publicCycles
    };
  }

  return {
    listCycleHistory
  };
}

module.exports = {
  createLearningCycleHistoryService,
  cycleMatchesScope,
  publicScope,
  scanPrivacy
};
