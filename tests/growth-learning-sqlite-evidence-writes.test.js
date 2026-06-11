const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  createEvidenceWriter,
  decodeAudioInput,
  taskCardByIdOrKanbanId
} = require("../src/stores/growth-learning-sqlite/evidence-writes");

function withEvidenceDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-evidence-writes-"));
  const dbPath = path.join(dir, "evidence.sqlite3");
  const { DatabaseSync } = require("node:sqlite");
  const setup = new DatabaseSync(dbPath);
  try {
    setup.exec(`
      CREATE TABLE learning_task_cards (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        kanban_card_id TEXT,
        program_id TEXT,
        learner_id TEXT,
        title TEXT,
        status TEXT,
        raw_json TEXT,
        planned_date TEXT,
        created_at TEXT,
        updated_at TEXT
      );
      CREATE TABLE learning_interaction_sessions (
        id TEXT PRIMARY KEY,
        task_card_id TEXT,
        program_id TEXT,
        learner_id TEXT,
        workspace_id TEXT,
        status TEXT,
        current_step TEXT,
        step_history_json TEXT,
        summary TEXT,
        raw_json TEXT,
        created_at TEXT,
        updated_at TEXT
      );
      CREATE TABLE learning_task_submissions (
        id TEXT PRIMARY KEY,
        task_card_id TEXT,
        session_id TEXT,
        program_id TEXT,
        learner_id TEXT,
        workspace_id TEXT,
        stage TEXT,
        submission_kind TEXT,
        attempt_no INTEGER,
        status TEXT,
        summary TEXT,
        text_digest TEXT,
        text_chars INTEGER,
        text_words INTEGER,
        kanban_card_id TEXT,
        kanban_comment_ref TEXT,
        raw_json TEXT,
        submitted_at TEXT,
        withdrawn_at TEXT,
        created_at TEXT,
        updated_at TEXT
      );
      CREATE TABLE learning_task_reflections (
        id TEXT PRIMARY KEY,
        task_card_id TEXT,
        session_id TEXT,
        program_id TEXT,
        learner_id TEXT,
        workspace_id TEXT,
        mode TEXT,
        status TEXT,
        score INTEGER,
        summary TEXT,
        audio_digest TEXT,
        raw_json TEXT,
        submitted_at TEXT,
        created_at TEXT,
        updated_at TEXT
      );
      CREATE TABLE learning_task_audio_blobs (
        id TEXT PRIMARY KEY,
        record_type TEXT,
        record_id TEXT,
        task_card_id TEXT,
        session_id TEXT,
        program_id TEXT,
        learner_id TEXT,
        workspace_id TEXT,
        name TEXT,
        mime TEXT,
        size INTEGER,
        digest TEXT,
        content_blob BLOB,
        created_at TEXT,
        updated_at TEXT
      );
      CREATE TABLE learning_growth_evaluation_jobs (
        id TEXT PRIMARY KEY,
        submission_id TEXT,
        task_card_id TEXT,
        learner_id TEXT,
        workspace_id TEXT,
        status TEXT,
        attempt_count INTEGER,
        lease_owner TEXT,
        lease_until TEXT,
        last_error TEXT,
        raw_json TEXT,
        available_at TEXT,
        created_at TEXT,
        updated_at TEXT,
        completed_at TEXT
      );
      INSERT INTO learning_task_cards (
        id, workspace_id, kanban_card_id, program_id, learner_id, title, status, raw_json, planned_date, created_at, updated_at
      ) VALUES (
        'ltask_1', 'weixin_child', 'legacy_card_1', 'program_1', 'learner_1', 'Careful writing', 'published', '{}', '2026-06-11', '2026-06-11T00:00:00.000Z', '2026-06-11T00:00:00.000Z'
      );
    `);
  } finally {
    setup.close();
  }

  const writer = createEvidenceWriter({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    }
  });

  try {
    return callback({ dbPath, writer, DatabaseSync });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("evidence writer decodes bounded audio input", () => {
  const decoded = decodeAudioInput({
    audio: {
      dataBase64: Buffer.from("voice").toString("base64"),
      name: "answer.webm",
      durationMs: 1200
    }
  });

  assert.equal(decoded.name, "answer.webm");
  assert.equal(decoded.mime, "audio/ogg");
  assert.equal(decoded.size, 5);
  assert.equal(decoded.durationMs, 1200);
});

test("evidence writer resolves legacy kanban ids and queues evaluation jobs", () => {
  withEvidenceDb(({ dbPath, writer, DatabaseSync }) => {
    const result = writer.submitEvidence({
      workspaceId: "weixin_child",
      taskCardId: "legacy_card_1",
      text: "This answer has enough structure to be recorded as learner evidence.",
      audio: {
        dataBase64: Buffer.from("voice").toString("base64"),
        name: "answer.webm"
      },
      submittedAt: "2026-06-11T01:00:00.000Z"
    });

    assert.equal(result.ok, true);
    assert.equal(result.task_card_id, "ltask_1");
    assert.equal(result.requested_task_card_id, "legacy_card_1");
    assert.equal(result.submission.taskCardId, "ltask_1");
    assert.equal(result.audio.record_type, "submission");
    assert.equal(result.evaluation_job.status, "pending");

    const db = new DatabaseSync(dbPath);
    try {
      assert.equal(taskCardByIdOrKanbanId(db, "legacy_card_1", "weixin_child").id, "ltask_1");
      assert.equal(db.prepare("SELECT COUNT(*) AS count FROM learning_interaction_sessions").get().count, 1);
      assert.equal(db.prepare("SELECT COUNT(*) AS count FROM learning_task_submissions").get().count, 1);
      assert.equal(db.prepare("SELECT COUNT(*) AS count FROM learning_task_audio_blobs WHERE record_type = 'submission'").get().count, 1);
      assert.equal(db.prepare("SELECT COUNT(*) AS count FROM learning_growth_evaluation_jobs WHERE status = 'pending'").get().count, 1);
    } finally {
      db.close();
    }
  });
});

test("evidence writer enforces one submission for daily score cards", () => {
  withEvidenceDb(({ dbPath, writer, DatabaseSync }) => {
    const db = new DatabaseSync(dbPath);
    try {
      db.prepare("UPDATE learning_task_cards SET raw_json = ? WHERE id = 'ltask_1'")
        .run(JSON.stringify({ completionPolicy: { mode: "daily_score_once", evaluationAttempts: 1 } }));
    } finally {
      db.close();
    }

    const first = writer.submitEvidence({
      workspaceId: "weixin_child",
      taskCardId: "ltask_1",
      text: "This is the one daily-card answer.",
      submittedAt: "2026-06-11T01:00:00.000Z"
    });
    assert.equal(first.ok, true);

    const second = writer.submitEvidence({
      workspaceId: "weixin_child",
      taskCardId: "ltask_1",
      text: "This second answer should not create another grading loop.",
      submittedAt: "2026-06-11T01:10:00.000Z"
    });
    assert.equal(second.ok, false);
    assert.equal(second.error, "daily_card_submission_already_recorded");

    const verify = new DatabaseSync(dbPath);
    try {
      assert.equal(verify.prepare("SELECT COUNT(*) AS count FROM learning_task_submissions").get().count, 1);
      assert.equal(verify.prepare("SELECT COUNT(*) AS count FROM learning_growth_evaluation_jobs").get().count, 1);
    } finally {
      verify.close();
    }
  });
});

test("evidence writer stores reflection evidence without creating evaluation jobs", () => {
  withEvidenceDb(({ dbPath, writer, DatabaseSync }) => {
    const result = writer.submitReflection({
      workspaceId: "weixin_child",
      taskCardId: "ltask_1",
      transcript: "I changed the order and checked the reason.",
      submittedAt: "2026-06-11T02:00:00.000Z"
    });

    assert.equal(result.ok, true);
    assert.equal(result.reflection.taskCardId, "ltask_1");
    assert.equal(result.reflection.mode, "text");

    const db = new DatabaseSync(dbPath);
    try {
      assert.equal(db.prepare("SELECT COUNT(*) AS count FROM learning_task_reflections").get().count, 1);
      assert.equal(db.prepare("SELECT COUNT(*) AS count FROM learning_growth_evaluation_jobs").get().count, 0);
    } finally {
      db.close();
    }
  });
});

test("evidence writer enforces one reflection for daily score cards", () => {
  withEvidenceDb(({ dbPath, writer, DatabaseSync }) => {
    const db = new DatabaseSync(dbPath);
    try {
      db.prepare("UPDATE learning_task_cards SET raw_json = ? WHERE id = 'ltask_1'")
        .run(JSON.stringify({ completionPolicy: { mode: "daily_score_once", reflectionAttempts: 1 } }));
    } finally {
      db.close();
    }

    const first = writer.submitReflection({
      workspaceId: "weixin_child",
      taskCardId: "ltask_1",
      transcript: "I noticed one thing to check next time.",
      submittedAt: "2026-06-11T02:00:00.000Z"
    });
    assert.equal(first.ok, true);

    const second = writer.submitReflection({
      workspaceId: "weixin_child",
      taskCardId: "ltask_1",
      transcript: "A second reflection should not reopen the card.",
      submittedAt: "2026-06-11T02:10:00.000Z"
    });
    assert.equal(second.ok, false);
    assert.equal(second.error, "daily_card_reflection_already_recorded");

    const verify = new DatabaseSync(dbPath);
    try {
      assert.equal(verify.prepare("SELECT COUNT(*) AS count FROM learning_task_reflections").get().count, 1);
    } finally {
      verify.close();
    }
  });
});
