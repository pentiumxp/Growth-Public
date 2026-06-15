const assert = require("node:assert/strict");
const test = require("node:test");

const { createLearningAuditCompletenessService } = require("../src/services/learning-audit-completeness-service");

function completeCycle(overrides = {}) {
  return Object.assign({
    ok: true,
    source: "growth-learning-cycle-audit-service",
    target: {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "凡凡"
    },
    summary: {
      planDraftCount: 1,
      evidenceCount: 1,
      profileDeltaCount: 1,
      correctionCount: 0,
      hasPublishedPlan: true,
      hasEvaluationEvidence: true,
      hasProfileDelta: true,
      hasCorrections: false,
      latestActivityAt: "2026-06-15T08:12:00.000Z"
    },
    partialFailures: [],
    planAudit: {
      ok: true,
      planDrafts: [{
        planDraftId: "lgplan_cycle_1",
        status: "published",
        generatedTaskCardId: "ltask_cycle_1",
        targetNodeIds: ["kg_science_fair_test"],
        publishAttempt: {
          status: "published",
          stage: "published",
          selectedItemId: "item_1",
          attemptedAt: "2026-06-15T08:02:00.000Z",
          attemptCount: 1
        }
      }]
    },
    evidenceAudit: {
      ok: true,
      evidence: [{
        evidenceId: "lgevd_cycle_1",
        sourceType: "daily_evaluation",
        sourceId: "eval_cycle_1",
        sourceTaskCardId: "ltask_cycle_1",
        summary: { summaryOnly: true, evaluationId: "eval_cycle_1" }
      }]
    },
    profileDeltaAudit: {
      ok: true,
      profileDeltas: [{
        profileDeltaId: "lgpdelta_cycle_1",
        taskCardId: "ltask_cycle_1",
        evaluationId: "eval_cycle_1"
      }]
    },
    profileCorrections: {
      ok: true,
      corrections: []
    },
    timeline: [
      { type: "profile_delta", id: "lgpdelta_cycle_1", at: "2026-06-15T08:11:00.000Z" },
      { type: "evidence", id: "lgevd_cycle_1", at: "2026-06-15T08:10:00.000Z" },
      { type: "plan", id: "lgplan_cycle_1", at: "2026-06-15T08:02:00.000Z" }
    ]
  }, overrides);
}

test("audit completeness service marks a fully audited learning cycle ready", () => {
  const calls = [];
  const service = createLearningAuditCompletenessService({
    cycleAuditService: {
      listCycleAudit(input) {
        calls.push(input);
        return completeCycle();
      }
    }
  });

  const result = service.evaluateCycleCompleteness({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    displayName: "凡凡",
    programId: "program_science",
    planDraftId: "lgplan_cycle_1",
    taskCardId: "ltask_cycle_1",
    evaluationId: "eval_cycle_1",
    targetNodeIds: ["kg_science_fair_test"],
    limit: 99
  });

  assert.equal(result.ok, true);
  assert.equal(result.complete, true);
  assert.equal(result.readyForAutomation, true);
  assert.equal(result.summary.satisfiedRequiredCount, result.summary.requiredCount);
  assert.deepEqual(result.summary.missingRequired, []);
  assert.equal(result.findings.find((item) => item.code === "plan_publication").ok, true);
  assert.equal(result.findings.find((item) => item.code === "profile_delta_audit").ok, true);
  assert.equal(result.cycleAudit.timeline.length, 3);
  assert.deepEqual(calls[0].targetNodeIds, ["kg_science_fair_test"]);
  assert.equal(calls[0].limit, 50);
  assert.equal(JSON.stringify(result).includes("rawAnswer"), false);
});

test("audit completeness service blocks automation when required audit evidence is missing", () => {
  const service = createLearningAuditCompletenessService({
    cycleAuditService: {
      listCycleAudit() {
        return completeCycle({
          summary: {
            planDraftCount: 1,
            evidenceCount: 0,
            profileDeltaCount: 0,
            correctionCount: 0,
            hasPublishedPlan: true,
            hasEvaluationEvidence: false,
            hasProfileDelta: false,
            latestActivityAt: "2026-06-15T08:02:00.000Z"
          },
          partialFailures: ["learning_cycle_audit_profile_delta_service_unavailable"],
          evidenceAudit: { ok: true, evidence: [] },
          profileDeltaAudit: { ok: false, available: false, error: "learning_cycle_audit_profile_delta_service_unavailable" },
          timeline: [{ type: "plan", id: "lgplan_cycle_1", at: "2026-06-15T08:02:00.000Z" }]
        });
      }
    }
  });

  const result = service.evaluateCycleCompleteness({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    taskCardId: "ltask_cycle_1"
  });

  assert.equal(result.ok, true);
  assert.equal(result.complete, false);
  assert.equal(result.readyForAutomation, false);
  assert.deepEqual(result.summary.missingRequired.sort(), [
    "evaluation_evidence",
    "partial_failures",
    "profile_delta_audit"
  ].sort());
  assert.equal(result.findings.find((item) => item.code === "partial_failures").evidence.partialFailures[0], "learning_cycle_audit_profile_delta_service_unavailable");
});

test("audit completeness service does not treat safe public text values as privacy leaks", () => {
  const service = createLearningAuditCompletenessService({
    cycleAuditService: {
      listCycleAudit() {
        return completeCycle({
          planAudit: {
            ok: true,
            planDrafts: [{
              planDraftId: "lgplan_cycle_1",
              status: "published",
              generatedTaskCardId: "ltask_cycle_1",
              targetNodeIds: ["kg_science_fair_test"],
              planSummary: "Public vocabulary may mention token, cookie, secret, transcript, or prompt as learning topics.",
              selectedItem: {
                itemId: "item_1",
                reason: "Use summary-only privacyClass fields without raw source content.",
                evidenceRequirements: ["short_explanation"]
              },
              publishAttempt: {
                status: "published",
                stage: "published",
                selectedItemId: "item_1",
                attemptedAt: "2026-06-15T08:02:00.000Z",
                attemptCount: 1
              },
              privacyClass: "summary_only"
            }]
          },
          timeline: [
            { type: "profile_delta", id: "lgpdelta_cycle_1", summary: "No privatePath or providerConfig keys are present." },
            { type: "evidence", id: "lgevd_cycle_1", summary: "A learner can discuss transcript as a public word." },
            { type: "plan", id: "lgplan_cycle_1", summary: "Token is a safe value here, not a credential key." }
          ]
        });
      }
    }
  });

  const result = service.evaluateCycleCompleteness({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    taskCardId: "ltask_cycle_1"
  });

  assert.equal(result.complete, true);
  assert.equal(result.findings.find((item) => item.code === "privacy_projection").ok, true);
  assert.deepEqual(result.summary.missingRequired, []);
});

test("audit completeness service blocks raw or private public DTO keys", () => {
  const service = createLearningAuditCompletenessService({
    cycleAuditService: {
      listCycleAudit() {
        return completeCycle({
          planAudit: {
            ok: true,
            planDrafts: [{
              planDraftId: "lgplan_cycle_1",
              status: "published",
              generatedTaskCardId: "ltask_cycle_1",
              targetNodeIds: ["kg_science_fair_test"],
              selectedItem: {
                itemId: "item_1",
                rawPrompt: "must not project"
              }
            }]
          },
          evidenceAudit: {
            ok: true,
            evidence: [{
              evidenceId: "lgevd_cycle_1",
              sourceType: "daily_evaluation",
              sourceId: "eval_cycle_1",
              sourceTaskCardId: "ltask_cycle_1",
              summary: {
                summaryOnly: true,
                evaluationId: "eval_cycle_1",
                providerConfig: { model: "hidden" }
              }
            }]
          },
          timeline: [{ type: "plan", id: "lgplan_cycle_1", privatePath: "/tmp/private" }]
        });
      }
    }
  });

  const result = service.evaluateCycleCompleteness({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    taskCardId: "ltask_cycle_1"
  });

  assert.equal(result.complete, false);
  assert.equal(result.findings.find((item) => item.code === "privacy_projection").ok, false);
  assert.equal(result.summary.missingRequired.includes("privacy_projection"), true);
});

test("audit completeness service requires failed publish attempts to appear in timeline", () => {
  const service = createLearningAuditCompletenessService({
    cycleAuditService: {
      listCycleAudit() {
        return completeCycle({
          summary: {
            planDraftCount: 1,
            evidenceCount: 0,
            profileDeltaCount: 0,
            correctionCount: 0,
            hasPublishedPlan: false,
            hasEvaluationEvidence: false,
            hasProfileDelta: false,
            failedPublishAttemptCount: 1,
            latestActivityAt: "2026-06-15T09:00:00.000Z"
          },
          planAudit: {
            ok: true,
            planDrafts: [{
              planDraftId: "lgplan_failed",
              status: "draft",
              targetNodeIds: ["kg_science_fair_test"],
              publishAttempt: {
                status: "failed",
                error: "card_generation_failed",
                stage: "authoring",
                selectedItemId: "item_failed",
                attemptedAt: "2026-06-15T09:00:00.000Z",
                attemptCount: 1
              }
            }]
          },
          evidenceAudit: { ok: true, evidence: [] },
          profileDeltaAudit: { ok: true, profileDeltas: [] },
          timeline: [{ type: "plan", id: "lgplan_failed", at: "2026-06-15T09:00:00.000Z" }]
        });
      }
    }
  });

  const result = service.evaluateCycleCompleteness({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    planDraftId: "lgplan_failed"
  });

  assert.equal(result.complete, false);
  assert.equal(result.findings.find((item) => item.code === "publish_attempt_visibility").ok, false);
  assert.equal(result.summary.publishFailedOrBlocked, true);
});

test("audit completeness service fails closed without workspace or cycle audit service", () => {
  const unavailable = createLearningAuditCompletenessService();
  assert.deepEqual(unavailable.evaluateCycleCompleteness({ workspaceId: "" }), {
    ok: false,
    error: "learning_audit_completeness_workspace_required"
  });
  assert.deepEqual(unavailable.evaluateCycleCompleteness({ workspaceId: "weixin_fanfan" }), {
    ok: false,
    available: false,
    error: "learning_audit_completeness_cycle_service_unavailable"
  });
});
