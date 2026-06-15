const assert = require("node:assert/strict");
const test = require("node:test");

const { createGrowthEvaluationService } = require("../src/services/growth-evaluation-service");

test("evaluation service records profile, strategy, and trajectory after evaluation", async () => {
  const calls = [];
  const job = {
    jobId: "job_1",
    submissionId: "submission_1",
    taskCardId: "ltask_1",
    workspaceId: "weixin_stephen",
    attemptCount: 1,
    status: "pending"
  };
  const learningStore = {
    claimEvaluationJob() {
      calls.push("claim");
      return Object.assign({}, job, { status: "processing" });
    },
    evaluationJobContext() {
      calls.push("context");
      return {
        submission: {
          id: "submission_1",
          task_card_id: "ltask_1",
          learner_id: "weixin_stephen",
          workspace_id: "weixin_stephen",
          program_id: "program_english"
        },
        taskCard: {
          id: "ltask_1",
          learner_id: "weixin_stephen",
          workspace_id: "weixin_stephen",
          program_id: "program_english",
          title: "Use text evidence",
          raw_json: JSON.stringify({ learningGraph: { targetNodeIds: ["kg_english_evidence_answering"] } })
        },
        taskRaw: { learningGraph: { targetNodeIds: ["kg_english_evidence_answering"] } },
        submissionRaw: { text: "I used a reason because the text says so." }
      };
    },
    recordEvaluation() {
      calls.push("recordEvaluation");
      return {
        ok: true,
        evaluation: {
          evaluationId: "eval_1",
          status: "completed",
          score: 64,
          passed: false,
          confidence: 0.72,
          summary: "Reason is present, but evidence is vague.",
          remainingWeaknesses: ["Quote exact evidence."]
        }
      };
    },
    settleEvaluationReward() {
      calls.push("reward");
      return { ok: true, settlement: { coinAmount: 64 } };
    },
    completeEvaluationJob() {
      calls.push("complete");
      return Object.assign({}, job, { status: "done" });
    }
  };
  const profileService = {
    recordEvaluationEvidence(input) {
      calls.push("profile");
      assert.equal(input.evaluation.evaluationId, "eval_1");
      return {
        ok: true,
        targetNodeIds: ["kg_english_evidence_answering"],
        masterySummary: {
          masteryStates: [{ nodeId: "kg_english_evidence_answering", status: "developing", score: 64, confidence: 0.72 }]
        },
        masteryChanges: [{ nodeId: "kg_english_evidence_answering", from: "new", to: "developing" }],
        experienceSignals: [{ signalType: "not_learned", targetNodeId: "kg_english_evidence_answering" }]
      };
    }
  };
  const nextCardStrategyService = {
    chooseNextCardStrategy(input) {
      calls.push("strategy");
      assert.equal(input.masterySummary.masteryStates[0].nodeId, "kg_english_evidence_answering");
      return {
        ok: true,
        strategy: "stabilize",
        targetNodeIds: ["kg_english_evidence_answering"],
        difficultyBand: "foundation",
        cardRole: "practice",
        reason: "Needs another focused evidence practice."
      };
    }
  };
  const trajectoryService = {
    recordEvaluationTrajectory(input) {
      calls.push("trajectory");
      assert.equal(input.nextRecommendation.strategy, "stabilize");
      return { ok: true, trajectory: { taskCardId: "ltask_1", strategy: "stabilize" } };
    }
  };
  const evidenceLedgerService = {
    recordEvaluationEvidence(input) {
      calls.push("ledger");
      assert.equal(input.evaluation.evaluationId, "eval_1");
      assert.equal(input.profileUpdate.targetNodeIds[0], "kg_english_evidence_answering");
      return {
        ok: true,
        evidenceCount: 1,
        entries: [{ evidenceId: "lgevd_eval_1", graphNodeId: "kg_english_evidence_answering" }]
      };
    }
  };
  const service = createGrowthEvaluationService({
    learningStore,
    evidenceLedgerService,
    profileService,
    nextCardStrategyService,
    trajectoryService,
    eventService: { emit: async () => ({ ok: true }) },
    now: () => new Date("2026-06-14T07:00:00.000Z")
  });

  const result = await service.processEvaluationJob(job);

  assert.equal(result.ok, true);
  assert.equal(result.profile_update.ok, true);
  assert.equal(result.evidence_ledger.ok, true);
  assert.equal(result.evidence_ledger.evidenceCount, 1);
  assert.equal(result.next_card_strategy.strategy, "stabilize");
  assert.equal(result.trajectory.ok, true);
  assert.deepEqual(calls, ["claim", "context", "recordEvaluation", "reward", "profile", "ledger", "strategy", "trajectory", "complete"]);
});

test("evaluation service uses injected Gateway evaluator before recording", async () => {
  const calls = [];
  const job = {
    jobId: "job_gateway",
    submissionId: "submission_gateway",
    taskCardId: "ltask_gateway",
    workspaceId: "weixin_stephen",
    attemptCount: 1,
    status: "pending"
  };
  const learningStore = {
    claimEvaluationJob() {
      calls.push("claim");
      return Object.assign({}, job, { status: "processing" });
    },
    evaluationJobContext() {
      calls.push("context");
      return {
        submission: {
          id: "submission_gateway",
          task_card_id: "ltask_gateway",
          learner_id: "weixin_stephen",
          workspace_id: "weixin_stephen"
        },
        taskCard: {
          id: "ltask_gateway",
          title: "Daily evidence card",
          learner_id: "weixin_stephen",
          workspace_id: "weixin_stephen",
          raw_json: JSON.stringify({ learningGraph: { targetNodeIds: ["kg_english_evidence_answering"] } })
        },
        taskRaw: { learningGraph: { targetNodeIds: ["kg_english_evidence_answering"] } },
        submissionRaw: { text: "The answer has one reason because the text gives a clue." }
      };
    },
    recordEvaluation(input) {
      calls.push("recordEvaluation");
      assert.equal(input.evaluation.evaluationId, "eval_gateway");
      assert.equal(input.evaluation.summary, "Gateway scored the answer once.");
      return { ok: true, evaluation: input.evaluation };
    },
    settleEvaluationReward() {
      calls.push("reward");
      return { ok: true, settlement: { coinAmount: 82 } };
    },
    completeEvaluationJob() {
      calls.push("complete");
      return Object.assign({}, job, { status: "done" });
    }
  };
  const service = createGrowthEvaluationService({
    learningStore,
    eventService: { emit: async () => ({ ok: true }) },
    evaluator(input) {
      calls.push("gatewayEvaluator");
      assert.equal(input.text, "The answer has one reason because the text gives a clue.");
      assert.equal(input.taskRaw.learningGraph.targetNodeIds[0], "kg_english_evidence_answering");
      return {
        evaluationId: "eval_gateway",
        status: "completed",
        score: 82,
        maxScore: 100,
        passed: true,
        confidence: 0.86,
        summary: "Gateway scored the answer once.",
        remainingWeaknesses: [],
        feedbackSections: { strengths: ["Reason is present."] },
        skillResults: [{ nodeId: "kg_english_evidence_answering", score: 82, confidence: 0.86 }]
      };
    },
    now: () => new Date("2026-06-14T08:20:00.000Z")
  });

  const result = await service.processEvaluationJob(job);

  assert.equal(result.ok, true);
  assert.equal(result.evaluation.evaluationId, "eval_gateway");
  assert.deepEqual(calls, ["claim", "context", "gatewayEvaluator", "recordEvaluation", "reward", "complete"]);
});

test("evaluation service returns bounded profile delta after ledger update", async () => {
  const calls = [];
  const job = {
    jobId: "job_delta",
    submissionId: "submission_delta",
    taskCardId: "ltask_delta",
    workspaceId: "weixin_stephen",
    attemptCount: 1,
    status: "pending"
  };
  const learningStore = {
    claimEvaluationJob() {
      calls.push("claim");
      return Object.assign({}, job, { status: "processing" });
    },
    evaluationJobContext() {
      calls.push("context");
      return {
        submission: {
          id: "submission_delta",
          task_card_id: "ltask_delta",
          learner_id: "fanfan",
          workspace_id: "weixin_stephen",
          program_id: "program_science"
        },
        taskCard: {
          id: "ltask_delta",
          learner_id: "fanfan",
          workspace_id: "weixin_stephen",
          program_id: "program_science",
          title: "Science fair test",
          raw_json: JSON.stringify({ learningGraph: { targetNodeIds: ["kg_science_fair_test"] } })
        },
        taskRaw: { learningGraph: { targetNodeIds: ["kg_science_fair_test"] } },
        submissionRaw: { text: "I measured plant height because that shows what changed." }
      };
    },
    recordEvaluation() {
      calls.push("recordEvaluation");
      return {
        ok: true,
        evaluation: {
          evaluationId: "eval_delta",
          status: "completed",
          score: 72,
          passed: true,
          confidence: 0.82,
          summary: "Measured result was present."
        }
      };
    },
    settleEvaluationReward() {
      calls.push("reward");
      return { ok: true, settlement: { coinAmount: 72 } };
    },
    completeEvaluationJob() {
      calls.push("complete");
      return Object.assign({}, job, { status: "done" });
    }
  };
  const profileDeltaService = {
    snapshot(input) {
      calls.push(`profileDelta:${input.phase}`);
      assert.equal(input.workspaceId, "weixin_stephen");
      assert.equal(input.learnerId, "fanfan");
      assert.deepEqual(input.targetNodeIds, ["kg_science_fair_test"]);
      return {
        ok: true,
        available: true,
        phase: input.phase,
        capabilityStates: [],
        summary: { evidenceCount: 0 },
        recommendedPlannerHints: { strategy: "stabilize" }
      };
    },
    recordEvaluationProfileDelta(input) {
      calls.push("profileDelta:record");
      assert.equal(input.beforeProfileSnapshot.phase, "before");
      assert.equal(input.evidenceLedger.entries[0].evidenceId, "evidence_eval_delta");
      assert.deepEqual(input.targetNodeIds, ["kg_science_fair_test"]);
      return {
        ok: true,
        available: true,
        profileDeltaId: "profile_delta_eval_delta",
        privacyClass: "summary_only",
        summary: { changedCapabilityCount: 1 },
        changedCapabilities: [{ nodeId: "kg_science_fair_test", evidenceCountDelta: 1 }]
      };
    }
  };
  const service = createGrowthEvaluationService({
    learningStore,
    profileDeltaService,
    profileService: {
      recordEvaluationEvidence() {
        calls.push("profile");
        return { ok: true, targetNodeIds: ["kg_science_fair_test"], masterySummary: { masteryStates: [] } };
      }
    },
    evidenceLedgerService: {
      recordEvaluationEvidence() {
        calls.push("ledger");
        return { ok: true, evidenceCount: 1, entries: [{ evidenceId: "evidence_eval_delta", graphNodeId: "kg_science_fair_test" }] };
      }
    },
    nextCardStrategyService: { chooseNextCardStrategy: () => ({ ok: true, strategy: "stabilize" }) },
    trajectoryService: { recordEvaluationTrajectory: () => ({ ok: true }) },
    eventService: { emit: async () => ({ ok: true }) },
    now: () => new Date("2026-06-15T08:00:00.000Z")
  });

  const result = await service.processEvaluationJob(job);

  assert.equal(result.ok, true);
  assert.equal(result.profile_delta.ok, true);
  assert.equal(result.profile_delta.profileDeltaId, "profile_delta_eval_delta");
  assert.deepEqual(calls, [
    "claim",
    "context",
    "recordEvaluation",
    "reward",
    "profileDelta:before",
    "profile",
    "ledger",
    "profileDelta:record",
    "complete"
  ]);
});

test("profile delta failure is visible and non-fatal for evaluation completion", async () => {
  const calls = [];
  const job = {
    jobId: "job_delta_failure",
    submissionId: "submission_delta_failure",
    taskCardId: "ltask_delta_failure",
    workspaceId: "weixin_stephen",
    attemptCount: 1,
    status: "pending"
  };
  const learningStore = {
    claimEvaluationJob() {
      calls.push("claim");
      return Object.assign({}, job, { status: "processing" });
    },
    evaluationJobContext() {
      calls.push("context");
      return {
        submission: { id: "submission_delta_failure", learner_id: "fanfan", workspace_id: "weixin_stephen" },
        taskCard: {
          id: "ltask_delta_failure",
          learner_id: "fanfan",
          workspace_id: "weixin_stephen",
          raw_json: JSON.stringify({ learningGraph: { targetNodeIds: ["kg_science_fair_test"] } })
        },
        taskRaw: { learningGraph: { targetNodeIds: ["kg_science_fair_test"] } },
        submissionRaw: { text: "I measured the height and explained the result." }
      };
    },
    recordEvaluation(input) {
      calls.push("recordEvaluation");
      return { ok: true, evaluation: Object.assign({}, input.evaluation, { evaluationId: "eval_delta_failure" }) };
    },
    settleEvaluationReward() {
      calls.push("reward");
      return { ok: true, settlement: { coinAmount: 70 } };
    },
    completeEvaluationJob() {
      calls.push("complete");
      return Object.assign({}, job, { status: "done" });
    }
  };
  const service = createGrowthEvaluationService({
    learningStore,
    profileDeltaService: {
      snapshot() {
        return { ok: true, available: true, phase: "before", summary: {}, capabilityStates: [] };
      },
      recordEvaluationProfileDelta() {
        calls.push("profileDelta:record");
        throw new Error("profile_delta_projection_failed");
      }
    },
    profileService: {
      recordEvaluationEvidence() {
        calls.push("profile");
        return { ok: true, targetNodeIds: ["kg_science_fair_test"], masterySummary: { masteryStates: [] } };
      }
    },
    evidenceLedgerService: {
      recordEvaluationEvidence() {
        calls.push("ledger");
        return { ok: true, evidenceCount: 1, entries: [{ evidenceId: "evidence_delta_failure" }] };
      }
    },
    eventService: { emit: async () => ({ ok: true }) },
    now: () => new Date("2026-06-15T08:00:00.000Z")
  });

  const result = await service.processEvaluationJob(job);

  assert.equal(result.ok, true);
  assert.equal(result.profile_delta.ok, false);
  assert.equal(result.profile_delta.error, "profile_delta_projection_failed");
  assert.equal(result.job.status, "done");
  assert.deepEqual(calls, ["claim", "context", "recordEvaluation", "reward", "profile", "ledger", "profileDelta:record", "complete"]);
});

test("evaluation service closes stage assessment cycle after formal evaluation", async () => {
  const calls = [];
  const job = {
    jobId: "job_stage",
    submissionId: "submission_stage",
    taskCardId: "stage_card_1",
    workspaceId: "weixin_fanfan",
    attemptCount: 1,
    status: "pending"
  };
  const learningStore = {
    claimEvaluationJob() {
      calls.push("claim");
      return Object.assign({}, job, { status: "processing" });
    },
    evaluationJobContext() {
      calls.push("context");
      return {
        submission: {
          id: "submission_stage",
          task_card_id: "stage_card_1",
          learner_id: "weixin_fanfan",
          workspace_id: "weixin_fanfan",
          program_id: "program_science"
        },
        taskCard: {
          id: "stage_card_1",
          learner_id: "weixin_fanfan",
          workspace_id: "weixin_fanfan",
          program_id: "program_science",
          title: "Science formal checkpoint",
          card_role: "stage_assessment",
          stage_assessment_cycle_id: "cycle_science_1",
          mastery_evidence_weight: 1,
          raw_json: JSON.stringify({
            completionPolicy: { mode: "formal_assessment" },
            learningGraph: { targetNodeIds: ["kg_science_variables"] },
            stageAssessment: { cycleId: "cycle_science_1" }
          })
        },
        taskRaw: { learningGraph: { targetNodeIds: ["kg_science_variables"] } },
        submissionRaw: { text: "I changed one variable and kept the others the same because that makes the comparison fair." }
      };
    },
    recordEvaluation(input) {
      calls.push("recordEvaluation");
      return {
        ok: true,
        evaluation: Object.assign({}, input.evaluation, {
          evaluationId: "eval_stage",
          evaluatedAt: "2026-06-14T10:00:00.000Z"
        })
      };
    },
    settleEvaluationReward() {
      calls.push("reward");
      return { ok: true, settlement: { coinAmount: 260 } };
    },
    completeEvaluationJob() {
      calls.push("complete");
      return Object.assign({}, job, { status: "done" });
    }
  };
  const profileService = {
    recordEvaluationEvidence() {
      calls.push("profile");
      return { ok: true, masterySummary: { masteryStates: [] }, targetNodeIds: ["kg_science_variables"] };
    }
  };
  const stageAssessmentService = {
    recordAssessmentCompletion(input) {
      calls.push("stageAssessment");
      assert.equal(input.taskCard.stage_assessment_cycle_id, "cycle_science_1");
      assert.equal(input.evaluation.evaluationId, "eval_stage");
      return {
        ok: true,
        activationState: "cooldown",
        cooldownUntil: "2026-06-19T10:00:00.000Z",
        cycle: { cycleId: "cycle_science_1", status: "completed" }
      };
    }
  };
  const service = createGrowthEvaluationService({
    learningStore,
    profileService,
    nextCardStrategyService: { chooseNextCardStrategy: () => ({ ok: true, strategy: "stabilize" }) },
    trajectoryService: { recordEvaluationTrajectory: () => ({ ok: true }) },
    stageAssessmentService,
    eventService: { emit: async () => ({ ok: true }) },
    evaluator: () => ({
      evaluationId: "eval_stage",
      status: "completed",
      score: 87,
      maxScore: 100,
      passed: true,
      confidence: 0.91,
      summary: "Formal checkpoint confirms the skill.",
      remainingWeaknesses: [],
      skillResults: [{ nodeId: "kg_science_variables", score: 87, confidence: 0.91 }]
    }),
    now: () => new Date("2026-06-14T10:00:00.000Z")
  });

  const result = await service.processEvaluationJob(job);

  assert.equal(result.ok, true);
  assert.equal(result.stage_assessment_cycle.ok, true);
  assert.equal(result.stage_assessment_cycle.activationState, "cooldown");
  assert.deepEqual(calls, [
    "claim",
    "context",
    "recordEvaluation",
    "reward",
    "profile",
    "stageAssessment",
    "complete"
  ]);
});
