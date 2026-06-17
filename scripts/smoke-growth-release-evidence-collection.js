#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");
const {
  inputFromArgs: packageInputFromArgs,
  requiredApprovalKeys,
  requiredTaskIdsFromArgs,
  taskIds
} = require("./build-growth-release-package");

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

function inputFromArgs(args) {
  const input = packageInputFromArgs(args);
  return Object.assign({}, input, {
    writeCollectionRun: hasFlag(args, "--write-collection-run") || hasFlag(args, "--writeCollectionRun") || hasFlag(args, "--record-collection-run"),
    writeReleaseEvidenceRecords: hasFlag(args, "--write-release-evidence-records") || hasFlag(args, "--writeReleaseEvidenceRecords") || hasFlag(args, "--record-release-evidence-records"),
    allowWriteCollection: hasFlag(args, "--allow-write") || hasFlag(args, "--allowWrite"),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy", "--created-by", "--createdBy"], "") || input.requestedBy,
    createdBy: firstArgValue(args, ["--created-by", "--createdBy", "--requested-by", "--requestedBy"], "") || input.createdBy,
    createdAt: firstArgValue(args, ["--created-at", "--createdAt"], "") || input.createdAt
  });
}

function outputFileFromArgs(args) {
  return firstArgValue(args, ["--output-file", "--outputFile"], "");
}

function writeJsonFile(filePath, value) {
  const resolved = path.resolve(filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return resolved;
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

function compactStep(value = {}) {
  const step = objectOnly(value);
  if (!Object.keys(step).length) return null;
  return {
    key: cleanString(step.key || step.stepKey || step.step_key, 120),
    status: cleanString(step.status, 120),
    ok: step.ok === true
  };
}

function releaseEvidenceCollectionReadbackFields(collection = {}) {
  const summary = objectOnly(collection.summary);
  const artifacts = objectOnly(collection.artifacts);
  const releaseEvidenceRecords = objectOnly(artifacts.releaseEvidenceRecords);
  const releaseCollectionRun = objectOnly(artifacts.releaseCollectionRun);
  const steps = asArray(collection.steps).map(compactStep).filter(Boolean);
  const nextStep = steps.find((step) => step.status && step.status !== "pass") || null;
  const status = cleanString(collection.status || summary.status, 120);
  return {
    releaseEvidenceCollectionStatus: status,
    releaseEvidenceCollectionStepCount: Number(summary.stepCount || steps.length || 0) || 0,
    releaseEvidenceCollectionPassedCount: Number(summary.passedCount || steps.filter((step) => step.status === "pass").length || 0) || 0,
    releaseEvidenceCollectionBlockedCount: Number(summary.blockedCount || steps.filter((step) => step.status === "blocked").length || 0) || 0,
    releaseEvidenceCollectionIncompleteCount: Number(summary.incompleteCount || steps.filter((step) => step.status === "incomplete").length || 0) || 0,
    releaseEvidenceCollectionStepStatuses: steps,
    releaseEvidenceCollectionNextStep: nextStep,
    releaseEvidenceCollectionReadyForReleaseReview: collection.readyForReleaseReview === true || summary.readyForReleaseReview === true || releaseCollectionRun.readyForReleaseReview === true,
    releaseEvidenceCollectionRunId: cleanString(summary.collectionRunId || releaseCollectionRun.collectionRunId || releaseCollectionRun.collection_run_id, 160),
    releaseEvidenceCollectionRunWritten: summary.collectionRunWritten === true,
    releaseEvidenceCollectionWriteCollectionRun: collection.writeCollectionRun === true,
    releaseEvidenceCollectionWriteReleaseEvidenceRecords: collection.writeReleaseEvidenceRecords === true,
    releaseEvidenceCollectionReleaseEvidenceRecordsWritten: summary.releaseEvidenceRecordsWritten === true,
    releaseEvidenceCollectionEvidenceRecordAttemptedCount: Number(summary.releaseEvidenceRecordAttemptedCount || releaseEvidenceRecords.attemptedCount || 0) || 0,
    releaseEvidenceCollectionEvidenceRecordRecordedCount: Number(summary.releaseEvidenceRecordRecordedCount || releaseEvidenceRecords.recordedCount || 0) || 0,
    releaseEvidenceCollectionEvidenceRecordDuplicateCount: Number(summary.releaseEvidenceRecordDuplicateCount || releaseEvidenceRecords.duplicateCount || 0) || 0,
    releaseEvidenceCollectionEvidenceRecordBlockedCount: Number(summary.releaseEvidenceRecordBlockedCount || releaseEvidenceRecords.blockedCount || 0) || 0,
    releaseEvidenceCollectionEvidenceKeys: asArray(releaseEvidenceRecords.evidenceKeys).map((key) => cleanString(key, 160)).filter(Boolean),
    releaseEvidenceCollectionWritefulSchedulingAllowed: collection.writefulSchedulingAllowed === true || summary.writefulSchedulingAllowed === true,
    releaseEvidenceCollectionRuntimeConfigChange: collection.runtimeConfigChange === true || summary.runtimeConfigChange === true,
    releaseEvidenceCollectionConfigChangeApplied: collection.configChangeApplied === true || summary.configChangeApplied === true,
    releaseEvidenceCollectionSchedulerPermissionGranted: collection.schedulerPermissionGranted === true || summary.schedulerPermissionGranted === true
  };
}

function projectReleaseEvidenceCollectionSmokeReadback(result = {}) {
  const collection = objectOnly(result.collection).schemaVersion
    ? objectOnly(result.collection)
    : objectOnly(result);
  if (!Object.keys(collection).length) return result;
  const projectedCollection = Object.assign({}, collection, releaseEvidenceCollectionReadbackFields(collection));
  if (result.collection && typeof result.collection === "object") {
    return Object.assign({}, result, releaseEvidenceCollectionReadbackFields(projectedCollection), {
      collection: projectedCollection
    });
  }
  return projectedCollection;
}

function formatResult(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json") || hasFlag(args, "--pretty");
  const failOnBlocked = hasFlag(args, "--fail-on-blocked") || hasFlag(args, "--failOnBlocked");
  const services = createServices(readEnv(process.env));
  const input = inputFromArgs(args);
  if (input.releaseEvidenceArtifactManifestError) {
    process.stdout.write(formatResult({
      ok: false,
      error: input.releaseEvidenceArtifactManifestError,
      invalidArtifactManifestEntries: input.invalidArtifactManifestEntries || []
    }, pretty));
    process.exitCode = 2;
    return;
  }
  const result = projectReleaseEvidenceCollectionSmokeReadback(
    services.learningAutomationReleaseEvidenceCollectionService.collect(input)
  );
  const outputFile = outputFileFromArgs(args);
  if (outputFile && result.collection) {
    const writtenPath = writeJsonFile(outputFile, result.collection);
    if (hasFlag(args, "--result-json")) {
      process.stdout.write(formatResult({
        ok: result.ok,
        outputFile: writtenPath,
        summary: result.summary
      }, pretty));
    } else {
      process.stdout.write(formatResult(result.collection, pretty));
    }
  } else if (hasFlag(args, "--result-json")) {
    process.stdout.write(formatResult(result, pretty));
  } else {
    process.stdout.write(formatResult(result.collection || result, pretty));
  }
  process.exitCode = failOnBlocked && !result.ok ? 1 : 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "release_evidence_collection_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  outputFileFromArgs,
  projectReleaseEvidenceCollectionSmokeReadback,
  requiredApprovalKeys,
  requiredTaskIdsFromArgs,
  taskIds
};
