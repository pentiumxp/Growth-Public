const assert = require("node:assert/strict");
const test = require("node:test");

const {
  COLLECTOR_SCHEMA,
  appendWorkspaceQuery,
  collectProductionDeploymentEvidence,
  contractVersionFromText,
  launchdStateFromOutput,
  parseArgs
} = require("../scripts/collect-growth-production-deployment-evidence");
const {
  createLearningAutomationProductionDeploymentEvidenceService
} = require("../src/services/learning-automation-production-deployment-evidence-service");

function response(json, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(json);
    }
  };
}

function fakeFetch(url) {
  const text = String(url);
  if (text.includes("/api/v1/hermes/plugin/manifest")) {
    return Promise.resolve(response({
      id: "growth",
      actions: [{ id: "generate" }, { id: "review" }]
    }));
  }
  if (text.includes("/api/v1/growth/status")) {
    return Promise.resolve(response({
      ok: true,
      plugin_id: "growth",
      stage: "plugin_sqlite",
      source: "growth-plugin-sqlite",
      migration: {
        ok: true,
        sqlite_busy_timeout_ms: 5000
      }
    }));
  }
  return Promise.resolve(response({ ok: false }, 404));
}

function fakeLaunchctl() {
  return [
    "system/com.hermesmobile.plugin.growth = {",
    "  state = running",
    "  program = /Users/hermes-host/HermesMobile/runtime/node-current/bin/node",
    "  environment = {",
    "    GROWTH_GATEWAY_AUTHORING_ACCESS_TOKEN_PATH => /Users/hermes-host/HermesMobile/data/secrets/gateway.key",
    "  }",
    "  pid = 375",
    "}"
  ].join("\n");
}

test("production deployment evidence collector emits summary-only artifact accepted by the validator", async () => {
  const artifact = await collectProductionDeploymentEvidence({
    pluginId: "growth",
    environment: "macos_production",
    launchdLabel: "com.hermesmobile.plugin.growth",
    baseUrl: "http://127.0.0.1:4881",
    manifestUrl: "http://127.0.0.1:4881/api/v1/hermes/plugin/manifest",
    statusUrl: "http://127.0.0.1:4881/api/v1/growth/status",
    statusWorkspaceId: "growth:local-dev",
    timeoutMs: 1000
  }, {
    now: () => new Date("2026-06-18T04:30:00.000Z"),
    readFile: () => "Home AI platform contract version: `20260618-v4`.",
    fetchImpl: fakeFetch,
    commandRunner: () => fakeLaunchctl()
  });

  assert.equal(artifact.schemaVersion, COLLECTOR_SCHEMA);
  assert.equal(artifact.privacyClass, "summary_only");
  assert.equal(artifact.summaryOnly, true);
  assert.equal(artifact.productionDeploymentEvidence.status, "pass");
  assert.equal(artifact.productionDeploymentEvidence.serviceRunning, true);
  assert.equal(artifact.productionDeploymentEvidence.manifestOk, true);
  assert.equal(artifact.productionDeploymentEvidence.healthOk, true);
  assert.equal(artifact.productionDeploymentEvidence.sqliteIntegrityOk, true);
  assert.equal(artifact.productionDeploymentEvidence.deploymentContractVersion, "20260618-v4");
  assert.equal(artifact.productionDeploymentEvidence.failedCheckCount, 0);
  assert.equal(JSON.stringify(artifact).includes("/Users/"), false);
  assert.equal(JSON.stringify(artifact).includes("ACCESS_TOKEN"), false);
  assert.equal(artifact.collectorBoundary.noRuntimeConfigMutation, true);
  assert.equal(artifact.collectorBoundary.noModelCalls, true);

  const validation = createLearningAutomationProductionDeploymentEvidenceService().evaluate({
    workspaceId: "weixin_stephen",
    learnerId: "weixin_stephen",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    evidence: artifact
  });
  assert.equal(validation.ok, true);
  assert.equal(validation.readyForReleaseEvidence, true);
  assert.equal(validation.deploymentEvidence.launchdLabel, "com.hermesmobile.plugin.growth");
});

test("production deployment evidence collector fails closed when required health checks fail", async () => {
  const artifact = await collectProductionDeploymentEvidence({
    pluginId: "growth",
    environment: "macos_production",
    launchdLabel: "com.hermesmobile.plugin.growth",
    manifestUrl: "http://127.0.0.1:4881/api/v1/hermes/plugin/manifest",
    statusUrl: "http://127.0.0.1:4881/api/v1/growth/status",
    timeoutMs: 1000,
    deploymentContractVersion: "20260618-v4"
  }, {
    now: () => new Date("2026-06-18T04:31:00.000Z"),
    fetchImpl: (url) => {
      if (String(url).includes("manifest")) return Promise.resolve(response({ id: "finance" }));
      return Promise.resolve(response({ ok: false, source: "growth-plugin-sqlite" }, 503));
    },
    commandRunner: () => {
      const error = new Error("not loaded");
      error.code = "ENOENT";
      throw error;
    }
  });

  assert.equal(artifact.productionDeploymentEvidence.status, "blocked");
  assert.equal(artifact.productionDeploymentEvidence.serviceRunning, false);
  assert.equal(artifact.productionDeploymentEvidence.manifestOk, false);
  assert.equal(artifact.productionDeploymentEvidence.healthOk, false);
  assert.equal(artifact.productionDeploymentEvidence.failedCheckCount, 3);
  assert.equal(JSON.stringify(artifact).includes("not loaded"), false);

  const validation = createLearningAutomationProductionDeploymentEvidenceService().evaluate({
    workspaceId: "weixin_stephen",
    evidence: artifact
  });
  assert.equal(validation.ok, false);
  assert.ok(validation.missingRequired.includes("launchd_service_health"));
  assert.ok(validation.missingRequired.includes("plugin_manifest_health"));
  assert.ok(validation.missingRequired.includes("production_health_smoke"));
});

test("production deployment evidence collector parses args and bounded helpers", () => {
  const input = parseArgs([
    "--base-url", "http://127.0.0.1:4881",
    "--status-workspace-id", "weixin_stephen",
    "--output-file", "/tmp/deployment-health.json",
    "--json"
  ], {});

  assert.equal(input.manifestUrl, "http://127.0.0.1:4881/api/v1/hermes/plugin/manifest");
  assert.equal(input.statusUrl, "http://127.0.0.1:4881/api/v1/growth/status");
  assert.equal(input.statusWorkspaceId, "weixin_stephen");
  assert.equal(input.outputFile, "/tmp/deployment-health.json");
  assert.equal(input.pretty, true);
  assert.equal(
    appendWorkspaceQuery("http://127.0.0.1:4881/api/v1/growth/status", "weixin_stephen"),
    "http://127.0.0.1:4881/api/v1/growth/status?workspace_id=weixin_stephen"
  );
  assert.equal(
    appendWorkspaceQuery("http://127.0.0.1:4881/api/v1/growth/status?workspaceId=existing", "weixin_stephen"),
    "http://127.0.0.1:4881/api/v1/growth/status?workspaceId=existing"
  );
  assert.deepEqual(launchdStateFromOutput("state = running\n"), { ok: true, state: "running" });
  assert.deepEqual(launchdStateFromOutput("state = exited\n"), { ok: false, state: "exited" });
  assert.equal(contractVersionFromText("Home AI platform contract version: `20260618-v4`."), "20260618-v4");
});
