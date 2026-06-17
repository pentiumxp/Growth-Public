const assert = require("node:assert/strict");
const test = require("node:test");

const { createLearningPlannerContextService } = require("../src/services/learning-planner-context-service");

test("planner context assembles summary-only cross-subject planning input", () => {
  const service = createLearningPlannerContextService({
    graphRepository: {
      suggestNodes(input) {
        assert.equal(input.domain, "science");
        assert.equal(input.subject, "science");
        return [{
          nodeId: "kg_science_fair_test",
          domainPackId: "uk_hk_curriculum_foundation",
          domain: "science",
          subject: "science",
          title: "Fair test reasoning",
          stage: "ks3_foundation",
          evidenceRequired: ["explain_controlled_variable"],
          learningOutcomes: ["Explain what makes a comparison fair."]
        }];
      }
    },
    profileV2Service: {
      profileV2(input) {
        assert.equal(input.workspaceId, "weixin_stephen");
        return {
          ok: true,
          summary: { capabilityStateCount: 1, evidenceCount: 1, weaknessCount: 1 },
          strengths: [],
          weaknesses: [{ nodeId: "kg_science_fair_test", summary: "Needs clearer measured result." }],
          staleEvidence: [{
            nodeId: "kg_science_old_claim",
            staleReasons: ["daily_evidence_stale"],
            evidenceFreshness: { status: "stale", recencyBand: "stale" },
            summary: "Old strong claim needs a refresh."
          }],
          pressureSignals: [],
          recommendedPlannerHints: {
            strategy: "repair",
            cardRole: "teaching",
            targetNodeIds: ["kg_science_fair_test"],
            reason: "Repair weak evidence."
          }
        };
      }
    },
    evidenceLedgerService: {
      listEvidence() {
        return [{
          evidenceId: "lgevd_science_1",
          sourceType: "daily_evaluation",
          graphNodeIds: ["kg_science_fair_test"],
          scoreBand: "low",
          status: "needs_repair",
          summary: { feedbackSummary: "The answer needs a clearer measured result." },
          createdAt: "2026-06-14T09:00:00.000Z"
        }];
      }
    },
    stageAssessmentService: {
      stageReadiness(input) {
        assert.equal(input.workspaceId, "weixin_stephen");
        assert.equal(input.targetNodeId, "kg_science_fair_test");
        assert.deepEqual(input.assessmentCoverageNodeIds, ["kg_science_fair_test"]);
        return {
          ok: true,
          eligible: true,
          activationState: "eligible",
          reason: "enough_recent_practice",
          assessmentCoverageNodeIds: input.assessmentCoverageNodeIds,
          evidence: {
            minimumRecentOrdinaryCards: 4,
            recentTrajectoryCount: 4,
            recentExperienceSignalCount: 1,
            sourceCardIds: ["card_1", "card_2", "card_3", "card_4"]
          },
          profileSummary: {
            recentTrajectoryCount: 4,
            recentExperienceSignalCount: 1
          }
        };
      }
    },
    ownerReviewSignalService: {
      ownerReviewSignal(input) {
        assert.equal(input.workspaceId, "weixin_stephen");
        assert.deepEqual(input.targetNodeIds, ["kg_science_fair_test"]);
        return {
          ok: true,
          available: true,
          status: "correction_recorded",
          reviewCount: 1,
          latestReview: {
            reviewId: "lgaudit_review_1",
            decision: "correction_recorded",
            status: "corrected",
            taskCardId: "ltask_science_1",
            evaluationId: "leval_science_1",
            profileDeltaId: "lgpdelta_science_1",
            correctionId: "corr_science_1",
            targetNodeIds: ["kg_science_fair_test"],
            reviewedAt: "2026-06-16T08:00:00.000Z",
            ownerNote: "must not leak"
          },
          plannerSignal: {
            status: "correction_recorded",
            trustLevel: "owner_corrected",
            followUpRequired: false,
            useForNextPlan: true,
            strategyBias: "use_owner_corrected_profile_signal",
            rawPrompt: "must not leak"
          },
          summary: {
            ownerReviewed: true,
            latestDecision: "correction_recorded",
            latestStatus: "corrected",
            latestReviewId: "lgaudit_review_1",
            followUpRequired: false,
            useForNextPlan: true,
            strategyBias: "use_owner_corrected_profile_signal",
            correctionRecordedCount: 1,
            reviewCount: 1
          }
        };
      }
    }
  });

  const result = service.plannerContext({
    workspaceId: "weixin_stephen",
    learnerId: "weixin_stephen",
    displayName: "Fanfan",
    horizon: "daily_plan",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    availableMinutes: 15
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, "growth.learningPlanner.input.v1");
  assert.equal(result.target.workspaceId, "weixin_stephen");
  assert.equal(result.constraints.completionPolicy, "daily_score_once");
  assert.equal(result.knowledgeGraph.candidateNodes[0].nodeId, "kg_science_fair_test");
  assert.equal(result.profileSummary.recommendedPlannerHints.strategy, "repair");
  assert.equal(result.profileSummary.staleEvidence[0].nodeId, "kg_science_old_claim");
  assert.equal(result.profileSummary.staleEvidence[0].evidenceFreshness.status, "stale");
  assert.equal(result.recentEvidence[0].evidenceId, "lgevd_science_1");
  assert.equal(result.stageAssessment.ok, true);
  assert.equal(result.stageAssessment.activationState, "eligible");
  assert.equal(result.stageAssessment.evidence.recentTrajectoryCount, 4);
  assert.deepEqual(result.stageAssessment.coverageNodeIds, ["kg_science_fair_test"]);
  assert.equal(result.ownerReviewSignal.schemaVersion, "growth.learningOwnerReviewSignal.v1");
  assert.equal(result.ownerReviewSignal.summary.latestDecision, "correction_recorded");
  assert.equal(result.ownerReviewSignal.plannerSignal.strategyBias, "use_owner_corrected_profile_signal");
  assert.equal(result.privacy.noFullChildAnswers, true);
  assert.equal(JSON.stringify(result).includes("rawAnswer"), false);
  assert.equal(JSON.stringify(result).includes("transcript"), false);
  assert.equal(JSON.stringify(result).includes("ownerNote"), false);
  assert.equal(JSON.stringify(result).includes("rawPrompt"), false);
});
