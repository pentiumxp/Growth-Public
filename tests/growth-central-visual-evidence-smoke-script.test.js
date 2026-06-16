const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-central-visual-evidence.js");
const { inputFromArgs } = require("../scripts/smoke-growth-central-visual-evidence");

function withTempVisualEvidence(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-central-visual-evidence-"));
  const evidencePath = path.join(dir, "central-visual-evidence.json");
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

test("central visual evidence smoke script parses bounded selectors", () => {
  assert.deepEqual(inputFromArgs([
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--plugin-id", "growth",
    "--scenario", "embedded-plugin-shell",
    "--central-visual-evidence-file", "/tmp/visual.json"
  ]), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    pluginId: "growth",
    scenario: "embedded-plugin-shell",
    evidenceFile: "/tmp/visual.json",
    evidence: null
  });
});

test("central visual evidence smoke script fails closed for missing workspace", () => {
  const result = runScript(["--json"]);
  assert.equal(result.status, 2);
  assert.equal(parseStdout(result).error, "central_visual_evidence_workspace_required");
});

test("central visual evidence smoke script reports missing visual evidence without writing", () => {
  withTempVisualEvidence(({ dir }) => {
    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: path.join(dir, "growth-learning.sqlite3")
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = parseStdout(result);
    assert.equal(output.ok, false);
    assert.equal(output.status, "missing");
    assert.equal(output.error, "central_visual_evidence_missing");
    assert.deepEqual(output.missingRequired, ["central_visual_evidence_file_or_json"]);
  });
});

test("central visual evidence smoke script returns summary-only visual evidence", () => {
  withTempVisualEvidence(({ dir, evidencePath }) => {
    fs.writeFileSync(evidencePath, JSON.stringify({
      ok: true,
      source: "home-ai-ios-pwa-visual-harness",
      pluginId: "growth",
      scenario: "embedded-plugin-shell",
      debugUrl: "http://127.0.0.1:19074/",
      clientVersion: "20260615-growth",
      screenshotPath: "/Users/xuxin/.homeai-qa/artifacts/growth-embedded.png",
      assertions: [{ name: "visible", status: "pass" }]
    }), "utf8");

    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--central-visual-evidence-file", evidencePath,
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
    assert.equal(output.visualEvidence.screenshotArtifactName, "growth-embedded.png");
    assert.equal(JSON.stringify(output).includes("/Users/xuxin/.homeai-qa"), false);
    assert.equal(JSON.stringify(output).includes("access-key"), false);
  });
});

test("central visual evidence smoke script rejects private values from public summaries", () => {
  withTempVisualEvidence(({ dir, evidencePath }) => {
    fs.writeFileSync(evidencePath, JSON.stringify({
      ok: true,
      source: "/Users/example/.homeai-qa/private-visual-source.json",
      pluginId: "growth",
      scenario: "embedded-plugin-shell",
      screenshotPresent: true,
      assertions: [{ name: "visible", status: "pass" }]
    }), "utf8");

    const result = runScript([
      "--workspace-id", "smoke_workspace",
      "--learner-id", "smoke_learner",
      "--central-visual-evidence-file", evidencePath,
      "--json"
    ], {
      GROWTH_DATA_DIR: dir,
      GROWTH_LEARNING_DB_PATH: path.join(dir, "growth-learning.sqlite3")
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = parseStdout(result);
    assert.equal(output.ok, false);
    assert.equal(output.error, "central_visual_evidence_incomplete");
    assert.deepEqual(output.privateValueFindings, ["$.source"]);
    assert.ok(output.missingRequired.includes("no_private_value_leaks"));
    assert.equal(JSON.stringify(output).includes("/Users/example"), false);
  });
});
