const assert = require("node:assert/strict");
const test = require("node:test");

const { createLearningCardNextTargetService } = require("../src/services/learning-card-next-target-service");

function graphRepository() {
  const nodes = new Map([
    ["kg_english_main_idea", {
      nodeId: "kg_english_main_idea",
      domain: "english",
      subject: "english",
      title: "Find the main idea",
      stage: "foundation",
      evidenceRequired: ["short_answer"]
    }],
    ["kg_english_evidence_answering", {
      nodeId: "kg_english_evidence_answering",
      domain: "english",
      subject: "english",
      title: "Use exact text evidence",
      stage: "foundation",
      evidenceRequired: ["text_evidence"]
    }]
  ]);
  return {
    node({ nodeId }) {
      return nodes.get(nodeId) || null;
    },
    suggestNodes() {
      return [nodes.get("kg_english_main_idea")];
    }
  };
}

test("next target service chooses the profile strategy target before graph suggestions", () => {
  const calls = [];
  const service = createLearningCardNextTargetService({
    graphRepository: graphRepository(),
    profileProjectionService: {
      profileContext(input) {
        calls.push(input);
        return {
          ok: true,
          nextCardStrategy: {
            ok: true,
            strategy: "repair",
            cardRole: "teaching",
            difficultyBand: "repair",
            targetNodeIds: ["kg_english_evidence_answering"],
            reason: "Weak evidence should get a repair card."
          }
        };
      }
    }
  });

  const result = service.selectNextTarget({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_1"
  });

  assert.equal(result.ok, true);
  assert.equal(result.selectionMode, "strategy");
  assert.equal(result.targetNodeId, "kg_english_evidence_answering");
  assert.equal(result.targetNode.title, "Use exact text evidence");
  assert.equal(result.cardRole, "teaching");
  assert.equal(result.difficultyBand, "repair");
  assert.deepEqual(calls[0], {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_1",
    targetNodeIds: []
  });
});

test("next target service falls back to bounded history strategy and graph suggestion", () => {
  const service = createLearningCardNextTargetService({
    graphRepository: graphRepository(),
    historySummaryRepository: {
      summaryForAuthoringPlan() {
        return {
          ok: true,
          masterySummary: { masteryStates: [] },
          recentExperienceSignals: [],
          recentTrajectory: []
        };
      }
    },
    nextCardStrategyService: {
      chooseNextCardStrategy() {
        return {
          ok: true,
          strategy: "stabilize",
          cardRole: "practice",
          difficultyBand: "foundation",
          targetNodeIds: ["missing_node"],
          reason: "No strong signal."
        };
      }
    }
  });

  const result = service.selectNextTarget({ workspaceId: "weixin_fanfan" });

  assert.equal(result.ok, true);
  assert.equal(result.selectionMode, "graph_suggestion");
  assert.equal(result.targetNodeId, "kg_english_main_idea");
  assert.equal(result.nextCardStrategy.strategy, "stabilize");
});

test("next target service validates explicit target ids without changing strategy", () => {
  const service = createLearningCardNextTargetService({
    graphRepository: graphRepository()
  });

  const result = service.selectNextTarget({
    workspaceId: "weixin_fanfan",
    targetNodeId: "kg_english_main_idea"
  });
  assert.equal(result.ok, true);
  assert.equal(result.selectionMode, "explicit");
  assert.equal(result.targetNodeId, "kg_english_main_idea");

  const missing = service.selectNextTarget({
    workspaceId: "weixin_fanfan",
    targetNodeId: "missing_node"
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "missing_target_node");
});
