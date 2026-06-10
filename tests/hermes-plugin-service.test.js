const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createHermesPluginService } = require("../src/services/hermes-plugin-service");
const { createJsonWorkspaceStore } = require("../src/stores/json-workspace-store");

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
      access_key_hash: "sha256:abc",
      display_name: "Family Growth"
    }
  });

  assert.equal(result.workspace_id, "growth:family");
  const persisted = fs.readFileSync(path.join(dir, "workspaces.json"), "utf8");
  assert.match(persisted, /sha256:abc/);
  assert.doesNotMatch(persisted, /access-key-raw/);
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
        access_key_hash: "sha256:abc"
      }
    });
  }, /not configured/);
});
