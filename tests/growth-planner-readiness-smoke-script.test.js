const assert = require("node:assert/strict");
const test = require("node:test");

const {
  inputFromArgs,
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
