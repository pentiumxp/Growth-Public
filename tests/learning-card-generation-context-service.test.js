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
    evaluationGatewayConfigured: () => options.evaluationGatewayConfigured !== false,
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
  assert.equal(result.readiness.authoringGatewayConfigured, true);
  assert.equal(result.readiness.evaluationGatewayConfigured, true);
  assert.equal(result.readiness.aiLoopGatewayReady, true);
  assert.equal(result.graph.nodeCount, 294);
  assert.equal(result.suggestedPlan.targetNodeId, "kg_english_main_idea");
  assert.equal(result.suggestedPlan.cardRole, "practice");
  assert.equal(result.suggestedPlan.strategy, "stabilize");
  assert.equal(result.nextCardRecommendation.selectionMode, "graph_suggestion");
  assert.equal(result.nextCardRecommendation.strategy, "stabilize");
  assert.equal(result.nextCardRecommendation.targetNodeId, "kg_english_main_idea");
  assert.equal(result.nextCardStrategy.reason, "Continue evidence-answering practice.");
  assert.equal(result.completionPolicy.mode, "daily_score_once");
  assert.equal(result.selectedRecipeId, "daily_english_v1");
  assert.equal(result.generationDefaults.domain, "english");
  assert.equal(result.generationDefaults.cardSchemaVersion, "growth.card.authoring.v1");
  assert.equal(result.generationDefaults.rubricPolicyId, "rubric:daily_english_v1");
  assert.equal(result.rubricCatalog.some((policy) => policy.policyId === "rubric:stage_assessment_v1" && policy.cardRole === "stage_assessment"), true);
  assert.equal(result.historySummary.learnerSummary.evaluationCount, 4);
  assert.equal(result.historySummary.recentTrajectoryCount, 1);
  assert.equal(JSON.stringify(result).includes("raw learner answer"), false);
  assert.equal(historyCalls[0].learningGraphPlan.targetNodeId, "kg_english_main_idea");
});

test("card generation context reports evaluation Gateway readiness separately from generation readiness", () => {
  const { service } = createContextService({ evaluationGatewayConfigured: false });

  const result = service.context({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    displayName: "凡凡"
  });

  assert.equal(result.ok, true);
  assert.equal(result.readiness.ready, true);
  assert.equal(result.readiness.authoringGatewayConfigured, true);
  assert.equal(result.readiness.evaluationGatewayConfigured, false);
  assert.equal(result.readiness.aiLoopGatewayReady, false);
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

test("card generation context enables provisioned non-Fanfan target selections", () => {
  const service = createLearningCardGenerationContextService({
    gatewayConfigured: () => true,
    evaluationGatewayConfigured: () => true,
    targetProvisioningService: {
      resolveSelection(input) {
        assert.equal(input.workspaceId, "weixin_alice");
        assert.equal(input.domainPackId, "uk_hk_curriculum_foundation");
        return {
          ok: true,
          targetEnabled: true,
          mode: "explicit_provision",
          selectedDomainPackId: "uk_hk_curriculum_foundation",
          selectedDomain: "science",
          selectedSubject: "science",
          graphOptions: {
            ok: true,
            available: true,
            selectedDomainPackId: "uk_hk_curriculum_foundation",
            selectedDomain: "science",
            selectedSubject: "science",
            domainPacks: [{
              domainPackId: "uk_hk_curriculum_foundation",
              domain: "science",
              title: "UK/HK Curriculum Foundation",
              subjects: ["science"],
              rawJson: "RAW GRAPH JSON MUST NOT PROJECT"
            }],
            subjects: ["science"]
          }
        };
      }
    },
    graphRepository: {
      readback() {
        return { ok: true, import_counts: { nodes: 1, edges: 0 } };
      },
      suggestNodes({ domain, subject }) {
        assert.equal(domain, "science");
        assert.equal(subject, "science");
        return [{
          nodeId: "kg_science_fair_test",
          domain: "science",
          subject: "science",
          title: "Fair test reasoning",
          stage: "foundation",
          evidenceRequired: ["explain_controlled_variable"]
        }];
      },
      domainPackOptions() {
        return [];
      }
    },
    historySummaryRepository: {
      summaryForAuthoringPlan() {
        return {
          ok: true,
          learnerSummary: { recentCardCount: 0 },
          masterySummary: { masteryStates: [] },
          recentExperienceSignals: [],
          recentTrajectory: []
        };
      }
    }
  });

  const result = service.context({
    workspaceId: "weixin_alice",
    learnerId: "alice",
    displayName: "Alice",
    domainPackId: "uk_hk_curriculum_foundation",
    subject: "science"
  });

  assert.equal(result.ok, true);
  assert.equal(result.target.enabled, true);
  assert.equal(result.targetProvisioning.mode, "explicit_provision");
  assert.equal(result.graphOptions.subjects[0], "science");
  assert.equal(result.suggestedPlan.targetNodeId, "kg_science_fair_test");
  assert.equal(JSON.stringify(result).includes("RAW GRAPH JSON"), false);
});

test("card generation context applies recipe defaults before provisioning and graph selection", () => {
  const provisioningInputs = [];
  const suggestInputs = [];
  const service = createLearningCardGenerationContextService({
    gatewayConfigured: () => true,
    evaluationGatewayConfigured: () => true,
    targetProvisioningService: {
      resolveSelection(input) {
        provisioningInputs.push(input);
        return {
          ok: true,
          targetEnabled: true,
          mode: "sample_default",
          selectedDomainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
          selectedDomain: input.domain,
          selectedSubject: input.subject,
          graphOptions: {
            ok: true,
            available: true,
            selectedDomainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
            selectedDomain: input.domain,
            selectedSubject: input.subject,
            domainPacks: [{
              domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
              domain: "science",
              title: "UK/HK Curriculum Foundation",
              subjects: ["science", "english"]
            }],
            subjects: ["science", "english"]
          }
        };
      }
    },
    graphRepository: {
      readback() {
        return { ok: true, import_counts: { nodes: 2, edges: 1 } };
      },
      domainPackOptions() {
        return [{
          domainPackId: "domain_pack_english_first",
          domain: "english",
          title: "English First",
          subjects: ["english"]
        }, {
          domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
          domain: "science",
          title: "UK/HK Curriculum Foundation",
          subjects: ["science", "english"]
        }];
      },
      suggestNodes(input) {
        suggestInputs.push(input);
        assert.equal(input.domain, "science");
        assert.equal(input.subject, "science");
        return [{
          nodeId: "kg_science_fair_test",
          domain: "science",
          subject: "science",
          title: "Fair test reasoning",
          stage: "foundation",
          evidenceRequired: ["science_reasoning"]
        }];
      }
    },
    historySummaryRepository: {
      summaryForAuthoringPlan() {
        return {
          ok: true,
          learnerSummary: { recentCardCount: 1 },
          masterySummary: { masteryStates: [] },
          recentExperienceSignals: [],
          recentTrajectory: []
        };
      }
    },
    nextCardStrategyService: {
      chooseNextCardStrategy(input) {
        assert.deepEqual(input.targetNodeIds, ["kg_science_fair_test"]);
        return {
          ok: true,
          strategy: "stabilize",
          cardRole: "practice",
          difficultyBand: "foundation",
          targetNodeIds: ["kg_science_fair_test"],
          reason: "Use one fair-test reasoning card."
        };
      }
    }
  });

  const result = service.context({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    displayName: "凡凡",
    recipeId: "daily_science_v1"
  });

  assert.equal(result.ok, true);
  assert.equal(result.selectedRecipeId, "daily_science_v1");
  assert.equal(result.generationDefaults.domain, "science");
  assert.equal(result.targetProvisioning.selectedDomain, "science");
  assert.equal(result.targetProvisioning.selectedSubject, "science");
  assert.equal(result.graphOptions.selectedDomainPackId, "domain_pack_fanfan_cambridge_pathway_v1");
  assert.equal(result.suggestedPlan.targetNodeId, "kg_science_fair_test");
  assert.equal(provisioningInputs.length, 1);
  assert.equal(provisioningInputs[0].domain, "science");
  assert.equal(provisioningInputs[0].subject, "science");
  assert.equal(suggestInputs.length, 1);
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
              recentTrajectoryCount: 3,
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
              id: "traj_pending",
              taskCardId: "ltask_1",
              sourceEvaluationId: "eval_1",
              strategy: "stabilize",
              targetNodeIds: ["kg_english_evidence_answering"],
              performanceSummary: "Score 64; evidence was vague.",
              nextRecommendation: {
                status: "pending",
                strategy: "stabilize",
                targetNodeIds: ["kg_english_evidence_answering"],
                reason: "Use one more short evidence-answering card.",
                sourceTaskCardId: "ltask_1",
                sourceEvaluationId: "eval_1",
                rawPrompt: "RAW PROMPT MUST NOT PROJECT"
              }
            }, {
              id: "traj_accepted",
              taskCardId: "ltask_2",
              sourceEvaluationId: "eval_2",
              strategy: "repair",
              targetNodeIds: ["kg_english_evidence_answering"],
              nextRecommendation: {
                status: "accepted",
                strategy: "repair",
                targetNodeIds: ["kg_english_evidence_answering"],
                reason: "Generated the repair card.",
                generatedTaskCardId: "ltask_generated_2",
                generatedLearningGraphPlanId: "lgp_generated_2",
                acceptedAt: "2026-06-14T08:10:00.000Z"
              }
            }, {
              id: "traj_superseded",
              taskCardId: "ltask_3",
              sourceEvaluationId: "eval_3",
              strategy: "stretch",
              targetNodeIds: ["kg_english_main_idea"],
              nextRecommendation: {
                status: "superseded",
                strategy: "stretch",
                targetNodeIds: ["kg_english_main_idea"],
                reason: "Older stretch suggestion was replaced.",
                supersededAt: "2026-06-14T08:12:00.000Z",
                supersededByTrajectoryId: "traj_accepted"
              }
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
  assert.equal(result.recommendationLifecycle.length, 3);
  assert.equal(result.recommendationLifecycle[0].trajectoryId, "traj_pending");
  assert.equal(result.recommendationLifecycle[0].status, "pending");
  assert.equal(result.recommendationLifecycle[0].reason, "Use one more short evidence-answering card.");
  assert.equal(result.recommendationLifecycle[1].status, "accepted");
  assert.equal(result.recommendationLifecycle[1].generatedTaskCardId, "ltask_generated_2");
  assert.equal(result.recommendationLifecycle[1].generatedLearningGraphPlanId, "lgp_generated_2");
  assert.equal(result.recommendationLifecycle[1].acceptedAt, "2026-06-14T08:10:00.000Z");
  assert.equal(result.recommendationLifecycle[2].status, "superseded");
  assert.equal(result.recommendationLifecycle[2].supersededByTrajectoryId, "traj_accepted");
  assert.equal(JSON.stringify(result.recommendationLifecycle).includes("RAW PROMPT"), false);
  assert.equal(result.nextCardStrategy.strategy, "stabilize");
  assert.equal(result.suggestedPlan.strategy, "stabilize");
});

test("card generation context exposes planner readiness, Profile V2, and evidence audit projections", () => {
  const calls = {
    planner: [],
    profileV2: [],
    evidence: [],
    planAudit: [],
    profileDeltas: [],
    corrections: []
  };
  const service = createLearningCardGenerationContextService({
    gatewayConfigured: () => true,
    evaluationGatewayConfigured: () => true,
    plannerGatewayConfigured: () => true,
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
      domainPackOptions() {
        return [{
          domainPackId: "uk_hk_curriculum_foundation",
          importId: "kg_import_fanfan",
          domain: "science",
          title: "UK/HK Curriculum Foundation",
          sourceKind: "owner_seed",
          version: "2026-05-27-v1",
          visibility: "private_seed",
          importStatus: "validated_seed",
          nodeCount: 294,
          subjectCount: 2,
          subjects: ["science", "physics"],
          rawJson: "RAW DOMAIN PACK MUST NOT PROJECT"
        }];
      },
      suggestNodes(input = {}) {
        assert.equal(input.domain, "science");
        assert.equal(input.subject, "science");
        return [{
          nodeId: "kg_science_fair_test",
          domain: "science",
          subject: "science",
          title: "Science fair test explanation",
          stage: "foundation",
          evidenceRequired: ["explain_measured_result"]
        }];
      }
    },
    historySummaryRepository: {
      summaryForAuthoringPlan() {
        return {
          ok: true,
          learnerSummary: { recentCardCount: 2, evaluationCount: 1 },
          masterySummary: { masteryStates: [] },
          recentExperienceSignals: [],
          recentTrajectory: []
        };
      }
    },
    profileV2Service: {
      profileV2(input) {
        calls.profileV2.push(input);
        return {
          ok: true,
          source: "growth-learning-profile-v2-service",
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          programId: "program_science",
          targetNodeIds: ["kg_science_fair_test"],
          summary: {
            capabilityStateCount: 1,
            evidenceCount: 2,
            weaknessCount: 1,
            strengthCount: 0,
            pressureSignalCount: 1,
            staleCount: 0
          },
          capabilityStates: [{
            nodeId: "kg_science_fair_test",
            status: "needs_repair",
            scoreBand: "low",
            confidence: 0.66,
            evidenceCount: 2,
            evidenceWeightTotal: 0.25,
            lastObservedAt: "2026-06-14T09:00:00.000Z",
            pressureSignals: ["too_hard"],
            summaries: ["Needs a clearer measured-result sentence."],
            evidenceIds: ["evidence_science_1"],
            rawAnswer: "RAW PROFILE MARKER MUST NOT PROJECT"
          }],
          strengths: [],
          weaknesses: [{
            nodeId: "kg_science_fair_test",
            status: "needs_repair",
            summary: "Needs a clearer measured-result sentence.",
            evidenceIds: ["evidence_science_1"],
            rawPrompt: "RAW PROMPT MUST NOT PROJECT"
          }],
          misconceptions: [],
          pressureSignals: [{
            nodeId: "kg_science_fair_test",
            signals: ["too_hard"],
            evidenceIds: ["evidence_science_1"]
          }],
          stageReadiness: {
            status: "dormant",
            reason: "Recent pressure signal should block formal assessment."
          },
          recommendedPlannerHints: {
            strategy: "repair",
            targetNodeIds: ["kg_science_fair_test"],
            reason: "Start with a low-pressure science repair card."
          },
          legacyProfile: {
            rawAnswer: "RAW LEGACY PROFILE MUST NOT PROJECT"
          }
        };
      }
    },
    evidenceLedgerService: {
      listEvidence(input) {
        calls.evidence.push(input);
        return [{
          evidenceId: "evidence_science_1",
          sourceType: "daily_evaluation",
          sourceId: "eval_science_1",
          sourceTaskCardId: "ltask_science_1",
          graphNodeId: "kg_science_fair_test",
          graphNodeIds: ["kg_science_fair_test"],
          cardRole: "practice",
          evidenceWeight: 0.2,
          confidence: 0.66,
          scoreBand: "low",
          status: "needs_repair",
          summary: {
            summaryOnly: true,
            feedbackSummary: "Needs a clearer measured result.",
            remainingWeaknesses: ["Does not identify what was measured."],
            rawAnswer: "RAW EVIDENCE MARKER MUST NOT PROJECT"
          },
          createdAt: "2026-06-14T09:00:00.000Z"
        }];
      }
    },
    planAuditService: {
      listPlanDrafts(input) {
        calls.planAudit.push(input);
        return {
          ok: true,
          available: true,
          summary: {
            planDraftCount: 1,
            publishedPlanCount: 1,
            lastPlanAt: "2026-06-14T09:15:00.000Z",
            lastPublishedAt: "2026-06-14T09:15:00.000Z"
          },
          count: 1,
          planDrafts: [{
            planDraftId: "lgplan_science_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            programId: input.programId,
            horizon: "daily_plan",
            status: "published",
            planSummary: "Repair fair-test reasoning.",
            selectedItemId: "plan_item_science_1",
            generatedTaskCardId: "ltask_science_1",
            generatedLearningGraphPlanId: "lgp_science_1",
            targetNodeIds: ["kg_science_fair_test"],
            basisEvidenceIds: ["evidence_science_1"],
            items: [{
              itemId: "plan_item_science_1",
              cardRole: "repair",
              targetNodeIds: ["kg_science_fair_test"],
              reason: "Use one low-pressure repair card."
            }],
            selectedItem: {
              itemId: "plan_item_science_1",
              cardRole: "repair",
              targetNodeIds: ["kg_science_fair_test"],
              reason: "Use one low-pressure repair card."
            },
            rawPrompt: "RAW PLAN MARKER MUST NOT PROJECT",
            privacyClass: "summary_only",
            updatedAt: "2026-06-14T09:15:00.000Z",
            publishedAt: "2026-06-14T09:15:00.000Z"
          }]
        };
      }
    },
    profileDeltaAuditService: {
      listProfileDeltas(input) {
        calls.profileDeltas.push(input);
        return {
          ok: true,
          available: true,
          profileDeltas: [{
            profileDeltaId: "lgpdelta_science_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            programId: input.programId,
            taskCardId: "ltask_science_1",
            submissionId: "lsub_science_1",
            evaluationId: "eval_science_1",
            targetNodeIds: ["kg_science_fair_test"],
            evidenceIds: ["evidence_science_1"],
            changedCapabilityCount: 1,
            profileStateChanged: true,
            summary: {
              changedCapabilityCount: 1,
              profileStateChanged: true,
              reason: "Profile changed after a bounded science evaluation.",
              rawModelOutput: "RAW MODEL OUTPUT MUST NOT PROJECT"
            },
            changedCapabilities: [{
              nodeId: "kg_science_fair_test",
              beforeStatus: "observed",
              afterStatus: "needs_repair",
              summary: "Moved to repair after weak measured-result evidence.",
              evidenceIds: ["evidence_science_1"],
              rawAnswer: "RAW DELTA MARKER MUST NOT PROJECT"
            }],
            plannerHintChange: {
              beforeStrategy: "stabilize",
              afterStrategy: "repair",
              reason: "Weak evidence should drive repair."
            },
            privacyClass: "summary_only",
            createdAt: "2026-06-14T09:05:00.000Z"
          }]
        };
      }
    },
    ownerCorrectionService: {
      listCorrections(input) {
        calls.corrections.push(input);
        return {
          ok: true,
          available: true,
          corrections: [{
            correctionId: "lgcorr_science_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            programId: input.programId,
            reviewAction: "mark_stable",
            status: "stable",
            targetNodeIds: ["kg_science_fair_test"],
            evidenceIds: ["lgevd_owner_1"],
            profileDeltaId: "lgpdelta_science_1",
            taskCardId: "ltask_science_1",
            evaluationId: "eval_science_1",
            sourceEvidenceIds: ["evidence_science_1"],
            reviewedBy: "owner",
            reason: "Owner confirmed the learner explained the measured result verbally.",
            note: "Bounded note only.",
            rawTranscript: "RAW TRANSCRIPT MUST NOT PROJECT",
            privacyClass: "summary_only",
            createdAt: "2026-06-14T09:10:00.000Z"
          }]
        };
      }
    },
    plannerContextService: {
      plannerContext(input) {
        calls.planner.push(input);
        return {
          ok: true,
          schemaVersion: "growth.learningPlanner.input.v1",
          horizon: "daily_plan",
          constraints: {
            availableMinutes: 15,
            lowPressure: true,
            allowedCardRoles: ["teaching", "practice", "repair", "stretch"]
          },
          knowledgeGraph: {
            domainPackId: "uk_hk_curriculum_foundation",
            domain: "science",
            subject: "science",
            candidateNodes: [{
              nodeId: "kg_science_fair_test",
              label: "Science fair test explanation",
              domain: "science",
              subject: "science",
              stage: "foundation",
              prerequisiteNodeIds: ["kg_science_observation_language"],
              evidenceRequired: ["explain_measured_result"],
              rawPrompt: "RAW NODE MARKER MUST NOT PROJECT"
            }]
          },
          profileSummary: {
            summary: { evidenceCount: 2, weaknessCount: 1 },
            strengths: [],
            weaknesses: [{
              nodeId: "kg_science_fair_test",
              status: "needs_repair",
              summary: "Needs a clearer measured-result sentence.",
              evidenceIds: ["evidence_science_1"]
            }],
            pressureSignals: [{
              nodeId: "kg_science_fair_test",
              signals: ["too_hard"],
              evidenceIds: ["evidence_science_1"]
            }],
            recommendedPlannerHints: {
              strategy: "repair",
              targetNodeIds: ["kg_science_fair_test"],
              reason: "Start with low pressure."
            }
          },
          recentEvidence: [{
            evidenceId: "evidence_science_1",
            sourceType: "daily_evaluation",
            graphNodeIds: ["kg_science_fair_test"],
            scoreBand: "low",
            status: "needs_repair",
            summary: "Needs a clearer measured result.",
            createdAt: "2026-06-14T09:00:00.000Z",
            rawAnswer: "RAW PLANNER EVIDENCE MUST NOT PROJECT"
          }],
          stageAssessment: {
            ok: true,
            available: true,
            eligible: false,
            activationState: "cooldown",
            reason: "stage_assessment_cooldown_active",
            cooldownUntil: "2026-06-20T00:00:00.000Z",
            cycle: {
              cycleId: "cycle_science_1",
              status: "completed",
              generatedTaskCardId: "stage_card_1",
              rawPrivatePath: "RAW STAGE PATH MUST NOT PROJECT"
            },
            coverageNodeIds: ["kg_science_fair_test"],
            evidence: {
              minimumRecentOrdinaryCards: 4,
              recentTrajectoryCount: 4,
              recentExperienceSignalCount: 1,
              highPressureSignalCount: 0,
              challengeSignalCount: 0,
              sourceCardIds: ["card_1", "card_2", "card_3", "card_4"]
            }
          },
          privacy: {
            noFullChildAnswers: true,
            noFullTranscripts: true,
            noRawPrompts: true,
            useRefsInsteadOfRawFiles: true,
            privacyClass: "summary_only"
          }
        };
      }
    }
  });

  const result = service.context({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    displayName: "凡凡",
    domain: "science",
    subject: "science",
    domainPackId: "uk_hk_curriculum_foundation"
  });

  assert.equal(result.ok, true);
  assert.equal(result.readiness.plannerGatewayConfigured, true);
  assert.equal(result.readiness.plannerContextReady, true);
  assert.equal(result.readiness.plannerReady, true);
  assert.equal(result.readiness.operatingLoopGatewayReady, true);
  assert.equal(result.plannerReadiness.ready, true);
  assert.equal(result.plannerReadiness.schemaVersion, "growth.learningPlanner.input.v1");
  assert.equal(result.plannerReadiness.candidateNodeCount, 1);
  assert.equal(result.graphOptions.ok, true);
  assert.equal(result.graphOptions.selectedDomainPackId, "uk_hk_curriculum_foundation");
  assert.equal(result.graphOptions.selectedDomain, "science");
  assert.equal(result.graphOptions.selectedSubject, "science");
  assert.equal(result.graphOptions.domainPacks[0].nodeCount, 294);
  assert.deepEqual(result.graphOptions.subjects, ["science", "physics"]);
  assert.equal(result.plannerContextPreview.knowledgeGraph.candidateNodes[0].nodeId, "kg_science_fair_test");
  assert.equal(result.plannerContextPreview.profileSummary.weaknesses[0].nodeId, "kg_science_fair_test");
  assert.equal(result.plannerContextPreview.stageAssessment.activationState, "cooldown");
  assert.equal(result.plannerContextPreview.stageAssessment.cooldownUntil, "2026-06-20T00:00:00.000Z");
  assert.deepEqual(result.plannerContextPreview.stageAssessment.coverageNodeIds, ["kg_science_fair_test"]);
  assert.equal(result.plannerContextPreview.stageAssessment.evidence.recentTrajectoryCount, 4);
  assert.equal(result.profileV2.ok, true);
  assert.equal(result.profileV2.summary.weaknessCount, 1);
  assert.equal(result.profileV2.weaknesses[0].summary, "Needs a clearer measured-result sentence.");
  assert.equal(result.profileV2.stageReadiness.status, "dormant");
  assert.equal(result.evidenceAudit.count, 1);
  assert.equal(result.evidenceAudit.items[0].evidenceId, "evidence_science_1");
  assert.equal(result.evidenceAudit.items[0].summary.feedbackSummary, "Needs a clearer measured result.");
  assert.equal(result.ownerAudit.ok, true);
  assert.equal(result.ownerAudit.summary.planDraftCount, 1);
  assert.equal(result.ownerAudit.summary.publishedPlanCount, 1);
  assert.equal(result.ownerAudit.summary.profileDeltaCount, 1);
  assert.equal(result.ownerAudit.summary.correctionCount, 1);
  assert.equal(result.ownerAudit.summary.lastPlanAt, "2026-06-14T09:15:00.000Z");
  assert.equal(result.ownerAudit.summary.lastPublishedAt, "2026-06-14T09:15:00.000Z");
  assert.equal(result.ownerAudit.summary.lastProfileDeltaAt, "2026-06-14T09:05:00.000Z");
  assert.equal(result.ownerAudit.summary.lastCorrectionAt, "2026-06-14T09:10:00.000Z");
  assert.equal(result.ownerAudit.planAudit.planDrafts[0].planDraftId, "lgplan_science_1");
  assert.equal(result.ownerAudit.planAudit.planDrafts[0].generatedTaskCardId, "ltask_science_1");
  assert.equal(result.ownerAudit.planAudit.planDrafts[0].selectedItem.itemId, "plan_item_science_1");
  assert.equal(result.planAudit.planDrafts[0].generatedLearningGraphPlanId, "lgp_science_1");
  assert.equal(result.ownerAudit.profileDeltaAudit.items[0].profileDeltaId, "lgpdelta_science_1");
  assert.equal(result.ownerAudit.profileDeltaAudit.items[0].changedCapabilities[0].afterStatus, "needs_repair");
  assert.equal(result.ownerAudit.profileCorrections.items[0].correctionId, "lgcorr_science_1");
  assert.equal(result.ownerAudit.profileCorrections.items[0].status, "stable");
  assert.equal(JSON.stringify(result).includes("RAW"), false);
  assert.deepEqual(calls.profileV2[0].targetNodeIds, ["kg_science_fair_test"]);
  assert.deepEqual(calls.evidence[0].graphNodeIds, ["kg_science_fair_test"]);
  assert.deepEqual(calls.planAudit[0], {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: undefined,
    targetNodeIds: ["kg_science_fair_test"],
    limit: 8
  });
  assert.deepEqual(calls.profileDeltas[0], {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: undefined,
    limit: 8
  });
  assert.deepEqual(calls.corrections[0], {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: undefined,
    targetNodeIds: ["kg_science_fair_test"],
    limit: 8
  });
  assert.deepEqual(calls.planner[0].targetNodeIds, ["kg_science_fair_test"]);
  assert.equal(calls.planner[0].domain, "science");
  assert.equal(calls.planner[0].subject, "science");
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
  assert.equal(result.nextCardRecommendation.selectionMode, "strategy");
  assert.equal(result.nextCardRecommendation.strategy, "repair");
  assert.equal(result.nextCardRecommendation.targetNodeId, "kg_english_evidence_answering");
  assert.equal(result.nextCardStrategy.reason, "Repair weak evidence-answering first.");
  assert.equal(historyCalls[0].learningGraphPlan.targetNodeId, "kg_english_evidence_answering");
});

test("card generation context exposes recommendation-driven next-card rationale", () => {
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
      selectNextTarget() {
        return {
          ok: true,
          selectionMode: "recommendation",
          recommendationMode: "trajectory",
          recommendationId: "traj_1",
          recommendationStatus: "pending",
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
          cardRole: "teaching",
          difficultyBand: "repair",
          nextCardStrategy: {
            ok: true,
            strategy: "repair",
            cardRole: "teaching",
            difficultyBand: "repair",
            supportLevel: "guided",
            targetNodeIds: ["kg_english_evidence_answering"],
            reason: "Latest evaluation trajectory asks for one evidence repair card.",
            recommendationId: "traj_1",
            recommendationStatus: "pending",
            evidenceBasis: {
              trajectoryId: "traj_1",
              taskCardId: "ltask_1",
              sourceEvaluationId: "eval_1",
              trajectoryUpdatedAt: "2026-06-14T08:00:00.000Z"
            }
          },
          learningProfileSummary: {
            masteryStateCount: 2,
            weaknessCount: 1,
            recentTrajectoryCount: 1,
            lastTrajectoryAt: "2026-06-14T08:00:00.000Z"
          }
        };
      }
    },
    historySummaryRepository: {
      summaryForAuthoringPlan() {
        return {
          ok: true,
          learnerSummary: { recentCardCount: 4, evaluationCount: 3 },
          masterySummary: { masteryStates: [{ nodeId: "kg_english_evidence_answering", status: "weak" }] },
          recentExperienceSignals: [],
          recentTrajectory: []
        };
      }
    },
    profileProjectionService: {
      profileContext() {
        return {
          ok: true,
          summary: { weaknessCount: 1 },
          nextCardStrategy: {
            ok: true,
            strategy: "stretch",
            targetNodeIds: ["kg_english_main_idea"],
            reason: "Recomputed profile strategy must not hide the selected recommendation."
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
  assert.equal(result.nextCardRecommendation.selectionMode, "recommendation");
  assert.equal(result.nextCardRecommendation.recommendationMode, "trajectory");
  assert.equal(result.nextCardRecommendation.recommendationId, "traj_1");
  assert.equal(result.nextCardRecommendation.recommendationStatus, "pending");
  assert.equal(result.nextCardRecommendation.strategy, "repair");
  assert.equal(result.nextCardRecommendation.reason, "Latest evaluation trajectory asks for one evidence repair card.");
  assert.equal(result.nextCardRecommendation.evidenceBasis.trajectoryId, "traj_1");
  assert.equal(result.nextCardRecommendation.evidenceBasis.sourceEvaluationId, "eval_1");
  assert.equal(result.nextCardRecommendation.learningProfileSummary.weaknessCount, 1);
  assert.equal(result.nextCardStrategy.strategy, "repair");
  assert.equal(result.nextCardStrategy.reason, "Latest evaluation trajectory asks for one evidence repair card.");
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
