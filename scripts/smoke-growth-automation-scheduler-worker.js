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

function projectAutomationSchedulerWorkerSmokeReadback(result = {}, operation = "status", input = {}, writeAllowed = false) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const results = asArray(readback.results);
  const firstResult = objectOnly(results[0]);
  const lease = objectOnly(readback.lease || firstResult.lease);
  const leaseSummary = objectOnly(lease.summary);
  const run = objectOnly(readback.run || firstResult.run);
  const schedulerRun = objectOnly(readback.schedulerRun);
  const schedulerRunRun = objectOnly(schedulerRun.run);
  const writeOperation = POTENTIAL_WRITE_OPERATIONS.has(operation);
  const targetNodeIds = uniqueBoundedStrings(input.targetNodeIds, 24);
  const status = cleanString(
    readback.disabled === true || readback.expectedDisabled === true
      ? "disabled"
      : lease.status || run.status || schedulerRunRun.status || readback.error || (readback.ok === true ? "pass" : "failed"),
    140
  );
  return Object.assign({}, readback, {
    automationSchedulerWorkerStatus: status,
    automationSchedulerWorkerOk: readback.ok === true,
    automationSchedulerWorkerOperation: cleanString(operation, 80),
    automationSchedulerWorkerWriteOperation: writeOperation,
    automationSchedulerWorkerWriteAllowed: writeAllowed === true,
    automationSchedulerWorkerWritesPerformed: writeOperation && writeAllowed === true && readback.workerEnabled === true && Boolean(lease.leaseId || readback.attemptedTargets),
    automationSchedulerWorkerWorkerEnabled: readback.workerEnabled === true,
    automationSchedulerWorkerDisabled: readback.disabled === true,
    automationSchedulerWorkerExpectedDisabled: readback.expectedDisabled === true,
    automationSchedulerWorkerWorkspaceId: cleanString(readback.workspaceId || firstResult.workspaceId || input.workspaceId, 160),
    automationSchedulerWorkerLearnerId: cleanString(readback.learnerId || firstResult.learnerId || input.learnerId, 160),
    automationSchedulerWorkerProgramId: cleanString(input.programId, 160),
    automationSchedulerWorkerDomainPackId: cleanString(input.domainPackId, 180),
    automationSchedulerWorkerDomain: cleanString(input.domain, 120),
    automationSchedulerWorkerSubject: cleanString(input.subject, 120),
    automationSchedulerWorkerHorizon: cleanString(input.horizon, 80),
    automationSchedulerWorkerMode: cleanString(input.workerMode, 120),
    automationSchedulerWorkerWorkerId: cleanString(input.workerId, 160),
    automationSchedulerWorkerLeaseMs: numberValue(input.leaseMs, 0),
    automationSchedulerWorkerLimit: numberValue(input.limit, 0),
    automationSchedulerWorkerMaxTargets: numberValue(input.maxTargets, 0),
    automationSchedulerWorkerGenerationKey: cleanString(input.generationKey, 160),
    automationSchedulerWorkerCardSchemaVersion: cleanString(input.cardSchemaVersion, 120),
    automationSchedulerWorkerTargetSource: cleanString(readback.targetSource, 120),
    automationSchedulerWorkerTargetCount: numberValue(readback.targetCount, asArray(input.targets).length),
    automationSchedulerWorkerAttemptedTargetCount: numberValue(readback.attemptedTargets, results.length),
    automationSchedulerWorkerSucceededCount: numberValue(readback.succeeded, 0),
    automationSchedulerWorkerFailedCount: numberValue(readback.failed, results.filter((item) => item && item.ok === false).length),
    automationSchedulerWorkerResultCount: results.length,
    automationSchedulerWorkerResultWorkspaceIds: uniqueBoundedStrings(results.map((item) => item && item.workspaceId), 24),
    automationSchedulerWorkerTargetNodeCount: targetNodeIds.length,
    automationSchedulerWorkerTargetNodeIds: targetNodeIds,
    automationSchedulerWorkerLeaseId: cleanString(lease.leaseId, 180),
    automationSchedulerWorkerLeaseStatus: cleanString(lease.status, 120),
    automationSchedulerWorkerLeaseRunId: cleanString(lease.runId, 180),
    automationSchedulerWorkerLeaseRunStatus: cleanString(lease.runStatus, 120),
    automationSchedulerWorkerRunId: cleanString(run.runId || schedulerRunRun.runId, 180),
    automationSchedulerWorkerRunStatus: cleanString(run.status || schedulerRunRun.status, 120),
    automationSchedulerWorkerSchedulerRunOk: schedulerRun.ok === true || leaseSummary.schedulerRunOk === true,
    automationSchedulerWorkerSchedulerRunError: cleanString(schedulerRun.error || leaseSummary.schedulerRunError || firstResult.error || readback.error, 220),
    automationSchedulerWorkerSchedulerRunServiceOnly: leaseSummary.schedulerRunServiceOnly === true,
    automationSchedulerWorkerAttemptedExecutionCount: numberValue(leaseSummary.attemptedExecutions, 0),
    automationSchedulerWorkerNoDirectGateway: leaseSummary.noDirectGateway === true,
    automationSchedulerWorkerNoDirectPublish: leaseSummary.noDirectPublish === true,
    automationSchedulerWorkerNoDirectCardGeneration: leaseSummary.noDirectCardGeneration === true
  });
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
  const result = projectAutomationSchedulerWorkerSmokeReadback(
    operation === "status" ? wrapStatusResult(rawResult) : rawResult,
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
      error: "automation_scheduler_worker_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  operationFromArgs,
  projectAutomationSchedulerWorkerSmokeReadback,
  runOperation,
  shouldAllowWrite,
  validateOperationInput,
  wrapStatusResult
};
