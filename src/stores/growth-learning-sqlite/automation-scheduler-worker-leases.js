"use strict";

const {
  cleanString,
  insertDynamic,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");
const { stableLearningAutomationSchedulerWorkerLeaseId } = require("./identifiers");

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|X-Hermes-Web-Key|X-Hermes-Access-Key|access-key\.txt|launch-token)/i;
const INTERNAL_LEASE_KEYS = new Set(["leaseToken", "lease_token"]);

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function boundedText(value, max = 360) {
  const text = cleanString(value);
  return text.length > max ? text.slice(0, max) : text;
}

function scanPrivacyKeys(value, path = "$", findings = []) {
  if (typeof value === "string") {
    if (PRIVATE_VALUE_PATTERN.test(value)) findings.push(path);
    return findings;
  }
  if (!value || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacyKeys(item, `${path}[${index}]`, findings));
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (!INTERNAL_LEASE_KEYS.has(key) && PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    scanPrivacyKeys(child, childPath, findings);
  }
  return findings;
}

function ensureLearningAutomationSchedulerWorkerLeaseSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_automation_scheduler_worker_leases (
      lease_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      domain_pack_id TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      horizon TEXT NOT NULL DEFAULT 'daily_plan',
      worker_id TEXT NOT NULL DEFAULT '',
      lease_token TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'claimed',
      reason TEXT NOT NULL DEFAULT '',
      error TEXT NOT NULL DEFAULT '',
      run_id TEXT NOT NULL DEFAULT '',
      run_status TEXT NOT NULL DEFAULT '',
      input_json TEXT NOT NULL DEFAULT '{}',
      summary_json TEXT NOT NULL DEFAULT '{}',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      claimed_at TEXT NOT NULL DEFAULT '',
      lease_until TEXT NOT NULL DEFAULT '',
      heartbeat_at TEXT NOT NULL DEFAULT '',
      released_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const columns = new Set(tableColumns(db, "learning_growth_automation_scheduler_worker_leases"));
  [
    ["domain_pack_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain", "TEXT NOT NULL DEFAULT ''"],
    ["subject", "TEXT NOT NULL DEFAULT ''"],
    ["horizon", "TEXT NOT NULL DEFAULT 'daily_plan'"],
    ["worker_id", "TEXT NOT NULL DEFAULT ''"],
    ["lease_token", "TEXT NOT NULL DEFAULT ''"],
    ["reason", "TEXT NOT NULL DEFAULT ''"],
    ["error", "TEXT NOT NULL DEFAULT ''"],
    ["run_id", "TEXT NOT NULL DEFAULT ''"],
    ["run_status", "TEXT NOT NULL DEFAULT ''"],
    ["input_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["summary_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["attempt_count", "INTEGER NOT NULL DEFAULT 0"],
    ["claimed_at", "TEXT NOT NULL DEFAULT ''"],
    ["lease_until", "TEXT NOT NULL DEFAULT ''"],
    ["heartbeat_at", "TEXT NOT NULL DEFAULT ''"],
    ["released_at", "TEXT NOT NULL DEFAULT ''"]
  ].forEach(([name, definition]) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE learning_growth_automation_scheduler_worker_leases ADD COLUMN ${name} ${definition}`);
  });
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_scheduler_worker_leases_target
      ON learning_growth_automation_scheduler_worker_leases(workspace_id, learner_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_scheduler_worker_leases_scope
      ON learning_growth_automation_scheduler_worker_leases(workspace_id, domain_pack_id, subject, lease_until);
  `);
}

function publicAutomationSchedulerWorkerLease(row) {
  if (!row) return null;
  return {
    leaseId: cleanString(row.lease_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    domainPackId: cleanString(row.domain_pack_id),
    domain: cleanString(row.domain),
    subject: cleanString(row.subject),
    horizon: cleanString(row.horizon),
    workerId: cleanString(row.worker_id),
    status: cleanString(row.status),
    reason: cleanString(row.reason),
    error: cleanString(row.error),
    runId: cleanString(row.run_id),
    runStatus: cleanString(row.run_status),
    input: parseJson(row.input_json, {}) || {},
    summary: parseJson(row.summary_json, {}) || {},
    attemptCount: Number(row.attempt_count || 0),
    privacyClass: cleanString(row.privacy_class),
    claimedAt: cleanString(row.claimed_at),
    leaseUntil: cleanString(row.lease_until),
    heartbeatAt: cleanString(row.heartbeat_at),
    releasedAt: cleanString(row.released_at),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function createLearningAutomationSchedulerWorkerLeaseRepository({ open, now } = {}) {
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
      ensureLearningAutomationSchedulerWorkerLeaseSchema(db);
      return { ok: true, table: "learning_growth_automation_scheduler_worker_leases" };
    });
  }

  function leaseRow(db, leaseId) {
    return db.prepare(`
      SELECT * FROM learning_growth_automation_scheduler_worker_leases
      WHERE lease_id = ?
    `).get(cleanString(leaseId));
  }

  function claimLease(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationSchedulerWorkerLeaseSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      if (privacyFindings.length) {
        return { ok: false, error: "learning_automation_scheduler_worker_lease_privacy_failed", privacyFindings };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const workerId = cleanString(input.workerId || input.worker_id);
      if (!workspaceId) return { ok: false, error: "learning_automation_scheduler_worker_lease_scope_required" };
      if (!workerId) return { ok: false, error: "learning_automation_scheduler_worker_lease_worker_required" };
      const privacyClass = cleanString(input.privacyClass || input.privacy_class || "summary_only") || "summary_only";
      if (privacyClass !== "summary_only") {
        return { ok: false, error: "learning_automation_scheduler_worker_lease_privacy_class_required" };
      }
      const nowText = cleanString(input.claimedAt || input.claimed_at || input.now) || clock().toISOString();
      const leaseUntil = cleanString(input.leaseUntil || input.lease_until) || new Date(Date.parse(nowText) + Math.max(1000, Number(input.leaseMs || input.lease_ms || 10 * 60 * 1000) || 10 * 60 * 1000)).toISOString();
      const leaseToken = cleanString(input.leaseToken || input.lease_token);
      if (!leaseToken) return { ok: false, error: "learning_automation_scheduler_worker_lease_token_required" };
      const leaseId = stableLearningAutomationSchedulerWorkerLeaseId(Object.assign({}, input, { workspaceId }));
      const existing = leaseRow(db, leaseId);
      const existingActive = existing
        && cleanString(existing.status) === "claimed"
        && cleanString(existing.lease_until)
        && Date.parse(existing.lease_until) > Date.parse(nowText);
      if (existingActive) {
        return {
          ok: false,
          error: "learning_automation_scheduler_worker_lease_active",
          active: true,
          lease: publicAutomationSchedulerWorkerLease(existing)
        };
      }
      const attemptCount = Number(existing?.attempt_count || 0) + 1;
      const row = {
        lease_id: leaseId,
        workspace_id: workspaceId,
        learner_id: cleanString(input.learnerId || input.learner_id || workspaceId),
        program_id: cleanString(input.programId || input.program_id),
        domain_pack_id: cleanString(input.domainPackId || input.domain_pack_id),
        domain: cleanString(input.domain),
        subject: cleanString(input.subject),
        horizon: cleanString(input.horizon || "daily_plan") || "daily_plan",
        worker_id: workerId,
        lease_token: leaseToken,
        status: "claimed",
        reason: boundedText(input.reason || "scheduler_worker_lease_claimed", 240),
        error: "",
        run_id: "",
        run_status: "",
        input_json: jsonText(input.input || {}),
        summary_json: jsonText(input.summary || {}),
        attempt_count: attemptCount,
        privacy_class: privacyClass,
        claimed_at: nowText,
        lease_until: leaseUntil,
        heartbeat_at: nowText,
        released_at: "",
        created_at: cleanString(existing?.created_at) || nowText,
        updated_at: nowText
      };
      if (existing) {
        db.prepare(`
          UPDATE learning_growth_automation_scheduler_worker_leases
          SET worker_id = ?,
            lease_token = ?,
            status = ?,
            reason = ?,
            error = ?,
            run_id = '',
            run_status = '',
            input_json = ?,
            summary_json = ?,
            attempt_count = ?,
            privacy_class = ?,
            claimed_at = ?,
            lease_until = ?,
            heartbeat_at = ?,
            released_at = '',
            updated_at = ?
          WHERE lease_id = ?
        `).run(
          row.worker_id,
          row.lease_token,
          row.status,
          row.reason,
          row.error,
          row.input_json,
          row.summary_json,
          row.attempt_count,
          row.privacy_class,
          row.claimed_at,
          row.lease_until,
          row.heartbeat_at,
          row.updated_at,
          leaseId
        );
      } else {
        insertDynamic(db, "learning_growth_automation_scheduler_worker_leases", row);
      }
      return {
        ok: true,
        reclaimed: Boolean(existing),
        lease: publicAutomationSchedulerWorkerLease(leaseRow(db, leaseId))
      };
    });
  }

  function releaseLease(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationSchedulerWorkerLeaseSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      if (privacyFindings.length) {
        return { ok: false, error: "learning_automation_scheduler_worker_lease_privacy_failed", privacyFindings };
      }
      const leaseId = cleanString(input.leaseId || input.lease_id);
      const leaseToken = cleanString(input.leaseToken || input.lease_token);
      if (!leaseId || !leaseToken) return { ok: false, error: "learning_automation_scheduler_worker_lease_release_scope_required" };
      const status = cleanString(input.status || "released").toLowerCase();
      if (!["released", "failed", "blocked"].includes(status)) {
        return { ok: false, error: "learning_automation_scheduler_worker_lease_status_invalid" };
      }
      const nowText = cleanString(input.releasedAt || input.released_at || input.now) || clock().toISOString();
      const result = db.prepare(`
        UPDATE learning_growth_automation_scheduler_worker_leases
        SET status = ?,
          reason = ?,
          error = ?,
          run_id = ?,
          run_status = ?,
          summary_json = ?,
          heartbeat_at = ?,
          released_at = ?,
          updated_at = ?
        WHERE lease_id = ?
          AND lease_token = ?
          AND status = 'claimed'
      `).run(
        status,
        boundedText(input.reason || "scheduler_worker_lease_released", 240),
        boundedText(input.error, 240),
        cleanString(input.runId || input.run_id),
        cleanString(input.runStatus || input.run_status),
        jsonText(input.summary || {}),
        nowText,
        nowText,
        nowText,
        leaseId,
        leaseToken
      );
      const lease = publicAutomationSchedulerWorkerLease(leaseRow(db, leaseId));
      if (!result.changes) {
        return { ok: false, error: "learning_automation_scheduler_worker_lease_release_conflict", lease };
      }
      return { ok: true, lease };
    });
  }

  function getLease(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_scheduler_worker_leases")) return null;
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const leaseId = cleanString(input.leaseId || input.lease_id);
      if (!workspaceId || !leaseId) return null;
      return publicAutomationSchedulerWorkerLease(db.prepare(`
        SELECT * FROM learning_growth_automation_scheduler_worker_leases
        WHERE workspace_id = ? AND lease_id = ?
      `).get(workspaceId, leaseId));
    });
  }

  function listLeases(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_scheduler_worker_leases")) return [];
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id);
      const programId = cleanString(input.programId || input.program_id);
      const domainPackId = cleanString(input.domainPackId || input.domain_pack_id);
      const subject = cleanString(input.subject);
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
      if (subject) {
        where.push("subject = ?");
        values.push(subject);
      }
      if (status) {
        where.push("status = ?");
        values.push(status);
      }
      const limit = Math.max(1, Math.min(100, Number(input.limit || 20) || 20));
      return db.prepare(`
        SELECT * FROM learning_growth_automation_scheduler_worker_leases
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, created_at DESC
        LIMIT ?
      `).all(...values, limit).map(publicAutomationSchedulerWorkerLease);
    });
  }

  return {
    ensureSchema,
    claimLease,
    releaseLease,
    getLease,
    listLeases
  };
}

module.exports = {
  createLearningAutomationSchedulerWorkerLeaseRepository,
  ensureLearningAutomationSchedulerWorkerLeaseSchema,
  publicAutomationSchedulerWorkerLease
};
