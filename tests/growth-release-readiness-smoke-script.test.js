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
  projectReleaseReadinessSmokeReadback,
  releaseApprovalFromArgs,
  runOperation,
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

function validReleaseEvidence(evidenceId, overrides = {}) {
  return Object.assign({
    ok: true,
    status: "pass",
    privacyClass: "summary_only",
    summaryOnly: true,
    evidenceId
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

function deprecatedReleaseFlag(evidenceKey, checkKey, overrides = {}) {
  return Object.assign({
    ok: false,
    status: "blocked",
    source: "release_readiness_smoke_flag_deprecated",
    evidenceKey,
    checkKey,
    error: `validated_${checkKey}_required`,
    requiredAction: `provide_validated_${checkKey}`,
    readyForReleaseEvidence: false
  }, overrides);
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
    "--stage-checkpoint-evidence",
    "--stage-checkpoint-controls-evidence",
    "--release-package-review-ui-evidence",
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
    "--production-operating-loop-history-smoke-evidence",
    "--production-cycle-history-smoke-evidence",
    "--production-owner-audit-smoke-evidence",
    "--production-owner-audit-review-smoke-evidence",
    "--production-profile-feedback-smoke-evidence",
    "--production-recommendation-lifecycle-smoke-evidence",
    "--production-daily-loop-write-smoke-evidence",
    "--production-learner-cycle-smoke-evidence",
    "--production-scheduler-dry-run-smoke-evidence",
    "--release-evidence-bundle-audit",
    "--platform-action-evidence",
    "--central-visual-evidence",
    "--production-deployment-health-evidence",
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
    stageCheckpointEvidence: deprecatedReleaseFlag("stageCheckpointEvidence", "stage_checkpoint_evidence"),
    stageCheckpointControlsEvidence: deprecatedReleaseFlag("stageCheckpointControlsEvidence", "stage_checkpoint_controls_evidence"),
    releasePackageReviewUiEvidence: deprecatedUiFlag("releasePackageReviewUiEvidence"),
    automationDigestUiEvidence: deprecatedUiFlag("automationDigestUiEvidence"),
    productionProposalSmokeEvidence: deprecatedReleaseFlag("productionProposalSmokeEvidence", "production_proposal_smoke_evidence"),
    automationActionHandoffUiEvidence: deprecatedUiFlag("automationActionHandoffUiEvidence"),
    schedulerExecutionUiEvidence: deprecatedUiFlag("schedulerExecutionUiEvidence"),
    schedulerRunUiEvidence: deprecatedUiFlag("schedulerRunUiEvidence"),
    schedulerWorkerTargetUiEvidence: deprecatedUiFlag("schedulerWorkerTargetUiEvidence"),
    productionActionHandoffSmokeEvidence: deprecatedReleaseFlag("productionActionHandoffSmokeEvidence", "production_action_handoff_smoke_evidence"),
    productionSchedulerExecutionSmokeEvidence: deprecatedReleaseFlag("productionSchedulerExecutionSmokeEvidence", "production_scheduler_execution_smoke_evidence"),
    productionSchedulerRunSmokeEvidence: deprecatedReleaseFlag("productionSchedulerRunSmokeEvidence", "production_scheduler_run_smoke_evidence"),
    productionSchedulerWorkerTargetSmokeEvidence: deprecatedReleaseFlag("productionSchedulerWorkerTargetSmokeEvidence", "production_scheduler_worker_target_smoke_evidence"),
    productionSchedulerWorkerSmokeEvidence: deprecatedReleaseFlag("productionSchedulerWorkerSmokeEvidence", "production_scheduler_worker_smoke_evidence"),
    productionPlannerReadinessEvidence: deprecatedReleaseFlag("productionPlannerReadinessEvidence", "production_planner_readiness_evidence"),
    productionTargetProvisioningSmokeEvidence: deprecatedReleaseFlag("productionTargetProvisioningSmokeEvidence", "production_target_provisioning_smoke_evidence"),
    productionDailyLoopPreviewSmokeEvidence: deprecatedReleaseFlag("productionDailyLoopPreviewSmokeEvidence", "production_daily_loop_preview_smoke_evidence"),
    productionLearningLoopStateSmokeEvidence: deprecatedReleaseFlag("productionLearningLoopStateSmokeEvidence", "production_learning_loop_state_smoke_evidence"),
    productionOperatingLoopHistorySmokeEvidence: deprecatedReleaseFlag("productionOperatingLoopHistorySmokeEvidence", "production_operating_loop_history_smoke_evidence"),
    productionCycleHistorySmokeEvidence: deprecatedReleaseFlag("productionCycleHistorySmokeEvidence", "production_cycle_history_smoke_evidence"),
    productionOwnerAuditSmokeEvidence: deprecatedReleaseFlag("productionOwnerAuditSmokeEvidence", "production_owner_audit_smoke_evidence"),
    productionOwnerAuditReviewSmokeEvidence: deprecatedReleaseFlag("productionOwnerAuditReviewSmokeEvidence", "production_owner_audit_review_smoke_evidence"),
    productionProfileFeedbackSmokeEvidence: deprecatedReleaseFlag("productionProfileFeedbackSmokeEvidence", "production_profile_feedback_smoke_evidence"),
    productionRecommendationLifecycleSmokeEvidence: deprecatedReleaseFlag("productionRecommendationLifecycleSmokeEvidence", "production_recommendation_lifecycle_smoke_evidence"),
    productionDailyLoopWriteSmokeEvidence: deprecatedReleaseFlag("productionDailyLoopWriteSmokeEvidence", "production_daily_loop_write_smoke_evidence"),
    productionLearnerCycleSmokeEvidence: deprecatedReleaseFlag("productionLearnerCycleSmokeEvidence", "production_learner_cycle_smoke_evidence"),
    productionSchedulerDryRunSmokeEvidence: deprecatedReleaseFlag("productionSchedulerDryRunSmokeEvidence", "production_scheduler_dry_run_smoke_evidence"),
    releaseEvidenceBundleAudit: deprecatedReleaseFlag("releaseEvidenceBundleAudit", "release_evidence_bundle_audit"),
    platformActionEvidence: deprecatedReleaseFlag("platformActionEvidence", "platform_action_evidence"),
    centralVisualEvidence: deprecatedReleaseFlag("centralVisualEvidence", "central_visual_evidence"),
    productionDeploymentHealthEvidence: deprecatedReleaseFlag("productionDeploymentHealthEvidence", "production_deployment_health", {
      error: "production_deployment_evidence_validator_schema_required",
      requiredAction: "provide_validated_production_deployment_health_evidence"
    }),
    releaseWorkbenchSmokeEvidence: deprecatedReleaseFlag("releaseWorkbenchSmokeEvidence", "release_workbench_smoke_evidence", {
      error: "validated_release_workbench_evidence_required",
      requiredAction: "provide_validated_release_workbench_evidence"
    }),
    ownerReviewEvidence: deprecatedReleaseFlag("ownerReviewEvidence", "owner_review_evidence")
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
  const bundleStageCheckpointEvidence = validReleaseEvidence("bundle_stage_smoke");
  const bundleStageCheckpointControlsEvidence = validReleaseEvidence("bundle_stage_controls");
  const bundlePlatformActionEvidence = validReleaseEvidence("bundle_platform_action");
  const bundleOwnerAuditReviewEvidence = validReleaseEvidence("bundle_owner_audit_review", {
    summary: {
      reviewCount: 1,
      latestReviewId: "lgoar_bundle_1",
      decision: "accepted",
      recordStatus: "reviewed",
      profileFeedbackOk: true,
      cycleComplete: true,
      readyForNextPlan: true,
      recommendationStrategy: "repair",
      nextAction: "draft_daily_plan"
    }
  });
  const bundleOwnerReviewEvidence = validReleaseEvidence("bundle_owner_review", {
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
  });
  const inlineCentralVisualEvidence = validReleaseEvidence("inline_visual");
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
      stageCheckpointEvidence: bundleStageCheckpointEvidence,
      stageCheckpointControlsEvidence: bundleStageCheckpointControlsEvidence,
      platformActionEvidence: bundlePlatformActionEvidence,
      productionOwnerAuditReviewSmokeEvidence: bundleOwnerAuditReviewEvidence,
      ownerReviewEvidence: bundleOwnerReviewEvidence
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
          centralVisualEvidence: inlineCentralVisualEvidence
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
        stageCheckpointEvidence: bundleStageCheckpointEvidence,
        stageCheckpointControlsEvidence: bundleStageCheckpointControlsEvidence,
        platformActionEvidence: bundlePlatformActionEvidence,
        productionOwnerAuditReviewSmokeEvidence: bundleOwnerAuditReviewEvidence,
        ownerReviewEvidence: bundleOwnerReviewEvidence,
        centralVisualEvidence: inlineCentralVisualEvidence
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
      stageCheckpointEvidence: bundleStageCheckpointEvidence,
      stageCheckpointControlsEvidence: bundleStageCheckpointControlsEvidence,
      platformActionEvidence: bundlePlatformActionEvidence,
      productionOwnerAuditReviewSmokeEvidence: bundleOwnerAuditReviewEvidence,
      ownerReviewEvidence: bundleOwnerReviewEvidence,
      centralVisualEvidence: inlineCentralVisualEvidence,
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
        stageCheckpointEvidence: bundleStageCheckpointEvidence,
        stageCheckpointControlsEvidence: bundleStageCheckpointControlsEvidence,
        platformActionEvidence: bundlePlatformActionEvidence,
        productionOwnerAuditReviewSmokeEvidence: bundleOwnerAuditReviewEvidence,
        ownerReviewEvidence: bundleOwnerReviewEvidence,
        centralVisualEvidence: inlineCentralVisualEvidence,
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
    const ownerAuditReviewReadback = output.evidenceReadback.items.find((item) => item.key === "productionOwnerAuditReviewSmokeEvidence");
    assert.equal(ownerAuditReviewReadback.ownerAuditReviewSummary.reviewCount, 1);
    assert.equal(ownerAuditReviewReadback.ownerAuditReviewSummary.latestReviewId, "lgoar_bundle_1");
    assert.equal(ownerAuditReviewReadback.ownerAuditReviewSummary.nextAction, "draft_daily_plan");
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

test("release readiness smoke script projects top-level operator readback", () => {
  const result = projectReleaseReadinessSmokeReadback({
    ok: true,
    status: "incomplete",
    config: {
      writefulSchedulingAllowed: false
    },
    summary: {
      status: "incomplete",
      counts: {
        pass: 6,
        missing: 2,
        blocked: 1
      },
      missingRequired: ["owner_daily_ui_evidence", "central_visual_evidence", "release_workbench_smoke_evidence"],
      readyForOwnerLoop: false,
      readyForReleaseReview: false,
      writefulSchedulingAllowed: false
    },
    releaseReview: {
      readyForReleaseReview: false,
      advisoryOnly: true,
      persistedEvidenceKeys: ["centralVisualEvidence"],
      persistedApprovalKeys: ["writefulExecutionApproval"],
      missingCheckKeys: ["owner_daily_ui_evidence", "central_visual_evidence"],
      blockedCheckKeys: ["release_workbench_smoke_evidence"],
      missingEvidenceKeys: ["owner_daily_ui_evidence"],
      requiredActionCount: 3,
      nextAction: {
        key: "owner_daily_ui_evidence",
        status: "missing",
        label: "Owner daily UI product/visual evidence",
        action: "complete_owner_daily_ui_visual_validation",
        requiredActor: "owner",
        evidencePresent: false
      },
      writefulSchedulingAllowed: false
    },
    evidenceReadback: {
      evidenceCount: 10,
      presentCount: 1,
      missingCount: 9,
      sourceBundle: {
        bundleId: "bundle_release_1",
        status: "collected"
      }
    }
  });

  assert.equal(result.releaseReadinessStatus, "incomplete");
  assert.equal(result.readyForOwnerLoop, false);
  assert.equal(result.readyForReleaseReview, false);
  assert.equal(result.releaseReviewAdvisoryOnly, true);
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.passCheckCount, 6);
  assert.equal(result.missingRequiredCount, 3);
  assert.equal(result.missingCheckCount, 2);
  assert.equal(result.blockedCheckCount, 1);
  assert.equal(result.missingEvidenceCount, 1);
  assert.equal(result.persistedEvidenceKeyCount, 1);
  assert.equal(result.persistedApprovalKeyCount, 1);
  assert.equal(result.requiredActionCount, 3);
  assert.equal(result.nextRequiredAction.key, "owner_daily_ui_evidence");
  assert.equal(result.nextRequiredAction.action, "complete_owner_daily_ui_visual_validation");
  assert.equal(result.nextRequiredAction.requiredActor, "owner");
  assert.equal(result.nextRequiredAction.evidencePresent, false);
  assert.equal(result.evidenceReadbackEvidenceCount, 10);
  assert.equal(result.evidenceReadbackPresentCount, 1);
  assert.equal(result.evidenceReadbackMissingCount, 9);
  assert.equal(result.evidenceReadbackSourceBundleStatus, "collected");
  assert.equal(result.evidenceReadbackSourceBundleId, "bundle_release_1");
});

test("release readiness smoke script delegates through projected operation helper", () => {
  const calls = [];
  const result = runOperation({
    evaluateReadiness(input) {
      calls.push(input);
      return {
        ok: true,
        status: "ready_for_release_review",
        summary: {
          status: "ready_for_release_review",
          counts: { pass: 44 },
          missingRequired: [],
          readyForOwnerLoop: true,
          readyForReleaseReview: true,
          writefulSchedulingAllowed: false
        },
        releaseReview: {
          readyForReleaseReview: true,
          advisoryOnly: true,
          requiredActionCount: 0,
          writefulSchedulingAllowed: false
        },
        evidenceReadback: {
          evidenceCount: 44,
          presentCount: 44,
          missingCount: 0
        }
      };
    }
  }, { workspaceId: "weixin_fanfan" });

  assert.deepEqual(calls, [{ workspaceId: "weixin_fanfan" }]);
  assert.equal(result.ok, true);
  assert.equal(result.status, "ready_for_release_review");
  assert.equal(result.releaseReadinessStatus, "ready_for_release_review");
  assert.equal(result.readyForReleaseReview, true);
  assert.equal(result.passCheckCount, 44);
  assert.equal(result.requiredActionCount, 0);
  assert.equal(result.evidenceReadbackMissingCount, 0);
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
    assert.equal(output.releaseReadinessStatus, output.summary.status);
    assert.equal(output.readyForOwnerLoop, output.summary.readyForOwnerLoop);
    assert.equal(output.readyForReleaseReview, output.releaseReview.readyForReleaseReview);
    assert.equal(output.releaseReviewAdvisoryOnly, output.releaseReview.advisoryOnly);
    assert.equal(output.writefulSchedulingAllowed, false);
    assert.equal(output.passCheckCount, output.summary.counts.pass);
    assert.equal(output.missingRequiredCount, output.summary.missingRequired.length);
    assert.equal(output.missingCheckCount, output.releaseReview.missingCheckKeys.length);
    assert.equal(output.blockedCheckCount, output.releaseReview.blockedCheckKeys.length);
    assert.equal(output.missingEvidenceCount, output.releaseReview.missingEvidenceKeys.length);
    assert.equal(output.persistedEvidenceKeyCount, output.releaseReview.persistedEvidenceKeys.length);
    assert.equal(output.persistedApprovalKeyCount, output.releaseReview.persistedApprovalKeys.length);
    assert.equal(output.requiredActionCount, output.releaseReview.requiredActionCount);
    assert.equal(output.nextRequiredAction.key, output.releaseReview.nextAction.key);
    assert.equal(output.nextRequiredAction.action, output.releaseReview.nextAction.action);
    assert.equal(output.evidenceReadbackEvidenceCount, output.evidenceReadback.evidenceCount);
    assert.equal(output.evidenceReadbackPresentCount, output.evidenceReadback.presentCount);
    assert.equal(output.evidenceReadbackMissingCount, output.evidenceReadback.missingCount);
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

test("release readiness smoke script blocks deprecated service-owned evidence flags", () => {
  const cases = [
    {
      flag: "--production-planner-readiness-evidence",
      checkKey: "production_planner_readiness_evidence",
      evidenceKey: "productionPlannerReadinessEvidence"
    },
    {
      flag: "--central-visual-evidence",
      checkKey: "central_visual_evidence",
      evidenceKey: "centralVisualEvidence"
    },
    {
      flag: "--production-deployment-health-evidence",
      checkKey: "production_deployment_health",
      evidenceKey: "productionDeploymentHealthEvidence",
      invalidReason: "production_deployment_evidence_validator_schema_required",
      requiredAction: "provide_validated_production_deployment_health_evidence"
    },
    {
      flag: "--owner-review-evidence-smoke",
      checkKey: "owner_review_evidence",
      evidenceKey: "ownerReviewEvidence"
    }
  ];

  for (const item of cases) {
    withTempDb(({ dir, dbPath }) => {
      const result = runScript([
        "--workspace-id", "weixin_fanfan",
        item.flag,
        "--json"
      ], {
        GROWTH_DATA_DIR: dir,
        GROWTH_LEARNING_DB_PATH: dbPath
      });

      assert.equal(result.status, 0);
      const output = parseStdout(result);
      const check = output.checks.find((entry) => entry.key === item.checkKey);
      assert.equal(output.ok, true);
      assert.equal(output.status, "blocked");
      assert.equal(check.status, "blocked");
      assert.equal(check.summary.invalidReason, item.invalidReason || `validated_${item.checkKey}_required`);
      assert.equal(check.requiredAction.action, item.requiredAction || `provide_validated_${item.checkKey}`);
      assert.equal(output.releaseReview.blockedCheckKeys.includes(item.checkKey), true);
      const readback = output.evidenceReadback.items.find((entry) => entry.key === item.evidenceKey);
      assert.equal(readback.evidencePresent, false);
      assert.equal(readback.invalidReason, item.invalidReason || `validated_${item.checkKey}_required`);
    });
  }
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
