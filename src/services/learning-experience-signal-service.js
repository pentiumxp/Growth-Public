"use strict";

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function boundedText(value, max = 260) {
  return cleanString(value).slice(0, max);
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

const SIGNAL_POLICY = Object.freeze({
  too_easy: Object.freeze({
    strength: "medium",
    summary: "Learner reported that this card was too easy."
  }),
  right_level: Object.freeze({
    strength: "medium",
    summary: "Learner reported that this card felt at the right level."
  }),
  too_hard: Object.freeze({
    strength: "high",
    summary: "Learner reported that this card was too hard."
  }),
  not_learned: Object.freeze({
    strength: "high",
    summary: "Learner reported that the target was not learned yet."
  })
});

const PRIVACY_KEY_PATTERN = /(raw.*answer|answer.*raw|raw.*prompt|prompt.*raw|transcript|hidden.*answer|hidden.*solution|secret|token|cookie|password|private.*path|provider.*config)/i;

function scanPrivacy(value, path = "", findings = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, `${path}[${index}]`, findings));
    return findings;
  }
  if (!value || typeof value !== "object") return findings;
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    if (PRIVACY_KEY_PATTERN.test(key)) findings.push({ code: "privacy_risk_key", path: childPath });
    scanPrivacy(child, childPath, findings);
  }
  return findings;
}

function normalizeSignalType(value) {
  const signalType = cleanString(value).toLowerCase();
  return SIGNAL_POLICY[signalType] ? signalType : "";
}

function sanitizeSignal(signal = {}) {
  return {
    id: cleanString(signal.id),
    workspaceId: cleanString(signal.workspaceId),
    learnerId: cleanString(signal.learnerId),
    programId: cleanString(signal.programId),
    targetNodeId: cleanString(signal.targetNodeId),
    signalType: cleanString(signal.signalType),
    strength: cleanString(signal.strength),
    summary: boundedText(signal.summary),
    sourceType: cleanString(signal.sourceType),
    createdAt: cleanString(signal.createdAt)
  };
}

function createLearningExperienceSignalService(options = {}) {
  const repository = options.repository;
  const now = typeof options.now === "function" ? options.now : () => new Date();

  function recordSignal(input = {}) {
    if (!repository || typeof repository.recordExperienceSignal !== "function") {
      return { ok: false, available: false, error: "experience_signal_repository_unavailable" };
    }
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) {
      return { ok: false, error: "experience_signal_privacy_failed", privacyFindings };
    }
    const workspaceId = cleanString(input.workspaceId);
    const learnerId = cleanString(input.learnerId) || workspaceId;
    const programId = cleanString(input.programId);
    const taskCardId = cleanString(input.taskCardId);
    const signalType = normalizeSignalType(input.signalType || input.signal_type);
    const targetNodeIds = uniqueStrings(
      asArray(input.targetNodeIds || input.target_node_ids || input.nodeIds || input.node_ids)
        .concat(input.targetNodeId || input.target_node_id || input.nodeId || input.node_id)
    ).slice(0, 8);
    if (!workspaceId || !learnerId) return { ok: false, error: "experience_signal_workspace_required" };
    if (!taskCardId) return { ok: false, error: "experience_signal_task_card_required" };
    if (!signalType) return { ok: false, error: "experience_signal_type_invalid" };
    if (!targetNodeIds.length) return { ok: false, error: "experience_signal_target_node_required" };
    const policy = SIGNAL_POLICY[signalType];
    const recordedAt = now().toISOString();
    const summary = boundedText(input.summary || input.note || policy.summary);
    const signals = [];
    let duplicateCount = 0;
    for (const nodeId of targetNodeIds) {
      const result = repository.recordExperienceSignal({
        workspaceId,
        learnerId,
        programId,
        nodeId,
        signalType,
        strength: cleanString(input.strength) || policy.strength,
        summary,
        sourceType: "learner_feedback",
        sourceRef: `learner_feedback:${taskCardId}:${nodeId}:${signalType}`,
        recordedAt
      });
      if (!result?.ok) return result || { ok: false, error: "experience_signal_write_failed" };
      if (result.duplicate) duplicateCount += 1;
      if (result.signal) signals.push(sanitizeSignal(result.signal));
    }
    return {
      ok: true,
      source: "growth-learning-experience-signal-service",
      workspaceId,
      learnerId,
      programId,
      taskCardId,
      signalType,
      targetNodeIds,
      signalCount: signals.length,
      duplicateCount,
      signals
    };
  }

  return {
    recordSignal
  };
}

module.exports = {
  createLearningExperienceSignalService
};
