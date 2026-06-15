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
    targetNodeIds: ["kg_science_fair_test"]
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
    tasks: ["planner_readiness", "daily_loop_preview"],
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
    "productionDailyLoopPreviewSmokeEvidence"
  ]);
  assert.equal(result.bundle.evidence.productionPlannerReadinessEvidence.status, "pass");
  assert.equal(result.bundle.evidence.productionPlannerReadinessEvidence.ok, true);
  assert.equal(result.bundle.summary.taskCount, 2);
  assert.equal(result.bundle.summary.blockedCount, 0);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].command, "/node");
  assert.ok(calls[0].args[0].endsWith("scripts/smoke-growth-planner-readiness.js"));
  assert.ok(calls[0].args.includes("--json"));
  assert.ok(JSON.stringify(result.bundle).includes("stdout") === false);
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
});
