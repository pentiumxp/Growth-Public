const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  dryRunLearningGraphImport,
  validateLearningGraphPack
} = require("../src/services/learning-graph-import-service");

function basePack(overrides = {}) {
  return Object.assign({
    schemaVersion: "hermes.learningGraphSeed.v0.1",
    importId: "kg_import_test",
    version: "2026-06-11-test",
    privacyClass: "summary_only",
    sourceDocuments: [{ sourceRef: "public:test", title: "Public source", localPath: "sources/test.pdf" }],
    domainPacks: [{
      domainPackId: "domain_pack_test",
      domain: "math",
      title: "Test pack",
      sourceKind: "owner_manual",
      version: "2026-06-11-test",
      visibility: "private_seed",
      importStatus: "validated_seed"
    }],
    nodes: [
      {
        nodeId: "kg_a",
        domain: "math",
        nodeType: "topic",
        title: "A",
        sourceKind: "owner_manual",
        sourceRef: "public:test",
        version: "2026-06-11-test",
        privacyClass: "summary_only"
      },
      {
        nodeId: "kg_b",
        domain: "math",
        nodeType: "topic",
        title: "B",
        sourceKind: "owner_manual",
        sourceRef: "public:test",
        version: "2026-06-11-test",
        privacyClass: "summary_only"
      }
    ],
    edges: [
      {
        edgeId: "edge_a_b",
        fromNodeId: "kg_a",
        toNodeId: "kg_b",
        edgeType: "prerequisite",
        sourceRef: "public:test"
      }
    ]
  }, overrides);
}

test("learning graph dry-run validates a bounded seed pack without writing runtime data", () => {
  const result = validateLearningGraphPack(basePack());
  assert.equal(result.ok, true);
  assert.equal(result.dry_run, true);
  assert.equal(result.nodes, 2);
  assert.equal(result.edges, 1);
  assert.equal(result.prerequisite_edges, 1);
  assert.equal(result.validation.prerequisite_cycles, 0);
  assert.deepEqual(result.errors, []);
});

test("learning graph dry-run rejects missing prerequisite endpoints and cycles", () => {
  const missing = validateLearningGraphPack(basePack({
    edges: [{
      edgeId: "edge_missing",
      fromNodeId: "kg_a",
      toNodeId: "kg_missing",
      edgeType: "prerequisite",
      sourceRef: "public:test"
    }]
  }));
  assert.equal(missing.ok, false);
  assert.equal(missing.validation.missing_edge_endpoints, 1);
  assert.equal(missing.errors.some((error) => error.code === "missing_edge_endpoints"), true);

  const cyclic = validateLearningGraphPack(basePack({
    edges: [
      { edgeId: "edge_a_b", fromNodeId: "kg_a", toNodeId: "kg_b", edgeType: "prerequisite", sourceRef: "public:test" },
      { edgeId: "edge_b_a", fromNodeId: "kg_b", toNodeId: "kg_a", edgeType: "prerequisite", sourceRef: "public:test" }
    ]
  }));
  assert.equal(cyclic.ok, false);
  assert.equal(cyclic.validation.prerequisite_cycles, 1);
});

test("learning graph dry-run rejects privacy and raw-content risk markers", () => {
  const result = validateLearningGraphPack(basePack({
    nodes: [{
      nodeId: "kg_private",
      domain: "english",
      nodeType: "topic",
      title: "Private",
      sourceKind: "owner_manual",
      sourceRef: "private:test",
      version: "2026-06-11-test",
      privacyClass: "private_payload",
      rawPrompt: "do not store prompts"
    }]
  }));
  assert.equal(result.ok, false);
  assert.equal(result.validation.rejected_records, 1);
  assert.equal(result.validation.unsafe_raw_content_keys, 1);
});

test("learning graph dry-run reports cross-domain prerequisites as review warnings", () => {
  const result = validateLearningGraphPack(basePack({
    nodes: [
      {
        nodeId: "kg_math",
        domain: "math",
        nodeType: "topic",
        title: "Math",
        sourceKind: "owner_manual",
        sourceRef: "public:test",
        version: "2026-06-11-test",
        privacyClass: "summary_only"
      },
      {
        nodeId: "kg_science",
        domain: "science",
        nodeType: "topic",
        title: "Science",
        sourceKind: "owner_manual",
        sourceRef: "public:test",
        version: "2026-06-11-test",
        privacyClass: "summary_only"
      }
    ],
    edges: [{
      edgeId: "edge_math_science",
      fromNodeId: "kg_math",
      toNodeId: "kg_science",
      edgeType: "prerequisite",
      sourceRef: "public:test"
    }]
  }));
  assert.equal(result.ok, true);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0].code, "cross_domain_prerequisites_require_review");
});

test("learning graph dry-run validates recovered Fan Fan graph hash and counts", () => {
  const sourcePath = "/Users/hermes-dev/HermesMobileDev/recovered/windows-agent/20260611/Agent/workspace/uk-hk-curriculum-foundation/knowledge-graph/fanfan-uk-hk-igcse-a-level-graph-v1.json";
  if (!fs.existsSync(sourcePath)) {
    assert.equal(fs.existsSync(sourcePath), false, "recovered graph fixture is optional outside the Mac staging workspace");
    return;
  }
  const result = dryRunLearningGraphImport({
    sourcePath,
    expectedSha256: "b42d5afdb02f71316ab5ab8692854d32ae3ec37762bd77c989d7255c0c85fc36"
  });
  assert.equal(result.ok, true);
  assert.equal(result.schema_version, "hermes.learningGraphSeed.v0.1");
  assert.equal(result.import_id, "kg_import_20260527_fanfan_uk_hk_igcse_a_level_v1");
  assert.equal(result.source_documents, 15);
  assert.equal(result.domain_packs, 1);
  assert.equal(result.nodes, 294);
  assert.equal(result.edges, 329);
  assert.equal(result.prerequisite_edges, 34);
  assert.equal(result.validation.missing_edge_endpoints, 0);
  assert.equal(result.validation.prerequisite_cycles, 0);
});

test("learning graph dry-run detects source hash mismatch", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "learning-graph-import-"));
  const sourcePath = path.join(dir, "pack.json");
  fs.writeFileSync(sourcePath, JSON.stringify(basePack()), "utf8");
  const result = dryRunLearningGraphImport({ sourcePath, expectedSha256: "deadbeef" });
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "source_sha256_mismatch"), true);
});
