"use strict";

function cleanString(value) {
  return String(value || "").trim();
}

function unavailable(error, extra = {}) {
  return Object.assign({ ok: false, error }, extra);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function textFromContentParts(parts = []) {
  return parts.map((part) => {
    if (typeof part === "string") return part;
    if (!isObject(part)) return "";
    return cleanString(part.text || part.content || part.delta);
  }).join("");
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
  return "";
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
  if (result.ok === false) return unavailable(cleanString(result.error) || "gateway_error", result);
  if (typeof result === "string") {
    const normalized = normalizeGatewayText(result);
    return normalized.text ? Object.assign({ ok: true }, normalized) : unavailable("gateway_empty_output", normalized);
  }
  if (typeof result.status === "number" && result.status >= 400) {
    return unavailable("gateway_http_error", { status: result.status });
  }
  if (isObject(result) && (result.sse || result.stream)) {
    const normalized = normalizeGatewayText(result.sse || result.stream || result.body || "", "stream");
    return normalized.text ? Object.assign({ ok: true }, normalized) : unavailable("gateway_empty_output", normalized);
  }
  if (isObject(result) && result.json !== undefined) {
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

  async function invokeGateway(kind, input = {}) {
    const payload = { kind, input };
    const resultPromise = transport
      ? Promise.resolve().then(() => transport(payload))
      : invokeHttpGateway(payload);
    const result = await timeoutPromise(resultPromise, timeoutMs);
    if (result?.ok === false) return result;
    return normalizeTransportResult(result);
  }

  async function invokeHttpGateway(payload) {
    if (!endpoint) return unavailable("gateway_endpoint_required");
    if (typeof fetchImpl !== "function") return unavailable("gateway_fetch_unavailable");
    const headers = Object.assign({ "content-type": "application/json" }, options.headers || {});
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;
    return fetchImpl(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
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
  createGrowthGatewayAuthoringClient,
  textFromGatewayJson,
  textFromSseBody
};
