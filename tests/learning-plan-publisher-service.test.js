const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const test = require("node:test");

const { createLearningPlanPublisherService } = require("../src/services/learning-plan-publisher-service");
const { createGrowthLearningSqliteStore } = require("../src/stores/growth-learning-sqlite-store");

function tempDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "learning-plan-publisher-"));
  return path.join(dir, "growth-learning.sqlite3");
}

function context() {
  return {
    ok: true,
    schemaVersion: "growth.learningPlanner.input.v1",
    target: {
      workspaceId: "weixin_stephen",
      learnerId: "fanfan",
      displayName: "Fanfan"
    },
    horizon: "daily_plan",
    constraints: {
      availableMinutes: 15,
      lowPressure: true,
      allowedCardRoles: ["teaching", "practice", "repair", "stretch"],
      completionPolicy: "daily_score_once"
    },
    knowledgeGraph: {
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      candidateNodes: [{
        nodeId: "kg_science_fair_test",
        title: "Fair test reasoning",
        subject: "science",
        evidenceRequired: ["explain_controlled_variable"]
      }]
    },
    profileSummary: {
      strengths: [{ nodeId: "kg_observation_language", summary: "Uses concise observations." }],
      weaknesses: [{ nodeId: "kg_science_fair_test", summary: "Needs clearer measured results." }],
      pressureSignals: ["too_hard:1"],
      recommendedPlannerHints: ["Use one guided science card."]
    },
    recentEvidence: [{
      evidenceId: "lgevd_science_1",
      sourceType: "daily_evaluation",
      graphNodeIds: ["kg_science_fair_test"],
      scoreBand: "low",
      status: "needs_repair",
      summary: "Needs clearer measured results."
    }],
    privacy: { privacyClass: "summary_only", summaryOnly: true }
  };
}

function validDraft(overrides = {}) {
  return Object.assign({
    schemaVersion: "growth.learningPlanDraft.v1",
    horizon: "daily_plan",
    planSummary: "Repair fair-test reasoning with one guided science card.",
    items: [{
      itemId: "plan_item_science_1",
      cardRole: "stretch",
      subject: "science",
      targetNodeIds: ["kg_science_fair_test"],
      estimatedMinutes: 12,
      difficultyBand: "foundation",
      supportLevel: "guided",
      evidenceRequirements: ["explain_controlled_variable"],
      reason: "Recent evidence shows a clear science target.",
      pressurePolicy: {
        completionPolicy: "daily_score_once",
        passScoreRequired: false
      }
    }],
    audit: {
      basisEvidenceIds: ["lgevd_science_1"],
      profileSnapshotId: "profile_snapshot_test"
    }
  }, overrides);
}

function stageCheckpointDraft() {
  return validDraft({
    horizon: "stage_checkpoint_plan",
    planSummary: "Suggest a formal checkpoint for fair-test reasoning.",
    items: [{
      itemId: "plan_item_stage_1",
      cardRole: "stage_assessment",
      subject: "science",
      targetNodeIds: ["kg_science_fair_test"],
      assessmentCoverageNodeIds: ["kg_science_fair_test"],
      estimatedMinutes: 28,
      difficultyBand: "foundation",
      supportLevel: "independent",
      evidenceRequirements: ["explain_controlled_variable"],
      reason: "Enough evidence exists for a formal checkpoint suggestion.",
      pressurePolicy: {
        completionPolicy: "formal_assessment",
        passScoreRequired: false
      },
      activationPolicy: {
        activateThrough: "learning-stage-assessment-service",
        reason: "Formal cards must be activated by stage-assessment policy."
      }
    }],
    audit: {
      basisEvidenceIds: ["lgevd_science_1"],
      profileSnapshotId: "profile_snapshot_stage"
    }
  });
}

function createServiceWithStore(options = {}) {
  const store = createGrowthLearningSqliteStore({ dbPath: tempDbPath() });
  const generationCalls = [];
  const provisioningCalls = [];
  const service = createLearningPlanPublisherService({
    repository: store.learningPlanDraftRepository,
    orchestratorService: {
      draftPlan: async (input) => ({
        ok: true,
        gatewayMode: "json",
        context: Object.assign({}, context(), {
          target: Object.assign({}, context().target, {
            workspaceId: input.workspaceId || "weixin_stephen",
            learnerId: input.learnerId || "fanfan"
          }),
          knowledgeGraph: Object.assign({}, context().knowledgeGraph, {
            domainPackId: input.domainPackId || "uk_hk_curriculum_foundation",
            domain: input.domain || "science",
            subject: input.subject || "science"
          })
        }),
        draft: validDraft(options.draftOverrides)
      })
    },
    cardGenerationService: {
      generateCard: async (input) => {
        generationCalls.push(input);
        if (options.generationFails) return { ok: false, error: "card_generation_failed", stage: "authoring" };
        return {
          ok: true,
          learningGraphPlan: { learningGraphPlanId: "lgp_science_1" },
          published: { taskCardId: "ltask_science_1" }
        };
      }
    },
    targetProvisioningService: options.targetProvisioningService || (options.provisioning
      ? {
          resolveSelection(input) {
            provisioningCalls.push(input);
            if (options.provisioningFails) return { ok: false, targetEnabled: false, error: "learning_target_not_provisioned" };
            return {
              ok: true,
              targetEnabled: true,
              mode: "explicit_provision",
              selectedDomainPackId: input.domainPackId || "uk_hk_curriculum_foundation",
              selectedDomain: input.domain || "science",
              selectedSubject: input.subject || "science"
            };
          }
        }
      : null)
  });
  return { generationCalls, provisioningCalls, service, store };
}

test("learning plan publisher persists validated planner drafts as summary-only records", async () => {
  const { service, store } = createServiceWithStore();

  const result = await service.draftPlan({ workspaceId: "weixin_stephen", learnerId: "fanfan" });

  assert.equal(result.ok, true);
  assert.equal(result.planDraft.status, "draft");
  assert.equal(result.planDraft.workspaceId, "weixin_stephen");
  assert.equal(result.planDraft.contextSummary.knowledgeGraph.candidateNodes[0].nodeId, "kg_science_fair_test");
  const saved = store.learningPlanDraftRepository.getDraft({
    workspaceId: "weixin_stephen",
    planDraftId: result.planDraft.planDraftId
  });
  assert.equal(saved.planSummary, "Repair fair-test reasoning with one guided science card.");
  assert.equal(JSON.stringify(saved).includes("rawAnswer"), false);
  assert.equal(JSON.stringify(saved).includes("transcript"), false);
});

test("learning plan draft repository migrates publish-attempt columns on existing tables", () => {
  const dbPath = tempDbPath();
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE learning_growth_plan_drafts (
      plan_draft_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      horizon TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      plan_summary TEXT NOT NULL DEFAULT '',
      draft_json TEXT NOT NULL DEFAULT '{}',
      context_summary_json TEXT NOT NULL DEFAULT '{}',
      validation_json TEXT NOT NULL DEFAULT '{}',
      selected_item_id TEXT NOT NULL DEFAULT '',
      generated_task_card_id TEXT NOT NULL DEFAULT '',
      generated_learning_graph_plan_id TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'growth-learning-plan-publisher-service',
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      published_at TEXT NOT NULL DEFAULT ''
    );
  `);
  db.close();

  const store = createGrowthLearningSqliteStore({ dbPath });
  store.learningPlanDraftRepository.ensureSchema();

  const readbackDb = new DatabaseSync(dbPath, { readOnly: true });
  const columns = readbackDb.prepare("PRAGMA table_info(learning_growth_plan_drafts)").all().map((column) => column.name);
  readbackDb.close();

  assert.equal(columns.includes("last_publish_status"), true);
  assert.equal(columns.includes("last_publish_error"), true);
  assert.equal(columns.includes("last_publish_stage"), true);
  assert.equal(columns.includes("last_publish_item_id"), true);
  assert.equal(columns.includes("last_publish_attempt_at"), true);
  assert.equal(columns.includes("publish_attempt_count"), true);
});

test("learning plan publisher publishes one selected item through card generation and marks draft published", async () => {
  const { generationCalls, service, store } = createServiceWithStore();
  const draft = await service.draftPlan({ workspaceId: "weixin_stephen", learnerId: "fanfan" });

  const result = await service.publishPlanItem({
    workspaceId: "weixin_stephen",
    planDraftId: draft.planDraft.planDraftId,
    itemId: "plan_item_science_1"
  });

  assert.equal(result.ok, true);
  assert.equal(generationCalls.length, 1);
  assert.equal(generationCalls[0].cardRole, "practice");
  assert.equal(generationCalls[0].sourceSummaries[0].plannerCardRole, "stretch");
  assert.equal(generationCalls[0].sourceSummaries[0].publishedCardRole, "practice");
  assert.equal(result.planDraft.status, "published");
  assert.equal(result.planDraft.generatedTaskCardId, "ltask_science_1");
  const readback = store.learningPlanDraftRepository.getDraft({
    workspaceId: "weixin_stephen",
    planDraftId: draft.planDraft.planDraftId
  });
  assert.equal(readback.publishedAt.length > 0, true);
  assert.equal(readback.publishAttempt.status, "published");
  assert.equal(readback.publishAttempt.error, "");
  assert.equal(readback.publishAttempt.stage, "published");
  assert.equal(readback.publishAttempt.selectedItemId, "plan_item_science_1");
  assert.equal(readback.publishAttempt.attemptCount, 1);
});

test("learning plan publisher records bounded publish failure without marking draft published", async () => {
  const { service, store } = createServiceWithStore({ generationFails: true });
  const draft = await service.draftPlan({ workspaceId: "weixin_stephen", learnerId: "fanfan" });

  const result = await service.publishPlanItem({
    workspaceId: "weixin_stephen",
    planDraftId: draft.planDraft.planDraftId,
    itemId: "plan_item_science_1"
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "card_generation_failed");
  assert.equal(result.publishAttempt.status, "failed");
  assert.equal(result.publishAttempt.error, "card_generation_failed");
  assert.equal(result.publishAttempt.stage, "authoring");
  const readback = store.learningPlanDraftRepository.getDraft({
    workspaceId: "weixin_stephen",
    planDraftId: draft.planDraft.planDraftId
  });
  assert.equal(readback.status, "draft");
  assert.equal(readback.generatedTaskCardId, "");
  assert.equal(readback.publishAttempt.status, "failed");
  assert.equal(readback.publishAttempt.error, "card_generation_failed");
  assert.equal(readback.publishAttempt.stage, "authoring");
  assert.equal(readback.publishAttempt.selectedItemId, "plan_item_science_1");
  assert.equal(readback.publishAttempt.attemptCount, 1);
  assert.equal(readback.publishAttempt.attemptedAt.length > 0, true);
});

test("learning plan publisher refuses direct stage-assessment publication", async () => {
  const { generationCalls, service, store } = createServiceWithStore({
    draftOverrides: stageCheckpointDraft()
  });
  const draft = await service.draftPlan({ workspaceId: "weixin_stephen", learnerId: "fanfan" });

  const result = await service.publishPlanItem({
    workspaceId: "weixin_stephen",
    planDraftId: draft.planDraft.planDraftId,
    itemId: "plan_item_stage_1"
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "stage_assessment_activation_required");
  assert.equal(result.stage, "stage_assessment_activation");
  assert.equal(result.publishAttempt.status, "blocked");
  assert.equal(result.publishAttempt.error, "stage_assessment_activation_required");
  assert.equal(result.stageAssessment.activateThrough, "learning-stage-assessment-service");
  assert.deepEqual(result.stageAssessment.assessmentCoverageNodeIds, ["kg_science_fair_test"]);
  assert.equal(generationCalls.length, 0);
  const readback = store.learningPlanDraftRepository.getDraft({
    workspaceId: "weixin_stephen",
    planDraftId: draft.planDraft.planDraftId
  });
  assert.equal(readback.status, "draft");
  assert.equal(readback.generatedTaskCardId, "");
  assert.equal(readback.publishAttempt.status, "blocked");
  assert.equal(readback.publishAttempt.stage, "stage_assessment_activation");
  assert.equal(readback.publishAttempt.selectedItemId, "plan_item_stage_1");
});

test("learning plan publisher enforces target provisioning for draft and publish", async () => {
  const { generationCalls, provisioningCalls, service } = createServiceWithStore({ provisioning: true });

  const draft = await service.draftPlan({
    workspaceId: "weixin_alice",
    learnerId: "alice",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science"
  });

  assert.equal(draft.ok, true);
  assert.equal(provisioningCalls.length, 1);
  assert.equal(provisioningCalls[0].workspaceId, "weixin_alice");
  assert.equal(provisioningCalls[0].subject, "science");

  const published = await service.publishPlanItem({
    workspaceId: "weixin_alice",
    planDraftId: draft.planDraft.planDraftId,
    itemId: "plan_item_science_1"
  });

  assert.equal(published.ok, true);
  assert.equal(provisioningCalls.length, 2);
  assert.deepEqual(provisioningCalls[1].targetNodeIds, ["kg_science_fair_test"]);
  assert.equal(generationCalls[0].domainPackId, "uk_hk_curriculum_foundation");
  assert.equal(generationCalls[0].domain, "science");
  assert.equal(generationCalls[0].subject, "science");
});

test("learning plan publisher blocks unprovisioned planner drafts", async () => {
  const { service, store } = createServiceWithStore({ provisioning: true, provisioningFails: true });
  store.learningPlanDraftRepository.ensureSchema();

  const result = await service.draftPlan({
    workspaceId: "weixin_alice",
    learnerId: "alice",
    domainPackId: "uk_hk_curriculum_foundation",
    subject: "science"
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_target_not_provisioned");
  assert.deepEqual(store.learningPlanDraftRepository.listDrafts({ workspaceId: "weixin_alice" }), []);
});
