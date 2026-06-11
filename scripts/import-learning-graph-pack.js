#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { sqlite } = require("../src/stores/growth-learning-sqlite/core");
const { createLearningGraphRepository } = require("../src/stores/growth-learning-sqlite/graph-repository");
const {
  dryRunLearningGraphImport,
  loadLearningGraphPack
} = require("../src/services/learning-graph-import-service");

function usage() {
  return [
    "Usage:",
    "  node scripts/import-learning-graph-pack.js --source <graph-seed.json> [--expected-sha256 <hash>] [--dry-run] [--json]",
    "  node scripts/import-learning-graph-pack.js --source <graph-seed.json> --target-db <growth.sqlite3> --write [--expected-sha256 <hash>] [--backup-dir <dir>] [--json]",
    "  node scripts/import-learning-graph-pack.js --target-db <growth.sqlite3> --readback [--import-id <id>] [--json]",
    "",
    "Dry-run validation never writes Growth runtime data. Write mode imports bounded native graph records into learning_graph_* tables."
  ].join("\n");
}

function parseArgs(argv) {
  const options = { json: false, dryRun: false, write: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--source") options.sourcePath = argv[++index] || "";
    else if (arg === "--target-db") options.targetDb = argv[++index] || "";
    else if (arg === "--import-id") options.importId = argv[++index] || "";
    else if (arg === "--expected-sha256") options.expectedSha256 = argv[++index] || "";
    else if (arg === "--backup-dir") options.backupDir = argv[++index] || "";
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--write") options.write = true;
    else if (arg === "--readback") options.readback = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.write && !options.dryRun && !options.readback) options.dryRun = true;
  if (options.write && options.dryRun) throw new Error("Use either --write or --dry-run, not both");
  if (options.readback && (options.write || options.dryRun)) throw new Error("Use --readback without --write or --dry-run");
  return options;
}

function nowStamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function assertPath(value, name) {
  const resolved = path.resolve(String(value || ""));
  if (!resolved || resolved === path.parse(resolved).root) throw new Error(`${name} is required`);
  return resolved;
}

function backupDatabase(targetDb, backupDir) {
  if (!fs.existsSync(targetDb)) return "";
  const { DatabaseSync } = sqlite();
  const db = new DatabaseSync(targetDb);
  try {
    db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  } finally {
    db.close();
  }
  const backupRoot = backupDir || path.join(path.dirname(targetDb), "backups");
  fs.mkdirSync(backupRoot, { recursive: true });
  const backup = path.join(backupRoot, `growth-learning-before-graph-import-${nowStamp()}.sqlite3`);
  fs.copyFileSync(targetDb, backup);
  for (const suffix of ["-wal", "-shm"]) {
    const sidecar = `${targetDb}${suffix}`;
    if (fs.existsSync(sidecar)) fs.copyFileSync(sidecar, `${backup}${suffix}`);
  }
  return backup;
}

function createRepository(targetDb) {
  return createLearningGraphRepository({
    open(readOnly = true) {
      const { DatabaseSync } = sqlite();
      return new DatabaseSync(targetDb, { open: true, readOnly });
    }
  });
}

function writeImport(options) {
  const targetDb = assertPath(options.targetDb, "--target-db");
  fs.mkdirSync(path.dirname(targetDb), { recursive: true });
  const loaded = loadLearningGraphPack(options);
  if (!loaded.validation.ok) {
    return Object.assign({ mode: "write_rejected", target_db: targetDb, backup: "" }, loaded.validation);
  }
  const repository = createRepository(targetDb);
  const before = fs.existsSync(targetDb)
    ? repository.readback({ importId: loaded.pack.importId })
    : { ok: false, import_id: loaded.pack.importId, missing_tables: [], counts: {} };
  const backup = backupDatabase(targetDb, options.backupDir);
  const after = repository.importPack({
    pack: loaded.pack,
    validation: loaded.validation,
    sourceFile: loaded.sourceFile,
    sourceSha256: loaded.sourceSha256
  });
  return Object.assign({}, loaded.validation, {
    ok: after.ok,
    dry_run: false,
    mode: "write",
    target_db: targetDb,
    backup,
    before,
    after
  });
}

function readbackImport(options) {
  const targetDb = assertPath(options.targetDb, "--target-db");
  const repository = createRepository(targetDb);
  return Object.assign({
    mode: "readback",
    target_db: targetDb
  }, repository.readback({ importId: options.importId }));
}

function print(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (result.usage) {
    console.log(result.usage);
    return;
  }
  console.log(`${result.ok ? "ok" : "failed"} ${result.import_id} ${result.nodes} nodes ${result.edges} edges`);
  if (result.mode === "write") console.log(`targetDb=${result.target_db}`);
  if (result.backup) console.log(`backup=${result.backup}`);
  if (result.after?.import_counts) console.log(`imported=${JSON.stringify(result.after.import_counts)}`);
  if (result.errors?.length) console.log(`errors: ${result.errors.map((error) => error.code).join(", ")}`);
  if (result.warnings?.length) console.log(`warnings: ${result.warnings.map((warning) => warning.code).join(", ")}`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return print({ usage: usage() }, options.json);
  if (options.readback && !options.targetDb) throw new Error("target_db_required");
  if (!options.readback && !options.sourcePath) throw new Error("source_required");
  const result = options.readback
    ? readbackImport(options)
    : options.write
      ? writeImport(options)
      : dryRunLearningGraphImport(options);
  print(result, options.json);
  if (!result.ok) process.exitCode = 1;
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err?.message || String(err));
    process.exitCode = 1;
  }
}

module.exports = { parseArgs, readbackImport, writeImport };
