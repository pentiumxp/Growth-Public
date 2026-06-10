const http = require("node:http");
const { readEnv } = require("../config/env");
const { createServices } = require("./services");
const { sendError, sendJson } = require("../routes/http-utils");
const { handleGrowthRoute } = require("../routes/growth-routes");
const { handlePluginRoute } = require("../routes/plugin-routes");
const { handleStaticRoute } = require("../routes/static-routes");

function createServer(services) {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    try {
      if (await handlePluginRoute(request, response, url, services)) return;
      if (await handleGrowthRoute(request, response, url, services)) return;
      if (handleStaticRoute(request, response, url, services)) return;
      sendJson(response, 404, { ok: false, error: { code: "not_found" } });
    } catch (error) {
      sendError(response, error);
    }
  });
}

function startServer(config = readEnv()) {
  const services = createServices(config);
  const server = createServer(services);
  server.listen(config.port, "127.0.0.1", () => {
    console.log(`Growth plugin listening on http://127.0.0.1:${config.port}`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { createServer, startServer };
