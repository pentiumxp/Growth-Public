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
  const result = runOperation(services.learningAutomationSchedulerWorkerTargetService, operation, input);
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
  runOperation,
  shouldAllowWrite,
  validateOperationInput
};
