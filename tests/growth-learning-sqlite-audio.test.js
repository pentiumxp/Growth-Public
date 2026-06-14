const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  createAudioRepository,
  normalizeAudioRoots
} = require("../src/stores/growth-learning-sqlite/audio");
const {
  audioMimeForPlayback
} = require("../src/stores/growth-learning-sqlite/audio-metadata");

function withAudioDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-audio-repo-"));
  const dbPath = path.join(dir, "audio.sqlite3");
  const audioRoot = path.join(dir, "legacy-audio");
  fs.mkdirSync(audioRoot, { recursive: true });
  const { DatabaseSync } = require("node:sqlite");
  const setup = new DatabaseSync(dbPath);
  try {
    setup.exec(`
      CREATE TABLE learning_task_cards (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        program_id TEXT,
        learner_id TEXT
      );
      CREATE TABLE learning_task_submissions (
        id TEXT PRIMARY KEY,
        task_card_id TEXT,
        session_id TEXT,
        program_id TEXT,
        learner_id TEXT,
        workspace_id TEXT,
        raw_json TEXT,
        submitted_at TEXT,
        created_at TEXT
      );
      CREATE TABLE learning_task_reflections (
        id TEXT PRIMARY KEY,
        task_card_id TEXT,
        session_id TEXT,
        program_id TEXT,
        learner_id TEXT,
        workspace_id TEXT,
        audio_digest TEXT,
        raw_json TEXT,
        submitted_at TEXT,
        created_at TEXT
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
      INSERT INTO learning_task_cards(id, workspace_id, program_id, learner_id)
      VALUES ('card_1', 'weixin_child', 'program_1', 'learner_1');
    `);
  } finally {
    setup.close();
  }

  const repository = createAudioRepository({
    resolvedPath: dbPath,
    legacyAudioRoots: [audioRoot],
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    }
  });

  try {
    return callback({ audioRoot, dbPath, repository, DatabaseSync });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("audio repository normalizes explicit legacy roots", () => {
  assert.deepEqual(normalizeAudioRoots(["./data", "./data"], "/tmp/growth.sqlite3"), [path.resolve("./data")]);
});

test("audio playback MIME preserves webm and honors explicit metadata", () => {
  assert.equal(audioMimeForPlayback({ name: "answer.webm" }), "audio/webm");
  assert.equal(audioMimeForPlayback({ name: "answer.ogg" }), "audio/ogg");
  assert.equal(audioMimeForPlayback({ name: "answer.ogg", mime: "audio/webm; codecs=opus" }), "audio/webm; codecs=opus");
});

test("audio repository reads stored BLOBs before legacy files", () => {
  withAudioDb(({ dbPath, repository, DatabaseSync }) => {
    const db = new DatabaseSync(dbPath);
    try {
      db.prepare(`
        INSERT INTO learning_task_submissions(
          id, task_card_id, session_id, program_id, learner_id, workspace_id, raw_json, submitted_at, created_at
        ) VALUES ('sub_1', 'card_1', 'session_1', 'program_1', 'learner_1', 'weixin_child', '{}', '2026-06-11T00:00:00.000Z', '2026-06-11T00:00:00.000Z')
      `).run();
      db.prepare(`
        INSERT INTO learning_task_audio_blobs(
          id, record_type, record_id, task_card_id, session_id, program_id, learner_id, workspace_id,
          name, mime, size, digest, content_blob, created_at, updated_at
        ) VALUES ('blob_1', 'submission', 'sub_1', 'card_1', 'session_1', 'program_1', 'learner_1', 'weixin_child',
          'answer.webm', 'audio/ogg', 5, 'digest_1', ?, '2026-06-11T00:00:00.000Z', '2026-06-11T00:00:00.000Z')
      `).run(Buffer.from("voice"));
    } finally {
      db.close();
    }

    const audio = repository.audio({ workspaceId: "weixin_child", recordType: "submission", recordId: "sub_1" });
    assert.equal(audio.kind, "blob");
    assert.equal(audio.mime, "audio/ogg");
    assert.equal(audio.content.toString(), "voice");
  });
});

test("audio repository backfills bounded legacy files", () => {
  withAudioDb(({ audioRoot, dbPath, repository, DatabaseSync }) => {
    const legacyDir = path.join(audioRoot, "artifacts", "kanban-reading", "weixin_child", "card_1");
    fs.mkdirSync(legacyDir, { recursive: true });
    const audioPath = path.join(legacyDir, "answer.webm");
    fs.writeFileSync(audioPath, "voice");

    const db = new DatabaseSync(dbPath);
    try {
      db.prepare(`
        INSERT INTO learning_task_submissions(
          id, task_card_id, session_id, program_id, learner_id, workspace_id, raw_json, submitted_at, created_at
        ) VALUES ('sub_1', 'card_1', 'session_1', 'program_1', 'learner_1', 'weixin_child', ?, '2026-06-11T00:00:00.000Z', '2026-06-11T00:00:00.000Z')
      `).run(JSON.stringify({ audio: { name: "answer.webm", path: audioPath } }));
    } finally {
      db.close();
    }

    const dryRun = repository.backfillAudioBlobs({ workspaceId: "weixin_child", write: false });
    assert.equal(dryRun.ok, true);
    assert.equal(dryRun.counts.would_backfill, 1);

    const write = repository.backfillAudioBlobs({ workspaceId: "weixin_child", write: true });
    assert.equal(write.ok, true);
    assert.equal(write.counts.backfilled, 1);

    const audio = repository.audio({ workspaceId: "weixin_child", recordType: "submission", recordId: "sub_1" });
    assert.equal(audio.kind, "blob");
    assert.equal(audio.content.toString(), "voice");
  });
});
