const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.join(__dirname, "..");
const assetRoot = path.join(repoRoot, "public", "assets", "growth");
const manifestPath = path.join(assetRoot, ".vite", "manifest.json");
const privatePathPattern = /\/Users\/(?:xuxin|hermes-dev|hermes-host)\b|[A-Za-z]:\\/;
const secretPattern = /(access[_-]?key|launch[_-]?token|bearer|password|private[_-]?key|cookie)/i;
const unsafeAssetReferencePattern = /^(?:[a-z]+:|\/|\\)|\.\./i;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fail(code, message, extra = {}) {
  return {
    ok: false,
    code,
    message,
    ...extra
  };
}

function checkGrowthViteAssets() {
  if (!fs.existsSync(manifestPath)) {
    return fail("growth_vite_manifest_missing", "Growth Vite manifest is missing", {
      manifestPath
    });
  }

  const manifestText = fs.readFileSync(manifestPath, "utf8");
  if (privatePathPattern.test(manifestText) || secretPattern.test(manifestText)) {
    return fail("growth_vite_manifest_privacy_risk", "Growth Vite manifest contains private-looking values");
  }

  const manifest = readJson(manifestPath);
  const entry = manifest["src/main.js"];
  if (!entry?.file) {
    return fail("growth_vite_entry_missing", "Growth Vite manifest is missing src/main.js entry", {
      entries: Object.keys(manifest)
    });
  }

  const entryPath = path.join(assetRoot, entry.file);
  if (!fs.existsSync(entryPath)) {
    return fail("growth_vite_entry_file_missing", "Growth Vite entry file is missing", {
      entryFile: entry.file
    });
  }

  const indexPath = path.join(repoRoot, "public", "index.html");
  const indexHtml = fs.readFileSync(indexPath, "utf8");
  if (/public\/assets\/growth\/growth\.[a-zA-Z0-9_-]+\.js/.test(indexHtml)) {
    return fail("growth_vite_hardcoded_asset_path", "public/index.html hardcodes a Vite hashed asset path");
  }
  if (!indexHtml.includes("/growth-vite-bootstrap-loader.js?v=20260706-vite-esm-phase1")) {
    return fail("growth_vite_loader_missing", "public/index.html does not load the Growth Vite bootstrap loader");
  }

  const assetRefs = [
    entry.file,
    ...Array.isArray(entry.css) ? entry.css : [],
    ...Array.isArray(entry.imports) ? entry.imports : []
  ];
  const unsafeAssetRefs = assetRefs.filter((value) => unsafeAssetReferencePattern.test(String(value || "")));
  if (unsafeAssetRefs.length) {
    return fail("growth_vite_manifest_unsafe_asset_reference", "Growth Vite manifest contains unsafe asset references", {
      unsafeAssetRefs
    });
  }

  return {
    ok: true,
    manifest: path.relative(repoRoot, manifestPath),
    entryFile: entry.file,
    entryBytes: fs.statSync(entryPath).size,
    css: Array.isArray(entry.css) ? entry.css : [],
    imports: Array.isArray(entry.imports) ? entry.imports : [],
    loader: "public/growth-vite-bootstrap-loader.js"
  };
}

if (require.main === module) {
  const result = checkGrowthViteAssets();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exit(1);
}

module.exports = {
  checkGrowthViteAssets
};
