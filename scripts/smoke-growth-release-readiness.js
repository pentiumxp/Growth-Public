"use strict";

const fs = require("node:fs");
const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const RELEASE_EVIDENCE_BUNDLE_SCHEMA = "growth.learningAutomationReleaseEvidenceBundle.v1";
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;

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

function objectValue(input = {}, names = [], fallback = "") {
  if (!input || typeof input !== "object") return fallback;
  for (const name of names) {
    const value = input[name];
    if (value !== undefined && value !== null && value !== "") return String(value);
  }
  return fallback;
}

function parseJsonText(text, option, fallback = {}) {
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    const wrapped = new Error(`invalid_json:${option}`);
    wrapped.code = "release_readiness_smoke_invalid_json";
    wrapped.option = option;
    wrapped.cause = error;
    throw wrapped;
  }
}

function parseJsonArg(args, names, fallback = {}) {
  const text = firstArgValue(args, names, "");
  return parseJsonText(text, names[0], fallback);
}

function parseJsonFileArg(args, names, fallback = {}) {
  const filePath = firstArgValue(args, names, "");
  if (!filePath) return fallback;
  try {
    return parseJsonText(fs.readFileSync(filePath, "utf8"), names[0], fallback);
  } catch (error) {
    if (error.code === "release_readiness_smoke_invalid_json") throw error;
    const wrapped = new Error(`json_file_unreadable:${names[0]}`);
    wrapped.code = "release_readiness_smoke_json_file_unreadable";
    wrapped.option = names[0];
    wrapped.cause = error;
    throw wrapped;
  }
}

function numberArg(args, names, fallback) {
  const raw = firstArgValue(args, names, "");
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(100, Math.round(value)));
}

function boundedNumberValue(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.min(100, Math.round(numeric)));
}

function evidenceFlag(args, name) {
  return hasFlag(args, name) || hasFlag(args, name.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase()));
}

function approvalFlag(args, name) {
  return evidenceFlag(args, name);
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

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function mergeBundles(base = {}, override = {}) {
  const baseApproval = objectOnly(base.releaseApproval || base.release_approval || base.approvals);
  const overrideApproval = objectOnly(override.releaseApproval || override.release_approval || override.approvals);
  return Object.assign({}, base, override, {
    scope: Object.assign({}, objectOnly(base.scope), objectOnly(override.scope)),
    evidence: Object.assign({}, objectOnly(base.evidence), objectOnly(override.evidence)),
    releaseApproval: Object.assign({}, baseApproval, overrideApproval)
  });
}

function validateEvidenceBundle(bundle = {}, option = "--evidence-bundle-json") {
  if (!bundle || !Object.keys(bundle).length) return {};
  const schemaVersion = objectValue(bundle, ["schemaVersion", "schema_version"], "");
  if (schemaVersion && schemaVersion !== RELEASE_EVIDENCE_BUNDLE_SCHEMA) {
    const error = new Error(`unsupported_evidence_bundle_schema:${schemaVersion}`);
    error.code = "release_readiness_smoke_bundle_schema_unsupported";
    error.option = option;
    throw error;
  }
  const privacyClass = objectValue(bundle, ["privacyClass", "privacy_class"], "");
  if (bundle.summaryOnly === false || (privacyClass && privacyClass !== "summary_only")) {
    const error = new Error("evidence_bundle_not_summary_only");
    error.code = "release_readiness_smoke_bundle_not_summary_only";
    error.option = option;
    throw error;
  }
  const privacyFindings = scanPrivacy(bundle);
  if (privacyFindings.length) {
    const error = new Error("evidence_bundle_privacy_failed");
    error.code = "release_readiness_smoke_bundle_privacy_failed";
    error.option = option;
    error.privacyFindings = privacyFindings;
    throw error;
  }
  return bundle;
}

function evidenceBundleFromArgs(args) {
  const fromFile = parseJsonFileArg(args, ["--evidence-bundle-file", "--evidenceBundleFile"], {});
  const fromJson = parseJsonArg(args, ["--evidence-bundle-json", "--evidenceBundleJson"], {});
  return validateEvidenceBundle(mergeBundles(fromFile, fromJson), fromJson && Object.keys(fromJson).length ? "--evidence-bundle-json" : "--evidence-bundle-file");
}

function evidenceFromArgs(args, bundle = evidenceBundleFromArgs(args)) {
  const evidence = Object.assign({}, objectOnly(bundle.evidence), parseJsonArg(args, ["--evidence-json", "--evidenceJson"], {}));
  if (evidenceFlag(args, "--owner-daily-ui-evidence")) evidence.ownerDailyUiEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--owner-audit-ui-evidence")) evidence.ownerAuditUiEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--stage-checkpoint-evidence")) evidence.stageCheckpointEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--proposal-review-ui-evidence")) evidence.proposalReviewUiEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--production-proposal-smoke-evidence")) evidence.productionProposalSmokeEvidence = { ok: true, source: "release_readiness_smoke_flag" };
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
  if (evidenceFlag(args, "--production-learning-loop-state-smoke-evidence")) evidence.productionLearningLoopStateSmokeEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--production-cycle-history-smoke-evidence")) evidence.productionCycleHistorySmokeEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--production-owner-audit-smoke-evidence")) evidence.productionOwnerAuditSmokeEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--production-profile-feedback-smoke-evidence")) evidence.productionProfileFeedbackSmokeEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--production-daily-loop-write-smoke-evidence")) evidence.productionDailyLoopWriteSmokeEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--production-learner-cycle-smoke-evidence")) evidence.productionLearnerCycleSmokeEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--production-scheduler-dry-run-smoke-evidence")) evidence.productionSchedulerDryRunSmokeEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--release-evidence-bundle-audit")) evidence.releaseEvidenceBundleAudit = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--platform-action-evidence")) evidence.platformActionEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  if (evidenceFlag(args, "--central-visual-evidence")) evidence.centralVisualEvidence = { ok: true, source: "release_readiness_smoke_flag" };
  return evidence;
}

function releaseApprovalFromArgs(args, bundle = evidenceBundleFromArgs(args)) {
  const approval = Object.assign({}, objectOnly(bundle.releaseApproval), parseJsonArg(args, ["--release-approval-json", "--releaseApprovalJson"], {}));
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
  const bundle = evidenceBundleFromArgs(args);
  const scope = objectOnly(bundle.scope);
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], "")
    || objectValue(scope, ["workspaceId", "workspace_id"], "")
    || objectValue(bundle, ["workspaceId", "workspace_id"], "");
  return stripUndefined({
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], "")
      || objectValue(scope, ["learnerId", "learner_id"], "")
      || objectValue(bundle, ["learnerId", "learner_id"], "")
      || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], "")
      || objectValue(scope, ["programId", "program_id"], "")
      || objectValue(bundle, ["programId", "program_id"], ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], "")
      || objectValue(scope, ["domainPackId", "domain_pack_id"], "")
      || objectValue(bundle, ["domainPackId", "domain_pack_id"], ""),
    domain: firstArgValue(args, ["--domain"], "")
      || objectValue(scope, ["domain"], "")
      || objectValue(bundle, ["domain"], ""),
    subject: firstArgValue(args, ["--subject"], "")
      || objectValue(scope, ["subject"], "")
      || objectValue(bundle, ["subject"], ""),
    horizon: firstArgValue(args, ["--horizon"], "")
      || objectValue(scope, ["horizon"], "")
      || objectValue(bundle, ["horizon"], "")
      || "daily_plan",
    limit: numberArg(args, ["--limit"], boundedNumberValue(scope.limit || bundle.limit, 5)),
    evidence: evidenceFromArgs(args, bundle),
    releaseApproval: releaseApprovalFromArgs(args, bundle),
    requestedBy: firstArgValue(args, ["--created-by", "--createdBy", "--requested-by", "--requestedBy"], "")
      || objectValue(bundle, ["createdBy", "created_by", "requestedBy", "requested_by"], ""),
    createdAt: firstArgValue(args, ["--created-at", "--createdAt"], "")
      || objectValue(bundle, ["createdAt", "created_at"], "")
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
      option: error.option || "",
      privacyFindings: error.privacyFindings || undefined
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
  evidenceBundleFromArgs,
  evidenceFromArgs,
  inputFromArgs,
  releaseApprovalFromArgs,
  shouldWriteSnapshot
};
