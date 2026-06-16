"use strict";

const RELEASE_DASHBOARD_SCHEMA = "growth.learningAutomationReleaseDashboard.v1";

const PRIVACY_KEY_RE = /(raw|prompt|transcript|answer[_-]?key|secret|token|cookie|authorization|provider[_-]?config|api[_-]?key|access[_-]?key|private[_-]?key)/i;
const PRIVATE_VALUE_RE = /(\/Users\/|C:\\Users\\|access-key|\.hermes-growth|Authorization:|Bearer\s+)/i;
const OWNER_REVIEW_STAGE_SUMMARY_FIELDS = [
  "proposalCount",
  "acceptedProposalCount",
  "proposedProposalCount",
  "skippedProposalCount",
  "expiredProposalCount",
  "supersededProposalCount",
  "ownerDecisionProposalCount",
  "proposalExecutionCount",
  "publishedProposalExecutionCount",
  "blockedProposalExecutionCount",
  "failedProposalExecutionCount",
  "digestCount",
  "reviewedDigestCount",
  "pendingDigestCount",
  "digestRequiredActionCount",
  "digestBlockedCandidateCount",
  "actionHandoffCount",
  "deliveredHandoffCount",
  "pendingHandoffDeliveryCount",
  "actionHandoffActionCount",
  "blockedActionHandoffCount",
  "schedulerExecutionCount",
  "publishedSchedulerExecutionCount",
  "blockedSchedulerExecutionCount",
  "failedSchedulerExecutionCount",
  "schedulerRunCount",
  "completedSchedulerRunCount",
  "blockedSchedulerRunCount",
  "skippedSchedulerRunCount",
  "reviewedWorkerTargetCount",
  "pendingWorkerTargetReviewCount",
  "disabledWorkerTargetCount"
];

function cleanString(value, max = 160) {
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

function uniqueStrings(values, max = 24) {
  const seen = new Set();
  const out = [];
  for (const value of asArray(values)) {
    const clean = cleanString(value, 140);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= max) break;
  }
  return out;
}

function snakeCaseKey(key) {
  return String(key || "").replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function fieldValue(source = {}, key) {
  if (Object.prototype.hasOwnProperty.call(source, key)) return source[key];
  return source[snakeCaseKey(key)];
}

function ownerReviewStageSummary(value = {}) {
  const readback = objectOnly(value);
  const direct = objectOnly(readback.ownerReviewStageSummary || readback.owner_review_stage_summary);
  const ownerItem = asArray(readback.items || readback.evidenceItems || readback.evidence_items)
    .map(objectOnly)
    .find((item) => {
      const key = cleanString(item.key || item.evidenceKey || item.evidence_key, 160);
      const checkKey = cleanString(item.checkKey || item.check_key, 160);
      return key === "ownerReviewEvidence" || key === "owner_review_evidence" || checkKey === "owner_review_evidence";
    });
  const summary = Object.keys(direct).length
    ? direct
    : objectOnly(ownerItem?.ownerReviewStageSummary || ownerItem?.owner_review_stage_summary);
  if (!Object.keys(summary).length) return null;
  const counters = {};
  let hasSignal = false;
  for (const key of OWNER_REVIEW_STAGE_SUMMARY_FIELDS) {
    const number = Number(fieldValue(summary, key) || 0) || 0;
    counters[key] = number;
    if (number > 0) hasSignal = true;
  }
  const failurePolicyReady = fieldValue(summary, "failurePolicyReady") === true;
  const failurePolicyStatus = cleanString(fieldValue(summary, "failurePolicyStatus"), 120);
  if (failurePolicyReady || failurePolicyStatus) hasSignal = true;
  if (!hasSignal) return null;
  return Object.assign({
    schemaVersion: "growth.learningAutomationReleaseReadback.ownerReviewStageSummary.v1",
    summaryOnly: true
  }, counters, {
    failurePolicyReady,
    failurePolicyStatus
  });
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
    source: "growth-learning-automation-release-dashboard-service",
    schemaVersion: RELEASE_DASHBOARD_SCHEMA,
    privacyClass: "summary_only",
    summaryOnly: true,
    status: "blocked",
    error,
    releaseDashboard: {
      schemaVersion: "growth.learningAutomationReleaseDashboard.summary.v1",
      summaryOnly: true,
      status: "blocked",
      requiredActionCount: 1,
      nextAction: {
        key: error,
        action: "review_release_dashboard_dependency",
        requiredActor: "owner"
      },
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false
    },
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
    return unavailable(`learning_automation_release_dashboard_${key}_unavailable`, scope);
  }
  return null;
}

function actionSummary(value) {
  const action = objectOnly(value);
  if (!Object.keys(action).length) return null;
  return {
    key: cleanString(action.key || action.checkKey || action.check_key || action.evidenceKey || action.evidence_key, 140),
    action: cleanString(action.action || action.type || action.reason, 140),
    requiredActor: cleanString(action.requiredActor || action.required_actor || action.actor, 80),
    label: cleanString(action.label || action.title || action.summary, 180)
  };
}

function actionList(values, max = 12) {
  return asArray(values).map(actionSummary).filter(Boolean).slice(0, max);
}

function evidenceReadbackSummary(value = {}) {
  const readback = objectOnly(value);
  const sourceBundle = objectOnly(readback.sourceBundle || readback.source_bundle);
  return {
    schemaVersion: "growth.learningAutomationReleaseDashboard.evidenceReadbackSummary.v1",
    summaryOnly: true,
    evidenceCount: Number(readback.evidenceCount || readback.evidence_count || 0) || 0,
    presentCount: Number(readback.presentCount || readback.present_count || 0) || 0,
    missingCount: Number(readback.missingCount || readback.missing_count || 0) || 0,
    missingCheckKeys: uniqueStrings(readback.missingCheckKeys || readback.missing_check_keys || []),
    presentEvidenceKeys: uniqueStrings(readback.presentEvidenceKeys || readback.present_evidence_keys || []),
    sourceBundleId: cleanString(readback.sourceBundleId || readback.source_bundle_id
      || sourceBundle.bundleId || sourceBundle.bundle_id || sourceBundle.evidenceBundleId || sourceBundle.evidence_bundle_id, 180),
    sourceBundleStatus: cleanString(readback.sourceBundleStatus || readback.source_bundle_status || sourceBundle.status, 120),
    sourceBundleTaskCount: Number(readback.sourceBundleTaskCount || readback.source_bundle_task_count || sourceBundle.taskCount || sourceBundle.task_count || 0) || 0,
    sourceBundlePassCount: Number(readback.sourceBundlePassCount || readback.source_bundle_pass_count || sourceBundle.passCount || sourceBundle.pass_count || 0) || 0,
    ownerReviewStageSummary: ownerReviewStageSummary(readback) || undefined,
    writefulSchedulingAllowed: false,
    runtimeConfigChange: false,
    configChangeApplied: false
  };
}

function readinessSummary(readiness = {}) {
  const review = objectOnly(readiness.releaseReview);
  const requiredActions = actionList(review.requiredActions || readiness.requiredActions);
  const evidenceReadback = evidenceReadbackSummary(readiness.evidenceReadback);
  return {
    schemaVersion: "growth.learningAutomationReleaseDashboard.readinessSummary.v1",
    summaryOnly: true,
    status: cleanString(readiness.status || review.status, 120),
    readyForReleaseReview: readiness.readyForReleaseReview === true,
    requiredActionCount: Number(review.requiredActionCount || requiredActions.length) || 0,
    nextAction: actionSummary(review.nextAction || readiness.nextAction),
    missingCheckKeys: uniqueStrings(review.missingCheckKeys || readiness.missingCheckKeys || []),
    blockedCheckKeys: uniqueStrings(review.blockedCheckKeys || readiness.blockedCheckKeys || []),
    missingEvidenceKeys: uniqueStrings(review.missingEvidenceKeys || readiness.missingEvidenceKeys || []),
    persistedApprovalKeys: uniqueStrings(review.persistedApprovalKeys || readiness.persistedApprovalKeys || []),
    persistedEvidenceKeys: uniqueStrings(review.persistedEvidenceKeys || readiness.persistedEvidenceKeys || []),
    evidenceReadback,
    writefulSchedulingAllowed: readiness.writefulSchedulingAllowed === true,
    runtimeConfigChange: readiness.runtimeConfigChange === true,
    configChangeApplied: readiness.configChangeApplied === true
  };
}

function controlsSummary(controls = {}) {
  const summary = objectOnly(controls.releaseControls);
  const requiredActions = actionList(summary.requiredActions || controls.requiredActions);
  return {
    schemaVersion: "growth.learningAutomationReleaseDashboard.controlsSummary.v1",
    summaryOnly: true,
    status: cleanString(summary.status || controls.status, 120),
    requiredActionCount: Number(summary.requiredActionCount || requiredActions.length) || 0,
    requiredActions,
    nextAction: actionSummary(summary.nextAction || controls.nextAction),
    missingCheckKeys: uniqueStrings(summary.missingCheckKeys || []),
    blockedCheckKeys: uniqueStrings(summary.blockedCheckKeys || []),
    missingEvidenceKeys: uniqueStrings(summary.missingEvidenceKeys || []),
    missingApprovalKeys: uniqueStrings(summary.missingApprovalKeys || []),
    auditReadbackStatus: cleanString(objectOnly(summary.auditReadback || controls.auditReadback).status, 120),
    configChangeApplied: controls.configChangeApplied === true || summary.configChangeApplied === true,
    runtimeConfigChange: controls.runtimeConfigChange === true || summary.runtimeConfigChange === true,
    runtimeConfigMutationPerformed: controls.runtimeConfigMutationPerformed === true || summary.runtimeConfigMutationPerformed === true,
    writefulSchedulingAllowed: controls.writefulSchedulingAllowed === true || summary.writefulSchedulingAllowed === true,
    backgroundSchedulingAllowed: controls.backgroundSchedulingAllowed === true || summary.backgroundSchedulingAllowed === true,
    backgroundWorkerAllowed: controls.backgroundWorkerAllowed === true || summary.backgroundWorkerAllowed === true
  };
}

function packageDashboardFields(record = {}, latest = {}) {
  const dashboard = objectOnly(latest.releaseDashboardSummary || latest.release_dashboard_summary || record.releaseDashboardSummary || record.release_dashboard_summary);
  return {
    latestPackageStepCount: Number(record.latestPackageStepCount || latest.latestPackageStepCount || 0) || 0,
    latestPackageDashboardStatus: cleanString(record.latestPackageDashboardStatus || latest.latestPackageDashboardStatus || dashboard.status, 120),
    latestPackageDashboardReadinessStatus: cleanString(latest.latestPackageDashboardReadinessStatus || dashboard.readinessStatus || dashboard.readiness_status, 120),
    latestPackageDashboardControlsStatus: cleanString(latest.latestPackageDashboardControlsStatus || dashboard.controlsStatus || dashboard.controls_status, 120),
    latestPackageDashboardInventoryStatus: cleanString(latest.latestPackageDashboardInventoryStatus || dashboard.inventoryStatus || dashboard.inventory_status, 120),
    latestPackageDashboardRequiredActionCount: Number(record.latestPackageDashboardRequiredActionCount || latest.latestPackageDashboardRequiredActionCount || dashboard.requiredActionCount || dashboard.required_action_count || 0) || 0,
    latestPackageDashboardNextActionKey: cleanString(record.latestPackageDashboardNextActionKey || latest.latestPackageDashboardNextActionKey || objectOnly(dashboard.nextAction || dashboard.next_action).key, 140)
  };
}

function recordSummary(value = {}, kind = "") {
  const record = objectOnly(value);
  const latest = objectOnly(record.latest);
  const summary = {
    ok: record.ok !== false,
    status: cleanString(record.status, 120),
    count: Number(record.count) || 0,
    latestId: cleanString(record.latestId || record.latestRecordId || latest.id || latest.runId || latest.packageId || latest.decisionId || latest.approvalId || latest.evidenceRecordId || latest.activationId || latest.enablementId, 180),
    latestStatus: cleanString(record.latestStatus || latest.status, 120),
    statuses: uniqueStrings(record.statuses || [])
  };
  if (kind === "release_readiness_snapshot") {
    const readback = evidenceReadbackSummary(latest.evidenceReadback || latest.evidence_readback);
    return Object.assign(summary, {
      latestEvidenceReadbackPresentCount: readback.presentCount,
      latestEvidenceReadbackMissingCount: readback.missingCount,
      latestEvidenceReadbackSourceBundleId: readback.sourceBundleId
    });
  }
  if (kind === "release_evidence") {
    return Object.assign(summary, {
      latestEvidenceKey: cleanString(record.latestEvidenceKey || latest.evidenceKey || latest.evidence_key, 160),
      latestCheckKey: cleanString(record.latestCheckKey || latest.checkKey || latest.check_key, 160),
      latestObservedAt: cleanString(record.latestObservedAt || latest.observedAt || latest.observed_at, 80)
    });
  }
  if (kind === "release_package") return Object.assign(summary, packageDashboardFields(record, latest));
  return summary;
}

function artifactReadbackSummary(artifactReadback = {}) {
  const readback = objectOnly(artifactReadback);
  return {
    schemaVersion: "growth.learningAutomationReleaseDashboard.artifactReadbackSummary.v1",
    summaryOnly: true,
    snapshots: recordSummary(readback.snapshots, "release_readiness_snapshot"),
    collectionRuns: recordSummary(readback.collectionRuns || readback.collection_runs),
    decisions: recordSummary(readback.decisions),
    packages: recordSummary(readback.packages, "release_package"),
    approvals: recordSummary(readback.approvals),
    releaseEvidence: recordSummary(readback.releaseEvidence || readback.release_evidence, "release_evidence"),
    activations: recordSummary(readback.activations),
    runtimeEnablements: recordSummary(readback.runtimeEnablements || readback.runtime_enablements)
  };
}

function inventorySummary(inventory = {}) {
  const summary = objectOnly(inventory.releaseInventory);
  return {
    schemaVersion: "growth.learningAutomationReleaseDashboard.inventorySummary.v1",
    summaryOnly: true,
    status: cleanString(summary.status || inventory.status, 120),
    artifactCount: Number(summary.artifactCount) || 0,
    readbackKinds: uniqueStrings(summary.readbackKinds || []),
    missingRecordKinds: uniqueStrings(summary.missingRecordKinds || []),
    blockedRecordKinds: uniqueStrings(summary.blockedRecordKinds || []),
    latestCollectionRunId: cleanString(summary.latestCollectionRunId, 180),
    latestReadinessSnapshotId: cleanString(summary.latestReadinessSnapshotId, 180),
    latestReadinessEvidencePresentCount: Number(summary.latestReadinessEvidencePresentCount || 0) || 0,
    latestReadinessEvidenceMissingCount: Number(summary.latestReadinessEvidenceMissingCount || 0) || 0,
    latestReadinessEvidenceSourceBundleId: cleanString(summary.latestReadinessEvidenceSourceBundleId, 180),
    latestReadinessOwnerReviewStageSummary: objectOnly(summary.latestReadinessOwnerReviewStageSummary),
    latestPackageId: cleanString(summary.latestPackageId, 180),
    latestPackageStepCount: Number(summary.latestPackageStepCount || 0) || 0,
    latestPackageDashboardStatus: cleanString(summary.latestPackageDashboardStatus, 120),
    latestPackageDashboardNextActionKey: cleanString(summary.latestPackageDashboardNextActionKey, 140),
    latestPackageDashboardRequiredActionCount: Number(summary.latestPackageDashboardRequiredActionCount || 0) || 0,
    latestDecisionId: cleanString(summary.latestDecisionId, 180),
    releaseEvidenceRecordCount: Number(summary.releaseEvidenceRecordCount || 0) || 0,
    latestReleaseEvidenceRecordId: cleanString(summary.latestReleaseEvidenceRecordId, 180),
    latestReleaseEvidenceKey: cleanString(summary.latestReleaseEvidenceKey, 160),
    latestReleaseEvidenceCheckKey: cleanString(summary.latestReleaseEvidenceCheckKey, 160),
    latestReleaseEvidenceStatus: cleanString(summary.latestReleaseEvidenceStatus, 120),
    latestActivationId: cleanString(summary.latestActivationId, 180),
    latestRuntimeEnablementId: cleanString(summary.latestRuntimeEnablementId, 180),
    controlsStatus: cleanString(objectOnly(summary.controls).status, 120),
    configChangeApplied: inventory.configChangeApplied === true || summary.configChangeApplied === true,
    runtimeConfigChange: inventory.runtimeConfigChange === true || summary.runtimeConfigChange === true,
    runtimeConfigMutationPerformed: inventory.runtimeConfigMutationPerformed === true,
    writefulSchedulingAllowed: inventory.writefulSchedulingAllowed === true || summary.writefulSchedulingAllowed === true,
    backgroundSchedulingAllowed: inventory.backgroundSchedulingAllowed === true,
    backgroundWorkerAllowed: inventory.backgroundWorkerAllowed === true
  };
}

function firstAction(...actions) {
  for (const action of actions) {
    if (action && action.key) return action;
  }
  return null;
}

function releaseDashboardSummary(readiness, controls, inventory) {
  const readinessPart = readinessSummary(readiness);
  const controlsPart = controlsSummary(controls);
  const inventoryPart = inventorySummary(inventory);
  const status = controlsPart.status || inventoryPart.status || readinessPart.status || "unknown";
  const requiredActionCount = Math.max(
    Number(controlsPart.requiredActionCount) || 0,
    Number(readinessPart.requiredActionCount) || 0
  );
  return {
    schemaVersion: "growth.learningAutomationReleaseDashboard.summary.v1",
    summaryOnly: true,
    status,
    readinessStatus: readinessPart.status,
    controlsStatus: controlsPart.status,
    inventoryStatus: inventoryPart.status,
    readyForReleaseReview: readinessPart.readyForReleaseReview === true,
    requiredActionCount,
    nextAction: firstAction(controlsPart.nextAction, readinessPart.nextAction),
    readinessEvidencePresentCount: readinessPart.evidenceReadback.presentCount,
    readinessEvidenceMissingCount: readinessPart.evidenceReadback.missingCount,
    readinessEvidenceSourceBundleId: readinessPart.evidenceReadback.sourceBundleId,
    ownerReviewStageSummary: readinessPart.evidenceReadback.ownerReviewStageSummary || null,
    latestReadinessSnapshotId: inventoryPart.latestReadinessSnapshotId,
    latestReadinessEvidencePresentCount: inventoryPart.latestReadinessEvidencePresentCount,
    latestReadinessEvidenceMissingCount: inventoryPart.latestReadinessEvidenceMissingCount,
    latestReadinessEvidenceSourceBundleId: inventoryPart.latestReadinessEvidenceSourceBundleId,
    latestReadinessOwnerReviewStageSummary: inventoryPart.latestReadinessOwnerReviewStageSummary || null,
    latestCollectionRunId: inventoryPart.latestCollectionRunId,
    latestPackageId: inventoryPart.latestPackageId,
    latestPackageStepCount: inventoryPart.latestPackageStepCount,
    latestPackageDashboardStatus: inventoryPart.latestPackageDashboardStatus,
    latestPackageDashboardNextActionKey: inventoryPart.latestPackageDashboardNextActionKey,
    latestPackageDashboardRequiredActionCount: inventoryPart.latestPackageDashboardRequiredActionCount,
    latestDecisionId: inventoryPart.latestDecisionId,
    releaseEvidenceRecordCount: inventoryPart.releaseEvidenceRecordCount,
    latestReleaseEvidenceRecordId: inventoryPart.latestReleaseEvidenceRecordId,
    latestReleaseEvidenceKey: inventoryPart.latestReleaseEvidenceKey,
    latestReleaseEvidenceCheckKey: inventoryPart.latestReleaseEvidenceCheckKey,
    latestReleaseEvidenceStatus: inventoryPart.latestReleaseEvidenceStatus,
    latestActivationId: inventoryPart.latestActivationId,
    latestRuntimeEnablementId: inventoryPart.latestRuntimeEnablementId,
    artifactCount: inventoryPart.artifactCount,
    missingRecordKinds: inventoryPart.missingRecordKinds,
    blockedRecordKinds: inventoryPart.blockedRecordKinds,
    missingCheckKeys: uniqueStrings(controlsPart.missingCheckKeys.concat(readinessPart.missingCheckKeys)),
    blockedCheckKeys: uniqueStrings(controlsPart.blockedCheckKeys.concat(readinessPart.blockedCheckKeys)),
    missingEvidenceKeys: uniqueStrings(controlsPart.missingEvidenceKeys.concat(readinessPart.missingEvidenceKeys)),
    missingApprovalKeys: controlsPart.missingApprovalKeys,
    persistedApprovalKeys: readinessPart.persistedApprovalKeys,
    persistedEvidenceKeys: readinessPart.persistedEvidenceKeys,
    configChangeApplied: false,
    runtimeConfigChange: false,
    runtimeConfigMutationPerformed: false,
    writefulSchedulingAllowed: false,
    backgroundSchedulingAllowed: false,
    backgroundWorkerAllowed: false
  };
}

function createLearningAutomationReleaseDashboardService(options = {}) {
  const releaseReadinessService = options.releaseReadinessService || null;
  const releaseControlsService = options.releaseControlsService || null;
  const releaseInventoryService = options.releaseInventoryService || null;

  function dashboard(input = {}) {
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_release_dashboard_scope_required", scope);
    const inputPrivacyFindings = scanPrivacyKeys(input).concat(scanPrivateValues(input)).slice(0, 16);
    if (inputPrivacyFindings.length) {
      return unavailable("learning_automation_release_dashboard_privacy_failed", scope, { privacyFindings: inputPrivacyFindings });
    }
    const missing = requireMethod(scope, "readiness", releaseReadinessService, "evaluateReadiness")
      || requireMethod(scope, "controls", releaseControlsService, "summarize")
      || requireMethod(scope, "inventory", releaseInventoryService, "inventory");
    if (missing) return missing;

    const request = Object.assign({}, input, scope);
    const readiness = releaseReadinessService.evaluateReadiness(request);
    const controls = releaseControlsService.summarize(request);
    const inventory = releaseInventoryService.inventory(request);
    const dependencyPrivacyFindings = scanPrivacyKeys({ readiness, controls, inventory })
      .concat(scanPrivateValues({ readiness, controls, inventory }))
      .slice(0, 16);
    if (dependencyPrivacyFindings.length) {
      return unavailable("learning_automation_release_dashboard_dependency_privacy_failed", scope, { privacyFindings: dependencyPrivacyFindings });
    }

    if (readiness.ok === false) return unavailable("learning_automation_release_dashboard_readiness_blocked", scope, { dependencyStatus: cleanString(readiness.status, 120) });
    if (controls.ok === false) return unavailable("learning_automation_release_dashboard_controls_blocked", scope, { dependencyStatus: cleanString(controls.status, 120) });
    if (inventory.ok === false) return unavailable("learning_automation_release_dashboard_inventory_blocked", scope, { dependencyStatus: cleanString(inventory.status, 120) });

    const releaseReadiness = readinessSummary(readiness);
    const releaseControls = controlsSummary(controls);
    const releaseInventory = inventorySummary(inventory);
    const artifactReadback = artifactReadbackSummary(inventory.artifactReadback);
    const releaseDashboard = releaseDashboardSummary(readiness, controls, inventory);

    return Object.assign({}, scope, {
      ok: true,
      source: "growth-learning-automation-release-dashboard-service",
      schemaVersion: RELEASE_DASHBOARD_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      status: releaseDashboard.status,
      advisoryOnly: true,
      recordOnly: true,
      releaseDashboard,
      releaseReadiness,
      releaseControls,
      releaseInventory,
      artifactReadback,
      configChangeApplied: false,
      runtimeConfigChange: false,
      runtimeConfigMutationPerformed: false,
      writefulSchedulingAllowed: false,
      backgroundSchedulingAllowed: false,
      backgroundWorkerAllowed: false
    });
  }

  return { dashboard };
}

module.exports = {
  RELEASE_DASHBOARD_SCHEMA,
  createLearningAutomationReleaseDashboardService
};
