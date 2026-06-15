const assert = require("node:assert/strict");
const test = require("node:test");

const { createLearningCycleHistoryService } = require("../src/services/learning-cycle-history-service");

test("learning cycle history service composes selectable completed-cycle summaries", () => {
  const completenessCalls = [];
  const service = createLearningCycleHistoryService({
    planAuditService: {
      listPlanDrafts(input) {
        return {
          ok: true,
          source: "plan-audit",
          planDrafts: [{
            planDraftId: "lgplan_science_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            programId: input.programId,
            status: "published",
            generatedTaskCardId: "ltask_science_1",
            targetNodeIds: ["kg_science_fair_test"],
            planSummary: "Practice fair-test variables.",
            selectedItem: { reason: "Low-pressure repair." },
            rawPrompt: "RAW PLAN",
            createdAt: "2026-06-15T08:00:00.000Z",
            updatedAt: "2026-06-15T08:01:00.000Z",
            publishedAt: "2026-06-15T08:02:00.000Z"
          }]
        };
      }
    },
    evidenceAuditService: {
      listEvidenceAudit(input) {
        return {
          ok: true,
          source: "evidence-audit",
          evidence: [{
            evidenceId: "lgevd_science_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            programId: input.programId,
            graphNodeIds: ["kg_science_fair_test"],
            sourceType: "daily_evaluation",
            sourceId: "eval_science_1",
            sourceTaskCardId: "ltask_science_1",
            cardRole: "practice",
            scoreBand: "medium",
            status: "observed",
            summary: {
              summaryOnly: true,
              title: "Science fair test",
              feedbackSummary: "Controlled one variable.",
              evaluationId: "eval_science_1",
              rawAnswer: "RAW ANSWER"
            },
            createdAt: "2026-06-15T08:10:00.000Z"
          }, {
            evidenceId: "lgevd_irrelevant",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            programId: input.programId,
            graphNodeIds: ["kg_irrelevant"],
            sourceType: "daily_evaluation",
            sourceId: "eval_irrelevant",
            sourceTaskCardId: "ltask_irrelevant",
            cardRole: "practice",
            scoreBand: "low",
            status: "observed",
            summary: {
              summaryOnly: true,
              title: "Irrelevant",
              feedbackSummary: "Should be filtered out.",
              evaluationId: "eval_irrelevant"
            },
            createdAt: "2026-06-15T08:15:00.000Z"
          }]
        };
      }
    },
    profileDeltaAuditService: {
      listProfileDeltas(input) {
        return {
          ok: true,
          source: "profile-delta-audit",
          profileDeltas: [{
            profileDeltaId: "lgpdelta_science_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            programId: input.programId,
            taskCardId: "ltask_science_1",
            evaluationId: "eval_science_1",
            targetNodeIds: ["kg_science_fair_test"],
            changedCapabilityCount: 1,
            profileStateChanged: true,
            summary: { note: "Fair-test control improved.", rawTranscript: "RAW TRANSCRIPT" },
            createdAt: "2026-06-15T08:11:00.000Z"
          }]
        };
      }
    },
    ownerCorrectionService: {
      listCorrections(input) {
        return {
          ok: true,
          source: "correction-audit",
          corrections: [{
            correctionId: "lgcorr_science_1",
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            programId: input.programId,
            taskCardId: "ltask_science_1",
            evaluationId: "eval_science_1",
            profileDeltaId: "lgpdelta_science_1",
            targetNodeIds: ["kg_science_fair_test"],
            reason: "Owner confirmed the variable-control weakness.",
            rawModelOutput: "RAW MODEL",
            createdAt: "2026-06-15T08:12:00.000Z"
          }]
        };
      }
    },
    auditCompletenessService: {
      evaluateCycleCompleteness(input) {
        completenessCalls.push(input);
        return {
          ok: true,
          complete: true,
          readyForAutomation: true,
          summary: { missingRequired: [] }
        };
      }
    }
  });

  const result = service.listCycleHistory({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    targetNodeIds: ["kg_science_fair_test"],
    limit: 5
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, "growth.learningCycleHistory.v1");
  assert.equal(result.privacyClass, "summary_only");
  assert.equal(result.summary.cycleCount, 1);
  assert.equal(result.summary.completeCount, 1);
  assert.equal(result.cycles[0].cycleId, "ltask_science_1");
  assert.equal(result.cycles[0].selectors.planDraftId, "lgplan_science_1");
  assert.equal(result.cycles[0].selectors.evaluationId, "eval_science_1");
  assert.equal(result.cycles[0].selectors.profileDeltaId, "lgpdelta_science_1");
  assert.equal(result.cycles[0].selectors.evidenceId, "lgevd_science_1");
  assert.equal(result.cycles[0].selectors.correctionId, "lgcorr_science_1");
  assert.deepEqual(result.cycles[0].selectors.targetNodeIds, ["kg_science_fair_test"]);
  assert.equal(result.cycles[0].counts.planDrafts, 1);
  assert.equal(result.cycles[0].counts.evidence, 1);
  assert.equal(result.cycles[0].counts.profileDeltas, 1);
  assert.equal(result.cycles[0].counts.corrections, 1);
  assert.equal(result.cycles[0].completeness.readyForAutomation, true);
  assert.equal(result.cycles[0].latestActivityAt, "2026-06-15T08:12:00.000Z");
  assert.equal(JSON.stringify(result).includes("RAW"), false);
  assert.equal(completenessCalls.length, 1);
  assert.equal(completenessCalls[0].taskCardId, "ltask_science_1");
  assert.equal(completenessCalls[0].evaluationId, "eval_science_1");
});

test("learning cycle history service returns bounded partial history when one dependency is missing", () => {
  const service = createLearningCycleHistoryService({
    planAuditService: {
      listPlanDrafts() {
        return { ok: false, available: false, error: "plan_down" };
      }
    },
    evidenceAuditService: {
      listEvidenceAudit() {
        return {
          ok: true,
          evidence: [{
            evidenceId: "lgevd_only",
            sourceType: "daily_evaluation",
            sourceId: "eval_only",
            sourceTaskCardId: "ltask_only",
            summary: { summaryOnly: true, feedbackSummary: "Evidence only." },
            createdAt: "2026-06-15T08:10:00.000Z"
          }]
        };
      }
    }
  });

  const result = service.listCycleHistory({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    includeCompleteness: false
  });

  assert.equal(result.ok, true);
  assert.equal(result.summary.cycleCount, 1);
  assert.equal(result.summary.partialFailureCount, 3);
  assert.deepEqual(result.partialFailures, [
    "plan_down",
    "learning_cycle_history_profile_delta_service_unavailable",
    "learning_cycle_history_correction_service_unavailable"
  ]);
  assert.equal(result.cycles[0].cycleId, "ltask_only");
  assert.equal(result.cycles[0].completeness.available, false);
});

test("learning cycle history service fails closed for privacy-risk input and unavailable dependencies", () => {
  const privacyResult = createLearningCycleHistoryService({}).listCycleHistory({
    workspaceId: "weixin_fanfan",
    rawPrompt: "do not store"
  });
  assert.equal(privacyResult.ok, false);
  assert.equal(privacyResult.error, "learning_cycle_history_privacy_failed");
  assert.deepEqual(privacyResult.privacyFindings, ["$.rawPrompt"]);

  const unavailableResult = createLearningCycleHistoryService({}).listCycleHistory({
    workspaceId: "weixin_fanfan"
  });
  assert.equal(unavailableResult.ok, false);
  assert.equal(unavailableResult.error, "learning_cycle_history_unavailable");
});
