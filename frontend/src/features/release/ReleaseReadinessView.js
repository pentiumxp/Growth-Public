export const releaseReadinessReadbackRows = Object.freeze([
  ["review", "Review"],
  ["authorization", "Authorization"],
  ["closure", "Closure"],
  ["preflight", "Preflight"],
  ["activation", "Activation"],
  ["runtimeEnablement", "Runtime"]
]);

export function releaseReadinessReadbackData(data = {}, key = "") {
  const value = data[key] || {};
  if (key === "review") return value.releaseReview || value.review || value;
  if (key === "authorization") return value.releaseAuthorization || value.authorization || value;
  if (key === "closure") return value.releaseClosure || value.closure || value;
  if (key === "preflight") return value.releasePreflight || value.preflight || value;
  if (key === "activation") return value.releaseActivation || value.activation || value;
  if (key === "runtimeEnablement") return value.runtimeEnablement || value.runtime_enablement || value;
  return value;
}
