const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const {
  REQUIRED_GROWTH_TABLES,
  createGrowthLearningSqliteStore
} = require("../src/stores/growth-learning-sqlite-store");
const { run: runImport } = require("../scripts/import-growth-learning-sqlite");

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "growth-learning-sqlite-"));
}

function createSourceDb(dbPath, suffix = "") {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  try {
    for (const table of REQUIRED_GROWTH_TABLES) {
      if (table === "learning_task_cards") continue;
      if (table === "learning_task_submissions") continue;
      if (table === "learning_evaluations") continue;
      if (table === "learning_task_reflections") continue;
      if (table === "learning_task_artifacts") continue;
      db.exec(`CREATE TABLE ${table} (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL DEFAULT '')`);
    }
    db.exec(`
      CREATE TABLE learning_task_cards (
        id TEXT PRIMARY KEY,
        program_id TEXT NOT NULL,
        draft_id TEXT NOT NULL,
        learner_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        kanban_card_id TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL,
        domain TEXT NOT NULL,
        task_card_type TEXT NOT NULL,
        status TEXT NOT NULL,
        planned_date TEXT NOT NULL,
        planned_minutes INTEGER NOT NULL,
        skill_ids_json TEXT NOT NULL,
        template_id TEXT NOT NULL,
        interaction_state_machine_json TEXT NOT NULL,
        source_basis_refs_json TEXT NOT NULL,
        curriculum_refs_json TEXT NOT NULL,
        privacy_level TEXT NOT NULL,
        card_role TEXT NOT NULL DEFAULT '',
        capability_cluster_id TEXT NOT NULL DEFAULT '',
        expected_duration_minutes_min INTEGER NOT NULL DEFAULT 10,
        expected_duration_minutes_max INTEGER NOT NULL DEFAULT 15,
        stage_assessment_cycle_id TEXT NOT NULL DEFAULT '',
        activation_state TEXT NOT NULL DEFAULT '',
        reward_cap_coins INTEGER NOT NULL DEFAULT 100,
        configured_reward_coins INTEGER NOT NULL DEFAULT 100,
        default_reward_coins INTEGER NOT NULL DEFAULT 100,
        raw_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE learning_task_submissions (
        id TEXT PRIMARY KEY,
        task_card_id TEXT NOT NULL,
        status TEXT NOT NULL,
        submission_kind TEXT NOT NULL DEFAULT '',
        submitted_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        workspace_id TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE learning_evaluations (
        id TEXT PRIMARY KEY,
        task_card_id TEXT NOT NULL,
        status TEXT NOT NULL,
        score REAL NOT NULL DEFAULT 0,
        passed INTEGER NOT NULL DEFAULT 0,
        summary TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        workspace_id TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE learning_task_reflections (
        id TEXT PRIMARY KEY,
        task_card_id TEXT NOT NULL,
        status TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT '',
        score REAL NOT NULL DEFAULT 0,
        summary TEXT NOT NULL DEFAULT '',
        submitted_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        workspace_id TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE learning_task_artifacts (
        id TEXT PRIMARY KEY,
        task_card_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL DEFAULT ''
      );
    `);
    db.prepare(`
      INSERT INTO learning_task_cards(
        id, program_id, draft_id, learner_id, workspace_id, title, domain,
        task_card_type, status, planned_date, planned_minutes, skill_ids_json,
        template_id, interaction_state_machine_json, source_basis_refs_json,
        curriculum_refs_json, privacy_level, card_role, capability_cluster_id,
        raw_json, created_at, updated_at
      ) VALUES (?, 'program_1', 'draft_1', 'weixin_child', 'weixin_child', ?, 'english',
        'practice', 'active', '2026-06-10', 15, '[]',
        'template_1', '[]', '[]', '[]', 'member_self', 'practice',
        'english.reading', ?, '2026-06-10T00:00:00.000Z', '2026-06-10T00:00:00.000Z')
    `).run(`card_${suffix || "1"}`, `Read ${suffix || "one"}`, JSON.stringify({
      instructionPreview: `Practice ${suffix || "reading"}`
    }));
    db.prepare("INSERT INTO learning_task_submissions(id, task_card_id, status, submission_kind, submitted_at, created_at, workspace_id) VALUES (?, ?, 'submitted', 'text', '2026-06-10T00:01:00.000Z', '2026-06-10T00:01:00.000Z', 'weixin_child')")
      .run(`submission_${suffix || "1"}`, `card_${suffix || "1"}`);
  } finally {
    db.close();
  }
}

test("reads Growth plugin-owned SQLite board and card projections", () => {
  const root = tmpDir();
  const dbPath = path.join(root, "growth-learning.sqlite3");
  createSourceDb(dbPath);
  const store = createGrowthLearningSqliteStore({ dbPath });

  const integrity = store.integrity({ workspaceId: "weixin_child" });
  assert.equal(integrity.ok, true);
  assert.equal(integrity.quick_check, "ok");
  assert.equal(integrity.counts.learning_task_cards, 1);

  const board = store.board({ workspaceId: "weixin_child" });
  assert.equal(board.source, "growth-plugin-sqlite");
  assert.equal(board.summary.total, 1);
  assert.equal(board.cards[0].taskCardId, "card_1");
  assert.equal(board.cards[0].latestSubmission.submissionId, "submission_1");

  const card = store.card({ workspaceId: "weixin_child", taskCardId: "card_1" });
  assert.equal(card.ok, true);
  assert.equal(card.card.title, "Read one");
});

test("imports, backs up, and rolls back Growth learning SQLite", () => {
  const root = tmpDir();
  const sourceDb = path.join(root, "source.sqlite3");
  const replacementDb = path.join(root, "replacement.sqlite3");
  const targetDb = path.join(root, "target.sqlite3");
  createSourceDb(sourceDb, "1");
  createSourceDb(replacementDb, "2");

  const dryRun = runImport({
    sourceDb,
    targetDb,
    workspaceId: "weixin_child",
    dryRun: true
  });
  assert.equal(dryRun.ok, true);
  assert.equal(dryRun.mode, "dry_run");
  assert.equal(dryRun.after.exists, false);

  const firstWrite = runImport({
    sourceDb,
    targetDb,
    workspaceId: "weixin_child",
    write: true
  });
  assert.equal(firstWrite.ok, true);
  assert.equal(firstWrite.after.board.card_count, 1);
  assert.equal(firstWrite.after.integrity.counts.learning_task_cards, 1);

  const secondWrite = runImport({
    sourceDb: replacementDb,
    targetDb,
    workspaceId: "weixin_child",
    write: true
  });
  assert.equal(secondWrite.ok, true);
  assert.ok(secondWrite.backup);
  assert.equal(fs.existsSync(secondWrite.backup), true);

  const replacementStore = createGrowthLearningSqliteStore({ dbPath: targetDb });
  assert.equal(replacementStore.board({ workspaceId: "weixin_child" }).cards[0].taskCardId, "card_2");

  const rollback = runImport({
    targetDb,
    rollback: secondWrite.backup,
    workspaceId: "weixin_child",
    write: true
  });
  assert.equal(rollback.ok, true);
  const rolledBackStore = createGrowthLearningSqliteStore({ dbPath: targetDb });
  assert.equal(rolledBackStore.board({ workspaceId: "weixin_child" }).cards[0].taskCardId, "card_1");
});
