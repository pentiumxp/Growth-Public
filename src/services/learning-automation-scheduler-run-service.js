"use strict";

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function boundedText(value, max = 360) {
  const text = cleanString(value);
  return text.length > max ? text.slice(0, max) : text;
}

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body)/i;

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

function unavailable(error, extra = {}) {
  return Object.assign({
    ok: false,
    error: cleanString(error) || "learning_automation_scheduler_run_unavailable"
  }, extra);
}

function runMode(input = {}) {
  return cleanString(input.runMode || input.run_mode || input.mode || "background_supervised_tick") || "background_supervised_tick";
}

function scopeFrom(input = {}) {
  return {
    workspaceId: cleanString(input.workspaceId || input.workspace_id),
    learnerId: cleanString(input.learnerId || input.learner_id || input.workspaceId || input.workspace_id),
    programId: cleanString(input.programId || input.program_id),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id),
    domain: cleanString(input.domain),
    subject: cleanString(input.subject),
    horizon: cleanString(input.horizon || "daily_plan") || "daily_plan"
  };
}

function clampLimit(value, fallback = 5) {
  return Math.max(1, Math.min(20, Number(value || fallback) || fallback));
}

function runInputSummary(scope = {}, input = {}) {
  return {
    schemaVersion: "growth.learningAutomationSchedulerRun.input.v1",
    summaryOnly: true,
    workspaceId: scope.workspaceId,
    learnerId: scope.learnerId,
    programId: scope.programId,
    domainPackId: scope.domainPackId,
    domain: scope.domain,
    subject: scope.subject,
    horizon: scope.horizon,
    runMode: runMode(input),
    limit: clampLimit(input.limit),
    backgroundSchedulerEnabled: input.backgroundSchedulerEnabled === true
  };
}

function actionCandidate(handoff = {}, action = {}) {
  return {
    schemaVersion: "growth.learningAutomationSchedulerRun.candidate.v1",
    summaryOnly: true,
    handoffId: cleanString(handoff.handoffId),
    digestId: cleanString(handoff.digestId),
    policyId: cleanString(handoff.policyId),
    proposalId: cleanString(action.proposalId || action.proposal_id),
    planDraftId: cleanString(action.planDraftId || action.plan_draft_id),
    selectedItemId: cleanString(action.selectedItemId || action.selected_item_id),
    actionType: cleanString(action.actionType || action.action_type),
    endpoint: cleanString(action.endpoint),
    deliveryStatus: cleanString(handoff.deliveryStatus),
    handoffStatus: cleanString(handoff.status)
  };
}

function summarizeExecutions(input = {}) {
  const executions = asArray(input.executions);
  const handoffs = asArray(input.handoffs);
  const candidates = asArray(input.candidates);
  const published = executions.filter((item) => item.status === "published").length;
  const failed = executions.filter((item) => item.status === "failed").length;
  const blocked = executions.filter((item) => item.status === "blocked").length;
  const skipped = executions.filter((item) => item.status === "skipped").length;
  return {
    schemaVersion: "growth.learningAutomationSchedulerRun.summary.v1",
    summaryOnly: true,
    backgroundSchedulerEnabled: Boolean(input.backgroundSchedulerEnabled),
    executionDelegation: "learning-automation-scheduler-execution-service.executeOnce",
    inspectedHandoffs: handoffs.length,
    inspectedActions: candidates.length,
    attemptedExecutions: executions.length,
    published,
    failed,
    blocked,
    skipped,
    writefulExecutionConfigRequired: true,
    noDirectGateway: true,
    noDirectPlanPublish: true,
    noDirectCardGeneration: true,
    noStageAssessmentActivation: true
  };
}

function finalStatus(executions = []) {
  if (!executions.length) return "skipped";
  const published = executions.filter((item) => item.status === "published").length;
  const failedOrBlocked = executions.filter((item) => ["failed", "blocked"].includes(item.status)).length;
  if (published && !failedOrBlocked) return "completed";
  if (published && failedOrBlocked) return "partial";
  return "failed";
}

function publicExecutionResult(result = {}, candidate = {}) {
  const execution = result.execution || {};
  return {
    schemaVersion: "growth.learningAutomationSchedulerRun.execution.v1",
    summaryOnly: true,
    ok: result.ok === true,
    error: cleanString(result.error),
    executionId: cleanString(execution.executionId),
    status: cleanString(execution.status || (result.ok ? "published" : "failed")),
    handoffId: cleanString(candidate.handoffId),
    digestId: cleanString(candidate.digestId),
    policyId: cleanString(candidate.policyId),
    proposalId: cleanString(candidate.proposalId),
    planDraftId: cleanString(candidate.planDraftId),
    selectedItemId: cleanString(candidate.selectedItemId),
    generatedTaskCardId: cleanString(execution.execution?.generatedTaskCardId || result.publishResult?.proposal?.execution?.generatedTaskCardId)
  };
}

function createLearningAutomationSchedulerRunService(options = {}) {
  const repository = options.repository || null;
  const actionHandoffService = options.actionHandoffService || null;
  const schedulerExecutionService = options.schedulerExecutionService || null;
  const allowBackgroundScheduler = options.allowBackgroundScheduler === true;

  function listRuns(input = {}) {
    if (!repository || typeof repository.listRuns !== "function") {
      return unavailable("learning_automation_scheduler_run_repository_unavailable");
    }
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    if (!workspaceId) return unavailable("learning_automation_scheduler_run_scope_required");
    const runs = repository.listRuns(input);
    return {
      ok: true,
      source: "growth-learning-automation-scheduler-run-service",
      workspaceId,
      learnerId: cleanString(input.learnerId || input.learner_id || workspaceId),
      count: runs.length,
      runs
    };
  }

  function recordRun(scope = {}, input = {}, status, reason, extra = {}) {
    const runRecord = repository.recordRun(Object.assign({}, scope, {
      runId: input.runId || input.run_id,
      mode: runMode(input),
      status,
      reason,
      error: status === "completed" ? "" : reason,
      input: runInputSummary(scope, Object.assign({}, input, {
        backgroundSchedulerEnabled: allowBackgroundScheduler
      })),
      candidates: extra.candidates || [],
      executions: extra.executions || [],
      summary: summarizeExecutions(Object.assign({}, extra, {
        backgroundSchedulerEnabled: allowBackgroundScheduler
      })),
      createdBy: input.requestedBy || input.requested_by,
      executedBy: input.requestedBy || input.requested_by,
      createdAt: input.createdAt || input.created_at,
      updatedAt: input.updatedAt || input.updated_at,
      privacyClass: "summary_only"
    }));
    if (!runRecord?.ok) return runRecord || unavailable("learning_automation_scheduler_run_record_failed");
    return runRecord;
  }

  async function runOnce(input = {}) {
    if (!repository || typeof repository.recordRun !== "function") {
      return unavailable("learning_automation_scheduler_run_repository_unavailable");
    }
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_scheduler_run_scope_required");
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) return unavailable("learning_automation_scheduler_run_privacy_failed", { privacyFindings });
    if (runMode(input) !== "background_supervised_tick") {
      const blocked = recordRun(scope, input, "blocked", "learning_automation_scheduler_run_mode_invalid");
      return Object.assign(unavailable("learning_automation_scheduler_run_mode_invalid"), {
        run: blocked?.run || null
      });
    }
    if (!allowBackgroundScheduler) {
      const blocked = recordRun(scope, input, "blocked", "learning_automation_background_scheduler_disabled");
      return Object.assign(unavailable("learning_automation_background_scheduler_disabled"), {
        run: blocked?.run || null
      });
    }
    if (!actionHandoffService || typeof actionHandoffService.listHandoffs !== "function") {
      return unavailable("learning_automation_scheduler_run_handoff_service_unavailable");
    }
    if (!schedulerExecutionService || typeof schedulerExecutionService.executeOnce !== "function") {
      return unavailable("learning_automation_scheduler_run_execution_service_unavailable");
    }
    const started = recordRun(scope, input, "started", "background_scheduler_run_started");
    if (!started.ok) return started;
    const runInput = Object.assign({}, input, {
      runId: started.run?.runId || input.runId || input.run_id,
      createdAt: started.run?.createdAt || input.createdAt || input.created_at
    });
    const handoffsResult = actionHandoffService.listHandoffs(Object.assign({}, scope, {
      status: "delivered",
      deliveryStatus: "delivered",
      limit: clampLimit(input.limit)
    }));
    if (!handoffsResult?.ok) {
      const failed = recordRun(scope, runInput, "failed", handoffsResult?.error || "learning_automation_scheduler_run_handoff_list_failed", {
        handoffs: [],
        candidates: [],
        executions: []
      });
      return Object.assign(unavailable(failed.error || "learning_automation_scheduler_run_handoff_list_failed"), { run: failed?.run || null });
    }
    const handoffs = asArray(handoffsResult.handoffs);
    const candidates = [];
    for (const handoff of handoffs) {
      for (const action of asArray(handoff.actions)) {
        const candidate = actionCandidate(handoff, action);
        if (candidate.proposalId) candidates.push(candidate);
        if (candidates.length >= clampLimit(input.limit)) break;
      }
      if (candidates.length >= clampLimit(input.limit)) break;
    }
    if (!candidates.length) {
      const skipped = recordRun(scope, runInput, "skipped", "learning_automation_scheduler_run_no_delivered_actions", {
        handoffs,
        candidates: [],
        executions: []
      });
      return {
        ok: true,
        source: "growth-learning-automation-scheduler-run-service",
        run: skipped.run,
        executions: []
      };
    }
    const executions = [];
    for (const candidate of candidates) {
      const executionResult = await schedulerExecutionService.executeOnce({
        workspaceId: scope.workspaceId,
        learnerId: scope.learnerId,
        programId: scope.programId,
        handoffId: candidate.handoffId,
        digestId: candidate.digestId,
        policyId: candidate.policyId,
        proposalId: candidate.proposalId,
        planDraftId: candidate.planDraftId,
        selectedItemId: candidate.selectedItemId,
        domainPackId: scope.domainPackId,
        domain: scope.domain,
        subject: scope.subject,
        horizon: scope.horizon,
        executionMode: "owner_explicit_once",
        generationKey: input.generationKey || input.generation_key,
        cardSchemaVersion: input.cardSchemaVersion || input.card_schema_version,
        requestedBy: input.requestedBy || input.requested_by,
        createdAt: runInput.createdAt || runInput.created_at,
        startedAt: input.startedAt || input.started_at,
        executedAt: input.executedAt || input.executed_at
      });
      executions.push(publicExecutionResult(executionResult, candidate));
    }
    const status = finalStatus(executions);
    const reason = status === "completed"
      ? "background_scheduler_run_completed"
      : status === "partial"
        ? "background_scheduler_run_partial"
        : "background_scheduler_run_failed";
    const finalRun = recordRun(scope, runInput, status, reason, {
      handoffs,
      candidates,
      executions
    });
    if (!finalRun?.ok) return finalRun || unavailable("learning_automation_scheduler_run_record_failed");
    return {
      ok: ["completed", "partial"].includes(status),
      source: "growth-learning-automation-scheduler-run-service",
      error: status === "completed" ? "" : reason,
      backgroundSchedulerEnabled: true,
      run: finalRun.run,
      executions
    };
  }

  return {
    listRuns,
    runOnce
  };
}

module.exports = {
  createLearningAutomationSchedulerRunService
};
