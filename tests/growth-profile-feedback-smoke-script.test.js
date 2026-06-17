const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-profile-feedback.js");

const {
  inputFromArgs,
  projectProfileFeedbackSmokeReadback,
  targetNodeIds
} = require("../scripts/smoke-growth-profile-feedback");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-profile-feedback-smoke-"));
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

test("profile-feedback smoke script parses bounded cycle scope", () => {
  const args = [
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--plan-draft-id", "lgplan_daily_1",
    "--task-card-id", "ltask_daily_1",
    "--evaluation-id", "leval_daily_1",
    "--profile-delta-id", "lgpdelta_daily_1",
    "--evidence-id", "lgevd_daily_1",
    "--correction-id", "lgcorr_daily_1",
    "--source-id", "source_daily_1",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--available-minutes", "12",
    "--auto-select-completed-cycle",
    "--auto-select-latest-completed-cycle",
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
    taskCardId: "ltask_daily_1",
    evaluationId: "leval_daily_1",
    profileDeltaId: "lgpdelta_daily_1",
    evidenceId: "lgevd_daily_1",
    correctionId: "lgcorr_daily_1",
    sourceId: "source_daily_1",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    availableMinutes: 12,
    limit: 7,
    targetNodeIds: ["kg_science_fair_test", "kg_science_observation_language"],
    autoSelectCompletedCycle: true,
    autoSelectLatestCompletedCycle: true,
    requestedBy: "weixin_owner"
  });
});

test("profile-feedback smoke script projects top-level operator readback", () => {
  const output = projectProfileFeedbackSmokeReadback({
    ok: true,
    source: "growth-learning-profile-feedback-evidence-service",
    schemaVersion: "growth.learningProfileFeedbackEvidence.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "pass",
    complete: true,
    readyForAutomation: true,
    readyForNextPlan: true,
    scope: {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      availableMinutes: 12,
      taskCardId: "ltask_daily_1",
      evaluationId: "leval_daily_1",
      profileDeltaId: "lgpdelta_daily_1",
      evidenceId: "lgevd_daily_1",
      targetNodeIds: ["kg_science_fair_test"],
      autoSelectCompletedCycle: true,
      autoSelectLatestCompletedCycle: true,
      limit: 12
    },
    checks: [
      { key: "cycle_audit_complete", status: "pass" },
      { key: "evidence_ledger_present", status: "pass" },
      { key: "profile_delta_audit_present", status: "pass" },
      { key: "profile_v2_projected", status: "pass" },
      { key: "next_recommendation_available", status: "pass" },
      { key: "learning_loop_state_ready", status: "pass" }
    ],
    profile: {
      available: true,
      capabilityStateCount: 4,
      evidenceCount: 3,
      weaknessCount: 1,
      strengthCount: 2,
      staleCount: 1,
      plannerStrategy: "repair"
    },
    evidence: {
      available: true,
      count: 2,
      sourceTypes: ["daily_evaluation"],
      graphNodeIds: ["kg_science_fair_test"]
    },
    profileDelta: {
      available: true,
      count: 1,
      latestProfileDeltaId: "lgpdelta_daily_1",
      changedCapabilityCount: 2
    },
    recommendation: {
      available: true,
      mode: "trajectory",
      status: "pending",
      strategy: "repair",
      cardRole: "repair",
      targetNodeId: "kg_science_fair_test",
      targetNodeIds: ["kg_science_fair_test"],
      reason: "Observation language still needs repair."
    },
    loopState: {
      available: true,
      status: "ready_to_draft",
      nextAction: {
        action: "draft_daily_plan",
        enabled: true,
        targetNodeId: "kg_science_fair_test"
      },
      auditComplete: true,
      missingRequired: [],
      reward: {
        available: true,
        rewardSettlementCount: 1,
        totalRewardCoins: 8,
        latestRewardSettlementId: "lreward_daily_1"
      }
    },
    selectorDiscovery: {
      available: true,
      status: "candidate_available",
      cycleCount: 2,
      completeCount: 1,
      readyForAutomationCount: 1,
      candidateCount: 1
    },
    autoSelection: {
      attempted: true,
      status: "selected_unique_completed_cycle",
      candidateCount: 1,
      selected: {
        cycleId: "cycle_daily_1",
        taskCardId: "ltask_daily_1"
      }
    },
    selectedCompletedCycle: {
      cycleId: "cycle_daily_1",
      taskCardId: "ltask_daily_1"
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
      selectorDiscoveryStatus: "candidate_available",
      autoSelectionStatus: "selected_unique_completed_cycle",
      selectedCycleId: "cycle_daily_1",
      selectedTaskCardId: "ltask_daily_1",
      nextAction: "draft_daily_plan"
    }
  });

  assert.equal(output.profileFeedbackStatus, "pass");
  assert.equal(output.profileFeedbackReadyForNextPlan, true);
  assert.equal(output.profileFeedbackCycleComplete, true);
  assert.equal(output.profileFeedbackReadyForAutomation, true);
  assert.equal(output.profileFeedbackTargetWorkspaceId, "weixin_fanfan");
  assert.equal(output.profileFeedbackTargetLearnerId, "fanfan");
  assert.equal(output.profileFeedbackProgramId, "program_science");
  assert.equal(output.profileFeedbackDomainPackId, "uk_hk_curriculum_foundation");
  assert.equal(output.profileFeedbackSubject, "science");
  assert.equal(output.profileFeedbackTaskCardId, "ltask_daily_1");
  assert.equal(output.profileFeedbackEvaluationId, "leval_daily_1");
  assert.deepEqual(output.profileFeedbackTargetNodeIds, ["kg_science_fair_test"]);
  assert.equal(output.profileFeedbackCheckCount, 6);
  assert.equal(output.profileFeedbackPassCheckCount, 6);
  assert.equal(output.profileFeedbackMissingRequiredCount, 0);
  assert.equal(output.profileFeedbackEvidenceCount, 2);
  assert.deepEqual(output.profileFeedbackEvidenceSourceTypes, ["daily_evaluation"]);
  assert.equal(output.profileFeedbackProfileDeltaCount, 1);
  assert.equal(output.profileFeedbackLatestProfileDeltaId, "lgpdelta_daily_1");
  assert.equal(output.profileFeedbackProfileAvailable, true);
  assert.equal(output.profileFeedbackProfileEvidenceCount, 3);
  assert.equal(output.profileFeedbackProfileWeaknessCount, 1);
  assert.equal(output.profileFeedbackRecommendationAvailable, true);
  assert.equal(output.profileFeedbackRecommendationMode, "trajectory");
  assert.equal(output.profileFeedbackRecommendationStrategy, "repair");
  assert.equal(output.profileFeedbackRecommendationTargetNodeId, "kg_science_fair_test");
  assert.equal(output.profileFeedbackLoopStateAvailable, true);
  assert.equal(output.profileFeedbackLoopStatus, "ready_to_draft");
  assert.equal(output.profileFeedbackLoopNextAction, "draft_daily_plan");
  assert.equal(output.profileFeedbackLoopAuditComplete, true);
  assert.equal(output.profileFeedbackRewardAvailable, true);
  assert.equal(output.profileFeedbackRewardSettlementCount, 1);
  assert.equal(output.profileFeedbackTotalRewardCoins, 8);
  assert.equal(output.profileFeedbackSelectorDiscoveryStatus, "candidate_available");
  assert.equal(output.profileFeedbackSelectorCandidateCount, 1);
  assert.equal(output.profileFeedbackAutoSelectionAttempted, true);
  assert.equal(output.profileFeedbackAutoSelectionStatus, "selected_unique_completed_cycle");
  assert.equal(output.profileFeedbackSelectedCycleId, "cycle_daily_1");
  assert.equal(output.profileFeedbackSelectedTaskCardId, "ltask_daily_1");
});

test("profile-feedback smoke script returns bounded missing evidence without writing business state", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--task-card-id", "ltask_missing_daily_1",
      "--target-node-id", "kg_science_fair_test",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 1);
    const output = parseStdout(result);
    assert.equal(output.ok, false);
    assert.equal(output.source, "growth-learning-profile-feedback-evidence-service");
    assert.equal(output.schemaVersion, "growth.learningProfileFeedbackEvidence.v1");
    assert.equal(output.privacyClass, "summary_only");
    assert.equal(output.status === "missing" || output.status === "blocked", true);
    assert.equal(output.scope.taskCardId, "ltask_missing_daily_1");
    assert.equal(output.profileFeedbackStatus, output.status);
    assert.equal(output.profileFeedbackTargetWorkspaceId, "weixin_fanfan");
    assert.equal(output.profileFeedbackTargetLearnerId, "fanfan");
    assert.equal(output.profileFeedbackProgramId, "program_science");
    assert.equal(output.profileFeedbackTaskCardId, "ltask_missing_daily_1");
    assert.equal(output.profileFeedbackTargetNodeCount, 1);
    assert.equal(output.profileFeedbackReadyForNextPlan, false);
    assert.equal(output.profileFeedbackMissingRequiredCount > 0, true);
    assert.equal(output.profileFeedbackCheckCount > 0, true);
    assert.equal(JSON.stringify(output).includes("rawPrompt"), false);

    const db = new DatabaseSync(dbPath, { open: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = ?").all("table");
    db.close();
    assert.deepEqual(tables, []);
  });
});

test("profile-feedback smoke script fails closed for missing workspace and invalid JSON", () => {
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
    error: "profile_feedback_smoke_invalid_json",
    option: "--input-json"
  });
});

test("profile-feedback smoke script fails closed for privacy-risk input", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--task-card-id", "ltask_daily_1",
      "--input-json", JSON.stringify({ rawPrompt: "do not store" }),
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 1);
    const output = parseStdout(result);
    assert.equal(output.ok, false);
    assert.equal(output.error, "profile_feedback_privacy_failed");
    assert.equal(output.privacyFindings.includes("$.rawPrompt"), true);
  });
});
