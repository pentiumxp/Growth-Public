const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-automation-digest.js");

const {
  inputFromArgs,
  operationFromArgs,
  projectAutomationDigestSmokeReadback,
  shouldAllowWrite,
  validateOperationInput
} = require("../scripts/smoke-growth-automation-digest");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-digest-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath, { open: true }).close();
  try {
    return callback({ dir, dbPath });
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
  return JSON.parse(result.stdout);
}

function tableExists(dbPath, tableName) {
  const db = new DatabaseSync(dbPath, { open: true });
  try {
    return db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);
  } finally {
    db.close();
  }
}

test("automation digest smoke script parses operation, scope, review notes, and write gate", () => {
  const args = [
    "--operation", "review",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--digest-id", "lgadig_ready_1",
    "--proposal-id", "lgauto_ready_1",
    "--plan-draft-id", "lgplan_ready_1",
    "--selected-item-id", "item_1",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--status", "reviewed",
    "--limit", "7",
    "--audit-limit", "9",
    "--target-node-id", "science.node.1",
    "--target-node-ids", "science.node.2,science.node.1",
    "--selected-candidate-id", "candidate_1",
    "--selected-candidate-ids", "candidate_2,candidate_1",
    "--note", "Owner reviewed the digest.",
    "--requested-by", "weixin_owner",
    "--allow-write"
  ];

  assert.equal(operationFromArgs(args), "review");
  assert.equal(shouldAllowWrite(args), true);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    digestId: "lgadig_ready_1",
    proposalId: "lgauto_ready_1",
    planDraftId: "lgplan_ready_1",
    selectedItemId: "item_1",
    profileDeltaId: "",
    evidenceId: "",
    correctionId: "",
    sourceId: "",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "reviewed",
    limit: 7,
    auditLimit: 9,
    targetNodeIds: ["science.node.1", "science.node.2"],
    selectedCandidateIds: ["candidate_1", "candidate_2"],
    note: "Owner reviewed the digest.",
    requestedBy: "weixin_owner"
  });
  assert.deepEqual(validateOperationInput("review", inputFromArgs(args), false), {
    ok: false,
    error: "automation_digest_smoke_write_not_allowed",
    operation: "review",
    exitCode: 2
  });
});

test("automation digest smoke script projects operator readback", () => {
  const projected = projectAutomationDigestSmokeReadback({
    ok: true,
    source: "growth-learning-automation-digest-service",
    count: 2,
    digests: [{
      digestId: "lgadig_pending",
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      status: "pending",
      privacyClass: "summary_only",
      summary: {
        inspected: 2,
        wouldPublish: 1,
        blocked: 1,
        skipped: 0,
        requiredActions: 1,
        dryRun: true,
        writePlanned: false,
        writesPerformed: false,
        publishPlanned: false
      },
      candidates: [{ candidateId: "candidate_1" }, { candidateId: "candidate_2" }],
      blocked: [{ candidateId: "candidate_2" }],
      requiredActions: [{ endpoint: "/api/v1/growth/automation/proposals/lgauto_ready/publish" }],
      sourcePolicy: { schemaVersion: "growth.learningAutomationDigest.sourcePolicy.v1" }
    }, {
      digestId: "lgadig_reviewed",
      status: "reviewed"
    }]
  }, "list", {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan"
  }, false);

  assert.equal(projected.automationDigestStatus, "pending");
  assert.equal(projected.automationDigestOk, true);
  assert.equal(projected.automationDigestOperation, "list");
  assert.equal(projected.automationDigestWriteOperation, false);
  assert.equal(projected.automationDigestWriteAllowed, false);
  assert.equal(projected.automationDigestWritesPerformed, false);
  assert.equal(projected.automationDigestWorkspaceId, "weixin_fanfan");
  assert.equal(projected.automationDigestLearnerId, "fanfan");
  assert.equal(projected.automationDigestProgramId, "program_science");
  assert.equal(projected.automationDigestDomain, "science");
  assert.equal(projected.automationDigestSubject, "science");
  assert.equal(projected.automationDigestCount, 2);
  assert.equal(projected.automationDigestDigestId, "lgadig_pending");
  assert.deepEqual(projected.automationDigestDigestIds, ["lgadig_pending", "lgadig_reviewed"]);
  assert.deepEqual(projected.automationDigestStatuses, ["pending", "reviewed"]);
  assert.equal(projected.automationDigestPendingCount, 1);
  assert.equal(projected.automationDigestReviewedCount, 1);
  assert.equal(projected.automationDigestDryRun, true);
  assert.equal(projected.automationDigestWritePlanned, false);
  assert.equal(projected.automationDigestSourceWritesPerformed, false);
  assert.equal(projected.automationDigestPublishPlanned, false);
  assert.equal(projected.automationDigestPublishRequiresOwnerAction, true);
  assert.equal(projected.automationDigestInspectedCount, 2);
  assert.equal(projected.automationDigestWouldPublishCount, 1);
  assert.equal(projected.automationDigestBlockedCount, 1);
  assert.equal(projected.automationDigestRequiredActionCount, 1);
  assert.deepEqual(projected.automationDigestCandidateIds, ["candidate_1", "candidate_2"]);
  assert.deepEqual(projected.automationDigestRequiredActionEndpoints, ["/api/v1/growth/automation/proposals/lgauto_ready/publish"]);
});

test("automation digest smoke script lists without writing by default", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0);
    const output = parseStdout(result);
    assert.equal(output.operation, "list");
    assert.equal(output.ok, true);
    assert.equal(output.source, "growth-learning-automation-digest-service");
    assert.equal(output.count, 0);
    assert.deepEqual(output.digests, []);
    assert.equal(output.automationDigestStatus, "listed");
    assert.equal(output.automationDigestOk, true);
    assert.equal(output.automationDigestOperation, "list");
    assert.equal(output.automationDigestWriteOperation, false);
    assert.equal(output.automationDigestWriteAllowed, false);
    assert.equal(output.automationDigestWritesPerformed, false);
    assert.equal(output.automationDigestWorkspaceId, "weixin_fanfan");
    assert.equal(output.automationDigestLearnerId, "fanfan");
    assert.equal(output.automationDigestCount, 0);
    assert.deepEqual(output.automationDigestDigestIds, []);
    assert.equal(tableExists(dbPath, "learning_growth_automation_digests"), undefined);
  });
});

test("automation digest smoke script creates, reviews, gets, and lists only with explicit write flag", () => {
  withTempDb(({ dir, dbPath }) => {
    const blocked = runScript([
      "--operation", "create",
      "--workspace-id", "weixin_fanfan",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(blocked.status, 2);
    assert.equal(parseStdout(blocked).error, "automation_digest_smoke_write_not_allowed");

    const created = runScript([
      "--operation", "create",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--domain-pack-id", "uk_hk_curriculum_foundation",
      "--domain", "science",
      "--subject", "science",
      "--requested-by", "weixin_owner",
      "--allow-write",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(created.status, 0);
    const createOutput = parseStdout(created);
    assert.equal(createOutput.operation, "create");
    assert.equal(createOutput.ok, true);
    assert.equal(createOutput.source, "growth-learning-automation-digest-service");
    assert.equal(createOutput.dryRun, true);
    assert.equal(createOutput.writePlanned, false);
    assert.equal(createOutput.writesPerformed, false);
    assert.equal(createOutput.publishPlanned, false);
    assert.equal(createOutput.digest.status, "pending");
    assert.equal(createOutput.digest.privacyClass, "summary_only");
    assert.equal(createOutput.digest.summary.dryRun, true);
    assert.equal(createOutput.digest.summary.writePlanned, false);
    assert.equal(createOutput.digest.summary.writesPerformed, false);
    assert.equal(createOutput.digest.summary.publishPlanned, false);
    assert.equal(createOutput.automationDigestStatus, "pending");
    assert.equal(createOutput.automationDigestOperation, "create");
    assert.equal(createOutput.automationDigestWriteOperation, true);
    assert.equal(createOutput.automationDigestWriteAllowed, true);
    assert.equal(createOutput.automationDigestWritesPerformed, true);
    assert.equal(createOutput.automationDigestDryRun, true);
    assert.equal(createOutput.automationDigestPublishRequiresOwnerAction, false);

    const reviewed = runScript([
      "--operation", "review",
      "--workspace-id", "weixin_fanfan",
      "--digest-id", createOutput.digest.digestId,
      "--status", "reviewed",
      "--requested-by", "weixin_owner",
      "--note", "Owner reviewed bounded dry-run packet.",
      "--allow-write",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(reviewed.status, 0);
    const reviewOutput = parseStdout(reviewed);
    assert.equal(reviewOutput.operation, "review");
    assert.equal(reviewOutput.ok, true);
    assert.equal(reviewOutput.digest.status, "reviewed");
    assert.equal(reviewOutput.digest.review.summaryOnly, true);
    assert.equal(reviewOutput.digest.review.note, "Owner reviewed bounded dry-run packet.");
    assert.equal(reviewOutput.automationDigestStatus, "reviewed");
    assert.equal(reviewOutput.automationDigestOperation, "review");
    assert.equal(reviewOutput.automationDigestWriteOperation, true);
    assert.equal(reviewOutput.automationDigestWriteAllowed, true);

    const got = runScript([
      "--operation", "get",
      "--workspace-id", "weixin_fanfan",
      "--digest-id", createOutput.digest.digestId,
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(got.status, 0);
    const getOutput = parseStdout(got);
    assert.equal(getOutput.operation, "get");
    assert.equal(getOutput.digest.digestId, createOutput.digest.digestId);
    assert.equal(getOutput.digest.status, "reviewed");

    const listed = runScript([
      "--operation", "list",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--status", "reviewed",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(listed.status, 0);
    const listOutput = parseStdout(listed);
    assert.equal(listOutput.operation, "list");
    assert.equal(listOutput.count, 1);
    assert.equal(listOutput.digests[0].digestId, createOutput.digest.digestId);
  });
});

test("automation digest smoke script fails closed for missing input, invalid JSON, invalid operation, and privacy risk", () => {
  const missingWorkspace = runScript(["--json"]);
  assert.equal(missingWorkspace.status, 2);
  assert.equal(parseStdout(missingWorkspace).error, "workspace_id_required");

  const invalidJson = runScript(["--input-json", "{", "--json"]);
  assert.equal(invalidJson.status, 2);
  assert.deepEqual(parseStdout(invalidJson), {
    ok: false,
    error: "automation_digest_smoke_invalid_json",
    option: "--input-json",
    operation: ""
  });

  const invalidOperation = runScript(["--operation", "publish", "--json"]);
  assert.equal(invalidOperation.status, 2);
  assert.equal(parseStdout(invalidOperation).error, "automation_digest_smoke_operation_invalid");

  const reviewMissingDigest = runScript([
    "--operation", "review",
    "--workspace-id", "weixin_fanfan",
    "--allow-write",
    "--json"
  ]);
  assert.equal(reviewMissingDigest.status, 2);
  assert.equal(parseStdout(reviewMissingDigest).error, "digest_id_required");

  const getMissingDigest = runScript([
    "--operation", "get",
    "--workspace-id", "weixin_fanfan",
    "--json"
  ]);
  assert.equal(getMissingDigest.status, 2);
  assert.equal(parseStdout(getMissingDigest).error, "digest_id_required");

  withTempDb(({ dir, dbPath }) => {
    const privacy = runScript([
      "--operation", "create",
      "--workspace-id", "weixin_fanfan",
      "--input-json", JSON.stringify({ rawPrompt: "do not store" }),
      "--allow-write",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(privacy.status, 1);
    const output = parseStdout(privacy);
    assert.equal(output.ok, false);
    assert.equal(output.error, "learning_automation_digest_privacy_failed");
    assert.equal(output.privacyFindings.includes("$.rawPrompt"), true);
  });
});
