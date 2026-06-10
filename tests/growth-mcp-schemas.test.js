const assert = require("node:assert/strict");
const test = require("node:test");
const { GROWTH_MCP_SCHEMAS, listGrowthMcpSchemas } = require("../src/mcp/growth-mcp-schemas");

test("exposes read-only Growth MCP schema scaffold", () => {
  const schemas = listGrowthMcpSchemas();

  assert.equal(schemas.length, 2);
  assert.deepEqual(schemas.map((schema) => schema.name), ["growth.get_status", "growth.get_board"]);
  assert.equal(schemas.every((schema) => schema.input_schema.additionalProperties === false), true);
  assert.equal(JSON.stringify(schemas).includes("write"), false);
  assert.equal(JSON.stringify(schemas).includes("raw"), false);
  assert.notEqual(schemas, GROWTH_MCP_SCHEMAS);
  schemas[0].name = "mutated";
  assert.equal(GROWTH_MCP_SCHEMAS[0].name, "growth.get_status");
});
