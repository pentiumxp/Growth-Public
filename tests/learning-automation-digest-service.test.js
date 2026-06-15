const assert = require("node:assert/strict");
const test = require("node:test");

const { createLearningAutomationDigestService } = require("../src/services/learning-automation-digest-service");

function readyCandidate(overrides = {}) {
  return Object.assign({
    proposalId: "lgauto_ready_1",
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    decision: "would_publish",
    reason: "accepted_proposal_ready_for_explicit_publish",
    safeToPublish: true,
    wouldPublish: true,
    planDraftId: "lgplan_next",
    selectedItemId: "plan_item_next",
    targetNodeIds: ["kg_science_fair_test"],
    completeness: {
      complete: true,
      readyForAutomation: true,
      missingRequired: []
    },
    targetProvisioning: {
      mode: "explicit_provision",
      selectedDomainPackId: "uk_hk_curriculum_foundation",
      selectedDomain: "science",
      selectedSubject: "science",
      selectedTargetNodeIds: ["kg_science_fair_test"]
    },
    publishAction: {
      requiredActor: "owner",
      endpoint: "/api/v1/growth/automation/proposals/lgauto_ready_1/publish",
      proposalId: "lgauto_ready_1",
      planDraftId: "lgplan_next",
      selectedItemId: "plan_item_next",
      targetNodeIds: ["kg_science_fair_test"]
    }
  }, overrides);
}

function blockedCandidate() {
  return {
    proposalId: "lgauto_blocked_1",
    decision: "blocked_audit",
    reason: "source_cycle_not_ready",
    safeToPublish: false,
    wouldPublish: false,
    planDraftId: "lgplan_blocked",
    selectedItemId: "plan_item_blocked",
    targetNodeIds: ["kg_science_old"],
    completeness: {
      complete: false,
      readyForAutomation: false,
      missingRequired: ["profile_delta_audit"]
    }
  };
}

function createService(options = {}) {
  const dryRunCalls = [];
  const saveCalls = [];
  const reviewCalls = [];
  const listCalls = [];
  const getCalls = [];
  const service = createLearningAutomationDigestService({
    schedulerService: {
      dryRun(input) {
        dryRunCalls.push(input);
        if (options.dryRunFails) return { ok: false, error: "scheduler_failed" };
        return Object.assign({
          ok: true,
          source: "growth-learning-automation-scheduler-service",
          dryRun: true,
          writePlanned: false,
          writesPerformed: false,
          publishPlanned: false,
          workspaceId: input.workspaceId,
          learnerId: input.learnerId,
          programId: input.programId,
          count: 2,
          candidates: [readyCandidate(), blockedCandidate()]
        }, options.dryRunResult || {});
      }
    },
    repository: {
      saveDigest(input) {
        saveCalls.push(input);
        if (options.saveFails) return { ok: false, error: "digest_save_failed" };
        return {
          ok: true,
          duplicate: Boolean(options.duplicate),
          digest: Object.assign({ digestId: "lgadig_route_1" }, input)
        };
      },
      listDigests(input) {
        listCalls.push(input);
        return [{ digestId: "lgadig_route_1", workspaceId: input.workspaceId }];
      },
      getDigest(input) {
        getCalls.push(input);
        if (options.getMissing) return null;
        return {
          digestId: input.digestId,
          workspaceId: input.workspaceId,
          status: "reviewed"
        };
      },
      reviewDigest(input) {
        reviewCalls.push(input);
        if (options.reviewFails) return { ok: false, error: "review_failed" };
        return {
          ok: true,
          duplicate: Boolean(options.reviewDuplicate),
          digest: { digestId: input.digestId, workspaceId: input.workspaceId, status: input.status }
        };
      }
    }
  });
  return { dryRunCalls, getCalls, listCalls, reviewCalls, saveCalls, service };
}

function digestInput(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    limit: 5,
    requestedBy: "weixin_owner"
  }, overrides);
}

test("automation digest service persists summary-only digest from scheduler dry-run", () => {
  const { dryRunCalls, saveCalls, service } = createService();

  const result = service.createDigest(digestInput());

  assert.equal(result.ok, true);
  assert.equal(result.dryRun, true);
  assert.equal(result.writePlanned, false);
  assert.equal(result.writesPerformed, false);
  assert.equal(result.publishPlanned, false);
  assert.equal(result.publishRequiresOwnerAction, true);
  assert.equal(result.digest.digestId, "lgadig_route_1");
  assert.equal(saveCalls.length, 1);
  assert.equal(saveCalls[0].summary.wouldPublish, 1);
  assert.equal(saveCalls[0].summary.blocked, 1);
  assert.equal(saveCalls[0].summary.writePlanned, false);
  assert.equal(saveCalls[0].candidates[0].dryRun, true);
  assert.equal(saveCalls[0].candidates[0].publishRequiresOwnerAction, true);
  assert.equal(saveCalls[0].blocked[0].decision, "blocked_audit");
  assert.equal(saveCalls[0].requiredActions[0].endpoint, "/api/v1/growth/automation/proposals/lgauto_ready_1/publish");
  assert.equal(saveCalls[0].sourcePolicy.summaryOnly, true);
  assert.equal(saveCalls[0].sourcePolicy.dryRunSource, "growth-learning-automation-scheduler-service");
  assert.deepEqual(dryRunCalls[0], digestInput());
});

test("automation digest service rejects non-readonly dry-run output before saving", () => {
  const { saveCalls, service } = createService({
    dryRunResult: {
      dryRun: true,
      writePlanned: true,
      writesPerformed: false,
      publishPlanned: false,
      candidates: [readyCandidate()]
    }
  });

  const result = service.createDigest(digestInput());

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_automation_digest_non_readonly");
  assert.equal(saveCalls.length, 0);
});

test("automation digest service handles failures, privacy-risk inputs, and missing dependencies", () => {
  const failedDryRun = createService({ dryRunFails: true });
  assert.equal(failedDryRun.service.createDigest(digestInput()).error, "scheduler_failed");
  assert.equal(failedDryRun.saveCalls.length, 0);

  const privacy = createService().service.createDigest(digestInput({ rawPrompt: "DO_NOT_STORE" }));
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_automation_digest_privacy_failed");

  const missingRepository = createLearningAutomationDigestService({}).createDigest(digestInput());
  assert.equal(missingRepository.ok, false);
  assert.equal(missingRepository.error, "learning_automation_digest_repository_unavailable");
});

test("automation digest service lists and reviews digests without publishing", () => {
  const { listCalls, reviewCalls, service } = createService();

  const listed = service.listDigests({ workspaceId: "weixin_fanfan", learnerId: "fanfan", limit: 5 });
  assert.equal(listed.ok, true);
  assert.equal(listed.count, 1);
  assert.equal(listCalls[0].workspaceId, "weixin_fanfan");

  const reviewed = service.reviewDigest({
    workspaceId: "weixin_fanfan",
    digestId: "lgadig_route_1",
    status: "reviewed",
    selectedCandidateIds: ["lgauto_ready_1:lgplan_next:plan_item_next"],
    note: "Reviewed only.",
    reviewedBy: "weixin_owner"
  });
  assert.equal(reviewed.ok, true);
  assert.equal(reviewed.digest.status, "reviewed");
  assert.equal(reviewCalls[0].status, "reviewed");

  const privacy = service.reviewDigest({
    workspaceId: "weixin_fanfan",
    digestId: "lgadig_route_1",
    status: "reviewed",
    rawModelOutput: "DO_NOT_STORE"
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_automation_digest_privacy_failed");
});

test("automation digest service gets one digest through repository boundary", () => {
  const { getCalls, service } = createService();

  const result = service.getDigest({
    workspaceId: "weixin_fanfan",
    digestId: "lgadig_route_1"
  });

  assert.equal(result.ok, true);
  assert.equal(result.digest.digestId, "lgadig_route_1");
  assert.deepEqual(getCalls[0], {
    workspaceId: "weixin_fanfan",
    digestId: "lgadig_route_1"
  });

  const missing = createService({ getMissing: true }).service.getDigest({
    workspaceId: "weixin_fanfan",
    digestId: "missing"
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "learning_automation_digest_not_found");
});
