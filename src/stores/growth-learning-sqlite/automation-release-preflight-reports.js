"use strict";

const {
  asArray,
  cleanString,
  insertDynamic,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");
const {
  stableLearningAutomationReleasePreflightReportId
} = require("./identifiers");

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body|access.*token|api.*key|authorization)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|access-key\.txt|launch-token)/i;

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
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
    if (typeof child === "string" && PRIVATE_VALUE_PATTERN.test(child)) findings.push(childPath);
    if (child && typeof child === "object") scanPrivacyKeys(child, childPath, findings);
  }
  return findings;
}

function ensureLearningAutomationReleasePreflightReportsSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_automation_release_preflight_reports (
      preflight_report_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      domain_pack_id TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      horizon TEXT NOT NULL DEFAULT 'daily_plan',
      collection_run_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'blocked',
      preflight_version TEXT NOT NULL DEFAULT 'growth.learningAutomationReleasePreflight.v1',
      summary_json TEXT NOT NULL DEFAULT '{}',
      release_preflight_json TEXT NOT NULL DEFAULT '{}',
      release_dashboard_json TEXT NOT NULL DEFAULT '{}',
      release_workbench_json TEXT NOT NULL DEFAULT '{}',
      release_closure_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL DEFAULT '',
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const columns = new Set(tableColumns(db, "learning_growth_automation_release_preflight_reports"));
  [
    ["program_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain_pack_id", "TEXT NOT NULL DEFAULT ''"],
    ["domain", "TEXT NOT NULL DEFAULT ''"],
    ["subject", "TEXT NOT NULL DEFAULT ''"],
    ["horizon", "TEXT NOT NULL DEFAULT 'daily_plan'"],
    ["collection_run_id", "TEXT NOT NULL DEFAULT ''"],
    ["preflight_version", "TEXT NOT NULL DEFAULT 'growth.learningAutomationReleasePreflight.v1'"],
    ["summary_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["release_preflight_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["release_dashboard_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["release_workbench_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["release_closure_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["created_by", "TEXT NOT NULL DEFAULT ''"]
  ].forEach(([name, definition]) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE learning_growth_automation_release_preflight_reports ADD COLUMN ${name} ${definition}`);
  });
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_release_preflight_reports_target
      ON learning_growth_automation_release_preflight_reports(workspace_id, learner_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_release_preflight_reports_scope
      ON learning_growth_automation_release_preflight_reports(workspace_id, program_id, domain_pack_id, subject, horizon, updated_at);
  `);
}

function publicAutomationReleasePreflightReport(row) {
  if (!row) return null;
  return {
    preflightReportId: cleanString(row.preflight_report_id),
    reportId: cleanString(row.preflight_report_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    domainPackId: cleanString(row.domain_pack_id),
    domain: cleanString(row.domain),
    subject: cleanString(row.subject),
    horizon: cleanString(row.horizon),
    collectionRunId: cleanString(row.collection_run_id),
    status: cleanString(row.status),
    preflightVersion: cleanString(row.preflight_version),
    summary: parseJson(row.summary_json, {}) || {},
    releasePreflight: parseJson(row.release_preflight_json, {}) || {},
    releaseDashboard: parseJson(row.release_dashboard_json, {}) || {},
    releaseWorkbench: parseJson(row.release_workbench_json, {}) || {},
    releaseClosure: parseJson(row.release_closure_json, {}) || {},
    createdBy: cleanString(row.created_by),
    privacyClass: cleanString(row.privacy_class),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function createLearningAutomationReleasePreflightReportRepository({ open, now } = {}) {
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
      ensureLearningAutomationReleasePreflightReportsSchema(db);
      return { ok: true, table: "learning_growth_automation_release_preflight_reports" };
    });
  }

  function recordReport(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationReleasePreflightReportsSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      if (privacyFindings.length) {
        return { ok: false, error: "learning_automation_release_preflight_report_privacy_failed", privacyFindings };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
      if (!workspaceId) return { ok: false, error: "learning_automation_release_preflight_report_scope_required" };
      const privacyClass = cleanString(input.privacyClass || input.privacy_class || "summary_only") || "summary_only";
      if (privacyClass !== "summary_only") {
        return { ok: false, error: "learning_automation_release_preflight_report_privacy_class_required" };
      }
      const status = cleanString(input.status || input.releasePreflight?.status || "blocked").toLowerCase();
      if (![
        "approved",
        "ready_for_owner_release_activation",
        "ready_for_release_review",
        "ready_for_owner_decision",
        "manual_runtime_config_required",
        "release_activation_required",
        "release_approval_required",
        "release_evidence_required",
        "release_review_incomplete",
        "approval_required",
        "authorization_blocked",
        "collection_run_required",
        "owner_decision_required",
        "runtime_verified",
        "incomplete",
        "blocked"
      ].includes(status)) {
        return { ok: false, error: "learning_automation_release_preflight_report_status_invalid" };
      }
      const timestamp = cleanString(input.createdAt || input.created_at) || clock().toISOString();
      const releasePreflight = input.releasePreflight || input.release_preflight || {};
      const preflightReportId = stableLearningAutomationReleasePreflightReportId(Object.assign({}, input, {
        workspaceId,
        learnerId,
        status,
        createdAt: timestamp,
        summary: input.summary || releasePreflight
      }));
      const existing = db.prepare("SELECT * FROM learning_growth_automation_release_preflight_reports WHERE preflight_report_id = ?").get(preflightReportId);
      if (existing) return { ok: true, duplicate: true, report: publicAutomationReleasePreflightReport(existing) };
      insertDynamic(db, "learning_growth_automation_release_preflight_reports", {
        preflight_report_id: preflightReportId,
        workspace_id: workspaceId,
        learner_id: learnerId,
        program_id: cleanString(input.programId || input.program_id),
        domain_pack_id: cleanString(input.domainPackId || input.domain_pack_id),
        domain: cleanString(input.domain),
        subject: cleanString(input.subject),
        horizon: cleanString(input.horizon || "daily_plan") || "daily_plan",
        collection_run_id: cleanString(input.collectionRunId || input.collection_run_id || input.runId || input.run_id),
        status,
        preflight_version: cleanString(input.preflightVersion || input.preflight_version || "growth.learningAutomationReleasePreflight.v1") || "growth.learningAutomationReleasePreflight.v1",
        summary_json: jsonText(input.summary || {}),
        release_preflight_json: jsonText(releasePreflight),
        release_dashboard_json: jsonText(input.releaseDashboard || input.release_dashboard || {}),
        release_workbench_json: jsonText(input.releaseWorkbench || input.release_workbench || {}),
        release_closure_json: jsonText(input.releaseClosure || input.release_closure || {}),
        created_by: cleanString(input.createdBy || input.created_by || input.requestedBy || input.requested_by),
        privacy_class: privacyClass,
        created_at: timestamp,
        updated_at: cleanString(input.updatedAt || input.updated_at) || timestamp
      });
      return {
        ok: true,
        duplicate: false,
        report: publicAutomationReleasePreflightReport(db.prepare("SELECT * FROM learning_growth_automation_release_preflight_reports WHERE preflight_report_id = ?").get(preflightReportId))
      };
    });
  }

  function listReports(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_release_preflight_reports")) return [];
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id);
      const programId = cleanString(input.programId || input.program_id);
      const domainPackId = cleanString(input.domainPackId || input.domain_pack_id);
      const domain = cleanString(input.domain);
      const subject = cleanString(input.subject);
      const horizon = cleanString(input.horizon);
      const collectionRunId = cleanString(input.collectionRunId || input.collection_run_id || input.runId || input.run_id);
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
      if (collectionRunId) {
        where.push("collection_run_id = ?");
        values.push(collectionRunId);
      }
      if (status) {
        where.push("status = ?");
        values.push(status);
      }
      const limit = Math.max(1, Math.min(100, Number(input.limit || 20) || 20));
      return db.prepare(`
        SELECT * FROM learning_growth_automation_release_preflight_reports
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, preflight_report_id DESC
        LIMIT ?
      `).all(...values, limit).map(publicAutomationReleasePreflightReport).filter(Boolean);
    });
  }

  return {
    ensureSchema,
    listReports,
    recordReport
  };
}

module.exports = {
  createLearningAutomationReleasePreflightReportRepository,
  ensureLearningAutomationReleasePreflightReportsSchema,
  publicAutomationReleasePreflightReport
};
