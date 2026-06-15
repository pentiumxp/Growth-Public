"use strict";

const {
  asArray,
  cleanString,
  insertDynamic,
  parseJson,
  tableExists
} = require("./core");
const { stableDomainPackProvisionId } = require("./identifiers");

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

function ensureDomainPackProvisionSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_domain_pack_provisions (
      provision_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      domain_pack_id TEXT NOT NULL,
      domain TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      source TEXT NOT NULL DEFAULT 'owner',
      policy_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_learning_growth_domain_pack_provisions_target
      ON learning_growth_domain_pack_provisions(workspace_id, learner_id, status, domain_pack_id, subject);
  `);
}

function publicProvision(row) {
  if (!row) return null;
  return {
    provisionId: cleanString(row.provision_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    domainPackId: cleanString(row.domain_pack_id),
    domain: cleanString(row.domain),
    subject: cleanString(row.subject),
    status: cleanString(row.status),
    source: cleanString(row.source),
    policy: parseJson(row.policy_json, {}) || {},
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function createDomainPackProvisionRepository({ open, now } = {}) {
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
      ensureDomainPackProvisionSchema(db);
      return { ok: true, table: "learning_growth_domain_pack_provisions" };
    });
  }

  function upsertProvision(input = {}) {
    return withDb(false, (db) => {
      ensureDomainPackProvisionSchema(db);
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
      const domainPackId = cleanString(input.domainPackId || input.domain_pack_id);
      if (!workspaceId || !domainPackId) return { ok: false, error: "domain_pack_provision_scope_required" };
      const status = cleanString(input.status || "active") || "active";
      const timestamp = cleanString(input.updatedAt || input.updated_at) || clock().toISOString();
      const provisionId = stableDomainPackProvisionId(Object.assign({}, input, {
        workspaceId,
        learnerId,
        domainPackId,
        subject: cleanString(input.subject)
      }));
      const existing = db.prepare("SELECT * FROM learning_growth_domain_pack_provisions WHERE provision_id = ?").get(provisionId);
      if (existing) {
        db.prepare(`
          UPDATE learning_growth_domain_pack_provisions
          SET learner_id = ?,
              program_id = ?,
              domain = ?,
              subject = ?,
              status = ?,
              source = ?,
              policy_json = ?,
              updated_at = ?
          WHERE provision_id = ?
        `).run(
          learnerId,
          cleanString(input.programId || input.program_id),
          cleanString(input.domain),
          cleanString(input.subject),
          status,
          cleanString(input.source || "owner"),
          jsonText(input.policy || {}),
          timestamp,
          provisionId
        );
      } else {
        insertDynamic(db, "learning_growth_domain_pack_provisions", {
          provision_id: provisionId,
          workspace_id: workspaceId,
          learner_id: learnerId,
          program_id: cleanString(input.programId || input.program_id),
          domain_pack_id: domainPackId,
          domain: cleanString(input.domain),
          subject: cleanString(input.subject),
          status,
          source: cleanString(input.source || "owner"),
          policy_json: jsonText(input.policy || {}),
          created_at: cleanString(input.createdAt || input.created_at) || timestamp,
          updated_at: timestamp
        });
      }
      return {
        ok: true,
        duplicate: Boolean(existing),
        provision: publicProvision(db.prepare("SELECT * FROM learning_growth_domain_pack_provisions WHERE provision_id = ?").get(provisionId))
      };
    });
  }

  function listProvisions(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_domain_pack_provisions")) return [];
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id);
      const programId = cleanString(input.programId || input.program_id);
      const domainPackId = cleanString(input.domainPackId || input.domain_pack_id);
      const status = cleanString(input.status);
      const where = [];
      const values = [];
      if (workspaceId) {
        where.push("workspace_id = ?");
        values.push(workspaceId);
      }
      if (learnerId) {
        where.push("(learner_id = ? OR learner_id = '')");
        values.push(learnerId);
      }
      if (programId) {
        where.push("(program_id = ? OR program_id = '')");
        values.push(programId);
      }
      if (domainPackId) {
        where.push("domain_pack_id = ?");
        values.push(domainPackId);
      }
      if (status) {
        where.push("status = ?");
        values.push(status);
      }
      const limit = Math.max(1, Math.min(200, Number(input.limit || 50) || 50));
      return db.prepare(`
        SELECT * FROM learning_growth_domain_pack_provisions
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, provision_id DESC
        LIMIT ?
      `).all(...values, limit).map(publicProvision).filter(Boolean);
    });
  }

  return {
    ensureSchema,
    listProvisions,
    upsertProvision
  };
}

module.exports = {
  createDomainPackProvisionRepository,
  ensureDomainPackProvisionSchema,
  publicProvision,
  uniqueStrings
};
