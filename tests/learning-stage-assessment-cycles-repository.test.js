const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createStageAssessmentCycleRepository,
  stableStageAssessmentCycleId
} = require("../src/stores/growth-learning-sqlite/stage-assessment-cycles");

function tempDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-stage-cycles-"));
  return path.join(dir, "growth-learning.sqlite3");
}

function repositoryFor(dbPath, now = () => new Date("2026-06-14T08:00:00.000Z")) {
  return createStageAssessmentCycleRepository({
    now,
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    }
  });
}

function createCycleTable(db) {
  db.exec(`
    CREATE TABLE learning_growth_stage_assessment_cycles (
      id TEXT PRIMARY KEY,
      learner_workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      subject_id TEXT NOT NULL DEFAULT '',
      capability_cluster_id TEXT NOT NULL,
      target_node_ids_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL,
      activation_reason TEXT NOT NULL DEFAULT '',
      activation_source TEXT NOT NULL DEFAULT '',
      eligible_at TEXT NOT NULL DEFAULT '',
      activated_at TEXT NOT NULL DEFAULT '',
      completed_at TEXT NOT NULL DEFAULT '',
      cooldown_until TEXT NOT NULL DEFAULT '',
      source_card_ids_json TEXT NOT NULL DEFAULT '[]',
      raw_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

test("stage assessment cycle repository writes and reads plugin cycle rows", () => {
  const dbPath = tempDbPath();
  const db = new DatabaseSync(dbPath);
  try {
    createCycleTable(db);
  } finally {
    db.close();
  }
  const repository = repositoryFor(dbPath);

  const saved = repository.saveCycle({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_english",
    subjectId: "english",
    capabilityClusterId: "reading_main_idea",
    targetNodeIds: ["kg_main_idea", "kg_inference"],
    status: "eligible",
    activationReason: "enough_recent_practice",
    activationSource: "system",
    eligibleAt: "2026-06-14T08:00:00.000Z",
    sourceCardIds: ["card_1", "card_2"]
  });

  assert.equal(saved.ok, true);
  assert.equal(saved.cycle.workspaceId, "weixin_fanfan");
  assert.equal(saved.cycle.status, "eligible");
  assert.deepEqual(saved.cycle.targetNodeIds, ["kg_main_idea", "kg_inference"]);
  assert.deepEqual(saved.cycle.sourceCardIds, ["card_1", "card_2"]);

  const latest = repository.latestCycle({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_english",
    subjectId: "english",
    capabilityClusterId: "reading_main_idea"
  });
  assert.equal(latest.cycleId, saved.cycle.cycleId);
  assert.equal(latest.activationReason, "enough_recent_practice");
});

test("stage assessment cycle ids are stable for the same learner and coverage", () => {
  const first = stableStageAssessmentCycleId({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_english",
    subjectId: "english",
    capabilityClusterId: "reading_main_idea",
    targetNodeIds: ["kg_main_idea", "kg_inference"]
  });
  const second = stableStageAssessmentCycleId({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_english",
    subjectId: "english",
    capabilityClusterId: "reading_main_idea",
    targetNodeIds: ["kg_main_idea", "kg_inference"]
  });

  assert.equal(first, second);
  assert.match(first, /^lgsa_[a-f0-9]{18}$/);
});
