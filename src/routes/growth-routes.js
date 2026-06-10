const { sendJson } = require("./http-utils");

async function handleGrowthRoute(request, response, url, services) {
  if (request.method === "GET" && url.pathname === "/api/v1/growth/status") {
    return sendJson(response, 200, services.growthService.status());
  }

  if (request.method === "GET" && url.pathname === "/api/v1/growth/board") {
    const workspaceId = String(url.searchParams.get("workspace_id") || "growth:local-dev");
    return sendJson(response, 200, services.growthService.board({ workspaceId }));
  }

  return false;
}

module.exports = { handleGrowthRoute };
