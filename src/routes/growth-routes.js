const { bearerFrom, readJson, sendJson } = require("./http-utils");
const { listGrowthMcpSchemas } = require("../mcp/growth-mcp-schemas");

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

  if (request.method === "GET" && url.pathname === "/api/v1/growth/mcp/schemas") {
    return sendJson(response, 200, {
      ok: true,
      toolset: "growth",
      schemas: listGrowthMcpSchemas()
    });
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/mcp/execute") {
    services.pluginService.authorizeRegistration({ authorizationToken: bearerFrom(request.headers) });
    const body = await readJson(request);
    const result = await services.growthMcpExecutor.execute({
      name: body.name || body.tool_name || body.toolName,
      input: body.input || body.arguments || {}
    });
    return sendJson(response, result.ok ? 200 : 404, result);
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/events") {
    services.pluginService.authorizeRegistration({ authorizationToken: bearerFrom(request.headers) });
    const body = await readJson(request);
    return sendJson(response, 202, await services.growthEventService.emit(body));
  }

  if (request.method === "POST" && url.pathname === "/api/v1/growth/migrations/facade-snapshot") {
    services.pluginService.authorizeRegistration({ authorizationToken: bearerFrom(request.headers) });
    const body = await readJson(request);
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
