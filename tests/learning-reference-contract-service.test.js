const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const { createLearningReferenceContractService } = require("../src/services/learning-reference-contract-service");
const { createLearningReferenceProjectionRepository } = require("../src/stores/growth-learning-sqlite/reference-projection");

async function tmpDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-reference-contract-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(`
      CREATE TABLE learning_programs (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT '',
        domain TEXT NOT NULL DEFAULT '',
        subject TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE learning_task_cards (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE learning_task_submissions (
        id TEXT PRIMARY KEY,
        task_card_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT '',
        submission_kind TEXT NOT NULL DEFAULT '',
        submitted_at TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT '',
        workspace_id TEXT NOT NULL DEFAULT '',
        raw_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE learning_evaluations (
        id TEXT PRIMARY KEY,
        task_card_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT '',
        score REAL NOT NULL DEFAULT 0,
        passed INTEGER NOT NULL DEFAULT 0,
        summary TEXT NOT NULL DEFAULT '',
        confidence REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT '',
        workspace_id TEXT NOT NULL DEFAULT '',
        raw_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE learning_task_reflections (
        id TEXT PRIMARY KEY,
        task_card_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT '',
        mode TEXT NOT NULL DEFAULT '',
        score REAL NOT NULL DEFAULT 0,
        summary TEXT NOT NULL DEFAULT '',
        audio_digest TEXT NOT NULL DEFAULT '',
        submitted_at TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT '',
        workspace_id TEXT NOT NULL DEFAULT '',
        raw_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE learning_growth_plan_drafts (
        plan_draft_id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        learner_id TEXT NOT NULL DEFAULT '',
        program_id TEXT NOT NULL DEFAULT '',
        horizon TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT '',
        plan_summary TEXT NOT NULL DEFAULT '',
        draft_json TEXT NOT NULL DEFAULT '{}',
        context_summary_json TEXT NOT NULL DEFAULT '{}',
        validation_json TEXT NOT NULL DEFAULT '{}',
        selected_item_id TEXT NOT NULL DEFAULT '',
        generated_task_card_id TEXT NOT NULL DEFAULT '',
        generated_learning_graph_plan_id TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL DEFAULT '',
        privacy_class TEXT NOT NULL DEFAULT 'summary_only',
        last_publish_status TEXT NOT NULL DEFAULT '',
        last_publish_error TEXT NOT NULL DEFAULT '',
        last_publish_stage TEXT NOT NULL DEFAULT '',
        last_publish_item_id TEXT NOT NULL DEFAULT '',
        last_publish_attempt_at TEXT NOT NULL DEFAULT '',
        publish_attempt_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT '',
        published_at TEXT NOT NULL DEFAULT ''
      );
    `);
    db.prepare("INSERT INTO learning_programs(id, workspace_id, title, status, domain, subject, created_at, updated_at) VALUES ('program_1', 'weixin_fanfan', 'Science program', 'active', 'science', 'science', '2026-06-17T01:00:00.000Z', '2026-06-17T02:00:00.000Z')").run();
    db.prepare("INSERT INTO learning_task_cards(id, workspace_id) VALUES ('card_1', 'weixin_fanfan')").run();
    db.prepare("INSERT INTO learning_task_submissions(id, task_card_id, status, submission_kind, submitted_at, created_at, workspace_id, raw_json) VALUES ('submission_1', 'card_1', 'submitted', 'text_audio', '2026-06-17T03:00:00.000Z', '2026-06-17T03:00:00.000Z', 'weixin_fanfan', ?)").run(JSON.stringify({ answerText: "must not surface" }));
    db.prepare("INSERT INTO learning_evaluations(id, task_card_id, status, score, passed, summary, confidence, created_at, workspace_id, raw_json) VALUES ('evaluation_1', 'card_1', 'completed', 82, 1, 'Good summary', 0.8, '2026-06-17T04:00:00.000Z', 'weixin_fanfan', ?)").run(JSON.stringify({ rawPrompt: "must not surface", remainingWeaknesses: ["explain evidence"] }));
    db.prepare("INSERT INTO learning_task_reflections(id, task_card_id, status, mode, score, summary, audio_digest, submitted_at, created_at, workspace_id, raw_json) VALUES ('reflection_1', 'card_1', 'submitted', 'text_audio', 1, 'Short reflection', 'sha256:abc', '2026-06-17T05:00:00.000Z', '2026-06-17T05:00:00.000Z', 'weixin_fanfan', ?)").run(JSON.stringify({ transcript: "must not surface" }));
    db.prepare("INSERT INTO learning_growth_plan_drafts(plan_draft_id, workspace_id, learner_id, program_id, horizon, status, plan_summary, draft_json, context_summary_json, selected_item_id, generated_task_card_id, generated_learning_graph_plan_id, source, privacy_class, created_at, updated_at) VALUES ('plan_draft_1', 'weixin_fanfan', 'fanfan', 'program_1', 'daily_plan', 'published', 'Daily science plan', ?, ?, 'item_1', 'card_1', 'graph_plan_1', 'test', 'summary_only', '2026-06-17T00:00:00.000Z', '2026-06-17T01:00:00.000Z')")
      .run(JSON.stringify({ items: [{ itemId: "item_1", targetNodeIds: ["node_science"] }] }), JSON.stringify({ domain: "science", subject: "science", domainPackId: "domain_pack_1" }));
  } finally {
    db.close();
  }
  try {
    return await callback({ dbPath });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function repositoryFor(dbPath) {
  return createLearningReferenceProjectionRepository({
    open(readOnly = true) {
      return new DatabaseSync(dbPath, { open: true, readOnly });
    }
  });
}

function serviceFor(dbPath) {
  return createLearningReferenceContractService({
    repository: repositoryFor(dbPath),
    growthService: {
      async card({ workspaceId, taskCardId }) {
        if (workspaceId !== "weixin_fanfan" || taskCardId !== "card_1") return { ok: false };
        return {
          ok: true,
          card: {
            taskCardId,
            workspaceId,
            programId: "program_1",
            draftId: "plan_draft_1",
            title: "Observe water",
            instructionPreview: "must not surface",
            teachingFlow: { hidden: true },
            domain: "science",
            cardRole: "practice",
            activityType: "short_response",
            plannedDate: "2026-06-17",
            plannedMinutes: 12,
            expectedDurationMinutes: { min: 10, max: 15 },
            targetNodeIds: ["node_science"],
            capabilityClusterId: "science.observation",
            status: "active",
            nextAction: "submit",
            laneId: "today",
            submissionCount: 1,
            evaluationCount: 1,
            artifactCount: 0,
            latestSubmission: {
              submissionId: "submission_1",
              status: "submitted",
              submittedAt: "2026-06-17T03:00:00.000Z"
            },
            latestEvaluation: {
              evaluationId: "evaluation_1",
              status: "completed",
              score: 82,
              maxScore: 100,
              evaluatedAt: "2026-06-17T04:00:00.000Z"
            },
            latestReflection: {
              reflectionId: "reflection_1",
              status: "submitted",
              submittedAt: "2026-06-17T05:00:00.000Z"
            }
          }
        };
      }
    },
    profileV2Service: {
      profileV2({ workspaceId, learnerId }) {
        return {
          ok: true,
          workspaceId,
          learnerId,
          programId: "program_1",
          summary: {
            capabilityStateCount: 2,
            evidenceCount: 3,
            strengthCount: 1,
            weaknessCount: 1,
            pressureSignalCount: 0,
            staleEvidenceCount: 0
          },
          strengths: [{ nodeId: "node_strength" }],
          weaknesses: [{ nodeId: "node_weak" }],
          recommendedPlannerHints: {
            strategy: "repair",
            targetNodeIds: ["node_weak"]
          }
        };
      }
    },
    profileFeedbackService: {
      evaluate(input = {}) {
        assert.equal(input.workspaceId, "weixin_fanfan");
        if (input.taskCardId !== "card_1" && input.evaluationId !== "evaluation_1" && input.autoSelectLatestCompletedCycle !== true) {
          return { ok: false, error: "profile_feedback_cycle_selector_required", summaryOnly: true };
        }
        return {
          ok: true,
          source: "growth-learning-profile-feedback-evidence-service",
          schemaVersion: "growth.learningProfileFeedbackEvidence.v1",
          privacyClass: "summary_only",
          summaryOnly: true,
          status: "pass",
          readyForNextPlan: true,
          readyForAutomation: true,
          scope: {
            workspaceId: "weixin_fanfan",
            learnerId: "fanfan",
            programId: "program_1",
            taskCardId: "card_1",
            evaluationId: "evaluation_1",
            planDraftId: "plan_draft_1",
            targetNodeIds: ["node_science"]
          },
          profile: {
            evidenceCount: 3,
            weaknessCount: 1
          },
          evidence: {
            count: 2
          },
          profileDelta: {
            count: 1,
            latestProfileDeltaId: "profile_delta_1"
          },
          recommendation: {
            mode: "trajectory",
            strategy: "repair",
            targetNodeIds: ["node_science"],
            targetNodeId: "node_science"
          },
          loopState: {
            status: "ready_to_draft",
            nextAction: { action: "draft_daily_plan", targetNodeId: "node_science" },
            reward: { rewardSettlementCount: 1, totalRewardCoins: 8 }
          },
          summary: {
            readyForNextPlan: true,
            missingRequired: [],
            cycleComplete: true,
            evidenceCount: 2,
            profileDeltaCount: 1,
            profileEvidenceCount: 3,
            profileWeaknessCount: 1,
            rewardSettlementCount: 1,
            totalRewardCoins: 8,
            recommendationMode: "trajectory",
            recommendationStrategy: "repair",
            loopStatus: "ready_to_draft",
            selectedCycleId: "cycle_1",
            selectedTaskCardId: "card_1",
            nextAction: "draft_daily_plan"
          },
          selectedCompletedCycle: {
            cycleId: "cycle_1",
            taskCardId: "card_1",
            evaluationId: "evaluation_1",
            planDraftId: "plan_draft_1",
            latestActivityAt: "2026-06-17T06:00:00.000Z"
          }
        };
      }
    },
    graphRepository: {
      plan({ learningGraphPlanId }) {
        if (learningGraphPlanId !== "graph_plan_1") return null;
        return {
          learningGraphPlanId,
          workspaceId: "weixin_fanfan",
          learnerId: "fanfan",
          programId: "program_1",
          domainPackId: "domain_pack_1",
          domain: "science",
          subject: "science",
          targetNodeId: "node_science",
          prerequisiteNodeIds: ["node_prereq"],
          pathNodeIds: ["node_prereq", "node_science"],
          assessmentCoverage: [],
          cardSequence: [{}],
          privacyClass: "summary_only"
        };
      }
    }
  });
}

function assertSummaryOnly(payload) {
  const text = JSON.stringify(payload).toLowerCase();
  assert.equal(text.includes("must not surface"), false);
  assert.equal(text.includes("rawprompt"), false);
  assert.equal(text.includes("answertext"), false);
  assert.equal(text.includes("transcript"), false);
  assert.equal(text.includes("teachingflow"), false);
  assert.equal(text.includes("instructionpreview"), false);
}

test("Growth reference contract lists V1-minimal summary-only object types", () => {
  const service = createLearningReferenceContractService();
  const result = service.referenceObjectTypes({ workspaceId: "weixin_fanfan" });
  assert.equal(result.ok, true);
  assert.equal(result.status, "v1_minimal");
  assert.deepEqual(result.objectTypes.map((item) => item.objectType), [
    "program",
    "task_card",
    "submission",
    "evaluation",
    "reflection",
    "mastery_profile",
    "learning_graph_plan",
    "plan_draft",
    "profile_feedback"
  ]);
  assert.equal(result.boundaries.summaryOnly, true);
});

test("Growth reference contract returns bounded task-card references", async () => {
  await tmpDb(async ({ dbPath }) => {
    const result = await serviceFor(dbPath).referenceGet({
      workspaceId: "weixin_fanfan",
      objectType: "task_card",
      objectId: "card_1"
    });
    assert.equal(result.ok, true);
    assert.equal(result.schemaVersion, "growth.referenceObject.v1");
    assert.equal(result.privacyClass, "summary_only");
    assert.equal(result.reference.plugin_id, "growth");
    assert.equal(result.reference.object_type, "task_card");
    assert.equal(result.summary.taskCardId, "card_1");
    assert.equal(result.summary.submissionCount, 1);
    assert.equal(result.summary.latestEvaluation.score, 82);
    assert.equal(result.relatedObjectRefs.some((ref) => ref.object_type === "evaluation" && ref.object_id === "evaluation_1"), true);
    assertSummaryOnly(result);
  });
});

test("Growth reference contract resolves SQLite-backed learning evidence objects", async () => {
  await tmpDb(async ({ dbPath }) => {
    const service = serviceFor(dbPath);
    const program = await service.referenceGet({ workspaceId: "weixin_fanfan", objectType: "program", objectId: "program_1" });
    assert.equal(program.summary.domain, "science");
    const submission = await service.referenceGet({ workspaceId: "weixin_fanfan", objectType: "submission", objectId: "submission_1" });
    assert.equal(submission.summary.taskCardId, "card_1");
    const evaluation = await service.referenceGet({ workspaceId: "weixin_fanfan", objectType: "evaluation", objectId: "evaluation_1" });
    assert.equal(evaluation.summary.score, 82);
    const reflection = await service.referenceGet({ workspaceId: "weixin_fanfan", objectType: "reflection", objectId: "reflection_1" });
    assert.equal(reflection.summary.hasAudio, true);
    const draft = await service.referenceGet({ workspaceId: "weixin_fanfan", objectType: "plan_draft", objectId: "plan_draft_1" });
    assert.equal(draft.summary.itemCount, 1);
    assertSummaryOnly({ program, submission, evaluation, reflection, draft });
  });
});

test("Growth reference contract summarizes profile and graph-plan references", async () => {
  await tmpDb(async ({ dbPath }) => {
    const service = serviceFor(dbPath);
    const profile = await service.referenceSummarize({
      workspaceId: "weixin_fanfan",
      objectType: "mastery_profile",
      objectId: "fanfan",
      purpose: "graph_display"
    });
    assert.equal(profile.schemaVersion, "growth.referenceSummary.v1");
    assert.equal(profile.summary.counts.evidenceCount, 3);
    assert.equal(profile.summary.counts.targetNodeCount, 1);
    const graphPlan = await service.referenceGet({
      workspaceId: "weixin_fanfan",
      objectType: "learning_graph_plan",
      objectId: "graph_plan_1"
    });
    assert.equal(graphPlan.summary.targetNodeId, "node_science");
    assert.equal(graphPlan.summary.pathNodeCount, 2);
    assertSummaryOnly({ profile, graphPlan });
  });
});

test("Growth reference contract resolves profile-feedback references through the feedback service", async () => {
  await tmpDb(async ({ dbPath }) => {
    const service = serviceFor(dbPath);
    const feedback = await service.referenceGet({
      workspaceId: "weixin_fanfan",
      objectType: "profile_feedback",
      objectId: "task_card:card_1"
    });
    assert.equal(feedback.ok, true);
    assert.equal(feedback.reference.object_type, "profile_feedback");
    assert.equal(feedback.objectId, "task_card:card_1");
    assert.equal(feedback.summary.readyForNextPlan, true);
    assert.equal(feedback.summary.evidenceCount, 2);
    assert.equal(feedback.summary.profileDeltaCount, 1);
    assert.equal(feedback.summary.rewardSettlementCount, 1);
    assert.equal(feedback.summary.totalRewardCoins, 8);
    assert.equal(feedback.summary.nextAction, "draft_daily_plan");
    assert.deepEqual(feedback.summary.targetNodeIds, ["node_science"]);
    assert.equal(feedback.relatedObjectRefs.some((ref) => ref.object_type === "task_card" && ref.object_id === "card_1"), true);
    assert.equal(feedback.relatedObjectRefs.some((ref) => ref.object_type === "mastery_profile" && ref.object_id === "fanfan"), true);
    const summary = await service.referenceSummarize({
      workspaceId: "weixin_fanfan",
      objectType: "completed_cycle_feedback",
      objectId: "evaluation:evaluation_1",
      purpose: "owner_loop"
    });
    assert.equal(summary.objectType, "profile_feedback");
    assert.equal(summary.summary.counts.evidenceCount, 2);
    assert.equal(summary.summary.counts.targetNodeCount, 1);
    assertSummaryOnly({ feedback, summary });
  });
});

test("Growth reference contract fails closed for unsupported, missing, or invisible objects", async () => {
  await tmpDb(async ({ dbPath }) => {
    const service = serviceFor(dbPath);
    assert.equal((await service.referenceGet({ workspaceId: "weixin_fanfan", objectType: "unknown", objectId: "x" })).error, "growth_reference_object_type_unsupported");
    assert.equal((await service.referenceGet({ workspaceId: "weixin_fanfan", objectType: "task_card" })).error, "growth_reference_object_id_required");
    assert.equal((await service.referenceGet({ workspaceId: "other", objectType: "submission", objectId: "submission_1" })).error, "growth_reference_object_not_found");
    assert.equal((await service.referenceGet({ workspaceId: "other", objectType: "learning_graph_plan", objectId: "graph_plan_1" })).error, "growth_reference_object_not_found");
    assert.equal((await service.referenceGet({ workspaceId: "weixin_fanfan", objectType: "profile_feedback", objectId: "source:missing" })).error, "growth_reference_object_not_found");
  });
});
