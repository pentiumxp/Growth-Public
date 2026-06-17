"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const WRITE_OPERATIONS = new Set(["run"]);
const OPERATIONS = new Set(["list", "run", "run-once"]);

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
    wrapped.code = "automation_scheduler_run_smoke_invalid_json";
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
  return operation === "run-once" ? "run" : operation;
}

function operationFromArgs(args) {
  const explicit = firstArgValue(args, ["--operation"], "");
  const operation = explicit
    || (hasFlag(args, "--run") || hasFlag(args, "--run-once") || hasFlag(args, "--runOnce") ? "run" : "list");
  if (!OPERATIONS.has(operation)) {
    const error = new Error(`invalid_operation:${operation}`);
    error.code = "automation_scheduler_run_smoke_operation_invalid";
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
  return stripUndefined(Object.assign({}, jsonInput, {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], jsonInput.learnerId || jsonInput.learner_id || "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], jsonInput.programId || jsonInput.program_id || ""),
    runId: firstArgValue(args, ["--run-id", "--runId"], jsonInput.runId || jsonInput.run_id || ""),
    runMode: firstArgValue(args, ["--run-mode", "--runMode", "--mode"], jsonInput.runMode || jsonInput.run_mode || jsonInput.mode || "background_supervised_tick") || "background_supervised_tick",
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], jsonInput.domainPackId || jsonInput.domain_pack_id || ""),
    domain: firstArgValue(args, ["--domain"], jsonInput.domain || ""),
    subject: firstArgValue(args, ["--subject"], jsonInput.subject || ""),
    horizon: firstArgValue(args, ["--horizon"], jsonInput.horizon || "daily_plan") || "daily_plan",
    status: firstArgValue(args, ["--status"], jsonInput.status || ""),
    limit: boundedNumberArg(args, ["--limit"], jsonInput.limit || 20, 1, 100),
    generationKey: firstArgValue(args, ["--generation-key", "--generationKey"], jsonInput.generationKey || jsonInput.generation_key || ""),
    cardSchemaVersion: firstArgValue(args, ["--card-schema-version", "--cardSchemaVersion"], jsonInput.cardSchemaVersion || jsonInput.card_schema_version || ""),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy", "--executed-by", "--executedBy"], jsonInput.requestedBy || jsonInput.requested_by || jsonInput.executedBy || jsonInput.executed_by || "")
  }));
}

function validateOperationInput(operation, input, allowWrite) {
  if (!input.workspaceId) return { ok: false, error: "workspace_id_required", exitCode: 2 };
  if (WRITE_OPERATIONS.has(operation) && !allowWrite) {
    return { ok: false, error: "automation_scheduler_run_smoke_write_not_allowed", operation, exitCode: 2 };
  }
  return { ok: true };
}

async function runOperation(service, operation, input) {
  if (operation === "run") return service.runOnce(input);
  return service.listRuns(input);
}

function summarizeStatuses(items = []) {
  return asArray(items).reduce((counts, item) => {
    const status = cleanString(item && item.status, 80) || "missing";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

function projectAutomationSchedulerRunSmokeReadback(result = {}, operation = "list", input = {}, writeAllowed = false) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const runs = asArray(readback.runs);
  const run = objectOnly(readback.run || runs[0]);
  const runInput = objectOnly(run.input);
  const summary = objectOnly(run.summary);
  const candidates = asArray(run.candidates);
  const executions = asArray(readback.executions).length ? asArray(readback.executions) : asArray(run.executions);
  const statusRows = runs.length ? runs : run.runId ? [run] : [];
  const runStatusCounts = summarizeStatuses(statusRows);
  const executionStatusCounts = summarizeStatuses(executions);
  const writeOperation = WRITE_OPERATIONS.has(operation);
  const recordWritten = Boolean(run.runId);
  const status = cleanString(run.status || (readback.ok === false ? readback.error || "failed" : operation === "list" ? "listed" : "pass"), 140);
  return Object.assign({}, readback, {
    automationSchedulerRunStatus: status,
    automationSchedulerRunOk: readback.ok === true,
    automationSchedulerRunOperation: cleanString(operation, 80),
    automationSchedulerRunWriteOperation: writeOperation,
    automationSchedulerRunWriteAllowed: writeAllowed === true,
    automationSchedulerRunRecordWritten: writeOperation && writeAllowed === true && recordWritten,
    automationSchedulerRunWritesPerformed: writeOperation && writeAllowed === true && recordWritten,
    automationSchedulerRunCompleted: status === "completed" || status === "partial",
    automationSchedulerRunWorkspaceId: cleanString(readback.workspaceId || run.workspaceId || input.workspaceId, 160),
    automationSchedulerRunLearnerId: cleanString(readback.learnerId || run.learnerId || input.learnerId, 160),
    automationSchedulerRunProgramId: cleanString(run.programId || input.programId, 160),
    automationSchedulerRunDomainPackId: cleanString(run.domainPackId || runInput.domainPackId || input.domainPackId, 180),
    automationSchedulerRunDomain: cleanString(run.domain || runInput.domain || input.domain, 120),
    automationSchedulerRunSubject: cleanString(run.subject || runInput.subject || input.subject, 120),
    automationSchedulerRunHorizon: cleanString(run.horizon || runInput.horizon || input.horizon, 80),
    automationSchedulerRunCount: numberValue(readback.count, runs.length),
    automationSchedulerRunRunId: cleanString(run.runId || input.runId, 180),
    automationSchedulerRunRunIds: uniqueBoundedStrings(runs.map((item) => item && item.runId), 24),
    automationSchedulerRunStatuses: uniqueBoundedStrings(Object.keys(runStatusCounts), 12),
    automationSchedulerRunStartedCount: numberValue(runStatusCounts.started, 0),
    automationSchedulerRunCompletedCount: numberValue(runStatusCounts.completed, 0),
    automationSchedulerRunPartialCount: numberValue(runStatusCounts.partial, 0),
    automationSchedulerRunFailedCount: numberValue(runStatusCounts.failed, 0),
    automationSchedulerRunBlockedCount: numberValue(runStatusCounts.blocked, 0),
    automationSchedulerRunSkippedCount: numberValue(runStatusCounts.skipped, 0),
    automationSchedulerRunMode: cleanString(run.mode || runInput.runMode || input.runMode, 120),
    automationSchedulerRunReason: cleanString(run.reason || readback.reason || readback.error, 240),
    automationSchedulerRunError: cleanString(run.error || readback.error, 240),
    automationSchedulerRunPrivacyClass: cleanString(run.privacyClass, 80),
    automationSchedulerRunBackgroundSchedulerEnabled: readback.backgroundSchedulerEnabled === true || summary.backgroundSchedulerEnabled === true || runInput.backgroundSchedulerEnabled === true,
    automationSchedulerRunExecutionDelegation: cleanString(summary.executionDelegation, 180),
    automationSchedulerRunInspectedHandoffCount: numberValue(summary.inspectedHandoffs, 0),
    automationSchedulerRunInspectedActionCount: numberValue(summary.inspectedActions, candidates.length),
    automationSchedulerRunCandidateCount: candidates.length,
    automationSchedulerRunAttemptedExecutionCount: numberValue(summary.attemptedExecutions, executions.length),
    automationSchedulerRunPublishedExecutionCount: numberValue(summary.published, executionStatusCounts.published || 0),
    automationSchedulerRunFailedExecutionCount: numberValue(summary.failed, executionStatusCounts.failed || 0),
    automationSchedulerRunBlockedExecutionCount: numberValue(summary.blocked, executionStatusCounts.blocked || 0),
    automationSchedulerRunSkippedExecutionCount: numberValue(summary.skipped, executionStatusCounts.skipped || 0),
    automationSchedulerRunExecutionIds: uniqueBoundedStrings(executions.map((item) => item && item.executionId), 24),
    automationSchedulerRunExecutionStatuses: uniqueBoundedStrings(Object.keys(executionStatusCounts), 12),
    automationSchedulerRunCandidateHandoffIds: uniqueBoundedStrings(candidates.map((item) => item && item.handoffId), 24),
    automationSchedulerRunCandidateProposalIds: uniqueBoundedStrings(candidates.map((item) => item && item.proposalId), 24),
    automationSchedulerRunLimit: numberValue(runInput.limit, input.limit || 0),
    automationSchedulerRunGenerationKey: cleanString(input.generationKey, 160),
    automationSchedulerRunCardSchemaVersion: cleanString(input.cardSchemaVersion, 120),
    automationSchedulerRunWritefulExecutionConfigRequired: summary.writefulExecutionConfigRequired === true,
    automationSchedulerRunNoDirectGateway: summary.noDirectGateway === true,
    automationSchedulerRunNoDirectPlanPublish: summary.noDirectPlanPublish === true,
    automationSchedulerRunNoDirectCardGeneration: summary.noDirectCardGeneration === true,
    automationSchedulerRunNoStageAssessmentActivation: summary.noStageAssessmentActivation === true
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
      error: error.code || "automation_scheduler_run_smoke_parse_failed",
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
  const result = projectAutomationSchedulerRunSmokeReadback(
    Object.assign({ operation }, await runOperation(services.learningAutomationSchedulerRunService, operation, input)),
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
      error: "automation_scheduler_run_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  operationFromArgs,
  projectAutomationSchedulerRunSmokeReadback,
  runOperation,
  shouldAllowWrite,
  validateOperationInput
};
