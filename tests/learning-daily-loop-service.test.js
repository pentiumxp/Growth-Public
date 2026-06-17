const assert = require("node:assert/strict");
const test = require("node:test");

const { createLearningDailyLoopService, scanPrivacyKeys } = require("../src/services/learning-daily-loop-service");

function context(overrides = {}) {
  return Object.assign({
    ok: true,
    target: {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "凡凡"
    },
    readiness: {
      ready: true,
      targetEnabled: true,
      learningGraphReady: true,
      plannerReady: true,
      plannerContextReady: true,
      authoringGatewayConfigured: true,
      evaluationGatewayConfigured: true,
      plannerGatewayConfigured: true,
      operatingLoopGatewayReady: true
    },
    targetProvisioning: {
      ok: true,
      targetEnabled: true,
      mode: "sample_default",
      selectedDomainPackId: "uk_hk_curriculum_foundation",
      selectedDomain: "science",
      selectedSubject: "science"
    },
    graphOptions: {
      selectedDomainPackId: "uk_hk_curriculum_foundation",
      selectedDomain: "science",
      selectedSubject: "science"
    },
    plannerReadiness: {
      ready: true,
      contextReady: true,
      horizon: "daily_plan"
    },
    generationDefaults: {
      availableMinutes: 15
    },
    suggestedPlan: {
      targetNodeIds: ["kg_science_fair_test"]
    },
    ownerAudit: {
      planAudit: { ok: true, count: 0, planDrafts: [] }
    }
  }, overrides);
}

function createService(options = {}) {
  const calls = [];
  const service = createLearningDailyLoopService({
    contextService: {
      context(input) {
        calls.push({ type: "context", input });
        if (options.contextFails) return { ok: false, error: "context_failed" };
        return context(options.contextOverrides);
      }
    },
    planPublisherService: {
      async draftPlan(input) {
        calls.push({ type: "draftPlan", input });
        if (options.draftFails) return { ok: false, error: "draft_failed" };
        return {
          ok: true,
          gatewayMode: "json",
          planDraft: {
            planDraftId: "lgplan_daily_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            programId: input.programId,
            horizon: "daily_plan",
            status: "draft",
            planSummary: "Practice fair-test reasoning.",
            targetNodeIds: ["kg_science_fair_test"],
            basisEvidenceIds: ["lgevd_previous_1"],
            draft: {
              items: [{
                itemId: "plan_item_1",
                cardRole: "practice",
                subject: "science",
                targetNodeIds: ["kg_science_fair_test"],
                estimatedMinutes: 12,
                difficultyBand: "foundation",
                supportLevel: "guided",
                evidenceRequirements: ["explain_controlled_variable"],
                reason: "Recent evidence shows uncertainty."
              }]
            },
            privacyClass: "summary_only"
          }
        };
      },
      async publishPlanItem(input) {
        calls.push({ type: "publishPlanItem", input });
        if (options.publishFails) {
          return {
            ok: false,
            error: "learning_plan_publish_generation_failed",
            stage: "authoring",
            planDraft: {
              planDraftId: input.planDraftId,
              workspaceId: input.workspaceId,
              learnerId: input.learnerId,
              status: "draft",
              publishAttempt: {
                status: "failed",
                error: "authoring_failed",
                stage: "authoring",
                attemptedAt: "2026-06-15T09:00:00.000Z",
                attemptCount: 1
              }
            },
            publishAttempt: {
              status: "failed",
              error: "authoring_failed",
              stage: "authoring"
            }
          };
        }
        return {
          ok: true,
          planDraft: {
            planDraftId: input.planDraftId,
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            programId: input.programId,
            horizon: "daily_plan",
            status: "published",
            selectedItemId: input.itemId,
            generatedTaskCardId: "ltask_daily_1",
            generatedLearningGraphPlanId: "lgp_daily_1",
            targetNodeIds: ["kg_science_fair_test"],
            publishAttempt: {
              status: "published",
              selectedItemId: input.itemId,
              attemptedAt: "2026-06-15T09:00:00.000Z",
              attemptCount: 1
            },
            privacyClass: "summary_only"
          },
          selectedItem: {
            itemId: input.itemId,
            cardRole: "practice",
            subject: "science",
            targetNodeIds: ["kg_science_fair_test"],
            evidenceRequirements: ["explain_controlled_variable"]
          },
          generation: {
            ok: true,
            recipeId: "daily_english_v1",
            gatewayMode: "json",
            targetProvisioning: {
              ok: true,
              mode: "sample_default",
              selectedDomainPackId: "uk_hk_curriculum_foundation",
              selectedDomain: "science",
              selectedSubject: "science"
            },
            learningGraphPlan: {
              learningGraphPlanId: "lgp_daily_1",
              targetNodeId: "kg_science_fair_test",
              targetNodeIds: ["kg_science_fair_test"],
              domainPackId: "uk_hk_curriculum_foundation",
              domain: "science",
              subject: "science",
              cardSequence: [{ cardRole: "practice" }]
            },
            draft: {
              teachingFlow: [{ rawPrompt: "must not leak" }]
            },
            published: {
              taskCardId: "ltask_daily_1",
              transaction: "committed"
            }
          }
        };
      }
    },
    cycleAuditService: {
      listCycleAudit(input) {
        calls.push({ type: "cycleAudit", input });
        return {
          ok: true,
          summary: {
            planDraftCount: 1,
            evidenceCount: 1,
            profileDeltaCount: 1,
            hasPublishedPlan: true
          },
          timeline: [{ type: "plan", id: input.planDraftId, taskCardId: input.taskCardId }]
        };
      }
    },
    auditCompletenessService: {
      evaluateCycleCompleteness(input) {
        calls.push({ type: "completeness", input });
        return {
          ok: true,
          complete: true,
          readyForAutomation: true,
          summary: { missingRequired: [] }
        };
      }
    }
  });
  return { calls, service };
}

test("daily loop preview composes context and optional cycle audit without writes", () => {
  const { calls, service } = createService();

  const result = service.preview({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    planDraftId: "lgplan_daily_1",
    taskCardId: "ltask_daily_1",
    targetNodeIds: ["kg_science_fair_test"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.operation, "preview");
  assert.equal(result.target.workspaceId, "weixin_fanfan");
  assert.equal(result.scope.subject, "science");
  assert.equal(result.readiness.plannerReady, true);
  assert.equal(result.actions.canDraft, true);
  assert.equal(result.actions.canPublish, true);
  assert.equal(result.cycleAudit.summary.planDraftCount, 1);
  assert.equal(result.completeness.readyForAutomation, true);
  assert.deepEqual(calls.map((call) => call.type), ["context", "cycleAudit", "completeness"]);
});

test("daily loop draft delegates to plan publisher and returns bounded draft DTO", async () => {
  const { calls, service } = createService();

  const result = await service.draft({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domain: "science",
    subject: "science"
  });

  assert.equal(result.ok, true);
  assert.equal(result.operation, "draft");
  assert.equal(result.planDraft.planDraftId, "lgplan_daily_1");
  assert.equal(result.planDraft.items[0].itemId, "plan_item_1");
  assert.equal(result.actions.publishAction.planDraftId, "lgplan_daily_1");
  assert.equal(result.gatewayMode, "json");
  assert.deepEqual(calls.map((call) => call.type), ["context", "draftPlan", "context"]);
});

test("daily loop draft hydrates recipe context scope before plan publication", async () => {
  const { calls, service } = createService();

  const result = await service.draft({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    recipeId: "daily_science_v1"
  });

  assert.equal(result.ok, true);
  const draftCall = calls.find((call) => call.type === "draftPlan");
  assert.equal(draftCall.input.recipeId, "daily_science_v1");
  assert.equal(draftCall.input.domainPackId, "uk_hk_curriculum_foundation");
  assert.equal(draftCall.input.domain, "science");
  assert.equal(draftCall.input.subject, "science");
  assert.equal(draftCall.input.availableMinutes, 15);
  assert.deepEqual(draftCall.input.targetNodeIds, ["kg_science_fair_test"]);
});

test("daily loop publish returns bounded generation and refreshes audit/completeness", async () => {
  const { calls, service } = createService();

  const result = await service.publish({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    planDraftId: "lgplan_daily_1",
    itemId: "plan_item_1",
    domain: "science",
    subject: "science"
  });

  assert.equal(result.ok, true);
  assert.equal(result.operation, "publish");
  assert.equal(result.planDraft.status, "published");
  assert.equal(result.generation.published.taskCardId, "ltask_daily_1");
  assert.equal(result.generation.learningGraphPlan.learningGraphPlanId, "lgp_daily_1");
  assert.equal(JSON.stringify(result).includes("rawPrompt"), false);
  assert.equal(result.cycleAudit.summary.hasPublishedPlan, true);
  assert.equal(result.completeness.complete, true);
  assert.deepEqual(calls.map((call) => call.type), ["context", "publishPlanItem", "context", "cycleAudit", "completeness"]);
  assert.equal(calls[3].input.planDraftId, "lgplan_daily_1");
  assert.equal(calls[3].input.taskCardId, "ltask_daily_1");
});

test("daily loop advance drafts and publishes one card through service boundaries", async () => {
  const { calls, service } = createService();

  const result = await service.advance({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domain: "science",
    subject: "science"
  });

  assert.equal(result.ok, true);
  assert.equal(result.operation, "advance");
  assert.equal(result.stage, "published");
  assert.equal(result.draftStep.operation, "draft");
  assert.equal(result.draftStep.planDraftId, "lgplan_daily_1");
  assert.equal(result.publishStep.operation, "publish");
  assert.equal(result.publishStep.taskCardId, "ltask_daily_1");
  assert.equal(result.planDraft.status, "published");
  assert.equal(result.generation.published.taskCardId, "ltask_daily_1");
  assert.equal(result.cycleAudit.summary.hasPublishedPlan, true);
  assert.equal(JSON.stringify(result).includes("rawPrompt"), false);
  assert.deepEqual(calls.map((call) => call.type), [
    "context",
    "draftPlan",
    "context",
    "context",
    "publishPlanItem",
    "context",
    "cycleAudit",
    "completeness"
  ]);
  assert.equal(calls[4].input.planDraftId, "lgplan_daily_1");
  assert.equal(calls[4].input.itemId, "plan_item_1");
  assert.equal(calls[4].input.domainPackId, "uk_hk_curriculum_foundation");
  assert.equal(calls[4].input.domain, "science");
  assert.equal(calls[4].input.subject, "science");
});

test("daily loop publish failure keeps bounded publish attempt visible", async () => {
  const { service } = createService({ publishFails: true });

  const result = await service.publish({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    planDraftId: "lgplan_daily_1",
    itemId: "plan_item_1"
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_plan_publish_generation_failed");
  assert.equal(result.stage, "authoring");
  assert.equal(result.planDraft.publishAttempt.status, "failed");
  assert.equal(result.publishAttempt.error, "authoring_failed");
  assert.equal(result.cycleAudit.ok, true);
});

test("daily loop rejects privacy-risk input before downstream services", async () => {
  const { calls, service } = createService();

  const result = await service.draft({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    rawPrompt: "do not store"
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_daily_loop_privacy_failed");
  assert.deepEqual(result.privacyFindings, ["$.rawPrompt"]);
  assert.deepEqual(calls, []);
});

test("daily loop reports missing dependencies explicitly", async () => {
  const service = createLearningDailyLoopService({});

  assert.equal(service.preview({ workspaceId: "weixin_fanfan" }).error, "learning_daily_loop_context_service_unavailable");
  assert.equal((await service.draft({ workspaceId: "weixin_fanfan" })).error, "learning_daily_loop_plan_publisher_unavailable");
  assert.equal((await service.publish({ workspaceId: "weixin_fanfan" })).error, "learning_daily_loop_plan_publisher_unavailable");
});

test("daily loop privacy scanner detects nested private keys", () => {
  assert.deepEqual(scanPrivacyKeys({
    safe: true,
    nested: { answerKey: "hidden" },
    list: [{ providerConfig: "private" }]
  }), ["$.nested.answerKey", "$.list[0].providerConfig"]);
});
