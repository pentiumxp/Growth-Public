"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const WRITE_OPERATIONS = new Set(["create", "review"]);
const OPERATIONS = new Set(["list", "runnable", "list-runnable", "create", "review"]);

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

function parseJsonArg(args, names, fallback = {}) {
  const text = firstArgValue(args, names, "");
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    const wrapped = new Error(`invalid_json:${names[0]}`);
    wrapped.code = "automation_scheduler_worker_target_smoke_invalid_json";
    wrapped.option = names[0];
    wrapped.cause = error;
    throw wrapped;
  }
}

function boundedNumberArg(args, names, fallback, min = 1, max = 100) {
  const value = Number(firstArgValue(args, names, ""));
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function listArg(args, names, fallback = []) {
  const text = firstArgValue(args, names, "");
  if (!text) return Array.isArray(fallback) ? fallback : [];
  return text.split(",").map((item) => item.trim()).filter(Boolean);
}

function stripUndefined(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stripUndefined);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, stripUndefined(item)])
  );
}

function cleanString(value, max = 180) {
  const text = String(value || "").trim();
  return text.length > max ? text.slice(0, max) : text;
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function uniqueBoundedStrings(values = [], limit = 16) {
  return Array.from(new Set(asArray(values).map((value) => cleanString(value, 220)).filter(Boolean))).slice(0, limit);
}

function normalizeOperation(operation) {
  return operation === "list-runnable" ? "runnable" : operation;
}

function operationFromArgs(args) {
  const explicit = firstArgValue(args, ["--operation"], "");
  const operation = explicit
    || (hasFlag(args, "--create")
      ? "create"
      : hasFlag(args, "--review")
        ? "review"
        : (hasFlag(args, "--runnable") || hasFlag(args, "--list-runnable") || hasFlag(args, "--listRunnable"))
          ? "runnable"
          : "list");
  if (!OPERATIONS.has(operation)) {
    const error = new Error(`invalid_operation:${operation}`);
    error.code = "automation_scheduler_worker_target_smoke_operation_invalid";
    error.operation = operation;
    throw error;
  }
  return normalizeOperation(operation);
}

function shouldAllowWrite(args) {
  return hasFlag(args, "--allow-write") || hasFlag(args, "--allowWrite");
}

function inputFromArgs(args) {
  const jsonInput = parseJsonArg(args, ["--input-json", "--inputJson"], {});
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], jsonInput.workspaceId || jsonInput.workspace_id || "");
  const targetNodeIds = listArg(args, ["--target-node-ids", "--targetNodeIds", "--node-ids", "--nodeIds"], jsonInput.targetNodeIds || jsonInput.target_node_ids || jsonInput.nodeIds || jsonInput.node_ids || []);
  return stripUndefined(Object.assign({}, jsonInput, {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], jsonInput.learnerId || jsonInput.learner_id || "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], jsonInput.programId || jsonInput.program_id || ""),
    targetId: firstArgValue(args, ["--target-id", "--targetId", "--worker-target-id", "--workerTargetId"], jsonInput.targetId || jsonInput.target_id || jsonInput.workerTargetId || jsonInput.worker_target_id || ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], jsonInput.domainPackId || jsonInput.domain_pack_id || ""),
    domain: firstArgValue(args, ["--domain"], jsonInput.domain || ""),
    subject: firstArgValue(args, ["--subject"], jsonInput.subject || ""),
    horizon: firstArgValue(args, ["--horizon"], jsonInput.horizon || "daily_plan") || "daily_plan",
    status: firstArgValue(args, ["--status", "--review-status", "--reviewStatus", "--action"], jsonInput.status || jsonInput.reviewStatus || jsonInput.review_status || jsonInput.action || ""),
    targetVersion: firstArgValue(args, ["--target-version", "--targetVersion"], jsonInput.targetVersion || jsonInput.target_version || ""),
    displayName: firstArgValue(args, ["--display-name", "--displayName"], jsonInput.displayName || jsonInput.display_name || ""),
    label: firstArgValue(args, ["--label"], jsonInput.label || ""),
    targetNodeIds,
    limit: boundedNumberArg(args, ["--limit", "--max-actions-per-tick", "--maxActionsPerTick"], jsonInput.limit || jsonInput.maxActionsPerTick || jsonInput.max_actions_per_tick || 20, 1, 100),
    reason: firstArgValue(args, ["--reason", "--note", "--summary"], jsonInput.reason || jsonInput.note || jsonInput.summary || ""),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy", "--created-by", "--createdBy", "--reviewed-by", "--reviewedBy"], jsonInput.requestedBy || jsonInput.requested_by || jsonInput.createdBy || jsonInput.created_by || jsonInput.reviewedBy || jsonInput.reviewed_by || "")
  }));
}

function validateOperationInput(operation, input, allowWrite) {
  if (!input.workspaceId) return { ok: false, error: "workspace_id_required", exitCode: 2 };
  if (WRITE_OPERATIONS.has(operation) && !allowWrite) {
    return { ok: false, error: "automation_scheduler_worker_target_smoke_write_not_allowed", operation, exitCode: 2 };
  }
  if (operation === "review" && !input.targetId) {
    return { ok: false, error: "target_id_required", operation, exitCode: 2 };
  }
  if (operation === "review" && !input.status) {
    return { ok: false, error: "review_status_required", operation, exitCode: 2 };
  }
  return { ok: true };
}

function runOperation(service, operation, input) {
  if (operation === "create") return service.createTarget(input);
  if (operation === "review") return service.reviewTarget(input);
  if (operation === "runnable") return service.listRunnableTargets(input);
  return service.listTargets(input);
}

function targetIdFrom(target = {}) {
  return cleanString(target.targetId || target.target_id || target.workerTargetId || target.worker_target_id, 180);
}

function summarizeStatuses(targets = []) {
  return asArray(targets).reduce((counts, target) => {
    const status = cleanString(target && target.status, 80) || "missing";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

function projectAutomationSchedulerWorkerTargetSmokeReadback(result = {}, operation = "list", input = {}, writeAllowed = false) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const targets = asArray(readback.targets);
  const records = asArray(readback.records);
  const targetRows = records.length ? records : targets;
  const target = objectOnly(readback.target || targetRows[0] || targets[0]);
  const targetSummary = objectOnly(target.target);
  const policy = objectOnly(target.policy);
  const readiness = objectOnly(readback.readiness || target.readiness);
  const review = objectOnly(target.review);
  const targetNodeIds = uniqueBoundedStrings(targetSummary.targetNodeIds || target.targetNodeIds || input.targetNodeIds, 24);
  const statusCounts = summarizeStatuses(targetRows.length ? targetRows : targetIdFrom(target) ? [target] : []);
  const writeOperation = WRITE_OPERATIONS.has(operation);
  const status = cleanString(
    readback.ok === false ? readback.error || "failed" : target.status || (operation === "runnable" ? "runnable" : operation === "list" ? "listed" : "pass"),
    140
  );
  return Object.assign({}, readback, {
    automationSchedulerWorkerTargetStatus: status,
    automationSchedulerWorkerTargetOk: readback.ok === true,
    automationSchedulerWorkerTargetOperation: cleanString(operation, 80),
    automationSchedulerWorkerTargetWriteOperation: writeOperation,
    automationSchedulerWorkerTargetWriteAllowed: writeAllowed === true,
    automationSchedulerWorkerTargetWritesPerformed: writeOperation && writeAllowed === true && readback.ok === true && readback.duplicate !== true,
    automationSchedulerWorkerTargetDuplicate: readback.duplicate === true,
    automationSchedulerWorkerTargetWorkspaceId: cleanString(readback.workspaceId || target.workspaceId || targetSummary.workspaceId || input.workspaceId, 160),
    automationSchedulerWorkerTargetLearnerId: cleanString(readback.learnerId || target.learnerId || targetSummary.learnerId || input.learnerId, 160),
    automationSchedulerWorkerTargetProgramId: cleanString(target.programId || targetSummary.programId || input.programId, 160),
    automationSchedulerWorkerTargetDomainPackId: cleanString(target.domainPackId || targetSummary.domainPackId || readiness.selectedDomainPackId || input.domainPackId, 180),
    automationSchedulerWorkerTargetDomain: cleanString(target.domain || targetSummary.domain || readiness.selectedDomain || input.domain, 120),
    automationSchedulerWorkerTargetSubject: cleanString(target.subject || targetSummary.subject || readiness.selectedSubject || input.subject, 120),
    automationSchedulerWorkerTargetHorizon: cleanString(target.horizon || targetSummary.horizon || input.horizon, 80),
    automationSchedulerWorkerTargetCount: numberValue(readback.count, targetRows.length),
    automationSchedulerWorkerTargetRunnableCount: operation === "runnable" ? numberValue(readback.count, targets.length) : 0,
    automationSchedulerWorkerTargetTargetId: targetIdFrom(target) || cleanString(input.targetId, 180),
    automationSchedulerWorkerTargetTargetIds: uniqueBoundedStrings(targetRows.map(targetIdFrom), 24),
    automationSchedulerWorkerTargetStatuses: uniqueBoundedStrings(Object.keys(statusCounts), 12),
    automationSchedulerWorkerTargetProposedCount: numberValue(statusCounts.proposed, 0),
    automationSchedulerWorkerTargetEnabledCount: numberValue(statusCounts.enabled, 0),
    automationSchedulerWorkerTargetDisabledCount: numberValue(statusCounts.disabled, 0),
    automationSchedulerWorkerTargetArchivedCount: numberValue(statusCounts.archived, 0),
    automationSchedulerWorkerTargetTargetVersion: cleanString(target.targetVersion || target.target_version || input.targetVersion, 160),
    automationSchedulerWorkerTargetPrivacyClass: cleanString(target.privacyClass, 80),
    automationSchedulerWorkerTargetRequiresOwnerReview: readback.workerTargetRequiresOwnerReview === true || policy.ownerReviewRequired === true,
    automationSchedulerWorkerTargetProductionSchedulingAllowed: readback.productionSchedulingAllowed === true || policy.productionSchedulingAllowed === true || readiness.productionSchedulingAllowed === true || review.productionSchedulingAllowed === true,
    automationSchedulerWorkerTargetProvisioningReady: readiness.targetProvisioningReady === true,
    automationSchedulerWorkerTargetEnabled: readiness.targetEnabled === true || target.status === "enabled",
    automationSchedulerWorkerTargetReadinessMode: cleanString(readiness.mode || targetSummary.provisionMode, 120),
    automationSchedulerWorkerTargetSelectedDomainPackId: cleanString(readiness.selectedDomainPackId || targetSummary.domainPackId, 180),
    automationSchedulerWorkerTargetSelectedDomain: cleanString(readiness.selectedDomain || targetSummary.domain, 120),
    automationSchedulerWorkerTargetSelectedSubject: cleanString(readiness.selectedSubject || targetSummary.subject, 120),
    automationSchedulerWorkerTargetNodeCount: targetNodeIds.length,
    automationSchedulerWorkerTargetNodeIds: targetNodeIds,
    automationSchedulerWorkerTargetWorkerMode: cleanString(policy.workerMode, 120),
    automationSchedulerWorkerTargetSchedulerRunMode: cleanString(policy.schedulerRunMode, 120),
    automationSchedulerWorkerTargetOwnerReviewRequired: policy.ownerReviewRequired === true,
    automationSchedulerWorkerTargetTargetProvisioningRequired: policy.targetProvisioningRequired === true,
    automationSchedulerWorkerTargetActionHandoffRequiredBeforeScheduling: policy.actionHandoffRequiredBeforeScheduling === true,
    automationSchedulerWorkerTargetMaxActionsPerTick: numberValue(policy.maxActionsPerTick || target.limit, input.limit || 0),
    automationSchedulerWorkerTargetReviewedBy: cleanString(target.reviewedBy || review.reviewedBy || input.requestedBy, 160),
    automationSchedulerWorkerTargetReviewStatus: cleanString(review.status || target.status, 80)
  });
}

function formatResult(result, pretty) {
  return `${JSON.stringify(result, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json");
  let operation;
  let input;
  try {
    operation = operationFromArgs(args);
    input = inputFromArgs(args);
  } catch (error) {
    process.stdout.write(formatResult({
      ok: false,
      error: error.code || "automation_scheduler_worker_target_smoke_parse_failed",
      option: error.option || "",
      operation: error.operation || ""
    }, pretty));
    process.exitCode = 2;
    return;
  }
  const validation = validateOperationInput(operation, input, shouldAllowWrite(args));
  if (!validation.ok) {
    process.stdout.write(formatResult({
      ok: false,
      error: validation.error,
      operation: validation.operation || operation
    }, pretty));
    process.exitCode = validation.exitCode || 2;
    return;
  }
  const config = readEnv(process.env);
  const services = createServices(config);
  const result = projectAutomationSchedulerWorkerTargetSmokeReadback(
    Object.assign({ operation }, runOperation(services.learningAutomationSchedulerWorkerTargetService, operation, input)),
    operation,
    input,
    shouldAllowWrite(args)
  );
  process.stdout.write(formatResult(Object.assign({ operation }, result), pretty));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "automation_scheduler_worker_target_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  operationFromArgs,
  projectAutomationSchedulerWorkerTargetSmokeReadback,
  runOperation,
  shouldAllowWrite,
  validateOperationInput
};
