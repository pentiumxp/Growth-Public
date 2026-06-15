"use strict";

const crypto = require("node:crypto");

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

function boundedText(value, max = 320) {
  return cleanString(value).slice(0, max);
}

function clampUnit(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}

function sha256Hex(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|hidden.*answer|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body)/i;

const ACTION_DEFAULT_STATUS = Object.freeze({
  confirm_profile_delta: "observed",
  mark_observed: "observed",
  mark_needs_repair: "needs_repair",
  mark_misconception: "misconception",
  mark_weak: "weak",
  mark_stable: "stable",
  mark_mastered: "mastered"
});

const ALLOWED_STATUSES = new Set(["observed", "weak", "needs_repair", "misconception", "stable", "mastered"]);

function scanPrivacy(value, path = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, `${path}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacy(child, childPath, findings);
  }
  return findings;
}

function scoreBandForStatus(status) {
  const normalized = cleanString(status).toLowerCase();
  if (["mastered", "stable"].includes(normalized)) return "high";
  if (normalized === "observed") return "medium";
  if (["weak", "needs_repair", "misconception"].includes(normalized)) return "low";
  return "";
}

function defaultWeightForStatus(status) {
  const normalized = cleanString(status).toLowerCase();
  if (["mastered", "stable"].includes(normalized)) return 0.4;
  if (["weak", "needs_repair", "misconception"].includes(normalized)) return 0.45;
  return 0.3;
}

function stableCorrectionId(input = {}) {
  const explicit = cleanString(input.correctionId || input.correction_id || input.sourceId || input.source_id || input.id);
  if (explicit) return explicit;
  const seed = [
    cleanString(input.workspaceId || input.workspace_id),
    cleanString(input.learnerId || input.learner_id),
    cleanString(input.programId || input.program_id),
    cleanString(input.profileDeltaId || input.profile_delta_id),
    cleanString(input.evaluationId || input.evaluation_id),
    uniqueStrings(input.targetNodeIds || input.target_node_ids || input.nodeIds || input.node_ids).join(","),
    cleanString(input.reviewAction || input.review_action),
    cleanString(input.status || input.correctionStatus || input.correction_status),
    boundedText(input.summary || input.reason || input.note, 220)
  ].join(":");
  return `lgcorr_${sha256Hex(seed || `${Date.now()}:${Math.random()}`).slice(0, 18)}`;
}

function publicCorrectionFromEvidenceGroup(entries = []) {
  const first = entries[0] || {};
  const summary = first.summary || {};
  return {
    correctionId: cleanString(first.sourceId),
    workspaceId: cleanString(first.workspaceId),
    learnerId: cleanString(first.learnerId),
    programId: cleanString(first.programId),
    reviewAction: cleanString(summary.reviewAction),
    status: cleanString(summary.correctionStatus || first.status),
    targetNodeIds: uniqueStrings(entries.map((entry) => entry.graphNodeId).concat(first.graphNodeIds || [])),
    evidenceIds: uniqueStrings(entries.map((entry) => entry.evidenceId)),
    profileDeltaId: cleanString(summary.profileDeltaId),
    taskCardId: cleanString(summary.taskCardId || first.sourceTaskCardId),
    evaluationId: cleanString(summary.evaluationId),
    sourceEvidenceIds: uniqueStrings(summary.sourceEvidenceIds || []),
    reviewedBy: cleanString(summary.reviewedBy),
    reason: cleanString(summary.reason),
    note: cleanString(summary.note),
    privacyClass: cleanString(first.privacyClass),
    createdAt: cleanString(first.createdAt),
    updatedAt: cleanString(first.updatedAt)
  };
}

function groupBySourceId(evidence = []) {
  const groups = new Map();
  for (const item of evidence) {
    const sourceId = cleanString(item.sourceId);
    if (!sourceId) continue;
    const next = groups.get(sourceId) || [];
    next.push(item);
    groups.set(sourceId, next);
  }
  return Array.from(groups.values())
    .map(publicCorrectionFromEvidenceGroup)
    .filter((item) => item.correctionId);
}

function createLearningOwnerCorrectionService(options = {}) {
  const evidenceLedgerService = options.evidenceLedgerService || null;
  const targetProvisioningService = options.targetProvisioningService || null;
  const now = typeof options.now === "function" ? options.now : () => new Date();

  function validateTarget(input = {}, targetNodeIds = []) {
    if (!targetProvisioningService || typeof targetProvisioningService.resolveSelection !== "function") {
      return { ok: false, error: "learning_owner_correction_target_service_unavailable" };
    }
    const result = targetProvisioningService.resolveSelection(Object.assign({}, input, { targetNodeIds }));
    if (!result?.ok || !result.targetEnabled) {
      return {
        ok: false,
        error: result?.error || "learning_owner_correction_target_not_enabled",
        targetProvisioning: result || { ok: false, targetEnabled: false }
      };
    }
    return result;
  }

  function recordCorrection(input = {}) {
    if (!evidenceLedgerService || typeof evidenceLedgerService.writeEvidence !== "function") {
      return { ok: false, available: false, error: "learning_owner_correction_evidence_ledger_unavailable" };
    }
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) return { ok: false, error: "learning_owner_correction_privacy_failed", privacyFindings };
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
    const programId = cleanString(input.programId || input.program_id);
    const targetNodeIds = uniqueStrings(input.targetNodeIds || input.target_node_ids || input.nodeIds || input.node_ids).slice(0, 8);
    const reviewAction = cleanString(input.reviewAction || input.review_action || "confirm_profile_delta").toLowerCase();
    const defaultStatus = ACTION_DEFAULT_STATUS[reviewAction];
    const status = cleanString(input.status || input.correctionStatus || input.correction_status || defaultStatus).toLowerCase();
    if (!workspaceId || !learnerId) return { ok: false, error: "learning_owner_correction_workspace_required" };
    if (!targetNodeIds.length) return { ok: false, error: "learning_owner_correction_target_required" };
    if (!defaultStatus) return { ok: false, error: "learning_owner_correction_action_invalid" };
    if (!ALLOWED_STATUSES.has(status)) return { ok: false, error: "learning_owner_correction_status_invalid" };
    const target = validateTarget(input, targetNodeIds);
    if (!target.ok) return target;
    const correctionId = stableCorrectionId(Object.assign({}, input, {
      workspaceId,
      learnerId,
      programId,
      targetNodeIds,
      reviewAction,
      status
    }));
    const recordedAt = cleanString(input.reviewedAt || input.recordedAt || input.createdAt || input.created_at) || now().toISOString();
    const sourceEvidenceIds = uniqueStrings(input.sourceEvidenceIds || input.source_evidence_ids || input.evidenceIds || input.evidence_ids).slice(0, 12);
    const taskCardId = cleanString(input.taskCardId || input.task_card_id);
    const summary = {
      summaryOnly: true,
      correctionId,
      reviewAction,
      correctionStatus: status,
      reason: boundedText(input.reason || input.summary, 260),
      note: boundedText(input.note, 260),
      reviewedBy: cleanString(input.reviewedBy || input.reviewed_by || input.requestedBy || input.requested_by),
      profileDeltaId: cleanString(input.profileDeltaId || input.profile_delta_id),
      taskCardId,
      evaluationId: cleanString(input.evaluationId || input.evaluation_id),
      sourceEvidenceIds,
      clearPressureSignals: ["observed", "stable", "mastered"].includes(status),
      targetProvisioningMode: cleanString(target.mode),
      selectedDomainPackId: cleanString(target.selectedDomainPackId),
      selectedSubject: cleanString(target.selectedSubject)
    };
    const evidenceWeight = clampUnit(input.evidenceWeight || input.evidence_weight, defaultWeightForStatus(status));
    const confidence = clampUnit(input.confidence, 0.7);
    const results = targetNodeIds.map((nodeId) => evidenceLedgerService.writeEvidence({
      workspaceId,
      learnerId,
      programId,
      graphNodeId: nodeId,
      graphNodeIds: targetNodeIds,
      sourceType: "owner_reviewed_correction",
      sourceId: correctionId,
      sourceTaskCardId: taskCardId,
      cardRole: "owner_review",
      evidenceWeight,
      confidence,
      scoreBand: scoreBandForStatus(status),
      status,
      summary,
      recordedAt
    }));
    const entries = results.filter((item) => item?.ok && item.evidence).map((item) => item.evidence);
    return {
      ok: results.every((item) => item?.ok !== false),
      source: "growth-learning-owner-correction-service",
      workspaceId,
      learnerId,
      programId,
      correctionId,
      reviewAction,
      status,
      targetNodeIds,
      targetProvisioning: {
        ok: true,
        mode: cleanString(target.mode),
        selectedDomainPackId: cleanString(target.selectedDomainPackId),
        selectedSubject: cleanString(target.selectedSubject)
      },
      evidenceLedger: {
        ok: results.every((item) => item?.ok !== false),
        evidenceCount: entries.length,
        duplicateCount: results.filter((item) => item?.duplicate).length,
        entries,
        errors: results.filter((item) => item?.ok === false).map((item) => item.error).filter(Boolean)
      },
      correction: publicCorrectionFromEvidenceGroup(entries)
    };
  }

  function listCorrections(input = {}) {
    if (!evidenceLedgerService || typeof evidenceLedgerService.listEvidence !== "function") {
      return { ok: false, available: false, error: "learning_owner_correction_evidence_ledger_unavailable" };
    }
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
    if (!workspaceId) return { ok: false, error: "learning_owner_correction_workspace_required" };
    const evidence = evidenceLedgerService.listEvidence({
      workspaceId,
      learnerId,
      programId: input.programId || input.program_id,
      graphNodeIds: uniqueStrings(input.targetNodeIds || input.target_node_ids || input.nodeIds || input.node_ids),
      sourceType: "owner_reviewed_correction",
      limit: input.limit || 80
    });
    const correctionId = cleanString(input.correctionId || input.correction_id || input.sourceId || input.source_id);
    const corrections = groupBySourceId(evidence)
      .filter((item) => !correctionId || item.correctionId === correctionId)
      .slice(0, Math.max(1, Math.min(50, Number(input.limit || 20) || 20)));
    return {
      ok: true,
      source: "growth-learning-owner-correction-service",
      workspaceId,
      learnerId,
      programId: cleanString(input.programId || input.program_id),
      count: corrections.length,
      corrections
    };
  }

  return {
    listCorrections,
    recordCorrection
  };
}

module.exports = {
  createLearningOwnerCorrectionService
};
