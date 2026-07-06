const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "..");
const frontendRoot = path.join(repoRoot, "frontend");
const sourceRoot = path.join(frontendRoot, "src");

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function walkJsFiles(absDir) {
  if (!fs.existsSync(absDir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const absPath = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkJsFiles(absPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(absPath);
    }
  }
  return files;
}

function checkFrontendEsmSyntax() {
  const packagePath = path.join(frontendRoot, "package.json");
  if (!fs.existsSync(packagePath)) {
    return {
      ok: false,
      error: "frontend_package_json_missing"
    };
  }
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  if (packageJson.type !== "module") {
    return {
      ok: false,
      error: "frontend_package_type_module_missing"
    };
  }

  const files = walkJsFiles(sourceRoot).sort();
  const failures = [];
  for (const filePath of files) {
    const result = spawnSync(process.execPath, ["--check", filePath], {
      cwd: repoRoot,
      encoding: "utf8"
    });
    if (result.status !== 0) {
      failures.push({
        file: normalizePath(path.relative(repoRoot, filePath)),
        stderr: String(result.stderr || "").trim().slice(0, 500)
      });
    }
  }

  return {
    ok: failures.length === 0,
    checkedCount: files.length,
    files: files.map((filePath) => normalizePath(path.relative(repoRoot, filePath))),
    failures
  };
}

if (require.main === module) {
  const result = checkFrontendEsmSyntax();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exit(1);
}

module.exports = {
  checkFrontendEsmSyntax
};
