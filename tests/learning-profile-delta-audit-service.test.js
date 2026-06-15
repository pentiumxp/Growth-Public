const assert = require("node:assert/strict");
const test = require("node:test");

const { createLearningProfileDeltaAuditService } = require("../src/services/learning-profile-delta-audit-service");

test("profile delta audit service lists bounded public deltas through repository", () => {
  const calls = [];
  const service = createLearningProfileDeltaAuditService({
    repository: {
      listProfileDeltas(input) {
        calls.push(input);
        return [{
          profileDeltaId: "profile_delta_eval_1",
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          evaluationId: input.evaluationId,
          changedCapabilities: [{ nodeId: "kg_science_fair_test" }],
          summary: { changedCapabilityCount: 1 },
          privacyClass: "summary_only"
        }];
      }
    }
  });

  const result = service.listProfileDeltas({
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    displayName: "凡凡",
    programId: "program_science",
    taskCardId: "ltask_science_1",
    evaluationId: "eval_science_1",
    profileDeltaId: "profile_delta_eval_1",
    limit: 999
  });

  assert.equal(result.ok, true);
  assert.equal(result.count, 1);
  assert.equal(result.target.workspaceId, "weixin_stephen");
  assert.equal(result.target.learnerId, "fanfan");
  assert.equal(result.target.displayName, "凡凡");
  assert.equal(result.profileDeltas[0].profileDeltaId, "profile_delta_eval_1");
  assert.equal(JSON.stringify(result).includes("rawAnswer"), false);
  assert.deepEqual(calls[0], {
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    programId: "program_science",
    taskCardId: "ltask_science_1",
    evaluationId: "eval_science_1",
    profileDeltaId: "profile_delta_eval_1",
    limit: 100
  });
});

test("profile delta audit service fails closed without repository or workspace", () => {
  const unavailable = createLearningProfileDeltaAuditService();
  assert.deepEqual(unavailable.listProfileDeltas({ workspaceId: "" }), {
    ok: false,
    error: "profile_delta_audit_workspace_required"
  });
  assert.deepEqual(unavailable.listProfileDeltas({ workspaceId: "weixin_stephen" }), {
    ok: false,
    available: false,
    error: "profile_delta_audit_repository_unavailable"
  });
});
