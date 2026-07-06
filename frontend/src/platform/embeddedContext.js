function clean(value) {
  return String(value ?? "").trim();
}

export function readEmbeddedContext({ location, document } = {}) {
  const url = new URL(location?.href || "http://127.0.0.1/");
  const embedded = url.searchParams.get("embedded") === "1"
    || url.searchParams.get("homeAiEmbedded") === "1"
    || Boolean(document?.body?.dataset?.homeAiEmbedded);
  const workspaceId = clean(
    url.searchParams.get("workspace_id")
      || url.searchParams.get("workspaceId")
      || document?.body?.dataset?.workspaceId
  );

  return {
    mode: embedded ? "embedded" : "standalone",
    embedded,
    workspaceId
  };
}
