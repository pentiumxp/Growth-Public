const assert = require("node:assert/strict");
const test = require("node:test");

const { createLearningNextCardStrategyService } = require("../src/services/learning-next-card-strategy-service");

test("next-card strategy chooses repair for weak or not-learned evidence", () => {
  const service = createLearningNextCardStrategyService();
  const result = service.chooseNextCardStrategy({
    masterySummary: {
      masteryStates: [{
        nodeId: "kg_english_evidence_answering",
        status: "needs_repair",
        score: 42,
        confidence: 0.78,
        summary: "Needs direct evidence."
      }]
    },
    recentExperienceSignals: [{
      signalType: "not_learned",
      targetNodeId: "kg_english_evidence_answering",
      summary: "Needs direct evidence."
    }]
  });

  assert.equal(result.ok, true);
  assert.equal(result.strategy, "repair");
  assert.equal(result.cardRole, "teaching");
  assert.equal(result.difficultyBand, "repair");
  assert.deepEqual(result.targetNodeIds, ["kg_english_evidence_answering"]);
});

test("next-card strategy chooses stretch only for stable high-confidence evidence", () => {
  const service = createLearningNextCardStrategyService();
  const result = service.chooseNextCardStrategy({
    masterySummary: {
      masteryStates: [{
        nodeId: "kg_english_evidence_answering",
        status: "strengthening",
        masteryLevel: "stable",
        score: 94,
        confidence: 0.88,
        evidenceCount: 4
      }]
    },
    recentExperienceSignals: [{
      signalType: "challenge_ready",
      targetNodeId: "kg_english_evidence_answering"
    }]
  });

  assert.equal(result.ok, true);
  assert.equal(result.strategy, "stretch");
  assert.equal(result.cardRole, "practice");
  assert.equal(result.difficultyBand, "stretch");
});

test("next-card strategy defaults to stabilize for mixed ordinary-card evidence", () => {
  const service = createLearningNextCardStrategyService();
  const result = service.chooseNextCardStrategy({
    masterySummary: {
      masteryStates: [{
        nodeId: "kg_english_evidence_answering",
        status: "developing",
        score: 72,
        confidence: 0.62,
        evidenceCount: 2
      }]
    },
    recentExperienceSignals: [{
      signalType: "completed",
      targetNodeId: "kg_english_evidence_answering"
    }]
  });

  assert.equal(result.ok, true);
  assert.equal(result.strategy, "stabilize");
  assert.equal(result.cardRole, "practice");
  assert.equal(result.difficultyBand, "foundation");
});

