const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningAutomationReleaseReadinessService
} = require("../src/services/learning-automation-release-readiness-service");
const { UI_GATE_SPECS } = require("../src/services/learning-automation-ui-evidence-service");

function scope(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan"
  }, overrides);
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

function persistedUiEvidence(evidenceKey, overrides = {}) {
  return Object.assign({}, validUiEvidence(evidenceKey), {
    schemaVersion: "growth.learningAutomationReleaseEvidenceRecord.uiEvidence.v1",
    validationSchemaVersion: "growth.learningAutomationUiEvidence.v1",
    validatedBy: "learning-automation-ui-evidence-service"
  }, overrides);
}

function allEvidence() {
  return {
    ownerDailyUiEvidence: validUiEvidence("ownerDailyUiEvidence", { evidenceId: "ui_daily" }),
    ownerAuditUiEvidence: validUiEvidence("ownerAuditUiEvidence", { evidenceId: "ui_audit" }),
    stageCheckpointEvidence: { ok: true, evidenceId: "stage_sep" },
    stageCheckpointControlsEvidence: { ok: true, evidenceId: "stage_controls" },
    proposalReviewUiEvidence: validUiEvidence("proposalReviewUiEvidence", { evidenceId: "proposal_ui" }),
    productionProposalSmokeEvidence: { ok: true, evidenceId: "proposal_smoke" },
    automationDigestUiEvidence: validUiEvidence("automationDigestUiEvidence", { evidenceId: "digest_ui" }),
    automationActionHandoffUiEvidence: validUiEvidence("automationActionHandoffUiEvidence", { evidenceId: "action_handoff_ui" }),
    schedulerExecutionUiEvidence: validUiEvidence("schedulerExecutionUiEvidence", { evidenceId: "scheduler_execution_ui" }),
    schedulerRunUiEvidence: validUiEvidence("schedulerRunUiEvidence", { evidenceId: "scheduler_run_ui" }),
    schedulerWorkerTargetUiEvidence: validUiEvidence("schedulerWorkerTargetUiEvidence", { evidenceId: "scheduler_worker_target_ui" }),
    productionActionHandoffSmokeEvidence: { ok: true, evidenceId: "action_handoff_smoke" },
    productionSchedulerExecutionSmokeEvidence: { ok: true, evidenceId: "scheduler_execution_smoke" },
    productionSchedulerRunSmokeEvidence: { ok: true, evidenceId: "scheduler_run_smoke" },
    productionSchedulerWorkerTargetSmokeEvidence: { ok: true, evidenceId: "scheduler_worker_target_smoke" },
    productionSchedulerWorkerSmokeEvidence: { ok: true, evidenceId: "scheduler_worker_smoke" },
    productionPlannerReadinessEvidence: { ok: true, evidenceId: "planner_smoke" },
    productionTargetProvisioningSmokeEvidence: { ok: true, evidenceId: "target_provisioning_smoke" },
    productionDailyLoopPreviewSmokeEvidence: { ok: true, evidenceId: "daily_loop_preview_smoke" },
    productionLearningLoopStateSmokeEvidence: { ok: true, evidenceId: "learning_loop_state_smoke" },
    productionCycleHistorySmokeEvidence: { ok: true, evidenceId: "cycle_history_smoke" },
    productionOwnerAuditSmokeEvidence: { ok: true, evidenceId: "owner_audit_smoke" },
    productionProfileFeedbackSmokeEvidence: { ok: true, evidenceId: "profile_feedback_smoke" },
    productionRecommendationLifecycleSmokeEvidence: { ok: true, evidenceId: "recommendation_lifecycle_smoke" },
    productionDailyLoopWriteSmokeEvidence: { ok: true, evidenceId: "daily_loop_write_smoke" },
    productionLearnerCycleSmokeEvidence: { ok: true, evidenceId: "learner_cycle_smoke" },
    productionSchedulerDryRunSmokeEvidence: { ok: true, evidenceId: "scheduler_dry_run_smoke" },
    releaseEvidenceBundleAudit: { ok: true, evidenceId: "release_bundle_audit" },
    platformActionEvidence: { ok: true, evidenceId: "platform_action" },
    centralVisualEvidence: { ok: true, evidenceId: "visual" },
    releaseWorkbenchSmokeEvidence: { ok: true, evidenceId: "release_workbench" },
    ownerReviewEvidence: {
      ok: true,
      evidenceId: "owner_review_evidence",
      dependencyIds: [
        "lgaprop_internal_1",
        "lgadig_internal_1",
        "lgahand_internal_1",
        "lgaexec_internal_1",
        "lgarun_internal_1",
        "lgawt_internal_1"
      ],
      summary: {
        proposalCount: 5,
        acceptedProposalCount: 1,
        proposedProposalCount: 1,
        skippedProposalCount: 1,
        expiredProposalCount: 1,
        supersededProposalCount: 1,
        ownerDecisionProposalCount: 4,
        proposalExecutionCount: 3,
        publishedProposalExecutionCount: 1,
        blockedProposalExecutionCount: 1,
        failedProposalExecutionCount: 1,
        digestCount: 2,
        reviewedDigestCount: 1,
        pendingDigestCount: 1,
        digestRequiredActionCount: 1,
        digestBlockedCandidateCount: 1,
        actionHandoffCount: 2,
        deliveredHandoffCount: 1,
        pendingHandoffDeliveryCount: 1,
        actionHandoffActionCount: 1,
        blockedActionHandoffCount: 1,
        schedulerExecutionCount: 3,
        publishedSchedulerExecutionCount: 1,
        blockedSchedulerExecutionCount: 1,
        failedSchedulerExecutionCount: 1,
        schedulerRunCount: 3,
        completedSchedulerRunCount: 1,
        blockedSchedulerRunCount: 1,
        skippedSchedulerRunCount: 1,
        reviewedWorkerTargetCount: 1,
        pendingWorkerTargetReviewCount: 1,
        disabledWorkerTargetCount: 1,
        failurePolicyReady: true,
        failurePolicyStatus: "ready"
      }
    }
  };
}

function allApprovals() {
  return {
    writefulExecutionApproval: { approved: true },
    backgroundSchedulerApproval: { approved: true },
    backgroundWorkerApproval: { approved: true }
  };
}

function createService(options = {}) {
  const calls = [];
  const snapshots = [];
  const service = createLearningAutomationReleaseReadinessService({
    config: options.config || {
      automationWritefulExecutionEnabled: false,
      automationBackgroundSchedulerEnabled: false,
      automationBackgroundWorkerEnabled: false
    },
    schedulerService: options.schedulerService || {
      dryRun(input) {
        calls.push({ type: "dryRun", input });
        return options.dryRun || {
          ok: true,
          dryRun: true,
          writePlanned: false,
          writesPerformed: false,
          publishPlanned: false,
          candidates: [{ proposalId: "lgauto_ready_1" }],
          count: 1
        };
      }
    },
    digestService: options.digestService || {
      listDigests(input) {
        calls.push({ type: "listDigests", input });
        return {
          ok: true,
          count: options.reviewedDigest === false ? 0 : 1,
          digests: options.reviewedDigest === false ? [] : [{
            digestId: "lgadig_reviewed_1",
            status: "reviewed"
          }]
        };
      }
    },
    failurePolicyService: options.failurePolicyService || {
      evaluateReadiness(input) {
        calls.push({ type: "evaluateFailurePolicy", input });
        if (options.activePolicy === false) {
          return {
            ok: true,
            status: "missing_active_failure_policy",
            readyForWritefulAutomationPrerequisite: false,
            missingRequired: ["active_failure_policy"]
          };
        }
        return {
          ok: true,
          status: "failure_policy_ready",
          readyForWritefulAutomationPrerequisite: true,
          summary: { policyId: "lgafpol_active_1" },
          writefulSchedulingAllowed: false
        };
      }
    },
    actionHandoffService: options.actionHandoffService || {
      listHandoffs(input) {
        calls.push({ type: "listHandoffs", input });
        return {
          ok: true,
          count: options.deliveredHandoff === false ? 0 : 1,
          handoffs: options.deliveredHandoff === false ? [] : [{
            handoffId: "lgahand_delivered_1",
            deliveryStatus: "delivered"
          }]
        };
      }
    },
    schedulerWorkerTargetService: options.schedulerWorkerTargetService || {
      listRunnableTargets(input) {
        calls.push({ type: "listRunnableTargets", input });
        return {
          ok: true,
          count: options.workerTarget === false ? 0 : 1,
          targets: options.workerTarget === false ? [] : [{
            workerTargetId: "lgastgt_enabled_1",
            horizon: "daily_plan"
          }]
        };
      }
    },
    releaseApprovalService: options.releaseApprovalService || null,
    releaseEvidenceService: options.releaseEvidenceService || null,
    repository: options.repository || {
      saveSnapshot(input) {
        calls.push({ type: "saveSnapshot", input });
        const snapshot = Object.assign({ readinessId: "lgarel_ready_1" }, input);
        snapshots.push(snapshot);
        return { ok: true, duplicate: false, snapshot };
      },
      listSnapshots(input) {
        calls.push({ type: "listSnapshots", input });
        return snapshots.length ? snapshots : [{
          readinessId: "lgarel_existing_1",
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          status: "incomplete"
        }];
      }
    }
  });
  return { calls, service, snapshots };
}

test("automation release readiness service returns ready-for-review only when all evidence passes", () => {
  const { calls, service } = createService();

  const result = service.evaluateReadiness(Object.assign(scope(), {
    evidence: allEvidence(),
    releaseApproval: allApprovals()
  }));

  assert.equal(result.ok, true);
  assert.equal(result.status, "ready_for_release_review");
  assert.equal(result.summary.readyForOwnerLoop, true);
  assert.equal(result.summary.readyForReleaseReview, true);
  assert.equal(result.summary.writefulSchedulingAllowed, false);
  assert.equal(result.releaseReview.advisoryOnly, true);
  assert.equal(result.releaseReview.requiredActionCount, 0);
  assert.deepEqual(result.releaseReview.requiredActions, []);
  assert.deepEqual(result.releaseReview.missingCheckKeys, []);
  assert.deepEqual(result.releaseReview.blockedCheckKeys, []);
  assert.deepEqual(result.releaseReview.missingEvidenceKeys, []);
  assert.equal(result.releaseReview.nextAction, null);
  assert.equal(result.evidenceReadback.schemaVersion, "growth.learningAutomationReleaseReadiness.evidenceReadback.v1");
  assert.equal(result.evidenceReadback.summaryOnly, true);
  assert.equal(result.evidenceReadback.presentCount, 32);
  assert.equal(result.evidenceReadback.missingCount, 0);
  assert.equal(result.evidenceReadback.writefulSchedulingAllowed, false);
  assert.equal(result.evidenceReadback.sourceBundle, null);
  const ownerDailyEvidence = result.evidenceReadback.items.find((item) => item.key === "ownerDailyUiEvidence");
  assert.equal(ownerDailyEvidence.checkKey, "owner_daily_ui_evidence");
  assert.equal(ownerDailyEvidence.evidencePresent, true);
  assert.equal(ownerDailyEvidence.evidenceId, "ui_daily");
  assert.equal(ownerDailyEvidence.evidenceStatus, "pass");
  assert.equal(result.checks.find((item) => item.key === "automation_digest_ui_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "stage_checkpoint_controls_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_proposal_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "automation_action_handoff_ui_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "scheduler_execution_ui_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "scheduler_run_ui_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "scheduler_worker_target_ui_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_action_handoff_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_scheduler_execution_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_scheduler_run_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_scheduler_worker_target_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_daily_loop_preview_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_learning_loop_state_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_cycle_history_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_owner_audit_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_profile_feedback_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_recommendation_lifecycle_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_daily_loop_write_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_learner_cycle_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_scheduler_worker_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_planner_readiness_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_target_provisioning_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_scheduler_dry_run_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "release_evidence_bundle_audit").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_scheduler_dry_run").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "release_workbench_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "owner_review_evidence").status, "pass");
  const ownerReviewCheck = result.checks.find((item) => item.key === "owner_review_evidence");
  assert.equal(ownerReviewCheck.summary.ownerReviewStageSummaryPresent, true);
  assert.equal(ownerReviewCheck.summary.ownerReviewStageSummary.acceptedProposalCount, 1);
  assert.equal(ownerReviewCheck.summary.ownerReviewStageSummary.digestRequiredActionCount, 1);
  assert.equal(ownerReviewCheck.summary.ownerReviewStageSummary.deliveredHandoffCount, 1);
  assert.equal(ownerReviewCheck.summary.ownerReviewStageSummary.publishedSchedulerExecutionCount, 1);
  assert.equal(ownerReviewCheck.summary.ownerReviewStageSummary.completedSchedulerRunCount, 1);
  assert.equal(ownerReviewCheck.summary.ownerReviewStageSummary.pendingWorkerTargetReviewCount, 1);
  assert.equal(ownerReviewCheck.summary.ownerReviewStageSummary.failurePolicyStatus, "ready");
  const ownerReviewReadback = result.evidenceReadback.items.find((item) => item.key === "ownerReviewEvidence");
  assert.equal(ownerReviewReadback.ownerReviewStageSummary.acceptedProposalCount, 1);
  assert.equal(ownerReviewReadback.ownerReviewStageSummary.digestRequiredActionCount, 1);
  assert.equal(ownerReviewReadback.ownerReviewStageSummary.blockedActionHandoffCount, 1);
  assert.equal(ownerReviewReadback.ownerReviewStageSummary.skippedSchedulerRunCount, 1);
  assert.equal(JSON.stringify(result.evidenceReadback).includes("lgaprop_"), false);
  assert.equal(JSON.stringify(result.evidenceReadback).includes("lgadig_"), false);
  assert.equal(JSON.stringify(result.evidenceReadback).includes("lgahand_"), false);
  assert.equal(JSON.stringify(result.evidenceReadback).includes("lgaexec_"), false);
  assert.equal(JSON.stringify(result.evidenceReadback).includes("lgarun_"), false);
  assert.equal(JSON.stringify(result.evidenceReadback).includes("lgawt_"), false);
  assert.deepEqual(calls.map((call) => call.type), [
    "listDigests",
    "evaluateFailurePolicy",
    "listHandoffs",
    "listRunnableTargets",
    "dryRun"
  ]);
});

test("automation release readiness prefers bundled evidence over default false flag fields", () => {
  const { service } = createService();

  const result = service.evaluateReadiness(Object.assign(scope(), {
    stageCheckpointEvidence: false,
    proposalReviewUiEvidence: false,
    evidence: {
      stageCheckpointEvidence: {
        ok: true,
        status: "pass",
        evidenceId: "stage_sep_from_bundle",
        taskId: "stage_assessment"
      },
      proposalReviewUiEvidence: {
        ...validUiEvidence("proposalReviewUiEvidence"),
        ok: true,
        status: "pass",
        evidenceId: "proposal_ui_from_bundle"
      }
    }
  }));

  const stageCheckpoint = result.checks.find((item) => item.key === "stage_checkpoint_evidence");
  assert.equal(stageCheckpoint.status, "pass");
  assert.equal(stageCheckpoint.summary.evidencePresent, true);
  assert.equal(stageCheckpoint.summary.evidenceId, "stage_sep_from_bundle");
  assert.equal(stageCheckpoint.summary.taskId, "stage_assessment");

  const proposalUi = result.checks.find((item) => item.key === "proposal_review_ui_evidence");
  assert.equal(proposalUi.status, "pass");
  assert.equal(proposalUi.summary.evidenceId, "proposal_ui_from_bundle");
});

test("automation release readiness blocks direct ok UI evidence without validator summary", () => {
  const { service } = createService();
  const evidence = allEvidence();
  evidence.ownerDailyUiEvidence = { ok: true, evidenceId: "ui_daily_unsafe" };

  const result = service.evaluateReadiness(Object.assign(scope(), {
    evidence,
    releaseApproval: allApprovals()
  }));

  const ownerDaily = result.checks.find((item) => item.key === "owner_daily_ui_evidence");
  assert.equal(result.ok, true);
  assert.equal(result.status, "blocked");
  assert.equal(ownerDaily.status, "blocked");
  assert.equal(ownerDaily.summary.evidencePresent, false);
  assert.equal(ownerDaily.summary.uiEvidenceValidated, false);
  assert.equal(ownerDaily.summary.invalidReason, "ui_evidence_validator_schema_required");
  assert.equal(ownerDaily.requiredAction.action, "provide_validated_ui_evidence_summary");
  assert.equal(result.releaseReview.blockedCheckKeys.includes("owner_daily_ui_evidence"), true);
  assert.equal(result.releaseReview.nextAction.key, "owner_daily_ui_evidence");
  assert.equal(result.evidenceReadback.presentCount, 31);
  assert.equal(result.evidenceReadback.missingCount, 1);
  const readback = result.evidenceReadback.items.find((item) => item.key === "ownerDailyUiEvidence");
  assert.equal(readback.evidencePresent, false);
  assert.equal(readback.checkStatus, "blocked");
});

test("automation release readiness service reports missing evidence without enabling scheduling", () => {
  const { service } = createService({
    reviewedDigest: false,
    activePolicy: false,
    deliveredHandoff: false,
    workerTarget: false
  });

  const result = service.evaluateReadiness(scope());

  assert.equal(result.ok, true);
  assert.equal(result.status, "incomplete");
  assert.equal(result.summary.readyForReleaseReview, false);
  assert.equal(result.summary.writefulSchedulingAllowed, false);
  assert.equal(result.config.writefulSchedulingAllowed, false);
  assert.equal(result.releaseReview.requiredActionCount, result.summary.missingRequired.length);
  assert.equal(result.releaseReview.nextAction.key, "owner_daily_ui_evidence");
  assert.equal(result.releaseReview.nextAction.action, "complete_owner_daily_ui_visual_validation");
  assert.equal(result.releaseReview.nextAction.requiredActor, "owner");
  assert.equal(result.releaseReview.missingCheckKeys.includes("active_failure_policy"), true);
  assert.equal(result.releaseReview.missingEvidenceKeys.includes("active_failure_policy"), false);
  assert.equal(result.releaseReview.missingEvidenceKeys.includes("production_owner_audit_smoke_evidence"), true);
  assert.equal(result.evidenceReadback.presentCount, 0);
  assert.equal(result.evidenceReadback.missingCount, 32);
  assert.equal(result.evidenceReadback.missingCheckKeys.includes("owner_daily_ui_evidence"), true);
  assert.equal(result.evidenceReadback.missingCheckKeys.includes("production_recommendation_lifecycle_smoke_evidence"), true);
  const missingOwnerDailyEvidence = result.evidenceReadback.items.find((item) => item.key === "ownerDailyUiEvidence");
  assert.equal(missingOwnerDailyEvidence.evidencePresent, false);
  assert.equal(missingOwnerDailyEvidence.checkStatus, "missing");
  const activeFailurePolicyAction = result.releaseReview.requiredActions.find((item) => item.key === "active_failure_policy");
  assert.equal(activeFailurePolicyAction.action, "activate_failure_policy");
  assert.equal(activeFailurePolicyAction.endpoint, "/api/v1/growth/automation/failure-policies");
  assert.equal(result.checks.find((item) => item.key === "reviewed_automation_digest").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "active_failure_policy").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "automation_digest_ui_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "stage_checkpoint_controls_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_proposal_smoke_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "automation_action_handoff_ui_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "scheduler_execution_ui_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "scheduler_run_ui_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "scheduler_worker_target_ui_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_action_handoff_smoke_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_scheduler_execution_smoke_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_scheduler_run_smoke_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_scheduler_worker_target_smoke_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_daily_loop_preview_smoke_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_learning_loop_state_smoke_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_cycle_history_smoke_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_owner_audit_smoke_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_profile_feedback_smoke_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_daily_loop_write_smoke_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_learner_cycle_smoke_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_scheduler_worker_smoke_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "release_workbench_smoke_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "owner_review_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_planner_readiness_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_scheduler_dry_run_smoke_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "writeful_execution_release_approval").status, "missing");
});

test("automation release readiness service blocks unsafe dry-run/config states", () => {
  const { service } = createService({
    config: {
      automationWritefulExecutionEnabled: true,
      automationBackgroundSchedulerEnabled: true,
      automationBackgroundWorkerEnabled: true
    },
    dryRun: {
      ok: true,
      dryRun: true,
      writePlanned: true,
      writesPerformed: false,
      publishPlanned: false
    }
  });

  const result = service.evaluateReadiness(Object.assign(scope(), {
    evidence: allEvidence(),
    releaseApproval: allApprovals()
  }));

  assert.equal(result.status, "blocked");
  assert.equal(result.checks.find((item) => item.key === "production_scheduler_dry_run").status, "blocked");
  assert.equal(result.checks.find((item) => item.key === "scheduler_run_default_disabled").status, "blocked");
  assert.equal(result.checks.find((item) => item.key === "worker_timer_default_disabled").status, "blocked");
  assert.equal(result.checks.find((item) => item.key === "writeful_execution_release_approval").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "background_scheduler_release_approval").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "background_worker_release_approval").status, "pass");
  assert.equal(result.summary.writefulSchedulingAllowed, false);
  assert.deepEqual(result.releaseReview.blockedCheckKeys, [
    "scheduler_run_default_disabled",
    "worker_timer_default_disabled",
    "production_scheduler_dry_run"
  ]);
  const dryRunAction = result.releaseReview.requiredActions.find((item) => item.key === "production_scheduler_dry_run");
  assert.equal(dryRunAction.action, "resolve_blocked_release_readiness_check");
  assert.equal(dryRunAction.requiredActor, "owner");
});

test("automation release readiness service accepts release approval aliases but still keeps readiness advisory-only", () => {
  const { service } = createService();

  const topLevelApprovals = service.evaluateReadiness(Object.assign(scope(), {
    evidence: allEvidence(),
    writefulExecutionApproval: true,
    backgroundSchedulerApproval: { ok: true },
    backgroundWorkerApproval: { status: "approved" }
  }));

  assert.equal(topLevelApprovals.ok, true);
  assert.equal(topLevelApprovals.checks.find((item) => item.key === "writeful_execution_release_approval").status, "pass");
  assert.equal(topLevelApprovals.checks.find((item) => item.key === "background_scheduler_release_approval").status, "pass");
  assert.equal(topLevelApprovals.checks.find((item) => item.key === "background_worker_release_approval").status, "pass");
  assert.equal(topLevelApprovals.releaseReview.advisoryOnly, true);
  assert.equal(topLevelApprovals.summary.writefulSchedulingAllowed, false);

  const approvalAlias = service.evaluateReadiness(Object.assign(scope(), {
    evidence: allEvidence(),
    approvals: allApprovals()
  }));

  assert.equal(approvalAlias.ok, true);
  assert.equal(approvalAlias.status, "ready_for_release_review");
  assert.equal(approvalAlias.config.writefulSchedulingAllowed, false);
});

test("automation release readiness service can use persisted release approval records", () => {
  const { calls, service } = createService({
    releaseApprovalService: {
      approvalBag(input) {
        calls.push({ type: "approvalBag", input });
        return {
          ok: true,
          releaseApproval: {
            writefulExecutionApproval: {
              approved: true,
              status: "approved",
              approvalId: "lgarap_writeful_1",
              source: "growth_release_approval_record"
            },
            backgroundSchedulerApproval: {
              approved: true,
              status: "approved",
              approvalId: "lgarap_scheduler_1",
              source: "growth_release_approval_record"
            },
            backgroundWorkerApproval: {
              approved: true,
              status: "approved",
              approvalId: "lgarap_worker_1",
              source: "growth_release_approval_record"
            }
          },
          approvalKeys: ["backgroundSchedulerApproval", "backgroundWorkerApproval", "writefulExecutionApproval"]
        };
      }
    }
  });

  const result = service.evaluateReadiness(Object.assign(scope(), {
    evidence: allEvidence()
  }));

  assert.equal(result.ok, true);
  assert.equal(result.status, "ready_for_release_review");
  assert.equal(result.checks.find((item) => item.key === "writeful_execution_release_approval").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "background_scheduler_release_approval").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "background_worker_release_approval").status, "pass");
  assert.deepEqual(result.releaseReview.persistedApprovalKeys, ["backgroundSchedulerApproval", "backgroundWorkerApproval", "writefulExecutionApproval"]);
  assert.equal(result.summary.writefulSchedulingAllowed, false);
  assert.equal(calls[0].type, "approvalBag");
});

test("automation release readiness service can use persisted release evidence records", () => {
  const { calls, service } = createService({
    releaseEvidenceService: {
      evidenceBag(input) {
        calls.push({ type: "evidenceBag", input });
        return {
          ok: true,
          evidence: {
            ownerDailyUiEvidence: {
              ...persistedUiEvidence("ownerDailyUiEvidence"),
              ok: true,
              status: "pass",
              evidenceId: "lgarev_owner_daily_1",
              evidenceRecordId: "lgarev_owner_daily_1",
              observedAt: "2026-06-16T10:45:00.000Z",
              source: "growth_release_evidence_record"
            },
            stageCheckpointControlsEvidence: {
              ok: true,
              status: "pass",
              evidenceId: "lgarev_stage_controls_1",
              evidenceRecordId: "lgarev_stage_controls_1",
              observedAt: "2026-06-16T10:46:00.000Z",
              source: "growth_release_evidence_record"
            },
            releaseWorkbenchSmokeEvidence: {
              ok: true,
              status: "pass",
              evidenceId: "lgarev_release_workbench_1",
              evidenceRecordId: "lgarev_release_workbench_1",
              observedAt: "2026-06-16T10:47:00.000Z",
              source: "growth_release_evidence_record"
            }
          },
          evidenceKeys: ["ownerDailyUiEvidence", "releaseWorkbenchSmokeEvidence", "stageCheckpointControlsEvidence"]
        };
      }
    }
  });

  const result = service.evaluateReadiness(scope());

  assert.equal(result.ok, true);
  assert.equal(result.status, "incomplete");
  assert.equal(result.checks.find((item) => item.key === "owner_daily_ui_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "stage_checkpoint_controls_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "release_workbench_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "owner_audit_ui_evidence").status, "missing");
  assert.deepEqual(result.releaseReview.persistedEvidenceKeys, ["ownerDailyUiEvidence", "releaseWorkbenchSmokeEvidence", "stageCheckpointControlsEvidence"]);
  assert.deepEqual(result.evidence.persistedEvidenceKeys, ["ownerDailyUiEvidence", "releaseWorkbenchSmokeEvidence", "stageCheckpointControlsEvidence"]);
  assert.equal(result.evidenceReadback.presentEvidenceKeys.includes("ownerDailyUiEvidence"), true);
  assert.equal(result.evidenceReadback.presentEvidenceKeys.includes("stageCheckpointControlsEvidence"), true);
  assert.equal(result.evidenceReadback.presentEvidenceKeys.includes("releaseWorkbenchSmokeEvidence"), true);
  const ownerDailyEvidence = result.evidenceReadback.items.find((item) => item.key === "ownerDailyUiEvidence");
  assert.equal(ownerDailyEvidence.evidencePresent, true);
  assert.equal(ownerDailyEvidence.evidenceId, "lgarev_owner_daily_1");
  assert.equal(ownerDailyEvidence.source, "growth_release_evidence_record");
  assert.equal(calls[0].type, "evidenceBag");
  assert.equal(calls[0].input.status, "pass");
});

test("automation release readiness service blocks provided non-passing release evidence", () => {
  const { service } = createService();
  const result = service.evaluateReadiness(Object.assign(scope(), {
    evidence: {
      releaseWorkbenchSmokeEvidence: {
        ok: false,
        status: "blocked",
        evidenceId: "release_workbench_deprecated_flag",
        source: "release_readiness_smoke_flag_deprecated",
        error: "validated_release_workbench_evidence_required",
        requiredAction: "provide_validated_release_workbench_evidence"
      }
    }
  }));

  const workbench = result.checks.find((item) => item.key === "release_workbench_smoke_evidence");
  const readback = result.evidenceReadback.items.find((item) => item.key === "releaseWorkbenchSmokeEvidence");
  assert.equal(result.ok, true);
  assert.equal(result.status, "blocked");
  assert.equal(workbench.status, "blocked");
  assert.equal(workbench.summary.evidenceProvided, true);
  assert.equal(workbench.summary.evidencePresent, false);
  assert.equal(workbench.summary.invalidReason, "validated_release_workbench_evidence_required");
  assert.equal(workbench.requiredAction.action, "provide_validated_release_workbench_evidence");
  assert.equal(result.releaseReview.blockedCheckKeys.includes("release_workbench_smoke_evidence"), true);
  assert.equal(readback.evidencePresent, false);
  assert.equal(readback.invalidReason, "validated_release_workbench_evidence_required");
  assert.equal(readback.evidenceId, "release_workbench_deprecated_flag");
});

test("automation release readiness service blocks provided non-passing Owner review evidence", () => {
  const { service } = createService();
  const result = service.evaluateReadiness(Object.assign(scope(), {
    evidence: {
      ownerReviewEvidence: {
        ok: false,
        status: "blocked",
        evidenceId: "owner_review_deprecated_flag",
        source: "release_readiness_smoke_flag_deprecated",
        error: "validated_owner_review_evidence_required",
        requiredAction: "provide_validated_owner_review_evidence"
      }
    }
  }));

  const ownerReview = result.checks.find((item) => item.key === "owner_review_evidence");
  const readback = result.evidenceReadback.items.find((item) => item.key === "ownerReviewEvidence");
  assert.equal(result.ok, true);
  assert.equal(result.status, "blocked");
  assert.equal(ownerReview.status, "blocked");
  assert.equal(ownerReview.summary.evidenceProvided, true);
  assert.equal(ownerReview.summary.evidencePresent, false);
  assert.equal(ownerReview.summary.ownerReviewStageSummaryPresent, false);
  assert.equal(ownerReview.summary.invalidReason, "validated_owner_review_evidence_required");
  assert.equal(ownerReview.requiredAction.action, "provide_validated_owner_review_evidence");
  assert.equal(result.releaseReview.blockedCheckKeys.includes("owner_review_evidence"), true);
  assert.equal(readback.evidencePresent, false);
  assert.equal(readback.invalidReason, "validated_owner_review_evidence_required");
  assert.equal(readback.evidenceId, "owner_review_deprecated_flag");
});

test("automation release readiness service blocks bare boolean release evidence", () => {
  const { service } = createService();
  const evidence = allEvidence();
  evidence.stageCheckpointEvidence = true;
  evidence.productionPlannerReadinessEvidence = true;
  evidence.ownerReviewEvidence = true;

  const result = service.evaluateReadiness(Object.assign(scope(), {
    evidence,
    releaseApproval: allApprovals()
  }));

  [
    {
      checkKey: "stage_checkpoint_evidence",
      evidenceKey: "stageCheckpointEvidence",
      requiredAction: "validate_stage_checkpoint_separation"
    },
    {
      checkKey: "production_planner_readiness_evidence",
      evidenceKey: "productionPlannerReadinessEvidence",
      requiredAction: "run_production_planner_readiness_smoke"
    },
    {
      checkKey: "owner_review_evidence",
      evidenceKey: "ownerReviewEvidence",
      requiredAction: "run_owner_review_evidence_smoke"
    }
  ].forEach(({ checkKey, evidenceKey, requiredAction }) => {
    const check = result.checks.find((item) => item.key === checkKey);
    const readback = result.evidenceReadback.items.find((item) => item.key === evidenceKey);
    assert.equal(check.status, "blocked");
    assert.equal(check.summary.evidenceProvided, true);
    assert.equal(check.summary.evidencePresent, false);
    assert.equal(check.summary.invalidReason, "validated_release_evidence_object_required");
    assert.equal(check.requiredAction.action, requiredAction);
    assert.equal(result.releaseReview.blockedCheckKeys.includes(checkKey), true);
    assert.equal(readback.checkStatus, "blocked");
    assert.equal(readback.evidencePresent, false);
    assert.equal(readback.invalidReason, "validated_release_evidence_object_required");
  });

  const ownerReview = result.checks.find((item) => item.key === "owner_review_evidence");
  assert.equal(ownerReview.summary.ownerReviewStageSummaryPresent, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.evidenceReadback.presentCount, 29);
  assert.equal(result.evidenceReadback.missingCount, 3);
  assert.equal(result.checks.find((item) => item.key === "writeful_execution_release_approval").status, "pass");
});

test("automation release readiness service blocks enabled config gates when explicit release approval is missing", () => {
  const { service } = createService({
    config: {
      automationWritefulExecutionEnabled: true,
      automationBackgroundSchedulerEnabled: true,
      automationBackgroundWorkerEnabled: true
    }
  });

  const result = service.evaluateReadiness(Object.assign(scope(), {
    evidence: allEvidence()
  }));

  const writeful = result.checks.find((item) => item.key === "writeful_execution_release_approval");
  const scheduler = result.checks.find((item) => item.key === "background_scheduler_release_approval");
  const worker = result.checks.find((item) => item.key === "background_worker_release_approval");
  assert.equal(result.status, "blocked");
  assert.equal(writeful.status, "blocked");
  assert.equal(writeful.requiredAction.action, "disable_or_record_release_approval");
  assert.equal(scheduler.status, "blocked");
  assert.equal(scheduler.requiredAction.action, "disable_or_record_release_approval");
  assert.equal(worker.status, "blocked");
  assert.equal(worker.requiredAction.action, "disable_or_record_release_approval");
  assert.equal(result.releaseReview.blockedCheckKeys.includes("writeful_execution_release_approval"), true);
  assert.equal(result.releaseReview.blockedCheckKeys.includes("background_scheduler_release_approval"), true);
  assert.equal(result.releaseReview.blockedCheckKeys.includes("background_worker_release_approval"), true);
  assert.equal(result.releaseReview.requiredActions.find((item) => item.key === "writeful_execution_release_approval").action, "disable_or_record_release_approval");
  assert.equal(result.summary.writefulSchedulingAllowed, false);
});

test("automation release readiness service creates summary-only snapshots and lists them", () => {
  const { calls, service } = createService();

  const created = service.createSnapshot(Object.assign(scope(), {
    evidence: allEvidence(),
    releaseApproval: allApprovals(),
    requestedBy: "weixin_owner",
    createdAt: "2026-06-15T16:30:00.000Z"
  }));

  assert.equal(created.ok, true);
  assert.equal(created.snapshot.readinessId, "lgarel_ready_1");
  assert.equal(created.snapshot.status, "ready_for_release_review");
  assert.equal(created.snapshot.summary.writefulSchedulingAllowed, false);
  assert.equal(created.snapshot.evidenceReadback.summaryOnly, true);
  assert.equal(created.snapshot.evidenceReadback.presentCount, 32);
  assert.equal(calls.at(-1).type, "saveSnapshot");
  assert.equal(calls.at(-1).input.privacyClass, "summary_only");
  assert.equal(calls.at(-1).input.releaseReview.requiredActionCount, 0);
  assert.deepEqual(calls.at(-1).input.releaseReview.requiredActions, []);
  assert.equal(calls.at(-1).input.evidenceReadback.items.find((item) => item.key === "centralVisualEvidence").evidencePresent, true);

  const listed = service.listSnapshots(scope());
  assert.equal(listed.ok, true);
  assert.equal(listed.count, 1);
  assert.equal(calls.at(-1).type, "listSnapshots");
});

test("automation release readiness service fails closed for privacy-risk input and missing repository", () => {
  const privacy = createService().service.evaluateReadiness(Object.assign(scope(), {
    rawPrompt: "do not store"
  }));
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_automation_release_readiness_privacy_failed");
  assert.equal(privacy.privacyFindings.includes("$.rawPrompt"), true);

  const privatePath = createService().service.evaluateReadiness(Object.assign(scope(), {
    evidence: {
      ownerDailyUiEvidence: {
        ok: true,
        evidenceId: "/Users/hermes-dev/private-artifact.json"
      }
    }
  }));
  assert.equal(privatePath.ok, false);
  assert.equal(privatePath.error, "learning_automation_release_readiness_privacy_failed");
  assert.equal(privatePath.privacyFindings.includes("$.evidence.ownerDailyUiEvidence.evidenceId"), true);

  const missingRepository = createLearningAutomationReleaseReadinessService({});
  assert.equal(missingRepository.createSnapshot(scope()).error, "learning_automation_release_readiness_repository_unavailable");
  assert.equal(missingRepository.listSnapshots(scope()).error, "learning_automation_release_readiness_repository_unavailable");
});
