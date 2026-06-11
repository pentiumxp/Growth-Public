"use strict";

const REQUIRED_GRAPH_TABLES = Object.freeze([
  "learning_graph_imports",
  "learning_graph_domain_packs",
  "learning_graph_nodes",
  "learning_graph_edges",
  "learning_graph_plans",
  "learning_card_graph_bindings"
]);

function ensureLearningGraphSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_graph_imports (
      import_id TEXT PRIMARY KEY,
      schema_version TEXT NOT NULL,
      version TEXT NOT NULL,
      privacy_class TEXT NOT NULL,
      source_file TEXT NOT NULL,
      source_sha256 TEXT NOT NULL,
      domain_pack_count INTEGER NOT NULL DEFAULT 0,
      source_document_count INTEGER NOT NULL DEFAULT 0,
      node_count INTEGER NOT NULL DEFAULT 0,
      edge_count INTEGER NOT NULL DEFAULT 0,
      prerequisite_edge_count INTEGER NOT NULL DEFAULT 0,
      validation_json TEXT NOT NULL DEFAULT '{}',
      warnings_json TEXT NOT NULL DEFAULT '[]',
      source_documents_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learning_graph_domain_packs (
      domain_pack_id TEXT PRIMARY KEY,
      import_id TEXT NOT NULL,
      domain TEXT NOT NULL,
      title TEXT NOT NULL,
      source_kind TEXT NOT NULL,
      version TEXT NOT NULL,
      owner_workspace_id TEXT NOT NULL DEFAULT '',
      visibility TEXT NOT NULL,
      import_status TEXT NOT NULL,
      raw_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learning_graph_nodes (
      node_id TEXT PRIMARY KEY,
      import_id TEXT NOT NULL,
      domain_pack_id TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL,
      node_type TEXT NOT NULL,
      title TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      curriculum TEXT NOT NULL DEFAULT '',
      source_kind TEXT NOT NULL,
      source_ref TEXT NOT NULL,
      version TEXT NOT NULL,
      privacy_class TEXT NOT NULL,
      aliases_json TEXT NOT NULL DEFAULT '[]',
      learning_outcomes_json TEXT NOT NULL DEFAULT '[]',
      evidence_required_json TEXT NOT NULL DEFAULT '[]',
      assessment_coverage_json TEXT NOT NULL DEFAULT '[]',
      mastery_signals_json TEXT NOT NULL DEFAULT '[]',
      experience_signals_json TEXT NOT NULL DEFAULT '[]',
      raw_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learning_graph_edges (
      edge_id TEXT PRIMARY KEY,
      import_id TEXT NOT NULL,
      from_node_id TEXT NOT NULL,
      to_node_id TEXT NOT NULL,
      edge_type TEXT NOT NULL,
      confidence TEXT NOT NULL DEFAULT '',
      rationale TEXT NOT NULL DEFAULT '',
      source_ref TEXT NOT NULL,
      raw_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learning_graph_plans (
      learning_graph_plan_id TEXT PRIMARY KEY,
      learner_id TEXT NOT NULL DEFAULT '',
      workspace_id TEXT NOT NULL DEFAULT '',
      program_id TEXT NOT NULL DEFAULT '',
      target_node_id TEXT NOT NULL,
      prerequisite_node_ids_json TEXT NOT NULL DEFAULT '[]',
      path_node_ids_json TEXT NOT NULL DEFAULT '[]',
      card_sequence_json TEXT NOT NULL DEFAULT '[]',
      assessment_coverage_json TEXT NOT NULL DEFAULT '[]',
      source_basis_json TEXT NOT NULL DEFAULT '{}',
      privacy_class TEXT NOT NULL DEFAULT 'summary_only',
      raw_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learning_card_graph_bindings (
      binding_id TEXT PRIMARY KEY,
      task_card_id TEXT NOT NULL,
      learning_graph_plan_id TEXT NOT NULL,
      node_ids_json TEXT NOT NULL DEFAULT '[]',
      card_role TEXT NOT NULL DEFAULT '',
      assessment_coverage_json TEXT NOT NULL DEFAULT '[]',
      repair_metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_learning_graph_nodes_import ON learning_graph_nodes(import_id);
    CREATE INDEX IF NOT EXISTS idx_learning_graph_nodes_domain_stage ON learning_graph_nodes(domain, stage);
    CREATE INDEX IF NOT EXISTS idx_learning_graph_edges_import ON learning_graph_edges(import_id);
    CREATE INDEX IF NOT EXISTS idx_learning_graph_edges_from ON learning_graph_edges(from_node_id);
    CREATE INDEX IF NOT EXISTS idx_learning_graph_edges_to ON learning_graph_edges(to_node_id);
    CREATE INDEX IF NOT EXISTS idx_learning_card_graph_bindings_task ON learning_card_graph_bindings(task_card_id);
  `);
}

module.exports = {
  REQUIRED_GRAPH_TABLES,
  ensureLearningGraphSchema
};
