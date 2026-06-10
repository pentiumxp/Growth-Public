const assert = require("node:assert/strict");
const test = require("node:test");
const { createServer } = require("../src/app/http-server");

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
