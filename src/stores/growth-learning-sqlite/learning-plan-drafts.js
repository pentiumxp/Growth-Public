"use strict";

const {
  asArray,
  cleanString,
  insertDynamic,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");
const { stableLearningPlanDraftId } = require("./identifiers");

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function boundedText(value, max = 700) {
  return cleanString(value).slice(0, max);
}

function publicLearningPlanDraft(row) {
  if (!row) return null;
  return {
    planDraftId: cleanString(row.plan_draft_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    horizon: cleanString(row.horizon),
    status: cleanString(row.status),
    planSummary: cleanString(row.plan_summary),
    draft: parseJson(row.draft_json, {}) || {},
    contextSummary: parseJson(row.context_summary_json, {}) || {},
    validation: parseJson(row.validation_json, {}) || {},
    selectedItemId: cleanString(row.selected_item_id),
    generatedTaskCardId: cleanString(row.generated_task_card_id),
    generatedLearningGraphPlanId: cleanString(row.generated_learning_graph_plan_id),
    source: cleanString(row.source),
    privacyClass: cleanString(row.privacy_class),
    publishAttempt: {
      status: cleanString(row.last_publish_status),
      error: cleanString(row.last_publish_error),
      stage: cleanString(row.last_publish_stage),
      selectedItemId: cleanString(row.last_publish_item_id),
      attemptedAt: cleanString(row.last_publish_attempt_at),
      attemptCount: Number(row.publish_attempt_count || 0) || 0
    },
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at),
    publishedAt: cleanString(row.published_at)
  };
}

function ensureLearningPlanDraftSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_growth_plan_drafts (
      plan_draft_id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      learner_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      horizon TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      plan_summary TEXT NOT NULL DEFAULT '',
      draft_json TEXT NOT NULL DEFAULT '{}',
      context_summary_json TEXT NOT NULL DEFAULT '{}',
      validation_json TEXT NOT NULL DEFAULT '{}',
      selected_item_id TEXT NOT NULL DEFAULT '',
      generated_task_card_id TEXT NOT NULL DEFAULT '',
      generated_learning_graph_plan_id TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'growth-learning-plan-publisher-service',
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      last_publish_status TEXT NOT NULL DEFAULT '',
      last_publish_error TEXT NOT NULL DEFAULT '',
      last_publish_stage TEXT NOT NULL DEFAULT '',
      last_publish_item_id TEXT NOT NULL DEFAULT '',
      last_publish_attempt_at TEXT NOT NULL DEFAULT '',
      publish_attempt_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      published_at TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_learning_growth_plan_drafts_workspace
      ON learning_growth_plan_drafts(workspace_id, learner_id, status, updated_at);
  `);
  const columns = new Set(tableColumns(db, "learning_growth_plan_drafts"));
  [
    ["last_publish_status", "TEXT NOT NULL DEFAULT ''"],
    ["last_publish_error", "TEXT NOT NULL DEFAULT ''"],
    ["last_publish_stage", "TEXT NOT NULL DEFAULT ''"],
    ["last_publish_item_id", "TEXT NOT NULL DEFAULT ''"],
    ["last_publish_attempt_at", "TEXT NOT NULL DEFAULT ''"],
    ["publish_attempt_count", "INTEGER NOT NULL DEFAULT 0"]
  ].forEach(([name, definition]) => {
    if (!columns.has(name)) db.exec(`ALTER TABLE learning_growth_plan_drafts ADD COLUMN ${name} ${definition}`);
  });
}

function createLearningPlanDraftRepository({ open, now } = {}) {
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
      ensureLearningPlanDraftSchema(db);
      return { ok: true, table: "learning_growth_plan_drafts" };
    });
  }

  function saveDraft(input = {}) {
    return withDb(false, (db) => {
      ensureLearningPlanDraftSchema(db);
      const draft = input.draft || {};
      const workspaceId = cleanString(input.workspaceId || input.target?.workspaceId);
      const learnerId = cleanString(input.learnerId || input.target?.learnerId || workspaceId);
      const horizon = cleanString(input.horizon || draft.horizon || "daily_plan");
      if (!workspaceId || !horizon) return { ok: false, error: "learning_plan_draft_scope_required" };
      const planDraftId = stableLearningPlanDraftId(Object.assign({}, input, {
        workspaceId,
        learnerId,
        horizon,
        planSummary: input.planSummary || draft.planSummary,
        draft
      }));
      const existing = db.prepare("SELECT * FROM learning_growth_plan_drafts WHERE plan_draft_id = ?").get(planDraftId);
      if (existing) return { ok: true, duplicate: true, planDraft: publicLearningPlanDraft(existing) };
      const timestamp = cleanString(input.createdAt) || clock().toISOString();
      insertDynamic(db, "learning_growth_plan_drafts", {
        plan_draft_id: planDraftId,
        workspace_id: workspaceId,
        learner_id: learnerId,
        program_id: cleanString(input.programId || input.program_id),
        horizon,
        status: cleanString(input.status || "draft"),
        plan_summary: boundedText(input.planSummary || draft.planSummary),
        draft_json: jsonText(draft),
        context_summary_json: jsonText(input.contextSummary || {}),
        validation_json: jsonText(input.validation || { ok: true, schemaVersion: "growth.learningPlanDraft.v1" }),
        selected_item_id: "",
        generated_task_card_id: "",
        generated_learning_graph_plan_id: "",
        source: cleanString(input.source || "growth-learning-plan-publisher-service"),
        privacy_class: cleanString(input.privacyClass) || "summary_only",
        last_publish_status: "",
        last_publish_error: "",
        last_publish_stage: "",
        last_publish_item_id: "",
        last_publish_attempt_at: "",
        publish_attempt_count: 0,
        created_at: timestamp,
        updated_at: cleanString(input.updatedAt) || timestamp,
        published_at: ""
      });
      return {
        ok: true,
        duplicate: false,
        planDraft: publicLearningPlanDraft(db.prepare("SELECT * FROM learning_growth_plan_drafts WHERE plan_draft_id = ?").get(planDraftId))
      };
    });
  }

  function getDraft(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_plan_drafts")) return null;
      const planDraftId = cleanString(input.planDraftId || input.plan_draft_id);
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      if (!planDraftId) return null;
      const row = workspaceId
        ? db.prepare("SELECT * FROM learning_growth_plan_drafts WHERE plan_draft_id = ? AND workspace_id = ?").get(planDraftId, workspaceId)
        : db.prepare("SELECT * FROM learning_growth_plan_drafts WHERE plan_draft_id = ?").get(planDraftId);
      return publicLearningPlanDraft(row);
    });
  }

  function listDrafts(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_plan_drafts")) return [];
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      const learnerId = cleanString(input.learnerId || input.learner_id);
      const programId = cleanString(input.programId || input.program_id);
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
      if (status) {
        where.push("status = ?");
        values.push(status);
      }
      const limit = Math.max(1, Math.min(100, Number(input.limit || 20) || 20));
      return db.prepare(`
        SELECT * FROM learning_growth_plan_drafts
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY updated_at DESC, plan_draft_id DESC
        LIMIT ?
      `).all(...values, limit).map(publicLearningPlanDraft);
    });
  }

  function markPublished(input = {}) {
    return withDb(false, (db) => {
      ensureLearningPlanDraftSchema(db);
      const planDraftId = cleanString(input.planDraftId || input.plan_draft_id);
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      if (!planDraftId || !workspaceId) return { ok: false, error: "learning_plan_draft_scope_required" };
      const existing = db.prepare("SELECT * FROM learning_growth_plan_drafts WHERE plan_draft_id = ? AND workspace_id = ?").get(planDraftId, workspaceId);
      if (!existing) return { ok: false, error: "learning_plan_draft_not_found" };
      const timestamp = cleanString(input.publishedAt) || clock().toISOString();
      db.prepare(`
        UPDATE learning_growth_plan_drafts
        SET status = 'published',
            selected_item_id = ?,
            generated_task_card_id = ?,
            generated_learning_graph_plan_id = ?,
            last_publish_status = 'published',
            last_publish_error = '',
            last_publish_stage = 'published',
            last_publish_item_id = ?,
            last_publish_attempt_at = ?,
            publish_attempt_count = publish_attempt_count + 1,
            updated_at = ?,
            published_at = ?
        WHERE plan_draft_id = ? AND workspace_id = ?
      `).run(
        cleanString(input.selectedItemId || input.itemId),
        cleanString(input.generatedTaskCardId),
        cleanString(input.generatedLearningGraphPlanId),
        cleanString(input.selectedItemId || input.itemId),
        timestamp,
        timestamp,
        timestamp,
        planDraftId,
        workspaceId
      );
      return {
        ok: true,
        planDraft: publicLearningPlanDraft(db.prepare("SELECT * FROM learning_growth_plan_drafts WHERE plan_draft_id = ?").get(planDraftId))
      };
    });
  }

  function markPublishAttempt(input = {}) {
    return withDb(false, (db) => {
      ensureLearningPlanDraftSchema(db);
      const planDraftId = cleanString(input.planDraftId || input.plan_draft_id);
      const workspaceId = cleanString(input.workspaceId || input.workspace_id);
      if (!planDraftId || !workspaceId) return { ok: false, error: "learning_plan_draft_scope_required" };
      const existing = db.prepare("SELECT * FROM learning_growth_plan_drafts WHERE plan_draft_id = ? AND workspace_id = ?").get(planDraftId, workspaceId);
      if (!existing) return { ok: false, error: "learning_plan_draft_not_found" };
      const timestamp = cleanString(input.attemptedAt || input.attempted_at) || clock().toISOString();
      db.prepare(`
        UPDATE learning_growth_plan_drafts
        SET last_publish_status = ?,
            last_publish_error = ?,
            last_publish_stage = ?,
            last_publish_item_id = ?,
            last_publish_attempt_at = ?,
            publish_attempt_count = publish_attempt_count + 1,
            updated_at = ?
        WHERE plan_draft_id = ? AND workspace_id = ?
      `).run(
        boundedText(input.status, 80),
        boundedText(input.error, 120),
        boundedText(input.stage, 80),
        boundedText(input.selectedItemId || input.itemId, 120),
        timestamp,
        timestamp,
        planDraftId,
        workspaceId
      );
      return {
        ok: true,
        planDraft: publicLearningPlanDraft(db.prepare("SELECT * FROM learning_growth_plan_drafts WHERE plan_draft_id = ?").get(planDraftId))
      };
    });
  }

  return {
    ensureSchema,
    getDraft,
    listDrafts,
    markPublishAttempt,
    markPublished,
    saveDraft
  };
}

module.exports = {
  createLearningPlanDraftRepository,
  ensureLearningPlanDraftSchema,
  publicLearningPlanDraft
};
