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

function parseJsonArg(args, names, fallback = undefined) {
  const raw = firstArgValue(args, names, "");
  if (!raw) return fallback;
  return JSON.parse(raw);
}

function inputFromArgs(args) {
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], "");
  const activationGate = firstArgValue(args, ["--activation-gate", "--activationGate"], "");
  const activationGates = splitCsv(firstArgValue(args, ["--activation-gates", "--activationGates"], ""))
    .concat(activationGate ? [activationGate] : []);
  return {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], ""),
    domain: firstArgValue(args, ["--domain"], ""),
    subject: firstArgValue(args, ["--subject"], ""),
    horizon: firstArgValue(args, ["--horizon"], "daily_plan") || "daily_plan",
    collectionRunId: firstArgValue(args, ["--collection-run-id", "--collectionRunId", "--run-id", "--runId"], ""),
    endpointKey: firstArgValue(args, ["--endpoint-key", "--endpointKey"], ""),
    actionKey: firstArgValue(args, ["--action-key", "--actionKey", "--key"], ""),
    evidenceKey: firstArgValue(args, ["--evidence-key", "--evidenceKey", "--check-key", "--checkKey"], ""),
    approvalKey: firstArgValue(args, ["--approval-key", "--approvalKey", "--config-gate", "--configGate"], ""),
    activationGates: activationGates.length ? activationGates : undefined,
    releasePackage: parseJsonArg(args, ["--release-package-json", "--releasePackageJson"], undefined),
    action: parseJsonArg(args, ["--action-json", "--actionJson"], undefined),
    evidence: parseJsonArg(args, ["--evidence-json", "--evidenceJson"], undefined),
    approval: parseJsonArg(args, ["--approval-json", "--approvalJson"], undefined),
    activationDecision: parseJsonArg(args, ["--activation-decision-json", "--activationDecisionJson"], undefined),
    enablementDecision: parseJsonArg(args, ["--enablement-decision-json", "--enablementDecisionJson"], undefined),
    note: firstArgValue(args, ["--note", "--summary"], ""),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy"], ""),
    recordedBy: firstArgValue(args, ["--recorded-by", "--recordedBy", "--approved-by", "--approvedBy"], ""),
    recordedAt: firstArgValue(args, ["--recorded-at", "--recordedAt", "--approved-at", "--approvedAt"], ""),
    createdAt: firstArgValue(args, ["--created-at", "--createdAt"], "")
  };
}

function validateInput(input = {}, allowWrite = false) {
  if (!allowWrite) return { ok: false, error: "release_workbench_action_write_not_allowed", requiredFlag: "--allow-write" };
  if (!input.workspaceId) return { ok: false, error: "release_workbench_action_workspace_required" };
  if (!input.endpointKey) return { ok: false, error: "release_workbench_action_endpoint_required" };
  return { ok: true };
}

function runOperation(service, input) {
  return service.recordAction(input);
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
      error: "release_workbench_action_invalid_json",
      detail: String(error && error.message ? error.message : error)
    }, pretty));
    process.exitCode = 2;
    return;
  }
  const validation = validateInput(input, hasFlag(args, "--allow-write"));
  if (!validation.ok) {
    process.stdout.write(formatResult(validation, pretty));
    process.exitCode = 2;
    return;
  }
  const services = createServices(readEnv(process.env));
  const result = runOperation(services.learningAutomationReleaseWorkbenchActionService, input);
  process.stdout.write(formatResult(Object.assign({ operation: "record" }, result), pretty));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "release_workbench_action_smoke_failed",
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
