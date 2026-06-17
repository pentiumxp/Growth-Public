const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createLearningAutomationProposalService } = require("../src/services/learning-automation-proposal-service");
const { createGrowthLearningSqliteStore } = require("../src/stores/growth-learning-sqlite-store");

function tempDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "learning-automation-proposal-"));
  return path.join(dir, "growth-learning.sqlite3");
}

function planDraft() {
  return {
    planDraftId: "lgplan_next_science",
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    horizon: "daily_plan",
    status: "draft",
    planSummary: "Next low-pressure science repair card.",
    draft: {
      schemaVersion: "growth.learningPlanDraft.v1",
      horizon: "daily_plan",
      items: [{
        itemId: "plan_item_next_1",
        cardRole: "repair",
        subject: "science",
        targetNodeIds: ["kg_science_fair_test"],
        estimatedMinutes: 12,
        supportLevel: "guided",
        reason: "Prior cycle shows fair-test reasoning needs one repair card."
      }]
    },
    contextSummary: {
      knowledgeGraph: {
        domainPackId: "uk_hk_curriculum_foundation",
        domain: "science",
        subject: "science"
      }
    },
    validation: { ok: true, schemaVersion: "growth.learningPlanDraft.v1" },
    privacyClass: "summary_only"
  };
}

function readyCompleteness() {
  return {
    ok: true,
    complete: true,
    readyForAutomation: true,
    summary: {
      missingRequired: [],
      planPublished: true,
      evaluationEvidence: true,
      profileDelta: true
    },
    findings: [{ code: "plan_publication", ok: true, severity: "required" }]
  };
}

function createService(options = {}) {
  const store = createGrowthLearningSqliteStore({ dbPath: tempDbPath() });
  const draftCalls = [];
  const publishCalls = [];
  const provisioningCalls = [];
  const service = createLearningAutomationProposalService({
    repository: store.learningAutomationProposalRepository,
    auditCompletenessService: {
      evaluateCycleCompleteness(input) {
        if (options.incompleteCycle) {
          return {
            ok: true,
            complete: false,
            readyForAutomation: false,
            summary: { missingRequired: ["profile_delta_audit"] }
          };
        }
        return Object.assign({ input }, readyCompleteness());
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
          selectedDomainPackId: input.domainPackId || "uk_hk_curriculum_foundation",
          selectedDomain: input.domain || "science",
          selectedSubject: input.subject || "science"
        };
      }
    },
    planPublisherService: {
      getPlanDraft(input) {
        if (input.planDraftId === "lgplan_existing_draft") {
          return {
            ok: true,
            planDraft: Object.assign({}, planDraft(), {
              planDraftId: "lgplan_existing_draft",
              status: "draft",
              draft: {
                schemaVersion: "growth.learningPlanDraft.v1",
                horizon: "daily_plan",
                items: [{
                  itemId: "existing_item_1",
                  cardRole: "repair",
                  subject: "science",
                  targetNodeIds: ["kg_science_existing_target"],
                  estimatedMinutes: 10,
                  supportLevel: "guided",
                  reason: "Existing validated draft should be reused without a new Gateway draft."
                }]
              }
            })
          };
        }
        if (input.planDraftId === "lgplan_published_draft") {
          return {
            ok: true,
            planDraft: Object.assign({}, planDraft(), {
              planDraftId: "lgplan_published_draft",
              status: "published"
            })
          };
        }
        return { ok: false, error: "learning_plan_draft_not_found" };
      },
      async draftPlan(input) {
        draftCalls.push(input);
        return { ok: true, gatewayMode: "json", planDraft: planDraft() };
      },
      async publishPlanItem(input) {
        publishCalls.push(input);
        if (!options.allowPublish) throw new Error("publishPlanItem must not be called by proposal dry-run");
        if (options.publishFails) {
          return {
            ok: false,
            error: "learning_plan_publish_generation_failed",
            stage: "card_generation",
            planDraft: Object.assign({}, planDraft(), {
              publishAttempt: {
                status: "failed",
                stage: "card_generation",
                error: "learning_plan_publish_generation_failed"
              }
            }),
            publishAttempt: {
              status: "failed",
              stage: "card_generation",
              error: "learning_plan_publish_generation_failed"
            }
          };
        }
        return {
          ok: true,
          source: "growth-learning-plan-publisher-service",
          planDraft: Object.assign({}, planDraft(), {
            status: "published",
            generatedTaskCardId: "ltask_generated_1",
            generatedLearningGraphPlanId: "lgplan_generated_1"
          }),
          generation: {
            published: { taskCardId: "ltask_generated_1" },
            learningGraphPlan: { learningGraphPlanId: "lgplan_generated_1" }
          }
        };
      }
    }
  });
  return { draftCalls, publishCalls, provisioningCalls, service, store };
}

function proposalInput(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    horizon: "daily_plan",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    availableMinutes: 15,
    sourcePlanDraftId: "lgplan_previous",
    sourceTaskCardId: "ltask_previous",
    sourceEvaluationId: "lgeval_previous",
    profileDeltaId: "lgpdelta_previous",
    evidenceId: "lgevd_previous",
    targetNodeIds: ["kg_science_fair_test"],
    requestedBy: "weixin_owner"
  }, overrides);
}

test("automation proposal service creates an Owner-reviewed dry-run proposal without publishing", async () => {
  const { draftCalls, provisioningCalls, service, store } = createService();

  const result = await service.createProposal(proposalInput());

  assert.equal(result.ok, true);
  assert.equal(result.proposal.workspaceId, "weixin_fanfan");
  assert.equal(result.proposal.planDraftId, "lgplan_next_science");
  assert.equal(result.proposal.selectedItemId, "plan_item_next_1");
  assert.equal(result.proposal.policy.ownerReviewRequired, true);
  assert.equal(result.proposal.policy.autoPublish, false);
  assert.equal(result.proposal.policy.dryRunOnly, true);
  assert.equal(result.publishAction.itemId, "plan_item_next_1");
  assert.equal(draftCalls.length, 1);
  assert.equal(draftCalls[0].workspaceId, "weixin_fanfan");
  assert.equal(draftCalls[0].subject, "science");
  assert.equal(provisioningCalls.length, 1);

  const listed = service.listProposals({ workspaceId: "weixin_fanfan", learnerId: "fanfan" });
  assert.equal(listed.ok, true);
  assert.equal(listed.count, 1);
  assert.equal(listed.proposals[0].proposalId, result.proposal.proposalId);

  const persisted = store.learningAutomationProposalRepository.listProposals({ workspaceId: "weixin_fanfan" });
  assert.equal(persisted.length, 1);
  assert.equal(JSON.stringify(persisted[0]).includes("rawAnswer"), false);
  assert.equal(JSON.stringify(persisted[0]).includes("rawPrompt"), false);
});

test("automation proposal service can reuse an existing validated draft without drafting again", async () => {
  const { draftCalls, provisioningCalls, service } = createService();

  const result = await service.createProposal(proposalInput({
    existingPlanDraftId: "lgplan_existing_draft",
    selectedItemId: "existing_item_1",
    targetNodeIds: []
  }));

  assert.equal(result.ok, true);
  assert.equal(result.proposal.planDraftId, "lgplan_existing_draft");
  assert.equal(result.proposal.selectedItemId, "existing_item_1");
  assert.deepEqual(result.proposal.targetNodeIds, ["kg_science_existing_target"]);
  assert.equal(result.publishAction.endpoint, "/api/v1/growth/learning-plans/lgplan_existing_draft/publish");
  assert.equal(result.publishAction.itemId, "existing_item_1");
  assert.equal(draftCalls.length, 0);
  assert.equal(provisioningCalls.length, 1);
  assert.deepEqual(provisioningCalls[0].targetNodeIds, ["kg_science_existing_target"]);
});

test("automation proposal service rejects existing drafts that are already published", async () => {
  const { draftCalls, service } = createService();

  const result = await service.createProposal(proposalInput({
    existingPlanDraftId: "lgplan_published_draft"
  }));

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_automation_existing_plan_draft_not_draft");
  assert.equal(result.stage, "plan_draft_lookup");
  assert.equal(draftCalls.length, 0);
});

test("automation proposal service records Owner decisions without publishing", async () => {
  const { service } = createService();
  const created = await service.createProposal(proposalInput());

  const accepted = service.reviewProposal({
    workspaceId: "weixin_fanfan",
    proposalId: created.proposal.proposalId,
    status: "accepted",
    reason: "Owner reviewed and wants to publish manually.",
    reviewedBy: "weixin_owner"
  });

  assert.equal(accepted.ok, true);
  assert.equal(accepted.proposal.status, "accepted");
  assert.equal(accepted.proposal.decision.status, "accepted");
  assert.equal(accepted.publishAction.endpoint, "/api/v1/growth/learning-plans/lgplan_next_science/publish");
  assert.equal(accepted.publishAction.itemId, "plan_item_next_1");

  const listed = service.listProposals({ workspaceId: "weixin_fanfan", status: "accepted" });
  assert.equal(listed.count, 1);

  const skippedAfterAccepted = service.reviewProposal({
    workspaceId: "weixin_fanfan",
    proposalId: created.proposal.proposalId,
    status: "skipped"
  });
  assert.equal(skippedAfterAccepted.ok, false);
  assert.equal(skippedAfterAccepted.error, "learning_automation_proposal_already_decided");
});

test("automation proposal service publishes only accepted proposals through the plan publisher", async () => {
  const { publishCalls, service } = createService({ allowPublish: true });
  const created = await service.createProposal(proposalInput());

  const beforeAccepted = await service.publishAcceptedProposal({
    workspaceId: "weixin_fanfan",
    proposalId: created.proposal.proposalId,
    requestedBy: "weixin_owner"
  });
  assert.equal(beforeAccepted.ok, false);
  assert.equal(beforeAccepted.error, "learning_automation_proposal_not_accepted");
  assert.equal(publishCalls.length, 0);

  service.reviewProposal({
    workspaceId: "weixin_fanfan",
    proposalId: created.proposal.proposalId,
    status: "accepted",
    reviewedBy: "weixin_owner"
  });

  const published = await service.publishAcceptedProposal({
    workspaceId: "weixin_fanfan",
    proposalId: created.proposal.proposalId,
    requestedBy: "weixin_owner"
  });
  assert.equal(published.ok, true);
  assert.equal(published.proposal.status, "accepted");
  assert.equal(published.proposal.execution.status, "published");
  assert.equal(published.proposal.execution.generatedTaskCardId, "ltask_generated_1");
  assert.equal(publishCalls.length, 1);
  assert.deepEqual(publishCalls[0], {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    planDraftId: "lgplan_next_science",
    itemId: "plan_item_next_1",
    generationKey: undefined,
    cardSchemaVersion: undefined,
    requestedBy: "weixin_owner"
  });

  const duplicate = await service.publishAcceptedProposal({
    workspaceId: "weixin_fanfan",
    proposalId: created.proposal.proposalId,
    requestedBy: "weixin_owner"
  });
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.duplicate, true);
  assert.equal(publishCalls.length, 1);
});

test("automation proposal service records publish failures without hiding the proposal", async () => {
  const { publishCalls, service } = createService({ allowPublish: true, publishFails: true });
  const created = await service.createProposal(proposalInput());
  service.reviewProposal({
    workspaceId: "weixin_fanfan",
    proposalId: created.proposal.proposalId,
    status: "accepted",
    reviewedBy: "weixin_owner"
  });

  const failed = await service.publishAcceptedProposal({
    workspaceId: "weixin_fanfan",
    proposalId: created.proposal.proposalId,
    requestedBy: "weixin_owner"
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.error, "learning_plan_publish_generation_failed");
  assert.equal(failed.proposal.status, "accepted");
  assert.equal(failed.proposal.execution.status, "failed");
  assert.equal(failed.proposal.execution.publishAttempt.status, "failed");
  assert.equal(failed.publishAction.endpoint, "/api/v1/growth/learning-plans/lgplan_next_science/publish");
  assert.equal(publishCalls.length, 1);

  const privacy = await service.publishAcceptedProposal({
    workspaceId: "weixin_fanfan",
    proposalId: created.proposal.proposalId,
    rawPrompt: "do not store"
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_automation_proposal_privacy_failed");
  assert.equal(publishCalls.length, 1);
});

test("automation proposal service blocks when cycle audit completeness is missing", async () => {
  const { draftCalls, service } = createService({ incompleteCycle: true });

  const result = await service.createProposal(proposalInput());

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_automation_cycle_not_ready");
  assert.equal(result.completeness.readyForAutomation, false);
  assert.equal(draftCalls.length, 0);
});

test("automation proposal service blocks unprovisioned targets before drafting", async () => {
  const { draftCalls, service } = createService({ unprovisioned: true });

  const result = await service.createProposal(proposalInput());

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_target_not_provisioned");
  assert.equal(draftCalls.length, 0);
});

test("automation proposal service rejects privacy-risk payloads and missing source cycles", async () => {
  const { draftCalls, service } = createService();

  const missingCycle = await service.createProposal(proposalInput({
    sourcePlanDraftId: "",
    sourceTaskCardId: "",
    sourceEvaluationId: "",
    profileDeltaId: "",
    evidenceId: ""
  }));
  assert.equal(missingCycle.ok, false);
  assert.equal(missingCycle.error, "learning_automation_source_cycle_required");

  const privacy = await service.createProposal(proposalInput({
    rawPrompt: "do not store"
  }));
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "learning_automation_proposal_privacy_failed");
  assert.equal(draftCalls.length, 0);

  const reviewPrivacy = service.reviewProposal({
    workspaceId: "weixin_fanfan",
    proposalId: "missing",
    status: "accepted",
    rawAnswer: "do not store"
  });
  assert.equal(reviewPrivacy.ok, false);
  assert.equal(reviewPrivacy.error, "learning_automation_proposal_privacy_failed");
});
