const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const { createLearningEvidenceLedgerService } = require("../src/services/learning-evidence-ledger-service");
const { createLearningProfileDeltaService } = require("../src/services/learning-profile-delta-service");
const { createLearningProfileV2Service } = require("../src/services/learning-profile-v2-service");
const { createLearningEvidenceLedgerRepository } = require("../src/stores/growth-learning-sqlite/evidence-ledger");
const { createProfileDeltaAuditRepository } = require("../src/stores/growth-learning-sqlite/profile-delta-audits");

function withProfileDelta(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-profile-delta-"));
  const dbPath = path.join(dir, "profile-delta.sqlite3");
  const repository = createLearningEvidenceLedgerRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    }
  });
  const profileDeltaAuditRepository = createProfileDeltaAuditRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-15T08:05:00.000Z")
  });
  const evidenceLedgerService = createLearningEvidenceLedgerService({
    repository,
    now: () => new Date("2026-06-15T08:00:00.000Z")
  });
  const profileV2Service = createLearningProfileV2Service({
    evidenceLedgerService,
    now: () => new Date("2026-06-15T08:00:00.000Z")
  });
  const profileDeltaService = createLearningProfileDeltaService({
    profileV2Service,
    repository: profileDeltaAuditRepository,
    now: () => new Date("2026-06-15T08:05:00.000Z")
  });
  try {
    return callback({ evidenceLedgerService, profileDeltaAuditRepository, profileDeltaService });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("profile delta reports and persists changed capability state after new evidence", () => {
  withProfileDelta(({ evidenceLedgerService, profileDeltaAuditRepository, profileDeltaService }) => {
    const seed = evidenceLedgerService.writeEvidence({
      workspaceId: "weixin_stephen",
      learnerId: "fanfan",
      programId: "program_science",
      graphNodeId: "kg_science_fair_test",
      graphNodeIds: ["kg_science_fair_test"],
      sourceType: "backfill_summary",
      sourceId: "seed_weak",
      sourceTaskCardId: "seed_card",
      cardRole: "practice",
      evidenceWeight: 0.2,
      confidence: 0.55,
      scoreBand: "low",
      status: "needs_repair",
      summary: { feedbackSummary: "Needs clearer measured-result reasoning." },
      recordedAt: "2026-06-15T07:00:00.000Z"
    });
    assert.equal(seed.ok, true);
    const before = profileDeltaService.snapshot({
      phase: "before",
      workspaceId: "weixin_stephen",
      learnerId: "fanfan",
      programId: "program_science",
      targetNodeIds: ["kg_science_fair_test"]
    });
    assert.equal(before.ok, true);
    assert.equal(before.capabilityStates[0].evidenceCount, 1);

    const evidence = evidenceLedgerService.writeEvidence({
      workspaceId: "weixin_stephen",
      learnerId: "fanfan",
      programId: "program_science",
      graphNodeId: "kg_science_fair_test",
      graphNodeIds: ["kg_science_fair_test"],
      sourceType: "daily_evaluation",
      sourceId: "eval_science_1",
      sourceTaskCardId: "ltask_science_1",
      cardRole: "teaching",
      evidenceWeight: 0.2,
      confidence: 0.82,
      scoreBand: "medium",
      status: "observed",
      summary: { feedbackSummary: "Measured result was named." },
      recordedAt: "2026-06-15T08:00:00.000Z"
    });
    assert.equal(evidence.ok, true);

    const delta = profileDeltaService.recordEvaluationProfileDelta({
      beforeProfileSnapshot: before,
      workspaceId: "weixin_stephen",
      learnerId: "fanfan",
      programId: "program_science",
      targetNodeIds: ["kg_science_fair_test"],
      taskCard: { id: "ltask_science_1" },
      submission: { id: "submission_science_1" },
      evaluation: { evaluationId: "eval_science_1" },
      evidenceLedger: { entries: [evidence.evidence] }
    });

    assert.equal(delta.ok, true);
    assert.equal(delta.profileDeltaId, "profile_delta_eval_science_1");
    assert.equal(delta.persistence.ok, true);
    assert.equal(delta.persistence.available, true);
    assert.equal(delta.persistence.profileDeltaId, "profile_delta_eval_science_1");
    assert.equal(delta.summary.changedCapabilityCount, 1);
    assert.equal(delta.summary.evidenceCountDelta, 1);
    assert.equal(delta.changedCapabilities[0].nodeId, "kg_science_fair_test");
    assert.equal(delta.changedCapabilities[0].evidenceCountDelta, 1);
    assert.equal(delta.changedCapabilities[0].evidenceWeightDelta, 0.2);
    assert.deepEqual(delta.basis.evidenceIds, [evidence.evidence.evidenceId]);
    assert.equal(JSON.stringify(delta).includes("rawAnswer"), false);

    const audits = profileDeltaAuditRepository.listProfileDeltas({
      workspaceId: "weixin_stephen",
      evaluationId: "eval_science_1"
    });
    assert.equal(audits.length, 1);
    assert.equal(audits[0].profileDeltaId, "profile_delta_eval_science_1");
    assert.equal(audits[0].changedCapabilities[0].nodeId, "kg_science_fair_test");
    assert.equal(JSON.stringify(audits[0]).includes("rawAnswer"), false);
  });
});

test("profile delta records evidence-freshness changes when stale evidence is refreshed", () => {
  withProfileDelta(({ evidenceLedgerService, profileDeltaAuditRepository, profileDeltaService }) => {
    assert.equal(evidenceLedgerService.writeEvidence({
      workspaceId: "weixin_stephen",
      learnerId: "fanfan",
      programId: "program_science",
      graphNodeId: "kg_science_variables",
      graphNodeIds: ["kg_science_variables"],
      sourceType: "daily_evaluation",
      sourceId: "eval_old_stable",
      sourceTaskCardId: "ltask_old_stable",
      cardRole: "practice",
      evidenceWeight: 1,
      confidence: 0.9,
      scoreBand: "high",
      status: "stable",
      summary: { feedbackSummary: "Variables looked stable in an old daily card." },
      recordedAt: "2026-05-01T08:00:00.000Z"
    }).ok, true);
    const before = profileDeltaService.snapshot({
      phase: "before",
      workspaceId: "weixin_stephen",
      learnerId: "fanfan",
      programId: "program_science",
      targetNodeIds: ["kg_science_variables"]
    });
    assert.equal(before.ok, true);
    assert.equal(before.capabilityStates[0].stale, true);
    assert.equal(before.capabilityStates[0].evidenceFreshness.status, "stale");
    assert.equal(before.capabilityStates[0].staleReasons.includes("daily_evidence_stale"), true);

    const evidence = evidenceLedgerService.writeEvidence({
      workspaceId: "weixin_stephen",
      learnerId: "fanfan",
      programId: "program_science",
      graphNodeId: "kg_science_variables",
      graphNodeIds: ["kg_science_variables"],
      sourceType: "daily_evaluation",
      sourceId: "eval_refresh_variables",
      sourceTaskCardId: "ltask_refresh_variables",
      cardRole: "practice",
      evidenceWeight: 0.2,
      confidence: 0.86,
      scoreBand: "high",
      status: "observed",
      summary: { feedbackSummary: "Variables were refreshed in a short daily card." },
      recordedAt: "2026-06-15T08:00:00.000Z"
    });
    assert.equal(evidence.ok, true);

    const delta = profileDeltaService.recordEvaluationProfileDelta({
      beforeProfileSnapshot: before,
      workspaceId: "weixin_stephen",
      learnerId: "fanfan",
      programId: "program_science",
      targetNodeIds: ["kg_science_variables"],
      taskCard: { id: "ltask_refresh_variables" },
      submission: { id: "submission_refresh_variables" },
      evaluation: { evaluationId: "eval_refresh_variables" },
      evidenceLedger: { entries: [evidence.evidence] }
    });

    assert.equal(delta.ok, true);
    assert.equal(delta.summary.changedCapabilityCount, 1);
    assert.equal(delta.summary.staleCountDelta, -1);
    const change = delta.changedCapabilities[0];
    assert.equal(change.nodeId, "kg_science_variables");
    assert.equal(change.staleChanged, true);
    assert.equal(change.evidenceFreshnessChanged, true);
    assert.equal(change.evidenceFreshnessChange.before.status, "stale");
    assert.equal(change.evidenceFreshnessChange.after.status, "current");
    assert.equal(change.evidenceFreshnessChange.after.recencyBand, "fresh");
    assert.equal(change.resolvedStaleReasons.includes("daily_evidence_stale"), true);
    assert.equal(change.resolvedStaleReasons.includes("strong_claim_requires_refresh"), true);
    assert.deepEqual(change.newStaleReasons, []);
    assert.equal(JSON.stringify(delta).includes("RAW"), false);

    const audits = profileDeltaAuditRepository.listProfileDeltas({
      workspaceId: "weixin_stephen",
      evaluationId: "eval_refresh_variables"
    });
    assert.equal(audits.length, 1);
    assert.equal(audits[0].changedCapabilities[0].evidenceFreshnessChanged, true);
    assert.equal(audits[0].changedCapabilities[0].resolvedStaleReasons.includes("daily_evidence_stale"), true);
  });
});

test("profile delta returns bounded no-change projection", () => {
  const profile = {
    ok: true,
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    programId: "program_science",
    targetNodeIds: ["kg_science_observation"],
    summary: { capabilityStateCount: 1, evidenceCount: 1 },
    capabilityStates: [{
      nodeId: "kg_science_observation",
      status: "stable",
      scoreBand: "high",
      confidence: 0.9,
      evidenceCount: 1,
      evidenceWeightTotal: 1,
      stale: false,
      evidenceIds: ["evidence_1"]
    }],
    recommendedPlannerHints: {
      strategy: "stretch",
      cardRole: "practice",
      targetNodeIds: ["kg_science_observation"],
      reason: "Stable evidence can support a controlled stretch plan."
    }
  };
  const profileDeltaService = createLearningProfileDeltaService({
    profileV2Service: { profileV2: () => profile },
    now: () => new Date("2026-06-15T08:05:00.000Z")
  });
  const before = profileDeltaService.snapshot({
    phase: "before",
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    programId: "program_science",
    targetNodeIds: ["kg_science_observation"]
  });
  const delta = profileDeltaService.recordEvaluationProfileDelta({
    beforeProfileSnapshot: before,
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    programId: "program_science",
    targetNodeIds: ["kg_science_observation"],
    evaluation: { evaluationId: "eval_same" }
  });

  assert.equal(delta.ok, true);
  assert.equal(delta.persistence.available, false);
  assert.equal(delta.summary.changedCapabilityCount, 0);
  assert.equal(delta.profileStateChanged, false);
  assert.deepEqual(delta.changedCapabilities, []);
});

test("profile delta persistence failure is visible without throwing", () => {
  const profile = {
    ok: true,
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    summary: { capabilityStateCount: 0, evidenceCount: 0 },
    capabilityStates: [],
    recommendedPlannerHints: { strategy: "stabilize" }
  };
  const profileDeltaService = createLearningProfileDeltaService({
    profileV2Service: { profileV2: () => profile },
    repository: {
      recordProfileDelta() {
        return { ok: false, error: "profile_delta_audit_privacy_failed", privacyFindings: ["$.rawAnswer"] };
      }
    }
  });
  const before = profileDeltaService.snapshot({
    phase: "before",
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    targetNodeIds: ["kg_science_fair_test"]
  });
  const delta = profileDeltaService.recordEvaluationProfileDelta({
    beforeProfileSnapshot: before,
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    targetNodeIds: ["kg_science_fair_test"],
    evaluation: { evaluationId: "eval_persist_failure" }
  });

  assert.equal(delta.ok, false);
  assert.equal(delta.available, true);
  assert.equal(delta.error, "profile_delta_audit_privacy_failed");
  assert.equal(delta.persistence.ok, false);
  assert.deepEqual(delta.persistence.privacyFindings, ["$.rawAnswer"]);
});

test("profile delta reports unavailable profile service without throwing", () => {
  const profileDeltaService = createLearningProfileDeltaService();
  const before = profileDeltaService.snapshot({
    phase: "before",
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    targetNodeIds: ["kg_science_fair_test"]
  });
  const delta = profileDeltaService.recordEvaluationProfileDelta({
    beforeProfileSnapshot: before,
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    targetNodeIds: ["kg_science_fair_test"],
    evaluation: { evaluationId: "eval_missing_profile" }
  });

  assert.equal(before.ok, false);
  assert.equal(before.error, "profile_v2_service_unavailable");
  assert.equal(delta.ok, false);
  assert.equal(delta.error, "profile_delta_before_snapshot_unavailable");
});

test("profile delta snapshots exclude legacy raw profile payloads", () => {
  const rawMarker = "RAW_CHILD_ANSWER_DO_NOT_LEAK";
  const profileDeltaService = createLearningProfileDeltaService({
    profileV2Service: {
      profileV2: () => ({
        ok: true,
        workspaceId: "weixin_stephen",
        learnerId: "fanfan",
        summary: { capabilityStateCount: 1, evidenceCount: 1 },
        capabilityStates: [{
          nodeId: "kg_english_evidence",
          status: "weak",
          evidenceCount: 1,
          evidenceWeightTotal: 0.2,
          evidenceIds: ["evidence_1"]
        }],
        legacyProfile: {
          rawAnswer: rawMarker,
          transcript: rawMarker
        },
        recommendedPlannerHints: {
          strategy: "repair",
          targetNodeIds: ["kg_english_evidence"],
          reason: "Recent weak evidence should produce a low-pressure repair plan."
        }
      })
    }
  });

  const snapshot = profileDeltaService.snapshot({
    phase: "before",
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    targetNodeIds: ["kg_english_evidence"]
  });

  assert.equal(snapshot.ok, true);
  assert.equal(JSON.stringify(snapshot).includes(rawMarker), false);
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot, "legacyProfile"), false);
});
