"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const OPERATIONS = new Set(["plan", "action-plan"]);

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

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function numberValue(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function parseJsonArg(args, names, fallback = {}) {
  const text = firstArgValue(args, names, "");
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    const wrapped = new Error(`invalid_json:${names[0]}`);
    wrapped.code = "automation_closed_loop_action_plan_smoke_invalid_json";
    wrapped.option = names[0];
    wrapped.cause = error;
    throw wrapped;
  }
}

function boundedNumberArg(args, names, fallback, min = 1, max = 100) {
  const raw = firstArgValue(args, names, "");
  if (!raw) return fallback;
  const value = Number(raw);
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
  const operation = firstArgValue(args, ["--operation"], "") || "plan";
  if (!OPERATIONS.has(operation)) {
    const error = new Error(`invalid_operation:${operation}`);
    error.code = "automation_closed_loop_action_plan_smoke_operation_invalid";
    error.operation = operation;
    throw error;
  }
  return operation === "action-plan" ? "plan" : operation;
}

function shouldAllowWrite(args) {
  return hasFlag(args, "--allow-write") || hasFlag(args, "--allowWrite");
}

function inputFromArgs(args) {
  const jsonInput = parseJsonArg(args, ["--input-json", "--inputJson"], {});
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], jsonInput.workspaceId || jsonInput.workspace_id || "");
  const targetNodeIds = collectIds(args, ["--target-node-id", "--targetNodeId"], ["--target-node-ids", "--targetNodeIds"]);
  const sourceTargetNodeIds = collectIds(args, ["--source-target-node-id", "--sourceTargetNodeId"], ["--source-target-node-ids", "--sourceTargetNodeIds"]);
  return stripUndefined(Object.assign({}, jsonInput, {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], jsonInput.learnerId || jsonInput.learner_id || "") || workspaceId,
    displayName: firstArgValue(args, ["--display-name", "--displayName", "--label"], jsonInput.displayName || jsonInput.display_name || jsonInput.label || ""),
    label: firstArgValue(args, ["--label"], jsonInput.label || jsonInput.displayName || jsonInput.display_name || ""),
    programId: firstArgValue(args, ["--program-id", "--programId"], jsonInput.programId || jsonInput.program_id || ""),
    cycleId: firstArgValue(args, ["--cycle-id", "--cycleId"], jsonInput.cycleId || jsonInput.cycle_id || ""),
    sourcePlanDraftId: firstArgValue(args, ["--source-plan-draft-id", "--sourcePlanDraftId", "--plan-draft-id", "--planDraftId"], jsonInput.sourcePlanDraftId || jsonInput.source_plan_draft_id || jsonInput.planDraftId || jsonInput.plan_draft_id || ""),
    sourceTaskCardId: firstArgValue(args, ["--source-task-card-id", "--sourceTaskCardId", "--task-card-id", "--taskCardId"], jsonInput.sourceTaskCardId || jsonInput.source_task_card_id || jsonInput.taskCardId || jsonInput.task_card_id || ""),
    sourceEvaluationId: firstArgValue(args, ["--source-evaluation-id", "--sourceEvaluationId", "--evaluation-id", "--evaluationId"], jsonInput.sourceEvaluationId || jsonInput.source_evaluation_id || jsonInput.evaluationId || jsonInput.evaluation_id || ""),
    profileDeltaId: firstArgValue(args, ["--profile-delta-id", "--profileDeltaId"], jsonInput.profileDeltaId || jsonInput.profile_delta_id || ""),
    evidenceId: firstArgValue(args, ["--evidence-id", "--evidenceId"], jsonInput.evidenceId || jsonInput.evidence_id || ""),
    correctionId: firstArgValue(args, ["--correction-id", "--correctionId"], jsonInput.correctionId || jsonInput.correction_id || ""),
    sourceId: firstArgValue(args, ["--source-id", "--sourceId"], jsonInput.sourceId || jsonInput.source_id || ""),
    digestId: firstArgValue(args, ["--digest-id", "--digestId"], jsonInput.digestId || jsonInput.digest_id || ""),
    handoffId: firstArgValue(args, ["--handoff-id", "--handoffId"], jsonInput.handoffId || jsonInput.handoff_id || ""),
    proposalId: firstArgValue(args, ["--proposal-id", "--proposalId"], jsonInput.proposalId || jsonInput.proposal_id || ""),
    selectedItemId: firstArgValue(args, ["--selected-item-id", "--selectedItemId"], jsonInput.selectedItemId || jsonInput.selected_item_id || ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], jsonInput.domainPackId || jsonInput.domain_pack_id || ""),
    domain: firstArgValue(args, ["--domain"], jsonInput.domain || ""),
    subject: firstArgValue(args, ["--subject"], jsonInput.subject || ""),
    horizon: firstArgValue(args, ["--horizon"], jsonInput.horizon || "daily_plan") || "daily_plan",
    availableMinutes: boundedNumberArg(args, ["--available-minutes", "--availableMinutes"], jsonInput.availableMinutes || jsonInput.available_minutes || 15, 1, 60),
    auditLimit: boundedNumberArg(args, ["--audit-limit", "--auditLimit"], jsonInput.auditLimit || jsonInput.audit_limit || 20, 1, 100),
    limit: boundedNumberArg(args, ["--limit"], jsonInput.limit || 8, 1, 50),
    targetNodeIds: targetNodeIds.length ? targetNodeIds : jsonInput.targetNodeIds || jsonInput.target_node_ids,
    sourceTargetNodeIds: sourceTargetNodeIds.length ? sourceTargetNodeIds : jsonInput.sourceTargetNodeIds || jsonInput.source_target_node_ids,
    autoSelectCompletedCycle: boolArg(args, ["--auto-select-completed-cycle", "--autoSelectCompletedCycle"], ["--no-auto-select-completed-cycle", "--noAutoSelectCompletedCycle"], jsonInput.autoSelectCompletedCycle || jsonInput.auto_select_completed_cycle || false),
    autoSelectLatestCompletedCycle: boolArg(args, ["--auto-select-latest-completed-cycle", "--autoSelectLatestCompletedCycle"], ["--no-auto-select-latest-completed-cycle", "--noAutoSelectLatestCompletedCycle"], jsonInput.autoSelectLatestCompletedCycle !== false && jsonInput.auto_select_latest_completed_cycle !== false),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy"], jsonInput.requestedBy || jsonInput.requested_by || "")
  }));
}

function validateOperationInput(operation, input, allowWrite) {
  if (operation !== "plan") return { ok: false, error: "automation_closed_loop_action_plan_smoke_operation_invalid", exitCode: 2 };
  if (!input.workspaceId) return { ok: false, error: "workspace_id_required", exitCode: 2 };
  if (allowWrite) {
    return {
      ok: false,
      error: "automation_closed_loop_action_plan_smoke_write_not_supported",
      operation,
      exitCode: 2
    };
  }
  return { ok: true };
}

function projectAutomationClosedLoopActionPlanSmokeReadback(result = {}, operation = "plan", input = {}) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const summary = objectOnly(readback.summary);
  const target = objectOnly(readback.target);
  const scope = objectOnly(readback.scope);
  const selectedCycle = objectOnly(readback.selectedCycle);
  const nextAction = objectOnly(readback.nextAction);
  const readiness = objectOnly(readback.automationReadiness);
  const phases = asArray(readback.phases);
  return Object.assign({}, readback, {
    automationClosedLoopActionPlanStatus: cleanString(readback.status || readback.error, 160),
    automationClosedLoopActionPlanOk: readback.ok !== false,
    automationClosedLoopActionPlanOperation: cleanString(operation, 80),
    automationClosedLoopActionPlanWriteOperation: false,
    automationClosedLoopActionPlanWriteAllowed: false,
    automationClosedLoopActionPlanWritesPerformed: readback.writesPerformed === true,
    automationClosedLoopActionPlanPublishPerformed: readback.publishPerformed === true,
    automationClosedLoopActionPlanSchedulerStarted: readback.schedulerStarted === true,
    automationClosedLoopActionPlanWorkspaceId: cleanString(target.workspaceId || input.workspaceId, 160),
    automationClosedLoopActionPlanLearnerId: cleanString(target.learnerId || input.learnerId, 160),
    automationClosedLoopActionPlanProgramId: cleanString(scope.programId || input.programId, 160),
    automationClosedLoopActionPlanDomainPackId: cleanString(scope.domainPackId || input.domainPackId, 180),
    automationClosedLoopActionPlanDomain: cleanString(scope.domain || input.domain, 120),
    automationClosedLoopActionPlanSubject: cleanString(scope.subject || input.subject, 120),
    automationClosedLoopActionPlanHorizon: cleanString(scope.horizon || input.horizon, 80),
    automationClosedLoopActionPlanNextAction: cleanString(summary.nextAction || nextAction.key, 160),
    automationClosedLoopActionPlanNextActionStatus: cleanString(summary.nextActionStatus || nextAction.status, 160),
    automationClosedLoopActionPlanNextRoutePath: cleanString(nextAction.routePath, 240),
    automationClosedLoopActionPlanNextMethod: cleanString(nextAction.method, 24),
    automationClosedLoopActionPlanNextWriteRequired: nextAction.writeRequired === true,
    automationClosedLoopActionPlanSelectedCycleId: cleanString(summary.selectedCycleId || selectedCycle.cycleId, 180),
    automationClosedLoopActionPlanSelectedTaskCardId: cleanString(summary.selectedTaskCardId || selectedCycle.taskCardId, 180),
    automationClosedLoopActionPlanDigestId: cleanString(summary.digestId, 180),
    automationClosedLoopActionPlanDigestStatus: cleanString(summary.digestStatus, 120),
    automationClosedLoopActionPlanPolicyId: cleanString(summary.policyId, 180),
    automationClosedLoopActionPlanPolicyStatus: cleanString(summary.policyStatus, 120),
    automationClosedLoopActionPlanHandoffId: cleanString(summary.handoffId, 180),
    automationClosedLoopActionPlanHandoffDeliveryStatus: cleanString(summary.handoffDeliveryStatus, 120),
    automationClosedLoopActionPlanCompletedCycleReady: readiness.completedCycleReady === true,
    automationClosedLoopActionPlanDigestPresent: readiness.digestPresent === true,
    automationClosedLoopActionPlanFailurePolicyReady: readiness.failurePolicyReady === true,
    automationClosedLoopActionPlanHandoffPresent: readiness.handoffPresent === true,
    automationClosedLoopActionPlanHandoffDelivered: readiness.handoffDelivered === true,
    automationClosedLoopActionPlanDependencyBlockedCount: numberValue(summary.dependencyBlockedCount || readiness.dependencyBlockedCount, 0),
    automationClosedLoopActionPlanPhaseCount: phases.length,
    automationClosedLoopActionPlanPhaseKeys: phases.map((phase) => cleanString(phase && phase.key, 120)).filter(Boolean),
    automationClosedLoopActionPlanBlockedPhaseKeys: phases.filter((phase) => phase && phase.ok === false).map((phase) => cleanString(phase.key, 120)).filter(Boolean),
    automationClosedLoopActionPlanPrivacyClass: cleanString(readback.privacyClass, 80)
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
      error: error.code || "automation_closed_loop_action_plan_smoke_parse_failed",
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
  const services = createServices(readEnv(process.env));
  const service = services.learningAutomationClosedLoopActionPlanService;
  if (!service || typeof service.actionPlan !== "function") {
    process.stdout.write(formatResult({ ok: false, error: "automation_closed_loop_action_plan_service_unavailable" }, pretty));
    process.exitCode = 1;
    return;
  }
  const result = service.actionPlan(input);
  const projected = projectAutomationClosedLoopActionPlanSmokeReadback(result, operation, input);
  process.stdout.write(formatResult(Object.assign({ operation }, projected), pretty));
  if (!projected.ok) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "automation_closed_loop_action_plan_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  operationFromArgs,
  projectAutomationClosedLoopActionPlanSmokeReadback,
  shouldAllowWrite,
  validateOperationInput
};
