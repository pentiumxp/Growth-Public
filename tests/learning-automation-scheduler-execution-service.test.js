const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningAutomationSchedulerExecutionService
} = require("../src/services/learning-automation-scheduler-execution-service");

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
      endpoint: "/api/v1/growth/automation/proposals/lgauto_ready_1/publish"
    }],
    privacyClass: "summary_only"
  }, overrides);
}

function reviewedDigest(overrides = {}) {
  return Object.assign({
    digestId: "lgadig_ready_1",
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    status: "reviewed",
    privacyClass: "summary_only"
  }, overrides);
}

function readyPolicy() {
  return {
    ok: true,
    status: "failure_policy_ready",
    readyForWritefulAutomationPrerequisite: true,
    writefulSchedulingAllowed: false,
    summary: { policyId: "lgafpol_active_1" }
  };
}

function wouldPublishDryRun(overrides = {}) {
  return Object.assign({
    ok: true,
    dryRun: true,
    writePlanned: false,
    writesPerformed: false,
    publishPlanned: false,
    candidates: [{
      proposalId: "lgauto_ready_1",
      planDraftId: "lgplan_next_1",
      selectedItemId: "plan_item_next_1",
      decision: "would_publish",
      safeToPublish: true,
      wouldPublish: true
    }]
  }, overrides);
}

function readyActivation(overrides = {}) {
  return Object.assign({
    activationId: "lgact_ready_1",
    activationVersion: "growth.learningAutomationReleaseActivation.v1",
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    collectionRunId: "lgacrn_ready_1",
    status: "ready_for_owner_config_enablement",
    requestedActivationGates: ["writeful_execution"],
    activationGates: [{
      key: "writeful_execution",
      approvalKey: "writefulExecutionApproval",
      currentEnabled: false,
      readyForEnablement: true
    }],
    activationPreflight: {
      schemaVersion: "growth.learningAutomationReleaseActivation.summary.v1",
      summaryOnly: true,
      status: "ready_for_owner_config_enablement",
      preflightPassed: true,
      readyForOwnerRuntimeConfigDecision: true,
      activationAllowed: true,
      configChangeApplied: false,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false
    },
    activationDecision: {
      schemaVersion: "growth.learningAutomationReleaseActivation.decision.v1",
      summaryOnly: true,
      status: "ready_for_owner_config_enablement",
      decision: "approved_for_config_enablement",
      preflightPassed: true,
      readyForOwnerRuntimeConfigDecision: true,
      recordOnly: true,
      advisoryOnly: true,
      configChangeApplied: false,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false
    },
    evidenceSummary: {
      schemaVersion: "growth.learningAutomationReleaseActivation.evidence.v1",
      summaryOnly: true,
      status: "ready_for_owner_config_enablement",
      preflightPassed: true,
      readyForOwnerRuntimeConfigDecision: true,
      requestedActivationGates: ["writeful_execution"],
      configChangeApplied: false,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false
    },
    privacyClass: "summary_only"
  }, overrides);
}

function executeInput(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    handoffId: "lgahand_ready_1",
    collectionRunId: "lgacrn_ready_1",
    proposalId: "lgauto_ready_1",
    planDraftId: "lgplan_next_1",
    selectedItemId: "plan_item_next_1",
    executionId: "lgasexec_route_1",
    executionMode: "owner_explicit_once",
    generationKey: "owner-explicit-scheduler-execution",
    requestedBy: "weixin_owner"
  }, overrides);
}

function createService(options = {}) {
  const records = [];
  const calls = [];
  const service = createLearningAutomationSchedulerExecutionService({
    allowWritefulExecution: options.allowWritefulExecution === true,
    repository: {
      listExecutions(input) {
        calls.push({ type: "listExecutions", input });
        return records.map((record) => record.execution);
      },
      recordExecution(input) {
        calls.push({ type: "recordExecution", input });
        const execution = {
          executionId: input.executionId || "lgasexec_generated_1",
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          programId: input.programId,
          handoffId: input.handoffId,
          digestId: input.digestId,
          policyId: input.policyId,
          proposalId: input.proposalId,
          planDraftId: input.planDraftId,
          selectedItemId: input.selectedItemId,
          mode: input.mode,
          status: input.status,
          reason: input.reason,
          error: input.error,
          gate: input.gate || {},
          action: input.action || {},
          execution: input.execution || {},
          publishResult: input.publishResult || {},
          createdBy: input.createdBy,
          executedBy: input.executedBy,
          privacyClass: input.privacyClass || "summary_only",
          createdAt: input.createdAt || "2026-06-15T12:45:00.000Z",
          updatedAt: input.updatedAt || "2026-06-15T12:45:00.000Z"
        };
        records.push({ input, execution });
        return { ok: true, execution };
      }
    },
    actionHandoffService: {
      getHandoff(input) {
        calls.push({ type: "getHandoff", input });
        if (options.handoffMissing) return { ok: false, error: "learning_automation_action_handoff_not_found" };
        return { ok: true, handoff: deliveredHandoff(options.handoff || {}) };
      }
    },
    digestService: {
      getDigest(input) {
        calls.push({ type: "getDigest", input });
        if (options.digestNotReviewed) return { ok: true, digest: reviewedDigest({ status: "pending" }) };
        return { ok: true, digest: reviewedDigest() };
      }
    },
    failurePolicyService: {
      evaluateReadiness(input) {
        calls.push({ type: "evaluateReadiness", input });
        if (options.policyNotReady) {
          return {
            ok: true,
            readyForWritefulAutomationPrerequisite: false,
            error: "missing_active_failure_policy"
          };
        }
        return readyPolicy();
      }
    },
    schedulerService: {
      dryRun(input) {
        calls.push({ type: "dryRun", input });
        if (options.blockedCandidate) {
          return wouldPublishDryRun({
            candidates: [{
              proposalId: "lgauto_ready_1",
              planDraftId: "lgplan_next_1",
              selectedItemId: "plan_item_next_1",
              decision: "blocked_audit",
              safeToPublish: false,
              wouldPublish: false,
              reason: "source_cycle_not_ready"
            }]
          });
        }
        return wouldPublishDryRun();
      }
    },
    releaseAuthorizationService: {
      authorize(input) {
        calls.push({ type: "authorizeRelease", input });
        if (options.authorizationBlocked) {
          return {
            ok: true,
            schemaVersion: "growth.learningAutomationReleaseAuthorization.v1",
            privacyClass: "summary_only",
            summaryOnly: true,
            status: "blocked",
            authorized: false,
            reason: "learning_automation_release_authorization_approval_missing",
            error: "learning_automation_release_authorization_approval_missing",
            requiredApprovalKeys: ["writefulExecutionApproval"],
            missingApprovalKeys: ["writefulExecutionApproval"],
            writefulSchedulingAllowed: false,
            runtimeConfigChange: false
          };
        }
        return {
          ok: true,
          schemaVersion: "growth.learningAutomationReleaseAuthorization.v1",
          privacyClass: "summary_only",
          summaryOnly: true,
          status: "authorized",
          authorized: true,
          reason: "learning_automation_release_authorization_granted",
          requiredApprovalKeys: ["writefulExecutionApproval"],
          missingApprovalKeys: [],
          writefulSchedulingAllowed: false,
          runtimeConfigChange: false
        };
      }
    },
    releaseActivationService: options.activationServiceMissing ? null : {
      listActivations(input) {
        calls.push({ type: "listActivations", input });
        if (options.activationMissing) {
          return {
            ok: true,
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            count: 0,
            activations: []
          };
        }
        if (options.activationUnavailable) {
          return {
            ok: false,
            error: "learning_automation_release_activation_repository_unavailable"
          };
        }
        if (options.activationInvalid) {
          return {
            ok: true,
            workspaceId: input.workspaceId,
            learnerId: input.learnerId,
            count: 1,
            activations: [readyActivation({
              status: "blocked",
              activationDecision: {
                recordOnly: true,
                advisoryOnly: true,
                preflightPassed: false,
                configChangeApplied: true,
                writefulSchedulingAllowed: false,
                runtimeConfigChange: true
              },
              activationPreflight: {
                preflightPassed: false,
                configChangeApplied: true,
                writefulSchedulingAllowed: false,
                runtimeConfigChange: true
              }
            })]
          };
        }
        return {
          ok: true,
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          count: 1,
          activations: [readyActivation(options.activation || {})]
        };
      }
    },
    automationProposalService: {
      async publishAcceptedProposal(input) {
        calls.push({ type: "publishAcceptedProposal", input });
        if (options.publishFails) {
          return {
            ok: false,
            error: "authoring_failed",
            proposal: { execution: { status: "failed" } }
          };
        }
        return {
          ok: true,
          proposal: {
            proposalId: input.proposalId,
            execution: {
              status: "published",
              generatedTaskCardId: "ltask_generated_1"
            }
          }
        };
      }
    }
  });
  return { calls, records, service };
}

test("scheduler execution is default-disabled and records a blocked audit row", async () => {
  const { calls, records, service } = createService();

  const result = await service.executeOnce(executeInput());

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_automation_scheduler_execution_disabled");
  assert.equal(result.execution.status, "blocked");
  assert.equal(records[0].input.status, "blocked");
  assert.equal(records[0].input.gate.writefulExecutionEnabled, false);
  assert.deepEqual(calls.map((call) => call.type), ["recordExecution"]);
});

test("scheduler execution publishes through accepted-proposal boundary after all gates pass", async () => {
  const { calls, records, service } = createService({ allowWritefulExecution: true });

  const result = await service.executeOnce(executeInput());

  assert.equal(result.ok, true);
  assert.equal(result.execution.status, "published");
  assert.equal(result.execution.execution.generatedTaskCardId, "ltask_generated_1");
  assert.equal(result.execution.action.publishDelegation, "learning-automation-proposal-service.publishAcceptedProposal");
  assert.deepEqual(calls.map((call) => call.type), [
    "getHandoff",
    "getDigest",
    "evaluateReadiness",
    "dryRun",
    "authorizeRelease",
    "listActivations",
    "recordExecution",
    "publishAcceptedProposal",
    "recordExecution"
  ]);
  assert.equal(records[0].input.status, "started");
  assert.equal(records[1].input.status, "published");
  assert.equal(calls.find((call) => call.type === "publishAcceptedProposal").input.proposalId, "lgauto_ready_1");
  assert.equal(calls.find((call) => call.type === "dryRun").input.proposalId, "lgauto_ready_1");
  assert.equal(records[0].input.gate.releaseAuthorization.authorized, true);
  assert.equal(records[0].input.gate.releaseActivation.valid, true);
  assert.equal(records[0].input.gate.releaseActivation.activationId, "lgact_ready_1");
  assert.deepEqual(calls.find((call) => call.type === "listActivations").input.activationGates, ["writeful_execution"]);
});

test("scheduler execution blocks when handoff, digest, policy, or dry-run gates fail", async () => {
  const notDelivered = createService({
    allowWritefulExecution: true,
    handoff: { status: "pending_delivery", deliveryStatus: "not_delivered" }
  });
  const notDeliveredResult = await notDelivered.service.executeOnce(executeInput());
  assert.equal(notDeliveredResult.ok, false);
  assert.equal(notDeliveredResult.error, "learning_automation_scheduler_execution_handoff_not_delivered");
  assert.equal(notDelivered.calls.some((call) => call.type === "publishAcceptedProposal"), false);

  const digestNotReviewed = createService({ allowWritefulExecution: true, digestNotReviewed: true });
  const digestResult = await digestNotReviewed.service.executeOnce(executeInput());
  assert.equal(digestResult.ok, false);
  assert.equal(digestResult.error, "learning_automation_scheduler_execution_digest_not_reviewed");

  const policyNotReady = createService({ allowWritefulExecution: true, policyNotReady: true });
  const policyResult = await policyNotReady.service.executeOnce(executeInput());
  assert.equal(policyResult.ok, false);
  assert.equal(policyResult.error, "missing_active_failure_policy");

  const blockedCandidate = createService({ allowWritefulExecution: true, blockedCandidate: true });
  const candidateResult = await blockedCandidate.service.executeOnce(executeInput());
  assert.equal(candidateResult.ok, false);
  assert.equal(candidateResult.error, "source_cycle_not_ready");
});

test("scheduler execution blocks before publish when release authorization is missing", async () => {
  const { calls, records, service } = createService({ allowWritefulExecution: true, authorizationBlocked: true });

  const result = await service.executeOnce(executeInput());

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_automation_release_authorization_approval_missing");
  assert.equal(result.execution.status, "blocked");
  assert.equal(result.execution.gate.releaseAuthorization.authorized, false);
  assert.deepEqual(result.execution.gate.releaseAuthorization.missingApprovalKeys, ["writefulExecutionApproval"]);
  assert.equal(calls.some((call) => call.type === "publishAcceptedProposal"), false);
  assert.equal(calls.find((call) => call.type === "authorizeRelease").input.workspaceId, "weixin_fanfan");
  assert.equal(calls.some((call) => call.type === "listActivations"), false);
  assert.equal(records.at(-1).input.status, "blocked");
});

test("scheduler execution blocks before publish when activation audit record is unavailable or missing", async () => {
  const unavailable = createService({ allowWritefulExecution: true, activationServiceMissing: true });
  const unavailableResult = await unavailable.service.executeOnce(executeInput());

  assert.equal(unavailableResult.ok, false);
  assert.equal(unavailableResult.error, "learning_automation_scheduler_execution_release_activation_unavailable");
  assert.equal(unavailableResult.execution.status, "blocked");
  assert.equal(unavailableResult.execution.gate.releaseActivation.activationRecordRequired, true);
  assert.equal(unavailableResult.execution.gate.releaseActivation.activationRecordPresent, false);
  assert.equal(unavailable.calls.some((call) => call.type === "publishAcceptedProposal"), false);

  const missing = createService({ allowWritefulExecution: true, activationMissing: true });
  const missingResult = await missing.service.executeOnce(executeInput());

  assert.equal(missingResult.ok, false);
  assert.equal(missingResult.error, "learning_automation_scheduler_execution_release_activation_required");
  assert.equal(missingResult.execution.status, "blocked");
  assert.equal(missingResult.execution.gate.releaseActivation.valid, false);
  assert.equal(missingResult.execution.gate.releaseActivation.activationRecordPresent, false);
  assert.deepEqual(missing.calls.find((call) => call.type === "listActivations").input.activationGates, ["writeful_execution"]);
  assert.equal(missing.calls.some((call) => call.type === "publishAcceptedProposal"), false);
});

test("scheduler execution rejects invalid activation audit records", async () => {
  const { calls, records, service } = createService({ allowWritefulExecution: true, activationInvalid: true });

  const result = await service.executeOnce(executeInput());

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_automation_scheduler_execution_release_activation_invalid");
  assert.equal(result.execution.status, "blocked");
  assert.equal(result.execution.gate.releaseActivation.activationRecordPresent, true);
  assert.equal(result.execution.gate.releaseActivation.valid, false);
  assert.ok(result.execution.gate.releaseActivation.invalidReasons.includes("runtime_config_change_forbidden"));
  assert.equal(calls.some((call) => call.type === "publishAcceptedProposal"), false);
  assert.equal(records.at(-1).input.status, "blocked");
});

test("scheduler execution records publish failure for Owner retry", async () => {
  const { calls, records, service } = createService({ allowWritefulExecution: true, publishFails: true });

  const result = await service.executeOnce(executeInput());

  assert.equal(result.ok, false);
  assert.equal(result.error, "authoring_failed");
  assert.equal(result.execution.status, "failed");
  assert.equal(records.at(-1).input.execution.retryRequiresOwner, true);
  assert.equal(calls.some((call) => call.type === "publishAcceptedProposal"), true);
});

test("scheduler execution lists executions and rejects privacy-risk input", async () => {
  const { service } = createService({ allowWritefulExecution: true });

  const listed = service.listExecutions({ workspaceId: "weixin_fanfan", learnerId: "fanfan" });
  assert.equal(listed.ok, true);

  const privacy = await service.executeOnce(executeInput({ rawAnswer: "private" }));
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_automation_scheduler_execution_privacy_failed");

  const missing = await createLearningAutomationSchedulerExecutionService({}).executeOnce(executeInput());
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "learning_automation_scheduler_execution_repository_unavailable");
});
