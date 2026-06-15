const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createLearningPlanAuditService } = require("../src/services/learning-plan-audit-service");
const { createGrowthLearningSqliteStore } = require("../src/stores/growth-learning-sqlite-store");

function tempDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "learning-plan-audit-"));
  return path.join(dir, "growth-learning.sqlite3");
}

function draft({ subject = "science", targetNodeId = "kg_science_fair_test", summary = "Plan one science repair card." } = {}) {
  return {
    schemaVersion: "growth.learningPlanDraft.v1",
    horizon: "daily_plan",
    planSummary: summary,
    items: [{
      itemId: `plan_item_${targetNodeId}`,
      cardRole: "repair",
      subject,
      targetNodeIds: [targetNodeId],
      estimatedMinutes: 12,
      difficultyBand: "foundation",
      supportLevel: "guided",
      evidenceRequirements: ["short_answer"],
      reason: "Use a low-pressure daily card.",
      pressurePolicy: {
        completionPolicy: "daily_score_once",
        passScoreRequired: false
      },
      rawPrompt: "RAW PROMPT MUST NOT PROJECT"
    }],
    audit: {
      basisEvidenceIds: ["lgevd_science_1"],
      profileSnapshotId: "profile_snapshot_science",
      rawAnswer: "RAW ANSWER MUST NOT PROJECT"
    }
  };
}

test("learning plan audit service lists bounded public plan drafts and generated links", () => {
  const store = createGrowthLearningSqliteStore({ dbPath: tempDbPath() });
  const service = createLearningPlanAuditService({
    repository: store.learningPlanDraftRepository
  });
  const science = store.learningPlanDraftRepository.saveDraft({
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    programId: "program_science",
    horizon: "daily_plan",
    planSummary: "Plan one science repair card.",
    draft: draft(),
    contextSummary: {
      target: { workspaceId: "weixin_stephen", learnerId: "fanfan" },
      knowledgeGraph: { domainPackId: "uk_hk_curriculum_foundation", domain: "science", subject: "science" }
    },
    validation: { ok: true, schemaVersion: "growth.learningPlanDraft.v1" },
    createdAt: "2026-06-14T09:00:00.000Z"
  });
  store.learningPlanDraftRepository.markPublished({
    workspaceId: "weixin_stephen",
    planDraftId: science.planDraft.planDraftId,
    selectedItemId: "plan_item_kg_science_fair_test",
    generatedTaskCardId: "ltask_science_1",
    generatedLearningGraphPlanId: "lgp_science_1",
    publishedAt: "2026-06-14T09:15:00.000Z"
  });
  store.learningPlanDraftRepository.saveDraft({
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    programId: "program_english",
    horizon: "daily_plan",
    planSummary: "Plan one English card.",
    draft: draft({ subject: "english", targetNodeId: "kg_english_main_idea", summary: "Plan one English card." }),
    contextSummary: {
      target: { workspaceId: "weixin_stephen", learnerId: "fanfan" },
      knowledgeGraph: { domainPackId: "uk_hk_curriculum_foundation", domain: "english", subject: "english" }
    }
  });
  const failed = store.learningPlanDraftRepository.saveDraft({
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    programId: "program_science",
    horizon: "daily_plan",
    planSummary: "Plan one failed science publish attempt.",
    draft: draft({ summary: "Plan one failed science publish attempt." }),
    contextSummary: {
      target: { workspaceId: "weixin_stephen", learnerId: "fanfan" },
      knowledgeGraph: { domainPackId: "uk_hk_curriculum_foundation", domain: "science", subject: "science" }
    },
    validation: { ok: true, schemaVersion: "growth.learningPlanDraft.v1" },
    createdAt: "2026-06-14T09:30:00.000Z"
  });
  store.learningPlanDraftRepository.markPublishAttempt({
    workspaceId: "weixin_stephen",
    planDraftId: failed.planDraft.planDraftId,
    selectedItemId: "plan_item_kg_science_fair_test",
    status: "failed",
    error: "card_generation_failed",
    stage: "authoring",
    attemptedAt: "2026-06-14T09:32:00.000Z"
  });

  const result = service.listPlanDrafts({
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    programId: "program_science",
    targetNodeIds: ["kg_science_fair_test"],
    limit: 99
  });

  assert.equal(result.ok, true);
  assert.equal(result.count, 2);
  assert.equal(result.summary.planDraftCount, 2);
  assert.equal(result.summary.publishedPlanCount, 1);
  assert.equal(result.summary.failedPublishAttemptCount, 1);
  assert.equal(result.summary.blockedPublishAttemptCount, 0);
  assert.equal(result.summary.lastPublishedAt, "2026-06-14T09:15:00.000Z");
  assert.equal(result.summary.lastPublishAttemptAt, "2026-06-14T09:32:00.000Z");
  assert.equal(result.filters.limit, 50);
  const published = result.planDrafts.find((item) => item.status === "published");
  const failedDraft = result.planDrafts.find((item) => item.publishAttempt.status === "failed");
  assert.equal(published.generatedTaskCardId, "ltask_science_1");
  assert.equal(published.generatedLearningGraphPlanId, "lgp_science_1");
  assert.equal(published.selectedItem.itemId, "plan_item_kg_science_fair_test");
  assert.equal(published.items[0].pressurePolicy.completionPolicy, "daily_score_once");
  assert.deepEqual(published.basisEvidenceIds, ["lgevd_science_1"]);
  assert.equal(failedDraft.publishAttempt.error, "card_generation_failed");
  assert.equal(failedDraft.publishAttempt.stage, "authoring");
  assert.equal(failedDraft.publishAttempt.attemptCount, 1);
  assert.equal(JSON.stringify(result).includes("RAW"), false);
});

test("learning plan audit service fails closed without scope or repository", () => {
  const unavailable = createLearningPlanAuditService();
  assert.deepEqual(unavailable.listPlanDrafts({ workspaceId: "" }), {
    ok: false,
    error: "learning_plan_audit_workspace_required"
  });
  assert.deepEqual(unavailable.listPlanDrafts({ workspaceId: "weixin_stephen" }), {
    ok: false,
    available: false,
    error: "learning_plan_audit_repository_unavailable"
  });
});
