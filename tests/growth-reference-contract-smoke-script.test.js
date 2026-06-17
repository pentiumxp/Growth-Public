const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-reference-contract.js");

const {
  inputFromArgs,
  operationFromArgs,
  projectReferenceContractSmokeReadback,
  validateOperation
} = require("../scripts/smoke-growth-reference-contract");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-reference-contract-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(`
      CREATE TABLE learning_programs (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT '',
        domain TEXT NOT NULL DEFAULT '',
        subject TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT ''
      );
    `);
    db.prepare("INSERT INTO learning_programs(id, workspace_id, title, status, domain, subject, created_at, updated_at) VALUES ('program_1', 'weixin_fanfan', 'Science program', 'active', 'science', 'science', '2026-06-17T01:00:00.000Z', '2026-06-17T02:00:00.000Z')").run();
  } finally {
    db.close();
  }
  try {
    return callback({ dbPath });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function runScript(args, env = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    env: Object.assign({}, process.env, env),
    encoding: "utf8"
  });
}

function parseStdout(result) {
  assert.equal(result.stderr.replace(/\(node:\d+\) ExperimentalWarning: SQLite is an experimental feature[^\n]*\n\(Use `node --trace-warnings \.\.\.` to show where the warning was created\)\n/g, ""), "");
  return JSON.parse(result.stdout);
}

test("reference contract smoke script parses operation and scope", () => {
  const args = [
    "--operation", "summarize",
    "--workspace-id", "weixin_fanfan",
    "--object-type", "program",
    "--object-id", "program_1",
    "--purpose", "graph"
  ];
  assert.equal(operationFromArgs(args), "summarize");
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    objectType: "program",
    objectId: "program_1",
    purpose: "graph"
  });
  assert.equal(validateOperation("summarize", inputFromArgs(args)).ok, true);
  assert.equal(validateOperation("get", { workspaceId: "weixin_fanfan" }).error, "object_type_required");
});

test("reference contract smoke script projects top-level operator readback", () => {
  const output = projectReferenceContractSmokeReadback({
    ok: true,
    schemaVersion: "growth.referenceObject.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    workspaceId: "weixin_fanfan",
    objectType: "task_card",
    objectId: "card_1",
    referenceId: "growth:weixin_fanfan:task_card:card_1",
    display: {
      title: "Science card",
      subtitle: "science / practice",
      time: "2026-06-17"
    },
    summary: {
      status: "active",
      domain: "science",
      targetNodeIds: ["node_science"],
      submissionCount: 1,
      evaluationCount: 1
    },
    relatedObjectRefs: [{ object_type: "evaluation", object_id: "evaluation_1" }],
    source: "growth-learning-reference-contract-service"
  }, "get");
  assert.equal(output.referenceContractStatus, "pass");
  assert.equal(output.referenceContractOk, true);
  assert.equal(output.referenceContractOperation, "get");
  assert.equal(output.referenceContractWritePerformed, false);
  assert.equal(output.referenceContractSummaryOnly, true);
  assert.equal(output.referenceContractObjectType, "task_card");
  assert.equal(output.referenceContractObjectId, "card_1");
  assert.equal(output.referenceContractDisplayTitle, "Science card");
  assert.equal(output.referenceContractRelatedObjectCount, 1);
  assert.equal(output.referenceContractSubmissionCount, 1);
  assert.equal(output.referenceContractEvaluationCount, 1);
  assert.deepEqual(output.referenceContractTargetNodeIds, ["node_science"]);
});

test("reference contract smoke script lists object types without writes", () => {
  withTempDb(({ dbPath }) => {
    const result = runScript([
      "--operation", "object-types",
      "--workspace-id", "weixin_fanfan",
      "--json"
    ], {
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(result.status, 0);
    const output = parseStdout(result);
    assert.equal(output.referenceContractStatus, "pass");
    assert.equal(output.referenceContractOperation, "object-types");
    assert.equal(output.referenceContractWritePerformed, false);
    assert.equal(output.referenceContractSummaryOnly, true);
    assert.equal(output.referenceContractObjectTypes.includes("task_card"), true);
    assert.equal(output.referenceContractObjectTypes.includes("profile_feedback"), true);
  });
});

test("reference contract smoke script reads and summarizes a program reference", () => {
  withTempDb(({ dbPath }) => {
    const object = runScript([
      "--operation", "get",
      "--workspace-id", "weixin_fanfan",
      "--object-type", "program",
      "--object-id", "program_1",
      "--json"
    ], {
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(object.status, 0);
    const objectOutput = parseStdout(object);
    assert.equal(objectOutput.referenceContractObjectType, "program");
    assert.equal(objectOutput.referenceContractObjectId, "program_1");
    assert.equal(objectOutput.referenceContractDisplayTitle, "Science program");

    const summary = runScript([
      "--operation", "summarize",
      "--workspace-id", "weixin_fanfan",
      "--object-type", "program",
      "--object-id", "program_1",
      "--purpose", "graph",
      "--json"
    ], {
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(summary.status, 0);
    const summaryOutput = parseStdout(summary);
    assert.equal(summaryOutput.schemaVersion, "growth.referenceSummary.v1");
    assert.equal(summaryOutput.purpose, "graph");
    assert.equal(summaryOutput.referenceContractDisplaySubtitle, "science / science / active");
  });
});
