const { createGrowthService } = require("../services/growth-service");
const { createHermesPluginService } = require("../services/hermes-plugin-service");
const { createJsonWorkspaceStore } = require("../stores/json-workspace-store");

function createServices(config) {
  const workspaceStore = createJsonWorkspaceStore({ filePath: config.workspaceStorePath });
  return {
    config,
    growthService: createGrowthService({ config }),
    pluginService: createHermesPluginService({ config, workspaceStore })
  };
}

module.exports = { createServices };
