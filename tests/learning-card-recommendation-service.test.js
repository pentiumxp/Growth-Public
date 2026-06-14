const assert = require("node:assert/strict");
const test = require("node:test");

const { createLearningCardRecommendationService } = require("../src/services/learning-card-recommendation-service");

test("recommendation service uses the latest trajectory recommendation before recomputed profile strategy", () => {
  const service = createLearningCardRecommendationService({
    profileProjectionService: {
      profileContext(input) {
        assert.equal(input.workspaceId, "weixin_fanfan");
        assert.equal(input.learnerId, "fanfan");
        return {
          ok: true,
          summary: {
            masteryStateCount: 2,
            weaknessCount: 1,
            strengthCount: 1,
            recentExperienceSignalCount: 1,
            recentTrajectoryCount: 1,
            lastTrajectoryAt: "2026-06-14T08:00:00.000Z"
          },
          recentTrajectory: [{
            id: "traj_1",
            taskCardId: "ltask_1",
            sourceEvaluationId: "eval_1",
            strategy: "stabilize",
            targetNodeIds: ["kg_english_evidence_answering"],
            nextRecommendation: {
              strategy: "repair",
              cardRole: "teaching",
              difficultyBand: "repair",
              supportLevel: "guided",
              targetNodeIds: ["kg_english_evidence_answering"],
              reason: "Latest evaluation shows vague evidence, so generate one repair card."
            },
            rawAnswer: "RAW ANSWER MUST NOT PROJECT",
            sourceRef: "private:eval_1"
          }],
          nextCardStrategy: {
            ok: true,
            strategy: "stretch",
            cardRole: "practice",
            difficultyBand: "stretch",
            targetNodeIds: ["kg_english_main_idea"],
            reason: "Recomputed strategy should not override a newer persisted trajectory recommendation."
          }
        };
      }
    }
  });

  const result = service.recommendNextCard({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_english"
  });

  assert.equal(result.ok, true);
  assert.equal(result.recommendationMode, "trajectory");
  assert.equal(result.strategy, "repair");
  assert.equal(result.cardRole, "teaching");
  assert.equal(result.difficultyBand, "repair");
  assert.deepEqual(result.targetNodeIds, ["kg_english_evidence_answering"]);
  assert.equal(result.recommendationId, "traj_1");
  assert.equal(result.recommendationStatus, "pending");
  assert.equal(result.evidenceBasis.trajectoryId, "traj_1");
  assert.equal(result.evidenceBasis.sourceEvaluationId, "eval_1");
  assert.equal(JSON.stringify(result).includes("RAW ANSWER"), false);
  assert.equal(JSON.stringify(result).includes("sourceRef"), false);
});

test("recommendation service skips consumed trajectory recommendations", () => {
  const service = createLearningCardRecommendationService({
    profileProjectionService: {
      profileContext() {
        return {
          ok: true,
          summary: { recentTrajectoryCount: 2 },
          recentTrajectory: [{
            id: "traj_consumed",
            taskCardId: "ltask_old",
            sourceEvaluationId: "eval_old",
            targetNodeIds: ["kg_english_evidence_answering"],
            nextRecommendation: {
              status: "accepted",
              strategy: "repair",
              targetNodeIds: ["kg_english_evidence_answering"],
              generatedTaskCardId: "ltask_generated"
            }
          }, {
            id: "traj_superseded",
            taskCardId: "ltask_middle",
            sourceEvaluationId: "eval_middle",
            targetNodeIds: ["kg_english_evidence_answering"],
            nextRecommendation: {
              status: "superseded",
              strategy: "repair",
              targetNodeIds: ["kg_english_evidence_answering"],
              supersededByTrajectoryId: "traj_pending"
            }
          }, {
            id: "traj_pending",
            taskCardId: "ltask_new",
            sourceEvaluationId: "eval_new",
            targetNodeIds: ["kg_english_main_idea"],
            nextRecommendation: {
              status: "pending",
              strategy: "stabilize",
              cardRole: "practice",
              difficultyBand: "foundation",
              targetNodeIds: ["kg_english_main_idea"],
              reason: "Use the next unconsumed recommendation."
            }
          }],
          nextCardStrategy: {
            ok: true,
            strategy: "stretch",
            targetNodeIds: ["kg_english_vocab_context"]
          }
        };
      }
    }
  });

  const result = service.recommendNextCard({ workspaceId: "weixin_fanfan" });

  assert.equal(result.ok, true);
  assert.equal(result.recommendationMode, "trajectory");
  assert.equal(result.recommendationId, "traj_pending");
  assert.equal(result.strategy, "stabilize");
  assert.deepEqual(result.targetNodeIds, ["kg_english_main_idea"]);
});

test("recommendation service marks a selected trajectory recommendation accepted through the repository", () => {
  const calls = [];
  const service = createLearningCardRecommendationService({
    repository: {
      markTrajectoryRecommendationAccepted(input) {
        calls.push(input);
        return { ok: true, trajectory: { id: input.trajectoryId } };
      }
    },
    profileProjectionService: {
      profileContext() {
        return { ok: true, recentTrajectory: [], nextCardStrategy: null };
      }
    }
  });

  const result = service.markRecommendationAccepted({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_1",
    evidenceBasis: {
      trajectoryId: "traj_1",
      taskCardId: "ltask_1",
      sourceEvaluationId: "eval_1"
    },
    generatedTaskCardId: "ltask_generated",
    generatedLearningGraphPlanId: "lgp_1",
    acceptedAt: "2026-06-14T09:00:00.000Z"
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls[0], {
    trajectoryId: "traj_1",
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_1",
    sourceTaskCardId: "ltask_1",
    sourceEvaluationId: "eval_1",
    generatedTaskCardId: "ltask_generated",
    generatedLearningGraphPlanId: "lgp_1",
    acceptedAt: "2026-06-14T09:00:00.000Z"
  });
});

test("recommendation service falls back to profile next-card strategy", () => {
  const service = createLearningCardRecommendationService({
    profileProjectionService: {
      profileContext() {
        return {
          ok: true,
          summary: { recentTrajectoryCount: 0 },
          recentTrajectory: [],
          nextCardStrategy: {
            ok: true,
            strategy: "stabilize",
            cardRole: "practice",
            difficultyBand: "foundation",
            supportLevel: "light_hint",
            targetNodeIds: ["kg_english_main_idea"],
            reason: "Use one ordinary stabilization card."
          }
        };
      }
    }
  });

  const result = service.recommendNextCard({ workspaceId: "weixin_fanfan" });

  assert.equal(result.ok, true);
  assert.equal(result.recommendationMode, "profile_strategy");
  assert.equal(result.targetNodeIds[0], "kg_english_main_idea");
  assert.equal(result.strategy, "stabilize");
  assert.equal(result.learningProfileSummary.recentTrajectoryCount, 0);
});

test("recommendation service fails closed when profile projection is unavailable", () => {
  const service = createLearningCardRecommendationService({});

  const result = service.recommendNextCard({ workspaceId: "weixin_fanfan" });

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_profile_projection_unavailable");
  assert.equal(result.available, false);
});
