"use strict";

const RUBRIC_POLICY_SCHEMA_VERSION = "growth.card.rubricPolicy.v1";
const RUBRIC_POLICY_VERSION = "2026-06-18";

const SUBJECT_KEY_ALIASES = {
  math: "mathematics",
  maths: "mathematics",
  mathematics: "mathematics",
  history: "history",
  humanities_history: "history",
  geography: "geography",
  humanities_geography: "geography",
  computing: "computer_science",
  computer: "computer_science",
  computer_science: "computer_science",
  cs: "computer_science"
};

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

function keyString(value) {
  return cleanString(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function subjectKey(value) {
  const key = keyString(value);
  return SUBJECT_KEY_ALIASES[key] || key;
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

function dailyMathematicsPolicy(input = {}) {
  return normalizedPolicy({
    policyId: "rubric:daily_mathematics_v1",
    recipeId: "daily_subject_practice_v1",
    domain: cleanString(input.domain) || "mathematics",
    subject: cleanString(input.subject) || "mathematics",
    dimensions: [
      {
        dimensionId: "math_concept_model",
        label: "Concept model",
        description: "Identifies the mathematical idea or representation needed for the task.",
        scoreWeight: 0.3,
        evidenceTags: ["concept", "representation", "model"],
        masterySignals: ["Chooses a useful representation before calculating."],
        profileTargets: ["math_modeling"]
      },
      {
        dimensionId: "math_procedure_accuracy",
        label: "Procedure accuracy",
        description: "Uses steps or calculation procedures accurately enough for a short daily check.",
        scoreWeight: 0.3,
        evidenceTags: ["steps", "calculation", "method"],
        masterySignals: ["Carries out the main procedure without losing the target idea."],
        profileTargets: ["procedure_accuracy"]
      },
      {
        dimensionId: "math_reasoning_explanation",
        label: "Reasoning explanation",
        description: "Explains why the step, comparison, or answer makes sense.",
        scoreWeight: 0.25,
        evidenceTags: ["reason", "why", "comparison"],
        masterySignals: ["Explains the reasoning in one or two clear sentences."],
        profileTargets: ["mathematical_reasoning"]
      },
      {
        dimensionId: "math_precision_check",
        label: "Precision check",
        description: "Checks units, labels, estimate, or final answer reasonableness without pressure.",
        scoreWeight: 0.15,
        evidenceTags: ["unit", "label", "check", "estimate"],
        masterySignals: ["Notices one precision or reasonableness check."],
        profileTargets: ["precision"]
      }
    ],
    evidenceMapping: [
      { evidenceKey: "short_answer", dimensionIds: ["math_concept_model", "math_reasoning_explanation"] },
      { evidenceKey: "worked_steps", dimensionIds: ["math_procedure_accuracy"] },
      { evidenceKey: "precision_check", dimensionIds: ["math_precision_check"] },
      { evidenceKey: "self_reflection_optional", dimensionIds: ["math_precision_check"], source: "reflection_optional" }
    ]
  });
}

function dailyHistoryPolicy(input = {}) {
  return normalizedPolicy({
    policyId: "rubric:daily_history_v1",
    recipeId: "daily_subject_practice_v1",
    domain: cleanString(input.domain) || "history",
    subject: cleanString(input.subject) || "history",
    dimensions: [
      {
        dimensionId: "history_context",
        label: "Context",
        description: "Places the event, person, source, or idea in the relevant historical setting.",
        scoreWeight: 0.3,
        evidenceTags: ["time", "place", "context"],
        masterySignals: ["Names the relevant period, place, or background before explaining."],
        profileTargets: ["historical_context"]
      },
      {
        dimensionId: "history_evidence_use",
        label: "Evidence use",
        description: "Uses a source detail, example, or factual detail to support the answer.",
        scoreWeight: 0.3,
        evidenceTags: ["source", "detail", "fact"],
        masterySignals: ["Supports the claim with one relevant historical detail."],
        profileTargets: ["evidence_use"]
      },
      {
        dimensionId: "history_cause_consequence",
        label: "Cause and consequence",
        description: "Explains cause, consequence, change, continuity, or significance.",
        scoreWeight: 0.25,
        evidenceTags: ["cause", "effect", "change", "significance"],
        masterySignals: ["Links the historical detail to a cause or consequence."],
        profileTargets: ["historical_reasoning"]
      },
      {
        dimensionId: "history_explanation_clarity",
        label: "Explanation clarity",
        description: "Keeps the short historical explanation clear and bounded.",
        scoreWeight: 0.15,
        evidenceTags: ["clarity", "structure"],
        masterySignals: ["Answers in a clear claim-plus-reason shape."],
        profileTargets: ["communication"]
      }
    ],
    evidenceMapping: [
      { evidenceKey: "short_answer", dimensionIds: ["history_context", "history_explanation_clarity"] },
      { evidenceKey: "source_or_detail", dimensionIds: ["history_evidence_use"] },
      { evidenceKey: "cause_consequence", dimensionIds: ["history_cause_consequence"] },
      { evidenceKey: "self_reflection_optional", dimensionIds: ["history_explanation_clarity"], source: "reflection_optional" }
    ]
  });
}

function dailyGeographyPolicy(input = {}) {
  return normalizedPolicy({
    policyId: "rubric:daily_geography_v1",
    recipeId: "daily_subject_practice_v1",
    domain: cleanString(input.domain) || "geography",
    subject: cleanString(input.subject) || "geography",
    dimensions: [
      {
        dimensionId: "geography_place_process",
        label: "Place and process",
        description: "Identifies the relevant place, environment, or geographic process.",
        scoreWeight: 0.3,
        evidenceTags: ["place", "process", "environment"],
        masterySignals: ["Names the place or process that the question depends on."],
        profileTargets: ["geographic_understanding"]
      },
      {
        dimensionId: "geography_data_map_use",
        label: "Data or map use",
        description: "Uses a map, data point, example, or observation to support the answer.",
        scoreWeight: 0.3,
        evidenceTags: ["map", "data", "observation", "example"],
        masterySignals: ["Connects a map/data/example detail to the explanation."],
        profileTargets: ["data_map_use"]
      },
      {
        dimensionId: "geography_cause_impact",
        label: "Cause and impact",
        description: "Explains cause, effect, relationship, or impact across people and place.",
        scoreWeight: 0.25,
        evidenceTags: ["cause", "impact", "relationship"],
        masterySignals: ["Explains how a process affects a place or people."],
        profileTargets: ["geographic_reasoning"]
      },
      {
        dimensionId: "geography_scale_vocabulary",
        label: "Scale and vocabulary",
        description: "Uses scale, location language, and geography vocabulary carefully.",
        scoreWeight: 0.15,
        evidenceTags: ["scale", "location", "keyword"],
        masterySignals: ["Uses a key term or scale clue accurately."],
        profileTargets: ["academic_vocabulary"]
      }
    ],
    evidenceMapping: [
      { evidenceKey: "short_answer", dimensionIds: ["geography_place_process", "geography_scale_vocabulary"] },
      { evidenceKey: "map_or_data_evidence", dimensionIds: ["geography_data_map_use"] },
      { evidenceKey: "cause_impact", dimensionIds: ["geography_cause_impact"] },
      { evidenceKey: "self_reflection_optional", dimensionIds: ["geography_scale_vocabulary"], source: "reflection_optional" }
    ]
  });
}

function dailyComputerSciencePolicy(input = {}) {
  return normalizedPolicy({
    policyId: "rubric:daily_computer_science_v1",
    recipeId: "daily_subject_practice_v1",
    domain: cleanString(input.domain) || "computer_science",
    subject: cleanString(input.subject) || "computer_science",
    dimensions: [
      {
        dimensionId: "computing_concept",
        label: "Computing concept",
        description: "Uses the target computing concept accurately in a small task.",
        scoreWeight: 0.3,
        evidenceTags: ["concept", "definition", "purpose"],
        masterySignals: ["Names the concept and its purpose in context."],
        profileTargets: ["computing_concept"]
      },
      {
        dimensionId: "computing_algorithmic_reasoning",
        label: "Algorithmic reasoning",
        description: "Explains steps, logic, condition, loop, data flow, or decomposition.",
        scoreWeight: 0.3,
        evidenceTags: ["algorithm", "logic", "step", "condition", "loop"],
        masterySignals: ["Explains the logic before or after giving an answer."],
        profileTargets: ["algorithmic_reasoning"]
      },
      {
        dimensionId: "computing_trace_or_output",
        label: "Trace or output",
        description: "Checks expected output, trace, state change, or example behavior.",
        scoreWeight: 0.25,
        evidenceTags: ["trace", "output", "state", "example"],
        masterySignals: ["Uses a trace or example output to verify the answer."],
        profileTargets: ["trace_debug"]
      },
      {
        dimensionId: "computing_debug_reflection",
        label: "Debug reflection",
        description: "Names one bug risk, edge case, or next check without pressure.",
        scoreWeight: 0.15,
        evidenceTags: ["debug", "edge_case", "next_check"],
        masterySignals: ["Names one practical check or possible bug."],
        profileTargets: ["debugging_habit"]
      }
    ],
    evidenceMapping: [
      { evidenceKey: "short_answer", dimensionIds: ["computing_concept", "computing_algorithmic_reasoning"] },
      { evidenceKey: "trace_or_output", dimensionIds: ["computing_trace_or_output"] },
      { evidenceKey: "debug_reflection", dimensionIds: ["computing_debug_reflection"] },
      { evidenceKey: "self_reflection_optional", dimensionIds: ["computing_debug_reflection"], source: "reflection_optional" }
    ]
  });
}

function dailySubjectPracticePolicy(input = {}) {
  const domain = cleanString(input.domain) || "learning";
  const subject = cleanString(input.subject) || domain;
  const key = subjectKey(subject || domain);
  if (key === "mathematics") return dailyMathematicsPolicy(Object.assign({}, input, { domain, subject }));
  if (key === "history") return dailyHistoryPolicy(Object.assign({}, input, { domain, subject }));
  if (key === "geography") return dailyGeographyPolicy(Object.assign({}, input, { domain, subject }));
  if (key === "computer_science") return dailyComputerSciencePolicy(Object.assign({}, input, { domain, subject }));
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

function formalStageAssessmentPolicy(input = {}) {
  const domain = cleanString(input.domain || input.learningGraph?.domain || input.learning_graph?.domain) || "learning";
  const subject = cleanString(
    input.subject
      || input.subjectId
      || input.subject_id
      || input.learningGraph?.subject
      || input.learning_graph?.subject
  ) || domain;
  const key = subjectKey(subject || domain) || "learning";
  const policy = normalizedPolicy({
    policyId: key === "learning" ? "rubric:stage_assessment_v1" : `rubric:stage_assessment_v1:${key}`,
    recipeId: "stage_assessment_v1",
    domain,
    subject,
    cardRole: "stage_assessment",
    dimensions: [
      {
        dimensionId: "stage_independent_understanding",
        label: "Independent understanding",
        description: "Shows the target ideas independently without daily-card scaffolding.",
        scoreWeight: 0.3,
        evidenceTags: ["independent", "concept", "accuracy"],
        masterySignals: ["Uses the target idea accurately without guided prompts."],
        profileTargets: ["independent_understanding"]
      },
      {
        dimensionId: "stage_transfer_application",
        label: "Transfer and application",
        description: "Applies the knowledge across the declared checkpoint coverage nodes.",
        scoreWeight: 0.3,
        evidenceTags: ["transfer", "application", "coverage"],
        masterySignals: ["Applies the idea to a new problem, example, or source."],
        profileTargets: ["transfer_application"]
      },
      {
        dimensionId: "stage_evidence_reasoning",
        label: "Evidence and reasoning",
        description: "Explains the answer with enough evidence, steps, data, or source details.",
        scoreWeight: 0.25,
        evidenceTags: ["evidence", "reasoning", "justification"],
        masterySignals: ["Justifies the answer with a concrete reason or evidence trail."],
        profileTargets: ["evidence_reasoning"]
      },
      {
        dimensionId: "stage_reflection_calibration",
        label: "Reflection calibration",
        description: "Uses one low-pressure reflection to calibrate confidence and next focus.",
        scoreWeight: 0.15,
        evidenceTags: ["reflection", "confidence", "next_focus"],
        masterySignals: ["Names one realistic next focus after the formal checkpoint."],
        profileTargets: ["metacognition"]
      }
    ],
    evidenceMapping: [
      { evidenceKey: "formal_answer", dimensionIds: ["stage_independent_understanding", "stage_evidence_reasoning"] },
      { evidenceKey: "independent_application", dimensionIds: ["stage_transfer_application"] },
      { evidenceKey: "coverage_reasoning", dimensionIds: ["stage_evidence_reasoning", "stage_transfer_application"] },
      { evidenceKey: "formal_reflection_once", dimensionIds: ["stage_reflection_calibration"], source: "reflection_once" }
    ]
  });
  return Object.assign({}, policy, {
    assessmentPolicy: {
      completionPolicy: "formal_assessment",
      evidenceWeight: "high",
      expectedDurationMinutes: { min: 25, max: 30 },
      evaluationAttempts: 1,
      reflectionAttempts: 1
    }
  });
}

function recipeIdFromInput(input = {}) {
  return cleanString(input.recipeId || input.recipe_id || input.selectedRecipeId || input.selected_recipe_id || input.id);
}

function domainFromInput(input = {}) {
  return cleanString(input.domain || input.learningGraph?.domain || input.learning_graph?.domain);
}

function subjectFromInput(input = {}) {
  return cleanString(input.subject || input.subjectId || input.subject_id || input.learningGraph?.subject || input.learning_graph?.subject);
}

function cardRoleFromInput(input = {}) {
  return cleanString(input.cardRole || input.card_role || input.learningGraph?.cardRole || input.learning_graph?.card_role).toLowerCase();
}

function completionPolicyModeFromInput(input = {}) {
  return cleanString(
    input.completionPolicy?.mode
      || input.completion_policy?.mode
      || input.completionMode
      || input.completion_mode
  ).toLowerCase();
}

function isFormalStageAssessmentInput(input = {}) {
  return cardRoleFromInput(input) === "stage_assessment"
    || completionPolicyModeFromInput(input) === "formal_assessment"
    || recipeIdFromInput(input) === "stage_assessment_v1";
}

function createLearningCardRubricPolicyService() {
  function resolveRubricPolicy(input = {}) {
    if (input.rubricPolicy?.schemaVersion === RUBRIC_POLICY_SCHEMA_VERSION) {
      return { ok: true, source: "growth-learning-card-rubric-policy-service", policy: normalizedPolicy(input.rubricPolicy) };
    }
    const recipeId = recipeIdFromInput(input);
    const domain = domainFromInput(input).toLowerCase();
    const subject = subjectFromInput(input).toLowerCase();
    if (isFormalStageAssessmentInput(input)) {
      return { ok: true, source: "growth-learning-card-rubric-policy-service", policy: formalStageAssessmentPolicy(input) };
    }
    if (recipeId === "daily_science_v1" || domain === "science" || subject === "science") {
      return { ok: true, source: "growth-learning-card-rubric-policy-service", policy: dailySciencePolicy() };
    }
    const key = subjectKey(subject || domain);
    if (["mathematics", "history", "geography", "computer_science"].includes(key)) {
      return { ok: true, source: "growth-learning-card-rubric-policy-service", policy: dailySubjectPracticePolicy(input) };
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

  function subjectCatalog() {
    return [
      dailyEnglishPolicy(),
      dailySciencePolicy(),
      dailyMathematicsPolicy({ domain: "math", subject: "mathematics" }),
      dailyHistoryPolicy(),
      dailyGeographyPolicy(),
      dailyComputerSciencePolicy(),
      formalStageAssessmentPolicy()
    ].map((policy) => ({
      policyId: policy.policyId,
      recipeId: policy.recipeId,
      domain: policy.domain,
      subject: policy.subject,
      cardRole: policy.cardRole,
      dimensionIds: policy.rubricDimensions.map((item) => item.dimensionId),
      evidenceKeys: policy.evidenceMapping.map((item) => item.evidenceKey)
    }));
  }

  return {
    dailyEnglishPolicy,
    dailyComputerSciencePolicy,
    dailyGeographyPolicy,
    dailyHistoryPolicy,
    dailyMathematicsPolicy,
    dailySciencePolicy,
    dailySubjectPracticePolicy,
    dimensionIds,
    formalStageAssessmentPolicy,
    resolveRubricPolicy,
    subjectCatalog
  };
}

module.exports = {
  RUBRIC_POLICY_SCHEMA_VERSION,
  createLearningCardRubricPolicyService,
  dailyComputerSciencePolicy,
  dailyEnglishPolicy,
  dailyGeographyPolicy,
  dailyHistoryPolicy,
  dailyMathematicsPolicy,
  dailySciencePolicy,
  dailySubjectPracticePolicy,
  formalStageAssessmentPolicy
};
