#!/usr/bin/env node
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

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanString(value, max = 180) {
  const text = String(value || "").trim();
  return text.length > max ? text.slice(0, max) : text;
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

function uniqueBoundedStrings(values = [], limit = 24) {
  return Array.from(new Set(asArray(values).map((value) => cleanString(value, 220)).filter(Boolean))).slice(0, limit);
}

function inputFromArgs(args) {
  const workspaceId = firstArgValue(args, ["--workspace-id", "--workspaceId"], "");
  const requiredApprovalKey = firstArgValue(args, ["--required-approval-key", "--requiredApprovalKey"], "");
  const requiredApprovalKeys = splitCsv(firstArgValue(args, ["--required-approval-keys", "--requiredApprovalKeys"], ""))
    .concat(requiredApprovalKey ? [requiredApprovalKey] : []);
  const activationGate = firstArgValue(args, ["--activation-gate", "--activationGate"], "");
  const activationGates = splitCsv(firstArgValue(args, ["--activation-gates", "--activationGates"], ""))
    .concat(activationGate ? [activationGate] : []);
  return {
    workspaceId,
    learnerId: firstArgValue(args, ["--learner-id", "--learnerId"], "") || workspaceId,
    programId: firstArgValue(args, ["--program-id", "--programId"], ""),
    domainPackId: firstArgValue(args, ["--domain-pack-id", "--domainPackId"], ""),
    domain: firstArgValue(args, ["--domain"], ""),
    subject: firstArgValue(args, ["--subject"], ""),
    horizon: firstArgValue(args, ["--horizon"], "daily_plan") || "daily_plan",
    limit: Number(firstArgValue(args, ["--limit", "--record-limit", "--recordLimit"], "5")) || 5,
    requiredApprovalKeys: requiredApprovalKeys.length ? requiredApprovalKeys : undefined,
    activationGates: activationGates.length ? activationGates : undefined
  };
}

function validateInput(input = {}) {
  if (!input.workspaceId) return { ok: false, error: "automation_owner_review_evidence_smoke_workspace_required" };
  return { ok: true };
}

function runOperation(service, input) {
  return service.evaluate(input);
}

function projectAutomationOwnerReviewEvidenceSmokeReadback(result = {}, input = {}) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const summary = objectOnly(readback.automationOwnerReviewEvidence);
  const nextAction = objectOnly(summary.nextAction);
  const releaseReadiness = objectOnly(readback.releaseReadiness);
  return Object.assign({}, readback, {
    automationOwnerReviewEvidenceStatus: cleanString(readback.ok === false ? readback.error || "failed" : readback.status || summary.status, 140),
    automationOwnerReviewEvidenceOk: readback.ok !== false,
    automationOwnerReviewEvidenceOperation: "owner-review-evidence",
    automationOwnerReviewEvidenceWorkspaceId: cleanString(readback.workspaceId || input.workspaceId, 160),
    automationOwnerReviewEvidenceLearnerId: cleanString(readback.learnerId || input.learnerId, 160),
    automationOwnerReviewEvidenceProgramId: cleanString(readback.programId || input.programId, 160),
    automationOwnerReviewEvidenceDomainPackId: cleanString(readback.domainPackId || input.domainPackId, 180),
    automationOwnerReviewEvidenceDomain: cleanString(readback.domain || input.domain, 120),
    automationOwnerReviewEvidenceSubject: cleanString(readback.subject || input.subject, 120),
    automationOwnerReviewEvidenceHorizon: cleanString(readback.horizon || input.horizon, 80),
    automationOwnerReviewEvidenceSchemaVersion: cleanString(readback.schemaVersion, 140),
    automationOwnerReviewEvidencePrivacyClass: cleanString(readback.privacyClass, 80),
    automationOwnerReviewEvidenceReadyForReleaseReview: readback.readyForReleaseReview === true,
    automationOwnerReviewEvidencePassedGateCount: numberValue(summary.passedGateCount, 0),
    automationOwnerReviewEvidenceMissingGateCount: numberValue(summary.missingGateCount, 0),
    automationOwnerReviewEvidenceRequiredActionCount: numberValue(summary.requiredActionCount, 0),
    automationOwnerReviewEvidencePassedGateKeys: uniqueBoundedStrings(summary.passedGateKeys, 32),
    automationOwnerReviewEvidenceMissingGateKeys: uniqueBoundedStrings(summary.missingGateKeys, 32),
    automationOwnerReviewEvidenceNextActionKey: cleanString(nextAction.key, 160),
    automationOwnerReviewEvidenceNextAction: cleanString(nextAction.action, 160),
    automationOwnerReviewEvidenceReleaseReadinessStatus: cleanString(summary.releaseReadinessStatus || releaseReadiness.status, 120),
    automationOwnerReviewEvidenceReleaseMissingCheckKeys: uniqueBoundedStrings(summary.releaseMissingCheckKeys || releaseReadiness.missingCheckKeys, 32),
    automationOwnerReviewEvidenceProposalCount: numberValue(summary.proposalCount, 0),
    automationOwnerReviewEvidenceProposedProposalCount: numberValue(summary.proposedProposalCount, 0),
    automationOwnerReviewEvidenceAcceptedProposalCount: numberValue(summary.acceptedProposalCount, 0),
    automationOwnerReviewEvidenceSkippedProposalCount: numberValue(summary.skippedProposalCount, 0),
    automationOwnerReviewEvidenceExpiredProposalCount: numberValue(summary.expiredProposalCount, 0),
    automationOwnerReviewEvidenceSupersededProposalCount: numberValue(summary.supersededProposalCount, 0),
    automationOwnerReviewEvidenceOwnerDecisionProposalCount: numberValue(summary.ownerDecisionProposalCount, 0),
    automationOwnerReviewEvidenceProposalExecutionCount: numberValue(summary.proposalExecutionCount, 0),
    automationOwnerReviewEvidencePublishedProposalExecutionCount: numberValue(summary.publishedProposalExecutionCount, 0),
    automationOwnerReviewEvidenceBlockedProposalExecutionCount: numberValue(summary.blockedProposalExecutionCount, 0),
    automationOwnerReviewEvidenceFailedProposalExecutionCount: numberValue(summary.failedProposalExecutionCount, 0),
    automationOwnerReviewEvidenceDigestCount: numberValue(summary.digestCount, 0),
    automationOwnerReviewEvidenceReviewedDigestCount: numberValue(summary.reviewedDigestCount, 0),
    automationOwnerReviewEvidencePendingDigestCount: numberValue(summary.pendingDigestCount, 0),
    automationOwnerReviewEvidenceDigestRequiredActionCount: numberValue(summary.digestRequiredActionCount, 0),
    automationOwnerReviewEvidenceDigestBlockedCandidateCount: numberValue(summary.digestBlockedCandidateCount, 0),
    automationOwnerReviewEvidenceActionHandoffCount: numberValue(summary.actionHandoffCount, 0),
    automationOwnerReviewEvidenceDeliveredHandoffCount: numberValue(summary.deliveredHandoffCount, 0),
    automationOwnerReviewEvidencePendingHandoffDeliveryCount: numberValue(summary.pendingHandoffDeliveryCount, 0),
    automationOwnerReviewEvidenceActionHandoffActionCount: numberValue(summary.actionHandoffActionCount, 0),
    automationOwnerReviewEvidenceBlockedActionHandoffCount: numberValue(summary.blockedActionHandoffCount, 0),
    automationOwnerReviewEvidenceSchedulerExecutionCount: numberValue(summary.schedulerExecutionCount, 0),
    automationOwnerReviewEvidencePublishedSchedulerExecutionCount: numberValue(summary.publishedSchedulerExecutionCount, 0),
    automationOwnerReviewEvidenceBlockedSchedulerExecutionCount: numberValue(summary.blockedSchedulerExecutionCount, 0),
    automationOwnerReviewEvidenceFailedSchedulerExecutionCount: numberValue(summary.failedSchedulerExecutionCount, 0),
    automationOwnerReviewEvidenceSchedulerRunCount: numberValue(summary.schedulerRunCount, 0),
    automationOwnerReviewEvidenceCompletedSchedulerRunCount: numberValue(summary.completedSchedulerRunCount, 0),
    automationOwnerReviewEvidenceBlockedSchedulerRunCount: numberValue(summary.blockedSchedulerRunCount, 0),
    automationOwnerReviewEvidenceSkippedSchedulerRunCount: numberValue(summary.skippedSchedulerRunCount, 0),
    automationOwnerReviewEvidenceReviewedWorkerTargetCount: numberValue(summary.reviewedWorkerTargetCount, 0),
    automationOwnerReviewEvidencePendingWorkerTargetReviewCount: numberValue(summary.pendingWorkerTargetReviewCount, 0),
    automationOwnerReviewEvidenceDisabledWorkerTargetCount: numberValue(summary.disabledWorkerTargetCount, 0),
    automationOwnerReviewEvidenceFailurePolicyReady: summary.failurePolicyReady === true,
    automationOwnerReviewEvidenceFailurePolicyStatus: cleanString(summary.failurePolicyStatus, 120),
    automationOwnerReviewEvidenceWritefulSchedulingAllowed: readback.writefulSchedulingAllowed === true || summary.writefulSchedulingAllowed === true,
    automationOwnerReviewEvidenceBackgroundSchedulingAllowed: readback.backgroundSchedulingAllowed === true || summary.backgroundSchedulingAllowed === true,
    automationOwnerReviewEvidenceBackgroundWorkerAllowed: readback.backgroundWorkerAllowed === true || summary.backgroundWorkerAllowed === true,
    automationOwnerReviewEvidenceRuntimeConfigChange: readback.runtimeConfigChange === true || summary.runtimeConfigChange === true,
    automationOwnerReviewEvidenceConfigChangeApplied: readback.configChangeApplied === true || summary.configChangeApplied === true
  });
}

function formatResult(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json") || hasFlag(args, "--pretty");
  const input = inputFromArgs(args);
  const validation = validateInput(input);
  if (!validation.ok) {
    process.stdout.write(formatResult(validation, pretty));
    process.exitCode = 2;
    return;
  }
  const services = createServices(readEnv(process.env));
  const result = projectAutomationOwnerReviewEvidenceSmokeReadback(
    Object.assign({ operation: "owner-review-evidence" }, runOperation(services.learningAutomationOwnerReviewEvidenceService, input)),
    input
  );
  process.stdout.write(formatResult(Object.assign({ operation: "owner-review-evidence" }, result), pretty));
  process.exitCode = 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "automation_owner_review_evidence_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  projectAutomationOwnerReviewEvidenceSmokeReadback,
  runOperation,
  validateInput
};
