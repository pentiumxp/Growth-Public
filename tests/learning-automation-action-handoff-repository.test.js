const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningAutomationActionHandoffRepository
} = require("../src/stores/growth-learning-sqlite/automation-action-handoffs");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-action-handoff-"));
  const dbPath = path.join(dir, "automation-action-handoffs.sqlite3");
  const repository = createLearningAutomationActionHandoffRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-15T11:30:00.000Z")
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sampleHandoff(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    digestId: "lgadig_ready_1",
    policyId: "lgafpol_active_1",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "pending_delivery",
    deliveryStatus: "not_delivered",
    actionSummary: {
      schemaVersion: "growth.learningAutomationActionHandoff.summary.v1",
      summaryOnly: true,
      requiredActions: 1,
      blocked: 1,
      dryRun: true,
      writePlanned: false,
      writesPerformed: false,
      publishPlanned: false
    },
    actions: [{
      candidateId: "lgauto_ready:lgplan_next:plan_item_next",
      requiredActor: "owner",
      endpoint: "/api/v1/growth/automation/proposals/lgauto_ready/publish",
      proposalId: "lgauto_ready",
      planDraftId: "lgplan_next",
      selectedItemId: "plan_item_next",
      publishRequiresOwnerAction: true
    }],
    blocked: [{
      candidateId: "lgauto_blocked:lgplan_blocked:plan_item_blocked",
      proposalId: "lgauto_blocked",
      decision: "blocked_audit",
      reason: "source_cycle_not_ready"
    }],
    policyReadiness: {
      status: "failure_policy_ready",
      readyForWritefulAutomationPrerequisite: true,
      writefulSchedulingAllowed: false,
      policyId: "lgafpol_active_1"
    },
    notification: {
      schemaVersion: "growth.learningAutomationActionHandoff.notification.v1",
      summaryOnly: true,
      eventType: "growth.automation.action_required",
      summary: "Automation digest requires Owner action."
    },
    createdBy: "weixin_owner",
    privacyClass: "summary_only"
  }, overrides);
}

test("automation action handoff repository saves, lists, and de-duplicates summary-only handoffs", () => {
  withRepository(({ repository }) => {
    const saved = repository.saveHandoff(sampleHandoff());

    assert.equal(saved.ok, true);
    assert.equal(saved.duplicate, false);
    assert.equal(saved.handoff.workspaceId, "weixin_fanfan");
    assert.equal(saved.handoff.status, "pending_delivery");
    assert.equal(saved.handoff.deliveryStatus, "not_delivered");
    assert.equal(saved.handoff.actions[0].publishRequiresOwnerAction, true);
    assert.equal(saved.handoff.blocked[0].decision, "blocked_audit");
    assert.equal(saved.handoff.policyReadiness.writefulSchedulingAllowed, false);
    assert.equal(saved.handoff.privacyClass, "summary_only");

    const duplicate = repository.saveHandoff(sampleHandoff({
      actionSummary: { requiredActions: 99 }
    }));
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.handoff.handoffId, saved.handoff.handoffId);
    assert.equal(duplicate.handoff.actionSummary.requiredActions, 1);

    const listed = repository.listHandoffs({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      digestId: "lgadig_ready_1",
      status: "pending_delivery",
      deliveryStatus: "not_delivered",
      domainPackId: "uk_hk_curriculum_foundation",
      subject: "science",
      limit: 5
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].handoffId, saved.handoff.handoffId);
    assert.equal(JSON.stringify(listed[0]).includes("rawAnswer"), false);

    assert.deepEqual(repository.listHandoffs({ workspaceId: "other_workspace" }), []);
    assert.equal(repository.getHandoff({ workspaceId: "weixin_fanfan", handoffId: saved.handoff.handoffId }).handoffId, saved.handoff.handoffId);
  });
});

test("automation action handoff repository records delivery success and visible failure", () => {
  withRepository(({ repository }) => {
    const saved = repository.saveHandoff(sampleHandoff());

    const failed = repository.recordDelivery({
      workspaceId: "weixin_fanfan",
      handoffId: saved.handoff.handoffId,
      deliveryStatus: "delivery_failed",
      error: "home_ai_notification_post_failed",
      deliveredBy: "weixin_owner"
    });
    assert.equal(failed.ok, true);
    assert.equal(failed.handoff.status, "delivery_failed");
    assert.equal(failed.handoff.deliveryStatus, "delivery_failed");
    assert.equal(failed.handoff.deliveryAttempts, 1);
    assert.equal(failed.handoff.delivery.error, "home_ai_notification_post_failed");

    const delivered = repository.recordDelivery({
      workspaceId: "weixin_fanfan",
      handoffId: saved.handoff.handoffId,
      deliveryStatus: "delivered",
      delivery: { ok: true, inboxItemId: "inbox_1" },
      deliveredBy: "weixin_owner"
    });
    assert.equal(delivered.ok, true);
    assert.equal(delivered.handoff.status, "delivered");
    assert.equal(delivered.handoff.deliveryStatus, "delivered");
    assert.equal(delivered.handoff.deliveryAttempts, 2);

    const duplicate = repository.recordDelivery({
      workspaceId: "weixin_fanfan",
      handoffId: saved.handoff.handoffId,
      deliveryStatus: "delivered"
    });
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.handoff.deliveryAttempts, 2);
  });
});

test("automation action handoff repository rejects privacy-risk fields and non-summary class", () => {
  withRepository(({ repository }) => {
    const privacy = repository.saveHandoff(sampleHandoff({
      rawAnswer: "private learner answer"
    }));
    assert.equal(privacy.ok, false);
    assert.equal(privacy.error, "learning_automation_action_handoff_privacy_failed");

    const privacyValue = repository.saveHandoff(sampleHandoff({
      actions: [{
        proposalId: "lgauto_ready",
        artifactId: "/Users/example/private-handoff.json"
      }]
    }));
    assert.equal(privacyValue.ok, false);
    assert.equal(privacyValue.error, "learning_automation_action_handoff_privacy_failed");
    assert.equal(privacyValue.privacyFindings.includes("$.actions[0].artifactId"), true);

    const privacyClass = repository.saveHandoff(sampleHandoff({
      privacyClass: "raw_private"
    }));
    assert.equal(privacyClass.ok, false);
    assert.equal(privacyClass.error, "learning_automation_action_handoff_privacy_class_required");

    const invalidDelivery = repository.recordDelivery({
      workspaceId: "weixin_fanfan",
      handoffId: "missing",
      deliveryStatus: "published"
    });
    assert.equal(invalidDelivery.ok, false);
    assert.equal(invalidDelivery.error, "learning_automation_action_handoff_delivery_status_invalid");
  });
});

test("automation action handoff repository migrates delivery columns on existing tables", () => {
  withRepository(({ dbPath, repository }) => {
    {
      const db = new DatabaseSync(dbPath, { open: true });
      db.exec(`
        CREATE TABLE learning_growth_automation_action_handoffs (
          handoff_id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          learner_id TEXT NOT NULL DEFAULT '',
          program_id TEXT NOT NULL DEFAULT '',
          digest_id TEXT NOT NULL DEFAULT '',
          policy_id TEXT NOT NULL DEFAULT '',
          domain_pack_id TEXT NOT NULL DEFAULT '',
          domain TEXT NOT NULL DEFAULT '',
          subject TEXT NOT NULL DEFAULT '',
          horizon TEXT NOT NULL DEFAULT 'daily_plan',
          status TEXT NOT NULL DEFAULT 'pending_delivery',
          action_summary_json TEXT NOT NULL DEFAULT '{}',
          actions_json TEXT NOT NULL DEFAULT '[]',
          blocked_json TEXT NOT NULL DEFAULT '[]',
          created_by TEXT NOT NULL DEFAULT '',
          privacy_class TEXT NOT NULL DEFAULT 'summary_only',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      db.close();
    }

    const saved = repository.saveHandoff(sampleHandoff());
    assert.equal(saved.ok, true);
    assert.equal(saved.handoff.deliveryStatus, "not_delivered");
    assert.equal(saved.handoff.policyReadiness.status, "failure_policy_ready");
  });
});
