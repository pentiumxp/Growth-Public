const { sendJson } = require("./http-utils");
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

  return false;
}

module.exports = { handleGrowthRoute };
