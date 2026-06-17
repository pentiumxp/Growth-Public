const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-cycle-history.js");

const {
  inputFromArgs,
  projectCycleHistorySmokeReadback,
  targetNodeIds
} = require("../scripts/smoke-growth-cycle-history");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-cycle-history-smoke-"));
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

test("cycle-history smoke script parses bounded history scope", () => {
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
    "--include-completeness", "false",
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
    includeCompleteness: false,
    limit: 7,
    targetNodeIds: ["kg_science_fair_test", "kg_science_observation_language"],
    requestedBy: "weixin_owner"
  });
});

test("cycle-history smoke script projects top-level operator readback", () => {
  const output = projectCycleHistorySmokeReadback({
    ok: true,
    available: true,
    source: "growth-learning-cycle-history-service",
    schemaVersion: "growth.learningCycleHistory.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    target: {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan"
    },
    filters: {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      domainPackId: "uk_hk_curriculum_foundation",
      domain: "science",
      subject: "science",
      taskCardId: "ltask_daily_1",
      targetNodeIds: ["kg_science_fair_test"],
      includeCompleteness: true,
      limit: 12
    },
    summary: {
      cycleCount: 1,
      completeCount: 1,
      readyForAutomationCount: 1,
      latestActivityAt: "2026-06-17T06:00:00.000Z",
      partialFailureCount: 1
    },
    partialFailures: ["learning_cycle_history_correction_service_unavailable"],
    cycles: [{
      cycleId: "ltask_daily_1",
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan",
      programId: "program_science",
      selectors: {
        planDraftId: "lgplan_daily_1",
        taskCardId: "ltask_daily_1",
        evaluationId: "leval_daily_1",
        profileDeltaId: "lgpdelta_daily_1",
        evidenceId: "lgevd_daily_1",
        correctionId: "lgcorr_daily_1",
        sourceId: "source_daily_1",
        targetNodeIds: ["kg_science_fair_test", "kg_science_observation_language"]
      },
      status: "owner_reviewed",
      cardRole: "repair",
      scoreBand: "developing",
      counts: {
        planDrafts: 1,
        evidence: 2,
        profileDeltas: 1,
        corrections: 1
      },
      completeness: {
        available: true,
        complete: true,
        readyForAutomation: true,
        missingRequired: []
      },
      latestActivityAt: "2026-06-17T06:00:00.000Z"
    }]
  });

  assert.equal(output.cycleHistoryStatus, "partial_history");
  assert.equal(output.cycleHistoryTargetWorkspaceId, "weixin_fanfan");
  assert.equal(output.cycleHistoryTargetLearnerId, "fanfan");
  assert.equal(output.cycleHistoryProgramId, "program_science");
  assert.equal(output.cycleHistoryDomainPackId, "uk_hk_curriculum_foundation");
  assert.equal(output.cycleHistoryDomain, "science");
  assert.equal(output.cycleHistorySubject, "science");
  assert.equal(output.cycleHistoryIncludeCompleteness, true);
  assert.equal(output.cycleHistoryLimit, 12);
  assert.equal(output.cycleHistoryFilterTaskCardId, "ltask_daily_1");
  assert.deepEqual(output.cycleHistoryTargetNodeIds, ["kg_science_fair_test"]);
  assert.equal(output.cycleHistoryCycleCount, 1);
  assert.equal(output.cycleHistoryCompleteCount, 1);
  assert.equal(output.cycleHistoryReadyForAutomationCount, 1);
  assert.equal(output.cycleHistoryPartialFailureCount, 1);
  assert.deepEqual(output.cycleHistoryPartialFailures, ["learning_cycle_history_correction_service_unavailable"]);
  assert.deepEqual(output.cycleHistoryCycleIds, ["ltask_daily_1"]);
  assert.equal(output.cycleHistoryFirstCycleId, "ltask_daily_1");
  assert.equal(output.cycleHistoryFirstCycleStatus, "owner_reviewed");
  assert.equal(output.cycleHistoryFirstCycleCardRole, "repair");
  assert.equal(output.cycleHistoryFirstCycleScoreBand, "developing");
  assert.equal(output.cycleHistoryFirstCyclePlanDraftId, "lgplan_daily_1");
  assert.equal(output.cycleHistoryFirstCycleTaskCardId, "ltask_daily_1");
  assert.equal(output.cycleHistoryFirstCycleEvaluationId, "leval_daily_1");
  assert.equal(output.cycleHistoryFirstCycleProfileDeltaId, "lgpdelta_daily_1");
  assert.equal(output.cycleHistoryFirstCycleEvidenceId, "lgevd_daily_1");
  assert.equal(output.cycleHistoryFirstCycleCorrectionId, "lgcorr_daily_1");
  assert.equal(output.cycleHistoryFirstCycleSourceId, "source_daily_1");
  assert.equal(output.cycleHistoryFirstCycleTargetNodeCount, 2);
  assert.equal(output.cycleHistoryFirstCyclePlanDraftCount, 1);
  assert.equal(output.cycleHistoryFirstCycleEvidenceCount, 2);
  assert.equal(output.cycleHistoryFirstCycleProfileDeltaCount, 1);
  assert.equal(output.cycleHistoryFirstCycleCorrectionCount, 1);
  assert.equal(output.cycleHistoryFirstCycleCompletenessAvailable, true);
  assert.equal(output.cycleHistoryFirstCycleComplete, true);
  assert.equal(output.cycleHistoryFirstCycleReadyForAutomation, true);
  assert.equal(output.cycleHistoryFirstCycleMissingRequiredCount, 0);
});

test("cycle-history smoke script returns empty summary-only history without writing business state", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--target-node-id", "kg_science_fair_test",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: dbPath
    });

    assert.equal(result.status, 0);
    const output = parseStdout(result);
    assert.equal(output.ok, true);
    assert.equal(output.source, "growth-learning-cycle-history-service");
    assert.equal(output.schemaVersion, "growth.learningCycleHistory.v1");
    assert.equal(output.privacyClass, "summary_only");
    assert.equal(output.summary.cycleCount, 0);
    assert.deepEqual(output.cycles, []);
    assert.equal(output.cycleHistoryStatus, "history_empty");
    assert.equal(output.cycleHistoryTargetWorkspaceId, "weixin_fanfan");
    assert.equal(output.cycleHistoryTargetLearnerId, "fanfan");
    assert.equal(output.cycleHistoryProgramId, "program_science");
    assert.equal(output.cycleHistoryTargetNodeCount, 1);
    assert.equal(output.cycleHistoryCycleCount, 0);
    assert.equal(output.cycleHistoryCompleteCount, 0);
    assert.equal(output.cycleHistoryReadyForAutomationCount, 0);
    assert.equal(output.cycleHistoryPartialFailureCount, 0);
    assert.deepEqual(output.cycleHistoryCycleIds, []);
    assert.equal(JSON.stringify(output).includes("rawPrompt"), false);

    const db = new DatabaseSync(dbPath, { open: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = ?").all("table");
    db.close();
    assert.deepEqual(tables, []);
  });
});

test("cycle-history smoke script fails closed for missing workspace and invalid JSON", () => {
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
    error: "cycle_history_smoke_invalid_json",
    option: "--input-json"
  });
});

test("cycle-history smoke script fails closed for privacy-risk input", () => {
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
    assert.equal(output.error, "learning_cycle_history_privacy_failed");
    assert.equal(output.privacyFindings.includes("$.rawPrompt"), true);
  });
});
