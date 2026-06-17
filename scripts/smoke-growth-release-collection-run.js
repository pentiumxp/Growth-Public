"use strict";

const fs = require("node:fs");
const path = require("node:path");
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

function parseJsonText(text, option) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    const wrapped = new Error(`invalid_json:${option}`);
    wrapped.code = "release_collection_run_smoke_invalid_json";
    wrapped.option = option;
    wrapped.cause = error;
    throw wrapped;
  }
}

function parseJsonArg(args, names, fallback = null) {
  const text = firstArgValue(args, names, "");
  if (!text) return fallback;
  return parseJsonText(text, names[0]);
}

function readJsonFile(filePath, option) {
  if (!filePath) return null;
  try {
    return parseJsonText(fs.readFileSync(filePath, "utf8"), option);
  } catch (error) {
    if (error.code === "release_collection_run_smoke_invalid_json") throw error;
    const wrapped = new Error(`unreadable_json_file:${option}`);
    wrapped.code = "release_collection_run_smoke_file_unreadable";
    wrapped.option = option;
    wrapped.cause = error;
    throw wrapped;
  }
}

function artifactFromArgs(args, jsonNames, fileNames) {
  const inline = parseJsonArg(args, jsonNames, null);
  if (inline) return inline;
  const filePath = firstArgValue(args, fileNames, "");
  return readJsonFile(filePath, fileNames[0]);
}

function inputFromArgs(args) {
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], "");
  const bundleFile = firstArgValue(args, [
    "--release-evidence-bundle-file",
    "--releaseEvidenceBundleFile",
    "--evidence-bundle-file",
    "--evidenceBundleFile",
    "--bundle-file",
    "--bundleFile"
  ], "");
  const auditFile = firstArgValue(args, [
    "--release-evidence-bundle-audit-file",
    "--releaseEvidenceBundleAuditFile",
    "--evidence-bundle-audit-file",
    "--evidenceBundleAuditFile",
    "--audit-file",
    "--auditFile"
  ], "");
  const readinessFile = firstArgValue(args, [
    "--release-readiness-file",
    "--releaseReadinessFile",
    "--readiness-file",
    "--readinessFile"
  ], "");
  return {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], ""),
    domain: firstArgValue(args, ["--domain"], ""),
    subject: firstArgValue(args, ["--subject"], ""),
    horizon: firstArgValue(args, ["--horizon"], "daily_plan") || "daily_plan",
    releaseEvidenceBundleFile: bundleFile ? path.basename(bundleFile) : "",
    releaseEvidenceBundleAuditFile: auditFile ? path.basename(auditFile) : "",
    releaseReadinessFile: readinessFile ? path.basename(readinessFile) : "",
    releaseEvidenceBundle: artifactFromArgs(args, [
      "--release-evidence-bundle-json",
      "--releaseEvidenceBundleJson",
      "--evidence-bundle-json",
      "--evidenceBundleJson",
      "--bundle-json",
      "--bundleJson"
    ], ["--release-evidence-bundle-file", "--releaseEvidenceBundleFile", "--evidence-bundle-file", "--evidenceBundleFile", "--bundle-file", "--bundleFile"]),
    releaseEvidenceBundleAudit: artifactFromArgs(args, [
      "--release-evidence-bundle-audit-json",
      "--releaseEvidenceBundleAuditJson",
      "--evidence-bundle-audit-json",
      "--evidenceBundleAuditJson",
      "--audit-json",
      "--auditJson"
    ], ["--release-evidence-bundle-audit-file", "--releaseEvidenceBundleAuditFile", "--evidence-bundle-audit-file", "--evidenceBundleAuditFile", "--audit-file", "--auditFile"]),
    releaseReadiness: artifactFromArgs(args, [
      "--release-readiness-json",
      "--releaseReadinessJson",
      "--readiness-json",
      "--readinessJson"
    ], ["--release-readiness-file", "--releaseReadinessFile", "--readiness-file", "--readinessFile"]),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy", "--created-by", "--createdBy"], ""),
    createdBy: firstArgValue(args, ["--created-by", "--createdBy", "--requested-by", "--requestedBy"], ""),
    createdAt: firstArgValue(args, ["--created-at", "--createdAt"], "")
  };
}

function shouldWriteRecord(args) {
  return hasFlag(args, "--write-record") || hasFlag(args, "--writeRecord");
}

function formatResult(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

function releaseCollectionRunReadbackFields(result = {}, writeRecord = false) {
  const readback = objectOnly(result);
  const run = objectOnly(readback.run);
  const evaluated = objectOnly(readback.evaluated);
  const source = run.runId || run.collectionRunId
    ? run
    : evaluated.schemaVersion
      ? evaluated
      : readback;
  const summary = objectOnly(source.summary);
  const bundleSummary = objectOnly(source.bundleSummary);
  const auditSummary = objectOnly(source.auditSummary);
  const readinessSummary = objectOnly(source.readinessSummary);
  const evidenceSummary = objectOnly(source.evidenceSummary);
  const releaseReview = objectOnly(source.releaseReview);
  const artifactFileNames = objectOnly(summary.artifactFileNames);
  const recordWritten = writeRecord === true && readback.ok === true && Boolean(run.runId || run.collectionRunId);
  return {
    releaseCollectionRunStatus: cleanString(source.status || readback.status || (readback.ok === false ? readback.error : ""), 140),
    releaseCollectionRunOk: readback.ok !== false,
    releaseCollectionRunWriteRecord: writeRecord === true,
    releaseCollectionRunRecordWritten: recordWritten,
    releaseCollectionRunDuplicate: readback.duplicate === true,
    releaseCollectionRunRunId: cleanString(run.runId || run.collectionRunId || source.runId || source.collectionRunId, 180),
    releaseCollectionRunWorkspaceId: cleanString(source.workspaceId || evaluated.workspaceId || readback.workspaceId, 160),
    releaseCollectionRunLearnerId: cleanString(source.learnerId || evaluated.learnerId || readback.learnerId, 160),
    releaseCollectionRunProgramId: cleanString(source.programId || evaluated.programId || readback.programId, 160),
    releaseCollectionRunDomainPackId: cleanString(source.domainPackId || evaluated.domainPackId || readback.domainPackId, 180),
    releaseCollectionRunDomain: cleanString(source.domain || evaluated.domain || readback.domain, 120),
    releaseCollectionRunSubject: cleanString(source.subject || evaluated.subject || readback.subject, 120),
    releaseCollectionRunHorizon: cleanString(source.horizon || evaluated.horizon || readback.horizon, 80),
    releaseCollectionRunReadyForReleaseReview: source.readyForReleaseReview === true || summary.readyForReleaseReview === true,
    releaseCollectionRunReadyForReleaseEvidence: summary.readyForReleaseEvidence === true || auditSummary.readyForReleaseEvidence === true,
    releaseCollectionRunBundleTaskCount: numberValue(summary.bundleTaskCount, bundleSummary.taskCount || 0),
    releaseCollectionRunBundlePassedCount: numberValue(summary.bundlePassedCount, bundleSummary.passedCount || 0),
    releaseCollectionRunBundleBlockedCount: numberValue(summary.bundleBlockedCount, bundleSummary.blockedCount || 0),
    releaseCollectionRunAuditStatus: cleanString(summary.auditStatus || auditSummary.status, 120),
    releaseCollectionRunReadinessStatus: cleanString(summary.readinessStatus || readinessSummary.status, 120),
    releaseCollectionRunMissingCheckCount: numberValue(summary.missingCheckCount, readinessSummary.missingCheckCount || 0),
    releaseCollectionRunBlockedCheckCount: numberValue(summary.blockedCheckCount, readinessSummary.blockedCheckCount || 0),
    releaseCollectionRunRequiredActionCount: numberValue(summary.requiredActionCount, readinessSummary.requiredActionCount || releaseReview.requiredActionCount || 0),
    releaseCollectionRunBundleEvidenceKeys: uniqueStrings(evidenceSummary.bundleEvidenceKeys || bundleSummary.evidenceKeys, 48),
    releaseCollectionRunReadinessExternalEvidenceKeys: uniqueStrings(evidenceSummary.readinessExternalEvidenceKeys, 48),
    releaseCollectionRunReleaseApprovalKeys: uniqueStrings(evidenceSummary.releaseApprovalKeys || bundleSummary.releaseApprovalKeys, 12),
    releaseCollectionRunMissingCheckKeys: uniqueStrings(releaseReview.missingCheckKeys || readinessSummary.missingCheckKeys, 48),
    releaseCollectionRunBlockedCheckKeys: uniqueStrings(releaseReview.blockedCheckKeys || readinessSummary.blockedCheckKeys, 48),
    releaseCollectionRunMissingEvidenceKeys: uniqueStrings(releaseReview.missingEvidenceKeys || readinessSummary.missingEvidenceKeys, 48),
    releaseCollectionRunArtifactFileNames: {
      bundle: cleanString(artifactFileNames.bundle || bundleSummary.artifactFileName, 220),
      audit: cleanString(artifactFileNames.audit || auditSummary.artifactFileName, 220),
      readiness: cleanString(artifactFileNames.readiness || readinessSummary.artifactFileName, 220)
    },
    releaseCollectionRunPrivacyFindingCount: asArray(readback.privacyFindings).length,
    releaseCollectionRunPrivateValueFindingCount: asArray(readback.privateValueFindings).length,
    releaseCollectionRunWritefulSchedulingAllowed: source.writefulSchedulingAllowed === true || summary.writefulSchedulingAllowed === true,
    releaseCollectionRunRuntimeConfigChange: source.runtimeConfigChange === true || summary.runtimeConfigChange === true,
    releaseCollectionRunConfigChangeApplied: source.configChangeApplied === true || summary.configChangeApplied === true,
    releaseCollectionRunSchedulerPermissionGranted: source.schedulerPermissionGranted === true || summary.schedulerPermissionGranted === true
  };
}

function projectReleaseCollectionRunSmokeReadback(result = {}, writeRecord = false) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  return Object.assign({}, readback, releaseCollectionRunReadbackFields(readback, writeRecord));
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
      error: error.code || "release_collection_run_smoke_invalid_input",
      option: error.option || ""
    }, pretty));
    process.exitCode = 2;
    return;
  }
  const config = readEnv(process.env);
  const services = createServices(config);
  const service = services.learningAutomationReleaseCollectionRunService;
  const writeRecord = shouldWriteRecord(args);
  const result = projectReleaseCollectionRunSmokeReadback(
    writeRecord ? service.recordRun(input) : service.evaluateRun(input),
    writeRecord
  );
  process.stdout.write(formatResult(result, pretty));
  process.exitCode = 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "release_collection_run_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  projectReleaseCollectionRunSmokeReadback,
  shouldWriteRecord
};
