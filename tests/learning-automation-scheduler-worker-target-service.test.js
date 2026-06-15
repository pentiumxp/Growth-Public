const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningAutomationSchedulerWorkerTargetService
} = require("../src/services/learning-automation-scheduler-worker-target-service");

function provisionService(resultFactory) {
  const calls = [];
  return {
    calls,
    resolveSelection(input) {
      calls.push(input);
      return resultFactory ? resultFactory(input) : {
        ok: true,
        targetEnabled: true,
        mode: "explicit_provision",
        selectedDomainPackId: input.domainPackId || "uk_hk_curriculum_foundation",
        selectedDomain: input.domain || "science",
        selectedSubject: input.subject || "science",
        targetNodeIds: input.targetNodeIds || ["kg_science_fair_test"]
      };
    }
  };
}

function repository() {
  const calls = { saved: [], reviewed: [], listed: [] };
  const records = new Map();
  return {
    calls,
    saveTarget(input) {
      calls.saved.push(input);
      const targetId = input.targetId || "lgastgt_ready_1";
      const target = Object.assign({
        targetId,
        workspaceId: input.workspaceId,
        learnerId: input.learnerId,
        programId: input.programId,
        domainPackId: input.domainPackId,
        domain: input.domain,
        subject: input.subject,
        horizon: input.horizon,
        status: input.status,
        target: input.target,
        policy: input.policy,
        readiness: input.readiness,
        privacyClass: "summary_only"
      });
      records.set(targetId, target);
      return { ok: true, duplicate: false, target };
    },
    getTarget(input) {
      return records.get(input.targetId) || null;
    },
    listTargets(input) {
      calls.listed.push(input);
      return Array.from(records.values())
        .filter((record) => !input.workspaceId || record.workspaceId === input.workspaceId)
        .filter((record) => !input.status || record.status === input.status);
    },
    reviewTarget(input) {
      calls.reviewed.push(input);
      const target = records.get(input.targetId);
      if (!target) return { ok: false, error: "learning_automation_scheduler_worker_target_not_found" };
      target.status = input.status;
      target.readiness = input.readiness;
      target.review = {
        status: input.status,
        reviewedBy: input.reviewedBy,
        reviewedAt: input.reviewedAt,
        productionSchedulingAllowed: false
      };
      return { ok: true, duplicate: false, target };
    }
  };
}

function sampleInput(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    targetNodeIds: ["kg_science_fair_test"],
    requestedBy: "weixin_owner"
  }, overrides);
}

test("automation scheduler worker target service creates proposed target after provisioning check", () => {
  const repo = repository();
  const provisioning = provisionService();
  const service = createLearningAutomationSchedulerWorkerTargetService({
    repository: repo,
    targetProvisioningService: provisioning
  });

  const result = service.createTarget(sampleInput({ limit: 3 }));

  assert.equal(result.ok, true);
  assert.equal(result.workerTargetRequiresOwnerReview, true);
  assert.equal(result.productionSchedulingAllowed, false);
  assert.equal(result.target.status, "proposed");
  assert.equal(repo.calls.saved[0].policy.maxActionsPerTick, 3);
  assert.equal(repo.calls.saved[0].readiness.targetProvisioningReady, true);
  assert.equal(provisioning.calls.length, 1);
});

test("automation scheduler worker target service fails closed for unprovisioned or privacy-risk targets", () => {
  const unprovisioned = createLearningAutomationSchedulerWorkerTargetService({
    repository: repository(),
    targetProvisioningService: provisionService(() => ({
      ok: false,
      error: "learning_target_not_provisioned",
      targetEnabled: false
    }))
  });
  assert.equal(unprovisioned.createTarget(sampleInput()).error, "learning_target_not_provisioned");

  const privacy = createLearningAutomationSchedulerWorkerTargetService({
    repository: repository(),
    targetProvisioningService: provisionService()
  }).createTarget(sampleInput({ rawPrompt: "do not store" }));
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_automation_scheduler_worker_target_privacy_failed");
  assert.equal(privacy.privacyFindings.includes("$.rawPrompt"), true);
});

test("automation scheduler worker target service reviews enabled target and lists runnable targets", () => {
  const repo = repository();
  const provisioning = provisionService();
  const service = createLearningAutomationSchedulerWorkerTargetService({
    repository: repo,
    targetProvisioningService: provisioning
  });

  const created = service.createTarget(sampleInput());
  const reviewed = service.reviewTarget({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    targetId: created.target.targetId,
    status: "enabled",
    reviewedBy: "weixin_owner",
    reviewedAt: "2026-06-15T15:02:00.000Z"
  });

  assert.equal(reviewed.ok, true);
  assert.equal(reviewed.target.status, "enabled");
  assert.equal(reviewed.target.review.productionSchedulingAllowed, false);
  assert.equal(provisioning.calls.length, 2);

  const runnable = service.listRunnableTargets({
    workspaceId: "weixin_fanfan"
  });
  assert.equal(runnable.ok, true);
  assert.equal(runnable.targets.length, 1);
  assert.equal(runnable.targets[0].workerTargetId, created.target.targetId);
  assert.equal(runnable.targets[0].domainPackId, "uk_hk_curriculum_foundation");
  assert.equal(runnable.targets[0].limit, 5);
});

test("automation scheduler worker target service rejects missing dependencies and invalid review", () => {
  const missingRepository = createLearningAutomationSchedulerWorkerTargetService({
    targetProvisioningService: provisionService()
  });
  assert.equal(missingRepository.createTarget(sampleInput()).error, "learning_automation_scheduler_worker_target_repository_unavailable");

  const repo = repository();
  const service = createLearningAutomationSchedulerWorkerTargetService({
    repository: repo,
    targetProvisioningService: provisionService()
  });
  const missing = service.reviewTarget({
    workspaceId: "weixin_fanfan",
    targetId: "missing",
    status: "enabled"
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "learning_automation_scheduler_worker_target_not_found");
});
