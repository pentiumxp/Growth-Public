"use strict";

const {
  asArray,
  cleanString,
  insertDynamic,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");
const { stableLearningAutomationProposalId } = require("./identifiers");

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

function ensureLearningAutomationProposalSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_automation_proposals (
      proposal_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      horizon TEXT NOT NULL DEFAULT 'daily_plan',
      status TEXT NOT NULL DEFAULT 'proposed',
      source_cycle_json TEXT NOT NULL DEFAULT '{}',
      source_plan_draft_id TEXT NOT NULL DEFAULT '',
      source_task_card_id TEXT NOT NULL DEFAULT '',
      source_evaluation_id TEXT NOT NULL DEFAULT '',
      plan_draft_id TEXT NOT NULL DEFAULT '',
      selected_item_id TEXT NOT NULL DEFAULT '',
      proposal_summary TEXT NOT NULL DEFAULT '',
      target_node_ids_json TEXT NOT NULL DEFAULT '[]',
      rationale_json TEXT NOT NULL DEFAULT '{}',
      policy_json TEXT NOT NULL DEFAULT '{}',
      decision_json TEXT NOT NULL DEFAULT '{}',
      execution_json TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL DEFAULT '',
      reviewed_by TEXT NOT NULL DEFAULT '',
      decided_at TEXT NOT NULL DEFAULT '',
      executed_by TEXT NOT NULL DEFAULT '',
      executed_at TEXT NOT NULL DEFAULT '',
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_proposals_target
      ON learning_growth_automation_proposals(workspace_id, learner_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_learning_growth_automation_proposals_plan
      ON learning_growth_automation_proposals(workspace_id, plan_draft_id);
  `);
  const columns = new Set(tableColumns(db, "learning_growth_automation_proposals"));
  [
    ["decision_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["reviewed_by", "TEXT NOT NULL DEFAULT ''"],
    ["decided_at", "TEXT NOT NULL DEFAULT ''"],
    ["execution_json", "TEXT NOT NULL DEFAULT '{}'"],
    ["executed_by", "TEXT NOT NULL DEFAULT ''"],
    ["executed_at", "TEXT NOT NULL DEFAULT ''"]
  ].forEach(([name, definition]) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE learning_growth_automation_proposals ADD COLUMN ${name} ${definition}`);
  });
}

function publicAutomationProposal(row) {
  if (!row) return null;
  return {
    proposalId: cleanString(row.proposal_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    horizon: cleanString(row.horizon),
    status: cleanString(row.status),
    sourceCycle: parseJson(row.source_cycle_json, {}) || {},
    sourcePlanDraftId: cleanString(row.source_plan_draft_id),
    sourceTaskCardId: cleanString(row.source_task_card_id),
    sourceEvaluationId: cleanString(row.source_evaluation_id),
    planDraftId: cleanString(row.plan_draft_id),
    selectedItemId: cleanString(row.selected_item_id),
    proposalSummary: cleanString(row.proposal_summary),
    targetNodeIds: uniqueStrings(parseJson(row.target_node_ids_json, []) || []),
    rationale: parseJson(row.rationale_json, {}) || {},
    policy: parseJson(row.policy_json, {}) || {},
    decision: parseJson(row.decision_json, {}) || {},
    execution: parseJson(row.execution_json, {}) || {},
    createdBy: cleanString(row.created_by),
    reviewedBy: cleanString(row.reviewed_by),
    decidedAt: cleanString(row.decided_at),
    executedBy: cleanString(row.executed_by),
    executedAt: cleanString(row.executed_at),
    privacyClass: cleanString(row.privacy_class),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at)
  };
}

function createLearningAutomationProposalRepository({ open, now } = {}) {
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
      ensureLearningAutomationProposalSchema(db);
      return { ok: true, table: "learning_growth_automation_proposals" };
    });
  }

  function saveProposal(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationProposalSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      if (privacyFindings.length) {
        return { ok: false, error: "learning_automation_proposal_privacy_failed", privacyFindings };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
      const horizon = cleanString(input.horizon || "daily_plan");
      const planDraftId = cleanString(input.planDraftId || input.plan_draft_id);
      if (!workspaceId || !horizon || !planDraftId) {
        return { ok: false, error: "learning_automation_proposal_scope_required" };
      }
      const privacyClass = cleanString(input.privacyClass || input.privacy_class || "summary_only") || "summary_only";
      if (privacyClass !== "summary_only") {
        return { ok: false, error: "learning_automation_proposal_privacy_class_required" };
      }
      const selectedItemId = cleanString(input.selectedItemId || input.selected_item_id);
      const proposalId = stableLearningAutomationProposalId(Object.assign({}, input, {
        workspaceId,
        learnerId,
        horizon,
        planDraftId,
        selectedItemId
      }));
      const existing = db.prepare("SELECT * FROM learning_growth_automation_proposals WHERE proposal_id = ?").get(proposalId);
      if (existing) return { ok: true, duplicate: true, proposal: publicAutomationProposal(existing) };
      const timestamp = cleanString(input.createdAt || input.created_at) || clock().toISOString();
      const sourceCycle = input.sourceCycle || {};
      insertDynamic(db, "learning_growth_automation_proposals", {
        proposal_id: proposalId,
        workspace_id: workspaceId,
        learner_id: learnerId,
        program_id: cleanString(input.programId || input.program_id),
        horizon,
        status: cleanString(input.status || "proposed") || "proposed",
        source_cycle_json: jsonText(sourceCycle),
        source_plan_draft_id: cleanString(input.sourcePlanDraftId || input.source_plan_draft_id || sourceCycle.planDraftId),
        source_task_card_id: cleanString(input.sourceTaskCardId || input.source_task_card_id || sourceCycle.taskCardId),
        source_evaluation_id: cleanString(input.sourceEvaluationId || input.source_evaluation_id || sourceCycle.evaluationId),
        plan_draft_id: planDraftId,
        selected_item_id: selectedItemId,
        proposal_summary: boundedText(input.proposalSummary || input.proposal_summary),
        target_node_ids_json: jsonText(uniqueStrings(input.targetNodeIds || input.target_node_ids)),
        rationale_json: jsonText(input.rationale || {}),
        policy_json: jsonText(input.policy || {}),
        decision_json: jsonText(input.decision || {}),
        execution_json: jsonText(input.execution || {}),
        created_by: cleanString(input.createdBy || input.created_by),
        reviewed_by: cleanString(input.reviewedBy || input.reviewed_by),
        decided_at: cleanString(input.decidedAt || input.decided_at),
        executed_by: cleanString(input.executedBy || input.executed_by),
        executed_at: cleanString(input.executedAt || input.executed_at),
        privacy_class: privacyClass,
        created_at: timestamp,
        updated_at: cleanString(input.updatedAt || input.updated_at) || timestamp
      });
      return {
        ok: true,
        duplicate: false,
        proposal: publicAutomationProposal(db.prepare("SELECT * FROM learning_growth_automation_proposals WHERE proposal_id = ?").get(proposalId))
      };
    });
  }

  function getProposal(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_proposals")) return null;
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const proposalId = cleanString(input.proposalId || input.proposal_id);
      if (!workspaceId || !proposalId) return null;
      return publicAutomationProposal(db.prepare(`
        SELECT * FROM learning_growth_automation_proposals
        WHERE workspace_id = ? AND proposal_id = ?
      `).get(workspaceId, proposalId));
    });
  }

  function reviewProposal(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationProposalSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      if (privacyFindings.length) {
        return { ok: false, error: "learning_automation_proposal_privacy_failed", privacyFindings };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const proposalId = cleanString(input.proposalId || input.proposal_id);
      const status = cleanString(input.status || input.reviewAction || input.review_action || input.action).toLowerCase();
      if (!workspaceId || !proposalId) {
        return { ok: false, error: "learning_automation_proposal_scope_required" };
      }
      const allowedStatuses = new Set(["accepted", "skipped", "expired", "superseded"]);
      if (!allowedStatuses.has(status)) {
        return { ok: false, error: "learning_automation_proposal_status_invalid" };
      }
      const existing = db.prepare(`
        SELECT * FROM learning_growth_automation_proposals
        WHERE workspace_id = ? AND proposal_id = ?
      `).get(workspaceId, proposalId);
      if (!existing) return { ok: false, error: "learning_automation_proposal_not_found" };
      const existingStatus = cleanString(existing.status);
      if (existingStatus && existingStatus !== "proposed") {
        return {
          ok: existingStatus === status,
          duplicate: existingStatus === status,
          error: existingStatus === status ? "" : "learning_automation_proposal_already_decided",
          proposal: publicAutomationProposal(existing)
        };
      }
      const decidedAt = cleanString(input.decidedAt || input.decided_at || input.reviewedAt || input.reviewed_at) || clock().toISOString();
      const reviewedBy = cleanString(input.reviewedBy || input.reviewed_by || input.requestedBy || input.requested_by);
      const decision = {
        schemaVersion: "growth.learningAutomationProposal.decision.v1",
        summaryOnly: true,
        status,
        reason: boundedText(input.reason || input.note || input.summary, 360),
        reviewedBy,
        decidedAt
      };
      db.prepare(`
        UPDATE learning_growth_automation_proposals
        SET status = ?,
          decision_json = ?,
          reviewed_by = ?,
          decided_at = ?,
          updated_at = ?
        WHERE workspace_id = ? AND proposal_id = ?
      `).run(status, jsonText(decision), reviewedBy, decidedAt, decidedAt, workspaceId, proposalId);
      return {
        ok: true,
        duplicate: false,
        proposal: publicAutomationProposal(db.prepare("SELECT * FROM learning_growth_automation_proposals WHERE proposal_id = ?").get(proposalId))
      };
    });
  }

  function recordExecution(input = {}) {
    return withDb(false, (db) => {
      ensureLearningAutomationProposalSchema(db);
      const privacyFindings = scanPrivacyKeys(input);
      if (privacyFindings.length) {
        return { ok: false, error: "learning_automation_proposal_privacy_failed", privacyFindings };
      }
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const proposalId = cleanString(input.proposalId || input.proposal_id);
      const status = cleanString(input.status || input.executionStatus || input.execution_status).toLowerCase();
      if (!workspaceId || !proposalId) {
        return { ok: false, error: "learning_automation_proposal_scope_required" };
      }
      const allowedStatuses = new Set(["published", "failed", "blocked"]);
      if (!allowedStatuses.has(status)) {
        return { ok: false, error: "learning_automation_proposal_execution_status_invalid" };
      }
      const existing = db.prepare(`
        SELECT * FROM learning_growth_automation_proposals
        WHERE workspace_id = ? AND proposal_id = ?
      `).get(workspaceId, proposalId);
      if (!existing) return { ok: false, error: "learning_automation_proposal_not_found" };
      if (cleanString(existing.status) !== "accepted") {
        return {
          ok: false,
          error: "learning_automation_proposal_not_accepted",
          proposal: publicAutomationProposal(existing)
        };
      }
      const existingExecution = parseJson(existing.execution_json, {}) || {};
      if (cleanString(existingExecution.status) === "published") {
        return {
          ok: status === "published",
          duplicate: true,
          error: status === "published" ? "" : "learning_automation_proposal_already_executed",
          proposal: publicAutomationProposal(existing)
        };
      }
      const executedAt = cleanString(input.executedAt || input.executed_at) || clock().toISOString();
      const executedBy = cleanString(input.executedBy || input.executed_by || input.requestedBy || input.requested_by);
      const execution = {
        schemaVersion: "growth.learningAutomationProposal.execution.v1",
        summaryOnly: true,
        status,
        stage: boundedText(input.stage, 120),
        error: boundedText(input.error, 240),
        planDraftId: cleanString(input.planDraftId || input.plan_draft_id || existing.plan_draft_id),
        selectedItemId: cleanString(input.selectedItemId || input.selected_item_id || existing.selected_item_id),
        generatedTaskCardId: cleanString(input.generatedTaskCardId || input.generated_task_card_id),
        generatedLearningGraphPlanId: cleanString(input.generatedLearningGraphPlanId || input.generated_learning_graph_plan_id),
        publishAttempt: input.publishAttempt || null,
        executedBy,
        executedAt
      };
      db.prepare(`
        UPDATE learning_growth_automation_proposals
        SET execution_json = ?,
          executed_by = ?,
          executed_at = ?,
          updated_at = ?
        WHERE workspace_id = ? AND proposal_id = ?
      `).run(jsonText(execution), executedBy, executedAt, executedAt, workspaceId, proposalId);
      return {
        ok: true,
        duplicate: false,
        proposal: publicAutomationProposal(db.prepare("SELECT * FROM learning_growth_automation_proposals WHERE proposal_id = ?").get(proposalId))
      };
    });
  }

  function listProposals(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_automation_proposals")) return [];
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id);
      const programId = cleanString(input.programId || input.program_id);
      const proposalId = cleanString(input.proposalId || input.proposal_id);
      const status = cleanString(input.status);
      const planDraftId = cleanString(input.planDraftId || input.plan_draft_id);
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
      if (proposalId) {
        where.push("proposal_id = ?");
        values.push(proposalId);
      }
      if (status) {
        where.push("status = ?");
        values.push(status);
      }
      if (planDraftId) {
        where.push("plan_draft_id = ?");
        values.push(planDraftId);
      }
      const limit = Math.max(1, Math.min(100, Number(input.limit || 20) || 20));
      return db.prepare(`
        SELECT * FROM learning_growth_automation_proposals
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, proposal_id DESC
        LIMIT ?
      `).all(...values, limit).map(publicAutomationProposal).filter(Boolean);
    });
  }

  return {
    ensureSchema,
    getProposal,
    listProposals,
    recordExecution,
    reviewProposal,
    saveProposal
  };
}

module.exports = {
  createLearningAutomationProposalRepository,
  ensureLearningAutomationProposalSchema,
  publicAutomationProposal
};
