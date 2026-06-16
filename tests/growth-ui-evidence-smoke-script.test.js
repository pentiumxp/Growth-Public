const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-ui-evidence.js");
const { inputFromArgs } = require("../scripts/smoke-growth-ui-evidence");

function withTempEvidence(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-ui-evidence-"));
  const evidencePath = path.join(dir, "ui-evidence.json");
  try {
    return callback({ dir, evidencePath });
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

test("UI evidence smoke script parses bounded selectors", () => {
  assert.deepEqual(inputFromArgs([
    "--workspace-id", "weixin_stephen",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--domain-pack-id", "domain_pack_fanfan_cambridge_pathway_v1",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--evidence-key", "owner_daily_ui_evidence",
    "--ui-gate", "owner_daily",
    "--ui-evidence-file", "/tmp/ui.json"
  ]), {
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    evidenceKey: "owner_daily_ui_evidence",
    uiGate: "owner_daily",
    evidenceFile: "/tmp/ui.json",
    evidence: null
  });
});

test("UI evidence smoke script fails closed for missing workspace", () => {
  const result = runScript(["--json"]);
  assert.equal(result.status, 2);
  assert.equal(parseStdout(result).error, "ui_evidence_workspace_required");
});

test("UI evidence smoke script reports missing artifact without writing", () => {
  withTempEvidence(({ dir }) => {
    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--evidence-key", "ownerDailyUiEvidence",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: path.join(dir, "growth-learning.sqlite3")
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = parseStdout(result);
    assert.equal(output.ok, false);
    assert.equal(output.status, "missing");
    assert.equal(output.error, "ui_evidence_missing");
    assert.deepEqual(output.missingRequired, ["ui_evidence_file_or_json"]);
  });
});

test("UI evidence smoke script returns summary-only UI evidence", () => {
  withTempEvidence(({ dir, evidencePath }) => {
    fs.writeFileSync(evidencePath, JSON.stringify({
      ok: true,
      source: "home-ai-ios-pwa-visual-harness",
      evidenceKey: "ownerDailyUiEvidence",
      uiGate: "owner_daily",
      route: "/?embed=hermes#generate",
      screenshotPath: "/Users/xuxin/.homeai-qa/artifacts/growth-owner-daily.png",
      coverage: [
        "owner_daily_generation",
        "daily_loop_preview",
        "target_context"
      ],
      assertions: [{ name: "visible", status: "pass" }]
    }), "utf8");

    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--evidence-key", "owner_daily_ui_evidence",
      "--ui-evidence-file", evidencePath,
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: path.join(dir, "growth-learning.sqlite3")
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = parseStdout(result);
    assert.equal(output.ok, true);
    assert.equal(output.status, "pass");
    assert.equal(output.readyForReleaseEvidence, true);
    assert.equal(output.uiEvidence.screenshotArtifactName, "growth-owner-daily.png");
    assert.equal(JSON.stringify(output).includes("/Users/xuxin/.homeai-qa"), false);
    assert.equal(JSON.stringify(output).includes("access-key"), false);
  });
});

test("UI evidence smoke script validates release package review gate", () => {
  withTempEvidence(({ dir, evidencePath }) => {
    fs.writeFileSync(evidencePath, JSON.stringify({
      ok: true,
      evidenceKey: "releasePackageReviewUiEvidence",
      uiGate: "release_package_review",
      domAssertions: [{ name: "build and record buttons", status: "pass" }],
      coverage: [
        "package_candidate_build",
        "package_candidate_status",
        "record_package_action"
      ]
    }), "utf8");

    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--evidence-key", "release_package_review_ui_evidence",
      "--ui-evidence-file", evidencePath,
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: path.join(dir, "growth-learning.sqlite3")
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = parseStdout(result);
    assert.equal(output.ok, true);
    assert.equal(output.evidenceKey, "releasePackageReviewUiEvidence");
    assert.equal(output.checkKey, "release_package_review_ui_evidence");
    assert.equal(output.uiGate, "release_package_review");
    assert.deepEqual(output.uiEvidence.missingCoverage, []);
  });
});

test("UI evidence smoke script rejects private projected values", () => {
  withTempEvidence(({ dir, evidencePath }) => {
    fs.writeFileSync(evidencePath, JSON.stringify({
      ok: true,
      source: "/Users/example/.homeai-qa/private-ui-source.json",
      evidenceKey: "ownerDailyUiEvidence",
      screenshotPresent: true,
      coverage: [
        "owner_daily_generation",
        "daily_loop_preview",
        "target_context"
      ],
      assertions: [{ name: "visible", status: "pass" }]
    }), "utf8");

    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--evidence-key", "ownerDailyUiEvidence",
      "--ui-evidence-file", evidencePath,
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: path.join(dir, "growth-learning.sqlite3")
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = parseStdout(result);
    assert.equal(output.ok, false);
    assert.equal(output.error, "ui_evidence_incomplete");
    assert.deepEqual(output.privateValueFindings, ["$.source"]);
    assert.equal(JSON.stringify(output).includes("/Users/example"), false);
  });
});
