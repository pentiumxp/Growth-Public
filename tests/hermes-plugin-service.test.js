const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createHermesPluginService } = require("../src/services/hermes-plugin-service");
const { createJsonWorkspaceStore } = require("../src/stores/json-workspace-store");

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

test("provisions canonical growth workspaces without storing raw keys", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-plugin-test-"));
  const store = createJsonWorkspaceStore({ filePath: path.join(dir, "workspaces.json") });
  const service = createHermesPluginService({
    config: {
      registrationKey: "registration-key",
      launchTokenTtlMs: 60000
    },
    workspaceStore: store,
    clock: () => 1000
  });

  const result = service.provisionWorkspace({
    authorizationToken: "registration-key",
    body: {
      workspace_id: "family",
      access_key_hash: sha256("workspace-access-key"),
      display_name: "Family Growth"
    }
  });

  assert.equal(result.workspace_id, "growth:family");
  const persisted = fs.readFileSync(path.join(dir, "workspaces.json"), "utf8");
  assert.match(persisted, new RegExp(sha256("workspace-access-key")));
  assert.doesNotMatch(persisted, /workspace-access-key/);
});

test("fails closed when registration key is missing", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-plugin-test-"));
  const store = createJsonWorkspaceStore({ filePath: path.join(dir, "workspaces.json") });
  const service = createHermesPluginService({
    config: {
      registrationKey: "",
      launchTokenTtlMs: 60000
    },
    workspaceStore: store
  });

  assert.throws(() => {
    service.provisionWorkspace({
      authorizationToken: "",
      body: {
        workspace_id: "family",
        access_key_hash: sha256("workspace-access-key")
      }
    });
  }, /not configured/);
});

test("launches with the workspace access key rather than the registration key", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-plugin-test-"));
  const store = createJsonWorkspaceStore({ filePath: path.join(dir, "workspaces.json") });
  const service = createHermesPluginService({
    config: {
      registrationKey: "registration-key",
      launchTokenTtlMs: 60000
    },
    workspaceStore: store,
    clock: () => 1000
  });

  service.provisionWorkspace({
    authorizationToken: "registration-key",
    body: {
      workspace_id: "family",
      access_key_hash: sha256("workspace-access-key"),
      display_name: "Family Growth"
    }
  });

  assert.throws(() => {
    service.launchWorkspace({
      authorizationToken: "registration-key",
      body: { workspace_id: "family" }
    });
  }, /Invalid workspace credential/);

  const launched = service.launchWorkspace({
    authorizationToken: "workspace-access-key",
    body: { workspace_id: "family" }
  });
  assert.equal(launched.ok, true);
  assert.equal(launched.workspace_id, "growth:family");
  assert.match(launched.entry_url, /^\/\?embed=hermes&launch=/);
  assert.equal(launched.expires_in_ms, 60000);
});
