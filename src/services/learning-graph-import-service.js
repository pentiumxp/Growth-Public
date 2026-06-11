"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const SUPPORTED_SCHEMA_VERSION = "hermes.learningGraphSeed.v0.1";
const REQUIRED_ROOT_FIELDS = ["schemaVersion", "importId", "version", "privacyClass", "sourceDocuments", "domainPacks", "nodes", "edges"];
const REQUIRED_DOMAIN_PACK_FIELDS = ["domainPackId", "domain", "title", "sourceKind", "version", "visibility", "importStatus"];
const REQUIRED_NODE_FIELDS = ["nodeId", "domain", "nodeType", "title", "sourceKind", "sourceRef", "version", "privacyClass"];
const REQUIRED_EDGE_FIELDS = ["edgeId", "fromNodeId", "toNodeId", "edgeType", "sourceRef"];
const UNSAFE_KEY_PATTERN = /(?:raw|full).*(?:text|body|content)|answer.*key|transcript|prompt|private.*payload|access.*key|password|cookie|secret/i;

function cleanString(value) {
  return String(value || "").trim();
}

function addIssue(target, code, detail = {}) {
  target.push(Object.assign({ code }, detail));
}

function countBy(values) {
  const counts = {};
  for (const value of values) {
    const key = cleanString(value) || "unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function boundedSample(values, limit = 20) {
  return values.slice(0, Math.max(0, limit));
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function safeSourceFile(sourcePath) {
  return path.basename(cleanString(sourcePath));
}

function findUnsafeKeys(value, location = "$", out = []) {
  if (!value || typeof value !== "object") return out;
  if (Array.isArray(value)) {
    value.slice(0, 5000).forEach((item, index) => findUnsafeKeys(item, `${location}[${index}]`, out));
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    const childLocation = `${location}.${key}`;
    if (UNSAFE_KEY_PATTERN.test(key)) {
      out.push({ path: childLocation, key });
      if (out.length >= 50) return out;
    }
    findUnsafeKeys(child, childLocation, out);
    if (out.length >= 50) return out;
  }
  return out;
}

function findDuplicateIds(records, idField) {
  const seen = new Set();
  const duplicates = [];
  for (const record of records) {
    const id = cleanString(record?.[idField]);
    if (!id) continue;
    if (seen.has(id)) duplicates.push(id);
    else seen.add(id);
  }
  return duplicates;
}

function missingRequiredFields(record, requiredFields) {
  return requiredFields.filter((field) => cleanString(record?.[field]) === "");
}

function findPrerequisiteCycles(nodes, edges) {
  const nodeIds = new Set(nodes.map((node) => cleanString(node.nodeId)).filter(Boolean));
  const graph = new Map([...nodeIds].map((nodeId) => [nodeId, []]));
  for (const edge of edges) {
    if (edge.edgeType !== "prerequisite") continue;
    const from = cleanString(edge.fromNodeId);
    const to = cleanString(edge.toNodeId);
    if (nodeIds.has(from) && nodeIds.has(to)) graph.get(from).push(to);
  }

  const visiting = new Set();
  const visited = new Set();
  const cycles = [];

  function visit(nodeId, stack) {
    if (visiting.has(nodeId)) {
      const start = stack.indexOf(nodeId);
      cycles.push(stack.slice(start).concat(nodeId));
      return;
    }
    if (visited.has(nodeId)) return;
    visiting.add(nodeId);
    stack.push(nodeId);
    for (const next of graph.get(nodeId) || []) visit(next, stack);
    stack.pop();
    visiting.delete(nodeId);
    visited.add(nodeId);
  }

  for (const nodeId of nodeIds) {
    if (cycles.length >= 20) break;
    visit(nodeId, []);
  }
  return cycles;
}

function validateLearningGraphPack(pack, options = {}) {
  const errors = [];
  const warnings = [];
  const rejectedRecords = [];
  const rootMissing = REQUIRED_ROOT_FIELDS.filter((field) => pack?.[field] === undefined || pack?.[field] === null || pack?.[field] === "");
  if (rootMissing.length) addIssue(errors, "missing_root_fields", { fields: rootMissing });
  if (pack?.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    addIssue(errors, "unsupported_schema_version", { schemaVersion: pack?.schemaVersion || "" });
  }
  if (pack?.privacyClass !== "summary_only") {
    addIssue(errors, "invalid_root_privacy_class", { privacyClass: pack?.privacyClass || "" });
  }

  const sourceDocuments = Array.isArray(pack?.sourceDocuments) ? pack.sourceDocuments : [];
  const domainPacks = Array.isArray(pack?.domainPacks) ? pack.domainPacks : [];
  const nodes = Array.isArray(pack?.nodes) ? pack.nodes : [];
  const edges = Array.isArray(pack?.edges) ? pack.edges : [];
  for (const field of ["sourceDocuments", "domainPacks", "nodes", "edges"]) {
    if (!Array.isArray(pack?.[field])) addIssue(errors, "invalid_array_field", { field });
  }

  const duplicateNodeIds = findDuplicateIds(nodes, "nodeId");
  const duplicateEdgeIds = findDuplicateIds(edges, "edgeId");
  if (duplicateNodeIds.length) addIssue(errors, "duplicate_node_ids", { nodeIds: boundedSample(duplicateNodeIds) });
  if (duplicateEdgeIds.length) addIssue(errors, "duplicate_edge_ids", { edgeIds: boundedSample(duplicateEdgeIds) });

  domainPacks.forEach((domainPack, index) => {
    const missing = missingRequiredFields(domainPack, REQUIRED_DOMAIN_PACK_FIELDS);
    if (missing.length) addIssue(rejectedRecords, "invalid_domain_pack", { index, domainPackId: domainPack?.domainPackId || "", missing });
  });

  nodes.forEach((node, index) => {
    const missing = missingRequiredFields(node, REQUIRED_NODE_FIELDS);
    if (missing.length) addIssue(rejectedRecords, "invalid_node", { index, nodeId: node?.nodeId || "", missing });
    if (node?.privacyClass !== "summary_only") {
      addIssue(rejectedRecords, "invalid_node_privacy_class", { index, nodeId: node?.nodeId || "", privacyClass: node?.privacyClass || "" });
    }
  });

  edges.forEach((edge, index) => {
    const missing = missingRequiredFields(edge, REQUIRED_EDGE_FIELDS);
    if (missing.length) addIssue(rejectedRecords, "invalid_edge", { index, edgeId: edge?.edgeId || "", missing });
  });

  const nodeIds = new Set(nodes.map((node) => cleanString(node.nodeId)).filter(Boolean));
  const missingEdgeEndpoints = edges
    .filter((edge) => !nodeIds.has(cleanString(edge.fromNodeId)) || !nodeIds.has(cleanString(edge.toNodeId)))
    .map((edge) => ({
      edgeId: cleanString(edge.edgeId),
      fromNodeId: cleanString(edge.fromNodeId),
      toNodeId: cleanString(edge.toNodeId)
    }));
  if (missingEdgeEndpoints.length) {
    addIssue(errors, "missing_edge_endpoints", { edges: boundedSample(missingEdgeEndpoints) });
  }

  const prerequisiteCycles = findPrerequisiteCycles(nodes, edges);
  if (prerequisiteCycles.length) addIssue(errors, "prerequisite_cycles", { cycles: boundedSample(prerequisiteCycles, 10) });

  const nodesById = new Map(nodes.map((node) => [cleanString(node.nodeId), node]));
  const crossDomainPrerequisites = edges
    .filter((edge) => edge.edgeType === "prerequisite")
    .map((edge) => {
      const from = nodesById.get(cleanString(edge.fromNodeId));
      const to = nodesById.get(cleanString(edge.toNodeId));
      return {
        edgeId: cleanString(edge.edgeId),
        fromNodeId: cleanString(edge.fromNodeId),
        toNodeId: cleanString(edge.toNodeId),
        fromDomain: cleanString(from?.domain),
        toDomain: cleanString(to?.domain),
        fromNodeType: cleanString(from?.nodeType),
        toNodeType: cleanString(to?.nodeType)
      };
    })
    .filter((item) => item.fromDomain && item.toDomain && item.fromDomain !== item.toDomain);
  if (crossDomainPrerequisites.length) {
    addIssue(warnings, "cross_domain_prerequisites_require_review", {
      count: crossDomainPrerequisites.length,
      sample: boundedSample(crossDomainPrerequisites, 10)
    });
  }

  const unsafeKeys = findUnsafeKeys(pack);
  if (unsafeKeys.length) addIssue(errors, "unsafe_raw_content_keys", { keys: boundedSample(unsafeKeys, 20) });

  const absoluteSourcePaths = sourceDocuments
    .map((sourceDocument, index) => ({ index, localPath: cleanString(sourceDocument?.localPath) }))
    .filter((item) => item.localPath && (path.isAbsolute(item.localPath) || item.localPath.startsWith("\\\\")));
  if (absoluteSourcePaths.length) addIssue(errors, "absolute_source_document_paths", { sourceDocuments: boundedSample(absoluteSourcePaths) });

  if (rejectedRecords.length) addIssue(errors, "rejected_records", { count: rejectedRecords.length, sample: boundedSample(rejectedRecords) });

  return {
    ok: errors.length === 0,
    dry_run: true,
    schema_version: pack?.schemaVersion || "",
    import_id: pack?.importId || "",
    version: pack?.version || "",
    privacy_class: pack?.privacyClass || "",
    domain_packs: domainPacks.length,
    source_documents: sourceDocuments.length,
    nodes: nodes.length,
    edges: edges.length,
    prerequisite_edges: edges.filter((edge) => edge.edgeType === "prerequisite").length,
    counts: {
      node_types: countBy(nodes.map((node) => node.nodeType)),
      edge_types: countBy(edges.map((edge) => edge.edgeType)),
      domains: countBy(nodes.map((node) => node.domain)),
      stages: countBy(nodes.map((node) => node.stage)),
      subjects: countBy(nodes.map((node) => node.subject))
    },
    validation: {
      duplicate_node_ids: duplicateNodeIds.length,
      duplicate_edge_ids: duplicateEdgeIds.length,
      missing_edge_endpoints: missingEdgeEndpoints.length,
      prerequisite_cycles: prerequisiteCycles.length,
      rejected_records: rejectedRecords.length,
      unsafe_raw_content_keys: unsafeKeys.length,
      absolute_source_document_paths: absoluteSourcePaths.length
    },
    rejected_records: boundedSample(rejectedRecords, options.maxRejectedRecords || 20),
    warnings,
    errors
  };
}

function dryRunLearningGraphImport({ sourcePath, expectedSha256 = "", maxRejectedRecords = 20 } = {}) {
  const resolvedPath = path.resolve(cleanString(sourcePath));
  const sourceText = fs.readFileSync(resolvedPath, "utf8");
  const actualSha256 = sha256(sourceText);
  const pack = JSON.parse(sourceText);
  const result = validateLearningGraphPack(pack, { maxRejectedRecords });
  const expected = cleanString(expectedSha256).toLowerCase();
  if (expected && expected !== actualSha256) {
    result.ok = false;
    result.errors.push({
      code: "source_sha256_mismatch",
      expected_sha256: expected,
      actual_sha256: actualSha256
    });
  }
  return Object.assign({
    source_file: safeSourceFile(sourcePath),
    source_sha256: actualSha256,
    expected_sha256: expected || ""
  }, result);
}

function loadLearningGraphPack({ sourcePath, expectedSha256 = "", maxRejectedRecords = 20 } = {}) {
  const resolvedPath = path.resolve(cleanString(sourcePath));
  const sourceText = fs.readFileSync(resolvedPath, "utf8");
  const sourceSha256 = sha256(sourceText);
  const pack = JSON.parse(sourceText);
  return {
    pack,
    sourceFile: safeSourceFile(sourcePath),
    sourceSha256,
    validation: dryRunLearningGraphImport({
      sourcePath: resolvedPath,
      expectedSha256,
      maxRejectedRecords
    })
  };
}

module.exports = {
  SUPPORTED_SCHEMA_VERSION,
  dryRunLearningGraphImport,
  loadLearningGraphPack,
  validateLearningGraphPack
};
