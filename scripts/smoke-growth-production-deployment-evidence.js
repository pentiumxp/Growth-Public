"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

function argValue(args, name, fallback = "") {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  return String(args[index + 1] || fallback);
}

function hasFlag(args, name) {
  return args.includes(name);
}

function firstArgValue(args, names, fallback = "") {
  for (const name of names) {
    const value = argValue(args, name, "");
    if (value) return value;
  }
  return fallback;
}

function cleanString(value, max = 180) {
  const text = String(value || "").trim();
  return text.length > max ? text.slice(0, max) : text;
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function uniqueBoundedStrings(values = [], limit = 16) {
  return Array.from(new Set(asArray(values).map((value) => cleanString(value, 180)).filter(Boolean))).slice(0, limit);
}

function parseJsonArg(args, names, fallback = null) {
  const text = firstArgValue(args, names, "");
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (error) {
    const wrapped = new Error(`invalid_json:${names[0]}`);
    wrapped.code = "production_deployment_evidence_smoke_invalid_json";
    wrapped.option = names[0];
    wrapped.cause = error;
    throw wrapped;
  }
}

function inputFromArgs(args) {
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], "");
  return {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], ""),
    domain: firstArgValue(args, ["--domain"], ""),
    subject: firstArgValue(args, ["--subject"], ""),
    horizon: firstArgValue(args, ["--horizon"], "daily_plan") || "daily_plan",
    pluginId: firstArgValue(args, ["--plugin-id", "--pluginId"], "growth") || "growth",
    environment: firstArgValue(args, ["--environment", "--env"], "macos_production") || "macos_production",
    launchdLabel: firstArgValue(args, ["--launchd-label", "--launchdLabel"], "com.hermesmobile.plugin.growth") || "com.hermesmobile.plugin.growth",
    evidenceFile: firstArgValue(args, [
      "--production-deployment-evidence-file",
      "--productionDeploymentEvidenceFile",
      "--deployment-evidence-file",
      "--deploymentEvidenceFile",
      "--evidence-file",
      "--evidenceFile"
    ], ""),
    evidence: parseJsonArg(args, [
      "--production-deployment-evidence-json",
      "--productionDeploymentEvidenceJson",
      "--deployment-evidence-json",
      "--deploymentEvidenceJson",
      "--evidence-json",
      "--evidenceJson"
    ], null)
  };
}

function projectProductionDeploymentEvidenceSmokeReadback(result = {}, input = {}) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const deploymentEvidence = objectOnly(readback.deploymentEvidence);
  const deploymentBoundary = objectOnly(readback.deploymentBoundary);
  const missingRequired = uniqueBoundedStrings(readback.missingRequired, 16);
  const privateValueFindings = uniqueBoundedStrings(readback.privateValueFindings, 16);
  return Object.assign({}, readback, {
    productionDeploymentEvidenceStatus: cleanString(readback.status || readback.error || (readback.ok ? "pass" : "missing"), 120),
    productionDeploymentEvidenceOk: readback.ok === true,
    productionDeploymentEvidenceWriteOperation: false,
    productionDeploymentEvidenceWriteAllowed: false,
    productionDeploymentEvidenceWritesPerformed: false,
    productionDeploymentEvidenceWorkspaceId: cleanString(readback.workspaceId || input.workspaceId, 160),
    productionDeploymentEvidenceLearnerId: cleanString(readback.learnerId || input.learnerId, 160),
    productionDeploymentEvidenceProgramId: cleanString(readback.programId || input.programId, 160),
    productionDeploymentEvidenceDomainPackId: cleanString(readback.domainPackId || input.domainPackId, 180),
    productionDeploymentEvidenceDomain: cleanString(readback.domain || input.domain, 120),
    productionDeploymentEvidenceSubject: cleanString(readback.subject || input.subject, 120),
    productionDeploymentEvidenceHorizon: cleanString(readback.horizon || input.horizon, 80),
    productionDeploymentEvidencePluginId: cleanString(readback.pluginId || input.pluginId, 120),
    productionDeploymentEvidenceEnvironment: cleanString(readback.environment || input.environment, 120),
    productionDeploymentEvidenceLaunchdLabel: cleanString(readback.launchdLabel || input.launchdLabel, 160),
    productionDeploymentEvidenceSource: cleanString(readback.source, 180),
    productionDeploymentEvidenceSchemaVersion: cleanString(readback.schemaVersion, 180),
    productionDeploymentEvidencePrivacyClass: cleanString(readback.privacyClass, 80),
    productionDeploymentEvidenceSummaryOnly: readback.summaryOnly === true,
    productionDeploymentEvidenceReadyForReleaseEvidence: readback.readyForReleaseEvidence === true,
    productionDeploymentEvidenceMissingRequired: missingRequired,
    productionDeploymentEvidenceMissingRequiredCount: missingRequired.length,
    productionDeploymentEvidencePrivateValueFindings: privateValueFindings,
    productionDeploymentEvidencePrivateValueFindingCount: privateValueFindings.length,
    productionDeploymentEvidenceDeploymentSource: cleanString(deploymentEvidence.source, 180),
    productionDeploymentEvidenceDeploymentStatus: cleanString(deploymentEvidence.status, 80),
    productionDeploymentEvidenceDeploymentContractVersion: cleanString(deploymentEvidence.deploymentContractVersion, 180),
    productionDeploymentEvidenceCheckedAt: cleanString(deploymentEvidence.checkedAt, 120),
    productionDeploymentEvidenceDeployedAt: cleanString(deploymentEvidence.deployedAt, 120),
    productionDeploymentEvidenceReleaseVersion: cleanString(deploymentEvidence.releaseVersion, 160),
    productionDeploymentEvidenceGitCommit: cleanString(deploymentEvidence.gitCommit, 120),
    productionDeploymentEvidenceRunId: cleanString(deploymentEvidence.runId, 180),
    productionDeploymentEvidenceArtifactId: cleanString(deploymentEvidence.artifactId, 180),
    productionDeploymentEvidenceServiceRunning: deploymentEvidence.serviceRunning === true,
    productionDeploymentEvidenceManifestOk: deploymentEvidence.manifestOk === true,
    productionDeploymentEvidenceHealthOk: deploymentEvidence.healthOk === true,
    productionDeploymentEvidenceEndpointReachable: deploymentEvidence.endpointReachable === true,
    productionDeploymentEvidenceSqliteIntegrityOk: deploymentEvidence.sqliteIntegrityOk === true,
    productionDeploymentEvidenceEvidenceFilePresent: deploymentEvidence.evidenceFilePresent === true,
    productionDeploymentEvidenceEvidenceFileName: cleanString(deploymentEvidence.evidenceFileName, 220),
    productionDeploymentEvidenceCheckCount: numberValue(deploymentEvidence.checkCount, 0),
    productionDeploymentEvidenceFailedCheckCount: numberValue(deploymentEvidence.failedCheckCount, 0),
    productionDeploymentEvidenceBoundarySummaryOnly: deploymentBoundary.summaryOnly === true,
    productionDeploymentEvidenceHomeAiOwnsDeployment: deploymentBoundary.homeAiOwnsDeployment === true,
    productionDeploymentEvidenceGrowthRunsNoDeployment: deploymentBoundary.growthRunsNoDeployment === true,
    productionDeploymentEvidenceGrowthReadsOnlyDeploymentHealthSummary: deploymentBoundary.growthReadsOnlyDeploymentHealthSummary === true,
    productionDeploymentEvidenceNoRuntimeConfigMutation: deploymentBoundary.noRuntimeConfigMutation === true,
    productionDeploymentEvidenceRuntimeConfigChange: false,
    productionDeploymentEvidenceConfigChangeApplied: false,
    productionDeploymentEvidenceWritefulSchedulingAllowed: false
  });
}

function formatResult(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json") || hasFlag(args, "--pretty");
  let input;
  try {
    input = inputFromArgs(args);
  } catch (error) {
    process.stdout.write(formatResult({
      ok: false,
      error: error.code || "production_deployment_evidence_smoke_invalid_input",
      option: error.option || ""
    }, pretty));
    process.exitCode = 2;
    return;
  }
  if (!input.workspaceId) {
    process.stdout.write(formatResult({
      ok: false,
      error: "production_deployment_evidence_workspace_required"
    }, pretty));
    process.exitCode = 2;
    return;
  }
  if (!input.evidenceFile) {
    input.evidenceFile = process.env.GROWTH_PRODUCTION_DEPLOYMENT_EVIDENCE_FILE || "";
  }
  const config = readEnv(process.env);
  const services = createServices(config);
  const result = projectProductionDeploymentEvidenceSmokeReadback(
    services.learningAutomationProductionDeploymentEvidenceService.evaluate(input),
    input
  );
  process.stdout.write(formatResult(result, pretty));
  process.exitCode = 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "production_deployment_evidence_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  projectProductionDeploymentEvidenceSmokeReadback
};
