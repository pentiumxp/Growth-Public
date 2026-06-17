#!/usr/bin/env node
"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

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

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function inputFromArgs(args) {
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], "");
  const activationGate = firstArgValue(args, ["--activation-gate", "--activationGate"], "");
  const activationGates = splitCsv(firstArgValue(args, ["--activation-gates", "--activationGates"], ""))
    .concat(activationGate ? [activationGate] : []);
  return {
    operation: firstArgValue(args, ["--operation", "--op"], "evaluate") || "evaluate",
    allowWrite: hasFlag(args, "--allow-write"),
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], ""),
    domain: firstArgValue(args, ["--domain"], ""),
    subject: firstArgValue(args, ["--subject"], ""),
    horizon: firstArgValue(args, ["--horizon"], "daily_plan") || "daily_plan",
    collectionRunId: firstArgValue(args, ["--collection-run-id", "--collectionRunId", "--run-id", "--runId"], ""),
    activationGates: activationGates.length ? activationGates : undefined,
    activationRecordLimit: Number(firstArgValue(args, ["--activation-record-limit", "--activationRecordLimit"], "20")) || 20,
    status: firstArgValue(args, ["--status", "--enablement-status", "--enablementStatus"], ""),
    note: firstArgValue(args, ["--note", "--reason", "--summary"], ""),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy"], ""),
    recordedBy: firstArgValue(args, ["--recorded-by", "--recordedBy", "--approved-by", "--approvedBy"], ""),
    recordedAt: firstArgValue(args, ["--recorded-at", "--recordedAt", "--approved-at", "--approvedAt"], ""),
    createdAt: firstArgValue(args, ["--created-at", "--createdAt"], ""),
    limit: Number(firstArgValue(args, ["--limit"], "5")) || 5
  };
}

function validateInput(input = {}) {
  if (!input.workspaceId) return { ok: false, error: "runtime_enablement_smoke_workspace_required" };
  if (!["evaluate", "list", "record"].includes(String(input.operation || "evaluate"))) {
    return { ok: false, error: "runtime_enablement_smoke_operation_invalid" };
  }
  return { ok: true };
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

function compactAction(value = {}) {
  const action = objectOnly(value);
  if (!Object.keys(action).length) return null;
  return {
    key: cleanString(action.key || action.checkKey || action.check_key, 140),
    action: cleanString(action.action || action.type || action.reason || action.label, 160),
    requiredActor: cleanString(action.requiredActor || action.required_actor || action.actor || "owner", 80)
  };
}

function latestEnablementFrom(result = {}) {
  if (result.enablement && typeof result.enablement === "object" && !Array.isArray(result.enablement)) return result.enablement;
  return asArray(result.enablements)[0] || {};
}

function evaluatedFrom(result = {}) {
  return objectOnly(result.evaluated);
}

function runtimeEnablementFrom(result = {}, latestEnablement = {}, evaluated = {}) {
  return objectOnly(
    result.runtimeEnablement
    || evaluated.runtimeEnablement
    || latestEnablement.runtimeEnablement
    || latestEnablement.runtime_enablement
  );
}

function projectRuntimeEnablementSmokeReadback(result = {}) {
  const latestEnablement = latestEnablementFrom(result);
  const evaluated = evaluatedFrom(result);
  const runtimeEnablement = runtimeEnablementFrom(result, latestEnablement, evaluated);
  const requestedGates = asArray(result.requestedActivationGates).length
    ? asArray(result.requestedActivationGates)
    : asArray(evaluated.requestedActivationGates).length
      ? asArray(evaluated.requestedActivationGates)
      : asArray(latestEnablement.requestedActivationGates || latestEnablement.requested_activation_gates);
  const requiredConfigKeys = asArray(result.requiredConfigKeys).length
    ? asArray(result.requiredConfigKeys)
    : asArray(evaluated.requiredConfigKeys).length
      ? asArray(evaluated.requiredConfigKeys)
      : asArray(latestEnablement.requiredConfigKeys || latestEnablement.required_config_keys);
  const status = cleanString(result.runtimeEnablementStatus || result.status || evaluated.status || latestEnablement.status || runtimeEnablement.status, 120);
  return Object.assign({}, result, {
    runtimeEnablementStatus: status,
    runtimeEnablementCount: Number(result.count || asArray(result.enablements).length || ((latestEnablement.enablementId || latestEnablement.enablement_id) ? 1 : 0)) || 0,
    runtimeEnablementLatestEnablementId: cleanString(latestEnablement.enablementId || latestEnablement.enablement_id, 140),
    runtimeEnablementLatestEnablementStatus: cleanString(latestEnablement.status || status, 120),
    runtimeEnablementConfigVerified: result.runtimeConfigVerified === true || evaluated.runtimeConfigVerified === true || runtimeEnablement.runtimeConfigVerified === true,
    runtimeEnablementReadyForManualRuntimeConfigEnablement: result.readyForManualRuntimeConfigEnablement === true || evaluated.readyForManualRuntimeConfigEnablement === true || runtimeEnablement.readyForManualRuntimeConfigEnablement === true,
    runtimeEnablementManualRuntimeConfigRequired: result.manualRuntimeConfigRequired === true || evaluated.manualRuntimeConfigRequired === true,
    runtimeEnablementRequestedGateCount: requestedGates.length,
    runtimeEnablementRequiredConfigKeyCount: requiredConfigKeys.length,
    runtimeEnablementLatestPreflightReportId: cleanString(
      result.latestPreflightReportId
      || evaluated.latestPreflightReportId
      || runtimeEnablement.latestPreflightReportId
      || latestEnablement.latestPreflightReportId
      || latestEnablement.latest_preflight_report_id,
      140
    ),
    runtimeEnablementLatestPreflightStatus: cleanString(
      result.latestPreflightStatus
      || evaluated.latestPreflightStatus
      || runtimeEnablement.latestPreflightStatus
      || latestEnablement.latestPreflightStatus
      || latestEnablement.latest_preflight_status,
      120
    ),
    runtimeEnablementLatestPreflightReadyForProductionDeployReview: result.latestPreflightReadyForProductionDeployReview === true || evaluated.latestPreflightReadyForProductionDeployReview === true || runtimeEnablement.latestPreflightReadyForProductionDeployReview === true || latestEnablement.latestPreflightReadyForProductionDeployReview === true,
    runtimeEnablementLatestPreflightReadyForOwnerReleaseActivation: result.latestPreflightReadyForOwnerReleaseActivation === true || evaluated.latestPreflightReadyForOwnerReleaseActivation === true || runtimeEnablement.latestPreflightReadyForOwnerReleaseActivation === true || latestEnablement.latestPreflightReadyForOwnerReleaseActivation === true,
    runtimeEnablementRequiredActionCount: Number(runtimeEnablement.requiredActionCount || asArray(runtimeEnablement.requiredActions).length || 0) || 0,
    runtimeEnablementNextAction: compactAction(runtimeEnablement.nextAction || asArray(runtimeEnablement.requiredActions)[0]),
    runtimeEnablementConfigChangeApplied: result.configChangeApplied === true || evaluated.configChangeApplied === true || runtimeEnablement.configChangeApplied === true,
    runtimeEnablementRuntimeConfigChange: result.runtimeConfigChange === true || evaluated.runtimeConfigChange === true || runtimeEnablement.runtimeConfigChange === true,
    runtimeEnablementRuntimeConfigMutationPerformed: result.runtimeConfigMutationPerformed === true || evaluated.runtimeConfigMutationPerformed === true || runtimeEnablement.runtimeConfigMutationPerformed === true,
    runtimeEnablementWritefulSchedulingAllowed: result.writefulSchedulingAllowed === true || evaluated.writefulSchedulingAllowed === true || runtimeEnablement.writefulSchedulingAllowed === true,
    runtimeEnablementBackgroundSchedulingAllowed: result.backgroundSchedulingAllowed === true || evaluated.backgroundSchedulingAllowed === true || runtimeEnablement.backgroundSchedulingAllowed === true,
    runtimeEnablementBackgroundWorkerAllowed: result.backgroundWorkerAllowed === true || evaluated.backgroundWorkerAllowed === true || runtimeEnablement.backgroundWorkerAllowed === true
  });
}

function runOperation(service, input) {
  const operation = String(input.operation || "evaluate");
  if (operation === "list") return projectRuntimeEnablementSmokeReadback(service.listEnablements(input));
  if (operation === "record") {
    if (!input.allowWrite) {
      return {
        ok: false,
        error: "runtime_enablement_smoke_write_not_allowed",
        operation,
        requires: "--allow-write"
      };
    }
    return projectRuntimeEnablementSmokeReadback(service.recordEnablement(input));
  }
  return projectRuntimeEnablementSmokeReadback(service.evaluate(input));
}

function formatResult(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json") || hasFlag(args, "--pretty");
  const input = inputFromArgs(args);
  const validation = validateInput(input);
  if (!validation.ok) {
    process.stdout.write(formatResult(validation, pretty));
    process.exitCode = 2;
    return;
  }
  const services = createServices(readEnv(process.env));
  const result = runOperation(services.learningAutomationRuntimeEnablementService, input);
  process.stdout.write(formatResult(Object.assign({ operation: input.operation || "evaluate" }, result), pretty));
  process.exitCode = 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "runtime_enablement_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  projectRuntimeEnablementSmokeReadback,
  runOperation,
  validateInput
};
