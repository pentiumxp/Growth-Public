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
const { createGrowthEvaluationService } = require("../src/services/growth-evaluation-service");
const { run: runAudioBackfill } = require("../scripts/backfill-growth-audio-blobs");
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
      if (table === "learning_growth_evaluation_jobs") continue;
      if (table === "learning_reward_settlements") continue;
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
      CREATE TABLE learning_growth_evaluation_jobs (
        id TEXT PRIMARY KEY,
        submission_id TEXT NOT NULL,
        task_card_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        status TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        lease_owner TEXT NOT NULL DEFAULT '',
        lease_until TEXT NOT NULL DEFAULT '',
        last_error TEXT NOT NULL DEFAULT '',
        raw_json TEXT NOT NULL DEFAULT '{}',
        available_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT NOT NULL DEFAULT '',
        learner_id TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE learning_reward_settlements (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        program_id TEXT NOT NULL,
        task_card_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        evaluation_id TEXT NOT NULL,
        status TEXT NOT NULL,
        coin_amount INTEGER NOT NULL,
        reason TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL DEFAULT '',
        review_request_id TEXT NOT NULL DEFAULT '',
        ledger_entry_json TEXT,
        raw_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        settled_at TEXT NOT NULL DEFAULT '',
        FOREIGN KEY(evaluation_id) REFERENCES learning_evaluations(id) ON DELETE CASCADE,
        FOREIGN KEY(session_id) REFERENCES learning_interaction_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY(task_card_id) REFERENCES learning_task_cards(id) ON DELETE CASCADE,
        FOREIGN KEY(program_id) REFERENCES learning_programs(id) ON DELETE CASCADE
      );
    `);
    db.prepare("INSERT INTO learning_programs(id, workspace_id) VALUES ('program_1', 'weixin_child')").run();
    db.prepare(`
      INSERT INTO learning_task_cards(
        id, program_id, draft_id, learner_id, workspace_id, kanban_card_id, title, domain,
        task_card_type, status, planned_date, planned_minutes, skill_ids_json,
        template_id, interaction_state_machine_json, source_basis_refs_json,
        curriculum_refs_json, privacy_level, card_role, capability_cluster_id,
        raw_json, created_at, updated_at
      ) VALUES (?, 'program_1', 'draft_1', 'weixin_child', 'weixin_child', ?, ?, 'english',
        'practice', 'active', '2026-06-10', 15, '[]',
        'template_1', '[]', '[]', '[]', 'member_self', 'practice',
        'english.reading', ?, '2026-06-10T00:00:00.000Z', '2026-06-10T00:00:00.000Z')
    `).run(`card_${suffix || "1"}`, `kanban_${suffix || "1"}`, `Read ${suffix || "one"}`, JSON.stringify({
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

test("backfills historical Growth audio files into SQLite BLOB storage", () => {
  const root = tmpDir();
  const dbPath = path.join(root, "growth-learning.sqlite3");
  createSourceDb(dbPath);
  const legacyRoot = path.join(root, "home-data");
  const legacyAudioDir = path.join(legacyRoot, "artifacts", "kanban-reading", "weixin_child", "draft_1", "card_1");
  fs.mkdirSync(legacyAudioDir, { recursive: true });
  fs.writeFileSync(path.join(legacyAudioDir, "999-growth-retell-card_1-2.ogg"), "audio-to-blob");

  const db = new DatabaseSync(dbPath);
  try {
    db.prepare("UPDATE learning_task_submissions SET raw_json = ? WHERE id = 'submission_1'").run(JSON.stringify({
      audio: {
        kind: "audio",
        name: "growth-retell-card_1-2.ogg",
        mime: "audio/webm; codecs=opus",
        size: 13,
        digest: "digest_to_blob",
        url: "/api/learning/task-submissions/submission_1/audio"
      }
    }));
  } finally {
    db.close();
  }

  const dryRun = runAudioBackfill({
    dbPath,
    workspaceId: "weixin_child",
    legacyAudioRoots: [legacyRoot],
    dryRun: true
  });
  assert.equal(dryRun.ok, true);
  assert.equal(dryRun.counts.would_backfill, 1);
  assert.equal(dryRun.counts.backfilled, 0);

  const wrote = runAudioBackfill({
    dbPath,
    workspaceId: "weixin_child",
    legacyAudioRoots: [legacyRoot],
    write: true
  });
  assert.equal(wrote.ok, true);
  assert.equal(wrote.counts.backfilled, 1);

  const store = createGrowthLearningSqliteStore({ dbPath, legacyAudioRoots: [legacyRoot] });
  const audio = store.audio({ workspaceId: "weixin_child", recordType: "submission", recordId: "submission_1" });
  assert.equal(audio.kind, "blob");
  assert.equal(audio.content.toString("utf8"), "audio-to-blob");

  const clean = runAudioBackfill({
    dbPath,
    workspaceId: "weixin_child",
    legacyAudioRoots: [legacyRoot],
    dryRun: true
  });
  assert.equal(clean.counts.already_blobbed, 1);
  assert.equal(clean.counts.would_backfill, 0);
});

test("writes Growth submissions, audio BLOBs, and pending evaluation jobs", () => {
  const root = tmpDir();
  const dbPath = path.join(root, "growth-learning.sqlite3");
  createSourceDb(dbPath);
  const store = createGrowthLearningSqliteStore({ dbPath });
  const result = store.submitEvidence({
    workspaceId: "weixin_child",
    taskCardId: "kanban_1",
    submissionId: "submission_new",
    text: "I can retell the paragraph.",
    filename: "retell.ogg",
    mime: "audio/ogg",
    dataBase64: Buffer.from("new-audio").toString("base64"),
    durationMs: 1200,
    submittedAt: "2026-06-10T00:03:00.000Z"
  });

  assert.equal(result.ok, true);
  assert.equal(result.task_card_id, "card_1");
  assert.equal(result.requested_task_card_id, "kanban_1");
  assert.equal(result.submission.submissionId, "submission_new");
  assert.equal(result.submission.taskCardId, "card_1");
  assert.equal(result.submission.audio.url, "/api/v1/growth/audio/submissions/submission_new");
  assert.equal(result.evaluation_job.status, "pending");
  assert.equal(result.card.latestSubmission.submissionId, "submission_new");

  const audio = store.audio({ workspaceId: "weixin_child", recordType: "submission", recordId: "submission_new" });
  assert.equal(audio.kind, "blob");
  assert.equal(audio.content.toString("utf8"), "new-audio");

  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    assert.equal(db.prepare("SELECT task_card_id FROM learning_task_submissions WHERE id = ?").get("submission_new").task_card_id, "card_1");
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM learning_growth_evaluation_jobs WHERE workspace_id = ?").get("weixin_child").count, 1);
  } finally {
    db.close();
  }
});

test("processes pending Growth evaluation jobs into plugin-owned evaluations", async () => {
  const root = tmpDir();
  const dbPath = path.join(root, "growth-learning.sqlite3");
  createSourceDb(dbPath);
  const store = createGrowthLearningSqliteStore({ dbPath });
  const submitted = store.submitEvidence({
    workspaceId: "weixin_child",
    taskCardId: "kanban_1",
    submissionId: "submission_eval",
    text: [
      "First, I read the task and wrote a clear answer with details.",
      "Then I checked the result because I want to improve next time.",
      "Finally, I changed my plan and explained what I learned."
    ].join("\n"),
    submittedAt: "2026-06-10T00:04:00.000Z"
  });
  assert.equal(submitted.ok, true);
  assert.equal(store.listEvaluationJobs({ status: "pending" }).length, 1);

  const service = createGrowthEvaluationService({
    learningStore: store,
    now: () => new Date("2026-06-10T00:05:00.000Z")
  });
  const processed = await service.processEvaluationQueue({ workspaceId: "weixin_child" });
  assert.equal(processed.ok, true);
  assert.equal(processed.processed, 1);
  assert.equal(store.listEvaluationJobs({ status: "done" })[0].submissionId, "submission_eval");

  const card = store.card({ workspaceId: "weixin_child", taskCardId: "card_1" }).card;
  assert.equal(card.latestEvaluation.taskCardId, "card_1");
  assert.equal(card.latestEvaluation.status, "completed");
  assert.equal(card.latestEvaluation.passed, true);
  assert.equal(card.status, "completed");
  assert.equal(card.rewardState, "settled");

  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const settlement = db.prepare("SELECT * FROM learning_reward_settlements WHERE task_card_id = ?").get("card_1");
    assert.equal(settlement.status, "settled");
    assert.equal(settlement.coin_amount, 100);
    assert.equal(JSON.parse(settlement.raw_json).tongbaoExchange.policy, "admin_monthly_exchange_only");
  } finally {
    db.close();
  }
});

test("emits completion and mastery events without real-time Tongbao exchange request", async () => {
  const root = tmpDir();
  const dbPath = path.join(root, "growth-learning.sqlite3");
  createSourceDb(dbPath);
  const store = createGrowthLearningSqliteStore({ dbPath });
  const emitted = [];
  const submitted = store.submitEvidence({
    workspaceId: "weixin_child",
    taskCardId: "kanban_1",
    submissionId: "submission_event",
    text: [
      "First, I recorded enough concrete details to show the finished work and the evidence that I checked.",
      "Then I explained why I changed the answer and what I learned from the weak part.",
      "Finally, I described the next check that I will make before I submit a similar task again."
    ].join("\n"),
    submittedAt: "2026-06-10T00:04:00.000Z"
  });
  assert.equal(submitted.ok, true);

  const service = createGrowthEvaluationService({
    learningStore: store,
    eventService: {
      async emit(event) {
        emitted.push(event);
        return { ok: true };
      }
    },
    now: () => new Date("2026-06-10T00:05:00.000Z")
  });
  const processed = await service.processEvaluationQueue({ workspaceId: "weixin_child" });
  assert.equal(processed.processed, 1);
  assert.deepEqual(emitted.map((event) => event.type), ["growth.card.completed", "growth.mastery.updated"]);
  assert.equal(emitted.some((event) => event.type === "growth.reward.requested"), false);
  assert.equal(processed.results[0].status, "completed");
});

test("clears monthly Growth coin balance without depending on card state", async () => {
  const root = tmpDir();
  const dbPath = path.join(root, "growth-learning.sqlite3");
  createSourceDb(dbPath);
  const store = createGrowthLearningSqliteStore({ dbPath });
  const submitted = store.submitEvidence({
    workspaceId: "weixin_child",
    taskCardId: "kanban_1",
    submissionId: "submission_monthly_exchange",
    text: [
      "First, I completed the task with enough concrete evidence and details.",
      "Then I explained because I checked what changed and how I improved.",
      "Finally, I wrote the next check that I will do before the next task."
    ].join("\n"),
    submittedAt: "2026-06-10T00:04:00.000Z"
  });
  assert.equal(submitted.ok, true);

  const service = createGrowthEvaluationService({
    learningStore: store,
    now: () => new Date("2026-06-10T00:05:00.000Z")
  });
  const processed = await service.processEvaluationQueue({ workspaceId: "weixin_child" });
  assert.equal(processed.processed, 1);

  const db = new DatabaseSync(dbPath);
  try {
    db.prepare("UPDATE learning_task_cards SET status = 'active' WHERE id = 'card_1'").run();
  } finally {
    db.close();
  }

  const balance = store.learningCoinBalance({ workspaceId: "weixin_child" });
  assert.equal(balance.ok, true);
  assert.equal(balance.available_coins, 100);

  const preview = store.clearLearningCoinBalanceForMonthlyExchange({
    workspaceId: "weixin_child",
    period: "2026-06",
    sourceId: "platform-exchange-2026-06",
    idempotencyKey: "exchange:weixin_child:2026-06",
    write: false
  });
  assert.equal(preview.ok, true);
  assert.equal(preview.mode, "dry_run");
  assert.equal(preview.clearable_coins, 100);
  assert.equal(store.learningCoinBalance({ workspaceId: "weixin_child" }).available_coins, 100);

  const cleared = store.clearLearningCoinBalanceForMonthlyExchange({
    workspaceId: "weixin_child",
    period: "2026-06",
    sourceId: "platform-exchange-2026-06",
    idempotencyKey: "exchange:weixin_child:2026-06",
    write: true,
    now: "2026-06-30T23:59:00.000Z"
  });
  assert.equal(cleared.ok, true);
  assert.equal(cleared.cleared_coins, 100);
  assert.equal(cleared.balance_after.available_coins, 0);
  assert.equal(cleared.ledger_entry.amountDelta, -100);

  const duplicate = store.clearLearningCoinBalanceForMonthlyExchange({
    workspaceId: "weixin_child",
    period: "2026-06",
    sourceId: "platform-exchange-2026-06",
    idempotencyKey: "exchange:weixin_child:2026-06",
    write: true
  });
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.cleared_coins, 100);
  assert.equal(duplicate.balance_after.available_coins, 0);

  const ledgerDb = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const rows = ledgerDb.prepare("SELECT * FROM learning_coin_ledger_entries WHERE workspace_id = ?").all("weixin_child");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].amount_delta, -100);
    assert.equal(rows[0].entry_type, "monthly_exchange_clear");
    assert.equal(JSON.parse(rows[0].metadata_json).policy, "admin_monthly_exchange_only");
  } finally {
    ledgerDb.close();
  }
});

test("writes Growth reflections and audio BLOBs by legacy kanban id", () => {
  const root = tmpDir();
  const dbPath = path.join(root, "growth-learning.sqlite3");
  createSourceDb(dbPath);
  const store = createGrowthLearningSqliteStore({ dbPath });
  const result = store.submitReflection({
    workspaceId: "weixin_child",
    taskCardId: "kanban_1",
    reflectionId: "reflection_new",
    text: "I changed my answer because I checked the weak part.",
    filename: "reflection.ogg",
    mime: "audio/ogg",
    dataBase64: Buffer.from("reflection-audio").toString("base64"),
    submittedAt: "2026-06-10T00:06:00.000Z"
  });
  assert.equal(result.ok, true);
  assert.equal(result.task_card_id, "card_1");
  assert.equal(result.reflection.reflectionId, "reflection_new");
  assert.equal(result.reflection.audio.url, "/api/v1/growth/audio/reflections/reflection_new");

  const audio = store.audio({ workspaceId: "weixin_child", recordType: "reflection", recordId: "reflection_new" });
  assert.equal(audio.kind, "blob");
  assert.equal(audio.content.toString("utf8"), "reflection-audio");
  const card = store.card({ workspaceId: "weixin_child", taskCardId: "card_1" }).card;
  assert.equal(card.latestReflection.reflectionId, "reflection_new");
});
