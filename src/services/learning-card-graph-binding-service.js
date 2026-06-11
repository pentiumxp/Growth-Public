"use strict";

const crypto = require("node:crypto");
const { CARD_ROLES } = require("./learning-graph-plan-service");

function cleanString(value) {
  return String(value || "").trim();
}

function stableId(prefix, value) {
  return `${prefix}_${crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 18)}`;
}

function uniqueStrings(values = []) {
  return Array.from(new Set(values.map(cleanString).filter(Boolean)));
}

function unavailable(error, extra = {}) {
  return Object.assign({ ok: false, error }, extra);
}

function createLearningCardGraphBindingService({ graphRepository } = {}) {
  async function bindCard(input = {}) {
    const taskCardId = cleanString(input.taskCardId);
    const learningGraphPlanId = cleanString(input.learningGraphPlanId);
    const cardRole = cleanString(input.cardRole || "").toLowerCase();
    if (!taskCardId) return unavailable("task_card_id_required");
    if (!learningGraphPlanId) return unavailable("learning_graph_plan_required", { task_card_id: taskCardId });
    if (!CARD_ROLES.includes(cardRole)) return unavailable("invalid_card_role", { card_role: cardRole });

    const plan = graphRepository.plan({ learningGraphPlanId });
    if (!plan) return unavailable("missing_learning_graph_plan", { learning_graph_plan_id: learningGraphPlanId });

    const nodeIds = uniqueStrings(input.nodeIds || plan.cardSequence?.[0]?.targetNodeIds || [plan.targetNodeId]);
    const nodes = graphRepository.nodesByIds({ nodeIds });
    if (nodes.length !== nodeIds.length) {
      return unavailable("missing_binding_node", {
        missing_node_ids: nodeIds.filter((nodeId) => !nodes.some((node) => node.nodeId === nodeId))
      });
    }
    if ((cardRole === "teaching" || cardRole === "practice") && nodeIds.length !== 1) {
      return unavailable("focused_card_requires_one_target_node", { node_ids: nodeIds });
    }

    const assessmentCoverage = uniqueStrings(input.assessmentCoverage || plan.assessmentCoverage || []);
    if (cardRole === "stage_assessment" && assessmentCoverage.length === 0) {
      return unavailable("assessment_coverage_missing", { task_card_id: taskCardId });
    }
    const coverageNodes = graphRepository.nodesByIds({ nodeIds: assessmentCoverage });
    if (coverageNodes.length !== assessmentCoverage.length) {
      return unavailable("missing_assessment_coverage_node", {
        missing_node_ids: assessmentCoverage.filter((nodeId) => !coverageNodes.some((node) => node.nodeId === nodeId))
      });
    }

    const binding = {
      ok: true,
      bindingId: cleanString(input.bindingId) || stableId("lcgb", { taskCardId, learningGraphPlanId, cardRole, nodeIds }),
      taskCardId,
      learningGraphPlanId,
      nodeIds,
      cardRole,
      assessmentCoverage,
      repairMetadata: input.repairMetadata || {}
    };
    return graphRepository.saveCardBinding(binding);
  }

  function validateFormalCard(input = {}) {
    if (input.graphRequired && !cleanString(input.learningGraphPlanId)) {
      return unavailable("learning_graph_plan_required", { task_card_id: cleanString(input.taskCardId) });
    }
    return { ok: true };
  }

  return {
    bindCard,
    validateFormalCard
  };
}

module.exports = { createLearningCardGraphBindingService };
