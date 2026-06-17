"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const WRITE_OPERATIONS = new Set(["record"]);
const OPERATIONS = new Set(["list", "bag", "record"]);

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
    wrapped.code = "automation_release_approval_smoke_invalid_json";
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

function uniqueBoundedStrings(values = [], limit = 24) {
  return Array.from(new Set(asArray(values).map((value) => cleanString(value, 220)).filter(Boolean))).slice(0, limit);
}

function operationFromArgs(args) {
  const explicit = firstArgValue(args, ["--operation"], "");
  const operation = explicit || (hasFlag(args, "--record") ? "record" : hasFlag(args, "--bag") ? "bag" : "list");
  if (!OPERATIONS.has(operation)) {
    const error = new Error(`invalid_operation:${operation}`);
    error.code = "automation_release_approval_smoke_operation_invalid";
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
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], jsonInput.domainPackId || jsonInput.domain_pack_id || ""),
    domain: firstArgValue(args, ["--domain"], jsonInput.domain || ""),
    subject: firstArgValue(args, ["--subject"], jsonInput.subject || ""),
    horizon: firstArgValue(args, ["--horizon"], jsonInput.horizon || "daily_plan") || "daily_plan",
    approvalKey: firstArgValue(args, ["--approval-key", "--approvalKey", "--config-gate", "--configGate"], jsonInput.approvalKey || jsonInput.approval_key || jsonInput.configGate || jsonInput.config_gate || ""),
    approval: parseJsonArg(args, ["--approval-json", "--approvalJson"], jsonInput.approval || {}),
    evidence: parseJsonArg(args, ["--evidence-json", "--evidenceJson"], jsonInput.evidence || {}),
    status: firstArgValue(args, ["--status"], jsonInput.status || ""),
    limit: boundedNumberArg(args, ["--limit"], jsonInput.limit || 20, 1, 100),
    note: firstArgValue(args, ["--note", "--reason"], jsonInput.note || jsonInput.reason || jsonInput.summary || ""),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy", "--approved-by", "--approvedBy"], jsonInput.requestedBy || jsonInput.requested_by || jsonInput.approvedBy || jsonInput.approved_by || ""),
    approvedBy: firstArgValue(args, ["--approved-by", "--approvedBy", "--requested-by", "--requestedBy"], jsonInput.approvedBy || jsonInput.approved_by || jsonInput.requestedBy || jsonInput.requested_by || ""),
    approvedAt: firstArgValue(args, ["--approved-at", "--approvedAt"], jsonInput.approvedAt || jsonInput.approved_at || ""),
    createdAt: firstArgValue(args, ["--created-at", "--createdAt"], jsonInput.createdAt || jsonInput.created_at || "")
  }));
}

function validateOperationInput(operation, input, allowWrite) {
  if (!input.workspaceId) return { ok: false, error: "workspace_id_required", exitCode: 2 };
  if (WRITE_OPERATIONS.has(operation) && !allowWrite) {
    return { ok: false, error: "automation_release_approval_smoke_write_not_allowed", operation, exitCode: 2 };
  }
  if (operation === "record" && !input.approvalKey) {
    return { ok: false, error: "approval_key_required", exitCode: 2 };
  }
  return { ok: true };
}

function runOperation(service, operation, input) {
  if (operation === "record") return service.recordApproval(input);
  if (operation === "bag") return service.approvalBag(input);
  return service.listApprovals(input);
}

function summarizeStatuses(approvals = []) {
  return asArray(approvals).reduce((counts, approval) => {
    const status = cleanString(approval && approval.status, 80) || "missing";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

function projectAutomationReleaseApprovalSmokeReadback(result = {}, operation = "list", input = {}, writeAllowed = false) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const approvals = asArray(readback.approvals);
  const approval = objectOnly(readback.approval || approvals[0]);
  const approvalSummary = objectOnly(approval.approval);
  const evidence = objectOnly(approval.evidence);
  const releaseApproval = objectOnly(readback.releaseApproval);
  const statusRows = approvals.length ? approvals : approval.approvalId ? [approval] : [];
  const statusCounts = summarizeStatuses(statusRows);
  const approvedKeys = uniqueBoundedStrings(Object.keys(releaseApproval), 8);
  const writeOperation = WRITE_OPERATIONS.has(operation);
  const approvalStatus = cleanString(approval.status || readback.status || (operation === "bag" ? "approval_bag_ready" : operation === "list" ? "listed" : ""), 120);
  return Object.assign({}, readback, {
    automationReleaseApprovalStatus: cleanString(
      readback.ok === false ? readback.error || "failed" : approvalStatus || "ready",
      140
    ),
    automationReleaseApprovalOk: readback.ok !== false,
    automationReleaseApprovalOperation: cleanString(operation, 80),
    automationReleaseApprovalWriteOperation: writeOperation,
    automationReleaseApprovalWriteAllowed: writeAllowed === true,
    automationReleaseApprovalWritesPerformed: writeOperation && writeAllowed === true && readback.ok === true && readback.duplicate !== true,
    automationReleaseApprovalDuplicate: readback.duplicate === true,
    automationReleaseApprovalWorkspaceId: cleanString(readback.workspaceId || approval.workspaceId || input.workspaceId, 160),
    automationReleaseApprovalLearnerId: cleanString(readback.learnerId || approval.learnerId || input.learnerId, 160),
    automationReleaseApprovalProgramId: cleanString(approval.programId || input.programId, 160),
    automationReleaseApprovalDomainPackId: cleanString(approval.domainPackId || input.domainPackId, 180),
    automationReleaseApprovalDomain: cleanString(approval.domain || input.domain, 120),
    automationReleaseApprovalSubject: cleanString(approval.subject || input.subject, 120),
    automationReleaseApprovalHorizon: cleanString(approval.horizon || input.horizon, 80),
    automationReleaseApprovalCount: numberValue(readback.count, approvals.length),
    automationReleaseApprovalApprovalId: cleanString(approval.approvalId, 180),
    automationReleaseApprovalApprovalIds: uniqueBoundedStrings(approvals.map((item) => item && item.approvalId), 24),
    automationReleaseApprovalApprovalKey: cleanString(approval.approvalKey || approvalSummary.approvalKey || input.approvalKey, 160),
    automationReleaseApprovalApprovalKeys: uniqueBoundedStrings(readback.approvalKeys || approvals.map((item) => item && item.approvalKey), 8),
    automationReleaseApprovalApprovedKeys: approvedKeys,
    automationReleaseApprovalApprovedKeyCount: approvedKeys.length,
    automationReleaseApprovalStatuses: uniqueBoundedStrings(Object.keys(statusCounts), 12),
    automationReleaseApprovalApprovedCount: numberValue(statusCounts.approved, 0),
    automationReleaseApprovalRevokedCount: numberValue(statusCounts.revoked, 0),
    automationReleaseApprovalExpiredCount: numberValue(statusCounts.expired, 0),
    automationReleaseApprovalSupersededCount: numberValue(statusCounts.superseded, 0),
    automationReleaseApprovalPrivacyClass: cleanString(approval.privacyClass, 80),
    automationReleaseApprovalVersion: cleanString(approval.approvalVersion || approvalSummary.schemaVersion, 140),
    automationReleaseApprovalEvidenceVersion: cleanString(evidence.schemaVersion, 140),
    automationReleaseApprovalApproved: approval.status === "approved" || approvalSummary.approved === true || approvedKeys.length > 0,
    automationReleaseApprovalApprovedBy: cleanString(approval.approvedBy || releaseApproval[approval.approvalKey]?.approvedBy, 160),
    automationReleaseApprovalApprovedAt: cleanString(approval.approvedAt || releaseApproval[approval.approvalKey]?.approvedAt, 120),
    automationReleaseApprovalWritefulSchedulingAllowed: readback.writefulSchedulingAllowed === true || approvalSummary.writefulSchedulingAllowed === true
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
      error: error.code || "automation_release_approval_smoke_parse_failed",
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
  const result = projectAutomationReleaseApprovalSmokeReadback(
    Object.assign({ operation }, runOperation(services.learningAutomationReleaseApprovalService, operation, input)),
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
      error: "automation_release_approval_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  operationFromArgs,
  projectAutomationReleaseApprovalSmokeReadback,
  runOperation,
  shouldAllowWrite,
  validateOperationInput
};
