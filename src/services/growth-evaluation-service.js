"use strict";

const crypto = require("node:crypto");

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
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
  const passed = score >= 80 && enoughDetail;
  const revisionRequirements = [];
  if (!enoughDetail) revisionRequirements.push("Add more concrete evidence before final completion.");
  if (!hasStructure) revisionRequirements.push("Split the answer into at least two clear parts.");
  if (!hasReflection) revisionRequirements.push("Add one sentence about what changed, why, or what to do next.");
  if (!revisionRequirements.length && !passed) revisionRequirements.push("Make the answer more specific before completion.");
  return {
    evaluationId: `lgeval_${sha256Hex(`${input.submissionId}:${text}`).slice(0, 18)}`,
    status: passed ? "completed" : "needs_revision",
    score,
    maxScore: 100,
    passed,
    confidence: 0.76,
    summary: passed
      ? `Submission evaluated for "${title || "Growth task"}" and passed with sufficient detail.`
      : `Submission evaluated for "${title || "Growth task"}" and needs revision before completion.`,
    revisionRequirements,
    remainingWeaknesses: passed ? [] : revisionRequirements.slice(0, 4),
    feedbackSections: {
      strengths: [
        wordCount ? "A learner submission was recorded." : "",
        instruction ? "The task instruction was available for alignment." : ""
      ].filter(Boolean),
      focusAreas: revisionRequirements,
      reflectionPrompts: ["What changed in your answer, and what will you check next time?"],
      nextPractice: passed ? "Use the same repair habit in the next task." : "Revise and resubmit with more concrete evidence."
    },
    evidenceRefs: ["growth-plugin-deterministic-evaluator:v1"],
    reward: {
      eligible: passed,
      currency: "growth_coin",
      reason: passed ? "growth_coin_reward_eligible" : "revision_required_before_reward"
    }
  };
}

function createGrowthEvaluationService(options = {}) {
  const learningStore = options.learningStore;
  const eventService = options.eventService || null;
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
      const recorded = learningStore.recordEvaluation({
        submission: context.submission,
        taskCard: context.taskCard,
        submissionId: claimed.submissionId,
        workspaceId: claimed.workspaceId,
        evaluation: Object.assign({}, evaluation, { evaluatedAt: now().toISOString() })
      });
      if (!recorded?.ok) throw new Error(recorded?.error || "growth_evaluation_record_failed");
      const rewardSettlement = typeof learningStore.settleEvaluationReward === "function"
        ? learningStore.settleEvaluationReward({
          evaluation: recorded.evaluation,
          submission: context.submission,
          taskCard: context.taskCard,
          workspaceId: claimed.workspaceId,
          settledAt: now().toISOString()
        })
        : { ok: false, available: false, error: "growth_reward_settlement_unavailable" };
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
        reward_settlement: rewardSettlement,
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
  const passed = Boolean(evaluation.passed);
  const common = {
    workspaceId: input.workspaceId,
    taskCardId: input.taskCardId,
    source: "growth-plugin-evaluation",
    occurredAt: input.occurredAt
  };
  const events = passed ? ["growth.card.completed", "growth.mastery.updated"] : ["growth.review.required"];
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
