const { bearerFrom, readJson, sendJson } = require("./http-utils");

async function handlePluginRoute(request, response, url, services) {
  if (request.method === "GET" && url.pathname === "/api/v1/hermes/plugin/manifest") {
    return sendJson(response, 200, services.pluginService.getManifest());
  }

  if (request.method === "POST" && url.pathname === "/api/v1/hermes/plugin/workspaces") {
    const body = await readJson(request);
    return sendJson(response, 200, services.pluginService.provisionWorkspace({
      authorizationToken: bearerFrom(request.headers),
      body
    }));
  }

  if (request.method === "POST" && url.pathname === "/api/v1/hermes/plugin/launch") {
    const body = await readJson(request);
    return sendJson(response, 200, services.pluginService.launchWorkspace({
      authorizationToken: bearerFrom(request.headers),
      body
    }));
  }

  if (request.method === "GET" && url.pathname === "/api/v1/hermes/plugin/workspaces") {
    return sendJson(response, 200, {
      ok: true,
      workspaces: services.pluginService.listWorkspaces()
    });
  }

  return false;
}

module.exports = { handlePluginRoute };
