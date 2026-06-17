"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const WRITE_OPERATIONS = new Set(["create", "review"]);
const OPERATIONS = new Set(["list", "get", "create", "review"]);

function argValue(args, name, fallback = "") {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  return String(args[index + 1] || fallback);
}

function hasFlag(args, name) {
  return args.includes(name);
}

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function uniqueBoundedStrings(values = [], maxItems = 24) {
  return uniqueStrings(asArray(values).map((value) => cleanString(value, 160))).slice(0, maxItems);
}

function numberValue(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
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
    wrapped.code = "automation_digest_smoke_invalid_json";
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

function collectCsvValues(args, names) {
  return firstArgValue(args, names, "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map((value) => String(value || "").trim()).filter(Boolean)));
}

function collectIds(args, repeatedNames, csvNames) {
  return uniqueStrings([
    ...collectRepeatedValues(args, repeatedNames),
    ...collectCsvValues(args, csvNames)
  ]);
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

function operationFromArgs(args) {
  const explicit = firstArgValue(args, ["--operation"], "");
  const operation = explicit
    || (hasFlag(args, "--create") ? "create" : hasFlag(args, "--review") ? "review" : hasFlag(args, "--get") ? "get" : "list");
  if (!OPERATIONS.has(operation)) {
    const error = new Error(`invalid_operation:${operation}`);
    error.code = "automation_digest_smoke_operation_invalid";
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
  const targetNodeIds = collectIds(args, ["--target-node-id", "--targetNodeId"], ["--target-node-ids", "--targetNodeIds"]);
  const sourceTargetNodeIds = collectIds(args, ["--source-target-node-id", "--sourceTargetNodeId"], ["--source-target-node-ids", "--sourceTargetNodeIds"]);
  const selectedCandidateIds = collectIds(args, ["--selected-candidate-id", "--selectedCandidateId"], ["--selected-candidate-ids", "--selectedCandidateIds"]);
  const status = firstArgValue(args, ["--status", "--review-status", "--reviewStatus"], jsonInput.status || jsonInput.reviewStatus || jsonInput.review_status || "");
  return stripUndefined(Object.assign({}, jsonInput, {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], jsonInput.learnerId || jsonInput.learner_id || "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], jsonInput.programId || jsonInput.program_id || ""),
    digestId: firstArgValue(args, ["--digest-id", "--digestId"], jsonInput.digestId || jsonInput.digest_id || ""),
    proposalId: firstArgValue(args, ["--proposal-id", "--proposalId"], jsonInput.proposalId || jsonInput.proposal_id || ""),
    planDraftId: firstArgValue(args, ["--plan-draft-id", "--planDraftId"], jsonInput.planDraftId || jsonInput.plan_draft_id || ""),
    selectedItemId: firstArgValue(args, ["--selected-item-id", "--selectedItemId", "--item-id", "--itemId"], jsonInput.selectedItemId || jsonInput.selected_item_id || jsonInput.itemId || jsonInput.item_id || ""),
    profileDeltaId: firstArgValue(args, ["--profile-delta-id", "--profileDeltaId"], jsonInput.profileDeltaId || jsonInput.profile_delta_id || ""),
    evidenceId: firstArgValue(args, ["--evidence-id", "--evidenceId"], jsonInput.evidenceId || jsonInput.evidence_id || ""),
    correctionId: firstArgValue(args, ["--correction-id", "--correctionId"], jsonInput.correctionId || jsonInput.correction_id || ""),
    sourceId: firstArgValue(args, ["--source-id", "--sourceId"], jsonInput.sourceId || jsonInput.source_id || ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], jsonInput.domainPackId || jsonInput.domain_pack_id || ""),
    domain: firstArgValue(args, ["--domain"], jsonInput.domain || ""),
    subject: firstArgValue(args, ["--subject"], jsonInput.subject || ""),
    horizon: firstArgValue(args, ["--horizon"], jsonInput.horizon || "daily_plan") || "daily_plan",
    status: status || undefined,
    limit: boundedNumberArg(args, ["--limit"], jsonInput.limit || 20, 1, 100),
    auditLimit: boundedNumberArg(args, ["--audit-limit", "--auditLimit"], jsonInput.auditLimit || jsonInput.audit_limit || 20, 1, 100),
    targetNodeIds: targetNodeIds.length ? targetNodeIds : jsonInput.targetNodeIds || jsonInput.target_node_ids,
    sourceTargetNodeIds: sourceTargetNodeIds.length ? sourceTargetNodeIds : jsonInput.sourceTargetNodeIds || jsonInput.source_target_node_ids,
    selectedCandidateIds: selectedCandidateIds.length ? selectedCandidateIds : jsonInput.selectedCandidateIds || jsonInput.selected_candidate_ids,
    note: firstArgValue(args, ["--note", "--summary", "--reason"], jsonInput.note || jsonInput.summary || jsonInput.reason || ""),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy", "--created-by", "--createdBy", "--reviewed-by", "--reviewedBy"], jsonInput.requestedBy || jsonInput.requested_by || jsonInput.createdBy || jsonInput.created_by || jsonInput.reviewedBy || jsonInput.reviewed_by || "")
  }));
}

function validateOperationInput(operation, input, allowWrite) {
  if (!input.workspaceId) return { ok: false, error: "workspace_id_required", exitCode: 2 };
  if (WRITE_OPERATIONS.has(operation) && !allowWrite) {
    return { ok: false, error: "automation_digest_smoke_write_not_allowed", operation, exitCode: 2 };
  }
  if ((operation === "get" || operation === "review") && !input.digestId) {
    return { ok: false, error: "digest_id_required", exitCode: 2 };
  }
  return { ok: true };
}

function runOperation(service, operation, input) {
  if (operation === "create") return service.createDigest(input);
  if (operation === "review") return service.reviewDigest(Object.assign({ status: "reviewed" }, input));
  if (operation === "get") return service.getDigest(input);
  return service.listDigests(input);
}

function summarizeStatuses(digests = []) {
  return asArray(digests).reduce((counts, digest) => {
    const status = cleanString(digest && digest.status, 80) || "missing";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

function projectAutomationDigestSmokeReadback(result = {}, operation = "list", input = {}, writeAllowed = false) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const digests = asArray(readback.digests);
  const digest = objectOnly(readback.digest || digests[0]);
  const summary = objectOnly(digest.summary);
  const sourcePolicy = objectOnly(digest.sourcePolicy);
  const review = objectOnly(digest.review);
  const statusCounts = summarizeStatuses(digests.length ? digests : digest.digestId ? [digest] : []);
  const writeOperation = WRITE_OPERATIONS.has(operation);
  const requiredActions = asArray(digest.requiredActions);
  const candidates = asArray(digest.candidates);
  const blocked = asArray(digest.blocked);
  return Object.assign({}, readback, {
    automationDigestStatus: cleanString(
      readback.ok === false ? readback.error || "failed" : digest.status || (operation === "list" ? "listed" : "pass"),
      140
    ),
    automationDigestOk: readback.ok !== false,
    automationDigestOperation: cleanString(operation, 80),
    automationDigestWriteOperation: writeOperation,
    automationDigestWriteAllowed: writeAllowed === true,
    automationDigestWritesPerformed: writeOperation && writeAllowed === true && readback.ok === true && readback.duplicate !== true,
    automationDigestDuplicate: readback.duplicate === true,
    automationDigestWorkspaceId: cleanString(readback.workspaceId || digest.workspaceId || input.workspaceId, 160),
    automationDigestLearnerId: cleanString(readback.learnerId || digest.learnerId || input.learnerId, 160),
    automationDigestProgramId: cleanString(digest.programId || input.programId, 160),
    automationDigestDomainPackId: cleanString(digest.domainPackId || input.domainPackId, 180),
    automationDigestDomain: cleanString(digest.domain || input.domain, 120),
    automationDigestSubject: cleanString(digest.subject || input.subject, 120),
    automationDigestHorizon: cleanString(digest.horizon || input.horizon, 80),
    automationDigestCount: numberValue(readback.count, digests.length),
    automationDigestDigestId: cleanString(digest.digestId || input.digestId, 180),
    automationDigestDigestIds: uniqueBoundedStrings(digests.map((item) => item && item.digestId)),
    automationDigestStatuses: uniqueBoundedStrings(Object.keys(statusCounts), 12),
    automationDigestPendingCount: numberValue(statusCounts.pending, 0),
    automationDigestReviewedCount: numberValue(statusCounts.reviewed, 0),
    automationDigestArchivedCount: numberValue(statusCounts.archived, 0),
    automationDigestSupersededCount: numberValue(statusCounts.superseded, 0),
    automationDigestPrivacyClass: cleanString(digest.privacyClass, 80),
    automationDigestDryRun: readback.dryRun === true || summary.dryRun === true || sourcePolicy.dryRun === true,
    automationDigestWritePlanned: readback.writePlanned === true || summary.writePlanned === true,
    automationDigestSourceWritesPerformed: readback.writesPerformed === true || summary.writesPerformed === true,
    automationDigestPublishPlanned: readback.publishPlanned === true || summary.publishPlanned === true,
    automationDigestPublishRequiresOwnerAction: readback.publishRequiresOwnerAction === true || requiredActions.length > 0,
    automationDigestInspectedCount: numberValue(summary.inspected, candidates.length),
    automationDigestWouldPublishCount: numberValue(summary.wouldPublish, 0),
    automationDigestBlockedCount: numberValue(summary.blocked, blocked.length),
    automationDigestSkippedCount: numberValue(summary.skipped, 0),
    automationDigestRequiredActionCount: numberValue(summary.requiredActions, requiredActions.length),
    automationDigestCandidateIds: uniqueBoundedStrings(candidates.map((item) => item && item.candidateId), 24),
    automationDigestRequiredActionEndpoints: uniqueBoundedStrings(requiredActions.map((item) => item && item.endpoint), 12),
    automationDigestReviewedBy: cleanString(digest.reviewedBy || review.reviewedBy || input.requestedBy, 160),
    automationDigestReviewedAt: cleanString(digest.reviewedAt || review.reviewedAt, 80),
    automationDigestReviewStatus: cleanString(review.status || digest.status, 80),
    automationDigestSourcePolicySchemaVersion: cleanString(sourcePolicy.schemaVersion, 120)
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
      error: error.code || "automation_digest_smoke_parse_failed",
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
  const result = projectAutomationDigestSmokeReadback(
    Object.assign({ operation }, runOperation(services.learningAutomationDigestService, operation, input)),
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
      error: "automation_digest_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  operationFromArgs,
  projectAutomationDigestSmokeReadback,
  runOperation,
  shouldAllowWrite,
  validateOperationInput
};
