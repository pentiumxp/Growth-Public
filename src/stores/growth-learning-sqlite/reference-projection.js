"use strict";

const {
  cleanString,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");
const {
  publicEvaluation,
  publicReflection,
  publicSubmission
} = require("./projection");

function boundedText(value, max = 260) {
  return cleanString(value).slice(0, max);
}

function numberValue(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstValue(row = {}, columns = [], candidates = []) {
  for (const column of candidates) {
    if (columns.includes(column)) {
      const value = cleanString(row[column]);
      if (value) return value;
    }
  }
  return "";
}

function firstNumber(row = {}, columns = [], candidates = []) {
  for (const column of candidates) {
    if (columns.includes(column)) return numberValue(row[column]);
  }
  return 0;
}

function findRowById(db, tableName, idColumns = [], objectId = "", workspaceId = "") {
  if (!tableExists(db, tableName)) return null;
  const columns = tableColumns(db, tableName);
  const presentIdColumns = idColumns.filter((column) => columns.includes(column));
  const id = cleanString(objectId);
  if (!id || !presentIdColumns.length) return null;
  const values = [];
  const idSql = presentIdColumns.map((column) => {
    values.push(id);
    return `${column} = ?`;
  }).join(" OR ");
  let where = `(${idSql})`;
  const cleanWorkspaceId = cleanString(workspaceId);
  if (cleanWorkspaceId && columns.includes("workspace_id")) {
    where += " AND workspace_id = ?";
    values.push(cleanWorkspaceId);
  }
  return db.prepare(`SELECT * FROM ${tableName} WHERE ${where} LIMIT 1`).get(...values) || null;
}

function cardWorkspace(db, taskCardId = "") {
  if (!tableExists(db, "learning_task_cards")) return "";
  const id = cleanString(taskCardId);
  if (!id) return "";
  const row = db.prepare("SELECT workspace_id FROM learning_task_cards WHERE id = ? LIMIT 1").get(id);
  return cleanString(row?.workspace_id);
}

function rowWorkspace(db, row = {}) {
  return cleanString(row.workspace_id) || cardWorkspace(db, row.task_card_id);
}

function workspaceMatches(db, row = {}, workspaceId = "") {
  const cleanWorkspaceId = cleanString(workspaceId);
  if (!cleanWorkspaceId) return true;
  const resolved = rowWorkspace(db, row);
  return !resolved || resolved === cleanWorkspaceId;
}

function publicProgram(row = {}) {
  const columns = Object.keys(row);
  const programId = firstValue(row, columns, ["program_id", "id"]);
  return {
    programId,
    workspaceId: firstValue(row, columns, ["workspace_id", "learner_workspace_id"]),
    learnerId: firstValue(row, columns, ["learner_id", "learner_workspace_id", "workspace_id"]),
    title: boundedText(firstValue(row, columns, ["title", "name", "label"]) || programId, 180),
    status: firstValue(row, columns, ["status", "state"]),
    domain: firstValue(row, columns, ["domain", "subject_domain"]),
    subject: firstValue(row, columns, ["subject", "subject_id"]),
    createdAt: firstValue(row, columns, ["created_at", "createdAt"]),
    updatedAt: firstValue(row, columns, ["updated_at", "updatedAt"])
  };
}

function publicPlanDraftReference(row = {}) {
  const draft = parseJson(row.draft_json, {}) || {};
  const context = parseJson(row.context_summary_json, {}) || {};
  const items = Array.isArray(draft.items) ? draft.items : [];
  return {
    planDraftId: cleanString(row.plan_draft_id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    horizon: cleanString(row.horizon),
    status: cleanString(row.status),
    planSummary: boundedText(row.plan_summary, 420),
    selectedItemId: cleanString(row.selected_item_id),
    generatedTaskCardId: cleanString(row.generated_task_card_id),
    generatedLearningGraphPlanId: cleanString(row.generated_learning_graph_plan_id),
    itemCount: items.length,
    targetNodeIds: Array.from(new Set(items.flatMap((item) => Array.isArray(item.targetNodeIds) ? item.targetNodeIds : [])
      .map(cleanString)
      .filter(Boolean))).slice(0, 12),
    context: {
      domain: cleanString(context.domain || context.scope?.domain),
      subject: cleanString(context.subject || context.scope?.subject),
      domainPackId: cleanString(context.domainPackId || context.domain_pack_id || context.scope?.domainPackId)
    },
    privacyClass: cleanString(row.privacy_class),
    source: cleanString(row.source),
    createdAt: cleanString(row.created_at),
    updatedAt: cleanString(row.updated_at),
    publishedAt: cleanString(row.published_at)
  };
}

function createLearningReferenceProjectionRepository({ open } = {}) {
  function withDb(callback) {
    const db = open(true);
    try {
      return callback(db);
    } finally {
      db.close();
    }
  }

  function getProgram(input = {}) {
    return withDb((db) => {
      const row = findRowById(db, "learning_programs", ["program_id", "id"], input.objectId, input.workspaceId);
      return row ? publicProgram(row) : null;
    });
  }

  function getSubmission(input = {}) {
    return withDb((db) => {
      const row = findRowById(db, "learning_task_submissions", ["submission_id", "id"], input.objectId, input.workspaceId);
      if (!row || !workspaceMatches(db, row, input.workspaceId)) return null;
      const projected = publicSubmission(row) || {};
      return Object.assign({}, projected, {
        workspaceId: rowWorkspace(db, row),
        learnerId: cleanString(row.learner_id),
        status: cleanString(projected.status || row.status),
        submissionKind: cleanString(projected.submissionKind || row.submission_kind),
        hasAudio: Boolean(projected.audio?.url || projected.audio?.digest)
      });
    });
  }

  function getEvaluation(input = {}) {
    return withDb((db) => {
      const row = findRowById(db, "learning_evaluations", ["evaluation_id", "id"], input.objectId, input.workspaceId);
      if (!row || !workspaceMatches(db, row, input.workspaceId)) return null;
      const projected = publicEvaluation(row) || {};
      return Object.assign({}, projected, {
        workspaceId: rowWorkspace(db, row),
        learnerId: cleanString(row.learner_id),
        status: cleanString(projected.status || row.status)
      });
    });
  }

  function getReflection(input = {}) {
    return withDb((db) => {
      const row = findRowById(db, "learning_task_reflections", ["reflection_id", "id"], input.objectId, input.workspaceId);
      if (!row || !workspaceMatches(db, row, input.workspaceId)) return null;
      const projected = publicReflection(row) || {};
      return Object.assign({}, projected, {
        workspaceId: rowWorkspace(db, row),
        learnerId: cleanString(row.learner_id),
        status: cleanString(projected.status || row.status),
        hasAudio: Boolean(projected.audio?.url || projected.audio?.digest)
      });
    });
  }

  function getPlanDraft(input = {}) {
    return withDb((db) => {
      const row = findRowById(db, "learning_growth_plan_drafts", ["plan_draft_id", "id"], input.objectId, input.workspaceId);
      return row ? publicPlanDraftReference(row) : null;
    });
  }

  function tableStatus(input = {}) {
    return withDb((db) => ({
      ok: true,
      workspaceId: cleanString(input.workspaceId),
      tables: {
        programs: tableExists(db, "learning_programs"),
        submissions: tableExists(db, "learning_task_submissions"),
        evaluations: tableExists(db, "learning_evaluations"),
        reflections: tableExists(db, "learning_task_reflections"),
        planDrafts: tableExists(db, "learning_growth_plan_drafts")
      }
    }));
  }

  return {
    getEvaluation,
    getPlanDraft,
    getProgram,
    getReflection,
    getSubmission,
    tableStatus
  };
}

module.exports = {
  createLearningReferenceProjectionRepository,
  publicPlanDraftReference
};
