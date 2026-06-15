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

function targetNodeIds(args) {
  const values = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--target-node-id" || args[i] === "--targetNodeId") {
      const value = String(args[i + 1] || "").trim();
      if (value) values.push(value);
    }
  }
  const csv = argValue(args, "--target-node-ids", "") || argValue(args, "--targetNodeIds", "");
  for (const value of csv.split(",")) {
    const clean = value.trim();
    if (clean) values.push(clean);
  }
  return Array.from(new Set(values));
}

function inputFromArgs(args) {
  const workspaceId = argValue(args, "--workspace-id", "") || argValue(args, "--workspaceId", "");
  return {
    workspaceId,
    learnerId: argValue(args, "--learner-id", "") || argValue(args, "--learnerId", "") || workspaceId,
    programId: argValue(args, "--program-id", "") || argValue(args, "--programId", ""),
    domainPackId: argValue(args, "--domain-pack-id", "") || argValue(args, "--domainPackId", ""),
    domain: argValue(args, "--domain", ""),
    subject: argValue(args, "--subject", ""),
    horizon: argValue(args, "--horizon", "daily_plan"),
    availableMinutes: Number(argValue(args, "--available-minutes", "") || argValue(args, "--availableMinutes", "") || 15) || 15,
    targetNodeIds: targetNodeIds(args)
  };
}

async function main() {
  const args = process.argv.slice(2);
  const input = inputFromArgs(args);
  if (!input.workspaceId) {
    const result = { ok: false, error: "workspace_id_required" };
    process.stdout.write(`${JSON.stringify(result, null, hasFlag(args, "--json") ? 2 : 0)}\n`);
    process.exitCode = 2;
    return;
  }
  const config = readEnv(process.env);
  const services = createServices(config);
  const result = await services.learningPlanOrchestratorService.smokePlannerReadiness(input);
  process.stdout.write(`${JSON.stringify(result, null, hasFlag(args, "--json") ? 2 : 0)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(`${JSON.stringify({
      ok: false,
      error: "planner_readiness_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    })}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  targetNodeIds
};
