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
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
