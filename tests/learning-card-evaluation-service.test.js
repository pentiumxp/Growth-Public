const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createGrowthGatewayEvaluationClient,
  gatewayEvaluationResponsesBody
} = require("../src/services/growth-gateway-evaluation-client");
const { createLearningCardEvaluationService } = require("../src/services/learning-card-evaluation-service");

function validEvaluationDraft(overrides = {}) {
  return Object.assign({
    schemaVersion: "growth.card.evaluation.v1",
    status: "completed",
    score: 76,
    maxScore: 100,
    passed: true,
    confidence: 0.82,
    summary: "The answer gives a reason and should use one more exact quote next time.",
    strengths: ["Clear reason."],
    remainingWeaknesses: ["Use one exact quote from the text."],
    feedbackSections: {
      strengths: ["Clear reason."],
      focusAreas: ["Use one exact quote from the text."],
      reflectionPrompts: ["Which phrase in the text helped you decide?"],
      nextPractice: "Practise one answer with a short quote."
    },
    skillResults: [{
      nodeId: "kg_english_evidence_answering",
      rubricDimensionId: "english_text_evidence",
      score: 76,
      confidence: 0.78,
      status: "developing",
      evidenceType: "learner_submission_summary",
      evidenceTags: ["reason", "quote"],
      evidenceSummary: "Reason is present; quote is vague."
    }],
    rubricResults: [{
      dimensionId: "english_text_evidence",
      nodeId: "kg_english_evidence_answering",
      score: 76,
      confidence: 0.78,
      status: "developing",
      evidenceType: "learner_submission_summary",
      evidenceTags: ["reason", "quote"],
      evidenceSummary: "Reason is present; quote is vague."
    }],
    evidenceRefs: ["rubric:daily_score_once"]
  }, overrides);
}

function evaluationInput(overrides = {}) {
  return Object.assign({
    submissionId: "submission_1",
    workspaceId: "weixin_stephen",
    text: "I think the character is kind because the text says she shared the food when another child was hungry.",
    submission: {
      id: "submission_1",
      task_card_id: "ltask_1",
      learner_id: "weixin_stephen",
      workspace_id: "weixin_stephen",
      raw_json: JSON.stringify({ text: "stored text stays in SQLite only" })
    },
    taskCard: {
      id: "ltask_1",
      title: "Use text evidence",
      learner_id: "weixin_stephen",
      workspace_id: "weixin_stephen",
      program_id: "program_english",
      raw_json: JSON.stringify({
        cardRole: "practice",
        recipeId: "daily_english_v1",
        learningGraph: { targetNodeIds: ["kg_english_evidence_answering"] },
        teachingFlow: {
          learningTarget: "Use one quote as evidence.",
          quickCheck: { expectedEvidence: ["reason", "quote"] }
        },
        evidenceToRecord: ["reason_with_text_evidence"],
        completionPolicy: { mode: "daily_score_once", passScoreRequired: false }
      })
    },
    taskRaw: {
      cardRole: "practice",
      recipeId: "daily_english_v1",
      learningGraph: { targetNodeIds: ["kg_english_evidence_answering"] },
      teachingFlow: {
        learningTarget: "Use one quote as evidence.",
        quickCheck: { expectedEvidence: ["reason", "quote"] }
      },
      evidenceToRecord: ["reason_with_text_evidence"],
      completionPolicy: { mode: "daily_score_once", passScoreRequired: false }
    }
  }, overrides);
}

function mathematicsEvaluationInput(overrides = {}) {
  return evaluationInput(Object.assign({
    text: "I compare the ratio with a bar model, then simplify both parts by the same factor.",
    taskCard: {
      id: "ltask_math_1",
      title: "Ratio model",
      learner_id: "weixin_stephen",
      workspace_id: "weixin_stephen",
      program_id: "program_math",
      raw_json: JSON.stringify({
        cardRole: "practice",
        recipeId: "daily_subject_practice_v1",
        domain: "math",
        subject: "mathematics",
        learningGraph: { targetNodeIds: ["kg_ratio_intro"], domain: "math", subject: "mathematics" },
        teachingFlow: {
          learningTarget: "Compare ratios with a model.",
          quickCheck: { expectedEvidence: ["worked_steps", "reasoning_check"] }
        },
        evidenceToRecord: ["worked_steps"],
        completionPolicy: { mode: "daily_score_once", passScoreRequired: false }
      })
    },
    taskRaw: {
      cardRole: "practice",
      recipeId: "daily_subject_practice_v1",
      domain: "math",
      subject: "mathematics",
      learningGraph: { targetNodeIds: ["kg_ratio_intro"], domain: "math", subject: "mathematics" },
      teachingFlow: {
        learningTarget: "Compare ratios with a model.",
        quickCheck: { expectedEvidence: ["worked_steps", "reasoning_check"] }
      },
      evidenceToRecord: ["worked_steps"],
      completionPolicy: { mode: "daily_score_once", passScoreRequired: false }
    }
  }, overrides));
}

function stageAssessmentEvaluationInput(overrides = {}) {
  return evaluationInput(Object.assign({
    text: "I independently explain the fair-test variable, apply it to a new setup, and justify the conclusion with evidence.",
    taskCard: {
      id: "ltask_stage_science_1",
      title: "Fair test checkpoint",
      learner_id: "weixin_stephen",
      workspace_id: "weixin_stephen",
      program_id: "program_science",
      card_role: "stage_assessment",
      raw_json: JSON.stringify({
        cardRole: "stage_assessment",
        domain: "science",
        subject: "science",
        learningGraph: {
          domain: "science",
          subject: "science",
          targetNodeIds: ["kg_science_fair_test"],
          assessmentCoverageNodeIds: ["kg_science_fair_test", "kg_science_variables"]
        },
        teachingFlow: {
          learningTarget: "Explain fair-test variables independently.",
          quickCheck: { expectedEvidence: ["formal_answer", "coverage_reasoning"] }
        },
        evidenceToRecord: ["formal_answer", "coverage_reasoning"],
        completionPolicy: { mode: "formal_assessment", passScoreRequired: false }
      })
    },
    taskRaw: {
      cardRole: "stage_assessment",
      domain: "science",
      subject: "science",
      learningGraph: {
        domain: "science",
        subject: "science",
        targetNodeIds: ["kg_science_fair_test"],
        assessmentCoverageNodeIds: ["kg_science_fair_test", "kg_science_variables"]
      },
      teachingFlow: {
        learningTarget: "Explain fair-test variables independently.",
        quickCheck: { expectedEvidence: ["formal_answer", "coverage_reasoning"] }
      },
      evidenceToRecord: ["formal_answer", "coverage_reasoning"],
      completionPolicy: { mode: "formal_assessment", passScoreRequired: false }
    }
  }, overrides));
}

function sseForText(text) {
  const mid = Math.ceil(text.length / 2);
  return [
    `data: ${JSON.stringify({ delta: text.slice(0, mid) })}`,
    "",
    `data: ${JSON.stringify({ delta: text.slice(mid) })}`,
    "",
    "data: [DONE]",
    ""
  ].join("\n");
}

function createEvaluationHarness(responses, options = {}) {
  const queue = Array.isArray(responses) ? responses.slice() : [responses];
  const calls = [];
  const gatewayClient = createGrowthGatewayEvaluationClient({
    timeoutMs: options.timeoutMs || 1000,
    transport(payload) {
      calls.push(payload);
      const next = queue.shift();
      return typeof next === "function" ? next(payload) : next;
    }
  });
  const service = createLearningCardEvaluationService({
    gatewayClient,
    now: () => new Date("2026-06-14T08:00:00.000Z")
  });
  return { calls, service };
}

test("learning card evaluation service accepts a valid streaming Gateway draft", async () => {
  const { calls, service } = createEvaluationHarness({ sse: sseForText(JSON.stringify(validEvaluationDraft())) });

  const result = await service.evaluateSubmissionDraft(evaluationInput());

  assert.equal(result.ok, true);
  assert.equal(result.gatewayMode, "stream");
  assert.equal(result.evaluation.status, "completed");
  assert.equal(result.evaluation.score, 76);
  assert.equal(result.evaluation.maxScore, 100);
  assert.equal(result.evaluation.passed, true);
  assert.equal(result.evaluation.skillResults[0].nodeId, "kg_english_evidence_answering");
  assert.equal(result.evaluation.skillResults[0].rubricDimensionId, "english_text_evidence");
  assert.equal(result.evaluation.rubricPolicyId, "rubric:daily_english_v1");
  assert.equal(result.evaluation.rubricResults[0].dimensionId, "english_text_evidence");
  assert.equal(calls[0].kind, "growth.card_evaluation.evaluate");
  assert.equal(calls[0].input.policy.completionPolicy, "daily_score_once");
  assert.equal(calls[0].input.policy.passScoreRequired, false);
  assert.equal(calls[0].input.card.rubricPolicy.policyId, "rubric:daily_english_v1");
  assert.equal(calls[0].input.learnerEvidence.text.includes("character is kind"), true);
  assert.equal(Object.hasOwn(calls[0].input.learnerEvidence, "rawText"), false);
  assert.equal(JSON.stringify(result.evaluation).includes("stored text stays in SQLite only"), false);
});

test("learning card evaluation service keeps subject capability cluster out of graph targets", async () => {
  const { calls, service } = createEvaluationHarness({
    json: {
      output_text: JSON.stringify(validEvaluationDraft({
        skillResults: [{
          nodeId: "kg_science_ideas_evidence",
          rubricDimensionId: "science_concept_understanding",
          score: 82,
          confidence: 0.8,
          status: "developing",
          evidenceType: "learner_submission_summary",
          evidenceSummary: "Explains the link between idea and evidence."
        }],
        rubricResults: [{
          dimensionId: "science_concept_understanding",
          nodeId: "kg_science_ideas_evidence",
          score: 82,
          confidence: 0.8,
          status: "developing",
          evidenceType: "learner_submission_summary",
          evidenceSummary: "Explains the link between idea and evidence."
        }]
      }))
    }
  });

  const result = await service.evaluateSubmissionDraft(evaluationInput({
    taskCard: {
      id: "ltask_science_1",
      title: "Science ideas and evidence",
      learner_id: "weixin_stephen",
      workspace_id: "weixin_stephen",
      program_id: "",
      domain: "science",
      card_role: "practice",
      capability_cluster_id: "science",
      skill_ids_json: JSON.stringify(["kg_science_ideas_evidence"]),
      raw_json: JSON.stringify({
        cardRole: "practice",
        recipeId: "daily_science_v1",
        domain: "science",
        subject: "science",
        learningGraph: {
          targetNodeIds: ["kg_science_ideas_evidence"],
          domain: "science",
          subject: "science"
        },
        teachingFlow: {
          learningTarget: "Connect an idea to evidence.",
          quickCheck: { expectedEvidence: ["short_answer"] }
        },
        evidenceToRecord: ["short_answer"],
        completionPolicy: { mode: "daily_score_once", passScoreRequired: false }
      })
    },
    taskRaw: {
      cardRole: "practice",
      recipeId: "daily_science_v1",
      domain: "science",
      subject: "science",
      learningGraph: { targetNodeIds: ["kg_science_ideas_evidence"] },
      completionPolicy: { mode: "daily_score_once", passScoreRequired: false }
    }
  }));

  assert.equal(result.ok, true);
  assert.deepEqual(calls[0].input.card.targetNodeIds, ["kg_science_ideas_evidence"]);
  assert.equal(calls[0].input.card.targetNodeIds.includes("science"), false);
});

test("learning card evaluation service accepts ordinary JSON Gateway drafts", async () => {
  const { service } = createEvaluationHarness({
    json: {
      output_text: JSON.stringify(validEvaluationDraft({ score: 91, passed: true, confidence: 0.9 }))
    }
  });

  const result = await service.evaluateSubmissionDraft(evaluationInput());

  assert.equal(result.ok, true);
  assert.equal(result.gatewayMode, "json");
  assert.equal(result.evaluation.score, 91);
  assert.equal(result.evaluation.confidence, 0.9);
});

test("learning card evaluation service uses subject-specific mathematics rubric policy", async () => {
  const { calls, service } = createEvaluationHarness({
    json: {
      output_text: JSON.stringify(validEvaluationDraft({
        skillResults: [{
          nodeId: "kg_ratio_intro",
          rubricDimensionId: "math_reasoning_explanation",
          score: 82,
          confidence: 0.8,
          status: "observed",
          evidenceType: "learner_submission_summary",
          evidenceSummary: "Explains why the same factor preserves the ratio."
        }],
        rubricResults: [{
          dimensionId: "math_reasoning_explanation",
          nodeId: "kg_ratio_intro",
          score: 82,
          confidence: 0.8,
          status: "observed",
          evidenceType: "learner_submission_summary",
          evidenceSummary: "Explains why the same factor preserves the ratio."
        }]
      }))
    }
  });

  const result = await service.evaluateSubmissionDraft(mathematicsEvaluationInput());

  assert.equal(result.ok, true);
  assert.equal(result.evaluation.rubricPolicyId, "rubric:daily_mathematics_v1");
  assert.equal(result.evaluation.rubricResults[0].dimensionId, "math_reasoning_explanation");
  assert.equal(calls[0].input.card.rubricPolicy.policyId, "rubric:daily_mathematics_v1");
  assert.deepEqual(calls[0].input.card.rubricPolicy.rubricDimensions.map((item) => item.dimensionId), [
    "math_concept_model",
    "math_procedure_accuracy",
    "math_reasoning_explanation",
    "math_precision_check"
  ]);
});

test("learning card evaluation service uses formal stage assessment rubric policy", async () => {
  const { calls, service } = createEvaluationHarness({
    json: {
      output_text: JSON.stringify(validEvaluationDraft({
        skillResults: [{
          nodeId: "kg_science_fair_test",
          rubricDimensionId: "stage_evidence_reasoning",
          score: 88,
          confidence: 0.86,
          status: "mastered",
          evidenceType: "formal_assessment_summary",
          evidenceSummary: "Justifies the fair-test conclusion with evidence."
        }],
        rubricResults: [{
          dimensionId: "stage_evidence_reasoning",
          nodeId: "kg_science_fair_test",
          score: 88,
          confidence: 0.86,
          status: "mastered",
          evidenceType: "formal_assessment_summary",
          evidenceSummary: "Justifies the fair-test conclusion with evidence."
        }]
      }))
    }
  });

  const result = await service.evaluateSubmissionDraft(stageAssessmentEvaluationInput());

  assert.equal(result.ok, true);
  assert.equal(result.evaluation.rubricPolicyId, "rubric:stage_assessment_v1:science");
  assert.equal(result.evaluation.rubricResults[0].dimensionId, "stage_evidence_reasoning");
  assert.equal(calls[0].input.policy.completionPolicy, "formal_assessment");
  assert.equal(calls[0].input.card.rubricPolicy.policyId, "rubric:stage_assessment_v1:science");
  assert.deepEqual(calls[0].input.card.rubricPolicy.rubricDimensions.map((item) => item.dimensionId), [
    "stage_independent_understanding",
    "stage_transfer_application",
    "stage_evidence_reasoning",
    "stage_reflection_calibration"
  ]);
});

test("Gateway evaluation client can call an official Responses endpoint", async () => {
  const calls = [];
  const client = createGrowthGatewayEvaluationClient({
    endpoint: "http://127.0.0.1:18751/v1/responses",
    accessToken: "gateway-secret",
    model: "gpt-5.5",
    fetchImpl(url, options = {}) {
      calls.push({ url, options });
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          output: [{
            type: "message",
            content: [{
              type: "output_text",
              text: JSON.stringify(validEvaluationDraft({ score: 88 }))
            }]
          }]
        }))
      });
    }
  });

  const result = await client.evaluateCardSubmission(evaluationInput());

  assert.equal(result.ok, true);
  assert.equal(result.mode, "json");
  assert.equal(JSON.parse(result.text).score, 88);
  assert.equal(calls[0].url, "http://127.0.0.1:18751/v1/responses");
  assert.equal(calls[0].options.headers.authorization, "Bearer gateway-secret");
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.model, "gpt-5.5");
  assert.equal(body.stream, false);
  assert.equal(body.metadata.kind, "growth.card_evaluation.evaluate");
  assert.match(body.input, /Return exactly one JSON object/);
  assert.match(body.input, /growth.card.evaluation.v1/);
  assert.match(body.input, /daily_score_once/);
});

test("Gateway evaluation client returns bounded HTTP failure summaries", async () => {
  const client = createGrowthGatewayEvaluationClient({
    endpoint: "http://127.0.0.1:18751/v1/responses",
    protocol: "responses",
    fetchImpl() {
      return Promise.resolve({
        ok: false,
        status: 401,
        text: () => Promise.resolve(JSON.stringify({
          error: {
            message: "Invalid API key",
            type: "invalid_request_error",
            code: "invalid_api_key"
          }
        }))
      });
    }
  });

  const result = await client.evaluateCardSubmission(evaluationInput());

  assert.equal(result.ok, false);
  assert.equal(result.error, "gateway_http_error");
  assert.equal(result.status, 401);
  assert.equal(result.gatewayErrorCode, "invalid_api_key");
  assert.equal(result.gatewayErrorType, "invalid_request_error");
  assert.equal(JSON.stringify(result).includes("Invalid API key"), false);
});

test("Gateway evaluation Responses body supports repair prompts", () => {
  const body = gatewayEvaluationResponsesBody({
    kind: "growth.card_evaluation.repair",
    input: {
      request: { policy: { completionPolicy: "daily_score_once" } },
      invalidOutput: "{ invalid json",
      errors: [{ code: "evaluation_draft_invalid_json" }]
    }
  }, { model: "gpt-5.5", stream: true });

  assert.equal(body.model, "gpt-5.5");
  assert.equal(body.stream, true);
  assert.match(body.input, /Repair the invalid evaluation draft/);
  assert.match(body.input, /evaluation_draft_invalid_json/);
});

test("learning card evaluation service rejects invalid JSON Gateway output", async () => {
  const { service } = createEvaluationHarness({ body: "{ invalid json" });

  const result = await service.evaluateSubmissionDraft(evaluationInput());

  assert.equal(result.ok, false);
  assert.equal(result.stage, "validation");
  assert.equal(result.error, "evaluation_draft_invalid_json");
});

test("learning card evaluation service rejects schema-missing Gateway output", async () => {
  const { service } = createEvaluationHarness({
    json: { output_text: JSON.stringify({ schemaVersion: "growth.card.evaluation.v1", score: 80 }) }
  });

  const result = await service.evaluateSubmissionDraft(evaluationInput());

  assert.equal(result.ok, false);
  assert.equal(result.stage, "validation");
  assert.equal(result.error, "evaluation_draft_schema_invalid");
  assert.ok(result.errors.some((error) => error.field === "summary"));
});

test("learning card evaluation service rejects rubric dimensions outside policy", async () => {
  const { service } = createEvaluationHarness({
    json: {
      output_text: JSON.stringify(validEvaluationDraft({
        rubricResults: [{
          dimensionId: "science_causal_reasoning",
          nodeId: "kg_english_evidence_answering",
          score: 80,
          evidenceSummary: "Wrong rubric dimension for this English card."
        }]
      }))
    }
  });

  const result = await service.evaluateSubmissionDraft(evaluationInput());

  assert.equal(result.ok, false);
  assert.equal(result.stage, "validation");
  assert.equal(result.error, "evaluation_draft_schema_invalid");
  assert.ok(result.errors.some((error) => error.code === "rubric_result_dimension_invalid"));
});

test("learning card evaluation service rejects privacy-risk Gateway output", async () => {
  const { service } = createEvaluationHarness({
    json: {
      output_text: JSON.stringify(validEvaluationDraft({
        rawAnswer: "I think the character is kind because the text says she shared the food."
      }))
    }
  });

  const result = await service.evaluateSubmissionDraft(evaluationInput());

  assert.equal(result.ok, false);
  assert.equal(result.stage, "validation");
  assert.equal(result.error, "evaluation_draft_privacy_failed");
  assert.ok(result.privacyFindings.some((finding) => finding.code === "privacy_risk_key"));
});

test("learning card evaluation service reports Gateway timeout as retryable", async () => {
  const { service } = createEvaluationHarness(() => new Promise(() => {}), { timeoutMs: 5 });

  const result = await service.evaluateSubmissionDraft(evaluationInput());

  assert.equal(result.ok, false);
  assert.equal(result.stage, "gateway");
  assert.equal(result.error, "gateway_timeout");
  assert.equal(result.gatewayResult.retryable, true);
});

test("evaluateSubmission throws on invalid Gateway output for queue retry", async () => {
  const { service } = createEvaluationHarness({ body: "{ invalid json" });

  await assert.rejects(
    () => service.evaluateSubmission(evaluationInput()),
    /evaluation_draft_invalid_json/
  );
});
