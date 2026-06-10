const assert = require("node:assert/strict");
const test = require("node:test");
const { createServer, startServer } = require("../src/app/http-server");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

test("migration facade snapshot route requires registration bearer and returns readback", async () => {
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeRegistration({ authorizationToken }) {
        if (authorizationToken !== "registration-key") {
          const error = new Error("Invalid registration credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
      }
    },
    growthService: {
      async importFromFacade({ workspaceId, includeCardDetails }) {
        return {
          ok: true,
          workspace_id: workspaceId,
          imported: { workspace_id: workspaceId, card_count: includeCardDetails ? 2 : 1 },
          readback: { workspace_id: workspaceId, card_count: includeCardDetails ? 2 : 1 }
        };
      },
      migrationReadback({ workspaceId }) {
        return {
          ok: true,
          workspace_id: workspaceId,
          snapshot: { workspace_id: workspaceId, card_count: 2 }
        };
      }
    }
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/migrations/facade-snapshot`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspace_id: "growth:test" })
    });
    assert.equal(denied.status, 403);

    const imported = await fetch(`${baseUrl}/api/v1/growth/migrations/facade-snapshot`, {
      method: "POST",
      headers: {
        authorization: "Bearer registration-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({ workspace_id: "growth:test", include_card_details: false })
    });
    assert.equal(imported.status, 200);
    const body = await imported.json();
    assert.equal(body.ok, true);
    assert.equal(body.readback.card_count, 1);

    const readback = await fetch(`${baseUrl}/api/v1/growth/migrations/readback?workspace_id=growth:test`, {
      headers: { authorization: "Bearer registration-key" }
    });
    assert.equal(readback.status, 200);
    assert.equal((await readback.json()).snapshot.card_count, 2);
  } finally {
    await close(server);
  }
});

test("growth event route requires registration bearer and emits bounded events", async () => {
  const emitted = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeRegistration({ authorizationToken }) {
        if (authorizationToken !== "registration-key") {
          const error = new Error("Invalid registration credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
      }
    },
    growthEventService: {
      async emit(input) {
        emitted.push(input);
        return { ok: true, record: { id: input.eventId || input.event_id, event: input } };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "growth.card.completed" })
    });
    assert.equal(denied.status, 403);

    const accepted = await fetch(`${baseUrl}/api/v1/growth/events`, {
      method: "POST",
      headers: {
        authorization: "Bearer registration-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        eventId: "event_1",
        type: "growth.card.completed",
        workspaceId: "growth:test",
        taskCardId: "card_1",
        summary: "Done."
      })
    });
    assert.equal(accepted.status, 202);
    assert.equal((await accepted.json()).record.id, "event_1");
    assert.equal(emitted[0].type, "growth.card.completed");
  } finally {
    await close(server);
  }
});

test("growth MCP execute route requires workspace bearer", async () => {
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "growth:test") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: "test" };
      }
    },
    growthMcpExecutor: {
      async execute({ name, input }) {
        return { ok: true, content: [{ type: "text", text: JSON.stringify({ name, input }) }] };
      }
    },
    growthEventService: {},
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/mcp/execute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "growth.get_status", input: { workspace_id: "growth:test" } })
    });
    assert.equal(denied.status, 403);

    const accepted = await fetch(`${baseUrl}/api/v1/growth/mcp/execute`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({ name: "growth.get_status", input: { workspace_id: "growth:test" } })
    });
    assert.equal(accepted.status, 200);
    const payload = JSON.parse((await accepted.json()).content[0].text);
    assert.equal(payload.name, "growth.get_status");
    assert.equal(payload.input.workspace_id, "test");

    const override = await fetch(`${baseUrl}/api/v1/growth/mcp/execute`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        name: "growth.get_status",
        workspace_id: "growth:test",
        input: { workspace_id: "growth:other" }
      })
    });
    assert.equal(override.status, 200);
    const overridePayload = JSON.parse((await override.json()).content[0].text);
    assert.equal(overridePayload.input.workspace_id, "test");
  } finally {
    await close(server);
  }
});

test("growth audio route streams plugin-owned audio evidence", async () => {
  const server = createServer({
    pluginService: {
      getManifest: () => ({})
    },
    growthService: {
      async audio({ workspaceId, recordType, recordId }) {
        assert.equal(workspaceId, "weixin_child");
        assert.equal(recordType, "submission");
        assert.equal(recordId, "submission_1");
        return {
          kind: "blob",
          name: "submission.ogg",
          mime: "audio/ogg",
          content: Buffer.from("audio-body")
        };
      }
    },
    growthEventService: {}
  });
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/v1/growth/audio/submissions/submission_1?workspaceId=weixin_child`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "audio/ogg");
    assert.equal(await response.text(), "audio-body");
  } finally {
    await close(server);
  }
});

test("growth card submission route requires workspace bearer and queues plugin evaluation", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "growth:test") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: "test" };
      }
    },
    growthService: {
      async submitEvidence(input) {
        calls.push(input);
        return {
          ok: true,
          workspace_id: input.workspaceId,
          task_card_id: input.taskCardId,
          submission: { submissionId: "submission_1" },
          evaluation_job: { status: "pending" }
        };
      }
    },
    growthEventService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/cards/card_1/submissions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspace_id: "growth:test", text: "done" })
    });
    assert.equal(denied.status, 403);

    const accepted = await fetch(`${baseUrl}/api/v1/growth/cards/card_1/submissions`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({ workspace_id: "growth:test", text: "done" })
    });
    assert.equal(accepted.status, 202);
    const body = await accepted.json();
    assert.equal(body.ok, true);
    assert.equal(body.evaluation_job.status, "pending");
    assert.equal(calls[0].workspaceId, "test");
    assert.equal(calls[0].taskCardId, "card_1");

    const tooLarge = await fetch(`${baseUrl}/api/v1/growth/cards/card_1/submissions`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        dataBase64: "a".repeat(17 * 1024 * 1024)
      })
    });
    assert.equal(tooLarge.status, 413);
  } finally {
    await close(server);
  }
});

test("growth card reflection route requires workspace bearer", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "growth:test") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: "test" };
      }
    },
    growthService: {
      async submitReflection(input) {
        calls.push(input);
        return {
          ok: true,
          workspace_id: input.workspaceId,
          task_card_id: input.taskCardId,
          reflection: { reflectionId: "reflection_1", status: "submitted" }
        };
      }
    },
    growthEventService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/cards/card_1/reflections`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspace_id: "growth:test", text: "done" })
    });
    assert.equal(denied.status, 403);

    const accepted = await fetch(`${baseUrl}/api/v1/growth/cards/card_1/reflections`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({ workspace_id: "growth:test", text: "done" })
    });
    assert.equal(accepted.status, 202);
    assert.equal((await accepted.json()).reflection.status, "submitted");
    assert.deepEqual(calls[0], {
      workspaceId: "test",
      taskCardId: "card_1",
      body: { workspace_id: "growth:test", text: "done" }
    });
  } finally {
    await close(server);
  }
});

test("growth evaluation process route requires workspace bearer", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "growth:test") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: "test" };
      }
    },
    growthEvaluationService: {
      async processEvaluationQueue(input) {
        calls.push(input);
        return { ok: true, processed: 1, results: [{ jobId: "job_1", ok: true, status: "completed" }] };
      }
    },
    growthEventService: {},
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/evaluations/process`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspace_id: "growth:test" })
    });
    assert.equal(denied.status, 403);

    const accepted = await fetch(`${baseUrl}/api/v1/growth/evaluations/process`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({ workspace_id: "growth:test", limit: 2 })
    });
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json()).processed, 1);
    assert.deepEqual(calls[0], { workspaceId: "test", limit: 2 });
  } finally {
    await close(server);
  }
});

test("growth learning coin monthly clear route requires workspace bearer", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "growth:test") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: "test" };
      }
    },
    growthService: {
      async learningCoinBalance(input) {
        calls.push({ type: "balance", input });
        return { ok: true, workspace_id: input.workspaceId, available_coins: 100, currency: "learning_coin" };
      },
      async clearLearningCoinBalanceForMonthlyExchange(input) {
        calls.push({ type: "clear", input });
        return { ok: true, workspace_id: input.workspaceId, cleared_coins: 100, currency: "learning_coin" };
      }
    },
    growthEventService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/learning-coins/balance?workspaceId=growth:test`);
    assert.equal(denied.status, 403);

    const balance = await fetch(`${baseUrl}/api/v1/growth/learning-coins/balance?workspaceId=growth:test`, {
      headers: { authorization: "Bearer workspace-key" }
    });
    assert.equal(balance.status, 200);
    assert.equal((await balance.json()).available_coins, 100);
    assert.deepEqual(calls[0], { type: "balance", input: { workspaceId: "test" } });

    const cleared = await fetch(`${baseUrl}/api/v1/growth/learning-coins/monthly-exchange-clear`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        period: "2026-06",
        idempotencyKey: "exchange:test:2026-06",
        write: true
      })
    });
    assert.equal(cleared.status, 200);
    assert.equal((await cleared.json()).cleared_coins, 100);
    assert.deepEqual(calls[1], {
      type: "clear",
      input: {
        workspaceId: "test",
        body: {
          workspace_id: "growth:test",
          period: "2026-06",
          idempotencyKey: "exchange:test:2026-06",
          write: true
        }
      }
    });
  } finally {
    await close(server);
  }
});

test("growth evaluation worker processes queue when enabled", async () => {
  let processed = 0;
  const server = startServer({
    port: 0,
    evaluationWorkerEnabled: true,
    evaluationWorkerIntervalMs: 5000
  }, {
    growthEvaluationService: {
      async processEvaluationQueue() {
        processed += 1;
        return { ok: true, processed: 0, results: [] };
      }
    }
  });
  try {
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(processed >= 1, true);
  } finally {
    await close(server);
  }
});
