"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const OPERATIONS = new Set(["advance"]);
const WRITE_OPERATIONS = new Set(["advance"]);

function argValue(args, name, fallback = "") {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  return String(args[index + 1] || fallback);
}

function firstArgValue(args, names, fallback = "") {
  for (const name of names) {
    const value = argValue(args, name, "");
    if (value) return value;
  }
  return fallback;
}

function hasFlag(args, name) {
  return args.includes(name);
}

function boolArg(args, enabledNames, disabledNames, fallback = false) {
  if (enabledNames.some((name) => hasFlag(args, name))) return true;
  if (disabledNames.some((name) => hasFlag(args, name))) return false;
  return fallback;
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

function boundedNumberArg(args, names, fallback, min = 1, max = 100) {
  const raw = firstArgValue(args, names, "");
  if (raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function parseJsonArg(args, names, fallback = {}) {
  const text = firstArgValue(args, names, "");
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    const wrapped = new Error(`invalid_json:${names[0]}`);
    wrapped.code = "automation_review_advancement_smoke_invalid_json";
    wrapped.option = names[0];
    wrapped.cause = error;
    throw wrapped;
  }
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
  const operation = firstArgValue(args, ["--operation"], "") || "advance";
  if (!OPERATIONS.has(operation)) {
    const error = new Error(`invalid_operation:${operation}`);
    error.code = "automation_review_advancement_smoke_operation_invalid";
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
  return stripUndefined(Object.assign({}, jsonInput, {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], jsonInput.learnerId || jsonInput.learner_id || "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], jsonInput.programId || jsonInput.program_id || ""),
    cycleId: firstArgValue(args, ["--cycle-id", "--cycleId"], jsonInput.cycleId || jsonInput.cycle_id || ""),
    sourcePlanDraftId: firstArgValue(args, ["--source-plan-draft-id", "--sourcePlanDraftId", "--plan-draft-id", "--planDraftId"], jsonInput.sourcePlanDraftId || jsonInput.source_plan_draft_id || jsonInput.planDraftId || jsonInput.plan_draft_id || ""),
    sourceTaskCardId: firstArgValue(args, ["--source-task-card-id", "--sourceTaskCardId", "--task-card-id", "--taskCardId"], jsonInput.sourceTaskCardId || jsonInput.source_task_card_id || jsonInput.taskCardId || jsonInput.task_card_id || ""),
    sourceEvaluationId: firstArgValue(args, ["--source-evaluation-id", "--sourceEvaluationId", "--evaluation-id", "--evaluationId"], jsonInput.sourceEvaluationId || jsonInput.source_evaluation_id || jsonInput.evaluationId || jsonInput.evaluation_id || ""),
    digestId: firstArgValue(args, ["--digest-id", "--digestId"], jsonInput.digestId || jsonInput.digest_id || ""),
    handoffId: firstArgValue(args, ["--handoff-id", "--handoffId"], jsonInput.handoffId || jsonInput.handoff_id || ""),
    proposalId: firstArgValue(args, ["--proposal-id", "--proposalId"], jsonInput.proposalId || jsonInput.proposal_id || ""),
    planDraftId: firstArgValue(args, ["--next-plan-draft-id", "--nextPlanDraftId"], jsonInput.planDraftId || jsonInput.plan_draft_id || ""),
    selectedItemId: firstArgValue(args, ["--selected-item-id", "--selectedItemId"], jsonInput.selectedItemId || jsonInput.selected_item_id || ""),
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
    prepareReviewPacket: boolArg(args, ["--prepare-review-packet", "--prepareReviewPacket"], ["--no-prepare-review-packet", "--noPrepareReviewPacket"], jsonInput.prepareReviewPacket !== false && jsonInput.prepare_review_packet !== false),
    reviewDigest: boolArg(args, ["--review-digest", "--reviewDigest"], ["--no-review-digest", "--noReviewDigest"], jsonInput.reviewDigest !== false && jsonInput.review_digest !== false),
    ensureFailurePolicy: boolArg(args, ["--ensure-failure-policy", "--ensureFailurePolicy"], ["--no-ensure-failure-policy", "--noEnsureFailurePolicy"], jsonInput.ensureFailurePolicy !== false && jsonInput.ensure_failure_policy !== false),
    createHandoff: boolArg(args, ["--create-handoff", "--createHandoff"], ["--no-create-handoff", "--noCreateHandoff"], jsonInput.createHandoff !== false && jsonInput.create_handoff !== false),
    deliverHandoff: boolArg(args, ["--deliver-handoff", "--deliverHandoff"], ["--no-deliver-handoff", "--noDeliverHandoff"], jsonInput.deliverHandoff === true || jsonInput.deliver_handoff === true),
    attemptExecution: boolArg(args, ["--attempt-execution", "--attemptExecution"], ["--no-attempt-execution", "--noAttemptExecution"], jsonInput.attemptExecution === true || jsonInput.attempt_execution === true),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy", "--created-by", "--createdBy"], jsonInput.requestedBy || jsonInput.requested_by || jsonInput.createdBy || jsonInput.created_by || "")
  }));
}

function validateOperationInput(operation, input, allowWrite) {
  if (!input.workspaceId) return { ok: false, error: "workspace_id_required", exitCode: 2 };
  if (WRITE_OPERATIONS.has(operation) && !allowWrite) {
    return { ok: false, error: "automation_review_advancement_smoke_write_not_allowed", operation, exitCode: 2 };
  }
  return { ok: true };
}

async function runOperation(service, operation, input) {
  if (operation === "advance") return service.advance(input);
  return { ok: false, error: "automation_review_advancement_smoke_operation_invalid" };
}

function projectAutomationReviewAdvancementSmokeReadback(result = {}, operation = "advance", input = {}, writeAllowed = false) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const summary = objectOnly(readback.summary);
  const digest = objectOnly(readback.digest);
  const policy = objectOnly(readback.failurePolicy);
  const handoff = objectOnly(readback.handoff);
  const execution = objectOnly(readback.execution);
  const executionRecord = objectOnly(execution.execution);
  const stages = asArray(readback.stages);
  const writeOperation = WRITE_OPERATIONS.has(operation);
  return Object.assign({}, readback, {
    automationReviewAdvancementStatus: cleanString(readback.ok === false ? readback.error || "failed" : readback.status || "pass", 160),
    automationReviewAdvancementOk: readback.ok !== false,
    automationReviewAdvancementOperation: cleanString(operation, 80),
    automationReviewAdvancementWriteOperation: writeOperation,
    automationReviewAdvancementWriteAllowed: writeAllowed === true,
    automationReviewAdvancementWritesPerformed: writeOperation && writeAllowed === true && readback.writesPerformed === true,
    automationReviewAdvancementPublishPerformed: readback.publishPerformed === true || summary.publishPerformed === true,
    automationReviewAdvancementSchedulerStarted: readback.schedulerStarted === true || summary.schedulerStarted === true,
    automationReviewAdvancementWorkspaceId: cleanString(input.workspaceId, 160),
    automationReviewAdvancementLearnerId: cleanString(input.learnerId, 160),
    automationReviewAdvancementProgramId: cleanString(input.programId, 160),
    automationReviewAdvancementDomainPackId: cleanString(input.domainPackId, 180),
    automationReviewAdvancementDomain: cleanString(input.domain, 120),
    automationReviewAdvancementSubject: cleanString(input.subject, 120),
    automationReviewAdvancementHorizon: cleanString(input.horizon, 80),
    automationReviewAdvancementSelectedCycleId: cleanString(summary.selectedCycleId || input.cycleId, 180),
    automationReviewAdvancementSelectedTaskCardId: cleanString(summary.selectedTaskCardId || input.sourceTaskCardId, 180),
    automationReviewAdvancementProposalId: cleanString(summary.proposalId || input.proposalId, 180),
    automationReviewAdvancementProposalStatus: cleanString(summary.proposalStatus, 100),
    automationReviewAdvancementDigestId: cleanString(summary.digestId || digest.digestId || input.digestId, 180),
    automationReviewAdvancementDigestStatus: cleanString(summary.digestStatus || digest.status, 100),
    automationReviewAdvancementPolicyId: cleanString(summary.policyId || policy.policyId, 180),
    automationReviewAdvancementPolicyStatus: cleanString(summary.policyStatus || policy.status, 100),
    automationReviewAdvancementHandoffId: cleanString(summary.handoffId || handoff.handoffId, 180),
    automationReviewAdvancementHandoffDeliveryStatus: cleanString(summary.handoffDeliveryStatus || handoff.deliveryStatus, 120),
    automationReviewAdvancementExecutionId: cleanString(summary.executionId || executionRecord.executionId, 180),
    automationReviewAdvancementExecutionStatus: cleanString(summary.executionStatus || executionRecord.status, 120),
    automationReviewAdvancementStageNames: asArray(stages).map((stage) => cleanString(stage && stage.name, 100)).filter(Boolean),
    automationReviewAdvancementStageCount: numberValue(stages.length, 0),
    automationReviewAdvancementFailedStageNames: asArray(stages).filter((stage) => stage && stage.ok === false).map((stage) => cleanString(stage.name, 100)).filter(Boolean),
    automationReviewAdvancementPrivacyClass: cleanString(readback.privacyClass, 80),
    automationReviewAdvancementGatewayBoundary: cleanString(summary.gatewayBoundary, 180)
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
      error: error.code || "automation_review_advancement_smoke_parse_failed",
      option: error.option || "",
      operation: error.operation || ""
    }, pretty));
    process.exitCode = 2;
    return;
  }
  const allowWrite = shouldAllowWrite(args);
  const validation = validateOperationInput(operation, input, allowWrite);
  if (!validation.ok) {
    process.stdout.write(formatResult(validation, pretty));
    process.exitCode = validation.exitCode || 1;
    return;
  }

  const services = createServices(readEnv());
  const service = services.learningAutomationReviewAdvancementService;
  if (!service || typeof service.advance !== "function") {
    const result = { ok: false, error: "automation_review_advancement_service_unavailable" };
    process.stdout.write(formatResult(result, pretty));
    process.exitCode = 1;
    return;
  }
  const result = await runOperation(service, operation, input);
  const projected = projectAutomationReviewAdvancementSmokeReadback(result, operation, input, allowWrite);
  process.stdout.write(formatResult(projected, pretty));
  if (!projected.ok) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(`${JSON.stringify({ ok: false, error: error.message || String(error) })}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  operationFromArgs,
  projectAutomationReviewAdvancementSmokeReadback,
  shouldAllowWrite,
  validateOperationInput
};
