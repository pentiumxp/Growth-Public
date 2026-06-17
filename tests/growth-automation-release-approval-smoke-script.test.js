const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-automation-release-approval.js");

const {
  inputFromArgs,
  operationFromArgs,
  projectAutomationReleaseApprovalSmokeReadback,
  runOperation,
  shouldAllowWrite,
  validateOperationInput
} = require("../scripts/smoke-growth-automation-release-approval");

test("automation release approval smoke script parses default read-only list input", () => {
  const args = [
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--approval-key", "writeful_execution",
    "--limit", "5"
  ];

  assert.equal(operationFromArgs(args), "list");
  assert.equal(shouldAllowWrite(args), false);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "",
    domain: "",
    subject: "",
    horizon: "daily_plan",
    approvalKey: "writeful_execution",
    approval: {},
    evidence: {},
    status: "",
    limit: 5,
    note: "",
    requestedBy: "",
    approvedBy: "",
    approvedAt: "",
    createdAt: ""
  });
});

test("automation release approval smoke script requires explicit allow-write for record", () => {
  const input = {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    approvalKey: "writefulExecutionApproval"
  };

  const blocked = validateOperationInput("record", input, false);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, "automation_release_approval_smoke_write_not_allowed");

  const allowed = validateOperationInput("record", input, true);
  assert.equal(allowed.ok, true);
});

test("automation release approval smoke script delegates operations to service only", () => {
  const calls = [];
  const service = {
    recordApproval(input) {
      calls.push({ type: "recordApproval", input });
      return { ok: true, approval: { approvalId: "lgarap_1" } };
    },
    approvalBag(input) {
      calls.push({ type: "approvalBag", input });
      return { ok: true, releaseApproval: {} };
    },
    listApprovals(input) {
      calls.push({ type: "listApprovals", input });
      return { ok: true, approvals: [] };
    }
  };

  runOperation(service, "list", { workspaceId: "weixin_fanfan" });
  runOperation(service, "bag", { workspaceId: "weixin_fanfan" });
  runOperation(service, "record", { workspaceId: "weixin_fanfan", approvalKey: "writefulExecutionApproval" });

  assert.deepEqual(calls.map((call) => call.type), ["listApprovals", "approvalBag", "recordApproval"]);
});

test("automation release approval smoke script projects bounded operator readback", () => {
  const projected = projectAutomationReleaseApprovalSmokeReadback({
    ok: true,
    count: 2,
    approvalKeys: ["backgroundSchedulerApproval", "writefulExecutionApproval"],
    releaseApproval: {
      writefulExecutionApproval: {
        approved: true,
        status: "approved",
        approvalId: "lgarap_writeful",
        approvedBy: "weixin_owner",
        approvedAt: "2026-06-17T08:00:00.000Z"
      }
    },
    approvals: [{
      approvalId: "lgarap_writeful",
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      approvalKey: "writefulExecutionApproval",
      status: "approved",
      approvalVersion: "growth.learningAutomationReleaseApproval.v1",
      approval: {
        schemaVersion: "growth.learningAutomationReleaseApproval.v1",
        approved: true,
        writefulSchedulingAllowed: false
      },
      evidence: {
        schemaVersion: "growth.learningAutomationReleaseApproval.evidence.v1"
      },
      approvedBy: "weixin_owner",
      approvedAt: "2026-06-17T08:00:00.000Z",
      privacyClass: "summary_only"
    }, {
      approvalId: "lgarap_revoked",
      approvalKey: "backgroundSchedulerApproval",
      status: "revoked"
    }]
  }, "bag", { workspaceId: "weixin_fanfan", learnerId: "fanfan" }, false);

  assert.equal(projected.automationReleaseApprovalStatus, "approved");
  assert.equal(projected.automationReleaseApprovalOk, true);
  assert.equal(projected.automationReleaseApprovalOperation, "bag");
  assert.equal(projected.automationReleaseApprovalWriteOperation, false);
  assert.equal(projected.automationReleaseApprovalWriteAllowed, false);
  assert.equal(projected.automationReleaseApprovalWritesPerformed, false);
  assert.equal(projected.automationReleaseApprovalWorkspaceId, "weixin_fanfan");
  assert.equal(projected.automationReleaseApprovalLearnerId, "fanfan");
  assert.equal(projected.automationReleaseApprovalProgramId, "program_science");
  assert.equal(projected.automationReleaseApprovalDomainPackId, "domain_pack_fanfan_cambridge_pathway_v1");
  assert.equal(projected.automationReleaseApprovalDomain, "science");
  assert.equal(projected.automationReleaseApprovalSubject, "science");
  assert.equal(projected.automationReleaseApprovalHorizon, "daily_plan");
  assert.equal(projected.automationReleaseApprovalCount, 2);
  assert.equal(projected.automationReleaseApprovalApprovalId, "lgarap_writeful");
  assert.deepEqual(projected.automationReleaseApprovalApprovalIds, ["lgarap_writeful", "lgarap_revoked"]);
  assert.equal(projected.automationReleaseApprovalApprovalKey, "writefulExecutionApproval");
  assert.deepEqual(projected.automationReleaseApprovalApprovalKeys, ["backgroundSchedulerApproval", "writefulExecutionApproval"]);
  assert.deepEqual(projected.automationReleaseApprovalApprovedKeys, ["writefulExecutionApproval"]);
  assert.equal(projected.automationReleaseApprovalApprovedKeyCount, 1);
  assert.deepEqual(projected.automationReleaseApprovalStatuses, ["approved", "revoked"]);
  assert.equal(projected.automationReleaseApprovalApprovedCount, 1);
  assert.equal(projected.automationReleaseApprovalRevokedCount, 1);
  assert.equal(projected.automationReleaseApprovalPrivacyClass, "summary_only");
  assert.equal(projected.automationReleaseApprovalVersion, "growth.learningAutomationReleaseApproval.v1");
  assert.equal(projected.automationReleaseApprovalEvidenceVersion, "growth.learningAutomationReleaseApproval.evidence.v1");
  assert.equal(projected.automationReleaseApprovalApproved, true);
  assert.equal(projected.automationReleaseApprovalApprovedBy, "weixin_owner");
  assert.equal(projected.automationReleaseApprovalApprovedAt, "2026-06-17T08:00:00.000Z");
  assert.equal(projected.automationReleaseApprovalWritefulSchedulingAllowed, false);
});

test("automation release approval smoke script rejects invalid JSON before service construction", () => {
  const result = spawnSync(process.execPath, [scriptPath, "--workspace-id", "weixin_fanfan", "--approval-json", "{"], {
    cwd: repoRoot,
    env: Object.assign({}, process.env),
    encoding: "utf8"
  });

  assert.equal(result.status, 2);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, false);
  assert.equal(output.error, "automation_release_approval_smoke_invalid_json");
});

test("automation release approval smoke script rejects privacy-risk values before persisting", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-release-approval-privacy-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  try {
    const result = spawnSync(process.execPath, [
      scriptPath,
      "--operation", "record",
      "--allow-write",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--approval-key", "writeful_execution",
      "--approval-json", JSON.stringify({ artifactId: "/Users/example/private-approval.json" }),
      "--json"
    ], {
      cwd: repoRoot,
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    const output = JSON.parse(result.stdout);
    assert.equal(output.ok, false);
    assert.equal(output.error, "learning_automation_release_approval_privacy_failed");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("automation release approval smoke script can record against a temporary SQLite db when explicitly allowed", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-release-approval-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  try {
    const record = spawnSync(process.execPath, [
      scriptPath,
      "--operation", "record",
      "--allow-write",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--approval-key", "writeful_execution",
      "--approved-by", "weixin_owner",
      "--json"
    ], {
      cwd: repoRoot,
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });
    assert.equal(record.status, 0, record.stderr || record.stdout);
    const recordOutput = JSON.parse(record.stdout);
    assert.equal(recordOutput.ok, true);
    assert.equal(recordOutput.operation, "record");
    assert.equal(recordOutput.approval.approvalKey, "writefulExecutionApproval");
    assert.equal(recordOutput.automationReleaseApprovalOperation, "record");
    assert.equal(recordOutput.automationReleaseApprovalWriteOperation, true);
    assert.equal(recordOutput.automationReleaseApprovalWriteAllowed, true);
    assert.equal(recordOutput.automationReleaseApprovalWritesPerformed, true);
    assert.equal(recordOutput.automationReleaseApprovalApprovalKey, "writefulExecutionApproval");
    assert.equal(recordOutput.automationReleaseApprovalApproved, true);
    assert.equal(recordOutput.automationReleaseApprovalWritefulSchedulingAllowed, false);

    const bag = spawnSync(process.execPath, [
      scriptPath,
      "--operation", "bag",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--json"
    ], {
      cwd: repoRoot,
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });
    assert.equal(bag.status, 0, bag.stderr || bag.stdout);
    const bagOutput = JSON.parse(bag.stdout);
    assert.equal(bagOutput.ok, true);
    assert.equal(bagOutput.releaseApproval.writefulExecutionApproval.approved, true);
    assert.equal(bagOutput.automationReleaseApprovalOperation, "bag");
    assert.equal(bagOutput.automationReleaseApprovalWriteOperation, false);
    assert.equal(bagOutput.automationReleaseApprovalApprovedKeys.includes("writefulExecutionApproval"), true);
    assert.equal(bagOutput.automationReleaseApprovalApprovedKeyCount, 1);
    assert.equal(bagOutput.automationReleaseApprovalApprovedCount, 1);
    assert.equal(bagOutput.automationReleaseApprovalWritefulSchedulingAllowed, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
