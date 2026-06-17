const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const test = require("node:test");
const {
  cloneWithoutWorkspaceSchema,
  growthToolName,
  loadWorkspaceContext,
  toolsList
} = require("../scripts/growth-mcp-wrapper");

function writeText(file, text, mode) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, { encoding: "utf8", mode });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function makeWorkspace(apiBaseUrl) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "growth-mcp-wrapper-"));
  writeText(path.join(root, ".hermes-growth", "config.json"), JSON.stringify({
    schema_version: 1,
    api_base_url: apiBaseUrl,
    workspace_id: "growth:family",
    hermes_workspace_id: "family",
    access_key_file: "access-key.txt"
  }, null, 2));
  writeText(path.join(root, ".hermes-growth", "access-key.txt"), "workspace-secret\n", 0o600);
  return root;
}

function spawnWrapper(workspace, apiBaseUrl) {
  const child = spawn(process.execPath, [
    "scripts/growth-mcp-wrapper.js",
    "--workspace",
    workspace,
    "--api-base-url",
    apiBaseUrl,
    "--no-workspace-override"
  ], {
    cwd: path.resolve(__dirname, ".."),
    stdio: ["pipe", "pipe", "pipe"]
  });
  const lines = [];
  let buffer = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    const parts = buffer.split(/\n/);
    buffer = parts.pop();
    for (const line of parts) {
      if (line.trim()) lines.push(JSON.parse(line));
    }
  });
  return { child, lines };
}

function waitForLine(lines, id) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      const match = lines.find((line) => line.id === id);
      if (match) {
        clearInterval(timer);
        resolve(match);
      } else if (Date.now() - started > 3000) {
        clearInterval(timer);
        reject(new Error(`timeout_waiting_for_${id}`));
      }
    }, 20);
  });
}

test("loads complete workspace-bound Growth MCP context", () => {
  const workspace = makeWorkspace("http://127.0.0.1:4881/");
  const context = loadWorkspaceContext({ workspace, noWorkspaceOverride: true });
  assert.equal(context.workspaceId, "growth:family");
  assert.equal(context.apiBaseUrl, "http://127.0.0.1:4881");
  assert.equal(context.accessKey, "workspace-secret");
});

test("exposes local Gateway tool names without workspace override fields", () => {
  assert.equal(growthToolName("list_cards"), "growth.list_cards");
  assert.equal(growthToolName("mcp_growth_get_card"), "growth.get_card");
  const tool = cloneWithoutWorkspaceSchema({
    name: "growth.get_board",
    input_schema: {
      type: "object",
      properties: { workspace_id: { type: "string" }, other: { type: "string" } },
      required: ["workspace_id"]
    }
  });
  assert.equal(tool.name, "get_board");
  assert.equal(tool.inputSchema.properties.workspace_id, undefined);
  assert.deepEqual(tool.inputSchema.required, []);
  assert.deepEqual(toolsList().map((item) => item.name), [
    "get_status",
    "get_board",
    "list_cards",
    "get_card",
    "reference_object_types",
    "reference_get",
    "reference_summarize"
  ]);
});

test("stdio wrapper calls Growth MCP execute with workspace access key", async () => {
  const calls = [];
  const server = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    calls.push({ url: request.url, authorization: request.headers.authorization, body });
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({
      ok: true,
      content: [{ type: "text", text: JSON.stringify({ workspace_id: body.input.workspace_id, name: body.name }) }]
    }));
  });
  const apiBaseUrl = await listen(server);
  const workspace = makeWorkspace(apiBaseUrl);
  const { child, lines } = spawnWrapper(workspace, apiBaseUrl);
  try {
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }) + "\n");
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }) + "\n");
    child.stdin.write(JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "list_cards", arguments: {} }
    }) + "\n");

    const initialized = await waitForLine(lines, 1);
    assert.equal(initialized.result.serverInfo.name, "growth");
    const listed = await waitForLine(lines, 2);
    assert.deepEqual(listed.result.tools.map((tool) => tool.name), [
      "get_status",
      "get_board",
      "list_cards",
      "get_card",
      "reference_object_types",
      "reference_get",
      "reference_summarize"
    ]);
    assert.equal(listed.result.tools.some((tool) => JSON.stringify(tool).includes("workspace_id")), false);
    const called = await waitForLine(lines, 3);
    const content = JSON.parse(called.result.content[0].text);
    assert.equal(content.workspace_id, "growth:family");
    assert.equal(content.name, "growth.list_cards");
    assert.equal(calls[0].authorization, "Bearer workspace-secret");
    assert.equal(calls[0].body.workspace_id, "growth:family");
    assert.equal(calls[0].body.input.workspace_id, "growth:family");
  } finally {
    child.kill("SIGTERM");
    await close(server);
  }
});

test("stdio wrapper rejects model-provided workspace overrides", async () => {
  const server = http.createServer((_request, response) => {
    response.writeHead(500, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: false }));
  });
  const apiBaseUrl = await listen(server);
  const workspace = makeWorkspace(apiBaseUrl);
  const { child, lines } = spawnWrapper(workspace, apiBaseUrl);
  try {
    child.stdin.write(JSON.stringify({
      jsonrpc: "2.0",
      id: 9,
      method: "tools/call",
      params: { name: "get_status", arguments: { workspace_id: "growth:other" } }
    }) + "\n");
    const response = await waitForLine(lines, 9);
    assert.equal(response.error.message, "growth_mcp_workspace_override_forbidden");
  } finally {
    child.kill("SIGTERM");
    await close(server);
  }
});
