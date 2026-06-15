"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const OPERATIONS = new Set(["status", "tick", "tick-targets", "tickTargets"]);
const POTENTIAL_WRITE_OPERATIONS = new Set(["tick", "tick-targets"]);
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body)/i;

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

function parseJsonValue(text, option, fallback) {
  const value = String(text || "").trim();
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    const wrapped = new Error(`invalid_json:${option}`);
    wrapped.code = "automation_scheduler_worker_smoke_invalid_json";
    wrapped.option = option;
    wrapped.cause = error;
    throw wrapped;
  }
}

function parseJsonArg(args, names, fallback = {}) {
  const option = names.find((name) => firstArgValue(args, [name], ""));
  if (!option) return fallback;
  const parsed = parseJsonValue(argValue(args, option, ""), option, fallback);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
}

function parseJsonArrayArg(args, names, fallback = []) {
  const option = names.find((name) => firstArgValue(args, [name], ""));
  if (!option) return fallback;
  const parsed = parseJsonValue(argValue(args, option, ""), option, fallback);
  return Array.isArray(parsed) ? parsed : fallback;
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

function scanPrivacyKeys(value, path = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacyKeys(item, `${path}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacyKeys(child, childPath, findings);
  }
  return findings;
}

function normalizeOperation(operation) {
  if (operation === "tickTargets") return "tick-targets";
  return operation;
}

function operationFromArgs(args) {
  const explicit = firstArgValue(args, ["--operation"], "");
  const operation = explicit
    || (hasFlag(args, "--tick-targets") || hasFlag(args, "--tickTargets")
      ? "tick-targets"
      : hasFlag(args, "--tick")
        ? "tick"
        : "status");
  if (!OPERATIONS.has(operation)) {
    const error = new Error(`invalid_operation:${operation}`);
    error.code = "automation_scheduler_worker_smoke_operation_invalid";
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
  const targets = parseJsonArrayArg(args, ["--targets-json", "--targetsJson"], jsonInput.targets || []);
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], jsonInput.workspaceId || jsonInput.workspace_id || "");
  const targetNodeIds = listArg(args, ["--target-node-ids", "--targetNodeIds", "--node-ids", "--nodeIds"], jsonInput.targetNodeIds || jsonInput.target_node_ids || jsonInput.nodeIds || jsonInput.node_ids || []);
  return stripUndefined(Object.assign({}, jsonInput, {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], jsonInput.learnerId || jsonInput.learner_id || "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], jsonInput.programId || jsonInput.program_id || ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], jsonInput.domainPackId || jsonInput.domain_pack_id || ""),
    domain: firstArgValue(args, ["--domain"], jsonInput.domain || ""),
    subject: firstArgValue(args, ["--subject"], jsonInput.subject || ""),
    horizon: firstArgValue(args, ["--horizon"], jsonInput.horizon || "daily_plan") || "daily_plan",
    workerMode: firstArgValue(args, ["--worker-mode", "--workerMode", "--mode"], jsonInput.workerMode || jsonInput.worker_mode || jsonInput.mode || "background_worker_tick") || "background_worker_tick",
    workerId: firstArgValue(args, ["--worker-id", "--workerId"], jsonInput.workerId || jsonInput.worker_id || ""),
    leaseMs: boundedNumberArg(args, ["--lease-ms", "--leaseMs"], jsonInput.leaseMs || jsonInput.lease_ms || 10 * 60 * 1000, 5000, 60 * 60 * 1000),
    limit: boundedNumberArg(args, ["--limit"], jsonInput.limit || 5, 1, 25),
    maxTargets: boundedNumberArg(args, ["--max-targets", "--maxTargets"], jsonInput.maxTargets || jsonInput.max_targets || 5, 1, 25),
    generationKey: firstArgValue(args, ["--generation-key", "--generationKey"], jsonInput.generationKey || jsonInput.generation_key || ""),
    cardSchemaVersion: firstArgValue(args, ["--card-schema-version", "--cardSchemaVersion"], jsonInput.cardSchemaVersion || jsonInput.card_schema_version || ""),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy"], jsonInput.requestedBy || jsonInput.requested_by || ""),
    targetNodeIds,
    targets
  }));
}

function validateOperationInput(operation, input, allowWrite, config = {}) {
  if (!input.workspaceId) return { ok: false, error: "workspace_id_required", exitCode: 2 };
  const privacyFindings = scanPrivacyKeys(input);
  if (privacyFindings.length) {
    return {
      ok: false,
      error: "automation_scheduler_worker_smoke_privacy_failed",
      privacyFindings,
      exitCode: 2
    };
  }
  const workerEnabled = config.automationBackgroundWorkerEnabled === true;
  if (workerEnabled && !allowWrite) {
    return {
      ok: false,
      error: "automation_scheduler_worker_smoke_write_not_allowed",
      operation,
      exitCode: 2
    };
  }
  if (POTENTIAL_WRITE_OPERATIONS.has(operation) && workerEnabled && !allowWrite) {
    return {
      ok: false,
      error: "automation_scheduler_worker_smoke_write_not_allowed",
      operation,
      exitCode: 2
    };
  }
  return { ok: true };
}

async function runOperation(service, operation, input) {
  if (operation === "tick") return service.tick(input);
  return service.tickTargets(input);
}

function wrapStatusResult(result) {
  if (result?.error === "learning_automation_scheduler_worker_disabled") {
    return Object.assign({}, result, {
      ok: true,
      disabled: true,
      expectedDisabled: true
    });
  }
  return result;
}

function formatResult(result, pretty) {
  return `${JSON.stringify(result, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json");
  const config = readEnv(process.env);
  let operation;
  let input;
  try {
    operation = operationFromArgs(args);
    input = inputFromArgs(args);
  } catch (error) {
    process.stdout.write(formatResult({
      ok: false,
      error: error.code || "automation_scheduler_worker_smoke_parse_failed",
      option: error.option || "",
      operation: error.operation || ""
    }, pretty));
    process.exitCode = 2;
    return;
  }
  const validation = validateOperationInput(operation, input, shouldAllowWrite(args), config);
  if (!validation.ok) {
    process.stdout.write(formatResult({
      ok: false,
      error: validation.error,
      operation: validation.operation || operation,
      privacyFindings: validation.privacyFindings || []
    }, pretty));
    process.exitCode = validation.exitCode || 2;
    return;
  }
  const services = createServices(config);
  const rawResult = await runOperation(services.learningAutomationSchedulerWorkerService, operation, input);
  const result = operation === "status" ? wrapStatusResult(rawResult) : rawResult;
  process.stdout.write(formatResult(Object.assign({ operation }, result), pretty));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "automation_scheduler_worker_smoke_failed",
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
  validateOperationInput,
  wrapStatusResult
};
