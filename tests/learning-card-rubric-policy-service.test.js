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

test("rubric policy service returns subject-specific daily practice policies before generic fallback", () => {
  const service = createLearningCardRubricPolicyService();

  const mathematics = service.resolveRubricPolicy({
    recipeId: "daily_subject_practice_v1",
    domain: "math",
    subject: "mathematics"
  });
  const history = service.resolveRubricPolicy({
    recipeId: "daily_subject_practice_v1",
    domain: "history",
    subject: "history"
  });
  const geography = service.resolveRubricPolicy({
    recipeId: "daily_subject_practice_v1",
    domain: "humanities",
    subject: "geography"
  });
  const computing = service.resolveRubricPolicy({
    recipeId: "daily_subject_practice_v1",
    domain: "computing",
    subject: "computer science"
  });
  const generic = service.resolveRubricPolicy({
    recipeId: "daily_subject_practice_v1",
    domain: "arts",
    subject: "drama"
  });

  assert.equal(mathematics.ok, true);
  assert.equal(mathematics.policy.policyId, "rubric:daily_mathematics_v1");
  assert.deepEqual(service.dimensionIds(mathematics.policy), [
    "math_concept_model",
    "math_procedure_accuracy",
    "math_reasoning_explanation",
    "math_precision_check"
  ]);
  assert.equal(history.policy.policyId, "rubric:daily_history_v1");
  assert.equal(history.policy.domain, "history");
  assert.equal(history.policy.subject, "history");
  assert.deepEqual(service.dimensionIds(history.policy), [
    "history_context",
    "history_evidence_use",
    "history_cause_consequence",
    "history_explanation_clarity"
  ]);
  assert.equal(geography.policy.policyId, "rubric:daily_geography_v1");
  assert.equal(computing.policy.policyId, "rubric:daily_computer_science_v1");
  assert.equal(generic.policy.policyId, "rubric:daily_subject_practice_v1:drama");
  assert.deepEqual(service.dimensionIds(generic.policy), [
    "subject_understanding",
    "subject_application",
    "subject_evidence",
    "subject_communication"
  ]);
});

test("rubric policy service exposes bounded subject catalog summaries", () => {
  const service = createLearningCardRubricPolicyService();
  const catalog = service.subjectCatalog();

  assert.equal(catalog.some((item) => item.policyId === "rubric:daily_mathematics_v1"), true);
  assert.equal(catalog.some((item) => item.policyId === "rubric:daily_history_v1"), true);
  assert.equal(catalog.some((item) => item.policyId === "rubric:daily_geography_v1"), true);
  assert.equal(catalog.some((item) => item.policyId === "rubric:daily_computer_science_v1"), true);
  assert.equal(catalog.every((item) => Array.isArray(item.dimensionIds) && item.dimensionIds.length > 0), true);
  assert.equal(JSON.stringify(catalog).includes("raw learner answer"), false);
});
