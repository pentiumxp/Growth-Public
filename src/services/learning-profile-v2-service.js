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

function boundedText(value, max = 260) {
  return cleanString(value).slice(0, max);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_DAILY_STALE_AFTER_MS = 30 * MS_PER_DAY;
const DEFAULT_FORMAL_STALE_AFTER_MS = 90 * MS_PER_DAY;

function parseTimeMs(value) {
  const parsed = Date.parse(cleanString(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function evidenceStatusRank(status) {
  const normalized = cleanString(status).toLowerCase();
  if (["mastered", "stable"].includes(normalized)) return 4;
  if (["observed"].includes(normalized)) return 3;
  if (["weak", "developing"].includes(normalized)) return 2;
  if (["needs_repair", "misconception"].includes(normalized)) return 1;
  return 0;
}

function strongerStatus(current = "", next = "") {
  if (!current) return next;
  if (!next) return current;
  return evidenceStatusRank(next) >= evidenceStatusRank(current) ? next : current;
}

function scoreBandValue(band = "") {
  const normalized = cleanString(band).toLowerCase();
  if (normalized === "high") return 90;
  if (normalized === "medium") return 70;
  if (normalized === "low") return 45;
  return 0;
}

function sourceEvidenceId(evidence = {}) {
  return cleanString(evidence.evidenceId);
}

function sourceFreshnessKind(sourceType = "") {
  const normalized = cleanString(sourceType).toLowerCase();
  if (normalized === "stage_assessment" || normalized === "formal_assessment") return "formal_assessment";
  if (normalized === "owner_reviewed_correction" || normalized === "owner_review") return "owner_correction";
  if (["daily_evaluation", "reflection", "learner_feedback", "experience_signal"].includes(normalized)) return "daily_evidence";
  return "learning_evidence";
}

function rubricPolicyId(summary = {}) {
  const policy = summary.rubricPolicy && typeof summary.rubricPolicy === "object" ? summary.rubricPolicy : {};
  return cleanString(summary.rubricPolicyId || summary.rubric_policy_id || policy.policyId);
}

function rubricResultSummaries(summary = {}) {
  return asArray(summary.rubricResults || summary.rubric_results)
    .map((item) => {
      const source = item && typeof item === "object" && !Array.isArray(item) ? item : {};
      return {
        dimensionId: cleanString(source.dimensionId || source.rubricDimensionId),
        scoreBand: cleanString(source.scoreBand),
        status: cleanString(source.status),
        evidenceType: cleanString(source.evidenceType || source.type)
      };
    })
    .filter((item) => item.dimensionId)
    .slice(0, 8);
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

function latestIso(current = "", next = "") {
  return parseTimeMs(next) >= parseTimeMs(current) ? cleanString(next) : cleanString(current);
}

function daysSince(nowMs, iso = "") {
  const timestamp = parseTimeMs(iso);
  if (!timestamp || !Number.isFinite(nowMs)) return null;
  return Math.max(0, Math.floor((nowMs - timestamp) / MS_PER_DAY));
}

function createCapabilityState(nodeId) {
  return {
    nodeId,
    status: "",
    confidence: 0,
    evidenceCount: 0,
    evidenceWeightTotal: 0,
    lastObservedAt: "",
    lastLearningEvidenceAt: "",
    lastFormalAssessmentAt: "",
    lastDailyEvidenceAt: "",
    lastCorrectionAt: "",
    stale: false,
    staleReasons: [],
    evidenceFreshness: {
      status: "unknown",
      recencyBand: "unknown",
      lastLearningEvidenceAt: "",
      lastFormalAssessmentAt: "",
      lastDailyEvidenceAt: "",
      lastCorrectionAt: "",
      daysSinceLearningEvidence: null,
      staleAfterDays: 0,
      reasons: []
    },
    scoreBand: "",
    sourceTypes: [],
    evidenceIds: [],
    rubricPolicyIds: [],
    rubricDimensionIds: [],
    rubricEvidenceTypes: [],
    rubricWeakDimensionIds: [],
    rubricStableDimensionIds: [],
    summaries: [],
    misconceptionSummaries: [],
    pressureSignals: []
  };
}

function evidenceFreshnessForState(state = {}, nowMs = Date.now(), staleAfterMs = DEFAULT_DAILY_STALE_AFTER_MS, formalStaleAfterMs = DEFAULT_FORMAL_STALE_AFTER_MS) {
  const latestLearningAt = cleanString(state.lastLearningEvidenceAt);
  const latestFormalAt = cleanString(state.lastFormalAssessmentAt);
  const latestDailyAt = cleanString(state.lastDailyEvidenceAt);
  const lastCorrectionAt = cleanString(state.lastCorrectionAt);
  const latestFormalMs = parseTimeMs(latestFormalAt);
  const latestDailyMs = parseTimeMs(latestDailyAt);
  const sourceKind = latestFormalMs && latestFormalMs >= latestDailyMs ? "formal_assessment" : "daily_evidence";
  const staleAfter = sourceKind === "formal_assessment" ? formalStaleAfterMs : staleAfterMs;
  const ageDays = daysSince(nowMs, latestLearningAt);
  const staleAfterDays = Math.max(1, Math.round(staleAfter / MS_PER_DAY));
  const reasons = [];

  if (!latestLearningAt) {
    if (lastCorrectionAt) reasons.push("owner_correction_without_learning_evidence");
    else reasons.push("learning_evidence_missing");
  } else if (parseTimeMs(latestLearningAt) && nowMs - parseTimeMs(latestLearningAt) > staleAfter) {
    reasons.push(sourceKind === "formal_assessment" ? "formal_assessment_stale" : "daily_evidence_stale");
  }

  const status = reasons.length ? "stale" : "current";
  const recencyBand = !latestLearningAt
    ? "none"
    : ageDays <= 7
      ? "fresh"
      : ageDays <= staleAfterDays
        ? "aging"
        : "stale";

  if (status === "stale" && ["mastered", "stable"].includes(cleanString(state.status).toLowerCase())) {
    reasons.push("strong_claim_requires_refresh");
  }
  if (status === "stale" && ["needs_repair", "misconception", "weak"].includes(cleanString(state.status).toLowerCase())) {
    reasons.push("weak_claim_requires_refresh");
  }

  return {
    status,
    recencyBand,
    sourceKind,
    lastLearningEvidenceAt: latestLearningAt,
    lastFormalAssessmentAt: latestFormalAt,
    lastDailyEvidenceAt: latestDailyAt,
    lastCorrectionAt,
    daysSinceLearningEvidence: ageDays,
    staleAfterDays,
    reasons: uniqueStrings(reasons).slice(0, 8)
  };
}

function updateCapabilityState(state, evidence = {}, nowMs = Date.now(), staleAfterMs = DEFAULT_DAILY_STALE_AFTER_MS, formalStaleAfterMs = DEFAULT_FORMAL_STALE_AFTER_MS) {
  const sourceType = cleanString(evidence.sourceType).toLowerCase();
  const ownerReviewedCorrection = sourceType === "owner_reviewed_correction";
  const freshnessKind = sourceFreshnessKind(sourceType);
  state.status = ownerReviewedCorrection
    ? (cleanString(evidence.status) || state.status || "observed")
    : strongerStatus(state.status, evidence.status || "observed");
  state.confidence = Math.max(state.confidence, Number(evidence.confidence || 0) || 0);
  state.evidenceCount += 1;
  state.evidenceWeightTotal = Number((state.evidenceWeightTotal + (Number(evidence.evidenceWeight || 0) || 0)).toFixed(3));
  state.sourceTypes = uniqueStrings(state.sourceTypes.concat(evidence.sourceType));
  state.evidenceIds = uniqueStrings(state.evidenceIds.concat(sourceEvidenceId(evidence))).slice(-12);
  const createdAt = cleanString(evidence.createdAt);
  if (parseTimeMs(createdAt) >= parseTimeMs(state.lastObservedAt)) state.lastObservedAt = createdAt;
  if (freshnessKind === "formal_assessment") {
    state.lastFormalAssessmentAt = latestIso(state.lastFormalAssessmentAt, createdAt);
    state.lastLearningEvidenceAt = latestIso(state.lastLearningEvidenceAt, createdAt);
  } else if (freshnessKind === "daily_evidence" || freshnessKind === "learning_evidence") {
    state.lastDailyEvidenceAt = latestIso(state.lastDailyEvidenceAt, createdAt);
    state.lastLearningEvidenceAt = latestIso(state.lastLearningEvidenceAt, createdAt);
  } else if (freshnessKind === "owner_correction") {
    state.lastCorrectionAt = latestIso(state.lastCorrectionAt, createdAt);
  }
  const scoreValue = scoreBandValue(evidence.scoreBand);
  if (scoreValue >= scoreBandValue(state.scoreBand)) state.scoreBand = cleanString(evidence.scoreBand);
  const summary = evidence.summary || {};
  if (ownerReviewedCorrection && summary.clearPressureSignals) state.pressureSignals = [];
  const feedback = boundedText(summary.feedbackSummary || summary.summary || summary.reflectionSummary || summary.reason || summary.note);
  if (feedback) state.summaries = uniqueStrings(state.summaries.concat(feedback)).slice(-5);
  const rubricResults = rubricResultSummaries(summary);
  const policyId = rubricPolicyId(summary);
  if (policyId) state.rubricPolicyIds = uniqueStrings(state.rubricPolicyIds.concat(policyId)).slice(-12);
  if (rubricResults.length) {
    state.rubricDimensionIds = uniqueStrings(state.rubricDimensionIds.concat(rubricResults.map((item) => item.dimensionId))).slice(-12);
    state.rubricEvidenceTypes = uniqueStrings(state.rubricEvidenceTypes.concat(summary.evidenceTypes || summary.evidence_types || rubricResults.map((item) => item.evidenceType))).slice(-12);
    state.rubricWeakDimensionIds = uniqueStrings(state.rubricWeakDimensionIds.concat(weakRubricDimensionIds(rubricResults))).slice(-12);
    state.rubricStableDimensionIds = uniqueStrings(state.rubricStableDimensionIds.concat(stableRubricDimensionIds(rubricResults))).slice(-12);
  }
  for (const item of asArray(summary.remainingWeaknesses)) {
    const text = boundedText(item, 180);
    if (text) state.misconceptionSummaries = uniqueStrings(state.misconceptionSummaries.concat(text)).slice(-5);
  }
  const signalType = cleanString(summary.signalType).toLowerCase();
  if (["too_hard", "not_learned", "confusing"].includes(signalType) || evidence.status === "needs_repair") {
    state.pressureSignals = uniqueStrings(state.pressureSignals.concat(signalType || evidence.status)).slice(-5);
  }
  state.evidenceFreshness = evidenceFreshnessForState(state, nowMs, staleAfterMs, formalStaleAfterMs);
  state.stale = state.evidenceFreshness.status === "stale";
  state.staleReasons = state.evidenceFreshness.reasons;
  return state;
}

function publicCapabilityState(state = {}) {
  return {
    nodeId: cleanString(state.nodeId),
    status: cleanString(state.status) || "observed",
    confidence: Number(state.confidence || 0),
    evidenceCount: Number(state.evidenceCount || 0),
    evidenceWeightTotal: Number(state.evidenceWeightTotal || 0),
    lastObservedAt: cleanString(state.lastObservedAt),
    lastLearningEvidenceAt: cleanString(state.lastLearningEvidenceAt),
    lastFormalAssessmentAt: cleanString(state.lastFormalAssessmentAt),
    lastDailyEvidenceAt: cleanString(state.lastDailyEvidenceAt),
    lastCorrectionAt: cleanString(state.lastCorrectionAt),
    stale: Boolean(state.stale),
    staleReasons: uniqueStrings(state.staleReasons).slice(0, 8),
    evidenceFreshness: {
      status: cleanString(state.evidenceFreshness?.status || (state.stale ? "stale" : "current")),
      recencyBand: cleanString(state.evidenceFreshness?.recencyBand || "unknown"),
      sourceKind: cleanString(state.evidenceFreshness?.sourceKind || ""),
      lastLearningEvidenceAt: cleanString(state.evidenceFreshness?.lastLearningEvidenceAt),
      lastFormalAssessmentAt: cleanString(state.evidenceFreshness?.lastFormalAssessmentAt),
      lastDailyEvidenceAt: cleanString(state.evidenceFreshness?.lastDailyEvidenceAt),
      lastCorrectionAt: cleanString(state.evidenceFreshness?.lastCorrectionAt),
      daysSinceLearningEvidence: state.evidenceFreshness?.daysSinceLearningEvidence === null
        ? null
        : Number(state.evidenceFreshness?.daysSinceLearningEvidence || 0),
      staleAfterDays: Number(state.evidenceFreshness?.staleAfterDays || 0),
      reasons: uniqueStrings(state.evidenceFreshness?.reasons).slice(0, 8)
    },
    scoreBand: cleanString(state.scoreBand),
    sourceTypes: uniqueStrings(state.sourceTypes).slice(0, 8),
    evidenceIds: uniqueStrings(state.evidenceIds).slice(0, 12),
    rubricPolicyIds: uniqueStrings(state.rubricPolicyIds).slice(0, 12),
    rubricDimensionIds: uniqueStrings(state.rubricDimensionIds).slice(0, 12),
    rubricEvidenceTypes: uniqueStrings(state.rubricEvidenceTypes).slice(0, 12),
    rubricWeakDimensionIds: uniqueStrings(state.rubricWeakDimensionIds).slice(0, 12),
    rubricStableDimensionIds: uniqueStrings(state.rubricStableDimensionIds).slice(0, 12),
    summaries: uniqueStrings(state.summaries).slice(0, 5),
    misconceptionSummaries: uniqueStrings(state.misconceptionSummaries).slice(0, 5),
    pressureSignals: uniqueStrings(state.pressureSignals).slice(0, 5)
  };
}

function plannerHintFromStates(states = []) {
  const stale = states.filter((state) => state.stale);
  const weak = states.filter((state) => !state.stale && (["needs_repair", "misconception", "weak"].includes(cleanString(state.status).toLowerCase()) || state.pressureSignals.length));
  const strong = states.filter((state) => !state.stale && ["mastered", "stable"].includes(cleanString(state.status).toLowerCase()) && state.confidence >= 0.7 && state.evidenceWeightTotal >= 1);
  if (weak.length) {
    return {
      strategy: "repair",
      cardRole: "teaching",
      targetNodeIds: weak.map((state) => state.nodeId).slice(0, 4),
      reason: "Recent weak evidence or pressure signals should produce a low-pressure repair plan."
    };
  }
  if (stale.length) {
    return {
      strategy: "review",
      cardRole: "practice",
      targetNodeIds: stale.map((state) => state.nodeId).slice(0, 4),
      reason: "Stale profile evidence should produce a low-pressure refresh plan before stronger claims or formal assessment."
    };
  }
  if (strong.length) {
    return {
      strategy: "stretch",
      cardRole: "practice",
      targetNodeIds: strong.map((state) => state.nodeId).slice(0, 4),
      reason: "Stable evidence can support a controlled stretch plan."
    };
  }
  return {
    strategy: "stabilize",
    cardRole: "practice",
    targetNodeIds: states.map((state) => state.nodeId).slice(0, 4),
    reason: "No strong repair or stretch signal is present; continue low-pressure stabilization."
  };
}

function createLearningProfileV2Service(options = {}) {
  const evidenceLedgerService = options.evidenceLedgerService || null;
  const legacyProfileProjectionService = options.legacyProfileProjectionService || null;
  const now = typeof options.now === "function" ? options.now : () => new Date();
  const staleAfterMs = Math.max(1, Number(options.staleAfterMs || DEFAULT_DAILY_STALE_AFTER_MS));
  const formalStaleAfterMs = Math.max(staleAfterMs, Number(options.formalStaleAfterMs || DEFAULT_FORMAL_STALE_AFTER_MS));

  function profileV2(input = {}) {
    const workspaceId = cleanString(input.workspaceId);
    const learnerId = cleanString(input.learnerId) || workspaceId;
    if (!workspaceId) return { ok: false, error: "profile_v2_workspace_required" };
    const targetNodeIds = uniqueStrings(input.targetNodeIds || input.nodeIds);
    const evidence = evidenceLedgerService && typeof evidenceLedgerService.listEvidence === "function"
      ? evidenceLedgerService.listEvidence({
        workspaceId,
        learnerId,
        programId: input.programId,
        graphNodeIds: targetNodeIds,
        limit: input.evidenceLimit || 80
      })
      : [];
    const stateMap = new Map();
    const nowMs = now().getTime();
    const chronologicalEvidence = evidence.slice().sort((a, b) => parseTimeMs(a.createdAt) - parseTimeMs(b.createdAt));
    for (const item of chronologicalEvidence) {
      const nodeIds = uniqueStrings([item.graphNodeId].concat(item.graphNodeIds || []));
      for (const nodeId of nodeIds) {
        const state = stateMap.get(nodeId) || createCapabilityState(nodeId);
        updateCapabilityState(state, Object.assign({}, item, { graphNodeId: nodeId }), nowMs, staleAfterMs, formalStaleAfterMs);
        stateMap.set(nodeId, state);
      }
    }
    const capabilityStates = Array.from(stateMap.values()).map(publicCapabilityState)
      .sort((a, b) => parseTimeMs(b.lastObservedAt) - parseTimeMs(a.lastObservedAt))
      .slice(0, 40);
    const weaknesses = capabilityStates
      .filter((state) => ["needs_repair", "misconception", "weak"].includes(cleanString(state.status).toLowerCase()) || state.pressureSignals.length)
      .map((state) => ({
        nodeId: state.nodeId,
        status: state.status,
        summary: state.misconceptionSummaries[0] || state.summaries[0] || "Needs focused repair evidence.",
        evidenceIds: state.evidenceIds.slice(0, 4),
        rubricWeakDimensionIds: state.rubricWeakDimensionIds.slice(0, 8),
        rubricDimensionIds: state.rubricDimensionIds.slice(0, 8)
      }))
      .slice(0, 8);
    const strengths = capabilityStates
      .filter((state) => !state.stale && (["mastered", "stable"].includes(cleanString(state.status).toLowerCase()) || state.scoreBand === "high"))
      .map((state) => ({
        nodeId: state.nodeId,
        status: state.status,
        summary: state.summaries[0] || "Stable evidence observed.",
        evidenceIds: state.evidenceIds.slice(0, 4),
        rubricStableDimensionIds: state.rubricStableDimensionIds.slice(0, 8),
        rubricDimensionIds: state.rubricDimensionIds.slice(0, 8)
      }))
      .slice(0, 8);
    const staleEvidence = capabilityStates
      .filter((state) => state.stale)
      .map((state) => ({
        nodeId: state.nodeId,
        status: state.status,
        evidenceFreshness: state.evidenceFreshness,
        staleReasons: state.staleReasons,
        summary: state.summaries[0] || "Learning evidence needs a low-pressure refresh.",
        evidenceIds: state.evidenceIds.slice(0, 4),
        rubricDimensionIds: state.rubricDimensionIds.slice(0, 8)
      }))
      .slice(0, 8);
    const pressureSignals = capabilityStates
      .filter((state) => state.pressureSignals.length)
      .map((state) => ({
        nodeId: state.nodeId,
        signals: state.pressureSignals,
        evidenceIds: state.evidenceIds.slice(0, 4)
      }))
      .slice(0, 8);
    const legacyProfile = legacyProfileProjectionService && typeof legacyProfileProjectionService.profileContext === "function"
      ? legacyProfileProjectionService.profileContext({
        workspaceId,
        learnerId,
        programId: input.programId,
        targetNodeIds,
        masteryLimit: input.masteryLimit || 24,
        signalLimit: input.signalLimit || 16,
        trajectoryLimit: input.trajectoryLimit || 8
      })
      : { ok: false, available: false };
    return {
      ok: true,
      source: "growth-learning-profile-v2-service",
      workspaceId,
      learnerId,
      programId: cleanString(input.programId),
      targetNodeIds,
      summary: {
        capabilityStateCount: capabilityStates.length,
        evidenceCount: evidence.length,
        weaknessCount: weaknesses.length,
        strengthCount: strengths.length,
        pressureSignalCount: pressureSignals.length,
        staleCount: staleEvidence.length,
        staleEvidenceCount: staleEvidence.length,
        rubricEvidenceCount: capabilityStates.filter((state) => state.rubricDimensionIds.length).length,
        rubricWeakDimensionCount: uniqueStrings(capabilityStates.flatMap((state) => state.rubricWeakDimensionIds)).length,
        rubricStableDimensionCount: uniqueStrings(capabilityStates.flatMap((state) => state.rubricStableDimensionIds)).length
      },
      capabilityStates,
      strengths,
      weaknesses,
      misconceptions: weaknesses.filter((item) => item.summary).slice(0, 8),
      staleEvidence,
      pressureSignals,
      learningHabits: [],
      stageReadiness: {
        status: pressureSignals.length || staleEvidence.length ? "dormant" : "unknown",
        reason: pressureSignals.length
          ? "Recent pressure signals should block automatic formal assessment."
          : staleEvidence.length
            ? "Stale learning evidence should be refreshed before formal assessment."
          : "Stage readiness requires dedicated stage-assessment policy."
      },
      recommendedPlannerHints: plannerHintFromStates(capabilityStates),
      legacyProfile
    };
  }

  return {
    profileV2
  };
}

module.exports = {
  createLearningProfileV2Service
};
