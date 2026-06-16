const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningRewardAuditService,
  scanPrivacy
} = require("../src/services/learning-reward-audit-service");

test("reward audit service returns summary-only settlement readback", () => {
  const calls = [];
  const service = createLearningRewardAuditService({
    repository: {
      listRewardSettlements(input) {
        calls.push(input);
        return [{
          rewardSettlementId: "lrwd_1",
          workspaceId: "weixin_fanfan",
          learnerId: "fanfan",
          programId: "program_science",
          taskCardId: "ltask_science_1",
          evaluationId: "eval_science_1",
          status: "settled",
          coinAmount: 48,
          currency: "learning_coin",
          reason: "growth_coin_settled_by_daily_score",
          sourceType: "growth-plugin-evaluation",
          sourceId: "eval_science_1",
          idempotencyKey: "must_not_leak",
          ledgerEntry: { rawPrompt: "must_not_leak" },
          rawJson: { transcript: "must_not_leak" },
          settledAt: "2026-06-15T08:25:00.000Z"
        }];
      }
    }
  });

  const result = service.listRewardAudit({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    taskCardIds: ["ltask_science_1"],
    evaluationIds: ["eval_science_1"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, "growth.learningRewardAudit.v1");
  assert.equal(result.privacyClass, "summary_only");
  assert.equal(result.summaryOnly, true);
  assert.equal(result.count, 1);
  assert.equal(result.summary.totalCoinAmount, 48);
  assert.equal(result.rewardSettlements[0].rewardSettlementId, "lrwd_1");
  assert.equal(result.rewardSettlements[0].coinAmount, 48);
  assert.equal(result.rewardSettlements[0].reason, "growth_coin_settled_by_daily_score");
  assert.deepEqual(calls[0].taskCardIds, ["ltask_science_1"]);
  assert.deepEqual(calls[0].evaluationIds, ["eval_science_1"]);
  assert.equal(JSON.stringify(result).includes("must_not_leak"), false);
  assert.equal(JSON.stringify(result).includes("idempotencyKey"), false);
  assert.equal(JSON.stringify(result).includes("ledgerEntry"), false);
  assert.equal(JSON.stringify(result).includes("rawJson"), false);
});

test("reward audit service fails closed for private inputs and missing repository", () => {
  assert.deepEqual(scanPrivacy({ nested: { rawPrompt: "bad" } }), ["$.nested.rawPrompt"]);
  assert.deepEqual(scanPrivacy({ reason: "Bearer local-token" }), ["$.reason"]);

  const privacy = createLearningRewardAuditService({
    repository: { listRewardSettlements: () => [] }
  }).listRewardAudit({
    workspaceId: "weixin_fanfan",
    idempotencyKey: "private"
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_reward_audit_privacy_failed");
  assert.deepEqual(privacy.privacyFindings, ["$.idempotencyKey"]);

  const missingScope = createLearningRewardAuditService({
    repository: { listRewardSettlements: () => [] }
  }).listRewardAudit({});
  assert.equal(missingScope.ok, false);
  assert.equal(missingScope.error, "learning_reward_audit_workspace_required");

  const missingRepository = createLearningRewardAuditService({}).listRewardAudit({
    workspaceId: "weixin_fanfan"
  });
  assert.equal(missingRepository.ok, false);
  assert.equal(missingRepository.error, "learning_reward_audit_repository_unavailable");
});
