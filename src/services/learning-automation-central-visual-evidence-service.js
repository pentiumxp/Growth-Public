"use strict";

const path = require("node:path");

const CENTRAL_VISUAL_EVIDENCE_SCHEMA = "growth.learningAutomationCentralVisualEvidence.v1";
const DEFAULT_PLUGIN_ID = "growth";
const DEFAULT_SCENARIO = "embedded-plugin-shell";
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization|localstorage|sessionstorage|cookie.*jar)/i;
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
    scenario: cleanString(input.scenario || DEFAULT_SCENARIO, 120) || DEFAULT_SCENARIO
  };
}

function readEvidenceFile(readFile, evidenceFile) {
  if (!evidenceFile) return { ok: true, value: null };
  if (typeof readFile !== "function") {
    return { ok: false, error: "central_visual_evidence_file_reader_unavailable" };
  }
  try {
    const text = readFile(evidenceFile, "utf8");
    const parsed = JSON.parse(String(text || ""));
    return { ok: true, value: parsed };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof SyntaxError
        ? "central_visual_evidence_file_invalid_json"
        : "central_visual_evidence_file_unreadable",
      detail: cleanString(error && error.message ? error.message : error, 160)
    };
  }
}

function evidencePayload(input = {}, readFile) {
  const inline = input.evidence || input.visualEvidence || input.centralVisualEvidence || input.central_visual_evidence || null;
  if (inline && typeof inline === "object") return { ok: true, value: inline, evidenceFile: "" };
  const evidenceFile = cleanString(input.evidenceFile || input.evidence_file || input.centralVisualEvidenceFile || input.central_visual_evidence_file, 500);
  const fileResult = readEvidenceFile(readFile, evidenceFile);
  return Object.assign({}, fileResult, { evidenceFile });
}

function nestedEvidence(value = {}) {
  const visualEvidence = objectOnly(value.visualEvidence || value.visual_evidence);
  const evidence = objectOnly(value.evidence);
  const result = objectOnly(value.result);
  if (Object.keys(visualEvidence).length) return visualEvidence;
  if (Object.keys(result).length) return result;
  if (Object.keys(evidence).length && !evidence.centralVisualEvidence) return evidence;
  if (evidence.centralVisualEvidence && typeof evidence.centralVisualEvidence === "object") return evidence.centralVisualEvidence;
  return objectOnly(value);
}

function booleanLikePass(value = {}) {
  const status = cleanString(value.status || value.result || value.state, 80).toLowerCase();
  return value.ok === true
    || value.passed === true
    || value.pass === true
    || status === "pass"
    || status === "passed"
    || status === "ok";
}

function screenshotName(value = {}) {
  const raw = cleanString(
    value.screenshotPath
      || value.screenshot_path
      || value.screenshot
      || value.screenshotFile
      || value.screenshot_file
      || objectOnly(value.artifacts).screenshotPath
      || objectOnly(value.artifacts).screenshot_path
      || objectOnly(value.artifact).screenshotPath
      || objectOnly(value.artifact).screenshot_path,
    500
  );
  return raw ? path.basename(raw) : "";
}

function hasScreenshot(value = {}) {
  return Boolean(
    screenshotName(value)
      || value.screenshotPresent === true
      || value.screenshot_present === true
      || Number(value.screenshotBytes || value.screenshot_bytes || 0) > 0
  );
}

function assertions(value = {}) {
  const direct = asArray(value.assertions);
  const results = asArray(value.results);
  const checks = asArray(value.checks);
  return direct.length ? direct : results.length ? results : checks;
}

function failedAssertions(value = {}) {
  const explicit = [
    ...asArray(value.failedAssertions || value.failed_assertions),
    ...asArray(value.failures),
    ...asArray(value.failed)
  ];
  const derived = assertions(value).filter((item) => {
    if (!item || typeof item !== "object") return false;
    const status = cleanString(item.status || item.result || item.state, 80).toLowerCase();
    return item.ok === false || item.pass === false || ["fail", "failed", "error", "blocked"].includes(status);
  });
  return explicit.concat(derived);
}

function evidenceScenario(value = {}) {
  return cleanString(value.scenario || value.scenarioId || value.scenario_id || objectOnly(value.request).scenario, 120);
}

function evidencePluginId(value = {}) {
  return cleanString(value.pluginId || value.plugin_id || objectOnly(value.request).pluginId || objectOnly(value.request).plugin_id, 80);
}

function publicVisualEvidence(value = {}, scope = {}, evidenceFile = "") {
  const artifactName = screenshotName(value);
  const failures = failedAssertions(value);
  return {
    source: cleanString(value.source || "home-ai-ios-pwa-visual-harness", 120),
    pluginId: evidencePluginId(value) || scope.pluginId,
    scenario: evidenceScenario(value) || scope.scenario,
    status: booleanLikePass(value) && failures.length === 0 ? "pass" : "blocked",
    checkedAt: cleanString(value.checkedAt || value.checked_at || value.createdAt || value.created_at || value.timestamp, 80),
    clientVersion: cleanString(value.clientVersion || value.client_version, 120),
    debugUrlPresent: Boolean(cleanString(value.debugUrl || value.debug_url || objectOnly(value.request).debugUrl || objectOnly(value.request).debug_url, 240)),
    visualLaneId: cleanString(value.visualLaneId || value.visual_lane_id || objectOnly(value.lane).id || objectOnly(value.visualLane).id, 120),
    screenshotPresent: hasScreenshot(value),
    screenshotArtifactName: artifactName,
    evidenceFilePresent: Boolean(evidenceFile),
    evidenceFileName: evidenceFile ? path.basename(evidenceFile) : "",
    assertionCount: assertions(value).length,
    failedAssertionCount: failures.length
  };
}

function createLearningAutomationCentralVisualEvidenceService(options = {}) {
  const readFile = options.readFile || null;

  function evaluate(input = {}) {
    const scope = publicScope(input);
    if (!scope.workspaceId) {
      return { ok: false, error: "central_visual_evidence_workspace_required" };
    }
    const privacyFindings = scanPrivacy(input).slice(0, 8);
    const scopePrivateValueFindings = scanPrivateValues(scope).slice(0, 8);
    if (privacyFindings.length || scopePrivateValueFindings.length) {
      return {
        ok: false,
        error: "central_visual_evidence_privacy_failed",
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
        missingRequired: payload.error === "central_visual_evidence_file_reader_unavailable" ? ["central_visual_evidence_reader"] : []
      };
    }
    if (!payload.value) {
      return {
        ok: false,
        status: "missing",
        error: "central_visual_evidence_missing",
        missingRequired: ["central_visual_evidence_file_or_json"]
      };
    }
    const evidence = nestedEvidence(payload.value);
    const nestedPrivacyFindings = scanPrivacy(evidence).slice(0, 8);
    if (nestedPrivacyFindings.length) {
      return {
        ok: false,
        status: "blocked",
        error: "central_visual_evidence_privacy_failed",
        privacyFindings: nestedPrivacyFindings
      };
    }
    const projected = publicVisualEvidence(evidence, scope, payload.evidenceFile);
    const projectionPrivateValueFindings = scanPrivateValues(projected).slice(0, 8);
    const publicProjected = redactPrivateValues(projected);
    const scenarioOk = projected.scenario === scope.scenario;
    const pluginOk = projected.pluginId === scope.pluginId;
    const screenshotOk = projected.screenshotPresent;
    const privateValueOk = projectionPrivateValueFindings.length === 0;
    const pass = projected.status === "pass" && scenarioOk && pluginOk && screenshotOk && privateValueOk;
    const missingRequired = [];
    if (!pluginOk) missingRequired.push("matching_plugin_id");
    if (!scenarioOk) missingRequired.push("matching_visual_scenario");
    if (!screenshotOk) missingRequired.push("visual_screenshot_artifact");
    if (!privateValueOk) missingRequired.push("no_private_value_leaks");
    if (projected.status !== "pass") missingRequired.push("passing_visual_assertions");
    return {
      ok: pass,
      source: "growth-learning-automation-central-visual-evidence-service",
      schemaVersion: CENTRAL_VISUAL_EVIDENCE_SCHEMA,
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
      scenario: scope.scenario,
      status: pass ? "pass" : "blocked",
      readyForReleaseEvidence: pass,
      visualEvidence: publicProjected,
      missingRequired,
      privateValueFindings: projectionPrivateValueFindings,
      centralBoundary: {
        summaryOnly: true,
        homeAiOwnsVisualHarness: true,
        growthRunsNoAppium: true,
        growthReadsOnlyCentralHarnessArtifacts: true
      },
      error: pass ? "" : "central_visual_evidence_incomplete"
    };
  }

  return {
    evaluate
  };
}

module.exports = {
  CENTRAL_VISUAL_EVIDENCE_SCHEMA,
  createLearningAutomationCentralVisualEvidenceService,
  publicScope
};
