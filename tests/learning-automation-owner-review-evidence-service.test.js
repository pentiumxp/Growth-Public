const assert = require("node:assert/strict");
const test = require("node:test");
const {
  OWNER_REVIEW_EVIDENCE_SCHEMA,
  createLearningAutomationOwnerReviewEvidenceService
} = require("../src/services/learning-automation-owner-review-evidence-service");

function createService(overrides = {}, calls = []) {
  return createLearningAutomationOwnerReviewEvidenceService(Object.assign({
    proposalService: {
      listProposals(input) {
        calls.push({ type: "proposals", input });
        return {
          ok: true,
          count: 5,
          proposals: [
            { proposalId: "lgaprop_accepted_1", status: "accepted", execution: { status: "blocked" } },
            { proposalId: "lgaprop_proposed_1", status: "proposed" },
            { proposalId: "lgaprop_skipped_1", status: "skipped", execution: { status: "failed" } },
            { proposalId: "lgaprop_expired_1", status: "expired" },
            { proposalId: "lgaprop_superseded_1", status: "superseded", execution: { status: "published" } }
          ]
        };
      }
    },
    digestService: {
      listDigests(input) {
        calls.push({ type: "digests", input });
        return {
          ok: true,
          count: 2,
          digests: [
            {
              digestId: "lgadig_reviewed_1",
              status: "reviewed",
              requiredActions: [{ proposalId: "lgaprop_accepted_1" }],
              blocked: [{ proposalId: "lgaprop_blocked_1" }]
            },
            { digestId: "lgadig_pending_1", status: "pending" }
          ]
        };
      }
    },
    failurePolicyService: {
      evaluateReadiness(input) {
        calls.push({ type: "failure_policy", input });
        return {
          ok: true,
          status: "ready",
          readyForWritefulAutomationPrerequisite: true,
          summary: { policyId: "lgafpol_active_1" },
          policy: { policyId: "lgafpol_active_1", status: "active" },
          writefulSchedulingAllowed: false
        };
      }
    },
    actionHandoffService: {
      listHandoffs(input) {
        calls.push({ type: "handoffs", input });
        return {
          ok: true,
          count: 2,
          handoffs: [
            {
              handoffId: "lgahand_delivered_1",
              status: "delivered",
              deliveryStatus: "delivered",
              actions: [{ proposalId: "lgaprop_accepted_1" }],
              blocked: []
            },
            {
              handoffId: "lgahand_pending_1",
              status: "pending_delivery",
              deliveryStatus: "not_delivered",
              actions: [],
              blocked: [{ proposalId: "lgaprop_blocked_1" }]
            }
          ]
        };
      }
    },
    schedulerExecutionService: {
      listExecutions(input) {
        calls.push({ type: "executions", input });
        return {
          ok: true,
          count: 3,
          executions: [
            { executionId: "lgaexec_blocked_1", status: "blocked" },
            { executionId: "lgaexec_published_1", status: "published" },
            { executionId: "lgaexec_failed_1", status: "failed" }
          ]
        };
      }
    },
    schedulerRunService: {
      listRuns(input) {
        calls.push({ type: "runs", input });
        return {
          ok: true,
          count: 3,
          runs: [
            { runId: "lgarun_blocked_1", status: "blocked" },
            { runId: "lgarun_completed_1", status: "completed" },
            { runId: "lgarun_skipped_1", status: "skipped" }
          ]
        };
      }
    },
    schedulerWorkerTargetService: {
      listTargets(input) {
        calls.push({ type: "targets", input });
        return {
          ok: true,
          count: 3,
          targets: [
            { targetId: "lgawt_enabled_1", status: "enabled" },
            { targetId: "lgawt_pending_1", status: "pending" },
            { targetId: "lgawt_archived_1", status: "archived" }
          ]
        };
      }
    },
    releaseReadinessService: {
      evaluateReadiness(input) {
        calls.push({ type: "readiness", input });
        return {
          ok: true,
          status: "incomplete",
          readyForReleaseReview: false,
          releaseReview: {
            summaryOnly: true,
            status: "incomplete",
            requiredActionCount: 2,
            missingCheckKeys: ["owner_daily_ui_evidence", "central_visual_evidence"],
            missingEvidenceKeys: ["owner_daily_ui_evidence"],
            persistedEvidenceKeys: ["platformActionEvidence"]
          },
          writefulSchedulingAllowed: false
        };
      }
    }
  }, overrides));
}

test("owner review evidence composes summary-only automation state from existing services", () => {
  const calls = [];
  const service = createService({}, calls);
  const result = service.evaluate({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    limit: 4
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, OWNER_REVIEW_EVIDENCE_SCHEMA);
  assert.equal(result.status, "owner_review_pipeline_ready");
  assert.equal(result.automationOwnerReviewEvidence.summaryOnly, true);
  assert.equal(result.automationOwnerReviewEvidence.proposalCount, 5);
  assert.equal(result.automationOwnerReviewEvidence.proposedProposalCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.acceptedProposalCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.skippedProposalCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.expiredProposalCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.supersededProposalCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.ownerDecisionProposalCount, 4);
  assert.equal(result.automationOwnerReviewEvidence.proposalExecutionCount, 3);
  assert.equal(result.automationOwnerReviewEvidence.publishedProposalExecutionCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.blockedProposalExecutionCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.failedProposalExecutionCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.digestCount, 2);
  assert.equal(result.automationOwnerReviewEvidence.reviewedDigestCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.pendingDigestCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.digestRequiredActionCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.digestBlockedCandidateCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.actionHandoffCount, 2);
  assert.equal(result.automationOwnerReviewEvidence.deliveredHandoffCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.pendingHandoffDeliveryCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.actionHandoffActionCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.blockedActionHandoffCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.schedulerExecutionCount, 3);
  assert.equal(result.automationOwnerReviewEvidence.publishedSchedulerExecutionCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.blockedSchedulerExecutionCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.failedSchedulerExecutionCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.schedulerRunCount, 3);
  assert.equal(result.automationOwnerReviewEvidence.completedSchedulerRunCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.blockedSchedulerRunCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.skippedSchedulerRunCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.reviewedWorkerTargetCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.pendingWorkerTargetReviewCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.disabledWorkerTargetCount, 1);
  assert.equal(result.automationOwnerReviewEvidence.failurePolicyReady, true);
  assert.equal(result.automationOwnerReviewEvidence.failurePolicyStatus, "ready");
  assert.equal(result.automationOwnerReviewEvidence.requiredActionCount, 2);
  assert.equal(result.automationOwnerReviewEvidence.nextAction.key, "owner_daily_ui_evidence");
  assert.deepEqual(result.automationOwnerReviewEvidence.missingGateKeys, []);
  assert.equal(result.releaseReadiness.readyForReleaseReview, false);
  assert.deepEqual(result.releaseReadiness.persistedEvidenceKeys, ["platformActionEvidence"]);
  assert.equal(result.proposals.proposedCount, 1);
  assert.equal(result.proposals.acceptedCount, 1);
  assert.equal(result.proposals.pendingCount, 1);
  assert.equal(result.proposals.skippedCount, 1);
  assert.equal(result.proposals.expiredCount, 1);
  assert.equal(result.proposals.supersededCount, 1);
  assert.equal(result.proposals.executionCount, 3);
  assert.deepEqual(result.proposals.executionStatuses, { blocked: 1, failed: 1, published: 1 });
  assert.equal(result.digests.requiredActionCount, 1);
  assert.equal(result.digests.pendingCount, 1);
  assert.equal(result.actionHandoffs.deliveredCount, 1);
  assert.equal(result.actionHandoffs.pendingDeliveryCount, 1);
  assert.equal(result.schedulerExecutions.publishedCount, 1);
  assert.equal(result.schedulerRuns.completedCount, 1);
  assert.equal(result.workerTargets.pendingReviewCount, 1);
  assert.equal(result.failurePolicy.policyId, "lgafpol_active_1");
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.backgroundSchedulingAllowed, false);
  assert.equal(result.runtimeConfigChange, false);
  assert.deepEqual(calls.map((call) => call.type), [
    "proposals",
    "digests",
    "failure_policy",
    "handoffs",
    "executions",
    "runs",
    "targets",
    "readiness"
  ]);
  assert.equal(calls[0].input.workspaceId, "weixin_fanfan");
  assert.equal(calls[0].input.limit, 4);
});

test("owner review evidence fails closed when a dependency is unavailable", () => {
  const service = createService({ schedulerRunService: null });
  const result = service.evaluate({ workspaceId: "weixin_fanfan" });
  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.error, "learning_automation_owner_review_scheduler_run_service_unavailable");
  assert.equal(result.automationOwnerReviewEvidence.nextAction.requiredActor, "owner");
});

test("owner review evidence rejects privacy-risk input before dependency reads", () => {
  const calls = [];
  const service = createService({}, calls);
  const result = service.evaluate({
    workspaceId: "weixin_fanfan",
    rawPrompt: "do not persist"
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_automation_owner_review_privacy_failed");
  assert.equal(calls.length, 0);
});

test("owner review evidence rejects private values returned by dependencies", () => {
  const service = createService({
    proposalService: {
      listProposals() {
        return {
          ok: true,
          count: 1,
          proposals: [{ proposalId: "lgaprop_leaky_1", status: "accepted", file: "/Users/private/proposal.json" }]
        };
      }
    }
  });
  const result = service.evaluate({ workspaceId: "weixin_fanfan" });
  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_automation_owner_review_dependency_privacy_failed");
  assert.ok(result.privacyFindings.some((finding) => finding.includes("private_value")));
});
