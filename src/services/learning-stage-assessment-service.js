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

function parseJson(text, fallback) {
  if (!text) return fallback;
  if (typeof text === "object") return text;
  try {
    return JSON.parse(text);
  } catch (_error) {
    return fallback;
  }
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
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id),
    domain: cleanString(input.domain),
    subject: cleanString(input.subject),
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

function taskRaw(taskCard = {}) {
  return parseJson(taskCard.raw_json, {}) || {};
}

function completionPolicyMode(taskCard = {}) {
  const raw = taskRaw(taskCard);
  return cleanString(
    taskCard.completionPolicy?.mode
      || taskCard.completion_policy
      || parseJson(taskCard.completion_policy_json, {})?.mode
      || raw.completionPolicy?.mode
      || raw.completion_policy?.mode
  ).toLowerCase();
}

function taskCardRole(taskCard = {}) {
  const raw = taskRaw(taskCard);
  return cleanString(taskCard.card_role || taskCard.cardRole || raw.cardRole || raw.card_role).toLowerCase();
}

function stageAssessmentCycleIdFromTask(taskCard = {}) {
  const raw = taskRaw(taskCard);
  return cleanString(
    taskCard.stage_assessment_cycle_id
      || taskCard.stageAssessmentCycleId
      || raw.stageAssessment?.cycleId
      || raw.stage_assessment?.cycle_id
  );
}

function isStageAssessmentTask(taskCard = {}) {
  return taskCardRole(taskCard) === "stage_assessment" || completionPolicyMode(taskCard) === "formal_assessment";
}

function assessmentTargetFromTask(taskCard = {}, input = {}) {
  const raw = taskRaw(taskCard);
  const learningGraph = raw.learningGraph || raw.learning_graph || {};
  return normalizeAssessmentTarget({
    workspaceId: input.workspaceId || taskCard.workspace_id || taskCard.workspaceId,
    learnerId: input.learnerId || taskCard.learner_id || taskCard.learnerId || taskCard.workspace_id || taskCard.workspaceId,
    programId: input.programId || taskCard.program_id || taskCard.programId,
    domainPackId: input.domainPackId || raw.learningGraph?.domainPackId || raw.learning_graph?.domain_pack_id || taskCard.domain_pack_id,
    domain: input.domain || raw.domain || learningGraph.domain || taskCard.domain,
    subject: input.subject || raw.subject || learningGraph.subject || taskCard.subject,
    subjectId: input.subjectId || taskCard.subject_id || taskCard.subjectId || taskCard.domain,
    capabilityClusterId: input.capabilityClusterId || taskCard.capability_cluster_id || taskCard.capabilityClusterId,
    assessmentCoverageNodeIds: uniqueStrings(
      input.assessmentCoverageNodeIds
        || learningGraph.assessmentCoverageNodeIds
        || learningGraph.assessment_coverage_node_ids
        || raw.assessmentCoverageNodeIds
        || raw.assessment_coverage_node_ids
        || learningGraph.targetNodeIds
        || learningGraph.target_node_ids
        || parseJson(taskCard.skill_ids_json, [])
    )
  });
}

function createLearningStageAssessmentService(options = {}) {
  const repository = options.repository;
  const profileProjectionService = options.profileProjectionService;
  const cardGenerationService = options.cardGenerationService;
  const rubricPolicyService = options.rubricPolicyService || null;
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

  function resolveStageRubricPolicy(input = {}, target = {}) {
    if (input.rubricPolicy) return input.rubricPolicy;
    if (!rubricPolicyService || typeof rubricPolicyService.resolveRubricPolicy !== "function") return null;
    const resolved = rubricPolicyService.resolveRubricPolicy({
      domainPackId: input.domainPackId || input.domain_pack_id || target.domainPackId,
      domain: input.domain || target.domain,
      subject: input.subject || target.subject || target.subjectId,
      subjectId: input.subjectId || input.subject_id || target.subjectId,
      cardRole: "stage_assessment",
      completionPolicy: { mode: "formal_assessment" }
    });
    return resolved?.ok ? resolved.policy : null;
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

  function stageReadiness(input = {}) {
    if (!repository || typeof repository.latestCycle !== "function") {
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
      return {
        ok: true,
        eligible: false,
        activationState: "cooldown",
        reason: block.reason,
        cooldownUntil: block.cooldownUntil,
        cycle: block.cycle,
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
    return {
      ok: true,
      eligible,
      activationState: eligible ? "eligible" : "dormant",
      reason,
      cycle: latestCycle || null,
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
      domainPackId: target.domainPackId,
      domain: target.domain,
      subject: target.subject || target.subjectId,
      subjectId: target.subjectId,
      targetNodeId: target.targetNodeId,
      targetNodeIds: target.assessmentCoverageNodeIds,
      assessmentCoverageNodeIds: target.assessmentCoverageNodeIds,
      cardRole: "stage_assessment",
      rubricPolicy: resolveStageRubricPolicy(input, target),
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

  function recordAssessmentCompletion(input = {}) {
    if (!repository || typeof repository.saveCycle !== "function") {
      return unavailable("stage_assessment_cycle_repository_unavailable");
    }
    const taskCard = input.taskCard || {};
    if (!isStageAssessmentTask(taskCard)) {
      return { ok: true, skipped: true, reason: "not_stage_assessment" };
    }
    const cycleId = cleanString(input.cycleId || input.stageAssessmentCycleId || stageAssessmentCycleIdFromTask(taskCard));
    if (!cycleId) {
      return unavailable("stage_assessment_cycle_id_required");
    }
    const timestamp = cleanString(input.completedAt || input.evaluation?.evaluatedAt || input.evaluation?.createdAt) || now().toISOString();
    const cooldownUntil = cleanString(input.cooldownUntil || taskCard.cooldown_until || taskCard.cooldownUntil) || addDaysIso(timestamp, cooldownDays);
    const target = assessmentTargetFromTask(taskCard, input);
    const byId = typeof repository.cycleById === "function" ? repository.cycleById(cycleId) : null;
    const latestCycle = byId || (typeof repository.latestCycle === "function" ? repository.latestCycle(target) : null);
    const saveTarget = Object.assign({}, target, {
      workspaceId: cleanString(latestCycle?.workspaceId) || target.workspaceId,
      learnerId: cleanString(latestCycle?.learnerId) || target.learnerId,
      programId: cleanString(latestCycle?.programId) || target.programId,
      subjectId: cleanString(latestCycle?.subjectId) || target.subjectId,
      capabilityClusterId: cleanString(latestCycle?.capabilityClusterId) || target.capabilityClusterId,
      targetNodeIds: uniqueStrings(latestCycle?.targetNodeIds || target.targetNodeIds),
      assessmentCoverageNodeIds: uniqueStrings(latestCycle?.targetNodeIds || target.assessmentCoverageNodeIds)
    });
    const taskCardId = cleanString(taskCard.id || taskCard.taskCardId || input.taskCardId);
    const generatedTaskCardId = cleanString(latestCycle?.generatedTaskCardId || taskCardId);
    const saved = repository.saveCycle(Object.assign({}, saveTarget, {
      cycleId,
      status: "completed",
      activationReason: cleanString(latestCycle?.activationReason || taskCard.activation_reason || taskCard.activationReason),
      activationSource: cleanString(latestCycle?.activationSource || taskCard.activation_source || taskCard.activationSource),
      eligibleAt: cleanString(latestCycle?.eligibleAt),
      activatedAt: cleanString(latestCycle?.activatedAt || taskCard.activated_at || taskCard.activatedAt),
      completedAt: timestamp,
      cooldownUntil,
      sourceCardIds: uniqueStrings(asArray(latestCycle?.sourceCardIds).concat(taskCardId)),
      generatedTaskCardId,
      updatedAt: timestamp,
      note: boundedText(input.note || "completed_after_evaluation")
    }));
    if (!saved?.ok) return saved;
    return {
      ok: true,
      source: "growth-learning-stage-assessment-service",
      activationState: "cooldown",
      completedAt: timestamp,
      cooldownUntil,
      cycle: saved.cycle
    };
  }

  return {
    activateStageAssessment,
    evaluateEligibility,
    normalizeAssessmentTarget,
    recordAssessmentCompletion,
    stageReadiness
  };
}

module.exports = {
  createLearningStageAssessmentService,
  isStageAssessmentTask,
  normalizeAssessmentTarget
};
