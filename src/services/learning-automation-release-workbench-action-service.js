"use strict";

const RELEASE_WORKBENCH_ACTION_SCHEMA = "growth.learningAutomationReleaseWorkbenchAction.v1";

const PRIVACY_KEY_RE = /(raw|prompt|transcript|answer[_-]?key|secret|token|cookie|authorization|provider[_-]?config|api[_-]?key|access[_-]?key|private[_-]?key)/i;
const PRIVATE_VALUE_RE = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|X-Hermes-Web-Key|X-Hermes-Access-Key|access-key\.txt|access-key|launch-token)/i;

const SUPPORTED_ENDPOINTS = Object.freeze([
  "release_evidence",
  "release_approval",
  "release_package",
  "release_activation",
  "runtime_enablement"
]);

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function objectOnly(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function scanPrivacyKeys(value, path = "", findings = [], seen = new Set()) {
  if (!value || typeof value !== "object" || findings.length >= 16 || seen.has(value)) return findings;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (PRIVACY_KEY_RE.test(key)) findings.push(`privacy_key:${nextPath}`);
    if (findings.length >= 16) return findings;
    scanPrivacyKeys(child, nextPath, findings, seen);
    if (findings.length >= 16) return findings;
  }
  return findings;
}

function scanPrivateValues(value, path = "", findings = [], seen = new Set()) {
  if (findings.length >= 16) return findings;
  if (typeof value === "string") {
    if (PRIVATE_VALUE_RE.test(value)) findings.push(`private_value:${path || "value"}`);
    return findings;
  }
  if (!value || typeof value !== "object" || seen.has(value)) return findings;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;
    scanPrivateValues(child, nextPath, findings, seen);
    if (findings.length >= 16) return findings;
  }
  return findings;
}

function scopeFrom(input = {}) {
  return {
    workspaceId: cleanString(input.workspaceId || input.workspace_id, 160),
    learnerId: cleanString(input.learnerId || input.learner_id || input.workspaceId || input.workspace_id, 160),
    displayName: cleanString(input.displayName || input.display_name || input.label, 160),
    label: cleanString(input.label || input.displayName || input.display_name, 160),
    programId: cleanString(input.programId || input.program_id, 160),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id, 160),
    domain: cleanString(input.domain, 120),
    subject: cleanString(input.subject, 120),
    horizon: cleanString(input.horizon || "daily_plan", 80),
    collectionRunId: cleanString(input.collectionRunId || input.collection_run_id || input.runId || input.run_id, 180)
  };
}

function unavailable(error, scope = {}, extra = {}) {
  return Object.assign({}, scope, {
    ok: false,
    source: "growth-learning-automation-release-workbench-action-service",
    schemaVersion: RELEASE_WORKBENCH_ACTION_SCHEMA,
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "blocked",
    error: cleanString(error, 180),
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false
  }, extra);
}

function requireMethod(scope, key, service, method) {
  if (!service || typeof service[method] !== "function") {
    return unavailable(`learning_automation_release_workbench_action_${key}_unavailable`, scope);
  }
  return null;
}

function requireEndpointService(scope, endpointKey, services) {
  if (endpointKey === "release_evidence") return requireMethod(scope, "release_evidence", services.releaseEvidenceService, "recordEvidence");
  if (endpointKey === "release_approval") return requireMethod(scope, "release_approval", services.releaseApprovalService, "recordApproval");
  if (endpointKey === "release_package") return requireMethod(scope, "release_package", services.releasePackageService, "recordPackage");
  if (endpointKey === "release_activation") return requireMethod(scope, "release_activation", services.releaseActivationService, "recordActivation");
  if (endpointKey === "runtime_enablement") return requireMethod(scope, "runtime_enablement", services.runtimeEnablementService, "recordEnablement");
  return unavailable("release_workbench_action_endpoint_unsupported", scope, { endpointKey });
}

function actionFrom(input = {}) {
  return objectOnly(input.action || input.ownerAction || input.owner_action || input.releaseWorkbenchAction || input.release_workbench_action);
}

function endpointKeyFrom(input = {}) {
  const action = actionFrom(input);
  const endpointKey = cleanString(input.endpointKey || input.endpoint_key || action.endpointKey || action.endpoint_key, 120);
  return SUPPORTED_ENDPOINTS.includes(endpointKey) ? endpointKey : "";
}

function availableRecordRoutes(workbench = {}) {
  const summary = objectOnly(workbench.releaseWorkbench);
  return new Set(asArray(summary.recordRoutes || summary.record_routes).map((item) => cleanString(objectOnly(item).key, 120)).filter(Boolean));
}

function actionKeyFrom(input = {}) {
  const action = actionFrom(input);
  return cleanString(input.actionKey || input.action_key || action.key || input.key, 160);
}

function defaultSummary(input = {}, kind = "evidence") {
  const provided = objectOnly(input[kind] || input[`${kind}Summary`] || input[`${kind}_summary`]);
  return Object.assign({}, provided, {
    schemaVersion: cleanString(provided.schemaVersion || provided.schema_version || "growth.learningAutomationReleaseWorkbenchAction.summary.v1", 180),
    summaryOnly: true,
    source: cleanString(provided.source || "release_workbench_action", 120),
    actionKey: actionKeyFrom(input),
    endpointKey: endpointKeyFrom(input)
  });
}

function baseInput(input = {}, scope = {}) {
  return Object.assign({}, input, scope, {
    requestedBy: input.requestedBy || input.requested_by,
    recordedBy: input.recordedBy || input.recorded_by || input.approvedBy || input.approved_by || input.requestedBy || input.requested_by,
    approvedBy: input.approvedBy || input.approved_by || input.recordedBy || input.recorded_by || input.requestedBy || input.requested_by,
    createdBy: input.createdBy || input.created_by || input.requestedBy || input.requested_by
  });
}

function callWriteService(endpointKey, input, scope, services) {
  const base = baseInput(input, scope);
  if (endpointKey === "release_evidence") {
    const evidenceKey = cleanString(input.evidenceKey || input.evidence_key || input.checkKey || input.check_key || actionKeyFrom(input), 160);
    if (!evidenceKey) return unavailable("release_workbench_action_evidence_key_required", scope);
    return services.releaseEvidenceService.recordEvidence(Object.assign({}, base, {
      evidenceKey,
      evidence: defaultSummary(input, "evidence")
    }));
  }
  if (endpointKey === "release_approval") {
    const approvalKey = cleanString(input.approvalKey || input.approval_key || input.configGate || input.config_gate || actionKeyFrom(input), 160);
    if (!approvalKey) return unavailable("release_workbench_action_approval_key_required", scope);
    return services.releaseApprovalService.recordApproval(Object.assign({}, base, {
      approvalKey,
      approval: defaultSummary(input, "approval"),
      evidence: defaultSummary(input, "evidence")
    }));
  }
  if (endpointKey === "release_package") {
    const releasePackage = input.releasePackage || input.release_package || input.package;
    if (!releasePackage) return unavailable("release_workbench_action_release_package_required", scope);
    return services.releasePackageService.recordPackage(Object.assign({}, base, {
      releasePackage,
      ownerAuthorizedWrite: true
    }));
  }
  if (endpointKey === "release_activation") {
    return services.releaseActivationService.recordActivation(Object.assign({}, base, {
      activationDecision: defaultSummary(input, "activationDecision"),
      evidence: defaultSummary(input, "evidence")
    }));
  }
  if (endpointKey === "runtime_enablement") {
    return services.runtimeEnablementService.recordEnablement(Object.assign({}, base, {
      enablementDecision: defaultSummary(input, "enablementDecision"),
      evidence: defaultSummary(input, "evidence")
    }));
  }
  return unavailable("release_workbench_action_endpoint_unsupported", scope, { endpointKey });
}

function resultRecord(endpointKey, result = {}) {
  if (endpointKey === "release_evidence") return result.evidence || null;
  if (endpointKey === "release_approval") return result.approval || null;
  if (endpointKey === "release_package") return result.package || null;
  if (endpointKey === "release_activation") return result.activation || null;
  if (endpointKey === "runtime_enablement") return result.enablement || null;
  return null;
}

function createLearningAutomationReleaseWorkbenchActionService(options = {}) {
  const releaseWorkbenchService = options.releaseWorkbenchService || null;
  const releaseEvidenceService = options.releaseEvidenceService || null;
  const releaseApprovalService = options.releaseApprovalService || null;
  const releasePackageService = options.releasePackageService || null;
  const releaseActivationService = options.releaseActivationService || null;
  const runtimeEnablementService = options.runtimeEnablementService || null;

  function recordAction(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("release_workbench_action_scope_required", scope);
    const privacyFindings = scanPrivacyKeys(input).concat(scanPrivateValues(input)).slice(0, 16);
    if (privacyFindings.length) return unavailable("release_workbench_action_privacy_failed", scope, { privacyFindings });

    const endpointKey = endpointKeyFrom(input);
    if (!endpointKey) return unavailable("release_workbench_action_endpoint_required", scope, { supportedEndpointKeys: SUPPORTED_ENDPOINTS });
    const missingWorkbench = requireMethod(scope, "workbench", releaseWorkbenchService, "workbench");
    if (missingWorkbench) return missingWorkbench;

    const workbench = releaseWorkbenchService.workbench(Object.assign({}, input, scope));
    if (!workbench?.ok) {
      return unavailable(workbench?.error || "release_workbench_action_workbench_blocked", scope, {
        workbenchStatus: cleanString(workbench?.status, 120)
      });
    }
    const routes = availableRecordRoutes(workbench);
    if (!routes.has(endpointKey)) {
      return unavailable("release_workbench_action_endpoint_not_advertised", scope, { endpointKey });
    }

    const services = {
      releaseEvidenceService,
      releaseApprovalService,
      releasePackageService,
      releaseActivationService,
      runtimeEnablementService
    };
    const missing = requireEndpointService(scope, endpointKey, services);
    if (missing) return missing;
    const result = callWriteService(endpointKey, input, scope, services);
    if (!result?.ok) {
      return Object.assign(unavailable(result?.error || "release_workbench_action_record_failed", scope, {
        endpointKey,
        writeResult: result || null
      }), { duplicate: result?.duplicate === true });
    }
    const record = resultRecord(endpointKey, result);
    return Object.assign({}, scope, {
      ok: true,
      source: "growth-learning-automation-release-workbench-action-service",
      schemaVersion: RELEASE_WORKBENCH_ACTION_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      status: "recorded",
      endpointKey,
      actionKey: actionKeyFrom(input),
      duplicate: result.duplicate === true,
      actionRecord: {
        schemaVersion: "growth.learningAutomationReleaseWorkbenchAction.record.v1",
        summaryOnly: true,
        endpointKey,
        actionKey: actionKeyFrom(input),
        recordId: cleanString(record?.evidenceRecordId || record?.approvalId || record?.packageId || record?.activationId || record?.enablementId, 180),
        recordStatus: cleanString(record?.status, 120)
      },
      writeResult: result,
      workbenchStatus: cleanString(workbench.status, 120),
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false
    });
  }

  return {
    recordAction
  };
}

module.exports = {
  RELEASE_WORKBENCH_ACTION_SCHEMA,
  SUPPORTED_ENDPOINTS,
  createLearningAutomationReleaseWorkbenchActionService
};
