const assert = require("node:assert/strict");
const test = require("node:test");

const {
  PLATFORM_ACTION_EVIDENCE_SCHEMA,
  createLearningAutomationPlatformActionEvidenceService,
  publicScope
} = require("../src/services/learning-automation-platform-action-evidence-service");

function serviceWithRecords(records = []) {
  return createLearningAutomationPlatformActionEvidenceService({
    outboxStore: {
      list(status) {
        return records.filter((record) => !status || record.status === status);
      }
    }
  });
}

test("platform action evidence service projects delivered automation notification receipts", () => {
  const service = serviceWithRecords([
    {
      id: "event_old",
      status: "delivered",
      delivered_at: "2026-06-15T06:10:00.000Z",
      event: {
        event_id: "event_old",
        type: "growth.automation.action_required",
        workspace_id: "growth:weixin_fanfan",
        action_handoff_id: "lgahand_old",
        digest_id: "lgadig_old",
        source: "growth-automation-action-handoff-service"
      },
      delivery: {
        status: 202,
        response: {
          inboxItemId: "inbox_old",
          clickUrl: "/?view=inbox",
          webPush: { enabled: true, attempted: 1, sent: 1, failed: 0 }
        }
      }
    },
    {
      id: "event_latest",
      status: "delivered",
      delivered_at: "2026-06-15T06:20:00.000Z",
      event: {
        event_id: "event_latest",
        type: "growth.automation.action_required",
        workspace_id: "growth:weixin_fanfan",
        action_handoff_id: "lgahand_latest",
        digest_id: "lgadig_latest",
        source: "growth-automation-action-handoff-service"
      },
      delivery: {
        status: 202,
        response: {
          inboxItemId: "inbox_latest",
          clickUrl: "/?view=inbox",
          webPush: { enabled: true, attempted: 1, sent: 1, failed: 0 }
        }
      }
    },
    {
      id: "event_other",
      status: "delivered",
      delivered_at: "2026-06-15T06:30:00.000Z",
      event: {
        event_id: "event_other",
        type: "growth.automation.action_required",
        workspace_id: "growth:other_workspace",
        action_handoff_id: "lgahand_other",
        digest_id: "lgadig_other"
      },
      delivery: {
        status: 202,
        response: { inboxItemId: "inbox_other", webPush: { enabled: true, attempted: 1, sent: 1, failed: 0 } }
      }
    }
  ]);

  const result = service.evaluate({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    domain: "science",
    subject: "science"
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, PLATFORM_ACTION_EVIDENCE_SCHEMA);
  assert.equal(result.privacyClass, "summary_only");
  assert.equal(result.status, "pass");
  assert.equal(result.readyForReleaseEvidence, true);
  assert.equal(result.count, 2);
  assert.equal(result.latestReceipt.eventId, "event_latest");
  assert.equal(result.latestReceipt.inboxItemId, "inbox_latest");
  assert.equal(result.latestReceipt.actionInboxReceiptPresent, true);
  assert.equal(result.latestReceipt.clickUrlPresent, true);
  assert.equal(result.latestReceipt.webPushReceiptPresent, true);
  assert.equal(result.latestReceipt.webPushAttempted, 1);
  assert.equal(result.latestReceipt.webPushSent, 1);
  assert.equal(result.latestReceipt.workspaceId, "weixin_fanfan");
  assert.equal(result.platformBoundary.homeAiOwnsActionInbox, true);
  assert.equal(result.platformBoundary.homeAiOwnsWebPush, true);
  assert.equal(result.platformBoundary.growthDoesNotReadPushSubscriptions, true);
  assert.equal(JSON.stringify(result).includes("/?view=inbox"), false);
});

test("platform action evidence service filters by action handoff and digest", () => {
  const service = serviceWithRecords([
    {
      id: "event_1",
      status: "delivered",
      delivered_at: "2026-06-15T06:10:00.000Z",
      event: {
        type: "growth.automation.action_required",
        workspace_id: "growth:weixin_fanfan",
        action_handoff_id: "lgahand_1",
        digest_id: "lgadig_1"
      },
      delivery: { status: 202, response: { inboxItemId: "inbox_1", webPush: { enabled: true, attempted: 1, sent: 1 } } }
    },
    {
      id: "event_2",
      status: "delivered",
      delivered_at: "2026-06-15T06:20:00.000Z",
      event: {
        type: "growth.automation.action_required",
        workspace_id: "growth:weixin_fanfan",
        action_handoff_id: "lgahand_2",
        digest_id: "lgadig_2"
      },
      delivery: { status: 202, response: { inboxItemId: "inbox_2", webPush: { enabled: true, attempted: 1, sent: 1 } } }
    }
  ]);

  const result = service.evaluate({
    workspaceId: "weixin_fanfan",
    actionHandoffId: "lgahand_1",
    digestId: "lgadig_1"
  });

  assert.equal(result.ok, true);
  assert.equal(result.count, 1);
  assert.equal(result.latestReceipt.actionHandoffId, "lgahand_1");
  assert.equal(result.latestReceipt.digestId, "lgadig_1");
  assert.equal(result.latestReceipt.inboxItemId, "inbox_1");
  assert.equal(result.latestReceipt.webPushReceiptPresent, true);
});

test("platform action evidence service requires both Action Inbox and Web Push receipts", () => {
  const inboxOnly = serviceWithRecords([
    {
      id: "event_inbox_only",
      status: "delivered",
      delivered_at: "2026-06-15T06:10:00.000Z",
      event: {
        type: "growth.automation.action_required",
        workspace_id: "growth:weixin_fanfan"
      },
      delivery: {
        status: 202,
        response: { inboxItemId: "inbox_only", clickUrl: "/?view=inbox" }
      }
    }
  ]).evaluate({ workspaceId: "weixin_fanfan" });

  assert.equal(inboxOnly.ok, false);
  assert.equal(inboxOnly.status, "missing");
  assert.deepEqual(inboxOnly.missingRequired, ["delivered_platform_web_push_receipt"]);
  assert.equal(inboxOnly.latestReceipt.actionInboxReceiptPresent, true);
  assert.equal(inboxOnly.latestReceipt.webPushReceiptPresent, false);

  const webPushOnly = serviceWithRecords([
    {
      id: "event_push_only",
      status: "delivered",
      delivered_at: "2026-06-15T06:20:00.000Z",
      event: {
        type: "growth.automation.action_required",
        workspace_id: "growth:weixin_fanfan"
      },
      delivery: {
        status: 202,
        response: { webPush: { enabled: true, attempted: 1, sent: 1 } }
      }
    }
  ]).evaluate({ workspaceId: "weixin_fanfan" });

  assert.equal(webPushOnly.ok, false);
  assert.deepEqual(webPushOnly.missingRequired, ["delivered_platform_action_inbox_receipt"]);
});

test("platform action evidence service fails closed when no delivered platform receipt exists", () => {
  const service = serviceWithRecords([
    {
      id: "pending_event",
      status: "pending",
      event: {
        type: "growth.automation.action_required",
        workspace_id: "growth:weixin_fanfan"
      }
    },
    {
      id: "non_action_event",
      status: "delivered",
      event: {
        type: "growth.card.completed",
        workspace_id: "growth:weixin_fanfan"
      },
      delivery: { status: 202, response: { inboxItemId: "inbox_card" } }
    }
  ]);

  const result = service.evaluate({ workspaceId: "weixin_fanfan" });

  assert.equal(result.ok, false);
  assert.equal(result.status, "missing");
  assert.equal(result.readyForReleaseEvidence, false);
  assert.deepEqual(result.missingRequired, [
    "delivered_platform_action_inbox_receipt",
    "delivered_platform_web_push_receipt"
  ]);
  assert.equal(result.error, "platform_action_evidence_missing");
});

test("platform action evidence service rejects privacy-risk input and unavailable outbox", () => {
  const privacy = serviceWithRecords([]).evaluate({
    workspaceId: "weixin_fanfan",
    rawPrompt: "do not store"
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "platform_action_evidence_privacy_failed");
  assert.deepEqual(publicScope({ workspace_id: "weixin_fanfan", limit: 200 }).limit, 50);

  const unavailable = createLearningAutomationPlatformActionEvidenceService().evaluate({
    workspaceId: "weixin_fanfan"
  });
  assert.equal(unavailable.ok, false);
  assert.equal(unavailable.error, "platform_action_evidence_outbox_unavailable");
});
