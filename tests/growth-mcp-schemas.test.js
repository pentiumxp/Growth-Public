const assert = require("node:assert/strict");
const test = require("node:test");
const { createGrowthMcpExecutor, GROWTH_MCP_SCHEMAS, listGrowthMcpSchemas } = require("../src/mcp/growth-mcp-schemas");

test("exposes read-only Growth MCP schema scaffold", () => {
  const schemas = listGrowthMcpSchemas();

  assert.equal(schemas.length, 4);
  assert.deepEqual(schemas.map((schema) => schema.name), [
    "growth.get_status",
    "growth.get_board",
    "growth.list_cards",
    "growth.get_card"
  ]);
  assert.equal(schemas.every((schema) => schema.input_schema.additionalProperties === false), true);
  assert.equal(JSON.stringify(schemas).includes("write"), false);
  assert.equal(JSON.stringify(schemas).includes("raw"), false);
  assert.notEqual(schemas, GROWTH_MCP_SCHEMAS);
  schemas[0].name = "mutated";
  assert.equal(GROWTH_MCP_SCHEMAS[0].name, "growth.get_status");
});

test("executes read-only Growth MCP tools through bounded service projections", async () => {
  const executor = createGrowthMcpExecutor({
    growthService: {
      status: async ({ workspaceId }) => ({ ok: true, workspace_id: workspaceId, stage: "host_facade" }),
      board: async ({ workspaceId }) => ({
        ok: true,
        workspace_id: workspaceId,
        cards: [{ taskCardId: "card_1", title: "Read", instructionPreview: "Do not expose in list.", status: "published" }],
        summary: { total: 1 }
      }),
      card: async ({ workspaceId, taskCardId }) => ({ ok: true, workspace_id: workspaceId, card: { taskCardId } })
    }
  });

  const status = await executor.execute({ name: "growth.get_status", input: { workspace_id: "growth:test" } });
  assert.equal(JSON.parse(status.content[0].text).stage, "host_facade");

  const cards = await executor.execute({ name: "growth.list_cards", input: { workspace_id: "growth:test" } });
  const cardsPayload = JSON.parse(cards.content[0].text);
  assert.equal(cardsPayload.cards[0].taskCardId, "card_1");
  assert.equal(cardsPayload.cards[0].status, "published");
  assert.equal(Object.hasOwn(cardsPayload.cards[0], "instructionPreview"), false);

  const card = await executor.execute({ name: "growth.get_card", input: { workspace_id: "growth:test", task_card_id: "card_1" } });
  assert.equal(JSON.parse(card.content[0].text).card.taskCardId, "card_1");

  const missing = await executor.execute({ name: "growth.write_card", input: {} });
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "growth_mcp_tool_not_found");
});
