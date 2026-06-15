const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const { createGrowthLearningSqliteStore } = require("../src/stores/growth-learning-sqlite-store");

const repoRoot = path.join(__dirname, "..");
const scriptPath = path.join(repoRoot, "scripts", "smoke-growth-target-provisioning.js");

const {
  allowWrite,
  inputFromArgs,
  operationFromArgs,
  targetNodeIds,
  validateOperation
} = require("../scripts/smoke-growth-target-provisioning");

const WORKSPACE_ID = "weixin_alice";
const LEARNER_ID = "alice";
const DOMAIN_PACK_ID = "domain_pack_fanfan_cambridge_pathway_v1";
const SCIENCE_NODE_ID = "kg_lower_secondary_science";

function graphPack() {
  return {
    schemaVersion: "hermes.learningGraphSeed.v0.1",
    importId: "kg_import_target_provision_smoke",
    version: "2026-06-15-test",
    privacyClass: "summary_only",
    sourceDocuments: [{
      sourceRef: "public:target-provision-smoke",
      title: "Target provision smoke summary",
      localPath: ""
    }],
    domainPacks: [{
      domainPackId: DOMAIN_PACK_ID,
      domain: "cross_subject_curriculum",
      title: "Fanfan Cambridge pathway",
      sourceKind: "owner_manual",
      version: "2026-06-15-test",
      ownerWorkspaceId: "owner",
      visibility: "private_seed",
      importStatus: "validated_seed"
    }],
    nodes: [{
      nodeId: SCIENCE_NODE_ID,
      domain: "science",
      nodeType: "strand",
      title: "Lower Secondary Science",
      stage: "lower_secondary",
      subject: "science",
      curriculum: "test",
      sourceKind: "owner_manual",
      sourceRef: "public:target-provision-smoke",
      version: "2026-06-15-test",
      privacyClass: "summary_only",
      learningOutcomes: ["Use summary-only science graph context."],
      evidenceRequired: ["Bind evidence to a science graph node."]
    }],
    edges: []
  };
}

function withPreparedDb(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-target-provisioning-smoke-"));
  const dbPath = path.join(dir, "growth-learning.sqlite3");
  try {
    const store = createGrowthLearningSqliteStore({ dbPath });
    store.learningGraphRepository.importPack({
      pack: graphPack(),
      validation: { validation: {}, warnings: [] },
      sourceFile: "target-provisioning-smoke-graph.json",
      sourceSha256: "target-provisioning-smoke-sha256"
    });
    return callback({ dbPath, store });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function runScript(args, env = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    env: Object.assign({}, process.env, env),
    encoding: "utf8"
  });
}

function parseStdout(result) {
  assert.equal(result.stderr.replace(/\(node:\d+\) ExperimentalWarning: SQLite is an experimental feature[^\n]*\n\(Use `node --trace-warnings \.\.\.` to show where the warning was created\)\n/g, ""), "");
  return JSON.parse(result.stdout);
}

test("target provisioning smoke script parses operation, scope, and write gate", () => {
  const args = [
    "--operation", "provision",
    "--workspace-id", WORKSPACE_ID,
    "--learner-id", LEARNER_ID,
    "--domain-pack-id", DOMAIN_PACK_ID,
    "--domain", "science",
    "--subject", "science",
    "--target-node-id", SCIENCE_NODE_ID,
    "--allow-write"
  ];
  assert.equal(operationFromArgs(args), "provision");
  assert.equal(allowWrite(args), true);
  assert.deepEqual(targetNodeIds(args), [SCIENCE_NODE_ID]);
  const input = inputFromArgs(args);
  assert.equal(input.workspaceId, WORKSPACE_ID);
  assert.equal(input.domainPackId, DOMAIN_PACK_ID);
  assert.equal(input.subject, "science");
  assert.equal(validateOperation("provision", input, args).ok, true);
  assert.equal(validateOperation("provision", input, args.filter((item) => item !== "--allow-write")).error, "target_provisioning_smoke_write_not_allowed");
});

test("target provisioning smoke script resolves without writing by default", () => {
  withPreparedDb(({ dbPath }) => {
    const result = runScript([
      "--workspace-id", WORKSPACE_ID,
      "--learner-id", LEARNER_ID,
      "--domain-pack-id", DOMAIN_PACK_ID,
      "--domain", "science",
      "--subject", "science",
      "--target-node-id", SCIENCE_NODE_ID,
      "--json"
    ], {
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(result.status, 1);
    const output = parseStdout(result);
    assert.equal(output.ok, false);
    assert.equal(output.error, "learning_target_not_provisioned");
  });
});

test("target provisioning smoke script provisions only with explicit write flag", () => {
  withPreparedDb(({ dbPath, store }) => {
    const blocked = runScript([
      "--operation", "provision",
      "--workspace-id", WORKSPACE_ID,
      "--learner-id", LEARNER_ID,
      "--domain-pack-id", DOMAIN_PACK_ID,
      "--domain", "science",
      "--subject", "science",
      "--json"
    ], {
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(blocked.status, 2);
    assert.equal(parseStdout(blocked).error, "target_provisioning_smoke_write_not_allowed");

    const provisioned = runScript([
      "--operation", "provision",
      "--workspace-id", WORKSPACE_ID,
      "--learner-id", LEARNER_ID,
      "--domain-pack-id", DOMAIN_PACK_ID,
      "--domain", "science",
      "--subject", "science",
      "--allow-write",
      "--json"
    ], {
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(provisioned.status, 0);
    const provisionOutput = parseStdout(provisioned);
    assert.equal(provisionOutput.ok, true);
    assert.equal(provisionOutput.provision.workspaceId, WORKSPACE_ID);
    assert.equal(provisionOutput.provision.domain, "science");
    assert.equal(provisionOutput.provision.subject, "science");

    const rows = store.domainPackProvisionRepository.listProvisions({
      workspaceId: WORKSPACE_ID,
      learnerId: LEARNER_ID,
      status: "active"
    });
    assert.equal(rows.length, 1);
    assert.equal(JSON.stringify(rows).includes("token"), false);

    const resolved = runScript([
      "--workspace-id", WORKSPACE_ID,
      "--learner-id", LEARNER_ID,
      "--domain-pack-id", DOMAIN_PACK_ID,
      "--domain", "science",
      "--subject", "science",
      "--target-node-id", SCIENCE_NODE_ID,
      "--json"
    ], {
      GROWTH_LEARNING_DB_PATH: dbPath
    });
    assert.equal(resolved.status, 0);
    const resolveOutput = parseStdout(resolved);
    assert.equal(resolveOutput.ok, true);
    assert.equal(resolveOutput.mode, "explicit_provision");
    assert.equal(resolveOutput.selectedDomain, "science");
    assert.equal(resolveOutput.selectedSubject, "science");
  });
});
