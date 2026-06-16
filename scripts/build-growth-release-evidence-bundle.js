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

function inputFromArgs(args) {
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], "");
  return Object.assign({
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

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json") || hasFlag(args, "--pretty");
  const failOnBlocked = hasFlag(args, "--fail-on-blocked") || hasFlag(args, "--failOnBlocked");
  const repoRoot = path.join(__dirname, "..");
  const input = inputFromArgs(args);
  const service = createLearningAutomationReleaseEvidenceBundleService({
    repoRoot,
    runCommand(command, commandArgs, options) {
      return spawnSync(command, commandArgs, Object.assign({}, options, {
        env: process.env,
        encoding: "utf8"
      }));
    }
  });
  const result = service.buildBundle(input);
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
        summary: result.summary
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
  activationGates,
  requiredApprovalKeys,
  taskIds,
  targetNodeIds
};
