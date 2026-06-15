#!/usr/bin/env node
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
    wrapped.code = "release_decision_smoke_invalid_json";
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
    if (error.code === "release_decision_smoke_invalid_json") throw error;
    const wrapped = new Error(`unreadable_json_file:${option}`);
    wrapped.code = "release_decision_smoke_file_unreadable";
    wrapped.option = option;
    wrapped.cause = error;
    throw wrapped;
  }
}

function collectionRunFromArgs(args) {
  const inline = parseJsonArg(args, [
    "--release-collection-run-json",
    "--releaseCollectionRunJson",
    "--collection-run-json",
    "--collectionRunJson",
    "--run-json",
    "--runJson"
  ], null);
  if (inline) return inline;
  const filePath = firstArgValue(args, [
    "--release-collection-run-file",
    "--releaseCollectionRunFile",
    "--collection-run-file",
    "--collectionRunFile",
    "--run-file",
    "--runFile"
  ], "");
  return readJsonFile(filePath, "--release-collection-run-file");
}

function operationFromArgs(args) {
  const operation = firstArgValue(args, ["--operation", "--op"], "evaluate").trim().toLowerCase();
  if ([ "evaluate", "record", "list" ].includes(operation)) return operation;
  return operation;
}

function shouldAllowWrite(args) {
  return hasFlag(args, "--allow-write") || hasFlag(args, "--allowWrite") || hasFlag(args, "--write-record") || hasFlag(args, "--writeRecord");
}

function inputFromArgs(args) {
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], "");
  const runFile = firstArgValue(args, [
    "--release-collection-run-file",
    "--releaseCollectionRunFile",
    "--collection-run-file",
    "--collectionRunFile",
    "--run-file",
    "--runFile"
  ], "");
  return {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], ""),
    domain: firstArgValue(args, ["--domain"], ""),
    subject: firstArgValue(args, ["--subject"], ""),
    horizon: firstArgValue(args, ["--horizon"], "daily_plan") || "daily_plan",
    collectionRunId: firstArgValue(args, ["--collection-run-id", "--collectionRunId", "--run-id", "--runId"], ""),
    status: firstArgValue(args, ["--status", "--decision", "--decision-status", "--decisionStatus"], ""),
    releaseCollectionRunFile: runFile ? path.basename(runFile) : "",
    releaseCollectionRun: collectionRunFromArgs(args),
    note: firstArgValue(args, ["--note", "--reason", "--summary"], ""),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy", "--decided-by", "--decidedBy"], ""),
    decidedBy: firstArgValue(args, ["--decided-by", "--decidedBy", "--requested-by", "--requestedBy"], ""),
    decidedAt: firstArgValue(args, ["--decided-at", "--decidedAt"], ""),
    createdAt: firstArgValue(args, ["--created-at", "--createdAt"], ""),
    limit: Number(firstArgValue(args, ["--limit"], "20")) || 20
  };
}

function validateOperationInput(operation, input = {}, allowWrite = false) {
  if (![ "evaluate", "record", "list" ].includes(operation)) {
    return { ok: false, error: "release_decision_smoke_operation_invalid" };
  }
  if (operation === "record" && !allowWrite) {
    return { ok: false, error: "release_decision_smoke_write_not_allowed" };
  }
  if (!input.workspaceId) return { ok: false, error: "release_decision_smoke_workspace_required" };
  if (operation !== "list" && !input.collectionRunId && !input.releaseCollectionRun) {
    return { ok: false, error: "release_decision_smoke_collection_run_required" };
  }
  return { ok: true };
}

function runOperation(service, operation, input) {
  if (operation === "record") return service.recordDecision(input);
  if (operation === "list") return service.listDecisions(input);
  return service.evaluateDecision(input);
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
      error: error.code || "release_decision_smoke_invalid_input",
      option: error.option || ""
    }, pretty));
    process.exitCode = 2;
    return;
  }
  const operation = operationFromArgs(args);
  const validation = validateOperationInput(operation, input, shouldAllowWrite(args));
  if (!validation.ok) {
    process.stdout.write(formatResult(validation, pretty));
    process.exitCode = 2;
    return;
  }
  const services = createServices(readEnv(process.env));
  const result = runOperation(services.learningAutomationReleaseDecisionService, operation, input);
  process.stdout.write(formatResult(Object.assign({ operation }, result), pretty));
  process.exitCode = 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "release_decision_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  operationFromArgs,
  runOperation,
  shouldAllowWrite,
  validateOperationInput
};
