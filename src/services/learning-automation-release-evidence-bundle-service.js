"use strict";

const path = require("node:path");

const RELEASE_EVIDENCE_BUNDLE_SCHEMA = "growth.learningAutomationReleaseEvidenceBundle.v1";
const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;
const DAILY_LOOP_WRITE_OPERATIONS = new Set(["draft", "publish"]);
const LEARNER_CYCLE_BUNDLE_OPERATIONS = new Set(["audit"]);

const DEFAULT_TASK_IDS = Object.freeze([
  "planner_readiness",
  "daily_loop_preview",
  "learning_loop_state",
  "cycle_history",
  "owner_audit",
  "profile_feedback",
  "learner_cycle",
  "stage_assessment",
  "proposal",
  "platform_action",
  "scheduler_dry_run",
  "action_handoff",
  "scheduler_execution",
  "scheduler_run",
  "scheduler_worker_target",
  "scheduler_worker",
  "release_approval"
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
    taskId: "learner_cycle",
    evidenceKey: "productionLearnerCycleSmokeEvidence",
    script: "scripts/smoke-growth-learner-cycle.js",
    commandName: "npm run smoke:learner-cycle"
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
  }
]);

const TASK_BY_ID = new Map(TASK_DEFINITIONS.map((task) => [task.taskId, task]));

function cleanString(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function uniqueStrings(values = []) {
  return Array.from(new Set(values.map((value) => cleanString(value, 120)).filter(Boolean)));
}

function clampLimit(value, fallback = 12) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.min(50, Math.round(numeric)));
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
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
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
    evaluationId: cleanString(input.evaluationId || input.evaluation_id, 120),
    profileDeltaId: cleanString(input.profileDeltaId || input.profile_delta_id, 120),
    evidenceId: cleanString(input.evidenceId || input.evidence_id, 120),
    correctionId: cleanString(input.correctionId || input.correction_id, 120),
    sourceId: cleanString(input.sourceId || input.source_id, 120)
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
  }
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
    summary: parsed.ok && !privacyFindings.length ? summaryFromSmoke(parsedValue) : {}
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
      scope,
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
