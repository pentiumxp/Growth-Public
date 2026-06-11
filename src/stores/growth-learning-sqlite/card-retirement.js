"use strict";

const {
  cleanString,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");

const HIDDEN_CARD_STATUSES = Object.freeze(["cancelled", "canceled", "retired", "superseded"]);
const COMPLETE_CARD_STATUSES = Object.freeze(["completed", "done", "closed", "archived"]);
const OPEN_EVALUATION_JOB_STATUSES = Object.freeze(["pending", "retry", "processing"]);

function pickRaw(raw = {}, paths = []) {
  for (const path of paths) {
    const value = String(path).split(".").reduce((current, key) => current && current[key], raw);
    if (value !== undefined && value !== null && cleanString(value)) return value;
  }
  return "";
}

function sequenceGroupForRaw(raw = {}) {
  return cleanString(pickRaw(raw, [
    "sequenceGroupId",
    "sequence_group_id",
    "learningGrowthJitGeneration.sequenceGroupId",
    "taskModel.jitGeneration.sequenceGroupId",
    "growth.sequenceGroupId"
  ]));
}

function sequenceModeForRaw(raw = {}) {
  return cleanString(pickRaw(raw, [
    "sequenceMode",
    "sequence_mode",
    "learningGrowthJitGeneration.sequenceMode",
    "taskModel.jitGeneration.sequenceMode",
    "taskModel.sequenceMode",
    "growth.sequenceMode"
  ]));
}

function graphPlanRefForRaw(raw = {}) {
  return cleanString(pickRaw(raw, [
    "learningGraphPlanId",
    "learning_graph_plan_id",
    "taskModel.learningGraphPlanId",
    "growth.learningGraphPlanId"
  ]));
}

function sourceForRaw(raw = {}) {
  return cleanString(pickRaw(raw, [
    "source",
    "sourceKind",
    "taskModel.source",
    "learningGrowthJitGeneration.source"
  ]));
}

function isEvergreenRaw(raw = {}) {
  return sequenceModeForRaw(raw).toLowerCase().includes("evergreen")
    || sequenceGroupForRaw(raw).toLowerCase().startsWith("evergreen:");
}

function graphBindingCount(db, taskCardId) {
  if (!tableExists(db, "learning_card_graph_bindings")) return 0;
  return Number(db.prepare("SELECT COUNT(*) AS count FROM learning_card_graph_bindings WHERE task_card_id = ?")
    .get(cleanString(taskCardId))?.count || 0);
}

function relatedCount(db, tableName, taskCardId) {
  if (!tableExists(db, tableName)) return 0;
  if (!tableColumns(db, tableName).includes("task_card_id")) return 0;
  return Number(db.prepare(`SELECT COUNT(*) AS count FROM ${tableName} WHERE task_card_id = ?`)
    .get(cleanString(taskCardId))?.count || 0);
}

function relatedCounts(db, taskCardId) {
  return {
    submissions: relatedCount(db, "learning_task_submissions", taskCardId),
    evaluations: relatedCount(db, "learning_evaluations", taskCardId),
    reflections: relatedCount(db, "learning_task_reflections", taskCardId),
    artifacts: relatedCount(db, "learning_task_artifacts", taskCardId),
    audioBlobs: relatedCount(db, "learning_task_audio_blobs", taskCardId),
    evaluationJobs: relatedCount(db, "learning_growth_evaluation_jobs", taskCardId),
    rewards: relatedCount(db, "learning_reward_settlements", taskCardId)
  };
}

function candidateReason(row = {}, raw = {}) {
  const source = sourceForRaw(raw);
  if (source === "knowledge_graph_seed") return "legacy_knowledge_graph_seed_projection";
  if (isEvergreenRaw(raw)) return "legacy_evergreen_regenerable_projection";
  if (cleanString(row.kanban_card_id)) return "legacy_kanban_projection";
  return "legacy_regenerable_projection";
}

function publicCandidate(db, row = {}) {
  const raw = parseJson(row.raw_json, {}) || {};
  const graphBindingRows = graphBindingCount(db, row.id);
  const graphPlanRef = graphPlanRefForRaw(raw);
  const graphBound = graphBindingRows > 0 || Boolean(graphPlanRef);
  return {
    taskCardId: cleanString(row.id),
    kanbanCardId: cleanString(row.kanban_card_id),
    workspaceId: cleanString(row.workspace_id),
    programId: cleanString(row.program_id),
    draftId: cleanString(row.draft_id),
    title: cleanString(row.title),
    status: cleanString(row.status),
    domain: cleanString(row.domain),
    taskCardType: cleanString(row.task_card_type),
    cardRole: cleanString(row.card_role),
    sequenceGroupId: sequenceGroupForRaw(raw),
    sequenceMode: sequenceModeForRaw(raw),
    evergreen: isEvergreenRaw(raw),
    rawSource: sourceForRaw(raw),
    graphBound,
    graphBindingCount: graphBindingRows,
    graphPlanRef,
    reason: candidateReason(row, raw),
    relatedCounts: relatedCounts(db, row.id)
  };
}

function summarizeCandidates(candidates = []) {
  const byStatus = {};
  const byProgram = {};
  const byReason = {};
  const relatedTotals = {
    submissions: 0,
    evaluations: 0,
    reflections: 0,
    artifacts: 0,
    audioBlobs: 0,
    evaluationJobs: 0,
    rewards: 0
  };
  for (const candidate of candidates) {
    byStatus[candidate.status] = Number(byStatus[candidate.status] || 0) + 1;
    byProgram[candidate.programId] = Number(byProgram[candidate.programId] || 0) + 1;
    byReason[candidate.reason] = Number(byReason[candidate.reason] || 0) + 1;
    for (const key of Object.keys(relatedTotals)) {
      relatedTotals[key] += Number(candidate.relatedCounts?.[key] || 0);
    }
  }
  return {
    candidateCount: candidates.length,
    evergreenCount: candidates.filter((candidate) => candidate.evergreen).length,
    graphBoundCount: candidates.filter((candidate) => candidate.graphBound).length,
    byStatus,
    byProgram,
    byReason,
    relatedTotals,
    sample: candidates.slice(0, 20).map((candidate) => ({
      taskCardId: candidate.taskCardId,
      title: candidate.title,
      status: candidate.status,
      programId: candidate.programId,
      sequenceGroupId: candidate.sequenceGroupId,
      reason: candidate.reason,
      relatedCounts: candidate.relatedCounts
    }))
  };
}

function updateDynamic(db, tableName, idColumn, idValue, values = {}) {
  const columns = tableColumns(db, tableName).filter((column) => Object.prototype.hasOwnProperty.call(values, column));
  if (!columns.length) return 0;
  const assignments = columns.map((column) => `${column} = ?`).join(", ");
  const result = db.prepare(`UPDATE ${tableName} SET ${assignments} WHERE ${idColumn} = ?`)
    .run(...columns.map((column) => values[column]), cleanString(idValue));
  return Number(result.changes || 0);
}

function retirementRaw(row = {}, candidate = {}, input = {}) {
  const raw = parseJson(row.raw_json, {}) || {};
  const prior = raw.growthRetirement && typeof raw.growthRetirement === "object" ? raw.growthRetirement : null;
  const history = Array.isArray(raw.growthRetirementHistory) ? raw.growthRetirementHistory.slice(0, 10) : [];
  if (prior) history.push(prior);
  raw.growthRetirement = {
    source: "growth-plugin",
    action: "retire_regenerable_card",
    reason: cleanString(input.reason) || "legacy_projection_retired_for_native_graph_regeneration",
    retiredAt: input.now,
    previousStatus: cleanString(row.status),
    previousActivationState: cleanString(row.activation_state),
    previousActivationReason: cleanString(row.activation_reason),
    previousActivationSource: cleanString(row.activation_source),
    candidateReason: candidate.reason,
    regenerationPolicy: "regenerate_from_native_graph_or_card_generator",
    preservedHistory: true
  };
  if (history.length) raw.growthRetirementHistory = history;
  return JSON.stringify(raw);
}

function openJobRows(db, taskCardIds = []) {
  if (!tableExists(db, "learning_growth_evaluation_jobs") || !taskCardIds.length) return [];
  const placeholders = taskCardIds.map(() => "?").join(", ");
  const statuses = OPEN_EVALUATION_JOB_STATUSES.map(() => "?").join(", ");
  return db.prepare(`
    SELECT * FROM learning_growth_evaluation_jobs
    WHERE task_card_id IN (${placeholders})
      AND status IN (${statuses})
  `).all(...taskCardIds, ...OPEN_EVALUATION_JOB_STATUSES);
}

function cancelOpenJobs(db, taskCardIds = [], input = {}) {
  const rows = openJobRows(db, taskCardIds);
  if (!rows.length) return { count: 0, jobIds: [] };
  for (const row of rows) {
    updateDynamic(db, "learning_growth_evaluation_jobs", "id", row.id, {
      status: "cancelled",
      lease_owner: "",
      lease_until: "",
      last_error: cleanString(input.reason || "card_retired_for_regeneration").slice(0, 500),
      completed_at: input.now,
      updated_at: input.now
    });
  }
  return { count: rows.length, jobIds: rows.map((row) => cleanString(row.id)) };
}

function createCardRetirementRepository({ open } = {}) {
  function candidatesFromDb(db, input = {}) {
    if (!tableExists(db, "learning_task_cards")) {
      return { ok: false, error: "learning_task_cards_missing", candidates: [], summary: summarizeCandidates([]) };
    }
    const workspaceId = cleanString(input.workspaceId);
    if (!workspaceId) return { ok: false, error: "workspace_id_required", candidates: [], summary: summarizeCandidates([]) };
    const includeHidden = Boolean(input.includeHidden);
    const includeCompleted = input.includeCompleted !== false;
    const includeGraphBound = Boolean(input.includeGraphBound);
    const selectedTaskCardIds = new Set((input.taskCardIds || []).map(cleanString).filter(Boolean));
    const rows = db.prepare("SELECT * FROM learning_task_cards WHERE workspace_id = ? ORDER BY created_at ASC, id ASC").all(workspaceId);
    const candidates = [];
    for (const row of rows) {
      const status = cleanString(row.status).toLowerCase();
      if (selectedTaskCardIds.size && !selectedTaskCardIds.has(cleanString(row.id))) continue;
      if (!includeHidden && HIDDEN_CARD_STATUSES.includes(status)) continue;
      if (!includeCompleted && COMPLETE_CARD_STATUSES.includes(status)) continue;
      const candidate = publicCandidate(db, row);
      if (candidate.graphBound && !includeGraphBound) continue;
      candidates.push(candidate);
    }
    return {
      ok: true,
      workspace_id: workspaceId,
      policy: {
        include_hidden: includeHidden,
        include_completed: includeCompleted,
        include_graph_bound: includeGraphBound,
        selected_task_card_ids: Array.from(selectedTaskCardIds)
      },
      candidates,
      summary: summarizeCandidates(candidates)
    };
  }

  function listRegenerableCards(input = {}) {
    const db = open(true);
    try {
      return candidatesFromDb(db, input);
    } finally {
      db.close();
    }
  }

  function retireRegenerableCards(input = {}) {
    const write = Boolean(input.write);
    const now = cleanString(input.now) || new Date().toISOString();
    const db = open(!write);
    try {
      const planned = candidatesFromDb(db, input);
      if (!planned.ok || !write) {
        return Object.assign({}, planned, {
          mode: write ? "write" : "dry_run",
          write: false
        });
      }
      db.exec("BEGIN IMMEDIATE");
      let retiredCount = 0;
      let cancelledJobs = { count: 0, jobIds: [] };
      try {
        const rowsById = new Map(db.prepare("SELECT * FROM learning_task_cards WHERE workspace_id = ?").all(planned.workspace_id)
          .map((row) => [cleanString(row.id), row]));
        for (const candidate of planned.candidates) {
          const row = rowsById.get(candidate.taskCardId);
          if (!row) continue;
          retiredCount += updateDynamic(db, "learning_task_cards", "id", candidate.taskCardId, {
            status: "retired",
            activation_state: "retired",
            activation_reason: cleanString(input.reason || "legacy_projection_retired_for_native_graph_regeneration").slice(0, 240),
            activation_source: "growth-plugin:legacy-card-retirement",
            raw_json: retirementRaw(row, candidate, Object.assign({}, input, { now })),
            updated_at: now
          });
        }
        cancelledJobs = input.cancelOpenJobs === false
          ? { count: 0, jobIds: [] }
          : cancelOpenJobs(db, planned.candidates.map((candidate) => candidate.taskCardId), Object.assign({}, input, { now }));
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
      const after = candidatesFromDb(db, input);
      return Object.assign({}, planned, {
        mode: "write",
        write: true,
        retired_count: retiredCount,
        cancelled_evaluation_jobs: cancelledJobs,
        remaining_candidates: after.summary.candidateCount,
        retired_at: now
      });
    } finally {
      db.close();
    }
  }

  return {
    listRegenerableCards,
    retireRegenerableCards
  };
}

module.exports = {
  HIDDEN_CARD_STATUSES,
  OPEN_EVALUATION_JOB_STATUSES,
  createCardRetirementRepository
};
