const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-release-decision.js");

const {
  inputFromArgs,
  operationFromArgs,
  projectReleaseDecisionSmokeReadback,
  runOperation,
  shouldAllowWrite,
  validateOperationInput
} = require("../scripts/smoke-growth-release-decision");

function sampleCollectionRun() {
  return {
    schemaVersion: "growth.learningAutomationReleaseCollectionRun.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    runId: "lgacrn_ready_1",
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    status: "ready_for_release_review",
    readyForReleaseReview: true,
    summary: {
      summaryOnly: true,
      readyForReleaseEvidence: true,
      readyForReleaseReview: true,
      writefulSchedulingAllowed: false
    },
    releaseReview: {
      summaryOnly: true,
      advisoryOnly: true,
      writefulSchedulingAllowed: false
    }
  };
}

function withRunFile(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-decision-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  const runPath = path.join(dir, "collection-run.json");
  fs.writeFileSync(runPath, JSON.stringify(sampleCollectionRun(), null, 2));
  try {
    return callback({ dbPath, dir, runPath });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("release decision smoke script parses bounded selectors and defaults to evaluate", () => {
  withRunFile(({ runPath }) => {
    const args = [
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
      "--collection-run-file", runPath,
      "--auto-select-latest-ready-collection-run",
      "--status", "approved",
      "--limit", "5"
    ];

    assert.equal(operationFromArgs(args), "evaluate");
    assert.equal(shouldAllowWrite(args), false);
    const input = inputFromArgs(args);
    assert.equal(input.workspaceId, "weixin_fanfan");
    assert.equal(input.learnerId, "fanfan");
    assert.equal(input.programId, "program_science");
    assert.equal(input.releaseCollectionRunFile, "collection-run.json");
    assert.equal(input.releaseCollectionRun.runId, "lgacrn_ready_1");
    assert.equal(input.autoSelectLatestReadyCollectionRun, true);
    assert.equal(input.status, "approved");
    assert.equal(input.limit, 5);
  });
});

test("release decision smoke script requires explicit write flag for record", () => {
  const input = {
    workspaceId: "weixin_fanfan",
    collectionRunId: "lgacrn_ready_1",
    status: "blocked"
  };

  const blocked = validateOperationInput("record", input, false);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, "release_decision_smoke_write_not_allowed");

  const allowed = validateOperationInput("record", input, true);
  assert.equal(allowed.ok, true);

  const autoSelected = validateOperationInput("record", {
    workspaceId: "weixin_fanfan",
    status: "approved",
    autoSelectLatestReadyCollectionRun: true
  }, true);
  assert.equal(autoSelected.ok, true);
});

test("release decision smoke script delegates operations to service only", () => {
  const calls = [];
  const service = {
    evaluateDecision(input) {
      calls.push({ type: "evaluateDecision", input });
      return {
        ok: true,
        status: "approved",
        releaseDecisionStatus: "approved",
        collectionRunId: "lgacrn_1",
        approvedForReleaseReview: true,
        writefulSchedulingAllowed: false,
        runtimeConfigChange: false,
        collectionRunSummary: {
          status: "ready_for_release_review",
          readyForReleaseReview: true
        },
        releaseReview: {
          requiredActionCount: 1,
          missingEvidenceKeys: ["owner_daily_ui_evidence"],
          nextAction: {
            key: "owner_daily_ui_evidence",
            action: "collect_owner_daily_ui_evidence",
            requiredActor: "owner"
          }
        }
      };
    },
    recordDecision(input) {
      calls.push({ type: "recordDecision", input });
      return { ok: true, decision: { decisionId: "lgard_1" } };
    },
    listDecisions(input) {
      calls.push({ type: "listDecisions", input });
      return { ok: true, decisions: [] };
    }
  };

  const evaluated = runOperation(service, "evaluate", { workspaceId: "weixin_fanfan", collectionRunId: "lgacrn_1" });
  runOperation(service, "record", { workspaceId: "weixin_fanfan", collectionRunId: "lgacrn_1" });
  runOperation(service, "list", { workspaceId: "weixin_fanfan" });

  assert.deepEqual(calls.map((call) => call.type), ["evaluateDecision", "recordDecision", "listDecisions"]);
  assert.equal(evaluated.releaseDecisionStatus, "approved");
  assert.equal(evaluated.releaseDecisionCollectionRunId, "lgacrn_1");
  assert.equal(evaluated.releaseDecisionCollectionRunReadyForReleaseReview, true);
  assert.equal(evaluated.releaseDecisionApprovedForReleaseReview, true);
  assert.equal(evaluated.releaseDecisionMissingEvidenceCount, 1);
  assert.equal(evaluated.releaseDecisionRequiredActionCount, 1);
  assert.deepEqual(evaluated.releaseDecisionNextAction, {
    key: "owner_daily_ui_evidence",
    action: "collect_owner_daily_ui_evidence",
    requiredActor: "owner"
  });
});

test("release decision smoke script projects top-level operator readback", () => {
  const result = projectReleaseDecisionSmokeReadback({
    ok: true,
    status: "approved",
    releaseDecisionStatus: "approved",
    collectionRunId: "lgacrn_ready_1",
    approvedForReleaseReview: true,
    collectionRunAutoSelected: true,
    autoSelection: {
      status: "selected",
      collectionRunId: "lgacrn_ready_1"
    },
    collectionRunSummary: {
      collectionRunId: "lgacrn_ready_1",
      status: "ready_for_release_review",
      readyForReleaseReview: true,
      missingCheckCount: 2,
      blockedCheckCount: 1,
      requiredActionCount: 3
    },
    releaseReview: {
      missingCheckKeys: ["central_visual_evidence"],
      blockedCheckKeys: ["scheduler_worker_target"],
      missingEvidenceKeys: ["release_package_review_ui_evidence"],
      persistedApprovalKeys: ["writefulExecutionApproval"],
      requiredActionCount: 3,
      nextAction: {
        key: "release_package_review_ui_evidence",
        action: "collect_release_package_review_ui_evidence",
        requiredActor: "owner"
      }
    },
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false
  });

  assert.equal(result.releaseDecisionStatus, "approved");
  assert.equal(result.releaseDecisionCollectionRunId, "lgacrn_ready_1");
  assert.equal(result.releaseDecisionCollectionRunStatus, "ready_for_release_review");
  assert.equal(result.releaseDecisionCollectionRunReadyForReleaseReview, true);
  assert.equal(result.releaseDecisionApprovedForReleaseReview, true);
  assert.equal(result.releaseDecisionCollectionRunAutoSelected, true);
  assert.equal(result.releaseDecisionAutoSelectionStatus, "selected");
  assert.equal(result.releaseDecisionAutoSelectionCollectionRunId, "lgacrn_ready_1");
  assert.equal(result.releaseDecisionMissingCheckCount, 1);
  assert.equal(result.releaseDecisionBlockedCheckCount, 1);
  assert.equal(result.releaseDecisionMissingEvidenceCount, 1);
  assert.equal(result.releaseDecisionRequiredActionCount, 3);
  assert.equal(result.releaseDecisionPersistedApprovalCount, 1);
  assert.equal(result.releaseDecisionWritefulSchedulingAllowed, false);
  assert.equal(result.releaseDecisionRuntimeConfigChange, false);
  assert.deepEqual(result.releaseDecisionNextAction, {
    key: "release_package_review_ui_evidence",
    action: "collect_release_package_review_ui_evidence",
    requiredActor: "owner"
  });
});

test("release decision smoke script records against a temporary SQLite db only when allowed", () => {
  withRunFile(({ dbPath, runPath }) => {
    const evaluate = spawnSync(process.execPath, [
      scriptPath,
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--collection-run-file", runPath,
      "--status", "approved",
      "--json"
    ], {
      cwd: repoRoot,
      env: Object.assign({}, process.env, { GROWTH_LEARNING_DB_PATH: dbPath }),
      encoding: "utf8"
    });
    assert.equal(evaluate.status, 0, evaluate.stderr || evaluate.stdout);
    const evaluateOutput = JSON.parse(evaluate.stdout);
    assert.equal(evaluateOutput.ok, true);
    assert.equal(evaluateOutput.operation, "evaluate");
    assert.equal(evaluateOutput.status, "approved");
    assert.equal(evaluateOutput.releaseDecisionStatus, "approved");
    assert.equal(evaluateOutput.releaseDecisionCollectionRunId, "lgacrn_ready_1");
    assert.equal(evaluateOutput.releaseDecisionCollectionRunStatus, "ready_for_release_review");
    assert.equal(evaluateOutput.releaseDecisionCollectionRunReadyForReleaseReview, true);
    assert.equal(evaluateOutput.releaseDecisionApprovedForReleaseReview, true);
    assert.equal(evaluateOutput.releaseDecisionWritefulSchedulingAllowed, false);
    assert.equal(evaluateOutput.releaseDecisionRuntimeConfigChange, false);
    assert.equal(JSON.stringify(evaluateOutput).includes(path.dirname(runPath)), false);

    const record = spawnSync(process.execPath, [
      scriptPath,
      "--operation", "record",
      "--allow-write",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--collection-run-file", runPath,
      "--status", "approved",
      "--decided-by", "weixin_owner",
      "--json"
    ], {
      cwd: repoRoot,
      env: Object.assign({}, process.env, { GROWTH_LEARNING_DB_PATH: dbPath }),
      encoding: "utf8"
    });
    assert.equal(record.status, 0, record.stderr || record.stdout);
    const recordOutput = JSON.parse(record.stdout);
    assert.equal(recordOutput.ok, true);
    assert.equal(recordOutput.operation, "record");
    assert.equal(recordOutput.decision.status, "approved");
    assert.equal(recordOutput.decision.collectionRunId, "lgacrn_ready_1");
    assert.equal(recordOutput.releaseDecisionStatus, "approved");
    assert.equal(recordOutput.releaseDecisionLatestDecisionStatus, "approved");
    assert.equal(recordOutput.releaseDecisionCollectionRunId, "lgacrn_ready_1");
    assert.equal(recordOutput.releaseDecisionCollectionRunStatus, "ready_for_release_review");
    assert.equal(recordOutput.releaseDecisionApprovedForReleaseReview, true);
    assert.equal(recordOutput.releaseDecisionWritefulSchedulingAllowed, false);

    const list = spawnSync(process.execPath, [
      scriptPath,
      "--operation", "list",
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--json"
    ], {
      cwd: repoRoot,
      env: Object.assign({}, process.env, { GROWTH_LEARNING_DB_PATH: dbPath }),
      encoding: "utf8"
    });
    assert.equal(list.status, 0, list.stderr || list.stdout);
    const listOutput = JSON.parse(list.stdout);
    assert.equal(listOutput.ok, true);
    assert.equal(listOutput.decisions.length, 1);
    assert.equal(listOutput.releaseDecisionCount, 1);
    assert.equal(listOutput.releaseDecisionLatestDecisionStatus, "approved");
    assert.equal(listOutput.releaseDecisionCollectionRunId, "lgacrn_ready_1");
    assert.equal(listOutput.releaseDecisionCollectionRunStatus, "ready_for_release_review");
  });
});

test("release decision smoke script rejects invalid JSON before service construction", () => {
  const result = spawnSync(process.execPath, [scriptPath, "--workspace-id", "weixin_fanfan", "--collection-run-json", "{"], {
    cwd: repoRoot,
    env: Object.assign({}, process.env),
    encoding: "utf8"
  });

  assert.equal(result.status, 2);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, false);
  assert.equal(output.error, "release_decision_smoke_invalid_json");
});
