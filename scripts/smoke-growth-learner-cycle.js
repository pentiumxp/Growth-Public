"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const OPERATIONS = new Set(["audit", "submit", "evaluate", "reflect", "full"]);
const WRITE_OPERATIONS = new Set(["submit", "evaluate", "reflect", "full"]);

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
    wrapped.code = "learner_cycle_smoke_invalid_json";
    wrapped.option = names[0];
    wrapped.cause = error;
    throw wrapped;
  }
}

function boundedNumberArg(args, names, fallback, min = 1, max = 50) {
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

function countArray(value) {
  return asArray(value).filter(Boolean).length;
}

function uniqueBoundedStrings(values = [], maxItems = 12) {
  return Array.from(new Set(asArray(values)
    .map((value) => cleanString(value, 160))
    .filter(Boolean)))
    .slice(0, maxItems);
}

function countQueueStatus(results = [], status) {
  return asArray(results).filter((item) => objectOnly(item).status === status).length;
}

function countFindingFailures(findings = []) {
  return asArray(findings).filter((finding) => objectOnly(finding).ok === false).length;
}

function projectLearnerCycleSmokeReadback(result = {}) {
  const cycle = objectOnly(result);
  if (!Object.keys(cycle).length) return result;
  const target = objectOnly(cycle.target);
  const card = objectOnly(cycle.card);
  const latestEvaluationJob = objectOnly(card.latestEvaluationJob);
  const submission = objectOnly(cycle.submission);
  const submissionEvaluationJob = objectOnly(submission.evaluationJob);
  const evaluationQueue = objectOnly(cycle.evaluationQueue);
  const evaluationResults = asArray(evaluationQueue.results);
  const reflection = objectOnly(cycle.reflection);
  const cycleAudit = objectOnly(cycle.cycleAudit);
  const cycleAuditSummary = objectOnly(cycleAudit.summary);
  const completeness = objectOnly(cycle.completeness);
  const completenessSummary = objectOnly(completeness.summary);
  const targetNodeIds = uniqueBoundedStrings(target.targetNodeIds);
  const missingRequired = uniqueBoundedStrings(completenessSummary.missingRequired);
  return Object.assign({}, cycle, {
    learnerCycleStatus: cleanString(cycle.ok === false ? cycle.error || "failed" : "pass", 140),
    learnerCycleOk: cycle.ok !== false,
    learnerCycleOperation: cleanString(cycle.operation, 80),
    learnerCycleStoppedAt: cleanString(cycle.stoppedAt, 80),
    learnerCycleWriteOperation: WRITE_OPERATIONS.has(cleanString(cycle.operation, 80)),
    learnerCycleTargetWorkspaceId: cleanString(target.workspaceId, 160),
    learnerCycleTargetLearnerId: cleanString(target.learnerId, 160),
    learnerCycleProgramId: cleanString(target.programId, 160),
    learnerCycleTaskCardId: cleanString(target.taskCardId, 180),
    learnerCyclePlanDraftId: cleanString(target.planDraftId, 180),
    learnerCycleDomainPackId: cleanString(target.domainPackId, 160),
    learnerCycleDomain: cleanString(target.domain, 120),
    learnerCycleSubject: cleanString(target.subject, 120),
    learnerCycleTargetNodeIds: targetNodeIds,
    learnerCycleTargetNodeCount: targetNodeIds.length,
    learnerCycleCardAvailable: Boolean(card.taskCardId),
    learnerCycleCardStatus: cleanString(card.status, 120),
    learnerCycleCardLaneId: cleanString(card.laneId, 120),
    learnerCycleCardPrimaryAction: cleanString(card.primaryAction, 120),
    learnerCycleLatestEvaluationJobStatus: cleanString(latestEvaluationJob.status, 120),
    learnerCycleLatestEvaluationJobAttemptCount: Number(latestEvaluationJob.attemptCount || 0) || 0,
    learnerCycleLatestEvaluationJobRetryable: latestEvaluationJob.retryable === true,
    learnerCycleLatestEvaluationJobFailedVisible: latestEvaluationJob.failedVisible === true,
    learnerCycleSubmissionAvailable: Boolean(submission.submissionId),
    learnerCycleSubmissionId: cleanString(submission.submissionId, 180),
    learnerCycleSubmissionStatus: cleanString(submission.status, 120),
    learnerCycleSubmissionKind: cleanString(submission.submissionKind, 120),
    learnerCycleSubmissionHasAudio: submission.hasAudio === true,
    learnerCycleSubmissionEvaluationJobStatus: cleanString(submissionEvaluationJob.status, 120),
    learnerCycleEvaluationQueueAvailable: evaluationQueue.available !== false && Object.keys(evaluationQueue).length > 0,
    learnerCycleEvaluationProcessedCount: Number(evaluationQueue.processed || 0) || 0,
    learnerCycleEvaluationResultCount: countArray(evaluationResults),
    learnerCycleEvaluationDoneCount: countQueueStatus(evaluationResults, "done"),
    learnerCycleEvaluationFailedCount: countQueueStatus(evaluationResults, "failed"),
    learnerCycleReflectionAvailable: Boolean(reflection.reflectionId),
    learnerCycleReflectionId: cleanString(reflection.reflectionId, 180),
    learnerCycleReflectionStatus: cleanString(reflection.status, 120),
    learnerCycleReflectionMode: cleanString(reflection.mode, 120),
    learnerCycleReflectionHasAudio: reflection.hasAudio === true,
    learnerCycleAuditAvailable: cycleAudit.available !== false && Object.keys(cycleAudit).length > 0,
    learnerCycleAuditPlanDraftCount: Number(cycleAuditSummary.planDraftCount || 0) || 0,
    learnerCycleAuditEvidenceCount: Number(cycleAuditSummary.evidenceCount || 0) || 0,
    learnerCycleAuditProfileDeltaCount: Number(cycleAuditSummary.profileDeltaCount || 0) || 0,
    learnerCycleAuditCorrectionCount: Number(cycleAuditSummary.correctionCount || 0) || 0,
    learnerCycleAuditHasPublishedPlan: cycleAuditSummary.hasPublishedPlan === true,
    learnerCycleAuditHasEvaluationEvidence: cycleAuditSummary.hasEvaluationEvidence === true,
    learnerCycleAuditHasProfileDelta: cycleAuditSummary.hasProfileDelta === true,
    learnerCycleAuditLatestActivityAt: cleanString(cycleAuditSummary.latestActivityAt, 180),
    learnerCycleAuditPartialFailureCount: countArray(cycleAudit.partialFailures),
    learnerCycleAuditTimelineCount: countArray(cycleAudit.timeline),
    learnerCycleCompletenessAvailable: completeness.available !== false && Object.keys(completeness).length > 0,
    learnerCycleComplete: completeness.complete === true,
    learnerCycleReadyForAutomation: completeness.readyForAutomation === true,
    learnerCycleRequiredCount: Number(completenessSummary.requiredCount || 0) || 0,
    learnerCycleSatisfiedRequiredCount: Number(completenessSummary.satisfiedRequiredCount || 0) || 0,
    learnerCycleMissingRequired: missingRequired,
    learnerCycleMissingRequiredCount: missingRequired.length,
    learnerCyclePlanPublished: completenessSummary.planPublished === true,
    learnerCycleEvaluationEvidence: completenessSummary.evaluationEvidence === true,
    learnerCycleProfileDelta: completenessSummary.profileDelta === true,
    learnerCycleOwnerCorrectionAvailable: completenessSummary.ownerCorrectionAvailable === true,
    learnerCycleFindingCount: countArray(completeness.findings),
    learnerCycleFailedFindingCount: countFindingFailures(completeness.findings)
  });
}

function operationFromArgs(args) {
  const operation = firstArgValue(args, ["--operation", "--mode"], "audit").trim().toLowerCase();
  return operation || "audit";
}

function allowWrite(args) {
  return hasFlag(args, "--allow-write") || hasFlag(args, "--allowWrite");
}

function inputFromArgs(args) {
  const jsonInput = parseJsonArg(args, ["--input-json", "--inputJson"], {});
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], jsonInput.workspaceId || jsonInput.workspace_id || "");
  const explicitTargetNodeIds = targetNodeIds(args);
  return stripUndefined(Object.assign({}, jsonInput, {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], jsonInput.learnerId || jsonInput.learner_id || "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], jsonInput.programId || jsonInput.program_id || ""),
    taskCardId: firstArgValue(args, ["--task-card-id", "--taskCardId"], jsonInput.taskCardId || jsonInput.task_card_id || jsonInput.cardId || jsonInput.card_id || ""),
    planDraftId: firstArgValue(args, ["--plan-draft-id", "--planDraftId"], jsonInput.planDraftId || jsonInput.plan_draft_id || ""),
    evaluationId: firstArgValue(args, ["--evaluation-id", "--evaluationId"], jsonInput.evaluationId || jsonInput.evaluation_id || ""),
    profileDeltaId: firstArgValue(args, ["--profile-delta-id", "--profileDeltaId"], jsonInput.profileDeltaId || jsonInput.profile_delta_id || ""),
    evidenceId: firstArgValue(args, ["--evidence-id", "--evidenceId"], jsonInput.evidenceId || jsonInput.evidence_id || ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], jsonInput.domainPackId || jsonInput.domain_pack_id || ""),
    domain: firstArgValue(args, ["--domain"], jsonInput.domain || ""),
    subject: firstArgValue(args, ["--subject"], jsonInput.subject || ""),
    text: firstArgValue(args, ["--text", "--submission", "--answer"], jsonInput.text || jsonInput.submission || jsonInput.answer || ""),
    reflection: firstArgValue(args, ["--reflection", "--reflection-text", "--reflectionText"], jsonInput.reflection || jsonInput.reflectionText || jsonInput.reflection_text || ""),
    author: firstArgValue(args, ["--author"], jsonInput.author || ""),
    submittedAt: firstArgValue(args, ["--submitted-at", "--submittedAt"], jsonInput.submittedAt || jsonInput.submitted_at || ""),
    reflectedAt: firstArgValue(args, ["--reflected-at", "--reflectedAt"], jsonInput.reflectedAt || jsonInput.reflected_at || jsonInput.reflectionSubmittedAt || jsonInput.reflection_submitted_at || ""),
    limit: boundedNumberArg(args, ["--limit"], jsonInput.limit || 12, 1, 50),
    evaluationLimit: boundedNumberArg(args, ["--evaluation-limit", "--evaluationLimit"], jsonInput.evaluationLimit || jsonInput.evaluation_limit || 10, 1, 50),
    targetNodeIds: explicitTargetNodeIds.length ? explicitTargetNodeIds : jsonInput.targetNodeIds || jsonInput.target_node_ids,
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy"], jsonInput.requestedBy || jsonInput.requested_by || "")
  }));
}

function validateOperation(operation, input = {}, args = []) {
  if (!OPERATIONS.has(operation)) {
    return {
      ok: false,
      error: "learner_cycle_smoke_operation_invalid",
      operation,
      allowedOperations: Array.from(OPERATIONS)
    };
  }
  if (WRITE_OPERATIONS.has(operation) && !allowWrite(args)) {
    return {
      ok: false,
      error: "learner_cycle_smoke_write_not_allowed",
      operation,
      requiredFlag: "--allow-write"
    };
  }
  if (!input.workspaceId) {
    return { ok: false, error: "workspace_id_required" };
  }
  if (["submit", "reflect", "full"].includes(operation) && !input.taskCardId) {
    return { ok: false, error: "task_card_id_required", operation };
  }
  if (["submit", "full"].includes(operation) && !input.text) {
    return { ok: false, error: "submission_text_required", operation };
  }
  if (["reflect", "full"].includes(operation) && !input.reflection) {
    return { ok: false, error: "reflection_text_required", operation };
  }
  return { ok: true };
}

async function runOperation(services, operation, input) {
  const service = services.learningLearnerCycleService;
  if (operation === "submit") return service.submit(input);
  if (operation === "evaluate") return service.evaluate(input);
  if (operation === "reflect") return service.reflect(input);
  if (operation === "full") return service.full(input);
  return service.audit(input);
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
      error: error.code || "learner_cycle_smoke_parse_failed",
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
  const result = projectLearnerCycleSmokeReadback(await runOperation(services, operation, input));
  process.stdout.write(formatResult(result, pretty));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "learner_cycle_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  allowWrite,
  inputFromArgs,
  operationFromArgs,
  projectLearnerCycleSmokeReadback,
  runOperation,
  targetNodeIds,
  validateOperation
};
