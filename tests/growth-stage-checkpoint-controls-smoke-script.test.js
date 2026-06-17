const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-stage-checkpoint-controls.js");

const {
  inputFromArgs,
  operationFromArgs,
  projectStageCheckpointControlsSmokeReadback,
  runControls,
  targetNodeIds,
  validateInput
} = require("../scripts/smoke-growth-stage-checkpoint-controls");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-stage-checkpoint-controls-smoke-"));
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

test("stage checkpoint controls smoke script parses bounded readback selectors", () => {
  const args = [
    "--operation", "readback",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--display-name", "Fanfan",
    "--program-id", "program_science",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--subject-id", "science",
    "--capability-cluster-id", "science_observation",
    "--target-node-id", "kg_science_fair_test",
    "--assessment-coverage-node-ids", "kg_science_fair_test,kg_science_observation_language"
  ];

  assert.equal(operationFromArgs(args), "readback");
  assert.deepEqual(targetNodeIds(args), [
    "kg_science_fair_test",
    "kg_science_observation_language"
  ]);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    displayName: "Fanfan",
    label: "",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    subjectId: "science",
    capabilityClusterId: "science_observation",
    targetNodeId: "kg_science_fair_test",
    targetNodeIds: ["kg_science_fair_test", "kg_science_observation_language"],
    assessmentCoverageNodeIds: ["kg_science_fair_test", "kg_science_observation_language"]
  });
});

test("stage checkpoint controls smoke script is read-only and delegates to controls service only", () => {
  const calls = [];
  const service = {
    controls(input) {
      calls.push(input);
      return {
        ok: true,
        schemaVersion: "growth.stageCheckpointControls.v1",
        summaryOnly: true,
        summary: { status: "ready_for_owner_activation" }
      };
    }
  };
  const input = {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    targetNodeId: "kg_science_fair_test",
    assessmentCoverageNodeIds: ["kg_science_fair_test"]
  };

  assert.deepEqual(validateInput("controls", input, []), { ok: true });
  assert.equal(runControls(service, input).summary.status, "ready_for_owner_activation");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].targetNodeId, "kg_science_fair_test");
});

test("stage checkpoint controls smoke script projects operator readback", () => {
  const projected = projectStageCheckpointControlsSmokeReadback({
    ok: true,
    source: "growth-learning-stage-checkpoint-controls-service",
    schemaVersion: "growth.stageCheckpointControls.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    target: {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      displayName: "Fanfan"
    },
    scope: {
      programId: "program_science",
      domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
      domain: "science",
      subject: "science",
      subjectId: "science",
      capabilityClusterId: "science_observation",
      targetNodeId: "kg_science_fair_test",
      targetNodeIds: ["kg_science_fair_test"],
      assessmentCoverageNodeIds: ["kg_science_fair_test", "kg_science_observation_language"]
    },
    readiness: {
      available: true,
      activationState: "eligible",
      eligible: true,
      reason: "enough_recent_practice",
      cooldownUntil: "",
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
    },
    policy: {
      formalAssessmentActivationService: "learning-stage-assessment-service",
      dailyPlanDirectPublicationAllowed: false,
      ownerManualActivationAllowed: true,
      learnerChallengeAllowed: true,
      lowPressureDailyPracticeSeparate: true
    },
    actions: [{
      key: "refresh_stage_checkpoint_controls",
      write: false,
      enabled: true
    }, {
      key: "activate_stage_assessment",
      write: true,
      enabled: true,
      disabledReason: ""
    }, {
      key: "learner_challenge_route",
      write: true,
      enabled: true,
      disabledReason: ""
    }],
    summary: {
      status: "ready_for_owner_activation",
      eligible: true,
      activationState: "eligible",
      readyForOwnerActivation: true,
      inCooldown: false,
      active: false,
      recentTrajectoryCount: 5,
      highPressureSignalCount: 0,
      challengeSignalCount: 1,
      sourceCardCount: 2
    }
  }, "readback");

  assert.equal(projected.stageCheckpointControlsStatus, "ready_for_owner_activation");
  assert.equal(projected.stageCheckpointControlsOk, true);
  assert.equal(projected.stageCheckpointControlsOperation, "readback");
  assert.equal(projected.stageCheckpointControlsWriteOperation, false);
  assert.equal(projected.stageCheckpointControlsWritesPerformed, false);
  assert.equal(projected.stageCheckpointControlsSchemaVersion, "growth.stageCheckpointControls.v1");
  assert.equal(projected.stageCheckpointControlsPrivacyClass, "summary_only");
  assert.equal(projected.stageCheckpointControlsSummaryOnly, true);
  assert.equal(projected.stageCheckpointControlsWorkspaceId, "weixin_fanfan");
  assert.equal(projected.stageCheckpointControlsLearnerId, "fanfan");
  assert.equal(projected.stageCheckpointControlsProgramId, "program_science");
  assert.equal(projected.stageCheckpointControlsTargetNodeId, "kg_science_fair_test");
  assert.deepEqual(projected.stageCheckpointControlsAssessmentCoverageNodeIds, ["kg_science_fair_test", "kg_science_observation_language"]);
  assert.equal(projected.stageCheckpointControlsEligible, true);
  assert.equal(projected.stageCheckpointControlsActivationState, "eligible");
  assert.equal(projected.stageCheckpointControlsReason, "enough_recent_practice");
  assert.equal(projected.stageCheckpointControlsReadyForOwnerActivation, true);
  assert.equal(projected.stageCheckpointControlsRecentTrajectoryCount, 5);
  assert.equal(projected.stageCheckpointControlsChallengeSignalCount, 1);
  assert.equal(projected.stageCheckpointControlsSourceCardCount, 2);
  assert.deepEqual(projected.stageCheckpointControlsSourceCardIds, ["ltask_daily_1", "ltask_daily_2"]);
  assert.equal(projected.stageCheckpointControlsProfileWeaknessCount, 2);
  assert.equal(projected.stageCheckpointControlsPolicyActivationService, "learning-stage-assessment-service");
  assert.equal(projected.stageCheckpointControlsDailyPlanDirectPublicationAllowed, false);
  assert.equal(projected.stageCheckpointControlsOwnerManualActivationAllowed, true);
  assert.equal(projected.stageCheckpointControlsRefreshEnabled, true);
  assert.equal(projected.stageCheckpointControlsActivateEnabled, true);
  assert.equal(projected.stageCheckpointControlsActivateWrite, true);
  assert.equal(projected.stageCheckpointControlsChallengeEnabled, true);
  assert.deepEqual(projected.stageCheckpointControlsActionKeys, [
    "refresh_stage_checkpoint_controls",
    "activate_stage_assessment",
    "learner_challenge_route"
  ]);
});

test("stage checkpoint controls smoke script runs readback on a temporary SQLite db without creating stage cycles", () => {
  withTempDb(({ dir, dbPath }) => {
    const setup = new DatabaseSync(dbPath, { open: true });
    try {
      setup.exec(`
        CREATE TABLE learning_growth_card_trajectories (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          learner_id TEXT NOT NULL DEFAULT '',
          task_card_id TEXT NOT NULL DEFAULT '',
          source_evaluation_id TEXT NOT NULL DEFAULT '',
          strategy TEXT NOT NULL DEFAULT '',
          difficulty_band TEXT NOT NULL DEFAULT '',
          target_node_ids_json TEXT NOT NULL DEFAULT '[]',
          performance_summary TEXT NOT NULL DEFAULT '',
          confirmed_strengths_json TEXT NOT NULL DEFAULT '[]',
          remaining_weaknesses_json TEXT NOT NULL DEFAULT '[]',
          mastery_changes_json TEXT NOT NULL DEFAULT '[]',
          next_recommendation_json TEXT NOT NULL DEFAULT '{}',
          raw_json TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
    } finally {
      setup.close();
    }

    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--domain", "science",
      "--subject", "science",
      "--target-node-id", "kg_science_fair_test",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    const output = parseStdout(result);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(output.operation, "controls");
    assert.equal(output.ok, true);
    assert.equal(output.schemaVersion, "growth.stageCheckpointControls.v1");
    assert.equal(output.summaryOnly, true);
    assert.equal(output.readiness.activationState, "dormant");
    assert.equal(output.summary.status, "not_ready");
    assert.equal(output.policy.formalAssessmentActivationService, "learning-stage-assessment-service");
    assert.equal(output.policy.dailyPlanDirectPublicationAllowed, false);
    assert.equal(output.actions.find((action) => action.key === "activate_stage_assessment").enabled, false);
    assert.equal(output.stageCheckpointControlsStatus, "not_ready");
    assert.equal(output.stageCheckpointControlsOk, true);
    assert.equal(output.stageCheckpointControlsOperation, "controls");
    assert.equal(output.stageCheckpointControlsWriteOperation, false);
    assert.equal(output.stageCheckpointControlsWritesPerformed, false);
    assert.equal(output.stageCheckpointControlsSchemaVersion, "growth.stageCheckpointControls.v1");
    assert.equal(output.stageCheckpointControlsPrivacyClass, "summary_only");
    assert.equal(output.stageCheckpointControlsSummaryOnly, true);
    assert.equal(output.stageCheckpointControlsWorkspaceId, "weixin_fanfan");
    assert.equal(output.stageCheckpointControlsLearnerId, "fanfan");
    assert.equal(output.stageCheckpointControlsProgramId, "program_science");
    assert.equal(output.stageCheckpointControlsDomain, "science");
    assert.equal(output.stageCheckpointControlsSubject, "science");
    assert.equal(output.stageCheckpointControlsTargetNodeId, "kg_science_fair_test");
    assert.deepEqual(output.stageCheckpointControlsAssessmentCoverageNodeIds, ["kg_science_fair_test"]);
    assert.equal(output.stageCheckpointControlsActivationState, "dormant");
    assert.equal(output.stageCheckpointControlsEligible, false);
    assert.equal(output.stageCheckpointControlsReadyForOwnerActivation, false);
    assert.equal(output.stageCheckpointControlsRecentTrajectoryCount, 0);
    assert.equal(output.stageCheckpointControlsPolicyActivationService, "learning-stage-assessment-service");
    assert.equal(output.stageCheckpointControlsDailyPlanDirectPublicationAllowed, false);
    assert.equal(output.stageCheckpointControlsOwnerManualActivationAllowed, true);
    assert.equal(output.stageCheckpointControlsActivateEnabled, false);
    assert.equal(output.stageCheckpointControlsActivateDisabledReason, "insufficient_recent_practice");

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

test("stage checkpoint controls smoke script fails closed for missing input, invalid JSON, privacy risk, unsupported operation, and write flag", () => {
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
    error: "stage_checkpoint_controls_smoke_invalid_json",
    option: "--input-json"
  });

  const privacy = runScript([
    "--workspace-id", "weixin_fanfan",
    "--target-node-id", "kg_science_fair_test",
    "--input-json", JSON.stringify({ rawPrompt: "do not store" }),
    "--json"
  ]);
  assert.equal(privacy.status, 2);
  assert.equal(parseStdout(privacy).error, "stage_checkpoint_controls_smoke_privacy_failed");

  const missingTarget = runScript(["--workspace-id", "weixin_fanfan", "--json"]);
  assert.equal(missingTarget.status, 2);
  assert.deepEqual(parseStdout(missingTarget), {
    ok: false,
    error: "stage_checkpoint_controls_target_required",
    operation: "controls"
  });

  const unsupportedOperation = runScript([
    "--workspace-id", "weixin_fanfan",
    "--target-node-id", "kg_science_fair_test",
    "--operation", "activate",
    "--json"
  ]);
  assert.equal(unsupportedOperation.status, 2);
  assert.deepEqual(parseStdout(unsupportedOperation), {
    ok: false,
    error: "stage_checkpoint_controls_smoke_operation_invalid",
    operation: "activate",
    allowedOperations: ["controls", "read", "readback"]
  });

  const writeFlag = runScript([
    "--workspace-id", "weixin_fanfan",
    "--target-node-id", "kg_science_fair_test",
    "--allow-write",
    "--json"
  ]);
  assert.equal(writeFlag.status, 2);
  assert.deepEqual(parseStdout(writeFlag), {
    ok: false,
    error: "stage_checkpoint_controls_smoke_write_not_supported",
    operation: "controls",
    writeAllowed: false
  });
});
