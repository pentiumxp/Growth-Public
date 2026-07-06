import { clean } from "../utils/string.js";

export function requestOptionsWithLaunchToken(options = {}, launchToken = "") {
  const token = clean(launchToken);
  if (!token) return options;
  return {
    ...options,
    headers: {
      ...(options.headers || {}),
      "x-hermes-plugin-launch-token": token
    }
  };
}

export function responseErrorMessage(result = {}, status = 0) {
  const error = typeof result.error === "string"
    ? result.error
    : clean(result.error?.code || result.error?.message);
  return error || `request_failed:${status}`;
}

export async function fetchJsonWithGrowthErrors(fetchImpl, path, options = {}) {
  const response = await fetchImpl(path, { cache: "no-store", ...options });
  const result = await response.json();
  if (!response.ok || result.ok === false) {
    throw new Error(responseErrorMessage(result, response.status));
  }
  return result;
}

export async function fetchReadableJsonWithGrowthErrors(fetchImpl, path, options = {}) {
  const response = await fetchImpl(path, { cache: "no-store", ...options });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(responseErrorMessage(result, response.status));
  }
  return result;
}

export function jsonPostOptions(body = {}) {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  };
}
