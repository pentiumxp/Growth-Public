"use strict";

const {
  asArray,
  cleanString,
  numberValue,
  parseJson,
  tableColumns,
  tableExists
} = require("./core");

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

function boundedText(value, max = 280) {
  return cleanString(value).slice(0, max);
}

function firstValue(row = {}, keys = []) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && cleanString(value)) return value;
  }
  return "";
}

function rawObject(row = {}) {
  return isObject(row.raw_json) ? row.raw_json : parseJson(row.raw_json, {});
}

function graphPlanNodeIds(plan = {}) {
  const firstCard = asArray(plan.cardSequence)[0] || {};
  return uniqueStrings(
    asArray(plan.pathNodeIds)
      .concat(plan.targetNodeId)
      .concat(firstCard.targetNodeIds || [])
      .concat(plan.prerequisiteNodeIds || [])
      .concat(plan.assessmentCoverage || [])
  );
}

function filterClause(columns = [], filters = {}) {
  const clauses = [];
  const values = [];
  for (const [field, value] of [
    ["workspace_id", filters.workspaceId],
    ["learner_id", filters.learnerId],
    ["program_id", filters.programId]
  ]) {
    const clean = cleanString(value);
    if (clean && columns.includes(field)) {
      clauses.push(`${field} = ?`);
      values.push(clean);
    }
  }
  return {
    sql: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "",
    values
  };
}

function orderColumn(columns = [], candidates = []) {
  return candidates.find((column) => columns.includes(column)) || "";
}

function recentRows(db, tableName, filters = {}, limit = 20, orderCandidates = []) {
  if (!tableExists(db, tableName)) return [];
  const columns = tableColumns(db, tableName);
  const where = filterClause(columns, filters);
  const order = orderColumn(columns, orderCandidates.concat(["updated_at", "created_at", "id"]));
  const orderSql = order ? ` ORDER BY ${order} DESC` : "";
  const max = Math.max(1, Math.min(100, Number(limit || 20) || 20));
  return db.prepare(`SELECT * FROM ${tableName}${where.sql}${orderSql} LIMIT ?`).all(...where.values, max);
}

function countRows(db, tableName, filters = {}) {
  if (!tableExists(db, tableName)) return 0;
  const columns = tableColumns(db, tableName);
  const where = filterClause(columns, filters);
  return Number(db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}${where.sql}`).get(...where.values)?.count || 0);
}

function latestEvaluationByTask(db, taskCardId) {
  if (!tableExists(db, "learning_evaluations")) return null;
  const columns = tableColumns(db, "learning_evaluations");
  if (!columns.includes("task_card_id")) return null;
  const order = orderColumn(columns, ["created_at", "updated_at", "id"]);
  const orderSql = order ? ` ORDER BY ${order} DESC` : "";
  return db.prepare(`SELECT * FROM learning_evaluations WHERE task_card_id = ?${orderSql} LIMIT 1`).get(cleanString(taskCardId)) || null;
}

function safeEvaluation(row = {}) {
  if (!row) return null;
  const raw = rawObject(row);
  return {
    evaluationId: cleanString(firstValue(row, ["id", "evaluation_id"])),
    status: cleanString(firstValue(row, ["status", "evaluation_status"])),
    score: numberValue(firstValue(row, ["score", "score_value"])),
    passed: Boolean(Number(row.passed || raw.passed || 0)),
    summary: boundedText(firstValue(row, ["summary", "feedback_summary"]) || raw.summary, 420),
    remainingWeaknesses: asArray(raw.remainingWeaknesses || raw.remaining_weaknesses).map((item) => boundedText(item, 160)).filter(Boolean).slice(0, 5),
    createdAt: cleanString(firstValue(row, ["created_at", "updated_at"]))
  };
}

function targetNodeIdsFromRaw(raw = {}) {
  const graph = raw.learningGraph || raw.learning_graph || {};
  return uniqueStrings(
    graph.targetNodeIds
      || graph.target_node_ids
      || raw.targetNodeIds
      || raw.target_node_ids
      || raw.skillIds
      || []
  );
}

function safeCard(row = {}, evaluation = null) {
  const raw = rawObject(row);
  return {
    taskCardId: cleanString(firstValue(row, ["id", "task_card_id"])),
    title: boundedText(firstValue(row, ["title"]) || raw.title, 160),
    cardRole: cleanString(firstValue(row, ["card_role", "task_card_type"]) || raw.cardRole),
    status: cleanString(firstValue(row, ["status", "execution_status"])),
    plannedDate: cleanString(firstValue(row, ["planned_date", "due_local", "created_at"])).slice(0, 10),
    targetNodeIds: targetNodeIdsFromRaw(raw),
    learningGraphPlanId: cleanString(raw.learningGraph?.learningGraphPlanId || raw.learning_graph?.learning_graph_plan_id),
    latestEvaluation: evaluation
  };
}

function safeMastery(row = {}) {
  const raw = rawObject(row);
  return {
    nodeId: cleanString(
      firstValue(row, ["node_id", "target_node_id", "skill_id", "capability_cluster_id"])
      || raw.nodeId
      || raw.targetNodeId
      || raw.skillId
    ),
    status: cleanString(firstValue(row, ["status", "mastery_status"]) || raw.status),
    masteryLevel: cleanString(firstValue(row, ["mastery_level", "level"]) || raw.masteryLevel || raw.level),
    score: numberValue(firstValue(row, ["score", "mastery_score"]) || raw.score),
    confidence: numberValue(firstValue(row, ["confidence"]) || raw.confidence),
    evidenceCount: numberValue(firstValue(row, ["evidence_count"]) || raw.evidenceCount),
    summary: boundedText(firstValue(row, ["summary"]) || raw.summary, 320),
    updatedAt: cleanString(firstValue(row, ["updated_at", "created_at"]))
  };
}

function safeExperienceSignal(row = {}) {
  const raw = rawObject(row);
  return {
    signalType: cleanString(
      firstValue(row, ["signal_type", "type", "strategy"])
      || raw.signalType
      || raw.signal_type
      || raw.strategy
    ),
    targetNodeId: cleanString(
      firstValue(row, ["node_id", "target_node_id", "skill_id"])
      || raw.nodeId
      || raw.targetNodeId
      || raw.skillId
    ),
    strength: cleanString(firstValue(row, ["strength", "intensity"]) || raw.strength || raw.intensity),
    summary: boundedText(firstValue(row, ["summary", "rationale"]) || raw.summary || raw.rationale, 260),
    sourceType: cleanString(firstValue(row, ["source_type"]) || raw.sourceType),
    createdAt: cleanString(firstValue(row, ["created_at", "updated_at"]))
  };
}

function syntheticSignalFromCard(card = {}) {
  const evaluation = card.latestEvaluation;
  if (!evaluation) return null;
  let signalType = "right_level";
  const evaluationStatus = cleanString(evaluation.status).toLowerCase();
  if (evaluation.passed || ["completed", "complete", "scored"].includes(evaluationStatus)) signalType = "completed";
  if (["needs_repair", "needs_revision", "draft_feedback", "reflection_required"].includes(evaluation.status)) {
    signalType = "not_learned";
  }
  if (Number(evaluation.score) >= 90 && evaluation.passed) signalType = "challenge_ready";
  return {
    signalType,
    targetNodeId: card.targetNodeIds[0] || "",
    summary: boundedText(evaluation.summary || `Latest evaluation status: ${evaluation.status}`, 260),
    sourceType: "recent_evaluation",
    createdAt: evaluation.createdAt || ""
  };
}

function lastActivityAt(cards = [], experienceSignals = [], masteryStates = []) {
  return [cards, experienceSignals, masteryStates]
    .flat()
    .map((item) => cleanString(item.updatedAt || item.createdAt || item.plannedDate))
    .filter(Boolean)
    .sort()
    .pop() || "";
}

function createLearningHistorySummaryRepository({ open } = {}) {
  function withDb(callback) {
    const db = open(true);
    try {
      return callback(db);
    } finally {
      db.close();
    }
  }

  function summaryForAuthoringPlan(input = {}) {
    return withDb((db) => {
      const plan = input.learningGraphPlan || {};
      const filters = {
        workspaceId: cleanString(input.workspaceId || plan.workspaceId),
        learnerId: cleanString(input.learnerId || plan.learnerId),
        programId: cleanString(input.programId || plan.programId)
      };
      const nodeIds = graphPlanNodeIds(plan);
      const cardRows = recentRows(db, "learning_task_cards", filters, input.cardLimit || 20, ["updated_at", "created_at", "planned_date"]);
      const cards = cardRows.map((row) => safeCard(row, safeEvaluation(latestEvaluationByTask(db, row.id))));
      const relatedCards = cards.filter((card) => {
        if (!card.targetNodeIds.length) return true;
        return card.targetNodeIds.some((nodeId) => nodeIds.includes(nodeId));
      }).slice(0, 12);
      const masteryStates = recentRows(db, "learning_growth_mastery_states", filters, input.masteryLimit || 24, ["updated_at", "created_at"])
        .map(safeMastery)
        .filter((state) => !state.nodeId || nodeIds.includes(state.nodeId))
        .slice(0, 12);
      const storedSignals = recentRows(db, "learning_growth_experience_signals", filters, input.signalLimit || 24, ["created_at", "updated_at"])
        .map(safeExperienceSignal)
        .filter((signal) => signal.signalType)
        .filter((signal) => !signal.targetNodeId || nodeIds.includes(signal.targetNodeId))
        .slice(0, 16);
      const syntheticSignals = relatedCards.map(syntheticSignalFromCard).filter(Boolean);
      const recentExperienceSignals = storedSignals.concat(syntheticSignals).slice(0, 20);
      const completedRecentCardCount = relatedCards.filter((card) => {
        const status = cleanString(card.status).toLowerCase();
        const evaluationStatus = cleanString(card.latestEvaluation?.status).toLowerCase();
        return ["completed", "complete", "done", "closed", "archived"].includes(status)
          || card.latestEvaluation?.passed
          || ["completed", "complete", "scored"].includes(evaluationStatus);
      }).length;
      const activeRecentCardCount = relatedCards.filter((card) => {
        const status = cleanString(card.status).toLowerCase();
        return !["completed", "complete", "done", "closed", "archived", "retired", "cancelled", "canceled"].includes(status);
      }).length;

      return {
        ok: true,
        learnerSummary: {
          workspaceId: filters.workspaceId,
          learnerId: filters.learnerId,
          programId: filters.programId,
          recentCardCount: relatedCards.length,
          completedRecentCardCount,
          activeRecentCardCount,
          submissionCount: countRows(db, "learning_task_submissions", filters),
          evaluationCount: countRows(db, "learning_evaluations", filters),
          reflectionCount: countRows(db, "learning_task_reflections", filters),
          recentCardRoles: uniqueStrings(relatedCards.map((card) => card.cardRole)).slice(0, 6),
          lastActivityAt: lastActivityAt(relatedCards, recentExperienceSignals, masteryStates)
        },
        masterySummary: {
          targetNodeIds: nodeIds,
          masteryStates,
          recentRelatedCards: relatedCards
        },
        recentExperienceSignals,
        sourceSummaries: []
      };
    });
  }

  return {
    summaryForAuthoringPlan
  };
}

module.exports = {
  createLearningHistorySummaryRepository
};
