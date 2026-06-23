"use strict";

const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|Bearer\s+|Authorization:|access-key|launch-token|cookie|secret|token=|password|provider payload)/i;

function cleanString(value, limit = 160) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function safeErrorCode(error) {
  return cleanString(error?.code || error?.name || "worker_error", 80)
    .replace(/[^a-zA-Z0-9_.:-]/g, "_")
    || "worker_error";
}

function safeErrorMessage(error, limit) {
  const message = cleanString(error?.message || "", limit);
  if (!message) return "Worker execution failed";
  if (PRIVATE_VALUE_PATTERN.test(message)) return "Worker execution failed; details redacted";
  return message;
}

function safeSummaryText(value, limit = 80) {
  const text = cleanString(value, limit);
  if (!text) return "";
  if (PRIVATE_VALUE_PATTERN.test(text)) return "redacted";
  return text;
}

function resultSummary(result = {}) {
  const summary = {
    ok: result?.ok !== false
  };
  if (Number.isFinite(Number(result?.processed))) summary.processed = Number(result.processed);
  if (Array.isArray(result?.results)) summary.resultCount = result.results.length;
  if (result?.status) summary.status = safeSummaryText(result.status, 80);
  if (result?.error) summary.error = safeSummaryText(result.error, 80);
  return summary;
}

function createGrowthWorkerRuntimeHealthService({ clock = () => Date.now(), maxMessageLength = 160 } = {}) {
  const workers = new Map();

  function workerRecord(workerId) {
    const id = cleanString(workerId, 80) || "unknown_worker";
    if (!workers.has(id)) {
      workers.set(id, {
        workerId: id,
        status: "idle",
        runCount: 0,
        successCount: 0,
        failureCount: 0,
        consecutiveFailures: 0,
        lastStartedAt: "",
        lastFinishedAt: "",
        lastResult: null,
        lastError: null
      });
    }
    return workers.get(id);
  }

  function nowIso() {
    return new Date(clock()).toISOString();
  }

  function recordStarted(workerId) {
    const record = workerRecord(workerId);
    record.status = "running";
    record.runCount += 1;
    record.lastStartedAt = nowIso();
    return record;
  }

  function recordSucceeded(workerId, result = {}) {
    const record = workerRecord(workerId);
    record.status = "ok";
    record.successCount += 1;
    record.consecutiveFailures = 0;
    record.lastFinishedAt = nowIso();
    record.lastResult = resultSummary(result);
    record.lastError = null;
    return record;
  }

  function recordFailed(workerId, error) {
    const record = workerRecord(workerId);
    record.status = "failed";
    record.failureCount += 1;
    record.consecutiveFailures += 1;
    record.lastFinishedAt = nowIso();
    record.lastError = {
      code: safeErrorCode(error),
      message: safeErrorMessage(error, maxMessageLength)
    };
    record.lastResult = null;
    return record;
  }

  function snapshot() {
    return {
      ok: true,
      schemaVersion: "growth.workerRuntimeHealth.v1",
      privacyClass: "summary_only",
      summaryOnly: true,
      workers: Array.from(workers.values()).map((record) => Object.assign({}, record))
    };
  }

  return {
    recordFailed,
    recordStarted,
    recordSucceeded,
    snapshot
  };
}

module.exports = {
  createGrowthWorkerRuntimeHealthService
};
