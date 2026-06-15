const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { sqlite } = require("../src/stores/growth-learning-sqlite/core");
const { REQUIRED_GRAPH_TABLES } = require("../src/stores/growth-learning-sqlite/graph-schema");
const { createLearningGraphRepository } = require("../src/stores/growth-learning-sqlite/graph-repository");
const { readbackImport, writeImport } = require("../scripts/import-learning-graph-pack");

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "learning-graph-repository-"));
}

function createRepository(dbPath) {
  return createLearningGraphRepository({
    open(readOnly = true) {
      const { DatabaseSync } = sqlite();
      return new DatabaseSync(dbPath, { open: true, readOnly });
    }
  });
}

function pack(overrides = {}) {
  return Object.assign({
    schemaVersion: "hermes.learningGraphSeed.v0.1",
    importId: "kg_import_repo_test",
    version: "2026-06-11-test",
    privacyClass: "summary_only",
    sourceDocuments: [{ sourceRef: "public:test", title: "Public source", localPath: "sources/test.pdf" }],
    domainPacks: [{
      domainPackId: "domain_pack_repo_test",
      domain: "math",
      title: "Repository test pack",
      sourceKind: "owner_manual",
      version: "2026-06-11-test",
      ownerWorkspaceId: "owner",
      visibility: "private_seed",
      importStatus: "validated_seed"
    }],
    nodes: [
      {
        nodeId: "kg_repo_a",
        domain: "math",
        nodeType: "topic",
        title: "A",
        stage: "lower_secondary",
        subject: "mathematics",
        curriculum: "test",
        sourceKind: "owner_manual",
        sourceRef: "public:test",
        version: "2026-06-11-test",
        privacyClass: "summary_only",
        learningOutcomes: ["Know A"],
        evidenceRequired: ["Show A"]
      },
      {
        nodeId: "kg_repo_b",
        domain: "math",
        nodeType: "topic",
        title: "B",
        stage: "lower_secondary",
        subject: "mathematics",
        curriculum: "test",
        sourceKind: "owner_manual",
        sourceRef: "public:test",
        version: "2026-06-11-test",
        privacyClass: "summary_only",
        learningOutcomes: ["Know B"],
        evidenceRequired: ["Show B"]
      }
    ],
    edges: [{
      edgeId: "edge_repo_a_b",
      fromNodeId: "kg_repo_a",
      toNodeId: "kg_repo_b",
      edgeType: "prerequisite",
      confidence: "seed",
      sourceRef: "public:test"
    }]
  }, overrides);
}

test("learning graph repository creates native graph tables and imports a pack idempotently", () => {
  const dir = tempDir();
  const dbPath = path.join(dir, "growth.sqlite3");
  const repository = createRepository(dbPath);
  const validation = {
    validation: { duplicate_node_ids: 0, missing_edge_endpoints: 0, prerequisite_cycles: 0 },
    warnings: []
  };

  const first = repository.importPack({
    pack: pack(),
    validation,
    sourceFile: "repo-test.json",
    sourceSha256: "hash_1"
  });
  assert.equal(first.ok, true);
  assert.deepEqual(first.missing_tables, []);
  assert.equal(first.import_counts.domain_packs, 1);
  assert.equal(first.import_counts.nodes, 2);
  assert.equal(first.import_counts.edges, 1);
  assert.equal(first.import_counts.prerequisite_edges, 1);
  for (const table of REQUIRED_GRAPH_TABLES) assert.equal(first.counts[table] >= 0, true);

  const second = repository.importPack({
    pack: pack({
      nodes: [pack().nodes[0]],
      edges: []
    }),
    validation,
    sourceFile: "repo-test.json",
    sourceSha256: "hash_2"
  });
  assert.equal(second.ok, true);
  assert.equal(second.import_counts.nodes, 1);
  assert.equal(second.import_counts.edges, 0);
  assert.equal(second.source_sha256, "hash_2");
});

test("learning graph repository projects domain-pack and subject options from native graph tables", () => {
  const dir = tempDir();
  const dbPath = path.join(dir, "growth.sqlite3");
  const repository = createRepository(dbPath);
  const validation = {
    validation: { duplicate_node_ids: 0, missing_edge_endpoints: 0, prerequisite_cycles: 0 },
    warnings: []
  };

  repository.importPack({
    pack: pack({
      domainPacks: [{
        domainPackId: "domain_pack_repo_science",
        domain: "science",
        title: "Science repository test pack",
        sourceKind: "owner_manual",
        version: "2026-06-11-test",
        ownerWorkspaceId: "owner",
        visibility: "private_seed",
        importStatus: "validated_seed"
      }],
      nodes: [
        Object.assign({}, pack().nodes[0], {
          nodeId: "kg_repo_science_a",
          domainPackId: "domain_pack_repo_science",
          domain: "science",
          subject: "science",
          title: "Science A"
        }),
        Object.assign({}, pack().nodes[1], {
          nodeId: "kg_repo_science_b",
          domainPackId: "domain_pack_repo_science",
          domain: "science",
          subject: "physics",
          title: "Science B"
        })
      ],
      edges: []
    }),
    validation,
    sourceFile: "repo-test.json",
    sourceSha256: "hash_science"
  });

  const options = repository.domainPackOptions();
  assert.equal(options.length, 1);
  assert.equal(options[0].domainPackId, "domain_pack_repo_science");
  assert.equal(options[0].domain, "science");
  assert.equal(options[0].nodeCount, 2);
  assert.equal(options[0].subjectCount, 2);
  assert.deepEqual(options[0].subjects.sort(), ["physics", "science"]);
  assert.equal(JSON.stringify(options).includes("raw_json"), false);
});

test("learning graph repository infers node domain-pack from node domain when node omits explicit pack id", () => {
  const dir = tempDir();
  const dbPath = path.join(dir, "growth.sqlite3");
  const repository = createRepository(dbPath);
  const validation = {
    validation: { duplicate_node_ids: 0, missing_edge_endpoints: 0, prerequisite_cycles: 0 },
    warnings: []
  };

  repository.importPack({
    pack: pack({
      domainPacks: [{
        domainPackId: "domain_pack_repo_english",
        domain: "english",
        title: "English repository test pack",
        sourceKind: "owner_manual",
        version: "2026-06-11-test",
        ownerWorkspaceId: "owner",
        visibility: "private_seed",
        importStatus: "validated_seed"
      }, {
        domainPackId: "domain_pack_repo_science",
        domain: "science",
        title: "Science repository test pack",
        sourceKind: "owner_manual",
        version: "2026-06-11-test",
        ownerWorkspaceId: "owner",
        visibility: "private_seed",
        importStatus: "validated_seed"
      }],
      nodes: [
        Object.assign({}, pack().nodes[0], {
          nodeId: "kg_repo_english_inferred",
          domain: "english",
          subject: "english",
          title: "English inferred pack"
        }),
        Object.assign({}, pack().nodes[1], {
          nodeId: "kg_repo_science_inferred",
          domain: "science",
          subject: "science",
          title: "Science inferred pack"
        })
      ],
      edges: []
    }),
    validation,
    sourceFile: "repo-test.json",
    sourceSha256: "hash_multi_domain"
  });

  assert.equal(repository.node({ nodeId: "kg_repo_english_inferred" }).domainPackId, "domain_pack_repo_english");
  assert.equal(repository.node({ nodeId: "kg_repo_science_inferred" }).domainPackId, "domain_pack_repo_science");
  const options = repository.domainPackOptions();
  assert.equal(options.length, 2);
  const science = options.find((option) => option.domainPackId === "domain_pack_repo_science");
  const english = options.find((option) => option.domainPackId === "domain_pack_repo_english");
  assert.equal(science.nodeCount, 1);
  assert.deepEqual(science.subjects, ["science"]);
  assert.equal(english.nodeCount, 1);
  assert.deepEqual(english.subjects, ["english"]);
});

test("learning graph import script writes to target DB and creates a backup", () => {
  const dir = tempDir();
  const sourcePath = path.join(dir, "pack.json");
  const dbPath = path.join(dir, "growth.sqlite3");
  fs.writeFileSync(sourcePath, JSON.stringify(pack()), "utf8");

  const first = writeImport({ sourcePath, targetDb: dbPath, write: true, backupDir: path.join(dir, "backups") });
  assert.equal(first.ok, true);
  assert.equal(first.backup, "");
  assert.equal(first.after.import_counts.nodes, 2);

  const second = writeImport({ sourcePath, targetDb: dbPath, write: true, backupDir: path.join(dir, "backups") });
  assert.equal(second.ok, true);
  assert.match(second.backup, /growth-learning-before-graph-import-/);
  assert.equal(fs.existsSync(second.backup), true);
  assert.equal(second.after.import_counts.nodes, 2);

  const readback = readbackImport({ targetDb: dbPath, importId: "kg_import_repo_test" });
  assert.equal(readback.ok, true);
  assert.equal(readback.mode, "readback");
  assert.equal(readback.import_counts.nodes, 2);
  assert.equal(readback.import_counts.edges, 1);
});
