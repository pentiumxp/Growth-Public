const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createLearningCardRubricPolicyService
} = require("../src/services/learning-card-rubric-policy-service");

test("rubric policy service returns bounded daily science rubric and evidence mapping", () => {
  const service = createLearningCardRubricPolicyService();

  const result = service.resolveRubricPolicy({
    recipeId: "daily_science_v1",
    domain: "science",
    subject: "science"
  });

  assert.equal(result.ok, true);
  assert.equal(result.policy.schemaVersion, "growth.card.rubricPolicy.v1");
  assert.equal(result.policy.policyId, "rubric:daily_science_v1");
  assert.equal(result.policy.privacyClass, "summary_only");
  assert.deepEqual(
    result.policy.rubricDimensions.map((item) => item.dimensionId),
    [
      "science_concept_understanding",
      "science_causal_reasoning",
      "science_evidence_use",
      "science_vocabulary_precision"
    ]
  );
  assert.ok(result.policy.evidenceMapping.some((item) => item.evidenceKey === "science_reasoning"));
  assert.equal(JSON.stringify(result.policy).includes("raw learner answer"), false);
});

test("rubric policy service parameterizes generic subject practice", () => {
  const service = createLearningCardRubricPolicyService();

  const result = service.resolveRubricPolicy({
    recipeId: "daily_subject_practice_v1",
    domain: "history",
    subject: "history"
  });

  assert.equal(result.ok, true);
  assert.equal(result.policy.recipeId, "daily_subject_practice_v1");
  assert.equal(result.policy.domain, "history");
  assert.equal(result.policy.subject, "history");
  assert.equal(result.policy.policyId, "rubric:daily_subject_practice_v1:history");
  assert.deepEqual(service.dimensionIds(result.policy), [
    "subject_understanding",
    "subject_application",
    "subject_evidence",
    "subject_communication"
  ]);
});
