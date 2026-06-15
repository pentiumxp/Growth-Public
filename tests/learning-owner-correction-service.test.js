const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const { createLearningEvidenceLedgerService } = require("../src/services/learning-evidence-ledger-service");
const { createLearningOwnerCorrectionService } = require("../src/services/learning-owner-correction-service");
const { createLearningProfileV2Service } = require("../src/services/learning-profile-v2-service");
const { createLearningEvidenceLedgerRepository } = require("../src/stores/growth-learning-sqlite/evidence-ledger");

function withServices(callback, overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-owner-correction-"));
  const dbPath = path.join(dir, "owner-correction.sqlite3");
  const repository = createLearningEvidenceLedgerRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    }
  });
  repository.ensureSchema();
  const evidenceLedgerService = createLearningEvidenceLedgerService({
    repository,
    now: () => new Date("2026-06-15T09:00:00.000Z")
  });
  const targetProvisioningService = overrides.targetProvisioningService || {
    resolveSelection(input) {
      return {
        ok: true,
        targetEnabled: true,
        mode: "sample_default",
        workspaceId: input.workspaceId,
        learnerId: input.learnerId,
        selectedDomainPackId: input.domainPackId || "uk_hk_curriculum_foundation",
        selectedSubject: input.subject || "science",
        selectedTargetNodeIds: input.targetNodeIds || []
      };
    }
  };
  const ownerCorrectionService = createLearningOwnerCorrectionService({
    evidenceLedgerService,
    targetProvisioningService,
    now: () => new Date("2026-06-15T10:00:00.000Z")
  });
  const profileV2Service = createLearningProfileV2Service({
    evidenceLedgerService,
    now: () => new Date("2026-06-15T10:00:00.000Z")
  });
  try {
    return callback({ dbPath, evidenceLedgerService, ownerCorrectionService, profileV2Service });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("Owner correction writes summary-only ledger evidence, reads back, and updates Profile V2", () => {
  withServices(({ dbPath, evidenceLedgerService, ownerCorrectionService, profileV2Service }) => {
    assert.equal(evidenceLedgerService.writeEvidence({
      workspaceId: "weixin_stephen",
      learnerId: "fanfan",
      programId: "program_science",
      graphNodeId: "kg_science_fair_test",
      graphNodeIds: ["kg_science_fair_test"],
      sourceType: "stage_assessment",
      sourceId: "eval_stage_strong",
      sourceTaskCardId: "stage_card_1",
      cardRole: "stage_assessment",
      evidenceWeight: 1,
      confidence: 0.9,
      scoreBand: "high",
      status: "mastered",
      summary: { feedbackSummary: "Formal evidence looked stable." },
      recordedAt: "2026-06-15T08:30:00.000Z"
    }).ok, true);

    const correction = ownerCorrectionService.recordCorrection({
      workspaceId: "weixin_stephen",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      subject: "science",
      targetNodeIds: ["kg_science_fair_test"],
      reviewAction: "mark_needs_repair",
      profileDeltaId: "lgpdelta_eval_stage_strong",
      evaluationId: "eval_stage_strong",
      taskCardId: "stage_card_1",
      sourceEvidenceIds: ["lgevd_formal_1"],
      reason: "Owner review found that the measured-result explanation is still fragile.",
      reviewedBy: "owner"
    });
    const replay = ownerCorrectionService.recordCorrection({
      workspaceId: "weixin_stephen",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      subject: "science",
      targetNodeIds: ["kg_science_fair_test"],
      reviewAction: "mark_needs_repair",
      profileDeltaId: "lgpdelta_eval_stage_strong",
      evaluationId: "eval_stage_strong",
      taskCardId: "stage_card_1",
      sourceEvidenceIds: ["lgevd_formal_1"],
      reason: "Owner review found that the measured-result explanation is still fragile.",
      reviewedBy: "owner"
    });

    assert.equal(correction.ok, true);
    assert.equal(correction.evidenceLedger.evidenceCount, 1);
    assert.equal(correction.evidenceLedger.entries[0].sourceType, "owner_reviewed_correction");
    assert.equal(correction.evidenceLedger.entries[0].status, "needs_repair");
    assert.equal(correction.correction.profileDeltaId, "lgpdelta_eval_stage_strong");
    assert.equal(replay.ok, true);
    assert.equal(replay.evidenceLedger.duplicateCount, 1);

    const listed = ownerCorrectionService.listCorrections({
      workspaceId: "weixin_stephen",
      learnerId: "fanfan",
      programId: "program_science"
    });
    assert.equal(listed.ok, true);
    assert.equal(listed.count, 1);
    assert.equal(listed.corrections[0].status, "needs_repair");
    assert.equal(listed.corrections[0].targetNodeIds[0], "kg_science_fair_test");
    assert.equal(JSON.stringify(listed).includes("RAW"), false);

    const profile = profileV2Service.profileV2({
      workspaceId: "weixin_stephen",
      learnerId: "fanfan",
      programId: "program_science"
    });
    assert.equal(profile.ok, true);
    assert.equal(profile.weaknesses[0].nodeId, "kg_science_fair_test");
    assert.equal(profile.capabilityStates[0].status, "needs_repair");
    assert.equal(profile.capabilityStates[0].sourceTypes.includes("owner_reviewed_correction"), true);
    assert.equal(profile.capabilityStates[0].summaries.some((item) => item.includes("Owner review")), true);
    assert.equal(profile.recommendedPlannerHints.strategy, "repair");

    const db = new DatabaseSync(dbPath, { open: true, readOnly: true });
    try {
      const rows = db.prepare("SELECT * FROM learning_growth_evidence_ledger ORDER BY created_at").all();
      assert.equal(rows.length, 2);
      assert.equal(rows[1].source_type, "owner_reviewed_correction");
      assert.equal(rows[1].privacy_class, "summary_only");
    } finally {
      db.close();
    }
  });
});

test("Owner correction rejects privacy-risk payloads before ledger writes", () => {
  withServices(({ ownerCorrectionService, evidenceLedgerService }) => {
    const result = ownerCorrectionService.recordCorrection({
      workspaceId: "weixin_stephen",
      learnerId: "fanfan",
      targetNodeIds: ["kg_science_fair_test"],
      reviewAction: "mark_stable",
      rawAnswer: "RAW LEARNER ANSWER"
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, "learning_owner_correction_privacy_failed");
    assert.deepEqual(result.privacyFindings, ["$.rawAnswer"]);
    assert.deepEqual(evidenceLedgerService.listEvidence({ workspaceId: "weixin_stephen" }), []);
  });
});

test("Owner correction enforces learning target provisioning before evidence write", () => {
  withServices(({ ownerCorrectionService, evidenceLedgerService }) => {
    const result = ownerCorrectionService.recordCorrection({
      workspaceId: "weixin_other",
      learnerId: "other",
      targetNodeIds: ["kg_science_fair_test"],
      reviewAction: "mark_needs_repair",
      reason: "Bounded Owner note."
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, "learning_target_not_provisioned");
    assert.equal(result.targetProvisioning.targetEnabled, false);
    assert.deepEqual(evidenceLedgerService.listEvidence({ workspaceId: "weixin_other" }), []);
  }, {
    targetProvisioningService: {
      resolveSelection() {
        return { ok: false, targetEnabled: false, error: "learning_target_not_provisioned" };
      }
    }
  });
});
