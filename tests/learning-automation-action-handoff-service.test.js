const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningAutomationActionHandoffService
} = require("../src/services/learning-automation-action-handoff-service");

function reviewedDigest(overrides = {}) {
  return Object.assign({
    digestId: "lgadig_ready_1",
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "reviewed",
    summary: {
      inspected: 2,
      wouldPublish: 1,
      blocked: 1,
      skipped: 0,
      dryRun: true,
      writePlanned: false,
      writesPerformed: false,
      publishPlanned: false
    },
    requiredActions: [{
      candidateId: "lgauto_ready:lgplan_next:plan_item_next",
      requiredActor: "owner",
      endpoint: "/api/v1/growth/automation/proposals/lgauto_ready/publish",
      proposalId: "lgauto_ready",
      planDraftId: "lgplan_next",
      selectedItemId: "plan_item_next",
      targetNodeIds: ["kg_science_fair_test"],
      publishRequiresOwnerAction: true
    }],
    blocked: [{
      candidateId: "lgauto_blocked:lgplan_blocked:plan_item_blocked",
      proposalId: "lgauto_blocked",
      decision: "blocked_audit",
      reason: "source_cycle_not_ready",
      completeness: { missingRequired: ["profile_delta_audit"] }
    }]
  }, overrides);
}

function createHarness(options = {}) {
  const savedHandoffs = [];
  const deliveryRecords = [];
  const digestCalls = [];
  const readinessCalls = [];
  const eventCalls = [];
  const service = createLearningAutomationActionHandoffService({
    digestService: {
      getDigest(input) {
        digestCalls.push(input);
        if (options.digestMissing) return { ok: false, error: "learning_automation_digest_not_found" };
        return { ok: true, digest: reviewedDigest(options.digest || {}) };
      }
    },
    failurePolicyService: {
      evaluateReadiness(input) {
        readinessCalls.push(input);
        if (options.policyMissing) {
          return {
            ok: true,
            status: "missing_active_failure_policy",
            readyForWritefulAutomationPrerequisite: false,
            writefulSchedulingAllowed: false,
            missingRequired: ["active_failure_policy"]
          };
        }
        return {
          ok: true,
          status: "failure_policy_ready",
          readyForWritefulAutomationPrerequisite: true,
          writefulSchedulingAllowed: false,
          policy: { policyId: "lgafpol_active_1", status: "active" },
          summary: { policyId: "lgafpol_active_1" }
        };
      }
    },
    repository: {
      saveHandoff(input) {
        const handoff = Object.assign({
          handoffId: "lgahand_route_1",
          deliveryStatus: "not_delivered",
          deliveryAttempts: 0
        }, input);
        savedHandoffs.push(handoff);
        return { ok: true, duplicate: Boolean(options.duplicate), handoff };
      },
      listHandoffs(input) {
        return [{
          handoffId: "lgahand_route_1",
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          status: "pending_delivery"
        }];
      },
      getHandoff(input) {
        if (options.handoffMissing) return null;
        return Object.assign({
          handoffId: input.handoffId,
          workspaceId: input.workspaceId,
          learnerId: "fanfan",
          digestId: "lgadig_ready_1",
          deliveryStatus: options.alreadyDelivered ? "delivered" : "not_delivered",
          actionSummary: { digestId: "lgadig_ready_1" },
          notification: {
            eventType: "growth.automation.action_required",
            summary: "Automation digest requires Owner action."
          }
        }, options.handoff || {});
      },
      recordDelivery(input) {
        deliveryRecords.push(input);
        return {
          ok: true,
          handoff: {
            handoffId: input.handoffId,
            workspaceId: input.workspaceId,
            deliveryStatus: input.deliveryStatus,
            delivery: {
              status: input.deliveryStatus,
              ok: input.deliveryStatus === "delivered",
              error: input.error || ""
            }
          }
        };
      }
    },
    eventService: options.noEventService ? null : {
      async emit(input) {
        eventCalls.push(input);
        if (options.eventRejects) {
          return {
            ok: true,
            delivery: {
              ok: true,
              results: [{ ok: false, error: "home_ai_notification_post_failed", status: 503 }]
            }
          };
        }
        return {
          ok: true,
          delivery: {
            ok: true,
            results: [{ ok: true, status: 202 }]
          }
        };
      }
    }
  });
  return { deliveryRecords, digestCalls, eventCalls, readinessCalls, savedHandoffs, service };
}

function handoffInput(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    digestId: "lgadig_ready_1",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    requestedBy: "weixin_owner"
  }, overrides);
}

test("automation action handoff service creates bounded handoff after reviewed digest and active policy", () => {
  const { digestCalls, readinessCalls, savedHandoffs, service } = createHarness();

  const result = service.createHandoff(handoffInput());

  assert.equal(result.ok, true);
  assert.equal(result.writefulSchedulingAllowed, false);
  assert.equal(result.actionHandoffRequiredBeforeScheduling, true);
  assert.equal(result.handoff.handoffId, "lgahand_route_1");
  assert.equal(savedHandoffs[0].policyId, "lgafpol_active_1");
  assert.equal(savedHandoffs[0].actions[0].endpoint, "/api/v1/growth/automation/proposals/lgauto_ready/publish");
  assert.equal(savedHandoffs[0].blocked[0].decision, "blocked_audit");
  assert.equal(savedHandoffs[0].actionSummary.writePlanned, false);
  assert.equal(savedHandoffs[0].notification.eventType, "growth.automation.action_required");
  assert.deepEqual(digestCalls[0], handoffInput());
  assert.equal(readinessCalls[0].workspaceId, "weixin_fanfan");
  assert.equal(readinessCalls[0].domainPackId, "uk_hk_curriculum_foundation");
});

test("automation action handoff service blocks unreviewed digest and missing policy", () => {
  const unreviewed = createHarness({
    digest: { status: "pending" }
  }).service.createHandoff(handoffInput());
  assert.equal(unreviewed.ok, false);
  assert.equal(unreviewed.error, "learning_automation_action_handoff_digest_not_reviewed");

  const missingPolicy = createHarness({ policyMissing: true }).service.createHandoff(handoffInput());
  assert.equal(missingPolicy.ok, false);
  assert.equal(missingPolicy.error, "learning_automation_action_handoff_policy_not_ready");
  assert.equal(missingPolicy.readiness.writefulSchedulingAllowed, false);
});

test("automation action handoff service delivers through Growth event boundary and records visible failure", async () => {
  const success = createHarness();
  const delivered = await success.service.deliverHandoff({
    workspaceId: "weixin_fanfan",
    handoffId: "lgahand_route_1",
    requestedBy: "weixin_owner"
  });
  assert.equal(delivered.ok, true);
  assert.equal(delivered.deliveryStatus, "delivered");
  assert.equal(success.eventCalls[0].type, "growth.automation.action_required");
  assert.equal(success.eventCalls[0].actionHandoffId, "lgahand_route_1");
  assert.equal(success.deliveryRecords[0].deliveryStatus, "delivered");

  const failure = createHarness({ eventRejects: true });
  const failed = await failure.service.deliverHandoff({
    workspaceId: "weixin_fanfan",
    handoffId: "lgahand_route_1",
    requestedBy: "weixin_owner"
  });
  assert.equal(failed.ok, true);
  assert.equal(failed.deliveryStatus, "delivery_failed");
  assert.equal(failure.deliveryRecords[0].deliveryStatus, "delivery_failed");
  assert.equal(failure.deliveryRecords[0].error, "home_ai_notification_post_failed");
});

test("automation action handoff service lists handoffs and rejects privacy-risk input", () => {
  const { service } = createHarness();

  const list = service.listHandoffs({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    status: "pending_delivery"
  });
  assert.equal(list.ok, true);
  assert.equal(list.count, 1);

  const privacy = service.createHandoff(handoffInput({
    rawPrompt: "private prompt"
  }));
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_automation_action_handoff_privacy_failed");
});

test("automation action handoff service records delivery failure when event service is missing", async () => {
  const { deliveryRecords, service } = createHarness({ noEventService: true });

  const result = await service.deliverHandoff({
    workspaceId: "weixin_fanfan",
    handoffId: "lgahand_route_1",
    requestedBy: "weixin_owner"
  });

  assert.equal(result.ok, true);
  assert.equal(result.deliveryStatus, "delivery_failed");
  assert.equal(deliveryRecords[0].deliveryStatus, "delivery_failed");
  assert.equal(deliveryRecords[0].error, "growth_event_service_unavailable");
});
