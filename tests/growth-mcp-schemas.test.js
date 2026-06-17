const assert = require("node:assert/strict");
const test = require("node:test");
const { createGrowthMcpExecutor, GROWTH_MCP_SCHEMAS, listGrowthMcpSchemas } = require("../src/mcp/growth-mcp-schemas");

test("exposes read-only Growth MCP schema scaffold", () => {
  const schemas = listGrowthMcpSchemas();

  assert.equal(schemas.length, 7);
  assert.deepEqual(schemas.map((schema) => schema.name), [
    "growth.get_status",
    "growth.get_board",
    "growth.list_cards",
    "growth.get_card",
    "growth.reference_object_types",
    "growth.reference_get",
    "growth.reference_summarize"
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
    },
    referenceContractService: {
      referenceObjectTypes: ({ workspaceId }) => ({
        ok: true,
        workspaceId,
        objectTypes: [{ objectType: "task_card" }]
      }),
      referenceGet: async ({ workspaceId, objectType, objectId }) => ({
        ok: true,
        workspaceId,
        objectType,
        objectId,
        schemaVersion: "growth.referenceObject.v1"
      }),
      referenceSummarize: async ({ workspaceId, objectType, objectId, purpose }) => ({
        ok: true,
        workspaceId,
        objectType,
        objectId,
        purpose,
        schemaVersion: "growth.referenceSummary.v1"
      })
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

  const referenceTypes = await executor.execute({ name: "growth.reference_object_types", input: { workspace_id: "growth:test" } });
  assert.equal(JSON.parse(referenceTypes.content[0].text).objectTypes[0].objectType, "task_card");

  const referenceObject = await executor.execute({ name: "growth.reference_get", input: { workspace_id: "growth:test", object_type: "task_card", object_id: "card_1" } });
  assert.equal(JSON.parse(referenceObject.content[0].text).schemaVersion, "growth.referenceObject.v1");

  const referenceSummary = await executor.execute({ name: "growth.reference_summarize", input: { workspace_id: "growth:test", object_type: "task_card", object_id: "card_1", purpose: "graph" } });
  assert.equal(JSON.parse(referenceSummary.content[0].text).purpose, "graph");

  const missing = await executor.execute({ name: "growth.write_card", input: {} });
  assert.equal(missing.ok, false);
  assert.equal(missing.error, "growth_mcp_tool_not_found");
});
