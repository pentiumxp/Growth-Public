"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const WRITE_OPERATIONS = new Set(["create", "deliver"]);
const OPERATIONS = new Set(["list", "create", "deliver"]);

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
    wrapped.code = "automation_action_handoff_smoke_invalid_json";
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

function operationFromArgs(args) {
  const explicit = firstArgValue(args, ["--operation"], "");
  const operation = explicit || (hasFlag(args, "--create") ? "create" : hasFlag(args, "--deliver") ? "deliver" : "list");
  if (!OPERATIONS.has(operation)) {
    const error = new Error(`invalid_operation:${operation}`);
    error.code = "automation_action_handoff_smoke_operation_invalid";
    error.operation = operation;
    throw error;
  }
  return operation;
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
    digestId: firstArgValue(args, ["--digest-id", "--digestId"], jsonInput.digestId || jsonInput.digest_id || ""),
    handoffId: firstArgValue(args, ["--handoff-id", "--handoffId"], jsonInput.handoffId || jsonInput.handoff_id || ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], jsonInput.domainPackId || jsonInput.domain_pack_id || ""),
    domain: firstArgValue(args, ["--domain"], jsonInput.domain || ""),
    subject: firstArgValue(args, ["--subject"], jsonInput.subject || ""),
    horizon: firstArgValue(args, ["--horizon"], jsonInput.horizon || "daily_plan") || "daily_plan",
    status: firstArgValue(args, ["--status"], jsonInput.status || ""),
    deliveryStatus: firstArgValue(args, ["--delivery-status", "--deliveryStatus"], jsonInput.deliveryStatus || jsonInput.delivery_status || ""),
    limit: boundedNumberArg(args, ["--limit"], jsonInput.limit || 20, 1, 100),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy", "--created-by", "--createdBy"], jsonInput.requestedBy || jsonInput.requested_by || jsonInput.createdBy || jsonInput.created_by || "")
  }));
}

function validateOperationInput(operation, input, allowWrite) {
  if (!input.workspaceId) return { ok: false, error: "workspace_id_required", exitCode: 2 };
  if (WRITE_OPERATIONS.has(operation) && !allowWrite) {
    return { ok: false, error: "automation_action_handoff_smoke_write_not_allowed", operation, exitCode: 2 };
  }
  if (operation === "create" && !input.digestId) {
    return { ok: false, error: "digest_id_required", exitCode: 2 };
  }
  if (operation === "deliver" && !input.handoffId) {
    return { ok: false, error: "handoff_id_required", exitCode: 2 };
  }
  return { ok: true };
}

async function runOperation(service, operation, input) {
  if (operation === "create") return service.createHandoff(input);
  if (operation === "deliver") return service.deliverHandoff(input);
  return service.listHandoffs(input);
}

function summarizeStatuses(handoffs = [], key = "status") {
  return asArray(handoffs).reduce((counts, handoff) => {
    const status = cleanString(handoff && handoff[key], 80) || "missing";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

function projectAutomationActionHandoffSmokeReadback(result = {}, operation = "list", input = {}, writeAllowed = false) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const handoffs = asArray(readback.handoffs);
  const handoff = objectOnly(readback.handoff || handoffs[0]);
  const actionSummary = objectOnly(handoff.actionSummary);
  const policyReadiness = objectOnly(handoff.policyReadiness);
  const notification = objectOnly(handoff.notification);
  const delivery = objectOnly(readback.delivery || handoff.delivery);
  const actions = asArray(handoff.actions);
  const blocked = asArray(handoff.blocked);
  const statusRows = handoffs.length ? handoffs : handoff.handoffId ? [handoff] : [];
  const handoffStatusCounts = summarizeStatuses(statusRows, "status");
  const deliveryStatusCounts = summarizeStatuses(statusRows, "deliveryStatus");
  const deliveryStatus = cleanString(readback.deliveryStatus || handoff.deliveryStatus || (operation === "list" ? "listed" : "pass"), 120);
  const writeOperation = WRITE_OPERATIONS.has(operation);
  return Object.assign({}, readback, {
    automationActionHandoffStatus: cleanString(
      readback.ok === false ? readback.error || "failed" : deliveryStatus,
      140
    ),
    automationActionHandoffOk: readback.ok !== false,
    automationActionHandoffOperation: cleanString(operation, 80),
    automationActionHandoffWriteOperation: writeOperation,
    automationActionHandoffWriteAllowed: writeAllowed === true,
    automationActionHandoffWritesPerformed: writeOperation && writeAllowed === true && readback.ok === true && readback.duplicate !== true,
    automationActionHandoffDuplicate: readback.duplicate === true,
    automationActionHandoffWorkspaceId: cleanString(readback.workspaceId || handoff.workspaceId || input.workspaceId, 160),
    automationActionHandoffLearnerId: cleanString(readback.learnerId || handoff.learnerId || input.learnerId, 160),
    automationActionHandoffProgramId: cleanString(handoff.programId || input.programId, 160),
    automationActionHandoffDomainPackId: cleanString(handoff.domainPackId || input.domainPackId, 180),
    automationActionHandoffDomain: cleanString(handoff.domain || input.domain, 120),
    automationActionHandoffSubject: cleanString(handoff.subject || input.subject, 120),
    automationActionHandoffHorizon: cleanString(handoff.horizon || input.horizon, 80),
    automationActionHandoffCount: numberValue(readback.count, handoffs.length),
    automationActionHandoffHandoffId: cleanString(handoff.handoffId || input.handoffId, 180),
    automationActionHandoffHandoffIds: uniqueBoundedStrings(handoffs.map((item) => item && item.handoffId), 24),
    automationActionHandoffDigestId: cleanString(handoff.digestId || actionSummary.digestId || input.digestId, 180),
    automationActionHandoffPolicyId: cleanString(handoff.policyId || policyReadiness.policyId, 180),
    automationActionHandoffPrivacyClass: cleanString(handoff.privacyClass, 80),
    automationActionHandoffStatuses: uniqueBoundedStrings(Object.keys(handoffStatusCounts), 12),
    automationActionHandoffPendingDeliveryCount: numberValue(handoffStatusCounts.pending_delivery, 0),
    automationActionHandoffDeliveryStatuses: uniqueBoundedStrings(Object.keys(deliveryStatusCounts), 12),
    automationActionHandoffNotDeliveredCount: numberValue(deliveryStatusCounts.not_delivered, 0),
    automationActionHandoffDeliveredCount: numberValue(deliveryStatusCounts.delivered, 0),
    automationActionHandoffDeliveryFailedCount: numberValue(deliveryStatusCounts.delivery_failed, 0),
    automationActionHandoffDeliveryStatus: deliveryStatus,
    automationActionHandoffDelivered: deliveryStatus === "delivered",
    automationActionHandoffDeliveryError: cleanString(delivery.error || readback.error, 220),
    automationActionHandoffDeliveryInboxItemId: cleanString(delivery.inboxItemId, 180),
    automationActionHandoffNotificationEventType: cleanString(notification.eventType, 140),
    automationActionHandoffNotificationRoute: cleanString(notification.route && notification.route.pluginRoute, 120),
    automationActionHandoffActionRequiredBeforeScheduling: readback.actionHandoffRequiredBeforeScheduling === true || Boolean(handoff.handoffId),
    automationActionHandoffWritefulSchedulingAllowed: readback.writefulSchedulingAllowed === true || policyReadiness.writefulSchedulingAllowed === true,
    automationActionHandoffPolicyReady: policyReadiness.readyForWritefulAutomationPrerequisite === true,
    automationActionHandoffRequiredActionCount: numberValue(actionSummary.requiredActions, actions.length),
    automationActionHandoffBlockedCount: numberValue(actionSummary.blocked, blocked.length),
    automationActionHandoffInspectedCount: numberValue(actionSummary.inspected, 0),
    automationActionHandoffWouldPublishCount: numberValue(actionSummary.wouldPublish, 0),
    automationActionHandoffSkippedCount: numberValue(actionSummary.skipped, 0),
    automationActionHandoffActionCandidateIds: uniqueBoundedStrings(actions.map((item) => item && item.candidateId), 24),
    automationActionHandoffActionEndpoints: uniqueBoundedStrings(actions.map((item) => item && item.endpoint), 12),
    automationActionHandoffBlockedCandidateIds: uniqueBoundedStrings(blocked.map((item) => item && item.candidateId), 24)
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
      error: error.code || "automation_action_handoff_smoke_parse_failed",
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
  const result = projectAutomationActionHandoffSmokeReadback(
    Object.assign({ operation }, await runOperation(services.learningAutomationActionHandoffService, operation, input)),
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
      error: "automation_action_handoff_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  operationFromArgs,
  projectAutomationActionHandoffSmokeReadback,
  runOperation,
  shouldAllowWrite,
  validateOperationInput
};
