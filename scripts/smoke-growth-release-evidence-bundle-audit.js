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

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
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

function uniqueStrings(values = [], limit = 32) {
  return Array.from(new Set(asArray(values).map((value) => cleanString(value, 220)).filter(Boolean))).slice(0, limit);
}

function firstArgValue(args, names, fallback = "") {
  for (const name of names) {
    const value = argValue(args, name, "");
    if (value) return value;
  }
  return fallback;
}

function collectRepeatedValues(args, names) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (names.includes(args[index])) {
      const value = String(args[index + 1] || "").trim();
      if (value) values.push(value);
    }
  }
  return values;
}

function csvValues(text = "") {
  return String(text || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function collectRequiredTasks(args) {
  return Array.from(new Set([
    ...collectRepeatedValues(args, ["--required-task", "--required-task-id", "--requiredTaskId"]),
    ...csvValues(firstArgValue(args, ["--required-tasks", "--required-task-ids", "--requiredTasks", "--requiredTaskIds"], ""))
  ].filter(Boolean)));
}

function parseJsonArg(args, names, fallback = null) {
  const text = firstArgValue(args, names, "");
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (error) {
    const wrapped = new Error(`invalid_json:${names[0]}`);
    wrapped.code = "release_evidence_bundle_audit_smoke_invalid_json";
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
    requiredTaskIds: collectRequiredTasks(args),
    bundleFile: firstArgValue(args, [
      "--release-evidence-bundle-file",
      "--releaseEvidenceBundleFile",
      "--evidence-bundle-file",
      "--evidenceBundleFile",
      "--bundle-file",
      "--bundleFile"
    ], ""),
    bundle: parseJsonArg(args, [
      "--release-evidence-bundle-json",
      "--releaseEvidenceBundleJson",
      "--evidence-bundle-json",
      "--evidenceBundleJson",
      "--bundle-json",
      "--bundleJson"
    ], null)
  };
}

function formatResult(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

function projectReleaseEvidenceBundleAuditSmokeReadback(result = {}, input = {}) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const bundle = objectOnly(readback.bundle);
  const audit = objectOnly(readback.audit);
  return Object.assign({}, readback, {
    releaseEvidenceBundleAuditStatus: cleanString(readback.status || (readback.ok === false ? readback.error : ""), 140),
    releaseEvidenceBundleAuditOk: readback.ok === true,
    releaseEvidenceBundleAuditReadyForReleaseEvidence: readback.readyForReleaseEvidence === true,
    releaseEvidenceBundleAuditWorkspaceId: cleanString(readback.workspaceId || input.workspaceId, 160),
    releaseEvidenceBundleAuditLearnerId: cleanString(readback.learnerId || input.learnerId, 160),
    releaseEvidenceBundleAuditProgramId: cleanString(readback.programId || input.programId, 160),
    releaseEvidenceBundleAuditDomainPackId: cleanString(readback.domainPackId || input.domainPackId, 180),
    releaseEvidenceBundleAuditDomain: cleanString(readback.domain || input.domain, 120),
    releaseEvidenceBundleAuditSubject: cleanString(readback.subject || input.subject, 120),
    releaseEvidenceBundleAuditHorizon: cleanString(readback.horizon || input.horizon, 80),
    releaseEvidenceBundleAuditSchemaVersion: cleanString(readback.schemaVersion, 180),
    releaseEvidenceBundleAuditPrivacyClass: cleanString(readback.privacyClass, 80),
    releaseEvidenceBundleAuditSummaryOnly: readback.summaryOnly === true || readback.summary_only === true,
    releaseEvidenceBundleAuditBundleSchemaVersion: cleanString(bundle.schemaVersion, 180),
    releaseEvidenceBundleAuditBundlePrivacyClass: cleanString(bundle.privacyClass, 80),
    releaseEvidenceBundleAuditBundleSummaryOnly: bundle.summaryOnly === true || bundle.summary_only === true,
    releaseEvidenceBundleAuditBundleFilePresent: bundle.bundleFilePresent === true,
    releaseEvidenceBundleAuditBundleFileName: cleanString(bundle.bundleFileName, 220),
    releaseEvidenceBundleAuditBundleTaskCount: numberValue(bundle.taskCount, 0),
    releaseEvidenceBundleAuditBundlePassedCount: numberValue(bundle.passedCount, 0),
    releaseEvidenceBundleAuditBundleBlockedCount: numberValue(bundle.blockedCount, 0),
    releaseEvidenceBundleAuditEvidenceKeyCount: numberValue(bundle.evidenceKeyCount, 0),
    releaseEvidenceBundleAuditReleaseApprovalKeyCount: numberValue(bundle.releaseApprovalKeyCount, 0),
    releaseEvidenceBundleAuditRequiredTaskCount: numberValue(audit.requiredTaskCount, 0),
    releaseEvidenceBundleAuditDefaultTaskCoverage: audit.defaultTaskCoverage === true,
    releaseEvidenceBundleAuditSummaryCountsMatch: audit.summaryCountsMatch === true,
    releaseEvidenceBundleAuditTaskCountMatches: audit.taskCountMatches === true,
    releaseEvidenceBundleAuditPassedCountMatches: audit.passedCountMatches === true,
    releaseEvidenceBundleAuditBlockedCountMatches: audit.blockedCountMatches === true,
    releaseEvidenceBundleAuditMissingRequiredTasks: uniqueStrings(audit.missingRequiredTasks, 48),
    releaseEvidenceBundleAuditUnknownRequiredTasks: uniqueStrings(audit.unknownRequiredTasks, 48),
    releaseEvidenceBundleAuditBlockedRequiredTasks: uniqueStrings(audit.blockedRequiredTasks, 48),
    releaseEvidenceBundleAuditMissingRequiredEvidenceKeys: uniqueStrings(audit.missingRequiredEvidenceKeys, 48),
    releaseEvidenceBundleAuditMissingRequired: uniqueStrings(readback.missingRequired, 48),
    releaseEvidenceBundleAuditPrivacyFindingCount: numberValue(audit.privacyFindingCount, asArray(audit.privacyFindings).length),
    releaseEvidenceBundleAuditPrivateValueFindingCount: numberValue(audit.privateValueFindingCount, asArray(audit.privateValueFindings).length),
    releaseEvidenceBundleAuditWritefulSchedulingAllowed: false,
    releaseEvidenceBundleAuditRuntimeConfigChange: false,
    releaseEvidenceBundleAuditConfigChangeApplied: false,
    releaseEvidenceBundleAuditSchedulerPermissionGranted: false
  });
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
      error: error.code || "release_evidence_bundle_audit_smoke_invalid_input",
      option: error.option || ""
    }, pretty));
    process.exitCode = 2;
    return;
  }
  const config = readEnv(process.env);
  const services = createServices(config);
  const result = projectReleaseEvidenceBundleAuditSmokeReadback(
    services.learningAutomationReleaseEvidenceBundleAuditService.evaluate(input),
    input
  );
  process.stdout.write(formatResult(result, pretty));
  process.exitCode = 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "release_evidence_bundle_audit_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  collectRequiredTasks,
  inputFromArgs,
  projectReleaseEvidenceBundleAuditSmokeReadback
};
