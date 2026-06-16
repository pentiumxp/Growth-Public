const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const { UI_GATE_SPECS } = require("../src/services/learning-automation-ui-evidence-service");

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

function validUiEvidence(evidenceKey, overrides = {}) {
  const spec = UI_GATE_SPECS[evidenceKey];
  return Object.assign({
    ok: true,
    source: "growth-learning-automation-ui-evidence-service",
    schemaVersion: "growth.learningAutomationUiEvidence.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    evidenceKey,
    checkKey: spec.checkKey,
    uiGate: spec.uiGate,
    status: "pass",
    readyForReleaseEvidence: true,
    uiEvidence: {
      source: "home-ai-ios-pwa-visual-harness",
      evidenceKey,
      checkKey: spec.checkKey,
      uiGate: spec.uiGate,
      status: "pass",
      route: "/?embed=hermes#growth",
      screenshotPresent: true,
      domEvidencePresent: false,
      screenshotArtifactName: `${spec.uiGate}.png`,
      coverage: spec.requiredCoverage,
      requiredCoverage: spec.requiredCoverage,
      missingCoverage: [],
      assertionCount: 1,
      failedAssertionCount: 0
    },
    missingRequired: [],
    uiEvidenceBoundary: {
      summaryOnly: true,
      growthReadsOnlyEvidenceArtifacts: true,
      growthRunsNoVisualTooling: true,
      homeAiOwnsVisualHarness: true,
      noLearnerStateMutation: true,
      noModelCalls: true
    }
  }, overrides);
}

function deprecatedUiFlag(evidenceKey) {
  return {
    ok: false,
    status: "blocked",
    source: "release_readiness_smoke_flag_deprecated",
    evidenceKey,
    checkKey: UI_GATE_SPECS[evidenceKey].checkKey,
    error: "validated_ui_evidence_summary_required",
    readyForReleaseEvidence: false
  };
}

function deprecatedReleaseWorkbenchFlag() {
  return {
    ok: false,
    status: "blocked",
    source: "release_readiness_smoke_flag_deprecated",
    evidenceKey: "releaseWorkbenchSmokeEvidence",
    checkKey: "release_workbench_smoke_evidence",
    error: "validated_release_workbench_evidence_required",
    requiredAction: "provide_validated_release_workbench_evidence",
    readyForReleaseEvidence: false
  };
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
      ownerDailyUiEvidence: validUiEvidence("ownerDailyUiEvidence", { evidenceId: "ui_daily_json" })
    }),
    "--owner-audit-ui-evidence",
    "--stage-checkpoint-controls-evidence",
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
    "--production-target-provisioning-smoke-evidence",
    "--production-daily-loop-preview-smoke-evidence",
    "--production-learning-loop-state-smoke-evidence",
    "--production-cycle-history-smoke-evidence",
    "--production-owner-audit-smoke-evidence",
    "--production-profile-feedback-smoke-evidence",
    "--production-recommendation-lifecycle-smoke-evidence",
    "--production-daily-loop-write-smoke-evidence",
    "--production-learner-cycle-smoke-evidence",
    "--production-scheduler-dry-run-smoke-evidence",
    "--release-evidence-bundle-audit",
    "--release-workbench-evidence",
    "--owner-review-evidence",
    "--release-approval-json", JSON.stringify({
      writefulExecutionApproval: { approved: true, evidenceId: "approval_json" }
    }),
    "--background-scheduler-approval",
    "--background-worker-approval",
    "--write-snapshot",
    "--created-by", "weixin_owner",
    "--created-at", "2026-06-15T18:00:00.000Z"
  ];
  const expectedEvidence = {
    ownerDailyUiEvidence: validUiEvidence("ownerDailyUiEvidence", { evidenceId: "ui_daily_json" }),
    ownerAuditUiEvidence: deprecatedUiFlag("ownerAuditUiEvidence"),
    stageCheckpointControlsEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    automationDigestUiEvidence: deprecatedUiFlag("automationDigestUiEvidence"),
    productionProposalSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    automationActionHandoffUiEvidence: deprecatedUiFlag("automationActionHandoffUiEvidence"),
    schedulerExecutionUiEvidence: deprecatedUiFlag("schedulerExecutionUiEvidence"),
    schedulerRunUiEvidence: deprecatedUiFlag("schedulerRunUiEvidence"),
    schedulerWorkerTargetUiEvidence: deprecatedUiFlag("schedulerWorkerTargetUiEvidence"),
    productionActionHandoffSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionSchedulerExecutionSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionSchedulerRunSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionSchedulerWorkerTargetSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionSchedulerWorkerSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionPlannerReadinessEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionTargetProvisioningSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionDailyLoopPreviewSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionLearningLoopStateSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionCycleHistorySmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionOwnerAuditSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionProfileFeedbackSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionRecommendationLifecycleSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionDailyLoopWriteSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionLearnerCycleSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    productionSchedulerDryRunSmokeEvidence: { ok: true, source: "release_readiness_smoke_flag" },
    releaseEvidenceBundleAudit: { ok: true, source: "release_readiness_smoke_flag" },
    releaseWorkbenchSmokeEvidence: deprecatedReleaseWorkbenchFlag(),
    ownerReviewEvidence: { ok: true, source: "release_readiness_smoke_flag" }
  };

  assert.equal(shouldWriteSnapshot(args), true);
  assert.deepEqual(evidenceFromArgs(args), expectedEvidence);
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
    evidence: expectedEvidence,
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
    bundleId: "bundle_release_1",
    status: "collected",
    summary: {
      taskCount: 8,
      passCount: 6
    },
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
        ownerDailyUiEvidence: validUiEvidence("ownerDailyUiEvidence", { evidenceId: "bundle_daily_ui" }),
        stageCheckpointEvidence: { ok: true, evidenceId: "bundle_stage_smoke" },
        stageCheckpointControlsEvidence: { ok: true, evidenceId: "bundle_stage_controls" },
        platformActionEvidence: { ok: true, evidenceId: "bundle_platform_action" },
        ownerReviewEvidence: {
          ok: true,
          evidenceId: "bundle_owner_review",
          dependencyIds: ["lgaprop_bundle_1", "lgaexec_bundle_1"],
          summary: {
            acceptedProposalCount: 1,
            digestRequiredActionCount: 1,
            blockedActionHandoffCount: 1,
            publishedSchedulerExecutionCount: 1,
            completedSchedulerRunCount: 1,
            pendingWorkerTargetReviewCount: 1,
            failurePolicyStatus: "ready"
          }
        }
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
      bundleId: "bundle_release_1",
      status: "collected",
      summary: {
        taskCount: 8,
        passCount: 6
      },
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
        ownerDailyUiEvidence: validUiEvidence("ownerDailyUiEvidence", { evidenceId: "bundle_daily_ui" }),
        stageCheckpointEvidence: { ok: true, evidenceId: "bundle_stage_smoke" },
        stageCheckpointControlsEvidence: { ok: true, evidenceId: "bundle_stage_controls" },
        platformActionEvidence: { ok: true, evidenceId: "bundle_platform_action" },
        ownerReviewEvidence: {
          ok: true,
          evidenceId: "bundle_owner_review",
          dependencyIds: ["lgaprop_bundle_1", "lgaexec_bundle_1"],
          summary: {
            acceptedProposalCount: 1,
            digestRequiredActionCount: 1,
            blockedActionHandoffCount: 1,
            publishedSchedulerExecutionCount: 1,
            completedSchedulerRunCount: 1,
            pendingWorkerTargetReviewCount: 1,
            failurePolicyStatus: "ready"
          }
        },
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
      ownerDailyUiEvidence: validUiEvidence("ownerDailyUiEvidence", { evidenceId: "bundle_daily_ui" }),
      stageCheckpointEvidence: { ok: true, evidenceId: "bundle_stage_smoke" },
      stageCheckpointControlsEvidence: { ok: true, evidenceId: "bundle_stage_controls" },
      platformActionEvidence: { ok: true, evidenceId: "bundle_platform_action" },
      ownerReviewEvidence: {
        ok: true,
        evidenceId: "bundle_owner_review",
        dependencyIds: ["lgaprop_bundle_1", "lgaexec_bundle_1"],
        summary: {
          acceptedProposalCount: 1,
          digestRequiredActionCount: 1,
          blockedActionHandoffCount: 1,
          publishedSchedulerExecutionCount: 1,
          completedSchedulerRunCount: 1,
          pendingWorkerTargetReviewCount: 1,
          failurePolicyStatus: "ready"
        }
      },
      centralVisualEvidence: { ok: true, evidenceId: "inline_visual" },
      ownerAuditUiEvidence: deprecatedUiFlag("ownerAuditUiEvidence")
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
        ownerDailyUiEvidence: validUiEvidence("ownerDailyUiEvidence", { evidenceId: "bundle_daily_ui" }),
        stageCheckpointEvidence: { ok: true, evidenceId: "bundle_stage_smoke" },
        stageCheckpointControlsEvidence: { ok: true, evidenceId: "bundle_stage_controls" },
        platformActionEvidence: { ok: true, evidenceId: "bundle_platform_action" },
        ownerReviewEvidence: {
          ok: true,
          evidenceId: "bundle_owner_review",
          dependencyIds: ["lgaprop_bundle_1", "lgaexec_bundle_1"],
          summary: {
            acceptedProposalCount: 1,
            digestRequiredActionCount: 1,
            blockedActionHandoffCount: 1,
            publishedSchedulerExecutionCount: 1,
            completedSchedulerRunCount: 1,
            pendingWorkerTargetReviewCount: 1,
            failurePolicyStatus: "ready"
          }
        },
        centralVisualEvidence: { ok: true, evidenceId: "inline_visual" },
        ownerAuditUiEvidence: deprecatedUiFlag("ownerAuditUiEvidence")
      },
      evidenceBundleReadback: {
        schemaVersion: "growth.learningAutomationReleaseEvidenceBundle.v1",
        bundleId: "bundle_release_1",
        status: "collected",
        source: "release_readiness_smoke_evidence_bundle",
        taskCount: 8,
        passCount: 6,
        createdAt: "2026-06-15T18:21:00.000Z",
        requestedBy: "bundle_owner"
      },
      releaseApproval: {
        writefulExecutionApproval: { approved: true, evidenceId: "bundle_execution_approval" },
        backgroundSchedulerApproval: { approved: true, evidenceId: "inline_scheduler_approval" },
        backgroundWorkerApproval: { approved: true, source: "release_readiness_smoke_flag" }
      },
      requestedBy: "bundle_owner",
      createdAt: "2026-06-15T18:21:00.000Z"
    });
    const dbPath = path.join(dir, "growth-learning.sqlite3");
    new DatabaseSync(dbPath, { open: true }).close();
    const result = runScript(args.concat("--json"), {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(result.status, 0);
    const output = parseStdout(result);
    const ownerReviewReadback = output.evidenceReadback.items.find((item) => item.key === "ownerReviewEvidence");
    assert.equal(ownerReviewReadback.ownerReviewStageSummary.acceptedProposalCount, 1);
    assert.equal(ownerReviewReadback.ownerReviewStageSummary.digestRequiredActionCount, 1);
    assert.equal(ownerReviewReadback.ownerReviewStageSummary.blockedActionHandoffCount, 1);
    assert.equal(ownerReviewReadback.ownerReviewStageSummary.publishedSchedulerExecutionCount, 1);
    assert.equal(ownerReviewReadback.ownerReviewStageSummary.completedSchedulerRunCount, 1);
    assert.equal(ownerReviewReadback.ownerReviewStageSummary.pendingWorkerTargetReviewCount, 1);
    assert.equal(ownerReviewReadback.ownerReviewStageSummary.failurePolicyStatus, "ready");
    assert.equal(JSON.stringify(output.evidenceReadback).includes("lgaprop_bundle_1"), false);
    assert.equal(JSON.stringify(output.evidenceReadback).includes("lgaexec_bundle_1"), false);
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
    assert.equal(output.evidenceReadback.summaryOnly, true);
    assert.equal(output.evidenceReadback.presentCount, 0);
    assert.equal(output.evidenceReadback.missingCheckKeys.includes("owner_daily_ui_evidence"), true);
    assert.equal(Array.isArray(output.releaseReview.requiredActions), true);
    assert.equal(output.releaseReview.nextAction.key, "owner_daily_ui_evidence");
    assert.equal(output.releaseReview.nextAction.action, "complete_owner_daily_ui_visual_validation");
    assert.equal(output.releaseReview.missingEvidenceKeys.includes("production_owner_audit_smoke_evidence"), true);
    assert.equal(output.releaseReview.missingEvidenceKeys.includes("production_target_provisioning_smoke_evidence"), true);
    assert.equal(output.releaseReview.missingEvidenceKeys.includes("production_recommendation_lifecycle_smoke_evidence"), true);

    const db = new DatabaseSync(dbPath, { open: true });
    const table = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get("learning_growth_automation_release_readiness");
    db.close();
    assert.equal(table, undefined);
  });
});

test("release readiness smoke script blocks deprecated UI evidence flags", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--owner-daily-ui-evidence",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0);
    const output = parseStdout(result);
    const ownerDaily = output.checks.find((item) => item.key === "owner_daily_ui_evidence");
    assert.equal(output.ok, true);
    assert.equal(output.status, "blocked");
    assert.equal(ownerDaily.status, "blocked");
    assert.equal(ownerDaily.summary.invalidReason, "ui_evidence_validator_schema_required");
    assert.equal(ownerDaily.requiredAction.action, "provide_validated_ui_evidence_summary");
    assert.equal(output.releaseReview.blockedCheckKeys.includes("owner_daily_ui_evidence"), true);
    assert.equal(output.evidenceReadback.items.find((item) => item.key === "ownerDailyUiEvidence").evidencePresent, false);
  });
});

test("release readiness smoke script blocks deprecated release workbench evidence flag", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--release-workbench-evidence",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0);
    const output = parseStdout(result);
    const workbench = output.checks.find((item) => item.key === "release_workbench_smoke_evidence");
    assert.equal(output.ok, true);
    assert.equal(output.status, "blocked");
    assert.equal(workbench.status, "blocked");
    assert.equal(workbench.summary.invalidReason, "validated_release_workbench_evidence_required");
    assert.equal(workbench.requiredAction.action, "provide_validated_release_workbench_evidence");
    assert.equal(output.releaseReview.blockedCheckKeys.includes("release_workbench_smoke_evidence"), true);
    const readback = output.evidenceReadback.items.find((item) => item.key === "releaseWorkbenchSmokeEvidence");
    assert.equal(readback.evidencePresent, false);
    assert.equal(readback.invalidReason, "validated_release_workbench_evidence_required");
  });
});

test("release readiness smoke script accepts validator UI evidence summaries through evidence JSON", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--evidence-json", JSON.stringify({
        ownerDailyUiEvidence: validUiEvidence("ownerDailyUiEvidence", { evidenceId: "ui_daily_json" })
      }),
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0);
    const output = parseStdout(result);
    const ownerDaily = output.checks.find((item) => item.key === "owner_daily_ui_evidence");
    assert.equal(output.ok, true);
    assert.equal(ownerDaily.status, "pass");
    assert.equal(ownerDaily.summary.uiEvidenceValidated, true);
    assert.equal(ownerDaily.summary.evidenceId, "ui_daily_json");
    assert.equal(output.evidenceReadback.presentEvidenceKeys.includes("ownerDailyUiEvidence"), true);
    assert.equal(output.evidenceReadback.missingCheckKeys.includes("owner_daily_ui_evidence"), false);
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
    assert.equal(output.snapshot.evidenceReadback.summaryOnly, true);
    assert.equal(output.snapshot.evidenceReadback.missingCheckKeys.includes("owner_daily_ui_evidence"), true);

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
