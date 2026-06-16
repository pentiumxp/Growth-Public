"use strict";

const path = require("node:path");

const RELEASE_EVIDENCE_BUNDLE_SCHEMA = "growth.learningAutomationReleaseEvidenceBundle.v1";
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;
const SAFE_PRIVACY_ASSERTION_KEYS = new Set([
  "noFullTranscripts",
  "noRawPrompts"
]);
const DAILY_LOOP_WRITE_OPERATIONS = new Set(["draft", "publish"]);
const LEARNER_CYCLE_BUNDLE_OPERATIONS = new Set(["audit"]);

const DEFAULT_TASK_IDS = Object.freeze([
  "planner_readiness",
  "daily_loop_preview",
  "learning_loop_state",
  "cycle_history",
  "owner_audit",
  "profile_feedback",
  "recommendation_lifecycle",
  "learner_cycle",
  "target_provisioning",
  "stage_assessment",
  "stage_checkpoint_controls",
  "proposal",
  "platform_action",
  "central_visual",
  "scheduler_dry_run",
  "action_handoff",
  "scheduler_execution",
  "scheduler_run",
  "scheduler_worker_target",
  "scheduler_worker",
  "release_approval",
  "owner_review_evidence"
]);

const RELEASE_APPROVAL_KEYS = Object.freeze([
  "writefulExecutionApproval",
  "backgroundSchedulerApproval",
  "backgroundWorkerApproval"
]);

const TASK_DEFINITIONS = Object.freeze([
  {
    taskId: "planner_readiness",
    evidenceKey: "productionPlannerReadinessEvidence",
    script: "scripts/smoke-growth-planner-readiness.js",
    commandName: "npm run smoke:planner-readiness"
  },
  {
    taskId: "daily_loop_preview",
    evidenceKey: "productionDailyLoopPreviewSmokeEvidence",
    script: "scripts/smoke-growth-daily-loop-preview.js",
    commandName: "npm run smoke:daily-loop-preview"
  },
  {
    taskId: "learning_loop_state",
    evidenceKey: "productionLearningLoopStateSmokeEvidence",
    script: "scripts/smoke-growth-learning-loop-state.js",
    commandName: "npm run smoke:learning-loop-state"
  },
  {
    taskId: "cycle_history",
    evidenceKey: "productionCycleHistorySmokeEvidence",
    script: "scripts/smoke-growth-cycle-history.js",
    commandName: "npm run smoke:cycle-history"
  },
  {
    taskId: "owner_audit",
    evidenceKey: "productionOwnerAuditSmokeEvidence",
    script: "scripts/smoke-growth-owner-audit.js",
    commandName: "npm run smoke:owner-audit"
  },
  {
    taskId: "profile_feedback",
    evidenceKey: "productionProfileFeedbackSmokeEvidence",
    script: "scripts/smoke-growth-profile-feedback.js",
    commandName: "npm run smoke:profile-feedback"
  },
  {
    taskId: "recommendation_lifecycle",
    evidenceKey: "productionRecommendationLifecycleSmokeEvidence",
    script: "scripts/smoke-growth-recommendation-lifecycle.js",
    commandName: "npm run smoke:recommendation-lifecycle"
  },
  {
    taskId: "learner_cycle",
    evidenceKey: "productionLearnerCycleSmokeEvidence",
    script: "scripts/smoke-growth-learner-cycle.js",
    commandName: "npm run smoke:learner-cycle"
  },
  {
    taskId: "target_provisioning",
    evidenceKey: "productionTargetProvisioningSmokeEvidence",
    script: "scripts/smoke-growth-target-provisioning.js",
    commandName: "npm run smoke:target-provisioning"
  },
  {
    taskId: "daily_loop_write",
    evidenceKey: "productionDailyLoopWriteSmokeEvidence",
    script: "scripts/smoke-growth-daily-loop.js",
    commandName: "npm run smoke:daily-loop",
    writeEvidence: true
  },
  {
    taskId: "stage_assessment",
    evidenceKey: "stageCheckpointEvidence",
    script: "scripts/smoke-growth-stage-assessment.js",
    commandName: "npm run smoke:stage-assessment"
  },
  {
    taskId: "stage_checkpoint_controls",
    evidenceKey: "stageCheckpointControlsEvidence",
    script: "scripts/smoke-growth-stage-checkpoint-controls.js",
    commandName: "npm run smoke:stage-checkpoint-controls"
  },
  {
    taskId: "proposal",
    evidenceKey: "productionProposalSmokeEvidence",
    script: "scripts/smoke-growth-automation-proposal.js",
    commandName: "npm run smoke:proposal"
  },
  {
    taskId: "platform_action",
    evidenceKey: "platformActionEvidence",
    script: "scripts/smoke-growth-platform-action-evidence.js",
    commandName: "npm run smoke:platform-action-evidence"
  },
  {
    taskId: "central_visual",
    evidenceKey: "centralVisualEvidence",
    script: "scripts/smoke-growth-central-visual-evidence.js",
    commandName: "npm run smoke:central-visual-evidence"
  },
  {
    taskId: "scheduler_dry_run",
    evidenceKey: "productionSchedulerDryRunSmokeEvidence",
    script: "scripts/smoke-growth-scheduler-dry-run.js",
    commandName: "npm run smoke:scheduler-dry-run"
  },
  {
    taskId: "action_handoff",
    evidenceKey: "productionActionHandoffSmokeEvidence",
    script: "scripts/smoke-growth-automation-action-handoff.js",
    commandName: "npm run smoke:action-handoff"
  },
  {
    taskId: "scheduler_execution",
    evidenceKey: "productionSchedulerExecutionSmokeEvidence",
    script: "scripts/smoke-growth-automation-scheduler-execution.js",
    commandName: "npm run smoke:scheduler-execution"
  },
  {
    taskId: "scheduler_run",
    evidenceKey: "productionSchedulerRunSmokeEvidence",
    script: "scripts/smoke-growth-automation-scheduler-run.js",
    commandName: "npm run smoke:scheduler-run"
  },
  {
    taskId: "scheduler_worker_target",
    evidenceKey: "productionSchedulerWorkerTargetSmokeEvidence",
    script: "scripts/smoke-growth-automation-scheduler-worker-target.js",
    commandName: "npm run smoke:scheduler-worker-target",
    extraArgs: ["--operation", "runnable"]
  },
  {
    taskId: "scheduler_worker",
    evidenceKey: "productionSchedulerWorkerSmokeEvidence",
    script: "scripts/smoke-growth-automation-scheduler-worker.js",
    commandName: "npm run smoke:scheduler-worker"
  },
  {
    taskId: "release_approval",
    outputKey: "releaseApproval",
    script: "scripts/smoke-growth-automation-release-approval.js",
    commandName: "npm run smoke:release-approval",
    extraArgs: ["--operation", "bag"]
  },
  {
    taskId: "owner_review_evidence",
    evidenceKey: "ownerReviewEvidence",
    script: "scripts/smoke-growth-automation-owner-review-evidence.js",
    commandName: "npm run smoke:owner-review-evidence"
  },
  {
    taskId: "release_controls",
    evidenceKey: "releaseControlsSmokeEvidence",
    script: "scripts/smoke-growth-release-controls.js",
    commandName: "npm run smoke:release-controls"
  },
  {
    taskId: "release_inventory",
    evidenceKey: "releaseInventorySmokeEvidence",
    script: "scripts/smoke-growth-release-inventory.js",
    commandName: "npm run smoke:release-inventory"
  },
  {
    taskId: "release_dashboard",
    evidenceKey: "releaseDashboardSmokeEvidence",
    script: "scripts/smoke-growth-release-dashboard.js",
    commandName: "npm run smoke:release-dashboard"
  },
  {
    taskId: "release_workbench",
    evidenceKey: "releaseWorkbenchSmokeEvidence",
    script: "scripts/smoke-growth-release-workbench.js",
    commandName: "npm run smoke:release-workbench"
  }
]);

const TASK_BY_ID = new Map(TASK_DEFINITIONS.map((task) => [task.taskId, task]));

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function uniqueStrings(values = []) {
  return Array.from(new Set(values.map((value) => cleanString(value, 120)).filter(Boolean)));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clampLimit(value, fallback = 12) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.min(50, Math.round(numeric)));
}

function clampRecordLimit(value, fallback = 20) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.min(100, Math.round(numeric)));
}

function booleanFlag(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function nowIso(now) {
  const value = typeof now === "function" ? now() : new Date();
  if (value instanceof Date) return value.toISOString();
  return cleanString(value, 64) || new Date().toISOString();
}

function scanPrivacy(value, pathName = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, `${pathName}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${pathName}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key) && !SAFE_PRIVACY_ASSERTION_KEYS.has(key)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacy(child, childPath, findings);
  }
  return findings;
}

function parseJsonOutput(stdout = "") {
  const text = String(stdout || "").trim();
  if (!text) {
    return { ok: false, error: "release_evidence_bundle_empty_smoke_output" };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return { ok: true, value: JSON.parse(text.slice(start, end + 1)) };
      } catch (_) {
        // Fall through to the bounded error below.
      }
    }
    return { ok: false, error: "release_evidence_bundle_invalid_smoke_json" };
  }
}

function normalizeTaskId(value = "") {
  return cleanString(value, 80).replace(/-/g, "_");
}

function normalizeTaskIds(input = {}) {
  const explicit = uniqueStrings(input.tasks || input.taskIds || input.task_ids || [])
    .map(normalizeTaskId)
    .filter(Boolean);
  return explicit.length ? explicit : Array.from(DEFAULT_TASK_IDS);
}

function scopeArgs(scope = {}) {
  const args = [
    "--workspace-id", scope.workspaceId,
    "--learner-id", scope.learnerId || scope.workspaceId,
    "--limit", String(scope.limit || 12)
  ];
  const optional = [
    ["--program-id", scope.programId],
    ["--domain-pack-id", scope.domainPackId],
    ["--domain", scope.domain],
    ["--subject", scope.subject],
    ["--horizon", scope.horizon],
    ["--available-minutes", scope.availableMinutes],
    ["--plan-draft-id", scope.planDraftId],
    ["--task-card-id", scope.taskCardId],
    ["--evaluation-id", scope.evaluationId],
    ["--profile-delta-id", scope.profileDeltaId],
    ["--evidence-id", scope.evidenceId],
    ["--correction-id", scope.correctionId],
    ["--source-id", scope.sourceId]
  ];
  for (const [flag, value] of optional) {
    if (value !== undefined && value !== null && String(value).trim()) {
      args.push(flag, String(value));
    }
  }
  for (const nodeId of uniqueStrings(scope.targetNodeIds || [])) {
    args.push("--target-node-id", nodeId);
  }
  return args;
}

function publicScope(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id, 120);
  const targetNodeIds = uniqueStrings(input.targetNodeIds || input.target_node_ids || []);
  const dailyLoopWriteOperation = cleanString(input.dailyLoopWriteOperation || input.daily_loop_write_operation || "draft", 40).toLowerCase() || "draft";
  const learnerCycleOperation = cleanString(input.learnerCycleOperation || input.learner_cycle_operation || "audit", 40).toLowerCase() || "audit";
  return {
    workspaceId,
    learnerId: cleanString(input.learnerId || input.learner_id || workspaceId, 120),
    programId: cleanString(input.programId || input.program_id, 120),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id, 120),
    domain: cleanString(input.domain, 80),
    subject: cleanString(input.subject, 80),
    horizon: cleanString(input.horizon || "daily_plan", 80),
    availableMinutes: clampLimit(input.availableMinutes || input.available_minutes || 15, 15),
    limit: clampLimit(input.limit || 12, 12),
    targetNodeIds,
    allowWriteEvidence: booleanFlag(input.allowWriteEvidence || input.allow_write_evidence),
    dailyLoopWriteOperation,
    learnerCycleOperation,
    taskCardId: cleanString(input.taskCardId || input.task_card_id, 120),
    planDraftId: cleanString(input.planDraftId || input.plan_draft_id, 120),
    collectionRunId: cleanString(input.collectionRunId || input.collection_run_id || input.runId || input.run_id, 120),
    evaluationId: cleanString(input.evaluationId || input.evaluation_id, 120),
    profileDeltaId: cleanString(input.profileDeltaId || input.profile_delta_id, 120),
    evidenceId: cleanString(input.evidenceId || input.evidence_id, 120),
    correctionId: cleanString(input.correctionId || input.correction_id, 120),
    sourceId: cleanString(input.sourceId || input.source_id, 120),
    visualPluginId: cleanString(input.visualPluginId || input.visual_plugin_id || input.pluginId || input.plugin_id || "growth", 80) || "growth",
    visualScenario: cleanString(input.visualScenario || input.visual_scenario || input.scenario || "embedded-plugin-shell", 120) || "embedded-plugin-shell",
    centralVisualEvidenceFile: cleanString(input.centralVisualEvidenceFile || input.central_visual_evidence_file || "", 500),
    activationGates: uniqueStrings(input.activationGates || input.activation_gates || []),
    requiredApprovalKeys: uniqueStrings(input.requiredApprovalKeys || input.required_approval_keys || []),
    activationRecordLimit: clampRecordLimit(input.activationRecordLimit || input.activation_record_limit || 20, 20),
    runtimeEnablementRecordLimit: clampRecordLimit(input.runtimeEnablementRecordLimit || input.runtime_enablement_record_limit || 20, 20),
    ownerDailyUiEvidence: booleanFlag(input.ownerDailyUiEvidence || input.owner_daily_ui_evidence),
    ownerAuditUiEvidence: booleanFlag(input.ownerAuditUiEvidence || input.owner_audit_ui_evidence),
    stageCheckpointEvidence: booleanFlag(input.stageCheckpointEvidence || input.stage_checkpoint_evidence),
    proposalReviewUiEvidence: booleanFlag(input.proposalReviewUiEvidence || input.proposal_review_ui_evidence),
    automationDigestUiEvidence: booleanFlag(input.automationDigestUiEvidence || input.automation_digest_ui_evidence),
    automationActionHandoffUiEvidence: booleanFlag(input.automationActionHandoffUiEvidence || input.automation_action_handoff_ui_evidence),
    schedulerExecutionUiEvidence: booleanFlag(input.schedulerExecutionUiEvidence || input.scheduler_execution_ui_evidence),
    schedulerRunUiEvidence: booleanFlag(input.schedulerRunUiEvidence || input.scheduler_run_ui_evidence),
    schedulerWorkerTargetUiEvidence: booleanFlag(input.schedulerWorkerTargetUiEvidence || input.scheduler_worker_target_ui_evidence)
  };
}

function publicBundleScope(scope = {}) {
  const output = Object.assign({}, scope, {
    centralVisualEvidenceFilePresent: Boolean(scope.centralVisualEvidenceFile)
  });
  delete output.centralVisualEvidenceFile;
  return output;
}

function publicRequiredAction(action = {}, fallbackKey = "") {
  if (!action || typeof action !== "object" || Array.isArray(action)) return null;
  const output = {
    key: cleanString(action.key || fallbackKey, 120),
    action: cleanString(action.action, 120),
    requiredActor: cleanString(action.requiredActor || action.required_actor || "owner", 80),
    endpoint: cleanString(action.endpoint, 180)
  };
  if (!output.action) return null;
  if (!output.endpoint) delete output.endpoint;
  return output;
}

function requiredActionsFromChecks(checks = []) {
  return asArray(checks)
    .map((check) => {
      const action = publicRequiredAction(check.requiredAction, check.key);
      if (!action) return null;
      return Object.assign({}, action, {
        status: cleanString(check.status, 80),
        label: cleanString(check.summary?.label, 120)
      });
    })
    .filter(Boolean)
    .slice(0, 12);
}

function publicSelectorDiscovery(discovery = {}) {
  if (!discovery || typeof discovery !== "object" || Array.isArray(discovery)) return null;
  return {
    available: discovery.available !== false,
    status: cleanString(discovery.status, 80),
    error: cleanString(discovery.error, 160),
    cycleCount: Number(discovery.cycleCount || 0) || 0,
    completeCount: Number(discovery.completeCount || 0) || 0,
    readyForAutomationCount: Number(discovery.readyForAutomationCount || 0) || 0,
    candidateCount: Number(discovery.candidateCount || 0) || 0,
    latestActivityAt: cleanString(discovery.latestActivityAt, 80)
  };
}

function summaryFromSmoke(value = {}) {
  const summary = {};
  const scalarKeys = [
    "source",
    "operation",
    "error",
    "available",
    "complete",
    "readyForAutomation",
    "readyForNextPlan",
    "readyForReleaseEvidence",
    "activationState",
    "reason",
    "status",
    "count"
  ];
  for (const key of scalarKeys) {
    const valueForKey = value[key];
    if (typeof valueForKey === "string") summary[key] = cleanString(valueForKey, 160);
    if (typeof valueForKey === "number" || typeof valueForKey === "boolean") summary[key] = valueForKey;
  }
  if (value.readiness && typeof value.readiness === "object") {
    summary.readiness = {};
    for (const key of ["ready", "configured", "status", "reason"]) {
      const valueForKey = value.readiness[key];
      if (typeof valueForKey === "string") summary.readiness[key] = cleanString(valueForKey, 160);
      if (typeof valueForKey === "number" || typeof valueForKey === "boolean") summary.readiness[key] = valueForKey;
    }
  }
  if (value.summary && typeof value.summary === "object") {
    summary.summaryKeys = Object.keys(value.summary).slice(0, 12).map((key) => cleanString(key, 80));
    summary.missingRequired = uniqueStrings(asArray(value.summary.missingRequired)).slice(0, 12);
    summary.nextAction = cleanString(value.summary.nextAction, 120);
    summary.selectorDiscoveryStatus = cleanString(value.summary.selectorDiscoveryStatus, 80);
    summary.selectorCandidateCount = Number(value.summary.selectorCandidateCount || 0) || 0;
    summary.completeCycleCount = Number(value.summary.completeCycleCount || 0) || 0;
    summary.cycleCount = Number(value.summary.cycleCount || 0) || 0;
  }
  const requiredActions = requiredActionsFromChecks(value.checks);
  if (requiredActions.length) {
    summary.requiredActionCount = requiredActions.length;
    summary.requiredActions = requiredActions;
  }
  const selectorDiscovery = publicSelectorDiscovery(value.selectorDiscovery || value.checks?.[0]?.summary?.selectorDiscovery);
  if (selectorDiscovery) summary.selectorDiscovery = selectorDiscovery;
  return summary;
}

function publicReleaseApprovalEntry(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return {
    approved: value.approved === true || value.status === "approved",
    status: cleanString(value.status || (value.approved === true ? "approved" : ""), 80),
    approvalId: cleanString(value.approvalId || value.approval_id || value.id, 120),
    approvedBy: cleanString(value.approvedBy || value.approved_by, 120),
    approvedAt: cleanString(value.approvedAt || value.approved_at || value.createdAt || value.created_at, 80),
    source: cleanString(value.source || "growth_release_approval_record", 120)
  };
}

function releaseApprovalFromSmoke(value = {}) {
  const source = value.releaseApproval || value.release_approval || value.approvals || {};
  const releaseApproval = {};
  for (const key of RELEASE_APPROVAL_KEYS) {
    const entry = publicReleaseApprovalEntry(source[key]);
    if (entry) releaseApproval[key] = entry;
  }
  return releaseApproval;
}

function publicAuditReadbackRecords(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const latest = value.latest && typeof value.latest === "object" && !Array.isArray(value.latest)
    ? {
      recordId: cleanString(value.latest.recordId || value.latest.record_id, 120),
      status: cleanString(value.latest.status, 80),
      version: cleanString(value.latest.version, 120),
      privacyClass: cleanString(value.latest.privacyClass || value.latest.privacy_class, 80),
      collectionRunId: cleanString(value.latest.collectionRunId || value.latest.collection_run_id, 120),
      requiredConfigKeys: uniqueStrings(value.latest.requiredConfigKeys || value.latest.required_config_keys || []),
      recordedAt: cleanString(value.latest.recordedAt || value.latest.recorded_at, 80),
      updatedAt: cleanString(value.latest.updatedAt || value.latest.updated_at, 80),
      summaryOnly: value.latest.summaryOnly === true || value.latest.summary_only === true
    }
    : null;
  return {
    ok: value.ok !== false,
    status: cleanString(value.status, 80),
    count: Number(value.count) || 0,
    statuses: uniqueStrings(value.statuses || []),
    latest,
    latestRecordId: cleanString(value.latestRecordId || value.latest_record_id, 120),
    requestedActivationGates: uniqueStrings(value.requestedActivationGates || value.requested_activation_gates || []),
    requiredConfigKeys: latest ? uniqueStrings(latest.requiredConfigKeys || []) : []
  };
}

function releaseControlsSummaryFromSmoke(value = {}) {
  const controls = value.releaseControls && typeof value.releaseControls === "object" ? value.releaseControls : {};
  const auditReadback = controls.auditReadback && typeof controls.auditReadback === "object"
    ? controls.auditReadback
    : value.auditReadback && typeof value.auditReadback === "object"
      ? value.auditReadback
      : {};
  return {
    source: cleanString(value.source || "growth-learning-automation-release-controls-service", 160),
    status: cleanString(controls.status || value.status, 120),
    schemaVersion: cleanString(value.schemaVersion || value.schema_version, 160),
    requiredActionCount: Number(controls.requiredActionCount) || 0,
    missingCheckKeys: uniqueStrings(controls.missingCheckKeys || controls.missing_check_keys || []),
    blockedCheckKeys: uniqueStrings(controls.blockedCheckKeys || controls.blocked_check_keys || []),
    missingEvidenceKeys: uniqueStrings(controls.missingEvidenceKeys || controls.missing_evidence_keys || []),
    missingApprovalKeys: uniqueStrings(controls.missingApprovalKeys || controls.missing_approval_keys || []),
    auditReadback: {
      status: cleanString(auditReadback.status, 80),
      activationRecords: publicAuditReadbackRecords(auditReadback.activationRecords || auditReadback.activation_records),
      runtimeEnablementRecords: publicAuditReadbackRecords(auditReadback.runtimeEnablementRecords || auditReadback.runtime_enablement_records)
    },
    configChangeApplied: value.configChangeApplied === true,
    runtimeConfigChange: value.runtimeConfigChange === true,
    runtimeConfigMutationPerformed: value.runtimeConfigMutationPerformed === true,
    writefulSchedulingAllowed: value.writefulSchedulingAllowed === true,
    backgroundSchedulingAllowed: value.backgroundSchedulingAllowed === true,
    backgroundWorkerAllowed: value.backgroundWorkerAllowed === true
  };
}

function inventoryRecordSummary(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return {
    ok: value.ok !== false,
    status: cleanString(value.status, 80),
    count: Number(value.count) || 0,
    statuses: uniqueStrings(value.statuses || []),
    latestId: cleanString(value.latest?.id || value.latestId || value.latest_id, 120),
    latestStatus: cleanString(value.latest?.status || value.latestStatus || value.latest_status, 80),
    ids: uniqueStrings(value.ids || [])
  };
}

function releaseInventorySummaryFromSmoke(value = {}) {
  const inventory = value.releaseInventory && typeof value.releaseInventory === "object" ? value.releaseInventory : {};
  const artifactReadback = value.artifactReadback && typeof value.artifactReadback === "object" ? value.artifactReadback : {};
  const controls = inventory.controls && typeof inventory.controls === "object" ? inventory.controls : {};
  return {
    source: cleanString(value.source || "growth-learning-automation-release-inventory-service", 160),
    status: cleanString(inventory.status || value.status, 120),
    schemaVersion: cleanString(value.schemaVersion || value.schema_version, 160),
    artifactCount: Number(inventory.artifactCount) || 0,
    readbackKinds: uniqueStrings(inventory.readbackKinds || inventory.readback_kinds || []),
    missingRecordKinds: uniqueStrings(inventory.missingRecordKinds || inventory.missing_record_kinds || []),
    blockedRecordKinds: uniqueStrings(inventory.blockedRecordKinds || inventory.blocked_record_kinds || []),
    latestCollectionRunId: cleanString(inventory.latestCollectionRunId || inventory.latest_collection_run_id, 120),
    latestPackageId: cleanString(inventory.latestPackageId || inventory.latest_package_id, 120),
    latestDecisionId: cleanString(inventory.latestDecisionId || inventory.latest_decision_id, 120),
    latestActivationId: cleanString(inventory.latestActivationId || inventory.latest_activation_id, 120),
    latestRuntimeEnablementId: cleanString(inventory.latestRuntimeEnablementId || inventory.latest_runtime_enablement_id, 120),
    controls: {
      status: cleanString(controls.status, 120),
      requiredActionCount: Number(controls.requiredActionCount || controls.required_action_count) || 0,
      nextActionKey: cleanString(controls.nextActionKey || controls.next_action_key, 120),
      missingCheckKeys: uniqueStrings(controls.missingCheckKeys || controls.missing_check_keys || []),
      blockedCheckKeys: uniqueStrings(controls.blockedCheckKeys || controls.blocked_check_keys || []),
      missingEvidenceKeys: uniqueStrings(controls.missingEvidenceKeys || controls.missing_evidence_keys || []),
      missingApprovalKeys: uniqueStrings(controls.missingApprovalKeys || controls.missing_approval_keys || [])
    },
    artifactReadback: {
      snapshots: inventoryRecordSummary(artifactReadback.snapshots),
      collectionRuns: inventoryRecordSummary(artifactReadback.collectionRuns || artifactReadback.collection_runs),
      decisions: inventoryRecordSummary(artifactReadback.decisions),
      packages: inventoryRecordSummary(artifactReadback.packages),
      approvals: inventoryRecordSummary(artifactReadback.approvals),
      activations: inventoryRecordSummary(artifactReadback.activations),
      runtimeEnablements: inventoryRecordSummary(artifactReadback.runtimeEnablements || artifactReadback.runtime_enablements)
    },
    configChangeApplied: value.configChangeApplied === true,
    runtimeConfigChange: value.runtimeConfigChange === true,
    runtimeConfigMutationPerformed: value.runtimeConfigMutationPerformed === true,
    writefulSchedulingAllowed: value.writefulSchedulingAllowed === true,
    backgroundSchedulingAllowed: value.backgroundSchedulingAllowed === true,
    backgroundWorkerAllowed: value.backgroundWorkerAllowed === true
  };
}

function releaseDashboardSummaryFromSmoke(value = {}) {
  const dashboard = value.releaseDashboard && typeof value.releaseDashboard === "object" ? value.releaseDashboard : {};
  const readiness = value.releaseReadiness && typeof value.releaseReadiness === "object" ? value.releaseReadiness : {};
  const controls = value.releaseControls && typeof value.releaseControls === "object" ? value.releaseControls : {};
  const inventory = value.releaseInventory && typeof value.releaseInventory === "object" ? value.releaseInventory : {};
  return {
    source: cleanString(value.source || "growth-learning-automation-release-dashboard-service", 160),
    status: cleanString(dashboard.status || value.status, 120),
    schemaVersion: cleanString(value.schemaVersion || value.schema_version, 160),
    readyForReleaseReview: dashboard.readyForReleaseReview === true,
    requiredActionCount: Number(dashboard.requiredActionCount) || 0,
    nextActionKey: cleanString(dashboard.nextAction?.key || dashboard.next_action?.key, 120),
    readinessStatus: cleanString(dashboard.readinessStatus || dashboard.readiness_status || readiness.status, 120),
    controlsStatus: cleanString(dashboard.controlsStatus || dashboard.controls_status || controls.status, 120),
    inventoryStatus: cleanString(dashboard.inventoryStatus || dashboard.inventory_status || inventory.status, 120),
    artifactCount: Number(dashboard.artifactCount || inventory.artifactCount || inventory.artifact_count) || 0,
    latestCollectionRunId: cleanString(dashboard.latestCollectionRunId || dashboard.latest_collection_run_id || inventory.latestCollectionRunId || inventory.latest_collection_run_id, 120),
    latestPackageId: cleanString(dashboard.latestPackageId || dashboard.latest_package_id || inventory.latestPackageId || inventory.latest_package_id, 120),
    latestDecisionId: cleanString(dashboard.latestDecisionId || dashboard.latest_decision_id || inventory.latestDecisionId || inventory.latest_decision_id, 120),
    latestActivationId: cleanString(dashboard.latestActivationId || dashboard.latest_activation_id || inventory.latestActivationId || inventory.latest_activation_id, 120),
    latestRuntimeEnablementId: cleanString(dashboard.latestRuntimeEnablementId || dashboard.latest_runtime_enablement_id || inventory.latestRuntimeEnablementId || inventory.latest_runtime_enablement_id, 120),
    missingRecordKinds: uniqueStrings(dashboard.missingRecordKinds || dashboard.missing_record_kinds || inventory.missingRecordKinds || inventory.missing_record_kinds || []),
    blockedRecordKinds: uniqueStrings(dashboard.blockedRecordKinds || dashboard.blocked_record_kinds || inventory.blockedRecordKinds || inventory.blocked_record_kinds || []),
    missingCheckKeys: uniqueStrings(dashboard.missingCheckKeys || dashboard.missing_check_keys || []),
    blockedCheckKeys: uniqueStrings(dashboard.blockedCheckKeys || dashboard.blocked_check_keys || []),
    missingEvidenceKeys: uniqueStrings(dashboard.missingEvidenceKeys || dashboard.missing_evidence_keys || []),
    missingApprovalKeys: uniqueStrings(dashboard.missingApprovalKeys || dashboard.missing_approval_keys || []),
    persistedApprovalKeys: uniqueStrings(dashboard.persistedApprovalKeys || dashboard.persisted_approval_keys || []),
    configChangeApplied: value.configChangeApplied === true,
    runtimeConfigChange: value.runtimeConfigChange === true,
    runtimeConfigMutationPerformed: value.runtimeConfigMutationPerformed === true,
    writefulSchedulingAllowed: value.writefulSchedulingAllowed === true,
    backgroundSchedulingAllowed: value.backgroundSchedulingAllowed === true,
    backgroundWorkerAllowed: value.backgroundWorkerAllowed === true
  };
}

function releaseWorkbenchSummaryFromSmoke(value = {}) {
  const workbench = value.releaseWorkbench && typeof value.releaseWorkbench === "object" ? value.releaseWorkbench : {};
  return {
    source: cleanString(value.source || "growth-learning-automation-release-workbench-service", 160),
    status: cleanString(workbench.status || value.status, 120),
    schemaVersion: cleanString(value.schemaVersion || value.schema_version, 160),
    ownerActionCount: Number(workbench.ownerActionCount || workbench.owner_action_count) || 0,
    readRouteCount: Array.isArray(workbench.readRoutes || workbench.read_routes) ? (workbench.readRoutes || workbench.read_routes).length : 0,
    recordRouteCount: Array.isArray(workbench.recordRoutes || workbench.record_routes) ? (workbench.recordRoutes || workbench.record_routes).length : 0,
    missingEvidenceKeys: uniqueStrings(workbench.missingEvidenceKeys || workbench.missing_evidence_keys || []),
    missingApprovalKeys: uniqueStrings(workbench.missingApprovalKeys || workbench.missing_approval_keys || []),
    missingRecordKinds: uniqueStrings(workbench.missingRecordKinds || workbench.missing_record_kinds || []),
    nextActionKey: cleanString(workbench.nextAction?.key || workbench.next_action?.key, 120),
    actionEndpointKeys: uniqueStrings((workbench.ownerActions || workbench.owner_actions || [])
      .map((action) => action && (action.endpointKey || action.endpoint_key))
      .filter(Boolean)),
    readRouteKeys: uniqueStrings((workbench.readRoutes || workbench.read_routes || [])
      .map((route) => route && route.key)
      .filter(Boolean)),
    recordRouteKeys: uniqueStrings((workbench.recordRoutes || workbench.record_routes || [])
      .map((route) => route && route.key)
      .filter(Boolean)),
    configChangeApplied: value.configChangeApplied === true,
    runtimeConfigChange: value.runtimeConfigChange === true,
    runtimeConfigMutationPerformed: value.runtimeConfigMutationPerformed === true,
    writefulSchedulingAllowed: value.writefulSchedulingAllowed === true,
    backgroundSchedulingAllowed: value.backgroundSchedulingAllowed === true,
    backgroundWorkerAllowed: value.backgroundWorkerAllowed === true
  };
}

function ownerReviewSummaryFromSmoke(value = {}) {
  const ownerEvidence = value.automationOwnerReviewEvidence && typeof value.automationOwnerReviewEvidence === "object"
    ? value.automationOwnerReviewEvidence
    : {};
  return {
    source: cleanString(value.source || "growth-learning-automation-owner-review-evidence-service", 160),
    status: cleanString(ownerEvidence.status || value.status, 120),
    schemaVersion: cleanString(value.schemaVersion || value.schema_version, 160),
    readyForReleaseReview: value.readyForReleaseReview === true || ownerEvidence.readyForReleaseReview === true,
    passedGateCount: Number(ownerEvidence.passedGateCount || ownerEvidence.passed_gate_count) || 0,
    missingGateCount: Number(ownerEvidence.missingGateCount || ownerEvidence.missing_gate_count) || 0,
    requiredActionCount: Number(ownerEvidence.requiredActionCount || ownerEvidence.required_action_count) || 0,
    nextActionKey: cleanString(ownerEvidence.nextAction?.key || ownerEvidence.next_action?.key, 120),
    releaseReadinessStatus: cleanString(ownerEvidence.releaseReadinessStatus || ownerEvidence.release_readiness_status, 120),
    releaseMissingCheckKeys: uniqueStrings(ownerEvidence.releaseMissingCheckKeys || ownerEvidence.release_missing_check_keys || []),
    missingGateKeys: uniqueStrings(ownerEvidence.missingGateKeys || ownerEvidence.missing_gate_keys || []),
    proposalCount: Number(ownerEvidence.proposalCount || ownerEvidence.proposal_count) || 0,
    proposedProposalCount: Number(ownerEvidence.proposedProposalCount || ownerEvidence.proposed_proposal_count) || 0,
    acceptedProposalCount: Number(ownerEvidence.acceptedProposalCount || ownerEvidence.accepted_proposal_count) || 0,
    skippedProposalCount: Number(ownerEvidence.skippedProposalCount || ownerEvidence.skipped_proposal_count) || 0,
    expiredProposalCount: Number(ownerEvidence.expiredProposalCount || ownerEvidence.expired_proposal_count) || 0,
    supersededProposalCount: Number(ownerEvidence.supersededProposalCount || ownerEvidence.superseded_proposal_count) || 0,
    ownerDecisionProposalCount: Number(ownerEvidence.ownerDecisionProposalCount || ownerEvidence.owner_decision_proposal_count) || 0,
    proposalExecutionCount: Number(ownerEvidence.proposalExecutionCount || ownerEvidence.proposal_execution_count) || 0,
    publishedProposalExecutionCount: Number(ownerEvidence.publishedProposalExecutionCount || ownerEvidence.published_proposal_execution_count) || 0,
    blockedProposalExecutionCount: Number(ownerEvidence.blockedProposalExecutionCount || ownerEvidence.blocked_proposal_execution_count) || 0,
    failedProposalExecutionCount: Number(ownerEvidence.failedProposalExecutionCount || ownerEvidence.failed_proposal_execution_count) || 0,
    digestCount: Number(ownerEvidence.digestCount || ownerEvidence.digest_count) || 0,
    reviewedDigestCount: Number(ownerEvidence.reviewedDigestCount || ownerEvidence.reviewed_digest_count) || 0,
    pendingDigestCount: Number(ownerEvidence.pendingDigestCount || ownerEvidence.pending_digest_count) || 0,
    digestRequiredActionCount: Number(ownerEvidence.digestRequiredActionCount || ownerEvidence.digest_required_action_count) || 0,
    digestBlockedCandidateCount: Number(ownerEvidence.digestBlockedCandidateCount || ownerEvidence.digest_blocked_candidate_count) || 0,
    actionHandoffCount: Number(ownerEvidence.actionHandoffCount || ownerEvidence.action_handoff_count) || 0,
    deliveredHandoffCount: Number(ownerEvidence.deliveredHandoffCount || ownerEvidence.delivered_handoff_count) || 0,
    pendingHandoffDeliveryCount: Number(ownerEvidence.pendingHandoffDeliveryCount || ownerEvidence.pending_handoff_delivery_count) || 0,
    actionHandoffActionCount: Number(ownerEvidence.actionHandoffActionCount || ownerEvidence.action_handoff_action_count) || 0,
    blockedActionHandoffCount: Number(ownerEvidence.blockedActionHandoffCount || ownerEvidence.blocked_action_handoff_count) || 0,
    schedulerExecutionCount: Number(ownerEvidence.schedulerExecutionCount || ownerEvidence.scheduler_execution_count) || 0,
    publishedSchedulerExecutionCount: Number(ownerEvidence.publishedSchedulerExecutionCount || ownerEvidence.published_scheduler_execution_count) || 0,
    blockedSchedulerExecutionCount: Number(ownerEvidence.blockedSchedulerExecutionCount || ownerEvidence.blocked_scheduler_execution_count) || 0,
    failedSchedulerExecutionCount: Number(ownerEvidence.failedSchedulerExecutionCount || ownerEvidence.failed_scheduler_execution_count) || 0,
    schedulerRunCount: Number(ownerEvidence.schedulerRunCount || ownerEvidence.scheduler_run_count) || 0,
    completedSchedulerRunCount: Number(ownerEvidence.completedSchedulerRunCount || ownerEvidence.completed_scheduler_run_count) || 0,
    blockedSchedulerRunCount: Number(ownerEvidence.blockedSchedulerRunCount || ownerEvidence.blocked_scheduler_run_count) || 0,
    skippedSchedulerRunCount: Number(ownerEvidence.skippedSchedulerRunCount || ownerEvidence.skipped_scheduler_run_count) || 0,
    reviewedWorkerTargetCount: Number(ownerEvidence.reviewedWorkerTargetCount || ownerEvidence.reviewed_worker_target_count) || 0,
    pendingWorkerTargetReviewCount: Number(ownerEvidence.pendingWorkerTargetReviewCount || ownerEvidence.pending_worker_target_review_count) || 0,
    disabledWorkerTargetCount: Number(ownerEvidence.disabledWorkerTargetCount || ownerEvidence.disabled_worker_target_count) || 0,
    failurePolicyReady: ownerEvidence.failurePolicyReady === true || ownerEvidence.failure_policy_ready === true,
    failurePolicyStatus: cleanString(ownerEvidence.failurePolicyStatus || ownerEvidence.failure_policy_status, 120),
    writefulSchedulingAllowed: value.writefulSchedulingAllowed === true,
    backgroundSchedulingAllowed: value.backgroundSchedulingAllowed === true,
    backgroundWorkerAllowed: value.backgroundWorkerAllowed === true,
    runtimeConfigChange: value.runtimeConfigChange === true,
    configChangeApplied: value.configChangeApplied === true
  };
}

function targetProvisioningSummaryFromSmoke(value = {}) {
  const graphOptions = value.graphOptions && typeof value.graphOptions === "object" && !Array.isArray(value.graphOptions)
    ? value.graphOptions
    : {};
  return {
    source: cleanString(value.source || "growth-learning-target-provisioning-service", 160),
    status: cleanString(value.status || (value.ok === true ? "pass" : ""), 120),
    mode: cleanString(value.mode, 120),
    targetEnabled: value.targetEnabled === true,
    selectedDomainPackId: cleanString(value.selectedDomainPackId || value.selected_domain_pack_id, 160),
    selectedDomain: cleanString(value.selectedDomain || value.selected_domain, 120),
    selectedSubject: cleanString(value.selectedSubject || value.selected_subject, 120),
    selectedTargetNodeCount: uniqueStrings(value.selectedTargetNodeIds || value.selected_target_node_ids || []).length,
    graphOptionsAvailable: graphOptions.available === true,
    domainPackCount: Array.isArray(graphOptions.domainPacks || graphOptions.domain_packs)
      ? (graphOptions.domainPacks || graphOptions.domain_packs).length
      : 0,
    subjectCount: Array.isArray(graphOptions.subjects) ? graphOptions.subjects.length : 0
  };
}

function recommendationLifecycleSummaryFromSmoke(value = {}) {
  const summary = value.summary && typeof value.summary === "object" && !Array.isArray(value.summary)
    ? value.summary
    : {};
  return {
    source: cleanString(value.source || "growth-learning-recommendation-lifecycle-service", 160),
    status: cleanString(value.status || (value.ok === true ? "pass" : ""), 120),
    operation: cleanString(value.operation || "list", 80),
    lifecycleCount: Number(summary.lifecycleCount || value.count || 0) || 0,
    pendingCount: Number(summary.pendingCount || 0) || 0,
    acceptedCount: Number(summary.acceptedCount || 0) || 0,
    supersededCount: Number(summary.supersededCount || 0) || 0,
    missingCount: Number(summary.missingCount || 0) || 0,
    latestTrajectoryId: cleanString(summary.latestTrajectoryId || summary.latest_trajectory_id, 140),
    latestStatus: cleanString(summary.latestStatus || summary.latest_status, 80),
    latestTargetNodeIds: uniqueStrings(summary.latestTargetNodeIds || summary.latest_target_node_ids || []).slice(0, 12)
  };
}

function summaryForTask(task, value) {
  if (task.taskId === "release_controls") return releaseControlsSummaryFromSmoke(value);
  if (task.taskId === "release_inventory") return releaseInventorySummaryFromSmoke(value);
  if (task.taskId === "release_dashboard") return releaseDashboardSummaryFromSmoke(value);
  if (task.taskId === "release_workbench") return releaseWorkbenchSummaryFromSmoke(value);
  if (task.taskId === "owner_review_evidence") return ownerReviewSummaryFromSmoke(value);
  if (task.taskId === "target_provisioning") return targetProvisioningSummaryFromSmoke(value);
  if (task.taskId === "recommendation_lifecycle") return recommendationLifecycleSummaryFromSmoke(value);
  return summaryFromSmoke(value);
}

function releaseApprovalTaskResult(task, taskResult, generatedAt) {
  const parsed = parseJsonOutput(taskResult.stdout);
  const parsedValue = parsed.ok ? parsed.value : {};
  const privacyFindings = parsed.ok ? scanPrivacy(parsedValue).slice(0, 8) : [];
  const blockedError = !parsed.ok
    ? parsed.error
    : privacyFindings.length
      ? "release_evidence_bundle_smoke_privacy_failed"
      : parsedValue.ok === false
        ? cleanString(parsedValue.error || "release_evidence_bundle_smoke_reported_not_ok")
        : cleanString(parsedValue.error || taskResult.error || "");
  const pass = parsed.ok && privacyFindings.length === 0 && taskResult.exitCode === 0 && parsedValue.ok === true;
  const releaseApproval = pass ? releaseApprovalFromSmoke(parsedValue) : {};
  const taskSummary = {
    taskId: task.taskId,
    outputKey: task.outputKey,
    ok: pass,
    status: pass ? "pass" : "blocked",
    error: pass ? "" : (blockedError || "release_evidence_bundle_smoke_blocked"),
    source: task.commandName
  };
  if (privacyFindings.length) taskSummary.privacyFindingCount = privacyFindings.length;
  return {
    ok: pass,
    status: taskSummary.status,
    taskSummary,
    releaseApproval,
    summary: {
      source: "growth-release-evidence-bundle-builder",
      taskId: task.taskId,
      generatedAt,
      outputKey: task.outputKey,
      approvalKeys: Object.keys(releaseApproval).sort()
    }
  };
}

function evidenceFromTaskResult(task, taskResult, generatedAt) {
  const parsed = parseJsonOutput(taskResult.stdout);
  const parsedValue = parsed.ok ? parsed.value : {};
  const privacyFindings = parsed.ok ? scanPrivacy(parsedValue).slice(0, 8) : [];
  const blockedError = !parsed.ok
    ? parsed.error
    : privacyFindings.length
      ? "release_evidence_bundle_smoke_privacy_failed"
      : parsedValue.ok === false
        ? cleanString(parsedValue.error || "release_evidence_bundle_smoke_reported_not_ok")
        : cleanString(parsedValue.error || taskResult.error || "");
  const pass = parsed.ok && privacyFindings.length === 0 && taskResult.exitCode === 0 && parsedValue.ok === true;
  const evidence = {
    ok: pass,
    status: pass ? "pass" : "blocked",
    source: "growth-release-evidence-bundle-builder",
    smoke: task.commandName,
    taskId: task.taskId,
    evidenceId: `growth_release_evidence_${task.taskId}_${generatedAt.replace(/[^0-9A-Za-z]/g, "")}`,
    generatedAt,
    exitCode: taskResult.exitCode,
    summary: parsed.ok && !privacyFindings.length ? summaryForTask(task, parsedValue) : {}
  };
  if (!pass) {
    evidence.error = blockedError || "release_evidence_bundle_smoke_blocked";
  }
  if (privacyFindings.length) {
    evidence.privacyFindingCount = privacyFindings.length;
  }
  return evidence;
}

function blockedEvidenceFromTask(task, generatedAt, error, details = {}) {
  const evidence = {
    ok: false,
    status: "blocked",
    source: "growth-release-evidence-bundle-builder",
    smoke: task.commandName,
    taskId: task.taskId,
    evidenceId: `growth_release_evidence_${task.taskId}_${generatedAt.replace(/[^0-9A-Za-z]/g, "")}`,
    generatedAt,
    exitCode: null,
    error: cleanString(error, 160),
    summary: Object.assign({
      source: "growth-release-evidence-bundle-builder",
      taskId: task.taskId
    }, details.summary || {})
  };
  if (details.requiredFlag) evidence.requiredFlag = cleanString(details.requiredFlag, 80);
  if (Array.isArray(details.allowedOperations)) evidence.allowedOperations = details.allowedOperations.map((item) => cleanString(item, 40)).filter(Boolean);
  return evidence;
}

function preflightTaskEvidence(task, scope, generatedAt) {
  if (task.taskId === "learner_cycle" && !LEARNER_CYCLE_BUNDLE_OPERATIONS.has(scope.learnerCycleOperation)) {
    return blockedEvidenceFromTask(task, generatedAt, "release_evidence_bundle_learner_cycle_operation_invalid", {
      allowedOperations: Array.from(LEARNER_CYCLE_BUNDLE_OPERATIONS),
      summary: {
        operation: scope.learnerCycleOperation,
        allowedOperations: Array.from(LEARNER_CYCLE_BUNDLE_OPERATIONS),
        useDirectSmoke: "npm run smoke:learner-cycle"
      }
    });
  }
  if (!task.writeEvidence) return null;
  if (!scope.allowWriteEvidence) {
    return blockedEvidenceFromTask(task, generatedAt, "release_evidence_bundle_write_evidence_not_allowed", {
      requiredFlag: "--allow-write-evidence",
      summary: {
        writeEvidenceAllowed: false,
        requiredFlag: "--allow-write-evidence"
      }
    });
  }
  if (task.taskId === "daily_loop_write") {
    if (!DAILY_LOOP_WRITE_OPERATIONS.has(scope.dailyLoopWriteOperation)) {
      return blockedEvidenceFromTask(task, generatedAt, "release_evidence_bundle_daily_loop_write_operation_invalid", {
        allowedOperations: Array.from(DAILY_LOOP_WRITE_OPERATIONS),
        summary: {
          writeEvidenceAllowed: true,
          operation: scope.dailyLoopWriteOperation,
          allowedOperations: Array.from(DAILY_LOOP_WRITE_OPERATIONS)
        }
      });
    }
    if (scope.dailyLoopWriteOperation === "publish" && !scope.planDraftId) {
      return blockedEvidenceFromTask(task, generatedAt, "release_evidence_bundle_plan_draft_id_required", {
        summary: {
          writeEvidenceAllowed: true,
          operation: "publish",
          requiredField: "planDraftId"
        }
      });
    }
  }
  return null;
}

function taskSpecificArgs(task, scope) {
  const args = Array.from(task.extraArgs || []);
  if (task.taskId === "learner_cycle") {
    args.push("--operation", scope.learnerCycleOperation);
    if (scope.taskCardId) args.push("--task-card-id", scope.taskCardId);
  }
  if (task.taskId === "daily_loop_write") {
    args.push("--operation", scope.dailyLoopWriteOperation, "--allow-write");
    if (scope.planDraftId) args.push("--plan-draft-id", scope.planDraftId);
  }
  if (task.taskId === "central_visual") {
    args.push("--plugin-id", scope.visualPluginId || "growth");
    args.push("--scenario", scope.visualScenario || "embedded-plugin-shell");
    if (scope.centralVisualEvidenceFile) args.push("--central-visual-evidence-file", scope.centralVisualEvidenceFile);
  }
  if (task.taskId === "owner_review_evidence") {
    if (scope.activationGates.length) args.push("--activation-gates", scope.activationGates.join(","));
    if (scope.requiredApprovalKeys.length) args.push("--required-approval-keys", scope.requiredApprovalKeys.join(","));
  }
  if (task.taskId === "release_controls" || task.taskId === "release_inventory" || task.taskId === "release_dashboard" || task.taskId === "release_workbench") {
    if (scope.collectionRunId) args.push("--collection-run-id", scope.collectionRunId);
    if (scope.activationGates.length) args.push("--activation-gates", scope.activationGates.join(","));
    if (scope.requiredApprovalKeys.length) args.push("--required-approval-keys", scope.requiredApprovalKeys.join(","));
    args.push("--activation-record-limit", String(scope.activationRecordLimit));
    args.push("--runtime-enablement-record-limit", String(scope.runtimeEnablementRecordLimit));
    const evidenceFlags = [
      ["--owner-daily-ui-evidence", scope.ownerDailyUiEvidence],
      ["--owner-audit-ui-evidence", scope.ownerAuditUiEvidence],
      ["--stage-checkpoint-evidence", scope.stageCheckpointEvidence],
      ["--proposal-review-ui-evidence", scope.proposalReviewUiEvidence],
      ["--automation-digest-ui-evidence", scope.automationDigestUiEvidence],
      ["--automation-action-handoff-ui-evidence", scope.automationActionHandoffUiEvidence],
      ["--scheduler-execution-ui-evidence", scope.schedulerExecutionUiEvidence],
      ["--scheduler-run-ui-evidence", scope.schedulerRunUiEvidence],
      ["--scheduler-worker-target-ui-evidence", scope.schedulerWorkerTargetUiEvidence]
    ];
    for (const [flag, enabled] of evidenceFlags) {
      if (enabled) args.push(flag, "true");
    }
  }
  return args;
}

function createLearningAutomationReleaseEvidenceBundleService(options = {}) {
  const runCommand = options.runCommand;
  const repoRoot = options.repoRoot || process.cwd();
  const nodePath = options.nodePath || process.execPath;
  const now = options.now || (() => new Date());

  function runTask(task, scope) {
    if (typeof runCommand !== "function") {
      return {
        exitCode: 1,
        stdout: "",
        error: "release_evidence_bundle_runner_unavailable"
      };
    }
    const args = [
      path.join(repoRoot, task.script),
      ...scopeArgs(scope),
      ...taskSpecificArgs(task, scope),
      "--json"
    ];
    const result = runCommand(nodePath, args, {
      cwd: repoRoot
    }) || {};
    return {
      exitCode: Number.isInteger(result.status) ? result.status : Number.isInteger(result.exitCode) ? result.exitCode : 1,
      stdout: String(result.stdout || ""),
      error: cleanString(result.error || result.stderr || "")
    };
  }

  function buildBundle(input = {}) {
    const scope = publicScope(input);
    if (!scope.workspaceId) {
      return { ok: false, error: "release_evidence_bundle_workspace_required" };
    }
    const generatedAt = cleanString(input.createdAt || input.created_at, 64) || nowIso(now);
    const taskIds = normalizeTaskIds(input);
    const invalidTaskIds = taskIds.filter((taskId) => !TASK_BY_ID.has(taskId));
    if (invalidTaskIds.length) {
      return {
        ok: false,
        error: "release_evidence_bundle_task_invalid",
        invalidTaskIds,
        allowedTaskIds: TASK_DEFINITIONS.map((task) => task.taskId)
      };
    }
    const evidence = {};
    const releaseApproval = {};
    const taskResults = [];
    for (const taskId of taskIds) {
      const task = TASK_BY_ID.get(taskId);
      const blockedEvidence = preflightTaskEvidence(task, scope, generatedAt);
      if (blockedEvidence) {
        evidence[task.evidenceKey] = blockedEvidence;
        taskResults.push({
          taskId,
          evidenceKey: task.evidenceKey,
          ok: false,
          status: "blocked",
          error: blockedEvidence.error,
          source: task.commandName
        });
        continue;
      }
      const taskRun = runTask(task, scope);
      if (task.outputKey === "releaseApproval") {
        const approvalResult = releaseApprovalTaskResult(task, taskRun, generatedAt);
        Object.assign(releaseApproval, approvalResult.releaseApproval);
        taskResults.push(approvalResult.taskSummary);
        continue;
      }
      const taskEvidence = evidenceFromTaskResult(task, taskRun, generatedAt);
      evidence[task.evidenceKey] = taskEvidence;
      taskResults.push({
        taskId,
        evidenceKey: task.evidenceKey,
        ok: taskEvidence.ok,
        status: taskEvidence.status,
        error: cleanString(taskEvidence.error || ""),
        source: task.commandName
      });
    }
    const passedCount = taskResults.filter((item) => item.ok).length;
    const blockedCount = taskResults.length - passedCount;
    const bundle = {
      schemaVersion: RELEASE_EVIDENCE_BUNDLE_SCHEMA,
      privacyClass: "summary_only",
      summaryOnly: true,
      createdAt: generatedAt,
      requestedBy: cleanString(input.requestedBy || input.requested_by, 120),
      scope: publicBundleScope(scope),
      evidence,
      releaseApproval,
      summary: {
        source: "growth-release-evidence-bundle-builder",
        taskCount: taskResults.length,
        passedCount,
        blockedCount,
        failedTaskIds: taskResults.filter((item) => !item.ok).map((item) => item.taskId)
      },
      tasks: taskResults
    };
    return {
      ok: blockedCount === 0,
      source: "growth-learning-automation-release-evidence-bundle-service",
      bundle,
      summary: bundle.summary
    };
  }

  return {
    buildBundle
  };
}

module.exports = {
  DEFAULT_TASK_IDS,
  RELEASE_EVIDENCE_BUNDLE_SCHEMA,
  TASK_DEFINITIONS,
  createLearningAutomationReleaseEvidenceBundleService,
  normalizeTaskIds,
  publicScope,
  scopeArgs
};
