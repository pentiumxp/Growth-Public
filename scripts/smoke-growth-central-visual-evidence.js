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

function parseJsonArg(args, names, fallback = null) {
  const text = firstArgValue(args, names, "");
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (error) {
    const wrapped = new Error(`invalid_json:${names[0]}`);
    wrapped.code = "central_visual_evidence_smoke_invalid_json";
    wrapped.option = names[0];
    wrapped.cause = error;
    throw wrapped;
  }
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
    pluginId: firstArgValue(args, ["--plugin-id", "--pluginId"], "growth") || "growth",
    scenario: firstArgValue(args, ["--scenario"], "embedded-plugin-shell") || "embedded-plugin-shell",
    evidenceFile: firstArgValue(args, [
      "--central-visual-evidence-file",
      "--centralVisualEvidenceFile",
      "--evidence-file",
      "--evidenceFile"
    ], ""),
    evidence: parseJsonArg(args, [
      "--central-visual-evidence-json",
      "--centralVisualEvidenceJson",
      "--evidence-json",
      "--evidenceJson"
    ], null)
  };
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
      error: error.code || "central_visual_evidence_smoke_invalid_input",
      option: error.option || ""
    }, pretty));
    process.exitCode = 2;
    return;
  }
  if (!input.workspaceId) {
    process.stdout.write(formatResult({
      ok: false,
      error: "central_visual_evidence_workspace_required"
    }, pretty));
    process.exitCode = 2;
    return;
  }
  if (!input.evidenceFile) {
    input.evidenceFile = process.env.GROWTH_CENTRAL_VISUAL_EVIDENCE_FILE || "";
  }
  const config = readEnv(process.env);
  const services = createServices(config);
  const result = services.learningAutomationCentralVisualEvidenceService.evaluate(input);
  process.stdout.write(formatResult(result, pretty));
  process.exitCode = 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "central_visual_evidence_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs
};
