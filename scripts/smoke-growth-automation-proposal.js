"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const WRITE_OPERATIONS = new Set(["create", "review", "publish"]);
const OPERATIONS = new Set(["list", "create", "review", "publish"]);

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
    wrapped.code = "automation_proposal_smoke_invalid_json";
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
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
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
    || (hasFlag(args, "--create") ? "create" : hasFlag(args, "--review") ? "review" : hasFlag(args, "--publish") ? "publish" : "list");
  if (!OPERATIONS.has(operation)) {
    const error = new Error(`invalid_operation:${operation}`);
    error.code = "automation_proposal_smoke_operation_invalid";
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
  const allowedCardRoles = collectIds(args, ["--allowed-card-role", "--allowedCardRole"], ["--allowed-card-roles", "--allowedCardRoles"]);
  const status = firstArgValue(args, ["--status", "--review-status", "--reviewStatus"], jsonInput.status || jsonInput.reviewStatus || jsonInput.review_status || "");
  return stripUndefined(Object.assign({}, jsonInput, {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], jsonInput.learnerId || jsonInput.learner_id || "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], jsonInput.programId || jsonInput.program_id || ""),
    proposalId: firstArgValue(args, ["--proposal-id", "--proposalId"], jsonInput.proposalId || jsonInput.proposal_id || ""),
    planDraftId: firstArgValue(args, ["--plan-draft-id", "--planDraftId"], jsonInput.planDraftId || jsonInput.plan_draft_id || ""),
    selectedItemId: firstArgValue(args, ["--selected-item-id", "--selectedItemId", "--item-id", "--itemId"], jsonInput.selectedItemId || jsonInput.selected_item_id || jsonInput.itemId || jsonInput.item_id || ""),
    sourcePlanDraftId: firstArgValue(args, ["--source-plan-draft-id", "--sourcePlanDraftId"], jsonInput.sourcePlanDraftId || jsonInput.source_plan_draft_id || ""),
    sourceTaskCardId: firstArgValue(args, ["--source-task-card-id", "--sourceTaskCardId"], jsonInput.sourceTaskCardId || jsonInput.source_task_card_id || ""),
    sourceEvaluationId: firstArgValue(args, ["--source-evaluation-id", "--sourceEvaluationId"], jsonInput.sourceEvaluationId || jsonInput.source_evaluation_id || ""),
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
    availableMinutes: boundedNumberArg(args, ["--available-minutes", "--availableMinutes"], jsonInput.availableMinutes || jsonInput.available_minutes || 15, 1, 60),
    targetNodeIds: targetNodeIds.length ? targetNodeIds : jsonInput.targetNodeIds || jsonInput.target_node_ids,
    sourceTargetNodeIds: sourceTargetNodeIds.length ? sourceTargetNodeIds : jsonInput.sourceTargetNodeIds || jsonInput.source_target_node_ids,
    allowedCardRoles: allowedCardRoles.length ? allowedCardRoles : jsonInput.allowedCardRoles || jsonInput.allowed_card_roles,
    generationKey: firstArgValue(args, ["--generation-key", "--generationKey"], jsonInput.generationKey || jsonInput.generation_key || ""),
    cardSchemaVersion: firstArgValue(args, ["--card-schema-version", "--cardSchemaVersion"], jsonInput.cardSchemaVersion || jsonInput.card_schema_version || ""),
    note: firstArgValue(args, ["--note", "--summary", "--reason"], jsonInput.note || jsonInput.summary || jsonInput.reason || ""),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy", "--created-by", "--createdBy", "--reviewed-by", "--reviewedBy"], jsonInput.requestedBy || jsonInput.requested_by || jsonInput.createdBy || jsonInput.created_by || jsonInput.reviewedBy || jsonInput.reviewed_by || "")
  }));
}

function hasCreateSource(input = {}) {
  return Boolean(
    input.sourcePlanDraftId
    || input.sourceTaskCardId
    || input.sourceEvaluationId
    || input.profileDeltaId
    || input.evidenceId
    || input.sourceId
  );
}

function validateOperationInput(operation, input, allowWrite) {
  if (!input.workspaceId) return { ok: false, error: "workspace_id_required", exitCode: 2 };
  if (WRITE_OPERATIONS.has(operation) && !allowWrite) {
    return { ok: false, error: "automation_proposal_smoke_write_not_allowed", operation, exitCode: 2 };
  }
  if ((operation === "review" || operation === "publish") && !input.proposalId) {
    return { ok: false, error: "proposal_id_required", operation, exitCode: 2 };
  }
  if (operation === "create" && !hasCreateSource(input)) {
    return { ok: false, error: "source_cycle_required", operation, exitCode: 2 };
  }
  return { ok: true };
}

async function runOperation(service, operation, input) {
  if (operation === "create") return service.createProposal(input);
  if (operation === "review") return service.reviewProposal(Object.assign({ status: "accepted" }, input));
  if (operation === "publish") return service.publishAcceptedProposal(input);
  return service.listProposals(input);
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
      error: error.code || "automation_proposal_smoke_parse_failed",
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
  const result = await runOperation(services.learningAutomationProposalService, operation, input);
  process.stdout.write(formatResult(Object.assign({ operation }, result), pretty));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "automation_proposal_smoke_failed",
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
