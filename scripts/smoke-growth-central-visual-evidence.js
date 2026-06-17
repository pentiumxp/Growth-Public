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
    wrapped.code = "central_visual_evidence_smoke_invalid_json";
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
    scenario: firstArgValue(args, ["--scenario"], "embedded-plugin-shell") || "embedded-plugin-shell",
    evidenceFile: firstArgValue(args, [
      "--central-visual-evidence-file",
      "--centralVisualEvidenceFile",
      "--evidence-file",
      "--evidenceFile"
    ], ""),
    evidence: parseJsonArg(args, [
      "--central-visual-evidence-json",
      "--centralVisualEvidenceJson",
      "--evidence-json",
      "--evidenceJson"
    ], null)
  };
}

function projectCentralVisualEvidenceSmokeReadback(result = {}, input = {}) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const visualEvidence = objectOnly(readback.visualEvidence);
  const centralBoundary = objectOnly(readback.centralBoundary);
  const missingRequired = uniqueBoundedStrings(readback.missingRequired, 16);
  const privateValueFindings = uniqueBoundedStrings(readback.privateValueFindings, 16);
  return Object.assign({}, readback, {
    centralVisualEvidenceStatus: cleanString(readback.status || readback.error || (readback.ok ? "pass" : "missing"), 120),
    centralVisualEvidenceOk: readback.ok === true,
    centralVisualEvidenceWriteOperation: false,
    centralVisualEvidenceWriteAllowed: false,
    centralVisualEvidenceWritesPerformed: false,
    centralVisualEvidenceWorkspaceId: cleanString(readback.workspaceId || input.workspaceId, 160),
    centralVisualEvidenceLearnerId: cleanString(readback.learnerId || input.learnerId, 160),
    centralVisualEvidenceProgramId: cleanString(readback.programId || input.programId, 160),
    centralVisualEvidenceDomainPackId: cleanString(readback.domainPackId || input.domainPackId, 180),
    centralVisualEvidenceDomain: cleanString(readback.domain || input.domain, 120),
    centralVisualEvidenceSubject: cleanString(readback.subject || input.subject, 120),
    centralVisualEvidenceHorizon: cleanString(readback.horizon || input.horizon, 80),
    centralVisualEvidencePluginId: cleanString(readback.pluginId || input.pluginId, 120),
    centralVisualEvidenceScenario: cleanString(readback.scenario || input.scenario, 160),
    centralVisualEvidenceSource: cleanString(readback.source, 180),
    centralVisualEvidenceSchemaVersion: cleanString(readback.schemaVersion, 180),
    centralVisualEvidencePrivacyClass: cleanString(readback.privacyClass, 80),
    centralVisualEvidenceSummaryOnly: readback.summaryOnly === true,
    centralVisualEvidenceReadyForReleaseEvidence: readback.readyForReleaseEvidence === true,
    centralVisualEvidenceMissingRequired: missingRequired,
    centralVisualEvidenceMissingRequiredCount: missingRequired.length,
    centralVisualEvidencePrivateValueFindings: privateValueFindings,
    centralVisualEvidencePrivateValueFindingCount: privateValueFindings.length,
    centralVisualEvidenceVisualSource: cleanString(visualEvidence.source, 180),
    centralVisualEvidenceVisualPluginId: cleanString(visualEvidence.pluginId, 120),
    centralVisualEvidenceVisualScenario: cleanString(visualEvidence.scenario, 160),
    centralVisualEvidenceVisualStatus: cleanString(visualEvidence.status, 80),
    centralVisualEvidenceCheckedAt: cleanString(visualEvidence.checkedAt, 120),
    centralVisualEvidenceClientVersion: cleanString(visualEvidence.clientVersion, 160),
    centralVisualEvidenceDebugUrlPresent: visualEvidence.debugUrlPresent === true,
    centralVisualEvidenceVisualLaneId: cleanString(visualEvidence.visualLaneId, 160),
    centralVisualEvidenceScreenshotPresent: visualEvidence.screenshotPresent === true,
    centralVisualEvidenceScreenshotArtifactName: cleanString(visualEvidence.screenshotArtifactName, 220),
    centralVisualEvidenceEvidenceFilePresent: visualEvidence.evidenceFilePresent === true,
    centralVisualEvidenceEvidenceFileName: cleanString(visualEvidence.evidenceFileName, 220),
    centralVisualEvidenceAssertionCount: numberValue(visualEvidence.assertionCount, 0),
    centralVisualEvidenceFailedAssertionCount: numberValue(visualEvidence.failedAssertionCount, 0),
    centralVisualEvidenceBoundarySummaryOnly: centralBoundary.summaryOnly === true,
    centralVisualEvidenceHomeAiOwnsVisualHarness: centralBoundary.homeAiOwnsVisualHarness === true,
    centralVisualEvidenceGrowthRunsNoAppium: centralBoundary.growthRunsNoAppium === true,
    centralVisualEvidenceGrowthReadsOnlyCentralHarnessArtifacts: centralBoundary.growthReadsOnlyCentralHarnessArtifacts === true,
    centralVisualEvidenceRuntimeConfigChange: false,
    centralVisualEvidenceConfigChangeApplied: false,
    centralVisualEvidenceWritefulSchedulingAllowed: false
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
      error: error.code || "central_visual_evidence_smoke_invalid_input",
      option: error.option || ""
    }, pretty));
    process.exitCode = 2;
    return;
  }
  if (!input.workspaceId) {
    process.stdout.write(formatResult({
      ok: false,
      error: "central_visual_evidence_workspace_required"
    }, pretty));
    process.exitCode = 2;
    return;
  }
  if (!input.evidenceFile) {
    input.evidenceFile = process.env.GROWTH_CENTRAL_VISUAL_EVIDENCE_FILE || "";
  }
  const config = readEnv(process.env);
  const services = createServices(config);
  const result = projectCentralVisualEvidenceSmokeReadback(
    services.learningAutomationCentralVisualEvidenceService.evaluate(input),
    input
  );
  process.stdout.write(formatResult(result, pretty));
  process.exitCode = 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "central_visual_evidence_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  projectCentralVisualEvidenceSmokeReadback
};
