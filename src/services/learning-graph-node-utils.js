"use strict";

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

function taskRaw(taskCard = {}, taskRawOverride = {}) {
  return Object.assign(
    {},
    parseJson(taskCard.raw_json, {}),
    parseJson(taskCard.rawJson, {}),
    taskRawOverride && typeof taskRawOverride === "object" ? taskRawOverride : {}
  );
}

function graphNodeIdsFromTaskCard(taskCard = {}, taskRawOverride = {}) {
  const raw = taskRaw(taskCard, taskRawOverride);
  const graphNodeIds = uniqueStrings(
    asArray(raw.learningGraph?.targetNodeIds)
      .concat(raw.learningGraph?.assessmentCoverageNodeIds || [])
      .concat(raw.learningGraph?.assessment_coverage_node_ids || [])
      .concat(raw.learning_graph?.target_node_ids || [])
      .concat(raw.learning_graph?.assessment_coverage_node_ids || [])
      .concat(raw.targetNodeIds || [])
      .concat(raw.target_node_ids || [])
      .concat(raw.assessmentCoverageNodeIds || [])
      .concat(raw.assessment_coverage_node_ids || [])
      .concat(parseJson(taskCard.skill_ids_json, []))
      .concat(parseJson(taskCard.assessment_coverage_json, []))
  );
  if (graphNodeIds.length) return graphNodeIds;
  return uniqueStrings([taskCard.capability_cluster_id || taskCard.capabilityClusterId]);
}

function graphNodeIdsFromEvaluation(input = {}) {
  return uniqueStrings(
    asArray(input.evaluation?.skillResults).flatMap((item) => [
      item.nodeId,
      item.targetNodeId,
      item.skillId,
      item.graphNodeId
    ]).concat(
      asArray(input.evaluation?.rubricResults).flatMap((item) => [
        item.nodeId,
        item.targetNodeId,
        item.graphNodeId
      ])
    )
  );
}

module.exports = {
  graphNodeIdsFromEvaluation,
  graphNodeIdsFromTaskCard
};
