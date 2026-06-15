"use strict";

function cleanString(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = []) {
  const source = Array.isArray(values) ? values : String(values || "").split(",");
  return Array.from(new Set(source.map(cleanString).filter(Boolean)));
}

function boundedNumber(value, fallback = 10, min = 1, max = 50) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function hasRiskyPrivateKey(key = "") {
  return /(raw.*answer|answer.*key|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|raw.*model|model.*raw|raw.*transcript|transcript|secret|token|cookie|password|private.*path|provider.*config)/i.test(cleanString(key));
}

function scanPrivacyKeys(value, path = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacyKeys(item, `${path}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (hasRiskyPrivateKey(key)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacyKeys(child, childPath, findings);
  }
  return findings;
}

function normalizeInput(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id);
  const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
  return {
    workspaceId,
    learnerId,
    programId: cleanString(input.programId || input.program_id),
    taskCardId: cleanString(input.taskCardId || input.task_card_id || input.cardId || input.card_id),
    planDraftId: cleanString(input.planDraftId || input.plan_draft_id),
    evaluationId: cleanString(input.evaluationId || input.evaluation_id),
    profileDeltaId: cleanString(input.profileDeltaId || input.profile_delta_id),
    evidenceId: cleanString(input.evidenceId || input.evidence_id),
    targetNodeIds: uniqueStrings(input.targetNodeIds || input.target_node_ids || input.nodeIds || input.node_ids).slice(0, 12),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id),
    domain: cleanString(input.domain),
    subject: cleanString(input.subject),
    text: cleanString(input.text || input.submission || input.answer),
    reflection: cleanString(input.reflection || input.reflectionText || input.reflection_text),
    author: cleanString(input.author || input.submittedBy || input.submitted_by),
    submittedAt: cleanString(input.submittedAt || input.submitted_at),
    reflectedAt: cleanString(input.reflectedAt || input.reflected_at || input.reflectionSubmittedAt || input.reflection_submitted_at),
    limit: boundedNumber(input.limit, 12, 1, 50),
    evaluationLimit: boundedNumber(input.evaluationLimit || input.evaluation_limit, 10, 1, 50),
    requestedBy: cleanString(input.requestedBy || input.requested_by)
  };
}

function unavailable(error, extra = {}) {
  return Object.assign({
    ok: false,
    error,
    source: "growth-learning-learner-cycle-service",
    schemaVersion: "growth.learningLearnerCycleSmoke.v1",
    privacyClass: "summary_only",
    summaryOnly: true
  }, extra);
}

function publicTarget(input = {}) {
  return {
    workspaceId: cleanString(input.workspaceId),
    learnerId: cleanString(input.learnerId || input.workspaceId),
    programId: cleanString(input.programId),
    taskCardId: cleanString(input.taskCardId),
    planDraftId: cleanString(input.planDraftId),
    targetNodeIds: uniqueStrings(input.targetNodeIds).slice(0, 12),
    domainPackId: cleanString(input.domainPackId),
    domain: cleanString(input.domain),
    subject: cleanString(input.subject)
  };
}

function publicCard(result = {}) {
  const card = result.card || result;
  if (!card || typeof card !== "object") return null;
  return {
    taskCardId: cleanString(card.taskCardId || card.id),
    status: cleanString(card.status),
    laneId: cleanString(card.laneId || card.lane_id),
    primaryAction: cleanString(card.primaryAction || card.primary_action),
    latestEvaluationJob: card.latestEvaluationJob ? {
      jobId: cleanString(card.latestEvaluationJob.jobId),
      status: cleanString(card.latestEvaluationJob.status),
      attemptCount: Number(card.latestEvaluationJob.attemptCount || 0),
      retryable: Boolean(card.latestEvaluationJob.retryable),
      failedVisible: Boolean(card.latestEvaluationJob.failedVisible)
    } : null
  };
}

function publicSubmission(result = {}) {
  const submission = result.submission || {};
  return {
    ok: result.ok !== false,
    workspaceId: cleanString(result.workspace_id || result.workspaceId),
    taskCardId: cleanString(result.task_card_id || result.taskCardId || submission.taskCardId),
    requestedTaskCardId: cleanString(result.requested_task_card_id || result.requestedTaskCardId),
    submissionId: cleanString(submission.submissionId || submission.id),
    status: cleanString(submission.status),
    submissionKind: cleanString(submission.submissionKind),
    submittedAt: cleanString(submission.submittedAt || submission.createdAt),
    evaluationJob: result.evaluation_job ? {
      status: cleanString(result.evaluation_job.status),
      submissionId: cleanString(result.evaluation_job.submissionId)
    } : null,
    hasAudio: Boolean(result.audio),
    source: cleanString(result.source)
  };
}

function publicReflection(result = {}) {
  const reflection = result.reflection || {};
  return {
    ok: result.ok !== false,
    workspaceId: cleanString(result.workspace_id || result.workspaceId),
    taskCardId: cleanString(result.task_card_id || result.taskCardId || reflection.taskCardId),
    requestedTaskCardId: cleanString(result.requested_task_card_id || result.requestedTaskCardId),
    reflectionId: cleanString(reflection.reflectionId || reflection.id),
    status: cleanString(reflection.status),
    mode: cleanString(reflection.mode),
    submittedAt: cleanString(reflection.submittedAt || reflection.createdAt),
    hasAudio: Boolean(result.audio),
    source: cleanString(result.source)
  };
}

function publicEvaluationQueue(result = {}) {
  return {
    ok: result.ok !== false,
    available: result.available !== false,
    processed: Number(result.processed || 0),
    results: asArray(result.results).slice(0, 20).map((item) => ({
      jobId: cleanString(item.jobId),
      ok: item.ok !== false,
      status: cleanString(item.status)
    }))
  };
}

function publicCycleAudit(result = {}) {
  return {
    ok: result.ok !== false,
    available: result.available !== false,
    source: cleanString(result.source),
    summary: {
      planDraftCount: Number(result.summary?.planDraftCount || 0),
      evidenceCount: Number(result.summary?.evidenceCount || 0),
      profileDeltaCount: Number(result.summary?.profileDeltaCount || 0),
      correctionCount: Number(result.summary?.correctionCount || 0),
      hasPublishedPlan: Boolean(result.summary?.hasPublishedPlan),
      hasEvaluationEvidence: Boolean(result.summary?.hasEvaluationEvidence),
      hasProfileDelta: Boolean(result.summary?.hasProfileDelta),
      latestActivityAt: cleanString(result.summary?.latestActivityAt)
    },
    partialFailures: uniqueStrings(result.partialFailures).slice(0, 12),
    timeline: asArray(result.timeline).slice(0, 12).map((entry) => ({
      type: cleanString(entry.type),
      id: cleanString(entry.id),
      at: cleanString(entry.at)
    }))
  };
}

function publicCompleteness(result = {}) {
  return {
    ok: result.ok !== false,
    available: result.available !== false,
    source: cleanString(result.source),
    complete: Boolean(result.complete),
    readyForAutomation: Boolean(result.readyForAutomation),
    summary: {
      requiredCount: Number(result.summary?.requiredCount || 0),
      satisfiedRequiredCount: Number(result.summary?.satisfiedRequiredCount || 0),
      missingRequired: uniqueStrings(result.summary?.missingRequired).slice(0, 12),
      planPublished: Boolean(result.summary?.planPublished),
      evaluationEvidence: Boolean(result.summary?.evaluationEvidence),
      profileDelta: Boolean(result.summary?.profileDelta),
      ownerCorrectionAvailable: Boolean(result.summary?.ownerCorrectionAvailable),
      latestActivityAt: cleanString(result.summary?.latestActivityAt)
    },
    findings: asArray(result.findings).slice(0, 12).map((finding) => ({
      code: cleanString(finding.code),
      ok: Boolean(finding.ok),
      severity: cleanString(finding.severity)
    }))
  };
}

function createLearningLearnerCycleService(options = {}) {
  const growthService = options.growthService || null;
  const evaluationService = options.evaluationService || null;
  const cycleAuditService = options.cycleAuditService || null;
  const auditCompletenessService = options.auditCompletenessService || null;

  function privacyFailure(input = {}) {
    const privacyFindings = scanPrivacyKeys(input).slice(0, 20);
    return privacyFindings.length
      ? unavailable("learning_learner_cycle_privacy_failed", { privacyFindings })
      : null;
  }

  function requireWorkspaceAndTask(input = {}, operation = "") {
    if (!input.workspaceId) return unavailable("workspace_id_required", { operation });
    if (!input.taskCardId) return unavailable("task_card_id_required", { operation });
    return null;
  }

  async function audit(input = {}) {
    const privateFailure = privacyFailure(input);
    if (privateFailure) return privateFailure;
    const normalized = normalizeInput(input);
    if (!normalized.workspaceId) return unavailable("workspace_id_required", { operation: "audit" });
    const card = normalized.taskCardId && growthService && typeof growthService.card === "function"
      ? await growthService.card({ workspaceId: normalized.workspaceId, taskCardId: normalized.taskCardId })
      : null;
    const cycleAudit = cycleAuditService && typeof cycleAuditService.listCycleAudit === "function"
      ? cycleAuditService.listCycleAudit(normalized)
      : unavailable("learning_cycle_audit_service_unavailable");
    const completeness = auditCompletenessService && typeof auditCompletenessService.evaluateCycleCompleteness === "function"
      ? auditCompletenessService.evaluateCycleCompleteness(normalized)
      : unavailable("learning_audit_completeness_service_unavailable");
    return {
      ok: cycleAudit?.ok !== false && completeness?.ok !== false,
      operation: "audit",
      source: "growth-learning-learner-cycle-service",
      schemaVersion: "growth.learningLearnerCycleSmoke.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      target: publicTarget(normalized),
      card: card?.ok ? publicCard(card) : null,
      cycleAudit: publicCycleAudit(cycleAudit || {}),
      completeness: publicCompleteness(completeness || {})
    };
  }

  async function submit(input = {}) {
    const privateFailure = privacyFailure(input);
    if (privateFailure) return privateFailure;
    const normalized = normalizeInput(input);
    const missing = requireWorkspaceAndTask(normalized, "submit");
    if (missing) return missing;
    if (!normalized.text) return unavailable("submission_text_required", { operation: "submit" });
    if (!growthService || typeof growthService.submitEvidence !== "function") {
      return unavailable("growth_submission_service_unavailable", { operation: "submit" });
    }
    const result = await growthService.submitEvidence({
      workspaceId: normalized.workspaceId,
      taskCardId: normalized.taskCardId,
      body: {
        text: normalized.text,
        author: normalized.author,
        learnerId: normalized.learnerId,
        programId: normalized.programId,
        submittedAt: normalized.submittedAt
      }
    });
    if (result?.ok === false) {
      return Object.assign(unavailable(result.error || "submission_failed", { operation: "submit" }), {
        submission: publicSubmission(result)
      });
    }
    return Object.assign(await audit(normalized), {
      ok: true,
      operation: "submit",
      submission: publicSubmission(result || {})
    });
  }

  async function evaluate(input = {}) {
    const privateFailure = privacyFailure(input);
    if (privateFailure) return privateFailure;
    const normalized = normalizeInput(input);
    if (!normalized.workspaceId) return unavailable("workspace_id_required", { operation: "evaluate" });
    if (!evaluationService || typeof evaluationService.processEvaluationQueue !== "function") {
      return unavailable("growth_evaluation_service_unavailable", { operation: "evaluate" });
    }
    const result = await evaluationService.processEvaluationQueue({
      workspaceId: normalized.workspaceId,
      limit: normalized.evaluationLimit
    });
    const audited = await audit(normalized);
    return Object.assign(audited, {
      ok: result?.ok !== false && audited.ok !== false,
      operation: "evaluate",
      evaluationQueue: publicEvaluationQueue(result || {})
    });
  }

  async function reflect(input = {}) {
    const privateFailure = privacyFailure(input);
    if (privateFailure) return privateFailure;
    const normalized = normalizeInput(input);
    const missing = requireWorkspaceAndTask(normalized, "reflect");
    if (missing) return missing;
    if (!normalized.reflection) return unavailable("reflection_text_required", { operation: "reflect" });
    if (!growthService || typeof growthService.submitReflection !== "function") {
      return unavailable("growth_reflection_service_unavailable", { operation: "reflect" });
    }
    const result = await growthService.submitReflection({
      workspaceId: normalized.workspaceId,
      taskCardId: normalized.taskCardId,
      body: {
        text: normalized.reflection,
        author: normalized.author,
        learnerId: normalized.learnerId,
        programId: normalized.programId,
        submittedAt: normalized.reflectedAt
      }
    });
    if (result?.ok === false) {
      return Object.assign(unavailable(result.error || "reflection_failed", { operation: "reflect" }), {
        reflection: publicReflection(result)
      });
    }
    return Object.assign(await audit(normalized), {
      ok: true,
      operation: "reflect",
      reflection: publicReflection(result || {})
    });
  }

  async function full(input = {}) {
    const privateFailure = privacyFailure(input);
    if (privateFailure) return privateFailure;
    const normalized = normalizeInput(input);
    const missing = requireWorkspaceAndTask(normalized, "full");
    if (missing) return missing;
    if (!normalized.text) return unavailable("submission_text_required", { operation: "full" });
    if (!normalized.reflection) return unavailable("reflection_text_required", { operation: "full" });
    const submission = await submit(normalized);
    if (!submission.ok) return Object.assign(await audit(normalized), { ok: false, operation: "full", stoppedAt: "submit", submission: submission.submission || null });
    const evaluation = await evaluate(normalized);
    if (!evaluation.ok) return Object.assign(await audit(normalized), { ok: false, operation: "full", stoppedAt: "evaluate", submission: submission.submission || null, evaluationQueue: evaluation.evaluationQueue || null });
    const reflection = await reflect(normalized);
    const audited = await audit(normalized);
    return Object.assign(audited, {
      ok: reflection.ok !== false && audited.ok !== false,
      operation: "full",
      submission: submission.submission || null,
      evaluationQueue: evaluation.evaluationQueue || null,
      reflection: reflection.reflection || null
    });
  }

  return {
    audit,
    evaluate,
    full,
    normalizeInput,
    reflect,
    submit
  };
}

module.exports = {
  createLearningLearnerCycleService
};
