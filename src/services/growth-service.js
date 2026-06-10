function createGrowthService() {
  return {
    status() {
      return {
        ok: true,
        plugin_id: "growth",
        stage: "scaffold",
        data_ownership: "not_migrated",
        mcp_toolset: "planned",
        message: "Growth plugin scaffold is running; built-in Home AI Growth data has not been migrated."
      };
    },

    board({ workspaceId }) {
      return {
        ok: true,
        workspace_id: workspaceId,
        cards: [],
        summary: {
          total: 0,
          active: 0,
          waiting_review: 0,
          completed: 0
        },
        source: "growth-plugin-scaffold"
      };
    }
  };
}

module.exports = { createGrowthService };
