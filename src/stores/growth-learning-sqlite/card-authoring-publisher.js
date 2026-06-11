"use strict";

const {
  asArray,
  cleanString,
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
      recentExperienceSignals: asArray(request.recentExperienceSignals).slice(0, 20)
    },
    completionPolicy: {
      mode: "daily_score_once",
      evaluationAttempts: 1,
      reflectionAttempts: 1,
      completionAfter: "first_evaluation",
      rewardMode: "score_proportional",
      passScoreRequired: false,
      uiCompatibility: "legacy_growth_card"
    },
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
    program_id: cleanString(learningGraphPlan.programId || request.programId || draft.programId),
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
    stage_assessment_cycle_id: cleanString(draft.stageAssessmentCycleId || draft.stage_assessment_cycle_id),
    activation_state: role === "stage_assessment" ? cleanString(draft.activationState || "active") : cleanString(draft.activationState),
    reward_cap_coins: rewardCap,
    configured_reward_coins: rewardCap,
    default_reward_coins: rewardCap,
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
