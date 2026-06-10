#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const {
  REQUIRED_GROWTH_TABLES,
  createGrowthLearningSqliteStore
} = require("../src/stores/growth-learning-sqlite-store");

function usage() {
  return [
    "Usage:",
    "  node scripts/import-growth-learning-sqlite.js --source-db <backup.sqlite3> --target-db <plugin.sqlite3> --write [--workspace-id <id>] [--backup-dir <dir>] [--json]",
    "  node scripts/import-growth-learning-sqlite.js --source-db <backup.sqlite3> --target-db <plugin.sqlite3> --dry-run [--workspace-id <id>] [--json]",
    "  node scripts/import-growth-learning-sqlite.js --target-db <plugin.sqlite3> --rollback <backup.sqlite3> --write [--json]",
    "",
    "The source must be an explicit backup or development copy. Do not point this script at a live production database."
  ].join("\n");
}

function parseArgs(argv) {
  const out = { dryRun: false, write: false, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--source-db") out.sourceDb = argv[++index];
    else if (arg === "--target-db") out.targetDb = argv[++index];
    else if (arg === "--workspace-id") out.workspaceId = argv[++index];
    else if (arg === "--backup-dir") out.backupDir = argv[++index];
    else if (arg === "--rollback") out.rollback = argv[++index];
    else if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--write") out.write = true;
    else if (arg === "--json") out.json = true;
    else if (arg === "--help" || arg === "-h") out.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!out.write && !out.dryRun) out.dryRun = true;
  if (out.write && out.dryRun) throw new Error("Use either --write or --dry-run, not both");
  return out;
}

function nowStamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function readSourceIntegrity(sourceDb, workspaceId) {
  const store = createGrowthLearningSqliteStore({ dbPath: sourceDb });
  return store.integrity({ workspaceId });
}

function readTarget(targetDb, workspaceId) {
  if (!fs.existsSync(targetDb)) {
    return {
      exists: false,
      integrity: null,
      board: null
    };
  }
  const store = createGrowthLearningSqliteStore({ dbPath: targetDb });
  const integrity = store.integrity({ workspaceId });
  const board = store.board({ workspaceId });
  return {
    exists: true,
    integrity,
    board: board ? {
      source: board.source,
      card_count: board.summary?.total || 0,
      lane_count: Array.isArray(board.lanes) ? board.lanes.length : 0,
      data_ownership: board.data_ownership
    } : null
  };
}

function copyDatabase({ sourceDb, targetDb, backupDir }) {
  fs.mkdirSync(path.dirname(targetDb), { recursive: true });
  const backup = fs.existsSync(targetDb)
    ? path.join(backupDir || path.join(path.dirname(targetDb), "backups"), `growth-learning-${nowStamp()}.sqlite3`)
    : "";
  if (backup) {
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.copyFileSync(targetDb, backup);
  }
  const tempTarget = `${targetDb}.tmp-${process.pid}`;
  fs.copyFileSync(sourceDb, tempTarget);
  fs.renameSync(tempTarget, targetDb);
  return { backup };
}

function rollbackDatabase({ rollback, targetDb, backupDir }) {
  if (!fs.existsSync(rollback)) throw new Error(`Rollback source does not exist: ${rollback}`);
  fs.mkdirSync(path.dirname(targetDb), { recursive: true });
  const backup = fs.existsSync(targetDb)
    ? path.join(backupDir || path.join(path.dirname(targetDb), "backups"), `growth-learning-before-rollback-${nowStamp()}.sqlite3`)
    : "";
  if (backup) {
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.copyFileSync(targetDb, backup);
  }
  const tempTarget = `${targetDb}.rollback-${process.pid}`;
  fs.copyFileSync(rollback, tempTarget);
  fs.renameSync(tempTarget, targetDb);
  return { backup };
}

function assertPath(value, name) {
  const resolved = path.resolve(String(value || ""));
  if (!resolved || resolved === path.parse(resolved).root) throw new Error(`${name} is required`);
  return resolved;
}

function run(options) {
  const targetDb = assertPath(options.targetDb, "--target-db");
  const workspaceId = String(options.workspaceId || "").trim();

  if (options.rollback) {
    const rollback = assertPath(options.rollback, "--rollback");
    const before = readTarget(targetDb, workspaceId);
    const action = options.write ? rollbackDatabase({ rollback, targetDb, backupDir: options.backupDir }) : { backup: "" };
    const after = options.write ? readTarget(targetDb, workspaceId) : before;
    return {
      ok: !options.write || after.integrity?.ok === true,
      mode: options.write ? "rollback" : "rollback_dry_run",
      target_db: targetDb,
      rollback_source: rollback,
      backup: action.backup,
      before,
      after
    };
  }

  const sourceDb = assertPath(options.sourceDb, "--source-db");
  if (!fs.existsSync(sourceDb)) throw new Error(`Source DB does not exist: ${sourceDb}`);
  const source = readSourceIntegrity(sourceDb, workspaceId);
  const before = readTarget(targetDb, workspaceId);
  const action = source.ok && options.write
    ? copyDatabase({ sourceDb, targetDb, backupDir: options.backupDir })
    : { backup: "" };
  const after = options.write ? readTarget(targetDb, workspaceId) : before;
  return {
    ok: source.ok && (!options.write || after.integrity?.ok === true),
    mode: options.write ? "write" : "dry_run",
    required_tables: REQUIRED_GROWTH_TABLES,
    source_db: sourceDb,
    target_db: targetDb,
    workspace_id: workspaceId,
    backup: action.backup,
    source,
    before,
    after
  };
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
      process.exit(0);
    }
    const result = run(options);
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`ok=${result.ok === true}`);
      console.log(`mode=${result.mode}`);
      if (result.source?.quick_check) console.log(`sourceQuickCheck=${result.source.quick_check}`);
      if (result.after?.integrity?.quick_check) console.log(`targetQuickCheck=${result.after.integrity.quick_check}`);
      if (result.after?.board) console.log(`targetCards=${result.after.board.card_count}`);
      if (result.backup) console.log(`backup=${result.backup}`);
    }
    process.exit(result.ok ? 0 : 1);
  } catch (err) {
    if (process.argv.includes("--json")) console.error(JSON.stringify({ ok: false, error: err.message || String(err) }, null, 2));
    else {
      console.error(err.message || String(err));
      console.error(usage());
    }
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  run
};
