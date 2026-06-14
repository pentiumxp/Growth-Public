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
  assert.equal(result.evidenceBasis.sourceEvaluationId, "eval_1");
  assert.equal(JSON.stringify(result).includes("RAW ANSWER"), false);
  assert.equal(JSON.stringify(result).includes("sourceRef"), false);
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
