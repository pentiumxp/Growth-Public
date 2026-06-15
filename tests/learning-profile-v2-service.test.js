const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const { createLearningEvidenceLedgerService } = require("../src/services/learning-evidence-ledger-service");
const { createLearningProfileV2Service } = require("../src/services/learning-profile-v2-service");
const { createLearningEvidenceLedgerRepository } = require("../src/stores/growth-learning-sqlite/evidence-ledger");

function withServices(callback, options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-profile-v2-"));
  const dbPath = path.join(dir, "profile-v2.sqlite3");
  const repository = createLearningEvidenceLedgerRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    }
  });
  const evidenceLedgerService = createLearningEvidenceLedgerService({
    repository,
    now: () => new Date(options.now || "2026-06-14T10:00:00.000Z")
  });
  const profileV2Service = createLearningProfileV2Service({
    evidenceLedgerService,
    now: () => new Date(options.now || "2026-06-14T10:00:00.000Z"),
    staleAfterMs: options.staleAfterMs,
    formalStaleAfterMs: options.formalStaleAfterMs
  });
  try {
    return callback({ evidenceLedgerService, profileV2Service, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("Profile V2 aggregates ledger evidence into capability states and planner hints", () => {
  withServices(({ evidenceLedgerService, profileV2Service }) => {
    assert.equal(evidenceLedgerService.writeEvidence({
      workspaceId: "weixin_stephen",
      learnerId: "weixin_stephen",
      programId: "program_science",
      graphNodeId: "kg_science_fair_test",
      graphNodeIds: ["kg_science_fair_test"],
      sourceType: "daily_evaluation",
      sourceId: "eval_weak",
      sourceTaskCardId: "ltask_1",
      cardRole: "practice",
      evidenceWeight: 0.2,
      confidence: 0.68,
      scoreBand: "low",
      status: "needs_repair",
      summary: {
        feedbackSummary: "The answer needs a clearer measured result.",
        remainingWeaknesses: ["Does not name the measured result."]
      },
      recordedAt: "2026-06-14T09:00:00.000Z"
    }).ok, true);
    assert.equal(evidenceLedgerService.writeEvidence({
      workspaceId: "weixin_stephen",
      learnerId: "weixin_stephen",
      programId: "program_science",
      graphNodeId: "kg_science_observation",
      graphNodeIds: ["kg_science_observation"],
      sourceType: "stage_assessment",
      sourceId: "eval_strong",
      sourceTaskCardId: "stage_1",
      cardRole: "stage_assessment",
      evidenceWeight: 1,
      confidence: 0.91,
      scoreBand: "high",
      status: "mastered",
      summary: { feedbackSummary: "Observation language is independently stable." },
      recordedAt: "2026-06-14T09:30:00.000Z"
    }).ok, true);

    const result = profileV2Service.profileV2({
      workspaceId: "weixin_stephen",
      learnerId: "weixin_stephen",
      programId: "program_science"
    });

    assert.equal(result.ok, true);
    assert.equal(result.summary.capabilityStateCount, 2);
    assert.equal(result.summary.evidenceCount, 2);
    assert.equal(result.weaknesses[0].nodeId, "kg_science_fair_test");
    assert.equal(result.strengths[0].nodeId, "kg_science_observation");
    assert.equal(result.recommendedPlannerHints.strategy, "repair");
    assert.deepEqual(result.recommendedPlannerHints.targetNodeIds, ["kg_science_fair_test"]);
    assert.equal(JSON.stringify(result).includes("RAW"), false);
  });
});

test("Profile V2 routes stale strong evidence into low-pressure review instead of stretch", () => {
  withServices(({ evidenceLedgerService, profileV2Service }) => {
    assert.equal(evidenceLedgerService.writeEvidence({
      workspaceId: "weixin_stephen",
      learnerId: "weixin_stephen",
      programId: "program_science",
      graphNodeId: "kg_science_variables",
      graphNodeIds: ["kg_science_variables"],
      sourceType: "daily_evaluation",
      sourceId: "eval_old_high",
      sourceTaskCardId: "ltask_old",
      cardRole: "practice",
      evidenceWeight: 0.4,
      confidence: 0.82,
      scoreBand: "high",
      status: "stable",
      summary: { feedbackSummary: "Variables looked stable in a short daily card." },
      recordedAt: "2026-05-01T09:00:00.000Z"
    }).ok, true);

    const result = profileV2Service.profileV2({
      workspaceId: "weixin_stephen",
      learnerId: "weixin_stephen",
      programId: "program_science"
    });

    assert.equal(result.ok, true);
    assert.equal(result.summary.staleEvidenceCount, 1);
    assert.equal(result.staleEvidence[0].nodeId, "kg_science_variables");
    assert.equal(result.staleEvidence[0].evidenceFreshness.status, "stale");
    assert.equal(result.staleEvidence[0].evidenceFreshness.recencyBand, "stale");
    assert.equal(result.staleEvidence[0].staleReasons.includes("daily_evidence_stale"), true);
    assert.equal(result.staleEvidence[0].staleReasons.includes("strong_claim_requires_refresh"), true);
    assert.deepEqual(result.strengths, []);
    assert.equal(result.recommendedPlannerHints.strategy, "review");
    assert.equal(result.recommendedPlannerHints.cardRole, "practice");
    assert.deepEqual(result.recommendedPlannerHints.targetNodeIds, ["kg_science_variables"]);
    assert.equal(result.stageReadiness.status, "dormant");
  });
});

test("Profile V2 Owner correction does not refresh stale learning evidence", () => {
  withServices(({ evidenceLedgerService, profileV2Service }) => {
    assert.equal(evidenceLedgerService.writeEvidence({
      workspaceId: "weixin_stephen",
      learnerId: "weixin_stephen",
      programId: "program_science",
      graphNodeId: "kg_science_fair_test",
      graphNodeIds: ["kg_science_fair_test"],
      sourceType: "daily_evaluation",
      sourceId: "eval_old_low",
      sourceTaskCardId: "ltask_old_low",
      cardRole: "practice",
      evidenceWeight: 0.2,
      confidence: 0.58,
      scoreBand: "low",
      status: "needs_repair",
      summary: { feedbackSummary: "Fair-test explanation was weak." },
      recordedAt: "2026-05-01T09:00:00.000Z"
    }).ok, true);
    assert.equal(evidenceLedgerService.writeEvidence({
      workspaceId: "weixin_stephen",
      learnerId: "weixin_stephen",
      programId: "program_science",
      graphNodeId: "kg_science_fair_test",
      graphNodeIds: ["kg_science_fair_test"],
      sourceType: "owner_reviewed_correction",
      sourceId: "correction_recent",
      sourceTaskCardId: "ltask_old_low",
      cardRole: "owner_review",
      evidenceWeight: 0.05,
      confidence: 0.7,
      scoreBand: "medium",
      status: "observed",
      summary: {
        reason: "Owner confirmed the old weakness should be checked again.",
        note: "Bounded correction summary only."
      },
      recordedAt: "2026-06-14T09:30:00.000Z"
    }).ok, true);

    const result = profileV2Service.profileV2({
      workspaceId: "weixin_stephen",
      learnerId: "weixin_stephen",
      programId: "program_science"
    });
    const state = result.capabilityStates[0];

    assert.equal(result.ok, true);
    assert.equal(state.nodeId, "kg_science_fair_test");
    assert.equal(state.lastObservedAt, "2026-06-14T09:30:00.000Z");
    assert.equal(state.lastLearningEvidenceAt, "2026-05-01T09:00:00.000Z");
    assert.equal(state.lastCorrectionAt, "2026-06-14T09:30:00.000Z");
    assert.equal(state.stale, true);
    assert.equal(state.evidenceFreshness.status, "stale");
    assert.equal(state.evidenceFreshness.reasons.includes("daily_evidence_stale"), true);
    assert.equal(result.recommendedPlannerHints.strategy, "review");
    assert.equal(JSON.stringify(result).includes("RAW"), false);
  });
});

test("Profile V2 keeps recent formal assessment evidence fresh longer than daily evidence", () => {
  withServices(({ evidenceLedgerService, profileV2Service }) => {
    assert.equal(evidenceLedgerService.writeEvidence({
      workspaceId: "weixin_stephen",
      learnerId: "weixin_stephen",
      programId: "program_science",
      graphNodeId: "kg_science_observation",
      graphNodeIds: ["kg_science_observation"],
      sourceType: "stage_assessment",
      sourceId: "eval_formal_60_days",
      sourceTaskCardId: "stage_1",
      cardRole: "stage_assessment",
      evidenceWeight: 1,
      confidence: 0.91,
      scoreBand: "high",
      status: "mastered",
      summary: { feedbackSummary: "Observation language was stable in formal assessment." },
      recordedAt: "2026-04-15T09:00:00.000Z"
    }).ok, true);

    const result = profileV2Service.profileV2({
      workspaceId: "weixin_stephen",
      learnerId: "weixin_stephen",
      programId: "program_science"
    });
    const state = result.capabilityStates[0];

    assert.equal(result.ok, true);
    assert.equal(state.evidenceFreshness.sourceKind, "formal_assessment");
    assert.equal(state.evidenceFreshness.status, "current");
    assert.equal(state.evidenceFreshness.recencyBand, "aging");
    assert.equal(state.evidenceFreshness.staleAfterDays, 90);
    assert.equal(result.summary.staleEvidenceCount, 0);
    assert.equal(result.strengths[0].nodeId, "kg_science_observation");
    assert.equal(result.recommendedPlannerHints.strategy, "stretch");
  });
});

test("Profile V2 does not invent weakness for unobserved target nodes", () => {
  withServices(({ profileV2Service, repository }) => {
    assert.equal(repository.ensureSchema().ok, true);
    const result = profileV2Service.profileV2({
      workspaceId: "weixin_stephen",
      learnerId: "weixin_stephen",
      targetNodeIds: ["kg_unobserved"]
    });

    assert.equal(result.ok, true);
    assert.equal(result.summary.capabilityStateCount, 0);
    assert.deepEqual(result.weaknesses, []);
    assert.deepEqual(result.strengths, []);
  });
});
