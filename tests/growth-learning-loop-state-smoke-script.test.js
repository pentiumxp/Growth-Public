const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-learning-loop-state.js");

const {
  inputFromArgs,
  projectLearningLoopStateSmokeReadback,
  targetNodeIds
} = require("../scripts/smoke-growth-learning-loop-state");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-learning-loop-state-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  new DatabaseSync(dbPath, { open: true }).close();
  try {
    return callback({ dir, dbPath });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function runScript(args, env = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    env: Object.assign({}, process.env, env),
    encoding: "utf8"
  });
}

function parseStdout(result) {
  return JSON.parse(result.stdout);
}

test("learning-loop state smoke script parses bounded scope and cycle selectors", () => {
  const args = [
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--plan-draft-id", "lgplan_daily_1",
    "--item-id", "plan_item_1",
    "--task-card-id", "ltask_daily_1",
    "--evaluation-id", "leval_daily_1",
    "--profile-delta-id", "lgpdelta_daily_1",
    "--evidence-id", "lgevd_daily_1",
    "--correction-id", "lgcorr_daily_1",
    "--source-id", "source_cycle_daily_1",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--available-minutes", "12",
    "--target-node-id", "kg_science_fair_test",
    "--target-node-ids", "kg_science_fair_test,kg_science_observation_language",
    "--limit", "7",
    "--requested-by", "weixin_owner"
  ];

  assert.deepEqual(targetNodeIds(args), [
    "kg_science_fair_test",
    "kg_science_observation_language"
  ]);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    planDraftId: "lgplan_daily_1",
    itemId: "plan_item_1",
    taskCardId: "ltask_daily_1",
    evaluationId: "leval_daily_1",
    profileDeltaId: "lgpdelta_daily_1",
    evidenceId: "lgevd_daily_1",
    correctionId: "lgcorr_daily_1",
    sourceId: "source_cycle_daily_1",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    availableMinutes: 12,
    limit: 7,
    targetNodeIds: ["kg_science_fair_test", "kg_science_observation_language"],
    requestedBy: "weixin_owner"
  });
});

test("learning-loop state smoke script preserves default minutes and limit", () => {
  assert.deepEqual(inputFromArgs(["--workspace-id", "weixin_fanfan"]), {
    workspaceId: "weixin_fanfan",
    learnerId: "weixin_fanfan",
    programId: "",
    planDraftId: "",
    itemId: "",
    taskCardId: "",
    evaluationId: "",
    profileDeltaId: "",
    evidenceId: "",
    correctionId: "",
    sourceId: "",
    domainPackId: "",
    domain: "",
    subject: "",
    horizon: "daily_plan",
    availableMinutes: 15,
    limit: 12,
    requestedBy: ""
  });
});

test("learning-loop state smoke script projects top-level operator readback", () => {
  const output = projectLearningLoopStateSmokeReadback({
    ok: true,
    source: "growth-learning-loop-state-service",
    schemaVersion: "growth.learningLoopState.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    target: {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan"
    },
    scope: {
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      availableMinutes: 12,
      targetNodeIds: ["kg_science_fair_test", "kg_science_observation_language"]
    },
    status: "ready_to_draft",
    readiness: {
      ready: true,
      targetProvisioned: true,
      learningGraphReady: true,
      plannerReady: true,
      authoringGatewayConfigured: true,
      evaluationGatewayConfigured: true,
      plannerGatewayConfigured: true,
      operatingLoopGatewayReady: true,
      blockingOpenGeneration: false
    },
    profile: {
      weaknessCount: 2,
      evidenceCount: 4
    },
    audit: {
      planDraftCount: 1,
      publishedPlanCount: 1,
      evidenceCount: 4,
      profileDeltaCount: 1,
      correctionCount: 1,
      missingRequired: ["profile_delta"]
    },
    recommendation: {
      available: true,
      recommendationId: "lgrec_1",
      recommendationStatus: "pending",
      strategy: "repair",
      targetNodeId: "kg_science_fair_test",
      targetNodeIds: ["kg_science_fair_test"]
    },
    recommendationEvidence: {
      summary: {
        explanationReady: true,
        evidenceItemCount: 2,
        evidenceIdCount: 3,
        profileDeltaCount: 1,
        correctionCount: 1,
        recommendationLifecycleCount: 2,
        rewardSettlementCount: 1,
        totalRewardCoins: 8
      },
      rewardTrace: {
        summary: {
          rewardSettlementCount: 1,
          totalCoinAmount: 8
        }
      }
    },
    stageAssessment: {
      status: "dormant",
      eligible: false,
      cycleId: "",
      generatedTaskCardId: ""
    },
    nextAction: {
      action: "draft_daily_plan",
      enabled: true,
      reason: "next_strategy:repair",
      endpoint: "/api/v1/growth/daily-loop/draft"
    },
    summary: {
      status: "ready_to_draft",
      readyForDraft: true,
      readyForPublish: false,
      stageCheckpointReady: false,
      stageCheckpointActive: false,
      auditComplete: true,
      recommendationEvidenceReady: true,
      weaknessCount: 2,
      missingRequired: ["profile_delta"]
    }
  });

  assert.equal(output.learningLoopStateStatus, "ready_to_draft");
  assert.equal(output.learningLoopStateReadyForDraft, true);
  assert.equal(output.learningLoopStateReadyForPublish, false);
  assert.equal(output.learningLoopStateAuditComplete, true);
  assert.equal(output.learningLoopStateRecommendationEvidenceReady, true);
  assert.equal(output.learningLoopStateWeaknessCount, 2);
  assert.deepEqual(output.learningLoopStateMissingRequired, ["profile_delta"]);
  assert.equal(output.learningLoopStateMissingRequiredCount, 1);
  assert.equal(output.learningLoopStateNextAction, "draft_daily_plan");
  assert.equal(output.learningLoopStateNextActionEnabled, true);
  assert.equal(output.learningLoopStateNextActionReason, "next_strategy:repair");
  assert.equal(output.learningLoopStateNextActionEndpoint, "/api/v1/growth/daily-loop/draft");
  assert.equal(output.learningLoopStateTargetWorkspaceId, "weixin_fanfan");
  assert.equal(output.learningLoopStateTargetLearnerId, "fanfan");
  assert.equal(output.learningLoopStateDomainPackId, "uk_hk_curriculum_foundation");
  assert.equal(output.learningLoopStateDomain, "science");
  assert.equal(output.learningLoopStateSubject, "science");
  assert.equal(output.learningLoopStateHorizon, "daily_plan");
  assert.equal(output.learningLoopStateAvailableMinutes, 12);
  assert.equal(output.learningLoopStateTargetNodeCount, 2);
  assert.equal(output.learningLoopStateReadinessReady, true);
  assert.equal(output.learningLoopStateTargetProvisioned, true);
  assert.equal(output.learningLoopStateLearningGraphReady, true);
  assert.equal(output.learningLoopStatePlannerReady, true);
  assert.equal(output.learningLoopStateOperatingLoopGatewayReady, true);
  assert.equal(output.learningLoopStateBlockingOpenGeneration, false);
  assert.equal(output.learningLoopStatePlanDraftCount, 1);
  assert.equal(output.learningLoopStatePublishedPlanCount, 1);
  assert.equal(output.learningLoopStateEvidenceCount, 4);
  assert.equal(output.learningLoopStateProfileDeltaCount, 1);
  assert.equal(output.learningLoopStateCorrectionCount, 1);
  assert.equal(output.learningLoopStateRecommendationAvailable, true);
  assert.equal(output.learningLoopStateRecommendationId, "lgrec_1");
  assert.equal(output.learningLoopStateRecommendationStatus, "pending");
  assert.equal(output.learningLoopStateRecommendationStrategy, "repair");
  assert.equal(output.learningLoopStateRecommendationTargetNodeId, "kg_science_fair_test");
  assert.equal(output.learningLoopStateRecommendationTargetNodeCount, 1);
  assert.equal(output.learningLoopStateRecommendationEvidenceItemCount, 2);
  assert.equal(output.learningLoopStateRecommendationEvidenceIdCount, 3);
  assert.equal(output.learningLoopStateRecommendationProfileDeltaCount, 1);
  assert.equal(output.learningLoopStateRecommendationCorrectionCount, 1);
  assert.equal(output.learningLoopStateRecommendationLifecycleCount, 2);
  assert.equal(output.learningLoopStateRewardSettlementCount, 1);
  assert.equal(output.learningLoopStateTotalRewardCoins, 8);
  assert.equal(output.learningLoopStateStageAssessmentStatus, "dormant");
  assert.equal(output.learningLoopStateStageAssessmentEligible, false);
  assert.equal(output.learningLoopStateStageCheckpointActive, false);
  assert.equal(output.learningLoopStateStageAssessmentCycleId, "");
  assert.equal(output.learningLoopStateStageAssessmentGeneratedTaskCardId, "");
});

test("learning-loop state smoke script projects active stage checkpoint readback", () => {
  const output = projectLearningLoopStateSmokeReadback({
    ok: true,
    schemaVersion: "growth.learningLoopState.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "stage_checkpoint_active",
    stageAssessment: {
      status: "active",
      eligible: true,
      cycleId: "stage_cycle_active_1",
      generatedTaskCardId: "ltask_stage_assessment_1"
    },
    nextAction: {
      action: "complete_active_stage_assessment",
      enabled: true,
      reason: "stage_checkpoint_active",
      endpoint: "/api/v1/growth/cards/{taskCardId}/evidence"
    },
    summary: {
      status: "stage_checkpoint_active",
      readyForDraft: false,
      readyForPublish: false,
      stageCheckpointReady: false,
      stageCheckpointActive: true,
      auditComplete: true,
      recommendationEvidenceReady: true,
      missingRequired: []
    }
  });

  assert.equal(output.learningLoopStateStatus, "stage_checkpoint_active");
  assert.equal(output.learningLoopStateReadyForDraft, false);
  assert.equal(output.learningLoopStateStageCheckpointReady, false);
  assert.equal(output.learningLoopStateStageCheckpointActive, true);
  assert.equal(output.learningLoopStateStageAssessmentStatus, "active");
  assert.equal(output.learningLoopStateStageAssessmentEligible, true);
  assert.equal(output.learningLoopStateStageAssessmentCycleId, "stage_cycle_active_1");
  assert.equal(output.learningLoopStateStageAssessmentGeneratedTaskCardId, "ltask_stage_assessment_1");
  assert.equal(output.learningLoopStateNextAction, "complete_active_stage_assessment");
  assert.equal(output.learningLoopStateNextActionEndpoint, "/api/v1/growth/cards/{taskCardId}/evidence");
});

test("learning-loop state smoke script delegates to service without writing", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--domain", "science",
      "--subject", "science",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0);
    const output = parseStdout(result);
    assert.equal(output.ok, true);
    assert.equal(output.source, "growth-learning-loop-state-service");
    assert.equal(output.schemaVersion, "growth.learningLoopState.v1");
    assert.equal(output.target.workspaceId, "weixin_fanfan");
    assert.equal(output.scope.subject, "science");
    assert.equal(output.privacyClass, "summary_only");
    assert.equal(output.learningLoopStateStatus, output.status);
    assert.equal(output.learningLoopStateTargetWorkspaceId, "weixin_fanfan");
    assert.equal(output.learningLoopStateTargetLearnerId, "fanfan");
    assert.equal(output.learningLoopStateDomain, "science");
    assert.equal(output.learningLoopStateSubject, "science");
    assert.equal(output.learningLoopStateHorizon, "daily_plan");
    assert.equal(output.learningLoopStateNextAction, output.nextAction.action);
    assert.equal(output.learningLoopStateReadyForDraft, output.summary.readyForDraft);
    assert.equal(output.learningLoopStateReadyForPublish, output.summary.readyForPublish);
    assert.equal(output.learningLoopStateMissingRequiredCount, output.learningLoopStateMissingRequired.length);
    assert.equal(JSON.stringify(output).includes("rawPrompt"), false);

    const db = new DatabaseSync(dbPath, { open: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = ?").all("table");
    db.close();
    assert.deepEqual(tables, []);
  });
});

test("learning-loop state smoke script fails closed for privacy-risk input", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--input-json", JSON.stringify({ rawPrompt: "do not store" }),
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 1);
    const output = parseStdout(result);
    assert.equal(output.ok, false);
    assert.equal(output.error, "learning_loop_state_privacy_failed");
    assert.equal(output.privacyFindings.includes("$.rawPrompt"), true);
  });
});

test("learning-loop state smoke script fails closed for missing workspace and invalid JSON", () => {
  const missingWorkspace = runScript(["--json"]);
  assert.equal(missingWorkspace.status, 2);
  assert.deepEqual(parseStdout(missingWorkspace), {
    ok: false,
    error: "workspace_id_required"
  });

  const invalidJson = runScript(["--input-json", "{", "--json"]);
  assert.equal(invalidJson.status, 2);
  assert.deepEqual(parseStdout(invalidJson), {
    ok: false,
    error: "learning_loop_state_smoke_invalid_json",
    option: "--input-json"
  });
});
