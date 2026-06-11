"use strict";

const { cleanString } = require("./growth-service-models");

function normalizeBaseUrl(value) {
  const text = cleanString(value);
  if (!text) return "";
  try {
    return new URL(text).origin;
  } catch (_) {
    return "";
  }
}

function createHomeAiGrowthFacadeClient({ baseUrl, accessKey, fetchImpl } = {}) {
  const homeAiApiBaseUrl = normalizeBaseUrl(baseUrl);
  const homeAiAccessKey = cleanString(accessKey);

  async function fetchJson(pathname, query = {}) {
    if (!homeAiApiBaseUrl || !homeAiAccessKey || typeof fetchImpl !== "function") return null;
    const url = new URL(pathname, homeAiApiBaseUrl);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && cleanString(value)) url.searchParams.set(key, cleanString(value));
    }
    const response = await fetchImpl(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Hermes-Web-Key": homeAiAccessKey
      }
    });
    if (!response || !response.ok) {
      return { ok: false, status: response?.status || 0, error: "home_ai_facade_fetch_failed" };
    }
    return response.json();
  }

  return {
    fetchJson,
    configured: Boolean(homeAiApiBaseUrl && homeAiAccessKey && typeof fetchImpl === "function")
  };
}

module.exports = {
  createHomeAiGrowthFacadeClient,
  normalizeBaseUrl
};
