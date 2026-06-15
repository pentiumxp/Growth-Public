"use strict";

const crypto = require("node:crypto");

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

function words(text) {
  return String(text || "").match(/[A-Za-z]+(?:'[A-Za-z]+)?|[\u3400-\u9fff]/g) || [];
}

function clampScore(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function textFromSubmissionRaw(raw = {}) {
  return cleanString(raw.text || raw.submission || raw.comment || raw.raw?.text);
}

function deterministicEvaluate(input = {}) {
  const text = cleanString(input.text);
  const taskCard = input.taskCard || {};
  const taskRaw = input.taskRaw || {};
  const wordCount = words(text).length;
  const lineCount = Math.max(1, String(text || "").split(/\r?\n|[;；。.!?]/).map(cleanString).filter(Boolean).length);
  const title = cleanString(taskCard.title);
  const instruction = cleanString(taskRaw.instructionPreview || taskRaw.instruction || taskRaw.summary || taskCard.title);
  const enoughDetail = wordCount >= 35 || text.length >= 180;
  const hasReflection = /\b(because|so|then|next|improve|change|fix|learn|finally)\b/i.test(text) || /因为|所以|下次|改进|修正|学习/.test(text);
  const hasStructure = lineCount >= 2;
  const score = clampScore(45 + Math.min(25, wordCount) + (hasReflection ? 15 : 0) + (hasStructure ? 10 : 0));
  const focusAreas = [];
  if (!enoughDetail) focusAreas.push("Add more concrete evidence next time.");
  if (!hasStructure) focusAreas.push("Use two clear parts next time.");
  if (!hasReflection) focusAreas.push("Add one sentence about what changed, why, or what to do next time.");
  if (!focusAreas.length) focusAreas.push("Keep the same clear evidence habit in the next task.");
  return {
    evaluationId: `lgeval_${sha256Hex(`${input.submissionId}:${text}`).slice(0, 18)}`,
    status: "completed",
    score,
    maxScore: 100,
    passed: true,
    confidence: 0.76,
    summary: `Submission evaluated once for "${title || "Growth task"}". Score ${score}.`,
    revisionRequirements: [],
    remainingWeaknesses: focusAreas.slice(0, 4),
    feedbackSections: {
      strengths: [
        wordCount ? "A learner submission was recorded." : "",
        instruction ? "The task instruction was available for alignment." : ""
      ].filter(Boolean),
      focusAreas,
      reflectionPrompts: ["Optional: what changed in your answer, and what will you check next time?"],
      nextPractice: "Use this score as feedback for the next daily card. No resubmission is required."
    },
    evidenceRefs: ["growth-plugin-deterministic-evaluator:v1"],
    reward: {
      eligible: true,
      currency: "growth_coin",
      reason: "daily_score_once_reward_eligible"
    }
  };
}

function createGrowthEvaluationService(options = {}) {
  const learningStore = options.learningStore;
  const eventService = options.eventService || null;
  const evidenceLedgerService = options.evidenceLedgerService || null;
  const profileService = options.profileService || null;
  const profileDeltaService = options.profileDeltaService || null;
  const nextCardStrategyService = options.nextCardStrategyService || null;
  const stageAssessmentService = options.stageAssessmentService || null;
  const trajectoryService = options.trajectoryService || null;
  const evaluator = typeof options.evaluator === "function" ? options.evaluator : deterministicEvaluate;
  const now = typeof options.now === "function" ? options.now : () => new Date();
  const workerId = cleanString(options.workerId) || `growth-plugin-evaluator-${process.pid}`;
  const leaseMs = Math.max(1000, Number(options.leaseMs || 10 * 60 * 1000) || 10 * 60 * 1000);
  const retryDelayMs = Math.max(1000, Number(options.retryDelayMs || 60 * 1000) || 60 * 1000);
  const maxAttempts = Math.max(1, Number(options.maxAttempts || 3) || 3);

  async function processEvaluationJob(job = {}) {
    if (!learningStore || typeof learningStore.claimEvaluationJob !== "function") {
      return { ok: false, error: "growth_learning_store_unavailable" };
    }
    const nowDate = now();
    const claimed = learningStore.claimEvaluationJob(job.jobId, {
      leaseOwner: workerId,
      leaseUntil: new Date(nowDate.getTime() + leaseMs).toISOString(),
      now: nowDate.toISOString()
    });
    if (!claimed) return null;
    try {
      const context = learningStore.evaluationJobContext({ jobId: claimed.jobId });
      if (!context) throw new Error("growth_evaluation_context_missing");
      const text = textFromSubmissionRaw(context.submissionRaw);
      if (!text && !context.submissionRaw.audio) throw new Error("growth_evaluation_evidence_missing");
      const evaluation = await evaluator({
        job: claimed,
        submission: context.submission,
        taskCard: context.taskCard,
        taskRaw: context.taskRaw,
        text,
        submissionId: claimed.submissionId,
        workspaceId: claimed.workspaceId
      });
      const evaluatedAt = now().toISOString();
      const recorded = learningStore.recordEvaluation({
        submission: context.submission,
        taskCard: context.taskCard,
        submissionId: claimed.submissionId,
        workspaceId: claimed.workspaceId,
        evaluatedAt,
        evaluation: Object.assign({}, evaluation, { evaluatedAt })
      });
      if (!recorded?.ok) throw new Error(recorded?.error || "growth_evaluation_record_failed");
      const profileDeltaContext = profileDeltaScope({
        claimed,
        context,
        evaluation: recorded.evaluation
      });
      const rewardSettlement = typeof learningStore.settleEvaluationReward === "function"
        ? learningStore.settleEvaluationReward({
          evaluation: recorded.evaluation,
          submission: context.submission,
          taskCard: context.taskCard,
          workspaceId: claimed.workspaceId,
          settledAt: now().toISOString()
        })
        : { ok: false, available: false, error: "growth_reward_settlement_unavailable" };
      const profileDeltaBefore = snapshotProfileDelta({
        profileDeltaService,
        phase: "before",
        scope: profileDeltaContext
      });
      const profileUpdate = recordProfileUpdate({
        profileService,
        taskCard: context.taskCard,
        submission: context.submission,
        evaluation: recorded.evaluation,
        workspaceId: claimed.workspaceId
      });
      const evidenceLedger = recordEvidenceLedger({
        evidenceLedgerService,
        taskCard: context.taskCard,
        submission: context.submission,
        evaluation: recorded.evaluation,
        profileUpdate,
        workspaceId: claimed.workspaceId
      });
      const profileDelta = recordProfileDelta({
        profileDeltaService,
        beforeProfileSnapshot: profileDeltaBefore,
        scope: Object.assign({}, profileDeltaContext, {
          targetNodeIds: uniqueStrings(profileDeltaContext.targetNodeIds.concat(profileUpdate.targetNodeIds || []))
        }),
        taskCard: context.taskCard,
        submission: context.submission,
        evaluation: recorded.evaluation,
        evidenceLedger
      });
      const nextCardStrategy = chooseNextCardStrategy({
        nextCardStrategyService,
        profileUpdate
      });
      const trajectory = recordTrajectory({
        trajectoryService,
        taskCard: context.taskCard,
        submission: context.submission,
        evaluation: recorded.evaluation,
        profileUpdate,
        nextCardStrategy,
        workspaceId: claimed.workspaceId
      });
      const stageAssessmentCycle = recordStageAssessmentCompletion({
        stageAssessmentService,
        taskCard: context.taskCard,
        evaluation: recorded.evaluation,
        workspaceId: claimed.workspaceId
      });
      const emittedEvents = await emitEvaluationEvents({
        eventService,
        evaluation: recorded.evaluation,
        rewardSettlement,
        taskCard: context.taskCard,
        workspaceId: claimed.workspaceId,
        taskCardId: claimed.taskCardId,
        submissionId: claimed.submissionId,
        occurredAt: now().toISOString()
      });
      const completed = learningStore.completeEvaluationJob(claimed.jobId, { completedAt: now().toISOString() });
      return {
        ok: true,
        job: completed,
        evaluation: recorded.evaluation,
        evidence_ledger: evidenceLedger,
        reward_settlement: rewardSettlement,
        profile_update: profileUpdate,
        profile_delta: profileDelta,
        next_card_strategy: nextCardStrategy,
        stage_assessment_cycle: stageAssessmentCycle,
        trajectory,
        events: emittedEvents,
        workspace_id: claimed.workspaceId,
        task_card_id: claimed.taskCardId,
        submission_id: claimed.submissionId,
        source: "growth-plugin-sqlite"
      };
    } catch (err) {
      const terminal = Number(claimed.attemptCount || 0) >= maxAttempts;
      const availableAt = new Date(now().getTime() + (terminal ? 0 : retryDelayMs * Math.max(1, Number(claimed.attemptCount || 1)))).toISOString();
      const failed = learningStore.failEvaluationJob(claimed.jobId, {
        status: terminal ? "failed" : "retry",
        error: cleanString(err.message || err),
        availableAt,
        now: now().toISOString()
      });
      return { ok: false, status: terminal ? 500 : 503, error: cleanString(err.message || err), job: failed };
    }
  }

  async function processEvaluationQueue(input = {}) {
    if (!learningStore || typeof learningStore.listEvaluationJobs !== "function") {
      return { ok: true, available: false, processed: 0, results: [] };
    }
    const nowText = now().toISOString();
    const jobs = learningStore.listEvaluationJobs({
      status: ["pending", "retry", "processing"],
      workspaceId: input.workspaceId,
      availableBefore: nowText,
      limit: input.limit || 10
    }).filter((job) => job.status !== "processing" || !job.leaseUntil || job.leaseUntil <= nowText);
    let processed = 0;
    const results = [];
    for (const job of jobs) {
      const result = await processEvaluationJob(job);
      if (result) {
        processed += 1;
        results.push({ jobId: job.jobId, ok: result.ok !== false, status: result.evaluation?.status || result.job?.status || "" });
      }
    }
    return { ok: true, processed, results };
  }

  return {
    deterministicEvaluate,
    processEvaluationJob,
    processEvaluationQueue
  };
}

function nodeIdsFromEvaluationContext(input = {}) {
  const context = input.context || {};
  const taskCard = context.taskCard || {};
  const taskRaw = context.taskRaw || {};
  const raw = Object.assign(
    {},
    parseJson(taskCard.raw_json, {}),
    parseJson(taskCard.rawJson, {}),
    taskRaw
  );
  return uniqueStrings(
    asArray(taskRaw.learningGraph?.targetNodeIds)
      .concat(taskRaw.learningGraph?.assessmentCoverageNodeIds || [])
      .concat(taskRaw.learning_graph?.target_node_ids || [])
      .concat(taskRaw.learning_graph?.assessment_coverage_node_ids || [])
      .concat(raw.learningGraph?.targetNodeIds || [])
      .concat(raw.learningGraph?.assessmentCoverageNodeIds || [])
      .concat(raw.learning_graph?.target_node_ids || [])
      .concat(raw.learning_graph?.assessment_coverage_node_ids || [])
      .concat(raw.targetNodeIds || [])
      .concat(raw.assessmentCoverageNodeIds || [])
      .concat(parseJson(taskCard.skill_ids_json, []))
      .concat(parseJson(taskCard.assessment_coverage_json, []))
      .concat(asArray(input.evaluation?.skillResults).map((item) => item.nodeId || item.graphNodeId))
      .concat(taskCard.capability_cluster_id)
  ).slice(0, 40);
}

function profileDeltaScope(input = {}) {
  const context = input.context || {};
  const submission = context.submission || {};
  const taskCard = context.taskCard || {};
  const claimed = input.claimed || {};
  const workspaceId = cleanString(
    claimed.workspaceId
      || taskCard.workspace_id
      || taskCard.workspaceId
      || submission.workspace_id
      || submission.workspaceId
  );
  const learnerId = cleanString(
    taskCard.learner_id
      || taskCard.learnerId
      || submission.learner_id
      || submission.learnerId
      || workspaceId
  );
  return {
    workspaceId,
    learnerId,
    programId: cleanString(taskCard.program_id || taskCard.programId || submission.program_id || submission.programId),
    targetNodeIds: nodeIdsFromEvaluationContext({
      context,
      evaluation: input.evaluation
    }),
    taskCardId: cleanString(claimed.taskCardId || taskCard.id),
    submissionId: cleanString(claimed.submissionId || submission.id),
    evaluationId: cleanString(input.evaluation?.evaluationId || input.evaluation?.id)
  };
}

function snapshotProfileDelta(input = {}) {
  const service = input.profileDeltaService;
  if (!service || typeof service.snapshot !== "function") return null;
  const scope = input.scope || {};
  try {
    return service.snapshot({
      phase: input.phase,
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      programId: scope.programId,
      targetNodeIds: scope.targetNodeIds
    });
  } catch (err) {
    return {
      ok: false,
      available: false,
      phase: cleanString(input.phase),
      error: cleanString(err.message || err) || "profile_delta_snapshot_failed"
    };
  }
}

function recordProfileDelta(input = {}) {
  const service = input.profileDeltaService;
  if (!service || typeof service.recordEvaluationProfileDelta !== "function") {
    return { ok: true, available: false, skipped: true, reason: "profile_delta_service_unavailable" };
  }
  const scope = input.scope || {};
  try {
    return service.recordEvaluationProfileDelta({
      beforeProfileSnapshot: input.beforeProfileSnapshot,
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      programId: scope.programId,
      targetNodeIds: scope.targetNodeIds,
      taskCard: input.taskCard,
      submission: input.submission,
      evaluation: input.evaluation,
      evidenceLedger: input.evidenceLedger,
      taskCardId: scope.taskCardId,
      submissionId: scope.submissionId,
      evaluationId: scope.evaluationId
    });
  } catch (err) {
    return { ok: false, available: true, error: cleanString(err.message || err) || "profile_delta_record_failed" };
  }
}

function recordStageAssessmentCompletion(input = {}) {
  const service = input.stageAssessmentService;
  if (!service || typeof service.recordAssessmentCompletion !== "function") {
    return { ok: true, available: false, skipped: true, reason: "stage_assessment_service_unavailable" };
  }
  try {
    return service.recordAssessmentCompletion({
      taskCard: input.taskCard,
      evaluation: input.evaluation,
      workspaceId: input.workspaceId
    });
  } catch (err) {
    return { ok: false, error: cleanString(err.message || err) || "stage_assessment_completion_failed" };
  }
}

function recordProfileUpdate(input = {}) {
  const service = input.profileService;
  if (!service || typeof service.recordEvaluationEvidence !== "function") {
    return { ok: false, available: false, error: "mastery_profile_service_unavailable" };
  }
  try {
    return service.recordEvaluationEvidence({
      taskCard: input.taskCard,
      submission: input.submission,
      evaluation: input.evaluation,
      workspaceId: input.workspaceId
    });
  } catch (err) {
    return { ok: false, error: cleanString(err.message || err) || "mastery_profile_update_failed" };
  }
}

function recordEvidenceLedger(input = {}) {
  const service = input.evidenceLedgerService;
  if (!service || typeof service.recordEvaluationEvidence !== "function") {
    return { ok: false, available: false, error: "learning_evidence_ledger_service_unavailable" };
  }
  try {
    return service.recordEvaluationEvidence({
      taskCard: input.taskCard,
      submission: input.submission,
      evaluation: input.evaluation,
      profileUpdate: input.profileUpdate,
      workspaceId: input.workspaceId
    });
  } catch (err) {
    return { ok: false, error: cleanString(err.message || err) || "learning_evidence_ledger_record_failed" };
  }
}

function chooseNextCardStrategy(input = {}) {
  const service = input.nextCardStrategyService;
  if (!service || typeof service.chooseNextCardStrategy !== "function") {
    return { ok: false, available: false, error: "next_card_strategy_service_unavailable" };
  }
  const profileUpdate = input.profileUpdate || {};
  try {
    return service.chooseNextCardStrategy({
      masterySummary: profileUpdate.masterySummary || {},
      recentExperienceSignals: profileUpdate.recentExperienceSignals || profileUpdate.experienceSignals || [],
      recentTrajectory: profileUpdate.recentTrajectory || [],
      targetNodeIds: profileUpdate.targetNodeIds || []
    });
  } catch (err) {
    return { ok: false, error: cleanString(err.message || err) || "next_card_strategy_failed" };
  }
}

function recordTrajectory(input = {}) {
  const service = input.trajectoryService;
  if (!service || typeof service.recordEvaluationTrajectory !== "function") {
    return { ok: false, available: false, error: "card_trajectory_service_unavailable" };
  }
  try {
    return service.recordEvaluationTrajectory({
      taskCard: input.taskCard,
      submission: input.submission,
      evaluation: input.evaluation,
      profileUpdate: input.profileUpdate,
      nextRecommendation: input.nextCardStrategy,
      workspaceId: input.workspaceId
    });
  } catch (err) {
    return { ok: false, error: cleanString(err.message || err) || "card_trajectory_record_failed" };
  }
}

function eventSummary(input = {}) {
  const title = cleanString(input.taskCard?.title) || "Growth task";
  const score = Number(input.evaluation?.score || 0);
  if (input.type === "growth.review.required") {
    return `Growth task "${title}" needs revision after evaluation. Score ${score}.`;
  }
  if (input.type === "growth.mastery.updated") {
    return `Growth mastery evidence updated from "${title}". Score ${score}.`;
  }
  return `Growth task "${title}" completed. Score ${score}.`;
}

async function emitEvaluationEvents(input = {}) {
  const eventService = input.eventService;
  if (!eventService || typeof eventService.emit !== "function") {
    return { ok: false, available: false, emitted: 0, error: "growth_event_service_unavailable" };
  }
  const evaluation = input.evaluation || {};
  const status = cleanString(evaluation.status).toLowerCase();
  const completed = Boolean(evaluation.passed) || ["completed", "complete", "scored"].includes(status);
  const common = {
    workspaceId: input.workspaceId,
    taskCardId: input.taskCardId,
    source: "growth-plugin-evaluation",
    occurredAt: input.occurredAt
  };
  const events = completed ? ["growth.card.completed", "growth.mastery.updated"] : ["growth.review.required"];
  const results = [];
  for (const type of events) {
    const result = await eventService.emit(Object.assign({}, common, {
      eventId: [
        type,
        input.workspaceId,
        input.taskCardId,
        input.submissionId,
        evaluation.evaluationId || ""
      ].filter(Boolean).join(":"),
      type,
      status: evaluation.status,
      summary: eventSummary({ type, evaluation, taskCard: input.taskCard })
    }));
    results.push({ type, ok: result?.ok !== false, error: result?.error || "" });
  }
  return { ok: results.every((item) => item.ok), emitted: results.length, results };
}

module.exports = {
  createGrowthEvaluationService,
  deterministicEvaluate
};
