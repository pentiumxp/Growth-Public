"use strict";

const {
  asArray,
  cleanString,
  insertDynamic,
  parseJson,
  tableExists
} = require("./core");
const { stableEvaluationId } = require("./identifiers");
const { publicEvaluation } = require("./projection");

function publicGrowthEvaluationJob(row) {
  if (!row) return null;
  return {
    jobId: row.id,
    submissionId: row.submission_id,
    taskCardId: row.task_card_id,
    learnerId: row.learner_id || "",
    workspaceId: row.workspace_id,
    status: row.status,
    attemptCount: Number(row.attempt_count || 0),
    leaseOwner: row.lease_owner || "",
    leaseUntil: row.lease_until || "",
    lastError: row.last_error || "",
    availableAt: row.available_at || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
    completedAt: row.completed_at || "",
    raw: parseJson(row.raw_json, {}) || {}
  };
}

function createEvaluationJobRepository({ open }) {
  function getGrowthEvaluationJob(db, jobId) {
    if (!tableExists(db, "learning_growth_evaluation_jobs")) return null;
    return publicGrowthEvaluationJob(db.prepare("SELECT * FROM learning_growth_evaluation_jobs WHERE id = ?").get(cleanString(jobId)));
  }

  function listEvaluationJobs(filters = {}) {
    const db = open(true);
    try {
      if (!tableExists(db, "learning_growth_evaluation_jobs")) return [];
      const values = [];
      const where = [];
      const statuses = Array.isArray(filters.status)
        ? filters.status.map(cleanString).filter(Boolean)
        : [cleanString(filters.status)].filter(Boolean);
      if (statuses.length === 1) {
        where.push("status = ?");
        values.push(statuses[0]);
      } else if (statuses.length > 1) {
        where.push(`status IN (${statuses.map(() => "?").join(", ")})`);
        values.push(...statuses);
      }
      if (filters.workspaceId) {
        where.push("workspace_id = ?");
        values.push(cleanString(filters.workspaceId));
      }
      if (filters.availableBefore) {
        where.push("available_at <= ?");
        values.push(cleanString(filters.availableBefore));
      }
      const limit = Math.max(1, Math.min(100, Number(filters.limit || 20) || 20));
      return db.prepare(`SELECT * FROM learning_growth_evaluation_jobs ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY available_at ASC, created_at ASC LIMIT ?`)
        .all(...values, limit)
        .map(publicGrowthEvaluationJob);
    } finally {
      db.close();
    }
  }

  function claimEvaluationJob(jobId, input = {}) {
    const db = open(false);
    try {
      if (!tableExists(db, "learning_growth_evaluation_jobs")) return null;
      const now = cleanString(input.now) || new Date().toISOString();
      const leaseUntil = cleanString(input.leaseUntil) || new Date(Date.parse(now) + 10 * 60 * 1000).toISOString();
      const leaseOwner = cleanString(input.leaseOwner) || "growth-plugin-evaluator";
      const result = db.prepare(`
        UPDATE learning_growth_evaluation_jobs
        SET status = 'processing',
            attempt_count = attempt_count + 1,
            lease_owner = ?,
            lease_until = ?,
            updated_at = ?
        WHERE id = ?
          AND status IN ('pending', 'retry', 'processing')
          AND (status <> 'processing' OR lease_until = '' OR lease_until <= ?)
          AND available_at <= ?
      `).run(leaseOwner, leaseUntil, now, cleanString(jobId), now, now);
      if (!result.changes) return null;
      return getGrowthEvaluationJob(db, jobId);
    } finally {
      db.close();
    }
  }

  function completeEvaluationJob(jobId, input = {}) {
    const db = open(false);
    try {
      if (!tableExists(db, "learning_growth_evaluation_jobs")) return null;
      const now = cleanString(input.completedAt || input.now) || new Date().toISOString();
      db.prepare(`
        UPDATE learning_growth_evaluation_jobs
        SET status = 'done',
            lease_owner = '',
            lease_until = '',
            last_error = '',
            completed_at = ?,
            updated_at = ?
        WHERE id = ?
      `).run(now, now, cleanString(jobId));
      return getGrowthEvaluationJob(db, jobId);
    } finally {
      db.close();
    }
  }

  function failEvaluationJob(jobId, input = {}) {
    const db = open(false);
    try {
      if (!tableExists(db, "learning_growth_evaluation_jobs")) return null;
      const now = cleanString(input.now) || new Date().toISOString();
      const status = cleanString(input.status || "retry");
      const availableAt = cleanString(input.availableAt) || now;
      db.prepare(`
        UPDATE learning_growth_evaluation_jobs
        SET status = ?,
            lease_owner = '',
            lease_until = '',
            last_error = ?,
            available_at = ?,
            updated_at = ?
        WHERE id = ?
      `).run(status, cleanString(input.error).slice(0, 500), availableAt, now, cleanString(jobId));
      return getGrowthEvaluationJob(db, jobId);
    } finally {
      db.close();
    }
  }

  function evaluationJobContext(input = {}) {
    const db = open(true);
    try {
      if (!tableExists(db, "learning_growth_evaluation_jobs") || !tableExists(db, "learning_task_submissions") || !tableExists(db, "learning_task_cards")) {
        return null;
      }
      const job = cleanString(input.jobId)
        ? db.prepare("SELECT * FROM learning_growth_evaluation_jobs WHERE id = ?").get(cleanString(input.jobId))
        : db.prepare("SELECT * FROM learning_growth_evaluation_jobs WHERE submission_id = ?").get(cleanString(input.submissionId));
      if (!job) return null;
      const submission = db.prepare("SELECT * FROM learning_task_submissions WHERE id = ?").get(job.submission_id);
      if (!submission) return null;
      const taskCard = db.prepare("SELECT * FROM learning_task_cards WHERE id = ?").get(submission.task_card_id);
      if (!taskCard) return null;
      return {
        job: publicGrowthEvaluationJob(job),
        submission,
        taskCard,
        submissionRaw: parseJson(submission.raw_json, {}) || {},
        taskRaw: parseJson(taskCard.raw_json, {}) || {}
      };
    } finally {
      db.close();
    }
  }

  function recordEvaluation(input = {}) {
    const db = open(false);
    try {
      if (!tableExists(db, "learning_evaluations")) return { ok: false, error: "evaluation_table_missing" };
      const now = cleanString(input.evaluatedAt || input.createdAt) || new Date().toISOString();
      const taskCard = input.taskCard || {};
      const submission = input.submission || {};
      const evaluation = input.evaluation || {};
      const submissionId = cleanString(submission.id || input.submissionId);
      const evaluationId = cleanString(evaluation.evaluationId || input.evaluationId) || stableEvaluationId(submissionId);
      const raw = {
        source: "growth-plugin",
        submissionId,
        revisionRequirements: asArray(evaluation.revisionRequirements).slice(0, 8),
        remainingWeaknesses: asArray(evaluation.remainingWeaknesses).slice(0, 8),
        feedbackSections: evaluation.feedbackSections && typeof evaluation.feedbackSections === "object" ? evaluation.feedbackSections : {},
        evidenceRefs: asArray(evaluation.evidenceRefs).slice(0, 8)
      };
      const values = {
        id: evaluationId,
        task_card_id: cleanString(submission.task_card_id || input.taskCardId || taskCard.id),
        session_id: cleanString(submission.session_id),
        program_id: cleanString(submission.program_id || taskCard.program_id),
        learner_id: cleanString(submission.learner_id || taskCard.learner_id || input.workspaceId),
        workspace_id: cleanString(submission.workspace_id || taskCard.workspace_id || input.workspaceId),
        status: cleanString(evaluation.status || "completed"),
        score: Number(evaluation.score || 0),
        passed: evaluation.passed ? 1 : 0,
        confidence: Number(evaluation.confidence || 0),
        summary: cleanString(evaluation.summary).slice(0, 700),
        skill_results_json: JSON.stringify(evaluation.skillResults || []),
        reward_policy_json: JSON.stringify(evaluation.reward || {}),
        source_basis_refs_json: JSON.stringify(raw.evidenceRefs),
        raw_json: JSON.stringify(raw),
        created_at: now
      };
      insertDynamic(db, "learning_evaluations", values);
      return {
        ok: true,
        evaluation: publicEvaluation(Object.assign({}, values, { raw_json: values.raw_json }))
      };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    } finally {
      db.close();
    }
  }

  return {
    claimEvaluationJob,
    completeEvaluationJob,
    evaluationJobContext,
    failEvaluationJob,
    listEvaluationJobs,
    recordEvaluation
  };
}

module.exports = {
  createEvaluationJobRepository,
  publicGrowthEvaluationJob
};
