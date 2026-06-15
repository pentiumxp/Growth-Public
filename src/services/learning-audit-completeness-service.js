"use strict";

function cleanString(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(value = []) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  return Array.from(new Set(values.map(cleanString).filter(Boolean)));
}

function boundedText(value, max = 240) {
  return cleanString(value).slice(0, max);
}

function clampLimit(value, fallback = 20) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(50, Math.round(parsed)));
}

function publicTarget(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id);
  const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
  return {
    workspaceId,
    learnerId,
    displayName: cleanString(input.displayName || input.label)
  };
}

function normalizeCycleInput(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id);
  const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
  return {
    workspaceId,
    learnerId,
    displayName: cleanString(input.displayName || input.label),
    label: cleanString(input.label || input.displayName),
    programId: cleanString(input.programId || input.program_id),
    planDraftId: cleanString(input.planDraftId || input.plan_draft_id),
    taskCardId: cleanString(input.taskCardId || input.task_card_id || input.sourceTaskCardId || input.source_task_card_id),
    evaluationId: cleanString(input.evaluationId || input.evaluation_id),
    profileDeltaId: cleanString(input.profileDeltaId || input.profile_delta_id),
    evidenceId: cleanString(input.evidenceId || input.evidence_id),
    correctionId: cleanString(input.correctionId || input.correction_id),
    sourceId: cleanString(input.sourceId || input.source_id),
    targetNodeIds: uniqueStrings(input.targetNodeIds || input.target_node_ids || input.nodeIds || input.node_ids).slice(0, 12),
    limit: clampLimit(input.limit)
  };
}

function hasPublishedPlan(cycle = {}) {
  if (cycle.summary?.hasPublishedPlan) return true;
  return asArray(cycle.planAudit?.planDrafts).some((draft) => cleanString(draft.status) === "published" && cleanString(draft.generatedTaskCardId));
}

function hasFailedPublishAttempt(cycle = {}) {
  if (Number(cycle.summary?.failedPublishAttemptCount || 0) > 0) return true;
  if (Number(cycle.summary?.blockedPublishAttemptCount || 0) > 0) return true;
  return asArray(cycle.planAudit?.planDrafts).some((draft) => {
    const status = cleanString(draft.publishAttempt?.status);
    return status === "failed" || status === "blocked";
  });
}

function hasEvaluationEvidence(cycle = {}) {
  if (cycle.summary?.hasEvaluationEvidence) return true;
  return asArray(cycle.evidenceAudit?.evidence).some((item) => {
    const sourceType = cleanString(item.sourceType);
    const sourceId = cleanString(item.sourceId);
    const evaluationId = cleanString(item.summary?.evaluationId);
    return sourceType.includes("evaluation") || sourceId.startsWith("eval_") || evaluationId;
  });
}

function hasProfileDelta(cycle = {}) {
  if (cycle.summary?.hasProfileDelta) return true;
  return asArray(cycle.profileDeltaAudit?.profileDeltas).length > 0;
}

function hasCorrection(cycle = {}) {
  if (cycle.summary?.hasCorrections) return true;
  return asArray(cycle.profileCorrections?.corrections).length > 0;
}

function hasNextRecommendation(cycle = {}) {
  return asArray(cycle.timeline).some((entry) => cleanString(entry.type) === "next_recommendation")
    || asArray(cycle.planAudit?.planDrafts).some((draft) => cleanString(draft.nextRecommendationId || draft.recommendationId));
}

const PRIVACY_RISK_KEYS = new Set([
  "rawanswer",
  "rawprompt",
  "rawmodeloutput",
  "rawmodelresponse",
  "rawtranscript",
  "transcript",
  "answerkey",
  "privatepath",
  "providerconfig",
  "apikey",
  "accesskey",
  "credential",
  "credentials",
  "authorization",
  "authheader",
  "bearertoken",
  "secret",
  "token",
  "cookie",
  "password"
]);

function normalizedKey(value) {
  return cleanString(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isPrivacyRiskKey(key) {
  const normalized = normalizedKey(key);
  if (!normalized) return false;
  if (PRIVACY_RISK_KEYS.has(normalized)) return true;
  if (normalized.startsWith("raw") && /(answer|prompt|modeloutput|modelresponse|transcript|completion|output)/.test(normalized)) return true;
  if (/(token|secret|cookie|password)$/.test(normalized) && !/(tokencount|tokenusage|tokensused)$/.test(normalized)) return true;
  return false;
}

function hasRawMarker(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) return value.some((entry) => hasRawMarker(entry, seen));
  return Object.entries(value).some(([key, child]) => isPrivacyRiskKey(key) || hasRawMarker(child, seen));
}

function finding(code, ok, severity, evidence = {}, remediation = "") {
  return {
    code,
    ok: Boolean(ok),
    severity,
    evidence,
    remediation: boundedText(remediation, 260)
  };
}

function completenessFromCycle(cycle = {}, input = {}) {
  const target = publicTarget(cycle.target || input);
  const planPublished = hasPublishedPlan(cycle);
  const publishFailed = hasFailedPublishAttempt(cycle);
  const evaluationEvidence = hasEvaluationEvidence(cycle);
  const profileDelta = hasProfileDelta(cycle);
  const correction = hasCorrection(cycle);
  const nextRecommendation = hasNextRecommendation(cycle);
  const partialFailures = uniqueStrings(cycle.partialFailures).slice(0, 12);
  const rawLeak = hasRawMarker(cycle);
  const findings = [
    finding("plan_publication", planPublished, "required", {
      planDraftCount: Number(cycle.summary?.planDraftCount || 0) || 0,
      hasPublishedPlan: planPublished
    }, "Publish one selected validated daily plan item or inspect the publish-attempt failure."),
    finding("publish_attempt_visibility", !publishFailed || asArray(cycle.timeline).some((entry) => cleanString(entry.type) === "plan_publish_attempt"), "required", {
      failedOrBlockedAttemptPresent: publishFailed,
      timelineIncludesPublishAttempt: asArray(cycle.timeline).some((entry) => cleanString(entry.type) === "plan_publish_attempt")
    }, "Expose failed or blocked publication attempts through cycle audit."),
    finding("evaluation_evidence", evaluationEvidence, "required", {
      evidenceCount: Number(cycle.summary?.evidenceCount || 0) || 0,
      hasEvaluationEvidence: evaluationEvidence
    }, "Process the learner submission evaluation once before closing the cycle."),
    finding("profile_delta_audit", profileDelta, "required", {
      profileDeltaCount: Number(cycle.summary?.profileDeltaCount || 0) || 0,
      hasProfileDelta: profileDelta
    }, "Persist profile-delta audit after evaluation so Owner can inspect the profile effect."),
    finding("partial_failures", partialFailures.length === 0, "required", {
      partialFailures
    }, "Resolve unavailable downstream audit services before trusting the cycle for automation."),
    finding("privacy_projection", !rawLeak, "required", {
      summaryOnly: !rawLeak
    }, "Remove raw/private fields from public audit DTOs."),
    finding("owner_correction_optional", true, "optional", {
      correctionCount: Number(cycle.summary?.correctionCount || 0) || 0,
      hasCorrections: correction
    }, "Owner correction is optional but must remain available after audit."),
    finding("next_recommendation_optional", true, "optional", {
      hasNextRecommendation: nextRecommendation
    }, "Next recommendation can be produced by trajectory/profile strategy on the next planning pass.")
  ];
  const required = findings.filter((item) => item.severity === "required");
  const missingRequired = required.filter((item) => !item.ok).map((item) => item.code);
  const complete = missingRequired.length === 0;
  return {
    ok: true,
    available: true,
    source: "growth-learning-audit-completeness-service",
    target,
    filters: {
      programId: cleanString(input.programId),
      planDraftId: cleanString(input.planDraftId),
      taskCardId: cleanString(input.taskCardId),
      evaluationId: cleanString(input.evaluationId),
      targetNodeIds: uniqueStrings(input.targetNodeIds).slice(0, 12),
      limit: clampLimit(input.limit)
    },
    complete,
    readyForAutomation: complete && planPublished && evaluationEvidence && profileDelta,
    summary: {
      requiredCount: required.length,
      satisfiedRequiredCount: required.filter((item) => item.ok).length,
      missingRequired,
      planPublished,
      publishFailedOrBlocked: publishFailed,
      evaluationEvidence,
      profileDelta,
      ownerCorrectionAvailable: correction,
      nextRecommendationObserved: nextRecommendation,
      latestActivityAt: cleanString(cycle.summary?.latestActivityAt)
    },
    findings,
    cycleAudit: {
      ok: cycle.ok !== false,
      source: cleanString(cycle.source),
      summary: cycle.summary || {},
      partialFailures,
      timeline: asArray(cycle.timeline).slice(0, clampLimit(input.limit))
    }
  };
}

function createLearningAuditCompletenessService(options = {}) {
  const cycleAuditService = options.cycleAuditService || null;

  function evaluateCycleCompleteness(input = {}) {
    const normalized = normalizeCycleInput(input);
    if (!normalized.workspaceId) return { ok: false, error: "learning_audit_completeness_workspace_required" };
    if (!cycleAuditService || typeof cycleAuditService.listCycleAudit !== "function") {
      return {
        ok: false,
        available: false,
        error: "learning_audit_completeness_cycle_service_unavailable"
      };
    }
    const cycle = cycleAuditService.listCycleAudit(normalized);
    if (!cycle?.ok) {
      return {
        ok: false,
        available: cycle?.available !== false,
        error: cleanString(cycle?.error || "learning_audit_completeness_cycle_unavailable"),
        cycleAudit: cycle || null
      };
    }
    return completenessFromCycle(cycle, normalized);
  }

  return {
    evaluateCycleCompleteness
  };
}

module.exports = {
  createLearningAuditCompletenessService
};
