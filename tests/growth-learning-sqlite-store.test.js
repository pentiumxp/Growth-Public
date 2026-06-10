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
      if (table === "learning_task_audio_blobs") continue;
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
        workspace_id TEXT NOT NULL DEFAULT '',
        raw_json TEXT NOT NULL DEFAULT '{}'
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
        audio_digest TEXT NOT NULL DEFAULT '',
        submitted_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        workspace_id TEXT NOT NULL DEFAULT '',
        raw_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE learning_task_artifacts (
        id TEXT PRIMARY KEY,
        task_card_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE learning_task_audio_blobs (
        id TEXT PRIMARY KEY,
        record_type TEXT NOT NULL,
        record_id TEXT NOT NULL,
        task_card_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL DEFAULT '',
        mime TEXT NOT NULL DEFAULT '',
        size INTEGER NOT NULL DEFAULT 0,
        digest TEXT NOT NULL DEFAULT '',
        content_blob BLOB,
        created_at TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT ''
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
    db.prepare("INSERT INTO learning_task_submissions(id, task_card_id, status, submission_kind, submitted_at, created_at, workspace_id, raw_json) VALUES (?, ?, 'submitted', 'text', '2026-06-10T00:01:00.000Z', '2026-06-10T00:01:00.000Z', 'weixin_child', ?)")
      .run(`submission_${suffix || "1"}`, `card_${suffix || "1"}`, "{}");
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

test("projects and streams Growth audio from BLOBs and bounded legacy files", () => {
  const root = tmpDir();
  const dbPath = path.join(root, "growth-learning.sqlite3");
  createSourceDb(dbPath);
  const legacyRoot = path.join(root, "home-data");
  const legacyAudioDir = path.join(legacyRoot, "artifacts", "kanban-reading", "weixin_child", "draft_1", "card_1");
  fs.mkdirSync(legacyAudioDir, { recursive: true });
  const legacyAudioPath = path.join(legacyAudioDir, "123-growth-retell-card_1-1.ogg");
  fs.writeFileSync(legacyAudioPath, "legacy-audio");

  const db = new DatabaseSync(dbPath);
  try {
    db.prepare("UPDATE learning_task_submissions SET raw_json = ? WHERE id = 'submission_1'").run(JSON.stringify({
      raw: {
        audio: {
          kind: "audio",
          name: "growth-retell-card_1-1.ogg",
          mime: "audio/webm; codecs=opus",
          size: 12,
          digest: "legacy_digest",
          url: "/api/learning/task-submissions/submission_1/audio"
        }
      }
    }));
    db.prepare("INSERT INTO learning_task_reflections(id, task_card_id, status, mode, score, summary, audio_digest, submitted_at, created_at, workspace_id, raw_json) VALUES ('reflection_1', 'card_1', 'submitted', 'audio', 80, 'Good', 'blob_digest', '2026-06-10T00:02:00.000Z', '2026-06-10T00:02:00.000Z', 'weixin_child', ?)")
      .run(JSON.stringify({ raw: { audio: { name: "reflection.ogg", mime: "audio/ogg", digest: "blob_digest" } } }));
    db.prepare("INSERT INTO learning_task_audio_blobs(id, record_type, record_id, task_card_id, workspace_id, name, mime, size, digest, content_blob, created_at, updated_at) VALUES ('audio_1', 'reflection', 'reflection_1', 'card_1', 'weixin_child', 'reflection.ogg', 'audio/ogg', 10, 'blob_digest', ?, '2026-06-10T00:02:00.000Z', '2026-06-10T00:02:00.000Z')")
      .run(Buffer.from("blob-audio"));
  } finally {
    db.close();
  }

  const store = createGrowthLearningSqliteStore({ dbPath, legacyAudioRoots: [legacyRoot] });
  const card = store.card({ workspaceId: "weixin_child", taskCardId: "card_1" }).card;
  assert.equal(card.latestSubmission.audio.url, "/api/v1/growth/audio/submissions/submission_1");
  assert.equal(card.latestReflection.audio.url, "/api/v1/growth/audio/reflections/reflection_1");

  const submissionAudio = store.audio({ workspaceId: "weixin_child", recordType: "submission", recordId: "submission_1" });
  assert.equal(submissionAudio.kind, "file");
  assert.equal(submissionAudio.filePath, legacyAudioPath);
  assert.equal(submissionAudio.size, 12);

  const reflectionAudio = store.audio({ workspaceId: "weixin_child", recordType: "reflection", recordId: "reflection_1" });
  assert.equal(reflectionAudio.kind, "blob");
  assert.equal(reflectionAudio.content.toString("utf8"), "blob-audio");
});
