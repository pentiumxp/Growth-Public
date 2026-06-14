"use strict";

const {
  asArray,
  cleanString,
  insertDynamic,
  numberValue,
  parseJson,
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

function scoreTo100(value) {
  const score = numberValue(value);
  if (score > 0 && score <= 1) return Math.round(score * 100);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function stableMasteryStateId(input = {}) {
  const seed = [
    cleanString(input.workspaceId),
    cleanString(input.learnerId),
    cleanString(input.programId),
    cleanString(input.nodeId)
  ].join(":");
  return `lgms_${sha256Hex(seed).slice(0, 18)}`;
}

function stableExperienceSignalId(input = {}) {
  const seed = [
    cleanString(input.sourceRef),
    cleanString(input.workspaceId),
    cleanString(input.learnerId),
    cleanString(input.nodeId),
    cleanString(input.signalType)
  ].join(":");
  return `lges_${sha256Hex(seed).slice(0, 18)}`;
}

function stableTrajectoryId(input = {}) {
  const seed = [
    cleanString(input.taskCardId),
    cleanString(input.sourceEvaluationId),
    cleanString(input.workspaceId),
    cleanString(input.learnerId)
  ].join(":");
  return `lgtraj_${sha256Hex(seed).slice(0, 18)}`;
}

function rawObject(row = {}) {
  return parseJson(row.raw_json, {}) || {};
}

function publicMasteryState(row = {}) {
  if (!row) return null;
  const raw = rawObject(row);
  return {
    id: cleanString(row.id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    nodeId: cleanString(row.node_id || raw.nodeId),
    status: cleanString(row.status || raw.status),
    masteryLevel: cleanString(row.mastery_level || raw.masteryLevel),
    score: scoreTo100(row.score || raw.score),
    confidence: numberValue(row.confidence || raw.confidence),
    evidenceCount: Number(row.evidence_count || raw.evidenceCount || 0) || 0,
    summary: boundedText(row.summary || raw.summary, 320),
    updatedAt: cleanString(row.updated_at || raw.updatedAt),
    evidenceRefs: uniqueStrings(raw.evidenceRefs).slice(0, 20),
    typicalWeaknesses: asArray(raw.typicalWeaknesses).map((item) => boundedText(item, 160)).filter(Boolean).slice(0, 8)
  };
}

function publicExperienceSignal(row = {}) {
  if (!row) return null;
  const raw = rawObject(row);
  return {
    id: cleanString(row.id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    targetNodeId: cleanString(row.node_id || raw.targetNodeId),
    signalType: cleanString(row.signal_type || raw.signalType),
    strength: cleanString(row.strength || raw.strength),
    summary: boundedText(row.summary || raw.summary, 260),
    sourceType: cleanString(row.source_type || raw.sourceType),
    sourceRef: cleanString(raw.sourceRef),
    createdAt: cleanString(row.created_at || raw.createdAt)
  };
}

function publicTrajectory(row = {}) {
  if (!row) return null;
  const raw = rawObject(row);
  return {
    id: cleanString(row.id),
    workspaceId: cleanString(row.workspace_id),
    learnerId: cleanString(row.learner_id),
    programId: cleanString(row.program_id),
    taskCardId: cleanString(row.task_card_id),
    sourceEvaluationId: cleanString(row.source_evaluation_id || raw.sourceEvaluationId),
    strategy: cleanString(row.strategy || raw.strategy),
    difficultyBand: cleanString(row.difficulty_band || raw.difficultyBand),
    targetNodeIds: uniqueStrings(parseJson(row.target_node_ids_json, raw.targetNodeIds || [])),
    performanceSummary: boundedText(row.performance_summary || raw.performanceSummary, 360),
    confirmedStrengths: asArray(parseJson(row.confirmed_strengths_json, raw.confirmedStrengths || [])).map((item) => boundedText(item, 160)).filter(Boolean).slice(0, 8),
    remainingWeaknesses: asArray(parseJson(row.remaining_weaknesses_json, raw.remainingWeaknesses || [])).map((item) => boundedText(item, 160)).filter(Boolean).slice(0, 8),
    masteryChanges: asArray(parseJson(row.mastery_changes_json, raw.masteryChanges || [])).slice(0, 12),
    nextRecommendation: parseJson(row.next_recommendation_json, raw.nextRecommendation || {}) || {},
    createdAt: cleanString(row.created_at || raw.createdAt),
    updatedAt: cleanString(row.updated_at || raw.updatedAt)
  };
}

function recommendationStatus(recommendation = {}) {
  return cleanString(recommendation.status || recommendation.recommendationStatus).toLowerCase();
}

function hasRecommendationPayload(recommendation = {}) {
  return Boolean(recommendation && typeof recommendation === "object" && Object.keys(recommendation).length);
}

function isPendingRecommendation(recommendation = {}) {
  if (!hasRecommendationPayload(recommendation)) return false;
  const status = recommendationStatus(recommendation);
  return !status || status === "pending";
}

function selectByWorkspace(db, tableName, input = {}, order = "updated_at DESC", limit = 24) {
  if (!tableExists(db, tableName)) return [];
  const values = [];
  const where = [];
  const workspaceId = cleanString(input.workspaceId);
  const learnerId = cleanString(input.learnerId);
  const programId = cleanString(input.programId);
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
  const max = Math.max(1, Math.min(100, Number(limit || 24) || 24));
  return db.prepare(`SELECT * FROM ${tableName}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY ${order} LIMIT ?`)
    .all(...values, max);
}

function createMasteryProfileRepository({ open } = {}) {
  function withDb(readOnly, callback) {
    const db = open(readOnly);
    try {
      return callback(db);
    } finally {
      db.close();
    }
  }

  function recordMasteryEvidence(input = {}) {
    return withDb(false, (db) => {
      if (!tableExists(db, "learning_growth_mastery_states")) {
        return { ok: false, available: false, error: "learning_growth_mastery_states_missing" };
      }
      const workspaceId = cleanString(input.workspaceId);
      const learnerId = cleanString(input.learnerId) || workspaceId;
      const nodeId = cleanString(input.nodeId);
      if (!workspaceId || !nodeId) return { ok: false, error: "mastery_profile_target_required" };
      const programId = cleanString(input.programId);
      const evidenceRef = cleanString(input.evidenceRef);
      const id = cleanString(input.id) || stableMasteryStateId({ workspaceId, learnerId, programId, nodeId });
      const existing = db.prepare("SELECT * FROM learning_growth_mastery_states WHERE id = ?").get(id) || null;
      const existingState = publicMasteryState(existing);
      if (existingState && evidenceRef && existingState.evidenceRefs.includes(evidenceRef)) {
        return { ok: true, duplicate: true, state: existingState };
      }
      const oldCount = existingState?.evidenceCount || 0;
      const nextCount = oldCount + 1;
      const nextScore = oldCount
        ? Math.round(((existingState.score * oldCount) + scoreTo100(input.score)) / nextCount)
        : scoreTo100(input.score);
      const evidenceRefs = uniqueStrings([...(existingState?.evidenceRefs || []), evidenceRef]).slice(-20);
      const typicalWeaknesses = uniqueStrings([...(existingState?.typicalWeaknesses || []), ...(input.typicalWeaknesses || [])]).slice(-8);
      const raw = {
        summaryOnly: true,
        evidenceRefs,
        lastEvidenceRef: evidenceRef,
        lastSignalType: cleanString(input.signalType),
        typicalWeaknesses,
        sourceType: cleanString(input.sourceType || "evaluation"),
        updatedBy: "growth-learning-mastery-profile-service"
      };
      const values = {
        id,
        workspace_id: workspaceId,
        learner_id: learnerId,
        program_id: programId,
        node_id: nodeId,
        status: cleanString(input.status || existingState?.status || "developing"),
        mastery_level: cleanString(input.masteryLevel || existingState?.masteryLevel || ""),
        score: nextScore,
        confidence: Math.max(numberValue(existingState?.confidence), numberValue(input.confidence)),
        evidence_count: nextCount,
        summary: boundedText(input.summary || existingState?.summary, 320),
        updated_at: cleanString(input.recordedAt) || new Date().toISOString(),
        raw_json: jsonText(raw)
      };
      upsertDynamic(db, "learning_growth_mastery_states", values);
      const state = publicMasteryState(db.prepare("SELECT * FROM learning_growth_mastery_states WHERE id = ?").get(id));
      return { ok: true, duplicate: false, state, previousState: existingState };
    });
  }

  function recordExperienceSignal(input = {}) {
    return withDb(false, (db) => {
      if (!tableExists(db, "learning_growth_experience_signals")) {
        return { ok: false, available: false, error: "learning_growth_experience_signals_missing" };
      }
      const workspaceId = cleanString(input.workspaceId);
      const learnerId = cleanString(input.learnerId) || workspaceId;
      const nodeId = cleanString(input.nodeId || input.targetNodeId);
      const signalType = cleanString(input.signalType);
      if (!workspaceId || !signalType) return { ok: false, error: "experience_signal_target_required" };
      const sourceRef = cleanString(input.sourceRef || input.evidenceRef);
      const id = cleanString(input.id) || stableExperienceSignalId({ workspaceId, learnerId, nodeId, signalType, sourceRef });
      const existing = db.prepare("SELECT * FROM learning_growth_experience_signals WHERE id = ?").get(id) || null;
      if (existing) return { ok: true, duplicate: true, signal: publicExperienceSignal(existing) };
      const values = {
        id,
        workspace_id: workspaceId,
        learner_id: learnerId,
        program_id: cleanString(input.programId),
        node_id: nodeId,
        signal_type: signalType,
        strength: cleanString(input.strength || "medium"),
        summary: boundedText(input.summary, 260),
        source_type: cleanString(input.sourceType || "evaluation"),
        created_at: cleanString(input.createdAt || input.recordedAt) || new Date().toISOString(),
        raw_json: jsonText({
          summaryOnly: true,
          sourceRef,
          targetNodeId: nodeId,
          updatedBy: "growth-learning-mastery-profile-service"
        })
      };
      insertDynamic(db, "learning_growth_experience_signals", values);
      return { ok: true, duplicate: false, signal: publicExperienceSignal(db.prepare("SELECT * FROM learning_growth_experience_signals WHERE id = ?").get(id)) };
    });
  }

  function supersedeOlderPendingTrajectoryRecommendations(db, input = {}) {
    const workspaceId = cleanString(input.workspaceId);
    const learnerId = cleanString(input.learnerId) || workspaceId;
    const programId = cleanString(input.programId);
    const currentTrajectoryId = cleanString(input.currentTrajectoryId);
    const now = cleanString(input.statusUpdatedAt) || new Date().toISOString();
    if (!workspaceId || !learnerId || !currentTrajectoryId) return [];
    const rows = db.prepare(`
      SELECT * FROM learning_growth_card_trajectories
      WHERE workspace_id = ?
        AND learner_id = ?
        AND id <> ?
        AND (? = '' OR program_id = ?)
      ORDER BY updated_at DESC
      LIMIT 100
    `).all(workspaceId, learnerId, currentTrajectoryId, programId, programId);
    const supersededIds = [];
    for (const row of rows) {
      const recommendation = parseJson(row.next_recommendation_json, {}) || {};
      if (!isPendingRecommendation(recommendation)) continue;
      const nextRecommendation = Object.assign({}, recommendation, {
        status: "superseded",
        supersededAt: now,
        statusUpdatedAt: now,
        supersededByTrajectoryId: currentTrajectoryId,
        supersededBy: "growth-learning-card-trajectory-service"
      });
      db.prepare(`
        UPDATE learning_growth_card_trajectories
        SET next_recommendation_json = ?, updated_at = ?
        WHERE id = ?
      `).run(jsonText(nextRecommendation), now, row.id);
      supersededIds.push(cleanString(row.id));
    }
    return supersededIds;
  }

  function recordCardTrajectory(input = {}) {
    return withDb(false, (db) => {
      if (!tableExists(db, "learning_growth_card_trajectories")) {
        return { ok: false, available: false, error: "learning_growth_card_trajectories_missing" };
      }
      const workspaceId = cleanString(input.workspaceId);
      const learnerId = cleanString(input.learnerId) || workspaceId;
      const taskCardId = cleanString(input.taskCardId);
      const sourceEvaluationId = cleanString(input.sourceEvaluationId);
      if (!workspaceId || !taskCardId) return { ok: false, error: "card_trajectory_target_required" };
      const id = cleanString(input.id) || stableTrajectoryId({ workspaceId, learnerId, taskCardId, sourceEvaluationId });
      const existing = db.prepare("SELECT * FROM learning_growth_card_trajectories WHERE id = ?").get(id) || null;
      if (existing) return { ok: true, duplicate: true, trajectory: publicTrajectory(existing) };
      const now = cleanString(input.createdAt || input.recordedAt) || new Date().toISOString();
      const values = {
        id,
        workspace_id: workspaceId,
        learner_id: learnerId,
        program_id: cleanString(input.programId),
        task_card_id: taskCardId,
        source_evaluation_id: sourceEvaluationId,
        strategy: cleanString(input.strategy),
        difficulty_band: cleanString(input.difficultyBand),
        target_node_ids_json: jsonText(uniqueStrings(input.targetNodeIds)),
        performance_summary: boundedText(input.performanceSummary, 360),
        confirmed_strengths_json: jsonText(asArray(input.confirmedStrengths).map((item) => boundedText(item, 160)).filter(Boolean).slice(0, 8)),
        remaining_weaknesses_json: jsonText(asArray(input.remainingWeaknesses).map((item) => boundedText(item, 160)).filter(Boolean).slice(0, 8)),
        mastery_changes_json: jsonText(asArray(input.masteryChanges).slice(0, 12)),
        next_recommendation_json: jsonText(input.nextRecommendation || {}),
        raw_json: jsonText({
          summaryOnly: true,
          sourceEvaluationId,
          generatedBy: "growth-learning-card-trajectory-service"
        }),
        created_at: now,
        updated_at: now
      };
      insertDynamic(db, "learning_growth_card_trajectories", values);
      const supersededRecommendationIds = supersedeOlderPendingTrajectoryRecommendations(db, {
        workspaceId,
        learnerId,
        programId: values.program_id,
        currentTrajectoryId: id,
        statusUpdatedAt: now
      });
      return {
        ok: true,
        duplicate: false,
        trajectory: publicTrajectory(db.prepare("SELECT * FROM learning_growth_card_trajectories WHERE id = ?").get(id)),
        supersededRecommendationIds
      };
    });
  }

  function markTrajectoryRecommendationAccepted(input = {}) {
    return withDb(false, (db) => {
      if (!tableExists(db, "learning_growth_card_trajectories")) {
        return { ok: false, available: false, error: "learning_growth_card_trajectories_missing" };
      }
      const trajectoryId = cleanString(input.trajectoryId || input.id);
      const workspaceId = cleanString(input.workspaceId);
      const learnerId = cleanString(input.learnerId);
      const programId = cleanString(input.programId);
      const sourceTaskCardId = cleanString(input.sourceTaskCardId);
      const sourceEvaluationId = cleanString(input.sourceEvaluationId);
      let row = null;
      if (trajectoryId) {
        const filters = [];
        const values = [trajectoryId];
        if (workspaceId) {
          filters.push("workspace_id = ?");
          values.push(workspaceId);
        }
        if (learnerId) {
          filters.push("learner_id = ?");
          values.push(learnerId);
        }
        row = db.prepare(`SELECT * FROM learning_growth_card_trajectories WHERE id = ?${filters.length ? ` AND ${filters.join(" AND ")}` : ""} LIMIT 1`).get(...values) || null;
      }
      if (!row && (sourceTaskCardId || sourceEvaluationId)) {
        const filters = [];
        const values = [];
        if (workspaceId) {
          filters.push("workspace_id = ?");
          values.push(workspaceId);
        }
        if (learnerId) {
          filters.push("learner_id = ?");
          values.push(learnerId);
        }
        if (programId) {
          filters.push("program_id = ?");
          values.push(programId);
        }
        if (sourceTaskCardId) {
          filters.push("task_card_id = ?");
          values.push(sourceTaskCardId);
        }
        if (sourceEvaluationId) {
          filters.push("source_evaluation_id = ?");
          values.push(sourceEvaluationId);
        }
        row = filters.length
          ? db.prepare(`SELECT * FROM learning_growth_card_trajectories WHERE ${filters.join(" AND ")} ORDER BY updated_at DESC LIMIT 1`).get(...values) || null
          : null;
      }
      if (!row) {
        return { ok: false, available: true, error: "trajectory_recommendation_not_found" };
      }
      const existingRecommendation = parseJson(row.next_recommendation_json, {}) || {};
      const existingStatus = cleanString(existingRecommendation.status).toLowerCase();
      if (existingStatus === "accepted") {
        return { ok: true, duplicate: true, trajectory: publicTrajectory(row) };
      }
      const acceptedAt = cleanString(input.acceptedAt || input.statusUpdatedAt) || new Date().toISOString();
      const nextRecommendation = Object.assign({}, existingRecommendation, {
        status: "accepted",
        acceptedAt,
        statusUpdatedAt: acceptedAt,
        generatedTaskCardId: cleanString(input.generatedTaskCardId),
        generatedLearningGraphPlanId: cleanString(input.generatedLearningGraphPlanId || input.learningGraphPlanId),
        acceptedBy: "growth-learning-card-generation-service"
      });
      db.prepare(`
        UPDATE learning_growth_card_trajectories
        SET next_recommendation_json = ?, updated_at = ?
        WHERE id = ?
      `).run(jsonText(nextRecommendation), acceptedAt, row.id);
      const updated = db.prepare("SELECT * FROM learning_growth_card_trajectories WHERE id = ?").get(row.id);
      return {
        ok: true,
        duplicate: false,
        previousStatus: existingStatus || "pending",
        trajectory: publicTrajectory(updated)
      };
    });
  }

  function projectForNextCard(input = {}) {
    return withDb(true, (db) => {
      const targetNodeIds = uniqueStrings(input.targetNodeIds || input.nodeIds);
      const masteryStates = tableExists(db, "learning_growth_mastery_states")
        ? selectByWorkspace(db, "learning_growth_mastery_states", input, "updated_at DESC", input.masteryLimit || 24)
          .map(publicMasteryState)
          .filter((state) => !targetNodeIds.length || targetNodeIds.includes(state.nodeId))
        : [];
      const recentExperienceSignals = tableExists(db, "learning_growth_experience_signals")
        ? selectByWorkspace(db, "learning_growth_experience_signals", input, "created_at DESC", input.signalLimit || 24)
          .map(publicExperienceSignal)
          .filter((signal) => !targetNodeIds.length || !signal.targetNodeId || targetNodeIds.includes(signal.targetNodeId))
        : [];
      const recentTrajectory = tableExists(db, "learning_growth_card_trajectories")
        ? selectByWorkspace(db, "learning_growth_card_trajectories", input, "updated_at DESC", input.trajectoryLimit || 12).map(publicTrajectory)
        : [];
      const weaknesses = masteryStates
        .filter((state) => ["needs_repair", "developing", "unstable"].includes(cleanString(state.status).toLowerCase()) || state.score < 60)
        .slice(0, 8);
      const strengths = masteryStates
        .filter((state) => ["strengthening", "mastered", "stable"].includes(cleanString(state.status).toLowerCase()) || state.score >= 85)
        .slice(0, 8);
      return {
        ok: true,
        masterySummary: {
          targetNodeIds,
          masteryStates,
          strengths,
          weaknesses
        },
        recentExperienceSignals,
        recentTrajectory
      };
    });
  }

  return {
    markTrajectoryRecommendationAccepted,
    projectForNextCard,
    recordCardTrajectory,
    recordExperienceSignal,
    recordMasteryEvidence
  };
}

module.exports = {
  createMasteryProfileRepository,
  publicExperienceSignal,
  publicMasteryState,
  publicTrajectory,
  stableExperienceSignalId,
  stableMasteryStateId,
  stableTrajectoryId
};
