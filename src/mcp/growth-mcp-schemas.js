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
  }),
  Object.freeze({
    name: "growth.list_cards",
    description: "Read bounded Growth card summaries for one Hermes workspace.",
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
    name: "growth.get_card",
    description: "Read one bounded Growth card projection for one Hermes workspace.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["task_card_id"],
      properties: {
        workspace_id: {
          type: "string",
          description: "Hermes workspace id to read."
        },
        task_card_id: {
          type: "string",
          description: "Growth task card id."
        }
      }
    }
  })
]);

function listGrowthMcpSchemas() {
  return GROWTH_MCP_SCHEMAS.map((schema) => JSON.parse(JSON.stringify(schema)));
}

function textContent(value) {
  return [{ type: "text", text: JSON.stringify(value) }];
}

function compactCardSummary(card = {}) {
  return {
    taskCardId: card.taskCardId || "",
    title: card.title || "",
    status: card.status || "",
    domain: card.domain || "",
    cardRole: card.cardRole || "",
    plannedDate: card.plannedDate || "",
    nextAction: card.nextAction || card.primaryAction || "",
    submissionCount: Number(card.submissionCount || 0),
    evaluationCount: Number(card.evaluationCount || 0),
    artifactCount: Number(card.artifactCount || 0)
  };
}

function createGrowthMcpExecutor({ growthService }) {
  return {
    async execute({ name, input = {} } = {}) {
      if (name === "growth.get_status") {
        return { ok: true, content: textContent(await growthService.status({ workspaceId: input.workspace_id || input.workspaceId })) };
      }
      if (name === "growth.get_board") {
        return { ok: true, content: textContent(await growthService.board({ workspaceId: input.workspace_id || input.workspaceId })) };
      }
      if (name === "growth.list_cards") {
        const board = await growthService.board({ workspaceId: input.workspace_id || input.workspaceId });
        return {
          ok: true,
          content: textContent({
            ok: board.ok !== false,
            workspace_id: board.workspace_id,
            cards: Array.isArray(board.cards) ? board.cards.map(compactCardSummary) : [],
            summary: board.summary || null,
            source: board.source || ""
          })
        };
      }
      if (name === "growth.get_card") {
        return {
          ok: true,
          content: textContent(await growthService.card({
            workspaceId: input.workspace_id || input.workspaceId,
            taskCardId: input.task_card_id || input.taskCardId
          }))
        };
      }
      return {
        ok: false,
        error: "growth_mcp_tool_not_found"
      };
    }
  };
}

module.exports = {
  createGrowthMcpExecutor,
  GROWTH_MCP_SCHEMAS,
  listGrowthMcpSchemas
};
