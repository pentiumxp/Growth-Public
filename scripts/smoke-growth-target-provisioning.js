"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const WRITE_OPERATIONS = new Set(["provision"]);
const OPERATIONS = new Set(["resolve", "provision"]);

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

function targetNodeIds(args) {
  return uniqueStrings([
    ...collectRepeatedValues(args, ["--target-node-id", "--targetNodeId"]),
    ...collectCsvValues(args, ["--target-node-ids", "--targetNodeIds"])
  ]);
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

function uniqueBoundedStrings(values = [], maxItems = 24) {
  return Array.from(new Set(asArray(values)
    .map((value) => cleanString(value, 160))
    .filter(Boolean)))
    .slice(0, maxItems);
}

function projectTargetProvisioningSmokeReadback(result = {}, operation = "resolve") {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const graphOptions = objectOnly(readback.graphOptions);
  const provision = objectOnly(readback.provision);
  const domainPacks = asArray(graphOptions.domainPacks);
  const selectedTargetNodeIds = uniqueBoundedStrings(readback.selectedTargetNodeIds || readback.targetNodeIds);
  const selectedSubjects = uniqueBoundedStrings(graphOptions.subjects, 40);
  const selectedDomainPackId = cleanString(readback.selectedDomainPackId || graphOptions.selectedDomainPackId || provision.domainPackId, 180);
  return Object.assign({}, readback, {
    targetProvisioningStatus: cleanString(readback.ok === false ? readback.error || "failed" : "pass", 140),
    targetProvisioningOk: readback.ok !== false,
    targetProvisioningOperation: cleanString(operation, 80),
    targetProvisioningWriteOperation: WRITE_OPERATIONS.has(cleanString(operation, 80)),
    targetProvisioningTargetEnabled: readback.targetEnabled === true,
    targetProvisioningMode: cleanString(readback.mode, 120),
    targetProvisioningWorkspaceId: cleanString(readback.workspaceId || provision.workspaceId, 160),
    targetProvisioningLearnerId: cleanString(readback.learnerId || provision.learnerId, 160),
    targetProvisioningProgramId: cleanString(readback.programId || provision.programId, 160),
    targetProvisioningSelectedDomainPackId: selectedDomainPackId,
    targetProvisioningSelectedDomain: cleanString(readback.selectedDomain || graphOptions.selectedDomain || provision.domain, 120),
    targetProvisioningSelectedSubject: cleanString(readback.selectedSubject || graphOptions.selectedSubject || provision.subject, 120),
    targetProvisioningSelectedTargetNodeIds: selectedTargetNodeIds,
    targetProvisioningSelectedTargetNodeCount: selectedTargetNodeIds.length,
    targetProvisioningProvisionAvailable: Boolean(provision.provisionId),
    targetProvisioningProvisionId: cleanString(provision.provisionId, 180),
    targetProvisioningProvisionStatus: cleanString(provision.status, 120),
    targetProvisioningProvisionSource: cleanString(provision.source, 120),
    targetProvisioningProvisionUpdatedAt: cleanString(provision.updatedAt, 180),
    targetProvisioningGraphOptionsAvailable: graphOptions.available === true,
    targetProvisioningGraphDomainPackCount: domainPacks.length,
    targetProvisioningGraphSubjectCount: selectedSubjects.length,
    targetProvisioningGraphSubjects: selectedSubjects,
    targetProvisioningGraphSelectedDomainPackId: cleanString(graphOptions.selectedDomainPackId, 180),
    targetProvisioningGraphSelectedDomain: cleanString(graphOptions.selectedDomain, 120),
    targetProvisioningGraphSelectedSubject: cleanString(graphOptions.selectedSubject, 120),
    targetProvisioningMissingTargetNodeIds: uniqueBoundedStrings(readback.missingTargetNodeIds),
    targetProvisioningMismatchedTargetNodeIds: uniqueBoundedStrings(readback.mismatchedTargetNodeIds)
  });
}

function operationFromArgs(args) {
  const operation = firstArgValue(args, ["--operation", "--mode"], "resolve").trim().toLowerCase();
  return operation || "resolve";
}

function allowWrite(args) {
  return hasFlag(args, "--allow-write") || hasFlag(args, "--allowWrite");
}

function inputFromArgs(args) {
  const explicitTargetNodeIds = targetNodeIds(args);
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], "");
  return {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], ""),
    domain: firstArgValue(args, ["--domain"], ""),
    subject: firstArgValue(args, ["--subject"], ""),
    status: firstArgValue(args, ["--status"], "active") || "active",
    source: firstArgValue(args, ["--source"], "owner_smoke") || "owner_smoke",
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy"], "owner_smoke"),
    targetNodeIds: explicitTargetNodeIds
  };
}

function validateOperation(operation, input = {}, args = []) {
  if (!OPERATIONS.has(operation)) {
    return {
      ok: false,
      error: "target_provisioning_smoke_operation_invalid",
      operation,
      allowedOperations: Array.from(OPERATIONS)
    };
  }
  if (!input.workspaceId) {
    return { ok: false, error: "workspace_id_required" };
  }
  if (operation === "provision" && !input.domainPackId) {
    return { ok: false, error: "domain_pack_id_required" };
  }
  if (WRITE_OPERATIONS.has(operation) && !allowWrite(args)) {
    return {
      ok: false,
      error: "target_provisioning_smoke_write_not_allowed",
      operation,
      requiredFlag: "--allow-write"
    };
  }
  return { ok: true };
}

function runOperation(services, operation, input) {
  const service = services.learningTargetProvisioningService;
  if (operation === "provision") return service.provisionDomainPack(input);
  return service.resolveSelection(input);
}

function formatResult(result, pretty) {
  return `${JSON.stringify(result, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json");
  const operation = operationFromArgs(args);
  const input = inputFromArgs(args);
  const validation = validateOperation(operation, input, args);
  if (!validation.ok) {
    process.stdout.write(formatResult(validation, pretty));
    process.exitCode = 2;
    return;
  }
  const config = readEnv(process.env);
  const services = createServices(config);
  const result = projectTargetProvisioningSmokeReadback(runOperation(services, operation, input), operation);
  process.stdout.write(formatResult(result, pretty));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "target_provisioning_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  allowWrite,
  inputFromArgs,
  operationFromArgs,
  projectTargetProvisioningSmokeReadback,
  runOperation,
  targetNodeIds,
  validateOperation
};
