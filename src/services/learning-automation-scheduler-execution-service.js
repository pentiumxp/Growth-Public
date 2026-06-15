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
const RELEASE_ACTIVATION_SCHEMA = "growth.learningAutomationReleaseActivation.v1";
const READY_ACTIVATION_STATUSES = new Set(["ready_for_owner_config_enablement", "already_enabled"]);

function unique(values = []) {
  return Array.from(new Set(values.map((value) => cleanString(value)).filter(Boolean)));
}

function valuesFrom(value) {
  if (Array.isArray(value)) return value.flatMap((item) => valuesFrom(item));
  if (value === undefined || value === null || value === "") return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function activationGateKey(value) {
  const token = cleanString(value).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!token) return "";
  if (["writefulexecution", "writeful", "writefulexecutionapproval"].includes(token)) return "writeful_execution";
  if (["backgroundscheduler", "scheduler", "backgroundschedulerapproval"].includes(token)) return "background_scheduler";
  if (["backgroundworker", "worker", "backgroundworkerapproval"].includes(token)) return "background_worker";
  return cleanString(value);
}

function requestedActivationGateKeys(input = {}) {
  const explicit = valuesFrom(input.activationGates || input.activation_gates)
    .concat(valuesFrom(input.requestedActivationGates || input.requested_activation_gates))
    .concat(valuesFrom(input.activationGate || input.activation_gate));
  const gates = unique(explicit.map(activationGateKey).filter(Boolean));
  if (!gates.includes("writeful_execution")) gates.unshift("writeful_execution");
  return gates;
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
    error: cleanString(error) || "learning_automation_scheduler_execution_unavailable"
  }, extra);
}

function executionMode(input = {}) {
  return cleanString(input.executionMode || input.execution_mode || input.mode || "owner_explicit_once") || "owner_explicit_once";
}

function scopeFrom(input = {}, handoff = {}) {
  return {
    workspaceId: cleanString(input.workspaceId || input.workspace_id || handoff.workspaceId),
    learnerId: cleanString(input.learnerId || input.learner_id || handoff.learnerId || input.workspaceId || input.workspace_id),
    programId: cleanString(input.programId || input.program_id || handoff.programId),
    handoffId: cleanString(input.handoffId || input.handoff_id),
    digestId: cleanString(input.digestId || input.digest_id || handoff.digestId),
    policyId: cleanString(input.policyId || input.policy_id || handoff.policyId),
    proposalId: cleanString(input.proposalId || input.proposal_id),
    planDraftId: cleanString(input.planDraftId || input.plan_draft_id),
    selectedItemId: cleanString(input.selectedItemId || input.selected_item_id || input.itemId || input.item_id),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id || handoff.domainPackId),
    domain: cleanString(input.domain || handoff.domain),
    subject: cleanString(input.subject || handoff.subject),
    horizon: cleanString(input.horizon || handoff.horizon || "daily_plan") || "daily_plan",
    collectionRunId: cleanString(input.collectionRunId || input.collection_run_id || input.releaseCollectionRunId || input.release_collection_run_id)
  };
}

function handoffHasAction(handoff = {}, scope = {}) {
  return asArray(handoff.actions).some((action = {}) => {
    if (scope.proposalId && cleanString(action.proposalId || action.proposal_id) !== scope.proposalId) return false;
    if (scope.planDraftId && cleanString(action.planDraftId || action.plan_draft_id) !== scope.planDraftId) return false;
    if (scope.selectedItemId && cleanString(action.selectedItemId || action.selected_item_id) !== scope.selectedItemId) return false;
    return true;
  });
}

function selectCandidate(dryRun = {}, scope = {}) {
  return asArray(dryRun.candidates).find((candidate = {}) => {
    if (scope.proposalId && cleanString(candidate.proposalId) !== scope.proposalId) return false;
    if (scope.planDraftId && cleanString(candidate.planDraftId) !== scope.planDraftId) return false;
    if (scope.selectedItemId && cleanString(candidate.selectedItemId) !== scope.selectedItemId) return false;
    return true;
  }) || null;
}

function activationRecordSummary(activation = {}) {
  const activationDecision = objectOnly(activation.activationDecision);
  const activationPreflight = objectOnly(activation.activationPreflight);
  const evidenceSummary = objectOnly(activation.evidenceSummary);
  return {
    activationId: cleanString(activation.activationId),
    activationVersion: cleanString(activation.activationVersion || activation.schemaVersion),
    status: cleanString(activation.status),
    privacyClass: cleanString(activation.privacyClass),
    collectionRunId: cleanString(activation.collectionRunId),
    requestedActivationGates: unique(asArray(activation.requestedActivationGates)
      .concat(asArray(evidenceSummary.requestedActivationGates))
      .map(activationGateKey)),
    activationDecision: {
      status: cleanString(activationDecision.status),
      decision: cleanString(activationDecision.decision),
      recordOnly: activationDecision.recordOnly === true,
      advisoryOnly: activationDecision.advisoryOnly === true,
      preflightPassed: activationDecision.preflightPassed === true,
      readyForOwnerRuntimeConfigDecision: activationDecision.readyForOwnerRuntimeConfigDecision === true,
      configChangeApplied: activationDecision.configChangeApplied === true,
      writefulSchedulingAllowed: activationDecision.writefulSchedulingAllowed === true,
      runtimeConfigChange: activationDecision.runtimeConfigChange === true
    },
    activationPreflight: {
      status: cleanString(activationPreflight.status),
      preflightPassed: activationPreflight.preflightPassed === true,
      readyForOwnerRuntimeConfigDecision: activationPreflight.readyForOwnerRuntimeConfigDecision === true,
      configChangeApplied: activationPreflight.configChangeApplied === true,
      writefulSchedulingAllowed: activationPreflight.writefulSchedulingAllowed === true,
      runtimeConfigChange: activationPreflight.runtimeConfigChange === true
    },
    evidenceSummary: {
      preflightPassed: evidenceSummary.preflightPassed === true,
      readyForOwnerRuntimeConfigDecision: evidenceSummary.readyForOwnerRuntimeConfigDecision === true,
      configChangeApplied: evidenceSummary.configChangeApplied === true,
      writefulSchedulingAllowed: evidenceSummary.writefulSchedulingAllowed === true,
      runtimeConfigChange: evidenceSummary.runtimeConfigChange === true
    }
  };
}

function activationGateKeysFromRecord(activation = {}) {
  return unique(asArray(activation.requestedActivationGates)
    .concat(asArray(activation.activationGates).map((gate) => (
      gate && typeof gate === "object" ? (gate.key || gate.approvalKey || gate.approval_key) : gate
    )))
    .concat(asArray(objectOnly(activation.evidenceSummary).requestedActivationGates))
    .map(activationGateKey));
}

function validateActivationRecord(activation = {}, requiredActivationGates = []) {
  const reasons = [];
  const status = cleanString(activation.status);
  const activationVersion = cleanString(activation.activationVersion || activation.schemaVersion);
  const activationDecision = objectOnly(activation.activationDecision);
  const activationPreflight = objectOnly(activation.activationPreflight);
  const evidenceSummary = objectOnly(activation.evidenceSummary);
  const gateKeys = activationGateKeysFromRecord(activation);

  if (activationVersion !== RELEASE_ACTIVATION_SCHEMA) reasons.push("schema_version_invalid");
  if (cleanString(activation.privacyClass) !== "summary_only") reasons.push("privacy_class_invalid");
  if (!READY_ACTIVATION_STATUSES.has(status)) reasons.push("status_not_ready");
  if (activationDecision.recordOnly !== true) reasons.push("record_only_required");
  if (activationDecision.advisoryOnly !== true) reasons.push("advisory_only_required");
  if (
    activation.configChangeApplied === true
    || activation.writefulSchedulingAllowed === true
    || activation.runtimeConfigChange === true
    || activationDecision.configChangeApplied === true
    || activationDecision.writefulSchedulingAllowed === true
    || activationDecision.runtimeConfigChange === true
    || activationPreflight.configChangeApplied === true
    || activationPreflight.writefulSchedulingAllowed === true
    || activationPreflight.runtimeConfigChange === true
    || evidenceSummary.configChangeApplied === true
    || evidenceSummary.writefulSchedulingAllowed === true
    || evidenceSummary.runtimeConfigChange === true
  ) {
    reasons.push("runtime_config_change_forbidden");
  }
  if (
    activationDecision.preflightPassed !== true
    && activationPreflight.preflightPassed !== true
    && evidenceSummary.preflightPassed !== true
  ) {
    reasons.push("preflight_pass_required");
  }
  if (
    status === "ready_for_owner_config_enablement"
    && activationDecision.readyForOwnerRuntimeConfigDecision !== true
    && activationPreflight.readyForOwnerRuntimeConfigDecision !== true
    && evidenceSummary.readyForOwnerRuntimeConfigDecision !== true
  ) {
    reasons.push("owner_runtime_config_decision_required");
  }
  requiredActivationGates.forEach((gate) => {
    if (!gateKeys.includes(gate)) reasons.push(`activation_gate_missing:${gate}`);
  });

  return {
    ok: reasons.length === 0,
    reasons: unique(reasons),
    summary: activationRecordSummary(activation)
  };
}

function releaseActivationGateSummary(gate = {}) {
  return {
    schemaVersion: "growth.learningAutomationSchedulerExecution.releaseActivationGate.v1",
    summaryOnly: true,
    activationRecordRequired: gate.activationRecordRequired === true,
    activationRecordPresent: gate.activationRecordPresent === true,
    valid: gate.valid === true,
    reason: cleanString(gate.reason || gate.error),
    requiredActivationGates: asArray(gate.requiredActivationGates).map((key) => cleanString(key)).filter(Boolean),
    activationId: cleanString(gate.activationId),
    status: cleanString(gate.status),
    inspectedActivationCount: Number(gate.inspectedActivationCount || 0) || 0,
    invalidReasons: asArray(gate.invalidReasons).map((reason) => cleanString(reason)).filter(Boolean),
    activation: gate.activation ? activationRecordSummary(gate.activation) : null
  };
}

function gateSummary(input = {}) {
  const handoff = input.handoff || {};
  const digest = input.digest || {};
  const readiness = input.readiness || {};
  const dryRun = input.dryRun || {};
  const candidate = input.candidate || {};
  const releaseAuthorization = input.releaseAuthorization || {};
  const releaseActivation = input.releaseActivation || {};
  return {
    schemaVersion: "growth.learningAutomationSchedulerExecution.gate.v1",
    summaryOnly: true,
    writefulExecutionEnabled: Boolean(input.writefulExecutionEnabled),
    executionMode: cleanString(input.executionMode),
    actionHandoff: {
      handoffId: cleanString(handoff.handoffId),
      status: cleanString(handoff.status),
      deliveryStatus: cleanString(handoff.deliveryStatus)
    },
    digest: {
      digestId: cleanString(digest.digestId),
      status: cleanString(digest.status)
    },
    failurePolicy: {
      status: cleanString(readiness.status),
      readyForWritefulAutomationPrerequisite: readiness.readyForWritefulAutomationPrerequisite === true,
      writefulSchedulingAllowed: false,
      policyId: cleanString(readiness.summary?.policyId || readiness.policy?.policyId)
    },
    dryRun: {
      ok: Boolean(dryRun.ok),
      dryRun: dryRun.dryRun === true,
      writePlanned: dryRun.writePlanned === true,
      writesPerformed: dryRun.writesPerformed === true,
      publishPlanned: dryRun.publishPlanned === true
    },
    candidate: {
      proposalId: cleanString(candidate.proposalId),
      decision: cleanString(candidate.decision),
      safeToPublish: candidate.safeToPublish === true,
      wouldPublish: candidate.wouldPublish === true
    },
    releaseAuthorization: {
      schemaVersion: cleanString(releaseAuthorization.schemaVersion),
      status: cleanString(releaseAuthorization.status),
      authorized: releaseAuthorization.authorized === true,
      reason: cleanString(releaseAuthorization.reason || releaseAuthorization.error),
      writefulSchedulingAllowed: releaseAuthorization.writefulSchedulingAllowed === true,
      runtimeConfigChange: releaseAuthorization.runtimeConfigChange === true,
      requiredApprovalKeys: asArray(releaseAuthorization.requiredApprovalKeys).map((key) => cleanString(key)).filter(Boolean),
      missingApprovalKeys: asArray(releaseAuthorization.missingApprovalKeys).map((key) => cleanString(key)).filter(Boolean)
    },
    releaseActivation: releaseActivationGateSummary(releaseActivation)
  };
}

function actionSummary(scope = {}, candidate = {}) {
  return {
    schemaVersion: "growth.learningAutomationSchedulerExecution.action.v1",
    summaryOnly: true,
    requiredActor: "owner",
    proposalId: scope.proposalId || cleanString(candidate.proposalId),
    planDraftId: scope.planDraftId || cleanString(candidate.planDraftId),
    selectedItemId: scope.selectedItemId || cleanString(candidate.selectedItemId),
    handoffId: scope.handoffId,
    digestId: scope.digestId,
    publishDelegation: "learning-automation-proposal-service.publishAcceptedProposal"
  };
}

function publishExecutionStatus(publishResult = {}) {
  if (publishResult.ok) return "published";
  if (publishResult.proposal?.execution?.status === "blocked") return "blocked";
  if (publishResult.error === "learning_automation_proposal_not_accepted") return "blocked";
  return "failed";
}

function createLearningAutomationSchedulerExecutionService(options = {}) {
  const repository = options.repository || null;
  const actionHandoffService = options.actionHandoffService || null;
  const digestService = options.digestService || null;
  const failurePolicyService = options.failurePolicyService || null;
  const schedulerService = options.schedulerService || null;
  const automationProposalService = options.automationProposalService || null;
  const releaseAuthorizationService = options.releaseAuthorizationService || null;
  const releaseActivationService = options.releaseActivationService || null;
  const allowWritefulExecution = options.allowWritefulExecution === true;

  function listExecutions(input = {}) {
    if (!repository || typeof repository.listExecutions !== "function") {
      return unavailable("learning_automation_scheduler_execution_repository_unavailable");
    }
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    if (!workspaceId) return unavailable("learning_automation_scheduler_execution_scope_required");
    const executions = repository.listExecutions(input);
    return {
      ok: true,
      source: "growth-learning-automation-scheduler-execution-service",
      workspaceId,
      learnerId: cleanString(input.learnerId || input.learner_id || workspaceId),
      count: executions.length,
      executions
    };
  }

  function recordBlocked(scope = {}, input = {}, reason, extra = {}) {
    const executionResult = repository.recordExecution(Object.assign({}, scope, {
      executionId: input.executionId || input.execution_id,
      mode: executionMode(input),
      status: "blocked",
      reason,
      error: reason,
      gate: gateSummary(Object.assign({}, extra, {
        executionMode: executionMode(input),
        writefulExecutionEnabled: allowWritefulExecution
      })),
      action: actionSummary(scope, extra.candidate || {}),
      execution: {
        schemaVersion: "growth.learningAutomationSchedulerExecution.execution.v1",
        summaryOnly: true,
        status: "blocked",
        reason,
        retryRequiresOwner: true
      },
      createdBy: input.requestedBy || input.requested_by,
      executedBy: input.requestedBy || input.requested_by,
      createdAt: input.createdAt || input.created_at,
      updatedAt: input.executedAt || input.executed_at || input.updatedAt || input.updated_at,
      privacyClass: "summary_only"
    }));
    return Object.assign(unavailable(reason, extra), {
      execution: executionResult?.execution || null
    });
  }

  function releaseActivationGate(scope = {}, input = {}) {
    const requiredActivationGates = requestedActivationGateKeys(input);
    const base = {
      activationRecordRequired: true,
      activationRecordPresent: false,
      valid: false,
      requiredActivationGates,
      inspectedActivationCount: 0
    };
    if (!releaseActivationService || typeof releaseActivationService.listActivations !== "function") {
      return Object.assign({}, base, {
        ok: false,
        reason: "learning_automation_scheduler_execution_release_activation_unavailable"
      });
    }
    const result = releaseActivationService.listActivations(Object.assign({}, scope, {
      collectionRunId: scope.collectionRunId || input.collectionRunId || input.collection_run_id || input.releaseCollectionRunId || input.release_collection_run_id,
      activationGates: requiredActivationGates,
      limit: Math.max(1, Math.min(10, Number(input.activationRecordLimit || input.activation_record_limit || 10) || 10))
    }));
    if (!result?.ok) {
      return Object.assign({}, base, {
        ok: false,
        reason: result?.error || "learning_automation_scheduler_execution_release_activation_unavailable"
      });
    }
    const activations = asArray(result.activations);
    if (!activations.length) {
      return Object.assign({}, base, {
        ok: false,
        reason: "learning_automation_scheduler_execution_release_activation_required"
      });
    }
    const validations = activations.map((activation) => validateActivationRecord(activation, requiredActivationGates));
    const acceptedIndex = validations.findIndex((validation) => validation.ok);
    if (acceptedIndex < 0) {
      return Object.assign({}, base, {
        ok: false,
        activationRecordPresent: true,
        inspectedActivationCount: activations.length,
        reason: "learning_automation_scheduler_execution_release_activation_invalid",
        invalidReasons: unique(validations.flatMap((validation) => validation.reasons)),
        activation: activations[0]
      });
    }
    const activation = activations[acceptedIndex];
    return Object.assign({}, base, {
      ok: true,
      activationRecordPresent: true,
      valid: true,
      inspectedActivationCount: activations.length,
      activationId: cleanString(activation.activationId),
      status: cleanString(activation.status),
      activation
    });
  }

  async function executeOnce(input = {}) {
    if (!repository || typeof repository.recordExecution !== "function") {
      return unavailable("learning_automation_scheduler_execution_repository_unavailable");
    }
    if (!actionHandoffService || typeof actionHandoffService.getHandoff !== "function") {
      return unavailable("learning_automation_scheduler_execution_handoff_unavailable");
    }
    if (!digestService || typeof digestService.getDigest !== "function") {
      return unavailable("learning_automation_scheduler_execution_digest_unavailable");
    }
    if (!failurePolicyService || typeof failurePolicyService.evaluateReadiness !== "function") {
      return unavailable("learning_automation_scheduler_execution_failure_policy_unavailable");
    }
    if (!schedulerService || typeof schedulerService.dryRun !== "function") {
      return unavailable("learning_automation_scheduler_execution_dry_run_unavailable");
    }
    if (!automationProposalService || typeof automationProposalService.publishAcceptedProposal !== "function") {
      return unavailable("learning_automation_scheduler_execution_proposal_publish_unavailable");
    }
    const mode = executionMode(input);
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    const handoffId = cleanString(input.handoffId || input.handoff_id);
    const proposalId = cleanString(input.proposalId || input.proposal_id);
    if (!workspaceId || !handoffId || !proposalId) {
      return unavailable("learning_automation_scheduler_execution_scope_required");
    }
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) return unavailable("learning_automation_scheduler_execution_privacy_failed", { privacyFindings });
    const initialScope = scopeFrom(input);
    if (mode !== "owner_explicit_once") {
      return recordBlocked(initialScope, input, "learning_automation_scheduler_execution_mode_invalid");
    }
    if (!allowWritefulExecution) {
      return recordBlocked(initialScope, input, "learning_automation_scheduler_execution_disabled");
    }

    const handoffResult = actionHandoffService.getHandoff({ workspaceId, handoffId });
    if (!handoffResult?.ok || !handoffResult.handoff) {
      return recordBlocked(initialScope, input, handoffResult?.error || "learning_automation_scheduler_execution_handoff_not_found");
    }
    const handoff = handoffResult.handoff;
    const scope = scopeFrom(input, handoff);
    if (cleanString(handoff.deliveryStatus) !== "delivered" || cleanString(handoff.status) !== "delivered") {
      return recordBlocked(scope, input, "learning_automation_scheduler_execution_handoff_not_delivered", { handoff });
    }
    if (!handoffHasAction(handoff, scope)) {
      return recordBlocked(scope, input, "learning_automation_scheduler_execution_handoff_action_missing", { handoff });
    }

    const digestResult = digestService.getDigest({ workspaceId: scope.workspaceId, digestId: scope.digestId });
    if (!digestResult?.ok || !digestResult.digest) {
      return recordBlocked(scope, input, digestResult?.error || "learning_automation_scheduler_execution_digest_not_found", { handoff });
    }
    const digest = digestResult.digest;
    if (cleanString(digest.status) !== "reviewed") {
      return recordBlocked(scope, input, "learning_automation_scheduler_execution_digest_not_reviewed", { handoff, digest });
    }

    const readiness = failurePolicyService.evaluateReadiness(scope);
    if (!readiness?.ok || readiness.readyForWritefulAutomationPrerequisite !== true) {
      return recordBlocked(scope, input, readiness?.error || "learning_automation_scheduler_execution_policy_not_ready", { handoff, digest, readiness });
    }

    const dryRun = schedulerService.dryRun(Object.assign({}, scope, {
      proposalId: scope.proposalId,
      planDraftId: scope.planDraftId,
      selectedItemId: scope.selectedItemId,
      limit: input.limit || 50,
      requestedBy: input.requestedBy || input.requested_by
    }));
    if (!dryRun?.ok || dryRun.dryRun !== true || dryRun.writePlanned === true || dryRun.writesPerformed === true || dryRun.publishPlanned === true) {
      return recordBlocked(scope, input, dryRun?.error || "learning_automation_scheduler_execution_dry_run_failed", { handoff, digest, readiness, dryRun });
    }
    const candidate = selectCandidate(dryRun, scope);
    if (!candidate) {
      return recordBlocked(scope, input, "learning_automation_scheduler_execution_candidate_missing", { handoff, digest, readiness, dryRun });
    }
    if (candidate.decision !== "would_publish" || candidate.safeToPublish !== true || candidate.wouldPublish !== true) {
      return recordBlocked(scope, input, candidate.reason || candidate.decision || "learning_automation_scheduler_execution_candidate_blocked", {
        handoff,
        digest,
        readiness,
        dryRun,
        candidate
      });
    }
    if (!releaseAuthorizationService || typeof releaseAuthorizationService.authorize !== "function") {
      return recordBlocked(scope, input, "learning_automation_scheduler_execution_release_authorization_unavailable", {
        handoff,
        digest,
        readiness,
        dryRun,
        candidate
      });
    }
    const releaseAuthorization = releaseAuthorizationService.authorize(Object.assign({}, scope, {
      collectionRunId: input.collectionRunId || input.collection_run_id || input.releaseCollectionRunId || input.release_collection_run_id,
      requiredApprovalKeys: input.requiredApprovalKeys || input.required_approval_keys,
      requestedBy: input.requestedBy || input.requested_by
    }));
    if (!releaseAuthorization?.ok || releaseAuthorization.authorized !== true) {
      return recordBlocked(scope, input, releaseAuthorization?.error || releaseAuthorization?.reason || "learning_automation_scheduler_execution_release_authorization_required", {
        handoff,
        digest,
        readiness,
        dryRun,
        candidate,
        releaseAuthorization
      });
    }
    const releaseActivation = releaseActivationGate(scope, input);
    if (!releaseActivation.ok) {
      return recordBlocked(scope, input, releaseActivation.reason || "learning_automation_scheduler_execution_release_activation_required", {
        handoff,
        digest,
        readiness,
        dryRun,
        candidate,
        releaseAuthorization,
        releaseActivation
      });
    }

    const started = repository.recordExecution(Object.assign({}, scope, {
      executionId: input.executionId || input.execution_id,
      mode,
      status: "started",
      reason: "owner_explicit_execution_started",
      gate: gateSummary({ handoff, digest, readiness, dryRun, candidate, releaseAuthorization, releaseActivation, executionMode: mode, writefulExecutionEnabled: true }),
      action: actionSummary(scope, candidate),
      execution: {
        schemaVersion: "growth.learningAutomationSchedulerExecution.execution.v1",
        summaryOnly: true,
        status: "started"
      },
      createdBy: input.requestedBy || input.requested_by,
      executedBy: input.requestedBy || input.requested_by,
      createdAt: input.createdAt || input.created_at,
      updatedAt: input.startedAt || input.started_at,
      privacyClass: "summary_only"
    }));
    if (!started?.ok) return started || unavailable("learning_automation_scheduler_execution_start_record_failed");

    let publishResult = null;
    try {
      publishResult = await automationProposalService.publishAcceptedProposal({
        workspaceId: scope.workspaceId,
        learnerId: scope.learnerId,
        proposalId: scope.proposalId,
        generationKey: input.generationKey || input.generation_key,
        cardSchemaVersion: input.cardSchemaVersion || input.card_schema_version,
        requestedBy: input.requestedBy || input.requested_by,
        executedAt: input.executedAt || input.executed_at
      });
    } catch (error) {
      publishResult = {
        ok: false,
        error: "learning_automation_scheduler_execution_publish_exception",
        message: boundedText(error?.message, 180)
      };
    }
    const status = publishExecutionStatus(publishResult || {});
    const finalRecord = repository.recordExecution(Object.assign({}, scope, {
      executionId: started.execution.executionId,
      mode,
      status,
      reason: publishResult?.ok ? "accepted_proposal_published" : (publishResult?.error || "accepted_proposal_publish_failed"),
      error: publishResult?.ok ? "" : (publishResult?.error || "learning_automation_scheduler_execution_publish_failed"),
      gate: gateSummary({ handoff, digest, readiness, dryRun, candidate, releaseAuthorization, releaseActivation, executionMode: mode, writefulExecutionEnabled: true }),
      action: actionSummary(scope, candidate),
      execution: {
        schemaVersion: "growth.learningAutomationSchedulerExecution.execution.v1",
        summaryOnly: true,
        status,
        proposalExecutionStatus: cleanString(publishResult?.proposal?.execution?.status),
        generatedTaskCardId: cleanString(publishResult?.proposal?.execution?.generatedTaskCardId),
        retryRequiresOwner: status !== "published"
      },
      publishResult: publishResult || {},
      createdBy: input.requestedBy || input.requested_by,
      executedBy: input.requestedBy || input.requested_by,
      createdAt: started.execution.createdAt,
      updatedAt: input.executedAt || input.executed_at,
      privacyClass: "summary_only"
    }));
    if (!finalRecord?.ok) {
      return finalRecord || unavailable("learning_automation_scheduler_execution_record_failed", { publishResult });
    }
    return {
      ok: status === "published",
      source: "growth-learning-automation-scheduler-execution-service",
      error: status === "published" ? "" : (publishResult?.error || "learning_automation_scheduler_execution_publish_failed"),
      writefulExecutionEnabled: true,
      execution: finalRecord.execution,
      publishResult
    };
  }

  return {
    executeOnce,
    listExecutions
  };
}

module.exports = {
  createLearningAutomationSchedulerExecutionService
};
