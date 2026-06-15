const assert = require("node:assert/strict");
const test = require("node:test");

const { createLearningCycleAuditService } = require("../src/services/learning-cycle-audit-service");

test("learning cycle audit service composes bounded audit readbacks", () => {
  const calls = [];
  const service = createLearningCycleAuditService({
    planAuditService: {
      listPlanDrafts(input) {
        calls.push({ type: "plan", input });
        return {
          ok: true,
          source: "plan-service",
          planDrafts: [{
            planDraftId: "lgplan_cycle_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            programId: input.programId,
            horizon: "daily_plan",
            status: "published",
            selectedItemId: "item_1",
            generatedTaskCardId: "ltask_cycle_1",
            generatedLearningGraphPlanId: "lgp_cycle_1",
            targetNodeIds: ["kg_science_fair_test", "kg_science_variables"],
            basisEvidenceIds: ["lgevd_basis_1"],
            planSummary: "Plan a fair-test repair card.",
            selectedItem: {
              itemId: "item_1",
              cardRole: "repair",
              targetNodeIds: ["kg_science_fair_test"],
              reason: "Use low-pressure repair."
            },
            rawPrompt: "RAW PLAN PROMPT",
            createdAt: "2026-06-15T07:55:00.000Z",
            updatedAt: "2026-06-15T08:00:00.000Z",
            publishedAt: "2026-06-15T08:02:00.000Z",
            privacyClass: "summary_only"
          }, {
            planDraftId: "lgplan_other",
            generatedTaskCardId: "ltask_other",
            targetNodeIds: ["kg_other_node"],
            rawPrompt: "RAW OTHER"
          }]
        };
      }
    },
    evidenceAuditService: {
      listEvidenceAudit(input) {
        calls.push({ type: "evidence", input });
        return {
          ok: true,
          source: "evidence-service",
          evidence: [{
            evidenceId: "lgevd_cycle_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            programId: input.programId,
            graphNodeIds: ["kg_science_fair_test"],
            sourceType: "daily_evaluation",
            sourceId: "eval_cycle_1",
            sourceTaskCardId: "ltask_cycle_1",
            cardRole: "practice",
            scoreBand: "medium",
            status: "observed",
            summary: {
              summaryOnly: true,
              taskCardId: "ltask_cycle_1",
              feedbackSummary: "Controlled one variable.",
              rawAnswer: "RAW ANSWER",
              evaluationId: "eval_cycle_1"
            },
            createdAt: "2026-06-15T08:10:00.000Z",
            privacyClass: "summary_only"
          }]
        };
      }
    },
    profileDeltaAuditService: {
      listProfileDeltas(input) {
        calls.push({ type: "profileDelta", input });
        return {
          ok: true,
          source: "profile-delta-service",
          profileDeltas: [{
            profileDeltaId: "lgpdelta_cycle_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            programId: input.programId,
            taskCardId: "ltask_cycle_1",
            evaluationId: "eval_cycle_1",
            targetNodeIds: ["kg_science_fair_test"],
            evidenceIds: ["lgevd_cycle_1"],
            changedCapabilityCount: 1,
            profileStateChanged: true,
            summary: { changedCapabilityCount: 1, rawTranscript: "RAW TRANSCRIPT" },
            changedCapabilities: [{ nodeId: "kg_science_fair_test", beforeState: "unknown", afterState: "developing" }],
            createdAt: "2026-06-15T08:11:00.000Z",
            privacyClass: "summary_only"
          }]
        };
      }
    },
    ownerCorrectionService: {
      listCorrections(input) {
        calls.push({ type: "correction", input });
        return {
          ok: true,
          source: "correction-service",
          corrections: [{
            correctionId: "lgcorr_cycle_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            programId: input.programId,
            reviewAction: "mark_needs_repair",
            status: "needs_repair",
            targetNodeIds: ["kg_science_fair_test"],
            evidenceIds: ["lgevd_corr_1"],
            profileDeltaId: "lgpdelta_cycle_1",
            taskCardId: "ltask_cycle_1",
            evaluationId: "eval_cycle_1",
            reason: "Owner saw the measurement step is still weak.",
            note: "Bounded note.",
            rawModelOutput: "RAW MODEL OUTPUT",
            createdAt: "2026-06-15T08:12:00.000Z",
            privacyClass: "summary_only"
          }]
        };
      }
    }
  });

  const result = service.listCycleAudit({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    displayName: "凡凡",
    programId: "program_science",
    planDraftId: "lgplan_cycle_1",
    taskCardId: "ltask_cycle_1",
    evaluationId: "eval_cycle_1",
    profileDeltaId: "lgpdelta_cycle_1",
    targetNodeIds: ["kg_science_fair_test"],
    limit: 99
  });

  assert.equal(result.ok, true);
  assert.equal(result.source, "growth-learning-cycle-audit-service");
  assert.equal(result.filters.limit, 50);
  assert.equal(result.summary.planDraftCount, 1);
  assert.equal(result.summary.evidenceCount, 1);
  assert.equal(result.summary.profileDeltaCount, 1);
  assert.equal(result.summary.correctionCount, 1);
  assert.equal(result.summary.hasPublishedPlan, true);
  assert.equal(result.summary.hasEvaluationEvidence, true);
  assert.equal(result.summary.latestActivityAt, "2026-06-15T08:12:00.000Z");
  assert.deepEqual(result.timeline.map((entry) => entry.type), ["correction", "profile_delta", "evidence", "plan"]);
  assert.equal(result.planAudit.planDrafts[0].generatedTaskCardId, "ltask_cycle_1");
  assert.equal(result.evidenceAudit.evidence[0].summary.feedbackSummary, "Controlled one variable.");
  assert.equal(result.profileDeltaAudit.profileDeltas[0].changedCapabilities[0].afterState, "developing");
  assert.equal(result.profileCorrections.corrections[0].correctionId, "lgcorr_cycle_1");
  assert.equal(JSON.stringify(result).includes("RAW"), false);
  assert.deepEqual(calls.map((entry) => entry.type), ["plan", "evidence", "profileDelta", "correction"]);
  assert.equal(calls[1].input.taskCardId, "ltask_cycle_1");
  assert.equal(calls[2].input.evaluationId, "eval_cycle_1");
  assert.deepEqual(calls[3].input.targetNodeIds, ["kg_science_fair_test"]);
});

test("learning cycle audit service reports partial read failures without table fallback", () => {
  const service = createLearningCycleAuditService({
    planAuditService: {
      listPlanDrafts() {
        return { ok: false, available: false, error: "plan_down" };
      }
    },
    evidenceAuditService: {
      listEvidenceAudit(input) {
        return {
          ok: true,
          evidence: [{
            evidenceId: "lgevd_only",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            graphNodeIds: ["kg_science_fair_test"],
            sourceType: "daily_evaluation",
            sourceId: "eval_only",
            sourceTaskCardId: "ltask_only",
            status: "observed",
            summary: { summaryOnly: true, feedbackSummary: "Only evidence is readable." }
          }]
        };
      }
    }
  });

  const result = service.listCycleAudit({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    taskCardId: "ltask_only",
    targetNodeIds: ["kg_science_fair_test"]
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.partialFailures, [
    "plan_down",
    "learning_cycle_audit_profile_delta_service_unavailable",
    "learning_cycle_audit_correction_service_unavailable"
  ]);
  assert.equal(result.planAudit.ok, false);
  assert.equal(result.evidenceAudit.count, 1);
  assert.equal(result.profileDeltaAudit.available, false);
});

test("learning cycle audit service includes failed plan publish attempts in timeline", () => {
  const service = createLearningCycleAuditService({
    planAuditService: {
      listPlanDrafts(input) {
        return {
          ok: true,
          source: "plan-service",
          planDrafts: [{
            planDraftId: "lgplan_failed_publish",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            programId: input.programId,
            horizon: "daily_plan",
            status: "draft",
            selectedItemId: "",
            generatedTaskCardId: "",
            targetNodeIds: ["kg_science_fair_test"],
            basisEvidenceIds: ["lgevd_basis_failed"],
            planSummary: "Plan failed before card publication.",
            publishAttempt: {
              status: "failed",
              error: "card_generation_failed",
              stage: "authoring",
              selectedItemId: "item_failed",
              attemptedAt: "2026-06-15T09:00:00.000Z",
              attemptCount: 1
            },
            createdAt: "2026-06-15T08:55:00.000Z",
            updatedAt: "2026-06-15T09:00:00.000Z",
            privacyClass: "summary_only"
          }]
        };
      }
    },
    evidenceAuditService: {
      listEvidenceAudit() {
        return { ok: true, evidence: [] };
      }
    },
    profileDeltaAuditService: {
      listProfileDeltas() {
        return { ok: true, profileDeltas: [] };
      }
    },
    ownerCorrectionService: {
      listCorrections() {
        return { ok: true, corrections: [] };
      }
    }
  });

  const result = service.listCycleAudit({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    planDraftId: "lgplan_failed_publish",
    targetNodeIds: ["kg_science_fair_test"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.summary.failedPublishAttemptCount, 1);
  assert.equal(result.summary.hasPublishedPlan, false);
  const publishAttempt = result.timeline.find((entry) => entry.type === "plan_publish_attempt");
  assert.equal(publishAttempt.status, "failed");
  assert.equal(publishAttempt.error, "card_generation_failed");
  assert.equal(publishAttempt.selectedItemId, "item_failed");
  assert.equal(result.planAudit.planDrafts[0].publishAttempt.error, "card_generation_failed");
  assert.equal(JSON.stringify(result).includes("raw"), false);
});

test("learning cycle audit service fails closed without workspace or audit services", () => {
  const unavailable = createLearningCycleAuditService();
  assert.deepEqual(unavailable.listCycleAudit({ workspaceId: "" }), {
    ok: false,
    error: "learning_cycle_audit_workspace_required"
  });
  assert.deepEqual(unavailable.listCycleAudit({ workspaceId: "weixin_fanfan" }), {
    ok: false,
    available: false,
    error: "learning_cycle_audit_unavailable",
    partialFailures: [
      "learning_cycle_audit_plan_service_unavailable",
      "learning_cycle_audit_evidence_service_unavailable",
      "learning_cycle_audit_profile_delta_service_unavailable",
      "learning_cycle_audit_correction_service_unavailable"
    ]
  });
});
