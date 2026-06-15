const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const { createLearningEvidenceLedgerService } = require("../src/services/learning-evidence-ledger-service");
const { createLearningEvidenceLedgerRepository } = require("../src/stores/growth-learning-sqlite/evidence-ledger");

function withLedger(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-evidence-ledger-"));
  const dbPath = path.join(dir, "ledger.sqlite3");
  const repository = createLearningEvidenceLedgerRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    }
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function dailyTaskCard() {
  return {
    id: "ltask_daily_science_1",
    workspace_id: "weixin_stephen",
    learner_id: "weixin_stephen",
    program_id: "program_science",
    title: "Explain a fair test",
    card_role: "practice",
    raw_json: JSON.stringify({
      completionPolicy: { mode: "daily_score_once" },
      learningGraph: { targetNodeIds: ["kg_science_fair_test"] }
    })
  };
}

test("evidence ledger records daily evaluation evidence idempotently without raw payloads", () => {
  withLedger(({ dbPath, repository }) => {
    const service = createLearningEvidenceLedgerService({
      repository,
      now: () => new Date("2026-06-14T11:00:00.000Z")
    });

    const first = service.recordEvaluationEvidence({
      taskCard: dailyTaskCard(),
      evaluation: {
        evaluationId: "eval_science_daily_1",
        status: "completed",
        score: 72,
        passed: true,
        confidence: 0.76,
        summary: "Explains one controlled variable but needs clearer measurement evidence.",
        remainingWeaknesses: ["Name the measured result."]
      }
    });
    const replay = service.recordEvaluationEvidence({
      taskCard: dailyTaskCard(),
      evaluation: {
        evaluationId: "eval_science_daily_1",
        status: "completed",
        score: 72,
        passed: true,
        confidence: 0.76,
        summary: "Explains one controlled variable but needs clearer measurement evidence.",
        remainingWeaknesses: ["Name the measured result."]
      }
    });

    assert.equal(first.ok, true);
    assert.equal(first.evidenceCount, 1);
    assert.equal(first.entries[0].sourceType, "daily_evaluation");
    assert.equal(first.entries[0].evidenceWeight, 0.2);
    assert.equal(first.entries[0].scoreBand, "medium");
    assert.equal(replay.ok, true);
    assert.equal(replay.duplicateCount, 1);

    const db = new DatabaseSync(dbPath, { open: true, readOnly: true });
    try {
      const rows = db.prepare("SELECT * FROM learning_growth_evidence_ledger").all();
      assert.equal(rows.length, 1);
      assert.equal(rows[0].privacy_class, "summary_only");
      assert.equal(JSON.stringify(rows).includes("RAW LEARNER ANSWER"), false);
    } finally {
      db.close();
    }
  });
});

test("evidence ledger records formal assessment as high-weight stage evidence", () => {
  withLedger(({ repository }) => {
    const service = createLearningEvidenceLedgerService({
      repository,
      now: () => new Date("2026-06-14T12:00:00.000Z")
    });

    const result = service.recordEvaluationEvidence({
      taskCard: {
        id: "stage_science_1",
        workspace_id: "weixin_stephen",
        learner_id: "weixin_stephen",
        program_id: "program_science",
        title: "Fair test checkpoint",
        card_role: "stage_assessment",
        mastery_evidence_weight: 1,
        raw_json: JSON.stringify({
          completionPolicy: { mode: "formal_assessment" },
          learningGraph: {
            targetNodeIds: ["kg_science_fair_test"],
            assessmentCoverageNodeIds: ["kg_science_fair_test", "kg_science_variables"]
          }
        })
      },
      evaluation: {
        evaluationId: "eval_stage_science_1",
        status: "completed",
        score: 90,
        passed: true,
        confidence: 0.91,
        summary: "Formal evidence confirms independent fair-test reasoning.",
        remainingWeaknesses: []
      }
    });

    assert.equal(result.ok, true);
    assert.equal(result.evidenceCount, 2);
    assert.equal(result.entries.every((item) => item.sourceType === "stage_assessment"), true);
    assert.equal(result.entries.every((item) => item.evidenceWeight === 1), true);
    assert.deepEqual(result.entries.map((item) => item.graphNodeId).sort(), ["kg_science_fair_test", "kg_science_variables"]);
  });
});

test("evidence ledger rejects raw learner/private fields", () => {
  withLedger(({ repository }) => {
    const service = createLearningEvidenceLedgerService({ repository });

    const result = service.recordEvaluationEvidence({
      taskCard: dailyTaskCard(),
      evaluation: {
        evaluationId: "eval_privacy",
        score: 80,
        summary: "Bounded summary.",
        rawPrivateAnswer: "RAW LEARNER ANSWER"
      }
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, "learning_evidence_privacy_failed");
    assert.deepEqual(result.privacyFindings, ["$.rawPrivateAnswer"]);
  });
});
