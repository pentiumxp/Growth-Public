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

function numberArg(args, names, fallback) {
  const raw = firstArgValue(args, names, "");
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(50, Math.round(value)));
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
    actionHandoffId: firstArgValue(args, ["--action-handoff-id", "--actionHandoffId"], ""),
    digestId: firstArgValue(args, ["--digest-id", "--digestId"], ""),
    limit: numberArg(args, ["--limit"], 12)
  };
}

function formatResult(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json") || hasFlag(args, "--pretty");
  const input = inputFromArgs(args);
  if (!input.workspaceId) {
    process.stdout.write(formatResult({
      ok: false,
      error: "platform_action_evidence_workspace_required"
    }, pretty));
    process.exitCode = 2;
    return;
  }
  const config = readEnv(process.env);
  const services = createServices(config);
  const result = services.learningAutomationPlatformActionEvidenceService.evaluate(input);
  process.stdout.write(formatResult(result, pretty));
  process.exitCode = result.error === "platform_action_evidence_workspace_required" ? 2 : 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "platform_action_evidence_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs
};
