"use strict";

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = []) {
  const source = Array.isArray(values) ? values : String(values || "").split(",");
  return Array.from(new Set(source.map((value) => cleanString(value, 160)).filter(Boolean)));
}

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
    source: "growth-learning-operating-loop-service",
    schemaVersion: "growth.learningOperatingLoop.v1",
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "blocked",
    error: cleanString(error) || "learning_operating_loop_unavailable",
    writePerformed: false
  }, extra);
}

function bool(value) {
  return value === true || ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function targetFrom(state = {}, input = {}) {
  const target = state.target || {};
  const workspaceId = cleanString(target.workspaceId || input.workspaceId || input.workspace_id);
  return {
    workspaceId,
    learnerId: cleanString(target.learnerId || input.learnerId || input.learner_id || workspaceId),
    displayName: cleanString(target.displayName || input.displayName || input.display_name || input.label, 120),
    label: cleanString(target.label || input.label || target.displayName || input.displayName || input.display_name, 120)
  };
}

function scopeFrom(state = {}, input = {}) {
  const scope = state.scope || {};
  return {
    programId: cleanString(scope.programId || input.programId || input.program_id),
    domainPackId: cleanString(scope.domainPackId || input.domainPackId || input.domain_pack_id),
    domain: cleanString(scope.domain || input.domain),
    subject: cleanString(scope.subject || input.subject),
    subjectId: cleanString(input.subjectId || input.subject_id || scope.subject || input.subject),
    capabilityClusterId: cleanString(input.capabilityClusterId || input.capability_cluster_id),
    horizon: cleanString(scope.horizon || input.horizon || "daily_plan"),
    availableMinutes: Number(scope.availableMinutes || input.availableMinutes || input.available_minutes || 15) || 15,
    targetNodeIds: uniqueStrings(scope.targetNodeIds || input.targetNodeIds || input.target_node_ids).slice(0, 12),
    assessmentCoverageNodeIds: uniqueStrings(
      input.assessmentCoverageNodeIds
        || input.assessment_coverage_node_ids
        || input.assessmentCoverage
        || input.assessment_coverage
        || scope.targetNodeIds
        || input.targetNodeIds
        || input.target_node_ids
    ).slice(0, 12)
  };
}

function executionInput(input = {}, state = {}) {
  const target = targetFrom(state, input);
  const scope = scopeFrom(state, input);
  return Object.assign({}, input, {
    workspaceId: target.workspaceId,
    learnerId: target.learnerId,
    displayName: target.displayName,
    label: target.label,
    programId: scope.programId,
    domainPackId: scope.domainPackId,
    domain: scope.domain,
    subject: scope.subject,
    subjectId: scope.subjectId,
    capabilityClusterId: scope.capabilityClusterId,
    horizon: scope.horizon,
    availableMinutes: scope.availableMinutes,
    targetNodeIds: scope.targetNodeIds,
    assessmentCoverageNodeIds: scope.assessmentCoverageNodeIds
  });
}

function publicDailyLoopResult(result = {}) {
  const generation = result.generation || {};
  const published = generation.published || {};
  const planDraft = result.planDraft || {};
  return {
    ok: result.ok === true,
    source: cleanString(result.source),
    operation: cleanString(result.operation),
    stage: cleanString(result.stage),
    error: cleanString(result.error),
    duplicate: result.duplicate === true,
    gatewayMode: cleanString(result.gatewayMode),
    planDraftId: cleanString(planDraft.planDraftId || result.draftStep?.planDraftId || result.publishStep?.planDraftId),
    selectedItemId: cleanString(planDraft.selectedItemId || result.selectedItem?.itemId || result.publishStep?.selectedItemId),
    taskCardId: cleanString(published.taskCardId || planDraft.generatedTaskCardId || result.publishStep?.taskCardId),
    draftStep: result.draftStep ? {
      ok: result.draftStep.ok === true,
      operation: cleanString(result.draftStep.operation),
      stage: cleanString(result.draftStep.stage),
      planDraftId: cleanString(result.draftStep.planDraftId),
      selectedItemId: cleanString(result.draftStep.selectedItemId),
      taskCardId: cleanString(result.draftStep.taskCardId),
      error: cleanString(result.draftStep.error)
    } : null,
    publishStep: result.publishStep ? {
      ok: result.publishStep.ok === true,
      operation: cleanString(result.publishStep.operation),
      stage: cleanString(result.publishStep.stage),
      planDraftId: cleanString(result.publishStep.planDraftId),
      selectedItemId: cleanString(result.publishStep.selectedItemId),
      taskCardId: cleanString(result.publishStep.taskCardId),
      error: cleanString(result.publishStep.error)
    } : null
  };
}

function publicStageActivationResult(result = {}) {
  const cycle = result.cycle || {};
  return {
    ok: result.ok === true,
    source: cleanString(result.source),
    activationState: cleanString(result.activationState),
    activationSource: cleanString(result.activationSource),
    activationReason: cleanString(result.activationReason),
    cooldownOverridden: result.cooldownOverridden === true,
    cycleId: cleanString(cycle.cycleId || cycle.cycle_id),
    taskCardId: cleanString(result.published?.taskCardId || cycle.generatedTaskCardId || cycle.generated_task_card_id),
    error: cleanString(result.error),
    stage: cleanString(result.stage)
  };
}

function publicNextAction(nextAction = {}) {
  return {
    action: cleanString(nextAction.action),
    enabled: nextAction.enabled !== false,
    endpoint: cleanString(nextAction.endpoint),
    reason: cleanString(nextAction.reason),
    requiredActor: cleanString(nextAction.requiredActor),
    planDraftId: cleanString(nextAction.planDraftId),
    itemId: cleanString(nextAction.itemId),
    taskCardId: cleanString(nextAction.taskCardId)
  };
}

function publicStateSummary(state = {}) {
  if (!state || typeof state !== "object") return null;
  const summary = state.summary || {};
  return {
    ok: state.ok === true,
    status: cleanString(state.status),
    error: cleanString(state.error),
    target: targetFrom(state, {}),
    scope: scopeFrom(state, {}),
    nextAction: publicNextAction(state.nextAction || {}),
    readyForDraft: summary.readyForDraft === true,
    readyForPublish: summary.readyForPublish === true,
    stageCheckpointReady: summary.stageCheckpointReady === true,
    stageCheckpointActive: summary.stageCheckpointActive === true,
    auditComplete: summary.auditComplete === true,
    recommendationEvidenceReady: summary.recommendationEvidenceReady === true
  };
}

function resultSelectors(actionResult = {}) {
  return {
    planDraftId: cleanString(actionResult.planDraftId),
    itemId: cleanString(actionResult.selectedItemId),
    taskCardId: cleanString(actionResult.taskCardId),
    stageAssessmentCycleId: cleanString(actionResult.cycleId)
  };
}

function supportedAction(action = "") {
  return [
    "draft_daily_plan",
    "publish_selected_plan_item",
    "review_stage_assessment",
    "complete_active_stage_assessment",
    "complete_cycle_audit",
    "provision_learning_target",
    "import_or_select_learning_graph",
    "refresh_learning_context",
    "configure_planner_gateway",
    "owner_review"
  ].includes(action);
}

function executionModeFor(actionName) {
  if (actionName === "draft_daily_plan") return "daily_loop_advance";
  if (actionName === "publish_selected_plan_item") return "daily_loop_publish";
  if (actionName === "review_stage_assessment") return "stage_assessment_activate";
  return "separate_flow";
}

function publicRunAudit(recorded = {}) {
  if (!recorded) return null;
  if (recorded.ok !== true) {
    return {
      ok: false,
      status: "failed",
      error: cleanString(recorded.error || "learning_operating_loop_run_audit_failed"),
      privacyFindings: asArray(recorded.privacyFindings).slice(0, 12),
      privateValueFindings: asArray(recorded.privateValueFindings).slice(0, 12)
    };
  }
  return {
    ok: true,
    status: "recorded",
    duplicate: recorded.duplicate === true,
    runId: cleanString(recorded.run?.runId || recorded.runId)
  };
}

function createLearningOperatingLoopService(options = {}) {
  const loopStateService = options.loopStateService || null;
  const dailyLoopService = options.dailyLoopService || null;
  const stageAssessmentService = options.stageAssessmentService || null;
  const runRepository = options.runRepository || options.operatingLoopRunRepository || null;

  function stateFor(input = {}) {
    if (!loopStateService || typeof loopStateService.state !== "function") {
      return unavailable("learning_operating_loop_state_service_unavailable");
    }
    return loopStateService.state(input);
  }

  function recommend(input = {}) {
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) {
      return unavailable("learning_operating_loop_privacy_failed", { privacyFindings });
    }
    const state = stateFor(input);
    if (!state?.ok) {
      return unavailable(state?.error || "learning_operating_loop_state_failed", {
        status: "blocked",
        state: state ? {
          ok: state.ok === true,
          error: cleanString(state.error)
        } : null
      });
    }
    return {
      ok: true,
      source: "growth-learning-operating-loop-service",
      schemaVersion: "growth.learningOperatingLoop.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      operation: "recommend",
      status: cleanString(state.status),
      writePerformed: false,
      actionExecuted: false,
      target: state.target,
      scope: state.scope,
      state,
      nextAction: state.nextAction || {},
      summary: {
        status: cleanString(state.status),
        nextAction: cleanString(state.nextAction?.action),
        nextActionEnabled: state.nextAction?.enabled !== false,
        readyForDraft: state.summary?.readyForDraft === true,
        readyForPublish: state.summary?.readyForPublish === true,
        stageCheckpointReady: state.summary?.stageCheckpointReady === true,
        stageCheckpointActive: state.summary?.stageCheckpointActive === true,
        auditComplete: state.summary?.auditComplete === true,
        recommendationEvidenceReady: state.summary?.recommendationEvidenceReady === true
      }
    };
  }

  function recordRunAttempt(result = {}, context = {}) {
    if (!runRepository || typeof runRepository.recordRun !== "function") return result;
    const actionResult = context.actionResult || result.actionResult || {};
    const selectors = Object.assign({}, resultSelectors(actionResult), context.selectors || {});
    const beforeSummary = publicStateSummary(context.before || result.before || {});
    const afterSummary = publicStateSummary(context.after || result.after || {});
    const target = targetFrom(context.before || result.before || {}, context.input || {});
    const scope = scopeFrom(context.before || result.before || {}, context.input || {});
    const action = cleanString(context.actionName || result.executedAction || result.nextAction?.action || context.nextAction?.action);
    let recorded;
    try {
      recorded = runRepository.recordRun({
        workspaceId: target.workspaceId,
        learnerId: target.learnerId,
        programId: scope.programId,
        domainPackId: scope.domainPackId,
        domain: scope.domain,
        subject: scope.subject,
        horizon: scope.horizon,
        operation: cleanString(result.operation || "run_next") || "run_next",
        action,
        executionMode: cleanString(result.executionMode || context.executionMode || executionModeFor(action)),
        status: cleanString(result.status || (result.ok ? "executed" : "blocked")),
        error: cleanString(result.error),
        writePerformed: result.writePerformed === true,
        actionExecuted: result.actionExecuted === true,
        taskCardId: cleanString(selectors.taskCardId || actionResult.taskCardId || context.nextAction?.taskCardId),
        planDraftId: cleanString(selectors.planDraftId || actionResult.planDraftId || context.nextAction?.planDraftId),
        selectedItemId: cleanString(selectors.itemId || actionResult.selectedItemId || context.nextAction?.itemId),
        stageAssessmentCycleId: cleanString(selectors.stageAssessmentCycleId || actionResult.cycleId),
        target,
        scope,
        nextAction: publicNextAction(context.nextAction || result.nextAction || {}),
        beforeSummary: beforeSummary || {},
        actionResult,
        afterSummary: afterSummary || {},
        resultSelectors: selectors,
        requestedBy: cleanString(context.input?.requestedBy || context.input?.requested_by)
      });
    } catch (error) {
      recorded = {
        ok: false,
        error: cleanString(error && error.message ? error.message : error) || "learning_operating_loop_run_audit_failed"
      };
    }
    const runAudit = publicRunAudit(recorded);
    const summary = Object.assign({}, result.summary || {}, {
      operatingLoopRunId: cleanString(runAudit?.runId),
      runAuditStatus: cleanString(runAudit?.status || "not_recorded"),
      runAuditOk: runAudit?.ok === true
    });
    return Object.assign({}, result, {
      runAudit,
      operatingLoopRun: recorded?.run || null,
      summary
    });
  }

  function listRuns(input = {}) {
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) {
      return Object.assign(unavailable("learning_operating_loop_privacy_failed", { privacyFindings }), {
        schemaVersion: "growth.learningOperatingLoopRuns.v1",
        operation: "list_runs"
      });
    }
    if (!runRepository || typeof runRepository.listRuns !== "function") {
      return Object.assign(unavailable("learning_operating_loop_run_repository_unavailable"), {
        schemaVersion: "growth.learningOperatingLoopRuns.v1",
        operation: "list_runs"
      });
    }
    const runs = runRepository.listRuns(input);
    const latestRun = runs[0] || null;
    return {
      ok: true,
      source: "growth-learning-operating-loop-service",
      schemaVersion: "growth.learningOperatingLoopRuns.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      operation: "list_runs",
      status: "listed",
      writePerformed: false,
      target: targetFrom({}, input),
      scope: scopeFrom({}, input),
      count: runs.length,
      runs,
      latestRun,
      summary: {
        runCount: runs.length,
        latestRunId: cleanString(latestRun?.runId),
        latestStatus: cleanString(latestRun?.status),
        latestAction: cleanString(latestRun?.action),
        latestError: cleanString(latestRun?.error),
        latestWritePerformed: latestRun?.writePerformed === true
      }
    };
  }

  async function runNext(input = {}) {
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) {
      return unavailable("learning_operating_loop_privacy_failed", { privacyFindings });
    }
    const before = stateFor(input);
    if (!before?.ok) {
      return recordRunAttempt(unavailable(before?.error || "learning_operating_loop_state_failed", {
        before: before ? {
          ok: before.ok === true,
          error: cleanString(before.error)
        } : null
      }), { input, before });
    }
    const nextAction = before.nextAction || {};
    const actionName = cleanString(nextAction.action);
    const requestedAction = cleanString(input.action || input.nextAction || input.next_action || input.operation);
    const canonicalRequestedAction = requestedAction === "run-next" ? "run_next" : requestedAction;
    if (!actionName || !supportedAction(actionName)) {
      return recordRunAttempt(unavailable("learning_operating_loop_next_action_unsupported", { before, nextAction }), {
        input,
        before,
        nextAction,
        actionName
      });
    }
    if (canonicalRequestedAction && !["run_next", "next", "advance", actionName].includes(canonicalRequestedAction)) {
      return recordRunAttempt(unavailable("learning_operating_loop_action_mismatch", {
        before,
        expectedAction: actionName,
        requestedAction: canonicalRequestedAction
      }), { input, before, nextAction, actionName });
    }
    if (nextAction.enabled === false) {
      return recordRunAttempt(unavailable("learning_operating_loop_next_action_disabled", { before, nextAction }), {
        input,
        before,
        nextAction,
        actionName
      });
    }

    const scopedInput = executionInput(input, before);
    let actionResult = null;
    let writePerformed = false;

    if (actionName === "draft_daily_plan") {
      if (!dailyLoopService || typeof dailyLoopService.advance !== "function") {
        return recordRunAttempt(unavailable("learning_operating_loop_daily_loop_service_unavailable", { before, nextAction }), {
          input: scopedInput,
          before,
          nextAction,
          actionName
        });
      }
      actionResult = publicDailyLoopResult(await dailyLoopService.advance(scopedInput));
      writePerformed = actionResult.ok === true;
    } else if (actionName === "publish_selected_plan_item") {
      if (!dailyLoopService || typeof dailyLoopService.publish !== "function") {
        return recordRunAttempt(unavailable("learning_operating_loop_daily_loop_service_unavailable", { before, nextAction }), {
          input: scopedInput,
          before,
          nextAction,
          actionName
        });
      }
      actionResult = publicDailyLoopResult(await dailyLoopService.publish(Object.assign({}, scopedInput, {
        planDraftId: cleanString(scopedInput.planDraftId || scopedInput.plan_draft_id || nextAction.planDraftId),
        itemId: cleanString(scopedInput.itemId || scopedInput.item_id || scopedInput.selectedItemId || scopedInput.selected_item_id || nextAction.itemId)
      })));
      writePerformed = actionResult.ok === true;
    } else if (actionName === "review_stage_assessment") {
      if (!bool(input.allowStageActivation || input.allow_stage_activation || input.confirmStageAssessment || input.confirm_stage_assessment)) {
        return recordRunAttempt(unavailable("stage_assessment_owner_confirmation_required", {
          before,
          nextAction,
          status: "blocked",
          confirmationRequired: true,
          writePerformed: false
        }), { input: scopedInput, before, nextAction, actionName });
      }
      if (!stageAssessmentService || typeof stageAssessmentService.activateStageAssessment !== "function") {
        return recordRunAttempt(unavailable("learning_operating_loop_stage_assessment_service_unavailable", { before, nextAction }), {
          input: scopedInput,
          before,
          nextAction,
          actionName
        });
      }
      const coverage = uniqueStrings(scopedInput.assessmentCoverageNodeIds || scopedInput.targetNodeIds);
      actionResult = publicStageActivationResult(await stageAssessmentService.activateStageAssessment(Object.assign({}, scopedInput, {
        targetNodeId: cleanString(scopedInput.targetNodeId || scopedInput.target_node_id || coverage[0]),
        targetNodeIds: coverage,
        assessmentCoverageNodeIds: coverage,
        activationSource: "owner_manual",
        activationReason: cleanString(scopedInput.activationReason || scopedInput.activation_reason || "owner_confirmed_checkpoint")
      })));
      writePerformed = actionResult.ok === true;
    } else {
      return recordRunAttempt(unavailable("learning_operating_loop_action_requires_separate_flow", {
        before,
        nextAction,
        requiredActor: cleanString(nextAction.requiredActor || "owner"),
        endpoint: cleanString(nextAction.endpoint),
        taskCardId: cleanString(nextAction.taskCardId)
      }), { input: scopedInput, before, nextAction, actionName });
    }

    const selectors = resultSelectors(actionResult);
    const after = stateFor(Object.assign({}, scopedInput, selectors));
    const executionMode = executionModeFor(actionName);
    return recordRunAttempt({
      ok: actionResult.ok === true,
      source: "growth-learning-operating-loop-service",
      schemaVersion: "growth.learningOperatingLoop.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      operation: "run_next",
      status: actionResult.ok ? "executed" : "failed",
      writePerformed,
      actionExecuted: actionResult.ok === true,
      executedAction: actionName,
      executionMode,
      target: before.target,
      scope: before.scope,
      before,
      actionResult,
      after: after?.ok ? after : {
        ok: false,
        error: cleanString(after?.error || "learning_operating_loop_after_state_failed")
      },
      nextActionAfter: after?.ok ? after.nextAction : null,
      error: actionResult.ok ? "" : cleanString(actionResult.error || "learning_operating_loop_action_failed"),
      summary: {
        executedAction: actionName,
        executionMode,
        beforeStatus: cleanString(before.status),
        afterStatus: cleanString(after?.status),
        taskCardId: cleanString(actionResult.taskCardId),
        planDraftId: cleanString(actionResult.planDraftId),
        stageAssessmentCycleId: cleanString(actionResult.cycleId),
        writePerformed
      }
    }, {
      input: scopedInput,
      before,
      nextAction,
      actionName,
      actionResult,
      after,
      selectors,
      executionMode
    });
  }

  return {
    listRuns,
    recommend,
    runNext
  };
}

module.exports = {
  createLearningOperatingLoopService,
  scanPrivacy
};
