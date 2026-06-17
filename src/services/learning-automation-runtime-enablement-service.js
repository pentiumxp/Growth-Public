"use strict";

const {
  ACTIVATION_GATES,
  RELEASE_ACTIVATION_SCHEMA
} = require("./learning-automation-release-activation-service");

const RUNTIME_ENABLEMENT_SCHEMA = "growth.learningAutomationRuntimeEnablement.v1";
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization|localstorage|sessionstorage|cookie.*jar)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|Bearer\s+|X-Hermes-Web-Key|X-Hermes-Access-Key|access-key\.txt|launch-token|Authorization:)/i;
const VALID_ACTIVATION_RECORD_STATUSES = Object.freeze([
  "ready_for_owner_config_enablement",
  "already_enabled"
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
  for (const [key, child] of Object.entries(value)) scanPrivateValues(child, `${pathName}.${key}`, findings);
  return findings;
}

function unavailable(error, extra = {}) {
  return Object.assign({
    ok: false,
    source: "growth-learning-automation-runtime-enablement-service",
    error: cleanString(error) || "learning_automation_runtime_enablement_unavailable"
  }, extra);
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

function unsafeRuntimeMutation(value = {}) {
  if (!value || typeof value !== "object") return false;
  return value.configChangeApplied === true
    || value.runtimeConfigChange === true
    || value.runtimeConfigMutationPerformed === true
    || value.writefulSchedulingAllowed === true
    || value.backgroundSchedulingAllowed === true
    || value.backgroundWorkerAllowed === true;
}

function activationRecordGateKeys(record = {}) {
  const explicit = valuesFrom(record.requestedActivationGates || record.requested_activation_gates);
  const activationGates = Array.isArray(record.activationGates || record.activation_gates)
    ? (record.activationGates || record.activation_gates).map((item) => (typeof item === "string" ? item : item?.key))
    : valuesFrom(record.activationGates || record.activation_gates);
  return unique(explicit.concat(activationGates).map((value) => {
    const gate = gateByToken(value);
    return gate ? gate.key : value;
  }));
}

function activationRecordPreflightReport(record = {}) {
  const activationPreflight = objectOnly(record.activationPreflight || record.activation_preflight);
  const evidenceSummary = objectOnly(record.evidenceSummary || record.evidence_summary);
  const readback = objectOnly(activationPreflight.preflightReportReadback || activationPreflight.preflight_report_readback || record.preflightReportReadback || record.preflight_report_readback);
  const latest = objectOnly(readback.latestReport || readback.latest_report);
  const preflightReportId = cleanString(
    activationPreflight.latestPreflightReportId
      || activationPreflight.latest_preflight_report_id
      || evidenceSummary.latestPreflightReportId
      || evidenceSummary.latest_preflight_report_id
      || readback.latestPreflightReportId
      || readback.latest_preflight_report_id
      || latest.preflightReportId
      || latest.preflight_report_id
      || latest.reportId
      || latest.report_id,
    180
  );
  if (!preflightReportId) return null;
  return {
    preflightReportId,
    status: cleanString(
      activationPreflight.latestPreflightStatus
        || activationPreflight.latest_preflight_status
        || evidenceSummary.latestPreflightStatus
        || evidenceSummary.latest_preflight_status
        || readback.latestPreflightStatus
        || readback.latest_preflight_status
        || latest.status,
      120
    ),
    readyForProductionDeploy: false,
    readyForProductionDeployReview: activationPreflight.latestPreflightReadyForProductionDeployReview === true
      || activationPreflight.latest_preflight_ready_for_production_deploy_review === true
      || readback.latestPreflightReadyForProductionDeployReview === true
      || readback.latest_preflight_ready_for_production_deploy_review === true
      || latest.readyForProductionDeployReview === true
      || latest.ready_for_production_deploy_review === true,
    readyForOwnerReleaseActivation: activationPreflight.latestPreflightReadyForOwnerReleaseActivation === true
      || activationPreflight.latest_preflight_ready_for_owner_release_activation === true
      || evidenceSummary.latestPreflightReadyForOwnerReleaseActivation === true
      || evidenceSummary.latest_preflight_ready_for_owner_release_activation === true
      || readback.latestPreflightReadyForOwnerReleaseActivation === true
      || readback.latest_preflight_ready_for_owner_release_activation === true
      || latest.readyForOwnerReleaseActivation === true
      || latest.ready_for_owner_release_activation === true
  };
}

function currentConfigSummary(gates, config) {
  const gatesSummary = gates.map((gate) => ({
    key: gate.key,
    label: gate.label,
    configKey: gate.configKey,
    envName: gate.envName,
    currentEnabled: config[gate.configKey] === true
  }));
  return {
    schemaVersion: "growth.learningAutomationRuntimeConfig.summary.v1",
    summaryOnly: true,
    gates: gatesSummary,
    enabledConfigKeys: gatesSummary.filter((gate) => gate.currentEnabled).map((gate) => gate.configKey),
    disabledConfigKeys: gatesSummary.filter((gate) => !gate.currentEnabled).map((gate) => gate.configKey),
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false
  };
}

function activationIsValidForGate(record = {}, gate) {
  const activationDecision = objectOnly(record.activationDecision || record.activation_decision);
  const activationPreflight = objectOnly(record.activationPreflight || record.activation_preflight);
  const evidenceSummary = objectOnly(record.evidenceSummary || record.evidence_summary);
  const gateKeys = activationRecordGateKeys(record);
  const preflightPassed = activationDecision.preflightPassed === true
    || activationPreflight.preflightPassed === true
    || evidenceSummary.preflightPassed === true;
  const recordOnly = activationDecision.recordOnly === true;
  const advisoryOnly = activationDecision.advisoryOnly === true;
  const mutationDetected = unsafeRuntimeMutation(record)
    || unsafeRuntimeMutation(activationDecision)
    || unsafeRuntimeMutation(activationPreflight)
    || unsafeRuntimeMutation(evidenceSummary);

  return record.privacyClass === "summary_only"
    && record.activationVersion === RELEASE_ACTIVATION_SCHEMA
    && VALID_ACTIVATION_RECORD_STATUSES.includes(cleanString(record.status).toLowerCase())
    && gateKeys.includes(gate.key)
    && preflightPassed
    && recordOnly
    && advisoryOnly
    && !mutationDetected;
}

function summarizeActivationRecords(activationList, gates) {
  const records = Array.isArray(activationList?.activations) ? activationList.activations : [];
  const byGate = gates.map((gate) => {
    const matching = records.filter((record) => activationRecordGateKeys(record).includes(gate.key));
    const valid = matching.find((record) => activationIsValidForGate(record, gate)) || null;
    const preflightReport = activationRecordPreflightReport(valid || matching[0] || {});
    return {
      gate: gate.key,
      configKey: gate.configKey,
      activationRecordCount: matching.length,
      validActivationRecordId: cleanString(valid?.activationId || valid?.activation_id, 160),
      valid: Boolean(valid),
      latestPreflightReportId: cleanString(preflightReport?.preflightReportId, 180),
      latestPreflightStatus: cleanString(preflightReport?.status, 120),
      latestPreflightReadyForProductionDeployReview: preflightReport?.readyForProductionDeployReview === true,
      latestPreflightReadyForOwnerReleaseActivation: preflightReport?.readyForOwnerReleaseActivation === true
    };
  });
  const latestPreflightGate = byGate.find((entry) => entry.latestPreflightReportId) || {};
  return {
    schemaVersion: "growth.learningAutomationRuntimeActivationReadback.v1",
    summaryOnly: true,
    activationRecordCount: records.length,
    validGateCount: byGate.filter((entry) => entry.valid).length,
    missingActivationGates: byGate.filter((entry) => !entry.valid).map((entry) => entry.gate),
    latestPreflightReportId: cleanString(latestPreflightGate.latestPreflightReportId, 180),
    latestPreflightStatus: cleanString(latestPreflightGate.latestPreflightStatus, 120),
    latestPreflightReadyForProductionDeployReview: latestPreflightGate.latestPreflightReadyForProductionDeployReview === true,
    latestPreflightReadyForOwnerReleaseActivation: latestPreflightGate.latestPreflightReadyForOwnerReleaseActivation === true,
    gates: byGate,
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false
  };
}

function statusFrom(currentConfig, activationSummary) {
  if (activationSummary.missingActivationGates.length) {
    return activationSummary.activationRecordCount > 0 ? "activation_record_invalid" : "activation_record_required";
  }
  if (!currentConfig.disabledConfigKeys.length) return "verified_enabled";
  if (currentConfig.enabledConfigKeys.length) return "partial_config";
  return "ready_for_manual_runtime_config_enablement";
}

function actionsFor(status, currentConfig, activationSummary) {
  if (status === "activation_record_required" || status === "activation_record_invalid") {
    return activationSummary.missingActivationGates.map((gate) => ({
      key: `record_${cleanString(gate, 100)}_activation`,
      action: "record_release_activation",
      activationGate: gate,
      requiredActor: "owner"
    }));
  }
  if (status === "ready_for_manual_runtime_config_enablement" || status === "partial_config") {
    return [{
      key: "apply_runtime_config_outside_growth",
      action: status === "partial_config" ? "complete_runtime_config_outside_growth" : "enable_runtime_config_outside_growth",
      configKeys: currentConfig.disabledConfigKeys,
      requiredActor: "owner"
    }];
  }
  if (status === "verified_enabled") {
    return [{
      key: "monitor_scheduler_execution_readback",
      action: "monitor_scheduler_execution_release_readback",
      requiredActor: "owner"
    }];
  }
  return [{
    key: "inspect_runtime_enablement",
    action: "inspect_runtime_enablement_readback",
    requiredActor: "owner"
  }];
}

function decisionSummary(input = {}, result = {}) {
  const requested = objectOnly(input.enablementDecision || input.enablement_decision || input.ownerEnablementDecision || input.owner_enablement_decision);
  const defaultDecision = result.status === "verified_enabled"
    ? "runtime_config_verified"
    : result.status === "ready_for_manual_runtime_config_enablement" || result.status === "partial_config"
      ? "ready_for_manual_runtime_config_enablement"
      : "blocked_or_waiting";
  return Object.assign({}, requested, {
    schemaVersion: cleanString(requested.schemaVersion || requested.schema_version || "growth.learningAutomationRuntimeEnablement.decision.v1", 160),
    summaryOnly: true,
    status: result.status,
    decision: cleanString(requested.decision || requested.status || input.enablementDecisionStatus || input.enablement_decision_status || defaultDecision, 160),
    recordOnly: true,
    advisoryOnly: true,
    runtimeConfigVerified: result.runtimeConfigVerified === true,
    readyForManualRuntimeConfigEnablement: result.readyForManualRuntimeConfigEnablement === true,
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false
  });
}

function evidenceSummary(input = {}, result = {}) {
  const evidence = objectOnly(input.evidence || input.evidenceSummary || input.evidence_summary);
  return Object.assign({}, evidence, {
    schemaVersion: cleanString(evidence.schemaVersion || evidence.schema_version || "growth.learningAutomationRuntimeEnablement.evidence.v1", 160),
    summaryOnly: true,
    status: result.status,
    runtimeConfigVerified: result.runtimeConfigVerified === true,
    readyForManualRuntimeConfigEnablement: result.readyForManualRuntimeConfigEnablement === true,
    requestedActivationGates: result.requestedActivationGates || [],
    requiredConfigKeys: result.requiredConfigKeys || [],
    activationRecordCount: result.activationSummary?.activationRecordCount || 0,
    latestPreflightReportId: cleanString(result.activationSummary?.latestPreflightReportId, 180),
    latestPreflightStatus: cleanString(result.activationSummary?.latestPreflightStatus, 120),
    latestPreflightReadyForOwnerReleaseActivation: result.activationSummary?.latestPreflightReadyForOwnerReleaseActivation === true,
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false
  });
}

function createLearningAutomationRuntimeEnablementService(options = {}) {
  const releaseActivationService = options.releaseActivationService || null;
  const repository = options.repository || null;
  const config = Object.assign({
    automationWritefulExecutionEnabled: false,
    automationBackgroundSchedulerEnabled: false,
    automationBackgroundWorkerEnabled: false
  }, options.config || {});

  function evaluate(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_runtime_enablement_scope_required");
    const privacyFindings = scanPrivacyKeys(input).slice(0, 16);
    const privateValueFindings = scanPrivateValues(input).slice(0, 16);
    if (privacyFindings.length || privateValueFindings.length) {
      return unavailable("learning_automation_runtime_enablement_privacy_failed", { privacyFindings, privateValueFindings });
    }
    if (!releaseActivationService || typeof releaseActivationService.listActivations !== "function") {
      return unavailable("learning_automation_runtime_enablement_activation_service_unavailable");
    }
    const selected = selectedGates(input);
    if (!selected.ok) {
      return unavailable("learning_automation_runtime_enablement_gate_invalid", {
        invalidActivationGates: selected.invalidActivationGates
      });
    }
    const activationList = releaseActivationService.listActivations(Object.assign({}, input, scope, {
      activationGates: selected.gates.map((gate) => gate.key),
      limit: Math.max(1, Math.min(100, Number(input.activationRecordLimit || input.activation_record_limit || input.limit || 20) || 20))
    }));
    if (!activationList?.ok) {
      return unavailable(activationList?.error || "learning_automation_runtime_enablement_activation_readback_failed", {
        status: "blocked"
      });
    }
    const currentConfig = currentConfigSummary(selected.gates, config);
    const activationSummary = summarizeActivationRecords(activationList, selected.gates);
    const status = statusFrom(currentConfig, activationSummary);
    const requiredActions = actionsFor(status, currentConfig, activationSummary);
    const runtimeConfigVerified = status === "verified_enabled";
    const readyForManualRuntimeConfigEnablement = status === "ready_for_manual_runtime_config_enablement" || status === "partial_config";

    return Object.assign({}, scope, {
      ok: true,
      source: "growth-learning-automation-runtime-enablement-service",
      schemaVersion: RUNTIME_ENABLEMENT_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      status,
      requestedActivationGates: selected.gates.map((gate) => gate.key),
      requiredConfigKeys: selected.gates.map((gate) => gate.configKey),
      runtimeConfigVerified,
      readyForManualRuntimeConfigEnablement,
      manualRuntimeConfigRequired: readyForManualRuntimeConfigEnablement,
      advisoryOnly: true,
      recordOnly: true,
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false,
      currentConfig,
      activationSummary,
      latestPreflightReportId: activationSummary.latestPreflightReportId,
      latestPreflightStatus: activationSummary.latestPreflightStatus,
      latestPreflightReadyForProductionDeployReview: activationSummary.latestPreflightReadyForProductionDeployReview,
      latestPreflightReadyForOwnerReleaseActivation: activationSummary.latestPreflightReadyForOwnerReleaseActivation,
      runtimeEnablement: {
        schemaVersion: "growth.learningAutomationRuntimeEnablement.summary.v1",
        summaryOnly: true,
        status,
        runtimeConfigVerified,
        readyForManualRuntimeConfigEnablement,
        latestPreflightReportId: activationSummary.latestPreflightReportId,
        latestPreflightStatus: activationSummary.latestPreflightStatus,
        latestPreflightReadyForProductionDeployReview: activationSummary.latestPreflightReadyForProductionDeployReview,
        latestPreflightReadyForOwnerReleaseActivation: activationSummary.latestPreflightReadyForOwnerReleaseActivation,
        requiredActionCount: requiredActions.length,
        requiredActions,
        nextAction: requiredActions[0] || null,
        configChangeApplied: false,
        runtimeConfigChange: false,
        runtimeConfigMutationPerformed: false,
        writefulSchedulingAllowed: false,
        backgroundSchedulingAllowed: false,
        backgroundWorkerAllowed: false
      }
    });
  }

  function recordEnablement(input = {}) {
    if (!repository || typeof repository.saveEnablement !== "function") {
      return unavailable("learning_automation_runtime_enablement_repository_unavailable");
    }
    const evaluated = evaluate(input);
    if (!evaluated.ok) return evaluated;
    const saveResult = repository.saveEnablement(Object.assign({}, evaluated, {
      enablementVersion: RUNTIME_ENABLEMENT_SCHEMA,
      enablementDecision: decisionSummary(input, evaluated),
      evidenceSummary: evidenceSummary(input, evaluated),
      note: cleanString(input.note || input.reason || input.summary, 720),
      requestedBy: cleanString(input.requestedBy || input.requested_by, 120),
      recordedBy: cleanString(input.recordedBy || input.recorded_by || input.approvedBy || input.approved_by || input.requestedBy || input.requested_by, 120),
      recordedAt: cleanString(input.recordedAt || input.recorded_at || input.approvedAt || input.approved_at, 80),
      createdAt: cleanString(input.createdAt || input.created_at, 80)
    }));
    if (!saveResult?.ok) return saveResult || unavailable("learning_automation_runtime_enablement_save_failed");
    return {
      ok: true,
      source: "growth-learning-automation-runtime-enablement-service",
      duplicate: Boolean(saveResult.duplicate),
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false,
      enablement: saveResult.enablement,
      evaluated
    };
  }

  function listEnablements(input = {}) {
    if (!repository || typeof repository.listEnablements !== "function") {
      return unavailable("learning_automation_runtime_enablement_repository_unavailable");
    }
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_runtime_enablement_scope_required");
    const enablements = repository.listEnablements(Object.assign({}, input, scope, {
      status: cleanString(input.status || input.enablementStatus || input.enablement_status, 120)
    }));
    return {
      ok: true,
      source: "growth-learning-automation-runtime-enablement-service",
      workspaceId: scope.workspaceId,
      learnerId: scope.learnerId,
      count: enablements.length,
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false,
      enablements
    };
  }

  return {
    evaluate,
    listEnablements,
    recordEnablement
  };
}

module.exports = {
  RUNTIME_ENABLEMENT_SCHEMA,
  createLearningAutomationRuntimeEnablementService
};
