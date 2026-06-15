"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const {
  inputFromArgs,
  runOperation,
  validateInput
} = require("../scripts/smoke-growth-release-review");

test("release review smoke script parses bounded scope and UI evidence flags", () => {
  const input = inputFromArgs([
    "--workspace-id", "fanfan",
    "--learner-id", "fanfan",
    "--domain", "science",
    "--subject", "biology",
    "--owner-daily-ui-evidence", "pass",
    "--scheduler-run-ui-evidence", "true"
  ]);

  assert.equal(input.workspaceId, "fanfan");
  assert.equal(input.learnerId, "fanfan");
  assert.equal(input.domain, "science");
  assert.equal(input.subject, "biology");
  assert.equal(input.ownerDailyUiEvidence, true);
  assert.equal(input.schedulerRunUiEvidence, true);
});

test("release review smoke script requires workspace scope", () => {
  assert.deepEqual(validateInput({}), {
    ok: false,
    error: "release_review_smoke_workspace_required"
  });
  assert.deepEqual(validateInput({ workspaceId: "fanfan" }), { ok: true });
});

test("release review smoke script delegates to service only", () => {
  const calls = [];
  const result = runOperation({
    review(input) {
      calls.push(input);
      return { ok: true, status: "incomplete" };
    }
  }, { workspaceId: "fanfan" });

  assert.equal(result.ok, true);
  assert.equal(result.status, "incomplete");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].workspaceId, "fanfan");
});

test("release review smoke script runs no-write review against a temporary SQLite db", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-review-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  const stdout = childProcess.execFileSync(process.execPath, [
    path.join(__dirname, "..", "scripts", "smoke-growth-release-review.js"),
    "--workspace-id", "fanfan",
    "--learner-id", "fanfan",
    "--json"
  ], {
    cwd: path.join(__dirname, ".."),
    env: Object.assign({}, process.env, {
      GROWTH_LEARNING_DB_PATH: dbPath
    }),
    encoding: "utf8"
  });

  const output = JSON.parse(stdout);
  assert.equal(output.operation, "review");
  assert.equal(output.ok, true);
  assert.equal(output.schemaVersion, "growth.learningAutomationReleaseReview.v1");
  assert.equal(output.writefulSchedulingAllowed, false);
  assert.equal(output.runtimeConfigChange, false);
});
