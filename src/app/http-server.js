const http = require("node:http");
const { readEnv } = require("../config/env");
const { createServices } = require("./services");
const { sendError, sendJson } = require("../routes/http-utils");
const { handleGrowthRoute } = require("../routes/growth-routes");
const { handlePluginRoute } = require("../routes/plugin-routes");
const { handleStaticRoute } = require("../routes/static-routes");
const { createGrowthWorkerRuntimeHealthService } = require("../services/growth-worker-runtime-health-service");

function ensureWorkerRuntimeHealthService(services) {
  if (!services.workerRuntimeHealthService) {
    services.workerRuntimeHealthService = createGrowthWorkerRuntimeHealthService();
  }
  return services.workerRuntimeHealthService;
}

function runWorkerWithHealth(services, workerId, run) {
  const health = ensureWorkerRuntimeHealthService(services);
  health.recordStarted(workerId);
  return Promise.resolve()
    .then(run)
    .then((result) => {
      health.recordSucceeded(workerId, result || {});
      return result;
    })
    .catch((error) => {
      health.recordFailed(workerId, error);
      return null;
    });
}

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
  ensureWorkerRuntimeHealthService(services);
  const server = createServer(services);
  let evaluationTimer = null;
  let schedulerWorkerTimer = null;
  if (config.evaluationWorkerEnabled && services.growthEvaluationService?.processEvaluationQueue) {
    const runEvaluationQueue = () => runWorkerWithHealth(
      services,
      "evaluation_queue",
      () => services.growthEvaluationService.processEvaluationQueue({ limit: 10 })
    );
    evaluationTimer = setInterval(runEvaluationQueue, config.evaluationWorkerIntervalMs);
    if (typeof evaluationTimer.unref === "function") evaluationTimer.unref();
    runEvaluationQueue();
  }
  if (config.automationBackgroundWorkerEnabled && services.learningAutomationSchedulerWorkerService?.tickTargets) {
    const runSchedulerWorker = () => runWorkerWithHealth(
      services,
      "automation_scheduler_worker",
      () => services.learningAutomationSchedulerWorkerService.tickTargets({
        targets: config.automationBackgroundWorkerTargets,
        workerId: config.automationBackgroundWorkerId,
        leaseMs: config.automationBackgroundWorkerLeaseMs
      })
    );
    schedulerWorkerTimer = setInterval(runSchedulerWorker, config.automationBackgroundWorkerIntervalMs);
    if (typeof schedulerWorkerTimer.unref === "function") schedulerWorkerTimer.unref();
    runSchedulerWorker();
  }
  const close = server.close.bind(server);
  server.close = (callback) => {
    if (evaluationTimer) clearInterval(evaluationTimer);
    if (schedulerWorkerTimer) clearInterval(schedulerWorkerTimer);
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
