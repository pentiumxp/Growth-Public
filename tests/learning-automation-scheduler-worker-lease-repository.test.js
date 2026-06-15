const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningAutomationSchedulerWorkerLeaseRepository
} = require("../src/stores/growth-learning-sqlite/automation-scheduler-worker-leases");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-scheduler-worker-lease-"));
  const dbPath = path.join(dir, "automation-scheduler-worker-leases.sqlite3");
  const repository = createLearningAutomationSchedulerWorkerLeaseRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-15T14:00:00.000Z")
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sampleLease(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    workerId: "growth-worker-a",
    leaseToken: "lease-token-a",
    leaseMs: 10 * 60 * 1000,
    claimedAt: "2026-06-15T14:00:00.000Z",
    leaseUntil: "2026-06-15T14:10:00.000Z",
    input: {
      schemaVersion: "growth.learningAutomationSchedulerWorker.input.v1",
      summaryOnly: true,
      workerEnabled: true
    },
    summary: {
      schemaVersion: "growth.learningAutomationSchedulerWorker.summary.v1",
      summaryOnly: true,
      noDirectGateway: true
    },
    privacyClass: "summary_only"
  }, overrides);
}

test("automation scheduler worker lease repository claims, releases, gets, and lists summary-only leases", () => {
  withRepository(({ repository }) => {
    const claimed = repository.claimLease(sampleLease());

    assert.equal(claimed.ok, true);
    assert.equal(claimed.lease.workspaceId, "weixin_fanfan");
    assert.equal(claimed.lease.status, "claimed");
    assert.equal(claimed.lease.workerId, "growth-worker-a");
    assert.equal(claimed.lease.attemptCount, 1);
    assert.equal(claimed.lease.privacyClass, "summary_only");
    assert.equal(JSON.stringify(claimed.lease).includes("lease-token-a"), false);

    const released = repository.releaseLease({
      leaseId: claimed.lease.leaseId,
      leaseToken: "lease-token-a",
      status: "released",
      reason: "scheduler_worker_tick_released",
      runId: "lgasrun_ready_1",
      runStatus: "completed",
      summary: {
        schemaVersion: "growth.learningAutomationSchedulerWorker.summary.v1",
        summaryOnly: true,
        schedulerRunId: "lgasrun_ready_1",
        schedulerRunStatus: "completed",
        noDirectGateway: true
      },
      releasedAt: "2026-06-15T14:02:00.000Z"
    });

    assert.equal(released.ok, true);
    assert.equal(released.lease.status, "released");
    assert.equal(released.lease.runId, "lgasrun_ready_1");
    assert.equal(released.lease.runStatus, "completed");
    assert.equal(released.lease.summary.schedulerRunStatus, "completed");

    const listed = repository.listLeases({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      subject: "science",
      status: "released",
      limit: 5
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].leaseId, claimed.lease.leaseId);
    assert.equal(repository.getLease({ workspaceId: "weixin_fanfan", leaseId: claimed.lease.leaseId }).status, "released");
    assert.deepEqual(repository.listLeases({ workspaceId: "other_workspace" }), []);
  });
});

test("automation scheduler worker lease repository protects active leases and reclaims expired leases", () => {
  withRepository(({ repository }) => {
    const first = repository.claimLease(sampleLease());
    assert.equal(first.ok, true);

    const activeConflict = repository.claimLease(sampleLease({
      workerId: "growth-worker-b",
      leaseToken: "lease-token-b",
      claimedAt: "2026-06-15T14:05:00.000Z",
      leaseUntil: "2026-06-15T14:15:00.000Z"
    }));
    assert.equal(activeConflict.ok, false);
    assert.equal(activeConflict.error, "learning_automation_scheduler_worker_lease_active");
    assert.equal(activeConflict.lease.workerId, "growth-worker-a");

    const reclaimed = repository.claimLease(sampleLease({
      workerId: "growth-worker-b",
      leaseToken: "lease-token-b",
      claimedAt: "2026-06-15T14:11:00.000Z",
      leaseUntil: "2026-06-15T14:21:00.000Z"
    }));
    assert.equal(reclaimed.ok, true);
    assert.equal(reclaimed.reclaimed, true);
    assert.equal(reclaimed.lease.workerId, "growth-worker-b");
    assert.equal(reclaimed.lease.attemptCount, 2);

    const staleRelease = repository.releaseLease({
      leaseId: first.lease.leaseId,
      leaseToken: "lease-token-a",
      status: "released",
      releasedAt: "2026-06-15T14:12:00.000Z"
    });
    assert.equal(staleRelease.ok, false);
    assert.equal(staleRelease.error, "learning_automation_scheduler_worker_lease_release_conflict");
    assert.equal(staleRelease.lease.workerId, "growth-worker-b");
  });
});

test("automation scheduler worker lease repository rejects privacy-risk fields, non-summary class, and invalid release status", () => {
  withRepository(({ repository }) => {
    const privacy = repository.claimLease(sampleLease({
      input: { rawPrompt: "do not store" }
    }));
    assert.equal(privacy.ok, false);
    assert.equal(privacy.error, "learning_automation_scheduler_worker_lease_privacy_failed");
    assert.equal(privacy.privacyFindings.includes("$.input.rawPrompt"), true);

    const privacyClass = repository.claimLease(sampleLease({
      privacyClass: "raw_private"
    }));
    assert.equal(privacyClass.ok, false);
    assert.equal(privacyClass.error, "learning_automation_scheduler_worker_lease_privacy_class_required");

    const claimed = repository.claimLease(sampleLease());
    const invalidStatus = repository.releaseLease({
      leaseId: claimed.lease.leaseId,
      leaseToken: "lease-token-a",
      status: "queued"
    });
    assert.equal(invalidStatus.ok, false);
    assert.equal(invalidStatus.error, "learning_automation_scheduler_worker_lease_status_invalid");
  });
});

test("automation scheduler worker lease repository migrates bounded columns on existing tables", () => {
  withRepository(({ dbPath, repository }) => {
    {
      const db = new DatabaseSync(dbPath, { open: true });
      db.exec(`
        CREATE TABLE learning_growth_automation_scheduler_worker_leases (
          lease_id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          learner_id TEXT NOT NULL DEFAULT '',
          program_id TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'claimed',
          privacy_class TEXT NOT NULL DEFAULT 'summary_only',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      db.close();
    }

    const claimed = repository.claimLease(sampleLease({
      workerId: "growth-worker-migrated",
      leaseToken: "lease-token-migrated"
    }));
    assert.equal(claimed.ok, true);
    assert.equal(claimed.lease.subject, "science");
    assert.equal(claimed.lease.workerId, "growth-worker-migrated");
    assert.equal(claimed.lease.attemptCount, 1);
  });
});
