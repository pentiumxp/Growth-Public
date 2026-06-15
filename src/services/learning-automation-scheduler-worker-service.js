"use strict";

const crypto = require("node:crypto");

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body)/i;

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unavailable(error, extra = {}) {
  return Object.assign({
    ok: false,
    source: "growth-learning-automation-scheduler-worker-service",
    error: cleanString(error) || "learning_automation_scheduler_worker_unavailable"
  }, extra);
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

function scopeFrom(input = {}) {
  const workspaceId = cleanString(input.workspaceId || input.workspace_id);
  return {
    workspaceId,
    learnerId: cleanString(input.learnerId || input.learner_id || workspaceId),
    programId: cleanString(input.programId || input.program_id),
    domainPackId: cleanString(input.domainPackId || input.domain_pack_id),
    domain: cleanString(input.domain),
    subject: cleanString(input.subject),
    horizon: cleanString(input.horizon || "daily_plan") || "daily_plan"
  };
}

function modeFrom(input = {}) {
  return cleanString(input.workerMode || input.worker_mode || input.mode || "background_worker_tick") || "background_worker_tick";
}

function nowIso(clock) {
  const now = typeof clock === "function" ? clock() : new Date();
  return now instanceof Date && !Number.isNaN(now.getTime()) ? now.toISOString() : new Date().toISOString();
}

function clampLeaseMs(value, fallback = 10 * 60 * 1000) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(5000, Math.min(60 * 60 * 1000, Math.round(parsed)));
}

function clampLimit(value, fallback = 5) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(1, Math.min(25, Math.round(parsed)));
}

function tokenFor(scope, workerId, timestamp) {
  const seed = [
    workerId,
    scope.workspaceId,
    scope.learnerId,
    scope.programId,
    scope.domainPackId,
    scope.subject,
    scope.horizon,
    timestamp
  ].join(":");
  return `lgaslease_token_${crypto.createHash("sha256").update(seed).digest("hex").slice(0, 18)}`;
}

function workerInputSummary(scope, input = {}, extra = {}) {
  return {
    schemaVersion: "growth.learningAutomationSchedulerWorker.input.v1",
    summaryOnly: true,
    workspaceId: scope.workspaceId,
    learnerId: scope.learnerId,
    programId: scope.programId,
    domainPackId: scope.domainPackId,
    domain: scope.domain,
    subject: scope.subject,
    horizon: scope.horizon,
    workerMode: modeFrom(input),
    limit: clampLimit(input.limit),
    workerEnabled: Boolean(extra.workerEnabled),
    backgroundSchedulerEnabled: Boolean(extra.backgroundSchedulerEnabled),
    requestedBy: cleanString(input.requestedBy || input.requested_by)
  };
}

function runSummary(runResult) {
  return {
    schemaVersion: "growth.learningAutomationSchedulerWorker.summary.v1",
    summaryOnly: true,
    schedulerRunOk: runResult?.ok !== false,
    schedulerRunError: cleanString(runResult?.error),
    schedulerRunStatus: cleanString(runResult?.run?.status),
    schedulerRunId: cleanString(runResult?.run?.runId),
    attemptedExecutions: Number(runResult?.run?.summary?.attemptedExecutions || runResult?.executions?.length || 0) || 0,
    noDirectGateway: true,
    noDirectPublish: true,
    noDirectCardGeneration: true,
    schedulerRunServiceOnly: true
  };
}

function publicRunResult(runResult) {
  if (!runResult) return null;
  return {
    ok: runResult.ok !== false,
    error: cleanString(runResult.error),
    run: runResult.run || null,
    executions: asArray(runResult.executions)
  };
}

function runnableTargetsFromServiceResult(result = {}) {
  return asArray(result.targets).map((target) => ({
    workspaceId: cleanString(target.workspaceId || target.workspace_id),
    learnerId: cleanString(target.learnerId || target.learner_id || target.workspaceId || target.workspace_id),
    programId: cleanString(target.programId || target.program_id),
    domainPackId: cleanString(target.domainPackId || target.domain_pack_id),
    domain: cleanString(target.domain),
    subject: cleanString(target.subject),
    horizon: cleanString(target.horizon || "daily_plan") || "daily_plan",
    targetNodeIds: asArray(target.targetNodeIds || target.target_node_ids || target.nodeIds || target.node_ids).map(cleanString).filter(Boolean).slice(0, 24),
    workerTargetId: cleanString(target.workerTargetId || target.worker_target_id || target.targetId || target.target_id),
    limit: target.limit
  })).filter((target) => target.workspaceId);
}

function createLearningAutomationSchedulerWorkerService(options = {}) {
  const repository = options.repository || null;
  const schedulerRunService = options.schedulerRunService || null;
  const workerTargetService = options.workerTargetService || null;
  const allowBackgroundWorker = options.allowBackgroundWorker === true;
  const defaultTargets = asArray(options.defaultTargets);
  const workerId = cleanString(options.workerId) || `growth-automation-scheduler-worker-${process.pid}`;
  const leaseMs = clampLeaseMs(options.leaseMs);
  const clock = typeof options.now === "function" ? options.now : () => new Date();

  async function tick(input = {}) {
    if (!allowBackgroundWorker) {
      return unavailable("learning_automation_scheduler_worker_disabled", {
        workerEnabled: false
      });
    }
    if (!repository || typeof repository.claimLease !== "function" || typeof repository.releaseLease !== "function") {
      return unavailable("learning_automation_scheduler_worker_lease_repository_unavailable");
    }
    if (!schedulerRunService || typeof schedulerRunService.runOnce !== "function") {
      return unavailable("learning_automation_scheduler_worker_run_service_unavailable");
    }
    const scope = scopeFrom(input);
    if (!scope.workspaceId) return unavailable("learning_automation_scheduler_worker_scope_required");
    const privacyFindings = scanPrivacy(input);
    if (privacyFindings.length) return unavailable("learning_automation_scheduler_worker_privacy_failed", { privacyFindings });
    if (modeFrom(input) !== "background_worker_tick") {
      return unavailable("learning_automation_scheduler_worker_mode_invalid");
    }
    const timestamp = cleanString(input.createdAt || input.created_at || input.now) || nowIso(clock);
    const activeWorkerId = cleanString(input.workerId || input.worker_id) || workerId;
    const activeLeaseMs = clampLeaseMs(input.leaseMs || input.lease_ms || leaseMs, leaseMs);
    const leaseUntil = new Date(Date.parse(timestamp) + activeLeaseMs).toISOString();
    const leaseToken = tokenFor(scope, activeWorkerId, timestamp);
    const claim = repository.claimLease(Object.assign({}, scope, {
      workerId: activeWorkerId,
      leaseToken,
      leaseMs: activeLeaseMs,
      claimedAt: timestamp,
      leaseUntil,
      input: workerInputSummary(scope, input, {
        workerEnabled: allowBackgroundWorker,
        backgroundSchedulerEnabled: Boolean(input.backgroundSchedulerEnabled)
      }),
      summary: {
        schemaVersion: "growth.learningAutomationSchedulerWorker.summary.v1",
        summaryOnly: true,
        claimed: true,
        noDirectGateway: true,
        schedulerRunServiceOnly: true
      },
      privacyClass: "summary_only"
    }));
    if (!claim?.ok) return claim || unavailable("learning_automation_scheduler_worker_lease_claim_failed");
    let runResult = null;
    let releaseStatus = "released";
    try {
      runResult = await schedulerRunService.runOnce(Object.assign({}, scope, {
        runMode: "background_supervised_tick",
        limit: clampLimit(input.limit),
        generationKey: input.generationKey || input.generation_key,
        cardSchemaVersion: input.cardSchemaVersion || input.card_schema_version,
        requestedBy: activeWorkerId,
        createdAt: timestamp,
        startedAt: timestamp,
        executedAt: cleanString(input.executedAt || input.executed_at) || timestamp
      }));
      if (runResult?.ok === false) releaseStatus = "blocked";
    } catch (error) {
      runResult = unavailable("learning_automation_scheduler_worker_run_exception", {
        detail: cleanString(error?.message).slice(0, 240)
      });
      releaseStatus = "failed";
    }
    const summary = runSummary(runResult);
    const release = repository.releaseLease({
      leaseId: claim.lease.leaseId,
      leaseToken,
      status: releaseStatus,
      reason: releaseStatus === "released"
        ? "scheduler_worker_tick_released"
        : (runResult?.error || "scheduler_worker_tick_blocked"),
      error: releaseStatus === "released" ? "" : runResult?.error,
      runId: summary.schedulerRunId,
      runStatus: summary.schedulerRunStatus,
      summary,
      releasedAt: cleanString(input.releasedAt || input.released_at) || nowIso(clock)
    });
    return {
      ok: runResult?.ok !== false,
      source: "growth-learning-automation-scheduler-worker-service",
      error: runResult?.ok === false ? runResult.error : "",
      workerEnabled: true,
      lease: release?.lease || claim.lease,
      run: runResult?.run || null,
      schedulerRun: publicRunResult(runResult)
    };
  }

  async function tickTargets(input = {}) {
    if (!allowBackgroundWorker) {
      return unavailable("learning_automation_scheduler_worker_disabled", {
        workerEnabled: false,
        results: []
      });
    }
    let targetSource = asArray(input.targets).length ? "request" : "default_config";
    let targets = asArray(input.targets).length ? asArray(input.targets) : [];
    if (!targets.length && workerTargetService && typeof workerTargetService.listRunnableTargets === "function") {
      const targetResult = workerTargetService.listRunnableTargets({
        workspaceId: input.workspaceId || input.workspace_id,
        learnerId: input.learnerId || input.learner_id,
        programId: input.programId || input.program_id,
        domainPackId: input.domainPackId || input.domain_pack_id,
        domain: input.domain,
        subject: input.subject,
        horizon: input.horizon,
        limit: input.maxTargets || input.max_targets || input.limit
      });
      if (!targetResult?.ok) return Object.assign({}, targetResult, { results: [] });
      targets = runnableTargetsFromServiceResult(targetResult);
      targetSource = "reviewed_worker_targets";
    }
    if (!targets.length) {
      targets = defaultTargets;
      targetSource = "default_config";
    }
    const privacyFindings = scanPrivacy({ targets });
    if (privacyFindings.length) return unavailable("learning_automation_scheduler_worker_privacy_failed", { privacyFindings, results: [] });
    if (!targets.length) {
      return unavailable("learning_automation_scheduler_worker_targets_required", {
        workerEnabled: true,
        results: []
      });
    }
    const maxTargets = clampLimit(input.maxTargets || input.max_targets || targets.length, targets.length);
    const results = [];
    for (const target of targets.slice(0, maxTargets)) {
      const result = await tick(Object.assign({}, input, target, {
        targets: undefined,
        maxTargets: undefined
      }));
      results.push({
        ok: result.ok !== false,
        error: cleanString(result.error),
        workspaceId: cleanString(target.workspaceId || target.workspace_id),
        learnerId: cleanString(target.learnerId || target.learner_id || target.workspaceId || target.workspace_id),
        lease: result.lease || null,
        run: result.run || null
      });
    }
    const succeeded = results.filter((result) => result.ok).length;
    return {
      ok: succeeded > 0,
      source: "growth-learning-automation-scheduler-worker-service",
      workerEnabled: true,
      targetSource,
      targetCount: targets.length,
      attemptedTargets: results.length,
      succeeded,
      failed: results.length - succeeded,
      results
    };
  }

  return {
    tick,
    tickTargets
  };
}

module.exports = { createLearningAutomationSchedulerWorkerService };
