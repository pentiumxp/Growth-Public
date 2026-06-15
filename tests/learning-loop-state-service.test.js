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
        weaknesses: [{
          nodeId: "kg_science_fair_test",
          status: "needs_repair",
          summary: "Needs controlled-variable explanation."
        }],
        staleEvidence: [],
        recommendedPlannerHints: [{ role: "repair" }],
        stageReadiness: { status: "dormant" }
      },
      evidenceAudit: { ok: true, count: 2 },
      ownerAudit: {
        summary: {
          planDraftCount: 1,
          publishedPlanCount: 1,
          profileDeltaCount: 1,
          correctionCount: 0,
          lastPlanAt: "2026-06-15T08:00:00.000Z",
          lastPublishedAt: "2026-06-15T08:05:00.000Z",
          lastProfileDeltaAt: "2026-06-15T08:20:00.000Z"
        }
      },
      nextCardRecommendation: {
        selectionMode: "strategy",
        strategy: "repair",
        targetNodeId: "kg_science_fair_test",
        reason: "Recent evidence still needs a repair card.",
        rawPrompt: "must not leak"
      },
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
  assert.deepEqual(calls.map((call) => call.type), ["preview", "stageReadiness"]);
  assert.equal(JSON.stringify(result).includes("rawPrompt"), false);
  assert.equal(JSON.stringify(result).includes("authoringDraft"), false);
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
