const assert = require("node:assert/strict");
const test = require("node:test");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const {
  inputFromArgs,
  projectProductionDeploymentEvidenceSmokeReadback
} = require("../scripts/smoke-growth-production-deployment-evidence");

function validEvidence(overrides = {}) {
  return Object.assign({
    ok: true,
    source: "home-ai-macos-deployment-contract",
    pluginId: "growth",
    environment: "macos_production",
    launchdLabel: "com.hermesmobile.plugin.growth",
    deploymentContractVersion: "20260618-v4",
    checkedAt: "2026-06-18T03:00:00.000Z",
    deployedAt: "2026-06-18T02:58:00.000Z",
    releaseVersion: "growth-d21abc6",
    gitCommit: "d21abc6",
    runId: "homeai_deploy_1",
    artifactId: "deploy_health_1",
    serviceRunning: true,
    manifestOk: true,
    healthOk: true,
    endpointReachable: true,
    sqliteIntegrityOk: true,
    checks: [
      { key: "launchd_service_health", status: "pass" },
      { key: "plugin_manifest_health", ok: true },
      { key: "production_health_smoke", pass: true }
    ]
  }, overrides);
}

test("production deployment evidence smoke script parses bounded scope and evidence inputs", () => {
  const input = inputFromArgs([
    "--workspace-id", "weixin_fanfan",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--horizon", "daily_plan",
    "--plugin-id", "growth",
    "--environment", "macos_production",
    "--launchd-label", "com.hermesmobile.plugin.growth",
    "--production-deployment-evidence-file", "/tmp/deployment-health.json",
    "--production-deployment-evidence-json", JSON.stringify({ ok: true })
  ]);

  assert.equal(input.workspaceId, "weixin_fanfan");
  assert.equal(input.learnerId, "fanfan");
  assert.equal(input.programId, "program_science");
  assert.equal(input.domainPackId, "uk_hk_curriculum_foundation");
  assert.equal(input.pluginId, "growth");
  assert.equal(input.environment, "macos_production");
  assert.equal(input.launchdLabel, "com.hermesmobile.plugin.growth");
  assert.equal(input.evidenceFile, "/tmp/deployment-health.json");
  assert.deepEqual(input.evidence, { ok: true });
});

test("production deployment evidence smoke script projects nested service summary into top-level operator fields", () => {
  const output = projectProductionDeploymentEvidenceSmokeReadback({
    ok: true,
    source: "growth-learning-automation-production-deployment-evidence-service",
    schemaVersion: "growth.learningAutomationProductionDeploymentEvidence.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    pluginId: "growth",
    environment: "macos_production",
    launchdLabel: "com.hermesmobile.plugin.growth",
    status: "pass",
    readyForReleaseEvidence: true,
    deploymentEvidence: validEvidence(),
    deploymentBoundary: {
      summaryOnly: true,
      homeAiOwnsDeployment: true,
      growthRunsNoDeployment: true,
      growthReadsOnlyDeploymentHealthSummary: true,
      noRuntimeConfigMutation: true
    }
  }, { workspaceId: "weixin_fanfan", learnerId: "fanfan" });

  assert.equal(output.productionDeploymentEvidenceStatus, "pass");
  assert.equal(output.productionDeploymentEvidenceOk, true);
  assert.equal(output.productionDeploymentEvidenceSchemaVersion, "growth.learningAutomationProductionDeploymentEvidence.v1");
  assert.equal(output.productionDeploymentEvidenceSummaryOnly, true);
  assert.equal(output.productionDeploymentEvidenceReadyForReleaseEvidence, true);
  assert.equal(output.productionDeploymentEvidenceDeploymentContractVersion, "20260618-v4");
  assert.equal(output.productionDeploymentEvidenceServiceRunning, true);
  assert.equal(output.productionDeploymentEvidenceManifestOk, true);
  assert.equal(output.productionDeploymentEvidenceHealthOk, true);
  assert.equal(output.productionDeploymentEvidenceBoundarySummaryOnly, true);
  assert.equal(output.productionDeploymentEvidenceHomeAiOwnsDeployment, true);
  assert.equal(output.productionDeploymentEvidenceGrowthRunsNoDeployment, true);
  assert.equal(output.productionDeploymentEvidenceRuntimeConfigChange, false);
  assert.equal(output.productionDeploymentEvidenceWritefulSchedulingAllowed, false);
});

test("production deployment evidence smoke script runs no-write validation against a temporary SQLite db", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-production-deployment-evidence-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  const evidencePath = path.join(dir, "deployment-health.json");
  new DatabaseSync(dbPath).close();
  fs.writeFileSync(evidencePath, JSON.stringify(validEvidence()), "utf8");
  try {
    const stdout = childProcess.execFileSync(process.execPath, [
      path.join(__dirname, "..", "scripts", "smoke-growth-production-deployment-evidence.js"),
      "--workspace-id", "weixin_fanfan",
      "--learner-id", "fanfan",
      "--production-deployment-evidence-file", evidencePath,
      "--json"
    ], {
      cwd: path.join(__dirname, ".."),
      env: Object.assign({}, process.env, {
        GROWTH_LEARNING_DB_PATH: dbPath
      }),
      encoding: "utf8"
    });

    const output = JSON.parse(stdout);
    assert.equal(output.ok, true);
    assert.equal(output.schemaVersion, "growth.learningAutomationProductionDeploymentEvidence.v1");
    assert.equal(output.productionDeploymentEvidenceStatus, "pass");
    assert.equal(output.productionDeploymentEvidenceReadyForReleaseEvidence, true);
    assert.equal(output.productionDeploymentEvidenceServiceRunning, true);
    assert.equal(output.productionDeploymentEvidenceManifestOk, true);
    assert.equal(output.productionDeploymentEvidenceHealthOk, true);
    assert.equal(output.productionDeploymentEvidenceEvidenceFileName, "deployment-health.json");
    assert.equal(output.productionDeploymentEvidenceWritesPerformed, false);
    assert.equal(output.productionDeploymentEvidenceRuntimeConfigChange, false);
    assert.equal(output.productionDeploymentEvidenceWritefulSchedulingAllowed, false);
    assert.equal(JSON.stringify(output).includes(dir), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
