const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.join(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

test("Growth routes stay HTTP glue and do not import stores directly", () => {
  for (const fileName of ["growth-routes.js", "plugin-routes.js", "static-routes.js"]) {
    const source = read(path.join("src", "routes", fileName));
    assert.doesNotMatch(source, /require\(["']\.\.\/stores\//, `${fileName} must dispatch through services`);
    assert.doesNotMatch(source, /require\(["']\.\.\/stores\/growth-learning-sqlite-store/, `${fileName} must not import SQLite store`);
  }
});

test("Growth service orchestration delegates providers and does not own facade URL construction", () => {
  const service = read(path.join("src", "services", "growth-service.js"));
  assert.match(service, /createGrowthReadOrchestrator/);
  assert.match(service, /createGrowthWriteOrchestrator/);
  assert.match(service, /createHomeAiFacadeGrowthProvider/);
  assert.doesNotMatch(service, /new URL\(/);
  assert.doesNotMatch(service, /X-Hermes-Web-Key/);
  assert.doesNotMatch(service, /\/api\/growth\/v1\/board/);
  assert.doesNotMatch(service, /growth_plugin_write_not_available/);
  assert.match(read(path.join("src", "services", "home-ai-growth-facade-client.js")), /new URL\(/);
});

test("Growth Gateway evaluation boundary stays service-owned", () => {
  const services = read(path.join("src", "app", "services.js"));
  assert.match(services, /createGrowthGatewayEvaluationClient/);
  assert.match(services, /createLearningCardEvaluationService/);
  assert.match(services, /gatewayEvaluationEndpoint/);
  assert.match(services, /learningCardEvaluationService\.evaluateSubmission/);

  const routes = read(path.join("src", "routes", "growth-routes.js"));
  assert.doesNotMatch(routes, /createGrowthGatewayEvaluationClient/);
  assert.doesNotMatch(routes, /GROWTH_GATEWAY_EVALUATION/);
  assert.doesNotMatch(routes, /evaluateCardSubmission/);
});

test("Growth read and write provider boundaries stay separated", () => {
  const readProvider = read(path.join("src", "services", "growth-providers", "sqlite-provider.js"));
  const writeProvider = read(path.join("src", "services", "growth-providers", "sqlite-write-provider.js"));
  assert.doesNotMatch(readProvider, /submitEvidence/);
  assert.doesNotMatch(readProvider, /submitReflection/);
  assert.doesNotMatch(readProvider, /clearLearningCoinBalanceForMonthlyExchange/);
  assert.match(writeProvider, /submitEvidence/);
  assert.match(writeProvider, /submitReflection/);
  assert.match(writeProvider, /clearLearningCoinBalanceForMonthlyExchange/);
});

test("Growth SQLite store facade stays a composition boundary", () => {
  const store = read(path.join("src", "stores", "growth-learning-sqlite-store.js"));
  assert.doesNotMatch(store, /require\(["']node:fs["']\)/);
  assert.match(store, /createAudioRepository/);
  assert.match(store, /createEvaluationJobRepository/);
  assert.match(store, /createEvidenceWriter/);
  assert.match(store, /createMasteryProfileRepository/);
  assert.match(store, /createRewardRepository/);
});

test("Growth frontend app remains boot wiring over adapter modules", () => {
  const app = read(path.join("public", "app.js"));
  assert.match(app, /HermesGrowthAppearance/);
  assert.match(app, /HermesGrowthApiClient/);
  assert.match(app, /HermesGrowthViewModel/);
  assert.match(app, /HermesGrowthRouteController/);
  assert.match(app, /HermesGrowthCardInteractionController/);
  assert.match(app, /ensureCardGenerationTargetSelected/);
  assert.match(app, /preferredCardGenerationWorkspaceId/);
  assert.doesNotMatch(app, /if \(pageState\.auth\.isOwner\) await loadCardGenerationContext\(\);/);
  assert.doesNotMatch(app, /function normalizeBoard/);
  assert.doesNotMatch(app, /function applyInitialPluginRoute/);
  assert.doesNotMatch(app, /function normalizeTheme/);

  const index = read(path.join("public", "index.html"));
  for (const asset of [
    "growth-appearance.js",
    "growth-api-client.js",
    "growth-view-model.js",
    "growth-route-controller.js",
    "growth-card-generation-ui.js",
    "growth-card-interaction-controller.js",
    "app.js"
  ]) {
    assert.match(index, new RegExp(`/${asset}`));
  }
});
