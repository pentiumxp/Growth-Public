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
  const result = shouldWriteRecord(args) ? service.recordRun(input) : service.evaluateRun(input);
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
  shouldWriteRecord
};
