const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const { createLearningEvidenceAuditService } = require("../src/services/learning-evidence-audit-service");
const { createLearningEvidenceLedgerService } = require("../src/services/learning-evidence-ledger-service");
const { createLearningEvidenceLedgerRepository } = require("../src/stores/growth-learning-sqlite/evidence-ledger");

function withAudit(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-evidence-audit-"));
  const dbPath = path.join(dir, "evidence-audit.sqlite3");
  const repository = createLearningEvidenceLedgerRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    }
  });
  repository.ensureSchema();
  const evidenceLedgerService = createLearningEvidenceLedgerService({ repository });
  const evidenceAuditService = createLearningEvidenceAuditService({ evidenceLedgerService });
  try {
    return callback({ repository, evidenceLedgerService, evidenceAuditService });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("learning evidence audit service lists bounded public evidence with filters", () => {
  withAudit(({ repository, evidenceLedgerService, evidenceAuditService }) => {
    const daily = evidenceLedgerService.writeEvidence({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      graphNodeId: "kg_science_fair_test",
      graphNodeIds: ["kg_science_fair_test", "kg_science_variables"],
      sourceType: "daily_evaluation",
      sourceId: "eval_science_daily_1",
      sourceTaskCardId: "ltask_science_1",
      cardRole: "practice",
      evidenceWeight: 0.2,
      confidence: 0.74,
      scoreBand: "medium",
      status: "observed",
      summary: {
        summaryOnly: true,
        taskCardId: "ltask_science_1",
        title: "Fair test daily practice",
        feedbackSummary: "Controlled one variable and identified a measurement gap.",
        strengths: ["Clear variable control."],
        remainingWeaknesses: ["State measured result."]
      },
      recordedAt: "2026-06-15T08:00:00.000Z"
    });
    assert.equal(daily.ok, true);
    assert.equal(repository.recordEvidence({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      graphNodeId: "kg_science_fair_test",
      graphNodeIds: ["kg_science_fair_test"],
      sourceType: "backfill_summary",
      sourceId: "legacy_summary_with_raw",
      sourceTaskCardId: "legacy_card_1",
      cardRole: "practice",
      evidenceWeight: 0.1,
      confidence: 0.4,
      scoreBand: "low",
      status: "weak",
      summary: {
        summaryOnly: true,
        feedbackSummary: "Legacy bounded summary.",
        rawAnswer: "RAW LEARNER ANSWER",
        sourceDocumentBody: "PRIVATE SOURCE BODY"
      },
      recordedAt: "2026-06-15T07:00:00.000Z"
    }).ok, true);

    const result = evidenceAuditService.listEvidenceAudit({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "凡凡",
      programId: "program_science",
      sourceType: "daily_evaluation",
      sourceId: "eval_science_daily_1",
      taskCardId: "ltask_science_1",
      cardRole: "practice",
      status: "observed",
      targetNodeIds: ["kg_science_fair_test"],
      limit: 999
    });

    assert.equal(result.ok, true);
    assert.equal(result.target.workspaceId, "weixin_fanfan");
    assert.equal(result.target.learnerId, "fanfan");
    assert.equal(result.target.displayName, "凡凡");
    assert.equal(result.filters.limit, 100);
    assert.equal(result.count, 1);
    assert.equal(result.summary.evidenceCount, 1);
    assert.deepEqual(result.summary.sourceTypeCounts, { daily_evaluation: 1 });
    assert.equal(result.evidence[0].sourceId, "eval_science_daily_1");
    assert.equal(result.evidence[0].summary.feedbackSummary.includes("Controlled one variable"), true);
    assert.equal(JSON.stringify(result).includes("RAW LEARNER ANSWER"), false);
    assert.equal(JSON.stringify(result).includes("sourceDocumentBody"), false);

    const rawSeed = evidenceAuditService.listEvidenceAudit({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      sourceType: "backfill_summary",
      limit: 5
    });
    assert.equal(rawSeed.ok, true);
    assert.equal(rawSeed.count, 1);
    assert.equal(rawSeed.evidence[0].summary.feedbackSummary, "Legacy bounded summary.");
    assert.equal(JSON.stringify(rawSeed).includes("RAW LEARNER ANSWER"), false);
  });
});

test("learning evidence audit service fails closed without scope or ledger", () => {
  const unavailable = createLearningEvidenceAuditService();
  assert.deepEqual(unavailable.listEvidenceAudit({ workspaceId: "" }), {
    ok: false,
    error: "learning_evidence_audit_workspace_required"
  });
  assert.deepEqual(unavailable.listEvidenceAudit({ workspaceId: "weixin_fanfan" }), {
    ok: false,
    available: false,
    error: "learning_evidence_audit_ledger_unavailable"
  });
});
