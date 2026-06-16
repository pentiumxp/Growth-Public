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
} = require("../scripts/smoke-growth-automation-owner-review-evidence");

test("owner review evidence smoke script parses bounded automation scope", () => {
  const input = inputFromArgs([
    "--workspace-id", "fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--limit", "7",
    "--required-approval-key", "writefulExecutionApproval",
    "--activation-gates", "writeful_execution,background_scheduler"
  ]);

  assert.equal(input.workspaceId, "fanfan");
  assert.equal(input.learnerId, "fanfan");
  assert.equal(input.programId, "program_science");
  assert.equal(input.domainPackId, "uk_hk_curriculum_foundation");
  assert.equal(input.limit, 7);
  assert.deepEqual(input.requiredApprovalKeys, ["writefulExecutionApproval"]);
  assert.deepEqual(input.activationGates, ["writeful_execution", "background_scheduler"]);
});

test("owner review evidence smoke script requires workspace scope", () => {
  assert.deepEqual(validateInput({}), {
    ok: false,
    error: "automation_owner_review_evidence_smoke_workspace_required"
  });
  assert.deepEqual(validateInput({ workspaceId: "fanfan" }), { ok: true });
});

test("owner review evidence smoke script delegates only to service evaluate", () => {
  const calls = [];
  const service = {
    evaluate(input) {
      calls.push(input);
      return {
        ok: true,
        schemaVersion: "growth.learningAutomationOwnerReviewEvidence.v1",
        status: "proposal_required",
        writefulSchedulingAllowed: false
      };
    }
  };

  const result = runOperation(service, {
    workspaceId: "fanfan",
    limit: 3
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "proposal_required");
  assert.deepEqual(calls[0], { workspaceId: "fanfan", limit: 3 });
});

test("owner review evidence smoke script runs no-write read model against a temporary SQLite db", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-owner-review-evidence-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath).close();
  try {
    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-automation-owner-review-evidence.js"),
      "--workspace-id", "fanfan",
      "--learner-id", "fanfan",
      "--domain", "science",
      "--subject", "science",
      "--json"
    ], {
      cwd: path.join(__dirname, ".."),
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });

    const output = JSON.parse(stdout);
    assert.equal(output.operation, "owner-review-evidence");
    assert.equal(output.ok, true);
    assert.equal(output.schemaVersion, "growth.learningAutomationOwnerReviewEvidence.v1");
    assert.equal(output.status, "proposal_required");
    assert.equal(output.automationOwnerReviewEvidence.summaryOnly, true);
    assert.equal(output.automationOwnerReviewEvidence.proposalCount, 0);
    assert.equal(output.automationOwnerReviewEvidence.requiredActionCount > 0, true);
    assert.equal(output.automationOwnerReviewEvidence.missingGateKeys.includes("proposal_record_present"), true);
    assert.equal(output.releaseReadiness.summaryOnly, true);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.backgroundSchedulingAllowed, false);
    assert.equal(output.runtimeConfigChange, false);
    assert.equal(output.configChangeApplied, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
