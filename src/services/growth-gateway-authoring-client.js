"use strict";

function cleanString(value) {
  return String(value || "").trim();
}

function unavailable(error, extra = {}) {
  return Object.assign({}, extra, { ok: false, error });
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function timeoutPromise(promise, timeoutMs, error = "gateway_timeout") {
  const ms = Math.max(1, Number(timeoutMs || 0) || 1);
  let timer = null;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(unavailable(error, { retryable: true })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function textFromContentPart(part) {
  if (typeof part === "string") return part;
  if (Array.isArray(part)) return textFromContentParts(part);
  if (!isObject(part)) return "";
  for (const key of ["text", "output_text", "content", "delta"]) {
    const value = part[key];
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      const text = textFromContentParts(value);
      if (text) return text;
    }
    if (isObject(value)) {
      const text = textFromGatewayJson(value);
      if (text) return text;
    }
  }
  if (Array.isArray(part.message?.content)) return textFromContentParts(part.message.content);
  return "";
}

function textFromContentParts(parts = []) {
  return asArray(parts).map(textFromContentPart).join("");
}

function textFromGatewayJson(payload) {
  if (typeof payload === "string") return payload;
  if (!isObject(payload)) return "";
  for (const key of ["delta", "text", "outputText", "output_text", "content", "message", "result"]) {
    const value = payload[key];
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      const text = textFromContentParts(value);
      if (text) return text;
    }
    if (isObject(value)) {
      const nested = textFromGatewayJson(value);
      if (nested) return nested;
    }
  }
  if (payload.draft && isObject(payload.draft)) return JSON.stringify(payload.draft);
  if (payload.cardDraft && isObject(payload.cardDraft)) return JSON.stringify(payload.cardDraft);
  if (payload.cardRole || payload.teachingFlow) return JSON.stringify(payload);
  if (Array.isArray(payload.choices) && payload.choices.length) {
    const choiceText = payload.choices.map((choice) => {
      if (!isObject(choice)) return "";
      return cleanString(
        choice.text
          || choice.delta?.content
          || choice.message?.content
          || choice.message?.text
      );
    }).join("");
    if (choiceText) return choiceText;
  }
  if (payload.output && Array.isArray(payload.output)) {
    const text = textFromContentParts(payload.output);
    if (text) return text;
  }
  return "";
}

function endpointLooksLikeResponses(endpoint = "") {
  const value = cleanString(endpoint).toLowerCase();
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return /\/v1\/responses\/?$/.test(parsed.pathname) || /\/responses\/?$/.test(parsed.pathname);
  } catch {
    return /\/v1\/responses(?:\?|$|\/)/.test(value) || /\/responses(?:\?|$|\/)/.test(value);
  }
}

function normalizeProtocol(value = "", endpoint = "") {
  const protocol = cleanString(value).toLowerCase().replaceAll("_", "-");
  if (["responses", "openai-responses", "gateway-responses", "v1-responses"].includes(protocol)) return "responses";
  if (["generic", "growth-generic", "hermes-growth-authoring"].includes(protocol)) return "generic";
  return endpointLooksLikeResponses(endpoint) ? "responses" : "generic";
}

function prettyJson(value) {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch {
    return "{}";
  }
}

function firstNonEmpty(values = []) {
  return asArray(values).map(cleanString).find(Boolean) || "";
}

function learnerAudienceDescription(request = {}) {
  const summary = isObject(request.learnerSummary) ? request.learnerSummary : {};
  const explicit = firstNonEmpty([
    summary.audience,
    summary.audienceDescription,
    summary.learnerAudience,
    summary.stageDescription,
    summary.profileSummary
  ]);
  if (explicit) return explicit.slice(0, 180);
  const parts = [
    firstNonEmpty([summary.schoolYear, summary.yearGroup, summary.gradeLevel, summary.grade]),
    firstNonEmpty([summary.educationStage, summary.schoolStage, summary.ageBand]),
    firstNonEmpty([summary.ageYears, summary.age])
  ].filter(Boolean);
  if (parts.length) return parts.join(", ").slice(0, 180);
  return "lower-secondary learner, about 13 years old";
}

function normalizeReasoningEffort(value) {
  const effort = cleanString(value).toLowerCase().replace(/[-_\s]+/g, "");
  if (!effort) return "";
  if (effort === "low") return "low";
  if (["medium", "med", "mid", "standard", "default"].includes(effort)) return "medium";
  if (effort === "high") return "high";
  if (["xhigh", "xhi", "highest", "max", "maximum"].includes(effort)) return "xhigh";
  return "";
}

function gatewayResponsesPrompt(kind, input = {}) {
  const repair = kind === "growth.card_authoring.repair";
  const request = repair ? input.request || {} : input;
  const invalidOutput = repair ? cleanString(input.invalidOutput).slice(0, 12000) : "";
  const errors = repair ? asArray(input.errors).slice(0, 20) : [];
  const task = repair
    ? "Repair the invalid draft into a valid Growth learning-card authoring draft."
    : "Author one Growth learning-card draft from the structured request.";
  const role = cleanString(request.cardRole || request.learningGraphPlan?.cardRole || request.learningGraphPlan?.cardSequence?.[0]?.cardRole || "practice");
  const schemaVersion = cleanString(request.cardSchemaVersion || "growth.card.authoring.v1");
  const audienceDescription = learnerAudienceDescription(request);
  return [
    "You are the Home AI Growth card authoring service.",
    task,
    "",
    "Return exactly one JSON object. Do not include markdown fences, prose, comments, citations, or tool calls.",
    `The JSON object must use schemaVersion \"${schemaVersion}\" and cardRole \"${role}\".`,
    "Required top-level fields: cardRole, title, targetNodeIds, expectedTimeMinutes, difficultyBasis, supportLevel, teachingFlow, evidenceToRecord.",
    "For ordinary teaching/practice/integration cards, teachingFlow must include: learningTarget, prerequisites, microLesson, workedExample, guidedPractice, quickCheck.",
    "Use only graph node ids present in the supplied learningGraphPlan. Focused teaching or practice cards must use exactly one targetNodeId.",
    "If rubricPolicy is present, align evidenceToRecord and quickCheck evidence with its evidenceMapping without exposing answers.",
    "Keep learner-facing text age-appropriate, low-pressure, and suitable for a 10-15 minute daily card in the supplied subject/domain.",
    `Audience fit: write for ${audienceDescription}. If the structured request names a younger learner, reduce reading load, avoid abstract jargon, use concrete examples, and keep the task feasible without adult-level programming knowledge.`,
    "",
    "Hard schema requirements:",
    "- evidenceToRecord must be an array of 1-6 short string keys only, such as short_answer, worked_steps, reason_sentence, exact_quote, or final_order. Never use objects, labels, nested mappings, or prose sentences in evidenceToRecord.",
    "- If evidence needs explanation, put the explanation in quickCheck.expectedEvidence, quickCheck.completionCriteria, or the learner-facing instruction. Keep evidenceToRecord as machine-readable keys.",
    "- teachingFlow.prerequisites must contain 1-3 short learner-friendly prerequisite notes. Do not leave it empty for ordinary teaching or practice cards.",
    "- teachingFlow.quickCheck must be one object with an instruction that names the exact final submission.",
    "",
    "Clarity requirements for learner-facing content:",
    "- The card must be self-contained enough that the target learner knows exactly where to start, what to do next, and what to submit.",
    "- Prefer descriptive, concrete instructions over terse prompts. Avoid vague commands such as \"practice\", \"think about\", or \"explain\" unless followed by exact questions, steps, or criteria.",
    "- title must name the concrete action, not only the topic.",
    "- teachingFlow.learningTarget must be one observable learner action.",
    "- teachingFlow.microLesson must briefly define the idea, explain why it matters, and name the method the learner will use.",
    "- teachingFlow.workedExample must show a small labelled example, including the weak input/request and the improved version when relevant.",
    "- teachingFlow.guidedPractice must include numbered steps and clearly say whether it is practice-only or the same draft the learner will submit.",
    "- teachingFlow.quickCheck must include prompt or task plus expectedEvidence or completionCriteria. The instruction must state exactly what the learner submits.",
    "- For younger learners or learners with reduced working-memory capacity, use one final deliverable. Do not ask them to complete one set in guidedPractice and a different set in quickCheck unless the practice-only purpose is explicitly labelled.",
    "- evidenceToRecord must use concrete evidence keys that match the quickCheck deliverable and rubricPolicy evidenceMapping when present.",
    "Do not include answer keys, hidden answers, raw prompts, raw model output, full transcripts, full source documents, secrets, tokens, cookies, or private payloads.",
    "",
    "Structured request:",
    prettyJson(request),
    repair ? "" : "",
    repair ? "Invalid draft output to repair:" : "",
    repair ? invalidOutput : "",
    repair ? "Validation errors:" : "",
    repair ? prettyJson(errors) : ""
  ].filter((line) => line !== "").join("\n");
}

function gatewayResponsesBody(payload = {}, options = {}) {
  const body = {
    input: gatewayResponsesPrompt(payload.kind, payload.input || {}),
    stream: options.stream === true,
    metadata: {
      source: "growth-card-authoring-service",
      kind: cleanString(payload.kind)
    }
  };
  const model = cleanString(options.model);
  if (model) body.model = model;
  const reasoningEffort = normalizeReasoningEffort(options.reasoningEffort || options.reasoning_effort);
  if (reasoningEffort) body.reasoning_effort = reasoningEffort;
  const maxOutputTokens = Number(options.maxOutputTokens || 0);
  if (Number.isFinite(maxOutputTokens) && maxOutputTokens > 0) body.max_output_tokens = Math.floor(maxOutputTokens);
  return body;
}

function textFromSseData(data = "") {
  const text = cleanString(data);
  if (!text || text === "[DONE]") return "";
  try {
    return textFromGatewayJson(JSON.parse(text)) || text;
  } catch {
    return text;
  }
}

function textFromSseBody(body = "") {
  const chunks = [];
  for (const line of String(body || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const data = trimmed.slice("data:".length).trim();
    if (data === "[DONE]") break;
    chunks.push(textFromSseData(data));
  }
  return chunks.join("");
}

function looksLikeSse(value = "") {
  return /^data:/m.test(String(value || ""));
}

async function responseText(response) {
  if (typeof response === "string") return response;
  if (!response) return "";
  if (typeof response.text === "function") return response.text();
  if (typeof response.body === "string") return response.body;
  if (response.body !== undefined && typeof response.body !== "string") return JSON.stringify(response.body);
  if (typeof response.json === "function") return JSON.stringify(await response.json());
  return "";
}

function gatewayErrorSummary(text = "") {
  try {
    const parsed = JSON.parse(String(text || ""));
    const error = isObject(parsed.error) ? parsed.error : parsed;
    return {
      gatewayErrorCode: cleanString(error.code).slice(0, 120),
      gatewayErrorType: cleanString(error.type).slice(0, 120),
      gatewayErrorStatus: cleanString(error.status).slice(0, 80)
    };
  } catch {
    return {};
  }
}

async function httpErrorResult(response) {
  const status = Number(response.status || 0) || 0;
  const summary = gatewayErrorSummary(await responseText(response));
  return unavailable("gateway_http_error", Object.assign({ status }, summary));
}

function normalizeGatewayText(text, mode = "") {
  const body = String(text || "");
  const responseMode = mode || (looksLikeSse(body) ? "stream" : "json");
  if (responseMode === "stream" || looksLikeSse(body)) {
    return { mode: "stream", text: textFromSseBody(body), raw: body };
  }
  try {
    return { mode: "json", text: textFromGatewayJson(JSON.parse(body)), raw: body };
  } catch {
    return { mode: "text", text: body, raw: body };
  }
}

async function normalizeTransportResult(result) {
  if (!result) return unavailable("gateway_empty_response");
  if (typeof result.status === "number" && result.status >= 400) {
    return httpErrorResult(result);
  }
  if (result.ok === false) {
    return unavailable(cleanString(result.error) || "gateway_error", {
      status: Number(result.status || 0) || undefined,
      retryable: result.retryable === true
    });
  }
  if (typeof result === "string") {
    const normalized = normalizeGatewayText(result);
    return normalized.text ? Object.assign({ ok: true }, normalized) : unavailable("gateway_empty_output", normalized);
  }
  if (typeof result.text === "function") {
    const text = await responseText(result);
    const normalized = normalizeGatewayText(text, result.mode);
    return normalized.text ? Object.assign({ ok: true }, normalized) : unavailable("gateway_empty_output", normalized);
  }
  if (isObject(result) && (result.sse || result.stream)) {
    const normalized = normalizeGatewayText(result.sse || result.stream || result.body || "", "stream");
    return normalized.text ? Object.assign({ ok: true }, normalized) : unavailable("gateway_empty_output", normalized);
  }
  if (isObject(result) && result.json !== undefined && typeof result.json !== "function") {
    const text = textFromGatewayJson(result.json);
    return text ? { ok: true, mode: "json", text, raw: JSON.stringify(result.json) } : unavailable("gateway_empty_output");
  }
  if (isObject(result) && result.body !== undefined) {
    const normalized = normalizeGatewayText(typeof result.body === "string" ? result.body : JSON.stringify(result.body), result.mode);
    return normalized.text ? Object.assign({ ok: true }, normalized) : unavailable("gateway_empty_output", normalized);
  }
  const text = await responseText(result);
  const normalized = normalizeGatewayText(text, result.mode);
  return normalized.text ? Object.assign({ ok: true }, normalized) : unavailable("gateway_empty_output", normalized);
}

function createGrowthGatewayAuthoringClient(options = {}) {
  const transport = typeof options.transport === "function" ? options.transport : null;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const endpoint = cleanString(options.endpoint || options.gatewayUrl);
  const accessToken = cleanString(options.accessToken || options.gatewayAccessToken);
  const timeoutMs = Math.max(1, Number(options.timeoutMs || 60000) || 60000);
  const protocol = normalizeProtocol(options.protocol, endpoint);

  async function invokeGateway(kind, input = {}) {
    const payload = { kind, input };
    const resultPromise = transport
      ? Promise.resolve().then(() => transport(payload))
      : invokeHttpGateway(payload);
    const result = await timeoutPromise(resultPromise, timeoutMs);
    if (result?.ok === false && typeof result.status !== "number" && typeof result.text !== "function") return result;
    return normalizeTransportResult(result);
  }

  async function invokeHttpGateway(payload) {
    if (!endpoint) return unavailable("gateway_endpoint_required");
    if (typeof fetchImpl !== "function") return unavailable("gateway_fetch_unavailable");
    const headers = Object.assign({ "content-type": "application/json" }, options.headers || {});
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;
    const body = protocol === "responses"
      ? gatewayResponsesBody(payload, options)
      : payload;
    return fetchImpl(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
  }

  function generateCardDraft(input = {}) {
    return invokeGateway("growth.card_authoring.generate", input);
  }

  function repairCardDraft(input = {}) {
    return invokeGateway("growth.card_authoring.repair", input);
  }

  return {
    generateCardDraft,
    repairCardDraft
  };
}

module.exports = {
  gatewayResponsesBody,
  gatewayResponsesPrompt,
  createGrowthGatewayAuthoringClient,
  textFromGatewayJson,
  textFromSseBody
};
