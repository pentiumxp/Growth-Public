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

function scoreTo100(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed > 0 && parsed <= 1) return Math.round(parsed * 100);
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function confidenceValue(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0;
}

function stateNodeId(state = {}) {
  return cleanString(state.nodeId || state.targetNodeId || state.skillId);
}

function signalNodeId(signal = {}) {
  return cleanString(signal.targetNodeId || signal.nodeId || signal.skillId);
}

function firstNodeId(items = []) {
  for (const item of items) {
    const nodeId = stateNodeId(item) || signalNodeId(item);
    if (nodeId) return nodeId;
  }
  return "";
}

function createLearningNextCardStrategyService() {
  function chooseNextCardStrategy(input = {}) {
    const masteryStates = asArray(input.masterySummary?.masteryStates || input.masteryStates);
    const signals = asArray(input.recentExperienceSignals || input.experienceSignals);
    const trajectories = asArray(input.recentTrajectory);
    const weakSignalTypes = new Set(["too_hard", "not_learned", "confusing", "needs_repair", "prerequisite_gap"]);
    const highSignalTypes = new Set(["challenge_ready", "too_easy"]);
    const weakSignals = signals.filter((signal) => weakSignalTypes.has(cleanString(signal.signalType).toLowerCase()));
    const highSignals = signals.filter((signal) => highSignalTypes.has(cleanString(signal.signalType).toLowerCase()));
    const weakStates = masteryStates.filter((state) => {
      const status = cleanString(state.status || state.mastery).toLowerCase();
      return ["needs_repair", "repair", "weak", "unstable"].includes(status) || scoreTo100(state.score) < 60;
    });
    const stableHighStates = masteryStates.filter((state) => {
      const status = cleanString(state.status || state.mastery || state.masteryLevel).toLowerCase();
      const evidenceCount = Number(state.evidenceCount || state.evidence_count || 0) || 0;
      return scoreTo100(state.score) >= 85
        && confidenceValue(state.confidence) >= 0.75
        && evidenceCount >= 2
        && ["strengthening", "mastered", "stable", ""].includes(status);
    });
    const recentRepairTrajectory = trajectories.find((trajectory) => cleanString(trajectory.strategy).toLowerCase() === "repair");
    if (weakSignals.length || weakStates.length) {
      const targetNodeIds = uniqueStrings([
        firstNodeId(weakSignals),
        firstNodeId(weakStates),
        firstNodeId(masteryStates)
      ]);
      const severe = weakSignals.length || weakStates.some((state) => scoreTo100(state.score) < 55);
      return {
        ok: true,
        source: "growth-learning-next-card-strategy-service",
        strategy: severe ? "repair" : "stabilize",
        cardRole: severe ? "teaching" : "practice",
        difficultyBand: severe ? "repair" : "foundation",
        supportLevel: severe ? "guided" : "light_hint",
        targetNodeIds,
        reason: severe
          ? "Weak or not-learned evidence should generate a narrower repair teaching card."
          : "Mixed evidence should stabilize the current skill before stretching.",
        evidenceBasis: {
          weakSignalCount: weakSignals.length,
          weakStateCount: weakStates.length,
          recentRepairTrajectory: Boolean(recentRepairTrajectory)
        }
      };
    }
    if (stableHighStates.length && (highSignals.length || stableHighStates.length >= 1)) {
      return {
        ok: true,
        source: "growth-learning-next-card-strategy-service",
        strategy: "stretch",
        cardRole: "practice",
        difficultyBand: "stretch",
        supportLevel: "light_hint",
        targetNodeIds: uniqueStrings([firstNodeId(stableHighStates), firstNodeId(highSignals)]),
        reason: "Stable high-confidence evidence allows a controlled stretch card.",
        evidenceBasis: {
          stableHighStateCount: stableHighStates.length,
          highSignalCount: highSignals.length
        }
      };
    }
    return {
      ok: true,
      source: "growth-learning-next-card-strategy-service",
      strategy: "stabilize",
      cardRole: "practice",
      difficultyBand: "foundation",
      supportLevel: "guided",
      targetNodeIds: uniqueStrings([firstNodeId(masteryStates), firstNodeId(signals)]),
      reason: "No strong repair or stretch signal is present, so continue with low-pressure stabilization.",
      evidenceBasis: {
        masteryStateCount: masteryStates.length,
        signalCount: signals.length
      }
    };
  }

  return {
    chooseNextCardStrategy
  };
}

module.exports = {
  createLearningNextCardStrategyService
};
