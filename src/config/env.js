const fs = require("node:fs");
const path = require("node:path");

function readEnv(env = process.env) {
  const dataDir = env.GROWTH_DATA_DIR || path.join(process.cwd(), "data");
  return {
    port: Number(env.GROWTH_PORT || 4881),
    dataDir,
    workspaceStorePath: env.GROWTH_WORKSPACE_STORE_PATH || path.join(dataDir, "workspaces.json"),
    snapshotStorePath: env.GROWTH_SNAPSHOT_STORE_PATH || path.join(dataDir, "growth-snapshots.json"),
    eventOutboxStorePath: env.GROWTH_EVENT_OUTBOX_STORE_PATH || path.join(dataDir, "growth-event-outbox.json"),
    learningDbPath: env.GROWTH_LEARNING_DB_PATH || path.join(dataDir, "growth-learning.sqlite3"),
    dataOwner: env.GROWTH_DATA_OWNER || "home-ai",
    registrationKey: env.GROWTH_REGISTRATION_KEY || readSecretFile(env.GROWTH_REGISTRATION_KEY_PATH),
    homeAiApiBaseUrl: env.GROWTH_HOME_AI_API_BASE_URL || env.HOME_AI_API_BASE_URL || env.HERMES_MOBILE_API_BASE_URL || "",
    homeAiAccessKey: env.GROWTH_HOME_AI_ACCESS_KEY || env.HOME_AI_ACCESS_KEY || readSecretFile(env.GROWTH_HOME_AI_ACCESS_KEY_PATH || env.HOME_AI_ACCESS_KEY_PATH),
    launchTokenTtlMs: Number(env.GROWTH_LAUNCH_TOKEN_TTL_MS || 10 * 60 * 1000),
    migrationMaxCards: Number(env.GROWTH_MIGRATION_MAX_CARDS || 50)
  };
}

function readSecretFile(filePath) {
  if (!filePath) return "";
  return fs.readFileSync(filePath, "utf8").trim();
}

module.exports = { readEnv };
