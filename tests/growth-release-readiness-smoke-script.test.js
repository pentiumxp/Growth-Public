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
  evidenceBundleFromArgs,
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
    "--automation-digest-ui-evidence",
    "--production-proposal-smoke-evidence",
    "--automation-action-handoff-ui-evidence",
    "--scheduler-execution-ui-evidence",
    "--scheduler-run-ui-evidence",
    "--scheduler-worker-target-ui-evidence",
    "--production-action-handoff-smoke-evidence",
    "--production-scheduler-execution-smoke-evidence",
    "--production-scheduler-run-smoke-evidence",
    "--production-scheduler-worker-target-smoke-evidence",
    "--production-scheduler-worker-smoke-evidence",
    "--production-planner-readiness-evidence",
    "--production-daily-loop-preview-smoke-evidence",
    "--production-learning-loop-state-smoke-evidence",
    "--production-cycle-history-smoke-evidence",
    "--production-owner-audit-smoke-evidence",
    "--production-profile-feedback-smoke-evidence",
    "--production-daily-loop-write-smoke-evidence",
    "--production-learner-cycle-smoke-evidence",
    "--production-scheduler-dry-run-smoke-evidence",
    "--release-evidence-bundle-audit",
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
    automationDigestUiEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionProposalSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    automationActionHandoffUiEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    schedulerExecutionUiEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    schedulerRunUiEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    schedulerWorkerTargetUiEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionActionHandoffSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionSchedulerExecutionSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionSchedulerRunSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionSchedulerWorkerTargetSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionSchedulerWorkerSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionPlannerReadinessEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionDailyLoopPreviewSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionLearningLoopStateSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionCycleHistorySmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionOwnerAuditSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionProfileFeedbackSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionDailyLoopWriteSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionLearnerCycleSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionSchedulerDryRunSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    releaseEvidenceBundleAudit: { ok: true, source: "release_readiness_smoke_flag" }
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
      automationDigestUiEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionProposalSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      automationActionHandoffUiEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      schedulerExecutionUiEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      schedulerRunUiEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      schedulerWorkerTargetUiEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionActionHandoffSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionSchedulerExecutionSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionSchedulerRunSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionSchedulerWorkerTargetSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionSchedulerWorkerSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionPlannerReadinessEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionDailyLoopPreviewSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionLearningLoopStateSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionCycleHistorySmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionOwnerAuditSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionProfileFeedbackSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionDailyLoopWriteSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionLearnerCycleSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      productionSchedulerDryRunSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
      releaseEvidenceBundleAudit: { ok: true, source: "release_readiness_smoke_flag" }
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

test("release readiness smoke script accepts versioned evidence bundle files with explicit overrides", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-readiness-bundle-"));
  const bundlePath = path.join(dir, "release-evidence-bundle.json");
  fs.writeFileSync(bundlePath, JSON.stringify({
    schemaVersion: "growth.learningAutomationReleaseEvidenceBundle.v1",
    summaryOnly: true,
    scope: {
      workspaceId: "bundle_workspace",
      learnerId: "bundle_learner",
      programId: "bundle_program",
      domainPackId: "bundle_pack",
      domain: "science",
      subject: "science",
      horizon: "weekly_plan",
      limit: 3
    },
    evidence: {
      ownerDailyUiEvidence: { ok: true, evidenceId: "bundle_daily_ui" },
      stageCheckpointEvidence: { ok: true, evidenceId: "bundle_stage_smoke" },
      platformActionEvidence: { ok: true, evidenceId: "bundle_platform_action" }
    },
    releaseApproval: {
      writefulExecutionApproval: { approved: true, evidenceId: "bundle_execution_approval" }
    },
    requestedBy: "bundle_owner",
    createdAt: "2026-06-15T18:20:00.000Z"
  }), "utf8");

  try {
    const args = [
      "--evidence-bundle-file", bundlePath,
      "--evidence-bundle-json", JSON.stringify({
        scope: {
          subject: "biology",
          limit: 9
        },
        evidence: {
          centralVisualEvidence: { ok: true, evidenceId: "inline_visual" }
        },
        releaseApproval: {
          backgroundSchedulerApproval: { approved: true, evidenceId: "inline_scheduler_approval" }
        },
        createdAt: "2026-06-15T18:21:00.000Z"
      }),
      "--workspace-id", "explicit_workspace",
      "--owner-audit-ui-evidence",
      "--background-worker-approval"
    ];

    assert.deepEqual(evidenceBundleFromArgs(args), {
      schemaVersion: "growth.learningAutomationReleaseEvidenceBundle.v1",
      summaryOnly: true,
      scope: {
        workspaceId: "bundle_workspace",
        learnerId: "bundle_learner",
        programId: "bundle_program",
        domainPackId: "bundle_pack",
        domain: "science",
        subject: "biology",
        horizon: "weekly_plan",
        limit: 9
      },
      evidence: {
        ownerDailyUiEvidence: { ok: true, evidenceId: "bundle_daily_ui" },
        stageCheckpointEvidence: { ok: true, evidenceId: "bundle_stage_smoke" },
        platformActionEvidence: { ok: true, evidenceId: "bundle_platform_action" },
        centralVisualEvidence: { ok: true, evidenceId: "inline_visual" }
      },
      releaseApproval: {
        writefulExecutionApproval: { approved: true, evidenceId: "bundle_execution_approval" },
        backgroundSchedulerApproval: { approved: true, evidenceId: "inline_scheduler_approval" }
      },
      requestedBy: "bundle_owner",
      createdAt: "2026-06-15T18:21:00.000Z"
    });
    assert.deepEqual(evidenceFromArgs(args), {
      ownerDailyUiEvidence: { ok: true, evidenceId: "bundle_daily_ui" },
      stageCheckpointEvidence: { ok: true, evidenceId: "bundle_stage_smoke" },
      platformActionEvidence: { ok: true, evidenceId: "bundle_platform_action" },
      centralVisualEvidence: { ok: true, evidenceId: "inline_visual" },
      ownerAuditUiEvidence: { ok: true, source: "release_readiness_smoke_flag" }
    });
    assert.deepEqual(releaseApprovalFromArgs(args), {
      writefulExecutionApproval: { approved: true, evidenceId: "bundle_execution_approval" },
      backgroundSchedulerApproval: { approved: true, evidenceId: "inline_scheduler_approval" },
      backgroundWorkerApproval: { approved: true, source: "release_readiness_smoke_flag" }
    });
    assert.deepEqual(inputFromArgs(args), {
      workspaceId: "explicit_workspace",
      learnerId: "bundle_learner",
      programId: "bundle_program",
      domainPackId: "bundle_pack",
      domain: "science",
      subject: "biology",
      horizon: "weekly_plan",
      limit: 9,
      evidence: {
        ownerDailyUiEvidence: { ok: true, evidenceId: "bundle_daily_ui" },
        stageCheckpointEvidence: { ok: true, evidenceId: "bundle_stage_smoke" },
        platformActionEvidence: { ok: true, evidenceId: "bundle_platform_action" },
        centralVisualEvidence: { ok: true, evidenceId: "inline_visual" },
        ownerAuditUiEvidence: { ok: true, source: "release_readiness_smoke_flag" }
      },
      releaseApproval: {
        writefulExecutionApproval: { approved: true, evidenceId: "bundle_execution_approval" },
        backgroundSchedulerApproval: { approved: true, evidenceId: "inline_scheduler_approval" },
        backgroundWorkerApproval: { approved: true, source: "release_readiness_smoke_flag" }
      },
      requestedBy: "bundle_owner",
      createdAt: "2026-06-15T18:21:00.000Z"
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
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
    assert.equal(Array.isArray(output.releaseReview.requiredActions), true);
    assert.equal(output.releaseReview.nextAction.key, "owner_daily_ui_evidence");
    assert.equal(output.releaseReview.nextAction.action, "complete_owner_daily_ui_visual_validation");
    assert.equal(output.releaseReview.missingEvidenceKeys.includes("production_owner_audit_smoke_evidence"), true);

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

test("release readiness smoke script fails closed for privacy-risk evidence bundle input", () => {
  const result = runScript([
    "--workspace-id", "weixin_fanfan",
    "--evidence-bundle-json", JSON.stringify({
      schemaVersion: "growth.learningAutomationReleaseEvidenceBundle.v1",
      summaryOnly: true,
      evidence: {
        rawPrompt: "do not accept"
      }
    }),
    "--json"
  ]);

  assert.equal(result.status, 2);
  const output = parseStdout(result);
  assert.equal(output.ok, false);
  assert.equal(output.error, "release_readiness_smoke_bundle_privacy_failed");
  assert.equal(output.option, "--evidence-bundle-json");
  assert.equal(output.privacyFindings.includes("$.evidence.rawPrompt"), true);
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
