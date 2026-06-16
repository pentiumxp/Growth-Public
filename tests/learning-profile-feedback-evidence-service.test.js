const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningProfileFeedbackEvidenceService,
  publicScope,
  scanPrivacy
} = require("../src/services/learning-profile-feedback-evidence-service");

function completeDependencies(overrides = {}) {
  const calls = [];
  const services = {
    auditCompletenessService: {
      evaluateCycleCompleteness(input) {
        calls.push({ type: "completeness", input });
        return overrides.completeness || {
          ok: true,
          complete: true,
          readyForAutomation: true,
          summary: { missingRequired: [] }
        };
      }
    },
    evidenceAuditService: {
      listEvidenceAudit(input) {
        calls.push({ type: "evidenceAudit", input });
        return overrides.evidenceAudit || {
          ok: true,
          count: 1,
          evidence: [{
            evidenceId: "lgevd_daily_1",
            graphNodeId: "kg_science_fair_test",
            graphNodeIds: ["kg_science_fair_test"],
            sourceType: "daily_evaluation",
            sourceId: "leval_daily_1",
            rawPrompt: "must not leak"
          }]
        };
      }
    },
    profileDeltaAuditService: {
      listProfileDeltas(input) {
        calls.push({ type: "profileDeltaAudit", input });
        return overrides.profileDeltaAudit || {
          ok: true,
          count: 1,
          profileDeltas: [{
            profileDeltaId: "lgpdelta_daily_1",
            evaluationId: "leval_daily_1",
            changedCapabilityCount: 1,
            targetNodeIds: ["kg_science_fair_test"],
            rawAnswer: "must not leak"
          }]
        };
      }
    },
    profileV2Service: {
      profileV2(input) {
        calls.push({ type: "profileV2", input });
        return overrides.profileV2 || {
          ok: true,
          available: true,
          summary: {
            capabilityStateCount: 1,
            evidenceCount: 2,
            weaknessCount: 1,
            strengthCount: 0,
            staleCount: 0,
            pressureSignalCount: 0
          },
          weaknesses: [{
            nodeId: "kg_science_fair_test",
            status: "needs_repair",
            summary: "Needs measured-result reasoning."
          }],
          recommendedPlannerHints: {
            strategy: "repair",
            rawPrompt: "must not leak"
          }
        };
      }
    },
    recommendationService: {
      recommendNextCard(input) {
        calls.push({ type: "recommendation", input });
        return overrides.recommendation || {
          ok: true,
          available: true,
          recommendationMode: "trajectory",
          recommendationStatus: "pending",
          strategy: "repair",
          cardRole: "practice",
          targetNodeIds: ["kg_science_fair_test"],
          reason: "Use a low-pressure repair card.",
          rawPrompt: "must not leak"
        };
      }
    },
    loopStateService: {
      state(input) {
        calls.push({ type: "loopState", input });
        return overrides.loopState || {
          ok: true,
          status: "ready_to_draft",
          nextAction: {
            action: "draft_daily_plan",
            enabled: true,
            reason: "next_strategy:repair",
            targetNodeId: "kg_science_fair_test"
          },
          audit: {
            complete: true,
            missingRequired: []
          },
          rewardTrace: {
            available: true,
            ok: true,
            rewardSettlements: [{
              rewardSettlementId: "lrwd_daily_1",
              taskCardId: "ltask_science_daily_1",
              evaluationId: "leval_daily_1",
              coinAmount: 42,
              idempotencyKey: "must not leak"
            }],
            summary: {
              rewardSettlementCount: 1,
              settledCount: 1,
              totalCoinAmount: 42,
              currency: "growth_coin",
              latestRewardSettlementId: "lrwd_daily_1"
            }
          },
          summary: {
            rewardSettlementCount: 1,
            totalRewardCoins: 42
          }
        };
      }
    },
    cycleHistoryService: {
      listCycleHistory(input) {
        calls.push({ type: "cycleHistory", input });
        return overrides.cycleHistory || {
          ok: true,
          available: true,
          summary: {
            cycleCount: 1,
            completeCount: 1,
            readyForAutomationCount: 1,
            latestActivityAt: "2026-06-16T08:00:00.000Z"
          },
          cycles: [{
            cycleId: "cycle_science_1",
            status: "ready_for_profile_feedback",
            latestActivityAt: "2026-06-16T08:00:00.000Z",
            selectors: {
              planDraftId: "lgplan_science_1",
              taskCardId: "ltask_science_daily_1",
              evaluationId: "leval_daily_1",
              profileDeltaId: "lgpdelta_daily_1",
              evidenceId: "lgevd_daily_1",
              sourceId: "leval_daily_1",
              targetNodeIds: ["kg_science_fair_test"]
            },
            completeness: {
              complete: true,
              readyForAutomation: true
            },
            rawPrompt: "must not leak"
          }]
        };
      }
    }
  };
  return { calls, services };
}

test("profile feedback evidence service proves a completed cycle can drive the next plan", () => {
  const { calls, services } = completeDependencies();
  const service = createLearningProfileFeedbackEvidenceService(services);

  const result = service.evaluate({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domain: "science",
    subject: "science",
    taskCardId: "ltask_science_daily_1",
    evaluationId: "leval_daily_1",
    targetNodeIds: ["kg_science_fair_test"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, "growth.learningProfileFeedbackEvidence.v1");
  assert.equal(result.privacyClass, "summary_only");
  assert.equal(result.status, "pass");
  assert.equal(result.summary.readyForNextPlan, true);
  assert.equal(result.summary.evidenceCount, 1);
  assert.equal(result.summary.profileDeltaCount, 1);
  assert.equal(result.summary.rewardSettlementCount, 1);
  assert.equal(result.summary.totalRewardCoins, 42);
  assert.equal(result.summary.recommendationMode, "trajectory");
  assert.equal(result.summary.nextAction, "draft_daily_plan");
  assert.equal(result.loopState.reward.available, true);
  assert.equal(result.loopState.reward.rewardSettlementCount, 1);
  assert.deepEqual(result.loopState.reward.rewardSettlementIds, ["lrwd_daily_1"]);
  assert.deepEqual(result.summary.missingRequired, []);
  assert.equal(JSON.stringify(result).includes("must not leak"), false);
  assert.equal(JSON.stringify(result).includes("idempotencyKey"), false);
  assert.equal(JSON.stringify(result).includes("rawPrompt"), false);
  assert.deepEqual(calls.map((call) => call.type), [
    "completeness",
    "evidenceAudit",
    "profileDeltaAudit",
    "profileV2",
    "recommendation",
    "loopState"
  ]);
});

test("profile feedback evidence service requires a completed-cycle selector", () => {
  const { calls, services } = completeDependencies();
  const service = createLearningProfileFeedbackEvidenceService(services);

  const result = service.evaluate({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan"
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "missing");
  assert.equal(result.error, "profile_feedback_cycle_selector_required");
  assert.deepEqual(result.summary.missingRequired, ["cycle_selector_present"]);
  assert.equal(result.selectorDiscovery.status, "candidate_available");
  assert.equal(result.summary.selectorCandidateCount, 1);
  assert.equal(result.summary.completeCycleCount, 1);
  assert.equal(result.summary.nextAction, "supply_completed_cycle_selector");
  assert.equal(result.checks[0].requiredAction.action, "supply_completed_cycle_selector");
  assert.equal(result.selectorDiscovery.candidates[0].taskCardId, "ltask_science_daily_1");
  assert.equal(JSON.stringify(result).includes("must not leak"), false);
  assert.deepEqual(calls.map((call) => call.type), ["cycleHistory"]);
});

test("profile feedback evidence service can auto-select the latest completed cycle for release evidence", () => {
  const { calls, services } = completeDependencies({
    cycleHistory: {
      ok: true,
      available: true,
      summary: {
        cycleCount: 2,
        completeCount: 2,
        readyForAutomationCount: 2,
        latestActivityAt: "2026-06-16T09:30:00.000Z"
      },
      cycles: [
        {
          cycleId: "cycle_old",
          status: "ready_for_profile_feedback",
          latestActivityAt: "2026-06-15T08:00:00.000Z",
          selectors: {
            taskCardId: "ltask_old_daily_1",
            evaluationId: "leval_old_daily_1",
            profileDeltaId: "lgpdelta_old_daily_1",
            evidenceId: "lgevd_old_daily_1",
            sourceId: "leval_old_daily_1",
            targetNodeIds: ["kg_science_old"]
          },
          completeness: { complete: true, readyForAutomation: true }
        },
        {
          cycleId: "cycle_latest",
          status: "ready_for_profile_feedback",
          latestActivityAt: "2026-06-16T09:30:00.000Z",
          selectors: {
            planDraftId: "lgplan_science_latest",
            taskCardId: "ltask_science_latest",
            evaluationId: "leval_science_latest",
            profileDeltaId: "lgpdelta_science_latest",
            evidenceId: "lgevd_science_latest",
            sourceId: "leval_science_latest",
            targetNodeIds: ["kg_science_fair_test"]
          },
          completeness: { complete: true, readyForAutomation: true }
        }
      ]
    }
  });
  const service = createLearningProfileFeedbackEvidenceService(services);

  const result = service.evaluate({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    autoSelectLatestCompletedCycle: true
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "pass");
  assert.equal(result.autoSelection.status, "selected_latest_completed_cycle");
  assert.equal(result.selectedCompletedCycle.cycleId, "cycle_latest");
  assert.equal(result.selectedCompletedCycle.taskCardId, "ltask_science_latest");
  assert.equal(result.summary.selectedCycleId, "cycle_latest");
  assert.equal(result.summary.selectedTaskCardId, "ltask_science_latest");
  assert.equal(result.summary.autoSelectionStatus, "selected_latest_completed_cycle");
  assert.deepEqual(calls.map((call) => call.type), [
    "cycleHistory",
    "completeness",
    "evidenceAudit",
    "profileDeltaAudit",
    "profileV2",
    "recommendation",
    "loopState"
  ]);
  for (const call of calls.filter((item) => item.type !== "cycleHistory")) {
    assert.equal(call.input.taskCardId, "ltask_science_latest");
    assert.equal(call.input.evaluationId, "leval_science_latest");
    assert.deepEqual(call.input.targetNodeIds, ["kg_science_fair_test"]);
  }
  assert.equal(JSON.stringify(result).includes("rawPrompt"), false);
});

test("profile feedback evidence service reports no completed cycle candidates without fabricating release evidence", () => {
  const { calls, services } = completeDependencies({
    cycleHistory: {
      ok: true,
      available: true,
      summary: {
        cycleCount: 0,
        completeCount: 0,
        readyForAutomationCount: 0,
        latestActivityAt: ""
      },
      cycles: []
    }
  });
  const service = createLearningProfileFeedbackEvidenceService(services);

  const result = service.evaluate({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    targetNodeIds: ["kg_science_fair_test"]
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "profile_feedback_cycle_selector_required");
  assert.equal(result.selectorDiscovery.status, "no_completed_cycle");
  assert.equal(result.summary.cycleCount, 0);
  assert.equal(result.summary.completeCycleCount, 0);
  assert.equal(result.summary.nextAction, "produce_completed_daily_cycle");
  assert.equal(result.checks[0].requiredAction.action, "produce_completed_daily_cycle");
  assert.deepEqual(calls.map((call) => call.type), ["cycleHistory"]);
});

test("profile feedback evidence service reports missing profile feedback without passing release evidence", () => {
  const { services } = completeDependencies({
    evidenceAudit: { ok: true, count: 0, evidence: [] },
    profileDeltaAudit: { ok: true, count: 0, profileDeltas: [] },
    profileV2: { ok: true, available: true, summary: { evidenceCount: 0, capabilityStateCount: 0 } },
    recommendation: {
      ok: false,
      available: true,
      error: "next_card_recommendation_unavailable"
    },
    loopState: {
      ok: true,
      status: "audit_incomplete",
      nextAction: { action: "complete_cycle_audit", enabled: true },
      audit: { complete: false, missingRequired: ["profile_delta_audit"] }
    }
  });
  const service = createLearningProfileFeedbackEvidenceService(services);

  const result = service.evaluate({
    workspaceId: "weixin_fanfan",
    taskCardId: "ltask_missing_daily_1",
    targetNodeIds: ["kg_science_fair_test"]
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "missing");
  assert.deepEqual(result.summary.missingRequired, [
    "evidence_ledger_present",
    "profile_delta_audit_present",
    "profile_v2_projected",
    "next_recommendation_available"
  ]);
  assert.equal(result.summary.readyForNextPlan, false);
  assert.equal(result.checks.find((item) => item.key === "learning_loop_state_ready").status, "pass");
});

test("profile feedback evidence service fails closed for privacy-risk input and normalizes scope", () => {
  assert.deepEqual(scanPrivacy({ nested: { rawPrompt: "bad" } }), ["$.nested.rawPrompt"]);
  assert.deepEqual(publicScope({
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    target_node_ids: ["kg_science_fair_test", "kg_science_fair_test"],
    available_minutes: 12
  }), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "",
    domainPackId: "",
    domain: "",
    subject: "",
    horizon: "daily_plan",
    availableMinutes: 12,
    planDraftId: "",
    taskCardId: "",
    evaluationId: "",
    profileDeltaId: "",
    evidenceId: "",
    correctionId: "",
    sourceId: "",
    targetNodeIds: ["kg_science_fair_test"],
    autoSelectCompletedCycle: false,
    autoSelectLatestCompletedCycle: false,
    limit: 12
  });

  const result = createLearningProfileFeedbackEvidenceService(completeDependencies().services).evaluate({
    workspaceId: "weixin_fanfan",
    taskCardId: "ltask_daily_1",
    rawAnswer: "must not enter smoke"
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "profile_feedback_privacy_failed");
  assert.deepEqual(result.privacyFindings, ["$.rawAnswer"]);
});
