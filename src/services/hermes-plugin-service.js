const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { routeError } = require("../routes/http-utils");

function createHermesPluginService({ config, workspaceStore, clock = () => Date.now() }) {
  const manifestPath = path.join(process.cwd(), "hermes-plugin", "manifest.json");
  const launchTokens = new Map();

  function getManifest() {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  }

  function requireRegistrationKey(token) {
    if (!config.registrationKey) {
      throw routeError("registration_key_not_configured", "Growth registration key is not configured", 503);
    }
    if (!token || token !== config.registrationKey) {
      throw routeError("permission_denied", "Invalid registration credential", 403);
    }
  }

  function hashAccessKey(value) {
    return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
  }

  function timingSafeEquals(left, right) {
    const a = Buffer.from(String(left || ""), "utf8");
    const b = Buffer.from(String(right || ""), "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  function normalizeStoredAccessKeyHash(value) {
    return String(value || "").trim().replace(/^sha256:/i, "").toLowerCase();
  }

  function requireWorkspaceAccessKey(workspace, token) {
    const expectedHash = normalizeStoredAccessKeyHash(workspace?.access_key_hash);
    if (!expectedHash) {
      throw routeError("workspace_access_key_missing", "Growth workspace access key is not configured", 403);
    }
    const actualHash = hashAccessKey(token);
    if (!token || !timingSafeEquals(actualHash, expectedHash)) {
      throw routeError("permission_denied", "Invalid workspace credential", 403);
    }
  }

  function canonicalWorkspaceId(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      throw routeError("workspace_id_required", "workspace_id is required", 400);
    }
    return raw.startsWith("growth:") ? raw : `growth:${raw}`;
  }

  return {
    getManifest,

    authorizeRegistration({ authorizationToken }) {
      requireRegistrationKey(authorizationToken);
      return { ok: true };
    },

    provisionWorkspace({ authorizationToken, body }) {
      requireRegistrationKey(authorizationToken);
      const hermesWorkspaceId = String(
        body.hermes_workspace_id || body.target_workspace_id || body.workspace_id || ""
      ).replace(/^growth:/, "");
      const workspaceId = canonicalWorkspaceId(hermesWorkspaceId);
      const accessKeyHash = String(body.access_key_hash || "").trim();
      if (!accessKeyHash) {
        throw routeError("access_key_hash_required", "access_key_hash is required", 400);
      }
      const now = new Date(clock()).toISOString();
      const workspace = workspaceStore.upsert({
        workspace_id: workspaceId,
        hermes_workspace_id: hermesWorkspaceId,
        display_name: String(body.display_name || "Growth"),
        access_key_hash: accessKeyHash,
        scopes: Array.isArray(body.scopes) ? body.scopes : ["growth:read", "growth:write"],
        updated_at: now,
        created_at: workspaceStore.get(workspaceId)?.created_at || now
      });
      return {
        ok: true,
        workspace_id: workspace.workspace_id,
        hermes_workspace_id: workspace.hermes_workspace_id,
        scopes: workspace.scopes
      };
    },

    launchWorkspace({ authorizationToken, body }) {
      const workspaceId = canonicalWorkspaceId(body.workspace_id || body.hermes_workspace_id);
      const workspace = workspaceStore.get(workspaceId);
      if (!workspace) {
        throw routeError("workspace_not_found", "Growth workspace is not provisioned", 404);
      }
      requireWorkspaceAccessKey(workspace, authorizationToken);
      const token = crypto.randomBytes(24).toString("base64url");
      launchTokens.set(token, {
        workspace_id: workspace.workspace_id,
        expires_at: clock() + config.launchTokenTtlMs
      });
      return {
        ok: true,
        workspace_id: workspace.workspace_id,
        launch_token: token,
        expires_in_ms: config.launchTokenTtlMs,
        entry_url: `/?embed=hermes&launch=${encodeURIComponent(token)}`
      };
    },

    verifyLaunchToken(token) {
      const record = launchTokens.get(String(token || ""));
      if (!record || record.expires_at < clock()) {
        throw routeError("invalid_launch_token", "Invalid or expired launch token", 403);
      }
      return record;
    },

    listWorkspaces() {
      return workspaceStore.list().map((workspace) => ({
        workspace_id: workspace.workspace_id,
        hermes_workspace_id: workspace.hermes_workspace_id,
        display_name: workspace.display_name,
        scopes: workspace.scopes,
        updated_at: workspace.updated_at
      }));
    }
  };
}

module.exports = { createHermesPluginService };
