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
    wrapped.code = "scheduler_dry_run_smoke_invalid_json";
    wrapped.option = names[0];
    wrapped.cause = error;
    throw wrapped;
  }
}

function boundedNumberArg(args, names, fallback, min = 1, max = 50) {
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

function uniqueStrings(values = []) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function targetNodeIds(args) {
  return uniqueStrings([
    ...collectRepeatedValues(args, ["--target-node-id", "--targetNodeId"]),
    ...collectCsvValues(args, ["--target-node-ids", "--targetNodeIds"])
  ]);
}

function sourceTargetNodeIds(args) {
  return uniqueStrings([
    ...collectRepeatedValues(args, ["--source-target-node-id", "--sourceTargetNodeId"]),
    ...collectCsvValues(args, ["--source-target-node-ids", "--sourceTargetNodeIds"])
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

function inputFromArgs(args) {
  const jsonInput = parseJsonArg(args, ["--input-json", "--inputJson"], {});
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], jsonInput.workspaceId || jsonInput.workspace_id || "");
  const explicitTargetNodeIds = targetNodeIds(args);
  const explicitSourceTargetNodeIds = sourceTargetNodeIds(args);
  return stripUndefined(Object.assign({}, jsonInput, {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], jsonInput.learnerId || jsonInput.learner_id || "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], jsonInput.programId || jsonInput.program_id || ""),
    proposalId: firstArgValue(args, ["--proposal-id", "--proposalId"], jsonInput.proposalId || jsonInput.proposal_id || ""),
    planDraftId: firstArgValue(args, ["--plan-draft-id", "--planDraftId"], jsonInput.planDraftId || jsonInput.plan_draft_id || ""),
    selectedItemId: firstArgValue(args, ["--selected-item-id", "--selectedItemId", "--item-id", "--itemId"], jsonInput.selectedItemId || jsonInput.selected_item_id || jsonInput.itemId || jsonInput.item_id || ""),
    profileDeltaId: firstArgValue(args, ["--profile-delta-id", "--profileDeltaId"], jsonInput.profileDeltaId || jsonInput.profile_delta_id || ""),
    evidenceId: firstArgValue(args, ["--evidence-id", "--evidenceId"], jsonInput.evidenceId || jsonInput.evidence_id || ""),
    correctionId: firstArgValue(args, ["--correction-id", "--correctionId"], jsonInput.correctionId || jsonInput.correction_id || ""),
    sourceId: firstArgValue(args, ["--source-id", "--sourceId"], jsonInput.sourceId || jsonInput.source_id || ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], jsonInput.domainPackId || jsonInput.domain_pack_id || ""),
    domain: firstArgValue(args, ["--domain"], jsonInput.domain || ""),
    subject: firstArgValue(args, ["--subject"], jsonInput.subject || ""),
    horizon: firstArgValue(args, ["--horizon"], jsonInput.horizon || "daily_plan") || "daily_plan",
    limit: boundedNumberArg(args, ["--limit"], jsonInput.limit || 5, 1, 50),
    auditLimit: boundedNumberArg(args, ["--audit-limit", "--auditLimit"], jsonInput.auditLimit || jsonInput.audit_limit || 20, 1, 50),
    targetNodeIds: explicitTargetNodeIds.length ? explicitTargetNodeIds : jsonInput.targetNodeIds || jsonInput.target_node_ids,
    sourceTargetNodeIds: explicitSourceTargetNodeIds.length ? explicitSourceTargetNodeIds : jsonInput.sourceTargetNodeIds || jsonInput.source_target_node_ids,
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy"], jsonInput.requestedBy || jsonInput.requested_by || "")
  }));
}

function projectSchedulerDryRunSmokeReadback(result = {}, input = {}) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const summary = objectOnly(readback.summary);
  const candidates = asArray(readback.candidates);
  const wouldPublish = candidates.filter((item) => item && item.wouldPublish === true);
  const blocked = candidates.filter((item) => String(item && item.decision || "").startsWith("blocked"));
  const skipped = candidates.filter((item) => String(item && item.decision || "").startsWith("skipped"));
  const candidateProposalIds = uniqueStrings(candidates.map((item) => cleanString(item && item.proposalId, 180))).slice(0, 24);
  return Object.assign({}, readback, {
    schedulerDryRunStatus: cleanString(readback.ok === false ? readback.error || "failed" : "complete", 140),
    schedulerDryRunOk: readback.ok !== false,
    schedulerDryRunDryRun: readback.dryRun === true,
    schedulerDryRunWritePlanned: readback.writePlanned === true,
    schedulerDryRunWritesPerformed: readback.writesPerformed === true,
    schedulerDryRunPublishPlanned: readback.publishPlanned === true,
    schedulerDryRunWorkspaceId: cleanString(readback.workspaceId || input.workspaceId, 160),
    schedulerDryRunLearnerId: cleanString(readback.learnerId || input.learnerId, 160),
    schedulerDryRunProgramId: cleanString(readback.programId || input.programId, 160),
    schedulerDryRunDomainPackId: cleanString(input.domainPackId, 180),
    schedulerDryRunDomain: cleanString(input.domain, 120),
    schedulerDryRunSubject: cleanString(input.subject, 120),
    schedulerDryRunHorizon: cleanString(input.horizon, 80),
    schedulerDryRunProposalId: cleanString(input.proposalId, 180),
    schedulerDryRunPlanDraftId: cleanString(input.planDraftId, 180),
    schedulerDryRunSelectedItemId: cleanString(input.selectedItemId, 180),
    schedulerDryRunTargetNodeIds: uniqueStrings(asArray(input.targetNodeIds)).slice(0, 24),
    schedulerDryRunSourceTargetNodeIds: uniqueStrings(asArray(input.sourceTargetNodeIds)).slice(0, 24),
    schedulerDryRunCount: numberValue(readback.count, candidates.length),
    schedulerDryRunInspectedCount: numberValue(summary.inspected, candidates.length),
    schedulerDryRunWouldPublishCount: numberValue(summary.wouldPublish, wouldPublish.length),
    schedulerDryRunBlockedCount: numberValue(summary.blocked, blocked.length),
    schedulerDryRunSkippedCount: numberValue(summary.skipped, skipped.length),
    schedulerDryRunCandidateProposalIds: candidateProposalIds,
    schedulerDryRunWouldPublishProposalIds: uniqueStrings(wouldPublish.map((item) => cleanString(item && item.proposalId, 180))).slice(0, 24),
    schedulerDryRunBlockedProposalIds: uniqueStrings(blocked.map((item) => cleanString(item && item.proposalId, 180))).slice(0, 24),
    schedulerDryRunSkippedProposalIds: uniqueStrings(skipped.map((item) => cleanString(item && item.proposalId, 180))).slice(0, 24),
    schedulerDryRunDecisions: uniqueStrings(candidates.map((item) => cleanString(item && item.decision, 120))).slice(0, 16),
    schedulerDryRunSafeToPublishCount: candidates.filter((item) => item && item.safeToPublish === true).length,
    schedulerDryRunPrivacyFindingCount: asArray(readback.privacyFindings).length,
    schedulerDryRunWritefulSchedulingAllowed: false,
    schedulerDryRunSchedulerExecutionAllowed: false,
    schedulerDryRunRuntimeConfigChange: false,
    schedulerDryRunConfigChangeApplied: false
  });
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
      error: error.code || "scheduler_dry_run_smoke_parse_failed",
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
  const result = projectSchedulerDryRunSmokeReadback(
    services.learningAutomationSchedulerService.dryRun(input),
    input
  );
  process.stdout.write(formatResult(result, pretty));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "scheduler_dry_run_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  projectSchedulerDryRunSmokeReadback,
  sourceTargetNodeIds,
  targetNodeIds
};
