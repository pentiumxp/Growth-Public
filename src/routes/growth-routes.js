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

async function handleGrowthRoute(request, response, url, services) {
  if (request.method === "GET" && url.pathname === "/api/v1/growth/status") {
    const workspaceId = String(url.searchParams.get("workspace_id") || url.searchParams.get("workspaceId") || "growth:local-dev");
    return sendJson(response, 200, await services.growthService.status({ workspaceId }));
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/board") {
    const workspaceId = String(url.searchParams.get("workspace_id") || url.searchParams.get("workspaceId") || "growth:local-dev");
    return sendJson(response, 200, await services.growthService.board({ workspaceId }));
  }

  const cardMatch = url.pathname.match(/^\/api\/v1\/growth\/cards\/([^/]+)$/);
  if (request.method === "GET" && cardMatch) {
    const workspaceId = String(url.searchParams.get("workspace_id") || url.searchParams.get("workspaceId") || "growth:local-dev");
    const taskCardId = decodeURIComponent(cardMatch[1] || "");
    const result = await services.growthService.card({ workspaceId, taskCardId });
    return sendJson(response, result.ok ? 200 : 404, result);
  }

  const submissionMatch = url.pathname.match(/^\/api\/v1\/growth\/cards\/([^/]+)\/submissions$/);
  if (request.method === "POST" && submissionMatch) {
    const body = await readJson(request, { maxBytes: SUBMISSION_JSON_LIMIT_BYTES });
    const workspaceId = String(body.workspace_id || body.workspaceId || url.searchParams.get("workspace_id") || url.searchParams.get("workspaceId") || "");
    const authorized = services.pluginService.authorizeWorkspace({
      authorizationToken: bearerFrom(request.headers),
      workspaceId
    });
    const serviceWorkspaceId = authorized.hermes_workspace_id || String(authorized.workspace_id || "").replace(/^growth:/, "");
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
    const workspaceId = String(body.workspace_id || body.workspaceId || url.searchParams.get("workspace_id") || url.searchParams.get("workspaceId") || "");
    const authorized = services.pluginService.authorizeWorkspace({
      authorizationToken: bearerFrom(request.headers),
      workspaceId
    });
    const serviceWorkspaceId = authorized.hermes_workspace_id || String(authorized.workspace_id || "").replace(/^growth:/, "");
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
    const workspaceId = String(body.workspace_id || body.workspaceId || url.searchParams.get("workspace_id") || url.searchParams.get("workspaceId") || "");
    const authorized = services.pluginService.authorizeWorkspace({
      authorizationToken: bearerFrom(request.headers),
      workspaceId
    });
    const serviceWorkspaceId = authorized.hermes_workspace_id || String(authorized.workspace_id || "").replace(/^growth:/, "");
    const result = await services.growthEvaluationService.processEvaluationQueue({
      workspaceId: serviceWorkspaceId,
      limit: body.limit
    });
    return sendJson(response, result.ok ? 200 : 400, result);
  }

  const audioMatch = url.pathname.match(/^\/api\/v1\/growth\/audio\/(submissions|reflections)\/([^/]+)$/);
  if (request.method === "GET" && audioMatch) {
    const workspaceId = String(url.searchParams.get("workspace_id") || url.searchParams.get("workspaceId") || "growth:local-dev");
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
