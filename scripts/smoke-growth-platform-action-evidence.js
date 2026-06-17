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

function numberArg(args, names, fallback) {
  const raw = firstArgValue(args, names, "");
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(50, Math.round(value)));
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

function uniqueBoundedStrings(values = [], limit = 16) {
  return Array.from(new Set(asArray(values).map((value) => cleanString(value, 180)).filter(Boolean))).slice(0, limit);
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
    actionHandoffId: firstArgValue(args, ["--action-handoff-id", "--actionHandoffId"], ""),
    digestId: firstArgValue(args, ["--digest-id", "--digestId"], ""),
    limit: numberArg(args, ["--limit"], 12)
  };
}

function projectPlatformActionEvidenceSmokeReadback(result = {}, input = {}) {
  const readback = objectOnly(result);
  if (!Object.keys(readback).length) return result;
  const latestReceipt = objectOnly(readback.latestReceipt);
  const platformBoundary = objectOnly(readback.platformBoundary);
  const missingRequired = uniqueBoundedStrings(readback.missingRequired, 16);
  return Object.assign({}, readback, {
    platformActionEvidenceStatus: cleanString(readback.status || readback.error || (readback.ok ? "pass" : "missing"), 120),
    platformActionEvidenceOk: readback.ok === true,
    platformActionEvidenceWriteOperation: false,
    platformActionEvidenceWriteAllowed: false,
    platformActionEvidenceWritesPerformed: false,
    platformActionEvidenceWorkspaceId: cleanString(readback.workspaceId || input.workspaceId, 160),
    platformActionEvidenceLearnerId: cleanString(readback.learnerId || input.learnerId, 160),
    platformActionEvidenceProgramId: cleanString(readback.programId || input.programId, 160),
    platformActionEvidenceDomainPackId: cleanString(readback.domainPackId || input.domainPackId, 180),
    platformActionEvidenceDomain: cleanString(readback.domain || input.domain, 120),
    platformActionEvidenceSubject: cleanString(readback.subject || input.subject, 120),
    platformActionEvidenceHorizon: cleanString(readback.horizon || input.horizon, 80),
    platformActionEvidenceSource: cleanString(readback.source, 180),
    platformActionEvidenceSchemaVersion: cleanString(readback.schemaVersion, 180),
    platformActionEvidencePrivacyClass: cleanString(readback.privacyClass, 80),
    platformActionEvidenceSummaryOnly: readback.summaryOnly === true,
    platformActionEvidenceReadyForReleaseEvidence: readback.readyForReleaseEvidence === true,
    platformActionEvidenceCount: numberValue(readback.count, asArray(readback.receipts).length),
    platformActionEvidenceMissingRequired: missingRequired,
    platformActionEvidenceMissingRequiredCount: missingRequired.length,
    platformActionEvidenceLatestEventId: cleanString(latestReceipt.eventId, 180),
    platformActionEvidenceLatestActionHandoffId: cleanString(latestReceipt.actionHandoffId || input.actionHandoffId, 160),
    platformActionEvidenceLatestDigestId: cleanString(latestReceipt.digestId || input.digestId, 160),
    platformActionEvidenceLatestDeliveredAt: cleanString(latestReceipt.deliveredAt, 120),
    platformActionEvidenceLatestDeliveryStatus: cleanString(latestReceipt.deliveryStatus, 80),
    platformActionEvidenceHomeAiStatus: numberValue(latestReceipt.homeAiStatus, 0),
    platformActionEvidenceInboxItemId: cleanString(latestReceipt.inboxItemId, 160),
    platformActionEvidenceActionInboxReceiptPresent: latestReceipt.actionInboxReceiptPresent === true,
    platformActionEvidenceClickUrlPresent: latestReceipt.clickUrlPresent === true,
    platformActionEvidenceWebPushReceiptPresent: latestReceipt.webPushReceiptPresent === true,
    platformActionEvidenceWebPushEnabled: latestReceipt.webPushEnabled === true,
    platformActionEvidenceWebPushAttempted: numberValue(latestReceipt.webPushAttempted, 0),
    platformActionEvidenceWebPushSent: numberValue(latestReceipt.webPushSent, 0),
    platformActionEvidenceWebPushFailed: numberValue(latestReceipt.webPushFailed, 0),
    platformActionEvidenceWebPushSkipped: latestReceipt.webPushSkipped === true,
    platformActionEvidencePlatformBoundarySummaryOnly: platformBoundary.summaryOnly === true,
    platformActionEvidenceHomeAiOwnsActionInbox: platformBoundary.homeAiOwnsActionInbox === true,
    platformActionEvidenceHomeAiOwnsWebPush: platformBoundary.homeAiOwnsWebPush === true,
    platformActionEvidenceGrowthReadsOnlyBoundedReceiptSummary: platformBoundary.growthReadsOnlyBoundedReceiptSummary === true,
    platformActionEvidenceRuntimeConfigChange: false,
    platformActionEvidenceConfigChangeApplied: false,
    platformActionEvidenceWritefulSchedulingAllowed: false
  });
}

function formatResult(value, pretty = false) {
  return `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const pretty = hasFlag(args, "--json") || hasFlag(args, "--pretty");
  const input = inputFromArgs(args);
  if (!input.workspaceId) {
    process.stdout.write(formatResult({
      ok: false,
      error: "platform_action_evidence_workspace_required"
    }, pretty));
    process.exitCode = 2;
    return;
  }
  const config = readEnv(process.env);
  const services = createServices(config);
  const result = projectPlatformActionEvidenceSmokeReadback(
    services.learningAutomationPlatformActionEvidenceService.evaluate(input),
    input
  );
  process.stdout.write(formatResult(result, pretty));
  process.exitCode = result.error === "platform_action_evidence_workspace_required" ? 2 : 0;
}

if (require.main === module) {
  main().catch((error) => {
    process.stdout.write(formatResult({
      ok: false,
      error: "platform_action_evidence_smoke_failed",
      detail: String(error && error.message ? error.message : error)
    }, false));
    process.exitCode = 1;
  });
}

module.exports = {
  inputFromArgs,
  projectPlatformActionEvidenceSmokeReadback
};
