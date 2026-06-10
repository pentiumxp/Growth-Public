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

function startServer(config = readEnv(), serviceOverrides = null) {
  const services = serviceOverrides || createServices(config);
  const server = createServer(services);
  let evaluationTimer = null;
  if (config.evaluationWorkerEnabled && services.growthEvaluationService?.processEvaluationQueue) {
    const runEvaluationQueue = () => services.growthEvaluationService.processEvaluationQueue({ limit: 10 }).catch(() => null);
    evaluationTimer = setInterval(runEvaluationQueue, config.evaluationWorkerIntervalMs);
    if (typeof evaluationTimer.unref === "function") evaluationTimer.unref();
    runEvaluationQueue();
  }
  const close = server.close.bind(server);
  server.close = (callback) => {
    if (evaluationTimer) clearInterval(evaluationTimer);
    return close(callback);
  };
  server.listen(config.port, "127.0.0.1", () => {
    console.log(`Growth plugin listening on http://127.0.0.1:${config.port}`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { createServer, startServer };
