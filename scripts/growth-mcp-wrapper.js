#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const { listGrowthMcpSchemas } = require("../src/mcp/growth-mcp-schemas");

const protocolVersion = "2024-11-05";

function parseArgs(argv = process.argv.slice(2)) {
  const out = { noWorkspaceOverride: false, selfTestToolsList: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--workspace") out.workspace = argv[++index];
    else if (arg === "--api-base-url") out.apiBaseUrl = argv[++index];
    else if (arg === "--no-workspace-override") out.noWorkspaceOverride = true;
    else if (arg === "--self-test-tools-list" || arg === "--list-tools") out.selfTestToolsList = true;
    else if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`growth_mcp_unknown_arg:${arg}`);
    }
  }
  return out;
}

function printHelp() {
  process.stdout.write([
    "Usage: node scripts/growth-mcp-wrapper.js --workspace <workspace-root> [options]",
    "",
    "Options:",
    "  --api-base-url <url>       Override Growth API base URL.",
    "  --no-workspace-override   Required for Gateway profile registration.",
    "  --self-test-tools-list     Print bounded tool names and exit.",
  ].join("\n") + "\n");
}

function loadWorkspaceContext(args = {}) {
  if (!args.workspace) throw new Error("growth_mcp_workspace_required");
  if (!args.noWorkspaceOverride) throw new Error("growth_mcp_no_workspace_override_required");
  const configDir = path.join(args.workspace, ".hermes-growth");
  const configPath = path.join(configDir, "config.json");
  if (!fs.existsSync(configPath)) throw new Error("growth_mcp_config_missing");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const keyFile = String(config.access_key_file || config.accessKeyFile || "access-key.txt").trim();
  if (!keyFile || path.basename(keyFile) !== keyFile) throw new Error("growth_mcp_key_file_invalid");
  const keyPath = path.join(configDir, keyFile);
  if (!fs.existsSync(keyPath)) throw new Error("growth_mcp_key_missing");
  const accessKey = fs.readFileSync(keyPath, "utf8").trim();
  const workspaceId = String(config.workspace_id || config.workspaceId || "").trim();
  const apiBaseUrl = String(args.apiBaseUrl || config.api_base_url || config.base_url || "http://127.0.0.1:4881").trim().replace(/\/+$/, "");
  if (!accessKey) throw new Error("growth_mcp_key_empty");
  if (!workspaceId.startsWith("growth:")) throw new Error("growth_mcp_workspace_invalid");
  if (!apiBaseUrl) throw new Error("growth_mcp_api_base_url_missing");
  return { accessKey, apiBaseUrl, workspaceId };
}

function localToolName(name) {
  return String(name || "").replace(/^growth\./, "").replace(/\./g, "_");
}

function growthToolName(name) {
  const clean = String(name || "");
  return clean.startsWith("growth.") ? clean : `growth.${clean.replace(/^mcp_growth_/, "")}`;
}

function cloneWithoutWorkspaceSchema(schema = {}) {
  const copy = JSON.parse(JSON.stringify(schema));
  copy.name = localToolName(copy.name);
  copy.inputSchema = copy.input_schema || copy.inputSchema || { type: "object", properties: {} };
  delete copy.input_schema;
  if (copy.inputSchema && copy.inputSchema.properties) {
    delete copy.inputSchema.properties.workspace_id;
    delete copy.inputSchema.properties.workspaceId;
  }
  if (Array.isArray(copy.inputSchema?.required)) {
    copy.inputSchema.required = copy.inputSchema.required.filter((item) => item !== "workspace_id" && item !== "workspaceId");
  }
  return copy;
}

function toolsList() {
  return listGrowthMcpSchemas().map(cloneWithoutWorkspaceSchema);
}

function rejectWorkspaceOverride(args = {}) {
  if (Object.prototype.hasOwnProperty.call(args, "workspace_id") || Object.prototype.hasOwnProperty.call(args, "workspaceId")) {
    throw new Error("growth_mcp_workspace_override_forbidden");
  }
}

function boundedError(error) {
  const raw = String(error?.message || error || "growth_mcp_error");
  if (/token|cookie|secret|password|access.?key|authorization/i.test(raw)) return "growth_mcp_error";
  return raw.replace(/\s+/g, " ").slice(0, 160) || "growth_mcp_error";
}

async function callGrowthTool(context, name, args = {}) {
  rejectWorkspaceOverride(args);
  const response = await fetch(`${context.apiBaseUrl}/api/v1/growth/mcp/execute`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${context.accessKey}`,
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      name: growthToolName(name),
      workspace_id: context.workspaceId,
      input: Object.assign({}, args, { workspace_id: context.workspaceId })
    })
  });
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch (_) {
    throw new Error("growth_mcp_invalid_response");
  }
  if (!response.ok || payload.ok === false) {
    const code = payload.error?.code || payload.error || `growth_mcp_http_${response.status}`;
    throw new Error(String(code));
  }
  return payload;
}

async function handleRpc(context, request) {
  const method = request.method || "";
  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo: { name: "growth", version: "0.1.0" }
      }
    };
  }
  if (method === "notifications/initialized") return null;
  if (method === "tools/list") return { jsonrpc: "2.0", id: request.id, result: { tools: toolsList() } };
  if (method === "tools/call") {
    const params = request.params || {};
    const result = await callGrowthTool(context, params.name, params.arguments || {});
    return { jsonrpc: "2.0", id: request.id, result: { content: result.content || [{ type: "text", text: JSON.stringify(result) }] } };
  }
  if (method === "ping") return { jsonrpc: "2.0", id: request.id, result: {} };
  return { jsonrpc: "2.0", id: request.id, error: { code: -32601, message: "method_not_found" } };
}

async function runStdio(context) {
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let request;
    try {
      request = JSON.parse(line);
      if (request.id === undefined) continue;
      const response = await handleRpc(context, request);
      if (response) process.stdout.write(JSON.stringify(response) + "\n");
    } catch (error) {
      const id = request && request.id !== undefined ? request.id : null;
      if (id !== null) {
        process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32000, message: boundedError(error) } }) + "\n");
      }
    }
  }
}

async function main() {
  const args = parseArgs();
  const context = loadWorkspaceContext(args);
  if (args.selfTestToolsList) {
    process.stdout.write(JSON.stringify({ tools: toolsList().map((tool) => tool.name) }) + "\n");
    return;
  }
  await runStdio(context);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${boundedError(error)}\n`);
    process.exitCode = 2;
  });
}

module.exports = {
  callGrowthTool,
  cloneWithoutWorkspaceSchema,
  growthToolName,
  loadWorkspaceContext,
  localToolName,
  parseArgs,
  toolsList
};
