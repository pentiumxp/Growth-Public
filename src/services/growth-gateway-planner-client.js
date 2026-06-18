"use strict";

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unavailable(error, extra = {}) {
  return Object.assign({}, extra, { ok: false, error });
}

function timeoutPromise(promise, timeoutMs) {
  const ms = Math.max(1, Number(timeoutMs || 0) || 1);
  let timer = null;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(unavailable("gateway_timeout", { retryable: true })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function textFromContentParts(parts = []) {
  return asArray(parts).map(textFromGatewayJson).join("");
}

function textFromGatewayJson(payload) {
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload)) return textFromContentParts(payload);
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
  if (payload.planDraft && isObject(payload.planDraft)) return JSON.stringify(payload.planDraft);
  if (payload.schemaVersion === "growth.learningPlanDraft.v1" || payload.items) return JSON.stringify(payload);
  if (Array.isArray(payload.output)) {
    const text = textFromContentParts(payload.output);
    if (text) return text;
  }
  return "";
}

function looksLikeResponses(endpoint = "") {
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
  if (["generic", "growth-generic", "hermes-growth-planner"].includes(protocol)) return "generic";
  return looksLikeResponses(endpoint) ? "responses" : "generic";
}

function prettyJson(value) {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch {
    return "{}";
  }
}

function gatewayPlannerPrompt(kind, input = {}) {
  const repair = kind === "growth.learning_planner.repair";
  const context = repair ? input.context || {} : input;
  return [
    "You are the Home AI Growth learning planner.",
    repair ? "Repair the invalid learning plan draft." : "Draft one auditable Growth learning plan from the structured context.",
    "",
    "Return exactly one JSON object. Do not include markdown fences, prose, comments, citations, or tool calls.",
    "The JSON object must use schemaVersion \"growth.learningPlanDraft.v1\".",
    "Daily plans must stay low-pressure: one card item, estimatedMinutes no more than 20, completionPolicy daily_score_once, passScoreRequired false.",
    "Every item must include itemId, cardRole, subject, targetNodeIds, estimatedMinutes, difficultyBand, supportLevel, evidenceRequirements, reason, and pressurePolicy.",
    "Use only graph node ids from knowledgeGraph.candidateNodes.",
    "Do not include raw learner answers, transcripts, raw prompts, raw model output, hidden answer keys, secrets, tokens, cookies, or private paths.",
    "",
    "Structured planner context:",
    prettyJson(context),
    repair ? "Invalid plan output:" : "",
    repair ? cleanString(input.invalidOutput).slice(0, 12000) : "",
    repair ? "Validation errors:" : "",
    repair ? prettyJson(input.errors || []) : ""
  ].filter((line) => line !== "").join("\n");
}

function responsesBody(payload = {}, options = {}) {
  const body = {
    input: gatewayPlannerPrompt(payload.kind, payload.input || {}),
    stream: options.stream === true,
    metadata: {
      source: "growth-learning-planner-service",
      kind: cleanString(payload.kind)
    }
  };
  const model = cleanString(options.model);
  if (model) body.model = model;
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

function normalizeGatewayText(text = "", mode = "") {
  const body = String(text || "");
  if (mode === "stream" || /^data:/m.test(body)) return { mode: "stream", text: textFromSseBody(body), raw: body };
  try {
    return { mode: "json", text: textFromGatewayJson(JSON.parse(body)), raw: body };
  } catch {
    return { mode: "text", text: body, raw: body };
  }
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

async function normalizeTransportResult(result) {
  if (!result) return unavailable("gateway_empty_response");
  if (typeof result.status === "number" && result.status >= 400) return httpErrorResult(result);
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

function createGrowthGatewayPlannerClient(options = {}) {
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

  async function invokeHttpGateway(payload = {}) {
    if (!endpoint) return unavailable("gateway_endpoint_required");
    if (typeof fetchImpl !== "function") return unavailable("gateway_fetch_unavailable");
    const headers = Object.assign({ "content-type": "application/json" }, options.headers || {});
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;
    const body = protocol === "responses" ? responsesBody(payload, options) : payload;
    return fetchImpl(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
  }

  return {
    draftLearningPlan(input = {}) {
      return invokeGateway("growth.learning_planner.draft", input);
    },
    repairLearningPlan(input = {}) {
      return invokeGateway("growth.learning_planner.repair", input);
    }
  };
}

module.exports = {
  createGrowthGatewayPlannerClient,
  gatewayPlannerPrompt,
  responsesBody
};
