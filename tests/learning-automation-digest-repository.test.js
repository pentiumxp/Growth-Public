const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningAutomationDigestRepository
} = require("../src/stores/growth-learning-sqlite/automation-digests");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-digest-"));
  const dbPath = path.join(dir, "automation-digests.sqlite3");
  const repository = createLearningAutomationDigestRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-15T10:30:00.000Z")
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sampleDigest(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "pending",
    sourcePolicy: {
      schemaVersion: "growth.learningAutomationDigest.sourcePolicy.v1",
      summaryOnly: true,
      dryRunSource: "growth-learning-automation-scheduler-service"
    },
    summary: {
      inspected: 2,
      wouldPublish: 1,
      blocked: 1,
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
      decision: "would_publish",
      wouldPublish: true,
      dryRun: true,
      writePlanned: false,
      writesPerformed: false,
      publishPlanned: false,
      publishRequiresOwnerAction: true
    }, {
      candidateId: "lgauto_blocked:lgplan_blocked:plan_item_blocked",
      proposalId: "lgauto_blocked",
      planDraftId: "lgplan_blocked",
      selectedItemId: "plan_item_blocked",
      decision: "blocked_audit",
      wouldPublish: false,
      dryRun: true,
      writePlanned: false,
      writesPerformed: false,
      publishPlanned: false
    }],
    blocked: [{
      candidateId: "lgauto_blocked:lgplan_blocked:plan_item_blocked",
      proposalId: "lgauto_blocked",
      decision: "blocked_audit",
      reason: "source_cycle_not_ready"
    }],
    requiredActions: [{
      candidateId: "lgauto_ready:lgplan_next:plan_item_next",
      requiredActor: "owner",
      endpoint: "/api/v1/growth/automation/proposals/lgauto_ready/publish",
      proposalId: "lgauto_ready",
      publishRequiresOwnerAction: true
    }],
    createdBy: "weixin_owner",
    privacyClass: "summary_only"
  }, overrides);
}

test("automation digest repository saves, lists, and de-duplicates summary-only digests", () => {
  withRepository(({ repository }) => {
    const saved = repository.saveDigest(sampleDigest());

    assert.equal(saved.ok, true);
    assert.equal(saved.duplicate, false);
    assert.equal(saved.digest.workspaceId, "weixin_fanfan");
    assert.equal(saved.digest.status, "pending");
    assert.equal(saved.digest.summary.wouldPublish, 1);
    assert.equal(saved.digest.summary.writePlanned, false);
    assert.equal(saved.digest.candidates.length, 2);
    assert.equal(saved.digest.blocked[0].decision, "blocked_audit");
    assert.equal(saved.digest.requiredActions[0].publishRequiresOwnerAction, true);
    assert.equal(saved.digest.privacyClass, "summary_only");

    const duplicate = repository.saveDigest(sampleDigest({
      summary: { inspected: 99, wouldPublish: 99 }
    }));
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.digest.digestId, saved.digest.digestId);
    assert.equal(duplicate.digest.summary.inspected, 2);

    const listed = repository.listDigests({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      status: "pending",
      domainPackId: "uk_hk_curriculum_foundation",
      subject: "science",
      limit: 5
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].digestId, saved.digest.digestId);
    assert.equal(JSON.stringify(listed[0]).includes("rawAnswer"), false);

    assert.deepEqual(repository.listDigests({ workspaceId: "other_workspace" }), []);
  });
});

test("automation digest repository records bounded Owner review without execution", () => {
  withRepository(({ repository }) => {
    const saved = repository.saveDigest(sampleDigest());

    const reviewed = repository.reviewDigest({
      workspaceId: "weixin_fanfan",
      digestId: saved.digest.digestId,
      status: "reviewed",
      selectedCandidateIds: ["lgauto_ready:lgplan_next:plan_item_next"],
      note: "Reviewed. Keep publication manual.",
      reviewedBy: "weixin_owner"
    });
    assert.equal(reviewed.ok, true);
    assert.equal(reviewed.duplicate, false);
    assert.equal(reviewed.digest.status, "reviewed");
    assert.equal(reviewed.digest.review.summaryOnly, true);
    assert.equal(reviewed.digest.review.status, "reviewed");
    assert.equal(reviewed.digest.review.note, "Reviewed. Keep publication manual.");
    assert.deepEqual(reviewed.digest.review.selectedCandidateIds, ["lgauto_ready:lgplan_next:plan_item_next"]);

    const duplicate = repository.reviewDigest({
      workspaceId: "weixin_fanfan",
      digestId: saved.digest.digestId,
      status: "reviewed"
    });
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);

    const conflicting = repository.reviewDigest({
      workspaceId: "weixin_fanfan",
      digestId: saved.digest.digestId,
      status: "archived"
    });
    assert.equal(conflicting.ok, false);
    assert.equal(conflicting.error, "learning_automation_digest_already_reviewed");
  });
});

test("automation digest repository rejects privacy-risk keys and non-summary privacy class", () => {
  withRepository(({ repository }) => {
    const privacyRisk = repository.saveDigest(sampleDigest({
      candidates: [{ rawPrompt: "DO_NOT_STORE" }]
    }));
    assert.equal(privacyRisk.ok, false);
    assert.equal(privacyRisk.error, "learning_automation_digest_privacy_failed");
    assert.equal(privacyRisk.privacyFindings.includes("$.candidates[0].rawPrompt"), true);

    const privacyValue = repository.saveDigest(sampleDigest({
      candidates: [{ artifactId: "/Users/example/private-digest.json" }]
    }));
    assert.equal(privacyValue.ok, false);
    assert.equal(privacyValue.error, "learning_automation_digest_privacy_failed");
    assert.equal(privacyValue.privacyFindings.includes("$.candidates[0].artifactId"), true);

    const wrongClass = repository.saveDigest(sampleDigest({
      privacyClass: "raw_payload"
    }));
    assert.equal(wrongClass.ok, false);
    assert.equal(wrongClass.error, "learning_automation_digest_privacy_class_required");

    const missingScope = repository.saveDigest(sampleDigest({
      workspaceId: "",
      horizon: ""
    }));
    assert.equal(missingScope.ok, false);
    assert.equal(missingScope.error, "learning_automation_digest_scope_required");

    assert.deepEqual(repository.listDigests({ workspaceId: "weixin_fanfan" }), []);
  });
});

test("automation digest repository rejects invalid reviews and migrates review columns", () => {
  withRepository(({ dbPath, repository }) => {
    const db = new DatabaseSync(dbPath, { open: true });
    db.exec(`
      CREATE TABLE learning_growth_automation_digests (
        digest_id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        learner_id TEXT NOT NULL DEFAULT '',
        program_id TEXT NOT NULL DEFAULT '',
        domain_pack_id TEXT NOT NULL DEFAULT '',
        domain TEXT NOT NULL DEFAULT '',
        subject TEXT NOT NULL DEFAULT '',
        horizon TEXT NOT NULL DEFAULT 'daily_plan',
        status TEXT NOT NULL DEFAULT 'pending',
        source_policy_json TEXT NOT NULL DEFAULT '{}',
        summary_json TEXT NOT NULL DEFAULT '{}',
        candidates_json TEXT NOT NULL DEFAULT '[]',
        blocked_json TEXT NOT NULL DEFAULT '[]',
        required_actions_json TEXT NOT NULL DEFAULT '[]',
        created_by TEXT NOT NULL DEFAULT '',
        privacy_class TEXT NOT NULL DEFAULT 'summary_only',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    db.close();

    assert.equal(repository.ensureSchema().ok, true);
    const migrated = new DatabaseSync(dbPath, { open: true, readOnly: true });
    const columns = migrated.prepare("PRAGMA table_info(learning_growth_automation_digests)").all().map((column) => column.name);
    migrated.close();
    assert.equal(columns.includes("review_json"), true);
    assert.equal(columns.includes("reviewed_by"), true);
    assert.equal(columns.includes("reviewed_at"), true);

    const missing = repository.reviewDigest({
      workspaceId: "weixin_fanfan",
      digestId: "missing",
      status: "reviewed"
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.error, "learning_automation_digest_not_found");

    const invalidStatus = repository.reviewDigest({
      workspaceId: "weixin_fanfan",
      digestId: "missing",
      status: "published"
    });
    assert.equal(invalidStatus.ok, false);
    assert.equal(invalidStatus.error, "learning_automation_digest_status_invalid");

    const privacy = repository.reviewDigest({
      workspaceId: "weixin_fanfan",
      digestId: "missing",
      status: "reviewed",
      rawPrompt: "DO_NOT_STORE"
    });
    assert.equal(privacy.ok, false);
    assert.equal(privacy.error, "learning_automation_digest_privacy_failed");
  });
});
