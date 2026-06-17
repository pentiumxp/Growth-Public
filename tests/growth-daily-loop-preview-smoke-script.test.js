const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-daily-loop-preview.js");

const {
  inputFromArgs,
  projectDailyLoopPreviewSmokeReadback,
  targetNodeIds
} = require("../scripts/smoke-growth-daily-loop-preview");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-daily-loop-preview-smoke-"));
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

test("daily-loop preview smoke script parses bounded scope, cycle, and graph selectors", () => {
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

test("daily-loop preview smoke script delegates to service without writing by default", () => {
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
    assert.equal(output.source, "growth-learning-daily-loop-service");
    assert.equal(output.operation, "preview");
    assert.equal(output.dailyLoopOperation, "preview");
    assert.equal(output.dailyLoopWriteOperation, false);
    assert.equal(output.dailyLoopTargetWorkspaceId, "weixin_fanfan");
    assert.equal(output.dailyLoopTargetLearnerId, "fanfan");
    assert.equal(output.dailyLoopSubject, "science");
    assert.equal(typeof output.dailyLoopOutcome, "string");
    assert.equal(typeof output.dailyLoopReadinessReady, "boolean");
    assert.equal(typeof output.dailyLoopCanDraft, "boolean");
    assert.equal(typeof output.dailyLoopCanPublish, "boolean");
    assert.equal(output.target.workspaceId, "weixin_fanfan");
    assert.equal(output.scope.subject, "science");
    assert.equal(output.actions.draftAction.method, "POST");
    assert.equal(output.actions.publishAction.method, "POST");

    const db = new DatabaseSync(dbPath, { open: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = ?").all("table");
    db.close();
    assert.deepEqual(tables, []);
  });
});

test("daily-loop preview smoke script reuses dailyLoop operator projection", () => {
  const projected = projectDailyLoopPreviewSmokeReadback({
    ok: true,
    source: "growth-learning-daily-loop-service",
    operation: "preview",
    target: {
      workspaceId: "weixin_fanfan",
      learnerId: "fanfan"
    },
    scope: {
      programId: "program_science",
      domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      availableMinutes: 12,
      targetNodeIds: ["kg_science_fair_test"]
    },
    readiness: {
      ready: true,
      targetEnabled: true,
      targetProvisioned: true,
      plannerContextReady: true,
      plannerReady: true,
      authoringGatewayConfigured: true,
      evaluationGatewayConfigured: true,
      plannerGatewayConfigured: true,
      operatingLoopGatewayReady: true
    },
    actions: {
      canDraft: true,
      canPublish: false,
      draftAction: { enabled: true },
      publishAction: { enabled: false },
      auditRefreshAction: { enabled: false }
    }
  });

  assert.equal(projected.dailyLoopOperation, "preview");
  assert.equal(projected.dailyLoopOutcome, "ready_to_draft");
  assert.equal(projected.dailyLoopWriteOperation, false);
  assert.equal(projected.dailyLoopTargetWorkspaceId, "weixin_fanfan");
  assert.equal(projected.dailyLoopProgramId, "program_science");
  assert.equal(projected.dailyLoopTargetNodeCount, 1);
  assert.equal(projected.dailyLoopCanDraft, true);
  assert.equal(projected.dailyLoopCanPublish, false);
  assert.equal(projected.dailyLoopPlannerContextReady, true);
});

test("daily-loop preview smoke script fails closed for privacy-risk input", () => {
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
    assert.equal(output.error, "learning_daily_loop_privacy_failed");
    assert.equal(output.privacyFindings.includes("$.rawPrompt"), true);
  });
});

test("daily-loop preview smoke script fails closed for missing workspace and invalid JSON", () => {
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
    error: "daily_loop_preview_smoke_invalid_json",
    option: "--input-json"
  });
});
