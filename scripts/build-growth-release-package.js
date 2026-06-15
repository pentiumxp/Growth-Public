#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");
const {
  createLearningAutomationReleaseEvidenceBundleService
} = require("../src/services/learning-automation-release-evidence-bundle-service");
const {
  createLearningAutomationReleasePackageService
} = require("../src/services/learning-automation-release-package-service");
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
    requiredTaskIds: requiredTaskIdsFromArgs(args),
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

function formatResult(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json") || hasFlag(args, "--pretty");
  const failOnBlocked = hasFlag(args, "--fail-on-blocked") || hasFlag(args, "--failOnBlocked");
  const repoRoot = path.join(__dirname, "..");
  const input = inputFromArgs(args);
  const services = createServices(readEnv(process.env));
  const evidenceBundleService = createLearningAutomationReleaseEvidenceBundleService({
    repoRoot,
    runCommand(command, commandArgs, options) {
      return spawnSync(command, commandArgs, Object.assign({}, options, {
        env: process.env,
        encoding: "utf8"
      }));
    }
  });
  const service = createLearningAutomationReleasePackageService({
    evidenceBundleService,
    evidenceBundleAuditService: services.learningAutomationReleaseEvidenceBundleAuditService,
    releaseReadinessService: services.learningAutomationReleaseReadinessService,
    releaseCollectionRunService: services.learningAutomationReleaseCollectionRunService,
    releaseControlsService: services.learningAutomationReleaseControlsService
  });
  const result = service.buildPackage(input);
  const recordResult = input.writePackageRecord && result.package
    ? services.learningAutomationReleasePackageService.recordPackage(Object.assign({}, input, {
      releasePackage: result.package
    }))
    : null;
  const finalResult = recordResult
    ? Object.assign({}, result, { ok: result.ok && recordResult.ok, packageOk: result.ok, record: recordResult })
    : result;
  const outputFile = outputFileFromArgs(args);
  if (outputFile && result.package) {
    const writtenPath = writeJsonFile(outputFile, result.package);
    if (hasFlag(args, "--result-json")) {
      process.stdout.write(formatResult({
        ok: finalResult.ok,
        outputFile: writtenPath,
        summary: result.summary,
        record: recordResult || undefined
      }, pretty));
    } else {
      process.stdout.write(formatResult(result.package, pretty));
    }
  } else if (hasFlag(args, "--result-json")) {
    process.stdout.write(formatResult(finalResult, pretty));
  } else {
    process.stdout.write(formatResult(result.package || result, pretty));
  }
  process.exitCode = recordResult && !recordResult.ok ? 1 : (failOnBlocked && !result.ok ? 1 : 0);
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
  requiredApprovalKeys,
  requiredTaskIdsFromArgs,
  taskIds
};
