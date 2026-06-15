"use strict";

const {
  asArray,
  cleanString,
  insertDynamic,
  numberValue,
  parseJson,
  tableExists
} = require("./core");
const { stableLearningEvidenceId } = require("./identifiers");

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

function boundedText(value, max = 320) {
  return cleanString(value).slice(0, max);
}

function ensureLearningEvidenceLedgerSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_evidence_ledger (
      evidence_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      graph_node_id TEXT NOT NULL DEFAULT '',
      graph_node_ids_json TEXT NOT NULL DEFAULT '[]',
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL DEFAULT '',
      source_task_card_id TEXT NOT NULL DEFAULT '',
      card_role TEXT NOT NULL DEFAULT '',
      evidence_weight REAL NOT NULL DEFAULT 0,
      confidence REAL NOT NULL DEFAULT 0,
      score_band TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT '',
      summary_json TEXT NOT NULL DEFAULT '{}',
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_growth_evidence_source
      ON learning_growth_evidence_ledger(workspace_id, source_type, source_id, graph_node_id);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_evidence_workspace
      ON learning_growth_evidence_ledger(workspace_id, learner_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_evidence_node
      ON learning_growth_evidence_ledger(workspace_id, graph_node_id, created_at);
  `);
}

function publicEvidence(row) {
  if (!row) return null;
  return {
    evidenceId: cleanString(row.evidence_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    graphNodeId: cleanString(row.graph_node_id),
    graphNodeIds: parseJson(row.graph_node_ids_json, []),
    sourceType: cleanString(row.source_type),
    sourceId: cleanString(row.source_id),
    sourceTaskCardId: cleanString(row.source_task_card_id),
    cardRole: cleanString(row.card_role),
    evidenceWeight: numberValue(row.evidence_weight),
    confidence: numberValue(row.confidence),
    scoreBand: cleanString(row.score_band),
    status: cleanString(row.status),
    summary: parseJson(row.summary_json, {}) || {},
    privacyClass: cleanString(row.privacy_class),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function createLearningEvidenceLedgerRepository({ open } = {}) {
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
      ensureLearningEvidenceLedgerSchema(db);
      return { ok: true, table: "learning_growth_evidence_ledger" };
    });
  }

  function recordEvidence(input = {}) {
    return withDb(false, (db) => {
      ensureLearningEvidenceLedgerSchema(db);
      const workspaceId = cleanString(input.workspaceId);
      const sourceType = cleanString(input.sourceType);
      const sourceId = cleanString(input.sourceId);
      const graphNodeIds = uniqueStrings(input.graphNodeIds || input.nodeIds);
      const graphNodeId = cleanString(input.graphNodeId || input.nodeId) || graphNodeIds[0] || "";
      if (!workspaceId || !sourceType || !sourceId) {
        return { ok: false, error: "learning_evidence_source_required" };
      }
      const evidenceId = stableLearningEvidenceId(Object.assign({}, input, { graphNodeId }));
      const existing = db.prepare("SELECT * FROM learning_growth_evidence_ledger WHERE evidence_id = ?").get(evidenceId)
        || db.prepare(`
          SELECT * FROM learning_growth_evidence_ledger
          WHERE workspace_id = ? AND source_type = ? AND source_id = ? AND graph_node_id = ?
          LIMIT 1
        `).get(workspaceId, sourceType, sourceId, graphNodeId);
      if (existing) return { ok: true, duplicate: true, evidence: publicEvidence(existing) };
      const now = cleanString(input.createdAt || input.recordedAt) || new Date().toISOString();
      const values = {
        evidence_id: evidenceId,
        workspace_id: workspaceId,
        learner_id: cleanString(input.learnerId) || workspaceId,
        program_id: cleanString(input.programId),
        graph_node_id: graphNodeId,
        graph_node_ids_json: jsonText(graphNodeIds),
        source_type: sourceType,
        source_id: sourceId,
        source_task_card_id: cleanString(input.sourceTaskCardId || input.taskCardId),
        card_role: cleanString(input.cardRole),
        evidence_weight: Math.max(0, Math.min(1, numberValue(input.evidenceWeight))),
        confidence: Math.max(0, Math.min(1, numberValue(input.confidence))),
        score_band: cleanString(input.scoreBand),
        status: cleanString(input.status || "observed"),
        summary_json: jsonText(Object.assign({ summaryOnly: true }, input.summary || {})),
        privacy_class: cleanString(input.privacyClass) || "summary_only",
        created_at: now,
        updated_at: cleanString(input.updatedAt) || now
      };
      insertDynamic(db, "learning_growth_evidence_ledger", values);
      return {
        ok: true,
        duplicate: false,
        evidence: publicEvidence(db.prepare("SELECT * FROM learning_growth_evidence_ledger WHERE evidence_id = ?").get(evidenceId))
      };
    });
  }

  function listEvidence(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_evidence_ledger")) return [];
      const where = [];
      const values = [];
      const workspaceId = cleanString(input.workspaceId);
      const learnerId = cleanString(input.learnerId);
      const programId = cleanString(input.programId);
      const evidenceId = cleanString(input.evidenceId || input.evidence_id);
      const sourceType = cleanString(input.sourceType);
      const sourceId = cleanString(input.sourceId || input.source_id);
      const sourceTaskCardId = cleanString(input.sourceTaskCardId || input.source_task_card_id || input.taskCardId || input.task_card_id);
      const cardRole = cleanString(input.cardRole || input.card_role);
      const nodeIds = uniqueStrings(input.graphNodeIds || input.nodeIds);
      const status = cleanString(input.status);
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
      if (evidenceId) {
        where.push("evidence_id = ?");
        values.push(evidenceId);
      }
      if (sourceType) {
        where.push("source_type = ?");
        values.push(sourceType);
      }
      if (sourceId) {
        where.push("source_id = ?");
        values.push(sourceId);
      }
      if (sourceTaskCardId) {
        where.push("source_task_card_id = ?");
        values.push(sourceTaskCardId);
      }
      if (cardRole) {
        where.push("card_role = ?");
        values.push(cardRole);
      }
      if (status) {
        where.push("status = ?");
        values.push(status);
      }
      if (nodeIds.length) {
        where.push(`graph_node_id IN (${nodeIds.map(() => "?").join(", ")})`);
        values.push(...nodeIds);
      }
      const limit = Math.max(1, Math.min(200, Number(input.limit || 50) || 50));
      return db.prepare(`
        SELECT * FROM learning_growth_evidence_ledger
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY created_at DESC, evidence_id DESC
        LIMIT ?
      `).all(...values, limit).map(publicEvidence);
    });
  }

  return {
    ensureSchema,
    listEvidence,
    recordEvidence
  };
}

module.exports = {
  createLearningEvidenceLedgerRepository,
  ensureLearningEvidenceLedgerSchema,
  publicEvidence
};
