const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningStageCheckpointControlsService,
  scanPrivacy
} = require("../src/services/learning-stage-checkpoint-controls-service");
const {
  createLearningCardRubricPolicyService
} = require("../src/services/learning-card-rubric-policy-service");

function createService(readiness = {}) {
  const calls = [];
  const service = createLearningStageCheckpointControlsService({
    stageAssessmentService: {
      stageReadiness(input) {
        calls.push(input);
        return Object.assign({
          ok: true,
          eligible: true,
          activationState: "eligible",
          reason: "enough_recent_practice",
          evidence: {
            minimumRecentOrdinaryCards: 4,
            recentTrajectoryCount: 4,
            recentExperienceSignalCount: 1,
            highPressureSignalCount: 0,
            challengeSignalCount: 0,
            sourceCardIds: ["ltask_1", "ltask_2", "ltask_3", "ltask_4"]
          },
          profileSummary: {
            masteryStateCount: 8,
            weaknessCount: 1,
            strengthCount: 3,
            recentTrajectoryCount: 4,
            recentExperienceSignalCount: 1
          }
        }, readiness);
      }
    },
    rubricPolicyService: createLearningCardRubricPolicyService()
  });
  return { calls, service };
}

test("stage checkpoint controls returns summary-only Owner activation controls", () => {
  const { calls, service } = createService();

  const result = service.controls({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    displayName: "凡凡",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    targetNodeId: "kg_science_fair_test",
    assessmentCoverageNodeIds: ["kg_science_fair_test", "kg_science_variables"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, "growth.stageCheckpointControls.v1");
  assert.equal(result.privacyClass, "summary_only");
  assert.equal(result.summary.status, "ready_for_owner_activation");
  assert.equal(result.summary.readyForOwnerActivation, true);
  assert.equal(result.policy.dailyPlanDirectPublicationAllowed, false);
  assert.equal(result.policy.formalAssessmentActivationService, "learning-stage-assessment-service");
  assert.equal(result.policy.rubricPolicyId, "rubric:stage_assessment_v1:science");
  assert.equal(result.policy.completionPolicy, "formal_assessment");
  assert.equal(result.rubricPolicy.policyId, "rubric:stage_assessment_v1:science");
  assert.equal(result.rubricPolicy.cardRole, "stage_assessment");
  assert.deepEqual(result.rubricPolicy.dimensionIds, [
    "stage_independent_understanding",
    "stage_transfer_application",
    "stage_evidence_reasoning",
    "stage_reflection_calibration"
  ]);
  assert.deepEqual(result.rubricPolicy.evidenceKeys, [
    "formal_answer",
    "independent_application",
    "coverage_reasoning",
    "formal_reflection_once"
  ]);
  assert.equal(result.rubricPolicy.assessmentPolicy.completionPolicy, "formal_assessment");
  assert.equal(result.rubricPolicy.assessmentPolicy.expectedDurationMinutes.min, 25);
  assert.equal(result.rubricPolicy.assessmentPolicy.expectedDurationMinutes.max, 30);
  assert.equal(result.readiness.evidence.recentTrajectoryCount, 4);
  const activateAction = result.actions.find((action) => action.key === "activate_stage_assessment");
  assert.equal(activateAction.enabled, true);
  assert.equal(activateAction.route.path, "/api/v1/growth/stage-assessments/activate");
  assert.equal(activateAction.route.body.activation_source, "owner_manual");
  assert.deepEqual(activateAction.route.body.assessment_coverage_node_ids, ["kg_science_fair_test", "kg_science_variables"]);
  assert.deepEqual(calls[0], {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    displayName: "凡凡",
    label: "凡凡",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    subjectId: "science",
    capabilityClusterId: "kg_science_fair_test",
    targetNodeId: "kg_science_fair_test",
    targetNodeIds: ["kg_science_fair_test", "kg_science_variables"],
    assessmentCoverageNodeIds: ["kg_science_fair_test", "kg_science_variables"]
  });
  assert.equal(JSON.stringify(result).includes("rawPrompt"), false);
});

test("stage checkpoint controls blocks activation action during cooldown", () => {
  const { service } = createService({
    eligible: false,
    activationState: "cooldown",
    reason: "stage_assessment_recently_completed",
    cooldownUntil: "2026-06-20T00:00:00.000Z",
    cycle: {
      cycleId: "cycle_stage_1",
      status: "completed",
      cooldownUntil: "2026-06-20T00:00:00.000Z",
      generatedTaskCardId: "stage_card_1",
      sourceCardIds: ["ltask_1", "stage_card_1"]
    }
  });

  const result = service.controls({
    workspaceId: "weixin_fanfan",
    targetNodeId: "kg_science_fair_test",
    assessmentCoverageNodeIds: ["kg_science_fair_test"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.summary.status, "cooldown");
  assert.equal(result.summary.inCooldown, true);
  assert.equal(result.readiness.cycle.cycleId, "cycle_stage_1");
  const activateAction = result.actions.find((action) => action.key === "activate_stage_assessment");
  assert.equal(activateAction.enabled, false);
  assert.equal(activateAction.disabledReason, "stage_assessment_cooldown_active");
});

test("stage checkpoint controls treats cooldown timestamp as blocking even when eligible", () => {
  const { service } = createService({
    eligible: true,
    activationState: "eligible",
    reason: "eligible_but_recent_formal_checkpoint",
    cooldownUntil: "2026-06-20T00:00:00.000Z"
  });

  const result = service.controls({
    workspaceId: "weixin_fanfan",
    targetNodeId: "kg_science_fair_test",
    assessmentCoverageNodeIds: ["kg_science_fair_test"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.summary.status, "cooldown");
  assert.equal(result.summary.readyForOwnerActivation, false);
  const activateAction = result.actions.find((action) => action.key === "activate_stage_assessment");
  assert.equal(activateAction.enabled, false);
  assert.equal(activateAction.disabledReason, "stage_assessment_cooldown_active");
});

test("stage checkpoint controls fails closed for privacy risk and missing dependencies", () => {
  assert.deepEqual(scanPrivacy({ nested: { rawPrompt: "bad" } }), ["$.nested.rawPrompt"]);

  const privacy = createService().service.controls({
    workspaceId: "weixin_fanfan",
    targetNodeId: "kg_science_fair_test",
    rawAnswer: "bad"
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "stage_checkpoint_controls_privacy_failed");
  assert.deepEqual(privacy.privacyFindings, ["$.rawAnswer"]);

  const missingDependency = createLearningStageCheckpointControlsService({}).controls({
    workspaceId: "weixin_fanfan",
    targetNodeId: "kg_science_fair_test"
  });
  assert.equal(missingDependency.ok, false);
  assert.equal(missingDependency.error, "stage_checkpoint_controls_stage_service_unavailable");

  const missingTarget = createService().service.controls({ workspaceId: "weixin_fanfan" });
  assert.equal(missingTarget.ok, false);
  assert.equal(missingTarget.error, "stage_checkpoint_controls_target_required");
});
