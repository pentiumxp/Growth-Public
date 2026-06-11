const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  insertDynamic,
  parseJson,
  tableColumns,
  upsertDynamic
} = require("../src/stores/growth-learning-sqlite/core");
const {
  stableAudioBlobId,
  stableEvaluationId,
  stableEvaluationJobId,
  stableLearningCoinLedgerEntryId,
  stableReflectionId,
  stableRewardSettlementId,
  stableSessionId,
  stableSubmissionId
} = require("../src/stores/growth-learning-sqlite/identifiers");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-sqlite-core-"));
  const dbPath = path.join(dir, "core.sqlite3");
  const { DatabaseSync } = require("node:sqlite");
  const db = new DatabaseSync(dbPath);
  try {
    return callback(db);
  } finally {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("SQLite core helpers preserve dynamic write semantics", () => {
  withTempDb((db) => {
    db.exec("CREATE TABLE records (id TEXT PRIMARY KEY, name TEXT, created_at TEXT, updated_at TEXT)");
    assert.deepEqual(tableColumns(db, "records"), ["id", "name", "created_at", "updated_at"]);

    insertDynamic(db, "records", {
      id: "record_1",
      name: "first",
      created_at: "2026-01-01T00:00:00.000Z",
      ignored: "not persisted"
    });
    upsertDynamic(db, "records", {
      id: "record_1",
      name: "second",
      created_at: "2026-02-01T00:00:00.000Z",
      updated_at: "2026-02-01T00:00:00.000Z"
    });

    const row = db.prepare("SELECT * FROM records WHERE id = ?").get("record_1");
    assert.equal(row.name, "second");
    assert.equal(row.created_at, "2026-01-01T00:00:00.000Z");
    assert.equal(row.updated_at, "2026-02-01T00:00:00.000Z");
  });
});

test("core JSON parsing and Growth ids remain stable", () => {
  assert.deepEqual(parseJson("{\"ok\":true}", {}), { ok: true });
  assert.deepEqual(parseJson("{", { ok: false }), { ok: false });

  assert.equal(stableSubmissionId({ id: "submission_explicit" }), "submission_explicit");
  assert.equal(stableReflectionId({ reflection_id: "reflection_explicit" }), "reflection_explicit");
  assert.match(stableSubmissionId({ workspaceId: "weixin_stephen", taskCardId: "card_1", text: "hello" }), /^lsub_[a-f0-9]{18}$/);
  assert.match(stableReflectionId({ workspaceId: "weixin_stephen", taskCardId: "card_1", text: "hello" }), /^lrefl_[a-f0-9]{18}$/);
  assert.match(stableAudioBlobId("submission", "submission_1"), /^gaudio_[a-f0-9]{18}$/);
  assert.match(stableEvaluationJobId("submission_1"), /^lgjob_[a-f0-9]{18}$/);
  assert.match(stableEvaluationId("submission_1"), /^lgeval_[a-f0-9]{18}$/);
  assert.match(stableSessionId("submission_1"), /^lsess_[a-f0-9]{18}$/);
  assert.match(stableRewardSettlementId("evaluation_1"), /^lrwd_[a-f0-9]{18}$/);
  assert.match(stableLearningCoinLedgerEntryId("idempotency_1"), /^lcoin_[a-f0-9]{18}$/);
});
