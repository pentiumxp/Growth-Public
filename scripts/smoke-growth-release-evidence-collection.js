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

function formatResult(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json") || hasFlag(args, "--pretty");
  const failOnBlocked = hasFlag(args, "--fail-on-blocked") || hasFlag(args, "--failOnBlocked");
  const services = createServices(readEnv(process.env));
  const input = inputFromArgs(args);
  const result = services.learningAutomationReleaseEvidenceCollectionService.collect(input);
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
  requiredApprovalKeys,
  requiredTaskIdsFromArgs,
  taskIds
};
