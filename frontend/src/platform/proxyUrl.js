import { clean } from "../utils/string.js";

export function rootPath(...segments) {
  return ["", ...segments].join("/");
}

export function proxyRootPath() {
  return rootPath("api", "hermes-plugins", "growth", "proxy");
}

export function growthApiRootPath() {
  return rootPath("api", "v1", "growth");
}

export function growthApiPath(...segments) {
  return [growthApiRootPath(), ...segments].join("/");
}

export function proxyPrefixFromLocation(locationHref = "") {
  try {
    const url = new URL(locationHref || "");
    const marker = proxyRootPath();
    const index = url.pathname.indexOf(marker);
    if (index < 0) return "";
    return url.pathname.slice(0, index + marker.length);
  } catch (error) {
    return "";
  }
}

export function resolveApiPath(path, { locationHref = "", proxyPrefix = proxyPrefixFromLocation(locationHref) } = {}) {
  const value = String(path || "");
  const growthApiRoot = growthApiRootPath();
  const proxyRoot = proxyRootPath();
  if (value.startsWith(`${proxyRoot}${growthApiRoot}/`)) return value;
  if (!value.startsWith(`${growthApiRoot}/`)) return value;
  return proxyPrefix ? `${proxyPrefix}${value}` : value;
}

export function workspaceQueryKey({ proxyPrefix = "" } = {}) {
  return proxyPrefix ? "targetWorkspaceId" : "workspaceId";
}

export function appendWorkspaceQuery(path, targetWorkspaceId = "") {
  const value = String(path || "");
  const workspaceId = clean(targetWorkspaceId);
  if (!workspaceId) return value;
  if (/[?&](?:workspaceId|workspace_id|targetWorkspaceId|target_workspace_id)=/.test(value)) return value;
  const separator = value.includes("?") ? "&" : "?";
  return `${value}${separator}workspaceId=${encodeURIComponent(workspaceId)}`;
}

export function resolveGrowthApiPath(path, {
  targetWorkspaceId = "",
  locationHref = "",
  proxyPrefix = proxyPrefixFromLocation(locationHref)
} = {}) {
  return appendWorkspaceQuery(resolveApiPath(path, { locationHref, proxyPrefix }), targetWorkspaceId);
}
