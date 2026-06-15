const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningAutomationSchedulerRunService
} = require("../src/services/learning-automation-scheduler-run-service");

function deliveredHandoff(overrides = {}) {
  return Object.assign({
    handoffId: "lgahand_ready_1",
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    digestId: "lgadig_ready_1",
    policyId: "lgafpol_active_1",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "delivered",
    deliveryStatus: "delivered",
    actions: [{
      proposalId: "lgauto_ready_1",
      planDraftId: "lgplan_next_1",
      selectedItemId: "plan_item_next_1",
      actionType: "publish_accepted_proposal",
      endpoint: "/api/v1/growth/automation/proposals/lgauto_ready_1/publish"
    }],
    privacyClass: "summary_only"
  }, overrides);
}

function runInput(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    runId: "lgasrun_route_1",
    runMode: "background_supervised_tick",
    generationKey: "background-supervised-tick",
    cardSchemaVersion: "growth.card.v1",
    limit: 5,
    requestedBy: "weixin_owner",
    createdAt: "2026-06-15T13:45:00.000Z"
  }, overrides);
}

function createService(options = {}) {
  const calls = [];
  const records = [];
  const service = createLearningAutomationSchedulerRunService({
    allowBackgroundScheduler: options.allowBackgroundScheduler === true,
    repository: options.repository || {
      listRuns(input) {
        calls.push({ type: "listRuns", input });
        return options.runs || [{
          runId: "lgasrun_existing_1",
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          status: "blocked"
        }];
      },
      recordRun(input) {
        calls.push({ type: "recordRun", input });
        const run = {
          runId: input.runId || "lgasrun_generated_1",
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          programId: input.programId,
          domainPackId: input.domainPackId,
          domain: input.domain,
          subject: input.subject,
          horizon: input.horizon,
          mode: input.mode,
          status: input.status,
          reason: input.reason,
          error: input.error,
          input: input.input || {},
          candidates: input.candidates || [],
          executions: input.executions || [],
          summary: input.summary || {},
          createdBy: input.createdBy,
          executedBy: input.executedBy,
          privacyClass: input.privacyClass || "summary_only",
          createdAt: input.createdAt || "2026-06-15T13:45:00.000Z",
          updatedAt: input.updatedAt || "2026-06-15T13:45:00.000Z"
        };
        records.push({ input, run });
        return { ok: true, run };
      }
    },
    actionHandoffService: options.actionHandoffService || {
      listHandoffs(input) {
        calls.push({ type: "listHandoffs", input });
        if (options.handoffListFails) return { ok: false, error: "handoff_list_failed" };
        return { ok: true, handoffs: options.handoffs || [deliveredHandoff()] };
      }
    },
    schedulerExecutionService: options.schedulerExecutionService || {
      async executeOnce(input) {
        calls.push({ type: "executeOnce", input });
        const result = (options.executionResults || []).shift();
        if (result) return result;
        return {
          ok: true,
          execution: {
            executionId: "lgasexec_generated_1",
            status: "published",
            execution: { generatedTaskCardId: "ltask_generated_1" }
          },
          publishResult: {
            ok: true,
            proposal: { execution: { generatedTaskCardId: "ltask_generated_1" } }
          }
        };
      }
    }
  });
  return { calls, records, service };
}

test("automation scheduler run list delegates to repository with bounded target scope", () => {
  const { calls, service } = createService();

  const result = service.listRuns({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    status: "blocked"
  });

  assert.equal(result.ok, true);
  assert.equal(result.count, 1);
  assert.deepEqual(calls[0], {
    type: "listRuns",
    input: {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      status: "blocked"
    }
  });
});

test("automation scheduler run is default-disabled and does not inspect handoffs or execute actions", async () => {
  const { calls, records, service } = createService();

  const result = await service.runOnce(runInput());

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_automation_background_scheduler_disabled");
  assert.equal(result.run.status, "blocked");
  assert.equal(records[0].input.summary.backgroundSchedulerEnabled, false);
  assert.deepEqual(calls.map((call) => call.type), ["recordRun"]);
});

test("automation scheduler run rejects invalid mode and privacy-risk input fail-closed", async () => {
  const invalidMode = createService({ allowBackgroundScheduler: true });
  const invalid = await invalidMode.service.runOnce(runInput({ runMode: "background_worker" }));
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error, "learning_automation_scheduler_run_mode_invalid");
  assert.equal(invalid.run.status, "blocked");
  assert.deepEqual(invalidMode.calls.map((call) => call.type), ["recordRun"]);

  const privacyService = createService({ allowBackgroundScheduler: true });
  const privacy = await privacyService.service.runOnce(runInput({ rawPrompt: "do not store" }));
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_automation_scheduler_run_privacy_failed");
  assert.equal(privacy.privacyFindings.includes("$.rawPrompt"), true);
  assert.deepEqual(privacyService.calls, []);
});

test("automation scheduler run records skipped state when there are no delivered actions", async () => {
  const { calls, records, service } = createService({
    allowBackgroundScheduler: true,
    handoffs: [deliveredHandoff({ actions: [] })]
  });

  const result = await service.runOnce(runInput());

  assert.equal(result.ok, true);
  assert.equal(result.run.status, "skipped");
  assert.equal(result.run.runId, "lgasrun_route_1");
  assert.equal(records[0].run.runId, records[1].run.runId);
  assert.deepEqual(calls.map((call) => call.type), ["recordRun", "listHandoffs", "recordRun"]);
  assert.equal(calls[1].input.status, "delivered");
  assert.equal(calls[1].input.deliveryStatus, "delivered");
});

test("automation scheduler run delegates delivered actions only to scheduler execution service", async () => {
  const { calls, records, service } = createService({ allowBackgroundScheduler: true });

  const result = await service.runOnce(runInput());

  assert.equal(result.ok, true);
  assert.equal(result.run.status, "completed");
  assert.equal(result.run.summary.executionDelegation, "learning-automation-scheduler-execution-service.executeOnce");
  assert.equal(result.executions[0].status, "published");
  assert.deepEqual(calls.map((call) => call.type), ["recordRun", "listHandoffs", "executeOnce", "recordRun"]);
  assert.equal(records[0].run.runId, records[1].run.runId);
  assert.equal(records[0].run.createdAt, records[1].run.createdAt);
  assert.equal(calls[2].input.executionMode, "owner_explicit_once");
  assert.equal(calls[2].input.handoffId, "lgahand_ready_1");
  assert.equal(calls[2].input.proposalId, "lgauto_ready_1");
  assert.equal(calls[2].input.generationKey, "background-supervised-tick");
});

test("automation scheduler run records partial state when downstream executions are mixed", async () => {
  const { service } = createService({
    allowBackgroundScheduler: true,
    handoffs: [deliveredHandoff({
      actions: [{
        proposalId: "lgauto_ready_1",
        planDraftId: "lgplan_next_1",
        selectedItemId: "plan_item_next_1"
      }, {
        proposalId: "lgauto_blocked_1",
        planDraftId: "lgplan_blocked_1",
        selectedItemId: "plan_item_blocked_1"
      }]
    })],
    executionResults: [{
      ok: true,
      execution: {
        executionId: "lgasexec_published_1",
        status: "published",
        execution: { generatedTaskCardId: "ltask_generated_1" }
      }
    }, {
      ok: false,
      error: "learning_automation_scheduler_execution_dry_run_candidate_missing",
      execution: {
        executionId: "lgasexec_blocked_1",
        status: "blocked"
      }
    }]
  });

  const result = await service.runOnce(runInput());

  assert.equal(result.ok, true);
  assert.equal(result.run.status, "partial");
  assert.equal(result.error, "background_scheduler_run_partial");
  assert.equal(result.run.summary.published, 1);
  assert.equal(result.run.summary.blocked, 1);
  assert.equal(result.executions[1].proposalId, "lgauto_blocked_1");
});

test("automation scheduler run reports missing dependencies without writing unsafe state", async () => {
  const missingRepository = createLearningAutomationSchedulerRunService({});
  const repositoryResult = await missingRepository.runOnce(runInput());
  assert.equal(repositoryResult.ok, false);
  assert.equal(repositoryResult.error, "learning_automation_scheduler_run_repository_unavailable");

  const missingHandoff = createService({
    allowBackgroundScheduler: true,
    actionHandoffService: {}
  });
  const handoffResult = await missingHandoff.service.runOnce(runInput());
  assert.equal(handoffResult.ok, false);
  assert.equal(handoffResult.error, "learning_automation_scheduler_run_handoff_service_unavailable");
  assert.deepEqual(missingHandoff.calls, []);
});
