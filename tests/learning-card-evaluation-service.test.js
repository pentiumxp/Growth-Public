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
      score: 76,
      confidence: 0.78,
      status: "developing",
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
  assert.equal(calls[0].kind, "growth.card_evaluation.evaluate");
  assert.equal(calls[0].input.policy.completionPolicy, "daily_score_once");
  assert.equal(calls[0].input.policy.passScoreRequired, false);
  assert.equal(calls[0].input.learnerEvidence.text.includes("character is kind"), true);
  assert.equal(Object.hasOwn(calls[0].input.learnerEvidence, "rawText"), false);
  assert.equal(JSON.stringify(result.evaluation).includes("stored text stays in SQLite only"), false);
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
