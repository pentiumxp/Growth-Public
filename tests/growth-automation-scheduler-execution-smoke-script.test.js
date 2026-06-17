const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-automation-scheduler-execution.js");

const {
  inputFromArgs,
  operationFromArgs,
  projectAutomationSchedulerExecutionSmokeReadback,
  shouldAllowWrite,
  validateOperationInput
} = require("../scripts/smoke-growth-automation-scheduler-execution");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-scheduler-execution-smoke-"));
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

test("automation scheduler execution smoke script parses operation, scope, and write gate", () => {
  const args = [
    "--operation", "execute-once",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--execution-id", "lgasexec_owner_1",
    "--execution-mode", "owner_explicit_once",
    "--handoff-id", "lgahand_ready_1",
    "--digest-id", "lgadig_ready_1",
    "--policy-id", "lgafpol_active_1",
    "--collection-run-id", "lgacrn_ready_1",
    "--proposal-id", "lgauto_ready_1",
    "--plan-draft-id", "lgplan_next_1",
    "--selected-item-id", "plan_item_next_1",
    "--generation-key", "owner-explicit-scheduler-execution",
    "--card-schema-version", "growth.learningCard.v1",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--activation-gates", "writeful_execution",
    "--required-approval-key", "writefulExecutionApproval",
    "--activation-record-limit", "4",
    "--status", "blocked",
    "--limit", "7",
    "--requested-by", "weixin_owner",
    "--allow-write"
  ];

  assert.equal(operationFromArgs(args), "execute");
  assert.equal(shouldAllowWrite(args), true);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    executionId: "lgasexec_owner_1",
    executionMode: "owner_explicit_once",
    handoffId: "lgahand_ready_1",
    digestId: "lgadig_ready_1",
    policyId: "lgafpol_active_1",
    collectionRunId: "lgacrn_ready_1",
    proposalId: "lgauto_ready_1",
    planDraftId: "lgplan_next_1",
    selectedItemId: "plan_item_next_1",
    generationKey: "owner-explicit-scheduler-execution",
    cardSchemaVersion: "growth.learningCard.v1",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    activationGates: ["writeful_execution"],
    requiredApprovalKeys: ["writefulExecutionApproval"],
    activationRecordLimit: 4,
    status: "blocked",
    limit: 7,
    requestedBy: "weixin_owner"
  });
  assert.deepEqual(validateOperationInput("execute", inputFromArgs(args), false), {
    ok: false,
    error: "automation_scheduler_execution_smoke_write_not_allowed",
    operation: "execute",
    exitCode: 2
  });
});

test("automation scheduler execution smoke script projects bounded operator readback", () => {
  const projected = projectAutomationSchedulerExecutionSmokeReadback({
    ok: true,
    count: 2,
    executions: [{
      executionId: "lgasexec_blocked",
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      handoffId: "lgahand_ready",
      digestId: "lgadig_ready",
      policyId: "lgafpol_active",
      proposalId: "lgauto_ready",
      planDraftId: "lgplan_next",
      selectedItemId: "plan_item_next",
      mode: "owner_explicit_once",
      status: "blocked",
      reason: "learning_automation_scheduler_execution_disabled",
      error: "learning_automation_scheduler_execution_disabled",
      privacyClass: "summary_only",
      gate: {
        writefulExecutionEnabled: false,
        executionMode: "owner_explicit_once",
        failurePolicy: { writefulSchedulingAllowed: false },
        dryRun: { ok: true, writePlanned: false, writesPerformed: false, publishPlanned: false },
        candidate: { decision: "would_publish", wouldPublish: true, safeToPublish: true },
        releaseAuthorization: { authorized: false, runtimeConfigChange: false, writefulSchedulingAllowed: false }
      },
      action: {
        publishDelegation: "learning-automation-proposal-service.publishAcceptedProposal"
      },
      execution: {
        status: "blocked",
        retryRequiresOwner: true
      }
    }, {
      executionId: "lgasexec_published",
      status: "published"
    }]
  }, "list", {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    collectionRunId: "lgacrn_ready",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan"
  }, false);

  assert.equal(projected.automationSchedulerExecutionStatus, "blocked");
  assert.equal(projected.automationSchedulerExecutionOk, true);
  assert.equal(projected.automationSchedulerExecutionOperation, "list");
  assert.equal(projected.automationSchedulerExecutionWriteOperation, false);
  assert.equal(projected.automationSchedulerExecutionWriteAllowed, false);
  assert.equal(projected.automationSchedulerExecutionRecordWritten, false);
  assert.equal(projected.automationSchedulerExecutionWritesPerformed, false);
  assert.equal(projected.automationSchedulerExecutionPublished, false);
  assert.equal(projected.automationSchedulerExecutionWorkspaceId, "weixin_fanfan");
  assert.equal(projected.automationSchedulerExecutionLearnerId, "fanfan");
  assert.equal(projected.automationSchedulerExecutionProgramId, "program_science");
  assert.equal(projected.automationSchedulerExecutionCount, 2);
  assert.equal(projected.automationSchedulerExecutionExecutionId, "lgasexec_blocked");
  assert.deepEqual(projected.automationSchedulerExecutionExecutionIds, ["lgasexec_blocked", "lgasexec_published"]);
  assert.deepEqual(projected.automationSchedulerExecutionStatuses, ["blocked", "published"]);
  assert.equal(projected.automationSchedulerExecutionBlockedCount, 1);
  assert.equal(projected.automationSchedulerExecutionPublishedCount, 1);
  assert.equal(projected.automationSchedulerExecutionMode, "owner_explicit_once");
  assert.equal(projected.automationSchedulerExecutionReason, "learning_automation_scheduler_execution_disabled");
  assert.equal(projected.automationSchedulerExecutionError, "learning_automation_scheduler_execution_disabled");
  assert.equal(projected.automationSchedulerExecutionRetryRequiresOwner, true);
  assert.equal(projected.automationSchedulerExecutionHandoffId, "lgahand_ready");
  assert.equal(projected.automationSchedulerExecutionDigestId, "lgadig_ready");
  assert.equal(projected.automationSchedulerExecutionPolicyId, "lgafpol_active");
  assert.equal(projected.automationSchedulerExecutionProposalId, "lgauto_ready");
  assert.equal(projected.automationSchedulerExecutionPlanDraftId, "lgplan_next");
  assert.equal(projected.automationSchedulerExecutionSelectedItemId, "plan_item_next");
  assert.equal(projected.automationSchedulerExecutionCollectionRunId, "lgacrn_ready");
  assert.equal(projected.automationSchedulerExecutionDomainPackId, "uk_hk_curriculum_foundation");
  assert.equal(projected.automationSchedulerExecutionDomain, "science");
  assert.equal(projected.automationSchedulerExecutionSubject, "science");
  assert.equal(projected.automationSchedulerExecutionWritefulExecutionEnabled, false);
  assert.equal(projected.automationSchedulerExecutionWritefulSchedulingAllowed, false);
  assert.equal(projected.automationSchedulerExecutionReleaseAuthorized, false);
  assert.equal(projected.automationSchedulerExecutionDryRunOk, true);
  assert.equal(projected.automationSchedulerExecutionDryRunWritePlanned, false);
  assert.equal(projected.automationSchedulerExecutionDryRunWritesPerformed, false);
  assert.equal(projected.automationSchedulerExecutionDryRunPublishPlanned, false);
  assert.equal(projected.automationSchedulerExecutionCandidateDecision, "would_publish");
  assert.equal(projected.automationSchedulerExecutionCandidateWouldPublish, true);
  assert.equal(projected.automationSchedulerExecutionCandidateSafeToPublish, true);
  assert.equal(projected.automationSchedulerExecutionPublishDelegation, "learning-automation-proposal-service.publishAcceptedProposal");
});

test("automation scheduler execution smoke script lists without writing by default", () => {
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
    assert.equal(output.source, "growth-learning-automation-scheduler-execution-service");
    assert.equal(output.count, 0);
    assert.deepEqual(output.executions, []);
    assert.equal(output.automationSchedulerExecutionStatus, "listed");
    assert.equal(output.automationSchedulerExecutionOk, true);
    assert.equal(output.automationSchedulerExecutionOperation, "list");
    assert.equal(output.automationSchedulerExecutionWriteOperation, false);
    assert.equal(output.automationSchedulerExecutionWriteAllowed, false);
    assert.equal(output.automationSchedulerExecutionRecordWritten, false);
    assert.equal(output.automationSchedulerExecutionWritesPerformed, false);
    assert.equal(output.automationSchedulerExecutionWorkspaceId, "weixin_fanfan");
    assert.equal(output.automationSchedulerExecutionLearnerId, "fanfan");
    assert.equal(output.automationSchedulerExecutionCount, 0);
    assert.deepEqual(output.automationSchedulerExecutionExecutionIds, []);
    assert.equal(tableExists(dbPath, "learning_growth_automation_scheduler_executions"), undefined);
  });
});

test("automation scheduler execution smoke script records disabled execution only with explicit write flag", () => {
  withTempDb(({ dir, dbPath }) => {
    const blockedByCli = runScript([
      "--operation", "execute",
      "--workspace-id", "weixin_fanfan",
      "--handoff-id", "lgahand_ready_1",
      "--proposal-id", "lgauto_ready_1",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(blockedByCli.status, 2);
    assert.equal(parseStdout(blockedByCli).error, "automation_scheduler_execution_smoke_write_not_allowed");

    const executed = runScript([
      "--operation", "execute",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--execution-id", "lgasexec_disabled_1",
      "--handoff-id", "lgahand_ready_1",
      "--digest-id", "lgadig_ready_1",
      "--policy-id", "lgafpol_active_1",
      "--proposal-id", "lgauto_ready_1",
      "--plan-draft-id", "lgplan_next_1",
      "--selected-item-id", "plan_item_next_1",
      "--requested-by", "weixin_owner",
      "--allow-write",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(executed.status, 1);
    const executeOutput = parseStdout(executed);
    assert.equal(executeOutput.operation, "execute");
    assert.equal(executeOutput.ok, false);
    assert.equal(executeOutput.error, "learning_automation_scheduler_execution_disabled");
    assert.equal(executeOutput.execution.status, "blocked");
    assert.equal(executeOutput.execution.reason, "learning_automation_scheduler_execution_disabled");
    assert.equal(executeOutput.execution.gate.writefulExecutionEnabled, false);
    assert.equal(executeOutput.execution.action.publishDelegation, "learning-automation-proposal-service.publishAcceptedProposal");
    assert.equal(executeOutput.execution.execution.retryRequiresOwner, true);
    assert.equal(executeOutput.automationSchedulerExecutionStatus, "blocked");
    assert.equal(executeOutput.automationSchedulerExecutionOk, false);
    assert.equal(executeOutput.automationSchedulerExecutionOperation, "execute");
    assert.equal(executeOutput.automationSchedulerExecutionWriteOperation, true);
    assert.equal(executeOutput.automationSchedulerExecutionWriteAllowed, true);
    assert.equal(executeOutput.automationSchedulerExecutionRecordWritten, true);
    assert.equal(executeOutput.automationSchedulerExecutionWritesPerformed, true);
    assert.equal(executeOutput.automationSchedulerExecutionPublished, false);
    assert.equal(executeOutput.automationSchedulerExecutionExecutionId, "lgasexec_disabled_1");
    assert.equal(executeOutput.automationSchedulerExecutionReason, "learning_automation_scheduler_execution_disabled");
    assert.equal(executeOutput.automationSchedulerExecutionError, "learning_automation_scheduler_execution_disabled");
    assert.equal(executeOutput.automationSchedulerExecutionRetryRequiresOwner, true);
    assert.equal(executeOutput.automationSchedulerExecutionWritefulExecutionEnabled, false);
    assert.equal(executeOutput.automationSchedulerExecutionPublishDelegation, "learning-automation-proposal-service.publishAcceptedProposal");

    const listed = runScript([
      "--operation", "list",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--status", "blocked",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(listed.status, 0);
    const listOutput = parseStdout(listed);
    assert.equal(listOutput.operation, "list");
    assert.equal(listOutput.count, 1);
    assert.equal(listOutput.executions[0].executionId, "lgasexec_disabled_1");
    assert.equal(listOutput.executions[0].status, "blocked");
    assert.equal(listOutput.automationSchedulerExecutionStatus, "blocked");
    assert.equal(listOutput.automationSchedulerExecutionBlockedCount, 1);
    assert.deepEqual(listOutput.automationSchedulerExecutionExecutionIds, ["lgasexec_disabled_1"]);
  });
});

test("automation scheduler execution smoke script fails closed for missing input, invalid JSON, invalid operation, and privacy risk", () => {
  const missingWorkspace = runScript(["--json"]);
  assert.equal(missingWorkspace.status, 2);
  assert.equal(parseStdout(missingWorkspace).error, "workspace_id_required");

  const invalidJson = runScript(["--input-json", "{", "--json"]);
  assert.equal(invalidJson.status, 2);
  assert.deepEqual(parseStdout(invalidJson), {
    ok: false,
    error: "automation_scheduler_execution_smoke_invalid_json",
    option: "--input-json",
    operation: ""
  });

  const invalidOperation = runScript(["--operation", "publish", "--json"]);
  assert.equal(invalidOperation.status, 2);
  assert.equal(parseStdout(invalidOperation).error, "automation_scheduler_execution_smoke_operation_invalid");

  const missingHandoff = runScript([
    "--operation", "execute",
    "--workspace-id", "weixin_fanfan",
    "--proposal-id", "lgauto_ready_1",
    "--allow-write",
    "--json"
  ]);
  assert.equal(missingHandoff.status, 2);
  assert.equal(parseStdout(missingHandoff).error, "handoff_id_required");

  const missingProposal = runScript([
    "--operation", "execute",
    "--workspace-id", "weixin_fanfan",
    "--handoff-id", "lgahand_ready_1",
    "--allow-write",
    "--json"
  ]);
  assert.equal(missingProposal.status, 2);
  assert.equal(parseStdout(missingProposal).error, "proposal_id_required");

  withTempDb(({ dir, dbPath }) => {
    const privacy = runScript([
      "--operation", "execute",
      "--workspace-id", "weixin_fanfan",
      "--handoff-id", "lgahand_ready_1",
      "--proposal-id", "lgauto_ready_1",
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
    assert.equal(output.error, "learning_automation_scheduler_execution_privacy_failed");
    assert.equal(output.privacyFindings.includes("$.rawPrompt"), true);
  });
});
