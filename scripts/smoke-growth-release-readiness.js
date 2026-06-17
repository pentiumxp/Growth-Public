"use strict";

const fs = require("node:fs");
const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");
const { UI_GATE_SPECS } = require("../src/services/learning-automation-ui-evidence-service");

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

function boundedCountValue(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function evidenceFlag(args, name) {
  return hasFlag(args, name) || hasFlag(args, name.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase()));
}

function deprecatedUiEvidenceFlag(evidenceKey) {
  const spec = UI_GATE_SPECS[evidenceKey] || {};
  return {
    ok: false,
    status: "blocked",
    source: "release_readiness_smoke_flag_deprecated",
    evidenceKey,
    checkKey: spec.checkKey || "",
    error: "validated_ui_evidence_summary_required",
    readyForReleaseEvidence: false
  };
}

function deprecatedReleaseEvidenceFlag(evidenceKey, checkKey, error, requiredAction) {
  return {
    ok: false,
    status: "blocked",
    source: "release_readiness_smoke_flag_deprecated",
    evidenceKey,
    checkKey,
    error,
    requiredAction,
    readyForReleaseEvidence: false
  };
}

const DEPRECATED_RELEASE_EVIDENCE_FLAGS = [
  ["--stage-checkpoint-evidence", "stageCheckpointEvidence", "stage_checkpoint_evidence"],
  ["--stage-checkpoint-controls-evidence", "stageCheckpointControlsEvidence", "stage_checkpoint_controls_evidence"],
  ["--production-proposal-smoke-evidence", "productionProposalSmokeEvidence", "production_proposal_smoke_evidence"],
  ["--production-action-handoff-smoke-evidence", "productionActionHandoffSmokeEvidence", "production_action_handoff_smoke_evidence"],
  ["--production-scheduler-execution-smoke-evidence", "productionSchedulerExecutionSmokeEvidence", "production_scheduler_execution_smoke_evidence"],
  ["--production-scheduler-run-smoke-evidence", "productionSchedulerRunSmokeEvidence", "production_scheduler_run_smoke_evidence"],
  ["--production-scheduler-worker-target-smoke-evidence", "productionSchedulerWorkerTargetSmokeEvidence", "production_scheduler_worker_target_smoke_evidence"],
  ["--production-scheduler-worker-smoke-evidence", "productionSchedulerWorkerSmokeEvidence", "production_scheduler_worker_smoke_evidence"],
  ["--production-planner-readiness-evidence", "productionPlannerReadinessEvidence", "production_planner_readiness_evidence"],
  ["--production-target-provisioning-smoke-evidence", "productionTargetProvisioningSmokeEvidence", "production_target_provisioning_smoke_evidence"],
  ["--production-daily-loop-preview-smoke-evidence", "productionDailyLoopPreviewSmokeEvidence", "production_daily_loop_preview_smoke_evidence"],
  ["--production-learning-loop-state-smoke-evidence", "productionLearningLoopStateSmokeEvidence", "production_learning_loop_state_smoke_evidence"],
  ["--production-operating-loop-history-smoke-evidence", "productionOperatingLoopHistorySmokeEvidence", "production_operating_loop_history_smoke_evidence"],
  ["--production-cycle-history-smoke-evidence", "productionCycleHistorySmokeEvidence", "production_cycle_history_smoke_evidence"],
  ["--production-owner-audit-smoke-evidence", "productionOwnerAuditSmokeEvidence", "production_owner_audit_smoke_evidence"],
  ["--production-owner-audit-review-smoke-evidence", "productionOwnerAuditReviewSmokeEvidence", "production_owner_audit_review_smoke_evidence"],
  ["--production-profile-feedback-smoke-evidence", "productionProfileFeedbackSmokeEvidence", "production_profile_feedback_smoke_evidence"],
  ["--production-recommendation-lifecycle-smoke-evidence", "productionRecommendationLifecycleSmokeEvidence", "production_recommendation_lifecycle_smoke_evidence"],
  ["--production-daily-loop-write-smoke-evidence", "productionDailyLoopWriteSmokeEvidence", "production_daily_loop_write_smoke_evidence"],
  ["--production-learner-cycle-smoke-evidence", "productionLearnerCycleSmokeEvidence", "production_learner_cycle_smoke_evidence"],
  ["--production-scheduler-dry-run-smoke-evidence", "productionSchedulerDryRunSmokeEvidence", "production_scheduler_dry_run_smoke_evidence"],
  ["--release-evidence-bundle-audit", "releaseEvidenceBundleAudit", "release_evidence_bundle_audit"],
  ["--platform-action-evidence", "platformActionEvidence", "platform_action_evidence"],
  ["--central-visual-evidence", "centralVisualEvidence", "central_visual_evidence"],
  [
    "--release-workbench-evidence",
    "releaseWorkbenchSmokeEvidence",
    "release_workbench_smoke_evidence",
    "validated_release_workbench_evidence_required",
    "provide_validated_release_workbench_evidence"
  ],
  [["--owner-review-evidence", "--owner-review-evidence-smoke"], "ownerReviewEvidence", "owner_review_evidence"]
];

function applyDeprecatedUiEvidenceFlag(args, evidence, flagName, evidenceKey) {
  if (evidenceFlag(args, flagName)) evidence[evidenceKey] = deprecatedUiEvidenceFlag(evidenceKey);
}

function applyDeprecatedReleaseEvidenceFlag(args, evidence, flagNames, evidenceKey, checkKey, error, requiredAction) {
  const names = Array.isArray(flagNames) ? flagNames : [flagNames];
  if (!names.some((name) => evidenceFlag(args, name))) return;
  evidence[evidenceKey] = deprecatedReleaseEvidenceFlag(
    evidenceKey,
    checkKey,
    error || `validated_${checkKey}_required`,
    requiredAction || `provide_validated_${checkKey}`
  );
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

function evidenceBundleReadbackFromArgs(bundle = {}) {
  if (!bundle || !Object.keys(bundle).length) return undefined;
  const schemaVersion = objectValue(bundle, ["schemaVersion", "schema_version"], "");
  const bundleId = objectValue(bundle, ["bundleId", "bundle_id", "evidenceBundleId", "evidence_bundle_id", "id"], "");
  const status = objectValue(bundle, ["status"], "");
  const summary = objectOnly(bundle.summary);
  const taskCount = boundedCountValue(bundle.taskCount ?? bundle.task_count ?? summary.taskCount ?? summary.task_count, 0);
  const passCount = boundedCountValue(bundle.passCount ?? bundle.pass_count ?? summary.passCount ?? summary.pass_count, 0);
  const createdAt = objectValue(bundle, ["createdAt", "created_at"], "");
  const requestedBy = objectValue(bundle, ["requestedBy", "requested_by", "createdBy", "created_by"], "");
  if (!schemaVersion && !bundleId && !status && taskCount === 0 && passCount === 0 && !createdAt && !requestedBy) return undefined;
  return stripUndefined({
    schemaVersion: schemaVersion || RELEASE_EVIDENCE_BUNDLE_SCHEMA,
    bundleId,
    status,
    source: "release_readiness_smoke_evidence_bundle",
    taskCount,
    passCount,
    createdAt,
    requestedBy
  });
}

function evidenceFromArgs(args, bundle = evidenceBundleFromArgs(args)) {
  const evidence = Object.assign({}, objectOnly(bundle.evidence), parseJsonArg(args, ["--evidence-json", "--evidenceJson"], {}));
  applyDeprecatedUiEvidenceFlag(args, evidence, "--owner-daily-ui-evidence", "ownerDailyUiEvidence");
  applyDeprecatedUiEvidenceFlag(args, evidence, "--owner-audit-ui-evidence", "ownerAuditUiEvidence");
  applyDeprecatedUiEvidenceFlag(args, evidence, "--proposal-review-ui-evidence", "proposalReviewUiEvidence");
  applyDeprecatedUiEvidenceFlag(args, evidence, "--release-package-review-ui-evidence", "releasePackageReviewUiEvidence");
  applyDeprecatedUiEvidenceFlag(args, evidence, "--automation-digest-ui-evidence", "automationDigestUiEvidence");
  applyDeprecatedUiEvidenceFlag(args, evidence, "--automation-action-handoff-ui-evidence", "automationActionHandoffUiEvidence");
  applyDeprecatedUiEvidenceFlag(args, evidence, "--scheduler-execution-ui-evidence", "schedulerExecutionUiEvidence");
  applyDeprecatedUiEvidenceFlag(args, evidence, "--scheduler-run-ui-evidence", "schedulerRunUiEvidence");
  applyDeprecatedUiEvidenceFlag(args, evidence, "--scheduler-worker-target-ui-evidence", "schedulerWorkerTargetUiEvidence");
  for (const [flagNames, evidenceKey, checkKey, error, requiredAction] of DEPRECATED_RELEASE_EVIDENCE_FLAGS) {
    applyDeprecatedReleaseEvidenceFlag(args, evidence, flagNames, evidenceKey, checkKey, error, requiredAction);
  }
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

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function compactAction(value = {}) {
  const action = objectOnly(value);
  if (!Object.keys(action).length) return null;
  return {
    key: cleanString(action.key || action.checkKey || action.check_key || action.evidenceKey || action.evidence_key, 140),
    status: cleanString(action.status, 80),
    label: cleanString(action.label, 160),
    action: cleanString(action.action || action.type || action.reason, 160),
    requiredActor: cleanString(action.requiredActor || action.required_actor || action.actor || "owner", 80),
    evidencePresent: action.evidencePresent === true
  };
}

function countFromArrayOrValue(value, fallback = 0) {
  if (Array.isArray(value)) return value.length;
  return boundedCountValue(value, fallback);
}

function projectReleaseReadinessSmokeReadback(result = {}) {
  const summary = objectOnly(result.summary);
  const summaryCounts = objectOnly(summary.counts);
  const releaseReview = objectOnly(result.releaseReview);
  const evidenceReadback = objectOnly(result.evidenceReadback);
  const sourceBundle = objectOnly(evidenceReadback.sourceBundle);
  return Object.assign({}, result, {
    releaseReadinessStatus: cleanString(summary.status || result.status, 120),
    readyForOwnerLoop: summary.readyForOwnerLoop === true,
    readyForReleaseReview: releaseReview.readyForReleaseReview === true || summary.readyForReleaseReview === true,
    releaseReviewAdvisoryOnly: releaseReview.advisoryOnly === true,
    writefulSchedulingAllowed: releaseReview.writefulSchedulingAllowed === true
      || summary.writefulSchedulingAllowed === true
      || objectOnly(result.config).writefulSchedulingAllowed === true,
    passCheckCount: boundedCountValue(summaryCounts.pass, 0),
    missingRequiredCount: asArray(summary.missingRequired).length,
    missingCheckCount: countFromArrayOrValue(releaseReview.missingCheckKeys, summaryCounts.missing),
    blockedCheckCount: countFromArrayOrValue(releaseReview.blockedCheckKeys, summaryCounts.blocked),
    missingEvidenceCount: countFromArrayOrValue(releaseReview.missingEvidenceKeys, 0),
    persistedEvidenceKeyCount: asArray(releaseReview.persistedEvidenceKeys).length,
    persistedApprovalKeyCount: asArray(releaseReview.persistedApprovalKeys).length,
    requiredActionCount: boundedCountValue(releaseReview.requiredActionCount, asArray(releaseReview.requiredActions).length),
    nextRequiredAction: compactAction(releaseReview.nextAction),
    evidenceReadbackEvidenceCount: boundedCountValue(evidenceReadback.evidenceCount, asArray(evidenceReadback.items).length),
    evidenceReadbackPresentCount: boundedCountValue(evidenceReadback.presentCount, 0),
    evidenceReadbackMissingCount: boundedCountValue(evidenceReadback.missingCount, 0),
    evidenceReadbackSourceBundleStatus: cleanString(sourceBundle.status, 120),
    evidenceReadbackSourceBundleId: cleanString(sourceBundle.bundleId || sourceBundle.evidenceBundleId || sourceBundle.id, 180)
  });
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
    evidenceBundleReadback: evidenceBundleReadbackFromArgs(bundle),
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

function runOperation(service, input, writeSnapshot = false) {
  const result = writeSnapshot
    ? service.createSnapshot(input)
    : service.evaluateReadiness(input);
  return projectReleaseReadinessSmokeReadback(result);
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
  const result = runOperation(service, input, shouldWriteSnapshot(args));
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
  projectReleaseReadinessSmokeReadback,
  releaseApprovalFromArgs,
  runOperation,
  shouldWriteSnapshot
};
