"use strict";

const RELEASE_WORKBENCH_ACTION_SCHEMA = "growth.learningAutomationReleaseWorkbenchAction.v1";
const RELEASE_WORKBENCH_ACTION_AUDIT_LIST_SCHEMA = "growth.learningAutomationReleaseWorkbenchActionAuditList.v1";
const {
  UI_EVIDENCE_FILE_FIELDS
} = require("./learning-automation-ui-evidence-task-registry");

const PRIVACY_KEY_RE = /(raw|prompt|transcript|answer[_-]?key|secret|token|cookie|authorization|provider[_-]?config|api[_-]?key|access[_-]?key|private[_-]?key)/i;
const PRIVATE_VALUE_RE = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|X-Hermes-Web-Key|X-Hermes-Access-Key|access-key\.txt|access-key|launch-token)/i;
const TRANSIENT_EVIDENCE_FILE_KEYS = new Set([
  "centralVisualEvidenceFile",
  "central_visual_evidence_file",
  ...UI_EVIDENCE_FILE_FIELDS
]);

const SUPPORTED_ENDPOINTS = Object.freeze([
  "release_readiness_snapshot",
  "release_evidence",
  "release_approval",
  "release_evidence_collection",
  "release_collection_run",
  "release_decision",
  "release_package",
  "release_preflight",
  "release_activation",
  "runtime_enablement",
  "automation_digest",
  "automation_failure_policy",
  "automation_action_handoff",
  "automation_scheduler_worker_target"
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

function booleanFlag(value) {
  return value === true || value === "true" || value === 1 || value === "1";
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

function inputForPrivacyScan(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(inputForPrivacyScan);
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    TRANSIENT_EVIDENCE_FILE_KEYS.has(key) ? "[transient_evidence_file]" : inputForPrivacyScan(child)
  ]));
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

function digestIdFrom(input = {}) {
  return cleanString(input.digestId || input.digest_id, 180);
}

function policyIdFrom(input = {}) {
  return cleanString(input.policyId || input.policy_id, 180);
}

function handoffIdFrom(input = {}) {
  return cleanString(input.handoffId || input.handoff_id, 180);
}

function workerTargetIdFrom(input = {}) {
  return cleanString(input.targetId || input.target_id || input.workerTargetId || input.worker_target_id, 180);
}

function requireEndpointService(scope, endpointKey, services, input = {}) {
  if (endpointKey === "release_readiness_snapshot") return requireMethod(scope, "release_readiness", services.releaseReadinessService, "createSnapshot");
  if (endpointKey === "release_evidence") return requireMethod(scope, "release_evidence", services.releaseEvidenceService, "recordEvidence");
  if (endpointKey === "release_approval") return requireMethod(scope, "release_approval", services.releaseApprovalService, "recordApproval");
  if (endpointKey === "release_evidence_collection") return requireMethod(scope, "release_evidence_collection", services.releaseEvidenceCollectionService, "collect");
  if (endpointKey === "release_collection_run") return requireMethod(scope, "release_collection_run", services.releaseCollectionRunService, "recordRun");
  if (endpointKey === "release_decision") return requireMethod(scope, "release_decision", services.releaseDecisionService, "recordDecision");
  if (endpointKey === "release_package") return requireMethod(scope, "release_package", services.releasePackageService, "recordPackage");
  if (endpointKey === "release_preflight") return requireMethod(scope, "release_preflight", services.releasePreflightService, "recordReport");
  if (endpointKey === "release_activation") return requireMethod(scope, "release_activation", services.releaseActivationService, "recordActivation");
  if (endpointKey === "runtime_enablement") return requireMethod(scope, "runtime_enablement", services.runtimeEnablementService, "recordEnablement");
  if (endpointKey === "automation_digest") {
    return requireMethod(scope, "automation_digest", services.automationDigestService, digestIdFrom(input) ? "reviewDigest" : "createDigest");
  }
  if (endpointKey === "automation_failure_policy") {
    return requireMethod(scope, "automation_failure_policy", services.automationFailurePolicyService, policyIdFrom(input) ? "reviewPolicy" : "createPolicy");
  }
  if (endpointKey === "automation_action_handoff") {
    return requireMethod(scope, "automation_action_handoff", services.automationActionHandoffService, handoffIdFrom(input) ? "deliverHandoff" : "createHandoff");
  }
  if (endpointKey === "automation_scheduler_worker_target") {
    return requireMethod(scope, "automation_scheduler_worker_target", services.automationSchedulerWorkerTargetService, workerTargetIdFrom(input) ? "reviewTarget" : "createTarget");
  }
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

function shouldBuildReleasePackage(input = {}) {
  return booleanFlag(input.buildReleasePackage)
    || booleanFlag(input.build_release_package)
    || booleanFlag(input.buildAndRecordPackage)
    || booleanFlag(input.build_and_record_package)
    || booleanFlag(input.recordPackageFromBuild)
    || booleanFlag(input.record_package_from_build);
}

function reviewStatusFromInput(input = {}, fallback = "") {
  return cleanString(input.status || input.reviewStatus || input.review_status || input.reviewAction || input.review_action || fallback, 120);
}

function baseInput(input = {}, scope = {}) {
  return Object.assign({}, input, scope, {
    requestedBy: input.requestedBy || input.requested_by,
    recordedBy: input.recordedBy || input.recorded_by || input.approvedBy || input.approved_by || input.requestedBy || input.requested_by,
    approvedBy: input.approvedBy || input.approved_by || input.recordedBy || input.recorded_by || input.requestedBy || input.requested_by,
    createdBy: input.createdBy || input.created_by || input.requestedBy || input.requested_by,
    reviewedBy: input.reviewedBy || input.reviewed_by || input.recordedBy || input.recorded_by || input.requestedBy || input.requested_by,
    deliveredBy: input.deliveredBy || input.delivered_by || input.recordedBy || input.recorded_by || input.requestedBy || input.requested_by
  });
}

async function callWriteService(endpointKey, input, scope, services) {
  const base = baseInput(input, scope);
  if (endpointKey === "release_readiness_snapshot") {
    return services.releaseReadinessService.createSnapshot(base);
  }
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
  if (endpointKey === "release_evidence_collection") {
    return services.releaseEvidenceCollectionService.collect(Object.assign({}, base, {
      allowWriteCollection: true,
      ownerAuthorizedWrite: true
    }));
  }
  if (endpointKey === "release_collection_run") {
    return services.releaseCollectionRunService.recordRun(base);
  }
  if (endpointKey === "release_decision") {
    return services.releaseDecisionService.recordDecision(Object.assign({}, base, {
      autoSelectLatestReadyCollectionRun: true
    }));
  }
  if (endpointKey === "release_package") {
    const releasePackage = input.releasePackage || input.release_package || input.package;
    if (shouldBuildReleasePackage(input)) {
      if (!services.releasePackageService || typeof services.releasePackageService.buildPackage !== "function") {
        return unavailable("release_workbench_action_release_package_build_unavailable", scope);
      }
      return services.releasePackageService.buildPackage(Object.assign({}, base, {
        writePackageRecord: true,
        allowWritePackage: true,
        ownerAuthorizedWrite: true
      }));
    }
    if (!releasePackage) return unavailable("release_workbench_action_release_package_required", scope);
    return services.releasePackageService.recordPackage(Object.assign({}, base, {
      releasePackage,
      ownerAuthorizedWrite: true
    }));
  }
  if (endpointKey === "release_preflight") {
    return services.releasePreflightService.recordReport(Object.assign({}, base, {
      allowWritePreflight: true,
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
  if (endpointKey === "automation_digest") {
    const digestId = digestIdFrom(input);
    if (digestId) {
      return services.automationDigestService.reviewDigest(Object.assign({}, base, {
        digestId,
        status: reviewStatusFromInput(input, "reviewed"),
        reviewedBy: base.reviewedBy,
        reviewedAt: input.reviewedAt || input.reviewed_at || input.recordedAt || input.recorded_at || input.createdAt || input.created_at
      }));
    }
    return services.automationDigestService.createDigest(base);
  }
  if (endpointKey === "automation_failure_policy") {
    const policyId = policyIdFrom(input);
    if (policyId) {
      return services.automationFailurePolicyService.reviewPolicy(Object.assign({}, base, {
        policyId,
        status: reviewStatusFromInput(input, "active"),
        reviewedBy: base.reviewedBy,
        reviewedAt: input.reviewedAt || input.reviewed_at || input.recordedAt || input.recorded_at || input.createdAt || input.created_at
      }));
    }
    return services.automationFailurePolicyService.createPolicy(base);
  }
  if (endpointKey === "automation_action_handoff") {
    const handoffId = handoffIdFrom(input);
    if (handoffId) {
      return await services.automationActionHandoffService.deliverHandoff(Object.assign({}, base, {
        handoffId,
        deliveredBy: base.deliveredBy,
        deliveredAt: input.deliveredAt || input.delivered_at || input.recordedAt || input.recorded_at || input.createdAt || input.created_at
      }));
    }
    return services.automationActionHandoffService.createHandoff(Object.assign({}, base, {
      digestId: digestIdFrom(input)
    }));
  }
  if (endpointKey === "automation_scheduler_worker_target") {
    const targetId = workerTargetIdFrom(input);
    if (targetId) {
      return services.automationSchedulerWorkerTargetService.reviewTarget(Object.assign({}, base, {
        targetId,
        status: reviewStatusFromInput(input, "enabled"),
        reviewedBy: base.reviewedBy,
        reviewedAt: input.reviewedAt || input.reviewed_at || input.recordedAt || input.recorded_at || input.createdAt || input.created_at
      }));
    }
    return services.automationSchedulerWorkerTargetService.createTarget(base);
  }
  return unavailable("release_workbench_action_endpoint_unsupported", scope, { endpointKey });
}

function resultRecord(endpointKey, result = {}) {
  if (endpointKey === "release_readiness_snapshot") return result.snapshot || null;
  if (endpointKey === "release_evidence") return result.evidence || null;
  if (endpointKey === "release_approval") return result.approval || null;
  if (endpointKey === "release_evidence_collection") return result.collection || null;
  if (endpointKey === "release_collection_run") return result.run || null;
  if (endpointKey === "release_decision") return result.decision || null;
  if (endpointKey === "release_package") return result.record?.package || result.package || null;
  if (endpointKey === "release_preflight") return result.report || null;
  if (endpointKey === "release_activation") return result.activation || null;
  if (endpointKey === "runtime_enablement") return result.enablement || null;
  if (endpointKey === "automation_digest") return result.digest || null;
  if (endpointKey === "automation_failure_policy") return result.policy || null;
  if (endpointKey === "automation_action_handoff") return result.handoff || null;
  if (endpointKey === "automation_scheduler_worker_target") return result.target || null;
  return null;
}

function actionRecordId(record = {}) {
  const summary = objectOnly(record.summary);
  const artifacts = objectOnly(record.artifacts);
  const releaseCollectionRun = objectOnly(artifacts.releaseCollectionRun || artifacts.release_collection_run);
  return cleanString(
    record?.readinessId ||
    record?.evidenceRecordId ||
    record?.approvalId ||
    record?.collectionRunId ||
    record?.collection_run_id ||
    summary.collectionRunId ||
    summary.collection_run_id ||
    releaseCollectionRun.runId ||
    releaseCollectionRun.run_id ||
    releaseCollectionRun.collectionRunId ||
    releaseCollectionRun.collection_run_id ||
    record?.runId ||
    record?.decisionId ||
    record?.packageId ||
    record?.preflightReportId ||
    record?.reportId ||
    record?.activationId ||
    record?.enablementId ||
    record?.handoffId ||
    record?.targetId ||
    record?.workerTargetId ||
    record?.digestId ||
    record?.policyId,
    180
  );
}

function actionRecordStatus(record = {}) {
  return cleanString(
    record?.status ||
    record?.deliveryStatus ||
    record?.delivery_status ||
    record?.reviewStatus ||
    record?.review_status,
    120
  );
}

function actionRecordSummary(endpointKey, input = {}, record = {}) {
  return {
    schemaVersion: "growth.learningAutomationReleaseWorkbenchAction.record.v1",
    summaryOnly: true,
    endpointKey,
    actionKey: actionKeyFrom(input),
    recordId: actionRecordId(record),
    recordStatus: actionRecordStatus(record)
  };
}

function requestedByFrom(input = {}) {
  return cleanString(input.requestedBy || input.requested_by || input.createdBy || input.created_by || input.recordedBy || input.recorded_by, 180);
}

function auditSummaryFrom({ endpointKey, input, status, actionRecord, duplicate, workbenchStatus, error } = {}) {
  return {
    schemaVersion: "growth.learningAutomationReleaseWorkbenchActionAudit.summary.v1",
    summaryOnly: true,
    endpointKey,
    actionKey: actionKeyFrom(input),
    status: cleanString(status, 80),
    recordId: cleanString(actionRecord?.recordId, 180),
    recordStatus: cleanString(actionRecord?.recordStatus, 120),
    duplicate: duplicate === true,
    workbenchStatus: cleanString(workbenchStatus, 120),
    error: cleanString(error, 180),
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false
  };
}

function auditInputFrom({ input, scope, endpointKey, status, actionRecord, duplicate, workbenchStatus, error } = {}) {
  const summary = auditSummaryFrom({ endpointKey, input, status, actionRecord, duplicate, workbenchStatus, error });
  return Object.assign({}, scope, {
    endpointKey,
    actionKey: actionKeyFrom(input),
    status: summary.status || "blocked",
    recordId: summary.recordId,
    recordStatus: summary.recordStatus,
    duplicate: summary.duplicate,
    workbenchStatus: summary.workbenchStatus,
    error: summary.error,
    actionRecord: actionRecord || {},
    actionSummary: summary,
    requestedBy: requestedByFrom(input),
    privacyClass: "summary_only",
    summaryOnly: true,
    createdAt: input.createdAt || input.created_at || input.requestedAt || input.requested_at
  });
}

function actionWriteSucceeded(endpointKey, result = {}) {
  if (endpointKey === "release_evidence_collection") {
    const collection = objectOnly(result?.collection);
    if (!Object.keys(collection).length) return false;
    const summary = objectOnly(collection.summary);
    if (summary.releaseEvidenceRecordsWritten === true) return true;
    if (Number(summary.releaseEvidenceRecordRecordedCount || 0) > 0) return true;
    if (Number(summary.releaseEvidenceRecordDuplicateCount || 0) > 0) return true;
    const status = cleanString(collection.status || collection.summary?.status, 120);
    return !["blocked", "failed", "error"].includes(status);
  }
  if (endpointKey === "release_package" && result?.record) return result.record.ok === true;
  return result?.ok === true;
}

function failureActionRecord(endpointKey, input = {}, result = {}) {
  if (endpointKey !== "release_evidence_collection") return null;
  const record = resultRecord(endpointKey, result);
  if (!record) return null;
  const status = cleanString(record.status || objectOnly(record.summary).status, 120);
  if (!["blocked", "failed", "error"].includes(status)) return null;
  return actionRecordSummary(endpointKey, input, record);
}

function createLearningAutomationReleaseWorkbenchActionService(options = {}) {
  const releaseWorkbenchService = options.releaseWorkbenchService || null;
  const releaseReadinessService = options.releaseReadinessService || null;
  const releaseEvidenceService = options.releaseEvidenceService || null;
  const releaseEvidenceCollectionService = options.releaseEvidenceCollectionService || null;
  const releaseApprovalService = options.releaseApprovalService || null;
  const releaseCollectionRunService = options.releaseCollectionRunService || null;
  const releaseDecisionService = options.releaseDecisionService || null;
  const releasePackageService = options.releasePackageService || null;
  const releasePreflightService = options.releasePreflightService || null;
  const releaseActivationService = options.releaseActivationService || null;
  const runtimeEnablementService = options.runtimeEnablementService || null;
  const automationDigestService = options.automationDigestService || options.digestService || null;
  const automationFailurePolicyService = options.automationFailurePolicyService || options.failurePolicyService || null;
  const automationActionHandoffService = options.automationActionHandoffService || options.actionHandoffService || null;
  const automationSchedulerWorkerTargetService = options.automationSchedulerWorkerTargetService || options.schedulerWorkerTargetService || null;
  const actionAuditRepository = options.actionAuditRepository || options.repository || null;

  function saveActionAudit(auditInput) {
    if (!actionAuditRepository || typeof actionAuditRepository.saveActionAudit !== "function") return null;
    return actionAuditRepository.saveActionAudit(auditInput);
  }

  function attachActionAudit(response, auditInput) {
    const saved = saveActionAudit(auditInput);
    if (!saved) return response;
    return Object.assign({}, response, {
      actionAudit: saved.actionAudit || null,
      actionAuditStatus: saved.ok ? "recorded" : "failed",
      actionAuditError: saved.ok ? undefined : cleanString(saved.error, 180)
    });
  }

  async function recordAction(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("release_workbench_action_scope_required", scope);
    const privacyScope = inputForPrivacyScan(input);
    const privacyFindings = scanPrivacyKeys(privacyScope).concat(scanPrivateValues(privacyScope)).slice(0, 16);
    if (privacyFindings.length) return unavailable("release_workbench_action_privacy_failed", scope, { privacyFindings });

    const endpointKey = endpointKeyFrom(input);
    if (!endpointKey) return unavailable("release_workbench_action_endpoint_required", scope, { supportedEndpointKeys: SUPPORTED_ENDPOINTS });
    const missingWorkbench = requireMethod(scope, "workbench", releaseWorkbenchService, "workbench");
    if (missingWorkbench) return missingWorkbench;

    const workbench = releaseWorkbenchService.workbench(Object.assign({}, input, scope));
    if (!workbench?.ok) {
      const response = unavailable(workbench?.error || "release_workbench_action_workbench_blocked", scope, {
        endpointKey,
        workbenchStatus: cleanString(workbench?.status, 120)
      });
      return attachActionAudit(response, auditInputFrom({
        input,
        scope,
        endpointKey,
        status: "blocked",
        duplicate: false,
        workbenchStatus: response.workbenchStatus,
        error: response.error
      }));
    }
    const routes = availableRecordRoutes(workbench);
    if (!routes.has(endpointKey)) {
      const response = unavailable("release_workbench_action_endpoint_not_advertised", scope, { endpointKey });
      return attachActionAudit(response, auditInputFrom({
        input,
        scope,
        endpointKey,
        status: "blocked",
        duplicate: false,
        workbenchStatus: cleanString(workbench.status, 120),
        error: response.error
      }));
    }

    const services = {
      releaseReadinessService,
      releaseEvidenceService,
      releaseEvidenceCollectionService,
      releaseApprovalService,
      releaseCollectionRunService,
      releaseDecisionService,
      releasePackageService,
      releasePreflightService,
      releaseActivationService,
      runtimeEnablementService,
      automationDigestService,
      automationFailurePolicyService,
      automationActionHandoffService,
      automationSchedulerWorkerTargetService
    };
    const missing = requireEndpointService(scope, endpointKey, services, input);
    if (missing) {
      return attachActionAudit(missing, auditInputFrom({
        input,
        scope,
        endpointKey,
        status: "blocked",
        duplicate: false,
        workbenchStatus: cleanString(workbench.status, 120),
        error: missing.error
      }));
    }
    const result = await callWriteService(endpointKey, input, scope, services);
    if (!actionWriteSucceeded(endpointKey, result)) {
      const actionRecord = failureActionRecord(endpointKey, input, result);
      const response = Object.assign(unavailable(result?.error || "release_workbench_action_record_failed", scope, {
        endpointKey,
        actionRecord,
        writeResult: result || null
      }), { duplicate: result?.duplicate === true });
      return attachActionAudit(response, auditInputFrom({
        input,
        scope,
        endpointKey,
        status: "blocked",
        actionRecord,
        duplicate: response.duplicate === true,
        workbenchStatus: cleanString(workbench.status, 120),
        error: response.error
      }));
    }
    const record = resultRecord(endpointKey, result);
    const actionRecord = actionRecordSummary(endpointKey, input, record);
    const response = Object.assign({}, scope, {
      ok: true,
      source: "growth-learning-automation-release-workbench-action-service",
      schemaVersion: RELEASE_WORKBENCH_ACTION_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      status: "recorded",
      endpointKey,
      actionKey: actionKeyFrom(input),
      duplicate: result.duplicate === true,
      actionRecord,
      writeResult: result,
      workbenchStatus: cleanString(workbench.status, 120),
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false
    });
    return attachActionAudit(response, auditInputFrom({
      input,
      scope,
      endpointKey,
      status: "recorded",
      actionRecord,
      duplicate: result.duplicate === true,
      workbenchStatus: response.workbenchStatus,
      error: ""
    }));
  }

  function listActionAudits(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("release_workbench_action_audit_scope_required", scope);
    if (!actionAuditRepository || typeof actionAuditRepository.listActionAudits !== "function") {
      return unavailable("learning_automation_release_workbench_action_audit_repository_unavailable", scope);
    }
    const audits = actionAuditRepository.listActionAudits(Object.assign({}, input, scope));
    return Object.assign({}, scope, {
      ok: true,
      source: "growth-learning-automation-release-workbench-action-service",
      schemaVersion: RELEASE_WORKBENCH_ACTION_AUDIT_LIST_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      status: "listed",
      actionAudits: audits,
      actionAuditCount: audits.length,
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false
    });
  }

  return {
    listActionAudits,
    recordAction
  };
}

module.exports = {
  RELEASE_WORKBENCH_ACTION_AUDIT_LIST_SCHEMA,
  RELEASE_WORKBENCH_ACTION_SCHEMA,
  SUPPORTED_ENDPOINTS,
  createLearningAutomationReleaseWorkbenchActionService
};
