const assert = require("node:assert/strict");
const test = require("node:test");

const { createLearningAutomationSchedulerService } = require("../src/services/learning-automation-scheduler-service");

function acceptedProposal(overrides = {}) {
  return Object.assign({
    proposalId: "lgauto_ready_1",
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    status: "accepted",
    planDraftId: "lgplan_next_science",
    selectedItemId: "plan_item_next_1",
    proposalSummary: "Next low-pressure science repair card.",
    targetNodeIds: ["kg_science_fair_test"],
    sourceCycle: {
      planDraftId: "lgplan_previous",
      taskCardId: "ltask_previous",
      evaluationId: "lgeval_previous",
      profileDeltaId: "lgpdelta_previous",
      evidenceId: "lgevd_previous",
      targetNodeIds: ["kg_science_previous"]
    },
    rationale: {
      targetProvisioning: {
        selectedDomainPackId: "uk_hk_curriculum_foundation",
        selectedDomain: "science",
        selectedSubject: "science"
      },
      plan: {
        reason: "Previous evidence supports one fair-test repair card."
      }
    },
    execution: {},
    privacyClass: "summary_only"
  }, overrides);
}

function readyCompleteness() {
  return {
    ok: true,
    complete: true,
    readyForAutomation: true,
    summary: { missingRequired: [] }
  };
}

function createService(options = {}) {
  const listCalls = [];
  const auditCalls = [];
  const provisioningCalls = [];
  const service = createLearningAutomationSchedulerService({
    automationProposalService: {
      listProposals(input) {
        listCalls.push(input);
        if (options.listFails) return { ok: false, error: "proposal_list_failed" };
        return {
          ok: true,
          proposals: options.proposals || [acceptedProposal()]
        };
      }
    },
    auditCompletenessService: {
      evaluateCycleCompleteness(input) {
        auditCalls.push(input);
        if (options.incompleteAudit) {
          return {
            ok: true,
            complete: false,
            readyForAutomation: false,
            summary: { missingRequired: ["profile_delta_audit"] }
          };
        }
        return readyCompleteness();
      }
    },
    targetProvisioningService: {
      resolveSelection(input) {
        provisioningCalls.push(input);
        if (options.unprovisioned) {
          return { ok: false, targetEnabled: false, error: "learning_target_not_provisioned" };
        }
        return {
          ok: true,
          targetEnabled: true,
          mode: "explicit_provision",
          selectedDomainPackId: input.domainPackId,
          selectedDomain: input.domain,
          selectedSubject: input.subject,
          selectedTargetNodeIds: input.targetNodeIds
        };
      }
    }
  });
  return { auditCalls, listCalls, provisioningCalls, service };
}

function dryRunInput(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    limit: 5,
    requestedBy: "weixin_owner"
  }, overrides);
}

test("automation scheduler dry-run returns would-publish candidates without writing or publishing", () => {
  const { auditCalls, listCalls, provisioningCalls, service } = createService();

  const result = service.dryRun(dryRunInput());

  assert.equal(result.ok, true);
  assert.equal(result.dryRun, true);
  assert.equal(result.writePlanned, false);
  assert.equal(result.writesPerformed, false);
  assert.equal(result.publishPlanned, false);
  assert.equal(result.summary.wouldPublish, 1);
  assert.equal(result.summary.blocked, 0);
  assert.equal(result.candidates[0].decision, "would_publish");
  assert.equal(result.candidates[0].safeToPublish, true);
  assert.equal(result.candidates[0].wouldPublish, true);
  assert.equal(result.candidates[0].publishAction.endpoint, "/api/v1/growth/automation/proposals/lgauto_ready_1/publish");
  assert.deepEqual(listCalls[0], {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    status: "accepted",
    proposalId: undefined,
    planDraftId: undefined,
    limit: 5
  });
  assert.equal(auditCalls.length, 1);
  assert.equal(auditCalls[0].planDraftId, "lgplan_previous");
  assert.equal(auditCalls[0].taskCardId, "ltask_previous");
  assert.equal(provisioningCalls.length, 1);
  assert.equal(provisioningCalls[0].domainPackId, "uk_hk_curriculum_foundation");
  assert.equal(provisioningCalls[0].subject, "science");
});

test("automation scheduler dry-run skips already published proposals without rechecking downstream services", () => {
  const { auditCalls, provisioningCalls, service } = createService({
    proposals: [acceptedProposal({
      execution: { status: "published", generatedTaskCardId: "ltask_generated_1" }
    })]
  });

  const result = service.dryRun(dryRunInput());

  assert.equal(result.ok, true);
  assert.equal(result.summary.skipped, 1);
  assert.equal(result.candidates[0].decision, "skipped_already_published");
  assert.equal(result.candidates[0].wouldPublish, false);
  assert.equal(auditCalls.length, 0);
  assert.equal(provisioningCalls.length, 0);
});

test("automation scheduler dry-run blocks incomplete source-cycle audit before provisioning", () => {
  const { auditCalls, provisioningCalls, service } = createService({ incompleteAudit: true });

  const result = service.dryRun(dryRunInput());

  assert.equal(result.ok, true);
  assert.equal(result.summary.blocked, 1);
  assert.equal(result.candidates[0].decision, "blocked_audit");
  assert.equal(result.candidates[0].completeness.readyForAutomation, false);
  assert.equal(auditCalls.length, 1);
  assert.equal(provisioningCalls.length, 0);
});

test("automation scheduler dry-run blocks unprovisioned targets", () => {
  const { service } = createService({ unprovisioned: true });

  const result = service.dryRun(dryRunInput());

  assert.equal(result.ok, true);
  assert.equal(result.summary.blocked, 1);
  assert.equal(result.candidates[0].decision, "blocked_provisioning");
  assert.equal(result.candidates[0].targetProvisioning.error, "learning_target_not_provisioned");
});

test("automation scheduler dry-run rejects privacy-risk input and missing dependencies", () => {
  const { service } = createService();

  const privacy = service.dryRun(dryRunInput({ rawPrompt: "do not store" }));
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_automation_scheduler_privacy_failed");

  const missing = createLearningAutomationSchedulerService({}).dryRun(dryRunInput());
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "learning_automation_scheduler_proposal_service_unavailable");
});
