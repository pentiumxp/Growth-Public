const assert = require("node:assert/strict");
const test = require("node:test");

const { createLearningAutomationFailurePolicyService } = require("../src/services/learning-automation-failure-policy-service");

function policyInput(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    requestedBy: "weixin_owner"
  }, overrides);
}

function activePolicy(overrides = {}) {
  return Object.assign({
    policyId: "lgafpol_route_1",
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "active",
    policy: {
      summaryOnly: true,
      ownerReviewRequired: true,
      writefulSchedulingAllowed: false
    },
    rollbackPolicy: {
      summaryOnly: true,
      transactionalPublishRequired: true,
      partialPublishBehavior: "service_transaction_rollback",
      actionHandoffFailure: "no_learning_write_visible_owner_retry",
      retryRequiresOwner: true,
      maxAutomaticRetries: 0
    },
    failurePolicy: {
      summaryOnly: true,
      visibleFailureRequired: true,
      retryRequiresOwner: true,
      maxAutomaticRetries: 0,
      writefulSchedulingAllowed: false
    }
  }, overrides);
}

function createService(options = {}) {
  const saveCalls = [];
  const listCalls = [];
  const reviewCalls = [];
  const service = createLearningAutomationFailurePolicyService({
    repository: {
      savePolicy(input) {
        saveCalls.push(input);
        if (options.saveFails) return { ok: false, error: "policy_save_failed" };
        return {
          ok: true,
          duplicate: Boolean(options.duplicate),
          policy: Object.assign({ policyId: "lgafpol_route_1" }, input)
        };
      },
      listPolicies(input) {
        listCalls.push(input);
        return options.activePolicy ? [activePolicy(options.activePolicy)] : [];
      },
      reviewPolicy(input) {
        reviewCalls.push(input);
        if (options.reviewFails) return { ok: false, error: "policy_review_failed" };
        return {
          ok: true,
          duplicate: Boolean(options.reviewDuplicate),
          policy: activePolicy({ policyId: input.policyId, status: input.status })
        };
      }
    }
  });
  return { listCalls, reviewCalls, saveCalls, service };
}

test("automation failure policy service creates summary-only draft policy without enabling scheduling", () => {
  const { saveCalls, service } = createService();

  const result = service.createPolicy(policyInput({
    policy: { writefulSchedulingAllowed: true },
    rollbackPolicy: { maxAutomaticRetries: 3 },
    failurePolicy: { writefulSchedulingAllowed: true, maxAutomaticRetries: 2 }
  }));

  assert.equal(result.ok, true);
  assert.equal(result.policy.policyId, "lgafpol_route_1");
  assert.equal(result.policy.status, "draft");
  assert.equal(result.readiness.readyForWritefulAutomationPrerequisite, false);
  assert.equal(result.readiness.writefulSchedulingAllowed, false);
  assert.deepEqual(result.readiness.missingRequired, ["active_failure_policy"]);
  assert.equal(saveCalls.length, 1);
  assert.equal(saveCalls[0].privacyClass, "summary_only");
  assert.equal(saveCalls[0].policy.summaryOnly, true);
  assert.equal(saveCalls[0].policy.writefulSchedulingAllowed, false);
  assert.equal(saveCalls[0].rollbackPolicy.maxAutomaticRetries, 0);
  assert.equal(saveCalls[0].failurePolicy.maxAutomaticRetries, 0);
  assert.equal(saveCalls[0].failurePolicy.writefulSchedulingAllowed, false);
});

test("automation failure policy service evaluates active policy as a prerequisite only", () => {
  const { listCalls, reviewCalls, service } = createService({
    activePolicy: { policyId: "lgafpol_active_1" }
  });

  const readiness = service.evaluateReadiness(policyInput());

  assert.equal(readiness.ok, true);
  assert.equal(readiness.status, "failure_policy_ready");
  assert.equal(readiness.readyForWritefulAutomationPrerequisite, true);
  assert.equal(readiness.writefulSchedulingAllowed, false);
  assert.equal(readiness.policy.policyId, "lgafpol_active_1");
  assert.equal(readiness.summary.visibleFailureRequired, true);
  assert.equal(readiness.summary.retryRequiresOwner, true);
  assert.equal(listCalls[0].status, "active");
  assert.equal(listCalls[0].limit, 1);

  const reviewed = service.reviewPolicy({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    policyId: "lgafpol_active_1",
    status: "active",
    reviewedBy: "weixin_owner"
  });
  assert.equal(reviewed.ok, true);
  assert.equal(reviewed.policy.status, "active");
  assert.equal(reviewed.readiness.readyForWritefulAutomationPrerequisite, true);
  assert.equal(reviewed.readiness.writefulSchedulingAllowed, false);
  assert.equal(reviewCalls[0].policyId, "lgafpol_active_1");
});

test("automation failure policy service fails closed without an active policy", () => {
  const { service } = createService();

  const readiness = service.evaluateReadiness(policyInput());

  assert.equal(readiness.ok, true);
  assert.equal(readiness.status, "missing_active_failure_policy");
  assert.equal(readiness.readyForWritefulAutomationPrerequisite, false);
  assert.equal(readiness.writefulSchedulingAllowed, false);
  assert.deepEqual(readiness.missingRequired, ["active_failure_policy"]);
  assert.equal(readiness.requiredActions[0].endpoint, "/api/v1/growth/automation/failure-policies");
  assert.equal(readiness.policy, null);
});

test("automation failure policy service lists policies and rejects privacy-risk inputs", () => {
  const { listCalls, service } = createService({
    activePolicy: { policyId: "lgafpol_active_1" }
  });

  const listed = service.listPolicies({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    status: "active",
    limit: 5
  });
  assert.equal(listed.ok, true);
  assert.equal(listed.count, 1);
  assert.equal(listed.policies[0].policyId, "lgafpol_active_1");
  assert.equal(listCalls[0].workspaceId, "weixin_fanfan");

  const privacyCreate = service.createPolicy(policyInput({ rawPrompt: "DO_NOT_STORE" }));
  assert.equal(privacyCreate.ok, false);
  assert.equal(privacyCreate.error, "learning_automation_failure_policy_privacy_failed");

  const privacyReview = service.reviewPolicy({
    workspaceId: "weixin_fanfan",
    policyId: "lgafpol_active_1",
    status: "active",
    rawModelOutput: "DO_NOT_STORE"
  });
  assert.equal(privacyReview.ok, false);
  assert.equal(privacyReview.error, "learning_automation_failure_policy_privacy_failed");
});

test("automation failure policy service reports missing repository", () => {
  const service = createLearningAutomationFailurePolicyService({});

  assert.equal(service.createPolicy(policyInput()).error, "learning_automation_failure_policy_repository_unavailable");
  assert.equal(service.listPolicies(policyInput()).error, "learning_automation_failure_policy_repository_unavailable");
  assert.equal(service.reviewPolicy({
    workspaceId: "weixin_fanfan",
    policyId: "lgafpol_missing",
    status: "active"
  }).error, "learning_automation_failure_policy_repository_unavailable");
  assert.equal(service.evaluateReadiness(policyInput()).error, "learning_automation_failure_policy_repository_unavailable");
});
