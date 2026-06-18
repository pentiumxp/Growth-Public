"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const WRITE_OPERATIONS = new Set(["prepare"]);
const OPERATIONS = new Set(["prepare"]);

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

function numberValue(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function firstArgValue(args, names, fallback = "") {
  for (const name of names) {
    const value = argValue(args, name, "");
    if (value) return value;
  }
  return fallback;
}

function boolArg(args, enabledNames, disabledNames, fallback = false) {
  if (enabledNames.some((name) => hasFlag(args, name))) return true;
  if (disabledNames.some((name) => hasFlag(args, name))) return false;
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
    wrapped.code = "automation_cycle_closure_smoke_invalid_json";
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
  const operation = firstArgValue(args, ["--operation"], "") || "prepare";
  if (!OPERATIONS.has(operation)) {
    const error = new Error(`invalid_operation:${operation}`);
    error.code = "automation_cycle_closure_smoke_operation_invalid";
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
  const allowedCardRoles = collectIds(args, ["--allowed-card-role", "--allowedCardRole"], ["--allowed-card-roles", "--allowedCardRoles"]);
  return stripUndefined(Object.assign({}, jsonInput, {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], jsonInput.learnerId || jsonInput.learner_id || "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], jsonInput.programId || jsonInput.program_id || ""),
    cycleId: firstArgValue(args, ["--cycle-id", "--cycleId"], jsonInput.cycleId || jsonInput.cycle_id || ""),
    sourcePlanDraftId: firstArgValue(args, ["--source-plan-draft-id", "--sourcePlanDraftId", "--plan-draft-id", "--planDraftId"], jsonInput.sourcePlanDraftId || jsonInput.source_plan_draft_id || jsonInput.planDraftId || jsonInput.plan_draft_id || ""),
    sourceTaskCardId: firstArgValue(args, ["--source-task-card-id", "--sourceTaskCardId", "--task-card-id", "--taskCardId"], jsonInput.sourceTaskCardId || jsonInput.source_task_card_id || jsonInput.taskCardId || jsonInput.task_card_id || ""),
    sourceEvaluationId: firstArgValue(args, ["--source-evaluation-id", "--sourceEvaluationId", "--evaluation-id", "--evaluationId"], jsonInput.sourceEvaluationId || jsonInput.source_evaluation_id || jsonInput.evaluationId || jsonInput.evaluation_id || ""),
    profileDeltaId: firstArgValue(args, ["--profile-delta-id", "--profileDeltaId"], jsonInput.profileDeltaId || jsonInput.profile_delta_id || ""),
    evidenceId: firstArgValue(args, ["--evidence-id", "--evidenceId"], jsonInput.evidenceId || jsonInput.evidence_id || ""),
    correctionId: firstArgValue(args, ["--correction-id", "--correctionId"], jsonInput.correctionId || jsonInput.correction_id || ""),
    sourceId: firstArgValue(args, ["--source-id", "--sourceId"], jsonInput.sourceId || jsonInput.source_id || ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], jsonInput.domainPackId || jsonInput.domain_pack_id || ""),
    domain: firstArgValue(args, ["--domain"], jsonInput.domain || ""),
    subject: firstArgValue(args, ["--subject"], jsonInput.subject || ""),
    horizon: firstArgValue(args, ["--horizon"], jsonInput.horizon || "daily_plan") || "daily_plan",
    limit: boundedNumberArg(args, ["--limit"], jsonInput.limit || 6, 1, 100),
    auditLimit: boundedNumberArg(args, ["--audit-limit", "--auditLimit"], jsonInput.auditLimit || jsonInput.audit_limit || 20, 1, 100),
    availableMinutes: boundedNumberArg(args, ["--available-minutes", "--availableMinutes"], jsonInput.availableMinutes || jsonInput.available_minutes || 15, 1, 60),
    targetNodeIds: targetNodeIds.length ? targetNodeIds : jsonInput.targetNodeIds || jsonInput.target_node_ids,
    sourceTargetNodeIds: sourceTargetNodeIds.length ? sourceTargetNodeIds : jsonInput.sourceTargetNodeIds || jsonInput.source_target_node_ids,
    selectedCandidateIds: selectedCandidateIds.length ? selectedCandidateIds : jsonInput.selectedCandidateIds || jsonInput.selected_candidate_ids,
    allowedCardRoles: allowedCardRoles.length ? allowedCardRoles : jsonInput.allowedCardRoles || jsonInput.allowed_card_roles,
    autoSelectCompletedCycle: boolArg(args, ["--auto-select-completed-cycle", "--autoSelectCompletedCycle"], ["--no-auto-select-completed-cycle", "--noAutoSelectCompletedCycle"], jsonInput.autoSelectCompletedCycle || jsonInput.auto_select_completed_cycle || false),
    autoSelectLatestCompletedCycle: boolArg(args, ["--auto-select-latest-completed-cycle", "--autoSelectLatestCompletedCycle"], ["--no-auto-select-latest-completed-cycle", "--noAutoSelectLatestCompletedCycle"], jsonInput.autoSelectLatestCompletedCycle !== false && jsonInput.auto_select_latest_completed_cycle !== false),
    acceptProposal: boolArg(args, ["--accept-proposal", "--acceptProposal"], ["--no-accept-proposal", "--noAcceptProposal"], jsonInput.acceptProposal !== false && jsonInput.accept_proposal !== false),
    createDigest: boolArg(args, ["--create-digest", "--createDigest"], ["--no-create-digest", "--noCreateDigest"], jsonInput.createDigest !== false && jsonInput.create_digest !== false),
    reviewDigest: boolArg(args, ["--review-digest", "--reviewDigest"], ["--no-review-digest", "--noReviewDigest"], jsonInput.reviewDigest === true || jsonInput.review_digest === true),
    createHandoff: boolArg(args, ["--create-handoff", "--createHandoff"], ["--no-create-handoff", "--noCreateHandoff"], jsonInput.createHandoff === true || jsonInput.create_handoff === true),
    deliverHandoff: boolArg(args, ["--deliver-handoff", "--deliverHandoff"], ["--no-deliver-handoff", "--noDeliverHandoff"], jsonInput.deliverHandoff === true || jsonInput.deliver_handoff === true),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy", "--created-by", "--createdBy"], jsonInput.requestedBy || jsonInput.requested_by || jsonInput.createdBy || jsonInput.created_by || "")
  }));
}

function validateOperationInput(operation, input, allowWrite) {
  if (!input.workspaceId) return { ok: false, error: "workspace_id_required", exitCode: 2 };
  if (WRITE_OPERATIONS.has(operation) && !allowWrite) {
    return { ok: false, error: "automation_cycle_closure_smoke_write_not_allowed", operation, exitCode: 2 };
  }
  return { ok: true };
}

async function runOperation(service, operation, input) {
  if (operation === "prepare") return service.prepareReviewPacket(input);
  return { ok: false, error: "automation_cycle_closure_smoke_operation_invalid" };
}

function projectAutomationCycleClosureSmokeReadback(result = {}, operation = "prepare", input = {}, writeAllowed = false) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const summary = objectOnly(readback.summary);
  const selectedCycle = objectOnly(readback.selectedCycle);
  const proposal = objectOnly(readback.proposal);
  const digest = objectOnly(readback.digest);
  const handoff = objectOnly(readback.handoff);
  const stages = asArray(readback.stages);
  const writeOperation = WRITE_OPERATIONS.has(operation);
  return Object.assign({}, readback, {
    automationCycleClosureStatus: cleanString(readback.ok === false ? readback.error || "failed" : readback.status || "pass", 140),
    automationCycleClosureOk: readback.ok !== false,
    automationCycleClosureOperation: cleanString(operation, 80),
    automationCycleClosureWriteOperation: writeOperation,
    automationCycleClosureWriteAllowed: writeAllowed === true,
    automationCycleClosureWritesPerformed: writeOperation && writeAllowed === true && readback.writesPerformed === true,
    automationCycleClosurePublishPerformed: readback.publishPerformed === true || summary.publishPerformed === true,
    automationCycleClosureSchedulerStarted: readback.schedulerStarted === true || summary.schedulerStarted === true,
    automationCycleClosureWorkspaceId: cleanString(proposal.workspaceId || digest.workspaceId || input.workspaceId, 160),
    automationCycleClosureLearnerId: cleanString(proposal.learnerId || digest.learnerId || input.learnerId, 160),
    automationCycleClosureProgramId: cleanString(proposal.programId || digest.programId || input.programId, 160),
    automationCycleClosureDomainPackId: cleanString(proposal.domainPackId || digest.domainPackId || input.domainPackId, 180),
    automationCycleClosureDomain: cleanString(proposal.domain || digest.domain || input.domain, 120),
    automationCycleClosureSubject: cleanString(proposal.subject || digest.subject || input.subject, 120),
    automationCycleClosureHorizon: cleanString(proposal.horizon || digest.horizon || input.horizon, 80),
    automationCycleClosureSelectedCycleId: cleanString(summary.selectedCycleId || selectedCycle.cycleId || input.cycleId, 180),
    automationCycleClosureSelectedTaskCardId: cleanString(summary.selectedTaskCardId || selectedCycle.taskCardId || input.sourceTaskCardId, 180),
    automationCycleClosureProposalId: cleanString(summary.proposalId || proposal.proposalId, 180),
    automationCycleClosureProposalStatus: cleanString(summary.proposalStatus || proposal.status, 100),
    automationCycleClosureDigestId: cleanString(summary.digestId || digest.digestId, 180),
    automationCycleClosureDigestStatus: cleanString(summary.digestStatus || digest.status, 100),
    automationCycleClosureHandoffId: cleanString(summary.handoffId || handoff.handoffId, 180),
    automationCycleClosureHandoffDeliveryStatus: cleanString(summary.handoffDeliveryStatus || handoff.deliveryStatus, 120),
    automationCycleClosureStageNames: asArray(stages).map((stage) => cleanString(stage && stage.name, 100)).filter(Boolean),
    automationCycleClosureStageCount: numberValue(stages.length, 0),
    automationCycleClosureFailedStageNames: asArray(stages).filter((stage) => stage && stage.ok === false).map((stage) => cleanString(stage.name, 100)).filter(Boolean),
    automationCycleClosurePrivacyClass: cleanString(readback.privacyClass, 80),
    automationCycleClosureGatewayBoundary: cleanString(summary.gatewayBoundary, 180)
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
      error: error.code || "automation_cycle_closure_smoke_parse_failed",
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
  const result = projectAutomationCycleClosureSmokeReadback(
    Object.assign({ operation }, await runOperation(services.learningAutomationCycleClosureService, operation, input)),
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
      error: "automation_cycle_closure_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  operationFromArgs,
  projectAutomationCycleClosureSmokeReadback,
  runOperation,
  shouldAllowWrite,
  validateOperationInput
};
