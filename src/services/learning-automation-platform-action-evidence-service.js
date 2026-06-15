"use strict";

const PLATFORM_ACTION_EVIDENCE_SCHEMA = "growth.learningAutomationPlatformActionEvidence.v1";
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clampLimit(value, fallback = 12) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.min(50, Math.round(numeric)));
}

function scanPrivacy(value, pathName = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, `${pathName}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${pathName}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacy(child, childPath, findings);
  }
  return findings;
}

function hermesWorkspaceId(value) {
  const text = cleanString(value, 120);
  return text.startsWith("growth:") ? text.slice("growth:".length) : text;
}

function publicScope(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id, 120);
  return {
    workspaceId,
    learnerId: cleanString(input.learnerId || input.learner_id || workspaceId, 120),
    programId: cleanString(input.programId || input.program_id, 120),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id, 120),
    domain: cleanString(input.domain, 80),
    subject: cleanString(input.subject, 80),
    horizon: cleanString(input.horizon || "daily_plan", 80),
    actionHandoffId: cleanString(input.actionHandoffId || input.action_handoff_id, 120),
    digestId: cleanString(input.digestId || input.digest_id, 120),
    limit: clampLimit(input.limit || 12, 12)
  };
}

function deliveryResult(record = {}) {
  const delivery = record.delivery || {};
  const firstResult = asArray(delivery.results)[0] || {};
  const response = delivery.response || firstResult.response || {};
  return {
    status: Number(delivery.status || firstResult.status || record.last_status || 0) || 0,
    inboxItemId: cleanString(firstResult.inboxItemId || response.inboxItemId, 120),
    clickUrlPresent: Boolean(cleanString(firstResult.clickUrl || response.clickUrl, 240)),
    error: cleanString(delivery.error || firstResult.error || record.last_error, 160)
  };
}

function recordTime(record = {}) {
  return cleanString(record.delivered_at || record.deliveredAt || record.updated_at || record.updatedAt || record.created_at || record.createdAt, 80);
}

function recordMatchesScope(record = {}, scope = {}) {
  const event = record.event || {};
  if (record.status !== "delivered") return false;
  if (event.type !== "growth.automation.action_required") return false;
  if (scope.workspaceId && hermesWorkspaceId(event.workspace_id || event.workspaceId) !== scope.workspaceId) return false;
  if (scope.actionHandoffId && cleanString(event.action_handoff_id || event.actionHandoffId, 120) !== scope.actionHandoffId) return false;
  if (scope.digestId && cleanString(event.digest_id || event.digestId, 120) !== scope.digestId) return false;
  return true;
}

function publicReceipt(record = {}) {
  const event = record.event || {};
  const delivery = deliveryResult(record);
  return {
    eventId: cleanString(event.event_id || event.eventId || record.id, 160),
    workspaceId: hermesWorkspaceId(event.workspace_id || event.workspaceId),
    actionHandoffId: cleanString(event.action_handoff_id || event.actionHandoffId, 120),
    digestId: cleanString(event.digest_id || event.digestId, 120),
    source: cleanString(event.source || "growth-event-service", 80),
    deliveredAt: recordTime(record),
    deliveryStatus: cleanString(record.status, 80),
    homeAiStatus: delivery.status,
    inboxItemId: delivery.inboxItemId,
    clickUrlPresent: delivery.clickUrlPresent
  };
}

function createLearningAutomationPlatformActionEvidenceService(options = {}) {
  const outboxStore = options.outboxStore || null;

  function evaluate(input = {}) {
    const scope = publicScope(input);
    if (!scope.workspaceId) {
      return { ok: false, error: "platform_action_evidence_workspace_required" };
    }
    const privacyFindings = scanPrivacy(input).slice(0, 8);
    if (privacyFindings.length) {
      return {
        ok: false,
        error: "platform_action_evidence_privacy_failed",
        privacyFindings
      };
    }
    if (!outboxStore || typeof outboxStore.list !== "function") {
      return { ok: false, error: "platform_action_evidence_outbox_unavailable" };
    }
    let records = [];
    try {
      records = asArray(outboxStore.list("delivered"));
    } catch (error) {
      return {
        ok: false,
        error: "platform_action_evidence_outbox_read_failed",
        detail: cleanString(error && error.message ? error.message : error, 160)
      };
    }
    const receipts = records
      .filter((record) => recordMatchesScope(record, scope))
      .map(publicReceipt)
      .sort((left, right) => cleanString(right.deliveredAt).localeCompare(cleanString(left.deliveredAt)))
      .slice(0, scope.limit);
    const latestReceipt = receipts[0] || null;
    const pass = Boolean(latestReceipt && latestReceipt.inboxItemId);
    return {
      ok: pass,
      source: "growth-learning-automation-platform-action-evidence-service",
      schemaVersion: PLATFORM_ACTION_EVIDENCE_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      programId: scope.programId,
      domainPackId: scope.domainPackId,
      domain: scope.domain,
      subject: scope.subject,
      horizon: scope.horizon,
      status: pass ? "pass" : "missing",
      readyForReleaseEvidence: pass,
      count: receipts.length,
      latestReceipt,
      receipts,
      missingRequired: pass ? [] : ["delivered_platform_action_inbox_receipt"],
      platformBoundary: {
        summaryOnly: true,
        homeAiOwnsActionInbox: true,
        homeAiOwnsWebPush: true,
        growthEvidenceSource: "growth_event_outbox_delivered_receipt"
      },
      error: pass ? "" : "platform_action_evidence_missing"
    };
  }

  return {
    evaluate
  };
}

module.exports = {
  PLATFORM_ACTION_EVIDENCE_SCHEMA,
  createLearningAutomationPlatformActionEvidenceService,
  publicScope
};
