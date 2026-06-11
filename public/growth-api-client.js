(function registerGrowthApiClient(root) {
  function clean(value) {
    return String(value ?? "").trim();
  }

  function createGrowthApiClient({ fetchImpl, getWorkspaceId, historyRef, locationRef } = {}) {
    function workspaceQuery(targetWorkspaceId = getWorkspaceId()) {
      return targetWorkspaceId ? `?workspaceId=${encodeURIComponent(targetWorkspaceId)}` : "";
    }

    function updateWorkspaceUrl() {
      const currentWorkspaceId = clean(getWorkspaceId());
      if (!currentWorkspaceId || typeof historyRef?.replaceState !== "function") return;
      const url = new URL(locationRef.href);
      url.searchParams.set("workspaceId", currentWorkspaceId);
      historyRef.replaceState(null, "", url.toString());
    }

    async function fetchJson(path) {
      const response = await fetchImpl(path, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || result.ok === false) throw new Error(result.error || `request_failed:${response.status}`);
      return result;
    }

    return {
      fetchJson,
      updateWorkspaceUrl,
      workspaceQuery
    };
  }

  root.HermesGrowthApiClient = {
    createGrowthApiClient
  };
})(typeof window !== "undefined" ? window : globalThis);
