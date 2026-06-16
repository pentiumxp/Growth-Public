"use strict";

const RELEASE_ACTIVATION_SCHEMA = "growth.learningAutomationReleaseActivation.v1";
const RELEASE_CLOSURE_SCHEMA = "growth.learningAutomationReleaseClosure.v1";
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization|localstorage|sessionstorage|cookie.*jar)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|X-Hermes-Web-Key|X-Hermes-Access-Key|access-key\.txt|access-key|launch-token)/i;

const ACTIVATION_GATES = Object.freeze([
  Object.freeze({
    key: "writeful_execution",
    aliases: ["writefulexecution", "writeful", "writefulexecutionapproval"],
    approvalKey: "writefulExecutionApproval",
    configKey: "automationWritefulExecutionEnabled",
    envName: "GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED",
    label: "Owner-explicit writeful execution"
  }),
  Object.freeze({
    key: "background_scheduler",
    aliases: ["backgroundscheduler", "scheduler", "backgroundschedulerapproval"],
    approvalKey: "backgroundSchedulerApproval",
    configKey: "automationBackgroundSchedulerEnabled",
    envName: "GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED",
    label: "Background scheduler tick"
  }),
  Object.freeze({
    key: "background_worker",
    aliases: ["backgroundworker", "worker", "backgroundworkerapproval"],
    approvalKey: "backgroundWorkerApproval",
    configKey: "automationBackgroundWorkerEnabled",
    envName: "GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED",
    label: "Background worker lease"
  })
]);

function cleanString(value, max = 500) {
  const text = String(value || "").trim();
  return text.length > max ? text.slice(0, max) : text;
}

function unique(values = []) {
  return Array.from(new Set(values.map((value) => cleanString(value, 160)).filter(Boolean)));
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

function scanPrivacyKeys(value, pathName = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacyKeys(item, `${pathName}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${pathName}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacyKeys(child, childPath, findings);
  }
  return findings;
}

function scanPrivateValues(value, pathName = "$", findings = []) {
  if (typeof value === "string") {
    if (PRIVATE_VALUE_PATTERN.test(value)) findings.push(pathName);
    return findings;
  }
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivateValues(item, `${pathName}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    scanPrivateValues(child, `${pathName}.${key}`, findings);
  }
  return findings;
}

function scopeFrom(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id, 120);
  return {
    workspaceId,
    learnerId: cleanString(input.learnerId || input.learner_id || workspaceId, 120),
    programId: cleanString(input.programId || input.program_id, 160),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id, 160),
    domain: cleanString(input.domain, 120),
    subject: cleanString(input.subject, 120),
    horizon: cleanString(input.horizon || "daily_plan", 80) || "daily_plan",
    collectionRunId: cleanString(input.collectionRunId || input.collection_run_id || input.runId || input.run_id, 160),
    displayName: cleanString(input.displayName || input.display_name, 160),
    label: cleanString(input.label, 160)
  };
}

function unavailable(error, extra = {}) {
  return Object.assign({
    ok: false,
    source: "growth-learning-automation-release-activation-service",
    error: cleanString(error) || "learning_automation_release_activation_unavailable"
  }, extra);
}

function canonicalGateToken(value) {
  return cleanString(value, 160).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function gateByToken(value) {
  const token = canonicalGateToken(value);
  if (!token) return null;
  return ACTIVATION_GATES.find((gate) => (
    canonicalGateToken(gate.key) === token
    || canonicalGateToken(gate.approvalKey) === token
    || gate.aliases.includes(token)
  )) || null;
}

function requestedGateValues(input = {}) {
  return valuesFrom(input.activationGates || input.activation_gates)
    .concat(valuesFrom(input.requestedActivationGates || input.requested_activation_gates))
    .concat(valuesFrom(input.targetActivationGates || input.target_activation_gates))
    .concat(valuesFrom(input.activationGate || input.activation_gate));
}

function selectedGates(input = {}) {
  const explicit = requestedGateValues(input);
  const invalid = explicit.filter((value) => !gateByToken(value)).map((value) => cleanString(value, 120));
  if (invalid.length) return { ok: false, invalidActivationGates: unique(invalid) };

  const gates = explicit.map(gateByToken).filter(Boolean);
  if (!gates.length) {
    valuesFrom(input.requiredApprovalKeys || input.required_approval_keys)
      .map(gateByToken)
      .filter(Boolean)
      .forEach((gate) => gates.push(gate));
  }
  if (!gates.length) gates.push(ACTIVATION_GATES[0]);

  const seen = new Set();
  return {
    ok: true,
    gates: gates.filter((gate) => {
      if (seen.has(gate.key)) return false;
      seen.add(gate.key);
      return true;
    })
  };
}

function requiredApprovalKeysFor(input, gates) {
  return unique(gates.map((gate) => gate.approvalKey)
    .concat(valuesFrom(input.requiredApprovalKeys || input.required_approval_keys)));
}

function closureSummary(closure = {}) {
  const releaseClosure = objectOnly(closure.releaseClosure);
  const executionGate = objectOnly(closure.executionGate);
  return {
    schemaVersion: cleanString(closure.schemaVersion || closure.schema_version, 120),
    status: cleanString(closure.status, 100),
    privacyClass: cleanString(closure.privacyClass || closure.privacy_class, 80),
    summaryOnly: closure.summaryOnly === true || closure.summary_only === true,
    advisoryOnly: closure.advisoryOnly === true,
    backendEvidenceComplete: closure.backendEvidenceComplete === true,
    readyForOwnerReleaseActivation: closure.readyForOwnerReleaseActivation === true,
    writefulSchedulingAllowed: closure.writefulSchedulingAllowed === true,
    runtimeConfigChange: closure.runtimeConfigChange === true,
    missingApprovalKeys: unique(releaseClosure.missingApprovalKeys || executionGate.missingApprovalKeys || closure.missingApprovalKeys),
    requiredActions: Array.isArray(releaseClosure.requiredActions) ? releaseClosure.requiredActions : [],
    nextAction: releaseClosure.nextAction || null
  };
}

function publicAction(action = null) {
  if (!action || typeof action !== "object") return null;
  return {
    key: cleanString(action.key, 120),
    action: cleanString(action.action, 160),
    requiredActor: cleanString(action.requiredActor || action.required_actor, 80)
  };
}

function gateSummary(gate, closure, config) {
  const currentEnabled = config[gate.configKey] === true;
  const missingApproval = closure.missingApprovalKeys.includes(gate.approvalKey);
  return {
    key: gate.key,
    label: gate.label,
    approvalKey: gate.approvalKey,
    configKey: gate.configKey,
    envName: gate.envName,
    currentEnabled,
    missingApproval,
    approved: !missingApproval && closure.backendEvidenceComplete,
    readyForEnablement: !currentEnabled && !missingApproval && closure.backendEvidenceComplete,
    alreadyEnabled: currentEnabled
  };
}

function activationStatus(closure, gates) {
  if (closure.schemaVersion !== RELEASE_CLOSURE_SCHEMA) return "blocked";
  if (!closure.summaryOnly || closure.privacyClass !== "summary_only") return "blocked";
  if (closure.writefulSchedulingAllowed || closure.runtimeConfigChange) return "blocked";
  if (!closure.backendEvidenceComplete || !closure.readyForOwnerReleaseActivation) {
    if (closure.missingApprovalKeys.length) return "approval_required";
    return closure.status || "blocked";
  }
  if (gates.some((gate) => gate.missingApproval)) return "approval_required";
  if (gates.every((gate) => gate.currentEnabled)) return "already_enabled";
  return "ready_for_owner_config_enablement";
}

function activationActions(status, closure, gates) {
  if (status === "ready_for_owner_config_enablement") {
    return [{
      key: "enable_automation_runtime_config",
      action: "enable_runtime_config_gates_after_owner_decision",
      requiredActor: "owner",
      configKeys: gates.filter((gate) => !gate.currentEnabled).map((gate) => gate.configKey),
      envNames: gates.filter((gate) => !gate.currentEnabled).map((gate) => gate.envName)
    }];
  }
  if (status === "already_enabled") {
    return [{
      key: "monitor_release_execution_readback",
      action: "monitor_scheduler_execution_release_readback",
      requiredActor: "owner"
    }];
  }
  const closureActions = closure.requiredActions.map(publicAction).filter(Boolean);
  if (closureActions.length) return closureActions;
  if (closure.missingApprovalKeys.length) {
    return closure.missingApprovalKeys.map((key) => ({
      key: `record_${cleanString(key, 100)}`,
      action: "record_release_approval",
      approvalKey: cleanString(key, 120),
      requiredActor: "owner"
    }));
  }
  return [{
    key: "inspect_release_closure",
    action: "inspect_release_closure_readback",
    requiredActor: "owner"
  }];
}

function activationDecisionSummary(input = {}, result = {}) {
  const requested = objectOnly(input.activationDecision || input.activation_decision || input.ownerActivationDecision || input.owner_activation_decision);
  const defaultDecision = result.status === "ready_for_owner_config_enablement"
    ? "approved_for_config_enablement"
    : result.status === "already_enabled" ? "already_enabled" : "blocked_or_waiting";
  return Object.assign({}, requested, {
    schemaVersion: cleanString(requested.schemaVersion || requested.schema_version || "growth.learningAutomationReleaseActivation.decision.v1", 160),
    summaryOnly: true,
    status: result.status,
    decision: cleanString(requested.decision || requested.status || input.activationDecisionStatus || input.activation_decision_status || defaultDecision, 120),
    preflightPassed: result.preflightPassed === true,
    readyForOwnerRuntimeConfigDecision: result.readyForOwnerRuntimeConfigDecision === true,
    activationAllowed: result.activationAllowed === true,
    recordOnly: true,
    advisoryOnly: true,
    configChangeApplied: false,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false
  });
}

function activationEvidenceSummary(input = {}, result = {}) {
  const evidence = objectOnly(input.evidence || input.evidenceSummary || input.evidence_summary);
  return Object.assign({}, evidence, {
    schemaVersion: cleanString(evidence.schemaVersion || evidence.schema_version || "growth.learningAutomationReleaseActivation.evidence.v1", 160),
    summaryOnly: true,
    status: result.status,
    preflightPassed: result.preflightPassed === true,
    readyForOwnerRuntimeConfigDecision: result.readyForOwnerRuntimeConfigDecision === true,
    requestedActivationGates: result.requestedActivationGates || [],
    requiredApprovalKeys: result.requiredApprovalKeys || [],
    missingApprovalKeys: result.missingApprovalKeys || [],
    configChangeApplied: false,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false
  });
}

function createLearningAutomationReleaseActivationService(options = {}) {
  const releaseClosureService = options.releaseClosureService || null;
  const repository = options.repository || null;
  const config = Object.assign({
    automationWritefulExecutionEnabled: false,
    automationBackgroundSchedulerEnabled: false,
    automationBackgroundWorkerEnabled: false
  }, options.config || {});

  function preflight(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_release_activation_scope_required");
    const privacyFindings = scanPrivacyKeys(input).slice(0, 16);
    const privateValueFindings = scanPrivateValues(input).slice(0, 16);
    if (privacyFindings.length || privateValueFindings.length) {
      return unavailable("learning_automation_release_activation_privacy_failed", {
        privacyFindings,
        privateValueFindings
      });
    }
    if (!releaseClosureService || typeof releaseClosureService.summarize !== "function") {
      return unavailable("learning_automation_release_activation_closure_unavailable");
    }

    const selected = selectedGates(input);
    if (!selected.ok) {
      return unavailable("learning_automation_release_activation_gate_invalid", {
        invalidActivationGates: selected.invalidActivationGates
      });
    }
    const requiredApprovalKeys = requiredApprovalKeysFor(input, selected.gates);
    const closureResult = releaseClosureService.summarize(Object.assign({}, input, scope, { requiredApprovalKeys }));
    if (!closureResult?.ok) {
      return unavailable(closureResult?.error || "learning_automation_release_activation_closure_failed", {
        status: "blocked",
        preflightPassed: false
      });
    }
    const closurePrivacyFindings = scanPrivacyKeys(closureResult).slice(0, 16);
    const closurePrivateValueFindings = scanPrivateValues(closureResult).slice(0, 16);
    if (closurePrivacyFindings.length || closurePrivateValueFindings.length) {
      return unavailable("learning_automation_release_activation_closure_privacy_failed", {
        status: "blocked",
        preflightPassed: false,
        privacyFindings: closurePrivacyFindings,
        privateValueFindings: closurePrivateValueFindings
      });
    }

    const closure = closureSummary(closureResult);
    const gateSummaries = selected.gates.map((gate) => gateSummary(gate, closure, config));
    const status = activationStatus(closure, gateSummaries);
    const actions = activationActions(status, closure, gateSummaries);
    const preflightPassed = status === "ready_for_owner_config_enablement" || status === "already_enabled";
    const readyForOwnerRuntimeConfigDecision = status === "ready_for_owner_config_enablement";

    const result = Object.assign({}, scope, {
      ok: true,
      source: "growth-learning-automation-release-activation-service",
      schemaVersion: RELEASE_ACTIVATION_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      status,
      preflightPassed,
      readyForOwnerReleaseActivation: closure.readyForOwnerReleaseActivation,
      readyForOwnerRuntimeConfigDecision,
      activationAllowed: readyForOwnerRuntimeConfigDecision,
      advisoryOnly: true,
      configChangeApplied: false,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      requestedActivationGates: gateSummaries.map((gate) => gate.key),
      requiredApprovalKeys,
      missingApprovalKeys: unique(gateSummaries.filter((gate) => gate.missingApproval).map((gate) => gate.approvalKey)
        .concat(closure.missingApprovalKeys)),
      releaseClosure: closure,
      activationGates: gateSummaries,
      activationPreflight: {
        schemaVersion: "growth.learningAutomationReleaseActivation.summary.v1",
        summaryOnly: true,
        status,
        preflightPassed,
        readyForOwnerRuntimeConfigDecision,
        activationAllowed: readyForOwnerRuntimeConfigDecision,
        configChangeApplied: false,
        writefulSchedulingAllowed: false,
        runtimeConfigChange: false,
        requiredActionCount: actions.length,
        requiredActions: actions,
        nextAction: actions[0] || null
      }
    });
    const outputPrivacyFindings = scanPrivacyKeys(result).slice(0, 16);
    const outputPrivateValueFindings = scanPrivateValues(result).slice(0, 16);
    if (outputPrivacyFindings.length || outputPrivateValueFindings.length) {
      return unavailable("learning_automation_release_activation_privacy_failed", {
        status: "blocked",
        preflightPassed: false,
        privacyFindings: outputPrivacyFindings,
        privateValueFindings: outputPrivateValueFindings
      });
    }
    return result;
  }

  function recordActivation(input = {}) {
    if (!repository || typeof repository.saveActivation !== "function") {
      return unavailable("learning_automation_release_activation_repository_unavailable");
    }
    const evaluated = preflight(input);
    if (!evaluated.ok) return evaluated;
    const saveResult = repository.saveActivation(Object.assign({}, evaluated, {
      activationVersion: RELEASE_ACTIVATION_SCHEMA,
      activationDecision: activationDecisionSummary(input, evaluated),
      evidenceSummary: activationEvidenceSummary(input, evaluated),
      note: cleanString(input.note || input.reason || input.summary, 720),
      requestedBy: cleanString(input.requestedBy || input.requested_by, 120),
      recordedBy: cleanString(input.recordedBy || input.recorded_by || input.approvedBy || input.approved_by || input.requestedBy || input.requested_by, 120),
      recordedAt: cleanString(input.recordedAt || input.recorded_at || input.approvedAt || input.approved_at, 80),
      createdAt: cleanString(input.createdAt || input.created_at, 80)
    }));
    if (!saveResult?.ok) return saveResult || unavailable("learning_automation_release_activation_save_failed");
    const result = {
      ok: true,
      source: "growth-learning-automation-release-activation-service",
      duplicate: Boolean(saveResult.duplicate),
      configChangeApplied: false,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      activation: saveResult.activation,
      evaluated
    };
    const outputPrivacyFindings = scanPrivacyKeys(result).slice(0, 16);
    const outputPrivateValueFindings = scanPrivateValues(result).slice(0, 16);
    if (outputPrivacyFindings.length || outputPrivateValueFindings.length) {
      return unavailable("learning_automation_release_activation_privacy_failed", {
        status: "blocked",
        preflightPassed: false,
        privacyFindings: outputPrivacyFindings,
        privateValueFindings: outputPrivateValueFindings
      });
    }
    return result;
  }

  function listActivations(input = {}) {
    if (!repository || typeof repository.listActivations !== "function") {
      return unavailable("learning_automation_release_activation_repository_unavailable");
    }
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_release_activation_scope_required");
    const privacyFindings = scanPrivacyKeys(input).slice(0, 16);
    const privateValueFindings = scanPrivateValues(input).slice(0, 16);
    if (privacyFindings.length || privateValueFindings.length) {
      return unavailable("learning_automation_release_activation_privacy_failed", {
        privacyFindings,
        privateValueFindings
      });
    }
    const activations = repository.listActivations(Object.assign({}, input, scope, {
      status: cleanString(input.status || input.activationStatus || input.activation_status, 120)
    }));
    const result = {
      ok: true,
      source: "growth-learning-automation-release-activation-service",
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      count: activations.length,
      configChangeApplied: false,
      writefulSchedulingAllowed: false,
      runtimeConfigChange: false,
      activations
    };
    const outputPrivacyFindings = scanPrivacyKeys(result).slice(0, 16);
    const outputPrivateValueFindings = scanPrivateValues(result).slice(0, 16);
    if (outputPrivacyFindings.length || outputPrivateValueFindings.length) {
      return unavailable("learning_automation_release_activation_privacy_failed", {
        privacyFindings: outputPrivacyFindings,
        privateValueFindings: outputPrivateValueFindings
      });
    }
    return result;
  }

  return {
    listActivations,
    preflight,
    recordActivation
  };
}

module.exports = {
  ACTIVATION_GATES,
  RELEASE_ACTIVATION_SCHEMA,
  createLearningAutomationReleaseActivationService
};
