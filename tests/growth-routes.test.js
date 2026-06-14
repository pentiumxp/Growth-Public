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

test("growth view targets are owner-only and use proxy workspace headers", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      viewTargets(input) {
        calls.push(input);
        return {
          ok: true,
          viewer: { role: input.actorRole === "owner" ? "owner" : "workspace", canSwitch: input.actorRole === "owner" },
          current_workspace_id: input.currentWorkspaceId,
          targets: input.actorRole === "owner"
            ? [
                { workspaceId: "weixin_stephen", label: "Stephen", current: true },
                { workspaceId: "weixin_wuping", label: "吴萍", current: false }
              ]
            : [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const ownerResponse = await fetch(`${baseUrl}/api/v1/growth/view-targets`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(ownerResponse.status, 200);
    const ownerBody = await ownerResponse.json();
    assert.equal(ownerBody.viewer.role, "owner");
    assert.equal(ownerBody.targets.length, 2);
    assert.deepEqual(calls[0], { actorRole: "owner", currentWorkspaceId: "weixin_stephen" });

    const memberResponse = await fetch(`${baseUrl}/api/v1/growth/view-targets`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(memberResponse.status, 200);
    const memberBody = await memberResponse.json();
    assert.equal(memberBody.viewer.role, "workspace");
    assert.equal(memberBody.targets.length, 1);
    assert.deepEqual(calls[1], { actorRole: "workspace", currentWorkspaceId: "weixin_stephen" });
  } finally {
    await close(server);
  }
});

test("growth card generation context route is limited to visible targets", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      viewTargets(input) {
        if (input.actorRole === "owner") {
          return {
            ok: true,
            viewer: { role: "owner", canSwitch: true },
            current_workspace_id: input.currentWorkspaceId,
            targets: [
              { workspaceId: "weixin_stephen", label: "Stephen", current: input.currentWorkspaceId === "weixin_stephen" },
              { workspaceId: "weixin_fanfan", label: "凡凡", current: input.currentWorkspaceId === "weixin_fanfan" }
            ]
          };
        }
        return {
          ok: true,
          viewer: { role: "workspace", canSwitch: false },
          current_workspace_id: input.currentWorkspaceId,
          targets: [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningCardGenerationContextService: {
      context(input) {
        calls.push(input);
        return {
          ok: true,
          target: { workspaceId: input.workspaceId, displayName: input.displayName },
          readiness: { ready: true }
        };
      }
    },
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const ownerResponse = await fetch(`${baseUrl}/api/v1/growth/card-generation/context?workspaceId=growth:weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(ownerResponse.status, 200);
    assert.equal((await ownerResponse.json()).target.workspaceId, "weixin_fanfan");
    assert.deepEqual(calls[0], {
      workspaceId: "weixin_fanfan",
      learnerId: "weixin_fanfan",
      displayName: "凡凡",
      label: "凡凡",
      growthWorkspaceId: undefined
    });

    const memberResponse = await fetch(`${baseUrl}/api/v1/growth/card-generation/context?workspaceId=weixin_fanfan`, {
      headers: {
        "x-hermes-plugin-actor-role": "workspace",
        "x-hermes-plugin-workspace-id": "weixin_stephen"
      }
    });
    assert.equal(memberResponse.status, 403);
    assert.equal((await memberResponse.json()).error.code, "growth_target_not_visible");
  } finally {
    await close(server);
  }
});

test("growth read routes fall back to proxy workspace header", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({})
    },
    growthService: {
      async status(input) {
        calls.push({ type: "status", input });
        return { ok: true, workspace_id: input.workspaceId };
      },
      async board(input) {
        calls.push({ type: "board", input });
        return { ok: true, workspace_id: input.workspaceId, cards: [], lanes: [], summary: { total: 0 } };
      }
    }
  });
  const baseUrl = await listen(server);
  try {
    const headers = { "x-hermes-plugin-workspace-id": "weixin_stephen" };
    assert.equal((await fetch(`${baseUrl}/api/v1/growth/status`, { headers })).status, 200);
    assert.equal((await fetch(`${baseUrl}/api/v1/growth/board`, { headers })).status, 200);
    assert.deepEqual(calls, [
      { type: "status", input: { workspaceId: "weixin_stephen" } },
      { type: "board", input: { workspaceId: "weixin_stephen" } }
    ]);
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

test("growth experience signal route requires workspace bearer and delegates service write", async () => {
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
    learningExperienceSignalService: {
      recordSignal(input) {
        calls.push(input);
        return {
          ok: true,
          taskCardId: input.taskCardId,
          signalType: input.signalType,
          targetNodeIds: input.targetNodeIds,
          signals: [{ signalType: input.signalType, targetNodeId: input.targetNodeIds[0] }]
        };
      }
    },
    growthEventService: {},
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/cards/card_1/experience-signals`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspace_id: "growth:test", signalType: "too_hard", targetNodeIds: ["kg_main_idea"] })
    });
    assert.equal(denied.status, 403);

    const accepted = await fetch(`${baseUrl}/api/v1/growth/cards/card_1/experience-signals`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({ workspace_id: "growth:test", signalType: "too_hard", targetNodeIds: ["kg_main_idea"] })
    });
    assert.equal(accepted.status, 202);
    const body = await accepted.json();
    assert.equal(body.ok, true);
    assert.equal(body.signals[0].targetNodeId, "kg_main_idea");
    assert.deepEqual(calls[0], {
      workspace_id: "growth:test",
      signalType: "too_hard",
      targetNodeIds: ["kg_main_idea"],
      workspaceId: "test",
      learnerId: "test",
      taskCardId: "card_1"
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

test("growth evaluation owner-review route is Owner-only and delegates retry", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        if (authorizationToken !== "workspace-key" || workspaceId !== "owner") {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return { ok: true, workspace_id: workspaceId, hermes_workspace_id: "owner" };
      },
      viewTargets(input) {
        return {
          ok: true,
          viewer: { role: input.actorRole },
          targets: [
            { workspaceId: "owner", label: "Owner", current: true },
            { workspaceId: "weixin_fanfan", label: "凡凡", current: false }
          ]
        };
      }
    },
    learningEvaluationOwnerReviewService: {
      retryFailedEvaluation(input) {
        calls.push(input);
        return { ok: true, action: "retry", job: { jobId: "job_1", status: "retry" } };
      }
    },
    growthEventService: {},
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/evaluations/owner-review`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({ workspace_id: "weixin_fanfan", task_card_id: "card_1" })
    });
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).error.code, "growth_evaluation_owner_required");

    const accepted = await fetch(`${baseUrl}/api/v1/growth/evaluations/owner-review`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "owner"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        task_card_id: "card_1",
        reason: "retry after Gateway recovery"
      })
    });
    assert.equal(accepted.status, 202);
    assert.equal((await accepted.json()).job.status, "retry");
    assert.deepEqual(calls[0], {
      workspaceId: "weixin_fanfan",
      taskCardId: "card_1",
      jobId: undefined,
      action: "retry",
      reason: "retry after Gateway recovery",
      reviewedBy: "owner"
    });

    const hidden = await fetch(`${baseUrl}/api/v1/growth/evaluations/owner-review`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "owner"
      },
      body: JSON.stringify({ workspace_id: "weixin_hidden", task_card_id: "card_1" })
    });
    assert.equal(hidden.status, 403);
    assert.equal((await hidden.json()).error.code, "growth_target_not_visible");
    assert.equal(calls.length, 1);
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

test("growth graph plan route requires workspace bearer and normalizes graph input", async () => {
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
    learningGraphPlanService: {
      async createPlan(input) {
        calls.push(input);
        return {
          ok: true,
          learningGraphPlanId: input.learningGraphPlanId,
          workspaceId: input.workspaceId,
          targetNodeId: input.targetNodeId,
          cardSequence: [{ cardRole: input.cardRole, targetNodeIds: input.targetNodeIds }]
        };
      }
    },
    growthEventService: {},
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/graph/plans`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspace_id: "growth:test",
        learning_graph_plan_id: "lgp_1",
        target_node_id: "node_1",
        card_role: "stage_assessment"
      })
    });
    assert.equal(denied.status, 403);

    const accepted = await fetch(`${baseUrl}/api/v1/growth/graph/plans`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        learner_id: "learner_1",
        learning_graph_plan_id: "lgp_1",
        program_id: "program_1",
        target_node_id: "node_1",
        target_node_ids: ["node_1", "node_2"],
        card_role: "stage_assessment",
        assessment_coverage_node_ids: ["node_1", "node_2"],
        difficulty_band: "bridge"
      })
    });
    assert.equal(accepted.status, 201);
    const body = await accepted.json();
    assert.equal(body.learningGraphPlanId, "lgp_1");
    assert.deepEqual(calls[0], {
      learningGraphPlanId: "lgp_1",
      learnerId: "learner_1",
      workspaceId: "test",
      programId: "program_1",
      targetNodeId: "node_1",
      targetNodeIds: ["node_1", "node_2"],
      cardRole: "stage_assessment",
      assessmentCoverageNodeIds: ["node_1", "node_2"],
      difficultyBand: "bridge"
    });
  } finally {
    await close(server);
  }
});

test("growth card graph-binding route requires workspace bearer and binds URL card id", async () => {
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
    learningCardGraphBindingService: {
      async bindCard(input) {
        calls.push(input);
        return {
          ok: input.learningGraphPlanId !== "missing",
          error: input.learningGraphPlanId === "missing" ? "missing_learning_graph_plan" : undefined,
          bindingId: input.bindingId,
          taskCardId: input.taskCardId,
          learningGraphPlanId: input.learningGraphPlanId
        };
      }
    },
    growthEventService: {},
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/cards/card_url/graph-binding`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspace_id: "growth:test",
        learning_graph_plan_id: "lgp_1",
        node_ids: ["node_1"],
        card_role: "practice"
      })
    });
    assert.equal(denied.status, 403);

    const accepted = await fetch(`${baseUrl}/api/v1/growth/cards/card_url/graph-binding`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        binding_id: "lcgb_1",
        task_card_id: "card_body_should_not_win",
        learning_graph_plan_id: "lgp_1",
        node_ids: ["node_1"],
        card_role: "practice",
        assessment_coverage: ["node_1"],
        repair_metadata: { source: "route-test" }
      })
    });
    assert.equal(accepted.status, 201);
    assert.equal((await accepted.json()).taskCardId, "card_url");
    assert.deepEqual(calls[0], {
      bindingId: "lcgb_1",
      taskCardId: "card_url",
      workspaceId: "test",
      learningGraphPlanId: "lgp_1",
      nodeIds: ["node_1"],
      cardRole: "practice",
      assessmentCoverage: ["node_1"],
      repairMetadata: { source: "route-test" }
    });

    const failed = await fetch(`${baseUrl}/api/v1/growth/cards/card_url/graph-binding`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        binding_id: "lcgb_missing",
        learning_graph_plan_id: "missing",
        node_ids: ["node_1"],
        card_role: "practice"
      })
    });
    assert.equal(failed.status, 400);
    assert.equal((await failed.json()).error, "missing_learning_graph_plan");
  } finally {
    await close(server);
  }
});

test("growth card generation route requires workspace bearer and normalizes graph plus authoring input", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        const allowed = authorizationToken === "workspace-key"
          && (workspaceId === "growth:test" || workspaceId === "owner");
        if (!allowed) {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return {
          ok: true,
          workspace_id: workspaceId,
          hermes_workspace_id: workspaceId === "owner" ? "owner" : "test"
        };
      },
      viewTargets(input) {
        return {
          ok: true,
          viewer: { role: input.actorRole === "owner" ? "owner" : "workspace" },
          current_workspace_id: input.currentWorkspaceId,
          targets: input.actorRole === "owner"
            ? [
                { workspaceId: "owner", label: "Owner", current: input.currentWorkspaceId === "owner" },
                { workspaceId: "weixin_fanfan", label: "凡凡", current: false }
              ]
            : [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningCardGenerationService: {
      async generateCard(input) {
        calls.push(input);
        return {
          ok: input.targetNodeId !== "missing",
          error: input.targetNodeId === "missing" ? "missing_target_node" : undefined,
          published: { taskCardId: "generated_1" }
        };
      }
    },
    growthEventService: {},
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/cards/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspace_id: "growth:test",
        target_node_id: "node_1",
        card_role: "teaching"
      })
    });
    assert.equal(denied.status, 403);

    const accepted = await fetch(`${baseUrl}/api/v1/growth/cards/generate`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        learner_id: "learner_1",
        program_id: "program_1",
        recipe_id: "daily_english_v1",
        target_node_id: "node_1",
        card_role: "teaching",
        difficulty_band: "foundation",
        evidence_requirements: ["explain_ratio"],
        card_schema_version: "growth.card.authoring.v1",
        generation_key: "route-generation"
      })
    });
    assert.equal(accepted.status, 201);
    assert.equal((await accepted.json()).published.taskCardId, "generated_1");
    assert.deepEqual(calls[0], {
      learningGraphPlanId: undefined,
      learningGraphPlan: undefined,
      learnerId: "learner_1",
      workspaceId: "test",
      programId: "program_1",
      recipeId: "daily_english_v1",
      targetNodeId: "node_1",
      targetNodeIds: undefined,
      cardRole: "teaching",
      difficultyBand: "foundation",
      assessmentCoverageNodeIds: undefined,
      evidenceRequirements: ["explain_ratio"],
      sourceSummaries: undefined,
      cardSchemaVersion: "growth.card.authoring.v1",
      generationKey: "route-generation",
      taskCardId: undefined,
      stageAssessmentCycleId: undefined,
      activationState: undefined,
      activationReason: undefined,
      activationSource: undefined,
      cooldownUntil: undefined
    });

    const ownerProxyAccepted = await fetch(`${baseUrl}/api/v1/growth/cards/generate`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "owner"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        recipe_id: "daily_english_v1",
        target_node_id: "node_1",
        card_role: "practice"
      })
    });
    assert.equal(ownerProxyAccepted.status, 201);
    assert.equal(calls[1].workspaceId, "weixin_fanfan");
    assert.equal(calls[1].learnerId, "fanfan");
    assert.equal(calls[1].recipeId, "daily_english_v1");

    const failed = await fetch(`${baseUrl}/api/v1/growth/cards/generate`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        target_node_id: "missing",
        card_role: "teaching"
      })
    });
    assert.equal(failed.status, 400);
    assert.equal((await failed.json()).error, "missing_target_node");
  } finally {
    await close(server);
  }
});

test("growth stage assessment routes require workspace authorization and delegate policy to service", async () => {
  const calls = [];
  const server = createServer({
    pluginService: {
      getManifest: () => ({}),
      authorizeWorkspace({ authorizationToken, workspaceId }) {
        const allowed = authorizationToken === "workspace-key"
          && (workspaceId === "growth:test" || workspaceId === "owner");
        if (!allowed) {
          const error = new Error("Invalid workspace credential");
          error.code = "permission_denied";
          error.statusCode = 403;
          error.expose = true;
          throw error;
        }
        return {
          ok: true,
          workspace_id: workspaceId,
          hermes_workspace_id: workspaceId === "owner" ? "owner" : "test"
        };
      },
      viewTargets(input) {
        return {
          ok: true,
          viewer: { role: input.actorRole === "owner" ? "owner" : "workspace" },
          current_workspace_id: input.currentWorkspaceId,
          targets: input.actorRole === "owner"
            ? [
                { workspaceId: "owner", label: "Owner", current: input.currentWorkspaceId === "owner" },
                { workspaceId: "weixin_fanfan", label: "凡凡", current: false }
              ]
            : [{ workspaceId: input.currentWorkspaceId, label: input.currentWorkspaceId, current: true }]
        };
      }
    },
    learningStageAssessmentService: {
      evaluateEligibility(input) {
        calls.push({ type: "eligibility", input });
        return { ok: true, eligible: true, cycle: { cycleId: "cycle_1", status: "eligible" } };
      },
      async activateStageAssessment(input) {
        calls.push({ type: "activate", input });
        return { ok: true, cycle: { cycleId: "cycle_1", status: "active" }, published: { taskCardId: "stage_1" } };
      }
    },
    growthEventService: {},
    growthService: {}
  });
  const baseUrl = await listen(server);
  try {
    const denied = await fetch(`${baseUrl}/api/v1/growth/stage-assessments/eligibility`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspace_id: "growth:test",
        target_node_id: "node_1",
        assessment_coverage_node_ids: ["node_1"]
      })
    });
    assert.equal(denied.status, 403);

    const eligibility = await fetch(`${baseUrl}/api/v1/growth/stage-assessments/eligibility`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        learner_id: "test",
        program_id: "program_1",
        subject_id: "english",
        capability_cluster_id: "reading",
        target_node_id: "node_1",
        assessment_coverage_node_ids: ["node_1", "node_2"]
      })
    });
    assert.equal(eligibility.status, 200);
    assert.deepEqual(calls[0], {
      type: "eligibility",
      input: {
        cycleId: undefined,
        workspaceId: "test",
        learnerId: "test",
        programId: "program_1",
        subjectId: "english",
        capabilityClusterId: "reading",
        targetNodeId: "node_1",
        targetNodeIds: undefined,
        assessmentCoverageNodeIds: ["node_1", "node_2"],
        difficultyBand: undefined,
        evidenceRequirements: undefined,
        sourceSummaries: undefined,
        generationKey: undefined,
        taskCardId: undefined,
        activationSource: undefined,
        activationReason: undefined,
        cooldownUntil: undefined,
        sourceCardIds: undefined,
        note: undefined
      }
    });

    const ownerActivate = await fetch(`${baseUrl}/api/v1/growth/stage-assessments/activate`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json",
        "x-hermes-plugin-actor-role": "owner",
        "x-hermes-plugin-workspace-id": "owner"
      },
      body: JSON.stringify({
        workspace_id: "weixin_fanfan",
        learner_id: "fanfan",
        target_node_id: "node_1",
        assessment_coverage_node_ids: ["node_1"],
        activation_source: "owner_manual"
      })
    });
    assert.equal(ownerActivate.status, 201);
    assert.equal(calls[1].type, "activate");
    assert.equal(calls[1].input.workspaceId, "weixin_fanfan");
    assert.equal(calls[1].input.activationSource, "owner_manual");

    const deniedOwnerManual = await fetch(`${baseUrl}/api/v1/growth/stage-assessments/activate`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        target_node_id: "node_1",
        assessment_coverage_node_ids: ["node_1"],
        activation_source: "owner_manual"
      })
    });
    assert.equal(deniedOwnerManual.status, 403);
    assert.equal((await deniedOwnerManual.json()).error.code, "growth_stage_assessment_owner_required");

    const challengeOther = await fetch(`${baseUrl}/api/v1/growth/stage-assessments/challenge`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        learner_id: "other",
        target_node_id: "node_1",
        assessment_coverage_node_ids: ["node_1"]
      })
    });
    assert.equal(challengeOther.status, 403);
    assert.equal((await challengeOther.json()).error.code, "growth_stage_assessment_challenge_not_visible");

    const challenge = await fetch(`${baseUrl}/api/v1/growth/stage-assessments/challenge`, {
      method: "POST",
      headers: {
        authorization: "Bearer workspace-key",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        workspace_id: "growth:test",
        target_node_id: "node_1",
        assessment_coverage_node_ids: ["node_1"]
      })
    });
    assert.equal(challenge.status, 201);
    assert.equal(calls[2].type, "activate");
    assert.equal(calls[2].input.workspaceId, "test");
    assert.equal(calls[2].input.learnerId, "test");
    assert.equal(calls[2].input.activationSource, "executor_challenge");
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
