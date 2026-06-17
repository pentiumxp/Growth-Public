"use strict";

const {
  UI_EVIDENCE_COLLECTION_TASKS,
  UI_EVIDENCE_COLLECTION_TASK_BY_CHECK_KEY
} = require("./learning-automation-ui-evidence-task-registry");

const DEFAULT_TASK_IDS = Object.freeze([
  "planner_readiness",
  "daily_loop_preview",
  "learning_loop_state",
  "operating_loop_history",
  "cycle_history",
  "owner_audit",
  "owner_audit_review",
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

const RELEASE_EVIDENCE_COLLECTION_FALLBACK_TASK_IDS = Object.freeze(["learning_loop_state"]);

const COLLECTION_OWNED_RELEASE_EVIDENCE_KEYS = new Set([
  "release_evidence_bundle_audit"
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
    taskId: "operating_loop_history",
    evidenceKey: "productionOperatingLoopHistorySmokeEvidence",
    script: "scripts/smoke-growth-operating-loop.js",
    commandName: "npm run smoke:operating-loop",
    extraArgs: ["--operation", "list-runs"]
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
    taskId: "owner_audit_review",
    evidenceKey: "productionOwnerAuditReviewSmokeEvidence",
    script: "scripts/smoke-growth-owner-audit-review.js",
    commandName: "npm run smoke:owner-audit-review"
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
    taskId: "production_deployment_health",
    evidenceKey: "productionDeploymentHealthEvidence",
    checkKey: "production_deployment_health",
    script: "scripts/smoke-growth-production-deployment-evidence.js",
    commandName: "npm run smoke:production-deployment-evidence"
  },
  ...UI_EVIDENCE_COLLECTION_TASKS.map((task) => ({
    taskId: task.taskId,
    evidenceKey: task.evidenceKey,
    script: "scripts/smoke-growth-ui-evidence.js",
    commandName: "npm run smoke:ui-evidence",
    uiEvidenceKey: task.evidenceKey,
    uiEvidenceFileField: task.fileField
  })),
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

const RELEASE_EVIDENCE_COLLECTION_TASK_ORDER = Object.freeze([
  "planner_readiness",
  "daily_loop_preview",
  "learning_loop_state",
  "operating_loop_history",
  "cycle_history",
  "owner_audit",
  "owner_audit_review",
  "profile_feedback",
  "recommendation_lifecycle",
  "learner_cycle",
  "target_provisioning",
  "stage_assessment",
  "stage_checkpoint_controls",
  "proposal",
  "platform_action",
  "central_visual",
  ...UI_EVIDENCE_COLLECTION_TASKS.map((task) => task.taskId),
  "scheduler_dry_run",
  "action_handoff",
  "scheduler_execution",
  "scheduler_run",
  "scheduler_worker_target",
  "scheduler_worker",
  "owner_review_evidence",
  "release_workbench"
]);

const TASK_BY_ID = new Map(TASK_DEFINITIONS.map((task) => [task.taskId, task]));
const RELEASE_EVIDENCE_COLLECTION_TASK_ID_SET = new Set(RELEASE_EVIDENCE_COLLECTION_TASK_ORDER);

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function snakeCaseKey(key = "") {
  return cleanString(key, 180).replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function keyEntriesForTask(task = {}) {
  const entries = [];
  for (const key of [task.evidenceKey, task.outputKey, task.checkKey]) {
    const clean = cleanString(key, 180);
    if (!clean) continue;
    entries.push([clean, task.taskId]);
    entries.push([snakeCaseKey(clean), task.taskId]);
    entries.push([clean.replace(/-/g, "_"), task.taskId]);
  }
  return entries;
}

function buildTaskKeyMap(predicate) {
  const entries = [];
  for (const task of TASK_DEFINITIONS) {
    if (!predicate(task)) continue;
    entries.push(...keyEntriesForTask(task));
  }
  for (const [checkKey, taskId] of Object.entries(UI_EVIDENCE_COLLECTION_TASK_BY_CHECK_KEY)) {
    const task = TASK_BY_ID.get(taskId);
    if (task && predicate(task)) entries.push([checkKey, taskId]);
  }
  return Object.freeze(Object.fromEntries(entries));
}

const TASK_ID_BY_RELEASE_EVIDENCE_KEY = buildTaskKeyMap(() => true);

const RELEASE_EVIDENCE_COLLECTION_TASK_BY_KEY = buildTaskKeyMap((task) => (
  RELEASE_EVIDENCE_COLLECTION_TASK_ID_SET.has(task.taskId) && task.writeEvidence !== true
));

const WRITE_GATED_RELEASE_EVIDENCE_COLLECTION_TASK_BY_KEY = buildTaskKeyMap((task) => (
  task.writeEvidence === true
));

function taskDefinition(taskId = "") {
  return TASK_BY_ID.get(cleanString(taskId, 140)) || {};
}

function taskIdFromRegistryKey(value = "", taskMap = TASK_ID_BY_RELEASE_EVIDENCE_KEY) {
  const key = cleanString(value, 180);
  if (!key) return "";
  const normalized = key.replace(/-/g, "_");
  return taskMap[key] || taskMap[normalized] || "";
}

function taskIdFromReleaseEvidenceKey(value = "") {
  return taskIdFromRegistryKey(value, TASK_ID_BY_RELEASE_EVIDENCE_KEY);
}

function releaseEvidenceCollectionTaskIdForKey(value = "") {
  return taskIdFromRegistryKey(value, RELEASE_EVIDENCE_COLLECTION_TASK_BY_KEY);
}

function writeGatedReleaseEvidenceCollectionTaskIdForKey(value = "") {
  return taskIdFromRegistryKey(value, WRITE_GATED_RELEASE_EVIDENCE_COLLECTION_TASK_BY_KEY);
}

function isCollectionOwnedReleaseEvidenceKey(value = "") {
  return COLLECTION_OWNED_RELEASE_EVIDENCE_KEYS.has(cleanString(value, 180));
}

module.exports = {
  COLLECTION_OWNED_RELEASE_EVIDENCE_KEYS,
  DEFAULT_TASK_IDS,
  RELEASE_APPROVAL_KEYS,
  RELEASE_EVIDENCE_COLLECTION_FALLBACK_TASK_IDS,
  RELEASE_EVIDENCE_COLLECTION_TASK_BY_KEY,
  RELEASE_EVIDENCE_COLLECTION_TASK_ORDER,
  TASK_DEFINITIONS,
  TASK_ID_BY_RELEASE_EVIDENCE_KEY,
  WRITE_GATED_RELEASE_EVIDENCE_COLLECTION_TASK_BY_KEY,
  isCollectionOwnedReleaseEvidenceKey,
  releaseEvidenceCollectionTaskIdForKey,
  taskDefinition,
  taskIdFromReleaseEvidenceKey,
  writeGatedReleaseEvidenceCollectionTaskIdForKey
};
