const assert = require("node:assert/strict");
const test = require("node:test");

const { createLearningExperienceSignalService } = require("../src/services/learning-experience-signal-service");

test("learning experience signal service writes bounded learner feedback signals", () => {
  const writes = [];
  const service = createLearningExperienceSignalService({
    now: () => new Date("2026-06-14T09:00:00.000Z"),
    repository: {
      recordExperienceSignal(input) {
        writes.push(input);
        return {
          ok: true,
          duplicate: false,
          signal: Object.assign({
            id: `signal_${writes.length}`,
            sourceRef: input.sourceRef
          }, input, {
            targetNodeId: input.nodeId,
            createdAt: input.recordedAt
          })
        };
      }
    }
  });

  const result = service.recordSignal({
    workspaceId: "weixin_fanfan",
    learnerId: "weixin_fanfan",
    programId: "program_1",
    taskCardId: "ltask_1",
    targetNodeIds: ["kg_main_idea", "kg_evidence"],
    signalType: "too_hard",
    note: "This felt too hard today."
  });

  assert.equal(result.ok, true);
  assert.equal(result.signalType, "too_hard");
  assert.equal(result.signalCount, 2);
  assert.equal(writes[0].sourceType, "learner_feedback");
  assert.equal(writes[0].sourceRef, "learner_feedback:ltask_1:kg_main_idea:too_hard");
  assert.equal(writes[0].strength, "high");
  assert.equal(writes[0].summary, "This felt too hard today.");
  assert.equal(JSON.stringify(result).includes("sourceRef"), false);
});

test("learning experience signal service rejects unanchored or privacy-risk input", () => {
  const service = createLearningExperienceSignalService({
    repository: {
      recordExperienceSignal() {
        throw new Error("should not write");
      }
    }
  });

  const missingTarget = service.recordSignal({
    workspaceId: "weixin_fanfan",
    taskCardId: "ltask_1",
    signalType: "right_level"
  });
  assert.equal(missingTarget.ok, false);
  assert.equal(missingTarget.error, "experience_signal_target_node_required");

  const privacyRisk = service.recordSignal({
    workspaceId: "weixin_fanfan",
    taskCardId: "ltask_1",
    targetNodeIds: ["kg_main_idea"],
    signalType: "right_level",
    rawAnswer: "private full answer"
  });
  assert.equal(privacyRisk.ok, false);
  assert.equal(privacyRisk.error, "experience_signal_privacy_failed");
  assert.equal(privacyRisk.privacyFindings[0].path, "rawAnswer");
});
