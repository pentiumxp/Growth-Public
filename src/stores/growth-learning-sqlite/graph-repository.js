"use strict";

const { cleanString, countTable, parseJson, tableExists } = require("./core");
const { REQUIRED_GRAPH_TABLES, ensureLearningGraphSchema } = require("./graph-schema");

function jsonText(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function nowIso() {
  return new Date().toISOString();
}

function firstDomainPackId(pack) {
  return cleanString(pack?.domainPacks?.[0]?.domainPackId);
}

function sourceDocumentsForStorage(sourceDocuments = []) {
  return sourceDocuments.map((sourceDocument) => ({
    sourceRef: cleanString(sourceDocument.sourceRef),
    title: cleanString(sourceDocument.title),
    localPath: cleanString(sourceDocument.localPath),
    officialUrl: cleanString(sourceDocument.officialUrl)
  }));
}

function createLearningGraphRepository({ open } = {}) {
  function withDb(readOnly, callback) {
    const db = open(readOnly);
    try {
      return callback(db);
    } finally {
      db.close();
    }
  }

  function ensureSchema() {
    return withDb(false, (db) => {
      ensureLearningGraphSchema(db);
      return { ok: true, tables: REQUIRED_GRAPH_TABLES.slice() };
    });
  }

  function importPack({ pack, validation, sourceFile, sourceSha256 } = {}) {
    return withDb(false, (db) => {
      ensureLearningGraphSchema(db);
      const importId = cleanString(pack.importId);
      const timestamp = nowIso();
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare("DELETE FROM learning_graph_edges WHERE import_id = ?").run(importId);
        db.prepare("DELETE FROM learning_graph_nodes WHERE import_id = ?").run(importId);
        db.prepare("DELETE FROM learning_graph_domain_packs WHERE import_id = ?").run(importId);
        db.prepare("DELETE FROM learning_graph_imports WHERE import_id = ?").run(importId);

        db.prepare(`
          INSERT INTO learning_graph_imports(
            import_id, schema_version, version, privacy_class, source_file,
            source_sha256, domain_pack_count, source_document_count, node_count,
            edge_count, prerequisite_edge_count, validation_json, warnings_json,
            source_documents_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          importId,
          cleanString(pack.schemaVersion),
          cleanString(pack.version),
          cleanString(pack.privacyClass),
          cleanString(sourceFile),
          cleanString(sourceSha256),
          pack.domainPacks.length,
          pack.sourceDocuments.length,
          pack.nodes.length,
          pack.edges.length,
          pack.edges.filter((edge) => edge.edgeType === "prerequisite").length,
          jsonText(validation.validation || {}),
          jsonText(validation.warnings || []),
          jsonText(sourceDocumentsForStorage(pack.sourceDocuments || [])),
          timestamp,
          timestamp
        );

        const insertDomainPack = db.prepare(`
          INSERT INTO learning_graph_domain_packs(
            domain_pack_id, import_id, domain, title, source_kind, version,
            owner_workspace_id, visibility, import_status, raw_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const domainPack of pack.domainPacks) {
          insertDomainPack.run(
            cleanString(domainPack.domainPackId),
            importId,
            cleanString(domainPack.domain),
            cleanString(domainPack.title),
            cleanString(domainPack.sourceKind),
            cleanString(domainPack.version),
            cleanString(domainPack.ownerWorkspaceId),
            cleanString(domainPack.visibility),
            cleanString(domainPack.importStatus),
            jsonText(domainPack),
            timestamp,
            timestamp
          );
        }

        const domainPackId = firstDomainPackId(pack);
        const insertNode = db.prepare(`
          INSERT INTO learning_graph_nodes(
            node_id, import_id, domain_pack_id, domain, node_type, title, stage,
            subject, curriculum, source_kind, source_ref, version, privacy_class,
            aliases_json, learning_outcomes_json, evidence_required_json,
            assessment_coverage_json, mastery_signals_json, experience_signals_json,
            raw_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const node of pack.nodes) {
          insertNode.run(
            cleanString(node.nodeId),
            importId,
            cleanString(node.domainPackId) || domainPackId,
            cleanString(node.domain),
            cleanString(node.nodeType),
            cleanString(node.title),
            cleanString(node.stage),
            cleanString(node.subject),
            cleanString(node.curriculum),
            cleanString(node.sourceKind),
            cleanString(node.sourceRef),
            cleanString(node.version),
            cleanString(node.privacyClass),
            jsonText(node.aliases || []),
            jsonText(node.learningOutcomes || []),
            jsonText(node.evidenceRequired || []),
            jsonText(node.assessmentCoverage || []),
            jsonText(node.masterySignals || []),
            jsonText(node.experienceSignals || []),
            jsonText(node),
            timestamp,
            timestamp
          );
        }

        const insertEdge = db.prepare(`
          INSERT INTO learning_graph_edges(
            edge_id, import_id, from_node_id, to_node_id, edge_type,
            confidence, rationale, source_ref, raw_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const edge of pack.edges) {
          insertEdge.run(
            cleanString(edge.edgeId),
            importId,
            cleanString(edge.fromNodeId),
            cleanString(edge.toNodeId),
            cleanString(edge.edgeType),
            cleanString(edge.confidence),
            cleanString(edge.rationale),
            cleanString(edge.sourceRef),
            jsonText(edge),
            timestamp,
            timestamp
          );
        }

        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
      return readbackFromDb(db, { importId });
    });
  }

  function readback({ importId } = {}) {
    return withDb(true, (db) => readbackFromDb(db, { importId }));
  }

  function node({ nodeId } = {}) {
    return withDb(true, (db) => nodeFromDb(db, { nodeId }));
  }

  function nodesByIds({ nodeIds = [] } = {}) {
    return withDb(true, (db) => nodesByIdsFromDb(db, { nodeIds }));
  }

  function suggestNodes({ domain = "", subject = "", limit = 10 } = {}) {
    return withDb(true, (db) => suggestNodesFromDb(db, { domain, subject, limit }));
  }

  function prerequisiteNodeIds({ targetNodeId } = {}) {
    return withDb(true, (db) => prerequisiteNodeIdsFromDb(db, { targetNodeId }));
  }

  function savePlan(plan = {}) {
    return withDb(false, (db) => {
      ensureLearningGraphSchema(db);
      const timestamp = nowIso();
      db.prepare(`
        INSERT INTO learning_graph_plans(
          learning_graph_plan_id, learner_id, workspace_id, program_id,
          target_node_id, prerequisite_node_ids_json, path_node_ids_json,
          card_sequence_json, assessment_coverage_json, source_basis_json,
          privacy_class, raw_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(learning_graph_plan_id) DO UPDATE SET
          learner_id=excluded.learner_id,
          workspace_id=excluded.workspace_id,
          program_id=excluded.program_id,
          target_node_id=excluded.target_node_id,
          prerequisite_node_ids_json=excluded.prerequisite_node_ids_json,
          path_node_ids_json=excluded.path_node_ids_json,
          card_sequence_json=excluded.card_sequence_json,
          assessment_coverage_json=excluded.assessment_coverage_json,
          source_basis_json=excluded.source_basis_json,
          privacy_class=excluded.privacy_class,
          raw_json=excluded.raw_json,
          updated_at=excluded.updated_at
      `).run(
        cleanString(plan.learningGraphPlanId),
        cleanString(plan.learnerId),
        cleanString(plan.workspaceId),
        cleanString(plan.programId),
        cleanString(plan.targetNodeId),
        jsonText(plan.prerequisiteNodeIds || []),
        jsonText(plan.pathNodeIds || []),
        jsonText(plan.cardSequence || []),
        jsonText(plan.assessmentCoverage || []),
        jsonText(plan.sourceBasis || {}),
        cleanString(plan.privacyClass) || "summary_only",
        jsonText(plan),
        timestamp,
        timestamp
      );
      return planFromDb(db, { learningGraphPlanId: plan.learningGraphPlanId });
    });
  }

  function plan({ learningGraphPlanId } = {}) {
    return withDb(true, (db) => planFromDb(db, { learningGraphPlanId }));
  }

  function saveCardBinding(binding = {}) {
    return withDb(false, (db) => {
      ensureLearningGraphSchema(db);
      const timestamp = nowIso();
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
        cleanString(binding.bindingId),
        cleanString(binding.taskCardId),
        cleanString(binding.learningGraphPlanId),
        jsonText(binding.nodeIds || []),
        cleanString(binding.cardRole),
        jsonText(binding.assessmentCoverage || []),
        jsonText(binding.repairMetadata || {}),
        timestamp,
        timestamp
      );
      return cardBindingFromDb(db, { bindingId: binding.bindingId });
    });
  }

  function cardBinding({ bindingId } = {}) {
    return withDb(true, (db) => cardBindingFromDb(db, { bindingId }));
  }

  return {
    cardBinding,
    ensureSchema,
    importPack,
    node,
    nodesByIds,
    plan,
    prerequisiteNodeIds,
    readback,
    saveCardBinding,
    savePlan,
    suggestNodes
  };
}

function publicNode(row) {
  if (!row) return null;
  return {
    nodeId: cleanString(row.node_id),
    importId: cleanString(row.import_id),
    domainPackId: cleanString(row.domain_pack_id),
    domain: cleanString(row.domain),
    nodeType: cleanString(row.node_type),
    title: cleanString(row.title),
    stage: cleanString(row.stage),
    subject: cleanString(row.subject),
    curriculum: cleanString(row.curriculum),
    sourceKind: cleanString(row.source_kind),
    sourceRef: cleanString(row.source_ref),
    version: cleanString(row.version),
    privacyClass: cleanString(row.privacy_class),
    aliases: parseJson(row.aliases_json, []),
    learningOutcomes: parseJson(row.learning_outcomes_json, []),
    evidenceRequired: parseJson(row.evidence_required_json, []),
    assessmentCoverage: parseJson(row.assessment_coverage_json, []),
    masterySignals: parseJson(row.mastery_signals_json, []),
    experienceSignals: parseJson(row.experience_signals_json, [])
  };
}

function nodeFromDb(db, { nodeId } = {}) {
  if (!tableExists(db, "learning_graph_nodes")) return null;
  const id = cleanString(nodeId);
  if (!id) return null;
  return publicNode(db.prepare("SELECT * FROM learning_graph_nodes WHERE node_id = ?").get(id));
}

function nodesByIdsFromDb(db, { nodeIds = [] } = {}) {
  const ids = Array.from(new Set(nodeIds.map(cleanString).filter(Boolean)));
  return ids.map((nodeId) => nodeFromDb(db, { nodeId })).filter(Boolean);
}

function prerequisiteNodeIdsFromDb(db, { targetNodeId } = {}) {
  if (!tableExists(db, "learning_graph_edges")) return [];
  const id = cleanString(targetNodeId);
  if (!id) return [];
  return db.prepare(`
    SELECT from_node_id FROM learning_graph_edges
    WHERE edge_type = 'prerequisite' AND to_node_id = ?
    ORDER BY from_node_id
  `).all(id).map((row) => cleanString(row.from_node_id)).filter(Boolean);
}

function suggestNodesFromDb(db, { domain = "", subject = "", limit = 10 } = {}) {
  if (!tableExists(db, "learning_graph_nodes")) return [];
  const cleanDomain = cleanString(domain).toLowerCase();
  const cleanSubject = cleanString(subject).toLowerCase();
  const max = Math.max(1, Math.min(50, Number(limit || 10) || 10));
  if (!cleanDomain && !cleanSubject) {
    return db.prepare(`
      SELECT * FROM learning_graph_nodes
      ORDER BY
        CASE WHEN privacy_class = 'summary_only' THEN 0 ELSE 1 END,
        node_id
      LIMIT ?
    `).all(max).map(publicNode);
  }
  return db.prepare(`
    SELECT * FROM learning_graph_nodes
    WHERE lower(domain) = ?
      OR lower(subject) = ?
      OR lower(subject) = ?
      OR lower(title) LIKE ?
    ORDER BY
      CASE
        WHEN lower(domain) = ? THEN 0
        WHEN lower(subject) = ? THEN 1
        WHEN lower(subject) = ? THEN 2
        ELSE 3
      END,
      CASE WHEN privacy_class = 'summary_only' THEN 0 ELSE 1 END,
      node_id
    LIMIT ?
  `).all(
    cleanDomain,
    cleanDomain,
    cleanSubject,
    `%${cleanDomain || cleanSubject}%`,
    cleanDomain,
    cleanDomain,
    cleanSubject,
    max
  ).map(publicNode);
}

function planFromDb(db, { learningGraphPlanId } = {}) {
  if (!tableExists(db, "learning_graph_plans")) return null;
  const id = cleanString(learningGraphPlanId);
  if (!id) return null;
  const row = db.prepare("SELECT * FROM learning_graph_plans WHERE learning_graph_plan_id = ?").get(id);
  if (!row) return null;
  return {
    ok: true,
    learningGraphPlanId: cleanString(row.learning_graph_plan_id),
    learnerId: cleanString(row.learner_id),
    workspaceId: cleanString(row.workspace_id),
    programId: cleanString(row.program_id),
    targetNodeId: cleanString(row.target_node_id),
    prerequisiteNodeIds: parseJson(row.prerequisite_node_ids_json, []),
    pathNodeIds: parseJson(row.path_node_ids_json, []),
    cardSequence: parseJson(row.card_sequence_json, []),
    assessmentCoverage: parseJson(row.assessment_coverage_json, []),
    sourceBasis: parseJson(row.source_basis_json, {}),
    privacyClass: cleanString(row.privacy_class)
  };
}

function cardBindingFromDb(db, { bindingId } = {}) {
  if (!tableExists(db, "learning_card_graph_bindings")) return null;
  const id = cleanString(bindingId);
  if (!id) return null;
  const row = db.prepare("SELECT * FROM learning_card_graph_bindings WHERE binding_id = ?").get(id);
  if (!row) return null;
  return {
    ok: true,
    bindingId: cleanString(row.binding_id),
    taskCardId: cleanString(row.task_card_id),
    learningGraphPlanId: cleanString(row.learning_graph_plan_id),
    nodeIds: parseJson(row.node_ids_json, []),
    cardRole: cleanString(row.card_role),
    assessmentCoverage: parseJson(row.assessment_coverage_json, []),
    repairMetadata: parseJson(row.repair_metadata_json, {})
  };
}

function readbackFromDb(db, { importId } = {}) {
  const missingTables = REQUIRED_GRAPH_TABLES.filter((tableName) => !tableExists(db, tableName));
  const cleanImportId = cleanString(importId);
  if (missingTables.length) {
    return {
      ok: false,
      import_id: cleanImportId,
      missing_tables: missingTables,
      counts: {}
    };
  }
  const importRow = cleanImportId
    ? db.prepare("SELECT * FROM learning_graph_imports WHERE import_id = ?").get(cleanImportId)
    : db.prepare("SELECT * FROM learning_graph_imports ORDER BY updated_at DESC LIMIT 1").get();
  const targetImportId = cleanString(importRow?.import_id);
  const counts = {};
  for (const tableName of REQUIRED_GRAPH_TABLES) counts[tableName] = countTable(db, tableName);
  const filteredCounts = targetImportId ? {
    domain_packs: Number(db.prepare("SELECT COUNT(*) AS count FROM learning_graph_domain_packs WHERE import_id = ?").get(targetImportId).count || 0),
    nodes: Number(db.prepare("SELECT COUNT(*) AS count FROM learning_graph_nodes WHERE import_id = ?").get(targetImportId).count || 0),
    edges: Number(db.prepare("SELECT COUNT(*) AS count FROM learning_graph_edges WHERE import_id = ?").get(targetImportId).count || 0),
    prerequisite_edges: Number(db.prepare("SELECT COUNT(*) AS count FROM learning_graph_edges WHERE import_id = ? AND edge_type = 'prerequisite'").get(targetImportId).count || 0)
  } : { domain_packs: 0, nodes: 0, edges: 0, prerequisite_edges: 0 };
  return {
    ok: Boolean(importRow),
    import_id: targetImportId,
    schema_version: cleanString(importRow?.schema_version),
    version: cleanString(importRow?.version),
    privacy_class: cleanString(importRow?.privacy_class),
    source_file: cleanString(importRow?.source_file),
    source_sha256: cleanString(importRow?.source_sha256),
    missing_tables: [],
    counts,
    import_counts: filteredCounts,
    validation: parseJson(importRow?.validation_json, {}),
    warnings: parseJson(importRow?.warnings_json, []),
    source_document_count: Number(importRow?.source_document_count || 0)
  };
}

module.exports = {
  createLearningGraphRepository
};
