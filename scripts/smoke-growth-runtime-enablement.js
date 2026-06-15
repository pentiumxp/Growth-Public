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

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function inputFromArgs(args) {
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], "");
  const activationGate = firstArgValue(args, ["--activation-gate", "--activationGate"], "");
  const activationGates = splitCsv(firstArgValue(args, ["--activation-gates", "--activationGates"], ""))
    .concat(activationGate ? [activationGate] : []);
  return {
    operation: firstArgValue(args, ["--operation", "--op"], "evaluate") || "evaluate",
    allowWrite: hasFlag(args, "--allow-write"),
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], ""),
    domain: firstArgValue(args, ["--domain"], ""),
    subject: firstArgValue(args, ["--subject"], ""),
    horizon: firstArgValue(args, ["--horizon"], "daily_plan") || "daily_plan",
    collectionRunId: firstArgValue(args, ["--collection-run-id", "--collectionRunId", "--run-id", "--runId"], ""),
    activationGates: activationGates.length ? activationGates : undefined,
    activationRecordLimit: Number(firstArgValue(args, ["--activation-record-limit", "--activationRecordLimit"], "20")) || 20,
    status: firstArgValue(args, ["--status", "--enablement-status", "--enablementStatus"], ""),
    note: firstArgValue(args, ["--note", "--reason", "--summary"], ""),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy"], ""),
    recordedBy: firstArgValue(args, ["--recorded-by", "--recordedBy", "--approved-by", "--approvedBy"], ""),
    recordedAt: firstArgValue(args, ["--recorded-at", "--recordedAt", "--approved-at", "--approvedAt"], ""),
    createdAt: firstArgValue(args, ["--created-at", "--createdAt"], ""),
    limit: Number(firstArgValue(args, ["--limit"], "5")) || 5
  };
}

function validateInput(input = {}) {
  if (!input.workspaceId) return { ok: false, error: "runtime_enablement_smoke_workspace_required" };
  if (!["evaluate", "list", "record"].includes(String(input.operation || "evaluate"))) {
    return { ok: false, error: "runtime_enablement_smoke_operation_invalid" };
  }
  return { ok: true };
}

function runOperation(service, input) {
  const operation = String(input.operation || "evaluate");
  if (operation === "list") return service.listEnablements(input);
  if (operation === "record") {
    if (!input.allowWrite) {
      return {
        ok: false,
        error: "runtime_enablement_smoke_write_not_allowed",
        operation,
        requires: "--allow-write"
      };
    }
    return service.recordEnablement(input);
  }
  return service.evaluate(input);
}

function formatResult(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json") || hasFlag(args, "--pretty");
  const input = inputFromArgs(args);
  const validation = validateInput(input);
  if (!validation.ok) {
    process.stdout.write(formatResult(validation, pretty));
    process.exitCode = 2;
    return;
  }
  const services = createServices(readEnv(process.env));
  const result = runOperation(services.learningAutomationRuntimeEnablementService, input);
  process.stdout.write(formatResult(Object.assign({ operation: input.operation || "evaluate" }, result), pretty));
  process.exitCode = 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "runtime_enablement_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  runOperation,
  validateInput
};
