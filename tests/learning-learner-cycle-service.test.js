const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningLearnerCycleService
} = require("../src/services/learning-learner-cycle-service");

function baseAuditDependencies(overrides = {}) {
  return {
    growthService: {
      card: () => overrides.card || {
        ok: true,
        card: {
          taskCardId: "ltask_stage_1",
          status: "active",
          laneId: "doing",
          primaryAction: "submit"
        }
      }
    },
    cycleAuditService: {
      listCycleAudit: () => overrides.cycleAudit || {
        ok: true,
        available: true,
        source: "growth-learning-cycle-audit-service",
        summary: {
          planDraftCount: 1,
          evidenceCount: 1,
          profileDeltaCount: 1,
          correctionCount: 0,
          hasPublishedPlan: true,
          hasEvaluationEvidence: true,
          hasProfileDelta: true,
          latestActivityAt: "2026-06-15T01:05:00.000Z"
        },
        partialFailures: [],
        timeline: [{
          type: "stage_assessment_completed",
          id: "stage_cycle_1",
          at: "2026-06-15T01:05:00.000Z"
        }]
      }
    },
    auditCompletenessService: {
      evaluateCycleCompleteness: () => overrides.completeness || {
        ok: true,
        available: true,
        source: "growth-learning-audit-completeness-service",
        complete: true,
        readyForAutomation: true,
        summary: {
          requiredCount: 3,
          satisfiedRequiredCount: 3,
          missingRequired: [],
          planPublished: true,
          evaluationEvidence: true,
          profileDelta: true,
          ownerCorrectionAvailable: false,
          latestActivityAt: "2026-06-15T01:05:00.000Z"
        },
        findings: []
      }
    }
  };
}

test("learner cycle evaluation projects formal stage-assessment completion readback", async () => {
  const dependencies = baseAuditDependencies();
  const service = createLearningLearnerCycleService({
    ...dependencies,
    evaluationService: {
      processEvaluationQueue: () => ({
        ok: true,
        available: true,
        processed: 1,
        results: [{
          jobId: "lejob_stage_1",
          ok: true,
          status: "done",
          stage_assessment_cycle: {
            ok: true,
            activationState: "cooldown",
            completedAt: "2026-06-15T01:05:00.000Z",
            cooldownUntil: "2026-06-20T01:05:00.000Z",
            cycle: {
              cycleId: "stage_cycle_1",
              status: "completed",
              generatedTaskCardId: "ltask_stage_1",
              rawPrompt: "must_not_leak",
              privatePath: "/Users/private/stage.json"
            }
          }
        }]
      })
    }
  });

  const result = await service.evaluate({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    taskCardId: "ltask_stage_1"
  });

  assert.equal(result.ok, true);
  assert.equal(result.operation, "evaluate");
  assert.equal(result.schemaVersion, "growth.learningLearnerCycleSmoke.v1");
  assert.equal(result.privacyClass, "summary_only");
  assert.equal(result.summaryOnly, true);
  assert.equal(result.evaluationQueue.processed, 1);
  assert.equal(result.evaluationQueue.results.length, 1);

  const stageCycle = result.evaluationQueue.results[0].stageAssessmentCycle;
  assert.deepEqual(stageCycle, {
    ok: true,
    skipped: false,
    reason: "",
    activationState: "cooldown",
    cycleId: "stage_cycle_1",
    cycleStatus: "completed",
    generatedTaskCardId: "ltask_stage_1",
    completedAt: "2026-06-15T01:05:00.000Z",
    cooldownUntil: "2026-06-20T01:05:00.000Z"
  });

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("rawPrompt"), false);
  assert.equal(serialized.includes("must_not_leak"), false);
  assert.equal(serialized.includes("privatePath"), false);
  assert.equal(serialized.includes("/Users/private"), false);
});

test("learner cycle service fails closed when input contains private raw fields", async () => {
  const service = createLearningLearnerCycleService({
    ...baseAuditDependencies(),
    evaluationService: {
      processEvaluationQueue: () => {
        throw new Error("evaluation should not run after privacy failure");
      }
    }
  });

  const result = await service.evaluate({
    workspaceId: "weixin_fanfan",
    taskCardId: "ltask_stage_1",
    rawPrompt: "hidden instruction",
    providerConfig: { token: "secret-token" }
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_learner_cycle_privacy_failed");
  assert.equal(result.privacyClass, "summary_only");
  assert.deepEqual(result.privacyFindings, ["$.rawPrompt", "$.providerConfig", "$.providerConfig.token"]);
});
