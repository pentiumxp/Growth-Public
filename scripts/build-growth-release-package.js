#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");
const {
  inputFromArgs: bundleInputFromArgs,
  requiredApprovalKeys,
  taskIds
} = require("./build-growth-release-evidence-bundle");

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

function uniqueStrings(values = []) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function requiredTaskIdsFromArgs(args) {
  return uniqueStrings([
    ...collectRepeatedValues(args, ["--required-task", "--required-task-id", "--requiredTaskId"]),
    ...csvValues(firstArgValue(args, ["--required-tasks", "--required-task-ids", "--requiredTasks", "--requiredTaskIds"], ""))
  ]);
}

function inputFromArgs(args) {
  const bundleInput = bundleInputFromArgs(args);
  return Object.assign({}, bundleInput, {
    requiredTaskIds: uniqueStrings([
      ...requiredTaskIdsFromArgs(args),
      ...(bundleInput.artifactTaskIds || [])
    ]),
    writeCollectionRun: hasFlag(args, "--write-collection-run") || hasFlag(args, "--writeCollectionRun"),
    writePackageRecord: hasFlag(args, "--write-package-record") || hasFlag(args, "--writePackageRecord") || hasFlag(args, "--record-package"),
    allowWritePackage: hasFlag(args, "--allow-write") || hasFlag(args, "--allowWrite"),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy", "--created-by", "--createdBy"], "")
      || bundleInput.requestedBy,
    createdBy: firstArgValue(args, ["--created-by", "--createdBy", "--requested-by", "--requestedBy"], ""),
    createdAt: firstArgValue(args, ["--created-at", "--createdAt"], "") || bundleInput.createdAt
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
    ok: step.ok === true,
    requiredActionCount: Number(step.requiredActionCount || step.required_action_count || 0) || 0,
    nextActionKey: cleanString(step.nextActionKey || step.next_action_key, 120)
  };
}

function countArray(value) {
  return asArray(value).filter(Boolean).length;
}

function releasePackageReadbackFields(releasePackage = {}, record = {}) {
  const summary = objectOnly(releasePackage.summary);
  const artifacts = objectOnly(releasePackage.artifacts);
  const dashboard = objectOnly(artifacts.releaseDashboard?.releaseDashboard || artifacts.releaseDashboard?.release_dashboard || artifacts.releaseDashboard?.summary);
  const controls = objectOnly(artifacts.releaseControls?.releaseControls || artifacts.releaseControls?.release_controls || artifacts.releaseControls?.summary);
  const collectionRun = objectOnly(artifacts.releaseCollectionRun || artifacts.release_collection_run);
  const steps = asArray(releasePackage.steps).map(compactStep).filter(Boolean);
  const nextStep = steps.find((step) => step.status && step.status !== "pass") || null;
  const packageRecord = objectOnly(record.package);
  const status = cleanString(releasePackage.status || summary.status, 120);
  return {
    releasePackageStatus: status,
    releasePackageStepCount: Number(summary.stepCount || steps.length || 0) || 0,
    releasePackagePassedCount: Number(summary.passedCount || steps.filter((step) => step.status === "pass").length || 0) || 0,
    releasePackageBlockedCount: Number(summary.blockedCount || steps.filter((step) => step.status === "blocked").length || 0) || 0,
    releasePackageIncompleteCount: Number(summary.incompleteCount || steps.filter((step) => step.status === "incomplete").length || 0) || 0,
    releasePackageStepStatuses: steps,
    releasePackageNextStep: nextStep,
    releasePackageReadyForReleaseReview: releasePackage.readyForReleaseReview === true || summary.readyForReleaseReview === true || collectionRun.readyForReleaseReview === true,
    releasePackageCollectionRunId: cleanString(summary.collectionRunId || collectionRun.collectionRunId || collectionRun.collection_run_id, 160),
    releasePackageCollectionRunWritten: summary.collectionRunWritten === true,
    releasePackageWriteCollectionRun: releasePackage.writeCollectionRun === true,
    releasePackageWritePackageRecord: releasePackage.writePackageRecord === true,
    releasePackageRecordRequested: summary.packageRecordRequested === true || releasePackage.writePackageRecord === true,
    releasePackageRecordWritten: summary.packageRecordWritten === true || record.ok === true,
    releasePackageRecordId: cleanString(summary.packageRecordId || packageRecord.packageId || packageRecord.package_id, 160),
    releasePackageLatestPreflightReportId: cleanString(releasePackage.latestPreflightReportId || summary.latestPreflightReportId, 180),
    releasePackageLatestPreflightStatus: cleanString(releasePackage.latestPreflightStatus || summary.latestPreflightStatus, 120),
    releasePackageLatestPreflightReadyForProductionDeployReview: releasePackage.latestPreflightReadyForProductionDeployReview === true || summary.latestPreflightReadyForProductionDeployReview === true,
    releasePackageLatestPreflightReadyForOwnerReleaseActivation: releasePackage.latestPreflightReadyForOwnerReleaseActivation === true || summary.latestPreflightReadyForOwnerReleaseActivation === true,
    releasePackageControlsStatus: cleanString(controls.status, 120),
    releasePackageDashboardStatus: cleanString(dashboard.status, 120),
    releasePackageReadinessEvidencePresentCount: Number(dashboard.readinessEvidencePresentCount || dashboard.readiness_evidence_present_count || 0) || 0,
    releasePackageReadinessEvidenceMissingCount: Number(dashboard.readinessEvidenceMissingCount || dashboard.readiness_evidence_missing_count || 0) || 0,
    releasePackageMissingCheckCount: countArray(dashboard.missingCheckKeys || dashboard.missing_check_keys),
    releasePackageMissingEvidenceCount: countArray(dashboard.missingEvidenceKeys || dashboard.missing_evidence_keys),
    releasePackageMissingApprovalCount: countArray(dashboard.missingApprovalKeys || dashboard.missing_approval_keys),
    releasePackageWritefulSchedulingAllowed: releasePackage.writefulSchedulingAllowed === true || summary.writefulSchedulingAllowed === true,
    releasePackageRuntimeConfigChange: releasePackage.runtimeConfigChange === true || summary.runtimeConfigChange === true,
    releasePackageConfigChangeApplied: releasePackage.configChangeApplied === true || summary.configChangeApplied === true,
    releasePackageSchedulerPermissionGranted: releasePackage.schedulerPermissionGranted === true || summary.schedulerPermissionGranted === true
  };
}

function projectReleasePackageSmokeReadback(result = {}) {
  const releasePackage = objectOnly(result.package).schemaVersion
    ? objectOnly(result.package)
    : objectOnly(result);
  if (!Object.keys(releasePackage).length) return result;
  const fields = releasePackageReadbackFields(releasePackage, objectOnly(result.record));
  const projectedPackage = Object.assign({}, releasePackage, fields);
  if (result.package && typeof result.package === "object") {
    return Object.assign({}, result, fields, {
      package: projectedPackage
    });
  }
  return projectedPackage;
}

function formatResult(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json") || hasFlag(args, "--pretty");
  const failOnBlocked = hasFlag(args, "--fail-on-blocked") || hasFlag(args, "--failOnBlocked");
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
  const services = createServices(readEnv(process.env));
  const service = services.learningAutomationReleasePackageBuildService || services.learningAutomationReleasePackageService;
  const result = projectReleasePackageSmokeReadback(service.buildPackage(input));
  const outputFile = outputFileFromArgs(args);
  if (outputFile && result.package) {
    const writtenPath = writeJsonFile(outputFile, result.package);
    if (hasFlag(args, "--result-json")) {
      const readback = releasePackageReadbackFields(result.package, result.record);
      process.stdout.write(formatResult(Object.assign({
        ok: result.ok,
        outputFile: writtenPath,
        summary: result.summary,
        record: result.record || undefined
      }, readback), pretty));
    } else {
      process.stdout.write(formatResult(result.package, pretty));
    }
  } else if (hasFlag(args, "--result-json")) {
    process.stdout.write(formatResult(result, pretty));
  } else {
    process.stdout.write(formatResult(result.package || result, pretty));
  }
  process.exitCode = result.record && result.record.ok === false ? 1 : (failOnBlocked && !result.ok ? 1 : 0);
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "release_package_build_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  outputFileFromArgs,
  projectReleasePackageSmokeReadback,
  requiredApprovalKeys,
  requiredTaskIdsFromArgs,
  taskIds
};
