"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const OPERATIONS = new Set(["readiness", "eligibility", "activate", "complete"]);
const WRITE_OPERATIONS = new Set(["eligibility", "activate", "complete"]);
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|hidden.*answer|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body)/i;

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

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
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
    wrapped.code = "stage_assessment_smoke_invalid_json";
    wrapped.option = names[0];
    wrapped.cause = error;
    throw wrapped;
  }
}

function parseJsonValueArg(args, names, fallback = null) {
  const text = firstArgValue(args, names, "");
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (error) {
    const wrapped = new Error(`invalid_json:${names[0]}`);
    wrapped.code = "stage_assessment_smoke_invalid_json";
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
  return Array.from(new Set((Array.isArray(values) ? values : [values]).map((value) => String(value || "").trim()).filter(Boolean)));
}

function targetNodeIds(args) {
  return uniqueStrings([
    ...collectRepeatedValues(args, ["--target-node-id", "--targetNodeId"]),
    ...collectRepeatedValues(args, ["--assessment-coverage-node-id", "--assessmentCoverageNodeId"]),
    ...collectCsvValues(args, ["--target-node-ids", "--targetNodeIds"]),
    ...collectCsvValues(args, ["--assessment-coverage-node-ids", "--assessmentCoverageNodeIds"])
  ]);
}

function sourceCardIds(args) {
  return uniqueStrings([
    ...collectRepeatedValues(args, ["--source-card-id", "--sourceCardId"]),
    ...collectCsvValues(args, ["--source-card-ids", "--sourceCardIds"])
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
  const explicit = firstArgValue(args, ["--operation", "--mode"], "");
  const operation = explicit
    || (hasFlag(args, "--activate") ? "activate"
      : hasFlag(args, "--complete") ? "complete"
        : hasFlag(args, "--eligibility") ? "eligibility"
          : "readiness");
  return String(operation || "readiness").trim().toLowerCase();
}

function allowWrite(args) {
  return hasFlag(args, "--allow-write") || hasFlag(args, "--allowWrite");
}

function taskCardFromInput(input = {}, taskCardInput = {}) {
  const taskCardId = String(input.taskCardId || "").trim();
  const cycleId = String(input.stageAssessmentCycleId || input.cycleId || "").trim();
  const targetNodeIdsValue = uniqueStrings(input.assessmentCoverageNodeIds || input.targetNodeIds);
  return stripUndefined(Object.assign({}, taskCardInput, {
    id: taskCardId || taskCardInput.id,
    taskCardId: taskCardId || taskCardInput.taskCardId,
    workspace_id: input.workspaceId || taskCardInput.workspace_id,
    learner_id: input.learnerId || taskCardInput.learner_id,
    program_id: input.programId || taskCardInput.program_id,
    subject_id: input.subjectId || taskCardInput.subject_id,
    capability_cluster_id: input.capabilityClusterId || taskCardInput.capability_cluster_id,
    card_role: input.cardRole || taskCardInput.card_role || taskCardInput.cardRole || "stage_assessment",
    stage_assessment_cycle_id: cycleId || taskCardInput.stage_assessment_cycle_id || taskCardInput.stageAssessmentCycleId,
    skill_ids_json: targetNodeIdsValue.length ? JSON.stringify(targetNodeIdsValue) : taskCardInput.skill_ids_json
  }));
}

function inputFromArgs(args) {
  const jsonInput = parseJsonArg(args, ["--input-json", "--inputJson"], {});
  const taskCardJson = parseJsonArg(args, ["--task-card-json", "--taskCardJson"], {});
  const evaluationJson = parseJsonArg(args, ["--evaluation-json", "--evaluationJson"], jsonInput.evaluation || {});
  const explicitTargetNodeIds = targetNodeIds(args);
  const jsonTargetNodeIds = uniqueStrings(
    jsonInput.assessmentCoverageNodeIds
      || jsonInput.assessment_coverage_node_ids
      || jsonInput.targetNodeIds
      || jsonInput.target_node_ids
      || []
  );
  const coverage = explicitTargetNodeIds.length ? explicitTargetNodeIds : jsonTargetNodeIds;
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], jsonInput.workspaceId || jsonInput.workspace_id || "");
  const taskCardId = firstArgValue(args, ["--task-card-id", "--taskCardId"], jsonInput.taskCardId || jsonInput.task_card_id || taskCardJson.id || taskCardJson.taskCardId || "");
  const stageAssessmentCycleId = firstArgValue(
    args,
    ["--stage-assessment-cycle-id", "--stageAssessmentCycleId", "--cycle-id", "--cycleId"],
    jsonInput.stageAssessmentCycleId || jsonInput.stage_assessment_cycle_id || jsonInput.cycleId || jsonInput.cycle_id || taskCardJson.stage_assessment_cycle_id || taskCardJson.stageAssessmentCycleId || ""
  );
  const baseInput = stripUndefined(Object.assign({}, jsonInput, {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], jsonInput.learnerId || jsonInput.learner_id || "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], jsonInput.programId || jsonInput.program_id || ""),
    subjectId: firstArgValue(args, ["--subject-id", "--subjectId", "--subject"], jsonInput.subjectId || jsonInput.subject_id || jsonInput.subject || ""),
    capabilityClusterId: firstArgValue(args, ["--capability-cluster-id", "--capabilityClusterId"], jsonInput.capabilityClusterId || jsonInput.capability_cluster_id || ""),
    targetNodeId: firstArgValue(args, ["--target-node-id", "--targetNodeId"], jsonInput.targetNodeId || jsonInput.target_node_id || coverage[0] || ""),
    targetNodeIds: coverage,
    assessmentCoverageNodeIds: coverage,
    stageAssessmentCycleId,
    cycleId: stageAssessmentCycleId,
    taskCardId,
    activationSource: firstArgValue(args, ["--activation-source", "--activationSource"], jsonInput.activationSource || jsonInput.activation_source || ""),
    activationReason: firstArgValue(args, ["--activation-reason", "--activationReason"], jsonInput.activationReason || jsonInput.activation_reason || ""),
    difficultyBand: firstArgValue(args, ["--difficulty-band", "--difficultyBand"], jsonInput.difficultyBand || jsonInput.difficulty_band || ""),
    generationKey: firstArgValue(args, ["--generation-key", "--generationKey"], jsonInput.generationKey || jsonInput.generation_key || ""),
    cooldownUntil: firstArgValue(args, ["--cooldown-until", "--cooldownUntil"], jsonInput.cooldownUntil || jsonInput.cooldown_until || ""),
    completedAt: firstArgValue(args, ["--completed-at", "--completedAt"], jsonInput.completedAt || jsonInput.completed_at || ""),
    cardRole: firstArgValue(args, ["--card-role", "--cardRole"], jsonInput.cardRole || jsonInput.card_role || taskCardJson.cardRole || taskCardJson.card_role || "stage_assessment"),
    note: firstArgValue(args, ["--note", "--reason"], jsonInput.note || jsonInput.reason || ""),
    sourceCardIds: sourceCardIds(args).length ? sourceCardIds(args) : jsonInput.sourceCardIds || jsonInput.source_card_ids,
    evidenceRequirements: parseJsonArg(args, ["--evidence-requirements-json", "--evidenceRequirementsJson"], jsonInput.evidenceRequirements || jsonInput.evidence_requirements || {}),
    sourceSummaries: parseJsonValueArg(args, ["--source-summaries-json", "--sourceSummariesJson"], jsonInput.sourceSummaries || jsonInput.source_summaries || {}),
    evaluation: evaluationJson
  }));
  return stripUndefined(Object.assign({}, baseInput, {
    taskCard: taskCardFromInput(baseInput, Object.assign({}, jsonInput.taskCard || jsonInput.task_card || {}, taskCardJson))
  }));
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

function validateOperation(operation, input = {}, args = []) {
  if (!OPERATIONS.has(operation)) {
    return {
      ok: false,
      error: "stage_assessment_smoke_operation_invalid",
      operation,
      allowedOperations: Array.from(OPERATIONS)
    };
  }
  if (!input.workspaceId) return { ok: false, error: "workspace_id_required" };
  const privacyFindings = scanPrivacy(input);
  if (privacyFindings.length) {
    return { ok: false, error: "stage_assessment_smoke_privacy_failed", privacyFindings };
  }
  if (WRITE_OPERATIONS.has(operation) && !allowWrite(args)) {
    return {
      ok: false,
      error: "stage_assessment_smoke_write_not_allowed",
      operation,
      requiredFlag: "--allow-write"
    };
  }
  if (["readiness", "eligibility", "activate"].includes(operation) && !input.targetNodeId && !input.assessmentCoverageNodeIds?.length) {
    return { ok: false, error: "stage_assessment_target_required", operation };
  }
  if (operation === "activate" && !input.activationSource) {
    return { ok: false, error: "stage_assessment_activation_source_required", operation };
  }
  if (operation === "complete" && !input.stageAssessmentCycleId && !input.cycleId) {
    return { ok: false, error: "stage_assessment_cycle_id_required", operation };
  }
  if (operation === "complete" && !input.taskCardId && !input.taskCard?.id && !input.taskCard?.taskCardId) {
    return { ok: false, error: "stage_assessment_task_card_id_required", operation };
  }
  return { ok: true };
}

async function runOperation(service, operation, input) {
  if (!service) return { ok: false, available: false, error: "learning_stage_assessment_service_unavailable" };
  if (operation === "readiness") {
    if (typeof service.stageReadiness !== "function") return { ok: false, available: false, error: "stage_assessment_readiness_unavailable" };
    return service.stageReadiness(input);
  }
  if (operation === "eligibility") {
    if (typeof service.evaluateEligibility !== "function") return { ok: false, available: false, error: "stage_assessment_eligibility_unavailable" };
    return service.evaluateEligibility(input);
  }
  if (operation === "activate") {
    if (typeof service.activateStageAssessment !== "function") return { ok: false, available: false, error: "stage_assessment_activation_unavailable" };
    return service.activateStageAssessment(input);
  }
  if (operation === "complete") {
    if (typeof service.recordAssessmentCompletion !== "function") return { ok: false, available: false, error: "stage_assessment_completion_unavailable" };
    return service.recordAssessmentCompletion(input);
  }
  return { ok: false, error: "stage_assessment_smoke_operation_invalid", operation };
}

function projectStageAssessmentSmokeReadback(result = {}, operation = "readiness", input = {}, writeAllowed = false) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const cycle = objectOnly(readback.cycle);
  const evidence = objectOnly(readback.evidence);
  const profileSummary = objectOnly(readback.profileSummary);
  const generation = objectOnly(readback.generation);
  const published = objectOnly(readback.published || generation.published);
  const writeOperation = WRITE_OPERATIONS.has(operation);
  const targetNodeIds = uniqueBoundedStrings(
    cycle.targetNodeIds
    || input.assessmentCoverageNodeIds
    || input.targetNodeIds
    || [input.targetNodeId]
  );
  return Object.assign({}, readback, {
    stageAssessmentStatus: cleanString(
      readback.ok === false ? readback.error || "failed" : readback.skipped ? "skipped" : readback.activationState || cycle.status || "pass",
      140
    ),
    stageAssessmentOk: readback.ok !== false,
    stageAssessmentOperation: cleanString(operation, 80),
    stageAssessmentWriteOperation: writeOperation,
    stageAssessmentWriteAllowed: writeAllowed === true,
    stageAssessmentWritesPerformed: writeOperation && writeAllowed === true && readback.ok === true && readback.skipped !== true,
    stageAssessmentWorkspaceId: cleanString(cycle.workspaceId || input.workspaceId, 160),
    stageAssessmentLearnerId: cleanString(cycle.learnerId || input.learnerId, 160),
    stageAssessmentProgramId: cleanString(cycle.programId || input.programId, 160),
    stageAssessmentSubjectId: cleanString(cycle.subjectId || input.subjectId, 160),
    stageAssessmentCapabilityClusterId: cleanString(cycle.capabilityClusterId || input.capabilityClusterId, 160),
    stageAssessmentTargetNodeId: cleanString(input.targetNodeId || targetNodeIds[0], 180),
    stageAssessmentTargetNodeIds: targetNodeIds,
    stageAssessmentAssessmentCoverageNodeIds: uniqueBoundedStrings(input.assessmentCoverageNodeIds || targetNodeIds),
    stageAssessmentEligible: readback.eligible === true,
    stageAssessmentActivationState: cleanString(readback.activationState || cycle.status, 80),
    stageAssessmentReason: cleanString(readback.reason, 180),
    stageAssessmentCooldownUntil: cleanString(readback.cooldownUntil || cycle.cooldownUntil, 80),
    stageAssessmentCycleId: cleanString(cycle.cycleId || input.stageAssessmentCycleId || input.cycleId, 180),
    stageAssessmentCycleStatus: cleanString(cycle.status, 80),
    stageAssessmentActivationSource: cleanString(readback.activationSource || cycle.activationSource || input.activationSource, 80),
    stageAssessmentActivationReason: cleanString(readback.activationReason || cycle.activationReason || input.activationReason, 160),
    stageAssessmentCooldownOverridden: readback.cooldownOverridden === true,
    stageAssessmentCompletedAt: cleanString(readback.completedAt || cycle.completedAt, 80),
    stageAssessmentGeneratedTaskCardId: cleanString(cycle.generatedTaskCardId || published.taskCardId, 180),
    stageAssessmentPublishedTaskCardId: cleanString(published.taskCardId, 180),
    stageAssessmentGenerationOk: generation.ok === true,
    stageAssessmentGenerationStage: cleanString(generation.stage, 120),
    stageAssessmentGenerationError: cleanString(generation.error, 160),
    stageAssessmentMinimumRecentOrdinaryCards: numberValue(evidence.minimumRecentOrdinaryCards, 0),
    stageAssessmentRecentTrajectoryCount: numberValue(evidence.recentTrajectoryCount, 0),
    stageAssessmentRecentExperienceSignalCount: numberValue(evidence.recentExperienceSignalCount, 0),
    stageAssessmentHighPressureSignalCount: numberValue(evidence.highPressureSignalCount, 0),
    stageAssessmentChallengeSignalCount: numberValue(evidence.challengeSignalCount, 0),
    stageAssessmentSourceCardIds: uniqueBoundedStrings(evidence.sourceCardIds || cycle.sourceCardIds, 12),
    stageAssessmentSourceCardCount: uniqueBoundedStrings(evidence.sourceCardIds || cycle.sourceCardIds, 12).length,
    stageAssessmentProfileMasteryStateCount: numberValue(profileSummary.masteryStateCount, 0),
    stageAssessmentProfileWeaknessCount: numberValue(profileSummary.weaknessCount, 0),
    stageAssessmentProfileStrengthCount: numberValue(profileSummary.strengthCount, 0),
    stageAssessmentSkipped: readback.skipped === true,
    stageAssessmentSkipReason: cleanString(readback.skipped ? readback.reason : "", 160)
  });
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
      error: error.code || "stage_assessment_smoke_parse_failed",
      option: error.option || ""
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
  const result = projectStageAssessmentSmokeReadback(
    Object.assign({ operation }, await runOperation(services.learningStageAssessmentService, operation, input)),
    operation,
    input,
    allowWrite(args)
  );
  process.stdout.write(formatResult(Object.assign({ operation }, result), pretty));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "stage_assessment_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  allowWrite,
  inputFromArgs,
  operationFromArgs,
  projectStageAssessmentSmokeReadback,
  runOperation,
  sourceCardIds,
  targetNodeIds,
  validateOperation
};
