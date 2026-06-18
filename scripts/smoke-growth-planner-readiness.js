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

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = [], maxItems = 24) {
  return Array.from(new Set(asArray(values)
    .map((value) => cleanString(value, 160))
    .filter(Boolean)))
    .slice(0, maxItems);
}

function numberValue(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
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

function projectPlannerReadinessSmokeReadback(result = {}, input = {}) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const context = objectOnly(readback.context);
  const draftSummary = objectOnly(readback.draftSummary);
  return Object.assign({}, readback, {
    plannerReadinessStatus: cleanString(readback.ok === false ? readback.error || "failed" : "pass", 140),
    plannerReadinessOk: readback.ok !== false,
    plannerReadinessWriteOperation: false,
    plannerReadinessWritesPerformed: false,
    plannerReadinessRetryable: readback.retryable === true,
    plannerReadinessHttpStatus: numberValue(readback.status, 0),
    plannerReadinessGatewayErrorCode: cleanString(readback.gatewayErrorCode, 120),
    plannerReadinessGatewayErrorType: cleanString(readback.gatewayErrorType, 120),
    plannerReadinessGatewayErrorStatus: cleanString(readback.gatewayErrorStatus, 80),
    plannerReadinessWorkspaceId: cleanString(context.workspaceId || input.workspaceId, 160),
    plannerReadinessLearnerId: cleanString(context.learnerId || input.learnerId, 160),
    plannerReadinessProgramId: cleanString(input.programId, 160),
    plannerReadinessGatewayMode: cleanString(readback.gatewayMode, 80),
    plannerReadinessHorizon: cleanString(context.horizon || input.horizon, 80),
    plannerReadinessAvailableMinutes: numberValue(input.availableMinutes, 0),
    plannerReadinessDomainPackId: cleanString(context.domainPackId || input.domainPackId, 180),
    plannerReadinessDomain: cleanString(context.domain || input.domain, 120),
    plannerReadinessSubject: cleanString(context.subject || input.subject, 120),
    plannerReadinessCandidateNodeCount: numberValue(context.candidateNodeCount, 0),
    plannerReadinessRecentEvidenceCount: numberValue(context.recentEvidenceCount, 0),
    plannerReadinessPrivacyClass: cleanString(context.privacyClass, 80),
    plannerReadinessDraftSchemaVersion: cleanString(draftSummary.schemaVersion, 120),
    plannerReadinessDraftHorizon: cleanString(draftSummary.horizon, 80),
    plannerReadinessDraftItemCount: numberValue(draftSummary.itemCount, 0),
    plannerReadinessDraftTargetNodeIds: uniqueStrings(draftSummary.targetNodeIds),
    plannerReadinessInputTargetNodeIds: uniqueStrings(input.targetNodeIds)
  });
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
  const result = projectPlannerReadinessSmokeReadback(
    await services.learningPlanOrchestratorService.smokePlannerReadiness(input),
    input
  );
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
  projectPlannerReadinessSmokeReadback,
  targetNodeIds
};
