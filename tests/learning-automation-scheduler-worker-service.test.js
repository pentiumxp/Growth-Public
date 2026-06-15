const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningAutomationSchedulerWorkerService
} = require("../src/services/learning-automation-scheduler-worker-service");

function sampleTarget(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    limit: 3
  }, overrides);
}

function fakeRepository(options = {}) {
  const calls = { claims: [], releases: [] };
  return {
    calls,
    claimLease(input) {
      calls.claims.push(input);
      if (options.claimResult) return options.claimResult(input);
      return {
        ok: true,
        lease: {
          leaseId: options.leaseId || "lgaslease_ready_1",
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          status: "claimed",
          workerId: input.workerId,
          attemptCount: 1,
          privacyClass: "summary_only",
          claimedAt: input.claimedAt,
          leaseUntil: input.leaseUntil
        }
      };
    },
    releaseLease(input) {
      calls.releases.push(input);
      if (options.releaseResult) return options.releaseResult(input);
      return {
        ok: true,
        lease: {
          leaseId: input.leaseId,
          status: input.status,
          reason: input.reason,
          runId: input.runId,
          runStatus: input.runStatus,
          summary: input.summary,
          privacyClass: "summary_only"
        }
      };
    }
  };
}

function fakeSchedulerRunService(resultFactory) {
  const calls = [];
  return {
    calls,
    async runOnce(input) {
      calls.push(input);
      return resultFactory ? resultFactory(input) : {
        ok: true,
        run: {
          runId: "lgasrun_ready_1",
          status: "completed",
          summary: { attemptedExecutions: 1 }
        },
        executions: [{ status: "published", proposalId: "lgauto_ready_1" }]
      };
    }
  };
}

test("automation scheduler worker service stays inert while disabled", async () => {
  const repository = fakeRepository();
  const schedulerRunService = fakeSchedulerRunService();
  const service = createLearningAutomationSchedulerWorkerService({
    repository,
    schedulerRunService,
    allowBackgroundWorker: false,
    now: () => new Date("2026-06-15T14:00:00.000Z")
  });

  const result = await service.tick(sampleTarget());

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_automation_scheduler_worker_disabled");
  assert.equal(repository.calls.claims.length, 0);
  assert.equal(schedulerRunService.calls.length, 0);
});

test("automation scheduler worker service validates dependencies, mode, and privacy", async () => {
  const missingRepository = createLearningAutomationSchedulerWorkerService({
    schedulerRunService: fakeSchedulerRunService(),
    allowBackgroundWorker: true
  });
  assert.equal((await missingRepository.tick(sampleTarget())).error, "learning_automation_scheduler_worker_lease_repository_unavailable");

  const missingRunner = createLearningAutomationSchedulerWorkerService({
    repository: fakeRepository(),
    allowBackgroundWorker: true
  });
  assert.equal((await missingRunner.tick(sampleTarget())).error, "learning_automation_scheduler_worker_run_service_unavailable");

  const service = createLearningAutomationSchedulerWorkerService({
    repository: fakeRepository(),
    schedulerRunService: fakeSchedulerRunService(),
    allowBackgroundWorker: true
  });
  assert.equal((await service.tick(sampleTarget({ workerMode: "background_worker_publish" }))).error, "learning_automation_scheduler_worker_mode_invalid");
  const privacy = await service.tick(sampleTarget({ rawPrompt: "do not store" }));
  assert.equal(privacy.error, "learning_automation_scheduler_worker_privacy_failed");
  assert.equal(privacy.privacyFindings.includes("$.rawPrompt"), true);
});

test("automation scheduler worker service respects active leases without running scheduler", async () => {
  const repository = fakeRepository({
    claimResult: () => ({
      ok: false,
      error: "learning_automation_scheduler_worker_lease_active",
      active: true,
      lease: { leaseId: "lgaslease_active_1", status: "claimed", workerId: "other-worker" }
    })
  });
  const schedulerRunService = fakeSchedulerRunService();
  const service = createLearningAutomationSchedulerWorkerService({
    repository,
    schedulerRunService,
    allowBackgroundWorker: true
  });

  const result = await service.tick(sampleTarget());

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_automation_scheduler_worker_lease_active");
  assert.equal(repository.calls.claims.length, 1);
  assert.equal(repository.calls.releases.length, 0);
  assert.equal(schedulerRunService.calls.length, 0);
});

test("automation scheduler worker service leases one target and delegates only to scheduler run service", async () => {
  const repository = fakeRepository();
  const schedulerRunService = fakeSchedulerRunService();
  const service = createLearningAutomationSchedulerWorkerService({
    repository,
    schedulerRunService,
    allowBackgroundWorker: true,
    workerId: "growth-worker-a",
    leaseMs: 600000,
    now: () => new Date("2026-06-15T14:00:00.000Z")
  });

  const result = await service.tick(sampleTarget());

  assert.equal(result.ok, true);
  assert.equal(result.run.runId, "lgasrun_ready_1");
  assert.equal(repository.calls.claims.length, 1);
  assert.equal(repository.calls.claims[0].workerId, "growth-worker-a");
  assert.equal(repository.calls.claims[0].input.schemaVersion, "growth.learningAutomationSchedulerWorker.input.v1");
  assert.equal(repository.calls.claims[0].input.summaryOnly, true);
  assert.equal(schedulerRunService.calls.length, 1);
  assert.equal(schedulerRunService.calls[0].runMode, "background_supervised_tick");
  assert.equal(schedulerRunService.calls[0].requestedBy, "growth-worker-a");
  assert.equal(schedulerRunService.calls[0].workspaceId, "weixin_fanfan");
  assert.equal(repository.calls.releases.length, 1);
  assert.equal(repository.calls.releases[0].status, "released");
  assert.equal(repository.calls.releases[0].runId, "lgasrun_ready_1");
  assert.equal(repository.calls.releases[0].summary.noDirectGateway, true);
  assert.equal(repository.calls.releases[0].summary.schedulerRunServiceOnly, true);
});

test("automation scheduler worker service releases blocked when scheduler run stays disabled", async () => {
  const repository = fakeRepository();
  const schedulerRunService = fakeSchedulerRunService(() => ({
    ok: false,
    error: "learning_automation_background_scheduler_disabled",
    run: {
      runId: "lgasrun_blocked_1",
      status: "blocked",
      summary: { attemptedExecutions: 0 }
    },
    executions: []
  }));
  const service = createLearningAutomationSchedulerWorkerService({
    repository,
    schedulerRunService,
    allowBackgroundWorker: true
  });

  const result = await service.tick(sampleTarget());

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_automation_background_scheduler_disabled");
  assert.equal(repository.calls.releases[0].status, "blocked");
  assert.equal(repository.calls.releases[0].runStatus, "blocked");
});

test("automation scheduler worker service can tick configured targets", async () => {
  const repository = fakeRepository();
  const schedulerRunService = fakeSchedulerRunService();
  const service = createLearningAutomationSchedulerWorkerService({
    repository,
    schedulerRunService,
    allowBackgroundWorker: true,
    defaultTargets: [
      sampleTarget(),
      sampleTarget({ workspaceId: "weixin_stephen", learnerId: "stephen", subject: "english" })
    ]
  });

  const result = await service.tickTargets({ maxTargets: 2 });

  assert.equal(result.ok, true);
  assert.equal(result.targetCount, 2);
  assert.equal(result.attemptedTargets, 2);
  assert.equal(result.succeeded, 2);
  assert.equal(repository.calls.claims.length, 2);
  assert.equal(schedulerRunService.calls.length, 2);

  const noTargets = createLearningAutomationSchedulerWorkerService({
    repository: fakeRepository(),
    schedulerRunService: fakeSchedulerRunService(),
    allowBackgroundWorker: true
  });
  assert.equal((await noTargets.tickTargets()).error, "learning_automation_scheduler_worker_targets_required");
});

test("automation scheduler worker service prefers reviewed persistent targets before config fallback", async () => {
  const repository = fakeRepository();
  const schedulerRunService = fakeSchedulerRunService();
  const targetCalls = [];
  const service = createLearningAutomationSchedulerWorkerService({
    repository,
    schedulerRunService,
    allowBackgroundWorker: true,
    defaultTargets: [sampleTarget({ workspaceId: "env_fallback", learnerId: "env" })],
    workerTargetService: {
      listRunnableTargets(input) {
        targetCalls.push(input);
        return {
          ok: true,
          targets: [{
            workspaceId: "weixin_fanfan",
            learnerId: "fanfan",
            programId: "program_science",
            domainPackId: "uk_hk_curriculum_foundation",
            domain: "science",
            subject: "science",
            horizon: "daily_plan",
            workerTargetId: "lgastgt_ready_1",
            targetNodeIds: ["kg_science_fair_test"],
            limit: 2
          }]
        };
      }
    }
  });

  const result = await service.tickTargets({ maxTargets: 1 });

  assert.equal(result.ok, true);
  assert.equal(result.targetSource, "reviewed_worker_targets");
  assert.equal(targetCalls.length, 1);
  assert.equal(schedulerRunService.calls.length, 1);
  assert.equal(schedulerRunService.calls[0].workspaceId, "weixin_fanfan");
  assert.equal(schedulerRunService.calls[0].limit, 2);
});
