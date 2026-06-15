"use strict";

function cleanString(value) {
  return String(value ?? "").trim();
}

function clampLimit(value, fallback = 20) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(100, Math.round(parsed)));
}

function createLearningProfileDeltaAuditService(options = {}) {
  const repository = options.repository || null;

  function listProfileDeltas(input = {}) {
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    if (!workspaceId) return { ok: false, error: "profile_delta_audit_workspace_required" };
    if (!repository || typeof repository.listProfileDeltas !== "function") {
      return { ok: false, available: false, error: "profile_delta_audit_repository_unavailable" };
    }
    const learnerId = cleanString(input.learnerId || input.learner_id);
    const profileDeltas = repository.listProfileDeltas({
      workspaceId,
      learnerId,
      programId: cleanString(input.programId || input.program_id),
      taskCardId: cleanString(input.taskCardId || input.task_card_id),
      evaluationId: cleanString(input.evaluationId || input.evaluation_id),
      profileDeltaId: cleanString(input.profileDeltaId || input.profile_delta_id),
      limit: clampLimit(input.limit)
    });
    return {
      ok: true,
      available: true,
      source: "growth-learning-profile-delta-audit-service",
      target: {
        workspaceId,
        learnerId: learnerId || workspaceId,
        displayName: cleanString(input.displayName || input.label)
      },
      filters: {
        programId: cleanString(input.programId || input.program_id),
        taskCardId: cleanString(input.taskCardId || input.task_card_id),
        evaluationId: cleanString(input.evaluationId || input.evaluation_id),
        profileDeltaId: cleanString(input.profileDeltaId || input.profile_delta_id),
        limit: clampLimit(input.limit)
      },
      count: profileDeltas.length,
      profileDeltas
    };
  }

  return {
    listProfileDeltas
  };
}

module.exports = {
  createLearningProfileDeltaAuditService
};
