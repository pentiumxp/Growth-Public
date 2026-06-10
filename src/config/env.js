const fs = require("node:fs");
const path = require("node:path");

function readEnv(env = process.env) {
  const dataDir = env.GROWTH_DATA_DIR || path.join(process.cwd(), "data");
  return {
    port: Number(env.GROWTH_PORT || 4881),
    dataDir,
    workspaceStorePath: env.GROWTH_WORKSPACE_STORE_PATH || path.join(dataDir, "workspaces.json"),
    registrationKey: env.GROWTH_REGISTRATION_KEY || readSecretFile(env.GROWTH_REGISTRATION_KEY_PATH),
    launchTokenTtlMs: Number(env.GROWTH_LAUNCH_TOKEN_TTL_MS || 10 * 60 * 1000)
  };
}

function readSecretFile(filePath) {
  if (!filePath) return "";
  return fs.readFileSync(filePath, "utf8").trim();
}

module.exports = { readEnv };
