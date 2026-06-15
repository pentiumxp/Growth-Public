const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const {
  DEFAULT_TASK_IDS,
  RELEASE_EVIDENCE_BUNDLE_SCHEMA,
  createLearningAutomationReleaseEvidenceBundleService,
  normalizeTaskIds,
  publicScope,
  scopeArgs
} = require("../src/services/learning-automation-release-evidence-bundle-service");

function createServiceWithRunner(runner) {
  const calls = [];
  const service = createLearningAutomationReleaseEvidenceBundleService({
    repoRoot: "/repo/growth",
    nodePath: "/node",
    now: () => new Date("2026-06-15T06:10:00.000Z"),
    runCommand(command, args, options) {
      calls.push({ command, args, options });
      return runner(command, args, options);
    }
  });
  return { calls, service };
}

test("release evidence bundle service normalizes scope and task args", () => {
  assert.deepEqual(normalizeTaskIds({}), Array.from(DEFAULT_TASK_IDS));
  assert.equal(DEFAULT_TASK_IDS.includes("learner_cycle"), true);
  assert.equal(DEFAULT_TASK_IDS.includes("daily_loop_write"), false);
  assert.deepEqual(normalizeTaskIds({ tasks: ["planner-readiness", "scheduler_dry_run"] }), [
    "planner_readiness",
    "scheduler_dry_run"
  ]);
  assert.deepEqual(publicScope({
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    available_minutes: 15,
    target_node_ids: ["kg_science_fair_test", "kg_science_fair_test"]
  }), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "",
    domainPackId: "",
    domain: "",
    subject: "",
    horizon: "daily_plan",
    availableMinutes: 15,
    limit: 12,
    targetNodeIds: ["kg_science_fair_test"],
    allowWriteEvidence: false,
    dailyLoopWriteOperation: "draft",
    learnerCycleOperation: "audit",
    taskCardId: "",
    planDraftId: ""
  });
  assert.deepEqual(scopeArgs({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    availableMinutes: 15,
    limit: 7,
    targetNodeIds: ["kg_science_fair_test"]
  }), [
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--limit", "7",
    "--program-id", "program_science",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--available-minutes", "15",
    "--target-node-id", "kg_science_fair_test"
  ]);
});

test("release evidence bundle service builds summary-only bundle from no-write smoke tasks", () => {
  const { calls, service } = createServiceWithRunner((command, args) => ({
    status: 0,
    stdout: JSON.stringify({
      ok: true,
      source: path.basename(args[0]),
      operation: "readiness",
      summary: { candidateCount: 1 }
    })
  }));

  const result = service.buildBundle({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    targetNodeIds: ["kg_science_fair_test"],
    taskCardId: "ltask_science_daily_1",
    tasks: ["planner_readiness", "daily_loop_preview", "learning_loop_state", "learner_cycle", "stage_assessment", "proposal"],
    requestedBy: "owner"
  });

  assert.equal(result.ok, true);
  assert.equal(result.bundle.schemaVersion, RELEASE_EVIDENCE_BUNDLE_SCHEMA);
  assert.equal(result.bundle.privacyClass, "summary_only");
  assert.equal(result.bundle.summaryOnly, true);
  assert.equal(result.bundle.requestedBy, "owner");
  assert.equal(result.bundle.scope.workspaceId, "weixin_fanfan");
  assert.deepEqual(Object.keys(result.bundle.evidence), [
    "productionPlannerReadinessEvidence",
    "productionDailyLoopPreviewSmokeEvidence",
    "productionLearningLoopStateSmokeEvidence",
    "productionLearnerCycleSmokeEvidence",
    "stageCheckpointEvidence",
    "productionProposalSmokeEvidence"
  ]);
  assert.equal(result.bundle.evidence.productionPlannerReadinessEvidence.status, "pass");
  assert.equal(result.bundle.evidence.productionPlannerReadinessEvidence.ok, true);
  assert.equal(result.bundle.summary.taskCount, 6);
  assert.equal(result.bundle.summary.blockedCount, 0);
  assert.equal(calls.length, 6);
  assert.equal(calls[0].command, "/node");
  assert.ok(calls[0].args[0].endsWith("scripts/smoke-growth-planner-readiness.js"));
  assert.ok(calls[2].args[0].endsWith("scripts/smoke-growth-learning-loop-state.js"));
  assert.ok(calls[3].args[0].endsWith("scripts/smoke-growth-learner-cycle.js"));
  assert.ok(calls[3].args.includes("--operation"));
  assert.ok(calls[3].args.includes("audit"));
  assert.ok(calls[3].args.includes("--task-card-id"));
  assert.ok(calls[3].args.includes("ltask_science_daily_1"));
  assert.ok(calls[4].args[0].endsWith("scripts/smoke-growth-stage-assessment.js"));
  assert.ok(calls[4].args.includes("--target-node-id"));
  assert.ok(calls[4].args.includes("kg_science_fair_test"));
  assert.ok(calls[5].args[0].endsWith("scripts/smoke-growth-automation-proposal.js"));
  assert.ok(calls[0].args.includes("--json"));
  assert.ok(JSON.stringify(result.bundle).includes("stdout") === false);
});

test("release evidence bundle service blocks learner-cycle write operations from bundle scope", () => {
  const { calls, service } = createServiceWithRunner(() => {
    throw new Error("runner should not be called for learner-cycle write scope");
  });

  const result = service.buildBundle({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    learnerCycleOperation: "full",
    taskCardId: "ltask_science_daily_1",
    tasks: ["learner_cycle"]
  });

  assert.equal(result.ok, false);
  assert.equal(calls.length, 0);
  assert.deepEqual(result.bundle.summary.failedTaskIds, ["learner_cycle"]);
  const evidence = result.bundle.evidence.productionLearnerCycleSmokeEvidence;
  assert.equal(evidence.status, "blocked");
  assert.equal(evidence.error, "release_evidence_bundle_learner_cycle_operation_invalid");
  assert.deepEqual(evidence.allowedOperations, ["audit"]);
  assert.equal(evidence.summary.operation, "full");
  assert.equal(evidence.summary.useDirectSmoke, "npm run smoke:learner-cycle");
  assert.equal(JSON.stringify(result.bundle).includes("learner answer"), false);
});

test("release evidence bundle service keeps blocked smoke as bounded evidence", () => {
  const { service } = createServiceWithRunner((command, args) => {
    if (args[0].endsWith("smoke-growth-scheduler-dry-run.js")) {
      return {
        status: 1,
        stdout: JSON.stringify({
          ok: false,
          error: "scheduler_dry_run_smoke_blocked",
          summary: { missingRequired: ["audit_completeness"] }
        })
      };
    }
    return { status: 0, stdout: JSON.stringify({ ok: true, source: "ok" }) };
  });

  const result = service.buildBundle({
    workspaceId: "weixin_fanfan",
    tasks: ["planner_readiness", "scheduler_dry_run"]
  });

  assert.equal(result.ok, false);
  assert.equal(result.bundle.summary.passedCount, 1);
  assert.equal(result.bundle.summary.blockedCount, 1);
  assert.deepEqual(result.bundle.summary.failedTaskIds, ["scheduler_dry_run"]);
  assert.deepEqual(result.bundle.tasks.map((task) => task.status), ["pass", "blocked"]);
  assert.equal(result.bundle.evidence.productionSchedulerDryRunSmokeEvidence.status, "blocked");
  assert.equal(result.bundle.evidence.productionSchedulerDryRunSmokeEvidence.error, "scheduler_dry_run_smoke_blocked");
});

test("release evidence bundle service collects release approval bag without evidence splicing", () => {
  const { calls, service } = createServiceWithRunner((command, args) => ({
    status: 0,
    stdout: JSON.stringify({
      ok: true,
      operation: "bag",
      releaseApproval: {
        writefulExecutionApproval: {
          approved: true,
          status: "approved",
          approvalId: "lgarap_writeful",
          approvedBy: "owner",
          approvedAt: "2026-06-15T06:10:00.000Z",
          source: "growth_release_approval_record"
        },
        backgroundSchedulerApproval: {
          approved: true,
          status: "approved",
          approvalId: "lgarap_scheduler",
          approvedBy: "owner",
          approvedAt: "2026-06-15T06:10:00.000Z"
        }
      }
    })
  }));

  const result = service.buildBundle({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    tasks: ["release_approval"]
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.bundle.evidence, {});
  assert.equal(result.bundle.releaseApproval.writefulExecutionApproval.approved, true);
  assert.equal(result.bundle.releaseApproval.backgroundSchedulerApproval.source, "growth_release_approval_record");
  assert.equal(result.bundle.releaseApproval.writefulExecutionApproval.approvalId, "lgarap_writeful");
  assert.deepEqual(result.bundle.summary.failedTaskIds, []);
  assert.equal(result.bundle.tasks[0].outputKey, "releaseApproval");
  assert.equal(result.bundle.tasks[0].source, "npm run smoke:release-approval");
  assert.ok(calls[0].args[0].endsWith("scripts/smoke-growth-automation-release-approval.js"));
  assert.ok(calls[0].args.includes("--operation"));
  assert.ok(calls[0].args.includes("bag"));
  assert.equal(JSON.stringify(result.bundle).includes("stdout"), false);
});

test("release evidence bundle service blocks controlled daily-loop write evidence unless explicitly allowed", () => {
  const { calls, service } = createServiceWithRunner(() => {
    throw new Error("runner should not be called for gated write evidence");
  });

  const result = service.buildBundle({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    tasks: ["daily_loop_write"]
  });

  assert.equal(result.ok, false);
  assert.equal(calls.length, 0);
  assert.equal(result.bundle.summary.taskCount, 1);
  assert.equal(result.bundle.summary.blockedCount, 1);
  assert.deepEqual(result.bundle.summary.failedTaskIds, ["daily_loop_write"]);
  const evidence = result.bundle.evidence.productionDailyLoopWriteSmokeEvidence;
  assert.equal(evidence.status, "blocked");
  assert.equal(evidence.error, "release_evidence_bundle_write_evidence_not_allowed");
  assert.equal(evidence.requiredFlag, "--allow-write-evidence");
  assert.equal(evidence.summary.writeEvidenceAllowed, false);
  assert.equal(result.bundle.tasks[0].source, "npm run smoke:daily-loop");
  assert.equal(JSON.stringify(result.bundle).includes("stdout"), false);
});

test("release evidence bundle service runs controlled daily-loop write smoke only after bundle write approval", () => {
  const { calls, service } = createServiceWithRunner((command, args) => ({
    status: 0,
    stdout: JSON.stringify({
      ok: true,
      operation: "publish",
      source: path.basename(args[0]),
      summary: { published: true }
    })
  }));

  const result = service.buildBundle({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    planDraftId: "lgpd_daily_1",
    dailyLoopWriteOperation: "publish",
    allowWriteEvidence: true,
    tasks: ["daily_loop_write"]
  });

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].args[0].endsWith("scripts/smoke-growth-daily-loop.js"));
  assert.ok(calls[0].args.includes("--allow-write"));
  assert.ok(calls[0].args.includes("--operation"));
  assert.ok(calls[0].args.includes("publish"));
  assert.ok(calls[0].args.includes("--plan-draft-id"));
  assert.ok(calls[0].args.includes("lgpd_daily_1"));
  const evidence = result.bundle.evidence.productionDailyLoopWriteSmokeEvidence;
  assert.equal(evidence.status, "pass");
  assert.equal(evidence.smoke, "npm run smoke:daily-loop");
  assert.equal(evidence.summary.operation, "publish");
});

test("release evidence bundle service blocks unsafe daily-loop write task scope before runner execution", () => {
  const { calls, service } = createServiceWithRunner(() => {
    throw new Error("runner should not be called for invalid write scope");
  });

  const invalidOperation = service.buildBundle({
    workspaceId: "weixin_fanfan",
    allowWriteEvidence: true,
    dailyLoopWriteOperation: "preview",
    tasks: ["daily_loop_write"]
  });
  assert.equal(invalidOperation.ok, false);
  assert.equal(invalidOperation.bundle.evidence.productionDailyLoopWriteSmokeEvidence.error, "release_evidence_bundle_daily_loop_write_operation_invalid");
  assert.deepEqual(invalidOperation.bundle.evidence.productionDailyLoopWriteSmokeEvidence.allowedOperations, ["draft", "publish"]);

  const missingDraftId = service.buildBundle({
    workspaceId: "weixin_fanfan",
    allowWriteEvidence: true,
    dailyLoopWriteOperation: "publish",
    tasks: ["daily_loop_write"]
  });
  assert.equal(missingDraftId.ok, false);
  assert.equal(missingDraftId.bundle.evidence.productionDailyLoopWriteSmokeEvidence.error, "release_evidence_bundle_plan_draft_id_required");
  assert.equal(calls.length, 0);
});

test("release evidence bundle service fails closed for missing workspace, invalid task, and privacy-risk smoke output", () => {
  const missingWorkspace = createServiceWithRunner(() => ({ status: 0, stdout: "{}" }))
    .service
    .buildBundle({});
  assert.deepEqual(missingWorkspace, {
    ok: false,
    error: "release_evidence_bundle_workspace_required"
  });

  const invalidTask = createServiceWithRunner(() => ({ status: 0, stdout: "{}" }))
    .service
    .buildBundle({ workspaceId: "weixin_fanfan", tasks: ["unknown_task"] });
  assert.equal(invalidTask.ok, false);
  assert.equal(invalidTask.error, "release_evidence_bundle_task_invalid");
  assert.deepEqual(invalidTask.invalidTaskIds, ["unknown_task"]);
  assert.ok(invalidTask.allowedTaskIds.includes("learner_cycle"));
  assert.ok(invalidTask.allowedTaskIds.includes("daily_loop_write"));

  const privacy = createServiceWithRunner(() => ({
    status: 0,
    stdout: JSON.stringify({
      ok: true,
      rawPrompt: "must not be persisted"
    })
  })).service.buildBundle({
    workspaceId: "weixin_fanfan",
    tasks: ["planner_readiness"]
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.bundle.evidence.productionPlannerReadinessEvidence.status, "blocked");
  assert.equal(privacy.bundle.evidence.productionPlannerReadinessEvidence.error, "release_evidence_bundle_smoke_privacy_failed");
  assert.equal(privacy.bundle.evidence.productionPlannerReadinessEvidence.privacyFindingCount, 1);
  assert.equal(JSON.stringify(privacy.bundle).includes("must not be persisted"), false);

  const approvalPrivacy = createServiceWithRunner(() => ({
    status: 0,
    stdout: JSON.stringify({
      ok: true,
      releaseApproval: {
        writefulExecutionApproval: {
          approved: true,
          rawPrompt: "must not be persisted"
        }
      }
    })
  })).service.buildBundle({
    workspaceId: "weixin_fanfan",
    tasks: ["release_approval"]
  });
  assert.equal(approvalPrivacy.ok, false);
  assert.equal(approvalPrivacy.bundle.tasks[0].status, "blocked");
  assert.equal(approvalPrivacy.bundle.tasks[0].error, "release_evidence_bundle_smoke_privacy_failed");
  assert.equal(JSON.stringify(approvalPrivacy.bundle).includes("must not be persisted"), false);
});
