"use strict";

const {
  asArray,
  cleanString,
  insertDynamic,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");
const { stableLearningAutomationSchedulerRunId } = require("./identifiers");

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body)/i;

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function boundedText(value, max = 360) {
  const text = cleanString(value);
  return text.length > max ? text.slice(0, max) : text;
}

function scanPrivacyKeys(value, path = "$", findings = []) {
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacyKeys(item, `${path}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacyKeys(child, childPath, findings);
  }
  return findings;
}

function ensureLearningAutomationSchedulerRunSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_automation_scheduler_runs (
      run_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      domain_pack_id TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      horizon TEXT NOT NULL DEFAULT 'daily_plan',
      mode TEXT NOT NULL DEFAULT 'background_supervised_tick',
      status TEXT NOT NULL DEFAULT 'started',
      reason TEXT NOT NULL DEFAULT '',
      error TEXT NOT NULL DEFAULT '',
      input_json TEXT NOT NULL DEFAULT '{}',
      candidate_json TEXT NOT NULL DEFAULT '[]',
      execution_json TEXT NOT NULL DEFAULT '[]',
      summary_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL DEFAULT '',
      executed_by TEXT NOT NULL DEFAULT '',
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const columns = new Set(tableColumns(db, "learning_growth_automation_scheduler_runs"));
  [
    ["domain_pack_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain", "TEXT NOT NULL DEFAULT ''"],
    ["subject", "TEXT NOT NULL DEFAULT ''"],
    ["horizon", "TEXT NOT NULL DEFAULT 'daily_plan'"],
    ["mode", "TEXT NOT NULL DEFAULT 'background_supervised_tick'"],
    ["reason", "TEXT NOT NULL DEFAULT ''"],
    ["error", "TEXT NOT NULL DEFAULT ''"],
    ["input_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["candidate_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["execution_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["summary_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["executed_by", "TEXT NOT NULL DEFAULT ''"]
  ].forEach(([name, definition]) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE learning_growth_automation_scheduler_runs ADD COLUMN ${name} ${definition}`);
  });
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_scheduler_runs_target
      ON learning_growth_automation_scheduler_runs(workspace_id, learner_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_scheduler_runs_scope
      ON learning_growth_automation_scheduler_runs(workspace_id, domain_pack_id, subject, updated_at);
  `);
}

function publicAutomationSchedulerRun(row) {
  if (!row) return null;
  return {
    runId: cleanString(row.run_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    domainPackId: cleanString(row.domain_pack_id),
    domain: cleanString(row.domain),
    subject: cleanString(row.subject),
    horizon: cleanString(row.horizon),
    mode: cleanString(row.mode),
    status: cleanString(row.status),
    reason: cleanString(row.reason),
    error: cleanString(row.error),
    input: parseJson(row.input_json, {}) || {},
    candidates: asArray(parseJson(row.candidate_json, []) || []),
    executions: asArray(parseJson(row.execution_json, []) || []),
    summary: parseJson(row.summary_json, {}) || {},
    createdBy: cleanString(row.created_by),
    executedBy: cleanString(row.executed_by),
    privacyClass: cleanString(row.privacy_class),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function createLearningAutomationSchedulerRunRepository({ open, now } = {}) {
  const clock = typeof now === "function" ? now : () => new Date();

  function withDb(readOnly, callback) {
    const db = open(readOnly);
    try {
      return callback(db);
    } finally {
      db.close();
    }
  }

  function ensureSchema() {
    return withDb(false, (db) => {
      ensureLearningAutomationSchedulerRunSchema(db);
      return { ok: true, table: "learning_growth_automation_scheduler_runs" };
    });
  }

  function recordRun(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationSchedulerRunSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      if (privacyFindings.length) {
        return { ok: false, error: "learning_automation_scheduler_run_privacy_failed", privacyFindings };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const mode = cleanString(input.mode || input.runMode || input.run_mode || "background_supervised_tick") || "background_supervised_tick";
      const status = cleanString(input.status || "started").toLowerCase();
      if (!workspaceId) return { ok: false, error: "learning_automation_scheduler_run_scope_required" };
      const allowedStatuses = new Set(["started", "completed", "partial", "failed", "blocked", "skipped"]);
      if (!allowedStatuses.has(status)) {
        return { ok: false, error: "learning_automation_scheduler_run_status_invalid" };
      }
      const privacyClass = cleanString(input.privacyClass || input.privacy_class || "summary_only") || "summary_only";
      if (privacyClass !== "summary_only") {
        return { ok: false, error: "learning_automation_scheduler_run_privacy_class_required" };
      }
      const timestamp = cleanString(input.updatedAt || input.updated_at || input.createdAt || input.created_at) || clock().toISOString();
      const runId = stableLearningAutomationSchedulerRunId(Object.assign({}, input, {
        workspaceId,
        mode,
        createdAt: cleanString(input.createdAt || input.created_at) || timestamp
      }));
      const existing = db.prepare(`
        SELECT * FROM learning_growth_automation_scheduler_runs
        WHERE run_id = ?
      `).get(runId);
      const row = {
        run_id: runId,
        workspace_id: workspaceId,
        learner_id: cleanString(input.learnerId || input.learner_id || workspaceId),
        program_id: cleanString(input.programId || input.program_id),
        domain_pack_id: cleanString(input.domainPackId || input.domain_pack_id),
        domain: cleanString(input.domain),
        subject: cleanString(input.subject),
        horizon: cleanString(input.horizon || "daily_plan") || "daily_plan",
        mode,
        status,
        reason: boundedText(input.reason, 240),
        error: boundedText(input.error, 240),
        input_json: jsonText(input.input || {}),
        candidate_json: jsonText(asArray(input.candidates)),
        execution_json: jsonText(asArray(input.executions)),
        summary_json: jsonText(input.summary || {}),
        created_by: cleanString(input.createdBy || input.created_by || input.requestedBy || input.requested_by),
        executed_by: cleanString(input.executedBy || input.executed_by || input.requestedBy || input.requested_by),
        privacy_class: privacyClass,
        created_at: cleanString(input.createdAt || input.created_at) || timestamp,
        updated_at: timestamp
      };
      if (existing) {
        db.prepare(`
          UPDATE learning_growth_automation_scheduler_runs
          SET status = ?,
            reason = ?,
            error = ?,
            input_json = ?,
            candidate_json = ?,
            execution_json = ?,
            summary_json = ?,
            executed_by = ?,
            updated_at = ?
          WHERE run_id = ?
        `).run(
          row.status,
          row.reason,
          row.error,
          row.input_json,
          row.candidate_json,
          row.execution_json,
          row.summary_json,
          row.executed_by,
          row.updated_at,
          runId
        );
      } else {
        insertDynamic(db, "learning_growth_automation_scheduler_runs", row);
      }
      return {
        ok: true,
        duplicate: Boolean(existing && cleanString(existing.status) === status),
        run: publicAutomationSchedulerRun(db.prepare(`
          SELECT * FROM learning_growth_automation_scheduler_runs
          WHERE run_id = ?
        `).get(runId))
      };
    });
  }

  function getRun(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_scheduler_runs")) return null;
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const runId = cleanString(input.runId || input.run_id);
      if (!workspaceId || !runId) return null;
      return publicAutomationSchedulerRun(db.prepare(`
        SELECT * FROM learning_growth_automation_scheduler_runs
        WHERE workspace_id = ? AND run_id = ?
      `).get(workspaceId, runId));
    });
  }

  function listRuns(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_scheduler_runs")) return [];
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id);
      const programId = cleanString(input.programId || input.program_id);
      const domainPackId = cleanString(input.domainPackId || input.domain_pack_id);
      const domain = cleanString(input.domain);
      const subject = cleanString(input.subject);
      const horizon = cleanString(input.horizon);
      const status = cleanString(input.status);
      const where = [];
      const values = [];
      if (workspaceId) {
        where.push("workspace_id = ?");
        values.push(workspaceId);
      }
      if (learnerId) {
        where.push("learner_id = ?");
        values.push(learnerId);
      }
      if (programId) {
        where.push("program_id = ?");
        values.push(programId);
      }
      if (domainPackId) {
        where.push("domain_pack_id = ?");
        values.push(domainPackId);
      }
      if (domain) {
        where.push("domain = ?");
        values.push(domain);
      }
      if (subject) {
        where.push("subject = ?");
        values.push(subject);
      }
      if (horizon) {
        where.push("horizon = ?");
        values.push(horizon);
      }
      if (status) {
        where.push("status = ?");
        values.push(status);
      }
      const limit = Math.max(1, Math.min(100, Number(input.limit || 20) || 20));
      return db.prepare(`
        SELECT * FROM learning_growth_automation_scheduler_runs
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, run_id DESC
        LIMIT ?
      `).all(...values, limit).map(publicAutomationSchedulerRun).filter(Boolean);
    });
  }

  return {
    ensureSchema,
    getRun,
    listRuns,
    recordRun
  };
}

module.exports = {
  createLearningAutomationSchedulerRunRepository,
  ensureLearningAutomationSchedulerRunSchema,
  publicAutomationSchedulerRun
};
