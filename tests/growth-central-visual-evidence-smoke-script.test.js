const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-central-visual-evidence.js");
const {
  inputFromArgs,
  projectCentralVisualEvidenceSmokeReadback
} = require("../scripts/smoke-growth-central-visual-evidence");

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

test("central visual evidence smoke script projects bounded operator readback", () => {
  const projected = projectCentralVisualEvidenceSmokeReadback({
    ok: true,
    source: "growth-learning-automation-central-visual-evidence-service",
    schemaVersion: "growth.learningAutomationCentralVisualEvidence.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    workspaceId: "smoke_workspace",
    learnerId: "smoke_learner",
    programId: "program_science",
    domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    pluginId: "growth",
    scenario: "embedded-plugin-shell",
    status: "pass",
    readyForReleaseEvidence: true,
    visualEvidence: {
      source: "home-ai-ios-pwa-visual-harness",
      pluginId: "growth",
      scenario: "embedded-plugin-shell",
      status: "pass",
      checkedAt: "2026-06-17T08:00:00.000Z",
      clientVersion: "20260617-growth",
      debugUrlPresent: true,
      visualLaneId: "ios-pwa",
      screenshotPresent: true,
      screenshotArtifactName: "growth-embedded.png",
      evidenceFilePresent: true,
      evidenceFileName: "central-visual-evidence.json",
      assertionCount: 3,
      failedAssertionCount: 0
    },
    missingRequired: [],
    privateValueFindings: [],
    centralBoundary: {
      summaryOnly: true,
      homeAiOwnsVisualHarness: true,
      growthRunsNoAppium: true,
      growthReadsOnlyCentralHarnessArtifacts: true
    }
  }, { workspaceId: "smoke_workspace", learnerId: "smoke_learner" });

  assert.equal(projected.centralVisualEvidenceStatus, "pass");
  assert.equal(projected.centralVisualEvidenceOk, true);
  assert.equal(projected.centralVisualEvidenceWriteOperation, false);
  assert.equal(projected.centralVisualEvidenceWriteAllowed, false);
  assert.equal(projected.centralVisualEvidenceWritesPerformed, false);
  assert.equal(projected.centralVisualEvidenceWorkspaceId, "smoke_workspace");
  assert.equal(projected.centralVisualEvidenceLearnerId, "smoke_learner");
  assert.equal(projected.centralVisualEvidenceProgramId, "program_science");
  assert.equal(projected.centralVisualEvidenceDomainPackId, "domain_pack_fanfan_cambridge_pathway_v1");
  assert.equal(projected.centralVisualEvidenceDomain, "science");
  assert.equal(projected.centralVisualEvidenceSubject, "science");
  assert.equal(projected.centralVisualEvidenceHorizon, "daily_plan");
  assert.equal(projected.centralVisualEvidencePluginId, "growth");
  assert.equal(projected.centralVisualEvidenceScenario, "embedded-plugin-shell");
  assert.equal(projected.centralVisualEvidenceSource, "growth-learning-automation-central-visual-evidence-service");
  assert.equal(projected.centralVisualEvidenceSchemaVersion, "growth.learningAutomationCentralVisualEvidence.v1");
  assert.equal(projected.centralVisualEvidencePrivacyClass, "summary_only");
  assert.equal(projected.centralVisualEvidenceSummaryOnly, true);
  assert.equal(projected.centralVisualEvidenceReadyForReleaseEvidence, true);
  assert.deepEqual(projected.centralVisualEvidenceMissingRequired, []);
  assert.equal(projected.centralVisualEvidenceMissingRequiredCount, 0);
  assert.deepEqual(projected.centralVisualEvidencePrivateValueFindings, []);
  assert.equal(projected.centralVisualEvidencePrivateValueFindingCount, 0);
  assert.equal(projected.centralVisualEvidenceVisualSource, "home-ai-ios-pwa-visual-harness");
  assert.equal(projected.centralVisualEvidenceVisualPluginId, "growth");
  assert.equal(projected.centralVisualEvidenceVisualScenario, "embedded-plugin-shell");
  assert.equal(projected.centralVisualEvidenceVisualStatus, "pass");
  assert.equal(projected.centralVisualEvidenceClientVersion, "20260617-growth");
  assert.equal(projected.centralVisualEvidenceDebugUrlPresent, true);
  assert.equal(projected.centralVisualEvidenceVisualLaneId, "ios-pwa");
  assert.equal(projected.centralVisualEvidenceScreenshotPresent, true);
  assert.equal(projected.centralVisualEvidenceScreenshotArtifactName, "growth-embedded.png");
  assert.equal(projected.centralVisualEvidenceEvidenceFilePresent, true);
  assert.equal(projected.centralVisualEvidenceEvidenceFileName, "central-visual-evidence.json");
  assert.equal(projected.centralVisualEvidenceAssertionCount, 3);
  assert.equal(projected.centralVisualEvidenceFailedAssertionCount, 0);
  assert.equal(projected.centralVisualEvidenceBoundarySummaryOnly, true);
  assert.equal(projected.centralVisualEvidenceHomeAiOwnsVisualHarness, true);
  assert.equal(projected.centralVisualEvidenceGrowthRunsNoAppium, true);
  assert.equal(projected.centralVisualEvidenceGrowthReadsOnlyCentralHarnessArtifacts, true);
  assert.equal(projected.centralVisualEvidenceRuntimeConfigChange, false);
  assert.equal(projected.centralVisualEvidenceConfigChangeApplied, false);
  assert.equal(projected.centralVisualEvidenceWritefulSchedulingAllowed, false);
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
    assert.equal(output.centralVisualEvidenceStatus, "missing");
    assert.equal(output.centralVisualEvidenceOk, false);
    assert.equal(output.centralVisualEvidenceWriteOperation, false);
    assert.equal(output.centralVisualEvidenceWriteAllowed, false);
    assert.equal(output.centralVisualEvidenceWorkspaceId, "smoke_workspace");
    assert.equal(output.centralVisualEvidenceLearnerId, "smoke_learner");
    assert.equal(output.centralVisualEvidenceReadyForReleaseEvidence, false);
    assert.deepEqual(output.centralVisualEvidenceMissingRequired, ["central_visual_evidence_file_or_json"]);
    assert.equal(output.centralVisualEvidenceMissingRequiredCount, 1);
    assert.equal(output.centralVisualEvidenceWritefulSchedulingAllowed, false);
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
    assert.equal(output.centralVisualEvidenceStatus, "pass");
    assert.equal(output.centralVisualEvidenceOk, true);
    assert.equal(output.centralVisualEvidenceReadyForReleaseEvidence, true);
    assert.equal(output.centralVisualEvidenceVisualPluginId, "growth");
    assert.equal(output.centralVisualEvidenceVisualScenario, "embedded-plugin-shell");
    assert.equal(output.centralVisualEvidenceScreenshotPresent, true);
    assert.equal(output.centralVisualEvidenceScreenshotArtifactName, "growth-embedded.png");
    assert.equal(output.centralVisualEvidenceEvidenceFilePresent, true);
    assert.equal(output.centralVisualEvidenceEvidenceFileName, "central-visual-evidence.json");
    assert.equal(output.centralVisualEvidenceAssertionCount, 1);
    assert.equal(output.centralVisualEvidenceFailedAssertionCount, 0);
    assert.equal(output.centralVisualEvidenceHomeAiOwnsVisualHarness, true);
    assert.equal(output.centralVisualEvidenceGrowthRunsNoAppium, true);
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
    assert.equal(output.centralVisualEvidenceStatus, "blocked");
    assert.equal(output.centralVisualEvidenceOk, false);
    assert.deepEqual(output.centralVisualEvidencePrivateValueFindings, ["$.source"]);
    assert.equal(output.centralVisualEvidencePrivateValueFindingCount, 1);
    assert.ok(output.centralVisualEvidenceMissingRequired.includes("no_private_value_leaks"));
    assert.equal(output.centralVisualEvidenceWritefulSchedulingAllowed, false);
    assert.equal(JSON.stringify(output).includes("/Users/example"), false);
  });
});
