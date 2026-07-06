"use strict";

const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const repoRoot = path.join(__dirname, "..");
const viteBin = path.join(repoRoot, "node_modules", "vite", "bin", "vite.js");

function fail(code, message, extra = {}) {
  return {
    ok: false,
    code,
    message,
    ...extra
  };
}

function validateGrowthViteDevServerResponses({ indexHtml = "", entryJs = "" } = {}) {
  const failures = [];
  const evidence = [];

  if (!indexHtml.includes('id="growth-vite-root"')) {
    failures.push("growth_vite_dev_root_missing");
  } else {
    evidence.push("growth_vite_dev_root_present");
  }

  if (!/<script[^>]+type=["']module["'][^>]+src=["']\/src\/main\.js["']/i.test(indexHtml)) {
    failures.push("growth_vite_dev_module_entry_missing");
  } else {
    evidence.push("growth_vite_dev_module_entry_present");
  }

  if (!entryJs.includes("createGrowthViteEntry")) {
    failures.push("growth_vite_entry_factory_missing");
  } else {
    evidence.push("growth_vite_entry_factory_present");
  }

  if (!entryJs.includes("createGrowthApp") || !entryJs.includes("createGrowthRuntimeAdapter")) {
    failures.push("growth_vite_entry_runtime_wiring_missing");
  } else {
    evidence.push("growth_vite_entry_runtime_wiring_present");
  }

  if (failures.length) {
    return fail("growth_vite_dev_server_response_invalid", "Growth Vite dev server responses are missing required shell markers", {
      failures,
      evidence
    });
  }

  return {
    ok: true,
    evidence
  };
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

async function fetchText(url, timeoutMs = 1500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function waitForServer(baseUrl, timeoutMs = 10000) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      await fetchText(baseUrl, 1000);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw lastError || new Error(`Timed out waiting for ${baseUrl}`);
}

function stopChild(child) {
  if (!child || child.killed) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (!child.killed) child.kill("SIGKILL");
      resolve();
    }, 1500);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill("SIGTERM");
  });
}

async function smokeGrowthViteDevServer({ port, timeoutMs = 10000 } = {}) {
  const selectedPort = port || await reservePort();
  const child = spawn(process.execPath, [
    viteBin,
    "--host",
    "127.0.0.1",
    "--port",
    String(selectedPort),
    "--strictPort"
  ], {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  try {
    const baseUrl = `http://127.0.0.1:${selectedPort}/`;
    await waitForServer(baseUrl, timeoutMs);
    const indexHtml = await fetchText(baseUrl);
    const entryJs = await fetchText(`${baseUrl}src/main.js`);
    const validation = validateGrowthViteDevServerResponses({ indexHtml, entryJs });
    if (!validation.ok) {
      return {
        ...validation,
        port: selectedPort
      };
    }
    return {
      ok: true,
      port: selectedPort,
      indexBytes: Buffer.byteLength(indexHtml),
      entryBytes: Buffer.byteLength(entryJs),
      evidence: validation.evidence
    };
  } catch (error) {
    return fail("growth_vite_dev_server_smoke_failed", error.message, {
      port: selectedPort,
      output: output.slice(-2000)
    });
  } finally {
    await stopChild(child);
  }
}

if (require.main === module) {
  smokeGrowthViteDevServer().then((result) => {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.ok) process.exit(1);
  }).catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exit(1);
  });
}

module.exports = {
  smokeGrowthViteDevServer,
  validateGrowthViteDevServerResponses
};
