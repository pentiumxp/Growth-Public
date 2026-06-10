const GROWTH_MCP_SCHEMAS = Object.freeze([
  Object.freeze({
    name: "growth.get_status",
    description: "Read bounded Growth plugin migration and readiness status for one Hermes workspace.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        workspace_id: {
          type: "string",
          description: "Hermes workspace id to read."
        }
      }
    }
  }),
  Object.freeze({
    name: "growth.get_board",
    description: "Read the bounded Growth board projection for one Hermes workspace.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        workspace_id: {
          type: "string",
          description: "Hermes workspace id to read."
        }
      }
    }
  })
]);

function listGrowthMcpSchemas() {
  return GROWTH_MCP_SCHEMAS.map((schema) => JSON.parse(JSON.stringify(schema)));
}

module.exports = {
  GROWTH_MCP_SCHEMAS,
  listGrowthMcpSchemas
};
