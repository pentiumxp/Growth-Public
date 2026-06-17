"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  createLearningAutomationReleaseEvidenceBundleService
} = require("../src/services/learning-automation-release-evidence-bundle-service");
const {
  UI_EVIDENCE_COLLECTION_TASKS
} = require("../src/services/learning-automation-ui-evidence-task-registry");
const {
  createLearningAutomationReleaseEvidenceArtifactManifestService
} = require("../src/services/learning-automation-release-evidence-artifact-manifest-service");

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

function csvValues(text = "") {
  return String(text || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function collectCsvValues(args, names) {
  return csvValues(firstArgValue(args, names, ""));
}

function uniqueStrings(values = []) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
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

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function uniqueBoundedStrings(values = [], limit = 32) {
  return uniqueStrings(asArray(values)).slice(0, limit);
}

function numberArg(args, names, fallback) {
  const raw = firstArgValue(args, names, "");
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(60, Math.round(value)));
}

function recordLimitArg(args, names, fallback) {
  const raw = firstArgValue(args, names, "");
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(100, Math.round(value)));
}

function targetNodeIds(args) {
  return uniqueStrings([
    ...collectRepeatedValues(args, ["--target-node-id", "--targetNodeId"]),
    ...collectCsvValues(args, ["--target-node-ids", "--targetNodeIds"])
  ]);
}

function taskIds(args) {
  return uniqueStrings([
    ...collectRepeatedValues(args, ["--task", "--task-id", "--taskId"]),
    ...collectCsvValues(args, ["--tasks", "--task-ids", "--taskIds"])
  ]);
}

function activationGates(args) {
  return uniqueStrings([
    ...collectRepeatedValues(args, ["--activation-gate", "--activationGate"]),
    ...collectCsvValues(args, ["--activation-gates", "--activationGates"])
  ]);
}

function requiredApprovalKeys(args) {
  return uniqueStrings([
    ...collectRepeatedValues(args, ["--required-approval-key", "--requiredApprovalKey"]),
    ...collectCsvValues(args, ["--required-approval-keys", "--requiredApprovalKeys"])
  ]);
}

function uiEvidenceFileInputFromArgs(args) {
  const output = {};
  for (const task of UI_EVIDENCE_COLLECTION_TASKS) {
    const names = [task.fileFlag, `--${task.fileField}`];
    if (task.evidenceKey === "releasePackageReviewUiEvidence") {
      names.push("--ui-evidence-file", "--uiEvidenceFile");
    }
    output[task.fileField] = firstArgValue(args, names, "");
  }
  return output;
}

function releaseEvidenceArtifactManifestFileFromArgs(args) {
  return firstArgValue(args, [
    "--release-evidence-artifact-manifest-file",
    "--releaseEvidenceArtifactManifestFile",
    "--evidence-artifact-manifest-file",
    "--evidenceArtifactManifestFile",
    "--ui-evidence-manifest-file",
    "--uiEvidenceManifestFile"
  ], "");
}

function applyArtifactManifestInput(input) {
  const service = createLearningAutomationReleaseEvidenceArtifactManifestService({
    readFile: fs.readFileSync
  });
  const result = service.applyToInput(input);
  if (result.ok) return result.input;
  return Object.assign({}, input, {
    releaseEvidenceArtifactManifestError: result.error,
    invalidArtifactManifestEntries: result.invalidEntries || []
  });
}

function inputFromArgs(args) {
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], "");
  const input = Object.assign({
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], ""),
    domain: firstArgValue(args, ["--domain"], ""),
    subject: firstArgValue(args, ["--subject"], ""),
    horizon: firstArgValue(args, ["--horizon"], "daily_plan") || "daily_plan",
    availableMinutes: numberArg(args, ["--available-minutes", "--availableMinutes"], 15),
    limit: numberArg(args, ["--limit"], 12),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy"], ""),
    createdAt: firstArgValue(args, ["--created-at", "--createdAt"], ""),
    targetNodeIds: targetNodeIds(args),
    tasks: taskIds(args),
    autoSelectCompletedCycle: hasFlag(args, "--auto-select-completed-cycle") || hasFlag(args, "--autoSelectCompletedCycle"),
    autoSelectLatestCompletedCycle: hasFlag(args, "--auto-select-latest-completed-cycle") || hasFlag(args, "--autoSelectLatestCompletedCycle"),
    taskCardId: firstArgValue(args, ["--task-card-id", "--taskCardId"], ""),
    collectionRunId: firstArgValue(args, ["--collection-run-id", "--collectionRunId", "--run-id", "--runId"], ""),
    evaluationId: firstArgValue(args, ["--evaluation-id", "--evaluationId"], ""),
    profileDeltaId: firstArgValue(args, ["--profile-delta-id", "--profileDeltaId"], ""),
    evidenceId: firstArgValue(args, ["--evidence-id", "--evidenceId"], ""),
    correctionId: firstArgValue(args, ["--correction-id", "--correctionId"], ""),
    sourceId: firstArgValue(args, ["--source-id", "--sourceId"], ""),
    learnerCycleOperation: firstArgValue(args, ["--learner-cycle-operation", "--learnerCycleOperation"], "audit") || "audit",
    operatingLoopRunStatus: firstArgValue(args, ["--operating-loop-run-status", "--operatingLoopRunStatus"], ""),
    operatingLoopAction: firstArgValue(args, ["--operating-loop-action", "--operatingLoopAction"], ""),
    operatingLoopRunId: firstArgValue(args, ["--operating-loop-run-id", "--operatingLoopRunId"], ""),
    allowWriteEvidence: hasFlag(args, "--allow-write-evidence") || hasFlag(args, "--allowWriteEvidence"),
    dailyLoopWriteOperation: firstArgValue(args, ["--daily-loop-write-operation", "--dailyLoopWriteOperation"], "draft") || "draft",
    planDraftId: firstArgValue(args, ["--plan-draft-id", "--planDraftId"], ""),
    visualPluginId: firstArgValue(args, ["--visual-plugin-id", "--visualPluginId", "--plugin-id", "--pluginId"], "growth") || "growth",
    visualScenario: firstArgValue(args, ["--visual-scenario", "--visualScenario", "--scenario"], "embedded-plugin-shell") || "embedded-plugin-shell",
    centralVisualEvidenceFile: firstArgValue(args, ["--central-visual-evidence-file", "--centralVisualEvidenceFile"], ""),
    activationGates: activationGates(args),
    requiredApprovalKeys: requiredApprovalKeys(args),
    activationRecordLimit: recordLimitArg(args, ["--activation-record-limit", "--activationRecordLimit"], 20),
    runtimeEnablementRecordLimit: recordLimitArg(args, ["--runtime-enablement-record-limit", "--runtimeEnablementRecordLimit"], 20),
    ownerDailyUiEvidence: hasFlag(args, "--owner-daily-ui-evidence") || hasFlag(args, "--ownerDailyUiEvidence"),
    ownerAuditUiEvidence: hasFlag(args, "--owner-audit-ui-evidence") || hasFlag(args, "--ownerAuditUiEvidence"),
    stageCheckpointEvidence: hasFlag(args, "--stage-checkpoint-evidence") || hasFlag(args, "--stageCheckpointEvidence"),
    proposalReviewUiEvidence: hasFlag(args, "--proposal-review-ui-evidence") || hasFlag(args, "--proposalReviewUiEvidence"),
    releasePackageReviewUiEvidence: hasFlag(args, "--release-package-review-ui-evidence") || hasFlag(args, "--releasePackageReviewUiEvidence"),
    automationDigestUiEvidence: hasFlag(args, "--automation-digest-ui-evidence") || hasFlag(args, "--automationDigestUiEvidence"),
    automationActionHandoffUiEvidence: hasFlag(args, "--automation-action-handoff-ui-evidence") || hasFlag(args, "--automationActionHandoffUiEvidence"),
    schedulerExecutionUiEvidence: hasFlag(args, "--scheduler-execution-ui-evidence") || hasFlag(args, "--schedulerExecutionUiEvidence"),
    schedulerRunUiEvidence: hasFlag(args, "--scheduler-run-ui-evidence") || hasFlag(args, "--schedulerRunUiEvidence"),
    schedulerWorkerTargetUiEvidence: hasFlag(args, "--scheduler-worker-target-ui-evidence") || hasFlag(args, "--schedulerWorkerTargetUiEvidence")
  }, uiEvidenceFileInputFromArgs(args));
  const manifestFile = releaseEvidenceArtifactManifestFileFromArgs(args);
  if (manifestFile) {
    input.releaseEvidenceArtifactManifestFile = manifestFile;
  }
  return applyArtifactManifestInput(input);
}

function outputFileFromArgs(args) {
  return firstArgValue(args, ["--output-file", "--outputFile"], "");
}

function writeJsonFile(filePath, value) {
  const resolved = path.resolve(filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return resolved;
}

function formatResult(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

function compactTaskStatus(task = {}) {
  const item = objectOnly(task);
  if (!Object.keys(item).length) return null;
  return {
    taskId: cleanString(item.taskId, 140),
    evidenceKey: cleanString(item.evidenceKey, 180),
    status: cleanString(item.status, 120),
    ok: item.ok === true
  };
}

function releaseEvidenceBundleReadbackFields(bundle = {}, result = {}) {
  const summary = objectOnly(bundle.summary);
  const scope = objectOnly(bundle.scope);
  const evidence = objectOnly(bundle.evidence);
  const releaseApproval = objectOnly(bundle.releaseApproval);
  const tasks = asArray(bundle.tasks).map(compactTaskStatus).filter(Boolean);
  const failedTaskIds = uniqueBoundedStrings(
    summary.failedTaskIds || tasks.filter((task) => task.ok !== true).map((task) => task.taskId),
    40
  );
  const blockedCount = numberValue(summary.blockedCount, tasks.filter((task) => task.ok !== true).length);
  const passedCount = numberValue(summary.passedCount, tasks.filter((task) => task.ok === true).length);
  return {
    releaseEvidenceBundleStatus: cleanString(result.ok === false || blockedCount > 0 ? "blocked" : "pass", 120),
    releaseEvidenceBundleOk: typeof result.ok === "boolean" ? result.ok : blockedCount === 0,
    releaseEvidenceBundleSchemaVersion: cleanString(bundle.schemaVersion, 180),
    releaseEvidenceBundlePrivacyClass: cleanString(bundle.privacyClass, 80),
    releaseEvidenceBundleSummaryOnly: bundle.summaryOnly === true || bundle.summary_only === true,
    releaseEvidenceBundleCreatedAt: cleanString(bundle.createdAt, 120),
    releaseEvidenceBundleRequestedBy: cleanString(bundle.requestedBy, 160),
    releaseEvidenceBundleWorkspaceId: cleanString(scope.workspaceId, 160),
    releaseEvidenceBundleLearnerId: cleanString(scope.learnerId, 160),
    releaseEvidenceBundleProgramId: cleanString(scope.programId, 160),
    releaseEvidenceBundleDomainPackId: cleanString(scope.domainPackId, 180),
    releaseEvidenceBundleDomain: cleanString(scope.domain, 120),
    releaseEvidenceBundleSubject: cleanString(scope.subject, 120),
    releaseEvidenceBundleHorizon: cleanString(scope.horizon, 80),
    releaseEvidenceBundleTargetNodeIds: uniqueBoundedStrings(scope.targetNodeIds, 24),
    releaseEvidenceBundleTaskCount: numberValue(summary.taskCount, tasks.length),
    releaseEvidenceBundlePassedCount: passedCount,
    releaseEvidenceBundleBlockedCount: blockedCount,
    releaseEvidenceBundleFailedTaskIds: failedTaskIds,
    releaseEvidenceBundleTaskIds: uniqueBoundedStrings(tasks.map((task) => task.taskId), 40),
    releaseEvidenceBundleTaskStatuses: tasks.slice(0, 40),
    releaseEvidenceBundleEvidenceKeys: uniqueBoundedStrings(Object.keys(evidence), 48),
    releaseEvidenceBundleEvidenceKeyCount: Object.keys(evidence).length,
    releaseEvidenceBundleReleaseApprovalKeys: uniqueBoundedStrings(Object.keys(releaseApproval), 12),
    releaseEvidenceBundleReleaseApprovalKeyCount: Object.keys(releaseApproval).length,
    releaseEvidenceBundleWritefulSchedulingAllowed: bundle.writefulSchedulingAllowed === true || summary.writefulSchedulingAllowed === true,
    releaseEvidenceBundleRuntimeConfigChange: bundle.runtimeConfigChange === true || summary.runtimeConfigChange === true,
    releaseEvidenceBundleConfigChangeApplied: bundle.configChangeApplied === true || summary.configChangeApplied === true,
    releaseEvidenceBundleSchedulerPermissionGranted: bundle.schedulerPermissionGranted === true || summary.schedulerPermissionGranted === true
  };
}

function projectReleaseEvidenceBundleSmokeReadback(result = {}) {
  const readback = objectOnly(result);
  const nestedBundle = objectOnly(readback.bundle);
  const directBundle = objectOnly(result);
  const bundle = nestedBundle.schemaVersion ? nestedBundle : directBundle.schemaVersion ? directBundle : {};
  if (!Object.keys(bundle).length) return result;
  const fields = releaseEvidenceBundleReadbackFields(bundle, readback);
  const projectedBundle = Object.assign({}, bundle, fields);
  if (nestedBundle.schemaVersion) {
    return Object.assign({}, readback, fields, {
      bundle: projectedBundle
    });
  }
  return projectedBundle;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json") || hasFlag(args, "--pretty");
  const failOnBlocked = hasFlag(args, "--fail-on-blocked") || hasFlag(args, "--failOnBlocked");
  const repoRoot = path.join(__dirname, "..");
  const input = inputFromArgs(args);
  if (input.releaseEvidenceArtifactManifestError) {
    process.stdout.write(formatResult({
      ok: false,
      error: input.releaseEvidenceArtifactManifestError,
      invalidArtifactManifestEntries: input.invalidArtifactManifestEntries || []
    }, pretty));
    process.exitCode = 2;
    return;
  }
  const service = createLearningAutomationReleaseEvidenceBundleService({
    repoRoot,
    runCommand(command, commandArgs, options) {
      return spawnSync(command, commandArgs, Object.assign({}, options, {
        env: process.env,
        encoding: "utf8"
      }));
    }
  });
  const result = projectReleaseEvidenceBundleSmokeReadback(service.buildBundle(input));
  if (!result.ok && !result.bundle) {
    process.stdout.write(formatResult({
      ok: false,
      error: result.error,
      invalidTaskIds: result.invalidTaskIds || [],
      allowedTaskIds: result.allowedTaskIds || []
    }, pretty));
    process.exitCode = 2;
    return;
  }
  const outputFile = outputFileFromArgs(args);
  if (outputFile) {
    const writtenPath = writeJsonFile(outputFile, result.bundle);
    if (hasFlag(args, "--result-json")) {
      process.stdout.write(formatResult({
        ok: result.ok,
        outputFile: writtenPath,
        summary: result.summary,
        releaseEvidenceBundleStatus: result.releaseEvidenceBundleStatus,
        releaseEvidenceBundleOk: result.releaseEvidenceBundleOk,
        releaseEvidenceBundleTaskCount: result.releaseEvidenceBundleTaskCount,
        releaseEvidenceBundlePassedCount: result.releaseEvidenceBundlePassedCount,
        releaseEvidenceBundleBlockedCount: result.releaseEvidenceBundleBlockedCount,
        releaseEvidenceBundleFailedTaskIds: result.releaseEvidenceBundleFailedTaskIds,
        releaseEvidenceBundleEvidenceKeys: result.releaseEvidenceBundleEvidenceKeys
      }, pretty));
    } else {
      process.stdout.write(formatResult(result.bundle, pretty));
    }
  } else if (hasFlag(args, "--result-json")) {
    process.stdout.write(formatResult(result, pretty));
  } else {
    process.stdout.write(formatResult(result.bundle, pretty));
  }
  process.exitCode = failOnBlocked && !result.ok ? 1 : 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "release_evidence_bundle_build_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  outputFileFromArgs,
  projectReleaseEvidenceBundleSmokeReadback,
  activationGates,
  requiredApprovalKeys,
  releaseEvidenceArtifactManifestFileFromArgs,
  taskIds,
  targetNodeIds
};
