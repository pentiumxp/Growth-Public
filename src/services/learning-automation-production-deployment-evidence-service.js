"use strict";

const path = require("node:path");

const PRODUCTION_DEPLOYMENT_EVIDENCE_SCHEMA = "growth.learningAutomationProductionDeploymentEvidence.v1";
const DEFAULT_PLUGIN_ID = "growth";
const DEFAULT_ENVIRONMENT = "macos_production";
const DEFAULT_LAUNCHD_LABEL = "com.hermesmobile.plugin.growth";
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization|localstorage|sessionstorage|cookie.*jar|raw.*log|full.*log)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|X-Hermes-Web-Key|X-Hermes-Access-Key|access-key\.txt|access-key|launch-token)/i;

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function scanPrivacy(value, pathName = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, `${pathName}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${pathName}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacy(child, childPath, findings);
  }
  return findings;
}

function scanPrivateValues(value, pathName = "$", findings = []) {
  if (typeof value === "string") {
    if (PRIVATE_VALUE_PATTERN.test(value)) findings.push(pathName);
    return findings;
  }
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivateValues(item, `${pathName}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    scanPrivateValues(child, `${pathName}.${key}`, findings);
  }
  return findings;
}

function redactPrivateValues(value) {
  if (typeof value === "string") {
    return PRIVATE_VALUE_PATTERN.test(value) ? "[private_value_redacted]" : value;
  }
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redactPrivateValues);
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, redactPrivateValues(child)]));
}

function publicScope(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id, 120);
  return {
    workspaceId,
    learnerId: cleanString(input.learnerId || input.learner_id || workspaceId, 120),
    programId: cleanString(input.programId || input.program_id, 120),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id, 120),
    domain: cleanString(input.domain, 80),
    subject: cleanString(input.subject, 80),
    horizon: cleanString(input.horizon || "daily_plan", 80),
    pluginId: cleanString(input.pluginId || input.plugin_id || DEFAULT_PLUGIN_ID, 80) || DEFAULT_PLUGIN_ID,
    environment: cleanString(input.environment || input.env || DEFAULT_ENVIRONMENT, 80) || DEFAULT_ENVIRONMENT,
    launchdLabel: cleanString(input.launchdLabel || input.launchd_label || DEFAULT_LAUNCHD_LABEL, 120) || DEFAULT_LAUNCHD_LABEL
  };
}

function readEvidenceFile(readFile, evidenceFile) {
  if (!evidenceFile) return { ok: true, value: null };
  if (typeof readFile !== "function") {
    return { ok: false, error: "production_deployment_evidence_file_reader_unavailable" };
  }
  try {
    return { ok: true, value: JSON.parse(String(readFile(evidenceFile, "utf8") || "")) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof SyntaxError
        ? "production_deployment_evidence_file_invalid_json"
        : "production_deployment_evidence_file_unreadable",
      detail: cleanString(error && error.message ? error.message : error, 160)
    };
  }
}

function evidencePayload(input = {}, readFile) {
  const inline = input.evidence
    || input.productionDeploymentEvidence
    || input.production_deployment_evidence
    || input.deploymentEvidence
    || input.deployment_evidence
    || null;
  if (inline && typeof inline === "object") return { ok: true, value: inline, evidenceFile: "" };
  const evidenceFile = cleanString(
    input.evidenceFile
      || input.evidence_file
      || input.productionDeploymentEvidenceFile
      || input.production_deployment_evidence_file
      || input.deploymentEvidenceFile
      || input.deployment_evidence_file,
    500
  );
  const fileResult = readEvidenceFile(readFile, evidenceFile);
  return Object.assign({}, fileResult, { evidenceFile });
}

function nestedEvidence(value = {}) {
  const deploymentEvidence = objectOnly(value.productionDeploymentEvidence || value.production_deployment_evidence || value.deploymentEvidence || value.deployment_evidence);
  const evidence = objectOnly(value.evidence);
  const result = objectOnly(value.result);
  const health = objectOnly(value.health || value.serviceHealth || value.service_health);
  if (Object.keys(deploymentEvidence).length) return deploymentEvidence;
  if (Object.keys(result).length) return result;
  if (Object.keys(health).length) return Object.assign({}, value, health);
  if (Object.keys(evidence).length && !evidence.productionDeploymentEvidence) return evidence;
  if (evidence.productionDeploymentEvidence && typeof evidence.productionDeploymentEvidence === "object") return evidence.productionDeploymentEvidence;
  return objectOnly(value);
}

function booleanLikePass(value = {}) {
  const status = cleanString(value.status || value.result || value.state, 80).toLowerCase();
  return value.ok === true
    || value.passed === true
    || value.pass === true
    || status === "pass"
    || status === "passed"
    || status === "ok"
    || status === "healthy";
}

function checkEntries(value = {}) {
  return asArray(value.checks || value.results || value.assertions || value.healthChecks || value.health_checks);
}

function checkPass(value = {}, keys = []) {
  const lowerKeys = new Set(keys.map((key) => cleanString(key, 120).toLowerCase()).filter(Boolean));
  for (const item of checkEntries(value)) {
    if (!item || typeof item !== "object") continue;
    const key = cleanString(item.key || item.name || item.id || item.check || item.label, 120).toLowerCase();
    if (!lowerKeys.has(key)) continue;
    if (item.ok === true || item.pass === true || item.passed === true) return true;
    const status = cleanString(item.status || item.result || item.state, 80).toLowerCase();
    if (["pass", "passed", "ok", "healthy"].includes(status)) return true;
  }
  return false;
}

function boolField(value = {}, directKeys = [], checkKeys = []) {
  for (const key of directKeys) {
    if (value[key] === true) return true;
    const snake = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    if (value[snake] === true) return true;
  }
  return checkPass(value, checkKeys.length ? checkKeys : directKeys);
}

function evidencePluginId(value = {}) {
  return cleanString(value.pluginId || value.plugin_id || objectOnly(value.request).pluginId || objectOnly(value.request).plugin_id, 80);
}

function evidenceEnvironment(value = {}) {
  return cleanString(value.environment || value.env || value.targetEnvironment || value.target_environment || objectOnly(value.request).environment, 80);
}

function deploymentContractVersion(value = {}) {
  return cleanString(value.deploymentContractVersion || value.deployment_contract_version || value.contractVersion || value.contract_version || value.platformContractVersion || value.platform_contract_version, 160);
}

function publicDeploymentEvidence(value = {}, scope = {}, evidenceFile = "") {
  const serviceRunning = boolField(value, ["serviceRunning", "processRunning", "launchdRunning", "launchdLoaded"], ["service_running", "process_running", "launchd", "launchd_loaded"]);
  const manifestOk = boolField(value, ["manifestOk", "pluginManifestOk", "manifestReachable"], ["manifest", "plugin_manifest", "manifest_ok"]);
  const healthOk = boolField(value, ["healthOk", "healthCheckOk", "serviceHealthOk", "healthy"], ["health", "health_check", "service_health"]);
  const endpointReachable = boolField(value, ["endpointReachable", "baseUrlReachable", "pluginPortReachable", "portReachable"], ["endpoint", "base_url", "plugin_port"]);
  const sqliteIntegrityOk = boolField(value, ["sqliteIntegrityOk", "databaseIntegrityOk"], ["sqlite_integrity", "database_integrity"]);
  const suppliedEvidenceFileName = cleanString(value.evidenceFileName || value.evidence_file_name, 220);
  const failedChecks = checkEntries(value).filter((item) => {
    if (!item || typeof item !== "object") return false;
    const status = cleanString(item.status || item.result || item.state, 80).toLowerCase();
    return item.ok === false || item.pass === false || ["fail", "failed", "error", "blocked"].includes(status);
  });
  return {
    source: cleanString(value.source || "home-ai-macos-deployment-contract", 120),
    pluginId: evidencePluginId(value) || scope.pluginId,
    environment: evidenceEnvironment(value) || scope.environment,
    launchdLabel: cleanString(value.launchdLabel || value.launchd_label || scope.launchdLabel, 120),
    status: booleanLikePass(value) && failedChecks.length === 0 ? "pass" : "blocked",
    checkedAt: cleanString(value.checkedAt || value.checked_at || value.observedAt || value.observed_at || value.timestamp, 80),
    deployedAt: cleanString(value.deployedAt || value.deployed_at, 80),
    deploymentContractVersion: deploymentContractVersion(value),
    releaseVersion: cleanString(value.releaseVersion || value.release_version || value.version, 120),
    gitCommit: cleanString(value.gitCommit || value.git_commit || value.commit || value.sha, 80),
    runId: cleanString(value.runId || value.run_id || value.deploymentRunId || value.deployment_run_id, 160),
    artifactId: cleanString(value.artifactId || value.artifact_id || value.evidenceId || value.evidence_id, 160),
    serviceRunning,
    manifestOk,
    healthOk,
    endpointReachable,
    sqliteIntegrityOk,
    evidenceFilePresent: Boolean(evidenceFile) || value.evidenceFilePresent === true || value.evidence_file_present === true || Boolean(suppliedEvidenceFileName),
    evidenceFileName: evidenceFile ? path.basename(evidenceFile) : path.basename(suppliedEvidenceFileName),
    checkCount: checkEntries(value).length,
    failedCheckCount: failedChecks.length
  };
}

function environmentOk(value = "", expected = DEFAULT_ENVIRONMENT) {
  const actual = cleanString(value, 80).toLowerCase();
  const wanted = cleanString(expected, 80).toLowerCase();
  if (!actual) return false;
  if (actual === wanted) return true;
  return ["production", "prod", "macos_production", "macos-prod"].includes(actual);
}

function createLearningAutomationProductionDeploymentEvidenceService(options = {}) {
  const readFile = options.readFile || null;

  function evaluate(input = {}) {
    const scope = publicScope(input);
    if (!scope.workspaceId) {
      return { ok: false, error: "production_deployment_evidence_workspace_required" };
    }
    const privacyFindings = scanPrivacy(input).slice(0, 8);
    const scopePrivateValueFindings = scanPrivateValues(scope).slice(0, 8);
    if (privacyFindings.length || scopePrivateValueFindings.length) {
      return {
        ok: false,
        error: "production_deployment_evidence_privacy_failed",
        privacyFindings,
        privateValueFindings: scopePrivateValueFindings
      };
    }
    const payload = evidencePayload(input, readFile);
    if (!payload.ok) {
      return {
        ok: false,
        status: "blocked",
        error: payload.error,
        detail: payload.detail || "",
        missingRequired: payload.error === "production_deployment_evidence_file_reader_unavailable" ? ["production_deployment_evidence_reader"] : []
      };
    }
    if (!payload.value) {
      return {
        ok: false,
        status: "missing",
        error: "production_deployment_evidence_missing",
        missingRequired: ["production_deployment_evidence_file_or_json"]
      };
    }
    const evidence = nestedEvidence(payload.value);
    const nestedPrivacyFindings = scanPrivacy(evidence).slice(0, 8);
    if (nestedPrivacyFindings.length) {
      return {
        ok: false,
        status: "blocked",
        error: "production_deployment_evidence_privacy_failed",
        privacyFindings: nestedPrivacyFindings
      };
    }
    const projected = publicDeploymentEvidence(evidence, scope, payload.evidenceFile);
    const projectionPrivateValueFindings = scanPrivateValues(projected).slice(0, 8);
    const publicProjected = redactPrivateValues(projected);
    const pluginOk = projected.pluginId === scope.pluginId;
    const targetEnvironmentOk = environmentOk(projected.environment, scope.environment);
    const contractOk = Boolean(projected.deploymentContractVersion)
      || boolField(evidence, ["deploymentContractReadbackPresent", "deploymentContractOk"], ["deployment_contract", "deployment_contract_readback"]);
    const serviceOk = projected.serviceRunning;
    const manifestOk = projected.manifestOk;
    const healthOk = projected.healthOk;
    const privateValueOk = projectionPrivateValueFindings.length === 0;
    const pass = projected.status === "pass"
      && pluginOk
      && targetEnvironmentOk
      && contractOk
      && serviceOk
      && manifestOk
      && healthOk
      && privateValueOk;
    const missingRequired = [];
    if (!pluginOk) missingRequired.push("matching_plugin_id");
    if (!targetEnvironmentOk) missingRequired.push("macos_production_environment");
    if (!contractOk) missingRequired.push("deployment_contract_readback");
    if (!serviceOk) missingRequired.push("launchd_service_health");
    if (!manifestOk) missingRequired.push("plugin_manifest_health");
    if (!healthOk) missingRequired.push("production_health_smoke");
    if (!privateValueOk) missingRequired.push("no_private_value_leaks");
    if (projected.status !== "pass") missingRequired.push("passing_deployment_health_checks");
    return {
      ok: pass,
      source: "growth-learning-automation-production-deployment-evidence-service",
      schemaVersion: PRODUCTION_DEPLOYMENT_EVIDENCE_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      programId: scope.programId,
      domainPackId: scope.domainPackId,
      domain: scope.domain,
      subject: scope.subject,
      horizon: scope.horizon,
      pluginId: scope.pluginId,
      environment: scope.environment,
      launchdLabel: scope.launchdLabel,
      status: pass ? "pass" : "blocked",
      readyForReleaseEvidence: pass,
      deploymentEvidence: publicProjected,
      missingRequired,
      privateValueFindings: projectionPrivateValueFindings,
      deploymentBoundary: {
        summaryOnly: true,
        homeAiOwnsDeployment: true,
        homeAiOwnsServiceRestart: true,
        growthRunsNoDeployment: true,
        growthReadsOnlyDeploymentHealthSummary: true,
        noRuntimeConfigMutation: true,
        noSchedulerPermission: true
      },
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      configChangeApplied: false,
      error: pass ? "" : "production_deployment_evidence_incomplete"
    };
  }

  return {
    evaluate
  };
}

module.exports = {
  DEFAULT_ENVIRONMENT,
  PRODUCTION_DEPLOYMENT_EVIDENCE_SCHEMA,
  createLearningAutomationProductionDeploymentEvidenceService,
  publicScope
};
