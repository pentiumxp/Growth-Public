"use strict";

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.join(__dirname, "..");

const expectedLegacyScripts = Object.freeze([
  "/growth-legacy-coins-ui.js",
  "/growth-legacy-program-ui.js",
  "/growth-legacy-task-ui.js",
  "/growth-legacy-ui.js",
  "/growth-appearance.js",
  "/growth-api-client.js",
  "/growth-view-model.js",
  "/growth-route-controller.js",
  "/growth-card-generation-ui.js",
  "/growth-card-interaction-controller.js",
  "/growth-navigation-controller.js",
  "/app.js"
]);

const expectedViteLoader = "/growth-vite-bootstrap-loader.js";

function readRelative(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function scriptTags(html = "") {
  return Array.from(html.matchAll(/<script\b([^>]*)><\/script>/gi)).map((match) => {
    const attrs = match[1] || "";
    const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    const typeMatch = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i);
    return {
      tag: match[0],
      attrs,
      src: srcMatch ? srcMatch[1] : "",
      srcPath: srcMatch ? srcMatch[1].split("?")[0] : "",
      type: typeMatch ? typeMatch[1] : ""
    };
  });
}

function fail(code, message, extra = {}) {
  return {
    ok: false,
    code,
    message,
    ...extra
  };
}

function checkGrowthViteRuntimeBoundary() {
  const indexHtml = readRelative("public/index.html");
  const scripts = scriptTags(indexHtml);
  const scriptPaths = scripts.map((script) => script.srcPath);
  const moduleScripts = scripts.filter((script) => script.type.toLowerCase() === "module");
  const viteAssetScripts = scripts.filter((script) => /^\/?(?:public\/)?assets\/growth\/growth\.[A-Za-z0-9_-]+\.js$/.test(script.srcPath));
  const loaderIndex = scriptPaths.indexOf(expectedViteLoader);
  const legacyScriptPaths = scriptPaths.filter((srcPath) => expectedLegacyScripts.includes(srcPath));
  const unknownScripts = scriptPaths.filter((srcPath) => srcPath && !expectedLegacyScripts.includes(srcPath) && srcPath !== expectedViteLoader);
  const missingLegacyScripts = expectedLegacyScripts.filter((srcPath) => !scriptPaths.includes(srcPath));
  const duplicateScripts = scriptPaths.filter((srcPath, index) => srcPath && scriptPaths.indexOf(srcPath) !== index);

  if (!indexHtml.includes('id="growth-root"')) {
    return fail("growth_root_missing", "public/index.html is missing the legacy Growth root");
  }
  if (/data-growth-vite-runtime\s*=\s*["']enabled["']/.test(indexHtml)) {
    return fail("growth_vite_runtime_enabled_before_owner_cutover", "Growth Vite runtime opt-in is enabled before Owner cutover approval");
  }
  if (moduleScripts.length) {
    return fail("growth_vite_module_script_loaded_before_cutover", "public/index.html loads module scripts before Owner cutover approval", {
      moduleScripts: moduleScripts.map((script) => script.src || script.tag)
    });
  }
  if (viteAssetScripts.length) {
    return fail("growth_vite_hashed_asset_loaded_before_cutover", "public/index.html directly loads a Vite hashed asset before cutover", {
      viteAssetScripts: viteAssetScripts.map((script) => script.src)
    });
  }
  if (missingLegacyScripts.length) {
    return fail("growth_legacy_runtime_script_missing", "public/index.html is missing legacy runtime scripts before cutover", {
      missingLegacyScripts
    });
  }
  if (unknownScripts.length) {
    return fail("growth_runtime_unknown_script_present", "public/index.html loads unexpected scripts", {
      unknownScripts
    });
  }
  if (duplicateScripts.length) {
    return fail("growth_runtime_duplicate_script_present", "public/index.html loads duplicate scripts", {
      duplicateScripts
    });
  }
  if (legacyScriptPaths.join("\n") !== expectedLegacyScripts.join("\n")) {
    return fail("growth_legacy_runtime_script_order_changed", "public/index.html legacy runtime script order changed", {
      expectedLegacyScripts,
      actualLegacyScripts: legacyScriptPaths
    });
  }
  if (loaderIndex === -1) {
    return fail("growth_vite_loader_missing", "public/index.html is missing the Vite bootstrap loader");
  }
  if (loaderIndex !== scripts.length - 1) {
    return fail("growth_vite_loader_not_last", "Vite bootstrap loader must remain last while runtime is disabled", {
      scriptPaths
    });
  }
  if (fs.existsSync(path.join(repoRoot, "frontend", "src", "legacy", "registerGlobals.js"))) {
    return fail("growth_vite_register_globals_present", "temporary registerGlobals adapter is present");
  }

  return {
    ok: true,
    mode: "legacy_runtime_with_disabled_vite_loader",
    legacyScriptCount: expectedLegacyScripts.length,
    viteLoader: expectedViteLoader,
    evidence: [
      "legacy_growth_root_present",
      "legacy_runtime_scripts_present_in_order",
      "vite_bootstrap_loader_last",
      "no_module_script_before_cutover",
      "no_runtime_opt_in_before_owner_approval",
      "no_direct_hashed_vite_asset",
      "no_register_globals_adapter"
    ]
  };
}

if (require.main === module) {
  const result = checkGrowthViteRuntimeBoundary();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exit(1);
}

module.exports = {
  checkGrowthViteRuntimeBoundary,
  expectedLegacyScripts,
  expectedViteLoader,
  scriptTags
};
