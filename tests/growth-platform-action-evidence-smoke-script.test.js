const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-platform-action-evidence.js");
const {
  inputFromArgs,
  projectPlatformActionEvidenceSmokeReadback
} = require("../scripts/smoke-growth-platform-action-evidence");

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

test("platform action evidence smoke script projects bounded operator readback", () => {
  const projected = projectPlatformActionEvidenceSmokeReadback({
    ok: true,
    source: "growth-learning-automation-platform-action-evidence-service",
    schemaVersion: "growth.learningAutomationPlatformActionEvidence.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    workspaceId: "smoke_workspace",
    learnerId: "smoke_learner",
    programId: "program_science",
    domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "pass",
    readyForReleaseEvidence: true,
    count: 1,
    latestReceipt: {
      eventId: "event_delivered",
      actionHandoffId: "lgahand_smoke",
      digestId: "lgadig_smoke",
      deliveredAt: "2026-06-15T06:20:00.000Z",
      deliveryStatus: "delivered",
      homeAiStatus: 202,
      inboxItemId: "inbox_smoke",
      actionInboxReceiptPresent: true,
      clickUrlPresent: true,
      webPushReceiptPresent: true,
      webPushEnabled: true,
      webPushAttempted: 1,
      webPushSent: 1,
      webPushFailed: 0,
      webPushSkipped: false
    },
    receipts: [],
    missingRequired: [],
    platformBoundary: {
      summaryOnly: true,
      homeAiOwnsActionInbox: true,
      homeAiOwnsWebPush: true,
      growthReadsOnlyBoundedReceiptSummary: true
    }
  }, { workspaceId: "smoke_workspace", learnerId: "smoke_learner" });

  assert.equal(projected.platformActionEvidenceStatus, "pass");
  assert.equal(projected.platformActionEvidenceOk, true);
  assert.equal(projected.platformActionEvidenceWriteOperation, false);
  assert.equal(projected.platformActionEvidenceWriteAllowed, false);
  assert.equal(projected.platformActionEvidenceWritesPerformed, false);
  assert.equal(projected.platformActionEvidenceWorkspaceId, "smoke_workspace");
  assert.equal(projected.platformActionEvidenceLearnerId, "smoke_learner");
  assert.equal(projected.platformActionEvidenceProgramId, "program_science");
  assert.equal(projected.platformActionEvidenceDomainPackId, "domain_pack_fanfan_cambridge_pathway_v1");
  assert.equal(projected.platformActionEvidenceDomain, "science");
  assert.equal(projected.platformActionEvidenceSubject, "science");
  assert.equal(projected.platformActionEvidenceHorizon, "daily_plan");
  assert.equal(projected.platformActionEvidenceSource, "growth-learning-automation-platform-action-evidence-service");
  assert.equal(projected.platformActionEvidenceSchemaVersion, "growth.learningAutomationPlatformActionEvidence.v1");
  assert.equal(projected.platformActionEvidencePrivacyClass, "summary_only");
  assert.equal(projected.platformActionEvidenceSummaryOnly, true);
  assert.equal(projected.platformActionEvidenceReadyForReleaseEvidence, true);
  assert.equal(projected.platformActionEvidenceCount, 1);
  assert.deepEqual(projected.platformActionEvidenceMissingRequired, []);
  assert.equal(projected.platformActionEvidenceMissingRequiredCount, 0);
  assert.equal(projected.platformActionEvidenceLatestEventId, "event_delivered");
  assert.equal(projected.platformActionEvidenceLatestActionHandoffId, "lgahand_smoke");
  assert.equal(projected.platformActionEvidenceLatestDigestId, "lgadig_smoke");
  assert.equal(projected.platformActionEvidenceHomeAiStatus, 202);
  assert.equal(projected.platformActionEvidenceInboxItemId, "inbox_smoke");
  assert.equal(projected.platformActionEvidenceActionInboxReceiptPresent, true);
  assert.equal(projected.platformActionEvidenceClickUrlPresent, true);
  assert.equal(projected.platformActionEvidenceWebPushReceiptPresent, true);
  assert.equal(projected.platformActionEvidenceWebPushEnabled, true);
  assert.equal(projected.platformActionEvidenceWebPushAttempted, 1);
  assert.equal(projected.platformActionEvidenceWebPushSent, 1);
  assert.equal(projected.platformActionEvidenceWebPushFailed, 0);
  assert.equal(projected.platformActionEvidencePlatformBoundarySummaryOnly, true);
  assert.equal(projected.platformActionEvidenceHomeAiOwnsActionInbox, true);
  assert.equal(projected.platformActionEvidenceHomeAiOwnsWebPush, true);
  assert.equal(projected.platformActionEvidenceGrowthReadsOnlyBoundedReceiptSummary, true);
  assert.equal(projected.platformActionEvidenceRuntimeConfigChange, false);
  assert.equal(projected.platformActionEvidenceConfigChangeApplied, false);
  assert.equal(projected.platformActionEvidenceWritefulSchedulingAllowed, false);
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
    assert.deepEqual(output.missingRequired, [
      "delivered_platform_action_inbox_receipt",
      "delivered_platform_web_push_receipt"
    ]);
    assert.equal(output.platformActionEvidenceStatus, "missing");
    assert.equal(output.platformActionEvidenceOk, false);
    assert.equal(output.platformActionEvidenceWriteOperation, false);
    assert.equal(output.platformActionEvidenceWriteAllowed, false);
    assert.equal(output.platformActionEvidenceWorkspaceId, "smoke_workspace");
    assert.equal(output.platformActionEvidenceLearnerId, "smoke_learner");
    assert.equal(output.platformActionEvidenceReadyForReleaseEvidence, false);
    assert.equal(output.platformActionEvidenceCount, 0);
    assert.deepEqual(output.platformActionEvidenceMissingRequired, [
      "delivered_platform_action_inbox_receipt",
      "delivered_platform_web_push_receipt"
    ]);
    assert.equal(output.platformActionEvidenceMissingRequiredCount, 2);
    assert.equal(output.platformActionEvidenceWritefulSchedulingAllowed, false);
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
              clickUrl: "/?view=inbox&item=inbox_smoke",
              webPush: {
                enabled: true,
                attempted: 1,
                sent: 1,
                failed: 0
              }
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
    assert.equal(output.latestReceipt.webPushReceiptPresent, true);
    assert.equal(output.latestReceipt.webPushSent, 1);
    assert.equal(output.platformActionEvidenceStatus, "pass");
    assert.equal(output.platformActionEvidenceOk, true);
    assert.equal(output.platformActionEvidenceReadyForReleaseEvidence, true);
    assert.equal(output.platformActionEvidenceCount, 1);
    assert.equal(output.platformActionEvidenceLatestEventId, "event_delivered");
    assert.equal(output.platformActionEvidenceLatestActionHandoffId, "lgahand_smoke");
    assert.equal(output.platformActionEvidenceLatestDigestId, "lgadig_smoke");
    assert.equal(output.platformActionEvidenceInboxItemId, "inbox_smoke");
    assert.equal(output.platformActionEvidenceActionInboxReceiptPresent, true);
    assert.equal(output.platformActionEvidenceClickUrlPresent, true);
    assert.equal(output.platformActionEvidenceWebPushReceiptPresent, true);
    assert.equal(output.platformActionEvidenceWebPushSent, 1);
    assert.equal(output.platformActionEvidenceHomeAiOwnsActionInbox, true);
    assert.equal(output.platformActionEvidenceHomeAiOwnsWebPush, true);
    assert.equal(JSON.stringify(output).includes("/?view=inbox"), false);
    assert.equal(JSON.stringify(output).includes("access-key"), false);
  });
});
