const assert = require("node:assert/strict");
const test = require("node:test");

const {
  PRODUCTION_DEPLOYMENT_EVIDENCE_SCHEMA,
  createLearningAutomationProductionDeploymentEvidenceService,
  publicScope
} = require("../src/services/learning-automation-production-deployment-evidence-service");

function createService(files = {}) {
  return createLearningAutomationProductionDeploymentEvidenceService({
    readFile(filePath) {
      if (!Object.prototype.hasOwnProperty.call(files, filePath)) {
        const error = new Error("missing");
        error.code = "ENOENT";
        throw error;
      }
      return files[filePath];
    }
  });
}

function validDeploymentEvidence(overrides = {}) {
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

test("production deployment evidence service validates Home AI macOS deployment health summary", () => {
  const service = createService({
    "/tmp/deployment-health.json": JSON.stringify(validDeploymentEvidence({
      artifactPath: "/Users/hermes-host/HermesMobile/private/raw-path-not-projected.json"
    }))
  });

  const result = service.evaluate({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    evidenceFile: "/tmp/deployment-health.json"
  });

  assert.equal(result.ok, true);
  assert.equal(result.schemaVersion, PRODUCTION_DEPLOYMENT_EVIDENCE_SCHEMA);
  assert.equal(result.privacyClass, "summary_only");
  assert.equal(result.summaryOnly, true);
  assert.equal(result.status, "pass");
  assert.equal(result.readyForReleaseEvidence, true);
  assert.equal(result.deploymentEvidence.pluginId, "growth");
  assert.equal(result.deploymentEvidence.environment, "macos_production");
  assert.equal(result.deploymentEvidence.launchdLabel, "com.hermesmobile.plugin.growth");
  assert.equal(result.deploymentEvidence.deploymentContractVersion, "20260618-v4");
  assert.equal(result.deploymentEvidence.serviceRunning, true);
  assert.equal(result.deploymentEvidence.manifestOk, true);
  assert.equal(result.deploymentEvidence.healthOk, true);
  assert.equal(result.deploymentEvidence.evidenceFileName, "deployment-health.json");
  assert.equal(result.deploymentBoundary.homeAiOwnsDeployment, true);
  assert.equal(result.deploymentBoundary.growthRunsNoDeployment, true);
  assert.equal(result.deploymentBoundary.noRuntimeConfigMutation, true);
  assert.deepEqual(result.privateValueFindings, []);
  assert.equal(JSON.stringify(result).includes("/Users/hermes-host"), false);
});

test("production deployment evidence service fails closed for missing, mismatched, or failed health", () => {
  const service = createService();
  const missing = service.evaluate({ workspaceId: "weixin_fanfan" });
  assert.equal(missing.ok, false);
  assert.equal(missing.status, "missing");
  assert.deepEqual(missing.missingRequired, ["production_deployment_evidence_file_or_json"]);

  const mismatch = service.evaluate({
    workspaceId: "weixin_fanfan",
    evidence: validDeploymentEvidence({ pluginId: "finance" })
  });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.status, "blocked");
  assert.ok(mismatch.missingRequired.includes("matching_plugin_id"));

  const failed = service.evaluate({
    workspaceId: "weixin_fanfan",
    evidence: validDeploymentEvidence({
      healthOk: false,
      checks: [{ key: "production_health_smoke", status: "failed" }]
    })
  });
  assert.equal(failed.ok, false);
  assert.ok(failed.missingRequired.includes("production_health_smoke"));
  assert.ok(failed.missingRequired.includes("passing_deployment_health_checks"));
});

test("production deployment evidence service rejects privacy-risk fields and unavailable readers", () => {
  assert.deepEqual(publicScope({
    workspace_id: "weixin_fanfan",
    learner_id: "fanfan",
    plugin_id: "growth",
    environment: "macos_production"
  }), {
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    programId: "",
    domainPackId: "",
    domain: "",
    subject: "",
    horizon: "daily_plan",
    pluginId: "growth",
    environment: "macos_production",
    launchdLabel: "com.hermesmobile.plugin.growth"
  });

  const service = createService();
  const privacy = service.evaluate({
    workspaceId: "weixin_fanfan",
    evidence: validDeploymentEvidence({ accessToken: "not allowed" })
  });
  assert.equal(privacy.ok, false);
  assert.equal(privacy.error, "production_deployment_evidence_privacy_failed");

  const privateScopeValue = service.evaluate({
    workspaceId: "weixin_fanfan",
    domain: "Bearer local-token",
    evidence: validDeploymentEvidence()
  });
  assert.equal(privateScopeValue.ok, false);
  assert.equal(privateScopeValue.error, "production_deployment_evidence_privacy_failed");
  assert.deepEqual(privateScopeValue.privateValueFindings, ["$.domain"]);

  const privateProjectedValue = service.evaluate({
    workspaceId: "weixin_fanfan",
    evidence: validDeploymentEvidence({
      source: "/Users/example/.homeai-qa/private-source.json"
    })
  });
  assert.equal(privateProjectedValue.ok, false);
  assert.equal(privateProjectedValue.status, "blocked");
  assert.equal(privateProjectedValue.error, "production_deployment_evidence_incomplete");
  assert.deepEqual(privateProjectedValue.privateValueFindings, ["$.source"]);
  assert.ok(privateProjectedValue.missingRequired.includes("no_private_value_leaks"));

  const noReader = createLearningAutomationProductionDeploymentEvidenceService().evaluate({
    workspaceId: "weixin_fanfan",
    evidenceFile: "/tmp/deployment-health.json"
  });
  assert.equal(noReader.ok, false);
  assert.equal(noReader.error, "production_deployment_evidence_file_reader_unavailable");
});
