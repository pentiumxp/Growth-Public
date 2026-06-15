"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  createLearningAutomationReleaseEvidenceBundleService
} = require("../src/services/learning-automation-release-evidence-bundle-service");

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

function inputFromArgs(args) {
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], "");
  return {
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
    taskCardId: firstArgValue(args, ["--task-card-id", "--taskCardId"], ""),
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
    centralVisualEvidenceFile: firstArgValue(args, ["--central-visual-evidence-file", "--centralVisualEvidenceFile"], "")
  };
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
  taskIds,
  targetNodeIds
};
