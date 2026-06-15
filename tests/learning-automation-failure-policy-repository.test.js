const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningAutomationFailurePolicyRepository
} = require("../src/stores/growth-learning-sqlite/automation-failure-policies");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-failure-policy-"));
  const dbPath = path.join(dir, "automation-failure-policies.sqlite3");
  const repository = createLearningAutomationFailurePolicyRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-15T11:00:00.000Z")
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function samplePolicy(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "draft",
    policyVersion: "growth.learningAutomationFailurePolicy.v1",
    policy: {
      schemaVersion: "growth.learningAutomationFailurePolicy.v1",
      summaryOnly: true,
      ownerReviewRequired: true,
      writefulSchedulingAllowed: false
    },
    rollbackPolicy: {
      schemaVersion: "growth.learningAutomationFailurePolicy.rollback.v1",
      summaryOnly: true,
      transactionalPublishRequired: true,
      partialPublishBehavior: "service_transaction_rollback",
      retryRequiresOwner: true,
      maxAutomaticRetries: 0
    },
    failurePolicy: {
      schemaVersion: "growth.learningAutomationFailurePolicy.failure.v1",
      summaryOnly: true,
      visibleFailureRequired: true,
      ownerReviewRequired: true,
      retryRequiresOwner: true,
      maxAutomaticRetries: 0,
      writefulSchedulingAllowed: false
    },
    createdBy: "weixin_owner",
    privacyClass: "summary_only"
  }, overrides);
}

test("automation failure policy repository saves, lists, and de-duplicates summary-only policies", () => {
  withRepository(({ repository }) => {
    const saved = repository.savePolicy(samplePolicy());

    assert.equal(saved.ok, true);
    assert.equal(saved.duplicate, false);
    assert.equal(saved.policy.workspaceId, "weixin_fanfan");
    assert.equal(saved.policy.status, "draft");
    assert.equal(saved.policy.policy.summaryOnly, true);
    assert.equal(saved.policy.policy.writefulSchedulingAllowed, false);
    assert.equal(saved.policy.rollbackPolicy.transactionalPublishRequired, true);
    assert.equal(saved.policy.failurePolicy.retryRequiresOwner, true);
    assert.equal(saved.policy.privacyClass, "summary_only");

    const duplicate = repository.savePolicy(samplePolicy({
      failurePolicy: { visibleFailureRequired: false }
    }));
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.policy.policyId, saved.policy.policyId);
    assert.equal(duplicate.policy.failurePolicy.visibleFailureRequired, true);

    const listed = repository.listPolicies({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      status: "draft",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      limit: 5
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].policyId, saved.policy.policyId);
    assert.equal(JSON.stringify(listed[0]).includes("rawAnswer"), false);

    assert.deepEqual(repository.listPolicies({ workspaceId: "other_workspace" }), []);
  });
});

test("automation failure policy repository records bounded Owner activation review", () => {
  withRepository(({ repository }) => {
    const saved = repository.savePolicy(samplePolicy());

    const activated = repository.reviewPolicy({
      workspaceId: "weixin_fanfan",
      policyId: saved.policy.policyId,
      status: "active",
      note: "Owner activates manual retry policy.",
      reviewedBy: "weixin_owner"
    });
    assert.equal(activated.ok, true);
    assert.equal(activated.duplicate, false);
    assert.equal(activated.policy.status, "active");
    assert.equal(activated.policy.review.summaryOnly, true);
    assert.equal(activated.policy.review.status, "active");
    assert.equal(activated.policy.review.note, "Owner activates manual retry policy.");

    const duplicate = repository.reviewPolicy({
      workspaceId: "weixin_fanfan",
      policyId: saved.policy.policyId,
      status: "active"
    });
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);

    const conflicting = repository.reviewPolicy({
      workspaceId: "weixin_fanfan",
      policyId: saved.policy.policyId,
      status: "archived"
    });
    assert.equal(conflicting.ok, false);
    assert.equal(conflicting.error, "learning_automation_failure_policy_already_reviewed");
  });
});

test("automation failure policy repository rejects privacy-risk keys and non-summary privacy class", () => {
  withRepository(({ repository }) => {
    const privacyRisk = repository.savePolicy(samplePolicy({
      failurePolicy: { rawPrompt: "DO_NOT_STORE" }
    }));
    assert.equal(privacyRisk.ok, false);
    assert.equal(privacyRisk.error, "learning_automation_failure_policy_privacy_failed");
    assert.equal(privacyRisk.privacyFindings.includes("$.failurePolicy.rawPrompt"), true);

    const wrongClass = repository.savePolicy(samplePolicy({
      privacyClass: "raw_payload"
    }));
    assert.equal(wrongClass.ok, false);
    assert.equal(wrongClass.error, "learning_automation_failure_policy_privacy_class_required");

    const missingScope = repository.savePolicy(samplePolicy({
      workspaceId: "",
      horizon: ""
    }));
    assert.equal(missingScope.ok, false);
    assert.equal(missingScope.error, "learning_automation_failure_policy_scope_required");

    assert.deepEqual(repository.listPolicies({ workspaceId: "weixin_fanfan" }), []);
  });
});

test("automation failure policy repository rejects invalid reviews and migrates review columns", () => {
  withRepository(({ dbPath, repository }) => {
    const db = new DatabaseSync(dbPath, { open: true });
    db.exec(`
      CREATE TABLE learning_growth_automation_failure_policies (
        policy_id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        learner_id TEXT NOT NULL DEFAULT '',
        program_id TEXT NOT NULL DEFAULT '',
        domain_pack_id TEXT NOT NULL DEFAULT '',
        domain TEXT NOT NULL DEFAULT '',
        subject TEXT NOT NULL DEFAULT '',
        horizon TEXT NOT NULL DEFAULT 'daily_plan',
        status TEXT NOT NULL DEFAULT 'draft',
        policy_json TEXT NOT NULL DEFAULT '{}',
        rollback_json TEXT NOT NULL DEFAULT '{}',
        failure_json TEXT NOT NULL DEFAULT '{}',
        created_by TEXT NOT NULL DEFAULT '',
        privacy_class TEXT NOT NULL DEFAULT 'summary_only',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    db.close();

    assert.equal(repository.ensureSchema().ok, true);
    const migrated = new DatabaseSync(dbPath, { open: true, readOnly: true });
    const columns = migrated.prepare("PRAGMA table_info(learning_growth_automation_failure_policies)").all().map((column) => column.name);
    migrated.close();
    assert.equal(columns.includes("review_json"), true);
    assert.equal(columns.includes("reviewed_by"), true);
    assert.equal(columns.includes("reviewed_at"), true);
    assert.equal(columns.includes("policy_version"), true);

    const missing = repository.reviewPolicy({
      workspaceId: "weixin_fanfan",
      policyId: "missing",
      status: "active"
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.error, "learning_automation_failure_policy_not_found");

    const invalidStatus = repository.reviewPolicy({
      workspaceId: "weixin_fanfan",
      policyId: "missing",
      status: "published"
    });
    assert.equal(invalidStatus.ok, false);
    assert.equal(invalidStatus.error, "learning_automation_failure_policy_status_invalid");

    const privacy = repository.reviewPolicy({
      workspaceId: "weixin_fanfan",
      policyId: "missing",
      status: "active",
      rawPrompt: "DO_NOT_STORE"
    });
    assert.equal(privacy.ok, false);
    assert.equal(privacy.error, "learning_automation_failure_policy_privacy_failed");
  });
});
