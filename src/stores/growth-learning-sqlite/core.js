"use strict";

const REQUIRED_GROWTH_TABLES = Object.freeze([
  "learning_schema_migrations",
  "learning_programs",
  "learning_plan_drafts",
  "learning_parent_review_items",
  "learning_publications",
  "learning_sources",
  "learning_goals",
  "learner_profiles",
  "learner_skill_states",
  "learning_curriculum_references",
  "learning_task_cards",
  "learning_growth_experience_signals",
  "learning_growth_stage_assessment_cycles",
  "learning_interaction_sessions",
  "learning_evaluations",
  "learning_task_submissions",
  "learning_task_reflections",
  "learning_task_artifacts",
  "learning_task_audio_blobs",
  "learning_parent_review_requests",
  "learning_reward_settlements",
  "learning_task_series_recommendations",
  "learning_growth_evaluation_jobs",
  "learning_growth_mastery_states",
  "learning_growth_card_trajectories"
]);

function sqlite() {
  return require("node:sqlite");
}

function cleanString(value) {
  return String(value || "").trim();
}

function parseJson(text, fallback) {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (_) {
    return fallback;
  }
}

function numberValue(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseTimeMs(value) {
  const text = cleanString(value);
  if (!text) return 0;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateKey(value) {
  return cleanString(value).slice(0, 10);
}

function todayKey(clock = Date) {
  const now = typeof clock.now === "function" ? new Date(clock.now()) : new Date();
  return Number.isNaN(now.getTime()) ? new Date().toISOString().slice(0, 10) : now.toISOString().slice(0, 10);
}

function nowIsoValue(clock = Date) {
  const now = typeof clock.now === "function" ? new Date(clock.now()) : new Date();
  return Number.isNaN(now.getTime()) ? new Date().toISOString() : now.toISOString();
}

function positiveInteger(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(1, Math.round(parsed));
}

function normalizeRecordType(value) {
  const text = cleanString(value).toLowerCase();
  if (["submission", "submissions", "learning_task_submission"].includes(text)) return "submission";
  if (["reflection", "reflections", "learning_task_reflection"].includes(text)) return "reflection";
  return "";
}

function tableExists(db, tableName) {
  return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName));
}

function tableColumns(db, tableName) {
  if (!tableExists(db, tableName)) return [];
  return db.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => column.name);
}

function countTable(db, tableName, filters = {}) {
  if (!tableExists(db, tableName)) return 0;
  const workspaceId = cleanString(filters.workspaceId);
  if (workspaceId) {
    const columns = tableColumns(db, tableName);
    if (columns.includes("workspace_id")) {
      return Number(db.prepare(`SELECT COUNT(*) AS count FROM ${tableName} WHERE workspace_id = ?`).get(workspaceId)?.count || 0);
    }
    if (columns.includes("learner_workspace_id")) {
      return Number(db.prepare(`SELECT COUNT(*) AS count FROM ${tableName} WHERE learner_workspace_id = ?`).get(workspaceId)?.count || 0);
    }
  }
  return Number(db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get()?.count || 0);
}

function latestByTask(db, tableName, taskCardId, orderColumn) {
  if (!tableExists(db, tableName)) return null;
  return db.prepare(`SELECT * FROM ${tableName} WHERE task_card_id = ? ORDER BY ${orderColumn} DESC LIMIT 1`).get(taskCardId) || null;
}

function insertDynamic(db, tableName, values = {}) {
  const columns = tableColumns(db, tableName).filter((column) => Object.prototype.hasOwnProperty.call(values, column));
  if (!columns.length) return null;
  const placeholders = columns.map(() => "?").join(", ");
  db.prepare(`INSERT INTO ${tableName}(${columns.join(", ")}) VALUES (${placeholders})`).run(...columns.map((column) => values[column]));
  return values;
}

function upsertDynamic(db, tableName, values = {}, conflictColumn = "id") {
  const columns = tableColumns(db, tableName).filter((column) => Object.prototype.hasOwnProperty.call(values, column));
  if (!columns.length) return null;
  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns
    .filter((column) => column !== conflictColumn && column !== "created_at")
    .map((column) => `${column}=excluded.${column}`)
    .join(", ");
  const sql = updates
    ? `INSERT INTO ${tableName}(${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT(${conflictColumn}) DO UPDATE SET ${updates}`
    : `INSERT OR IGNORE INTO ${tableName}(${columns.join(", ")}) VALUES (${placeholders})`;
  db.prepare(sql).run(...columns.map((column) => values[column]));
  return values;
}

module.exports = {
  REQUIRED_GROWTH_TABLES,
  asArray,
  cleanString,
  countTable,
  dateKey,
  insertDynamic,
  latestByTask,
  normalizeRecordType,
  nowIsoValue,
  numberValue,
  parseJson,
  parseTimeMs,
  positiveInteger,
  sqlite,
  tableColumns,
  tableExists,
  todayKey,
  upsertDynamic
};
