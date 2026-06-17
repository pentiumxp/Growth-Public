"use strict";

const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const COLLECTOR_SCHEMA = "growth.homeAiProductionDeploymentHealthArtifact.v1";
const DEFAULT_PLUGIN_ID = "growth";
const DEFAULT_ENVIRONMENT = "macos_production";
const DEFAULT_LAUNCHD_LABEL = "com.hermesmobile.plugin.growth";
const DEFAULT_BASE_URL = "http://127.0.0.1:4881";
const DEFAULT_CONTRACT_FILE = path.join(__dirname, "..", "docs", "HOME_AI_PLATFORM_CONTRACT.md");
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|X-Hermes-Web-Key|X-Hermes-Access-Key|access-key\.txt|access-key|launch-token|secret|token|password|cookie)/i;

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function hasFlag(args, name) {
  return args.includes(name);
}

function argValue(args, name, fallback = "") {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  return String(args[index + 1] || fallback);
}

function firstArgValue(args, names, fallback = "") {
  for (const name of names) {
    const value = argValue(args, name, "");
    if (value) return value;
  }
  return fallback;
}

function numberArg(args, names, fallback) {
  const value = firstArgValue(args, names, "");
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function nowIso(now) {
  const value = typeof now === "function" ? now() : new Date();
  if (value instanceof Date) return value.toISOString();
  return cleanString(value, 80) || new Date().toISOString();
}

function defaultManifestUrl(baseUrl) {
  return `${String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "")}/api/v1/hermes/plugin/manifest`;
}

function defaultStatusUrl(baseUrl) {
  return `${String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "")}/api/v1/growth/status`;
}

function appendWorkspaceQuery(urlText, workspaceId) {
  const cleanWorkspaceId = cleanString(workspaceId, 160);
  if (!cleanWorkspaceId) return urlText;
  try {
    const url = new URL(urlText);
    if (!url.searchParams.has("workspace_id") && !url.searchParams.has("workspaceId")) {
      url.searchParams.set("workspace_id", cleanWorkspaceId);
    }
    return url.toString();
  } catch {
    return urlText;
  }
}

function contractVersionFromText(text) {
  const match = String(text || "").match(/Home AI platform contract version:\s*`([^`]+)`/i);
  return cleanString(match && match[1], 120);
}

function readContractVersion({ contractFile = DEFAULT_CONTRACT_FILE, readFile = fs.readFileSync } = {}) {
  try {
    return contractVersionFromText(readFile(contractFile, "utf8"));
  } catch {
    return "";
  }
}

function parseArgs(args = process.argv.slice(2), env = process.env) {
  const baseUrl = firstArgValue(args, ["--base-url", "--baseUrl"], env.GROWTH_PRODUCTION_BASE_URL || DEFAULT_BASE_URL) || DEFAULT_BASE_URL;
  const outputFile = firstArgValue(args, ["--output-file", "--outputFile", "--evidence-file", "--evidenceFile"], "");
  return {
    pluginId: firstArgValue(args, ["--plugin-id", "--pluginId"], DEFAULT_PLUGIN_ID) || DEFAULT_PLUGIN_ID,
    environment: firstArgValue(args, ["--environment", "--env"], DEFAULT_ENVIRONMENT) || DEFAULT_ENVIRONMENT,
    launchdLabel: firstArgValue(args, ["--launchd-label", "--launchdLabel"], DEFAULT_LAUNCHD_LABEL) || DEFAULT_LAUNCHD_LABEL,
    baseUrl,
    manifestUrl: firstArgValue(args, ["--manifest-url", "--manifestUrl"], defaultManifestUrl(baseUrl)),
    statusUrl: firstArgValue(args, ["--status-url", "--statusUrl", "--health-url", "--healthUrl"], defaultStatusUrl(baseUrl)),
    statusWorkspaceId: firstArgValue(args, ["--status-workspace-id", "--statusWorkspaceId", "--workspace-id", "--workspaceId"], "growth:local-dev") || "growth:local-dev",
    deploymentContractVersion: firstArgValue(args, ["--deployment-contract-version", "--deploymentContractVersion", "--contract-version", "--contractVersion"], ""),
    releaseVersion: firstArgValue(args, ["--release-version", "--releaseVersion"], ""),
    gitCommit: firstArgValue(args, ["--git-commit", "--gitCommit"], ""),
    timeoutMs: numberArg(args, ["--timeout-ms", "--timeoutMs"], 5000),
    outputFile,
    json: hasFlag(args, "--json") || hasFlag(args, "--pretty"),
    pretty: hasFlag(args, "--json") || hasFlag(args, "--pretty")
  };
}

function runCommand(commandRunner, file, args = [], options = {}) {
  try {
    const stdout = commandRunner(file, args, Object.assign({
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: options.timeoutMs || 5000
    }, options));
    return { ok: true, stdout: String(stdout || "") };
  } catch (error) {
    return {
      ok: false,
      error: cleanString(error && error.code ? error.code : (error && error.message ? error.message : error), 120)
    };
  }
}

function launchdStateFromOutput(output = "") {
  const text = String(output || "");
  const stateMatch = text.match(/^\s*state\s*=\s*([^\n]+)$/m);
  const state = cleanString(stateMatch && stateMatch[1], 80).toLowerCase();
  if (state === "running") return { ok: true, state: "running" };
  if (state) return { ok: false, state };
  if (/^\s*pid\s*=\s*\d+/m.test(text)) return { ok: true, state: "running" };
  return { ok: false, state: "unknown" };
}

function launchdCheck({ launchdLabel, timeoutMs }, { commandRunner = childProcess.execFileSync } = {}) {
  const result = runCommand(commandRunner, "launchctl", ["print", `system/${launchdLabel}`], { timeoutMs });
  if (!result.ok) {
    return {
      key: "launchd_service_health",
      status: "blocked",
      ok: false,
      state: "unavailable",
      error: "launchd_read_failed"
    };
  }
  const parsed = launchdStateFromOutput(result.stdout);
  return {
    key: "launchd_service_health",
    status: parsed.ok ? "pass" : "blocked",
    ok: parsed.ok,
    state: parsed.state
  };
}

async function fetchJson(url, { fetchImpl = globalThis.fetch, timeoutMs = 5000 } = {}) {
  if (typeof fetchImpl !== "function") {
    return { ok: false, status: 0, error: "fetch_unavailable" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      return { ok: false, status: response.status || 0, error: "invalid_json" };
    }
    return { ok: response.ok, status: response.status || 0, json };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error && error.name === "AbortError" ? "timeout" : "fetch_failed"
    };
  } finally {
    clearTimeout(timer);
  }
}

function manifestCheck(result = {}, pluginId = DEFAULT_PLUGIN_ID) {
  const manifest = result.json && typeof result.json === "object" ? result.json : {};
  const ok = result.ok === true && cleanString(manifest.id || manifest.pluginId || manifest.plugin_id, 80) === pluginId;
  return {
    key: "plugin_manifest_health",
    status: ok ? "pass" : "blocked",
    ok,
    httpStatus: Number(result.status || 0) || 0,
    pluginId: cleanString(manifest.id || manifest.pluginId || manifest.plugin_id, 80),
    actionCount: Array.isArray(manifest.actions) ? manifest.actions.length : 0
  };
}

function statusCheck(result = {}) {
  const status = result.json && typeof result.json === "object" ? result.json : {};
  const ok = result.ok === true && status.ok === true;
  const migration = status.migration && typeof status.migration === "object" ? status.migration : {};
  return {
    key: "production_health_smoke",
    status: ok ? "pass" : "blocked",
    ok,
    httpStatus: Number(result.status || 0) || 0,
    source: cleanString(status.source, 120),
    stage: cleanString(status.stage, 120),
    sqliteIntegrityOk: migration.ok === true,
    sqliteBusyTimeoutMs: Number(migration.sqlite_busy_timeout_ms || 0) || 0
  };
}

function deploymentContractCheck(version = "") {
  const ok = Boolean(cleanString(version, 120));
  return {
    key: "deployment_contract_readback",
    status: ok ? "pass" : "blocked",
    ok,
    contractVersionPresent: ok
  };
}

function publicCheck(check = {}) {
  return Object.fromEntries(Object.entries({
    key: cleanString(check.key, 120),
    status: cleanString(check.status, 80),
    ok: check.ok === true,
    state: cleanString(check.state, 80),
    httpStatus: Number(check.httpStatus || 0) || 0,
    pluginId: cleanString(check.pluginId, 80),
    actionCount: Number(check.actionCount || 0) || 0,
    source: cleanString(check.source, 120),
    stage: cleanString(check.stage, 120),
    sqliteIntegrityOk: check.sqliteIntegrityOk === true,
    sqliteBusyTimeoutMs: Number(check.sqliteBusyTimeoutMs || 0) || 0,
    contractVersionPresent: check.contractVersionPresent === true,
    error: cleanString(check.error, 120)
  }).filter(([, value]) => {
    if (typeof value === "number") return value > 0;
    if (typeof value === "boolean") return value === true;
    return value !== "";
  }));
}

function hasPrivateValue(value) {
  if (typeof value === "string") return PRIVATE_VALUE_PATTERN.test(value);
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasPrivateValue);
  return Object.values(value).some(hasPrivateValue);
}

function buildArtifact({ input = {}, checkedAt = "", checks = [] } = {}) {
  const publicChecks = checks.map(publicCheck);
  const failedChecks = publicChecks.filter((check) => check.ok !== true || ["blocked", "failed", "fail", "error"].includes(cleanString(check.status, 80).toLowerCase()));
  const launchd = publicChecks.find((check) => check.key === "launchd_service_health") || {};
  const manifest = publicChecks.find((check) => check.key === "plugin_manifest_health") || {};
  const health = publicChecks.find((check) => check.key === "production_health_smoke") || {};
  const contract = publicChecks.find((check) => check.key === "deployment_contract_readback") || {};
  const pass = failedChecks.length === 0;
  const timestampId = cleanString(checkedAt, 80).replace(/[^0-9A-Za-z]+/g, "").slice(0, 32);
  const evidence = {
    ok: pass,
    source: "home-ai-macos-deployment-contract",
    pluginId: input.pluginId || DEFAULT_PLUGIN_ID,
    environment: input.environment || DEFAULT_ENVIRONMENT,
    launchdLabel: input.launchdLabel || DEFAULT_LAUNCHD_LABEL,
    status: pass ? "pass" : "blocked",
    checkedAt,
    deploymentContractVersion: input.deploymentContractVersion || "",
    releaseVersion: input.releaseVersion || "",
    gitCommit: input.gitCommit || "",
    runId: `growth_production_deployment_health_${timestampId || "unknown"}`,
    artifactId: `growth_production_deployment_health_${timestampId || "unknown"}`,
    serviceRunning: launchd.ok === true,
    manifestOk: manifest.ok === true,
    healthOk: health.ok === true,
    endpointReachable: manifest.ok === true || health.ok === true,
    sqliteIntegrityOk: health.sqliteIntegrityOk === true,
    checkCount: publicChecks.length,
    failedCheckCount: failedChecks.length,
    checks: publicChecks
  };
  const compactEvidence = Object.fromEntries(Object.entries(evidence).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== "";
  }));
  return {
    schemaVersion: COLLECTOR_SCHEMA,
    privacyClass: "summary_only",
    summaryOnly: true,
    source: "growth-production-deployment-health-collector",
    checkedAt,
    productionDeploymentEvidence: compactEvidence,
    collectorBoundary: {
      summaryOnly: true,
      readOnly: true,
      growthRunsNoDeployment: true,
      noRuntimeConfigMutation: true,
      noSchedulerPermission: true,
      noModelCalls: true,
      rawLaunchdOutputRedacted: true
    }
  };
}

async function collectProductionDeploymentEvidence(input = {}, deps = {}) {
  const checkedAt = nowIso(deps.now);
  const deploymentContractVersion = input.deploymentContractVersion
    || readContractVersion({ contractFile: deps.contractFile || DEFAULT_CONTRACT_FILE, readFile: deps.readFile || fs.readFileSync });
  const normalized = Object.assign({}, input, {
    pluginId: input.pluginId || DEFAULT_PLUGIN_ID,
    environment: input.environment || DEFAULT_ENVIRONMENT,
    launchdLabel: input.launchdLabel || DEFAULT_LAUNCHD_LABEL,
    deploymentContractVersion
  });
  const launchd = launchdCheck(normalized, deps);
  const manifest = manifestCheck(await fetchJson(normalized.manifestUrl || defaultManifestUrl(normalized.baseUrl), {
    fetchImpl: deps.fetchImpl || globalThis.fetch,
    timeoutMs: normalized.timeoutMs
  }), normalized.pluginId);
  const health = statusCheck(await fetchJson(appendWorkspaceQuery(normalized.statusUrl || defaultStatusUrl(normalized.baseUrl), normalized.statusWorkspaceId), {
    fetchImpl: deps.fetchImpl || globalThis.fetch,
    timeoutMs: normalized.timeoutMs
  }));
  const contract = deploymentContractCheck(deploymentContractVersion);
  const artifact = buildArtifact({
    input: normalized,
    checkedAt,
    checks: [contract, launchd, manifest, health]
  });
  if (hasPrivateValue(artifact)) {
    return {
      schemaVersion: COLLECTOR_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      source: "growth-production-deployment-health-collector",
      checkedAt,
      error: "production_deployment_health_collector_private_value_detected",
      productionDeploymentEvidence: {
        ok: false,
        pluginId: normalized.pluginId,
        environment: normalized.environment,
        launchdLabel: normalized.launchdLabel,
        status: "blocked",
        checkedAt,
        deploymentContractVersion,
        serviceRunning: false,
        manifestOk: false,
        healthOk: false,
        endpointReachable: false,
        checkCount: 0,
        failedCheckCount: 1,
        checks: [{ key: "no_private_value_leaks", status: "blocked", ok: false }]
      }
    };
  }
  return artifact;
}

function formatJson(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const input = parseArgs();
  const artifact = await collectProductionDeploymentEvidence(input);
  if (input.outputFile) {
    fs.mkdirSync(path.dirname(input.outputFile), { recursive: true });
    fs.writeFileSync(input.outputFile, formatJson(artifact, true), "utf8");
  }
  process.stdout.write(formatJson(input.outputFile && !input.json
    ? {
        ok: artifact.productionDeploymentEvidence?.ok === true,
        schemaVersion: artifact.schemaVersion,
        privacyClass: artifact.privacyClass,
        summaryOnly: artifact.summaryOnly === true,
        status: artifact.productionDeploymentEvidence?.status || "blocked",
        evidenceFileName: path.basename(input.outputFile),
        checkCount: artifact.productionDeploymentEvidence?.checkCount || 0,
        failedCheckCount: artifact.productionDeploymentEvidence?.failedCheckCount || 0
      }
    : artifact, input.pretty));
  process.exitCode = artifact.productionDeploymentEvidence?.ok === true ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatJson({
      ok: false,
      schemaVersion: COLLECTOR_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      error: "production_deployment_health_collector_failed",
      detail: cleanString(error && error.message ? error.message : error, 160)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  COLLECTOR_SCHEMA,
  appendWorkspaceQuery,
  buildArtifact,
  collectProductionDeploymentEvidence,
  contractVersionFromText,
  launchdStateFromOutput,
  parseArgs
};
