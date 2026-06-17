const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "build-growth-release-ui-evidence-artifacts.js");

const {
  RELEASE_UI_ARTIFACT_SCHEMA,
  buildReleaseUiEvidenceArtifacts,
  parseArgs,
  publicScreenshotSummary
} = require("../scripts/build-growth-release-ui-evidence-artifacts");
const {
  UI_EVIDENCE_COLLECTION_TASKS
} = require("../src/services/learning-automation-ui-evidence-task-registry");
const {
  createLearningAutomationUiEvidenceService
} = require("../src/services/learning-automation-ui-evidence-service");

function withTempDir(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-release-ui-artifacts-test-"));
  try {
    return callback(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sampleCentralVisualReport(overrides = {}) {
  return Object.assign({
    ok: true,
    scenario: "embedded-plugin-shell",
    pluginId: "growth",
    finishedAt: "2026-06-18T00:00:00.000Z",
    metrics: {
      scenario: "embedded-plugin-shell",
      pluginId: "growth",
      clientVersion: "20260618-growth-ui-artifacts-test",
      frame: {
        exists: true
      }
    },
    screenshot: {
      path: "/Users/xuxin/.homeai-qa/artifacts/ios-pwa-visual-embedded-plugin-shell-growth-test.png",
      bytes: 65536
    },
    assertions: [
      { name: "plugin_id_present", pass: true },
      { name: "plugin_shell_exists", pass: true },
      { name: "plugin_frame_exists", pass: true },
      { name: "screenshot_meets_min_bytes", pass: true }
    ]
  }, overrides);
}

function writeCentralReport(dir, report = sampleCentralVisualReport()) {
  const filePath = path.join(dir, "central-visual.json");
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return filePath;
}

function runScript(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8"
  });
}

test("release UI artifact builder parses central visual and task arguments", () => {
  assert.deepEqual(parseArgs([
    "--central-visual-evidence-file", "/tmp/central.json",
    "--output-dir", "/tmp/out",
    "--manifest-output-file", "/tmp/manifest.json",
    "--plugin-id", "growth",
    "--scenario", "embedded-plugin-shell",
    "--tasks", "owner-daily-ui,scheduler_run_ui",
    "--evidence-keys", "automationDigestUiEvidence",
    "--json"
  ]), {
    centralVisualEvidenceFile: "/tmp/central.json",
    outputDir: "/tmp/out",
    manifestOutputFile: "/tmp/manifest.json",
    pluginId: "growth",
    scenario: "embedded-plugin-shell",
    taskIds: ["owner-daily-ui", "scheduler_run_ui"],
    evidenceKeys: ["automationDigestUiEvidence"],
    json: true
  });
});

test("release UI artifact builder strips central screenshot paths from public artifacts", () => {
  assert.deepEqual(publicScreenshotSummary({
    path: "/Users/xuxin/.homeai-qa/artifacts/visual.png",
    bytes: 8192
  }), {
    screenshotPresent: true,
    screenshotArtifactName: "visual.png",
    screenshotBytes: 8192
  });
});

test("release UI artifact builder emits nine validator-ready summary artifacts", () => withTempDir((dir) => {
  const centralVisualEvidenceFile = writeCentralReport(dir);
  const result = buildReleaseUiEvidenceArtifacts({
    centralVisualEvidenceFile,
    outputDir: path.join(dir, "artifacts"),
    pluginId: "growth",
    scenario: "embedded-plugin-shell"
  });

  assert.equal(result.ok, true);
  assert.equal(result.artifactCount, UI_EVIDENCE_COLLECTION_TASKS.length);
  assert.equal(result.manifest.schemaVersion, "growth.learningAutomationReleaseEvidenceArtifactManifest.v1");
  assert.equal(Object.keys(result.manifest.uiEvidenceFiles).length, UI_EVIDENCE_COLLECTION_TASKS.length);
  assert.equal(result.centralVisual.screenshotArtifactName, "ios-pwa-visual-embedded-plugin-shell-growth-test.png");
  assert.equal(JSON.stringify(result.manifest).includes("/Users/"), false);

  const uiEvidenceService = createLearningAutomationUiEvidenceService({
    readFile: fs.readFileSync
  });
  for (const task of UI_EVIDENCE_COLLECTION_TASKS) {
    const filePath = result.manifest.uiEvidenceFiles[task.evidenceKey];
    const artifactText = fs.readFileSync(filePath, "utf8");
    const artifact = JSON.parse(artifactText);
    assert.equal(artifact.schemaVersion, RELEASE_UI_ARTIFACT_SCHEMA);
    assert.equal(artifact.ok, true);
    assert.equal(artifact.evidenceKey, task.evidenceKey);
    assert.equal(artifact.checkKey, task.checkKey);
    assert.equal(artifact.uiGate, task.uiGate);
    assert.equal(artifact.screenshotArtifactName, "ios-pwa-visual-embedded-plugin-shell-growth-test.png");
    assert.equal(artifactText.includes("/Users/"), false);
    assert.equal(artifactText.includes(".homeai-qa"), false);

    const evaluated = uiEvidenceService.evaluate({
      workspaceId: "weixin_stephen",
      learnerId: "weixin_stephen",
      domain: "science",
      subject: "science",
      horizon: "daily_plan",
      evidenceKey: task.evidenceKey,
      uiEvidenceFile: filePath
    });
    assert.equal(evaluated.ok, true);
    assert.equal(evaluated.readyForReleaseEvidence, true);
    assert.equal(evaluated.uiEvidence.missingCoverage.length, 0);
    assert.equal(evaluated.privateValueFindings.length, 0);
  }
}));

test("release UI artifact builder CLI writes a bounded manifest", () => withTempDir((dir) => {
  const centralVisualEvidenceFile = writeCentralReport(dir);
  const outputDir = path.join(dir, "out");
  const manifestOutputFile = path.join(dir, "manifest.json");
  const result = runScript([
    "--central-visual-evidence-file", centralVisualEvidenceFile,
    "--output-dir", outputDir,
    "--manifest-output-file", manifestOutputFile,
    "--json"
  ]);
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, true);
  assert.equal(output.artifactCount, UI_EVIDENCE_COLLECTION_TASKS.length);
  assert.equal(fs.existsSync(manifestOutputFile), true);
  const manifest = JSON.parse(fs.readFileSync(manifestOutputFile, "utf8"));
  assert.equal(Object.keys(manifest.uiEvidenceFiles).length, UI_EVIDENCE_COLLECTION_TASKS.length);
  assert.equal(JSON.stringify(output.centralVisual).includes("/Users/"), false);
}));

test("release UI artifact builder fails closed for invalid central visual reports", () => withTempDir((dir) => {
  const centralVisualEvidenceFile = writeCentralReport(dir, sampleCentralVisualReport({
    ok: false,
    assertions: [{ name: "plugin_frame_exists", pass: false }]
  }));
  const result = buildReleaseUiEvidenceArtifacts({
    centralVisualEvidenceFile,
    outputDir: path.join(dir, "artifacts"),
    pluginId: "growth",
    scenario: "embedded-plugin-shell"
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "central_visual_report_invalid");
  assert.equal(result.missingRequired.includes("central_visual_ok"), true);
  assert.equal(result.missingRequired.includes("passing_central_visual_assertions"), true);
}));
