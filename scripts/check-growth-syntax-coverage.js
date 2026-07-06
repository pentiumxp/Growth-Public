"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const RUNTIME_DIRS = Object.freeze(["scripts", "src", "public"]);
const GENERATED_RUNTIME_PREFIXES = Object.freeze([
  "public/assets/growth/"
]);

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function walkJsFiles(relDir) {
  const absDir = path.join(ROOT, relDir);
  if (!fs.existsSync(absDir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const relPath = path.join(relDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkJsFiles(relPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(normalizePath(relPath));
    }
  }
  return files;
}

function checkedFilesFromPackageScript(checkScript) {
  const files = [];
  for (const match of checkScript.matchAll(/node --check ([^&]+?\.js)/g)) {
    files.push(match[1].trim());
  }
  return files;
}

function checkGrowthSyntaxCoverage() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const checkScript = packageJson.scripts && packageJson.scripts.check;
  if (typeof checkScript !== "string") {
    return {
      ok: false,
      runtimeCount: 0,
      checkedCount: 0,
      missing: [],
      stale: [],
      duplicate: [],
      error: "package_check_script_missing"
    };
  }

  const runtimeFiles = RUNTIME_DIRS
    .flatMap(walkJsFiles)
    .filter((fileName) => !GENERATED_RUNTIME_PREFIXES.some((prefix) => fileName.startsWith(prefix)))
    .sort();
  const checkedFiles = checkedFilesFromPackageScript(checkScript);
  const checkedSet = new Set(checkedFiles);
  const seen = new Set();
  const duplicate = [];
  for (const fileName of checkedFiles) {
    if (seen.has(fileName)) duplicate.push(fileName);
    seen.add(fileName);
  }
  const missing = runtimeFiles.filter((fileName) => !checkedSet.has(fileName));
  const stale = checkedFiles.filter((fileName) => !fs.existsSync(path.join(ROOT, fileName)));

  return {
    ok: missing.length === 0 && stale.length === 0 && duplicate.length === 0,
    runtimeCount: runtimeFiles.length,
    checkedCount: checkedSet.size,
    missing,
    stale,
    duplicate
  };
}

if (require.main === module) {
  const result = checkGrowthSyntaxCoverage();
  if (!result.ok) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  GENERATED_RUNTIME_PREFIXES,
  RUNTIME_DIRS,
  checkGrowthSyntaxCoverage
};
