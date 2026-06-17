const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-automation-failure-policy.js");

const {
  inputFromArgs,
  operationFromArgs,
  projectAutomationFailurePolicySmokeReadback,
  shouldAllowWrite,
  validateOperationInput
} = require("../scripts/smoke-growth-automation-failure-policy");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-failure-policy-smoke-"));
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

test("automation failure policy smoke script parses operation, scope, and write gate", () => {
  const args = [
    "--operation", "review",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--policy-id", "lgafpol_ready_1",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--status", "active",
    "--limit", "7",
    "--requested-by", "weixin_owner",
    "--allow-write"
  ];

  assert.equal(operationFromArgs(args), "review");
  assert.equal(shouldAllowWrite(args), true);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    policyId: "lgafpol_ready_1",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "active",
    limit: 7,
    requestedBy: "weixin_owner"
  });
  assert.deepEqual(validateOperationInput("review", inputFromArgs(args), false), {
    ok: false,
    error: "automation_failure_policy_smoke_write_not_allowed",
    operation: "review",
    exitCode: 2
  });
});

test("automation failure policy smoke script projects bounded operator readback", () => {
  const projected = projectAutomationFailurePolicySmokeReadback({
    ok: true,
    count: 2,
    policies: [{
      policyId: "lgafpol_active",
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      status: "active",
      policyVersion: "growth.learningAutomationFailurePolicy.v1",
      policy: {
        schemaVersion: "growth.learningAutomationFailurePolicy.v1",
        ownerReviewRequired: true,
        digestReviewRequired: true,
        proposalReviewRequired: true,
        auditCompletenessRequired: true,
        targetProvisioningRequired: true,
        rollbackPolicyRequired: true,
        actionHandoffRequiredBeforeScheduling: true,
        writefulSchedulingAllowed: false
      },
      rollbackPolicy: {
        transactionalPublishRequired: true,
        retryRequiresOwner: true,
        maxAutomaticRetries: 0
      },
      failurePolicy: {
        visibleFailureRequired: true,
        ownerReviewRequired: true,
        retryRequiresOwner: true,
        maxAutomaticRetries: 0,
        writefulSchedulingAllowed: false,
        failureStates: ["publish_failed", "db_transaction_rolled_back"],
        retryActions: ["owner_retry_publish"]
      },
      review: {
        status: "active",
        reviewedBy: "weixin_owner"
      },
      reviewedBy: "weixin_owner",
      privacyClass: "summary_only"
    }, {
      policyId: "lgafpol_draft",
      status: "draft"
    }]
  }, "list", { workspaceId: "weixin_fanfan", learnerId: "fanfan" }, false);

  assert.equal(projected.automationFailurePolicyStatus, "active");
  assert.equal(projected.automationFailurePolicyOk, true);
  assert.equal(projected.automationFailurePolicyOperation, "list");
  assert.equal(projected.automationFailurePolicyWriteOperation, false);
  assert.equal(projected.automationFailurePolicyWriteAllowed, false);
  assert.equal(projected.automationFailurePolicyWritesPerformed, false);
  assert.equal(projected.automationFailurePolicyWorkspaceId, "weixin_fanfan");
  assert.equal(projected.automationFailurePolicyLearnerId, "fanfan");
  assert.equal(projected.automationFailurePolicyProgramId, "program_science");
  assert.equal(projected.automationFailurePolicyDomainPackId, "uk_hk_curriculum_foundation");
  assert.equal(projected.automationFailurePolicyDomain, "science");
  assert.equal(projected.automationFailurePolicySubject, "science");
  assert.equal(projected.automationFailurePolicyHorizon, "daily_plan");
  assert.equal(projected.automationFailurePolicyCount, 2);
  assert.equal(projected.automationFailurePolicyPolicyId, "lgafpol_active");
  assert.deepEqual(projected.automationFailurePolicyPolicyIds, ["lgafpol_active", "lgafpol_draft"]);
  assert.equal(projected.automationFailurePolicyPrivacyClass, "summary_only");
  assert.equal(projected.automationFailurePolicyPolicyVersion, "growth.learningAutomationFailurePolicy.v1");
  assert.deepEqual(projected.automationFailurePolicyStatuses, ["active", "draft"]);
  assert.equal(projected.automationFailurePolicyDraftCount, 1);
  assert.equal(projected.automationFailurePolicyActiveCount, 1);
  assert.equal(projected.automationFailurePolicyReadyForWritefulAutomationPrerequisite, false);
  assert.equal(projected.automationFailurePolicyWritefulSchedulingAllowed, false);
  assert.equal(projected.automationFailurePolicyOwnerReviewRequired, true);
  assert.equal(projected.automationFailurePolicyDigestReviewRequired, true);
  assert.equal(projected.automationFailurePolicyProposalReviewRequired, true);
  assert.equal(projected.automationFailurePolicyAuditCompletenessRequired, true);
  assert.equal(projected.automationFailurePolicyTargetProvisioningRequired, true);
  assert.equal(projected.automationFailurePolicyRollbackPolicyRequired, true);
  assert.equal(projected.automationFailurePolicyActionHandoffRequiredBeforeScheduling, true);
  assert.equal(projected.automationFailurePolicyTransactionalPublishRequired, true);
  assert.equal(projected.automationFailurePolicyRetryRequiresOwner, true);
  assert.equal(projected.automationFailurePolicyMaxAutomaticRetries, 0);
  assert.equal(projected.automationFailurePolicyVisibleFailureRequired, true);
  assert.deepEqual(projected.automationFailurePolicyFailureStates, ["publish_failed", "db_transaction_rolled_back"]);
  assert.deepEqual(projected.automationFailurePolicyRetryActions, ["owner_retry_publish"]);
  assert.equal(projected.automationFailurePolicyReviewStatus, "active");
  assert.equal(projected.automationFailurePolicyReviewedBy, "weixin_owner");
});

test("automation failure policy smoke script checks readiness without writing by default", () => {
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
    assert.equal(output.operation, "readiness");
    assert.equal(output.ok, true);
    assert.equal(output.source, "growth-learning-automation-failure-policy-service");
    assert.equal(output.status, "missing_active_failure_policy");
    assert.equal(output.readyForWritefulAutomationPrerequisite, false);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.automationFailurePolicyStatus, "missing_active_failure_policy");
    assert.equal(output.automationFailurePolicyOk, true);
    assert.equal(output.automationFailurePolicyOperation, "readiness");
    assert.equal(output.automationFailurePolicyWriteOperation, false);
    assert.equal(output.automationFailurePolicyWriteAllowed, false);
    assert.equal(output.automationFailurePolicyWritesPerformed, false);
    assert.equal(output.automationFailurePolicyWorkspaceId, "weixin_fanfan");
    assert.equal(output.automationFailurePolicyLearnerId, "fanfan");
    assert.equal(output.automationFailurePolicyReadyForWritefulAutomationPrerequisite, false);
    assert.equal(output.automationFailurePolicyWritefulSchedulingAllowed, false);
    assert.deepEqual(output.automationFailurePolicyMissingRequired, ["active_failure_policy"]);
    assert.equal(tableExists(dbPath, "learning_growth_automation_failure_policies"), undefined);
  });
});

test("automation failure policy smoke script creates and activates policy only with explicit write flag", () => {
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
    assert.equal(parseStdout(blocked).error, "automation_failure_policy_smoke_write_not_allowed");

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
    assert.equal(createOutput.policy.status, "draft");
    assert.equal(createOutput.policy.privacyClass, "summary_only");
    assert.equal(createOutput.policy.policy.writefulSchedulingAllowed, false);
    assert.equal(createOutput.policy.rollbackPolicy.maxAutomaticRetries, 0);
    assert.equal(createOutput.policy.failurePolicy.writefulSchedulingAllowed, false);
    assert.equal(createOutput.readiness.readyForWritefulAutomationPrerequisite, false);
    assert.equal(createOutput.automationFailurePolicyStatus, "draft");
    assert.equal(createOutput.automationFailurePolicyOperation, "create");
    assert.equal(createOutput.automationFailurePolicyWriteOperation, true);
    assert.equal(createOutput.automationFailurePolicyWriteAllowed, true);
    assert.equal(createOutput.automationFailurePolicyWritesPerformed, true);
    assert.equal(createOutput.automationFailurePolicyPolicyId, createOutput.policy.policyId);
    assert.equal(createOutput.automationFailurePolicyPrivacyClass, "summary_only");
    assert.equal(createOutput.automationFailurePolicyOwnerReviewRequired, true);
    assert.equal(createOutput.automationFailurePolicyVisibleFailureRequired, true);
    assert.equal(createOutput.automationFailurePolicyWritefulSchedulingAllowed, false);

    const reviewed = runScript([
      "--operation", "review",
      "--workspace-id", "weixin_fanfan",
      "--policy-id", createOutput.policy.policyId,
      "--status", "active",
      "--requested-by", "weixin_owner",
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
    assert.equal(reviewOutput.policy.status, "active");
    assert.equal(reviewOutput.readiness.readyForWritefulAutomationPrerequisite, true);
    assert.equal(reviewOutput.readiness.writefulSchedulingAllowed, false);
    assert.equal(reviewOutput.automationFailurePolicyStatus, "active");
    assert.equal(reviewOutput.automationFailurePolicyOperation, "review");
    assert.equal(reviewOutput.automationFailurePolicyWriteOperation, true);
    assert.equal(reviewOutput.automationFailurePolicyWriteAllowed, true);
    assert.equal(reviewOutput.automationFailurePolicyWritesPerformed, true);
    assert.equal(reviewOutput.automationFailurePolicyReadyForWritefulAutomationPrerequisite, true);
    assert.equal(reviewOutput.automationFailurePolicyWritefulSchedulingAllowed, false);
    assert.equal(reviewOutput.automationFailurePolicyReviewStatus, "active");
    assert.equal(reviewOutput.automationFailurePolicyReviewedBy, "weixin_owner");

    const readiness = runScript([
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(readiness.status, 0);
    const readinessOutput = parseStdout(readiness);
    assert.equal(readinessOutput.status, "failure_policy_ready");
    assert.equal(readinessOutput.readyForWritefulAutomationPrerequisite, true);
    assert.equal(readinessOutput.writefulSchedulingAllowed, false);
    assert.equal(readinessOutput.automationFailurePolicyStatus, "failure_policy_ready");
    assert.equal(readinessOutput.automationFailurePolicyReadyForWritefulAutomationPrerequisite, true);
    assert.equal(readinessOutput.automationFailurePolicyWritefulSchedulingAllowed, false);
    assert.equal(readinessOutput.automationFailurePolicyPolicyId, createOutput.policy.policyId);
  });
});

test("automation failure policy smoke script lists policies through the service", () => {
  withTempDb(({ dir, dbPath }) => {
    const created = runScript([
      "--operation", "create",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--allow-write",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(created.status, 0);

    const listed = runScript([
      "--operation", "list",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(listed.status, 0);
    const output = parseStdout(listed);
    assert.equal(output.operation, "list");
    assert.equal(output.ok, true);
    assert.equal(output.count, 1);
    assert.equal(output.policies[0].status, "draft");
    assert.equal(output.automationFailurePolicyStatus, "draft");
    assert.equal(output.automationFailurePolicyOperation, "list");
    assert.equal(output.automationFailurePolicyWriteOperation, false);
    assert.equal(output.automationFailurePolicyWriteAllowed, false);
    assert.equal(output.automationFailurePolicyWritesPerformed, false);
    assert.equal(output.automationFailurePolicyCount, 1);
    assert.equal(output.automationFailurePolicyDraftCount, 1);
    assert.deepEqual(output.automationFailurePolicyPolicyIds, [output.policies[0].policyId]);
  });
});

test("automation failure policy smoke script fails closed for missing input, invalid JSON, invalid operation, and privacy risk", () => {
  const missingWorkspace = runScript(["--json"]);
  assert.equal(missingWorkspace.status, 2);
  assert.equal(parseStdout(missingWorkspace).error, "workspace_id_required");

  const invalidJson = runScript(["--input-json", "{", "--json"]);
  assert.equal(invalidJson.status, 2);
  assert.deepEqual(parseStdout(invalidJson), {
    ok: false,
    error: "automation_failure_policy_smoke_invalid_json",
    option: "--input-json",
    operation: ""
  });

  const invalidOperation = runScript(["--operation", "publish", "--json"]);
  assert.equal(invalidOperation.status, 2);
  assert.equal(parseStdout(invalidOperation).error, "automation_failure_policy_smoke_operation_invalid");

  const reviewMissingPolicy = runScript([
    "--operation", "review",
    "--workspace-id", "weixin_fanfan",
    "--allow-write",
    "--json"
  ]);
  assert.equal(reviewMissingPolicy.status, 2);
  assert.equal(parseStdout(reviewMissingPolicy).error, "policy_id_required");

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
    assert.equal(output.error, "learning_automation_failure_policy_privacy_failed");
    assert.equal(output.privacyFindings.includes("$.rawPrompt"), true);
  });
});
