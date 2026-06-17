"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const OPERATIONS = new Set(["object-types", "get", "summarize"]);

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

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = [], maxItems = 24) {
  return Array.from(new Set(asArray(values)
    .map((value) => cleanString(value, 160))
    .filter(Boolean)))
    .slice(0, maxItems);
}

function operationFromArgs(args) {
  const operation = firstArgValue(args, ["--operation", "--mode"], "object-types").trim().toLowerCase();
  return operation || "object-types";
}

function inputFromArgs(args) {
  return {
    workspaceId: firstArgValue(args, ["--workspace-id", "--workspaceId"], ""),
    objectType: firstArgValue(args, ["--object-type", "--objectType"], ""),
    objectId: firstArgValue(args, ["--object-id", "--objectId"], ""),
    purpose: firstArgValue(args, ["--purpose"], "")
  };
}

function validateOperation(operation, input = {}) {
  if (!OPERATIONS.has(operation)) {
    return {
      ok: false,
      error: "reference_contract_smoke_operation_invalid",
      operation,
      allowedOperations: Array.from(OPERATIONS)
    };
  }
  if (!input.workspaceId) return { ok: false, error: "workspace_id_required" };
  if (operation !== "object-types" && !input.objectType) return { ok: false, error: "object_type_required" };
  if (operation !== "object-types" && !input.objectId) return { ok: false, error: "object_id_required" };
  return { ok: true };
}

function projectReferenceContractSmokeReadback(result = {}, operation = "object-types") {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const objectTypes = asArray(readback.objectTypes).map((item) => cleanString(item.objectType)).filter(Boolean);
  const summary = objectOnly(readback.summary);
  const display = objectOnly(readback.display);
  const counts = objectOnly(summary.counts);
  const related = asArray(readback.relatedObjectRefs);
  const targetNodeIds = uniqueStrings(summary.targetNodeIds);
  return Object.assign({}, readback, {
    referenceContractStatus: readback.ok === false ? cleanString(readback.error, 140) : "pass",
    referenceContractOk: readback.ok !== false,
    referenceContractOperation: cleanString(operation, 80),
    referenceContractWritePerformed: false,
    referenceContractSchemaVersion: cleanString(readback.schemaVersion, 120),
    referenceContractPrivacyClass: cleanString(readback.privacyClass, 80),
    referenceContractSummaryOnly: readback.summaryOnly === true,
    referenceContractWorkspaceId: cleanString(readback.workspaceId, 160),
    referenceContractObjectTypeCount: objectTypes.length,
    referenceContractObjectTypes: objectTypes,
    referenceContractObjectType: cleanString(readback.objectType, 120),
    referenceContractObjectId: cleanString(readback.objectId, 180),
    referenceContractReferenceId: cleanString(readback.referenceId, 260),
    referenceContractDisplayTitle: cleanString(display.title, 180),
    referenceContractDisplaySubtitle: cleanString(display.subtitle, 260),
    referenceContractRelatedObjectCount: related.length || Number(summary.relatedObjectCount || 0) || 0,
    referenceContractEvidenceCount: Number(counts.evidenceCount || summary.evidenceCount || 0) || 0,
    referenceContractSubmissionCount: Number(counts.submissionCount || summary.submissionCount || 0) || 0,
    referenceContractEvaluationCount: Number(counts.evaluationCount || summary.evaluationCount || 0) || 0,
    referenceContractItemCount: Number(counts.itemCount || summary.itemCount || 0) || 0,
    referenceContractTargetNodeIds: targetNodeIds,
    referenceContractTargetNodeCount: targetNodeIds.length || Number(counts.targetNodeCount || 0) || 0,
    referenceContractSource: cleanString(readback.source, 180)
  });
}

async function runOperation(services, operation, input) {
  const service = services.learningReferenceContractService;
  if (operation === "get") return service.referenceGet(input);
  if (operation === "summarize") return service.referenceSummarize(input);
  return service.referenceObjectTypes(input);
}

function formatResult(result, pretty) {
  return `${JSON.stringify(result, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json");
  const operation = operationFromArgs(args);
  const input = inputFromArgs(args);
  const validation = validateOperation(operation, input);
  if (!validation.ok) {
    process.stdout.write(formatResult(validation, pretty));
    process.exitCode = 2;
    return;
  }
  const config = readEnv(process.env);
  const services = createServices(config);
  const result = projectReferenceContractSmokeReadback(await runOperation(services, operation, input), operation);
  process.stdout.write(formatResult(result, pretty));
  process.exitCode = result.ok === false ? 1 : 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "reference_contract_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  operationFromArgs,
  projectReferenceContractSmokeReadback,
  runOperation,
  validateOperation
};
