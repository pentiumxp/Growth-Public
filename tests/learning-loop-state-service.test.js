const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningLoopStateService,
  scanPrivacy
} = require("../src/services/learning-loop-state-service");

function preview(overrides = {}) {
  return Object.assign({
    ok: true,
    source: "growth-learning-daily-loop-service",
    operation: "preview",
    target: {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "Fanfan"
    },
    scope: {
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      availableMinutes: 15,
      targetNodeIds: ["kg_science_fair_test"]
    },
    readiness: {
      ready: true,
      targetEnabled: true,
      targetProvisioned: true,
      learningGraphReady: true,
      plannerReady: true,
      plannerContextReady: true,
      authoringGatewayConfigured: true,
      evaluationGatewayConfigured: true,
      plannerGatewayConfigured: true,
      operatingLoopGatewayReady: true
    },
    actions: {
      canDraft: true,
      canPublish: false,
      draftAction: {
        method: "POST",
        path: "/api/v1/growth/daily-loop/draft",
        enabled: true
      },
      publishAction: {
        method: "POST",
        path: "/api/v1/growth/daily-loop/publish",
        enabled: false
      }
    },
    context: {
      profileV2: {
        ok: true,
        available: true,
        summary: {
          capabilityStateCount: 2,
          evidenceCount: 4,
          weaknessCount: 1,
          strengthCount: 1
        },
        capabilityStates: [{
          nodeId: "kg_science_fair_test",
          status: "needs_repair",
          scoreBand: "developing",
          confidence: 0.44,
          evidenceCount: 2,
          evidenceWeightTotal: 0.8,
          evidenceIds: ["evidence_eval_1"],
          summary: "Recent answer mixed dependent and controlled variables."
        }],
        weaknesses: [{
          nodeId: "kg_science_fair_test",
          status: "needs_repair",
          scoreBand: "developing",
          confidence: 0.44,
          evidenceCount: 2,
          evidenceIds: ["evidence_eval_1"],
          summary: "Needs controlled-variable explanation."
        }],
        strengths: [{
          nodeId: "kg_science_observation",
          status: "stable",
          scoreBand: "secure",
          confidence: 0.82,
          evidenceCount: 3,
          evidenceIds: ["evidence_strength_1"],
          summary: "Can describe simple observations."
        }],
        staleEvidence: [],
        recommendedPlannerHints: [{ role: "repair" }],
        stageReadiness: { status: "dormant" }
      },
      evidenceAudit: {
        ok: true,
        count: 2,
        items: [{
          evidenceId: "evidence_eval_1",
          sourceType: "evaluation",
          sourceId: "eval_science_1",
          sourceTaskCardId: "ltask_science_1",
          graphNodeId: "kg_science_fair_test",
          graphNodeIds: ["kg_science_fair_test"],
          cardRole: "practice",
          evidenceWeight: 0.4,
          confidence: 0.48,
          scoreBand: "developing",
          status: "observed",
          summary: {
            summaryOnly: true,
            scoreBand: "developing",
            status: "observed",
            feedbackSummary: "Controlled variables need another short repair card.",
            remainingWeaknesses: ["controlled-variable explanation"]
          },
          createdAt: "2026-06-15T08:18:00.000Z"
        }]
      },
      ownerAudit: {
        summary: {
          planDraftCount: 1,
          publishedPlanCount: 1,
          profileDeltaCount: 1,
          correctionCount: 0,
          lastPlanAt: "2026-06-15T08:00:00.000Z",
          lastPublishedAt: "2026-06-15T08:05:00.000Z",
          lastProfileDeltaAt: "2026-06-15T08:20:00.000Z"
        },
        planAudit: {
          planDrafts: [{
            planDraftId: "lgplan_science_1",
            status: "published",
            horizon: "daily_plan",
            selectedItemId: "plan_item_1",
            generatedTaskCardId: "ltask_science_1",
            generatedLearningGraphPlanId: "lgp_science_1",
            targetNodeIds: ["kg_science_fair_test"],
            basisEvidenceIds: ["evidence_eval_1"],
            selectedItem: {
              itemId: "plan_item_1",
              cardRole: "practice",
              subject: "science",
              targetNodeIds: ["kg_science_fair_test"],
              estimatedMinutes: 12,
              difficultyBand: "foundation",
              supportLevel: "light_hint",
              evidenceRequirements: ["short_answer"],
              reason: "Repair controlled-variable explanation."
            },
            createdAt: "2026-06-15T08:00:00.000Z",
            publishedAt: "2026-06-15T08:05:00.000Z"
          }]
        },
        profileDeltaAudit: {
          items: [{
            profileDeltaId: "pdelta_science_1",
            taskCardId: "ltask_science_1",
            evaluationId: "eval_science_1",
            targetNodeIds: ["kg_science_fair_test"],
            evidenceIds: ["evidence_eval_1"],
            changedCapabilityCount: 1,
            profileStateChanged: true,
            summary: {
              reason: "Moved target node to repair because controlled-variable explanation was incomplete."
            },
            changedCapabilities: [{
              nodeId: "kg_science_fair_test",
              beforeStatus: "unknown",
              afterStatus: "needs_repair",
              summary: "Needs one more low-pressure repair card.",
              evidenceIds: ["evidence_eval_1"]
            }],
            plannerHintChange: {
              beforeStrategy: "observe",
              afterStrategy: "repair",
              reason: "One weak controlled-variable signal is present."
            },
            createdAt: "2026-06-15T08:20:00.000Z"
          }]
        },
        profileCorrections: {
          items: [{
            correctionId: "corr_science_1",
            reviewAction: "confirm",
            status: "active",
            targetNodeIds: ["kg_science_fair_test"],
            evidenceIds: ["evidence_corr_1"],
            sourceEvidenceIds: ["evidence_eval_1"],
            profileDeltaId: "pdelta_science_1",
            taskCardId: "ltask_science_1",
            evaluationId: "eval_science_1",
            reason: "Owner agrees with repair plan.",
            createdAt: "2026-06-15T08:30:00.000Z"
          }]
        }
      },
      nextCardRecommendation: {
        selectionMode: "strategy",
        recommendationMode: "trajectory",
        recommendationId: "rec_science_1",
        recommendationStatus: "pending",
        strategy: "repair",
        cardRole: "practice",
        difficultyBand: "foundation",
        supportLevel: "light_hint",
        targetNodeId: "kg_science_fair_test",
        targetNodeIds: ["kg_science_fair_test"],
        reason: "Recent evidence still needs a repair card.",
        evidenceBasis: {
          trajectoryId: "traj_science_1",
          taskCardId: "ltask_science_1",
          sourceEvaluationId: "eval_science_1",
          trajectoryUpdatedAt: "2026-06-15T08:21:00.000Z",
          weakSignalCount: 1,
          weakStateCount: 1
        },
        rawPrompt: "must not leak"
      },
      recommendationLifecycle: [{
        trajectoryId: "traj_science_1",
        status: "pending",
        strategy: "repair",
        cardRole: "practice",
        difficultyBand: "foundation",
        supportLevel: "light_hint",
        targetNodeIds: ["kg_science_fair_test"],
        reason: "Use one more short repair card.",
        taskCardId: "ltask_science_1",
        sourceEvaluationId: "eval_science_1",
        createdAt: "2026-06-15T08:21:00.000Z",
        statusUpdatedAt: "2026-06-15T08:21:00.000Z"
      }],
      authoringDraft: { rawPrompt: "must not leak" }
    },
    cycleAudit: null,
    completeness: null
  }, overrides);
}

function createService(options = {}) {
  const calls = [];
  const service = createLearningLoopStateService({
    dailyLoopService: {
      preview(input) {
        calls.push({ type: "preview", input });
        if (options.previewFails) return { ok: false, error: "daily_loop_preview_failed", rawPrompt: "must not leak" };
        return preview(options.previewOverrides);
      }
    },
    rewardAuditService: {
      listRewardAudit(input) {
        calls.push({ type: "rewardAudit", input });
        if (options.rewardAuditFails) return { ok: false, error: "reward_audit_failed", rawPrompt: "must not leak" };
        return {
          ok: true,
          schemaVersion: "growth.learningRewardAudit.v1",
          privacyClass: "summary_only",
          summaryOnly: true,
          rewardSettlements: [{
            rewardSettlementId: "lrwd_science_1",
            taskCardId: "ltask_science_1",
            evaluationId: "eval_science_1",
            status: "settled",
            coinAmount: 48,
            currency: "learning_coin",
            reason: "growth_coin_settled_by_daily_score",
            sourceType: "growth-plugin-evaluation",
            sourceId: "eval_science_1",
            idempotencyKey: "must_not_leak",
            ledgerEntry: { rawPrompt: "must not leak" },
            settledAt: "2026-06-15T08:25:00.000Z"
          }],
          summary: {
            rewardSettlementCount: 1,
            settledCount: 1,
            totalCoinAmount: 48,
            currency: "learning_coin",
            latestRewardSettlementId: "lrwd_science_1"
          }
        };
      }
    },
    stageAssessmentService: {
      stageReadiness(input) {
        calls.push({ type: "stageReadiness", input });
        if (options.stageEligible) {
          return {
            ok: true,
            eligible: true,
            activationState: "eligible",
            reason: "enough_recent_practice",
            evidence: {
              minimumRecentOrdinaryCards: 4,
              recentTrajectoryCount: 4,
              recentExperienceSignalCount: 0
            }
          };
        }
        return {
          ok: true,
          eligible: false,
          activationState: "dormant",
          reason: "insufficient_recent_practice",
          evidence: {
            minimumRecentOrdinaryCards: 4,
            recentTrajectoryCount: 1,
            recentExperienceSignalCount: 0
          }
        };
      }
    }
  });
  return { calls, service };
}

test("learning loop state projects a summary-only ready-to-draft state", () => {
  const { calls, service } = createService();

  const result = service.state({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domain: "science",
    subject: "science"
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, "growth.learningLoopState.v1");
  assert.equal(result.privacyClass, "summary_only");
  assert.equal(result.status, "ready_to_draft");
  assert.equal(result.nextAction.action, "draft_daily_plan");
  assert.equal(result.nextAction.endpoint, "/api/v1/growth/daily-loop/draft");
  assert.equal(result.profile.weaknessCount, 1);
  assert.equal(result.audit.planDraftCount, 1);
  assert.equal(result.stageAssessment.status, "dormant");
  assert.equal(result.recommendationEvidence.schemaVersion, "growth.learningLoopState.recommendationEvidence.v1");
  assert.equal(result.recommendationEvidence.summary.explanationReady, true);
  assert.equal(result.recommendationEvidence.evidenceBasis.trajectoryId, "traj_science_1");
  assert.deepEqual(result.recommendationEvidence.evidenceTrace.evidenceIds, ["evidence_eval_1", "evidence_corr_1"]);
  assert.deepEqual(result.recommendationEvidence.evidenceTrace.profileDeltaIds, ["pdelta_science_1"]);
  assert.deepEqual(result.recommendationEvidence.evidenceTrace.correctionIds, ["corr_science_1"]);
  assert.deepEqual(result.recommendationEvidence.evidenceTrace.rewardSettlementIds, ["lrwd_science_1"]);
  assert.equal(result.recommendationEvidence.profileTrace.weaknesses[0].nodeId, "kg_science_fair_test");
  assert.equal(result.recommendationEvidence.auditTrace.planDrafts[0].planDraftId, "lgplan_science_1");
  assert.equal(result.recommendationEvidence.auditTrace.evidenceItems[0].summary.feedbackSummary, "Controlled variables need another short repair card.");
  assert.equal(result.recommendationEvidence.auditTrace.profileDeltas[0].plannerHintChange.afterStrategy, "repair");
  assert.equal(result.recommendationEvidence.auditTrace.recommendationLifecycle[0].trajectoryId, "traj_science_1");
  assert.equal(result.recommendationEvidence.auditTrace.rewardSettlements[0].rewardSettlementId, "lrwd_science_1");
  assert.equal(result.recommendationEvidence.rewardTrace.summary.totalCoinAmount, 48);
  assert.equal(result.recommendationEvidence.rewardTrace.rewardSettlements[0].reason, "growth_coin_settled_by_daily_score");
  assert.equal(result.recommendationEvidence.summary.rewardSettlementCount, 1);
  assert.equal(result.recommendationEvidence.summary.totalRewardCoins, 48);
  assert.equal(result.summary.recommendationEvidenceReady, true);
  assert.deepEqual(calls.map((call) => call.type), ["preview", "rewardAudit", "stageReadiness"]);
  assert.deepEqual(calls[1].input.taskCardIds, ["ltask_science_1"]);
  assert.deepEqual(calls[1].input.evaluationIds, ["eval_science_1"]);
  assert.equal(JSON.stringify(result).includes("rawPrompt"), false);
  assert.equal(JSON.stringify(result).includes("authoringDraft"), false);
  assert.equal(JSON.stringify(result).includes("idempotencyKey"), false);
  assert.equal(JSON.stringify(result).includes("ledgerEntry"), false);
});

test("learning loop state prefers publish when a selected plan is ready", () => {
  const { service } = createService({
    previewOverrides: {
      actions: {
        canDraft: true,
        canPublish: true,
        publishAction: {
          method: "POST",
          path: "/api/v1/growth/daily-loop/publish",
          enabled: true,
          planDraftId: "lgplan_daily_1",
          itemId: "plan_item_1"
        }
      }
    }
  });

  const result = service.state({
    workspaceId: "weixin_fanfan",
    planDraftId: "lgplan_daily_1",
    itemId: "plan_item_1"
  });

  assert.equal(result.status, "ready_to_publish");
  assert.equal(result.nextAction.action, "publish_selected_plan_item");
  assert.equal(result.nextAction.planDraftId, "lgplan_daily_1");
  assert.equal(result.nextAction.itemId, "plan_item_1");
});

test("learning loop state surfaces incomplete audit before drafting more work", () => {
  const { service } = createService({
    previewOverrides: {
      completeness: {
        ok: true,
        complete: false,
        readyForAutomation: false,
        summary: { missingRequired: ["profile_delta_audit"] }
      },
      actions: {
        canDraft: true,
        draftAction: { enabled: true }
      }
    }
  });

  const result = service.state({
    workspaceId: "weixin_fanfan",
    taskCardId: "ltask_daily_1"
  });

  assert.equal(result.status, "audit_incomplete");
  assert.equal(result.nextAction.action, "complete_cycle_audit");
  assert.deepEqual(result.nextAction.missingRequired, ["profile_delta_audit"]);
});

test("learning loop state keeps reward audit failure visible and non-fatal", () => {
  const { service } = createService({ rewardAuditFails: true });

  const result = service.state({
    workspaceId: "weixin_fanfan",
    taskCardId: "ltask_science_1"
  });

  assert.equal(result.ok, true);
  assert.equal(result.recommendationEvidence.rewardTrace.available, false);
  assert.equal(result.recommendationEvidence.rewardTrace.error, "reward_audit_failed");
  assert.equal(result.recommendationEvidence.summary.rewardSettlementCount, 0);
  assert.equal(JSON.stringify(result).includes("must not leak"), false);
});

test("learning loop state surfaces stage checkpoint readiness", () => {
  const { service } = createService({ stageEligible: true });

  const result = service.state({
    workspaceId: "weixin_fanfan",
    targetNodeIds: ["kg_science_fair_test"]
  });

  assert.equal(result.status, "stage_checkpoint_ready");
  assert.equal(result.stageAssessment.eligible, true);
  assert.equal(result.nextAction.action, "review_stage_assessment");
  assert.equal(result.nextAction.endpoint, "/api/v1/growth/stage-assessments/activate");
});

test("learning loop state fails closed for privacy-risk input and missing dependencies", () => {
  assert.deepEqual(scanPrivacy({ nested: { rawPrompt: "bad" } }), ["$.nested.rawPrompt"]);

  const privacy = createService().service.state({
    workspaceId: "weixin_fanfan",
    rawAnswer: "must not enter state"
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_loop_state_privacy_failed");
  assert.deepEqual(privacy.privacyFindings, ["$.rawAnswer"]);

  const missing = createLearningLoopStateService({}).state({ workspaceId: "weixin_fanfan" });
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "learning_loop_state_daily_loop_service_unavailable");

  const previewFailure = createService({ previewFails: true }).service.state({ workspaceId: "weixin_fanfan" });
  assert.equal(previewFailure.ok, false);
  assert.equal(previewFailure.error, "daily_loop_preview_failed");
  assert.equal(JSON.stringify(previewFailure).includes("must not leak"), false);
});
