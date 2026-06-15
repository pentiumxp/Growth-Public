const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-owner-audit.js");

const {
  allowWrite,
  inputFromArgs,
  operationFromArgs,
  runOperation,
  sourceEvidenceIds,
  targetNodeIds,
  validateOperation
} = require("../scripts/smoke-growth-owner-audit");

function withTempDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-owner-audit-smoke-"));
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

test("owner audit smoke script parses bounded audit and correction selectors", () => {
  const args = [
    "--operation", "correction",
    "--allow-write",
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--plan-draft-id", "lgplan_daily_1",
    "--task-card-id", "ltask_daily_1",
    "--evaluation-id", "leval_daily_1",
    "--profile-delta-id", "lgpdelta_daily_1",
    "--evidence-id", "lgevd_daily_1",
    "--correction-id", "lgcorr_owner_1",
    "--source-id", "source_cycle_daily_1",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--target-node-id", "kg_science_fair_test",
    "--target-node-ids", "kg_science_fair_test,kg_science_observation_language",
    "--source-evidence-id", "lgevd_eval_1",
    "--source-evidence-ids", "lgevd_eval_1,lgevd_profile_1",
    "--review-action", "mark_needs_repair",
    "--status", "needs_repair",
    "--reason", "Observation language is still fragile.",
    "--note", "Use lower-pressure follow-up.",
    "--reviewed-by", "owner",
    "--evidence-weight", "0.45",
    "--confidence", "0.7",
    "--limit", "7"
  ];

  assert.equal(operationFromArgs(args), "correction");
  assert.equal(allowWrite(args), true);
  assert.deepEqual(targetNodeIds(args), [
    "kg_science_fair_test",
    "kg_science_observation_language"
  ]);
  assert.deepEqual(sourceEvidenceIds(args), [
    "lgevd_eval_1",
    "lgevd_profile_1"
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
    correctionId: "lgcorr_owner_1",
    sourceId: "source_cycle_daily_1",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    limit: 7,
    targetNodeIds: ["kg_science_fair_test", "kg_science_observation_language"],
    reviewAction: "mark_needs_repair",
    status: "needs_repair",
    reason: "Observation language is still fragile.",
    note: "Use lower-pressure follow-up.",
    reviewedBy: "owner",
    sourceEvidenceIds: ["lgevd_eval_1", "lgevd_profile_1"],
    evidenceWeight: 0.45,
    confidence: 0.7
  });
});

test("owner audit smoke script rejects write operations unless explicitly allowed", () => {
  const input = { workspaceId: "weixin_fanfan", learnerId: "fanfan" };
  assert.deepEqual(validateOperation("correction", input, ["--operation", "correction"]), {
    ok: false,
    error: "owner_audit_smoke_write_not_allowed",
    operation: "correction",
    requiredFlag: "--allow-write"
  });
  assert.deepEqual(validateOperation("audit", input, []), { ok: true });
  assert.deepEqual(validateOperation("repair", input, []), {
    ok: false,
    error: "owner_audit_smoke_operation_invalid",
    operation: "repair",
    allowedOperations: ["audit", "correction"]
  });
});

test("owner audit smoke script delegates read-only audit to all audit readback services", async () => {
  const calls = [];
  const services = {
    learningCycleAuditService: {
      listCycleAudit(input) {
        calls.push(["cycle", input.workspaceId]);
        return { ok: true, source: "cycle", summary: { planDraftCount: 1 }, timeline: [] };
      }
    },
    learningAuditCompletenessService: {
      evaluateCycleCompleteness(input) {
        calls.push(["completeness", input.workspaceId]);
        return { ok: true, complete: false, readyForAutomation: false, summary: { missingRequired: ["profile_delta_audit"] } };
      }
    },
    learningEvidenceAuditService: {
      listEvidenceAudit(input) {
        calls.push(["evidence", input.workspaceId]);
        return {
          ok: true,
          source: "evidence",
          summary: { evidenceCount: 1 },
          evidence: [{ evidenceId: "lgevd_daily_1" }]
        };
      }
    },
    learningProfileDeltaAuditService: {
      listProfileDeltas(input) {
        calls.push(["profileDelta", input.workspaceId]);
        return {
          ok: true,
          source: "profileDelta",
          count: 1,
          profileDeltas: [{ profileDeltaId: "lgpdelta_daily_1" }]
        };
      }
    },
    learningOwnerCorrectionService: {
      listCorrections(input) {
        calls.push(["corrections", input.workspaceId]);
        return { ok: true, source: "corrections", count: 0, corrections: [] };
      }
    }
  };

  const result = await runOperation(services, "audit", {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    targetNodeIds: ["kg_science_fair_test"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.source, "growth-owner-audit-smoke");
  assert.equal(result.operation, "audit");
  assert.deepEqual(calls.map((call) => call[0]), [
    "cycle",
    "completeness",
    "evidence",
    "profileDelta",
    "corrections"
  ]);
  assert.equal(result.scope.workspaceId, "weixin_fanfan");
  assert.equal(result.completeness.readyForAutomation, false);
  assert.equal(result.evidenceAudit.summary.evidenceCount, 1);
  assert.equal(result.profileDeltaAudit.count, 1);
});

test("owner audit smoke script records correction only through Owner correction service then refreshes full audit", async () => {
  const calls = [];
  const services = {
    learningCycleAuditService: {
      listCycleAudit(input) {
        calls.push(["cycle", input.correctionId]);
        return { ok: true, source: "cycle", summary: { correctionCount: 1 }, timeline: [] };
      }
    },
    learningAuditCompletenessService: {
      evaluateCycleCompleteness(input) {
        calls.push(["completeness", input.correctionId]);
        return { ok: true, complete: true, readyForAutomation: true, summary: { missingRequired: [] } };
      }
    },
    learningEvidenceAuditService: {
      listEvidenceAudit(input) {
        calls.push(["evidence", input.correctionId]);
        return { ok: true, source: "evidence", summary: { evidenceCount: 1 }, evidence: [] };
      }
    },
    learningProfileDeltaAuditService: {
      listProfileDeltas(input) {
        calls.push(["profileDelta", input.correctionId]);
        return { ok: true, source: "profileDelta", count: 1, profileDeltas: [] };
      }
    },
    learningOwnerCorrectionService: {
      recordCorrection(input) {
        calls.push(["record", input.reviewAction]);
        return { ok: true, correctionId: "lgcorr_owner_1", correction: { correctionId: "lgcorr_owner_1" } };
      },
      listCorrections(input) {
        calls.push(["corrections", input.correctionId]);
        return { ok: true, source: "corrections", count: 1, corrections: [{ correctionId: input.correctionId }] };
      }
    }
  };

  const result = await runOperation(services, "correction", {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    targetNodeIds: ["kg_science_fair_test"],
    reviewAction: "mark_needs_repair"
  });

  assert.equal(result.ok, true);
  assert.equal(result.operation, "correction");
  assert.equal(result.correction.correctionId, "lgcorr_owner_1");
  assert.deepEqual(calls.map((call) => call[0]), [
    "record",
    "cycle",
    "completeness",
    "evidence",
    "profileDelta",
    "corrections"
  ]);
  assert.equal(result.readback.scope.correctionId, "lgcorr_owner_1");
  assert.equal(result.readback.evidenceAudit.summary.evidenceCount, 1);
  assert.equal(result.readback.profileDeltaAudit.count, 1);
});

test("owner audit smoke script runs read-only audit on an empty DB without writing correction rows", () => {
  withTempDb(({ dir, dbPath }) => {
    const result = runScript([
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--program-id", "program_science",
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
    assert.equal(output.source, "growth-owner-audit-smoke");
    assert.equal(output.operation, "audit");
    assert.equal(output.scope.workspaceId, "weixin_fanfan");
    assert.equal(output.corrections.count, 0);

    const db = new DatabaseSync(dbPath, { open: true, readOnly: true });
    try {
      const table = db.prepare("SELECT name FROM sqlite_master WHERE type = ? AND name = ?")
        .get("table", "learning_growth_evidence_ledger");
      assert.equal(table, undefined);
    } finally {
      db.close();
    }
  });
});

test("owner audit smoke script fails closed for missing workspace, invalid JSON, privacy-risk input, and blocked writes", () => {
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
    error: "owner_audit_smoke_invalid_json",
    option: "--input-json"
  });

  const privacy = runScript([
    "--workspace-id", "weixin_fanfan",
    "--input-json", JSON.stringify({ rawPrompt: "do not store" }),
    "--json"
  ]);
  assert.equal(privacy.status, 2);
  assert.equal(parseStdout(privacy).error, "owner_audit_smoke_privacy_failed");

  const blockedWrite = runScript([
    "--workspace-id", "weixin_fanfan",
    "--operation", "correction",
    "--json"
  ]);
  assert.equal(blockedWrite.status, 2);
  assert.deepEqual(parseStdout(blockedWrite), {
    ok: false,
    error: "owner_audit_smoke_write_not_allowed",
    operation: "correction",
    requiredFlag: "--allow-write"
  });
});
