const assert = require("node:assert/strict");
const test = require("node:test");

const { createLearningEvaluationOwnerReviewService } = require("../src/services/learning-evaluation-owner-review-service");

test("evaluation owner review service retries a failed job through the repository", () => {
  const calls = [];
  const service = createLearningEvaluationOwnerReviewService({
    repository: {
      ownerReviewEvaluationJob(input) {
        calls.push(input);
        return {
          ok: true,
          action: "retry",
          previous_job: { jobId: "job_1", status: "failed" },
          job: { jobId: "job_1", taskCardId: "card_1", status: "retry" }
        };
      }
    },
    now: () => new Date("2026-06-14T06:00:00.000Z")
  });

  const result = service.retryFailedEvaluation({
    workspaceId: "weixin_fanfan",
    taskCardId: "card_1",
    reason: "Gateway is available again.",
    reviewedBy: "owner"
  });

  assert.equal(result.ok, true);
  assert.equal(result.action, "retry");
  assert.equal(result.job.status, "retry");
  assert.deepEqual(calls[0], {
    action: "retry",
    workspaceId: "weixin_fanfan",
    taskCardId: "card_1",
    jobId: "",
    reason: "Gateway is available again.",
    reviewedBy: "owner",
    now: "2026-06-14T06:00:00.000Z"
  });
});

test("evaluation owner review service rejects missing targets and propagates repository failures", () => {
  const service = createLearningEvaluationOwnerReviewService({
    repository: {
      ownerReviewEvaluationJob() {
        return { ok: false, error: "evaluation_job_not_failed", job: { jobId: "job_1", status: "retry" } };
      }
    }
  });

  assert.equal(service.retryFailedEvaluation({ taskCardId: "card_1" }).error, "missing_workspace_id");
  assert.equal(service.retryFailedEvaluation({ workspaceId: "weixin_fanfan" }).error, "missing_evaluation_job_target");
  assert.equal(service.retryFailedEvaluation({ workspaceId: "weixin_fanfan", taskCardId: "card_1" }).error, "evaluation_job_not_failed");
});
