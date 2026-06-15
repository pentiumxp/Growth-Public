const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-release-readiness.js");

const {
  evidenceFromArgs,
  inputFromArgs,
  releaseApprovalFromArgs,
  shouldWriteSnapshot
} = require("../scripts/smoke-growth-release-readiness");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-readiness-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath, { open: true }).close();
  try {
    return callback({ dir, dbPath });
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

test("release readiness smoke script parses bounded scope, evidence, and approval selectors", () => {
  const args = [
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--limit", "7",
    "--evidence-json", JSON.stringify({
      ownerDailyUiEvidence: { ok: true, evidenceId: "ui_daily_json" }
    }),
    "--owner-audit-ui-evidence",
    "--production-action-handoff-smoke-evidence",
    "--production-scheduler-execution-smoke-evidence",
    "--production-scheduler-run-smoke-evidence",
    "--production-scheduler-worker-smoke-evidence",
    "--production-daily-loop-preview-smoke-evidence",
    "--production-daily-loop-write-smoke-evidence",
    "--release-approval-json", JSON.stringify({
      writefulExecutionApproval: { approved: true, evidenceId: "approval_json" }
    }),
    "--background-scheduler-approval",
    "--background-worker-approval",
    "--write-snapshot",
    "--created-by", "weixin_owner",
    "--created-at", "2026-06-15T18:00:00.000Z"
  ];

  assert.equal(shouldWriteSnapshot(args), true);
  assert.deepEqual(evidenceFromArgs(args), {
    ownerDailyUiEvidence: { ok: true, evidenceId: "ui_daily_json" },
    ownerAuditUiEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionActionHandoffSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionSchedulerExecutionSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionSchedulerRunSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionSchedulerWorkerSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionDailyLoopPreviewSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionDailyLoopWriteSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" }
  });
  assert.deepEqual(releaseApprovalFromArgs(args), {
    writefulExecutionApproval: { approved: true, evidenceId: "approval_json" },
    backgroundSchedulerApproval: { approved: true, source: "release_readiness_smoke_flag" },
    backgroundWorkerApproval: { approved: true, source: "release_readiness_smoke_flag" }
  });
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    limit: 7,
    evidence: {
      ownerDailyUiEvidence: { ok: true, evidenceId: "ui_daily_json" },
      ownerAuditUiEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionActionHandoffSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionSchedulerExecutionSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionSchedulerRunSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionSchedulerWorkerSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionDailyLoopPreviewSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionDailyLoopWriteSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" }
    },
    releaseApproval: {
      writefulExecutionApproval: { approved: true, evidenceId: "approval_json" },
      backgroundSchedulerApproval: { approved: true, source: "release_readiness_smoke_flag" },
      backgroundWorkerApproval: { approved: true, source: "release_readiness_smoke_flag" }
    },
    requestedBy: "weixin_owner",
    createdAt: "2026-06-15T18:00:00.000Z"
  });
});

test("release readiness smoke script evaluates readiness without writing a snapshot by default", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--domain", "science",
      "--subject", "science",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0);
    const output = parseStdout(result);
    assert.equal(output.ok, true);
    assert.equal(output.status, "incomplete");
    assert.equal(output.config.writefulSchedulingAllowed, false);
    assert.equal(output.releaseReview.advisoryOnly, true);

    const db = new DatabaseSync(dbPath, { open: true });
    const table = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get("learning_growth_automation_release_readiness");
    db.close();
    assert.equal(table, undefined);
  });
});

test("release readiness smoke script writes summary-only snapshots only when requested", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--domain-pack-id", "uk_hk_curriculum_foundation",
      "--domain", "science",
      "--subject", "science",
      "--write-snapshot",
      "--created-by", "weixin_owner",
      "--created-at", "2026-06-15T18:10:00.000Z",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0);
    const output = parseStdout(result);
    assert.equal(output.ok, true);
    assert.equal(output.snapshot.privacyClass, "summary_only");
    assert.equal(output.snapshot.summary.writefulSchedulingAllowed, false);

    const db = new DatabaseSync(dbPath, { open: true });
    const row = db.prepare("SELECT COUNT(*) AS count FROM learning_growth_automation_release_readiness").get();
    db.close();
    assert.equal(row.count, 1);
  });
});

test("release readiness smoke script fails closed for privacy-risk evidence input", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--evidence-json", JSON.stringify({ rawPrompt: "do not store" }),
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 1);
    const output = parseStdout(result);
    assert.equal(output.ok, false);
    assert.equal(output.error, "learning_automation_release_readiness_privacy_failed");
    assert.equal(output.privacyFindings.includes("$.evidence.rawPrompt"), true);
  });
});
