"use strict";

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

const WRITE_OPERATIONS = new Set(["record", "review"]);

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
    wrapped.code = "owner_audit_review_smoke_invalid_json";
    wrapped.option = names[0];
    wrapped.cause = error;
    throw wrapped;
  }
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

function uniqueStrings(values = [], max = 12) {
  return Array.from(new Set((Array.isArray(values) ? values : [values])
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean))).slice(0, max);
}

function targetNodeIds(args) {
  return uniqueStrings([
    ...collectRepeatedValues(args, ["--target-node-id", "--targetNodeId"]),
    ...collectCsvValues(args, ["--target-node-ids", "--targetNodeIds"])
  ], 16);
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

function stripUndefined(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stripUndefined);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined && item !== "")
      .map(([key, item]) => [key, stripUndefined(item)])
  );
}

function boundedNumberArg(args, names, fallback, min = 1, max = 60) {
  const raw = firstArgValue(args, names, "");
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function operationFromArgs(args) {
  const raw = firstArgValue(args, ["--operation", "--op"], "list").toLowerCase().replace(/-/g, "_");
  if (["list", "reviews", "history"].includes(raw)) return "list";
  if (["record", "review"].includes(raw)) return "record";
  return raw || "list";
}

function inputFromArgs(args) {
  const jsonInput = parseJsonArg(args, ["--input-json", "--inputJson"], {});
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], jsonInput.workspaceId || jsonInput.workspace_id || "");
  const explicitTargetNodeIds = targetNodeIds(args);
  const autoSelectCompletedCycle = hasFlag(args, "--auto-select-completed-cycle")
    || hasFlag(args, "--autoSelectCompletedCycle")
    || jsonInput.autoSelectCompletedCycle === true
    || jsonInput.auto_select_completed_cycle === true;
  const autoSelectLatestCompletedCycle = hasFlag(args, "--auto-select-latest-completed-cycle")
    || hasFlag(args, "--autoSelectLatestCompletedCycle")
    || jsonInput.autoSelectLatestCompletedCycle === true
    || jsonInput.auto_select_latest_completed_cycle === true;
  return stripUndefined(Object.assign({}, jsonInput, {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], jsonInput.learnerId || jsonInput.learner_id || "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], jsonInput.programId || jsonInput.program_id || ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], jsonInput.domainPackId || jsonInput.domain_pack_id || ""),
    domain: firstArgValue(args, ["--domain"], jsonInput.domain || ""),
    subject: firstArgValue(args, ["--subject"], jsonInput.subject || ""),
    horizon: firstArgValue(args, ["--horizon"], jsonInput.horizon || "daily_plan") || "daily_plan",
    reviewId: firstArgValue(args, ["--review-id", "--reviewId", "--owner-audit-review-id"], jsonInput.reviewId || jsonInput.review_id || jsonInput.ownerAuditReviewId || ""),
    decision: firstArgValue(args, ["--decision", "--review-decision", "--reviewDecision"], jsonInput.decision || jsonInput.reviewDecision || jsonInput.review_decision || "accepted"),
    status: firstArgValue(args, ["--status", "--review-status", "--reviewStatus"], jsonInput.status || jsonInput.reviewStatus || jsonInput.review_status || ""),
    ownerNote: firstArgValue(args, ["--owner-note", "--ownerNote", "--note"], jsonInput.ownerNote || jsonInput.owner_note || jsonInput.note || ""),
    planDraftId: firstArgValue(args, ["--plan-draft-id", "--planDraftId"], jsonInput.planDraftId || jsonInput.plan_draft_id || ""),
    taskCardId: firstArgValue(args, ["--task-card-id", "--taskCardId"], jsonInput.taskCardId || jsonInput.task_card_id || ""),
    evaluationId: firstArgValue(args, ["--evaluation-id", "--evaluationId"], jsonInput.evaluationId || jsonInput.evaluation_id || ""),
    profileDeltaId: firstArgValue(args, ["--profile-delta-id", "--profileDeltaId"], jsonInput.profileDeltaId || jsonInput.profile_delta_id || ""),
    evidenceId: firstArgValue(args, ["--evidence-id", "--evidenceId"], jsonInput.evidenceId || jsonInput.evidence_id || ""),
    correctionId: firstArgValue(args, ["--correction-id", "--correctionId"], jsonInput.correctionId || jsonInput.correction_id || ""),
    sourceId: firstArgValue(args, ["--source-id", "--sourceId"], jsonInput.sourceId || jsonInput.source_id || ""),
    targetNodeIds: explicitTargetNodeIds.length ? explicitTargetNodeIds : jsonInput.targetNodeIds || jsonInput.target_node_ids,
    availableMinutes: boundedNumberArg(args, ["--available-minutes", "--availableMinutes"], jsonInput.availableMinutes || jsonInput.available_minutes || 15, 1, 60),
    limit: boundedNumberArg(args, ["--limit"], jsonInput.limit || 20, 1, 100),
    autoSelectCompletedCycle: autoSelectCompletedCycle || undefined,
    autoSelectLatestCompletedCycle: autoSelectLatestCompletedCycle || undefined,
    reviewedBy: firstArgValue(args, ["--reviewed-by", "--reviewedBy"], jsonInput.reviewedBy || jsonInput.reviewed_by || ""),
    requestedBy: firstArgValue(args, ["--requested-by", "--requestedBy"], jsonInput.requestedBy || jsonInput.requested_by || "")
  }));
}

function validateOperation(operation, input, args) {
  if (!["list", "record"].includes(operation)) return { ok: false, error: "owner_audit_review_smoke_operation_invalid", operation };
  if (WRITE_OPERATIONS.has(operation) && !hasFlag(args, "--allow-write")) {
    return { ok: false, error: "owner_audit_review_smoke_write_requires_allow_write", operation };
  }
  if (operation === "record" && !input.decision) return { ok: false, error: "owner_audit_review_smoke_decision_required" };
  return { ok: true };
}

function statusForResult(result = {}) {
  if (result.ok === false) return cleanString(result.error || "failed", 140);
  if (result.operation === "record") return cleanString(objectOnly(result.review).status || "reviewed", 120);
  return "listed";
}

function projectOwnerAuditReviewSmokeReadback(result = {}) {
  const payload = objectOnly(result);
  if (!Object.keys(payload).length) return result;
  const operation = cleanString(payload.operation, 80);
  const review = objectOnly(payload.review);
  const list = objectOnly(payload.list || payload);
  const reviews = asArray(list.reviews);
  const latestReview = review.reviewId ? review : objectOnly(reviews[0]);
  const feedback = objectOnly(payload.profileFeedback || latestReview.feedbackSummary);
  const feedbackSummary = objectOnly(feedback.summary || latestReview.feedbackSummary);
  const auditSummary = objectOnly(payload.auditSummary || latestReview.auditSummary);
  const recommendation = objectOnly(payload.recommendation || latestReview.recommendation);
  const nextAction = objectOnly(payload.nextAction || latestReview.nextAction);
  const scope = objectOnly(payload.scope || latestReview.selector);
  const targetNodeIdsValue = uniqueStrings(scope.targetNodeIds || latestReview.targetNodeIds, 16);
  const missingRequired = uniqueStrings(feedbackSummary.missingRequired, 12);
  return Object.assign({}, payload, {
    ownerAuditReviewOperation: operation,
    ownerAuditReviewStatus: statusForResult(payload),
    ownerAuditReviewWriteOperation: WRITE_OPERATIONS.has(operation),
    ownerAuditReviewReviewId: cleanString(latestReview.reviewId, 180),
    ownerAuditReviewDecision: cleanString(payload.decision || latestReview.decision, 120),
    ownerAuditReviewRecordStatus: cleanString(payload.status || latestReview.status, 120),
    ownerAuditReviewDuplicate: payload.duplicate === true,
    ownerAuditReviewTargetWorkspaceId: cleanString(scope.workspaceId || latestReview.workspaceId, 160),
    ownerAuditReviewTargetLearnerId: cleanString(scope.learnerId || latestReview.learnerId, 160),
    ownerAuditReviewProgramId: cleanString(scope.programId || latestReview.programId, 160),
    ownerAuditReviewDomainPackId: cleanString(scope.domainPackId || latestReview.domainPackId, 160),
    ownerAuditReviewDomain: cleanString(scope.domain || latestReview.domain, 120),
    ownerAuditReviewSubject: cleanString(scope.subject || latestReview.subject, 120),
    ownerAuditReviewHorizon: cleanString(scope.horizon || latestReview.horizon, 80),
    ownerAuditReviewPlanDraftId: cleanString(scope.planDraftId || latestReview.planDraftId, 180),
    ownerAuditReviewTaskCardId: cleanString(scope.taskCardId || latestReview.taskCardId, 180),
    ownerAuditReviewEvaluationId: cleanString(scope.evaluationId || latestReview.evaluationId, 180),
    ownerAuditReviewProfileDeltaId: cleanString(scope.profileDeltaId || latestReview.profileDeltaId, 180),
    ownerAuditReviewEvidenceId: cleanString(scope.evidenceId || latestReview.evidenceId, 180),
    ownerAuditReviewCorrectionId: cleanString(scope.correctionId || latestReview.correctionId, 180),
    ownerAuditReviewTargetNodeIds: targetNodeIdsValue,
    ownerAuditReviewTargetNodeCount: targetNodeIdsValue.length,
    ownerAuditReviewCount: Number(list.count || reviews.length || 0) || 0,
    ownerAuditReviewLatestOwnerNotePresent: Boolean(cleanString(latestReview.ownerNote, 1)),
    ownerAuditReviewProfileFeedbackOk: feedback.ok === true || feedbackSummary.status === "pass",
    ownerAuditReviewProfileFeedbackStatus: cleanString(feedback.status || feedbackSummary.status, 120),
    ownerAuditReviewCycleComplete: feedbackSummary.cycleComplete === true,
    ownerAuditReviewReadyForNextPlan: feedbackSummary.readyForNextPlan === true,
    ownerAuditReviewReadyForAutomation: feedbackSummary.readyForAutomation === true,
    ownerAuditReviewEvidenceCount: Number(feedbackSummary.evidenceCount || 0) || 0,
    ownerAuditReviewProfileDeltaCount: Number(feedbackSummary.profileDeltaCount || 0) || 0,
    ownerAuditReviewRewardSettlementCount: Number(feedbackSummary.rewardSettlementCount || 0) || 0,
    ownerAuditReviewTotalRewardCoins: Number(feedbackSummary.totalRewardCoins || 0) || 0,
    ownerAuditReviewCheckCount: Number(auditSummary.checkCount || 0) || 0,
    ownerAuditReviewPassCheckCount: Number(auditSummary.passCheckCount || 0) || 0,
    ownerAuditReviewMissingCheckCount: Number(auditSummary.missingCheckCount || 0) || 0,
    ownerAuditReviewBlockedCheckCount: Number(auditSummary.blockedCheckCount || 0) || 0,
    ownerAuditReviewMissingRequired: missingRequired,
    ownerAuditReviewMissingRequiredCount: missingRequired.length,
    ownerAuditReviewRecommendationAvailable: recommendation.available === true,
    ownerAuditReviewRecommendationStrategy: cleanString(recommendation.strategy, 120),
    ownerAuditReviewRecommendationTargetNodeId: cleanString(recommendation.targetNodeId, 180),
    ownerAuditReviewNextAction: cleanString(nextAction.action || feedbackSummary.nextAction, 140),
    ownerAuditReviewNextActionEnabled: nextAction.enabled !== false,
    ownerAuditReviewReviewedBy: cleanString(latestReview.reviewedBy, 180),
    ownerAuditReviewCreatedAt: cleanString(latestReview.createdAt, 120)
  });
}

async function runOperation(services, operation, input) {
  const service = services.learningOwnerAuditReviewService;
  if (!service) return { ok: false, error: "owner_audit_review_service_unavailable", operation };
  if (operation === "record") {
    const review = typeof service.review === "function"
      ? service.review(input)
      : { ok: false, error: "owner_audit_review_record_unavailable" };
    const listInput = Object.assign({}, input, { reviewId: review.review?.reviewId || input.reviewId || "" });
    const list = typeof service.listReviews === "function"
      ? service.listReviews(listInput)
      : { ok: false, error: "owner_audit_review_list_unavailable" };
    return Object.assign({}, review, {
      operation: "record",
      list
    });
  }
  const list = typeof service.listReviews === "function"
    ? service.listReviews(input)
    : { ok: false, error: "owner_audit_review_list_unavailable" };
  return Object.assign({}, list, {
    operation: "list"
  });
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
      error: error.code || "owner_audit_review_smoke_parse_failed",
      option: error.option || ""
    }, pretty));
    process.exitCode = 2;
    return;
  }
  if (!input.workspaceId) {
    process.stdout.write(formatResult({ ok: false, error: "workspace_id_required" }, pretty));
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
  const result = projectOwnerAuditReviewSmokeReadback(await runOperation(services, operation, input));
  process.stdout.write(formatResult(result, pretty));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "owner_audit_review_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  operationFromArgs,
  projectOwnerAuditReviewSmokeReadback,
  runOperation,
  targetNodeIds,
  validateOperation
};
