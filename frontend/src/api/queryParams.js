import { clean, compactUniqueStrings } from "../utils/string.js";
import { workspaceQueryKey } from "../platform/proxyUrl.js";

export function appendQueryParam(params, key, value) {
  const cleaned = clean(value);
  if (cleaned) params.set(key, cleaned);
}

export function appendQueryArrayParam(params, key, value, limit = 12) {
  const values = Array.isArray(value)
    ? value
    : String(value || "").split(",");
  const cleaned = compactUniqueStrings(values, limit);
  if (cleaned.length) params.set(key, cleaned.join(","));
}

export function queryString(params) {
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function baseGrowthQuery(targetWorkspaceId = "", { proxyPrefix = "" } = {}) {
  const params = new URLSearchParams();
  const workspaceId = clean(targetWorkspaceId);
  if (workspaceId) params.set(workspaceQueryKey({ proxyPrefix }), workspaceId);
  return params;
}
