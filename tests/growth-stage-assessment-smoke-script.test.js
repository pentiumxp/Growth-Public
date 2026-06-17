const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-stage-assessment.js");

const {
  allowWrite,
  inputFromArgs,
  operationFromArgs,
  projectStageAssessmentSmokeReadback,
  runOperation,
  sourceCardIds,
  targetNodeIds,
  validateOperation
} = require("../scripts/smoke-growth-stage-assessment");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-stage-assessment-smoke-"));
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

test("stage-assessment smoke script parses bounded stage checkpoint selectors", () => {
  const args = [
    "--operation", "activate",
    "--allow-write",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--subject", "science",
    "--capability-cluster-id", "science_observation",
    "--target-node-id", "kg_science_fair_test",
    "--assessment-coverage-node-ids", "kg_science_fair_test,kg_science_observation_language",
    "--stage-assessment-cycle-id", "lgsa_cycle_1",
    "--task-card-id", "ltask_stage_1",
    "--activation-source", "owner_manual",
    "--activation-reason", "owner_checkpoint",
    "--difficulty-band", "assessment",
    "--generation-key", "stage-smoke-1",
    "--cooldown-until", "2026-06-20T00:00:00.000Z",
    "--source-card-id", "ltask_daily_1",
    "--source-card-ids", "ltask_daily_1,ltask_daily_2",
    "--evidence-requirements-json", JSON.stringify({ requireExplanation: true }),
    "--source-summaries-json", JSON.stringify([{ sourceCardId: "ltask_daily_1", summary: "observation practice" }]),
    "--note", "Owner wants a formal checkpoint."
  ];

  assert.equal(operationFromArgs(args), "activate");
  assert.equal(allowWrite(args), true);
  assert.deepEqual(targetNodeIds(args), [
    "kg_science_fair_test",
    "kg_science_observation_language"
  ]);
  assert.deepEqual(sourceCardIds(args), ["ltask_daily_1", "ltask_daily_2"]);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    subjectId: "science",
    capabilityClusterId: "science_observation",
    targetNodeId: "kg_science_fair_test",
    targetNodeIds: ["kg_science_fair_test", "kg_science_observation_language"],
    assessmentCoverageNodeIds: ["kg_science_fair_test", "kg_science_observation_language"],
    stageAssessmentCycleId: "lgsa_cycle_1",
    cycleId: "lgsa_cycle_1",
    taskCardId: "ltask_stage_1",
    activationSource: "owner_manual",
    activationReason: "owner_checkpoint",
    difficultyBand: "assessment",
    generationKey: "stage-smoke-1",
    cooldownUntil: "2026-06-20T00:00:00.000Z",
    completedAt: "",
    cardRole: "stage_assessment",
    note: "Owner wants a formal checkpoint.",
    sourceCardIds: ["ltask_daily_1", "ltask_daily_2"],
    evidenceRequirements: { requireExplanation: true },
    sourceSummaries: [{ sourceCardId: "ltask_daily_1", summary: "observation practice" }],
    evaluation: {},
    taskCard: {
      id: "ltask_stage_1",
      taskCardId: "ltask_stage_1",
      workspace_id: "weixin_fanfan",
      learner_id: "fanfan",
      program_id: "program_science",
      subject_id: "science",
      capability_cluster_id: "science_observation",
      card_role: "stage_assessment",
      stage_assessment_cycle_id: "lgsa_cycle_1",
      skill_ids_json: "[\"kg_science_fair_test\",\"kg_science_observation_language\"]"
    }
  });
});

test("stage-assessment smoke script write-gates mutating operations", () => {
  const input = {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    targetNodeId: "kg_science_fair_test",
    assessmentCoverageNodeIds: ["kg_science_fair_test"],
    activationSource: "owner_manual",
    stageAssessmentCycleId: "lgsa_cycle_1",
    taskCardId: "ltask_stage_1",
    taskCard: { id: "ltask_stage_1", card_role: "stage_assessment", stage_assessment_cycle_id: "lgsa_cycle_1" }
  };

  assert.deepEqual(validateOperation("readiness", input, []), { ok: true });
  assert.deepEqual(validateOperation("eligibility", input, ["--operation", "eligibility"]), {
    ok: false,
    error: "stage_assessment_smoke_write_not_allowed",
    operation: "eligibility",
    requiredFlag: "--allow-write"
  });
  assert.deepEqual(validateOperation("activate", input, ["--operation", "activate"]), {
    ok: false,
    error: "stage_assessment_smoke_write_not_allowed",
    operation: "activate",
    requiredFlag: "--allow-write"
  });
  assert.deepEqual(validateOperation("complete", input, ["--operation", "complete"]), {
    ok: false,
    error: "stage_assessment_smoke_write_not_allowed",
    operation: "complete",
    requiredFlag: "--allow-write"
  });
  assert.deepEqual(validateOperation("repair", input, []), {
    ok: false,
    error: "stage_assessment_smoke_operation_invalid",
    operation: "repair",
    allowedOperations: ["readiness", "eligibility", "activate", "complete"]
  });
});

test("stage-assessment smoke script delegates operations to stage assessment service only", async () => {
  const calls = [];
  const service = {
    stageReadiness(input) {
      calls.push(["readiness", input.targetNodeId]);
      return { ok: true, activationState: "eligible", source: "stage-service" };
    },
    evaluateEligibility(input) {
      calls.push(["eligibility", input.targetNodeId]);
      return { ok: true, eligible: true, activationState: "eligible" };
    },
    activateStageAssessment(input) {
      calls.push(["activate", input.activationSource]);
      return { ok: true, activationState: "active", published: { taskCardId: "ltask_stage_1" } };
    },
    recordAssessmentCompletion(input) {
      calls.push(["complete", input.taskCard.id]);
      return { ok: true, activationState: "cooldown", cycle: { cycleId: input.stageAssessmentCycleId } };
    }
  };
  const input = {
    workspaceId: "weixin_fanfan",
    targetNodeId: "kg_science_fair_test",
    assessmentCoverageNodeIds: ["kg_science_fair_test"],
    activationSource: "owner_manual",
    stageAssessmentCycleId: "lgsa_cycle_1",
    taskCardId: "ltask_stage_1",
    taskCard: { id: "ltask_stage_1", card_role: "stage_assessment", stage_assessment_cycle_id: "lgsa_cycle_1" }
  };

  assert.equal((await runOperation(service, "readiness", input)).activationState, "eligible");
  assert.equal((await runOperation(service, "eligibility", input)).eligible, true);
  assert.equal((await runOperation(service, "activate", input)).published.taskCardId, "ltask_stage_1");
  assert.equal((await runOperation(service, "complete", input)).activationState, "cooldown");
  assert.deepEqual(calls.map((call) => call[0]), ["readiness", "eligibility", "activate", "complete"]);
});

test("stage-assessment smoke script projects operator readback", () => {
  const projected = projectStageAssessmentSmokeReadback({
    ok: true,
    eligible: true,
    activationState: "eligible",
    reason: "enough_recent_practice",
    cycle: {
      cycleId: "lgsa_cycle_1",
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      subjectId: "science",
      capabilityClusterId: "science_observation",
      targetNodeIds: ["kg_science_fair_test", "kg_science_observation_language"],
      status: "eligible",
      activationReason: "enough_recent_practice",
      activationSource: "system",
      sourceCardIds: ["ltask_daily_1", "ltask_daily_2"]
    },
    evidence: {
      minimumRecentOrdinaryCards: 4,
      recentTrajectoryCount: 5,
      recentExperienceSignalCount: 2,
      highPressureSignalCount: 0,
      challengeSignalCount: 1,
      sourceCardIds: ["ltask_daily_1", "ltask_daily_2"]
    },
    profileSummary: {
      masteryStateCount: 7,
      weaknessCount: 2,
      strengthCount: 3
    }
  }, "readiness", {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    subjectId: "science",
    capabilityClusterId: "science_observation",
    targetNodeId: "kg_science_fair_test",
    assessmentCoverageNodeIds: ["kg_science_fair_test", "kg_science_observation_language"]
  }, false);

  assert.equal(projected.stageAssessmentStatus, "eligible");
  assert.equal(projected.stageAssessmentOk, true);
  assert.equal(projected.stageAssessmentOperation, "readiness");
  assert.equal(projected.stageAssessmentWriteOperation, false);
  assert.equal(projected.stageAssessmentWriteAllowed, false);
  assert.equal(projected.stageAssessmentWritesPerformed, false);
  assert.equal(projected.stageAssessmentWorkspaceId, "weixin_fanfan");
  assert.equal(projected.stageAssessmentLearnerId, "fanfan");
  assert.equal(projected.stageAssessmentProgramId, "program_science");
  assert.equal(projected.stageAssessmentSubjectId, "science");
  assert.equal(projected.stageAssessmentTargetNodeId, "kg_science_fair_test");
  assert.deepEqual(projected.stageAssessmentAssessmentCoverageNodeIds, ["kg_science_fair_test", "kg_science_observation_language"]);
  assert.equal(projected.stageAssessmentEligible, true);
  assert.equal(projected.stageAssessmentActivationState, "eligible");
  assert.equal(projected.stageAssessmentReason, "enough_recent_practice");
  assert.equal(projected.stageAssessmentCycleId, "lgsa_cycle_1");
  assert.equal(projected.stageAssessmentCycleStatus, "eligible");
  assert.equal(projected.stageAssessmentActivationSource, "system");
  assert.equal(projected.stageAssessmentRecentTrajectoryCount, 5);
  assert.equal(projected.stageAssessmentChallengeSignalCount, 1);
  assert.equal(projected.stageAssessmentSourceCardCount, 2);
  assert.deepEqual(projected.stageAssessmentSourceCardIds, ["ltask_daily_1", "ltask_daily_2"]);
  assert.equal(projected.stageAssessmentProfileWeaknessCount, 2);
});

test("stage-assessment smoke script runs readiness on a temporary SQLite db without creating stage cycles", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--subject", "science",
      "--target-node-id", "kg_science_fair_test",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    const output = parseStdout(result);
    assert.equal(result.status, 0);
    assert.equal(output.operation, "readiness");
    assert.equal(output.ok, true);
    assert.equal(output.activationState, "dormant");
    assert.equal(output.reason, "insufficient_recent_practice");
    assert.equal(output.evidence.recentTrajectoryCount, 0);
    assert.equal(output.stageAssessmentStatus, "dormant");
    assert.equal(output.stageAssessmentOk, true);
    assert.equal(output.stageAssessmentOperation, "readiness");
    assert.equal(output.stageAssessmentWriteOperation, false);
    assert.equal(output.stageAssessmentWriteAllowed, false);
    assert.equal(output.stageAssessmentWritesPerformed, false);
    assert.equal(output.stageAssessmentWorkspaceId, "weixin_fanfan");
    assert.equal(output.stageAssessmentLearnerId, "fanfan");
    assert.equal(output.stageAssessmentProgramId, "program_science");
    assert.equal(output.stageAssessmentSubjectId, "science");
    assert.equal(output.stageAssessmentTargetNodeId, "kg_science_fair_test");
    assert.deepEqual(output.stageAssessmentAssessmentCoverageNodeIds, ["kg_science_fair_test"]);
    assert.equal(output.stageAssessmentEligible, false);
    assert.equal(output.stageAssessmentActivationState, "dormant");
    assert.equal(output.stageAssessmentReason, "insufficient_recent_practice");
    assert.equal(output.stageAssessmentMinimumRecentOrdinaryCards, 4);
    assert.equal(output.stageAssessmentRecentTrajectoryCount, 0);
    assert.equal(output.stageAssessmentSourceCardCount, 0);
    assert.equal(output.stageAssessmentProfileMasteryStateCount, 0);

    const db = new DatabaseSync(dbPath, { open: true, readOnly: true });
    try {
      const table = db.prepare("SELECT name FROM sqlite_master WHERE type = ? AND name = ?")
        .get("table", "learning_growth_stage_assessment_cycles");
      assert.equal(table, undefined);
    } finally {
      db.close();
    }
  });
});

test("stage-assessment smoke script fails closed for missing input, invalid JSON, privacy risk, and missing write prerequisites", () => {
  const missingWorkspace = runScript(["--target-node-id", "kg_science_fair_test", "--json"]);
  assert.equal(missingWorkspace.status, 2);
  assert.deepEqual(parseStdout(missingWorkspace), {
    ok: false,
    error: "workspace_id_required"
  });

  const invalidJson = runScript(["--workspace-id", "weixin_fanfan", "--input-json", "{", "--json"]);
  assert.equal(invalidJson.status, 2);
  assert.deepEqual(parseStdout(invalidJson), {
    ok: false,
    error: "stage_assessment_smoke_invalid_json",
    option: "--input-json"
  });

  const privacy = runScript([
    "--workspace-id", "weixin_fanfan",
    "--target-node-id", "kg_science_fair_test",
    "--input-json", JSON.stringify({ rawPrompt: "do not store" }),
    "--json"
  ]);
  assert.equal(privacy.status, 2);
  assert.equal(parseStdout(privacy).error, "stage_assessment_smoke_privacy_failed");

  const missingTarget = runScript(["--workspace-id", "weixin_fanfan", "--json"]);
  assert.equal(missingTarget.status, 2);
  assert.deepEqual(parseStdout(missingTarget), {
    ok: false,
    error: "stage_assessment_target_required",
    operation: "readiness"
  });

  const missingActivationSource = runScript([
    "--workspace-id", "weixin_fanfan",
    "--target-node-id", "kg_science_fair_test",
    "--operation", "activate",
    "--allow-write",
    "--json"
  ]);
  assert.equal(missingActivationSource.status, 2);
  assert.deepEqual(parseStdout(missingActivationSource), {
    ok: false,
    error: "stage_assessment_activation_source_required",
    operation: "activate"
  });

  const missingCompleteCard = runScript([
    "--workspace-id", "weixin_fanfan",
    "--operation", "complete",
    "--allow-write",
    "--stage-assessment-cycle-id", "lgsa_cycle_1",
    "--json"
  ]);
  assert.equal(missingCompleteCard.status, 2);
  assert.deepEqual(parseStdout(missingCompleteCard), {
    ok: false,
    error: "stage_assessment_task_card_id_required",
    operation: "complete"
  });
});
