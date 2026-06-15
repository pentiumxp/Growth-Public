(function registerGrowthApiClient(root) {
  function clean(value) {
    return String(value ?? "").trim();
  }

  function rootPath(...segments) {
    return ["", ...segments].join("/");
  }

  function proxyRootPath() {
    return rootPath("api", "hermes-plugins", "growth", "proxy");
  }

  function growthApiRootPath() {
    return rootPath("api", "v1", "growth");
  }

  function growthApiPath(...segments) {
    return [growthApiRootPath(), ...segments].join("/");
  }

  function createGrowthApiClient({ fetchImpl, getWorkspaceId, historyRef, locationRef } = {}) {
    function proxyPrefix() {
      try {
        const url = new URL(locationRef?.href || "");
        const marker = proxyRootPath();
        const index = url.pathname.indexOf(marker);
        if (index < 0) return "";
        return url.pathname.slice(0, index + marker.length);
      } catch (error) {
        return "";
      }
    }

    function resolveApiPath(path) {
      const value = String(path || "");
      const growthApiRoot = growthApiRootPath();
      const proxyRoot = proxyRootPath();
      if (value.startsWith(`${proxyRoot}${growthApiRoot}/`)) return value;
      if (!value.startsWith(`${growthApiRoot}/`)) return value;
      const prefix = proxyPrefix();
      return prefix ? `${prefix}${value}` : value;
    }

    function workspaceQuery(targetWorkspaceId = getWorkspaceId()) {
      return targetWorkspaceId ? `?workspaceId=${encodeURIComponent(targetWorkspaceId)}` : "";
    }

    function appendWorkspaceQuery(path, targetWorkspaceId = getWorkspaceId()) {
      const value = String(path || "");
      const workspaceId = clean(targetWorkspaceId);
      if (!workspaceId) return value;
      if (/[?&](?:workspaceId|workspace_id|targetWorkspaceId|target_workspace_id)=/.test(value)) return value;
      const separator = value.includes("?") ? "&" : "?";
      return `${value}${separator}workspaceId=${encodeURIComponent(workspaceId)}`;
    }

    function resolveGrowthApiPath(path, targetWorkspaceId = getWorkspaceId()) {
      return appendWorkspaceQuery(resolveApiPath(path), targetWorkspaceId);
    }

    function cardGenerationContextQuery(targetWorkspaceId = getWorkspaceId()) {
      if (!targetWorkspaceId) return "";
      const key = proxyPrefix() ? "targetWorkspaceId" : "workspaceId";
      return `?${key}=${encodeURIComponent(targetWorkspaceId)}`;
    }

    function appendQueryParam(params, key, value) {
      const cleaned = clean(value);
      if (cleaned) params.set(key, cleaned);
    }

    function learningLoopStateQuery(targetWorkspaceId = getWorkspaceId(), context = {}) {
      const workspaceId = clean(targetWorkspaceId);
      const params = new URLSearchParams();
      const target = context.target || {};
      const plan = context.suggestedPlan || {};
      const defaults = context.generationDefaults || {};
      const key = proxyPrefix() ? "targetWorkspaceId" : "workspaceId";
      if (workspaceId) params.set(key, workspaceId);
      appendQueryParam(params, "learnerId", target.learnerId || workspaceId);
      appendQueryParam(params, "programId", context.programId || plan.programId);
      appendQueryParam(params, "domainPackId", context.domainPackId || plan.domainPackId);
      appendQueryParam(params, "domain", plan.domain || context.domain || defaults.domain);
      appendQueryParam(params, "subject", plan.subject || context.subject || defaults.subject || plan.domain || context.domain);
      appendQueryParam(params, "horizon", context.horizon || defaults.horizon || "daily_plan");
      appendQueryParam(params, "availableMinutes", defaults.availableMinutes || context.availableMinutes || 15);
      const targetNodeIds = Array.isArray(plan.targetNodeIds) && plan.targetNodeIds.length
        ? plan.targetNodeIds
        : [plan.targetNodeId].filter(Boolean);
      appendQueryParam(params, "targetNodeIds", targetNodeIds.join(","));
      const query = params.toString();
      return query ? `?${query}` : "";
    }

    function updateWorkspaceUrl() {
      const currentWorkspaceId = clean(getWorkspaceId());
      if (!currentWorkspaceId || typeof historyRef?.replaceState !== "function") return;
      const url = new URL(locationRef.href);
      url.searchParams.set("workspaceId", currentWorkspaceId);
      historyRef.replaceState(null, "", url.toString());
    }

    async function fetchJson(path, options = {}) {
      const response = await fetchImpl(resolveApiPath(path), Object.assign({ cache: "no-store" }, options));
      const result = await response.json();
      if (!response.ok || result.ok === false) {
        const error = typeof result.error === "string"
          ? result.error
          : clean(result.error?.code || result.error?.message);
        throw new Error(error || `request_failed:${response.status}`);
      }
      return result;
    }

    async function postJson(path, body = {}) {
      return fetchJson(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
    }

    function fetchCardGenerationContext(targetWorkspaceId = getWorkspaceId()) {
      return fetchJson(`${growthApiPath("card-generation", "context")}${cardGenerationContextQuery(targetWorkspaceId)}`);
    }

    function fetchLearningLoopState(targetWorkspaceId = getWorkspaceId(), context = {}) {
      return fetchJson(`${growthApiPath("learning-loop", "state")}${learningLoopStateQuery(targetWorkspaceId, context)}`);
    }

    function fetchGrowthCard(taskCardId, targetWorkspaceId = getWorkspaceId()) {
      const cardId = clean(taskCardId);
      if (!cardId) throw new Error("missing_task_card_id");
      return fetchJson(`${growthApiPath("cards", encodeURIComponent(cardId))}${workspaceQuery(targetWorkspaceId)}`);
    }

    function generateGrowthCard(payload = {}, targetWorkspaceId = getWorkspaceId()) {
      return postJson(growthApiPath("cards", "generate"), Object.assign({
        workspace_id: targetWorkspaceId
      }, payload));
    }

    function evaluateGrowthStageAssessment(payload = {}, targetWorkspaceId = getWorkspaceId()) {
      return postJson(growthApiPath("stage-assessments", "eligibility"), Object.assign({
        workspace_id: targetWorkspaceId
      }, payload));
    }

    function activateGrowthStageAssessment(payload = {}, targetWorkspaceId = getWorkspaceId()) {
      return postJson(growthApiPath("stage-assessments", "activate"), Object.assign({
        workspace_id: targetWorkspaceId
      }, payload));
    }

    function submitGrowthCardEvidence(taskCardId, payload = {}, targetWorkspaceId = getWorkspaceId()) {
      const cardId = clean(taskCardId);
      if (!cardId) throw new Error("missing_task_card_id");
      return postJson(growthApiPath("cards", encodeURIComponent(cardId), "submissions"), Object.assign({
        workspace_id: targetWorkspaceId
      }, payload));
    }

    function submitGrowthCardReflection(taskCardId, payload = {}, targetWorkspaceId = getWorkspaceId()) {
      const cardId = clean(taskCardId);
      if (!cardId) throw new Error("missing_task_card_id");
      return postJson(growthApiPath("cards", encodeURIComponent(cardId), "reflections"), Object.assign({
        workspace_id: targetWorkspaceId
      }, payload));
    }

    function submitGrowthExperienceSignal(taskCardId, payload = {}, targetWorkspaceId = getWorkspaceId()) {
      const cardId = clean(taskCardId);
      if (!cardId) throw new Error("missing_task_card_id");
      return postJson(growthApiPath("cards", encodeURIComponent(cardId), "experience-signals"), Object.assign({
        workspace_id: targetWorkspaceId
      }, payload));
    }

    function processGrowthEvaluations(targetWorkspaceId = getWorkspaceId(), limit = 5) {
      return postJson(growthApiPath("evaluations", "process"), {
        workspace_id: targetWorkspaceId,
        limit
      });
    }

    function retryGrowthEvaluation(payload = {}, targetWorkspaceId = getWorkspaceId()) {
      return postJson(growthApiPath("evaluations", "owner-review"), Object.assign({
        workspace_id: targetWorkspaceId,
        action: "retry"
      }, payload));
    }

    return {
      appendWorkspaceQuery,
      activateGrowthStageAssessment,
      evaluateGrowthStageAssessment,
      fetchCardGenerationContext,
      fetchGrowthCard,
      fetchJson,
      fetchLearningLoopState,
      generateGrowthCard,
      postJson,
      processGrowthEvaluations,
      retryGrowthEvaluation,
      resolveGrowthApiPath,
      submitGrowthCardEvidence,
      submitGrowthExperienceSignal,
      submitGrowthCardReflection,
      updateWorkspaceUrl,
      workspaceQuery
    };
  }

  root.HermesGrowthApiClient = {
    createGrowthApiClient
  };
})(typeof window !== "undefined" ? window : globalThis);
