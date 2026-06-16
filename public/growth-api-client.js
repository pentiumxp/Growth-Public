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

    function cardGenerationContextQuery(targetWorkspaceId = getWorkspaceId(), selection = {}) {
      const workspaceId = clean(targetWorkspaceId);
      const params = new URLSearchParams();
      const key = proxyPrefix() ? "targetWorkspaceId" : "workspaceId";
      if (workspaceId) params.set(key, workspaceId);
      appendQueryParam(params, "domainPackId", selection.domainPackId || selection.domain_pack_id);
      appendQueryParam(params, "domain", selection.domain);
      appendQueryParam(params, "subject", selection.subject);
      appendQueryParam(params, "horizon", selection.horizon);
      appendQueryParam(params, "availableMinutes", selection.availableMinutes || selection.available_minutes);
      const query = params.toString();
      return query ? `?${query}` : "";
    }

    function appendQueryParam(params, key, value) {
      const cleaned = clean(value);
      if (cleaned) params.set(key, cleaned);
    }

    function appendQueryArrayParam(params, key, value) {
      const values = Array.isArray(value)
        ? value
        : String(value || "").split(",");
      const cleaned = Array.from(new Set(values.map(clean).filter(Boolean)));
      if (cleaned.length) params.set(key, cleaned.slice(0, 12).join(","));
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

    function releaseWorkbenchQuery(targetWorkspaceId = getWorkspaceId(), context = {}) {
      const workspaceId = clean(targetWorkspaceId);
      const params = new URLSearchParams();
      const target = context.target || {};
      const plan = context.suggestedPlan || {};
      const defaults = context.generationDefaults || {};
      const releaseWorkbench = context.releaseWorkbench?.releaseWorkbench || context.releaseWorkbench || {};
      const inventory = releaseWorkbench.inventory || context.releaseInventory || {};
      const key = proxyPrefix() ? "targetWorkspaceId" : "workspaceId";
      if (workspaceId) params.set(key, workspaceId);
      appendQueryParam(params, "learnerId", target.learnerId || workspaceId);
      appendQueryParam(params, "programId", context.programId || plan.programId || defaults.programId);
      appendQueryParam(params, "domainPackId", context.domainPackId || plan.domainPackId || defaults.domainPackId);
      appendQueryParam(params, "domain", plan.domain || context.domain || defaults.domain);
      appendQueryParam(params, "subject", plan.subject || context.subject || defaults.subject || plan.domain || context.domain);
      appendQueryParam(params, "horizon", context.horizon || defaults.horizon || "daily_plan");
      appendQueryParam(params, "collectionRunId", context.collectionRunId || inventory.latestCollectionRunId);
      const query = params.toString();
      return query ? `?${query}` : "";
    }

    function automationProposalQuery(targetWorkspaceId = getWorkspaceId(), payload = {}) {
      const workspaceId = clean(payload.workspaceId || payload.workspace_id || targetWorkspaceId);
      const params = new URLSearchParams();
      const key = proxyPrefix() ? "targetWorkspaceId" : "workspaceId";
      if (workspaceId) params.set(key, workspaceId);
      appendQueryParam(params, "learnerId", payload.learnerId || payload.learner_id);
      appendQueryParam(params, "programId", payload.programId || payload.program_id);
      appendQueryParam(params, "status", payload.status);
      appendQueryParam(params, "planDraftId", payload.planDraftId || payload.plan_draft_id);
      appendQueryParam(params, "limit", payload.limit || 6);
      const query = params.toString();
      return query ? `?${query}` : "";
    }

    function automationDigestQuery(targetWorkspaceId = getWorkspaceId(), payload = {}) {
      const workspaceId = clean(payload.workspaceId || payload.workspace_id || targetWorkspaceId);
      const params = new URLSearchParams();
      const key = proxyPrefix() ? "targetWorkspaceId" : "workspaceId";
      if (workspaceId) params.set(key, workspaceId);
      appendQueryParam(params, "learnerId", payload.learnerId || payload.learner_id);
      appendQueryParam(params, "programId", payload.programId || payload.program_id);
      appendQueryParam(params, "domainPackId", payload.domainPackId || payload.domain_pack_id);
      appendQueryParam(params, "domain", payload.domain);
      appendQueryParam(params, "subject", payload.subject);
      appendQueryParam(params, "horizon", payload.horizon);
      appendQueryParam(params, "status", payload.status);
      appendQueryParam(params, "limit", payload.limit || 6);
      const query = params.toString();
      return query ? `?${query}` : "";
    }

    function cycleAuditQuery(targetWorkspaceId = getWorkspaceId(), payload = {}) {
      const params = new URLSearchParams();
      const workspaceId = clean(payload.workspaceId || payload.workspace_id || targetWorkspaceId);
      const key = proxyPrefix() ? "targetWorkspaceId" : "workspaceId";
      if (workspaceId) params.set(key, workspaceId);
      appendQueryParam(params, "learnerId", payload.learnerId || payload.learner_id);
      appendQueryParam(params, "programId", payload.programId || payload.program_id);
      appendQueryParam(params, "planDraftId", payload.planDraftId || payload.plan_draft_id);
      appendQueryParam(params, "taskCardId", payload.taskCardId || payload.task_card_id);
      appendQueryParam(params, "evaluationId", payload.evaluationId || payload.evaluation_id);
      appendQueryParam(params, "profileDeltaId", payload.profileDeltaId || payload.profile_delta_id);
      appendQueryParam(params, "evidenceId", payload.evidenceId || payload.evidence_id);
      appendQueryParam(params, "correctionId", payload.correctionId || payload.correction_id);
      appendQueryParam(params, "sourceId", payload.sourceId || payload.source_id);
      appendQueryArrayParam(params, "targetNodeIds", payload.targetNodeIds || payload.target_node_ids || payload.nodeIds || payload.node_ids);
      appendQueryParam(params, "limit", payload.limit || 20);
      const query = params.toString();
      return query ? `?${query}` : "";
    }

    function cycleHistoryQuery(targetWorkspaceId = getWorkspaceId(), payload = {}) {
      const params = new URLSearchParams();
      const workspaceId = clean(payload.workspaceId || payload.workspace_id || targetWorkspaceId);
      const key = proxyPrefix() ? "targetWorkspaceId" : "workspaceId";
      if (workspaceId) params.set(key, workspaceId);
      appendQueryParam(params, "learnerId", payload.learnerId || payload.learner_id);
      appendQueryParam(params, "programId", payload.programId || payload.program_id);
      appendQueryParam(params, "domainPackId", payload.domainPackId || payload.domain_pack_id);
      appendQueryParam(params, "domain", payload.domain);
      appendQueryParam(params, "subject", payload.subject);
      appendQueryParam(params, "planDraftId", payload.planDraftId || payload.plan_draft_id);
      appendQueryParam(params, "taskCardId", payload.taskCardId || payload.task_card_id);
      appendQueryParam(params, "evaluationId", payload.evaluationId || payload.evaluation_id);
      appendQueryParam(params, "profileDeltaId", payload.profileDeltaId || payload.profile_delta_id);
      appendQueryParam(params, "evidenceId", payload.evidenceId || payload.evidence_id);
      appendQueryParam(params, "correctionId", payload.correctionId || payload.correction_id);
      appendQueryParam(params, "sourceId", payload.sourceId || payload.source_id);
      appendQueryArrayParam(params, "targetNodeIds", payload.targetNodeIds || payload.target_node_ids || payload.nodeIds || payload.node_ids);
      appendQueryParam(params, "includeCompleteness", payload.includeCompleteness || payload.include_completeness);
      appendQueryParam(params, "limit", payload.limit || 8);
      const query = params.toString();
      return query ? `?${query}` : "";
    }

    function stageAssessmentControlsQuery(targetWorkspaceId = getWorkspaceId(), payload = {}) {
      const params = new URLSearchParams();
      const workspaceId = clean(payload.workspaceId || payload.workspace_id || targetWorkspaceId);
      const key = proxyPrefix() ? "targetWorkspaceId" : "workspaceId";
      if (workspaceId) params.set(key, workspaceId);
      appendQueryParam(params, "learnerId", payload.learnerId || payload.learner_id);
      appendQueryParam(params, "programId", payload.programId || payload.program_id);
      appendQueryParam(params, "domainPackId", payload.domainPackId || payload.domain_pack_id);
      appendQueryParam(params, "domain", payload.domain);
      appendQueryParam(params, "subject", payload.subject);
      appendQueryParam(params, "subjectId", payload.subjectId || payload.subject_id);
      appendQueryParam(params, "capabilityClusterId", payload.capabilityClusterId || payload.capability_cluster_id);
      appendQueryParam(params, "targetNodeId", payload.targetNodeId || payload.target_node_id);
      appendQueryArrayParam(params, "targetNodeIds", payload.targetNodeIds || payload.target_node_ids);
      appendQueryArrayParam(params, "assessmentCoverageNodeIds", payload.assessmentCoverageNodeIds || payload.assessment_coverage_node_ids);
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

    function fetchCardGenerationContext(targetWorkspaceId = getWorkspaceId(), selection = {}) {
      return fetchJson(`${growthApiPath("card-generation", "context")}${cardGenerationContextQuery(targetWorkspaceId, selection)}`);
    }

    function fetchLearningLoopState(targetWorkspaceId = getWorkspaceId(), context = {}) {
      return fetchJson(`${growthApiPath("learning-loop", "state")}${learningLoopStateQuery(targetWorkspaceId, context)}`);
    }

    function fetchGrowthReleaseWorkbench(targetWorkspaceId = getWorkspaceId(), context = {}) {
      return fetchJson(`${growthApiPath("automation", "release-workbench")}${releaseWorkbenchQuery(targetWorkspaceId, context)}`);
    }

    function fetchGrowthAutomationProposals(payload = {}, targetWorkspaceId = getWorkspaceId()) {
      return fetchJson(`${growthApiPath("automation", "proposals")}${automationProposalQuery(targetWorkspaceId, payload)}`);
    }

    function fetchGrowthAutomationDigests(payload = {}, targetWorkspaceId = getWorkspaceId()) {
      return fetchJson(`${growthApiPath("automation", "digests")}${automationDigestQuery(targetWorkspaceId, payload)}`);
    }

    function createGrowthAutomationProposal(payload = {}, targetWorkspaceId = getWorkspaceId()) {
      return postJson(growthApiPath("automation", "proposals"), Object.assign({
        workspace_id: targetWorkspaceId
      }, payload));
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

    function draftGrowthDailyLoop(payload = {}, targetWorkspaceId = getWorkspaceId()) {
      return postJson(growthApiPath("daily-loop", "draft"), Object.assign({
        workspace_id: targetWorkspaceId
      }, payload));
    }

    function publishGrowthDailyLoop(payload = {}, targetWorkspaceId = getWorkspaceId()) {
      return postJson(growthApiPath("daily-loop", "publish"), Object.assign({
        workspace_id: targetWorkspaceId
      }, payload));
    }

    function submitGrowthProfileCorrection(payload = {}, targetWorkspaceId = getWorkspaceId()) {
      return postJson(growthApiPath("profile-corrections"), Object.assign({
        workspace_id: targetWorkspaceId
      }, payload));
    }

    function provisionGrowthDomainPack(payload = {}, targetWorkspaceId = getWorkspaceId()) {
      return postJson(growthApiPath("domain-pack-provisions"), Object.assign({
        workspace_id: targetWorkspaceId
      }, payload));
    }

    function fetchGrowthCycleAudit(payload = {}, targetWorkspaceId = getWorkspaceId()) {
      return fetchJson(`${growthApiPath("learning-cycles", "audit")}${cycleAuditQuery(targetWorkspaceId, payload)}`);
    }

    function fetchGrowthCycleCompleteness(payload = {}, targetWorkspaceId = getWorkspaceId()) {
      return fetchJson(`${growthApiPath("learning-cycles", "completeness")}${cycleAuditQuery(targetWorkspaceId, payload)}`);
    }

    function fetchGrowthCycleHistory(payload = {}, targetWorkspaceId = getWorkspaceId()) {
      return fetchJson(`${growthApiPath("learning-cycles", "history")}${cycleHistoryQuery(targetWorkspaceId, payload)}`);
    }

    function fetchGrowthStageCheckpointControls(payload = {}, targetWorkspaceId = getWorkspaceId()) {
      return fetchJson(`${growthApiPath("stage-assessments", "controls")}${stageAssessmentControlsQuery(targetWorkspaceId, payload)}`);
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

    function recordGrowthReleaseWorkbenchAction(payload = {}, targetWorkspaceId = getWorkspaceId()) {
      return postJson(growthApiPath("automation", "release-workbench", "actions"), Object.assign({
        workspace_id: targetWorkspaceId
      }, payload));
    }

    function reviewGrowthAutomationProposal(proposalId, payload = {}, targetWorkspaceId = getWorkspaceId()) {
      const id = clean(proposalId);
      if (!id) throw new Error("missing_proposal_id");
      return postJson(growthApiPath("automation", "proposals", encodeURIComponent(id), "decision"), Object.assign({
        workspace_id: targetWorkspaceId
      }, payload));
    }

    function reviewGrowthAutomationDigest(digestId, payload = {}, targetWorkspaceId = getWorkspaceId()) {
      const id = clean(digestId);
      if (!id) throw new Error("missing_digest_id");
      return postJson(growthApiPath("automation", "digests", encodeURIComponent(id), "review"), Object.assign({
        workspace_id: targetWorkspaceId
      }, payload));
    }

    function reviewGrowthRecommendationLifecycle(payload = {}, targetWorkspaceId = getWorkspaceId()) {
      return postJson(growthApiPath("recommendations", "lifecycle", "review"), Object.assign({
        workspace_id: targetWorkspaceId
      }, payload));
    }

    function publishGrowthAutomationProposal(proposalId, payload = {}, targetWorkspaceId = getWorkspaceId()) {
      const id = clean(proposalId);
      if (!id) throw new Error("missing_proposal_id");
      return postJson(growthApiPath("automation", "proposals", encodeURIComponent(id), "publish"), Object.assign({
        workspace_id: targetWorkspaceId
      }, payload));
    }

    return {
      appendWorkspaceQuery,
      activateGrowthStageAssessment,
      draftGrowthDailyLoop,
      evaluateGrowthStageAssessment,
      createGrowthAutomationProposal,
      fetchCardGenerationContext,
      fetchGrowthAutomationDigests,
      fetchGrowthAutomationProposals,
      fetchGrowthCycleAudit,
      fetchGrowthCycleCompleteness,
      fetchGrowthCycleHistory,
      fetchGrowthCard,
      fetchGrowthReleaseWorkbench,
      fetchGrowthStageCheckpointControls,
      fetchJson,
      fetchLearningLoopState,
      generateGrowthCard,
      postJson,
      processGrowthEvaluations,
      recordGrowthReleaseWorkbenchAction,
      provisionGrowthDomainPack,
      publishGrowthDailyLoop,
      publishGrowthAutomationProposal,
      retryGrowthEvaluation,
      reviewGrowthAutomationDigest,
      reviewGrowthAutomationProposal,
      reviewGrowthRecommendationLifecycle,
      resolveGrowthApiPath,
      submitGrowthCardEvidence,
      submitGrowthExperienceSignal,
      submitGrowthProfileCorrection,
      submitGrowthCardReflection,
      updateWorkspaceUrl,
      workspaceQuery
    };
  }

  root.HermesGrowthApiClient = {
    createGrowthApiClient
  };
})(typeof window !== "undefined" ? window : globalThis);
