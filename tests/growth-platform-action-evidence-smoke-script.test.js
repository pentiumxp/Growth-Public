const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-platform-action-evidence.js");
const { inputFromArgs } = require("../scripts/smoke-growth-platform-action-evidence");

function withTempOutbox(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-platform-action-evidence-"));
  const eventOutboxPath = path.join(dir, "growth-event-outbox.json");
  try {
    return callback({ dir, eventOutboxPath });
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

test("platform action evidence smoke script parses bounded selectors", () => {
  assert.deepEqual(inputFromArgs([
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--action-handoff-id", "lgahand_1",
    "--digest-id", "lgadig_1",
    "--limit", "7"
  ]), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    actionHandoffId: "lgahand_1",
    digestId: "lgadig_1",
    limit: 7
  });
});

test("platform action evidence smoke script fails closed for missing workspace", () => {
  const result = runScript(["--json"]);
  assert.equal(result.status, 2);
  assert.equal(parseStdout(result).error, "platform_action_evidence_workspace_required");
});

test("platform action evidence smoke script reports missing evidence without writing", () => {
  withTempOutbox(({ dir, eventOutboxPath }) => {
    fs.writeFileSync(eventOutboxPath, JSON.stringify({ events: [] }), "utf8");
    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_EVENT_OUTBOX_STORE_PATH: eventOutboxPath
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = parseStdout(result);
    assert.equal(output.ok, false);
    assert.equal(output.status, "missing");
    assert.equal(output.error, "platform_action_evidence_missing");
    assert.deepEqual(output.missingRequired, ["delivered_platform_action_inbox_receipt"]);
  });
});

test("platform action evidence smoke script returns summary-only delivered receipt evidence", () => {
  withTempOutbox(({ dir, eventOutboxPath }) => {
    fs.writeFileSync(eventOutboxPath, JSON.stringify({
      events: [
        {
          id: "event_delivered",
          status: "delivered",
          delivered_at: "2026-06-15T06:20:00.000Z",
          event: {
            event_id: "event_delivered",
            type: "growth.automation.action_required",
            workspace_id: "growth:smoke_workspace",
            action_handoff_id: "lgahand_smoke",
            digest_id: "lgadig_smoke",
            source: "growth-automation-action-handoff-service",
            summary: "Owner action is required."
          },
          delivery: {
            status: 202,
            response: {
              inboxItemId: "inbox_smoke",
              clickUrl: "/?view=inbox&item=inbox_smoke"
            }
          }
        }
      ]
    }), "utf8");

    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--action-handoff-id", "lgahand_smoke",
      "--digest-id", "lgadig_smoke",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_EVENT_OUTBOX_STORE_PATH: eventOutboxPath
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = parseStdout(result);
    assert.equal(output.ok, true);
    assert.equal(output.status, "pass");
    assert.equal(output.readyForReleaseEvidence, true);
    assert.equal(output.latestReceipt.inboxItemId, "inbox_smoke");
    assert.equal(output.latestReceipt.clickUrlPresent, true);
    assert.equal(JSON.stringify(output).includes("/?view=inbox"), false);
    assert.equal(JSON.stringify(output).includes("access-key"), false);
  });
});
