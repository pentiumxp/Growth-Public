const { createGrowthService } = require("../services/growth-service");
const { createGrowthEventService } = require("../services/growth-event-service");
const { createHermesPluginService } = require("../services/hermes-plugin-service");
const { createGrowthEventOutboxStore } = require("../stores/growth-event-outbox-store");
const { createGrowthSnapshotStore } = require("../stores/growth-snapshot-store");
const { createJsonWorkspaceStore } = require("../stores/json-workspace-store");

function createServices(config) {
  const workspaceStore = createJsonWorkspaceStore({ filePath: config.workspaceStorePath });
  const growthSnapshotStore = createGrowthSnapshotStore({ filePath: config.snapshotStorePath });
  const growthEventOutboxStore = createGrowthEventOutboxStore({ filePath: config.eventOutboxStorePath });
  return {
    config,
    growthEventService: createGrowthEventService({ config, outboxStore: growthEventOutboxStore }),
    growthService: createGrowthService({ config, snapshotStore: growthSnapshotStore }),
    pluginService: createHermesPluginService({ config, workspaceStore })
  };
}

module.exports = { createServices };
