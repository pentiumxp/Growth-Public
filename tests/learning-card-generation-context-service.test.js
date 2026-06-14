const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningCardGenerationContextService,
  isFanfanSampleTarget
} = require("../src/services/learning-card-generation-context-service");

function createContextService(options = {}) {
  const historyCalls = [];
  const service = createLearningCardGenerationContextService({
    gatewayConfigured: () => options.gatewayConfigured !== false,
    graphRepository: {
      readback() {
        return {
          ok: true,
          import_id: "kg_import_fanfan",
          version: "2026-05-27-v1",
          import_counts: { nodes: 294, edges: 329 },
          warnings: []
        };
      },
      suggestNodes({ domain }) {
        if (domain && domain !== "english") return [];
        return [{
          nodeId: "kg_english_main_idea",
          domain: "english",
          subject: "english",
          title: "Find the main idea",
          stage: "foundation",
          evidenceRequired: ["short_answer"]
        }];
      }
    },
    historySummaryRepository: {
      summaryForAuthoringPlan(input) {
        historyCalls.push(input);
        return {
          ok: true,
          learnerSummary: {
            recentCardCount: 6,
            completedRecentCardCount: 4,
            activeRecentCardCount: 1,
            submissionCount: 5,
            evaluationCount: 4,
            reflectionCount: 1,
            lastActivityAt: "2026-06-10T00:00:00.000Z"
          },
          masterySummary: { masteryStates: [{ nodeId: "kg_english_main_idea" }] },
          recentExperienceSignals: [{ signalType: "right_level" }],
          recentTrajectory: [{ strategy: "stabilize", targetNodeIds: ["kg_english_main_idea"] }]
        };
      }
    },
    nextCardStrategyService: {
      chooseNextCardStrategy(input) {
        assert.equal(input.masterySummary.masteryStates[0].nodeId, "kg_english_main_idea");
        return {
          ok: true,
          strategy: "stabilize",
          cardRole: "practice",
          difficultyBand: "foundation",
          targetNodeIds: ["kg_english_main_idea"],
          reason: "Continue evidence-answering practice."
        };
      }
    }
  });
  return { service, historyCalls };
}

test("card generation context returns Fanfan daily English readiness without raw history", () => {
  const { service, historyCalls } = createContextService();

  const result = service.context({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    displayName: "凡凡"
  });

  assert.equal(result.ok, true);
  assert.equal(result.target.enabled, true);
  assert.equal(result.readiness.ready, true);
  assert.equal(result.readiness.gatewayConfigured, true);
  assert.equal(result.graph.nodeCount, 294);
  assert.equal(result.suggestedPlan.targetNodeId, "kg_english_main_idea");
  assert.equal(result.suggestedPlan.cardRole, "practice");
  assert.equal(result.suggestedPlan.strategy, "stabilize");
  assert.equal(result.nextCardStrategy.reason, "Continue evidence-answering practice.");
  assert.equal(result.completionPolicy.mode, "daily_score_once");
  assert.equal(result.historySummary.learnerSummary.evaluationCount, 4);
  assert.equal(result.historySummary.recentTrajectoryCount, 1);
  assert.equal(JSON.stringify(result).includes("raw learner answer"), false);
  assert.equal(historyCalls[0].learningGraphPlan.targetNodeId, "kg_english_main_idea");
});

test("card generation context keeps non-Fanfan targets disabled in V1", () => {
  const { service } = createContextService();

  const result = service.context({
    workspaceId: "weixin_other",
    learnerId: "other",
    displayName: "Other"
  });

  assert.equal(result.ok, true);
  assert.equal(result.target.enabled, false);
  assert.equal(result.readiness.targetEnabled, false);
  assert.equal(result.readiness.ready, false);
});

test("card generation context reports not ready when graph or history stores are unavailable", () => {
  const service = createLearningCardGenerationContextService({
    gatewayConfigured: () => true,
    graphRepository: {
      readback() {
        throw new Error("SQLITE_CANTOPEN");
      },
      suggestNodes() {
        throw new Error("SQLITE_CANTOPEN");
      }
    },
    historySummaryRepository: {
      summaryForAuthoringPlan() {
        throw new Error("SQLITE_CANTOPEN");
      }
    }
  });

  const result = service.context({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    displayName: "凡凡"
  });

  assert.equal(result.ok, true);
  assert.equal(result.target.enabled, true);
  assert.equal(result.readiness.learningGraphReady, false);
  assert.equal(result.readiness.historySummaryReady, false);
  assert.equal(result.readiness.ready, false);
  assert.equal(result.graph.nodeCount, 0);
  assert.equal(result.suggestedPlan, null);
});

test("Fanfan sample target detection accepts English and Chinese labels only", () => {
  assert.equal(isFanfanSampleTarget({ workspaceId: "weixin_fanfan" }), true);
  assert.equal(isFanfanSampleTarget({ label: "Fan Fan" }), true);
  assert.equal(isFanfanSampleTarget({ label: "凡凡" }), true);
  assert.equal(isFanfanSampleTarget({ workspaceId: "weixin_stephen", label: "Stephen" }), false);
});
