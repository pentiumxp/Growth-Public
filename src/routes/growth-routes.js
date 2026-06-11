const fs = require("node:fs");
const { bearerFrom, readJson, sendJson } = require("./http-utils");
const { listGrowthMcpSchemas } = require("../mcp/growth-mcp-schemas");

const DEFAULT_JSON_LIMIT_BYTES = 1024 * 1024;
const SUBMISSION_JSON_LIMIT_BYTES = 16 * 1024 * 1024;

function safeHeaderValue(value) {
  return String(value || "").replace(/[\r\n"]/g, "_");
}

function streamAudio(response, audio) {
  const fileName = safeHeaderValue(audio.name || "learning-audio");
  const headers = {
    "Content-Type": audio.mime || "application/octet-stream",
    "Content-Disposition": `inline; filename="${fileName}"`,
    "Cache-Control": "private, max-age=60"
  };
  if (audio.kind === "blob") {
    headers["Content-Length"] = audio.content.length;
    response.writeHead(200, headers);
    response.end(audio.content);
    return true;
  }
  if (audio.kind === "file" && audio.filePath && audio.stat) {
    headers["Content-Length"] = audio.stat.size;
    response.writeHead(200, headers);
    fs.createReadStream(audio.filePath).on("error", () => response.end()).pipe(response);
    return true;
  }
  return false;
}

function requestedWorkspaceId(request, url, fallback = "growth:local-dev") {
  return String(
    url.searchParams.get("workspace_id")
    || url.searchParams.get("workspaceId")
    || request.headers["x-hermes-plugin-workspace-id"]
    || fallback
  );
}

function requestedActorRole(request) {
  return String(request.headers["x-hermes-plugin-actor-role"] || "").trim().toLowerCase();
}

function requestedWritableWorkspaceId(body, url) {
  return String(body.workspace_id || body.workspaceId || url.searchParams.get("workspace_id") || url.searchParams.get("workspaceId") || "");
}

function serviceWorkspaceIdFromAuthorization(authorized) {
  return authorized.hermes_workspace_id || String(authorized.workspace_id || "").replace(/^growth:/, "");
}

function authorizeWritableWorkspace(request, url, body, services) {
  const workspaceId = requestedWritableWorkspaceId(body, url);
  const authorized = services.pluginService.authorizeWorkspace({
    authorizationToken: bearerFrom(request.headers),
    workspaceId
  });
  return serviceWorkspaceIdFromAuthorization(authorized);
}

function normalizeGraphPlanInput(body, workspaceId) {
  return {
    learningGraphPlanId: body.learningGraphPlanId || body.learning_graph_plan_id,
    learnerId: body.learnerId || body.learner_id,
    workspaceId,
    programId: body.programId || body.program_id,
    targetNodeId: body.targetNodeId || body.target_node_id,
    targetNodeIds: body.targetNodeIds || body.target_node_ids,
    cardRole: body.cardRole || body.card_role,
    assessmentCoverageNodeIds: body.assessmentCoverageNodeIds || body.assessment_coverage_node_ids || body.assessmentCoverage || body.assessment_coverage,
    difficultyBand: body.difficultyBand || body.difficulty_band
  };
}

function normalizeCardGraphBindingInput(body, workspaceId, taskCardId) {
  return {
    bindingId: body.bindingId || body.binding_id,
    taskCardId,
    workspaceId,
    learningGraphPlanId: body.learningGraphPlanId || body.learning_graph_plan_id,
    nodeIds: body.nodeIds || body.node_ids,
    cardRole: body.cardRole || body.card_role,
    assessmentCoverage: body.assessmentCoverage || body.assessment_coverage,
    repairMetadata: body.repairMetadata || body.repair_metadata
  };
}

async function handleGrowthRoute(request, response, url, services) {
  if (request.method === "GET" && url.pathname === "/api/v1/growth/status") {
    const workspaceId = requestedWorkspaceId(request, url);
    return sendJson(response, 200, await services.growthService.status({ workspaceId }));
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/board") {
    const workspaceId = requestedWorkspaceId(request, url);
    return sendJson(response, 200, await services.growthService.board({ workspaceId }));
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/view-targets") {
    return sendJson(response, 200, services.pluginService.viewTargets({
      actorRole: requestedActorRole(request),
      currentWorkspaceId: requestedWorkspaceId(request, url, "")
    }));
  }

  const cardMatch = url.pathname.match(/^\/api\/v1\/growth\/cards\/([^/]+)$/);
  if (request.method === "GET" && cardMatch) {
    const workspaceId = requestedWorkspaceId(request, url);
    const taskCardId = decodeURIComponent(cardMatch[1] || "");
    const result = await services.growthService.card({ workspaceId, taskCardId });
    return sendJson(response, result.ok ? 200 : 404, result);
  }

  const submissionMatch = url.pathname.match(/^\/api\/v1\/growth\/cards\/([^/]+)\/submissions$/);
  if (request.method === "POST" && submissionMatch) {
    const body = await readJson(request, { maxBytes: SUBMISSION_JSON_LIMIT_BYTES });
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const taskCardId = decodeURIComponent(submissionMatch[1] || "");
    const result = await services.growthService.submitEvidence({
      workspaceId: serviceWorkspaceId,
      taskCardId,
      body
    });
    return sendJson(response, result.ok ? 202 : 400, result);
  }

  const reflectionMatch = url.pathname.match(/^\/api\/v1\/growth\/cards\/([^/]+)\/reflections$/);
  if (request.method === "POST" && reflectionMatch) {
    const body = await readJson(request, { maxBytes: SUBMISSION_JSON_LIMIT_BYTES });
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const taskCardId = decodeURIComponent(reflectionMatch[1] || "");
    const result = await services.growthService.submitReflection({
      workspaceId: serviceWorkspaceId,
      taskCardId,
      body
    });
    return sendJson(response, result.ok ? 202 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/evaluations/process") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const result = await services.growthEvaluationService.processEvaluationQueue({
      workspaceId: serviceWorkspaceId,
      limit: body.limit
    });
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/learning-coins/balance") {
    const workspaceId = String(url.searchParams.get("workspace_id") || url.searchParams.get("workspaceId") || "");
    const authorized = services.pluginService.authorizeWorkspace({
      authorizationToken: bearerFrom(request.headers),
      workspaceId
    });
    const serviceWorkspaceId = serviceWorkspaceIdFromAuthorization(authorized);
    const result = await services.growthService.learningCoinBalance({ workspaceId: serviceWorkspaceId });
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/learning-coins/monthly-exchange-clear") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const result = await services.growthService.clearLearningCoinBalanceForMonthlyExchange({
      workspaceId: serviceWorkspaceId,
      body
    });
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/graph/plans") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const result = await services.learningGraphPlanService.createPlan(normalizeGraphPlanInput(body, serviceWorkspaceId));
    return sendJson(response, result.ok ? 201 : 400, result);
  }

  const graphBindingMatch = url.pathname.match(/^\/api\/v1\/growth\/cards\/([^/]+)\/graph-binding$/);
  if (request.method === "POST" && graphBindingMatch) {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    const serviceWorkspaceId = authorizeWritableWorkspace(request, url, body, services);
    const taskCardId = decodeURIComponent(graphBindingMatch[1] || "");
    const result = await services.learningCardGraphBindingService.bindCard(
      normalizeCardGraphBindingInput(body, serviceWorkspaceId, taskCardId)
    );
    return sendJson(response, result.ok ? 201 : 400, result);
  }

  const audioMatch = url.pathname.match(/^\/api\/v1\/growth\/audio\/(submissions|reflections)\/([^/]+)$/);
  if (request.method === "GET" && audioMatch) {
    const workspaceId = requestedWorkspaceId(request, url);
    const recordType = audioMatch[1] === "submissions" ? "submission" : "reflection";
    const recordId = decodeURIComponent(audioMatch[2] || "");
    const audio = await services.growthService.audio({ workspaceId, recordType, recordId });
    if (audio && streamAudio(response, audio)) return true;
    return sendJson(response, 404, { ok: false, error: "growth_audio_not_found" });
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/mcp/schemas") {
    return sendJson(response, 200, {
      ok: true,
      toolset: "growth",
      schemas: listGrowthMcpSchemas()
    });
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/mcp/execute") {
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    const input = body.input || body.arguments || {};
    const workspaceId = body.workspace_id || body.workspaceId || input.workspace_id || input.workspaceId;
    const authorized = services.pluginService.authorizeWorkspace({
      authorizationToken: bearerFrom(request.headers),
      workspaceId
    });
    const serviceWorkspaceId = authorized.hermes_workspace_id || String(authorized.workspace_id || "").replace(/^growth:/, "");
    const result = await services.growthMcpExecutor.execute({
      name: body.name || body.tool_name || body.toolName,
      input: Object.assign({}, input, { workspace_id: serviceWorkspaceId })
    });
    return sendJson(response, result.ok ? 200 : 404, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/events") {
    services.pluginService.authorizeRegistration({ authorizationToken: bearerFrom(request.headers) });
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    return sendJson(response, 202, await services.growthEventService.emit(body));
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/migrations/facade-snapshot") {
    services.pluginService.authorizeRegistration({ authorizationToken: bearerFrom(request.headers) });
    const body = await readJson(request, { maxBytes: DEFAULT_JSON_LIMIT_BYTES });
    return sendJson(response, 200, await services.growthService.importFromFacade({
      workspaceId: body.workspace_id || body.workspaceId,
      includeCardDetails: body.include_card_details !== false && body.includeCardDetails !== false
    }));
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/migrations/readback") {
    services.pluginService.authorizeRegistration({ authorizationToken: bearerFrom(request.headers) });
    const workspaceId = String(url.searchParams.get("workspace_id") || url.searchParams.get("workspaceId") || "growth:local-dev");
    const result = services.growthService.migrationReadback({ workspaceId });
    return sendJson(response, result.ok ? 200 : 404, result);
  }

  return false;
}

module.exports = { handleGrowthRoute };
