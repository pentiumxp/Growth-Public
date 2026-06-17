const assert = require("node:assert/strict");
const test = require("node:test");

const {
  inputFromArgs,
  projectPlannerReadinessSmokeReadback,
  targetNodeIds
} = require("../scripts/smoke-growth-planner-readiness");

test("planner readiness smoke script parses bounded target and graph selectors", () => {
  const args = [
    "--workspace-id", "weixin_stephen",
    "--learner-id", "fanfan",
    "--program-id", "program_science",
    "--domain-pack-id", "uk_hk_curriculum_foundation",
    "--domain", "science",
    "--subject", "science",
    "--target-node-id", "kg_science_fair_test",
    "--target-node-ids", "kg_science_fair_test,kg_science_observation_language",
    "--available-minutes", "15"
  ];

  assert.deepEqual(targetNodeIds(args), [
    "kg_science_fair_test",
    "kg_science_observation_language"
  ]);
  assert.deepEqual(inputFromArgs(args), {
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "uk_hk_curriculum_foundation",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    availableMinutes: 15,
    targetNodeIds: ["kg_science_fair_test", "kg_science_observation_language"]
  });
});

test("planner readiness smoke script projects operator readback", () => {
  const input = {
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    programId: "program_science",
    domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
    domain: "science",
    subject: "science",
    horizon: "daily_plan",
    availableMinutes: 15,
    targetNodeIds: ["kg_science_fair_test"]
  };
  const projected = projectPlannerReadinessSmokeReadback({
    ok: true,
    source: "growth-learning-plan-orchestrator-service",
    gatewayMode: "json",
    context: {
      schemaVersion: "growth.learningPlanner.input.v1",
      horizon: "daily_plan",
      workspaceId: "weixin_stephen",
      learnerId: "fanfan",
      domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
      domain: "science",
      subject: "science",
      candidateNodeCount: 2,
      recentEvidenceCount: 3,
      privacyClass: "summary_only"
    },
    draftSummary: {
      schemaVersion: "growth.learningPlanDraft.v1",
      horizon: "daily_plan",
      itemCount: 1,
      targetNodeIds: ["kg_science_fair_test"]
    }
  }, input);

  assert.equal(projected.plannerReadinessStatus, "pass");
  assert.equal(projected.plannerReadinessOk, true);
  assert.equal(projected.plannerReadinessWriteOperation, false);
  assert.equal(projected.plannerReadinessWritesPerformed, false);
  assert.equal(projected.plannerReadinessWorkspaceId, "weixin_stephen");
  assert.equal(projected.plannerReadinessLearnerId, "fanfan");
  assert.equal(projected.plannerReadinessProgramId, "program_science");
  assert.equal(projected.plannerReadinessGatewayMode, "json");
  assert.equal(projected.plannerReadinessHorizon, "daily_plan");
  assert.equal(projected.plannerReadinessAvailableMinutes, 15);
  assert.equal(projected.plannerReadinessCandidateNodeCount, 2);
  assert.equal(projected.plannerReadinessRecentEvidenceCount, 3);
  assert.equal(projected.plannerReadinessPrivacyClass, "summary_only");
  assert.equal(projected.plannerReadinessDraftSchemaVersion, "growth.learningPlanDraft.v1");
  assert.equal(projected.plannerReadinessDraftItemCount, 1);
  assert.deepEqual(projected.plannerReadinessDraftTargetNodeIds, ["kg_science_fair_test"]);
  assert.deepEqual(projected.plannerReadinessInputTargetNodeIds, ["kg_science_fair_test"]);
});

test("planner readiness smoke script projects bounded failure readback", () => {
  const projected = projectPlannerReadinessSmokeReadback({
    ok: false,
    source: "growth-learning-plan-orchestrator-service",
    error: "learning_planner_gateway_unavailable",
    retryable: true,
    gatewayMode: "",
    context: {
      horizon: "daily_plan",
      workspaceId: "weixin_stephen",
      learnerId: "fanfan",
      domain: "science",
      subject: "science",
      privacyClass: "summary_only"
    }
  }, {
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    programId: "program_science",
    availableMinutes: 15
  });

  assert.equal(projected.plannerReadinessStatus, "learning_planner_gateway_unavailable");
  assert.equal(projected.plannerReadinessOk, false);
  assert.equal(projected.plannerReadinessRetryable, true);
  assert.equal(projected.plannerReadinessWriteOperation, false);
  assert.equal(projected.plannerReadinessWritesPerformed, false);
  assert.equal(projected.plannerReadinessDraftItemCount, 0);
});
