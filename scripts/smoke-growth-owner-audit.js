"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const OPERATIONS = new Set(["audit", "correction"]);
const WRITE_OPERATIONS = new Set(["correction"]);
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|hidden.*answer|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body)/i;

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
    wrapped.code = "owner_audit_smoke_invalid_json";
    wrapped.option = names[0];
    wrapped.cause = error;
    throw wrapped;
  }
}

function boundedNumberArg(args, names, fallback, min = 1, max = 50) {
  const raw = firstArgValue(args, names, "");
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function numberArg(args, names, fallback) {
  const raw = firstArgValue(args, names, "");
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
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

function sourceEvidenceIds(args) {
  return uniqueStrings([
    ...collectRepeatedValues(args, ["--source-evidence-id", "--sourceEvidenceId", "--evidence-source-id", "--evidenceSourceId"]),
    ...collectCsvValues(args, ["--source-evidence-ids", "--sourceEvidenceIds", "--evidence-source-ids", "--evidenceSourceIds"])
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
  const operation = firstArgValue(args, ["--operation", "--mode"], "audit").trim().toLowerCase();
  return operation || "audit";
}

function allowWrite(args) {
  return hasFlag(args, "--allow-write") || hasFlag(args, "--allowWrite");
}

function scanPrivacy(value, path = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, `${path}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacy(child, childPath, findings);
  }
  return findings;
}

function inputFromArgs(args) {
  const jsonInput = parseJsonArg(args, ["--input-json", "--inputJson"], {});
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], jsonInput.workspaceId || jsonInput.workspace_id || "");
  const explicitTargetNodeIds = targetNodeIds(args);
  const explicitSourceEvidenceIds = sourceEvidenceIds(args);
  return stripUndefined(Object.assign({}, jsonInput, {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], jsonInput.learnerId || jsonInput.learner_id || "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], jsonInput.programId || jsonInput.program_id || ""),
    planDraftId: firstArgValue(args, ["--plan-draft-id", "--planDraftId"], jsonInput.planDraftId || jsonInput.plan_draft_id || ""),
    taskCardId: firstArgValue(args, ["--task-card-id", "--taskCardId"], jsonInput.taskCardId || jsonInput.task_card_id || ""),
    evaluationId: firstArgValue(args, ["--evaluation-id", "--evaluationId"], jsonInput.evaluationId || jsonInput.evaluation_id || ""),
    profileDeltaId: firstArgValue(args, ["--profile-delta-id", "--profileDeltaId"], jsonInput.profileDeltaId || jsonInput.profile_delta_id || ""),
    evidenceId: firstArgValue(args, ["--evidence-id", "--evidenceId"], jsonInput.evidenceId || jsonInput.evidence_id || ""),
    correctionId: firstArgValue(args, ["--correction-id", "--correctionId"], jsonInput.correctionId || jsonInput.correction_id || ""),
    sourceId: firstArgValue(args, ["--source-id", "--sourceId"], jsonInput.sourceId || jsonInput.source_id || ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], jsonInput.domainPackId || jsonInput.domain_pack_id || ""),
    domain: firstArgValue(args, ["--domain"], jsonInput.domain || ""),
    subject: firstArgValue(args, ["--subject"], jsonInput.subject || ""),
    limit: boundedNumberArg(args, ["--limit"], jsonInput.limit || 12, 1, 50),
    targetNodeIds: explicitTargetNodeIds.length ? explicitTargetNodeIds : jsonInput.targetNodeIds || jsonInput.target_node_ids,
    reviewAction: firstArgValue(args, ["--review-action", "--reviewAction"], jsonInput.reviewAction || jsonInput.review_action || ""),
    status: firstArgValue(args, ["--status", "--correction-status", "--correctionStatus"], jsonInput.status || jsonInput.correctionStatus || jsonInput.correction_status || ""),
    reason: firstArgValue(args, ["--reason", "--summary", "--correction-summary", "--correctionSummary"], jsonInput.reason || jsonInput.summary || ""),
    note: firstArgValue(args, ["--note"], jsonInput.note || ""),
    reviewedBy: firstArgValue(args, ["--reviewed-by", "--reviewedBy", "--requested-by", "--requestedBy"], jsonInput.reviewedBy || jsonInput.reviewed_by || jsonInput.requestedBy || jsonInput.requested_by || ""),
    sourceEvidenceIds: explicitSourceEvidenceIds.length ? explicitSourceEvidenceIds : jsonInput.sourceEvidenceIds || jsonInput.source_evidence_ids || jsonInput.evidenceIds || jsonInput.evidence_ids,
    evidenceWeight: numberArg(args, ["--evidence-weight", "--evidenceWeight"], jsonInput.evidenceWeight || jsonInput.evidence_weight),
    confidence: numberArg(args, ["--confidence"], jsonInput.confidence)
  }));
}

function validateOperation(operation, input = {}, args = []) {
  if (!OPERATIONS.has(operation)) {
    return {
      ok: false,
      error: "owner_audit_smoke_operation_invalid",
      operation,
      allowedOperations: Array.from(OPERATIONS)
    };
  }
  if (WRITE_OPERATIONS.has(operation) && !allowWrite(args)) {
    return {
      ok: false,
      error: "owner_audit_smoke_write_not_allowed",
      operation,
      requiredFlag: "--allow-write"
    };
  }
  const privacyFindings = scanPrivacy(input);
  if (privacyFindings.length) {
    return {
      ok: false,
      error: "owner_audit_smoke_privacy_failed",
      privacyFindings
    };
  }
  return { ok: true };
}

function publicScope(input = {}) {
  return {
    workspaceId: String(input.workspaceId || "").trim(),
    learnerId: String(input.learnerId || input.workspaceId || "").trim(),
    programId: String(input.programId || "").trim(),
    planDraftId: String(input.planDraftId || "").trim(),
    taskCardId: String(input.taskCardId || "").trim(),
    evaluationId: String(input.evaluationId || "").trim(),
    profileDeltaId: String(input.profileDeltaId || "").trim(),
    evidenceId: String(input.evidenceId || "").trim(),
    correctionId: String(input.correctionId || "").trim(),
    targetNodeIds: uniqueStrings(input.targetNodeIds || []),
    limit: Number(input.limit || 0) || 0
  };
}

function callService(service, methodName, input, unavailableError) {
  if (!service || typeof service[methodName] !== "function") {
    return { ok: false, available: false, error: unavailableError };
  }
  try {
    return service[methodName](input);
  } catch (error) {
    return {
      ok: false,
      available: false,
      error: unavailableError,
      detail: String(error && error.message ? error.message : error).slice(0, 180)
    };
  }
}

function readAudit(services, input) {
  const cycleAudit = callService(
    services.learningCycleAuditService,
    "listCycleAudit",
    input,
    "owner_audit_smoke_cycle_audit_unavailable"
  );
  const completeness = callService(
    services.learningAuditCompletenessService,
    "evaluateCycleCompleteness",
    input,
    "owner_audit_smoke_completeness_unavailable"
  );
  const corrections = callService(
    services.learningOwnerCorrectionService,
    "listCorrections",
    input,
    "owner_audit_smoke_corrections_unavailable"
  );
  const partialFailures = [cycleAudit, completeness, corrections]
    .filter((result) => !result?.ok)
    .map((result) => String(result.error || "").trim())
    .filter(Boolean);
  return {
    ok: partialFailures.length === 0,
    source: "growth-owner-audit-smoke",
    operation: "audit",
    scope: publicScope(input),
    cycleAudit,
    completeness,
    corrections,
    partialFailures
  };
}

async function runOperation(services, operation, input) {
  if (operation === "correction") {
    const correction = callService(
      services.learningOwnerCorrectionService,
      "recordCorrection",
      input,
      "owner_audit_smoke_record_correction_unavailable"
    );
    const readbackInput = Object.assign({}, input, {
      correctionId: correction.correctionId || input.correctionId || ""
    });
    const readback = readAudit(services, readbackInput);
    return {
      ok: Boolean(correction?.ok) && readback.ok,
      source: "growth-owner-audit-smoke",
      operation: "correction",
      scope: publicScope(readbackInput),
      correction,
      readback
    };
  }
  return readAudit(services, input);
}

function formatResult(result, pretty) {
  return `${JSON.stringify(result, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json");
  const operation = operationFromArgs(args);
  let input;
  try {
    input = inputFromArgs(args);
  } catch (error) {
    process.stdout.write(formatResult({
      ok: false,
      error: error.code || "owner_audit_smoke_parse_failed",
      option: error.option || ""
    }, pretty));
    process.exitCode = 2;
    return;
  }
  if (!input.workspaceId) {
    process.stdout.write(formatResult({
      ok: false,
      error: "workspace_id_required"
    }, pretty));
    process.exitCode = 2;
    return;
  }
  const validation = validateOperation(operation, input, args);
  if (!validation.ok) {
    process.stdout.write(formatResult(validation, pretty));
    process.exitCode = 2;
    return;
  }
  const config = readEnv(process.env);
  const services = createServices(config);
  const result = await runOperation(services, operation, input);
  process.stdout.write(formatResult(result, pretty));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "owner_audit_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  allowWrite,
  inputFromArgs,
  operationFromArgs,
  runOperation,
  sourceEvidenceIds,
  targetNodeIds,
  validateOperation
};
