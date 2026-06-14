const assert = require("node:assert/strict");
const test = require("node:test");

const { createLearningProfileProjectionService } = require("../src/services/learning-profile-projection-service");

test("learning profile projection returns bounded mastery, signal, trajectory, and next strategy", () => {
  const calls = [];
  const service = createLearningProfileProjectionService({
    repository: {
      projectForNextCard(input) {
        calls.push(input);
        return {
          ok: true,
          masterySummary: {
            targetNodeIds: ["kg_english_evidence_answering"],
            masteryStates: [{
              nodeId: "kg_english_evidence_answering",
              status: "developing",
              masteryLevel: "foundation",
              score: 64,
              confidence: 0.72,
              evidenceCount: 2,
              summary: "Can give a reason, but needs exact text evidence.",
              typicalWeaknesses: ["Quote exact evidence.", "Avoid vague support."],
              rawAnswer: "RAW ANSWER MUST NOT PROJECT"
            }],
            strengths: [{
              nodeId: "kg_english_vocab_context",
              status: "strengthening",
              score: 90,
              summary: "Uses context clues."
            }],
            weaknesses: [{
              nodeId: "kg_english_evidence_answering",
              status: "developing",
              score: 64,
              summary: "Needs exact text evidence."
            }]
          },
          recentExperienceSignals: [{
            targetNodeId: "kg_english_evidence_answering",
            signalType: "not_learned",
            strength: "medium",
            summary: "Needs another focused practice.",
            sourceRef: "evaluation:eval_1"
          }],
          recentTrajectory: [{
            id: "traj_1",
            taskCardId: "ltask_1",
            sourceEvaluationId: "eval_1",
            strategy: "stabilize",
            difficultyBand: "foundation",
            targetNodeIds: ["kg_english_evidence_answering"],
            performanceSummary: "Score 64; evidence was vague.",
            confirmedStrengths: ["Gives a reason."],
            remainingWeaknesses: ["Quote exact evidence."],
            nextRecommendation: {
              status: "pending",
              strategy: "stabilize",
              supportLevel: "light_hint",
              reason: "Narrow evidence practice.",
              sourceTaskCardId: "ltask_1",
              sourceEvaluationId: "eval_1"
            },
            createdAt: "2026-06-14T08:00:00.000Z"
          }]
        };
      }
    },
    nextCardStrategyService: {
      chooseNextCardStrategy(input) {
        assert.equal(input.masterySummary.masteryStates[0].nodeId, "kg_english_evidence_answering");
        return {
          ok: true,
          strategy: "stabilize",
          cardRole: "practice",
          difficultyBand: "foundation",
          targetNodeIds: ["kg_english_evidence_answering"],
          reason: "Use one more short evidence-answering card."
        };
      }
    }
  });

  const result = service.profileContext({
    workspaceId: "weixin_stephen",
    learnerId: "weixin_stephen",
    targetNodeIds: ["kg_english_evidence_answering"]
  });

  assert.equal(result.ok, true);
  assert.equal(calls[0].workspaceId, "weixin_stephen");
  assert.equal(result.summary.masteryStateCount, 1);
  assert.equal(result.masteryStates[0].nodeId, "kg_english_evidence_answering");
  assert.equal(result.weaknesses[0].summary, "Needs exact text evidence.");
  assert.equal(result.recentExperienceSignals[0].signalType, "not_learned");
  assert.equal(result.recentTrajectory[0].id, "traj_1");
  assert.equal(result.recentTrajectory[0].strategy, "stabilize");
  assert.equal(result.recentTrajectory[0].nextRecommendation.status, "pending");
  assert.equal(result.recentTrajectory[0].nextRecommendation.supportLevel, "light_hint");
  assert.equal(result.nextCardStrategy.strategy, "stabilize");
  assert.equal(JSON.stringify(result).includes("RAW ANSWER"), false);
  assert.equal(JSON.stringify(result).includes("sourceRef"), false);
});

test("learning profile projection fails closed when repository is unavailable", () => {
  const service = createLearningProfileProjectionService({});

  const result = service.profileContext({
    workspaceId: "weixin_stephen",
    targetNodeIds: ["kg_english_evidence_answering"]
  });

  assert.equal(result.ok, false);
  assert.equal(result.available, false);
  assert.equal(result.error, "learning_profile_repository_unavailable");
});
