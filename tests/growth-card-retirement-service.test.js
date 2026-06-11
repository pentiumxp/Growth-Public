const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const { createGrowthCardRetirementService } = require("../src/services/growth-card-retirement-service");
const { createCardRetirementRepository } = require("../src/stores/growth-learning-sqlite/card-retirement");
const { run: runRetirementScript } = require("../scripts/retire-growth-cards");

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "growth-card-retirement-"));
}

function createRepository(dbPath) {
  return createCardRetirementRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    }
  });
}

function createRetirementDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(`
      CREATE TABLE learning_task_cards (
        id TEXT PRIMARY KEY,
        program_id TEXT NOT NULL DEFAULT '',
        draft_id TEXT NOT NULL DEFAULT '',
        learner_id TEXT NOT NULL DEFAULT '',
        workspace_id TEXT NOT NULL DEFAULT '',
        kanban_card_id TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL DEFAULT '',
        domain TEXT NOT NULL DEFAULT '',
        task_card_type TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT '',
        planned_date TEXT NOT NULL DEFAULT '',
        planned_minutes INTEGER NOT NULL DEFAULT 0,
        skill_ids_json TEXT NOT NULL DEFAULT '[]',
        template_id TEXT NOT NULL DEFAULT '',
        interaction_state_machine_json TEXT NOT NULL DEFAULT '[]',
        source_basis_refs_json TEXT NOT NULL DEFAULT '[]',
        curriculum_refs_json TEXT NOT NULL DEFAULT '[]',
        privacy_level TEXT NOT NULL DEFAULT '',
        raw_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT '',
        card_role TEXT NOT NULL DEFAULT '',
        reward_cap_coins INTEGER NOT NULL DEFAULT 100,
        configured_reward_coins INTEGER NOT NULL DEFAULT 100,
        default_reward_coins INTEGER NOT NULL DEFAULT 100,
        expected_duration_minutes_min INTEGER NOT NULL DEFAULT 10,
        expected_duration_minutes_max INTEGER NOT NULL DEFAULT 15,
        stage_assessment_cycle_id TEXT NOT NULL DEFAULT '',
        activation_state TEXT NOT NULL DEFAULT '',
        activation_reason TEXT NOT NULL DEFAULT '',
        activation_source TEXT NOT NULL DEFAULT '',
        capability_cluster_id TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE learning_card_graph_bindings (
        binding_id TEXT PRIMARY KEY,
        task_card_id TEXT NOT NULL,
        learning_graph_plan_id TEXT NOT NULL
      );
      CREATE TABLE learning_growth_evaluation_jobs (
        id TEXT PRIMARY KEY,
        submission_id TEXT NOT NULL DEFAULT '',
        task_card_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        lease_owner TEXT NOT NULL DEFAULT '',
        lease_until TEXT NOT NULL DEFAULT '',
        last_error TEXT NOT NULL DEFAULT '',
        raw_json TEXT NOT NULL DEFAULT '{}',
        available_at TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT '',
        completed_at TEXT NOT NULL DEFAULT '',
        learner_id TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE learning_task_submissions (
        id TEXT PRIMARY KEY,
        task_card_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT '',
        submission_kind TEXT NOT NULL DEFAULT '',
        submitted_at TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT '',
        raw_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE learning_evaluations (
        id TEXT PRIMARY KEY,
        task_card_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT '',
        score REAL NOT NULL DEFAULT 0,
        passed INTEGER NOT NULL DEFAULT 0,
        summary TEXT NOT NULL DEFAULT '',
        confidence REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT '',
        raw_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE learning_task_reflections (
        id TEXT PRIMARY KEY,
        task_card_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT '',
        mode TEXT NOT NULL DEFAULT '',
        score REAL NOT NULL DEFAULT 0,
        summary TEXT NOT NULL DEFAULT '',
        audio_digest TEXT NOT NULL DEFAULT '',
        submitted_at TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT '',
        raw_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE learning_task_artifacts (
        id TEXT PRIMARY KEY,
        task_card_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE learning_task_audio_blobs (
        id TEXT PRIMARY KEY,
        task_card_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE learning_reward_settlements (
        id TEXT PRIMARY KEY,
        task_card_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL DEFAULT '',
        learner_id TEXT NOT NULL DEFAULT '',
        program_id TEXT NOT NULL DEFAULT '',
        session_id TEXT NOT NULL DEFAULT '',
        evaluation_id TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT '',
        coin_amount INTEGER NOT NULL DEFAULT 0,
        reason TEXT NOT NULL DEFAULT '',
        source_type TEXT NOT NULL DEFAULT '',
        source_id TEXT NOT NULL DEFAULT '',
        idempotency_key TEXT NOT NULL DEFAULT '',
        raw_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT '',
        settled_at TEXT NOT NULL DEFAULT ''
      );
    `);
  } finally {
    db.close();
  }
}

function insertCard(db, input = {}) {
  const raw = Object.assign({
    sequenceGroupId: "",
    sequenceMode: "",
    sequenceIndex: 1,
    instructionPreview: "Practice"
  }, input.raw || {});
  db.prepare(`
    INSERT INTO learning_task_cards(
      id, program_id, draft_id, learner_id, workspace_id, kanban_card_id,
      title, domain, task_card_type, status, planned_date, planned_minutes,
      skill_ids_json, template_id, interaction_state_machine_json,
      source_basis_refs_json, curriculum_refs_json, privacy_level, raw_json,
      created_at, updated_at, card_role, activation_state
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 15, '[]', 'template',
      '[]', '[]', '[]', 'member_self', ?, ?, ?, ?, ?)
  `).run(
    input.id,
    input.programId || "program_legacy",
    input.draftId || "draft_legacy",
    input.learnerId || "weixin_child",
    input.workspaceId || "weixin_child",
    input.kanbanCardId || "",
    input.title || input.id,
    input.domain || "english",
    input.taskCardType || "single_subject",
    input.status || "published",
    input.plannedDate || "2026-06-11",
    JSON.stringify(raw),
    input.createdAt || "2026-06-11T00:00:00.000Z",
    input.updatedAt || "2026-06-11T00:00:00.000Z",
    input.cardRole || "practice",
    input.activationState || "active"
  );
}

function setupDb() {
  const dir = tempDir();
  const dbPath = path.join(dir, "growth.sqlite3");
  createRetirementDb(dbPath);
  const db = new DatabaseSync(dbPath);
  try {
    insertCard(db, {
      id: "legacy_card",
      kanbanCardId: "kanban_legacy",
      title: "Everything Amazing reading",
      programId: "program_old_board"
    });
    insertCard(db, {
      id: "evergreen_card",
      title: "Evergreen reading",
      status: "completed",
      programId: "program_evergreen",
      raw: {
        sequenceGroupId: "evergreen:reading",
        sequenceMode: "evergreen_jit"
      }
    });
    insertCard(db, {
      id: "kg_seed_card",
      title: "KG pilot card",
      programId: "program_kg_pilot",
      raw: {
        source: "knowledge_graph_seed",
        sequenceGroupId: "kg_fanfan_igcse_bridge_pilot_v1",
        sequenceMode: "evergreen_jit"
      }
    });
    insertCard(db, {
      id: "cancelled_card",
      title: "Already hidden",
      status: "cancelled"
    });
    insertCard(db, {
      id: "graph_bound_card",
      title: "Native graph card",
      programId: "program_native_graph",
      raw: { learningGraphPlanId: "lgp_1" }
    });
    insertCard(db, {
      id: "other_workspace_card",
      workspaceId: "other_workspace",
      title: "Other workspace"
    });
    db.prepare("INSERT INTO learning_card_graph_bindings(binding_id, task_card_id, learning_graph_plan_id) VALUES ('binding_1', 'graph_bound_card', 'lgp_1')").run();
    db.prepare("INSERT INTO learning_growth_evaluation_jobs(id, task_card_id, workspace_id, status) VALUES ('job_legacy', 'legacy_card', 'weixin_child', 'pending')").run();
    db.prepare("INSERT INTO learning_growth_evaluation_jobs(id, task_card_id, workspace_id, status) VALUES ('job_evergreen', 'evergreen_card', 'weixin_child', 'retry')").run();
    db.prepare("INSERT INTO learning_growth_evaluation_jobs(id, task_card_id, workspace_id, status) VALUES ('job_kg_done', 'kg_seed_card', 'weixin_child', 'done')").run();
    db.prepare("INSERT INTO learning_growth_evaluation_jobs(id, task_card_id, workspace_id, status) VALUES ('job_graph', 'graph_bound_card', 'weixin_child', 'pending')").run();
    db.prepare("INSERT INTO learning_task_submissions(id, task_card_id, workspace_id) VALUES ('sub_legacy', 'legacy_card', 'weixin_child')").run();
    db.prepare("INSERT INTO learning_task_submissions(id, task_card_id, workspace_id) VALUES ('sub_evergreen', 'evergreen_card', 'weixin_child')").run();
  } finally {
    db.close();
  }
  return { dir, dbPath };
}

test("card retirement service dry-runs and retires regenerable non-graph-bound cards", () => {
  const { dir, dbPath } = setupDb();
  try {
    const repository = createRepository(dbPath);
    const service = createGrowthCardRetirementService({ cardRetirementRepository: repository });
    const dryRun = service.retireRegenerableCards({ workspaceId: "weixin_child" });
    assert.equal(dryRun.mode, "dry_run");
    assert.equal(dryRun.summary.candidateCount, 3);
    assert.equal(dryRun.summary.byReason.legacy_kanban_projection, 1);
    assert.equal(dryRun.summary.byReason.legacy_evergreen_regenerable_projection, 1);
    assert.equal(dryRun.summary.byReason.legacy_knowledge_graph_seed_projection, 1);
    assert.equal(dryRun.summary.relatedTotals.submissions, 2);

    const write = service.retireRegenerableCards({
      workspaceId: "weixin_child",
      write: true,
      now: "2026-06-11T12:00:00.000Z",
      reason: "retire old projections"
    });
    assert.equal(write.ok, true);
    assert.equal(write.retired_count, 3);
    assert.equal(write.remaining_candidates, 0);
    assert.deepEqual(write.cancelled_evaluation_jobs.jobIds.sort(), ["job_evergreen", "job_legacy"]);

    const db = new DatabaseSync(dbPath);
    try {
      assert.equal(db.prepare("SELECT status FROM learning_task_cards WHERE id = 'legacy_card'").get().status, "retired");
      assert.equal(db.prepare("SELECT status FROM learning_task_cards WHERE id = 'evergreen_card'").get().status, "retired");
      assert.equal(db.prepare("SELECT status FROM learning_task_cards WHERE id = 'kg_seed_card'").get().status, "retired");
      assert.equal(db.prepare("SELECT status FROM learning_task_cards WHERE id = 'cancelled_card'").get().status, "cancelled");
      assert.equal(db.prepare("SELECT status FROM learning_task_cards WHERE id = 'graph_bound_card'").get().status, "published");
      assert.equal(db.prepare("SELECT status FROM learning_growth_evaluation_jobs WHERE id = 'job_graph'").get().status, "pending");
      assert.equal(db.prepare("SELECT status FROM learning_growth_evaluation_jobs WHERE id = 'job_legacy'").get().status, "cancelled");
      const raw = JSON.parse(db.prepare("SELECT raw_json FROM learning_task_cards WHERE id = 'legacy_card'").get().raw_json);
      assert.equal(raw.growthRetirement.previousStatus, "published");
      assert.equal(raw.growthRetirement.regenerationPolicy, "regenerate_from_native_graph_or_card_generator");
    } finally {
      db.close();
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("retire growth cards script defaults to dry-run and backs up write mode", () => {
  const { dir, dbPath } = setupDb();
  try {
    const dryRun = runRetirementScript({
      targetDb: dbPath,
      workspaceId: "weixin_child",
      dryRun: true
    });
    assert.equal(dryRun.ok, true);
    assert.equal(dryRun.mode, "dry_run");
    assert.equal(dryRun.summary.candidateCount, 3);
    assert.equal(dryRun.before_board.card_count, 4);
    assert.equal(dryRun.backup, "");

    const write = runRetirementScript({
      targetDb: dbPath,
      workspaceId: "weixin_child",
      write: true,
      backupDir: path.join(dir, "backups")
    });
    assert.equal(write.ok, true);
    assert.equal(write.mode, "write");
    assert.equal(write.retired_count, 3);
    assert.equal(write.after_board.card_count, 1);
    assert.equal(fs.existsSync(write.backup), true);
    assert.equal(write.quick_check, "ok");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
