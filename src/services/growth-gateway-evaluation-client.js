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

function prettyJson(value) {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch {
    return "{}";
  }
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
  if (payload.evaluationDraft && isObject(payload.evaluationDraft)) return JSON.stringify(payload.evaluationDraft);
  if (payload.evaluation && isObject(payload.evaluation)) return JSON.stringify(payload.evaluation);
  if (payload.schemaVersion || payload.score !== undefined || payload.skillResults) return JSON.stringify(payload);
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
  if (Array.isArray(payload.output)) {
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
  if (["responses", "gateway-responses", "v1-responses"].includes(protocol)) return "responses";
  if (["generic", "growth-generic", "hermes-growth-evaluation"].includes(protocol)) return "generic";
  return endpointLooksLikeResponses(endpoint) ? "responses" : "generic";
}

function gatewayEvaluationResponsesPrompt(kind, input = {}) {
  const repair = kind === "growth.card_evaluation.repair";
  const request = repair ? input.request || {} : input;
  const invalidOutput = repair ? cleanString(input.invalidOutput).slice(0, 12000) : "";
  const errors = repair ? asArray(input.errors).slice(0, 20) : [];
  const task = repair
    ? "Repair the invalid evaluation draft into a valid Growth card evaluation draft."
    : "Evaluate one submitted Growth learning-card answer.";
  return [
    "You are the Home AI Growth card evaluation service.",
    task,
    "",
    "Return exactly one JSON object. Do not include markdown fences, prose, comments, citations, or tool calls.",
    "The JSON object must use schemaVersion \"growth.card.evaluation.v1\".",
    "Required fields: schemaVersion, status, score, maxScore, passed, confidence, summary, feedbackSections, remainingWeaknesses.",
    "Use the daily_score_once policy: grade once, do not require retry-until-pass, and treat the score as the daily-card outcome.",
    "If skillResults are present, every node id must come from the supplied targetNodeIds.",
    "If rubricPolicy is present, prefer rubricResults with dimensionId values from rubricPolicy.rubricDimensions and nodeId values from targetNodeIds.",
    "Keep feedback concise, low-pressure, and suitable for the supplied subject/domain daily learning card.",
    "Do not include raw answers, full transcripts, hidden answers, raw prompts, raw model output, secrets, tokens, cookies, private file paths, or provider configuration in the output.",
    "",
    "Structured evaluation request:",
    prettyJson(request),
    repair ? "" : "",
    repair ? "Invalid evaluation draft output to repair:" : "",
    repair ? invalidOutput : "",
    repair ? "Validation errors:" : "",
    repair ? prettyJson(errors) : ""
  ].filter((line) => line !== "").join("\n");
}

function gatewayEvaluationResponsesBody(payload = {}, options = {}) {
  const body = {
    input: gatewayEvaluationResponsesPrompt(payload.kind, payload.input || {}),
    stream: options.stream === true,
    metadata: {
      source: "growth-card-evaluation-service",
      kind: cleanString(payload.kind)
    }
  };
  const model = cleanString(options.model);
  if (model) body.model = model;
  const maxOutputTokens = Number(options.maxOutputTokens || 0);
  if (Number.isFinite(maxOutputTokens) && maxOutputTokens > 0) {
    body.max_output_tokens = Math.floor(maxOutputTokens);
  }
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

function createGrowthGatewayEvaluationClient(options = {}) {
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
      ? gatewayEvaluationResponsesBody(payload, options)
      : payload;
    return fetchImpl(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
  }

  function evaluateCardSubmission(input = {}) {
    return invokeGateway("growth.card_evaluation.evaluate", input);
  }

  function repairEvaluationDraft(input = {}) {
    return invokeGateway("growth.card_evaluation.repair", input);
  }

  return {
    evaluateCardSubmission,
    repairEvaluationDraft
  };
}

module.exports = {
  createGrowthGatewayEvaluationClient,
  gatewayEvaluationResponsesBody,
  gatewayEvaluationResponsesPrompt,
  textFromGatewayJson,
  textFromSseBody
};
