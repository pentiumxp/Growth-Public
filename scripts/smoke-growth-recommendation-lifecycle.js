"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const OPERATIONS = new Set(["list"]);

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

function collectCsvValues(args, names) {
  return csvValues(firstArgValue(args, names, ""));
}

function uniqueStrings(values = []) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
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

function uniqueBoundedStrings(values = [], maxItems = 24) {
  return uniqueStrings(asArray(values).map((value) => cleanString(value, 160))).slice(0, maxItems);
}

function numberValue(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
}

function numberArg(args, names, fallback) {
  const raw = firstArgValue(args, names, "");
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(50, Math.round(value)));
}

function targetNodeIds(args) {
  return uniqueStrings([
    ...collectRepeatedValues(args, ["--target-node-id", "--targetNodeId"]),
    ...collectCsvValues(args, ["--target-node-ids", "--targetNodeIds"])
  ]);
}

function operationFromArgs(args) {
  const operation = firstArgValue(args, ["--operation", "--mode"], "list").trim().toLowerCase();
  return operation || "list";
}

function allowWrite(args) {
  return hasFlag(args, "--allow-write") || hasFlag(args, "--allowWrite");
}

function projectRecommendationLifecycleSmokeReadback(result = {}, operation = "list") {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const summary = objectOnly(readback.summary);
  const filters = objectOnly(readback.filters);
  const lifecycle = asArray(readback.lifecycle);
  const statusCounts = objectOnly(summary.statusCounts);
  const trajectoryIds = uniqueBoundedStrings(lifecycle.map((item) => item.trajectoryId));
  const statuses = uniqueBoundedStrings([
    ...Object.keys(statusCounts),
    ...lifecycle.map((item) => item.status)
  ], 12);
  const pendingTrajectoryIds = uniqueBoundedStrings(lifecycle
    .filter((item) => item.status === "pending")
    .map((item) => item.trajectoryId));
  const acceptedGeneratedTaskCardIds = uniqueBoundedStrings(lifecycle
    .filter((item) => item.status === "accepted")
    .map((item) => item.generatedTaskCardId));
  return Object.assign({}, readback, {
    recommendationLifecycleStatus: cleanString(readback.ok === false ? readback.error || "failed" : "pass", 140),
    recommendationLifecycleOk: readback.ok !== false,
    recommendationLifecycleOperation: cleanString(operation, 80),
    recommendationLifecycleWriteOperation: false,
    recommendationLifecycleWritesPerformed: readback.writePerformed === true || readback.writesPerformed === true,
    recommendationLifecycleWorkspaceId: cleanString(readback.workspaceId, 160),
    recommendationLifecycleLearnerId: cleanString(readback.learnerId, 160),
    recommendationLifecycleProgramId: cleanString(readback.programId, 160),
    recommendationLifecyclePrivacyClass: cleanString(readback.privacyClass, 80),
    recommendationLifecycleSummaryOnly: readback.summaryOnly === true,
    recommendationLifecycleCount: numberValue(readback.count, lifecycle.length),
    recommendationLifecycleSummaryCount: numberValue(summary.lifecycleCount, lifecycle.length),
    recommendationLifecyclePendingCount: numberValue(summary.pendingCount ?? statusCounts.pending, 0),
    recommendationLifecycleAcceptedCount: numberValue(summary.acceptedCount ?? statusCounts.accepted, 0),
    recommendationLifecycleSkippedCount: numberValue(summary.skippedCount ?? statusCounts.skipped, 0),
    recommendationLifecycleExpiredCount: numberValue(summary.expiredCount ?? statusCounts.expired, 0),
    recommendationLifecycleSupersededCount: numberValue(summary.supersededCount ?? statusCounts.superseded, 0),
    recommendationLifecycleMissingCount: numberValue(summary.missingCount ?? statusCounts.missing, 0),
    recommendationLifecycleHasPending: summary.hasPending === true,
    recommendationLifecycleHasAccepted: summary.hasAccepted === true,
    recommendationLifecycleHasSkipped: summary.hasSkipped === true,
    recommendationLifecycleHasExpired: summary.hasExpired === true,
    recommendationLifecycleHasSuperseded: summary.hasSuperseded === true,
    recommendationLifecycleLatestTrajectoryId: cleanString(summary.latestTrajectoryId, 180),
    recommendationLifecycleLatestStatus: cleanString(summary.latestStatus, 80),
    recommendationLifecycleLatestTargetNodeIds: uniqueBoundedStrings(summary.latestTargetNodeIds),
    recommendationLifecycleTrajectoryIds: trajectoryIds,
    recommendationLifecycleStatuses: statuses,
    recommendationLifecyclePendingTrajectoryIds: pendingTrajectoryIds,
    recommendationLifecycleAcceptedGeneratedTaskCardIds: acceptedGeneratedTaskCardIds,
    recommendationLifecycleFilterTrajectoryId: cleanString(filters.trajectoryId, 180),
    recommendationLifecycleFilterTaskCardId: cleanString(filters.taskCardId, 180),
    recommendationLifecycleFilterSourceEvaluationId: cleanString(filters.sourceEvaluationId, 180),
    recommendationLifecycleFilterGeneratedTaskCardId: cleanString(filters.generatedTaskCardId, 180),
    recommendationLifecycleFilterGeneratedLearningGraphPlanId: cleanString(filters.generatedLearningGraphPlanId, 180),
    recommendationLifecycleFilterStatuses: uniqueBoundedStrings(filters.status, 12),
    recommendationLifecycleFilterTargetNodeIds: uniqueBoundedStrings(filters.targetNodeIds),
    recommendationLifecycleFilterLimit: numberValue(filters.limit, 0)
  });
}

function inputFromArgs(args) {
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], "");
  return {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], ""),
    trajectoryId: firstArgValue(args, ["--trajectory-id", "--trajectoryId", "--id"], ""),
    taskCardId: firstArgValue(args, ["--task-card-id", "--taskCardId", "--source-task-card-id", "--sourceTaskCardId"], ""),
    sourceEvaluationId: firstArgValue(args, ["--source-evaluation-id", "--sourceEvaluationId", "--evaluation-id", "--evaluationId"], ""),
    generatedTaskCardId: firstArgValue(args, ["--generated-task-card-id", "--generatedTaskCardId"], ""),
    generatedLearningGraphPlanId: firstArgValue(args, ["--generated-learning-graph-plan-id", "--generatedLearningGraphPlanId", "--learning-graph-plan-id", "--learningGraphPlanId"], ""),
    status: firstArgValue(args, ["--status"], ""),
    targetNodeIds: targetNodeIds(args),
    limit: numberArg(args, ["--limit"], 12)
  };
}

function validateInput(operation, input = {}, args = []) {
  if (!OPERATIONS.has(operation)) {
    return {
      ok: false,
      error: "recommendation_lifecycle_smoke_operation_invalid",
      operation,
      allowedOperations: Array.from(OPERATIONS)
    };
  }
  if (allowWrite(args)) {
    return {
      ok: false,
      error: "recommendation_lifecycle_smoke_write_not_supported",
      operation,
      rejectedFlag: "--allow-write"
    };
  }
  if (!input.workspaceId) {
    return { ok: false, error: "workspace_id_required" };
  }
  return { ok: true };
}

function runOperation(services, operation, input) {
  const service = services.learningRecommendationLifecycleService;
  if (operation === "list") return service.listLifecycle(input);
  return {
    ok: false,
    error: "recommendation_lifecycle_smoke_operation_invalid",
    operation
  };
}

function formatResult(result, pretty) {
  return `${JSON.stringify(result, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json");
  const operation = operationFromArgs(args);
  const input = inputFromArgs(args);
  const validation = validateInput(operation, input, args);
  if (!validation.ok) {
    process.stdout.write(formatResult(validation, pretty));
    process.exitCode = 2;
    return;
  }
  const config = readEnv(process.env);
  const services = createServices(config);
  const result = projectRecommendationLifecycleSmokeReadback(Object.assign({ operation }, runOperation(services, operation, input)), operation);
  process.stdout.write(formatResult(result, pretty));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "recommendation_lifecycle_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  allowWrite,
  inputFromArgs,
  operationFromArgs,
  projectRecommendationLifecycleSmokeReadback,
  runOperation,
  targetNodeIds,
  validateInput
};
