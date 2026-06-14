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

test("card generation context exposes bounded learning profile projection for selected target", () => {
  const { service } = (() => {
    const service = createLearningCardGenerationContextService({
      gatewayConfigured: () => true,
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
        suggestNodes() {
          return [{
            nodeId: "kg_english_evidence_answering",
            domain: "english",
            subject: "english",
            title: "Use exact text evidence",
            stage: "foundation",
            evidenceRequired: ["short_answer"]
          }];
        }
      },
      historySummaryRepository: {
        summaryForAuthoringPlan() {
          return {
            ok: true,
            learnerSummary: { recentCardCount: 3, evaluationCount: 2 },
            masterySummary: { masteryStates: [] },
            recentExperienceSignals: [],
            recentTrajectory: []
          };
        }
      },
      profileProjectionService: {
        profileContext(input) {
          assert.equal(input.workspaceId, "weixin_stephen");
          assert.equal(input.learnerId, "weixin_stephen");
          assert.deepEqual(input.targetNodeIds, ["kg_english_evidence_answering"]);
          return {
            ok: true,
            targetNodeIds: ["kg_english_evidence_answering"],
            summary: {
              masteryStateCount: 1,
              weaknessCount: 1,
              strengthCount: 0,
              recentExperienceSignalCount: 1,
              recentTrajectoryCount: 1,
              lastTrajectoryAt: "2026-06-14T08:00:00.000Z"
            },
            masteryStates: [{
              nodeId: "kg_english_evidence_answering",
              status: "developing",
              score: 64,
              summary: "Needs exact text evidence."
            }],
            strengths: [],
            weaknesses: [{
              nodeId: "kg_english_evidence_answering",
              status: "developing",
              score: 64,
              summary: "Needs exact text evidence."
            }],
            recentExperienceSignals: [{
              targetNodeId: "kg_english_evidence_answering",
              signalType: "not_learned",
              summary: "Needs another focused card."
            }],
            recentTrajectory: [{
              taskCardId: "ltask_1",
              strategy: "stabilize",
              performanceSummary: "Score 64; evidence was vague."
            }],
            nextCardStrategy: {
              ok: true,
              strategy: "stabilize",
              targetNodeIds: ["kg_english_evidence_answering"],
              cardRole: "practice",
              difficultyBand: "foundation",
              reason: "Use one more short evidence-answering card."
            }
          };
        }
      }
    });
    return { service };
  })();

  const result = service.context({
    workspaceId: "weixin_stephen",
    learnerId: "weixin_stephen",
    displayName: "凡凡"
  });

  assert.equal(result.ok, true);
  assert.equal(result.learningProfile.ok, true);
  assert.equal(result.learningProfile.summary.weaknessCount, 1);
  assert.equal(result.learningProfile.weaknesses[0].summary, "Needs exact text evidence.");
  assert.equal(result.nextCardStrategy.strategy, "stabilize");
  assert.equal(result.suggestedPlan.strategy, "stabilize");
});

test("card generation context uses strategy-driven next target before static graph suggestion", () => {
  const historyCalls = [];
  const service = createLearningCardGenerationContextService({
    gatewayConfigured: () => true,
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
      suggestNodes() {
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
    nextTargetService: {
      selectNextTarget(input) {
        assert.equal(input.workspaceId, "weixin_fanfan");
        return {
          ok: true,
          selectionMode: "strategy",
          targetNodeId: "kg_english_evidence_answering",
          targetNodeIds: ["kg_english_evidence_answering"],
          targetNode: {
            nodeId: "kg_english_evidence_answering",
            domain: "english",
            subject: "english",
            title: "Use exact text evidence",
            stage: "foundation",
            evidenceRequired: ["text_evidence"]
          },
          nextCardStrategy: {
            ok: true,
            strategy: "repair",
            cardRole: "teaching",
            difficultyBand: "repair",
            targetNodeIds: ["kg_english_evidence_answering"],
            reason: "Repair weak evidence-answering first."
          }
        };
      }
    },
    historySummaryRepository: {
      summaryForAuthoringPlan(input) {
        historyCalls.push(input);
        return {
          ok: true,
          learnerSummary: { recentCardCount: 4, evaluationCount: 3 },
          masterySummary: { masteryStates: [{ nodeId: "kg_english_evidence_answering", status: "weak" }] },
          recentExperienceSignals: [{ targetNodeId: "kg_english_evidence_answering", signalType: "not_learned" }],
          recentTrajectory: []
        };
      }
    },
    profileProjectionService: {
      profileContext(input) {
        assert.deepEqual(input.targetNodeIds, ["kg_english_evidence_answering"]);
        return {
          ok: true,
          targetNodeIds: ["kg_english_evidence_answering"],
          summary: { weaknessCount: 1 },
          weaknesses: [{ nodeId: "kg_english_evidence_answering", summary: "Needs exact text evidence." }],
          nextCardStrategy: {
            ok: true,
            strategy: "repair",
            cardRole: "teaching",
            difficultyBand: "repair",
            targetNodeIds: ["kg_english_evidence_answering"],
            reason: "Repair weak evidence-answering first."
          }
        };
      }
    }
  });

  const result = service.context({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    displayName: "凡凡"
  });

  assert.equal(result.ok, true);
  assert.equal(result.suggestedPlan.targetNodeId, "kg_english_evidence_answering");
  assert.equal(result.suggestedPlan.cardRole, "teaching");
  assert.equal(result.suggestedPlan.difficultyBand, "repair");
  assert.equal(result.suggestedPlan.strategy, "repair");
  assert.equal(result.suggestedPlan.title, "Use exact text evidence");
  assert.equal(result.nextCardStrategy.reason, "Repair weak evidence-answering first.");
  assert.equal(historyCalls[0].learningGraphPlan.targetNodeId, "kg_english_evidence_answering");
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
