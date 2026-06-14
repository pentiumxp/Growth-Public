"use strict";

const {
  asArray,
  cleanString,
  parseJson,
  tableColumns,
  tableExists,
  upsertDynamic
} = require("./core");
const { sha256Hex } = require("./identifiers");

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

function boundedText(value, max = 320) {
  return cleanString(value).slice(0, max);
}

function stableStageAssessmentCycleId(input = {}) {
  const seed = [
    cleanString(input.workspaceId || input.learnerWorkspaceId),
    cleanString(input.learnerId || input.workspaceId || input.learnerWorkspaceId),
    cleanString(input.programId),
    cleanString(input.subjectId),
    cleanString(input.capabilityClusterId),
    uniqueStrings(input.targetNodeIds || input.assessmentCoverageNodeIds || [input.targetNodeId]).join(",")
  ].join(":");
  return `lgsa_${sha256Hex(seed).slice(0, 18)}`;
}

function publicCycle(row = {}) {
  if (!row) return null;
  const raw = parseJson(row.raw_json, {}) || {};
  return {
    cycleId: cleanString(row.id || raw.cycleId),
    workspaceId: cleanString(row.workspace_id || row.learner_workspace_id || raw.workspaceId),
    learnerWorkspaceId: cleanString(row.learner_workspace_id || row.workspace_id || raw.learnerWorkspaceId),
    learnerId: cleanString(row.learner_id || raw.learnerId),
    programId: cleanString(row.program_id || raw.programId),
    subjectId: cleanString(row.subject_id || raw.subjectId),
    capabilityClusterId: cleanString(row.capability_cluster_id || raw.capabilityClusterId),
    targetNodeIds: uniqueStrings(parseJson(row.target_node_ids_json, raw.targetNodeIds || [])),
    status: cleanString(row.status || raw.status),
    activationReason: cleanString(row.activation_reason || raw.activationReason),
    activationSource: cleanString(row.activation_source || raw.activationSource),
    eligibleAt: cleanString(row.eligible_at || raw.eligibleAt),
    activatedAt: cleanString(row.activated_at || raw.activatedAt),
    completedAt: cleanString(row.completed_at || raw.completedAt),
    cooldownUntil: cleanString(row.cooldown_until || raw.cooldownUntil),
    sourceCardIds: uniqueStrings(parseJson(row.source_card_ids_json, raw.sourceCardIds || [])),
    generatedTaskCardId: cleanString(raw.generatedTaskCardId),
    updatedAt: cleanString(row.updated_at || raw.updatedAt),
    createdAt: cleanString(row.created_at || raw.createdAt)
  };
}

function whereForLatest(columns = [], input = {}) {
  const where = [];
  const values = [];
  const workspaceId = cleanString(input.workspaceId || input.learnerWorkspaceId);
  if (workspaceId) {
    if (columns.includes("workspace_id")) {
      where.push("workspace_id = ?");
      values.push(workspaceId);
    } else if (columns.includes("learner_workspace_id")) {
      where.push("learner_workspace_id = ?");
      values.push(workspaceId);
    }
  }
  const learnerId = cleanString(input.learnerId);
  if (learnerId && columns.includes("learner_id")) {
    where.push("learner_id = ?");
    values.push(learnerId);
  }
  const programId = cleanString(input.programId);
  if (programId && columns.includes("program_id")) {
    where.push("program_id = ?");
    values.push(programId);
  }
  const capabilityClusterId = cleanString(input.capabilityClusterId || input.capability_cluster_id);
  if (capabilityClusterId && columns.includes("capability_cluster_id")) {
    where.push("capability_cluster_id = ?");
    values.push(capabilityClusterId);
  }
  const subjectId = cleanString(input.subjectId || input.subject_id);
  if (subjectId && columns.includes("subject_id")) {
    where.push("subject_id = ?");
    values.push(subjectId);
  }
  return { where, values };
}

function cycleValues(input = {}, timestamp = "") {
  const workspaceId = cleanString(input.workspaceId || input.learnerWorkspaceId);
  const learnerId = cleanString(input.learnerId) || workspaceId;
  const targetNodeIds = uniqueStrings(input.targetNodeIds || input.assessmentCoverageNodeIds || [input.targetNodeId]);
  const cycleId = cleanString(input.cycleId || input.id) || stableStageAssessmentCycleId({
    workspaceId,
    learnerId,
    programId: input.programId,
    subjectId: input.subjectId,
    capabilityClusterId: input.capabilityClusterId,
    targetNodeIds
  });
  const raw = {
    summaryOnly: true,
    cycleId,
    workspaceId,
    learnerWorkspaceId: workspaceId,
    learnerId,
    programId: cleanString(input.programId),
    subjectId: cleanString(input.subjectId),
    capabilityClusterId: cleanString(input.capabilityClusterId),
    targetNodeIds,
    status: cleanString(input.status),
    activationReason: cleanString(input.activationReason),
    activationSource: cleanString(input.activationSource),
    sourceCardIds: uniqueStrings(input.sourceCardIds),
    generatedTaskCardId: cleanString(input.generatedTaskCardId),
    note: boundedText(input.note),
    updatedBy: "growth-stage-assessment-cycle-repository",
    updatedAt: timestamp
  };
  return {
    id: cycleId,
    workspace_id: workspaceId,
    learner_workspace_id: workspaceId,
    learner_id: learnerId,
    program_id: cleanString(input.programId),
    subject_id: cleanString(input.subjectId),
    capability_cluster_id: cleanString(input.capabilityClusterId),
    target_node_ids_json: jsonText(targetNodeIds),
    status: cleanString(input.status),
    activation_reason: cleanString(input.activationReason),
    activation_source: cleanString(input.activationSource),
    eligible_at: cleanString(input.eligibleAt),
    activated_at: cleanString(input.activatedAt),
    completed_at: cleanString(input.completedAt),
    cooldown_until: cleanString(input.cooldownUntil),
    source_card_ids_json: jsonText(uniqueStrings(input.sourceCardIds)),
    raw_json: jsonText(raw),
    created_at: cleanString(input.createdAt) || timestamp,
    updated_at: timestamp
  };
}

function createStageAssessmentCycleRepository({ open, now } = {}) {
  const clock = typeof now === "function" ? now : () => new Date();

  function withDb(readOnly, callback) {
    const db = open(readOnly);
    try {
      return callback(db);
    } finally {
      db.close();
    }
  }

  function cycleIdFor(input = {}) {
    return cleanString(input.cycleId || input.id) || stableStageAssessmentCycleId(input);
  }

  function latestCycle(input = {}) {
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_stage_assessment_cycles")) return null;
      const columns = tableColumns(db, "learning_growth_stage_assessment_cycles");
      const { where, values } = whereForLatest(columns, input);
      const orderParts = [];
      if (columns.includes("updated_at")) orderParts.push("updated_at DESC");
      if (columns.includes("created_at")) orderParts.push("created_at DESC");
      orderParts.push("id DESC");
      const sql = `SELECT * FROM learning_growth_stage_assessment_cycles${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY ${orderParts.join(", ")} LIMIT 1`;
      return publicCycle(db.prepare(sql).get(...values) || null);
    });
  }

  function cycleById(cycleId = "") {
    const id = cleanString(cycleId);
    if (!id) return null;
    return withDb(true, (db) => {
      if (!tableExists(db, "learning_growth_stage_assessment_cycles")) return null;
      return publicCycle(db.prepare("SELECT * FROM learning_growth_stage_assessment_cycles WHERE id = ? LIMIT 1").get(id) || null);
    });
  }

  function saveCycle(input = {}) {
    return withDb(false, (db) => {
      if (!tableExists(db, "learning_growth_stage_assessment_cycles")) {
        return { ok: false, available: false, error: "learning_growth_stage_assessment_cycles_missing" };
      }
      const timestamp = cleanString(input.updatedAt) || clock().toISOString();
      const values = cycleValues(input, timestamp);
      upsertDynamic(db, "learning_growth_stage_assessment_cycles", values, "id");
      const row = db.prepare("SELECT * FROM learning_growth_stage_assessment_cycles WHERE id = ?").get(values.id) || null;
      return { ok: true, cycle: publicCycle(row) };
    });
  }

  return {
    cycleById,
    cycleIdFor,
    latestCycle,
    saveCycle
  };
}

module.exports = {
  createStageAssessmentCycleRepository,
  publicCycle,
  stableStageAssessmentCycleId
};
