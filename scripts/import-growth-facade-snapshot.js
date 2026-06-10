#!/usr/bin/env node

const { readEnv } = require("../src/config/env");
const { createServices } = require("../src/app/services");

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return "";
  return process.argv[index + 1] || "";
}

async function main() {
  const config = readEnv();
  const services = createServices(config);
  const workspaceId = argValue("--workspace-id") || process.env.GROWTH_WORKSPACE_ID || "growth:local-dev";
  const includeCardDetails = !process.argv.includes("--no-card-details");
  const result = await services.growthService.importFromFacade({ workspaceId, includeCardDetails });
  if (!result.ok) {
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error.code || "growth_facade_import_failed",
    message: error.expose ? error.message : "Growth facade import failed"
  }, null, 2));
  process.exitCode = 1;
});
