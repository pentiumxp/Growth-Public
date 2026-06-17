"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");
const {
  inputFromArgs: learningLoopStateInputFromArgs,
  targetNodeIds
} = require("./smoke-growth-learning-loop-state");

function argValue(args, name, fallback = "") {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  return String(args[index + 1] || fallback);
}

function firstArgValue(args, names, fallback = "") {
  for (const name of names) {
    const value = argValue(args, name, "");
    if (value) return value;
  }
  return fallback;
}

function hasFlag(args, name) {
  return args.includes(name);
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

function assessmentCoverageNodeIds(args) {
  return uniqueStrings([
    ...collectRepeatedValues(args, ["--assessment-coverage-node-id", "--assessmentCoverageNodeId"]),
    ...collectCsvValues(args, ["--assessment-coverage-node-ids", "--assessmentCoverageNodeIds"])
  ]);
}

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function inputFromArgs(args) {
  const base = learningLoopStateInputFromArgs(args);
  const coverage = assessmentCoverageNodeIds(args);
  return Object.assign({}, base, {
    operation: firstArgValue(args, ["--operation"], "recommend") || "recommend",
    action: firstArgValue(args, ["--action", "--next-action", "--nextAction"], ""),
    allowWrite: hasFlag(args, "--allow-write") || hasFlag(args, "--allowWrite"),
    allowStageActivation: hasFlag(args, "--allow-stage-activation") || hasFlag(args, "--allowStageActivation"),
    confirmStageAssessment: hasFlag(args, "--confirm-stage-assessment") || hasFlag(args, "--confirmStageAssessment"),
    activationReason: firstArgValue(args, ["--activation-reason", "--activationReason"], ""),
    assessmentCoverageNodeIds: coverage.length ? coverage : base.assessmentCoverageNodeIds
  });
}

function projectLearningOperatingLoopSmokeReadback(result = {}) {
  const output = objectOnly(result);
  if (!Object.keys(output).length) return result;
  const summary = objectOnly(output.summary);
  const target = objectOnly(output.target || output.state?.target || output.before?.target);
  const scope = objectOnly(output.scope || output.state?.scope || output.before?.scope);
  const state = objectOnly(output.state);
  const before = objectOnly(output.before);
  const after = objectOnly(output.after);
  const nextAction = objectOnly(output.nextAction || state.nextAction || before.nextAction);
  const nextActionAfter = objectOnly(output.nextActionAfter || after.nextAction);
  const actionResult = objectOnly(output.actionResult);
  const fields = {
    operatingLoopStatus: cleanString(output.status || summary.status, 120),
    operatingLoopOperation: cleanString(output.operation, 80),
    operatingLoopWritePerformed: output.writePerformed === true || summary.writePerformed === true,
    operatingLoopActionExecuted: output.actionExecuted === true,
    operatingLoopExecutedAction: cleanString(output.executedAction || summary.executedAction, 140),
    operatingLoopExecutionMode: cleanString(output.executionMode || summary.executionMode, 140),
    operatingLoopBeforeStatus: cleanString(before.status || summary.beforeStatus || state.status, 120),
    operatingLoopAfterStatus: cleanString(after.status || summary.afterStatus, 120),
    operatingLoopNextAction: cleanString(nextAction.action || summary.nextAction, 140),
    operatingLoopNextActionEnabled: nextAction.enabled !== false,
    operatingLoopNextActionAfter: cleanString(nextActionAfter.action, 140),
    operatingLoopConfirmationRequired: output.confirmationRequired === true,
    operatingLoopError: cleanString(output.error, 180),
    operatingLoopTargetWorkspaceId: cleanString(target.workspaceId, 160),
    operatingLoopTargetLearnerId: cleanString(target.learnerId, 160),
    operatingLoopProgramId: cleanString(scope.programId, 160),
    operatingLoopDomainPackId: cleanString(scope.domainPackId, 160),
    operatingLoopDomain: cleanString(scope.domain, 120),
    operatingLoopSubject: cleanString(scope.subject, 120),
    operatingLoopHorizon: cleanString(scope.horizon, 80),
    operatingLoopTaskCardId: cleanString(actionResult.taskCardId || summary.taskCardId, 160),
    operatingLoopPlanDraftId: cleanString(actionResult.planDraftId || summary.planDraftId, 160),
    operatingLoopStageAssessmentCycleId: cleanString(actionResult.cycleId || summary.stageAssessmentCycleId, 160)
  };
  return Object.assign({}, output, fields);
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
      error: error.code || "operating_loop_smoke_parse_failed",
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
  const operation = cleanString(input.operation || "recommend", 80);
  const config = readEnv(process.env);
  const services = createServices(config);
  let result;
  if (["recommend", "state", "preview"].includes(operation)) {
    result = services.learningOperatingLoopService.recommend(input);
  } else if (["run-next", "run_next", "advance"].includes(operation)) {
    if (!input.allowWrite) {
      result = {
        ok: false,
        source: "growth-learning-operating-loop-smoke",
        schemaVersion: "growth.learningOperatingLoopSmoke.v1",
        privacyClass: "summary_only",
        summaryOnly: true,
        status: "blocked",
        error: "operating_loop_write_requires_allow_write",
        writePerformed: false
      };
      process.stdout.write(formatResult(projectLearningOperatingLoopSmokeReadback(result), pretty));
      process.exitCode = 2;
      return;
    }
    result = await services.learningOperatingLoopService.runNext(input);
  } else {
    result = {
      ok: false,
      source: "growth-learning-operating-loop-smoke",
      schemaVersion: "growth.learningOperatingLoopSmoke.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      status: "blocked",
      error: "operating_loop_operation_invalid",
      operation,
      allowedOperations: ["recommend", "state", "preview", "run-next", "run_next", "advance"],
      writePerformed: false
    };
    process.stdout.write(formatResult(projectLearningOperatingLoopSmokeReadback(result), pretty));
    process.exitCode = 2;
    return;
  }
  const output = projectLearningOperatingLoopSmokeReadback(result);
  process.stdout.write(formatResult(output, pretty));
  process.exitCode = output.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "operating_loop_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  assessmentCoverageNodeIds,
  inputFromArgs,
  projectLearningOperatingLoopSmokeReadback,
  targetNodeIds
};
