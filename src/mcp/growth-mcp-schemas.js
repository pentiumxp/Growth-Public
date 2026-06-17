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
  }),
  Object.freeze({
    name: "growth.reference_object_types",
    description: "List Growth object types that expose the minimal summary-only reference contract.",
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
    name: "growth.reference_get",
    description: "Read one summary-only Growth stable object reference through the owning plugin boundary.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["object_type", "object_id"],
      properties: {
        workspace_id: {
          type: "string",
          description: "Hermes workspace id to read."
        },
        object_type: {
          type: "string",
          description: "Growth reference object type, such as task_card, submission, evaluation, reflection, mastery_profile, learning_graph_plan, plan_draft, or profile_feedback."
        },
        object_id: {
          type: "string",
          description: "Stable Growth object id."
        }
      }
    }
  }),
  Object.freeze({
    name: "growth.reference_summarize",
    description: "Read a compact summary-only Growth object reference for graph display or answer composition.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["object_type", "object_id"],
      properties: {
        workspace_id: {
          type: "string",
          description: "Hermes workspace id to read."
        },
        object_type: {
          type: "string",
          description: "Growth reference object type."
        },
        object_id: {
          type: "string",
          description: "Stable Growth object id."
        },
        purpose: {
          type: "string",
          description: "Optional bounded use case for the summary."
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

function createGrowthMcpExecutor({ growthService, referenceContractService }) {
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
      if (name === "growth.reference_object_types") {
        const service = referenceContractService || {};
        if (typeof service.referenceObjectTypes !== "function") {
          return { ok: false, error: "growth_reference_contract_unavailable" };
        }
        return {
          ok: true,
          content: textContent(service.referenceObjectTypes({ workspaceId: input.workspace_id || input.workspaceId }))
        };
      }
      if (name === "growth.reference_get") {
        const service = referenceContractService || {};
        if (typeof service.referenceGet !== "function") {
          return { ok: false, error: "growth_reference_contract_unavailable" };
        }
        return {
          ok: true,
          content: textContent(await service.referenceGet({
            workspaceId: input.workspace_id || input.workspaceId,
            objectType: input.object_type || input.objectType,
            objectId: input.object_id || input.objectId
          }))
        };
      }
      if (name === "growth.reference_summarize") {
        const service = referenceContractService || {};
        if (typeof service.referenceSummarize !== "function") {
          return { ok: false, error: "growth_reference_contract_unavailable" };
        }
        return {
          ok: true,
          content: textContent(await service.referenceSummarize({
            workspaceId: input.workspace_id || input.workspaceId,
            objectType: input.object_type || input.objectType,
            objectId: input.object_id || input.objectId,
            purpose: input.purpose
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
