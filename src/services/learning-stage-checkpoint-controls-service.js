"use strict";

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|hidden.*answer|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map((value) => cleanString(value, 120)).filter(Boolean)));
}

function number(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

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

function unavailable(error, extra = {}) {
  return Object.assign({
    ok: false,
    source: "growth-learning-stage-checkpoint-controls-service",
    schemaVersion: "growth.stageCheckpointControls.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    error: cleanString(error) || "stage_checkpoint_controls_unavailable"
  }, extra);
}

function scopeFrom(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id || input.learnerWorkspaceId);
  const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
  const targetNodeIds = uniqueStrings(
    input.assessmentCoverageNodeIds
    || input.assessment_coverage_node_ids
    || input.assessmentCoverage
    || input.assessment_coverage
    || input.targetNodeIds
    || input.target_node_ids
    || [input.targetNodeId || input.target_node_id]
  );
  return {
    workspaceId,
    learnerId,
    displayName: cleanString(input.displayName || input.display_name || input.label, 120),
    label: cleanString(input.label || input.displayName || input.display_name, 120),
    programId: cleanString(input.programId || input.program_id),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id),
    domain: cleanString(input.domain, 80),
    subject: cleanString(input.subject, 80),
    subjectId: cleanString(input.subjectId || input.subject_id || input.subject, 120),
    capabilityClusterId: cleanString(input.capabilityClusterId || input.capability_cluster_id || input.subjectId || input.subject_id || targetNodeIds[0], 120),
    targetNodeId: cleanString(input.targetNodeId || input.target_node_id || targetNodeIds[0]),
    targetNodeIds,
    assessmentCoverageNodeIds: targetNodeIds
  };
}

function publicCycle(cycle = null) {
  if (!cycle) return null;
  return {
    cycleId: cleanString(cycle.cycleId || cycle.cycle_id),
    status: cleanString(cycle.status),
    activationReason: cleanString(cycle.activationReason || cycle.activation_reason, 160),
    activationSource: cleanString(cycle.activationSource || cycle.activation_source, 80),
    eligibleAt: cleanString(cycle.eligibleAt || cycle.eligible_at, 64),
    activatedAt: cleanString(cycle.activatedAt || cycle.activated_at, 64),
    completedAt: cleanString(cycle.completedAt || cycle.completed_at, 64),
    cooldownUntil: cleanString(cycle.cooldownUntil || cycle.cooldown_until, 64),
    generatedTaskCardId: cleanString(cycle.generatedTaskCardId || cycle.generated_task_card_id),
    sourceCardIds: uniqueStrings(cycle.sourceCardIds || cycle.source_card_ids).slice(0, 12)
  };
}

function publicReadiness(readiness = {}) {
  const evidence = readiness.evidence || {};
  return {
    ok: readiness.ok !== false,
    available: readiness.ok !== false,
    activationState: cleanString(readiness.activationState || (readiness.eligible ? "eligible" : "dormant")),
    eligible: readiness.eligible === true,
    reason: cleanString(readiness.reason, 180),
    cooldownUntil: cleanString(readiness.cooldownUntil, 64),
    cycle: publicCycle(readiness.cycle || null),
    evidence: {
      minimumRecentOrdinaryCards: number(evidence.minimumRecentOrdinaryCards),
      recentTrajectoryCount: number(evidence.recentTrajectoryCount),
      recentExperienceSignalCount: number(evidence.recentExperienceSignalCount),
      highPressureSignalCount: number(evidence.highPressureSignalCount),
      challengeSignalCount: number(evidence.challengeSignalCount),
      sourceCardIds: uniqueStrings(evidence.sourceCardIds).slice(0, 12)
    },
    profileSummary: readiness.profileSummary && typeof readiness.profileSummary === "object" ? {
      masteryStateCount: number(readiness.profileSummary.masteryStateCount),
      weaknessCount: number(readiness.profileSummary.weaknessCount),
      strengthCount: number(readiness.profileSummary.strengthCount),
      recentTrajectoryCount: number(readiness.profileSummary.recentTrajectoryCount),
      recentExperienceSignalCount: number(readiness.profileSummary.recentExperienceSignalCount)
    } : {}
  };
}

function publicRubricPolicy(policy = null) {
  if (!policy || typeof policy !== "object") return null;
  const rubricDimensions = asArray(policy.rubricDimensions).map((dimension) => ({
    dimensionId: cleanString(dimension.dimensionId, 120),
    label: cleanString(dimension.label, 120),
    scoreWeight: number(dimension.scoreWeight),
    evidenceTags: uniqueStrings(dimension.evidenceTags).slice(0, 8),
    profileTargets: uniqueStrings(dimension.profileTargets).slice(0, 8)
  })).filter((dimension) => dimension.dimensionId).slice(0, 8);
  const evidenceMapping = asArray(policy.evidenceMapping).map((item) => ({
    evidenceKey: cleanString(item.evidenceKey, 120),
    dimensionIds: uniqueStrings(item.dimensionIds).slice(0, 8),
    source: cleanString(item.source, 80)
  })).filter((item) => item.evidenceKey).slice(0, 12);
  return {
    schemaVersion: cleanString(policy.schemaVersion, 80),
    privacyClass: cleanString(policy.privacyClass || "summary_only", 40),
    summaryOnly: policy.summaryOnly !== false,
    policyId: cleanString(policy.policyId, 160),
    recipeId: cleanString(policy.recipeId, 120),
    domain: cleanString(policy.domain, 80),
    subject: cleanString(policy.subject, 80),
    cardRole: cleanString(policy.cardRole, 80),
    rubricDimensions,
    dimensionIds: rubricDimensions.map((dimension) => dimension.dimensionId),
    evidenceMapping,
    evidenceKeys: evidenceMapping.map((item) => item.evidenceKey),
    assessmentPolicy: policy.assessmentPolicy && typeof policy.assessmentPolicy === "object" ? {
      completionPolicy: cleanString(policy.assessmentPolicy.completionPolicy, 80),
      evidenceWeight: cleanString(policy.assessmentPolicy.evidenceWeight, 80),
      expectedDurationMinutes: policy.assessmentPolicy.expectedDurationMinutes && typeof policy.assessmentPolicy.expectedDurationMinutes === "object" ? {
        min: number(policy.assessmentPolicy.expectedDurationMinutes.min),
        max: number(policy.assessmentPolicy.expectedDurationMinutes.max)
      } : {},
      evaluationAttempts: number(policy.assessmentPolicy.evaluationAttempts),
      reflectionAttempts: number(policy.assessmentPolicy.reflectionAttempts)
    } : {}
  };
}

function resolveFormalRubricPolicy(rubricPolicyService = null, scope = {}) {
  if (!rubricPolicyService || typeof rubricPolicyService.resolveRubricPolicy !== "function") return null;
  const resolved = rubricPolicyService.resolveRubricPolicy({
    cardRole: "stage_assessment",
    completionPolicy: { mode: "formal_assessment" },
    domain: scope.domain,
    subject: scope.subject || scope.subjectId,
    subjectId: scope.subjectId
  });
  if (!resolved?.ok || !resolved.policy) return null;
  return publicRubricPolicy(resolved.policy);
}

function routeTemplate(path, body = {}, method = "POST") {
  return {
    method,
    path,
    body
  };
}

function activationBody(scope = {}) {
  return {
    workspace_id: scope.workspaceId,
    learner_id: scope.learnerId,
    program_id: scope.programId,
    subject_id: scope.subjectId,
    capability_cluster_id: scope.capabilityClusterId,
    target_node_id: scope.targetNodeId,
    assessment_coverage_node_ids: scope.assessmentCoverageNodeIds,
    activation_source: "owner_manual"
  };
}

function createLearningStageCheckpointControlsService(options = {}) {
  const stageAssessmentService = options.stageAssessmentService || null;
  const rubricPolicyService = options.rubricPolicyService || null;

  function controls(input = {}) {
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) {
      return unavailable("stage_checkpoint_controls_privacy_failed", { privacyFindings });
    }
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("stage_checkpoint_controls_workspace_required", { scope });
    if (!scope.targetNodeId || !scope.assessmentCoverageNodeIds.length) {
      return unavailable("stage_checkpoint_controls_target_required", { scope });
    }
    if (!stageAssessmentService || typeof stageAssessmentService.stageReadiness !== "function") {
      return unavailable("stage_checkpoint_controls_stage_service_unavailable", { scope });
    }
    const rawReadiness = stageAssessmentService.stageReadiness(scope);
    const readiness = publicReadiness(rawReadiness || {});
    if (rawReadiness?.ok === false) {
      return unavailable(rawReadiness.error || "stage_checkpoint_controls_readiness_failed", {
        scope,
        readiness
      });
    }
    const inCooldown = readiness.activationState === "cooldown" || Boolean(readiness.cooldownUntil);
    const active = readiness.activationState === "active";
    const activationReady = readiness.eligible && !active && !inCooldown;
    const rubricPolicy = resolveFormalRubricPolicy(rubricPolicyService, scope);
    return {
      ok: true,
      source: "growth-learning-stage-checkpoint-controls-service",
      schemaVersion: "growth.stageCheckpointControls.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      target: {
        workspaceId: scope.workspaceId,
        learnerId: scope.learnerId,
        displayName: scope.displayName,
        label: scope.label
      },
      scope: {
        programId: scope.programId,
        domainPackId: scope.domainPackId,
        domain: scope.domain,
        subject: scope.subject,
        subjectId: scope.subjectId,
        capabilityClusterId: scope.capabilityClusterId,
        targetNodeId: scope.targetNodeId,
        targetNodeIds: scope.targetNodeIds,
        assessmentCoverageNodeIds: scope.assessmentCoverageNodeIds
      },
      readiness,
      policy: {
        formalAssessmentActivationService: "learning-stage-assessment-service",
        dailyPlanDirectPublicationAllowed: false,
        ownerManualActivationAllowed: true,
        learnerChallengeAllowed: !inCooldown,
        lowPressureDailyPracticeSeparate: true,
        rubricPolicyId: rubricPolicy?.policyId || "",
        completionPolicy: rubricPolicy?.assessmentPolicy?.completionPolicy || "formal_assessment"
      },
      rubricPolicy,
      actions: [{
        key: "refresh_stage_checkpoint_controls",
        label: "refresh",
        requiredActor: "owner",
        write: false,
        enabled: true,
        route: routeTemplate("/api/v1/growth/stage-assessments/controls", {}, "GET")
      }, {
        key: "activate_stage_assessment",
        label: "activate_formal_checkpoint",
        requiredActor: "owner",
        write: true,
        enabled: activationReady,
        disabledReason: activationReady ? "" : active ? "stage_assessment_already_active" : inCooldown ? "stage_assessment_cooldown_active" : readiness.reason || "stage_assessment_not_eligible",
        route: routeTemplate("/api/v1/growth/stage-assessments/activate", activationBody(scope))
      }, {
        key: "learner_challenge_route",
        label: "learner_challenge",
        requiredActor: "learner",
        write: true,
        enabled: !inCooldown,
        disabledReason: inCooldown ? "stage_assessment_cooldown_active" : "",
        route: routeTemplate("/api/v1/growth/stage-assessments/challenge", Object.assign({}, activationBody(scope), {
          activation_source: "executor_challenge"
        }))
      }],
      summary: {
        status: active ? "active" : inCooldown ? "cooldown" : activationReady ? "ready_for_owner_activation" : "not_ready",
        eligible: readiness.eligible,
        activationState: readiness.activationState,
        readyForOwnerActivation: activationReady,
        inCooldown,
        active,
        recentTrajectoryCount: readiness.evidence.recentTrajectoryCount,
        highPressureSignalCount: readiness.evidence.highPressureSignalCount,
        challengeSignalCount: readiness.evidence.challengeSignalCount,
        sourceCardCount: readiness.evidence.sourceCardIds.length
      }
    };
  }

  return {
    controls
  };
}

module.exports = {
  createLearningStageCheckpointControlsService,
  scanPrivacy
};
