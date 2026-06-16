"use strict";

const {
  asArray,
  cleanString,
  insertDynamic,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");
const { stableLearningAutomationDigestId } = require("./identifiers");

const PRIVATE_KEY_PATTERN = /(raw.*answer|answer.*key|transcript|raw.*prompt|prompt.*raw|hidden.*prompt|system.*prompt|developer.*prompt|model.*prompt|secret|token|cookie|password|private.*path|provider.*config|raw.*model|model.*raw|source.*document|source.*body)/i;
const PRIVATE_VALUE_PATTERN = /(\/Users\/|[A-Z]:\\Users\\|\\Users\\|\.homeai-qa|\.hermes-growth|Bearer\s+|Authorization:|access-key\.txt|launch-token)/i;

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function boundedText(value, max = 360) {
  const text = cleanString(value);
  return text.length > max ? text.slice(0, max) : text;
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
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
    if (PRIVATE_KEY_PATTERN.test(key)) findings.push(childPath);
    scanPrivacyKeys(child, childPath, findings);
  }
  return findings;
}

function ensureLearningAutomationDigestSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_automation_digests (
      digest_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      domain_pack_id TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      horizon TEXT NOT NULL DEFAULT 'daily_plan',
      status TEXT NOT NULL DEFAULT 'pending',
      source_policy_json TEXT NOT NULL DEFAULT '{}',
      summary_json TEXT NOT NULL DEFAULT '{}',
      candidates_json TEXT NOT NULL DEFAULT '[]',
      blocked_json TEXT NOT NULL DEFAULT '[]',
      required_actions_json TEXT NOT NULL DEFAULT '[]',
      review_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL DEFAULT '',
      reviewed_by TEXT NOT NULL DEFAULT '',
      reviewed_at TEXT NOT NULL DEFAULT '',
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_digests_target
      ON learning_growth_automation_digests(workspace_id, learner_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_digests_scope
      ON learning_growth_automation_digests(workspace_id, program_id, domain_pack_id, subject, updated_at);
  `);
  const columns = new Set(tableColumns(db, "learning_growth_automation_digests"));
  [
    ["review_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["reviewed_by", "TEXT NOT NULL DEFAULT ''"],
    ["reviewed_at", "TEXT NOT NULL DEFAULT ''"]
  ].forEach(([name, definition]) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE learning_growth_automation_digests ADD COLUMN ${name} ${definition}`);
  });
}

function publicAutomationDigest(row) {
  if (!row) return null;
  return {
    digestId: cleanString(row.digest_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    domainPackId: cleanString(row.domain_pack_id),
    domain: cleanString(row.domain),
    subject: cleanString(row.subject),
    horizon: cleanString(row.horizon),
    status: cleanString(row.status),
    sourcePolicy: parseJson(row.source_policy_json, {}) || {},
    summary: parseJson(row.summary_json, {}) || {},
    candidates: asArray(parseJson(row.candidates_json, []) || []),
    blocked: asArray(parseJson(row.blocked_json, []) || []),
    requiredActions: asArray(parseJson(row.required_actions_json, []) || []),
    review: parseJson(row.review_json, {}) || {},
    createdBy: cleanString(row.created_by),
    reviewedBy: cleanString(row.reviewed_by),
    reviewedAt: cleanString(row.reviewed_at),
    privacyClass: cleanString(row.privacy_class),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function candidateKeys(candidates = []) {
  return asArray(candidates).map((candidate = {}) => [
    cleanString(candidate.proposalId),
    cleanString(candidate.planDraftId),
    cleanString(candidate.selectedItemId),
    cleanString(candidate.decision)
  ].join(":"));
}

function createLearningAutomationDigestRepository({ open, now } = {}) {
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
      ensureLearningAutomationDigestSchema(db);
      return { ok: true, table: "learning_growth_automation_digests" };
    });
  }

  function saveDigest(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationDigestSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      if (privacyFindings.length) {
        return { ok: false, error: "learning_automation_digest_privacy_failed", privacyFindings };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
      const horizon = cleanString(input.horizon || "daily_plan") || "daily_plan";
      if (!workspaceId || !horizon) {
        return { ok: false, error: "learning_automation_digest_scope_required" };
      }
      const privacyClass = cleanString(input.privacyClass || input.privacy_class || "summary_only") || "summary_only";
      if (privacyClass !== "summary_only") {
        return { ok: false, error: "learning_automation_digest_privacy_class_required" };
      }
      const candidates = asArray(input.candidates);
      const blocked = asArray(input.blocked);
      const requiredActions = asArray(input.requiredActions || input.required_actions);
      const sourcePolicy = input.sourcePolicy || input.source_policy || {};
      const digestId = stableLearningAutomationDigestId(Object.assign({}, input, {
        workspaceId,
        learnerId,
        horizon,
        sourcePolicy,
        candidateKeys: candidateKeys(candidates)
      }));
      const existing = db.prepare("SELECT * FROM learning_growth_automation_digests WHERE digest_id = ?").get(digestId);
      if (existing) return { ok: true, duplicate: true, digest: publicAutomationDigest(existing) };
      const timestamp = cleanString(input.createdAt || input.created_at) || clock().toISOString();
      insertDynamic(db, "learning_growth_automation_digests", {
        digest_id: digestId,
        workspace_id: workspaceId,
        learner_id: learnerId,
        program_id: cleanString(input.programId || input.program_id),
        domain_pack_id: cleanString(input.domainPackId || input.domain_pack_id),
        domain: cleanString(input.domain),
        subject: cleanString(input.subject),
        horizon,
        status: cleanString(input.status || "pending") || "pending",
        source_policy_json: jsonText(sourcePolicy),
        summary_json: jsonText(input.summary || {}),
        candidates_json: jsonText(candidates),
        blocked_json: jsonText(blocked),
        required_actions_json: jsonText(requiredActions),
        review_json: jsonText(input.review || {}),
        created_by: cleanString(input.createdBy || input.created_by),
        reviewed_by: cleanString(input.reviewedBy || input.reviewed_by),
        reviewed_at: cleanString(input.reviewedAt || input.reviewed_at),
        privacy_class: privacyClass,
        created_at: timestamp,
        updated_at: cleanString(input.updatedAt || input.updated_at) || timestamp
      });
      return {
        ok: true,
        duplicate: false,
        digest: publicAutomationDigest(db.prepare("SELECT * FROM learning_growth_automation_digests WHERE digest_id = ?").get(digestId))
      };
    });
  }

  function getDigest(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_digests")) return null;
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const digestId = cleanString(input.digestId || input.digest_id);
      if (!workspaceId || !digestId) return null;
      return publicAutomationDigest(db.prepare(`
        SELECT * FROM learning_growth_automation_digests
        WHERE workspace_id = ? AND digest_id = ?
      `).get(workspaceId, digestId));
    });
  }

  function listDigests(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_digests")) return [];
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id);
      const programId = cleanString(input.programId || input.program_id);
      const status = cleanString(input.status);
      const domainPackId = cleanString(input.domainPackId || input.domain_pack_id);
      const subject = cleanString(input.subject);
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
      if (status) {
        where.push("status = ?");
        values.push(status);
      }
      if (domainPackId) {
        where.push("domain_pack_id = ?");
        values.push(domainPackId);
      }
      if (subject) {
        where.push("subject = ?");
        values.push(subject);
      }
      const limit = Math.max(1, Math.min(100, Number(input.limit || 20) || 20));
      return db.prepare(`
        SELECT * FROM learning_growth_automation_digests
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, digest_id DESC
        LIMIT ?
      `).all(...values, limit).map(publicAutomationDigest).filter(Boolean);
    });
  }

  function reviewDigest(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationDigestSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      if (privacyFindings.length) {
        return { ok: false, error: "learning_automation_digest_privacy_failed", privacyFindings };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const digestId = cleanString(input.digestId || input.digest_id);
      const status = cleanString(input.status || input.reviewAction || input.review_action || input.action).toLowerCase();
      if (!workspaceId || !digestId) {
        return { ok: false, error: "learning_automation_digest_scope_required" };
      }
      const allowedStatuses = new Set(["reviewed", "archived", "superseded"]);
      if (!allowedStatuses.has(status)) {
        return { ok: false, error: "learning_automation_digest_status_invalid" };
      }
      const existing = db.prepare(`
        SELECT * FROM learning_growth_automation_digests
        WHERE workspace_id = ? AND digest_id = ?
      `).get(workspaceId, digestId);
      if (!existing) return { ok: false, error: "learning_automation_digest_not_found" };
      const existingStatus = cleanString(existing.status);
      if (existingStatus && existingStatus !== "pending") {
        return {
          ok: existingStatus === status,
          duplicate: existingStatus === status,
          error: existingStatus === status ? "" : "learning_automation_digest_already_reviewed",
          digest: publicAutomationDigest(existing)
        };
      }
      const reviewedAt = cleanString(input.reviewedAt || input.reviewed_at) || clock().toISOString();
      const reviewedBy = cleanString(input.reviewedBy || input.reviewed_by || input.requestedBy || input.requested_by);
      const review = {
        schemaVersion: "growth.learningAutomationDigest.review.v1",
        summaryOnly: true,
        status,
        selectedCandidateIds: uniqueStrings(input.selectedCandidateIds || input.selected_candidate_ids),
        note: boundedText(input.note || input.reason || input.summary, 360),
        reviewedBy,
        reviewedAt
      };
      db.prepare(`
        UPDATE learning_growth_automation_digests
        SET status = ?,
          review_json = ?,
          reviewed_by = ?,
          reviewed_at = ?,
          updated_at = ?
        WHERE workspace_id = ? AND digest_id = ?
      `).run(status, jsonText(review), reviewedBy, reviewedAt, reviewedAt, workspaceId, digestId);
      return {
        ok: true,
        duplicate: false,
        digest: publicAutomationDigest(db.prepare("SELECT * FROM learning_growth_automation_digests WHERE digest_id = ?").get(digestId))
      };
    });
  }

  return {
    ensureSchema,
    getDigest,
    listDigests,
    reviewDigest,
    saveDigest
  };
}

module.exports = {
  createLearningAutomationDigestRepository,
  ensureLearningAutomationDigestSchema,
  publicAutomationDigest
};
