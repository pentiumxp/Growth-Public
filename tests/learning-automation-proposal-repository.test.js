const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const {
  createLearningAutomationProposalRepository
} = require("../src/stores/growth-learning-sqlite/automation-proposals");

function withRepository(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-automation-proposal-"));
  const dbPath = path.join(dir, "automation-proposals.sqlite3");
  const repository = createLearningAutomationProposalRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    },
    now: () => new Date("2026-06-15T09:45:00.000Z")
  });
  try {
    return callback({ dbPath, repository });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sampleProposal(overrides = {}) {
  return Object.assign({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    horizon: "daily_plan",
    status: "proposed",
    sourceCycle: {
      planDraftId: "lgplan_previous",
      taskCardId: "ltask_previous",
      evaluationId: "lgeval_previous",
      complete: true,
      readyForAutomation: true
    },
    sourcePlanDraftId: "lgplan_previous",
    sourceTaskCardId: "ltask_previous",
    sourceEvaluationId: "lgeval_previous",
    planDraftId: "lgplan_next_science",
    selectedItemId: "plan_item_next_1",
    proposalSummary: "Next low-pressure science repair card.",
    targetNodeIds: ["kg_science_fair_test", "kg_science_fair_test"],
    rationale: {
      summaryOnly: true,
      source: "growth-learning-automation-proposal-service",
      completeness: { readyForAutomation: true, missingRequired: [] },
      plan: { reason: "Repair fair-test reasoning." }
    },
    policy: {
      schemaVersion: "growth.learningAutomationProposal.policy.v1",
      ownerReviewRequired: true,
      dryRunOnly: true,
      autoPublish: false,
      publishRequiresOwnerAction: true,
      requiresAuditCompleteness: true
    },
    createdBy: "weixin_owner",
    privacyClass: "summary_only"
  }, overrides);
}

test("automation proposal repository saves, lists, and de-duplicates summary-only proposals", () => {
  withRepository(({ repository }) => {
    const saved = repository.saveProposal(sampleProposal());

    assert.equal(saved.ok, true);
    assert.equal(saved.duplicate, false);
    assert.equal(saved.proposal.workspaceId, "weixin_fanfan");
    assert.equal(saved.proposal.planDraftId, "lgplan_next_science");
    assert.equal(saved.proposal.selectedItemId, "plan_item_next_1");
    assert.deepEqual(saved.proposal.targetNodeIds, ["kg_science_fair_test"]);
    assert.equal(saved.proposal.policy.ownerReviewRequired, true);
    assert.equal(saved.proposal.policy.autoPublish, false);
    assert.equal(saved.proposal.privacyClass, "summary_only");

    const duplicate = repository.saveProposal(sampleProposal({
      proposalSummary: "Duplicate should return original row."
    }));
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.proposal.proposalId, saved.proposal.proposalId);
    assert.equal(duplicate.proposal.proposalSummary, "Next low-pressure science repair card.");

    const byPlan = repository.listProposals({
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      status: "proposed",
      planDraftId: "lgplan_next_science"
    });
    assert.equal(byPlan.length, 1);
    assert.equal(byPlan[0].proposalId, saved.proposal.proposalId);
    assert.equal(JSON.stringify(byPlan[0]).includes("rawAnswer"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(byPlan[0], "raw"), false);

    const noMatch = repository.listProposals({ workspaceId: "other_workspace" });
    assert.deepEqual(noMatch, []);
  });
});

test("automation proposal repository records Owner decisions without publishing", () => {
  withRepository(({ repository }) => {
    const saved = repository.saveProposal(sampleProposal());

    const accepted = repository.reviewProposal({
      workspaceId: "weixin_fanfan",
      proposalId: saved.proposal.proposalId,
      status: "accepted",
      reason: "Owner approved for manual publication.",
      reviewedBy: "weixin_owner"
    });
    assert.equal(accepted.ok, true);
    assert.equal(accepted.duplicate, false);
    assert.equal(accepted.proposal.status, "accepted");
    assert.equal(accepted.proposal.reviewedBy, "weixin_owner");
    assert.equal(accepted.proposal.decision.status, "accepted");
    assert.equal(accepted.proposal.decision.summaryOnly, true);
    assert.equal(accepted.proposal.decision.reason, "Owner approved for manual publication.");

    const duplicate = repository.reviewProposal({
      workspaceId: "weixin_fanfan",
      proposalId: saved.proposal.proposalId,
      status: "accepted"
    });
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);

    const conflicting = repository.reviewProposal({
      workspaceId: "weixin_fanfan",
      proposalId: saved.proposal.proposalId,
      status: "skipped"
    });
    assert.equal(conflicting.ok, false);
    assert.equal(conflicting.error, "learning_automation_proposal_already_decided");

    const acceptedRows = repository.listProposals({ workspaceId: "weixin_fanfan", status: "accepted" });
    assert.equal(acceptedRows.length, 1);
    assert.equal(acceptedRows[0].proposalId, saved.proposal.proposalId);
  });
});

test("automation proposal repository records bounded publish execution metadata", () => {
  withRepository(({ repository }) => {
    const saved = repository.saveProposal(sampleProposal());
    const premature = repository.recordExecution({
      workspaceId: "weixin_fanfan",
      proposalId: saved.proposal.proposalId,
      status: "published",
      generatedTaskCardId: "ltask_generated_1"
    });
    assert.equal(premature.ok, false);
    assert.equal(premature.error, "learning_automation_proposal_not_accepted");

    repository.reviewProposal({
      workspaceId: "weixin_fanfan",
      proposalId: saved.proposal.proposalId,
      status: "accepted",
      reviewedBy: "weixin_owner"
    });
    const published = repository.recordExecution({
      workspaceId: "weixin_fanfan",
      proposalId: saved.proposal.proposalId,
      status: "published",
      stage: "published",
      generatedTaskCardId: "ltask_generated_1",
      generatedLearningGraphPlanId: "lgplan_generated_1",
      executedBy: "weixin_owner"
    });
    assert.equal(published.ok, true);
    assert.equal(published.duplicate, false);
    assert.equal(published.proposal.status, "accepted");
    assert.equal(published.proposal.execution.status, "published");
    assert.equal(published.proposal.execution.summaryOnly, true);
    assert.equal(published.proposal.execution.generatedTaskCardId, "ltask_generated_1");
    assert.equal(published.proposal.executedBy, "weixin_owner");

    const duplicate = repository.recordExecution({
      workspaceId: "weixin_fanfan",
      proposalId: saved.proposal.proposalId,
      status: "published",
      generatedTaskCardId: "ltask_generated_1"
    });
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.duplicate, true);

    const fetched = repository.getProposal({
      workspaceId: "weixin_fanfan",
      proposalId: saved.proposal.proposalId
    });
    assert.equal(fetched.execution.status, "published");
    assert.equal(JSON.stringify(fetched).includes("rawPrompt"), false);
  });
});

test("automation proposal repository records failed execution for retry visibility", () => {
  withRepository(({ repository }) => {
    const saved = repository.saveProposal(sampleProposal());
    repository.reviewProposal({
      workspaceId: "weixin_fanfan",
      proposalId: saved.proposal.proposalId,
      status: "accepted",
      reviewedBy: "weixin_owner"
    });
    const failed = repository.recordExecution({
      workspaceId: "weixin_fanfan",
      proposalId: saved.proposal.proposalId,
      status: "failed",
      stage: "card_generation",
      error: "learning_plan_publish_generation_failed",
      publishAttempt: { status: "failed", stage: "card_generation" },
      executedBy: "weixin_owner"
    });
    assert.equal(failed.ok, true);
    assert.equal(failed.proposal.execution.status, "failed");
    assert.equal(failed.proposal.execution.error, "learning_plan_publish_generation_failed");
    assert.equal(failed.proposal.execution.publishAttempt.status, "failed");

    const privacy = repository.recordExecution({
      workspaceId: "weixin_fanfan",
      proposalId: saved.proposal.proposalId,
      status: "failed",
      rawModelOutput: "DO_NOT_STORE"
    });
    assert.equal(privacy.ok, false);
    assert.equal(privacy.error, "learning_automation_proposal_privacy_failed");

    const invalid = repository.recordExecution({
      workspaceId: "weixin_fanfan",
      proposalId: saved.proposal.proposalId,
      status: "queued"
    });
    assert.equal(invalid.ok, false);
    assert.equal(invalid.error, "learning_automation_proposal_execution_status_invalid");
  });
});

test("automation proposal repository rejects privacy-risk keys and non-summary privacy class", () => {
  withRepository(({ repository }) => {
    const privacyRisk = repository.saveProposal(sampleProposal({
      rationale: {
        rawPrompt: "DO_NOT_STORE_RAW_PROMPT"
      }
    }));
    assert.equal(privacyRisk.ok, false);
    assert.equal(privacyRisk.error, "learning_automation_proposal_privacy_failed");
    assert.equal(privacyRisk.privacyFindings.includes("$.rationale.rawPrompt"), true);

    const wrongClass = repository.saveProposal(sampleProposal({
      privacyClass: "raw_payload"
    }));
    assert.equal(wrongClass.ok, false);
    assert.equal(wrongClass.error, "learning_automation_proposal_privacy_class_required");

    const missingScope = repository.saveProposal(sampleProposal({
      workspaceId: "",
      planDraftId: ""
    }));
    assert.equal(missingScope.ok, false);
    assert.equal(missingScope.error, "learning_automation_proposal_scope_required");

    assert.deepEqual(repository.listProposals({ workspaceId: "weixin_fanfan" }), []);
  });
});

test("automation proposal repository rejects invalid decisions and migrates decision columns", () => {
  withRepository(({ dbPath, repository }) => {
    const db = new DatabaseSync(dbPath, { open: true });
    db.exec(`
      CREATE TABLE learning_growth_automation_proposals (
        proposal_id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        learner_id TEXT NOT NULL DEFAULT '',
        program_id TEXT NOT NULL DEFAULT '',
        horizon TEXT NOT NULL DEFAULT 'daily_plan',
        status TEXT NOT NULL DEFAULT 'proposed',
        source_cycle_json TEXT NOT NULL DEFAULT '{}',
        source_plan_draft_id TEXT NOT NULL DEFAULT '',
        source_task_card_id TEXT NOT NULL DEFAULT '',
        source_evaluation_id TEXT NOT NULL DEFAULT '',
        plan_draft_id TEXT NOT NULL DEFAULT '',
        selected_item_id TEXT NOT NULL DEFAULT '',
        proposal_summary TEXT NOT NULL DEFAULT '',
        target_node_ids_json TEXT NOT NULL DEFAULT '[]',
        rationale_json TEXT NOT NULL DEFAULT '{}',
        policy_json TEXT NOT NULL DEFAULT '{}',
        created_by TEXT NOT NULL DEFAULT '',
        privacy_class TEXT NOT NULL DEFAULT 'summary_only',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    db.close();

    assert.equal(repository.ensureSchema().ok, true);
    const migrated = new DatabaseSync(dbPath, { open: true, readOnly: true });
    const columns = migrated.prepare("PRAGMA table_info(learning_growth_automation_proposals)").all().map((column) => column.name);
    migrated.close();
    assert.equal(columns.includes("decision_json"), true);
    assert.equal(columns.includes("reviewed_by"), true);
    assert.equal(columns.includes("decided_at"), true);
    assert.equal(columns.includes("execution_json"), true);
    assert.equal(columns.includes("executed_by"), true);
    assert.equal(columns.includes("executed_at"), true);

    const missing = repository.reviewProposal({
      workspaceId: "weixin_fanfan",
      proposalId: "missing",
      status: "accepted"
    });
    assert.equal(missing.ok, false);
    assert.equal(missing.error, "learning_automation_proposal_not_found");

    const invalidStatus = repository.reviewProposal({
      workspaceId: "weixin_fanfan",
      proposalId: "missing",
      status: "published"
    });
    assert.equal(invalidStatus.ok, false);
    assert.equal(invalidStatus.error, "learning_automation_proposal_status_invalid");

    const privacy = repository.reviewProposal({
      workspaceId: "weixin_fanfan",
      proposalId: "missing",
      status: "accepted",
      rawPrompt: "DO_NOT_STORE"
    });
    assert.equal(privacy.ok, false);
    assert.equal(privacy.error, "learning_automation_proposal_privacy_failed");
  });
});
