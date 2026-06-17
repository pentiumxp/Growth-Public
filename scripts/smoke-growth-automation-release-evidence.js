#!/usr/bin/env node
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
    wrapped.code = "automation_release_evidence_smoke_invalid_json";
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
    error.code = "automation_release_evidence_smoke_operation_invalid";
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
    evidenceKey: firstArgValue(args, ["--evidence-key", "--evidenceKey", "--check-key", "--checkKey"], jsonInput.evidenceKey || jsonInput.evidence_key || jsonInput.checkKey || jsonInput.check_key || ""),
    evidence: parseJsonArg(args, ["--evidence-json", "--evidenceJson"], jsonInput.evidence || {}),
    status: firstArgValue(args, ["--status"], jsonInput.status || ""),
    limit: boundedNumberArg(args, ["--limit"], jsonInput.limit || 20, 1, 100),
    note: firstArgValue(args, ["--note", "--reason"], jsonInput.note || jsonInput.reason || jsonInput.summary || ""),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy", "--recorded-by", "--recordedBy"], jsonInput.requestedBy || jsonInput.requested_by || jsonInput.recordedBy || jsonInput.recorded_by || ""),
    recordedBy: firstArgValue(args, ["--recorded-by", "--recordedBy", "--requested-by", "--requestedBy"], jsonInput.recordedBy || jsonInput.recorded_by || jsonInput.requestedBy || jsonInput.requested_by || ""),
    observedAt: firstArgValue(args, ["--observed-at", "--observedAt"], jsonInput.observedAt || jsonInput.observed_at || ""),
    createdAt: firstArgValue(args, ["--created-at", "--createdAt"], jsonInput.createdAt || jsonInput.created_at || "")
  }));
}

function validateOperationInput(operation, input, allowWrite) {
  if (!input.workspaceId) return { ok: false, error: "workspace_id_required", exitCode: 2 };
  if (WRITE_OPERATIONS.has(operation) && !allowWrite) {
    return { ok: false, error: "automation_release_evidence_smoke_write_not_allowed", operation, exitCode: 2 };
  }
  if (operation === "record" && !input.evidenceKey) {
    return { ok: false, error: "evidence_key_required", exitCode: 2 };
  }
  return { ok: true };
}

function runOperation(service, operation, input) {
  if (operation === "record") return service.recordEvidence(input);
  if (operation === "bag") return service.evidenceBag(input);
  return service.listEvidence(input);
}

function summarizeStatuses(records = []) {
  return asArray(records).reduce((counts, record) => {
    const status = cleanString(record && record.status, 80) || "missing";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

function evidenceRowsFrom(readback = {}) {
  return Array.isArray(readback.evidence) ? readback.evidence : [];
}

function evidenceRecordFrom(readback = {}) {
  if (Array.isArray(readback.evidence)) return objectOnly(readback.evidence[0]);
  const evidence = objectOnly(readback.evidence);
  return evidence.evidenceRecordId ? evidence : {};
}

function evidenceBagFrom(readback = {}) {
  if (Array.isArray(readback.evidence)) return {};
  const evidence = objectOnly(readback.evidence);
  return evidence.evidenceRecordId ? {} : evidence;
}

function projectAutomationReleaseEvidenceSmokeReadback(result = {}, operation = "list", input = {}, writeAllowed = false) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const rows = evidenceRowsFrom(readback);
  const record = evidenceRecordFrom(readback);
  const evidence = objectOnly(record.evidence);
  const bag = evidenceBagFrom(readback);
  const bagKeys = uniqueBoundedStrings(readback.evidenceKeys || Object.keys(bag), 40);
  const statusRows = rows.length ? rows : record.evidenceRecordId ? [record] : [];
  const statusCounts = summarizeStatuses(statusRows);
  const writeOperation = WRITE_OPERATIONS.has(operation);
  const evidenceStatus = cleanString(record.status || evidence.status || readback.status || (operation === "bag" ? "evidence_bag_ready" : operation === "list" ? "listed" : ""), 120);
  return Object.assign({}, readback, {
    automationReleaseEvidenceStatus: cleanString(
      readback.ok === false ? readback.error || "failed" : evidenceStatus || "ready",
      140
    ),
    automationReleaseEvidenceOk: readback.ok !== false,
    automationReleaseEvidenceOperation: cleanString(operation, 80),
    automationReleaseEvidenceWriteOperation: writeOperation,
    automationReleaseEvidenceWriteAllowed: writeAllowed === true,
    automationReleaseEvidenceWritesPerformed: writeOperation && writeAllowed === true && readback.ok === true && readback.duplicate !== true,
    automationReleaseEvidenceDuplicate: readback.duplicate === true,
    automationReleaseEvidenceWorkspaceId: cleanString(readback.workspaceId || record.workspaceId || input.workspaceId, 160),
    automationReleaseEvidenceLearnerId: cleanString(readback.learnerId || record.learnerId || input.learnerId, 160),
    automationReleaseEvidenceProgramId: cleanString(record.programId || input.programId, 160),
    automationReleaseEvidenceDomainPackId: cleanString(record.domainPackId || input.domainPackId, 180),
    automationReleaseEvidenceDomain: cleanString(record.domain || input.domain, 120),
    automationReleaseEvidenceSubject: cleanString(record.subject || input.subject, 120),
    automationReleaseEvidenceHorizon: cleanString(record.horizon || input.horizon, 80),
    automationReleaseEvidenceCount: numberValue(readback.count, rows.length),
    automationReleaseEvidenceRecordId: cleanString(record.evidenceRecordId || evidence.evidenceRecordId || evidence.evidenceId, 180),
    automationReleaseEvidenceRecordIds: uniqueBoundedStrings(rows.map((item) => item && item.evidenceRecordId), 24),
    automationReleaseEvidenceEvidenceKey: cleanString(record.evidenceKey || evidence.evidenceKey || input.evidenceKey, 160),
    automationReleaseEvidenceEvidenceKeys: uniqueBoundedStrings(readback.evidenceKeys || rows.map((item) => item && item.evidenceKey), 40),
    automationReleaseEvidenceBagKeys: bagKeys,
    automationReleaseEvidenceBagKeyCount: bagKeys.length,
    automationReleaseEvidenceCheckKey: cleanString(record.checkKey || evidence.checkKey, 160),
    automationReleaseEvidenceStatuses: uniqueBoundedStrings(Object.keys(statusCounts), 12),
    automationReleaseEvidencePassCount: numberValue(statusCounts.pass, 0),
    automationReleaseEvidenceMissingCount: numberValue(statusCounts.missing, 0),
    automationReleaseEvidenceBlockedCount: numberValue(statusCounts.blocked, 0),
    automationReleaseEvidenceStaleCount: numberValue(statusCounts.stale, 0),
    automationReleaseEvidenceRevokedCount: numberValue(statusCounts.revoked, 0),
    automationReleaseEvidenceSupersededCount: numberValue(statusCounts.superseded, 0),
    automationReleaseEvidencePrivacyClass: cleanString(record.privacyClass || evidence.privacyClass, 80),
    automationReleaseEvidenceVersion: cleanString(record.evidenceVersion, 140),
    automationReleaseEvidenceSchemaVersion: cleanString(evidence.schemaVersion, 180),
    automationReleaseEvidenceSource: cleanString(evidence.source, 180),
    automationReleaseEvidenceUiGate: cleanString(evidence.uiGate || evidence.uiEvidence?.uiGate, 120),
    automationReleaseEvidenceReadyForReleaseEvidence: evidence.readyForReleaseEvidence === true,
    automationReleaseEvidenceRecordedBy: cleanString(record.recordedBy, 160),
    automationReleaseEvidenceObservedAt: cleanString(record.observedAt || evidence.observedAt, 120),
    automationReleaseEvidenceWritefulSchedulingAllowed: readback.writefulSchedulingAllowed === true || evidence.writefulSchedulingAllowed === true,
    automationReleaseEvidenceRuntimeConfigChange: readback.runtimeConfigChange === true || evidence.runtimeConfigChange === true,
    automationReleaseEvidenceConfigChangeApplied: readback.configChangeApplied === true || evidence.configChangeApplied === true
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
      error: error.code || "automation_release_evidence_smoke_parse_failed",
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
  const result = projectAutomationReleaseEvidenceSmokeReadback(
    Object.assign({ operation }, runOperation(services.learningAutomationReleaseEvidenceService, operation, input)),
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
      error: "automation_release_evidence_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  operationFromArgs,
  projectAutomationReleaseEvidenceSmokeReadback,
  runOperation,
  shouldAllowWrite,
  validateOperationInput
};
