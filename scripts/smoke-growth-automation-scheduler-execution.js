"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const WRITE_OPERATIONS = new Set(["execute"]);
const OPERATIONS = new Set(["list", "execute", "execute-once"]);

function argValue(args, name, fallback = "") {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  return String(args[index + 1] || fallback);
}

function hasFlag(args, name) {
  return args.includes(name);
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
    wrapped.code = "automation_scheduler_execution_smoke_invalid_json";
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
  return operation === "execute-once" ? "execute" : operation;
}

function operationFromArgs(args) {
  const explicit = firstArgValue(args, ["--operation"], "");
  const operation = explicit
    || (hasFlag(args, "--execute") || hasFlag(args, "--execute-once") || hasFlag(args, "--executeOnce") ? "execute" : "list");
  if (!OPERATIONS.has(operation)) {
    const error = new Error(`invalid_operation:${operation}`);
    error.code = "automation_scheduler_execution_smoke_operation_invalid";
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
  const activationGate = firstArgValue(args, ["--activation-gate", "--activationGate"], "");
  const activationGates = splitCsv(firstArgValue(args, ["--activation-gates", "--activationGates"], ""))
    .concat(activationGate ? [activationGate] : []);
  const requiredApprovalKey = firstArgValue(args, ["--required-approval-key", "--requiredApprovalKey"], "");
  const requiredApprovalKeys = splitCsv(firstArgValue(args, ["--required-approval-keys", "--requiredApprovalKeys"], ""))
    .concat(requiredApprovalKey ? [requiredApprovalKey] : []);
  return stripUndefined(Object.assign({}, jsonInput, {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], jsonInput.learnerId || jsonInput.learner_id || "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], jsonInput.programId || jsonInput.program_id || ""),
    executionId: firstArgValue(args, ["--execution-id", "--executionId"], jsonInput.executionId || jsonInput.execution_id || ""),
    executionMode: firstArgValue(args, ["--execution-mode", "--executionMode", "--mode"], jsonInput.executionMode || jsonInput.execution_mode || jsonInput.mode || "owner_explicit_once") || "owner_explicit_once",
    handoffId: firstArgValue(args, ["--handoff-id", "--handoffId"], jsonInput.handoffId || jsonInput.handoff_id || ""),
    digestId: firstArgValue(args, ["--digest-id", "--digestId"], jsonInput.digestId || jsonInput.digest_id || ""),
    policyId: firstArgValue(args, ["--policy-id", "--policyId"], jsonInput.policyId || jsonInput.policy_id || ""),
    collectionRunId: firstArgValue(args, ["--collection-run-id", "--collectionRunId", "--release-collection-run-id", "--releaseCollectionRunId"], jsonInput.collectionRunId || jsonInput.collection_run_id || jsonInput.releaseCollectionRunId || jsonInput.release_collection_run_id || ""),
    proposalId: firstArgValue(args, ["--proposal-id", "--proposalId"], jsonInput.proposalId || jsonInput.proposal_id || ""),
    planDraftId: firstArgValue(args, ["--plan-draft-id", "--planDraftId"], jsonInput.planDraftId || jsonInput.plan_draft_id || ""),
    selectedItemId: firstArgValue(args, ["--selected-item-id", "--selectedItemId", "--item-id", "--itemId"], jsonInput.selectedItemId || jsonInput.selected_item_id || jsonInput.itemId || jsonInput.item_id || ""),
    generationKey: firstArgValue(args, ["--generation-key", "--generationKey"], jsonInput.generationKey || jsonInput.generation_key || ""),
    cardSchemaVersion: firstArgValue(args, ["--card-schema-version", "--cardSchemaVersion"], jsonInput.cardSchemaVersion || jsonInput.card_schema_version || ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], jsonInput.domainPackId || jsonInput.domain_pack_id || ""),
    domain: firstArgValue(args, ["--domain"], jsonInput.domain || ""),
    subject: firstArgValue(args, ["--subject"], jsonInput.subject || ""),
    horizon: firstArgValue(args, ["--horizon"], jsonInput.horizon || "daily_plan") || "daily_plan",
    activationGates: activationGates.length ? activationGates : (jsonInput.activationGates || jsonInput.activation_gates || jsonInput.requestedActivationGates || jsonInput.requested_activation_gates),
    requiredApprovalKeys: requiredApprovalKeys.length ? requiredApprovalKeys : (jsonInput.requiredApprovalKeys || jsonInput.required_approval_keys),
    activationRecordLimit: boundedNumberArg(args, ["--activation-record-limit", "--activationRecordLimit"], jsonInput.activationRecordLimit || jsonInput.activation_record_limit || 10, 1, 10),
    status: firstArgValue(args, ["--status"], jsonInput.status || ""),
    limit: boundedNumberArg(args, ["--limit"], jsonInput.limit || 20, 1, 100),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy", "--executed-by", "--executedBy"], jsonInput.requestedBy || jsonInput.requested_by || jsonInput.executedBy || jsonInput.executed_by || "")
  }));
}

function validateOperationInput(operation, input, allowWrite) {
  if (!input.workspaceId) return { ok: false, error: "workspace_id_required", exitCode: 2 };
  if (WRITE_OPERATIONS.has(operation) && !allowWrite) {
    return { ok: false, error: "automation_scheduler_execution_smoke_write_not_allowed", operation, exitCode: 2 };
  }
  if (operation === "execute" && !input.handoffId) {
    return { ok: false, error: "handoff_id_required", exitCode: 2 };
  }
  if (operation === "execute" && !input.proposalId) {
    return { ok: false, error: "proposal_id_required", exitCode: 2 };
  }
  return { ok: true };
}

async function runOperation(service, operation, input) {
  if (operation === "execute") return service.executeOnce(input);
  return service.listExecutions(input);
}

function summarizeStatuses(executions = []) {
  return asArray(executions).reduce((counts, execution) => {
    const status = cleanString(execution && execution.status, 80) || "missing";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

function projectAutomationSchedulerExecutionSmokeReadback(result = {}, operation = "list", input = {}, writeAllowed = false) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const executions = asArray(readback.executions);
  const execution = objectOnly(readback.execution || executions[0]);
  const gate = objectOnly(execution.gate);
  const action = objectOnly(execution.action);
  const executionSummary = objectOnly(execution.execution);
  const publishResult = objectOnly(readback.publishResult || execution.publishResult);
  const statusRows = executions.length ? executions : execution.executionId ? [execution] : [];
  const statusCounts = summarizeStatuses(statusRows);
  const writeOperation = WRITE_OPERATIONS.has(operation);
  const recordWritten = Boolean(execution.executionId);
  const status = cleanString(execution.status || executionSummary.status || (readback.ok === false ? readback.error || "failed" : operation === "list" ? "listed" : "pass"), 140);
  return Object.assign({}, readback, {
    automationSchedulerExecutionStatus: status,
    automationSchedulerExecutionOk: readback.ok === true,
    automationSchedulerExecutionOperation: cleanString(operation, 80),
    automationSchedulerExecutionWriteOperation: writeOperation,
    automationSchedulerExecutionWriteAllowed: writeAllowed === true,
    automationSchedulerExecutionRecordWritten: writeOperation && writeAllowed === true && recordWritten,
    automationSchedulerExecutionWritesPerformed: writeOperation && writeAllowed === true && recordWritten,
    automationSchedulerExecutionPublished: status === "published" || publishResult.ok === true,
    automationSchedulerExecutionWorkspaceId: cleanString(readback.workspaceId || execution.workspaceId || input.workspaceId, 160),
    automationSchedulerExecutionLearnerId: cleanString(readback.learnerId || execution.learnerId || input.learnerId, 160),
    automationSchedulerExecutionProgramId: cleanString(execution.programId || input.programId, 160),
    automationSchedulerExecutionCount: numberValue(readback.count, executions.length),
    automationSchedulerExecutionExecutionId: cleanString(execution.executionId || input.executionId, 180),
    automationSchedulerExecutionExecutionIds: uniqueBoundedStrings(executions.map((item) => item && item.executionId), 24),
    automationSchedulerExecutionStatuses: uniqueBoundedStrings(Object.keys(statusCounts), 12),
    automationSchedulerExecutionStartedCount: numberValue(statusCounts.started, 0),
    automationSchedulerExecutionPublishedCount: numberValue(statusCounts.published, 0),
    automationSchedulerExecutionFailedCount: numberValue(statusCounts.failed, 0),
    automationSchedulerExecutionBlockedCount: numberValue(statusCounts.blocked, 0),
    automationSchedulerExecutionSkippedCount: numberValue(statusCounts.skipped, 0),
    automationSchedulerExecutionMode: cleanString(execution.mode || gate.executionMode || input.executionMode, 120),
    automationSchedulerExecutionReason: cleanString(execution.reason || executionSummary.reason || readback.reason || readback.error, 240),
    automationSchedulerExecutionError: cleanString(execution.error || readback.error || publishResult.error, 240),
    automationSchedulerExecutionRetryRequiresOwner: executionSummary.retryRequiresOwner === true,
    automationSchedulerExecutionHandoffId: cleanString(execution.handoffId || action.handoffId || input.handoffId, 180),
    automationSchedulerExecutionDigestId: cleanString(execution.digestId || action.digestId || input.digestId, 180),
    automationSchedulerExecutionPolicyId: cleanString(execution.policyId || input.policyId, 180),
    automationSchedulerExecutionProposalId: cleanString(execution.proposalId || action.proposalId || input.proposalId, 180),
    automationSchedulerExecutionPlanDraftId: cleanString(execution.planDraftId || action.planDraftId || input.planDraftId, 180),
    automationSchedulerExecutionSelectedItemId: cleanString(execution.selectedItemId || action.selectedItemId || input.selectedItemId, 180),
    automationSchedulerExecutionCollectionRunId: cleanString(input.collectionRunId, 180),
    automationSchedulerExecutionDomainPackId: cleanString(input.domainPackId, 180),
    automationSchedulerExecutionDomain: cleanString(input.domain, 120),
    automationSchedulerExecutionSubject: cleanString(input.subject, 120),
    automationSchedulerExecutionHorizon: cleanString(input.horizon, 80),
    automationSchedulerExecutionPrivacyClass: cleanString(execution.privacyClass, 80),
    automationSchedulerExecutionWritefulExecutionEnabled: gate.writefulExecutionEnabled === true || readback.writefulExecutionEnabled === true,
    automationSchedulerExecutionWritefulSchedulingAllowed: gate.failurePolicy?.writefulSchedulingAllowed === true || gate.releaseAuthorization?.writefulSchedulingAllowed === true,
    automationSchedulerExecutionReleaseAuthorized: gate.releaseAuthorization?.authorized === true,
    automationSchedulerExecutionRuntimeConfigChange: gate.releaseAuthorization?.runtimeConfigChange === true,
    automationSchedulerExecutionActivationReady: gate.releaseActivation?.ok === true || gate.releaseActivation?.activationRecordPresent === true,
    automationSchedulerExecutionRuntimeEnablementReady: gate.runtimeEnablement?.ok === true || gate.runtimeEnablement?.valid === true,
    automationSchedulerExecutionDryRunOk: gate.dryRun?.ok === true,
    automationSchedulerExecutionDryRunWritePlanned: gate.dryRun?.writePlanned === true,
    automationSchedulerExecutionDryRunWritesPerformed: gate.dryRun?.writesPerformed === true,
    automationSchedulerExecutionDryRunPublishPlanned: gate.dryRun?.publishPlanned === true,
    automationSchedulerExecutionCandidateDecision: cleanString(gate.candidate?.decision, 120),
    automationSchedulerExecutionCandidateWouldPublish: gate.candidate?.wouldPublish === true,
    automationSchedulerExecutionCandidateSafeToPublish: gate.candidate?.safeToPublish === true,
    automationSchedulerExecutionPublishDelegation: cleanString(action.publishDelegation, 180),
    automationSchedulerExecutionGeneratedTaskCardId: cleanString(executionSummary.generatedTaskCardId, 180),
    automationSchedulerExecutionProposalExecutionStatus: cleanString(executionSummary.proposalExecutionStatus, 120),
    automationSchedulerExecutionPublishError: cleanString(publishResult.error, 220)
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
      error: error.code || "automation_scheduler_execution_smoke_parse_failed",
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
  const result = projectAutomationSchedulerExecutionSmokeReadback(
    Object.assign({ operation }, await runOperation(services.learningAutomationSchedulerExecutionService, operation, input)),
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
      error: "automation_scheduler_execution_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  operationFromArgs,
  projectAutomationSchedulerExecutionSmokeReadback,
  runOperation,
  shouldAllowWrite,
  validateOperationInput
};
