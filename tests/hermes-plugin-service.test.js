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

test("lists switchable Growth targets for owner only", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-plugin-test-"));
  const store = createJsonWorkspaceStore({ filePath: path.join(dir, "workspaces.json") });
  const service = createHermesPluginService({
    config: {
      registrationKey: "registration-key",
      launchTokenTtlMs: 60000
    },
    workspaceStore: store
  });

  service.provisionWorkspace({
    authorizationToken: "registration-key",
    body: {
      workspace_id: "weixin_stephen",
      access_key_hash: sha256("stephen-key"),
      display_name: "Stephen"
    }
  });
  service.provisionWorkspace({
    authorizationToken: "registration-key",
    body: {
      workspace_id: "weixin_wuping",
      access_key_hash: sha256("wuping-key"),
      display_name: "吴萍"
    }
  });

  const ownerTargets = service.viewTargets({ actorRole: "owner", currentWorkspaceId: "weixin_stephen" });
  assert.equal(ownerTargets.viewer.role, "owner");
  assert.equal(ownerTargets.viewer.canSwitch, true);
  assert.deepEqual(ownerTargets.targets.map((target) => target.workspaceId).sort(), ["weixin_stephen", "weixin_wuping"]);

  const memberTargets = service.viewTargets({ actorRole: "workspace", currentWorkspaceId: "weixin_stephen" });
  assert.equal(memberTargets.viewer.role, "workspace");
  assert.equal(memberTargets.viewer.canSwitch, false);
  assert.deepEqual(memberTargets.targets.map((target) => target.workspaceId), ["weixin_stephen"]);
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

test("authorizes workspace-scoped MCP access with workspace access key", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "growth-plugin-test-"));
  const store = createJsonWorkspaceStore({ filePath: path.join(dir, "workspaces.json") });
  const service = createHermesPluginService({
    config: {
      registrationKey: "registration-key",
      launchTokenTtlMs: 60000
    },
    workspaceStore: store
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
    service.authorizeWorkspace({
      authorizationToken: "registration-key",
      workspaceId: "family"
    });
  }, /Invalid workspace credential/);

  const authorized = service.authorizeWorkspace({
    authorizationToken: "workspace-access-key",
    workspaceId: "family"
  });
  assert.equal(authorized.ok, true);
  assert.equal(authorized.workspace_id, "growth:family");
  assert.equal(authorized.hermes_workspace_id, "family");
});
