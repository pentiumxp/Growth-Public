const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const { createProfileDeltaAuditRepository } = require("../src/stores/growth-learning-sqlite/profile-delta-audits");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-profile-delta-audit-"));
  const dbPath = path.join(dir, "profile-delta-audit.sqlite3");
  const repository = createProfileDeltaAuditRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-15T08:20:00.000Z")
  });
  try {
    return callback({ repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sampleDelta(overrides = {}) {
  return Object.assign({
    ok: true,
    available: true,
    source: "growth-learning-profile-delta-service",
    profileDeltaId: "profile_delta_eval_science_1",
    privacyClass: "summary_only",
    generatedAt: "2026-06-15T08:12:30.000Z",
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    programId: "program_science",
    targetNodeIds: ["kg_science_fair_test"],
    basis: {
      taskCardId: "ltask_science_1",
      submissionId: "submission_science_1",
      evaluationId: "eval_science_1",
      evidenceIds: ["evidence_eval_science_1"]
    },
    beforeSummary: { evidenceCount: 1, weaknessCount: 1 },
    afterSummary: { evidenceCount: 2, weaknessCount: 1 },
    summary: {
      changedCapabilityCount: 1,
      evidenceCountDelta: 1,
      plannerHintChanged: true
    },
    changedCapabilities: [{
      nodeId: "kg_science_fair_test",
      changeType: "updated",
      evidenceCountDelta: 1,
      evidenceWeightDelta: 0.2,
      newEvidenceIds: ["evidence_eval_science_1"]
    }],
    plannerHintChange: {
      changed: true,
      before: { strategy: "repair", targetNodeIds: ["kg_science_fair_test"] },
      after: { strategy: "stabilize", targetNodeIds: ["kg_science_fair_test"] }
    },
    profileStateChanged: true
  }, overrides);
}

test("profile delta audit repository records, lists, and de-duplicates evaluation deltas", () => {
  withRepository(({ repository }) => {
    const recorded = repository.recordProfileDelta(sampleDelta());

    assert.equal(recorded.ok, true);
    assert.equal(recorded.duplicate, false);
    assert.equal(recorded.profileDelta.profileDeltaId, "profile_delta_eval_science_1");
    assert.equal(recorded.profileDelta.workspaceId, "weixin_stephen");
    assert.equal(recorded.profileDelta.evaluationId, "eval_science_1");
    assert.deepEqual(recorded.profileDelta.targetNodeIds, ["kg_science_fair_test"]);
    assert.deepEqual(recorded.profileDelta.evidenceIds, ["evidence_eval_science_1"]);
    assert.equal(recorded.profileDelta.changedCapabilityCount, 1);
    assert.equal(recorded.profileDelta.profileStateChanged, true);
    assert.equal(recorded.profileDelta.privacyClass, "summary_only");

    const duplicate = repository.recordProfileDelta(sampleDelta({
      profileDeltaId: "another_explicit_id_same_eval"
    }));
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.profileDelta.profileDeltaId, "profile_delta_eval_science_1");

    const rows = repository.listProfileDeltas({
      workspaceId: "weixin_stephen",
      learnerId: "fanfan",
      evaluationId: "eval_science_1"
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].changedCapabilities[0].nodeId, "kg_science_fair_test");
    assert.equal(JSON.stringify(rows[0]).includes("rawAnswer"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(rows[0], "raw"), false);
  });
});

test("profile delta audit repository rejects privacy-risk keys and non-summary privacy class", () => {
  withRepository(({ repository }) => {
    const privacyRisk = repository.recordProfileDelta(sampleDelta({
      rawAnswer: "RAW_CHILD_ANSWER_DO_NOT_STORE"
    }));
    assert.equal(privacyRisk.ok, false);
    assert.equal(privacyRisk.error, "profile_delta_audit_privacy_failed");
    assert.equal(privacyRisk.privacyFindings.includes("$.rawAnswer"), true);

    const wrongClass = repository.recordProfileDelta(sampleDelta({
      profileDeltaId: "profile_delta_wrong_privacy_class",
      privacyClass: "raw_payload"
    }));
    assert.equal(wrongClass.ok, false);
    assert.equal(wrongClass.error, "profile_delta_audit_privacy_class_required");

    assert.deepEqual(repository.listProfileDeltas({ workspaceId: "weixin_stephen" }), []);
  });
});
