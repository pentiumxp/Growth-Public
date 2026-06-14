const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const { createLearningMasteryProfileService } = require("../src/services/learning-mastery-profile-service");
const { createMasteryProfileRepository } = require("../src/stores/growth-learning-sqlite/mastery-profile");

function withProfileDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-mastery-profile-"));
  const dbPath = path.join(dir, "profile.sqlite3");
  const setup = new DatabaseSync(dbPath);
  try {
    setup.exec(`
      CREATE TABLE learning_growth_mastery_states (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        learner_id TEXT NOT NULL,
        program_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        status TEXT NOT NULL,
        mastery_level TEXT NOT NULL DEFAULT '',
        score REAL NOT NULL DEFAULT 0,
        confidence REAL NOT NULL DEFAULT 0,
        evidence_count INTEGER NOT NULL DEFAULT 0,
        summary TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL,
        raw_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE learning_growth_experience_signals (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        learner_id TEXT NOT NULL,
        program_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        signal_type TEXT NOT NULL,
        strength TEXT NOT NULL DEFAULT '',
        summary TEXT NOT NULL DEFAULT '',
        source_type TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        raw_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE learning_growth_card_trajectories (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        learner_id TEXT NOT NULL,
        program_id TEXT NOT NULL,
        task_card_id TEXT NOT NULL,
        source_evaluation_id TEXT NOT NULL DEFAULT '',
        strategy TEXT NOT NULL DEFAULT '',
        difficulty_band TEXT NOT NULL DEFAULT '',
        target_node_ids_json TEXT NOT NULL DEFAULT '[]',
        performance_summary TEXT NOT NULL DEFAULT '',
        confirmed_strengths_json TEXT NOT NULL DEFAULT '[]',
        remaining_weaknesses_json TEXT NOT NULL DEFAULT '[]',
        mastery_changes_json TEXT NOT NULL DEFAULT '[]',
        next_recommendation_json TEXT NOT NULL DEFAULT '{}',
        raw_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  } finally {
    setup.close();
  }
  const repository = createMasteryProfileRepository({
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

function taskCard() {
  return {
    id: "ltask_english_1",
    learner_id: "weixin_stephen",
    workspace_id: "weixin_stephen",
    program_id: "program_english",
    title: "Use evidence in an answer",
    skill_ids_json: "[\"kg_english_evidence_answering\"]",
    raw_json: JSON.stringify({
      learningGraph: {
        targetNodeIds: ["kg_english_evidence_answering"]
      },
      completionPolicy: { mode: "daily_score_once" }
    })
  };
}

test("mastery profile service writes summary-only evidence and blocks raw answer leakage", () => {
  withProfileDb(({ dbPath, repository }) => {
    const service = createLearningMasteryProfileService({
      repository,
      now: () => new Date("2026-06-14T05:00:00.000Z")
    });

    const result = service.recordEvaluationEvidence({
      taskCard: taskCard(),
      evaluation: {
        evaluationId: "eval_1",
        status: "completed",
        score: 48,
        passed: false,
        confidence: 0.74,
        summary: "The answer used a reason but did not quote evidence.",
        remainingWeaknesses: ["Needs direct text evidence."],
        rawPrivateAnswer: "PRIVATE RAW LEARNER ANSWER SHOULD NOT BE STORED"
      }
    });

    assert.equal(result.ok, true);
    assert.equal(result.masteryChanges[0].nodeId, "kg_english_evidence_answering");
    assert.equal(result.masteryChanges[0].to, "needs_repair");
    assert.equal(result.experienceSignals[0].signalType, "not_learned");

    const db = new DatabaseSync(dbPath);
    try {
      const row = db.prepare("SELECT * FROM learning_growth_mastery_states").get();
      assert.equal(row.node_id, "kg_english_evidence_answering");
      assert.equal(row.status, "needs_repair");
      assert.equal(row.evidence_count, 1);
      const storedText = JSON.stringify(row);
      assert.equal(storedText.includes("PRIVATE RAW LEARNER ANSWER"), false);
      assert.equal(storedText.includes("rawPrivateAnswer"), false);
    } finally {
      db.close();
    }
  });
});

test("mastery profile service is idempotent for the same evaluation evidence", () => {
  withProfileDb(({ dbPath, repository }) => {
    const service = createLearningMasteryProfileService({
      repository,
      now: () => new Date("2026-06-14T05:00:00.000Z")
    });
    const input = {
      taskCard: taskCard(),
      evaluation: {
        evaluationId: "eval_replay",
        status: "completed",
        score: 92,
        passed: true,
        confidence: 0.86,
        summary: "Uses direct evidence clearly.",
        remainingWeaknesses: []
      }
    };

    assert.equal(service.recordEvaluationEvidence(input).ok, true);
    const replay = service.recordEvaluationEvidence(input);
    assert.equal(replay.ok, true);
    assert.equal(replay.duplicateEvidenceCount, 1);

    const db = new DatabaseSync(dbPath);
    try {
      const row = db.prepare("SELECT evidence_count, status FROM learning_growth_mastery_states").get();
      assert.equal(row.evidence_count, 1);
      assert.equal(row.status, "strengthening");
      assert.equal(db.prepare("SELECT COUNT(*) AS count FROM learning_growth_experience_signals").get().count, 1);
    } finally {
      db.close();
    }
  });
});

test("formal stage assessment evidence carries higher mastery weight and coverage", () => {
  withProfileDb(({ dbPath, repository }) => {
    const service = createLearningMasteryProfileService({
      repository,
      now: () => new Date("2026-06-14T05:00:00.000Z")
    });
    const daily = service.recordEvaluationEvidence({
      taskCard: taskCard(),
      evaluation: {
        evaluationId: "eval_daily_low",
        status: "completed",
        score: 50,
        passed: true,
        confidence: 0.72,
        summary: "Daily practice showed partial evidence use.",
        remainingWeaknesses: ["Needs exact quotation."]
      }
    });
    assert.equal(daily.ok, true);
    assert.equal(daily.evidenceWeight, 0.2);
    assert.equal(daily.evidenceRole, "daily_practice");

    const formal = service.recordEvaluationEvidence({
      taskCard: {
        id: "stage_card_1",
        learner_id: "weixin_stephen",
        workspace_id: "weixin_stephen",
        program_id: "program_english",
        title: "Formal evidence checkpoint",
        card_role: "stage_assessment",
        stage_assessment_cycle_id: "cycle_stage_1",
        mastery_evidence_weight: 1,
        skill_ids_json: JSON.stringify(["kg_english_evidence_answering"]),
        raw_json: JSON.stringify({
          completionPolicy: { mode: "formal_assessment" },
          learningGraph: {
            targetNodeIds: ["kg_english_evidence_answering"],
            assessmentCoverageNodeIds: ["kg_english_evidence_answering", "kg_english_claim_reason"]
          },
          stageAssessment: { cycleId: "cycle_stage_1" }
        })
      },
      evaluation: {
        evaluationId: "eval_stage_high",
        status: "completed",
        score: 90,
        passed: true,
        confidence: 0.9,
        summary: "Formal assessment confirms independent evidence use.",
        remainingWeaknesses: []
      }
    });

    assert.equal(formal.ok, true);
    assert.equal(formal.evidenceWeight, 1);
    assert.equal(formal.evidenceRole, "formal_assessment");
    assert.deepEqual(formal.targetNodeIds.sort(), ["kg_english_claim_reason", "kg_english_evidence_answering"]);
    assert.equal(formal.masteryChanges.find((item) => item.nodeId === "kg_english_evidence_answering").to, "mastered");

    const db = new DatabaseSync(dbPath);
    try {
      const rows = db.prepare("SELECT * FROM learning_growth_mastery_states ORDER BY node_id").all();
      assert.equal(rows.length, 2);
      const primary = rows.find((row) => row.node_id === "kg_english_evidence_answering");
      assert.equal(primary.status, "mastered");
      assert.equal(primary.score, 83);
      assert.equal(primary.evidence_count, 2);
      const raw = JSON.parse(primary.raw_json);
      assert.equal(raw.summaryOnly, true);
      assert.equal(raw.lastEvidenceWeight, 1);
      assert.equal(raw.lastEvidenceRole, "formal_assessment");
      assert.equal(raw.evidenceWeightTotal, 1.2);
      assert.equal(raw.formalEvidenceCount, 1);
      assert.equal(raw.dailyEvidenceCount, 1);
      assert.equal(JSON.stringify(raw).includes("PRIVATE RAW LEARNER ANSWER"), false);
      const coverage = rows.find((row) => row.node_id === "kg_english_claim_reason");
      assert.equal(coverage.status, "mastered");
      assert.equal(coverage.score, 90);
      assert.equal(coverage.evidence_count, 1);
    } finally {
      db.close();
    }
  });
});
