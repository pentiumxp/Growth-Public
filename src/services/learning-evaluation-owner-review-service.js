"use strict";

function cleanString(value) {
  return String(value ?? "").trim();
}

function createLearningEvaluationOwnerReviewService(options = {}) {
  const repository = options.repository || null;
  const now = typeof options.now === "function" ? options.now : () => new Date();

  function retryFailedEvaluation(input = {}) {
    if (!repository || typeof repository.ownerReviewEvaluationJob !== "function") {
      return { ok: false, error: "evaluation_owner_review_repository_unavailable" };
    }
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    const taskCardId = cleanString(input.taskCardId || input.task_card_id);
    const jobId = cleanString(input.jobId || input.job_id);
    if (!workspaceId) return { ok: false, error: "missing_workspace_id" };
    if (!taskCardId && !jobId) return { ok: false, error: "missing_evaluation_job_target" };
    const result = repository.ownerReviewEvaluationJob({
      action: "retry",
      workspaceId,
      taskCardId,
      jobId,
      reason: cleanString(input.reason || input.note || "owner_retry"),
      reviewedBy: cleanString(input.reviewedBy || input.reviewed_by || input.ownerWorkspaceId || input.owner_workspace_id),
      now: now().toISOString()
    });
    if (!result?.ok) return result || { ok: false, error: "evaluation_owner_review_failed" };
    return {
      ok: true,
      action: "retry",
      job: result.job,
      previous_job: result.previous_job,
      workspace_id: workspaceId,
      task_card_id: taskCardId || result.job?.taskCardId || "",
      source: "growth-evaluation-owner-review"
    };
  }

  return {
    retryFailedEvaluation
  };
}

module.exports = {
  createLearningEvaluationOwnerReviewService
};
