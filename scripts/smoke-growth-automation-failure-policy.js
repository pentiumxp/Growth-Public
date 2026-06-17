"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const WRITE_OPERATIONS = new Set(["create", "review"]);
const OPERATIONS = new Set(["readiness", "list", "create", "review"]);

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
    wrapped.code = "automation_failure_policy_smoke_invalid_json";
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
  const operation = explicit
    || (hasFlag(args, "--create") ? "create" : hasFlag(args, "--review") ? "review" : hasFlag(args, "--list") ? "list" : "readiness");
  if (!OPERATIONS.has(operation)) {
    const error = new Error(`invalid_operation:${operation}`);
    error.code = "automation_failure_policy_smoke_operation_invalid";
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
  const status = firstArgValue(args, ["--status", "--review-status", "--reviewStatus"], jsonInput.status || jsonInput.reviewStatus || jsonInput.review_status || "");
  return stripUndefined(Object.assign({}, jsonInput, {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], jsonInput.learnerId || jsonInput.learner_id || "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], jsonInput.programId || jsonInput.program_id || ""),
    policyId: firstArgValue(args, ["--policy-id", "--policyId"], jsonInput.policyId || jsonInput.policy_id || ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], jsonInput.domainPackId || jsonInput.domain_pack_id || ""),
    domain: firstArgValue(args, ["--domain"], jsonInput.domain || ""),
    subject: firstArgValue(args, ["--subject"], jsonInput.subject || ""),
    horizon: firstArgValue(args, ["--horizon"], jsonInput.horizon || "daily_plan") || "daily_plan",
    status: status || undefined,
    limit: boundedNumberArg(args, ["--limit"], jsonInput.limit || 20, 1, 100),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy", "--created-by", "--createdBy", "--reviewed-by", "--reviewedBy"], jsonInput.requestedBy || jsonInput.requested_by || jsonInput.createdBy || jsonInput.created_by || jsonInput.reviewedBy || jsonInput.reviewed_by || "")
  }));
}

function validateOperationInput(operation, input, allowWrite) {
  if (!input.workspaceId) return { ok: false, error: "workspace_id_required", exitCode: 2 };
  if (WRITE_OPERATIONS.has(operation) && !allowWrite) {
    return { ok: false, error: "automation_failure_policy_smoke_write_not_allowed", operation, exitCode: 2 };
  }
  if (operation === "review" && !input.policyId) {
    return { ok: false, error: "policy_id_required", exitCode: 2 };
  }
  return { ok: true };
}

function runOperation(service, operation, input) {
  if (operation === "create") return service.createPolicy(input);
  if (operation === "review") return service.reviewPolicy(Object.assign({ status: "active" }, input));
  if (operation === "list") return service.listPolicies(input);
  return service.evaluateReadiness(input);
}

function summarizeStatuses(policies = []) {
  return asArray(policies).reduce((counts, policy) => {
    const status = cleanString(policy && policy.status, 80) || "missing";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

function projectAutomationFailurePolicySmokeReadback(result = {}, operation = "readiness", input = {}, writeAllowed = false) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const policies = asArray(readback.policies);
  const policy = objectOnly(readback.policy || policies[0]);
  const readiness = objectOnly(readback.readiness || readback);
  const policyBody = objectOnly(policy.policy);
  const rollbackPolicy = objectOnly(policy.rollbackPolicy);
  const failurePolicy = objectOnly(policy.failurePolicy);
  const review = objectOnly(policy.review);
  const statusRows = policies.length ? policies : policy.policyId ? [policy] : [];
  const statusCounts = summarizeStatuses(statusRows);
  const writeOperation = WRITE_OPERATIONS.has(operation);
  const policyStatus = cleanString(
    operation === "readiness"
      ? readback.status || readiness.status || policy.status
      : policy.status || readback.status || readiness.status || (operation === "list" ? "listed" : ""),
    120
  );
  return Object.assign({}, readback, {
    automationFailurePolicyStatus: cleanString(
      readback.ok === false ? readback.error || "failed" : policyStatus || "ready",
      140
    ),
    automationFailurePolicyOk: readback.ok !== false,
    automationFailurePolicyOperation: cleanString(operation, 80),
    automationFailurePolicyWriteOperation: writeOperation,
    automationFailurePolicyWriteAllowed: writeAllowed === true,
    automationFailurePolicyWritesPerformed: writeOperation && writeAllowed === true && readback.ok === true && readback.duplicate !== true,
    automationFailurePolicyDuplicate: readback.duplicate === true,
    automationFailurePolicyWorkspaceId: cleanString(readback.workspaceId || policy.workspaceId || input.workspaceId, 160),
    automationFailurePolicyLearnerId: cleanString(readback.learnerId || policy.learnerId || input.learnerId, 160),
    automationFailurePolicyProgramId: cleanString(readback.programId || policy.programId || input.programId, 160),
    automationFailurePolicyDomainPackId: cleanString(readback.domainPackId || policy.domainPackId || input.domainPackId, 180),
    automationFailurePolicyDomain: cleanString(readback.domain || policy.domain || input.domain, 120),
    automationFailurePolicySubject: cleanString(readback.subject || policy.subject || input.subject, 120),
    automationFailurePolicyHorizon: cleanString(readback.horizon || policy.horizon || input.horizon, 80),
    automationFailurePolicyCount: numberValue(readback.count, policies.length),
    automationFailurePolicyPolicyId: cleanString(policy.policyId || input.policyId, 180),
    automationFailurePolicyPolicyIds: uniqueBoundedStrings(policies.map((item) => item && item.policyId), 24),
    automationFailurePolicyPrivacyClass: cleanString(policy.privacyClass, 80),
    automationFailurePolicyPolicyVersion: cleanString(policy.policyVersion || policyBody.schemaVersion, 120),
    automationFailurePolicyStatuses: uniqueBoundedStrings(Object.keys(statusCounts), 12),
    automationFailurePolicyDraftCount: numberValue(statusCounts.draft, 0),
    automationFailurePolicyActiveCount: numberValue(statusCounts.active, 0),
    automationFailurePolicyArchivedCount: numberValue(statusCounts.archived, 0),
    automationFailurePolicySupersededCount: numberValue(statusCounts.superseded, 0),
    automationFailurePolicyReadyForWritefulAutomationPrerequisite: readiness.readyForWritefulAutomationPrerequisite === true,
    automationFailurePolicyWritefulSchedulingAllowed: readiness.writefulSchedulingAllowed === true || policyBody.writefulSchedulingAllowed === true || failurePolicy.writefulSchedulingAllowed === true,
    automationFailurePolicyMissingRequired: uniqueBoundedStrings(readiness.missingRequired, 12),
    automationFailurePolicyRequiredActions: uniqueBoundedStrings(asArray(readiness.requiredActions).map((item) => item && item.action), 12),
    automationFailurePolicyOwnerReviewRequired: policyBody.ownerReviewRequired !== false || failurePolicy.ownerReviewRequired !== false,
    automationFailurePolicyDigestReviewRequired: policyBody.digestReviewRequired !== false,
    automationFailurePolicyProposalReviewRequired: policyBody.proposalReviewRequired !== false,
    automationFailurePolicyAuditCompletenessRequired: policyBody.auditCompletenessRequired !== false,
    automationFailurePolicyTargetProvisioningRequired: policyBody.targetProvisioningRequired !== false,
    automationFailurePolicyRollbackPolicyRequired: policyBody.rollbackPolicyRequired !== false,
    automationFailurePolicyActionHandoffRequiredBeforeScheduling: policyBody.actionHandoffRequiredBeforeScheduling !== false,
    automationFailurePolicyTransactionalPublishRequired: rollbackPolicy.transactionalPublishRequired !== false,
    automationFailurePolicyRetryRequiresOwner: rollbackPolicy.retryRequiresOwner !== false || failurePolicy.retryRequiresOwner !== false,
    automationFailurePolicyMaxAutomaticRetries: numberValue(failurePolicy.maxAutomaticRetries, numberValue(rollbackPolicy.maxAutomaticRetries, 0)),
    automationFailurePolicyVisibleFailureRequired: failurePolicy.visibleFailureRequired !== false,
    automationFailurePolicyFailureStates: uniqueBoundedStrings(failurePolicy.failureStates, 24),
    automationFailurePolicyRetryActions: uniqueBoundedStrings(failurePolicy.retryActions, 16),
    automationFailurePolicyReviewStatus: cleanString(review.status || policy.status, 80),
    automationFailurePolicyReviewedBy: cleanString(policy.reviewedBy || review.reviewedBy, 160)
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
      error: error.code || "automation_failure_policy_smoke_parse_failed",
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
  const result = projectAutomationFailurePolicySmokeReadback(
    Object.assign({ operation }, runOperation(services.learningAutomationFailurePolicyService, operation, input)),
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
      error: "automation_failure_policy_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  operationFromArgs,
  projectAutomationFailurePolicySmokeReadback,
  runOperation,
  shouldAllowWrite,
  validateOperationInput
};
