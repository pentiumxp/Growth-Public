"use strict";

const crypto = require("node:crypto");
const { cleanString } = require("./core");

function sha256Hex(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function stableAudioBlobId(recordType, recordId) {
  const hash = sha256Hex(`${recordType}:${recordId}`).slice(0, 18);
  return `gaudio_${hash}`;
}

function stableSubmissionId(input = {}) {
  const explicit = cleanString(input.submissionId || input.submission_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId),
    cleanString(input.taskCardId),
    cleanString(input.submittedAt),
    cleanString(input.text),
    cleanString(input.audio?.digest)
  ].join(":");
  return `lsub_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableEvaluationJobId(submissionId) {
  return `lgjob_${sha256Hex(cleanString(submissionId)).slice(0, 18)}`;
}

function stableEvaluationId(submissionId) {
  return `lgeval_${sha256Hex(cleanString(submissionId)).slice(0, 18)}`;
}

function stableSessionId(submissionId) {
  return `lsess_${sha256Hex(cleanString(submissionId)).slice(0, 18)}`;
}

function stableReflectionId(input = {}) {
  const explicit = cleanString(input.reflectionId || input.reflection_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId),
    cleanString(input.taskCardId),
    cleanString(input.submittedAt),
    cleanString(input.text),
    cleanString(input.audio?.digest)
  ].join(":");
  return `lrefl_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function stableRewardSettlementId(evaluationId) {
  return `lrwd_${sha256Hex(cleanString(evaluationId)).slice(0, 18)}`;
}

function stableLearningCoinLedgerEntryId(idempotencyKey) {
  return `lcoin_${sha256Hex(cleanString(idempotencyKey)).slice(0, 18)}`;
}

module.exports = {
  sha256Hex,
  stableAudioBlobId,
  stableEvaluationId,
  stableEvaluationJobId,
  stableLearningCoinLedgerEntryId,
  stableReflectionId,
  stableRewardSettlementId,
  stableSessionId,
  stableSubmissionId
};
