"use strict";

const {
  asArray,
  cleanString,
  insertDynamic,
  nowIsoValue,
  tableColumns,
  tableExists,
  upsertDynamic
} = require("./core");
const { ensureLearningGraphSchema } = require("./graph-schema");
const { sha256Hex } = require("./identifiers");
const { publicCardFromRow } = require("./projection");

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function unavailable(error, extra = {}) {
  return Object.assign({ ok: false, error }, extra);
}

function firstPlanCard(plan = {}) {
  return asArray(plan.cardSequence)[0] || {};
}

function stableGeneratedCardId(input = {}) {
  const draft = input.draft || {};
  const plan = input.learningGraphPlan || {};
  const explicit = cleanString(input.taskCardId || draft.taskCardId || draft.id);
  if (explicit) return explicit;
  const generationKey = cleanString(input.generationKey || draft.generationKey)
    || [
      cleanString(draft.learningGraphPlanId || plan.learningGraphPlanId),
      cleanString(draft.cardRole || firstPlanCard(plan).cardRole),
      uniqueStrings(draft.targetNodeIds || firstPlanCard(plan).targetNodeIds).join(","),
      cleanString(draft.schemaVersion || "growth.card.authoring.v1")
    ].join(":");
  return `ltask_${sha256Hex(generationKey).slice(0, 18)}`;
}

function stableDraftId(taskCardId) {
  return `ldraft_${sha256Hex(cleanString(taskCardId)).slice(0, 18)}`;
}

function stableProgramId(input = {}) {
  const draft = input.draft || {};
  const request = input.request || {};
  const plan = input.learningGraphPlan || request.learningGraphPlan || {};
  const explicit = cleanString(plan.programId || request.programId || draft.programId);
  if (explicit) return explicit;
  const workspaceId = cleanString(plan.workspaceId || request.workspaceId || request.learnerSummary?.workspaceId);
  const learnerId = cleanString(plan.learnerId || request.learnerId || request.learnerSummary?.learnerId || workspaceId);
  const domain = domainFromRequest(request);
  return `lprogram_growth_authoring_${sha256Hex(`${workspaceId}:${learnerId}:${domain}`).slice(0, 14)}`;
}

function stableBindingId(taskCardId, learningGraphPlanId) {
  return `lcgb_${sha256Hex(`${cleanString(taskCardId)}:${cleanString(learningGraphPlanId)}`).slice(0, 18)}`;
}

function expectedMinutes(draft = {}) {
  const parsed = Number(draft.expectedTimeMinutes || draft.expectedDurationMinutes || 12);
  if (!Number.isFinite(parsed) || parsed <= 0) return 12;
  return Math.max(5, Math.min(45, Math.round(parsed)));
}

function taskCardType(role = "") {
  const cleanRole = cleanString(role).toLowerCase();
  if (cleanRole === "stage_assessment") return "assessment";
  if (cleanRole === "teaching") return "teaching";
  if (cleanRole === "integration_practice") return "integration_practice";
  return "practice";
}

function defaultRewardCap(role = "") {
  return cleanString(role).toLowerCase() === "stage_assessment" ? 300 : 100;
}

function completionPolicyForRole(role = "") {
  if (cleanString(role).toLowerCase() === "stage_assessment") {
    return {
      mode: "formal_assessment",
      evaluationAttempts: 1,
      reflectionAttempts: 1,
      completionAfter: "formal_reflection",
      rewardMode: "score_proportional",
      passScoreRequired: false,
      uiCompatibility: "legacy_growth_card"
    };
  }
  return {
    mode: "daily_score_once",
    evaluationAttempts: 1,
    reflectionAttempts: 1,
    completionAfter: "first_evaluation",
    rewardMode: "score_proportional",
    passScoreRequired: false,
    uiCompatibility: "legacy_growth_card"
  };
}

function domainFromRequest(request = {}) {
  const firstSource = asArray(request.sourceSummaries)[0] || {};
  return cleanString(firstSource.domain || firstSource.subject || "learning");
}

function capabilityClusterId(draft = {}, request = {}) {
  const firstSource = asArray(request.sourceSummaries)[0] || {};
  return cleanString(
    draft.capabilityClusterId
      || firstSource.subject
      || draft.targetNodeIds?.[0]
      || "growth.learning"
  );
}

function curriculumRefs(request = {}) {
  return asArray(request.sourceSummaries).map((source) => ({
    nodeId: cleanString(source.nodeId),
    title: cleanString(source.title),
    subject: cleanString(source.subject),
    curriculum: cleanString(source.curriculum),
    sourceRef: cleanString(source.sourceRef)
  })).filter((source) => source.nodeId || source.sourceRef).slice(0, 12);
}

function buildRawJson({ draft, request, learningGraphPlan, audit }) {
  const role = cleanString(draft.cardRole);
  const targetNodeIds = uniqueStrings(draft.targetNodeIds);
  const prerequisiteNodeIds = uniqueStrings(draft.prerequisiteNodeIds || learningGraphPlan.prerequisiteNodeIds);
  const assessmentCoverageNodeIds = uniqueStrings(draft.assessmentCoverageNodeIds || learningGraphPlan.assessmentCoverage);
  const evidenceToRecord = uniqueStrings(draft.evidenceToRecord || request.evidenceRequirements);
  const instructionPreview = cleanString(
    draft.instructionPreview
      || draft.learnerInstruction
      || draft.teachingFlow?.learningTarget
      || draft.title
  ).slice(0, 260);
  return {
    source: "growth-card-authoring",
    schemaVersion: cleanString(draft.schemaVersion || request.cardSchemaVersion),
    cardRole: role,
    title: cleanString(draft.title).slice(0, 180),
    instructionPreview,
    learnerInstruction: cleanString(draft.learnerInstruction || instructionPreview).slice(0, 1200),
    teachingFlow: draft.teachingFlow || null,
    difficultyBasis: cleanString(draft.difficultyBasis).slice(0, 700),
    supportLevel: cleanString(draft.supportLevel),
    evidenceToRecord,
    expectedTimeMinutes: expectedMinutes(draft),
    learningGraph: {
      learningGraphPlanId: cleanString(draft.learningGraphPlanId || learningGraphPlan.learningGraphPlanId),
      targetNodeIds,
      prerequisiteNodeIds,
      assessmentCoverageNodeIds,
      evidenceRequired: uniqueStrings(request.evidenceRequirements)
    },
    taskModel: {
      activityType: taskCardType(role),
      learnerInstruction: instructionPreview,
      teachingFlow: draft.teachingFlow || null,
      evidenceToRecord
    },
    experienceSummary: {
      learnerSummary: request.learnerSummary || {},
      masterySummary: request.masterySummary || {},
      recentExperienceSignals: asArray(request.recentExperienceSignals).slice(0, 20),
      recentTrajectory: asArray(request.recentTrajectory).slice(0, 8),
      nextCardStrategy: request.nextCardStrategy || {}
    },
    completionPolicy: completionPolicyForRole(role),
    stageAssessment: role === "stage_assessment" ? {
      cycleId: cleanString(draft.stageAssessmentCycleId || draft.stage_assessment_cycle_id || request.stageAssessmentCycleId || request.stage_assessment_cycle_id),
      activationState: cleanString(draft.activationState || draft.activation_state || request.activationState || request.activation_state || "active"),
      activationReason: cleanString(draft.activationReason || draft.activation_reason || request.activationReason || request.activation_reason),
      activationSource: cleanString(draft.activationSource || draft.activation_source || request.activationSource || request.activation_source),
      cooldownUntil: cleanString(draft.cooldownUntil || draft.cooldown_until || request.cooldownUntil || request.cooldown_until)
    } : null,
    sourceSummaries: asArray(request.sourceSummaries).slice(0, 12),
    authoringAudit: {
      source: cleanString(audit.source || "growth-card-authoring-service"),
      gatewayMode: cleanString(audit.gatewayMode),
      repaired: Boolean(audit.repaired),
      authoredAt: cleanString(audit.authoredAt)
    }
  };
}

function cardValues(input = {}) {
  const draft = input.draft || {};
  const request = input.request || {};
  const learningGraphPlan = input.learningGraphPlan || request.learningGraphPlan || {};
  const role = cleanString(draft.cardRole || request.cardRole || firstPlanCard(learningGraphPlan).cardRole || "teaching");
  const minutes = expectedMinutes(draft);
  const taskCardId = stableGeneratedCardId(input);
  const createdAt = cleanString(input.audit?.authoredAt) || nowIsoValue();
  const updatedAt = nowIsoValue();
  const raw = buildRawJson({ draft, request, learningGraphPlan, audit: input.audit || {} });
  const targetNodeIds = uniqueStrings(draft.targetNodeIds || firstPlanCard(learningGraphPlan).targetNodeIds);
  const rewardCap = defaultRewardCap(role);
  return {
    id: taskCardId,
    program_id: stableProgramId(input),
    draft_id: stableDraftId(taskCardId),
    learner_id: cleanString(learningGraphPlan.learnerId || request.learnerSummary?.learnerId || request.learnerId),
    workspace_id: cleanString(learningGraphPlan.workspaceId || request.learnerSummary?.workspaceId || request.workspaceId),
    kanban_card_id: cleanString(draft.kanbanCardId || draft.kanban_card_id),
    title: cleanString(draft.title).slice(0, 180) || "Growth learning card",
    domain: domainFromRequest(request),
    task_card_type: taskCardType(role),
    status: cleanString(draft.status || "published"),
    planned_date: cleanString(draft.plannedDate || createdAt).slice(0, 10),
    planned_minutes: minutes,
    skill_ids_json: jsonText(targetNodeIds),
    template_id: cleanString(draft.templateId || "growth_card_authoring_v1"),
    interaction_state_machine_json: jsonText([]),
    source_basis_refs_json: jsonText(uniqueStrings([
      `learning_graph_plan:${cleanString(draft.learningGraphPlanId || learningGraphPlan.learningGraphPlanId)}`,
      ...targetNodeIds.map((nodeId) => `learning_graph_node:${nodeId}`)
    ])),
    curriculum_refs_json: jsonText(curriculumRefs(request)),
    privacy_level: "member_self",
    card_role: role,
    capability_cluster_id: capabilityClusterId(draft, request),
    expected_duration_minutes_min: minutes,
    expected_duration_minutes_max: Math.max(minutes, minutes + 5),
    stage_assessment_cycle_id: cleanString(draft.stageAssessmentCycleId || draft.stage_assessment_cycle_id || request.stageAssessmentCycleId || request.stage_assessment_cycle_id),
    activation_state: role === "stage_assessment"
      ? cleanString(draft.activationState || draft.activation_state || request.activationState || request.activation_state || "active")
      : cleanString(draft.activationState || draft.activation_state || request.activationState || request.activation_state),
    activation_reason: cleanString(draft.activationReason || draft.activation_reason || request.activationReason || request.activation_reason),
    activation_source: cleanString(draft.activationSource || draft.activation_source || request.activationSource || request.activation_source || "growth_card_authoring"),
    cooldown_until: cleanString(draft.cooldownUntil || draft.cooldown_until || request.cooldownUntil || request.cooldown_until),
    reward_cap_coins: rewardCap,
    configured_reward_coins: rewardCap,
    default_reward_coins: rewardCap,
    completion_policy_json: jsonText(raw.completionPolicy),
    mastery_evidence_weight: role === "stage_assessment" ? 1 : 0.2,
    reliability_json: jsonText({ source: "growth-card-authoring", confidence: "model_validated" }),
    teaching_flow_json: raw.teachingFlow ? jsonText(raw.teachingFlow) : null,
    experience_summary_json: jsonText(raw.experienceSummary),
    raw_json: jsonText(raw),
    created_at: createdAt,
    updated_at: updatedAt
  };
}

function bindingValues(input = {}, taskCardId = "") {
  const draft = input.draft || {};
  const request = input.request || {};
  const plan = input.learningGraphPlan || request.learningGraphPlan || {};
  const learningGraphPlanId = cleanString(draft.learningGraphPlanId || plan.learningGraphPlanId);
  return {
    binding_id: stableBindingId(taskCardId, learningGraphPlanId),
    task_card_id: cleanString(taskCardId),
    learning_graph_plan_id: learningGraphPlanId,
    node_ids_json: jsonText(uniqueStrings(draft.targetNodeIds || firstPlanCard(plan).targetNodeIds)),
    card_role: cleanString(draft.cardRole || request.cardRole || firstPlanCard(plan).cardRole),
    assessment_coverage_json: jsonText(uniqueStrings(draft.assessmentCoverageNodeIds || plan.assessmentCoverage)),
    repair_metadata_json: jsonText({
      source: "growth-card-authoring-publisher",
      repaired: Boolean(input.audit?.repaired),
      gatewayMode: cleanString(input.audit?.gatewayMode)
    })
  };
}

function requirePlanRow(db, learningGraphPlanId) {
  if (!cleanString(learningGraphPlanId)) return unavailable("learning_graph_plan_required");
  if (!tableExists(db, "learning_graph_plans")) return unavailable("learning_graph_plans_table_missing");
  const row = db.prepare("SELECT learning_graph_plan_id FROM learning_graph_plans WHERE learning_graph_plan_id = ?").get(cleanString(learningGraphPlanId));
  if (!row) return unavailable("learning_graph_plan_not_found", { learningGraphPlanId: cleanString(learningGraphPlanId) });
  return { ok: true };
}

function rowExists(db, tableName, idColumn, id) {
  if (!tableExists(db, tableName)) return false;
  if (!tableColumns(db, tableName).includes(idColumn)) return false;
  return Boolean(db.prepare(`SELECT ${idColumn} FROM ${tableName} WHERE ${idColumn} = ? LIMIT 1`).get(cleanString(id)));
}

function weekEndFromStart(date = "") {
  const start = cleanString(date).slice(0, 10);
  const parsed = Date.parse(`${start}T00:00:00.000Z`);
  if (!start || !Number.isFinite(parsed)) return start;
  return new Date(parsed + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function sourceBasisRefs(input = {}, taskValues = {}) {
  const draft = input.draft || {};
  const plan = input.learningGraphPlan || input.request?.learningGraphPlan || {};
  return uniqueStrings([
    `growth_card_authoring:${cleanString(taskValues.id)}`,
    cleanString(plan.learningGraphPlanId) ? `learning_graph_plan:${cleanString(plan.learningGraphPlanId)}` : "",
    ...uniqueStrings(draft.targetNodeIds || firstPlanCard(plan).targetNodeIds).map((nodeId) => `learning_graph_node:${nodeId}`)
  ]);
}

function ensureProgramRow(db, input = {}, taskValues = {}, timestamp = "") {
  if (!tableExists(db, "learning_programs")) return;
  if (!cleanString(taskValues.program_id) || rowExists(db, "learning_programs", "id", taskValues.program_id)) return;
  const request = input.request || {};
  const draft = input.draft || {};
  const refs = sourceBasisRefs(input, taskValues);
  insertDynamic(db, "learning_programs", {
    id: cleanString(taskValues.program_id),
    learner_id: cleanString(taskValues.learner_id),
    workspace_id: cleanString(taskValues.workspace_id),
    title: cleanString(draft.programTitle || request.programTitle || "Growth generated learning cards"),
    domain: cleanString(taskValues.domain || domainFromRequest(request)),
    focus_areas_json: jsonText(uniqueStrings(draft.targetNodeIds || input.learningGraphPlan?.targetNodeIds || [input.learningGraphPlan?.targetNodeId])),
    goal_summary: cleanString(draft.goalSummary || request.goalSummary || "Summary-only Growth card authoring program.").slice(0, 700),
    start_date: cleanString(taskValues.planned_date),
    end_date: cleanString(taskValues.planned_date),
    days_per_week: 1,
    minutes_per_day: expectedMinutes(draft),
    intensity: "daily",
    status: "active",
    source_basis_refs_json: jsonText(refs),
    curriculum_refs_json: jsonText(curriculumRefs(request)),
    constraints_json: jsonText({
      summaryOnly: true,
      generatedBy: "growth-card-authoring-service",
      gatewayOnly: true
    }),
    review_policy_json: jsonText({
      ownerVisible: true,
      parentReviewRequired: false,
      summaryOnly: true
    }),
    raw_json: jsonText({
      source: "growth-card-authoring",
      programId: cleanString(taskValues.program_id),
      workspaceId: cleanString(taskValues.workspace_id),
      learnerId: cleanString(taskValues.learner_id),
      sourceBasisRefs: refs
    }),
    created_at: timestamp,
    updated_at: timestamp,
    archived_at: ""
  });
}

function ensureDraftRow(db, input = {}, taskValues = {}, timestamp = "") {
  if (!tableExists(db, "learning_plan_drafts")) return;
  if (!cleanString(taskValues.draft_id) || rowExists(db, "learning_plan_drafts", "id", taskValues.draft_id)) return;
  const draft = input.draft || {};
  const day = cleanString(taskValues.planned_date || timestamp).slice(0, 10);
  const refs = sourceBasisRefs(input, taskValues);
  insertDynamic(db, "learning_plan_drafts", {
    id: cleanString(taskValues.draft_id),
    program_id: cleanString(taskValues.program_id),
    learner_id: cleanString(taskValues.learner_id),
    workspace_id: cleanString(taskValues.workspace_id),
    status: "published",
    week_start: day,
    week_end: weekEndFromStart(day),
    daily_plans_json: jsonText([{
      date: day,
      plannedMinutes: Number(taskValues.planned_minutes || expectedMinutes(draft)),
      tasks: [{
        taskCardId: cleanString(taskValues.id),
        title: cleanString(taskValues.title),
        cardRole: cleanString(taskValues.card_role),
        targetNodeIds: uniqueStrings(draft.targetNodeIds),
        sourceBasisRefs: refs
      }]
    }]),
    task_count: 1,
    reliability_json: jsonText({ source: "growth-card-authoring", confidence: "model_validated" }),
    raw_json: jsonText({
      source: "growth-card-authoring",
      draftId: cleanString(taskValues.draft_id),
      taskCardId: cleanString(taskValues.id),
      programId: cleanString(taskValues.program_id),
      sourceBasisRefs: refs
    }),
    created_at: timestamp,
    updated_at: timestamp,
    published_at: timestamp
  });
}

function insertBinding(db, values = {}, timestamp = "") {
  db.prepare(`
    INSERT INTO learning_card_graph_bindings(
      binding_id, task_card_id, learning_graph_plan_id, node_ids_json,
      card_role, assessment_coverage_json, repair_metadata_json,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(binding_id) DO UPDATE SET
      task_card_id=excluded.task_card_id,
      learning_graph_plan_id=excluded.learning_graph_plan_id,
      node_ids_json=excluded.node_ids_json,
      card_role=excluded.card_role,
      assessment_coverage_json=excluded.assessment_coverage_json,
      repair_metadata_json=excluded.repair_metadata_json,
      updated_at=excluded.updated_at
  `).run(
    cleanString(values.binding_id),
    cleanString(values.task_card_id),
    cleanString(values.learning_graph_plan_id),
    values.node_ids_json || "[]",
    cleanString(values.card_role),
    values.assessment_coverage_json || "[]",
    values.repair_metadata_json || "{}",
    timestamp,
    timestamp
  );
}

function createLearningCardAuthoringPublisherRepository({ open, now } = {}) {
  const clock = typeof now === "function" ? now : () => new Date();

  function withDb(callback) {
    const db = open(false);
    try {
      return callback(db);
    } finally {
      db.close();
    }
  }

  function publishAuthoringDraft(input = {}) {
    return withDb((db) => {
      ensureLearningGraphSchema(db);
      if (!tableExists(db, "learning_task_cards")) return unavailable("learning_task_cards_table_missing", { stage: "publish" });
      const learningGraphPlanId = cleanString(input.draft?.learningGraphPlanId || input.learningGraphPlan?.learningGraphPlanId || input.request?.learningGraphPlan?.learningGraphPlanId);
      const planCheck = requirePlanRow(db, learningGraphPlanId);
      if (!planCheck.ok) return Object.assign(planCheck, { stage: "publish" });
      const taskValues = cardValues(input);
      const binding = bindingValues(input, taskValues.id);
      const timestamp = clock().toISOString();
      db.exec("BEGIN IMMEDIATE");
      try {
        ensureProgramRow(db, input, taskValues, timestamp);
        ensureDraftRow(db, input, taskValues, timestamp);
        upsertDynamic(db, "learning_task_cards", taskValues, "id");
        insertBinding(db, binding, timestamp);
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        return unavailable("card_authoring_publish_failed", {
          stage: "publish",
          detail: cleanString(err.message || err)
        });
      }
      const columns = tableColumns(db, "learning_task_cards");
      const row = columns.includes("id")
        ? db.prepare("SELECT * FROM learning_task_cards WHERE id = ?").get(taskValues.id)
        : null;
      return {
        ok: true,
        taskCardId: taskValues.id,
        bindingId: binding.binding_id,
        learningGraphPlanId,
        transaction: "committed",
        card: row ? publicCardFromRow(db, row, { today: timestamp.slice(0, 10), nowIso: timestamp }) : null
      };
    });
  }

  return {
    publishAuthoringDraft
  };
}

module.exports = {
  createLearningCardAuthoringPublisherRepository,
  stableGeneratedCardId
};
