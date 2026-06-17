"use strict";

const RUBRIC_POLICY_SCHEMA_VERSION = "growth.card.rubricPolicy.v1";
const RUBRIC_POLICY_VERSION = "2026-06-17";

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

function boundedText(value, max = 240) {
  return cleanString(value).slice(0, max);
}

function normalizedDimension(input = {}) {
  return {
    dimensionId: cleanString(input.dimensionId || input.id),
    label: boundedText(input.label, 80),
    description: boundedText(input.description, 260),
    scoreWeight: Math.max(0, Math.min(1, Number(input.scoreWeight || 0) || 0)),
    evidenceTags: uniqueStrings(input.evidenceTags).slice(0, 8),
    masterySignals: asArray(input.masterySignals).map((item) => boundedText(item, 160)).filter(Boolean).slice(0, 6),
    profileTargets: uniqueStrings(input.profileTargets).slice(0, 6)
  };
}

function normalizedEvidenceMapping(input = {}) {
  return {
    evidenceKey: cleanString(input.evidenceKey || input.key),
    dimensionIds: uniqueStrings(input.dimensionIds || input.dimensions).slice(0, 6),
    evidenceType: cleanString(input.evidenceType || input.type || "learner_submission_summary"),
    source: cleanString(input.source || "submission"),
    ledgerField: cleanString(input.ledgerField || "summary.rubricResults")
  };
}

function normalizedPolicy(input = {}) {
  const dimensions = asArray(input.rubricDimensions || input.dimensions)
    .map(normalizedDimension)
    .filter((item) => item.dimensionId)
    .slice(0, 12);
  const dimensionIds = new Set(dimensions.map((item) => item.dimensionId));
  const evidenceMapping = asArray(input.evidenceMapping || input.evidenceMappings)
    .map(normalizedEvidenceMapping)
    .filter((item) => item.evidenceKey && item.dimensionIds.some((dimensionId) => dimensionIds.has(dimensionId)))
    .slice(0, 12);
  return {
    schemaVersion: RUBRIC_POLICY_SCHEMA_VERSION,
    policyVersion: RUBRIC_POLICY_VERSION,
    privacyClass: "summary_only",
    summaryOnly: true,
    policyId: cleanString(input.policyId),
    recipeId: cleanString(input.recipeId),
    domain: cleanString(input.domain),
    subject: cleanString(input.subject),
    cardRole: cleanString(input.cardRole || "practice"),
    scoringScale: {
      min: 0,
      max: 100,
      passScoreRequired: false,
      evaluationAttempts: 1,
      reflectionAttempts: 1
    },
    rubricDimensions: dimensions,
    evidenceMapping,
    ledgerMapping: {
      sourceField: "evaluation.rubricResults",
      fallbackSourceField: "evaluation.skillResults",
      summaryField: "summary.rubricResults",
      privacyClass: "summary_only"
    }
  };
}

function dailyEnglishPolicy() {
  return normalizedPolicy({
    policyId: "rubric:daily_english_v1",
    recipeId: "daily_english_v1",
    domain: "english",
    subject: "english",
    dimensions: [
      {
        dimensionId: "english_comprehension",
        label: "Comprehension",
        description: "Understands the prompt or reading focus.",
        scoreWeight: 0.3,
        evidenceTags: ["main_idea", "detail", "inference"],
        masterySignals: ["Identifies the relevant idea before answering."],
        profileTargets: ["comprehension"]
      },
      {
        dimensionId: "english_text_evidence",
        label: "Text evidence",
        description: "Uses a concrete reason, quote, or detail as evidence.",
        scoreWeight: 0.3,
        evidenceTags: ["reason", "quote", "detail"],
        masterySignals: ["Connects evidence to the answer."],
        profileTargets: ["evidence_use"]
      },
      {
        dimensionId: "english_expression",
        label: "Expression",
        description: "Writes clearly with enough structure for a short daily answer.",
        scoreWeight: 0.25,
        evidenceTags: ["clarity", "sentence_control", "structure"],
        masterySignals: ["Uses clear sentences and a simple structure."],
        profileTargets: ["expression"]
      },
      {
        dimensionId: "reflection_habit",
        label: "Reflection habit",
        description: "Can name one next check or improvement without pressure.",
        scoreWeight: 0.15,
        evidenceTags: ["next_step", "self_check"],
        masterySignals: ["Names one practical next step."],
        profileTargets: ["metacognition"]
      }
    ],
    evidenceMapping: [
      { evidenceKey: "short_answer", dimensionIds: ["english_comprehension", "english_expression"] },
      { evidenceKey: "reason_with_text_evidence", dimensionIds: ["english_text_evidence"] },
      { evidenceKey: "self_reflection_optional", dimensionIds: ["reflection_habit"], source: "reflection_optional" }
    ]
  });
}

function dailySciencePolicy() {
  return normalizedPolicy({
    policyId: "rubric:daily_science_v1",
    recipeId: "daily_science_v1",
    domain: "science",
    subject: "science",
    dimensions: [
      {
        dimensionId: "science_concept_understanding",
        label: "Concept understanding",
        description: "Uses the target science idea accurately.",
        scoreWeight: 0.3,
        evidenceTags: ["concept", "definition", "classification"],
        masterySignals: ["Names the target concept and uses it in context."],
        profileTargets: ["concept_understanding"]
      },
      {
        dimensionId: "science_causal_reasoning",
        label: "Scientific reasoning",
        description: "Explains cause, relationship, variable, or mechanism.",
        scoreWeight: 0.3,
        evidenceTags: ["because", "cause", "variable", "mechanism"],
        masterySignals: ["Explains why the result or relationship makes sense."],
        profileTargets: ["scientific_reasoning"]
      },
      {
        dimensionId: "science_evidence_use",
        label: "Evidence use",
        description: "Uses an observation, measurement, example, or fair-test detail.",
        scoreWeight: 0.25,
        evidenceTags: ["observation", "measurement", "fair_test", "example"],
        masterySignals: ["Supports the explanation with observable evidence."],
        profileTargets: ["evidence_use"]
      },
      {
        dimensionId: "science_vocabulary_precision",
        label: "Vocabulary precision",
        description: "Uses key science words carefully without overloading the task.",
        scoreWeight: 0.15,
        evidenceTags: ["keyword", "precision", "unit"],
        masterySignals: ["Uses important terms accurately enough for the age level."],
        profileTargets: ["academic_vocabulary"]
      }
    ],
    evidenceMapping: [
      { evidenceKey: "short_answer", dimensionIds: ["science_concept_understanding"] },
      { evidenceKey: "science_reasoning", dimensionIds: ["science_causal_reasoning", "science_evidence_use"] },
      { evidenceKey: "science_vocabulary", dimensionIds: ["science_vocabulary_precision"] },
      { evidenceKey: "self_reflection_optional", dimensionIds: ["science_causal_reasoning"], source: "reflection_optional" }
    ]
  });
}

function dailySubjectPracticePolicy(input = {}) {
  const domain = cleanString(input.domain) || "learning";
  const subject = cleanString(input.subject) || domain;
  return normalizedPolicy({
    policyId: `rubric:daily_subject_practice_v1:${subject || domain}`,
    recipeId: "daily_subject_practice_v1",
    domain,
    subject,
    dimensions: [
      {
        dimensionId: "subject_understanding",
        label: "Understanding",
        description: "Shows the target idea in a short daily answer.",
        scoreWeight: 0.35,
        evidenceTags: ["concept", "idea", "definition"],
        masterySignals: ["Uses the target idea in context."],
        profileTargets: ["understanding"]
      },
      {
        dimensionId: "subject_application",
        label: "Application",
        description: "Applies the idea to the prompt, example, or problem.",
        scoreWeight: 0.3,
        evidenceTags: ["application", "example", "step"],
        masterySignals: ["Connects the idea to a concrete example or step."],
        profileTargets: ["application"]
      },
      {
        dimensionId: "subject_evidence",
        label: "Evidence",
        description: "Includes enough evidence for a low-pressure daily check.",
        scoreWeight: 0.2,
        evidenceTags: ["evidence", "reason", "detail"],
        masterySignals: ["Supports the answer with a reason or detail."],
        profileTargets: ["evidence_use"]
      },
      {
        dimensionId: "subject_communication",
        label: "Communication",
        description: "Keeps the answer understandable and bounded.",
        scoreWeight: 0.15,
        evidenceTags: ["clarity", "structure"],
        masterySignals: ["Communicates the answer clearly enough to evaluate."],
        profileTargets: ["communication"]
      }
    ],
    evidenceMapping: [
      { evidenceKey: "short_answer", dimensionIds: ["subject_understanding", "subject_communication"] },
      { evidenceKey: "application_evidence", dimensionIds: ["subject_application", "subject_evidence"] },
      { evidenceKey: "self_reflection_optional", dimensionIds: ["subject_communication"], source: "reflection_optional" }
    ]
  });
}

function recipeIdFromInput(input = {}) {
  return cleanString(input.recipeId || input.recipe_id || input.selectedRecipeId || input.selected_recipe_id || input.id);
}

function domainFromInput(input = {}) {
  return cleanString(input.domain || input.learningGraph?.domain || input.learning_graph?.domain);
}

function subjectFromInput(input = {}) {
  return cleanString(input.subject || input.learningGraph?.subject || input.learning_graph?.subject);
}

function createLearningCardRubricPolicyService() {
  function resolveRubricPolicy(input = {}) {
    if (input.rubricPolicy?.schemaVersion === RUBRIC_POLICY_SCHEMA_VERSION) {
      return { ok: true, source: "growth-learning-card-rubric-policy-service", policy: normalizedPolicy(input.rubricPolicy) };
    }
    const recipeId = recipeIdFromInput(input);
    const domain = domainFromInput(input).toLowerCase();
    const subject = subjectFromInput(input).toLowerCase();
    if (recipeId === "daily_science_v1" || domain === "science" || subject === "science") {
      return { ok: true, source: "growth-learning-card-rubric-policy-service", policy: dailySciencePolicy() };
    }
    if (recipeId === "daily_subject_practice_v1") {
      return { ok: true, source: "growth-learning-card-rubric-policy-service", policy: dailySubjectPracticePolicy(input) };
    }
    if (recipeId === "daily_english_v1" || domain === "english" || subject === "english" || !recipeId) {
      return { ok: true, source: "growth-learning-card-rubric-policy-service", policy: dailyEnglishPolicy() };
    }
    return { ok: true, source: "growth-learning-card-rubric-policy-service", policy: dailySubjectPracticePolicy(input) };
  }

  function dimensionIds(input = {}) {
    const resolved = resolveRubricPolicy(input);
    return uniqueStrings(asArray(resolved.policy?.rubricDimensions).map((item) => item.dimensionId));
  }

  return {
    dailyEnglishPolicy,
    dailySciencePolicy,
    dailySubjectPracticePolicy,
    dimensionIds,
    resolveRubricPolicy
  };
}

module.exports = {
  RUBRIC_POLICY_SCHEMA_VERSION,
  createLearningCardRubricPolicyService,
  dailyEnglishPolicy,
  dailySciencePolicy,
  dailySubjectPracticePolicy
};
