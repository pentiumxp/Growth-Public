const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningAutomationReleaseReadinessService
} = require("../src/services/learning-automation-release-readiness-service");

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

function allEvidence() {
  return {
    ownerDailyUiEvidence: { ok: true, evidenceId: "ui_daily" },
    ownerAuditUiEvidence: { ok: true, evidenceId: "ui_audit" },
    stageCheckpointEvidence: { ok: true, evidenceId: "stage_sep" },
    proposalReviewUiEvidence: { ok: true, evidenceId: "proposal_ui" },
    productionActionHandoffSmokeEvidence: { ok: true, evidenceId: "action_handoff_smoke" },
    productionSchedulerExecutionSmokeEvidence: { ok: true, evidenceId: "scheduler_execution_smoke" },
    productionSchedulerRunSmokeEvidence: { ok: true, evidenceId: "scheduler_run_smoke" },
    productionSchedulerWorkerSmokeEvidence: { ok: true, evidenceId: "scheduler_worker_smoke" },
    productionPlannerReadinessEvidence: { ok: true, evidenceId: "planner_smoke" },
    productionDailyLoopPreviewSmokeEvidence: { ok: true, evidenceId: "daily_loop_preview_smoke" },
    productionDailyLoopWriteSmokeEvidence: { ok: true, evidenceId: "daily_loop_write_smoke" },
    platformActionEvidence: { ok: true, evidenceId: "platform_action" },
    centralVisualEvidence: { ok: true, evidenceId: "visual" }
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
  assert.equal(result.checks.find((item) => item.key === "production_action_handoff_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_scheduler_execution_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_scheduler_run_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_daily_loop_preview_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_daily_loop_write_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_scheduler_worker_smoke_evidence").status, "pass");
  assert.equal(result.checks.find((item) => item.key === "production_scheduler_dry_run").status, "pass");
  assert.deepEqual(calls.map((call) => call.type), [
    "listDigests",
    "evaluateFailurePolicy",
    "listHandoffs",
    "listRunnableTargets",
    "dryRun"
  ]);
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
  assert.equal(result.checks.find((item) => item.key === "reviewed_automation_digest").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "active_failure_policy").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_action_handoff_smoke_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_scheduler_execution_smoke_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_scheduler_run_smoke_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_daily_loop_preview_smoke_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_daily_loop_write_smoke_evidence").status, "missing");
  assert.equal(result.checks.find((item) => item.key === "production_scheduler_worker_smoke_evidence").status, "missing");
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
  assert.equal(calls.at(-1).type, "saveSnapshot");
  assert.equal(calls.at(-1).input.privacyClass, "summary_only");

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

  const missingRepository = createLearningAutomationReleaseReadinessService({});
  assert.equal(missingRepository.createSnapshot(scope()).error, "learning_automation_release_readiness_repository_unavailable");
  assert.equal(missingRepository.listSnapshots(scope()).error, "learning_automation_release_readiness_repository_unavailable");
});
