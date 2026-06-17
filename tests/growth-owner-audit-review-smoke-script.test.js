const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-owner-audit-review.js");

const {
  inputFromArgs,
  operationFromArgs,
  projectOwnerAuditReviewSmokeReadback,
  validateOperation
} = require("../scripts/smoke-growth-owner-audit-review");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-owner-audit-review-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath, { open: true }).close();
  try {
    return callback({ dir, dbPath });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function runScript(args, env = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    env: Object.assign({}, process.env, env),
    encoding: "utf8"
  });
}

function parseStdout(result) {
  return JSON.parse(result.stdout);
}

test("owner audit review smoke script parses bounded read and write scope", () => {
  const args = [
    "--operation", "record",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--task-card-id", "ltask_daily_1",
    "--evaluation-id", "leval_daily_1",
    "--profile-delta-id", "lgpdelta_daily_1",
    "--evidence-id", "lgevd_daily_1",
    "--correction-id", "lgcorr_daily_1",
    "--decision", "correction_recorded",
    "--owner-note", "Bounded note.",
    "--target-node-id", "kg_science_fair_test",
    "--target-node-ids", "kg_science_fair_test,kg_science_variables",
    "--limit", "7",
    "--reviewed-by", "weixin_owner"
  ];

  assert.equal(operationFromArgs(args), "record");
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    decision: "correction_recorded",
    ownerNote: "Bounded note.",
    taskCardId: "ltask_daily_1",
    evaluationId: "leval_daily_1",
    profileDeltaId: "lgpdelta_daily_1",
    evidenceId: "lgevd_daily_1",
    correctionId: "lgcorr_daily_1",
    targetNodeIds: ["kg_science_fair_test", "kg_science_variables"],
    availableMinutes: 15,
    limit: 7,
    reviewedBy: "weixin_owner"
  });
});

test("owner audit review smoke projection exposes top-level operator readback", () => {
  const output = projectOwnerAuditReviewSmokeReadback({
    ok: true,
    operation: "record",
    source: "growth-learning-owner-audit-review-service",
    schemaVersion: "growth.learningOwnerAuditReview.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    decision: "accepted",
    status: "reviewed",
    scope: {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      taskCardId: "ltask_daily_1",
      evaluationId: "leval_daily_1",
      profileDeltaId: "lgpdelta_daily_1",
      evidenceId: "lgevd_daily_1",
      targetNodeIds: ["kg_science_fair_test"]
    },
    review: {
      reviewId: "lgaudit_daily_1",
      decision: "accepted",
      status: "reviewed",
      ownerNote: "Bounded note.",
      reviewedBy: "weixin_owner",
      createdAt: "2026-06-17T12:00:00.000Z"
    },
    profileFeedback: {
      ok: true,
      status: "pass",
      summary: {
        status: "pass",
        cycleComplete: true,
        readyForNextPlan: true,
        readyForAutomation: true,
        evidenceCount: 1,
        profileDeltaCount: 1,
        rewardSettlementCount: 1,
        totalRewardCoins: 8,
        missingRequired: []
      }
    },
    auditSummary: {
      checkCount: 6,
      passCheckCount: 6,
      missingCheckCount: 0,
      blockedCheckCount: 0
    },
    recommendation: {
      available: true,
      strategy: "repair",
      targetNodeId: "kg_science_fair_test"
    },
    nextAction: {
      action: "draft_daily_plan",
      enabled: true
    },
    list: {
      count: 1,
      reviews: [{ reviewId: "lgaudit_daily_1" }]
    }
  });

  assert.equal(output.ownerAuditReviewOperation, "record");
  assert.equal(output.ownerAuditReviewWriteOperation, true);
  assert.equal(output.ownerAuditReviewReviewId, "lgaudit_daily_1");
  assert.equal(output.ownerAuditReviewDecision, "accepted");
  assert.equal(output.ownerAuditReviewProfileFeedbackOk, true);
  assert.equal(output.ownerAuditReviewCycleComplete, true);
  assert.equal(output.ownerAuditReviewReadyForNextPlan, true);
  assert.equal(output.ownerAuditReviewEvidenceCount, 1);
  assert.equal(output.ownerAuditReviewProfileDeltaCount, 1);
  assert.equal(output.ownerAuditReviewCheckCount, 6);
  assert.equal(output.ownerAuditReviewRecommendationStrategy, "repair");
  assert.equal(output.ownerAuditReviewNextAction, "draft_daily_plan");
  assert.equal(output.ownerAuditReviewLatestOwnerNotePresent, true);
});

test("owner audit review smoke script is read-only by default and write-gated", () => {
  assert.deepEqual(validateOperation("list", { workspaceId: "weixin_fanfan" }, []), { ok: true });
  assert.deepEqual(validateOperation("record", { workspaceId: "weixin_fanfan", decision: "accepted" }, []), {
    ok: false,
    error: "owner_audit_review_smoke_write_requires_allow_write",
    operation: "record"
  });
  assert.deepEqual(validateOperation("record", { workspaceId: "weixin_fanfan", decision: "accepted" }, ["--allow-write"]), { ok: true });
});

test("owner audit review smoke CLI lists empty local DB through normal service graph", () => {
  withTempDb(({ dbPath }) => {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--json"
    ], {
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(result.status, 0);
    const output = parseStdout(result);
    assert.equal(output.ok, true);
    assert.equal(output.operation, "list");
    assert.equal(output.ownerAuditReviewOperation, "list");
    assert.equal(output.ownerAuditReviewWriteOperation, false);
    assert.equal(output.ownerAuditReviewCount, 0);
  });
});

test("owner audit review smoke CLI fails closed for missing workspace, invalid JSON, and blocked writes", () => {
  const missingWorkspace = runScript([]);
  assert.equal(missingWorkspace.status, 2);
  assert.equal(parseStdout(missingWorkspace).error, "workspace_id_required");

  const invalidJson = runScript(["--workspace-id", "weixin_fanfan", "--input-json", "{"]);
  assert.equal(invalidJson.status, 2);
  assert.equal(parseStdout(invalidJson).error, "owner_audit_review_smoke_invalid_json");

  const blockedWrite = runScript([
    "--workspace-id", "weixin_fanfan",
    "--operation", "record",
    "--task-card-id", "ltask_daily_1",
    "--decision", "accepted"
  ]);
  assert.equal(blockedWrite.status, 2);
  assert.equal(parseStdout(blockedWrite).error, "owner_audit_review_smoke_write_requires_allow_write");
});
