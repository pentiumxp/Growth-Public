"use strict";

const RELEASE_DASHBOARD_SCHEMA = "growth.learningAutomationReleaseDashboard.v1";

const PRIVACY_KEY_RE = /(raw|prompt|transcript|answer[_-]?key|secret|token|cookie|authorization|provider[_-]?config|api[_-]?key|access[_-]?key|private[_-]?key)/i;
const PRIVATE_VALUE_RE = /(\/Users\/|C:\\Users\\|access-key|\.hermes-growth|Authorization:|Bearer\s+)/i;

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

function readinessSummary(readiness = {}) {
  const review = objectOnly(readiness.releaseReview);
  const requiredActions = actionList(review.requiredActions || readiness.requiredActions);
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

function recordSummary(value = {}) {
  const record = objectOnly(value);
  const latest = objectOnly(record.latest);
  return {
    ok: record.ok !== false,
    status: cleanString(record.status, 120),
    count: Number(record.count) || 0,
    latestId: cleanString(record.latestId || record.latestRecordId || latest.id || latest.runId || latest.packageId || latest.decisionId || latest.approvalId || latest.activationId || latest.enablementId, 180),
    latestStatus: cleanString(record.latestStatus || latest.status, 120),
    statuses: uniqueStrings(record.statuses || [])
  };
}

function artifactReadbackSummary(artifactReadback = {}) {
  const readback = objectOnly(artifactReadback);
  return {
    schemaVersion: "growth.learningAutomationReleaseDashboard.artifactReadbackSummary.v1",
    summaryOnly: true,
    snapshots: recordSummary(readback.snapshots),
    collectionRuns: recordSummary(readback.collectionRuns || readback.collection_runs),
    decisions: recordSummary(readback.decisions),
    packages: recordSummary(readback.packages),
    approvals: recordSummary(readback.approvals),
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
    latestPackageId: cleanString(summary.latestPackageId, 180),
    latestDecisionId: cleanString(summary.latestDecisionId, 180),
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
    latestCollectionRunId: inventoryPart.latestCollectionRunId,
    latestPackageId: inventoryPart.latestPackageId,
    latestDecisionId: inventoryPart.latestDecisionId,
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
