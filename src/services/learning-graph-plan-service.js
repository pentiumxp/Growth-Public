"use strict";

const crypto = require("node:crypto");

const CARD_ROLES = Object.freeze(["teaching", "practice", "integration_practice", "stage_assessment"]);

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

function createLearningGraphPlanService({ graphRepository } = {}) {
  async function createPlan(input = {}) {
    const targetNodeId = cleanString(input.targetNodeId);
    const cardRole = cleanString(input.cardRole || "teaching").toLowerCase();
    if (!targetNodeId) return unavailable("target_node_required");
    if (!CARD_ROLES.includes(cardRole)) return unavailable("invalid_card_role", { card_role: cardRole });

    const targetNode = graphRepository.node({ nodeId: targetNodeId });
    if (!targetNode) return unavailable("missing_target_node", { target_node_id: targetNodeId });

    const prerequisiteNodeIds = uniqueStrings(graphRepository.prerequisiteNodeIds({ targetNodeId }));
    const prerequisites = graphRepository.nodesByIds({ nodeIds: prerequisiteNodeIds });
    if (prerequisites.length !== prerequisiteNodeIds.length) {
      return unavailable("missing_prerequisite", {
        target_node_id: targetNodeId,
        missing_node_ids: prerequisiteNodeIds.filter((nodeId) => !prerequisites.some((node) => node.nodeId === nodeId))
      });
    }

    const requestedCoverage = uniqueStrings(input.assessmentCoverageNodeIds || input.assessmentCoverage || []);
    if (cardRole === "stage_assessment" && requestedCoverage.length === 0) {
      return unavailable("assessment_coverage_missing", { target_node_id: targetNodeId });
    }
    const assessmentCoverage = cardRole === "stage_assessment" ? requestedCoverage : [];
    const coverageNodes = graphRepository.nodesByIds({ nodeIds: assessmentCoverage });
    if (coverageNodes.length !== assessmentCoverage.length) {
      return unavailable("missing_assessment_coverage_node", {
        missing_node_ids: assessmentCoverage.filter((nodeId) => !coverageNodes.some((node) => node.nodeId === nodeId))
      });
    }

    const targetNodeIds = cardRole === "stage_assessment"
      ? assessmentCoverage
      : uniqueStrings(input.targetNodeIds || [targetNodeId]);
    if ((cardRole === "teaching" || cardRole === "practice") && targetNodeIds.length !== 1) {
      return unavailable("focused_card_requires_one_target_node", { target_node_ids: targetNodeIds });
    }
    const targetNodes = graphRepository.nodesByIds({ nodeIds: targetNodeIds });
    if (targetNodes.length !== targetNodeIds.length) {
      return unavailable("missing_target_node", {
        missing_node_ids: targetNodeIds.filter((nodeId) => !targetNodes.some((node) => node.nodeId === nodeId))
      });
    }

    const plan = {
      ok: true,
      learningGraphPlanId: cleanString(input.learningGraphPlanId) || stableId("lgp", {
        learnerId: cleanString(input.learnerId),
        workspaceId: cleanString(input.workspaceId),
        programId: cleanString(input.programId),
        targetNodeId,
        cardRole,
        targetNodeIds,
        assessmentCoverage
      }),
      learnerId: cleanString(input.learnerId),
      workspaceId: cleanString(input.workspaceId),
      programId: cleanString(input.programId),
      targetNodeId,
      prerequisiteNodeIds,
      pathNodeIds: uniqueStrings(prerequisiteNodeIds.concat(targetNodeIds)),
      cardSequence: [{
        cardRole,
        targetNodeIds,
        difficultyBand: cleanString(input.difficultyBand || targetNode.stage || "foundation"),
        evidenceRequired: uniqueStrings(targetNodes.flatMap((node) => node.evidenceRequired || []))
      }],
      assessmentCoverage,
      sourceBasis: {
        kind: "native_graph",
        refs: uniqueStrings([targetNodeId].concat(targetNodeIds).concat(assessmentCoverage))
      },
      privacyClass: "summary_only"
    };
    return graphRepository.savePlan(plan);
  }

  return { createPlan };
}

module.exports = {
  CARD_ROLES,
  createLearningGraphPlanService
};
