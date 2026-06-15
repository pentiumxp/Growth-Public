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

function clampNumber(value, min = 0, max = 1) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
}

function rounded(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((Number(value || 0) || 0) * factor) / factor;
}

function boundedText(value, max = 220) {
  return cleanString(value).slice(0, max);
}

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body)/i;

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

function publicCapabilityState(state = {}) {
  return {
    nodeId: cleanString(state.nodeId),
    status: cleanString(state.status),
    scoreBand: cleanString(state.scoreBand),
    confidence: rounded(clampNumber(state.confidence), 3),
    evidenceCount: Number(state.evidenceCount || 0) || 0,
    evidenceWeightTotal: rounded(state.evidenceWeightTotal, 3),
    stale: Boolean(state.stale),
    staleReasons: uniqueStrings(state.staleReasons).slice(0, 8),
    evidenceFreshness: publicEvidenceFreshness(state.evidenceFreshness),
    sourceTypes: uniqueStrings(state.sourceTypes).slice(0, 8),
    evidenceIds: uniqueStrings(state.evidenceIds).slice(0, 12),
    pressureSignals: uniqueStrings(state.pressureSignals).slice(0, 6)
  };
}

function publicEvidenceFreshness(freshness = {}) {
  return {
    status: cleanString(freshness.status),
    recencyBand: cleanString(freshness.recencyBand),
    sourceKind: cleanString(freshness.sourceKind),
    lastLearningEvidenceAt: cleanString(freshness.lastLearningEvidenceAt),
    lastFormalAssessmentAt: cleanString(freshness.lastFormalAssessmentAt),
    lastDailyEvidenceAt: cleanString(freshness.lastDailyEvidenceAt),
    lastCorrectionAt: cleanString(freshness.lastCorrectionAt),
    daysSinceLearningEvidence: freshness.daysSinceLearningEvidence === null
      ? null
      : Number(freshness.daysSinceLearningEvidence || 0),
    staleAfterDays: Number(freshness.staleAfterDays || 0),
    reasons: uniqueStrings(freshness.reasons).slice(0, 8)
  };
}

function publicPlannerHint(hint = {}) {
  return {
    strategy: cleanString(hint.strategy),
    cardRole: cleanString(hint.cardRole),
    targetNodeIds: uniqueStrings(hint.targetNodeIds).slice(0, 8),
    reason: boundedText(hint.reason, 220)
  };
}

function publicProfileSummary(profile = {}) {
  const summary = profile.summary || {};
  return {
    capabilityStateCount: Number(summary.capabilityStateCount || 0) || 0,
    evidenceCount: Number(summary.evidenceCount || 0) || 0,
    weaknessCount: Number(summary.weaknessCount || 0) || 0,
    strengthCount: Number(summary.strengthCount || 0) || 0,
    pressureSignalCount: Number(summary.pressureSignalCount || 0) || 0,
    staleCount: Number(summary.staleCount || 0) || 0,
    staleEvidenceCount: Number(summary.staleEvidenceCount || summary.staleCount || 0) || 0
  };
}

function publicSnapshot(profile = {}, input = {}) {
  if (!profile || profile.ok === false) {
    return {
      ok: false,
      available: false,
      phase: cleanString(input.phase),
      error: cleanString(profile?.error) || "profile_v2_snapshot_unavailable"
    };
  }
  return {
    ok: true,
    available: true,
    source: "growth-learning-profile-delta-service",
    phase: cleanString(input.phase),
    workspaceId: cleanString(profile.workspaceId || input.workspaceId),
    learnerId: cleanString(profile.learnerId || input.learnerId),
    programId: cleanString(profile.programId || input.programId),
    targetNodeIds: uniqueStrings(profile.targetNodeIds || input.targetNodeIds).slice(0, 40),
    summary: publicProfileSummary(profile),
    capabilityStates: asArray(profile.capabilityStates).map(publicCapabilityState).filter((state) => state.nodeId).slice(0, 40),
    strengths: asArray(profile.strengths).map((item) => ({
      nodeId: cleanString(item.nodeId),
      status: cleanString(item.status),
      evidenceIds: uniqueStrings(item.evidenceIds).slice(0, 8)
    })).filter((item) => item.nodeId).slice(0, 8),
    weaknesses: asArray(profile.weaknesses).map((item) => ({
      nodeId: cleanString(item.nodeId),
      status: cleanString(item.status),
      evidenceIds: uniqueStrings(item.evidenceIds).slice(0, 8)
    })).filter((item) => item.nodeId).slice(0, 8),
    pressureSignals: asArray(profile.pressureSignals).map((item) => ({
      nodeId: cleanString(item.nodeId),
      signals: uniqueStrings(item.signals).slice(0, 6),
      evidenceIds: uniqueStrings(item.evidenceIds).slice(0, 8)
    })).filter((item) => item.nodeId).slice(0, 8),
    recommendedPlannerHints: publicPlannerHint(profile.recommendedPlannerHints)
  };
}

function stateMap(snapshot = {}) {
  return new Map(asArray(snapshot.capabilityStates).map((state) => [cleanString(state.nodeId), state]).filter(([nodeId]) => nodeId));
}

function arraysEqual(a = [], b = []) {
  const left = uniqueStrings(a);
  const right = uniqueStrings(b);
  if (left.length !== right.length) return false;
  return left.every((item, index) => item === right[index]);
}

function evidenceFreshnessChanged(before = {}, after = {}) {
  const left = publicEvidenceFreshness(before);
  const right = publicEvidenceFreshness(after);
  return cleanString(left.status) !== cleanString(right.status)
    || cleanString(left.recencyBand) !== cleanString(right.recencyBand)
    || cleanString(left.sourceKind) !== cleanString(right.sourceKind)
    || cleanString(left.lastLearningEvidenceAt) !== cleanString(right.lastLearningEvidenceAt)
    || cleanString(left.lastFormalAssessmentAt) !== cleanString(right.lastFormalAssessmentAt)
    || cleanString(left.lastDailyEvidenceAt) !== cleanString(right.lastDailyEvidenceAt)
    || cleanString(left.lastCorrectionAt) !== cleanString(right.lastCorrectionAt)
    || Number(left.daysSinceLearningEvidence || 0) !== Number(right.daysSinceLearningEvidence || 0)
    || Number(left.staleAfterDays || 0) !== Number(right.staleAfterDays || 0)
    || !arraysEqual(left.reasons, right.reasons);
}

function stateChanged(before = {}, after = {}) {
  return cleanString(before.status) !== cleanString(after.status)
    || cleanString(before.scoreBand) !== cleanString(after.scoreBand)
    || rounded(before.confidence, 3) !== rounded(after.confidence, 3)
    || Number(before.evidenceCount || 0) !== Number(after.evidenceCount || 0)
    || rounded(before.evidenceWeightTotal, 3) !== rounded(after.evidenceWeightTotal, 3)
    || Boolean(before.stale) !== Boolean(after.stale)
    || !arraysEqual(before.staleReasons, after.staleReasons)
    || evidenceFreshnessChanged(before.evidenceFreshness, after.evidenceFreshness)
    || !arraysEqual(before.evidenceIds, after.evidenceIds)
    || !arraysEqual(before.pressureSignals, after.pressureSignals);
}

function plannerHintChanged(before = {}, after = {}) {
  return cleanString(before.strategy) !== cleanString(after.strategy)
    || cleanString(before.cardRole) !== cleanString(after.cardRole)
    || !arraysEqual(before.targetNodeIds, after.targetNodeIds)
    || cleanString(before.reason) !== cleanString(after.reason);
}

function capabilityChange(nodeId, before = null, after = null) {
  const empty = { nodeId };
  const beforeState = before || empty;
  const afterState = after || empty;
  return {
    nodeId,
    changeType: before && after ? "updated" : (after ? "added" : "removed"),
    before: before ? publicCapabilityState(beforeState) : null,
    after: after ? publicCapabilityState(afterState) : null,
    evidenceCountDelta: Number(afterState.evidenceCount || 0) - Number(beforeState.evidenceCount || 0),
    evidenceWeightDelta: rounded(Number(afterState.evidenceWeightTotal || 0) - Number(beforeState.evidenceWeightTotal || 0), 3),
    confidenceDelta: rounded(Number(afterState.confidence || 0) - Number(beforeState.confidence || 0), 3),
    statusChanged: cleanString(beforeState.status) !== cleanString(afterState.status),
    scoreBandChanged: cleanString(beforeState.scoreBand) !== cleanString(afterState.scoreBand),
    staleChanged: Boolean(beforeState.stale) !== Boolean(afterState.stale),
    evidenceFreshnessChanged: evidenceFreshnessChanged(beforeState.evidenceFreshness, afterState.evidenceFreshness),
    evidenceFreshnessChange: {
      before: before ? publicEvidenceFreshness(beforeState.evidenceFreshness) : null,
      after: after ? publicEvidenceFreshness(afterState.evidenceFreshness) : null
    },
    newStaleReasons: uniqueStrings(asArray(afterState.staleReasons).filter((reason) => !asArray(beforeState.staleReasons).includes(reason))).slice(0, 8),
    resolvedStaleReasons: uniqueStrings(asArray(beforeState.staleReasons).filter((reason) => !asArray(afterState.staleReasons).includes(reason))).slice(0, 8),
    newEvidenceIds: uniqueStrings(asArray(afterState.evidenceIds).filter((id) => !asArray(beforeState.evidenceIds).includes(id))).slice(0, 12),
    pressureSignalDelta: uniqueStrings(asArray(afterState.pressureSignals).filter((signal) => !asArray(beforeState.pressureSignals).includes(signal))).slice(0, 6)
  };
}

function evidenceIdsFromLedger(evidenceLedger = {}) {
  return uniqueStrings(asArray(evidenceLedger.entries).map((entry) => entry.evidenceId || entry.evidence_id)).slice(0, 20);
}

function createLearningProfileDeltaService(options = {}) {
  const profileV2Service = options.profileV2Service || null;
  const repository = options.repository || null;
  const now = typeof options.now === "function" ? options.now : () => new Date();

  function snapshot(input = {}) {
    if (!profileV2Service || typeof profileV2Service.profileV2 !== "function") {
      return {
        ok: false,
        available: false,
        phase: cleanString(input.phase),
        error: "profile_v2_service_unavailable"
      };
    }
    try {
      const profile = profileV2Service.profileV2({
        workspaceId: input.workspaceId,
        learnerId: input.learnerId,
        programId: input.programId,
        targetNodeIds: input.targetNodeIds,
        evidenceLimit: input.evidenceLimit || 80
      });
      return publicSnapshot(profile, input);
    } catch (err) {
      return {
        ok: false,
        available: false,
        phase: cleanString(input.phase),
        error: cleanString(err.message || err) || "profile_v2_snapshot_failed"
      };
    }
  }

  function recordEvaluationProfileDelta(input = {}) {
    const before = input.beforeProfileSnapshot || input.beforeProfile || null;
    const beforeSnapshot = before
      ? (before.available ? before : publicSnapshot(before, Object.assign({}, input, { phase: "before" })))
      : {
        ok: false,
        available: false,
        phase: "before",
        error: "profile_delta_before_snapshot_missing"
      };
    if (!beforeSnapshot.available) {
      return {
        ok: false,
        available: false,
        error: "profile_delta_before_snapshot_unavailable",
        before: beforeSnapshot
      };
    }
    const afterSnapshot = input.afterProfileSnapshot?.available
      ? input.afterProfileSnapshot
      : snapshot(Object.assign({}, input, { phase: "after" }));
    if (!afterSnapshot.available) {
      return {
        ok: false,
        available: false,
        error: "profile_delta_after_snapshot_unavailable",
        before: beforeSnapshot,
        after: afterSnapshot
      };
    }
    const beforeMap = stateMap(beforeSnapshot);
    const afterMap = stateMap(afterSnapshot);
    const nodeIds = uniqueStrings(asArray(input.targetNodeIds)
      .concat(Array.from(beforeMap.keys()))
      .concat(Array.from(afterMap.keys()))).slice(0, 40);
    const changedCapabilities = nodeIds.map((nodeId) => {
      const beforeState = beforeMap.get(nodeId) || null;
      const afterState = afterMap.get(nodeId) || null;
      if (!beforeState && !afterState) return null;
      if (beforeState && afterState && !stateChanged(beforeState, afterState)) return null;
      return capabilityChange(nodeId, beforeState, afterState);
    }).filter(Boolean);
    const beforeHint = beforeSnapshot.recommendedPlannerHints || {};
    const afterHint = afterSnapshot.recommendedPlannerHints || {};
    const hintChanged = plannerHintChanged(beforeHint, afterHint);
    const result = {
      ok: true,
      available: true,
      source: "growth-learning-profile-delta-service",
      profileDeltaId: cleanString(input.profileDeltaId)
        || `profile_delta_${cleanString(input.evaluation?.evaluationId || input.evaluationId || "unknown")}`,
      privacyClass: "summary_only",
      generatedAt: now().toISOString(),
      workspaceId: cleanString(input.workspaceId || afterSnapshot.workspaceId || beforeSnapshot.workspaceId),
      learnerId: cleanString(input.learnerId || afterSnapshot.learnerId || beforeSnapshot.learnerId),
      programId: cleanString(input.programId || afterSnapshot.programId || beforeSnapshot.programId),
      targetNodeIds: nodeIds,
      basis: {
        taskCardId: cleanString(input.taskCard?.id || input.taskCardId),
        submissionId: cleanString(input.submission?.id || input.submissionId),
        evaluationId: cleanString(input.evaluation?.evaluationId || input.evaluation?.id || input.evaluationId),
        evidenceIds: evidenceIdsFromLedger(input.evidenceLedger)
      },
      beforeSummary: beforeSnapshot.summary,
      afterSummary: afterSnapshot.summary,
      summary: {
        changedCapabilityCount: changedCapabilities.length,
        addedCapabilityCount: changedCapabilities.filter((item) => item.changeType === "added").length,
        removedCapabilityCount: changedCapabilities.filter((item) => item.changeType === "removed").length,
        evidenceCountDelta: Number(afterSnapshot.summary.evidenceCount || 0) - Number(beforeSnapshot.summary.evidenceCount || 0),
        weaknessCountDelta: Number(afterSnapshot.summary.weaknessCount || 0) - Number(beforeSnapshot.summary.weaknessCount || 0),
        strengthCountDelta: Number(afterSnapshot.summary.strengthCount || 0) - Number(beforeSnapshot.summary.strengthCount || 0),
        pressureSignalCountDelta: Number(afterSnapshot.summary.pressureSignalCount || 0) - Number(beforeSnapshot.summary.pressureSignalCount || 0),
        staleCountDelta: Number(afterSnapshot.summary.staleCount || 0) - Number(beforeSnapshot.summary.staleCount || 0),
        plannerHintChanged: hintChanged
      },
      changedCapabilities,
      plannerHintChange: {
        changed: hintChanged,
        before: publicPlannerHint(beforeHint),
        after: publicPlannerHint(afterHint)
      }
    };
    result.profileStateChanged = Boolean(result.changedCapabilities.length || hintChanged);
    const privacyFindings = scanPrivacyKeys(result);
    if (privacyFindings.length) {
      return { ok: false, available: true, error: "profile_delta_privacy_failed", privacyFindings };
    }
    result.persistence = persistProfileDelta(result);
    if (result.persistence.ok === false) {
      result.ok = false;
      result.error = result.persistence.error || "profile_delta_persist_failed";
    }
    return result;
  }

  function persistProfileDelta(delta = {}) {
    if (!repository || typeof repository.recordProfileDelta !== "function") {
      return { ok: true, available: false, skipped: true, reason: "profile_delta_audit_repository_unavailable" };
    }
    try {
      const recorded = repository.recordProfileDelta(delta);
      if (!recorded || recorded.ok === false) {
        return {
          ok: false,
          available: true,
          error: cleanString(recorded?.error) || "profile_delta_persist_failed",
          privacyFindings: asArray(recorded?.privacyFindings)
        };
      }
      return {
        ok: true,
        available: true,
        duplicate: Boolean(recorded.duplicate),
        profileDeltaId: cleanString(recorded.profileDelta?.profileDeltaId || delta.profileDeltaId)
      };
    } catch (err) {
      return {
        ok: false,
        available: true,
        error: cleanString(err.message || err) || "profile_delta_persist_failed"
      };
    }
  }

  return {
    snapshot,
    recordEvaluationProfileDelta
  };
}

module.exports = {
  createLearningProfileDeltaService
};
