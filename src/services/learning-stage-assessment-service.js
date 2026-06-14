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

function unavailable(error, extra = {}) {
  return Object.assign({ ok: false, error }, extra);
}

function boundedText(value, max = 320) {
  return cleanString(value).slice(0, max);
}

function parseTime(value) {
  const parsed = Date.parse(cleanString(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function addDaysIso(value, days) {
  const parsed = parseTime(value);
  if (!parsed) return "";
  return new Date(parsed + days * 24 * 60 * 60 * 1000).toISOString();
}

function normalizeAssessmentTarget(input = {}) {
  const coverage = uniqueStrings(
    input.assessmentCoverageNodeIds
      || input.assessment_coverage_node_ids
      || input.assessmentCoverage
      || input.assessment_coverage
      || input.targetNodeIds
      || input.target_node_ids
      || [input.targetNodeId || input.target_node_id]
  );
  const targetNodeId = cleanString(input.targetNodeId || input.target_node_id || coverage[0]);
  return {
    workspaceId: cleanString(input.workspaceId || input.workspace_id || input.learnerWorkspaceId),
    learnerId: cleanString(input.learnerId || input.learner_id || input.workspaceId || input.workspace_id || input.learnerWorkspaceId),
    programId: cleanString(input.programId || input.program_id),
    subjectId: cleanString(input.subjectId || input.subject_id),
    capabilityClusterId: cleanString(input.capabilityClusterId || input.capability_cluster_id || input.subjectId || input.subject_id || targetNodeId),
    targetNodeId,
    targetNodeIds: coverage,
    assessmentCoverageNodeIds: coverage
  };
}

function highPressureSignal(signal = {}) {
  const type = cleanString(signal.signalType || signal.signal_type).toLowerCase();
  return ["too_hard", "not_learned", "needs_repair", "prerequisite_gap", "confusing"].includes(type);
}

function challengeSignal(signal = {}) {
  const type = cleanString(signal.signalType || signal.signal_type).toLowerCase();
  return ["too_easy", "challenge_ready"].includes(type);
}

function sourceCardIdsFromProfile(profile = {}) {
  return uniqueStrings(asArray(profile.recentTrajectory).map((item) => item.taskCardId));
}

function cooldownBlock(latestCycle = null, nowMs = 0, cooldownDays = 5) {
  if (!latestCycle) return null;
  const explicitCooldownMs = parseTime(latestCycle.cooldownUntil);
  if (explicitCooldownMs && explicitCooldownMs > nowMs) {
    return {
      reason: "stage_assessment_cooldown_active",
      cooldownUntil: latestCycle.cooldownUntil,
      cycle: latestCycle
    };
  }
  const completedAt = cleanString(latestCycle.completedAt);
  const completedMs = parseTime(completedAt);
  if (completedMs && completedMs + cooldownDays * 24 * 60 * 60 * 1000 > nowMs) {
    return {
      reason: "stage_assessment_recently_completed",
      cooldownUntil: addDaysIso(completedAt, cooldownDays),
      cycle: latestCycle
    };
  }
  return null;
}

function normalizeActivationSource(input = {}) {
  const source = cleanString(input.activationSource || input.activation_source || input.source).toLowerCase();
  if (source === "owner" || source === "owner_manual") return "owner_manual";
  if (source === "executor" || source === "challenge" || source === "executor_challenge") return "executor_challenge";
  if (source === "system" || source === "auto" || source === "automatic") return "system";
  return source || "system";
}

function createLearningStageAssessmentService(options = {}) {
  const repository = options.repository;
  const profileProjectionService = options.profileProjectionService;
  const cardGenerationService = options.cardGenerationService;
  const now = typeof options.now === "function" ? options.now : () => new Date();
  const minRecentOrdinaryCards = Number(options.minRecentOrdinaryCards || 4) || 4;
  const cooldownDays = Number(options.cooldownDays || 5) || 5;

  function projectProfile(target = {}) {
    if (!profileProjectionService || typeof profileProjectionService.profileContext !== "function") {
      return unavailable("learning_profile_projection_service_unavailable");
    }
    return profileProjectionService.profileContext({
      workspaceId: target.workspaceId,
      learnerId: target.learnerId,
      programId: target.programId,
      targetNodeIds: target.assessmentCoverageNodeIds
    });
  }

  function evaluateEligibility(input = {}) {
    if (!repository || typeof repository.latestCycle !== "function" || typeof repository.saveCycle !== "function") {
      return unavailable("stage_assessment_cycle_repository_unavailable");
    }
    const target = normalizeAssessmentTarget(input);
    if (!target.workspaceId || !target.targetNodeId || !target.assessmentCoverageNodeIds.length) {
      return unavailable("stage_assessment_target_required");
    }
    const timestamp = now().toISOString();
    const latestCycle = repository.latestCycle(target);
    if (cleanString(latestCycle?.status).toLowerCase() === "active") {
      return {
        ok: true,
        eligible: true,
        activationState: "active",
        reason: "stage_assessment_already_active",
        cycle: latestCycle,
        evidence: { minimumRecentOrdinaryCards: minRecentOrdinaryCards }
      };
    }
    const block = cooldownBlock(latestCycle, parseTime(timestamp), cooldownDays);
    if (block) {
      const saved = repository.saveCycle(Object.assign({}, target, {
        cycleId: latestCycle?.cycleId,
        status: "cooldown",
        activationReason: block.reason,
        activationSource: "system",
        cooldownUntil: block.cooldownUntil,
        sourceCardIds: latestCycle?.sourceCardIds || [],
        updatedAt: timestamp
      }));
      return {
        ok: true,
        eligible: false,
        activationState: "cooldown",
        reason: block.reason,
        cooldownUntil: block.cooldownUntil,
        cycle: saved.ok ? saved.cycle : latestCycle,
        evidence: { minimumRecentOrdinaryCards: minRecentOrdinaryCards }
      };
    }
    const profile = projectProfile(target);
    if (!profile?.ok) {
      return unavailable(profile?.error || "learning_profile_projection_unavailable", {
        stage: "profile",
        profile
      });
    }
    const recentTrajectory = asArray(profile.recentTrajectory);
    const recentSignals = asArray(profile.recentExperienceSignals);
    const pressureSignals = recentSignals.filter(highPressureSignal);
    const challengeSignals = recentSignals.filter(challengeSignal);
    const enoughRecentPractice = recentTrajectory.length >= minRecentOrdinaryCards;
    const eligible = (enoughRecentPractice || challengeSignals.length > 0) && pressureSignals.length === 0;
    const reason = eligible
      ? challengeSignals.length > 0 && !enoughRecentPractice ? "challenge_ready" : "enough_recent_practice"
      : pressureSignals.length > 0 ? "recent_high_pressure_signal" : "insufficient_recent_practice";
    const saved = repository.saveCycle(Object.assign({}, target, {
      cycleId: latestCycle?.cycleId,
      status: eligible ? "eligible" : "dormant",
      activationReason: reason,
      activationSource: "system",
      eligibleAt: eligible ? timestamp : cleanString(latestCycle?.eligibleAt),
      sourceCardIds: sourceCardIdsFromProfile(profile),
      updatedAt: timestamp,
      note: boundedText(input.note)
    }));
    if (!saved?.ok) return saved;
    return {
      ok: true,
      eligible,
      activationState: saved.cycle.status,
      reason,
      cycle: saved.cycle,
      evidence: {
        minimumRecentOrdinaryCards: minRecentOrdinaryCards,
        recentTrajectoryCount: recentTrajectory.length,
        recentExperienceSignalCount: recentSignals.length,
        highPressureSignalCount: pressureSignals.length,
        challengeSignalCount: challengeSignals.length,
        sourceCardIds: sourceCardIdsFromProfile(profile)
      },
      profileSummary: profile.summary || {}
    };
  }

  async function activateStageAssessment(input = {}) {
    if (!repository || typeof repository.cycleIdFor !== "function" || typeof repository.latestCycle !== "function" || typeof repository.saveCycle !== "function") {
      return unavailable("stage_assessment_cycle_repository_unavailable");
    }
    if (!cardGenerationService || typeof cardGenerationService.generateCard !== "function") {
      return unavailable("learning_card_generation_service_unavailable");
    }
    const target = normalizeAssessmentTarget(input);
    if (!target.workspaceId || !target.targetNodeId || !target.assessmentCoverageNodeIds.length) {
      return unavailable("stage_assessment_target_required");
    }
    const timestamp = now().toISOString();
    const activationSource = normalizeActivationSource(input);
    if (!["owner_manual", "executor_challenge", "system"].includes(activationSource)) {
      return unavailable("invalid_stage_assessment_activation_source", { activationSource });
    }
    const latestCycle = repository.latestCycle(target);
    const block = cooldownBlock(latestCycle, parseTime(timestamp), cooldownDays);
    const ownerOverride = activationSource === "owner_manual";
    if (block && !ownerOverride) {
      return unavailable(block.reason, {
        stage: "policy",
        activationState: "cooldown",
        cooldownUntil: block.cooldownUntil,
        cycle: block.cycle
      });
    }
    let eligibility = null;
    if (activationSource === "system") {
      eligibility = evaluateEligibility(input);
      if (!eligibility?.ok) return eligibility;
      if (!eligibility.eligible && eligibility.activationState !== "active") {
        return unavailable("stage_assessment_not_eligible", {
          stage: "policy",
          reason: eligibility.reason,
          eligibility
        });
      }
    } else {
      const profile = projectProfile(target);
      eligibility = profile?.ok ? { ok: true, evidence: { sourceCardIds: sourceCardIdsFromProfile(profile) }, profileSummary: profile.summary || {} } : null;
    }
    const cycleId = cleanString(input.cycleId || input.id) || cleanString(latestCycle?.cycleId) || repository.cycleIdFor(target);
    const activationReason = cleanString(input.activationReason || input.activation_reason)
      || (activationSource === "owner_manual" ? "owner_manual" : activationSource === "executor_challenge" ? "challenge_requested" : "enough_recent_practice");
    const sourceCardIds = uniqueStrings(input.sourceCardIds || eligibility?.evidence?.sourceCardIds || latestCycle?.sourceCardIds || []);
    const generation = await cardGenerationService.generateCard({
      workspaceId: target.workspaceId,
      learnerId: target.learnerId,
      programId: target.programId,
      targetNodeId: target.targetNodeId,
      targetNodeIds: target.assessmentCoverageNodeIds,
      assessmentCoverageNodeIds: target.assessmentCoverageNodeIds,
      cardRole: "stage_assessment",
      difficultyBand: cleanString(input.difficultyBand || input.difficulty_band || "assessment"),
      evidenceRequirements: input.evidenceRequirements || input.evidence_requirements,
      generationKey: cleanString(input.generationKey || input.generation_key) || `stage_assessment:${cycleId}`,
      taskCardId: input.taskCardId || input.task_card_id,
      stageAssessmentCycleId: cycleId,
      activationState: "active",
      activationReason,
      activationSource,
      cooldownUntil: block?.cooldownUntil || cleanString(input.cooldownUntil || input.cooldown_until),
      sourceSummaries: input.sourceSummaries || input.source_summaries
    });
    if (!generation?.ok) {
      return unavailable(generation?.error || "stage_assessment_card_generation_failed", {
        stage: generation?.stage || "generation",
        cycle: latestCycle || { cycleId, status: "candidate" },
        generation
      });
    }
    const taskCardId = cleanString(generation.published?.taskCardId);
    const saved = repository.saveCycle(Object.assign({}, target, {
      cycleId,
      status: "active",
      activationReason,
      activationSource,
      eligibleAt: cleanString(latestCycle?.eligibleAt) || timestamp,
      activatedAt: timestamp,
      cooldownUntil: block?.cooldownUntil || cleanString(input.cooldownUntil || input.cooldown_until),
      sourceCardIds,
      generatedTaskCardId: taskCardId,
      updatedAt: timestamp,
      note: boundedText(input.note)
    }));
    if (!saved?.ok) return saved;
    return {
      ok: true,
      source: "growth-learning-stage-assessment-service",
      activationState: "active",
      activationSource,
      activationReason,
      cooldownOverridden: Boolean(block && ownerOverride),
      cycle: saved.cycle,
      generation,
      published: generation.published
    };
  }

  return {
    activateStageAssessment,
    evaluateEligibility,
    normalizeAssessmentTarget
  };
}

module.exports = {
  createLearningStageAssessmentService,
  normalizeAssessmentTarget
};
