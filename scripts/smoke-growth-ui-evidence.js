#!/usr/bin/env node
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

function uniqueBoundedStrings(values = [], limit = 24) {
  return Array.from(new Set(asArray(values).map((value) => cleanString(value, 180)).filter(Boolean))).slice(0, limit);
}

function parseJsonArg(args, names, fallback = null) {
  const text = firstArgValue(args, names, "");
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (error) {
    const wrapped = new Error(`invalid_json:${names[0]}`);
    wrapped.code = "ui_evidence_smoke_invalid_json";
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
    evidenceKey: firstArgValue(args, ["--evidence-key", "--evidenceKey", "--check-key", "--checkKey"], ""),
    uiGate: firstArgValue(args, ["--ui-gate", "--uiGate"], ""),
    evidenceFile: firstArgValue(args, [
      "--ui-evidence-file",
      "--uiEvidenceFile",
      "--evidence-file",
      "--evidenceFile"
    ], ""),
    evidence: parseJsonArg(args, [
      "--ui-evidence-json",
      "--uiEvidenceJson",
      "--evidence-json",
      "--evidenceJson"
    ], null)
  };
}

function projectUiEvidenceSmokeReadback(result = {}, input = {}) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const uiEvidence = objectOnly(readback.uiEvidence);
  const boundary = objectOnly(readback.uiEvidenceBoundary);
  const missingRequired = uniqueBoundedStrings(readback.missingRequired, 16);
  const privateValueFindings = uniqueBoundedStrings(readback.privateValueFindings, 16);
  const coverage = uniqueBoundedStrings(uiEvidence.coverage, 24);
  const requiredCoverage = uniqueBoundedStrings(uiEvidence.requiredCoverage, 24);
  const missingCoverage = uniqueBoundedStrings(uiEvidence.missingCoverage, 24);
  return Object.assign({}, readback, {
    uiEvidenceStatus: cleanString(readback.status || readback.error || (readback.ok ? "pass" : "missing"), 120),
    uiEvidenceOk: readback.ok === true,
    uiEvidenceWriteOperation: false,
    uiEvidenceWriteAllowed: false,
    uiEvidenceWritesPerformed: false,
    uiEvidenceWorkspaceId: cleanString(readback.workspaceId || input.workspaceId, 160),
    uiEvidenceLearnerId: cleanString(readback.learnerId || input.learnerId, 160),
    uiEvidenceProgramId: cleanString(readback.programId || input.programId, 160),
    uiEvidenceDomainPackId: cleanString(readback.domainPackId || input.domainPackId, 180),
    uiEvidenceDomain: cleanString(readback.domain || input.domain, 120),
    uiEvidenceSubject: cleanString(readback.subject || input.subject, 120),
    uiEvidenceHorizon: cleanString(readback.horizon || input.horizon, 80),
    uiEvidenceEvidenceKey: cleanString(readback.evidenceKey || input.evidenceKey, 160),
    uiEvidenceCheckKey: cleanString(readback.checkKey || input.evidenceKey, 160),
    uiEvidenceUiGate: cleanString(readback.uiGate || input.uiGate, 120),
    uiEvidenceLabel: cleanString(readback.label, 180),
    uiEvidenceSource: cleanString(readback.source, 180),
    uiEvidenceSchemaVersion: cleanString(readback.schemaVersion, 180),
    uiEvidencePrivacyClass: cleanString(readback.privacyClass, 80),
    uiEvidenceSummaryOnly: readback.summaryOnly === true,
    uiEvidenceReadyForReleaseEvidence: readback.readyForReleaseEvidence === true,
    uiEvidenceMissingRequired: missingRequired,
    uiEvidenceMissingRequiredCount: missingRequired.length,
    uiEvidencePrivateValueFindings: privateValueFindings,
    uiEvidencePrivateValueFindingCount: privateValueFindings.length,
    uiEvidenceProjectedSource: cleanString(uiEvidence.source, 180),
    uiEvidenceProjectedEvidenceKey: cleanString(uiEvidence.evidenceKey, 160),
    uiEvidenceProjectedCheckKey: cleanString(uiEvidence.checkKey, 160),
    uiEvidenceProjectedUiGate: cleanString(uiEvidence.uiGate, 120),
    uiEvidenceProjectedStatus: cleanString(uiEvidence.status, 80),
    uiEvidenceCheckedAt: cleanString(uiEvidence.checkedAt, 120),
    uiEvidenceClientVersion: cleanString(uiEvidence.clientVersion, 160),
    uiEvidenceRoute: cleanString(uiEvidence.route, 220),
    uiEvidenceScreen: cleanString(uiEvidence.screen, 120),
    uiEvidenceScreenshotPresent: uiEvidence.screenshotPresent === true,
    uiEvidenceDomEvidencePresent: uiEvidence.domEvidencePresent === true,
    uiEvidenceScreenshotArtifactName: cleanString(uiEvidence.screenshotArtifactName, 220),
    uiEvidenceEvidenceFilePresent: uiEvidence.evidenceFilePresent === true,
    uiEvidenceEvidenceFileName: cleanString(uiEvidence.evidenceFileName, 220),
    uiEvidenceCoverage: coverage,
    uiEvidenceCoverageCount: coverage.length,
    uiEvidenceRequiredCoverage: requiredCoverage,
    uiEvidenceRequiredCoverageCount: requiredCoverage.length,
    uiEvidenceMissingCoverage: missingCoverage,
    uiEvidenceMissingCoverageCount: missingCoverage.length,
    uiEvidenceAssertionCount: numberValue(uiEvidence.assertionCount, 0),
    uiEvidenceFailedAssertionCount: numberValue(uiEvidence.failedAssertionCount, 0),
    uiEvidenceBoundarySummaryOnly: boundary.summaryOnly === true,
    uiEvidenceGrowthReadsOnlyEvidenceArtifacts: boundary.growthReadsOnlyEvidenceArtifacts === true,
    uiEvidenceGrowthRunsNoVisualTooling: boundary.growthRunsNoVisualTooling === true,
    uiEvidenceHomeAiOwnsVisualHarness: boundary.homeAiOwnsVisualHarness === true,
    uiEvidenceNoLearnerStateMutation: boundary.noLearnerStateMutation === true,
    uiEvidenceNoModelCalls: boundary.noModelCalls === true,
    uiEvidenceRuntimeConfigChange: false,
    uiEvidenceConfigChangeApplied: false,
    uiEvidenceWritefulSchedulingAllowed: false
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
      error: error.code || "ui_evidence_smoke_invalid_input",
      option: error.option || ""
    }, pretty));
    process.exitCode = 2;
    return;
  }
  if (!input.workspaceId) {
    process.stdout.write(formatResult({
      ok: false,
      error: "ui_evidence_workspace_required"
    }, pretty));
    process.exitCode = 2;
    return;
  }
  if (!input.evidenceFile) {
    input.evidenceFile = process.env.GROWTH_UI_EVIDENCE_FILE || "";
  }
  const config = readEnv(process.env);
  const services = createServices(config);
  const result = projectUiEvidenceSmokeReadback(
    services.learningAutomationUiEvidenceService.evaluate(input),
    input
  );
  process.stdout.write(formatResult(result, pretty));
  process.exitCode = 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "ui_evidence_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  projectUiEvidenceSmokeReadback
};
