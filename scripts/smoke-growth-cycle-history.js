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

function parseJsonArg(args, names, fallback = {}) {
  const text = firstArgValue(args, names, "");
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    const wrapped = new Error(`invalid_json:${names[0]}`);
    wrapped.code = "cycle_history_smoke_invalid_json";
    wrapped.option = names[0];
    wrapped.cause = error;
    throw wrapped;
  }
}

function boundedNumberArg(args, names, fallback, min = 1, max = 25) {
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
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function targetNodeIds(args) {
  return uniqueStrings([
    ...collectRepeatedValues(args, ["--target-node-id", "--targetNodeId"]),
    ...collectCsvValues(args, ["--target-node-ids", "--targetNodeIds"])
  ]);
}

function booleanArg(args, names, fallback = true) {
  const raw = firstArgValue(args, names, "");
  if (!raw) return fallback;
  if (["false", "0", "no", "off"].includes(raw.toLowerCase())) return false;
  if (["true", "1", "yes", "on"].includes(raw.toLowerCase())) return true;
  return fallback;
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
  return String(value || "").trim().slice(0, max);
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueBoundedStrings(values = [], maxItems = 12) {
  return Array.from(new Set(asArray(values)
    .map((value) => cleanString(value, 160))
    .filter(Boolean)))
    .slice(0, maxItems);
}

function countArray(value) {
  return asArray(value).filter(Boolean).length;
}

function cycleHistoryStatus(result = {}) {
  if (result.ok === false) return cleanString(result.error || "failed", 140);
  const summary = objectOnly(result.summary);
  if (Number(summary.partialFailureCount || 0) > 0) return "partial_history";
  if (Number(summary.cycleCount || countArray(result.cycles) || 0) > 0) return "history_available";
  return "history_empty";
}

function projectCycleHistorySmokeReadback(result = {}) {
  const history = objectOnly(result);
  if (!Object.keys(history).length) return result;
  const target = objectOnly(history.target);
  const filters = objectOnly(history.filters);
  const summary = objectOnly(history.summary);
  const cycles = asArray(history.cycles);
  const firstCycle = objectOnly(cycles[0]);
  const selectors = objectOnly(firstCycle.selectors);
  const counts = objectOnly(firstCycle.counts);
  const completeness = objectOnly(firstCycle.completeness);
  const targetNodeIds = uniqueBoundedStrings(filters.targetNodeIds);
  const cycleIds = uniqueBoundedStrings(cycles.map((cycle) => objectOnly(cycle).cycleId));
  const partialFailures = uniqueBoundedStrings(history.partialFailures);
  const firstCycleMissingRequired = uniqueBoundedStrings(completeness.missingRequired);
  return Object.assign({}, history, {
    cycleHistoryStatus: cycleHistoryStatus(history),
    cycleHistoryTargetWorkspaceId: cleanString(target.workspaceId || filters.workspaceId, 160),
    cycleHistoryTargetLearnerId: cleanString(target.learnerId || filters.learnerId, 160),
    cycleHistoryProgramId: cleanString(filters.programId, 160),
    cycleHistoryDomainPackId: cleanString(filters.domainPackId, 160),
    cycleHistoryDomain: cleanString(filters.domain, 120),
    cycleHistorySubject: cleanString(filters.subject, 120),
    cycleHistoryIncludeCompleteness: filters.includeCompleteness !== false,
    cycleHistoryLimit: Number(filters.limit || 0) || 0,
    cycleHistoryFilterPlanDraftId: cleanString(filters.planDraftId, 180),
    cycleHistoryFilterTaskCardId: cleanString(filters.taskCardId, 180),
    cycleHistoryFilterEvaluationId: cleanString(filters.evaluationId, 180),
    cycleHistoryFilterProfileDeltaId: cleanString(filters.profileDeltaId, 180),
    cycleHistoryFilterEvidenceId: cleanString(filters.evidenceId, 180),
    cycleHistoryFilterCorrectionId: cleanString(filters.correctionId, 180),
    cycleHistoryFilterSourceId: cleanString(filters.sourceId, 180),
    cycleHistoryTargetNodeIds: targetNodeIds,
    cycleHistoryTargetNodeCount: targetNodeIds.length,
    cycleHistoryCycleCount: Number(summary.cycleCount || cycles.length || 0) || 0,
    cycleHistoryCompleteCount: Number(summary.completeCount || 0) || 0,
    cycleHistoryReadyForAutomationCount: Number(summary.readyForAutomationCount || 0) || 0,
    cycleHistoryLatestActivityAt: cleanString(summary.latestActivityAt, 120),
    cycleHistoryPartialFailureCount: Number(summary.partialFailureCount || partialFailures.length || 0) || 0,
    cycleHistoryPartialFailures: partialFailures,
    cycleHistoryCycleIds: cycleIds,
    cycleHistoryFirstCycleId: cleanString(firstCycle.cycleId, 180),
    cycleHistoryFirstCycleStatus: cleanString(firstCycle.status, 120),
    cycleHistoryFirstCycleCardRole: cleanString(firstCycle.cardRole, 120),
    cycleHistoryFirstCycleScoreBand: cleanString(firstCycle.scoreBand, 120),
    cycleHistoryFirstCycleLatestActivityAt: cleanString(firstCycle.latestActivityAt, 120),
    cycleHistoryFirstCyclePlanDraftId: cleanString(selectors.planDraftId, 180),
    cycleHistoryFirstCycleTaskCardId: cleanString(selectors.taskCardId, 180),
    cycleHistoryFirstCycleEvaluationId: cleanString(selectors.evaluationId, 180),
    cycleHistoryFirstCycleProfileDeltaId: cleanString(selectors.profileDeltaId, 180),
    cycleHistoryFirstCycleEvidenceId: cleanString(selectors.evidenceId, 180),
    cycleHistoryFirstCycleCorrectionId: cleanString(selectors.correctionId, 180),
    cycleHistoryFirstCycleSourceId: cleanString(selectors.sourceId, 180),
    cycleHistoryFirstCycleTargetNodeCount: countArray(selectors.targetNodeIds),
    cycleHistoryFirstCyclePlanDraftCount: Number(counts.planDrafts || 0) || 0,
    cycleHistoryFirstCycleEvidenceCount: Number(counts.evidence || 0) || 0,
    cycleHistoryFirstCycleProfileDeltaCount: Number(counts.profileDeltas || 0) || 0,
    cycleHistoryFirstCycleCorrectionCount: Number(counts.corrections || 0) || 0,
    cycleHistoryFirstCycleCompletenessAvailable: completeness.available === true,
    cycleHistoryFirstCycleComplete: completeness.complete === true,
    cycleHistoryFirstCycleReadyForAutomation: completeness.readyForAutomation === true,
    cycleHistoryFirstCycleMissingRequired: firstCycleMissingRequired,
    cycleHistoryFirstCycleMissingRequiredCount: firstCycleMissingRequired.length
  });
}

function inputFromArgs(args) {
  const jsonInput = parseJsonArg(args, ["--input-json", "--inputJson"], {});
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], jsonInput.workspaceId || jsonInput.workspace_id || "");
  const explicitTargetNodeIds = targetNodeIds(args);
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
    includeCompleteness: booleanArg(args, ["--include-completeness", "--includeCompleteness"], jsonInput.includeCompleteness ?? jsonInput.include_completeness ?? true),
    limit: boundedNumberArg(args, ["--limit"], jsonInput.limit || 12, 1, 25),
    targetNodeIds: explicitTargetNodeIds.length ? explicitTargetNodeIds : jsonInput.targetNodeIds || jsonInput.target_node_ids,
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy"], jsonInput.requestedBy || jsonInput.requested_by || "")
  }));
}

function formatResult(result, pretty) {
  return `${JSON.stringify(result, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json");
  let input;
  try {
    input = inputFromArgs(args);
  } catch (error) {
    process.stdout.write(formatResult({
      ok: false,
      error: error.code || "cycle_history_smoke_parse_failed",
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
  const config = readEnv(process.env);
  const services = createServices(config);
  const service = services.learningCycleHistoryService;
  const result = projectCycleHistorySmokeReadback(service && typeof service.listCycleHistory === "function"
    ? service.listCycleHistory(input)
    : { ok: false, error: "cycle_history_service_unavailable" });
  process.stdout.write(formatResult(result, pretty));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "cycle_history_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  projectCycleHistorySmokeReadback,
  targetNodeIds
};
