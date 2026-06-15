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
    automationWritefulExecutionEnabled: ["1", "true", "yes", "on"].includes(String(env.GROWTH_AUTOMATION_WRITEFUL_EXECUTION_ENABLED || "").trim().toLowerCase()),
    automationBackgroundSchedulerEnabled: ["1", "true", "yes", "on"].includes(String(env.GROWTH_AUTOMATION_BACKGROUND_SCHEDULER_ENABLED || "").trim().toLowerCase()),
    automationBackgroundWorkerEnabled: ["1", "true", "yes", "on"].includes(String(env.GROWTH_AUTOMATION_BACKGROUND_WORKER_ENABLED || "").trim().toLowerCase()),
    automationBackgroundWorkerId: env.GROWTH_AUTOMATION_BACKGROUND_WORKER_ID || `growth-automation-scheduler-worker-${process.pid}`,
    automationBackgroundWorkerIntervalMs: Math.max(5000, Number(env.GROWTH_AUTOMATION_BACKGROUND_WORKER_INTERVAL_MS || 60000) || 60000),
    automationBackgroundWorkerLeaseMs: Math.max(5000, Number(env.GROWTH_AUTOMATION_BACKGROUND_WORKER_LEASE_MS || 10 * 60 * 1000) || 10 * 60 * 1000),
    automationBackgroundWorkerTargets: parseJsonArray(env.GROWTH_AUTOMATION_BACKGROUND_WORKER_TARGETS_JSON),
    evaluationWorkerEnabled: ["1", "true", "yes", "on"].includes(String(env.GROWTH_EVALUATION_WORKER_ENABLED || "").trim().toLowerCase()),
    evaluationWorkerIntervalMs: Math.max(5000, Number(env.GROWTH_EVALUATION_WORKER_INTERVAL_MS || 30000) || 30000),
    registrationKey: env.GROWTH_REGISTRATION_KEY || readSecretFile(env.GROWTH_REGISTRATION_KEY_PATH),
    homeAiApiBaseUrl: env.GROWTH_HOME_AI_API_BASE_URL || env.HOME_AI_API_BASE_URL || env.HERMES_MOBILE_API_BASE_URL || "",
    homeAiAccessKey: env.GROWTH_HOME_AI_ACCESS_KEY || env.HOME_AI_ACCESS_KEY || readSecretFile(env.GROWTH_HOME_AI_ACCESS_KEY_PATH || env.HOME_AI_ACCESS_KEY_PATH),
    gatewayAuthoringEndpoint: env.GROWTH_GATEWAY_AUTHORING_ENDPOINT || env.HERMES_GATEWAY_AUTHORING_ENDPOINT || env.HOME_AI_GATEWAY_AUTHORING_ENDPOINT || "",
    gatewayAuthoringAccessToken: env.GROWTH_GATEWAY_AUTHORING_ACCESS_TOKEN || env.HERMES_GATEWAY_ACCESS_TOKEN || readSecretFile(env.GROWTH_GATEWAY_AUTHORING_ACCESS_TOKEN_PATH || env.HERMES_GATEWAY_ACCESS_TOKEN_PATH),
    gatewayAuthoringProtocol: env.GROWTH_GATEWAY_AUTHORING_PROTOCOL || env.HERMES_GATEWAY_AUTHORING_PROTOCOL || "",
    gatewayAuthoringModel: env.GROWTH_GATEWAY_AUTHORING_MODEL || env.LEARNING_GROWTH_JIT_MODEL || env.HERMES_GATEWAY_AUTHORING_MODEL || "",
    gatewayAuthoringStream: ["1", "true", "yes", "on"].includes(String(env.GROWTH_GATEWAY_AUTHORING_STREAM || "").trim().toLowerCase()),
    gatewayAuthoringTimeoutMs: Math.max(1000, Number(env.GROWTH_GATEWAY_AUTHORING_TIMEOUT_MS || 60000) || 60000),
    gatewayPlannerEndpoint: env.GROWTH_GATEWAY_PLANNER_ENDPOINT || env.GROWTH_GATEWAY_AUTHORING_ENDPOINT || env.HERMES_GATEWAY_AUTHORING_ENDPOINT || env.HOME_AI_GATEWAY_AUTHORING_ENDPOINT || "",
    gatewayPlannerAccessToken: env.GROWTH_GATEWAY_PLANNER_ACCESS_TOKEN || env.GROWTH_GATEWAY_AUTHORING_ACCESS_TOKEN || env.HERMES_GATEWAY_ACCESS_TOKEN || readSecretFile(env.GROWTH_GATEWAY_PLANNER_ACCESS_TOKEN_PATH || env.GROWTH_GATEWAY_AUTHORING_ACCESS_TOKEN_PATH || env.HERMES_GATEWAY_ACCESS_TOKEN_PATH),
    gatewayPlannerProtocol: env.GROWTH_GATEWAY_PLANNER_PROTOCOL || env.GROWTH_GATEWAY_AUTHORING_PROTOCOL || env.HERMES_GATEWAY_AUTHORING_PROTOCOL || "",
    gatewayPlannerModel: env.GROWTH_GATEWAY_PLANNER_MODEL || env.GROWTH_GATEWAY_AUTHORING_MODEL || env.LEARNING_GROWTH_JIT_MODEL || env.HERMES_GATEWAY_AUTHORING_MODEL || "",
    gatewayPlannerStream: ["1", "true", "yes", "on"].includes(String(env.GROWTH_GATEWAY_PLANNER_STREAM || env.GROWTH_GATEWAY_AUTHORING_STREAM || "").trim().toLowerCase()),
    gatewayPlannerTimeoutMs: Math.max(1000, Number(env.GROWTH_GATEWAY_PLANNER_TIMEOUT_MS || env.GROWTH_GATEWAY_AUTHORING_TIMEOUT_MS || 60000) || 60000),
    gatewayEvaluationEndpoint: env.GROWTH_GATEWAY_EVALUATION_ENDPOINT || env.HERMES_GATEWAY_EVALUATION_ENDPOINT || env.HOME_AI_GATEWAY_EVALUATION_ENDPOINT || "",
    gatewayEvaluationAccessToken: env.GROWTH_GATEWAY_EVALUATION_ACCESS_TOKEN || env.HERMES_GATEWAY_ACCESS_TOKEN || readSecretFile(env.GROWTH_GATEWAY_EVALUATION_ACCESS_TOKEN_PATH || env.HERMES_GATEWAY_ACCESS_TOKEN_PATH),
    gatewayEvaluationProtocol: env.GROWTH_GATEWAY_EVALUATION_PROTOCOL || env.HERMES_GATEWAY_EVALUATION_PROTOCOL || "",
    gatewayEvaluationModel: env.GROWTH_GATEWAY_EVALUATION_MODEL || env.LEARNING_GROWTH_EVALUATION_MODEL || env.HERMES_GATEWAY_EVALUATION_MODEL || "",
    gatewayEvaluationStream: ["1", "true", "yes", "on"].includes(String(env.GROWTH_GATEWAY_EVALUATION_STREAM || "").trim().toLowerCase()),
    gatewayEvaluationTimeoutMs: Math.max(1000, Number(env.GROWTH_GATEWAY_EVALUATION_TIMEOUT_MS || 60000) || 60000),
    legacyAudioRoots: (env.GROWTH_LEGACY_AUDIO_ROOTS || "")
      .split(path.delimiter)
      .map((entry) => entry.trim())
      .filter(Boolean),
    launchTokenTtlMs: Number(env.GROWTH_LAUNCH_TOKEN_TTL_MS || 10 * 60 * 1000),
    migrationMaxCards: Number(env.GROWTH_MIGRATION_MAX_CARDS || 50)
  };
}

function parseJsonArray(text) {
  const value = String(text || "").trim();
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function readSecretFile(filePath) {
  if (!filePath) return "";
  return fs.readFileSync(filePath, "utf8").trim();
}

module.exports = { readEnv };
