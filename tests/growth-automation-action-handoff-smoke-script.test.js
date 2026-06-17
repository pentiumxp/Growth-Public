const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningAutomationDigestRepository
} = require("../src/stores/growth-learning-sqlite/automation-digests");
const {
  createLearningAutomationFailurePolicyRepository
} = require("../src/stores/growth-learning-sqlite/automation-failure-policies");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-automation-action-handoff.js");

const {
  inputFromArgs,
  operationFromArgs,
  projectAutomationActionHandoffSmokeReadback,
  shouldAllowWrite,
  validateOperationInput
} = require("../scripts/smoke-growth-automation-action-handoff");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-action-handoff-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  const eventOutboxPath = path.join(dir, "growth-event-outbox.json");
  new DatabaseSync(dbPath, { open: true }).close();
  try {
    return callback({ dir, dbPath, eventOutboxPath });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function repositoryOptions(dbPath) {
  return {
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-15T12:00:00.000Z")
  };
}

function seedReviewedDigestAndPolicy(dbPath) {
  const digestRepository = createLearningAutomationDigestRepository(repositoryOptions(dbPath));
  const failurePolicyRepository = createLearningAutomationFailurePolicyRepository(repositoryOptions(dbPath));
  const policy = failurePolicyRepository.savePolicy({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "draft",
    policy: { maxPublishAttempts: 1 },
    rollbackPolicy: { rollbackRequired: true },
    failurePolicy: { ownerReviewRequired: true },
    createdBy: "weixin_owner",
    privacyClass: "summary_only"
  });
  assert.equal(policy.ok, true);
  const activePolicy = failurePolicyRepository.reviewPolicy({
    workspaceId: "weixin_fanfan",
    policyId: policy.policy.policyId,
    status: "active",
    reviewedBy: "weixin_owner"
  });
  assert.equal(activePolicy.ok, true);

  const digest = digestRepository.saveDigest({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "pending",
    sourcePolicy: {
      dryRun: true,
      writePlanned: false,
      writesPerformed: false,
      publishPlanned: false
    },
    summary: {
      inspected: 1,
      wouldPublish: 1,
      blocked: 0,
      skipped: 0,
      dryRun: true,
      writePlanned: false,
      writesPerformed: false,
      publishPlanned: false
    },
    candidates: [{
      candidateId: "lgauto_ready:lgplan_next:plan_item_next",
      proposalId: "lgauto_ready",
      planDraftId: "lgplan_next",
      selectedItemId: "plan_item_next",
      decision: "would_publish"
    }],
    requiredActions: [{
      candidateId: "lgauto_ready:lgplan_next:plan_item_next",
      requiredActor: "owner",
      endpoint: "/api/v1/growth/automation/proposals/lgauto_ready/publish",
      proposalId: "lgauto_ready",
      planDraftId: "lgplan_next",
      selectedItemId: "plan_item_next",
      targetNodeIds: ["kg_science_fair_test"],
      publishRequiresOwnerAction: true
    }],
    createdBy: "weixin_owner",
    privacyClass: "summary_only"
  });
  assert.equal(digest.ok, true);
  const reviewed = digestRepository.reviewDigest({
    workspaceId: "weixin_fanfan",
    digestId: digest.digest.digestId,
    status: "reviewed",
    reviewedBy: "weixin_owner"
  });
  assert.equal(reviewed.ok, true);
  return { digest: reviewed.digest, policy: activePolicy.policy };
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

test("automation action handoff smoke script parses operation, scope, and write gate", () => {
  const args = [
    "--operation", "create",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--digest-id", "lgadig_ready_1",
    "--handoff-id", "lgahand_ready_1",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--status", "pending_delivery",
    "--delivery-status", "not_delivered",
    "--limit", "7",
    "--requested-by", "weixin_owner",
    "--allow-write"
  ];

  assert.equal(operationFromArgs(args), "create");
  assert.equal(shouldAllowWrite(args), true);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    digestId: "lgadig_ready_1",
    handoffId: "lgahand_ready_1",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "pending_delivery",
    deliveryStatus: "not_delivered",
    limit: 7,
    requestedBy: "weixin_owner"
  });
  assert.deepEqual(validateOperationInput("create", inputFromArgs(args), false), {
    ok: false,
    error: "automation_action_handoff_smoke_write_not_allowed",
    operation: "create",
    exitCode: 2
  });
});

test("automation action handoff smoke script projects bounded operator readback", () => {
  const projected = projectAutomationActionHandoffSmokeReadback({
    ok: true,
    count: 2,
    handoffs: [{
      handoffId: "lgahand_pending",
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      digestId: "lgadig_reviewed",
      policyId: "lgafpol_active",
      status: "pending_delivery",
      deliveryStatus: "not_delivered",
      privacyClass: "summary_only",
      actionSummary: {
        inspected: 2,
        wouldPublish: 1,
        blocked: 1,
        skipped: 0,
        requiredActions: 1
      },
      policyReadiness: {
        readyForWritefulAutomationPrerequisite: true,
        writefulSchedulingAllowed: false
      },
      notification: {
        eventType: "growth.automation.action_required",
        route: { pluginRoute: "automation" }
      },
      actions: [{
        candidateId: "candidate_1",
        endpoint: "/api/v1/growth/automation/proposals/lgauto_ready/publish"
      }],
      blocked: [{ candidateId: "candidate_2" }]
    }, {
      handoffId: "lgahand_delivered",
      status: "pending_delivery",
      deliveryStatus: "delivered"
    }]
  }, "list", { workspaceId: "weixin_fanfan", learnerId: "fanfan" }, false);

  assert.equal(projected.automationActionHandoffStatus, "not_delivered");
  assert.equal(projected.automationActionHandoffOk, true);
  assert.equal(projected.automationActionHandoffOperation, "list");
  assert.equal(projected.automationActionHandoffWriteOperation, false);
  assert.equal(projected.automationActionHandoffWriteAllowed, false);
  assert.equal(projected.automationActionHandoffWritesPerformed, false);
  assert.equal(projected.automationActionHandoffWorkspaceId, "weixin_fanfan");
  assert.equal(projected.automationActionHandoffLearnerId, "fanfan");
  assert.equal(projected.automationActionHandoffProgramId, "program_science");
  assert.equal(projected.automationActionHandoffDomainPackId, "uk_hk_curriculum_foundation");
  assert.equal(projected.automationActionHandoffDomain, "science");
  assert.equal(projected.automationActionHandoffSubject, "science");
  assert.equal(projected.automationActionHandoffCount, 2);
  assert.equal(projected.automationActionHandoffHandoffId, "lgahand_pending");
  assert.deepEqual(projected.automationActionHandoffHandoffIds, ["lgahand_pending", "lgahand_delivered"]);
  assert.deepEqual(projected.automationActionHandoffStatuses, ["pending_delivery"]);
  assert.deepEqual(projected.automationActionHandoffDeliveryStatuses, ["not_delivered", "delivered"]);
  assert.equal(projected.automationActionHandoffPendingDeliveryCount, 2);
  assert.equal(projected.automationActionHandoffNotDeliveredCount, 1);
  assert.equal(projected.automationActionHandoffDeliveredCount, 1);
  assert.equal(projected.automationActionHandoffDigestId, "lgadig_reviewed");
  assert.equal(projected.automationActionHandoffPolicyId, "lgafpol_active");
  assert.equal(projected.automationActionHandoffPrivacyClass, "summary_only");
  assert.equal(projected.automationActionHandoffDeliveryStatus, "not_delivered");
  assert.equal(projected.automationActionHandoffDelivered, false);
  assert.equal(projected.automationActionHandoffNotificationEventType, "growth.automation.action_required");
  assert.equal(projected.automationActionHandoffNotificationRoute, "automation");
  assert.equal(projected.automationActionHandoffActionRequiredBeforeScheduling, true);
  assert.equal(projected.automationActionHandoffWritefulSchedulingAllowed, false);
  assert.equal(projected.automationActionHandoffPolicyReady, true);
  assert.equal(projected.automationActionHandoffRequiredActionCount, 1);
  assert.equal(projected.automationActionHandoffBlockedCount, 1);
  assert.equal(projected.automationActionHandoffInspectedCount, 2);
  assert.equal(projected.automationActionHandoffWouldPublishCount, 1);
  assert.deepEqual(projected.automationActionHandoffActionCandidateIds, ["candidate_1"]);
  assert.deepEqual(projected.automationActionHandoffBlockedCandidateIds, ["candidate_2"]);
  assert.deepEqual(projected.automationActionHandoffActionEndpoints, ["/api/v1/growth/automation/proposals/lgauto_ready/publish"]);
});

test("automation action handoff smoke script lists without writing by default", () => {
  withTempDb(({ dir, dbPath, eventOutboxPath }) => {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath,
      GROWTH_EVENT_OUTBOX_STORE_PATH: eventOutboxPath
    });

    assert.equal(result.status, 0);
    const output = parseStdout(result);
    assert.equal(output.operation, "list");
    assert.equal(output.ok, true);
    assert.equal(output.source, "growth-learning-automation-action-handoff-service");
    assert.equal(output.count, 0);
    assert.deepEqual(output.handoffs, []);
    assert.equal(output.automationActionHandoffStatus, "listed");
    assert.equal(output.automationActionHandoffOk, true);
    assert.equal(output.automationActionHandoffOperation, "list");
    assert.equal(output.automationActionHandoffWriteOperation, false);
    assert.equal(output.automationActionHandoffWriteAllowed, false);
    assert.equal(output.automationActionHandoffWritesPerformed, false);
    assert.equal(output.automationActionHandoffWorkspaceId, "weixin_fanfan");
    assert.equal(output.automationActionHandoffLearnerId, "fanfan");
    assert.equal(output.automationActionHandoffCount, 0);
    assert.deepEqual(output.automationActionHandoffHandoffIds, []);
    assert.equal(tableExists(dbPath, "learning_growth_automation_action_handoffs"), undefined);
  });
});

test("automation action handoff smoke script creates and delivers only with explicit write flag", () => {
  withTempDb(({ dir, dbPath, eventOutboxPath }) => {
    const seeded = seedReviewedDigestAndPolicy(dbPath);
    const blocked = runScript([
      "--operation", "create",
      "--workspace-id", "weixin_fanfan",
      "--digest-id", seeded.digest.digestId,
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath,
      GROWTH_EVENT_OUTBOX_STORE_PATH: eventOutboxPath
    });
    assert.equal(blocked.status, 2);
    assert.equal(parseStdout(blocked).error, "automation_action_handoff_smoke_write_not_allowed");

    const created = runScript([
      "--operation", "create",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--digest-id", seeded.digest.digestId,
      "--domain-pack-id", "uk_hk_curriculum_foundation",
      "--domain", "science",
      "--subject", "science",
      "--requested-by", "weixin_owner",
      "--allow-write",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath,
      GROWTH_EVENT_OUTBOX_STORE_PATH: eventOutboxPath
    });
    assert.equal(created.status, 0);
    const createOutput = parseStdout(created);
    assert.equal(createOutput.operation, "create");
    assert.equal(createOutput.ok, true);
    assert.equal(createOutput.writefulSchedulingAllowed, false);
    assert.equal(createOutput.handoff.deliveryStatus, "not_delivered");
    assert.equal(createOutput.handoff.notification.eventType, "growth.automation.action_required");
    assert.equal(createOutput.automationActionHandoffStatus, "not_delivered");
    assert.equal(createOutput.automationActionHandoffOperation, "create");
    assert.equal(createOutput.automationActionHandoffWriteOperation, true);
    assert.equal(createOutput.automationActionHandoffWriteAllowed, true);
    assert.equal(createOutput.automationActionHandoffWritesPerformed, true);
    assert.equal(createOutput.automationActionHandoffDigestId, seeded.digest.digestId);
    assert.equal(createOutput.automationActionHandoffRequiredActionCount, 1);
    assert.equal(createOutput.automationActionHandoffNotificationEventType, "growth.automation.action_required");
    assert.equal(createOutput.automationActionHandoffWritefulSchedulingAllowed, false);

    const delivered = runScript([
      "--operation", "deliver",
      "--workspace-id", "weixin_fanfan",
      "--handoff-id", createOutput.handoff.handoffId,
      "--requested-by", "weixin_owner",
      "--allow-write",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath,
      GROWTH_EVENT_OUTBOX_STORE_PATH: eventOutboxPath
    });
    assert.equal(delivered.status, 0);
    const deliverOutput = parseStdout(delivered);
    assert.equal(deliverOutput.operation, "deliver");
    assert.equal(deliverOutput.ok, true);
    assert.equal(deliverOutput.deliveryStatus, "delivery_failed");
    assert.equal(deliverOutput.handoff.deliveryStatus, "delivery_failed");
    assert.equal(deliverOutput.handoff.delivery.error, "delivery_not_configured");
    assert.equal(deliverOutput.automationActionHandoffStatus, "delivery_failed");
    assert.equal(deliverOutput.automationActionHandoffOperation, "deliver");
    assert.equal(deliverOutput.automationActionHandoffWriteOperation, true);
    assert.equal(deliverOutput.automationActionHandoffWriteAllowed, true);
    assert.equal(deliverOutput.automationActionHandoffWritesPerformed, true);
    assert.equal(deliverOutput.automationActionHandoffDeliveryStatus, "delivery_failed");
    assert.equal(deliverOutput.automationActionHandoffDeliveryFailedCount, 1);
    assert.equal(deliverOutput.automationActionHandoffDeliveryError, "delivery_not_configured");
    assert.equal(fs.existsSync(eventOutboxPath), true);
  });
});

test("automation action handoff smoke script fails closed for missing input, invalid JSON, invalid operation, and privacy risk", () => {
  const missingWorkspace = runScript(["--json"]);
  assert.equal(missingWorkspace.status, 2);
  assert.equal(parseStdout(missingWorkspace).error, "workspace_id_required");

  const invalidJson = runScript(["--input-json", "{", "--json"]);
  assert.equal(invalidJson.status, 2);
  assert.deepEqual(parseStdout(invalidJson), {
    ok: false,
    error: "automation_action_handoff_smoke_invalid_json",
    option: "--input-json",
    operation: ""
  });

  const invalidOperation = runScript(["--operation", "publish", "--json"]);
  assert.equal(invalidOperation.status, 2);
  assert.equal(parseStdout(invalidOperation).error, "automation_action_handoff_smoke_operation_invalid");

  withTempDb(({ dir, dbPath, eventOutboxPath }) => {
    const seeded = seedReviewedDigestAndPolicy(dbPath);
    const privacy = runScript([
      "--operation", "create",
      "--workspace-id", "weixin_fanfan",
      "--digest-id", seeded.digest.digestId,
      "--input-json", JSON.stringify({ rawPrompt: "do not store" }),
      "--allow-write",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath,
      GROWTH_EVENT_OUTBOX_STORE_PATH: eventOutboxPath
    });
    assert.equal(privacy.status, 1);
    const output = parseStdout(privacy);
    assert.equal(output.ok, false);
    assert.equal(output.error, "learning_automation_action_handoff_privacy_failed");
    assert.equal(output.privacyFindings.includes("$.rawPrompt"), true);
  });
});
