const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { sqlite } = require("../src/stores/growth-learning-sqlite/core");
const { createLearningGraphRepository } = require("../src/stores/growth-learning-sqlite/graph-repository");
const { createLearningGraphPlanService } = require("../src/services/learning-graph-plan-service");
const { createLearningCardGraphBindingService } = require("../src/services/learning-card-graph-binding-service");

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "learning-graph-plan-binding-"));
}

function createRepository(dbPath) {
  return createLearningGraphRepository({
    open(readOnly = true) {
      const { DatabaseSync } = sqlite();
      return new DatabaseSync(dbPath, { open: true, readOnly });
    }
  });
}

function graphPack() {
  return {
    schemaVersion: "hermes.learningGraphSeed.v0.1",
    importId: "kg_import_plan_test",
    version: "2026-06-11-test",
    privacyClass: "summary_only",
    sourceDocuments: [{ sourceRef: "public:test", title: "Public source", localPath: "sources/test.pdf" }],
    domainPacks: [{
      domainPackId: "domain_pack_plan_test",
      domain: "math",
      title: "Plan test pack",
      sourceKind: "owner_manual",
      version: "2026-06-11-test",
      ownerWorkspaceId: "owner",
      visibility: "private_seed",
      importStatus: "validated_seed"
    }],
    nodes: [
      node("kg_fraction_meaning", "Fraction meaning", ["Explain a fraction as part-whole evidence."]),
      node("kg_ratio_intro", "Ratio intro", ["Compare two quantities with a ratio."]),
      node("kg_ratio_assessment", "Ratio assessment", ["Solve and explain a ratio assessment task."])
    ],
    edges: [
      {
        edgeId: "edge_fraction_ratio",
        fromNodeId: "kg_fraction_meaning",
        toNodeId: "kg_ratio_intro",
        edgeType: "prerequisite",
        confidence: "seed",
        sourceRef: "public:test"
      },
      {
        edgeId: "edge_ratio_assessment",
        fromNodeId: "kg_ratio_intro",
        toNodeId: "kg_ratio_assessment",
        edgeType: "prerequisite",
        confidence: "seed",
        sourceRef: "public:test"
      }
    ]
  };
}

function node(nodeId, title, evidenceRequired) {
  return {
    nodeId,
    domain: "math",
    nodeType: "topic",
    title,
    stage: "lower_secondary",
    subject: "mathematics",
    curriculum: "test",
    sourceKind: "owner_manual",
    sourceRef: "public:test",
    version: "2026-06-11-test",
    privacyClass: "summary_only",
    learningOutcomes: [title],
    evidenceRequired
  };
}

function setup() {
  const dir = tempDir();
  const dbPath = path.join(dir, "growth.sqlite3");
  const graphRepository = createRepository(dbPath);
  graphRepository.importPack({
    pack: graphPack(),
    validation: { validation: {}, warnings: [] },
    sourceFile: "plan-test.json",
    sourceSha256: "hash"
  });
  return {
    graphRepository,
    planService: createLearningGraphPlanService({ graphRepository }),
    bindingService: createLearningCardGraphBindingService({ graphRepository })
  };
}

test("learning graph plan service creates a focused teaching plan from native graph nodes", async () => {
  const { planService } = setup();
  const plan = await planService.createPlan({
    learnerId: "weixin_stephen",
    workspaceId: "weixin_stephen",
    programId: "program_1",
    targetNodeId: "kg_ratio_intro",
    cardRole: "teaching"
  });

  assert.equal(plan.ok, true);
  assert.match(plan.learningGraphPlanId, /^lgp_[a-f0-9]{18}$/);
  assert.equal(plan.targetNodeId, "kg_ratio_intro");
  assert.equal(plan.domainPackId, "domain_pack_plan_test");
  assert.equal(plan.domain, "math");
  assert.equal(plan.subject, "mathematics");
  assert.deepEqual(plan.prerequisiteNodeIds, ["kg_fraction_meaning"]);
  assert.deepEqual(plan.pathNodeIds, ["kg_fraction_meaning", "kg_ratio_intro"]);
  assert.equal(plan.cardSequence[0].cardRole, "teaching");
  assert.deepEqual(plan.cardSequence[0].targetNodeIds, ["kg_ratio_intro"]);
  assert.equal(plan.privacyClass, "summary_only");
});

test("learning graph plan service rejects missing target and missing stage assessment coverage", async () => {
  const { planService } = setup();
  assert.equal((await planService.createPlan({
    targetNodeId: "kg_missing",
    cardRole: "teaching"
  })).error, "missing_target_node");

  assert.equal((await planService.createPlan({
    targetNodeId: "kg_ratio_assessment",
    cardRole: "stage_assessment"
  })).error, "assessment_coverage_missing");

  assert.equal((await planService.createPlan({
    targetNodeId: "kg_ratio_assessment",
    cardRole: "stage_assessment",
    assessmentCoverageNodeIds: ["kg_missing"]
  })).error, "missing_assessment_coverage_node");
});

test("learning graph plan service creates stage assessment plans only with explicit coverage", async () => {
  const { planService } = setup();
  const plan = await planService.createPlan({
    learnerId: "weixin_stephen",
    workspaceId: "weixin_stephen",
    programId: "program_1",
    targetNodeId: "kg_ratio_assessment",
    cardRole: "stage_assessment",
    assessmentCoverageNodeIds: ["kg_fraction_meaning", "kg_ratio_intro"]
  });

  assert.equal(plan.ok, true);
  assert.equal(plan.cardSequence[0].cardRole, "stage_assessment");
  assert.deepEqual(plan.assessmentCoverage, ["kg_fraction_meaning", "kg_ratio_intro"]);
  assert.deepEqual(plan.cardSequence[0].targetNodeIds, ["kg_fraction_meaning", "kg_ratio_intro"]);
});

test("learning card graph binding service stores valid bindings and rejects missing plans", async () => {
  const { planService, bindingService, graphRepository } = setup();
  const plan = await planService.createPlan({
    targetNodeId: "kg_ratio_intro",
    cardRole: "practice"
  });

  assert.equal(bindingService.validateFormalCard({
    graphRequired: true,
    taskCardId: "card_1"
  }).error, "learning_graph_plan_required");

  assert.equal((await bindingService.bindCard({
    taskCardId: "card_1",
    learningGraphPlanId: "lgp_missing",
    cardRole: "practice"
  })).error, "missing_learning_graph_plan");

  const binding = await bindingService.bindCard({
    taskCardId: "card_1",
    learningGraphPlanId: plan.learningGraphPlanId,
    cardRole: "practice",
    nodeIds: ["kg_ratio_intro"]
  });
  assert.equal(binding.taskCardId, "card_1");
  assert.deepEqual(binding.nodeIds, ["kg_ratio_intro"]);
  assert.equal(graphRepository.cardBinding({ bindingId: binding.bindingId }).learningGraphPlanId, plan.learningGraphPlanId);
});

test("learning card graph binding service enforces stage assessment coverage", async () => {
  const { planService, bindingService } = setup();
  const plan = await planService.createPlan({
    targetNodeId: "kg_ratio_assessment",
    cardRole: "stage_assessment",
    assessmentCoverageNodeIds: ["kg_fraction_meaning", "kg_ratio_intro"]
  });

  assert.equal((await bindingService.bindCard({
    taskCardId: "assessment_1",
    learningGraphPlanId: plan.learningGraphPlanId,
    cardRole: "stage_assessment",
    nodeIds: ["kg_ratio_assessment"],
    assessmentCoverage: []
  })).error, "assessment_coverage_missing");

  const binding = await bindingService.bindCard({
    taskCardId: "assessment_1",
    learningGraphPlanId: plan.learningGraphPlanId,
    cardRole: "stage_assessment",
    nodeIds: ["kg_ratio_assessment"],
    assessmentCoverage: ["kg_fraction_meaning", "kg_ratio_intro"]
  });
  assert.deepEqual(binding.assessmentCoverage, ["kg_fraction_meaning", "kg_ratio_intro"]);
});
