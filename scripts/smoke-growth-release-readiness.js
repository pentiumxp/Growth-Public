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
    wrapped.code = "release_readiness_smoke_invalid_json";
    wrapped.option = names[0];
    wrapped.cause = error;
    throw wrapped;
  }
}

function numberArg(args, names, fallback) {
  const value = Number(firstArgValue(args, names, ""));
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(100, Math.round(value)));
}

function evidenceFlag(args, name) {
  return hasFlag(args, name) || hasFlag(args, name.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase()));
}

function approvalFlag(args, name) {
  return evidenceFlag(args, name);
}

function evidenceFromArgs(args) {
  const evidence = Object.assign({}, parseJsonArg(args, ["--evidence-json", "--evidenceJson"], {}));
  if (evidenceFlag(args, "--owner-daily-ui-evidence")) evidence.ownerDailyUiEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--owner-audit-ui-evidence")) evidence.ownerAuditUiEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--stage-checkpoint-evidence")) evidence.stageCheckpointEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--proposal-review-ui-evidence")) evidence.proposalReviewUiEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--automation-digest-ui-evidence")) evidence.automationDigestUiEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--automation-action-handoff-ui-evidence")) evidence.automationActionHandoffUiEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--scheduler-execution-ui-evidence")) evidence.schedulerExecutionUiEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--scheduler-run-ui-evidence")) evidence.schedulerRunUiEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--scheduler-worker-target-ui-evidence")) evidence.schedulerWorkerTargetUiEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--production-action-handoff-smoke-evidence")) evidence.productionActionHandoffSmokeEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--production-scheduler-execution-smoke-evidence")) evidence.productionSchedulerExecutionSmokeEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--production-scheduler-run-smoke-evidence")) evidence.productionSchedulerRunSmokeEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--production-scheduler-worker-target-smoke-evidence")) evidence.productionSchedulerWorkerTargetSmokeEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--production-scheduler-worker-smoke-evidence")) evidence.productionSchedulerWorkerSmokeEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--production-planner-readiness-evidence")) evidence.productionPlannerReadinessEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--production-daily-loop-preview-smoke-evidence")) evidence.productionDailyLoopPreviewSmokeEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--production-daily-loop-write-smoke-evidence")) evidence.productionDailyLoopWriteSmokeEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--platform-action-evidence")) evidence.platformActionEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--central-visual-evidence")) evidence.centralVisualEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  return evidence;
}

function releaseApprovalFromArgs(args) {
  const approval = Object.assign({}, parseJsonArg(args, ["--release-approval-json", "--releaseApprovalJson"], {}));
  if (approvalFlag(args, "--writeful-execution-approval")) approval.writefulExecutionApproval = { approved: true, source: "release_readiness_smoke_flag" };
  if (approvalFlag(args, "--background-scheduler-approval")) approval.backgroundSchedulerApproval = { approved: true, source: "release_readiness_smoke_flag" };
  if (approvalFlag(args, "--background-worker-approval")) approval.backgroundWorkerApproval = { approved: true, source: "release_readiness_smoke_flag" };
  return approval;
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
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], "");
  return stripUndefined({
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], ""),
    domain: firstArgValue(args, ["--domain"], ""),
    subject: firstArgValue(args, ["--subject"], ""),
    horizon: firstArgValue(args, ["--horizon"], "daily_plan") || "daily_plan",
    limit: numberArg(args, ["--limit"], 5),
    evidence: evidenceFromArgs(args),
    releaseApproval: releaseApprovalFromArgs(args),
    requestedBy: firstArgValue(args, ["--created-by", "--createdBy", "--requested-by", "--requestedBy"], ""),
    createdAt: firstArgValue(args, ["--created-at", "--createdAt"], "")
  });
}

function shouldWriteSnapshot(args) {
  return hasFlag(args, "--write-snapshot") || hasFlag(args, "--writeSnapshot");
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
      error: error.code || "release_readiness_smoke_parse_failed",
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
  const service = services.learningAutomationReleaseReadinessService;
  const result = shouldWriteSnapshot(args)
    ? service.createSnapshot(input)
    : service.evaluateReadiness(input);
  process.stdout.write(formatResult(result, pretty));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "release_readiness_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  evidenceFromArgs,
  inputFromArgs,
  releaseApprovalFromArgs,
  shouldWriteSnapshot
};
